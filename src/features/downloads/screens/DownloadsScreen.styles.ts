import {StyleSheet} from 'react-native';

export const downloadsScreenStyles = {
  container: 'flex-1 bg-app-background',
  header: 'pb-6',
  eyebrow: 'text-xs font-semibold uppercase tracking-widest text-app-primary',
  title: 'mt-3 text-3xl font-bold text-app-text',
  description: 'mt-3 text-base leading-6 text-app-muted',
  cacheCard: 'mt-5 rounded-3xl border border-app-border bg-app-surface p-5',
  cacheTitle: 'text-sm font-bold text-app-text',
  cacheUsage: 'mt-2 text-sm text-app-muted',
  cacheOptions: 'mt-4 flex-row gap-2',
  cacheOption:
    'flex-1 items-center rounded-full border border-app-border px-3 py-2 active:opacity-70 disabled:opacity-50',
  selectedCacheOption:
    'flex-1 items-center rounded-full border border-app-primary bg-app-elevated px-3 py-2',
  cacheOptionText: 'text-xs font-bold text-app-text',
  error:
    'mt-4 rounded-2xl border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300',
  separator: 'h-3',
  empty: 'items-center py-16',
  emptyTitle: 'text-lg font-bold text-app-text',
  emptyDescription: 'mt-2 text-center text-sm leading-5 text-app-muted',
} as const;

export const downloadsScreenNativeStyles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 180,
  },
});
