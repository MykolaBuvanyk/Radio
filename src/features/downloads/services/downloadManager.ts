import type {PodcastEpisode} from '../../podcasts/domain/podcastEpisode';
import {getPodcastEpisode} from '../../podcasts/infrastructure/podcastRepository';
import {
  getActiveMediaId,
  isEpisodePlaybackQueueActive,
  replaceTrackPlayerQueueItem,
} from '../../player/infrastructure/trackPlayerAdapter';
import type {PlaybackQueueItem} from '../../player/domain/persistence';
import {listPlaybackQueue} from '../../player/infrastructure/playbackPersistenceRepository';
import {
  appendFile,
  deleteFileIfPresent,
  ensureEpisodeDownloadDirectory,
  fileExists,
  getEpisodeDownloadPaths,
  getFileSize,
  moveFile,
  startFileDownload,
  type FileDownloadTask,
} from '../infrastructure/downloadFileAdapter';
import {
  deleteEpisodeDownload,
  enqueueEpisodeDownload,
  getCompletedDownloadCacheSize,
  getDownloadCacheSettings,
  getEpisodeDownload,
  listDownloadCacheEvictionCandidates,
  listEpisodeDownloads,
  markEpisodeDownloadCompleted,
  markEpisodeDownloadFailed,
  pauseEpisodeDownload,
  recoverInterruptedEpisodeDownloads,
  resumeEpisodeDownload,
  touchEpisodeDownload,
  updateDownloadCacheLimit,
  updateEpisodeDownloadProgress,
} from '../infrastructure/downloadRepository';

const MAX_CONCURRENT_DOWNLOADS = 2;
const PROGRESS_PERSIST_INTERVAL_MS = 750;
const PROGRESS_PERSIST_BYTE_INTERVAL = 256 * 1024;

type CancellationReason = 'pause' | 'delete';

type ActiveDownload = {
  cancelReason: CancellationReason | null;
  task: FileDownloadTask;
};

const activeDownloads = new Map<string, ActiveDownload>();
const scheduledEpisodeIds = new Set<string>();
const blockedEpisodeIds = new Set<string>();
let isInitialized = false;
let pumpPromise: Promise<void> | null = null;

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('enospc') ||
    normalized.includes('no space') ||
    normalized.includes('disk full')
  ) {
    return 'There is not enough storage space to save this episode.';
  }

  if (normalized.includes('timeout')) {
    return 'The download timed out. You can retry it.';
  }

  return 'The episode could not be downloaded. Check your connection and retry.';
}

function getEpisodeExtension(episode: PodcastEpisode) {
  const mimeExtension: Readonly<Record<string, string>> = {
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
  };
  const mimeType = episode.mimeType?.split(';')[0]?.trim().toLowerCase();

  const knownMimeExtension = mimeType ? mimeExtension[mimeType] : undefined;

  if (knownMimeExtension) {
    return knownMimeExtension;
  }

  try {
    const extension = new URL(episode.audioUrl).pathname
      .split('.')
      .pop()
      ?.toLowerCase();

    if (extension && /^(aac|flac|m4a|mp3|mp4|ogg|opus|wav)$/.test(extension)) {
      return extension;
    }
  } catch {
    // The feed parser already validates playable URLs; use a safe fallback.
  }

  return 'audio';
}

function parseExpectedTotal(
  headers: Readonly<Record<string, string>>,
  status: number,
  rangeStart: number,
) {
  const contentRange = headers['content-range'];
  const rangeMatch = contentRange?.match(/bytes\s+(\d+)-(\d+)\/(\d+|\*)/i);

  if (status === 206 && rangeMatch) {
    const responseStart = Number(rangeMatch[1]);
    const responseEnd = Number(rangeMatch[2]);
    const total = rangeMatch[3] === '*' ? null : Number(rangeMatch[3]);

    if (responseStart !== rangeStart || responseEnd < responseStart) {
      throw new Error('The server returned an invalid byte range.');
    }

    return total !== null && Number.isSafeInteger(total) ? total : null;
  }

  const contentLength = Number(headers['content-length']);

  return Number.isSafeInteger(contentLength) && contentLength >= 0
    ? contentLength
    : null;
}

