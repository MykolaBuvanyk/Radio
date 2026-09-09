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

  try {
    await ReactNativeBlobUtil.ios.excludeFromBackupKey(directory);
  } catch {
    // This is an iOS-only optimization and must not block Android downloads.
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
  const headers: Record<string, string> = {};

  if (rangeStart > 0) {
    headers.Range = `bytes=${rangeStart}-`;
  }
  const request = ReactNativeBlobUtil.config({
    IOSBackgroundTask: true,
    overwrite: true,
    path: removeFileScheme(destinationPath),
    timeout: 30_000,
  })
    .fetch('GET', url, headers)
    .progress({interval: 250}, (received, total) => {
      onProgress({
        receivedBytes: Math.max(0, received),
        totalBytes: total > 0 ? total : null,
      });
    });

  return {
    cancel: () => {
      request.cancel();
    },
    promise: request.then(response => {
      const info = response.info();

      return {
        headers: normalizeHeaders(info.headers),
        path: response.path(),
        status: info.status,
      };
    }),
  };
}
