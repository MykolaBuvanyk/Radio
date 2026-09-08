import {StyleSheet} from 'react-native';

export const appStyles = {
  content: 'flex-1 items-center justify-center px-6',
  eyebrow: 'mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400',
  title: 'text-4xl font-bold text-white',
  subtitle: 'mt-3 text-center text-base leading-6 text-slate-300',
} as const;

export const appNativeStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
