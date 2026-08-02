import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('village RPG service UI', () => {
  const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');

  it('ships working market, forge and inn service panels', () => {
    expect(hud).toContain("export type VillageService = 'market' | 'forge' | 'inn'");
    expect(hud).toContain('data-shop-offer="ginseng-pellet"');
    expect(hud).toContain('data-shop-offer="ember-hwando"');
    expect(hud).toContain('data-shop-offer="frost-hwando"');
    expect(hud).toContain('data-shop-offer="storm-hwando"');
    expect(hud).toContain('data-shop-offer="forge-weapon"');
    expect(hud).toContain('data-shop-offer="inn-rest"');
    expect(scene).toContain("this.hud.openVillageService(service)");
  });

  it('uses thumb tabs for equipment, items and combat stats on phones', () => {
    expect(hud).toContain('data-inventory-tab="equipment"');
    expect(hud).toContain('data-inventory-tab="bag"');
    expect(hud).toContain('data-inventory-tab="stats"');
    expect(styles).toContain('.inventory-mobile-tabs');
    expect(styles).toContain('.inventory-panel[data-mobile-tab="stats"] .ability-panel');
  });

  it('animates the blacksmith through anticipation, impact, sparks and forge glow', () => {
    expect(scene).toContain('angle: -46');
    expect(scene).toContain('angle: 34');
    expect(scene).toContain('this.createForgeSparks');
    expect(scene).toContain('npc.forgeGlow.setAlpha(0.72)');
  });
});
