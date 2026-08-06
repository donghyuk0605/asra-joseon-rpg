import type { ItemId, MonsterKind } from '../simulation/types';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import {
  EPISODE2_REGION_IDS,
  type Episode2RegionId,
  type RegionId,
} from './regions';

export type Episode2ClusterId =
  | 'northwest-road'
  | 'mountain-road'
  | 'central-river'
  | 'west-coast'
  | 'honam-road'
  | 'yeongnam-road';

export type Episode2Biome =
  | 'mountain'
  | 'forest'
  | 'river'
  | 'marsh'
  | 'coast'
  | 'market';

export type Episode2WaterSide = 'left' | 'right' | 'both' | null;
export type Episode2PropMotion = 'static' | 'kiln' | 'waterwheel-base' | 'waterwheel-wheel' | 'pear-tree';

export type Episode2Prop = {
  id: string;
  frame: number;
  x: number;
  y: number;
  scale: number;
  flipX: boolean;
  solid: boolean;
  motion: Episode2PropMotion;
};

export type Episode2RegionLayout = {
  id: Episode2RegionId;
  clusterId: Episode2ClusterId;
  biome: Episode2Biome;
  groundColor: number;
  groundDetailFrame: number;
  roadFrame: number;
  waterSide: Episode2WaterSide;
  waterColor: number;
  wind: number;
  mist: number;
  tide: number;
  reeds: number;
  boats: number;
  flags: number;
  windmills: number;
  props: readonly Episode2Prop[];
  ecologyNote: string;
  dropPool: readonly ItemId[];
};

export type Episode2Cluster = {
  id: Episode2ClusterId;
  label: string;
  hanja: string;
  subtitle: string;
  routeLabel: string;
  travelDays: number;
  mapX: number;
  mapY: number;
  regions: readonly Episode2RegionId[];
};

export const EPISODE2_CLUSTERS: readonly Episode2Cluster[] = [
  {
    id: 'northwest-road', label: '서북 관문로', hanja: '西北路', subtitle: '황주에서 의주까지',
    routeLabel: '용만 북행로', travelDays: 4, mapX: 34, mapY: 33,
    regions: ['hwangju', 'jaeryeong', 'anju', 'uiju'],
  },
  {
    id: 'mountain-road', label: '동부 산악로', hanja: '東嶺路', subtitle: '양주에서 삼척까지',
    routeLabel: '관동 고갯길', travelDays: 3, mapX: 62, mapY: 51,
    regions: ['yangju', 'gapyeong', 'pyeongchang', 'samcheok'],
  },
  {
    id: 'central-river', label: '중부 강나루', hanja: '江津路', subtitle: '이천에서 공주까지',
    routeLabel: '남한강·금강 수로', travelDays: 3, mapX: 48, mapY: 66,
    regions: ['icheon', 'yeoju', 'cheongju', 'gongju'],
  },
  {
    id: 'west-coast', label: '서해 조운로', hanja: '西海路', subtitle: '제물포에서 군산까지',
    routeLabel: '서해 조운 뱃길', travelDays: 4, mapX: 31, mapY: 64,
    regions: ['jemulpo', 'namyang', 'boryeong', 'gunsan'],
  },
  {
    id: 'honam-road', label: '호남 물길', hanja: '湖南路', subtitle: '남원에서 나주까지',
    routeLabel: '영산강 남행로', travelDays: 4, mapX: 39, mapY: 79,
    regions: ['namwon', 'suncheon', 'mokpo', 'naju'],
  },
  {
    id: 'yeongnam-road', label: '영남 군영로', hanja: '嶺南路', subtitle: '상주에서 통영까지',
    routeLabel: '낙동강·남해 군로', travelDays: 4, mapX: 59, mapY: 78,
    regions: ['sangju', 'daegu', 'jinju', 'tongyeong'],
  },
];

