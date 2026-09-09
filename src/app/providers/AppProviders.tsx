import type {PropsWithChildren} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {usePlaybackPersistenceLifecycle} from '../../features/player/infrastructure/usePlaybackPersistenceLifecycle';
import {appProvidersStyles} from './AppProviders.styles';

export function AppProviders({children}: PropsWithChildren) {
  usePlaybackPersistenceLifecycle();

  return (
    <GestureHandlerRootView style={appProvidersStyles.root}>
      {children}
    </GestureHandlerRootView>
  );
}
