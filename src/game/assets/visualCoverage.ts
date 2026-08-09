import { ITEM_CATALOG } from '../items/catalog';
import type { ItemDefinition } from '../items/catalog';
import type { ItemId, MonsterKind } from '../simulation/types';
import {
  EPISODE2_REGION_IDS,
  REGIONS,
  type Episode2RegionId,
  type RegionId,
} from '../world/regions';
import { EPISODE2_REGION_LAYOUTS } from '../world/episode2Regions';
import { ASSETS } from './manifest';

export type VisualAssetReference = Readonly<{
  key: string;
  path: string;
}>;

export type RegionVisualCoverage = Readonly<{
  id: RegionId;
  name: string;
  province: string;
  safe: boolean;
  strategy: 'dedicated-background' | 'modular-composition';
  primaryAsset: VisualAssetReference;
  sharedFamily: string | null;
}>;

export type MonsterVisualCoverage = Readonly<{
  kind: MonsterKind;
  asset: VisualAssetReference;
  sharedBy: readonly MonsterKind[];
  status: 'dedicated' | 'shared';
  reuseRisk: 'none' | 'medium' | 'high' | 'critical';
}>;

export type ItemWorldVisualStatus =
  | 'world-weapon-ready'
  | 'armor-layer-ready'
  | 'missing-world-weapon'
  | 'missing-armor-layer'
  | 'missing-charm-layer'
  | 'not-applicable';

export type ItemVisualCoverage = Readonly<{
  id: ItemId;
  name: string;
  slot: ItemDefinition['slot'];
  icon: VisualAssetReference;
  groundPresentation: 'inventory-icon-reuse';
  worldPresentation: ItemWorldVisualStatus;
}>;

export type PropVisualCoverage = Readonly<{
  id: string;
  asset: VisualAssetReference;
}>;

const DEDICATED_REGION_BASES: Partial<Record<RegionId, VisualAssetReference>> = {
  solgogae: ASSETS.background,
  village: ASSETS.villageBackground,
  mistwood: ASSETS.mistwoodBackground,
  yeongwol: ASSETS.yeongwolTrainingYardBackground,
  yeongwolhq: ASSETS.yeongwolCommandHeadquartersBackground,
  jeonjufield: ASSETS.jeonjuWansanFieldBackground,
  jeonjugate: ASSETS.jeonjuPungnamGateBackground,
  jeonju: ASSETS.jeonjuCastleTownBackground,
  osaka: ASSETS.osakaOuterHarborBackground,
  settsuvillage: ASSETS.settsuVillageBackground,
  yamazakihunt: ASSETS.yamazakiHuntBackground,
  osakacastle: ASSETS.osakaCastleTownBackground,
  shogunkeep: ASSETS.shogunKeepBackground,
  awajicoast: ASSETS.awajiCoastBackground,
  busanjin: ASSETS.busanjinSiegeBackground,
  tangeumdae: ASSETS.tangeumdaeBackground,
  gyeongbokgate: ASSETS.gyeongbokGwanghwamunBackground,
  gyeongbokcourt: ASSETS.gyeongbokGeunjeongBackground,
  gyeongbokinner: ASSETS.gyeongbokInnerBackground,
  hanseongsouth: ASSETS.hanseongSouthBackground,
  hanseongmarket: ASSETS.hanseongMarketBackground,
  changdeokgung: ASSETS.changdeokgungAudienceBackground,
  gaeseong: ASSETS.gaeseongSongdoBackground,
  suwon: ASSETS.suwonDohobuBackground,
  chungju: ASSETS.chungjuMokgyeBackground,
  andong: ASSETS.andongSeowonBackground,
  wonju: ASSETS.extendedRegionBackgrounds.wonju,
  gangneung: ASSETS.extendedRegionBackgrounds.gangneung,
  haeju: ASSETS.extendedRegionBackgrounds.haeju,
  geoje: ASSETS.extendedRegionBackgrounds.geoje,
  jurchenvillage: ASSETS.jurchenVillageBackground,
  manchufrontier: ASSETS.manchuFrontierBackground,
  pyongyangouter: ASSETS.pyongyangOuterBackground,
  pyongyanggate: ASSETS.pyongyangDaedongGateBackground,
  pyongyanginner: ASSETS.pyongyangInnerBackground,
  namhansanseong: ASSETS.namhansanFortressBackground,
  ganghwado: ASSETS.ganghwaFortressBackground,
  minepass: ASSETS.minepassBackground,
  moonfield: ASSETS.moonfieldBackground,
  dungeon: ASSETS.dungeonBackground,
  ulleungdo: ASSETS.ulleungdoPrisonBackground,
  ulleungcoast: ASSETS.ulleungCoastalForestBackground,
  ulleungmeadow: ASSETS.ulleungSilvergrassMeadowBackground,
  ulleunghunt: ASSETS.ulleungdoTrainingGroundBackground,
  ulleungridge: ASSETS.ulleungHighlandRidgeBackground,
  ulleungvillage: ASSETS.ulleungGovernmentDistrictBackground,
};