async function updateRuntimeQueueSource(
  episodeId: string,
  sourceUrl: string,
) {
  if (
    !isEpisodePlaybackQueueActive() ||
    getActiveMediaId() === episodeId
  ) {
    return;
  }

  const queue = await listPlaybackQueue();
  const index = queue.findIndex(
    item => item.mediaType === 'episode' && item.mediaId === episodeId,
  );

  if (index >= 0) {
    const queueItem = queue[index];

    if (queueItem) {
      replaceTrackPlayerQueueItem(index, {...queueItem, sourceUrl});
    }
  }
}

async function persistProgress(
  episodeId: string,
  temporaryUri: string,
  bytesDownloaded: number,
  totalBytes: number | null,
) {
  await updateEpisodeDownloadProgress({
    bytesDownloaded,
    episodeId,
    temporaryUri,
    totalBytes,
  });
}

async function runDownload(episodeId: string) {
  if (blockedEpisodeIds.has(episodeId)) {
    return;
  }

  const queuedDownload = await getEpisodeDownload(episodeId);

  if (queuedDownload?.status !== 'queued') {
    return;
  }

  const episode = await getPodcastEpisode(episodeId);

  if (!episode) {
    await markEpisodeDownloadFailed(
      episodeId,
      'This episode is no longer available in the library.',
    );
    return;
  }

  const directory = await ensureEpisodeDownloadDirectory();
  const paths = getEpisodeDownloadPaths(
    directory,
    episode.id,
    getEpisodeExtension(episode),
  );
  await deleteFileIfPresent(paths.segmentPath);
  const partialSize = (await getFileSize(paths.partialPath)) ?? 0;

  if (
    blockedEpisodeIds.has(episodeId) ||
    (await getEpisodeDownload(episodeId))?.status !== 'queued'
  ) {
    return;
  }

  let lastPersistedBytes = partialSize;
  let lastPersistedAt = 0;
  let progressWriteChain: Promise<void> = Promise.resolve();
  const task = startFileDownload(
    episode.audioUrl,
    paths.segmentPath,
    partialSize,
    progress => {
      const active = activeDownloads.get(episodeId);

      if (!active || active.cancelReason) {
        return;
      }

      const currentBytes = partialSize + progress.receivedBytes;
      const now = Date.now();
      const shouldPersist =
        now - lastPersistedAt >= PROGRESS_PERSIST_INTERVAL_MS &&
        (currentBytes - lastPersistedBytes >= PROGRESS_PERSIST_BYTE_INTERVAL ||
          lastPersistedAt === 0);

      if (!shouldPersist) {
        return;
      }

      lastPersistedAt = now;
      lastPersistedBytes = currentBytes;
      const totalBytes = progress.totalBytes
        ? partialSize + progress.totalBytes
        : null;

      progressWriteChain = progressWriteChain
        .then(() =>
          persistProgress(
            episodeId,
            paths.partialPath,
            currentBytes,
            totalBytes,
          ),
        )
        .catch(() => undefined);
    },
  );
  const activeDownload: ActiveDownload = {cancelReason: null, task};
  activeDownloads.set(episodeId, activeDownload);

  try {
    await persistProgress(
      episodeId,
      paths.partialPath,
      partialSize,
      episode.fileSizeBytes,
    );
    const response = await task.promise;

    if (response.status === 416 && partialSize > 0) {
      const completeRange = response.headers['content-range']?.match(
        /bytes\s+\*\/(\d+)/i,
      );
      const serverSize = Number(completeRange?.[1]);

      if (Number.isSafeInteger(serverSize) && serverSize === partialSize) {
        await progressWriteChain;
        await deleteFileIfPresent(paths.segmentPath);
        await moveFile(paths.partialPath, paths.finalPath);
        await markEpisodeDownloadCompleted(
          episodeId,
          paths.finalPath,
          partialSize,
        );
        await updateRuntimeQueueSource(episodeId, paths.finalPath);
        await enforceDownloadCacheLimit();
        return;
      }
    }

    if (response.status !== 200 && response.status !== 206) {
      throw new Error(`The download server returned HTTP ${response.status}.`);
    }

    const expectedTotal = parseExpectedTotal(
      response.headers,
      response.status,
      partialSize,
    );

    if (response.status === 206 && partialSize > 0) {
      await appendFile(paths.segmentPath, paths.partialPath);
      await deleteFileIfPresent(paths.segmentPath);
    } else {
      await moveFile(paths.segmentPath, paths.partialPath);
    }

    const finalSize = await getFileSize(paths.partialPath);

    if (finalSize === null || finalSize <= 0) {
      throw new Error('The downloaded file is empty.');
    }

    if (expectedTotal !== null && finalSize !== expectedTotal) {
      throw new Error('The downloaded file is incomplete.');
    }

    await progressWriteChain;
    await moveFile(paths.partialPath, paths.finalPath);
    await markEpisodeDownloadCompleted(episodeId, paths.finalPath, finalSize);
    await updateRuntimeQueueSource(episodeId, paths.finalPath);
    await enforceDownloadCacheLimit();
  } catch (error) {
    if (activeDownload.cancelReason === 'pause') {
      await progressWriteChain;
      const segmentSize = (await getFileSize(paths.segmentPath)) ?? 0;

      if (segmentSize > 0) {
        if (partialSize > 0) {
          await appendFile(paths.segmentPath, paths.partialPath);
          await deleteFileIfPresent(paths.segmentPath);
        } else {
          await moveFile(paths.segmentPath, paths.partialPath);
        }
      } else {
        await deleteFileIfPresent(paths.segmentPath).catch(() => undefined);
      }

      const persistedSize = (await getFileSize(paths.partialPath)) ?? 0;
      await persistProgress(
        episodeId,
        paths.partialPath,
        persistedSize,
        null,
      ).catch(() => undefined);
      await pauseEpisodeDownload(episodeId);
    } else if (activeDownload.cancelReason !== 'delete') {
      await deleteFileIfPresent(paths.segmentPath).catch(() => undefined);
      await markEpisodeDownloadFailed(episodeId, getErrorMessage(error));
    } else {
      await deleteFileIfPresent(paths.segmentPath).catch(() => undefined);
    }
  } finally {
    activeDownloads.delete(episodeId);
  }
}

