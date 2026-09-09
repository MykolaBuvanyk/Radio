package com.radio.radiosystem

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import java.util.Locale

class RadioSystemModule(
  private val reactContext: ReactApplicationContext,
) : NativeRadioSystemSpec(reactContext), LifecycleEventListener {

  private var lastPowerManagementSignature: String? = null

  override fun initialize() {
    super.initialize()
    reactContext.addLifecycleEventListener(this)
    lastPowerManagementSignature = getStatusSignature()
  }

  override fun invalidate() {
    reactContext.removeLifecycleEventListener(this)
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

  override fun onHostResume() {
    val signature = getStatusSignature()

    if (signature != lastPowerManagementSignature) {
      lastPowerManagementSignature = signature
      emitOnPowerManagementChanged(createStatusMap())
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
