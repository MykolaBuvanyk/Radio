import {
  addPowerManagementChangeListener,
  getPowerManagementStatus as getNativePowerManagementStatus,
  openApplicationSettings as openNativeApplicationSettings,
  openBatteryOptimizationSettings as openNativeBatteryOptimizationSettings,
  requestBatteryOptimizationExemption as requestNativeBatteryOptimizationExemption,
  type PowerManagementStatus as NativePowerManagementStatus,
} from '@radio/radio-system';

import type {
  PowerManagementStatus,
  PowerManagementSubscription,
} from '../domain/powerManagement';

function mapPowerManagementStatus(
  status: NativePowerManagementStatus,
): PowerManagementStatus {
  return {
    canRequestExemption: status.canRequestBatteryOptimizationExemption,
    hasAggressivePowerManagement: status.hasAggressivePowerManagement,
    isIgnoringBatteryOptimizations:
      status.isIgnoringBatteryOptimizations,
    isSupported: status.isSupported,
    manufacturer: status.manufacturer,
    model: status.model,
    sdkVersion: status.sdkVersion,
  };
}

export function getPowerManagementStatus(): PowerManagementStatus {
  return mapPowerManagementStatus(getNativePowerManagementStatus());
}

export function requestBatteryOptimizationExemption(): boolean {
  return requestNativeBatteryOptimizationExemption();
}

export function openBatteryOptimizationSettings(): boolean {
  return openNativeBatteryOptimizationSettings();
}

export function openApplicationSettings(): boolean {
  return openNativeApplicationSettings();
}

export function subscribeToPowerManagementChanges(
  listener: (status: PowerManagementStatus) => void,
): PowerManagementSubscription {
  return addPowerManagementChangeListener(status => {
    listener(mapPowerManagementStatus(status));
  });
}
