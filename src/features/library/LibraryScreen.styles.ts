import {StyleSheet} from 'react-native';

export const libraryScreenStyles = {
  container: 'flex-1 bg-app-background',
  header: 'pb-6 pt-8',
  eyebrow: 'text-xs font-semibold uppercase tracking-widest text-app-primary',
  title: 'mt-3 text-3xl font-bold text-app-text',
  description: 'mt-3 text-base leading-6 text-app-muted',
  headerContent: 'gap-4 pb-2',
  sectionHeader: 'pt-5',
  sectionTitle: 'text-xl font-bold text-app-text',
  emptyText: 'mt-3 text-sm leading-5 text-app-muted',
  separator: 'h-4',
  error: 'text-sm leading-5 text-red-400',
} as const;

export const libraryScreenNativeStyles = StyleSheet.create({
  listContent: {
    paddingBottom: 180,
    paddingHorizontal: 24,
  },
});
