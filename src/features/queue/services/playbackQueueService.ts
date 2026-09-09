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
import {applyPreferredEpisodePlaybackSpeed} from '../../player/services/playbackSpeedService';
import {getPodcastEpisode} from '../../podcasts/infrastructure/podcastRepository';

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
  context: readonly PodcastEpisode[] = [episode],
) {
  if (getActiveMediaId() === episode.id) {
    startPlayback();
    return Promise.resolve();
  }

  return runQueueMutation(async () => {
    await playEpisodeContext(context, episode.id, podcastTitle);
  });
}

export function playDownloadedEpisode(
  episodeId: string,
  podcastTitle: string,
  contextEpisodeIds: readonly string[] = [episodeId],
) {
  if (getActiveMediaId() === episodeId) {
    return playPersistedQueueItem(episodeId);
  }

  return runQueueMutation(async () => {
    const episodes = (
      await Promise.all(contextEpisodeIds.map(id => getPodcastEpisode(id)))
    ).filter((episode): episode is PodcastEpisode => episode !== null);
    const episode = episodes.find(item => item.id === episodeId);

    if (!episode) {
      throw new Error('This downloaded episode is no longer in the library.');
    }

    await playEpisodeContext(episodes, episodeId, podcastTitle);
  });
}

async function playEpisodeContext(
  episodes: readonly PodcastEpisode[],
  activeEpisodeId: string,
  podcastTitle: string,
) {
  const contextIds = new Set(episodes.map(episode => episode.id));

  for (const episode of episodes) {
    await appendEpisode(episode, podcastTitle);
  }

  const queue = await listPlaybackQueue();
  const contextQueue = queue.filter(
    item => item.mediaType === 'episode' && contextIds.has(item.mediaId),
  );
  const positions = await listEpisodePlaybackPositions(
    contextQueue.map(item => item.mediaId),
  );
  const resolvedQueue = await resolveDownloadedQueueSources(
    contextQueue,
    activeEpisodeId,
  );

  activatePlaybackQueue(resolvedQueue, activeEpisodeId, positions);
  applyPreferredEpisodePlaybackSpeed();
  startPlayback();
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
  applyPreferredEpisodePlaybackSpeed();
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
