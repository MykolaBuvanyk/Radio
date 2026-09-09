import {z} from 'zod';

import {
  getDatabase,
  observeDatabaseQuery,
  type DatabaseRow,
} from '../../../shared/database/database';
import type {
  DailyListeningSummary,
  EpisodePlaybackPosition,
  ListeningHistoryEntry,
  PlaybackQueueItem,
  SaveEpisodePlaybackPositionInput,
  SavePlaybackQueueItemInput,
  StartListeningHistoryInput,
} from '../domain/persistence';

const mediaTypeSchema = z.enum(['radio', 'episode']);

const playbackPositionRowSchema = z.object({
  episodeId: z.string(),
  positionSeconds: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative().nullable(),
  completed: z.number().int().min(0).max(1),
  updatedAt: z.number(),
});

const queueItemRowSchema = z.object({
  id: z.string(),
  mediaType: mediaTypeSchema,
  mediaId: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  sourceUrl: z.string(),
  artworkUrl: z.string().nullable(),
  mimeType: z.string().nullable(),
  durationSeconds: z.number().nonnegative().nullable(),
  sortOrder: z.number().int().nonnegative(),
  addedAt: z.number(),
});

const historyRowSchema = z.object({
  id: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  mediaId: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  listenedSeconds: z.number().nonnegative(),
  completed: z.number().int().min(0).max(1),
});

const dailySummaryRowSchema = z.object({
  day: z.string(),
  listenedSeconds: z.number().nonnegative(),
  sessionCount: z.number().int().nonnegative(),
});

const playbackPositionColumns = `
  episode_id AS episodeId,
  position_seconds AS positionSeconds,
  duration_seconds AS durationSeconds,
  completed,
  updated_at AS updatedAt
`;

const queueItemColumns = `
  id,
  media_type AS mediaType,
  media_id AS mediaId,
  title,
  subtitle,
  source_url AS sourceUrl,
  artwork_url AS artworkUrl,
  mime_type AS mimeType,
  duration_seconds AS durationSeconds,
  sort_order AS sortOrder,
  added_at AS addedAt
`;

const historyColumns = `
  id,
  media_type AS mediaType,
  media_id AS mediaId,
  title,
  subtitle,
  started_at AS startedAt,
  ended_at AS endedAt,
  listened_seconds AS listenedSeconds,
  completed
`;

function assertNonnegativeFinite(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a nonnegative finite number.`);
  }
}

function mapPlaybackPositionRows(rows: DatabaseRow[]) {
  return playbackPositionRowSchema.array().parse(rows).map(row => ({
    ...row,
    completed: row.completed === 1,
  }));
}

function mapQueueItemRows(rows: DatabaseRow[]) {
  return queueItemRowSchema.array().parse(rows);
}

function mapHistoryRows(rows: DatabaseRow[]) {
  return historyRowSchema.array().parse(rows).map(row => ({
    ...row,
    completed: row.completed === 1,
  }));
}

function normalizeLimit(value: number, fallback: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 1), maximum);
}

export async function saveEpisodePlaybackPosition(
  input: SaveEpisodePlaybackPositionInput,
) {
  await saveEpisodePlaybackPositions([input]);
}

export async function saveEpisodePlaybackPositions(
  inputs: readonly SaveEpisodePlaybackPositionInput[],
) {
  if (inputs.length === 0) {
    return;
  }

  for (const input of inputs) {
    assertNonnegativeFinite(input.positionSeconds, 'positionSeconds');

    if (input.durationSeconds !== null) {
      assertNonnegativeFinite(input.durationSeconds, 'durationSeconds');
    }
  }

  const database = await getDatabase();
  const updatedAt = Date.now();

  await database.transaction(async transaction => {
    for (const input of inputs) {
      await transaction.execute(
        `INSERT INTO episode_playback_positions (
           episode_id, position_seconds, duration_seconds, completed, updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(episode_id) DO UPDATE SET
           position_seconds = excluded.position_seconds,
           duration_seconds = excluded.duration_seconds,
           completed = excluded.completed,
           updated_at = excluded.updated_at`,
        [
          input.episodeId,
          input.positionSeconds,
          input.durationSeconds,
          input.completed ? 1 : 0,
          updatedAt,
        ],
      );
    }
  });
}

export async function getEpisodePlaybackPosition(
  episodeId: string,
): Promise<EpisodePlaybackPosition | null> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${playbackPositionColumns}
     FROM episode_playback_positions
     WHERE episode_id = ?
     LIMIT 1`,
    [episodeId],
  );

  return mapPlaybackPositionRows(result.rows)[0] ?? null;
}

