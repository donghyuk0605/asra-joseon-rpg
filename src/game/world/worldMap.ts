import type { RegionId } from './regions';
import { JURCHEN_REGION_IDS } from './jurchenCampaign';
import {
  FAMOUS_JOSEON_TOWN_REGION_IDS,
  HANSEONG_REGION_IDS,
} from './joseonTowns';
import { EPISODE2_CLUSTERS } from './episode2Regions';

export type WorldMapNodeKind = 'stronghold' | 'settlement' | 'outpost';
export type WorldMapNode = {
  id: string;
  label: string;
  hanja: string;
  subtitle: string;
  kind?: WorldMapNodeKind;
  landmarkFrame?: number;
  routeLabel: string;
  travelDays: number;
  destination: RegionId;
  regions: readonly RegionId[];
  mapX: number;
  mapY: number;
  arrivalY: number;
};

export type WorldMapTravelResult = 'traveled' | 'locked' | 'combat' | 'dungeon' | 'same';

export type WorldMapRouteMode = 'road' | 'mountain' | 'sea' | 'outpost';
export type WorldMapRoute = {
  id: string;
  from: string;
  to: string;
  mode: WorldMapRouteMode;
  label: string;
  travelDays: number;
};

export type WorldMapItinerary = {
  nodes: WorldMapNode[];
  routes: WorldMapRoute[];
  travelDays: number;
};

export type TravelAtlasGroup = {
  id: string;
  label: string;
  hanja: string;
  regions: readonly RegionId[];
};

