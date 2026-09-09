import {Pressable, Text, View} from 'react-native';

import type {EpisodeDownloadListItem} from '../domain/download';
import {
  downloadCardStyles,
  getDownloadProgressStyle,
} from './DownloadCard.styles';

type DownloadCardProps = {
  isPending: boolean;
  item: EpisodeDownloadListItem;
  onPause: (episodeId: string) => void;
  onRemove: (episodeId: string) => void;
  onResume: (episodeId: string) => void;
};

function formatBytes(bytes: number | null) {
  if (bytes === null) {
    return 'Size unavailable';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getProgress(item: EpisodeDownloadListItem) {
  if (item.status === 'completed') {
    return 100;
  }

  if (!item.totalBytes || item.totalBytes <= 0) {
    return 0;
  }

  return (item.bytesDownloaded / item.totalBytes) * 100;
}

function getStatusLabel(item: EpisodeDownloadListItem) {
  switch (item.status) {
    case 'queued':
      return 'Waiting';
    case 'downloading':
      return 'Downloading';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Available offline';
    case 'failed':
      return 'Needs attention';
  }
}

export function DownloadCard({
  isPending,
  item,
  onPause,
  onRemove,
  onResume,
}: DownloadCardProps) {
  const progress = getProgress(item);
  const canPause = item.status === 'queued' || item.status === 'downloading';
  const canResume = item.status === 'paused' || item.status === 'failed';

  return (
    <View
      className={downloadCardStyles.container}
      testID={`download-item-${item.episodeId}`}>
      <Text className={downloadCardStyles.status}>{getStatusLabel(item)}</Text>
      <Text className={downloadCardStyles.title}>{item.episodeTitle}</Text>
      <Text className={downloadCardStyles.podcast}>{item.podcastTitle}</Text>
      <View className={downloadCardStyles.progressTrack}>
        <View
          className={downloadCardStyles.progressFill}
          style={getDownloadProgressStyle(progress)}
        />
      </View>
      <Text className={downloadCardStyles.details}>
        {formatBytes(item.bytesDownloaded)}
        {item.totalBytes ? ` of ${formatBytes(item.totalBytes)}` : ''}
        {item.totalBytes ? ` · ${Math.round(progress)}%` : ''}
      </Text>
      {item.errorMessage ? (
        <Text className={downloadCardStyles.error}>{item.errorMessage}</Text>
      ) : null}
      <View className={downloadCardStyles.actions}>
        {canPause ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pause download of ${item.episodeTitle}`}
            className={downloadCardStyles.primaryButton}
            disabled={isPending}
            onPress={() => onPause(item.episodeId)}>
            <Text className={downloadCardStyles.primaryButtonText}>
              {isPending ? 'Updating…' : 'Pause'}
            </Text>
          </Pressable>
        ) : null}
        {canResume ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resume download of ${item.episodeTitle}`}
            className={downloadCardStyles.primaryButton}
            disabled={isPending}
            onPress={() => onResume(item.episodeId)}>
            <Text className={downloadCardStyles.primaryButtonText}>
              {isPending ? 'Updating…' : 'Resume'}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove download of ${item.episodeTitle}`}
          className={downloadCardStyles.removeButton}
          disabled={isPending}
          onPress={() => onRemove(item.episodeId)}>
          <Text className={downloadCardStyles.removeButtonText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}
