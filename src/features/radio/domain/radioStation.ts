export type RadioStation = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  genre: string;
  tags: string[];
  streamUrl: string;
  homepageUrl: string | null;
  faviconUrl: string | null;
  codec: string | null;
  bitrate: number | null;
  mimeType: string | null;
};
