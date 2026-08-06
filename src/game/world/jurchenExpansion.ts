import { REGION_ORIGINS } from './layout';
import type { JurchenExpansionRegionId } from './regions';
import type { TreeSpecies } from './treeSpecies';

export const JURCHEN_EXPANSION_REGION_IDS = [
  'changbaihunt',
  'baeksanvillage',
  'songhuahunt',
  'songhuavillage',
  'blackpinehunt',
  'heuksuvillage',
] as const satisfies readonly JurchenExpansionRegionId[];

/**
 * Frames in `jurchen-village-structures-v1.png`.
 *
 * Keeping the names beside the frame numbers lets the scene renderer remain
 * data-driven without silently changing the established six-frame atlas.
 */
export const JURCHEN_STRUCTURE_FRAMES = {
  'great-tent': 0,
  'hide-tent': 1,
  longhouse: 2,
  'palisade-gate': 3,
  watchtower: 4,
  'supply-sled': 5,
} as const;

export type JurchenStructureKind = keyof typeof JURCHEN_STRUCTURE_FRAMES;
export type JurchenExpansionPropKind = JurchenStructureKind | 'pine' | 'shrine' | 'cart';

export const isJurchenStructureKind = (
  kind: JurchenExpansionPropKind,
): kind is JurchenStructureKind => kind in JURCHEN_STRUCTURE_FRAMES;

export const jurchenStructureFrame = (kind: JurchenStructureKind): number =>
  JURCHEN_STRUCTURE_FRAMES[kind];

export type JurchenExpansionCollision =
  | { type: 'box'; width: number; height: number; offsetX?: number; offsetY?: number }
  | { type: 'circle'; radius: number; offsetX?: number; offsetY?: number };

export type JurchenExpansionProp = {
  kind: JurchenExpansionPropKind;
  x: number;
  y: number;
  width: number;
  height: number;
  flipX?: boolean;
  tint?: number;
  treeSpecies?: TreeSpecies;
  collisions?: readonly JurchenExpansionCollision[];
};

export type JurchenExpansionLayout = {
  id: JurchenExpansionRegionId;
  category: 'village' | 'hunt';
  floorTint: number;
  washColor: number;
  roadColor: number;
  snowColor: number;
  subtitle: string;
  props: readonly JurchenExpansionProp[];
};

const greatTent = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xd3dde0,
): JurchenExpansionProp => ({
  kind: 'great-tent',
  x,
  y,
  width: 520,
  height: 390,
  flipX,
  tint,
  collisions: [{ type: 'box', width: 430, height: 170, offsetY: -54 }],
});

const hideTent = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xc5ced0,
): JurchenExpansionProp => ({
  kind: 'hide-tent',
  x,
  y,
  width: 330,
  height: 330,
  flipX,
  tint,
  collisions: [{ type: 'circle', radius: 108, offsetY: -36 }],
});

const longhouse = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xc0cccf,
): JurchenExpansionProp => ({
  kind: 'longhouse',
  x,
  y,
  width: 450,
  height: 330,
  flipX,
  tint,
  collisions: [{ type: 'box', width: 390, height: 150, offsetY: -48 }],
});

const watchtower = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xc6d0d2,
): JurchenExpansionProp => ({
  kind: 'watchtower',
  x,
  y,
  width: 290,
  height: 330,
  flipX,
  tint,
  collisions: [{ type: 'box', width: 158, height: 126, offsetY: -39 }],
});

const supplySled = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xbfc8c8,
): JurchenExpansionProp => ({
  kind: 'supply-sled',
  x,
  y,
  width: 320,
  height: 235,
  flipX,
  tint,
  collisions: [{ type: 'box', width: 280, height: 88, offsetY: -24 }],
});

const palisadeGate = (
  y: number,
  flipX = false,
  tint = 0xc2cdcf,
): JurchenExpansionProp => ({
  kind: 'palisade-gate',
  x: 768,
  y,
  width: 690,
  height: 410,
  flipX,
  tint,
  collisions: [
    { type: 'box', width: 190, height: 118, offsetX: -260, offsetY: -56 },
    { type: 'box', width: 190, height: 118, offsetX: 260, offsetY: -56 },
  ],
});

