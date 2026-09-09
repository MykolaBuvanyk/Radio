export const podcastEpisodeCardStyles = {
  container: 'rounded-3xl border border-app-border bg-app-surface p-5',
  date: 'text-xs font-semibold uppercase tracking-wider text-app-primary',
  title: 'mt-2 text-lg font-bold text-app-text',
  description: 'mt-2 text-sm leading-5 text-app-muted',
  metadata: 'mt-4 text-xs text-app-muted',
  explicit:
    'mt-3 self-start rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-app-muted',
  actions: 'mt-5 flex-row flex-wrap gap-3',
  playButton:
    'flex-1 items-center rounded-full bg-app-primary px-4 py-3 active:opacity-80 disabled:opacity-50',
  playButtonText: 'text-sm font-bold text-slate-950',
  queueButton:
    'flex-1 items-center rounded-full border border-app-border px-4 py-3 active:opacity-80 disabled:opacity-50',
  queueButtonText: 'text-sm font-bold text-app-text',
  downloadButton:
    'w-full items-center rounded-full border border-app-primary px-4 py-3 active:opacity-80 disabled:opacity-50',
  downloadButtonText: 'text-sm font-bold text-app-primary',
  deleteButton:
    'w-full items-center rounded-full border border-red-900 px-4 py-3 active:opacity-80 disabled:opacity-50',
  deleteButtonText: 'text-sm font-bold text-red-400',
} as const;
