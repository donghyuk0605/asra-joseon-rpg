import { describe, expect, it } from 'vitest';
import {
  DUNGEON_WALKABLE_BOUNDS,
  generateDungeonFloor,
  MAX_DUNGEON_FLOOR,
} from './dungeonGenerator';

describe('dungeonGenerator', () => {
  it('rebuilds the same floor deterministically', () => {
    expect(generateDungeonFloor(37)).toEqual(generateDungeonFloor(37));
  });

  it('cycles reusable layouts and reserves every tenth floor for a sanctum', () => {
    expect(generateDungeonFloor(1).pattern).toBe('crossroads');
    expect(generateDungeonFloor(2).pattern).toBe('ring');
    expect(generateDungeonFloor(3).pattern).toBe('gauntlet');
    expect(generateDungeonFloor(4).pattern).toBe('maze');
    expect(generateDungeonFloor(10).pattern).toBe('sanctum');
  });

  it('turns every fourth route into a real zigzag maze with an upper exit', () => {
    const maze = generateDungeonFloor(4);
    expect(maze.pattern).toBe('maze');
    expect(maze.features.filter((feature) => feature.kind === 'wall')).toHaveLength(4);
    expect(maze.monsterSpawns).toHaveLength(8);
    expect(maze.nextStairs.y).toBeLessThan(maze.playerSpawn.y);
  });

  it('supports eight encounters per floor and clamps the tower to 100 floors', () => {
    const deepest = generateDungeonFloor(999);
    expect(deepest.floor).toBe(MAX_DUNGEON_FLOOR);
    expect(generateDungeonFloor(99).monsterSpawns).toHaveLength(8);
    expect(deepest.monsterSpawns).toHaveLength(0);
    expect(deepest.nextStairs).not.toEqual(deepest.exitStairs);
  });

  it('uses the full dungeon floor instead of clustering every room around the centre', () => {
    for (const floor of [1, 2, 3, 4]) {
      const layout = generateDungeonFloor(floor);
      const xs = layout.monsterSpawns.map((spawn) => spawn.x);
      const ys = layout.monsterSpawns.map((spawn) => spawn.y);
      expect(Math.max(...xs) - Math.min(...xs), `${layout.pattern}:width`).toBeGreaterThanOrEqual(950);
      expect(Math.max(...ys) - Math.min(...ys), `${layout.pattern}:height`).toBeGreaterThanOrEqual(450);
      expect(Math.hypot(
        layout.nextStairs.x - layout.playerSpawn.x,
        layout.nextStairs.y - layout.playerSpawn.y,
      ), `${layout.pattern}:route`).toBeGreaterThan(800);
    }
  });

  it('keeps player, stairs and encounters inside the expanded walkable bounds', () => {
    const inside = (point: { x: number; y: number }) => point.x >= DUNGEON_WALKABLE_BOUNDS.left
      && point.x <= DUNGEON_WALKABLE_BOUNDS.right
      && point.y >= DUNGEON_WALKABLE_BOUNDS.top
      && point.y <= DUNGEON_WALKABLE_BOUNDS.bottom;
    for (const floor of [1, 2, 3, 4, 10]) {
      const layout = generateDungeonFloor(floor);
      expect(inside(layout.playerSpawn), `${layout.pattern}:player`).toBe(true);
      expect(inside(layout.exitStairs), `${layout.pattern}:exit`).toBe(true);
      expect(inside(layout.nextStairs), `${layout.pattern}:next`).toBe(true);
      expect(layout.monsterSpawns.every(inside), `${layout.pattern}:monsters`).toBe(true);
    }
  });

  it('marks every tenth floor as a single-boss sanctum', () => {
    const floor = generateDungeonFloor(40);
    expect(floor.isBossFloor).toBe(true);
    expect(floor.bossId).toBe('iron-tiger');
    expect(floor.monsterSpawns).toHaveLength(0);
  });
});
