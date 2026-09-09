import type {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

import {appColors} from '../../shared/theme/appTheme';

export const rootStackScreenOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: appColors.background,
  },
} satisfies NativeStackNavigationOptions;

export const podcastDetailsScreenOptions = {
  headerShown: true,
  title: 'Episodes',
  headerStyle: {
    backgroundColor: appColors.surface,
  },
  headerTintColor: appColors.text,
  headerShadowVisible: false,
} satisfies NativeStackNavigationOptions;

export const mainTabScreenOptions = {
  headerStyle: {
    backgroundColor: appColors.surface,
  },
  headerShadowVisible: false,
  headerTintColor: appColors.text,
  sceneStyle: {
    backgroundColor: appColors.background,
  },
  tabBarActiveTintColor: appColors.primary,
  tabBarInactiveTintColor: appColors.textMuted,
  tabBarHideOnKeyboard: true,
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBarStyle: {
    backgroundColor: appColors.surface,
    borderTopColor: appColors.border,
  },
} satisfies BottomTabNavigationOptions;
