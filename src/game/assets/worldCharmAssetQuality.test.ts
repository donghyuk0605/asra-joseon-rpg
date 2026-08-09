import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../items/catalog';
import { PLAYER_CHARM_ITEM_IDS } from '../phaser/playerCharmLayer';
import { ASSETS } from './manifest';
import { ITEM_WORLD_VISUAL_GAPS, ITEM_VISUAL_COVERAGE } from './visualCoverage';

describe('player world charm image set', () => {
  it('maps every charm catalog entry to one dedicated world cutout', () => {
    const charmIds = Object.values(ITEM_CATALOG)
      .filter((item) => item.slot === 'charm')
      .map((item) => item.id)
      .sort();
    expect([...PLAYER_CHARM_ITEM_IDS].sort()).toEqual(charmIds);
    expect(Object.keys(ASSETS.playerCharms).sort()).toEqual(charmIds);
    for (const itemId of charmIds) {
      expect(ASSETS.playerCharms[itemId as keyof typeof ASSETS.playerCharms].path)
        .toBe(`/assets/charms/${itemId}-world-v1.png`);
      expect(ITEM_VISUAL_COVERAGE[itemId].worldPresentation).toBe('charm-layer-ready');
    }
    expect(ITEM_WORLD_VISUAL_GAPS.some((item) => item.slot === 'charm')).toBe(false);
    expect(ITEM_WORLD_VISUAL_GAPS.every((item) => item.reason === 'missing-armor-layer')).toBe(true);
  });

  it('ships fourteen distinct transparent normalized cutouts', () => {
    const result = spawnSync('python3', ['scripts/validate_world_charms.py'], {
      cwd: new URL('../../../', import.meta.url),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Validated 14 distinct 256px world charms');
  }, 20_000);

  it('connects charm selection, depth, frame motion, hit tint and death state to the real player layer', () => {
    const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
    expect(scene).toContain("playtestParams.get('charm')");
    expect(scene).toContain('this.syncPlayerCharmLayer(row, column, flip, layers.charm && bodyVisible)');
    expect(scene).toContain('playerCharmAttachmentForFrame(row, column, flip, visual)');
    expect(scene).toContain('this.playerActionRoot.moveBelow(this.playerCharmSprite, this.playerSprite)');
    expect(scene).toContain('this.playerActionRoot.bringToTop(this.playerCharmSprite)');
    expect(scene).toContain('this.playerCharmSprite.setTint(0xff8b76)');
    expect(scene).toContain('this.playerCharmSprite.setTint(0xb7aea0)');
  });
});
