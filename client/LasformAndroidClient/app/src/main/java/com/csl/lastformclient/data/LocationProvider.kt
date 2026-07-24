package com.csl.lastformclient.data

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Looper
import androidx.core.content.ContextCompat
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Reads device location (speed/heading/accuracy/altitude/lat/lng) using the platform
 * LocationManager. Requires ACCESS_FINE_LOCATION or ACCESS_COARSE_LOCATION to be granted.
 */
class LocationProvider(private val context: Context) {

    fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /** Best-effort current location: a fresh fix if one arrives quickly, otherwise the last known one. */
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): Location? {
        if (!hasLocationPermission()) return null
        val locationManager =
            context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null

        val freshFix = withTimeoutOrNull(FRESH_FIX_TIMEOUT_MS) { requestSingleUpdate(locationManager) }
        return freshFix ?: bestLastKnownLocation(locationManager)
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestSingleUpdate(locationManager: LocationManager): Location? =
        suspendCancellableCoroutine { continuation ->
            val provider = when {
                locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> null
            }
            if (provider == null) {
                continuation.resume(null)
                return@suspendCancellableCoroutine
            }

            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    locationManager.removeUpdates(this)
                    if (continuation.isActive) continuation.resume(location)
                }
            }

            continuation.invokeOnCancellation { locationManager.removeUpdates(listener) }

            try {
                locationManager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
            } catch (e: SecurityException) {
                continuation.resume(null)
            }
        }

    @SuppressLint("MissingPermission")
    private fun bestLastKnownLocation(locationManager: LocationManager): Location? {
        var best: Location? = null
        for (provider in locationManager.allProviders) {
            val location = try {
                locationManager.getLastKnownLocation(provider)
            } catch (e: SecurityException) {
                null
            } ?: continue
            if (best == null || location.accuracy < best.accuracy) {
                best = location
            }
        }
        return best
    }

    companion object {
        private const val FRESH_FIX_TIMEOUT_MS = 8_000L
    }
}
