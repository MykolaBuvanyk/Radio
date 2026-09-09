import {StyleSheet} from 'react-native';

export const libraryScreenStyles = {
  container: 'flex-1 bg-app-background',
  header: 'px-6 pb-6 pt-8',
  eyebrow: 'text-xs font-semibold uppercase tracking-widest text-app-primary',
  title: 'mt-3 text-3xl font-bold text-app-text',
  description: 'mt-3 text-base leading-6 text-app-muted',
  content: 'px-6',
} as const;

export const libraryScreenNativeStyles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 180,
  },
});
