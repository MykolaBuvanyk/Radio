import type {StaticParamList} from '@react-navigation/native';

import type {MainTabs} from './MainTabs';
import type {RootStack} from './RootNavigator';

export type MainTabParamList = StaticParamList<typeof MainTabs>;
export type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
