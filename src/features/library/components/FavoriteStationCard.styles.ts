export const favoriteStationCardStyles = {
  container:
    'flex-row items-center gap-4 rounded-3xl border border-app-border bg-app-surface p-5',
  content: 'flex-1',
  genre: 'text-xs font-semibold uppercase tracking-wider text-app-primary',
  title: 'mt-2 text-lg font-bold text-app-text',
  metadata: 'mt-2 text-xs text-app-muted',
  actions: 'gap-3',
  playButton:
    'h-11 w-11 items-center justify-center rounded-full bg-app-primary active:opacity-80',
  removeButton:
    'h-11 w-11 items-center justify-center rounded-full border border-app-border active:opacity-80 disabled:opacity-40',
} as const;
