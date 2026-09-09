export type PodcastEpisode = {
  id: string;
  podcastId: string;
  guid: string;
  title: string;
  description: string;
  audioUrl: string;
  mimeType: string | null;
  artworkUrl: string | null;
  publishedAt: number | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  isExplicit: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SavePodcastEpisodeInput = Omit<
  PodcastEpisode,
  'createdAt' | 'updatedAt'
>;

export type PodcastEpisodePageInput = {
  podcastId: string;
  limit: number;
  offset: number;
};