export const WORLD_MAP_NODES = [
  {
    id: 'jurchen',
    label: '여진 부락',
    hanja: '女眞',
    subtitle: '장백산 남녘',
    kind: 'stronghold',
    landmarkFrame: 0,
    routeLabel: '장백산 북로',
    travelDays: 6,
    destination: 'jurchenvillage',
    regions: JURCHEN_REGION_IDS,
    mapX: 23,
    mapY: 18,
    arrivalY: 760,
  },
  {
    id: 'yalu',
    label: '압록 전선',
    hanja: '鴨綠',
    subtitle: '북방 국경',
    kind: 'stronghold',
    landmarkFrame: 1,
    routeLabel: '압록 북로',
    travelDays: 5,
    destination: 'manchufrontier',
    regions: ['manchufrontier'],
    mapX: 36,
    mapY: 29,
    arrivalY: 790,
  },
  {
    id: 'pyongyang',
    label: '평양성',
    hanja: '平壤',
    subtitle: '대동강 성곽',
    kind: 'stronghold',
    landmarkFrame: 2,
    routeLabel: '서북 대로',
    travelDays: 4,
    destination: 'pyongyangouter',
    regions: ['pyongyangouter', 'pyongyanggate', 'pyongyanginner'],
    mapX: 43,
    mapY: 40,
    arrivalY: 820,
  },
  {
    id: 'hanseong',
    label: '한성',
    hanja: '漢城',
    subtitle: '숭례문·운종가·궁궐',
    kind: 'settlement',
    landmarkFrame: 3,
    routeLabel: '한양 대로',
    travelDays: 2,
    destination: 'hanseongsouth',
    regions: [
      ...HANSEONG_REGION_IDS,
      'gyeongbokgate',
      'gyeongbokcourt',
      'gyeongbokinner',
      'namhansanseong',
      'ganghwado',
    ],
    mapX: 47,
    mapY: 53,
    arrivalY: 820,
  },
  {
    id: 'gaeseong',
    label: '개성',
    hanja: '開城',
    subtitle: '송도 장시',
    kind: 'settlement',
    routeLabel: '송도 역로',
    travelDays: 2,
    destination: 'gaeseong',
    regions: ['gaeseong'],
    mapX: 43,
    mapY: 47,
    arrivalY: 820,
  },
  {
    id: 'yeongwol',
    label: '영월',
    hanja: '寧越',
    subtitle: '강원 산길',
    kind: 'stronghold',
    landmarkFrame: 4,
    routeLabel: '강원 산길',
    travelDays: 2,
    destination: 'yeongwol',
    regions: ['solgogae', 'village', 'mistwood', 'yeongwol', 'yeongwolhq', 'minepass', 'moonfield'],
    mapX: 53,
    mapY: 59,
    arrivalY: 820,
  },
  {
    id: 'jeonju',
    label: '전주성',
    hanja: '全州',
    subtitle: '전라도 감영',
    kind: 'stronghold',
    landmarkFrame: 5,
    routeLabel: '호남 대로',
    travelDays: 3,
    destination: 'jeonju',
    regions: ['jeonjufield', 'jeonjugate', 'jeonju'],
    mapX: 42,
    mapY: 69,
    arrivalY: 820,
  },
  {
    id: 'busan',
    label: '부산포',
    hanja: '釜山',
    subtitle: '남해 출병항',
    kind: 'stronghold',
    landmarkFrame: 6,
    routeLabel: '영남 대로',
    travelDays: 4,
    destination: 'busanjin',
    regions: ['busanjin'],
    mapX: 54,
    mapY: 76,
    arrivalY: 820,
  },
  {
    id: 'ulleung',
    label: '울릉도',
    hanja: '鬱陵',
    subtitle: '동해 외딴섬',
    kind: 'stronghold',
    landmarkFrame: 7,
    routeLabel: '동해 뱃길',
    travelDays: 3,
    destination: 'ulleungcoast',
    regions: ['ulleungdo', 'ulleungcoast', 'ulleungmeadow', 'ulleunghunt', 'ulleungridge', 'ulleungvillage'],
    mapX: 67,
    mapY: 58,
    arrivalY: 690,
  },
  {
    id: 'osaka',
    label: '오사카',
    hanja: '大坂',
    subtitle: '셋쓰에서 대마도까지',
    kind: 'stronghold',
    landmarkFrame: 8,
    routeLabel: '왜국 원정 해로',
    travelDays: 7,
    destination: 'osaka',
    regions: [
      'osaka',
      'settsuvillage',
      'yamazakihunt',
      'osakacastle',
      'shogunkeep',
      'sakaicity',
      'izumihunt',
      'awajicoast',
      'ikiport',
      'tsushimahunt',
      'izuhara',
    ],
    mapX: 82,
    mapY: 76,
    arrivalY: 850,
  },
  {
    id: 'suwon',
    label: '수원',
    hanja: '水原',
    subtitle: '읍치 장터',
    kind: 'settlement',
    routeLabel: '수원 역로',
    travelDays: 1,
    destination: 'suwon',
    regions: ['suwon'],
    mapX: 47,
    mapY: 60,
    arrivalY: 820,
  },
  {
    id: 'chungju',
    label: '충주',
    hanja: '忠州',
    subtitle: '목계나루',
    kind: 'settlement',
    routeLabel: '남한강 뱃길',
    travelDays: 2,
    destination: 'chungju',
    regions: ['chungju', 'tangeumdae'],
    mapX: 53,
    mapY: 65,
    arrivalY: 820,
  },
  {
    id: 'andong',
    label: '안동',
    hanja: '安東',
    subtitle: '서원길',
    kind: 'settlement',
    routeLabel: '영남 내륙로',
    travelDays: 3,
    destination: 'andong',
    regions: ['andong'],
    mapX: 61,
    mapY: 67,
    arrivalY: 820,
  },
  {
    id: 'haeju',
    label: '해주 염전포',
    hanja: '海州',
    subtitle: '황해 서해 나루',
    kind: 'outpost',
    routeLabel: '서해 염전로',
    travelDays: 3,
    destination: 'haeju',
    regions: ['haeju'],
    mapX: 30,
    mapY: 45,
    arrivalY: 820,
  },
  {
    id: 'wonju',
    label: '원주 치악산역',
    hanja: '原州',
    subtitle: '강원 산악 역참',
    kind: 'outpost',
    routeLabel: '치악 산길',
    travelDays: 2,
    destination: 'wonju',
    regions: ['wonju'],
    mapX: 57,
    mapY: 48,
    arrivalY: 820,
  },
  {
    id: 'gangneung',
    label: '강릉 경포',
    hanja: '江陵',
    subtitle: '동해 봉화 해안',
    kind: 'outpost',
    routeLabel: '동해 해안로',
    travelDays: 3,
    destination: 'gangneung',
    regions: ['gangneung'],
    mapX: 66,
    mapY: 43,
    arrivalY: 820,
  },
  {
    id: 'geoje',
    label: '거제 견내량',
    hanja: '巨濟',
    subtitle: '수군진 해협',
    kind: 'outpost',
    routeLabel: '남해 수군로',
    travelDays: 4,
    destination: 'geoje',
    regions: ['geoje'],
    mapX: 66,
    mapY: 86,
    arrivalY: 820,
  },
  ...EPISODE2_CLUSTERS.map((cluster) => ({
    id: `episode2-${cluster.id}`,
    label: cluster.label,
    hanja: cluster.hanja,
    subtitle: cluster.subtitle,
    kind: 'outpost' as const,
    routeLabel: cluster.routeLabel,
    travelDays: cluster.travelDays,
    destination: cluster.regions[0],
    regions: cluster.regions,
    mapX: cluster.mapX,
    mapY: cluster.mapY,
    arrivalY: 820,
  })),
] as const satisfies readonly WorldMapNode[];

