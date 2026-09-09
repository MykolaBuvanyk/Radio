import {useEffect, useState} from 'react';

import type {RadioStation} from '../../radio/domain/radioStation';
import {observeRadioFavorites} from '../infrastructure/radioFavoriteRepository';
import {setRadioFavorite} from '../services/radioFavoriteService';

export function useRadioFavorites() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingStationId, setPendingStationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(
    () =>
      observeRadioFavorites(
        nextStations => {
          setStations(nextStations);
          setIsLoading(false);
        },
        () => {
          setErrorMessage('Favorite stations could not be loaded.');
          setIsLoading(false);
        },
      ),
    [],
  );

  const favoriteIds = new Set(stations.map(station => station.id));

  const toggle = async (station: RadioStation) => {
    if (pendingStationId === station.id) {
      return;
    }

    setPendingStationId(station.id);
    setErrorMessage(null);

    try {
      await setRadioFavorite(station, !favoriteIds.has(station.id));
    } catch {
      setErrorMessage('The favorite station could not be updated.');
    } finally {
      setPendingStationId(null);
    }
  };

  return {
    errorMessage,
    favoriteIds,
    isLoading,
    pendingStationId,
    stations,
    toggle,
  };
}
