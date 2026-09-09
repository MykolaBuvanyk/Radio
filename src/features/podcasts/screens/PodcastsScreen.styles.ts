import {StyleSheet} from 'react-native';

export const podcastsScreenStyles = {
  container: 'flex-1 bg-app-background',
  header: 'pb-6',
  eyebrow: 'text-xs font-semibold uppercase tracking-widest text-app-primary',
  title: 'mt-3 text-3xl font-bold text-app-text',
  description: 'mt-3 text-base leading-6 text-app-muted',
  input:
    'mt-6 rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-base text-app-text',
  submitButton:
    'mt-3 items-center rounded-full bg-app-primary px-5 py-3 active:opacity-80 disabled:opacity-50',
  submitButtonText: 'text-sm font-bold text-slate-950',
  error:
    'mt-4 rounded-2xl border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300',
  sectionTitle: 'mt-8 text-lg font-bold text-app-text',
  centeredState: 'items-center py-16',
  stateTitle: 'mt-4 text-lg font-bold text-app-text',
  stateDescription: 'mt-2 text-center text-sm leading-5 text-app-muted',
  separator: 'h-3',
} as const;

export const podcastsScreenNativeStyles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 180,
  },
});
