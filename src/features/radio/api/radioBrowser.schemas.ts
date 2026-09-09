import {z} from 'zod';

const apiNumberSchema = z
  .union([z.number(), z.string()])
  .transform(value => {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  })
  .catch(0);

const apiStringSchema = z.string().catch('');

export const radioBrowserStationSchema = z
  .object({
    stationuuid: apiStringSchema,
    name: apiStringSchema,
    url: apiStringSchema,
    url_resolved: apiStringSchema,
    homepage: apiStringSchema,
    favicon: apiStringSchema,
    tags: apiStringSchema,
    country: apiStringSchema,
    countrycode: apiStringSchema,
    codec: apiStringSchema,
    bitrate: apiNumberSchema,
    hls: apiNumberSchema,
    lastcheckok: apiNumberSchema,
  })
  .passthrough();

export const radioBrowserStationsSchema = z.array(radioBrowserStationSchema);

export type RadioBrowserStationDto = z.infer<
  typeof radioBrowserStationSchema
>;
