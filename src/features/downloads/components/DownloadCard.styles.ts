import type {ViewStyle} from 'react-native';

export const downloadCardStyles = {
  container: 'rounded-3xl border border-app-border bg-app-surface p-5',
  status: 'text-xs font-semibold uppercase tracking-wider text-app-primary',
  title: 'mt-2 text-base font-bold text-app-text',
  podcast: 'mt-1 text-sm text-app-muted',
  progressTrack: 'mt-4 h-2 overflow-hidden rounded-full bg-app-elevated',
  progressFill: 'h-full rounded-full bg-app-primary',
  details: 'mt-2 text-xs text-app-muted',
  error: 'mt-3 text-sm leading-5 text-red-300',
  actions: 'mt-4 flex-row gap-3',
  primaryButton:
    'flex-1 items-center rounded-full bg-app-primary px-4 py-2.5 active:opacity-80 disabled:opacity-50',
  primaryButtonText: 'text-sm font-bold text-slate-950',
  removeButton:
    'items-center rounded-full border border-app-border px-4 py-2.5 active:opacity-80 disabled:opacity-50',
  removeButtonText: 'text-sm font-bold text-app-text',
} as const;

export function getDownloadProgressStyle(progress: number): ViewStyle {
  const width = `${Math.min(100, Math.max(0, progress))}%` as `${number}%`;

  return {width};
}
