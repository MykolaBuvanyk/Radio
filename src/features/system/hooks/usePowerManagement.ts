import {useCallback, useEffect, useState} from 'react';

import type {PowerManagementStatus} from '../domain/powerManagement';
import {
  getPowerManagementStatus,
  openApplicationSettings,
  openBatteryOptimizationSettings,
  requestBatteryOptimizationExemption,
  subscribeToPowerManagementChanges,
} from '../infrastructure/powerManagementAdapter';

const SETTINGS_ERROR =
  'Android settings could not be opened on this device.';

type UsePowerManagementResult = {
  errorMessage: string | null;
  openSettings: () => void;
  requestExemption: () => void;
  status: PowerManagementStatus;
};

export function usePowerManagement(): UsePowerManagementResult {
  const [status, setStatus] = useState(getPowerManagementStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const subscription = subscribeToPowerManagementChanges(nextStatus => {
      setStatus(nextStatus);
      setErrorMessage(null);
    });

    return () => subscription.remove();
  }, []);

  const requestExemption = useCallback(() => {
    setErrorMessage(null);

    if (!requestBatteryOptimizationExemption()) {
      setErrorMessage(SETTINGS_ERROR);
    }
  }, []);

  const openSettings = useCallback(() => {
    setErrorMessage(null);

    if (
      !openBatteryOptimizationSettings() &&
      !openApplicationSettings()
    ) {
      setErrorMessage(SETTINGS_ERROR);
    }
  }, []);

  return {
    errorMessage,
    openSettings,
    requestExemption,
    status,
  };
}
