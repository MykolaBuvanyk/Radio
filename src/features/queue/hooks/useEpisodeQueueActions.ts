import {useEffect, useRef, useState} from 'react';

import type {PodcastEpisode} from '../../podcasts/domain/podcastEpisode';
import {observePlaybackQueue} from '../../player/infrastructure/playbackPersistenceRepository';
import {
  addEpisodeToPlaybackQueue,
  playEpisodeFromCatalog,
} from '../services/playbackQueueService';

export function useEpisodeQueueActions() {
  const [queuedEpisodeIds, setQueuedEpisodeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingEpisodeId, setPendingEpisodeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = observePlaybackQueue(
      items => {
        setQueuedEpisodeIds(
          new Set(
            items
              .filter(item => item.mediaType === 'episode')
              .map(item => item.mediaId),
          ),
        );
      },
      () => setErrorMessage('The playback queue could not be loaded.'),
    );

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  const runEpisodeAction = async (
    episode: PodcastEpisode,
    action: () => Promise<unknown>,
    errorMessageValue: string,
  ) => {
    setPendingEpisodeId(episode.id);
    setErrorMessage(null);

    try {
      await action();
    } catch {
      if (isMounted.current) {
        setErrorMessage(errorMessageValue);
      }
    } finally {
      if (isMounted.current) {
        setPendingEpisodeId(null);
      }
    }
  };

  const addEpisode = (episode: PodcastEpisode, podcastTitle: string) =>
    runEpisodeAction(
      episode,
      () => addEpisodeToPlaybackQueue(episode, podcastTitle),
      'The episode could not be added to the queue.',
    );

  const playEpisode = (episode: PodcastEpisode, podcastTitle: string) =>
    runEpisodeAction(
      episode,
      () => playEpisodeFromCatalog(episode, podcastTitle),
      'The episode could not be played.',
    );

  return {
    addEpisode,
    errorMessage,
    pendingEpisodeId,
    playEpisode,
    queuedEpisodeIds,
  };
}
