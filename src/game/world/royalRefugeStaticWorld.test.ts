import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from '../assets/manifest';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  REGION_ORIGINS,
  WORLD_HEIGHT,
  WORLD_MIN_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
} from './layout';
import { REGIONS, type RoyalRefugeRegionId } from './regions';

const REFUGE_REGIONS: readonly RoyalRefugeRegionId[] = ['namhansanseong', 'ganghwado'];

describe('royal refuge static world contract', () => {
  it('registers two distinct final-defense regions inside the world bounds', () => {
    const occupiedCells = new Set<string>();
    for (const region of REFUGE_REGIONS) {
      const origin = REGION_ORIGINS[region];
      const cell = `${origin.x},${origin.y}`;
      expect(occupiedCells.has(cell), region).toBe(false);
      occupiedCells.add(cell);

      expect(origin.x).toBeGreaterThanOrEqual(WORLD_MIN_X);
      expect(origin.x + MAP_WIDTH).toBeLessThanOrEqual(WORLD_MIN_X + WORLD_WIDTH);
      expect(origin.y).toBeGreaterThanOrEqual(WORLD_MIN_Y);
      expect(origin.y + MAP_HEIGHT).toBeLessThanOrEqual(WORLD_MIN_Y + WORLD_HEIGHT);
      expect(REGIONS[region].safe).toBe(false);
      expect(REGIONS[region].status).toContain('3중 방어');
    }
  });

  it('ships both generated 1536x1024 refuge maps as raster WebP assets', () => {
    const maps = [
      ASSETS.namhansanFortressBackground,
      ASSETS.ganghwaFortressBackground,
    ];
    expect(new Set(maps.map((asset) => asset.key)).size).toBe(2);

    for (const asset of maps) {
      expect(asset.path).toMatch(/^\/assets\/environment\/campaign\/(?:namhansan|ganghwa)-fortress-v1\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
      expect(webp.subarray(12, 16).toString()).toBe('VP8 ');
      expect(webp.readUInt16LE(26) & 0x3fff).toBe(MAP_WIDTH);
      expect(webp.readUInt16LE(28) & 0x3fff).toBe(MAP_HEIGHT);
    }
  });
});
