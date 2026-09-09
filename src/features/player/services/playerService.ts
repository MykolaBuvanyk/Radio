import type {LiveAudioItem} from '../domain/liveAudioItem';
import {
  getActiveMediaId,
  getActiveMediaType,
  initializeTrackPlayer,
  isPlaybackActive,
  pausePlayback,
  replaceQueueWithMediaItem,
  replaceQueueWithMediaItems,
  skipToNextPlaybackItem,
  skipToPreviousPlaybackItem,
  startPlayback,
} from '../infrastructure/trackPlayerAdapter';
import type {RadioStation} from '../../radio/domain/radioStation';
import {
  setRadioRetryEnabled,
  startRadioRetrySession,
} from '../infrastructure/radioRetryAdapter';
import {resetLiveRadioPlaybackSpeed} from './playbackSpeedService';

export function initializePlayer() {
  initializeTrackPlayer();
}

function toRadioMediaItem(item: RadioStation) {
  return {
    mediaId: item.id,
    url: item.streamUrl,
    title: item.name,
    artist: `${item.genre} · ${item.country}`,
    isLive: true,
    extras: {mediaType: 'radio' as const},
    ...(item.mimeType === null ? {} : {mimeType: item.mimeType}),
  };
}

export function playLiveAudio(
  item: LiveAudioItem,
  context: readonly RadioStation[] = [],
) {
  resetLiveRadioPlaybackSpeed();

  if (getActiveMediaId() !== item.id) {
    const mediaItem = {
      mediaId: item.id,
      url: item.streamUrl,
      title: item.title,
      artist: item.subtitle,
      isLive: true,
      extras: {
        mediaType: 'radio',
      },
      ...(item.mimeType === null ? {} : {mimeType: item.mimeType}),
    };

    if (context.length > 0) {
      replaceQueueWithMediaItems(
        context.map(toRadioMediaItem),
        item.id,
      );
    } else {
      replaceQueueWithMediaItem(mediaItem);
    }
    startRadioRetrySession(item.id);
  } else {
    setRadioRetryEnabled(item.id, true);
  }

  startPlayback();
}

export function togglePlayback() {
  const activeMediaId = getActiveMediaId();
  const isLiveRadio = getActiveMediaType() === 'radio';

  if (isPlaybackActive()) {
    if (isLiveRadio && activeMediaId) {
      setRadioRetryEnabled(activeMediaId, false);
    }
    pausePlayback();
    return;
  }

  if (isLiveRadio && activeMediaId) {
    setRadioRetryEnabled(activeMediaId, true);
  }
  startPlayback();
}

export function skipToNext() {
  skipToNextPlaybackItem();
}

export function skipToPrevious() {
  skipToPreviousPlaybackItem();
}
