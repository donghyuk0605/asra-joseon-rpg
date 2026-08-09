import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

const NEW_WORLD_WEAPON_IDS = [
  'bear-claw-gauntlet',
  'chiaksan-claw-knife',
  'saltfield-ritual-knife',
  'geoje-anchor-hwando',
  'hwangju-moonsteel-spear',
  'pyeongchang-leopard-knife',
  'cheongju-kiln-hwando',
  'gunsan-drowned-blade',
] as const;

describe('beta world weapon image set', () => {
  it('connects every new melee item to a dedicated runtime cutout', () => {
    for (const itemId of NEW_WORLD_WEAPON_IDS) {
      const asset = ASSETS.playerWeapons[itemId];
      expect(asset.path).toBe(`/assets/weapons/${itemId}-world-v1.png`);
      expect(asset.grip).toEqual({ x: 128, y: 50 });
    }
  });

  it('keeps transparent margins, readable silhouettes and a shared hand grip', () => {
    const result = spawnSync('python3', ['scripts/validate_world_weapons_v4.py'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Validated 8 distinct 256px world weapons');
  }, 20_000);
});
