export type PowerManagementStatus = {
  canRequestExemption: boolean;
  hasAggressivePowerManagement: boolean;
  isIgnoringBatteryOptimizations: boolean;
  isSupported: boolean;
  manufacturer: string;
  model: string;
  sdkVersion: number;
};

export type PowerManagementSubscription = {
  remove: () => void;
};
