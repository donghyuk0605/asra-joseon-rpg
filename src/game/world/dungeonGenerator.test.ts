import { describe, expect, it } from 'vitest';
import { generateDungeonFloor, MAX_DUNGEON_FLOOR } from './dungeonGenerator';

describe('dungeonGenerator', () => {
  it('rebuilds the same floor deterministically', () => {
    expect(generateDungeonFloor(37)).toEqual(generateDungeonFloor(37));
  });

  it('cycles reusable layouts and reserves every tenth floor for a sanctum', () => {
    expect(generateDungeonFloor(1).pattern).toBe('crossroads');
    expect(generateDungeonFloor(2).pattern).toBe('ring');
    expect(generateDungeonFloor(3).pattern).toBe('gauntlet');
    expect(generateDungeonFloor(10).pattern).toBe('sanctum');
  });

  it('supports six encounters per floor and clamps the tower to 100 floors', () => {
    const deepest = generateDungeonFloor(999);
    expect(deepest.floor).toBe(MAX_DUNGEON_FLOOR);
    expect(generateDungeonFloor(99).monsterSpawns).toHaveLength(6);
    expect(deepest.monsterSpawns).toHaveLength(0);
    expect(deepest.nextStairs).not.toEqual(deepest.exitStairs);
  });

  it('marks every tenth floor as a single-boss sanctum', () => {
    const floor = generateDungeonFloor(40);
    expect(floor.isBossFloor).toBe(true);
    expect(floor.bossId).toBe('iron-tiger');
    expect(floor.monsterSpawns).toHaveLength(0);
  });
});
