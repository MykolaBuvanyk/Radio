import Ionicons from '@react-native-vector-icons/ionicons';
import {Pressable, Text, View} from 'react-native';

import type {RadioStation} from '../../radio/domain/radioStation';
import {favoriteStationCardStyles} from './FavoriteStationCard.styles';

type FavoriteStationCardProps = {
  isBusy: boolean;
  isPlaying: boolean;
  onPlay: (station: RadioStation) => void;
  onRemove: (station: RadioStation) => void;
  station: RadioStation;
};

export function FavoriteStationCard({
  isBusy,
  isPlaying,
  onPlay,
  onRemove,
  station,
}: FavoriteStationCardProps) {
  return (
    <View
      className={favoriteStationCardStyles.container}
      testID={`favorite-station-${station.id}`}>
      <View className={favoriteStationCardStyles.content}>
        <Text className={favoriteStationCardStyles.genre} numberOfLines={1}>
          {station.genre} · {station.country}
        </Text>
        <Text className={favoriteStationCardStyles.title} numberOfLines={2}>
          {station.name}
        </Text>
        <Text className={favoriteStationCardStyles.metadata} numberOfLines={1}>
          {[station.codec, station.bitrate ? `${station.bitrate} kbps` : null]
            .filter(Boolean)
            .join(' · ') || 'Live stream'}
        </Text>
      </View>
      <View className={favoriteStationCardStyles.actions}>
        <Pressable
          accessibilityLabel={`${isPlaying ? 'Resume' : 'Play'} ${station.name}`}
          accessibilityRole="button"
          className={favoriteStationCardStyles.playButton}
          onPress={() => onPlay(station)}
          testID={`favorite-play-${station.id}`}>
          <Ionicons color="#020617" name={isPlaying ? 'volume-high' : 'play'} size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Remove ${station.name} from favorites`}
          accessibilityRole="button"
          className={favoriteStationCardStyles.removeButton}
          disabled={isBusy}
          onPress={() => onRemove(station)}
          testID={`favorite-remove-${station.id}`}>
          <Ionicons color="#94a3b8" name="trash-outline" size={18} />
        </Pressable>
      </View>
    </View>
  );
}
