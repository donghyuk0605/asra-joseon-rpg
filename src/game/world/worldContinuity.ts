import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import type { RegionId } from './regions';
import { EPISODE2_CLUSTERS, EPISODE2_REGION_LAYOUTS } from './episode2Regions';

export type WorldSeamOrientation = 'vertical' | 'horizontal';
export type WorldSeamKind =
  | 'country-road'
  | 'forest-pass'
  | 'castle-gate'
  | 'snow-road'
  | 'river-ford'
  | 'coast-road'
  | 'market-road';

export type WorldTravelConnection = {
  id: string;
  from: RegionId;
  to: RegionId;
  mode: 'ferry';
  waterColor: number;
  dockColor: number;
};

export type WorldTerrainSeam = {
  id: string;
  from: RegionId;
  to: RegionId;
  orientation: WorldSeamOrientation;
  kind: WorldSeamKind;
  terrainFrom: number;
  terrainTo: number;
  roadColor: number;
  shoulderColor: number;
  roadWidth: number;
  fromLane: number;
  toLane: number;
  bandSize?: number;
};

type SeamOptions = Omit<
  WorldTerrainSeam,
  'id' | 'from' | 'to' | 'orientation' | 'fromLane' | 'toLane'
> & {
  id?: string;
  fromLane?: number;
  toLane?: number;
};

const vertical = (
  from: RegionId,
  to: RegionId,
  options: SeamOptions,
): WorldTerrainSeam => ({
  id: options.id ?? `${from}-${to}`,
  from,
  to,
  orientation: 'vertical',
  fromLane: options.fromLane ?? MAP_WIDTH / 2,
  toLane: options.toLane ?? MAP_WIDTH / 2,
  ...options,
});

const horizontal = (
  from: RegionId,
  to: RegionId,
  options: SeamOptions,
): WorldTerrainSeam => ({
  id: options.id ?? `${from}-${to}`,
  from,
  to,
  orientation: 'horizontal',
  fromLane: options.fromLane ?? MAP_HEIGHT / 2,
  toLane: options.toLane ?? MAP_HEIGHT / 2,
  ...options,
});

const EPISODE2_TERRAIN_SEAMS: readonly WorldTerrainSeam[] = EPISODE2_CLUSTERS.flatMap((cluster) =>
  cluster.regions.slice(0, -1).map((from, index) => {
    const to = cluster.regions[index + 1];
    const fromLayout = EPISODE2_REGION_LAYOUTS[from];
    const toLayout = EPISODE2_REGION_LAYOUTS[to];
    const watery = fromLayout.waterSide !== null || toLayout.waterSide !== null;
    const mountain = fromLayout.biome === 'mountain' || toLayout.biome === 'mountain'
      || fromLayout.biome === 'forest' || toLayout.biome === 'forest';
    const kind: WorldSeamKind = watery ? 'river-ford' : mountain ? 'forest-pass' : 'country-road';
    return vertical(from, to, {
      id: `episode2-${from}-${to}`,
      kind,
      terrainFrom: fromLayout.groundColor,
      terrainTo: toLayout.groundColor,
      roadColor: watery ? 0x9b876b : mountain ? 0x927a59 : 0xa08661,
      shoulderColor: watery ? 0x415851 : mountain ? 0x3e4939 : 0x50483a,
      roadWidth: watery ? 258 : mountain ? 238 : 272,
      bandSize: 430,
    });
  }));

/**
 * Every entry below is a physical, walkable world edge. Story jumps such as
 * Izuhara -> Busanjin, Heuksu -> the home camp and Pyongyang -> Hanseong are
 * intentionally absent: those remain travel transitions instead of pretending
 * that distant locations share one piece of terrain.
 */
