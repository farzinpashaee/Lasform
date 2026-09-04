package com.csl.lastformclient

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.csl.lastformclient.data.DeviceInfoService
import com.csl.lastformclient.data.DevicePreferences
import com.csl.lastformclient.data.LocationProvider
import com.csl.lastformclient.data.TrackingStatus
import com.csl.lastformclient.service.LocationTrackingService
import com.csl.lastformclient.ui.theme.CardBackground
import com.csl.lastformclient.ui.theme.LastformClientTheme
import com.csl.lastformclient.ui.theme.MenuIconTint
import com.csl.lastformclient.ui.theme.ScreenBackground
import com.csl.lastformclient.ui.theme.StatusGreen
import com.csl.lastformclient.ui.theme.StatusIconDark
import com.csl.lastformclient.ui.theme.StatusRed
import com.csl.lastformclient.ui.theme.SyncedBadgeBg
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val devicePrefs = DevicePreferences.getInstance(this)
        val deviceInfoService = DeviceInfoService(devicePrefs)
        setContent {
            LastformClientTheme {
                MainScreen(
                    devicePrefs = devicePrefs,
                    deviceInfoService = deviceInfoService
                )
            }
        }
    }
}

@Composable
fun MainScreen(
    devicePrefs: DevicePreferences,
    deviceInfoService: DeviceInfoService
) {
    val context = LocalContext.current
    val locationProvider = remember { LocationProvider(context) }
    var isOn by remember { mutableStateOf(devicePrefs.isOn) }
    var uptimeSeconds by remember { mutableStateOf(0L) }
    var deviceName by remember { mutableStateOf(deviceInfoService.getDeviceName()) }
    var showPayloadDialog by remember { mutableStateOf(false) }
    var showAboutDialog by remember { mutableStateOf(false) }

    // Re-read config/name after returning from Device Configuration, since it may have changed.
    val configurationLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) {
        deviceName = deviceInfoService.getDeviceName()
        isOn = devicePrefs.isOn
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { /* Event posting proceeds either way; location fields are just omitted if denied. */ }

    // Only affects whether the ongoing tracking notification can show — LocationTrackingService
    // runs and posts events regardless of this being granted or denied.
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { }

    // The actual capture-and-post loop runs in LocationTrackingService (a foreground service), not
    // here — a plain Composable LaunchedEffect gets throttled/suspended by Android's background
    // execution limits as soon as this Activity stops being the foreground app (screen off,
    // backgrounded), which was why updates used to stall until the app was reopened. If the app
    // process was killed and relaunched while devicePrefs.isOn was still true from a prior
    // session, the service was killed along with it — restart it here so tracking actually resumes
    // instead of just showing a stale "on" toggle. Starting it when already running is a no-op
    // (LocationTrackingService#onStartCommand only launches a new loop if one isn't already active).
    LaunchedEffect(Unit) {
        if (devicePrefs.isOn) {
            ContextCompat.startForegroundService(context, Intent(context, LocationTrackingService::class.java))
        }
    }

    LaunchedEffect(isOn) {
        while (isOn) {
            val elapsedMs = System.currentTimeMillis() - devicePrefs.powerOnTimestamp
            uptimeSeconds = (elapsedMs / 1000).coerceAtLeast(0)
            delay(1000)
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = ScreenBackground
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp)
        ) {
            DeviceStatusCard(
                deviceName = deviceName,
                isOn = isOn,
                uptimeSeconds = uptimeSeconds,
                lastEventSuccess = TrackingStatus.lastEventSuccess,
                lastEventTimestamp = TrackingStatus.lastEventTimestamp,
                pendingEventCount = TrackingStatus.pendingEventCount,
                onToggle = {
                    val newState = !isOn
                    devicePrefs.setPowerState(newState)
                    isOn = newState
                    uptimeSeconds = 0L
                    val serviceIntent = Intent(context, LocationTrackingService::class.java)
                    if (newState) {
                        if (!locationProvider.hasLocationPermission()) {
                            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
                            PackageManager.PERMISSION_GRANTED
                        ) {
                            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                        ContextCompat.startForegroundService(context, serviceIntent)
                    } else {
                        context.stopService(serviceIntent)
                    }
                }
            )

            Spacer(modifier = Modifier.height(20.dp))

            DeviceMenuCard(
                onDeviceConfiguration = {
                    configurationLauncher.launch(Intent(context, ConfigurationActivity::class.java))
                },
                onPayloadSettings = { showPayloadDialog = true },
                onAboutDevice = { showAboutDialog = true }
            )
        }
    }

    if (showPayloadDialog) {
        InfoDialog(
            title = "Payload Settings",
            message = "Payload configuration is not implemented yet.",
            onDismiss = { showPayloadDialog = false }
        )
    }

    if (showAboutDialog) {
        InfoDialog(
            title = "About Device",
            message = "Device ID: ${devicePrefs.deviceId}\nApp version: 1.0",
            onDismiss = { showAboutDialog = false }
        )
    }
}

