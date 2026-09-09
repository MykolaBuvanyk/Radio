export const radioStationCardStyles = {
  card: 'rounded-2xl border border-app-border bg-app-surface p-4',
  cardActive: 'border-app-primary bg-cyan-950',
  cardDisabled: 'opacity-50',
  header: 'flex-row items-start justify-between gap-3',
  metadata: 'flex-1',
  name: 'text-base font-bold text-app-text',
  location: 'mt-1 text-sm text-app-muted',
  technical: 'mt-3 text-xs uppercase tracking-wider text-app-muted',
  status: 'mt-3 text-sm font-semibold text-app-primary',
  action:
    'min-w-16 items-center rounded-full bg-app-primary px-3 py-2 active:opacity-80',
  actionText: 'text-sm font-bold text-slate-950',
} as const;

export function getRadioStationCardClassName(
  isActive: boolean,
  isDisabled: boolean,
) {
  return [
    radioStationCardStyles.card,
    isActive ? radioStationCardStyles.cardActive : '',
    isDisabled ? radioStationCardStyles.cardDisabled : '',
  ]
    .filter(Boolean)
    .join(' ');
}
