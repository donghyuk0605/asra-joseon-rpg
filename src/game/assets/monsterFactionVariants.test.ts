import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

const sha256 = (path: string) => createHash('sha256')
  .update(readFileSync(new URL(`../../../public${path}`, import.meta.url)))
  .digest('hex');

describe('complete monster faction image set', () => {
  it('gives every active monster kind a dedicated visual key and byte identity', () => {
    const monsters = Object.values(ASSETS.monsters);
    expect(new Set(monsters.map((asset) => asset.key)).size).toBe(monsters.length);
    expect(new Set(monsters.map((asset) => sha256(asset.path))).size).toBe(monsters.length);
  });

  it('ships immutable 8x5 motion with visible faction and species treatments', () => {
    expect(() => execFileSync('python3', ['scripts/validate_monster_faction_variants.py'], {
      cwd: new URL('../../../', import.meta.url),
      stdio: 'pipe',
    })).not.toThrow();
  }, 30_000);

  it('separates the largest former reuse fleets by region, rank and campaign', () => {
    const kinds = [
      'ulleung-guard', 'ulleung-executioner', 'yeongwol-swordsman', 'jeonju-swordsman',
      'joseon-border-swordsman', 'royal-guard', 'osaka-overseer', 'osaka-ronin',
      'wako-raider', 'japanese-swordsman', 'japanese-sika-deer', 'ulleung-water-deer',
      'japanese-wild-boar', 'boar',
    ] as const;
    expect(new Set(kinds.map((kind) => ASSETS.monsters[kind].path)).size).toBe(kinds.length);
  });
});
