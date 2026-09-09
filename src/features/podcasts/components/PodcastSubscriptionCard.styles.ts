export const podcastSubscriptionCardStyles = {
  container:
    'rounded-3xl border border-app-border bg-app-surface p-5',
  content: 'active:opacity-80',
  author: 'text-xs font-semibold uppercase tracking-wider text-app-primary',
  title: 'mt-2 text-lg font-bold text-app-text',
  description: 'mt-2 text-sm leading-5 text-app-muted',
  metadataRow: 'mt-4 flex-row items-center justify-between gap-3',
  metadata: 'flex-1 text-xs text-app-muted',
  action: 'text-sm font-bold text-app-primary',
  removeButton: 'active:opacity-70 disabled:opacity-40',
  removeButtonText: 'text-sm font-bold text-red-400',
} as const;
