import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import type { JapanExpansionRegionId } from './regions';
import type { TreeSpecies } from './treeSpecies';

export const JAPAN_EXPANSION_REGION_IDS = [
  'sakaicity',
  'izumihunt',
  'awajicoast',
  'ikiport',
  'tsushimahunt',
  'izuhara',
] as const satisfies readonly JapanExpansionRegionId[];

/**
 * Shared coast profile used by both the renderer and collision layer. Values
 * are the distance from the owning map edge to the dry shoreline at evenly
 * spaced Y samples from 0 through MAP_HEIGHT.
 */
export const JAPAN_SHORELINE_SAMPLES = [
  188,
  214,
  174,
  205,
  182,
  220,
  176,
  202,
  190,
] as const;

export const JAPAN_SHORELINE_SAMPLE_STEP = MAP_HEIGHT / (JAPAN_SHORELINE_SAMPLES.length - 1);
export const JAPAN_SHORELINE_COLLISION_SEGMENT_HEIGHT = 32;
export const JAPAN_DOCK_OPENING_HALF_HEIGHT = 64;
export const JAPAN_DOCK_X_INSET = 200;

/** Dock positions avoid the nearby watchtower footprints in each port map. */
export const JAPAN_DOCK_Y_BY_REGION: Readonly<Record<JapanExpansionRegionId, number>> = {
  sakaicity: 620,
  izumihunt: 750,
  awajicoast: 750,
  ikiport: 680,
  tsushimahunt: 750,
  izuhara: 680,
};

export const japanShorelineWidthAtY = (localY: number): number => {
  const y = Math.max(0, Math.min(MAP_HEIGHT, localY));
  const samplePosition = y / JAPAN_SHORELINE_SAMPLE_STEP;
  const lowerIndex = Math.min(
    JAPAN_SHORELINE_SAMPLES.length - 2,
    Math.floor(samplePosition),
  );
  const interpolation = Math.min(1, samplePosition - lowerIndex);
  const lower = JAPAN_SHORELINE_SAMPLES[lowerIndex];
  const upper = JAPAN_SHORELINE_SAMPLES[lowerIndex + 1];
  return lower + (upper - lower) * interpolation;
};

export type JapanExpansionPropKind =
  | 'outer-gate'
  | 'inner-gate'
  | 'watchtower'
  | 'barracks'
  | 'palisade'
  | 'armory'
  | 'headquarters'
  | 'pine'
  | 'shrine'
  | 'cart'
  | 'workstation';

export type JapanExpansionCollision =
  | { type: 'box'; width: number; height: number; offsetX?: number; offsetY?: number }
  | { type: 'circle'; radius: number; offsetX?: number; offsetY?: number };

export type JapanExpansionProp = {
  kind: JapanExpansionPropKind;
  x: number;
  y: number;
  width: number;
  height: number;
  flipX?: boolean;
  tint?: number;
  treeSpecies?: TreeSpecies;
  collisions?: readonly JapanExpansionCollision[];
};

export type JapanExpansionLayout = {
  id: JapanExpansionRegionId;
  category: 'city' | 'hunt';
  floorTint: number;
  washColor: number;
  roadColor: number;
  subtitle: string;
  waterSide?: 'left' | 'right' | 'both';
  props: readonly JapanExpansionProp[];
};

const cityBarracks = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xd3c6af,
): JapanExpansionProp => ({
  kind: 'barracks',
  x,
  y,
  width: 500,
  height: 360,
  flipX,
  tint,
  collisions: [{ type: 'box', width: 430, height: 180, offsetY: -66 }],
});

const pine = (
  x: number,
  y: number,
  width = 286,
  tint = 0xb9c7b4,
  treeSpecies: TreeSpecies = 'coastal-black-pine',
): JapanExpansionProp => ({
  kind: 'pine',
  x,
  y,
  width,
  height: Math.round(width * 4 / 3),
  tint,
  treeSpecies,
  collisions: [{ type: 'circle', radius: Math.round(width * 0.23), offsetY: -22 }],
});

/**
 * Japanese regions use clean procedural ground under large, consistently
 * scaled runtime props. Water, roads, buildings and trees therefore remain
 * separate render/collision layers instead of being baked into one misleading
 * full-map illustration.
 */
