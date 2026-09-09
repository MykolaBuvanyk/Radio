import type {DB, Transaction} from '@op-engineering/op-sqlite';

type DatabaseMigration = {
  version: number;
  statements: readonly string[];
};

const CURRENT_DATABASE_VERSION = 3;

const migrations: readonly DatabaseMigration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE podcast_subscriptions (
        id TEXT PRIMARY KEY NOT NULL,
        feed_url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        author TEXT,
        description TEXT NOT NULL DEFAULT '',
        artwork_url TEXT,
        language TEXT,
        etag TEXT,
        last_modified TEXT,
        last_synced_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT`,
      `CREATE TABLE podcast_episodes (
        id TEXT PRIMARY KEY NOT NULL,
        podcast_id TEXT NOT NULL,
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        audio_url TEXT NOT NULL,
        mime_type TEXT,
        artwork_url TEXT,
        published_at INTEGER,
        duration_seconds REAL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
        file_size_bytes INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
        is_explicit INTEGER NOT NULL DEFAULT 0 CHECK (is_explicit IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (podcast_id) REFERENCES podcast_subscriptions(id) ON DELETE CASCADE,
        UNIQUE (podcast_id, guid)
      ) STRICT`,
      `CREATE TABLE episode_playback_positions (
        episode_id TEXT PRIMARY KEY NOT NULL,
        position_seconds REAL NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
        duration_seconds REAL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (episode_id) REFERENCES podcast_episodes(id) ON DELETE CASCADE
      ) STRICT`,
      `CREATE TABLE downloads (
        episode_id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL CHECK (
          status IN ('queued', 'downloading', 'paused', 'completed', 'failed')
        ),
        local_uri TEXT,
        temporary_uri TEXT,
        bytes_downloaded INTEGER NOT NULL DEFAULT 0 CHECK (bytes_downloaded >= 0),
        total_bytes INTEGER CHECK (total_bytes IS NULL OR total_bytes >= 0),
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        last_accessed_at INTEGER NOT NULL,
        FOREIGN KEY (episode_id) REFERENCES podcast_episodes(id) ON DELETE CASCADE
      ) STRICT`,
      `CREATE TABLE queue_items (
        id TEXT PRIMARY KEY NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('radio', 'episode')),
        media_id TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        source_url TEXT NOT NULL,
        artwork_url TEXT,
        mime_type TEXT,
        duration_seconds REAL,
        sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
        added_at INTEGER NOT NULL,
        UNIQUE (media_type, media_id)
      ) STRICT`,
      `CREATE TABLE listening_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_type TEXT NOT NULL CHECK (media_type IN ('radio', 'episode')),
        media_id TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER CHECK (ended_at IS NULL OR ended_at >= started_at),
        listened_seconds REAL NOT NULL DEFAULT 0 CHECK (listened_seconds >= 0),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1))
      ) STRICT`,
      `CREATE INDEX podcast_episodes_podcast_published_idx
        ON podcast_episodes (podcast_id, published_at DESC)`,
      `CREATE INDEX downloads_status_updated_idx
        ON downloads (status, updated_at DESC)`,
      `CREATE INDEX downloads_cache_access_idx
        ON downloads (status, last_accessed_at ASC)`,
      `CREATE INDEX queue_items_sort_order_idx
        ON queue_items (sort_order ASC)`,
      `CREATE INDEX listening_history_started_idx
        ON listening_history (started_at DESC)`,
      `CREATE INDEX listening_history_media_idx
        ON listening_history (media_type, media_id, started_at DESC)`,
      `CREATE TRIGGER podcast_episode_queue_cleanup
        AFTER DELETE ON podcast_episodes
        BEGIN
          DELETE FROM queue_items
          WHERE media_type = 'episode' AND media_id = OLD.id;
        END`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TRIGGER podcast_episode_queue_sync
        AFTER UPDATE OF title, audio_url, artwork_url, mime_type, duration_seconds
        ON podcast_episodes
        BEGIN
          UPDATE queue_items
          SET title = NEW.title,
              source_url = NEW.audio_url,
              artwork_url = NEW.artwork_url,
              mime_type = NEW.mime_type,
              duration_seconds = NEW.duration_seconds
          WHERE media_type = 'episode' AND media_id = NEW.id;
        END`,
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE download_cache_settings (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        max_size_bytes INTEGER NOT NULL CHECK (max_size_bytes > 0),
        updated_at INTEGER NOT NULL
      ) STRICT`,
      `INSERT INTO download_cache_settings (id, max_size_bytes, updated_at)
       VALUES (1, 524288000, 0)`,
    ],
  },
];

function readUserVersion(rows: Array<Record<string, unknown>>) {
  const value = rows[0]?.user_version;

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('The SQLite schema version is invalid.');
  }

  return value;
}

async function applyMigration(
  database: DB,
  migration: DatabaseMigration,
) {
  await database.transaction(async (transaction: Transaction) => {
    for (const statement of migration.statements) {
      await transaction.execute(statement);
    }

    await transaction.execute(`PRAGMA user_version = ${migration.version}`);
  });
}

export async function runDatabaseMigrations(database: DB) {
  const versionResult = await database.execute('PRAGMA user_version');
  let currentVersion = readUserVersion(versionResult.rows);

  if (currentVersion > CURRENT_DATABASE_VERSION) {
    throw new Error(
      'The SQLite database was created by a newer application version.',
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    if (migration.version !== currentVersion + 1) {
      throw new Error('The SQLite migration sequence is incomplete.');
    }

    await applyMigration(database, migration);
    currentVersion = migration.version;
  }
}
