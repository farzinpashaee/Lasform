package com.csl.lastformclient

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.csl.lastformclient.data.DevicePreferences
import com.csl.lastformclient.ui.theme.LastformClientTheme
import com.csl.lastformclient.ui.theme.StatusRed
import kotlinx.coroutines.delay

private const val SPLASH_DELAY_MS = 1400L

class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val devicePrefs = DevicePreferences.getInstance(this)
        setContent {
            LastformClientTheme {
                SplashScreen {
                    val nextActivity = if (devicePrefs.isSetupComplete) {
                        Intent(this, MainActivity::class.java)
                    } else {
                        Intent(this, ConfigurationActivity::class.java)
                            .putExtra(ConfigurationActivity.EXTRA_INITIAL_SETUP, true)
                    }
                    startActivity(nextActivity)
                    finish()
                }
            }
        }
    }
}

@Composable
fun SplashScreen(onFinished: () -> Unit = {}) {
    LaunchedEffect(Unit) {
        delay(SPLASH_DELAY_MS)
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(StatusRed),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(90.dp)
                .clip(CircleShape)
                .background(Color.White),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_lastform_logo),
                contentDescription = null,
                colorFilter = ColorFilter.tint(StatusRed),
                modifier = Modifier.size(120.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SplashScreenPreview() {
    LastformClientTheme {
        SplashScreen()
    }
}
