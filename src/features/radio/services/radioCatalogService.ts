import {playLiveAudio} from '../../player/services/playerService';
import {
  recordRadioStationClick,
  searchRadioStations,
} from '../api/radioBrowserClient';
import type {RadioCatalogFilters} from '../domain/radioCatalog';
import type {RadioStation} from '../domain/radioStation';

export const RADIO_CATALOG_PAGE_SIZE = 30;

export type RadioCatalogPageInput = RadioCatalogFilters & {
  query: string;
  offset: number;
};

export function loadRadioCatalogPage(
  input: RadioCatalogPageInput,
  signal?: AbortSignal,
) {
  return searchRadioStations(
    {
      ...input,
      limit: RADIO_CATALOG_PAGE_SIZE,
    },
    signal,
  );
}

export function playCatalogStation(station: RadioStation) {
  playLiveAudio({
    id: station.id,
    streamUrl: station.streamUrl,
    title: station.name,
    subtitle: `${station.genre} · ${station.country}`,
    mimeType: station.mimeType,
  });

  recordRadioStationClick(station.id).catch(() => undefined);
}
