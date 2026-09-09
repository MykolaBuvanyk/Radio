import {useEffect} from 'react';
import {AppState} from 'react-native';

import {flushPendingPlaybackPositions} from '../services/playbackPositionWriter';

export function usePlaybackPersistenceLifecycle() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        flushPendingPlaybackPositions().catch(() => undefined);
      }
    });

    return () => {
      subscription.remove();
      flushPendingPlaybackPositions().catch(() => undefined);
    };
  }, []);
}
