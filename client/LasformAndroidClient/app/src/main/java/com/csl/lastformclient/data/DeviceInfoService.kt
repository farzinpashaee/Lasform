package com.csl.lastformclient.data

import org.json.JSONObject

/**
 * Reads structured device fields out of the raw JSON that [DevicePreferences.deviceApiResponse]
 * captured from the device validation API (GET /api/v1/devices/{deviceId}).
 */
class DeviceInfoService(private val devicePreferences: DevicePreferences) {

    private fun parsedResponse(): JSONObject? {
        val json = devicePreferences.deviceApiResponse
        if (json.isBlank()) return null
        return try {
            JSONObject(json)
        } catch (e: org.json.JSONException) {
            null
        }
    }

    /** Returns a single field from the API response as a string, or null if absent/blank. */
    fun getField(key: String): String? {
        val value = parsedResponse()?.opt(key) ?: return null
        return value.toString().ifBlank { null }
    }

    fun getIntField(key: String): Int? = parsedResponse()?.let {
        if (it.has(key) && !it.isNull(key)) it.optInt(key) else null
    }

    fun getBooleanField(key: String): Boolean? = parsedResponse()?.let {
        if (it.has(key) && !it.isNull(key)) it.optBoolean(key) else null
    }

    /** Device display name from the API response ("name"/"deviceName"), falling back to the locally stored name. */
    fun getDeviceName(): String =
        getField("name") ?: getField("deviceName") ?: devicePreferences.deviceName

    /** Device identifier from the API response ("id"/"deviceId"), falling back to the locally stored ID. */
    fun getDeviceId(): String =
        getField("id") ?: getField("deviceId") ?: devicePreferences.deviceId

    /** Device status/sync state from the API response, if present. */
    fun getStatus(): String? = getField("status")
}
