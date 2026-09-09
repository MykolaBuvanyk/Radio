import {Pressable, Text, View} from 'react-native';

import type {PodcastSubscription} from '../domain/podcast';
import {podcastSubscriptionCardStyles} from './PodcastSubscriptionCard.styles';

type PodcastSubscriptionCardProps = {
  isRemoving: boolean;
  onPress: (subscription: PodcastSubscription) => void;
  onRemove: (subscription: PodcastSubscription) => void;
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
  isRemoving,
  onPress,
  onRemove,
  subscription,
}: PodcastSubscriptionCardProps) {
  return (
    <View
      className={podcastSubscriptionCardStyles.container}
      testID={`podcast-subscription-${subscription.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${subscription.title}`}
        className={podcastSubscriptionCardStyles.content}
        onPress={() => onPress(subscription)}
        testID={`podcast-open-${subscription.id}`}>
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
      </Pressable>
      <View className={podcastSubscriptionCardStyles.metadataRow}>
        <Text className={podcastSubscriptionCardStyles.metadata}>
          {formatLastUpdated(subscription.lastSyncedAt)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${subscription.title}`}
          className={podcastSubscriptionCardStyles.removeButton}
          disabled={isRemoving}
          onPress={() => onRemove(subscription)}
          testID={`podcast-remove-${subscription.id}`}>
          <Text className={podcastSubscriptionCardStyles.removeButtonText}>
            {isRemoving ? 'Removing…' : 'Remove'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open episodes for ${subscription.title}`}
          onPress={() => onPress(subscription)}>
          <Text className={podcastSubscriptionCardStyles.action}>Episodes</Text>
        </Pressable>
      </View>
    </View>
  );
}
