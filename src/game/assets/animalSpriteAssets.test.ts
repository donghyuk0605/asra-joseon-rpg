import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

describe('Ulleung weak animal sprite assets', () => {
  it('registers a dedicated normalized 40-frame water-deer atlas', () => {
    expect(ASSETS.monsters['ulleung-water-deer']).toEqual({
      key: 'ulleung-water-deer-actions-v1',
      path: '/assets/monsters/ulleung-water-deer-actions-v1.png',
    });
    expect(statSync('public/assets/monsters/ulleung-water-deer-actions-v1.png').size).toBeGreaterThan(300_000);
    expect(ASSETS.monsters['ulleung-sangun']).toEqual({
      key: 'ulleung-sangun-actions-v1',
      path: '/assets/monsters/ulleung-sangun-actions-v1.png',
    });
    expect(statSync('public/assets/monsters/ulleung-sangun-actions-v1.png').size).toBeGreaterThan(500_000);
  });

  it('ships a dedicated five-direction walk and attack atlas for the northern gray wolf', () => {
    const wolf = ASSETS.monsters['korean-gray-wolf'];
    expect(wolf).toEqual({
      key: 'korean-gray-wolf-actions-v1',
      path: '/assets/monsters/korean-wolf-actions-v1.png',
    });
    const png = readFileSync(`public${wolf.path}`);
    expect(png.readUInt32BE(16)).toBe(2048);
    expect(png.readUInt32BE(20)).toBe(1280);
    expect([4, 6]).toContain(png[25]);
    expect(statSync(`public${wolf.path}`).size).toBeGreaterThan(500_000);
  });
});