export const isEpisode2Region = (region: string): region is Episode2RegionId =>
  (EPISODE2_REGION_IDS as readonly string[]).includes(region);

export const episode2ClusterForRegion = (region: Episode2RegionId): Episode2Cluster => {
  const cluster = EPISODE2_CLUSTERS.find((candidate) => candidate.regions.includes(region));
  if (!cluster) throw new Error(`Missing Episode II cluster for ${region}`);
  return cluster;
};

export const episode2Neighbors = (region: Episode2RegionId): Episode2RegionId[] => {
  const route = episode2ClusterForRegion(region).regions;
  const index = route.indexOf(region);
  return [index > 0 ? route[index - 1] : null, index < route.length - 1 ? route[index + 1] : null]
    .filter((candidate): candidate is Episode2RegionId => candidate !== null);
};

type Blueprint = {
  clusterId: Episode2ClusterId;
  biome: Episode2Biome;
  groundColor: number;
  waterSide: Episode2WaterSide;
  waterColor: number;
  frames: readonly [number, number, number, number, number, number];
  wind: number;
  mist: number;
  tide: number;
  reeds: number;
  boats: number;
  flags: number;
  windmills: number;
  ecologyNote: string;
  spawnKinds: readonly [MonsterKind, MonsterKind, MonsterKind];
  dropPool: readonly [ItemId, ItemId, ItemId];
};

