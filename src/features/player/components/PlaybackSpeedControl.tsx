import {useState} from 'react';
import {Modal, Pressable, Text, View} from 'react-native';

import {
  playbackSpeedOptions,
  type PlaybackSpeed,
} from '../domain/playbackSpeed';
import {
  getPreferredEpisodePlaybackSpeed,
  setEpisodePlaybackSpeed,
} from '../services/playbackSpeedService';
import {usePlayerStore} from '../store/playerStore';
import {
  getPlaybackSpeedOptionClassName,
  getPlaybackSpeedOptionTextClassName,
  playbackSpeedControlStyles,
} from './PlaybackSpeedControl.styles';

function formatPlaybackSpeed(speed: PlaybackSpeed) {
  return `${speed}x`;
}

export function PlaybackSpeedControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [speed, setSpeed] = useState(getPreferredEpisodePlaybackSpeed);
  const reportError = usePlayerStore(state => state.reportError);

  const handleSpeedChange = (nextSpeed: PlaybackSpeed) => {
    try {
      setEpisodePlaybackSpeed(nextSpeed);
      setSpeed(nextSpeed);
      setIsOpen(false);
    } catch {
      reportError('Playback speed could not be changed.');
    }
  };

  return (
    <>
      <Pressable
        accessibilityLabel={`Playback speed ${formatPlaybackSpeed(speed)}`}
        accessibilityRole="button"
        className={playbackSpeedControlStyles.trigger}
        onPress={() => setIsOpen(true)}
        testID="playback-speed-trigger">
        <Text className={playbackSpeedControlStyles.triggerText}>
          {formatPlaybackSpeed(speed)}
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
        transparent
        visible={isOpen}>
        <View className={playbackSpeedControlStyles.modalContainer}>
          <Pressable
            accessibilityLabel="Close playback speed"
            accessibilityRole="button"
            className={playbackSpeedControlStyles.modalBackdrop}
            onPress={() => setIsOpen(false)}
          />
          <View
            className={playbackSpeedControlStyles.modalCard}
            testID="playback-speed-modal">
            <Text className={playbackSpeedControlStyles.eyebrow}>Podcast</Text>
            <Text className={playbackSpeedControlStyles.title}>
              Playback speed
            </Text>
            <Text className={playbackSpeedControlStyles.description}>
              Choose how quickly podcast episodes should play.
            </Text>

            <View className={playbackSpeedControlStyles.options}>
              {playbackSpeedOptions.map(option => {
                const isSelected = option === speed;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{selected: isSelected}}
                    className={getPlaybackSpeedOptionClassName(isSelected)}
                    key={option}
                    onPress={() => handleSpeedChange(option)}
                    testID={`playback-speed-${String(option).replace('.', '_')}`}>
                    <Text
                      className={getPlaybackSpeedOptionTextClassName(
                        isSelected,
                      )}>
                      {formatPlaybackSpeed(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              className={playbackSpeedControlStyles.close}
              onPress={() => setIsOpen(false)}>
              <Text className={playbackSpeedControlStyles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
