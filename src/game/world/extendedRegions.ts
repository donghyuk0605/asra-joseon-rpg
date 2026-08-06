import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import type { ExtendedRegionId } from './regions';
import type { TreeSpecies } from './treeSpecies';

export const EXTENDED_REGION_IDS = [
  'wonju',
  'gangneung',
  'haeju',
  'geoje',
] as const satisfies readonly ExtendedRegionId[];

export const isExtendedRegion = (region: string): region is ExtendedRegionId =>
  (EXTENDED_REGION_IDS as readonly string[]).includes(region);

export type ExtendedRegionPropKind =
  | 'pine'
  | 'shrine'
  | 'cart'
  | 'watchtower'
  | 'palisade'
  | 'dock';

export type ExtendedRegionProp = {
  kind: ExtendedRegionPropKind;
  x: number;
  y: number;
  width: number;
  height: number;
  flipX?: boolean;
  tint?: number;
  treeSpecies?: TreeSpecies;
};

export type ExtendedRegionLayout = {
  id: ExtendedRegionId;
  terrain: 'joseon' | 'north';
  floorTint: number;
  groundFrames: readonly number[];
  roadFrame: number;
  roadWidth: number;
  waterSide?: 'left' | 'right' | 'both';
  useDynamicAmbientProps: boolean;
  subtitle: string;
  props: readonly ExtendedRegionProp[];
};

const pine = (
  x: number,
  y: number,
  width = 286,
  tint = 0xa9b99b,
  treeSpecies: TreeSpecies = 'coastal-black-pine',
): ExtendedRegionProp => ({
  kind: 'pine', x, y, width, height: Math.round(width * 4 / 3), tint, treeSpecies,
});

const watchtower = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xb8a88b,
): ExtendedRegionProp => ({
  kind: 'watchtower', x, y, width: 294, height: 338, flipX, tint,
});

const palisade = (
  x: number,
  y: number,
  flipX = false,
  tint = 0xb69d78,
): ExtendedRegionProp => ({
  kind: 'palisade', x, y, width: 390, height: 154, flipX, tint,
});

const dock = (x: number, y: number, flipX = false): ExtendedRegionProp => ({
  kind: 'dock', x, y, width: 280, height: 190, flipX, tint: 0xb99e71,
});

/**
 * The v3 maps use clean natural raster fields. The old prop coordinates remain
 * as authored gameplay metadata, while the renderer replaces their static
 * foregrounds with the image-set ambient layer. Water boundaries and routes
 * still stay aligned with the simulation plane.
 */