const pine = (
  x: number,
  y: number,
  width = 310,
  tint = 0xb8c9c1,
  treeSpecies: TreeSpecies = 'birch',
): JurchenExpansionProp => ({
  kind: 'pine',
  x,
  y,
  width,
  height: Math.round(width * 4 / 3),
  tint,
  treeSpecies,
  collisions: [{ type: 'circle', radius: Math.round(width * 0.22), offsetY: -22 }],
});

const shrine = (
  x: number,
  y: number,
  tint = 0xd5d9d2,
): JurchenExpansionProp => ({
  kind: 'shrine',
  x,
  y,
  width: 230,
  height: 230,
  tint,
  collisions: [{ type: 'circle', radius: 64, offsetY: -18 }],
});

const cart = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xc8ceca,
): JurchenExpansionProp => ({
  kind: 'cart',
  x,
  y,
  width: 232,
  height: 232,
  flipX,
  tint,
  collisions: [{ type: 'circle', radius: 66, offsetY: -8 }],
});

/**
 * These maps reuse the neutral field floor and layer the existing Jurchen
 * structure atlas over it. Props stay on the outer thirds of each cell; the
 * middle road is deliberately clear from the south seam to the north seam.
 */
export const JURCHEN_EXPANSION_LAYOUTS: Record<
  JurchenExpansionRegionId,
  JurchenExpansionLayout
