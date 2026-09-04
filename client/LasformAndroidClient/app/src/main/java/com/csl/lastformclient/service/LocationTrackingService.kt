package com.csl.lastformclient.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.csl.lastformclient.MainActivity
import com.csl.lastformclient.R
import com.csl.lastformclient.data.DevicePreferences
import com.csl.lastformclient.data.EventApi
import com.csl.lastformclient.data.EventPostResult
import com.csl.lastformclient.data.EventQueueStore
import com.csl.lastformclient.data.LocationProvider
import com.csl.lastformclient.data.TrackingStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Runs the location-capture-and-post loop as a foreground service so it keeps firing on the
 * configured frequency with the screen off or the app backgrounded. A plain Activity/Compose
 * LaunchedEffect (the previous implementation) gets throttled or suspended by Android's
 * background execution limits (Doze, app standby) once MainActivity stops being the foreground
 * app — which was the root cause of location updates only resuming after the user reopened the
 * app instead of continuing on their configured frequency.
 *
 * Started/stopped by MainActivity's power toggle; devicePrefs.isOn is the source of truth the
 * loop itself checks, so the service also stops itself if that's ever flipped some other way.
 */
class LocationTrackingService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var loopJob: Job? = null

    private lateinit var devicePrefs: DevicePreferences
    private lateinit var locationProvider: LocationProvider
    private lateinit var eventQueueStore: EventQueueStore

    override fun onCreate() {
        super.onCreate()
        devicePrefs = DevicePreferences.getInstance(this)
        locationProvider = LocationProvider(this)
        eventQueueStore = EventQueueStore.getInstance(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // Idempotent: a redelivered/duplicate start command shouldn't spin up a second loop
        // alongside one that's already running.
        if (loopJob?.isActive != true) {
            loopJob = scope.launch { runLoop() }
        }
        return START_STICKY
    }

    private suspend fun runLoop() {
        while (devicePrefs.isOn) {
            val location = locationProvider.getCurrentLocation()
            if (location != null) {
                val event = EventApi.buildEventPayload(
                    deviceId = devicePrefs.deviceId,
                    userId = devicePrefs.userId,
                    location = location,
                    batteryLevel = readBatteryLevel()
                )
                eventQueueStore.enqueue(event)
            }

            // See EventQueueStore#pruneInvalid: drops any point-less event left over from before
            // the client-side fix that stopped capturing them, which would otherwise block every
            // flush of this device's queue forever.
            val pendingEvents = eventQueueStore.pruneInvalid { it.has("point") }
            if (pendingEvents.isNotEmpty()) {
                val result = EventApi.postEvents(devicePrefs.serverUrl, pendingEvents)
                TrackingStatus.lastEventTimestamp = System.currentTimeMillis()
                if (result is EventPostResult.Success) {
                    eventQueueStore.clear()
                    TrackingStatus.lastEventSuccess = true
                    TrackingStatus.pendingEventCount = 0
                } else {
                    TrackingStatus.lastEventSuccess = false
                    TrackingStatus.pendingEventCount = pendingEvents.size
                }
            }

            delay(devicePrefs.updateFrequencySeconds.coerceAtLeast(1) * 1_000L)
        }
        stopSelf()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun readBatteryLevel(): Int? {
        val batteryManager = getSystemService(BATTERY_SERVICE) as? BatteryManager
        return batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)?.takeIf { it in 0..100 }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.tracking_notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.tracking_notification_title))
            .setContentText(getString(R.string.tracking_notification_text))
            .setSmallIcon(R.drawable.ic_lastform_logo)
            .setOngoing(true)
            .setContentIntent(contentIntent)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "lasform_location_tracking"
        private const val NOTIFICATION_ID = 1
    }
}