export const WORLD_TERRAIN_SEAMS: readonly WorldTerrainSeam[] = [
  // The original hunting field, village and its east/south routes are one
  // walkable landscape. Registering these borders here lets camera continuity,
  // terrain feathering and road placement use the same topology instead of
  // hiding each edge behind an unrelated fog curtain.
  horizontal('mistwood', 'village', {
    kind: 'forest-pass', terrainFrom: 0x35483e, terrainTo: 0x666052,
    roadColor: 0x8f7856, shoulderColor: 0x3f493c, roadWidth: 220,
    fromLane: 480, toLane: 480, bandSize: 390,
  }),
  horizontal('village', 'minepass', {
    kind: 'country-road', terrainFrom: 0x666052, terrainTo: 0x574d42,
    roadColor: 0x987b56, shoulderColor: 0x49483c, roadWidth: 220,
    fromLane: 480, toLane: 480, bandSize: 400,
  }),
  vertical('village', 'moonfield', {
    kind: 'forest-pass', terrainFrom: 0x666052, terrainTo: 0x4d566c,
    roadColor: 0x907b5d, shoulderColor: 0x414a4c, roadWidth: 260,
    fromLane: 770, toLane: 770, bandSize: 420,
  }),

  // Western mainland road.
  horizontal('jeonjufield', 'yeongwol', {
    kind: 'country-road',
    terrainFrom: 0x625d4c,
    terrainTo: 0x5d5c50,
    roadColor: 0x9b8058,
    shoulderColor: 0x4f533f,
    roadWidth: 250,
    fromLane: 500,
    toLane: 500,
    bandSize: 420,
  }),
  horizontal('yeongwol', 'mistwood', {
    kind: 'forest-pass',
    terrainFrom: 0x56584d,
    terrainTo: 0x35483e,
    roadColor: 0x8b7858,
    shoulderColor: 0x354237,
    roadWidth: 228,
    fromLane: 500,
    toLane: 520,
    bandSize: 430,
  }),
  vertical('yeongwolhq', 'yeongwol', {
    kind: 'castle-gate',
    terrainFrom: 0x5c5650,
    terrainTo: 0x686052,
    roadColor: 0xa28a67,
    shoulderColor: 0x49463f,
    roadWidth: 260,
    bandSize: 390,
  }),

  // Jeonju and the southern invasion road.
  vertical('jeonju', 'jeonjugate', {
    kind: 'castle-gate',
    terrainFrom: 0x65584c,
    terrainTo: 0x615348,
    roadColor: 0xa58861,
    shoulderColor: 0x51483d,
    roadWidth: 286,
    bandSize: 410,
  }),
  vertical('jeonjugate', 'jeonjufield', {
    kind: 'country-road',
    terrainFrom: 0x62554b,
    terrainTo: 0x66604f,
    roadColor: 0x9d8159,
    shoulderColor: 0x4f503f,
    roadWidth: 270,
    bandSize: 430,
  }),
  vertical('tangeumdae', 'busanjin', {
    kind: 'coast-road',
    terrainFrom: 0x5c584c,
    terrainTo: 0x5e5148,
    roadColor: 0x99805e,
    shoulderColor: 0x3f4c47,
    roadWidth: 344,
    bandSize: 440,
  }),

  // Gyeongbokgung's three connected courtyards.
  vertical('gyeongbokinner', 'gyeongbokcourt', {
    kind: 'castle-gate',
    terrainFrom: 0x55514d,
    terrainTo: 0x5e5750,
    roadColor: 0xa18d73,
    shoulderColor: 0x3f403c,
    roadWidth: 296,
    bandSize: 380,
  }),
  vertical('gyeongbokcourt', 'gyeongbokgate', {
    kind: 'castle-gate',
    terrainFrom: 0x5e5750,
    terrainTo: 0x66605a,
    roadColor: 0xa89273,
    shoulderColor: 0x444641,
    roadWidth: 304,
    bandSize: 390,
  }),

  // Northbound Jurchen road, Yalu front and Pyongyang siege line.
  vertical('heuksuvillage', 'blackpinehunt', {
    kind: 'snow-road', terrainFrom: 0x526264, terrainTo: 0x50605b,
    roadColor: 0x969384, shoulderColor: 0x394a47, roadWidth: 260,
  }),
  vertical('blackpinehunt', 'songhuavillage', {
    kind: 'forest-pass', terrainFrom: 0x50605b, terrainTo: 0x59696a,
    roadColor: 0x958b70, shoulderColor: 0x344841, roadWidth: 244,
  }),
  vertical('songhuavillage', 'songhuahunt', {
    kind: 'snow-road', terrainFrom: 0x59696a, terrainTo: 0x65736d,
    roadColor: 0x9d9681, shoulderColor: 0x43544f, roadWidth: 258,
  }),
  vertical('songhuahunt', 'baeksanvillage', {
    kind: 'river-ford', terrainFrom: 0x65736d, terrainTo: 0x647071,
    roadColor: 0x9e9782, shoulderColor: 0x3f5657, roadWidth: 250,
  }),
  vertical('baeksanvillage', 'changbaihunt', {
    kind: 'snow-road', terrainFrom: 0x647071, terrainTo: 0x6e7b76,
    roadColor: 0xa29b87, shoulderColor: 0x4a5b57, roadWidth: 258,
  }),
  vertical('changbaihunt', 'jurchenvillage', {
    kind: 'snow-road', terrainFrom: 0x6e7b76, terrainTo: 0x657181,
    roadColor: 0xa29a84, shoulderColor: 0x47565c, roadWidth: 268,
  }),
  vertical('jurchenvillage', 'manchufrontier', {
    kind: 'river-ford', terrainFrom: 0x657181, terrainTo: 0x667680,
    roadColor: 0xa59b83, shoulderColor: 0x465b63, roadWidth: 272, bandSize: 470,
  }),
  vertical('manchufrontier', 'pyongyangouter', {
    kind: 'river-ford', terrainFrom: 0x667680, terrainTo: 0x687178,
    roadColor: 0xa28f72, shoulderColor: 0x4e5558, roadWidth: 278, bandSize: 460,
  }),
  vertical('pyongyangouter', 'pyongyanggate', {
    kind: 'castle-gate', terrainFrom: 0x687178, terrainTo: 0x5e6265,
    roadColor: 0xa38a6c, shoulderColor: 0x45494b, roadWidth: 292, bandSize: 410,
  }),
  vertical('pyongyanggate', 'pyongyanginner', {
    kind: 'castle-gate', terrainFrom: 0x5e6265, terrainTo: 0x585553,
    roadColor: 0xa18a70, shoulderColor: 0x41403f, roadWidth: 296, bandSize: 400,
  }),

  // Joseon post road. Pair palettes stop one generic seam from making a
  // palace, market, ferry town and mountain settlement look identical.
  vertical('gaeseong', 'changdeokgung', {
    kind: 'country-road', terrainFrom: 0x746856, terrainTo: 0x5e5a55,
    roadColor: 0xa28a68, shoulderColor: 0x4f5146, roadWidth: 258,
  }),
  vertical('changdeokgung', 'hanseongmarket', {
    kind: 'castle-gate', terrainFrom: 0x5e5a55, terrainTo: 0x746557,
    roadColor: 0xa68c6c, shoulderColor: 0x4d4b45, roadWidth: 278,
  }),
  vertical('hanseongmarket', 'hanseongsouth', {
    kind: 'market-road', terrainFrom: 0x746557, terrainTo: 0x776957,
    roadColor: 0xaa8f69, shoulderColor: 0x554d41, roadWidth: 292,
  }),
  vertical('hanseongsouth', 'suwon', {
    kind: 'country-road', terrainFrom: 0x776957, terrainTo: 0x7a6c55,
    roadColor: 0xa88b62, shoulderColor: 0x56503e, roadWidth: 268,
  }),
  vertical('suwon', 'chungju', {
    kind: 'river-ford', terrainFrom: 0x7a6c55, terrainTo: 0x687067,
    roadColor: 0xa28b69, shoulderColor: 0x4b5953, roadWidth: 258,
  }),
  vertical('chungju', 'andong', {
    kind: 'forest-pass', terrainFrom: 0x687067, terrainTo: 0x6d6858,
    roadColor: 0x9b835f, shoulderColor: 0x485043, roadWidth: 246,
  }),

  // Japan: inland roads, castle approaches and visibly different sea links.
  vertical('izuhara', 'tsushimahunt', {
    kind: 'forest-pass', terrainFrom: 0x565950, terrainTo: 0x4f6254,
    roadColor: 0x9b825d, shoulderColor: 0x34463a, roadWidth: 246,
  }),
  vertical('izumihunt', 'sakaicity', {
    kind: 'country-road', terrainFrom: 0x526653, terrainTo: 0x626b62,
    roadColor: 0xa08761, shoulderColor: 0x3f5244, roadWidth: 250,
  }),
  vertical('sakaicity', 'shogunkeep', {
    kind: 'castle-gate', terrainFrom: 0x626b62, terrainTo: 0x474445,
    roadColor: 0xa18765, shoulderColor: 0x393d3c, roadWidth: 278, bandSize: 440,
  }),
  vertical('shogunkeep', 'osakacastle', {
    kind: 'castle-gate', terrainFrom: 0x474445, terrainTo: 0x514b47,
    roadColor: 0xa58b69, shoulderColor: 0x343638, roadWidth: 286,
  }),
  vertical('osakacastle', 'yamazakihunt', {
    kind: 'forest-pass', terrainFrom: 0x514b47, terrainTo: 0x405346,
    roadColor: 0x9e8562, shoulderColor: 0x2f3e35, roadWidth: 254,
  }),
  vertical('yamazakihunt', 'settsuvillage', {
    kind: 'forest-pass', terrainFrom: 0x405346, terrainTo: 0x4b594e,
    roadColor: 0x9d8663, shoulderColor: 0x304238, roadWidth: 246,
  }),
  vertical('settsuvillage', 'osaka', {
    kind: 'coast-road', terrainFrom: 0x4b594e, terrainTo: 0x4a5964,
    roadColor: 0xa18a69, shoulderColor: 0x344951, roadWidth: 258, bandSize: 540,
  }),
  ...EPISODE2_TERRAIN_SEAMS,
] as const;