const BLUEPRINTS: Record<Episode2RegionId, Blueprint> = {
  hwangju: { clusterId: 'northwest-road', biome: 'market', groundColor: 0x655b49, waterSide: null, waterColor: 0x526b70, frames: [0, 2, 9, 13, 15, 8], wind: 0.55, mist: 0.12, tide: 0, reeds: 2, boats: 0, flags: 2, windmills: 0, ecologyNote: '붉은여우령이 역참의 음식 찌꺼기를 노리고 돌도깨비가 야간 봉수로를 지킨다.', spawnKinds: ['episode2-red-fox', 'episode2-stone-dokkaebi', 'bandit'], dropPool: ['hwangju-moonsteel-spear', 'jaeryeong-fox-charm', 'yangju-beacon-seal'] },
  jaeryeong: { clusterId: 'northwest-road', biome: 'marsh', groundColor: 0x566650, waterSide: 'left', waterColor: 0x55716d, frames: [0, 5, 6, 10, 11, 15], wind: 0.72, mist: 0.48, tide: 0.25, reeds: 8, boats: 1, flags: 1, windmills: 0, ecologyNote: '갈대 속 여우령이 갯등불귀를 피하고, 물레 소리가 영물의 이동 시각을 바꾼다.', spawnKinds: ['episode2-red-fox', 'episode2-marsh-wisp', 'haeju-crane'], dropPool: ['jaeryeong-fox-charm', 'icheon-spirit-jar', 'yeoju-river-jade'] },
  anju: { clusterId: 'northwest-road', biome: 'river', groundColor: 0x53615b, waterSide: 'right', waterColor: 0x4c6d74, frames: [1, 3, 5, 6, 9, 2], wind: 0.48, mist: 0.32, tide: 0.35, reeds: 5, boats: 2, flags: 2, windmills: 0, ecologyNote: '청천강 배후의 혼불귀가 보급선을 노리며 수비대 잔병이 나루를 장악했다.', spawnKinds: ['episode2-marsh-wisp', 'joseon-border-archer', 'episode2-stone-dokkaebi'], dropPool: ['anju-frontier-coat', 'uiju-black-horn-bow', 'hwangju-moonsteel-spear'] },
  uiju: { clusterId: 'northwest-road', biome: 'forest', groundColor: 0x4d5a51, waterSide: 'both', waterColor: 0x496873, frames: [8, 9, 3, 14, 1, 12], wind: 0.82, mist: 0.38, tide: 0.3, reeds: 6, boats: 1, flags: 3, windmills: 0, ecologyNote: '산표범이 강변의 여우령을 추적하고 변경 초병이 혼란을 틈타 사냥꾼을 공격한다.', spawnKinds: ['episode2-mountain-leopard', 'episode2-red-fox', 'joseon-border-spearman'], dropPool: ['uiju-black-horn-bow', 'anju-frontier-coat', 'yangju-beacon-seal'] },
  yangju: { clusterId: 'mountain-road', biome: 'forest', groundColor: 0x5e604c, waterSide: null, waterColor: 0x526b70, frames: [0, 7, 9, 12, 15, 13], wind: 0.9, mist: 0.22, tide: 0, reeds: 2, boats: 0, flags: 3, windmills: 1, ecologyNote: '봉수 불빛이 돌도깨비를 깨우고, 여우령은 바람이 잦아들 때 장터로 내려온다.', spawnKinds: ['episode2-stone-dokkaebi', 'episode2-red-fox', 'korean-gray-wolf'], dropPool: ['yangju-beacon-seal', 'gapyeong-birch-talisman', 'hwangju-moonsteel-spear'] },
  gapyeong: { clusterId: 'mountain-road', biome: 'river', groundColor: 0x52634f, waterSide: 'left', waterColor: 0x4a6b67, frames: [0, 5, 6, 15, 12, 3], wind: 0.58, mist: 0.35, tide: 0.15, reeds: 5, boats: 1, flags: 1, windmills: 0, ecologyNote: '잣나무 그늘의 여우령과 강가 혼불귀가 물레의 밤낮 주기에 맞춰 영역을 바꾼다.', spawnKinds: ['episode2-red-fox', 'episode2-marsh-wisp', 'boar'], dropPool: ['gapyeong-birch-talisman', 'yeoju-river-jade', 'icheon-spirit-jar'] },
  pyeongchang: { clusterId: 'mountain-road', biome: 'mountain', groundColor: 0x56615b, waterSide: null, waterColor: 0x526b70, frames: [7, 9, 12, 0, 15, 8], wind: 1, mist: 0.58, tide: 0, reeds: 0, boats: 0, flags: 2, windmills: 1, ecologyNote: '산표범이 멧돼지를 절벽 쪽으로 몰고, 돌도깨비는 그 사체 주변의 제단을 지킨다.', spawnKinds: ['episode2-mountain-leopard', 'boar', 'episode2-stone-dokkaebi'], dropPool: ['pyeongchang-leopard-knife', 'gapyeong-birch-talisman', 'yangju-beacon-seal'] },
  samcheok: { clusterId: 'mountain-road', biome: 'coast', groundColor: 0x526460, waterSide: 'right', waterColor: 0x456b77, frames: [3, 10, 14, 9, 11, 2], wind: 1.05, mist: 0.42, tide: 0.72, reeds: 4, boats: 2, flags: 3, windmills: 1, ecologyNote: '해풍에 밀린 갯등불귀가 어물 건조장으로 접근하고 산표범은 절벽길을 순찰한다.', spawnKinds: ['episode2-marsh-wisp', 'episode2-mountain-leopard', 'geoje-sea-wraith'], dropPool: ['samcheok-seawind-bow', 'pyeongchang-leopard-knife', 'tongyeong-signal-drum'] },
  icheon: { clusterId: 'central-river', biome: 'market', groundColor: 0x715e49, waterSide: null, waterColor: 0x526b70, frames: [4, 0, 1, 13, 2, 15], wind: 0.34, mist: 0.2, tide: 0, reeds: 2, boats: 0, flags: 1, windmills: 0, ecologyNote: '가마 열기에 끌린 돌도깨비가 불씨를 먹고, 장터의 여우령은 밤마다 깨진 그릇을 뒤진다.', spawnKinds: ['episode2-stone-dokkaebi', 'episode2-red-fox', 'dokkaebi'], dropPool: ['icheon-spirit-jar', 'cheongju-kiln-hwando', 'gongju-scholar-coat'] },
  yeoju: { clusterId: 'central-river', biome: 'river', groundColor: 0x59685e, waterSide: 'both', waterColor: 0x527577, frames: [3, 5, 6, 10, 2, 12], wind: 0.5, mist: 0.34, tide: 0.45, reeds: 7, boats: 3, flags: 1, windmills: 0, ecologyNote: '황포돛배가 만든 물결이 혼불귀를 깨우며 강옥 부적이 놈들의 접근을 늦춘다.', spawnKinds: ['episode2-marsh-wisp', 'episode2-red-fox', 'haeju-crane'], dropPool: ['yeoju-river-jade', 'icheon-spirit-jar', 'boryeong-tidal-anchor'] },
  cheongju: { clusterId: 'central-river', biome: 'market', groundColor: 0x6d604d, waterSide: null, waterColor: 0x526b70, frames: [1, 4, 2, 13, 9, 0], wind: 0.46, mist: 0.18, tide: 0, reeds: 1, boats: 0, flags: 2, windmills: 0, ecologyNote: '가마를 차지한 돌도깨비와 밤 순라를 습격하는 산표범의 영역이 장시 가장자리에서 맞닿는다.', spawnKinds: ['episode2-stone-dokkaebi', 'episode2-mountain-leopard', 'bandit'], dropPool: ['cheongju-kiln-hwando', 'gongju-scholar-coat', 'icheon-spirit-jar'] },
  gongju: { clusterId: 'central-river', biome: 'river', groundColor: 0x5e6252, waterSide: 'left', waterColor: 0x4f7074, frames: [8, 1, 3, 9, 12, 5], wind: 0.62, mist: 0.28, tide: 0.35, reeds: 4, boats: 2, flags: 3, windmills: 0, ecologyNote: '금강진 수호제가 깨지며 혼불귀와 돌도깨비가 성문 밖 나루를 양분했다.', spawnKinds: ['episode2-marsh-wisp', 'episode2-stone-dokkaebi', 'joseon-border-swordsman'], dropPool: ['gongju-scholar-coat', 'yeoju-river-jade', 'cheongju-kiln-hwando'] },
  jemulpo: { clusterId: 'west-coast', biome: 'coast', groundColor: 0x4f625f, waterSide: 'left', waterColor: 0x466d76, frames: [3, 14, 10, 9, 2, 11], wind: 0.88, mist: 0.52, tide: 0.86, reeds: 7, boats: 3, flags: 3, windmills: 1, ecologyNote: '썰물 때 여우령이 갯벌로 나오고 밀물 때 갯등불귀가 부두 안쪽까지 따라온다.', spawnKinds: ['episode2-marsh-wisp', 'episode2-red-fox', 'geoje-sea-wraith'], dropPool: ['boryeong-tidal-anchor', 'gunsan-drowned-blade', 'tongyeong-signal-drum'] },
  namyang: { clusterId: 'west-coast', biome: 'marsh', groundColor: 0x66705e, waterSide: 'right', waterColor: 0x577370, frames: [11, 10, 3, 0, 15, 2], wind: 0.76, mist: 0.64, tide: 0.62, reeds: 10, boats: 1, flags: 1, windmills: 1, ecologyNote: '염전의 소금 결정이 혼불귀를 약화시키지만 붉은여우령 무리가 창고 주변에 모인다.', spawnKinds: ['episode2-red-fox', 'episode2-marsh-wisp', 'haeju-crane'], dropPool: ['jaeryeong-fox-charm', 'boryeong-tidal-anchor', 'icheon-spirit-jar'] },
  boryeong: { clusterId: 'west-coast', biome: 'coast', groundColor: 0x52635e, waterSide: 'both', waterColor: 0x436975, frames: [14, 9, 10, 3, 8, 11], wind: 0.94, mist: 0.4, tide: 0.9, reeds: 6, boats: 3, flags: 4, windmills: 0, ecologyNote: '수군 북소리에 갯등불귀가 흩어지고 돌도깨비가 퇴조 때 드러난 철닻을 지킨다.', spawnKinds: ['episode2-marsh-wisp', 'episode2-stone-dokkaebi', 'wako-raider'], dropPool: ['boryeong-tidal-anchor', 'tongyeong-signal-drum', 'gunsan-drowned-blade'] },
  gunsan: { clusterId: 'west-coast', biome: 'river', groundColor: 0x58665c, waterSide: 'right', waterColor: 0x476f73, frames: [3, 10, 11, 9, 2, 14], wind: 0.8, mist: 0.58, tide: 0.74, reeds: 8, boats: 3, flags: 2, windmills: 1, ecologyNote: '조운선의 곡물 냄새가 여우령을 부르고 익사귀는 선창의 흔들림을 따라 공격한다.', spawnKinds: ['episode2-marsh-wisp', 'episode2-red-fox', 'geoje-sea-wraith'], dropPool: ['gunsan-drowned-blade', 'boryeong-tidal-anchor', 'namwon-bamboo-flute'] },
  namwon: { clusterId: 'honam-road', biome: 'forest', groundColor: 0x58674f, waterSide: 'left', waterColor: 0x52716b, frames: [12, 13, 15, 0, 2, 5], wind: 0.62, mist: 0.36, tide: 0.2, reeds: 5, boats: 1, flags: 1, windmills: 0, ecologyNote: '대숲 여우령이 약재 향을 좇고 산표범은 강 건너 멧돼지 떼를 사냥한다.', spawnKinds: ['episode2-red-fox', 'episode2-mountain-leopard', 'bamboo-spirit'], dropPool: ['namwon-bamboo-flute', 'gapyeong-birch-talisman', 'pyeongchang-leopard-knife'] },
  suncheon: { clusterId: 'honam-road', biome: 'marsh', groundColor: 0x536857, waterSide: 'both', waterColor: 0x4f726c, frames: [10, 11, 3, 15, 12, 0], wind: 0.9, mist: 0.62, tide: 0.86, reeds: 12, boats: 2, flags: 1, windmills: 1, ecologyNote: '갈대가 크게 눕는 만조에 혼불귀가 이동하고 여우령은 바람 반대편 둑으로 피한다.', spawnKinds: ['episode2-marsh-wisp', 'episode2-red-fox', 'haeju-crane'], dropPool: ['namwon-bamboo-flute', 'gunsan-drowned-blade', 'jaeryeong-fox-charm'] },
  mokpo: { clusterId: 'honam-road', biome: 'coast', groundColor: 0x4d6060, waterSide: 'left', waterColor: 0x426b78, frames: [14, 3, 10, 9, 11, 8], wind: 1.08, mist: 0.7, tide: 1, reeds: 7, boats: 4, flags: 4, windmills: 1, ecologyNote: '거센 해무가 혼불귀를 숨기며 신호 깃발과 배의 출렁임이 위험 주기를 알려 준다.', spawnKinds: ['episode2-marsh-wisp', 'geoje-sea-wraith', 'wako-archer'], dropPool: ['gunsan-drowned-blade', 'tongyeong-signal-drum', 'boryeong-tidal-anchor'] },
  naju: { clusterId: 'honam-road', biome: 'market', groundColor: 0x68705a, waterSide: 'right', waterColor: 0x53736b, frames: [15, 0, 2, 13, 5, 12], wind: 0.5, mist: 0.22, tide: 0.32, reeds: 4, boats: 1, flags: 1, windmills: 0, ecologyNote: '떨어진 배를 먹는 여우령과 과원을 지키는 돌도깨비가 밤마다 과원 경계에서 충돌한다.', spawnKinds: ['episode2-red-fox', 'episode2-stone-dokkaebi', 'boar'], dropPool: ['namwon-bamboo-flute', 'jaeryeong-fox-charm', 'yeoju-river-jade'] },
  sangju: { clusterId: 'yeongnam-road', biome: 'forest', groundColor: 0x615d49, waterSide: 'left', waterColor: 0x52706b, frames: [0, 5, 6, 9, 2, 15], wind: 0.56, mist: 0.28, tide: 0.28, reeds: 4, boats: 1, flags: 2, windmills: 0, ecologyNote: '낙동 물레촌의 돌도깨비가 역원 수레를 막고 여우령은 강둑을 따라 남하한다.', spawnKinds: ['episode2-stone-dokkaebi', 'episode2-red-fox', 'bandit'], dropPool: ['cheongju-kiln-hwando', 'tongyeong-signal-drum', 'namwon-bamboo-flute'] },
  daegu: { clusterId: 'yeongnam-road', biome: 'market', groundColor: 0x705a47, waterSide: null, waterColor: 0x526b70, frames: [4, 2, 13, 1, 15, 9], wind: 0.42, mist: 0.16, tide: 0, reeds: 1, boats: 0, flags: 2, windmills: 0, ecologyNote: '약령장 향이 산표범을 혼란시키고 돌도깨비는 가마의 불길이 약해지면 나타난다.', spawnKinds: ['episode2-stone-dokkaebi', 'episode2-mountain-leopard', 'dokkaebi'], dropPool: ['cheongju-kiln-hwando', 'gongju-scholar-coat', 'icheon-spirit-jar'] },
  jinju: { clusterId: 'yeongnam-road', biome: 'river', groundColor: 0x566259, waterSide: 'right', waterColor: 0x4b6f74, frames: [8, 9, 3, 5, 10, 12], wind: 0.7, mist: 0.4, tide: 0.45, reeds: 6, boats: 2, flags: 3, windmills: 0, ecologyNote: '남강의 혼불귀가 수비대 봉화를 피하고 산표범은 강변 숲의 여우령을 추격한다.', spawnKinds: ['episode2-mountain-leopard', 'episode2-marsh-wisp', 'episode2-red-fox'], dropPool: ['pyeongchang-leopard-knife', 'tongyeong-signal-drum', 'yeoju-river-jade'] },
  tongyeong: { clusterId: 'yeongnam-road', biome: 'coast', groundColor: 0x4b5e60, waterSide: 'both', waterColor: 0x3f6875, frames: [14, 3, 9, 10, 8, 11], wind: 1.12, mist: 0.46, tide: 1, reeds: 5, boats: 4, flags: 5, windmills: 1, ecologyNote: '북과 깃발의 신호가 조선소 일꾼과 선박을 움직이고, 해무원귀는 신호가 끊긴 부두를 덮친다.', spawnKinds: ['episode2-marsh-wisp', 'geoje-sea-wraith', 'wako-captain'], dropPool: ['tongyeong-signal-drum', 'boryeong-tidal-anchor', 'samcheok-seawind-bow'] },
};

