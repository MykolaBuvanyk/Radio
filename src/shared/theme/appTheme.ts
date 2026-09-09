import {DarkTheme, type Theme} from '@react-navigation/native';

export const appColors = {
  background: '#020617',
  surface: '#0f172a',
  surfaceElevated: '#1e293b',
  primary: '#22d3ee',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#1e293b',
  notification: '#f97316',
} as const;

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: appColors.primary,
    background: appColors.background,
    card: appColors.surface,
    text: appColors.text,
    border: appColors.border,
    notification: appColors.notification,
  },
};
