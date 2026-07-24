package com.csl.lastformclient.data

import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

sealed class DeviceValidationResult {
    data class Success(val responseJson: String) : DeviceValidationResult()
    data class Failure(val message: String) : DeviceValidationResult()
}

/**
 * Validates a device ID against the LASTFORM server:
 * GET {server}/api/v1/devices/{deviceId}
 */
object DeviceApi {
    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 10_000

    suspend fun validateDevice(serverUrl: String, deviceId: String): DeviceValidationResult =
        withContext(Dispatchers.IO) {
            var connection: HttpURLConnection? = null
            try {
                val base = serverUrl.trim().trimEnd('/')
                val encodedId = URLEncoder.encode(deviceId.trim(), "UTF-8")
                val url = URL("$base/api/v1/devices/$encodedId")

                connection = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = CONNECT_TIMEOUT_MS
                    readTimeout = READ_TIMEOUT_MS
                    setRequestProperty("Accept", "application/json")
                }

                val responseCode = connection.responseCode
                val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
                val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()

                if (responseCode in 200..299) {
                    DeviceValidationResult.Success(body)
                } else {
                    DeviceValidationResult.Failure("Server responded with $responseCode")
                }
            } catch (e: Exception) {
                DeviceValidationResult.Failure(e.message ?: "Unable to reach server")
            } finally {
                connection?.disconnect()
            }
        }
}
