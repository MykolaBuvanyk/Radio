import {useEffect, useRef, useState} from 'react';

import type {PlaybackQueueItem} from '../../player/domain/persistence';
import {
  listPlaybackQueue,
  observePlaybackQueue,
} from '../../player/infrastructure/playbackPersistenceRepository';
import {
  persistPlaybackQueueOrder,
  playPersistedQueueItem,
  removeItemFromPlaybackQueue,
} from '../services/playbackQueueService';

export function usePlaybackQueue() {
  const [items, setItems] = useState<PlaybackQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMediaId, setPendingMediaId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = observePlaybackQueue(
      nextItems => {
        setItems(nextItems);
        setIsLoading(false);
      },
      () => {
        setErrorMessage('The playback queue could not be loaded.');
        setIsLoading(false);
      },
    );

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  const playItem = async (mediaId: string) => {
    setPendingMediaId(mediaId);
    setErrorMessage(null);

    try {
      await playPersistedQueueItem(mediaId);
    } catch {
      if (isMounted.current) {
        setErrorMessage('The selected episode could not be played.');
      }
    } finally {
      if (isMounted.current) {
        setPendingMediaId(null);
      }
    }
  };

  const removeItem = async (itemId: string) => {
    setErrorMessage(null);

    try {
      await removeItemFromPlaybackQueue(itemId);
    } catch {
      if (isMounted.current) {
        setErrorMessage('The queue item could not be removed.');
      }
    }
  };

  const reorderItems = async (
    nextItems: PlaybackQueueItem[],
    fromIndex: number,
    toIndex: number,
  ) => {
    const previousItems = items;

    setItems(nextItems);
    setErrorMessage(null);

    try {
      await persistPlaybackQueueOrder(nextItems, fromIndex, toIndex);
    } catch {
      if (isMounted.current) {
        setErrorMessage('The queue order could not be saved.');

        try {
          setItems(await listPlaybackQueue());
        } catch {
          setItems(previousItems);
        }
      }
    }
  };

  return {
    errorMessage,
    isLoading,
    items,
    pendingMediaId,
    playItem,
    removeItem,
    reorderItems,
  };
}
