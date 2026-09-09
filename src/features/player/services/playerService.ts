import type {LiveAudioItem} from '../domain/liveAudioItem';
import {
  getActiveMediaId,
  initializeTrackPlayer,
  isPlaybackActive,
  pausePlayback,
  replaceQueueWithMediaItem,
  startPlayback,
} from '../infrastructure/trackPlayerAdapter';

export function initializePlayer() {
  initializeTrackPlayer();
}

export function playLiveAudio(item: LiveAudioItem) {
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
  }

  startPlayback();
}

export function togglePlayback() {
  if (isPlaybackActive()) {
    pausePlayback();
    return;
  }

  startPlayback();
}
