import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

const FRAME_SIZE = 256;

interface DecodedRgba {
  width: number;
  height: number;
  pixels: Uint8Array;
}

const paethPredictor = (left: number, up: number, upperLeft: number) => {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
};

const decodeRgbaPng = (png: Buffer): DecodedRgba => {
  expect(png.subarray(1, 4).toString()).toBe('PNG');

  let width = 0;
  let height = 0;
  const compressedRows: Buffer[] = [];
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
    } else if (type === 'IDAT') {
      compressedRows.push(payload);
    }
    offset += length + 12;
    if (type === 'IEND') break;
  }

  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(compressedRows));
  expect(filtered.length).toBe((rowSize + 1) * height);

  const pixels = new Uint8Array(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[sourceOffset];
    expect([0, 1, 2, 3, 4]).toContain(filter);
    sourceOffset += 1;
    const rowOffset = y * rowSize;
    for (let x = 0; x < rowSize; x += 1) {
      const encoded = filtered[sourceOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[rowOffset - rowSize + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[rowOffset - rowSize + x - bytesPerPixel]
        : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paethPredictor(left, up, upperLeft);
      pixels[rowOffset + x] = (encoded + predictor) & 0xff;
    }
    sourceOffset += rowSize;
  }
  return { width, height, pixels };
};

const frameAlphaBounds = (atlas: DecodedRgba, column: number, row: number) => {
  let minX = FRAME_SIZE;
  let minY = FRAME_SIZE;
  let maxX = -1;
  let maxY = -1;
  let opaquePixelCount = 0;
  for (let y = 0; y < FRAME_SIZE; y += 1) {
    for (let x = 0; x < FRAME_SIZE; x += 1) {
      const atlasX = column * FRAME_SIZE + x;
      const atlasY = row * FRAME_SIZE + y;
      const alpha = atlas.pixels[(atlasY * atlas.width + atlasX) * 4 + 3];
      if (alpha <= 16) continue;
      opaquePixelCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, opaquePixelCount };
};

const changedAlphaPixels = (
  atlas: DecodedRgba,
  row: number,
  firstColumn: number,
  secondColumn: number,
) => {
  let changed = 0;
  for (let y = 0; y < FRAME_SIZE; y += 1) {
    for (let x = 0; x < FRAME_SIZE; x += 1) {
      const firstX = firstColumn * FRAME_SIZE + x;
      const secondX = secondColumn * FRAME_SIZE + x;
      const firstAlpha = atlas.pixels[((row * FRAME_SIZE + y) * atlas.width + firstX) * 4 + 3];
      const secondAlpha = atlas.pixels[((row * FRAME_SIZE + y) * atlas.width + secondX) * 4 + 3];
      if (firstAlpha !== secondAlpha) changed += 1;
    }
  }
  return changed;
};

const changedRgbaPixelsBetweenAtlases = (
  first: DecodedRgba,
  second: DecodedRgba,
  row: number,
  column: number,
) => {
  let changed = 0;
  for (let y = 0; y < FRAME_SIZE; y += 1) {
    for (let x = 0; x < FRAME_SIZE; x += 1) {
      const atlasX = column * FRAME_SIZE + x;
      const atlasY = row * FRAME_SIZE + y;
      const offset = (atlasY * first.width + atlasX) * 4;
      if (
        first.pixels[offset] !== second.pixels[offset]
        || first.pixels[offset + 1] !== second.pixels[offset + 1]
        || first.pixels[offset + 2] !== second.pixels[offset + 2]
        || first.pixels[offset + 3] !== second.pixels[offset + 3]
      ) changed += 1;
    }
  }
  return changed;
};

const webpDimensions = (webp: Buffer) => {
  expect(webp.subarray(0, 4).toString()).toBe('RIFF');
  expect(webp.subarray(8, 12).toString()).toBe('WEBP');

  for (let offset = 12; offset + 8 <= webp.length;) {
    const type = webp.subarray(offset, offset + 4).toString('ascii');
    const length = webp.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;
    if (type === 'VP8 ') {
      expect(webp.subarray(payloadOffset + 3, payloadOffset + 6).toString('hex')).toBe('9d012a');
      return {
        width: webp.readUInt16LE(payloadOffset + 6) & 0x3fff,
        height: webp.readUInt16LE(payloadOffset + 8) & 0x3fff,
      };
    }
    if (type === 'VP8X') {
      return {
        width: webp.readUIntLE(payloadOffset + 4, 3) + 1,
        height: webp.readUIntLE(payloadOffset + 7, 3) + 1,
      };
    }
    offset = payloadOffset + length + (length % 2);
  }
  throw new Error('Unsupported WebP payload');
};

describe('Crown Prince Gwanghae character image set', () => {
  it('ships a dedicated normalized RGBA atlas with forty occupied frames', () => {
    expect(ASSETS.gwanghaePrince).toEqual({
      key: 'joseon-gwanghae-actions-v2',
      path: '/assets/characters/joseon-gwanghae-actions-v2.png',
    });
    const png = readFileSync(new URL(`../../../public${ASSETS.gwanghaePrince.path}`, import.meta.url));
    const atlas = decodeRgbaPng(png);
    expect(atlas.width).toBe(FRAME_SIZE * 8);
    expect(atlas.height).toBe(FRAME_SIZE * 5);

    const frames = Array.from({ length: 5 }, (_, row) => (
      Array.from({ length: 8 }, (_, column) => ({
        column,
        bounds: frameAlphaBounds(atlas, column, row),
      }))
    )).flat();
    expect(frames).toHaveLength(40);
    for (const { column, bounds: frame } of frames) {
      expect(frame.opaquePixelCount).toBeGreaterThan(4_500);
      expect(frame.maxY).toBe(column < 4 ? 248 : 246);
      expect(frame.maxX - frame.minX + 1).toBeGreaterThanOrEqual(60);
      expect(frame.maxX - frame.minX + 1).toBeLessThanOrEqual(136);
      expect(frame.maxY - frame.minY + 1).toBeGreaterThanOrEqual(130);
      expect(frame.maxY - frame.minY + 1).toBeLessThanOrEqual(166);
    }
  });

  it('keeps four materially different walk contacts in every source direction', () => {
    const png = readFileSync(new URL(`../../../public${ASSETS.gwanghaePrince.path}`, import.meta.url));
    const atlas = decodeRgbaPng(png);
    for (let row = 0; row < 5; row += 1) {
      expect(changedAlphaPixels(atlas, row, 0, 1)).toBeGreaterThan(600);
      expect(changedAlphaPixels(atlas, row, 1, 2)).toBeGreaterThan(600);
      expect(changedAlphaPixels(atlas, row, 2, 3)).toBeGreaterThan(600);
    }
  });

  it('preserves every approved attack frame while replacing only the walk cycle', () => {
    const candidate = decodeRgbaPng(readFileSync(
      new URL(`../../../public${ASSETS.gwanghaePrince.path}`, import.meta.url),
    ));
    const previous = decodeRgbaPng(readFileSync(
      new URL('../../../public/assets/characters/joseon-gwanghae-actions-v1.png', import.meta.url),
    ));
    for (let row = 0; row < 5; row += 1) {
      for (let column = 4; column < 8; column += 1) {
        expect(changedRgbaPixelsBetweenAtlases(candidate, previous, row, column)).toBe(0);
      }
    }
  });
});

describe('Hanseong and Joseon town backgrounds', () => {
  it('ships seven distinct 1536 by 1024 raster maps', () => {
    const maps = [
      ASSETS.hanseongSouthBackground,
      ASSETS.hanseongMarketBackground,
      ASSETS.changdeokgungAudienceBackground,
      ASSETS.gaeseongSongdoBackground,
      ASSETS.suwonDohobuBackground,
      ASSETS.chungjuMokgyeBackground,
      ASSETS.andongSeowonBackground,
    ];
    expect(new Set(maps.map((asset) => asset.key)).size).toBe(7);
    expect(new Set(maps.map((asset) => asset.path)).size).toBe(7);
    for (const asset of maps) {
      expect(asset.path).toMatch(/^\/assets\/environment\/campaign\/.+-v\d+\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webpDimensions(webp)).toEqual({ width: 1536, height: 1024 });
    }
  });
});