export async function listEpisodePlaybackPositions(
  episodeIds: readonly string[],
) {
  if (episodeIds.length === 0) {
    return [];
  }

  const uniqueEpisodeIds = [...new Set(episodeIds)];
  const placeholders = uniqueEpisodeIds.map(() => '?').join(', ');
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${playbackPositionColumns}
     FROM episode_playback_positions
     WHERE episode_id IN (${placeholders})`,
    uniqueEpisodeIds,
  );

  return mapPlaybackPositionRows(result.rows);
}

export async function deleteEpisodePlaybackPosition(episodeId: string) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute(
      'DELETE FROM episode_playback_positions WHERE episode_id = ?',
      [episodeId],
    );
  });
}

export function observeEpisodePlaybackPosition(
  episodeId: string,
  onChange: (position: EpisodePlaybackPosition | null) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT ${playbackPositionColumns}
            FROM episode_playback_positions
            WHERE episode_id = ?
            LIMIT 1`,
    parameters: [episodeId],
    tables: ['episode_playback_positions'],
    mapRows: rows => mapPlaybackPositionRows(rows)[0] ?? null,
    onChange,
    onError,
  });
}

export async function replacePlaybackQueue(
  items: readonly SavePlaybackQueueItemInput[],
) {
  const uniqueIds = new Set(items.map(item => item.id));
  const uniqueMedia = new Set(
    items.map(item => `${item.mediaType}:${item.mediaId}`),
  );

  if (uniqueIds.size !== items.length || uniqueMedia.size !== items.length) {
    throw new Error('Playback queue items must be unique.');
  }

  const database = await getDatabase();
  const addedAt = Date.now();

  await database.transaction(async transaction => {
    await transaction.execute('DELETE FROM queue_items');

    for (const [sortOrder, item] of items.entries()) {
      await transaction.execute(
        `INSERT INTO queue_items (
           id, media_type, media_id, title, subtitle, source_url,
           artwork_url, mime_type, duration_seconds, sort_order, added_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.mediaType,
          item.mediaId,
          item.title,
          item.subtitle,
          item.sourceUrl,
          item.artworkUrl,
          item.mimeType,
          item.durationSeconds,
          sortOrder,
          addedAt,
        ],
      );
    }
  });
}

export async function appendPlaybackQueueItem(
  item: SavePlaybackQueueItemInput,
) {
  const database = await getDatabase();
  let wasInserted = false;

  await database.transaction(async transaction => {
    const result = await transaction.execute(
      `INSERT INTO queue_items (
         id, media_type, media_id, title, subtitle, source_url,
         artwork_url, mime_type, duration_seconds, sort_order, added_at
       )
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?,
              COALESCE(MAX(sort_order) + 1, 0), ?
       FROM queue_items
       WHERE true
       ON CONFLICT(media_type, media_id) DO NOTHING`,
      [
        item.id,
        item.mediaType,
        item.mediaId,
        item.title,
        item.subtitle,
        item.sourceUrl,
        item.artworkUrl,
        item.mimeType,
        item.durationSeconds,
        Date.now(),
      ],
    );

    wasInserted = result.rowsAffected === 1;
  });

  return wasInserted;
}

export async function listPlaybackQueue() {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${queueItemColumns}
     FROM queue_items
     ORDER BY sort_order ASC`,
  );

  return mapQueueItemRows(result.rows);
}

export async function removePlaybackQueueItem(id: string) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute('DELETE FROM queue_items WHERE id = ?', [id]);
    const result = await transaction.execute(
      'SELECT id FROM queue_items ORDER BY sort_order ASC',
    );
    const remainingIds = z
      .object({id: z.string()})
      .array()
      .parse(result.rows)
      .map(row => row.id);

    for (const [sortOrder, remainingId] of remainingIds.entries()) {
      await transaction.execute(
        'UPDATE queue_items SET sort_order = ? WHERE id = ?',
        [sortOrder, remainingId],
      );
    }
  });
}

