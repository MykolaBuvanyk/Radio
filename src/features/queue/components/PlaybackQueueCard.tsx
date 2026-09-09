import {Pressable, Text, View} from 'react-native';

import type {PlaybackQueueItem} from '../../player/domain/persistence';
import {playbackQueueCardStyles} from './PlaybackQueueCard.styles';

type PlaybackQueueCardProps = {
  drag: () => void;
  isActive: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  isPending: boolean;
  item: PlaybackQueueItem;
  onPlay: (mediaId: string) => void;
  onRemove: (itemId: string) => void;
};

function getPlaybackButtonLabel(
  isCurrent: boolean,
  isPending: boolean,
  isPlaying: boolean,
) {
  if (isPending) {
    return 'Loading…';
  }

  if (!isCurrent) {
    return 'Play';
  }

  return isPlaying ? 'Pause' : 'Resume';
}

export function PlaybackQueueCard({
  drag,
  isActive,
  isCurrent,
  isPlaying,
  isPending,
  item,
  onPlay,
  onRemove,
}: PlaybackQueueCardProps) {
  return (
    <View
      className={
        isCurrent
          ? playbackQueueCardStyles.activeContainer
          : playbackQueueCardStyles.container
      }>
      <View className={playbackQueueCardStyles.topRow}>
        <View className={playbackQueueCardStyles.metadata}>
          <Text className={playbackQueueCardStyles.eyebrow}>
            {isCurrent ? 'Now playing' : 'Podcast episode'}
          </Text>
          <Text className={playbackQueueCardStyles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text
              className={playbackQueueCardStyles.subtitle}
              numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reorder ${item.title}`}
          className={
            isActive
              ? playbackQueueCardStyles.dragHandleActive
              : playbackQueueCardStyles.dragHandle
          }
          onLongPress={drag}>
          <Text className={playbackQueueCardStyles.dragHandleText}>
            Hold to drag
          </Text>
        </Pressable>
      </View>
      <View className={playbackQueueCardStyles.actions}>
        <Pressable
          accessibilityRole="button"
          className={playbackQueueCardStyles.playButton}
          disabled={isPending}
          onPress={() => onPlay(item.mediaId)}>
          <Text className={playbackQueueCardStyles.playButtonText}>
            {getPlaybackButtonLabel(isCurrent, isPending, isPlaying)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.title} from queue`}
          className={playbackQueueCardStyles.removeButton}
          onPress={() => onRemove(item.id)}>
          <Text className={playbackQueueCardStyles.removeButtonText}>
            Remove
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
