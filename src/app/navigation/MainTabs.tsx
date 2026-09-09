import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  Ionicons,
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';

import {DownloadsScreen} from '../../features/downloads/screens/DownloadsScreen';
import {LibraryScreen} from '../../features/library/LibraryScreen';
import {PodcastsScreen} from '../../features/podcasts/screens/PodcastsScreen';
import {QueueScreen} from '../../features/queue/screens/QueueScreen';
import {RadioScreen} from '../../features/radio/screens/RadioScreen';
import {mainTabScreenOptions} from './navigation.styles';

type TabBarIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

const createTabBarIcon = (
  activeIcon: IoniconsIconName,
  inactiveIcon: IoniconsIconName,
) =>
  ({color, focused, size}: TabBarIconProps) => (
    <Ionicons
      color={color}
      name={focused ? activeIcon : inactiveIcon}
      size={size}
    />
  );

export const MainTabs = createBottomTabNavigator({
  screenOptions: mainTabScreenOptions,
  screens: {
    Radio: {
      screen: RadioScreen,
      options: {
        tabBarIcon: createTabBarIcon('radio', 'radio-outline'),
        tabBarButtonTestID: 'tab-radio',
        title: 'Radio',
      },
    },
    Podcasts: {
      screen: PodcastsScreen,
      options: {
        tabBarIcon: createTabBarIcon('mic', 'mic-outline'),
        tabBarButtonTestID: 'tab-podcasts',
        title: 'Podcasts',
      },
    },
    Queue: {
      screen: QueueScreen,
      options: {
        tabBarIcon: createTabBarIcon('list', 'list-outline'),
        tabBarButtonTestID: 'tab-queue',
        title: 'Queue',
      },
    },
    Downloads: {
      screen: DownloadsScreen,
      options: {
        tabBarIcon: createTabBarIcon('download', 'download-outline'),
        tabBarButtonTestID: 'tab-downloads',
        title: 'Downloads',
      },
    },
    Library: {
      screen: LibraryScreen,
      options: {
        tabBarIcon: createTabBarIcon('library', 'library-outline'),
        tabBarButtonTestID: 'tab-library',
        title: 'Library',
      },
    },
  },
});
