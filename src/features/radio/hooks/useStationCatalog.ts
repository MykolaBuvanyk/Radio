import {useEffect, useRef, useState} from 'react';

import {
  defaultRadioCatalogFilters,
  type RadioCatalogFilters,
} from '../domain/radioCatalog';
import type {RadioStation} from '../domain/radioStation';
import {
  loadRadioCatalogPage,
  RADIO_CATALOG_PAGE_SIZE,
} from '../services/radioCatalogService';

const SEARCH_DEBOUNCE_MS = 350;

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function appendUniqueStations(
  currentStations: RadioStation[],
  nextStations: RadioStation[],
) {
  const knownIds = new Set(currentStations.map(station => station.id));
  const uniqueNextStations = nextStations.filter(
    station => !knownIds.has(station.id),
  );

  return [...currentStations, ...uniqueNextStations];
}

export function useStationCatalog() {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<RadioCatalogFilters>(
    defaultRadioCatalogFilters,
  );
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const nextOffset = useRef(0);
  const isLoadingMoreRequest = useRef(false);
  const isRefreshRequest = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(searchText.trim()),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    requestGeneration.current += 1;
    const generation = requestGeneration.current;
    const controller = new AbortController();

    activeRequest.current?.abort();
    activeRequest.current = controller;
    setStations([]);
    nextOffset.current = 0;
    setHasMore(true);
    setErrorMessage(null);
    setIsInitialLoading(true);
    setIsRefreshing(false);
    setIsLoadingMore(false);
    isRefreshRequest.current = false;
    isLoadingMoreRequest.current = false;

    loadRadioCatalogPage(
      {
        query: debouncedSearch,
        countryCode: filters.countryCode,
        genre: filters.genre,
        offset: 0,
      },
      controller.signal,
    )
      .then(page => {
        if (!isMounted.current || generation !== requestGeneration.current) {
          return;
        }

        setStations(page.stations);
        nextOffset.current = page.receivedCount;
        setHasMore(page.receivedCount === RADIO_CATALOG_PAGE_SIZE);
      })
      .catch(error => {
        if (
          !isMounted.current ||
          generation !== requestGeneration.current ||
          isAbortError(error)
        ) {
          return;
        }

        setErrorMessage(
          'Stations could not be loaded. Check your connection and try again.',
        );
      })
      .finally(() => {
        if (isMounted.current && generation === requestGeneration.current) {
          setIsInitialLoading(false);
        }
      });
  }, [debouncedSearch, filters]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  const setCountryCode = (countryCode: string) => {
    setFilters(currentFilters =>
      currentFilters.countryCode === countryCode
        ? currentFilters
        : {...currentFilters, countryCode},
    );
  };

  const setGenre = (genre: string) => {
    setFilters(currentFilters =>
      currentFilters.genre === genre
        ? currentFilters
        : {...currentFilters, genre},
    );
  };

  const refresh = async () => {
    if (isRefreshRequest.current || isInitialLoading) {
      return;
    }

    requestGeneration.current += 1;
    const generation = requestGeneration.current;
    const controller = new AbortController();

    activeRequest.current?.abort();
    activeRequest.current = controller;
    isRefreshRequest.current = true;
    isLoadingMoreRequest.current = false;
    setIsRefreshing(true);
    setIsLoadingMore(false);
    setErrorMessage(null);

    try {
      const page = await loadRadioCatalogPage(
        {
          query: debouncedSearch,
          countryCode: filters.countryCode,
          genre: filters.genre,
          offset: 0,
        },
        controller.signal,
      );

      if (!isMounted.current || generation !== requestGeneration.current) {
        return;
      }

      setStations(page.stations);
      nextOffset.current = page.receivedCount;
      setHasMore(page.receivedCount === RADIO_CATALOG_PAGE_SIZE);
    } catch (error) {
      if (
        !isMounted.current ||
        generation !== requestGeneration.current ||
        isAbortError(error)
      ) {
        return;
      }

      setErrorMessage(
        'Stations could not be refreshed. Check your connection and try again.',
      );
    } finally {
      if (isMounted.current && generation === requestGeneration.current) {
        isRefreshRequest.current = false;
        setIsRefreshing(false);
      }
    }
  };

  const loadMore = async () => {
    if (
      isInitialLoading ||
      isRefreshing ||
      isLoadingMoreRequest.current ||
      !hasMore ||
      stations.length === 0
    ) {
      return;
    }

    const generation = requestGeneration.current;
    const controller = new AbortController();

    activeRequest.current = controller;
    isLoadingMoreRequest.current = true;
    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      const page = await loadRadioCatalogPage(
        {
          query: debouncedSearch,
          countryCode: filters.countryCode,
          genre: filters.genre,
          offset: nextOffset.current,
        },
        controller.signal,
      );

      if (!isMounted.current || generation !== requestGeneration.current) {
        return;
      }

      setStations(currentStations =>
        appendUniqueStations(currentStations, page.stations),
      );
      nextOffset.current += page.receivedCount;
      setHasMore(page.receivedCount === RADIO_CATALOG_PAGE_SIZE);
    } catch (error) {
      if (
        !isMounted.current ||
        generation !== requestGeneration.current ||
        isAbortError(error)
      ) {
        return;
      }

      setErrorMessage('More stations could not be loaded. Please try again.');
    } finally {
      if (isMounted.current && generation === requestGeneration.current) {
        isLoadingMoreRequest.current = false;
        setIsLoadingMore(false);
      }
    }
  };

  return {
    searchText,
    setSearchText,
    filters,
    setCountryCode,
    setGenre,
    stations,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    errorMessage,
    hasMore,
    refresh,
    loadMore,
  };
}
