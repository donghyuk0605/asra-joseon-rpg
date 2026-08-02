import { readFileSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { JAPAN_EXPANSION_LAYOUTS, JAPAN_EXPANSION_REGION_IDS } from '../world/japanExpansion';
import { JURCHEN_EXPANSION_LAYOUTS, JURCHEN_EXPANSION_REGION_IDS } from '../world/jurchenExpansion';
import { TREE_SPECIES_FRAMES, treeSpeciesFrame } from '../world/treeSpecies';
import { ASSETS } from './manifest';

const TREE_FRAME_WIDTH = 384;
const TREE_FRAME_HEIGHT = 512;

const paeth = (left: number, up: number, upperLeft: number) => {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
};

const decodeRgbaPng = (png: Buffer) => {
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
  const pixels = new Uint8Array(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * rowSize;
    for (let x = 0; x < rowSize; x += 1) {
      const encoded = filtered[sourceOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[rowOffset - rowSize + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[rowOffset - rowSize + x - bytesPerPixel]
        : 0;
      const predictor = filter === 1 ? left
        : filter === 2 ? up
          : filter === 3 ? Math.floor((left + up) / 2)
            : filter === 4 ? paeth(left, up, upperLeft)
              : 0;
      pixels[rowOffset + x] = (encoded + predictor) & 0xff;
    }
    sourceOffset += rowSize;
  }
  return { width, height, pixels };
};

const treeFrameAlphaBounds = (
  atlas: ReturnType<typeof decodeRgbaPng>,
  frameIndex: number,
) => {
  const column = frameIndex % 4;
  const row = Math.floor(frameIndex / 4);
  let minX = TREE_FRAME_WIDTH;
  let minY = TREE_FRAME_HEIGHT;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  for (let y = 0; y < TREE_FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < TREE_FRAME_WIDTH; x += 1) {
      const atlasX = column * TREE_FRAME_WIDTH + x;
      const atlasY = row * TREE_FRAME_HEIGHT + y;
      if (atlas.pixels[(atlasY * atlas.width + atlasX) * 4 + 3] <= 16) continue;
      visiblePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, visiblePixels };
};

describe('regional tree species atlas', () => {
  it('ships eight transparent tree silhouettes in one fixed raster grid', () => {
    expect(TREE_SPECIES_FRAMES).toEqual({
      'wind-red-pine': 0,
      'coastal-black-pine': 1,
      zelkova: 2,
      willow: 3,
      birch: 4,
      'autumn-maple': 5,
      bamboo: 6,
      'dead-pine': 7,
    });
    expect(treeSpeciesFrame('bamboo')).toBe(6);
    expect(ASSETS.props.joseonTreeSpecies).toEqual({
      key: 'joseon-tree-species-atlas-v1',
      path: '/assets/environment/props/joseon-tree-species-atlas-v1.png',
    });
    const png = readFileSync(`public${ASSETS.props.joseonTreeSpecies.path}`);
    expect(png.readUInt32BE(16)).toBe(TREE_FRAME_WIDTH * 4);
    expect(png.readUInt32BE(20)).toBe(TREE_FRAME_HEIGHT * 2);
    expect([4, 6]).toContain(png[25]);
    expect(statSync(`public${ASSETS.props.joseonTreeSpecies.path}`).size).toBeGreaterThan(1_000_000);

    const atlas = decodeRgbaPng(png);
    for (let frameIndex = 0; frameIndex < 8; frameIndex += 1) {
      const bounds = treeFrameAlphaBounds(atlas, frameIndex);
      expect(bounds.visiblePixels).toBeGreaterThan(15_000);
      expect(bounds.minX).toBeGreaterThanOrEqual(28);
      expect(bounds.maxX).toBeLessThanOrEqual(TREE_FRAME_WIDTH - 29);
      expect(bounds.minY).toBeGreaterThanOrEqual(20);
      expect(bounds.maxY).toBeLessThanOrEqual(TREE_FRAME_HEIGHT - 18);
    }
  });

  it('assigns distinct local species to Japanese and northern expansion regions', () => {
    const props = [
      ...JAPAN_EXPANSION_REGION_IDS.flatMap((region) => JAPAN_EXPANSION_LAYOUTS[region].props),
      ...JURCHEN_EXPANSION_REGION_IDS.flatMap((region) => JURCHEN_EXPANSION_LAYOUTS[region].props),
    ];
    const species = new Set(props.flatMap((prop) => prop.kind === 'pine' && prop.treeSpecies
      ? [prop.treeSpecies]
      : []));
    expect(species).toEqual(new Set([
      'wind-red-pine',
      'coastal-black-pine',
      'willow',
      'birch',
      'bamboo',
      'dead-pine',
    ]));
  });
});
