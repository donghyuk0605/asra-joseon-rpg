import type { Vec2 } from '../simulation/types';
import { bossForFloor } from '../bosses/catalog';
import type { BossId } from '../bosses/types';

export const MAX_DUNGEON_FLOOR = 100;
export const DUNGEON_WALKABLE_BOUNDS = {
  left: 140,
  right: 1396,
  top: 145,
  bottom: 900,
} as const;
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
  const jitter = () => Math.round((random() - 0.5) * 30);
  const baseSpawns: Vec2[] = pattern === 'crossroads'
    ? [
      { x: 250, y: 320 }, { x: 510, y: 265 }, { x: 1026, y: 265 }, { x: 1286, y: 320 },
      { x: 285, y: 690 }, { x: 540, y: 750 }, { x: 996, y: 750 }, { x: 1251, y: 690 },
    ]
    : pattern === 'ring'
      ? [
        { x: 300, y: 290 }, { x: 768, y: 235 }, { x: 1236, y: 290 }, { x: 1290, y: 510 },
        { x: 1210, y: 735 }, { x: 900, y: 790 }, { x: 450, y: 790 }, { x: 246, y: 510 },
      ]
      : pattern === 'gauntlet'
        ? [
          { x: 260, y: 310 }, { x: 490, y: 370 }, { x: 780, y: 300 }, { x: 1070, y: 370 },
          { x: 1276, y: 285 }, { x: 340, y: 710 }, { x: 780, y: 690 }, { x: 1196, y: 735 },
        ]
        : pattern === 'maze'
          ? [
            { x: 1250, y: 810 }, { x: 1170, y: 685 }, { x: 330, y: 650 }, { x: 410, y: 535 },
            { x: 1210, y: 505 }, { x: 1120, y: 390 }, { x: 350, y: 350 }, { x: 285, y: 235 },
          ]
          : [
            { x: 390, y: 315 }, { x: 768, y: 250 }, { x: 1146, y: 315 }, { x: 1250, y: 510 },
            { x: 1146, y: 710 }, { x: 768, y: 775 }, { x: 390, y: 710 }, { x: 286, y: 510 },
          ];

  const features: DungeonFeature[] = pattern === 'crossroads'
    ? [
      { kind: 'wall', x: 380, y: 510, width: 390, height: 42 },
      { kind: 'wall', x: 1156, y: 510, width: 390, height: 42 },
      { kind: 'pillar', x: 620, y: 390, radius: 32 }, { kind: 'pillar', x: 916, y: 630, radius: 32 },
      { kind: 'trap', x: 768, y: 510, radius: 38 },
    ] : pattern === 'ring'
      ? [
        { kind: 'wall', x: 768, y: 370, width: 520, height: 34 }, { kind: 'wall', x: 768, y: 650, width: 520, height: 34 },
        { kind: 'pillar', x: 430, y: 510, radius: 36 }, { kind: 'pillar', x: 1106, y: 510, radius: 36 },
        { kind: 'seal', x: 768, y: 510, radius: 68 },
      ] : pattern === 'gauntlet'
        ? [
          { kind: 'wall', x: 505, y: 430, width: 42, height: 330 }, { kind: 'wall', x: 1031, y: 600, width: 42, height: 330 },
          { kind: 'trap', x: 650, y: 420, radius: 32 }, { kind: 'trap', x: 886, y: 600, radius: 32 },
          { kind: 'pillar', x: 768, y: 510, radius: 42 },
        ]
        : pattern === 'maze'
          ? [
            // Alternating openings force a readable S-route from the entrance
            // to the upper stair instead of a straight-line rush.
            { kind: 'wall', x: 555, y: 760, width: 930, height: 34 },
            { kind: 'wall', x: 981, y: 620, width: 930, height: 34 },
            { kind: 'wall', x: 555, y: 480, width: 930, height: 34 },
            { kind: 'wall', x: 981, y: 340, width: 930, height: 34 },
            { kind: 'pillar', x: 1240, y: 700, radius: 32 },
            { kind: 'pillar', x: 296, y: 560, radius: 32 },
            { kind: 'pillar', x: 1240, y: 420, radius: 32 },
            { kind: 'trap', x: 1160, y: 690, radius: 30 },
            { kind: 'trap', x: 376, y: 550, radius: 30 },
            { kind: 'trap', x: 1160, y: 410, radius: 30 },
          ]
        : [
          { kind: 'pillar', x: 420, y: 345, radius: 38 }, { kind: 'pillar', x: 1116, y: 345, radius: 38 },
          { kind: 'pillar', x: 420, y: 690, radius: 38 }, { kind: 'pillar', x: 1116, y: 690, radius: 38 },
          { kind: 'seal', x: 768, y: 510, radius: bossFloor ? 96 : 74 },
        ];

  const nextStairs: Vec2 = pattern === 'maze'
    ? { x: 205, y: 170 }
    : pattern === 'sanctum'
      ? { x: 768, y: 170 }
      : { x: 1290, y: 170 };

  return {
    floor, maxFloor: MAX_DUNGEON_FLOOR, pattern, title: floorTitle(floor),
    playerSpawn: { x: 768, y: 875 },
    exitStairs: { x: 255, y: 875 },
    nextStairs,
    monsterSpawns: boss ? [] : baseSpawns.map((point) => ({ x: point.x + jitter(), y: point.y + jitter() })),
    features,
    isBossFloor: boss !== null,
    bossId: boss?.id ?? null,
  };
}
