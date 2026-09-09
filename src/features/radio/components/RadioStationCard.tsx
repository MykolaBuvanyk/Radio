import {Pressable, Text, View} from 'react-native';

import type {PlayerPhase} from '../../player/domain/playerSnapshot';
import type {RadioStation} from '../domain/radioStation';
import {
  getRadioStationCardClassName,
  radioStationCardStyles,
} from './RadioStationCard.styles';

type RadioStationCardProps = {
  station: RadioStation;
  isActive: boolean;
  isPlaying: boolean;
  playerPhase: PlayerPhase;
  isDisabled: boolean;
  onPress: (station: RadioStation) => void;
};

function getTechnicalDetails(station: RadioStation) {
  const details = [station.codec, station.bitrate && `${station.bitrate} kbps`]
    .filter(Boolean)
    .join(' · ');

  return details || 'Live stream';
}

function getStatusLabel(
  isActive: boolean,
  isPlaying: boolean,
  playerPhase: PlayerPhase,
) {
  if (!isActive) {
    return null;
  }

  if (playerPhase === 'buffering') {
    return 'Connecting...';
  }

  if (playerPhase === 'error') {
    return 'Stream unavailable';
  }

  return isPlaying ? 'Playing live' : 'Paused';
}

export function RadioStationCard({
  station,
  isActive,
  isPlaying,
  playerPhase,
  isDisabled,
  onPress,
}: RadioStationCardProps) {
  const statusLabel = getStatusLabel(isActive, isPlaying, playerPhase);
  const actionLabel = isActive && isPlaying ? 'Pause' : 'Play';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${actionLabel} ${station.name}`}
      className={getRadioStationCardClassName(isActive, isDisabled)}
      disabled={isDisabled}
      onPress={() => onPress(station)}>
      <View className={radioStationCardStyles.header}>
        <View className={radioStationCardStyles.metadata}>
          <Text className={radioStationCardStyles.name} numberOfLines={2}>
            {station.name}
          </Text>
          <Text className={radioStationCardStyles.location} numberOfLines={1}>
            {station.genre} · {station.country}
          </Text>
        </View>

        <View className={radioStationCardStyles.action}>
          <Text className={radioStationCardStyles.actionText}>
            {actionLabel}
          </Text>
        </View>
      </View>

      <Text className={radioStationCardStyles.technical}>
        {getTechnicalDetails(station)}
      </Text>
      {statusLabel ? (
        <Text className={radioStationCardStyles.status}>{statusLabel}</Text>
      ) : null}
    </Pressable>
  );
}
