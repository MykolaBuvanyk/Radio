export const playbackQueueCardStyles = {
  container:
    'rounded-3xl border border-app-border bg-app-surface p-5',
  activeContainer:
    'rounded-3xl border border-app-primary bg-app-surface p-5',
  topRow: 'flex-row items-start justify-between gap-4',
  metadata: 'flex-1',
  eyebrow: 'text-xs font-semibold uppercase tracking-wider text-app-primary',
  title: 'mt-2 text-base font-bold text-app-text',
  subtitle: 'mt-1 text-sm text-app-muted',
  dragHandle:
    'rounded-xl border border-app-border px-3 py-2 active:opacity-60',
  dragHandleActive: 'rounded-xl border border-app-primary px-3 py-2 opacity-60',
  dragHandleText: 'text-xs font-bold text-app-text',
  actions: 'mt-4 flex-row gap-3',
  playButton:
    'flex-1 items-center rounded-full bg-app-primary px-4 py-2.5 active:opacity-80 disabled:opacity-50',
  playButtonText: 'text-sm font-bold text-slate-950',
  removeButton:
    'items-center rounded-full border border-app-border px-4 py-2.5 active:opacity-80',
  removeButtonText: 'text-sm font-bold text-app-text',
} as const;