export const EXTENDED_REGION_LAYOUTS: Record<ExtendedRegionId, ExtendedRegionLayout> = {
  wonju: {
    id: 'wonju',
    terrain: 'north',
    floorTint: 0xa3aa91,
    groundFrames: [1, 4, 7, 2],
    roadFrame: 2,
    roadWidth: 430,
    useDynamicAmbientProps: true,
    subtitle: '치악산 산길 · 원주목 역참 · 산령의 굴',
    props: [
      pine(190, 276, 318, 0xaebda0, 'birch'),
      pine(1330, 292, 334, 0xa6b79a, 'birch'),
      pine(245, 835, 302, 0x9dac8e, 'birch'),
      pine(1302, 836, 320, 0xa3b293, 'birch'),
      { kind: 'shrine', x: 370, y: 664, width: 220, height: 220, tint: 0xd0c5a5 },
      { kind: 'cart', x: 1178, y: 774, width: 224, height: 224, flipX: true, tint: 0xc2b093 },
      watchtower(1324, 478, true, 0xb4a382),
    ],
  },
  gangneung: {
    id: 'gangneung',
    terrain: 'joseon',
    floorTint: 0x8da7a0,
    groundFrames: [2, 5, 8, 1],
    roadFrame: 4,
    roadWidth: 420,
    waterSide: 'right',
    useDynamicAmbientProps: true,
    subtitle: '경포 바닷길 · 강릉 관아 외곽 · 해풍 봉화',
    props: [
      pine(190, 294, 318, 0x9ebaa4, 'coastal-black-pine'),
      pine(278, 828, 304, 0x91aa98, 'coastal-black-pine'),
      pine(1110, 836, 262, 0x91a89b, 'coastal-black-pine'),
      { kind: 'shrine', x: 390, y: 645, width: 224, height: 224, tint: 0xd3c7a6 },
      watchtower(355, 405, false, 0xb6aa8f),
      palisade(360, 236, false, 0xbca57c),
      dock(1372, 630, true),
    ],
  },
  haeju: {
    id: 'haeju',
    terrain: 'joseon',
    floorTint: 0x9faa94,
    groundFrames: [0, 3, 6, 8],
    roadFrame: 5,
    roadWidth: 410,
    waterSide: 'left',
    useDynamicAmbientProps: true,
    subtitle: '해주 염전포 · 황해도 서해 나루 · 검은 돛 감시',
    props: [
      pine(1310, 288, 312, 0xa9b69a, 'coastal-black-pine'),
      pine(1194, 832, 286, 0x9aab8d, 'coastal-black-pine'),
      { kind: 'cart', x: 1082, y: 734, width: 224, height: 224, tint: 0xc5b28e },
      watchtower(1320, 390, true, 0xb3a080),
      palisade(1160, 242, true, 0xb7a27c),
      palisade(1160, 780, true, 0xb09a75),
      dock(168, 600, false),
    ],
  },
  geoje: {
    id: 'geoje',
    terrain: 'joseon',
    floorTint: 0x849f9f,
    groundFrames: [3, 6, 1, 7],
    roadFrame: 0,
    roadWidth: 430,
    waterSide: 'both',
    useDynamicAmbientProps: true,
    subtitle: '거제 견내량 · 수군진 해협 · 해무원귀 출몰',
    props: [
      watchtower(236, 392, false, 0xa89c7c),
      watchtower(1322, 392, true, 0xa89c7c),
      palisade(350, 780, false, 0xa7926f),
      palisade(1188, 780, true, 0xa7926f),
      pine(410, 280, 270, 0x95b0a4, 'coastal-black-pine'),
      pine(1150, 280, 270, 0x95b0a4, 'coastal-black-pine'),
      dock(156, 700, false),
      dock(1388, 700, true),
    ],
  },
};

export type ExtendedWorldObstacle =
  | { type: 'circle'; x: number; y: number; radius: number }
  | { type: 'box'; x: number; y: number; width: number; height: number };

const propObstacle = (
  region: ExtendedRegionId,
  prop: ExtendedRegionProp,
): ExtendedWorldObstacle | null => {
  const origin = REGION_ORIGINS[region];
  const x = origin.x + prop.x;
  const y = origin.y + prop.y;
  if (prop.kind === 'pine') return { type: 'circle', x, y: y - 22, radius: Math.round(prop.width * 0.22) };
  if (prop.kind === 'shrine') return { type: 'circle', x, y: y - 18, radius: 62 };
  if (prop.kind === 'cart') return { type: 'circle', x, y: y - 8, radius: 66 };
  if (prop.kind === 'watchtower') return { type: 'box', x, y: y - 40, width: 164, height: 128 };
  if (prop.kind === 'palisade') return { type: 'box', x, y: y - 22, width: prop.width * 0.88, height: 68 };
  return null;
};

export const extendedWorldObstacles = (): readonly ExtendedWorldObstacle[] => {
  return EXTENDED_REGION_IDS.flatMap((region) => {
    const origin = REGION_ORIGINS[region];
    const layout = EXTENDED_REGION_LAYOUTS[region];
    const waterSides = layout.waterSide === 'both'
      ? ['left', 'right'] as const
      : layout.waterSide ? [layout.waterSide] as const : [];
    const water = waterSides.map((side): ExtendedWorldObstacle => ({
      type: 'box',
      x: origin.x + (side === 'left' ? 82 : MAP_WIDTH - 82),
      y: origin.y + MAP_HEIGHT / 2,
      width: 164,
      height: MAP_HEIGHT,
    }));
    const props = layout.useDynamicAmbientProps
      ? []
      : layout.props
        .map((prop) => propObstacle(region, prop))
        .filter((obstacle): obstacle is ExtendedWorldObstacle => obstacle !== null);
    return [...water, ...props];
  });
};
