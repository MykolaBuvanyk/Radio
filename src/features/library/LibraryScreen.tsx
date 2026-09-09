import {ScrollView, Text, View} from 'react-native';

import {BackgroundPlaybackCard} from '../system/components/BackgroundPlaybackCard';
import {
  libraryScreenNativeStyles,
  libraryScreenStyles,
} from './LibraryScreen.styles';

export function LibraryScreen() {
  return (
    <ScrollView
      className={libraryScreenStyles.container}
      contentContainerStyle={libraryScreenNativeStyles.scrollContent}>
      <View className={libraryScreenStyles.header}>
        <Text className={libraryScreenStyles.eyebrow}>Saved for later</Text>
        <Text className={libraryScreenStyles.title}>Library</Text>
        <Text className={libraryScreenStyles.description}>
          Find favorite stations, subscriptions, and listening history.
        </Text>
      </View>
      <View className={libraryScreenStyles.content}>
        <BackgroundPlaybackCard />
      </View>
    </ScrollView>
  );
}
