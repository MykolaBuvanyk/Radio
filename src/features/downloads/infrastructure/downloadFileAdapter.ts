import {Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

const DOWNLOAD_DIRECTORY_NAME = 'radio-episodes';

export type FileDownloadProgress = {
  receivedBytes: number;
  totalBytes: number | null;
};

export type FileDownloadResponse = {
  headers: Readonly<Record<string, string>>;
  path: string;
  status: number;
};

export type FileDownloadTask = {
  cancel: () => void;
  promise: Promise<FileDownloadResponse>;
};

function normalizeHeaders(value: unknown): Readonly<Record<string, string>> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, headerValue]) =>
      typeof headerValue === 'string'
        ? [[key.toLowerCase(), headerValue] as const]
        : [],
    ),
  );
}

function removeFileScheme(path: string) {
  return path.startsWith('file://') ? path.slice(7) : path;
}

export async function ensureEpisodeDownloadDirectory() {
  const directory = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${DOWNLOAD_DIRECTORY_NAME}`;

  if (!(await ReactNativeBlobUtil.fs.exists(directory))) {
    await ReactNativeBlobUtil.fs.mkdir(directory);
  }

  if (Platform.OS === 'ios') {
    try {
      await ReactNativeBlobUtil.ios.excludeFromBackupKey(directory);
    } catch {
      // Failure to set the backup flag must not block app initialization.
    }
  }

  return directory;
}

export function getEpisodeDownloadPaths(
  directory: string,
  episodeId: string,
  extension: string,
) {
  const safeId = episodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const partialPath = `${directory}/${safeId}.part`;

  return {
    finalPath: `${directory}/${safeId}.${extension}`,
    partialPath,
    segmentPath: `${partialPath}.segment`,
  };
}

export async function getFileSize(path: string) {
  const normalizedPath = removeFileScheme(path);

  if (!(await ReactNativeBlobUtil.fs.exists(normalizedPath))) {
    return null;
  }

  const stat = await ReactNativeBlobUtil.fs.stat(normalizedPath);
  const size = Number(stat.size);

  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

export async function fileExists(path: string) {
  return ReactNativeBlobUtil.fs.exists(removeFileScheme(path));
}

export async function deleteFileIfPresent(path: string | null) {
  if (!path) {
    return;
  }

  const normalizedPath = removeFileScheme(path);

  if (await ReactNativeBlobUtil.fs.exists(normalizedPath)) {
    await ReactNativeBlobUtil.fs.unlink(normalizedPath);
  }
}

export async function moveFile(source: string, destination: string) {
  await deleteFileIfPresent(destination);
  await ReactNativeBlobUtil.fs.mv(
    removeFileScheme(source),
    removeFileScheme(destination),
  );
}

export async function appendFile(source: string, destination: string) {
  await ReactNativeBlobUtil.fs.appendFile(
    removeFileScheme(destination),
    removeFileScheme(source),
    'uri',
  );
}

export function startFileDownload(
  url: string,
  destinationPath: string,
  rangeStart: number,
  onProgress: (progress: FileDownloadProgress) => void,
): FileDownloadTask {
  const headers: Record<string, string> = {
    Accept: 'audio/*,application/octet-stream;q=0.9,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'User-Agent': 'Radio/1.0 (Android; React Native)',
  };

  if (rangeStart > 0) {
    headers.Range = `bytes=${rangeStart}-`;
  }

  let cancelled = false;
  let cancelCurrentRequest: (() => void) | null = null;

  const promise = (async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (cancelled) {
        throw new Error('The download was cancelled.');
      }

      try {
        const request = ReactNativeBlobUtil.config({
          IOSBackgroundTask: true,
          overwrite: true,
          followRedirect: true,
          path: removeFileScheme(destinationPath),
          // Some podcast CDNs take more than 30 seconds before the first
          // progress event on an emulator or a mobile network.
          timeout: 120_000,
        })
          .fetch('GET', url, headers)
          .progress({interval: 500}, (received, total) => {
            onProgress({
              receivedBytes: Math.max(0, received),
              totalBytes: total > 0 ? total : null,
            });
          });

        cancelCurrentRequest = () => request.cancel();
        const response = await request;
        const info = response.info();

        return {
          headers: normalizeHeaders(info.headers),
          path: response.path(),
          status: info.status,
        };
      } catch (error) {
        lastError = error;

        if (cancelled || attempt === 2) {
          throw error;
        }

        await new Promise<void>(resolve => {
          setTimeout(resolve, 750 * 2 ** attempt);
        });
      } finally {
        cancelCurrentRequest = null;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('The download failed.');
  })();

  return {
    cancel: () => {
      cancelled = true;
      cancelCurrentRequest?.();
    },
    promise,
  };
}
