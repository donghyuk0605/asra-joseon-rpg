import { describe, expect, it } from 'vitest';
import { BOSS_CATALOG, bossForFloor } from './catalog';

describe('boss catalog', () => {
  it('defines a unique three-pattern boss every ten floors', () => {
    expect(Object.keys(BOSS_CATALOG)).toHaveLength(10);
    for (let floor = 10; floor <= 100; floor += 10) {
      const boss = bossForFloor(floor);
      expect(boss?.floor).toBe(floor);
      expect(boss?.patterns).toHaveLength(3);
      expect(new Set(boss?.patterns.map((pattern) => pattern.id)).size).toBe(3);
    }
  });

  it('returns no boss on ordinary floors', () => {
    expect(bossForFloor(9)).toBeNull();
    expect(bossForFloor(11)).toBeNull();
  });
});
