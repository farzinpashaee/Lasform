package com.csl.lastformclient.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * Durable on-device queue for events that couldn't be delivered yet (offline / server
 * unreachable). Backed by SharedPreferences so it survives process death, and is flushed as a
 * single list POST to /api/v1/events once the server becomes reachable again.
 */
class EventQueueStore private constructor(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    @Synchronized
    fun enqueue(event: JSONObject) {
        val events = readAll().toMutableList()
        events.add(event)
        while (events.size > MAX_QUEUED_EVENTS) {
            events.removeAt(0)
        }
        writeAll(events)
    }

    @Synchronized
    fun getAll(): List<JSONObject> = readAll()

    @Synchronized
    fun clear() {
        prefs.edit { remove(KEY_EVENTS) }
    }

    private fun readAll(): List<JSONObject> {
        val raw = prefs.getString(KEY_EVENTS, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            (0 until array.length()).map { array.getJSONObject(it) }
        } catch (e: JSONException) {
            emptyList()
        }
    }

    private fun writeAll(events: List<JSONObject>) {
        val array = JSONArray()
        events.forEach { array.put(it) }
        prefs.edit { putString(KEY_EVENTS, array.toString()) }
    }

    companion object {
        private const val PREFS_NAME = "lastform_event_queue"
        private const val KEY_EVENTS = "pending_events"
        private const val MAX_QUEUED_EVENTS = 500

        @Volatile
        private var instance: EventQueueStore? = null

        fun getInstance(context: Context): EventQueueStore =
            instance ?: synchronized(this) {
                instance ?: EventQueueStore(context).also { instance = it }
            }
    }
}
