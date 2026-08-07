import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

describe('beta combat impact atlas', () => {
  it('keeps four transparent 512px effect cells in one runtime atlas', () => {
    expect(ASSETS.combatImpacts).toEqual({
      key: 'beta-combat-impact-atlas-v1',
      path: '/assets/fx/beta-combat-impact-atlas-v1.png',
    });
    const png = readFileSync(new URL(`../../../public${ASSETS.combatImpacts.path}`, import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(512 * 2);
    expect(png.readUInt32BE(20)).toBe(512 * 2);
    expect(png[25]).toBe(6);
    expect(statSync(new URL(`../../../public${ASSETS.combatImpacts.path}`, import.meta.url)).size)
      .toBeGreaterThan(250_000);
  });

  it('loads and presents the atlas from combat impact events', () => {
    const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
    expect(scene).toContain('this.load.spritesheet(ASSETS.combatImpacts.key');
    expect(scene).toContain('this.game.canvas.dataset.combatFxAtlas');
    expect(scene).toContain("kind: 'blade' | 'pierce' | 'blunt'");
    expect(scene).toContain('this.game.canvas.dataset.combatFxFrame');
    expect(scene).toContain('this.add.image(x, y, ASSETS.combatImpacts.key, atlasFrame)');
  });
});
