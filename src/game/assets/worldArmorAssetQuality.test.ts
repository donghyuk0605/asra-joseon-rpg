import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../items/catalog';
import { ASSETS } from './manifest';
import { ITEM_WORLD_VISUAL_GAPS, ITEM_VISUAL_COVERAGE } from './visualCoverage';

const REGIONAL_ARMOR_IDS = [
  'frontier-lamellar-coat',
  'coastal-scout-coat',
  'haeju-reed-cape',
  'anju-frontier-coat',
  'gongju-scholar-coat',
] as const;

describe('complete regional armor image set', () => {
  it('maps every armor catalog entry and leaves no equipment visual gap', () => {
    const armorIds = Object.values(ITEM_CATALOG)
      .filter((item) => item.slot === 'armor')
      .map((item) => item.id)
      .sort();
    expect(Object.keys(ASSETS.playerArmorLayers).sort()).toEqual(armorIds);
    expect(Object.keys(ASSETS.playerWeaponReadyArmorLayers).sort()).toEqual(armorIds);
    expect(Object.keys(ASSETS.frontierArmorLayers).sort()).toEqual(armorIds);
    expect(Object.keys(ASSETS.frontierWeaponReadyArmorLayers).sort()).toEqual(armorIds);
    for (const itemId of armorIds) expect(ITEM_VISUAL_COVERAGE[itemId].worldPresentation).toBe('armor-layer-ready');
    expect(ITEM_WORLD_VISUAL_GAPS).toEqual([]);
  });

  it('ships clean, distinct and body-locked 8 by 5 armor atlases', () => {
    const result = spawnSync('python3', ['scripts/validate_regional_armor_layers.py'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Validated 29 body-locked armor atlases and five-material reference');
  }, 120_000);

  it('uses Hajin-specific layers in gameplay and the bag preview', () => {
    const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
    const hud = readFileSync(new URL('../ui/Hud.ts', import.meta.url), 'utf8');
    expect(scene).toContain('ASSETS.frontierWeaponReadyArmorLayers : ASSETS.frontierArmorLayers');
    expect(scene).toContain("playtestParams.get('armor')");
    expect(scene).not.toContain('.setVisible(Boolean(!frontierArcher && layers.armor');
    expect(hud).toContain('ASSETS.frontierArmorLayers');
    expect(hud).toContain('ASSETS.frontierWeaponReadyArmorLayers');
  });
});
