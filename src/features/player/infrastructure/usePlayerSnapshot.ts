import {
  useActiveMediaItem,
  useIsPlaying,
  usePlaybackState,
} from '@rntp/player';

import type {PlayerSnapshot} from '../domain/playerSnapshot';
import {mapPlaybackState} from './trackPlayerAdapter';

export function usePlayerSnapshot(): PlayerSnapshot {
  const activeMediaItem = useActiveMediaItem();
  const isPlaying = useIsPlaying();
  const playbackState = usePlaybackState();
  const mediaType = activeMediaItem?.extras?.mediaType;

  return {
    mediaId: activeMediaItem?.mediaId ?? null,
    mediaType:
      mediaType === 'episode' || mediaType === 'radio' ? mediaType : null,
    title: activeMediaItem?.title ?? null,
    subtitle: activeMediaItem?.artist ?? null,
    isPlaying,
    phase: mapPlaybackState(playbackState),
  };
}