/**
 * Sea passages remain explicit travel links. They have a dock at both ends,
 * close the world boundary against walking and use the campaign plaque to
 * board a boat with a camera fade.
 */
export const WORLD_TRAVEL_CONNECTIONS: readonly WorldTravelConnection[] = [
  {
    id: 'tsushima-iki-ferry',
    from: 'tsushimahunt',
    to: 'ikiport',
    mode: 'ferry',
    waterColor: 0x244f5e,
    dockColor: 0x6f4d31,
  },
  {
    id: 'iki-awaji-ferry',
    from: 'ikiport',
    to: 'awajicoast',
    mode: 'ferry',
    waterColor: 0x285463,
    dockColor: 0x765235,
  },
  {
    id: 'awaji-izumi-ferry',
    from: 'awajicoast',
    to: 'izumihunt',
    mode: 'ferry',
    waterColor: 0x2c5864,
    dockColor: 0x735036,
  },
] as const;

export const worldTravelConnectionAtEdge = (
  region: RegionId,
  edge: 'north' | 'south',
): WorldTravelConnection | null => WORLD_TRAVEL_CONNECTIONS.find((connection) => {
  if (connection.from !== region && connection.to !== region) return false;
  const other = connection.from === region ? connection.to : connection.from;
  const originY = REGION_ORIGINS[region].y;
  const otherY = REGION_ORIGINS[other].y;
  return edge === 'north' ? otherY < originY : otherY > originY;
}) ?? null;

