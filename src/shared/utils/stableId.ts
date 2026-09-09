function hashWithSeed(value: string, seed: number) {
  let hash = seed;

  for (let index = 0; index < value.length; index += 1) {
    // eslint-disable-next-line no-bitwise
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  // eslint-disable-next-line no-bitwise
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createStableId(prefix: string, value: string) {
  const normalizedValue = value.trim();
  const firstHash = hashWithSeed(normalizedValue, 2_166_136_261);
  const secondHash = hashWithSeed(normalizedValue, 3_332_640_197);

  return `${prefix}_${firstHash}${secondHash}`;
}
