import type {RadioStation} from '../domain/radioStation';
import {
  radioBrowserStationsSchema,
  type RadioBrowserStationDto,
} from './radioBrowser.schemas';

const RADIO_BROWSER_BASE_URL = 'https://all.api.radio-browser.info';
const REQUEST_TIMEOUT_MS = 12_000;

export type RadioBrowserSearchInput = {
  query: string;
  countryCode: string;
  genre: string;
  offset: number;
  limit: number;
};

export class RadioBrowserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RadioBrowserError';
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value);
}

function getMimeType(codec: string, isHls: boolean) {
  if (isHls) {
    return 'application/x-mpegURL';
  }

  const normalizedCodec = codec.trim().toLowerCase();

  if (normalizedCodec.includes('aac')) {
    return 'audio/aac';
  }

  if (normalizedCodec.includes('ogg')) {
    return 'audio/ogg';
  }

  if (normalizedCodec.includes('flac')) {
    return 'audio/flac';
  }

  if (normalizedCodec.includes('mp3') || normalizedCodec.includes('mpeg')) {
    return 'audio/mpeg';
  }

  return null;
}

function normalizeStation(dto: RadioBrowserStationDto): RadioStation | null {
  const streamUrl = dto.url_resolved.trim() || dto.url.trim();
  const name = dto.name.trim();
  const id = dto.stationuuid.trim();

  if (!id || !name || !isHttpUrl(streamUrl)) {
    return null;
  }

  const tags = dto.tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  const country = dto.country.trim() || 'Unknown country';

  return {
    id,
    name,
    country,
    countryCode: dto.countrycode.trim().toUpperCase(),
    genre: tags[0] || 'Various',
    tags,
    streamUrl,
    homepageUrl: isHttpUrl(dto.homepage.trim()) ? dto.homepage.trim() : null,
    faviconUrl: isHttpUrl(dto.favicon.trim()) ? dto.favicon.trim() : null,
    codec: dto.codec.trim() || null,
    bitrate: dto.bitrate > 0 ? dto.bitrate : null,
    mimeType: getMimeType(dto.codec, dto.hls === 1),
  };
}

function buildSearchUrl(input: RadioBrowserSearchInput) {
  const parameters: Array<[string, string]> = [
    ['hidebroken', 'true'],
    ['is_https', 'true'],
    ['order', 'clickcount'],
    ['reverse', 'true'],
    ['offset', String(input.offset)],
    ['limit', String(input.limit)],
  ];

  if (input.query) {
    parameters.push(['name', input.query]);
  }

  if (input.countryCode) {
    parameters.push(['countrycode', input.countryCode]);
  }

  if (input.genre) {
    parameters.push(['tag', input.genre]);
  }

  const queryString = parameters
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&');

  return `${RADIO_BROWSER_BASE_URL}/json/stations/search?${queryString}`;
}

async function fetchJson(url: string, externalSignal?: AbortSignal) {
  const requestController = new AbortController();
  let didTimeout = false;
  const handleExternalAbort = () => requestController.abort();
  const timeout = setTimeout(() => {
    didTimeout = true;
    requestController.abort();
  }, REQUEST_TIMEOUT_MS);

  externalSignal?.addEventListener('abort', handleExternalAbort);

  if (externalSignal?.aborted) {
    requestController.abort();
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Radio/0.0.1',
      },
      signal: requestController.signal,
    });

    if (!response.ok) {
      throw new RadioBrowserError(
        `Radio Browser request failed with status ${response.status}.`,
      );
    }

    return (await response.json()) as unknown;
  } catch (error) {
    if (didTimeout) {
      throw new RadioBrowserError('Radio Browser request timed out.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', handleExternalAbort);
  }
}

export async function searchRadioStations(
  input: RadioBrowserSearchInput,
  signal?: AbortSignal,
) {
  const response = await fetchJson(buildSearchUrl(input), signal);
  const parsedResponse = radioBrowserStationsSchema.safeParse(response);

  if (!parsedResponse.success) {
    throw new RadioBrowserError('Radio Browser returned invalid station data.');
  }

  const stations = parsedResponse.data
    .map(normalizeStation)
    .filter((station): station is RadioStation => station !== null);

  return {
    stations,
    receivedCount: parsedResponse.data.length,
  };
}

export async function recordRadioStationClick(stationId: string) {
  try {
    await fetchJson(
      `${RADIO_BROWSER_BASE_URL}/json/url/${encodeURIComponent(stationId)}`,
    );
  } catch {
    // Playback must not fail when the optional Radio Browser counter is down.
  }
}
