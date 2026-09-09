import {Pressable, Text, View} from 'react-native';

import type {PlayerPhase} from '../domain/playerSnapshot';
import {usePlayerSnapshot} from '../infrastructure/usePlayerSnapshot';
import {togglePlayback} from '../services/playerService';
import {usePlayerStore} from '../store/playerStore';
import {miniPlayerStyles} from './MiniPlayer.styles';

function getStatusLabel(
  isPlaying: boolean,
  mediaType: 'episode' | 'radio' | null,
  phase: PlayerPhase,
) {
  if (phase === 'buffering') {
    return 'Buffering';
  }

  if (phase === 'error') {
    return 'Playback error';
  }

  if (!isPlaying) {
    return 'Paused';
  }

  return mediaType === 'radio' ? 'Live' : 'Playing';
}

export function MiniPlayer() {
  const player = usePlayerSnapshot();
  const reportError = usePlayerStore(state => state.reportError);

  if (player.mediaId === null) {
    return null;
  }

  const handlePlaybackToggle = () => {
    try {
      togglePlayback();
    } catch {
      reportError('Playback could not be updated. Please try again.');
    }
  };

  return (
    <View className={miniPlayerStyles.container}>
      <View className={miniPlayerStyles.metadata}>
        <Text className={miniPlayerStyles.status}>
          {getStatusLabel(
            player.isPlaying,
            player.mediaType,
            player.phase,
          )}
        </Text>
        <Text className={miniPlayerStyles.title} numberOfLines={1}>
          {player.title ?? 'Unknown audio'}
        </Text>
        {player.subtitle ? (
          <Text className={miniPlayerStyles.subtitle} numberOfLines={1}>
            {player.subtitle}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={player.isPlaying ? 'Pause playback' : 'Play audio'}
        className={miniPlayerStyles.button}
        onPress={handlePlaybackToggle}>
        <Text className={miniPlayerStyles.buttonText}>
          {player.isPlaying ? 'Pause' : 'Play'}
        </Text>
      </Pressable>
    </View>
  );
}
