export type ParsedPodcastEpisode = {
  audioUrl: string;
  description: string;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  guid: string;
  isExplicit: boolean;
  mimeType: string | null;
  publishedAt: number | null;
  title: string;
};

export type ParsedPodcastFeed = {
  artworkUrl: string | null;
  author: string | null;
  description: string;
  episodes: ParsedPodcastEpisode[];
  language: string | null;
  title: string;
};

export type PodcastFeedValidators = {
  etag: string | null;
  lastModified: string | null;
};

export type PodcastFeedResponse =
  | {
      kind: 'not-modified';
      validators: PodcastFeedValidators;
    }
  | {
      body: string;
      kind: 'modified';
      validators: PodcastFeedValidators;
    };
