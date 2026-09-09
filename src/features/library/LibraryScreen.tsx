import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import type {ListeningHistoryEntry} from '../player/domain/persistence';
import {usePlayerSnapshot} from '../player/infrastructure/usePlayerSnapshot';
import type {RadioStation} from '../radio/domain/radioStation';
import {playCatalogStation} from '../radio/services/radioCatalogService';
import {BackgroundPlaybackCard} from '../system/components/BackgroundPlaybackCard';
import {FavoriteStationCard} from './components/FavoriteStationCard';
import {ListeningHistoryCard} from './components/ListeningHistoryCard';
import {ListeningHistoryChart} from './components/ListeningHistoryChart';
import {useListeningLibrary} from './hooks/useListeningLibrary';
import {useRadioFavorites} from './hooks/useRadioFavorites';
import {
  libraryScreenNativeStyles,
  libraryScreenStyles,
} from './LibraryScreen.styles';

type LibraryListItem =
  | {id: string; kind: 'favorite'; station: RadioStation}
  | {entry: ListeningHistoryEntry; id: string; kind: 'history'}
  | {id: string; kind: 'section'; title: string};

function LibrarySeparator() {
  return <View className={libraryScreenStyles.separator} />;
}

export function LibraryScreen() {
  const favorites = useRadioFavorites();
  const listening = useListeningLibrary();
  const player = usePlayerSnapshot();
  const items: LibraryListItem[] = [
    {id: 'favorites-heading', kind: 'section', title: 'Favorite stations'},
    ...favorites.stations.map(station => ({
      id: `favorite-${station.id}`,
      kind: 'favorite' as const,
      station,
    })),
    {id: 'history-heading', kind: 'section', title: 'Recent listening'},
    ...listening.history.map(entry => ({
      entry,
      id: `history-${entry.id}`,
      kind: 'history' as const,
    })),
  ];

  const renderItem = ({item}: ListRenderItemInfo<LibraryListItem>) => {
    if (item.kind === 'section') {
      return (
        <View className={libraryScreenStyles.sectionHeader}>
          <Text className={libraryScreenStyles.sectionTitle}>{item.title}</Text>
          {item.id === 'favorites-heading' && favorites.stations.length === 0 ? (
            <Text className={libraryScreenStyles.emptyText}>
              Tap the heart on a radio station to save it here.
            </Text>
          ) : null}
          {item.id === 'history-heading' &&
          listening.history.length === 0 &&
          !listening.isLoading ? (
            <Text className={libraryScreenStyles.emptyText}>
              Listening sessions will appear after you play something.
            </Text>
          ) : null}
        </View>
      );
    }

    if (item.kind === 'favorite') {
      return (
        <FavoriteStationCard
          isBusy={favorites.pendingStationId === item.station.id}
          isPlaying={player.mediaId === item.station.id && player.isPlaying}
          onPlay={playCatalogStation}
          onRemove={favorites.toggle}
          station={item.station}
        />
      );
    }

    return <ListeningHistoryCard entry={item.entry} />;
  };

  const header = (
    <View>
      <View className={libraryScreenStyles.header}>
        <Text className={libraryScreenStyles.eyebrow}>Saved for later</Text>
        <Text className={libraryScreenStyles.title}>Library</Text>
        <Text className={libraryScreenStyles.description}>
          Your favorite stations and recent listening activity.
        </Text>
      </View>
      <View className={libraryScreenStyles.headerContent}>
        <BackgroundPlaybackCard />
        <ListeningHistoryChart summary={listening.dailySummary} />
        {favorites.errorMessage || listening.errorMessage ? (
          <Text className={libraryScreenStyles.error}>
            {favorites.errorMessage ?? listening.errorMessage}
          </Text>
        ) : null}
        {listening.isLoading ? <ActivityIndicator size="small" /> : null}
      </View>
    </View>
  );

  return (
    <FlatList
      className={libraryScreenStyles.container}
      contentContainerStyle={libraryScreenNativeStyles.listContent}
      data={items}
      ItemSeparatorComponent={LibrarySeparator}
      keyExtractor={item => item.id}
      ListHeaderComponent={header}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      testID="screen-library"
    />
  );
}
