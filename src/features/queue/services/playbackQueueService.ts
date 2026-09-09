import type {PodcastEpisode} from '../../podcasts/domain/podcastEpisode';
import type {
  PlaybackQueueItem,
  SavePlaybackQueueItemInput,
} from '../../player/domain/persistence';
import {
  appendPlaybackQueueItem,
  listEpisodePlaybackPositions,
  listPlaybackQueue,
  removePlaybackQueueItem,
  reorderPlaybackQueue,
} from '../../player/infrastructure/playbackPersistenceRepository';
import {
  activatePlaybackQueue,
  appendTrackPlayerQueueItem,
  getActiveMediaId,
  isPlaybackActive,
  isEpisodePlaybackQueueActive,
  moveTrackPlayerQueueItem,
  removeTrackPlayerQueueItem,
  pausePlayback,
  startPlayback,
} from '../../player/infrastructure/trackPlayerAdapter';
import {createStableId} from '../../../shared/utils/stableId';
import {resolveDownloadedQueueSources} from '../../downloads/services/downloadManager';

const MAX_PLAYBACK_QUEUE_ITEMS = 500;

let mutationChain: Promise<void> = Promise.resolve();

function runQueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationChain.then(operation, operation);

  mutationChain = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

function createEpisodeQueueInput(
  episode: PodcastEpisode,
  podcastTitle: string,
): SavePlaybackQueueItemInput {
  return {
    artworkUrl: episode.artworkUrl,
    durationSeconds: episode.durationSeconds,
    id: createStableId('queue', `episode:${episode.id}`),
    mediaId: episode.id,
    mediaType: 'episode',
    mimeType: episode.mimeType,
    sourceUrl: episode.audioUrl,
    subtitle: podcastTitle,
    title: episode.title,
  };
}

async function appendEpisode(
  episode: PodcastEpisode,
  podcastTitle: string,
) {
  const input = createEpisodeQueueInput(episode, podcastTitle);
  const currentQueue = await listPlaybackQueue();
  const existingItem = currentQueue.find(
    item => item.mediaType === 'episode' && item.mediaId === episode.id,
  );

  if (existingItem) {
    return existingItem;
  }

  if (currentQueue.length >= MAX_PLAYBACK_QUEUE_ITEMS) {
    throw new Error('The playback queue can contain up to 500 items.');
  }

  const wasInserted = await appendPlaybackQueueItem(input);
  const queue = await listPlaybackQueue();
  const item = queue.find(queueItem => queueItem.id === input.id);

  if (!item) {
    throw new Error('The episode could not be added to the queue.');
  }

  if (wasInserted && isEpisodePlaybackQueueActive()) {
    appendTrackPlayerQueueItem(item);
  }

  return item;
}

export function addEpisodeToPlaybackQueue(
  episode: PodcastEpisode,
  podcastTitle: string,
) {
  return runQueueMutation(() => appendEpisode(episode, podcastTitle));
}

export function playEpisodeFromCatalog(
  episode: PodcastEpisode,
  podcastTitle: string,
) {
  if (getActiveMediaId() === episode.id) {
    startPlayback();
    return Promise.resolve();
  }

  return runQueueMutation(async () => {
    const item = await appendEpisode(episode, podcastTitle);

    await playPersistedQueue(item.mediaId);
  });
}

export function playPersistedQueueItem(mediaId: string) {
  if (getActiveMediaId() === mediaId) {
    if (isPlaybackActive()) {
      pausePlayback();
    } else {
      startPlayback();
    }

    return Promise.resolve();
  }

  return runQueueMutation(() => playPersistedQueue(mediaId));
}

async function playPersistedQueue(mediaId: string) {
  const queue = await listPlaybackQueue();
  const episodeIds = queue
    .filter(item => item.mediaType === 'episode')
    .map(item => item.mediaId);
  const positions = await listEpisodePlaybackPositions(episodeIds);
  const resolvedQueue = await resolveDownloadedQueueSources(queue, mediaId);

  activatePlaybackQueue(resolvedQueue, mediaId, positions);
  startPlayback();
}

export function removeItemFromPlaybackQueue(itemId: string) {
  return runQueueMutation(async () => {
    const queue = await listPlaybackQueue();
    const index = queue.findIndex(item => item.id === itemId);

    if (index < 0) {
      return;
    }

    await removePlaybackQueueItem(itemId);

    if (isEpisodePlaybackQueueActive()) {
      removeTrackPlayerQueueItem(index);
    }
  });
}

export function persistPlaybackQueueOrder(
  items: readonly PlaybackQueueItem[],
  fromIndex: number,
  toIndex: number,
) {
  return runQueueMutation(async () => {
    await reorderPlaybackQueue(items.map(item => item.id));

    if (isEpisodePlaybackQueueActive() && fromIndex !== toIndex) {
      moveTrackPlayerQueueItem(fromIndex, toIndex);
    }
  });
}
