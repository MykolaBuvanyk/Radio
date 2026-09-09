import {Text, View} from 'react-native';

import type {ListeningHistoryEntry} from '../../player/domain/persistence';
import {listeningHistoryCardStyles} from './ListeningHistoryCard.styles';

type ListeningHistoryCardProps = {
  entry: ListeningHistoryEntry;
};

function formatListenedTime(seconds: number) {
  const roundedMinutes = Math.max(1, Math.round(seconds / 60));
  return roundedMinutes === 1 ? '1 minute listened' : `${roundedMinutes} minutes listened`;
}

export function ListeningHistoryCard({entry}: ListeningHistoryCardProps) {
  return (
    <View className={listeningHistoryCardStyles.container}>
      <View className={listeningHistoryCardStyles.headerRow}>
        <Text className={listeningHistoryCardStyles.type}>
          {entry.mediaType === 'radio' ? 'Radio' : 'Podcast'}
        </Text>
        <Text className={listeningHistoryCardStyles.date}>
          {new Date(entry.startedAt).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
      <Text className={listeningHistoryCardStyles.title} numberOfLines={2}>
        {entry.title}
      </Text>
      {entry.subtitle ? (
        <Text className={listeningHistoryCardStyles.subtitle} numberOfLines={1}>
          {entry.subtitle}
        </Text>
      ) : null}
      <Text className={listeningHistoryCardStyles.metadata}>
        {entry.completed ? 'Completed' : formatListenedTime(entry.listenedSeconds)}
      </Text>
    </View>
  );
}
