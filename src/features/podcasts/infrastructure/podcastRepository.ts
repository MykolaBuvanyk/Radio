import type {Scalar} from '@op-engineering/op-sqlite';
import {z} from 'zod';

import {
  getDatabase,
  observeDatabaseQuery,
  type DatabaseRow,
} from '../../../shared/database/database';
import type {
  PodcastFeedCacheMetadata,
  PodcastSubscription,
  SavePodcastSubscriptionInput,
} from '../domain/podcast';
import type {
  PodcastEpisode,
  PodcastEpisodePageInput,
  SavePodcastEpisodeInput,
} from '../domain/podcastEpisode';

const subscriptionRowSchema = z.object({
  id: z.string(),
  feedUrl: z.string(),
  title: z.string(),
  author: z.string().nullable(),
  description: z.string(),
  artworkUrl: z.string().nullable(),
  language: z.string().nullable(),
  etag: z.string().nullable(),
  lastModified: z.string().nullable(),
  lastSyncedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const episodeRowSchema = z.object({
  id: z.string(),
  podcastId: z.string(),
  guid: z.string(),
  title: z.string(),
  description: z.string(),
  audioUrl: z.string(),
  mimeType: z.string().nullable(),
  artworkUrl: z.string().nullable(),
  publishedAt: z.number().nullable(),
  durationSeconds: z.number().nullable(),
  fileSizeBytes: z.number().nullable(),
  isExplicit: z.number().int().min(0).max(1),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const subscriptionColumns = `
  id,
  feed_url AS feedUrl,
  title,
  author,
  description,
  artwork_url AS artworkUrl,
  language,
  etag,
  last_modified AS lastModified,
  last_synced_at AS lastSyncedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const episodeColumns = `
  id,
  podcast_id AS podcastId,
  guid,
  title,
  description,
  audio_url AS audioUrl,
  mime_type AS mimeType,
  artwork_url AS artworkUrl,
  published_at AS publishedAt,
  duration_seconds AS durationSeconds,
  file_size_bytes AS fileSizeBytes,
  is_explicit AS isExplicit,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const saveSubscriptionSql = `
  INSERT INTO podcast_subscriptions (
    id, feed_url, title, author, description, artwork_url, language,
    etag, last_modified, last_synced_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(feed_url) DO UPDATE SET
    title = excluded.title,
    author = excluded.author,
    description = excluded.description,
    artwork_url = excluded.artwork_url,
    language = excluded.language,
    etag = excluded.etag,
    last_modified = excluded.last_modified,
    last_synced_at = excluded.last_synced_at,
    updated_at = excluded.updated_at
`;

const saveEpisodeSql = `
  INSERT INTO podcast_episodes (
    id, podcast_id, guid, title, description, audio_url, mime_type,
    artwork_url, published_at, duration_seconds, file_size_bytes,
    is_explicit, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(podcast_id, guid) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    audio_url = excluded.audio_url,
    mime_type = excluded.mime_type,
    artwork_url = excluded.artwork_url,
    published_at = excluded.published_at,
    duration_seconds = excluded.duration_seconds,
    file_size_bytes = excluded.file_size_bytes,
    is_explicit = excluded.is_explicit,
    updated_at = excluded.updated_at
`;

function mapSubscriptionRows(rows: DatabaseRow[]) {
  return subscriptionRowSchema.array().parse(rows);
}

function mapEpisodeRow(row: z.infer<typeof episodeRowSchema>): PodcastEpisode {
  return {
    ...row,
    isExplicit: row.isExplicit === 1,
  };
}

function mapEpisodeRows(rows: DatabaseRow[]) {
  return episodeRowSchema.array().parse(rows).map(mapEpisodeRow);
}

function toSubscriptionParameters(
  input: SavePodcastSubscriptionInput,
  now: number,
): Scalar[] {
  return [
    input.id,
    input.feedUrl,
    input.title,
    input.author,
    input.description,
    input.artworkUrl,
    input.language,
    input.etag,
    input.lastModified,
    input.lastSyncedAt,
    now,
    now,
  ];
}

function toEpisodeParameters(
  input: SavePodcastEpisodeInput,
  now: number,
): Scalar[] {
  return [
    input.id,
    input.podcastId,
    input.guid,
    input.title,
    input.description,
    input.audioUrl,
    input.mimeType,
    input.artworkUrl,
    input.publishedAt,
    input.durationSeconds,
    input.fileSizeBytes,
    input.isExplicit ? 1 : 0,
    now,
    now,
  ];
}

function normalizePageValue(value: number, fallback: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 0), maximum);
}

function assertValidEpisodeInput(episode: SavePodcastEpisodeInput) {
  if (
    episode.fileSizeBytes !== null &&
    (!Number.isSafeInteger(episode.fileSizeBytes) || episode.fileSizeBytes < 0)
  ) {
    throw new Error('fileSizeBytes must be a nonnegative safe integer.');
  }

  if (
    episode.durationSeconds !== null &&
    (!Number.isFinite(episode.durationSeconds) || episode.durationSeconds < 0)
  ) {
    throw new Error('durationSeconds must be a nonnegative finite number.');
  }
}

export async function savePodcastSubscription(
  input: SavePodcastSubscriptionInput,
) {
  const database = await getDatabase();
  const now = Date.now();

  await database.transaction(async transaction => {
    await transaction.execute(
      saveSubscriptionSql,
      toSubscriptionParameters(input, now),
    );
  });

  const subscription = await getPodcastSubscriptionByFeedUrl(input.feedUrl);

  if (subscription === null) {
    throw new Error('The saved podcast subscription could not be read.');
  }

  return subscription;
}

export async function updatePodcastFeedCacheMetadata(
  podcastId: string,
  metadata: PodcastFeedCacheMetadata,
) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute(
      `UPDATE podcast_subscriptions
       SET etag = ?, last_modified = ?, last_synced_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        metadata.etag,
        metadata.lastModified,
        metadata.lastSyncedAt,
        Date.now(),
        podcastId,
      ],
    );
  });
}

export async function getPodcastSubscriptionById(id: string) {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${subscriptionColumns}
     FROM podcast_subscriptions
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return mapSubscriptionRows(result.rows)[0] ?? null;
}

export async function getPodcastSubscriptionByFeedUrl(feedUrl: string) {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${subscriptionColumns}
     FROM podcast_subscriptions
     WHERE feed_url = ?
     LIMIT 1`,
    [feedUrl],
  );

  return mapSubscriptionRows(result.rows)[0] ?? null;
}

export async function listPodcastSubscriptions() {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${subscriptionColumns}
     FROM podcast_subscriptions
     ORDER BY title COLLATE NOCASE ASC`,
  );

  return mapSubscriptionRows(result.rows);
}

export async function deletePodcastSubscription(id: string) {
  const database = await getDatabase();
  let cachedFileUris: string[] = [];

  await database.transaction(async transaction => {
    const fileResult = await transaction.execute(
      `SELECT d.local_uri AS localUri, d.temporary_uri AS temporaryUri
       FROM downloads AS d
       INNER JOIN podcast_episodes AS e ON e.id = d.episode_id
       WHERE e.podcast_id = ?`,
      [id],
    );
    const fileRows = z
      .object({
        localUri: z.string().nullable(),
        temporaryUri: z.string().nullable(),
      })
      .array()
      .parse(fileResult.rows);

    cachedFileUris = [
      ...new Set(
        fileRows.flatMap(row =>
          [row.localUri, row.temporaryUri].filter(
            (uri): uri is string => uri !== null,
          ),
        ),
      ),
    ];

    await transaction.execute(
      'DELETE FROM podcast_subscriptions WHERE id = ?',
      [id],
    );
  });

  return cachedFileUris;
}

export async function savePodcastEpisodes(
  episodes: readonly SavePodcastEpisodeInput[],
) {
  if (episodes.length === 0) {
    return;
  }

  episodes.forEach(assertValidEpisodeInput);

  const database = await getDatabase();
  const now = Date.now();
  const parameters = episodes.map(episode =>
    toEpisodeParameters(episode, now),
  );

  await database.executeBatch([[saveEpisodeSql, parameters]]);
}

export async function savePodcastFeedSnapshot(
  subscriptionInput: SavePodcastSubscriptionInput,
  episodes: readonly SavePodcastEpisodeInput[],
) {
  episodes.forEach(assertValidEpisodeInput);
  const database = await getDatabase();
  const now = Date.now();

  await database.transaction(async transaction => {
    await transaction.execute(
      saveSubscriptionSql,
      toSubscriptionParameters(subscriptionInput, now),
    );

    if (episodes.length > 0) {
      for (const episode of episodes) {
        await transaction.execute(
          saveEpisodeSql,
          toEpisodeParameters(episode, now),
        );
      }
    }
  });

  const subscription = await getPodcastSubscriptionByFeedUrl(
    subscriptionInput.feedUrl,
  );

  if (subscription === null) {
    throw new Error('The saved podcast feed could not be read.');
  }

  return subscription;
}

export async function getPodcastEpisode(id: string) {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${episodeColumns}
     FROM podcast_episodes
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  const row = episodeRowSchema.array().parse(result.rows)[0];

  return row ? mapEpisodeRow(row) : null;
}

export async function deletePodcastEpisode(id: string) {
  const database = await getDatabase();
  let cachedFileUris: string[] = [];

  await database.transaction(async transaction => {
    const fileResult = await transaction.execute(
      `SELECT local_uri AS localUri, temporary_uri AS temporaryUri
       FROM downloads
       WHERE episode_id = ?`,
      [id],
    );
    const fileRow = z
      .object({
        localUri: z.string().nullable(),
        temporaryUri: z.string().nullable(),
      })
      .nullable()
      .parse(fileResult.rows[0] ?? null);

    cachedFileUris = fileRow
      ? [fileRow.localUri, fileRow.temporaryUri].filter(
          (uri): uri is string => uri !== null,
        )
      : [];

    await transaction.execute('DELETE FROM podcast_episodes WHERE id = ?', [
      id,
    ]);
  });

  return cachedFileUris;
}

export async function listPodcastEpisodes({
  podcastId,
  limit,
  offset,
}: PodcastEpisodePageInput) {
  const database = await getDatabase();
  const safeLimit = normalizePageValue(limit, 50, 200);
  const safeOffset = normalizePageValue(offset, 0, Number.MAX_SAFE_INTEGER);
  const result = await database.execute(
    `SELECT ${episodeColumns}
     FROM podcast_episodes
     WHERE podcast_id = ?
     ORDER BY published_at DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [podcastId, safeLimit, safeOffset],
  );

  return mapEpisodeRows(result.rows);
}

