export const miniPlayerStyles = {
  container:
    'absolute bottom-20 left-4 right-4 rounded-2xl border border-app-border bg-app-elevated px-4 py-3',
  mainRow: 'flex-row items-center',
  controlsRow: 'flex-row items-center gap-2',
  metadata: 'mr-4 flex-1',
  playbackButtons: 'flex-row items-center gap-1',
  status: 'text-xs font-semibold uppercase tracking-wider text-app-primary',
  title: 'mt-1 text-base font-semibold text-app-text',
  subtitle: 'mt-0.5 text-sm text-app-muted',
  button:
    'min-w-20 items-center rounded-full bg-app-primary px-4 py-2 active:opacity-80',
  buttonText: 'text-sm font-bold text-slate-950',
  secondaryButton:
    'h-10 w-9 items-center justify-center rounded-full border border-app-border bg-app-surface active:opacity-80',
  secondaryButtonText: 'text-2xl font-semibold leading-7 text-app-text',
} as const;