const PROP_SITES = [
  { x: 245, y: 250, scale: 0.72 },
  { x: 1290, y: 255, scale: 0.7 },
  { x: 315, y: 505, scale: 0.62 },
  { x: 1225, y: 525, scale: 0.62 },
  { x: 365, y: 820, scale: 0.58 },
  { x: 1175, y: 825, scale: 0.58 },
] as const;

const propMotionForFrame = (frame: number): Episode2PropMotion => {
  if (frame === 4) return 'kiln';
  if (frame === 5) return 'waterwheel-base';
  if (frame === 6) return 'waterwheel-wheel';
  if (frame === 15) return 'pear-tree';
  return 'static';
};

const nonSolidFrames = new Set([2, 6, 10, 13, 15]);

const layoutFromBlueprint = (id: Episode2RegionId, index: number): Episode2RegionLayout => {
  const blueprint = BLUEPRINTS[id];
  const props = blueprint.frames.map((frame, propIndex): Episode2Prop => {
    const site = PROP_SITES[(propIndex + index) % PROP_SITES.length];
    return {
      id: `${id}-prop-${propIndex}`,
      frame,
      x: site.x + ((index * 37 + propIndex * 19) % 42) - 21,
      y: site.y + ((index * 23 + propIndex * 31) % 36) - 18,
      scale: site.scale * (0.94 + ((index + propIndex) % 3) * 0.04),
      flipX: (index + propIndex) % 2 === 1,
      solid: !nonSolidFrames.has(frame),
      motion: propMotionForFrame(frame),
    };
  });
  return {
    id,
    clusterId: blueprint.clusterId,
    biome: blueprint.biome,
    groundColor: blueprint.groundColor,
    groundDetailFrame: index % 8,
    roadFrame: (index * 3 + 1) % 8,
    waterSide: blueprint.waterSide,
    waterColor: blueprint.waterColor,
    wind: blueprint.wind,
    mist: blueprint.mist,
    tide: blueprint.tide,
    reeds: blueprint.reeds,
    boats: blueprint.boats,
    flags: blueprint.flags,
    windmills: blueprint.windmills,
    props,
    ecologyNote: blueprint.ecologyNote,
    dropPool: blueprint.dropPool,
  };
};