/**
 * The macro travel graph is the single source of truth for both the atlas lines
 * and the recommended route shown in the command card.
 */
export const WORLD_MAP_ROUTES = [
  { id: 'jurchen-yalu', from: 'jurchen', to: 'yalu', mode: 'mountain', label: '장백산 남행로', travelDays: 2 },
  { id: 'yalu-northwest', from: 'yalu', to: 'episode2-northwest-road', mode: 'outpost', label: '용만 변경로', travelDays: 1 },
  { id: 'northwest-pyongyang', from: 'episode2-northwest-road', to: 'pyongyang', mode: 'road', label: '서북 대로', travelDays: 1 },
  { id: 'yalu-pyongyang', from: 'yalu', to: 'pyongyang', mode: 'road', label: '압록 역로', travelDays: 2 },
  { id: 'pyongyang-gaeseong', from: 'pyongyang', to: 'gaeseong', mode: 'road', label: '평양·송도 대로', travelDays: 2 },
  { id: 'pyongyang-haeju', from: 'pyongyang', to: 'haeju', mode: 'outpost', label: '황해 염전로', travelDays: 2 },
  { id: 'gaeseong-hanseong', from: 'gaeseong', to: 'hanseong', mode: 'road', label: '송도 역로', travelDays: 1 },
  { id: 'haeju-hanseong', from: 'haeju', to: 'hanseong', mode: 'outpost', label: '서해 봉수로', travelDays: 2 },
  { id: 'haeju-west-coast', from: 'haeju', to: 'episode2-west-coast', mode: 'sea', label: '서해 조운 북로', travelDays: 2 },
  { id: 'hanseong-suwon', from: 'hanseong', to: 'suwon', mode: 'road', label: '수원 역로', travelDays: 1 },
  { id: 'hanseong-wonju', from: 'hanseong', to: 'wonju', mode: 'mountain', label: '치악 산길', travelDays: 2 },
  { id: 'hanseong-yeongwol', from: 'hanseong', to: 'yeongwol', mode: 'mountain', label: '강원 내륙로', travelDays: 2 },
  { id: 'hanseong-mountain', from: 'hanseong', to: 'episode2-mountain-road', mode: 'mountain', label: '관동 고갯길', travelDays: 2 },
  { id: 'suwon-chungju', from: 'suwon', to: 'chungju', mode: 'road', label: '남한강 역로', travelDays: 2 },
  { id: 'suwon-central-river', from: 'suwon', to: 'episode2-central-river', mode: 'outpost', label: '중부 강나루길', travelDays: 2 },
  { id: 'suwon-west-coast', from: 'suwon', to: 'episode2-west-coast', mode: 'outpost', label: '남양 조운로', travelDays: 2 },
  { id: 'wonju-yeongwol', from: 'wonju', to: 'yeongwol', mode: 'mountain', label: '영월 산길', travelDays: 1 },
  { id: 'wonju-gangneung', from: 'wonju', to: 'gangneung', mode: 'mountain', label: '대관령 고갯길', travelDays: 2 },
  { id: 'wonju-mountain', from: 'wonju', to: 'episode2-mountain-road', mode: 'outpost', label: '동부 봉수로', travelDays: 1 },
  { id: 'mountain-gangneung', from: 'episode2-mountain-road', to: 'gangneung', mode: 'mountain', label: '관동 해맞이길', travelDays: 1 },
  { id: 'gangneung-ulleung', from: 'gangneung', to: 'ulleung', mode: 'sea', label: '동해 도해로', travelDays: 2 },
  { id: 'chungju-andong', from: 'chungju', to: 'andong', mode: 'road', label: '영남 내륙로', travelDays: 2 },
  { id: 'chungju-central-river', from: 'chungju', to: 'episode2-central-river', mode: 'outpost', label: '남한강 수로', travelDays: 1 },
  { id: 'central-river-jeonju', from: 'episode2-central-river', to: 'jeonju', mode: 'road', label: '금강 호남로', travelDays: 2 },
  { id: 'central-river-yeongnam', from: 'episode2-central-river', to: 'episode2-yeongnam-road', mode: 'outpost', label: '중부 군영로', travelDays: 2 },
  { id: 'west-coast-jeonju', from: 'episode2-west-coast', to: 'jeonju', mode: 'road', label: '전라 조운로', travelDays: 2 },
  { id: 'west-coast-honam', from: 'episode2-west-coast', to: 'episode2-honam-road', mode: 'sea', label: '서해 조운 남로', travelDays: 2 },
  { id: 'jeonju-honam', from: 'jeonju', to: 'episode2-honam-road', mode: 'outpost', label: '영산강 남행로', travelDays: 1 },
  { id: 'jeonju-busan', from: 'jeonju', to: 'busan', mode: 'road', label: '호남·영남 대로', travelDays: 3 },
  { id: 'andong-yeongnam', from: 'andong', to: 'episode2-yeongnam-road', mode: 'outpost', label: '낙동강 군로', travelDays: 1 },
  { id: 'honam-yeongnam', from: 'episode2-honam-road', to: 'episode2-yeongnam-road', mode: 'road', label: '남부 횡단로', travelDays: 2 },
  { id: 'yeongnam-busan', from: 'episode2-yeongnam-road', to: 'busan', mode: 'road', label: '부산진 군로', travelDays: 1 },
  { id: 'busan-geoje', from: 'busan', to: 'geoje', mode: 'sea', label: '견내량 수군로', travelDays: 1 },
  { id: 'busan-ulleung', from: 'busan', to: 'ulleung', mode: 'sea', label: '동해 뱃길', travelDays: 3 },
  { id: 'busan-osaka', from: 'busan', to: 'osaka', mode: 'sea', label: '왜국 원정 해로', travelDays: 7 },
] as const satisfies readonly WorldMapRoute[];

