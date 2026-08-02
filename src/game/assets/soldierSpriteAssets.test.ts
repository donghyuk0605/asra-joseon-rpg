import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

const assertNormalizedAtlas = (path: string) => {
  const png = readFileSync(new URL(`../../../public${path}`, import.meta.url));
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(256 * 8);
  expect(png.readUInt32BE(20)).toBe(256 * 5);
  expect([4, 6]).toContain(png[25]);
};

describe('Joseon soldier role sprite assets', () => {
  it('ships distinct action atlases for spearmen, archers, and police commanders', () => {
    const roleAssets = [
      ASSETS.monsters['ulleung-veteran'],
      ASSETS.monsters['ulleung-archer'],
      ASSETS.monsters['ulleung-captain'],
    ];
    expect(new Set(roleAssets.map((asset) => asset.key)).size).toBe(3);
    roleAssets.forEach((asset) => assertNormalizedAtlas(asset.path));
  });

  it('shares role-correct atlases across the mainland armies without reverting to bandit art', () => {
    expect(ASSETS.monsters['yeongwol-spearman']).toEqual(ASSETS.monsters['ulleung-veteran']);
    expect(ASSETS.monsters['yeongwol-archer']).toEqual(ASSETS.monsters['ulleung-archer']);
    expect(ASSETS.monsters['yeongwol-commander']).toEqual(ASSETS.monsters['ulleung-captain']);
    expect(ASSETS.monsters['jeonju-spearman']).toEqual(ASSETS.monsters['ulleung-veteran']);
    expect(ASSETS.monsters['jeonju-archer']).toEqual(ASSETS.monsters['ulleung-archer']);
    expect(ASSETS.monsters['jeonju-commander']).toEqual(ASSETS.monsters['ulleung-captain']);
  });

  it('gives shield formations and sickle militia their own normalized silhouettes', () => {
    const shield = ASSETS.monsters['jeonju-shield'];
    const militia = ASSETS.monsters['jeonju-militia-sickle'];
    expect(shield.path).toBe('/assets/monsters/joseon-shield-guard-actions-v1.png');
    expect(ASSETS.monsters['yeongwol-shield']).toEqual(shield);
    expect(shield.key).not.toBe(ASSETS.monsters['jeonju-swordsman'].key);
    expect(militia.path).toBe('/assets/characters/joseon-peasant-militia-actions-v1.png');
    expect(militia.key).not.toBe(ASSETS.monsters.bandit.key);
    assertNormalizedAtlas(shield.path);
    assertNormalizedAtlas(militia.path);
  });
});

describe('Jurchen frontier role sprite assets', () => {
  it('ships five dedicated 40-frame Jurchen atlases including the tribal chieftain', () => {
    const roleAssets = [
      ASSETS.monsters['manchu-lancer'],
      ASSETS.monsters['manchu-archer'],
      ASSETS.monsters['manchu-cavalry'],
      ASSETS.monsters['manchu-captain'],
      ASSETS.monsters['manchu-chieftain'],
    ];
    expect(new Set(roleAssets.map((asset) => asset.key)).size).toBe(5);
    expect(roleAssets.every((asset) => /jurchen-/.test(asset.path))).toBe(true);
    expect(roleAssets.every((asset) => !/joseon-/.test(asset.path))).toBe(true);
    roleAssets.forEach((asset) => assertNormalizedAtlas(asset.path));
  });

  it('ships a unique 40-frame crown-prince atlas for the Gyeongbokgung encounter', () => {
    const prince = ASSETS.monsters['joseon-prince'];
    expect(prince.path).toBe('/assets/characters/joseon-crown-prince-actions-v1.png');
    assertNormalizedAtlas(prince.path);
  });

  it('keeps the opposing Joseon border line on Joseon role atlases', () => {
    expect(ASSETS.monsters['joseon-border-spearman']).toEqual(ASSETS.monsters['ulleung-veteran']);
    expect(ASSETS.monsters['joseon-border-archer']).toEqual(ASSETS.monsters['ulleung-archer']);
    expect(ASSETS.monsters['joseon-border-commander']).toEqual(ASSETS.monsters['ulleung-captain']);
  });
});

describe('Japanese campaign role sprite assets', () => {
  it('uses role-correct Japanese action atlases for the Ulleung Wako invasion', () => {
    const raider = ASSETS.monsters['wako-raider'];
    const archer = ASSETS.monsters['wako-archer'];
    const captain = ASSETS.monsters['wako-captain'];

    expect(raider).toEqual(ASSETS.monsters['japanese-swordsman']);
    expect(archer).toEqual(ASSETS.monsters['japanese-archer']);
    expect(captain).toEqual(ASSETS.monsters['japanese-general']);
    expect(new Set([raider.key, archer.key, captain.key]).size).toBe(3);
    [raider, archer, captain].forEach((asset) => assertNormalizedAtlas(asset.path));
  });

  it('ships six dedicated 40-frame atlases from swordsman through Shogun', () => {
    const roleAssets = [
      ASSETS.monsters['japanese-swordsman'],
      ASSETS.monsters['japanese-spearman'],
      ASSETS.monsters['japanese-archer'],
      ASSETS.monsters['japanese-gunner'],
      ASSETS.monsters['japanese-general'],
      ASSETS.monsters['japanese-shogun'],
    ];
    expect(new Set(roleAssets.map((asset) => asset.key)).size).toBe(6);
    expect(roleAssets.every((asset) => /japanese-/.test(asset.path))).toBe(true);
    expect(roleAssets.every((asset) => !/joseon-|bandit/.test(asset.path))).toBe(true);
    roleAssets.forEach((asset) => assertNormalizedAtlas(asset.path));
  });
});
