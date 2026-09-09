import {XMLParser} from 'fast-xml-parser';

import type {
  ParsedPodcastEpisode,
  ParsedPodcastFeed,
} from '../domain/podcastFeed';

type XmlRecord = Record<string, unknown>;

const parser = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: '@_',
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: {
    enabled: true,
    maxEntityCount: 20,
    maxEntitySize: 1_000,
    maxExpandedLength: 20_000,
    maxTotalExpansions: 200,
  },
  textNodeName: '#text',
  trimValues: true,
});

export class PodcastFeedParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PodcastFeedParseError';
  }
}

function isRecord(value: unknown): value is XmlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): XmlRecord | null {
  return isRecord(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  const decodePass = (input: string) =>
    input.replace(
      /&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi,
      (match, entity: string) => {
        if (entity.startsWith('#x')) {
          const codePoint = Number.parseInt(entity.slice(2), 16);

          return Number.isInteger(codePoint) && codePoint <= 0x10ffff
            ? String.fromCodePoint(codePoint)
            : match;
        }

        if (entity.startsWith('#')) {
          const codePoint = Number.parseInt(entity.slice(1), 10);

          return Number.isInteger(codePoint) && codePoint <= 0x10ffff
            ? String.fromCodePoint(codePoint)
            : match;
        }

        return namedEntities[entity.toLowerCase()] ?? match;
      },
    );

  return decodePass(decodePass(value));
}

function cleanText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function readText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return cleanText(String(value));
  }

  if (Array.isArray(value)) {
    return value.map(readText).find(Boolean) ?? '';
  }

  const record = asRecord(value);

  return record ? readText(record['#text']) : '';
}

function readFirstText(record: XmlRecord, keys: readonly string[]) {
  for (const key of keys) {
    const value = readText(record[key]);

    if (value) {
      return value;
    }
  }

  return '';
}

