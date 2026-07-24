package com.csl.lastformclient

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.csl.lastformclient.data.DeviceApi
import com.csl.lastformclient.data.DevicePreferences
import com.csl.lastformclient.data.DeviceValidationResult
import com.csl.lastformclient.ui.theme.AccentTeal
import com.csl.lastformclient.ui.theme.LastformClientTheme
import com.csl.lastformclient.ui.theme.ScreenBackground
import kotlinx.coroutines.launch

private const val MIN_FREQUENCY = 1
private const val MAX_FREQUENCY = 120

class ConfigurationActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val devicePrefs = DevicePreferences.getInstance(this)
        val isInitialSetup = intent.getBooleanExtra(EXTRA_INITIAL_SETUP, false)
        setContent {
            LastformClientTheme {
                ConfigurationScreen(
                    devicePrefs = devicePrefs,
                    isInitialSetup = isInitialSetup,
                    onSaved = {
                        Toast.makeText(this, "Configuration saved", Toast.LENGTH_SHORT).show()
                        if (isInitialSetup) {
                            startActivity(Intent(this, MainActivity::class.java))
                        }
                        finish()
                    },
                    onBack = { finish() }
                )
            }
        }
    }

    companion object {
        const val EXTRA_INITIAL_SETUP = "extra_initial_setup"
    }
}

@Composable
fun ConfigurationScreen(
    devicePrefs: DevicePreferences,
    isInitialSetup: Boolean = false,
    onSaved: () -> Unit = {},
    onBack: () -> Unit = {}
) {
    var deviceId by remember { mutableStateOf(devicePrefs.deviceId) }
    var userId by remember { mutableStateOf(devicePrefs.userId) }
    var serverUrl by remember { mutableStateOf(devicePrefs.serverUrl) }
    var frequency by remember { mutableIntStateOf(devicePrefs.updateFrequencyMinutes) }
    var isValidating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val isSaveEnabled = deviceId.isNotBlank() && serverUrl.isNotBlank() && !isValidating
    val coroutineScope = rememberCoroutineScope()

    Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                FieldLabel("Device ID")
                OutlinedTextField(
                    value = deviceId,
                    onValueChange = { deviceId = it },
                    singleLine = true,
                    placeholder = { Text("Enter device ID") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = AccentTeal,
                        focusedBorderColor = AccentTeal
                    )
                )

                Spacer(modifier = Modifier.height(20.dp))

                FieldLabel("User ID (optional)")
                OutlinedTextField(
                    value = userId,
                    onValueChange = { userId = it },
                    singleLine = true,
                    placeholder = { Text("Enter user ID") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(20.dp))

                FieldLabel("LASTFORM Server")
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    placeholder = { Text(DevicePreferences.DEFAULT_SERVER_URL_HINT) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(20.dp))

                FieldLabel("Update Frequency (Minutes)")
                FrequencyStepper(
                    value = frequency,
                    onDecrement = { frequency = (frequency - 1).coerceAtLeast(MIN_FREQUENCY) },
                    onIncrement = { frequency = (frequency + 1).coerceAtMost(MAX_FREQUENCY) }
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
            ) {
                if (errorMessage != null) {
                    Text(
                        text = errorMessage.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                Button(
                    onClick = {
                        errorMessage = null
                        isValidating = true
                        coroutineScope.launch {
                            when (val result = DeviceApi.validateDevice(serverUrl, deviceId)) {
                                is DeviceValidationResult.Success -> {
                                    devicePrefs.deviceId = deviceId
                                    devicePrefs.userId = userId
                                    devicePrefs.serverUrl = serverUrl
                                    devicePrefs.updateFrequencyMinutes = frequency
                                    devicePrefs.deviceApiResponse = result.responseJson
                                    devicePrefs.isSetupComplete = true
                                    isValidating = false
                                    onSaved()
                                }
                                is DeviceValidationResult.Failure -> {
                                    isValidating = false
                                    errorMessage = "Device validation failed: ${result.message}"
                                }
                            }
                        }
                    },
                    enabled = isSaveEnabled,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentTeal)
                ) {
                    if (isValidating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Save Configuration")
                    }
                }

                if (!isInitialSetup) {
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = onBack,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Back")
                    }
                }
            }
        }
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
    )
    Spacer(modifier = Modifier.height(6.dp))
}

@Composable
private fun FrequencyStepper(
    value: Int,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .border(1.dp, ScreenBackground, RoundedCornerShape(8.dp))
    ) {
        Text(
            text = value.toString(),
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 16.dp),
            fontSize = 16.sp
        )
        Row(
            modifier = Modifier.align(Alignment.CenterEnd),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onDecrement) {
                Icon(imageVector = Icons.Filled.Remove, contentDescription = "Decrease frequency")
            }
            IconButton(onClick = onIncrement) {
                Icon(imageVector = Icons.Filled.Add, contentDescription = "Increase frequency")
            }
        }
    }
}

@androidx.compose.ui.tooling.preview.Preview(showBackground = true)
@Composable
fun ConfigurationScreenPreview() {
    val context = LocalContext.current
    LastformClientTheme {
        ConfigurationScreen(devicePrefs = DevicePreferences.getInstance(context))
    }
}
