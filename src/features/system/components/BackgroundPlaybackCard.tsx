import {Pressable, Text, View} from 'react-native';

import {usePowerManagement} from '../hooks/usePowerManagement';
import {backgroundPlaybackCardStyles} from './BackgroundPlaybackCard.styles';

export function BackgroundPlaybackCard() {
  const {errorMessage, openSettings, requestExemption, status} =
    usePowerManagement();
  const isUnrestricted =
    !status.isSupported || status.isIgnoringBatteryOptimizations;
  const deviceLabel = [status.manufacturer, status.model]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={backgroundPlaybackCardStyles.container}>
      <Text className={backgroundPlaybackCardStyles.eyebrow}>
        Android power management
      </Text>
      <Text className={backgroundPlaybackCardStyles.title}>
        Background playback
      </Text>
      <Text className={backgroundPlaybackCardStyles.description}>
        Keep radio playing while the screen is locked or the app is in the
        background.
      </Text>

      <View className={backgroundPlaybackCardStyles.statusRow}>
        <Text className={backgroundPlaybackCardStyles.statusLabel}>
          Battery optimization
        </Text>
        <Text
          className={
            isUnrestricted
              ? backgroundPlaybackCardStyles.statusBadgeEnabled
              : backgroundPlaybackCardStyles.statusBadgeRestricted
          }>
          {isUnrestricted ? 'Unrestricted' : 'Optimized'}
        </Text>
      </View>

      {deviceLabel ? (
        <Text className={backgroundPlaybackCardStyles.device}>
          {deviceLabel} · Android {status.sdkVersion}
        </Text>
      ) : null}

      {status.hasAggressivePowerManagement ? (
        <Text className={backgroundPlaybackCardStyles.warning}>
          {status.manufacturer || 'This manufacturer'} may still stop
          background audio through its own battery manager. Check the device's
          app battery and auto-start settings if playback stops.
        </Text>
      ) : null}

      {errorMessage ? (
        <Text className={backgroundPlaybackCardStyles.error}>
          {errorMessage}
        </Text>
      ) : null}

      {!isUnrestricted && status.canRequestExemption ? (
        <Pressable
          accessibilityRole="button"
          className={backgroundPlaybackCardStyles.primaryButton}
          onPress={requestExemption}>
          <Text className={backgroundPlaybackCardStyles.primaryButtonText}>
            Allow unrestricted battery use
          </Text>
        </Pressable>
      ) : null}

      {status.isSupported ? (
        <Pressable
          accessibilityRole="button"
          className={backgroundPlaybackCardStyles.secondaryButton}
          onPress={openSettings}>
          <Text className={backgroundPlaybackCardStyles.secondaryButtonText}>
            Open battery settings
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
