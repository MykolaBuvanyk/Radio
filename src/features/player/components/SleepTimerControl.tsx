import {useState} from 'react';
import {Modal, Pressable, Text, View} from 'react-native';

import {
  sleepTimerDurationOptions,
  type SleepTimerDurationMinutes,
} from '../domain/sleepTimer';
import {useSleepTimer} from '../infrastructure/useSleepTimer';
import {usePlayerStore} from '../store/playerStore';
import {
  getSleepTimerTriggerClassName,
  getSleepTimerTriggerTextClassName,
  sleepTimerControlStyles,
} from './SleepTimerControl.styles';

function formatRemainingTime(remainingSeconds: number | null) {
  if (remainingSeconds === null) {
    return 'Sleep timer';
  }

  if (remainingSeconds < 60) {
    return 'Sleep <1 min';
  }

  return `Sleep ${Math.ceil(remainingSeconds / 60)} min`;
}

export function SleepTimerControl() {
  const [isOpen, setIsOpen] = useState(false);
  const timer = useSleepTimer();
  const reportError = usePlayerStore(state => state.reportError);
  const isActive = timer.remainingSeconds !== null;

  const handleStart = (minutes: SleepTimerDurationMinutes) => {
    try {
      timer.start(minutes);
      setIsOpen(false);
    } catch {
      reportError('The sleep timer could not be started.');
    }
  };

  const handleCancel = () => {
    try {
      timer.cancel();
      setIsOpen(false);
    } catch {
      reportError('The sleep timer could not be cancelled.');
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={formatRemainingTime(timer.remainingSeconds)}
        className={getSleepTimerTriggerClassName(isActive)}
        onPress={() => setIsOpen(true)}
        testID="sleep-timer-trigger">
        <Text className={getSleepTimerTriggerTextClassName(isActive)}>
          {formatRemainingTime(timer.remainingSeconds)}
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
        transparent
        visible={isOpen}>
        <View className={sleepTimerControlStyles.modalContainer}>
          <Pressable
            accessibilityLabel="Close sleep timer"
            accessibilityRole="button"
            className={sleepTimerControlStyles.modalBackdrop}
            onPress={() => setIsOpen(false)}
          />
          <View
            className={sleepTimerControlStyles.modalCard}
            testID="sleep-timer-modal">
            <Text className={sleepTimerControlStyles.eyebrow}>Playback</Text>
            <Text className={sleepTimerControlStyles.title}>Sleep timer</Text>
            <Text className={sleepTimerControlStyles.description}>
              Choose when playback should stop. Audio fades out during the final
              15 seconds.
            </Text>

            <View className={sleepTimerControlStyles.options}>
              {sleepTimerDurationOptions.map(minutes => (
                <Pressable
                  accessibilityRole="button"
                  className={sleepTimerControlStyles.option}
                  key={minutes}
                  onPress={() => handleStart(minutes)}
                  testID={`sleep-timer-${minutes}`}>
                  <Text className={sleepTimerControlStyles.optionText}>
                    {minutes} min
                  </Text>
                </Pressable>
              ))}
            </View>

            {isActive ? (
              <Pressable
                accessibilityRole="button"
                className={sleepTimerControlStyles.cancel}
                onPress={handleCancel}>
                <Text className={sleepTimerControlStyles.cancelText}>
                  Cancel timer
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              className={sleepTimerControlStyles.close}
              onPress={() => setIsOpen(false)}>
              <Text className={sleepTimerControlStyles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
