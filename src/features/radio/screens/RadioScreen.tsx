import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import {usePlayerSnapshot} from '../../player/infrastructure/usePlayerSnapshot';
import {togglePlayback} from '../../player/services/playerService';
import {usePlayerStore} from '../../player/store/playerStore';
import {useRadioFavorites} from '../../library/hooks/useRadioFavorites';
import {RadioFilterChips} from '../components/RadioFilterChips';
import {RadioStationCard} from '../components/RadioStationCard';
import {
  radioCountryOptions,
  radioGenreOptions,
} from '../domain/radioCatalog';
import type {RadioStation} from '../domain/radioStation';
import {useStationCatalog} from '../hooks/useStationCatalog';
import {playCatalogStation} from '../services/radioCatalogService';
import {
  radioScreenNativeStyles,
  radioScreenStyles,
} from './RadioScreen.styles';

function getStationKey(station: RadioStation) {
  return station.id;
}

export function RadioScreen() {
  const catalog = useStationCatalog();
  const favorites = useRadioFavorites();
  const player = usePlayerSnapshot();
  const setupStatus = usePlayerStore(state => state.setupStatus);
  const playerError = usePlayerStore(state => state.errorMessage);
  const reportPlayerError = usePlayerStore(state => state.reportError);
  const clearPlayerError = usePlayerStore(state => state.clearError);
  const isPlayerDisabled = setupStatus !== 'ready';

  const handleStationPress = (station: RadioStation) => {
    try {
      clearPlayerError();

      if (player.mediaId === station.id) {
        togglePlayback();
        return;
      }

      playCatalogStation(station);
    } catch {
      reportPlayerError('The station could not be played. Please try again.');
    }
  };

  const renderStation = ({item}: ListRenderItemInfo<RadioStation>) => (
    <RadioStationCard
      station={item}
      isActive={player.mediaId === item.id}
      isPlaying={player.isPlaying}
      playerPhase={player.phase}
      isDisabled={isPlayerDisabled}
      isFavorite={favorites.favoriteIds.has(item.id)}
      isFavoriteBusy={favorites.pendingStationId === item.id}
      onPress={handleStationPress}
      onToggleFavorite={favorites.toggle}
    />
  );

  const emptyContent = catalog.isInitialLoading ? (
    <View className={radioScreenStyles.centeredState}>
      <ActivityIndicator size="large" />
      <Text className={radioScreenStyles.stateTitle}>Loading stations</Text>
      <Text className={radioScreenStyles.stateDescription}>
        Finding reliable live streams for you.
      </Text>
    </View>
  ) : catalog.errorMessage ? (
    <View className={radioScreenStyles.centeredState}>
      <Text className={radioScreenStyles.stateTitle}>Unable to load radio</Text>
      <Text className={radioScreenStyles.stateDescription}>
        {catalog.errorMessage}
      </Text>
      <Pressable
        accessibilityRole="button"
        className={radioScreenStyles.retryButton}
        onPress={catalog.refresh}>
        <Text className={radioScreenStyles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  ) : (
    <View className={radioScreenStyles.centeredState}>
      <Text className={radioScreenStyles.stateTitle}>No stations found</Text>
      <Text className={radioScreenStyles.stateDescription}>
        Try a different station name or change the filters.
      </Text>
    </View>
  );

  const footerContent = catalog.isLoadingMore ? (
    <View className={radioScreenStyles.footerLoader}>
      <ActivityIndicator />
      <Text className={radioScreenStyles.footerText}>Loading more stations</Text>
    </View>
  ) : undefined;

  return (
    <View className={radioScreenStyles.container} testID="screen-radio">
      <View className={radioScreenStyles.header}>
        <Text className={radioScreenStyles.eyebrow}>Live audio</Text>
        <Text className={radioScreenStyles.title}>Radio</Text>
        <Text className={radioScreenStyles.description}>
          Discover live stations and keep listening in the background.
        </Text>

        <TextInput
          accessibilityLabel="Search radio stations"
          autoCapitalize="none"
          autoCorrect={false}
          className={radioScreenStyles.searchInput}
          onChangeText={catalog.setSearchText}
          placeholder="Search stations"
          placeholderTextColor="#64748b"
          returnKeyType="search"
          testID="radio-search-input"
          value={catalog.searchText}
        />

        <RadioFilterChips
          label="Country"
          options={radioCountryOptions}
          selectedValue={catalog.filters.countryCode}
          onChange={catalog.setCountryCode}
        />
        <RadioFilterChips
          label="Genre"
          options={radioGenreOptions}
          selectedValue={catalog.filters.genre}
          onChange={catalog.setGenre}
        />

        {playerError ? (
          <Text className={radioScreenStyles.playerError}>{playerError}</Text>
        ) : null}
        {catalog.errorMessage && catalog.stations.length > 0 ? (
          <Text className={radioScreenStyles.catalogNotice}>
            {catalog.errorMessage}
          </Text>
        ) : null}
        {favorites.errorMessage ? (
          <Text className={radioScreenStyles.catalogNotice}>
            {favorites.errorMessage}
          </Text>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={radioScreenNativeStyles.listContent}
        data={catalog.stations}
        ItemSeparatorComponent={RadioStationSeparator}
        keyExtractor={getStationKey}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={emptyContent}
        ListFooterComponent={footerContent}
        onEndReached={catalog.loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={catalog.refresh}
        refreshing={catalog.isRefreshing}
        renderItem={renderStation}
        showsVerticalScrollIndicator={false}
        testID="radio-station-list"
      />
    </View>
  );
}

function RadioStationSeparator() {
  return <View className={radioScreenStyles.separator} />;
}
