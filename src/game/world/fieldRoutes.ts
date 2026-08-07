import { JURCHEN_EXPANSION_REGION_IDS } from './jurchenExpansion';
import {
  jurchenBackwardDestination,
  jurchenForwardDestination,
} from './jurchenCampaign';
import { isJoseonTownRegion, JOSEON_TOWN_LAYOUTS } from './joseonTowns';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import { REGIONS, type RegionId } from './regions';
import {
  isUlleungRegion,
  ULLEUNG_REGION_IDS,
  ULLEUNG_ROAD_ANCHORS,
} from './ulleungContinuity';
import {
  WORLD_TERRAIN_SEAMS,
  WORLD_TRAVEL_CONNECTIONS,
  isContinuousWorldNeighbor,
  worldTravelConnectionBetween,
} from './worldContinuity';

export type FieldRouteEdge = 'north' | 'south' | 'west' | 'east';
export type FieldRouteMode = 'road' | 'ferry' | 'portal';

export type CampaignFieldRoute = Readonly<{
  id: string;
  region: RegionId;
  localX: number;
  localY: number;
  label: string;
  destination: RegionId;
  entrance: 'north' | 'south';
  requiresClear: boolean;
}>;

export type FieldExitGuide = Readonly<{
  id: string;
  region: RegionId;
  destination: RegionId;
  x: number;
  y: number;
  edge: FieldRouteEdge;
  mode: FieldRouteMode;
  label: string;
  requiresClear: boolean;
}>;

const route = (
  region: RegionId,
  localX: number,
  localY: number,
  label: string,
  destination: RegionId,
  entrance: 'north' | 'south',
  requiresClear = false,
): CampaignFieldRoute => Object.freeze({
  id: `${region}-${destination}-${localX}-${localY}`,
  region,
  localX,
  localY,
  label,
  destination,
  entrance,
  requiresClear,
});

const STATIC_CAMPAIGN_FIELD_ROUTES: readonly CampaignFieldRoute[] = [
  route('osaka', 768, 145, '셋쓰 내륙문 · 감시대 격파 후 개방', 'settsuvillage', 'south', true),
  route('settsuvillage', 768, 890, '남쪽 포로길 · 오사카 외항', 'osaka', 'north'),
  route('settsuvillage', 768, 145, '야마자키 산길 · 징발대 격파 후 개방', 'yamazakihunt', 'south', true),
  route('yamazakihunt', 768, 890, '남쪽 산촌길 · 셋쓰 산촌', 'settsuvillage', 'north'),
  route('yamazakihunt', 768, 145, '오사카 성로 · 사냥숲 돌파 후 개방', 'osakacastle', 'south', true),
  route('osakacastle', 768, 890, '남쪽 삼나무길 · 야마자키', 'yamazakihunt', 'north'),
  route('osakacastle', 768, 145, '천수각 외문 · 성하 수비대 격파 후 개방', 'shogunkeep', 'south', true),
  route('shogunkeep', 768, 890, '남쪽 성하길 · 오사카 성하', 'osakacastle', 'north'),
  route('shogunkeep', 768, 145, '서남 해로 · 군선봉행 격파 후 사카이', 'sakaicity', 'south', true),
  route('sakaicity', 768, 890, '북쪽 성채길 · 오사카 군선봉행 성채', 'shogunkeep', 'north'),
  route('sakaicity', 768, 145, '이즈미 고개 · 용병대 격파 후 개방', 'izumihunt', 'south', true),
  route('izumihunt', 768, 890, '북쪽 상인길 · 사카이 자유항', 'sakaicity', 'north'),
  route('izumihunt', 768, 145, '아와지행 나루 · 매복대 격파 후 승선', 'awajicoast', 'south', true),
  route('awajicoast', 768, 890, '혼슈행 선착장 · 이즈미 귀환선', 'izumihunt', 'north'),
  route('awajicoast', 768, 145, '이키행 선착장 · 왜구 초소 격파 후 승선', 'ikiport', 'south', true),
  route('ikiport', 768, 890, '아와지행 나루 · 세토 내해 귀환선', 'awajicoast', 'north'),
  route('ikiport', 768, 145, '대마도행 선착장 · 보급대 격파 후 승선', 'tsushimahunt', 'south', true),
  route('tsushimahunt', 768, 890, '이키행 나루 · 고노우라 귀환선', 'ikiport', 'north'),
  route('tsushimahunt', 768, 145, '이즈하라 산길 · 산림대 격파 후 개방', 'izuhara', 'south', true),
  route('izuhara', 768, 890, '북쪽 산길 · 아리아케 산림', 'tsushimahunt', 'north'),
  route('izuhara', 768, 145, '조선 해협 · 도주군 격파 후 부산진', 'busanjin', 'south', true),
  route('jeonju', 112, 510, '서문 역참 · 부산진성 출정', 'busanjin', 'south'),
  route('busanjin', 768, 145, '북문 군로 · 탄금대', 'tangeumdae', 'south'),
  route('tangeumdae', 768, 890, '남행 군로 · 부산진성', 'busanjin', 'north'),
  route('tangeumdae', 768, 150, '한성 파발로 · 왜군 전멸 후 개방', 'gyeongbokgate', 'south'),
  route('gyeongbokgate', 768, 880, '남쪽 군로 · 탄금대', 'tangeumdae', 'north'),
  route('gyeongbokgate', 768, 145, '흥례문 · 근정전', 'gyeongbokcourt', 'south'),
  route('gyeongbokcourt', 768, 890, '금천교 · 광화문', 'gyeongbokgate', 'north'),
  route('gyeongbokcourt', 768, 140, '사정문 · 왕의 내전', 'gyeongbokinner', 'south'),
  route('gyeongbokinner', 768, 890, '근정전 회랑', 'gyeongbokcourt', 'north'),
  route('gyeongbokinner', 1260, 520, '북방 군보 · 평양 내성', 'pyongyanginner', 'south'),
  route('jurchenvillage', 768, 145, '북행 자작나무길 · 여진 통합 시작', 'changbaihunt', 'south'),
  route('jurchenvillage', 768, 890, '남쪽 목책문 · 세 부족 통합 후 압록 설욕전', 'manchufrontier', 'north'),
  route('manchufrontier', 768, 145, '북행 설원길 · 여진 부락', 'jurchenvillage', 'south'),
  route('manchufrontier', 768, 890, '남진 성문 · 평양 외성', 'pyongyangouter', 'north'),
  route('pyongyangouter', 768, 145, '북행 설원길 · 압록 국경', 'manchufrontier', 'south'),
  route('pyongyangouter', 768, 890, '외성 남문 · 대동문', 'pyongyanggate', 'north', true),
  route('pyongyanggate', 768, 145, '북곽 군로 · 평양 외성', 'pyongyangouter', 'south'),
  route('pyongyanggate', 768, 890, '대동문 안길 · 평양 내성', 'pyongyanginner', 'north', true),
  route('pyongyanginner', 768, 145, '대동문 회랑', 'pyongyanggate', 'south'),
  route('pyongyanginner', 768, 890, '한성 북로 · 경복궁 광화문', 'gyeongbokgate', 'north', true),
];