async function pumpDownloads() {
  while (
    activeDownloads.size + scheduledEpisodeIds.size <
    MAX_CONCURRENT_DOWNLOADS
  ) {
    const queued = await listEpisodeDownloads(['queued']);
    const next = [...queued].reverse().find(
      item =>
        !activeDownloads.has(item.episodeId) &&
        !scheduledEpisodeIds.has(item.episodeId),
    );

    if (!next) {
      return;
    }

    scheduledEpisodeIds.add(next.episodeId);
    runDownload(next.episodeId)
      .catch(async error => {
        await markEpisodeDownloadFailed(
          next.episodeId,
          getErrorMessage(error),
        ).catch(() => undefined);
      })
      .finally(() => {
        scheduledEpisodeIds.delete(next.episodeId);
        scheduleDownloadPump();
      });
  }
}

function scheduleDownloadPump() {
  if (pumpPromise) {
    return;
  }

  pumpPromise = pumpDownloads()
    .catch(() => undefined)
    .finally(() => {
      pumpPromise = null;
    });
}

export async function initializeDownloadManager() {
  if (isInitialized) {
    return;
  }

  await ensureEpisodeDownloadDirectory();
  await recoverInterruptedEpisodeDownloads();
  const completedDownloads = await listEpisodeDownloads(['completed']);

  for (const download of completedDownloads) {
    const storedSize = download.localUri
      ? await getFileSize(download.localUri)
      : null;

    if (
      storedSize === null ||
      (download.totalBytes !== null && storedSize !== download.totalBytes)
    ) {
      await deleteFileIfPresent(download.localUri);
      await deleteEpisodeDownload(download.episodeId);
    }
  }

  isInitialized = true;
  scheduleDownloadPump();
}

