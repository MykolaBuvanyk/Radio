import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {PodcastDetailsScreen} from '../../features/podcasts/screens/PodcastDetailsScreen';
import {navigationTheme} from '../../shared/theme/appTheme';
import {MainTabs} from './MainTabs';
import {
  podcastDetailsScreenOptions,
  rootStackScreenOptions,
} from './navigation.styles';

export const RootStack = createNativeStackNavigator({
  screenOptions: rootStackScreenOptions,
  screens: {
    MainTabs,
    PodcastDetails: {
      screen: PodcastDetailsScreen,
      options: podcastDetailsScreenOptions,
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export function RootNavigator() {
  return <Navigation theme={navigationTheme} />;
}
