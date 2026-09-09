import {StyleSheet} from 'react-native';

export const queueScreenStyles = {
  container: 'flex-1 bg-app-background',
  header: 'pb-6',
  eyebrow: 'text-xs font-semibold uppercase tracking-widest text-app-primary',
  title: 'mt-3 text-3xl font-bold text-app-text',
  description: 'mt-3 text-base leading-6 text-app-muted',
  hint: 'mt-3 text-sm leading-5 text-app-muted',
  error:
    'mt-4 rounded-2xl border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300',
  centeredState: 'items-center py-16',
  stateTitle: 'mt-4 text-lg font-bold text-app-text',
  stateDescription: 'mt-2 text-center text-sm leading-5 text-app-muted',
  separator: 'h-3',
} as const;

export const queueScreenNativeStyles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#020617',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 180,
  },
});
