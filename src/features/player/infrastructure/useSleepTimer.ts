import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';

import type {SleepTimerDurationMinutes} from '../domain/sleepTimer';
import {
  cancelSleepTimer,
  getSleepTimerSnapshot,
  startSleepTimer,
} from '../services/sleepTimerService';
import {addSleepTimerTriggeredListener} from './trackPlayerAdapter';

export function useSleepTimer() {
  const [snapshot, setSnapshot] = useState(getSleepTimerSnapshot);
  const isActive = snapshot.remainingSeconds !== null;
  const syncSnapshot = useCallback(() => {
    setSnapshot(getSleepTimerSnapshot());
  }, []);

  useEffect(() => {
    const sleepTimerSubscription = addSleepTimerTriggeredListener(syncSnapshot);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        syncSnapshot();
      }
    });

    return () => {
      sleepTimerSubscription.remove();
      appStateSubscription.remove();
    };
  }, [syncSnapshot]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const timerId = setInterval(syncSnapshot, 1_000);

    return () => clearInterval(timerId);
  }, [isActive, syncSnapshot]);

  const start = useCallback(
    (minutes: SleepTimerDurationMinutes) => {
      startSleepTimer(minutes);
      syncSnapshot();
    },
    [syncSnapshot],
  );

  const cancel = useCallback(() => {
    cancelSleepTimer();
    syncSnapshot();
  }, [syncSnapshot]);

  return {
    cancel,
    remainingSeconds: snapshot.remainingSeconds,
    start,
  };
}