function readHttpUrl(value: unknown): string | null {
  const text = readText(value);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function readAttribute(record: XmlRecord | null, name: string) {
  return record ? readText(record[`@_${name}`]) : '';
}

function parseDate(value: string): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseDuration(value: string): number | null {
  if (!value) {
    return null;
  }

  const segments = value.split(':').map(Number);

  if (
    segments.some(segment => !Number.isFinite(segment) || segment < 0) ||
    segments.length > 3
  ) {
    return null;
  }

  const seconds = segments.reduce(
    (total, segment) => total * 60 + segment,
    0,
  );

  return Number.isFinite(seconds) ? seconds : null;
}

function parseFileSize(value: string): number | null {
  const size = Number(value);

  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

function parseExplicit(value: string) {
  return ['explicit', 'true', 'yes', '1'].includes(value.toLowerCase());
}

function readRssArtwork(channel: XmlRecord) {
  const itunesImage = asRecord(channel['itunes:image']);
  const standardImage = asRecord(channel.image);

  return (
    readHttpUrl(readAttribute(itunesImage, 'href')) ??
    readHttpUrl(standardImage?.url)
  );
}

function readRssEnclosure(item: XmlRecord) {
  const candidates = [
    ...asArray(item.enclosure),
    ...asArray(item['media:content']),
  ];

  for (const candidate of candidates) {
    const record = asRecord(candidate);
    const audioUrl = readHttpUrl(readAttribute(record, 'url'));
    const mimeType = readAttribute(record, 'type') || null;

    if (
      audioUrl &&
      (!mimeType || mimeType.toLowerCase().startsWith('audio/'))
    ) {
      return {
        audioUrl,
        fileSizeBytes: parseFileSize(readAttribute(record, 'length')),
        mimeType,
      };
    }
  }

  return null;
}

function parseRssEpisode(value: unknown): ParsedPodcastEpisode | null {
  const item = asRecord(value);

  if (!item) {
    return null;
  }

  const enclosure = readRssEnclosure(item);
  const title = readFirstText(item, ['title']);

  if (!enclosure || !title) {
    return null;
  }

  const guid = readFirstText(item, ['guid']) || enclosure.audioUrl;

  return {
    ...enclosure,
    description: readFirstText(item, [
      'content:encoded',
      'description',
      'itunes:summary',
    ]),
    durationSeconds: parseDuration(
      readFirstText(item, ['itunes:duration', 'duration']),
    ),
    guid,
    isExplicit: parseExplicit(
      readFirstText(item, ['itunes:explicit', 'explicit']),
    ),
    publishedAt: parseDate(
      readFirstText(item, ['pubDate', 'dc:date', 'published', 'updated']),
    ),
    title,
  };
}

function readAtomLink(entry: XmlRecord) {
  for (const candidate of asArray(entry.link)) {
    const link = asRecord(candidate);
    const href = readHttpUrl(readAttribute(link, 'href'));
    const relation = readAttribute(link, 'rel').toLowerCase();
    const mimeType = readAttribute(link, 'type') || null;

    if (
      href &&
      (relation === 'enclosure' ||
        mimeType?.toLowerCase().startsWith('audio/'))
    ) {
      return {
        audioUrl: href,
        fileSizeBytes: parseFileSize(readAttribute(link, 'length')),
        mimeType,
      };
    }
  }

  return null;
}

function parseAtomEpisode(value: unknown): ParsedPodcastEpisode | null {
  const entry = asRecord(value);

  if (!entry) {
    return null;
  }

  const enclosure = readAtomLink(entry);
  const title = readFirstText(entry, ['title']);

  if (!enclosure || !title) {
    return null;
  }

  return {
    ...enclosure,
    description: readFirstText(entry, [
      'content',
      'summary',
      'itunes:summary',
    ]),
    durationSeconds: parseDuration(
      readFirstText(entry, ['itunes:duration', 'duration']),
    ),
    guid: readFirstText(entry, ['id', 'guid']) || enclosure.audioUrl,
    isExplicit: parseExplicit(
      readFirstText(entry, ['itunes:explicit', 'explicit']),
    ),
    publishedAt: parseDate(
      readFirstText(entry, ['published', 'updated', 'dc:date']),
    ),
    title,
  };
}

function normalizeBrokenEntities(xml: string) {
  return xml.replace(
    /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);|&/gi,
    (match, entity: string | undefined) => {
      if (
        entity &&
        (/^#/.test(entity) ||
          ['amp', 'apos', 'gt', 'lt', 'quot'].includes(entity.toLowerCase()))
      ) {
        return match;
      }

      return entity ? `&amp;${entity};` : '&amp;';
    },
  );
}

function parseXml(xml: string): XmlRecord {
  try {
    const parsed = parser.parse(normalizeBrokenEntities(xml)) as unknown;

    if (!isRecord(parsed)) {
      throw new PodcastFeedParseError(
        'The podcast feed has an invalid document structure.',
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof PodcastFeedParseError) {
      throw error;
    }

    throw new PodcastFeedParseError('The podcast feed contains invalid XML.');
  }
}

function parseRssFeed(root: XmlRecord): ParsedPodcastFeed | null {
  const rss = asRecord(root.rss);
  const channel = asRecord(rss?.channel);

  if (!channel) {
    return null;
  }

  const title = readFirstText(channel, ['title']);

  if (!title) {
    throw new PodcastFeedParseError('The podcast feed has no title.');
  }

  return {
    artworkUrl: readRssArtwork(channel),
    author:
      readFirstText(channel, ['itunes:author', 'author', 'dc:creator']) ||
      null,
    description: readFirstText(channel, [
      'description',
      'itunes:summary',
      'itunes:subtitle',
    ]),
    episodes: asArray(channel.item)
      .map(parseRssEpisode)
      .filter((episode): episode is ParsedPodcastEpisode => episode !== null),
    language: readFirstText(channel, ['language']) || null,
    title,
  };
}

function parseAtomFeed(root: XmlRecord): ParsedPodcastFeed | null {
  const feed = asRecord(root.feed);

  if (!feed) {
    return null;
  }

  const title = readFirstText(feed, ['title']);

  if (!title) {
    throw new PodcastFeedParseError('The podcast feed has no title.');
  }

  const author = asRecord(feed.author);

  return {
    artworkUrl:
      readHttpUrl(feed.logo) ??
      readHttpUrl(feed.icon) ??
      readHttpUrl(readAttribute(asRecord(feed['itunes:image']), 'href')),
    author:
      readFirstText(author ?? feed, author ? ['name'] : ['itunes:author']) ||
      null,
    description: readFirstText(feed, ['subtitle', 'summary']),
    episodes: asArray(feed.entry)
      .map(parseAtomEpisode)
      .filter((episode): episode is ParsedPodcastEpisode => episode !== null),
    language: readAttribute(feed, 'xml:lang') || null,
    title,
  };
}

export function parsePodcastFeed(xml: string): ParsedPodcastFeed {
  const root = parseXml(xml);
  const feed = parseRssFeed(root) ?? parseAtomFeed(root);

  if (!feed) {
    throw new PodcastFeedParseError(
      'This URL does not contain a supported RSS or Atom podcast feed.',
    );
  }

  if (feed.episodes.length === 0) {
    throw new PodcastFeedParseError(
      'The podcast feed does not contain playable audio episodes.',
    );
  }

  return feed;
}
