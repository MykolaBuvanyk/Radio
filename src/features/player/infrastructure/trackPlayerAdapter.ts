import TrackPlayer, {
  Event,
  PlaybackState,
  PlayerCommand,
  type MediaItem,
} from '@rntp/player';

import type {PlaybackSessionCallbacks} from '../domain/playbackEvents';
import type {
  EpisodePlaybackPosition,
  PersistedMediaType,
  PlaybackQueueItem,
} from '../domain/persistence';
import type {PlayerPhase} from '../domain/playerSnapshot';

let isInitialized = false;

export function initializeTrackPlayer() {
  if (isInitialized) {
    return;
  }

  TrackPlayer.setupPlayer({
    contentType: 'music',
    handleAudioBecomingNoisy: true,
    autoUpdateMetadataFromStream: true,
    audioMixing: 'exclusive',
    liveResumeBehavior: 'live-edge',
    progressSync: {
      intervalSeconds: 10,
    },
    android: {
      wakeMode: 'network',
      taskRemovedBehavior: 'continue',
      notification: {
        channelId: 'radio_playback',
        channelName: 'Radio playback',
        smallIcon: 'ic_stat_radio',
      },
    },
  });

  TrackPlayer.setCommands({
    capabilities: [
      PlayerCommand.PlayPause,
      PlayerCommand.SkipBackward,
      PlayerCommand.SkipForward,
      PlayerCommand.Next,
      PlayerCommand.Previous,
      PlayerCommand.Stop,
    ],
    handling: 'native',
    backwardInterval: 30,
    forwardInterval: 30,
  });

  isInitialized = true;
}

export function replaceQueueWithMediaItem(mediaItem: MediaItem) {
  TrackPlayer.setMediaItem(mediaItem);
}

function readMediaType(mediaItem: MediaItem | null): PersistedMediaType | null {
  const mediaType = mediaItem?.extras?.mediaType;

  return mediaType === 'episode' || mediaType === 'radio'
    ? mediaType
    : null;
}

function normalizeDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function toTrackPlayerMediaItem(item: PlaybackQueueItem): MediaItem {
  return {
    mediaId: item.mediaId,
    url: item.sourceUrl,
    title: item.title,
    artist: item.subtitle ?? undefined,
    artworkUrl: item.artworkUrl ?? undefined,
    duration: item.durationSeconds ?? undefined,
    mimeType: item.mimeType ?? undefined,
    extras: {
      mediaType: item.mediaType,
      queueItemId: item.id,
    },
  };
}

export function activatePlaybackQueue(
  items: readonly PlaybackQueueItem[],
  activeMediaId: string,
  positions: readonly EpisodePlaybackPosition[],
) {
  const activeIndex = items.findIndex(item => item.mediaId === activeMediaId);

  if (activeIndex < 0) {
    throw new Error('The selected episode is not in the playback queue.');
  }

  TrackPlayer.setMediaItems(items.map(toTrackPlayerMediaItem), activeIndex);
  const savedPosition = positions.find(
    position => position.episodeId === activeMediaId,
  );

  if (savedPosition && !savedPosition.completed) {
    TrackPlayer.seekTo(Math.max(0, savedPosition.positionSeconds - 5));
  }
}

export function appendTrackPlayerQueueItem(item: PlaybackQueueItem) {
  TrackPlayer.addMediaItem(toTrackPlayerMediaItem(item));
}

export function moveTrackPlayerQueueItem(fromIndex: number, toIndex: number) {
  TrackPlayer.moveMediaItem(fromIndex, toIndex);
}

export function removeTrackPlayerQueueItem(index: number) {
  TrackPlayer.removeMediaItem(index);
}

export function replaceTrackPlayerQueueItem(
  index: number,
  item: PlaybackQueueItem,
) {
  TrackPlayer.replaceMediaItem(index, toTrackPlayerMediaItem(item));
}

export function seekPlayback(positionSeconds: number) {
  TrackPlayer.seekTo(Math.max(0, positionSeconds));
}

export function isEpisodePlaybackQueueActive() {
  return readMediaType(TrackPlayer.getActiveMediaItem()) === 'episode';
}

export function registerTrackPlayerSession(
  callbacks: PlaybackSessionCallbacks,
) {
  TrackPlayer.registerPlaybackSession(() => {
    TrackPlayer.addEventListener(Event.PlaybackError, event => {
      callbacks.onError(event.code);
    });

    TrackPlayer.addEventListener(Event.IsPlayingChanged, event => {
      callbacks.onIsPlayingChanged(event.playing);
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, event => {
      const mediaItem = TrackPlayer.getActiveMediaItem();
      const positionSeconds =
        Number.isFinite(event.position) && event.position >= 0
          ? event.position
          : 0;

      return callbacks.onProgress({
        durationSeconds: normalizeDuration(event.duration),
        mediaId: event.mediaId,
        mediaType:
          mediaItem?.mediaId === event.mediaId
            ? readMediaType(mediaItem)
            : null,
        positionSeconds,
      });
    });

    TrackPlayer.addEventListener(Event.MediaItemTransition, event =>
      callbacks.onMediaTransition({
        index: event.index,
        mediaId: event.item?.mediaId ?? null,
        mediaType: readMediaType(event.item),
      }),
    );
  });
}

export function startPlayback() {
  TrackPlayer.play();
}

export function pausePlayback() {
  TrackPlayer.pause();
}

export function isPlaybackActive() {
  return TrackPlayer.isPlaying();
}

export function getActiveMediaId() {
  return TrackPlayer.getActiveMediaItem()?.mediaId ?? null;
}

export function mapPlaybackState(state: PlaybackState): PlayerPhase {
  switch (state) {
    case PlaybackState.Ready:
      return 'ready';
    case PlaybackState.Buffering:
      return 'buffering';
    case PlaybackState.Ended:
      return 'ended';
    case PlaybackState.Error:
      return 'error';
    case PlaybackState.Idle:
    default:
      return 'idle';
  }
}
