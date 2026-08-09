import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from '../assets/manifest';
import type { PlayerOrigin } from '../simulation/types';
import { PROTAGONIST_VISUALS, protagonistTextureMatchesOrigin } from './protagonistVisuals';

const ORIGINS: PlayerOrigin[] = [
  'kim-donghyeok',
  'frontier-archer',
  'osaka-mudang',
  'gwanghae-prince',
];

describe('protagonist visual identity contract', () => {
  it('keeps every portrait and world atlas assigned to its chosen protagonist', () => {
    expect(Object.keys(PROTAGONIST_VISUALS)).toEqual(ORIGINS);
    const portraits = ORIGINS.map((origin) => PROTAGONIST_VISUALS[origin].portraitPath);
    expect(new Set(portraits)).toHaveLength(ORIGINS.length);
    for (const origin of ORIGINS) {
      const profile = PROTAGONIST_VISUALS[origin];
      expect(profile.displayName.length).toBeGreaterThan(1);
      expect(profile.worldTextureKeys.length).toBeGreaterThan(0);
      expect(existsSync(new URL(`../../../public${profile.portraitPath}`, import.meta.url))).toBe(true);
    }
  });

  it('rejects Kim textures for every non-Kim protagonist', () => {
    const kimTextures = PROTAGONIST_VISUALS['kim-donghyeok'].worldTextureKeys;
    for (const origin of ORIGINS.filter((entry) => entry !== 'kim-donghyeok')) {
      for (const texture of kimTextures) expect(protagonistTextureMatchesOrigin(origin, texture)).toBe(false);
    }
    expect(protagonistTextureMatchesOrigin('frontier-archer', ASSETS.frontierArcher.key)).toBe(true);
    expect(protagonistTextureMatchesOrigin('frontier-archer', ASSETS.frontierMelee.key)).toBe(true);
    expect(protagonistTextureMatchesOrigin('osaka-mudang', ASSETS.osakaMudang.key)).toBe(true);
    expect(protagonistTextureMatchesOrigin('gwanghae-prince', ASSETS.gwanghaePrince.key)).toBe(true);
  });
});
