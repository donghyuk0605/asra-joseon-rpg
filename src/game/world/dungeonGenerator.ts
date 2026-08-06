import type { Vec2 } from '../simulation/types';
import { bossForFloor } from '../bosses/catalog';
import type { BossId } from '../bosses/types';

export const MAX_DUNGEON_FLOOR = 100;
export type DungeonPatternId = 'crossroads' | 'ring' | 'gauntlet' | 'maze' | 'sanctum';
export type DungeonFeature =
  | { kind: 'wall'; x: number; y: number; width: number; height: number }
  | { kind: 'pillar' | 'trap' | 'seal'; x: number; y: number; radius: number };

export type DungeonFloorLayout = {
  floor: number;
  maxFloor: number;
  pattern: DungeonPatternId;
  title: string;
  playerSpawn: Vec2;
  exitStairs: Vec2;
  nextStairs: Vec2;
  monsterSpawns: Vec2[];
  features: DungeonFeature[];
  isBossFloor: boolean;
  bossId: BossId | null;
};

const PATTERNS: DungeonPatternId[] = ['crossroads', 'ring', 'gauntlet', 'maze'];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function floorTitle(floor: number): string {
  if (floor >= 90) return '무영 심연';
  if (floor >= 60) return '월식 광맥';
  if (floor >= 30) return '봉인 심층';
  if (floor >= 10) return '철귀 회랑';
  return '버려진 갱도';
}

export function generateDungeonFloor(requestedFloor: number): DungeonFloorLayout {
  const floor = Math.max(1, Math.min(MAX_DUNGEON_FLOOR, Math.floor(requestedFloor)));
  const random = seededRandom(floor * 7919 + 131);
  const bossFloor = floor % 10 === 0;
  const boss = bossForFloor(floor);
  const pattern = bossFloor ? 'sanctum' : PATTERNS[(floor - 1) % PATTERNS.length];
  const jitter = () => Math.round((random() - 0.5) * 38);
  const baseSpawns: Vec2[] = pattern === 'crossroads'
    ? [{ x: 480, y: 390 }, { x: 760, y: 330 }, { x: 1055, y: 390 }, { x: 500, y: 590 }, { x: 760, y: 650 }, { x: 1035, y: 590 }]
    : pattern === 'ring'
      ? [{ x: 490, y: 360 }, { x: 760, y: 310 }, { x: 1045, y: 375 }, { x: 1080, y: 610 }, { x: 760, y: 670 }, { x: 455, y: 590 }]
      : pattern === 'gauntlet'
        ? [{ x: 510, y: 360 }, { x: 760, y: 390 }, { x: 1015, y: 360 }, { x: 505, y: 615 }, { x: 760, y: 590 }, { x: 1030, y: 615 }]
        : pattern === 'maze'
          ? [{ x: 1110, y: 745 }, { x: 420, y: 625 }, { x: 760, y: 610 }, { x: 1100, y: 505 },
            { x: 410, y: 390 }, { x: 760, y: 360 }, { x: 1070, y: 275 }, { x: 430, y: 245 }]
          : [{ x: 610, y: 395 }, { x: 760, y: 350 }, { x: 910, y: 395 }, { x: 610, y: 575 }, { x: 760, y: 620 }, { x: 910, y: 575 }];

  const features: DungeonFeature[] = pattern === 'crossroads'
    ? [
      { kind: 'wall', x: 470, y: 505, width: 210, height: 42 },
      { kind: 'wall', x: 1065, y: 505, width: 210, height: 42 },
      { kind: 'pillar', x: 620, y: 430, radius: 30 }, { kind: 'pillar', x: 900, y: 580, radius: 30 },
      { kind: 'trap', x: 760, y: 500, radius: 34 },
    ] : pattern === 'ring'
      ? [
        { kind: 'wall', x: 760, y: 382, width: 330, height: 34 }, { kind: 'wall', x: 760, y: 625, width: 330, height: 34 },
        { kind: 'pillar', x: 560, y: 505, radius: 34 }, { kind: 'pillar', x: 960, y: 505, radius: 34 },
        { kind: 'seal', x: 760, y: 505, radius: 62 },
      ] : pattern === 'gauntlet'
        ? [
          { kind: 'wall', x: 600, y: 450, width: 40, height: 190 }, { kind: 'wall', x: 920, y: 560, width: 40, height: 190 },
          { kind: 'trap', x: 700, y: 450, radius: 30 }, { kind: 'trap', x: 820, y: 560, radius: 30 },
          { kind: 'pillar', x: 760, y: 505, radius: 38 },
        ]
        : pattern === 'maze'
          ? [
            // Alternating openings force a readable S-route from the entrance
            // to the upper stair instead of a straight-line rush.
            { kind: 'wall', x: 520, y: 700, width: 650, height: 34 },
            { kind: 'wall', x: 990, y: 580, width: 650, height: 34 },
            { kind: 'wall', x: 520, y: 460, width: 650, height: 34 },
            { kind: 'wall', x: 990, y: 340, width: 650, height: 34 },
            { kind: 'pillar', x: 1160, y: 680, radius: 30 },
            { kind: 'pillar', x: 360, y: 550, radius: 30 },
            { kind: 'pillar', x: 1160, y: 430, radius: 30 },
            { kind: 'trap', x: 980, y: 650, radius: 28 },
            { kind: 'trap', x: 520, y: 520, radius: 28 },
            { kind: 'trap', x: 980, y: 400, radius: 28 },
          ]
        : [
          { kind: 'pillar', x: 555, y: 390, radius: 34 }, { kind: 'pillar', x: 965, y: 390, radius: 34 },
          { kind: 'pillar', x: 555, y: 620, radius: 34 }, { kind: 'pillar', x: 965, y: 620, radius: 34 },
          { kind: 'seal', x: 760, y: 500, radius: bossFloor ? 82 : 66 },
        ];

  return {
    floor, maxFloor: MAX_DUNGEON_FLOOR, pattern, title: floorTitle(floor),
    playerSpawn: { x: 760, y: 785 },
    exitStairs: { x: 590, y: 800 },
    nextStairs: pattern === 'maze' ? { x: 420, y: 235 } : { x: 930, y: 800 },
    monsterSpawns: boss ? [] : baseSpawns.map((point) => ({ x: point.x + jitter(), y: point.y + jitter() })),
    features,
    isBossFloor: boss !== null,
    bossId: boss?.id ?? null,
  };
}
