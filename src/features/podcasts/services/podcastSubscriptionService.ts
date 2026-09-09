import {
  fetchPodcastFeed,
  normalizePodcastFeedUrl,
} from '../api/podcastFeedClient';
import {parsePodcastFeed} from '../api/podcastFeedParser';
import type {PodcastSubscription} from '../domain/podcast';
import type {SavePodcastEpisodeInput} from '../domain/podcastEpisode';
import {
  deletePodcastEpisode,
  deletePodcastSubscription,
  getPodcastSubscriptionByFeedUrl,
  getPodcastSubscriptionById,
  savePodcastFeedSnapshot,
  updatePodcastFeedCacheMetadata,
} from '../infrastructure/podcastRepository';
import {createStableId} from '../../../shared/utils/stableId';
import {deleteFileIfPresent} from '../../downloads/infrastructure/downloadFileAdapter';

export const PODCAST_EPISODE_PAGE_SIZE = 30;
const MAX_EPISODES_PER_SYNC = 200;

export type PodcastSyncResult = {
  episodeCount: number;
  subscription: PodcastSubscription;
  wasModified: boolean;
};

function selectRecentEpisodes<T extends {publishedAt: number | null}>(
  episodes: readonly T[],
) {
  return [...episodes]
    .sort(
      (left, right) =>
        (right.publishedAt ?? 0) - (left.publishedAt ?? 0),
    )
    .slice(0, MAX_EPISODES_PER_SYNC);
}

function createEpisodeInputs(
  podcastId: string,
  artworkUrl: string | null,
  episodes: ReturnType<typeof parsePodcastFeed>['episodes'],
): SavePodcastEpisodeInput[] {
  const knownGuids = new Set<string>();

  return selectRecentEpisodes(episodes).flatMap(episode => {
    if (knownGuids.has(episode.guid)) {
      return [];
    }

    knownGuids.add(episode.guid);

    return [
      {
        ...episode,
        artworkUrl,
        id: createStableId('episode', `${podcastId}:${episode.guid}`),
        podcastId,
      },
    ];
  });
}

async function syncPodcastFeed(
  normalizedFeedUrl: string,
  existingSubscription: PodcastSubscription | null,
  signal?: AbortSignal,
): Promise<PodcastSyncResult> {
  const response = await fetchPodcastFeed(
    normalizedFeedUrl,
    {
      etag: existingSubscription?.etag ?? null,
      lastModified: existingSubscription?.lastModified ?? null,
    },
    signal,
  );
  const syncedAt = Date.now();

  if (response.kind === 'not-modified') {
    if (!existingSubscription) {
      throw new Error('The podcast cache is missing for this feed.');
    }

    await updatePodcastFeedCacheMetadata(existingSubscription.id, {
      ...response.validators,
      lastSyncedAt: syncedAt,
    });

    const refreshedSubscription =
      (await getPodcastSubscriptionById(existingSubscription.id)) ??
      existingSubscription;

    return {
      episodeCount: 0,
      subscription: refreshedSubscription,
      wasModified: false,
    };
  }

  const parsedFeed = parsePodcastFeed(response.body);
  const podcastId =
    existingSubscription?.id ??
    createStableId('podcast', normalizedFeedUrl);
  const subscriptionInput = {
    artworkUrl: parsedFeed.artworkUrl,
    author: parsedFeed.author,
    description: parsedFeed.description,
    etag: response.validators.etag,
    feedUrl: normalizedFeedUrl,
    id: podcastId,
    language: parsedFeed.language,
    lastModified: response.validators.lastModified,
    lastSyncedAt: syncedAt,
    title: parsedFeed.title,
  };
  const episodes = createEpisodeInputs(
    podcastId,
    subscriptionInput.artworkUrl,
    parsedFeed.episodes,
  );
  const subscription = await savePodcastFeedSnapshot(
    subscriptionInput,
    episodes,
  );

  return {
    episodeCount: episodes.length,
    subscription,
    wasModified: true,
  };
}

export async function subscribeToPodcast(
  feedUrl: string,
  signal?: AbortSignal,
) {
  const normalizedFeedUrl = normalizePodcastFeedUrl(feedUrl);
  const existingSubscription =
    await getPodcastSubscriptionByFeedUrl(normalizedFeedUrl);

  return syncPodcastFeed(normalizedFeedUrl, existingSubscription, signal);
}

export async function refreshPodcastSubscription(
  podcastId: string,
  signal?: AbortSignal,
) {
  const subscription = await getPodcastSubscriptionById(podcastId);

  if (!subscription) {
    throw new Error('This podcast subscription no longer exists.');
  }

  return syncPodcastFeed(subscription.feedUrl, subscription, signal);
}

async function removeCachedFiles(fileUris: readonly string[]) {
  await Promise.all(
    fileUris.map(fileUri => deleteFileIfPresent(fileUri).catch(() => undefined)),
  );
}

export async function removePodcastSubscription(podcastId: string) {
  const cachedFileUris = await deletePodcastSubscription(podcastId);
  await removeCachedFiles(cachedFileUris);
}

export async function removePodcastEpisode(episodeId: string) {
  const cachedFileUris = await deletePodcastEpisode(episodeId);
  await removeCachedFiles(cachedFileUris);
}
