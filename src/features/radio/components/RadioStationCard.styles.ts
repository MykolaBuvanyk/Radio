export const radioStationCardStyles = {
  card:
    'relative min-h-44 rounded-3xl border border-app-border bg-app-surface',
  cardActive: 'border-app-primary bg-cyan-950',
  cardDisabled: 'opacity-50',
  cardPressable: 'min-h-44 p-5 pr-28 active:opacity-80',
  header: 'flex-row items-start',
  metadata: 'flex-1',
  name: 'text-base font-bold text-app-text',
  location: 'mt-1 text-sm text-app-muted',
  technical: 'mt-3 text-xs uppercase tracking-wider text-app-muted',
  status: 'mt-3 text-sm font-semibold text-app-primary',
  action:
    'absolute right-5 top-5 min-h-11 min-w-20 items-center justify-center rounded-full bg-app-primary px-4 py-2 active:opacity-80',
  actionText: 'text-sm font-bold text-slate-950',
  favoriteAction:
    'absolute bottom-5 right-5 h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-elevated active:opacity-80 disabled:opacity-50',
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
