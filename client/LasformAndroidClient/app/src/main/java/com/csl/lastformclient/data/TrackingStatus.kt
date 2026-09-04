package com.csl.lastformclient.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Cross-component live status for LocationTrackingService's capture loop, observed by
 * MainScreen's Compose UI. Backed by Compose's mutableStateOf so writes from the service's
 * coroutine — running independently of any Activity/Composition — still trigger recomposition
 * wherever these are read; Compose's snapshot system supports cross-thread writes to State.
 */
object TrackingStatus {
    var lastEventSuccess by mutableStateOf<Boolean?>(null)
    var lastEventTimestamp by mutableStateOf<Long?>(null)
    var pendingEventCount by mutableStateOf(0)
}
