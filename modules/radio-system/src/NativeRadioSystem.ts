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

export interface Spec extends TurboModule {
  getPowerManagementStatus(): PowerManagementStatus;
  requestBatteryOptimizationExemption(): boolean;
  openBatteryOptimizationSettings(): boolean;
  openApplicationSettings(): boolean;
  readonly onPowerManagementChanged: CodegenTypes.EventEmitter<PowerManagementStatus>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RadioSystem');