export const worldTravelDockObstacles = (): Array<{
  type: 'box';
  x: number;
  y: number;
  width: number;
  height: number;
}> => (
  WORLD_TRAVEL_CONNECTIONS.flatMap((connection) => (
    [connection.from, connection.to].flatMap((region) => {
      const origin = REGION_ORIGINS[region];
      const otherRegion = region === connection.from ? connection.to : connection.from;
      const otherOrigin = REGION_ORIGINS[otherRegion];
      const north = otherOrigin.y < origin.y;
      const y = origin.y + (north ? 85 : MAP_HEIGHT - 85);
      return [
        { type: 'box' as const, x: origin.x + 520, y, width: 280, height: 170 },
        { type: 'box' as const, x: origin.x + 1016, y, width: 280, height: 170 },
      ];
    })
  ))
);

export const worldTerrainSeamBetween = (
  first: RegionId,
  second: RegionId,
): WorldTerrainSeam | null => (
  WORLD_TERRAIN_SEAMS.find((seam) => (
    (seam.from === first && seam.to === second)
    || (seam.from === second && seam.to === first)
  )) ?? null
);

export const isContinuousWorldNeighbor = (
  first: RegionId,
  second: RegionId,
): boolean => worldTerrainSeamBetween(first, second) !== null;

export const worldTravelConnectionBetween = (
  first: RegionId,
  second: RegionId,
): WorldTravelConnection | null => (
  WORLD_TRAVEL_CONNECTIONS.find((connection) => (
    (connection.from === first && connection.to === second)
    || (connection.from === second && connection.to === first)
  )) ?? null
);

