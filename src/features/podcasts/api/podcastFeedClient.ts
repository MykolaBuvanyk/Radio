import type {
  PodcastFeedResponse,
  PodcastFeedValidators,
} from '../domain/podcastFeed';

const FEED_REQUEST_TIMEOUT_MS = 15_000;
const MAX_FEED_SIZE_BYTES = 8 * 1024 * 1024;

export class PodcastFeedRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PodcastFeedRequestError';
  }
}

export function normalizePodcastFeedUrl(value: string) {
  const trimmedValue = value.trim();
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    throw new PodcastFeedRequestError('Enter a valid podcast feed URL.');
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new PodcastFeedRequestError(
      'Podcast feeds must use a public HTTP or HTTPS URL.',
    );
  }

  const normalizedUrl = parsedUrl.toString();
  const hashIndex = normalizedUrl.indexOf('#');

  return hashIndex >= 0 ? normalizedUrl.slice(0, hashIndex) : normalizedUrl;
}

function readResponseValidators(response: Response): PodcastFeedValidators {
  return {
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
  };
}

function readContentLength(response: Response) {
  const header = response.headers.get('content-length');

  if (header === null) {
    return null;
  }

  const value = Number(header);

  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export async function fetchPodcastFeed(
  feedUrl: string,
  validators: PodcastFeedValidators,
  externalSignal?: AbortSignal,
): Promise<PodcastFeedResponse> {
  const controller = new AbortController();
  let didTimeout = false;
  const handleExternalAbort = () => controller.abort();
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, FEED_REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = {
    Accept:
      'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
    'User-Agent': 'Radio/0.0.1',
  };

  if (validators.etag) {
    headers['If-None-Match'] = validators.etag;
  }

  if (validators.lastModified) {
    headers['If-Modified-Since'] = validators.lastModified;
  }

  externalSignal?.addEventListener('abort', handleExternalAbort);

  if (externalSignal?.aborted) {
    controller.abort();
  }

  try {
    const response = await fetch(feedUrl, {
      headers,
      signal: controller.signal,
    });
    const responseValidators = readResponseValidators(response);

    if (response.status === 304) {
      return {
        kind: 'not-modified',
        validators: {
          etag: responseValidators.etag ?? validators.etag,
          lastModified:
            responseValidators.lastModified ?? validators.lastModified,
        },
      };
    }

    if (!response.ok) {
      throw new PodcastFeedRequestError(
        `The podcast server returned status ${response.status}.`,
      );
    }

    const contentLength = readContentLength(response);

    if (contentLength !== null && contentLength > MAX_FEED_SIZE_BYTES) {
      throw new PodcastFeedRequestError('This podcast feed is too large.');
    }

    const body = await response.text();

    if (body.length === 0) {
      throw new PodcastFeedRequestError('The podcast feed is empty.');
    }

    if (body.length > MAX_FEED_SIZE_BYTES) {
      throw new PodcastFeedRequestError('This podcast feed is too large.');
    }

    return {
      body,
      kind: 'modified',
      validators: responseValidators,
    };
  } catch (error) {
    if (didTimeout) {
      throw new PodcastFeedRequestError('The podcast feed request timed out.');
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    if (error instanceof PodcastFeedRequestError) {
      throw error;
    }

    throw new PodcastFeedRequestError(
      'The podcast feed could not be downloaded.',
    );
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', handleExternalAbort);
  }
}