export async function reorderPlaybackQueue(orderedIds: readonly string[]) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    const result = await transaction.execute(
      'SELECT id FROM queue_items ORDER BY sort_order ASC',
    );
    const currentIds = z
      .object({id: z.string()})
      .array()
      .parse(result.rows)
      .map(row => row.id);

    if (
      currentIds.length !== orderedIds.length ||
      new Set(orderedIds).size !== orderedIds.length ||
      currentIds.some(id => !orderedIds.includes(id))
    ) {
      throw new Error('The queue order does not match the persisted queue.');
    }

    for (const [sortOrder, id] of orderedIds.entries()) {
      await transaction.execute(
        'UPDATE queue_items SET sort_order = ? WHERE id = ?',
        [sortOrder, id],
      );
    }
  });
}

export function observePlaybackQueue(
  onChange: (items: PlaybackQueueItem[]) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT ${queueItemColumns}
            FROM queue_items
            ORDER BY sort_order ASC`,
    tables: ['queue_items'],
    mapRows: mapQueueItemRows,
    onChange,
    onError,
  });
}

export async function startListeningHistory(
  input: StartListeningHistoryInput,
) {
  assertNonnegativeFinite(input.startedAt, 'startedAt');
  const database = await getDatabase();
  let historyId: number | null = null;

  await database.transaction(async transaction => {
    const result = await transaction.execute(
      `INSERT INTO listening_history (
         media_type, media_id, title, subtitle, started_at
       ) VALUES (?, ?, ?, ?, ?)`,
      [
        input.mediaType,
        input.mediaId,
        input.title,
        input.subtitle,
        input.startedAt,
      ],
    );

    historyId = result.insertId ?? null;
  });

  if (historyId === null) {
    throw new Error('SQLite did not return a listening history identifier.');
  }

  return historyId;
}

export async function finishListeningHistory(
  id: number,
  endedAt: number,
  listenedSeconds: number,
  completed: boolean,
) {
  assertNonnegativeFinite(listenedSeconds, 'listenedSeconds');
  assertNonnegativeFinite(endedAt, 'endedAt');
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute(
      `UPDATE listening_history
       SET ended_at = ?, listened_seconds = ?, completed = ?
       WHERE id = ?`,
      [endedAt, listenedSeconds, completed ? 1 : 0, id],
    );
  });
}

export async function listListeningHistory(
  limit = 100,
): Promise<ListeningHistoryEntry[]> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${historyColumns}
     FROM listening_history
     ORDER BY started_at DESC
     LIMIT ?`,
    [normalizeLimit(limit, 100, 500)],
  );

  return mapHistoryRows(result.rows);
}

export function observeListeningHistory(
  limit: number,
  onChange: (entries: ListeningHistoryEntry[]) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT ${historyColumns}
            FROM listening_history
            ORDER BY started_at DESC
            LIMIT ?`,
    parameters: [normalizeLimit(limit, 100, 500)],
    tables: ['listening_history'],
    mapRows: mapHistoryRows,
    onChange,
    onError,
  });
}

export async function listDailyListeningSummary(
  sinceTimestamp: number,
): Promise<DailyListeningSummary[]> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT
       strftime('%Y-%m-%d', started_at / 1000, 'unixepoch', 'localtime') AS day,
       SUM(listened_seconds) AS listenedSeconds,
       COUNT(*) AS sessionCount
     FROM listening_history
     WHERE started_at >= ?
     GROUP BY day
     ORDER BY day ASC`,
    [sinceTimestamp],
  );

  return dailySummaryRowSchema.array().parse(result.rows);
}

export function observeDailyListeningSummary(
  sinceTimestamp: number,
  onChange: (entries: DailyListeningSummary[]) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT
              strftime('%Y-%m-%d', started_at / 1000, 'unixepoch', 'localtime') AS day,
              SUM(listened_seconds) AS listenedSeconds,
              COUNT(*) AS sessionCount
            FROM listening_history
            WHERE started_at >= ?
            GROUP BY day
            ORDER BY day ASC`,
    parameters: [sinceTimestamp],
    tables: ['listening_history'],
    mapRows: rows => dailySummaryRowSchema.array().parse(rows),
    onChange,
    onError,
  });
}