export async function enqueueDownload(episode: PodcastEpisode) {
  blockedEpisodeIds.delete(episode.id);
  const directory = await ensureEpisodeDownloadDirectory();
  const paths = getEpisodeDownloadPaths(
    directory,
    episode.id,
    getEpisodeExtension(episode),
  );
  const existing = await getEpisodeDownload(episode.id);

  if (
    existing?.status === 'completed' &&
    existing.localUri &&
    (await fileExists(existing.localUri))
  ) {
    await touchEpisodeDownload(episode.id);
    return;
  }

  if (existing?.status === 'completed') {
    await deleteEpisodeDownload(episode.id);
  }

  await enqueueEpisodeDownload(episode.id, paths.partialPath);
  scheduleDownloadPump();
}

export async function pauseDownload(episodeId: string) {
  blockedEpisodeIds.add(episodeId);
  const active = activeDownloads.get(episodeId);

  if (active) {
    active.cancelReason = 'pause';
    active.task.cancel();
  }

  await pauseEpisodeDownload(episodeId);
}

export async function resumeDownload(episodeId: string) {
  blockedEpisodeIds.delete(episodeId);
  await resumeEpisodeDownload(episodeId);
  scheduleDownloadPump();
}

export async function removeDownload(episodeId: string) {
  if (getActiveMediaId() === episodeId) {
    throw new Error('Switch to another item before deleting this download.');
  }

  blockedEpisodeIds.add(episodeId);

  const active = activeDownloads.get(episodeId);

  if (active) {
    active.cancelReason = 'delete';
    active.task.cancel();
  }

  const download = await getEpisodeDownload(episodeId);
  const episode = await getPodcastEpisode(episodeId);

  if (episode) {
    await updateRuntimeQueueSource(episodeId, episode.audioUrl);
  }

  await deleteFileIfPresent(download?.localUri ?? null);
  await deleteFileIfPresent(download?.temporaryUri ?? null);

  if (episode) {
    const directory = await ensureEpisodeDownloadDirectory();
    const paths = getEpisodeDownloadPaths(
      directory,
      episode.id,
      getEpisodeExtension(episode),
    );

    await deleteFileIfPresent(paths.partialPath);
    await deleteFileIfPresent(paths.segmentPath);
  }

  await deleteEpisodeDownload(episodeId);
}

export async function removeCachedFiles(paths: readonly string[]) {
  await Promise.all(paths.map(path => deleteFileIfPresent(path)));
}

export async function enforceDownloadCacheLimit() {
  const settings = await getDownloadCacheSettings();
  let cacheSize = await getCompletedDownloadCacheSize();

  if (cacheSize <= settings.maxSizeBytes) {
    return;
  }

  const activeMediaId = getActiveMediaId();
  const candidates = await listDownloadCacheEvictionCandidates(500);

  for (const candidate of candidates) {
    if (cacheSize <= settings.maxSizeBytes) {
      break;
    }

    if (candidate.episodeId === activeMediaId || !candidate.localUri) {
      continue;
    }

    const episode = await getPodcastEpisode(candidate.episodeId);

    if (episode) {
      await updateRuntimeQueueSource(candidate.episodeId, episode.audioUrl);
    }

    await deleteFileIfPresent(candidate.localUri);
    await deleteEpisodeDownload(candidate.episodeId);
    cacheSize = Math.max(0, cacheSize - (candidate.totalBytes ?? 0));
  }
}

export async function setDownloadCacheLimit(maxSizeBytes: number) {
  await updateDownloadCacheLimit(maxSizeBytes);
  await enforceDownloadCacheLimit();
}

export async function resolveDownloadedQueueSources(
  queue: readonly PlaybackQueueItem[],
  activeMediaId: string,
) {
  const resolved = await Promise.all(
    queue.map(async item => {
      if (item.mediaType !== 'episode') {
        return item;
      }

      const download = await getEpisodeDownload(item.mediaId);

      if (
        download?.status !== 'completed' ||
        !download.localUri ||
        !(await fileExists(download.localUri))
      ) {
        if (download?.status === 'completed') {
          await deleteEpisodeDownload(item.mediaId);
        }

        return item;
      }

      if (item.mediaId === activeMediaId) {
        await touchEpisodeDownload(item.mediaId);
      }

      return {...item, sourceUrl: download.localUri};
    }),
  );

  return resolved;
}
