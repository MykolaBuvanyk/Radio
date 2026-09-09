import type {
  PlaybackErrorKind,
  PlaybackProgressCheckpoint,
} from '../domain/playbackEvents';
import {getEpisodePlaybackPosition} from '../infrastructure/playbackPersistenceRepository';
import {
  getActiveMediaId,
  getActiveMediaSummary,
  getActiveMediaType,
  getPlaybackPhase,
  isPlaybackActive,
  recoverLivePlayback,
  registerTrackPlayerSession,
  seekPlayback,
} from '../infrastructure/trackPlayerAdapter';
import {
  registerRadioRetryCallbacks,
  reportRadioPlaybackError,
  reportRadioPlaybackState,
  setRadioRetryEnabled,
  stopRadioRetrySession,
} from '../infrastructure/radioRetryAdapter';
import {
  flushPendingPlaybackPositions,
  queueEpisodePlaybackPosition,
} from './playbackPositionWriter';
import {usePlayerStore} from '../store/playerStore';
import {touchEpisodeDownload} from '../../downloads/infrastructure/downloadRepository';
import {
  checkpointListeningHistory,
  recordListeningPaused,
  recordListeningStarted,
  recordListeningTransition,
} from './listeningHistoryService';

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
  checkpointListeningHistory(checkpoint.mediaId, isCompleted(checkpoint));

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
  registerRadioRetryCallbacks({
    onNetworkChanged: event => {
      if (
        event.networkType === 'none' &&
        getActiveMediaType() === 'radio' &&
        isPlaybackActive()
      ) {
        usePlayerStore
          .getState()
          .reportError('No internet connection. Waiting to reconnect…');
      }
    },
    onRetryExhausted: event => {
      if (getActiveMediaId() === event.stationId) {
        usePlayerStore
          .getState()
          .reportError('The station could not be reconnected. Tap play to retry.');
      }
    },
    onRetryRequested: request => {
      if (
        getActiveMediaId() !== request.stationId ||
        getActiveMediaType() !== 'radio'
      ) {
        return;
      }

      usePlayerStore
        .getState()
        .reportError(
          `Reconnecting… attempt ${request.attempt} of ${request.maxAttempts}.`,
        );
      recoverLivePlayback(
        request.reason === 'buffering-timeout' ||
          request.reason === 'network-restored',
      );
    },
  });

  registerTrackPlayerSession({
    onError: code => {
      usePlayerStore.getState().reportError(getPlaybackErrorMessage(code));

      const activeMediaId = getActiveMediaId();

      if (
        activeMediaId &&
        getActiveMediaType() === 'radio' &&
        (code === 'network' || code === 'unknown')
      ) {
        reportRadioPlaybackError(activeMediaId, code);
      }
    },
    onIsPlayingChanged: isPlaying => {
      if (isPlaying) {
        usePlayerStore.getState().clearError();
        recordListeningStarted(getActiveMediaSummary());
      } else {
        recordListeningPaused();
      }

      const activeMediaId = getActiveMediaId();

      if (activeMediaId && getActiveMediaType() === 'radio') {
        if (isPlaying) {
          setRadioRetryEnabled(activeMediaId, true);
          reportRadioPlaybackState(activeMediaId, 'playing');
        } else if (getPlaybackPhase() === 'ready') {
          setRadioRetryEnabled(activeMediaId, false);
        }
      }
    },
    onProgress: persistEpisodeProgress,
    onMediaTransition: async transition => {
      transitionGeneration += 1;
      const generation = transitionGeneration;

      activeEpisodeId =
        transition.mediaType === 'episode' ? transition.mediaId : null;
      recordListeningTransition(getActiveMediaSummary(), isPlaybackActive());

      if (activeEpisodeId) {
        stopRadioRetrySession();
        await touchEpisodeDownload(activeEpisodeId);
        await restoreEpisodePosition(activeEpisodeId, generation);
      }
    },
    onPlaybackStateChanged: phase => {
      const activeMediaId = getActiveMediaId();

      if (!activeMediaId || getActiveMediaType() !== 'radio') {
        return;
      }

      if (phase === 'buffering' || phase === 'ready') {
        reportRadioPlaybackState(activeMediaId, phase);
      }
    },
  });
}