@Composable
private fun DeviceStatusCard(
    deviceName: String,
    isOn: Boolean,
    uptimeSeconds: Long,
    lastEventSuccess: Boolean?,
    lastEventTimestamp: Long?,
    pendingEventCount: Int,
    onToggle: () -> Unit
) {
    val statusColor = if (isOn) StatusGreen else StatusRed

    Column(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp)
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(
                    Brush.radialGradient(
                        colors = listOf(statusColor.copy(alpha = 0.85f), Color.White)
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (isOn) {
                    Text(
                        text = "Uptime:",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        text = formatUptime(uptimeSeconds),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    SyncedBadge()
                    Spacer(modifier = Modifier.height(10.dp))
                }

                Box(
                    modifier = Modifier
                        .size(76.dp)
                        .clip(CircleShape)
                        .background(StatusIconDark)
                        .clickable(onClick = onToggle),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.PowerSettingsNew,
                        contentDescription = if (isOn) "Turn device off" else "Turn device on",
                        tint = statusColor,
                        modifier = Modifier.size(38.dp)
                    )
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
                .background(Color.White)
                .padding(vertical = 18.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = deviceName,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Medium
                )

                if (isOn && lastEventTimestamp != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    val statusText = if (lastEventSuccess == true) {
                        "Last sync: Success • ${formatEventTimestamp(lastEventTimestamp)}"
                    } else {
                        "Last sync: Failed • ${formatEventTimestamp(lastEventTimestamp)} • $pendingEventCount pending"
                    }
                    Text(
                        text = statusText,
                        fontSize = 12.sp,
                        color = if (lastEventSuccess == true) StatusGreen else StatusRed
                    )
                }
            }
        }
    }
}

@Composable
private fun SyncedBadge() {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(SyncedBadgeBg)
            .padding(horizontal = 14.dp, vertical = 4.dp)
    ) {
        Text(text = "Synced", color = Color.White, fontSize = 12.sp)
    }
}

@Composable
private fun DeviceMenuCard(
    onDeviceConfiguration: () -> Unit,
    onPayloadSettings: () -> Unit,
    onAboutDevice: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            MenuRow(
                icon = Icons.Filled.Settings,
                label = "Device Configuration",
                onClick = onDeviceConfiguration
            )
            HorizontalDivider(color = ScreenBackground)
            MenuRow(
                icon = Icons.Filled.Code,
                label = "Payload Settings",
                onClick = onPayloadSettings
            )
            HorizontalDivider(color = ScreenBackground)
            MenuRow(
                icon = Icons.Filled.Info,
                label = "About Device",
                onClick = onAboutDevice
            )
        }
    }
}

@Composable
private fun MenuRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = MenuIconTint)
        Spacer(modifier = Modifier.width(14.dp))
        Text(text = label, fontSize = 15.sp)
    }
}

@Composable
private fun InfoDialog(title: String, message: String, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("OK") }
        },
        title = { Text(title) },
        text = { Text(message) }
    )
}

private fun formatUptime(totalSeconds: Long): String {
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return "%02d:%02d:%02d".format(hours, minutes, seconds)
}

private fun formatEventTimestamp(epochMillis: Long): String {
    val formatter = SimpleDateFormat("MMM d, h:mm:ss a", Locale.getDefault())
    return formatter.format(Date(epochMillis))
}

@Preview(showBackground = true)
@Composable
fun MainScreenPreview() {
    val context = LocalContext.current
    val devicePrefs = DevicePreferences.getInstance(context)
    LastformClientTheme {
        MainScreen(devicePrefs = devicePrefs, deviceInfoService = DeviceInfoService(devicePrefs))
    }
}
