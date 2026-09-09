import {useEffect, useRef, useState} from 'react';

import type {PodcastEpisode} from '../domain/podcastEpisode';
import {
  getPodcastSubscriptionById,
  observePodcastEpisodes,
} from '../infrastructure/podcastRepository';
import {
  PODCAST_EPISODE_PAGE_SIZE,
  removePodcastEpisode,
  refreshPodcastSubscription,
} from '../services/podcastSubscriptionService';

export function usePodcastEpisodes(podcastId: string) {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [podcastTitle, setPodcastTitle] = useState('Podcast');
  const [visibleLimit, setVisibleLimit] = useState(
    PODCAST_EPISODE_PAGE_SIZE,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    let isActive = true;

    getPodcastSubscriptionById(podcastId)
      .then(subscription => {
        if (!isActive) {
          return;
        }

        if (subscription) {
          setPodcastTitle(subscription.title);
        } else {
          setErrorMessage('This podcast subscription no longer exists.');
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage('The podcast details could not be loaded.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [podcastId]);

  useEffect(() => {
    const unsubscribe = observePodcastEpisodes(
      {limit: visibleLimit, offset: 0, podcastId},
      nextEpisodes => {
        setEpisodes(nextEpisodes);
        setIsLoading(false);
      },
      () => {
        setErrorMessage('Podcast episodes could not be loaded.');
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [podcastId, visibleLimit]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  const loadMore = () => {
    if (episodes.length >= visibleLimit) {
      setVisibleLimit(limit => limit + PODCAST_EPISODE_PAGE_SIZE);
    }
  };

  const refresh = async () => {
    if (isRefreshing) {
      return;
    }

    const controller = new AbortController();

    activeRequest.current?.abort();
    activeRequest.current = controller;
    setErrorMessage(null);
    setIsRefreshing(true);

    try {
      const result = await refreshPodcastSubscription(
        podcastId,
        controller.signal,
      );

      if (isMounted.current) {
        setPodcastTitle(result.subscription.title);
      }
    } catch (error) {
      if (
        isMounted.current &&
        !(error instanceof Error && error.name === 'AbortError')
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The podcast could not be refreshed.',
        );
      }
    } finally {
      if (isMounted.current && activeRequest.current === controller) {
        activeRequest.current = null;
        setIsRefreshing(false);
      }
    }
  };

  const removeEpisode = async (episodeId: string) => {
    if (pendingDeletionId) {
      return false;
    }

    setPendingDeletionId(episodeId);
    setErrorMessage(null);

    try {
      await removePodcastEpisode(episodeId);
      return true;
    } catch (error) {
      if (isMounted.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The episode could not be deleted.',
        );
      }
      return false;
    } finally {
      if (isMounted.current) {
        setPendingDeletionId(null);
      }
    }
  };

  return {
    episodes,
    errorMessage,
    isLoading,
    isRefreshing,
    loadMore,
    pendingDeletionId,
    podcastTitle,
    refresh,
    removeEpisode,
  };
}
