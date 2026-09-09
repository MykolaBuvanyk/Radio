import RadioSystem, {
  type PowerManagementStatus,
  type RadioNetworkChange,
  type RadioRetryExhausted,
  type RadioRetryRequest,
  type RadioRetryStats,
} from './NativeRadioSystem';

export type {
  PowerManagementStatus,
  RadioNetworkChange,
  RadioRetryExhausted,
  RadioRetryRequest,
  RadioRetryStats,
};

const unavailableSubscription = {
  remove: () => undefined,
};

const unavailableRetryStats: RadioRetryStats = {
  stationId: null,
  retryCount: 0,
  consecutiveRetryCount: 0,
  recoveryCount: 0,
  bufferingCount: 0,
  totalBufferingMs: 0,
  lastBufferingMs: 0,
  networkSwitchCount: 0,
  networkType: 'none',
  isWaitingForNetwork: false,
};

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

export function startRadioRetrySession(stationId: string) {
  if (typeof RadioSystem.startRadioRetrySession === 'function') {
    RadioSystem.startRadioRetrySession(stationId);
  }
}

export function setRadioRetryEnabled(stationId: string, enabled: boolean) {
  if (typeof RadioSystem.setRadioRetryEnabled === 'function') {
    RadioSystem.setRadioRetryEnabled(stationId, enabled);
  }
}

export function stopRadioRetrySession() {
  if (typeof RadioSystem.stopRadioRetrySession === 'function') {
    RadioSystem.stopRadioRetrySession();
  }
}

export function reportRadioPlaybackError(stationId: string, reason: string) {
  if (typeof RadioSystem.reportRadioPlaybackError === 'function') {
    RadioSystem.reportRadioPlaybackError(stationId, reason);
  }
}

export function reportRadioPlaybackState(stationId: string, state: string) {
  if (typeof RadioSystem.reportRadioPlaybackState === 'function') {
    RadioSystem.reportRadioPlaybackState(stationId, state);
  }
}

export function getRadioRetryStats() {
  return typeof RadioSystem.getRadioRetryStats === 'function'
    ? RadioSystem.getRadioRetryStats()
    : unavailableRetryStats;
}

export function addRadioRetryRequestedListener(
  listener: (request: RadioRetryRequest) => void,
) {
  return typeof RadioSystem.onRadioRetryRequested === 'function'
    ? RadioSystem.onRadioRetryRequested(listener)
    : unavailableSubscription;
}

export function addRadioRetryExhaustedListener(
  listener: (event: RadioRetryExhausted) => void,
) {
  return typeof RadioSystem.onRadioRetryExhausted === 'function'
    ? RadioSystem.onRadioRetryExhausted(listener)
    : unavailableSubscription;
}

export function addRadioNetworkChangedListener(
  listener: (event: RadioNetworkChange) => void,
) {
  return typeof RadioSystem.onRadioNetworkChanged === 'function'
    ? RadioSystem.onRadioNetworkChanged(listener)
    : unavailableSubscription;
}
