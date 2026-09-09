import {Pressable, Text, View} from 'react-native';

import type {PlayerPhase} from '../domain/playerSnapshot';
import {usePlayerSnapshot} from '../infrastructure/usePlayerSnapshot';
import {
  skipToNext,
  skipToPrevious,
  togglePlayback,
} from '../services/playerService';
import {usePlayerStore} from '../store/playerStore';
import {miniPlayerStyles} from './MiniPlayer.styles';
import {PlaybackSpeedControl} from './PlaybackSpeedControl';
import {SleepTimerControl} from './SleepTimerControl';

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

  const handlePrevious = () => {
    try {
      skipToPrevious();
    } catch {
      reportError('Previous playback item could not be selected.');
    }
  };

  const handleNext = () => {
    try {
      skipToNext();
    } catch {
      reportError('Next playback item could not be selected.');
    }
  };

  return (
    <View className={miniPlayerStyles.container} testID="mini-player">
      <View className={miniPlayerStyles.mainRow}>
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

        <View className={miniPlayerStyles.playbackButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous playback item"
            className={miniPlayerStyles.secondaryButton}
            onPress={handlePrevious}
            testID="mini-player-previous">
            <Text className={miniPlayerStyles.secondaryButtonText}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={player.isPlaying ? 'Pause playback' : 'Play audio'}
            className={miniPlayerStyles.button}
            onPress={handlePlaybackToggle}
            testID="mini-player-toggle">
            <Text className={miniPlayerStyles.buttonText}>
              {player.isPlaying ? 'Pause' : 'Play'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next playback item"
            className={miniPlayerStyles.secondaryButton}
            onPress={handleNext}
            testID="mini-player-next">
            <Text className={miniPlayerStyles.secondaryButtonText}>›</Text>
          </Pressable>
        </View>
      </View>
      <View className={miniPlayerStyles.controlsRow}>
        <SleepTimerControl />
        {player.mediaType === 'episode' ? <PlaybackSpeedControl /> : null}
      </View>
    </View>
  );
}
