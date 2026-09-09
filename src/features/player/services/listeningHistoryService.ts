import type {PersistedMediaType} from '../domain/persistence';
import {
  finishListeningHistory,
  startListeningHistory,
} from '../infrastructure/playbackPersistenceRepository';

export type ListeningMediaSummary = {
  mediaId: string;
  mediaType: PersistedMediaType;
  title: string;
  subtitle: string | null;
};

type ActiveListeningSession = ListeningMediaSummary & {
  historyId: number;
  activeSince: number;
  listenedSeconds: number;
  completed: boolean;
};

let activeSession: ActiveListeningSession | null = null;
let historyMutationChain: Promise<void> = Promise.resolve();

function enqueueHistoryMutation(operation: () => Promise<void>) {
  historyMutationChain = historyMutationChain.then(operation, operation).catch(
    () => undefined,
  );
}

function addElapsedTime(session: ActiveListeningSession, now: number) {
  const elapsedSeconds = Math.max(0, (now - session.activeSince) / 1_000);

  session.listenedSeconds += elapsedSeconds;
  session.activeSince = now;
}

async function finishActiveSession(now: number, completed = false) {
  if (!activeSession) {
    return;
  }

  addElapsedTime(activeSession, now);
  await finishListeningHistory(
    activeSession.historyId,
    now,
    activeSession.listenedSeconds,
    completed || activeSession.completed,
  );
  activeSession = null;
}

async function startSession(media: ListeningMediaSummary, now: number) {
  if (
    activeSession?.mediaId === media.mediaId &&
    activeSession.mediaType === media.mediaType
  ) {
    return;
  }

  await finishActiveSession(now);
  const historyId = await startListeningHistory({
    ...media,
    startedAt: now,
  });

  activeSession = {
    ...media,
    activeSince: now,
    historyId,
    listenedSeconds: 0,
    completed: false,
  };
}

export function recordListeningStarted(media: ListeningMediaSummary | null) {
  if (!media) {
    return;
  }

  const now = Date.now();
  enqueueHistoryMutation(() => startSession(media, now));
}

export function recordListeningPaused() {
  const now = Date.now();
  enqueueHistoryMutation(() => finishActiveSession(now));
}

export function recordListeningTransition(
  media: ListeningMediaSummary | null,
  isPlaying: boolean,
) {
  const now = Date.now();

  enqueueHistoryMutation(async () => {
    if (
      activeSession &&
      media &&
      activeSession.mediaId === media.mediaId &&
      activeSession.mediaType === media.mediaType
    ) {
      return;
    }

    await finishActiveSession(now);

    if (media && isPlaying) {
      await startSession(media, now);
    }
  });
}

export function checkpointListeningHistory(
  mediaId: string,
  completed: boolean,
) {
  const now = Date.now();

  enqueueHistoryMutation(async () => {
    if (!activeSession || activeSession.mediaId !== mediaId) {
      return;
    }

    addElapsedTime(activeSession, now);
    activeSession.completed = activeSession.completed || completed;
    await finishListeningHistory(
      activeSession.historyId,
      now,
      activeSession.listenedSeconds,
      activeSession.completed,
    );
  });
}
