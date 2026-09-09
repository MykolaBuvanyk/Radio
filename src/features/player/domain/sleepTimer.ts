export const sleepTimerDurationOptions = [15, 30, 45, 60] as const;

export type SleepTimerDurationMinutes =
  (typeof sleepTimerDurationOptions)[number];

export type SleepTimerSnapshot = {
  remainingSeconds: number | null;
};
