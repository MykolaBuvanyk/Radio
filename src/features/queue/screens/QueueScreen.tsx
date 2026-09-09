import DraggableFlatList, {
  type DragEndParams,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {ActivityIndicator, Text, View} from 'react-native';

import type {PlaybackQueueItem} from '../../player/domain/persistence';
import {usePlayerSnapshot} from '../../player/infrastructure/usePlayerSnapshot';
import {PlaybackQueueCard} from '../components/PlaybackQueueCard';
import {usePlaybackQueue} from '../hooks/usePlaybackQueue';
import {
  queueScreenNativeStyles,
  queueScreenStyles,
} from './QueueScreen.styles';

function getQueueItemKey(item: PlaybackQueueItem) {
  return item.id;
}

function QueueItemSeparator() {
  return <View className={queueScreenStyles.separator} />;
}

export function QueueScreen() {
  const queue = usePlaybackQueue();
  const player = usePlayerSnapshot();
  const handlePlay = (mediaId: string) => {
    queue.playItem(mediaId).catch(() => undefined);
  };
  const handleRemove = (itemId: string) => {
    queue.removeItem(itemId).catch(() => undefined);
  };
  const handleDragEnd = ({
    data,
    from,
    to,
  }: DragEndParams<PlaybackQueueItem>) => {
    queue.reorderItems(data, from, to).catch(() => undefined);
  };
  const renderQueueItem = ({
    drag,
    isActive,
    item,
  }: RenderItemParams<PlaybackQueueItem>) => (
    <PlaybackQueueCard
      drag={drag}
      isActive={isActive}
      isCurrent={player.mediaId === item.mediaId}
      isPlaying={player.isPlaying}
      isPending={queue.pendingMediaId === item.mediaId}
      item={item}
      onPlay={handlePlay}
      onRemove={handleRemove}
    />
  );
  const header = (
    <View className={queueScreenStyles.header}>
      <Text className={queueScreenStyles.eyebrow}>Up next</Text>
      <Text className={queueScreenStyles.title}>Queue</Text>
      <Text className={queueScreenStyles.description}>
        Episodes continue automatically in this order.
      </Text>
      <Text className={queueScreenStyles.hint}>
        Long-press a drag handle to rearrange the queue.
      </Text>
      {queue.errorMessage ? (
        <Text className={queueScreenStyles.error}>{queue.errorMessage}</Text>
      ) : null}
    </View>
  );
  const emptyContent = queue.isLoading ? (
    <View className={queueScreenStyles.centeredState}>
      <ActivityIndicator size="large" />
      <Text className={queueScreenStyles.stateTitle}>Loading queue</Text>
    </View>
  ) : (
    <View className={queueScreenStyles.centeredState}>
      <Text className={queueScreenStyles.stateTitle}>Your queue is empty</Text>
      <Text className={queueScreenStyles.stateDescription}>
        Add episodes from a podcast to listen continuously.
      </Text>
    </View>
  );

  return (
    <DraggableFlatList
      containerStyle={queueScreenNativeStyles.list}
      contentContainerStyle={queueScreenNativeStyles.listContent}
      data={queue.items}
      ItemSeparatorComponent={QueueItemSeparator}
      keyExtractor={getQueueItemKey}
      ListEmptyComponent={emptyContent}
      ListHeaderComponent={header}
      onDragEnd={handleDragEnd}
      renderItem={renderQueueItem}
      showsVerticalScrollIndicator={false}
    />
  );
}
