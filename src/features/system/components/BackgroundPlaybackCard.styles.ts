export const backgroundPlaybackCardStyles = {
  container:
    'rounded-3xl border border-app-border bg-app-surface p-5',
  eyebrow:
    'text-xs font-semibold uppercase tracking-widest text-app-primary',
  title: 'mt-2 text-xl font-bold text-app-text',
  description: 'mt-3 text-sm leading-5 text-app-muted',
  statusRow: 'mt-5 flex-row items-center justify-between gap-4',
  statusLabel: 'text-sm font-semibold text-app-text',
  statusBadgeEnabled:
    'rounded-full bg-emerald-950 px-3 py-1.5 text-xs font-bold text-emerald-300',
  statusBadgeRestricted:
    'rounded-full bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-200',
  device: 'mt-3 text-xs text-app-muted',
  warning:
    'mt-4 rounded-2xl border border-amber-900 bg-amber-950 px-4 py-3 text-sm leading-5 text-amber-200',
  error:
    'mt-4 rounded-2xl border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300',
  primaryButton:
    'mt-5 items-center rounded-full bg-app-primary px-5 py-3 active:opacity-80',
  primaryButtonText: 'text-sm font-bold text-slate-950',
  secondaryButton:
    'mt-3 items-center rounded-full border border-app-border px-5 py-3 active:opacity-80',
  secondaryButtonText: 'text-sm font-bold text-app-text',
} as const;