const MODULAR_REGION_BASES: Partial<Record<RegionId, VisualAssetReference>> = {
  sakaicity: ASSETS.japanGroundTile,
  izumihunt: ASSETS.japanGroundTile,
  ikiport: ASSETS.japanGroundTile,
  tsushimahunt: ASSETS.japanGroundTile,
  izuhara: ASSETS.japanGroundTile,
  changbaihunt: ASSETS.northernGroundTile,
  baeksanvillage: ASSETS.northernGroundTile,
  songhuahunt: ASSETS.northernGroundTile,
  songhuavillage: ASSETS.northernGroundTile,
  blackpinehunt: ASSETS.northernGroundTile,
  heuksuvillage: ASSETS.northernGroundTile,
};

const episode2Set = new Set<string>(EPISODE2_REGION_IDS);

const regionCoverage = (id: RegionId): RegionVisualCoverage => {
  const region = REGIONS[id];
  const dedicated = DEDICATED_REGION_BASES[id];
  if (dedicated) {
    return {
      id,
      name: region.name,
      province: region.province,
      safe: region.safe,
      strategy: 'dedicated-background',
      primaryAsset: dedicated,
      sharedFamily: null,
    };
  }
  if (episode2Set.has(id)) {
    const layout = EPISODE2_REGION_LAYOUTS[id as Episode2RegionId];
    return {
      id,
      name: region.name,
      province: region.province,
      safe: region.safe,
      strategy: 'modular-composition',
      primaryAsset: ASSETS.episode2TerrainBases[layout.clusterId],
      sharedFamily: `episode2:${layout.clusterId}`,
    };
  }
  const modular = MODULAR_REGION_BASES[id];
  if (modular) {
    return {
      id,
      name: region.name,
      province: region.province,
      safe: region.safe,
      strategy: 'modular-composition',
      primaryAsset: modular,
      sharedFamily: modular.key,
    };
  }
  throw new Error(`Missing region visual coverage for ${id}`);
};

export const REGION_VISUAL_COVERAGE: Readonly<Record<RegionId, RegionVisualCoverage>> =
  Object.freeze(Object.fromEntries(
    (Object.keys(REGIONS) as RegionId[]).map((id) => [id, regionCoverage(id)]),
  ) as Record<RegionId, RegionVisualCoverage>);

const monsterAssets = ASSETS.monsters as Record<MonsterKind, VisualAssetReference>;
const monsterKinds = Object.keys(monsterAssets) as MonsterKind[];
const monsterKindsByAsset = monsterKinds.reduce((groups, kind) => {
  const key = monsterAssets[kind].key;
  const group = groups.get(key) ?? [];
  group.push(kind);
  groups.set(key, group);
  return groups;
}, new Map<string, MonsterKind[]>());

const reuseRisk = (count: number): MonsterVisualCoverage['reuseRisk'] => {
  if (count >= 5) return 'critical';
  if (count >= 3) return 'high';
  if (count === 2) return 'medium';
  return 'none';
};

