import RadioSystem, {
  type PowerManagementStatus,
} from './NativeRadioSystem';

export type {PowerManagementStatus};

export function getPowerManagementStatus() {
  return RadioSystem.getPowerManagementStatus();
}

export function requestBatteryOptimizationExemption() {
  return RadioSystem.requestBatteryOptimizationExemption();
}

export function openBatteryOptimizationSettings() {
  return RadioSystem.openBatteryOptimizationSettings();
}

export function openApplicationSettings() {
  return RadioSystem.openApplicationSettings();
}

export function addPowerManagementChangeListener(
  listener: (status: PowerManagementStatus) => void,
) {
  return RadioSystem.onPowerManagementChanged(listener);
}