> = {
  changbaihunt: {
    id: 'changbaihunt',
    category: 'hunt',
    floorTint: 0xa9b7b2,
    washColor: 0x526969,
    roadColor: 0xa8a089,
    snowColor: 0xe1e7e3,
    subtitle: '자작나무 능선 · 사슴길 · 백산부 경계 초소',
    props: [
      pine(188, 265, 328, 0xc0d2ca, 'birch'),
      pine(1348, 255, 330, 0xbdcec7, 'birch'),
      pine(292, 515, 304, 0xb7cac1, 'birch'),
      pine(1244, 510, 308, 0xb6c8c0, 'birch'),
      pine(178, 810, 326, 0xb8c9c0, 'birch'),
      pine(1358, 805, 324, 0xb6c7bf, 'birch'),
      shrine(360, 842, 0xd8dcd5),
      cart(1175, 824, true, 0xc5ccc9),
      watchtower(1295, 645, true, 0xc5d0d1),
    ],
  },
  baeksanvillage: {
    id: 'baeksanvillage',
    category: 'village',
    floorTint: 0xa7b3b1,
    washColor: 0x485d61,
    roadColor: 0xa99b7e,
    snowColor: 0xdfe5e2,
    subtitle: '백산부 대천막 · 사냥 가죽촌 · 첫 번째 부족 맹약',
    props: [
      palisadeGate(1012),
      greatTent(310, 382, false, 0xd3dddf),
      longhouse(1220, 400, true, 0xc6d0d1),
      hideTent(300, 704, false, 0xc8d1d2),
      watchtower(1315, 710, true, 0xc8d2d3),
      supplySled(1135, 865, true, 0xbfc8c8),
      pine(150, 872, 300, 0xb5c7be, 'birch'),
      pine(1385, 250, 304, 0xb8cac2, 'coastal-black-pine'),
      shrine(1110, 655, 0xd3d8d2),
    ],
  },
  songhuahunt: {
    id: 'songhuahunt',
    category: 'hunt',
    floorTint: 0xa4b7b3,
    washColor: 0x405f62,
    roadColor: 0xaaa184,
    snowColor: 0xd9e2df,
    subtitle: '송화강 상류 · 넓은 사슴벌 · 늑대와 강변 순찰대',
    props: [
      pine(175, 250, 304, 0xb6cac0, 'birch'),
      pine(1360, 255, 306, 0xb6c8c0, 'willow'),
      pine(275, 500, 302, 0xafc3b9, 'willow'),
      pine(1260, 505, 304, 0xaec2b8, 'birch'),
      pine(170, 805, 312, 0xb4c7bc, 'birch'),
      pine(1365, 810, 314, 0xb3c6bc, 'willow'),
      supplySled(355, 790, false, 0xc2cbc8),
      cart(1165, 805, true, 0xc8cfca),
      watchtower(1265, 420, true, 0xc5d0d1),
    ],
  },
  songhuavillage: {
    id: 'songhuavillage',
    category: 'village',
    floorTint: 0xa2b3b2,
    washColor: 0x405b61,
    roadColor: 0xaa997b,
    snowColor: 0xdce4e1,
    subtitle: '강변 어로장 · 기마 전사촌 · 두 번째 부족 맹약',
    props: [
      palisadeGate(1012, true, 0xc0cbcd),
      longhouse(315, 400, false, 0xc4ced0),
      greatTent(1225, 382, true, 0xd0dbdd),
      watchtower(205, 710, false, 0xc5d0d1),
      hideTent(1230, 710, true, 0xc4cecf),
      supplySled(390, 862, false, 0xbfc8c7),
      pine(145, 252, 300, 0xb5c8bf, 'willow'),
      pine(1390, 870, 304, 0xb5c8bf, 'birch'),
      shrine(410, 650, 0xd2d8d2),
    ],
  },
  blackpinehunt: {
    id: 'blackpinehunt',
    category: 'hunt',
    floorTint: 0x98aaa5,
    washColor: 0x344c4c,
    roadColor: 0x958c72,
    snowColor: 0xd1dad6,
    subtitle: '흑송령 침엽수 고개 · 산짐승 군락 · 흑수부 매복로',
    props: [
      pine(180, 255, 338, 0x9fb7ac, 'coastal-black-pine'),
      pine(1355, 250, 340, 0x9eb5aa, 'dead-pine'),
      pine(285, 505, 320, 0x9aafa5, 'coastal-black-pine'),
      pine(1250, 510, 322, 0x99aea4, 'coastal-black-pine'),
      pine(170, 815, 336, 0x9db2a7, 'dead-pine'),
      pine(1365, 810, 338, 0x9bafa5, 'coastal-black-pine'),
      shrine(365, 825, 0xcbd2cc),
      supplySled(1170, 820, true, 0xb4bfbc),
      watchtower(1275, 605, true, 0xb8c5c5),
    ],
  },
  heuksuvillage: {
    id: 'heuksuvillage',
    category: 'village',
    floorTint: 0x99aaa9,
    washColor: 0x344d53,
    roadColor: 0x998a70,
    snowColor: 0xd3dcda,
    subtitle: '흑수부 대천막 · 세 부족 깃발 · 여진 최종 회맹장',
    props: [
      palisadeGate(1012, false, 0xbac6c9),
      palisadeGate(174, true, 0xb7c3c6),
      greatTent(305, 445, false, 0xcdd8da),
      longhouse(1225, 445, true, 0xbdc9cb),
      hideTent(320, 760, false, 0xc0cbcd),
      watchtower(1320, 755, true, 0xc0cbcd),
      supplySled(1125, 866, true, 0xb7c1c1),
      shrine(405, 870, 0xcfd5d0),
      pine(145, 245, 298, 0xa8bdb4, 'dead-pine'),
      pine(1390, 870, 302, 0xa7bbb2, 'coastal-black-pine'),
    ],
  },
};

export type JurchenExpansionWorldObstacle =
  | { type: 'box'; x: number; y: number; width: number; height: number }
  | { type: 'circle'; x: number; y: number; radius: number };

export const jurchenExpansionWorldObstacles = (): JurchenExpansionWorldObstacle[] => (
  JURCHEN_EXPANSION_REGION_IDS.flatMap((region) => {
    const origin = REGION_ORIGINS[region];
    return JURCHEN_EXPANSION_LAYOUTS[region].props.flatMap(
      (prop): JurchenExpansionWorldObstacle[] => (
        (prop.collisions ?? []).map((collision): JurchenExpansionWorldObstacle => {
          const x = origin.x + prop.x + (collision.offsetX ?? 0);
          const y = origin.y + prop.y + (collision.offsetY ?? 0);
          return collision.type === 'circle'
            ? { type: 'circle', x, y, radius: collision.radius }
            : { type: 'box', x, y, width: collision.width, height: collision.height };
        })
      ),
    );
  })
);
