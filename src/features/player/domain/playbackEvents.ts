import type {PersistedMediaType} from './persistence';
import type {PlayerPhase} from './playerSnapshot';

export type PlaybackErrorKind =
  | 'network'
  | 'source'
  | 'renderer'
  | 'play-not-permitted'
  | 'unknown';

export type PlaybackMediaTransition = {
  index: number;
  mediaId: string | null;
  mediaType: PersistedMediaType | null;
};

export type PlaybackProgressCheckpoint = {
  durationSeconds: number | null;
  mediaId: string;
  mediaType: PersistedMediaType | null;
  positionSeconds: number;
};

export type PlaybackSessionCallbacks = {
  onError: (error: PlaybackErrorKind) => void;
  onIsPlayingChanged: (isPlaying: boolean) => void;
  onMediaTransition: (
    transition: PlaybackMediaTransition,
  ) => void | Promise<void>;
  onProgress: (
    checkpoint: PlaybackProgressCheckpoint,
  ) => void | Promise<void>;
  onPlaybackStateChanged: (phase: PlayerPhase) => void;
};
