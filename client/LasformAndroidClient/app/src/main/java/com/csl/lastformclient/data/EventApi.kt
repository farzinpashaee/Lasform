package com.csl.lastformclient.data

import android.location.Location
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

sealed class EventPostResult {
    data object Success : EventPostResult()
    data class Failure(val message: String) : EventPostResult()
}

/**
 * Builds and posts device location events to the LASTFORM server.
 * POST {server}/api/v1/events always takes a JSON array, whether it holds a single event or a
 * batch of previously queued ones being retried together after connectivity returns.
 */
object EventApi {
    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 10_000
    private const val EVENT_TYPE = "LOCATION_RECEIVED"
    private const val EVENT_SOURCE = "DEVICE"

    /** Builds a single event object; userId/location/battery fields are included only when available. */
    fun buildEventPayload(
        deviceId: String,
        userId: String?,
        location: Location?,
        batteryLevel: Int?
    ): JSONObject =
        JSONObject().apply {
            put("type", EVENT_TYPE)
            put("source", EVENT_SOURCE)
            put("deviceId", deviceId)
            if (!userId.isNullOrBlank()) put("userId", userId)

            if (location != null) {
                if (location.hasSpeed()) put("speed", location.speed.toDouble())
                if (location.hasBearing()) put("heading", location.bearing.toDouble())
                if (location.hasAccuracy()) put("accuracy", location.accuracy.toDouble())
                if (location.hasAltitude()) put("altitude", location.altitude)

                put(
                    "point",
                    JSONObject().apply {
                        put("type", "Point")
                        put(
                            "coordinates",
                            JSONArray().apply {
                                put(location.longitude)
                                put(location.latitude)
                            }
                        )
                    }
                )
            }

            if (batteryLevel != null) {
                put("payload", JSONObject().apply { put("batteryLevel", batteryLevel) })
            }

            put("occurredAt", currentTimestampUtc())
        }

    /** POSTs a JSON array of events. No-op success if [events] is empty. */
    suspend fun postEvents(serverUrl: String, events: List<JSONObject>): EventPostResult =
        withContext(Dispatchers.IO) {
            if (events.isEmpty()) return@withContext EventPostResult.Success

            var connection: HttpURLConnection? = null
            try {
                val base = serverUrl.trim().trimEnd('/')
                val url = URL("$base/api/v1/events")

                connection = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = CONNECT_TIMEOUT_MS
                    readTimeout = READ_TIMEOUT_MS
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "application/json")
                }

                val body = JSONArray().apply { events.forEach { put(it) } }.toString()
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

                val responseCode = connection.responseCode
                if (responseCode in 200..299) {
                    EventPostResult.Success
                } else {
                    EventPostResult.Failure("Server responded with $responseCode")
                }
            } catch (e: Exception) {
                EventPostResult.Failure(e.message ?: "Unable to reach server")
            } finally {
                connection?.disconnect()
            }
        }

    private fun currentTimestampUtc(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        return formatter.format(Date())
    }
}
