import type {
  SleepTimerDurationMinutes,
  SleepTimerSnapshot,
} from '../domain/sleepTimer';
import {
  cancelNativeSleepTimer,
  getNativeSleepTimer,
  setNativeSleepTimer,
} from '../infrastructure/trackPlayerAdapter';

const FADE_OUT_SECONDS = 15;

export function startSleepTimer(minutes: SleepTimerDurationMinutes) {
  setNativeSleepTimer(minutes * 60, FADE_OUT_SECONDS);
}

export function cancelSleepTimer() {
  cancelNativeSleepTimer();
}

export function getSleepTimerSnapshot(): SleepTimerSnapshot {
  const timer = getNativeSleepTimer();

  return {
    remainingSeconds:
      timer?.type === 'time' ? Math.max(0, timer.remainingSeconds) : null,
  };
}