export const EPISODE2_REGION_LAYOUTS = Object.fromEntries(
  EPISODE2_REGION_IDS.map((id, index) => [id, layoutFromBlueprint(id, index)]),
) as Record<Episode2RegionId, Episode2RegionLayout>;

const SPAWN_SITES = [
  [430, 330], [1085, 340], [390, 630], [1140, 650], [770, 760],
] as const;

export const EPISODE2_REGION_SPAWNS = Object.fromEntries(
  EPISODE2_REGION_IDS.map((id, index) => {
    const kinds = BLUEPRINTS[id].spawnKinds;
    const spawns = SPAWN_SITES.map(([x, y], spawnIndex): [MonsterKind, number, number] => [
      kinds[(spawnIndex + index) % kinds.length],
      x + ((index * 41 + spawnIndex * 17) % 56) - 28,
      y + ((index * 29 + spawnIndex * 23) % 50) - 25,
    ]);
    return [id, spawns];
  }),
) as Record<Episode2RegionId, Array<[MonsterKind, number, number]>>;

export type Episode2Obstacle =
  | { type: 'circle'; x: number; y: number; radius: number }
  | { type: 'box'; x: number; y: number; width: number; height: number };

export const episode2WorldObstacles = (): Episode2Obstacle[] =>
  EPISODE2_REGION_IDS.flatMap((region) => {
    const origin = REGION_ORIGINS[region];
    const layout = EPISODE2_REGION_LAYOUTS[region];
    const props: Episode2Obstacle[] = layout.props
      .filter((prop) => prop.solid)
      .map((prop) => ({
        type: 'box' as const,
        x: origin.x + prop.x,
        y: origin.y + prop.y - 22 * prop.scale,
        width: 245 * prop.scale,
        height: 116 * prop.scale,
      }));
    const water: Episode2Obstacle[] = [];
    if (layout.waterSide === 'left' || layout.waterSide === 'both') {
      water.push({ type: 'box', x: origin.x + 70, y: origin.y + MAP_HEIGHT / 2, width: 140, height: MAP_HEIGHT });
    }
    if (layout.waterSide === 'right' || layout.waterSide === 'both') {
      water.push({ type: 'box', x: origin.x + MAP_WIDTH - 70, y: origin.y + MAP_HEIGHT / 2, width: 140, height: MAP_HEIGHT });
    }
    return [...props, ...water];
  });

export const episode2DropPool = (region: RegionId): readonly ItemId[] =>
  isEpisode2Region(region) ? EPISODE2_REGION_LAYOUTS[region].dropPool : [];
