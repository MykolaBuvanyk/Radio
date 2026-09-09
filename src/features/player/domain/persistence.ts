export type PersistedMediaType = 'radio' | 'episode';

export type EpisodePlaybackPosition = {
  episodeId: string;
  positionSeconds: number;
  durationSeconds: number | null;
  completed: boolean;
  updatedAt: number;
};

export type SaveEpisodePlaybackPositionInput = Omit<
  EpisodePlaybackPosition,
  'updatedAt'
>;

export type PlaybackQueueItem = {
  id: string;
  mediaType: PersistedMediaType;
  mediaId: string;
  title: string;
  subtitle: string | null;
  sourceUrl: string;
  artworkUrl: string | null;
  mimeType: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  addedAt: number;
};

export type SavePlaybackQueueItemInput = Omit<
  PlaybackQueueItem,
  'sortOrder' | 'addedAt'
>;

export type ListeningHistoryEntry = {
  id: number;
  mediaType: PersistedMediaType;
  mediaId: string;
  title: string;
  subtitle: string | null;
  startedAt: number;
  endedAt: number | null;
  listenedSeconds: number;
  completed: boolean;
};

export type StartListeningHistoryInput = Pick<
  ListeningHistoryEntry,
  'mediaType' | 'mediaId' | 'title' | 'subtitle' | 'startedAt'
>;

export type DailyListeningSummary = {
  day: string;
  listenedSeconds: number;
  sessionCount: number;
};
