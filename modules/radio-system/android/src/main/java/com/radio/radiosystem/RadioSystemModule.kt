package com.radio.radiosystem

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import kotlin.math.min

class RadioSystemModule(
  private val reactContext: ReactApplicationContext,
) : NativeRadioSystemSpec(reactContext), LifecycleEventListener {

  private var lastPowerManagementSignature: String? = null
  private val retryLock = Any()
  private val retryExecutor = Executors.newSingleThreadScheduledExecutor { runnable ->
    Thread(runnable, "RadioStreamRetry").apply { isDaemon = true }
  }
  private val connectivityManager =
    reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
  private var isNetworkCallbackRegistered = false
  private var activeStationId: String? = null
  private var isRetryEnabled = false
  private var consecutiveRetryCount = 0
  private var retryCount = 0
  private var recoveryCount = 0
  private var bufferingCount = 0
  private var totalBufferingMs = 0L
  private var lastBufferingMs = 0L
  private var networkSwitchCount = 0
  private var bufferingStartedAt: Long? = null
  private var isWaitingForNetwork = false
  private var networkType = readNetworkType()
  private var retryFuture: ScheduledFuture<*>? = null
  private var bufferingTimeoutFuture: ScheduledFuture<*>? = null

  private val networkCallback = object : ConnectivityManager.NetworkCallback() {
    override fun onAvailable(network: Network) = updateNetworkState()

    override fun onLost(network: Network) = updateNetworkState()

    override fun onCapabilitiesChanged(
      network: Network,
      networkCapabilities: NetworkCapabilities,
    ) = updateNetworkState()
  }

  override fun initialize() {
    super.initialize()
    reactContext.addLifecycleEventListener(this)
    lastPowerManagementSignature = getStatusSignature()
    registerNetworkCallback()
  }

  override fun invalidate() {
    reactContext.removeLifecycleEventListener(this)
    synchronized(retryLock) {
      cancelScheduledWorkLocked()
      activeStationId = null
      isRetryEnabled = false
    }
    if (isNetworkCallbackRegistered) {
      try {
        connectivityManager.unregisterNetworkCallback(networkCallback)
      } catch (_: RuntimeException) {
        // The callback may already have been removed during process teardown.
      }
      isNetworkCallbackRegistered = false
    }
    retryExecutor.shutdownNow()
    super.invalidate()
  }

  override fun getPowerManagementStatus(): WritableMap = createStatusMap()

  override fun requestBatteryOptimizationExemption(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return false
    }

    if (isIgnoringBatteryOptimizations()) {
      return true
    }

    val intent = Intent(
      Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      Uri.parse("package:${reactContext.packageName}"),
    )

    return launchSettingsIntent(intent)
  }

  override fun openBatteryOptimizationSettings(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return openApplicationSettings()
    }

    return launchSettingsIntent(
      Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
    ) || openApplicationSettings()
  }

  override fun openApplicationSettings(): Boolean = launchSettingsIntent(
    Intent(
      Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
      Uri.parse("package:${reactContext.packageName}"),
    ),
  )

  override fun startRadioRetrySession(stationId: String) {
    synchronized(retryLock) {
      cancelScheduledWorkLocked()
      activeStationId = stationId
      isRetryEnabled = true
      consecutiveRetryCount = 0
      retryCount = 0
      recoveryCount = 0
      bufferingCount = 0
      totalBufferingMs = 0L
      lastBufferingMs = 0L
      networkSwitchCount = 0
      bufferingStartedAt = null
      isWaitingForNetwork = false
      networkType = readNetworkType()
    }
  }

  override fun setRadioRetryEnabled(stationId: String, enabled: Boolean) {
    synchronized(retryLock) {
      if (activeStationId != stationId) {
        return
      }

      isRetryEnabled = enabled
      if (!enabled) {
        finishBufferingLocked()
        cancelScheduledWorkLocked()
        isWaitingForNetwork = false
      }
    }
  }

  override fun stopRadioRetrySession() {
    synchronized(retryLock) {
      finishBufferingLocked()
      cancelScheduledWorkLocked()
      activeStationId = null
      isRetryEnabled = false
      isWaitingForNetwork = false
    }
  }

  override fun reportRadioPlaybackError(stationId: String, reason: String) {
    scheduleRetry(stationId, reason)
  }

  override fun reportRadioPlaybackState(stationId: String, state: String) {
    when (state) {
      "buffering" -> startBufferingTimeout(stationId)
      "ready", "playing" -> markPlaybackRecovered(stationId)
    }
  }

  override fun getRadioRetryStats(): WritableMap {
    synchronized(retryLock) {
      val activeBufferingMs = bufferingStartedAt?.let {
        elapsedRealtime() - it
      } ?: 0L

      return Arguments.createMap().apply {
        if (activeStationId == null) {
          putNull("stationId")
        } else {
          putString("stationId", activeStationId)
        }
        putInt("retryCount", retryCount)
        putInt("consecutiveRetryCount", consecutiveRetryCount)
        putInt("recoveryCount", recoveryCount)
        putInt("bufferingCount", bufferingCount)
        putDouble("totalBufferingMs", (totalBufferingMs + activeBufferingMs).toDouble())
        putDouble("lastBufferingMs", lastBufferingMs.toDouble())
        putInt("networkSwitchCount", networkSwitchCount)
        putString("networkType", networkType)
        putBoolean("isWaitingForNetwork", isWaitingForNetwork)
      }
    }
  }

  override fun onHostResume() {
    val signature = getStatusSignature()

    if (signature != lastPowerManagementSignature) {
      lastPowerManagementSignature = signature
      if (canEmitEvents()) {
        emitOnPowerManagementChanged(createStatusMap())
      }
    }
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() = Unit

  private fun launchSettingsIntent(intent: Intent): Boolean {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    if (intent.resolveActivity(reactContext.packageManager) == null) {
      return false
    }

    reactContext.runOnUiQueueThread {
      try {
        reactContext.startActivity(intent)
      } catch (_: Exception) {
        // Settings availability was checked before dispatching to the UI thread.
      }
    }

    return true
  }

  private fun registerNetworkCallback() {
    try {
      connectivityManager.registerDefaultNetworkCallback(networkCallback)
      isNetworkCallbackRegistered = true
    } catch (_: RuntimeException) {
      isNetworkCallbackRegistered = false
    }
  }

  private fun updateNetworkState() {
    val nextNetworkType = readNetworkType()
    var previousNetworkType: String? = null
    var stationWaitingForNetwork: String? = null

    synchronized(retryLock) {
      if (nextNetworkType == networkType) {
        return
      }

      previousNetworkType = networkType
      if (networkType != "none" && nextNetworkType != "none") {
        networkSwitchCount += 1
      }
      networkType = nextNetworkType

      if (
        nextNetworkType != "none" &&
        isWaitingForNetwork &&
        isRetryEnabled
      ) {
        isWaitingForNetwork = false
        stationWaitingForNetwork = activeStationId
      }
    }

    if (canEmitEvents()) {
      emitOnRadioNetworkChanged(Arguments.createMap().apply {
        putString("previousType", previousNetworkType)
        putString("networkType", nextNetworkType)
        putDouble("timestamp", System.currentTimeMillis().toDouble())
      })
    }

    stationWaitingForNetwork?.let { stationId ->
      scheduleRetry(stationId, "network-restored", NETWORK_RESTORE_DELAY_MS)
    }
  }

  private fun readNetworkType(): String {
    val activeNetwork = connectivityManager.activeNetwork ?: return "none"
    val capabilities =
      connectivityManager.getNetworkCapabilities(activeNetwork) ?: return "none"

    if (!capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
      return "none"
    }

    return when {
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "vpn"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
      else -> "other"
    }
  }

  private fun startBufferingTimeout(stationId: String) {
    synchronized(retryLock) {
      if (activeStationId != stationId || !isRetryEnabled) {
        return
      }

      if (bufferingStartedAt == null) {
        bufferingStartedAt = elapsedRealtime()
        bufferingCount += 1
      }

      bufferingTimeoutFuture?.cancel(false)
      bufferingTimeoutFuture = retryExecutor.schedule(
        { scheduleRetry(stationId, "buffering-timeout", 0L) },
        BUFFERING_TIMEOUT_MS,
        TimeUnit.MILLISECONDS,
      )
    }
  }

  private fun markPlaybackRecovered(stationId: String) {
    synchronized(retryLock) {
      if (activeStationId != stationId) {
        return
      }

      finishBufferingLocked()
      retryFuture?.cancel(false)
      retryFuture = null
      isWaitingForNetwork = false

      if (consecutiveRetryCount > 0) {
        recoveryCount += 1
        consecutiveRetryCount = 0
      }
    }
  }

  private fun scheduleRetry(
    stationId: String,
    reason: String,
    explicitDelayMs: Long? = null,
  ) {
    var exhaustedAttempts: Int? = null
    synchronized(retryLock) {
      if (activeStationId != stationId || !isRetryEnabled) {
        return
      }

      if (retryFuture?.isDone == false || isWaitingForNetwork) {
        return
      }

      finishBufferingLocked()
      networkType = readNetworkType()
      if (networkType == "none") {
        retryFuture?.cancel(false)
        retryFuture = null
        isWaitingForNetwork = true
        return
      }

      if (consecutiveRetryCount >= MAX_RETRY_ATTEMPTS) {
        cancelScheduledWorkLocked()
        exhaustedAttempts = consecutiveRetryCount
      } else {
        retryFuture?.cancel(false)
        consecutiveRetryCount += 1
        retryCount += 1
        val delayMs = explicitDelayMs ?: calculateRetryDelay(consecutiveRetryCount)
        val request = RetryRequest(
          stationId = stationId,
          attempt = consecutiveRetryCount,
          delayMs = delayMs,
          reason = reason,
          networkType = networkType,
        )
        retryFuture = retryExecutor.schedule(
          { dispatchRetryRequest(request) },
          delayMs,
          TimeUnit.MILLISECONDS,
        )
      }
    }

    exhaustedAttempts?.let { attempts ->
      if (canEmitEvents()) {
        emitOnRadioRetryExhausted(Arguments.createMap().apply {
          putString("stationId", stationId)
          putInt("attempts", attempts)
          putString("reason", reason)
          putDouble("timestamp", System.currentTimeMillis().toDouble())
        })
      }
    }

  }

  private fun dispatchRetryRequest(request: RetryRequest) {
    synchronized(retryLock) {
      if (
        activeStationId != request.stationId ||
        !isRetryEnabled ||
        consecutiveRetryCount != request.attempt
      ) {
        return
      }
      retryFuture = null
    }

    if (canEmitEvents()) {
      emitOnRadioRetryRequested(Arguments.createMap().apply {
        putString("stationId", request.stationId)
        putInt("attempt", request.attempt)
        putInt("maxAttempts", MAX_RETRY_ATTEMPTS)
        putDouble("delayMs", request.delayMs.toDouble())
        putString("reason", request.reason)
        putString("networkType", request.networkType)
        putDouble("timestamp", System.currentTimeMillis().toDouble())
      })
    }
  }

  private fun canEmitEvents(): Boolean =
    mEventEmitterCallback != null && reactContext.hasActiveReactInstance()

  private fun calculateRetryDelay(attempt: Int): Long {
    val exponent = min(attempt - 1, MAX_RETRY_EXPONENT)
    return min(INITIAL_RETRY_DELAY_MS shl exponent, MAX_RETRY_DELAY_MS)
  }

  private fun finishBufferingLocked() {
    bufferingTimeoutFuture?.cancel(false)
    bufferingTimeoutFuture = null
    bufferingStartedAt?.let { startedAt ->
      lastBufferingMs = elapsedRealtime() - startedAt
      totalBufferingMs += lastBufferingMs
    }
    bufferingStartedAt = null
  }

  private fun cancelScheduledWorkLocked() {
    retryFuture?.cancel(false)
    retryFuture = null
    bufferingTimeoutFuture?.cancel(false)
    bufferingTimeoutFuture = null
  }

  private fun elapsedRealtime() = android.os.SystemClock.elapsedRealtime()

  private data class RetryRequest(
    val stationId: String,
    val attempt: Int,
    val delayMs: Long,
    val reason: String,
    val networkType: String,
  )

  private fun createStatusMap(): WritableMap = Arguments.createMap().apply {
    putBoolean("isSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
    putBoolean(
      "isIgnoringBatteryOptimizations",
      isIgnoringBatteryOptimizations(),
    )
    putBoolean(
      "canRequestBatteryOptimizationExemption",
      canRequestBatteryOptimizationExemption(),
    )
    putBoolean(
      "hasAggressivePowerManagement",
      hasAggressivePowerManagement(),
    )
    putString("manufacturer", Build.MANUFACTURER.orEmpty())
    putString("model", Build.MODEL.orEmpty())
    putInt("sdkVersion", Build.VERSION.SDK_INT)
  }

  private fun isIgnoringBatteryOptimizations(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return true
    }

    val powerManager =
      reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager

    return powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)
  }

  private fun canRequestBatteryOptimizationExemption(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return false
    }

    return reactContext.packageManager.checkPermission(
      Manifest.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      reactContext.packageName,
    ) == PackageManager.PERMISSION_GRANTED
  }

  private fun hasAggressivePowerManagement(): Boolean {
    val manufacturer = Build.MANUFACTURER.orEmpty().lowercase(Locale.US)

    return AGGRESSIVE_POWER_MANAGEMENT_MANUFACTURERS.any { vendor ->
      manufacturer.contains(vendor)
    }
  }

  private fun getStatusSignature(): String = listOf(
    isIgnoringBatteryOptimizations(),
    canRequestBatteryOptimizationExemption(),
    hasAggressivePowerManagement(),
  ).joinToString(separator = ":")

  companion object {
    const val NAME = NativeRadioSystemSpec.NAME

    private const val INITIAL_RETRY_DELAY_MS = 1_000L
    private const val MAX_RETRY_DELAY_MS = 30_000L
    private const val NETWORK_RESTORE_DELAY_MS = 500L
    private const val BUFFERING_TIMEOUT_MS = 12_000L
    private const val MAX_RETRY_ATTEMPTS = 5
    private const val MAX_RETRY_EXPONENT = 20

    private val AGGRESSIVE_POWER_MANAGEMENT_MANUFACTURERS = setOf(
      "asus",
      "honor",
      "huawei",
      "meizu",
      "oneplus",
      "oppo",
      "poco",
      "realme",
      "redmi",
      "samsung",
      "vivo",
      "xiaomi",
    )
  }
}
