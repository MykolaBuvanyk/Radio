import {Pressable, Text, View} from 'react-native';
import {Ionicons} from '@react-native-vector-icons/ionicons';

import type {PlayerPhase} from '../../player/domain/playerSnapshot';
import {appColors} from '../../../shared/theme/appTheme';
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
  isFavorite: boolean;
  isFavoriteBusy: boolean;
  onPress: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
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
  isFavorite,
  isFavoriteBusy,
  onPress,
  onToggleFavorite,
}: RadioStationCardProps) {
  const statusLabel = getStatusLabel(isActive, isPlaying, playerPhase);
  const actionLabel = isActive && isPlaying ? 'Pause' : 'Play';

  return (
    <View
      className={getRadioStationCardClassName(isActive, isDisabled)}
      testID={`radio-station-${station.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} ${station.name}`}
        className={radioStationCardStyles.cardPressable}
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
        </View>

        <Text className={radioStationCardStyles.technical}>
          {getTechnicalDetails(station)}
        </Text>
        {statusLabel ? (
          <Text className={radioStationCardStyles.status}>{statusLabel}</Text>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} ${station.name}`}
        className={radioStationCardStyles.action}
        disabled={isDisabled}
        hitSlop={8}
        onPress={() => onPress(station)}
        testID={`radio-play-${station.id}`}>
        <Text className={radioStationCardStyles.actionText}>{actionLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${station.name} ${
          isFavorite ? 'from' : 'to'
        } favorites`}
        className={radioStationCardStyles.favoriteAction}
        disabled={isFavoriteBusy}
        hitSlop={8}
        onPress={() => onToggleFavorite(station)}
        testID={`radio-favorite-${station.id}`}>
        <Ionicons
          color={isFavorite ? appColors.primary : appColors.textMuted}
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={21}
        />
      </Pressable>
    </View>
  );
}
