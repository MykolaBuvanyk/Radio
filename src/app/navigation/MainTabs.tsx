import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {DownloadsScreen} from '../../features/downloads/screens/DownloadsScreen';
import {LibraryScreen} from '../../features/library/LibraryScreen';
import {PodcastsScreen} from '../../features/podcasts/screens/PodcastsScreen';
import {QueueScreen} from '../../features/queue/screens/QueueScreen';
import {RadioScreen} from '../../features/radio/screens/RadioScreen';
import {mainTabScreenOptions} from './navigation.styles';

export const MainTabs = createBottomTabNavigator({
  screenOptions: mainTabScreenOptions,
  screens: {
    Radio: {
      screen: RadioScreen,
      options: {
        title: 'Radio',
      },
    },
    Podcasts: {
      screen: PodcastsScreen,
      options: {
        title: 'Podcasts',
      },
    },
    Queue: {
      screen: QueueScreen,
      options: {
        title: 'Queue',
      },
    },
    Downloads: {
      screen: DownloadsScreen,
      options: {
        title: 'Downloads',
      },
    },
    Library: {
      screen: LibraryScreen,
      options: {
        title: 'Library',
      },
    },
  },
});