const JURCHEN_CAMPAIGN_FIELD_ROUTES: readonly CampaignFieldRoute[] =
  JURCHEN_EXPANSION_REGION_IDS.flatMap((region) => {
    const previous = jurchenBackwardDestination(region);
    const next = jurchenForwardDestination(region);
    return [
      ...(previous ? [route(
        region,
        768,
        890,
        `남쪽 설원길 · ${REGIONS[previous].name}`,
        previous,
        'north',
      )] : []),
      route(
        region,
        768,
        145,
        region === 'heuksuvillage'
          ? '대회맹 완성 후 본영 회군'
          : `북쪽 통합로 · ${REGIONS[next].name}`,
        next,
        'south',
        true,
      ),
    ];
  });

/**
 * The visible field plaques and HUD route guidance deliberately share this
 * table. A route can no longer be clickable in the world while silently
 * missing from the minimap (or point at a different destination there).
 */
export const CAMPAIGN_FIELD_ROUTES: readonly CampaignFieldRoute[] = Object.freeze([
  ...STATIC_CAMPAIGN_FIELD_ROUTES,
  ...JURCHEN_CAMPAIGN_FIELD_ROUTES,
]);

const edgeAt = (x: number, y: number): FieldRouteEdge => {
  const distances: ReadonlyArray<readonly [FieldRouteEdge, number]> = [
    ['north', y],
    ['south', MAP_HEIGHT - y],
    ['west', x],
    ['east', MAP_WIDTH - x],
  ];
  return distances.reduce((nearest, candidate) => (
    candidate[1] < nearest[1] ? candidate : nearest
  ))[0];
};

const modeBetween = (region: RegionId, destination: RegionId): FieldRouteMode => {
  if (worldTravelConnectionBetween(region, destination)) return 'ferry';
  if (isContinuousWorldNeighbor(region, destination)) return 'road';
  return 'portal';
};

