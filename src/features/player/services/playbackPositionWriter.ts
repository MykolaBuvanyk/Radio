import type {SaveEpisodePlaybackPositionInput} from '../domain/persistence';
import {saveEpisodePlaybackPositions} from '../infrastructure/playbackPersistenceRepository';

const POSITION_FLUSH_INTERVAL_MS = 10_000;

const pendingPositions = new Map<
  string,
  SaveEpisodePlaybackPositionInput
>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let activeFlush: Promise<void> | null = null;

function scheduleFlush() {
  if (flushTimer !== null) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushPendingPlaybackPositions().catch(() => {
      scheduleFlush();
    });
  }, POSITION_FLUSH_INTERVAL_MS);
}

export function queueEpisodePlaybackPosition(
  position: SaveEpisodePlaybackPositionInput,
) {
  pendingPositions.set(position.episodeId, {...position});
  scheduleFlush();
}

export async function flushPendingPlaybackPositions(): Promise<void> {
  if (activeFlush !== null) {
    await activeFlush;

    if (pendingPositions.size > 0) {
      await flushPendingPlaybackPositions();
    }

    return;
  }

  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (pendingPositions.size === 0) {
    return;
  }

  const positionsToSave = [...pendingPositions.values()];
  pendingPositions.clear();

  activeFlush = saveEpisodePlaybackPositions(positionsToSave);

  try {
    await activeFlush;
  } catch (error) {
    for (const position of positionsToSave) {
      if (!pendingPositions.has(position.episodeId)) {
        pendingPositions.set(position.episodeId, position);
      }
    }

    throw error;
  } finally {
    activeFlush = null;

    if (pendingPositions.size > 0) {
      scheduleFlush();
    }
  }
}
