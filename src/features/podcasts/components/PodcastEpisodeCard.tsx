import {Pressable, Text, View} from 'react-native';

import type {PodcastEpisode} from '../domain/podcastEpisode';
import type {EpisodeDownload} from '../../downloads/domain/download';
import {podcastEpisodeCardStyles} from './PodcastEpisodeCard.styles';

type PodcastEpisodeCardProps = {
  episode: PodcastEpisode;
  download: EpisodeDownload | null;
  isBusy: boolean;
  isDownloadBusy: boolean;
  isDeleteBusy: boolean;
  isQueued: boolean;
  onAddToQueue: (episode: PodcastEpisode) => void;
  onDownloadAction: (episode: PodcastEpisode, download: EpisodeDownload | null) => void;
  onDelete: (episode: PodcastEpisode) => void;
  onPlay: (episode: PodcastEpisode) => void;
};

function formatPublishedAt(timestamp: number | null) {
  return timestamp === null
    ? 'Publication date unavailable'
    : new Date(timestamp).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function getDownloadLabel(download: EpisodeDownload | null) {
  if (!download) {
    return 'Download';
  }

  if (download.status === 'downloading' && download.totalBytes) {
    const progress = Math.min(
      100,
      Math.round((download.bytesDownloaded / download.totalBytes) * 100),
    );

    return `Pause ${progress}%`;
  }

  switch (download.status) {
    case 'queued':
      return 'Pause queued';
    case 'downloading':
      return 'Pause';
    case 'paused':
      return 'Resume';
    case 'failed':
      return 'Retry';
    case 'completed':
      return 'Available offline';
  }
}

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return null;
  }

  const roundedSeconds = Math.round(durationSeconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(
      seconds,
    ).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function PodcastEpisodeCard({
  download,
  episode,
  isBusy,
  isDownloadBusy,
  isDeleteBusy,
  isQueued,
  onAddToQueue,
  onDownloadAction,
  onDelete,
  onPlay,
}: PodcastEpisodeCardProps) {
  const duration = formatDuration(episode.durationSeconds);

  return (
    <View
      className={podcastEpisodeCardStyles.container}
      testID={`podcast-episode-${episode.id}`}>
      <Text className={podcastEpisodeCardStyles.date}>
        {formatPublishedAt(episode.publishedAt)}
      </Text>
      <Text className={podcastEpisodeCardStyles.title}>{episode.title}</Text>
      {episode.description ? (
        <Text
          className={podcastEpisodeCardStyles.description}
          numberOfLines={4}>
          {episode.description}
        </Text>
      ) : null}
      {duration ? (
        <Text className={podcastEpisodeCardStyles.metadata}>
          Duration {duration}
        </Text>
      ) : null}
      {episode.isExplicit ? (
        <Text className={podcastEpisodeCardStyles.explicit}>Explicit</Text>
      ) : null}
      <View className={podcastEpisodeCardStyles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${episode.title}`}
          className={podcastEpisodeCardStyles.playButton}
          disabled={isBusy}
          onPress={() => onPlay(episode)}
          testID={`episode-play-${episode.id}`}>
          <Text className={podcastEpisodeCardStyles.playButtonText}>
            {isBusy ? 'Loading…' : 'Play'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${episode.title} to queue`}
          className={podcastEpisodeCardStyles.queueButton}
          disabled={isBusy || isQueued}
          onPress={() => onAddToQueue(episode)}
          testID={`episode-queue-${episode.id}`}>
          <Text className={podcastEpisodeCardStyles.queueButtonText}>
            {isQueued ? 'Queued' : 'Add to queue'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${getDownloadLabel(download)} ${episode.title}`}
          className={podcastEpisodeCardStyles.downloadButton}
          disabled={isDownloadBusy || download?.status === 'completed'}
          onPress={() => onDownloadAction(episode, download)}
          testID={`episode-download-${episode.id}`}>
          <Text className={podcastEpisodeCardStyles.downloadButtonText}>
            {isDownloadBusy ? 'Updating…' : getDownloadLabel(download)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${episode.title}`}
          className={podcastEpisodeCardStyles.deleteButton}
          disabled={isDeleteBusy || isBusy || isDownloadBusy}
          onPress={() => onDelete(episode)}
          testID={`episode-delete-${episode.id}`}>
          <Text className={podcastEpisodeCardStyles.deleteButtonText}>
            {isDeleteBusy ? 'Deleting…' : 'Delete episode'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
