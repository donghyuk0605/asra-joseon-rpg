import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../items/catalog';
import { EPISODE2_REGION_IDS } from '../world/regions';
import { episode2DropPool } from '../world/episode2Regions';
import { ASSETS } from './manifest';

type DecodedRgba = { width: number; height: number; pixels: Uint8Array };

const paeth = (left: number, up: number, upperLeft: number): number => {
  const estimate = left + up - upperLeft;
  const dl = Math.abs(estimate - left);
  const du = Math.abs(estimate - up);
  const dul = Math.abs(estimate - upperLeft);
  return dl <= du && dl <= dul ? left : du <= dul ? up : upperLeft;
};

const decodePng = (path: string): DecodedRgba => {
  const png = readFileSync(new URL(`../../../public${path}`, import.meta.url));
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  let width = 0;
  let height = 0;
  const compressed: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const payload = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      expect(payload[8]).toBe(8);
      expect(payload[9]).toBe(6);
      expect(payload[12]).toBe(0);
    } else if (type === 'IDAT') compressed.push(payload);
    offset += length + 12;
    if (type === 'IEND') break;
  }

  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(compressed));
  const pixels = new Uint8Array(width * height * bytesPerPixel);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[source++];
    for (let x = 0; x < rowSize; x += 1) {
      const encoded = filtered[source + x];
      const index = y * rowSize + x;
      const left = x >= bytesPerPixel ? pixels[index - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[index - rowSize] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[index - rowSize - bytesPerPixel] : 0;
      const predictor = filter === 1 ? left
        : filter === 2 ? up
          : filter === 3 ? Math.floor((left + up) / 2)
            : filter === 4 ? paeth(left, up, upperLeft) : 0;
      pixels[index] = (encoded + predictor) & 0xff;
    }
    source += rowSize;
  }
  return { width, height, pixels };
};

const frameMetrics = (atlas: DecodedRgba, column: number, row: number) => {
  let opaque = 0;
  let maxY = -1;
  for (let y = 0; y < 256; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const alpha = atlas.pixels[(((row * 256 + y) * atlas.width) + column * 256 + x) * 4 + 3];
      if (alpha <= 16) continue;
      opaque += 1;
      maxY = y;
    }
  }
  return { opaque, maxY };
};

const changedPixels = (atlas: DecodedRgba, row: number, firstColumn: number, secondColumn: number): number => {
  let changed = 0;
  for (let y = 0; y < 256; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const first = (((row * 256 + y) * atlas.width) + firstColumn * 256 + x) * 4;
      const second = (((row * 256 + y) * atlas.width) + secondColumn * 256 + x) * 4;
      if (
        atlas.pixels[first] !== atlas.pixels[second]
        || atlas.pixels[first + 1] !== atlas.pixels[second + 1]
        || atlas.pixels[first + 2] !== atlas.pixels[second + 2]
        || atlas.pixels[first + 3] !== atlas.pixels[second + 3]
      ) changed += 1;
    }
  }
  return changed;
};

const webpDimensions = (path: string): { width: number; height: number } => {
  const webp = readFileSync(new URL(`../../../public${path}`, import.meta.url));
  expect(webp.subarray(0, 4).toString()).toBe('RIFF');
  expect(webp.subarray(8, 12).toString()).toBe('WEBP');
  for (let offset = 12; offset + 8 <= webp.length;) {
    const type = webp.subarray(offset, offset + 4).toString('ascii');
    const length = webp.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (type === 'VP8 ') {
      return {
        width: webp.readUInt16LE(payload + 6) & 0x3fff,
        height: webp.readUInt16LE(payload + 8) & 0x3fff,
      };
    }
    if (type === 'VP8X') {
      return {
        width: webp.readUIntLE(payload + 4, 3) + 1,
        height: webp.readUIntLE(payload + 7, 3) + 1,
      };
    }
    offset = payload + length + (length % 2);
  }
  throw new Error(`Unsupported WebP payload: ${path}`);
};

