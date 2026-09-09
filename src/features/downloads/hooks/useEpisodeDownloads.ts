import {useCallback, useEffect, useMemo, useState} from 'react';

import type {
  DownloadCacheSettings,
  EpisodeDownload,
  EpisodeDownloadListItem,
} from '../domain/download';
import type {PodcastEpisode} from '../../podcasts/domain/podcastEpisode';
import {
  observeDownloadCacheSettings,
  observeEpisodeDownloadListItems,
  observeEpisodeDownloads,
} from '../infrastructure/downloadRepository';
import {
  enqueueDownload,
  pauseDownload,
  removeDownload,
  resumeDownload,
  setDownloadCacheLimit,
  subscribeDownloadProgress,
} from '../services/downloadManager';
import {playDownloadedEpisode} from '../../queue/services/playbackQueueService';

const DEFAULT_CACHE_SETTINGS: DownloadCacheSettings = {
  maxSizeBytes: 500 * 1024 * 1024,
  updatedAt: 0,
};

function readErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The download action could not be completed.';
}

export function useEpisodeDownloadActions() {
  const [downloads, setDownloads] = useState<EpisodeDownload[]>([]);
  const [pendingEpisodeId, setPendingEpisodeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(
    () =>
      observeEpisodeDownloads(setDownloads, error => {
        setErrorMessage(error.message);
      }),
    [],
  );

  const downloadsByEpisodeId = useMemo(
    () => new Map(downloads.map(download => [download.episodeId, download])),
    [downloads],
  );

  const runAction = useCallback(
    async (episodeId: string, action: () => Promise<void>) => {
      setPendingEpisodeId(episodeId);
      setErrorMessage(null);

      try {
        await action();
      } catch (error) {
        setErrorMessage(readErrorMessage(error));
      } finally {
        setPendingEpisodeId(null);
      }
    },
    [],
  );
  const download = useCallback(
    (episode: PodcastEpisode) =>
      runAction(episode.id, () => enqueueDownload(episode)),
    [runAction],
  );
  const pause = useCallback(
    (episodeId: string) =>
      runAction(episodeId, () => pauseDownload(episodeId)),
    [runAction],
  );
  const remove = useCallback(
    (episodeId: string) =>
      runAction(episodeId, () => removeDownload(episodeId)),
    [runAction],
  );
  const resume = useCallback(
    (episodeId: string) =>
      runAction(episodeId, () => resumeDownload(episodeId)),
    [runAction],
  );

  return {
    downloadsByEpisodeId,
    errorMessage,
    pendingEpisodeId,
    download,
    pause,
    remove,
    resume,
  };
}

export function useDownloadLibrary() {
  const [items, setItems] = useState<EpisodeDownloadListItem[]>([]);
  const [settings, setSettings] = useState(DEFAULT_CACHE_SETTINGS);
  const [pendingEpisodeId, setPendingEpisodeId] = useState<string | null>(null);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeItems = observeEpisodeDownloadListItems(
      setItems,
      error => setErrorMessage(error.message),
    );
    const unsubscribeSettings = observeDownloadCacheSettings(
      setSettings,
      error => setErrorMessage(error.message),
    );
    const unsubscribeProgress = subscribeDownloadProgress(update => {
      setItems(currentItems =>
        currentItems.map(item =>
          item.episodeId === update.episodeId
            ? {
                ...item,
                bytesDownloaded: update.bytesDownloaded,
                status: 'downloading',
                totalBytes: update.totalBytes ?? item.totalBytes,
              }
            : item,
        ),
      );
    });

    return () => {
      unsubscribeItems();
      unsubscribeSettings();
      unsubscribeProgress();
    };
  }, []);

  const runItemAction = useCallback(
    async (episodeId: string, action: () => Promise<void>) => {
      setPendingEpisodeId(episodeId);
      setErrorMessage(null);

      try {
        await action();
      } catch (error) {
        setErrorMessage(readErrorMessage(error));
      } finally {
        setPendingEpisodeId(null);
      }
    },
    [],
  );

  const updateLimit = useCallback(async (maxSizeBytes: number) => {
    setIsUpdatingLimit(true);
    setErrorMessage(null);

    try {
      await setDownloadCacheLimit(maxSizeBytes);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsUpdatingLimit(false);
    }
  }, []);
  const pause = useCallback(
    (episodeId: string) =>
      runItemAction(episodeId, () => pauseDownload(episodeId)),
    [runItemAction],
  );
  const play = useCallback(
    (
      episodeId: string,
      podcastTitle: string,
      contextEpisodeIds?: readonly string[],
    ) =>
      runItemAction(episodeId, () =>
        playDownloadedEpisode(episodeId, podcastTitle, contextEpisodeIds),
      ),
    [runItemAction],
  );
  const remove = useCallback(
    (episodeId: string) =>
      runItemAction(episodeId, () => removeDownload(episodeId)),
    [runItemAction],
  );
  const resume = useCallback(
    (episodeId: string) =>
      runItemAction(episodeId, () => resumeDownload(episodeId)),
    [runItemAction],
  );

  return {
    cacheSizeBytes: items.reduce(
      (sum, item) =>
        item.status === 'completed' ? sum + (item.totalBytes ?? 0) : sum,
      0,
    ),
    errorMessage,
    isUpdatingLimit,
    items,
    maxSizeBytes: settings.maxSizeBytes,
    pendingEpisodeId,
    pause,
    play,
    remove,
    resume,
    updateLimit,
  };
}
