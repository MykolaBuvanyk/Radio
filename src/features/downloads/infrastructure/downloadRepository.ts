import {z} from 'zod';

import {
  getDatabase,
  observeDatabaseQuery,
  type DatabaseRow,
} from '../../../shared/database/database';
import type {
  DownloadCacheSettings,
  DownloadProgressInput,
  DownloadStatus,
  EpisodeDownload,
  EpisodeDownloadListItem,
} from '../domain/download';

const downloadStatusSchema = z.enum([
  'queued',
  'downloading',
  'paused',
  'completed',
  'failed',
]);

const downloadRowSchema = z.object({
  episodeId: z.string(),
  status: downloadStatusSchema,
  localUri: z.string().nullable(),
  temporaryUri: z.string().nullable(),
  bytesDownloaded: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),
  lastAccessedAt: z.number(),
});

const cacheSizeRowSchema = z.object({
  bytes: z.number().nonnegative(),
});

const downloadListItemRowSchema = downloadRowSchema.extend({
  episodeTitle: z.string(),
  podcastTitle: z.string(),
});

const cacheSettingsRowSchema = z.object({
  maxSizeBytes: z.number().int().positive(),
  updatedAt: z.number(),
});

const downloadColumns = `
  episode_id AS episodeId,
  status,
  local_uri AS localUri,
  temporary_uri AS temporaryUri,
  bytes_downloaded AS bytesDownloaded,
  total_bytes AS totalBytes,
  error_message AS errorMessage,
  created_at AS createdAt,
  updated_at AS updatedAt,
  completed_at AS completedAt,
  last_accessed_at AS lastAccessedAt
`;

const qualifiedDownloadColumns = `
  d.episode_id AS episodeId,
  d.status AS status,
  d.local_uri AS localUri,
  d.temporary_uri AS temporaryUri,
  d.bytes_downloaded AS bytesDownloaded,
  d.total_bytes AS totalBytes,
  d.error_message AS errorMessage,
  d.created_at AS createdAt,
  d.updated_at AS updatedAt,
  d.completed_at AS completedAt,
  d.last_accessed_at AS lastAccessedAt
`;

function mapDownloadRows(rows: DatabaseRow[]) {
  return downloadRowSchema.array().parse(rows);
}

function mapDownloadListItemRows(rows: DatabaseRow[]) {
  return downloadListItemRowSchema.array().parse(rows);
}

function assertByteCount(value: number, fieldName: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a nonnegative safe integer.`);
  }
}

function normalizeLimit(value: number) {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 500);
}

export async function enqueueEpisodeDownload(
  episodeId: string,
  temporaryUri: string | null,
) {
  const database = await getDatabase();
  const now = Date.now();

  await database.transaction(async transaction => {
    await transaction.execute(
      `INSERT INTO downloads (
         episode_id, status, temporary_uri, created_at, updated_at,
         last_accessed_at
       ) VALUES (?, 'queued', ?, ?, ?, ?)
       ON CONFLICT(episode_id) DO UPDATE SET
         status = 'queued',
         local_uri = NULL,
         temporary_uri = excluded.temporary_uri,
         bytes_downloaded = 0,
         total_bytes = NULL,
         error_message = NULL,
         updated_at = excluded.updated_at,
         completed_at = NULL,
         last_accessed_at = excluded.last_accessed_at
       WHERE downloads.status <> 'completed'`,
      [episodeId, temporaryUri, now, now, now],
    );
  });
}

export async function updateEpisodeDownloadProgress({
  episodeId,
  bytesDownloaded,
  totalBytes,
  temporaryUri,
}: DownloadProgressInput) {
  assertByteCount(bytesDownloaded, 'bytesDownloaded');

  if (totalBytes !== null) {
    assertByteCount(totalBytes, 'totalBytes');
  }

  const database = await getDatabase();

  await database.transaction(async transaction => {
    const result = await transaction.execute(
      `UPDATE downloads
       SET status = 'downloading',
           temporary_uri = ?,
           bytes_downloaded = ?,
           total_bytes = ?,
           error_message = NULL,
           updated_at = ?
       WHERE episode_id = ?`,
      [temporaryUri, bytesDownloaded, totalBytes, Date.now(), episodeId],
    );

    if (result.rowsAffected !== 1) {
      throw new Error('The download progress record does not exist.');
    }
  });
}

export async function pauseEpisodeDownload(episodeId: string) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute(
      `UPDATE downloads
       SET status = 'paused', updated_at = ?
       WHERE episode_id = ? AND status IN ('queued', 'downloading')`,
      [Date.now(), episodeId],
    );
  });
}

export async function recoverInterruptedEpisodeDownloads() {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute(
      `UPDATE downloads
       SET status = 'queued', updated_at = ?
       WHERE status = 'downloading'`,
      [Date.now()],
    );
  });
}

export async function resumeEpisodeDownload(episodeId: string) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute(
      `UPDATE downloads
       SET status = 'queued', error_message = NULL, updated_at = ?
       WHERE episode_id = ? AND status IN ('paused', 'failed')`,
      [Date.now(), episodeId],
    );
  });
}

export async function markEpisodeDownloadFailed(
  episodeId: string,
  errorMessage: string,
) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    const result = await transaction.execute(
      `UPDATE downloads
       SET status = 'failed', error_message = ?, updated_at = ?
       WHERE episode_id = ?`,
      [errorMessage, Date.now(), episodeId],
    );

    if (result.rowsAffected !== 1) {
      throw new Error('The failed download record does not exist.');
    }
  });
}

export async function markEpisodeDownloadCompleted(
  episodeId: string,
  localUri: string,
  totalBytes: number,
) {
  assertByteCount(totalBytes, 'totalBytes');
  const database = await getDatabase();
  const now = Date.now();

  await database.transaction(async transaction => {
    const result = await transaction.execute(
      `UPDATE downloads
       SET status = 'completed',
           local_uri = ?,
           temporary_uri = NULL,
           bytes_downloaded = ?,
           total_bytes = ?,
           error_message = NULL,
           updated_at = ?,
           completed_at = ?,
           last_accessed_at = ?
       WHERE episode_id = ?`,
      [localUri, totalBytes, totalBytes, now, now, now, episodeId],
    );

    if (result.rowsAffected !== 1) {
      throw new Error('The completed download record does not exist.');
    }
  });
}

export async function touchEpisodeDownload(episodeId: string) {
  const database = await getDatabase();

  await database.transaction(async transaction => {
    await transaction.execute(
      'UPDATE downloads SET last_accessed_at = ? WHERE episode_id = ?',
      [Date.now(), episodeId],
    );
  });
}

export async function getEpisodeDownload(
  episodeId: string,
): Promise<EpisodeDownload | null> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${downloadColumns}
     FROM downloads
     WHERE episode_id = ?
     LIMIT 1`,
    [episodeId],
  );

  return mapDownloadRows(result.rows)[0] ?? null;
}

