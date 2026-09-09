export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed';

export type EpisodeDownload = {
  episodeId: string;
  status: DownloadStatus;
  localUri: string | null;
  temporaryUri: string | null;
  bytesDownloaded: number;
  totalBytes: number | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  lastAccessedAt: number;
};

export type EpisodeDownloadListItem = EpisodeDownload & {
  episodeTitle: string;
  podcastTitle: string;
};

export type DownloadCacheSettings = {
  maxSizeBytes: number;
  updatedAt: number;
};

export type DownloadProgressInput = {
  episodeId: string;
  bytesDownloaded: number;
  totalBytes: number | null;
  temporaryUri: string | null;
};
