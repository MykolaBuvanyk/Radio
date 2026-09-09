import type {StaticScreenProps} from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import {PodcastEpisodeCard} from '../components/PodcastEpisodeCard';
import type {PodcastEpisode} from '../domain/podcastEpisode';
import {usePodcastEpisodes} from '../hooks/usePodcastEpisodes';
import {useEpisodeQueueActions} from '../../queue/hooks/useEpisodeQueueActions';
import {useEpisodeDownloadActions} from '../../downloads/hooks/useEpisodeDownloads';
import type {EpisodeDownload} from '../../downloads/domain/download';
import {
  podcastDetailsScreenNativeStyles,
  podcastDetailsScreenStyles,
} from './PodcastDetailsScreen.styles';

type PodcastDetailsScreenProps = StaticScreenProps<{
  podcastId: string;
}>;

function getEpisodeKey(episode: PodcastEpisode) {
  return episode.id;
}

function EpisodeSeparator() {
  return <View className={podcastDetailsScreenStyles.separator} />;
}

export function PodcastDetailsScreen({route}: PodcastDetailsScreenProps) {
  const podcast = usePodcastEpisodes(route.params.podcastId);
  const playbackQueue = useEpisodeQueueActions();
  const downloads = useEpisodeDownloadActions();
  const handleAddToQueue = (episode: PodcastEpisode) => {
    playbackQueue
      .addEpisode(episode, podcast.podcastTitle)
      .catch(() => undefined);
  };
  const handlePlay = (episode: PodcastEpisode) => {
    playbackQueue
      .playEpisode(episode, podcast.podcastTitle)
      .catch(() => undefined);
  };
  const handleDownloadAction = (
    episode: PodcastEpisode,
    download: EpisodeDownload | null,
  ) => {
    if (!download) {
      downloads.download(episode).catch(() => undefined);
    } else if (download.status === 'queued' || download.status === 'downloading') {
      downloads.pause(episode.id).catch(() => undefined);
    } else if (download.status === 'paused' || download.status === 'failed') {
      downloads.resume(episode.id).catch(() => undefined);
    }
  };
  const handleDelete = (episode: PodcastEpisode) => {
    Alert.alert(
      'Delete episode?',
      `This removes ${episode.title} from this device, including its queue item and downloaded file.`,
      [
        {style: 'cancel', text: 'Cancel'},
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            podcast.removeEpisode(episode.id).catch(() => undefined);
          },
        },
      ],
    );
  };
  const renderEpisode = ({item}: ListRenderItemInfo<PodcastEpisode>) => (
    <PodcastEpisodeCard
      download={downloads.downloadsByEpisodeId.get(item.id) ?? null}
      episode={item}
      isBusy={playbackQueue.pendingEpisodeId === item.id}
      isDeleteBusy={podcast.pendingDeletionId === item.id}
      isDownloadBusy={downloads.pendingEpisodeId === item.id}
      isQueued={playbackQueue.queuedEpisodeIds.has(item.id)}
      onAddToQueue={handleAddToQueue}
      onDownloadAction={handleDownloadAction}
      onDelete={handleDelete}
      onPlay={handlePlay}
    />
  );
  const header = (
    <View className={podcastDetailsScreenStyles.header}>
      <Text className={podcastDetailsScreenStyles.eyebrow}>
        Podcast episodes
      </Text>
      <Text className={podcastDetailsScreenStyles.title}>
        {podcast.podcastTitle}
      </Text>
      <Text className={podcastDetailsScreenStyles.description}>
        Pull down to refresh this feed. Episodes are stored locally and loaded
        in pages.
      </Text>
      {podcast.errorMessage ? (
        <Text className={podcastDetailsScreenStyles.error}>
          {podcast.errorMessage}
        </Text>
      ) : null}
      {playbackQueue.errorMessage ? (
        <Text className={podcastDetailsScreenStyles.error}>
          {playbackQueue.errorMessage}
        </Text>
      ) : null}
      {downloads.errorMessage ? (
        <Text className={podcastDetailsScreenStyles.error}>
          {downloads.errorMessage}
        </Text>
      ) : null}
    </View>
  );
  const emptyContent = podcast.isLoading ? (
    <View className={podcastDetailsScreenStyles.centeredState}>
      <ActivityIndicator size="large" />
      <Text className={podcastDetailsScreenStyles.stateTitle}>
        Loading episodes
      </Text>
    </View>
  ) : (
    <View className={podcastDetailsScreenStyles.centeredState}>
      <Text className={podcastDetailsScreenStyles.stateTitle}>
        No playable episodes
      </Text>
      <Text className={podcastDetailsScreenStyles.stateDescription}>
        Refresh the feed or check that its episodes include valid audio files.
      </Text>
    </View>
  );

  return (
    <FlatList
      className={podcastDetailsScreenStyles.container}
      contentContainerStyle={podcastDetailsScreenNativeStyles.listContent}
      data={podcast.episodes}
      ItemSeparatorComponent={EpisodeSeparator}
      keyExtractor={getEpisodeKey}
      ListEmptyComponent={emptyContent}
      ListHeaderComponent={header}
      onEndReached={podcast.loadMore}
      onEndReachedThreshold={0.5}
      onRefresh={podcast.refresh}
      refreshing={podcast.isRefreshing}
      renderItem={renderEpisode}
      showsVerticalScrollIndicator={false}
      testID="screen-podcast-details"
    />
  );
}