const worldMapNodeById = new Map<string, WorldMapNode>(
  WORLD_MAP_NODES.map((node) => [node.id, node]),
);

export const worldMapRouteGeometry = (route: WorldMapRoute): {
  x: number;
  y: number;
  length: number;
  angle: number;
} => {
  const from = worldMapNodeById.get(route.from);
  const to = worldMapNodeById.get(route.to);
  if (!from || !to) throw new Error(`Unknown world-map route endpoint: ${route.id}`);
  const dx = to.mapX - from.mapX;
  // The map stage is 3:2; convert vertical percentage to stage-width units.
  const dy = (to.mapY - from.mapY) * (2 / 3);
  return {
    x: from.mapX,
    y: from.mapY,
    length: Math.hypot(dx, dy),
    angle: Math.atan2(dy, dx) * (180 / Math.PI),
  };
};

export const worldMapItinerary = (fromId: string, toId: string): WorldMapItinerary | null => {
  const from = worldMapNodeById.get(fromId);
  const to = worldMapNodeById.get(toId);
  if (!from || !to) return null;
  if (fromId === toId) return { nodes: [from], routes: [], travelDays: 0 };

  const distance = new Map<string, number>([[fromId, 0]]);
  const previous = new Map<string, { nodeId: string; route: WorldMapRoute }>();
  const pending = new Set(WORLD_MAP_NODES.map((node) => node.id));
  while (pending.size) {
    let currentId: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const nodeId of pending) {
      const candidate = distance.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (candidate < currentDistance) {
        currentId = nodeId;
        currentDistance = candidate;
      }
    }
    if (currentId === null || !Number.isFinite(currentDistance)) break;
    pending.delete(currentId);
    if (currentId === toId) break;

    for (const route of WORLD_MAP_ROUTES) {
      const neighborId = route.from === currentId ? route.to : route.to === currentId ? route.from : null;
      if (!neighborId || !pending.has(neighborId)) continue;
      const candidate = currentDistance + route.travelDays;
      if (candidate < (distance.get(neighborId) ?? Number.POSITIVE_INFINITY)) {
        distance.set(neighborId, candidate);
        previous.set(neighborId, { nodeId: currentId, route });
      }
    }
  }

  if (!previous.has(toId)) return null;
  const nodes: WorldMapNode[] = [to];
  const routes: WorldMapRoute[] = [];
  let cursor = toId;
  while (cursor !== fromId) {
    const step = previous.get(cursor);
    if (!step) return null;
    routes.unshift(step.route);
    const node = worldMapNodeById.get(step.nodeId);
    if (!node) return null;
    nodes.unshift(node);
    cursor = step.nodeId;
  }
  return { nodes, routes, travelDays: distance.get(toId) ?? 0 };
};

