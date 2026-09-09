import {Pressable, Text, View} from 'react-native';

import type {PodcastSubscription} from '../domain/podcast';
import {podcastSubscriptionCardStyles} from './PodcastSubscriptionCard.styles';

type PodcastSubscriptionCardProps = {
  onPress: (subscription: PodcastSubscription) => void;
  subscription: PodcastSubscription;
};

function formatLastUpdated(timestamp: number | null) {
  if (timestamp === null) {
    return 'Not synced yet';
  }

  return `Updated ${new Date(timestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

export function PodcastSubscriptionCard({
  onPress,
  subscription,
}: PodcastSubscriptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${subscription.title}`}
      className={podcastSubscriptionCardStyles.container}
      onPress={() => onPress(subscription)}>
      <Text className={podcastSubscriptionCardStyles.author} numberOfLines={1}>
        {subscription.author ?? 'Podcast'}
      </Text>
      <Text className={podcastSubscriptionCardStyles.title} numberOfLines={2}>
        {subscription.title}
      </Text>
      {subscription.description ? (
        <Text
          className={podcastSubscriptionCardStyles.description}
          numberOfLines={3}>
          {subscription.description}
        </Text>
      ) : null}
      <View className={podcastSubscriptionCardStyles.metadataRow}>
        <Text className={podcastSubscriptionCardStyles.metadata}>
          {formatLastUpdated(subscription.lastSyncedAt)}
        </Text>
        <Text className={podcastSubscriptionCardStyles.action}>Episodes</Text>
      </View>
    </Pressable>
  );
}