export async function listEpisodeDownloads(
  statuses?: readonly DownloadStatus[],
) {
  const database = await getDatabase();

  if (!statuses || statuses.length === 0) {
    const result = await database.execute(
      `SELECT ${downloadColumns}
       FROM downloads
       ORDER BY updated_at DESC`,
    );

    return mapDownloadRows(result.rows);
  }

  const validatedStatuses = downloadStatusSchema.array().parse(statuses);
  const placeholders = validatedStatuses.map(() => '?').join(', ');
  const result = await database.execute(
    `SELECT ${downloadColumns}
     FROM downloads
     WHERE status IN (${placeholders})
     ORDER BY updated_at DESC`,
    validatedStatuses,
  );

  return mapDownloadRows(result.rows);
}

export async function listDownloadCacheEvictionCandidates(limit = 100) {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT ${downloadColumns}
     FROM downloads
     WHERE status = 'completed' AND local_uri IS NOT NULL
     ORDER BY last_accessed_at ASC
     LIMIT ?`,
    [normalizeLimit(limit)],
  );

  return mapDownloadRows(result.rows);
}

export async function getCompletedDownloadCacheSize() {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT COALESCE(SUM(total_bytes), 0) AS bytes
     FROM downloads
     WHERE status = 'completed'`,
  );

  return cacheSizeRowSchema.parse(result.rows[0]).bytes;
}

export async function deleteEpisodeDownload(episodeId: string) {
  const database = await getDatabase();
  let deletedDownload: EpisodeDownload | null = null;

  await database.transaction(async transaction => {
    const result = await transaction.execute(
      `SELECT ${downloadColumns}
       FROM downloads
       WHERE episode_id = ?
       LIMIT 1`,
      [episodeId],
    );

    deletedDownload = mapDownloadRows(result.rows)[0] ?? null;
    await transaction.execute('DELETE FROM downloads WHERE episode_id = ?', [
      episodeId,
    ]);
  });

  return deletedDownload;
}

export function observeEpisodeDownloads(
  onChange: (downloads: EpisodeDownload[]) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT ${downloadColumns}
            FROM downloads
            ORDER BY updated_at DESC`,
    tables: ['downloads'],
    mapRows: mapDownloadRows,
    onChange,
    onError,
  });
}

export function observeEpisodeDownloadListItems(
  onChange: (downloads: EpisodeDownloadListItem[]) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT ${qualifiedDownloadColumns},
                   e.title AS episodeTitle,
                   p.title AS podcastTitle
            FROM downloads AS d
            INNER JOIN podcast_episodes AS e ON e.id = d.episode_id
            INNER JOIN podcast_subscriptions AS p ON p.id = e.podcast_id
            ORDER BY d.updated_at DESC`,
    tables: ['downloads', 'podcast_episodes', 'podcast_subscriptions'],
    mapRows: mapDownloadListItemRows,
    onChange,
    onError,
  });
}

export async function getDownloadCacheSettings(): Promise<DownloadCacheSettings> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT max_size_bytes AS maxSizeBytes, updated_at AS updatedAt
     FROM download_cache_settings
     WHERE id = 1`,
  );

  return cacheSettingsRowSchema.parse(result.rows[0]);
}

export async function updateDownloadCacheLimit(maxSizeBytes: number) {
  assertByteCount(maxSizeBytes, 'maxSizeBytes');

  if (maxSizeBytes === 0) {
    throw new Error('The cache limit must be greater than zero.');
  }

  const database = await getDatabase();
  await database.transaction(async transaction => {
    await transaction.execute(
      `UPDATE download_cache_settings
       SET max_size_bytes = ?, updated_at = ?
       WHERE id = 1`,
      [maxSizeBytes, Date.now()],
    );
  });
}

export function observeDownloadCacheSettings(
  onChange: (settings: DownloadCacheSettings) => void,
  onError?: (error: Error) => void,
) {
  return observeDatabaseQuery({
    query: `SELECT max_size_bytes AS maxSizeBytes, updated_at AS updatedAt
            FROM download_cache_settings
            WHERE id = 1`,
    tables: ['download_cache_settings'],
    mapRows: rows => cacheSettingsRowSchema.parse(rows[0]),
    onChange,
    onError,
  });
}
