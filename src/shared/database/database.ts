import {
  openAsync,
  type DB,
  type Scalar,
} from '@op-engineering/op-sqlite';

import {runDatabaseMigrations} from './migrations';

const DATABASE_NAME = 'radio.sqlite';

let databasePromise: Promise<DB> | null = null;

async function openApplicationDatabase() {
  const database = await openAsync({name: DATABASE_NAME});

  await database.execute('PRAGMA foreign_keys = ON');
  await database.execute('PRAGMA journal_mode = WAL');
  await database.execute('PRAGMA synchronous = NORMAL');
  await database.execute('PRAGMA busy_timeout = 5000');
  await runDatabaseMigrations(database);

  return database;
}

export function getDatabase() {
  if (databasePromise === null) {
    databasePromise = openApplicationDatabase();
  }

  return databasePromise;
}

export async function initializeDatabase() {
  await getDatabase();
}

export type DatabaseRow = Record<string, unknown>;

export type ObserveDatabaseQueryInput<T> = {
  query: string;
  parameters?: Scalar[];
  tables: readonly string[];
  mapRows: (rows: DatabaseRow[]) => T;
  onChange: (value: T) => void;
  onError?: (error: Error) => void;
};

function readReactiveRows(response: unknown): DatabaseRow[] {
  if (typeof response !== 'object' || response === null) {
    throw new Error('SQLite returned an invalid reactive query response.');
  }

  const rows = (response as {rows?: unknown}).rows;

  if (!Array.isArray(rows)) {
    throw new Error('SQLite returned invalid reactive query rows.');
  }

  return rows.map(row => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('SQLite returned an invalid row.');
    }

    return row as DatabaseRow;
  });
}

function toError(value: unknown) {
  return value instanceof Error
    ? value
    : new Error('An unknown SQLite error occurred.');
}

export function observeDatabaseQuery<T>({
  query,
  parameters = [],
  tables,
  mapRows,
  onChange,
  onError,
}: ObserveDatabaseQueryInput<T>) {
  let isDisposed = false;
  let unsubscribe: (() => void) | null = null;

  getDatabase()
    .then(database => {
      if (isDisposed) {
        return;
      }

      unsubscribe = database.reactiveExecute({
        query,
        arguments: parameters,
        fireOn: tables.map(table => ({table})),
        callback: (response: unknown) => {
          if (isDisposed) {
            return;
          }

          try {
            onChange(mapRows(readReactiveRows(response)));
          } catch (error) {
            onError?.(toError(error));
          }
        },
      });

      return database.execute(query, parameters).then(result => {
        if (!isDisposed) {
          onChange(mapRows(result.rows));
        }
      });
    })
    .catch(error => onError?.(toError(error)));

  return () => {
    isDisposed = true;
    unsubscribe?.();
  };
}