const guide = (
  id: string,
  region: RegionId,
  destination: RegionId,
  x: number,
  y: number,
  label = REGIONS[destination].name,
  requiresClear = false,
  forcedMode?: FieldRouteMode,
): FieldExitGuide => Object.freeze({
  id,
  region,
  destination,
  x,
  y,
  edge: edgeAt(x, y),
  mode: forcedMode ?? modeBetween(region, destination),
  label,
  requiresClear,
});

const seamGuideFor = (region: RegionId): FieldExitGuide[] => {
  const origin = REGION_ORIGINS[region];
  return WORLD_TERRAIN_SEAMS.flatMap((seam) => {
    const destination = seam.from === region ? seam.to : seam.to === region ? seam.from : null;
    if (!destination) return [];
    const other = REGION_ORIGINS[destination];
    if (seam.orientation === 'vertical') {
      const x = seam.from === region ? seam.fromLane : seam.toLane;
      const y = other.y < origin.y ? 24 : MAP_HEIGHT - 24;
      return [guide(`seam-${seam.id}-${region}`, region, destination, x, y)];
    }
    const y = seam.from === region ? seam.fromLane : seam.toLane;
    const x = other.x < origin.x ? 24 : MAP_WIDTH - 24;
    return [guide(`seam-${seam.id}-${region}`, region, destination, x, y)];
  });
};

const ferryGuidesFor = (region: RegionId): FieldExitGuide[] => {
  const origin = REGION_ORIGINS[region];
  return WORLD_TRAVEL_CONNECTIONS.flatMap((connection) => {
    const destination = connection.from === region
      ? connection.to
      : connection.to === region ? connection.from : null;
    if (!destination) return [];
    const other = REGION_ORIGINS[destination];
    return [guide(
      `ferry-${connection.id}-${region}`,
      region,
      destination,
      MAP_WIDTH / 2,
      other.y < origin.y ? 85 : MAP_HEIGHT - 85,
      `${REGIONS[destination].name} 선착장`,
      false,
      'ferry',
    )];
  });
};

const ulleungGuidesFor = (region: RegionId): FieldExitGuide[] => {
  if (!isUlleungRegion(region)) return [];
  const index = ULLEUNG_REGION_IDS.indexOf(region);
  return [
    ...(index > 0 ? [guide(
      `ulleung-${region}-north`,
      region,
      ULLEUNG_REGION_IDS[index - 1],
      ULLEUNG_ROAD_ANCHORS[region].northX,
      24,
      REGIONS[ULLEUNG_REGION_IDS[index - 1]].name,
      false,
      'road',
    )] : []),
    ...(index < ULLEUNG_REGION_IDS.length - 1 ? [guide(
      `ulleung-${region}-south`,
      region,
      ULLEUNG_REGION_IDS[index + 1],
      ULLEUNG_ROAD_ANCHORS[region].southX,
      MAP_HEIGHT - 24,
      REGIONS[ULLEUNG_REGION_IDS[index + 1]].name,
      false,
      'road',
    )] : []),
  ];
};

const joseonTownGuidesFor = (region: RegionId): FieldExitGuide[] => {
  if (!isJoseonTownRegion(region)) return [];
  return JOSEON_TOWN_LAYOUTS[region].gates.map((gate) => guide(
    `town-${gate.id}`,
    region,
    gate.destination,
    gate.x,
    gate.y,
    gate.label,
  ));
};

const specialGuidesFor = (region: RegionId): FieldExitGuide[] => {
  if (region === 'solgogae') {
    return [guide('solgogae-village', region, 'village', 768, MAP_HEIGHT - 24, '달빛고을 남문', false, 'road')];
  }
  if (region === 'village') {
    return [guide('village-solgogae', region, 'solgogae', 768, 24, '월영 솔고개 북문', false, 'road')];
  }
  return [];
};

/** Returns every field exit that can be meaningfully shown on the local map. */
export const fieldExitGuidesForRegion = (region: RegionId): readonly FieldExitGuide[] => {
  const campaign = CAMPAIGN_FIELD_ROUTES
    .filter((entry) => entry.region === region)
    .map((entry) => guide(
      entry.id,
      entry.region,
      entry.destination,
      entry.localX,
      entry.localY,
      entry.label,
      entry.requiresClear,
    ));
  const all = [
    ...campaign,
    ...joseonTownGuidesFor(region),
    ...ulleungGuidesFor(region),
    ...specialGuidesFor(region),
    ...seamGuideFor(region),
    ...ferryGuidesFor(region),
  ];
  const seen = new Set<RegionId>();
  return all.filter((entry) => {
    if (seen.has(entry.destination)) return false;
    seen.add(entry.destination);
    return true;
  });
};