export const TRAVEL_ATLAS_GROUPS = [
  {
    id: 'japan',
    label: '일본 원정로',
    hanja: '日本',
    regions: [
      'osaka',
      'settsuvillage',
      'yamazakihunt',
      'osakacastle',
      'shogunkeep',
      'sakaicity',
      'izumihunt',
      'awajicoast',
      'ikiport',
      'tsushimahunt',
      'izuhara',
    ],
  },
  {
    id: 'south',
    label: '남부 전선',
    hanja: '南路',
    regions: ['busanjin', 'tangeumdae', 'jeonjufield', 'jeonjugate', 'jeonju'],
  },
  {
    id: 'capital',
    label: '한성과 왕궁',
    hanja: '王都',
    regions: [
      ...HANSEONG_REGION_IDS,
      'gyeongbokgate',
      'gyeongbokcourt',
      'gyeongbokinner',
      'namhansanseong',
      'ganghwado',
    ],
  },
  {
    id: 'joseon-settlements',
    label: '조선 명읍',
    hanja: '名邑',
    regions: FAMOUS_JOSEON_TOWN_REGION_IDS,
  },
  {
    id: 'new-roads',
    label: '연안·산악 신로',
    hanja: '新路',
    regions: ['haeju', 'wonju', 'gangneung', 'geoje'],
  },
  ...EPISODE2_CLUSTERS.map((cluster) => ({
    id: `episode2-${cluster.id}`,
    label: cluster.label,
    hanja: cluster.hanja,
    regions: cluster.regions,
  })),
  {
    id: 'jurchen-unification',
    label: '여진 통합로',
    hanja: '女眞',
    regions: JURCHEN_REGION_IDS,
  },
  {
    id: 'north',
    label: '서북 변경',
    hanja: '西北',
    regions: ['pyongyangouter', 'pyongyanggate', 'pyongyanginner', 'manchufrontier'],
  },
  {
    id: 'central',
    label: '강원 내륙',
    hanja: '江原',
    regions: ['solgogae', 'village', 'mistwood', 'yeongwol', 'yeongwolhq', 'minepass', 'moonfield'],
  },
  {
    id: 'ulleung',
    label: '울릉 전역',
    hanja: '鬱陵',
    regions: ['ulleungcoast', 'ulleungmeadow', 'ulleunghunt', 'ulleungridge', 'ulleungdo', 'ulleungvillage'],
  },
] as const satisfies readonly TravelAtlasGroup[];

export const TRAVEL_ATLAS_REGION_IDS = TRAVEL_ATLAS_GROUPS
  .flatMap((group) => [...group.regions]) as RegionId[];

export const isTravelAtlasRegion = (region: RegionId): boolean =>
  TRAVEL_ATLAS_REGION_IDS.includes(region);

export const travelAtlasArrivalY = (region: RegionId): number => {
  if (region === 'ulleungvillage') return 180;
  if (region === 'ulleunghunt') return 620;
  if (region.startsWith('ulleung')) return 690;
  if (region === 'solgogae' || region === 'village' || region === 'mistwood'
    || region === 'minepass' || region === 'moonfield') return 680;
  return 820;
};

export const worldMapNodeKind = (node: WorldMapNode): WorldMapNodeKind =>
  node.kind ?? 'stronghold';

export const worldMapNodeForRegion = (region: RegionId): WorldMapNode | null =>
  WORLD_MAP_NODES.find((node) => (node.regions as readonly RegionId[]).includes(region)) ?? null;

export const isWorldMapNodeDiscovered = (
  node: WorldMapNode,
  visitedRegions: ReadonlySet<RegionId>,
): boolean => node.regions.some((region) => visitedRegions.has(region));