export const MONSTER_VISUAL_COVERAGE: Readonly<Record<MonsterKind, MonsterVisualCoverage>> =
  Object.freeze(Object.fromEntries(monsterKinds.map((kind) => {
    const asset = monsterAssets[kind];
    const sharedBy = monsterKindsByAsset.get(asset.key) ?? [kind];
    return [kind, {
      kind,
      asset,
      sharedBy: [...sharedBy],
      status: sharedBy.length === 1 ? 'dedicated' : 'shared',
      reuseRisk: reuseRisk(sharedBy.length),
    }];
  })) as unknown as Record<MonsterKind, MonsterVisualCoverage>);

const playerWeapons = ASSETS.playerWeapons as Partial<Record<ItemId, VisualAssetReference>>;
const playerArmorLayers = ASSETS.playerArmorLayers as Partial<Record<ItemId, VisualAssetReference>>;

const itemWorldVisualStatus = (item: ItemDefinition): ItemWorldVisualStatus => {
  if (item.slot === 'weapon') return playerWeapons[item.id] ? 'world-weapon-ready' : 'missing-world-weapon';
  if (item.slot === 'armor') return playerArmorLayers[item.id] ? 'armor-layer-ready' : 'missing-armor-layer';
  if (item.slot === 'charm') return 'missing-charm-layer';
  return 'not-applicable';
};

export const ITEM_VISUAL_COVERAGE: Readonly<Record<ItemId, ItemVisualCoverage>> =
  Object.freeze(Object.fromEntries((Object.entries(ITEM_CATALOG) as Array<[ItemId, ItemDefinition]>).map(([id, item]) => [
    id,
    {
      id,
      name: item.name,
      slot: item.slot,
      icon: { key: item.iconKey, path: item.iconPath },
      groundPresentation: 'inventory-icon-reuse',
      worldPresentation: itemWorldVisualStatus(item),
    },
  ])) as Record<ItemId, ItemVisualCoverage>);

const isAssetReference = (value: unknown): value is VisualAssetReference => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VisualAssetReference>;
  return typeof candidate.key === 'string' && typeof candidate.path === 'string';
};

const collectPropAssets = (value: unknown, prefix = 'props'): PropVisualCoverage[] => {
  if (isAssetReference(value)) return [{ id: prefix, asset: value }];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => collectPropAssets(child, `${prefix}.${key}`));
};

export const PROP_VISUAL_COVERAGE: readonly PropVisualCoverage[] = Object.freeze(
  collectPropAssets(ASSETS.props),
);

export const MONSTER_ASSET_REUSE_GROUPS = Object.freeze(
  [...monsterKindsByAsset.entries()]
    .filter(([, kinds]) => kinds.length > 1)
    .map(([assetKey, kinds]) => ({ assetKey, kinds: [...kinds], count: kinds.length }))
    .sort((left, right) => right.count - left.count || left.assetKey.localeCompare(right.assetKey)),
);

export const ITEM_WORLD_VISUAL_GAPS = Object.freeze(
  Object.values(ITEM_VISUAL_COVERAGE)
    .filter((item) => item.worldPresentation.startsWith('missing-'))
    .map((item) => ({ id: item.id, name: item.name, slot: item.slot, reason: item.worldPresentation })),
);

export const VISUAL_COVERAGE_SUMMARY = Object.freeze({
  regions: Object.keys(REGION_VISUAL_COVERAGE).length,
  dedicatedRegionBackgrounds: Object.values(REGION_VISUAL_COVERAGE)
    .filter((region) => region.strategy === 'dedicated-background').length,
  modularRegionCompositions: Object.values(REGION_VISUAL_COVERAGE)
    .filter((region) => region.strategy === 'modular-composition').length,
  monsters: Object.keys(MONSTER_VISUAL_COVERAGE).length,
  uniqueMonsterAssets: new Set(Object.values(MONSTER_VISUAL_COVERAGE).map((monster) => monster.asset.key)).size,
  sharedMonsterKinds: Object.values(MONSTER_VISUAL_COVERAGE).filter((monster) => monster.status === 'shared').length,
  items: Object.keys(ITEM_VISUAL_COVERAGE).length,
  itemWorldVisualGaps: ITEM_WORLD_VISUAL_GAPS.length,
  propAssetEntries: PROP_VISUAL_COVERAGE.length,
});
