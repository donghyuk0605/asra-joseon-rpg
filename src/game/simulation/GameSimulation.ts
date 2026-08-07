import { CRAFTING_RECIPES, ITEM_CATALOG, ITEM_SET, type ItemDefinition } from '../items/catalog';
import type {
  BasicAttackStep, CraftRecipeId, EquipmentSlot, EquipmentState, GameEvent, GroundDrop, InventoryItem, ItemId,
  ActiveWorldEvent, FollowerAttackKind, FollowerKind, FollowerState, LandmarkId, MonsterKind, MonsterState,
  MonsterTacticalRole, PlayerState,
  PlayerOrigin, RecruitmentRoute, SkillId, Vec2, WorldEventKind, ShopOfferId, SkillUnlockSource, WeaponElement,
  GwanghaeMilitiaRallyBlockedReason, GwanghaePathChoiceBlockedReason,
} from './types';
import { CENTRAL_WORLD_HEIGHT, MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS, VILLAGE_TOP } from '../world/layout';
import {
  EPISODE2_REGION_IDS,
  REGIONS,
  type JapanRegionId,
  type JurchenExpansionRegionId,
  type PyongyangRegionId,
  type RegionId,
} from '../world/regions';
import {
  isJapanRegion,
  JAPAN_REGION_IDS,
  japanBackwardDestination,
  japanForwardDestination,
} from '../world/japanCampaign';
import {
  isUlleungRegion,
  ULLEUNG_REFUGEE_CAMP_LOCAL,
  ULLEUNG_PASSAGES,
  ULLEUNG_REGION_IDS,
  ULLEUNG_WORLD_BOUNDS,
  ulleungRegionAtY,
  ulleungRoadCenterAtY,
  ulleungWalkableBoundsAt,
} from '../world/ulleungContinuity';
import { generateDungeonFloor, MAX_DUNGEON_FLOOR, type DungeonFloorLayout } from '../world/dungeonGenerator';
import { bossForFloor } from '../bosses/catalog';
import { BossCombatController, createBossState } from '../bosses/BossCombatController';
import { containsPatternPoint } from '../bosses/patternGeometry';
import type { BossState } from '../bosses/types';
import {
  attributePointsEarnedAtLevel,
  derivedAttributeBonuses,
  emptyAttributeAllocations,
  normalizeAttributeAllocations,
  totalAttributes,
  type AttributeId,
  type AttributeValues,
} from '../progression/attributes';
import {
  ARCHER_SKILL_IDS,
  MANUAL_SKILL_BY_ITEM,
  SHAMAN_ACTIVE_SKILL_IDS,
  SKILL_CATALOG,
  unmetSkillPrerequisite,
} from '../skills/catalog';
import { FOLLOWER_CATALOG } from '../followers/catalog';
import { frontierSectorAt } from '../world/frontier';
import { campaignStructureWorldObstacles } from '../world/campaignStructures';
import { betaRoadsidePropWorldObstacles } from '../world/betaRoadsideProps';
import { japanExpansionWorldObstacles } from '../world/japanExpansion';
import {
  isJurchenRegion,
  JURCHEN_EXPANSION_REGION_IDS,
  JURCHEN_REGION_CATEGORY,
  JURCHEN_REGION_IDS,
  JURCHEN_TRIBE_REGION_IDS,
  jurchenBackwardDestination,
  jurchenForwardDestination,
} from '../world/jurchenCampaign';
import { jurchenExpansionWorldObstacles } from '../world/jurchenExpansion';
import { extendedWorldObstacles, isExtendedRegion } from '../world/extendedRegions';
import {
  EPISODE2_REGION_SPAWNS,
  episode2DropPool,
  episode2Neighbors,
  episode2WorldObstacles,
  isEpisode2Region,
} from '../world/episode2Regions';
import {
  GWANGHAE_MILITIA_RALLY_NPC_IDS,
  GWANGHAE_MILITIA_RALLY_POINTS,
  isJoseonTownRegion,
  isGwanghaeMilitiaRallyNpc,
  JOSEON_TOWN_LAYOUTS,
  JOSEON_TOWN_REGION_IDS,
  joseonTownGate,
  joseonTownWorldObstacles,
  type GwanghaeCampaignPath,
  type GwanghaeMilitiaRallyNpcId,
  type GwanghaeMilitiaRallyPoint,
} from '../world/joseonTowns';
import {
  activeRoyalRefugeStage,
  advanceRoyalRefugeObjective,
  beginRoyalRefugeCampaign,
  chooseRoyalRefugeRoute as chooseRoyalRefugeRouteState,
  createRoyalRefugeCampaignState,
  isRoyalRefugeRouteId,
  KING_ENCOUNTER_AFTER_PYONGYANG,
  ROYAL_REFUGE_ROUTES,
  type RoyalRefugeCampaignState,
  type RoyalRefugeRouteId,
} from '../world/royalRefugeCampaign';
import {
  isTravelAtlasRegion,
  isWorldMapNodeDiscovered,
  TRAVEL_ATLAS_REGION_IDS,
  travelAtlasArrivalY,
  WORLD_MAP_NODES,
  type WorldMapNode,
  type WorldMapTravelResult,
} from '../world/worldMap';
import {
  advanceFactionWar,
  captureStronghold,
  cloneFactionWarState,
  createFactionWarState,
  factionWarSnapshot,
  rallyFactionReserve,
  reserveCapacityForFaction,
  resolveFactionDecision,
  restoreFactionWarState,
  type FactionWarSnapshot,
  type FactionWarState,
} from '../world/factionWar';
import {
  continuousWorldEdge,
  worldTravelDockObstacles,
  worldTravelConnectionAtEdge,
  worldTerrainSeamBetween,
} from '../world/worldContinuity';
import { ULLEUNG_EDGE_TREE_SITES } from '../world/treeSpecies';
import { VILLAGE_FARM_PLOTS } from '../world/villageFarm';
import {
  createStoryCampaignState,
  normalizeStoryCampaignState,
  type StoryCampaignState,
} from '../story/StoryCampaign';

const followerAttackKind = (kind: FollowerKind): FollowerAttackKind => {
  if (kind === 'jurchen-bowguard' || kind === 'gwanghae-archer') return 'arrow';
  if (kind === 'government-defector' || kind === 'jurchen-vanguard' || kind === 'gwanghae-spearman') return 'spear';
  if (kind === 'jurchen-captain' || kind === 'gwanghae-captain') return 'command';
  return 'blade';
};

const PLAYER_HOME_SPAWNS = {
  'kim-donghyeok': { region: 'village', x: 768, y: 790 },
  'frontier-archer': { region: 'jurchenvillage', x: 768, y: 790 },
  'osaka-mudang': { region: 'settsuvillage', x: 768, y: 790 },
  'gwanghae-prince': { region: 'changdeokgung', x: 768, y: 650 },
} as const satisfies Record<PlayerOrigin, { region: RegionId; x: number; y: number }>;

export const GWANGHAE_RALLY_MILESTONE_PREFIX = 'gwanghae-rally-';
export const GWANGHAE_PATH_MILESTONES: Record<GwanghaeCampaignPath, string> = {
  coup: 'gwanghae-path-coup',
  suppression: 'gwanghae-path-suppression',
};
export const GWANGHAE_PATH_BATTLE_MILESTONES: Record<GwanghaeCampaignPath, string> = {
  coup: 'gwanghae-path-coup-battle-cleared',
  suppression: 'gwanghae-path-suppression-battle-cleared',
};

export const GWANGHAE_COUP_STAGE_REGIONS = [
  'gyeongbokgate',
  'gyeongbokcourt',
  'gyeongbokinner',
] as const;

export type GwanghaeCoupStageRegion = typeof GWANGHAE_COUP_STAGE_REGIONS[number];

export const GWANGHAE_COUP_STAGE_MILESTONES: Record<GwanghaeCoupStageRegion, string> = {
  gyeongbokgate: 'gwanghae-coup-gate-cleared',
  gyeongbokcourt: 'gwanghae-coup-court-cleared',
  gyeongbokinner: 'gwanghae-coup-inner-cleared',
};

const GWANGHAE_COUP_STAGES = {
  gyeongbokgate: {
    title: '제1전 · 광화문 내금위 선봉',
    nextRegion: 'gyeongbokcourt',
  },
  gyeongbokcourt: {
    title: '제2전 · 근정전 금군 방진',
    nextRegion: 'gyeongbokinner',
  },
  gyeongbokinner: {
    title: '제3전 · 사정전 선조 호위대',
    nextRegion: null,
  },
} as const satisfies Record<GwanghaeCoupStageRegion, {
  title: string;
  nextRegion: RegionId | null;
}>;

const GWANGHAE_PATH_BATTLES = {
  coup: {
    region: 'gyeongbokgate',
    title: '한성 환궁 쿠데타 · 광화문 친위대',
    rewardGold: 420,
    rewardXp: 180,
  },
  suppression: {
    region: 'jeonjufield',
    title: '왕명 집행 · 삼남 의병 진압전',
    rewardGold: 300,
    rewardXp: 140,
  },
} as const satisfies Record<GwanghaeCampaignPath, {
  region: RegionId;
  title: string;
  rewardGold: number;
  rewardXp: number;
}>;

const GWANGHAE_KING_FLIGHT = {
  title: '분조 정변 · 선조의 파천',
  dialogue: [
    '선조: 내 명을 빌려 군사를 모으더니, 이제 그 칼을 아비에게 겨누느냐?',
    '광해: 전하께서 버린 도성과 백성을 지킨 것은 왕명이 아니라 그들의 피였습니다.',
    '선조: 왕좌를 탐한 역심을 충의라 부르느냐? 내금위는 역적을 베어라!',
    '광해: 내금위는 이미 칼을 거두었습니다. 왕좌가 아니라 전하의 책임을 묻는 것입니다.',
    '선조: 옥새와 어가를 옮겨라. 남한산성이든 강화도든 끝까지 왕을 지킬 것이다.',
    '광해: 옥새를 내려놓고 백성 앞에 서십시오. 다시 달아나신다면 제가 끝까지 뒤쫓겠습니다.',
    '광해: 왕을 시해하지 마라. 퇴로를 봉쇄하고 살아서 백성의 심판대에 세워라.',
  ],
} as const;

export type GwanghaeRallyPointProgress = GwanghaeMilitiaRallyPoint & Readonly<{
  completed: boolean;
  available: boolean;
}>;

export type GwanghaeRallyProgress = Readonly<{
  completed: number;
  total: number;
  recruits: number;
  reserve: number;
  strength: number;
  choiceReady: boolean;
  path: GwanghaeCampaignPath | null;
  points: readonly GwanghaeRallyPointProgress[];
}>;

export type GwanghaeCoupStageProgress = Readonly<{
  region: GwanghaeCoupStageRegion;
  stageIndex: 0 | 1 | 2;
  stageNumber: 1 | 2 | 3;
  totalStages: 3;
  title: string;
  defeated: number;
  total: number;
  enemyFielded: number;
  enemyPending: number;
  enemyReserve: number;
  enemyRemaining: number;
  complete: boolean;
  nextRegion: RegionId | null;
}>;

export type GwanghaePathBattleProgress = Readonly<{
  path: GwanghaeCampaignPath;
  region: RegionId;
  title: string;
  defeated: number;
  total: number;
  enemyFielded: number;
  enemyPending: number;
  enemyReserve: number;
  enemyRemaining: number;
  complete: boolean;
  rewardGold: number;
  rewardXp: number;
}>;

export type GwanghaeMilitiaRallyResult =
  | Readonly<{
    ok: true;
    point: GwanghaeMilitiaRallyPoint;
    reserveAdded: number;
    strengthAdded: number;
    progress: GwanghaeRallyProgress;
  }>
  | Readonly<{
    ok: false;
    npcId: string;
    reason: GwanghaeMilitiaRallyBlockedReason;
    expectedRegion?: RegionId;
    requiredNpcId?: GwanghaeMilitiaRallyNpcId;
    progress: GwanghaeRallyProgress;
  }>;

export type GwanghaePathChoiceResult =
  | Readonly<{
    ok: true;
    path: GwanghaeCampaignPath;
    title: string;
    message: string;
    reserveBefore: number;
    strengthBefore: number;
    progress: GwanghaeRallyProgress;
  }>
  | Readonly<{
    ok: false;
    path: GwanghaeCampaignPath;
    reason: GwanghaePathChoiceBlockedReason;
    remaining?: number;
    selectedPath?: GwanghaeCampaignPath;
    progress: GwanghaeRallyProgress;
  }>;

const MONSTER_DATA: Record<MonsterKind, { name: string; hp: number; damage: number; level: number }> = {
  'osaka-overseer': { name: '포로촌 감시역', hp: 58, damage: 4, level: 1 },
  'osaka-ronin': { name: '출병항 낭인', hp: 84, damage: 6, level: 2 },
  'osaka-gunner': { name: '선단 조총 훈련병', hp: 72, damage: 7, level: 2 },
  'ulleung-hare': { name: '울릉 산토끼', hp: 30, damage: 2, level: 1 },
  'ulleung-water-deer': { name: '울릉 물사슴', hp: 46, damage: 3, level: 1 },
  'ulleung-sangun': { name: '울릉 산군', hp: 168, damage: 15, level: 7 },
  'ulleung-guard': { name: '울릉 환도 포졸', hp: 82, damage: 7, level: 2 },
  'ulleung-veteran': { name: '울릉 장창 포졸', hp: 118, damage: 10, level: 4 },
  'ulleung-archer': { name: '울릉 관아 궁수', hp: 92, damage: 9, level: 4 },
  'ulleung-executioner': { name: '형방 집행관', hp: 154, damage: 14, level: 5 },
  'ulleung-captain': { name: '울릉 포도대장', hp: 194, damage: 12, level: 6 },
  'ulleung-magistrate': { name: '탐관오리 이방 서병관', hp: 540, damage: 19, level: 9 },
  'wako-raider': { name: '왜구 선봉대', hp: 104, damage: 10, level: 6 },
  'wako-archer': { name: '왜구 화살잡이', hp: 86, damage: 11, level: 6 },
  'wako-captain': { name: '왜구 선단 대장', hp: 230, damage: 16, level: 8 },
  'yeongwol-swordsman': { name: '영월 관아 환도수', hp: 126, damage: 11, level: 7 },
  'yeongwol-spearman': { name: '영월 장창병', hp: 142, damage: 13, level: 8 },
  'yeongwol-archer': { name: '영월 수성 궁수', hp: 102, damage: 12, level: 8 },
  'yeongwol-shield': { name: '영월 방패군', hp: 184, damage: 10, level: 9 },
  'yeongwol-commander': { name: '영월 포도대장', hp: 268, damage: 17, level: 10 },
  'jeonju-swordsman': { name: '전주 감영 환도군', hp: 154, damage: 14, level: 9 },
  'jeonju-spearman': { name: '전주 장창 군관', hp: 178, damage: 16, level: 10 },
  'jeonju-archer': { name: '풍남문 수성 궁수', hp: 128, damage: 15, level: 10 },
  'jeonju-shield': { name: '전주 중갑 방패군', hp: 224, damage: 13, level: 11 },
  'jeonju-commander': { name: '전주 포도대장', hp: 360, damage: 21, level: 12 },
  'jeonju-militia-sickle': { name: '강제 징발 낫군', hp: 108, damage: 12, level: 8 },
  'japanese-swordsman': { name: '왜군 노다치 돌격대', hp: 168, damage: 18, level: 12 },
  'japanese-spearman': { name: '왜군 장창 아시가루', hp: 184, damage: 17, level: 12 },
  'japanese-archer': { name: '왜군 유미 궁수', hp: 142, damage: 18, level: 13 },
  'japanese-gunner': { name: '왜군 조총수', hp: 188, damage: 24, level: 15 },
  'japanese-general': { name: '왜군 선봉장', hp: 620, damage: 30, level: 17 },
  'japanese-sika-deer': { name: '야마자키 꽃사슴', hp: 52, damage: 3, level: 2 },
  'japanese-wild-boar': { name: '셋쓰 큰멧돼지', hp: 128, damage: 10, level: 4 },
  'japanese-shogun': { name: '오사카 군선봉행 아시카가 카게노부', hp: 1080, damage: 32, level: 18 },
  'manchu-lancer': { name: '여진 철갑 장창수', hp: 228, damage: 24, level: 16 },
  'manchu-archer': { name: '여진 각궁수', hp: 186, damage: 25, level: 17 },
  'manchu-cavalry': { name: '여진 철기병', hp: 310, damage: 31, level: 18 },
  'manchu-captain': { name: '여진 선봉장', hp: 560, damage: 32, level: 19 },
  'manchu-chieftain': { name: '여진 대족장 아이신고로 바투르', hp: 980, damage: 42, level: 22 },
  'joseon-border-swordsman': { name: '조선 국경 환도수', hp: 74, damage: 5, level: 2 },
  'joseon-border-spearman': { name: '조선 국경 장창수', hp: 92, damage: 6, level: 3 },
  'joseon-border-archer': { name: '조선 진보 궁수', hp: 68, damage: 6, level: 3 },
  'joseon-border-commander': { name: '조선 첨절제사', hp: 184, damage: 9, level: 5 },
  'royal-guard': { name: '경복궁 내금위', hp: 260, damage: 19, level: 14 },
  'joseon-prince': { name: '왕자 이환', hp: 720, damage: 29, level: 18 },
  'joseon-civilian': { name: '피난 가는 조선 백성', hp: 30, damage: 0, level: 1 },
  'korean-gray-wolf': { name: '회색 산늑대', hp: 122, damage: 13, level: 6 },
  dokkaebi: { name: '검푸른 도깨비', hp: 132, damage: 9, level: 4 },
  boar: { name: '산령 멧돼지', hp: 96, damage: 7, level: 3 },
  bandit: { name: '복면 탈영병', hp: 118, damage: 11, level: 5 },
  'bamboo-spirit': { name: '청람 죽림귀', hp: 146, damage: 12, level: 6 },
  'mine-golem': { name: '흑철 광산귀', hp: 188, damage: 15, level: 7 },
  'moon-revenant': { name: '은초 원귀', hp: 158, damage: 14, level: 7 },
  'wonju-bear': { name: '치악산 큰곰', hp: 210, damage: 18, level: 8 },
  'gangneung-haetae': { name: '경포 해태귀', hp: 235, damage: 20, level: 9 },
  'haeju-crane': { name: '해주 백학귀', hp: 68, damage: 4, level: 4 },
  'geoje-sea-wraith': { name: '거제 해무원귀', hp: 214, damage: 18, level: 10 },
  'episode2-red-fox': { name: '붉은여우령', hp: 92, damage: 8, level: 6 },
  'episode2-mountain-leopard': { name: '설악 산표범', hp: 248, damage: 23, level: 12 },
  'episode2-marsh-wisp': { name: '갯등불귀', hp: 186, damage: 18, level: 10 },
  'episode2-stone-dokkaebi': { name: '석장 도깨비', hp: 310, damage: 25, level: 13 },
};

const REGION_SPAWNS: Record<Exclude<RegionId, 'village'>, Array<[MonsterKind, number, number]>> = {
  solgogae: [
    ['boar', 445, 355], ['dokkaebi', 775, 315], ['bandit', 1055, 375],
    ['boar', 575, 625], ['dokkaebi', 950, 650], ['bandit', 1210, 585],
    ['boar', 325, 780], ['bandit', 1165, 790],
  ],
  mistwood: [
    ['bamboo-spirit', 410, 350], ['bamboo-spirit', 700, 320], ['bamboo-spirit', 1030, 380],
    ['bamboo-spirit', 510, 640], ['bamboo-spirit', 875, 625], ['bamboo-spirit', 1190, 590],
    ['dokkaebi', 330, 785], ['dokkaebi', 1140, 785],
  ],
  yeongwol: [
    ['yeongwol-swordsman', 480, 790], ['yeongwol-swordsman', 1056, 790],
    ['yeongwol-shield', 620, 705], ['yeongwol-shield', 916, 705],
    ['yeongwol-archer', 420, 610], ['yeongwol-archer', 1116, 610],
    ['yeongwol-spearman', 560, 500], ['yeongwol-spearman', 976, 500],
    ['yeongwol-swordsman', 670, 410], ['yeongwol-swordsman', 866, 410],
    ['yeongwol-archer', 455, 315], ['yeongwol-archer', 1081, 315],
  ],
  yeongwolhq: [
    ['yeongwol-shield', 560, 790], ['yeongwol-shield', 976, 790],
    ['yeongwol-spearman', 660, 680], ['yeongwol-spearman', 876, 680],
    ['yeongwol-archer', 430, 570], ['yeongwol-archer', 1106, 570],
    ['yeongwol-swordsman', 620, 470], ['yeongwol-swordsman', 916, 470],
    ['yeongwol-shield', 700, 360], ['yeongwol-shield', 836, 360],
    ['yeongwol-commander', 768, 300],
  ],
  jeonjufield: [
    ['boar', 360, 300], ['bandit', 620, 270], ['bamboo-spirit', 920, 315], ['boar', 1200, 280],
    ['jeonju-archer', 430, 455], ['jeonju-swordsman', 670, 440], ['jeonju-swordsman', 875, 440], ['jeonju-archer', 1110, 455],
    ['bandit', 300, 650], ['jeonju-spearman', 540, 650], ['jeonju-shield', 760, 620], ['jeonju-spearman', 980, 650], ['bandit', 1235, 650],
    ['boar', 410, 820], ['bamboo-spirit', 690, 805], ['jeonju-swordsman', 930, 810], ['boar', 1190, 820],
    // Append-only to preserve existing save IDs. Corrupt officials force local
    // farmers into a visibly separate sickle line instead of another tinted guard.
    ['jeonju-militia-sickle', 520, 540], ['jeonju-militia-sickle', 1040, 540],
  ],
  jeonjugate: [
    ['jeonju-shield', 545, 820], ['jeonju-shield', 768, 820], ['jeonju-shield', 991, 820],
    ['jeonju-spearman', 410, 710], ['jeonju-spearman', 610, 690], ['jeonju-spearman', 926, 690], ['jeonju-spearman', 1126, 710],
    ['jeonju-archer', 300, 610], ['jeonju-archer', 520, 585], ['jeonju-archer', 1016, 585], ['jeonju-archer', 1236, 610],
    ['jeonju-swordsman', 420, 485], ['jeonju-swordsman', 610, 470], ['jeonju-swordsman', 768, 455], ['jeonju-swordsman', 926, 470], ['jeonju-swordsman', 1116, 485],
    ['jeonju-shield', 540, 350], ['jeonju-shield', 996, 350], ['jeonju-archer', 350, 315], ['jeonju-archer', 1186, 315],
    ['jeonju-commander', 768, 300],
  ],
  jeonju: [
    ['jeonju-swordsman', 680, 790], ['jeonju-shield', 740, 790], ['jeonju-shield', 796, 790], ['jeonju-swordsman', 856, 790],
    ['jeonju-archer', 680, 680], ['jeonju-spearman', 740, 680], ['jeonju-spearman', 796, 680], ['jeonju-archer', 856, 680],
    ['jeonju-swordsman', 680, 565], ['jeonju-shield', 740, 565], ['jeonju-shield', 796, 565], ['jeonju-swordsman', 856, 565],
    ['jeonju-archer', 680, 450], ['jeonju-spearman', 740, 450], ['jeonju-spearman', 796, 450], ['jeonju-archer', 856, 450],
    ['jeonju-shield', 680, 330], ['jeonju-swordsman', 768, 330], ['jeonju-shield', 856, 330],
    ['jeonju-commander', 768, 245],
  ],
  busanjin: [
    // 남문 밖 상륙진: the arrival point stays clear while the first rank guards the breach.
    ['japanese-swordsman', 650, 900], ['japanese-swordsman', 886, 900],
    ['japanese-spearman', 700, 825], ['japanese-spearman', 836, 825],
    // 남문 안뜰 and central supply court.
    ['japanese-gunner', 620, 470], ['japanese-gunner', 916, 470],
    ['japanese-swordsman', 650, 440], ['japanese-swordsman', 886, 440],
    ['japanese-archer', 620, 330], ['japanese-archer', 916, 330],
    ['japanese-spearman', 650, 285], ['japanese-spearman', 886, 285],
    // 북문 지휘선: kept inside the open axial road, never on a roof or seawall.
    ['japanese-archer', 620, 220], ['japanese-archer', 916, 220],
    ['japanese-gunner', 650, 120], ['japanese-gunner', 886, 120],
    ['japanese-general', 768, 185],
  ],
  tangeumdae: [
    ['japanese-swordsman', 360, 800], ['japanese-spearman', 610, 780],
    ['japanese-spearman', 926, 780], ['japanese-swordsman', 1176, 800],
    ['japanese-archer', 255, 685], ['japanese-gunner', 420, 660], ['japanese-gunner', 620, 645],
    ['japanese-gunner', 916, 645], ['japanese-gunner', 1116, 660], ['japanese-archer', 1281, 685],
    ['japanese-spearman', 390, 525], ['japanese-swordsman', 590, 505], ['japanese-general', 768, 490],
    ['japanese-swordsman', 946, 505], ['japanese-spearman', 1146, 525],
    ['japanese-archer', 285, 350], ['japanese-gunner', 475, 325], ['japanese-gunner', 665, 310],
    ['japanese-gunner', 871, 310], ['japanese-gunner', 1061, 325], ['japanese-archer', 1251, 350],
  ],
  gyeongbokgate: [
    ['royal-guard', 650, 870], ['royal-guard', 886, 870], ['royal-guard', 650, 540], ['royal-guard', 886, 540],
    ['royal-guard', 650, 350], ['royal-guard', 886, 350],
    ['joseon-civilian', 540, 945], ['joseon-civilian', 690, 960], ['joseon-civilian', 846, 960], ['joseon-civilian', 996, 945],
  ],
  gyeongbokcourt: [
    ['royal-guard', 600, 630], ['royal-guard', 936, 630], ['royal-guard', 650, 560], ['royal-guard', 886, 560],
    ['royal-guard', 610, 475], ['royal-guard', 926, 475], ['royal-guard', 720, 430], ['royal-guard', 816, 430],
    ['joseon-civilian', 690, 950], ['joseon-civilian', 744, 950], ['joseon-civilian', 792, 950], ['joseon-civilian', 846, 950],
  ],
  gyeongbokinner: [
    ['royal-guard', 610, 590], ['royal-guard', 926, 590], ['royal-guard', 700, 570], ['royal-guard', 836, 570],
    ['joseon-prince', 768, 405],
    ['joseon-civilian', 690, 650], ['joseon-civilian', 744, 650], ['joseon-civilian', 792, 650], ['joseon-civilian', 846, 650],
  ],
  // The Joseon settlement road is intentionally non-hostile. Guards and
  // townspeople are authored as interactive NPCs by the scene rather than
  // combat monsters, so entering a market never starts an accidental fight.
  gaeseong: [],
  changdeokgung: [],
  hanseongmarket: [],
  hanseongsouth: [],
  suwon: [],
  chungju: [],
  andong: [],
  wonju: [
    ['wonju-bear', 440, 410], ['korean-gray-wolf', 690, 320], ['wonju-bear', 1030, 390],
    ['boar', 1230, 650], ['wonju-bear', 560, 780], ['korean-gray-wolf', 970, 760],
  ],
  gangneung: [
    ['gangneung-haetae', 470, 350], ['gangneung-haetae', 1050, 360], ['ulleung-water-deer', 700, 570],
    ['gangneung-haetae', 1180, 700], ['gangneung-haetae', 560, 820], ['wako-archer', 1010, 800],
  ],
  haeju: [
    ['haeju-crane', 480, 330], ['haeju-crane', 1080, 360], ['bandit', 720, 520],
    ['wako-raider', 960, 570], ['haeju-crane', 580, 800], ['bandit', 1120, 780],
  ],
  geoje: [
    ['geoje-sea-wraith', 470, 310], ['wako-archer', 1050, 330], ['geoje-sea-wraith', 620, 520],
    ['geoje-sea-wraith', 930, 560], ['wako-raider', 520, 790], ['geoje-sea-wraith', 1040, 800],
  ],
  jurchenvillage: [
    ['manchu-chieftain', 768, 455],
    ['manchu-captain', 590, 535], ['manchu-captain', 946, 535],
    ['manchu-archer', 455, 650], ['manchu-archer', 1081, 650],
    ['manchu-lancer', 520, 805], ['manchu-lancer', 1016, 805],
    ['manchu-cavalry', 600, 705], ['manchu-cavalry', 936, 705],
  ],
  changbaihunt: [
    ['ulleung-water-deer', 470, 275], ['ulleung-water-deer', 760, 250], ['ulleung-water-deer', 1060, 290],
    ['ulleung-hare', 560, 440], ['ulleung-hare', 970, 430],
    ['boar', 430, 625], ['boar', 760, 600], ['boar', 1100, 630],
    ['ulleung-water-deer', 590, 800], ['ulleung-hare', 925, 805],
  ],
  baeksanvillage: [
    ['manchu-lancer', 520, 760], ['manchu-lancer', 1016, 760],
    ['manchu-archer', 455, 625], ['manchu-archer', 1081, 625],
    ['manchu-cavalry', 600, 520], ['manchu-cavalry', 936, 520],
    ['manchu-captain', 768, 390],
  ],
  songhuahunt: [
    ['ulleung-water-deer', 450, 265], ['ulleung-water-deer', 760, 250], ['ulleung-water-deer', 1080, 275],
    ['ulleung-hare', 560, 430], ['ulleung-hare', 975, 420],
    ['boar', 430, 610], ['boar', 760, 585], ['boar', 1100, 615],
    ['ulleung-water-deer', 590, 790], ['ulleung-water-deer', 940, 800],
    ['korean-gray-wolf', 520, 520], ['korean-gray-wolf', 1015, 520],
  ],
  songhuavillage: [
    ['manchu-lancer', 510, 765], ['manchu-lancer', 1026, 765],
    ['manchu-archer', 450, 620], ['manchu-archer', 1086, 620],
    ['manchu-cavalry', 580, 505], ['manchu-cavalry', 768, 475], ['manchu-cavalry', 956, 505],
    ['manchu-captain', 768, 350],
  ],
  blackpinehunt: [
    ['ulleung-water-deer', 450, 270], ['ulleung-water-deer', 760, 250], ['ulleung-water-deer', 1080, 275],
    ['ulleung-hare', 560, 435], ['ulleung-hare', 975, 425],
    ['boar', 420, 620], ['boar', 650, 590], ['boar', 890, 590], ['boar', 1120, 620],
    ['ulleung-sangun', 768, 790],
    ['korean-gray-wolf', 520, 485], ['korean-gray-wolf', 1015, 485],
  ],
  heuksuvillage: [
    ['manchu-lancer', 500, 780], ['manchu-lancer', 1036, 780],
    ['manchu-archer', 440, 650], ['manchu-archer', 1096, 650],
    ['manchu-cavalry', 550, 520], ['manchu-cavalry', 768, 485], ['manchu-cavalry', 986, 520],
    ['manchu-captain', 610, 380], ['manchu-captain', 926, 380],
    ['manchu-chieftain', 768, 285],
  ],
  manchufrontier: [
    // 압록 이북인 화면 위쪽 여진 선봉 진영. 하진은 북쪽 후열에서 남하한다.
    ['manchu-cavalry', 330, 245], ['manchu-archer', 530, 225], ['manchu-captain', 768, 235], ['manchu-archer', 1006, 225], ['manchu-cavalry', 1206, 245],
    ['manchu-lancer', 390, 410], ['manchu-archer', 565, 385], ['manchu-lancer', 690, 410], ['manchu-lancer', 846, 410], ['manchu-archer', 971, 385], ['manchu-lancer', 1146, 410],
    // 남쪽 조선 국경 방어진. 환도 전열, 장창 중열, 궁수와 지휘부가 분리된다.
    ['joseon-border-swordsman', 390, 565], ['joseon-border-spearman', 540, 555], ['joseon-border-swordsman', 690, 565],
    ['joseon-border-swordsman', 846, 565], ['joseon-border-spearman', 996, 555], ['joseon-border-swordsman', 1146, 565],
    ['joseon-border-archer', 410, 710], ['joseon-border-spearman', 610, 690], ['joseon-border-commander', 768, 725],
    ['joseon-border-spearman', 926, 690], ['joseon-border-archer', 1126, 710],
    // 남쪽 성문 뒤로 달아나는 백성. 전선 함락 임무에서는 여진군이 이들을 추격한다.
    ['joseon-civilian', 420, 875], ['joseon-civilian', 610, 845], ['joseon-civilian', 768, 895],
    ['joseon-civilian', 926, 845], ['joseon-civilian', 1116, 875],
    // 초반 각궁 사냥을 위한 약한 짐승은 전선 양쪽 숲 가장자리에만 남긴다.
    ['boar', 255, 485], ['boar', 1281, 485],
  ],
  pyongyangouter: [
    ['joseon-border-archer', 650, 250], ['joseon-border-archer', 886, 250],
    ['joseon-border-swordsman', 700, 340], ['joseon-border-swordsman', 836, 340],
    ['joseon-border-spearman', 740, 430], ['joseon-border-spearman', 796, 430],
    ['joseon-border-swordsman', 740, 570], ['joseon-border-swordsman', 796, 570],
    ['joseon-border-archer', 640, 650], ['joseon-border-archer', 896, 650],
    ['joseon-border-spearman', 680, 720], ['joseon-border-spearman', 856, 720],
    ['joseon-border-archer', 650, 790], ['joseon-border-archer', 886, 790],
    ['joseon-border-commander', 768, 870],
  ],
  pyongyanggate: [
    ['joseon-border-swordsman', 640, 500], ['joseon-border-swordsman', 896, 500],
    ['joseon-border-spearman', 700, 550], ['joseon-border-spearman', 836, 550],
    ['joseon-border-archer', 620, 600], ['joseon-border-archer', 916, 600],
    ['royal-guard', 690, 650], ['royal-guard', 846, 650],
    ['joseon-border-spearman', 640, 700], ['joseon-border-spearman', 896, 700],
    ['joseon-border-archer', 700, 745], ['joseon-border-archer', 836, 745],
    ['royal-guard', 610, 710], ['royal-guard', 926, 710],
    ['joseon-border-archer', 640, 790], ['joseon-border-archer', 896, 790],
    ['joseon-border-commander', 768, 820],
  ],
  pyongyanginner: [
    ['joseon-border-swordsman', 600, 300], ['joseon-border-swordsman', 936, 300],
    ['joseon-border-spearman', 690, 350], ['joseon-border-spearman', 846, 350],
    ['joseon-border-archer', 600, 390], ['joseon-border-archer', 936, 390],
    ['royal-guard', 620, 535], ['royal-guard', 916, 535],
    ['joseon-border-archer', 600, 575], ['joseon-border-archer', 936, 575],
    ['joseon-border-spearman', 700, 620], ['joseon-border-spearman', 836, 620],
    ['royal-guard', 640, 680], ['royal-guard', 896, 680],
    ['joseon-border-archer', 740, 720], ['joseon-border-archer', 796, 720],
    ['joseon-border-commander', 768, 825],
  ],
  namhansanseong: [
    // 제1선: 북문 아래 산성로. 플레이어가 남쪽에서 진입해 먼저 마주친다.
    ['joseon-border-spearman', 630, 840], ['joseon-border-spearman', 710, 825],
    ['joseon-border-spearman', 826, 825], ['joseon-border-spearman', 906, 840],
    ['joseon-border-archer', 670, 755], ['joseon-border-archer', 866, 755],
    ['joseon-border-commander', 768, 785],
    // 제2선: 수어장대 아래 내성 방어진.
    ['royal-guard', 650, 620], ['royal-guard', 730, 600],
    ['royal-guard', 806, 600], ['royal-guard', 886, 620],
    ['joseon-border-spearman', 690, 535], ['joseon-border-spearman', 846, 535],
    ['joseon-border-archer', 630, 500], ['joseon-border-archer', 906, 500],
    ['joseon-border-commander', 768, 555],
    // 제3선: 행궁 최종 방어. 왕자와 내금위가 마지막 퇴로를 지킨다.
    ['royal-guard', 630, 365], ['royal-guard', 700, 350],
    ['royal-guard', 836, 350], ['royal-guard', 906, 365],
    ['joseon-border-archer', 665, 290], ['joseon-border-archer', 871, 290],
    ['joseon-border-commander', 710, 255], ['joseon-border-commander', 826, 255],
    ['joseon-prince', 768, 305],
  ],
  ganghwado: [
    // 제1선: 갑곶나루 상륙 저지선.
    ['joseon-border-spearman', 630, 840], ['joseon-border-spearman', 710, 825],
    ['joseon-border-spearman', 826, 825], ['joseon-border-spearman', 906, 840],
    ['joseon-border-archer', 670, 755], ['joseon-border-archer', 866, 755],
    ['joseon-border-commander', 768, 785],
    // 제2선: 강화산성 남문과 옹성.
    ['joseon-border-swordsman', 650, 625], ['joseon-border-swordsman', 730, 605],
    ['joseon-border-spearman', 806, 605], ['joseon-border-spearman', 886, 625],
    ['joseon-border-archer', 680, 525], ['joseon-border-archer', 856, 525],
    ['royal-guard', 720, 565], ['royal-guard', 816, 565],
    ['joseon-border-commander', 768, 500],
    // 제3선: 고려궁지 행궁과 왕실 비상 선착장.
    ['royal-guard', 630, 370], ['royal-guard', 700, 350],
    ['royal-guard', 836, 350], ['royal-guard', 906, 370],
    ['joseon-border-archer', 665, 290], ['joseon-border-archer', 871, 290],
    ['joseon-border-commander', 710, 255], ['joseon-border-commander', 826, 255],
    ['joseon-prince', 768, 305],
  ],
  minepass: [
    ['mine-golem', 430, 345], ['mine-golem', 720, 325], ['mine-golem', 1040, 390],
    ['mine-golem', 560, 630], ['mine-golem', 900, 645], ['mine-golem', 1200, 580],
    ['bandit', 350, 790], ['bandit', 1160, 780],
  ],
  moonfield: [
    ['moon-revenant', 420, 365], ['moon-revenant', 720, 320], ['moon-revenant', 1035, 385],
    ['moon-revenant', 555, 625], ['moon-revenant', 900, 640], ['moon-revenant', 1200, 590],
    ['bamboo-spirit', 500, 780], ['bamboo-spirit', 1150, 785],
  ],
  dungeon: [
    ['mine-golem', 480, 390], ['mine-golem', 760, 330], ['mine-golem', 1055, 390],
    ['mine-golem', 500, 590], ['mine-golem', 760, 650], ['mine-golem', 1035, 590],
  ],
  ulleungdo: [
    // Keep the whole squad on the open courtyard floor. The former upper row
    // overlapped the north wall and cage roofs in the authored background.
    ['ulleung-guard', 640, 625], ['ulleung-veteran', 768, 545], ['ulleung-guard', 900, 625],
    ['ulleung-guard', 520, 720], ['ulleung-captain', 768, 780], ['ulleung-veteran', 1040, 690],
  ],
  ulleungcoast: [
    ['ulleung-hare', 520, 330], ['ulleung-hare', 690, 260], ['boar', 1060, 340],
    ['ulleung-hare', 1110, 600], ['boar', 470, 720], ['boar', 1030, 745],
    ['ulleung-hare', 800, 535], ['boar', 1120, 820],
    ['ulleung-water-deer', 890, 350], ['ulleung-water-deer', 730, 735],
  ],
  ulleungmeadow: [
    ['ulleung-hare', 500, 300], ['ulleung-hare', 700, 245], ['ulleung-hare', 990, 325],
    ['ulleung-hare', 820, 690], ['ulleung-hare', 1110, 760],
    ['ulleung-water-deer', 610, 500], ['ulleung-water-deer', 920, 520],
    ['ulleung-water-deer', 1060, 680], ['ulleung-water-deer', 520, 760],
    ['ulleung-water-deer', 780, 820], ['boar', 430, 620], ['boar', 1130, 470],
  ],
  ulleunghunt: [
    ['ulleung-hare', 600, 460], ['ulleung-hare', 640, 255], ['ulleung-hare', 995, 320],
    ['ulleung-guard', 1100, 520], ['boar', 430, 720], ['boar', 1110, 700],
    ['ulleung-veteran', 980, 570], ['ulleung-guard', 1160, 690],
    ['ulleung-water-deer', 760, 570], ['ulleung-water-deer', 930, 430],
  ],
  ulleungridge: [
    ['boar', 520, 360], ['dokkaebi', 720, 290], ['ulleung-archer', 1080, 350],
    ['ulleung-veteran', 1210, 650], ['ulleung-executioner', 500, 720], ['bamboo-spirit', 920, 735],
    ['ulleung-captain', 720, 570], ['dokkaebi', 1120, 790],
    ['ulleung-sangun', 400, 510], ['ulleung-sangun', 1070, 465],
  ],
  ulleungvillage: [
    // Three broad encounter lines: outer gate, punishment yard and inner court.
    ['ulleung-guard', 560, 310], ['ulleung-veteran', 700, 310],
    ['ulleung-veteran', 836, 310], ['ulleung-archer', 850, 310],
    ['ulleung-executioner', 620, 480], ['ulleung-guard', 730, 480],
    ['ulleung-archer', 806, 480], ['ulleung-executioner', 916, 480],
    ['ulleung-veteran', 560, 650], ['ulleung-captain', 700, 650],
    ['ulleung-captain', 836, 650], ['ulleung-veteran', 976, 650],
    ['ulleung-magistrate', 768, 835],
    // 서병관이 모습을 드러내는 순간 오른쪽 선착장에서 세 줄로 상륙한다.
    ['wako-raider', 1080, 250], ['wako-raider', 1125, 250], ['wako-archer', 1180, 250],
    ['wako-raider', 1260, 250], ['wako-raider', 820, 430], ['wako-archer', 900, 430],
    ['wako-raider', 1200, 430], ['wako-raider', 1260, 430], ['wako-archer', 820, 500],
    ['wako-raider', 900, 500], ['wako-raider', 1200, 500], ['wako-archer', 1260, 500],
    ['wako-raider', 820, 570], ['wako-raider', 900, 570], ['wako-archer', 1180, 570],
    ['wako-captain', 1260, 570], ['wako-captain', 820, 620], ['wako-captain', 1260, 620],
  ],
  // 별도 이야기 모드인 오사카 무당편은 기존 월드 몬스터 인덱스를
  // 흔들지 않도록 마지막에 등록한다.
  osaka: [
    ['osaka-overseer', 520, 770], ['osaka-overseer', 1016, 770],
    ['osaka-ronin', 420, 600], ['osaka-ronin', 768, 630], ['osaka-ronin', 1116, 600],
    ['osaka-gunner', 500, 430], ['osaka-gunner', 1036, 430],
    ['osaka-overseer', 650, 300], ['osaka-ronin', 768, 270], ['osaka-overseer', 886, 300],
  ],
  settsuvillage: [
    ['japanese-swordsman', 520, 780], ['japanese-spearman', 1016, 780],
    ['japanese-sika-deer', 430, 675], ['japanese-sika-deer', 1040, 720],
    ['japanese-archer', 590, 600], ['japanese-archer', 946, 600],
    ['japanese-wild-boar', 500, 480], ['japanese-wild-boar', 1036, 480],
    ['japanese-swordsman', 620, 380], ['japanese-spearman', 916, 380],
    ['japanese-general', 768, 260],
  ],
  yamazakihunt: [
    ['japanese-sika-deer', 350, 775], ['japanese-sika-deer', 1186, 775],
    ['japanese-wild-boar', 500, 675], ['japanese-wild-boar', 1036, 675],
    ['japanese-sika-deer', 340, 525], ['japanese-sika-deer', 1196, 525],
    ['japanese-archer', 540, 460], ['japanese-archer', 996, 460],
    ['japanese-wild-boar', 420, 325], ['japanese-wild-boar', 1116, 325],
    ['japanese-sika-deer', 620, 260], ['japanese-sika-deer', 916, 260],
  ],
  osakacastle: [
    ['japanese-swordsman', 560, 790], ['japanese-spearman', 680, 770],
    ['japanese-spearman', 856, 770], ['japanese-swordsman', 976, 790],
    ['japanese-archer', 540, 645], ['japanese-gunner', 660, 630],
    ['japanese-gunner', 876, 630], ['japanese-archer', 996, 645],
    ['japanese-swordsman', 560, 500], ['japanese-spearman', 680, 490],
    ['japanese-spearman', 856, 490], ['japanese-swordsman', 976, 500],
    ['japanese-archer', 560, 360], ['japanese-gunner', 680, 345],
    ['japanese-gunner', 856, 345], ['japanese-archer', 976, 360],
    ['japanese-general', 768, 270],
  ],
  shogunkeep: [
    ['japanese-spearman', 650, 820], ['japanese-spearman', 886, 820],
    ['japanese-swordsman', 560, 700], ['japanese-swordsman', 976, 700],
    ['japanese-archer', 520, 575], ['japanese-gunner', 650, 550],
    ['japanese-gunner', 886, 550], ['japanese-archer', 1016, 575],
    ['japanese-spearman', 560, 430], ['japanese-spearman', 976, 430],
    ['japanese-swordsman', 650, 350], ['japanese-swordsman', 886, 350],
    ['japanese-general', 650, 275], ['japanese-general', 886, 275],
    ['japanese-shogun', 768, 245],
  ],
  sakaicity: [
    ['japanese-swordsman', 560, 805], ['japanese-spearman', 976, 805],
    ['japanese-archer', 610, 690], ['japanese-gunner', 926, 690],
    ['japanese-spearman', 610, 555], ['japanese-swordsman', 926, 555],
    ['japanese-gunner', 620, 430], ['japanese-archer', 916, 430],
    ['japanese-swordsman', 675, 315], ['japanese-spearman', 861, 315],
    ['japanese-general', 768, 245],
  ],
  izumihunt: [
    ['japanese-sika-deer', 455, 815], ['japanese-sika-deer', 1081, 815],
    ['japanese-wild-boar', 520, 700], ['japanese-wild-boar', 1016, 700],
    ['japanese-sika-deer', 440, 565], ['japanese-sika-deer', 1096, 565],
    ['japanese-archer', 610, 500], ['japanese-archer', 926, 500],
    ['japanese-wild-boar', 525, 350], ['japanese-wild-boar', 1011, 350],
    ['japanese-swordsman', 680, 285], ['japanese-spearman', 856, 285],
  ],
  awajicoast: [
    ['japanese-sika-deer', 480, 820], ['japanese-wild-boar', 1056, 820],
    ['japanese-swordsman', 585, 710], ['japanese-spearman', 951, 710],
    ['japanese-archer', 520, 575], ['japanese-gunner', 1016, 575],
    ['japanese-wild-boar', 480, 430], ['japanese-sika-deer', 1056, 430],
    ['japanese-swordsman', 620, 335], ['japanese-spearman', 916, 335],
    ['japanese-gunner', 700, 255], ['japanese-archer', 836, 255],
  ],
  ikiport: [
    ['japanese-swordsman', 555, 805], ['japanese-spearman', 981, 805],
    ['japanese-archer', 625, 690], ['japanese-gunner', 911, 690],
    ['japanese-spearman', 540, 555], ['japanese-swordsman', 996, 555],
    ['japanese-gunner', 620, 430], ['japanese-archer', 916, 430],
    ['japanese-swordsman', 675, 315], ['japanese-spearman', 861, 315],
    ['japanese-general', 768, 245],
  ],
  tsushimahunt: [
    ['japanese-sika-deer', 455, 820], ['japanese-sika-deer', 1081, 820],
    ['japanese-wild-boar', 510, 700], ['japanese-wild-boar', 950, 700],
    ['japanese-sika-deer', 450, 565], ['japanese-sika-deer', 1086, 565],
    ['japanese-archer', 610, 505], ['japanese-archer', 926, 505],
    ['japanese-wild-boar', 515, 355], ['japanese-wild-boar', 1021, 355],
    ['japanese-swordsman', 680, 285], ['japanese-spearman', 856, 285],
  ],
  izuhara: [
    ['japanese-swordsman', 540, 820], ['japanese-spearman', 660, 805],
    ['japanese-spearman', 876, 805], ['japanese-swordsman', 996, 820],
    ['japanese-archer', 560, 690], ['japanese-gunner', 680, 675],
    ['japanese-gunner', 856, 675], ['japanese-archer', 976, 690],
    ['japanese-swordsman', 565, 545], ['japanese-spearman', 680, 530],
    ['japanese-spearman', 856, 530], ['japanese-swordsman', 971, 545],
    ['japanese-archer', 620, 420], ['japanese-gunner', 916, 420],
    ['japanese-general', 768, 385],
  ],
  ...EPISODE2_REGION_SPAWNS,
};

const ULLEUNG_GUARD_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-guard', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain',
]);
const YEONGWOL_SOLDIER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'yeongwol-swordsman', 'yeongwol-spearman', 'yeongwol-archer', 'yeongwol-shield', 'yeongwol-commander',
]);
const JEONJU_SOLDIER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'jeonju-swordsman', 'jeonju-spearman', 'jeonju-archer', 'jeonju-shield', 'jeonju-commander',
  'jeonju-militia-sickle',
]);
const FRONTIER_JURCHEN_KINDS: ReadonlySet<MonsterKind> = new Set([
  'manchu-lancer', 'manchu-archer', 'manchu-cavalry', 'manchu-captain', 'manchu-chieftain',
]);
const FRONTIER_JOSEON_KINDS: ReadonlySet<MonsterKind> = new Set([
  'joseon-border-swordsman', 'joseon-border-spearman', 'joseon-border-archer', 'joseon-border-commander',
]);
const WAKO_KINDS: ReadonlySet<MonsterKind> = new Set(['wako-raider', 'wako-archer', 'wako-captain']);
const JAPANESE_KINDS: ReadonlySet<MonsterKind> = new Set([
  'japanese-swordsman', 'japanese-spearman', 'japanese-archer', 'japanese-gunner', 'japanese-general', 'japanese-shogun',
]);
const CAMPAIGN_SOLDIER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'osaka-gunner',
  'japanese-swordsman', 'japanese-spearman', 'japanese-archer', 'japanese-gunner', 'japanese-general', 'japanese-shogun',
  'manchu-lancer', 'manchu-archer', 'manchu-cavalry', 'manchu-captain', 'manchu-chieftain',
  'joseon-border-swordsman', 'joseon-border-spearman', 'joseon-border-archer', 'joseon-border-commander',
  'royal-guard', 'joseon-prince',
]);
const RANGED_SOLDIER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'osaka-gunner', 'ulleung-archer', 'yeongwol-archer', 'jeonju-archer', 'wako-archer',
  'japanese-archer', 'japanese-gunner', 'manchu-archer', 'joseon-border-archer',
]);
const SPEARMAN_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-veteran', 'yeongwol-spearman', 'jeonju-spearman', 'japanese-spearman',
  'manchu-lancer', 'joseon-border-spearman',
]);
const LEADER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-captain', 'wako-captain', 'yeongwol-commander', 'jeonju-commander',
  'japanese-general', 'japanese-shogun', 'manchu-captain', 'manchu-chieftain',
  'joseon-border-commander', 'joseon-prince',
]);
const TIMID_ANIMAL_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-hare', 'ulleung-water-deer', 'japanese-sika-deer', 'haeju-crane', 'episode2-red-fox',
]);
const CHARGER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'boar', 'japanese-wild-boar', 'ulleung-sangun', 'korean-gray-wolf', 'manchu-cavalry', 'wonju-bear',
  'episode2-mountain-leopard',
]);
const SHIELD_FORMATION_KINDS: ReadonlySet<MonsterKind> = new Set([
  'yeongwol-shield', 'jeonju-shield',
]);

const isUlleungGuard = (kind: MonsterKind): boolean => ULLEUNG_GUARD_KINDS.has(kind);
const isYeongwolSoldier = (kind: MonsterKind): boolean => YEONGWOL_SOLDIER_KINDS.has(kind);
const isJeonjuSoldier = (kind: MonsterKind): boolean => JEONJU_SOLDIER_KINDS.has(kind);
const isFrontierJurchen = (kind: MonsterKind): boolean => FRONTIER_JURCHEN_KINDS.has(kind);
const isFrontierJoseon = (kind: MonsterKind): boolean => FRONTIER_JOSEON_KINDS.has(kind);
const isJoseonCivilian = (kind: MonsterKind): boolean => kind === 'joseon-civilian';
const isWako = (kind: MonsterKind): boolean => WAKO_KINDS.has(kind);
const isJapaneseSoldier = (kind: MonsterKind): boolean => JAPANESE_KINDS.has(kind);
const isSpearman = (kind: MonsterKind): boolean => SPEARMAN_KINDS.has(kind);
const isLeader = (kind: MonsterKind): boolean => LEADER_KINDS.has(kind);
const isShieldFormation = (kind: MonsterKind): boolean => SHIELD_FORMATION_KINDS.has(kind);

const JAPAN_CAMPAIGN_SCALE: Partial<Record<JapanRegionId, {
  hp: number;
  damage: number;
  levelPenalty: number;
}>> = {
  settsuvillage: { hp: 0.5, damage: 0.45, levelPenalty: 8 },
  yamazakihunt: { hp: 0.58, damage: 0.46, levelPenalty: 7 },
  osakacastle: { hp: 0.72, damage: 0.62, levelPenalty: 4 },
  shogunkeep: { hp: 0.88, damage: 0.76, levelPenalty: 1 },
  sakaicity: { hp: 0.7, damage: 0.62, levelPenalty: 4 },
  izumihunt: { hp: 0.66, damage: 0.58, levelPenalty: 5 },
  awajicoast: { hp: 0.72, damage: 0.64, levelPenalty: 4 },
  ikiport: { hp: 0.76, damage: 0.67, levelPenalty: 3 },
  tsushimahunt: { hp: 0.8, damage: 0.7, levelPenalty: 2 },
  izuhara: { hp: 0.86, damage: 0.75, levelPenalty: 1 },
};
const JURCHEN_CAMPAIGN_SCALE: Record<JurchenExpansionRegionId, {
  hp: number;
  damage: number;
  levelPenalty: number;
}> = {
  changbaihunt: { hp: 0.72, damage: 0.62, levelPenalty: 1 },
  baeksanvillage: { hp: 0.36, damage: 0.3, levelPenalty: 12 },
  songhuahunt: { hp: 0.82, damage: 0.7, levelPenalty: 0 },
  songhuavillage: { hp: 0.43, damage: 0.36, levelPenalty: 11 },
  blackpinehunt: { hp: 0.88, damage: 0.76, levelPenalty: 0 },
  heuksuvillage: { hp: 0.5, damage: 0.42, levelPenalty: 9 },
};
const isJurchenExpansionRegion = (region: RegionId): region is JurchenExpansionRegionId =>
  (JURCHEN_EXPANSION_REGION_IDS as readonly RegionId[]).includes(region);
const isGovernmentSoldier = (kind: MonsterKind): boolean => isUlleungGuard(kind) || isYeongwolSoldier(kind)
  || isJeonjuSoldier(kind) || isFrontierJoseon(kind) || kind === 'royal-guard' || kind === 'joseon-prince';
const isGwanghaeCoupStageRegion = (region: RegionId): region is GwanghaeCoupStageRegion =>
  (GWANGHAE_COUP_STAGE_REGIONS as readonly RegionId[]).includes(region);
const isGwanghaePathTargetMonster = (
  path: GwanghaeCampaignPath,
  monster: Pick<MonsterState, 'region' | 'kind'>,
): boolean => path === 'coup'
  ? isGwanghaeCoupStageRegion(monster.region) && monster.kind === 'royal-guard'
  : monster.region === 'jeonjufield' && isJeonjuSoldier(monster.kind);
const isHajinInvasionTarget = (kind: MonsterKind): boolean => isGovernmentSoldier(kind) || isJoseonCivilian(kind);
const PYONGYANG_REGIONS: readonly PyongyangRegionId[] = ['pyongyangouter', 'pyongyanggate', 'pyongyanginner'];
const isPyongyangRegion = (region: RegionId): region is PyongyangRegionId =>
  PYONGYANG_REGIONS.includes(region as PyongyangRegionId);
const ROYAL_REFUGE_REGIONS: readonly RoyalRefugeRouteId[] = ['namhansanseong', 'ganghwado'];
const isRoyalRefugeRegion = (region: RegionId): region is RoyalRefugeRouteId =>
  ROYAL_REFUGE_REGIONS.includes(region as RoyalRefugeRouteId);
const HAJIN_FIELD_ARMY_CAP = 25;
const HAJIN_REINFORCEMENT_WAVE = 10;
const GWANGHAE_FIELD_ARMY_CAP = 20;
const GWANGHAE_REINFORCEMENT_WAVE = 10;
const GWANGHAE_ENEMY_REINFORCEMENT_DELAY = 3.2;
const GWANGHAE_ENEMY_RESERVE: Record<GwanghaeCampaignPath, number> = {
  coup: 12,
  suppression: 16,
};
const isFormationSoldier = (kind: MonsterKind): boolean => isGovernmentSoldier(kind) || isWako(kind) || CAMPAIGN_SOLDIER_KINDS.has(kind);
const isRangedSoldier = (kind: MonsterKind): boolean => RANGED_SOLDIER_KINDS.has(kind);
const isTimidAnimal = (kind: MonsterKind): boolean => TIMID_ANIMAL_KINDS.has(kind);
const tacticalRoleFor = (kind: MonsterKind): MonsterTacticalRole => {
  if (isTimidAnimal(kind)) return 'timid';
  if (CHARGER_KINDS.has(kind)) return 'charger';
  if (isLeader(kind)) return 'leader';
  if (isRangedSoldier(kind) || kind === 'bandit' || kind === 'moon-revenant'
    || kind === 'geoje-sea-wraith' || kind === 'episode2-marsh-wisp') return 'ranged';
  if (isSpearman(kind)) return 'spearman';
  if (kind === 'mine-golem' || kind === 'ulleung-executioner' || kind === 'episode2-stone-dokkaebi') return 'brute';
  return 'melee';
};
const BEAST_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-hare', 'ulleung-water-deer', 'ulleung-sangun', 'boar',
  'japanese-sika-deer', 'japanese-wild-boar', 'korean-gray-wolf',
  'wonju-bear', 'gangneung-haetae', 'haeju-crane',
  'episode2-red-fox', 'episode2-mountain-leopard',
]);
const isBeast = (kind: MonsterKind): boolean => BEAST_KINDS.has(kind);
const JAPAN_REPEATABLE_HUNT_REGIONS: ReadonlySet<JapanRegionId> = new Set([
  'yamazakihunt',
  'izumihunt',
  'awajicoast',
  'tsushimahunt',
]);
const isJapanHuntPrey = (kind: MonsterKind): boolean =>
  kind === 'japanese-sika-deer' || kind === 'japanese-wild-boar';
const JAPAN_HUNT_RESPAWN_SECONDS = 18;
const JURCHEN_HUNT_RESPAWN_SECONDS = 18;
const JURCHEN_TRIBE_ARMY_REWARD = 250;
const jurchenCampaignMonsterName = (
  region: JurchenExpansionRegionId,
  kind: MonsterKind,
  fallback: string,
): string => {
  if (kind === 'ulleung-hare') return '장백 설토끼';
  if (kind === 'ulleung-water-deer') return region === 'songhuahunt' ? '송화강 물사슴' : '장백산 꽃사슴';
  if (kind === 'boar') return region === 'blackpinehunt' ? '흑송령 큰멧돼지' : '장백 멧돼지';
  if (kind === 'korean-gray-wolf') {
    return region === 'songhuahunt' ? '송화강 회색늑대' : '흑송령 사냥늑대';
  }
  if (kind === 'ulleung-sangun') return '흑송령 산군';
  if (kind === 'manchu-chieftain') return '흑수부 대족장 후르칸';
  if (kind === 'manchu-captain') {
    if (region === 'baeksanvillage') return '백산부 족장 아루';
    if (region === 'songhuavillage') return '송화부 족장 무게';
    if (region === 'heuksuvillage') return '흑수부 백인대장';
  }
  return fallback;
};
const emptyElementalState = (): MonsterState['elemental'] => ({
  burnSeconds: 0,
  burnTick: 0,
  burnDamage: 0,
  frostSeconds: 0,
  shockSeconds: 0,
  poisonSeconds: 0,
  poisonTick: 0,
  poisonDamage: 0,
  poisonStacks: 0,
  gustSeconds: 0,
  stoneSeconds: 0,
  shadowSeconds: 0,
});

type SavedMonsterDelta = {
  id: string;
  hp: number;
  alive: boolean;
  x?: number;
  y?: number;
  /** null means a permanent defeat; a number is the remaining respawn delay. */
  respawnIn?: number | null;
};

type SavedWorldEvent = Omit<ActiveWorldEvent, 'endsAt'> & {
  remainingSeconds: number;
};

type SavedWorldEventState = {
  active: SavedWorldEvent | null;
  nextInSeconds: number;
  cycle: number;
};

type SavedDungeonState = {
  floor: number;
  stairLocked: boolean;
  complete: boolean;
  boss: BossState | null;
};

export type SinglePlayerSnapshot = {
  version: 1;
  savedAt: number;
  origin?: PlayerOrigin;
  region: RegionId;
  player: Pick<PlayerState, 'x' | 'y' | 'hp' | 'maxHp' | 'level' | 'xp' | 'xpToNext' | 'gold' | 'potions' | 'kills' | 'facing'>;
  inventory: InventoryItem[];
  equipment: EquipmentState;
  groundDrops?: GroundDrop[];
  skillRanks: Record<SkillId, number>;
  skillPoints: number;
  attributeAllocations?: AttributeValues;
  attributePoints?: number;
  followers?: FollowerState[];
  highestBossCheckpoint: number;
  progress: {
    prisonGateOpen: boolean;
    prisonGuardsProvoked: boolean;
    governmentGuardsProvoked: boolean;
    wakoPactRevealed?: boolean;
    wakoInvasionStarted: boolean;
    ulleungVillageLiberated: boolean;
    questCompleted: boolean;
    discoveredLandmarks: LandmarkId[];
    huntKills?: Partial<Record<MonsterKind, number>>;
    craftedRecipes?: CraftRecipeId[];
    frontierOpeningDefeated?: boolean;
    jurchenCleared?: JurchenExpansionRegionId[];
    hajinSouthwardMarch?: boolean;
    hajinArmyReserve?: number;
    gwanghaeEnemyReserve?: number;
    gwanghaeEnemyInitialTotal?: number;
    factionWar?: FactionWarState;
    tangeumCleared?: boolean;
    pyongyangCleared?: PyongyangRegionId[];
    japanCleared?: JapanRegionId[];
    visitedRegions?: RegionId[];
    japanMonsters?: Array<Pick<MonsterState, 'id' | 'hp' | 'alive'>>;
    royalRefugeMonsters?: Array<Pick<MonsterState, 'id' | 'hp' | 'alive'>>;
    monsterDeltas?: SavedMonsterDelta[];
    dungeon?: SavedDungeonState | null;
    worldEvent?: SavedWorldEventState;
    treeTrainingCount?: number;
    droppedStarterWeapon?: boolean;
    droppedMartialManuals?: ItemId[];
    wakoInvasionDelaySeconds?: number;
    shogunSecondPhase?: boolean;
    royalRefuge?: RoyalRefugeCampaignState;
    story?: StoryCampaignState;
  };
};

type FieldObstacle =
  | { type: 'circle'; x: number; y: number; radius: number }
  | { type: 'box'; x: number; y: number; width: number; height: number };

const PLAYER_COLLISION_RADIUS = 20;

const ULLEUNG_PASSAGE_OBSTACLES: readonly FieldObstacle[] = ULLEUNG_PASSAGES.flatMap((passage) => {
  const segmentCount = 8;
  const segmentHeight = passage.height / segmentCount;
  const islandLeft = REGION_ORIGINS.ulleungcoast.x;
  const islandRight = islandLeft + MAP_WIDTH;
  return Array.from({ length: segmentCount }, (_, index): FieldObstacle[] => {
    const y = passage.y + (index + 0.5) * segmentHeight;
    const center = ulleungRoadCenterAtY(y);
    // Collision boxes stop at 20px outside the legal player-centre corridor,
    // accounting for the player's radius without squeezing the visible road.
    const physicalHalfWidth = passage.halfWidth + 20;
    const leftWidth = Math.max(0, center - physicalHalfWidth - islandLeft);
    const rightWidth = Math.max(0, islandRight - (center + physicalHalfWidth));
    return [
      {
        type: 'box',
        x: islandLeft + leftWidth / 2,
        y,
        width: leftWidth,
        height: segmentHeight + 6,
      },
      {
        type: 'box',
        x: center + physicalHalfWidth + rightWidth / 2,
        y,
        width: rightWidth,
        height: segmentHeight + 6,
      },
    ];
  }).flat();
});

const ULLEUNG_EDGE_TREE_OBSTACLES: readonly FieldObstacle[] = ULLEUNG_REGION_IDS.flatMap((region) => {
  const origin = REGION_ORIGINS[region];
  return ULLEUNG_EDGE_TREE_SITES.map((site): FieldObstacle => ({
    type: 'circle',
    x: origin.x + site.x,
    y: origin.y + site.y,
    radius: site.rootRadius,
  }));
});

const VILLAGE_FARM_OBSTACLES: readonly FieldObstacle[] = VILLAGE_FARM_PLOTS.map((plot) => ({
  type: 'box',
  x: plot.x,
  // Farm plot origins sit on the visible southern soil edge.
  y: VILLAGE_TOP + plot.y - plot.height / 2,
  width: plot.width,
  height: plot.height,
}));

const FIELD_OBSTACLES: readonly FieldObstacle[] = [
  ...betaRoadsidePropWorldObstacles(),
  // Runtime props.
  { type: 'circle', x: 1120, y: 690, radius: 70 },
  { type: 'circle', x: 315, y: 735, radius: 72 },
  // Painted terrain silhouettes: water, temple steps, rock shelves and large tree roots.
  { type: 'box', x: 365, y: 270, width: 300, height: 80 },
  { type: 'box', x: 1115, y: 270, width: 178, height: 76 },
  { type: 'circle', x: 700, y: 250, radius: 45 },
  { type: 'circle', x: 258, y: 405, radius: 54 },
  { type: 'circle', x: 1285, y: 390, radius: 58 },
  { type: 'circle', x: 1290, y: 605, radius: 70 },
  { type: 'circle', x: 1000, y: 840, radius: 60 },
  { type: 'circle', x: 250, y: 825, radius: 58 },
  // Central-world raster landmarks. These conservative ground-contact
  // footprints stop actors at the visible foundations and roots without
  // closing the broad authored roads between the three hunting regions.
  { type: 'box', x: REGION_ORIGINS.mistwood.x + 1310, y: REGION_ORIGINS.mistwood.y + 250, width: 360, height: 200 },
  { type: 'box', x: REGION_ORIGINS.minepass.x + 1290, y: REGION_ORIGINS.minepass.y + 220, width: 410, height: 240 },
  { type: 'circle', x: REGION_ORIGINS.moonfield.x + 300, y: REGION_ORIGINS.moonfield.y + 805, radius: 92 },
  // Every connector follows the road painted into its two neighboring maps.
  // Segmented shoulders let the ridge-to-prison route bend left naturally
  // without opening a straight shortcut through sea, trees or cliff faces.
  ...ULLEUNG_PASSAGE_OBSTACLES,
  // The animated edge trees use the same shared local sites as the renderer.
  // Only their roots are solid; the central island road remains fully open.
  ...ULLEUNG_EDGE_TREE_OBSTACLES,
  // Ulleung coastal forest: cliff, stream bank and the separate stone shrine.
  // The broad center road and the timber bridge remain traversable.
  { type: 'box', x: REGION_ORIGINS.ulleungcoast.x + 185, y: REGION_ORIGINS.ulleungcoast.y + 410, width: 250, height: 650 },
  { type: 'circle', x: REGION_ORIGINS.ulleungcoast.x + 350, y: REGION_ORIGINS.ulleungcoast.y + 285, radius: 96 },
  { type: 'circle', x: REGION_ORIGINS.ulleungcoast.x + 345, y: REGION_ORIGINS.ulleungcoast.y + 530, radius: 82 },
  { type: 'circle', x: REGION_ORIGINS.ulleungcoast.x + 345, y: REGION_ORIGINS.ulleungcoast.y + 890, radius: 92 },
  { type: 'box', x: REGION_ORIGINS.ulleungcoast.x + 1345, y: REGION_ORIGINS.ulleungcoast.y + 450, width: 250, height: 690 },
  { type: 'circle', x: REGION_ORIGINS.ulleungcoast.x + 1160, y: REGION_ORIGINS.ulleungcoast.y + 390, radius: 72 },
  { type: 'circle', x: REGION_ORIGINS.ulleungcoast.x + 1370, y: REGION_ORIGINS.ulleungcoast.y + 885, radius: 94 },
  // Ulleung silvergrass meadow: black-rock shore and stream shoulders stay
  // solid while the broad central hunting clearing and north-south road remain open.
  { type: 'box', x: REGION_ORIGINS.ulleungmeadow.x + 150, y: REGION_ORIGINS.ulleungmeadow.y + 510, width: 300, height: 1020 },
  { type: 'box', x: REGION_ORIGINS.ulleungmeadow.x + 1386, y: REGION_ORIGINS.ulleungmeadow.y + 510, width: 300, height: 1020 },
  { type: 'circle', x: REGION_ORIGINS.ulleungmeadow.x + 390, y: REGION_ORIGINS.ulleungmeadow.y + 175, radius: 90 },
  { type: 'circle', x: REGION_ORIGINS.ulleungmeadow.x + 1140, y: REGION_ORIGINS.ulleungmeadow.y + 180, radius: 92 },
  { type: 'circle', x: REGION_ORIGINS.ulleungmeadow.x + 360, y: REGION_ORIGINS.ulleungmeadow.y + 860, radius: 86 },
  { type: 'circle', x: REGION_ORIGINS.ulleungmeadow.x + 1190, y: REGION_ORIGINS.ulleungmeadow.y + 850, radius: 88 },
  // Ulleung refugee village: six huts, the well, training pine and camp prop.
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 285, y: REGION_ORIGINS.ulleunghunt.y + 125, width: 430, height: 210 },
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 1190, y: REGION_ORIGINS.ulleunghunt.y + 130, width: 440, height: 220 },
  { type: 'circle', x: REGION_ORIGINS.ulleunghunt.x + 430, y: REGION_ORIGINS.ulleunghunt.y + 545, radius: 50 },
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 405, y: REGION_ORIGINS.ulleunghunt.y + 325, width: 270, height: 155 },
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 180, y: REGION_ORIGINS.ulleunghunt.y + 475, width: 270, height: 175 },
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 125, y: REGION_ORIGINS.ulleunghunt.y + 650, width: 245, height: 160 },
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 1230, y: REGION_ORIGINS.ulleunghunt.y + 375, width: 310, height: 190 },
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 1320, y: REGION_ORIGINS.ulleunghunt.y + 590, width: 245, height: 180 },
  { type: 'box', x: REGION_ORIGINS.ulleunghunt.x + 1080, y: REGION_ORIGINS.ulleunghunt.y + 825, width: 300, height: 175 },
  { type: 'circle', x: REGION_ORIGINS.ulleunghunt.x + 825, y: REGION_ORIGINS.ulleunghunt.y + 395, radius: 58 },
  {
    type: 'box',
    x: REGION_ORIGINS.ulleunghunt.x + ULLEUNG_REFUGEE_CAMP_LOCAL.x,
    y: REGION_ORIGINS.ulleunghunt.y + ULLEUNG_REFUGEE_CAMP_LOCAL.y,
    width: 150,
    height: 92,
  },
  // Ulleung highland ridge: rock shelves, guard shelter, tax cart and wall wings.
  { type: 'circle', x: REGION_ORIGINS.ulleungridge.x + 400, y: REGION_ORIGINS.ulleungridge.y + 120, radius: 116 },
  { type: 'circle', x: REGION_ORIGINS.ulleungridge.x + 1010, y: REGION_ORIGINS.ulleungridge.y + 105, radius: 112 },
  { type: 'circle', x: REGION_ORIGINS.ulleungridge.x + 1380, y: REGION_ORIGINS.ulleungridge.y + 215, radius: 112 },
  { type: 'circle', x: REGION_ORIGINS.ulleungridge.x + 300, y: REGION_ORIGINS.ulleungridge.y + 270, radius: 118 },
  { type: 'circle', x: REGION_ORIGINS.ulleungridge.x + 1050, y: REGION_ORIGINS.ulleungridge.y + 235, radius: 90 },
  { type: 'box', x: REGION_ORIGINS.ulleungridge.x + 150, y: REGION_ORIGINS.ulleungridge.y + 590, width: 180, height: 650 },
  { type: 'box', x: REGION_ORIGINS.ulleungridge.x + 1405, y: REGION_ORIGINS.ulleungridge.y + 610, width: 170, height: 620 },
  { type: 'box', x: REGION_ORIGINS.ulleungridge.x + 1270, y: REGION_ORIGINS.ulleungridge.y + 300, width: 330, height: 220 },
  { type: 'box', x: REGION_ORIGINS.ulleungridge.x + 1080, y: REGION_ORIGINS.ulleungridge.y + 555, width: 190, height: 120 },
  { type: 'box', x: REGION_ORIGINS.ulleungridge.x + 330, y: REGION_ORIGINS.ulleungridge.y + 965, width: 590, height: 92 },
  { type: 'box', x: REGION_ORIGINS.ulleungridge.x + 1205, y: REGION_ORIGINS.ulleungridge.y + 965, width: 470, height: 92 },
  // Ulleung prison: authored wall/cage footprints. North and south gates keep a
  // 260px-wide center corridor while every wall wing and cage remains solid.
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 400, y: REGION_ORIGINS.ulleungdo.y + 300, width: 470, height: 82 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 1130, y: REGION_ORIGINS.ulleungdo.y + 305, width: 450, height: 82 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 365, y: REGION_ORIGINS.ulleungdo.y + 470, width: 430, height: 250 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 1165, y: REGION_ORIGINS.ulleungdo.y + 470, width: 410, height: 250 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 250, y: REGION_ORIGINS.ulleungdo.y + 690, width: 270, height: 190 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 1280, y: REGION_ORIGINS.ulleungdo.y + 690, width: 230, height: 200 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 1010, y: REGION_ORIGINS.ulleungdo.y + 805, width: 220, height: 130 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 300, y: REGION_ORIGINS.ulleungdo.y + 735, width: 150, height: 105 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 405, y: REGION_ORIGINS.ulleungdo.y + 900, width: 540, height: 90 },
  { type: 'box', x: REGION_ORIGINS.ulleungdo.x + 1130, y: REGION_ORIGINS.ulleungdo.y + 900, width: 450, height: 90 },
  // Ulleung government district: the hall, palisade wings and punishment-yard props
  // are baked into one map. Collision follows their visible footprints while the
  // central gate and both combat courtyards remain open.
  // The inner hall has two solid wings and a walkable central threshold so the
  // player can physically enter the main office instead of stopping at its facade.
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 490, y: REGION_ORIGINS.ulleungvillage.y + 125, width: 370, height: 105 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 1050, y: REGION_ORIGINS.ulleungvillage.y + 125, width: 390, height: 105 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 165, y: REGION_ORIGINS.ulleungvillage.y + 470, width: 115, height: 620 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 1370, y: REGION_ORIGINS.ulleungvillage.y + 470, width: 115, height: 620 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 430, y: REGION_ORIGINS.ulleungvillage.y + 790, width: 230, height: 185 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 1106, y: REGION_ORIGINS.ulleungvillage.y + 790, width: 230, height: 185 },
  { type: 'circle', x: REGION_ORIGINS.ulleungvillage.x + 405, y: REGION_ORIGINS.ulleungvillage.y + 350, radius: 62 },
  { type: 'circle', x: REGION_ORIGINS.ulleungvillage.x + 1130, y: REGION_ORIGINS.ulleungvillage.y + 350, radius: 62 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 485, y: REGION_ORIGINS.ulleungvillage.y + 500, width: 170, height: 96 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 1040, y: REGION_ORIGINS.ulleungvillage.y + 500, width: 170, height: 96 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 960, y: REGION_ORIGINS.ulleungvillage.y + 285, width: 150, height: 105 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 1110, y: REGION_ORIGINS.ulleungvillage.y + 650, width: 155, height: 105 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 1260, y: REGION_ORIGINS.ulleungvillage.y + 740, width: 165, height: 105 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 610, y: REGION_ORIGINS.ulleungvillage.y + 790, width: 180, height: 170 },
  { type: 'box', x: REGION_ORIGINS.ulleungvillage.x + 926, y: REGION_ORIGINS.ulleungvillage.y + 790, width: 180, height: 170 },
  // Yeongwol outer training yard. Barracks and wall wings are solid, while the
  // south arrival gate, central drill lanes and north headquarters gate stay open.
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 270, y: REGION_ORIGINS.yeongwol.y + 520, width: 360, height: 300 },
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 1266, y: REGION_ORIGINS.yeongwol.y + 520, width: 360, height: 300 },
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 235, y: REGION_ORIGINS.yeongwol.y + 755, width: 390, height: 190 },
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 1301, y: REGION_ORIGINS.yeongwol.y + 755, width: 390, height: 190 },
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 395, y: REGION_ORIGINS.yeongwol.y + 165, width: 500, height: 96 },
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 1141, y: REGION_ORIGINS.yeongwol.y + 165, width: 500, height: 96 },
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 365, y: REGION_ORIGINS.yeongwol.y + 916, width: 560, height: 92 },
  { type: 'box', x: REGION_ORIGINS.yeongwol.x + 1171, y: REGION_ORIGINS.yeongwol.y + 916, width: 470, height: 92 },
  // Yeongwol command headquarters: raised main hall, side offices and southern
  // wall wings. The boss courtyard, hall stairs and return gate remain walkable.
  { type: 'box', x: REGION_ORIGINS.yeongwolhq.x + 768, y: REGION_ORIGINS.yeongwolhq.y + 195, width: 590, height: 230 },
  { type: 'box', x: REGION_ORIGINS.yeongwolhq.x + 270, y: REGION_ORIGINS.yeongwolhq.y + 430, width: 350, height: 360 },
  { type: 'box', x: REGION_ORIGINS.yeongwolhq.x + 1266, y: REGION_ORIGINS.yeongwolhq.y + 430, width: 350, height: 360 },
  { type: 'box', x: REGION_ORIGINS.yeongwolhq.x + 245, y: REGION_ORIGINS.yeongwolhq.y + 690, width: 300, height: 230 },
  { type: 'box', x: REGION_ORIGINS.yeongwolhq.x + 1220, y: REGION_ORIGINS.yeongwolhq.y + 650, width: 270, height: 220 },
  { type: 'box', x: REGION_ORIGINS.yeongwolhq.x + 390, y: REGION_ORIGINS.yeongwolhq.y + 900, width: 600, height: 100 },
  { type: 'box', x: REGION_ORIGINS.yeongwolhq.x + 1150, y: REGION_ORIGINS.yeongwolhq.y + 900, width: 460, height: 100 },
  // Wansan hunting field: wetlands and rocky groves frame several very broad
  // clearings. The east-west military road and both timber bridges stay open.
  { type: 'box', x: REGION_ORIGINS.jeonjufield.x + 160, y: REGION_ORIGINS.jeonjufield.y + 300, width: 220, height: 560 },
  { type: 'box', x: REGION_ORIGINS.jeonjufield.x + 1370, y: REGION_ORIGINS.jeonjufield.y + 360, width: 210, height: 620 },
  { type: 'circle', x: REGION_ORIGINS.jeonjufield.x + 360, y: REGION_ORIGINS.jeonjufield.y + 690, radius: 82 },
  { type: 'circle', x: REGION_ORIGINS.jeonjufield.x + 1180, y: REGION_ORIGINS.jeonjufield.y + 690, radius: 82 },
  { type: 'circle', x: REGION_ORIGINS.jeonjufield.x + 190, y: REGION_ORIGINS.jeonjufield.y + 650, radius: 78 },
  { type: 'circle', x: REGION_ORIGINS.jeonjufield.x + 890, y: REGION_ORIGINS.jeonjufield.y + 718, radius: 54 },
  { type: 'box', x: REGION_ORIGINS.jeonjufield.x + 1240, y: REGION_ORIGINS.jeonjufield.y + 865, width: 250, height: 210 },
  // Pungnammun battlefield: fortress and camp wings are solid while the center
  // road and two formation lanes remain clear from south gate to north gate.
  { type: 'box', x: REGION_ORIGINS.jeonjugate.x + 360, y: REGION_ORIGINS.jeonjugate.y + 205, width: 590, height: 155 },
  { type: 'box', x: REGION_ORIGINS.jeonjugate.x + 1180, y: REGION_ORIGINS.jeonjugate.y + 205, width: 500, height: 155 },
  { type: 'box', x: REGION_ORIGINS.jeonjugate.x + 185, y: REGION_ORIGINS.jeonjugate.y + 520, width: 270, height: 580 },
  { type: 'box', x: REGION_ORIGINS.jeonjugate.x + 1350, y: REGION_ORIGINS.jeonjugate.y + 520, width: 260, height: 590 },
  { type: 'box', x: REGION_ORIGINS.jeonjugate.x + 355, y: REGION_ORIGINS.jeonjugate.y + 945, width: 520, height: 92 },
  { type: 'box', x: REGION_ORIGINS.jeonjugate.x + 1180, y: REGION_ORIGINS.jeonjugate.y + 945, width: 470, height: 92 },
  { type: 'circle', x: REGION_ORIGINS.jeonjugate.x + 405, y: REGION_ORIGINS.jeonjugate.y + 555, radius: 58 },
  { type: 'circle', x: REGION_ORIGINS.jeonjugate.x + 1130, y: REGION_ORIGINS.jeonjugate.y + 555, radius: 58 },
  { type: 'circle', x: REGION_ORIGINS.jeonjugate.x + 390, y: REGION_ORIGINS.jeonjugate.y + 755, radius: 54 },
  { type: 'circle', x: REGION_ORIGINS.jeonjugate.x + 1145, y: REGION_ORIGINS.jeonjugate.y + 755, radius: 54 },
  // Jeonju castle town: dense roof clusters frame a central avenue and two
  // market plazas. The south gate and government courtyard stay traversable.
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 250, y: REGION_ORIGINS.jeonju.y + 760, width: 360, height: 360 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 1230, y: REGION_ORIGINS.jeonju.y + 760, width: 380, height: 360 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 390, y: REGION_ORIGINS.jeonju.y + 545, width: 460, height: 230 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 1145, y: REGION_ORIGINS.jeonju.y + 545, width: 430, height: 230 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 300, y: REGION_ORIGINS.jeonju.y + 340, width: 380, height: 220 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 1235, y: REGION_ORIGINS.jeonju.y + 340, width: 370, height: 220 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 768, y: REGION_ORIGINS.jeonju.y + 135, width: 620, height: 190 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 72, y: REGION_ORIGINS.jeonju.y + 560, width: 142, height: 790 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 1464, y: REGION_ORIGINS.jeonju.y + 560, width: 142, height: 790 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 345, y: REGION_ORIGINS.jeonju.y + 942, width: 590, height: 100 },
  { type: 'box', x: REGION_ORIGINS.jeonju.x + 1191, y: REGION_ORIGINS.jeonju.y + 942, width: 490, height: 100 },
  // Osaka outer harbour: water/dock margins, stockades, storehouses and the
  // captive tents are solid. The moonlit middle road remains one continuous
  // 320px+ passage from the southern captive camp to the northern inland gate.
  { type: 'box', x: REGION_ORIGINS.osaka.x + 125, y: REGION_ORIGINS.osaka.y + 540, width: 250, height: 920 },
  { type: 'box', x: REGION_ORIGINS.osaka.x + 1411, y: REGION_ORIGINS.osaka.y + 540, width: 250, height: 920 },
  { type: 'box', x: REGION_ORIGINS.osaka.x + 340, y: REGION_ORIGINS.osaka.y + 225, width: 520, height: 170 },
  { type: 'box', x: REGION_ORIGINS.osaka.x + 1196, y: REGION_ORIGINS.osaka.y + 225, width: 520, height: 170 },
  { type: 'box', x: REGION_ORIGINS.osaka.x + 300, y: REGION_ORIGINS.osaka.y + 850, width: 280, height: 250 },
  { type: 'box', x: REGION_ORIGINS.osaka.x + 1236, y: REGION_ORIGINS.osaka.y + 850, width: 280, height: 250 },
  // Settsu mountain village: authored huts, gardens and forest shoulders.
  // Doorstep NPCs remain visible while player bodies stop at the foundations.
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 100, y: REGION_ORIGINS.settsuvillage.y + 512, width: 200, height: 1024 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 1436, y: REGION_ORIGINS.settsuvillage.y + 512, width: 200, height: 1024 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 360, y: REGION_ORIGINS.settsuvillage.y + 235, width: 300, height: 185 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 1160, y: REGION_ORIGINS.settsuvillage.y + 235, width: 300, height: 185 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 260, y: REGION_ORIGINS.settsuvillage.y + 370, width: 320, height: 185 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 1270, y: REGION_ORIGINS.settsuvillage.y + 380, width: 330, height: 190 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 145, y: REGION_ORIGINS.settsuvillage.y + 820, width: 290, height: 300 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 1260, y: REGION_ORIGINS.settsuvillage.y + 710, width: 330, height: 255 },
  { type: 'box', x: REGION_ORIGINS.settsuvillage.x + 250, y: REGION_ORIGINS.settsuvillage.y + 585, width: 290, height: 165 },
  // Yamazaki cedar hunting forest: only the trunks, boulders and dense outer
  // understory collide; both side clearings and the wet central hunt trail stay open.
  { type: 'box', x: REGION_ORIGINS.yamazakihunt.x + 100, y: REGION_ORIGINS.yamazakihunt.y + 512, width: 200, height: 1024 },
  { type: 'box', x: REGION_ORIGINS.yamazakihunt.x + 1436, y: REGION_ORIGINS.yamazakihunt.y + 512, width: 200, height: 1024 },
  { type: 'circle', x: REGION_ORIGINS.yamazakihunt.x + 335, y: REGION_ORIGINS.yamazakihunt.y + 175, radius: 108 },
  { type: 'circle', x: REGION_ORIGINS.yamazakihunt.x + 1205, y: REGION_ORIGINS.yamazakihunt.y + 180, radius: 112 },
  { type: 'circle', x: REGION_ORIGINS.yamazakihunt.x + 245, y: REGION_ORIGINS.yamazakihunt.y + 430, radius: 96 },
  { type: 'circle', x: REGION_ORIGINS.yamazakihunt.x + 1290, y: REGION_ORIGINS.yamazakihunt.y + 425, radius: 100 },
  { type: 'circle', x: REGION_ORIGINS.yamazakihunt.x + 180, y: REGION_ORIGINS.yamazakihunt.y + 805, radius: 126 },
  { type: 'circle', x: REGION_ORIGINS.yamazakihunt.x + 1350, y: REGION_ORIGINS.yamazakihunt.y + 785, radius: 130 },
  // Osaka castle town: dense shops and warehouses frame a five-column army
  // avenue. The formation coordinates above intentionally occupy that avenue.
  { type: 'box', x: REGION_ORIGINS.osakacastle.x + 175, y: REGION_ORIGINS.osakacastle.y + 650, width: 350, height: 600 },
  { type: 'box', x: REGION_ORIGINS.osakacastle.x + 1361, y: REGION_ORIGINS.osakacastle.y + 650, width: 350, height: 600 },
  { type: 'box', x: REGION_ORIGINS.osakacastle.x + 350, y: REGION_ORIGINS.osakacastle.y + 320, width: 350, height: 360 },
  { type: 'box', x: REGION_ORIGINS.osakacastle.x + 1186, y: REGION_ORIGINS.osakacastle.y + 320, width: 350, height: 360 },
  { type: 'box', x: REGION_ORIGINS.osakacastle.x + 280, y: REGION_ORIGINS.osakacastle.y + 90, width: 560, height: 160 },
  { type: 'box', x: REGION_ORIGINS.osakacastle.x + 1256, y: REGION_ORIGINS.osakacastle.y + 90, width: 560, height: 160 },
  // Shogun keep: both fortified wall wings, side barracks and the keep terrace
  // are solid. The round duelling court and its north/south axial gates stay open.
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 140, y: REGION_ORIGINS.shogunkeep.y + 512, width: 280, height: 1024 },
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 1396, y: REGION_ORIGINS.shogunkeep.y + 512, width: 280, height: 1024 },
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 330, y: REGION_ORIGINS.shogunkeep.y + 150, width: 520, height: 210 },
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 1206, y: REGION_ORIGINS.shogunkeep.y + 150, width: 520, height: 210 },
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 280, y: REGION_ORIGINS.shogunkeep.y + 510, width: 300, height: 400 },
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 1256, y: REGION_ORIGINS.shogunkeep.y + 510, width: 300, height: 400 },
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 330, y: REGION_ORIGINS.shogunkeep.y + 820, width: 520, height: 180 },
  { type: 'box', x: REGION_ORIGINS.shogunkeep.x + 1206, y: REGION_ORIGINS.shogunkeep.y + 820, width: 520, height: 180 },
  // Major campaign architecture is authored as named building objects. Their
  // collision data lives beside the map content instead of being buried in the
  // simulation, so foreground art and solid footprints can be maintained together.
  ...campaignStructureWorldObstacles(),
  // The Korea Strait route uses the shared default floor. Only the separately
  // placed, correctly scaled buildings, towers, pines and props are solid.
  ...japanExpansionWorldObstacles(),
  // Island crossings end at walkable timber piers. The water inlet on either
  // side stays solid so the player must board through the central dock.
  ...worldTravelDockObstacles(),
  // The northern unification road follows the same object-composed rule:
  // only tents, towers, sleds and trees collide; the painted ground stays open.
  ...jurchenExpansionWorldObstacles(),
  // 여진 설원부락: 지면 그림과 분리된 천막·가죽집·감시루·썰매의
  // 실제 발자국만 막는다. 남쪽 목책은 중앙 출입구를 두 조각으로 비운다.
  { type: 'box', x: REGION_ORIGINS.jurchenvillage.x + 768, y: REGION_ORIGINS.jurchenvillage.y + 330, width: 420, height: 150 },
  { type: 'box', x: REGION_ORIGINS.jurchenvillage.x + 290, y: REGION_ORIGINS.jurchenvillage.y + 515, width: 250, height: 100 },
  { type: 'box', x: REGION_ORIGINS.jurchenvillage.x + 1240, y: REGION_ORIGINS.jurchenvillage.y + 550, width: 340, height: 120 },
  { type: 'box', x: REGION_ORIGINS.jurchenvillage.x + 1260, y: REGION_ORIGINS.jurchenvillage.y + 405, width: 140, height: 100 },
  { type: 'box', x: REGION_ORIGINS.jurchenvillage.x + 290, y: REGION_ORIGINS.jurchenvillage.y + 805, width: 250, height: 100 },
  { type: 'box', x: REGION_ORIGINS.jurchenvillage.x + 480, y: REGION_ORIGINS.jurchenvillage.y + 930, width: 250, height: 100 },
  { type: 'box', x: REGION_ORIGINS.jurchenvillage.x + 1056, y: REGION_ORIGINS.jurchenvillage.y + 930, width: 250, height: 100 },
  // 압록 전선: 조선 진보와 여진 후영의 구조물은 고정 충돌을 갖되,
  // 얼음 나루와 무너진 목책 중앙의 전투 통로는 넓게 남긴다.
  // 북쪽 여진 군막과 목책. 중앙 남하로는 두 구조물 사이로 통한다.
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 245, y: REGION_ORIGINS.manchufrontier.y + 205, width: 260, height: 155 },
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 1291, y: REGION_ORIGINS.manchufrontier.y + 205, width: 260, height: 155 },
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 490, y: REGION_ORIGINS.manchufrontier.y + 240, width: 320, height: 74 },
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 1046, y: REGION_ORIGINS.manchufrontier.y + 240, width: 320, height: 74 },
  // 남쪽 조선 진보. 감시루와 목책 사이 세 갈래 북상로를 비운다.
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 500, y: REGION_ORIGINS.manchufrontier.y + 790, width: 360, height: 78 },
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 1036, y: REGION_ORIGINS.manchufrontier.y + 790, width: 360, height: 78 },
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 230, y: REGION_ORIGINS.manchufrontier.y + 720, width: 155, height: 170 },
  { type: 'box', x: REGION_ORIGINS.manchufrontier.x + 1306, y: REGION_ORIGINS.manchufrontier.y + 720, width: 155, height: 170 },
  { type: 'circle', x: REGION_ORIGINS.manchufrontier.x + 350, y: REGION_ORIGINS.manchufrontier.y + 250, radius: 50 },
  { type: 'circle', x: REGION_ORIGINS.manchufrontier.x + 1215, y: REGION_ORIGINS.manchufrontier.y + 585, radius: 48 },
  { type: 'circle', x: REGION_ORIGINS.manchufrontier.x + 1270, y: REGION_ORIGINS.manchufrontier.y + 365, radius: 48 },
  // Village (the second 1536x1024 map, blended from VILLAGE_TOP on Y).
  // Northern wall leaves the central gate and road open.
  { type: 'box', x: 380, y: VILLAGE_TOP + 104, width: 530, height: 86 },
  { type: 'box', x: 1135, y: VILLAGE_TOP + 104, width: 420, height: 86 },
  // Inn compound and blacksmith workshop.
  { type: 'box', x: 300, y: VILLAGE_TOP + 246, width: 410, height: 310 },
  { type: 'box', x: 1240, y: VILLAGE_TOP + 281, width: 330, height: 330 },
  // Market stalls and village utilities.
  { type: 'box', x: 275, y: VILLAGE_TOP + 681, width: 430, height: 300 },
  { type: 'circle', x: 1060, y: VILLAGE_TOP + 661, radius: 62 },
  { type: 'box', x: 920, y: VILLAGE_TOP + 636, width: 78, height: 88 },
  // Dynamic crop plots and physical footprints share one placement registry.
  ...VILLAGE_FARM_OBSTACLES,
  // Rocky perimeter, while keeping the southern road open.
  { type: 'box', x: 365, y: VILLAGE_TOP + 926, width: 540, height: 135 },
  { type: 'box', x: 1180, y: VILLAGE_TOP + 926, width: 360, height: 135 },
  // Hanseong and the four regional towns share the object footprints authored
  // beside their map data. This keeps roofs, palace walls, market stalls,
  // rivers and trees solid while leaving the signed north-south road open.
  ...joseonTownWorldObstacles(),
  // Mountain passes, tidal flats and naval straits use the same source for
  // their visible props and collision footprints.
  ...extendedWorldObstacles(),
  // Episode II keeps the exact same object/collision registry: every solid
  // building footprint and water bank is derived from the visible layout.
  ...episode2WorldObstacles(),
] as const;

type PendingMonsterAttack = {
  monsterId: string;
  damage: number;
  impactAt: number;
  knockbackForce: number;
  impactRange: number;
  minimumFacingDot?: number;
  requiresLineOfSight?: boolean;
  trajectory?: {
    origin: Vec2;
    direction: Vec2;
    halfWidth: number;
  };
};

type MonsterLineOfSightCache = {
  clear: boolean;
  expiresAt: number;
  from: Vec2;
  to: Vec2;
};

export class GameSimulation {
  region: RegionId;
  dungeonFloor = 0;
  dungeonLayout: DungeonFloorLayout | null = null;
  boss: BossState | null = null;
  highestBossCheckpoint = 1;
  readonly player: PlayerState;

  readonly inventory: InventoryItem[] = [];
  readonly equipment: EquipmentState = { weapon: null, armor: null, charm: null };
  readonly groundDrops: GroundDrop[] = [];
  readonly inventoryCapacity = 20;
  readonly skillRanks: Record<SkillId, number> = {
    whirlwind: 1,
    'leap-strike': 0,
    'moon-dash': 0,
    'crescent-wave': 0,
    'tidebreaker-step': 0,
    'haemosu-volley': 0,
    'falcon-seeker': 0,
    'iron-cavalry-shot': 0,
    'crescent-arrow-rain': 0,
    'beacon-volley': 0,
    'spirit-bell': 0,
    'talisman-flame': 0,
    'soul-binding-gut': 0,
    'exile-possession': 0,
    'blade-mastery': 0,
    'great-bow-mastery': 0,
    'iron-constitution': 0,
    insight: 0,
  };
  readonly skillCooldowns: Record<SkillId, number> = {
    whirlwind: 0,
    'leap-strike': 0,
    'moon-dash': 0,
    'crescent-wave': 0,
    'tidebreaker-step': 0,
    'haemosu-volley': 0,
    'falcon-seeker': 0,
    'iron-cavalry-shot': 0,
    'crescent-arrow-rain': 0,
    'beacon-volley': 0,
    'spirit-bell': 0,
    'talisman-flame': 0,
    'soul-binding-gut': 0,
    'exile-possession': 0,
    'blade-mastery': 0,
    'great-bow-mastery': 0,
    'iron-constitution': 0,
    insight: 0,
  };
  readonly attributeAllocations: AttributeValues = emptyAttributeAllocations();
  attributePoints = attributePointsEarnedAtLevel(4);
  readonly huntKills: Partial<Record<MonsterKind, number>> = {};
  readonly craftedRecipes = new Set<CraftRecipeId>();
  readonly followers: FollowerState[] = [];
  skillPoints = 2;
  activeWorldEvent: ActiveWorldEvent | null = null;

  readonly monsters: MonsterState[] = (Object.entries(REGION_SPAWNS) as Array<
    [Exclude<RegionId, 'village'>, Array<[MonsterKind, number, number]>]
  >).flatMap(([region, roster]) => {
    const origin = REGION_ORIGINS[region];
    return roster.map(([kind, localX, localY], index) => {
      const data = MONSTER_DATA[kind];
      const prisonTutorial = region === 'ulleungdo' && isUlleungGuard(kind);
      const japanScale = isJapanRegion(region) && isJapaneseSoldier(kind)
        ? JAPAN_CAMPAIGN_SCALE[region]
        : undefined;
      const jurchenScale = isJurchenExpansionRegion(region)
        ? JURCHEN_CAMPAIGN_SCALE[region]
        : undefined;
      const campaignScale = japanScale ?? jurchenScale;
      const tutorialHp = kind === 'ulleung-captain' ? 68 : kind === 'ulleung-veteran' ? 52 : 42;
      const tutorialDamage = kind === 'ulleung-captain' ? 4 : kind === 'ulleung-veteran' ? 3 : 2;
      const campaignHp = campaignScale ? Math.max(1, Math.round(data.hp * campaignScale.hp)) : data.hp;
      const campaignDamage = campaignScale ? Math.max(1, Math.round(data.damage * campaignScale.damage)) : data.damage;
      const campaignLevel = campaignScale ? Math.max(1, data.level - campaignScale.levelPenalty) : data.level;
      const x = origin.x + localX;
      const y = origin.y + localY;
      const name = isJurchenExpansionRegion(region)
        ? jurchenCampaignMonsterName(region, kind, data.name)
        : data.name;
      return {
        id: `${region}-monster-${index}`, region, kind, x, y, spawn: { x, y }, name,
        level: prisonTutorial ? Math.min(2, data.level) : campaignLevel,
        hp: prisonTutorial ? tutorialHp : campaignHp,
        maxHp: prisonTutorial ? tutorialHp : campaignHp,
        damage: prisonTutorial ? tutorialDamage : campaignDamage,
        alive: true, attackCooldown: ((index * 31 + kind.length * 7) % 80) / 100, respawnAt: 0,
        facing: Math.PI / 2, aiState: 'patrol' as const,
        tacticalRole: tacticalRoleFor(kind), tacticSlot: index % 8, aggro: false,
        thinkTimer: 0.8 + index * 0.17, actionTimer: 0,
        rallySeconds: 0, stuckSeconds: 0, recoveryTimer: 0,
        recoveryDirection: { x: 0, y: 0 }, recoveryCount: 0,
        patrolTarget: { x: x + Math.cos(index * 2.1) * 36, y: y + Math.sin(index * 2.1) * 28 },
        velocity: { x: 0, y: 0 },
        chargeDirection: { x: 0, y: 0 }, hitStun: 0, knockback: { x: 0, y: 0 },
        elemental: emptyElementalState(),
      };
    });
  });

  private events: GameEvent[] = [];
  private elapsed = 0;
  private playerOrigin: PlayerOrigin = 'kim-donghyeok';
  private storyCampaignState: StoryCampaignState = createStoryCampaignState(this.playerOrigin);
  private factionWarState = createFactionWarState(this.playerOrigin);
  private playerRespawnAt = 0;
  private playerActive = false;
  private travelModeEnabled = false;
  private pendingPlayerAttack: {
    targetId: string;
    damage: number;
    critical: boolean;
    impactAt: number;
    style: 'fist' | 'weapon';
    element: WeaponElement | null;
    step: BasicAttackStep;
  } | null = null;
  private basicAttackStep: BasicAttackStep = 1;
  private basicAttackExpiresAt = 0;
  private basicAttackTargetId: string | null = null;
  private pendingMonsterAttacks: PendingMonsterAttack[] = [];
  private dropCounter = 0;
  private itemCounter = 0;
  private followerCounter = 0;
  private droppedStarterWeapon = false;
  private readonly droppedMartialManuals = new Set<ItemId>();
  private treeTrainingCount = 0;
  private prisonGateOpen = false;
  private prisonGuardsProvoked = false;
  private governmentGuardsProvoked = false;
  private wakoPactRevealed = false;
  private wakoInvasionAt = 0;
  private wakoInvasionStarted = false;
  private ulleungVillageLiberated = false;
  private playerDefeatRegion: RegionId | null = null;
  private questCompleted = false;
  private dungeonObstacles: FieldObstacle[] = [];
  private dungeonStairLocked = false;
  private dungeonComplete = false;
  private defeatedInDungeon = false;
  private nextWorldEventAt = 12;
  private worldEventCycle = 0;
  private tangeumCleared = false;
  private tangeumArrivalAnnounced = false;
  private readonly pyongyangCleared = new Set<PyongyangRegionId>();
  private readonly japanCleared = new Set<JapanRegionId>();
  private readonly jurchenCleared = new Set<JurchenExpansionRegionId>();
  private royalRefugeState: RoyalRefugeCampaignState = createRoyalRefugeCampaignState();
  private shogunSecondPhase = false;
  private frontierOpeningDefeated = false;
  private hajinSouthwardMarch = false;
  private hajinArmyReserve = 0;
  private gwanghaeEnemyReserve = 0;
  private gwanghaeEnemyInitialTotal = 0;
  private frontierAmbushPhase: 'inactive' | 'waiting' | 'arrow' | 'engaged' = 'inactive';
  private frontierAmbushAt = 0;
  private frontierOpeningShotImpactAt = 0;
  private frontierOpeningShotTargetId: string | null = null;
  private frontierRetreatResolveAt = 0;
  private readonly frontierFleeingUnitIds = new Set<string>();
  private readonly discoveredLandmarks = new Set<LandmarkId>();
  private readonly visitedRegions = new Set<RegionId>();
  private readonly bossController = new BossCombatController();
  private activeMonsterRoster: MonsterState[] = [];
  private playerRoute: Vec2[] = [];
  private movementWaypoint: Vec2 | null = null;
  private routedMovementGoal: Vec2 | null = null;
  private playerMovementStallSeconds = 0;
  private playerNavigationRecoveries = 0;
  private navigationKnockbackAxis: Vec2 | null = null;
  private obstacleCacheKey = '';
  private obstacleCache: readonly FieldObstacle[] = [];
  private activeObstacleCacheKey = '';
  private activeObstacleCache: readonly FieldObstacle[] = [];
  private readonly monsterLineOfSightCache = new Map<string, MonsterLineOfSightCache>();
  private regionGateCooldownUntil = 0;

  constructor(initialRegion: RegionId = 'solgogae') {
    this.region = initialRegion;
    this.visitedRegions.add(initialRegion);
    const origin = REGION_ORIGINS[initialRegion];
    const initialY = initialRegion === 'ulleungvillage' ? 180
      : initialRegion === 'ulleunghunt' ? 620
      : initialRegion === 'yeongwol' || initialRegion === 'yeongwolhq'
        || initialRegion === 'jeonjufield' || initialRegion === 'jeonjugate' || initialRegion === 'jeonju'
        || initialRegion === 'busanjin' || initialRegion === 'tangeumdae'
        || initialRegion === 'gyeongbokgate' || initialRegion === 'gyeongbokcourt'
        || initialRegion === 'gyeongbokinner' || isJoseonTownRegion(initialRegion)
        || isJurchenRegion(initialRegion)
        || initialRegion === 'manchufrontier'
        || isRoyalRefugeRegion(initialRegion)
        || isPyongyangRegion(initialRegion) ? 850 : 680;
    this.player = {
      x: origin.x + 765, y: origin.y + initialY, hp: 180, maxHp: 180, level: 4, xp: 64, xpToNext: 160,
      gold: 128, potions: 3, kills: 0, destination: null, targetId: null,
      attackCooldown: 0, dodgeCooldown: 0, momentum: 0, momentumActive: 0,
      combo: 0, comboTimer: 0, facing: -Math.PI / 2, lootTargetId: null,
    };
    const magistrate = this.monsters.find((monster) => monster.kind === 'ulleung-magistrate');
    if (magistrate) {
      magistrate.alive = false;
      magistrate.hp = 0;
      magistrate.respawnAt = Number.POSITIVE_INFINITY;
    }
    for (const invader of this.monsters.filter((monster) => isWako(monster.kind))) {
      invader.alive = false;
      invader.hp = 0;
      invader.respawnAt = Number.POSITIVE_INFINITY;
    }
  }

  private cloneBossForSave(): BossState | null {
    if (!this.boss) return null;
    return {
      ...this.boss,
      recentPatternIds: [...this.boss.recentPatternIds],
      patternCooldowns: { ...this.boss.patternCooldowns },
    };
  }

  private exportMonsterDeltas(): SavedMonsterDelta[] {
    return this.monsters.flatMap((monster): SavedMonsterDelta[] => {
      const initiallyInactive = monster.kind === 'ulleung-magistrate' || isWako(monster.kind);
      const expectedAlive = !initiallyInactive;
      const expectedHp = expectedAlive ? monster.maxHp : 0;
      const moved = Math.abs(monster.x - monster.spawn.x) > 0.5
        || Math.abs(monster.y - monster.spawn.y) > 0.5;
      const respawnChanged = expectedAlive
        ? monster.respawnAt !== 0
        : Number.isFinite(monster.respawnAt);
      if (
        monster.alive === expectedAlive
        && Math.abs(monster.hp - expectedHp) < 0.001
        && !moved
        && !respawnChanged
      ) return [];
      return [{
        id: monster.id,
        hp: monster.hp,
        alive: monster.alive,
        x: monster.x,
        y: monster.y,
        respawnIn: monster.alive
          ? 0
          : Number.isFinite(monster.respawnAt)
            ? Math.max(0, monster.respawnAt - this.elapsed)
            : null,
      }];
    });
  }

  exportSinglePlayerSnapshot(): SinglePlayerSnapshot {
    const {
      x, y, hp, maxHp, level, xp, xpToNext, gold, potions, kills, facing,
    } = this.player;
    const activeWorldEvent = this.activeWorldEvent
      ? (() => {
        const { endsAt, ...event } = this.activeWorldEvent;
        return {
          ...event,
          remainingSeconds: Math.max(0, endsAt - this.elapsed),
        };
      })()
      : null;
    return {
      version: 1,
      savedAt: Date.now(),
      origin: this.playerOrigin,
      region: this.region,
      player: { x, y, hp, maxHp, level, xp, xpToNext, gold, potions, kills, facing },
      inventory: this.inventory.map((item) => ({ ...item })),
      equipment: { ...this.equipment },
      groundDrops: this.groundDrops.map((drop) => ({ ...drop })),
      skillRanks: { ...this.skillRanks },
      skillPoints: this.skillPoints,
      attributeAllocations: { ...this.attributeAllocations },
      attributePoints: this.attributePoints,
      followers: this.followers.map((follower) => ({
        ...follower,
        velocity: { ...follower.velocity },
      })),
      highestBossCheckpoint: this.highestBossCheckpoint,
      progress: {
        prisonGateOpen: this.prisonGateOpen,
        prisonGuardsProvoked: this.prisonGuardsProvoked,
        governmentGuardsProvoked: this.governmentGuardsProvoked,
        wakoPactRevealed: this.wakoPactRevealed,
        wakoInvasionStarted: this.wakoInvasionStarted,
        ulleungVillageLiberated: this.ulleungVillageLiberated,
        questCompleted: this.questCompleted,
        discoveredLandmarks: [...this.discoveredLandmarks],
        huntKills: { ...this.huntKills },
        craftedRecipes: [...this.craftedRecipes],
        frontierOpeningDefeated: this.frontierOpeningDefeated,
        jurchenCleared: [...this.jurchenCleared],
        hajinSouthwardMarch: this.hajinSouthwardMarch,
        hajinArmyReserve: this.hajinArmyReserve,
        gwanghaeEnemyReserve: this.gwanghaeEnemyReserve,
        gwanghaeEnemyInitialTotal: this.gwanghaeEnemyInitialTotal,
        factionWar: cloneFactionWarState(this.factionWarState),
        tangeumCleared: this.tangeumCleared,
        pyongyangCleared: [...this.pyongyangCleared],
        japanCleared: [...this.japanCleared],
        visitedRegions: [...this.visitedRegions],
        japanMonsters: this.monsters
          .filter((monster) => isJapanRegion(monster.region))
          .map(({ id, hp, alive }) => ({ id, hp, alive })),
        royalRefugeMonsters: this.monsters
          .filter((monster) => isRoyalRefugeRegion(monster.region))
          .map(({ id, hp, alive }) => ({ id, hp, alive })),
        monsterDeltas: this.exportMonsterDeltas(),
        dungeon: this.region === 'dungeon' && this.dungeonFloor > 0
          ? {
            floor: this.dungeonFloor,
            stairLocked: this.dungeonStairLocked,
            complete: this.dungeonComplete,
            boss: this.cloneBossForSave(),
          }
          : null,
        worldEvent: {
          active: activeWorldEvent,
          nextInSeconds: Math.max(0, this.nextWorldEventAt - this.elapsed),
          cycle: this.worldEventCycle,
        },
        treeTrainingCount: this.treeTrainingCount,
        droppedStarterWeapon: this.droppedStarterWeapon,
        droppedMartialManuals: [...this.droppedMartialManuals],
        wakoInvasionDelaySeconds: this.wakoInvasionAt > 0
          ? Math.max(0, this.wakoInvasionAt - this.elapsed)
          : 0,
        shogunSecondPhase: this.shogunSecondPhase,
        royalRefuge: this.cloneRoyalRefugeState(),
        story: this.getStoryCampaignState(),
      },
    };
  }

  private restoreMonsterDelta(saved: SavedMonsterDelta): void {
    if (!saved || typeof saved.id !== 'string') return;
    const monster = this.monsters.find((candidate) => candidate.id === saved.id);
    if (!monster) return;
    const hp = Number.isFinite(saved.hp)
      ? Math.max(0, Math.min(monster.maxHp, saved.hp))
      : monster.maxHp;
    monster.hp = hp;
    monster.alive = Boolean(saved.alive) && hp > 0;
    if (Number.isFinite(saved.x)) monster.x = saved.x!;
    if (Number.isFinite(saved.y)) monster.y = saved.y!;
    monster.aggro = false;
    monster.aiState = monster.alive ? 'patrol' : 'stunned';
    monster.attackCooldown = 0;
    monster.thinkTimer = 0.4;
    monster.actionTimer = 0;
    monster.rallySeconds = 0;
    monster.stuckSeconds = 0;
    monster.recoveryTimer = 0;
    monster.recoveryDirection = { x: 0, y: 0 };
    monster.recoveryCount = 0;
    monster.velocity = { x: 0, y: 0 };
    monster.chargeDirection = { x: 0, y: 0 };
    monster.hitStun = 0;
    monster.knockback = { x: 0, y: 0 };
    monster.elemental = emptyElementalState();
    monster.respawnAt = monster.alive
      ? 0
      : saved.respawnIn === null
        ? Number.POSITIVE_INFINITY
        : Number.isFinite(saved.respawnIn)
          ? this.elapsed + Math.max(0, saved.respawnIn!)
          : Number.POSITIVE_INFINITY;
  }

  private restoreSavedBoss(saved: BossState | null | undefined): void {
    const base = this.boss;
    if (!base || !saved || saved.floor !== base.floor || saved.bossId !== base.bossId) return;
    const stateKinds: BossState['state'][] = [
      'idle', 'chase', 'telegraph', 'windup', 'impact', 'recovery', 'phase-change', 'dead',
    ];
    const patternCooldowns = Object.fromEntries(
      Object.keys(base.patternCooldowns).map((patternId) => [
        patternId,
        Math.max(0, Number(saved.patternCooldowns?.[patternId]) || 0),
      ]),
    );
    const hp = Number.isFinite(saved.hp)
      ? Math.max(0, Math.min(base.maxHp, saved.hp))
      : base.maxHp;
    const alive = Boolean(saved.alive) && hp > 0;
    this.boss = {
      ...base,
      x: Number.isFinite(saved.x) ? saved.x : base.x,
      y: Number.isFinite(saved.y) ? saved.y : base.y,
      facing: Number.isFinite(saved.facing) ? saved.facing : base.facing,
      hp,
      alive,
      phase: saved.phase === 2 ? 2 : 1,
      phaseTransitioned: Boolean(saved.phaseTransitioned || saved.phase === 2),
      invulnerableSeconds: Math.max(0, Number(saved.invulnerableSeconds) || 0),
      state: alive && stateKinds.includes(saved.state) ? saved.state : 'dead',
      stateSeconds: Math.max(0, Number(saved.stateSeconds) || 0),
      activePatternId: saved.activePatternId && saved.activePatternId in patternCooldowns
        ? saved.activePatternId
        : null,
      recentPatternIds: Array.isArray(saved.recentPatternIds)
        ? saved.recentPatternIds.filter((patternId) => patternId in patternCooldowns).slice(-2)
        : [],
      patternCooldowns,
    };
  }

  private restoreLegacyWakoState(): void {
    const governmentActors = this.monsters.filter((monster) =>
      monster.region === 'ulleungvillage'
      && (isUlleungGuard(monster.kind) || monster.kind === 'ulleung-magistrate' || isWako(monster.kind)));
    if (this.ulleungVillageLiberated) {
      for (const monster of governmentActors) {
        monster.alive = false;
        monster.hp = 0;
        monster.respawnAt = Number.POSITIVE_INFINITY;
      }
      return;
    }
    if (!this.wakoPactRevealed && !this.wakoInvasionStarted) return;
    for (const monster of governmentActors) {
      const shouldFight = monster.kind === 'ulleung-magistrate'
        || (this.wakoInvasionStarted && isWako(monster.kind));
      monster.alive = shouldFight;
      monster.hp = shouldFight ? monster.maxHp : 0;
      monster.respawnAt = Number.POSITIVE_INFINITY;
      monster.aggro = false;
      monster.aiState = shouldFight ? 'alert' : 'stunned';
      monster.velocity = { x: 0, y: 0 };
      monster.elemental = emptyElementalState();
    }
  }

  importSinglePlayerSnapshot(snapshot: SinglePlayerSnapshot): boolean {
    const candidate = snapshot as Partial<SinglePlayerSnapshot>;
    const savedRegion = candidate?.region;
    if (candidate?.version !== 1 || !savedRegion || !REGION_ORIGINS[savedRegion]) return false;
    const progress = ((candidate.progress && typeof candidate.progress === 'object')
      ? candidate.progress
      : {}) as Partial<SinglePlayerSnapshot['progress']>;
    this.region = savedRegion;
    this.playerOrigin = candidate.origin === 'frontier-archer'
      ? 'frontier-archer'
      : candidate.origin === 'osaka-mudang'
        ? 'osaka-mudang'
        : candidate.origin === 'gwanghae-prince' ? 'gwanghae-prince' : 'kim-donghyeok';
    this.storyCampaignState = normalizeStoryCampaignState(progress.story, this.playerOrigin);
    const savedPlayer = (
      candidate.player && typeof candidate.player === 'object'
        ? candidate.player
        : {}
    ) as Partial<SinglePlayerSnapshot['player']>;
    const regionOrigin = REGION_ORIGINS[this.region];
    const finite = (value: unknown, fallback: number): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    const restoredMaxHp = Math.max(1, finite(savedPlayer.maxHp, this.player.maxHp));
    const rawRestoredHp = finite(savedPlayer.hp, restoredMaxHp);
    const savedPlayerWasDead = typeof savedPlayer.hp === 'number' && savedPlayer.hp <= 0;
    Object.assign(this.player, {
      x: finite(savedPlayer.x, regionOrigin.x + MAP_WIDTH / 2),
      y: finite(savedPlayer.y, regionOrigin.y + 680),
      hp: Math.max(0, Math.min(restoredMaxHp, rawRestoredHp)),
      maxHp: restoredMaxHp,
      level: Math.max(1, Math.floor(finite(savedPlayer.level, this.player.level))),
      xp: Math.max(0, finite(savedPlayer.xp, this.player.xp)),
      xpToNext: Math.max(1, finite(savedPlayer.xpToNext, this.player.xpToNext)),
      gold: Math.max(0, Math.floor(finite(savedPlayer.gold, this.player.gold))),
      potions: Math.max(0, Math.floor(finite(savedPlayer.potions, this.player.potions))),
      kills: Math.max(0, Math.floor(finite(savedPlayer.kills, this.player.kills))),
      facing: finite(savedPlayer.facing, this.player.facing),
      destination: null,
      targetId: null,
      lootTargetId: null,
      attackCooldown: 0,
      dodgeCooldown: 0,
      momentum: 0,
      combo: 0,
      comboTimer: 0,
      momentumActive: 0,
    });
    if (isJapanRegion(this.region) || isJurchenRegion(this.region)) {
      const origin = REGION_ORIGINS[this.region];
      const outsideRelocatedJapanRoad = this.player.x < origin.x
        || this.player.x > origin.x + MAP_WIDTH
        || this.player.y < origin.y
        || this.player.y > origin.y + MAP_HEIGHT;
      if (outsideRelocatedJapanRoad) {
        this.player.x = origin.x + MAP_WIDTH / 2;
        this.player.y = origin.y + 850;
      }
    }
    if (isJoseonTownRegion(this.region)) {
      // Older saves can predate the town collision layer. Relocate a saved
      // actor that now falls inside a roof, river bank or palace wall onto the
      // nearest legal side instead of restoring them on scenery.
      const restored = this.clampPlayerPoint(this.player);
      this.player.x = restored.x;
      this.player.y = restored.y;
    }
    const restoredItems: InventoryItem[] = [];
    const restoredItemIds = new Set<string>();
    const rawInventory = Array.isArray(candidate.inventory) ? candidate.inventory as unknown[] : [];
    for (const raw of rawInventory) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Partial<InventoryItem>;
      if (
        typeof item.instanceId !== 'string'
        || restoredItemIds.has(item.instanceId)
        || typeof item.itemId !== 'string'
        || !(item.itemId in ITEM_CATALOG)
      ) continue;
      restoredItemIds.add(item.instanceId);
      const restored: InventoryItem = {
        instanceId: item.instanceId,
        itemId: item.itemId as ItemId,
      };
      if (typeof item.enhancement === 'number' && Number.isFinite(item.enhancement)) {
        restored.enhancement = Math.max(0, Math.min(5, Math.floor(item.enhancement)));
      }
      restoredItems.push(restored);
      if (restoredItems.length >= this.inventoryCapacity) break;
    }
    this.inventory.splice(0, this.inventory.length, ...restoredItems);
    this.itemCounter = this.inventory.reduce((next, item) => {
      const match = /^item-(\d+)$/.exec(item.instanceId);
      return match ? Math.max(next, Number(match[1]) + 1) : next;
    }, 0);
    const restoredDropIds = new Set<string>();
    const restoredDrops = (Array.isArray(candidate.groundDrops) ? candidate.groundDrops : []).filter((drop) => {
      if (
        !drop
        || typeof drop.id !== 'string'
        || restoredDropIds.has(drop.id)
        || !(drop.itemId in ITEM_CATALOG)
        || !Number.isFinite(drop.x)
        || !Number.isFinite(drop.y)
      ) return false;
      restoredDropIds.add(drop.id);
      return true;
    }).map((drop) => ({
      ...drop,
      region: drop.region && drop.region in REGIONS ? drop.region : candidate.region,
      remainingSeconds: typeof drop.remainingSeconds === 'number' && Number.isFinite(drop.remainingSeconds)
        ? Math.max(1, drop.remainingSeconds)
        : this.groundDropLifetime(drop.itemId),
    }));
    this.groundDrops.splice(0, this.groundDrops.length, ...restoredDrops);
    this.dropCounter = restoredDrops.reduce((next, drop) => {
      const match = /^drop-(\d+)$/.exec(drop.id);
      return match ? Math.max(next, Number(match[1]) + 1) : next;
    }, 0);
    const savedEquipment = candidate.equipment && typeof candidate.equipment === 'object'
      ? candidate.equipment
      : { weapon: null, armor: null, charm: null };
    for (const slot of Object.keys(this.equipment) as EquipmentSlot[]) {
      const instanceId = savedEquipment[slot];
      const item = typeof instanceId === 'string'
        ? this.inventory.find((entry) => entry.instanceId === instanceId)
        : null;
      this.equipment[slot] = item && ITEM_CATALOG[item.itemId].slot === slot
        ? item.instanceId
        : null;
    }
    const savedSkillRanks = candidate.skillRanks && typeof candidate.skillRanks === 'object'
      ? candidate.skillRanks
      : null;
    for (const skillId of Object.keys(this.skillRanks) as SkillId[]) {
      const savedRank = savedSkillRanks?.[skillId];
      this.skillRanks[skillId] = typeof savedRank === 'number' && Number.isFinite(savedRank)
        ? Math.max(0, Math.min(SKILL_CATALOG[skillId].maxRank, Math.floor(savedRank)))
        : this.skillRanks[skillId];
      this.skillCooldowns[skillId] = 0;
    }
    if (this.isFrontierArcher()) {
      for (const starterSkill of [
        'haemosu-volley', 'falcon-seeker', 'iron-cavalry-shot', 'crescent-arrow-rain',
        'great-bow-mastery', 'whirlwind',
      ] as SkillId[]) {
        this.skillRanks[starterSkill] = Math.max(1, this.skillRanks[starterSkill]);
      }
      if (!this.inventory.some((item) => item.itemId === 'worn-hwando')) {
        this.inventory.push({ instanceId: `item-${this.itemCounter++}`, itemId: 'worn-hwando' });
      }
    } else if (this.isOsakaMudang()) {
      for (const starterSkill of SHAMAN_ACTIVE_SKILL_IDS) {
        this.skillRanks[starterSkill] = Math.max(1, this.skillRanks[starterSkill]);
      }
    } else if (this.isGwanghaePrince()) {
      for (const starterSkill of ['whirlwind', 'moon-dash', 'blade-mastery'] as SkillId[]) {
        this.skillRanks[starterSkill] = Math.max(1, this.skillRanks[starterSkill]);
      }
      let courtSword = this.inventory.find((item) => item.itemId === 'worn-hwando');
      if (!courtSword && this.inventory.length < this.inventoryCapacity) {
        courtSword = { instanceId: `item-${this.itemCounter++}`, itemId: 'worn-hwando' };
        this.inventory.push(courtSword);
      }
      const equippedWeapon = this.getEquippedDefinition('weapon');
      if ((!equippedWeapon || equippedWeapon.weaponClass === 'bow') && courtSword) {
        this.equipment.weapon = courtSword.instanceId;
      }
    }
    this.skillPoints = typeof candidate.skillPoints === 'number' && Number.isFinite(candidate.skillPoints)
      ? Math.max(0, Math.floor(candidate.skillPoints))
      : this.skillPoints;
    Object.assign(this.attributeAllocations, normalizeAttributeAllocations(candidate.attributeAllocations));
    this.attributePoints = typeof candidate.attributePoints === 'number' && Number.isFinite(candidate.attributePoints)
      ? Math.max(0, Math.floor(candidate.attributePoints))
      : Math.max(0, attributePointsEarnedAtLevel(this.player.level)
        - Object.values(this.attributeAllocations).reduce((sum, value) => sum + value, 0));
    const recruitmentRoutes = new Set<RecruitmentRoute>([
      'tavern', 'liberation', 'defection', 'hidden-contract', 'invasion', 'bunjo',
    ]);
    const restoredFollowers: FollowerState[] = [];
    const restoredFollowerIds = new Set<string>();
    for (const raw of Array.isArray(candidate.followers) ? candidate.followers : []) {
      if (
        !raw
        || typeof raw.id !== 'string'
        || restoredFollowerIds.has(raw.id)
        || !(raw.kind in FOLLOWER_CATALOG)
      ) continue;
      const definition = FOLLOWER_CATALOG[raw.kind];
      restoredFollowerIds.add(raw.id);
      restoredFollowers.push({
        id: raw.id,
        kind: raw.kind,
        name: typeof raw.name === 'string' ? raw.name : definition.name,
        route: recruitmentRoutes.has(raw.route) ? raw.route : definition.route,
        visualKind: raw.kind === 'peasant-militia' && raw.visualKind === 'bandit'
          ? definition.visualKind
          : raw.visualKind in MONSTER_DATA ? raw.visualKind : definition.visualKind,
        x: Number.isFinite(raw.x) ? raw.x : this.player.x,
        y: Number.isFinite(raw.y) ? raw.y : this.player.y,
        facing: Number.isFinite(raw.facing) ? raw.facing : this.player.facing,
        velocity: { x: 0, y: 0 },
        attackCooldown: 0,
        actionTimer: 0,
        targetId: null,
      });
    }
    this.followers.splice(0, this.followers.length, ...restoredFollowers);
    this.followerCounter = this.followers.reduce((next, follower) => {
      const values = [...follower.id.matchAll(/(\d+)/g)].map((match) => Number(match[1]) + 1);
      return Math.max(next, ...values, 0);
    }, 0);
    this.highestBossCheckpoint = typeof candidate.highestBossCheckpoint === 'number'
      && Number.isFinite(candidate.highestBossCheckpoint)
      ? Math.max(1, Math.min(MAX_DUNGEON_FLOOR, Math.floor(candidate.highestBossCheckpoint)))
      : 1;
    this.prisonGateOpen = Boolean(progress.prisonGateOpen);
    this.prisonGuardsProvoked = Boolean(progress.prisonGuardsProvoked);
    this.governmentGuardsProvoked = Boolean(progress.governmentGuardsProvoked);
    this.ulleungVillageLiberated = Boolean(progress.ulleungVillageLiberated);
    this.wakoInvasionStarted = Boolean(progress.wakoInvasionStarted || this.ulleungVillageLiberated);
    this.wakoPactRevealed = Boolean(
      progress.wakoPactRevealed || this.wakoInvasionStarted || this.ulleungVillageLiberated,
    );
    this.wakoInvasionAt = 0;
    if (this.wakoPactRevealed && !this.wakoInvasionStarted && !this.ulleungVillageLiberated) {
      const remaining = typeof progress.wakoInvasionDelaySeconds === 'number'
        && Number.isFinite(progress.wakoInvasionDelaySeconds)
        ? progress.wakoInvasionDelaySeconds
        : 5.4;
      this.wakoInvasionAt = this.elapsed + Math.max(0.05, remaining);
    }
    this.questCompleted = Boolean(progress.questCompleted || this.player.kills >= 8);
    this.tangeumCleared = Boolean(progress.tangeumCleared);
    this.pyongyangCleared.clear();
    for (const region of progress.pyongyangCleared ?? []) {
      if (isPyongyangRegion(region)) this.pyongyangCleared.add(region);
    }
    this.japanCleared.clear();
    for (const region of progress.japanCleared ?? []) {
      if (isJapanRegion(region)) this.japanCleared.add(region);
    }
    this.frontierOpeningDefeated = this.isFrontierArcher()
      && (progress.frontierOpeningDefeated ?? true);
    this.jurchenCleared.clear();
    for (const region of progress.jurchenCleared ?? []) {
      if (isJurchenExpansionRegion(region)) this.jurchenCleared.add(region);
    }
    // Older frontier saves predate the unification road. A save that already
    // reached the southward march must never be pushed back behind six gates.
    if (this.isFrontierArcher() && progress.hajinSouthwardMarch && !progress.jurchenCleared) {
      for (const region of JURCHEN_EXPANSION_REGION_IDS) this.jurchenCleared.add(region);
    }
    this.royalRefugeState = this.restoreRoyalRefugeState(progress.royalRefuge);
    this.visitedRegions.clear();
    for (const region of progress.visitedRegions ?? []) {
      if (REGION_ORIGINS[region]) this.visitedRegions.add(region);
    }
    this.visitedRegions.add(this.region);
    this.shogunSecondPhase = Boolean(progress.shogunSecondPhase);
    this.tangeumArrivalAnnounced = this.region === 'tangeumdae';
    this.hajinSouthwardMarch = this.isFrontierArcher() && Boolean(progress.hajinSouthwardMarch);
    this.factionWarState = restoreFactionWarState(
      progress.factionWar,
      this.playerOrigin,
      this.player.level,
    );
    this.applyGwanghaePathBattleIdentity();
    const restoredGwanghaePath = this.isGwanghaePrince()
      ? this.getGwanghaeRallyProgress().path
      : null;
    const restoredGwanghaeTargets = restoredGwanghaePath
      ? this.monsters.filter((monster) => isGwanghaePathTargetMonster(restoredGwanghaePath, monster)).length
      : 0;
    this.gwanghaeEnemyReserve = restoredGwanghaePath
      ? Math.max(0, Math.floor(
        typeof progress.gwanghaeEnemyReserve === 'number' && Number.isFinite(progress.gwanghaeEnemyReserve)
          ? progress.gwanghaeEnemyReserve
          : GWANGHAE_ENEMY_RESERVE[restoredGwanghaePath],
      ))
      : 0;
    this.gwanghaeEnemyInitialTotal = restoredGwanghaePath
      ? Math.max(
        restoredGwanghaeTargets,
        Math.floor(
          typeof progress.gwanghaeEnemyInitialTotal === 'number'
            && Number.isFinite(progress.gwanghaeEnemyInitialTotal)
            ? progress.gwanghaeEnemyInitialTotal
            : restoredGwanghaeTargets + this.gwanghaeEnemyReserve,
        ),
      )
      : 0;
    const savedHajinArmyReserve = progress.hajinArmyReserve;
    const unitedTribes = this.jurchenAlliedTribeCount();
    if (this.isFrontierArcher() && !this.hajinSouthwardMarch) {
      this.factionWarState.strength['jurchen-league'] = Math.max(
        this.factionWarState.strength['jurchen-league'],
        Math.min(58, 18 + unitedTribes * 12),
      );
    }
    const restoredJurchenReserve = progress.factionWar
      ? this.factionWarState.reserve['jurchen-league']
      : typeof savedHajinArmyReserve === 'number' && Number.isFinite(savedHajinArmyReserve)
        ? savedHajinArmyReserve
        : unitedTribes * JURCHEN_TRIBE_ARMY_REWARD;
    this.hajinArmyReserve = this.isFrontierArcher()
      ? Math.min(
        reserveCapacityForFaction(this.factionWarState, 'jurchen-league', this.player.level),
        Math.max(0, Math.floor(restoredJurchenReserve)),
      )
      : 0;
    this.factionWarState.reserve['jurchen-league'] = this.hajinArmyReserve;
    this.frontierAmbushPhase = this.isFrontierArcher()
      && this.region === 'manchufrontier'
      && this.isJurchenUnified()
      && !this.hajinSouthwardMarch
      ? 'waiting'
      : 'engaged';
    this.frontierAmbushAt = this.elapsed + 2.8;
    this.frontierOpeningShotImpactAt = 0;
    this.frontierOpeningShotTargetId = null;
    this.frontierRetreatResolveAt = 0;
    this.frontierFleeingUnitIds.clear();
    for (const key of Object.keys(this.huntKills) as MonsterKind[]) delete this.huntKills[key];
    for (const [kind, kills] of Object.entries(progress.huntKills ?? {})) {
      if (kind in MONSTER_DATA && typeof kills === 'number' && Number.isFinite(kills)) {
        this.huntKills[kind as MonsterKind] = Math.max(0, Math.floor(kills));
      }
    }
    this.craftedRecipes.clear();
    for (const recipe of progress.craftedRecipes ?? []) {
      if (recipe in CRAFTING_RECIPES) this.craftedRecipes.add(recipe);
    }
    this.discoveredLandmarks.clear();
    for (const landmark of progress.discoveredLandmarks ?? []) {
      if (typeof landmark === 'string') this.discoveredLandmarks.add(landmark);
    }
    this.treeTrainingCount = typeof progress.treeTrainingCount === 'number'
      && Number.isFinite(progress.treeTrainingCount)
      ? Math.max(0, Math.floor(progress.treeTrainingCount))
      : 0;
    this.droppedStarterWeapon = Boolean(
      progress.droppedStarterWeapon
      || this.inventory.some((item) => item.itemId === 'worn-hwando')
      || this.groundDrops.some((drop) => drop.itemId === 'worn-hwando'),
    );
    this.droppedMartialManuals.clear();
    for (const itemId of progress.droppedMartialManuals ?? []) {
      if (itemId === 'crescent-manual' || itemId === 'insight-manual') {
        this.droppedMartialManuals.add(itemId);
      }
    }
    for (const item of [...this.inventory, ...this.groundDrops]) {
      if (item.itemId === 'crescent-manual' || item.itemId === 'insight-manual') {
        this.droppedMartialManuals.add(item.itemId);
      }
    }
    if (this.skillRanks['crescent-wave'] > 0) this.droppedMartialManuals.add('crescent-manual');
    if (this.skillRanks.insight > 0) this.droppedMartialManuals.add('insight-manual');
    this.activeWorldEvent = null;
    this.worldEventCycle = 0;
    this.nextWorldEventAt = this.elapsed + 12;
    const savedWorldEvent = progress.worldEvent;
    if (savedWorldEvent && typeof savedWorldEvent === 'object') {
      this.worldEventCycle = typeof savedWorldEvent.cycle === 'number' && Number.isFinite(savedWorldEvent.cycle)
        ? Math.max(0, Math.floor(savedWorldEvent.cycle))
        : 0;
      this.nextWorldEventAt = this.elapsed + (
        typeof savedWorldEvent.nextInSeconds === 'number' && Number.isFinite(savedWorldEvent.nextInSeconds)
          ? Math.max(0, savedWorldEvent.nextInSeconds)
          : 12
      );
      const active = savedWorldEvent.active;
      if (
        active
        && typeof active.remainingSeconds === 'number'
        && active.remainingSeconds > 0
        && REGION_ORIGINS[active.region]
      ) {
        const { remainingSeconds, ...event } = active;
        const restoredEvent: ActiveWorldEvent = {
          ...event,
          endsAt: this.elapsed + remainingSeconds,
        };
        if (restoredEvent.rewardItemId && !(restoredEvent.rewardItemId in ITEM_CATALOG)) {
          delete restoredEvent.rewardItemId;
        }
        this.activeWorldEvent = restoredEvent;
      }
    }
    const savedDungeon = progress.dungeon;
    const restoredPlayerPosition = { x: this.player.x, y: this.player.y };
    if (this.region === 'dungeon') {
      const floor = savedDungeon && typeof savedDungeon.floor === 'number' && Number.isFinite(savedDungeon.floor)
        ? savedDungeon.floor
        : this.highestBossCheckpoint;
      this.applyDungeonFloor(floor);
      this.player.x = restoredPlayerPosition.x;
      this.player.y = restoredPlayerPosition.y;
      this.dungeonComplete = Boolean(savedDungeon?.complete);
      this.restoreSavedBoss(savedDungeon?.boss);
      this.dungeonStairLocked = Boolean(this.boss?.alive || savedDungeon?.stairLocked);
    } else {
      this.dungeonFloor = 0;
      this.dungeonLayout = null;
      this.dungeonObstacles = [];
      this.boss = null;
      this.dungeonStairLocked = false;
      this.dungeonComplete = false;
    }
    if (this.hajinSouthwardMarch) {
      this.markFrontierMissionTargetsDefeated();
      if (this.region !== 'manchufrontier') this.ensureHajinWarband(false);
    }
    if (this.tangeumCleared) this.markTangeumForcesDefeated();
    for (const region of this.pyongyangCleared) this.markPyongyangDefendersDefeated(region);
    for (const region of this.japanCleared) this.markJapanStageDefeated(region);
    for (const region of this.jurchenCleared) this.markJurchenStageResolved(region);
    this.markCompletedRoyalRefugeStagesDefeated();
    const hasMonsterDeltas = Array.isArray(progress.monsterDeltas);
    if (hasMonsterDeltas) {
      for (const saved of progress.monsterDeltas!) this.restoreMonsterDelta(saved);
    } else {
      if (this.prisonGateOpen) {
        for (const monster of this.monsters) {
          if (monster.region !== 'ulleungdo' || !isUlleungGuard(monster.kind)) continue;
          monster.alive = false;
          monster.hp = 0;
          monster.respawnAt = Number.POSITIVE_INFINITY;
        }
      }
      this.restoreLegacyWakoState();
      for (const saved of progress.japanMonsters ?? []) {
        const monster = this.monsters.find((entry) => entry.id === saved.id);
        const restoredJapanHuntPrey = monster
          && isJapanRegion(monster.region)
          && JAPAN_REPEATABLE_HUNT_REGIONS.has(monster.region)
          && this.japanCleared.has(monster.region)
          && isJapanHuntPrey(monster.kind);
        if (
          !monster
          || !isJapanRegion(monster.region)
          || (this.japanCleared.has(monster.region) && !restoredJapanHuntPrey)
        ) continue;
        monster.hp = Math.max(0, Math.min(monster.maxHp, Number.isFinite(saved.hp) ? saved.hp : monster.maxHp));
        monster.alive = Boolean(saved.alive) && monster.hp > 0;
        monster.aggro = false;
        monster.aiState = 'patrol';
        monster.velocity = { x: 0, y: 0 };
        monster.respawnAt = monster.alive
          ? 0
          : restoredJapanHuntPrey
            ? this.elapsed + JAPAN_HUNT_RESPAWN_SECONDS
            : Number.POSITIVE_INFINITY;
      }
      for (const saved of progress.royalRefugeMonsters ?? []) {
        const monster = this.monsters.find((entry) => entry.id === saved.id);
        if (!monster || !isRoyalRefugeRegion(monster.region)) continue;
        const stage = this.royalRefugeStageIndexForMonster(monster);
        if (this.royalRefugeState.completedStageIds.includes(
          ROYAL_REFUGE_ROUTES[monster.region].stages[stage].id,
        )) continue;
        monster.hp = Math.max(0, Math.min(monster.maxHp, Number.isFinite(saved.hp) ? saved.hp : monster.maxHp));
        monster.alive = Boolean(saved.alive) && monster.hp > 0;
        monster.aggro = false;
        monster.aiState = 'patrol';
        monster.velocity = { x: 0, y: 0 };
        monster.respawnAt = monster.alive ? 0 : Number.POSITIVE_INFINITY;
      }
    }
    const restoredGwanghaeBattle = this.getGwanghaePathBattleProgress();
    if (restoredGwanghaeBattle?.complete) {
      this.markGwanghaePathBattleCleared(restoredGwanghaeBattle.path);
    }
    // Cleared tribal villages are populated by allied warriors even when an
    // older monster delta captured their defeated duel state.
    for (const region of this.jurchenCleared) this.markJurchenStageResolved(region);
    if (this.wakoInvasionStarted && !this.ulleungVillageLiberated) {
      this.tryLiberateUlleungVillage();
    }
    const savedShogun = this.monsters.find((monster) => monster.kind === 'japanese-shogun');
    this.shogunSecondPhase = Boolean(
      savedShogun?.alive
      && savedShogun.hp > 0
      && savedShogun.hp <= savedShogun.maxHp * 0.5,
    );
    if (!hasMonsterDeltas && !(progress.japanMonsters?.length) && progress.shogunSecondPhase && savedShogun) {
      savedShogun.hp = Math.min(savedShogun.hp, savedShogun.maxHp * 0.5);
      this.shogunSecondPhase = true;
    }
    if (savedPlayerWasDead || this.player.hp <= 0) {
      const home = PLAYER_HOME_SPAWNS[this.playerOrigin];
      this.region = home.region;
      this.player.x = REGION_ORIGINS[home.region].x + home.x;
      this.player.y = REGION_ORIGINS[home.region].y + home.y;
      this.player.hp = this.player.maxHp;
      this.playerRespawnAt = 0;
      this.playerDefeatRegion = null;
      this.defeatedInDungeon = false;
      this.dungeonFloor = 0;
      this.dungeonLayout = null;
      this.dungeonObstacles = [];
      this.boss = null;
      this.dungeonStairLocked = false;
      this.dungeonComplete = false;
      this.activeWorldEvent = null;
      this.visitedRegions.add(this.region);
    }
    this.playerActive = false;
    this.pendingPlayerAttack = null;
    this.pendingMonsterAttacks = [];
    this.events.push({ type: 'region-changed', region: this.region });
    return true;
  }

  enterOnlineHuntingField(): void {
    const origin = REGION_ORIGINS.ulleungcoast;
    this.player.x = origin.x + MAP_WIDTH / 2;
    this.player.y = origin.y + 690;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
    this.changeRegion('ulleungcoast');
  }

  startFrontierArcherStory(): void {
    this.playerOrigin = 'frontier-archer';
    this.storyCampaignState = createStoryCampaignState(this.playerOrigin);
    // The playable campaign opens after Hajin's failed first crossing. The
    // defeat is a fixed prologue fact; play begins at the home camp where the
    // player must earn three tribal oaths before attempting the Yalu again.
    this.region = 'jurchenvillage';
    this.visitedRegions.clear();
    this.visitedRegions.add(this.region);
    this.frontierOpeningDefeated = true;
    this.jurchenCleared.clear();
    this.hajinSouthwardMarch = false;
    this.royalRefugeState = createRoyalRefugeCampaignState();
    this.factionWarState = createFactionWarState(this.playerOrigin);
    this.hajinArmyReserve = 0;
    this.gwanghaeEnemyReserve = 0;
    this.gwanghaeEnemyInitialTotal = 0;
    this.frontierAmbushPhase = 'inactive';
    this.frontierAmbushAt = 0;
    this.frontierOpeningShotImpactAt = 0;
    this.frontierOpeningShotTargetId = null;
    this.frontierRetreatResolveAt = 0;
    this.frontierFleeingUnitIds.clear();
    const origin = REGION_ORIGINS.jurchenvillage;
    Object.assign(this.player, {
      x: origin.x + MAP_WIDTH / 2,
      y: origin.y + 790,
      hp: 150,
      maxHp: 150,
      level: 1,
      xp: 0,
      xpToNext: 80,
      gold: 36,
      potions: 2,
      kills: 0,
      destination: null,
      targetId: null,
      lootTargetId: null,
      attackCooldown: 0,
      dodgeCooldown: 0,
      momentum: 0,
      momentumActive: 0,
      combo: 0,
      comboTimer: 0,
      facing: -Math.PI / 2,
    });
    this.inventory.splice(0);
    this.followers.splice(0);
    this.equipment.weapon = null;
    this.equipment.armor = null;
    this.equipment.charm = null;
    const bow: InventoryItem = { instanceId: `item-${this.itemCounter++}`, itemId: 'frontier-horn-bow' };
    const backupSword: InventoryItem = { instanceId: `item-${this.itemCounter++}`, itemId: 'worn-hwando' };
    this.inventory.push(bow, backupSword);
    this.equipment.weapon = bow.instanceId;
    for (const skillId of Object.keys(this.skillRanks) as SkillId[]) {
      this.skillRanks[skillId] = 0;
      this.skillCooldowns[skillId] = 0;
    }
    this.skillRanks['haemosu-volley'] = 1;
    this.skillRanks['falcon-seeker'] = 1;
    this.skillRanks['iron-cavalry-shot'] = 1;
    this.skillRanks['crescent-arrow-rain'] = 1;
    this.skillRanks['great-bow-mastery'] = 1;
    this.skillRanks.whirlwind = 1;
    this.skillPoints = 1;
    this.resetAttributeProgress();
    this.playerRoute = [];
    this.movementWaypoint = null;
    this.routedMovementGoal = null;
    this.playerActive = false;
    this.pendingPlayerAttack = null;
    this.pendingMonsterAttacks = [];
    for (const monster of this.monsters) {
      if (isJurchenExpansionRegion(monster.region)) {
        monster.alive = true;
        monster.hp = monster.maxHp;
        monster.x = monster.spawn.x;
        monster.y = monster.spawn.y;
        monster.respawnAt = 0;
      }
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
    }
    this.resetFrontierMissionTargets();
    this.regionGateCooldownUntil = this.elapsed + 1;
    this.events.push({ type: 'region-changed', region: this.region });
    this.events.push({ type: 'item-equipped', itemId: bow.itemId, itemName: ITEM_CATALOG[bow.itemId].name, equipped: true });
    this.events.push({
      type: 'frontier-opening-defeated',
      retreatTo: 'jurchenvillage',
      survivingWarriors: this.monsters.filter((monster) =>
        monster.region === 'jurchenvillage' && isFrontierJurchen(monster.kind)).length,
    });
  }

  startGwanghaeStory(): void {
    this.playerOrigin = 'gwanghae-prince';
    this.storyCampaignState = createStoryCampaignState(this.playerOrigin);
    this.region = 'changdeokgung';
    this.visitedRegions.clear();
    this.visitedRegions.add(this.region);
    this.royalRefugeState = createRoyalRefugeCampaignState();
    this.factionWarState = createFactionWarState(this.playerOrigin);
    this.frontierOpeningDefeated = false;
    this.jurchenCleared.clear();
    this.hajinSouthwardMarch = false;
    this.hajinArmyReserve = 0;
    this.gwanghaeEnemyReserve = 0;
    this.gwanghaeEnemyInitialTotal = 0;
    this.frontierAmbushPhase = 'inactive';
    this.frontierAmbushAt = 0;
    this.frontierOpeningShotImpactAt = 0;
    this.frontierOpeningShotTargetId = null;
    this.frontierRetreatResolveAt = 0;
    this.frontierFleeingUnitIds.clear();
    this.japanCleared.clear();
    this.shogunSecondPhase = false;
    const origin = REGION_ORIGINS.changdeokgung;
    Object.assign(this.player, {
      x: origin.x + 768,
      y: origin.y + 650,
      hp: 160,
      maxHp: 160,
      level: 1,
      xp: 0,
      xpToNext: 80,
      gold: 80,
      potions: 3,
      kills: 0,
      destination: null,
      targetId: null,
      lootTargetId: null,
      attackCooldown: 0,
      dodgeCooldown: 0,
      momentum: 0,
      momentumActive: 0,
      combo: 0,
      comboTimer: 0,
      facing: -Math.PI / 2,
    });
    this.inventory.splice(0);
    this.followers.splice(0);
    this.equipment.weapon = null;
    this.equipment.armor = null;
    this.equipment.charm = null;
    const sword: InventoryItem = {
      instanceId: `item-${this.itemCounter++}`,
      itemId: 'worn-hwando',
    };
    this.inventory.push(sword);
    this.equipment.weapon = sword.instanceId;
    for (const skillId of Object.keys(this.skillRanks) as SkillId[]) {
      this.skillRanks[skillId] = 0;
      this.skillCooldowns[skillId] = 0;
    }
    this.skillRanks.whirlwind = 1;
    this.skillRanks['moon-dash'] = 1;
    this.skillRanks['blade-mastery'] = 1;
    this.skillPoints = 1;
    this.resetAttributeProgress();
    this.playerRoute = [];
    this.movementWaypoint = null;
    this.routedMovementGoal = null;
    this.playerActive = false;
    this.playerRespawnAt = 0;
    this.pendingPlayerAttack = null;
    this.pendingMonsterAttacks = [];
    for (const monster of this.monsters) {
      const potentialPathTarget = (
        isGwanghaeCoupStageRegion(monster.region) && monster.kind === 'royal-guard'
      ) || (
        monster.region === 'jeonjufield' && isJeonjuSoldier(monster.kind)
      );
      if (potentialPathTarget) {
        const base = MONSTER_DATA[monster.kind];
        monster.name = base.name;
        monster.level = base.level;
        monster.damage = base.damage;
        monster.maxHp = base.hp;
        monster.hp = base.hp;
        monster.alive = true;
        monster.respawnAt = 0;
        monster.x = monster.spawn.x;
        monster.y = monster.spawn.y;
      }
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
      monster.velocity = { x: 0, y: 0 };
    }
    this.suppressDuplicateGwanghaeRoyalActor();
    this.regionGateCooldownUntil = this.elapsed + 1;
    this.events.push({ type: 'region-changed', region: this.region });
    this.events.push({
      type: 'item-equipped',
      itemId: sword.itemId,
      itemName: ITEM_CATALOG[sword.itemId].name,
      equipped: true,
    });
  }

  getPlayerOrigin(): PlayerOrigin { return this.playerOrigin; }
  getStoryCampaignState(): StoryCampaignState {
    return normalizeStoryCampaignState(this.storyCampaignState, this.playerOrigin);
  }
  setStoryCampaignState(state: StoryCampaignState): void {
    this.storyCampaignState = normalizeStoryCampaignState(state, this.playerOrigin);
  }
  resetStoryCampaignState(): void {
    this.storyCampaignState = createStoryCampaignState(this.playerOrigin);
  }
  isFrontierArcher(): boolean { return this.playerOrigin === 'frontier-archer'; }
  isOsakaMudang(): boolean { return this.playerOrigin === 'osaka-mudang'; }
  isGwanghaePrince(): boolean { return this.playerOrigin === 'gwanghae-prince'; }

  getGwanghaeRallyProgress(): GwanghaeRallyProgress {
    const completedMilestones = this.factionWarState.resolvedMilestones;
    const prerequisiteMilestone = `${GWANGHAE_RALLY_MILESTONE_PREFIX}changdeok-secretary`;
    const prerequisiteCompleted = completedMilestones.includes(prerequisiteMilestone);
    const points = GWANGHAE_MILITIA_RALLY_NPC_IDS.map((npcId): GwanghaeRallyPointProgress => {
      const point = GWANGHAE_MILITIA_RALLY_POINTS[npcId];
      const completed = completedMilestones.includes(`${GWANGHAE_RALLY_MILESTONE_PREFIX}${npcId}`);
      return {
        ...point,
        completed,
        available: !completed && (npcId === 'changdeok-secretary' || prerequisiteCompleted),
      };
    });
    const completedPoints = points.filter((point) => point.completed);
    const path = completedMilestones.includes(GWANGHAE_PATH_MILESTONES.coup)
      ? 'coup'
      : completedMilestones.includes(GWANGHAE_PATH_MILESTONES.suppression)
        ? 'suppression'
        : null;
    return {
      completed: completedPoints.length,
      total: points.length,
      recruits: completedPoints.reduce((total, point) => total + point.recruits, 0),
      reserve: Math.floor(this.factionWarState.reserve['joseon-court']),
      strength: this.factionWarState.strength['joseon-court'],
      choiceReady: completedPoints.length === points.length && path === null,
      path,
      points,
    };
  }

  rallyGwanghaeMilitia(npcId: string): GwanghaeMilitiaRallyResult {
    const blocked = (
      reason: GwanghaeMilitiaRallyBlockedReason,
      extra: { expectedRegion?: RegionId; requiredNpcId?: GwanghaeMilitiaRallyNpcId } = {},
    ): GwanghaeMilitiaRallyResult => {
      this.events.push({
        type: 'gwanghae-militia-rally-blocked',
        npcId,
        reason,
        ...extra,
      });
      return { ok: false, npcId, reason, ...extra, progress: this.getGwanghaeRallyProgress() };
    };

    if (!this.isGwanghaePrince()) return blocked('not-gwanghae');
    if (!isGwanghaeMilitiaRallyNpc(npcId)) return blocked('unknown-npc');
    const point = GWANGHAE_MILITIA_RALLY_POINTS[npcId];
    if (this.region !== point.region) return blocked('wrong-region', { expectedRegion: point.region });
    const milestone = `${GWANGHAE_RALLY_MILESTONE_PREFIX}${npcId}`;
    if (this.factionWarState.resolvedMilestones.includes(milestone)) {
      return blocked('already-rallied');
    }
    if (npcId !== 'changdeok-secretary'
      && !this.factionWarState.resolvedMilestones.includes(
        `${GWANGHAE_RALLY_MILESTONE_PREFIX}changdeok-secretary`,
      )) {
      return blocked('prerequisite', { requiredNpcId: 'changdeok-secretary' });
    }

    const rally = rallyFactionReserve(
      this.factionWarState,
      milestone,
      'joseon-court',
      point.recruits,
      point.strengthGain,
      `${point.label} · ${point.message}`,
      this.player.level,
    );
    if (!rally.rallied) return blocked('already-rallied');

    const progress = this.getGwanghaeRallyProgress();
    this.events.push({
      type: 'gwanghae-militia-rallied',
      npcId,
      region: point.region,
      label: point.label,
      message: point.message,
      recruits: rally.reserveAdded,
      reserve: rally.reserve,
      completed: progress.completed,
      total: progress.total,
      choiceReady: progress.choiceReady,
    });
    return {
      ok: true,
      point,
      reserveAdded: rally.reserveAdded,
      strengthAdded: rally.strengthAdded,
      progress,
    };
  }

  chooseGwanghaePath(path: GwanghaeCampaignPath): GwanghaePathChoiceResult {
    const blocked = (
      reason: GwanghaePathChoiceBlockedReason,
      extra: { remaining?: number; selectedPath?: GwanghaeCampaignPath } = {},
    ): GwanghaePathChoiceResult => {
      this.events.push({ type: 'gwanghae-path-blocked', path, reason, ...extra });
      return { ok: false, path, reason, ...extra, progress: this.getGwanghaeRallyProgress() };
    };

    if (!this.isGwanghaePrince()) return blocked('not-gwanghae');
    const before = this.getGwanghaeRallyProgress();
    if (before.path) return blocked('already-chosen', { selectedPath: before.path });
    if (before.completed < before.total) {
      return blocked('rallies-incomplete', { remaining: before.total - before.completed });
    }

    const decision = path === 'coup'
      ? {
        title: '쿠데타 · 분조 정변',
        message: '광해는 의병과 분조군의 뜻을 묶어, 백성을 버린 선조를 몰아내고 새 조정을 세우기로 결단했다.',
        reserveRetainedRatio: 1,
        strengthGain: 4,
      }
      : {
        title: '왕명에 따른 의병 해산',
        message: '광해는 왕명을 좇아 의병을 해산하고 저항하는 군세를 진압했다. 조정의 통제는 강해졌으나 수많은 의병이 떠났다.',
        reserveRetainedRatio: 0.45,
        strengthGain: 6,
      };
    const resolved = resolveFactionDecision(
      this.factionWarState,
      GWANGHAE_PATH_MILESTONES[path],
      'joseon-court',
      {
        reserveRetainedRatio: decision.reserveRetainedRatio,
        strengthGain: decision.strengthGain,
        chronicle: `${decision.title} · ${decision.message}`,
      },
      this.player.level,
    );
    if (!resolved.resolved) return blocked('already-chosen', { selectedPath: path });

    this.initializeGwanghaeBattleAttrition(path);
    if (path === 'suppression') {
      const militia = this.followers.filter((follower) => follower.route === 'bunjo');
      const retained = Math.floor(militia.length * decision.reserveRetainedRatio);
      const retainedIds = new Set(militia.slice(0, retained).map((follower) => follower.id));
      const remainingFollowers = this.followers.filter((follower) =>
        follower.route !== 'bunjo' || retainedIds.has(follower.id));
      this.followers.splice(0, this.followers.length, ...remainingFollowers);
    }

    const progress = this.getGwanghaeRallyProgress();
    this.events.push({
      type: 'gwanghae-path-chosen',
      path,
      title: decision.title,
      message: decision.message,
      reserve: progress.reserve,
      strength: progress.strength,
    });
    return {
      ok: true,
      path,
      title: decision.title,
      message: decision.message,
      reserveBefore: resolved.reserveBefore,
      strengthBefore: resolved.strengthBefore,
      progress,
    };
  }

  private initializeGwanghaeBattleAttrition(path: GwanghaeCampaignPath): void {
    const targets = this.monsters.filter((monster) => isGwanghaePathTargetMonster(path, monster));
    this.gwanghaeEnemyReserve = GWANGHAE_ENEMY_RESERVE[path];
    this.gwanghaeEnemyInitialTotal = targets.length + this.gwanghaeEnemyReserve;
  }

  getGwanghaePathBattleProgress(): GwanghaePathBattleProgress | null {
    if (!this.isGwanghaePrince()) return null;
    const path = this.getGwanghaeRallyProgress().path;
    if (!path) return null;
    const battle = GWANGHAE_PATH_BATTLES[path];
    const targets = this.monsters.filter((monster) => isGwanghaePathTargetMonster(path, monster));
    const complete = this.factionWarState.resolvedMilestones.includes(
      GWANGHAE_PATH_BATTLE_MILESTONES[path],
    );
    const enemyFielded = complete ? 0 : targets.filter((monster) => monster.alive).length;
    const enemyPending = complete ? 0 : targets.filter((monster) =>
      !monster.alive && Number.isFinite(monster.respawnAt)).length;
    const enemyReserve = complete ? 0 : Math.max(0, Math.floor(this.gwanghaeEnemyReserve));
    const enemyRemaining = enemyFielded + enemyPending + enemyReserve;
    const initialTotal = Math.max(
      targets.length,
      this.gwanghaeEnemyInitialTotal || targets.length + enemyReserve,
    );
    return {
      path,
      region: battle.region,
      title: battle.title,
      defeated: complete ? initialTotal : Math.max(0, initialTotal - enemyRemaining),
      total: initialTotal,
      enemyFielded,
      enemyPending,
      enemyReserve,
      enemyRemaining,
      complete,
      rewardGold: battle.rewardGold,
      rewardXp: battle.rewardXp,
    };
  }

  private activeGwanghaeCoupStageRegion(): GwanghaeCoupStageRegion | null {
    if (!this.isGwanghaePrince() || this.getGwanghaeRallyProgress().path !== 'coup') return null;
    return GWANGHAE_COUP_STAGE_REGIONS.find((region) =>
      !this.factionWarState.resolvedMilestones.includes(
        GWANGHAE_COUP_STAGE_MILESTONES[region],
      )) ?? null;
  }

  getGwanghaeCoupStageProgress(
    region: GwanghaeCoupStageRegion,
  ): GwanghaeCoupStageProgress | null {
    if (!this.isGwanghaePrince() || this.getGwanghaeRallyProgress().path !== 'coup') return null;
    const stageIndex = GWANGHAE_COUP_STAGE_REGIONS.indexOf(region);
    if (stageIndex < 0) return null;
    const targets = this.monsters.filter((monster) =>
      monster.region === region && monster.kind === 'royal-guard');
    const milestoneComplete = this.factionWarState.resolvedMilestones.includes(
      GWANGHAE_COUP_STAGE_MILESTONES[region],
    );
    const enemyFielded = milestoneComplete ? 0 : targets.filter((monster) => monster.alive).length;
    const enemyPending = milestoneComplete ? 0 : targets.filter((monster) =>
      !monster.alive && Number.isFinite(monster.respawnAt)).length;
    const enemyReserve = milestoneComplete || this.activeGwanghaeCoupStageRegion() !== region
      ? 0
      : Math.max(0, Math.floor(this.gwanghaeEnemyReserve));
    const enemyRemaining = enemyFielded + enemyPending + enemyReserve;
    const total = targets.length + (stageIndex === 0
      ? Math.max(0, this.gwanghaeEnemyInitialTotal - this.monsters.filter((monster) =>
        isGwanghaeCoupStageRegion(monster.region) && monster.kind === 'royal-guard').length)
      : 0);
    const complete = milestoneComplete || (total > 0 && enemyRemaining === 0);
    const stage = GWANGHAE_COUP_STAGES[region];
    return {
      region,
      stageIndex: stageIndex as 0 | 1 | 2,
      stageNumber: (stageIndex + 1) as 1 | 2 | 3,
      totalStages: 3,
      title: stage.title,
      defeated: complete ? total : Math.max(0, total - enemyRemaining),
      total,
      enemyFielded: complete ? 0 : enemyFielded,
      enemyPending: complete ? 0 : enemyPending,
      enemyReserve: complete ? 0 : enemyReserve,
      enemyRemaining: complete ? 0 : enemyRemaining,
      complete,
      nextRegion: stage.nextRegion,
    };
  }

  beginGwanghaePathBattle(): GwanghaePathBattleProgress | null {
    const progress = this.getGwanghaePathBattleProgress();
    if (!progress || progress.complete) return progress;
    if (this.gwanghaeEnemyInitialTotal <= 0) this.initializeGwanghaeBattleAttrition(progress.path);
    this.applyGwanghaePathBattleIdentity();
    if (this.region !== progress.region) this.travelToCampaignRegion(progress.region, 'south');
    const activeCoupStage = progress.path === 'coup'
      ? this.activeGwanghaeCoupStageRegion()
      : null;
    for (const monster of this.monsters) {
      if (!monster.alive || !isGwanghaePathTargetMonster(progress.path, monster)) continue;
      if (activeCoupStage && monster.region !== activeCoupStage) {
        monster.aggro = false;
        monster.aiState = 'patrol';
        continue;
      }
      monster.aggro = true;
      monster.aiState = 'alert';
      monster.thinkTimer = 0;
    }
    this.events.push({
      type: 'gwanghae-path-battle-started',
      path: progress.path,
      region: progress.region,
      title: progress.title,
      total: progress.total,
    });
    return this.getGwanghaePathBattleProgress();
  }

  completeGwanghaeRalliesForPlaytest(): boolean {
    if (!import.meta.env.DEV || !this.isGwanghaePrince()) return false;
    const originalRegion = this.region;
    for (const npcId of GWANGHAE_MILITIA_RALLY_NPC_IDS) {
      const point = GWANGHAE_MILITIA_RALLY_POINTS[npcId];
      this.region = point.region;
      if (!this.factionWarState.resolvedMilestones.includes(
        `${GWANGHAE_RALLY_MILESTONE_PREFIX}${npcId}`,
      )) {
        this.rallyGwanghaeMilitia(npcId);
      }
    }
    this.region = originalRegion;
    const preservedEvents = this.events.filter((event) => event.type !== 'gwanghae-militia-rallied');
    this.events.splice(0, this.events.length, ...preservedEvents);
    return this.getGwanghaeRallyProgress().choiceReady;
  }

  private applyGwanghaePathBattleIdentity(): void {
    if (!this.isGwanghaePrince()) return;
    const path = this.getGwanghaeRallyProgress().path;
    if (!path) return;
    const suppressionNames: Partial<Record<MonsterKind, string>> = {
      'jeonju-swordsman': '삼남 의병 환도수',
      'jeonju-spearman': '삼남 의병 장창수',
      'jeonju-archer': '삼남 의병 궁수',
      'jeonju-shield': '삼남 의병 방패수',
      'jeonju-commander': '삼남 의병장',
      'jeonju-militia-sickle': '삼남 의병 낫군',
    };
    for (const monster of this.monsters) {
      if (!isGwanghaePathTargetMonster(path, monster)) continue;
      const wasAtFullHealth = monster.hp >= monster.maxHp;
      const maxHp = path === 'coup' ? 112 : monster.kind === 'jeonju-shield' ? 118 : 92;
      monster.name = path === 'coup'
        ? '선조 친위 내금위'
        : suppressionNames[monster.kind] ?? '삼남 의병';
      monster.level = path === 'coup' ? 4 : 3;
      monster.damage = path === 'coup' ? 8 : 6;
      monster.maxHp = maxHp;
      monster.hp = monster.alive
        ? wasAtFullHealth ? maxHp : Math.min(monster.hp, maxHp)
        : 0;
    }
  }

  private suppressDuplicateGwanghaeRoyalActor(): void {
    if (!this.isGwanghaePrince()) return;
    const duplicate = this.monsters.find((monster) =>
      monster.region === 'gyeongbokinner' && monster.kind === 'joseon-prince');
    if (!duplicate) return;
    duplicate.alive = false;
    duplicate.hp = 0;
    duplicate.respawnAt = Number.POSITIVE_INFINITY;
    duplicate.aggro = false;
    duplicate.aiState = 'stunned';
    duplicate.velocity = { x: 0, y: 0 };
  }

  private checkGwanghaeCoupStageVictory(region: GwanghaeCoupStageRegion): void {
    const progress = this.getGwanghaeCoupStageProgress(region);
    if (!progress?.complete) return;
    const milestone = GWANGHAE_COUP_STAGE_MILESTONES[region];
    if (this.factionWarState.resolvedMilestones.includes(milestone)) return;
    this.factionWarState.resolvedMilestones.push(milestone);
    this.regionGateCooldownUntil = this.elapsed;
    this.events.push({
      type: 'gwanghae-coup-stage-cleared',
      region,
      nextRegion: progress.nextRegion,
      stageNumber: progress.stageNumber,
      stageTitle: progress.title,
      defeated: progress.total,
    });
    const nextRegion = this.activeGwanghaeCoupStageRegion();
    if (!nextRegion) return;
    for (const monster of this.monsters) {
      if (monster.region !== nextRegion || monster.kind !== 'royal-guard' || !monster.alive) continue;
      monster.aggro = true;
      monster.aiState = 'alert';
      monster.thinkTimer = 0;
    }
  }

  private markGwanghaePathBattleCleared(path: GwanghaeCampaignPath): void {
    this.gwanghaeEnemyReserve = 0;
    for (const monster of this.monsters) {
      if (!isGwanghaePathTargetMonster(path, monster)) continue;
      monster.alive = false;
      monster.hp = 0;
      monster.respawnAt = Number.POSITIVE_INFINITY;
      monster.aggro = false;
      monster.aiState = 'stunned';
      monster.velocity = { x: 0, y: 0 };
    }
  }

  private checkGwanghaePathBattleVictory(): void {
    const progress = this.getGwanghaePathBattleProgress();
    if (!progress || progress.complete || progress.total === 0 || progress.enemyRemaining > 0) return;
    const milestone = GWANGHAE_PATH_BATTLE_MILESTONES[progress.path];
    if (this.factionWarState.resolvedMilestones.includes(milestone)) return;
    this.factionWarState.resolvedMilestones.push(milestone);
    this.factionWarState.chronicle.unshift(`${progress.title} · 전투 목표 ${progress.total}명 제압`);
    this.factionWarState.chronicle.splice(8);
    this.player.gold += progress.rewardGold;
    this.player.xp += progress.rewardXp;
    this.events.push({
      type: 'gwanghae-path-battle-cleared',
      path: progress.path,
      region: progress.region,
      title: progress.title,
      defeated: progress.total,
      rewardGold: progress.rewardGold,
      rewardXp: progress.rewardXp,
    });
  }

  getFactionWarSnapshot(): FactionWarSnapshot {
    const snapshot = factionWarSnapshot(this.factionWarState, this.player.level);
    if (!this.isFrontierArcher() || this.hajinSouthwardMarch) return snapshot;
    const allied = this.jurchenAlliedTribeCount();
    const league = snapshot.factions.find((faction) => faction.id === 'jurchen-league');
    if (league) {
      league.reserve = this.hajinArmyReserve;
      league.strength = Math.min(58, 18 + allied * 12);
      league.recoveryPerMinute = this.isJurchenUnified() ? 18 : 0;
    }
    const home = snapshot.strongholds.find((stronghold) => stronghold.id === 'jurchen');
    if (home) {
      home.garrison = 120 + allied * 170;
      home.lastBattle = this.isJurchenUnified()
        ? '세 부족 대회맹 완성'
        : `압록 패전 뒤 부족 맹약 ${allied}/3`;
    }
    snapshot.activeConflict = {
      title: this.isJurchenUnified()
        ? '압록 첫 패전의 설욕전'
        : `여진 부족 통합 ${allied} / ${JURCHEN_TRIBE_REGION_IDS.length}`,
      attacker: 'jurchen-league',
      defender: this.isJurchenUnified() ? 'joseon-court' : 'jurchen-league',
      stronghold: this.isJurchenUnified() ? 'yalu' : 'jurchen',
    };
    snapshot.chronicle = [
      this.isJurchenUnified()
        ? '장백산 세 부족이 하나의 군기로 회맹했다.'
        : `하진이 압록에서 패한 뒤 ${allied}개 부족의 맹약을 얻었다.`,
      ...snapshot.chronicle,
    ].slice(0, 4);
    return snapshot;
  }

  startOsakaMudangStory(): void {
    this.playerOrigin = 'osaka-mudang';
    this.storyCampaignState = createStoryCampaignState(this.playerOrigin);
    this.factionWarState = createFactionWarState(this.playerOrigin);
    this.gwanghaeEnemyReserve = 0;
    this.gwanghaeEnemyInitialTotal = 0;
    this.region = 'osaka';
    this.royalRefugeState = createRoyalRefugeCampaignState();
    this.visitedRegions.clear();
    this.visitedRegions.add(this.region);
    const origin = REGION_ORIGINS.osaka;
    Object.assign(this.player, {
      x: origin.x + MAP_WIDTH / 2,
      y: origin.y + 850,
      hp: 132,
      maxHp: 132,
      level: 1,
      xp: 0,
      xpToNext: 80,
      gold: 12,
      potions: 2,
      kills: 0,
      destination: null,
      targetId: null,
      lootTargetId: null,
      attackCooldown: 0,
      dodgeCooldown: 0,
      momentum: 0,
      momentumActive: 0,
      combo: 0,
      comboTimer: 0,
      facing: -Math.PI / 2,
    });
    this.inventory.splice(0);
    this.followers.splice(0);
    this.equipment.weapon = null;
    this.equipment.armor = null;
    this.equipment.charm = null;
    for (const skillId of Object.keys(this.skillRanks) as SkillId[]) {
      this.skillRanks[skillId] = SHAMAN_ACTIVE_SKILL_IDS.includes(skillId) ? 1 : 0;
      this.skillCooldowns[skillId] = 0;
    }
    this.skillPoints = 1;
    this.resetAttributeProgress();
    this.playerRoute = [];
    this.movementWaypoint = null;
    this.routedMovementGoal = null;
    this.playerActive = false;
    this.pendingPlayerAttack = null;
    this.pendingMonsterAttacks = [];
    this.japanCleared.clear();
    this.shogunSecondPhase = false;
    for (const monster of this.monsters) {
      if (isJapanRegion(monster.region)) {
        monster.alive = true;
        monster.hp = monster.maxHp;
        monster.respawnAt = Number.POSITIVE_INFINITY;
      }
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
    }
    this.regionGateCooldownUntil = this.elapsed + 1;
    this.events.push({ type: 'region-changed', region: this.region });
  }
  isJurchenUnified(): boolean {
    return this.isFrontierArcher()
      && JURCHEN_EXPANSION_REGION_IDS.every((region) => this.jurchenCleared.has(region));
  }
  getJurchenUnificationProgress(): {
    alliedTribes: number;
    totalTribes: number;
    clearedStages: number;
    totalStages: number;
    unified: boolean;
  } {
    return {
      alliedTribes: this.jurchenAlliedTribeCount(),
      totalTribes: JURCHEN_TRIBE_REGION_IDS.length,
      clearedStages: this.jurchenCleared.size,
      totalStages: JURCHEN_EXPANSION_REGION_IDS.length,
      unified: this.isJurchenUnified(),
    };
  }
  getJurchenStageProgress(region: JurchenExpansionRegionId): {
    defeated: number;
    total: number;
    cleared: boolean;
  } {
    const targets = this.jurchenStageTargets(region);
    const cleared = this.jurchenCleared.has(region);
    return {
      defeated: cleared ? targets.length : targets.filter((monster) => !monster.alive).length,
      total: targets.length,
      cleared,
    };
  }
  completeJurchenStageForPlaytest(region: JurchenExpansionRegionId): boolean {
    if (!import.meta.env.DEV || !this.isFrontierArcher()) return false;
    for (const monster of this.jurchenStageTargets(region)) {
      if (monster.alive) this.killMonster(monster);
    }
    return this.jurchenCleared.has(region);
  }
  completeJurchenUnificationForPlaytest(): boolean {
    if (!import.meta.env.DEV || !this.isFrontierArcher()) return false;
    for (const region of JURCHEN_EXPANSION_REGION_IDS) {
      for (const monster of this.jurchenStageTargets(region)) {
        if (monster.alive) this.killMonster(monster);
      }
    }
    return this.isJurchenUnified();
  }
  isHajinSouthwardMarchReady(): boolean { return this.isFrontierArcher() && this.hajinSouthwardMarch; }
  getHajinMissionProgress(): { defeated: number; total: number; soldiers: number; civilians: number; cleared: boolean } {
    const soldiers = this.frontierMissionTargets();
    const civilians = this.monsters.filter((monster) =>
      monster.region === 'manchufrontier' && isJoseonCivilian(monster.kind));
    return {
      defeated: soldiers.filter((monster) => !monster.alive).length,
      total: soldiers.length,
      soldiers: soldiers.filter((monster) => !monster.alive).length,
      civilians: civilians.filter((monster) => !monster.alive).length,
      cleared: this.hajinSouthwardMarch,
    };
  }
  getHajinArmyStatus(): {
    reserve: number;
    fielded: number;
    fieldCap: number;
    waveSize: number;
    unlocked: boolean;
    alliedTribes: number;
    totalTribes: number;
    unified: boolean;
  } {
    const reserve = this.isFrontierArcher()
      ? Math.floor(this.factionWarState.reserve['jurchen-league'])
      : 0;
    return {
      reserve,
      fielded: this.followers.filter((follower) => follower.route === 'invasion').length,
      fieldCap: HAJIN_FIELD_ARMY_CAP,
      waveSize: HAJIN_REINFORCEMENT_WAVE,
      unlocked: this.hajinSouthwardMarch,
      alliedTribes: this.jurchenAlliedTribeCount(),
      totalTribes: JURCHEN_TRIBE_REGION_IDS.length,
      unified: this.isJurchenUnified(),
    };
  }
  callHajinReinforcements(): boolean {
    const fielded = this.followers.filter((follower) => follower.route === 'invasion').length;
    this.hajinArmyReserve = Math.floor(this.factionWarState.reserve['jurchen-league']);
    if (!this.isFrontierArcher() || !this.hajinSouthwardMarch) {
      this.events.push({
        type: 'hajin-reinforcements-blocked',
        reason: 'mission',
        reserve: this.hajinArmyReserve,
        fielded,
      });
      return false;
    }
    if (this.hajinArmyReserve < HAJIN_REINFORCEMENT_WAVE) {
      this.events.push({
        type: 'hajin-reinforcements-blocked',
        reason: 'reserve',
        reserve: this.hajinArmyReserve,
        fielded,
      });
      return false;
    }
    if (HAJIN_FIELD_ARMY_CAP - fielded < HAJIN_REINFORCEMENT_WAVE) {
      this.events.push({
        type: 'hajin-reinforcements-blocked',
        reason: 'field-capacity',
        reserve: this.hajinArmyReserve,
        fielded,
      });
      return false;
    }
    const kinds: FollowerKind[] = [
      'jurchen-captain',
      'jurchen-vanguard', 'jurchen-vanguard', 'jurchen-vanguard', 'jurchen-vanguard',
      'jurchen-bowguard', 'jurchen-bowguard', 'jurchen-bowguard', 'jurchen-bowguard', 'jurchen-bowguard',
    ];
    for (const [index, kind] of kinds.entries()) {
      const definition = FOLLOWER_CATALOG[kind];
      const angle = Math.PI * 2 * index / kinds.length;
      const follower: FollowerState = {
        id: `hajin-reinforcement-${this.followerCounter++}-${index}`,
        kind,
        name: kind === 'jurchen-captain'
          ? `백인대장 ${Math.floor(this.followerCounter / 10)}진`
          : kind === 'jurchen-vanguard'
            ? `철갑 장창수 ${this.followerCounter}`
            : `여진 각궁수 ${this.followerCounter}`,
        route: 'invasion',
        visualKind: definition.visualKind,
        x: this.player.x + Math.cos(angle) * (118 + (index % 2) * 34),
        y: this.player.y + Math.sin(angle) * (88 + (index % 2) * 26),
        facing: this.player.facing,
        velocity: { x: 0, y: 0 },
        attackCooldown: 0.2 + index * 0.025,
        actionTimer: 0,
        targetId: null,
      };
      this.followers.push(follower);
      this.events.push({ type: 'follower-recruited', follower: { ...follower, velocity: { ...follower.velocity } }, route: 'invasion', cost: 0 });
    }
    this.hajinArmyReserve -= HAJIN_REINFORCEMENT_WAVE;
    this.factionWarState.reserve['jurchen-league'] = this.hajinArmyReserve;
    const nextFielded = fielded + HAJIN_REINFORCEMENT_WAVE;
    this.events.push({
      type: 'hajin-reinforcements-called',
      deployed: HAJIN_REINFORCEMENT_WAVE,
      reserve: this.hajinArmyReserve,
      fielded: nextFielded,
    });
    return true;
  }
  getGwanghaeArmyStatus(): {
    reserve: number;
    reserveCapacity: number;
    fielded: number;
    fieldCap: number;
    waveSize: number;
    unlocked: boolean;
    ralliedDistricts: number;
    totalDistricts: number;
    path: GwanghaeCampaignPath | null;
    enemyFielded: number;
    enemyPending: number;
    enemyReserve: number;
    enemyRemaining: number;
    enemyTotal: number;
  } {
    const rally = this.getGwanghaeRallyProgress();
    const battle = this.getGwanghaePathBattleProgress();
    const registerIssued = rally.points.some((point) =>
      point.npcId === 'changdeok-secretary' && point.completed);
    return {
      reserve: this.isGwanghaePrince()
        ? Math.floor(this.factionWarState.reserve['joseon-court'])
        : 0,
      reserveCapacity: this.isGwanghaePrince()
        ? reserveCapacityForFaction(this.factionWarState, 'joseon-court', this.player.level)
        : 0,
      fielded: this.followers.filter((follower) => follower.route === 'bunjo').length,
      fieldCap: GWANGHAE_FIELD_ARMY_CAP,
      waveSize: GWANGHAE_REINFORCEMENT_WAVE,
      unlocked: this.isGwanghaePrince() && registerIssued && rally.path !== 'suppression',
      ralliedDistricts: rally.completed,
      totalDistricts: rally.total,
      path: rally.path,
      enemyFielded: battle?.enemyFielded ?? 0,
      enemyPending: battle?.enemyPending ?? 0,
      enemyReserve: battle?.enemyReserve ?? 0,
      enemyRemaining: battle?.enemyRemaining ?? 0,
      enemyTotal: battle?.total ?? 0,
    };
  }
  callGwanghaeReinforcements(): boolean {
    const status = this.getGwanghaeArmyStatus();
    const blocked = (
      reason: Extract<GameEvent, { type: 'gwanghae-reinforcements-blocked' }>['reason'],
    ): false => {
      this.events.push({
        type: 'gwanghae-reinforcements-blocked',
        reason,
        reserve: status.reserve,
        fielded: status.fielded,
      });
      return false;
    };
    if (!this.isGwanghaePrince()) return blocked('not-gwanghae');
    if (status.path === 'suppression') return blocked('suppression');
    if (!status.unlocked) return blocked('register');
    if (status.reserve < GWANGHAE_REINFORCEMENT_WAVE) return blocked('reserve');
    if (GWANGHAE_FIELD_ARMY_CAP - status.fielded < GWANGHAE_REINFORCEMENT_WAVE) {
      return blocked('field-capacity');
    }

    const kinds: FollowerKind[] = [
      'gwanghae-captain',
      'gwanghae-spearman', 'gwanghae-spearman', 'gwanghae-spearman', 'gwanghae-spearman',
      'gwanghae-archer', 'gwanghae-archer', 'gwanghae-archer',
      'gwanghae-militia', 'gwanghae-militia',
    ];
    const waveNumber = Math.floor(status.fielded / GWANGHAE_REINFORCEMENT_WAVE) + 1;
    for (const [index, kind] of kinds.entries()) {
      const definition = FOLLOWER_CATALOG[kind];
      const column = index % 5;
      const row = Math.floor(index / 5);
      const follower: FollowerState = {
        id: `gwanghae-bunjo-${this.followerCounter++}-${index}`,
        kind,
        name: kind === 'gwanghae-captain'
          ? `분조 ${waveNumber}진 군관`
          : kind === 'gwanghae-spearman'
            ? `분조 장창수 ${this.followerCounter}`
            : kind === 'gwanghae-archer'
              ? `분조 각궁수 ${this.followerCounter}`
              : `분조 의병 ${this.followerCounter}`,
        route: 'bunjo',
        visualKind: definition.visualKind,
        x: this.player.x + (column - 2) * 48,
        y: this.player.y + 92 + row * 46,
        facing: this.player.facing,
        velocity: { x: 0, y: 0 },
        attackCooldown: 0.16 + index * 0.025,
        actionTimer: 0,
        targetId: null,
      };
      this.followers.push(follower);
      this.events.push({
        type: 'follower-recruited',
        follower: { ...follower, velocity: { ...follower.velocity } },
        route: 'bunjo',
        cost: 0,
      });
    }
    this.factionWarState.reserve['joseon-court'] = Math.max(
      0,
      this.factionWarState.reserve['joseon-court'] - GWANGHAE_REINFORCEMENT_WAVE,
    );
    this.events.push({
      type: 'gwanghae-reinforcements-called',
      deployed: GWANGHAE_REINFORCEMENT_WAVE,
      reserve: Math.floor(this.factionWarState.reserve['joseon-court']),
      fielded: status.fielded + GWANGHAE_REINFORCEMENT_WAVE,
    });
    return true;
  }
  completeHajinFrontierMissionForPlaytest(): boolean {
    if (!import.meta.env.DEV || !this.isFrontierArcher() || this.region !== 'manchufrontier') return false;
    for (const monster of this.frontierMissionTargets()) {
      if (monster.alive) this.fallFrontierUnit(monster);
    }
    return this.hajinSouthwardMarch;
  }
  getTangeumBattleProgress(): { defeated: number; total: number; gunners: number; cleared: boolean } {
    const soldiers = this.monsters.filter((monster) => monster.region === 'tangeumdae' && isJapaneseSoldier(monster.kind));
    return {
      defeated: soldiers.filter((monster) => !monster.alive).length,
      total: soldiers.length,
      gunners: soldiers.filter((monster) => monster.kind === 'japanese-gunner').length,
      cleared: this.tangeumCleared,
    };
  }
  completeTangeumBattleForPlaytest(): boolean {
    if (!import.meta.env.DEV || this.region !== 'tangeumdae') return false;
    for (const monster of this.monsters) {
      if (monster.region === 'tangeumdae' && isJapaneseSoldier(monster.kind) && monster.alive) {
        monster.alive = false;
        monster.hp = 0;
        monster.respawnAt = Number.POSITIVE_INFINITY;
      }
    }
    this.checkTangeumBattleVictory();
    return this.tangeumCleared;
  }
  getPyongyangBattleProgress(region: PyongyangRegionId): { defeated: number; total: number; cleared: boolean } {
    const defenders = this.monsters.filter((monster) => monster.region === region && isGovernmentSoldier(monster.kind));
    return {
      defeated: defenders.filter((monster) => !monster.alive).length,
      total: defenders.length,
      cleared: this.pyongyangCleared.has(region),
    };
  }
  isPyongyangStageCleared(region: PyongyangRegionId): boolean {
    return this.pyongyangCleared.has(region);
  }
  completePyongyangStageForPlaytest(region: PyongyangRegionId): boolean {
    if (!import.meta.env.DEV || this.region !== region) return false;
    this.markPyongyangDefendersDefeated(region);
    this.checkPyongyangStageVictory(region);
    return this.pyongyangCleared.has(region);
  }
  getRoyalRefugeState(): RoyalRefugeCampaignState {
    return this.cloneRoyalRefugeState();
  }
  getRoyalRefugeEncounterCopy(): { title: string; dialogue: readonly string[] } {
    const coup = this.isGwanghaePrince() && this.getGwanghaeRallyProgress().path === 'coup';
    return coup ? GWANGHAE_KING_FLIGHT : KING_ENCOUNTER_AFTER_PYONGYANG;
  }
  getRoyalRefugeBattleProgress(): {
    routeId: RoyalRefugeRouteId | null;
    status: RoyalRefugeCampaignState['status'];
    stageIndex: 0 | 1 | 2 | null;
    stageName: string | null;
    defeated: number;
    total: number;
    cleared: boolean;
    finalDefenseComplete: boolean;
  } {
    const { routeId, activeStageIndex, finalDefenseComplete, status } = this.royalRefugeState;
    const stageIndex = activeStageIndex ?? (finalDefenseComplete ? 2 : null);
    if (!routeId || stageIndex === null) {
      return {
        routeId,
        status,
        stageIndex,
        stageName: null,
        defeated: 0,
        total: 0,
        cleared: finalDefenseComplete,
        finalDefenseComplete,
      };
    }
    const targets = this.royalRefugeStageTargets(routeId, stageIndex);
    return {
      routeId,
      status,
      stageIndex,
      stageName: ROYAL_REFUGE_ROUTES[routeId].stages[stageIndex].name,
      defeated: targets.filter((monster) => !monster.alive).length,
      total: targets.length,
      cleared: finalDefenseComplete
        || this.royalRefugeState.completedStageIds.includes(
          ROYAL_REFUGE_ROUTES[routeId].stages[stageIndex].id,
        ),
      finalDefenseComplete,
    };
  }
  beginRoyalRefugeAtKing(): boolean {
    if (this.region !== 'gyeongbokinner' || this.royalRefugeState.status !== 'locked') return false;
    const gwanghaeBattle = this.isGwanghaePrince()
      ? this.getGwanghaePathBattleProgress()
      : null;
    const gwanghaeCoupReady = Boolean(
      gwanghaeBattle?.path === 'coup' && gwanghaeBattle.complete,
    );
    const hajinReady = this.isFrontierArcher() && this.pyongyangCleared.has('pyongyanginner');
    if (!hajinReady && !gwanghaeCoupReady) return false;
    if (hajinReady) {
      const royalDefendersRemain = this.monsters.some((monster) =>
        monster.region === 'gyeongbokinner'
        && monster.alive
        && isGovernmentSoldier(monster.kind));
      if (royalDefendersRemain) return false;
    }
    const transition = beginRoyalRefugeCampaign(this.royalRefugeState, true);
    if (!transition.changed) return false;
    this.royalRefugeState = transition.state;
    const encounter = transition.events.find((event) => event.type === 'king-encountered-after-pyongyang');
    if (encounter?.type === 'king-encountered-after-pyongyang') {
      this.events.push({
        type: 'king-refuge-choice',
        title: gwanghaeCoupReady ? GWANGHAE_KING_FLIGHT.title : encounter.title,
        dialogue: gwanghaeCoupReady ? GWANGHAE_KING_FLIGHT.dialogue : encounter.dialogue,
      });
    }
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
    return true;
  }
  chooseRoyalRefugeRoute(routeId: RoyalRefugeRouteId): boolean {
    if (!isRoyalRefugeRouteId(routeId)) return false;
    const transition = chooseRoyalRefugeRouteState(this.royalRefugeState, routeId);
    if (!transition.changed) return false;
    this.royalRefugeState = transition.state;
    const selected = transition.events.find((event) => event.type === 'royal-refuge-route-selected');
    if (selected?.type === 'royal-refuge-route-selected') {
      this.events.push({
        type: 'royal-refuge-route-selected',
        routeId,
        routeName: selected.routeName,
        destination: selected.destination,
      });
    }
    this.travelToCampaignRegion(routeId, 'south');
    return this.region === routeId;
  }
  prepareRoyalRefugeForPlaytest(routeId: RoyalRefugeRouteId): boolean {
    if (!import.meta.env.DEV || !isRoyalRefugeRouteId(routeId)) return false;
    this.playerOrigin = 'frontier-archer';
    this.pyongyangCleared.add('pyongyangouter');
    this.pyongyangCleared.add('pyongyanggate');
    this.pyongyangCleared.add('pyongyanginner');
    const begun = beginRoyalRefugeCampaign(createRoyalRefugeCampaignState(), true);
    const chosen = chooseRoyalRefugeRouteState(begun.state, routeId);
    this.royalRefugeState = chosen.state;
    this.region = routeId;
    this.visitedRegions.add(routeId);
    const origin = REGION_ORIGINS[routeId];
    this.player.x = origin.x + MAP_WIDTH / 2;
    this.player.y = origin.y + 875;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
    for (const monster of this.monsters) {
      if (monster.region !== routeId) continue;
      monster.alive = true;
      monster.hp = monster.maxHp;
      monster.respawnAt = 0;
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.velocity = { x: 0, y: 0 };
    }
    this.events.push({ type: 'region-changed', region: routeId });
    return true;
  }
  prepareRoyalRefugeEncounterForPlaytest(): boolean {
    if (!import.meta.env.DEV) return false;
    this.playerOrigin = 'frontier-archer';
    this.pyongyangCleared.add('pyongyangouter');
    this.pyongyangCleared.add('pyongyanggate');
    this.pyongyangCleared.add('pyongyanginner');
    this.royalRefugeState = createRoyalRefugeCampaignState();
    this.region = 'gyeongbokinner';
    const origin = REGION_ORIGINS.gyeongbokinner;
    this.player.x = origin.x + 768;
    this.player.y = origin.y + 625;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
    for (const monster of this.monsters) {
      if (monster.region !== 'gyeongbokinner' || !isGovernmentSoldier(monster.kind)) continue;
      monster.alive = false;
      monster.hp = 0;
      monster.respawnAt = Number.POSITIVE_INFINITY;
      monster.aggro = false;
      monster.velocity = { x: 0, y: 0 };
    }
    this.events.push({ type: 'region-changed', region: this.region });
    return true;
  }
  completeRoyalRefugeStageForPlaytest(): boolean {
    if (!import.meta.env.DEV || !isRoyalRefugeRegion(this.region)) return false;
    const stageIndex = this.royalRefugeState.activeStageIndex;
    if (this.royalRefugeState.routeId !== this.region || stageIndex === null) return false;
    for (const monster of this.royalRefugeStageTargets(this.region, stageIndex)) {
      monster.alive = false;
      monster.hp = 0;
      monster.respawnAt = Number.POSITIVE_INFINITY;
      monster.aggro = false;
      monster.velocity = { x: 0, y: 0 };
    }
    this.checkRoyalRefugeStageVictory(this.region);
    return this.royalRefugeState.activeStageIndex !== stageIndex
      || this.royalRefugeState.finalDefenseComplete;
  }
  getJapanStageProgress(region: JapanRegionId): { defeated: number; total: number; cleared: boolean } {
    const targets = this.japanStageTargets(region);
    return {
      defeated: targets.filter((monster) => !monster.alive).length,
      total: targets.length,
      cleared: this.japanCleared.has(region),
    };
  }
  isJapanStageCleared(region: JapanRegionId): boolean {
    return this.japanCleared.has(region);
  }
  completeJapanStageForPlaytest(region: JapanRegionId): boolean {
    if (!import.meta.env.DEV || this.region !== region) return false;
    this.markJapanStageDefeated(region);
    this.checkJapanStageVictory(region);
    return this.japanCleared.has(region);
  }
  private isWorldMapNodeUnlocked(node: WorldMapNode): boolean {
    if (isWorldMapNodeDiscovered(node, this.visitedRegions)) return true;
    if (!this.isGwanghaePrince()) return false;
    const bunjoRegisterIssued = this.factionWarState.resolvedMilestones.includes(
      `${GWANGHAE_RALLY_MILESTONE_PREFIX}changdeok-secretary`,
    );
    if (!bunjoRegisterIssued) return false;
    return Object.values(GWANGHAE_MILITIA_RALLY_POINTS).some((point) =>
      node.regions.includes(point.region));
  }
  getUnlockedWorldMapRegions(): RegionId[] {
    return WORLD_MAP_NODES
      .filter((node) => this.isWorldMapNodeUnlocked(node))
      .map((node) => node.destination);
  }
  unlockAllWorldMapNodesForPlaytest(): boolean {
    if (!import.meta.env.DEV) return false;
    for (const node of WORLD_MAP_NODES) this.visitedRegions.add(node.destination);
    return true;
  }
  enableTravelMode(): void {
    this.travelModeEnabled = true;
    for (const region of TRAVEL_ATLAS_REGION_IDS) this.visitedRegions.add(region);
    for (const monster of this.monsters) {
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
      monster.velocity = { x: 0, y: 0 };
    }
    this.pendingMonsterAttacks = [];
    this.pendingPlayerAttack = null;
    this.activeWorldEvent = null;
    this.player.hp = this.player.maxHp;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
  }

  unlockTravelModeWorldMap(): void {
    this.enableTravelMode();
  }

  isTravelModeEnabled(): boolean {
    return this.travelModeEnabled;
  }

  moveGhostTo(point: Vec2): void {
    if (!this.travelModeEnabled) {
      this.moveTo(point);
      return;
    }
    const origin = REGION_ORIGINS[this.region];
    const destination = {
      x: Math.max(origin.x + 34, Math.min(origin.x + MAP_WIDTH - 34, point.x)),
      y: Math.max(origin.y + 34, Math.min(origin.y + MAP_HEIGHT - 34, point.y)),
    };
    this.playerActive = true;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.pendingPlayerAttack = null;
    this.pendingMonsterAttacks = [];
    this.playerRoute = [];
    this.movementWaypoint = destination;
    this.routedMovementGoal = destination;
    this.player.destination = destination;
  }

  travelByWorldMap(destination: RegionId): WorldMapTravelResult {
    if (this.travelModeEnabled) {
      if (!isTravelAtlasRegion(destination)) return destination === 'dungeon' ? 'dungeon' : 'locked';
      if (this.region === destination) return 'same';
      const origin = REGION_ORIGINS[destination];
      this.player.x = origin.x + MAP_WIDTH / 2;
      this.player.y = origin.y + travelAtlasArrivalY(destination);
      this.player.destination = null;
      this.player.targetId = null;
      this.player.lootTargetId = null;
      this.playerRoute = [];
      this.movementWaypoint = null;
      this.routedMovementGoal = null;
      this.playerActive = false;
      this.changeRegion(destination);
      return 'traveled';
    }
    if (this.region === 'dungeon') return 'dungeon';
    const node = WORLD_MAP_NODES.find((candidate) => candidate.destination === destination);
    if (!node || !this.isWorldMapNodeUnlocked(node)) return 'locked';
    if (this.region === node.destination) return 'same';
    const threatened = this.player.hp <= 0 || this.monsters.some((monster) =>
      monster.region === this.region
      && monster.alive
      && monster.aggro
      && !this.isFriendlyMonster(monster)
      && this.distance(monster, this.player) <= 560);
    if (threatened) return 'combat';

    const origin = REGION_ORIGINS[node.destination];
    this.player.x = origin.x + MAP_WIDTH / 2;
    this.player.y = origin.y + node.arrivalY;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerRoute = [];
    this.movementWaypoint = null;
    this.routedMovementGoal = null;
    this.playerActive = false;
    this.regionGateCooldownUntil = this.elapsed + 0.8;
    this.changeRegion(node.destination);
    return 'traveled';
  }
  isBowEquipped(): boolean { return this.getEquippedDefinition('weapon')?.weaponClass === 'bow'; }
  getPlayerAttackRange(): number {
    if (!this.isBowEquipped()) return 105;
    return this.skillRanks['great-bow-mastery'] > 0 ? 330 : 285;
  }
  isFriendlyMonster(monster: MonsterState): boolean {
    if (this.isGwanghaePrince()) {
      const path = this.getGwanghaeRallyProgress().path;
      if (path === 'coup' && isGwanghaePathTargetMonster(path, monster)) {
        return monster.region !== this.activeGwanghaeCoupStageRegion();
      }
      if (path === 'suppression' && isGwanghaePathTargetMonster(path, monster)) return false;
      if (path === 'coup'
        && this.royalRefugeState.status === 'in-progress'
        && this.royalRefugeState.routeId === monster.region
        && isGovernmentSoldier(monster.kind)) return false;
      return isGovernmentSoldier(monster.kind) || isJoseonCivilian(monster.kind);
    }
    if (monster.region === 'manchufrontier') {
      return this.isFrontierArcher() ? isFrontierJurchen(monster.kind) : isFrontierJoseon(monster.kind);
    }
    if (isJurchenRegion(monster.region)) {
      if (!this.isFrontierArcher() || !isFrontierJurchen(monster.kind)) return false;
      return monster.region === 'jurchenvillage'
        || (isJurchenExpansionRegion(monster.region)
          && JURCHEN_REGION_CATEGORY[monster.region] === 'village'
          && this.jurchenCleared.has(monster.region));
    }
    return false;
  }

  travelToCampaignRegion(region: RegionId, entrance: 'north' | 'south' = 'south'): void {
    const campaignRegions: RegionId[] = [
      'jeonjufield', 'jeonjugate', 'jeonju',
      'busanjin', 'tangeumdae', 'gyeongbokgate', 'gyeongbokcourt', 'gyeongbokinner',
      ...JOSEON_TOWN_REGION_IDS,
      ...JURCHEN_REGION_IDS, 'manchufrontier',
      'pyongyangouter', 'pyongyanggate', 'pyongyanginner',
      ...ROYAL_REFUGE_REGIONS,
      ...JAPAN_REGION_IDS,
      ...EPISODE2_REGION_IDS,
    ];
    if (!campaignRegions.includes(region)) return;
    const activeGwanghaeCoupStage = this.activeGwanghaeCoupStageRegion();
    const destinationCoupStageIndex = isGwanghaeCoupStageRegion(region)
      ? GWANGHAE_COUP_STAGE_REGIONS.indexOf(region)
      : -1;
    const activeCoupStageIndex = activeGwanghaeCoupStage
      ? GWANGHAE_COUP_STAGE_REGIONS.indexOf(activeGwanghaeCoupStage)
      : -1;
    if (activeGwanghaeCoupStage
      && destinationCoupStageIndex > activeCoupStageIndex) {
      const progress = this.getGwanghaeCoupStageProgress(activeGwanghaeCoupStage)!;
      this.events.push({
        type: 'gwanghae-coup-gate-blocked',
        region: this.region,
        destination: region,
        stageNumber: progress.stageNumber,
        stageTitle: progress.title,
        remaining: progress.enemyRemaining,
      });
      return;
    }
    if (
      this.isFrontierArcher()
      && this.region === 'pyongyanginner'
      && (region === 'gyeongbokcourt' || region === 'gyeongbokinner')
    ) return;
    if (this.region === 'tangeumdae' && region === 'gyeongbokgate' && !this.tangeumCleared) {
      const progress = this.getTangeumBattleProgress();
      this.events.push({ type: 'tangeum-gate-blocked', remaining: progress.total - progress.defeated });
      return;
    }
    if (isJapanRegion(this.region)
      && japanForwardDestination(this.region) === region
      && !this.japanCleared.has(this.region)) {
      const progress = this.getJapanStageProgress(this.region);
      const origin = REGION_ORIGINS[this.region];
      this.player.destination = {
        x: origin.x + MAP_WIDTH / 2,
        y: origin.y + 176,
      };
      this.movementWaypoint = this.player.destination;
      this.routedMovementGoal = this.player.destination;
      this.regionGateCooldownUntil = this.elapsed + 0.85;
      this.events.push({
        type: 'japan-gate-blocked',
        region: this.region,
        remaining: progress.total - progress.defeated,
      });
      return;
    }
    if (isJurchenExpansionRegion(this.region)
      && jurchenForwardDestination(this.region) === region
      && !this.jurchenCleared.has(this.region)) {
      const progress = this.getJurchenStageProgress(this.region);
      const origin = REGION_ORIGINS[this.region];
      this.player.destination = {
        x: origin.x + MAP_WIDTH / 2,
        y: origin.y + 176,
      };
      this.movementWaypoint = this.player.destination;
      this.routedMovementGoal = this.player.destination;
      this.regionGateCooldownUntil = this.elapsed + 0.85;
      this.events.push({
        type: 'jurchen-gate-blocked',
        region: this.region,
        remaining: progress.total - progress.defeated,
      });
      return;
    }
    if (this.isFrontierArcher()
      && this.region === 'jurchenvillage'
      && region === 'manchufrontier'
      && !this.isJurchenUnified()) {
      const progress = this.getJurchenUnificationProgress();
      this.events.push({
        type: 'jurchen-gate-blocked',
        region: 'jurchenvillage',
        remaining: progress.totalStages - progress.clearedStages,
      });
      return;
    }
    if (isPyongyangRegion(this.region)
      && this.pyongyangForwardDestination(this.region) === region
      && !this.pyongyangCleared.has(this.region)
      && !this.isGwanghaePrince()) {
      const progress = this.getPyongyangBattleProgress(this.region);
      const origin = REGION_ORIGINS[this.region];
      this.player.destination = {
        x: origin.x + MAP_WIDTH / 2,
        y: origin.y + (this.isFrontierArcher() ? 820 : 204),
      };
      this.movementWaypoint = this.player.destination;
      this.routedMovementGoal = this.player.destination;
      this.regionGateCooldownUntil = this.elapsed + 0.85;
      this.events.push({
        type: 'pyongyang-gate-blocked',
        region: this.region,
        remaining: progress.total - progress.defeated,
      });
      return;
    }
    const previousRegion = this.region;
    const previousOrigin = REGION_ORIGINS[previousRegion];
    const previousLocalX = this.player.x - previousOrigin.x;
    const origin = REGION_ORIGINS[region];
    const terrainSeam = worldTerrainSeamBetween(previousRegion, region);
    const continuousVerticalTravel = terrainSeam?.orientation === 'vertical';
    const continuousJoseonTownTravel = Boolean(terrainSeam)
      && isJoseonTownRegion(previousRegion)
      && isJoseonTownRegion(region);
    const joseonEntranceGate = continuousJoseonTownTravel
      ? JOSEON_TOWN_LAYOUTS[region].gates.find((candidate) => candidate.edge === entrance)
      : undefined;
    if (continuousJoseonTownTravel) {
      const laneCenter = joseonEntranceGate?.x ?? MAP_WIDTH / 2;
      const laneHalfWidth = Math.max(40, (joseonEntranceGate?.width ?? 344) / 2 - 28);
      this.player.x = origin.x + Math.max(
        laneCenter - laneHalfWidth,
        Math.min(laneCenter + laneHalfWidth, previousLocalX),
      );
    } else if (continuousVerticalTravel && terrainSeam) {
      const destinationLane = terrainSeam.from === region
        ? terrainSeam.fromLane
        : terrainSeam.toLane;
      // Preserve the complete authored gate corridor, not just the painted
      // centre rut. Otherwise a player entering near either shoulder still
      // receives a visible sideways snap.
      const laneHalfWidth = Math.max(150, terrainSeam.roadWidth / 2 - 16);
      this.player.x = origin.x + Math.max(
        destinationLane - laneHalfWidth,
        Math.min(destinationLane + laneHalfWidth, previousLocalX),
      );
    } else {
      this.player.x = origin.x + MAP_WIDTH / 2;
    }
    this.player.y = origin.y + (continuousJoseonTownTravel
      ? entrance === 'north'
        ? joseonEntranceGate && joseonEntranceGate.y > 100
          ? joseonEntranceGate.y + joseonEntranceGate.height / 2 + 28
          : 12
        : joseonEntranceGate && joseonEntranceGate.y < MAP_HEIGHT - 100
          ? joseonEntranceGate.y - joseonEntranceGate.height / 2 - 28
          : MAP_HEIGHT - 12
      : continuousVerticalTravel
      ? entrance === 'north' ? 12 : MAP_HEIGHT - 12
      : entrance === 'north' ? 210 : 840);
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerRoute = [];
    this.movementWaypoint = null;
    this.routedMovementGoal = null;
    this.playerActive = false;
    this.regionGateCooldownUntil = this.elapsed + 0.65;
    this.changeRegion(region);
    if (this.isFrontierArcher()
      && region === 'manchufrontier'
      && this.isJurchenUnified()
      && !this.hajinSouthwardMarch) {
      this.resetFrontierMissionTargets();
      this.frontierAmbushPhase = 'waiting';
      this.frontierAmbushAt = this.elapsed + 1.35;
      this.events.push({
        type: 'frontier-ambush-ready',
        jurchenCount: this.monsters.filter((monster) =>
          monster.region === 'manchufrontier' && isFrontierJurchen(monster.kind)).length,
        joseonCount: this.frontierMissionTargets().length,
      });
    }
    if (this.isFrontierArcher() && this.hajinSouthwardMarch && previousRegion === 'manchufrontier') {
      this.ensureHajinWarband(true);
      this.events.push({
        type: 'hajin-southward-march-started',
        from: previousRegion,
        to: region,
        count: this.followers.filter((follower) => follower.route === 'invasion').length,
      });
    }
  }

  enterDungeon(): void {
    this.applyDungeonFloor(this.highestBossCheckpoint >= 10 ? this.highestBossCheckpoint : 1);
  }

  advanceDungeonFloor(): void {
    if (this.region !== 'dungeon' || !this.dungeonLayout || this.dungeonStairLocked) return;
    this.applyDungeonFloor(Math.min(MAX_DUNGEON_FLOOR, this.dungeonFloor + 1));
  }

  isDungeonExitLocked(): boolean {
    return this.dungeonStairLocked;
  }

  startWakoInvasionPlaytest(): void {
    if (this.region !== 'ulleungvillage' || !import.meta.env.DEV) return;
    const magistrate = this.monsters.find((monster) => monster.region === 'ulleungvillage' && monster.kind === 'ulleung-magistrate');
    if (magistrate && !magistrate.alive) {
      magistrate.alive = true;
      magistrate.hp = magistrate.maxHp;
      magistrate.aggro = true;
      magistrate.aiState = 'alert';
      magistrate.actionTimer = 0.7;
      magistrate.elemental = emptyElementalState();
      this.events.push({ type: 'ulleung-magistrate-spawned', monsterId: magistrate.id });
    }
    if (magistrate) this.revealWakoPact(magistrate);
  }

  leaveDungeon(): void {
    if (this.region !== 'dungeon') return;
    this.player.x = REGION_ORIGINS.minepass.x + 770;
    this.player.y = REGION_ORIGINS.minepass.y + 300;
    this.player.destination = null;
    this.dungeonFloor = 0;
    this.dungeonLayout = null;
    this.dungeonObstacles = [];
    this.boss = null;
    this.dungeonStairLocked = false;
    this.changeRegion('minepass');
  }

  private applyDungeonFloor(floor: number): void {
    const layout = generateDungeonFloor(floor);
    const entering = this.region !== 'dungeon';
    this.dungeonFloor = layout.floor;
    this.dungeonLayout = layout;
    const origin = REGION_ORIGINS.dungeon;
    this.dungeonObstacles = layout.features.flatMap((feature): FieldObstacle[] => {
      if (feature.kind === 'wall') return [{ type: 'box', x: origin.x + feature.x, y: origin.y + feature.y, width: feature.width, height: feature.height }];
      if (feature.kind === 'pillar' || feature.kind === 'seal') return [{ type: 'circle', x: origin.x + feature.x, y: origin.y + feature.y, radius: feature.radius }];
      return [];
    });
    const roster = this.monsters.filter((monster) => monster.region === 'dungeon');
    const bossDefinition = bossForFloor(layout.floor);
    if (bossDefinition) {
      roster.forEach((monster) => {
        monster.alive = false;
        monster.hp = 0;
        monster.respawnAt = Number.POSITIVE_INFINITY;
        monster.aggro = false;
      });
      this.boss = createBossState(bossDefinition, { x: origin.x + 760, y: origin.y + 470 });
      this.highestBossCheckpoint = Math.max(this.highestBossCheckpoint, layout.floor);
      this.dungeonStairLocked = true;
      this.events.push({ type: 'boss-spawned', boss: this.boss });
      this.events.push({ type: 'dungeon-stair-lock-changed', locked: true });
    } else {
      this.boss = null;
      this.dungeonStairLocked = false;
      roster.forEach((monster, index) => {
      const spawn = layout.monsterSpawns[index];
      const tierKinds: MonsterKind[] = layout.floor >= 80
        ? ['mine-golem', 'moon-revenant', 'dokkaebi']
        : layout.floor >= 55 ? ['moon-revenant', 'mine-golem']
          : layout.floor >= 30 ? ['bamboo-spirit', 'moon-revenant'] : ['mine-golem', 'dokkaebi'];
      const kind = tierKinds[(layout.floor + index) % tierKinds.length];
      const base = MONSTER_DATA[kind];
      const maxHp = Math.round(base.hp + layout.floor * 7);
      monster.kind = kind;
      monster.tacticalRole = tacticalRoleFor(kind);
      monster.name = `${layout.title} ${base.name}`;
      monster.level = base.level + layout.floor;
      monster.maxHp = maxHp;
      monster.hp = maxHp;
      monster.damage = base.damage + Math.floor(layout.floor / 4);
      monster.x = origin.x + spawn.x;
      monster.y = origin.y + spawn.y;
      monster.spawn = { x: monster.x, y: monster.y };
      monster.patrolTarget = { x: monster.x + 24, y: monster.y };
      monster.alive = true;
      monster.respawnAt = 0;
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
      monster.rallySeconds = 0;
      monster.stuckSeconds = 0;
      monster.recoveryTimer = 0;
      monster.recoveryDirection = { x: 0, y: 0 };
      monster.recoveryCount = 0;
      monster.hitStun = 0;
      monster.velocity = { x: 0, y: 0 };
      monster.elemental = emptyElementalState();
      });
    }
    this.player.x = origin.x + layout.playerSpawn.x;
    this.player.y = origin.y + layout.playerSpawn.y;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
    if (entering) this.changeRegion('dungeon');
    this.events.push({ type: 'dungeon-floor-changed', floor: layout.floor, maxFloor: layout.maxFloor, title: layout.title });
  }

  moveTo(point: Vec2): void {
    if (this.player.hp <= 0) return;
    this.playerRoute = [];
    this.playerMovementStallSeconds = 0;
    this.playerNavigationRecoveries = 0;
    if (isUlleungRegion(this.region)
      && point.y >= REGION_ORIGINS.ulleungvillage.y - 100
      && this.region !== 'ulleungvillage'
      && !this.canEnterUlleungGovernment()) {
      this.requestGovernmentEntry();
      return;
    }
    this.playerActive = true;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.pendingPlayerAttack = null;
    this.resetBasicAttackChain();
    const destination = this.clampPlayerPoint(point);
    const islandTravelDistance = Math.hypot(
      destination.x - this.player.x,
      destination.y - this.player.y,
    );
    const islandVerticalDistance = Math.abs(destination.y - this.player.y);
    const crossesIslandRegion = ulleungRegionAtY(this.player.y) !== ulleungRegionAtY(destination.y);
    const followsLongIslandRoad = islandTravelDistance >= 300 && islandVerticalDistance >= 220;
    const directIslandTravelClear = !isUlleungRegion(this.region)
      || this.isTravelSegmentClear(this.player, destination, 20);
    if (isUlleungRegion(this.region)
      && (crossesIslandRegion || (followsLongIslandRoad && !directIslandTravelClear))) {
      this.playerRoute = this.buildUlleungTravelRoute(destination);
      this.movementWaypoint = this.playerRoute.shift() ?? destination;
      this.player.destination = destination;
      this.routedMovementGoal = destination;
      return;
    }
    this.movementWaypoint = destination;
    this.player.destination = destination;
    this.routedMovementGoal = destination;
  }

  getMovementGoal(): Vec2 | null {
    return this.player.destination ? { ...this.player.destination } : null;
  }

  selectMonster(id: string): void {
    if (this.player.hp <= 0) return;
    const monster = this.monsters.find((entry) => entry.id === id && entry.alive);
    if (!monster || this.isFriendlyMonster(monster) || !this.isRoyalRefugeMonsterActive(monster)) return;
    this.playerActive = true;
    this.player.targetId = id;
    this.player.lootTargetId = null;
    this.player.destination = null;
  }

  startPrisonAmbush(): void {
    if (this.region !== 'ulleungdo' || this.prisonGuardsProvoked || this.player.hp <= 0) return;
    const instigator = this.monsters
      .filter((monster) => monster.region === 'ulleungdo' && monster.alive && isUlleungGuard(monster.kind))
      .sort((left, right) => this.distance(left, this.player) - this.distance(right, this.player))[0];
    if (!instigator) return;
    this.playerActive = true;
    this.provokePrisonGuards(instigator, 'execution');
  }

  selectBoss(): void {
    if (this.player.hp <= 0 || !this.boss?.alive) return;
    this.playerActive = true;
    this.player.targetId = this.boss.id;
    this.player.lootTargetId = null;
    this.player.destination = null;
  }

  damageBoss(amount: number): void {
    const boss = this.boss;
    if (!boss?.alive) return;
    const commands = this.bossController.damage(boss, amount);
    for (const command of commands) {
      if (command.type === 'phase-change') this.events.push({ type: 'boss-phase-changed', bossId: boss.id, phase: 2 });
    }
    if (!boss.alive) this.killBoss(boss);
  }

  collectDrop(id: string): void {
    const drop = this.groundDrops.find((entry) => entry.id === id);
    if (this.player.hp <= 0 || !drop || (drop.region && drop.region !== this.region)) return;
    this.playerActive = true;
    this.player.targetId = null;
    this.player.destination = null;
    this.player.lootTargetId = id;
  }

  equipItem(instanceId: string): void {
    const item = this.inventory.find((entry) => entry.instanceId === instanceId);
    if (!item) return;
    const definition = ITEM_CATALOG[item.itemId];
    if (definition.slot === 'scroll' || definition.slot === 'material') return;
    const previousHpBonus = this.getEquipmentHpBonus();
    const isEquipped = this.equipment[definition.slot] === instanceId;
    this.equipment[definition.slot] = isEquipped ? null : instanceId;
    const hpDelta = this.getEquipmentHpBonus() - previousHpBonus;
    this.player.maxHp += hpDelta;
    this.player.hp = hpDelta > 0
      ? Math.min(this.player.maxHp, this.player.hp + hpDelta)
      : Math.min(this.player.hp, this.player.maxHp);
    this.pendingPlayerAttack = null;
    this.resetBasicAttackChain();
    this.player.attackCooldown = Math.max(this.player.attackCooldown, 0.16);
    this.events = this.events.filter((event) => event.type !== 'player-attack' && event.type !== 'player-impact');
    this.events.push({
      type: 'item-equipped', itemId: item.itemId, itemName: definition.name, equipped: !isEquipped,
    });
  }

  getEquippedDefinition(slot: EquipmentSlot): ItemDefinition | null {
    const instanceId = this.equipment[slot];
    const item = this.inventory.find((entry) => entry.instanceId === instanceId);
    if (!item) return null;
    const definition = ITEM_CATALOG[item.itemId];
    return definition.slot === slot ? definition : null;
  }

  getEquippedWeaponElement(): WeaponElement | null {
    return this.getEquippedDefinition('weapon')?.element ?? null;
  }

  getAttackPower(): number {
    const base = 7 + this.getEquipmentAttackBonus() + this.getSetBonus('attack')
      + this.getEquippedEnhancement('weapon') * 2 + this.getDerivedAttributeBonuses().attack
      + (this.player.momentumActive > 0 ? 6 : 0);
    if (this.isBowEquipped() && this.skillRanks['great-bow-mastery'] > 0) return Math.round(base * 1.2);
    return this.skillRanks['blade-mastery'] > 0 ? Math.round(base * 1.2) : base;
  }

  recruitFollower(kind: FollowerKind, route?: RecruitmentRoute): boolean {
    const definition = FOLLOWER_CATALOG[kind];
    const recruitmentRoute = route ?? definition.route;
    const cost = recruitmentRoute === 'liberation' ? 0 : definition.cost;
    if (this.followers.some((follower) => follower.kind === kind)) {
      this.events.push({ type: 'follower-recruit-blocked', kind, reason: 'known' });
      return false;
    }
    if (this.followers.length >= 3) {
      this.events.push({ type: 'follower-recruit-blocked', kind, reason: 'capacity' });
      return false;
    }
    if (recruitmentRoute !== 'liberation' && this.player.level < definition.requiredLevel) {
      this.events.push({
        type: 'follower-recruit-blocked',
        kind,
        reason: 'level',
        requiredLevel: definition.requiredLevel,
      });
      return false;
    }
    if (definition.requiresPrisonEscape && !this.prisonGateOpen) {
      this.events.push({ type: 'follower-recruit-blocked', kind, reason: 'story' });
      return false;
    }
    if (definition.requiredSkill && this.skillRanks[definition.requiredSkill] <= 0) {
      this.events.push({
        type: 'follower-recruit-blocked',
        kind,
        reason: 'skill',
        requiredSkill: definition.requiredSkill,
      });
      return false;
    }
    if (this.player.gold < cost) {
      this.events.push({ type: 'follower-recruit-blocked', kind, reason: 'gold', cost });
      return false;
    }
    this.player.gold -= cost;
    const angle = this.player.facing + Math.PI;
    const follower: FollowerState = {
      id: `follower-${this.followerCounter++}`,
      kind,
      name: definition.name,
      route: recruitmentRoute,
      visualKind: definition.visualKind,
      x: this.player.x + Math.cos(angle) * 58,
      y: this.player.y + Math.sin(angle) * 42,
      facing: this.player.facing,
      velocity: { x: 0, y: 0 },
      attackCooldown: 0,
      actionTimer: 0,
      targetId: null,
    };
    this.followers.push(follower);
    this.events.push({
      type: 'follower-recruited',
      follower: { ...follower, velocity: { ...follower.velocity } },
      route: recruitmentRoute,
      cost,
    });
    return true;
  }

  learnSkill(skillId: SkillId): void {
    const definition = SKILL_CATALOG[skillId];
    const rank = this.skillRanks[skillId];
    if (rank >= definition.maxRank) {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'max-rank' });
      return;
    }
    if (rank === 0 && definition.acquisition !== 'training') {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'locked' });
      return;
    }
    const prerequisite = unmetSkillPrerequisite(skillId, this.skillRanks);
    if (prerequisite) {
      this.events.push({
        type: 'skill-blocked',
        skillId,
        reason: 'prerequisite',
        requiredSkill: prerequisite.skillId,
        requiredRank: prerequisite.rank,
      });
      return;
    }
    if (this.skillPoints <= 0) {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'points' });
      return;
    }
    this.applySkillRank(skillId, rank + 1, rank === 0 ? 'training' : null);
  }

  learnSkillFromMaster(skillId: SkillId): boolean {
    const definition = SKILL_CATALOG[skillId];
    if (definition.acquisition !== 'master') {
      this.events.push({ type: 'skill-teach-blocked', skillId, reason: 'source' });
      return false;
    }
    if (this.skillRanks[skillId] > 0) {
      this.events.push({ type: 'skill-teach-blocked', skillId, reason: 'known' });
      return false;
    }
    const prerequisite = unmetSkillPrerequisite(skillId, this.skillRanks);
    if (prerequisite) {
      this.events.push({
        type: 'skill-teach-blocked',
        skillId,
        reason: 'prerequisite',
        requiredSkill: prerequisite.skillId,
        requiredRank: prerequisite.rank,
      });
      return false;
    }
    const requiredLevel = definition.requiredLevel ?? 1;
    const cost = definition.masterCost ?? 0;
    if (this.player.level < requiredLevel) {
      this.events.push({ type: 'skill-teach-blocked', skillId, reason: 'level', requiredLevel });
      return false;
    }
    if (this.player.gold < cost) {
      this.events.push({ type: 'skill-teach-blocked', skillId, reason: 'gold', cost });
      return false;
    }
    this.player.gold -= cost;
    this.unlockSkill(skillId, 'master');
    return true;
  }

  private unlockSkill(skillId: SkillId, source: SkillUnlockSource): void {
    if (this.skillRanks[skillId] > 0) return;
    this.applySkillRank(skillId, 1, source);
  }

  private applySkillRank(skillId: SkillId, rank: number, source: SkillUnlockSource | null): void {
    if (source === null || source === 'training') this.skillPoints = Math.max(0, this.skillPoints - 1);
    const wasLocked = this.skillRanks[skillId] === 0;
    this.skillRanks[skillId] = rank;
    if (skillId === 'iron-constitution' && wasLocked) {
      const bonus = Math.max(1, Math.round(this.player.maxHp * 0.2));
      this.player.maxHp += bonus;
      this.player.hp += bonus;
    }
    if (wasLocked && source) {
      this.events.push({ type: 'skill-unlocked', skillId, rank: 1, source });
    } else {
      this.events.push({ type: 'skill-learned', skillId, rank, pointsLeft: this.skillPoints });
    }
  }

  castSkill(skillId: SkillId): void {
    if (this.player.hp <= 0) return;
    const definition = SKILL_CATALOG[skillId];
    if (definition.kind === 'passive') {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'passive' });
      return;
    }
    if (this.skillRanks[skillId] <= 0) {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'locked' });
      return;
    }
    if (!this.getEquippedDefinition('weapon') && !this.isOsakaMudang()) {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'weapon' });
      return;
    }
    if (definition.requiredWeapon === 'bow' && !this.isBowEquipped()) {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'weapon' });
      return;
    }
    if (definition.requiredWeapon === 'melee' && this.isBowEquipped()) {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'weapon' });
      return;
    }
    if (this.player.attackCooldown > 0 || this.skillCooldowns[skillId] > 0) {
      this.events.push({ type: 'skill-blocked', skillId, reason: 'cooldown' });
      return;
    }
    if (ARCHER_SKILL_IDS.has(skillId)) {
      this.castArcherSkill(skillId);
      return;
    }
    const rank = this.skillRanks[skillId];
    const from = { x: this.player.x, y: this.player.y };
    const target = this.getTarget() ?? this.getBossTarget();
    const facing = target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : this.player.facing;
    this.player.facing = facing;
    this.player.targetId = null;
    this.player.destination = null;
    this.pendingPlayerAttack = null;
    this.resetBasicAttackChain();
    this.player.attackCooldown = 0.7;
    this.playerActive = true;

    let at = from;
    let radius = 145;
    let multiplier = 1.15 + rank * 0.2;
    if (skillId === 'spirit-bell') {
      at = from;
      radius = 142 + rank * 12;
      multiplier = 1.08 + rank * 0.18;
      this.skillCooldowns[skillId] = 4.2 - rank * 0.25;
    } else if (skillId === 'talisman-flame') {
      at = this.clampPlayerPoint({
        x: this.player.x + Math.cos(facing) * (165 + rank * 16),
        y: this.player.y + Math.sin(facing) * (165 + rank * 16),
      });
      radius = 112 + rank * 12;
      multiplier = 1.2 + rank * 0.22;
      this.skillCooldowns[skillId] = 4.8 - rank * 0.28;
    } else if (skillId === 'soul-binding-gut') {
      at = target ? { x: target.x, y: target.y } : from;
      radius = 168 + rank * 15;
      multiplier = 1.02 + rank * 0.18;
      this.skillCooldowns[skillId] = 6.2 - rank * 0.3;
    } else if (skillId === 'exile-possession') {
      at = from;
      radius = 205 + rank * 16;
      multiplier = 1.42 + rank * 0.25;
      this.skillCooldowns[skillId] = 8.4 - rank * 0.35;
    } else if (skillId === 'whirlwind') {
      this.skillCooldowns[skillId] = 4.5 - rank * 0.35;
    } else if (skillId === 'leap-strike') {
      const distance = target ? Math.min(250, this.distance(this.player, target)) : 190;
      at = this.traceWalkableTravel(from, {
        x: this.player.x + Math.cos(facing) * distance,
        y: this.player.y + Math.sin(facing) * distance,
      });
      this.player.x = at.x;
      this.player.y = at.y;
      radius = 112 + rank * 8;
      multiplier = 1.55 + rank * 0.25;
      this.skillCooldowns[skillId] = 6.8 - rank * 0.45;
    } else if (skillId === 'moon-dash') {
      at = this.traceWalkableTravel(from, {
        x: this.player.x + Math.cos(facing) * (155 + rank * 18),
        y: this.player.y + Math.sin(facing) * (155 + rank * 18),
      });
      this.player.x = at.x;
      this.player.y = at.y;
      radius = 95;
      multiplier = 1.35 + rank * 0.22;
      this.skillCooldowns[skillId] = 4.2 - rank * 0.3;
    } else if (skillId === 'tidebreaker-step') {
      at = this.traceWalkableTravel(from, {
        x: this.player.x + Math.cos(facing) * (230 + rank * 26),
        y: this.player.y + Math.sin(facing) * (230 + rank * 26),
      });
      this.player.x = at.x;
      this.player.y = at.y;
      radius = 126 + rank * 11;
      multiplier = 1.48 + rank * 0.24;
      this.skillCooldowns[skillId] = 5.8 - rank * 0.38;
    } else {
      at = this.clampPlayerPoint({
        x: this.player.x + Math.cos(facing) * (185 + rank * 18),
        y: this.player.y + Math.sin(facing) * (185 + rank * 18),
      });
      radius = 185 + rank * 16;
      multiplier = 1.25 + rank * 0.24;
      this.skillCooldowns[skillId] = 5.4 - rank * 0.35;
    }

    const damage = Math.round(this.getAttackPower() * multiplier);
    const weaponElement = this.getEquippedWeaponElement();
    let elementalChainAvailable = true;
    let targets = 0;
    for (const monster of this.monsters) {
      if (!monster.alive
        || monster.region !== this.region
        || !this.isRoyalRefugeMonsterActive(monster)
        || this.isFriendlyMonster(monster)
        || this.distance(monster, at) > radius) continue;
      const targetDamage = this.damageAgainstMonster(monster, damage);
      monster.hp = Math.max(0, monster.hp - targetDamage);
      monster.aggro = true;
      monster.hitStun = skillId === 'soul-binding-gut' ? 0.68
        : skillId === 'spirit-bell' ? 0.32
          : skillId === 'tidebreaker-step' ? 0.42
            : skillId === 'leap-strike' ? 0.28 : skillId === 'crescent-wave' ? 0.22 : 0.16;
      targets += 1;
      if (weaponElement) {
        this.applyElementalStatus(monster, weaponElement, targetDamage, undefined, elementalChainAvailable);
        elementalChainAvailable = false;
      }
      if (monster.hp === 0) this.killMonster(monster);
    }
    if (this.boss?.alive && this.region === 'dungeon' && this.distance(this.boss, at) <= radius + 20) {
      this.damageBoss(damage);
      targets += 1;
    }
    this.events.push({ type: 'skill-cast', skillId, rank, from, to: { x: at.x, y: at.y } });
    this.events.push({ type: 'skill-impact', skillId, targets, damage, at: { x: at.x, y: at.y } });
  }

  private castArcherSkill(skillId: SkillId): void {
    const rank = this.skillRanks[skillId];
    const from = { x: this.player.x, y: this.player.y };
    const monsters = this.monsters
      .filter((monster) => monster.alive
        && monster.region === this.region
        && this.isRoyalRefugeMonsterActive(monster)
        && !this.isFriendlyMonster(monster)
        && this.distance(this.player, monster) <= 560);
    const boss = this.boss?.alive && this.region === 'dungeon' ? this.boss : null;
    const currentTarget = this.getTarget() ?? this.getBossTarget();
    const nearest = [...monsters].sort((a, b) => this.distance(this.player, a) - this.distance(this.player, b))[0] ?? boss;
    const primary = currentTarget ?? nearest;
    const facing = primary ? Math.atan2(primary.y - this.player.y, primary.x - this.player.x) : this.player.facing;
    this.player.facing = facing;
    this.player.targetId = null;
    this.player.destination = null;
    this.pendingPlayerAttack = null;
    this.resetBasicAttackChain();
    this.player.attackCooldown = 0.62;
    this.playerActive = true;

    let at = primary ? { x: primary.x, y: primary.y } : {
      x: from.x + Math.cos(facing) * 300,
      y: from.y + Math.sin(facing) * 300,
    };
    let impactDamage = Math.max(1, Math.round(this.getAttackPower() * 0.7));
    let hitStun = 0.16;
    let arrowTargets: Array<MonsterState | BossState> = [];

    if (skillId === 'haemosu-volley') {
      const candidates: Array<MonsterState | BossState> = [...monsters, ...(boss ? [boss] : [])]
        .sort((a, b) => this.distance(this.player, a) - this.distance(this.player, b));
      const arrowCount = 5 + rank * 2;
      arrowTargets = candidates.length > 0
        ? Array.from({ length: arrowCount }, (_, index) => candidates[index % Math.min(candidates.length, 5)])
        : [];
      this.skillCooldowns[skillId] = 3.9 - rank * 0.28;
      impactDamage = Math.round(this.getAttackPower() * (0.48 + rank * 0.07));
    } else if (skillId === 'falcon-seeker') {
      const candidates: Array<MonsterState | BossState> = [...monsters, ...(boss ? [boss] : [])]
        .sort((a, b) => {
          const aLevel = 'level' in a ? a.level : a.floor + 10;
          const bLevel = 'level' in b ? b.level : b.floor + 10;
          return bLevel - aLevel || this.distance(this.player, a) - this.distance(this.player, b);
        });
      arrowTargets = candidates.slice(0, 3 + rank);
      this.skillCooldowns[skillId] = 4.6 - rank * 0.3;
      impactDamage = Math.round(this.getAttackPower() * (0.88 + rank * 0.12));
      hitStun = 0.24;
    } else if (skillId === 'iron-cavalry-shot') {
      const forward = { x: Math.cos(facing), y: Math.sin(facing) };
      const lineTargets: Array<MonsterState | BossState> = [...monsters, ...(boss ? [boss] : [])].filter((target) => {
        const dx = target.x - from.x;
        const dy = target.y - from.y;
        const along = dx * forward.x + dy * forward.y;
        const across = Math.abs(dx * forward.y - dy * forward.x);
        return along >= 0 && along <= 500 && across <= 54 + rank * 12;
      }).sort((a, b) => this.distance(this.player, a) - this.distance(this.player, b));
      arrowTargets = lineTargets;
      at = {
        x: from.x + forward.x * 480,
        y: from.y + forward.y * 480,
      };
      this.skillCooldowns[skillId] = 5.2 - rank * 0.32;
      impactDamage = Math.round(this.getAttackPower() * (1.35 + rank * 0.18));
      hitStun = 0.36;
    } else if (skillId === 'beacon-volley') {
      const chainCount = 4 + rank;
      arrowTargets = [...monsters, ...(boss ? [boss] : [])]
        .sort((first, second) => this.distance(this.player, first) - this.distance(this.player, second))
        .slice(0, chainCount);
      at = arrowTargets.at(-1)
        ? { x: arrowTargets.at(-1)!.x, y: arrowTargets.at(-1)!.y }
        : { x: from.x + Math.cos(facing) * 340, y: from.y + Math.sin(facing) * 340 };
      this.skillCooldowns[skillId] = 5.6 - rank * 0.34;
      impactDamage = Math.round(this.getAttackPower() * (0.96 + rank * 0.13));
      hitStun = 0.3;
    } else {
      const radius = 150 + rank * 18;
      at = primary ? { x: primary.x, y: primary.y } : {
        x: from.x + Math.cos(facing) * 310,
        y: from.y + Math.sin(facing) * 310,
      };
      arrowTargets = [...monsters, ...(boss ? [boss] : [])]
        .filter((target) => this.distance(target, at) <= radius);
      this.skillCooldowns[skillId] = 6.3 - rank * 0.38;
      impactDamage = Math.round(this.getAttackPower() * (1.05 + rank * 0.14));
      hitStun = 0.28;
    }

    const struck = new Set<string>();
    const arrows: Array<{ targetId: string; from: Vec2; to: Vec2 }> = [];
    let elementalChainAvailable = true;
    const weaponElement = this.getEquippedWeaponElement();
    for (const [index, target] of arrowTargets.entries()) {
      const targetId = target.id;
      arrows.push({
        targetId,
        from: {
          x: from.x - Math.sin(facing) * ((index % 5) - 2) * 5,
          y: from.y + Math.cos(facing) * ((index % 5) - 2) * 4,
        },
        to: { x: target.x, y: target.y },
      });
      if ('region' in target) {
        if (!target.alive || target.hp <= 0) continue;
        const dealt = this.damageAgainstMonster(target, impactDamage);
        const wasAlive = target.alive && target.hp > 0;
        target.hp = Math.max(0, target.hp - dealt);
        target.aggro = true;
        target.hitStun = Math.max(target.hitStun, hitStun);
        if (weaponElement) {
          this.applyElementalStatus(target, weaponElement, dealt, undefined, elementalChainAvailable);
          elementalChainAvailable = false;
        }
        if (wasAlive && target.hp === 0) this.killMonster(target);
      } else {
        if (target.alive && target.hp > 0) this.damageBoss(impactDamage);
      }
      struck.add(targetId);
    }

    if (arrows.length === 0) {
      arrows.push({ targetId: '', from, to: at });
    }
    this.events.push({ type: 'skill-cast', skillId, rank, from, to: at });
    this.events.push({ type: 'archer-volley', skillId, arrows });
    this.events.push({ type: 'skill-impact', skillId, targets: struck.size, damage: impactDamage, at });
  }

  trainAtTree(): void {
    if (this.player.hp <= 0) return;
    this.treeTrainingCount += 1;
    const xp = this.scaleExperience(8);
    this.player.xp += xp;
    let reward: string | undefined;
    if (this.treeTrainingCount === 3 && !this.droppedStarterWeapon) {
      this.droppedStarterWeapon = true;
      const itemId: ItemId = 'worn-hwando';
      this.inventory.push({ instanceId: `item-${this.itemCounter++}`, itemId });
      reward = ITEM_CATALOG[itemId].name;
      this.events.push({ type: 'item-pickup', itemId, itemName: reward });
    }
    this.events.push({ type: 'training-progress', count: this.treeTrainingCount, xp, reward });
  }

  enchantWeapon(): void {
    const weapon = this.getEquippedItem('weapon');
    if (!weapon || (weapon.enhancement ?? 0) >= 5 || this.player.gold < 30) return;
    this.player.gold -= 30;
    weapon.enhancement = (weapon.enhancement ?? 0) + 1;
    this.events.push({ type: 'enchant-applied', target: 'weapon', level: weapon.enhancement, bonus: weapon.enhancement * 2 });
  }

  purchaseShopOffer(offer: ShopOfferId): boolean {
    const prices: Record<ShopOfferId, number> = {
      'ginseng-pellet': 18,
      'weapon-enchant-scroll': 120,
      'armor-enchant-scroll': 120,
      'ember-hwando': 520,
      'frost-hwando': 590,
      'storm-hwando': 680,
      'forge-weapon': 30,
      'forge-armor': 35,
      'inn-rest': 25,
    };
    const names: Record<ShopOfferId, string> = {
      'ginseng-pellet': '산삼환',
      'weapon-enchant-scroll': ITEM_CATALOG['weapon-enchant-scroll'].name,
      'armor-enchant-scroll': ITEM_CATALOG['armor-enchant-scroll'].name,
      'ember-hwando': ITEM_CATALOG['ember-hwando'].name,
      'frost-hwando': ITEM_CATALOG['frost-hwando'].name,
      'storm-hwando': ITEM_CATALOG['storm-hwando'].name,
      'forge-weapon': '환도 담금질',
      'forge-armor': '복장 덧댐',
      'inn-rest': '주막 휴식',
    };
    const price = prices[offer];
    if (this.player.gold < price) {
      this.events.push({ type: 'shop-blocked', offer, reason: 'gold' });
      return false;
    }
    if (offer === 'ginseng-pellet') {
      this.player.gold -= price;
      this.player.potions += 1;
    } else if (
      offer === 'weapon-enchant-scroll'
      || offer === 'armor-enchant-scroll'
      || offer === 'ember-hwando'
      || offer === 'frost-hwando'
      || offer === 'storm-hwando'
    ) {
      if (this.inventory.length >= this.inventoryCapacity) {
        this.events.push({ type: 'shop-blocked', offer, reason: 'inventory' });
        return false;
      }
      this.player.gold -= price;
      this.inventory.push({ instanceId: `item-${this.itemCounter++}`, itemId: offer });
    } else if (offer === 'inn-rest') {
      if (this.player.hp >= this.player.maxHp) {
        this.events.push({ type: 'shop-blocked', offer, reason: 'health' });
        return false;
      }
      this.player.gold -= price;
      this.player.hp = this.player.maxHp;
    } else {
      const target = offer === 'forge-weapon' ? 'weapon' : 'armor';
      const equipment = this.getEquippedItem(target);
      if (!equipment || (equipment.enhancement ?? 0) >= 5) {
        this.events.push({ type: 'shop-blocked', offer, reason: 'equipment' });
        return false;
      }
      this.player.gold -= price;
      equipment.enhancement = (equipment.enhancement ?? 0) + 1;
      this.events.push({
        type: 'enchant-applied',
        target,
        level: equipment.enhancement,
        bonus: equipment.enhancement * 2,
      });
    }
    this.events.push({ type: 'shop-purchase', offer, name: names[offer], gold: price });
    return true;
  }

  craftItem(recipeId: CraftRecipeId): boolean {
    const recipe = CRAFTING_RECIPES[recipeId];
    const materialTotal = recipe.materials.reduce((total, material) => total + material.count, 0);
    for (const material of recipe.materials) {
      const owned = this.inventory.filter((item) => item.itemId === material.itemId).length;
      if (owned < material.count) {
        this.events.push({ type: 'craft-blocked', recipeId, reason: 'materials' });
        return false;
      }
    }
    if (this.player.gold < recipe.gold) {
      this.events.push({ type: 'craft-blocked', recipeId, reason: 'gold' });
      return false;
    }
    if (this.inventory.length - materialTotal + 1 > this.inventoryCapacity) {
      this.events.push({ type: 'craft-blocked', recipeId, reason: 'inventory' });
      return false;
    }

    for (const material of recipe.materials) {
      let remaining = material.count;
      for (let index = this.inventory.length - 1; index >= 0 && remaining > 0; index -= 1) {
        if (this.inventory[index].itemId !== material.itemId) continue;
        const [removed] = this.inventory.splice(index, 1);
        for (const slot of Object.keys(this.equipment) as EquipmentSlot[]) {
          if (this.equipment[slot] === removed.instanceId) this.equipment[slot] = null;
        }
        remaining -= 1;
      }
    }
    this.player.gold -= recipe.gold;
    this.inventory.push({ instanceId: `item-${this.itemCounter++}`, itemId: recipe.output });
    this.craftedRecipes.add(recipeId);
    this.events.push({
      type: 'item-crafted',
      recipeId,
      itemId: recipe.output,
      itemName: ITEM_CATALOG[recipe.output].name,
    });
    return true;
  }

  useItem(instanceId: string): void {
    const index = this.inventory.findIndex((entry) => entry.instanceId === instanceId);
    if (index < 0) return;
    const scroll = this.inventory[index];
    const manualSkill = MANUAL_SKILL_BY_ITEM[scroll.itemId];
    if (manualSkill) {
      if (this.skillRanks[manualSkill] > 0) {
        this.events.push({ type: 'skill-teach-blocked', skillId: manualSkill, reason: 'known' });
        return;
      }
      this.inventory.splice(index, 1);
      this.unlockSkill(manualSkill, 'manual');
      return;
    }
    if (scroll.itemId !== 'weapon-enchant-scroll' && scroll.itemId !== 'armor-enchant-scroll') return;
    const target = scroll.itemId === 'weapon-enchant-scroll' ? 'weapon' : 'armor';
    const equipment = this.getEquippedItem(target);
    if (!equipment) {
      this.events.push({ type: 'enchant-blocked', target, reason: 'unequipped' });
      return;
    }
    const level = equipment.enhancement ?? 0;
    if (level >= 5) {
      this.events.push({ type: 'enchant-blocked', target, reason: 'max-level' });
      return;
    }
    this.inventory.splice(index, 1);
    const nextLevel = level + 1;
    equipment.enhancement = nextLevel;
    this.events.push({ type: 'enchant-applied', target, level: nextLevel, bonus: nextLevel * 2 });
  }

  getWeaponEnchantLevel(): number { return this.getEquippedEnhancement('weapon'); }
  getArmorEnchantLevel(): number { return this.getEquippedEnhancement('armor'); }

  isPrisonGateOpen(): boolean { return this.prisonGateOpen; }

  getWorldEventRemainingSeconds(): number {
    return this.activeWorldEvent ? Math.max(0, this.activeWorldEvent.endsAt - this.elapsed) : 0;
  }
  getFrontierSector() {
    const origin = REGION_ORIGINS.manchufrontier;
    return frontierSectorAt(this.player.y - origin.y);
  }
  getTreeTrainingCount(): number { return this.treeTrainingCount; }
  hasDiscoveredLandmark(landmarkId: LandmarkId): boolean { return this.discoveredLandmarks.has(landmarkId); }
  isUlleungVillageLiberated(): boolean { return this.ulleungVillageLiberated; }
  hasWakoInvasionStarted(): boolean { return this.wakoInvasionStarted; }
  canEnterUlleungGovernment(): boolean { return this.player.level >= 10; }

  useGovernmentDock(): boolean {
    if (this.region !== 'ulleungvillage' || !this.ulleungVillageLiberated) {
      this.events.push({ type: 'government-dock-blocked' });
      return false;
    }
    const mainland = REGION_ORIGINS.village;
    this.player.x = mainland.x + 770;
    this.player.y = mainland.y + 600;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
    this.events.push({ type: 'government-dock-used', destination: 'village' });
    this.changeRegion('village');
    return true;
  }

  requestGovernmentEntry(): boolean {
    if (this.canEnterUlleungGovernment()) return true;
    const origin = REGION_ORIGINS.ulleungdo;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.player.destination = { x: origin.x + MAP_WIDTH / 2, y: origin.y + 610 };
    this.events.push({ type: 'government-entry-blocked', requiredLevel: 10 });
    return false;
  }

  getDefense(): number {
    return this.getEquipmentStatBonus('defenseBonus') + this.getSetBonus('defense')
      + this.getEquippedEnhancement('armor') * 2 + this.getDerivedAttributeBonuses().defense;
  }

  getAccuracy(): number {
    return Math.min(99, 82 + this.getEquipmentStatBonus('accuracyBonus') + this.getDerivedAttributeBonuses().accuracy);
  }

  getEvasion(): number {
    return Math.min(25, 3 + this.getEquipmentStatBonus('evasionBonus') + this.getDerivedAttributeBonuses().evasion);
  }

  getAttributeState(): { values: AttributeValues; allocations: AttributeValues; points: number } {
    return {
      values: totalAttributes(this.playerOrigin, this.player.level, this.attributeAllocations),
      allocations: { ...this.attributeAllocations },
      points: this.attributePoints,
    };
  }

  getDerivedAttributeBonuses() {
    return derivedAttributeBonuses(this.playerOrigin, this.player.level, this.attributeAllocations);
  }

  allocateAttribute(attributeId: AttributeId): boolean {
    if (this.attributePoints <= 0 || this.attributeAllocations[attributeId] >= 40 || this.player.hp <= 0) return false;
    this.attributeAllocations[attributeId] += 1;
    this.attributePoints -= 1;
    if (attributeId === 'vitality') {
      this.player.maxHp += 8;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
    }
    this.events.push({
      type: 'attribute-allocated',
      attributeId,
      value: this.getAttributeState().values[attributeId],
      pointsLeft: this.attributePoints,
    });
    return true;
  }

  resetAttributes(): boolean {
    const refunded = Object.values(this.attributeAllocations).reduce((sum, value) => sum + value, 0);
    if (refunded <= 0 || this.player.hp <= 0 || this.player.targetId || this.pendingMonsterAttacks.length > 0) return false;
    const hpBonus = this.attributeAllocations.vitality * 8;
    Object.assign(this.attributeAllocations, emptyAttributeAllocations());
    this.attributePoints += refunded;
    this.player.maxHp = Math.max(1, this.player.maxHp - hpBonus);
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    this.events.push({ type: 'attributes-reset', refunded, points: this.attributePoints });
    return true;
  }

  private resetAttributeProgress(): void {
    Object.assign(this.attributeAllocations, emptyAttributeAllocations());
    this.attributePoints = attributePointsEarnedAtLevel(this.player.level);
  }

  interactLandmark(landmarkId: LandmarkId): boolean {
    if (this.discoveredLandmarks.has(landmarkId)) {
      this.events.push({ type: 'landmark-blocked', landmarkId, reason: 'used' });
      return false;
    }
    if (landmarkId === 'government-treasury' && !this.ulleungVillageLiberated) {
      this.events.push({ type: 'landmark-blocked', landmarkId, reason: 'locked' });
      return false;
    }
    if ((landmarkId === 'smuggler-cache' || landmarkId === 'government-treasury'
      || landmarkId === 'jurchen-supply-sled' || landmarkId === 'fallen-border-courier'
      || landmarkId === 'frontier-stone-cairn')
      && this.inventory.length >= this.inventoryCapacity) {
      this.events.push({ type: 'landmark-blocked', landmarkId, reason: 'inventory-full' });
      return false;
    }

    let title = '';
    let reward = '';
    let itemId: ItemId | null = null;
    if (landmarkId === 'herb-patch') {
      title = '울릉 약초 군락';
      const healed = Math.min(45, this.player.maxHp - this.player.hp);
      this.player.hp += healed;
      this.player.potions += 1;
      reward = `체력 +${healed} · 산삼환 +1`;
    } else if (landmarkId === 'spirit-shrine') {
      title = '해송 산신 제단';
      for (const skillId of Object.keys(this.skillCooldowns) as SkillId[]) this.skillCooldowns[skillId] = 0;
      this.player.xp += 30;
      reward = '무공 재사용 대기시간 초기화 · 경험 +30';
    } else if (landmarkId === 'refugee-camp') {
      title = '피난민의 남은 불씨';
      this.player.potions += 2;
      this.player.gold += 15;
      reward = '산삼환 +2 · 엽전 +15';
    } else if (landmarkId === 'tax-cart') {
      title = '관아 징세 수레';
      this.player.gold += 60;
      reward = '백성의 세곡 환수 · 엽전 +60';
    } else if (landmarkId === 'smuggler-cache') {
      title = '감옥 밀수품 은닉처';
      itemId = 'weapon-enchant-scroll';
      reward = '무기 강화 주문서 +1';
    } else if (landmarkId === 'government-treasury') {
      title = '관아 압수품 궤짝';
      this.player.gold += 180;
      itemId = 'armor-enchant-scroll';
      reward = '엽전 +180 · 방어구 강화 주문서 +1';
    } else if (landmarkId === 'jurchen-supply-sled') {
      title = '여진 선봉 보급 썰매';
      itemId = 'jurchen-iron-arrowheads';
      this.player.potions += 1;
      reward = '여진 흑철촉 묶음 +1 · 산삼환 +1';
    } else if (landmarkId === 'fallen-border-courier') {
      title = '쓰러진 조선 파발꾼';
      itemId = 'border-war-dispatch';
      reward = '압록 변경 군보 +1 · 조선 진보 군량로 확인';
    } else {
      title = '압록 돌무지 제단';
      itemId = 'falcon-eye-bracer';
      this.player.xp += this.scaleExperience(35);
      reward = '매눈 활깍지 +1 · 북방 사냥 경험 +35';
    }

    if (itemId) {
      this.inventory.push({ instanceId: `item-${this.itemCounter++}`, itemId });
    }
    this.discoveredLandmarks.add(landmarkId);
    this.events.push({ type: 'landmark-discovered', landmarkId, title, reward });
    return true;
  }

  usePotion(): void {
    if (this.player.potions <= 0 || this.player.hp >= this.player.maxHp) return;
    const healed = Math.min(70, this.player.maxHp - this.player.hp);
    this.player.hp += healed;
    this.player.potions -= 1;
    this.events.push({ type: 'potion', healed });
  }

  quickStep(): void {
    if (this.player.hp <= 0 || this.player.dodgeCooldown > 0) return;
    const from = { x: this.player.x, y: this.player.y };
    const perfectAttackIds = new Set(this.pendingMonsterAttacks.filter((pending) => {
      const attacker = this.monsters.find((monster) => monster.id === pending.monsterId && monster.alive);
      const impactDelay = pending.impactAt - this.elapsed;
      return Boolean(attacker && impactDelay >= 0 && impactDelay <= 0.34 && this.distance(attacker, this.player) <= pending.impactRange + 38);
    }).map((pending) => pending.monsterId));
    const perfectDodge = perfectAttackIds.size > 0;
    if (perfectDodge) {
      this.pendingMonsterAttacks = this.pendingMonsterAttacks.filter((pending) => !perfectAttackIds.has(pending.monsterId));
    }
    const target = this.getTarget() ?? this.getBossTarget();
    const angle = target
      ? Math.atan2(this.player.y - target.y, this.player.x - target.x)
      : this.player.facing;
    const destination = this.traceWalkableTravel(from, {
      x: this.player.x + Math.cos(angle) * 82,
      y: this.player.y + Math.sin(angle) * 82,
    });

    this.player.x = destination.x;
    this.player.y = destination.y;
    this.player.facing = angle;
    this.player.destination = null;
    this.player.lootTargetId = null;
    this.player.dodgeCooldown = perfectDodge ? 1.1 : 1.6;
    this.player.attackCooldown = Math.max(this.player.attackCooldown, 0.2);
    this.pendingPlayerAttack = null;
    this.resetBasicAttackChain();
    this.playerActive = true;
    this.events.push({ type: 'player-quickstep', from, to: { x: destination.x, y: destination.y } });
    if (perfectDodge) {
      this.gainMomentum(25);
      this.events.push({ type: 'perfect-dodge', momentum: this.player.momentum });
    }
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(deltaSeconds, 0.05);
    this.elapsed += dt;
    advanceFactionWar(this.factionWarState, dt, this.player.level);
    if (this.isGwanghaePrince()) {
      // Gwanghae's reserve comes only from the named militia rallies. Keeping
      // strategic recovery disabled makes every field call a permanent cost
      // and prevents the tactical campaign from becoming an endless respawn.
      this.factionWarState.recoveryProgress['joseon-court'] = 0;
    }
    if (this.isFrontierArcher()) {
      if (!this.isJurchenUnified() && !this.hajinSouthwardMarch) {
        this.factionWarState.reserve['jurchen-league'] = this.hajinArmyReserve;
        this.factionWarState.recoveryProgress['jurchen-league'] = 0;
      } else {
        this.hajinArmyReserve = Math.floor(this.factionWarState.reserve['jurchen-league']);
      }
    }
    this.syncFactionWarStory();
    if (this.isFrontierArcher()) {
      this.hajinArmyReserve = Math.floor(this.factionWarState.reserve['jurchen-league']);
    }
    if (this.travelModeEnabled) {
      this.activeMonsterRoster = [];
      this.pendingPlayerAttack = null;
      this.pendingMonsterAttacks = [];
      this.player.targetId = null;
      this.player.lootTargetId = null;
      this.player.hp = this.player.maxHp;
      if (this.player.destination) {
        const movementTarget = this.movementWaypoint ?? this.player.destination;
        this.moveGhostPlayerToward(movementTarget, 285, dt);
      }
      return;
    }
    this.updateGroundDropLifetimes(dt);
    if (this.region === 'tangeumdae' && !this.tangeumCleared && !this.tangeumArrivalAnnounced) {
      this.tangeumArrivalAnnounced = true;
      const progress = this.getTangeumBattleProgress();
      this.events.push({ type: 'tangeum-gunline-alert', gunners: progress.gunners, total: progress.total });
    }
    this.updateFrontierAmbush();
    if (this.wakoInvasionAt > 0 && this.elapsed >= this.wakoInvasionAt) this.startWakoInvasion();
    this.updateWorldEvents();
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.dodgeCooldown = Math.max(0, this.player.dodgeCooldown - dt);
    if (this.player.momentumActive > 0) {
      const wasActive = this.player.momentumActive;
      this.player.momentumActive = Math.max(0, this.player.momentumActive - dt);
      this.player.momentum = this.player.momentumActive / 7 * 100;
      if (wasActive > 0 && this.player.momentumActive === 0) {
        this.player.momentum = 0;
        this.events.push({ type: 'momentum-ended' });
      }
    } else {
      this.player.comboTimer = Math.max(0, this.player.comboTimer - dt);
      if (this.player.comboTimer === 0) {
        this.player.combo = 0;
        this.player.momentum = Math.max(0, this.player.momentum - dt * 3.5);
      }
    }
    for (const skillId of Object.keys(this.skillCooldowns) as SkillId[]) {
      this.skillCooldowns[skillId] = Math.max(0, this.skillCooldowns[skillId] - dt);
    }

    this.activeMonsterRoster = this.monsters.filter((monster) =>
      monster.region === this.region && this.isRoyalRefugeMonsterActive(monster));
    this.respawnMonsters();
    this.resolvePendingPlayerAttack();
    this.resolvePendingMonsterAttacks();
    if (this.player.hp <= 0) {
      if (this.playerRespawnAt > 0 && this.elapsed >= this.playerRespawnAt) this.respawnPlayer();
      return;
    }

    const bossTarget = this.getBossTarget();
    const target = this.getTarget();
    if (this.player.targetId && !target && !bossTarget) {
      this.player.targetId = null;
      this.pendingPlayerAttack = null;
      this.resetBasicAttackChain();
    }
    if (this.player.lootTargetId) this.updateLootCollection(dt);
    else if (bossTarget) this.updateBossTargetCombat(bossTarget, dt);
    else if (target) this.updateTargetCombat(target, dt);
    else if (this.player.destination) {
      const movementTarget = this.routedMovementGoal === this.player.destination
        ? this.movementWaypoint ?? this.player.destination
        : this.player.destination;
      this.movePlayerToward(movementTarget, this.momentumSpeed(160), dt);
    }

    // Campaign gates own their story locks. Resolve them before the broad
    // coordinate classifier can interpret a few pixels beyond a shared seam
    // as an unconditional region change.
    this.updateCampaignGateTransitions();
    this.updateRegionFromPosition();

    this.updateFollowers(dt);
    for (const monster of this.activeMonsterRoster) this.updateMonster(monster, dt);
    this.updateBoss(dt);
  }

  private syncFactionWarStory(): void {
    const faction = this.factionWarState.playerFaction;
    const capture = (
      milestone: string,
      stronghold: Parameters<typeof captureStronghold>[2],
      title: string,
    ): void => {
      captureStronghold(
        this.factionWarState,
        milestone,
        stronghold,
        faction,
        title,
        this.player.level,
      );
    };

    if (faction === 'daedong-army') {
      if (this.ulleungVillageLiberated) {
        capture('donghyeok-ulleung-liberated', 'ulleung', '울릉 관아 해방전');
      }
      const yeongwolArmy = this.monsters.filter((monster) => isYeongwolSoldier(monster.kind));
      if (yeongwolArmy.length > 0 && yeongwolArmy.every((monster) => !monster.alive)) {
        capture('donghyeok-yeongwol-liberated', 'yeongwol', '영월 대도호부 봉기');
      }
      const jeonjuArmy = this.monsters.filter((monster) => isJeonjuSoldier(monster.kind));
      if (jeonjuArmy.length > 0 && jeonjuArmy.every((monster) => !monster.alive)) {
        capture('donghyeok-jeonju-liberated', 'jeonju', '전주 감영 농민 봉기');
      }
      if (this.tangeumCleared) {
        capture('donghyeok-busan-liberated', 'busan', '부산진 수복전');
      }
      const hanseongArmy = this.monsters.filter((monster) => (
        (monster.region === 'gyeongbokgate'
          || monster.region === 'gyeongbokcourt'
          || monster.region === 'gyeongbokinner')
        && isGovernmentSoldier(monster.kind)
      ));
      if (hanseongArmy.length > 0 && hanseongArmy.every((monster) => !monster.alive)) {
        capture('donghyeok-hanseong-liberated', 'hanseong', '한성 대동 해방전');
      }
      return;
    }

    if (faction === 'jurchen-league') {
      if (this.hajinSouthwardMarch) {
        capture('hajin-yalu-breached', 'yalu', '압록 전선 돌파전');
      }
      if (this.pyongyangCleared.has('pyongyanginner')) {
        capture('hajin-pyongyang-fallen', 'pyongyang', '평양 내성 함락전');
      }
      if (this.royalRefugeState.finalDefenseComplete) {
        capture('hajin-hanseong-fallen', 'hanseong', '왕도 최종 방어전');
      }
      return;
    }

    if (faction === 'japanese-army') {
      if (this.japanCleared.has('shogunkeep') && this.visitedRegions.has('busanjin')) {
        capture('yeonhwa-busan-secured', 'busan', '부산진 상륙전');
      }
      if (this.tangeumCleared) {
        capture('yeonhwa-yeongwol-detachment', 'yeongwol', '영월 우회 점령전');
      }
      const hanseongArmy = this.monsters.filter((monster) => (
        (monster.region === 'gyeongbokgate'
          || monster.region === 'gyeongbokcourt'
          || monster.region === 'gyeongbokinner')
        && isGovernmentSoldier(monster.kind)
      ));
      if (hanseongArmy.length > 0 && hanseongArmy.every((monster) => !monster.alive)) {
        capture('yeonhwa-hanseong-fallen', 'hanseong', '왜군 한성 공방전');
      }
    }
  }

  private updateRegionFromPosition(): void {
    const { x, y } = this.player;
    let next: RegionId;
    // Joseon towns share a dedicated continuous road column, but transitions
    // still pass through authored gates below. Holding the current region here
    // prevents the older broad western-grid classifier from mistaking the road
    // for the adjacent Jurchen or Pyongyang campaign.
    if (isJapanRegion(this.region) || isJurchenRegion(this.region)
      || this.region === 'manchufrontier' || isPyongyangRegion(this.region)
      || isJoseonTownRegion(this.region) || isExtendedRegion(this.region)
      || isEpisode2Region(this.region)) next = this.region;
    else if (x < -MAP_WIDTH * 5) {
      if (y >= REGION_ORIGINS.pyongyanginner.y) next = 'pyongyanginner';
      else if (y >= REGION_ORIGINS.pyongyanggate.y) next = 'pyongyanggate';
      else if (y >= REGION_ORIGINS.pyongyangouter.y) next = 'pyongyangouter';
      else if (y >= REGION_ORIGINS.manchufrontier.y) next = 'manchufrontier';
      else next = 'jurchenvillage';
    }
    else if (x < -MAP_WIDTH * 4) {
      if (y < VILLAGE_TOP - MAP_HEIGHT) next = 'gyeongbokinner';
      else if (y < VILLAGE_TOP) next = 'gyeongbokcourt';
      else next = 'gyeongbokgate';
    }
    else if (x < -MAP_WIDTH * 3) {
      if (y >= REGION_ORIGINS.ganghwado.y) next = 'ganghwado';
      else if (y >= REGION_ORIGINS.namhansanseong.y) next = 'namhansanseong';
      else next = y < VILLAGE_TOP ? 'tangeumdae' : 'busanjin';
    }
    else if (x < -MAP_WIDTH * 2) {
      if (y < VILLAGE_TOP - MAP_HEIGHT) next = 'jeonju';
      else if (y < VILLAGE_TOP) next = 'jeonjugate';
      else next = 'jeonjufield';
    }
    else if (x >= MAP_WIDTH * 3) {
      next = this.ulleungRegionFromPosition(y);
    }
    else if (x < -MAP_WIDTH) next = y < VILLAGE_TOP ? 'yeongwolhq' : 'yeongwol';
    else if (x < 0) next = 'mistwood';
    else if (x > MAP_WIDTH * 2) next = 'dungeon';
    else if (x > MAP_WIDTH) next = 'minepass';
    else if (y >= CENTRAL_WORLD_HEIGHT) next = 'moonfield';
    else next = y >= VILLAGE_TOP + 110 ? 'village' : 'solgogae';
    if (next !== this.region) this.changeRegion(next);
  }

  private updateCampaignGateTransitions(): void {
    if (this.elapsed < this.regionGateCooldownUntil || this.player.hp <= 0) return;
    const origin = REGION_ORIGINS[this.region];
    const localX = this.player.x - origin.x;
    const localY = this.player.y - origin.y;
    const centerGate = localX >= 590 && localX <= 946;
    const northSeam = continuousWorldEdge(this.region, 'north');
    const southSeam = continuousWorldEdge(this.region, 'south');
    const northReached = centerGate && localY <= (northSeam ? -4 : 78);
    const southReached = centerGate && localY >= (southSeam ? MAP_HEIGHT + 4 : MAP_HEIGHT - 58);
    const westReached = localX <= 82 && localY >= 360 && localY <= 660;

    if (isEpisode2Region(this.region)) {
      const neighbors = episode2Neighbors(this.region);
      if (northReached) {
        const destination = neighbors.find((region) => REGION_ORIGINS[region].y < origin.y);
        if (destination) this.travelToCampaignRegion(destination, 'south');
      } else if (southReached) {
        const destination = neighbors.find((region) => REGION_ORIGINS[region].y > origin.y);
        if (destination) this.travelToCampaignRegion(destination, 'north');
      }
      return;
    }

    if (isJoseonTownRegion(this.region)) {
      const northGate = joseonTownGate(this.region, 'north');
      const southGate = joseonTownGate(this.region, 'south');
      const withinGate = (gate: NonNullable<ReturnType<typeof joseonTownGate>>): boolean =>
        localX >= gate.x - gate.width / 2 && localX <= gate.x + gate.width / 2;
      const northThreshold = northGate
        ? northGate.y <= 100 ? -4 : northGate.y + northGate.height / 2
        : 78;
      if (northGate && withinGate(northGate) && localY <= northThreshold) {
        this.travelToCampaignRegion(northGate.destination, 'south');
      } else if (southGate && withinGate(southGate) && localY >= MAP_HEIGHT + 4) {
        this.travelToCampaignRegion(southGate.destination, 'north');
      }
      return;
    }

    if (isJapanRegion(this.region) && northReached) {
      const next = japanForwardDestination(this.region);
      if (!this.japanCleared.has(this.region)) {
        const progress = this.getJapanStageProgress(this.region);
        this.player.destination = { x: origin.x + MAP_WIDTH / 2, y: origin.y + 176 };
        this.movementWaypoint = this.player.destination;
        this.routedMovementGoal = this.player.destination;
        this.regionGateCooldownUntil = this.elapsed + 0.85;
        this.events.push({ type: 'japan-gate-blocked', region: this.region, remaining: progress.total - progress.defeated });
        if (this.region === 'osaka') this.events.push({ type: 'osaka-departure-blocked', remaining: progress.total - progress.defeated });
      } else {
        this.travelToCampaignRegion(next, 'south');
      }
    }
    else if (isJapanRegion(this.region) && southReached) {
      const previous = japanBackwardDestination(this.region);
      if (previous) {
        this.travelToCampaignRegion(previous, 'north');
      }
    }
    else if (isJurchenRegion(this.region) && northReached) {
      if (this.region === 'jurchenvillage') {
        this.travelToCampaignRegion('changbaihunt', 'south');
      } else if (isJurchenExpansionRegion(this.region)) {
        if (!this.jurchenCleared.has(this.region)) {
          const progress = this.getJurchenStageProgress(this.region);
          this.player.destination = { x: origin.x + MAP_WIDTH / 2, y: origin.y + 176 };
          this.movementWaypoint = this.player.destination;
          this.routedMovementGoal = this.player.destination;
          this.regionGateCooldownUntil = this.elapsed + 0.85;
          this.events.push({
            type: 'jurchen-gate-blocked',
            region: this.region,
            remaining: progress.total - progress.defeated,
          });
        } else {
          const next = jurchenForwardDestination(this.region);
          this.travelToCampaignRegion(next, 'south');
        }
      }
    }
    else if (isJurchenExpansionRegion(this.region) && southReached) {
      const previous = jurchenBackwardDestination(this.region);
      if (previous) this.travelToCampaignRegion(previous, 'north');
    }
    else if (this.region === 'jeonju' && westReached) this.travelToCampaignRegion('busanjin', 'south');
    else if (this.region === 'busanjin' && northReached) this.travelToCampaignRegion('tangeumdae', 'south');
    else if (this.region === 'busanjin' && southReached) this.travelToCampaignRegion('jeonju', 'north');
    else if (this.region === 'tangeumdae' && northReached) {
      if (!this.tangeumCleared) {
        const progress = this.getTangeumBattleProgress();
        this.player.destination = { x: origin.x + MAP_WIDTH / 2, y: origin.y + 176 };
        this.movementWaypoint = this.player.destination;
        this.regionGateCooldownUntil = this.elapsed + 0.85;
        this.events.push({ type: 'tangeum-gate-blocked', remaining: progress.total - progress.defeated });
      } else {
        this.travelToCampaignRegion('gyeongbokgate', 'south');
      }
    }
    else if (this.region === 'tangeumdae' && southReached) this.travelToCampaignRegion('busanjin', 'north');
    else if (this.region === 'gyeongbokgate' && northReached) this.travelToCampaignRegion('gyeongbokcourt', 'south');
    else if (this.region === 'gyeongbokgate' && southReached) this.travelToCampaignRegion('tangeumdae', 'north');
    else if (this.region === 'gyeongbokcourt' && northReached) this.travelToCampaignRegion('gyeongbokinner', 'south');
    else if (this.region === 'gyeongbokcourt' && southReached) this.travelToCampaignRegion('gyeongbokgate', 'north');
    else if (this.region === 'gyeongbokinner' && northReached) this.travelToCampaignRegion('pyongyanginner', 'south');
    else if (this.region === 'gyeongbokinner' && southReached) this.travelToCampaignRegion('gyeongbokcourt', 'north');
    else if (this.region === 'jurchenvillage' && southReached) {
      if (this.isFrontierArcher() && !this.isJurchenUnified()) {
        const progress = this.getJurchenUnificationProgress();
        this.player.destination = {
          x: origin.x + MAP_WIDTH / 2,
          y: origin.y + 780,
        };
        this.movementWaypoint = this.player.destination;
        this.routedMovementGoal = this.player.destination;
        this.regionGateCooldownUntil = this.elapsed + 0.9;
        this.events.push({
          type: 'jurchen-gate-blocked',
          region: 'jurchenvillage',
          remaining: progress.totalStages - progress.clearedStages,
        });
      } else {
        this.travelToCampaignRegion('manchufrontier', 'north');
      }
    }
    else if (this.region === 'manchufrontier' && northReached) this.travelToCampaignRegion('jurchenvillage', 'south');
    else if (this.region === 'manchufrontier' && southReached) {
      if (this.isFrontierArcher() && !this.hajinSouthwardMarch) {
        const progress = this.getHajinMissionProgress();
        this.player.destination = {
          x: origin.x + MAP_WIDTH / 2,
          y: origin.y + 720,
        };
        this.movementWaypoint = this.player.destination;
        this.routedMovementGoal = this.player.destination;
        this.regionGateCooldownUntil = this.elapsed + 0.9;
        this.events.push({ type: 'southward-gate-blocked', remaining: progress.total - progress.defeated });
        return;
      }
      this.travelToCampaignRegion('pyongyangouter', 'north');
    }
    else if (this.region === 'pyongyangouter' && northReached) this.travelToCampaignRegion('manchufrontier', 'south');
    else if (this.region === 'pyongyangouter' && southReached) this.travelToCampaignRegion('pyongyanggate', 'north');
    else if (this.region === 'pyongyanggate' && northReached) this.travelToCampaignRegion('pyongyangouter', 'south');
    else if (this.region === 'pyongyanggate' && southReached) this.travelToCampaignRegion('pyongyanginner', 'north');
    else if (this.region === 'pyongyanginner' && northReached) this.travelToCampaignRegion('pyongyanggate', 'south');
    else if (this.region === 'pyongyanginner' && southReached) this.travelToCampaignRegion('gyeongbokgate', 'south');
  }

  private updateWorldEvents(): void {
    if (isJapanRegion(this.region) || isJurchenRegion(this.region)
      || isJoseonTownRegion(this.region)) {
      if (this.activeWorldEvent) {
        const abandoned = this.activeWorldEvent;
        this.activeWorldEvent = null;
        this.nextWorldEventAt = this.elapsed + 38;
        this.events.push({ type: 'world-event-ended', kind: abandoned.kind, title: abandoned.title });
      }
      return;
    }
    if (this.activeWorldEvent && this.elapsed >= this.activeWorldEvent.endsAt) {
      const completed = this.activeWorldEvent;
      this.activeWorldEvent = null;
      this.nextWorldEventAt = this.elapsed + 38;
      this.events.push({ type: 'world-event-ended', kind: completed.kind, title: completed.title });
      return;
    }
    if (this.activeWorldEvent || this.elapsed < this.nextWorldEventAt || this.region === 'village'
      || this.region === 'dungeon' || this.region === 'yeongwolhq'
      || this.region === 'ulleungdo' || this.region === 'ulleungvillage'
      || isJoseonTownRegion(this.region)) return;

    if (this.region === 'manchufrontier' && this.isFrontierArcher()) {
      const eventDefinitions: Array<{
        kind: WorldEventKind;
        title: string;
        description: string;
        goal: number;
        rewardGold: number;
        rewardItemId: ItemId;
      }> = [
        {
          kind: 'frontier-supply-raid',
          title: '압록 나루 군량 탈취',
          description: '조선 환도병과 장창병이 얼음 나루로 군량 수레를 호위한다. 전열 2명을 끊어 보급품을 빼앗아라.',
          goal: 2,
          rewardGold: 42,
          rewardItemId: 'jurchen-iron-arrowheads',
        },
        {
          kind: 'frontier-dispatch-intercept',
          title: '봉인 군보 가로채기',
          description: '조선 궁수가 남쪽 진보로 병력 교대 군보를 옮긴다. 궁수 2명을 쓰러뜨려 문서를 확보하라.',
          goal: 2,
          rewardGold: 55,
          rewardItemId: 'border-war-dispatch',
        },
        {
          kind: 'frontier-scout-signal',
          title: '귀순 초군의 봉화',
          description: '조선군에 강제로 끌려온 초군이 무너진 목책에 신호를 남겼다. 국경군 3명을 끊어 탈출로를 열어라.',
          goal: 3,
          rewardGold: 68,
          rewardItemId: 'joseon-border-token',
        },
        {
          kind: 'frontier-command-duel',
          title: '조선 진보 선봉장 결투',
          description: '압록 진보의 지휘관이 직접 전열을 수습한다. 선봉장을 쓰러뜨려 남쪽 조선 군로를 무너뜨려라.',
          goal: 1,
          rewardGold: 120,
          rewardItemId: this.frontierCommandReward(),
        },
      ];
      const definition = eventDefinitions[this.worldEventCycle % eventDefinitions.length];
      this.worldEventCycle += 1;
      this.activeWorldEvent = {
        ...definition,
        region: this.region,
        progress: 0,
        endsAt: this.elapsed + 48,
      };
      this.prepareFrontierEventTargets(definition.kind, definition.goal);
      this.events.push({ type: 'world-event-started', event: { ...this.activeWorldEvent } });
      return;
    }

    const islandEvent = this.region === 'ulleungcoast' || this.region === 'ulleungmeadow' || this.region === 'ulleunghunt'
      || this.region === 'ulleungridge';
    const islandEvents: Array<[WorldEventKind, string, string]> = [
      ['guard-patrol', '관아 징세 순찰대', '포졸 순찰대가 백성의 곡식을 빼앗으며 길목을 수색한다.'],
      ['beast-surge', '굶주린 산짐승 떼', '바닷바람에 몰린 산짐승이 사냥터 중앙으로 내려왔다.'],
      ['refugee-request', '피난민의 다급한 부탁', '약탈품을 되찾기 위해 주변 적을 토벌하면 추가 보상을 얻는다.'],
      ['spirit-omen', '해송숲의 푸른 귀기', '요괴의 기운이 짙어져 강한 적이 더 많은 경험을 남긴다.'],
    ];
    const mainlandEvents: Array<[WorldEventKind, string, string]> = [
      ['spirit-omen', '월영의 불길한 징조', '푸른 달기운이 번져 요괴 토벌 경험이 증가한다.'],
      ['beast-surge', '산짐승 대이동', '굶주린 짐승들이 길목으로 몰려들었다.'],
    ];
    const pool = islandEvent ? islandEvents : mainlandEvents;
    const [kind, title, description] = pool[this.worldEventCycle % pool.length];
    this.worldEventCycle += 1;
    this.activeWorldEvent = { kind, region: this.region, title, description, endsAt: this.elapsed + 30 };
    this.events.push({ type: 'world-event-started', event: { ...this.activeWorldEvent } });

    if (kind === 'guard-patrol') {
      for (const guard of this.monsters) {
        if (guard.region !== this.region || !isUlleungGuard(guard.kind)) continue;
        guard.alive = true;
        guard.hp = guard.maxHp;
        guard.respawnAt = 0;
        guard.x = guard.spawn.x;
        guard.y = guard.spawn.y;
        guard.velocity = { x: 0, y: 0 };
        guard.aiState = 'patrol';
        guard.aggro = false;
        guard.elemental = emptyElementalState();
      }
    }
  }

  private frontierCommandReward(): ItemId {
    for (const itemId of ['northwind-warbow', 'frontier-lamellar-coat', 'falcon-eye-bracer'] as ItemId[]) {
      if (!this.ownsItem(itemId)) return itemId;
    }
    return 'weapon-enchant-scroll';
  }

  private ownsItem(itemId: ItemId): boolean {
    return this.inventory.some((item) => item.itemId === itemId)
      || this.groundDrops.some((drop) => drop.itemId === itemId);
  }

  private isFrontierEventTarget(kind: WorldEventKind, monster: MonsterState): boolean {
    if (monster.region !== 'manchufrontier' || !isFrontierJoseon(monster.kind)) return false;
    if (kind === 'frontier-supply-raid') {
      return monster.kind === 'joseon-border-swordsman' || monster.kind === 'joseon-border-spearman';
    }
    if (kind === 'frontier-dispatch-intercept') return monster.kind === 'joseon-border-archer';
    if (kind === 'frontier-command-duel') return monster.kind === 'joseon-border-commander';
    return kind === 'frontier-scout-signal';
  }

  private prepareFrontierEventTargets(kind: WorldEventKind, goal: number): void {
    const targets = this.monsters.filter((monster) => this.isFrontierEventTarget(kind, monster));
    for (const monster of targets.slice(0, Math.max(goal, 1))) {
      if (!monster.alive) {
        monster.alive = true;
        monster.hp = monster.maxHp;
        monster.x = monster.spawn.x;
        monster.y = monster.spawn.y;
      }
      monster.respawnAt = 0;
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
      monster.velocity = { x: 0, y: 0 };
      monster.elemental = emptyElementalState();
    }
  }

  private advanceFrontierWorldEvent(monster: MonsterState): void {
    const active = this.activeWorldEvent;
    if (!active || active.region !== 'manchufrontier' || !active.kind.startsWith('frontier-')
      || !this.isFrontierEventTarget(active.kind, monster)) return;
    const goal = active.goal ?? 1;
    active.progress = Math.min(goal, (active.progress ?? 0) + 1);
    this.events.push({ type: 'world-event-progress', kind: active.kind, progress: active.progress, goal });
    if (active.progress < goal) return;

    const itemId = active.rewardItemId;
    const gold = active.rewardGold ?? 0;
    this.player.gold += gold;
    if (itemId) this.spawnDropAt(this.player.x + 26, this.player.y - 8, itemId);
    this.events.push({
      type: 'world-event-completed',
      kind: active.kind,
      title: active.title,
      gold,
      itemId,
      itemName: itemId ? ITEM_CATALOG[itemId].name : undefined,
    });
    this.activeWorldEvent = null;
    this.nextWorldEventAt = this.elapsed + 18;
  }

  private changeRegion(region: RegionId): void {
    const previousRegion = this.region;
    const previousIslandIndex = ULLEUNG_REGION_IDS.indexOf(previousRegion as typeof ULLEUNG_REGION_IDS[number]);
    const nextIslandIndex = ULLEUNG_REGION_IDS.indexOf(region as typeof ULLEUNG_REGION_IDS[number]);
    const continuousIslandTransition = previousIslandIndex >= 0
      && nextIslandIndex >= 0
      && Math.abs(previousIslandIndex - nextIslandIndex) === 1;
    const continuousTransition = worldTerrainSeamBetween(previousRegion, region) !== null
      || continuousIslandTransition;
    this.region = region;
    this.visitedRegions.add(region);
    this.tangeumArrivalAnnounced = region !== 'tangeumdae';
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.pendingPlayerAttack = null;
    this.resetBasicAttackChain();
    this.pendingMonsterAttacks = [];
    if (!continuousTransition) {
      this.followers.forEach((follower, index) => {
        follower.x = this.player.x - Math.cos(this.player.facing) * (54 + index * 18);
        follower.y = this.player.y - Math.sin(this.player.facing) * (44 + index * 14);
        follower.velocity = { x: 0, y: 0 };
        follower.targetId = null;
        follower.actionTimer = 0;
      });
      for (const monster of this.monsters) {
        monster.aggro = false;
        monster.aiState = 'return';
        monster.actionTimer = 0;
        monster.velocity.x = 0;
        monster.velocity.y = 0;
      }
    }
    this.events.push({ type: 'region-changed', region });
  }

  private updateFollowers(dt: number): void {
    for (let index = 0; index < this.followers.length; index += 1) {
      const follower = this.followers[index];
      const definition = FOLLOWER_CATALOG[follower.kind];
      follower.attackCooldown = Math.max(0, follower.attackCooldown - dt);
      follower.actionTimer = Math.max(0, follower.actionTimer - dt);

      if (this.distance(follower, this.player) > 760) {
        follower.x = this.player.x - Math.cos(this.player.facing) * (64 + index * 20);
        follower.y = this.player.y - Math.sin(this.player.facing) * (50 + index * 16);
        follower.velocity = { x: 0, y: 0 };
      }

      const selectedMonster = this.getTarget();
      const currentTarget = follower.targetId
        ? this.monsters.find((monster) => monster.id === follower.targetId
          && monster.alive
          && monster.region === this.region
          && this.isRoyalRefugeMonsterActive(monster)
          && !this.isFriendlyMonster(monster)) ?? null
        : null;
      const invasionFollower = follower.route === 'invasion';
      const bunjoFollower = follower.route === 'bunjo';
      const armyFollower = invasionFollower || bunjoFollower;
      const nearbyAggressor = this.monsters
        .filter((monster) => monster.alive
          && monster.region === this.region
          && this.isRoyalRefugeMonsterActive(monster)
          && !this.isFriendlyMonster(monster)
          && (monster.aggro
            || (invasionFollower && isHajinInvasionTarget(monster.kind))
            || bunjoFollower)
          && this.distance(monster, follower) <= (armyFollower ? 560 : 360))
        .sort((a, b) => {
          if (follower.kind === 'special-warrior'
            || follower.kind === 'jurchen-captain'
            || follower.kind === 'gwanghae-captain') {
            return b.maxHp - a.maxHp;
          }
          return this.distance(follower, a) - this.distance(follower, b);
        })[0] ?? null;
      const monsterTarget = selectedMonster ?? currentTarget ?? nearbyAggressor;
      const bossTarget = this.getBossTarget();

      if (monsterTarget) {
        follower.targetId = monsterTarget.id;
        const distance = this.distance(follower, monsterTarget);
        follower.facing = Math.atan2(monsterTarget.y - follower.y, monsterTarget.x - follower.x);
        if (distance > definition.attackRange) {
          this.moveFollowerToward(follower, monsterTarget, definition.moveSpeed, dt, definition.attackRange - 8);
          continue;
        }
        follower.velocity.x = 0;
        follower.velocity.y = 0;
        if (follower.attackCooldown > 0 || follower.actionTimer > 0) continue;
        const damage = Math.max(1, Math.round(
          (definition.damage + Math.floor(this.player.level / 3))
          * (1 + this.getDerivedAttributeBonuses().followerPower / 100),
        ));
        monsterTarget.hp = Math.max(0, monsterTarget.hp - damage);
        monsterTarget.aggro = true;
        monsterTarget.hitStun = Math.max(monsterTarget.hitStun, 0.12);
        follower.attackCooldown = follower.kind === 'special-warrior'
          || follower.kind === 'jurchen-captain'
          || follower.kind === 'gwanghae-captain'
          ? 0.7
          : follower.kind === 'jurchen-bowguard' || follower.kind === 'gwanghae-archer' ? 0.92 : 0.84;
        follower.actionTimer = 0.38;
        this.events.push({
          type: 'follower-attack',
          followerId: follower.id,
          targetId: monsterTarget.id,
          damage,
          attackKind: followerAttackKind(follower.kind),
        });
        if (monsterTarget.hp === 0) this.killMonster(monsterTarget);
        continue;
      }

      if (bossTarget) {
        follower.targetId = bossTarget.id;
        const distance = this.distance(follower, bossTarget);
        follower.facing = Math.atan2(bossTarget.y - follower.y, bossTarget.x - follower.x);
        if (distance > definition.attackRange + 22) {
          this.moveFollowerToward(follower, bossTarget, definition.moveSpeed, dt, definition.attackRange + 8);
          continue;
        }
        follower.velocity.x = 0;
        follower.velocity.y = 0;
        if (follower.attackCooldown <= 0 && follower.actionTimer <= 0) {
          const damage = Math.max(1, Math.round(
            (definition.damage + Math.floor(this.player.level / 3))
            * (1 + this.getDerivedAttributeBonuses().followerPower / 100),
          ));
          this.damageBoss(damage);
          follower.attackCooldown = follower.kind === 'special-warrior'
            || follower.kind === 'jurchen-captain'
            || follower.kind === 'gwanghae-captain'
            ? 0.7
            : follower.kind === 'jurchen-bowguard' || follower.kind === 'gwanghae-archer' ? 0.92 : 0.84;
          follower.actionTimer = 0.38;
          this.events.push({
            type: 'follower-attack',
            followerId: follower.id,
            targetId: bossTarget.id,
            damage,
            attackKind: followerAttackKind(follower.kind),
          });
        }
        continue;
      }

      follower.targetId = null;
      const armySlot = armyFollower
        ? {
          back: 84 + Math.floor(index / 5) * 48,
          side: (index % 5 - 2) * 52,
        }
        : null;
      const back = armyFollower && armySlot ? armySlot.back : 64 + Math.floor(index / 2) * 42;
      const side = armyFollower && armySlot ? armySlot.side : index === 0 ? -52 : index === 1 ? 52 : 0;
      const formation = {
        x: this.player.x - Math.cos(this.player.facing) * back + Math.cos(this.player.facing + Math.PI / 2) * side,
        y: this.player.y - Math.sin(this.player.facing) * back + Math.sin(this.player.facing + Math.PI / 2) * side * 0.72,
      };
      if (this.distance(follower, formation) > 20) {
        this.moveFollowerToward(follower, formation, definition.moveSpeed, dt, 12);
      } else {
        follower.velocity.x *= Math.exp(-10 * dt);
        follower.velocity.y *= Math.exp(-10 * dt);
        if (Math.hypot(follower.velocity.x, follower.velocity.y) < 1) follower.velocity = { x: 0, y: 0 };
        follower.facing = this.player.facing;
      }
    }
  }

  private moveFollowerToward(follower: FollowerState, target: Vec2, speed: number, dt: number, stopDistance: number): void {
    const before = { x: follower.x, y: follower.y };
    this.moveEntityToward(follower, target, speed, dt, stopDistance);
    this.resolveObstacleCollision(follower, 20);
    const clamped = this.clampToField(follower);
    follower.x = clamped.x;
    follower.y = clamped.y;
    follower.velocity.x = (follower.x - before.x) / Math.max(0.001, dt);
    follower.velocity.y = (follower.y - before.y) / Math.max(0.001, dt);
    if (Math.hypot(follower.velocity.x, follower.velocity.y) > 2) {
      follower.facing = Math.atan2(follower.velocity.y, follower.velocity.x);
    }
  }

  drainEvents(): GameEvent[] {
    return this.events.splice(0);
  }

  getTarget(): MonsterState | null {
    if (!this.player.targetId) return null;
    return this.monsters.find((entry) => entry.id === this.player.targetId
      && entry.alive
      && entry.region === this.region
      && this.isRoyalRefugeMonsterActive(entry)) ?? null;
  }

  getBossTarget(): BossState | null {
    return this.boss?.alive && this.player.targetId === this.boss.id ? this.boss : null;
  }

  private updateBossTargetCombat(target: BossState, dt: number): void {
    const distance = this.distance(this.player, target);
    const attackRange = this.getPlayerAttackRange();
    this.player.facing = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    if (distance > attackRange) {
      this.movePlayerToward(target, this.momentumSpeed(150), dt, attackRange - 12);
      return;
    }
    if (this.player.attackCooldown > 0 || this.pendingPlayerAttack) return;
    const style = this.getEquippedDefinition('weapon') ? 'weapon' : 'fist';
    const step = this.nextBasicAttackStep(target.id);
    const finisher = step === 3;
    const critical = Math.random() < (finisher ? 0.24 : 0.14);
    const rawDamage = this.getAttackPower() + Math.floor(Math.random() * 6);
    const chainMultiplier = step === 2 ? 1.08 : finisher ? (style === 'weapon' ? 1.48 : 1.3) : 1;
    const chainedDamage = Math.round(rawDamage * chainMultiplier);
    const damage = critical ? Math.round(chainedDamage * 1.6) : chainedDamage;
    const cadence = step === 1 ? 0.82 : step === 2 ? 0.76 : 1.04;
    this.player.attackCooldown = (this.isBowEquipped() ? 0.78 : style === 'weapon' ? 0.64 : 0.52)
      * cadence * (this.player.momentumActive > 0 ? 0.78 : 1);
    this.pendingPlayerAttack = {
      targetId: target.id,
      damage,
      critical,
      impactAt: this.elapsed + (this.isBowEquipped() ? 0.3 : style === 'weapon' ? 0.24 : 0.18),
      style,
      element: this.getEquippedWeaponElement(),
      step,
    };
    this.events.push({ type: 'player-attack', targetId: target.id, style });
    this.events.push({ type: 'basic-chain-start', targetId: target.id, style, step });
  }

  private nextBasicAttackStep(targetId: string): BasicAttackStep {
    const continuesChain = this.basicAttackTargetId === targetId && this.elapsed <= this.basicAttackExpiresAt;
    const step = continuesChain
      ? ((this.basicAttackStep % 3) + 1) as BasicAttackStep
      : 1;
    this.basicAttackStep = step;
    this.basicAttackTargetId = targetId;
    this.basicAttackExpiresAt = this.elapsed + 1.2;
    return step;
  }

  private resetBasicAttackChain(): void {
    this.basicAttackStep = 1;
    this.basicAttackTargetId = null;
    this.basicAttackExpiresAt = 0;
  }

  private updateTargetCombat(target: MonsterState, dt: number): void {
    const distance = this.distance(this.player, target);
    const attackRange = this.getPlayerAttackRange();
    this.player.facing = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    if (distance > attackRange) {
      this.movePlayerToward(target, this.momentumSpeed(150), dt, attackRange - 12);
      return;
    }
    if (this.player.attackCooldown > 0 || this.pendingPlayerAttack) return;

    const style = this.getEquippedDefinition('weapon') ? 'weapon' : 'fist';
    const step = this.nextBasicAttackStep(target.id);
    const finisher = step === 3;
    const critical = Math.random() < (finisher ? 0.24 : 0.14);
    const rawDamage = this.getAttackPower() + Math.floor(Math.random() * 6);
    const chainMultiplier = step === 2 ? 1.08 : finisher ? (style === 'weapon' ? 1.48 : 1.3) : 1;
    const chainedDamage = Math.round(rawDamage * chainMultiplier);
    const rolledDamage = critical ? Math.round(chainedDamage * 1.6) : chainedDamage;
    const damage = this.playerDamageBonusAgainstMonster(target, rolledDamage);
    const cadence = step === 1 ? 0.82 : step === 2 ? 0.76 : 1.04;
    this.player.attackCooldown = (this.isBowEquipped() ? 0.78 : style === 'weapon' ? 0.64 : 0.52)
      * cadence * (this.player.momentumActive > 0 ? 0.78 : 1);
    this.pendingPlayerAttack = {
      targetId: target.id,
      damage,
      critical,
      impactAt: this.elapsed + (this.isBowEquipped() ? 0.3 : style === 'weapon' ? 0.24 : 0.18),
      style,
      element: this.getEquippedWeaponElement(),
      step,
    };
    this.events.push({ type: 'player-attack', targetId: target.id, style });
    this.events.push({ type: 'basic-chain-start', targetId: target.id, style, step });
  }

  private updateLootCollection(dt: number): void {
    const drop = this.groundDrops.find((entry) => entry.id === this.player.lootTargetId);
    if (!drop || (drop.region && drop.region !== this.region)) {
      this.player.lootTargetId = null;
      return;
    }
    this.player.facing = Math.atan2(drop.y - this.player.y, drop.x - this.player.x);
    if (this.distance(this.player, drop) > 64) {
      this.movePlayerToward(drop, 155, dt, 58);
      return;
    }
    const definition = ITEM_CATALOG[drop.itemId];
    if (this.inventory.length >= this.inventoryCapacity) {
      this.events.push({ type: 'inventory-full', itemName: definition.name });
      this.player.lootTargetId = null;
      return;
    }
    this.groundDrops.splice(this.groundDrops.indexOf(drop), 1);
    this.inventory.push({ instanceId: `item-${this.itemCounter++}`, itemId: drop.itemId });
    this.player.lootTargetId = null;
    this.events.push({ type: 'item-pickup', itemId: drop.itemId, itemName: definition.name });
  }

  private applyElementalStatus(
    monster: MonsterState,
    element: WeaponElement,
    baseDamage: number,
    fromTargetId?: string,
    allowChain = true,
  ): void {
    if (!monster.alive) return;

    let reaction: Extract<GameEvent, { type: 'elemental-reaction' }>['reaction'] | null = null;
    let reactionMultiplier = 0;
    if (element === 'fire' && monster.elemental.frostSeconds > 0) {
      reaction = 'steam-burst';
      reactionMultiplier = 0.55;
      monster.elemental.frostSeconds = 0;
    } else if (element === 'lightning' && monster.elemental.frostSeconds > 0) {
      reaction = 'frost-shatter';
      reactionMultiplier = 0.7;
      monster.elemental.frostSeconds = 0;
    } else if (element === 'fire' && monster.elemental.poisonSeconds > 0) {
      reaction = 'toxic-ignition';
      reactionMultiplier = 0.45 + monster.elemental.poisonStacks * 0.08;
      monster.elemental.poisonSeconds = 0;
      monster.elemental.poisonStacks = 0;
    } else if (element === 'wind' && monster.elemental.burnSeconds > 0) {
      reaction = 'firestorm';
      reactionMultiplier = 0.4;
      monster.elemental.burnSeconds = Math.max(monster.elemental.burnSeconds, 2.5);
    } else if (element === 'earth' && monster.elemental.shockSeconds > 0) {
      reaction = 'ground-discharge';
      reactionMultiplier = 0.5;
      monster.elemental.shockSeconds = 0;
    }
    if (reaction) {
      const reactionDamage = Math.min(monster.hp, Math.max(4, Math.round(baseDamage * reactionMultiplier)));
      monster.hp = Math.max(0, monster.hp - reactionDamage);
      this.events.push({ type: 'elemental-reaction', reaction, targetId: monster.id, damage: reactionDamage });
      if (monster.hp === 0) {
        this.killMonster(monster);
        return;
      }
    }

    if (element === 'fire') {
      monster.elemental.burnSeconds = Math.max(monster.elemental.burnSeconds, 4);
      monster.elemental.burnTick = Math.min(monster.elemental.burnTick || 0.72, 0.72);
      monster.elemental.burnDamage = Math.max(monster.elemental.burnDamage, Math.max(3, Math.round(baseDamage * 0.18)));
      this.events.push({ type: 'elemental-applied', element, targetId: monster.id, duration: 4, fromTargetId });
      return;
    }
    if (element === 'ice') {
      monster.elemental.frostSeconds = Math.max(monster.elemental.frostSeconds, 2.8);
      monster.hitStun = Math.max(monster.hitStun, 0.38);
      monster.attackCooldown = Math.max(monster.attackCooldown, 0.7);
      this.events.push({ type: 'elemental-applied', element, targetId: monster.id, duration: 2.8, fromTargetId });
      return;
    }
    if (element === 'lightning') {
      monster.elemental.shockSeconds = Math.max(monster.elemental.shockSeconds, 0.72);
      monster.hitStun = Math.max(monster.hitStun, 0.34);
      this.events.push({ type: 'elemental-applied', element, targetId: monster.id, duration: 0.72, fromTargetId });
      if (!allowChain) return;
      const chained = this.nearbyMonsters(monster, 190, 2);
      const chainDamage = Math.max(4, Math.round(baseDamage * 0.48));
      for (const target of chained) {
        target.elemental.shockSeconds = Math.max(target.elemental.shockSeconds, 0.9);
        target.hitStun = Math.max(target.hitStun, 0.42);
        target.aggro = true;
        target.hp = Math.max(0, target.hp - chainDamage);
        this.events.push({ type: 'elemental-applied', element, targetId: target.id, duration: 0.9, fromTargetId: monster.id });
        this.events.push({ type: 'elemental-damage', element, targetId: target.id, damage: chainDamage, fromTargetId: monster.id });
        if (target.hp === 0) this.killMonster(target);
      }
      return;
    }
    if (element === 'poison') {
      monster.elemental.poisonStacks = Math.min(3, monster.elemental.poisonStacks + 1);
      monster.elemental.poisonSeconds = Math.max(monster.elemental.poisonSeconds, 5);
      monster.elemental.poisonTick = Math.min(monster.elemental.poisonTick || 0.8, 0.8);
      monster.elemental.poisonDamage = Math.max(2, Math.round(baseDamage * 0.11));
      this.events.push({ type: 'elemental-applied', element, targetId: monster.id, duration: 5, fromTargetId });
      return;
    }
    if (element === 'wind') {
      monster.elemental.gustSeconds = Math.max(monster.elemental.gustSeconds, 0.65);
      const angle = Math.atan2(monster.y - this.player.y, monster.x - this.player.x);
      monster.knockback = { x: Math.cos(angle) * 126, y: Math.sin(angle) * 126 };
      this.events.push({ type: 'elemental-applied', element, targetId: monster.id, duration: 0.65, fromTargetId });
      if (!allowChain) return;
      const cleaveDamage = Math.max(3, Math.round(baseDamage * 0.34));
      for (const target of this.nearbyMonsters(monster, 155, 2)) {
        target.hp = Math.max(0, target.hp - cleaveDamage);
        target.elemental.gustSeconds = Math.max(target.elemental.gustSeconds, 0.45);
        target.knockback = { x: Math.cos(angle) * 88, y: Math.sin(angle) * 88 };
        target.aggro = true;
        this.events.push({ type: 'elemental-damage', element, targetId: target.id, damage: cleaveDamage, fromTargetId: monster.id });
        if (target.hp === 0) this.killMonster(target);
      }
      return;
    }
    if (element === 'earth') {
      monster.elemental.stoneSeconds = Math.max(monster.elemental.stoneSeconds, 0.95);
      monster.hitStun = Math.max(monster.hitStun, 0.76);
      this.events.push({ type: 'elemental-applied', element, targetId: monster.id, duration: 0.95, fromTargetId });
      if (!allowChain) return;
      const quakeDamage = Math.max(3, Math.round(baseDamage * 0.27));
      for (const target of this.nearbyMonsters(monster, 135, 3)) {
        target.hp = Math.max(0, target.hp - quakeDamage);
        target.elemental.stoneSeconds = Math.max(target.elemental.stoneSeconds, 0.52);
        target.hitStun = Math.max(target.hitStun, 0.46);
        target.aggro = true;
        this.events.push({ type: 'elemental-damage', element, targetId: target.id, damage: quakeDamage, fromTargetId: monster.id });
        if (target.hp === 0) this.killMonster(target);
      }
      return;
    }

    monster.elemental.shadowSeconds = Math.max(monster.elemental.shadowSeconds, 1.8);
    this.events.push({ type: 'elemental-applied', element, targetId: monster.id, duration: 1.8, fromTargetId });
    const heal = Math.min(this.player.maxHp - this.player.hp, Math.max(2, Math.round(baseDamage * 0.2)));
    if (heal > 0) {
      this.player.hp += heal;
      this.events.push({ type: 'elemental-heal', element: 'shadow', amount: heal });
    }
    if (monster.hp > 0 && monster.hp / monster.maxHp <= 0.22) {
      const executeDamage = monster.hp;
      monster.hp = 0;
      this.events.push({ type: 'elemental-damage', element, targetId: monster.id, damage: executeDamage, fromTargetId });
      this.killMonster(monster);
    }
  }

  private updateElementalStatus(monster: MonsterState, dt: number): void {
    const status = monster.elemental;
    status.frostSeconds = Math.max(0, status.frostSeconds - dt);
    status.shockSeconds = Math.max(0, status.shockSeconds - dt);
    status.gustSeconds = Math.max(0, status.gustSeconds - dt);
    status.stoneSeconds = Math.max(0, status.stoneSeconds - dt);
    status.shadowSeconds = Math.max(0, status.shadowSeconds - dt);
    if (status.burnSeconds > 0) {
      status.burnSeconds = Math.max(0, status.burnSeconds - dt);
      status.burnTick -= dt;
      if (status.burnTick <= 0) {
        status.burnTick += 0.72;
        const damage = Math.min(monster.hp, status.burnDamage);
        monster.hp = Math.max(0, monster.hp - damage);
        this.events.push({ type: 'elemental-damage', element: 'fire', targetId: monster.id, damage });
        if (monster.hp === 0) {
          status.burnSeconds = Math.max(status.burnSeconds, 0.12);
          this.killMonster(monster);
          return;
        }
      }
    }
    if (status.poisonSeconds > 0) {
      status.poisonSeconds = Math.max(0, status.poisonSeconds - dt);
      status.poisonTick -= dt;
      if (status.poisonTick <= 0) {
        status.poisonTick += 0.8;
        const damage = Math.min(monster.hp, status.poisonDamage * Math.max(1, status.poisonStacks));
        monster.hp = Math.max(0, monster.hp - damage);
        this.events.push({ type: 'elemental-damage', element: 'poison', targetId: monster.id, damage });
        if (monster.hp === 0) this.killMonster(monster);
      }
    }
  }

  private nearbyMonsters(monster: MonsterState, radius: number, limit: number): MonsterState[] {
    return this.monsters
      .filter((candidate) => candidate !== monster
        && candidate.alive
        && candidate.region === monster.region
        && this.isRoyalRefugeMonsterActive(candidate)
        && !this.isFriendlyMonster(candidate)
        && this.distance(monster, candidate) <= radius)
      .sort((a, b) => this.distance(monster, a) - this.distance(monster, b))
      .slice(0, limit);
  }

  private updateFrontierAmbush(): void {
    if (!this.isFrontierArcher()
      || this.region !== 'manchufrontier'
      || this.frontierAmbushPhase === 'inactive'
      || this.frontierAmbushPhase === 'engaged') return;

    if (this.frontierAmbushPhase === 'waiting') {
      if (this.elapsed < this.frontierAmbushAt) return;
      const target = this.frontierMissionTargets()
        .filter((monster) => monster.alive && isFrontierJoseon(monster.kind))
        .sort((left, right) => this.distance(this.player, left) - this.distance(this.player, right))[0];
      if (!target) {
        this.frontierAmbushPhase = 'engaged';
        return;
      }
      this.player.facing = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      this.frontierOpeningShotTargetId = target.id;
      this.frontierOpeningShotImpactAt = this.elapsed + 0.42;
      this.frontierAmbushPhase = 'arrow';
      this.events.push({ type: 'frontier-ambush-fired', targetId: target.id, damage: target.maxHp });
      return;
    }

    if (this.elapsed < this.frontierOpeningShotImpactAt) return;
    const target = this.frontierMissionTargets()
      .find((monster) => monster.id === this.frontierOpeningShotTargetId && monster.alive);
    this.frontierAmbushPhase = 'engaged';
    if (target) {
      target.hp = 0;
      this.fallFrontierUnit(target);
    }
    const fleeing = this.frontierMissionTargets()
      .filter((monster) => monster.alive
        && isFrontierJoseon(monster.kind)
        && monster.kind !== 'joseon-border-commander')
      .filter((_monster, index) => index % 3 === 1)
      .slice(0, 3);
    this.frontierRetreatResolveAt = this.elapsed + 2.8;
    for (const monster of fleeing) {
      this.frontierFleeingUnitIds.add(monster.id);
      monster.aiState = 'flee';
      monster.actionTimer = 0;
      monster.aggro = false;
    }
    for (const monster of this.monsters) {
      if (monster.region !== 'manchufrontier' || !monster.alive) continue;
      if (isFrontierJurchen(monster.kind) && monster.aiState !== 'attack') monster.aiState = 'alert';
      else if (isFrontierJoseon(monster.kind) && monster.aiState === 'sleep') monster.aiState = 'alert';
    }
    this.events.push({
      type: 'frontier-battle-started',
      jurchenCount: this.monsters.filter((monster) => monster.region === 'manchufrontier'
        && monster.alive && isFrontierJurchen(monster.kind)).length,
      joseonCount: this.monsters.filter((monster) => monster.region === 'manchufrontier'
        && monster.alive && isFrontierJoseon(monster.kind)).length,
      fleeingCount: fleeing.length,
    });
  }

  private updateJoseonCivilianFlightAi(monster: MonsterState, dt: number): void {
    if (monster.region === 'manchufrontier'
      && this.isFrontierArcher()
      && this.frontierAmbushPhase !== 'engaged') {
      monster.aiState = 'patrol';
      this.brakeMonster(monster, dt);
      return;
    }
    monster.aggro = false;
    const threats = this.activeMonsterRoster
      .filter((candidate) => candidate.alive && isFrontierJurchen(candidate.kind))
      .map((candidate) => ({ point: candidate as Vec2, distance: this.distance(monster, candidate) }));
    if (this.isFrontierArcher() && this.playerActive) {
      threats.push({ point: this.player, distance: this.distance(monster, this.player) });
    }
    const closest = threats.sort((left, right) => left.distance - right.distance)[0];
    if (!closest || closest.distance > 330) {
      this.updatePatrol(monster, dt);
      return;
    }
    const away = Math.atan2(monster.y - closest.point.y, monster.x - closest.point.x);
    const origin = REGION_ORIGINS[monster.region];
    const escapeY = Math.min(origin.y + MAP_HEIGHT - 46, monster.y + 145);
    const target = {
      x: monster.x + Math.cos(away) * 115,
      y: Math.max(monster.y + 50, escapeY),
    };
    monster.aiState = 'chase';
    monster.facing = Math.atan2(target.y - monster.y, target.x - monster.x);
    this.moveMonsterToward(monster, target, 118, dt, 4);
  }

  private updateFrontierBattleAi(monster: MonsterState, dt: number): boolean {
    const isJurchen = isFrontierJurchen(monster.kind);
    const isJoseon = isFrontierJoseon(monster.kind);
    if (monster.region !== 'manchufrontier' || (!isJurchen && !isJoseon)) return false;

    if (this.isFrontierArcher() && this.frontierAmbushPhase !== 'engaged') {
      monster.aggro = false;
      monster.aiState = isJoseon ? 'sleep' : 'brace';
      monster.facing = isJoseon ? -Math.PI / 2 : Math.PI / 2;
      this.brakeMonster(monster, dt);
      return true;
    }

    if (isJoseon && this.frontierFleeingUnitIds.has(monster.id)) {
      monster.aiState = 'flee';
      const origin = REGION_ORIGINS.manchufrontier;
      const escapePoint = {
        x: origin.x + 768 + (Number(monster.id.split('-').at(-1)) % 3 - 1) * 86,
        y: origin.y + 760,
      };
      monster.facing = Math.atan2(escapePoint.y - monster.y, escapePoint.x - monster.x);
      if (this.elapsed >= this.frontierRetreatResolveAt
        || monster.y >= origin.y + 742
        || this.distance(monster, escapePoint) <= 22) {
        this.fleeFrontierUnit(monster);
        return true;
      }
      this.moveMonsterToward(monster, escapePoint, 132, dt, 10);
      return true;
    }

    const playerDistance = this.distance(monster, this.player);
    const ranged = isRangedSoldier(monster.kind);
    const hostileToPlayer = !this.isFriendlyMonster(monster);
    const frontierOrigin = REGION_ORIGINS.manchufrontier;
    // Hajin begins north of the Yalu and advances south; Kim approaches from
    // Joseon territory in the south. Walking inside the story-side rear camp
    // must not pull the opposing line away from the faction battle.
    const localPlayerY = this.player.y - frontierOrigin.y;
    const playerInRearCamp = this.isFrontierArcher() ? localPlayerY <= 310 : localPlayerY >= 700;
    const playerEnteredContestedLane = !playerInRearCamp;
    if (hostileToPlayer && (
      monster.aggro
      || (playerEnteredContestedLane && this.playerActive && playerDistance <= (ranged ? 265 : 220))
    )) {
      return false;
    }

    monster.aggro = false;
    const opponents = this.activeMonsterRoster
      .filter((candidate) => candidate.alive
        && candidate.region === 'manchufrontier'
        && (isJurchen
          ? isFrontierJoseon(candidate.kind) || isJoseonCivilian(candidate.kind)
          : isFrontierJurchen(candidate.kind)))
      .sort((a, b) => this.distance(monster, a) - this.distance(monster, b));
    // Every unit used to select the exact same nearest target and converge on
    // one pixel. Assign each soldier one of the nearest opposing slots so the
    // two armies keep visible ranks while still reacting to nearby threats.
    const formationIndex = Number(monster.id.split('-').at(-1)) || 0;
    const target = opponents[Math.min(opponents.length - 1, formationIndex % Math.min(5, opponents.length))];
    if (!target) {
      this.updatePatrol(monster, dt);
      return true;
    }

    const targetDistance = this.distance(monster, target);
    const cavalry = monster.kind === 'manchu-cavalry';
    const attackRange = ranged ? 225 : cavalry ? 82 : 67;
    monster.facing = this.rotateToward(
      monster.facing,
      Math.atan2(target.y - monster.y, target.x - monster.x),
      9.5 * dt,
    );
    if (targetDistance > attackRange) {
      monster.aiState = 'chase';
      const targetAngle = Math.atan2(target.y - monster.y, target.x - monster.x);
      const laneSide = (formationIndex % 3) - 1;
      const laneOffset = ranged ? laneSide * 54 : laneSide * 24;
      const approachPoint = {
        x: target.x + Math.cos(targetAngle + Math.PI / 2) * laneOffset,
        y: target.y + Math.sin(targetAngle + Math.PI / 2) * laneOffset,
      };
      this.moveMonsterToward(
        monster,
        approachPoint,
        ranged ? 48 : cavalry ? 92 : monster.kind.endsWith('commander') || monster.kind === 'manchu-captain' ? 62 : 58,
        dt,
        ranged ? 178 : cavalry ? 68 : 54,
      );
      return true;
    }
    if (monster.attackCooldown > 0) {
      monster.aiState = 'circle';
      this.brakeMonster(monster, dt);
      return true;
    }

    monster.aiState = 'attack';
    monster.actionTimer = ranged ? 0.52 : 0.43;
    monster.attackCooldown = ranged ? 1.7 : monster.kind.endsWith('commander') || monster.kind === 'manchu-captain' ? 1.05 : 1.28;
    monster.velocity.x = 0;
    monster.velocity.y = 0;
    const baseDamage = isJoseonCivilian(target.kind)
      ? ranged ? 9 : 12
      : ranged ? 5 : cavalry ? 10 : monster.kind.endsWith('commander') || monster.kind === 'manchu-captain' ? 9 : 6;
    const damage = Math.min(target.hp, baseDamage);
    target.hp = Math.max(0, target.hp - damage);
    target.hitStun = Math.max(target.hitStun, ranged ? 0.1 : 0.17);
    target.knockback = {
      x: Math.cos(monster.facing) * (ranged ? 16 : 30),
      y: Math.sin(monster.facing) * (ranged ? 10 : 20),
    };
    const attackKind = ranged
      ? 'arrow'
      : cavalry
        ? 'cavalry'
        : monster.kind === 'manchu-captain' || monster.kind.endsWith('commander')
          ? 'command'
          : monster.kind.includes('lancer') || monster.kind.includes('spearman')
            ? 'spear'
            : 'blade';
    this.events.push({ type: 'frontier-clash', attackerId: monster.id, targetId: target.id, damage, ranged, attackKind });
    if (target.hp === 0) this.fallFrontierUnit(target);
    return true;
  }

  private fallFrontierUnit(monster: MonsterState): void {
    if (!monster.alive) return;
    monster.alive = false;
    monster.velocity = { x: 0, y: 0 };
    monster.aggro = false;
    this.frontierFleeingUnitIds.delete(monster.id);
    monster.respawnAt = this.isFrontierArcher() && (isFrontierJoseon(monster.kind) || isJoseonCivilian(monster.kind))
      ? Number.POSITIVE_INFINITY
      : this.elapsed + 10 + (Number(monster.id.split('-').at(-1)) % 4) * 1.4;
    this.pendingMonsterAttacks = this.pendingMonsterAttacks.filter((pending) => pending.monsterId !== monster.id);
    if (this.player.targetId === monster.id) this.player.targetId = null;
    this.events.push({ type: 'frontier-unit-fallen', monsterId: monster.id, name: monster.name });
    this.checkHajinFrontierMission();
  }

  private fleeFrontierUnit(monster: MonsterState): void {
    if (!monster.alive) return;
    monster.alive = false;
    monster.hp = Math.max(1, monster.hp);
    monster.velocity = { x: 0, y: 0 };
    monster.aggro = false;
    this.frontierFleeingUnitIds.delete(monster.id);
    monster.respawnAt = Number.POSITIVE_INFINITY;
    this.pendingMonsterAttacks = this.pendingMonsterAttacks.filter((pending) => pending.monsterId !== monster.id);
    if (this.player.targetId === monster.id) this.player.targetId = null;
    this.events.push({ type: 'frontier-unit-fled', monsterId: monster.id, name: monster.name });
    this.checkHajinFrontierMission();
  }

  private frontierMissionTargets(): MonsterState[] {
    return this.monsters.filter((monster) => monster.region === 'manchufrontier'
      && isFrontierJoseon(monster.kind));
  }

  private resetFrontierMissionTargets(): void {
    for (const monster of this.monsters.filter((candidate) =>
      candidate.region === 'manchufrontier'
      && (isFrontierJoseon(candidate.kind) || isJoseonCivilian(candidate.kind)))) {
      monster.alive = true;
      monster.hp = monster.maxHp;
      monster.x = monster.spawn.x;
      monster.y = monster.spawn.y;
      monster.respawnAt = 0;
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
      monster.velocity = { x: 0, y: 0 };
      monster.elemental = emptyElementalState();
    }
  }

  private markFrontierMissionTargetsDefeated(): void {
    for (const monster of this.frontierMissionTargets()) {
      monster.alive = false;
      monster.hp = 0;
      monster.respawnAt = Number.POSITIVE_INFINITY;
      monster.aggro = false;
      monster.velocity = { x: 0, y: 0 };
    }
  }

  private checkHajinFrontierMission(): void {
    if (!this.isFrontierArcher() || !this.isJurchenUnified() || this.hajinSouthwardMarch) return;
    const targets = this.frontierMissionTargets();
    if (!targets.length || targets.some((monster) => monster.alive)) return;
    this.hajinSouthwardMarch = true;
    this.hajinArmyReserve = Math.floor(this.factionWarState.reserve['jurchen-league']);
    this.regionGateCooldownUntil = this.elapsed;
    const defeatedSoldiers = targets.filter((monster) => isFrontierJoseon(monster.kind)).length;
    const civilianCasualties = this.monsters.filter((monster) =>
      monster.region === 'manchufrontier'
      && isJoseonCivilian(monster.kind)
      && !monster.alive).length;
    this.events.push({ type: 'frontier-mission-cleared', defeatedSoldiers, civilianCasualties });
    this.ensureHajinWarband(true);
  }

  private ensureHajinWarband(emitEvents: boolean): void {
    const existing = this.followers.filter((follower) => follower.route === 'invasion');
    if (existing.length >= 5) return;
    this.followers.splice(0);
    const units: Array<{ kind: FollowerKind; name: string; offsetX: number; offsetY: number }> = [
      { kind: 'jurchen-captain', name: '선봉장 무타', offsetX: 0, offsetY: 78 },
      { kind: 'jurchen-vanguard', name: '철갑수 타루', offsetX: -66, offsetY: 116 },
      { kind: 'jurchen-vanguard', name: '철갑수 호란', offsetX: 66, offsetY: 116 },
      { kind: 'jurchen-bowguard', name: '각궁수 아진', offsetX: -114, offsetY: 160 },
      { kind: 'jurchen-bowguard', name: '각궁수 사루', offsetX: 114, offsetY: 160 },
    ];
    for (const [index, unit] of units.entries()) {
      const definition = FOLLOWER_CATALOG[unit.kind];
      const follower: FollowerState = {
        id: `hajin-warband-${this.followerCounter++}-${index}`,
        kind: unit.kind,
        name: unit.name,
        route: 'invasion',
        visualKind: definition.visualKind,
        x: this.player.x + unit.offsetX,
        y: this.player.y - unit.offsetY,
        facing: this.player.facing,
        velocity: { x: 0, y: 0 },
        attackCooldown: 0,
        actionTimer: 0,
        targetId: null,
      };
      this.followers.push(follower);
      if (emitEvents) {
        this.events.push({
          type: 'follower-recruited',
          follower: { ...follower, velocity: { ...follower.velocity } },
          route: 'invasion',
          cost: 0,
        });
      }
    }
    this.events.push({ type: 'hajin-warband-formed', count: this.followers.length });
  }

  private updateMonster(monster: MonsterState, dt: number): void {
    if (!monster.alive) return;
    this.updateElementalStatus(monster, dt);
    if (!monster.alive) return;
    if (!Number.isFinite(monster.facing)) monster.facing = Math.PI / 2;
    if (monster.region !== this.region) {
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      monster.rallySeconds = 0;
      monster.stuckSeconds = 0;
      monster.recoveryTimer = 0;
      monster.recoveryDirection = { x: 0, y: 0 };
      return;
    }
    monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);
    monster.thinkTimer = Math.max(0, monster.thinkTimer - dt);
    monster.actionTimer = Math.max(0, monster.actionTimer - dt);
    monster.rallySeconds = Math.max(0, monster.rallySeconds - dt);
    if (monster.kind === 'japanese-shogun'
      && !this.shogunSecondPhase
      && monster.hp <= monster.maxHp * 0.5) {
      this.beginShogunSecondPhase(monster);
      return;
    }

    if (monster.hitStun > 0) {
      monster.aiState = 'stunned';
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      monster.hitStun = Math.max(0, monster.hitStun - dt);
      monster.x += monster.knockback.x * dt;
      monster.y += monster.knockback.y * dt;
      monster.knockback.x *= Math.pow(0.035, dt);
      monster.knockback.y *= Math.pow(0.035, dt);
      this.resolveObstacleCollision(monster, 24);
      this.clampMonster(monster);
      return;
    }

    if (monster.aiState === 'attack') {
      if (monster.actionTimer > 0) return;
      monster.aiState = 'circle';
      return;
    }

    if (isJoseonCivilian(monster.kind)) {
      this.updateJoseonCivilianFlightAi(monster, dt);
      return;
    }
    if (this.updateFrontierBattleAi(monster, dt)) return;
    if (this.isFriendlyMonster(monster)) {
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.rallySeconds = 0;
      this.updatePatrol(monster, dt);
      return;
    }

    const distance = this.distance(monster, this.player);
    const leashDistance = this.distance(monster, monster.spawn);
    const isRangedSkirmisher = monster.kind === 'bandit' || monster.kind === 'moon-revenant'
      || monster.kind === 'geoje-sea-wraith'
      || monster.kind === 'episode2-marsh-wisp'
      || isRangedSoldier(monster.kind);
    const aggroRange = monster.kind === 'japanese-shogun'
      ? 360
      : monster.kind === 'japanese-gunner'
      ? 430
      : isRangedSkirmisher ? 245
        : monster.kind === 'boar' || monster.kind === 'japanese-wild-boar'
          || monster.kind === 'wonju-bear' || monster.kind === 'episode2-mountain-leopard' ? 220
          : monster.kind === 'mine-golem' || monster.kind === 'episode2-stone-dokkaebi' ? 190 : 205;

    if (!this.playerActive && monster.aggro) {
      monster.aggro = false;
      monster.aiState = 'return';
      monster.actionTimer = 0;
    }

    const isProvokedIslandGuard = isUlleungGuard(monster.kind) && (
      (monster.region === 'ulleungdo' && this.prisonGuardsProvoked)
      || (monster.region === 'ulleungvillage' && this.governmentGuardsProvoked)
    );
    const playerCommittedToCombat = this.player.targetId !== null || this.pendingPlayerAttack !== null;
    const standardLeash = isLeader(monster.kind) ? (playerCommittedToCombat ? 560 : 260)
      : isFormationSoldier(monster.kind) ? (playerCommittedToCombat ? 500 : 190)
        : CHARGER_KINDS.has(monster.kind) ? 480 : 390;
    const leashLimit = isProvokedIslandGuard ? 1050 : standardLeash;
    const disengageDistance = isProvokedIslandGuard ? 1280
      : isLeader(monster.kind) ? 620
        : isRangedSkirmisher ? 560 : 520;
    if (leashDistance > leashLimit || (monster.aggro && distance > disengageDistance)) {
      monster.aggro = false;
      monster.aiState = 'return';
      monster.rallySeconds = 0;
      this.moveMonsterToward(monster, monster.spawn, 100, dt, 8);
      return;
    }

    const activeAggressors = this.activeMonsterRoster
      .filter((candidate) => candidate.alive && candidate.aggro).length;
    const aggressorLimit = this.region === 'osaka' || this.region === 'settsuvillage' ? 3
      : this.region === 'yamazakihunt' ? 4
      : this.region === 'osakacastle' ? 5
      : this.region === 'shogunkeep' ? 6
      : this.region === 'tangeumdae' || this.region === 'pyongyanggate' ? 9
      : this.region === 'pyongyangouter' || this.region === 'pyongyanginner' ? 7
      : this.region === 'jeonjugate' ? 7
      : this.region === 'jeonju' ? 6
        : this.region === 'ulleungvillage' && this.wakoInvasionStarted ? 6
        : this.region === 'yeongwol' || this.region === 'jeonjufield' ? 5 : 3;
    if (isTimidAnimal(monster.kind)) {
      this.updateTimidAnimalAi(monster, distance, dt);
      return;
    }
    const isNeutralIslandGuard = isUlleungGuard(monster.kind) && (
      (monster.region === 'ulleungdo' && !this.prisonGuardsProvoked)
      || (monster.region === 'ulleungvillage' && !this.governmentGuardsProvoked)
    );
    if (isNeutralIslandGuard) {
      this.updatePatrol(monster, dt);
      return;
    }
    if (monster.aggro
      && (monster.aiState === 'patrol' || monster.aiState === 'return' || monster.aiState === 'stunned')) {
      monster.aiState = 'alert';
      monster.actionTimer = Math.max(monster.actionTimer, 0.1);
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.alertTacticalSquad(monster);
    }
    const canReserveChargerSlot = CHARGER_KINDS.has(monster.kind) && activeAggressors < aggressorLimit + 1;
    if (this.playerActive && !monster.aggro && distance <= aggroRange
      && (activeAggressors < aggressorLimit || canReserveChargerSlot)) {
      monster.aggro = true;
      monster.aiState = 'alert';
      monster.actionTimer = 0.22;
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.alertTacticalSquad(monster);
      this.events.push({ type: 'monster-alert', monsterId: monster.id });
      return;
    }

    if (!monster.aggro) {
      if (monster.kind === 'episode2-mountain-leopard'
        && this.updateEpisode2PredatorStalk(monster, dt)) return;
      this.updatePatrol(monster, dt);
      return;
    }

    if (monster.aiState === 'alert' && monster.actionTimer > 0) return;
    if (monster.kind === 'japanese-shogun') this.updateShogunAi(monster, distance, dt);
    else if (monster.kind === 'boar' || monster.kind === 'japanese-wild-boar' || monster.kind === 'wonju-bear') this.updateBoarAi(monster, distance, dt);
    else if (monster.kind === 'ulleung-sangun' || monster.kind === 'episode2-mountain-leopard') this.updateTigerAi(monster, distance, dt);
    else if (monster.kind === 'korean-gray-wolf') this.updateWolfAi(monster, distance, dt);
    else if (monster.kind === 'manchu-cavalry') this.updateCavalryAi(monster, distance, dt);
    else if (isFormationSoldier(monster.kind)) this.updateUlleungGuardAi(monster, distance, dt);
    else this.updateSkirmisherAi(monster, distance, dt);
  }

  private resolvePendingPlayerAttack(): void {
    const pending = this.pendingPlayerAttack;
    if (!pending || this.elapsed < pending.impactAt) return;
    this.pendingPlayerAttack = null;
    if (this.boss?.alive && this.boss.id === pending.targetId) {
      if (this.distance(this.player, this.boss) <= this.getPlayerAttackRange() + 24) {
        this.damageBoss(pending.damage);
        const finisher = pending.step === 3;
        this.events.push({
          type: 'player-impact', targetId: this.boss.id, damage: pending.damage,
          critical: pending.critical, style: pending.style, step: pending.step, finisher,
        });
        if (finisher) {
          this.gainMomentum(pending.style === 'weapon' ? 10 : 7);
          this.events.push({
            type: 'basic-finisher', targetId: this.boss.id, style: pending.style,
            targets: 1, damage: pending.damage,
          });
        }
      }
      return;
    }
    const target = this.monsters.find((monster) => monster.id === pending.targetId && monster.alive);
    if (!target
      || !this.isRoyalRefugeMonsterActive(target)
      || this.distance(this.player, target) > this.getPlayerAttackRange() + 24) return;

    if (isUlleungGuard(target.kind) && target.region === 'ulleungdo' && !this.prisonGuardsProvoked) {
      this.provokePrisonGuards(target);
    }
    if (isUlleungGuard(target.kind) && target.region === 'ulleungvillage' && !this.governmentGuardsProvoked) {
      this.provokeGovernmentGuards(target);
    }

    const impactDamage = this.monsterDefenseAdjustedDamage(target, pending.damage);
    target.hp = Math.max(0, target.hp - impactDamage);
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const finisher = pending.step === 3;
    const force = finisher ? (pending.critical ? 164 : 138) : pending.critical ? 92 : 58;
    target.hitStun = finisher ? (pending.critical ? 0.4 : 0.32) : pending.critical ? 0.18 : 0.12;
    target.knockback = { x: Math.cos(angle) * force, y: Math.sin(angle) * force };
    target.aggro = true;
    this.events.push({
      type: 'player-impact', targetId: target.id, damage: impactDamage,
      critical: pending.critical, style: pending.style, step: pending.step, finisher,
    });
    if (finisher) this.applyBasicFinisher(target, pending.style, impactDamage, angle);
    if (pending.element) this.applyElementalStatus(target, pending.element, impactDamage);
    if (target.hp === 0) this.killMonster(target);
  }

  private applyBasicFinisher(
    primary: MonsterState,
    style: 'fist' | 'weapon',
    primaryDamage: number,
    angle: number,
  ): void {
    const radius = style === 'weapon' ? 132 : 96;
    const limit = style === 'weapon' ? 3 : 1;
    const splashDamage = Math.max(3, Math.round(primaryDamage * (style === 'weapon' ? 0.36 : 0.24)));
    let targets = 1;
    for (const monster of this.nearbyMonsters(primary, radius, limit)) {
      monster.hp = Math.max(0, monster.hp - this.damageAgainstMonster(monster, splashDamage));
      monster.aggro = true;
      monster.hitStun = Math.max(monster.hitStun, 0.24);
      monster.knockback = {
        x: Math.cos(angle) * (style === 'weapon' ? 96 : 64),
        y: Math.sin(angle) * (style === 'weapon' ? 96 : 64),
      };
      targets += 1;
      if (monster.hp === 0) this.killMonster(monster);
    }
    this.gainMomentum(style === 'weapon' ? 10 : 7);
    this.events.push({ type: 'basic-finisher', targetId: primary.id, style, targets, damage: primaryDamage });
  }

  private resolvePendingMonsterAttacks(): void {
    if (this.pendingMonsterAttacks.length === 0) return;
    const due = this.pendingMonsterAttacks.filter((pending) => this.elapsed >= pending.impactAt);
    this.pendingMonsterAttacks = this.pendingMonsterAttacks.filter((pending) => this.elapsed < pending.impactAt);

    for (const pending of due) {
      if (this.player.hp <= 0) break;
      const monster = this.monsters.find((entry) => entry.id === pending.monsterId);
      if (!monster?.alive || monster.hitStun > 0 || monster.aiState !== 'attack') continue;
      const impactOrigin = pending.trajectory?.origin ?? monster;
      const impactDistance = this.distance(impactOrigin, this.player);
      if (impactDistance > pending.impactRange) continue;
      if (pending.trajectory) {
        const relativeX = this.player.x - pending.trajectory.origin.x;
        const relativeY = this.player.y - pending.trajectory.origin.y;
        const forwardDistance = relativeX * pending.trajectory.direction.x
          + relativeY * pending.trajectory.direction.y;
        const lateralDistance = Math.abs(
          relativeX * pending.trajectory.direction.y
          - relativeY * pending.trajectory.direction.x,
        );
        if (forwardDistance <= 0 || lateralDistance > pending.trajectory.halfWidth) continue;
      }
      if (pending.minimumFacingDot !== undefined && impactDistance > 0.001) {
        const towardPlayerX = (this.player.x - monster.x) / impactDistance;
        const towardPlayerY = (this.player.y - monster.y) / impactDistance;
        const facingDot = Math.cos(monster.facing) * towardPlayerX + Math.sin(monster.facing) * towardPlayerY;
        if (facingDot < pending.minimumFacingDot) continue;
      }
      if (pending.requiresLineOfSight && !this.hasMonsterLineOfSight(impactOrigin, this.player)) continue;

      const evaded = this.getEvasion() > 3 && Math.random() < Math.min(0.22, (this.getEvasion() - 3) / 100);
      if (evaded) continue;
      const mitigated = Math.max(1, pending.damage - this.getDefense());
      const damage = this.hasTigerPeltArmor() && isBeast(monster.kind)
        ? Math.max(1, Math.round(mitigated * 0.82))
        : mitigated;
      this.player.hp = Math.max(0, this.player.hp - damage);
      const distance = Math.max(1, this.distance(monster, this.player));
      let knockbackX = pending.trajectory
        ? pending.trajectory.direction.x * pending.knockbackForce
        : ((this.player.x - monster.x) / distance) * pending.knockbackForce;
      let knockbackY = pending.trajectory
        ? pending.trajectory.direction.y * pending.knockbackForce
        : ((this.player.y - monster.y) / distance) * pending.knockbackForce;
      if (!this.player.targetId) {
        const routeX = this.player.destination
          ? this.player.destination.x - this.player.x
          : this.navigationKnockbackAxis?.x ?? 0;
        const routeY = this.player.destination
          ? this.player.destination.y - this.player.y
          : this.navigationKnockbackAxis?.y ?? 0;
        const routeDistance = Math.hypot(routeX, routeY);
        if (routeDistance > 0.001) {
          const routeNormalX = routeX / routeDistance;
          const routeNormalY = routeY / routeDistance;
          const routeProjection = knockbackX * routeNormalX + knockbackY * routeNormalY;
          knockbackX = routeNormalX * routeProjection;
          knockbackY = routeNormalY * routeProjection;
        }
      }
      this.player.x += knockbackX;
      this.player.y += knockbackY;
      const clamped = this.clampPlayerPoint(this.player);
      this.player.x = clamped.x;
      this.player.y = clamped.y;
      this.events.push({ type: 'player-hit', damage });
      if (this.player.hp === 0) this.defeatPlayer();
    }
  }

  private tacticalFaction(kind: MonsterKind): 'government' | 'invader' | 'jurchen' | 'other' {
    if (isGovernmentSoldier(kind)) return 'government';
    if (isWako(kind) || isJapaneseSoldier(kind)) return 'invader';
    if (isFrontierJurchen(kind)) return 'jurchen';
    return 'other';
  }

  private alertTacticalSquad(source: MonsterState): void {
    const tacticalRoster = this.activeMonsterRoster.length > 0
      ? this.activeMonsterRoster
      : this.monsters.filter((monster) => monster.region === source.region);
    if (source.kind === 'korean-gray-wolf') {
      const pack = tacticalRoster
        .filter((ally) => ally !== source
          && ally.alive
          && ally.kind === 'korean-gray-wolf'
          && ally.region === source.region
          // Authored wolf pairs start 495px apart and can drift another ~86px
          // across their patrol circles. Keep the pair linked through that
          // normal movement envelope without alerting unrelated species.
          && this.distance(source, ally) <= 600)
        .sort((left, right) => this.distance(source, left) - this.distance(source, right))
        .slice(0, 4);
      for (const [index, ally] of pack.entries()) {
        ally.aggro = true;
        ally.tacticSlot = source.tacticSlot + index + 1;
        ally.facing = Math.atan2(this.player.y - ally.y, this.player.x - ally.x);
        if (ally.aiState === 'patrol' || ally.aiState === 'return' || ally.aiState === 'stunned') {
          ally.aiState = 'alert';
          ally.actionTimer = Math.max(ally.actionTimer, 0.09 + index * 0.055);
        }
      }
      return;
    }
    if (!isFormationSoldier(source.kind) || source.region === 'ulleungdo') return;
    const faction = this.tacticalFaction(source.kind);
    const allies = tacticalRoster
      .filter((ally) => ally !== source
        && ally.alive
        && !this.isFriendlyMonster(ally)
        && isFormationSoldier(ally.kind)
        && this.tacticalFaction(ally.kind) === faction
        && this.distance(source, ally) <= (isLeader(source.kind) ? 360 : 245))
      .sort((left, right) => {
        const distanceDelta = this.distance(source, left) - this.distance(source, right);
        return distanceDelta || left.id.localeCompare(right.id);
      })
      .slice(0, isLeader(source.kind) ? 7 : 3);
    for (const [index, ally] of allies.entries()) {
      ally.aggro = true;
      if (ally.aiState === 'patrol' || ally.aiState === 'return' || ally.aiState === 'stunned') {
        ally.aiState = 'alert';
        ally.actionTimer = Math.max(ally.actionTimer, 0.08 + index * 0.035);
      }
    }
  }

  private tacticalRingPoint(monster: MonsterState, radius: number, arcScale = 1): Vec2 {
    const currentAngle = Math.atan2(monster.y - this.player.y, monster.x - this.player.x);
    const lane = (monster.tacticSlot % 5) - 2;
    const side = monster.tacticSlot % 2 === 0 ? 1 : -1;
    const targetAngle = currentAngle + side * (0.2 + Math.abs(lane) * 0.055) * arcScale;
    return {
      x: this.player.x + Math.cos(targetAngle) * radius,
      y: this.player.y + Math.sin(targetAngle) * radius,
    };
  }

  private retreatFromPlayer(monster: MonsterState, distance: number, speed: number, dt: number): void {
    const away = Math.atan2(monster.y - this.player.y, monster.x - this.player.x);
    const side = monster.tacticSlot % 2 === 0 ? 1 : -1;
    const target = {
      x: monster.x + Math.cos(away) * distance + Math.cos(away + Math.PI / 2) * side * distance * 0.34,
      y: monster.y + Math.sin(away) * distance + Math.sin(away + Math.PI / 2) * side * distance * 0.34,
    };
    monster.aiState = 'circle';
    this.moveMonsterToward(monster, target, speed, dt, 4);
  }

  private hasMonsterLineOfSight(
    from: Vec2,
    to: Vec2,
    obstacles: readonly FieldObstacle[] = this.activeCollisionObstacles(),
  ): boolean {
    const distance = this.distance(from, to);
    const steps = Math.max(1, Math.ceil(distance / 18));
    for (let step = 1; step < steps; step += 1) {
      const progress = step / steps;
      if (!this.isPointClearOfObstacles({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      }, 5, obstacles)) return false;
    }
    return true;
  }

  private monsterHasLineOfSight(monster: MonsterState, force = false): boolean {
    const cached = this.monsterLineOfSightCache.get(monster.id);
    const movedSinceCheck = cached
      ? Math.hypot(monster.x - cached.from.x, monster.y - cached.from.y)
      : Number.POSITIVE_INFINITY;
    const playerMovedSinceCheck = cached
      ? Math.hypot(this.player.x - cached.to.x, this.player.y - cached.to.y)
      : Number.POSITIVE_INFINITY;
    if (!force
      && cached
      && this.elapsed < cached.expiresAt
      && movedSinceCheck <= 18
      && playerMovedSinceCheck <= 18) return cached.clear;

    const clear = this.hasMonsterLineOfSight(monster, this.player);
    this.monsterLineOfSightCache.set(monster.id, {
      clear,
      expiresAt: this.elapsed + 0.16 + (monster.tacticSlot % 4) * 0.025,
      from: { x: monster.x, y: monster.y },
      to: { x: this.player.x, y: this.player.y },
    });
    return clear;
  }

  private isMonsterPointWithinBounds(monster: MonsterState, point: Vec2, bodyRadius: number): boolean {
    const origin = REGION_ORIGINS[monster.region];
    if (point.y < origin.y + 215 + bodyRadius || point.y > origin.y + 885 - bodyRadius) return false;
    if (isUlleungRegion(monster.region)) {
      const bounds = ulleungWalkableBoundsAt(monster.region, point.y);
      return point.x >= bounds.left + bodyRadius && point.x <= bounds.right - bodyRadius;
    }
    return point.x >= origin.x + 200 + bodyRadius && point.x <= origin.x + 1336 - bodyRadius;
  }

  private isMonsterTravelPathClear(
    monster: MonsterState,
    desired: Vec2,
    bodyRadius: number,
    obstacles: readonly FieldObstacle[] = this.activeCollisionObstacles(),
  ): boolean {
    if (!this.isMonsterPointWithinBounds(monster, desired, bodyRadius)) return false;
    const distance = this.distance(monster, desired);
    const steps = Math.max(1, Math.ceil(distance / 16));
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const candidate = {
        x: monster.x + (desired.x - monster.x) * progress,
        y: monster.y + (desired.y - monster.y) * progress,
      };
      if (!this.isPointClearOfObstacles(candidate, bodyRadius, obstacles)) return false;
    }
    return true;
  }

  private repositionForLineOfSight(monster: MonsterState, preferredRange: number, speed: number, dt: number): boolean {
    const aroundPlayer = Math.atan2(monster.y - this.player.y, monster.x - this.player.x);
    const preferredSide = monster.tacticSlot % 2 === 0 ? 1 : -1;
    const angularOffsets = [
      preferredSide * 0.48,
      -preferredSide * 0.48,
      preferredSide * 0.82,
      -preferredSide * 0.82,
      preferredSide * 1.12,
      -preferredSide * 1.12,
    ];
    const candidates = angularOffsets.flatMap((offset) => [preferredRange, preferredRange + 28].map((radius) => ({
      x: this.player.x + Math.cos(aroundPlayer + offset) * radius,
      y: this.player.y + Math.sin(aroundPlayer + offset) * radius,
    })));
    const obstacles = this.activeCollisionObstacles();
    const target = candidates.find((candidate) =>
      this.isMonsterTravelPathClear(monster, candidate, 26, obstacles)
      && this.hasMonsterLineOfSight(candidate, this.player, obstacles));
    monster.aiState = 'circle';
    if (!target) {
      this.brakeMonster(monster, dt);
      return false;
    }
    this.moveMonsterToward(monster, target, speed, dt, 6);
    return true;
  }

  private updatePatrol(monster: MonsterState, dt: number): void {
    monster.aiState = 'patrol';
    if (monster.thinkTimer <= 0 || this.distance(monster, monster.patrolTarget) < 9) {
      const index = Number(monster.id.split('-').at(-1));
      const angle = this.elapsed * 0.37 + index * 2.19;
      const guardPatrol = isFormationSoldier(monster.kind);
      const radius = (guardPatrol ? 48 : 28) + (index % 3) * (guardPatrol ? 18 : 10);
      monster.patrolTarget = {
        x: monster.spawn.x + Math.cos(angle) * radius,
        y: monster.spawn.y + Math.sin(angle) * radius * 0.72,
      };
      monster.thinkTimer = (guardPatrol ? 1.85 : 2.4) + (index % 4) * 0.38;
      monster.actionTimer = (guardPatrol ? 0.2 : 0.38) + (index % 3) * 0.12;
    }
    if (monster.actionTimer > 0) {
      this.brakeMonster(monster, dt);
      return;
    }
    this.moveMonsterToward(monster, monster.patrolTarget, isFormationSoldier(monster.kind) ? 38 : 28, dt, 5);
  }

  private updateBoarAi(monster: MonsterState, distance: number, dt: number): void {
    if (monster.aiState === 'telegraph') {
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      if (monster.actionTimer <= 0) {
        monster.aiState = 'charge';
        monster.actionTimer = 0.62;
        monster.chargeDirection = { x: Math.cos(monster.facing), y: Math.sin(monster.facing) };
      }
      return;
    }

    if (monster.aiState === 'charge') {
      monster.x += monster.chargeDirection.x * 220 * dt;
      monster.y += monster.chargeDirection.y * 220 * dt;
      if (this.resolveObstacleCollision(monster, 26)) {
        monster.aiState = 'circle';
        monster.actionTimer = 0;
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.65);
        return;
      }
      this.clampMonster(monster);
      if (this.distance(monster, this.player) <= 72) {
        this.performMonsterAttack(monster, 1.65, 18);
        return;
      }
      if (monster.actionTimer <= 0) {
        monster.aiState = 'circle';
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.65);
      }
      return;
    }

    if (monster.attackCooldown <= 0 && distance < 170) {
      monster.aiState = 'telegraph';
      monster.actionTimer = 0.42;
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({ type: 'monster-charge', monsterId: monster.id });
      return;
    }

    if (distance > 92) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, this.player, 96, dt, 82);
    } else {
      this.circlePlayer(monster, 105, 72, dt);
    }
  }

  private updateTimidAnimalAi(monster: MonsterState, distance: number, dt: number): void {
    if (monster.aggro && distance >= 250) {
      monster.aggro = false;
      monster.aiState = 'return';
      this.moveMonsterToward(monster, monster.spawn, 74, dt, 18);
      return;
    }
    const predator = monster.kind === 'episode2-red-fox'
      ? this.monsters.find((candidate) => candidate.alive
        && candidate.region === monster.region
        && candidate.kind === 'episode2-mountain-leopard'
        && this.distance(candidate, monster) < 245)
      : undefined;
    const threatened = Boolean(predator) || monster.aggro || (this.playerActive && distance < 150);
    if (!threatened) {
      this.updatePatrol(monster, dt);
      return;
    }
    const threat = predator ?? this.player;
    const angleAway = Math.atan2(monster.y - threat.y, monster.x - threat.x);
    monster.facing = angleAway;
    // Only a cornered animal fights back. Its short wind-up is still connected
    // to the authored attack row so it never slides through a static pose.
    if (monster.aggro && distance < 54 && monster.attackCooldown <= 0) {
      this.performMonsterAttack(monster, 2.25,
        monster.kind === 'ulleung-water-deer' || monster.kind === 'japanese-sika-deer' ? 7 : 4, 0.72);
      return;
    }
    monster.aiState = 'flee';
    const side = monster.tacticSlot % 2 === 0 ? 1 : -1;
    const fleeTarget = {
      x: monster.x + Math.cos(angleAway) * 210 + Math.cos(angleAway + Math.PI / 2) * side * 42,
      y: monster.y + Math.sin(angleAway) * 165 + Math.sin(angleAway + Math.PI / 2) * side * 42,
    };
    this.moveMonsterToward(monster, fleeTarget, monster.kind === 'ulleung-hare' ? 150 : 134, dt, 4);
  }

  private updateEpisode2PredatorStalk(monster: MonsterState, dt: number): boolean {
    const prey = this.monsters
      .filter((candidate) => candidate.alive
        && candidate.region === monster.region
        && candidate.kind === 'episode2-red-fox')
      .sort((first, second) => this.distance(monster, first) - this.distance(monster, second))[0];
    if (!prey) return false;
    const distance = this.distance(monster, prey);
    if (distance > 310) return false;
    monster.facing = Math.atan2(prey.y - monster.y, prey.x - monster.x);
    if (distance > 84) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, prey, 68, dt, 62);
    } else {
      monster.aiState = 'circle';
      const orbit = monster.tacticSlot % 2 === 0 ? 1 : -1;
      const target = {
        x: prey.x + Math.cos(monster.facing + orbit * 0.8) * 92,
        y: prey.y + Math.sin(monster.facing + orbit * 0.8) * 72,
      };
      this.moveMonsterToward(monster, target, 52, dt, 12);
    }
    return true;
  }

  private updateTigerAi(monster: MonsterState, distance: number, dt: number): void {
    if (monster.aiState === 'telegraph') {
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      if (monster.actionTimer <= 0) {
        monster.aiState = 'charge';
        monster.actionTimer = 0.46;
        monster.chargeDirection = { x: Math.cos(monster.facing), y: Math.sin(monster.facing) };
      }
      return;
    }
    if (monster.aiState === 'charge') {
      monster.x += monster.chargeDirection.x * 265 * dt;
      monster.y += monster.chargeDirection.y * 265 * dt;
      if (this.resolveObstacleCollision(monster, 28)) {
        monster.aiState = 'circle';
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.8);
        return;
      }
      this.clampMonster(monster);
      if (this.distance(monster, this.player) <= 82) {
        this.performMonsterAttack(monster, 1.58, 22, 1.2);
        return;
      }
      if (monster.actionTimer <= 0) {
        monster.aiState = 'circle';
        monster.actionTimer = 0;
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.82);
      }
      return;
    }
    if (monster.attackCooldown <= 0 && distance < 188) {
      monster.aiState = 'telegraph';
      monster.actionTimer = 0.34;
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({ type: 'monster-charge', monsterId: monster.id });
      return;
    }
    if (distance > 104) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, this.player, 112, dt, 92);
    } else {
      this.circlePlayer(monster, 112, 78, dt);
    }
  }

  private updateWolfAi(monster: MonsterState, distance: number, dt: number): void {
    if (monster.aiState === 'telegraph') {
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.brakeMonster(monster, dt);
      if (monster.actionTimer <= 0) {
        monster.aiState = 'charge';
        monster.actionTimer = 0.4;
        monster.chargeDirection = { x: Math.cos(monster.facing), y: Math.sin(monster.facing) };
      }
      return;
    }

    if (monster.aiState === 'charge') {
      monster.x += monster.chargeDirection.x * 235 * dt;
      monster.y += monster.chargeDirection.y * 235 * dt;
      if (this.resolveObstacleCollision(monster, 24)) {
        monster.aiState = 'circle';
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.58);
        return;
      }
      this.clampMonster(monster);
      if (this.distance(monster, this.player) <= 70) {
        this.performMonsterAttack(monster, 1.46, 14, 1.12, 94);
        return;
      }
      if (monster.actionTimer <= 0) {
        monster.aiState = 'circle';
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.62);
      }
      return;
    }

    if (monster.attackCooldown <= 0 && distance < 170) {
      monster.aiState = 'telegraph';
      monster.actionTimer = 0.28;
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({ type: 'monster-charge', monsterId: monster.id });
      return;
    }

    const flankPoint = this.tacticalRingPoint(monster, 98 + (monster.tacticSlot % 3) * 12, 1.45);
    if (distance > 126) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, flankPoint, 108, dt, 62);
    } else {
      monster.aiState = 'circle';
      this.moveMonsterToward(monster, flankPoint, 96, dt, 8);
    }
  }

  private updateCavalryAi(monster: MonsterState, distance: number, dt: number): void {
    if (monster.aiState === 'telegraph') {
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.brakeMonster(monster, dt);
      if (monster.actionTimer <= 0) {
        monster.aiState = 'charge';
        monster.actionTimer = 0.7;
        monster.chargeDirection = { x: Math.cos(monster.facing), y: Math.sin(monster.facing) };
      }
      return;
    }
    if (monster.aiState === 'charge') {
      monster.x += monster.chargeDirection.x * 285 * dt;
      monster.y += monster.chargeDirection.y * 285 * dt;
      if (this.resolveObstacleCollision(monster, 28)) {
        monster.aiState = 'circle';
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.9);
        monster.recoveryCount += 1;
        return;
      }
      this.clampMonster(monster);
      if (this.distance(monster, this.player) <= 88) {
        this.performMonsterAttack(monster, 1.72, 26, 1.35, 112);
        return;
      }
      if (monster.actionTimer <= 0) {
        monster.aiState = 'circle';
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.72);
      }
      return;
    }
    if (monster.attackCooldown <= 0 && distance >= 105 && distance <= 245) {
      monster.aiState = 'telegraph';
      monster.actionTimer = 0.38;
      monster.velocity = { x: 0, y: 0 };
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({ type: 'monster-charge', monsterId: monster.id });
      return;
    }
    if (distance > 155) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, this.tacticalRingPoint(monster, 132, 0.7), 106, dt, 18);
    } else {
      this.circlePlayer(monster, 128, 84, dt);
    }
  }

  private updateShogunAi(monster: MonsterState, distance: number, dt: number): void {
    const phaseTwo = this.shogunSecondPhase;
    if (monster.aiState === 'rally' && monster.actionTimer > 0) {
      this.brakeMonster(monster, dt);
      return;
    }
    if (monster.aiState === 'telegraph') {
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      if (monster.actionTimer <= 0) {
        this.performMonsterAttack(monster, phaseTwo ? 1.08 : 1.55, phaseTwo ? 34 : 24, phaseTwo ? 1.48 : 1.22);
      }
      return;
    }
    const attackRange = phaseTwo ? 158 : 132;
    if (distance <= attackRange && monster.attackCooldown <= 0) {
      monster.aiState = 'telegraph';
      monster.actionTimer = phaseTwo ? 0.24 : 0.38;
      monster.velocity = { x: 0, y: 0 };
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({ type: 'guard-action', monsterId: monster.id, action: phaseTwo ? 'rally' : 'brace' });
      return;
    }
    if (distance > attackRange - 8) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, this.player, phaseTwo ? 104 : 82, dt, attackRange - 20);
    } else {
      this.circlePlayer(monster, attackRange - 6, phaseTwo ? 78 : 58, dt);
    }
  }

  private beginShogunSecondPhase(monster: MonsterState): void {
    this.shogunSecondPhase = true;
    monster.aggro = true;
    monster.aiState = 'rally';
    monster.actionTimer = 0.58;
    monster.attackCooldown = Math.max(monster.attackCooldown, 0.45);
    monster.velocity = { x: 0, y: 0 };
    this.events.push({ type: 'shogun-phase-changed', monsterId: monster.id, phase: 2 });
    this.events.push({ type: 'guard-action', monsterId: monster.id, action: 'rally' });
    for (const ally of this.monsters) {
      if (!ally.alive || ally.region !== monster.region || ally.id === monster.id || !isJapaneseSoldier(ally.kind)) continue;
      ally.aggro = true;
      ally.aiState = 'alert';
      ally.actionTimer = 0.12 + (Number(ally.id.split('-').at(-1)) % 4) * 0.08;
    }
  }

  private updateSkirmisherAi(monster: MonsterState, distance: number, dt: number): void {
    const isRangedSkirmisher = monster.kind === 'bandit' || monster.kind === 'moon-revenant'
      || monster.kind === 'geoje-sea-wraith' || monster.kind === 'episode2-marsh-wisp';
    const brute = monster.kind === 'mine-golem' || monster.kind === 'episode2-stone-dokkaebi';
    const attackRange = isRangedSkirmisher ? 94 : brute ? 88 : 76;
    const preferredRange = isRangedSkirmisher ? 108 : brute ? 96 : 88;
    if (distance <= attackRange && monster.attackCooldown <= 0) {
      if (isRangedSkirmisher && !this.monsterHasLineOfSight(monster)) {
        this.repositionForLineOfSight(monster, preferredRange, 82, dt);
        return;
      }
      this.performMonsterAttack(monster, isRangedSkirmisher ? 1.55 : brute ? 1.9 : 1.72, isRangedSkirmisher ? 12 : brute ? 16 : 9);
      return;
    }
    if (isRangedSkirmisher && distance < 72) {
      this.retreatFromPlayer(monster, 118, 86, dt);
      return;
    }
    if (distance > preferredRange + 16) {
      monster.aiState = 'chase';
      this.moveMonsterToward(
        monster,
        isRangedSkirmisher ? this.tacticalRingPoint(monster, preferredRange) : this.tacticalRingPoint(monster, 76, 0.55),
        isRangedSkirmisher ? 74 : brute ? 58 : 82,
        dt,
        12,
      );
    } else {
      this.circlePlayer(monster, preferredRange, isRangedSkirmisher ? 70 : brute ? 44 : 62, dt);
    }
  }

  private updateUlleungGuardAi(monster: MonsterState, distance: number, dt: number): void {
    if (monster.kind === 'japanese-gunner' || monster.kind === 'osaka-gunner') {
      if (distance <= 370 && distance >= 145 && monster.attackCooldown <= 0) {
        if (!this.monsterHasLineOfSight(monster)) {
          this.repositionForLineOfSight(monster, 305, 92, dt);
          return;
        }
        this.performMonsterAttack(monster, 2.45, 14, 1.18);
        return;
      }
      if (distance < 132) {
        this.retreatFromPlayer(monster, 178, 98, dt);
      } else if (distance > 370) {
        monster.aiState = 'chase';
        this.moveMonsterToward(monster, this.tacticalRingPoint(monster, 310), 74, dt, 14);
      } else {
        this.circlePlayer(monster, 305, monster.attackCooldown > 0.7 ? 64 : 42, dt);
      }
      return;
    }
    if (isRangedSoldier(monster.kind)) {
      if (distance <= 220 && distance >= 118 && monster.attackCooldown <= 0) {
        if (!this.monsterHasLineOfSight(monster)) {
          this.repositionForLineOfSight(monster, 182, 86, dt);
          return;
        }
        this.performMonsterAttack(monster, 1.85, 8, 1.08);
        return;
      }
      if (distance < 105) {
        this.retreatFromPlayer(monster, 132, 90, dt);
      } else if (distance > 225) {
        monster.aiState = 'chase';
        this.moveMonsterToward(monster, this.tacticalRingPoint(monster, 182), 76, dt, 12);
      } else {
        this.circlePlayer(monster, 182, monster.attackCooldown > 0.55 ? 70 : 44, dt);
      }
      return;
    }

    if (monster.kind === 'ulleung-executioner') {
      if (monster.aiState === 'telegraph') {
        if (monster.actionTimer <= 0) this.performMonsterAttack(monster, 2.15, 24, 1.55);
        return;
      }
      if (distance <= 88 && monster.attackCooldown <= 0) {
        monster.aiState = 'telegraph';
        monster.actionTimer = 0.48;
        monster.velocity.x = 0;
        monster.velocity.y = 0;
        monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
        this.events.push({ type: 'monster-charge', monsterId: monster.id });
        return;
      }
      if (distance > 96) this.moveMonsterToward(monster, this.tacticalRingPoint(monster, 78, 0.7), 64, dt, 10);
      else this.circlePlayer(monster, 102, 42, dt);
      return;
    }

    if (isSpearman(monster.kind)) {
      if (monster.aiState === 'telegraph') {
        if (monster.actionTimer <= 0) this.performMonsterAttack(monster, 1.38, 13, 1.12, 148);
        return;
      }
      if (distance < 70) {
        this.retreatFromPlayer(monster, 104, 82, dt);
        return;
      }
      if (distance <= 132 && monster.attackCooldown <= 0) {
        monster.aiState = 'telegraph';
        monster.actionTimer = 0.22;
        monster.velocity.x = 0;
        monster.velocity.y = 0;
        monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
        this.events.push({ type: 'guard-action', monsterId: monster.id, action: 'lunge' });
        return;
      }
      if (distance > 142) {
        this.moveMonsterToward(monster, this.tacticalRingPoint(monster, 116, 0.72), 91, dt, 12);
      } else {
        this.circlePlayer(monster, 116, 68, dt);
      }
      return;
    }

    if (isLeader(monster.kind)) {
      if (monster.aiState === 'rally' && monster.actionTimer > 0) return;
      if (monster.thinkTimer <= 0) {
        monster.thinkTimer = 4.1 + monster.tacticSlot * 0.08;
        monster.aiState = 'rally';
        monster.actionTimer = 0.36;
        monster.rallySeconds = 3.8;
        monster.velocity.x = 0;
        monster.velocity.y = 0;
        monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
        this.events.push({ type: 'guard-action', monsterId: monster.id, action: 'rally' });
        const faction = this.tacticalFaction(monster.kind);
        const tacticalRoster = this.activeMonsterRoster.length > 0
          ? this.activeMonsterRoster
          : this.monsters.filter((candidate) => candidate.region === monster.region
            && this.isRoyalRefugeMonsterActive(candidate));
        for (const ally of tacticalRoster) {
          if (ally === monster || !ally.alive || ally.region !== monster.region || !isFormationSoldier(ally.kind)
            || !this.isRoyalRefugeMonsterActive(ally)
            || this.tacticalFaction(ally.kind) !== faction) continue;
          if (this.distance(monster, ally) > 360) continue;
          ally.aggro = true;
          ally.rallySeconds = Math.max(ally.rallySeconds, 3.2);
          ally.attackCooldown = Math.max(0, ally.attackCooldown - 0.28);
          if (ally.aiState === 'patrol' || ally.aiState === 'return') {
            ally.aiState = 'alert';
            ally.actionTimer = 0.12 + ally.tacticSlot * 0.018;
          }
        }
        return;
      }
      if (distance <= 82 && monster.attackCooldown <= 0) {
        this.performMonsterAttack(monster, 1.62, 18, 1.22);
        return;
      }
      if (distance > 132) this.moveMonsterToward(monster, this.tacticalRingPoint(monster, 110, 0.62), 78, dt, 12);
      else this.circlePlayer(monster, 124, 58, dt);
      return;
    }

    const shieldFormation = isShieldFormation(monster.kind);
    const windingUp = shieldFormation ? monster.aiState === 'brace' : monster.aiState === 'telegraph';
    if (windingUp) {
      if (monster.actionTimer <= 0) this.performMonsterAttack(monster, 1.72, 10);
      return;
    }
    if (distance <= (shieldFormation ? 96 : 88) && monster.attackCooldown <= 0) {
      monster.aiState = shieldFormation ? 'brace' : 'telegraph';
      monster.actionTimer = shieldFormation ? 0.34 : 0.22;
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({
        type: 'guard-action',
        monsterId: monster.id,
        action: shieldFormation ? 'brace' : 'lunge',
      });
      return;
    }
    if (distance > 94) {
      this.moveMonsterToward(
        monster,
        this.tacticalRingPoint(monster, shieldFormation ? 78 : 70, shieldFormation ? 0.48 : 0.92),
        shieldFormation ? 64 : 82,
        dt,
        10,
      );
    }
    else this.circlePlayer(monster, 90, 56, dt);
  }

  private circlePlayer(monster: MonsterState, radius: number, speed: number, dt: number): void {
    monster.aiState = 'circle';
    const angle = Math.atan2(monster.y - this.player.y, monster.x - this.player.x);
    const direction = monster.tacticSlot % 2 === 0 ? 1 : -1;
    const lane = (monster.tacticSlot % 4) * 0.06;
    const targetAngle = angle + direction * (0.46 + lane);
    const target = {
      x: this.player.x + Math.cos(targetAngle) * radius,
      y: this.player.y + Math.sin(targetAngle) * radius,
    };
    this.moveMonsterToward(monster, target, speed, dt, 5);
  }

  private performMonsterAttack(
    monster: MonsterState,
    cooldown: number,
    knockbackForce: number,
    damageMultiplier = 1,
    impactRangeOverride?: number,
  ): void {
    if (this.pendingMonsterAttacks.some((pending) => pending.monsterId === monster.id)) return;
    monster.aiState = 'attack';
    monster.actionTimer = 0.46;
    const rallied = monster.rallySeconds > 0;
    monster.attackCooldown = cooldown * (rallied ? 0.88 : 1);
    monster.velocity.x = 0;
    monster.velocity.y = 0;
    monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
    const impactRange = impactRangeOverride ?? (monster.kind === 'japanese-shogun' ? 176
      : monster.kind === 'japanese-gunner' || monster.kind === 'osaka-gunner' ? 390
      : isRangedSoldier(monster.kind) ? 230
      : monster.kind === 'bandit' || monster.kind === 'moon-revenant'
        || monster.kind === 'geoje-sea-wraith' || monster.kind === 'episode2-marsh-wisp' ? 118
        : monster.kind === 'boar' || monster.kind === 'japanese-wild-boar' || monster.kind === 'wonju-bear' ? 98
          : monster.kind === 'korean-gray-wolf' ? 94
          : monster.kind === 'mine-golem' ? 112 : 100);
    const totalDamageMultiplier = damageMultiplier * (rallied ? 1.12 : 1);
    const damage = Math.round(monster.damage * totalDamageMultiplier);
    const rangedAttack = isRangedSoldier(monster.kind)
      || monster.kind === 'bandit'
      || monster.kind === 'moon-revenant'
      || monster.kind === 'geoje-sea-wraith'
      || monster.kind === 'episode2-marsh-wisp';
    const shotDistance = Math.max(0.001, this.distance(monster, this.player));
    const trajectory = rangedAttack ? {
      origin: { x: monster.x, y: monster.y },
      direction: {
        x: (this.player.x - monster.x) / shotDistance,
        y: (this.player.y - monster.y) / shotDistance,
      },
      halfWidth: monster.kind === 'japanese-gunner' || monster.kind === 'osaka-gunner' ? 20 : 30,
    } : undefined;
    const minimumFacingDot = monster.tacticalRole === 'spearman'
      ? 0.18
      : monster.tacticalRole === 'melee'
        || monster.tacticalRole === 'leader'
        || monster.tacticalRole === 'brute'
        || monster.tacticalRole === 'charger'
        ? -0.04
        : undefined;
    this.pendingMonsterAttacks.push({
      monsterId: monster.id,
      damage,
      impactAt: this.elapsed + 0.22,
      knockbackForce,
      impactRange,
      minimumFacingDot,
      requiresLineOfSight: rangedAttack,
      trajectory,
    });
    this.events.push({ type: 'monster-attack', monsterId: monster.id, damage });
  }

  private updateBoss(dt: number): void {
    const boss = this.boss;
    const definition = boss ? bossForFloor(boss.floor) : null;
    if (!boss?.alive || !definition || this.region !== 'dungeon' || !this.playerActive || this.player.hp <= 0) return;
    const commands = this.bossController.update(boss, definition, this.player, dt);
    for (const command of commands) {
      if (command.type === 'telegraph') {
        this.events.push({ type: 'boss-telegraph', bossId: boss.id, patternId: command.patternId, origin: command.origin, facing: command.facing });
        continue;
      }
      if (command.type !== 'impact') continue;
      this.events.push({ type: 'boss-impact', bossId: boss.id, patternId: command.patternId, origin: command.origin, facing: command.facing });
      const pattern = definition.patterns.find((entry) => entry.id === command.patternId);
      if (!pattern || !containsPatternPoint(pattern.shape, command.origin, command.facing, this.player)) continue;
      const damage = Math.max(1, Math.round(boss.damage * pattern.damageMultiplier) - this.getDefense());
      this.player.hp = Math.max(0, this.player.hp - damage);
      this.events.push({ type: 'player-hit', damage });
      if (this.player.hp === 0) this.defeatPlayer();
    }
  }

  private killBoss(boss: BossState): void {
    this.player.targetId = null;
    this.pendingPlayerAttack = null;
    this.dungeonStairLocked = false;
    this.player.kills += 1;
    this.player.xp += this.scaleExperience(boss.floor * 12);
    this.player.gold += boss.floor * 8;
    this.events.push({ type: 'boss-killed', bossId: boss.id, name: boss.name, floor: boss.floor });
    this.events.push({ type: 'dungeon-stair-lock-changed', locked: false });
    if (boss.floor === MAX_DUNGEON_FLOOR && !this.dungeonComplete) {
      this.dungeonComplete = true;
      this.events.push({ type: 'dungeon-complete' });
    }
  }

  private defeatPlayer(): void {
    this.defeatedInDungeon = this.region === 'dungeon';
    this.playerDefeatRegion = this.region;
    const respawnRegion = PLAYER_HOME_SPAWNS[this.playerOrigin].region;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.player.destination = null;
    this.playerRoute = [];
    this.movementWaypoint = null;
    this.routedMovementGoal = null;
    this.pendingPlayerAttack = null;
    this.resetBasicAttackChain();
    this.pendingMonsterAttacks = [];
    this.playerRespawnAt = this.elapsed + 3;
    this.events.push({ type: 'player-defeated', respawnRegion });
  }

  private selectMonsterRecoveryDirection(monster: MonsterState, target: Vec2): Vec2 | null {
    const targetAngle = Math.atan2(target.y - monster.y, target.x - monster.x);
    const preferredSide = (monster.tacticSlot + monster.recoveryCount) % 2 === 0 ? 1 : -1;
    const angularOffsets = [
      preferredSide * 1.08,
      -preferredSide * 1.08,
      preferredSide * 1.54,
      -preferredSide * 1.54,
      preferredSide * 2.05,
      -preferredSide * 2.05,
    ];
    const obstacles = this.activeCollisionObstacles();
    const candidates = angularOffsets.map((offset) => {
      const angle = targetAngle + offset;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      return {
        direction,
        destination: {
          x: monster.x + direction.x * 92,
          y: monster.y + direction.y * 92,
        },
      };
    }).filter((candidate) =>
      this.isMonsterTravelPathClear(monster, candidate.destination, 26, obstacles));
    if (monster.tacticalRole !== 'ranged') return candidates[0]?.direction ?? null;
    return candidates.find((candidate) =>
      this.hasMonsterLineOfSight(candidate.destination, this.player, obstacles))?.direction ?? null;
  }

  private moveMonsterToward(monster: MonsterState, target: Vec2, speed: number, dt: number, stopDistance: number): void {
    if (monster.elemental.frostSeconds > 0) speed *= 0.46;
    if (monster.elemental.shockSeconds > 0) speed *= 0.22;
    if (monster.elemental.stoneSeconds > 0) speed = 0;
    if (monster.rallySeconds > 0) speed *= 1.1;
    const originalDistance = this.distance(monster, target);
    if (originalDistance <= stopDistance) {
      monster.stuckSeconds = 0;
      monster.recoveryTimer = 0;
      this.brakeMonster(monster, dt);
      return;
    }
    let movementTarget = target;
    if (monster.recoveryTimer > 0 && Math.hypot(monster.recoveryDirection.x, monster.recoveryDirection.y) > 0.1) {
      monster.recoveryTimer = Math.max(0, monster.recoveryTimer - dt);
      movementTarget = {
        x: monster.x + monster.recoveryDirection.x * 96,
        y: monster.y + monster.recoveryDirection.y * 96,
      };
      speed *= 1.08;
      stopDistance = Math.min(stopDistance, 3);
    }
    let dx = movementTarget.x - monster.x;
    let dy = movementTarget.y - monster.y;
    const targetDistance = Math.hypot(dx, dy);
    if (targetDistance <= stopDistance || targetDistance === 0) {
      monster.stuckSeconds = 0;
      monster.recoveryTimer = 0;
      this.brakeMonster(monster, dt);
      return;
    }
    for (const other of this.activeMonsterRoster) {
      if (other === monster || !other.alive || other.region !== monster.region) continue;
      const ox = monster.x - other.x;
      const oy = monster.y - other.y;
      const d = Math.hypot(ox, oy);
      if (d > 0 && d < 76) {
        const weight = (76 - d) / 76;
        dx += (ox / d) * 72 * weight;
        dy += (oy / d) * 72 * weight;
      }
    }
    const distance = Math.hypot(dx, dy);
    if (distance === 0) {
      this.brakeMonster(monster, dt);
      return;
    }
    const desiredVelocity = { x: (dx / distance) * speed, y: (dy / distance) * speed };
    const response = 1 - Math.exp(-7.5 * dt);
    monster.velocity.x += (desiredVelocity.x - monster.velocity.x) * response;
    monster.velocity.y += (desiredVelocity.y - monster.velocity.y) * response;
    const velocityMagnitude = Math.hypot(monster.velocity.x, monster.velocity.y);
    if (velocityMagnitude > speed) {
      monster.velocity.x = (monster.velocity.x / velocityMagnitude) * speed;
      monster.velocity.y = (monster.velocity.y / velocityMagnitude) * speed;
    }
    const motionFacing = Math.atan2(monster.velocity.y, monster.velocity.x);
    monster.facing = this.rotateToward(monster.facing, motionFacing, 7.2 * dt);
    const before = { x: monster.x, y: monster.y };
    const travel = Math.min(Math.max(0, targetDistance - stopDistance), Math.hypot(monster.velocity.x, monster.velocity.y) * dt);
    const velocityDistance = Math.max(0.001, Math.hypot(monster.velocity.x, monster.velocity.y));
    monster.x += (monster.velocity.x / velocityDistance) * travel;
    monster.y += (monster.velocity.y / velocityDistance) * travel;
    const collided = this.resolveObstacleCollision(monster, 24);
    if (collided) {
      monster.velocity.x *= 0.35;
      monster.velocity.y *= 0.35;
    }
    this.clampMonster(monster);
    const moved = Math.hypot(monster.x - before.x, monster.y - before.y);
    const shouldAdvance = speed > 1 && originalDistance > stopDistance + 10;
    if (shouldAdvance && (collided || moved < Math.min(0.5, speed * dt * 0.12))) {
      monster.stuckSeconds += dt;
    } else {
      monster.stuckSeconds = Math.max(0, monster.stuckSeconds - dt * 2.4);
    }
    if (monster.stuckSeconds >= 0.3 && monster.recoveryTimer <= 0) {
      const recoveryDirection = this.selectMonsterRecoveryDirection(monster, target);
      monster.recoveryDirection = recoveryDirection ?? { x: 0, y: 0 };
      monster.recoveryTimer = recoveryDirection ? 0.52 : 0;
      monster.recoveryCount += 1;
      monster.stuckSeconds = 0;
    }
  }

  private brakeMonster(monster: MonsterState, dt: number): void {
    const damping = Math.exp(-9.5 * dt);
    monster.velocity.x *= damping;
    monster.velocity.y *= damping;
    const speed = Math.hypot(monster.velocity.x, monster.velocity.y);
    if (speed < 0.6) {
      monster.velocity.x = 0;
      monster.velocity.y = 0;
      return;
    }
    monster.x += monster.velocity.x * dt;
    monster.y += monster.velocity.y * dt;
    if (this.resolveObstacleCollision(monster, 24)) {
      monster.velocity.x = 0;
      monster.velocity.y = 0;
    }
    this.clampMonster(monster);
  }

  private rotateToward(current: number, target: number, maximumStep: number): number {
    const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    if (Math.abs(delta) <= maximumStep) return target;
    return current + Math.sign(delta) * maximumStep;
  }

  private clampMonster(monster: MonsterState): void {
    const origin = REGION_ORIGINS[monster.region];
    monster.y = Math.max(origin.y + 235, Math.min(origin.y + 865, monster.y));
    if (isUlleungRegion(monster.region)) {
      const bounds = ulleungWalkableBoundsAt(monster.region, monster.y);
      monster.x = Math.max(bounds.left, Math.min(bounds.right, monster.x));
      return;
    }
    monster.x = Math.max(origin.x + 220, Math.min(origin.x + 1320, monster.x));
  }

  private cloneRoyalRefugeState(): RoyalRefugeCampaignState {
    return {
      ...this.royalRefugeState,
      objectiveProgress: { ...this.royalRefugeState.objectiveProgress },
      completedStageIds: [...this.royalRefugeState.completedStageIds],
    };
  }

  private restoreRoyalRefugeState(saved?: RoyalRefugeCampaignState): RoyalRefugeCampaignState {
    if (!saved || typeof saved !== 'object') return createRoyalRefugeCampaignState();
    const statuses: readonly RoyalRefugeCampaignState['status'][] = [
      'locked', 'awaiting-route', 'in-progress', 'final-defense-complete',
    ];
    if (!statuses.includes(saved.status)) return createRoyalRefugeCampaignState();
    const routeId = saved.routeId !== null && isRoyalRefugeRouteId(saved.routeId)
      ? saved.routeId
      : null;
    const activeStageIndex = saved.activeStageIndex === 0
      || saved.activeStageIndex === 1
      || saved.activeStageIndex === 2
      ? saved.activeStageIndex
      : null;
    if (
      (saved.status === 'locked' && (routeId !== null || activeStageIndex !== null))
      || (saved.status === 'awaiting-route' && routeId !== null)
      || (saved.status === 'in-progress' && (routeId === null || activeStageIndex === null))
      || (saved.status === 'final-defense-complete' && routeId === null)
    ) return createRoyalRefugeCampaignState();
    const stageIds = routeId
      ? new Set(ROYAL_REFUGE_ROUTES[routeId].stages.map((stage) => stage.id))
      : new Set<string>();
    const completedStageIds = Array.isArray(saved.completedStageIds)
      ? saved.completedStageIds.filter((stageId): stageId is string =>
        typeof stageId === 'string' && stageIds.has(stageId))
      : [];
    const objectiveProgress: Record<string, number> = {};
    for (const [objectiveId, value] of Object.entries(saved.objectiveProgress ?? {})) {
      if (Number.isFinite(value) && value >= 0) objectiveProgress[objectiveId] = value;
    }
    return {
      status: saved.status,
      kingEncountered: Boolean(saved.kingEncountered),
      routeId,
      activeStageIndex: saved.status === 'final-defense-complete' ? null : activeStageIndex,
      objectiveProgress,
      completedStageIds,
      finalDefenseComplete: saved.status === 'final-defense-complete'
        ? true
        : Boolean(saved.finalDefenseComplete),
    };
  }

  private royalRefugeStageIndexForMonster(monster: MonsterState): 0 | 1 | 2 {
    const origin = REGION_ORIGINS[monster.region];
    const localY = monster.spawn.y - origin.y;
    if (localY >= 690) return 0;
    if (localY >= 430) return 1;
    return 2;
  }

  private royalRefugeStageTargets(
    routeId: RoyalRefugeRouteId,
    stageIndex: 0 | 1 | 2,
  ): MonsterState[] {
    return this.monsters.filter((monster) =>
      monster.region === routeId
      && isGovernmentSoldier(monster.kind)
      && this.royalRefugeStageIndexForMonster(monster) === stageIndex);
  }

  private isRoyalRefugeMonsterActive(monster: MonsterState): boolean {
    if (!isRoyalRefugeRegion(monster.region)) return true;
    return this.royalRefugeState.routeId === monster.region
      && this.royalRefugeState.activeStageIndex !== null
      && this.royalRefugeStageIndexForMonster(monster) === this.royalRefugeState.activeStageIndex;
  }

  private markCompletedRoyalRefugeStagesDefeated(): void {
    const routeId = this.royalRefugeState.routeId;
    if (!routeId) return;
    const completed = new Set(this.royalRefugeState.completedStageIds);
    for (const monster of this.monsters) {
      if (monster.region !== routeId) continue;
      const stage = ROYAL_REFUGE_ROUTES[routeId].stages[this.royalRefugeStageIndexForMonster(monster)];
      if (!completed.has(stage.id) && !this.royalRefugeState.finalDefenseComplete) continue;
      monster.alive = false;
      monster.hp = 0;
      monster.aggro = false;
      monster.velocity = { x: 0, y: 0 };
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
  }

  private checkRoyalRefugeStageVictory(routeId: RoyalRefugeRouteId): void {
    if (this.royalRefugeState.routeId !== routeId || this.royalRefugeState.activeStageIndex === null) return;
    const stageIndex = this.royalRefugeState.activeStageIndex;
    const targets = this.royalRefugeStageTargets(routeId, stageIndex);
    if (targets.length === 0 || targets.some((monster) => monster.alive)) return;
    const stage = activeRoyalRefugeStage(this.royalRefugeState);
    if (!stage) return;
    let state = this.royalRefugeState;
    const transitionEvents = [];
    for (const objective of stage.objectives) {
      const remaining = objective.target - (state.objectiveProgress[objective.id] ?? 0);
      if (remaining <= 0) continue;
      const transition = advanceRoyalRefugeObjective(state, stage.id, objective.id, remaining);
      state = transition.state;
      transitionEvents.push(...transition.events);
    }
    this.royalRefugeState = state;
    const nextStage = activeRoyalRefugeStage(state);
    const rewardGold = [180, 320, 600][stageIndex];
    this.player.gold += rewardGold;
    this.regionGateCooldownUntil = this.elapsed;
    this.events.push({
      type: 'royal-refuge-stage-cleared',
      routeId,
      stageIndex,
      stageName: stage.name,
      nextStageName: nextStage?.name,
      rewardGold,
    });
    const final = transitionEvents.find((event) => event.type === 'royal-refuge-final-defense-completed');
    if (final?.type === 'royal-refuge-final-defense-completed') {
      this.events.push({
        type: 'royal-refuge-final-defense-cleared',
        routeId,
        title: final.title,
        description: final.description,
      });
    }
  }

  private markTangeumForcesDefeated(): void {
    for (const monster of this.monsters) {
      if (monster.region !== 'tangeumdae' || !isJapaneseSoldier(monster.kind)) continue;
      monster.alive = false;
      monster.hp = 0;
      monster.velocity = { x: 0, y: 0 };
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
  }

  private pyongyangForwardDestination(region: PyongyangRegionId): RegionId {
    if (this.isFrontierArcher()) {
      if (region === 'pyongyangouter') return 'pyongyanggate';
      if (region === 'pyongyanggate') return 'pyongyanginner';
      return 'gyeongbokgate';
    }
    if (region === 'pyongyanginner') return 'pyongyanggate';
    if (region === 'pyongyanggate') return 'pyongyangouter';
    return 'manchufrontier';
  }

  private markPyongyangDefendersDefeated(region: PyongyangRegionId): void {
    for (const monster of this.monsters) {
      if (monster.region !== region || !isGovernmentSoldier(monster.kind)) continue;
      monster.alive = false;
      monster.hp = 0;
      monster.aggro = false;
      monster.velocity = { x: 0, y: 0 };
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
  }

  private jurchenAlliedTribeCount(): number {
    return JURCHEN_TRIBE_REGION_IDS.filter((region) =>
      this.jurchenCleared.has(region as JurchenExpansionRegionId)).length;
  }

  private jurchenStageTargets(region: JurchenExpansionRegionId): MonsterState[] {
    return this.monsters.filter((monster) => monster.region === region);
  }

  private markJurchenStageResolved(region: JurchenExpansionRegionId, emitRespawns = false): void {
    const hunt = JURCHEN_REGION_CATEGORY[region] === 'hunt';
    let preyIndex = 0;
    for (const monster of this.jurchenStageTargets(region)) {
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.velocity = { x: 0, y: 0 };
      monster.x = monster.spawn.x;
      monster.y = monster.spawn.y;
      monster.elemental = emptyElementalState();
      if (hunt) {
        if (!monster.alive) {
          monster.hp = 0;
          monster.respawnAt = this.elapsed + JURCHEN_HUNT_RESPAWN_SECONDS + (preyIndex % 4) * 1.25;
          preyIndex += 1;
        }
      } else {
        // A defeated tribe submits after the formal duel. Its warriors stand
        // back up as allies instead of leaving a village full of corpses.
        const wasDefeated = !monster.alive;
        monster.alive = true;
        monster.hp = monster.maxHp;
        monster.respawnAt = 0;
        if (wasDefeated && emitRespawns) {
          this.events.push({ type: 'monster-respawn', monsterId: monster.id });
        }
      }
    }
  }

  private checkJurchenStageVictory(region: JurchenExpansionRegionId): void {
    if (!this.isFrontierArcher() || this.jurchenCleared.has(region)) return;
    const targets = this.jurchenStageTargets(region);
    if (!targets.length || targets.some((monster) => monster.alive)) return;

    this.jurchenCleared.add(region);
    const rewardGold: Record<JurchenExpansionRegionId, number> = {
      changbaihunt: 60,
      baeksanvillage: 100,
      songhuahunt: 120,
      songhuavillage: 160,
      blackpinehunt: 210,
      heuksuvillage: 320,
    };
    const reward = rewardGold[region];
    this.player.gold += reward;
    this.regionGateCooldownUntil = this.elapsed;
    this.events.push({
      type: 'jurchen-stage-cleared',
      region,
      defeated: targets.length,
      rewardGold: reward,
    });

    if ((JURCHEN_TRIBE_REGION_IDS as readonly RegionId[]).includes(region)) {
      const allied = this.jurchenAlliedTribeCount();
      this.factionWarState.strength['jurchen-league'] = Math.min(58, 18 + allied * 12);
      this.hajinArmyReserve = Math.min(
        reserveCapacityForFaction(this.factionWarState, 'jurchen-league', this.player.level),
        Math.max(this.hajinArmyReserve, allied * JURCHEN_TRIBE_ARMY_REWARD),
      );
      this.factionWarState.reserve['jurchen-league'] = this.hajinArmyReserve;
      this.events.push({
        type: 'jurchen-tribe-allied',
        region,
        tribeName: region === 'baeksanvillage'
          ? '백산부'
          : region === 'songhuavillage' ? '송화부' : '흑수부',
        allied,
        total: JURCHEN_TRIBE_REGION_IDS.length,
      });
    }

    const unified = JURCHEN_EXPANSION_REGION_IDS.every((stage) => this.jurchenCleared.has(stage));
    this.markJurchenStageResolved(region, true);
    if (unified) {
      const allied = this.jurchenAlliedTribeCount();
      this.events.push({
        type: 'jurchen-unified',
        allied,
        total: JURCHEN_TRIBE_REGION_IDS.length,
        armyStrength: this.hajinArmyReserve,
      });
    }
  }

  private japanStageTargets(region: JapanRegionId): MonsterState[] {
    return this.monsters.filter((monster) => {
      if (monster.region !== region) return false;
      if (JAPAN_REPEATABLE_HUNT_REGIONS.has(region)) return true;
      return region === 'osaka' || isJapaneseSoldier(monster.kind);
    });
  }

  private markJapanStageDefeated(region: JapanRegionId): void {
    for (const monster of this.japanStageTargets(region)) {
      monster.alive = false;
      monster.hp = 0;
      monster.aggro = false;
      monster.velocity = { x: 0, y: 0 };
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
    if (JAPAN_REPEATABLE_HUNT_REGIONS.has(region) && this.japanCleared.has(region)) {
      this.scheduleJapanHuntRespawns(region);
    }
  }

  private scheduleJapanHuntRespawns(region: JapanRegionId): void {
    if (!JAPAN_REPEATABLE_HUNT_REGIONS.has(region)) return;
    let preyIndex = 0;
    for (const monster of this.japanStageTargets(region)) {
      if (monster.alive || !isJapanHuntPrey(monster.kind)) continue;
      monster.respawnAt = this.elapsed + JAPAN_HUNT_RESPAWN_SECONDS + (preyIndex % 4) * 1.25;
      preyIndex += 1;
    }
  }

  private checkJapanStageVictory(region: JapanRegionId): void {
    if (this.japanCleared.has(region)) return;
    const progress = this.getJapanStageProgress(region);
    if (progress.total === 0 || progress.defeated < progress.total) return;
    this.japanCleared.add(region);
    this.regionGateCooldownUntil = this.elapsed;
    const rewards: Record<JapanRegionId, number> = {
      osaka: 45,
      settsuvillage: 70,
      yamazakihunt: 90,
      osakacastle: 140,
      shogunkeep: 0,
      sakaicity: 160,
      izumihunt: 175,
      awajicoast: 190,
      ikiport: 220,
      tsushimahunt: 245,
      izuhara: 300,
    };
    const rewardGold = rewards[region];
    this.player.gold += rewardGold;
    this.events.push({ type: 'japan-stage-cleared', region, defeated: progress.total, rewardGold });
    if (region === 'osaka') {
      this.events.push({ type: 'osaka-departure-ready', defeated: progress.total });
    }
    if (JAPAN_REPEATABLE_HUNT_REGIONS.has(region)) this.scheduleJapanHuntRespawns(region);
  }

  private checkPyongyangStageVictory(region: PyongyangRegionId): void {
    if (this.pyongyangCleared.has(region)) return;
    const progress = this.getPyongyangBattleProgress(region);
    if (progress.total === 0 || progress.defeated < progress.total) return;
    this.pyongyangCleared.add(region);
    this.regionGateCooldownUntil = this.elapsed;
    this.events.push({ type: 'pyongyang-stage-cleared', region, defeated: progress.total });
  }

  private checkTangeumBattleVictory(): void {
    if (this.tangeumCleared) return;
    const progress = this.getTangeumBattleProgress();
    if (progress.total === 0 || progress.defeated < progress.total) return;
    this.tangeumCleared = true;
    const rewardGold = 360;
    this.player.gold += rewardGold;
    this.events.push({
      type: 'tangeum-forces-annihilated',
      defeated: progress.total,
      gunners: progress.gunners,
      gold: rewardGold,
    });
  }

  private killMonster(monster: MonsterState): void {
    if (!monster.alive) return;
    const poisonedOnDeath = monster.elemental.poisonSeconds > 0;
    const poisonDamage = monster.elemental.poisonDamage;
    monster.alive = false;
    monster.velocity.x = 0;
    monster.velocity.y = 0;
    const repeatableJapanHunt = isJapanRegion(monster.region)
      && JAPAN_REPEATABLE_HUNT_REGIONS.has(monster.region)
      && this.japanCleared.has(monster.region)
      && isJapanHuntPrey(monster.kind);
    const repeatableJurchenHunt = this.isFrontierArcher()
      && isJurchenExpansionRegion(monster.region)
      && JURCHEN_REGION_CATEGORY[monster.region] === 'hunt'
      && this.jurchenCleared.has(monster.region);
    const permanentJurchenStageDefeat = this.isFrontierArcher()
      && isJurchenExpansionRegion(monster.region)
      && !repeatableJurchenHunt;
    const permanentJapanDefeat = isJapanRegion(monster.region) && !repeatableJapanHunt;
    const permanentHajinCampaignDefeat = this.isFrontierArcher()
      && isHajinInvasionTarget(monster.kind)
      && (
        monster.region === 'manchufrontier'
        || monster.region === 'gyeongbokinner'
        || monster.region === 'gyeongbokcourt'
        || monster.region === 'gyeongbokgate'
        || isPyongyangRegion(monster.region)
      );
    const permanentTangeumDefeat = monster.region === 'tangeumdae' && isJapaneseSoldier(monster.kind);
    const permanentPyongyangDefeat = isPyongyangRegion(monster.region) && isGovernmentSoldier(monster.kind);
    const permanentRoyalRefugeDefeat = isRoyalRefugeRegion(monster.region);
    const gwanghaePath = this.isGwanghaePrince() ? this.getGwanghaeRallyProgress().path : null;
    const permanentGwanghaePathDefeat = gwanghaePath
      ? isGwanghaePathTargetMonster(gwanghaePath, monster)
      : false;
    const gwanghaeReinforcementCommitted = Boolean(
      permanentGwanghaePathDefeat
      && gwanghaePath
      && !this.factionWarState.resolvedMilestones.includes(GWANGHAE_PATH_BATTLE_MILESTONES[gwanghaePath])
      && this.gwanghaeEnemyReserve > 0,
    );
    if (gwanghaeReinforcementCommitted) this.gwanghaeEnemyReserve -= 1;
    monster.respawnAt = repeatableJapanHunt
      ? this.elapsed + JAPAN_HUNT_RESPAWN_SECONDS
      : repeatableJurchenHunt
        ? this.elapsed + JURCHEN_HUNT_RESPAWN_SECONDS
        : gwanghaeReinforcementCommitted
          ? this.elapsed + GWANGHAE_ENEMY_REINFORCEMENT_DELAY
        : permanentJurchenStageDefeat || permanentJapanDefeat || permanentHajinCampaignDefeat
          || permanentTangeumDefeat || permanentPyongyangDefeat
        || permanentRoyalRefugeDefeat || permanentGwanghaePathDefeat
        || isUlleungGuard(monster.kind) || isWako(monster.kind) || monster.kind === 'ulleung-magistrate'
        ? Number.POSITIVE_INFINITY : this.elapsed + (isGovernmentSoldier(monster.kind) ? 18 : 7);
    this.pendingMonsterAttacks = this.pendingMonsterAttacks.filter((pending) => pending.monsterId !== monster.id);
    this.player.targetId = null;
    this.player.kills += 1;
    const huntKills = (this.huntKills[monster.kind] ?? 0) + 1;
    this.huntKills[monster.kind] = huntKills;
    this.player.combo = this.player.comboTimer > 0 ? Math.min(5, this.player.combo + 1) : 1;
    this.player.comboTimer = 6;
    this.gainMomentum(Math.min(30, 14 + this.player.combo * 4));
    this.events.push({ type: 'combat-combo', count: this.player.combo, momentum: this.player.momentum });
    const eventBonus = this.activeWorldEvent?.region === monster.region;
    const xp = this.scaleExperience(28 + monster.level * 3 + (eventBonus ? 14 : 0));
    const gold = 8 + Math.floor(Math.random() * 15) + (eventBonus ? 9 : 0);
    this.player.xp += xp;
    this.player.gold += gold;
    this.events.push({ type: 'monster-killed', monsterId: monster.id, name: monster.name, xp, gold });
    if (gwanghaeReinforcementCommitted && gwanghaePath) {
      const remaining = this.getGwanghaePathBattleProgress()?.enemyRemaining ?? 0;
      this.events.push({
        type: 'gwanghae-enemy-reinforcement',
        path: gwanghaePath,
        reserve: this.gwanghaeEnemyReserve,
        remaining,
      });
    }
    if (monster.kind === 'japanese-shogun') {
      const shogunGold = 900;
      const shogunSkillPoints = 2;
      this.player.gold += shogunGold;
      this.skillPoints += shogunSkillPoints;
      this.spawnDropAt(monster.x - 34, monster.y + 12, 'weapon-enchant-scroll');
      this.spawnDropAt(monster.x + 34, monster.y + 12, 'armor-enchant-scroll');
      this.events.push({ type: 'shogun-defeated', gold: shogunGold, skillPoints: shogunSkillPoints });
    }
    this.advanceFrontierWorldEvent(monster);
    this.checkHajinFrontierMission();
    if (permanentTangeumDefeat) this.checkTangeumBattleVictory();
    if (permanentPyongyangDefeat && isPyongyangRegion(monster.region)) {
      this.checkPyongyangStageVictory(monster.region);
    }
    if (permanentRoyalRefugeDefeat && isRoyalRefugeRegion(monster.region)) {
      this.checkRoyalRefugeStageVictory(monster.region);
    }
    if (permanentGwanghaePathDefeat) {
      if (gwanghaePath === 'coup' && isGwanghaeCoupStageRegion(monster.region)) {
        this.checkGwanghaeCoupStageVictory(monster.region);
      }
      this.checkGwanghaePathBattleVictory();
    }
    if (permanentJapanDefeat && isJapanRegion(monster.region)) {
      this.checkJapanStageVictory(monster.region);
    }
    if (permanentJurchenStageDefeat && isJurchenExpansionRegion(monster.region)) {
      this.checkJurchenStageVictory(monster.region);
    }
    const huntReward = huntKills === 1 ? { gold: 8, xp: this.scaleExperience(6) }
      : huntKills === 5 ? { gold: 25, xp: this.scaleExperience(18) }
        : huntKills === 15 ? { gold: 70, xp: this.scaleExperience(50) } : null;
    if (huntReward) {
      this.player.gold += huntReward.gold;
      this.player.xp += huntReward.xp;
      this.events.push({ type: 'hunt-milestone', kind: monster.kind, kills: huntKills, ...huntReward });
    }
    if (poisonedOnDeath) {
      for (const target of this.nearbyMonsters(monster, 175, 2)) {
        this.applyElementalStatus(target, 'poison', Math.max(6, poisonDamage * 2), monster.id, false);
      }
    }
    if (isUlleungGuard(monster.kind)
      && !this.prisonGateOpen
      && this.monsters.every((entry) => entry.region !== 'ulleungdo' || !isUlleungGuard(entry.kind) || !entry.alive)) {
      this.prisonGateOpen = true;
      this.unlockSkill('moon-dash', 'event');
      this.events.push({ type: 'prison-gate-opened' });
    }
    if (isUlleungGuard(monster.kind)
      && monster.region === 'ulleungvillage'
      && this.monsters.every((entry) => entry.region !== 'ulleungvillage' || !isUlleungGuard(entry.kind) || !entry.alive)) {
      const magistrate = this.monsters.find((entry) => entry.region === 'ulleungvillage' && entry.kind === 'ulleung-magistrate');
      if (magistrate && !magistrate.alive && magistrate.hp === 0) {
        magistrate.alive = true;
        magistrate.hp = magistrate.maxHp;
        magistrate.aggro = true;
        magistrate.aiState = 'alert';
        magistrate.actionTimer = 0.7;
        magistrate.velocity = { x: 0, y: 0 };
        magistrate.elemental = emptyElementalState();
        this.events.push({ type: 'ulleung-magistrate-spawned', monsterId: magistrate.id });
        this.revealWakoPact(magistrate);
      }
    }
    if (monster.kind === 'ulleung-magistrate') this.guidePlayerToGovernmentDock();
    if (monster.kind === 'ulleung-magistrate' || isWako(monster.kind)) this.tryLiberateUlleungVillage();
    if (!this.questCompleted && this.player.kills >= 8) {
      this.questCompleted = true;
      this.player.gold += 240;
      this.events.push({ type: 'quest-complete', gold: 240 });
    }
    this.dropItem(monster);
    if (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext;
      this.player.level += 1;
      this.player.xpToNext = Math.round(this.player.xpToNext * 1.34);
      this.player.maxHp += 24;
      this.player.hp = this.player.maxHp;
      const attributePointsGained = this.player.level % 2 === 0 ? 1 : 0;
      this.attributePoints += attributePointsGained;
      this.events.push({ type: 'level-up', level: this.player.level, attributePointsGained });
    }
  }

  private dropItem(monster: MonsterState): void {
    // The Shogun reward is authored in killMonster as one weapon and one armor
    // scroll. Do not let the generic roll add a third copy to that fixed pair.
    if (monster.kind === 'japanese-shogun') return;

    // The escape deliberately begins bare-handed. The first defeated gaoler
    // always drops a confiscated damaged sword, teaching loot and equipment
    // before weapon skills become part of the combat loop.
    if (
      monster.region === 'ulleungdo'
      && isUlleungGuard(monster.kind)
      && !this.droppedStarterWeapon
    ) {
      this.droppedStarterWeapon = true;
      this.spawnDrop(monster, 'worn-hwando');
      return;
    }

    if (
      monster.kind === 'bamboo-spirit'
      && this.skillRanks['crescent-wave'] === 0
      && !this.droppedMartialManuals.has('crescent-manual')
    ) {
      this.droppedMartialManuals.add('crescent-manual');
      this.spawnDrop(monster, 'crescent-manual');
      return;
    }
    if (
      monster.kind === 'moon-revenant'
      && this.skillRanks.insight === 0
      && !this.droppedMartialManuals.has('insight-manual')
    ) {
      this.droppedMartialManuals.add('insight-manual');
      this.spawnDrop(monster, 'insight-manual');
      return;
    }

    if (monster.kind === 'ulleung-sangun') {
      if ((this.huntKills[monster.kind] ?? 0) === 1 || Math.random() < 0.62) {
        this.spawnDrop(monster, 'ulleung-tiger-pelt', -10);
      }
      if (Math.random() < 0.1) this.spawnDrop(monster, 'frost-hwando', 14);
      return;
    }
    if (this.isFrontierArcher() && monster.region === 'manchufrontier' && monster.kind === 'boar') {
      const frontierKills = this.huntKills.boar ?? 0;
      if (frontierKills === 1) {
        this.spawnDrop(monster, 'white-birch-bow');
        return;
      }
      if (Math.random() < 0.075) {
        this.spawnDrop(monster, 'iron-horn-warbow');
        return;
      }
    }
    if (this.isFrontierArcher() && monster.region === 'manchufrontier' && isFrontierJoseon(monster.kind)) {
      if (monster.kind === 'joseon-border-commander' && !this.ownsItem('frontier-lamellar-coat')) {
        this.spawnDrop(monster, 'frontier-lamellar-coat');
        return;
      }
      if (monster.kind === 'joseon-border-archer' && !this.ownsItem('falcon-eye-bracer')) {
        this.spawnDrop(monster, 'falcon-eye-bracer');
        return;
      }
      if (Math.random() < 0.16) {
        this.spawnDrop(monster, 'joseon-border-token');
        return;
      }
    }

    let itemId: ItemId | null = null;
    const roll = Math.random();
    const episodePool = episode2DropPool(monster.region);
    if (episodePool.length > 0) {
      const firstUnowned = episodePool.find((candidate) => !this.ownsItem(candidate));
      const episodeKills = this.huntKills[monster.kind] ?? 0;
      if (firstUnowned && (episodeKills === 1 || roll < 0.16)) {
        this.spawnDrop(monster, firstUnowned);
        return;
      }
      if (roll < 0.34) {
        const index = Math.abs((episodeKills * 7 + monster.tacticSlot * 3)) % episodePool.length;
        this.spawnDrop(monster, episodePool[index]);
        return;
      }
    }
    const regionalSignatureDrops: Partial<Record<MonsterKind, ItemId>> = {
      'wonju-bear': 'chiaksan-claw-knife',
      'gangneung-haetae': 'haetae-ward-charm',
      'haeju-crane': 'crane-feather-talisman',
      'geoje-sea-wraith': 'sea-salt-amulet',
    };
    const signatureDrop = regionalSignatureDrops[monster.kind];
    if (signatureDrop && !this.ownsItem(signatureDrop)) {
      this.spawnDrop(monster, signatureDrop);
      return;
    }
    if (monster.kind === 'wonju-bear') {
      itemId = roll < 0.24 ? 'bear-claw-gauntlet' : roll < 0.46 ? 'pine-resin-torch' : null;
    } else if (monster.kind === 'gangneung-haetae') {
      itemId = roll < 0.2 ? 'gangneung-sea-bow' : roll < 0.42 ? 'coastal-scout-coat' : roll < 0.58 ? 'naval-signal-seal' : null;
    } else if (monster.kind === 'haeju-crane') {
      itemId = roll < 0.2 ? 'haeju-reed-cape' : roll < 0.42 ? 'saltfield-ritual-knife' : roll < 0.62 ? 'crane-quill-bundle' : roll < 0.78 ? 'salt-crystal-bundle' : null;
    } else if (monster.kind === 'geoje-sea-wraith') {
      itemId = roll < 0.18 ? 'geoje-anchor-hwando' : roll < 0.38 ? 'sea-salt-amulet' : roll < 0.56 ? 'naval-signal-seal' : roll < 0.72 ? 'salt-crystal-bundle' : null;
    }
    if (itemId) {
      this.spawnDrop(monster, itemId);
      return;
    }
    if (monster.kind === 'ulleung-magistrate') {
      itemId = 'moonsteel-hwando';
    } else if (monster.kind === 'wako-captain' && roll < 0.16) {
      itemId = 'ember-hwando';
    } else if (monster.kind === 'wako-archer' && roll < 0.12) {
      itemId = 'gale-hwando';
    } else if (monster.kind === 'bamboo-spirit' && roll < 0.12) {
      itemId = 'venom-hwando';
    } else if (monster.kind === 'mine-golem' && roll < 0.13) {
      itemId = 'earth-hwando';
    } else if (monster.kind === 'moon-revenant' && roll < 0.12) {
      itemId = 'shadow-hwando';
    } else if (
      (monster.kind === 'yeongwol-commander' || monster.kind === 'jeonju-commander')
      && roll < 0.12
    ) {
      itemId = 'storm-hwando';
    } else if (monster.kind === 'japanese-general' && this.isFrontierArcher() && roll < 0.16) {
      itemId = 'thunderbird-bow';
    } else if (roll < 0.028) {
      itemId = Math.random() < 0.5 ? 'weapon-enchant-scroll' : 'armor-enchant-scroll';
    } else if ((monster.kind === 'bandit' || isGovernmentSoldier(monster.kind) || isWako(monster.kind)) && roll < 0.085) {
      itemId = Math.random() < 0.08 ? 'warden-durumagi' : 'hunter-durumagi';
    } else if (monster.kind === 'boar' && roll < 0.1) {
      itemId = Math.random() < 0.06 ? 'silver-tiger-charm' : 'boar-tusk-charm';
    } else if ((monster.kind === 'dokkaebi' || monster.kind === 'bamboo-spirit') && roll < 0.075) {
      itemId = Math.random() < 0.04 ? 'moonsteel-hwando' : 'dokkaebi-club';
    }
    const killCount = this.huntKills[monster.kind] ?? 0;
    if (!itemId && killCount > 0 && killCount % 8 === 0) {
      itemId = Math.random() < 0.5 ? 'weapon-enchant-scroll' : 'armor-enchant-scroll';
    }
    if (!itemId) return;
    this.spawnDrop(monster, itemId);
  }

  private spawnDrop(monster: MonsterState, itemId: ItemId, xOffset = 0): void {
    this.spawnDropAt(monster.x + xOffset, monster.y - 4, itemId);
  }

  private spawnDropAt(x: number, y: number, itemId: ItemId): void {
    const drop: GroundDrop = {
      id: `drop-${this.dropCounter++}`,
      itemId,
      region: this.region,
      remainingSeconds: this.groundDropLifetime(itemId),
      x,
      y,
    };
    this.groundDrops.push(drop);
    this.events.push({ type: 'item-drop', dropId: drop.id, itemId, itemName: ITEM_CATALOG[itemId].name });
  }

  private groundDropLifetime(itemId: ItemId): number {
    const rarity = ITEM_CATALOG[itemId].rarity;
    if (rarity === '영웅') return 420;
    if (rarity === '희귀') return 240;
    if (rarity === '일반') return 120;
    return 90;
  }

  private updateGroundDropLifetimes(dt: number): void {
    for (let index = this.groundDrops.length - 1; index >= 0; index -= 1) {
      const drop = this.groundDrops[index];
      if (drop.remainingSeconds === undefined) drop.remainingSeconds = this.groundDropLifetime(drop.itemId);
      if (this.player.lootTargetId === drop.id) continue;
      drop.remainingSeconds = Math.max(0, drop.remainingSeconds - dt);
      if (drop.remainingSeconds > 0) continue;
      this.groundDrops.splice(index, 1);
      if (drop.region === this.region || !drop.region) {
        const definition = ITEM_CATALOG[drop.itemId];
        this.events.push({
          type: 'item-drop-expired',
          itemId: drop.itemId,
          itemName: definition.name,
          notable: definition.rarity === '희귀' || definition.rarity === '영웅',
        });
      }
    }
  }

  private getEquipmentAttackBonus(): number {
    return (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.attackBonus ?? 0);
    }, 0);
  }

  private hasTigerPeltArmor(): boolean {
    return this.getEquippedDefinition('armor')?.passiveId === 'beast-hunter';
  }

  private playerDamageBonusAgainstMonster(monster: MonsterState, damage: number): number {
    return this.hasTigerPeltArmor() && isBeast(monster.kind)
      ? Math.max(1, Math.round(damage * 1.25))
      : damage;
  }

  private monsterDefenseAdjustedDamage(monster: MonsterState, damage: number): number {
    return isShieldFormation(monster.kind) && monster.aiState === 'brace' && monster.actionTimer > 0
      ? Math.max(1, Math.round(damage * 0.48))
      : damage;
  }

  private damageAgainstMonster(monster: MonsterState, damage: number): number {
    return this.monsterDefenseAdjustedDamage(
      monster,
      this.playerDamageBonusAgainstMonster(monster, damage),
    );
  }

  private getEquippedItem(slot: EquipmentSlot): InventoryItem | null {
    const instanceId = this.equipment[slot];
    const item = this.inventory.find((entry) => entry.instanceId === instanceId);
    return item && ITEM_CATALOG[item.itemId].slot === slot ? item : null;
  }

  private getEquippedEnhancement(slot: 'weapon' | 'armor'): number {
    return this.getEquippedItem(slot)?.enhancement ?? 0;
  }

  private getEquipmentStatBonus(stat: 'defenseBonus' | 'accuracyBonus' | 'evasionBonus'): number {
    return (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.[stat] ?? 0);
    }, 0);
  }

  private getSetPieceCount(): number {
    return (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.setId === ITEM_SET.id ? 1 : 0);
    }, 0);
  }

  private getSetBonus(stat: 'attack' | 'hp' | 'defense'): number {
    const pieces = this.getSetPieceCount();
    return ITEM_SET.bonuses.reduce((total, bonus) => total + (pieces >= bonus.pieces ? bonus[stat] : 0), 0);
  }

  private getEquipmentHpBonus(): number {
    const equipmentBonus = (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.hpBonus ?? 0);
    }, 0);
    return equipmentBonus + this.getSetBonus('hp');
  }

  private scaleExperience(amount: number): number {
    return this.skillRanks.insight > 0 ? Math.max(1, Math.round(amount * 1.2)) : amount;
  }

  private respawnMonsters(): void {
    for (const monster of this.activeMonsterRoster) {
      if (monster.alive || this.elapsed < monster.respawnAt) continue;
      monster.alive = true;
      monster.hp = monster.maxHp;
      monster.x = monster.spawn.x;
      monster.y = monster.spawn.y;
      const gwanghaePath = this.isGwanghaePrince() ? this.getGwanghaeRallyProgress().path : null;
      const gwanghaeReinforcement = Boolean(
        gwanghaePath
        && isGwanghaePathTargetMonster(gwanghaePath, monster)
        && !this.factionWarState.resolvedMilestones.includes(GWANGHAE_PATH_BATTLE_MILESTONES[gwanghaePath]),
      );
      monster.aggro = gwanghaeReinforcement;
      monster.aiState = gwanghaeReinforcement ? 'alert' : 'patrol';
      monster.actionTimer = 0;
      monster.rallySeconds = 0;
      monster.stuckSeconds = 0;
      monster.recoveryTimer = 0;
      monster.recoveryDirection = { x: 0, y: 0 };
      monster.recoveryCount = 0;
      monster.hitStun = 0;
      monster.velocity = { x: 0, y: 0 };
      monster.knockback = { x: 0, y: 0 };
      monster.elemental = emptyElementalState();
      this.events.push({ type: 'monster-respawn', monsterId: monster.id });
    }
  }

  private respawnPlayer(): void {
    this.player.hp = this.player.maxHp;
    const homeSpawn = PLAYER_HOME_SPAWNS[this.playerOrigin];
    const respawnRegion = homeSpawn.region;
    this.player.x = REGION_ORIGINS[respawnRegion].x + homeSpawn.x;
    this.player.y = REGION_ORIGINS[respawnRegion].y + homeSpawn.y;
    if (this.defeatedInDungeon || this.region === 'dungeon') {
      if (this.boss) this.events.push({ type: 'boss-reset', floor: this.boss.floor });
      this.boss = null;
      this.dungeonFloor = 0;
      this.dungeonLayout = null;
      this.dungeonObstacles = [];
      this.dungeonStairLocked = false;
      this.dungeonComplete = false;
    }
    this.player.facing = -Math.PI / 2;
    this.player.lootTargetId = null;
    this.player.dodgeCooldown = 0;
    this.player.momentum = 0;
    this.player.momentumActive = 0;
    this.player.combo = 0;
    this.player.comboTimer = 0;
    this.playerRespawnAt = 0;
    this.playerActive = false;
    this.pendingMonsterAttacks = [];
    this.changeRegion(respawnRegion);
    this.defeatedInDungeon = false;
    this.playerDefeatRegion = null;
    for (const monster of this.monsters) {
      monster.aggro = false;
      monster.aiState = 'return';
      monster.actionTimer = 0;
      monster.attackCooldown = Math.max(monster.attackCooldown, 1.2);
    }
    this.events.push({ type: 'player-respawn', region: respawnRegion });
  }

  private provokePrisonGuards(instigator: MonsterState, cause: 'struck' | 'execution' = 'struck'): void {
    this.prisonGuardsProvoked = true;
    const guards = this.monsters
      .filter((guard) => guard.alive && guard.region === 'ulleungdo' && isUlleungGuard(guard.kind))
      .sort((left, right) => this.distance(left, this.player) - this.distance(right, this.player));
    for (const [index, guard] of guards.entries()) {
      // Two rush immediately. The rest form a second line and join through the
      // normal three-aggressor cap instead of deleting a new player at once.
      guard.aggro = index < 2;
      guard.aiState = 'alert';
      guard.actionTimer = index < 2 ? (guard === instigator ? 0.18 : 0.48) : 0.9 + index * 0.18;
      guard.facing = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    }
    this.events.push({ type: 'prison-guards-provoked', monsterId: instigator.id, cause });
  }

  private provokeGovernmentGuards(instigator: MonsterState): void {
    this.governmentGuardsProvoked = true;
    for (const guard of this.monsters) {
      if (!guard.alive || guard.region !== 'ulleungvillage' || !isUlleungGuard(guard.kind)) continue;
      guard.aggro = true;
      guard.aiState = 'alert';
      guard.actionTimer = guard === instigator ? 0.18 : 0.32;
      guard.facing = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    }
    this.events.push({ type: 'government-guards-provoked', monsterId: instigator.id });
  }

  private startWakoInvasion(): void {
    if (this.wakoInvasionStarted) return;
    this.wakoInvasionAt = 0;
    this.wakoInvasionStarted = true;
    this.playerActive = true;
    const magistrate = this.monsters.find((monster) =>
      monster.region === 'ulleungvillage' && monster.kind === 'ulleung-magistrate' && monster.alive);
    if (magistrate) {
      magistrate.aggro = true;
      magistrate.aiState = 'alert';
      magistrate.actionTimer = 0.75;
      magistrate.facing = Math.atan2(this.player.y - magistrate.y, this.player.x - magistrate.x);
    }
    const invaders = this.monsters.filter((monster) => monster.region === 'ulleungvillage' && isWako(monster.kind));
    for (const [index, invader] of invaders.entries()) {
      invader.alive = true;
      invader.hp = invader.maxHp;
      invader.aggro = index < 5;
      invader.aiState = 'alert';
      invader.actionTimer = 0.45 + index * 0.06;
      invader.respawnAt = Number.POSITIVE_INFINITY;
      invader.velocity = { x: 0, y: 0 };
      invader.elemental = emptyElementalState();
      invader.facing = Math.atan2(this.player.y - invader.y, this.player.x - invader.x);
    }
    this.events.push({
      type: 'wako-invasion-started',
      count: invaders.length,
      dock: { x: REGION_ORIGINS.ulleungvillage.x + 1370, y: REGION_ORIGINS.ulleungvillage.y + 820 },
    });
  }

  private revealWakoPact(magistrate: MonsterState): void {
    if (this.wakoPactRevealed || this.wakoInvasionStarted) return;
    this.wakoPactRevealed = true;
    this.wakoInvasionAt = this.elapsed + 5.4;
    magistrate.aggro = false;
    magistrate.aiState = 'brace';
    magistrate.actionTimer = 5.4;
    magistrate.velocity = { x: 0, y: 0 };
    this.events.push({
      type: 'wako-pact-revealed',
      magistrateId: magistrate.id,
      dock: { x: REGION_ORIGINS.ulleungvillage.x + 1370, y: REGION_ORIGINS.ulleungvillage.y + 820 },
      invasionIn: 5.4,
    });
  }

  private guidePlayerToGovernmentDock(): void {
    const origin = REGION_ORIGINS.ulleungvillage;
    const dock = this.clampPlayerPoint({ x: origin.x + 1240, y: origin.y + 810 });
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.pendingPlayerAttack = null;
    this.player.destination = dock;
    this.playerRoute = this.buildUlleungTravelRoute(dock);
    this.movementWaypoint = this.playerRoute.shift() ?? dock;
    this.routedMovementGoal = dock;
    this.playerActive = true;
    this.events.push({ type: 'government-dock-guidance', dock: { ...dock } });
  }

  private tryLiberateUlleungVillage(): void {
    if (this.ulleungVillageLiberated || !this.wakoInvasionStarted) return;
    const magistrateAlive = this.monsters.some((monster) => monster.region === 'ulleungvillage'
      && monster.kind === 'ulleung-magistrate' && monster.alive);
    const invaderAlive = this.monsters.some((monster) => monster.region === 'ulleungvillage' && isWako(monster.kind) && monster.alive);
    if (magistrateAlive || invaderAlive) return;
    this.ulleungVillageLiberated = true;
    this.events.push({ type: 'ulleung-village-liberated' });
    this.guidePlayerToGovernmentDock();
    if (!this.followers.some((follower) => follower.kind === 'peasant-militia')) {
      this.recruitFollower('peasant-militia', 'liberation');
    }
  }

  private movePlayerToward(target: Vec2, speed: number, dt: number, stopDistance = 5): void {
    const previous = { x: this.player.x, y: this.player.y };
    const previousDistance = Math.hypot(target.x - previous.x, target.y - previous.y);
    this.moveEntityToward(this.player, target, speed, dt, stopDistance);
    this.resolveObstacleCollision(this.player, PLAYER_COLLISION_RADIUS);
    const clamped = this.clampToField(this.player);
    this.player.x = clamped.x;
    this.player.y = clamped.y;
    const movedX = this.player.x - previous.x;
    const movedY = this.player.y - previous.y;
    const movedDistance = Math.hypot(movedX, movedY);
    if (movedDistance > 0.01) {
      // Face the direction the body actually travelled after collision
      // resolution. Facing the blocked target made the walk sprite flicker
      // sideways while the collision solver was sliding along scenery.
      this.player.facing = Math.atan2(movedY, movedX);
      this.navigationKnockbackAxis = {
        x: movedX / movedDistance,
        y: movedY / movedDistance,
      };
    }
    const remainingDistance = Math.hypot(target.x - this.player.x, target.y - this.player.y);
    const reached = remainingDistance <= stopDistance + 0.25;
    if (!reached && this.player.destination) {
      const forwardProgress = previousDistance - remainingDistance;
      this.playerMovementStallSeconds = forwardProgress <= 0.05
        ? this.playerMovementStallSeconds + dt
        : 0;
      if (this.playerMovementStallSeconds >= 0.45) {
        const sidestep = this.playerNavigationRecoveries < 2
          ? this.findNavigationSidestep(target)
          : null;
        if (sidestep) {
          this.playerRoute.unshift(target);
          this.movementWaypoint = sidestep;
          this.routedMovementGoal = this.player.destination;
          this.playerMovementStallSeconds = 0;
          this.playerNavigationRecoveries += 1;
          return;
        }
        // If both short detours are blocked, stop at the last reachable point
        // instead of running forever against a painted foundation.
        this.playerRoute = [];
        this.movementWaypoint = null;
        this.routedMovementGoal = null;
        this.player.destination = null;
        this.playerMovementStallSeconds = 0;
        return;
      }
    } else {
      this.playerMovementStallSeconds = 0;
    }
    if (reached && this.player.destination) {
      if (this.routedMovementGoal === this.player.destination) {
        const nextWaypoint = this.playerRoute.shift() ?? null;
        if (nextWaypoint) {
          this.movementWaypoint = nextWaypoint;
          return;
        }
      }
      this.playerRoute = [];
      this.movementWaypoint = null;
      this.routedMovementGoal = null;
      this.player.destination = null;
      this.playerMovementStallSeconds = 0;
      this.playerNavigationRecoveries = 0;
    }
  }

  private findNavigationSidestep(target: Vec2): Vec2 | null {
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return null;
    const forward = { x: dx / distance, y: dy / distance };
    const side = { x: -forward.y, y: forward.x };
    for (const offset of [76, -76, 112, -112]) {
      const candidate = this.clampToField({
        x: this.player.x + side.x * offset + forward.x * 24,
        y: this.player.y + side.y * offset + forward.y * 24,
      });
      if (!this.isPointClearOfObstacles(candidate, PLAYER_COLLISION_RADIUS, this.activeCollisionObstacles())) continue;
      if (!this.isTravelSegmentClear(this.player, candidate, PLAYER_COLLISION_RADIUS)) continue;
      return candidate;
    }
    return null;
  }

  private moveGhostPlayerToward(target: Vec2, speed: number, dt: number): void {
    const previous = { x: this.player.x, y: this.player.y };
    const reached = this.moveEntityToward(this.player, target, speed, dt, 4);
    const origin = REGION_ORIGINS[this.region];
    this.player.x = Math.max(origin.x + 34, Math.min(origin.x + MAP_WIDTH - 34, this.player.x));
    this.player.y = Math.max(origin.y + 34, Math.min(origin.y + MAP_HEIGHT - 34, this.player.y));
    const movedX = this.player.x - previous.x;
    const movedY = this.player.y - previous.y;
    if (Math.hypot(movedX, movedY) > 0.01) this.player.facing = Math.atan2(movedY, movedX);
    if (!reached) return;
    this.playerRoute = [];
    this.movementWaypoint = null;
    this.routedMovementGoal = null;
    this.player.destination = null;
  }

  private buildUlleungTravelRoute(destination: Vec2): Vec2[] {
    const route: Vec2[] = [];
    const deltaY = destination.y - this.player.y;
    const distanceY = Math.abs(deltaY);
    const direction = Math.sign(deltaY);
    const waypointSpacing = 56;
    const waypointCount = Math.floor(distanceY / waypointSpacing);
    let previous = { x: this.player.x, y: this.player.y };

    for (let index = 1; index <= waypointCount; index += 1) {
      const travelled = Math.min(distanceY, index * waypointSpacing);
      const y = this.player.y + direction * travelled;
      const remaining = Math.abs(destination.y - y);
      if (remaining < 44) break;
      const roadX = ulleungRoadCenterAtY(y);
      const bounds = ulleungWalkableBoundsAt(ulleungRegionAtY(y), y);
      const progress = travelled / Math.max(1, distanceY);
      const directX = this.player.x + (destination.x - this.player.x) * progress;
      const smoothStep = (value: number) => {
        const clamped = Math.max(0, Math.min(1, value));
        return clamped * clamped * (3 - 2 * clamped);
      };
      const roadWeight = Math.min(
        smoothStep(travelled / 230),
        smoothStep(remaining / 210),
      );
      const centeredX = directX + (roadX - directX) * roadWeight;
      const clampX = (x: number) => Math.max(bounds.left + 24, Math.min(bounds.right - 24, x));
      const candidateXs = [
        centeredX,
        previous.x,
        roadX,
        roadX - 64,
        roadX + 64,
        roadX - 128,
        roadX + 128,
        roadX - 196,
        roadX + 196,
      ].map(clampX).filter((x, candidateIndex, values) =>
        values.findIndex((value) => Math.abs(value - x) < 0.5) === candidateIndex);
      const candidates = candidateXs
        .map((x) => ({ x, y }))
        .filter((candidate) => this.isRoutePointClear(candidate, 24)
          && this.isTravelSegmentClear(previous, candidate, 20))
        .sort((left, right) => {
          const leftScore = Math.abs(left.x - centeredX) + Math.abs(left.x - previous.x) * 0.28;
          const rightScore = Math.abs(right.x - centeredX) + Math.abs(right.x - previous.x) * 0.28;
          return leftScore - rightScore;
        });
      const selected = candidates[0] ?? candidateXs
        .map((x) => ({ x, y }))
        .find((candidate) => this.isRoutePointClear(candidate, 24));
      if (!selected) continue;
      route.push(selected);
      previous = selected;
    }
    route.push(destination);
    return route;
  }

  private isRoutePointClear(point: Vec2, bodyRadius: number): boolean {
    return this.isPointClearOfObstacles(point, bodyRadius, this.collisionObstacles());
  }

  private isPointClearOfObstacles(
    point: Vec2,
    bodyRadius: number,
    obstacles: readonly FieldObstacle[],
  ): boolean {
    for (const obstacle of obstacles) {
      if (obstacle.type === 'box') {
        if (Math.abs(point.x - obstacle.x) < obstacle.width / 2 + bodyRadius
          && Math.abs(point.y - obstacle.y) < obstacle.height / 2 + bodyRadius) return false;
        continue;
      }
      if (Math.hypot(point.x - obstacle.x, point.y - obstacle.y) < obstacle.radius + bodyRadius) return false;
    }
    return true;
  }

  private ulleungRegionFromPosition(y: number): RegionId {
    const candidate = ulleungRegionAtY(y);
    if (!isUlleungRegion(this.region) || candidate === this.region) return candidate;
    const passage = ULLEUNG_PASSAGES.find(({ upper, lower }) =>
      (upper === this.region && lower === candidate) || (lower === this.region && upper === candidate));
    if (!passage) return candidate;
    const boundary = passage.y + passage.height / 2;
    const hysteresis = 36;
    if (candidate === passage.lower && y < boundary + hysteresis) return this.region;
    if (candidate === passage.upper && y >= boundary - hysteresis) return this.region;
    return candidate;
  }

  private momentumSpeed(baseSpeed: number): number {
    return this.player.momentumActive > 0 ? baseSpeed * 1.18 : baseSpeed;
  }

  private gainMomentum(amount: number): void {
    if (this.player.momentumActive > 0) return;
    this.player.momentum = Math.min(100, this.player.momentum + amount);
    if (this.player.momentum < 100) return;
    this.player.momentum = 100;
    this.player.momentumActive = 7;
    this.player.comboTimer = 0;
    this.events.push({ type: 'momentum-burst', duration: 7 });
  }

  private moveEntityToward(entity: Vec2, target: Vec2, speed: number, dt: number, stopDistance: number): boolean {
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= stopDistance) return true;
    const travel = Math.min(distance - stopDistance, speed * dt);
    entity.x += (dx / distance) * travel;
    entity.y += (dy / distance) * travel;
    return distance - travel <= stopDistance;
  }

  private clampPlayerPoint(point: Vec2): Vec2 {
    const clamped = this.clampToField(point);
    // A click can land in the neighbouring island map while the active
    // collision slice still belongs to the current map. Resolve that target
    // against the complete island obstacle set up front so it cannot become an
    // unreachable destination after the region handoff.
    const obstacles = isUlleungRegion(this.region)
      ? this.collisionObstacles()
      : this.activeCollisionObstacles();
    this.resolveObstacleCollision(clamped, PLAYER_COLLISION_RADIUS, obstacles);
    const bounded = this.clampToField(clamped);
    if (this.isPointClearOfObstacles(bounded, PLAYER_COLLISION_RADIUS, obstacles)) return bounded;

    // Clamping after collision resolution can otherwise push a corrected
    // target back inside a foundation at a map edge. Project it to the last
    // clear point on the player's actual travel segment instead.
    return this.traceWalkableTravelWithRadius(this.player, bounded, PLAYER_COLLISION_RADIUS);
  }

  private isTravelSegmentClear(from: Vec2, desired: Vec2, bodyRadius: number): boolean {
    const traced = this.traceWalkableTravelWithRadius(from, desired, bodyRadius);
    return Math.hypot(traced.x - desired.x, traced.y - desired.y) <= 1;
  }

  private traceWalkableTravel(from: Vec2, desired: Vec2): Vec2 {
    return this.traceWalkableTravelWithRadius(from, desired, 20);
  }

  private traceWalkableTravelWithRadius(from: Vec2, desired: Vec2, bodyRadius: number): Vec2 {
    const clampedDestination = this.clampToField(desired);
    const distance = Math.hypot(clampedDestination.x - from.x, clampedDestination.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 12));
    let last = { ...from };
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const candidate = {
        x: from.x + (clampedDestination.x - from.x) * progress,
        y: from.y + (clampedDestination.y - from.y) * progress,
      };
      const bounded = this.clampToField(candidate);
      if (Math.hypot(bounded.x - candidate.x, bounded.y - candidate.y) > 0.5) break;
      if (!this.isRoutePointClear(bounded, bodyRadius)) break;
      last = bounded;
    }
    return last;
  }

  private resolveObstacleCollision(
    entity: Vec2,
    bodyRadius: number,
    obstacles: readonly FieldObstacle[] = this.activeCollisionObstacles(),
  ): boolean {
    let collided = false;
    // A push from one footprint can enter a neighbouring tree root or wall
    // segment. Two short passes settle those compound silhouettes without
    // letting fast movement tunnel onto painted scenery.
    for (let pass = 0; pass < 2; pass += 1) {
      for (const obstacle of obstacles) {
        if (obstacle.type === 'box') {
          const halfWidth = obstacle.width / 2 + bodyRadius;
          const halfHeight = obstacle.height / 2 + bodyRadius;
          const localX = entity.x - obstacle.x;
          const localY = entity.y - obstacle.y;
          if (Math.abs(localX) >= halfWidth || Math.abs(localY) >= halfHeight) continue;
          collided = true;
          const overlapX = halfWidth - Math.abs(localX);
          const overlapY = halfHeight - Math.abs(localY);
          if (overlapX < overlapY) entity.x = obstacle.x + (localX < 0 ? -halfWidth : halfWidth);
          else entity.y = obstacle.y + (localY < 0 ? -halfHeight : halfHeight);
          continue;
        }
        let dx = entity.x - obstacle.x;
        let dy = entity.y - obstacle.y;
        let distance = Math.hypot(dx, dy);
        const minimumDistance = obstacle.radius + bodyRadius;
        if (distance >= minimumDistance) continue;
        collided = true;
        if (distance < 0.001) {
          dx = 0;
          dy = 1;
          distance = 1;
        }
        entity.x = obstacle.x + (dx / distance) * minimumDistance;
        entity.y = obstacle.y + (dy / distance) * minimumDistance;
      }
    }
    return collided;
  }

  private collisionObstacleStateKey(): string {
    const refugeStage = isRoyalRefugeRegion(this.region)
      ? `${this.royalRefugeState.routeId ?? 'none'}:${this.royalRefugeState.activeStageIndex ?? 'none'}:${this.royalRefugeState.finalDefenseComplete ? 1 : 0}`
      : 'none';
    return [
      this.region,
      this.dungeonFloor,
      this.dungeonObstacles.length,
      this.hajinSouthwardMarch ? 1 : 0,
      this.isJurchenUnified() ? 1 : 0,
      isJurchenExpansionRegion(this.region) && this.jurchenCleared.has(this.region) ? 1 : 0,
      isPyongyangRegion(this.region) && this.pyongyangCleared.has(this.region) ? 1 : 0,
      refugeStage,
    ].join('|');
  }

  private collisionObstacles(): readonly FieldObstacle[] {
    const cacheKey = this.collisionObstacleStateKey();
    if (cacheKey === this.obstacleCacheKey) return this.obstacleCache;
    const obstacles: FieldObstacle[] = [...FIELD_OBSTACLES, ...this.dungeonObstacles];
    if (this.region === 'jurchenvillage' && this.isFrontierArcher() && !this.isJurchenUnified()) {
      const origin = REGION_ORIGINS.jurchenvillage;
      obstacles.push({
        type: 'box',
        x: origin.x + 768,
        y: origin.y + 930,
        width: 300,
        height: 86,
      });
    }
    if (isJurchenExpansionRegion(this.region) && !this.jurchenCleared.has(this.region)) {
      const origin = REGION_ORIGINS[this.region];
      obstacles.push({
        type: 'box',
        x: origin.x + 768,
        y: origin.y + 104,
        width: 300,
        height: 86,
      });
    }
    if (this.region === 'manchufrontier' && this.isFrontierArcher() && !this.hajinSouthwardMarch) {
      const origin = REGION_ORIGINS.manchufrontier;
      obstacles.push({
        type: 'box',
        x: origin.x + 768,
        y: origin.y + 795,
        width: 300,
        height: 86,
      });
    }
    if (isPyongyangRegion(this.region) && !this.pyongyangCleared.has(this.region)) {
      const origin = REGION_ORIGINS[this.region];
      obstacles.push({
        type: 'box',
        x: origin.x + 768,
        y: origin.y + (this.isFrontierArcher() ? 920 : 104),
        width: 300,
        height: 86,
      });
    }
    if (isRoyalRefugeRegion(this.region)
      && this.royalRefugeState.routeId === this.region
      && !this.royalRefugeState.finalDefenseComplete) {
      const origin = REGION_ORIGINS[this.region];
      const stageIndex = this.royalRefugeState.activeStageIndex ?? 0;
      if (stageIndex <= 0) {
        obstacles.push({
          type: 'box',
          x: origin.x + 768,
          y: origin.y + 690,
          width: 336,
          height: 68,
        });
      }
      if (stageIndex <= 1) {
        obstacles.push({
          type: 'box',
          x: origin.x + 768,
          y: origin.y + 420,
          width: 336,
          height: 68,
        });
      }
    }
    this.obstacleCacheKey = cacheKey;
    this.obstacleCache = obstacles;
    return this.obstacleCache;
  }

  private activeCollisionObstacles(): readonly FieldObstacle[] {
    const cacheKey = this.collisionObstacleStateKey();
    if (cacheKey === this.activeObstacleCacheKey) return this.activeObstacleCache;
    const origin = REGION_ORIGINS[this.region];
    const horizontalMargin = 190;
    const verticalMargin = isUlleungRegion(this.region) ? 420 : 190;
    const minimumX = origin.x - horizontalMargin;
    const maximumX = origin.x + MAP_WIDTH + horizontalMargin;
    const minimumY = origin.y - verticalMargin;
    const maximumY = origin.y + MAP_HEIGHT + verticalMargin;
    this.activeObstacleCache = this.collisionObstacles().filter((obstacle) => {
      const halfWidth = obstacle.type === 'box' ? obstacle.width / 2 : obstacle.radius;
      const halfHeight = obstacle.type === 'box' ? obstacle.height / 2 : obstacle.radius;
      return obstacle.x + halfWidth >= minimumX
        && obstacle.x - halfWidth <= maximumX
        && obstacle.y + halfHeight >= minimumY
        && obstacle.y - halfHeight <= maximumY;
    });
    this.activeObstacleCacheKey = cacheKey;
    return this.activeObstacleCache;
  }

  private isWithinWorldSeamLane(
    point: Vec2,
    edge: 'north' | 'south' | 'west' | 'east',
    bodyRadius = PLAYER_COLLISION_RADIUS,
  ): boolean {
    const seam = continuousWorldEdge(this.region, edge);
    if (!seam) return false;
    const origin = REGION_ORIGINS[this.region];
    const lane = seam.from === this.region ? seam.fromLane : seam.toLane;
    const crossAxis = edge === 'west' || edge === 'east'
      ? point.y - origin.y
      : point.x - origin.x;
    // WORLD_TERRAIN_SEAMS describes the visible road width. Subtract the body
    // radius so the whole player stays on that road while crossing the seam.
    const halfWidth = Math.max(24, seam.roadWidth / 2 - bodyRadius);
    return Math.abs(crossAxis - lane) <= halfWidth;
  }

  private clampToField(point: Vec2): Vec2 {
    const villageGateTop = VILLAGE_TOP + 390;
    const villageGateBottom = VILLAGE_TOP + 570;
    const southGateLeft = 630;
    const southGateRight = 910;
    const withinHorizontalSeam = (
      seam: ReturnType<typeof continuousWorldEdge>,
      originY: number,
    ): boolean => {
      if (!seam || seam.orientation !== 'horizontal') return false;
      const lane = seam.from === this.region ? seam.fromLane : seam.toLane;
      const shoulder = seam.roadWidth / 2 + 18;
      return point.y >= originY + lane - shoulder
        && point.y <= originY + lane + shoulder;
    };

    if (isJapanRegion(this.region)) {
      const origin = REGION_ORIGINS[this.region];
      const centerGate = point.x >= origin.x + 590 && point.x <= origin.x + 946;
      const northOpen = centerGate && Boolean(
        continuousWorldEdge(this.region, 'north')
        || worldTravelConnectionAtEdge(this.region, 'north'),
      );
      const southOpen = centerGate && Boolean(
        continuousWorldEdge(this.region, 'south')
        || worldTravelConnectionAtEdge(this.region, 'south'),
      );
      return {
        x: Math.max(origin.x + 110, Math.min(origin.x + MAP_WIDTH - 110, point.x)),
        y: Math.max(northOpen ? origin.y - 14 : origin.y + 110,
          Math.min(southOpen ? origin.y + MAP_HEIGHT + 14 : origin.y + MAP_HEIGHT - 80, point.y)),
      };
    }

    if (isJoseonTownRegion(this.region)) {
      const origin = REGION_ORIGINS[this.region];
      const layout = JOSEON_TOWN_LAYOUTS[this.region];
      const northGate = layout.gates.find((gate) => gate.edge === 'north');
      const southGate = layout.gates.find((gate) => gate.edge === 'south');
      const withinGate = (gate: typeof northGate): boolean => Boolean(
        gate
        && point.x >= origin.x + gate.x - gate.width / 2
        && point.x <= origin.x + gate.x + gate.width / 2,
      );
      const northOpen = withinGate(northGate);
      const southOpen = withinGate(southGate);
      const northAtWorldEdge = northOpen && (northGate?.y ?? 0) <= 100;
      const southAtWorldEdge = southOpen && (southGate?.y ?? MAP_HEIGHT) >= MAP_HEIGHT - 100;
      return {
        x: Math.max(origin.x + 110, Math.min(origin.x + MAP_WIDTH - 110, point.x)),
        y: Math.max(
          northAtWorldEdge ? origin.y - 14 : northOpen ? origin.y + 60 : origin.y + 110,
          Math.min(
            southAtWorldEdge
              ? origin.y + MAP_HEIGHT + 14
              : southOpen
                ? origin.y + MAP_HEIGHT - 42
                : origin.y + MAP_HEIGHT - 80,
            point.y,
          ),
        ),
      };
    }

    if (this.region === 'busanjin' || this.region === 'tangeumdae'
      || this.region === 'gyeongbokgate' || this.region === 'gyeongbokcourt'
      || this.region === 'gyeongbokinner' || this.region === 'jurchenvillage'
      || this.region === 'manchufrontier'
      || isJurchenRegion(this.region)
      || isRoyalRefugeRegion(this.region)
      || isPyongyangRegion(this.region)
      || isEpisode2Region(this.region)) {
      const origin = REGION_ORIGINS[this.region];
      const centerGate = point.x >= origin.x + 590 && point.x <= origin.x + 946;
      const northOpen = centerGate && Boolean(continuousWorldEdge(this.region, 'north'));
      const southOpen = centerGate && Boolean(continuousWorldEdge(this.region, 'south'));
      return {
        x: Math.max(origin.x + 110, Math.min(origin.x + MAP_WIDTH - 110, point.x)),
        y: Math.max(northOpen ? origin.y - 14 : centerGate ? origin.y + 60 : origin.y + 110,
          Math.min(
            southOpen
              ? origin.y + MAP_HEIGHT + 14
              : centerGate
                ? origin.y + MAP_HEIGHT - 42
                : origin.y + MAP_HEIGHT - 80,
            point.y,
          )),
      };
    }

    if (this.region === 'jeonjufield') {
      const origin = REGION_ORIGINS.jeonjufield;
      const northGate = point.x >= REGION_ORIGINS.jeonjufield.x + 620
        && point.x <= REGION_ORIGINS.jeonjufield.x + 916;
      const eastOpen = withinHorizontalSeam(
        continuousWorldEdge('jeonjufield', 'east'),
        origin.y,
      );
      return {
        x: Math.max(
          origin.x + 110,
          Math.min(eastOpen ? origin.x + MAP_WIDTH + 14 : origin.x + MAP_WIDTH - 110, point.x),
        ),
        y: Math.max(northGate ? REGION_ORIGINS.jeonjugate.y + MAP_HEIGHT - 20 : REGION_ORIGINS.jeonjufield.y + 110,
          Math.min(REGION_ORIGINS.jeonjufield.y + MAP_HEIGHT - 80, point.y)),
      };
    }
    if (this.region === 'jeonjugate') {
      const centerGate = point.x >= REGION_ORIGINS.jeonjugate.x + 620
        && point.x <= REGION_ORIGINS.jeonjugate.x + 916;
      return {
        x: Math.max(REGION_ORIGINS.jeonjugate.x + 110, Math.min(REGION_ORIGINS.jeonjugate.x + MAP_WIDTH - 110, point.x)),
        y: Math.max(centerGate ? REGION_ORIGINS.jeonju.y + MAP_HEIGHT - 20 : REGION_ORIGINS.jeonjugate.y + 110,
          Math.min(centerGate ? REGION_ORIGINS.jeonjufield.y + 20 : REGION_ORIGINS.jeonjugate.y + MAP_HEIGHT - 80, point.y)),
      };
    }
    if (this.region === 'jeonju') {
      const southGate = point.x >= REGION_ORIGINS.jeonju.x + 620
        && point.x <= REGION_ORIGINS.jeonju.x + 916;
      const westGate = point.y >= REGION_ORIGINS.jeonju.y + 360
        && point.y <= REGION_ORIGINS.jeonju.y + 660;
      return {
        x: Math.max(westGate ? REGION_ORIGINS.jeonju.x + 60 : REGION_ORIGINS.jeonju.x + 110,
          Math.min(REGION_ORIGINS.jeonju.x + MAP_WIDTH - 110, point.x)),
        y: Math.max(REGION_ORIGINS.jeonju.y + 110,
          Math.min(southGate ? REGION_ORIGINS.jeonjugate.y + 20 : REGION_ORIGINS.jeonju.y + MAP_HEIGHT - 80, point.y)),
      };
    }
    if (this.region === 'yeongwol') {
      const origin = REGION_ORIGINS.yeongwol;
      const gateOpen = point.x >= REGION_ORIGINS.yeongwol.x + 640
        && point.x <= REGION_ORIGINS.yeongwol.x + 896;
      const westRoadOpen = withinHorizontalSeam(
        continuousWorldEdge('yeongwol', 'west'),
        origin.y,
      );
      const eastRoadOpen = withinHorizontalSeam(
        continuousWorldEdge('yeongwol', 'east'),
        origin.y,
      );
      return {
        x: Math.max(
          westRoadOpen ? origin.x - 14 : origin.x + 150,
          Math.min(eastRoadOpen ? origin.x + MAP_WIDTH + 14 : origin.x + MAP_WIDTH - 150, point.x),
        ),
        y: Math.max(gateOpen ? REGION_ORIGINS.yeongwol.y - 20 : REGION_ORIGINS.yeongwol.y + 110,
          Math.min(REGION_ORIGINS.yeongwol.y + MAP_HEIGHT - 80, point.y)),
      };
    }
    if (this.region === 'yeongwolhq') {
      const gateOpen = point.x >= REGION_ORIGINS.yeongwolhq.x + 640
        && point.x <= REGION_ORIGINS.yeongwolhq.x + 896;
      return {
        x: Math.max(REGION_ORIGINS.yeongwolhq.x + 150, Math.min(REGION_ORIGINS.yeongwolhq.x + MAP_WIDTH - 150, point.x)),
        y: Math.max(REGION_ORIGINS.yeongwolhq.y + 110,
          Math.min(gateOpen ? REGION_ORIGINS.yeongwol.y + 20 : REGION_ORIGINS.yeongwolhq.y + MAP_HEIGHT - 80, point.y)),
      };
    }
    if (this.region === 'mistwood') {
      const origin = REGION_ORIGINS.mistwood;
      const westOpen = withinHorizontalSeam(
        continuousWorldEdge('mistwood', 'west'),
        origin.y,
      );
      const eastOpen = this.isWithinWorldSeamLane(point, 'east');
      return {
        x: Math.max(
          westOpen ? origin.x - 14 : origin.x + 230,
          Math.min(eastOpen ? origin.x + MAP_WIDTH + 14 : origin.x + MAP_WIDTH - PLAYER_COLLISION_RADIUS, point.x),
        ),
        y: Math.max(origin.y + 230, Math.min(origin.y + MAP_HEIGHT - 174, point.y)),
      };
    }
    if (this.region === 'village') {
      const origin = REGION_ORIGINS.village;
      const westOpen = this.isWithinWorldSeamLane(point, 'west');
      const eastOpen = this.isWithinWorldSeamLane(point, 'east');
      const southOpen = this.isWithinWorldSeamLane(point, 'south');
      return {
        x: Math.max(
          westOpen ? origin.x - 14 : origin.x + PLAYER_COLLISION_RADIUS,
          Math.min(eastOpen ? origin.x + MAP_WIDTH + 14 : origin.x + MAP_WIDTH - PLAYER_COLLISION_RADIUS, point.x),
        ),
        y: Math.max(
          250,
          Math.min(southOpen ? CENTRAL_WORLD_HEIGHT + 14 : CENTRAL_WORLD_HEIGHT - PLAYER_COLLISION_RADIUS, point.y),
        ),
      };
    }
    if (this.region === 'minepass') {
      const origin = REGION_ORIGINS.minepass;
      const westOpen = this.isWithinWorldSeamLane(point, 'west');
      return {
        x: Math.max(
          westOpen ? origin.x - 14 : origin.x + PLAYER_COLLISION_RADIUS,
          Math.min(origin.x + MAP_WIDTH - 230, point.x),
        ),
        y: Math.max(origin.y + 230, Math.min(origin.y + MAP_HEIGHT - 174, point.y)),
      };
    }
    if (this.region === 'moonfield') {
      const origin = REGION_ORIGINS.moonfield;
      const northOpen = this.isWithinWorldSeamLane(point, 'north');
      return {
        x: Math.max(origin.x + 230, Math.min(origin.x + MAP_WIDTH - 226, point.x)),
        y: Math.max(
          northOpen ? origin.y - 14 : origin.y + PLAYER_COLLISION_RADIUS,
          Math.min(origin.y + MAP_HEIGHT - 174, point.y),
        ),
      };
    }
    if (isUlleungRegion(this.region) || point.x >= MAP_WIDTH * 3) {
      const worldNorth = ULLEUNG_WORLD_BOUNDS.y + 130;
      const worldSouth = ULLEUNG_WORLD_BOUNDS.y + ULLEUNG_WORLD_BOUNDS.height - 80;
      let northernLimit = worldNorth;
      let southernLimit = this.region !== 'ulleungvillage' && !this.canEnterUlleungGovernment()
        ? REGION_ORIGINS.ulleungdo.y + 840
        : worldSouth;
      if (!this.prisonGateOpen) {
        const prisonGateY = REGION_ORIGINS.ulleungdo.y + 130;
        const gateSideGap = 24;
        if (this.player.y < prisonGateY) {
          // Approaching from the ridge: stop on the outside of the locked gate
          // instead of switching region and snapping hundreds of pixels into
          // the prison courtyard.
          southernLimit = Math.min(southernLimit, prisonGateY - gateSideGap);
        } else {
          // Opening story: keep the prisoner on the courtyard side until all
          // six guards are defeated.
          northernLimit = Math.max(northernLimit, prisonGateY + gateSideGap);
        }
      }
      const y = Math.max(northernLimit, Math.min(southernLimit, point.y));
      const islandRegion = ulleungRegionAtY(y);
      const bounds = ulleungWalkableBoundsAt(islandRegion, y);
      return {
        x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
        y,
      };
    }
    if (point.x < 0) {
      const westGateTop = VILLAGE_TOP + 390;
      const westGateBottom = VILLAGE_TOP + 570;
      const westLimit = point.y >= westGateTop && point.y <= westGateBottom ? -MAP_WIDTH - 20 : -MAP_WIDTH + 230;
      return {
        x: Math.max(westLimit, Math.min(0, point.x)),
        y: Math.max(VILLAGE_TOP + 230, Math.min(VILLAGE_TOP + MAP_HEIGHT - 174, point.y)),
      };
    }
    if (point.x > MAP_WIDTH * 2) {
      return {
        x: Math.max(MAP_WIDTH * 2 + 230, Math.min(MAP_WIDTH * 3 - 230, point.x)),
        y: Math.max(235, Math.min(865, point.y)),
      };
    }
    if (point.x > MAP_WIDTH) {
      return {
        x: Math.max(MAP_WIDTH, Math.min(MAP_WIDTH * 2 - 230, point.x)),
        y: Math.max(VILLAGE_TOP + 230, Math.min(VILLAGE_TOP + MAP_HEIGHT - 174, point.y)),
      };
    }
    if (point.y >= CENTRAL_WORLD_HEIGHT) {
      return {
        x: Math.max(230, Math.min(1310, point.x)),
        y: Math.max(CENTRAL_WORLD_HEIGHT, Math.min(CENTRAL_WORLD_HEIGHT + MAP_HEIGHT - 174, point.y)),
      };
    }

    let x = Math.max(230, Math.min(1310, point.x));
    let y = Math.max(250, Math.min(CENTRAL_WORLD_HEIGHT, point.y));
    if (point.x < 230 && y >= villageGateTop && y <= villageGateBottom) x = Math.max(0, point.x);
    if (point.x > 1310 && y >= villageGateTop && y <= villageGateBottom) x = Math.min(MAP_WIDTH, point.x);
    if (point.y > VILLAGE_TOP + 846 && x >= southGateLeft && x <= southGateRight) y = Math.min(CENTRAL_WORLD_HEIGHT, point.y);
    return { x, y };
  }

  private distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
