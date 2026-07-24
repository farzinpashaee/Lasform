package com.csl.lastformclient.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/**
 * Simple SharedPreferences-backed store for device state and configuration.
 * Values here persist across activities (Splash -> Main -> Configuration).
 */
class DevicePreferences private constructor(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** Empty until the user sets it during device configuration. */
    var deviceId: String
        get() = prefs.getString(KEY_DEVICE_ID, "") ?: ""
        set(value) = prefs.edit { putString(KEY_DEVICE_ID, value) }

    var deviceName: String
        get() = prefs.getString(KEY_DEVICE_NAME, DEFAULT_DEVICE_NAME) ?: DEFAULT_DEVICE_NAME
        set(value) = prefs.edit { putString(KEY_DEVICE_NAME, value) }

    var isOn: Boolean
        get() = prefs.getBoolean(KEY_IS_ON, false)
        set(value) = prefs.edit { putBoolean(KEY_IS_ON, value) }

    /** Epoch millis when the device was last powered on, or 0 if off. */
    var powerOnTimestamp: Long
        get() = prefs.getLong(KEY_POWER_ON_TS, 0L)
        set(value) = prefs.edit { putLong(KEY_POWER_ON_TS, value) }

    /** Empty until the user sets it during device configuration. */
    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, "") ?: ""
        set(value) = prefs.edit { putString(KEY_SERVER_URL, value) }

    /** Optional; only included in event payloads when non-blank. */
    var userId: String
        get() = prefs.getString(KEY_USER_ID, "") ?: ""
        set(value) = prefs.edit { putString(KEY_USER_ID, value) }

    var updateFrequencyMinutes: Int
        get() = prefs.getInt(KEY_UPDATE_FREQUENCY, DEFAULT_UPDATE_FREQUENCY)
        set(value) = prefs.edit { putInt(KEY_UPDATE_FREQUENCY, value) }

    /** True once the user has saved device configuration at least once. */
    var isSetupComplete: Boolean
        get() = prefs.getBoolean(KEY_SETUP_COMPLETE, false)
        set(value) = prefs.edit { putBoolean(KEY_SETUP_COMPLETE, value) }

    /** Raw JSON body returned by the device validation API on last successful save. */
    var deviceApiResponse: String
        get() = prefs.getString(KEY_DEVICE_API_RESPONSE, "") ?: ""
        set(value) = prefs.edit { putString(KEY_DEVICE_API_RESPONSE, value) }

    fun setPowerState(on: Boolean) {
        isOn = on
        powerOnTimestamp = if (on) System.currentTimeMillis() else 0L
    }

    companion object {
        private const val PREFS_NAME = "lastform_device_prefs"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_IS_ON = "is_on"
        private const val KEY_POWER_ON_TS = "power_on_ts"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_UPDATE_FREQUENCY = "update_frequency"
        private const val KEY_SETUP_COMPLETE = "setup_complete"
        private const val KEY_DEVICE_API_RESPONSE = "device_api_response"

        const val DEFAULT_DEVICE_NAME = "Device Name"
        const val DEFAULT_SERVER_URL_HINT = "http://localhost:8080"
        const val DEFAULT_UPDATE_FREQUENCY = 10

        @Volatile
        private var instance: DevicePreferences? = null

        fun getInstance(context: Context): DevicePreferences =
            instance ?: synchronized(this) {
                instance ?: DevicePreferences(context).also { instance = it }
            }
    }
}