describe('Episode II original raster assets', () => {
  it('ships four distinct normalized forty-frame monster action atlases', () => {
    const kinds = [
      'episode2-red-fox',
      'episode2-mountain-leopard',
      'episode2-marsh-wisp',
      'episode2-stone-dokkaebi',
    ] as const;
    const hashes = new Set<string>();
    for (const kind of kinds) {
      const asset = ASSETS.monsters[kind];
      expect(asset.path).toMatch(/episode2-.+-actions-v1\.png$/);
      const atlas = decodePng(asset.path);
      expect(atlas.width).toBe(2048);
      expect(atlas.height).toBe(1280);
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 8; column += 1) {
          expect(frameMetrics(atlas, column, row).opaque).toBeGreaterThan(5_000);
          expect(frameMetrics(atlas, column, row).maxY).toBe(248);
        }
        expect(changedPixels(atlas, row, 0, 1)).toBeGreaterThan(5_000);
        expect(changedPixels(atlas, row, 4, 5)).toBeGreaterThan(5_000);
      }
      const png = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      hashes.add(createHash('sha256').update(png).digest('hex'));
    }
    expect(hashes.size).toBe(kinds.length);
  });

  it('ships sixteen independent transparent item icons used by regional drops', () => {
    const itemIds = new Set(EPISODE2_REGION_IDS.flatMap((region) => [...episode2DropPool(region)]));
    expect(itemIds.size).toBe(16);
    const hashes = new Set<string>();
    for (const itemId of itemIds) {
      const definition = ITEM_CATALOG[itemId];
      expect(definition.iconPath).toMatch(/^\/assets\/items\/episode2\/episode2-.+-v1\.png$/);
      const icon = decodePng(definition.iconPath);
      expect(icon.width).toBe(256);
      expect(icon.height).toBe(256);
      expect(icon.pixels.filter((_, index) => index % 4 === 3 && icon.pixels[index] > 16).length)
        .toBeGreaterThan(1_000);
      const bytes = readFileSync(new URL(`../../../public${definition.iconPath}`, import.meta.url));
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    expect(hashes.size).toBe(itemIds.size);
  });

  it('ships separate raster parts for the prop atlas, moving waterwheel, and two new skills', () => {
    const propAtlas = decodePng(ASSETS.props.episode2VillageProps.path);
    const wheel = decodePng(ASSETS.props.episode2WaterwheelWheel.path);
    expect({ width: propAtlas.width, height: propAtlas.height }).toEqual({ width: 1536, height: 1536 });
    expect({ width: wheel.width, height: wheel.height }).toEqual({ width: 512, height: 512 });

    const skills = [
      '/assets/ui/skills/episode2/episode2-tidebreaker-step-v1.png',
      '/assets/ui/skills/episode2/episode2-beacon-volley-v1.png',
    ];
    const hashes = skills.map((path) => {
      const icon = decodePng(path);
      expect({ width: icon.width, height: icon.height }).toEqual({ width: 256, height: 256 });
      expect(statSync(new URL(`../../../public${path}`, import.meta.url)).size).toBeGreaterThan(50_000);
      return createHash('sha256')
        .update(readFileSync(new URL(`../../../public${path}`, import.meta.url)))
        .digest('hex');
    });
    expect(new Set(hashes).size).toBe(2);
  });

  it('ships six distinct flat top-down terrain paintings plus a reusable raster water bank', () => {
    const hashes = new Set<string>();
    for (const terrain of Object.values(ASSETS.episode2TerrainBases)) {
      expect(webpDimensions(terrain.path)).toEqual({ width: 1536, height: 1024 });
      const bytes = readFileSync(new URL(`../../../public${terrain.path}`, import.meta.url));
      expect(bytes.length).toBeGreaterThan(150_000);
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    expect(hashes.size).toBe(6);
    expect(webpDimensions(ASSETS.episode2WaterBank.path)).toEqual({ width: 256, height: 1024 });
    expect(statSync(new URL(`../../../public${ASSETS.episode2WaterBank.path}`, import.meta.url)).size)
      .toBeGreaterThan(40_000);
  });
});
