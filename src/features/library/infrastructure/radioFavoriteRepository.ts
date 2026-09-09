import {z} from 'zod';

import {
  getDatabase,
  observeDatabaseQuery,
  type DatabaseRow,
} from '../../../shared/database/database';
import type {RadioStation} from '../../radio/domain/radioStation';

const favoriteRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  countryCode: z.string(),
  genre: z.string(),
  tagsJson: z.string(),
  streamUrl: z.string().url(),
  homepageUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  codec: z.string().nullable(),
  bitrate: z.number().int().nonnegative().nullable(),
  mimeType: z.string().nullable(),
});

const favoriteColumns = `
  id,
  name,
  country,
  country_code AS countryCode,
  genre,
  tags_json AS tagsJson,
  stream_url AS streamUrl,
  homepage_url AS homepageUrl,
  favicon_url AS faviconUrl,
  codec,
  bitrate,
  mime_type AS mimeType
`;

function parseTags(tagsJson: string) {
  try {
    return z.string().array().parse(JSON.parse(tagsJson));
  } catch {
    return [];
  }
}

function mapFavoriteRows(rows: DatabaseRow[]): RadioStation[] {
  return favoriteRowSchema.array().parse(rows).map(row => {
    const {tagsJson, ...station} = row;

    return {
      ...station,
      tags: parseTags(tagsJson),
    };
  });
}

export async function saveRadioFavorite(station: RadioStation) {
  const database = await getDatabase();
  const now = Date.now();

  await database.transaction(async transaction => {
    await transaction.execute(
      `INSERT INTO radio_favorites (
         id, name, country, country_code, genre, tags_json, stream_url,
         homepage_url, favicon_url, codec, bitrate, mime_type, created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         country = excluded.country,
         country_code = excluded.country_code,
         genre = excluded.genre,
         tags_json = excluded.tags_json,
         stream_url = excluded.stream_url,
         homepage_url = excluded.homepage_url,
         favicon_url = excluded.favicon_url,
         codec = excluded.codec,
         bitrate = excluded.bitrate,
         mime_type = excluded.mime_type,
         updated_at = excluded.updated_at`,
      [
        station.id,
        station.name,
        station.country,
        station.countryCode,
        station.genre,
        JSON.stringify(station.tags),
        station.streamUrl,
        station.homepageUrl,
        station.faviconUrl,
        station.codec,
        station.bitrate,
        station.mimeType,
        now,
        now,
      ],
    );
  });
}

export async function deleteRadioFavorite(stationId: string) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute('DELETE FROM radio_favorites WHERE id = ?', [
      stationId,
    ]);
  });
}

export function observeRadioFavorites(
  onChange: (stations: RadioStation[]) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT ${favoriteColumns}
            FROM radio_favorites
            ORDER BY name COLLATE NOCASE ASC`,
    tables: ['radio_favorites'],
    mapRows: mapFavoriteRows,
    onChange,
    onError,
  });
}
