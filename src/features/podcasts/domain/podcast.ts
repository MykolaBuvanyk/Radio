export type PodcastSubscription = {
  id: string;
  feedUrl: string;
  title: string;
  author: string | null;
  description: string;
  artworkUrl: string | null;
  language: string | null;
  etag: string | null;
  lastModified: string | null;
  lastSyncedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type SavePodcastSubscriptionInput = Omit<
  PodcastSubscription,
  'createdAt' | 'updatedAt'
>;

export type PodcastFeedCacheMetadata = {
  etag: string | null;
  lastModified: string | null;
  lastSyncedAt: number;
};