export const JAPAN_EXPANSION_LAYOUTS: Record<JapanExpansionRegionId, JapanExpansionLayout> = {
  sakaicity: {
    id: 'sakaicity',
    category: 'city',
    floorTint: 0xaeb7ad,
    washColor: 0x455f5a,
    roadColor: 0xb89d72,
    subtitle: '상인 회관 · 포구 창고 · 용병 검문대',
    waterSide: 'right',
    props: [
      {
        kind: 'outer-gate', x: 768, y: 1012, width: 620, height: 474, tint: 0xd0c1a8,
        collisions: [
          { type: 'box', width: 170, height: 110, offsetX: -245, offsetY: -55 },
          { type: 'box', width: 170, height: 110, offsetX: 245, offsetY: -55 },
        ],
      },
      {
        kind: 'inner-gate', x: 768, y: 164, width: 540, height: 357, tint: 0xc8b89f,
        collisions: [
          { type: 'box', width: 120, height: 84, offsetX: -215, offsetY: -42 },
          { type: 'box', width: 120, height: 84, offsetX: 215, offsetY: -42 },
        ],
      },
      cityBarracks(300, 432),
      cityBarracks(1236, 432, true),
      cityBarracks(310, 730, false, 0xc6b8a3),
      { kind: 'armory', x: 1220, y: 752, width: 270, height: 244, flipX: true, tint: 0xd2c1a6, collisions: [{ type: 'box', width: 210, height: 96, offsetY: -36 }] },
      { kind: 'watchtower', x: 168, y: 810, width: 310, height: 350, tint: 0xc8b799, collisions: [{ type: 'box', width: 164, height: 128, offsetY: -40 }] },
      { kind: 'watchtower', x: 1368, y: 810, width: 310, height: 350, flipX: true, tint: 0xc8b799, collisions: [{ type: 'box', width: 164, height: 128, offsetY: -40 }] },
      { kind: 'palisade', x: 360, y: 244, width: 390, height: 154, tint: 0xc4b293, collisions: [{ type: 'box', width: 350, height: 68, offsetY: -22 }] },
      { kind: 'palisade', x: 1176, y: 244, width: 390, height: 154, flipX: true, tint: 0xc4b293, collisions: [{ type: 'box', width: 350, height: 68, offsetY: -22 }] },
    ],
  },
  izumihunt: {
    id: 'izumihunt',
    category: 'hunt',
    floorTint: 0xa6b49f,
    washColor: 0x36553c,
    roadColor: 0xa68c63,
    subtitle: '대숲 비탈 · 낭인 매복로 · 멧돼지 터',
    props: [
      pine(210, 310, 310, 0xaac4a8, 'bamboo'),
      pine(1326, 300, 326, 0xa8c1a3, 'bamboo'),
      pine(290, 590, 282, 0x9fb999, 'bamboo'),
      pine(1245, 600, 300, 0x9fb99b, 'bamboo'),
      pine(190, 855, 292, 0xa7bca0, 'bamboo'),
      pine(1345, 845, 310, 0xa8bfa2, 'bamboo'),
      { kind: 'shrine', x: 350, y: 785, width: 218, height: 218, tint: 0xd5cdbb, collisions: [{ type: 'circle', radius: 62, offsetY: -18 }] },
      { kind: 'cart', x: 1180, y: 790, width: 224, height: 224, flipX: true, tint: 0xc3b9a5, collisions: [{ type: 'circle', radius: 66, offsetY: -8 }] },
      { kind: 'watchtower', x: 1320, y: 455, width: 300, height: 344, flipX: true, tint: 0xb7aa91, collisions: [{ type: 'box', width: 158, height: 122, offsetY: -38 }] },
    ],
  },
  awajicoast: {
    id: 'awajicoast',
    category: 'hunt',
    floorTint: 0xabb8b2,
    washColor: 0x3d6062,
    roadColor: 0xb6a174,
    subtitle: '세토 내해 물길 · 왜구 망루 · 해안 야수터',
    waterSide: 'both',
    props: [
      { kind: 'watchtower', x: 240, y: 380, width: 304, height: 350, tint: 0xc1b598, collisions: [{ type: 'box', width: 164, height: 130, offsetY: -40 }] },
      { kind: 'watchtower', x: 1296, y: 380, width: 304, height: 350, flipX: true, tint: 0xc1b598, collisions: [{ type: 'box', width: 164, height: 130, offsetY: -40 }] },
      { kind: 'palisade', x: 300, y: 650, width: 360, height: 142, tint: 0xbdae8f, collisions: [{ type: 'box', width: 326, height: 62, offsetY: -20 }] },
      { kind: 'palisade', x: 1236, y: 650, width: 360, height: 142, flipX: true, tint: 0xbdae8f, collisions: [{ type: 'box', width: 326, height: 62, offsetY: -20 }] },
      { kind: 'cart', x: 390, y: 825, width: 224, height: 224, tint: 0xc5baa3, collisions: [{ type: 'circle', radius: 64, offsetY: -8 }] },
      pine(1180, 825, 280, 0xa6bca7, 'coastal-black-pine'),
      { kind: 'armory', x: 1160, y: 535, width: 244, height: 220, flipX: true, tint: 0xc7baa0, collisions: [{ type: 'box', width: 190, height: 88, offsetY: -30 }] },
    ],
  },
  ikiport: {
    id: 'ikiport',
    category: 'city',
    floorTint: 0xaeb5aa,
    washColor: 0x485e59,
    roadColor: 0xb39a70,
    subtitle: '섬 장터 · 어선 부두 · 왜구 보급창',
    waterSide: 'left',
    props: [
      {
        kind: 'outer-gate', x: 768, y: 1010, width: 600, height: 458, tint: 0xcec0a7,
        collisions: [
          { type: 'box', width: 165, height: 108, offsetX: -242, offsetY: -54 },
          { type: 'box', width: 165, height: 108, offsetX: 242, offsetY: -54 },
        ],
      },
      {
        kind: 'inner-gate', x: 768, y: 166, width: 520, height: 344, tint: 0xc2b399,
        collisions: [
          { type: 'box', width: 116, height: 82, offsetX: -210, offsetY: -41 },
          { type: 'box', width: 116, height: 82, offsetX: 210, offsetY: -41 },
        ],
      },
      cityBarracks(310, 445, false, 0xc9bda8),
      cityBarracks(1225, 445, true, 0xc9bda8),
      cityBarracks(1200, 735, true, 0xbfb29e),
      { kind: 'workstation', x: 350, y: 740, width: 244, height: 220, tint: 0xd0c2a9, collisions: [{ type: 'box', width: 190, height: 88, offsetY: -28 }] },
      { kind: 'watchtower', x: 155, y: 850, width: 304, height: 350, tint: 0xc1b397, collisions: [{ type: 'box', width: 160, height: 126, offsetY: -40 }] },
      { kind: 'watchtower', x: 1380, y: 850, width: 304, height: 350, flipX: true, tint: 0xc1b397, collisions: [{ type: 'box', width: 160, height: 126, offsetY: -40 }] },
      { kind: 'palisade', x: 360, y: 250, width: 380, height: 150, tint: 0xbfae8e, collisions: [{ type: 'box', width: 340, height: 66, offsetY: -21 }] },
      { kind: 'palisade', x: 1176, y: 250, width: 380, height: 150, flipX: true, tint: 0xbfae8e, collisions: [{ type: 'box', width: 340, height: 66, offsetY: -21 }] },
    ],
  },
  tsushimahunt: {
    id: 'tsushimahunt',
    category: 'hunt',
    floorTint: 0xa5b09f,
    washColor: 0x344d3c,
    roadColor: 0x9f895f,
    subtitle: '아리아케산 남록 · 사슴 군락 · 산적 활터',
    props: [
      pine(185, 300, 326, 0x9eb59e, 'wind-red-pine'),
      pine(1360, 300, 328, 0x9db59d, 'coastal-black-pine'),
      pine(285, 535, 302, 0x9aae98, 'coastal-black-pine'),
      pine(1250, 540, 306, 0x98ad97, 'wind-red-pine'),
      pine(180, 800, 326, 0xa1b59c, 'coastal-black-pine'),
      pine(1350, 800, 328, 0x9fb49c, 'wind-red-pine'),
      { kind: 'shrine', x: 340, y: 735, width: 226, height: 226, tint: 0xd0c9b7, collisions: [{ type: 'circle', radius: 64, offsetY: -18 }] },
      { kind: 'palisade', x: 1190, y: 715, width: 350, height: 138, flipX: true, tint: 0xb8a98d, collisions: [{ type: 'box', width: 314, height: 60, offsetY: -18 }] },
      { kind: 'watchtower', x: 1235, y: 450, width: 300, height: 344, flipX: true, tint: 0xb7a98e, collisions: [{ type: 'box', width: 158, height: 122, offsetY: -38 }] },
    ],
  },
  izuhara: {
    id: 'izuhara',
    category: 'city',
    floorTint: 0xadb1a8,
    washColor: 0x4c5550,
    roadColor: 0xb09a72,
    subtitle: '후추 성하 · 도주군 진영 · 부산포 출항문',
    waterSide: 'right',
    props: [
      {
        kind: 'outer-gate', x: 768, y: 1012, width: 630, height: 482, tint: 0xcabca3,
        collisions: [
          { type: 'box', width: 175, height: 112, offsetX: -248, offsetY: -56 },
          { type: 'box', width: 175, height: 112, offsetX: 248, offsetY: -56 },
        ],
      },
      {
        kind: 'headquarters', x: 768, y: 300, width: 720, height: 390, tint: 0xc5b69e,
        collisions: [
          { type: 'box', width: 155, height: 160, offsetX: -235, offsetY: -58 },
          { type: 'box', width: 155, height: 160, offsetX: 235, offsetY: -58 },
        ],
      },
      cityBarracks(300, 625, false, 0xc6b9a4),
      cityBarracks(1236, 625, true, 0xc6b9a4),
      { kind: 'watchtower', x: 168, y: 850, width: 312, height: 356, tint: 0xbfb092, collisions: [{ type: 'box', width: 166, height: 130, offsetY: -41 }] },
      { kind: 'watchtower', x: 1368, y: 850, width: 312, height: 356, flipX: true, tint: 0xbfb092, collisions: [{ type: 'box', width: 166, height: 130, offsetY: -41 }] },
      { kind: 'palisade', x: 355, y: 390, width: 360, height: 142, tint: 0xb9aa8c, collisions: [{ type: 'box', width: 324, height: 62, offsetY: -20 }] },
      { kind: 'palisade', x: 1181, y: 390, width: 360, height: 142, flipX: true, tint: 0xb9aa8c, collisions: [{ type: 'box', width: 324, height: 62, offsetY: -20 }] },
      { kind: 'armory', x: 1180, y: 785, width: 252, height: 228, flipX: true, tint: 0xc9b99e, collisions: [{ type: 'box', width: 196, height: 90, offsetY: -31 }] },
    ],
  },
};