export const travelConnectionsForRegion = (
  region: RegionId,
): WorldTravelConnection[] => (
  WORLD_TRAVEL_CONNECTIONS.filter((connection) => (
    connection.from === region || connection.to === region
  ))
);

export const continuityNeighborsForRegion = (region: RegionId): RegionId[] => (
  WORLD_TERRAIN_SEAMS.flatMap((seam) => {
    if (seam.from === region) return [seam.to];
    if (seam.to === region) return [seam.from];
    return [];
  })
);

export const continuousWorldEdge = (
  region: RegionId,
  edge: 'north' | 'south' | 'west' | 'east',
): WorldTerrainSeam | null => (
  WORLD_TERRAIN_SEAMS.find((seam) => {
    const origin = REGION_ORIGINS[region];
    const otherRegion = seam.from === region ? seam.to : seam.to === region ? seam.from : null;
    if (!otherRegion) return false;
    const other = REGION_ORIGINS[otherRegion];
    if (edge === 'north') return seam.orientation === 'vertical' && other.y < origin.y;
    if (edge === 'south') return seam.orientation === 'vertical' && other.y > origin.y;
    if (edge === 'west') return seam.orientation === 'horizontal' && other.x < origin.x;
    return seam.orientation === 'horizontal' && other.x > origin.x;
  }) ?? null
);

export type ContinuityCameraBounds = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const cameraGroup = (
  id: string,
  regions: readonly RegionId[],
): { id: string; regions: readonly RegionId[]; bounds: ContinuityCameraBounds } => {
  const origins = regions.map((region) => REGION_ORIGINS[region]);
  const x = Math.min(...origins.map((origin) => origin.x));
  const y = Math.min(...origins.map((origin) => origin.y));
  const right = Math.max(...origins.map((origin) => origin.x + MAP_WIDTH));
  const bottom = Math.max(...origins.map((origin) => origin.y + MAP_HEIGHT));
  return { id, regions, bounds: { id, x, y, width: right - x, height: bottom - y } };
};

const CONTINUITY_CAMERA_GROUPS = [
  cameraGroup('western-mainland', [
    'jeonjufield', 'yeongwol', 'mistwood', 'village', 'minepass', 'moonfield',
    'yeongwolhq', 'jeonjugate', 'jeonju',
  ]),
  cameraGroup('southern-front', ['tangeumdae', 'busanjin']),
  cameraGroup('gyeongbok-palace', ['gyeongbokinner', 'gyeongbokcourt', 'gyeongbokgate']),
  cameraGroup('northern-campaign', [
    'heuksuvillage', 'blackpinehunt', 'songhuavillage', 'songhuahunt',
    'baeksanvillage', 'changbaihunt', 'jurchenvillage', 'manchufrontier',
    'pyongyangouter', 'pyongyanggate', 'pyongyanginner',
  ]),
  cameraGroup('joseon-post-road', [
    'gaeseong', 'changdeokgung', 'hanseongmarket', 'hanseongsouth',
    'suwon', 'chungju', 'andong',
  ]),
  cameraGroup('japan-tsushima', ['izuhara', 'tsushimahunt']),
  cameraGroup('japan-iki', ['ikiport']),
  cameraGroup('japan-awaji', ['awajicoast']),
  cameraGroup('japan-kansai', [
    'izumihunt', 'sakaicity', 'shogunkeep', 'osakacastle',
    'yamazakihunt', 'settsuvillage', 'osaka',
  ]),
  ...EPISODE2_CLUSTERS.map((cluster) => cameraGroup(`episode2-${cluster.id}`, cluster.regions)),
] as const;

export const continuityCameraBoundsForRegion = (
  region: RegionId,
): ContinuityCameraBounds | null => (
  CONTINUITY_CAMERA_GROUPS.find((group) => group.regions.includes(region))?.bounds ?? null
);

export const sameContinuityCameraGroup = (
  first: RegionId,
  second: RegionId,
): boolean => {
  const firstBounds = continuityCameraBoundsForRegion(first);
  const secondBounds = continuityCameraBoundsForRegion(second);
  return Boolean(firstBounds && secondBounds && firstBounds.id === secondBounds.id);
};
