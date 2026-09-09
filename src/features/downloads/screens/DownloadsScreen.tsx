import {useCallback} from 'react';
import {FlatList, Pressable, Text, View, type ListRenderItemInfo} from 'react-native';

import {DownloadCard} from '../components/DownloadCard';
import type {EpisodeDownloadListItem} from '../domain/download';
import {useDownloadLibrary} from '../hooks/useEpisodeDownloads';
import {
  downloadsScreenNativeStyles,
  downloadsScreenStyles,
} from './DownloadsScreen.styles';

const CACHE_LIMIT_OPTIONS = [250, 500, 1024] as const;

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getDownloadKey(item: EpisodeDownloadListItem) {
  return item.episodeId;
}

function DownloadSeparator() {
  return <View className={downloadsScreenStyles.separator} />;
}

export function DownloadsScreen() {
  const downloads = useDownloadLibrary();
  const pauseDownload = downloads.pause;
  const removeDownload = downloads.remove;
  const resumeDownload = downloads.resume;
  const updateLimit = downloads.updateLimit;
  const handlePause = useCallback(
    (episodeId: string) => {
      pauseDownload(episodeId).catch(() => undefined);
    },
    [pauseDownload],
  );
  const handleRemove = useCallback(
    (episodeId: string) => {
      removeDownload(episodeId).catch(() => undefined);
    },
    [removeDownload],
  );
  const handleResume = useCallback(
    (episodeId: string) => {
      resumeDownload(episodeId).catch(() => undefined);
    },
    [resumeDownload],
  );
  const renderDownload = useCallback(
    ({item}: ListRenderItemInfo<EpisodeDownloadListItem>) => (
      <DownloadCard
        isPending={downloads.pendingEpisodeId === item.episodeId}
        item={item}
        onPause={handlePause}
        onRemove={handleRemove}
        onResume={handleResume}
      />
    ),
    [downloads.pendingEpisodeId, handlePause, handleRemove, handleResume],
  );
  const header = (
    <View className={downloadsScreenStyles.header}>
      <Text className={downloadsScreenStyles.eyebrow}>Available offline</Text>
      <Text className={downloadsScreenStyles.title}>Downloads</Text>
      <Text className={downloadsScreenStyles.description}>
        Downloads resume from the last saved byte after an interruption.
      </Text>
      <View className={downloadsScreenStyles.cacheCard}>
        <Text className={downloadsScreenStyles.cacheTitle}>Storage limit</Text>
        <Text className={downloadsScreenStyles.cacheUsage}>
          {formatMegabytes(downloads.cacheSizeBytes)} used of{' '}
          {formatMegabytes(downloads.maxSizeBytes)}
        </Text>
        <View className={downloadsScreenStyles.cacheOptions}>
          {CACHE_LIMIT_OPTIONS.map(optionMb => {
            const optionBytes = optionMb * 1024 * 1024;
            const isSelected = downloads.maxSizeBytes === optionBytes;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Set download storage limit to ${optionMb} megabytes`}
                className={
                  isSelected
                    ? downloadsScreenStyles.selectedCacheOption
                    : downloadsScreenStyles.cacheOption
                }
                disabled={downloads.isUpdatingLimit}
                key={optionMb}
                onPress={() => {
                  updateLimit(optionBytes).catch(() => undefined);
                }}>
                <Text className={downloadsScreenStyles.cacheOptionText}>
                  {optionMb === 1024 ? '1 GB' : `${optionMb} MB`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {downloads.errorMessage ? (
        <Text className={downloadsScreenStyles.error}>
          {downloads.errorMessage}
        </Text>
      ) : null}
    </View>
  );

  return (
    <FlatList
      className={downloadsScreenStyles.container}
      contentContainerStyle={downloadsScreenNativeStyles.listContent}
      data={downloads.items}
      ItemSeparatorComponent={DownloadSeparator}
      keyExtractor={getDownloadKey}
      ListEmptyComponent={
        <View className={downloadsScreenStyles.empty}>
          <Text className={downloadsScreenStyles.emptyTitle}>
            No downloads yet
          </Text>
          <Text className={downloadsScreenStyles.emptyDescription}>
            Open a podcast and download an episode to listen without a connection.
          </Text>
        </View>
      }
      ListHeaderComponent={header}
      renderItem={renderDownload}
      showsVerticalScrollIndicator={false}
    />
  );
}
