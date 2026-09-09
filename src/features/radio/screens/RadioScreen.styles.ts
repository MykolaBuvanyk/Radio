import {StyleSheet} from 'react-native';

export const radioScreenStyles = {
  container: 'flex-1 bg-app-background',
  header: 'px-6 pb-5 pt-8',
  eyebrow: 'text-xs font-semibold uppercase tracking-widest text-app-primary',
  title: 'mt-3 text-3xl font-bold text-app-text',
  description: 'mt-3 text-base leading-6 text-app-muted',
  searchInput:
    'mt-6 rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-base text-app-text',
  playerError:
    'mt-4 rounded-xl border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300',
  catalogNotice:
    'mt-4 rounded-xl border border-amber-900 bg-amber-950 px-4 py-3 text-sm text-amber-200',
  centeredState: 'items-center px-6 py-16',
  stateTitle: 'mt-4 text-lg font-bold text-app-text',
  stateDescription: 'mt-2 text-center text-sm leading-5 text-app-muted',
  retryButton:
    'mt-5 rounded-full bg-app-primary px-5 py-3 active:opacity-80',
  retryButtonText: 'text-sm font-bold text-slate-950',
  separator: 'h-3',
  footerLoader: 'flex-row items-center justify-center gap-3 py-6',
  footerText: 'text-sm text-app-muted',
} as const;

export const radioScreenNativeStyles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 180,
  },
});
