import {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import {PodcastSubscriptionCard} from '../components/PodcastSubscriptionCard';
import type {PodcastSubscription} from '../domain/podcast';
import {usePodcastSubscriptions} from '../hooks/usePodcastSubscriptions';
import {
  podcastsScreenNativeStyles,
  podcastsScreenStyles,
} from './PodcastsScreen.styles';

function getSubscriptionKey(subscription: PodcastSubscription) {
  return subscription.id;
}

function PodcastSeparator() {
  return <View className={podcastsScreenStyles.separator} />;
}

export function PodcastsScreen() {
  const navigation = useNavigation();
  const catalog = usePodcastSubscriptions();
  const [feedUrl, setFeedUrl] = useState('');

  const handleSubmit = async () => {
    const wasAdded = await catalog.addSubscription(feedUrl);

    if (wasAdded) {
      setFeedUrl('');
    }
  };

  const handleSubscriptionPress = (subscription: PodcastSubscription) => {
    navigation.navigate('PodcastDetails', {podcastId: subscription.id});
  };

  const handleRemoveSubscription = (subscription: PodcastSubscription) => {
    Alert.alert(
      'Remove podcast?',
      `This deletes ${subscription.title}, its episodes, queue items, and downloaded files from this device.`,
      [
        {style: 'cancel', text: 'Cancel'},
        {
          style: 'destructive',
          text: 'Remove',
          onPress: () => {
            catalog.removeSubscription(subscription.id).catch(() => undefined);
          },
        },
      ],
    );
  };

  const renderSubscription = ({
    item,
  }: ListRenderItemInfo<PodcastSubscription>) => (
    <PodcastSubscriptionCard
      isRemoving={catalog.pendingRemovalId === item.id}
      onPress={handleSubscriptionPress}
      onRemove={handleRemoveSubscription}
      subscription={item}
    />
  );

  const header = (
    <View className={podcastsScreenStyles.header}>
      <Text className={podcastsScreenStyles.eyebrow}>Your subscriptions</Text>
      <Text className={podcastsScreenStyles.title}>Podcasts</Text>
      <Text className={podcastsScreenStyles.description}>
        Paste a public RSS or Atom feed URL to follow a podcast.
      </Text>
      <TextInput
        accessibilityLabel="Podcast feed URL"
        autoCapitalize="none"
        autoCorrect={false}
        className={podcastsScreenStyles.input}
        keyboardType="url"
        onChangeText={setFeedUrl}
        onSubmitEditing={handleSubmit}
        placeholder="https://example.com/podcast.xml"
        placeholderTextColor="#64748b"
        returnKeyType="go"
        testID="podcast-feed-input"
        value={feedUrl}
      />
      <Pressable
        accessibilityRole="button"
        className={podcastsScreenStyles.submitButton}
        disabled={catalog.isSubmitting || feedUrl.trim().length === 0}
        onPress={handleSubmit}
        testID="podcast-add-button">
        <Text className={podcastsScreenStyles.submitButtonText}>
          {catalog.isSubmitting ? 'Adding podcast…' : 'Add podcast'}
        </Text>
      </Pressable>
      {catalog.errorMessage ? (
        <Text className={podcastsScreenStyles.error}>
          {catalog.errorMessage}
        </Text>
      ) : null}
      <Text className={podcastsScreenStyles.sectionTitle}>
        Subscriptions
      </Text>
    </View>
  );

  const emptyContent = catalog.isLoading ? (
    <View className={podcastsScreenStyles.centeredState}>
      <ActivityIndicator size="large" />
      <Text className={podcastsScreenStyles.stateTitle}>
        Loading subscriptions
      </Text>
    </View>
  ) : (
    <View className={podcastsScreenStyles.centeredState}>
      <Text className={podcastsScreenStyles.stateTitle}>No podcasts yet</Text>
      <Text className={podcastsScreenStyles.stateDescription}>
        Add an RSS feed above to build your podcast library.
      </Text>
    </View>
  );

  return (
    <FlatList
      className={podcastsScreenStyles.container}
      contentContainerStyle={podcastsScreenNativeStyles.listContent}
      data={catalog.subscriptions}
      ItemSeparatorComponent={PodcastSeparator}
      keyExtractor={getSubscriptionKey}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={emptyContent}
      ListHeaderComponent={header}
      renderItem={renderSubscription}
      showsVerticalScrollIndicator={false}
      testID="screen-podcasts"
    />
  );
}
