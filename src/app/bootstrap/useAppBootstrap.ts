import {useEffect, useState} from 'react';

import {initializePlayer} from '../../features/player/services/playerService';
import {usePlayerStore} from '../../features/player/store/playerStore';
import {initializeDatabase} from '../../shared/database/database';
import {initializeDownloadManager} from '../../features/downloads/services/downloadManager';

type DatabaseSetupStatus = 'initializing' | 'ready' | 'unavailable';

function getAppSetupStatus(
  playerStatus: 'initializing' | 'ready' | 'unavailable',
  databaseStatus: DatabaseSetupStatus,
) {
  if (playerStatus === 'unavailable' || databaseStatus === 'unavailable') {
    return 'unavailable' as const;
  }

  if (playerStatus === 'ready' && databaseStatus === 'ready') {
    return 'ready' as const;
  }

  return 'initializing' as const;
}

export function useAppBootstrap() {
  const playerSetupStatus = usePlayerStore(state => state.setupStatus);
  const playerErrorMessage = usePlayerStore(state => state.errorMessage);
  const markPlayerReady = usePlayerStore(state => state.markReady);
  const markPlayerUnavailable = usePlayerStore(state => state.markUnavailable);
  const [databaseSetupStatus, setDatabaseSetupStatus] =
    useState<DatabaseSetupStatus>('initializing');
  const [databaseErrorMessage, setDatabaseErrorMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    try {
      initializePlayer();
      markPlayerReady();
    } catch {
      markPlayerUnavailable('The audio player could not be initialized.');
    }
  }, [markPlayerReady, markPlayerUnavailable]);

  useEffect(() => {
    let isActive = true;

    initializeDatabase()
      .then(initializeDownloadManager)
      .then(() => {
        if (isActive) {
          setDatabaseSetupStatus('ready');
        }
      })
      .catch(() => {
        if (isActive) {
          setDatabaseSetupStatus('unavailable');
          setDatabaseErrorMessage(
            'Local storage could not be initialized. Please restart the app.',
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setupStatus = getAppSetupStatus(
    playerSetupStatus,
    databaseSetupStatus,
  );

  return {
    setupStatus,
    errorMessage: databaseErrorMessage ?? playerErrorMessage,
  };
}
