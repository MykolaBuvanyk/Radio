import type {
  PlaybackErrorKind,
  PlaybackProgressCheckpoint,
} from '../domain/playbackEvents';
import {getEpisodePlaybackPosition} from '../infrastructure/playbackPersistenceRepository';
import {
  registerTrackPlayerSession,
  seekPlayback,
} from '../infrastructure/trackPlayerAdapter';
import {
  flushPendingPlaybackPositions,
  queueEpisodePlaybackPosition,
} from './playbackPositionWriter';
import {usePlayerStore} from '../store/playerStore';
import {touchEpisodeDownload} from '../../downloads/infrastructure/downloadRepository';

const latestEpisodeProgress = new Map<
  string,
  PlaybackProgressCheckpoint
>();

let activeEpisodeId: string | null = null;
let transitionGeneration = 0;

function getPlaybackErrorMessage(code: PlaybackErrorKind) {
  switch (code) {
    case 'network':
      return 'The connection to the station was interrupted.';
    case 'source':
      return 'This audio source is currently unavailable.';
    case 'renderer':
      return 'This audio format could not be played.';
    case 'play-not-permitted':
      return 'Tap play to start listening.';
    case 'unknown':
    default:
      return 'Playback stopped because of an unexpected error.';
  }
}

function isCompleted(checkpoint: PlaybackProgressCheckpoint) {
  const duration = checkpoint.durationSeconds;

  if (duration === null || duration <= 0) {
    return false;
  }

  return (
    checkpoint.positionSeconds / duration >= 0.98 ||
    duration - checkpoint.positionSeconds <= 15
  );
}

async function persistEpisodeProgress(
  checkpoint: PlaybackProgressCheckpoint,
) {
  if (checkpoint.mediaType !== 'episode') {
    return;
  }

  latestEpisodeProgress.set(checkpoint.mediaId, checkpoint);
  queueEpisodePlaybackPosition({
    completed: isCompleted(checkpoint),
    durationSeconds: checkpoint.durationSeconds,
    episodeId: checkpoint.mediaId,
    positionSeconds: checkpoint.positionSeconds,
  });
  await flushPendingPlaybackPositions();
}

async function restoreEpisodePosition(episodeId: string, generation: number) {
  const inMemoryCheckpoint = latestEpisodeProgress.get(episodeId);
  const savedPosition = inMemoryCheckpoint
    ? {
        completed: isCompleted(inMemoryCheckpoint),
        positionSeconds: inMemoryCheckpoint.positionSeconds,
      }
    : await getEpisodePlaybackPosition(episodeId);

  if (
    generation !== transitionGeneration ||
    activeEpisodeId !== episodeId ||
    !savedPosition ||
    savedPosition.completed ||
    savedPosition.positionSeconds < 5
  ) {
    return;
  }

  seekPlayback(Math.max(0, savedPosition.positionSeconds - 5));
}

export function registerApplicationPlaybackSession() {
  registerTrackPlayerSession({
    onError: code => {
      usePlayerStore.getState().reportError(getPlaybackErrorMessage(code));
    },
    onIsPlayingChanged: isPlaying => {
      if (isPlaying) {
        usePlayerStore.getState().clearError();
      }
    },
    onProgress: persistEpisodeProgress,
    onMediaTransition: async transition => {
      transitionGeneration += 1;
      const generation = transitionGeneration;

      activeEpisodeId =
        transition.mediaType === 'episode' ? transition.mediaId : null;

      if (activeEpisodeId) {
        await touchEpisodeDownload(activeEpisodeId);
        await restoreEpisodePosition(activeEpisodeId, generation);
      }
    },
  });
}
