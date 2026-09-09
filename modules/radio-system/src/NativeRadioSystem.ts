import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export type PowerManagementStatus = {
  isSupported: boolean;
  isIgnoringBatteryOptimizations: boolean;
  canRequestBatteryOptimizationExemption: boolean;
  hasAggressivePowerManagement: boolean;
  manufacturer: string;
  model: string;
  sdkVersion: number;
};

export type RadioNetworkType =
  | 'wifi'
  | 'cellular'
  | 'ethernet'
  | 'vpn'
  | 'other'
  | 'none';

export type RadioRetryRequest = {
  stationId: string;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  reason: string;
  networkType: RadioNetworkType;
  timestamp: number;
};

export type RadioRetryExhausted = {
  stationId: string;
  attempts: number;
  reason: string;
  timestamp: number;
};

export type RadioNetworkChange = {
  previousType: RadioNetworkType;
  networkType: RadioNetworkType;
  timestamp: number;
};

export type RadioRetryStats = {
  stationId: string | null;
  retryCount: number;
  consecutiveRetryCount: number;
  recoveryCount: number;
  bufferingCount: number;
  totalBufferingMs: number;
  lastBufferingMs: number;
  networkSwitchCount: number;
  networkType: RadioNetworkType;
  isWaitingForNetwork: boolean;
};

export interface Spec extends TurboModule {
  getPowerManagementStatus(): PowerManagementStatus;
  requestBatteryOptimizationExemption(): boolean;
  openBatteryOptimizationSettings(): boolean;
  openApplicationSettings(): boolean;
  startRadioRetrySession(stationId: string): void;
  setRadioRetryEnabled(stationId: string, enabled: boolean): void;
  stopRadioRetrySession(): void;
  reportRadioPlaybackError(stationId: string, reason: string): void;
  reportRadioPlaybackState(stationId: string, state: string): void;
  getRadioRetryStats(): RadioRetryStats;
  readonly onPowerManagementChanged: CodegenTypes.EventEmitter<PowerManagementStatus>;
  readonly onRadioRetryRequested: CodegenTypes.EventEmitter<RadioRetryRequest>;
  readonly onRadioRetryExhausted: CodegenTypes.EventEmitter<RadioRetryExhausted>;
  readonly onRadioNetworkChanged: CodegenTypes.EventEmitter<RadioNetworkChange>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RadioSystem');
