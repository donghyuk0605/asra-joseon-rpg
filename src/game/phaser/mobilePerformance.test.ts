import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('mobile performance profile', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  const scene = readFileSync('src/game/phaser/HuntingScene.ts', 'utf8');
  const manifest = readFileSync('src/game/assets/manifest.ts', 'utf8');

  it('defers Phaser and the hunting scene until the player actually starts a mode', () => {
    expect(main).not.toMatch(/^import Phaser from 'phaser';/m);
    expect(main).not.toMatch(/^import \{ HuntingScene \}/m);
    expect(main).toContain("Promise.all([import('phaser'), import('./game/phaser/HuntingScene')])");
  });

  it('keeps a high-density antialiased canvas on coarse-pointer screens', () => {
    expect(main).toContain("window.matchMedia('(pointer: coarse)').matches");
    expect(main).toContain('mobileRenderProfile ? 2 : 1.5');
    expect(main).toContain('target: 60');
    expect(main).toContain('antialias: true');
  });

  it('only creates and updates monster views for the active region', () => {
    expect(scene).toContain('if (monster.region === this.simulation.region) this.createMonsterView(monster)');
    expect(scene).toContain('this.releaseInactiveMonsterViews(nextRegion)');
    expect(scene).toContain('if (monster.region !== this.simulation.region) continue');
  });

  it('deduplicates shared soldier atlases and defers dungeon boss sheets until after boot', () => {
    expect(scene).toContain('const queuedMonsterTextures = new Set<string>()');
    expect(scene).toContain('this.time.delayedCall(1800, () => this.loadBossAssetsInBackground())');
    expect(scene).toContain('private enterDungeonWhenReady(');
  });

  it('loads Japan-exclusive maps, Yeonhwa and the Shogun only for the Japanese route', () => {
    expect(main).toContain("'mudang-new': { origin: 'osaka-mudang', campaign: 'japan'");
    expect(main).toContain("document.body.dataset.bootCampaign = profile?.campaign");
    expect(scene).toContain("const loadJapanAssets = document.body.dataset.bootCampaign === 'japan'");
    expect(scene).toContain('if (!loadJapanAssets && japanMapKeys.has(campaignMap.key)) continue');
    expect(scene).toContain('if (!loadJapanAssets && japanTransitionKeys.has(transition.key)) continue');
    expect(scene).toContain('if (!loadJapanAssets && japanMonsterKeys.has(monster.key)) continue');
    expect(scene).not.toContain("japanMonsterKeys = new Set<string>([\n      ASSETS.monsters['japanese-swordsman'].key");
  });

  it('preloads only adjacent Joseon transitions and lazy-loads the next pair while travelling', () => {
    expect(scene).toContain('const initialJoseonTransitionKeys = new Set<string>(');
    expect(scene).toContain('transition.from === requestedJoseonTown || transition.to === requestedJoseonTown');
    expect(scene).toContain('&& !initialJoseonTransitionKeys.has(transition.key)) continue');
    expect(scene).toContain('private ensureJoseonTownSeams(region: JoseonTownRegionId): void');
    expect(scene).toContain('this.joseonTownSeamLoads.add(transition.id)');
  });

  it('throttles heavy sprite synchronization and reduces ambient effects on phones', () => {
    expect(scene).toContain('this.heavyRenderAccumulator >= 33');
    expect(scene).toContain('const heavyRenderDelta = this.mobileProfile ? this.heavyRenderAccumulator : delta');
    expect(scene).toContain('this.syncVillageNpcs(heavyRenderDelta)');
    expect(scene).toContain('this.mobileProfile ? 3 : 6');
    expect(scene).toContain('if (this.mobileProfile && treeIndex >= 2) return');
    expect(scene).toContain('this.captureAmbientWorldTweens()');
    expect(scene).toContain('entry.tween.pause()');
    expect(scene).toContain('this.ambientWorldObjects');
    expect(scene).toContain('entry.object.setVisible(');
  });

  it('ships large authored backgrounds as compressed WebP textures', () => {
    expect(manifest).toContain('moonshadow-village-world-v1.webp');
    expect(manifest).toContain('ulleung-government-district-v3.webp');
    expect(manifest).toContain('jeonju-castle-town-v1.webp');
    expect(manifest).toContain('pyongyang-outer-v1.webp');
    expect(manifest).toContain('pyongyang-daedong-gate-v1.webp');
    expect(manifest).toContain('pyongyang-inner-v1.webp');
  });
});
