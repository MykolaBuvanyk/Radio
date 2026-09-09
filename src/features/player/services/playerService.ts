import type {LiveAudioItem} from '../domain/liveAudioItem';
import {
  getActiveMediaId,
  getActiveMediaType,
  initializeTrackPlayer,
  isPlaybackActive,
  pausePlayback,
  replaceQueueWithMediaItem,
  startPlayback,
} from '../infrastructure/trackPlayerAdapter';
import {
  setRadioRetryEnabled,
  startRadioRetrySession,
} from '../infrastructure/radioRetryAdapter';
import {resetLiveRadioPlaybackSpeed} from './playbackSpeedService';

export function initializePlayer() {
  initializeTrackPlayer();
}

export function playLiveAudio(item: LiveAudioItem) {
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

    replaceQueueWithMediaItem(mediaItem);
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