export type JapanExpansionWorldObstacle =
  | { type: 'box'; x: number; y: number; width: number; height: number }
  | { type: 'circle'; x: number; y: number; radius: number };

const japanShorelineWaterObstacles = (
  region: JapanExpansionRegionId,
  side: 'left' | 'right',
): JapanExpansionWorldObstacle[] => {
  const origin = REGION_ORIGINS[region];
  const dockY = JAPAN_DOCK_Y_BY_REGION[region];
  const dockOpeningTop = dockY - JAPAN_DOCK_OPENING_HALF_HEIGHT;
  const dockOpeningBottom = dockY + JAPAN_DOCK_OPENING_HALF_HEIGHT;
  const obstacles: JapanExpansionWorldObstacle[] = [];

  for (
    let top = 0;
    top < MAP_HEIGHT;
    top += JAPAN_SHORELINE_COLLISION_SEGMENT_HEIGHT
  ) {
    const bottom = Math.min(MAP_HEIGHT, top + JAPAN_SHORELINE_COLLISION_SEGMENT_HEIGHT);
    if (bottom > dockOpeningTop && top < dockOpeningBottom) continue;

    const middle = (top + bottom) / 2;
    const width = Math.ceil(Math.max(
      japanShorelineWidthAtY(top),
      japanShorelineWidthAtY(middle),
      japanShorelineWidthAtY(bottom),
    ));
    obstacles.push({
      type: 'box',
      x: origin.x + (side === 'left' ? width / 2 : MAP_WIDTH - width / 2),
      y: origin.y + middle,
      width,
      height: bottom - top,
    });
  }

  return obstacles;
};

export const japanExpansionWorldObstacles = (): JapanExpansionWorldObstacle[] => (
  JAPAN_EXPANSION_REGION_IDS.flatMap((region) => {
    const origin = REGION_ORIGINS[region];
    const layout = JAPAN_EXPANSION_LAYOUTS[region];
    const propObstacles = layout.props.flatMap((prop): JapanExpansionWorldObstacle[] => (
      (prop.collisions ?? []).map((collision): JapanExpansionWorldObstacle => {
        const x = origin.x + prop.x + (collision.offsetX ?? 0);
        const y = origin.y + prop.y + (collision.offsetY ?? 0);
        return collision.type === 'circle'
          ? { type: 'circle', x, y, radius: collision.radius }
          : { type: 'box', x, y, width: collision.width, height: collision.height };
      })
    ));
    const waterSides = layout.waterSide === 'both'
      ? (['left', 'right'] as const)
      : layout.waterSide
        ? ([layout.waterSide] as const)
        : [];
    const waterObstacles = waterSides.flatMap((side) => (
      japanShorelineWaterObstacles(region, side)
    ));
    return [...propObstacles, ...waterObstacles];
  })
);
