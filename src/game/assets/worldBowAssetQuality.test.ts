import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEM_WORLD_VISUAL_GAPS } from './visualCoverage';
import { ASSETS } from './manifest';

const BOW_IDS = [
  'frontier-horn-bow',
  'white-birch-bow',
  'iron-horn-warbow',
  'thunderbird-bow',
  'northwind-warbow',
  'gangneung-sea-bow',
  'uiju-black-horn-bow',
  'samcheok-seawind-bow',
] as const;

describe('dedicated world bow image set', () => {
  it('maps all eight bow items to distinct center-gripped runtime cutouts', () => {
    for (const itemId of BOW_IDS) {
      const asset = ASSETS.playerWeapons[itemId];
      expect(asset.path).toBe(`/assets/weapons/${itemId}-world-v1.png`);
      expect(asset.grip).toEqual({ x: 128, y: 128 });
    }
    expect(ITEM_WORLD_VISUAL_GAPS.filter((gap) => gap.reason === 'missing-world-weapon')).toEqual([]);
    expect(ITEM_WORLD_VISUAL_GAPS.every((gap) => gap.reason === 'missing-armor-layer')).toBe(true);
  });

  it('ships normalized transparent and visually distinct bow-only files', () => {
    const result = spawnSync('python3', ['scripts/validate_world_bows.py'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Validated 8 distinct 256px world bows');
  }, 20_000);

  it('uses the bow attachment table in the live equipment layer', () => {
    const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
    expect(scene).toContain("weapon.weaponClass === 'bow'");
    expect(scene).toContain('bowAttachmentForFrame(row, column, flip)');
    expect(scene).not.toContain('if (frontierBow) {\n      this.playerArmorSprite.setVisible(false);\n      this.playerWeaponAura.setVisible(false)');
  });
});