export async function countPodcastEpisodes(podcastId: string) {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT COUNT(*) AS count
     FROM podcast_episodes
     WHERE podcast_id = ?`,
    [podcastId],
  );
  const parsed = z
    .object({count: z.number().int().nonnegative()})
    .parse(result.rows[0]);

  return parsed.count;
}

export function observePodcastSubscriptions(
  onChange: (subscriptions: PodcastSubscription[]) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT ${subscriptionColumns}
            FROM podcast_subscriptions
            ORDER BY title COLLATE NOCASE ASC`,
    tables: ['podcast_subscriptions'],
    mapRows: mapSubscriptionRows,
    onChange,
    onError,
  });
}

export function observePodcastEpisodes(
  input: PodcastEpisodePageInput,
  onChange: (episodes: PodcastEpisode[]) => void,
  onError?: (error: Error) => void,
) {
  const safeLimit = normalizePageValue(input.limit, 50, 200);
  const safeOffset = normalizePageValue(
    input.offset,
    0,
    Number.MAX_SAFE_INTEGER,
  );

  return observeDatabaseQuery({
    query: `SELECT ${episodeColumns}
            FROM podcast_episodes
            WHERE podcast_id = ?
            ORDER BY published_at DESC, created_at DESC
            LIMIT ? OFFSET ?`,
    parameters: [input.podcastId, safeLimit, safeOffset],
    tables: ['podcast_episodes'],
    mapRows: mapEpisodeRows,
    onChange,
    onError,
  });
}
