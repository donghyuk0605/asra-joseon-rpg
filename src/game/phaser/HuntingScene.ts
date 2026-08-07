import Phaser from 'phaser';
import { ASSETS, MONSTER_FRAME, PLAYER_ACTION_FRAME } from '../assets/manifest';
import { ITEM_CATALOG, type ItemDefinition } from '../items/catalog';
import { GameSimulation } from '../simulation/GameSimulation';
import type {
  BasicAttackStep, FollowerState, GameEvent, GroundDrop, ItemId, LandmarkId, MonsterAiState, MonsterKind, MonsterState,
  PlayerOrigin, SkillId, WeaponElement,
} from '../simulation/types';
import { Hud, type QuestProgress, type StoryProgress } from '../ui/Hud';
import { withObjectParticle } from '../ui/koreanGrammar';
import { directionToFrame } from './direction';
import { CombatAudio } from './CombatAudio';
import { resolvePlayerLayers, resolvePlayerVisualMovement } from './playerVisualMode';
import {
  frameForPlayerLayer,
  playerFrameState,
  weaponAttachmentForFrame,
  weaponImpactColumnForRow,
} from './playerLayerState';
import { resolvePlayerAttackVisual, resolvePlayerMovementVisual } from './playerAttackVisual';
import { isPointBehindOccluder } from './buildingOcclusion';
import { monsterScaleForRegion } from './pyongyangSoldierScale';
import { ARCHER_ACTIVE_SKILL_IDS, SHAMAN_ACTIVE_SKILL_IDS, SWORD_ACTIVE_SKILL_IDS } from '../skills/catalog';
import { SinglePlayerSave } from '../save/SinglePlayerSave';
import { OnlineClient } from '../online/OnlineClient';
import { db, rtdb } from '../../firebase';
import { PvpRtdbService } from '../online/PvpRtdbService';
import type { OnlinePresence } from '../online/protocol';
import {
  CENTRAL_WORLD_HEIGHT, MAP_HEIGHT, MAP_WIDTH, VILLAGE_TOP,
  WORLD_HEIGHT, WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH, REGION_ORIGINS, ULLEUNG_PASSAGE_HEIGHT,
} from '../world/layout';
import {
  EPISODE2_REGION_IDS,
  REGIONS,
  type JapanRegionId,
  type JoseonTownRegionId,
  type RegionId,
} from '../world/regions';
import { isJapanRegion, JAPAN_REGION_IDS, JAPAN_STAGE_COPY } from '../world/japanCampaign';
import {
  JAPAN_DOCK_X_INSET,
  JAPAN_DOCK_Y_BY_REGION,
  JAPAN_EXPANSION_LAYOUTS,
  JAPAN_EXPANSION_REGION_IDS,
  JAPAN_SHORELINE_SAMPLES,
  japanShorelineWidthAtY,
  type JapanExpansionPropKind,
} from '../world/japanExpansion';
import {
  isJurchenRegion,
  JURCHEN_EXPANSION_REGION_IDS,
  JURCHEN_REGION_IDS,
  JURCHEN_STAGE_COPY,
} from '../world/jurchenCampaign';
import { CAMPAIGN_FIELD_ROUTES } from '../world/fieldRoutes';
import {
  isJurchenStructureKind,
  JURCHEN_EXPANSION_LAYOUTS,
  jurchenStructureFrame,
  type JurchenExpansionPropKind,
} from '../world/jurchenExpansion';
import {
  EXTENDED_REGION_IDS,
  EXTENDED_REGION_LAYOUTS,
  isExtendedRegion,
  type ExtendedRegionPropKind,
} from '../world/extendedRegions';
import {
  isRoyalRefugeRouteId,
  KING_ENCOUNTER_AFTER_PYONGYANG,
  ROYAL_REFUGE_ROUTE_IDS,
  ROYAL_REFUGE_ROUTES,
  type RoyalRefugeRouteId,
} from '../world/royalRefugeCampaign';
import {
  advanceFarmPlotStage,
  FARM_WORK_LABELS,
  VILLAGE_FARMERS,
  VILLAGE_FARM_PLOTS,
  type FarmPlotStage,
  type FarmWorkAction,
} from '../world/villageFarm';
import {
  isUlleungRegion,
  ULLEUNG_REFUGEE_CAMP_LOCAL,
  ULLEUNG_PASSAGES,
  ULLEUNG_REGION_IDS,
  ULLEUNG_ROAD_ANCHORS,
  ULLEUNG_WORLD_BOUNDS,
  ulleungAdjacentEntryPoint,
  ulleungRegionAtY,
  ulleungRoadCenterAtY,
  type UlleungRegionId,
  type UlleungTravelDirection,
} from '../world/ulleungContinuity';
import {
  GWANGHAE_MILITIA_RALLY_POINTS,
  isJoseonTownRegion,
  isGwanghaeMilitiaRallyNpc,
  JOSEON_TOWN_LAYOUTS,
  JOSEON_TOWN_REGION_IDS,
  type GwanghaeCampaignPath,
} from '../world/joseonTowns';
import {
  continuityCameraBoundsForRegion,
  continuityNeighborsForRegion,
  isContinuousWorldNeighbor,
  WORLD_TERRAIN_SEAMS,
  WORLD_TRAVEL_CONNECTIONS,
  type WorldTerrainSeam,
} from '../world/worldContinuity';
import { treeSpeciesFrame, ULLEUNG_EDGE_TREE_SITES, type TreeSpecies } from '../world/treeSpecies';
import { BETA_ROADSIDE_PROP_PLACEMENTS } from '../world/betaRoadsideProps';
import { createExtendedRegionMotion } from './extendedRegionMotion';
import { EPISODE2_REGION_LAYOUTS, isEpisode2Region } from '../world/episode2Regions';
import { createEpisode2RegionWorld } from './episode2RegionMotion';
import { BOSS_CATALOG, bossForFloor } from '../bosses/catalog';
import type { BossId, BossState } from '../bosses/types';
import {
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from '../settings/GameSettings';
import { StoryDirector, type StoryBeat as DirectedStoryBeat } from '../story/StoryDirector';
import {
  completeStoryBeat,
  createStoryBeat,
  hasSeenStoryBeat,
  type StoryBeat as CampaignStoryBeat,
} from '../story/StoryCampaign';

type MonsterView = {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  intentCue: Phaser.GameObjects.Graphics;
  hp: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
  roleLabel?: Phaser.GameObjects.Text;
  baseScale: number;
  lastDustAt: number;
  lastAiState: MonsterAiState | null;
  lastIntentCue: MonsterIntentCue;
  hitFlashUntil: number;
};

type FollowerView = {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  name: Phaser.GameObjects.Text;
  baseScale: number;
};

type BossView = {
  bossId: BossId;
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  hp: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
  baseScale: number;
};

type CorpseView = {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  remainingMs: number;
  fading: boolean;
};

type GroundItemView = {
  beam: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Ellipse;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  phase: number;
};

const GROUND_DROP_RARITY_STYLE: Record<ItemDefinition['rarity'], {
  color: number;
  label: string;
  glyph: string;
  notable: boolean;
}> = {
  낡음: { color: 0x9d9587, label: '#c8c0b2', glyph: '◇', notable: false },
  일반: { color: 0xc2aa75, label: '#ead9b7', glyph: '◆', notable: false },
  희귀: { color: 0xe2b756, label: '#f5d47c', glyph: '✦', notable: true },
  영웅: { color: 0xd86f9a, label: '#ffb3d0', glyph: '✧', notable: true },
};

type RemotePlayerView = {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  name: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  facing: number;
  moving: boolean;
};

type VillageNpcMode = 'armor-only' | 'fully-equipped' | 'guard' | 'commoner' | 'gwanghae' | 'japanese-civilian' | 'oppressed'
  | 'field-ploughman' | 'female-farmer' | 'female-waterer';
type VillageNpcRole = 'patrol' | 'blacksmith' | 'farmer' | 'royal';

type VillageNpcView = {
  id: string;
  name: string;
  dialogue: string;
  role: VillageNpcRole;
  mode: VillageNpcMode;
  tint: number;
  scale: number;
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  rallyMarker?: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  patrol: Array<{ x: number; y: number }>;
  patrolIndex: number;
  speed: number;
  facing: number;
  pauseMs: number;
  actionTimerMs: number;
  farmWork?: FarmWorkAction;
  farmPlotId?: string;
  hammer?: Phaser.GameObjects.Container;
  forgeGlow?: Phaser.GameObjects.Ellipse;
  service?: 'market' | 'forge' | 'inn';
};

type FarmPlotView = {
  id: string;
  stage: FarmPlotStage;
  sprite: Phaser.GameObjects.Sprite;
};

const FARM_PLOT_FRAME_BY_STAGE: Record<FarmPlotStage, number> = {
  furrowed: 0,
  sown: 1,
  growing: 2,
  ripe: 3,
};

const villageNpcTexture = (mode: VillageNpcMode): string => {
  if (mode === 'fully-equipped') return ASSETS.playerFullyEquipped.key;
  if (mode === 'guard') return ASSETS.monsters['ulleung-guard'].key;
  if (mode === 'gwanghae') return ASSETS.gwanghaePrince.key;
  if (mode === 'commoner') return ASSETS.villageCommoner.key;
  if (mode === 'japanese-civilian') return ASSETS.japaneseCivilianWoman.key;
  if (mode === 'oppressed') return ASSETS.ulleungOppressedVillager.key;
  if (mode === 'field-ploughman') return ASSETS.villageFieldPloughman.key;
  if (mode === 'female-farmer') return ASSETS.villageFemaleFarmer.key;
  if (mode === 'female-waterer') return ASSETS.villageFemaleWaterer.key;
  return ASSETS.playerArmorOnly.key;
};

const villageNpcInteractionAnimation = (mode: VillageNpcMode, row: number): string => {
  if (mode === 'gwanghae') return `npc-audience-gwanghae-${row}`;
  if (mode === 'japanese-civilian') return `npc-interact-japanese-civilian-${row}`;
  if (mode === 'commoner') return `npc-work-commoner-${row}`;
  if (mode === 'oppressed') return `npc-attack-oppressed-${row}`;
  return `npc-attack-${mode}-${row}`;
};

type PrologueActor = {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
};

const MONSTER_KINDS: MonsterKind[] = [
  'osaka-overseer', 'osaka-ronin', 'osaka-gunner',
  'ulleung-hare', 'ulleung-water-deer', 'ulleung-sangun', 'ulleung-guard', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain', 'ulleung-magistrate',
  'wako-raider', 'wako-archer', 'wako-captain',
  'yeongwol-swordsman', 'yeongwol-spearman', 'yeongwol-archer', 'yeongwol-shield', 'yeongwol-commander',
  'jeonju-swordsman', 'jeonju-spearman', 'jeonju-archer', 'jeonju-shield', 'jeonju-commander',
  'jeonju-militia-sickle',
  'japanese-sika-deer', 'japanese-wild-boar',
  'japanese-swordsman', 'japanese-spearman', 'japanese-archer', 'japanese-gunner', 'japanese-general', 'japanese-shogun',
  'manchu-lancer', 'manchu-archer', 'manchu-cavalry', 'manchu-captain', 'manchu-chieftain',
  'joseon-border-swordsman', 'joseon-border-spearman', 'joseon-border-archer', 'joseon-border-commander',
  'royal-guard', 'joseon-prince', 'joseon-civilian',
  'korean-gray-wolf',
  'dokkaebi', 'boar', 'bandit', 'bamboo-spirit', 'mine-golem', 'moon-revenant',
  'wonju-bear', 'gangneung-haetae', 'haeju-crane', 'geoje-sea-wraith',
  'episode2-red-fox', 'episode2-mountain-leopard', 'episode2-marsh-wisp', 'episode2-stone-dokkaebi',
];
const MONSTER_SCALE: Record<MonsterKind, number> = {
  'osaka-overseer': 0.51,
  'osaka-ronin': 0.52,
  'osaka-gunner': 0.54,
  'ulleung-hare': 0.48,
  'ulleung-water-deer': 0.48,
  'ulleung-sangun': 0.55,
  'ulleung-guard': 0.51,
  'ulleung-veteran': 0.55,
  'ulleung-archer': 0.54,
  'ulleung-executioner': 0.55,
  'ulleung-captain': 0.57,
  'ulleung-magistrate': 0.47,
  'wako-raider': 0.52,
  'wako-archer': 0.50,
  'wako-captain': 0.57,
  'yeongwol-swordsman': 0.51,
  'yeongwol-spearman': 0.55,
  'yeongwol-archer': 0.54,
  'yeongwol-shield': 0.55,
  'yeongwol-commander': 0.59,
  'jeonju-swordsman': 0.52,
  'jeonju-spearman': 0.56,
  'jeonju-archer': 0.55,
  'jeonju-shield': 0.56,
  'jeonju-commander': 0.61,
  'jeonju-militia-sickle': 0.51,
  'japanese-swordsman': 0.52,
  'japanese-spearman': 0.56,
  'japanese-archer': 0.54,
  'japanese-gunner': 0.52,
  'japanese-general': 0.61,
  'japanese-sika-deer': 0.48,
  'japanese-wild-boar': 0.54,
  'japanese-shogun': 0.64,
  // 인간형 북방 전투원은 원본 시트의 알파 실루엣 높이를 기준으로
  // 약 88~96px 체감 키에 맞춘다. 지휘관만 약 6% 크게 유지한다.
  'manchu-lancer': 0.54,
  'manchu-archer': 0.62,
  'manchu-cavalry': 0.60,
  'manchu-captain': 0.56,
  'manchu-chieftain': 0.72,
  'joseon-border-swordsman': 0.52,
  'joseon-border-spearman': 0.47,
  'joseon-border-archer': 0.62,
  'joseon-border-commander': 0.54,
  'royal-guard': 0.52,
  'joseon-prince': 0.52,
  'joseon-civilian': 0.58,
  'korean-gray-wolf': 0.53,
  dokkaebi: 0.50,
  boar: 0.52,
  bandit: 0.51,
  'bamboo-spirit': 0.50,
  'mine-golem': 0.54,
  'moon-revenant': 0.50,
  'wonju-bear': 0.66,
  'gangneung-haetae': 0.56,
  'haeju-crane': 0.48,
  'geoje-sea-wraith': 0.52,
  'episode2-red-fox': 0.54,
  'episode2-mountain-leopard': 0.59,
  'episode2-marsh-wisp': 0.53,
  'episode2-stone-dokkaebi': 0.58,
};

const MONSTER_TINT: Partial<Record<MonsterKind, number>> = {
  'osaka-overseer': 0x9d8775,
  'osaka-ronin': 0xb58f7b,
  'osaka-gunner': 0x8b8179,
  'ulleung-guard': 0xf2eee3,
  'ulleung-veteran': 0xffffff,
  'ulleung-archer': 0xffffff,
  'ulleung-executioner': 0xb98f84,
  'ulleung-captain': 0xffffff,
  'wako-raider': 0xb79b82,
  'wako-archer': 0x8f7a68,
  'wako-captain': 0x9d5449,
  'yeongwol-swordsman': 0xd9d4c7,
  'yeongwol-spearman': 0xf2f5f3,
  'yeongwol-archer': 0xf4f0e6,
  'yeongwol-shield': 0x8596a3,
  'yeongwol-commander': 0xf5ead5,
  'jeonju-swordsman': 0xc9b9a6,
  'jeonju-spearman': 0xe8eef0,
  'jeonju-archer': 0xece3d5,
  'jeonju-shield': 0x758896,
  'jeonju-commander': 0xf0d7bc,
  'japanese-swordsman': 0xb88775,
  'japanese-spearman': 0xc19a7c,
  'japanese-archer': 0xa87766,
  'japanese-gunner': 0x756861,
  'japanese-general': 0x9c5148,
  'japanese-sika-deer': 0xd8c9a7,
  'japanese-wild-boar': 0x8f7968,
  'japanese-shogun': 0xffffff,
  'manchu-lancer': 0xffffff,
  'manchu-archer': 0xffffff,
  'manchu-cavalry': 0xffffff,
  'manchu-captain': 0xffffff,
  'manchu-chieftain': 0xfff3d2,
  'joseon-border-swordsman': 0xd9ded7,
  'joseon-border-spearman': 0xe8ece7,
  'joseon-border-archer': 0xe7e2d7,
  'joseon-border-commander': 0xf1d9b3,
  'royal-guard': 0xd7c48f,
  'joseon-prince': 0xffffff,
  'joseon-civilian': 0xd6c5a9,
  'wonju-bear': 0x8d705d,
  'gangneung-haetae': 0x8bb2a3,
  'haeju-crane': 0xe3e7d6,
  'geoje-sea-wraith': 0x72a6ad,
  'episode2-marsh-wisp': 0xc2d8df,
  'episode2-stone-dokkaebi': 0xe1d4b7,
};

const COMBAT_CURSOR = `url("${ASSETS.combatCursor.path}") 6 6, crosshair`;
const RANGED_MONSTER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'osaka-gunner', 'ulleung-archer', 'yeongwol-archer', 'jeonju-archer', 'wako-archer',
  'japanese-archer', 'japanese-gunner', 'manchu-archer', 'joseon-border-archer',
  'geoje-sea-wraith',
  'episode2-marsh-wisp',
]);
const isLowQuadrupedMonster = (kind: MonsterKind): boolean => (
  kind === 'boar' || kind === 'japanese-wild-boar' || kind === 'korean-gray-wolf'
  || kind === 'wonju-bear' || kind === 'episode2-red-fox' || kind === 'episode2-mountain-leopard'
);
const isHuntPrey = (kind: MonsterKind): boolean => (
  kind === 'ulleung-hare'
  || kind === 'ulleung-water-deer'
  || kind === 'japanese-sika-deer'
  || kind === 'japanese-wild-boar'
  || kind === 'haeju-crane'
  || kind === 'episode2-red-fox'
);

type MonsterIntentCue =
  | 'none' | 'alert' | 'pursue' | 'flank' | 'telegraph' | 'charge'
  | 'brace' | 'rally' | 'flee' | 'return' | 'stunned';
type MonsterMotion = 'idle' | 'walk' | 'prepare' | 'attack' | 'stunned' | 'death';
type MonsterVisualRole = 'melee' | 'ranged' | 'commander' | 'beast';

type MonsterPresentation = {
  motion: MonsterMotion;
  cue: MonsterIntentCue;
  poseColumn: 0 | 3 | 4;
};

const MONSTER_WALK_STATES: ReadonlySet<MonsterAiState> = new Set([
  'patrol', 'chase', 'circle', 'charge', 'flee', 'return',
]);
const MONSTER_COMMANDER_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-captain', 'ulleung-magistrate', 'wako-captain',
  'yeongwol-commander', 'jeonju-commander', 'japanese-general', 'japanese-shogun',
  'manchu-captain', 'manchu-chieftain', 'joseon-border-commander', 'joseon-prince',
]);
const MONSTER_BEAST_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-hare', 'ulleung-water-deer', 'ulleung-sangun',
  'japanese-sika-deer', 'japanese-wild-boar', 'korean-gray-wolf', 'boar', 'dokkaebi',
  'wonju-bear', 'gangneung-haetae', 'haeju-crane',
  'episode2-red-fox', 'episode2-mountain-leopard',
]);

const monsterVisualRole = (kind: MonsterKind): MonsterVisualRole => {
  if (MONSTER_COMMANDER_KINDS.has(kind)) return 'commander';
  if (RANGED_MONSTER_KINDS.has(kind)) return 'ranged';
  if (MONSTER_BEAST_KINDS.has(kind)) return 'beast';
  return 'melee';
};

const monsterIntentCue = (state: MonsterAiState): MonsterIntentCue => {
  if (state === 'alert') return 'alert';
  if (state === 'chase') return 'pursue';
  if (state === 'circle') return 'flank';
  if (state === 'telegraph') return 'telegraph';
  if (state === 'charge') return 'charge';
  if (state === 'brace') return 'brace';
  if (state === 'rally') return 'rally';
  if (state === 'flee') return 'flee';
  if (state === 'return') return 'return';
  if (state === 'stunned') return 'stunned';
  return 'none';
};

const monsterPresentation = (
  state: MonsterAiState,
  movementSpeed: number,
  alive: boolean,
  hitStun: number,
): MonsterPresentation => {
  if (!alive) return { motion: 'death', cue: 'none', poseColumn: 3 };
  if (state === 'stunned' || hitStun > 0) {
    return { motion: 'stunned', cue: 'stunned', poseColumn: 3 };
  }
  if (state === 'attack') return { motion: 'attack', cue: 'none', poseColumn: 4 };
  if (state === 'telegraph' || state === 'brace' || state === 'rally') {
    return { motion: 'prepare', cue: monsterIntentCue(state), poseColumn: 4 };
  }
  if (MONSTER_WALK_STATES.has(state) && (state === 'charge' || movementSpeed > 5.5)) {
    return { motion: 'walk', cue: monsterIntentCue(state), poseColumn: 0 };
  }
  return { motion: 'idle', cue: monsterIntentCue(state), poseColumn: 0 };
};

const shouldPlayOpeningPrologue = (): boolean => {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get('intro') === '1';
};

const PYONGYANG_REGIONS = ['pyongyangouter', 'pyongyanggate', 'pyongyanginner'] as const satisfies readonly RegionId[];
type PyongyangRegionId = typeof PYONGYANG_REGIONS[number];
const isPyongyangRegion = (region: RegionId): region is PyongyangRegionId => {
  return (PYONGYANG_REGIONS as readonly RegionId[]).includes(region);
};
const isRoyalRefugeRegion = (region: RegionId): region is RoyalRefugeRouteId => {
  return (ROYAL_REFUGE_ROUTE_IDS as readonly RegionId[]).includes(region);
};

const JOSEON_TOWN_TRANSITION_SEAMS = [
  {
    id: 'gaeseong-changdeokgung', from: 'gaeseong', to: 'changdeokgung',
    asset: ASSETS.transitions.joseonGaeseongChangdeokgung, span: 320,
  },
  {
    id: 'changdeokgung-hanseongmarket', from: 'changdeokgung', to: 'hanseongmarket',
    asset: ASSETS.transitions.joseonChangdeokgungUnjongga, span: 320,
  },
  {
    id: 'hanseongmarket-hanseongsouth', from: 'hanseongmarket', to: 'hanseongsouth',
    asset: ASSETS.transitions.joseonUnjonggaSungnyemun, span: 320,
  },
  {
    id: 'hanseongsouth-suwon', from: 'hanseongsouth', to: 'suwon',
    asset: ASSETS.transitions.joseonSungnyemunSuwon, span: 320,
  },
  {
    id: 'suwon-chungju', from: 'suwon', to: 'chungju',
    asset: ASSETS.transitions.joseonSuwonChungju, span: 320,
  },
  {
    id: 'chungju-andong', from: 'chungju', to: 'andong',
    asset: ASSETS.transitions.joseonChungjuAndong, span: 320,
  },
] as const satisfies readonly {
  id: string;
  from: JoseonTownRegionId;
  to: JoseonTownRegionId;
  asset: { key: string; path: string };
  span: number;
}[];

const initialRegionForPlaytest = (): RegionId => {
  if (!import.meta.env.DEV) return 'ulleungdo';
  const requested = new URLSearchParams(window.location.search).get('region') as RegionId | null;
  const available: RegionId[] = ['solgogae', 'village', 'mistwood', 'yeongwol', 'yeongwolhq', 'jeonjufield', 'jeonjugate', 'jeonju',
    ...JAPAN_REGION_IDS, 'busanjin', 'tangeumdae', 'gyeongbokgate', 'gyeongbokcourt', 'gyeongbokinner',
    ...JOSEON_TOWN_REGION_IDS,
    ...JURCHEN_REGION_IDS, 'manchufrontier',
    'pyongyangouter', 'pyongyanggate', 'pyongyanginner',
    ...ROYAL_REFUGE_ROUTE_IDS,
    ...EXTENDED_REGION_IDS,
    ...EPISODE2_REGION_IDS,
    'minepass', 'moonfield', 'dungeon', 'ulleungdo', 'ulleungcoast', 'ulleungmeadow', 'ulleunghunt', 'ulleungridge', 'ulleungvillage'];
  return requested && available.includes(requested) ? requested : 'ulleungdo';
};

const WORLD_FLOOR_DEPTH = -20_000;
const ISLAND_BACKGROUND_DEPTH = -19_000;
const ISLAND_SEAM_DEPTH = -18_990;

const followerTint = (follower: Pick<FollowerState, 'kind' | 'route'>): number => {
  if (follower.route === 'bunjo') return 0xd9d4ba;
  if (follower.route === 'invasion') return 0xc4d2dc;
  if (follower.kind === 'peasant-militia') return 0xd7c79d;
  if (follower.kind === 'government-defector') return 0xc2d2b8;
  return 0xd8c5e8;
};

const followerAccent = (follower: Pick<FollowerState, 'kind' | 'route'>): number => {
  if (follower.route === 'bunjo') return 0x79a5c5;
  if (follower.route === 'invasion') return 0x7898ad;
  return follower.kind === 'special-warrior' ? 0xb99ad9 : 0x78ad72;
};

const PLAYER_SCALE = 0.51;
const HUD_UPDATE_INTERVAL = 80;
const AUTOSAVE_INTERVAL_MS = 10_000;
const AUTOSAVE_AFTER_CHECKPOINT_MS = 1_250;
const SAVE_CHECKPOINT_EVENT_TYPES: ReadonlySet<string> = new Set([
  'monster-killed',
  'monster-respawn',
  'boss-killed',
  'boss-phase-changed',
  'boss-reset',
  'dungeon-floor-changed',
  'dungeon-stair-lock-changed',
  'dungeon-complete',
  'item-drop',
  'item-pickup',
  'item-equipped',
  'potion',
  'enchant-applied',
  'item-crafted',
  'shop-purchase',
  'skill-learned',
  'skill-unlocked',
  'follower-recruited',
  'hajin-reinforcements-called',
  'gwanghae-reinforcements-called',
  'gwanghae-militia-rallied',
  'gwanghae-path-chosen',
  'gwanghae-path-battle-cleared',
  'quest-complete',
  'level-up',
  'hunt-milestone',
  'training-progress',
  'prison-gate-opened',
  'prison-guards-provoked',
  'government-guards-provoked',
  'world-event-started',
  'world-event-progress',
  'world-event-completed',
  'world-event-ended',
  'landmark-discovered',
  'wako-pact-revealed',
  'wako-invasion-started',
  'ulleung-village-liberated',
  'government-dock-guidance',
  'government-dock-used',
  'frontier-opening-defeated',
  'jurchen-stage-cleared',
  'jurchen-tribe-allied',
  'jurchen-unified',
  'frontier-mission-cleared',
  'hajin-warband-formed',
  'hajin-southward-march-started',
  'pyongyang-stage-cleared',
  'royal-refuge-route-selected',
  'royal-refuge-stage-cleared',
  'royal-refuge-final-defense-cleared',
  'osaka-departure-ready',
  'japan-stage-cleared',
  'shogun-phase-changed',
  'shogun-defeated',
  'tangeum-forces-annihilated',
  'player-defeated',
  'player-respawn',
  'region-changed',
]);
const MONSTER_CORPSE_LIFETIME_MS = 30_000;
const MONSTER_CORPSE_FADE_MS = 800;
const MAX_MONSTER_CORPSES = 12;

const MONSTER_CORPSE_POSE: Record<MonsterKind, {
  frame: number;
  angle: number;
  originY: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}> = {
  'osaka-overseer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'osaka-ronin': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.03, scaleY: 0.9 },
  'osaka-gunner': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1.02, scaleY: 0.9 },
  'ulleung-hare': { frame: 14, angle: 12, originY: 0.86, x: 3, y: 10, scaleX: 1.12, scaleY: 0.63 },
  'ulleung-water-deer': { frame: 23, angle: 7, originY: 0.89, x: 5, y: 9, scaleX: 1.08, scaleY: 0.7 },
  'ulleung-sangun': { frame: 23, angle: 5, originY: 0.9, x: 6, y: 9, scaleX: 1.09, scaleY: 0.72 },
  'ulleung-guard': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'ulleung-veteran': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'ulleung-archer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'ulleung-executioner': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.04, scaleY: 0.9 },
  'ulleung-captain': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1.03, scaleY: 0.9 },
  'ulleung-magistrate': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.05, scaleY: 0.9 },
  'wako-raider': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'wako-archer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'wako-captain': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.05, scaleY: 0.9 },
  'yeongwol-swordsman': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'yeongwol-spearman': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.04, scaleY: 0.9 },
  'yeongwol-archer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'yeongwol-shield': { frame: 15, angle: 78, originY: 0.66, x: 1, y: -4, scaleX: 1.06, scaleY: 0.9 },
  'yeongwol-commander': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1.06, scaleY: 0.9 },
  'jeonju-swordsman': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'jeonju-spearman': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.04, scaleY: 0.9 },
  'jeonju-archer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'jeonju-shield': { frame: 15, angle: 78, originY: 0.66, x: 1, y: -4, scaleX: 1.06, scaleY: 0.9 },
  'jeonju-commander': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1.08, scaleY: 0.9 },
  'jeonju-militia-sickle': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'japanese-swordsman': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'japanese-spearman': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.04, scaleY: 0.9 },
  'japanese-archer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'japanese-gunner': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1.02, scaleY: 0.9 },
  'japanese-general': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1.08, scaleY: 0.9 },
  'japanese-sika-deer': { frame: 23, angle: 7, originY: 0.89, x: 5, y: 9, scaleX: 1.08, scaleY: 0.7 },
  'japanese-wild-boar': { frame: 22, angle: 4, originY: 0.9, x: 5, y: 8, scaleX: 1.06, scaleY: 0.72 },
  'japanese-shogun': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1.1, scaleY: 0.9 },
  'manchu-lancer': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.04, scaleY: 0.9 },
  'manchu-archer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'manchu-cavalry': { frame: 15, angle: 66, originY: 0.72, x: 4, y: 0, scaleX: 1.08, scaleY: 0.84 },
  'manchu-captain': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1.08, scaleY: 0.9 },
  'manchu-chieftain': { frame: 15, angle: 70, originY: 0.66, x: 2, y: -4, scaleX: 1.12, scaleY: 0.9 },
  'joseon-border-swordsman': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'joseon-border-spearman': { frame: 15, angle: 74, originY: 0.66, x: 1, y: -4, scaleX: 1.04, scaleY: 0.9 },
  'joseon-border-archer': { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'joseon-border-commander': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1.06, scaleY: 0.9 },
  'royal-guard': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'joseon-prince': { frame: 15, angle: 73, originY: 0.66, x: 1, y: -4, scaleX: 1.03, scaleY: 0.9 },
  'joseon-civilian': { frame: 15, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'korean-gray-wolf': { frame: 22, angle: 4, originY: 0.9, x: 5, y: 8, scaleX: 1.06, scaleY: 0.72 },
  boar: { frame: 22, angle: 4, originY: 0.9, x: 5, y: 8, scaleX: 1.06, scaleY: 0.72 },
  dokkaebi: { frame: 15, angle: 73, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  bandit: { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'bamboo-spirit': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'mine-golem': { frame: 14, angle: 68, originY: 0.68, x: 2, y: -2, scaleX: 1.04, scaleY: 0.86 },
  'moon-revenant': { frame: 15, angle: 78, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'wonju-bear': { frame: 22, angle: 4, originY: 0.9, x: 5, y: 8, scaleX: 1.12, scaleY: 0.72 },
  'gangneung-haetae': { frame: 23, angle: 7, originY: 0.9, x: 5, y: 9, scaleX: 1.1, scaleY: 0.72 },
  'haeju-crane': { frame: 23, angle: 9, originY: 0.9, x: 5, y: 9, scaleX: 0.92, scaleY: 0.7 },
  'geoje-sea-wraith': { frame: 15, angle: 78, originY: 0.66, x: 1, y: -4, scaleX: 1.02, scaleY: 0.9 },
  'episode2-red-fox': { frame: 22, angle: 4, originY: 0.9, x: 5, y: 8, scaleX: 1.06, scaleY: 0.72 },
  'episode2-mountain-leopard': { frame: 22, angle: 4, originY: 0.9, x: 5, y: 8, scaleX: 1.1, scaleY: 0.72 },
  'episode2-marsh-wisp': { frame: 15, angle: 78, originY: 0.66, x: 1, y: -4, scaleX: 1.02, scaleY: 0.9 },
  'episode2-stone-dokkaebi': { frame: 14, angle: 68, originY: 0.68, x: 2, y: -2, scaleX: 1.05, scaleY: 0.86 },
};

export class HuntingScene extends Phaser.Scene {
  private readonly simulation = new GameSimulation(initialRegionForPlaytest());
  private preconfiguredOrigin: PlayerOrigin | null = null;
  private worldBackground!: Phaser.GameObjects.Image;
  private playerRoot!: Phaser.GameObjects.Container;
  private playerActionRoot!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerArmorSprite!: Phaser.GameObjects.Sprite;
  private playerWeaponAura!: Phaser.GameObjects.Image;
  private playerWeaponSprite!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private travelGhostAura: Phaser.GameObjects.Ellipse | null = null;
  private travelGhostCore: Phaser.GameObjects.Ellipse | null = null;
  private destinationMark!: Phaser.GameObjects.Arc;
  private monsterViews = new Map<string, MonsterView>();
  private followerViews = new Map<string, FollowerView>();
  private bossView: BossView | null = null;
  private corpseViews: CorpseView[] = [];
  private groundItemViews = new Map<string, GroundItemView>();
  private remotePlayerViews = new Map<string, RemotePlayerView>();
  private onlineRoster: OnlinePresence[] = [];
  private onlineClient: OnlineClient | null = null;
  private onlinePublishAccumulator = 0;
  private singlePlayerSave: import('../save/SinglePlayerSave').SinglePlayerSave | null = null;
  private saveLifecycleCleanup: (() => void) | null = null;
  private saveReadyForWrites = false;
  private gameMode: 'menu' | 'story' | 'archer' | 'mudang' | 'gwanghae' | 'hunt' | 'travel' | 'online' | 'pvp' = 'menu';
  private pvpRoomId = '';
  private pvpOpponentView: { root: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text; targetX: number; targetY: number; facing: number; moving: boolean } | null = null;
  private pvpOpponentFighterId: string = 'donghyeok';
  private pvpPublishAccumulator = 0;
  private pvpService: PvpRtdbService | null = null;
  private pvpSelfUid = '';
  private autosaveAccumulator = 0;
  private gameSettings = loadGameSettings();
  private saveInFlight = false;
  private saveQueued = false;
  private heavyRenderAccumulator = 0;
  private perfProbeAccumulator = 0;
  private ambientWorldTweens: Array<{ tween: Phaser.Tweens.Tween; region: RegionId | null }> = [];
  private ambientWorldObjects: Array<{
    object: Phaser.GameObjects.GameObject & { visible: boolean; setVisible: (visible: boolean) => unknown };
    region: RegionId | null;
  }> = [];
  private readonly mobileProfile = window.matchMedia('(pointer: coarse)').matches
    || Math.min(window.innerWidth, window.innerHeight) <= 900;
  private villageNpcs: VillageNpcView[] = [];
  private farmPlots = new Map<string, FarmPlotView>();
  private readonly joseonTownBackgrounds = new Map<JoseonTownRegionId, Phaser.GameObjects.Image>();
  private readonly joseonTownBackgroundLoads = new Set<JoseonTownRegionId>();
  private readonly joseonTownRegionsPopulated = new Set<JoseonTownRegionId>();
  private readonly joseonTownPopulationRequests = new Set<JoseonTownRegionId>();
  private readonly joseonTownSeamLoads = new Set<string>();
  private readonly authoredTerrainSeamsCreated = new Set<string>();
  private hud!: Hud;
  private storyDirector: StoryDirector | null = null;
  private activeStoryBeat: CampaignStoryBeat | null = null;
  private storyNarrativeReady = false;
  private attackLock = 0;
  private hitStopMs = 0;
  private skillWorldMotion: {
    skillId: SkillId;
    from: { x: number; y: number };
    to: { x: number; y: number };
    elapsedMs: number;
    durationMs: number;
  } | null = null;
  private skillVisualNonce = 0;
  private playerPreviousWalkFrame = -1;
  private playerDefeated = false;
  private hudAccumulator = HUD_UPDATE_INTERVAL;
  private menuOpen = false;
  private currentRegion: RegionId = 'ulleungdo';
  private cameraRegion: RegionId = this.simulation.region;
  private regionLabel!: Phaser.GameObjects.Text;
  private lastPlayerSimulationPosition = { x: 0, y: 0 };
  private readonly combatAudio = new CombatAudio();
  private bossAssetsReady = false;
  private bossAssetsLoading = false;
  private pendingDungeonEntry: (() => void) | null = null;
  private gameStarted = shouldPlayOpeningPrologue()
    || (import.meta.env.DEV && new URLSearchParams(window.location.search).has('region'));
  private dungeonVisuals: Phaser.GameObjects.GameObject[] = [];
  private prisonGate: Phaser.GameObjects.Container | null = null;
  private trainingTree: Phaser.GameObjects.Image | null = null;
  private governmentDock: {
    glow: Phaser.GameObjects.Ellipse;
    label: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
  } | null = null;
  private frontierSouthGate: Phaser.GameObjects.Image | null = null;
  private japanGatePlaques = new Map<JapanRegionId, {
    ground: Phaser.GameObjects.Image;
    text: Phaser.GameObjects.Text;
    lockedLabel: string;
  }>();
  private frontierSouthGateLabel: Phaser.GameObjects.Text | null = null;
  private readonly pyongyangAdvanceGates = new Map<PyongyangRegionId, {
    root: Phaser.GameObjects.Container;
    doors: Phaser.GameObjects.Rectangle[];
    label: Phaser.GameObjects.Text;
    open: boolean;
  }>();
  private readonly royalRefugeWorlds = new Map<RoyalRefugeRouteId, {
    background: Phaser.GameObjects.Image;
    labels: Phaser.GameObjects.Text[];
    gates: Array<{
      root: Phaser.GameObjects.Container;
      gateImage: Phaser.GameObjects.Image;
      label: Phaser.GameObjects.Text;
    }>;
  }>();
  private royalRefugeLoading: RoyalRefugeRouteId | null = null;
  private royalRefugeDom: HTMLElement | null = null;
  private royalKingPosition: { x: number; y: number } | null = null;
  private mainlandTravelInProgress = false;
  private prologueActive = false;
  private prologueObjects: Phaser.GameObjects.GameObject[] = [];
  private prologueTimers: Phaser.Time.TimerEvent[] = [];
  private prologueDom: HTMLElement | null = null;
  private gwanghaeChoiceDom: HTMLElement | null = null;
  private gwanghaeChoiceReturnFocus: HTMLElement | null = null;
  private readonly occludingStructures: Array<{
    image: Phaser.GameObjects.Image;
    left: number;
    right: number;
    top: number;
    front: number;
    areas?: Array<{ left: number; right: number; top: number; front: number }>;
  }> = [];

  constructor() { super('hunting-ground'); }

  startStoryMode(): void {
    if (this.gameStarted && this.prologueActive) return;
    this.gameStarted = true;
    this.gameMode = 'story';
    this.storyNarrativeReady = false;
    this.resetSinglePlayerSave();
    void this.resumeStoryOrPlayOpening();
  }

  startNewStoryMode(): void {
    if (this.gameStarted && this.prologueActive) return;
    this.gameStarted = true;
    this.gameMode = 'story';
    this.storyNarrativeReady = false;
    this.resetSinglePlayerSave();
    this.enableSaveWrites();
    this.showSavePresence('김동혁 새 여정 · 별도 자동 저장', false);
    this.time.delayedCall(180, () => this.playOpeningPrologue());
  }

  startFreeHunt(): void {
    this.gameStarted = true;
    this.gameMode = 'hunt';
    this.storyNarrativeReady = false;
    this.resetSinglePlayerSave();
    this.enableSaveWrites();
    this.showSavePresence('로컬 사냥 자동 저장', false);
    this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, '아스라 · 울릉의 죄인 김동혁');
  }

  startTravelMode(): void {
    this.gameStarted = true;
    this.gameMode = 'travel';
    this.storyNarrativeReady = false;
    this.prologueActive = false;
    this.resetSinglePlayerSave();
    this.simulation.enableTravelMode();
    this.currentRegion = this.simulation.region;
    this.syncAmbientWorldState(this.simulation.region);
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.releaseInactiveMonsterViews(this.simulation.region);
    this.createTravelGhostVisual();
    for (const object of this.children.list) {
      const input = (object as Phaser.GameObjects.GameObject & { input?: { enabled: boolean } | null }).input;
      if (input) input.enabled = false;
    }
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.fitCamera();
    this.hud.setTravelMode(true);
    this.destinationMark.setStrokeStyle(2, 0x91efff, 0.95);
    this.showSavePresence('유령 여행 · 전투와 기록 없음', false);
    this.time.delayedCall(120, () => this.hud.toggleWorldMap(true));
  }

  private consumePreconfiguredOrigin(origin: PlayerOrigin): boolean {
    if (this.preconfiguredOrigin !== origin) return false;
    this.preconfiguredOrigin = null;
    return true;
  }

  startFrontierArcherStory(): void {
    this.gameStarted = true;
    this.gameMode = 'archer';
    this.prologueActive = false;
    this.resetSinglePlayerSave();
    if (!this.consumePreconfiguredOrigin('frontier-archer')) this.simulation.startFrontierArcherStory();
    this.enableSaveWrites();
    this.currentRegion = this.simulation.region;
    this.syncAmbientWorldState(this.simulation.region);
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.releaseInactiveMonsterViews(this.simulation.region);
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.fitCamera();
    this.showSavePresence('압록 패전 뒤 여진 통합 여정 · 별도 자동 저장', false);
    this.storyNarrativeReady = true;
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('frontierqa') === 'clear') {
      this.time.delayedCall(800, () => this.simulation.completeHajinFrontierMissionForPlaytest());
    }
  }

  continueFrontierArcherStory(): void {
    this.gameStarted = true;
    this.gameMode = 'archer';
    this.storyNarrativeReady = false;
    this.prologueActive = false;
    this.resetSinglePlayerSave();
    if (this.consumePreconfiguredOrigin('frontier-archer')) this.simulation.drainEvents();
    this.showSavePresence('하진 저장 기록 확인 중', false);
    void this.resumeFrontierArcherOrStartNew();
  }

  startOsakaMudangStory(): void {
    this.gameStarted = true;
    this.gameMode = 'mudang';
    this.prologueActive = false;
    this.resetSinglePlayerSave();
    if (!this.consumePreconfiguredOrigin('osaka-mudang')) this.simulation.startOsakaMudangStory();
    this.enableSaveWrites();
    this.currentRegion = this.simulation.region;
    this.syncAmbientWorldState(this.simulation.region);
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.releaseInactiveMonsterViews(this.simulation.region);
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.fitCamera();
    this.showSavePresence('무당 연화 여정 · 별도 자동 저장', false);
    this.storyNarrativeReady = true;
  }

  continueOsakaMudangStory(): void {
    this.gameStarted = true;
    this.gameMode = 'mudang';
    this.storyNarrativeReady = false;
    this.prologueActive = false;
    this.resetSinglePlayerSave();
    if (this.consumePreconfiguredOrigin('osaka-mudang')) this.simulation.drainEvents();
    this.showSavePresence('연화 저장 기록 확인 중', false);
    void this.resumeOsakaMudangOrStartNew();
  }

  startGwanghaeStory(): void {
    this.gameStarted = true;
    this.gameMode = 'gwanghae';
    this.storyNarrativeReady = false;
    this.prologueActive = false;
    this.resetSinglePlayerSave();
    if (!this.consumePreconfiguredOrigin('gwanghae-prince')) this.simulation.startGwanghaeStory();
    this.enableSaveWrites();
    this.currentRegion = this.simulation.region;
    this.ensureJoseonTownNeighborhood('changdeokgung');
    this.syncAmbientWorldState(this.simulation.region);
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.releaseInactiveMonsterViews(this.simulation.region);
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.fitCamera();
    this.showSavePresence('왕세자 광해의 분조록 · 별도 자동 저장', false);
    const gwanghaePlaytest = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get('gwanghaeqa')
      : null;
    if (gwanghaePlaytest === 'route') {
      this.simulation.rallyGwanghaeMilitia('changdeok-secretary');
      this.storyNarrativeReady = true;
    } else if (gwanghaePlaytest === 'choice' && this.simulation.completeGwanghaeRalliesForPlaytest()) {
      this.time.delayedCall(220, () => this.playGwanghaePathChoice());
    } else {
      this.time.delayedCall(220, () => this.playGwanghaeOpeningPrologue());
    }
  }

  continueGwanghaeStory(): void {
    this.gameStarted = true;
    this.gameMode = 'gwanghae';
    this.storyNarrativeReady = false;
    this.prologueActive = false;
    this.resetSinglePlayerSave();
    if (this.consumePreconfiguredOrigin('gwanghae-prince')) this.simulation.drainEvents();
    this.showSavePresence('왕세자 광해의 분조록 확인 중', false);
    void this.resumeGwanghaeOrStartNew();
  }

  startOnlineMode(name: string, url: string): void {
    this.gameStarted = true;
    this.gameMode = 'online';
    this.storyNarrativeReady = false;
    this.resetSinglePlayerSave();
    this.simulation.enterOnlineHuntingField();
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.fitCamera();
    document.querySelector<HTMLElement>('#save-presence')?.setAttribute('hidden', '');
    this.onlineClient?.disconnect();
    this.onlineClient = new OnlineClient({
      url,
      name,
      onRoster: (players) => { this.onlineRoster = players; },
      onStatus: (status, onlineCount) => this.updateOnlineStatus(status, onlineCount),
    });
    this.onlineClient.connect();
    this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, `온라인 울릉 해안 사냥터 · ${name.trim() || '김동혁'}`);
  }

  async startPvpFieldMode(params: {
    roomId: string;
    selfUid: string;
    selfFighterId: string;
    opponentUid: string;
    opponentName: string;
    opponentFighterId: string;
  }): Promise<void> {
    this.gameStarted = true;
    this.gameMode = 'pvp';
    this.pvpRoomId = params.roomId;
    this.pvpSelfUid = params.selfUid;
    this.pvpOpponentFighterId = params.opponentFighterId;
    this.storyNarrativeReady = false;
    this.resetSinglePlayerSave();

    // Load existing character save for PvP to play with raised stats
    try {
      const saveService = await this.getSinglePlayerSave();
      const saved = await saveService.load();
      if (saved) {
        this.simulation.importSinglePlayerSnapshot(saved.snapshot);
      }
    } catch (e) {
      console.warn('Could not load character save for PvP', e);
    }
    
    // Place player at PvP arena spawn
    const playerX = 160;
    const playerY = 300;
    this.simulation.enterOnlineHuntingField();
    this.simulation.player.x = playerX;
    this.simulation.player.y = playerY;
    this.playerRoot.setPosition(playerX, playerY);
    this.lastPlayerSimulationPosition = { x: playerX, y: playerY };
    this.fitCamera();
    document.querySelector<HTMLElement>('#save-presence')?.setAttribute('hidden', '');
    
    this.pvpOpponentView?.root.destroy(true);
    this.pvpOpponentView = null;
    
    // Spawn opponent view
    const oppX = 640;
    const oppY = 300;
    const shadow = this.add.ellipse(0, 5, 58, 18, 0x080807, 0.42);
    const textureKey = this.pvpOpponentFighterId === 'gwanghae' ? ASSETS.gwanghaePrince?.key
      : this.pvpOpponentFighterId === 'yeonhwa' ? ASSETS.osakaMudang?.key
      : this.pvpOpponentFighterId === 'hajin' ? ASSETS.frontierArcher?.key
      : ASSETS.playerUnequipped.key;
    const sprite = this.add.sprite(0, 0, textureKey ?? ASSETS.playerUnequipped.key, 16)
      .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97).setTint(0xd5ddd5);
    const nameTag = this.add.text(0, -126, params.opponentName, {
      fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#e0b4b4',
      stroke: '#101010', strokeThickness: 4,
    }).setOrigin(0.5);
    const root = this.add.container(oppX, oppY, [shadow, sprite, nameTag]).setDepth(oppY + 9);
    this.pvpOpponentView = { root, sprite, name: nameTag, targetX: oppX, targetY: oppY, facing: Math.PI, moving: false };
    
    // Connect to RTDB for PvP sync
    this.onlineClient?.disconnect();
    this.onlineClient = null;
    if (!this.pvpService) this.pvpService = new PvpRtdbService(db, rtdb);
    
    this.pvpService.subscribeOpponentPosition(params.roomId, params.opponentUid, (pos) => {
      if (!pos && this.pvpOpponentView) {
        // 상대방 연결 끊김
        this.alertMarker(this.simulation.player.x, this.simulation.player.y - 100, '상대방이 전장을 떠났습니다');
      } else if (pos && this.pvpOpponentView) {
        this.pvpOpponentView.targetX = pos.x;
        this.pvpOpponentView.targetY = pos.y;
        this.pvpOpponentView.facing = pos.facing;
        this.pvpOpponentView.moving = pos.moving;
      }
    });

    this.alertMarker(playerX, playerY - 118, `전장 입장 · ${params.opponentName}과(와) 대전`);
  }

  private async resumeStoryOrPlayOpening(): Promise<void> {
    this.saveReadyForWrites = false;
    this.showSavePresence('저장 기록 확인 중', false);
    const saveService = await this.getSinglePlayerSave();
    const saved = await saveService.load();
    if (saved && this.simulation.importSinglePlayerSnapshot(saved.snapshot)) {
      this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
      this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
      this.currentRegion = this.simulation.region;
      this.syncAmbientWorldState(this.simulation.region);
      this.releaseInactiveMonsterViews(this.simulation.region);
      if (isJoseonTownRegion(this.simulation.region)) {
        this.ensureJoseonTownNeighborhood(this.simulation.region);
      }
      this.fitCamera();
      this.enableSaveWrites();
      this.showSavePresence(saved.source === 'cloud' ? '클라우드 저장 불러옴' : '기기 저장 불러옴', true);
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, '이전 여정에서 이어 시작합니다', 1400);
      this.storyNarrativeReady = true;
      return;
    }
    this.enableSaveWrites();
    this.showSavePresence('새 여정 · 자동 저장', false);
    this.time.delayedCall(180, () => this.playOpeningPrologue());
  }

  private async resumeFrontierArcherOrStartNew(): Promise<void> {
    const { SinglePlayerSave } = await import('../save/SinglePlayerSave');
    const saveService = new SinglePlayerSave('frontier-archer');
    this.attachSinglePlayerSave(saveService);
    const saved = await saveService.load();
    if (!saved || !this.simulation.importSinglePlayerSnapshot(saved.snapshot)
      || !this.simulation.isFrontierArcher()) {
      this.startFrontierArcherStory();
      return;
    }
    if (isRoyalRefugeRegion(this.simulation.region)) {
      await new Promise<void>((resolve) => {
        this.loadRoyalRefugeWorld(this.simulation.region as RoyalRefugeRouteId, resolve, resolve);
      });
    }
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.currentRegion = this.simulation.region;
    this.syncAmbientWorldState(this.simulation.region);
    this.releaseInactiveMonsterViews(this.simulation.region);
    if (isJoseonTownRegion(this.simulation.region)) {
      this.ensureJoseonTownNeighborhood(this.simulation.region);
    }
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.fitCamera();
    this.enableSaveWrites();
    this.showSavePresence(saved.source === 'cloud' ? '하진 클라우드 기록 불러옴' : '하진 기기 기록 불러옴', true);
    this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, '하진의 이전 남하 기록에서 이어 시작합니다', 1600);
    this.storyNarrativeReady = true;
    if (this.simulation.getRoyalRefugeState().status === 'awaiting-route') {
      this.playRoyalRefugeChoice(
        KING_ENCOUNTER_AFTER_PYONGYANG.title,
        KING_ENCOUNTER_AFTER_PYONGYANG.dialogue,
      );
    }
  }

  private async resumeOsakaMudangOrStartNew(): Promise<void> {
    const { SinglePlayerSave } = await import('../save/SinglePlayerSave');
    const saveService = new SinglePlayerSave('osaka-mudang');
    this.attachSinglePlayerSave(saveService);
    const saved = await saveService.load();
    if (!saved || !this.simulation.importSinglePlayerSnapshot(saved.snapshot)
      || !this.simulation.isOsakaMudang()) {
      this.startOsakaMudangStory();
      return;
    }
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.currentRegion = this.simulation.region;
    this.syncAmbientWorldState(this.simulation.region);
    this.releaseInactiveMonsterViews(this.simulation.region);
    if (isJoseonTownRegion(this.simulation.region)) {
      this.ensureJoseonTownNeighborhood(this.simulation.region);
    }
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.fitCamera();
    this.enableSaveWrites();
    this.showSavePresence(saved.source === 'cloud' ? '연화 클라우드 기록 불러옴' : '연화 기기 기록 불러옴', true);
    this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, '연화의 오사카 원혼록에서 이어 시작합니다', 1700);
    this.storyNarrativeReady = true;
  }

  private async resumeGwanghaeOrStartNew(): Promise<void> {
    const { SinglePlayerSave } = await import('../save/SinglePlayerSave');
    const saveService = new SinglePlayerSave('gwanghae-prince');
    this.attachSinglePlayerSave(saveService);
    const saved = await saveService.load();
    if (!saved || !this.simulation.importSinglePlayerSnapshot(saved.snapshot)
      || !this.simulation.isGwanghaePrince()) {
      this.startGwanghaeStory();
      return;
    }
    if (isRoyalRefugeRegion(this.simulation.region)) {
      await new Promise<void>((resolve) => {
        this.loadRoyalRefugeWorld(this.simulation.region as RoyalRefugeRouteId, resolve, resolve);
      });
    }
    this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
    this.currentRegion = this.simulation.region;
    this.syncAmbientWorldState(this.simulation.region);
    this.releaseInactiveMonsterViews(this.simulation.region);
    if (isJoseonTownRegion(this.simulation.region)) {
      this.ensureJoseonTownNeighborhood(this.simulation.region);
    }
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.fitCamera();
    this.enableSaveWrites();
    this.showSavePresence(saved.source === 'cloud' ? '광해 분조록 클라우드 기록 불러옴' : '광해 분조록 기기 기록 불러옴', true);
    this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, '왕세자 광해의 이전 분조 행로에서 이어 시작합니다', 1800);
    if (this.simulation.getGwanghaeRallyProgress().choiceReady) {
      this.time.delayedCall(650, () => this.playGwanghaePathChoice());
    } else if (this.simulation.getRoyalRefugeState().status === 'awaiting-route') {
      this.storyNarrativeReady = true;
      const encounter = this.simulation.getRoyalRefugeEncounterCopy();
      this.playRoyalRefugeChoice(encounter.title, encounter.dialogue);
    } else {
      this.storyNarrativeReady = true;
    }
  }

  private async getSinglePlayerSave(): Promise<import('../save/SinglePlayerSave').SinglePlayerSave> {
    if (this.singlePlayerSave) {
      this.attachSinglePlayerSave(this.singlePlayerSave);
      return this.singlePlayerSave;
    }
    const { SinglePlayerSave } = await import('../save/SinglePlayerSave');
    const saveService = new SinglePlayerSave(this.simulation.getPlayerOrigin());
    this.attachSinglePlayerSave(saveService);
    return saveService;
  }

  private attachSinglePlayerSave(
    saveService: import('../save/SinglePlayerSave').SinglePlayerSave,
  ): void {
    if (this.singlePlayerSave !== saveService) {
      this.saveLifecycleCleanup?.();
      this.saveLifecycleCleanup = null;
      this.singlePlayerSave = saveService;
    }
    if (this.saveReadyForWrites && !this.saveLifecycleCleanup) {
      this.saveLifecycleCleanup = saveService.bindLifecycleFlush(
        () => this.simulation.exportSinglePlayerSnapshot(),
      );
    }
  }

  private resetSinglePlayerSave(): void {
    this.saveLifecycleCleanup?.();
    this.saveLifecycleCleanup = null;
    this.singlePlayerSave = null;
    this.saveReadyForWrites = false;
    this.saveInFlight = false;
    this.saveQueued = false;
    this.autosaveAccumulator = 0;
  }

  private enableSaveWrites(): void {
    this.saveReadyForWrites = true;
    if (this.singlePlayerSave) {
      this.attachSinglePlayerSave(this.singlePlayerSave);
      return;
    }
    void this.getSinglePlayerSave().catch(() => {
      this.showSavePresence('기기 저장 준비 실패', false);
    });
  }

  private canWriteSinglePlayerSave(): boolean {
    return this.saveReadyForWrites
      && this.gameMode !== 'online'
      && this.gameMode !== 'menu'
      && this.gameMode !== 'travel'
      && !this.prologueActive
      && !this.storyDirector?.isOpen;
  }

  private isGameplayInputLocked(): boolean {
    return this.menuOpen
      || this.prologueActive
      || Boolean(this.storyDirector?.isOpen)
      || this.gwanghaeChoiceDom !== null
      || this.royalRefugeDom !== null;
  }

  private checkpointSinglePlayer(): void {
    if (!this.canWriteSinglePlayerSave()) return;
    const snapshot = this.simulation.exportSinglePlayerSnapshot();
    const persist = (saveService: import('../save/SinglePlayerSave').SinglePlayerSave): void => {
      const result = saveService.flushLocal(snapshot);
      if (result.status === 'error') {
        this.showSavePresence('기기 저장 실패 · 다시 시도', false);
        return;
      }
      if (result.status === 'conflict') {
        this.showSavePresence('다른 탭의 최신 저장 유지', false);
        return;
      }
      this.autosaveAccumulator = Math.max(
        this.autosaveAccumulator,
        AUTOSAVE_INTERVAL_MS - AUTOSAVE_AFTER_CHECKPOINT_MS,
      );
      if (this.saveInFlight) this.saveQueued = true;
    };
    if (this.singlePlayerSave) {
      persist(this.singlePlayerSave);
      return;
    }
    void this.getSinglePlayerSave().then(persist).catch(() => {
      this.showSavePresence('기기 저장 준비 실패', false);
    });
  }

  private showSavePresence(message: string, saved: boolean): void {
    const root = document.querySelector<HTMLElement>('#save-presence');
    if (!root || this.gameMode === 'online') return;
    root.removeAttribute('hidden');
    root.classList.toggle('is-saved', saved);
    const label = root.querySelector<HTMLElement>('span');
    if (label) label.textContent = message;
  }

  private saveSinglePlayer(): void {
    if (!this.canWriteSinglePlayerSave()) return;
    if (this.saveInFlight) {
      this.saveQueued = true;
      return;
    }
    this.saveInFlight = true;
    this.showSavePresence('저장 중…', false);
    const snapshot = this.simulation.exportSinglePlayerSnapshot();
    void this.getSinglePlayerSave().then((saveService) => saveService.saveDetailed(snapshot)).then((result) => {
      if (result.status === 'cloud') {
        this.showSavePresence('자동 저장됨', true);
      } else if (result.status === 'local') {
        this.showSavePresence('기기 저장됨 · 클라우드 재시도', true);
      } else if (result.status === 'conflict') {
        this.showSavePresence('다른 탭의 최신 저장 유지', false);
      } else {
        this.showSavePresence('저장 실패 · 다시 시도', false);
      }
    }).catch(() => {
      this.showSavePresence('저장 실패 · 다시 시도', false);
    }).finally(() => {
      this.saveInFlight = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.saveSinglePlayer();
      }
    });
  }

  preload(): void {
    this.bindBootLoader();
    const requestedRegion = new URLSearchParams(window.location.search).get('region') as RegionId | null;
    const gwanghaeCampaign = document.body.dataset.bootCampaign === 'gwanghae';
    const loadJapanAssets = document.body.dataset.bootCampaign === 'japan'
      || document.body.dataset.bootCampaign === 'travel'
      || (requestedRegion ? isJapanRegion(requestedRegion) : false);
    const japanMapKeys = new Set<string>([
      ASSETS.osakaOuterHarborBackground.key,
      ASSETS.settsuVillageBackground.key,
      ASSETS.yamazakiHuntBackground.key,
      ASSETS.osakaCastleTownBackground.key,
      ASSETS.shogunKeepBackground.key,
      ASSETS.awajiCoastBackground.key,
    ]);
    const japanTransitionKeys = new Set<string>([
      ASSETS.transitions.settsuOsaka.key,
    ]);
    const japanMonsterKeys = new Set<string>([
      ASSETS.monsters['japanese-shogun'].key,
    ]);
    this.load.image(ASSETS.background.key, ASSETS.background.path);
    this.load.image(ASSETS.worldBackground.key, ASSETS.worldBackground.path);
    this.load.image(ASSETS.ulleungdoPrisonBackground.key, ASSETS.ulleungdoPrisonBackground.path);
    this.load.image(ASSETS.ulleungCoastalForestBackground.key, ASSETS.ulleungCoastalForestBackground.path);
    this.load.image(ASSETS.ulleungSilvergrassMeadowBackground.key, ASSETS.ulleungSilvergrassMeadowBackground.path);
    this.load.image(ASSETS.ulleungdoTrainingGroundBackground.key, ASSETS.ulleungdoTrainingGroundBackground.path);
    this.load.image(ASSETS.ulleungHighlandRidgeBackground.key, ASSETS.ulleungHighlandRidgeBackground.path);
    this.load.image(ASSETS.ulleungGovernmentDistrictBackground.key, ASSETS.ulleungGovernmentDistrictBackground.path);
    this.load.image(ASSETS.yeongwolTrainingYardBackground.key, ASSETS.yeongwolTrainingYardBackground.path);
    this.load.image(ASSETS.yeongwolCommandHeadquartersBackground.key, ASSETS.yeongwolCommandHeadquartersBackground.path);
    this.load.image(ASSETS.jeonjuWansanFieldBackground.key, ASSETS.jeonjuWansanFieldBackground.path);
    this.load.image(ASSETS.jeonjuPungnamGateBackground.key, ASSETS.jeonjuPungnamGateBackground.path);
    this.load.image(ASSETS.jeonjuCastleTownBackground.key, ASSETS.jeonjuCastleTownBackground.path);
    for (const background of Object.values(ASSETS.extendedRegionBackgrounds)) {
      this.load.image(background.key, background.path);
    }
    this.load.image(ASSETS.joseonGroundTile.key, ASSETS.joseonGroundTile.path);
    this.load.image(ASSETS.japanGroundTile.key, ASSETS.japanGroundTile.path);
    this.load.image(ASSETS.northernGroundTile.key, ASSETS.northernGroundTile.path);
    for (const campaignMap of [
      ASSETS.osakaOuterHarborBackground,
      ASSETS.settsuVillageBackground,
      ASSETS.yamazakiHuntBackground,
      ASSETS.osakaCastleTownBackground,
      ASSETS.shogunKeepBackground,
      ASSETS.awajiCoastBackground,
      ASSETS.busanjinSiegeBackground,
      ASSETS.tangeumdaeBackground,
      ASSETS.gyeongbokGwanghwamunBackground,
      ASSETS.gyeongbokGeunjeongBackground,
      ASSETS.gyeongbokInnerBackground,
      ASSETS.jurchenVillageBackground,
      ASSETS.manchuFrontierBackground,
      ASSETS.pyongyangOuterBackground,
      ASSETS.pyongyangDaedongGateBackground,
      ASSETS.pyongyangInnerBackground,
    ]) {
      if (!loadJapanAssets && japanMapKeys.has(campaignMap.key)) continue;
      this.load.image(campaignMap.key, campaignMap.path);
    }
    const requestedJoseonTown: JoseonTownRegionId | null = requestedRegion && isJoseonTownRegion(requestedRegion)
      ? requestedRegion
      : gwanghaeCampaign
        ? 'changdeokgung'
        : null;
    const initialJoseonTownRegions = requestedJoseonTown
      ? JOSEON_TOWN_REGION_IDS.filter((region) => (
        Math.abs(JOSEON_TOWN_REGION_IDS.indexOf(region)
          - JOSEON_TOWN_REGION_IDS.indexOf(requestedJoseonTown)) <= 1
      ))
      : [];
    const joseonTransitionKeys = new Set<string>(
      JOSEON_TOWN_TRANSITION_SEAMS.map((transition) => transition.asset.key),
    );
    const initialJoseonTransitionKeys = new Set<string>(
      requestedJoseonTown
        ? JOSEON_TOWN_TRANSITION_SEAMS
          .filter((transition) => (
            transition.from === requestedJoseonTown || transition.to === requestedJoseonTown
          ))
          .map((transition) => transition.asset.key)
        : [],
    );
    for (const region of initialJoseonTownRegions) {
      const layout = JOSEON_TOWN_LAYOUTS[region];
      this.load.image(layout.backgroundKey, layout.backgroundPath);
    }
    if (requestedJoseonTown === 'changdeokgung') {
      this.load.spritesheet(ASSETS.gwanghaePrince.key, ASSETS.gwanghaePrince.path, {
        frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
      });
    }
    // The two royal refuge paintings are deliberately not part of the normal
    // boot bundle. Phones only download the route the player chooses; direct
    // QA links still preload their one requested map before create().
    if (document.body.dataset.bootCampaign === 'travel') {
      for (const refugeAsset of [ASSETS.namhansanFortressBackground, ASSETS.ganghwaFortressBackground]) {
        this.load.image(refugeAsset.key, refugeAsset.path);
      }
    } else if (requestedRegion && isRoyalRefugeRouteId(requestedRegion)) {
      const refugeAsset = requestedRegion === 'namhansanseong'
        ? ASSETS.namhansanFortressBackground
        : ASSETS.ganghwaFortressBackground;
      this.load.image(refugeAsset.key, refugeAsset.path);
    }
    for (const palaceForeground of Object.values(ASSETS.gyeongbokForegrounds)) {
      this.load.image(palaceForeground.key, palaceForeground.path);
    }
    for (const fortressForeground of Object.values(ASSETS.pyongyangForegrounds)) {
      this.load.image(fortressForeground.key, fortressForeground.path);
    }
    this.load.image(ASSETS.dungeonBackground.key, ASSETS.dungeonBackground.path);
    for (const transition of Object.values(ASSETS.transitions)) {
      if (!loadJapanAssets && japanTransitionKeys.has(transition.key)) continue;
      if (joseonTransitionKeys.has(transition.key)
        && !initialJoseonTransitionKeys.has(transition.key)) continue;
      this.load.image(transition.key, transition.path);
    }
    for (const ambientAsset of Object.values(ASSETS.props.ambient)) {
      this.load.spritesheet(ambientAsset.key, ambientAsset.path, {
        frameWidth: 256,
        frameHeight: 256,
        endFrame: 3,
      });
    }
    this.load.spritesheet(ASSETS.props.episode2VillageProps.key, ASSETS.props.episode2VillageProps.path, {
      frameWidth: 384,
      frameHeight: 384,
      endFrame: 15,
    });
    this.load.spritesheet(ASSETS.props.betaRoadsideProps.key, ASSETS.props.betaRoadsideProps.path, {
      frameWidth: 512,
      frameHeight: 512,
      endFrame: 5,
    });
    this.load.image(ASSETS.props.episode2WaterwheelWheel.key, ASSETS.props.episode2WaterwheelWheel.path);
    for (const terrain of Object.values(ASSETS.episode2TerrainBases)) {
      this.load.image(terrain.key, terrain.path);
    }
    this.load.image(ASSETS.episode2WaterBank.key, ASSETS.episode2WaterBank.path);
    this.load.image(ASSETS.props.spiritShrine.key, ASSETS.props.spiritShrine.path);
    this.load.image(ASSETS.props.brokenCart.key, ASSETS.props.brokenCart.path);
    this.load.image(ASSETS.props.blacksmithHammer.key, ASSETS.props.blacksmithHammer.path);
    this.load.image(ASSETS.props.blacksmithWorkstation.key, ASSETS.props.blacksmithWorkstation.path);
    this.load.image(ASSETS.props.ulleungTrainingPine.key, ASSETS.props.ulleungTrainingPine.path);
    this.load.spritesheet(ASSETS.props.joseonTreeSpecies.key, ASSETS.props.joseonTreeSpecies.path, {
      frameWidth: 384, frameHeight: 512, endFrame: 7,
    });
    for (const prop of [
      ASSETS.props.yeongwolOuterGate,
      ASSETS.props.yeongwolInnerGate,
      ASSETS.props.yeongwolWatchtower,
      ASSETS.props.yeongwolBarracks,
      ASSETS.props.yeongwolPalisade,
      ASSETS.props.yeongwolArmoryProps,
      ASSETS.props.yeongwolHeadquartersHall,
    ]) this.load.image(prop.key, prop.path);
    this.load.spritesheet(ASSETS.props.ulleungAdventureProps.key, ASSETS.props.ulleungAdventureProps.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 5,
    });
    this.load.spritesheet(ASSETS.props.worldTransitionProps.key, ASSETS.props.worldTransitionProps.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 8,
    });
    this.load.spritesheet(ASSETS.props.japanRegionProps.key, ASSETS.props.japanRegionProps.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 8,
    });
    this.load.spritesheet(ASSETS.props.worldTerrainFeathers.key, ASSETS.props.worldTerrainFeathers.path, {
      frameWidth: 1024, frameHeight: 1024, endFrame: 3,
    });
    this.load.spritesheet(ASSETS.props.worldGroundDetails.key, ASSETS.props.worldGroundDetails.path, {
      frameWidth: 418, frameHeight: 418, endFrame: 8,
    });
    this.load.spritesheet(ASSETS.props.worldNaturalRoads.key, ASSETS.props.worldNaturalRoads.path, {
      frameWidth: 418, frameHeight: 418, endFrame: 8,
    });
    this.load.spritesheet(ASSETS.props.worldSeamRoads.key, ASSETS.props.worldSeamRoads.path, {
      frameWidth: 418, frameHeight: 418, endFrame: 8,
    });
    this.load.spritesheet(ASSETS.props.villageFarmPlotStages.key, ASSETS.props.villageFarmPlotStages.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 3,
    });
    this.load.image(ASSETS.projectiles.joseonArrow.key, ASSETS.projectiles.joseonArrow.path);
    this.load.spritesheet(ASSETS.combatImpacts.key, ASSETS.combatImpacts.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 3,
    });
    this.load.spritesheet(ASSETS.frontierCombatFx.key, ASSETS.frontierCombatFx.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 7,
    });
    this.load.spritesheet(ASSETS.frontierCampProps.key, ASSETS.frontierCampProps.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 5,
    });
    this.load.spritesheet(ASSETS.props.jurchenVillageStructures.key, ASSETS.props.jurchenVillageStructures.path, {
      frameWidth: 512, frameHeight: 512, endFrame: 5,
    });
    this.load.spritesheet(ASSETS.dungeonProps.key, ASSETS.dungeonProps.path, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(ASSETS.dungeonWalls.key, ASSETS.dungeonWalls.path, { frameWidth: 256, frameHeight: 256, endFrame: 7 });
    this.load.spritesheet(ASSETS.dungeonTelegraphs.key, ASSETS.dungeonTelegraphs.path, { frameWidth: 256, frameHeight: 256 });
    for (const player of [
      ASSETS.playerUnequipped,
      ASSETS.playerWeaponReadyBody,
      ASSETS.playerArmorOnly,
      ASSETS.playerFullyEquipped,
      ASSETS.frontierArcher,
      ASSETS.frontierMelee,
      ...(loadJapanAssets ? [ASSETS.osakaMudang] : []),
    ]) {
      this.load.spritesheet(player.key, player.path, {
        frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
      });
    }
    this.load.spritesheet(ASSETS.villageCommoner.key, ASSETS.villageCommoner.path, {
      frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
    });
    for (const farmer of [
      ASSETS.villageFieldPloughman,
      ASSETS.villageFemaleFarmer,
      ASSETS.villageFemaleWaterer,
    ]) {
      this.load.spritesheet(farmer.key, farmer.path, {
        frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
      });
    }
    this.load.spritesheet(ASSETS.japaneseCivilianWoman.key, ASSETS.japaneseCivilianWoman.path, {
      frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
    });
    this.load.spritesheet(ASSETS.ulleungOppressedVillager.key, ASSETS.ulleungOppressedVillager.path, {
      frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
    });
    for (const armor of Object.values(ASSETS.playerArmorLayers)) {
      this.load.spritesheet(armor.key, armor.path, {
        frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
      });
    }
    for (const armor of Object.values(ASSETS.playerWeaponReadyArmorLayers)) {
      this.load.spritesheet(armor.key, armor.path, {
        frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
      });
    }
    for (const weapon of Object.values(ASSETS.playerWeapons)) this.load.image(weapon.key, weapon.path);
    const queuedMonsterTextures = new Set<string>();
    for (const monster of Object.values(ASSETS.monsters)) {
      if (queuedMonsterTextures.has(monster.key)) continue;
      if (!loadJapanAssets && japanMonsterKeys.has(monster.key)) continue;
      queuedMonsterTextures.add(monster.key);
      this.load.spritesheet(monster.key, monster.path, {
        frameWidth: MONSTER_FRAME.width, frameHeight: MONSTER_FRAME.height, endFrame: 39,
      });
    }
    for (const item of Object.values(ITEM_CATALOG)) this.load.image(item.iconKey, item.iconPath);
  }

  private bindBootLoader(): void {
    const root = document.querySelector<HTMLElement>('#boot-loader');
    const fill = document.querySelector<HTMLElement>('#boot-progress-fill');
    const value = document.querySelector<HTMLElement>('#boot-progress-value');
    const status = document.querySelector<HTMLElement>('#boot-status');
    if (!root || !fill || !value || !status) return;
    const update = (progress: number, message: string) => {
      const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
      fill.style.width = `${percent}%`;
      value.textContent = `${percent}%`;
      status.textContent = message;
      root.setAttribute('aria-valuenow', String(percent));
    };
    const campaign = document.body.dataset.bootCampaign;
    const openingMessage = campaign === 'gwanghae'
      ? '창덕궁 분조청을 불러오는 중'
      : campaign === 'frontier'
        ? '압록 전선과 여진 진영을 불러오는 중'
        : campaign === 'japan'
          ? '오사카 포로촌을 불러오는 중'
          : campaign === 'travel'
            ? '조선 팔도의 길을 펼치는 중'
            : '울릉도의 지형을 불러오는 중';
    const readyMessage = campaign === 'gwanghae'
      ? '왕세자 광해의 분조 출진을 준비했습니다'
      : campaign === 'frontier'
        ? '하진의 북방 원정을 준비했습니다'
        : campaign === 'japan'
          ? '연화의 망향 원정을 준비했습니다'
          : campaign === 'travel'
            ? '천하 대도시 지도를 준비했습니다'
            : '김동혁의 탈출을 준비했습니다';
    update(0.04, openingMessage);
    this.load.on('progress', (progress: number) => update(progress, progress < 0.55 ? '지도와 건물을 펼치는 중' : progress < 0.86 ? '인물과 몬스터를 준비하는 중' : '전투 기록을 정리하는 중'));
    this.load.once('complete', () => update(1, readyMessage));
    this.load.on('loaderror', () => { status.textContent = '일부 자원을 다시 확인하는 중'; });
  }

  private finishBootLoader(): void {
    const root = document.querySelector<HTMLElement>('#boot-loader');
    if (!root) return;
    const MIN_BOOT_VISIBLE_MS = 720;
    const visibleAt = Number(root.dataset.bootVisibleAt || performance.now());
    const remainingVisibleMs = Math.max(0,
      MIN_BOOT_VISIBLE_MS - (performance.now() - visibleAt),
    );
    window.setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.classList.add('is-ready');
        root.setAttribute('aria-hidden', 'true');
        window.setTimeout(() => root.remove(), 620);
      }));
    }, remainingVisibleMs);
  }

  create(): void {
    const selectedOrigin = document.body.dataset.selectedOrigin;
    this.game.canvas.dataset.combatFxAtlas = this.textures.exists(ASSETS.combatImpacts.key)
      ? `${ASSETS.combatImpacts.key}:4`
      : 'missing';
    if (selectedOrigin === 'frontier-archer') {
      this.simulation.startFrontierArcherStory();
      this.preconfiguredOrigin = selectedOrigin;
    } else if (selectedOrigin === 'osaka-mudang') {
      this.simulation.startOsakaMudangStory();
      this.preconfiguredOrigin = selectedOrigin;
    } else if (selectedOrigin === 'gwanghae-prince') {
      this.simulation.startGwanghaeStory();
      this.preconfiguredOrigin = selectedOrigin;
    }
    this.currentRegion = this.simulation.region;
    this.cameras.main.setBackgroundColor('#151711');
    this.add.image(-MAP_WIDTH / 2, VILLAGE_TOP + MAP_HEIGHT / 2, ASSETS.transitions.mistwoodVillage.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    this.worldBackground = this.add.image(MAP_WIDTH / 2, CENTRAL_WORLD_HEIGHT / 2, ASSETS.worldBackground.key)
      .setDisplaySize(MAP_WIDTH, CENTRAL_WORLD_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    this.add.image(REGION_ORIGINS.yeongwol.x + MAP_WIDTH / 2, REGION_ORIGINS.yeongwol.y + MAP_HEIGHT / 2, ASSETS.yeongwolTrainingYardBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1).setTint(0xc8c4ba);
    this.add.image(REGION_ORIGINS.yeongwolhq.x + MAP_WIDTH / 2, REGION_ORIGINS.yeongwolhq.y + MAP_HEIGHT / 2, ASSETS.yeongwolCommandHeadquartersBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1).setTint(0xc8c4ba);
    this.add.image(REGION_ORIGINS.jeonjufield.x + MAP_WIDTH / 2, REGION_ORIGINS.jeonjufield.y + MAP_HEIGHT / 2, ASSETS.jeonjuWansanFieldBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    this.add.image(REGION_ORIGINS.jeonjugate.x + MAP_WIDTH / 2, REGION_ORIGINS.jeonjugate.y + MAP_HEIGHT / 2, ASSETS.jeonjuPungnamGateBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    this.add.image(REGION_ORIGINS.jeonju.x + MAP_WIDTH / 2, REGION_ORIGINS.jeonju.y + MAP_HEIGHT / 2, ASSETS.jeonjuCastleTownBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    for (const [region, asset] of [
      ['osaka', ASSETS.osakaOuterHarborBackground],
      ['settsuvillage', ASSETS.settsuVillageBackground],
      ['yamazakihunt', ASSETS.yamazakiHuntBackground],
      ['osakacastle', ASSETS.osakaCastleTownBackground],
      ['shogunkeep', ASSETS.shogunKeepBackground],
      ['busanjin', ASSETS.busanjinSiegeBackground],
      ['tangeumdae', ASSETS.tangeumdaeBackground],
      ['gyeongbokgate', ASSETS.gyeongbokGwanghwamunBackground],
      ['gyeongbokcourt', ASSETS.gyeongbokGeunjeongBackground],
      ['gyeongbokinner', ASSETS.gyeongbokInnerBackground],
      ['jurchenvillage', ASSETS.jurchenVillageBackground],
      ['manchufrontier', ASSETS.manchuFrontierBackground],
      ['pyongyangouter', ASSETS.pyongyangOuterBackground],
      ['pyongyanggate', ASSETS.pyongyangDaedongGateBackground],
      ['pyongyanginner', ASSETS.pyongyangInnerBackground],
    ] as Array<[RegionId, { key: string }]>) {
      if (!this.textures.exists(asset.key)) continue;
      const origin = REGION_ORIGINS[region];
      this.add.image(origin.x + MAP_WIDTH / 2, origin.y + MAP_HEIGHT / 2, asset.key)
        .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    }
    this.createExtendedWorlds();
    this.createEpisode2Worlds();
    this.createJapanExpansionWorlds();
    this.createJurchenExpansionWorlds();
    this.add.image(REGION_ORIGINS.ulleungdo.x + MAP_WIDTH / 2, REGION_ORIGINS.ulleungdo.y + MAP_HEIGHT / 2, ASSETS.ulleungdoPrisonBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(ISLAND_BACKGROUND_DEPTH);
    this.add.image(REGION_ORIGINS.ulleungcoast.x + MAP_WIDTH / 2, REGION_ORIGINS.ulleungcoast.y + MAP_HEIGHT / 2, ASSETS.ulleungCoastalForestBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(ISLAND_BACKGROUND_DEPTH);
    this.add.image(REGION_ORIGINS.ulleungmeadow.x + MAP_WIDTH / 2, REGION_ORIGINS.ulleungmeadow.y + MAP_HEIGHT / 2, ASSETS.ulleungSilvergrassMeadowBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(ISLAND_BACKGROUND_DEPTH);
    this.add.image(REGION_ORIGINS.ulleunghunt.x + MAP_WIDTH / 2, REGION_ORIGINS.ulleunghunt.y + MAP_HEIGHT / 2, ASSETS.ulleungdoTrainingGroundBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(ISLAND_BACKGROUND_DEPTH);
    this.add.image(REGION_ORIGINS.ulleungridge.x + MAP_WIDTH / 2, REGION_ORIGINS.ulleungridge.y + MAP_HEIGHT / 2, ASSETS.ulleungHighlandRidgeBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(ISLAND_BACKGROUND_DEPTH);
    this.add.image(REGION_ORIGINS.ulleungvillage.x + MAP_WIDTH / 2, REGION_ORIGINS.ulleungvillage.y + MAP_HEIGHT / 2, ASSETS.ulleungGovernmentDistrictBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(ISLAND_BACKGROUND_DEPTH);
    this.createUlleungRouteSeams();
    this.add.image(MAP_WIDTH * 1.5, VILLAGE_TOP + MAP_HEIGHT / 2, ASSETS.transitions.villageMinepass.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    this.add.image(MAP_WIDTH / 2, CENTRAL_WORLD_HEIGHT + MAP_HEIGHT / 2, ASSETS.transitions.villageMoonfield.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    this.add.image(REGION_ORIGINS.dungeon.x + MAP_WIDTH / 2, MAP_HEIGHT / 2, ASSETS.dungeonBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT).setDepth(WORLD_FLOOR_DEPTH + 1);
    this.createWorldTerrainSeams();
    this.createWorldTravelLandmarks();
    this.add.rectangle(WORLD_MIN_X + WORLD_WIDTH / 2, WORLD_MIN_Y + WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x101610, 0.06)
      .setDepth(WORLD_FLOOR_DEPTH).setInteractive({ useHandCursor: false });
    this.createOpenFieldSeams();
    this.createUlleungdo();
    this.createUlleungCoastalForest();
    this.createUlleungSilvergrassMeadow();
    this.createUlleungTrainingGround();
    this.createUlleungHighlandRidge();
    this.createUlleungGovernmentDistrict();
    this.createYeongwolTrainingYard();
    this.createYeongwolCommandHeadquarters();
    this.createJeonjuWansanField();
    this.createJeonjuPungnamBattlefield();
    this.createJeonjuCastleTown();
    this.createUlleungAdventureProps();
    this.createEnvironment();
    this.createAnimations();
    this.createJoseonTownWorlds();
    this.createCampaignWorld();
    this.createFrontierCampProps();
    this.time.delayedCall(1800, () => this.loadBossAssetsInBackground());
    this.createVillage();
    this.createBetaRoadsideProps();
    this.createRegionPortals();
    this.createDungeonEntrance();
    this.captureAmbientWorldTweens();

    this.positionUlleungContinuityPlaytest();
    this.positionWorldContinuityPlaytest();
    this.destinationMark = this.add.circle(0, 0, 15, 0x000000, 0).setStrokeStyle(2, 0xd7b66c, 0.9).setVisible(false).setDepth(1900);
    this.playerShadow = this.add.ellipse(0, 5, 58, 18, 0x090a07, 0.42);
    this.playerSprite = this.add.sprite(0, 0, ASSETS.playerUnequipped.key, 0)
      .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97);
    this.playerArmorSprite = this.add.sprite(0, 0, ASSETS.playerArmorLayers['hunter-durumagi'].key, 0)
      .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97).setVisible(false);
    this.playerWeaponAura = this.add.image(0, 0, ASSETS.playerWeapons['worn-hwando'].key)
      .setOrigin(0.5, 50 / PLAYER_ACTION_FRAME.height).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.playerWeaponSprite = this.add.image(0, 0, ASSETS.playerWeapons['worn-hwando'].key)
      .setOrigin(0.5, 50 / PLAYER_ACTION_FRAME.height).setVisible(false);
    this.playerActionRoot = this.add.container(0, 0, [
      this.playerWeaponAura, this.playerWeaponSprite, this.playerSprite, this.playerArmorSprite,
    ]);
    this.playerRoot = this.add.container(this.simulation.player.x, this.simulation.player.y, [
      this.playerShadow, this.playerActionRoot,
    ])
      .setDepth(this.simulation.player.y + 10);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };

    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('invasionqa') === '1') {
      this.simulation.startWakoInvasionPlaytest();
    }
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('tangeumqa') === 'clear') {
      this.time.delayedCall(850, () => this.simulation.completeTangeumBattleForPlaytest());
    }
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('worldmapqa') === 'all') {
      this.simulation.unlockAllWorldMapNodesForPlaytest();
    }
    if (import.meta.env.DEV) {
      const requestedElement = new URLSearchParams(window.location.search).get('element');
      const playtestWeapon = requestedElement === 'fire' ? 'ember-hwando'
        : requestedElement === 'ice' ? 'frost-hwando'
          : requestedElement === 'lightning' ? 'storm-hwando'
            : requestedElement === 'poison' ? 'venom-hwando'
              : requestedElement === 'wind' ? 'gale-hwando'
                : requestedElement === 'earth' ? 'earth-hwando'
                  : requestedElement === 'shadow' ? 'shadow-hwando' : null;
      if (playtestWeapon) this.toggleDevEquipment(playtestWeapon);
      if (new URLSearchParams(window.location.search).get('armor') === 'tiger') {
        this.toggleDevEquipment('tiger-pelt-armor');
      }
    }
    this.createMonsterViews();
    this.hud = new Hud(document.querySelector<HTMLElement>('#hud')!, {
      onPotion: () => this.simulation.usePotion(),
      onQuickStep: () => this.simulation.quickStep(),
      onSkill: (skillId) => this.simulation.castSkill(skillId),
      onLearnSkill: (skillId) => this.simulation.learnSkill(skillId),
      onMasterTeach: (skillId) => this.simulation.learnSkillFromMaster(skillId),
      onAllocateAttribute: (attributeId) => this.simulation.allocateAttribute(attributeId),
      onResetAttributes: () => this.simulation.resetAttributes(),
      onRecruitFollower: (kind) => this.simulation.recruitFollower(kind),
      onCallReinforcements: () => this.simulation.isGwanghaePrince()
        ? this.simulation.callGwanghaeReinforcements()
        : this.simulation.callHajinReinforcements(),
      onShopPurchase: (offer) => this.simulation.purchaseShopOffer(offer),
      onCraft: (recipeId) => this.simulation.craftItem(recipeId),
      onEquip: (instanceId) => this.simulation.equipItem(instanceId),
      onUseItem: (instanceId) => this.simulation.useItem(instanceId),
      onInventoryToggle: (open) => {
        this.menuOpen = open;
        this.destinationMark.setVisible(false);
        if (open) {
          this.tweens.pauseAll();
          this.anims.pauseAll();
        } else {
          this.tweens.resumeAll();
          this.anims.resumeAll();
          this.syncAmbientWorldState(this.simulation.region);
        }
      },
      onWorldTravel: (region) => {
        const result = this.simulation.travelByWorldMap(region);
        if (result === 'traveled') {
          this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
          this.lastPlayerSimulationPosition = {
            x: this.simulation.player.x,
            y: this.simulation.player.y,
          };
          this.fitCamera();
        }
        return result;
      },
      onTravelExit: () => window.location.reload(),
      onReplayStory: () => this.replayCurrentStoryBeat(),
      onSettingsChange: (settings) => this.applyGameSettings(settings),
    });
    this.storyDirector = new StoryDirector({
      onOpenChange: (open) => {
        this.destinationMark.setVisible(false);
        if (open) {
          this.tweens.pauseAll();
          this.anims.pauseAll();
          return;
        }
        this.tweens.resumeAll();
        this.anims.resumeAll();
        this.syncAmbientWorldState(this.simulation.region);
      },
      onComplete: (directedBeat, completion) => {
        const campaignBeat = this.activeStoryBeat;
        this.activeStoryBeat = null;
        if (!campaignBeat || campaignBeat.id !== directedBeat.id) return;
        const selectedChoice = completion.choiceId
          ? campaignBeat.choices.find((choice) => choice.id === completion.choiceId)
          : undefined;
        this.simulation.setStoryCampaignState(completeStoryBeat(
          this.simulation.getStoryCampaignState(),
          campaignBeat,
          selectedChoice,
        ));
        if (campaignBeat.origin === 'kim-donghyeok' && campaignBeat.chapter === 2) {
          this.simulation.startPrisonAmbush();
        }
        this.hudAccumulator = HUD_UPDATE_INTERVAL;
        this.checkpointSinglePlayer();
      },
    });
    const followerPlaytest = import.meta.env.DEV && new URLSearchParams(window.location.search).get('followerqa') === '1';
    if (followerPlaytest) {
      const snapshot = this.simulation.exportSinglePlayerSnapshot();
      snapshot.player.level = 8;
      snapshot.player.gold = 1_000;
      snapshot.skillRanks['crescent-wave'] = 1;
      snapshot.progress.prisonGateOpen = true;
      this.simulation.importSinglePlayerSnapshot(snapshot);
    }
    if (import.meta.env.DEV
      && isPyongyangRegion(this.simulation.region)
      && new URLSearchParams(window.location.search).get('pyongyangqa') === 'clear') {
      this.time.delayedCall(480, () => {
        if (isPyongyangRegion(this.simulation.region)) {
          this.simulation.completePyongyangStageForPlaytest(this.simulation.region);
        }
      });
    }
    if (import.meta.env.DEV && isRoyalRefugeRegion(this.simulation.region)) {
      const params = new URLSearchParams(window.location.search);
      this.simulation.prepareRoyalRefugeForPlaytest(this.simulation.region);
      this.syncRoyalRefugeGates(false);
      if (params.get('refugeqa') === 'clear') {
        this.time.delayedCall(520, () => this.simulation.completeRoyalRefugeStageForPlaytest());
      }
    }
    if (import.meta.env.DEV
      && this.simulation.region === 'gyeongbokinner'
      && new URLSearchParams(window.location.search).get('refugeqa') === 'encounter') {
      this.simulation.prepareRoyalRefugeEncounterForPlaytest();
      this.time.delayedCall(620, () => this.simulation.beginRoyalRefugeAtKing());
    }
    this.hud.update({
      region: this.simulation.region,
      worldMapUnlocked: this.simulation.getUnlockedWorldMapRegions(),
      playerOrigin: this.simulation.getPlayerOrigin(),
      dungeonFloor: this.simulation.dungeonFloor,
      player: this.simulation.player,
      target: null,
      inventory: this.simulation.inventory,
      equipment: this.simulation.equipment,
      inventoryCapacity: this.simulation.inventoryCapacity,
      attackPower: this.simulation.getAttackPower(),
      defense: this.simulation.getDefense(),
      accuracy: this.simulation.getAccuracy(),
      evasion: this.simulation.getEvasion(),
      weaponEnchantLevel: this.simulation.getWeaponEnchantLevel(),
      armorEnchantLevel: this.simulation.getArmorEnchantLevel(),
      skillRanks: this.simulation.skillRanks,
      skillCooldowns: this.simulation.skillCooldowns,
      skillPoints: this.simulation.skillPoints,
      attributes: this.simulation.getAttributeState(),
      derivedAttributes: this.simulation.getDerivedAttributeBonuses(),
      followers: this.simulation.followers,
      activeWorldEvent: this.simulation.activeWorldEvent,
      huntKills: this.simulation.huntKills,
      craftedRecipes: [...this.simulation.craftedRecipes],
      questProgress: this.resolveQuestProgress(),
      storyProgress: this.resolveStoryProgress(),
      storyState: this.simulation.getStoryCampaignState(),
      settings: this.gameSettings,
      hajinArmy: this.simulation.getHajinArmyStatus(),
      gwanghaeArmy: this.simulation.getGwanghaeArmyStatus(),
      factionWar: this.simulation.getFactionWarSnapshot(),
    });
    this.applyGameSettings(this.gameSettings);
    if (followerPlaytest) this.hud.openVillageService('inn');

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
      if (this.isGameplayInputLocked()) return;
      if (this.gameMode === 'travel') {
        const point = { x: pointer.worldX, y: pointer.worldY };
        this.simulation.moveGhostTo(point);
        const destination = this.simulation.getMovementGoal() ?? point;
        this.destinationMark.setPosition(destination.x, destination.y).setVisible(true).setScale(0.72).setAlpha(1);
        this.tweens.add({
          targets: this.destinationMark,
          scale: 1.8,
          alpha: 0,
          duration: 520,
          ease: 'Sine.easeOut',
          onComplete: () => this.destinationMark.setVisible(false),
        });
        return;
      }
      this.combatAudio.prime();
      if (objects.some((object) => object.getData('monsterId') || object.getData('dropId') || object.getData('villageNpc') || object.getData('dungeonAction'))) return;
      const point = { x: pointer.worldX, y: pointer.worldY };
      this.simulation.moveTo(point);
      this.attackLock = 0;
      this.skillVisualNonce += 1;
      this.skillWorldMotion = null;
      this.tweens.killTweensOf(this.playerActionRoot);
      this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);
      this.playerSprite.stop();
      const destination = this.simulation.getMovementGoal() ?? point;
      this.destinationMark.setPosition(destination.x, destination.y).setVisible(true).setScale(0.6).setAlpha(1);
      this.tweens.add({ targets: this.destinationMark, scale: 1.5, alpha: 0, duration: 450, onComplete: () => this.destinationMark.setVisible(false) });
    });

    this.input.keyboard?.on('keydown-TWO', () => {
      if (!this.isGameplayInputLocked() && this.gameMode !== 'travel') this.simulation.usePotion();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.isGameplayInputLocked() && this.gameMode !== 'travel') this.simulation.quickStep();
    });
    this.input.keyboard?.on('keydown-I', (event: KeyboardEvent) => {
      if (!event.repeat && !this.isGameplayInputLocked() && this.gameMode !== 'travel') this.hud.toggleInventory();
    });
    this.input.keyboard?.on('keydown-K', (event: KeyboardEvent) => {
      if (!event.repeat && !this.isGameplayInputLocked() && this.gameMode !== 'travel') this.hud.toggleSkillTree();
    });
    this.input.keyboard?.on('keydown-J', (event: KeyboardEvent) => {
      if (!event.repeat && !this.isGameplayInputLocked() && this.gameMode !== 'travel') this.hud.toggleStoryJournal();
    });
    this.input.keyboard?.on('keydown-M', (event: KeyboardEvent) => {
      if (!event.repeat && !this.isGameplayInputLocked()) this.hud.toggleWorldMap();
    });
    const skillKeys = ['keydown-Q', 'keydown-W', 'keydown-E', 'keydown-R', 'keydown-T'];
    for (const [index, key] of skillKeys.entries()) this.input.keyboard?.on(key, () => {
      const skillId = this.simulation.isOsakaMudang()
        ? SHAMAN_ACTIVE_SKILL_IDS[index]
        : this.simulation.isFrontierArcher() && this.simulation.isBowEquipped()
          ? ARCHER_ACTIVE_SKILL_IDS[index]
          : SWORD_ACTIVE_SKILL_IDS[index];
      if (skillId && !this.isGameplayInputLocked() && this.gameMode !== 'travel') this.simulation.castSkill(skillId);
    });
    if (import.meta.env.DEV) {
      this.input.keyboard?.on('keydown-F10', () => {
        this.enterDungeonWhenReady(() => {
          while (this.simulation.dungeonFloor < 10 && !this.simulation.isDungeonExitLocked()) {
            this.simulation.advanceDungeonFloor();
          }
        });
      });
      this.input.keyboard?.on('keydown-F9', () => {
        if (this.simulation.boss?.alive) this.simulation.damageBoss(Number.MAX_SAFE_INTEGER);
      });
      this.input.keyboard?.on('keydown-F7', () => this.toggleDevEquipment('worn-hwando'));
      this.input.keyboard?.on('keydown-F6', () => this.toggleDevEquipment('hunter-durumagi'));
      this.input.keyboard?.on('keydown-F8', () => {
        const route: RegionId[] = [...ULLEUNG_REGION_IDS];
        const nextRegion = route[(Math.max(0, route.indexOf(this.simulation.region)) + 1) % route.length];
        const origin = REGION_ORIGINS[nextRegion];
        const y = origin.y + (nextRegion === 'ulleungdo' ? 680 : nextRegion === 'ulleungvillage' ? 180 : 520);
        this.simulation.player.x = ulleungRoadCenterAtY(y);
        this.simulation.player.y = y;
        this.simulation.player.destination = null;
        this.simulation.update(0.001);
      });
    }

    this.scale.on('resize', () => this.fitCamera());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.canWriteSinglePlayerSave()) {
        this.singlePlayerSave?.flushLocal(this.simulation.exportSinglePlayerSnapshot());
      }
      this.saveLifecycleCleanup?.();
      this.saveLifecycleCleanup = null;
      this.onlineClient?.disconnect();
      this.onlineClient = null;
      this.royalRefugeDom?.remove();
      this.royalRefugeDom = null;
      this.prologueDom?.remove();
      this.prologueDom = null;
      this.closeGwanghaePathChoice(false);
      this.storyDirector?.destroy();
      this.storyDirector = null;
      this.activeStoryBeat = null;
      delete document.body.dataset.cinematic;
      delete document.body.dataset.inputLocked;
      this.hud.destroy();
      this.tweens.resumeAll();
      this.anims.resumeAll();
    });
    this.fitCamera();
    this.finishBootLoader();
    if (shouldPlayOpeningPrologue()) this.time.delayedCall(760, () => this.playOpeningPrologue());
  }

  update(_: number, delta: number): void {
    if (!this.gameStarted) return;
    if (this.prologueActive || this.storyDirector?.isOpen || this.gwanghaeChoiceDom !== null || this.royalRefugeDom !== null) return;
    if (this.canWriteSinglePlayerSave()) {
      this.autosaveAccumulator += delta;
      if (this.autosaveAccumulator >= AUTOSAVE_INTERVAL_MS) {
        this.autosaveAccumulator = 0;
        this.saveSinglePlayer();
      }
    }
    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - delta);
      if (this.hitStopMs === 0) this.endHitStop();
      this.syncPlayerEquipmentLayers();
      return;
    }
    if (this.menuOpen) {
      this.flushEventsAndHud(delta);
      return;
    }
    this.simulation.update(delta / 1000);
    if (
      (this.simulation.isFrontierArcher() || this.simulation.isGwanghaePrince())
      && this.simulation.region === 'gyeongbokinner'
      && this.royalKingPosition
      && this.simulation.getRoyalRefugeState().status === 'locked'
      && Phaser.Math.Distance.Between(
        this.simulation.player.x,
        this.simulation.player.y,
        this.royalKingPosition.x,
        this.royalKingPosition.y,
      ) <= 150
    ) {
      this.simulation.beginRoyalRefugeAtKing();
    }
    this.attackLock = Math.max(0, this.attackLock - delta / 1000);
    this.syncPlayer(delta);
    this.syncBuildingOcclusion(delta);
    this.syncPlayerEquipmentLayers();
    this.syncOnlinePlayers(delta);
    this.heavyRenderAccumulator += delta;
    const refreshHeavyViews = !this.mobileProfile || this.heavyRenderAccumulator >= 33;
    if (refreshHeavyViews) {
      const heavyRenderDelta = this.mobileProfile ? this.heavyRenderAccumulator : delta;
      this.heavyRenderAccumulator = 0;
      this.syncMonsters();
      this.syncFollowers();
      this.syncVillageNpcs(heavyRenderDelta);
    }
    this.syncBoss();
    this.syncGroundItems();
    this.syncCorpses(delta);
    this.flushEventsAndHud(delta);
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('perfqa') === '1') {
      this.perfProbeAccumulator += delta;
      if (this.perfProbeAccumulator >= 500) {
        this.perfProbeAccumulator = 0;
        document.body.dataset.actualFps = this.game.loop.actualFps.toFixed(1);
        document.body.dataset.activeTweens = String(this.tweens.getTweens().filter((tween) => tween.isPlaying()).length);
        document.body.dataset.totalTweens = String(this.tweens.getTweens().length);
        document.body.dataset.activeMonsters = String(this.simulation.monsters.filter((monster) => monster.region === this.simulation.region).length);
        document.body.dataset.displayObjects = String(this.children.list.length);
        document.body.dataset.visibleObjects = String(this.children.list.filter((object) => (object as Phaser.GameObjects.GameObject & { visible?: boolean }).visible !== false).length);
      }
    }
  }

  private playOpeningPrologue(): void {
    if (this.prologueActive) return;
    this.prologueActive = true;
    const hudRoot = document.querySelector<HTMLElement>('#hud');
    hudRoot?.classList.add('is-cinematic');
    this.playerRoot.setVisible(false);
    this.destinationMark.setVisible(false);
    for (const npc of this.villageNpcs) {
      npc.root.setVisible(false);
      npc.label.setVisible(false);
      npc.rallyMarker?.setVisible(false);
      npc.hitZone.setVisible(false);
      if (npc.hitZone.input) npc.hitZone.input.enabled = false;
    }
    for (const view of this.monsterViews.values()) {
      view.root.setVisible(false);
      view.hitZone.setVisible(false);
      if (view.hitZone.input) view.hitZone.input.enabled = false;
      view.hp.setVisible(false);
    }

    const origin = REGION_ORIGINS.ulleungvillage;
    const stage = { x: origin.x + 768, y: origin.y + 520 };
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(origin.x, origin.y, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.centerOn(stage.x, stage.y - 40);
    this.cameras.main.fadeIn(500, 8, 8, 7);

    const veil = this.add.rectangle(0, 0, this.scale.gameSize.width, this.scale.gameSize.height, 0x090b0a, 0.22)
      .setOrigin(0).setScrollFactor(0).setDepth(9800);
    const topBar = this.add.rectangle(0, 0, this.scale.gameSize.width, 58, 0x050606, 0.94)
      .setOrigin(0).setScrollFactor(0).setDepth(10000);
    const bottomBar = this.add.rectangle(0, this.scale.gameSize.height, this.scale.gameSize.width, 112, 0x050606, 0.94)
      .setOrigin(0, 1).setScrollFactor(0).setDepth(10000);
    const chapter = this.add.text(this.scale.gameSize.width / 2, 27, '서장  ·  울릉 관청의 피바람', {
      fontFamily: 'serif', fontSize: '18px', fontStyle: 'bold', color: '#d8c28e', letterSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
    this.prologueObjects.push(veil, topBar, bottomBar, chapter);
    const cinematicUi = document.createElement('section');
    cinematicUi.className = 'opening-cinematic';
    cinematicUi.setAttribute('aria-live', 'assertive');
    cinematicUi.innerHTML = `
      <div class="opening-cinematic__location">울릉 관청 · 형벌 마당</div>
      <button class="opening-cinematic__skip" type="button">건너뛰기 〉</button>
      <div class="opening-cinematic__caption">
        <strong class="opening-cinematic__speaker"></strong>
        <p class="opening-cinematic__line"></p>
      </div>`;
    document.body.appendChild(cinematicUi);
    this.prologueDom = cinematicUi;
    cinematicUi.querySelector<HTMLButtonElement>('.opening-cinematic__skip')?.addEventListener('click', () => this.finishOpeningPrologue());
    const speaker = cinematicUi.querySelector<HTMLElement>('.opening-cinematic__speaker')!;
    const dialogue = cinematicUi.querySelector<HTMLElement>('.opening-cinematic__line')!;

    const makeActor = (x: number, y: number, texture: string, frame: number, scale: number, tint = 0xffffff): PrologueActor => {
      const shadow = this.add.ellipse(0, 5, 66, 20, 0x080807, 0.48);
      const sprite = this.add.sprite(0, 0, texture, frame).setOrigin(0.5, 0.97).setScale(scale).setTint(tint);
      const root = this.add.container(x, y, [shadow, sprite]).setDepth(y + 20);
      this.prologueObjects.push(root);
      return { root, sprite, shadow };
    };
    const faceActorToward = (actor: PrologueActor, target: PrologueActor) => {
      actor.sprite.setFlipX(target.root.x > actor.root.x);
    };
    const brother = makeActor(stage.x - 155, stage.y + 48, ASSETS.playerFullyEquipped.key, 16, 0.57, 0xe8e1d3);
    const donghyeok = makeActor(stage.x - 285, stage.y + 86, ASSETS.playerUnequipped.key, 16, 0.51, 0xd9c3ae);
    const villagers = [
      makeActor(stage.x - 350, stage.y - 25, ASSETS.ulleungOppressedVillager.key, 16, 0.48, 0xa99b86),
      makeActor(stage.x - 292, stage.y - 78, ASSETS.ulleungOppressedVillager.key, 16, 0.46, 0x8f9989),
      makeActor(stage.x - 230, stage.y - 42, ASSETS.villageCommoner.key, 16, 0.47, 0xa88370),
    ];
    const guards = [
      makeActor(stage.x + 58, stage.y + 4, ASSETS.monsters['ulleung-guard'].key, 16, 0.51),
      makeActor(stage.x + 160, stage.y + 62, ASSETS.monsters['ulleung-veteran'].key, 16, 0.52, 0xc7d2d9),
      makeActor(stage.x + 250, stage.y - 8, ASSETS.monsters['ulleung-executioner'].key, 16, 0.55, 0xb88d82),
      makeActor(stage.x + 330, stage.y + 74, ASSETS.monsters['ulleung-captain'].key, 16, 0.54, 0xd2b66e),
    ];
    const official = makeActor(stage.x + 365, stage.y - 82, ASSETS.monsters['ulleung-magistrate'].key, 16, 0.47);
    const setLine = (name: string, line: string, color = '#c99c58') => {
      speaker.textContent = name;
      speaker.style.color = color;
      dialogue.textContent = line;
      dialogue.classList.remove('is-changing');
      void dialogue.offsetWidth;
      dialogue.classList.add('is-changing');
    };
    const bloodBurst = (actor: PrologueActor, amount = 8) => {
      const pool = this.add.ellipse(actor.root.x, actor.root.y + 5, 22, 8, 0x681c18, 0.72).setDepth(actor.root.y - 2);
      this.prologueObjects.push(pool);
      this.tweens.add({ targets: pool, scaleX: 2.4, scaleY: 1.7, alpha: 0.54, duration: 700, ease: 'Cubic.easeOut' });
      for (let index = 0; index < amount; index += 1) {
        const drop = this.add.circle(actor.root.x, actor.root.y - 46, 2 + index % 3, 0x8e2820, 0.9).setDepth(actor.root.y + 80);
        this.prologueObjects.push(drop);
        this.tweens.add({ targets: drop, x: actor.root.x + (index - amount / 2) * 8, y: actor.root.y + 3 + (index % 2) * 5, alpha: 0.15, duration: 320 + index * 22 });
      }
    };
    const killGuard = (guard: PrologueActor, delay = 0) => {
      this.prologueTimers.push(this.time.delayedCall(delay, () => {
        bloodBurst(guard, 6);
        guard.sprite.setTintFill(0xffb0a0);
        this.tweens.add({ targets: guard.sprite, angle: 78, y: 10, alpha: 0.48, duration: 400, ease: 'Cubic.easeIn' });
        this.shakeCamera(90, 0.004);
        this.combatAudio.impact(false);
      }));
    };
    // Korean story lines need enough dwell time on small screens. Keep the
    // authored sequence intact while stretching every beat uniformly.
    const prologueReadingPace = 1.85;
    const at = (delay: number, action: () => void) => this.prologueTimers.push(
      this.time.delayedCall(Math.round(delay * prologueReadingPace), action),
    );

    villagers.forEach((villager, index) => villager.sprite.setFrame(16 + (index % 2)));
    setLine('김무혁 · 전설의 검사', '이방 나리, 흉년으로 아이들이 굶는데 세곡은 세 배가 되었습니다. 약탈을 멈추고 백성의 곡식을 돌려주십시오.');
    at(1750, () => setLine('울릉도 백성', '무혁 나리 말이 옳습니다. 씨앗곡식까지 빼앗기면 이번 겨울을 넘길 수 없습니다.', '#cdbb91'));
    at(3300, () => setLine('탐관오리 서병관', '백성이 굶는 건 게으른 탓이다. 칼 좀 쓴다는 놈이 감히 관아의 세법을 논해?', '#d47d67'));
    at(4800, () => setLine('김무혁', '법은 백성을 살리라고 있는 것입니다. 백성을 죽이는 명은 따를 수 없습니다.'));
    at(6100, () => setLine('탐관오리 서병관', '저 형제와 탄원한 자들을 모조리 묶어라. 거역하면 그 자리에서 베어도 좋다!', '#d47d67'));
    at(7100, () => {
      faceActorToward(brother, guards[0]);
      guards[0].sprite.play('monster-walk-ulleung-guard-2', true);
      this.tweens.add({ targets: guards[0].root, x: stage.x - 42, y: stage.y + 35, duration: 620, onComplete: () => guards[0].sprite.stop() });
      brother.sprite.play('npc-walk-fully-equipped-2', true);
      this.tweens.add({ targets: brother.root, x: stage.x - 72, duration: 560, onComplete: () => brother.sprite.stop() });
      setLine('김무혁', '동혁아, 백성들 앞을 막아라. 내가 살아 있는 한 누구도 건드리지 못한다.');
    });
    at(7900, () => {
      faceActorToward(brother, guards[0]);
      brother.sprite.play('npc-attack-fully-equipped-2', true);
      this.createSlashFx(stage.x - 80, stage.y - 18, guards[0].root.x, guards[0].root.y - 42, 0, true);
      killGuard(guards[0], 180);
      killGuard(guards[1], 330);
    });
    at(9000, () => setLine('김무혁', '관복 뒤에 숨은 도적들아, 오늘 흘린 백성의 눈물을 네 피로 갚아라.'));
    at(10100, () => {
      guards[2].sprite.play('monster-attack-ulleung-executioner-2', true);
      guards[3].sprite.play('monster-attack-ulleung-captain-2', true);
      this.tweens.add({ targets: [guards[2].root, guards[3].root], x: `-=95`, duration: 420 });
      faceActorToward(brother, guards[2]);
      brother.sprite.play('npc-attack-fully-equipped-2', true);
      killGuard(guards[2], 230);
    });
    at(10900, () => {
      brother.sprite.setTintFill(0xff9b8d);
      bloodBurst(brother, 11);
      this.tweens.add({ targets: brother.root, x: brother.root.x - 16, duration: 90, yoyo: true, repeat: 2 });
      this.shakeCamera(180, 0.007);
      this.combatAudio.impact(true);
      setLine('포졸 대장', '전설도 피를 흘리는군. 무릎을 꿇어라!', '#d47d67');
    });
    at(11900, () => {
      setLine('김무혁', '내 무릎은 백성 앞에서만 꿇는다. 네놈 앞에서는 죽어서도 서 있으리라.');
      faceActorToward(brother, official);
      brother.sprite.clearTint().play('npc-attack-fully-equipped-3', true);
      this.tweens.add({ targets: brother.root, x: official.root.x - 42, y: official.root.y + 20, duration: 520 });
    });
    at(12550, () => {
      bloodBurst(official, 5);
      official.sprite.setTintFill(0xff9b8d);
      this.tweens.add({ targets: official.root, x: official.root.x + 48, duration: 180, yoyo: true });
      this.createSlashFx(brother.root.x, brother.root.y - 46, official.root.x, official.root.y - 48, -0.7, true);
      this.cameras.main.flash(110, 126, 24, 18, false);
      this.shakeCamera(220, 0.009);
      this.combatAudio.impact(true);
    });
    at(13300, () => {
      guards[3].sprite.play('monster-attack-ulleung-captain-2', true);
      bloodBurst(brother, 14);
      brother.sprite.setTint(0xb65d55);
      this.tweens.add({ targets: brother.sprite, angle: -72, y: 14, alpha: 0.7, duration: 780, ease: 'Cubic.easeIn' });
      setLine('김무혁', '동혁아... 복수에 네 마음을 잃지는 마라. 칼은 미움을 위해서가 아니라, 울고 있는 백성을 위해 드는 것이다...');
    });
    at(15100, () => {
      official.sprite.clearTint();
      guards[3].sprite.play('monster-walk-ulleung-captain-2', true);
      this.tweens.add({ targets: guards[3].root, x: donghyeok.root.x + 34, y: donghyeok.root.y, duration: 560 });
      setLine('탐관오리 서병관', '형의 시체는 성문에 내걸고, 동생 김동혁은 감옥에 처넣어라. 평생 오늘을 후회하게 해주마.', '#d47d67');
    });
    at(16500, () => {
      donghyeok.sprite.setFrame(20).setTint(0xb9aaa0);
      setLine('김동혁', '형... 이 밤을 잊지 않겠습니다. 살아서 반드시 백성들에게 빼앗긴 것을 돌려놓겠습니다.');
    });
    at(18000, () => {
      chapter.setText('형은 전사했고, 동생 김동혁은 관청 감옥에 갇혔다.');
      speaker.textContent = '';
      dialogue.textContent = '잠시 후 · 울릉 관청 감옥터';
      this.cameras.main.fadeOut(900, 5, 5, 5);
    });
    at(19000, () => this.finishOpeningPrologue());
  }

  private finishOpeningPrologue(): void {
    if (!this.prologueActive) return;
    this.prologueActive = false;
    for (const timer of this.prologueTimers) timer.remove(false);
    this.prologueTimers = [];
    for (const object of this.prologueObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.prologueObjects = [];
    this.prologueDom?.remove();
    this.prologueDom = null;
    document.querySelector<HTMLElement>('#hud')?.classList.remove('is-cinematic');
    this.playerRoot.setVisible(true);
    this.syncVillageNpcs(0);
    for (const monster of this.simulation.monsters) {
      const view = this.monsterViews.get(monster.id);
      if (view) this.resetMonsterView(monster, view);
    }
    this.cameras.main.setBounds(
      ULLEUNG_WORLD_BOUNDS.x,
      ULLEUNG_WORLD_BOUNDS.y,
      ULLEUNG_WORLD_BOUNDS.width,
      ULLEUNG_WORLD_BOUNDS.height,
    );
    this.cameras.main.startFollow(this.playerRoot, true, 0.085, 0.085);
    this.cameras.main.fadeIn(650, 9, 9, 8);
    this.alertMarker(this.simulation.player.x, this.simulation.player.y - 120, '김동혁: “형님, 잘 가십시오. 그 뜻은 제가 잇겠습니다.”', 2200);
    this.rememberStoryBeat({
      chapter: 1,
      completed: 1,
      title: '제1장 · 형의 마지막 밤',
      objective: '형 김무혁의 유언과 관아의 수탈 명령을 기억하고 감옥에서 살아 나가십시오.',
    });
    this.storyNarrativeReady = true;
    this.hudAccumulator = HUD_UPDATE_INTERVAL;
    this.checkpointSinglePlayer();
  }

  private playGwanghaeOpeningPrologue(): void {
    if (this.prologueActive || !this.simulation.isGwanghaePrince()) return;
    this.prologueActive = true;
    document.body.dataset.cinematic = 'gwanghae-opening';
    document.body.dataset.inputLocked = 'true';
    document.querySelector<HTMLElement>('#hud')?.classList.add('is-cinematic');
    this.playerRoot.setVisible(false);
    this.destinationMark.setVisible(false);
    for (const npc of this.villageNpcs) {
      npc.root.setVisible(false);
      npc.label.setVisible(false);
      npc.rallyMarker?.setVisible(false);
      npc.hitZone.setVisible(false);
      if (npc.hitZone.input) npc.hitZone.input.enabled = false;
    }
    for (const view of this.monsterViews.values()) {
      view.root.setVisible(false);
      view.hitZone.setVisible(false);
      if (view.hitZone.input) view.hitZone.input.enabled = false;
      view.hp.setVisible(false);
    }

    const origin = REGION_ORIGINS.changdeokgung;
    const stage = { x: origin.x + 768, y: origin.y + 555 };
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(origin.x, origin.y, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.centerOn(stage.x, stage.y - 55);
    this.cameras.main.fadeIn(420, 7, 8, 8);

    const veil = this.add.rectangle(0, 0, this.scale.gameSize.width, this.scale.gameSize.height, 0x070a0a, 0.28)
      .setOrigin(0).setScrollFactor(0).setDepth(9800);
    const topBar = this.add.rectangle(0, 0, this.scale.gameSize.width, 58, 0x050606, 0.95)
      .setOrigin(0).setScrollFactor(0).setDepth(10000);
    const bottomBar = this.add.rectangle(0, this.scale.gameSize.height, this.scale.gameSize.width, 124, 0x050606, 0.95)
      .setOrigin(0, 1).setScrollFactor(0).setDepth(10000);
    const chapter = this.add.text(this.scale.gameSize.width / 2, 27, '광해 서막  ·  떠나는 임금, 남겨진 세자', {
      fontFamily: 'serif', fontSize: '18px', fontStyle: 'bold', color: '#d8c28e', letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
    this.prologueObjects.push(veil, topBar, bottomBar, chapter);

    const makeActor = (x: number, y: number, texture: string, frame: number, scale: number, tint = 0xffffff): PrologueActor => {
      const shadow = this.add.ellipse(0, 5, 62, 19, 0x070807, 0.46);
      const sprite = this.add.sprite(0, 0, texture, frame).setOrigin(0.5, 0.97).setScale(scale).setTint(tint);
      const root = this.add.container(x, y, [shadow, sprite]).setDepth(y + 20);
      this.prologueObjects.push(root);
      return { root, sprite, shadow };
    };

    const king = makeActor(stage.x + 150, stage.y - 65, ASSETS.monsters['joseon-prince'].key, 16, 0.49, 0xf0d89d);
    const gwanghae = makeActor(stage.x - 45, stage.y + 52, ASSETS.gwanghaePrince.key, 16, 0.51, 0xe8d7ac);
    const secretary = makeActor(stage.x + 38, stage.y - 5, ASSETS.villageCommoner.key, 16, 0.48, 0xc9b898);
    const messenger = makeActor(stage.x + 335, stage.y + 42, ASSETS.monsters['royal-guard'].key, 16, 0.50, 0xc7d2d9);
    const guards = [
      makeActor(stage.x + 238, stage.y - 4, ASSETS.monsters['royal-guard'].key, 16, 0.50, 0xd1c6a8),
      makeActor(stage.x + 300, stage.y - 54, ASSETS.monsters['royal-guard'].key, 16, 0.50, 0xb9c8c8),
    ];
    const people = [
      makeActor(stage.x - 285, stage.y + 18, ASSETS.villageCommoner.key, 16, 0.47, 0xa99177),
      makeActor(stage.x - 345, stage.y + 78, ASSETS.ulleungOppressedVillager.key, 16, 0.47, 0xa7a08f),
    ];

    const cinematicUi = document.createElement('section');
    cinematicUi.className = 'opening-cinematic opening-cinematic--gwanghae';
    cinematicUi.setAttribute('aria-live', 'polite');
    cinematicUi.innerHTML = `
      <div class="opening-cinematic__location">한성 북문 앞 · 선조의 몽진 행렬</div>
      <button class="opening-cinematic__skip" type="button">건너뛰기 〉</button>
      <div class="opening-cinematic__caption">
        <strong class="opening-cinematic__speaker"></strong>
        <p class="opening-cinematic__line"></p>
        <button class="opening-cinematic__advance" type="button">다음 대사</button>
      </div>`;
    document.body.appendChild(cinematicUi);
    this.prologueDom = cinematicUi;
    const location = cinematicUi.querySelector<HTMLElement>('.opening-cinematic__location')!;
    const speaker = cinematicUi.querySelector<HTMLElement>('.opening-cinematic__speaker')!;
    const dialogue = cinematicUi.querySelector<HTMLElement>('.opening-cinematic__line')!;
    const advance = cinematicUi.querySelector<HTMLButtonElement>('.opening-cinematic__advance')!;
    const setLine = (name: string, line: string, color = '#c99c58') => {
      speaker.textContent = name;
      speaker.style.color = color;
      dialogue.textContent = line;
      dialogue.classList.remove('is-changing');
      void dialogue.offsetWidth;
      dialogue.classList.add('is-changing');
    };

    const steps: Array<() => void> = [
      () => {
        messenger.sprite.setFlipX(true).play('monster-walk-royal-guard-2', true);
        this.tweens.add({
          targets: messenger.root, x: stage.x + 205, duration: 650, ease: 'Sine.easeOut',
          onComplete: () => messenger.sprite.stop().setFrame(16),
        });
        setLine('남도 파발군', '전하, 남쪽 군보가 끊겼습니다. 왜군 선봉이 이미 도성으로 다가오고 있습니다!', '#d9836f');
      },
      () => {
        king.sprite.setFrame(32);
        guards.forEach((guard) => guard.sprite.setFrame(32));
        setLine('선조', '어가는 의주로 향한다. 명의 원병을 청해 종묘사직을 보전해야 한다. 북문을 당장 열라.');
      },
      () => {
        people[0].sprite.play('npc-work-commoner-2', true);
        setLine('도성 백성', '전하, 임금마저 떠나시면 굶주린 백성과 남은 군사는 누구를 믿고 버팁니까?', '#d8c8a4');
      },
      () => {
        location.textContent = '영변 행재소 · 분조 교서';
        chapter.setText('왕은 더 북으로, 책임은 세자에게');
        secretary.sprite.play('npc-work-commoner-3', true);
        gwanghae.sprite.play('npc-audience-gwanghae-4', true);
        setLine('선조', '광해는 이 땅에 남아 분조를 이끌라. 흩어진 관군과 군량, 의병의 수습까지 모두 네가 맡아라.');
      },
      () => {
        setLine('왕세자 광해', '전하, 제게 남겨 주실 군사와 군량은 얼마나 됩니까? 백성을 지킬 군영조차 이미 흩어졌습니다.', '#e3c66d');
      },
      () => {
        secretary.sprite.stop().setFrame(16);
        setLine('승정원 주서', '세자 저하, 전하를 호위할 금군은 함께 북상합니다. 남은 장계도 끊겨 분조가 직접 사람을 모아야 합니다.', '#c9baa0');
      },
      () => {
        king.sprite.play('monster-walk-joseon-prince-4', true);
        guards.forEach((guard) => guard.sprite.play('monster-walk-royal-guard-4', true));
        this.tweens.add({ targets: [king.root, ...guards.map((guard) => guard.root)], y: stage.y - 315, alpha: 0, duration: 1300, ease: 'Sine.easeIn' });
        setLine('선조', '나라를 수습하는 것이 세자의 도리다. 나는 더 북쪽으로 갈 것이니, 분조의 일을 장계로 올려라.');
      },
      () => {
        gwanghae.sprite.play('npc-audience-gwanghae-4', true);
        people.forEach((person) => person.root.setAlpha(1));
        setLine('왕세자 광해', '전하께서 떠나셔도 조정은 백성 곁에 남아야 한다. 일곱 고을의 의병을 모아 살아 있는 나라를 다시 세운다.', '#f0cf76');
        advance.textContent = '분조를 시작한다';
      },
    ];
    let stepIndex = 0;
    const showStep = () => {
      if (!this.prologueActive) return;
      if (stepIndex >= steps.length) {
        this.finishGwanghaeOpeningPrologue();
        return;
      }
      steps[stepIndex]();
      stepIndex += 1;
      advance.dataset.step = String(stepIndex);
    };
    advance.addEventListener('click', showStep);
    cinematicUi.querySelector<HTMLButtonElement>('.opening-cinematic__skip')
      ?.addEventListener('click', () => this.finishGwanghaeOpeningPrologue());
    showStep();
  }

  private finishGwanghaeOpeningPrologue(): void {
    if (!this.prologueActive) return;
    this.prologueActive = false;
    for (const timer of this.prologueTimers) timer.remove(false);
    this.prologueTimers = [];
    for (const object of this.prologueObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.prologueObjects = [];
    this.prologueDom?.remove();
    this.prologueDom = null;
    document.body.dataset.cinematic = 'none';
    document.body.dataset.inputLocked = 'false';
    document.querySelector<HTMLElement>('#hud')?.classList.remove('is-cinematic');
    this.playerRoot.setVisible(true);
    this.syncVillageNpcs(0);
    for (const monster of this.simulation.monsters) {
      const view = this.monsterViews.get(monster.id);
      if (view) this.resetMonsterView(monster, view);
    }
    this.fitCamera();
    this.cameras.main.fadeIn(520, 7, 8, 8);
    this.alertMarker(
      this.simulation.player.x,
      this.simulation.player.y - 120,
      '첫 임무 · 승정원 주서를 눌러 분조 의병 명부를 받으십시오.',
      3200,
    );
    this.rememberStoryBeat(this.resolveStoryProgress());
    this.storyNarrativeReady = true;
    this.hudAccumulator = HUD_UPDATE_INTERVAL;
    this.checkpointSinglePlayer();
  }

  private closeGwanghaePathChoice(restoreFocus = true): void {
    this.gwanghaeChoiceDom?.remove();
    this.gwanghaeChoiceDom = null;
    delete document.body.dataset.gwanghaeChoice;
    const hud = document.querySelector<HTMLElement>('#hud');
    hud?.removeAttribute('inert');
    hud?.removeAttribute('aria-hidden');
    const returnFocus = this.gwanghaeChoiceReturnFocus;
    this.gwanghaeChoiceReturnFocus = null;
    if (restoreFocus && returnFocus?.isConnected) {
      requestAnimationFrame(() => returnFocus.focus());
    }
  }

  private playGwanghaePathChoice(): void {
    if (this.gwanghaeChoiceDom || !this.simulation.isGwanghaePrince()) return;
    const progress = this.simulation.getGwanghaeRallyProgress();
    if (!progress.choiceReady) return;
    const root = document.createElement('section');
    root.className = 'gwanghae-path-choice';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'gwanghae-path-title');
    root.innerHTML = `
      <div class="gwanghae-path-choice__veil"></div>
      <div class="gwanghae-path-choice__panel">
        <span class="gwanghae-path-choice__eyebrow">광해 갈림길 · 되돌릴 수 없는 선택</span>
        <h2 id="gwanghae-path-title">왕좌인가, 왕명인가</h2>
        <p class="gwanghae-path-choice__lead">일곱 고을에서 의병 ${progress.recruits}명을 규합했습니다. 이 결정은 저장되며 이후 분조의 대사와 전쟁 기록을 바꿉니다.</p>
        <div class="gwanghae-path-choice__options">
          <button type="button" data-gwanghae-path="coup">
            <strong>쿠데타 · 분조 정변</strong>
            <span>백성을 버린 선조를 몰아내고 의병과 함께 새 조정을 세운다.</span>
            <small>의병 유지 · 조정군 세력 +4</small>
          </button>
          <button type="button" data-gwanghae-path="suppression">
            <strong>왕명 · 의병 진압</strong>
            <span>왕명을 따르며 해산을 거부한 의병을 진압하고 기존 질서를 지킨다.</span>
            <small>의병 55% 이탈 · 조정군 세력 +6</small>
          </button>
        </div>
        <p class="gwanghae-path-choice__status" aria-live="polite">두 길 중 하나를 선택하십시오.</p>
      </div>`;
    document.body.appendChild(root);
    this.gwanghaeChoiceDom = root;
    document.body.dataset.gwanghaeChoice = 'open';
    this.gwanghaeChoiceReturnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const hud = document.querySelector<HTMLElement>('#hud');
    hud?.setAttribute('inert', '');
    hud?.setAttribute('aria-hidden', 'true');
    const status = root.querySelector<HTMLElement>('.gwanghae-path-choice__status')!;
    const choiceButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-gwanghae-path]')];
    choiceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        choiceButtons.forEach((candidate) => { candidate.disabled = true; });
        status.textContent = '광해의 결단을 원정록에 기록하는 중…';
        const path = button.dataset.gwanghaePath as GwanghaeCampaignPath;
        const result = this.simulation.chooseGwanghaePath(path);
        if (!result.ok) {
          status.textContent = result.reason === 'rallies-incomplete'
            ? `아직 ${result.remaining ?? 0}곳의 의병이 더 필요합니다.`
            : '이미 광해의 길을 선택했습니다.';
          choiceButtons.forEach((candidate) => { candidate.disabled = false; });
          return;
        }
        const battle = this.simulation.beginGwanghaePathBattle();
        if (battle) {
          this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
          this.lastPlayerSimulationPosition = {
            x: this.simulation.player.x,
            y: this.simulation.player.y,
          };
          this.releaseInactiveMonsterViews(battle.region);
        }
        this.storyNarrativeReady = true;
        this.checkpointSinglePlayer();
        this.flushEventsAndHud(0);
        this.closeGwanghaePathChoice();
        this.alertMarker(
          this.simulation.player.x,
          this.simulation.player.y - 126,
          battle
            ? `${result.title} · ${battle.title}으로 즉시 진군합니다. 전투 목표 ${battle.total}명을 제압하십시오.`
            : `${result.title} · ${result.message}`,
          5200,
        );
      });
    });
    choiceButtons[0]?.focus();
  }

  private flushEventsAndHud(delta: number): void {
    const events = this.simulation.drainEvents();
    for (const event of events) this.handleEvent(event);
    if (events.some((event) => SAVE_CHECKPOINT_EVENT_TYPES.has(event.type))) {
      this.checkpointSinglePlayer();
    }
    this.hudAccumulator += delta;
    if (events.length > 0 || this.hudAccumulator >= HUD_UPDATE_INTERVAL) {
      this.hudAccumulator = 0;
      const storyProgress = this.resolveStoryProgress();
      const storyState = this.simulation.getStoryCampaignState();
      this.hud.update({
        region: this.simulation.region,
        worldMapUnlocked: this.simulation.getUnlockedWorldMapRegions(),
        playerOrigin: this.simulation.getPlayerOrigin(),
        dungeonFloor: this.simulation.dungeonFloor,
        player: this.simulation.player,
        target: this.simulation.getTarget() ?? this.simulation.getBossTarget(),
        inventory: this.simulation.inventory,
        equipment: this.simulation.equipment,
        inventoryCapacity: this.simulation.inventoryCapacity,
        attackPower: this.simulation.getAttackPower(),
        defense: this.simulation.getDefense(),
        accuracy: this.simulation.getAccuracy(),
        evasion: this.simulation.getEvasion(),
        weaponEnchantLevel: this.simulation.getWeaponEnchantLevel(),
        armorEnchantLevel: this.simulation.getArmorEnchantLevel(),
        skillRanks: this.simulation.skillRanks,
        skillCooldowns: this.simulation.skillCooldowns,
        skillPoints: this.simulation.skillPoints,
        attributes: this.simulation.getAttributeState(),
        derivedAttributes: this.simulation.getDerivedAttributeBonuses(),
        followers: this.simulation.followers,
        activeWorldEvent: this.simulation.activeWorldEvent,
        huntKills: this.simulation.huntKills,
        craftedRecipes: [...this.simulation.craftedRecipes],
        questProgress: this.resolveQuestProgress(),
        storyProgress,
        storyState,
        settings: this.gameSettings,
        hajinArmy: this.simulation.getHajinArmyStatus(),
        gwanghaeArmy: this.simulation.getGwanghaeArmyStatus(),
        factionWar: this.simulation.getFactionWarSnapshot(),
      });
      this.syncStoryBeat(storyProgress, storyState);
    }
  }

  private isNarrativeGameMode(): boolean {
    return this.gameMode === 'story'
      || this.gameMode === 'archer'
      || this.gameMode === 'mudang'
      || this.gameMode === 'gwanghae';
  }

  private directedStoryBeat(beat: CampaignStoryBeat): DirectedStoryBeat {
    return {
      id: beat.id,
      chapter: beat.chapter,
      title: beat.title,
      location: beat.location,
      objective: beat.objective,
      lines: beat.lines.map((line) => ({ speaker: line.speaker, text: line.text })),
      choices: beat.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        description: choice.detail,
        consequence: choice.consequence,
      })),
    };
  }

  private playStoryBeat(beat: CampaignStoryBeat, replay = false): boolean {
    if (!this.storyDirector || this.storyDirector.isOpen || this.activeStoryBeat) return false;
    if (!replay && hasSeenStoryBeat(this.simulation.getStoryCampaignState(), beat.id)) return false;
    this.activeStoryBeat = beat;
    const opened = this.storyDirector.play(this.directedStoryBeat(beat));
    if (!opened) this.activeStoryBeat = null;
    return opened;
  }

  private syncStoryBeat(progress: StoryProgress, state = this.simulation.getStoryCampaignState()): void {
    if (!this.storyNarrativeReady || !this.isNarrativeGameMode() || this.isGameplayInputLocked()) return;
    const origin = this.simulation.getPlayerOrigin();
    if (state.origin !== origin) return;
    const beat = createStoryBeat(origin, progress, REGIONS[this.simulation.region].name);
    if (!hasSeenStoryBeat(state, beat.id)) this.playStoryBeat(beat);
  }

  private replayCurrentStoryBeat(): void {
    if (!this.storyNarrativeReady || !this.isNarrativeGameMode() || this.isGameplayInputLocked()) return;
    const beat = createStoryBeat(
      this.simulation.getPlayerOrigin(),
      this.resolveStoryProgress(),
      REGIONS[this.simulation.region].name,
    );
    this.playStoryBeat(beat, true);
  }

  private rememberStoryBeat(progress: StoryProgress): void {
    const beat = createStoryBeat(
      this.simulation.getPlayerOrigin(),
      progress,
      REGIONS[this.simulation.region].name,
    );
    this.simulation.setStoryCampaignState(completeStoryBeat(
      this.simulation.getStoryCampaignState(),
      beat,
    ));
  }

  private resolveQuestProgress(): QuestProgress {
    const activeEvent = this.simulation.activeWorldEvent;
    const activeGoal = activeEvent?.goal;
    if (activeEvent?.region === this.simulation.region && activeGoal) {
      return {
        label: `사건 목표 ${activeEvent.progress ?? 0} / ${activeGoal}`,
        ratio: Math.min(1, (activeEvent.progress ?? 0) / activeGoal),
      };
    }
    if (this.simulation.isGwanghaePrince()) {
      const progress = this.simulation.getGwanghaeRallyProgress();
      const battle = this.simulation.getGwanghaePathBattleProgress();
      const refuge = this.simulation.getRoyalRefugeBattleProgress();
      if (progress.path === 'coup' && this.simulation.getRoyalRefugeState().status === 'awaiting-route') {
        return { label: '선조의 피난로 선택 · 남한산성 또는 강화도', ratio: 1 };
      }
      if (progress.path === 'coup' && isRoyalRefugeRegion(this.simulation.region)
        && refuge.status !== 'locked') {
        const stageIndex = refuge.stageIndex ?? 0;
        const stageName = refuge.stageName ?? '왕실 피난처 방어선';
        return {
          label: refuge.cleared
            ? `${stageName} 확보 · ${stageIndex === 2 ? '최종 방어 붕괴 · 왕의 퇴로 봉쇄' : '다음 방어선 개방'}`
            : `${stageIndex + 1}/3 방어선 · 적 ${refuge.total - refuge.defeated}명 잔존`,
          ratio: refuge.total ? refuge.defeated / refuge.total : refuge.cleared ? 1 : 0,
        };
      }
      if (battle) {
        return battle.complete
          ? {
            label: battle.path === 'coup'
              ? this.simulation.region === 'gyeongbokinner'
                ? '내전 중앙의 선조에게 접근 · 왕을 시해하지 말고 퇴로를 봉쇄'
                : '광화문 북문으로 진격 · 근정전과 내전을 지나 선조를 추궁'
              : `${battle.title} 완수`,
            ratio: 1,
          }
          : {
            label: `${battle.title} · 적 잔존 ${battle.enemyRemaining} / ${battle.total}`,
            ratio: battle.total > 0 ? battle.defeated / battle.total : 0,
          };
      }
      if (progress.choiceReady) {
        return { label: '일곱 고을 규합 완료 · 광해의 길을 선택하십시오', ratio: 1 };
      }
      const localPoint = progress.points.find((point) => point.region === this.simulation.region && !point.completed);
      if (localPoint) {
        const npcName = JOSEON_TOWN_LAYOUTS[localPoint.region].npcs
          .find((npc) => npc.id === localPoint.npcId)?.name ?? localPoint.label;
        return {
          label: localPoint.available
            ? `◆ ${npcName} 클릭 · 의병 규합 ${progress.completed} / ${progress.total}`
            : `창덕궁 분조 명부 먼저 · ${progress.completed} / ${progress.total}`,
          ratio: progress.completed / progress.total,
        };
      }
      const next = progress.points.find((point) => point.available && !point.completed);
      const currentRoadIndex = JOSEON_TOWN_REGION_IDS.indexOf(
        this.simulation.region as JoseonTownRegionId,
      );
      const nextRoadIndex = next ? JOSEON_TOWN_REGION_IDS.indexOf(next.region) : -1;
      const roadHint = currentRoadIndex < 0 || nextRoadIndex < 0
        ? '세계지도(M)'
        : nextRoadIndex < currentRoadIndex
          ? '북문 또는 세계지도(M)'
          : nextRoadIndex > currentRoadIndex
            ? '남문 또는 세계지도(M)'
            : '고을 안의 표시 인물';
      return {
        label: next
          ? `다음 모집지 ${REGIONS[next.region].name} · ${roadHint} · ${next.label} (${progress.completed}/${progress.total})`
          : `의병 규합 ${progress.completed} / ${progress.total}`,
        ratio: progress.completed / progress.total,
      };
    }
    if (this.simulation.isFrontierArcher() && this.simulation.region === 'jurchenvillage') {
      const progress = this.simulation.getJurchenUnificationProgress();
      return {
        label: progress.unified
          ? '대회맹 완성 · 압록 설욕전 개방'
          : `부족 통합 ${progress.alliedTribes} / ${progress.totalTribes} · 시험 ${progress.clearedStages} / ${progress.totalStages}`,
        ratio: progress.totalStages > 0 ? progress.clearedStages / progress.totalStages : 0,
      };
    }
    if (this.simulation.isFrontierArcher()
      && JURCHEN_EXPANSION_REGION_IDS.includes(
        this.simulation.region as typeof JURCHEN_EXPANSION_REGION_IDS[number],
      )) {
      const region = this.simulation.region as typeof JURCHEN_EXPANSION_REGION_IDS[number];
      const progress = this.simulation.getJurchenStageProgress(region);
      return {
        label: progress.cleared
          ? `MISSION CLEAR · ${JURCHEN_STAGE_COPY[region].next}`
          : `${JURCHEN_STAGE_COPY[region].title} ${progress.defeated} / ${progress.total}`,
        ratio: progress.total ? progress.defeated / progress.total : 1,
      };
    }
    if (this.simulation.isFrontierArcher() && this.simulation.region === 'manchufrontier') {
      const progress = this.simulation.getHajinMissionProgress();
      return {
        label: progress.cleared
          ? 'MISSION CLEAR · 남진 성문 개방'
          : `전선 제압 ${progress.defeated} / ${progress.total}`,
        ratio: progress.total > 0 ? progress.defeated / progress.total : 0,
      };
    }
    if (isJapanRegion(this.simulation.region)) {
      const progress = this.simulation.getJapanStageProgress(this.simulation.region);
      return {
        label: progress.cleared
          ? `MISSION CLEAR · ${JAPAN_STAGE_COPY[this.simulation.region].next}`
          : `${JAPAN_STAGE_COPY[this.simulation.region].title} ${progress.defeated} / ${progress.total}`,
        ratio: progress.total ? progress.defeated / progress.total : 1,
      };
    }
    if (this.simulation.activeWorldEvent) {
      const remaining = this.simulation.getWorldEventRemainingSeconds();
      return { label: `${Math.ceil(remaining)}초`, ratio: 1 - Math.min(1, remaining / 30) };
    }
    if (this.simulation.region === 'ulleungdo') {
      const guards = this.simulation.monsters.filter((monster) => monster.region === 'ulleungdo'
        && ['ulleung-guard', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain'].includes(monster.kind));
      const defeated = guards.filter((monster) => !monster.alive).length;
      return { label: `포졸 ${defeated} / ${guards.length}`, ratio: guards.length ? defeated / guards.length : 1 };
    }
    if (this.simulation.region === 'ulleungcoast') {
      const discovered = Number(this.simulation.hasDiscoveredLandmark('herb-patch'))
        + Number(this.simulation.hasDiscoveredLandmark('spirit-shrine'));
      return { label: `해안 탐색 ${discovered} / 2`, ratio: discovered / 2 };
    }
    if (this.simulation.region === 'ulleungmeadow') {
      const hunted = Math.min(6, (this.simulation.huntKills['ulleung-hare'] ?? 0)
        + (this.simulation.huntKills['ulleung-water-deer'] ?? 0));
      return { label: `초원 사냥 ${hunted} / 6`, ratio: hunted / 6 };
    }
    if (this.simulation.region === 'ulleunghunt') {
      const training = Math.min(3, this.simulation.getTreeTrainingCount());
      return { label: `해송 수련 ${training} / 3`, ratio: training / 3 };
    }
    if (this.simulation.region === 'ulleungridge') {
      const threats = this.simulation.monsters.filter((monster) => monster.region === 'ulleungridge'
        && ['ulleung-sangun', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain'].includes(monster.kind));
      const defeated = threats.filter((monster) => !monster.alive).length;
      return { label: `고개 위협 ${defeated} / ${threats.length}`, ratio: threats.length ? defeated / threats.length : 1 };
    }
    if (this.simulation.region === 'ulleungvillage') {
      const guards = this.simulation.monsters.filter((monster) => monster.region === 'ulleungvillage'
        && ['ulleung-guard', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain'].includes(monster.kind));
      const remainingGuards = guards.filter((monster) => monster.alive).length;
      const magistrate = this.simulation.monsters.find((monster) => monster.region === 'ulleungvillage' && monster.kind === 'ulleung-magistrate');
      if (remainingGuards > 0) {
        return { label: `잔당 ${guards.length - remainingGuards} / ${guards.length}`, ratio: (guards.length - remainingGuards) / guards.length };
      }
      const bossRatio = magistrate && magistrate.maxHp > 0 ? 1 - magistrate.hp / magistrate.maxHp : 0;
      return { label: magistrate?.alive ? '서병관 결전' : '본청 진입', ratio: bossRatio };
    }
    if (this.simulation.region === 'yeongwol') {
      const soldiers = this.simulation.monsters.filter((monster) => monster.region === 'yeongwol');
      const defeated = soldiers.filter((monster) => !monster.alive).length;
      return { label: `관군 ${defeated} / ${soldiers.length}`, ratio: soldiers.length ? defeated / soldiers.length : 1 };
    }
    if (this.simulation.region === 'yeongwolhq') {
      const soldiers = this.simulation.monsters.filter((monster) => monster.region === 'yeongwolhq');
      const defeated = soldiers.filter((monster) => !monster.alive).length;
      const commander = soldiers.find((monster) => monster.kind === 'yeongwol-commander');
      return {
        label: commander?.alive ? `정예 ${defeated} / ${soldiers.length}` : '지휘부 제압',
        ratio: soldiers.length ? defeated / soldiers.length : 1,
      };
    }
    if (this.simulation.region === 'jeonjufield' || this.simulation.region === 'jeonjugate' || this.simulation.region === 'jeonju') {
      const soldiers = this.simulation.monsters.filter((monster) => monster.region === this.simulation.region
        && monster.kind.startsWith('jeonju-'));
      const defeated = soldiers.filter((monster) => !monster.alive).length;
      return {
        label: this.simulation.region === 'jeonjufield'
          ? `수색대 ${defeated} / ${soldiers.length}`
          : this.simulation.region === 'jeonjugate'
            ? `성문군 ${defeated} / ${soldiers.length}`
            : `감영군 ${defeated} / ${soldiers.length}`,
        ratio: soldiers.length ? defeated / soldiers.length : 1,
      };
    }
    if (this.simulation.region === 'tangeumdae') {
      const progress = this.simulation.getTangeumBattleProgress();
      return {
        label: progress.cleared ? '왜군 전멸 · 북문 개방' : `전멸 ${progress.defeated} / ${progress.total}`,
        ratio: progress.total ? progress.defeated / progress.total : 1,
      };
    }
    if (isRoyalRefugeRegion(this.simulation.region)) {
      const progress = this.simulation.getRoyalRefugeBattleProgress();
      const stageIndex = progress.stageIndex ?? 0;
      const stageName = progress.stageName ?? '왕실 피난처 방어선';
      return {
        label: progress.cleared
          ? `${stageName} 확보 · ${stageIndex === 2 ? '최종 방어 붕괴' : '다음 방어선 개방'}`
          : `${stageIndex + 1}/3 방어선 · ${progress.defeated} / ${progress.total}`,
        ratio: progress.total ? progress.defeated / progress.total : progress.cleared ? 1 : 0,
      };
    }
    if (isPyongyangRegion(this.simulation.region)) {
      if (this.simulation.isGwanghaePrince()) {
        const next = this.simulation.region === 'pyongyanginner'
          ? '대동문'
          : this.simulation.region === 'pyongyanggate'
            ? '평양 북곽'
            : '압록 북로';
        return {
          label: `분조 관군 수습 완료 · 북문으로 ${next}`,
          ratio: 1,
        };
      }
      const progress = this.simulation.getPyongyangBattleProgress(this.simulation.region);
      const stageLabel = this.simulation.region === 'pyongyangouter'
        ? '외성 방어진'
        : this.simulation.region === 'pyongyanggate'
          ? '대동문 수비군'
          : '내성 지휘부';
      return {
        label: progress.cleared
          ? `${stageLabel} 제압 · 전진문 개방`
          : `${stageLabel} ${progress.defeated} / ${progress.total}`,
        ratio: progress.total ? progress.defeated / progress.total : 1,
      };
    }
    if (this.simulation.region === 'busanjin'
      || this.simulation.region === 'gyeongbokgate' || this.simulation.region === 'gyeongbokcourt'
      || this.simulation.region === 'gyeongbokinner' || this.simulation.region === 'jurchenvillage'
      || this.simulation.region === 'manchufrontier') {
      const soldiers = this.simulation.monsters.filter((monster) => monster.region === this.simulation.region);
      const defeated = soldiers.filter((monster) => !monster.alive).length;
      return {
        label: `전역 ${defeated} / ${soldiers.length}`,
        ratio: soldiers.length ? defeated / soldiers.length : 1,
      };
    }
    const goal = 8;
    return { label: `${Math.min(this.simulation.player.kills, goal)} / ${goal}`, ratio: Math.min(1, this.simulation.player.kills / goal) };
  }

  private resolveStoryProgress(): StoryProgress {
    if (this.simulation.isGwanghaePrince()) {
      const bunjoStory: Partial<Record<RegionId, Omit<StoryProgress, 'completed'>>> = {
        changdeokgung: {
          chapter: 1,
          title: '광해 서막 · 선조의 분조 교서',
          objective: '선조의 명을 받아 왕세자 분조를 열고, 금군과 승정원 주서에게 첫 출진 장계를 받으십시오.',
        },
        gaeseong: {
          chapter: 2,
          title: '광해 제2장 · 송도의 군량 장부',
          objective: '송상 객주와 개성부 서리를 만나 북방으로 보낼 군량과 약재의 물목을 확보하십시오.',
        },
        hanseongmarket: {
          chapter: 3,
          title: '광해 제3장 · 굶주린 운종가',
          objective: '육의전과 혜민서의 사정을 살피고, 군량 징발보다 도성 백성의 구휼을 먼저 정비하십시오.',
        },
        hanseongsouth: {
          chapter: 4,
          title: '광해 제4장 · 숭례문의 의병',
          objective: '칠패장에 흩어진 관군과 의병을 분조의 깃발 아래 모아 남행로를 여십시오.',
        },
        suwon: {
          chapter: 5,
          title: '광해 제5장 · 수원 둔전의 불씨',
          objective: '수원도호부의 둔전과 역참을 복구해 관군의 식량과 말을 마련하십시오.',
        },
        chungju: {
          chapter: 6,
          title: '광해 제6장 · 남한강의 군선',
          objective: '목계나루의 뱃길을 확보하고 피란민과 군량을 안전하게 북상시키십시오.',
        },
        andong: {
          chapter: 7,
          title: '광해 제7장 · 영남 의병의 장계',
          objective: '안동의 유림과 장인을 설득해 의병 명부와 화살·군량을 분조에 보태십시오.',
        },
        pyongyangouter: {
          chapter: 8,
          title: '광해 제8장 · 평양 북곽의 분조',
          objective: '선조의 어가가 물러난 성곽에서 남은 관군을 수습하고 평양 외성 방어진을 다시 세우십시오.',
        },
        pyongyanggate: {
          chapter: 9,
          title: '광해 제9장 · 대동문의 결전',
          objective: '대동문과 성루를 지키며 분조의 군량로가 끊기지 않도록 적 선봉을 격퇴하십시오.',
        },
        pyongyanginner: {
          chapter: 9,
          title: '광해 제9장 · 대동관의 분조 깃발',
          objective: '내성 지휘부와 패잔 전열을 수습해 한성으로 돌아갈 분조의 군로를 완성하십시오.',
        },
        gyeongbokgate: {
          chapter: 10,
          title: '광해 제10장 · 왕도 귀환',
          objective: '일곱 고을의 장계와 의병 명부를 들고 광화문 친위대를 지나 선조의 어전으로 향하십시오.',
        },
        gyeongbokcourt: {
          chapter: 10,
          title: '광해 제10장 · 품계석 위의 장계',
          objective: '근정전 뜰을 지나 백성과 함께 지킨 고을의 장계를 선조 앞에 올리십시오.',
        },
        gyeongbokinner: {
          chapter: 10,
          title: '광해 제10장 · 선조 앞의 분조 장계',
          objective: '한성 내전에서 조선 국왕 선조에게 구휼·의병·군량을 기록한 분조 장계를 올리십시오.',
        },
      };
      const current = bunjoStory[this.simulation.region] ?? {
        chapter: 7,
        title: '광해 제7장 · 백성을 살리는 전쟁',
        objective: '왕세자 분조의 길을 따라 무너진 고을의 관군·의병·군량을 다시 세우십시오.',
      };
      const rally = this.simulation.getGwanghaeRallyProgress();
      const pathBattle = this.simulation.getGwanghaePathBattleProgress();
      const refugeState = this.simulation.getRoyalRefugeState();
      if (rally.path === 'coup' && refugeState.status !== 'locked') {
        const refuge = this.simulation.getRoyalRefugeBattleProgress();
        const routeName = refuge.routeId ? ROYAL_REFUGE_ROUTES[refuge.routeId].name : '왕의 마지막 피난로';
        return {
          chapter: 11,
          title: refugeState.finalDefenseComplete
            ? '광해 제11장 · 도망친 왕을 포위하다'
            : `광해 제11장 · ${routeName}`,
          objective: refugeState.status === 'awaiting-route'
            ? '선조가 궁성을 버리고 달아납니다. 남한산성과 강화도 중 추격할 피난로를 선택하십시오.'
            : refugeState.finalDefenseComplete
              ? '왕의 마지막 퇴로를 봉쇄했습니다. 선조를 시해하지 않고 백성 앞에서 책임을 물으십시오.'
              : `${refuge.stageName ?? '왕실 피난처 방어선'}을 돌파해 달아나는 어가를 추격하십시오.`,
          completed: refugeState.finalDefenseComplete ? 11 : 10,
        };
      }
      if (pathBattle) {
        return {
          ...current,
          title: pathBattle.complete
            ? `광해 갈림길 완수 · ${pathBattle.path === 'coup' ? '새 조정의 칼' : '왕명의 칼'}`
            : pathBattle.title,
          objective: pathBattle.complete
            ? pathBattle.path === 'coup'
              ? '광화문 친위대를 무너뜨렸습니다. 분조군과 함께 내전으로 진격해 선조에게 새 조정의 뜻을 밝히십시오.'
              : '삼남 의병 진압을 마쳤습니다. 이탈한 백성의 원망을 안고 선조에게 왕명 집행 장계를 올리십시오.'
            : pathBattle.path === 'coup'
              ? `광화문을 지키는 선조 친위 내금위를 제압하십시오. ${pathBattle.defeated}/${pathBattle.total}`
              : `전주 들판에서 해산을 거부한 삼남 의병을 진압하십시오. ${pathBattle.defeated}/${pathBattle.total}`,
          completed: Math.max(0, current.chapter - 1),
        };
      }
      if (rally.path === 'coup') {
        return {
          ...current,
          title: '광해 갈림길 · 쿠데타',
          objective: '백성을 버린 선조를 몰아내기 위해 규합한 의병과 분조군을 이끌고 새 조정을 세우십시오.',
          completed: Math.max(0, current.chapter - 1),
        };
      }
      if (rally.path === 'suppression') {
        return {
          ...current,
          title: '광해 갈림길 · 왕명과 의병',
          objective: '왕명을 따라 해산을 거부한 의병을 진압하고 남은 관군으로 조정의 질서를 회복하십시오.',
          completed: Math.max(0, current.chapter - 1),
        };
      }
      if (rally.choiceReady) {
        return {
          ...current,
          title: '광해 갈림길 · 왕좌인가 왕명인가',
          objective: '일곱 고을의 군세로 정변을 일으킬지, 왕명을 따라 의병을 해산·진압할지 결정하십시오.',
          completed: Math.max(0, current.chapter - 1),
        };
      }
      const localPoint = rally.points.find((point) => point.region === this.simulation.region && !point.completed);
      const localNpc = localPoint
        ? JOSEON_TOWN_LAYOUTS[localPoint.region].npcs.find((npc) => npc.id === localPoint.npcId)
        : null;
      return {
        ...current,
        objective: localPoint
          ? localPoint.available
            ? `${withObjectParticle(localNpc?.name ?? localPoint.label)} 눌러 ${localPoint.label} ${localPoint.recruits}명을 분조에 합류시키십시오.`
            : '먼저 창덕궁 승정원 주서를 눌러 분조 의병 명부를 받으십시오.'
          : current.objective,
        completed: Math.max(0, current.chapter - 1),
      };
    }
    if (this.simulation.isOsakaMudang()) {
      if (isJapanRegion(this.simulation.region)) {
        const stage = JAPAN_STAGE_COPY[this.simulation.region];
        return {
          chapter: stage.chapter,
          completed: stage.chapter - 1,
          title: `연화 제${stage.chapter}장 · ${stage.title}`,
          objective: stage.objective,
        };
      }
      const mudangMainlandStory: Partial<Record<RegionId, Omit<StoryProgress, 'completed'>>> = {
        busanjin: {
          chapter: 12,
          title: '연화 제12장 · 귀향 아닌 침공',
          objective: '부산진에 상륙해 포로 송환을 외면한 조선의 첫 성문과 전쟁 장부를 확보하십시오.',
        },
        tangeumdae: {
          chapter: 13,
          title: '연화 제13장 · 탄금대 살풀이',
          objective: '남한강에 쌓인 조선군과 왜군의 원혼을 불러 조총 전열을 거대한 굿판으로 바꾸십시오.',
        },
        gyeongbokgate: {
          chapter: 14,
          title: '연화 제14장 · 닫힌 광화문',
          objective: '연화와 포로들을 버린 조정의 기록을 찾아 광화문과 흥례문을 넘으십시오.',
        },
        gyeongbokcourt: {
          chapter: 15,
          title: '연화 제15장 · 품계석의 원혼',
          objective: '이름 없이 끌려간 백성들의 혼불을 품계석 사이에 세우고 내금위 전열을 무너뜨리십시오.',
        },
        gyeongbokinner: {
          chapter: 16,
          title: '연화 제16장 · 왕의 침묵',
          objective: '포로 송환을 외면한 장계와 왕의 답을 대면하고 잊힌 이름을 어전에서 읽으십시오.',
        },
        jeonjufield: {
          chapter: 17,
          title: '연화 제17장 · 검은 돛의 대가',
          objective: '포로 수송에 군량을 댄 남쪽 거래망과 왜군 잔존 선단을 끊으십시오.',
        },
        jeonjugate: {
          chapter: 17,
          title: '연화 제17장 · 검은 돛의 대가',
          objective: '풍남문에 쌓인 징발 장부와 포로 거래 증표를 되찾으십시오.',
        },
        jeonju: {
          chapter: 18,
          title: '연화 제18장 · 버려진 이름들',
          objective: '조선과 일본 어느 장부에도 남지 않은 포로의 명부를 완성하십시오.',
        },
        yeongwol: {
          chapter: 18,
          title: '연화 제18장 · 버려진 이름들',
          objective: '관아 압수 창고에서 가족과 고향을 잃은 포로들의 흔적을 찾으십시오.',
        },
        yeongwolhq: {
          chapter: 19,
          title: '연화 제19장 · 무너진 국경',
          objective: '백성을 징발품으로 기록한 군영의 문서를 불태우고 북방길을 여십시오.',
        },
        jurchenvillage: {
          chapter: 20,
          title: '연화 제20장 · 피의 무당굿',
          objective: '복수에 굶주린 원귀가 산 자를 삼키기 전에 장백산 제단에서 혼백의 주인을 가르십시오.',
        },
        manchufrontier: {
          chapter: 21,
          title: '연화 제21장 · 압록의 객귀',
          objective: '압록 얼음 나루에 떠도는 포로선과 국경전의 혼을 불러 마지막 북방 장부를 찾으십시오.',
        },
        pyongyangouter: {
          chapter: 22,
          title: '연화 제22장 · 대동강 혼불',
          objective: '강물에 잠든 전란의 넋을 깨워 대동문으로 이어지는 혼불길을 밝히십시오.',
        },
        pyongyanggate: {
          chapter: 23,
          title: '연화 제23장 · 두 고향의 재',
          objective: '조선과 일본 두 군세의 깃발을 지나 어느 나라에도 속하지 않은 포로들의 길을 여십시오.',
        },
        pyongyanginner: {
          chapter: 24,
          title: '연화 제24장 · 망향의 나라',
          objective: '대동관의 마지막 전쟁 장부를 닫고 원혼과 생존자가 이름을 잃지 않을 새 터전을 선언하십시오.',
        },
        namhansanseong: {
          chapter: 24,
          title: '연화 제24장 · 망향의 나라',
          objective: '산성에 숨은 전쟁 책임자에게 마지막 이름을 읽히고 망향민의 새 터전을 선언하십시오.',
        },
        ganghwado: {
          chapter: 24,
          title: '연화 제24장 · 망향의 나라',
          objective: '바닷길 끝의 행궁에서 포로 장부를 닫고 살아남은 이들의 새 터전을 선언하십시오.',
        },
      };
      const current = mudangMainlandStory[this.simulation.region] ?? {
        chapter: 19,
        title: '연화 제19장 · 무너진 국경',
        objective: '타향에서 모은 혼백과 포로 명부를 이끌고 다음 성곽과 관아의 기록을 추적하십시오.',
      };
      return { ...current, completed: Math.max(0, current.chapter - 1) };
    }
    if (this.simulation.isFrontierArcher()) {
      const frontierStory: Partial<Record<RegionId, Omit<StoryProgress, 'completed'>>> = {
        jurchenvillage: {
          chapter: 1,
          title: '하진 서막 · 압록 패전의 귀환',
          objective: '패잔병 본영 북문을 지나 장백산의 백산·송화·흑수 세 부족을 규합하십시오.',
        },
        changbaihunt: {
          chapter: 2,
          title: '하진 제2장 · 장백의 겨울사냥',
          objective: JURCHEN_STAGE_COPY.changbaihunt.objective,
        },
        baeksanvillage: {
          chapter: 3,
          title: '하진 제3장 · 백산부의 첫 깃발',
          objective: JURCHEN_STAGE_COPY.baeksanvillage.objective,
        },
        songhuahunt: {
          chapter: 4,
          title: '하진 제4장 · 송화강의 사슴벌',
          objective: JURCHEN_STAGE_COPY.songhuahunt.objective,
        },
        songhuavillage: {
          chapter: 5,
          title: '하진 제5장 · 송화부 기마 맹약',
          objective: JURCHEN_STAGE_COPY.songhuavillage.objective,
        },
        blackpinehunt: {
          chapter: 6,
          title: '하진 제6장 · 흑송령 산짐승',
          objective: JURCHEN_STAGE_COPY.blackpinehunt.objective,
        },
        heuksuvillage: {
          chapter: 7,
          title: '하진 제7장 · 세 부족 대회맹',
          objective: JURCHEN_STAGE_COPY.heuksuvillage.objective,
        },
        manchufrontier: {
          chapter: 8,
          title: '하진 제8장 · 압록 설욕전',
          objective: '통합 여진군과 함께 조선 국경군의 환도·장창 전열을 무너뜨리고 남진 성문을 여십시오.',
        },
        pyongyangouter: {
          chapter: 9,
          title: '하진 제9장 · 평양 외성의 서리',
          objective: '외성의 목책 전열과 첨절제사를 무너뜨려 대동문 공성로를 여십시오.',
        },
        pyongyanggate: {
          chapter: 10,
          title: '하진 제10장 · 대동문의 불화살',
          objective: '대동강 안개를 가르며 성루 궁수대와 문 안쪽 수비군을 모두 제압하십시오.',
        },
        pyongyanginner: {
          chapter: 11,
          title: '하진 제11장 · 대동관의 검은 깃발',
          objective: '평양 내성 세 전열과 지휘부를 꺾고 한성 북문으로 이어지는 남진로를 확보하십시오.',
        },
        gyeongbokgate: {
          chapter: 12,
          title: '하진 제12장 · 궁궐의 북문',
          objective: '무너진 평양 남진로에서 광화문으로 진입해 궁성의 첫 방어진을 끊으십시오.',
        },
        gyeongbokcourt: {
          chapter: 13,
          title: '하진 제13장 · 품계석의 화살',
          objective: '근정전 뜰의 왕실 수비대를 격파하고 왕의 내전으로 북상하십시오.',
        },
        gyeongbokinner: {
          chapter: 14,
          title: '하진 제14장 · 갈라지는 어가',
          objective: '내금위 방어진을 뚫고 왕을 대면해 마지막 피난로를 선택하게 하십시오.',
        },
        namhansanseong: {
          chapter: 15,
          title: '하진 제15장 · 산성의 마지막 왕기',
          objective: '북문 산성로·수어장대·행궁으로 이어지는 세 방어선을 차례로 무너뜨리십시오.',
        },
        ganghwado: {
          chapter: 15,
          title: '하진 제15장 · 염하의 마지막 왕기',
          objective: '갑곶나루·강화산성·행궁으로 이어지는 세 방어선을 차례로 무너뜨리십시오.',
        },
      };
      const current = frontierStory[this.simulation.region] ?? {
        chapter: 15,
        title: '하진 제15장 · 남하하는 바람',
        objective: '여진 연합군의 길을 열며 조선의 남쪽 성곽으로 진군하십시오.',
      };
      return { ...current, completed: Math.max(0, current.chapter - 1) };
    }
    const campaignStory: Partial<Record<RegionId, Omit<StoryProgress, 'completed'>>> = {
      busanjin: { chapter: 7, title: '제7장 · 부산진의 검은 바다', objective: '왜군 조총대를 가르고 부산진성의 세 방어진을 사수하십시오.' },
      tangeumdae: { chapter: 8, title: '제8장 · 탄금대의 전멸전', objective: '조총수 8명이 포함된 왜군 21명을 전멸시키고 한성 진군로를 여십시오.' },
      gyeongbokgate: { chapter: 9, title: '제9장 · 닫힌 광화문', objective: '금천교와 흥례문을 지나 궁성 변란의 배후를 추적하십시오.' },
      gyeongbokcourt: { chapter: 10, title: '제10장 · 품계석의 칼바람', objective: '근정전 내금위 방어진을 넘어 왕의 내전으로 향하십시오.' },
      gyeongbokinner: { chapter: 11, title: '제11장 · 왕 앞의 증좌', objective: '서병관과 왜구의 밀약 문서를 왕에게 올리고 북방 군보를 받으십시오.' },
      manchufrontier: { chapter: 12, title: '제12장 · 압록의 눈보라', objective: '얼어붙은 나루를 건너온 만주 팔기 선봉과 결전을 치르십시오.' },
      jurchenvillage: { chapter: 13, title: '제13장 · 장백산의 대천막', objective: '여진 설원부락에 진입해 대족장 아이신고로 바투르와 대면하십시오.' },
      pyongyangouter: { chapter: 14, title: '제14장 · 평양 외성의 서리', objective: '외성의 세 방어진을 정리하고 대동문으로 이어지는 성문길을 여십시오.' },
      pyongyanggate: { chapter: 15, title: '제15장 · 대동문 공성전', objective: '성루 궁수대와 문 안쪽 수비군을 격파해 대동문을 돌파하십시오.' },
      pyongyanginner: { chapter: 16, title: '제16장 · 평양 내성 결전', objective: '대동관과 내성 지휘부를 제압하고 한성으로 이어지는 군로를 확보하십시오.' },
      namhansanseong: { chapter: 17, title: '제17장 · 남한산성 최종 방어선', objective: '북문에서 행궁까지 이어진 세 겹의 산악 방어선을 돌파하십시오.' },
      ganghwado: { chapter: 17, title: '제17장 · 강화도 최종 방어선', objective: '갑곶나루에서 행궁까지 이어진 세 겹의 수륙 방어선을 돌파하십시오.' },
    };
    const currentCampaign = campaignStory[this.simulation.region];
    if (currentCampaign) return { ...currentCampaign, completed: currentCampaign.chapter - 1 };
    if (!this.simulation.isPrisonGateOpen()) {
      return {
        chapter: 2,
        completed: 1,
        title: '제2장 · 감옥의 밤',
        objective: '처형을 명한 포졸 6명을 쓰러뜨리고 감옥 북문을 여십시오.',
      };
    }
    if (this.simulation.getTreeTrainingCount() < 3 || !this.simulation.canEnterUlleungGovernment()) {
      return {
        chapter: 3,
        completed: 2,
        title: '제3장 · 섬의 사람들',
        objective: '피난민을 돕고 해송 수련 3회와 10품 성장을 마치십시오.',
      };
    }
    if (!this.simulation.hasWakoInvasionStarted()) {
      return {
        chapter: 4,
        completed: 3,
        title: '제4장 · 탐관오리의 관아',
        objective: '감옥 남문 아래 관아로 진입해 포졸과 이방 서병관을 제압하십시오.',
      };
    }
    if (!this.simulation.isUlleungVillageLiberated()) {
      return {
        chapter: 5,
        completed: 4,
        title: '제5장 · 검은 돛의 침공',
        objective: '서병관이 불러들인 왜구 선단을 선착장에서 모두 막아내십시오.',
      };
    }
    return {
      chapter: 6,
      completed: 5,
      title: '제6장 · 본토의 그림자',
      objective: isUlleungRegion(this.simulation.region)
        ? '해방된 관아 선착장에서 배를 타고 본토 달빛고을로 향하십시오.'
        : '영월 관아와 전주성으로 이어지는 서병관 배후 세력을 추적하십시오.',
    };
  }

  private createAnimations(): void {
    for (let row = 0; row < 5; row += 1) {
      this.anims.create({
        key: `player-walk-unequipped-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.playerUnequipped.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 11, repeat: -1,
      });
      this.anims.create({
        key: `player-walk-weapon-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.playerWeaponReadyBody.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 11, repeat: -1,
      });
      this.anims.create({
        key: `player-attack-fist-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.playerUnequipped.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 11, repeat: 0,
      });
      this.anims.create({
        key: `player-attack-weapon-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.playerWeaponReadyBody.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 10, repeat: 0,
      });
      this.anims.create({
        key: `player-frontier-walk-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.frontierArcher.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 11, repeat: -1,
      });
      this.anims.create({
        key: `player-frontier-attack-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.frontierArcher.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 11, repeat: 0,
      });
      this.anims.create({
        key: `player-frontier-melee-walk-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.frontierMelee.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 11, repeat: -1,
      });
      this.anims.create({
        key: `player-frontier-melee-attack-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.frontierMelee.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 10, repeat: 0,
      });
      if (this.textures.exists(ASSETS.osakaMudang.key)) {
        this.anims.create({
          key: `player-mudang-walk-${row}`,
          frames: this.anims.generateFrameNumbers(ASSETS.osakaMudang.key, { start: row * 8, end: row * 8 + 3 }),
          frameRate: 11, repeat: -1,
        });
        this.anims.create({
          key: `player-mudang-attack-${row}`,
          frames: this.anims.generateFrameNumbers(ASSETS.osakaMudang.key, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: 10, repeat: 0,
        });
      }
    }
    const npcPlayers: Array<[VillageNpcMode, string]> = [
      ['armor-only', ASSETS.playerArmorOnly.key],
      ['fully-equipped', ASSETS.playerFullyEquipped.key],
      ['guard', ASSETS.monsters['ulleung-guard'].key],
    ];
    for (const [mode, textureKey] of npcPlayers) {
      for (let row = 0; row < 5; row += 1) {
        this.anims.create({
          key: `npc-walk-${mode}-${row}`,
          frames: this.anims.generateFrameNumbers(textureKey, { start: row * 8, end: row * 8 + 3 }),
          frameRate: 11, repeat: -1,
        });
        this.anims.create({
          key: `npc-attack-${mode}-${row}`,
          frames: this.anims.generateFrameNumbers(textureKey, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: mode === 'fully-equipped' ? 10 : 11, repeat: 0,
        });
      }
    }
    this.createGwanghaeAnimations();
    for (let row = 0; row < 5; row += 1) {
      this.anims.create({
        key: `npc-walk-commoner-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.villageCommoner.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 10, repeat: -1,
      });
      this.anims.create({
        key: `npc-attack-commoner-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.villageCommoner.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 9, repeat: 0,
      });
      this.anims.create({
        key: `npc-work-commoner-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.villageCommoner.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 6, repeat: -1,
      });
      this.anims.create({
        key: `npc-walk-japanese-civilian-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.japaneseCivilianWoman.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 9, repeat: -1,
      });
      this.anims.create({
        key: `npc-interact-japanese-civilian-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.japaneseCivilianWoman.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 7, repeat: 0,
      });
      this.anims.create({
        key: `npc-walk-oppressed-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.ulleungOppressedVillager.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 9, repeat: -1,
      });
      this.anims.create({
        key: `npc-attack-oppressed-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.ulleungOppressedVillager.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 5, repeat: 0,
      });
    }
    for (const [mode, textureKey] of [
      ['field-ploughman', ASSETS.villageFieldPloughman.key],
      ['female-farmer', ASSETS.villageFemaleFarmer.key],
      ['female-waterer', ASSETS.villageFemaleWaterer.key],
    ] as Array<[VillageNpcMode, string]>) {
      for (let row = 0; row < 5; row += 1) {
        this.anims.create({
          key: `npc-walk-${mode}-${row}`,
          frames: this.anims.generateFrameNumbers(textureKey, { start: row * 8, end: row * 8 + 3 }),
          frameRate: 9, repeat: -1,
        });
        this.anims.create({
          key: `npc-work-${mode}-${row}`,
          frames: this.anims.generateFrameNumbers(textureKey, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: mode === 'field-ploughman' ? 7 : 6, repeat: -1,
        });
      }
    }
    for (const kind of MONSTER_KINDS) {
      const texture = ASSETS.monsters[kind];
      if (!this.textures.exists(texture.key)) continue;
      for (let row = 0; row < 5; row += 1) {
        this.anims.create({
          key: `monster-walk-${kind}-${row}`,
          frames: this.anims.generateFrameNumbers(texture.key, { start: row * 8, end: row * 8 + 3 }),
          frameRate: isLowQuadrupedMonster(kind) ? 11 : 9,
          repeat: -1,
        });
        this.anims.create({
          key: `monster-attack-${kind}-${row}`,
          frames: this.anims.generateFrameNumbers(texture.key, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: isLowQuadrupedMonster(kind) ? 11 : 9,
          repeat: 0,
        });
      }
    }
  }

  private createGwanghaeAnimations(): void {
    if (!this.textures.exists(ASSETS.gwanghaePrince.key)) return;
    for (let row = 0; row < 5; row += 1) {
      const playerWalkKey = `player-gwanghae-walk-${row}`;
      if (!this.anims.exists(playerWalkKey)) {
        this.anims.create({
          key: playerWalkKey,
          frames: this.anims.generateFrameNumbers(ASSETS.gwanghaePrince.key, {
            start: row * 8,
            end: row * 8 + 3,
          }),
          frameRate: 11,
          repeat: -1,
        });
      }
      const playerAttackKey = `player-gwanghae-attack-${row}`;
      if (!this.anims.exists(playerAttackKey)) {
        this.anims.create({
          key: playerAttackKey,
          frames: this.anims.generateFrameNumbers(ASSETS.gwanghaePrince.key, {
            start: row * 8 + 4,
            end: row * 8 + 7,
          }),
          frameRate: 10,
          repeat: 0,
        });
      }
      const walkKey = `npc-walk-gwanghae-${row}`;
      if (!this.anims.exists(walkKey)) {
        this.anims.create({
          key: walkKey,
          frames: this.anims.generateFrameNumbers(ASSETS.gwanghaePrince.key, {
            start: row * 8,
            end: row * 8 + 3,
          }),
          frameRate: 9,
          repeat: -1,
        });
      }
      const audienceKey = `npc-audience-gwanghae-${row}`;
      if (!this.anims.exists(audienceKey)) {
        this.anims.create({
          key: audienceKey,
          frames: [
            { key: ASSETS.gwanghaePrince.key, frame: row * 8 },
            { key: ASSETS.gwanghaePrince.key, frame: row * 8 + 1 },
            { key: ASSETS.gwanghaePrince.key, frame: row * 8 },
          ],
          frameRate: 5,
          repeat: 0,
        });
      }
    }
  }

  private createBossAnimations(): void {
    for (const definition of Object.values(BOSS_CATALOG)) {
      for (let row = 0; row < 5; row += 1) {
        if (this.anims.exists(`boss-walk-${definition.id}-${row}`)) continue;
        this.anims.create({
          key: `boss-walk-${definition.id}-${row}`,
          frames: this.anims.generateFrameNumbers(definition.textureKey, { start: row * 8, end: row * 8 + 3 }),
          frameRate: 9, repeat: -1,
        });
        this.anims.create({
          key: `boss-attack-${definition.id}-${row}`,
          frames: this.anims.generateFrameNumbers(definition.textureKey, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: 10, repeat: 0,
        });
      }
    }
  }

  private loadBossAssetsInBackground(): void {
    if (this.bossAssetsReady || this.bossAssetsLoading) return;
    if (Object.values(ASSETS.bosses).every((boss) => this.textures.exists(boss.key))) {
      this.createBossAnimations();
      this.bossAssetsReady = true;
      return;
    }
    this.bossAssetsLoading = true;
    for (const boss of Object.values(ASSETS.bosses)) {
      if (this.textures.exists(boss.key)) continue;
      this.load.spritesheet(boss.key, boss.path, {
        frameWidth: MONSTER_FRAME.width, frameHeight: MONSTER_FRAME.height, endFrame: 39,
      });
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.bossAssetsLoading = false;
      this.bossAssetsReady = true;
      this.createBossAnimations();
      const pending = this.pendingDungeonEntry;
      this.pendingDungeonEntry = null;
      pending?.();
    });
    this.load.start();
  }

  private enterDungeonWhenReady(afterEnter?: () => void): void {
    const enter = () => {
      if (this.simulation.region !== 'dungeon') this.simulation.enterDungeon();
      afterEnter?.();
    };
    if (this.bossAssetsReady) {
      enter();
      return;
    }
    this.pendingDungeonEntry = enter;
    this.alertMarker(this.simulation.player.x, this.simulation.player.y - 112, '던전 수문장 기록을 불러오는 중…');
    this.loadBossAssetsInBackground();
  }

  private moveAcrossUlleungPassage(
    region: UlleungRegionId,
    direction: UlleungTravelDirection,
  ): boolean {
    const entry = ulleungAdjacentEntryPoint(region, direction);
    if (!entry) return false;
    this.simulation.moveTo(entry);
    return true;
  }

  private createUlleungdo(): void {
    const origin = REGION_ORIGINS.ulleungdo;
    const northGateX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungdo.northX;
    const southGateX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungdo.southX;
    // Ulleungdo opening: the prison courtyard is painted into the terrain; only
    // low-profile, clickable world objects sit above it so they never obscure the map.
    const gateLabel = this.add.text(0, 0, '북문 봉쇄 · 포졸 6명 처치', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#f1c49b', stroke: '#1a0d08', strokeThickness: 4,
    }).setOrigin(0.5);
    this.prisonGate = this.add.container(northGateX, origin.y + 248, [gateLabel]).setDepth(origin.y + 252);
    const prisonExitZone = this.add.zone(northGateX, origin.y + 150, 330, 220)
      .setDepth(origin.y + 175).setInteractive({ useHandCursor: true });
    prisonExitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.simulation.isPrisonGateOpen()) {
        this.alertMarker(northGateX, origin.y + 255, '북문 봉쇄 · 감옥 포졸 6명을 먼저 쓰러뜨려야 한다');
        this.simulation.moveTo({ x: northGateX, y: origin.y + 280 });
        return;
      }
      this.moveAcrossUlleungPassage('ulleungdo', 'north');
      this.alertMarker(northGateX, origin.y + 255, '북문 개방 · 바람고개 연결길로 탈출');
    });

    const southGateLabel = this.add.text(southGateX, origin.y + 790, '감옥 남문 · 아래는 울릉 관아 (10품)', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#e0ad89', stroke: '#1a0d08', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 795);
    const governmentGateZone = this.add.zone(southGateX, origin.y + 860, 350, 210)
      .setDepth(origin.y + 880).setInteractive({ useHandCursor: true });
    governmentGateZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.simulation.requestGovernmentEntry()) return;
      this.moveAcrossUlleungPassage('ulleungdo', 'south');
      this.alertMarker(southGateX, origin.y + 760, '감옥 남문 개방 · 관아 숲길 진입');
    });
    const forgeCoalGlow = this.add.ellipse(origin.x + 823, origin.y + 760, 54, 24, 0xe8752f, 0.2)
      .setDepth(origin.y + 760);
    const smugglerForge = this.add.image(
      origin.x + 854,
      origin.y + 794,
      ASSETS.props.blacksmithWorkstation.key,
    ).setOrigin(0.5, 0.9).setDisplaySize(156, 132).setDepth(origin.y + 795);
    const smugglerForgeHammer = this.add.image(
      origin.x + 900,
      origin.y + 755,
      ASSETS.props.blacksmithHammer.key,
    ).setOrigin(0.28, 0.76).setDisplaySize(48, 48).setAngle(24).setDepth(origin.y + 797);
    smugglerForge.setName('smuggler-forge-workstation');
    smugglerForgeHammer.setName('smuggler-forge-hammer');
    this.tweens.add({
      targets: forgeCoalGlow,
      alpha: { from: 0.14, to: 0.34 },
      scaleX: { from: 0.88, to: 1.08 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add.text(origin.x + 854, origin.y + 706, '밀수 대장간 · 무기 강화 (30전)', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#edcc87', stroke: '#1a0d07', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 799);
    const forgeZone = this.add.zone(origin.x + 854, origin.y + 758, 178, 142).setDepth(origin.y + 800).setInteractive({ useHandCursor: true });
    forgeZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.enchantWeapon();
    });
  }

  private createUlleungCoastalForest(): void {
    const origin = REGION_ORIGINS.ulleungcoast;
    const northX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungcoast.northX;
    const southX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungcoast.southX;
    this.add.text(northX, origin.y + 88, '북쪽 · 해안 절벽 끝', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#b9c6bb', stroke: '#10150f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 152);
    this.add.text(southX, origin.y + 920, '남쪽 · 억새초원 피난길', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#d5c99f', stroke: '#15120d', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 925);

    const northPassage = this.add.zone(northX, origin.y + 70, 340, 150).setDepth(origin.y + 170).setInteractive({ useHandCursor: true });
    northPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.simulation.moveTo({ x: northX, y: origin.y + 240 });
      this.alertMarker(northX, origin.y + 180, '거센 파도와 절벽 때문에 더 갈 수 없다');
    });
    const southPassage = this.add.zone(southX, origin.y + 944, 340, 160).setDepth(origin.y + 950).setInteractive({ useHandCursor: true });
    southPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleungcoast', 'south');
      this.alertMarker(southX, origin.y + 875, '억새초원 피난길로 이동');
    });
  }

  private createUlleungSilvergrassMeadow(): void {
    const origin = REGION_ORIGINS.ulleungmeadow;
    const northX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungmeadow.northX;
    const southX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungmeadow.southX;
    this.add.text(northX, origin.y + 92, '북쪽 · 해안 해송숲', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#cad2b8', stroke: '#11150e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 154);
    this.add.text(southX, origin.y + 915, '남쪽 · 약탈당한 해송마을', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#d5c99f', stroke: '#15120d', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 922);

    const northPassage = this.add.zone(northX, origin.y + 72, 340, 160)
      .setDepth(origin.y + 168).setInteractive({ useHandCursor: true });
    northPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleungmeadow', 'north');
      this.alertMarker(northX, origin.y + 140, '해안 해송숲 연결길로 이동');
    });
    const southPassage = this.add.zone(southX, origin.y + 938, 340, 170)
      .setDepth(origin.y + 946).setInteractive({ useHandCursor: true });
    southPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleungmeadow', 'south');
      this.alertMarker(southX, origin.y + 870, '약탈당한 해송마을 연결길로 이동');
    });
  }

  private createUlleungTrainingGround(): void {
    const origin = REGION_ORIGINS.ulleunghunt;
    const northX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleunghunt.northX;
    const southX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleunghunt.southX;
    this.add.text(southX, origin.y + 900, '남쪽 · 울릉 바람고개 상급 사냥터', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#c7cbb6', stroke: '#11150e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 905);
    this.add.text(northX, origin.y + 110, '북쪽 · 울릉 억새초원', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#bfc8aa', stroke: '#11150e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 156);

    const southPassage = this.add.zone(southX, origin.y + 930, 330, 170)
      .setDepth(origin.y + 938).setInteractive({ useHandCursor: true });
    southPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleunghunt', 'south');
      this.alertMarker(southX, origin.y + 870, '울릉 바람고개 연결길로 이동');
    });
    const northPassage = this.add.zone(northX, origin.y + 80, 330, 170)
      .setDepth(origin.y + 168).setInteractive({ useHandCursor: true });
    northPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleunghunt', 'north');
      this.alertMarker(northX, origin.y + 135, '억새초원 연결길로 돌아가기');
    });

    const treeX = origin.x + 430;
    const treeY = origin.y + 545;
    const treeShadow = this.add.ellipse(0, 2, 96, 30, 0x080806, 0.36);
    this.trainingTree = this.add.image(0, 0, ASSETS.props.ulleungTrainingPine.key)
      .setDisplaySize(172, 172).setOrigin(0.5, 0.94).setTint(0xb2b6a1);
    const trainingTreeRoot = this.add.container(treeX, treeY, [treeShadow, this.trainingTree]).setDepth(treeY + 1);
    this.tweens.add({ targets: trainingTreeRoot, angle: { from: -0.45, to: 0.5 }, duration: 2900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(treeX, treeY - 116, '탈격 수련 해송', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#d8d0a9', stroke: '#17130c', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(treeY + 3);
    const trainingZone = this.add.zone(treeX, treeY - 72, 150, 190).setDepth(treeY + 4).setInteractive({ useHandCursor: true });
    trainingZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.trainAtTree();
    });
    trainingZone.on('pointerover', () => this.trainingTree?.setTint(0xd2c99e));
    trainingZone.on('pointerout', () => this.trainingTree?.setTint(0xb2b6a1));

    const villagers = [
      { id: 'ulleung-elder', x: 315, y: 470, name: '울릉 촌로 덕만', dialogue: '감옥에서 살아 나오셨구려. 남쪽 관아에 포졸과 형방이 층층이 길을 막고 있소.', tint: 0x918272 },
      { id: 'ulleung-mother', x: 1185, y: 455, name: '피난민 순이', dialogue: '포졸들이 곡식과 그물을 빼앗아 갔어요. 관아를 되찾아 주세요.', tint: 0x9b7c75 },
      { id: 'ulleung-farmer', x: 320, y: 700, name: '농부 복칠', dialogue: '이 해송을 치며 몸을 익히시오. 관아 포졸은 감옥 놈들보다 훨씬 독합니다.', tint: 0x82775f },
      { id: 'ulleung-youth', x: 1190, y: 700, name: '어부 삼돌', dialogue: '이방을 쓰러뜨리면 남쪽 선착장을 열 수 있습니다.', tint: 0x6f8190 },
      { id: 'ulleung-healer', x: 840, y: 470, name: '약손 옥분', dialogue: '형방은 큰 동작 뒤에 내려치니 옆으로 피하세요. 포졸 대장은 주변 병사를 부릅니다.', tint: 0x7f8b72 },
    ];
    villagers.forEach((villager, index) => {
      const x = origin.x + villager.x;
      const y = origin.y + villager.y;
      this.createVillageNpc({
        id: villager.id, x, y, name: villager.name, dialogue: villager.dialogue, mode: 'oppressed', tint: villager.tint,
        speed: 16, patrol: [{ x, y }, { x: x + (index % 2 === 0 ? 26 : -26), y: y + 16 }], facing: index % 2 === 0 ? 0 : Math.PI,
      });
    });
  }

  private createUlleungHighlandRidge(): void {
    const origin = REGION_ORIGINS.ulleungridge;
    const northX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungridge.northX;
    const southX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungridge.southX;
    this.add.text(northX, origin.y + 82, '북쪽 · 피난민 해송마을', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#c7c9b4', stroke: '#11150e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 152);
    this.add.text(southX, origin.y + 918, '남쪽 · 울릉도 관청 감옥터', {
      fontFamily: 'serif', fontSize: '14px', fontStyle: 'bold', color: '#e0ad89', stroke: '#1a0d08', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 925);

    const northPassage = this.add.zone(northX, origin.y + 70, 350, 155).setDepth(origin.y + 170).setInteractive({ useHandCursor: true });
    northPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleungridge', 'north');
    });
    const prisonPassage = this.add.zone(southX, origin.y + 940, 380, 180).setDepth(origin.y + 950).setInteractive({ useHandCursor: true });
    prisonPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleungridge', 'south');
      this.alertMarker(
        southX,
        origin.y + 870,
        this.simulation.isPrisonGateOpen()
          ? '관청 감옥터 숲길로 이동'
          : '관청 감옥 북문이 잠겨 있어 문밖에서 멈춥니다',
      );
    });
  }

  private createUlleungGovernmentDistrict(): void {
    const origin = REGION_ORIGINS.ulleungvillage;
    const northX = origin.x + ULLEUNG_ROAD_ANCHORS.ulleungvillage.northX;
    this.add.text(northX, origin.y + 75, '북쪽 · 울릉도 관청 감옥터 남문', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#cbd6bd', stroke: '#12150f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 916);
    const northPassage = this.add.zone(northX, origin.y + 70, 350, 160)
      .setDepth(origin.y + 168).setInteractive({ useHandCursor: true });
    northPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.moveAcrossUlleungPassage('ulleungvillage', 'north');
    });

    this.add.text(origin.x + 768, origin.y + 225, '외곽 수비 마당 · 포졸 12명 토벌', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#ddc39a', stroke: '#17100b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 617).setAlpha(0.86);
    this.add.text(origin.x + 768, origin.y + 495, '중앙 형벌 마당 · 곤장대와 압수 창고', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#c7ad89', stroke: '#17100b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 427).setAlpha(0.72);
    this.add.text(origin.x + 768, origin.y + 800, '넓은 내아 본청 · 이방 서병관', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#d99a83', stroke: '#190b08', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 212).setAlpha(0.82);

    const braziers = [
      { x: 650, y: 650 }, { x: 886, y: 650 }, { x: 515, y: 465 }, { x: 1021, y: 465 },
      { x: 640, y: 285 }, { x: 896, y: 285 },
    ];
    for (const [index, brazier] of braziers.entries()) {
      const glow = this.add.circle(origin.x + brazier.x, origin.y + brazier.y, 28, 0xd17a35, 0.08)
        .setDepth(origin.y + brazier.y + 1).setBlendMode(Phaser.BlendModes.ADD);
      const ember = this.add.circle(origin.x + brazier.x, origin.y + brazier.y, 3.2, 0xffc06a, 0.72)
        .setDepth(origin.y + brazier.y + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [glow, ember], alpha: { from: 0.34, to: 0.82 }, scale: { from: 0.82, to: 1.15 },
        duration: 850 + index * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    const dockGlow = this.add.ellipse(origin.x + 1375, origin.y + 820, 126, 40, 0x365669, 0.25)
      .setStrokeStyle(1, 0xa2c8d1, 0.46).setDepth(origin.y + 821);
    const dockLabel = this.add.text(origin.x + 1340, origin.y + 875, '울릉 선착장 · 관아 함락 후 본토로', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#d2e0db', stroke: '#101617', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 823);
    const dockZone = this.add.zone(origin.x + 1370, origin.y + 820, 240, 150)
      .setDepth(origin.y + 824).setInteractive({ useHandCursor: true });
    dockZone.setData('dungeonAction', 'government-dock');
    dockZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.travelFromGovernmentDock();
    });
    dockZone.on('pointerover', () => dockGlow.setStrokeStyle(2, this.simulation.isUlleungVillageLiberated() ? 0xf1cf79 : 0xa2c8d1, 0.9));
    dockZone.on('pointerout', () => dockGlow.setStrokeStyle(this.simulation.isUlleungVillageLiberated() ? 2 : 1, this.simulation.isUlleungVillageLiberated() ? 0xd9af54 : 0xa2c8d1, 0.46));
    this.governmentDock = { glow: dockGlow, label: dockLabel, zone: dockZone };
    this.tweens.add({ targets: dockGlow, alpha: { from: 0.12, to: 0.38 }, duration: 1900, yoyo: true, repeat: -1 });
  }

  private createYeongwolTrainingYard(): void {
    const origin = REGION_ORIGINS.yeongwol;
    const structure = (
      key: string,
      localX: number,
      localY: number,
      width: number,
      height: number,
      depthY: number,
      flipX = false,
    ) => {
      const shadow = this.add.ellipse(
        origin.x + localX,
        origin.y + localY + 8,
        width * 0.76,
        Math.max(24, height * 0.13),
        0x070807,
        0.38,
      ).setDepth(origin.y + depthY - 2);
      const image = this.add.image(origin.x + localX, origin.y + localY, key)
        .setDisplaySize(width, height)
        .setOrigin(0.5, 0.94)
        .setFlipX(flipX)
        .setDepth(origin.y + depthY);
      this.occludingStructures.push({
        image,
        left: origin.x + localX - width * 0.48,
        right: origin.x + localX + width * 0.48,
        top: origin.y + localY - height * 0.94,
        front: origin.y + depthY + 32,
      });
      return { image, shadow };
    };

    structure(ASSETS.props.yeongwolOuterGate.key, 768, 1010, 620, 474, 995);
    structure(ASSETS.props.yeongwolInnerGate.key, 768, 166, 520, 344, 154);
    structure(ASSETS.props.yeongwolWatchtower.key, 178, 732, 244, 280, 720);
    structure(ASSETS.props.yeongwolWatchtower.key, 1358, 732, 244, 280, 720, true);
    structure(ASSETS.props.yeongwolBarracks.key, 300, 470, 360, 246, 462);
    structure(ASSETS.props.yeongwolBarracks.key, 1236, 470, 360, 246, 462, true);
    structure(ASSETS.props.yeongwolPalisade.key, 390, 240, 390, 154, 234);
    structure(ASSETS.props.yeongwolPalisade.key, 1146, 240, 390, 154, 234, true);
    structure(ASSETS.props.yeongwolArmoryProps.key, 1175, 730, 244, 220, 722);

    this.add.text(origin.x + 768, origin.y + 838, '영월 대도호부 · 훈련마당', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#ddc69c',
      stroke: '#17100b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 998);
    this.add.text(origin.x + 768, origin.y + 92, '내삼문 · 지휘부', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#d2b78d',
      stroke: '#17100b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 158);

    const torches = [
      [650, 910], [886, 910], [650, 590], [886, 590],
      [640, 178], [896, 178],
    ];
    torches.forEach(([localX, localY], index) => {
      const glow = this.add.circle(origin.x + localX, origin.y + localY, 34, 0xe59448, 0.07)
        .setDepth(origin.y + localY + 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.circle(origin.x + localX, origin.y + localY, 3.4, 0xffcb78, 0.78)
        .setDepth(origin.y + localY + 2)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [glow, core],
        alpha: { from: 0.28, to: 0.88 },
        scale: { from: 0.82, to: 1.18 },
        duration: 760 + index * 75,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const northGate = this.add.zone(origin.x + 768, origin.y + 62, 250, 150)
      .setDepth(origin.y + 164)
      .setInteractive({ useHandCursor: true });
    northGate.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.yeongwolhq.x + 768, y: REGION_ORIGINS.yeongwolhq.y + MAP_HEIGHT - 18 });
    });

    const eastExit = this.add.zone(origin.x + MAP_WIDTH - 45, origin.y + 480, 130, 260)
      .setDepth(origin.y + 700)
      .setInteractive({ useHandCursor: true });
    eastExit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.mistwood.x + 20, y: origin.y + 480 });
    });
    this.add.text(origin.x + MAP_WIDTH - 84, origin.y + 480, '동문 · 청람 안개숲', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#c8d0bf',
      stroke: '#12150f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 702).setRotation(-Math.PI / 2);

    const westExit = this.add.zone(origin.x + 45, origin.y + 500, 130, 260)
      .setDepth(origin.y + 703).setInteractive({ useHandCursor: true });
    westExit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({
        x: REGION_ORIGINS.jeonjufield.x + MAP_WIDTH - 20,
        y: REGION_ORIGINS.jeonjufield.y + 500,
      });
    });
    this.add.text(origin.x + 84, origin.y + 500, '서문 · 전주 완산벌', {
      fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#d0b88d',
      stroke: '#12150f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 704).setRotation(Math.PI / 2);
  }

  private createYeongwolCommandHeadquarters(): void {
    const origin = REGION_ORIGINS.yeongwolhq;

    const hallShadow = this.add.ellipse(origin.x + 768, origin.y + 380, 620, 92, 0x070807, 0.34)
      .setDepth(origin.y + 398);
    const hall = this.add.image(origin.x + 768, origin.y + 222, ASSETS.props.yeongwolHeadquartersHall.key)
      .setDisplaySize(696, 376)
      .setOrigin(0.5)
      .setDepth(origin.y + 405);
    hall.setData('foregroundStructure', true);
    hallShadow.setData('foregroundStructure', true);
    this.occludingStructures.push({
      image: hall,
      left: origin.x + 430,
      right: origin.x + 1106,
      top: origin.y + 34,
      front: origin.y + 438,
    });

    const southGateShadow = this.add.ellipse(origin.x + 768, origin.y + 986, 420, 58, 0x070807, 0.36)
      .setDepth(origin.y + 976);
    const southGate = this.add.image(origin.x + 768, origin.y + 1010, ASSETS.props.yeongwolInnerGate.key)
      .setDisplaySize(540, 357)
      .setOrigin(0.5, 0.94)
      .setDepth(origin.y + 982);
    southGate.setData('foregroundStructure', true);
    southGateShadow.setData('foregroundStructure', true);
    this.occludingStructures.push({
      image: southGate,
      left: origin.x + 508,
      right: origin.x + 1028,
      top: origin.y + 674,
      front: origin.y + 1012,
    });

    const props = [
      { x: 265, y: 612, flip: false },
      { x: 1271, y: 612, flip: true },
    ];
    for (const prop of props) {
      this.add.ellipse(origin.x + prop.x, origin.y + prop.y + 8, 280, 34, 0x070807, 0.34)
        .setDepth(origin.y + prop.y - 2);
      this.add.image(origin.x + prop.x, origin.y + prop.y, ASSETS.props.yeongwolBarracks.key)
        .setDisplaySize(350, 240)
        .setOrigin(0.5, 0.94)
        .setFlipX(prop.flip)
        .setDepth(origin.y + prop.y);
    }

    this.add.image(origin.x + 1190, origin.y + 770, ASSETS.props.yeongwolArmoryProps.key)
      .setDisplaySize(238, 215).setOrigin(0.5, 0.94).setDepth(origin.y + 765);
    this.add.text(origin.x + 768, origin.y + 470, '영월 대도호부 · 별장 지휘부', {
      fontFamily: 'serif', fontSize: '14px', fontStyle: 'bold', color: '#dec69a',
      stroke: '#17100b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 475);

    const torches = [[610, 430], [926, 430], [640, 815], [896, 815]];
    torches.forEach(([localX, localY], index) => {
      const glow = this.add.circle(origin.x + localX, origin.y + localY, 34, 0xe59448, 0.08)
        .setDepth(origin.y + localY + 1).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.circle(origin.x + localX, origin.y + localY, 3.5, 0xffcb78, 0.82)
        .setDepth(origin.y + localY + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [glow, core], alpha: { from: 0.3, to: 0.9 }, scale: { from: 0.84, to: 1.18 },
        duration: 820 + index * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    const southPassage = this.add.zone(origin.x + 768, origin.y + MAP_HEIGHT - 26, 250, 150)
      .setDepth(origin.y + MAP_HEIGHT + 2)
      .setInteractive({ useHandCursor: true });
    southPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.yeongwol.x + 768, y: REGION_ORIGINS.yeongwol.y + 20 });
    });
  }

  private createJeonjuWansanField(): void {
    const origin = REGION_ORIGINS.jeonjufield;
    this.createJeonjuRouteLabel(origin.x + 768, origin.y + 88, '북쪽 · 전주성 풍남문 대회전', 0xd6b17c);
    this.createJeonjuRouteLabel(origin.x + MAP_WIDTH - 104, origin.y + 500, '동쪽 · 영월 관아길', 0xb8c0a5, -Math.PI / 2);
    this.createJeonjuRouteLabel(origin.x + 768, origin.y + 915, '완산벌 남녘 습지 · 광역 사냥터', 0xa7b69b);

    const northPassage = this.add.zone(origin.x + 768, origin.y + 66, 360, 160)
      .setDepth(origin.y + 170).setInteractive({ useHandCursor: true });
    northPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.jeonjugate.x + 768, y: REGION_ORIGINS.jeonjugate.y + MAP_HEIGHT - 20 });
    });
    const eastPassage = this.add.zone(origin.x + MAP_WIDTH - 42, origin.y + 500, 120, 260)
      .setDepth(origin.y + 720).setInteractive({ useHandCursor: true });
    eastPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.yeongwol.x + 20, y: REGION_ORIGINS.yeongwol.y + 500 });
    });

    for (let index = 0; index < 11; index += 1) {
      const seed = this.add.ellipse(
        origin.x + 200 + (index * 127) % 1140,
        origin.y + 250 + (index * 67) % 570,
        42 + index % 3 * 15,
        3,
        0xd0c39d,
        0.06,
      ).setDepth(origin.y + 860 + index).setRotation(-0.12);
      this.tweens.add({
        targets: seed, x: seed.x + 130, y: seed.y - 18, alpha: { from: 0.015, to: 0.13 },
        duration: 1750 + index * 110, delay: index * 150, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    this.createJeonjuWaterMotion(origin);
  }

  private createJeonjuPungnamBattlefield(): void {
    const origin = REGION_ORIGINS.jeonjugate;
    this.createJeonjuRouteLabel(origin.x + 768, origin.y + 90, '풍남문 성문 · 전주성 진입', 0xe0b274);
    this.createJeonjuRouteLabel(origin.x + 768, origin.y + 920, '남쪽 · 완산벌 전투 보급로', 0xc5b38f);

    const northPassage = this.add.zone(origin.x + 768, origin.y + 68, 320, 170)
      .setDepth(origin.y + 180).setInteractive({ useHandCursor: true });
    northPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.jeonju.x + 768, y: REGION_ORIGINS.jeonju.y + MAP_HEIGHT - 20 });
    });
    const southPassage = this.add.zone(origin.x + 768, origin.y + MAP_HEIGHT - 42, 340, 150)
      .setDepth(origin.y + MAP_HEIGHT + 2).setInteractive({ useHandCursor: true });
    southPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.jeonjufield.x + 768, y: REGION_ORIGINS.jeonjufield.y + 20 });
    });
    this.createJeonjuBraziers(origin, [
      [540, 830], [996, 830], [530, 565], [1006, 565], [610, 292], [926, 292],
    ]);
    this.createJeonjuWarBanners(origin);
  }

  private createJeonjuCastleTown(): void {
    const origin = REGION_ORIGINS.jeonju;
    this.createJeonjuRouteLabel(origin.x + 768, origin.y + 92, '전라 감영 · 중군 지휘부', 0xdca96d);
    this.createJeonjuRouteLabel(origin.x + 768, origin.y + 920, '남쪽 · 풍남문 성문전', 0xc8b28b);
    this.createJeonjuRouteLabel(origin.x + 330, origin.y + 625, '전주 큰장 · 서시', 0xd2b986);
    this.createJeonjuRouteLabel(origin.x + 1200, origin.y + 625, '군영 · 대장간 거리', 0xb2b7aa);

    const southPassage = this.add.zone(origin.x + 768, origin.y + MAP_HEIGHT - 40, 340, 150)
      .setDepth(origin.y + MAP_HEIGHT + 2).setInteractive({ useHandCursor: true });
    southPassage.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: REGION_ORIGINS.jeonjugate.x + 768, y: REGION_ORIGINS.jeonjugate.y + 20 });
    });
    this.createJeonjuBraziers(origin, [
      [615, 840], [921, 840], [620, 610], [916, 610], [630, 400], [906, 400], [650, 215], [886, 215],
    ]);
    this.createJeonjuMarketMotion(origin);
  }

  private createGyeongbokPalaceComplex(): void {
    const addForeground = (
      region: 'gyeongbokgate' | 'gyeongbokcourt' | 'gyeongbokinner',
      asset: { key: string; x: number; y: number },
      front: number,
      bounds: { left: number; right: number; top: number; front?: number }
        | Array<{ left: number; right: number; top: number; front?: number }>,
    ) => {
      const origin = REGION_ORIGINS[region];
      const image = this.add.image(origin.x + asset.x, origin.y + asset.y, asset.key)
        .setOrigin(0)
        .setDepth(origin.y + front);
      image.setData('foregroundStructure', true);
      const localAreas = Array.isArray(bounds) ? bounds : [bounds];
      const areas = localAreas.map((area) => ({
        left: origin.x + area.left,
        right: origin.x + area.right,
        top: origin.y + area.top,
        front: origin.y + (area.front ?? front) + 18,
      }));
      this.occludingStructures.push({
        image,
        left: areas[0].left,
        right: areas[0].right,
        top: areas[0].top,
        front: areas[0].front,
        areas,
      });
    };

    addForeground('gyeongbokgate', ASSETS.gyeongbokForegrounds.gwanghwamunOuterGate, 724, {
      left: 340, right: 1196, top: 428,
    });
    addForeground('gyeongbokgate', ASSETS.gyeongbokForegrounds.gwanghwamunInnerGate, 232, {
      left: 430, right: 1106, top: 36,
    });
    addForeground('gyeongbokgate', ASSETS.gyeongbokForegrounds.gwanghwamunSideCompounds, 735, [
      { left: 0, right: 270, top: 300 },
      { left: 250, right: 620, top: 165, front: 590 },
      { left: 916, right: 1286, top: 165, front: 590 },
      { left: 1266, right: 1536, top: 300 },
    ]);
    addForeground('gyeongbokcourt', ASSETS.gyeongbokForegrounds.geunjeongSouthGate, 900, {
      left: 470, right: 1066, top: 620,
    });
    addForeground('gyeongbokcourt', ASSETS.gyeongbokForegrounds.geunjeongHall, 346, {
      left: 440, right: 1096, top: 0,
    });
    addForeground('gyeongbokcourt', ASSETS.gyeongbokForegrounds.geunjeongSideCorridors, 815, [
      { left: 0, right: 480, top: 80 },
      { left: 1056, right: 1536, top: 80 },
    ]);
    addForeground('gyeongbokinner', ASSETS.gyeongbokForegrounds.innerSouthGate, 1000, {
      left: 450, right: 1086, top: 648,
    });
    addForeground('gyeongbokinner', ASSETS.gyeongbokForegrounds.sajeongHall, 482, {
      left: 500, right: 1036, top: 202,
    });
    addForeground('gyeongbokinner', ASSETS.gyeongbokForegrounds.gangnyeongHall, 228, {
      left: 520, right: 1016, top: 0,
    });
    addForeground('gyeongbokinner', ASSETS.gyeongbokForegrounds.innerSideCompounds, 760, [
      { left: 0, right: 560, top: 0 },
      { left: 976, right: 1536, top: 0 },
    ]);

    const marker = (
      region: 'gyeongbokgate' | 'gyeongbokcourt' | 'gyeongbokinner',
      localX: number,
      localY: number,
      title: string,
      subtitle: string,
    ) => {
      const origin = REGION_ORIGINS[region];
      const x = origin.x + localX;
      const y = origin.y + localY;
      this.add.image(x, y - 2, ASSETS.props.worldTransitionProps.key, 8)
        .setScale(0.3)
        .setDepth(y + 1)
        .setName(`palace-landmark-${region}-${title}`);
      this.add.text(x - 13, y - 32, `${title}\n${subtitle}`, {
        fontFamily: 'serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#e6cf9d',
        align: 'center',
        lineSpacing: 2,
        stroke: '#1b110b',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(y + 2);
    };

    marker('gyeongbokgate', 768, 790, '光化門 · 광화문', '궁성 남문 · 삼문 통로');
    marker('gyeongbokgate', 768, 302, '錦川橋 · 금천교', '흥례문 앞 왕궁 어도');
    marker('gyeongbokcourt', 768, 610, '品階石 · 품계석', '동반·서반 정렬 구역');
    marker('gyeongbokcourt', 768, 358, '勤政殿 · 근정전', '조선 왕실 정전 월대');
    marker('gyeongbokinner', 768, 566, '思政殿 · 사정전', '왕의 일상 집무 구역');
    marker('gyeongbokinner', 768, 250, '康寧殿 · 강녕전', '왕의 내전 · 어전 호위');

    const lampPoints: Array<[
      'gyeongbokgate' | 'gyeongbokcourt' | 'gyeongbokinner',
      number,
      number,
    ]> = [
      ['gyeongbokgate', 610, 772], ['gyeongbokgate', 926, 772],
      ['gyeongbokgate', 620, 340], ['gyeongbokgate', 916, 340],
      ['gyeongbokcourt', 535, 585], ['gyeongbokcourt', 1001, 585],
      ['gyeongbokcourt', 610, 355], ['gyeongbokcourt', 926, 355],
      ['gyeongbokinner', 590, 575], ['gyeongbokinner', 946, 575],
      ['gyeongbokinner', 610, 255], ['gyeongbokinner', 926, 255],
    ];
    const selectedLamps = this.mobileProfile ? lampPoints.filter((_, index) => index % 2 === 0) : lampPoints;
    selectedLamps.forEach(([region, localX, localY], index) => {
      const origin = REGION_ORIGINS[region];
      const x = origin.x + localX;
      const y = origin.y + localY;
      const halo = this.add.circle(x, y, 28, 0xf2a64d, 0.08)
        .setDepth(y + 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      const flame = this.add.ellipse(x, y, 5, 9, 0xffd37a, 0.86)
        .setDepth(y + 2)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [halo, flame],
        alpha: { from: 0.2, to: 0.92 },
        scale: { from: 0.82, to: 1.16 },
        duration: 760 + index * 45,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  /**
   * The Busanjin v2 background is authored at gameplay scale. Cropped copies of
   * that same raster become depth-aware foregrounds, keeping the south gate and
   * side compounds in front of actors without introducing mismatched vector art.
   */
  private createBusanjinFortressLayers(): void {
    const origin = REGION_ORIGINS.busanjin;
    const addRasterCrop = (
      name: string,
      crop: { x: number; y: number; width: number; height: number },
      front: number,
      localAreas: Array<{ left: number; right: number; top: number; front: number }>,
    ) => {
      const image = this.add.image(origin.x, origin.y, ASSETS.busanjinSiegeBackground.key)
        .setOrigin(0)
        .setCrop(crop.x, crop.y, crop.width, crop.height)
        .setDepth(origin.y + front)
        .setName(`busanjin-raster-foreground-${name}`);
      image.setData('foregroundStructure', true);
      const areas = localAreas.map((area) => ({
        left: origin.x + area.left,
        right: origin.x + area.right,
        top: origin.y + area.top,
        front: origin.y + area.front,
      }));
      this.occludingStructures.push({
        image,
        left: areas[0].left,
        right: areas[0].right,
        top: areas[0].top,
        front: areas[0].front,
        areas,
      });
    };

    addRasterCrop('north-west-compound', { x: 180, y: 20, width: 410, height: 430 }, 445, [
      { left: 210, right: 590, top: 20, front: 450 },
    ]);
    addRasterCrop('north-east-compound', { x: 946, y: 20, width: 360, height: 430 }, 445, [
      { left: 946, right: 1306, top: 20, front: 450 },
    ]);
    addRasterCrop('south-wall-west', { x: 210, y: 510, width: 380, height: 270 }, 770, [
      { left: 210, right: 590, top: 510, front: 780 },
    ]);
    addRasterCrop('south-gate-roof', { x: 430, y: 500, width: 676, height: 165 }, 690, [
      { left: 430, right: 1106, top: 500, front: 720 },
    ]);
    addRasterCrop('south-wall-east', { x: 946, y: 510, width: 360, height: 270 }, 770, [
      { left: 946, right: 1306, top: 510, front: 780 },
    ]);

    const torchPoints = [
      [535, 735], [1001, 735], [535, 112], [1001, 112],
    ] as const;
    for (const [localX, localY] of torchPoints) {
      const x = origin.x + localX;
      const y = origin.y + localY;
      const halo = this.add.ellipse(x, y - 10, 44, 28, 0xe99142, 0.08)
        .setDepth(y + 2)
        .setBlendMode(Phaser.BlendModes.ADD);
      const flame = this.add.ellipse(x, y - 12, 6, 12, 0xffc766, 0.82)
        .setDepth(y + 3)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [halo, flame],
        alpha: { from: 0.22, to: 0.9 },
        scale: { from: 0.84, to: 1.14 },
        duration: 680 + localY,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createPyongyangStructureLayers(): void {
    const addForeground = (
      region: PyongyangRegionId,
      asset: { key: string; x: number; y: number },
      front: number,
      localAreas: Array<{ left: number; right: number; top: number; front?: number }>,
    ) => {
      const origin = REGION_ORIGINS[region];
      const image = this.add.image(origin.x + asset.x, origin.y + asset.y, asset.key)
        .setOrigin(0)
        .setDepth(origin.y + front);
      image.setData('foregroundStructure', true);
      const areas = localAreas.map((area) => ({
        left: origin.x + area.left,
        right: origin.x + area.right,
        top: origin.y + area.top,
        front: origin.y + (area.front ?? front) + 18,
      }));
      const bounds = areas[0];
      this.occludingStructures.push({
        image,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        front: bounds.front,
        areas,
      });
    };

    addForeground('pyongyangouter', ASSETS.pyongyangForegrounds.outerNorthCamps, 440, [
      { left: 18, right: 610, top: 140, front: 430 },
      { left: 900, right: 1536, top: 140, front: 440 },
    ]);
    addForeground('pyongyangouter', ASSETS.pyongyangForegrounds.outerRampart, 614, [
      { left: 0, right: 650, top: 326 },
      { left: 650, right: 886, top: 326, front: 532 },
      { left: 886, right: 1536, top: 326 },
    ]);
    addForeground('pyongyangouter', ASSETS.pyongyangForegrounds.outerSouthSettlement, 985, [
      { left: 0, right: 610, top: 548 },
      { left: 910, right: 1536, top: 548 },
    ]);

    addForeground('pyongyanggate', ASSETS.pyongyangForegrounds.daedongNorthWorks, 282, [
      { left: 0, right: 605, top: 0, front: 270 },
      { left: 920, right: 1325, top: 0 },
    ]);
    addForeground('pyongyanggate', ASSETS.pyongyangForegrounds.daedongRampart, 470, [
      { left: 0, right: 650, top: 108 },
      { left: 650, right: 885, top: 108, front: 426 },
      { left: 885, right: 1295, top: 108 },
    ]);
    addForeground('pyongyanggate', ASSETS.pyongyangForegrounds.daedongSiegeworks, 960, [
      { left: 0, right: 570, top: 330 },
      { left: 965, right: 1536, top: 330 },
    ]);

    addForeground('pyongyanginner', ASSETS.pyongyangForegrounds.innerNorthWall, 188, [
      { left: 0, right: 666, top: 0 },
      { left: 666, right: 870, top: 0, front: 150 },
      { left: 870, right: 1536, top: 0 },
    ]);
    addForeground('pyongyanginner', ASSETS.pyongyangForegrounds.innerUpperCompounds, 480, [
      { left: 20, right: 620, top: 70, front: 465 },
      { left: 890, right: 1516, top: 70 },
    ]);
    addForeground('pyongyanginner', ASSETS.pyongyangForegrounds.innerLowerCompounds, 805, [
      { left: 0, right: 585, top: 360 },
      { left: 930, right: 1536, top: 360 },
    ]);
    addForeground('pyongyanginner', ASSETS.pyongyangForegrounds.innerSouthWall, 930, [
      { left: 0, right: 650, top: 690 },
      { left: 650, right: 886, top: 690, front: 868 },
      { left: 886, right: 1536, top: 690 },
    ]);
  }

  private createJurchenVillage(): void {
    const origin = REGION_ORIGINS.jurchenvillage;
    const structures: Array<{
      frame: number;
      x: number;
      y: number;
      width: number;
      height: number;
      left: number;
      right: number;
      top: number;
      front: number;
      flipX?: boolean;
    }> = [
      { frame: 0, x: 768, y: 385, width: 520, height: 390, left: 530, right: 1006, top: 50, front: 400 },
      { frame: 1, x: 290, y: 570, width: 330, height: 330, left: 142, right: 438, top: 275, front: 580 },
      { frame: 2, x: 1240, y: 610, width: 450, height: 330, left: 1030, right: 1450, top: 310, front: 620 },
      { frame: 4, x: 1260, y: 450, width: 290, height: 330, left: 1130, right: 1390, top: 145, front: 460 },
      { frame: 5, x: 290, y: 850, width: 320, height: 235, left: 145, right: 435, top: 635, front: 860 },
    ];

    for (const structure of structures) {
      const image = this.add.image(
        origin.x + structure.x,
        origin.y + structure.y,
        ASSETS.props.jurchenVillageStructures.key,
        structure.frame,
      )
        .setDisplaySize(structure.width, structure.height)
        .setOrigin(0.5, 0.97)
        .setFlipX(Boolean(structure.flipX))
        .setDepth(origin.y + structure.front);
      image.setData('foregroundStructure', true);
      this.occludingStructures.push({
        image,
        left: origin.x + structure.left,
        right: origin.x + structure.right,
        top: origin.y + structure.top,
        front: origin.y + structure.front,
      });
    }

    const palisade = this.add.image(
      origin.x + 768,
      origin.y + 1012,
      ASSETS.props.jurchenVillageStructures.key,
      3,
    )
      .setDisplaySize(690, 410)
      .setOrigin(0.5, 0.97)
      .setDepth(origin.y + 1008);
    palisade.setData('foregroundStructure', true);
    this.occludingStructures.push({
      image: palisade,
      left: origin.x + 430,
      right: origin.x + 1106,
      top: origin.y + 650,
      front: origin.y + 1016,
      areas: [
        { left: origin.x + 430, right: origin.x + 650, top: origin.y + 650, front: origin.y + 1016 },
        { left: origin.x + 886, right: origin.x + 1106, top: origin.y + 650, front: origin.y + 1016 },
      ],
    });

    this.add.text(origin.x + 768, origin.y + 485, '여진 대족장 · 아이신고로 바투르', {
      fontFamily: '"Noto Serif KR", serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f1d49b',
      backgroundColor: 'rgba(20,16,13,0.78)',
      padding: { x: 12, y: 6 },
      stroke: '#1b1009',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + 490);
  }

  private addRegionalGroundDetails(
    region: RegionId,
    origin: { x: number; y: number },
    frames: readonly number[],
    seed: number,
    depth = WORLD_FLOOR_DEPTH + 3,
    edgeMargin = 150,
  ): void {
    let state = (seed * 0x9e3779b1) >>> 0;
    const random = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const count = this.mobileProfile ? 5 : 9;
    const corridorHalfWidth = 260;
    const sideMargin = edgeMargin;
    const sideSpan = MAP_WIDTH / 2 - corridorHalfWidth - sideMargin;
    for (let index = 0; index < count; index += 1) {
      const frame = frames[index % frames.length];
      const onLeft = index % 2 === 0;
      const localX = onLeft
        ? sideMargin + random() * sideSpan
        : MAP_WIDTH - sideMargin - random() * sideSpan;
      const detail = this.add.image(
        origin.x + localX,
        origin.y + 120 + random() * (MAP_HEIGHT - 260),
        ASSETS.props.worldGroundDetails.key,
        frame,
      )
        .setScale(0.48 + random() * 0.34, 0.4 + random() * 0.28)
        .setAngle(-18 + random() * 36)
        .setFlipX(random() > 0.5)
        .setAlpha(0.38 + random() * 0.22)
        .setDepth(depth)
        .setName(`regional-ground-detail-${region}-${index}`);
      detail.setData('defaultObjectComposedRegion', region);
    }
  }

  private addRegionalNaturalRoad(
    region: RegionId,
    origin: { x: number; y: number },
    frame: number,
    width: number,
    seed: number,
    alpha = 0.68,
  ): void {
    // The road atlas frames are square. Stretching one frame across a complete
    // 1024 px region elongated stones, roots and wheel ruts into a straight
    // synthetic stripe. Three short, slightly overlapping pieces preserve the
    // authored proportions; the reversed middle piece also joins each curved
    // end to its matching edge without a visible hard cut.
    const segmentCount = 3;
    const roadSpan = MAP_HEIGHT + 72;
    const segmentOverlap = 16;
    const segmentHeight = (roadSpan + segmentOverlap * (segmentCount - 1)) / segmentCount;
    const segmentStride = segmentHeight - segmentOverlap;
    const roadTop = origin.y + (MAP_HEIGHT - roadSpan) / 2;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const road = this.add.image(
        origin.x + MAP_WIDTH / 2,
        roadTop + segmentHeight / 2 + segmentIndex * segmentStride,
        ASSETS.props.worldNaturalRoads.key,
        frame,
      )
        .setDisplaySize(width, segmentHeight)
        .setFlipX(seed % 2 === 1)
        .setFlipY(segmentIndex % 2 === 1)
        .setAlpha(alpha)
        .setDepth(WORLD_FLOOR_DEPTH + 4)
        .setName(`regional-natural-road-${region}-${segmentIndex}`);
      road
        .setData('defaultObjectComposedRegion', region)
        .setData('regionalRoadSegment', segmentIndex);
    }
  }

  private createExtendedWorlds(): void {
    for (const region of EXTENDED_REGION_IDS) {
      const layout = EXTENDED_REGION_LAYOUTS[region];
      const origin = REGION_ORIGINS[region];
      const background = ASSETS.extendedRegionBackgrounds[region];
      if (!this.textures.exists(background.key)) continue;
      this.add.image(origin.x + MAP_WIDTH / 2, origin.y + MAP_HEIGHT / 2, background.key)
        .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
        .setDepth(WORLD_FLOOR_DEPTH + 1)
        .setName(`extended-background-${region}`)
        .setData('defaultObjectComposedRegion', region)
        .setData('generatedEnvironment', true);

      const propTexture = (
        kind: ExtendedRegionPropKind,
      ): { key: string; frame?: number } => {
        switch (kind) {
          case 'pine': return {
            key: ASSETS.props.joseonTreeSpecies.key,
            frame: treeSpeciesFrame('coastal-black-pine'),
          };
          case 'shrine': return { key: ASSETS.props.spiritShrine.key };
          case 'cart': return { key: ASSETS.props.brokenCart.key };
          case 'watchtower': return { key: ASSETS.props.yeongwolWatchtower.key };
          case 'palisade': return { key: ASSETS.props.yeongwolPalisade.key };
          case 'dock': return { key: ASSETS.props.worldTransitionProps.key, frame: 6 };
        }
      };

      if (!layout.useDynamicAmbientProps) {
        for (const [propIndex, prop] of layout.props.entries()) {
          const x = origin.x + prop.x;
          const y = origin.y + prop.y;
          const tree = prop.kind === 'pine';
          const visualScale = tree ? 0.64 : prop.kind === 'dock' ? 0.7 : 0.76;
          const visualWidth = prop.width * visualScale;
          const visualHeight = prop.height * visualScale;
          const texture = tree
            ? {
              key: ASSETS.props.joseonTreeSpecies.key,
              frame: treeSpeciesFrame(prop.treeSpecies ?? 'coastal-black-pine'),
            }
            : propTexture(prop.kind);
          const image = this.add.image(x, y, texture.key, texture.frame)
            .setDisplaySize(visualWidth, visualHeight)
            .setOrigin(0.5, tree ? 0.978 : 0.94)
            .setFlipX(prop.flipX ?? false)
            .setAlpha(tree ? 0.7 : 0.78)
            .setDepth(y)
            .setName(`extended-prop-${region}-${prop.kind}-${propIndex}`);
          if (prop.tint && !tree) image.setTint(prop.tint);
          image
            .setData('defaultObjectComposedRegion', region)
            .setData('extendedRegionProp', prop.kind)
            .setData('foregroundStructure', true);
          if (tree) image.setData('treeSpecies', prop.treeSpecies ?? 'coastal-black-pine');
          this.occludingStructures.push({
            image,
            left: x - visualWidth * 0.47,
            right: x + visualWidth * 0.47,
            top: y - visualHeight * (tree ? 0.978 : 0.94),
            front: y + Math.max(26, visualHeight * 0.09),
          });
        }
      }

      createExtendedRegionMotion(this, region, origin, layout, this.mobileProfile);
      this.add.text(origin.x + 768, origin.y + 956, layout.subtitle, {
        fontFamily: 'serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f0ddb1',
        backgroundColor: 'rgba(15,19,23,0.7)',
        padding: { x: 12, y: 6 },
        stroke: '#18110d',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(origin.y + 950);
    }
  }

  private createEpisode2Worlds(): void {
    for (const region of EPISODE2_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      const layout = EPISODE2_REGION_LAYOUTS[region];
      createEpisode2RegionWorld(
        this,
        region,
        origin,
        layout,
        this.mobileProfile,
        () => ({ x: this.simulation.player.x, y: this.simulation.player.y }),
      );
      this.add.text(origin.x + MAP_WIDTH / 2, origin.y + MAP_HEIGHT - 52, layout.ecologyNote, {
        fontFamily: 'serif',
        fontSize: this.mobileProfile ? '11px' : '13px',
        color: '#e8d7af',
        backgroundColor: 'rgba(13, 18, 18, 0.72)',
        padding: { x: 12, y: 7 },
        stroke: '#17110d',
        strokeThickness: 3,
        wordWrap: { width: this.mobileProfile ? 560 : 860 },
        align: 'center',
      })
        .setOrigin(0.5)
        .setDepth(origin.y + MAP_HEIGHT - 44)
        .setName(`episode2-ecology-note-${region}`)
        .setData('defaultObjectComposedRegion', region)
        .setData('episode2EcologyNote', true);
    }
  }

  private createJapanExpansionWorlds(): void {

    const propTexture = (
      kind: JapanExpansionPropKind,
    ): { key: string; frame?: number } => {
      switch (kind) {
        case 'outer-gate': return { key: ASSETS.props.japanRegionProps.key, frame: 8 };
        case 'inner-gate': return { key: ASSETS.props.japanRegionProps.key, frame: 8 };
        case 'watchtower': return { key: ASSETS.props.japanRegionProps.key, frame: 1 };
        case 'barracks': return { key: ASSETS.props.japanRegionProps.key, frame: 2 };
        case 'palisade': return { key: ASSETS.props.japanRegionProps.key, frame: 3 };
        case 'armory': return { key: ASSETS.props.japanRegionProps.key, frame: 5 };
        case 'headquarters': return { key: ASSETS.props.japanRegionProps.key, frame: 0 };
        case 'pine': return { key: ASSETS.props.joseonTreeSpecies.key, frame: treeSpeciesFrame('coastal-black-pine') };
        case 'shrine': return { key: ASSETS.props.japanRegionProps.key, frame: 4 };
        case 'cart': return { key: ASSETS.props.brokenCart.key };
        case 'workstation': return { key: ASSETS.props.blacksmithWorkstation.key };
      }
    };

    for (const [regionIndex, region] of JAPAN_EXPANSION_REGION_IDS.entries()) {
      const layout = JAPAN_EXPANSION_LAYOUTS[region];
      const origin = REGION_ORIGINS[region];
      const terrainKey = ASSETS.japanGroundTile.key;
      const usesAuthoredAwajiMap = region === 'awajicoast'
        && this.textures.exists(ASSETS.awajiCoastBackground.key);
      let floor: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
      if (usesAuthoredAwajiMap) {
        floor = this.add.image(
          origin.x + MAP_WIDTH / 2,
          origin.y + MAP_HEIGHT / 2,
          ASSETS.awajiCoastBackground.key,
        )
          .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
          .setDepth(WORLD_FLOOR_DEPTH + 1)
          .setName('authored-map-background-awajicoast');
        floor.setData('authoredMapBackground', 'awajicoast');
      } else {
        const tiledFloor = this.add.tileSprite(
          origin.x + MAP_WIDTH / 2,
          origin.y + MAP_HEIGHT / 2,
          MAP_WIDTH,
          MAP_HEIGHT,
          terrainKey,
        )
          .setTileScale(1 + (regionIndex % 3) * 0.035)
          // Keep the only horizontal texture wrap under the central road. A Y
          // offset would pull the non-seamless top/bottom wrap into the middle
          // of the playable field and create a visible cross-map cut.
          .setTilePosition(256, 0)
          .setDepth(WORLD_FLOOR_DEPTH + 1)
          .setTint(layout.floorTint)
          .setAlpha(0.98);
        if (!this.textures.exists(terrainKey)) {
          tiledFloor.setTexture(ASSETS.background.key)
            .setSize(MAP_WIDTH, MAP_HEIGHT)
            .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
            .setTint(layout.floorTint);
        }
        floor = tiledFloor;
      }
      floor.setData('defaultObjectComposedRegion', region);
      if (!usesAuthoredAwajiMap) {
        this.addRegionalGroundDetails(
          region,
          origin,
          region === 'awajicoast'
            ? [4, 2, 3, 0]
            : layout.category === 'city'
              ? [6, 0, 2, 4]
              : [1, 2, 8, 0],
          31 + regionIndex,
          WORLD_FLOOR_DEPTH + 5,
          layout.waterSide ? 410 : 150,
        );
        const roadFrame = region === 'awajicoast'
          ? 0
          : layout.category === 'city'
            ? 6
            : region === 'izumihunt' || region === 'tsushimahunt'
              ? 1
              : 0;
        this.addRegionalNaturalRoad(
          region,
          origin,
          roadFrame,
          layout.category === 'city' ? 440 : region === 'awajicoast' ? 360 : 400,
          31 + regionIndex,
          layout.category === 'city' ? 0.74 : 0.62,
        );
      }

      const waterSides = layout.waterSide === 'both'
        ? (['left', 'right'] as const)
        : layout.waterSide
          ? ([layout.waterSide] as const)
          : [];
      for (const side of waterSides) {
        if (!usesAuthoredAwajiMap) {
          const water = this.add.graphics()
            .setPosition(origin.x, origin.y)
            .setDepth(WORLD_FLOOR_DEPTH + 4);
          const shoreline = JAPAN_SHORELINE_SAMPLES;
          const waterPoints = side === 'left'
            ? [
              { x: 0, y: 0 },
              ...shoreline.map((shoreX, index) => ({ x: shoreX, y: index * MAP_HEIGHT / (shoreline.length - 1) })),
              { x: 0, y: MAP_HEIGHT },
            ]
            : [
              { x: MAP_WIDTH, y: 0 },
              ...shoreline.map((shoreX, index) => ({
                x: MAP_WIDTH - shoreX,
                y: index * MAP_HEIGHT / (shoreline.length - 1),
              })),
              { x: MAP_WIDTH, y: MAP_HEIGHT },
            ];
          water.fillStyle(0x234f5e, 0.58);
          water.fillPoints(waterPoints, true);
          water.lineStyle(18, 0xb6a278, 0.24);
          water.beginPath();
          shoreline.forEach((shoreX, index) => {
            const x = side === 'left' ? shoreX : MAP_WIDTH - shoreX;
            const y = index * MAP_HEIGHT / (shoreline.length - 1);
            if (index === 0) water.moveTo(x, y);
            else water.lineTo(x, y);
          });
          water.strokePath();
          for (const [coastIndex, localY] of [145, 512, 879].entries()) {
            const shorelineInset = japanShorelineWidthAtY(localY);
            const coast = this.add.image(
              origin.x + (side === 'left' ? shorelineInset : MAP_WIDTH - shorelineInset),
              origin.y + localY,
              ASSETS.props.worldNaturalRoads.key,
              5,
            )
              .setDisplaySize(300, 410)
              .setFlipX(side === 'left')
              .setFlipY(coastIndex % 2 === 1)
              .setAlpha(0.72)
              .setDepth(WORLD_FLOOR_DEPTH + 5)
              .setName(`japan-coast-piece-${region}-${side}-${coastIndex}`);
            coast.setData('defaultObjectComposedRegion', region);
          }
        }

        const dock = this.add.image(
          origin.x + (side === 'left' ? JAPAN_DOCK_X_INSET : MAP_WIDTH - JAPAN_DOCK_X_INSET),
          origin.y + JAPAN_DOCK_Y_BY_REGION[region],
          ASSETS.props.japanRegionProps.key,
          6,
        )
          .setScale(0.44)
          .setAngle(side === 'left' ? 90 : -90)
          .setFlipY(side === 'right')
          .setDepth(origin.y + JAPAN_DOCK_Y_BY_REGION[region] + 2)
          .setName(`japan-dock-piece-${region}-${side}`);
        dock.setData('defaultObjectComposedRegion', region);
      }

      for (const [propIndex, prop] of layout.props.entries()) {
        const x = origin.x + prop.x;
        const y = origin.y + prop.y;
        const texture = prop.kind === 'pine'
          ? {
            key: ASSETS.props.joseonTreeSpecies.key,
            frame: treeSpeciesFrame(prop.treeSpecies ?? 'coastal-black-pine'),
          }
          : propTexture(prop.kind);
        const tree = prop.kind === 'pine';
        const image = this.add.image(x, y, texture.key, texture.frame)
          .setDisplaySize(prop.width, prop.height)
          .setOrigin(0.5, tree ? 0.978 : 0.94)
          .setFlipX(prop.flipX ?? false)
          .setDepth(y);
        if (prop.tint && !tree) image.setTint(prop.tint);
        image.setData('japanExpansionProp', prop.kind);
        if (tree) {
          image.setData('treeSpecies', prop.treeSpecies ?? 'coastal-black-pine');
          if (!this.mobileProfile || propIndex % 2 === 0) {
            const direction = prop.flipX ? -1 : 1;
            this.tweens.add({
              targets: image,
              angle: { from: -0.18 * direction, to: 0.34 * direction },
              duration: 3300 + regionIndex * 130 + propIndex * 95,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          }
        }
        this.occludingStructures.push({
          image,
          left: x - prop.width * 0.47,
          right: x + prop.width * 0.47,
          top: y - prop.height * (tree ? 0.978 : 0.94),
          front: y + Math.max(28, prop.height * 0.09),
        });
      }

      this.add.text(origin.x + 768, origin.y + 944, layout.subtitle, {
        fontFamily: 'serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#dbc79f',
        backgroundColor: 'rgba(20,16,12,0.7)',
        padding: { x: 12, y: 6 },
        stroke: '#18110d',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(origin.y + 950);
    }
  }

  private createJurchenExpansionWorlds(): void {
    const propTexture = (
      kind: JurchenExpansionPropKind,
    ): { key: string; frame?: number } => {
      if (isJurchenStructureKind(kind)) {
        return {
          key: ASSETS.props.jurchenVillageStructures.key,
          frame: jurchenStructureFrame(kind),
        };
      }
      if (kind === 'pine') return { key: ASSETS.props.joseonTreeSpecies.key, frame: treeSpeciesFrame('birch') };
      if (kind === 'shrine') return { key: ASSETS.props.ulleungAdventureProps.key, frame: 1 };
      return { key: ASSETS.props.brokenCart.key };
    };

    for (const [regionIndex, region] of JURCHEN_EXPANSION_REGION_IDS.entries()) {
      const layout = JURCHEN_EXPANSION_LAYOUTS[region];
      const origin = REGION_ORIGINS[region];
      const terrainKey = ASSETS.northernGroundTile.key;
      const floor = this.add.tileSprite(
        origin.x + MAP_WIDTH / 2,
        origin.y + MAP_HEIGHT / 2,
        MAP_WIDTH,
        MAP_HEIGHT,
        terrainKey,
      )
        .setTileScale(1 + (regionIndex % 3) * 0.035)
        .setTilePosition(256, 0)
        .setDepth(WORLD_FLOOR_DEPTH + 1)
        .setTint(layout.floorTint)
        .setAlpha(0.98);
      if (!this.textures.exists(terrainKey)) {
        floor.setTexture(ASSETS.background.key)
          .setSize(MAP_WIDTH, MAP_HEIGHT)
          .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
          .setTint(layout.floorTint);
      }
      floor.setData('defaultObjectComposedRegion', region);

      this.addRegionalGroundDetails(
        region,
        origin,
        layout.category === 'village' ? [5, 2, 8, 0] : [5, 8, 1, 2],
        101 + regionIndex,
        WORLD_FLOOR_DEPTH + 5,
      );
      const roadFrame = region === 'songhuahunt'
        ? 4
        : region === 'blackpinehunt'
          ? 1
          : 3;
      this.addRegionalNaturalRoad(
        region,
        origin,
        roadFrame,
        layout.category === 'village' ? 450 : 390,
        101 + regionIndex,
        layout.category === 'village' ? 0.7 : 0.62,
      );

      for (const [propIndex, prop] of layout.props.entries()) {
        const x = origin.x + prop.x;
        const y = origin.y + prop.y;
        const texture = prop.kind === 'pine'
          ? {
            key: ASSETS.props.joseonTreeSpecies.key,
            frame: treeSpeciesFrame(prop.treeSpecies ?? 'birch'),
          }
          : propTexture(prop.kind);
        const tree = prop.kind === 'pine';
        const image = this.add.image(x, y, texture.key, texture.frame)
          .setDisplaySize(prop.width, prop.height)
          .setOrigin(0.5, tree ? 0.978 : 0.94)
          .setFlipX(prop.flipX ?? false)
          .setDepth(y);
        if (prop.tint && !tree) image.setTint(prop.tint);
        image.setData('jurchenExpansionProp', prop.kind);
        if (tree) {
          image.setData('treeSpecies', prop.treeSpecies ?? 'birch');
          if (!this.mobileProfile || propIndex % 2 === 0) {
            const direction = prop.flipX ? -1 : 1;
            this.tweens.add({
              targets: image,
              angle: { from: -0.16 * direction, to: 0.29 * direction },
              duration: 3600 + regionIndex * 145 + propIndex * 90,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          }
        }
        this.occludingStructures.push({
          image,
          left: x - prop.width * 0.47,
          right: x + prop.width * 0.47,
          top: y - prop.height * (tree ? 0.978 : 0.94),
          front: y + Math.max(28, prop.height * 0.09),
        });
      }

      this.add.text(origin.x + 768, origin.y + 944, layout.subtitle, {
        fontFamily: 'serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#dce6e5',
        backgroundColor: 'rgba(13,24,27,0.76)',
        padding: { x: 12, y: 6 },
        stroke: '#101a1d',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(origin.y + 950);
    }
  }

  private createJoseonTownWorlds(): void {
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const layout = JOSEON_TOWN_LAYOUTS[region];
      const origin = REGION_ORIGINS[region];
      const texture = this.textures.exists(layout.backgroundKey)
        ? layout.backgroundKey
        : ASSETS.background.key;
      const background = this.add.image(
        origin.x + MAP_WIDTH / 2,
        origin.y + MAP_HEIGHT / 2,
        texture,
      )
        .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
        .setDepth(WORLD_FLOOR_DEPTH + 1)
        .setData('joseonTownBackground', region);
      this.joseonTownBackgrounds.set(region, background);
      if (region === this.simulation.region && this.textures.exists(layout.backgroundKey)) {
        this.populateJoseonTownRegion(region);
      }
    }
    this.createHanseongPalaceLinks();
  }

  private populateJoseonTownRegion(region: JoseonTownRegionId): void {
    if (this.joseonTownRegionsPopulated.has(region)) return;
    if (region === 'changdeokgung' && !this.textures.exists(ASSETS.gwanghaePrince.key)) return;
    this.joseonTownRegionsPopulated.add(region);
    if (region === 'changdeokgung') this.createGwanghaeAnimations();

    const layout = JOSEON_TOWN_LAYOUTS[region];
    const origin = REGION_ORIGINS[region];
    const subtitleY = layout.subtitleY ?? 78;
    const subtitle = this.add.text(origin.x + 768, origin.y + subtitleY, layout.subtitle, {
      fontFamily: '"Noto Serif KR", serif',
      fontSize: this.mobileProfile ? '12px' : '14px',
      fontStyle: 'bold',
      color: '#e1cfa7',
      backgroundColor: 'rgba(18,14,11,0.7)',
      padding: { x: 12, y: 6 },
      stroke: '#16100c',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(origin.y + subtitleY + 6);
    this.registerLazyAmbientObject(subtitle, region);

    for (const landmark of layout.landmarks) {
      const x = origin.x + landmark.x;
      const y = origin.y + landmark.y;
      if (landmark.marker === true) {
        const backdrop = this.add.image(x, y - 2, ASSETS.props.worldTransitionProps.key, 8)
          .setScale(0.28)
          .setFlipX(landmark.x > MAP_WIDTH / 2)
          .setDepth(y + 1)
          .setName(`town-landmark-${region}-${landmark.id}`);
        this.registerLazyAmbientObject(backdrop, region);
      }
      const labelOffsetX = landmark.marker === true ? landmark.x > MAP_WIDTH / 2 ? 13 : -13 : 0;
      const labelOffsetY = landmark.marker === true ? -31 : -10;
      const label = this.add.text(x + labelOffsetX, y + labelOffsetY, landmark.label, {
        fontFamily: '"Noto Serif KR", serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ddc794',
        stroke: '#17100c',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(y + 2);
      this.registerLazyAmbientObject(label, region);
    }

    const rallyProgress = this.simulation.isGwanghaePrince()
      ? this.simulation.getGwanghaeRallyProgress()
      : null;
    const visibleNpcs = this.simulation.isGwanghaePrince()
      ? layout.npcs.filter((placement) => placement.id !== 'crown-prince-gwanghae')
      : layout.npcs;
    const npcPlacements = this.mobileProfile
      ? [...visibleNpcs]
        .sort((left, right) => {
          const priority = (role: typeof left.role): number => role === 'royal' ? 0 : role === 'guard' ? 1 : 2;
          const rallyPriority = (id: string): number => {
            const point = rallyProgress?.points.find((candidate) => candidate.npcId === id);
            return point && !point.completed ? -2 : 0;
          };
          return rallyPriority(left.id) - rallyPriority(right.id) || priority(left.role) - priority(right.role);
        })
        .slice(0, 4)
      : visibleNpcs;
    for (const placement of npcPlacements) {
      const rallyPoint = rallyProgress?.points.find((point) => point.npcId === placement.id);
      const mode: VillageNpcMode = placement.role === 'royal'
        ? 'gwanghae'
        : placement.role === 'guard'
          ? 'guard'
          : 'commoner';
      const patrol = placement.patrol?.map((point) => ({
        x: origin.x + point.x,
        y: origin.y + point.y,
      })) ?? [];
      this.createVillageNpc({
        id: placement.id,
        x: origin.x + placement.x,
        y: origin.y + placement.y,
        name: placement.name,
        dialogue: placement.dialogue.join(' '),
        role: placement.role === 'royal' ? 'royal' : 'patrol',
        mode,
        tint: 0xffffff,
        scale: placement.role === 'royal' ? 0.51 : placement.role === 'guard' ? 0.5 : 0.47,
        speed: placement.role === 'royal' ? 24 : placement.role === 'guard' ? 34 : 38,
        patrol: patrol.length > 0
          ? patrol
          : [{ x: origin.x + placement.x, y: origin.y + placement.y }],
        facing: placement.role === 'royal' ? Math.PI / 2 : undefined,
        service: placement.role === 'merchant' || placement.role === 'healer'
          ? 'market'
          : placement.role === 'artisan'
            ? 'forge'
            : undefined,
        rallyStatus: rallyPoint
          ? rallyPoint.completed ? 'completed' : rallyPoint.available ? 'available' : 'locked'
          : undefined,
      });
    }

    this.createJoseonTownGateSigns(region);

    const glowCount = this.mobileProfile ? 2 : 5;
    for (let index = 0; index < glowCount; index += 1) {
      const x = origin.x + 260 + ((index * 263) % 1010);
      const y = origin.y + 210 + ((index * 151) % 620);
      const glow = this.add.circle(x, y, 3.5, 0xf0a652, 0.18)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 1);
      this.registerLazyAmbientObject(glow, region);
      const tween = this.tweens.add({
        targets: glow,
        alpha: { from: 0.08, to: 0.5 },
        scale: { from: 0.72, to: 1.22 },
        duration: 860 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.ambientWorldTweens.push({ tween, region });
    }
    this.syncAmbientWorldState(this.simulation.region);
  }

  private createJoseonTownGateSigns(region: JoseonTownRegionId): void {
    const origin = REGION_ORIGINS[region];
    for (const gate of JOSEON_TOWN_LAYOUTS[region].gates) {
      const signX = origin.x + gate.x + (gate.edge === 'north' ? -138 : 138);
      const signY = origin.y + (gate.edge === 'north' ? 132 : MAP_HEIGHT - 132);
      const approach = {
        x: origin.x + gate.x,
        y: origin.y + (gate.edge === 'north' ? 172 : MAP_HEIGHT - 172),
      };
      const arrow = gate.edge === 'north' ? '↑' : '↓';
      const sign = this.add.image(signX, signY, ASSETS.props.worldTransitionProps.key, 8)
        .setScale(this.mobileProfile ? 0.3 : 0.36)
        .setFlipX(gate.edge === 'south')
        .setDepth(signY + 2)
        .setName(`joseon-route-sign-${gate.id}`);
      const label = this.add.text(signX, signY - 37, `${arrow} ${gate.label}`, {
        fontFamily: '"Noto Serif KR", serif',
        fontSize: this.mobileProfile ? '12px' : '14px',
        fontStyle: 'bold',
        color: '#f0d59a',
        stroke: '#1a1009',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(signY + 5);
      const zone = this.add.zone(signX, signY, 240, 92)
        .setDepth(signY + 6)
        .setInteractive({ useHandCursor: true })
        .setData('dungeonAction', `joseon-road-${region}-${gate.destination}`);
      this.registerLazyAmbientObject(sign, region);
      this.registerLazyAmbientObject(label, region);
      this.registerLazyAmbientObject(zone, region);

      zone.on('pointerover', () => {
        sign.setTint(0xf5dba4);
        label.setColor('#fff0bd').setScale(1.04);
      });
      zone.on('pointerout', () => {
        sign.clearTint();
        label.setColor('#f0d59a').setScale(1);
      });
      zone.on('pointerdown', (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        if (this.isGameplayInputLocked() || this.simulation.region !== region) return;
        const distance = Phaser.Math.Distance.Between(
          this.simulation.player.x,
          this.simulation.player.y,
          signX,
          signY,
        );
        if (distance > 155) {
          this.simulation.moveTo(approach);
          this.destinationMark.setPosition(approach.x, approach.y)
            .setVisible(true).setAlpha(1).setScale(0.7);
          this.tweens.add({
            targets: this.destinationMark,
            alpha: 0,
            scale: 1.55,
            duration: 520,
            onComplete: () => this.destinationMark.setVisible(false),
          });
          this.alertMarker(signX, signY - 44, '길목 가까이 간 뒤 다시 누르십시오');
          return;
        }
        this.simulation.travelToCampaignRegion(
          gate.destination,
          gate.edge === 'north' ? 'south' : 'north',
        );
        this.ensureJoseonTownNeighborhood(gate.destination);
        this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
        this.lastPlayerSimulationPosition = {
          x: this.simulation.player.x,
          y: this.simulation.player.y,
        };
        this.fitCamera();
      });
    }
  }

  private ensureJoseonTownNeighborhood(region: JoseonTownRegionId): void {
    const index = JOSEON_TOWN_REGION_IDS.indexOf(region);
    const neighbors = [
      region,
      index > 0 ? JOSEON_TOWN_REGION_IDS[index - 1] : null,
      index < JOSEON_TOWN_REGION_IDS.length - 1 ? JOSEON_TOWN_REGION_IDS[index + 1] : null,
    ].filter((candidate): candidate is JoseonTownRegionId => candidate !== null);
    for (const candidate of neighbors) {
      this.ensureJoseonTownBackground(candidate, candidate === region);
    }
    this.ensureJoseonTownSeams(region);
  }

  private ensureJoseonTownSeams(region: JoseonTownRegionId): void {
    const adjacentTransitions = JOSEON_TOWN_TRANSITION_SEAMS.filter((transition) => (
      transition.from === region || transition.to === region
    ));
    const pendingTransitions = adjacentTransitions.filter((transition) => {
      const seam = WORLD_TERRAIN_SEAMS.find((candidate) => candidate.id === transition.id);
      if (!seam) return false;
      if (this.textures.exists(transition.asset.key)) {
        this.createAuthoredTerrainTransition(seam, {
          key: transition.asset.key,
          span: transition.span,
        });
        return false;
      }
      return !this.joseonTownSeamLoads.has(transition.id);
    });
    if (pendingTransitions.length === 0) return;

    for (const transition of pendingTransitions) {
      this.joseonTownSeamLoads.add(transition.id);
      this.load.image(transition.asset.key, transition.asset.path);
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      for (const transition of pendingTransitions) {
        this.joseonTownSeamLoads.delete(transition.id);
        const seam = WORLD_TERRAIN_SEAMS.find((candidate) => candidate.id === transition.id);
        if (seam) {
          this.createAuthoredTerrainTransition(seam, {
            key: transition.asset.key,
            span: transition.span,
          });
        }
      }
    });
    if (!this.load.isLoading()) this.load.start();
  }

  private ensureJoseonTownBackground(
    region: JoseonTownRegionId,
    populate = false,
  ): void {
    if (populate) this.joseonTownPopulationRequests.add(region);
    const layout = JOSEON_TOWN_LAYOUTS[region];
    const background = this.joseonTownBackgrounds.get(region);
    if (!background) return;
    const needsBackground = !this.textures.exists(layout.backgroundKey);
    const needsGwanghae = this.joseonTownPopulationRequests.has(region)
      && region === 'changdeokgung'
      && !this.textures.exists(ASSETS.gwanghaePrince.key);
    if (!needsBackground && !needsGwanghae) {
      background.setTexture(layout.backgroundKey).setDisplaySize(MAP_WIDTH, MAP_HEIGHT);
      if (this.joseonTownPopulationRequests.has(region)) this.populateJoseonTownRegion(region);
      return;
    }
    if (this.joseonTownBackgroundLoads.has(region)) return;
    this.joseonTownBackgroundLoads.add(region);
    const finish = () => {
      this.joseonTownBackgroundLoads.delete(region);
      if (this.textures.exists(layout.backgroundKey)) {
        background.setTexture(layout.backgroundKey).setDisplaySize(MAP_WIDTH, MAP_HEIGHT);
      }
      if (region === 'changdeokgung') this.createGwanghaeAnimations();
      if (this.joseonTownPopulationRequests.has(region)) this.populateJoseonTownRegion(region);
    };
    this.load.once(Phaser.Loader.Events.COMPLETE, finish);
    if (needsBackground) this.load.image(layout.backgroundKey, layout.backgroundPath);
    if (needsGwanghae) {
      this.load.spritesheet(ASSETS.gwanghaePrince.key, ASSETS.gwanghaePrince.path, {
        frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
      });
    }
    if (!this.load.isLoading()) this.load.start();
  }

  private createHanseongPalaceLinks(): void {
    const link = (
      region: RegionId,
      localX: number,
      localY: number,
      label: string,
      destination: RegionId,
      entrance: 'north' | 'south',
    ) => {
      const origin = REGION_ORIGINS[region];
      const x = origin.x + localX;
      const y = origin.y + localY;
      const plaque = this.add.text(x, y, label, {
        fontFamily: '"Noto Serif KR", serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e7d39f',
        backgroundColor: 'rgba(25,18,12,0.82)',
        padding: { x: 12, y: 7 },
        stroke: '#17100b',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(y + 2);
      const zone = this.add.zone(x, y, 210, 62)
        .setDepth(y + 3)
        .setInteractive({ useHandCursor: true });
      zone.setData('dungeonAction', `travel-${region}-${destination}`);
      zone.on('pointerover', () => plaque.setColor('#fff0bf').setScale(1.04));
      zone.on('pointerout', () => plaque.setColor('#e7d39f').setScale(1));
      zone.on('pointerdown', (
        _pointer: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        if (this.menuOpen || this.gameMode === 'travel') return;
        const distance = Phaser.Math.Distance.Between(
          this.simulation.player.x,
          this.simulation.player.y,
          x,
          y,
        );
        if (distance > 145) {
          this.simulation.moveTo({ x, y: y + 42 });
          this.destinationMark.setPosition(x, y + 42).setVisible(true).setAlpha(1).setScale(0.7);
          this.tweens.add({
            targets: this.destinationMark,
            alpha: 0,
            scale: 1.55,
            duration: 520,
            onComplete: () => this.destinationMark.setVisible(false),
          });
          this.alertMarker(x, y - 34, '입구 가까이 가서 다시 누르십시오');
          return;
        }
        this.simulation.travelToCampaignRegion(destination, entrance);
        if (isJoseonTownRegion(destination)) this.ensureJoseonTownNeighborhood(destination);
        this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
        this.lastPlayerSimulationPosition = {
          x: this.simulation.player.x,
          y: this.simulation.player.y,
        };
        this.fitCamera();
      });
    };

    link('hanseongmarket', 1260, 360, '육조거리 · 광화문', 'gyeongbokgate', 'south');
    link('gyeongbokgate', 1260, 850, '종루 · 운종가', 'hanseongmarket', 'north');
  }

  private createCampaignWorld(): void {
    this.createJurchenVillage();
    this.createFrontierBattlefield();
    this.createBusanjinFortressLayers();
    this.createGyeongbokPalaceComplex();
    this.createPyongyangStructureLayers();
    this.createPyongyangBattlefieldDressings();
    this.createJapaneseVillageLife();
    for (const routeId of ROYAL_REFUGE_ROUTE_IDS) {
      const asset = this.royalRefugeAsset(routeId);
      if (this.textures.exists(asset.key)) this.createRoyalRefugeWorld(routeId);
    }
    const routePlaque = (
      region: RegionId,
      localX: number,
      localY: number,
      label: string,
      destination: RegionId,
      entrance: 'north' | 'south',
      requiresClear = false,
    ) => {
      const origin = REGION_ORIGINS[region];
      const x = origin.x + localX;
      const presentationLocalY = this.mobileProfile
        ? localY < 260
          ? localY + 72
          : localY > MAP_HEIGHT - 260
            ? localY - 72
            : localY
        : localY;
      const y = origin.y + presentationLocalY;
      const flipSign = region.length % 2 === 0;
      const ground = this.add.image(x, y - 2, ASSETS.props.worldTransitionProps.key, 8)
        .setScale(this.mobileProfile ? 0.34 : 0.4)
        .setFlipX(flipSign)
        .setDepth(y + 4)
        .setName(`campaign-route-sign-${region}-${destination}`);
      const text = this.add.text(x + (flipSign ? 18 : -18), y - 38, label, {
        fontFamily: 'serif', fontSize: this.mobileProfile ? '13px' : '15px', fontStyle: 'bold', color: '#f2d9a1',
        stroke: '#24140c', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(y + 7);
      const zone = this.add.zone(x, y, 230, 82).setInteractive({ useHandCursor: true }).setDepth(y + 8);
      if (requiresClear && isJapanRegion(region)) {
        this.japanGatePlaques.set(region, { ground, text, lockedLabel: label });
      }
      zone.on('pointerover', () => {
        ground.setTint(0xf1d49a);
        text.setColor('#fff0bd');
      });
      zone.on('pointerout', () => {
        ground.clearTint();
        text.setColor('#f2d9a1');
      });
      zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.isGameplayInputLocked()) return;
        const distance = Phaser.Math.Distance.Between(
          this.simulation.player.x,
          this.simulation.player.y,
          x,
          y,
        );
        if (distance > 150) {
          const approachY = localY < MAP_HEIGHT / 2 ? y + 54 : y - 54;
          this.simulation.moveTo({ x, y: approachY });
          this.destinationMark.setPosition(x, approachY).setVisible(true).setAlpha(1).setScale(0.7);
          this.tweens.add({
            targets: this.destinationMark,
            alpha: 0,
            scale: 1.55,
            duration: 520,
            onComplete: () => this.destinationMark.setVisible(false),
          });
          this.alertMarker(x, y - 38, '길목 가까이 가서 다시 누르십시오');
          return;
        }
        if (requiresClear && isJapanRegion(region)) {
          const progress = this.simulation.getJapanStageProgress(region);
          if (!progress.cleared) {
            this.alertMarker(
              this.simulation.player.x,
              this.simulation.player.y - 122,
              `진군문 봉쇄 · 남은 목표 ${progress.total - progress.defeated}`,
              1900,
            );
            this.simulation.moveTo({ x: origin.x + 768, y: origin.y + 176 });
            return;
          }
        }
        if (requiresClear && JURCHEN_EXPANSION_REGION_IDS.includes(
          region as typeof JURCHEN_EXPANSION_REGION_IDS[number],
        )) {
          const jurchenRegion = region as typeof JURCHEN_EXPANSION_REGION_IDS[number];
          const progress = this.simulation.getJurchenStageProgress(jurchenRegion);
          if (!progress.cleared) {
            this.alertMarker(
              this.simulation.player.x,
              this.simulation.player.y - 122,
              `부족의 관문 봉쇄 · 남은 시험 ${progress.total - progress.defeated}`,
              1900,
            );
            this.simulation.moveTo({ x: origin.x + 768, y: origin.y + 176 });
            return;
          }
        }
        if (region === 'jurchenvillage'
          && destination === 'manchufrontier'
          && this.simulation.isFrontierArcher()
          && !this.simulation.isJurchenUnified()) {
          const progress = this.simulation.getJurchenUnificationProgress();
          this.alertMarker(
            this.simulation.player.x,
            this.simulation.player.y - 116,
            `압록 재도전 불가 · 통합 시험 ${progress.clearedStages} / ${progress.totalStages}`,
            2100,
          );
          this.simulation.moveTo({ x: origin.x + 768, y: origin.y + 780 });
          return;
        }
        if (region === 'manchufrontier'
          && this.simulation.isFrontierArcher()
          && !this.simulation.isHajinSouthwardMarchReady()) {
          const progress = this.simulation.getHajinMissionProgress();
          this.alertMarker(
            this.simulation.player.x,
            this.simulation.player.y - 116,
            `남문이 잠겼다 · 남은 전선 목표 ${progress.total - progress.defeated}`,
            1700,
          );
          this.simulation.moveTo({ x: origin.x + 768, y: origin.y + 720 });
          return;
        }
        if (requiresClear && isPyongyangRegion(region) && !this.simulation.isGwanghaePrince()) {
          const progress = this.simulation.getPyongyangBattleProgress(region);
          if (!progress.cleared) {
            this.alertMarker(
              this.simulation.player.x,
              this.simulation.player.y - 122,
              `평양 전진문 봉쇄 · 남은 수비군 ${progress.total - progress.defeated}명`,
              2000,
            );
            this.simulation.moveTo({ x: origin.x + 768, y: origin.y + 810 });
            return;
          }
        }
        const continuousTravel = isContinuousWorldNeighbor(region, destination);
        const performTravel = () => {
          const previousRegion = this.simulation.region;
          this.simulation.travelToCampaignRegion(destination, entrance);
          if (this.simulation.region === previousRegion) {
            if (!continuousTravel) this.cameras.main.fadeIn(140, 16, 13, 10);
            return;
          }
          this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
          this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
          if (!continuousTravel) {
            this.releaseInactiveMonsterViews(this.simulation.region);
            this.fitCamera();
            this.cameras.main.fadeIn(180, 16, 13, 10);
          }
        };
        if (continuousTravel) {
          performTravel();
        } else {
          this.cameras.main.fadeOut(140, 16, 13, 10);
          this.time.delayedCall(145, performTravel);
        }
      });
    };

    for (const fieldRoute of CAMPAIGN_FIELD_ROUTES) {
      routePlaque(
        fieldRoute.region,
        fieldRoute.localX,
        fieldRoute.localY,
        fieldRoute.label,
        fieldRoute.destination,
        fieldRoute.entrance,
        fieldRoute.requiresClear,
      );
    }
    this.syncJapanGatePlaques();

    for (const [region, title, objective] of [
      ...JAPAN_REGION_IDS.map((region): [RegionId, string, string] => [
        region,
        REGIONS[region].name,
        JAPAN_STAGE_COPY[region].objective,
      ]),
      ...JURCHEN_EXPANSION_REGION_IDS.map((region): [RegionId, string, string] => [
        region,
        REGIONS[region].name,
        JURCHEN_STAGE_COPY[region].objective,
      ]),
      ['busanjin', '부산진성 혈전', '성문을 지키고 왜군 조총 진형을 무너뜨려라'],
      ['tangeumdae', '탄금대 전멸전', '조총수 8명을 포함한 왜군 전 병력을 섬멸하라'],
      ['pyongyangouter', '평양 외성 북곽', '목책과 외성 수비대를 돌파해 대동문 공성로를 열어라'],
      ['pyongyanggate', '대동문 공성전', '대동강 성루 궁수대와 문 안쪽 수비군을 모두 격파하라'],
      ['pyongyanginner', '평양 내성 · 대동관', '내성의 세 전열과 지휘부를 꺾고 한성 북로를 확보하라'],
      ['gyeongbokgate', '경복궁 광화문', '금천교를 건너 궁성의 변란을 추적하라'],
      ['gyeongbokcourt', '근정전 품계석 마당', '내금위 방어진을 뚫고 어전으로 향하라'],
      ['gyeongbokinner', '사정전 · 강녕전', '왕을 대면하고 조선의 마지막 피난로가 갈라지는 순간을 맞아라'],
      ['jurchenvillage', '여진 설원부락 · 패잔병 본영', '압록 패전 뒤 북행 통합로를 열고 백산·송화·흑수 세 부족의 맹약을 모아라'],
      ['manchufrontier', '압록 국경 전선 · 설욕전', '통합 여진군과 함께 조선 국경군의 전열을 무너뜨리고 남진로를 다시 열어라'],
    ] as Array<[RegionId, string, string]>) {
      const origin = REGION_ORIGINS[region];
      this.add.text(origin.x + 82, origin.y + 76, title, {
        fontFamily: 'serif', fontSize: '24px', fontStyle: 'bold', color: '#f1d49b',
        backgroundColor: 'rgba(18,14,12,0.72)', padding: { x: 16, y: 9 },
        stroke: '#1d110b', strokeThickness: 5,
      }).setDepth(origin.y + 100);
      this.add.text(origin.x + 84, origin.y + 128, objective, {
        fontFamily: 'serif', fontSize: '14px', color: '#d8c7a5',
        backgroundColor: 'rgba(18,14,12,0.6)', padding: { x: 12, y: 6 },
        stroke: '#1d110b', strokeThickness: 3,
      }).setDepth(origin.y + 101);
    }

    const royalOrigin = REGION_ORIGINS.gyeongbokinner;
    const royalX = royalOrigin.x + 768;
    const royalY = royalOrigin.y + 505;
    this.royalKingPosition = { x: royalX, y: royalY };
    const royalShadow = this.add.ellipse(royalX, royalY + 7, 66, 20, 0x080706, 0.46).setDepth(royalY - 2);
    const king = this.add.sprite(royalX, royalY, ASSETS.monsters['joseon-prince'].key, 16)
      .setScale(0.50).setOrigin(0.5, 0.97).setTint(0xf0d89d).setDepth(royalY + 3);
    const kingLabel = this.add.text(royalX, royalY - 94, '선조 · 조선 국왕', {
      fontFamily: 'serif', fontSize: '14px', fontStyle: 'bold', color: '#ffe6a5',
      backgroundColor: 'rgba(31,17,10,0.82)', padding: { x: 11, y: 5 },
      stroke: '#271208', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(royalY + 5);
    this.tweens.add({
      targets: [king, royalShadow, kingLabel], alpha: { from: 0.88, to: 1 },
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const paceKing = (direction: -1 | 1): void => {
      if (!king.active) return;
      king.setFlipX(direction < 0).play('monster-walk-joseon-prince-2', true);
      this.tweens.add({
        targets: [king, royalShadow, kingLabel],
        x: `+=${direction * 28}`,
        duration: 1450,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!king.active) return;
          king.stop().setFrame(16);
          this.time.delayedCall(1900, () => paceKing(direction === 1 ? -1 : 1));
        },
      });
    };
    this.time.delayedCall(900, () => paceKing(1));

    for (const [region, color] of [
      ['osaka', 0xcbb58b], ['settsuvillage', 0xb8c49f], ['yamazakihunt', 0xa7c6a9],
      ['osakacastle', 0xd0ad83], ['shogunkeep', 0xd87565],
      ['busanjin', 0xe99048], ['tangeumdae', 0xd0c6ac], ['jurchenvillage', 0xe4edf7],
      ...JURCHEN_EXPANSION_REGION_IDS.map((region): [RegionId, number] => [region, 0xdce9ec]),
      ['manchufrontier', 0xdce8f4],
      ['pyongyangouter', 0xcbd9e0], ['pyongyanggate', 0x96b6c4], ['pyongyanginner', 0xb6c5c9],
      ['namhansanseong', 0xc7c9be], ['ganghwado', 0xaac4cc],
    ] as Array<[RegionId, number]>) {
      const origin = REGION_ORIGINS[region];
      const count = this.mobileProfile ? 4 : 9;
      for (let index = 0; index < count; index += 1) {
        const mote = this.add.circle(origin.x + 260 + (index * 137) % 1040, origin.y + 250 + (index * 91) % 560, 1.5, color, 0.42)
          .setDepth(origin.y + 900 + index);
        this.tweens.add({
          targets: mote,
          x: mote.x + 48,
          y: mote.y + (region === 'manchufrontier' || isJurchenRegion(region) ? 34 : -46),
          alpha: { from: 0.08, to: 0.62 },
          duration: 1600 + index * 170,
          delay: index * 120,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private royalRefugeAsset(routeId: RoyalRefugeRouteId): { key: string; path: string } {
    return routeId === 'namhansanseong'
      ? ASSETS.namhansanFortressBackground
      : ASSETS.ganghwaFortressBackground;
  }

  private createRoyalRefugeWorld(routeId: RoyalRefugeRouteId): void {
    if (this.royalRefugeWorlds.has(routeId)) return;
    const asset = this.royalRefugeAsset(routeId);
    if (!this.textures.exists(asset.key)) return;
    const origin = REGION_ORIGINS[routeId];
    const route = ROYAL_REFUGE_ROUTES[routeId];
    const background = this.add.image(
      origin.x + MAP_WIDTH / 2,
      origin.y + MAP_HEIGHT / 2,
      asset.key,
    )
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
      .setDepth(WORLD_FLOOR_DEPTH + 1);
    const title = this.add.text(origin.x + 76, origin.y + 70, REGIONS[routeId].name, {
      fontFamily: '"Noto Serif KR", serif',
      fontSize: '25px',
      fontStyle: 'bold',
      color: '#f1d49b',
      backgroundColor: 'rgba(15,14,13,0.78)',
      padding: { x: 16, y: 9 },
      stroke: '#17100c',
      strokeThickness: 5,
    }).setDepth(origin.y + 100);
    const objective = this.add.text(
      origin.x + 78,
      origin.y + 122,
      '제1선 외곽 방어진  →  제2선 중성  →  제3선 왕실 행궁',
      {
        fontFamily: '"Noto Serif KR", serif',
        fontSize: '14px',
        color: '#d9c7a6',
        backgroundColor: 'rgba(15,14,13,0.67)',
        padding: { x: 12, y: 6 },
        stroke: '#17100c',
        strokeThickness: 3,
      },
    ).setDepth(origin.y + 101);

    const createDefenseGate = (
      localY: number,
      stageIndex: 0 | 1,
      lockedText: string,
    ) => {
      const y = origin.y + localY;
      const groundShadow = this.add.ellipse(0, 18, 410, 72, 0x090807, 0.46);
      const gateImage = this.add.image(0, 72, ASSETS.props.yeongwolInnerGate.key)
        .setDisplaySize(430, 284)
        .setOrigin(0.5, 1)
        .setTint(routeId === 'namhansanseong' ? 0xa9aaa1 : 0x9aaeb1);
      const label = this.add.text(0, -226, lockedText, {
        fontFamily: '"Noto Serif KR", serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f0d59e',
        backgroundColor: 'rgba(25,17,12,0.9)',
        padding: { x: 11, y: 5 },
        stroke: '#1b0f09',
        strokeThickness: 3,
      }).setOrigin(0.5);
      const root = this.add.container(origin.x + MAP_WIDTH / 2, y, [
        groundShadow, gateImage, label,
      ]).setDepth(y + 72);
      root.setData('royalRefugeGateIndex', stageIndex);
      return { root, gateImage, label };
    };

    const gates = [
      createDefenseGate(692, 0, `${route.stages[0].name} · 승리 전 봉쇄`),
      createDefenseGate(422, 1, `${route.stages[1].name} · 승리 전 봉쇄`),
    ];
    this.royalRefugeWorlds.set(routeId, {
      background,
      labels: [title, objective],
      gates,
    });
    this.syncRoyalRefugeGates(false);
  }

  private syncRoyalRefugeGates(animate = false): void {
    const state = this.simulation.getRoyalRefugeState();
    const visibleRegions = this.activeRenderRegions(this.simulation.region);
    for (const [routeId, world] of this.royalRefugeWorlds) {
      const visible = visibleRegions.has(routeId);
      world.background.setVisible(visible);
      for (const label of world.labels) label.setVisible(visible);
      const selectedRoute = state.routeId === routeId;
      const activeStage = selectedRoute ? state.activeStageIndex : null;
      for (const [gateIndex, gate] of world.gates.entries()) {
        const open = selectedRoute
          && (state.finalDefenseComplete || (activeStage !== null && activeStage > gateIndex));
        gate.root.setVisible(visible && (!open || animate));
        gate.label.setVisible(visible && !open);
        this.tweens.killTweensOf(gate.gateImage);
        if (animate && visible && open) {
          this.tweens.add({
            targets: gate.gateImage,
            alpha: { from: 1, to: 0 },
            y: gate.gateImage.y - 22,
            duration: 520,
            ease: 'Cubic.easeOut',
            onComplete: () => gate.root.setVisible(false),
          });
        } else {
          gate.gateImage.setAlpha(open ? 0 : 1).setY(72);
        }
      }
    }
  }

  private loadRoyalRefugeWorld(
    routeId: RoyalRefugeRouteId,
    onReady: () => void,
    onError?: () => void,
  ): void {
    const asset = this.royalRefugeAsset(routeId);
    if (this.textures.exists(asset.key)) {
      this.createRoyalRefugeWorld(routeId);
      onReady();
      return;
    }
    if (this.royalRefugeLoading) return;
    this.royalRefugeLoading = routeId;
    const finish = () => {
      this.royalRefugeLoading = null;
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
      this.createRoyalRefugeWorld(routeId);
      onReady();
    };
    const fail = (file: Phaser.Loader.File) => {
      if (file.key !== asset.key) return;
      this.royalRefugeLoading = null;
      this.load.off(Phaser.Loader.Events.COMPLETE, finish);
      onError?.();
    };
    this.load.once(Phaser.Loader.Events.COMPLETE, finish);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
    this.load.image(asset.key, asset.path);
    this.load.start();
  }

  private playRoyalRefugeChoice(title: string, lines: readonly string[]): void {
    if (this.royalRefugeDom) return;
    this.prologueActive = true;
    this.destinationMark.setVisible(false);
    document.querySelector<HTMLElement>('#hud')?.classList.add('is-cinematic');
    const overlay = document.createElement('section');
    overlay.className = 'opening-cinematic royal-refuge-cinematic';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'royal-refuge-title');
    overlay.innerHTML = `
      <div class="royal-refuge-cinematic__veil"></div>
      <article class="royal-refuge-cinematic__panel">
        <span class="royal-refuge-cinematic__eyebrow">왕의 어가 피난 사건</span>
        <h2 id="royal-refuge-title">${title}</h2>
        <div class="royal-refuge-cinematic__step" aria-live="polite">
          <strong></strong>
          <p></p>
        </div>
        <button class="royal-refuge-cinematic__next" type="button">다음 대사</button>
        <div class="royal-refuge-cinematic__choices" hidden>
          ${ROYAL_REFUGE_ROUTE_IDS.map((routeId) => {
            const route = ROYAL_REFUGE_ROUTES[routeId];
            return `<button type="button" data-refuge-route="${routeId}">
              <b>${route.selectionLabel}</b>
              <span>${route.description}</span>
              <em>${route.stages.map((stage) => stage.name).join(' → ')}</em>
            </button>`;
          }).join('')}
        </div>
        <p class="royal-refuge-cinematic__status">대사를 직접 넘긴 뒤 왕의 피난로를 선택하십시오.</p>
      </article>`;
    document.body.appendChild(overlay);
    this.royalRefugeDom = overlay;
    const speaker = overlay.querySelector<HTMLElement>('.royal-refuge-cinematic__step strong')!;
    const line = overlay.querySelector<HTMLElement>('.royal-refuge-cinematic__step p')!;
    const next = overlay.querySelector<HTMLButtonElement>('.royal-refuge-cinematic__next')!;
    const choices = overlay.querySelector<HTMLElement>('.royal-refuge-cinematic__choices')!;
    const status = overlay.querySelector<HTMLElement>('.royal-refuge-cinematic__status')!;
    let lineIndex = 0;
    const showLine = () => {
      const authored = lines[lineIndex] ?? '';
      const divider = authored.indexOf(':');
      speaker.textContent = divider > 0 ? authored.slice(0, divider).trim() : '어전';
      line.textContent = divider > 0 ? authored.slice(divider + 1).trim() : authored;
      line.classList.remove('is-changing');
      void line.offsetWidth;
      line.classList.add('is-changing');
      next.textContent = lineIndex >= lines.length - 1 ? '피난로 선택' : `다음 대사 ${lineIndex + 1} / ${lines.length}`;
    };
    showLine();
    next.addEventListener('click', () => {
      if (lineIndex < lines.length - 1) {
        lineIndex += 1;
        showLine();
        return;
      }
      next.hidden = true;
      choices.hidden = false;
      status.textContent = '두 피난처는 지형과 수비 구성이 다릅니다. 선택한 지역만 지금 불러옵니다.';
    });
    overlay.querySelectorAll<HTMLButtonElement>('[data-refuge-route]').forEach((button) => {
      button.addEventListener('click', () => {
        const routeId = button.dataset.refugeRoute;
        if (!routeId || !isRoyalRefugeRouteId(routeId) || this.royalRefugeLoading) return;
        overlay.querySelectorAll<HTMLButtonElement>('button').forEach((candidate) => { candidate.disabled = true; });
        status.textContent = `${ROYAL_REFUGE_ROUTES[routeId].escapeCopy} · 전장을 불러오는 중…`;
        overlay.classList.add('is-loading');
        this.loadRoyalRefugeWorld(routeId, () => {
          if (!this.simulation.chooseRoyalRefugeRoute(routeId)) {
            overlay.classList.remove('is-loading');
            overlay.querySelectorAll<HTMLButtonElement>('button').forEach((candidate) => { candidate.disabled = false; });
            status.textContent = '피난로를 열 수 없습니다. 왕실 수비대를 먼저 정리하십시오.';
            return;
          }
          this.closeRoyalRefugeChoice();
          this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
          this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };
          this.releaseInactiveMonsterViews(this.simulation.region);
          this.syncRoyalRefugeGates(false);
          this.fitCamera();
        }, () => {
          overlay.classList.remove('is-loading');
          overlay.querySelectorAll<HTMLButtonElement>('button').forEach((candidate) => { candidate.disabled = false; });
          status.textContent = '전장 그림을 불러오지 못했습니다. 다시 선택해 주십시오.';
        });
      });
    });
    window.setTimeout(() => next.focus(), 30);
  }

  private closeRoyalRefugeChoice(): void {
    this.royalRefugeDom?.remove();
    this.royalRefugeDom = null;
    this.prologueActive = false;
    document.querySelector<HTMLElement>('#hud')?.classList.remove('is-cinematic');
    this.tweens.resumeAll();
    this.anims.resumeAll();
  }

  private syncJapanGatePlaques(): void {
    for (const [region, plaque] of this.japanGatePlaques) {
      const open = this.simulation.isJapanStageCleared(region);
      plaque.text
        .setText(open ? `${JAPAN_STAGE_COPY[region].next} · 진군문 개방` : plaque.lockedLabel)
        .setColor(open ? '#d9f0b5' : '#f2d9a1');
      plaque.ground
        .setTint(open ? 0xb8d59a : 0xffffff)
        .setAlpha(open ? 1 : 0.92);
    }
  }

  private createJapaneseVillageLife(): void {
    const osaka = REGION_ORIGINS.osaka;
    const settsu = REGION_ORIGINS.settsuvillage;
    const castle = REGION_ORIGINS.osakacastle;
    const sakai = REGION_ORIGINS.sakaicity;
    const iki = REGION_ORIGINS.ikiport;
    const izuhara = REGION_ORIGINS.izuhara;
    for (const resident of [
      {
        id: 'japan-osaka-fishmonger',
        x: osaka.x + 405,
        y: osaka.y + 690,
        name: '생선장수 오츠네',
        dialogue: '전쟁이 시작된 뒤 출병선만 늘고, 항구 사람들 살림은 더 가난해졌어요.',
        mode: 'japanese-civilian' as const,
        tint: 0xf1e5d1,
        speed: 20,
        patrol: [
          { x: osaka.x + 405, y: osaka.y + 690 },
          { x: osaka.x + 510, y: osaka.y + 720 },
          { x: osaka.x + 555, y: osaka.y + 655 },
        ],
      },
      {
        id: 'japan-osaka-porter',
        x: osaka.x + 900,
        y: osaka.y + 720,
        name: '부두 짐꾼 사키치',
        dialogue: '조선 포로와 일본 노역꾼을 가리지 않고 밤새 군량을 나르게 했소.',
        mode: 'commoner' as const,
        tint: 0x8f897d,
        speed: 27,
        patrol: [
          { x: osaka.x + 900, y: osaka.y + 720 },
          { x: osaka.x + 1010, y: osaka.y + 675 },
          { x: osaka.x + 1075, y: osaka.y + 745 },
        ],
      },
      {
        id: 'japan-osaka-dyer',
        x: osaka.x + 1180,
        y: osaka.y + 590,
        name: '염색공 유키',
        dialogue: '당신이 포로촌을 빠져나온 조선 무당이군요. 군사와 백성을 가려 주길 바라요.',
        mode: 'japanese-civilian' as const,
        tint: 0xdce7ef,
        speed: 16,
        patrol: [
          { x: osaka.x + 1180, y: osaka.y + 590 },
          { x: osaka.x + 1125, y: osaka.y + 625 },
        ],
      },
      {
        id: 'japan-osaka-boatman',
        x: osaka.x + 675,
        y: osaka.y + 520,
        name: '늙은 뱃사공 마고베에',
        dialogue: '검은 깃발 선박은 오늘 밤 북쪽 물길로 떠날 거요. 감시대가 바뀌는 때는 해 질 무렵이오.',
        mode: 'commoner' as const,
        tint: 0xa18d76,
        speed: 14,
        patrol: [
          { x: osaka.x + 675, y: osaka.y + 520 },
          { x: osaka.x + 735, y: osaka.y + 545 },
        ],
      },
      {
        id: 'japan-captive-elder',
        x: settsu.x + 385,
        y: settsu.y + 690,
        name: '끌려온 옹기장이 만복',
        dialogue: '조총대가 쌀과 사람을 함께 거두어 갔소. 북쪽 산길을 열어 주시오.',
        mode: 'oppressed' as const,
        tint: 0xb39b82,
        speed: 13,
        patrol: [{ x: settsu.x + 385, y: settsu.y + 690 }, { x: settsu.x + 455, y: settsu.y + 720 }],
      },
      {
        id: 'japan-herbalist',
        x: settsu.x + 930,
        y: settsu.y + 710,
        name: '산촌 약초꾼 오하나',
        dialogue: '야마자키 숲에는 꽃사슴뿐 아니라 군량을 노린 큰멧돼지도 돌아다녀요.',
        mode: 'japanese-civilian' as const,
        tint: 0xe3ead8,
        speed: 22,
        patrol: [{ x: settsu.x + 930, y: settsu.y + 710 }, { x: settsu.x + 870, y: settsu.y + 750 }],
      },
      {
        id: 'japan-settsu-farmer',
        x: settsu.x + 1110,
        y: settsu.y + 540,
        name: '논농사꾼 다헤에',
        dialogue: '다이묘는 쌀을 전쟁에 쓰고, 우리는 겨울 종자까지 빼앗겼소. 산길 초소를 조심하시오.',
        mode: 'commoner' as const,
        tint: 0x9b907c,
        speed: 21,
        patrol: [
          { x: settsu.x + 1110, y: settsu.y + 540 },
          { x: settsu.x + 1180, y: settsu.y + 585 },
          { x: settsu.x + 1130, y: settsu.y + 630 },
        ],
      },
      {
        id: 'japan-settsu-weaver',
        x: settsu.x + 690,
        y: settsu.y + 640,
        name: '길쌈꾼 오린',
        dialogue: '성으로 끌려간 가족들이 있어요. 싸움이 끝나면 이 길에 다시 장이 섰으면 좋겠네요.',
        mode: 'japanese-civilian' as const,
        tint: 0xf0ddd8,
        speed: 18,
        patrol: [
          { x: settsu.x + 690, y: settsu.y + 640 },
          { x: settsu.x + 630, y: settsu.y + 690 },
        ],
      },
      {
        id: 'japan-blacksmith',
        x: settsu.x + 390,
        y: settsu.y + 480,
        name: '숯장이 겐조',
        dialogue: '감시대의 쇠붙이를 가져오면 부적 방울과 칼날을 다시 벼려 주겠소.',
        mode: 'commoner' as const,
        tint: 0x97816f,
        speed: 0,
        patrol: [],
        role: 'blacksmith' as const,
        facing: Math.PI,
      },
      {
        id: 'japan-castle-merchant',
        x: castle.x + 485,
        y: castle.y + 665,
        name: '성하 행상 이치',
        dialogue: '아시가루가 장터를 비웠소. 필요한 약과 물자를 챙겨 천수각으로 가시오.',
        mode: 'japanese-civilian' as const,
        tint: 0xefe0c9,
        speed: 18,
        patrol: [{ x: castle.x + 485, y: castle.y + 665 }, { x: castle.x + 520, y: castle.y + 610 }],
      },
      {
        id: 'japan-castle-refugee',
        x: castle.x + 1050,
        y: castle.y + 690,
        name: '성하 피난민 사요',
        dialogue: '군선봉행 친위대는 성문 안에서 두 번 진형을 바꿉니다. 조총 불빛을 먼저 피하세요.',
        mode: 'japanese-civilian' as const,
        tint: 0xe8d9df,
        speed: 12,
        patrol: [{ x: castle.x + 1050, y: castle.y + 690 }, { x: castle.x + 1015, y: castle.y + 635 }],
      },
      {
        id: 'japan-castle-rice-seller',
        x: castle.x + 790,
        y: castle.y + 560,
        name: '쌀장수 치요',
        dialogue: '군량 창고가 불탄 뒤 친위대가 백성의 쌀독을 뒤지고 있어요. 동쪽 골목은 아직 비어 있습니다.',
        mode: 'japanese-civilian' as const,
        tint: 0xd9e3cf,
        speed: 17,
        patrol: [
          { x: castle.x + 790, y: castle.y + 560 },
          { x: castle.x + 850, y: castle.y + 600 },
          { x: castle.x + 820, y: castle.y + 655 },
        ],
      },
      {
        id: 'japan-sakai-fish-broker',
        x: sakai.x + 575,
        y: sakai.y + 650,
        name: '사카이 어물중개인 오마사',
        dialogue: '상인들은 전쟁보다 바닷길이 끊길까 두려워합니다. 용병대만 물러나면 포구는 다시 열릴 거예요.',
        mode: 'japanese-civilian' as const,
        tint: 0xe8ddcf,
        speed: 19,
        patrol: [{ x: sakai.x + 575, y: sakai.y + 650 }, { x: sakai.x + 625, y: sakai.y + 700 }],
      },
      {
        id: 'japan-sakai-rope-maker',
        x: sakai.x + 1080,
        y: sakai.y + 600,
        name: '밧줄장이 진베에',
        dialogue: '도주군이 상선을 빼앗아 전선의 배로 묶고 있소. 이즈미 고개로 가면 그 보급대를 만날 거요.',
        mode: 'commoner' as const,
        tint: 0x9e8f79,
        speed: 16,
        patrol: [{ x: sakai.x + 1080, y: sakai.y + 600 }, { x: sakai.x + 1020, y: sakai.y + 645 }],
      },
      {
        id: 'japan-sakai-tea-seller',
        x: sakai.x + 760,
        y: sakai.y + 760,
        name: '찻집 주인 나미',
        dialogue: '조선에서 왔든 일본에서 왔든 굶주린 사람에게는 따뜻한 차 한 잔이 먼저지요.',
        mode: 'japanese-civilian' as const,
        tint: 0xe5d7df,
        speed: 13,
        patrol: [{ x: sakai.x + 760, y: sakai.y + 760 }, { x: sakai.x + 820, y: sakai.y + 735 }],
      },
      {
        id: 'japan-iki-net-mender',
        x: iki.x + 430,
        y: iki.y + 615,
        name: '이키 그물수선공 사다',
        dialogue: '군선이 좋은 그물을 모조리 가져갔어요. 대마도 쪽 바다는 작은 어선만 남았습니다.',
        mode: 'japanese-civilian' as const,
        tint: 0xe6ddd0,
        speed: 18,
        patrol: [{ x: iki.x + 430, y: iki.y + 615 }, { x: iki.x + 500, y: iki.y + 660 }],
      },
      {
        id: 'japan-iki-salt-porter',
        x: iki.x + 915,
        y: iki.y + 610,
        name: '소금짐꾼 헤이조',
        dialogue: '왜구 보급창은 북쪽 문 안에 있소. 군량을 끊으면 대마도 수비대도 오래 버티지 못할 거요.',
        mode: 'commoner' as const,
        tint: 0x9b8c77,
        speed: 21,
        patrol: [{ x: iki.x + 915, y: iki.y + 610 }, { x: iki.x + 865, y: iki.y + 665 }],
      },
      {
        id: 'japan-iki-shrine-keeper',
        x: iki.x + 770,
        y: iki.y + 745,
        name: '섬 사당지기 미요',
        dialogue: '아리아케산에서는 밤마다 전쟁에서 죽은 이들의 발소리가 들립니다. 혼을 달래 주실 수 있나요?',
        mode: 'japanese-civilian' as const,
        tint: 0xe8e0eb,
        speed: 12,
        patrol: [{ x: iki.x + 770, y: iki.y + 745 }, { x: iki.x + 830, y: iki.y + 720 }],
      },
      {
        id: 'japan-izuhara-paper-seller',
        x: izuhara.x + 430,
        y: izuhara.y + 720,
        name: '이즈하라 종이상 오키누',
        dialogue: '도주군이 부산포로 보낼 명부를 숨겼어요. 성하 본청을 뒤지면 침공선의 이름이 모두 나올 겁니다.',
        mode: 'japanese-civilian' as const,
        tint: 0xeadfd4,
        speed: 17,
        patrol: [{ x: izuhara.x + 430, y: izuhara.y + 720 }, { x: izuhara.x + 500, y: izuhara.y + 760 }],
      },
      {
        id: 'japan-izuhara-boat-carpenter',
        x: izuhara.x + 1010,
        y: izuhara.y + 720,
        name: '배목수 겐나이',
        dialogue: '침공선은 동쪽 물문에 묶여 있소. 지휘관을 쓰러뜨리면 부산진까지 건널 배를 내어 주겠소.',
        mode: 'commoner' as const,
        tint: 0x9e8c76,
        speed: 15,
        patrol: [{ x: izuhara.x + 1010, y: izuhara.y + 720 }, { x: izuhara.x + 960, y: izuhara.y + 765 }],
      },
      {
        id: 'japan-izuhara-refugee',
        x: izuhara.x + 770,
        y: izuhara.y + 480,
        name: '산마을 피난민 아야',
        dialogue: '다이묘의 싸움 때문에 일본 백성도 집을 잃었습니다. 복수하더라도 우리 같은 사람은 살려 주세요.',
        mode: 'japanese-civilian' as const,
        tint: 0xe4d8e0,
        speed: 12,
        patrol: [{ x: izuhara.x + 770, y: izuhara.y + 480 }, { x: izuhara.x + 835, y: izuhara.y + 505 }],
      },
    ]) {
      this.createVillageNpc(resident);
    }
  }

  private createPyongyangBattlefieldDressings(): void {
    const stages: Array<{
      region: PyongyangRegionId;
      gateColor: number;
      bannerColor: number;
      label: string;
      bannerY: number;
    }> = [
      {
        region: 'pyongyangouter',
        gateColor: 0x49372d,
        bannerColor: 0x7f392d,
        label: '외성 전진문 · 수비대 제압 후 개방',
        bannerY: 760,
      },
      {
        region: 'pyongyanggate',
        gateColor: 0x3f302a,
        bannerColor: 0x82372d,
        label: '대동문 안길 · 전역 완료 후 개방',
        bannerY: 735,
      },
      {
        region: 'pyongyanginner',
        gateColor: 0x392e2a,
        bannerColor: 0x6d3028,
        label: '한성 북로 · 지휘부 제압 후 개방',
        bannerY: 720,
      },
    ];

    for (const stage of stages) {
      const origin = REGION_ORIGINS[stage.region];
      const gateY = origin.y + 920;
      const shadow = this.add.ellipse(0, 22, 302, 54, 0x100b09, 0.52);
      const leftDoor = this.add.rectangle(-67, 0, 132, 58, stage.gateColor, 0.96)
        .setStrokeStyle(3, 0xa98558, 0.72);
      const rightDoor = this.add.rectangle(67, 0, 132, 58, stage.gateColor, 0.96)
        .setStrokeStyle(3, 0xa98558, 0.72);
      const crossbar = this.add.rectangle(0, 0, 252, 13, 0x241a15, 0.92)
        .setStrokeStyle(2, 0x8c6a48, 0.66);
      const leftPost = this.add.rectangle(-144, -1, 18, 78, 0x2c211b, 1)
        .setStrokeStyle(2, 0x94704d, 0.76);
      const rightPost = this.add.rectangle(144, -1, 18, 78, 0x2c211b, 1)
        .setStrokeStyle(2, 0x94704d, 0.76);
      const label = this.add.text(0, -62, stage.label, {
        fontFamily: 'serif',
        fontSize: this.mobileProfile ? '11px' : '14px',
        fontStyle: 'bold',
        color: '#efd5a1',
        backgroundColor: 'rgba(21,15,12,0.84)',
        padding: { x: 10, y: 5 },
        stroke: '#1c120d',
        strokeThickness: 4,
      }).setOrigin(0.5);
      const root = this.add.container(origin.x + 768, gateY, [
        shadow, leftDoor, rightDoor, crossbar, leftPost, rightPost, label,
      ]).setDepth(gateY + 4);
      this.pyongyangAdvanceGates.set(stage.region, {
        root,
        doors: [leftDoor, rightDoor, crossbar],
        label,
        open: false,
      });

      for (const [index, localX] of [470, 1066].entries()) {
        const pole = this.add.rectangle(0, 0, 6, 106, 0x34281e, 0.96).setOrigin(0.5, 1);
        const flag = this.add.triangle(2, -92, 0, 0, 64, 18, 0, 37, stage.bannerColor, 0.92)
          .setOrigin(0, 0.5)
          .setStrokeStyle(2, 0xd1ad70, 0.5);
        const banner = this.add.container(
          origin.x + localX,
          origin.y + stage.bannerY + (index % 2) * 12,
          [pole, flag],
        ).setDepth(origin.y + stage.bannerY - 2);
        if (!this.mobileProfile && !this.gameSettings.reducedMotion) {
          this.tweens.add({
            targets: flag,
            scaleX: { from: 0.93, to: 1.04 },
            angle: { from: -0.7, to: 0.7 },
            duration: 1450 + index * 260,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
        banner.setData('pyongyang-banner', stage.region);
      }
    }
    this.syncPyongyangAdvanceGates(false);
  }

  private syncPyongyangAdvanceGates(animate = false): void {
    const visibleRegions = this.activeRenderRegions(this.simulation.region);
    for (const [region, gate] of this.pyongyangAdvanceGates) {
      const progress = this.simulation.getPyongyangBattleProgress(region);
      const open = progress.cleared;
      gate.open = open;
      this.tweens.killTweensOf(gate.doors);
      gate.doors[0].setPosition(-67, 0).setAngle(0).setAlpha(1);
      gate.doors[1].setPosition(67, 0).setAngle(0).setAlpha(1);
      gate.doors[2].setPosition(0, 0).setAngle(0).setAlpha(1);
      gate.label
        .setText(open ? 'MISSION CLEAR · 전진문 개방' : `전진문 봉쇄 · 남은 수비군 ${progress.total - progress.defeated}`)
        .setColor(open ? '#b9dfa9' : '#efd5a1');
      if (!open) {
        gate.root.setVisible(visibleRegions.has(region)).setAlpha(1);
        continue;
      }
      if (!visibleRegions.has(region) || !animate || this.gameSettings.reducedMotion) {
        gate.root.setVisible(false);
        continue;
      }
      gate.root.setVisible(true).setAlpha(1);
      this.tweens.add({
        targets: gate.doors[0],
        x: -188,
        angle: -7,
        alpha: 0,
        duration: 560,
        ease: 'Cubic.easeIn',
      });
      this.tweens.add({
        targets: gate.doors[1],
        x: 188,
        angle: 7,
        alpha: 0,
        duration: 560,
        ease: 'Cubic.easeIn',
      });
      this.tweens.add({
        targets: gate.doors[2],
        y: -38,
        alpha: 0,
        duration: 430,
        ease: 'Cubic.easeIn',
        onComplete: () => gate.root.setVisible(false),
      });
    }
  }

  private createFrontierBattlefield(): void {
    const origin = REGION_ORIGINS.manchufrontier;
    const addStructure = (
      key: string,
      localX: number,
      localY: number,
      width: number,
      height: number,
      tint: number,
      depthOffset = 0,
    ) => {
      return this.add.image(origin.x + localX, origin.y + localY, key)
        .setDisplaySize(width, height)
        .setOrigin(0.5, 0.94)
        .setTint(tint)
        .setDepth(origin.y + localY + depthOffset);
    };

    // 북쪽(화면 위)에는 여진 후영, 남쪽(화면 아래)에는 조선 진보를 둔다.
    // 하진과 여진 선봉은 이북 군막에서 출발해 얼음 나루를 건너 남하한다.
    addStructure(ASSETS.props.yeongwolBarracks.key, 245, 205, 330, 248, 0x739391, -145);
    addStructure(ASSETS.props.yeongwolBarracks.key, 1291, 205, 330, 248, 0x739391, -145);
    addStructure(ASSETS.props.yeongwolPalisade.key, 490, 240, 340, 108, 0x678482, -150);
    addStructure(ASSETS.props.yeongwolPalisade.key, 1046, 240, 340, 108, 0x678482, -150);

    addStructure(ASSETS.props.yeongwolPalisade.key, 500, 790, 360, 118, 0xc4b89d, -38);
    addStructure(ASSETS.props.yeongwolPalisade.key, 1036, 790, 360, 118, 0xc4b89d, -38);
    addStructure(ASSETS.props.yeongwolWatchtower.key, 230, 720, 218, 286, 0xd0c4a8, -52);
    addStructure(ASSETS.props.yeongwolWatchtower.key, 1306, 720, 218, 286, 0xd0c4a8, -52);
    const gateOpen = this.simulation.isHajinSouthwardMarchReady();
    this.frontierSouthGate = addStructure(
      ASSETS.props.yeongwolInnerGate.key,
      768,
      798,
      320,
      182,
      0xd3c5aa,
      -34,
    ).setVisible(!gateOpen);
    this.frontierSouthGateLabel = this.add.text(
      origin.x + 768,
      origin.y + 742,
      gateOpen ? '남진로 개방 · 계속 진격' : '조선 남문 · 전선 승리 후 개방',
      {
        fontFamily: 'serif',
        fontSize: this.mobileProfile ? '12px' : '15px',
        fontStyle: 'bold',
        color: gateOpen ? '#b8e1af' : '#f0cf96',
        backgroundColor: 'rgba(22,15,10,0.86)',
        padding: { x: 11, y: 6 },
        stroke: '#21130b',
        strokeThickness: 4,
      },
    ).setOrigin(0.5).setDepth(origin.y + 806);

    const factionLabel = (localY: number, title: string, subtitle: string, color: string) => {
      this.add.text(origin.x + 768, origin.y + localY, title, {
        fontFamily: 'serif',
        fontSize: this.mobileProfile ? '16px' : '19px',
        fontStyle: 'bold',
        color,
        backgroundColor: 'rgba(17,16,14,0.76)',
        padding: { x: 14, y: 6 },
        stroke: '#17100c',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(origin.y + localY + 2);
      this.add.text(origin.x + 768, origin.y + localY + 31, subtitle, {
        fontFamily: 'serif',
        fontSize: this.mobileProfile ? '11px' : '13px',
        color: '#d8ccb2',
        stroke: '#17100c',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(origin.y + localY + 2);
    };
    factionLabel(140, '여진 선봉 후영', '철갑 장창수 · 각궁수 · 선봉장', '#b9e0d9');
    factionLabel(850, '조선 국경 방어진', '환도 전열 · 장창 중군 · 진보 궁수', '#eee2c6');

    const sectorLabel = (localY: number, title: string, color: string) => {
      this.add.text(origin.x + 118, origin.y + localY, title, {
        fontFamily: 'serif',
        fontSize: this.mobileProfile ? '10px' : '12px',
        fontStyle: 'bold',
        color,
        backgroundColor: 'rgba(10,16,19,0.68)',
        padding: { x: 8, y: 4 },
        stroke: '#12100d',
        strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(origin.y + localY + 4);
    };
    sectorLabel(250, 'Ⅰ · 여진 선봉 후영', '#a9d9ce');
    sectorLabel(405, 'Ⅱ · 압록 얼음 나루', '#b8dce8');
    sectorLabel(560, 'Ⅲ · 무너진 변경 목책', '#d9bb8b');
    sectorLabel(725, 'Ⅳ · 조선 압록 진보', '#eadbbd');

    const ice = this.add.graphics().setDepth(origin.y + 390);
    ice.fillStyle(0x9ed8e4, 0.08);
    ice.fillRoundedRect(origin.x + 280, origin.y + 340, 976, 136, 42);
    ice.lineStyle(2, 0xd8f4f4, 0.34);
    for (let index = 0; index < 7; index += 1) {
      const x = origin.x + 365 + index * 130;
      const y = origin.y + 375 + (index % 2) * 32;
      ice.beginPath();
      ice.moveTo(x - 28, y - 12);
      ice.lineTo(x, y + 4);
      ice.lineTo(x - 12, y + 30);
      ice.moveTo(x, y + 4);
      ice.lineTo(x + 34, y - 18);
      ice.strokePath();
    }

    const landmark = (
      id: LandmarkId,
      key: string,
      localX: number,
      localY: number,
      size: number,
      tint: number,
      labelText: string,
    ) => {
      const x = origin.x + localX;
      const y = origin.y + localY;
      let discovered = this.simulation.hasDiscoveredLandmark(id);
      const sprite = this.add.image(x, y, key)
        .setDisplaySize(size, size)
        .setOrigin(0.5, 0.82)
        .setTint(discovered ? 0x7f8682 : tint)
        .setDepth(y);
      const label = this.add.text(x, y - size * 0.4, discovered ? `${labelText} · 확인 완료` : labelText, {
        fontFamily: 'serif',
        fontSize: this.mobileProfile ? '10px' : '12px',
        fontStyle: 'bold',
        color: discovered ? '#969b92' : '#ebd5a7',
        backgroundColor: 'rgba(16,14,11,0.72)',
        padding: { x: 7, y: 4 },
        stroke: '#17100b',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(y + 3);
      const zone = this.add.zone(x, y - size * 0.16, size * 0.76, size * 0.62)
        .setDepth(y + 4).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        if (!discovered) sprite.setTint(0xffe7af);
      });
      zone.on('pointerout', () => sprite.setTint(discovered ? 0x7f8682 : tint));
      zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.menuOpen || !this.simulation.interactLandmark(id)) return;
        discovered = true;
        zone.disableInteractive();
        label.setText(`${labelText} · 확인 완료`).setColor('#969b92');
        sprite.setTint(0x7f8682);
        this.tweens.add({
          targets: sprite,
          scaleX: sprite.scaleX * 1.08,
          scaleY: sprite.scaleY * 0.94,
          duration: 150,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      });
    };

    landmark(
      'jurchen-supply-sled',
      ASSETS.props.brokenCart.key,
      350,
      250,
      150,
      0x7eaaa0,
      '여진 보급 썰매 · 살피기',
    );
    landmark(
      'fallen-border-courier',
      ASSETS.props.brokenCart.key,
      1215,
      585,
      145,
      0xbba98a,
      '쓰러진 조선 파발 · 군보 수색',
    );
    landmark(
      'frontier-stone-cairn',
      ASSETS.props.spiritShrine.key,
      1270,
      365,
      135,
      0x9aa9a7,
      '압록 돌무지 · 북방의 맹세',
    );

    const emberCount = this.mobileProfile ? 2 : 4;
    for (let index = 0; index < emberCount; index += 1) {
      const localX = index % 2 === 0 ? 330 : 1206;
      const localY = index < 2 ? 210 : 255;
      const glow = this.add.circle(origin.x + localX, origin.y + localY, 20, 0xe88e44, 0.08)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(origin.y + localY - 40);
      const flame = this.add.circle(origin.x + localX, origin.y + localY, 3.2, 0xffcf79, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(origin.y + localY - 39);
      this.tweens.add({
        targets: [glow, flame],
        alpha: { from: 0.28, to: 0.88 },
        scale: { from: 0.82, to: 1.18 },
        duration: 760 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createFrontierCampProps(): void {
    const origin = REGION_ORIGINS.manchufrontier;
    const prop = (frame: number, x: number, y: number, scale: number, tint = 0xffffff) => {
      const image = this.add.image(origin.x + x, origin.y + y, ASSETS.frontierCampProps.key, frame)
        .setOrigin(0.5, 0.92)
        .setScale(scale)
        .setTint(tint)
        .setDepth(origin.y + y - 2);
      return image;
    };

    const banners = [
      prop(0, 310, 332, 0.34),
      prop(1, 1220, 330, 0.32),
      prop(4, 768, 308, 0.38),
    ];
    prop(2, 670, 318, 0.31);
    prop(3, 1110, 315, 0.28);
    prop(5, 875, 330, 0.31);
    for (const [index, banner] of banners.entries()) {
      this.tweens.add({
        targets: banner,
        angle: { from: -0.8, to: 0.8 },
        scaleX: banner.scaleX * 0.985,
        duration: 1700 + index * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private syncFrontierSouthGateState(animate = false): void {
    const gate = this.frontierSouthGate;
    const label = this.frontierSouthGateLabel;
    if (!gate || !label) return;
    const open = this.simulation.isHajinSouthwardMarchReady();
    label
      .setText(open ? '남진로 개방 · 계속 진격' : '조선 남문 · 전선 승리 후 개방')
      .setColor(open ? '#b8e1af' : '#f0cf96');
    this.tweens.killTweensOf(gate);
    if (!open) {
      gate.setVisible(true).setAlpha(1);
      return;
    }
    if (!animate || !gate.visible) {
      gate.setVisible(false);
      return;
    }
    const baseY = gate.y;
    const baseScaleY = gate.scaleY;
    const origin = REGION_ORIGINS.manchufrontier;
    for (let index = 0; index < 7; index += 1) {
      const dust = this.add.circle(
        origin.x + 664 + index * 35,
        origin.y + 790 + (index % 2) * 8,
        12 + (index % 3) * 4,
        0xc9b58d,
        0.24,
      ).setDepth(origin.y + 812);
      this.tweens.add({
        targets: dust,
        y: dust.y - 34,
        x: dust.x + (index - 3) * 7,
        alpha: 0,
        scale: 1.8,
        duration: 700,
        delay: index * 32,
        onComplete: () => dust.destroy(),
      });
    }
    this.tweens.add({
      targets: gate,
      y: baseY - 118,
      scaleY: baseScaleY * 0.88,
      alpha: 0,
      duration: 860,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        gate.setVisible(false).setY(baseY).setScale(gate.scaleX, baseScaleY).setAlpha(1);
      },
    });
  }

  private createJeonjuRouteLabel(x: number, y: number, label: string, color: number, rotation = 0): void {
    this.add.text(x, y, label, {
      fontFamily: 'serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#17100b',
      strokeThickness: 4,
    }).setOrigin(0.5).setRotation(rotation).setDepth(y + 4);
  }

  private createJeonjuBraziers(origin: { x: number; y: number }, points: number[][]): void {
    points.forEach(([localX, localY], index) => {
      const glow = this.add.circle(origin.x + localX, origin.y + localY, 34, 0xe28c42, 0.07)
        .setDepth(origin.y + localY + 1).setBlendMode(Phaser.BlendModes.ADD);
      const flame = this.add.circle(origin.x + localX, origin.y + localY, 3.4, 0xffc76e, 0.82)
        .setDepth(origin.y + localY + 2).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [glow, flame], alpha: { from: 0.28, to: 0.9 }, scale: { from: 0.82, to: 1.2 },
        duration: 740 + index * 85, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      if (index % 2 === 0) {
        const smoke = this.add.ellipse(origin.x + localX + 2, origin.y + localY - 13, 9, 15, 0xb9ada0, 0.09)
          .setDepth(origin.y + localY + 1).setBlendMode(Phaser.BlendModes.SCREEN);
        this.tweens.add({
          targets: smoke,
          x: smoke.x + 9,
          y: smoke.y - 30,
          alpha: { from: 0.1, to: 0 },
          scale: { from: 0.6, to: 1.55 },
          duration: 2100 + index * 130,
          delay: index * 120,
          repeat: -1,
          ease: 'Sine.easeOut',
        });
      }
    });
  }

  private createJeonjuWaterMotion(origin: { x: number; y: number }): void {
    const currents: Array<[number, number, number, number]> = [
      [1070, 178, 72, 0.2], [1095, 352, 82, 0.45], [1120, 655, 90, 0.5],
      [1195, 790, 105, 0.8], [1265, 925, 120, 0.92], [310, 760, 78, -0.42], [180, 930, 104, -0.28],
    ];
    currents.forEach(([localX, localY, width, rotation], index) => {
      const ripple = this.add.ellipse(origin.x + localX, origin.y + localY, width, 3, 0x9eb8b5, 0.1)
        .setRotation(rotation).setDepth(origin.y + localY + 1).setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: ripple,
        x: ripple.x + 18 * Math.cos(rotation),
        y: ripple.y + 18 * Math.sin(rotation),
        alpha: { from: 0.025, to: 0.2 },
        scaleX: { from: 0.65, to: 1.15 },
        duration: 1450 + index * 170,
        delay: index * 130,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const reedPoints: Array<[number, number]> = [[275, 690], [390, 780], [1045, 420], [1135, 690], [1280, 850]];
    reedPoints.forEach(([localX, localY], index) => {
      const root = this.add.container(origin.x + localX, origin.y + localY).setDepth(origin.y + localY + 2);
      for (let blade = 0; blade < 4; blade += 1) {
        root.add(this.add.rectangle((blade - 1.5) * 4, -11 - blade % 2 * 3, 2, 25 + blade * 2, 0x756f43, 0.48)
          .setOrigin(0.5, 1).setRotation((blade - 1.5) * 0.13));
      }
      this.tweens.add({
        targets: root,
        angle: { from: -2 - index % 2, to: 3 + index % 3 },
        duration: 1700 + index * 190,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createJeonjuWarBanners(origin: { x: number; y: number }): void {
    const bannerPoints: Array<[number, number, number]> = [
      [470, 735, -1], [1066, 735, 1], [500, 470, -1], [1036, 470, 1], [610, 250, -1], [926, 250, 1],
    ];
    bannerPoints.forEach(([localX, localY, facing], index) => {
      const pole = this.add.rectangle(origin.x + localX, origin.y + localY, 3, 64, 0x493729, 0.88)
        .setOrigin(0.5, 1).setDepth(origin.y + localY + 1);
      const flag = this.add.polygon(
        pole.x + facing * 3,
        pole.y - 54,
        [0, 0, facing * 30, 5, facing * 25, 26, 0, 22],
        index % 2 === 0 ? 0x733a32 : 0x65402d,
        0.82,
      ).setOrigin(0, 0.5).setDepth(origin.y + localY + 2);
      this.tweens.add({
        targets: flag,
        scaleX: { from: 0.82, to: 1.08 },
        angle: { from: -2 * facing, to: 3 * facing },
        duration: 920 + index * 125,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createJeonjuMarketMotion(origin: { x: number; y: number }): void {
    const awningPoints: Array<[number, number, number]> = [
      [350, 610, -0.08], [455, 650, 0.06], [1085, 610, 0.07], [1190, 650, -0.06],
    ];
    awningPoints.forEach(([localX, localY, rotation], index) => {
      const awning = this.add.polygon(
        origin.x + localX,
        origin.y + localY,
        [0, 8, 20, 0, 44, 7, 40, 22, 6, 22],
        index % 2 === 0 ? 0x8b6040 : 0x796447,
        0.52,
      ).setRotation(rotation).setDepth(origin.y + localY + 1);
      this.tweens.add({
        targets: awning,
        angle: { from: -1.2, to: 1.2 },
        scaleY: { from: 0.95, to: 1.04 },
        duration: 2100 + index * 230,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const chimneySmokePoints: Array<[number, number]> = [[1110, 545], [1240, 455], [375, 520]];
    chimneySmokePoints.forEach(([localX, localY], index) => {
      const smoke = this.add.ellipse(origin.x + localX, origin.y + localY, 22, 13, 0xb8afa2, 0.08)
        .setDepth(origin.y + localY + 1).setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: smoke,
        x: smoke.x + 34,
        y: smoke.y - 38,
        alpha: { from: 0.11, to: 0 },
        scale: { from: 0.65, to: 1.8 },
        duration: 3300 + index * 420,
        delay: index * 620,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    });
  }

  private openGovernmentDock(): void {
    if (!this.governmentDock) return;
    this.governmentDock.label.setText('울릉 선착장 · 본토행 개방 · 클릭하여 승선').setColor('#f0d394');
    this.governmentDock.glow.setFillStyle(0x6f8e91, 0.34).setStrokeStyle(2, 0xd9af54, 0.82);
  }

  private travelFromGovernmentDock(): void {
    if (this.menuOpen || this.mainlandTravelInProgress) return;
    if (!this.simulation.isUlleungVillageLiberated()) {
      this.simulation.useGovernmentDock();
      return;
    }
    this.mainlandTravelInProgress = true;
    this.destinationMark.setVisible(false);
    this.cameras.main.fadeOut(260, 8, 10, 9);
    this.time.delayedCall(280, () => {
      this.simulation.useGovernmentDock();
      this.playerRoot.setPosition(this.simulation.player.x, this.simulation.player.y);
      this.cameras.main.fadeIn(360, 8, 10, 9);
      this.mainlandTravelInProgress = false;
    });
  }

  private createUlleungRouteSeams(): void {
    const transitions = [
      {
        y: REGION_ORIGINS.ulleungcoast.y + MAP_HEIGHT,
        texture: ASSETS.transitions.ulleungCoastMeadow.key,
      },
      {
        y: REGION_ORIGINS.ulleungmeadow.y + MAP_HEIGHT,
        texture: ASSETS.transitions.ulleungMeadowHunt.key,
      },
      {
        y: REGION_ORIGINS.ulleunghunt.y + MAP_HEIGHT,
        texture: ASSETS.transitions.ulleungHuntRidge.key,
      },
      {
        y: REGION_ORIGINS.ulleungridge.y + MAP_HEIGHT,
        texture: ASSETS.transitions.ulleungRidgePrison.key,
      },
      {
        y: REGION_ORIGINS.ulleungdo.y + MAP_HEIGHT,
        texture: ASSETS.transitions.ulleungPrisonGovernment.key,
      },
    ];
    const blendOverlap = MAP_HEIGHT / 4;
    const blendHeight = ULLEUNG_PASSAGE_HEIGHT + blendOverlap * 2;
    const detailFramesByTransition = [
      [2, 3, 0],
      [0, 7, 3],
      [2, 8, 1],
      [8, 2, 1],
      [6, 4, 2],
    ] as const;

    transitions.forEach((transition, transitionIndex) => {
      const islandX = REGION_ORIGINS.ulleungdo.x;
      this.add.image(islandX, transition.y - blendOverlap, transition.texture)
        .setOrigin(0, 0)
        .setDisplaySize(MAP_WIDTH, blendHeight)
        .setDepth(ISLAND_BACKGROUND_DEPTH + 2);

      const detailFrames = detailFramesByTransition[transitionIndex];

      for (const side of [-1, 1]) {
        const detailCount = this.mobileProfile ? 2 : 3;
        for (let cluster = 0; cluster < detailCount; cluster += 1) {
          const progress = (cluster + 0.5) / detailCount;
          const clusterY = transition.y + progress * ULLEUNG_PASSAGE_HEIGHT;
          const meander = Math.sin((cluster + 1) * 1.73 + transitionIndex) * 18;
          const roadX = ulleungRoadCenterAtY(clusterY);
          const clusterX = roadX + side * (242 + (cluster % 3) * 34) + meander;
          const detail = this.add.image(
            clusterX,
            clusterY,
            ASSETS.props.worldGroundDetails.key,
            detailFrames[cluster % detailFrames.length],
          )
            .setScale(0.3 + (cluster % 3) * 0.045)
            .setAngle(side * (8 + (cluster % 3) * 7))
            .setFlipX(side < 0 ? cluster % 2 === 0 : cluster % 2 === 1)
            .setAlpha(0.28 + (cluster % 2) * 0.04)
            .setDepth(ISLAND_SEAM_DEPTH + cluster)
            .setName(`ulleung-route-detail-${transitionIndex}-${side}-${cluster}`);
          detail.setData('ulleungRouteTransition', transitionIndex);
        }
      }
    });
  }

  private positionUlleungContinuityPlaytest(): void {
    if (!import.meta.env.DEV) return;
    const mode = new URLSearchParams(window.location.search).get('continuityqa');
    if (!mode?.startsWith('seam')) return;
    const passage = ULLEUNG_PASSAGES.find((candidate) => candidate.upper === this.simulation.region);
    if (!passage) return;
    const progress = mode === 'seam-top' ? 0.04 : mode === 'seam-bottom' ? 0.96 : 0.32;
    const y = passage.y + passage.height * progress;
    this.simulation.player.x = ulleungRoadCenterAtY(y);
    this.simulation.player.y = y;
    this.simulation.player.destination = null;
  }

  private positionWorldContinuityPlaytest(): void {
    if (!import.meta.env.DEV) return;
    const mode = new URLSearchParams(window.location.search).get('continuityqa');
    if (!mode?.startsWith('world:')) return;
    const seamId = mode.slice('world:'.length);
    const seam = WORLD_TERRAIN_SEAMS.find((candidate) => candidate.id === seamId);
    if (seam) {
      const from = REGION_ORIGINS[seam.from];
      const to = REGION_ORIGINS[seam.to];
      if (seam.orientation === 'vertical') {
        const boundaryY = Math.max(from.y, to.y);
        this.simulation.player.x = from.x + (seam.fromLane + seam.toLane) / 2;
        this.simulation.player.y = boundaryY - 54;
      } else {
        const boundaryX = Math.max(from.x, to.x);
        this.simulation.player.x = boundaryX - 54;
        this.simulation.player.y = from.y + (seam.fromLane + seam.toLane) / 2;
      }
    } else {
      const connection = WORLD_TRAVEL_CONNECTIONS.find((candidate) => candidate.id === seamId);
      if (!connection || (this.simulation.region !== connection.from
        && this.simulation.region !== connection.to)) return;
      const origin = REGION_ORIGINS[this.simulation.region];
      const otherRegion = this.simulation.region === connection.from
        ? connection.to
        : connection.from;
      const north = REGION_ORIGINS[otherRegion].y < origin.y;
      this.simulation.player.x = origin.x + MAP_WIDTH / 2;
      this.simulation.player.y = origin.y + (north ? 210 : MAP_HEIGHT - 210);
    }
    this.simulation.player.destination = null;
  }

  private createUlleungAdventureProps(): void {
    const props: Array<{
      id: LandmarkId;
      region: 'ulleungcoast' | 'ulleunghunt' | 'ulleungridge' | 'ulleungdo' | 'ulleungvillage';
      frame: number;
      x: number;
      y: number;
      size: number;
      label: string;
    }> = [
      { id: 'herb-patch', region: 'ulleungcoast', frame: 0, x: 360, y: 650, size: 245, label: '울릉 약초 군락 · 채집' },
      { id: 'spirit-shrine', region: 'ulleungcoast', frame: 1, x: 1160, y: 390, size: 235, label: '해송 산신 제단 · 기도' },
      {
        id: 'refugee-camp',
        region: 'ulleunghunt',
        frame: 2,
        x: ULLEUNG_REFUGEE_CAMP_LOCAL.x,
        y: ULLEUNG_REFUGEE_CAMP_LOCAL.y,
        size: 270,
        label: '피난민 모닥불 · 살피기',
      },
      { id: 'tax-cart', region: 'ulleungridge', frame: 3, x: 1080, y: 555, size: 270, label: '관아 징세 수레 · 세곡 환수' },
      { id: 'smuggler-cache', region: 'ulleungdo', frame: 4, x: 300, y: 735, size: 235, label: '밀수품 은닉처 · 수색' },
      { id: 'government-treasury', region: 'ulleungvillage', frame: 5, x: 1260, y: 740, size: 245, label: '관아 압수품 궤짝 · 해방 후 개방' },
    ];

    for (const prop of props) {
      const origin = REGION_ORIGINS[prop.region];
      const x = origin.x + prop.x;
      const y = origin.y + prop.y;
      const sprite = this.add.image(x, y, ASSETS.props.ulleungAdventureProps.key, prop.frame)
        .setDisplaySize(prop.size, prop.size).setOrigin(0.5, 0.82).setDepth(y);
      const label = this.add.text(x, y - prop.size * 0.42, prop.label, {
        fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#e2d1a7', stroke: '#17100b', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(y + 2);
      const zone = this.add.zone(x, y - prop.size * 0.18, prop.size * 0.72, prop.size * 0.62)
        .setDepth(y + 3).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => sprite.setTint(0xffedbd));
      zone.on('pointerout', () => sprite.clearTint());
      zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.isGameplayInputLocked()) return;
        if (!this.simulation.interactLandmark(prop.id)) return;
        zone.disableInteractive();
        label.setText(`${prop.label.split(' · ')[0]} · 탐색 완료`).setColor('#9fa48e');
        this.tweens.add({
          targets: sprite, scaleX: sprite.scaleX * 1.06, scaleY: sprite.scaleY * 0.94,
          duration: 130, yoyo: true, ease: 'Back.easeOut',
          onComplete: () => sprite.setTint(0x8f9188),
        });
      });
    }
  }

  private createEnvironment(): void {
    this.createWaterFlow();
    this.createIslandOceanMotion();
    this.createUlleungRegionalAtmosphere();
    this.createJapanAtmosphere();
    this.createIslandTreeMotion();
    const cartShadow = this.add.ellipse(315, 741, 156, 44, 0x090b08, 0.42).setDepth(730);
    const cart = this.add.image(315, 735, ASSETS.props.brokenCart.key)
      .setDisplaySize(232, 232).setOrigin(0.5, 0.88).setDepth(735);
    const shrineShadow = this.add.ellipse(1120, 700, 132, 42, 0x090b08, 0.45).setDepth(685);
    const shrine = this.add.image(1120, 690, ASSETS.props.spiritShrine.key)
      .setDisplaySize(226, 226).setOrigin(0.5, 0.9).setDepth(690);
    cartShadow.setScale(1.04, 0.82);
    shrineShadow.setScale(1, 0.8);
    cart.setTint(0xe8e0cf);
    shrine.setTint(0xe4dfce);

    for (let index = 0; index < 12; index += 1) {
      const x = 255 + ((index * 137) % 1040);
      const y = 270 + ((index * 83) % 520);
      const glow = this.add.circle(x, y, index % 3 === 0 ? 2.2 : 1.4, 0xf4d889, 0.48)
        .setDepth(1450 + index);
      this.tweens.add({
        targets: glow,
        x: x + (index % 2 === 0 ? 18 : -18),
        y: y - 12 - (index % 4) * 4,
        alpha: { from: 0.14, to: 0.72 },
        scale: { from: 0.7, to: 1.35 },
        duration: 1800 + index * 115,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const fogBands = [
      { x: 360, y: 462, w: 390, h: 76, depth: 410, duration: 9200 },
      { x: 1010, y: 540, w: 470, h: 88, depth: 530, duration: 11400 },
      { x: 690, y: 805, w: 520, h: 72, depth: 790, duration: 12800 },
    ];
    for (const band of fogBands) {
      const fog = this.add.ellipse(band.x, band.y, band.w, band.h, 0xb9c3ae, 0.035).setDepth(band.depth);
      this.tweens.add({
        targets: fog,
        x: band.x + 96,
        alpha: { from: 0.018, to: 0.055 },
        duration: band.duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.createSwayingCanopies();
    this.createWindField();
  }

  private createJapanAtmosphere(): void {
    const requestedRegion = new URLSearchParams(window.location.search).get('region') as RegionId | null;
    if (document.body.dataset.bootCampaign !== 'japan'
      && !(requestedRegion && isJapanRegion(requestedRegion))) return;

    const osaka = REGION_ORIGINS.osaka;
    for (let index = 0; index < (this.mobileProfile ? 5 : 14); index += 1) {
      const rain = this.add.rectangle(
        osaka.x + 150 + (index * 101) % 1230,
        osaka.y + 130 + (index * 151) % 700,
        2,
        28 + index % 4 * 6,
        0xb9c8cb,
        0.12,
      ).setRotation(-0.14).setDepth(osaka.y + 930 + index);
      this.tweens.add({
        targets: rain,
        x: rain.x - 30,
        y: rain.y + 148,
        alpha: { from: 0.04, to: 0.2 },
        duration: 820 + index * 31,
        delay: index * 90,
        repeat: -1,
      });
    }

    const settsu = REGION_ORIGINS.settsuvillage;
    for (let index = 0; index < (this.mobileProfile ? 2 : 5); index += 1) {
      const smoke = this.add.ellipse(
        settsu.x + 280 + (index % 2) * 965,
        settsu.y + 380,
        24 + index * 7,
        12 + index * 3,
        0xc7c1ae,
        0.08,
      ).setDepth(settsu.y + 430 + index);
      this.tweens.add({
        targets: smoke,
        x: smoke.x + (index % 2 === 0 ? -35 : 35),
        y: smoke.y - 112 - index * 8,
        scaleX: 1.8,
        scaleY: 1.5,
        alpha: 0,
        duration: 3300 + index * 390,
        delay: index * 640,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }

    const yamazaki = REGION_ORIGINS.yamazakihunt;
    for (let index = 0; index < (this.mobileProfile ? 4 : 10); index += 1) {
      const leaf = this.add.ellipse(
        yamazaki.x + 180 + (index * 137) % 1180,
        yamazaki.y + 220 + (index * 83) % 570,
        10 + index % 3 * 3,
        4,
        index % 2 === 0 ? 0x9f7848 : 0x6f854f,
        0.32,
      ).setRotation(index * 0.51).setDepth(yamazaki.y + 900 + index);
      this.tweens.add({
        targets: leaf,
        x: leaf.x + 170,
        y: leaf.y + 46,
        angle: 220 + index * 17,
        alpha: 0,
        duration: 2600 + index * 170,
        delay: index * 240,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    for (const region of ['osakacastle', 'shogunkeep'] as const) {
      const origin = REGION_ORIGINS[region];
      for (let index = 0; index < (this.mobileProfile ? 3 : 7); index += 1) {
        const lantern = this.add.circle(
          origin.x + 250 + (index * 177) % 1040,
          origin.y + 250 + (index % 3) * 210,
          4 + index % 2,
          region === 'shogunkeep' ? 0xd14f32 : 0xe9a55b,
          0.23,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(origin.y + 930 + index);
        this.tweens.add({
          targets: lantern,
          alpha: { from: 0.12, to: 0.58 },
          scale: { from: 0.72, to: 1.34 },
          duration: 720 + index * 95,
          delay: index * 130,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private createUlleungRegionalAtmosphere(): void {
    const coast = REGION_ORIGINS.ulleungcoast;
    for (let index = 0; index < (this.mobileProfile ? 3 : 7); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = coast.x + (side < 0 ? 128 : MAP_WIDTH - 128);
      const y = coast.y + 220 + index * 92;
      const spray = this.add.ellipse(x, y, 84 + index * 7, 8, 0xd9e4df, 0.08)
        .setRotation(side * -0.18)
        .setDepth(coast.y + y - coast.y + 2)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: spray,
        x: x + side * 46,
        scaleX: { from: 0.62, to: 1.25 },
        alpha: { from: 0.025, to: 0.18 },
        duration: 2500 + index * 210,
        delay: index * 190,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const meadow = REGION_ORIGINS.ulleungmeadow;
    for (let index = 0; index < (this.mobileProfile ? 4 : 10); index += 1) {
      const grassWave = this.add.ellipse(
        meadow.x + 310 + (index * 117) % 920,
        meadow.y + 260 + (index * 79) % 560,
        92 + (index % 4) * 18,
        5,
        0xd6d0a9,
        0.075,
      ).setRotation(-0.12).setDepth(meadow.y + 850 + index);
      this.tweens.add({
        targets: grassWave,
        x: grassWave.x + 72,
        y: grassWave.y - 9,
        scaleX: { from: 0.58, to: 1.32 },
        alpha: { from: 0.018, to: 0.15 },
        duration: 1700 + index * 105,
        delay: index * 160,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const hunt = REGION_ORIGINS.ulleunghunt;
    for (let index = 0; index < (this.mobileProfile ? 3 : 7); index += 1) {
      const smoke = this.add.ellipse(
        hunt.x + ULLEUNG_REFUGEE_CAMP_LOCAL.x,
        hunt.y + ULLEUNG_REFUGEE_CAMP_LOCAL.y - 55,
        22 + index * 5,
        10 + index * 2,
        0xc4c1b0,
        0.1,
      )
        .setDepth(hunt.y + 706 + index);
      this.tweens.add({
        targets: smoke,
        x: hunt.x + ULLEUNG_REFUGEE_CAMP_LOCAL.x - 30 - index * 9,
        y: hunt.y + ULLEUNG_REFUGEE_CAMP_LOCAL.y - 170 - index * 12,
        scaleX: 1.7,
        scaleY: 1.45,
        alpha: 0,
        duration: 3600 + index * 390,
        delay: index * 520,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }
    for (let index = 0; index < (this.mobileProfile ? 4 : 9); index += 1) {
      const ember = this.add.circle(
        hunt.x + ULLEUNG_REFUGEE_CAMP_LOCAL.x,
        hunt.y + ULLEUNG_REFUGEE_CAMP_LOCAL.y - 31,
        1.5 + index % 2,
        0xf0a24e,
        0.68,
      )
        .setDepth(hunt.y + 710 + index)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: ember,
        x: hunt.x + ULLEUNG_REFUGEE_CAMP_LOCAL.x - 28 + (index % 3) * 21,
        y: hunt.y + ULLEUNG_REFUGEE_CAMP_LOCAL.y - 111 - index * 8,
        alpha: 0,
        duration: 1450 + index * 120,
        delay: index * 240,
        repeat: -1,
        ease: 'Cubic.easeOut',
      });
    }

    const ridge = REGION_ORIGINS.ulleungridge;
    for (let index = 0; index < (this.mobileProfile ? 5 : 12); index += 1) {
      const gust = this.add.ellipse(
        ridge.x + 190 + (index * 113) % 1120,
        ridge.y + 230 + (index * 71) % 590,
        74 + index % 4 * 18,
        3,
        0xe0d8bd,
        0.07,
      ).setRotation(-0.15).setDepth(ridge.y + 850 + index);
      this.tweens.add({
        targets: gust,
        x: gust.x + 150,
        y: gust.y - 24,
        alpha: { from: 0.015, to: 0.16 },
        duration: 1550 + index * 95,
        delay: index * 180,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    for (const [regionId, torches] of [
      ['ulleungdo', [[604, 318], [932, 318], [610, 820], [926, 820]]],
      ['ulleungvillage', [[640, 280], [896, 280], [650, 650], [886, 650]]],
    ] as Array<[RegionId, number[][]]>) {
      const origin = REGION_ORIGINS[regionId];
      torches.forEach(([localX, localY], index) => {
        const glow = this.add.circle(origin.x + localX, origin.y + localY, 30, 0xe5893f, 0.05)
          .setDepth(origin.y + localY + 2)
          .setBlendMode(Phaser.BlendModes.ADD);
        const flame = this.add.circle(origin.x + localX, origin.y + localY, 3, 0xffc66b, 0.72)
          .setDepth(origin.y + localY + 3)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: [glow, flame],
          alpha: { from: 0.25, to: 0.86 },
          scale: { from: 0.8, to: 1.18 },
          duration: 720 + index * 105,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
    }
  }

  private createBetaRoadsideProps(): void {
    for (const prop of BETA_ROADSIDE_PROP_PLACEMENTS) {
      const origin = REGION_ORIGINS[prop.region];
      const x = origin.x + prop.x;
      const y = origin.y + prop.y;
      const image = this.add.image(x, y, ASSETS.props.betaRoadsideProps.key, prop.frame)
        .setDisplaySize(prop.size, prop.size)
        .setOrigin(0.5, 0.9)
        .setDepth(y - 1);
      this.registerLazyAmbientObject(image, prop.region);
      if (prop.frame !== 4) continue;
      const ember = this.add.circle(x, y - prop.size * 0.3, prop.size * 0.13, 0xe57435, 0.14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y);
      this.registerLazyAmbientObject(ember, prop.region);
      this.tweens.add({
        targets: ember,
        alpha: { from: 0.08, to: 0.22 },
        scale: { from: 0.84, to: 1.12 },
        duration: 960,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createVillage(): void {
    const villageTop = VILLAGE_TOP;

    // A soft earth-and-mist bridge hides the texture seam while keeping the gate route readable.
    const roadBlend = this.add.ellipse(770, villageTop + 4, 330, 96, 0x766044, 0.14)
      .setDepth(villageTop - 38);
    roadBlend.setBlendMode(Phaser.BlendModes.SCREEN);
    for (let index = 0; index < 10; index += 1) {
      const x = 40 + index * 165;
      const fog = this.add.ellipse(x, villageTop + (index % 2 === 0 ? -5 : 8), 245, 92 + (index % 3) * 18, 0x9ba297, 0.075)
        .setDepth(villageTop - 39 + index);
      this.tweens.add({
        targets: fog,
        x: x + (index % 2 === 0 ? 28 : -24),
        alpha: { from: 0.045, to: 0.1 },
        duration: 6200 + index * 310,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const lanterns = [
      { x: 535, y: villageTop + 302 }, { x: 665, y: villageTop + 228 },
      { x: 872, y: villageTop + 228 }, { x: 1110, y: villageTop + 326 },
      { x: 475, y: villageTop + 660 }, { x: 1035, y: villageTop + 595 },
    ];
    lanterns.forEach((point, index) => {
      const outer = this.add.circle(point.x, point.y, 27, 0xe59d46, 0.055).setDepth(point.y - 4);
      const core = this.add.circle(point.x, point.y, 4, 0xffc66d, 0.78).setDepth(point.y + 2);
      outer.setBlendMode(Phaser.BlendModes.ADD);
      core.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [outer, core],
        alpha: { from: index % 2 === 0 ? 0.55 : 0.38, to: index % 2 === 0 ? 0.9 : 0.72 },
        scale: { from: 0.86, to: 1.12 },
        duration: 940 + index * 115,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Forge smoke drifts independently of the painted chimney.
    for (let index = 0; index < 5; index += 1) {
      const smoke = this.add.ellipse(1370, villageTop + 100, 24 + index * 5, 13 + index * 3, 0xa9aea5, 0.11)
        .setDepth(villageTop + 105 + index);
      this.tweens.add({
        targets: smoke,
        x: 1325 - index * 12,
        y: villageTop + 20 - index * 10,
        scaleX: 1.8,
        scaleY: 1.55,
        alpha: 0,
        duration: 4200 + index * 480,
        delay: index * 620,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }

    this.createVillageFarmstead(villageTop);

    this.createVillageNpc({
      id: 'gate-warden-left', x: 700, y: villageTop + 323, name: '포졸 수문장',
      dialogue: '마을 문은 우리가 지키오. 산길로 나갈 땐 조심하시오.', mode: 'guard', tint: 0xffffff,
      speed: 14, patrol: [
        { x: 700, y: villageTop + 323 }, { x: 675, y: villageTop + 340 },
      ], facing: Math.PI / 2,
    });
    this.createVillageNpc({
      id: 'gate-warden-right', x: 840, y: villageTop + 323, name: '포졸 보초',
      dialogue: '달빛고을 북문 경계 중이오. 수상한 자는 들이지 않소.', mode: 'guard', tint: 0xffffff,
      speed: 14, patrol: [
        { x: 840, y: villageTop + 323 }, { x: 865, y: villageTop + 340 },
      ], facing: Math.PI / 2,
    });
    this.createVillageNpc({
      id: 'innkeeper', x: 520, y: villageTop + 455, name: '주모 연화',
      dialogue: '따뜻한 국밥 냄새가 나는구먼. 아직 장사는 준비 중이오.', mode: 'armor-only', tint: 0xb78d76,
      speed: 27, patrol: [
        { x: 520, y: villageTop + 455 }, { x: 625, y: villageTop + 500 },
        { x: 650, y: villageTop + 585 }, { x: 515, y: villageTop + 590 },
        { x: 455, y: villageTop + 520 },
      ],
    });
    this.createVillageNpc({
      id: 'blacksmith', x: 1115, y: villageTop + 480, name: '대장장이 무쇠', role: 'blacksmith',
      dialogue: '요괴에게서 얻은 쇳조각이라면 쓸 만한 칼을 만들 수 있지.', mode: 'commoner', tint: 0x9d806d,
      speed: 0, patrol: [], facing: Math.PI,
    });
    this.createVillageNpc({
      id: 'merchant', x: 560, y: villageTop + 625, name: '행상 장도리',
      dialogue: '귀한 부적과 약재를 구하고 있소. 장터를 둘러보시오.', mode: 'commoner', tint: 0x7d8b78,
      speed: 31, patrol: [
        { x: 560, y: villageTop + 625 }, { x: 690, y: villageTop + 655 },
        { x: 810, y: villageTop + 600 }, { x: 720, y: villageTop + 535 },
        { x: 590, y: villageTop + 555 },
      ],
    });
    this.createVillageNpc({
      id: 'herbalist', x: 1010, y: villageTop + 520, name: '약초꾼 칠성',
      dialogue: '청람 안개숲의 푸른 불빛은 따라가면 안 되오.', mode: 'commoner', tint: 0x758675,
      speed: 26, patrol: [
        { x: 1010, y: villageTop + 520 }, { x: 930, y: villageTop + 555 },
        { x: 875, y: villageTop + 510 }, { x: 950, y: villageTop + 470 },
      ],
    });
    this.createVillageNpc({
      id: 'porter', x: 1180, y: villageTop + 690, name: '짐꾼 덕구',
      dialogue: '폐광 쪽 수레길이 열렸지만 광산귀가 버티고 있소.', mode: 'commoner', tint: 0x8b7666,
      speed: 33, patrol: [
        { x: 1180, y: villageTop + 690 }, { x: 1110, y: villageTop + 750 },
        { x: 1035, y: villageTop + 715 }, { x: 1090, y: villageTop + 650 },
      ],
    });

    this.add.text(770, villageTop + 155, '달빛고을', {
      fontFamily: 'serif', fontSize: '21px', fontStyle: 'bold', color: '#d8bd80',
      stroke: '#20160f', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(villageTop + 162).setAlpha(0.82);

    this.regionLabel = this.add.text(0, 0, '', {
      fontFamily: 'serif', fontSize: '25px', fontStyle: 'bold', color: '#ead6a5',
      backgroundColor: 'rgba(20,15,11,0.72)', padding: { x: 18, y: 9 },
      stroke: '#2a1a10', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2500).setScrollFactor(0).setAlpha(0);
  }

  private createRegionPortals(): void {
    const createMarker = (x: number, y: number, label: string, frame: number, _color: number) => {
      const text = this.add.text(0, -20, label, {
        fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#ead7ac',
        backgroundColor: 'rgba(20,15,11,0.62)',
        padding: { x: 9, y: 4 },
        stroke: '#1a100a', strokeThickness: 3,
      }).setOrigin(0.5);
      return this.add.container(x, y, [text])
        .setDepth(y + 1)
        .setName(`region-exit-label-${frame}-${label}`);
    };

    createMarker(72, VILLAGE_TOP + 470, '청람 안개숲', 0, 0x88aa91);
    createMarker(MAP_WIDTH - 72, VILLAGE_TOP + 470, '흑철 폐광고개', 1, 0xb18b67);
    createMarker(770, CENTRAL_WORLD_HEIGHT - 54, '월하 그림자들', 2, 0x8195bd);
    createMarker(-72, VILLAGE_TOP + 470, '달빛고을', 1, 0x9ab391);
    createMarker(MAP_WIDTH + 72, VILLAGE_TOP + 470, '달빛고을', 0, 0xb39a76);
    createMarker(770, CENTRAL_WORLD_HEIGHT + 54, '달빛고을', 3, 0x91a5ca);
    createMarker(-MAP_WIDTH + 72, VILLAGE_TOP + 470, '영월 대도호부', 1, 0xb59b78);
    createMarker(-MAP_WIDTH - 72, VILLAGE_TOP + 470, '청람 안개숲', 0, 0x8da897);

    const westbound = this.add.zone(-MAP_WIDTH + 52, VILLAGE_TOP + 470, 92, 190)
      .setDepth(VILLAGE_TOP + 690).setInteractive({ useHandCursor: true });
    westbound.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: -MAP_WIDTH - 20, y: VILLAGE_TOP + 470 });
    });
    const eastbound = this.add.zone(-MAP_WIDTH - 52, VILLAGE_TOP + 470, 92, 190)
      .setDepth(VILLAGE_TOP + 691).setInteractive({ useHandCursor: true });
    eastbound.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.moveTo({ x: -MAP_WIDTH + 20, y: VILLAGE_TOP + 470 });
    });
  }

  private createDungeonEntrance(): void {
    const x = REGION_ORIGINS.minepass.x + 770;
    const y = REGION_ORIGINS.minepass.y + 300;
    const gate = this.add.image(x, y - 32, ASSETS.props.worldTransitionProps.key, 0)
      .setScale(0.56)
      .setTint(0x8e8172)
      .setDepth(y + 1)
      .setName('muyeong-mine-raster-gate');
    const gateLabel = this.add.text(x, y - 104, '무영광산 입구', {
      fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: '#f2dfa8',
      stroke: '#25170e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(y + 4);
    const zone = this.add.zone(x, y - 26, 230, 190).setInteractive({ useHandCursor: true }).setDepth(y + 4);
    zone.setData('dungeonAction', 'enter');
    zone.on('pointerover', () => gate.setTint(0xc9ad79));
    zone.on('pointerout', () => gate.setTint(0x8e8172));
    zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.enterDungeonWhenReady();
    });
    this.tweens.add({
      targets: [gate, gateLabel], alpha: { from: 0.84, to: 1 },
      duration: 1200, yoyo: true, repeat: -1,
    });
  }

  private renderDungeonFloor(): void {
    for (const visual of this.dungeonVisuals) visual.destroy();
    this.dungeonVisuals = [];
    const layout = this.simulation.dungeonLayout;
    if (!layout) return;
    const origin = REGION_ORIGINS.dungeon;
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.dungeonVisuals.push(object);
      return object;
    };
    const floorMark = add(this.add.text(origin.x + 760, 246, `${layout.title} · ${layout.floor}층`, {
      fontFamily: 'serif', fontSize: '18px', fontStyle: 'bold', color: '#d6b77d',
      stroke: '#21140e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(250));
    floorMark.setAlpha(0.88);

    for (const feature of layout.features) {
      const x = origin.x + feature.x;
      const y = origin.y + feature.y;
      if (feature.kind === 'wall') {
        const horizontal = feature.width >= feature.height;
        const length = horizontal ? feature.width : feature.height;
        const spacing = horizontal ? 92 : 86;
        const tileCount = Math.max(1, Math.ceil(length / spacing));
        for (let index = 0; index < tileCount; index += 1) {
          const progress = tileCount === 1 ? 0.5 : index / (tileCount - 1);
          const tileX = horizontal ? x - length / 2 + progress * length : x;
          const tileY = horizontal ? y : y - length / 2 + progress * length;
          const frame = horizontal
            ? tileCount === 1 ? 3 : index === 0 ? 1 : index === tileCount - 1 ? 2 : index % 4 === 0 ? 3 : 0
            : tileCount === 1 ? 7 : index === 0 ? 5 : index === tileCount - 1 ? 6 : index % 4 === 0 ? 7 : 4;
          add(this.add.image(tileX, tileY - (horizontal ? 28 : 8), ASSETS.dungeonWalls.key, frame)
            .setScale(horizontal ? 0.43 : 0.4)
            .setDepth(tileY + (horizontal ? 1 : 0)));
        }
      } else if (feature.kind === 'pillar') {
        add(this.add.ellipse(x, y + 4, feature.radius * 2.2, feature.radius * 0.9, 0x0b0908, 0.48).setDepth(y - 2));
        add(this.add.image(x, y - 18, ASSETS.dungeonProps.key, 4).setScale(Math.max(0.36, feature.radius / 112)).setDepth(y + 1));
      } else if (feature.kind === 'trap') {
        const trap = add(this.add.image(x, y - 10, ASSETS.dungeonProps.key, 6).setScale(Math.max(0.38, feature.radius / 100)).setDepth(y - 3));
        this.tweens.add({ targets: trap, alpha: { from: 0.28, to: 0.72 }, duration: 850, yoyo: true, repeat: -1 });
      } else {
        const seal = add(this.add.image(x, y - 6, ASSETS.dungeonProps.key, 5).setScale(Math.max(0.4, feature.radius / 104)).setDepth(y - 4));
        this.tweens.add({ targets: seal, angle: 360, duration: 12000, repeat: -1 });
      }
    }

    const createStairs = (point: { x: number; y: number }, label: string, action: 'next' | 'exit') => {
      const x = origin.x + point.x;
      const y = origin.y + point.y;
      const locked = action === 'next' && this.simulation.isDungeonExitLocked();
      const base = add(this.add.image(x, y - 8, ASSETS.dungeonProps.key, action === 'next' ? 0 : 1).setScale(0.45).setDepth(y + 1));
      if (locked) base.setTint(0x7e5656);
      add(this.add.text(x, y - 56, locked ? '보스 토벌 후 개방' : label, {
        fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: locked ? '#ff9f8d' : '#f0d7a1', stroke: '#21130c', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(y + 8));
      const zone = add(this.add.zone(x, y, 150, 100).setInteractive({ useHandCursor: true }).setDepth(y + 9));
      zone.setData('dungeonAction', action);
      zone.on('pointerover', () => {
        base.setTint(locked ? 0xa96060 : 0xffdd95);
      });
      zone.on('pointerout', () => {
        base.setTint(locked ? 0x7e5656 : 0xffffff);
      });
      zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.isGameplayInputLocked()) return;
        if (action === 'next') this.simulation.advanceDungeonFloor();
        else this.simulation.leaveDungeon();
      });
    };
    createStairs(layout.exitStairs, '지상으로 귀환', 'exit');
    createStairs(layout.nextStairs, layout.floor >= layout.maxFloor ? '최심부 · 100층' : `다음 층 · ${layout.floor + 1}층`, 'next');
  }

  private createWorldTerrainSeams(): void {
    const seamFeatherFrame: Record<WorldTerrainSeam['kind'], number> = {
      'country-road': 0,
      'market-road': 0,
      'forest-pass': 1,
      'snow-road': 2,
      'river-ford': 3,
      'coast-road': 3,
      'castle-gate': 3,
    };
    const seamDetailFrames: Record<WorldTerrainSeam['kind'], readonly number[]> = {
      'country-road': [0, 1, 2],
      'forest-pass': [1, 8, 0],
      'castle-gate': [6, 2, 0],
      'snow-road': [5, 8, 2],
      'river-ford': [4, 2, 5],
      'coast-road': [4, 2, 0],
      'market-road': [6, 0, 2],
    };
    const seamRoadFrame: Record<WorldTerrainSeam['kind'], number> = {
      'country-road': 0,
      'forest-pass': 1,
      'castle-gate': 2,
      'snow-road': 3,
      'river-ford': 4,
      'coast-road': 5,
      'market-road': 6,
    };
    const authoredSeamById: Partial<Record<string, { key: string; span: number }>> = {
      'settsuvillage-osaka': { key: ASSETS.transitions.settsuOsaka.key, span: 768 },
      'jurchenvillage-manchufrontier': { key: ASSETS.transitions.jurchenFrontier.key, span: 768 },
      ...Object.fromEntries(JOSEON_TOWN_TRANSITION_SEAMS.map((transition) => [
        transition.id,
        { key: transition.asset.key, span: transition.span },
      ])),
    };

    WORLD_TERRAIN_SEAMS.forEach((seam, seamIndex) => {
      const fromOrigin = REGION_ORIGINS[seam.from];
      const toOrigin = REGION_ORIGINS[seam.to];
      const isCentralWorldSeam = seam.id === 'mistwood-village'
        || seam.id === 'village-minepass'
        || seam.id === 'village-moonfield';
      const isJoseonTownSeam = isJoseonTownRegion(seam.from) && isJoseonTownRegion(seam.to);
      const authoredSeam = authoredSeamById[seam.id];
      const usesAuthoredSeam = Boolean(
        authoredSeam && this.createAuthoredTerrainTransition(seam, authoredSeam),
      );
      const featherFrame = seamFeatherFrame[seam.kind];
      const size = seam.bandSize ?? 400;
      const vertical = seam.orientation === 'vertical';
      const boundary = vertical
        ? Math.max(fromOrigin.y, toOrigin.y)
        : Math.max(fromOrigin.x, toOrigin.x);
      const crossSize = vertical ? MAP_WIDTH : MAP_HEIGHT;
      const laneMidpoint = Phaser.Math.Linear(seam.fromLane, seam.toLane, 0.5);
      const seamCenterX = vertical ? fromOrigin.x + crossSize / 2 : boundary;
      const seamCenterY = vertical ? boundary : fromOrigin.y + crossSize / 2;
      const seamMarker = this.add.container(seamCenterX, seamCenterY)
        .setDepth(WORLD_FLOOR_DEPTH + 14)
        .setName(`terrain-seam-${seam.id}`);
      seamMarker
        .setData('terrainSeam', seam.id)
        .setData('terrainSeamKind', seam.kind)
        .setData('terrainFrom', seam.from)
        .setData('terrainTo', seam.to);

      // The feather frames already have irregular transparent edges. Several
      // modest, overlapping instances hide the rectangular region boundary
      // without stretching one bitmap across an entire map width.
      const featherCount = usesAuthoredSeam || isJoseonTownSeam ? 0 : crossSize > 1200 ? 4 : 3;
      for (let index = 0; index < featherCount; index += 1) {
        const across = (index + 0.5) * crossSize / featherCount;
        const stagger = (((index * 29 + seamIndex * 17) % 74) - 37) * 0.72;
        const featherX = vertical ? fromOrigin.x + across : boundary + stagger;
        const featherY = vertical ? boundary + stagger : fromOrigin.y + across;
        // The authored central-world backgrounds already share matching edge
        // colours and perspective. They only need a shallow irregular veil;
        // the stronger treatment is reserved for genuinely different biomes.
        const featherScale = (isCentralWorldSeam ? 0.5 : 0.62)
          + ((index + seamIndex) % 3) * 0.035;
        const feather = this.add.image(
          featherX,
          featherY,
          ASSETS.props.worldTerrainFeathers.key,
          featherFrame,
        )
          .setScale(featherScale)
          .setAngle((vertical ? 0 : 90) + (((index + seamIndex) % 3) - 1) * 3.5)
          .setFlipX((index + seamIndex) % 2 === 1)
          .setAlpha(isCentralWorldSeam
            ? 0.24
            : seam.kind === 'castle-gate' ? 0.54 : 0.66)
          .setDepth(WORLD_FLOOR_DEPTH + 13)
          .setName(index === 0
            ? `terrain-feather-${seam.id}`
            : `terrain-feather-${seam.id}-${index}`);
        feather
          .setData('terrainSeam', seam.id)
          .setData('terrainSeamKind', seam.kind);
      }

      // Small alpha decals break up the last straight edge. Mobile keeps the
      // same road and feather geometry, reducing only this decorative count.
      const northernRiverFord = seam.kind === 'river-ford'
        && fromOrigin.x === REGION_ORIGINS.manchufrontier.x;
      const detailFrames = seam.kind === 'river-ford'
        ? northernRiverFord
          ? [4, 5, 2]
          : [3, 4, 2]
        : seamDetailFrames[seam.kind];
      const detailCount = usesAuthoredSeam || isJoseonTownSeam ? 0 : this.mobileProfile ? 3 : 6;
      for (let index = 0; index < detailCount; index += 1) {
        const across = 88 + ((index * 263 + seamIndex * 131) % Math.max(1, crossSize - 176));
        const offset = ((index * 71 + seamIndex * 43) % Math.max(1, size - 132)) - (size - 132) / 2;
        const detailX = vertical ? fromOrigin.x + across : boundary + offset;
        const detailY = vertical ? boundary + offset : fromOrigin.y + across;
        const detailScale = 0.38 + ((index * 5 + seamIndex) % 4) * 0.055;
        const detail = this.add.image(
          detailX,
          detailY,
          ASSETS.props.worldGroundDetails.key,
          detailFrames[(index + seamIndex) % detailFrames.length],
        )
          .setScale(detailScale)
          .setAngle((index * 47 + seamIndex * 23) % 58 - 29)
          .setFlipX((index + seamIndex) % 2 === 0)
          .setAlpha((isCentralWorldSeam ? 0.24 : 0.38) + (index % 3) * 0.06)
          .setDepth(WORLD_FLOOR_DEPTH + 14)
          .setName(`terrain-ground-detail-${seam.id}-${index}`);
        detail
          .setData('terrainSeam', seam.id)
          .setData('terrainSeamKind', seam.kind);
      }

      // Authored transition paintings already contain the final road surface.
      // Overlaying the generic atlas here created the bright, pasted-on strip
      // that made Settsu/Osaka and the Jurchen border look artificial.
      if (!usesAuthoredSeam) {
        const laneDelta = seam.toLane - seam.fromLane;
        const roadTilt = Phaser.Math.RadToDeg(Math.atan2(laneDelta, size));
        // Only about 58% of each square atlas frame is opaque road. Compensate
        // for that transparent shoulder so the visible route matches the shared
        // collision/passage width instead of narrowing at every map border.
        const roadAtlasDisplayWidth = seam.roadWidth * (isJoseonTownSeam ? 1.34 : 1.72);
        const roadDisplayLength = isJoseonTownSeam ? 220 : size + 160;
        const roadAlpha = isJoseonTownSeam
          ? 0.52
          : isCentralWorldSeam
            ? 0.72
            : seam.kind === 'castle-gate' || seam.kind === 'market-road' ? 0.96 : 0.9;
        const roadFrame = seam.id === 'settsuvillage-osaka'
          ? seamRoadFrame['river-ford']
          : seamRoadFrame[seam.kind];
        const road = this.add.image(
          vertical ? fromOrigin.x + laneMidpoint : boundary,
          vertical ? boundary : fromOrigin.y + laneMidpoint,
          ASSETS.props.worldSeamRoads.key,
          roadFrame,
        )
          .setDisplaySize(roadAtlasDisplayWidth, roadDisplayLength)
          .setAngle(vertical ? -roadTilt : 90 + roadTilt)
          .setFlipX(seamIndex % 2 === 1)
          .setAlpha(roadAlpha)
          .setDepth(WORLD_FLOOR_DEPTH + 15)
          .setName(`terrain-natural-road-${seam.id}`);
        road
          .setData('terrainSeam', seam.id)
          .setData('terrainSeamKind', seam.kind)
          .setData('roadWidth', seam.roadWidth)
          .setData('fromLane', seam.fromLane)
          .setData('toLane', seam.toLane);
      }
    });
  }

  private createAuthoredTerrainTransition(
    seam: WorldTerrainSeam,
    authoredSeam: { key: string; span: number },
  ): boolean {
    if (this.authoredTerrainSeamsCreated.has(seam.id)) return true;
    if (!this.textures.exists(authoredSeam.key)) return false;

    const fromOrigin = REGION_ORIGINS[seam.from];
    const toOrigin = REGION_ORIGINS[seam.to];
    const vertical = seam.orientation === 'vertical';
    const boundary = vertical
      ? Math.max(fromOrigin.y, toOrigin.y)
      : Math.max(fromOrigin.x, toOrigin.x);
    const crossSize = vertical ? MAP_WIDTH : MAP_HEIGHT;
    const seamCenterX = vertical ? fromOrigin.x + crossSize / 2 : boundary;
    const seamCenterY = vertical ? boundary : fromOrigin.y + crossSize / 2;

    this.children.getByName(`terrain-natural-road-${seam.id}`)?.destroy();
    const authoredTransition = this.add.image(
      seamCenterX,
      seamCenterY,
      authoredSeam.key,
    )
      .setDisplaySize(
        vertical ? MAP_WIDTH : authoredSeam.span,
        vertical ? authoredSeam.span : MAP_HEIGHT,
      )
      .setAngle(vertical ? 0 : 90)
      .setDepth(WORLD_FLOOR_DEPTH + 12)
      .setName(`terrain-authored-transition-${seam.id}`);
    authoredTransition
      .setData('terrainSeam', seam.id)
      .setData('terrainSeamKind', seam.kind)
      .setData('authoredTerrainTransition', true)
      .setData('roadWidth', seam.roadWidth)
      .setData('fromLane', seam.fromLane)
      .setData('toLane', seam.toLane);
    this.authoredTerrainSeamsCreated.add(seam.id);
    return true;
  }

  private createWorldTravelLandmarks(): void {
    for (const connection of WORLD_TRAVEL_CONNECTIONS) {
      for (const region of [connection.from, connection.to] as const) {
        const origin = REGION_ORIGINS[region];
        const otherRegion = region === connection.from ? connection.to : connection.from;
        const otherOrigin = REGION_ORIGINS[otherRegion];
        const edge: 'north' | 'south' = otherOrigin.y < origin.y ? 'north' : 'south';
        const direction = edge === 'north' ? 1 : -1;
        const edgeY = edge === 'north' ? 0 : MAP_HEIGHT;
        const graphics = this.add.graphics()
          .setPosition(origin.x, origin.y)
          .setDepth(WORLD_FLOOR_DEPTH + 16)
          .setName(`travel-dock-${connection.id}-${region}`);
        graphics.setData('travelConnection', connection.id);

        const inletPoints = edge === 'north'
          ? [
            { x: 380, y: 0 }, { x: 1156, y: 0 }, { x: 1090, y: 92 },
            { x: 1024, y: 148 }, { x: 896, y: 172 }, { x: 650, y: 164 },
            { x: 508, y: 140 }, { x: 430, y: 84 },
          ]
          : [
            { x: 380, y: MAP_HEIGHT }, { x: 1156, y: MAP_HEIGHT },
            { x: 1090, y: MAP_HEIGHT - 92 }, { x: 1024, y: MAP_HEIGHT - 148 },
            { x: 896, y: MAP_HEIGHT - 172 }, { x: 650, y: MAP_HEIGHT - 164 },
            { x: 508, y: MAP_HEIGHT - 140 }, { x: 430, y: MAP_HEIGHT - 84 },
          ];
        graphics.fillStyle(connection.waterColor, 0.76);
        graphics.fillPoints(inletPoints, true);
        const shoreY = origin.y + (edge === 'north' ? 90 : MAP_HEIGHT - 90);
        const flipY = edge === 'north';
        for (const [coastIndex, localX] of [460, 768, 1076].entries()) {
          const coast = this.add.image(
            origin.x + localX,
            shoreY,
            ASSETS.props.worldNaturalRoads.key,
            5,
          )
            .setDisplaySize(300, 410)
            .setAngle(edge === 'north' ? -90 : 90)
            .setFlipY(coastIndex === 1)
            .setAlpha(0.78)
            .setDepth(WORLD_FLOOR_DEPTH + 17)
            .setName(`travel-coast-${connection.id}-${region}-${coastIndex}`);
          coast.setData('travelConnection', connection.id);
        }

        for (const [sideIndex, localX] of [520, 1016].entries()) {
          const breakwater = this.add.image(
            origin.x + localX,
            origin.y + edgeY + direction * 112,
            ASSETS.props.worldTransitionProps.key,
            7,
          )
            .setScale(0.42)
            .setFlipX(sideIndex === 1)
            .setFlipY(flipY)
            .setDepth(WORLD_FLOOR_DEPTH + 18)
            .setName(`travel-breakwater-${connection.id}-${region}-${sideIndex}`);
          breakwater.setData('travelConnection', connection.id);
        }

        const pier = this.add.image(
          origin.x + MAP_WIDTH / 2,
          origin.y + edgeY + direction * 96,
          ASSETS.props.worldTransitionProps.key,
          6,
        )
          .setScale(0.54)
          .setFlipY(flipY)
          .setDepth(WORLD_FLOOR_DEPTH + 20)
          .setName(`travel-pier-${connection.id}-${region}`)
          .setInteractive({ useHandCursor: true });
        const pierTint = Phaser.Display.Color.ValueToColor(connection.dockColor).color;
        pier.setTint(pierTint);
        pier.setData('travelConnection', connection.id);
        pier.on('pointerover', () => pier.setTint(0xe6c58e));
        pier.on('pointerout', () => pier.setTint(pierTint));
        pier.on('pointerdown', (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          if (this.menuOpen || this.simulation.region !== region) return;
          this.simulation.moveTo({
            x: origin.x + MAP_WIDTH / 2,
            y: origin.y + (edge === 'north' ? 62 : MAP_HEIGHT - 44),
          });
          this.alertMarker(
            origin.x + MAP_WIDTH / 2,
            origin.y + edgeY + direction * 132,
            '선착장으로 이동 · 도착하면 자동 승선',
          );
        });

      }
    }
  }

  private createOpenFieldSeams(): void {
    // Terrain and roads at every walkable border are now rendered by
    // createWorldTerrainSeams(). Large translucent ellipse curtains still read
    // as geometric bubbles even when moved off the road, so the boundary layer
    // now keeps only sparse drifting motes over the authored raster terrain.
    const ambientFields = [
      { x: -MAP_WIDTH * 1.5, y: VILLAGE_TOP + 480, color: 0xd0bb94 },
      { x: -820, y: VILLAGE_TOP + 430, color: 0xc4ddd0 },
      { x: MAP_WIDTH + 820, y: VILLAGE_TOP + 500, color: 0xd6b68b },
      { x: 760, y: CENTRAL_WORLD_HEIGHT + 520, color: 0xc8d5ff },
    ];
    ambientFields.forEach((field, fieldIndex) => {
      const moteCount = this.mobileProfile ? 2 : 5;
      for (let index = 0; index < moteCount; index += 1) {
        const x = field.x - 310 + ((index * 113) % 620);
        const y = field.y - 230 + ((index * 79) % 460);
        const mote = this.add.circle(x, y, 1.3 + (index % 2), field.color, 0.28).setDepth(y + 40);
        this.tweens.add({
          targets: mote,
          x: x + (fieldIndex === 1 ? -22 : 28),
          y: y - 15,
          alpha: { from: 0.08, to: 0.48 },
          duration: 2100 + index * 170,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  private createVillageFarmstead(villageTop: number): void {
    for (const plot of VILLAGE_FARM_PLOTS) {
      const x = plot.x;
      const y = villageTop + plot.y;
      const sprite = this.add.sprite(
        x,
        y,
        ASSETS.props.villageFarmPlotStages.key,
        FARM_PLOT_FRAME_BY_STAGE[plot.initialStage],
      )
        .setOrigin(0.5, 0.84)
        .setScale(plot.width / 480)
        .setDepth(y - 5);
      const view: FarmPlotView = { id: plot.id, stage: plot.initialStage, sprite };
      this.farmPlots.set(plot.id, view);
      this.updateFarmPlotView(view);
    }

    for (const farmer of VILLAGE_FARMERS) {
      const mode: VillageNpcMode = farmer.appearance === 'male-ploughman'
        ? 'field-ploughman'
        : farmer.appearance === 'female-sower'
          ? 'female-farmer'
          : farmer.appearance === 'female-waterer'
            ? 'female-waterer'
            : 'commoner';
      this.createVillageNpc({
        id: farmer.id,
        x: farmer.points[0].x,
        y: villageTop + farmer.points[0].y,
        name: farmer.name,
        dialogue: farmer.dialogue,
        role: 'farmer',
        mode,
        tint: farmer.tint,
        scale: farmer.scale,
        speed: farmer.speed,
        patrol: farmer.points.map((point) => ({ x: point.x, y: villageTop + point.y })),
        farmWork: farmer.work,
        farmPlotId: farmer.plotId,
        facing: 0,
      });
    }
  }

  private updateFarmPlotView(plot: FarmPlotView): void {
    plot.sprite.setFrame(FARM_PLOT_FRAME_BY_STAGE[plot.stage]);
  }

  private finishFarmWork(npc: VillageNpcView): void {
    if (!npc.farmWork || !npc.farmPlotId) return;
    const plot = this.farmPlots.get(npc.farmPlotId);
    if (!plot) return;
    plot.stage = advanceFarmPlotStage(plot.stage, npc.farmWork);
    this.updateFarmPlotView(plot);
  }

  private createVillageNpc(config: {
    id: string;
    x: number;
    y: number;
    name: string;
    dialogue: string;
    mode: VillageNpcMode;
    tint: number;
    speed: number;
    patrol: Array<{ x: number; y: number }>;
    role?: VillageNpcRole;
    facing?: number;
    scale?: number;
    farmWork?: FarmWorkAction;
    farmPlotId?: string;
    service?: 'market' | 'forge' | 'inn';
    rallyStatus?: 'available' | 'locked' | 'completed';
  }): void {
    const { x, y, name, dialogue, mode, tint } = config;
    const role = config.role ?? 'patrol';
    const scale = config.scale ?? 0.48;
    const facing = config.facing ?? Math.PI / 2;
    const direction = directionToFrame(facing);
    const shadow = this.add.ellipse(0, 4, 54, 17, 0x080907, 0.38);
    const texture = villageNpcTexture(mode);
    const sprite = this.add.sprite(0, role === 'blacksmith' ? 6 : 0, texture, direction.row * 8)
      .setScale(scale, role === 'blacksmith' ? 0.41 : scale)
      .setOrigin(0.5, 0.97).setFlipX(direction.flip).setTint(tint);
    const children: Phaser.GameObjects.GameObject[] = [shadow];
    if (role === 'blacksmith') {
      const workstation = this.add.image(-43, -27, ASSETS.props.blacksmithWorkstation.key)
        .setDisplaySize(142, 142).setOrigin(0.5, 0.68);
      children.push(workstation);
    }
    let hammer: Phaser.GameObjects.Container | undefined;
    let forgeGlow: Phaser.GameObjects.Ellipse | undefined;
    if (role === 'blacksmith') {
      forgeGlow = this.add.ellipse(-43, -28, 76, 25, 0xf08b38, 0.08)
        .setBlendMode(Phaser.BlendModes.ADD);
      children.push(forgeGlow);
    }
    children.push(sprite);
    if (role === 'blacksmith') {
      const hammerImage = this.add.image(0, 0, ASSETS.props.blacksmithHammer.key)
        .setDisplaySize(72, 72).setOrigin(0.22, 0.76);
      hammer = this.add.container(-15, -56, [hammerImage]).setAngle(48);
      children.push(hammer);
    }
    const root = this.add.container(x, y, children).setDepth(y);
    const label = this.add.text(x, y - 91, name, {
      fontFamily: 'serif', fontSize: '12px', color: '#e8d7b6', stroke: '#1b120c', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(y + 2);
    const rallyMarker = config.rallyStatus
      ? this.add.text(
        x,
        y - 118,
        config.rallyStatus === 'completed'
          ? '✓ 의병 규합 완료'
          : config.rallyStatus === 'locked' ? '◇ 분조 명부 필요' : '◆ 의병 모집',
        {
          fontFamily: 'serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: config.rallyStatus === 'completed'
            ? '#8fcbb6'
            : config.rallyStatus === 'locked' ? '#a69b89' : '#f1cf77',
          backgroundColor: 'rgba(18,14,10,0.82)',
          padding: { x: 8, y: 4 },
          stroke: '#1b120c',
          strokeThickness: 3,
        },
      ).setOrigin(0.5).setDepth(y + 4)
      : undefined;
    const zone = this.add.zone(x, y - 38, 78, 108).setDepth(y + 3).setInteractive({ useHandCursor: true });
    zone.setData('villageNpc', name);
    const npc: VillageNpcView = {
      id: config.id, name, dialogue, role, mode, tint, scale, root, sprite, shadow, label, rallyMarker, hitZone: zone,
      patrol: config.patrol, patrolIndex: config.patrol.length > 1 ? 1 : 0, speed: config.speed,
      facing, pauseMs: role === 'blacksmith' ? 350 : 250 + (this.villageNpcs.length % 5) * 140,
      actionTimerMs: 0, farmWork: config.farmWork, farmPlotId: config.farmPlotId, hammer, forgeGlow,
      service: config.service,
    };
    this.villageNpcs.push(npc);
    zone.on('pointerover', () => sprite.setTint(0xd9c99f));
    zone.on('pointerout', () => sprite.setTint(tint));
    zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.isGameplayInputLocked()) return;
      this.interactWithVillageNpc(npc);
    });
  }

  private syncVillageNpcs(deltaMs: number): void {
    const visibleRegions = this.activeRenderRegions(this.simulation.region);
    for (const npc of this.villageNpcs) {
      const npcRegion = this.regionAtWorldPoint(npc.root.x, npc.root.y);
      const visible = npcRegion === null || visibleRegions.has(npcRegion);
      npc.root.setVisible(visible);
      npc.label.setVisible(visible);
      npc.rallyMarker?.setVisible(visible);
      const interactionEnabled = visible && this.gameMode !== 'travel';
      npc.hitZone.setVisible(interactionEnabled);
      if (npc.hitZone.input) npc.hitZone.input.enabled = interactionEnabled;
      if (!visible) continue;
      npc.pauseMs = Math.max(0, npc.pauseMs - deltaMs);
      if (npc.actionTimerMs > 0 && (npc.role === 'patrol'
        || npc.mode === 'oppressed' || npc.mode === 'japanese-civilian' || npc.mode === 'gwanghae')) {
        npc.actionTimerMs = Math.max(0, npc.actionTimerMs - deltaMs);
        const direction = directionToFrame(npc.facing);
        const animationKey = villageNpcInteractionAnimation(npc.mode, direction.row);
        if (npc.actionTimerMs === 0) {
          this.setVillageNpcIdle(npc);
        } else if (npc.sprite.anims.currentAnim?.key !== animationKey || !npc.sprite.anims.isPlaying) {
          npc.sprite.setTexture(villageNpcTexture(npc.mode)).setFlipX(direction.flip)
            .setPosition(0, 0).setScale(npc.scale).setOrigin(0.5, 0.97)
            .play(animationKey, true);
        }
        this.syncVillageNpcAttachments(npc);
        continue;
      }
      if (npc.role === 'blacksmith') {
        this.syncBlacksmith(npc, deltaMs);
        this.syncVillageNpcAttachments(npc);
        continue;
      }
      if (npc.role === 'farmer') {
        this.syncFarmer(npc, deltaMs);
        this.syncVillageNpcAttachments(npc);
        continue;
      }

      if (npc.pauseMs > 0 || npc.patrol.length < 2) {
        this.setVillageNpcIdle(npc);
        this.syncVillageNpcAttachments(npc);
        continue;
      }

      const target = npc.patrol[npc.patrolIndex];
      const dx = target.x - npc.root.x;
      const dy = target.y - npc.root.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 5) {
        npc.root.setPosition(target.x, target.y);
        npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrol.length;
        npc.pauseMs = 620 + npc.patrolIndex * 95;
        if (npc.mode === 'commoner' && npc.service === 'market') {
          npc.actionTimerMs = 900;
          const direction = directionToFrame(npc.facing);
          npc.sprite.setTexture(villageNpcTexture(npc.mode)).setFlipX(direction.flip)
            .setPosition(0, 0).setScale(npc.scale).setOrigin(0.5, 0.97)
            .play(villageNpcInteractionAnimation(npc.mode, direction.row), true);
        } else {
          this.setVillageNpcIdle(npc);
        }
        this.syncVillageNpcAttachments(npc);
        continue;
      }

      npc.facing = Math.atan2(dy, dx);
      const travel = Math.min(distance, npc.speed * (deltaMs / 1000));
      npc.root.x += (dx / distance) * travel;
      npc.root.y += (dy / distance) * travel;
      npc.root.setDepth(npc.root.y);
      const direction = directionToFrame(npc.facing);
      npc.sprite.setPosition(0, 0).setScale(npc.scale).setOrigin(0.5, 0.97)
        .setFlipX(direction.flip).play(`npc-walk-${npc.mode}-${direction.row}`, true);
      const frameOffset = Number(npc.sprite.frame.name) % 8;
      npc.shadow.setAlpha(frameOffset === 0 || frameOffset === 2 ? 0.38 : 0.31);
      this.syncVillageNpcAttachments(npc);
    }
  }

  private syncFarmer(npc: VillageNpcView, deltaMs: number): void {
    if (!npc.farmWork) {
      this.setVillageNpcIdle(npc);
      return;
    }
    if (npc.actionTimerMs > 0) {
      npc.actionTimerMs = Math.max(0, npc.actionTimerMs - deltaMs);
      const direction = directionToFrame(npc.facing);
      const animationKey = `npc-work-${npc.mode}-${direction.row}`;
      if (npc.sprite.anims.currentAnim?.key !== animationKey || !npc.sprite.anims.isPlaying) {
        npc.sprite.setTexture(villageNpcTexture(npc.mode)).setFlipX(direction.flip)
          .setPosition(0, 0).setScale(npc.scale).setOrigin(0.5, 0.97)
          .play(animationKey, true);
      }
      npc.shadow.setAlpha(0.34);
      if (npc.actionTimerMs === 0) {
        this.finishFarmWork(npc);
        npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrol.length;
        npc.pauseMs = 420;
        npc.label.setText(npc.name);
        this.setVillageNpcIdle(npc);
      }
      return;
    }
    if (npc.pauseMs > 0 || npc.patrol.length < 2) {
      this.setVillageNpcIdle(npc);
      return;
    }

    const target = npc.patrol[npc.patrolIndex];
    const dx = target.x - npc.root.x;
    const dy = target.y - npc.root.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 5) {
      npc.root.setPosition(target.x, target.y);
      npc.actionTimerMs = 2600 + (npc.id.length % 4) * 240;
      npc.label.setText(`${npc.name}\n${FARM_WORK_LABELS[npc.farmWork]} 중`);
      return;
    }

    npc.facing = Math.atan2(dy, dx);
    const travel = Math.min(distance, npc.speed * (deltaMs / 1000));
    npc.root.x += (dx / distance) * travel;
    npc.root.y += (dy / distance) * travel;
    npc.root.setDepth(npc.root.y);
    const direction = directionToFrame(npc.facing);
    npc.sprite.setTexture(villageNpcTexture(npc.mode)).setPosition(0, 0).setScale(npc.scale)
      .setOrigin(0.5, 0.97).setFlipX(direction.flip)
      .play(`npc-walk-${npc.mode}-${direction.row}`, true);
    const frameOffset = Number(npc.sprite.frame.name) % 8;
    npc.shadow.setAlpha(frameOffset === 0 || frameOffset === 2 ? 0.38 : 0.31);
  }

  private syncBlacksmith(npc: VillageNpcView, deltaMs: number): void {
    npc.actionTimerMs -= deltaMs;
    if (npc.pauseMs > 0) {
      if (npc.hammer) {
        this.tweens.killTweensOf(npc.hammer);
        npc.hammer.setAngle(48);
      }
      this.setVillageNpcIdle(npc);
      return;
    }
    if (npc.actionTimerMs > 0) {
      if (!npc.sprite.anims.isPlaying && npc.actionTimerMs < 620) this.setVillageNpcIdle(npc);
      return;
    }

    npc.actionTimerMs = 1650;
    npc.facing = Math.PI;
    npc.sprite.stop().setTexture(ASSETS.villageCommoner.key, 2 * 8).setPosition(3, 5)
      .setScale(0.46, 0.42).setOrigin(0.5, 0.97).setFlipX(false);
    if (npc.hammer) {
      this.tweens.killTweensOf(npc.hammer);
      this.tweens.killTweensOf(npc.sprite);
      npc.hammer.setAngle(48);
      this.tweens.add({
        targets: npc.hammer,
        angle: -46,
        duration: 280,
        ease: 'Sine.easeOut',
        onStart: () => {
          this.tweens.add({ targets: npc.sprite, x: 8, y: 2, angle: -2, duration: 250, ease: 'Sine.easeOut' });
        },
        onComplete: () => {
          this.tweens.add({
            targets: npc.hammer,
            angle: 34,
            duration: 115,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              this.createForgeSparks(npc.root.x - 43, npc.root.y - 28);
              if (npc.forgeGlow) {
                npc.forgeGlow.setAlpha(0.72).setScale(0.8);
                this.tweens.add({ targets: npc.forgeGlow, alpha: 0.08, scaleX: 1.45, scaleY: 1.3, duration: 320 });
              }
              this.tweens.add({ targets: npc.sprite, x: 4, y: 7, angle: 2, duration: 90, yoyo: true });
              this.tweens.add({ targets: npc.hammer, angle: 48, duration: 260, delay: 110, ease: 'Sine.easeOut' });
            },
          });
        },
      });
    }
  }

  private setVillageNpcIdle(npc: VillageNpcView): void {
    const direction = directionToFrame(npc.facing);
    const texture = villageNpcTexture(npc.mode);
    npc.sprite.stop().setTexture(texture, direction.row * 8).setFlipX(direction.flip).setOrigin(0.5, 0.97)
      .setPosition(npc.role === 'blacksmith' ? 8 : 0, npc.role === 'blacksmith' ? 6 : 0)
      .setScale(npc.scale, npc.role === 'blacksmith' ? 0.41 : npc.scale);
    npc.shadow.setAlpha(0.38);
  }

  private syncVillageNpcAttachments(npc: VillageNpcView): void {
    npc.label.setPosition(npc.root.x, npc.root.y - 91).setDepth(npc.root.y + 2);
    npc.rallyMarker?.setPosition(npc.root.x, npc.root.y - 118).setDepth(npc.root.y + 4);
    npc.hitZone.setPosition(npc.root.x, npc.root.y - 38).setDepth(npc.root.y + 3);
  }

  private interactWithVillageNpc(npc: VillageNpcView): void {
    npc.pauseMs = 2700;
    npc.facing = Math.atan2(this.simulation.player.y - npc.root.y, this.simulation.player.x - npc.root.x);
    if (npc.role === 'farmer') {
      npc.actionTimerMs = 0;
      npc.label.setText(npc.name);
    }
    if (npc.hammer) {
      this.tweens.killTweensOf(npc.hammer);
      npc.hammer.setAngle(48);
    }
    this.setVillageNpcIdle(npc);
    if (npc.mode === 'oppressed') {
      const direction = directionToFrame(npc.facing);
      npc.actionTimerMs = 900;
      npc.sprite.setTexture(ASSETS.ulleungOppressedVillager.key).setFlipX(direction.flip)
        .play(`npc-attack-oppressed-${direction.row}`, true);
    } else if (npc.mode === 'japanese-civilian') {
      const direction = directionToFrame(npc.facing);
      npc.actionTimerMs = 900;
      npc.sprite.setTexture(ASSETS.japaneseCivilianWoman.key).setFlipX(direction.flip)
        .play(`npc-interact-japanese-civilian-${direction.row}`, true);
    } else if (npc.mode === 'gwanghae') {
      const direction = directionToFrame(npc.facing);
      npc.actionTimerMs = 900;
      npc.sprite.setTexture(ASSETS.gwanghaePrince.key).setFlipX(direction.flip)
        .play(`npc-audience-gwanghae-${direction.row}`, true);
    } else if (npc.role === 'patrol') {
      const direction = directionToFrame(npc.facing);
      npc.actionTimerMs = 900;
      npc.sprite.setTexture(villageNpcTexture(npc.mode)).setFlipX(direction.flip)
        .play(villageNpcInteractionAnimation(npc.mode, direction.row), true);
    }
    const rallyContact = this.simulation.isGwanghaePrince() && isGwanghaeMilitiaRallyNpc(npc.id);
    let interactionDialogue = npc.dialogue;
    if (rallyContact) {
      const result = this.simulation.rallyGwanghaeMilitia(npc.id);
      if (result.ok) {
        interactionDialogue = `${result.point.message} 현재 분조 예비병 ${result.progress.reserve}명 · ${result.progress.completed}/${result.progress.total}곳 규합.`;
        npc.rallyMarker?.setText('✓ 의병 규합 완료').setColor('#8fcbb6');
      } else {
        interactionDialogue = result.reason === 'prerequisite'
          ? '먼저 창덕궁 승정원 주서에게 분조 의병 명부를 받아야 합니다.'
          : result.reason === 'already-rallied'
            ? `이미 이 고을의 의병은 분조에 합류했습니다. 현재 ${result.progress.completed}/${result.progress.total}곳 규합.`
            : result.reason === 'wrong-region' && result.expectedRegion
              ? `${REGIONS[result.expectedRegion].name}의 모집 책임자를 직접 만나야 합니다.`
              : npc.dialogue;
      }
    }
    this.showNpcDialogue(npc.root.x, npc.root.y - 116, npc.name, interactionDialogue);
    const service = npc.service ?? (npc.id === 'merchant'
      || npc.id === 'ulleung-healer'
      || npc.id === 'japan-osaka-fishmonger'
      || npc.id === 'japan-castle-merchant'
      || npc.id === 'japan-castle-rice-seller'
      ? 'market'
      : npc.id === 'blacksmith' || npc.id === 'japan-blacksmith'
        ? 'forge'
        : npc.id === 'innkeeper'
          ? 'inn'
          : null);
    if (service && !rallyContact) this.time.delayedCall(260, () => this.hud.openVillageService(service));
  }

  private createForgeSparks(x: number, y: number): void {
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI * (0.15 + index * 0.17);
      const spark = this.add.circle(x, y, index === 0 ? 2.4 : 1.5, index % 2 === 0 ? 0xffd36a : 0xf07b35, 0.95)
        .setDepth(y + 35);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * (24 + index * 5),
        y: y + Math.sin(angle) * (18 + index * 4),
        alpha: 0,
        scale: 0.35,
        duration: 260 + index * 35,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private showNpcDialogue(x: number, y: number, name: string, dialogue: string): void {
    const bubble = this.add.text(x, y, `${name}\n${dialogue}`, {
      fontFamily: 'serif', fontSize: '13px', color: '#eadfc7', align: 'center',
      backgroundColor: 'rgba(25,18,13,0.92)', padding: { x: 13, y: 9 },
      stroke: '#2c1a10', strokeThickness: 3, wordWrap: { width: 260 },
    }).setOrigin(0.5, 1).setDepth(2400);
    const readingDelay = Phaser.Math.Clamp(1500 + dialogue.length * 52, 2800, 6800);
    this.tweens.add({
      targets: bubble, y: y - 8, alpha: 0, delay: readingDelay, duration: 450,
      ease: 'Sine.easeIn', onComplete: () => bubble.destroy(),
    });
  }

  private createWaterFlow(): void {
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff, 1).beginPath()
      .moveTo(0, 0).lineTo(640, 0).lineTo(600, 76).lineTo(550, 130)
      .lineTo(490, 183).lineTo(420, 230).lineTo(340, 282).lineTo(270, 326)
      .lineTo(0, 380).closePath().fillPath();
    const waterMask = maskShape.createGeometryMask();

    for (let index = 0; index < 16; index += 1) {
      const x = 42 + ((index * 97) % 500);
      const y = 42 + ((index * 61) % 250);
      const ripple = this.add.graphics({ x, y }).setDepth(90 + index).setMask(waterMask);
      ripple.lineStyle(index % 4 === 0 ? 2 : 1, index % 3 === 0 ? 0xc7d2c4 : 0x8fa8a0, 0.2 + (index % 3) * 0.055);
      ripple.strokeEllipse(0, 0, 48 + (index % 5) * 17, 7 + (index % 3) * 3);
      ripple.setRotation(-0.18 + (index % 4) * 0.025);
      this.tweens.add({
        targets: ripple,
        x: x + 32 + (index % 4) * 7,
        y: y + 7,
        alpha: { from: 0.28, to: 0.78 },
        duration: 1750 + index * 105,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const shore = [
      { x: 520, y: 154 }, { x: 478, y: 190 }, { x: 430, y: 222 },
      { x: 376, y: 255 }, { x: 320, y: 290 }, { x: 258, y: 322 },
    ];
    shore.forEach((point, index) => {
      const foam = this.add.ellipse(point.x, point.y, 18 + (index % 3) * 7, 4, 0xd9ddd0, 0.16)
        .setDepth(112 + index).setRotation(-0.42);
      this.tweens.add({
        targets: foam,
        x: point.x + 14,
        y: point.y + 5,
        scaleX: { from: 0.65, to: 1.35 },
        alpha: { from: 0.05, to: 0.32 },
        duration: 1450 + index * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createIslandOceanMotion(): void {
    const islandRegions: RegionId[] = [...ULLEUNG_REGION_IDS];
    islandRegions.forEach((regionId, regionIndex) => {
      const origin = REGION_ORIGINS[regionId];
      const maskShape = this.make.graphics({ x: 0, y: 0 });
      maskShape.fillStyle(0xffffff, 1).fillRect(origin.x + 1320, origin.y, 216, MAP_HEIGHT);
      const oceanMask = maskShape.createGeometryMask();

      for (let index = 0; index < (this.mobileProfile ? 3 : 6); index += 1) {
        const x = origin.x + 1360 + (index % 3) * 52;
        const y = origin.y + 138 + ((index * 137 + regionIndex * 83) % 720);
        const wave = this.add.graphics({ x, y })
          .setDepth(ISLAND_BACKGROUND_DEPTH + 18 + index)
          .setMask(oceanMask)
          .setBlendMode(Phaser.BlendModes.SCREEN);
        wave.lineStyle(index % 3 === 0 ? 2 : 1, index % 2 === 0 ? 0xbccfc9 : 0x829e9d, 0.2 + index * 0.018);
        wave.strokeEllipse(0, 0, 72 + index * 12, 9 + (index % 2) * 3);
        wave.lineStyle(1, 0xd9ded3, 0.12).strokeEllipse(-26, 7, 38 + index * 5, 5);
        wave.setRotation(-0.16 + (index % 3) * 0.035);
        this.tweens.add({
          targets: wave,
          x: x + 56 + (index % 2) * 18,
          y: y + 5,
          scaleX: { from: 0.72, to: 1.18 },
          alpha: { from: 0.16, to: 0.68 },
          duration: 2100 + index * 230 + regionIndex * 90,
          delay: index * 170,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      for (let index = 0; index < (this.mobileProfile ? 1 : 3); index += 1) {
        const x = origin.x + 1394 + index * 38;
        const y = origin.y + 250 + ((index * 231 + regionIndex * 97) % 520);
        const reflection = this.add.ellipse(x, y, 92 + index * 26, 8, 0xdce1ce, 0.08)
          .setDepth(ISLAND_BACKGROUND_DEPTH + 30 + index)
          .setMask(oceanMask)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setRotation(-0.18);
        this.tweens.add({
          targets: reflection,
          x: x + 34,
          scaleX: { from: 0.55, to: 1.28 },
          alpha: { from: 0.025, to: 0.16 },
          duration: 3200 + index * 620 + regionIndex * 120,
          delay: 440 + index * 510,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  private createIslandTreeMotion(): void {
    const islandRegions: RegionId[] = [...ULLEUNG_REGION_IDS];
    const speciesByRegion: Partial<Record<RegionId, readonly TreeSpecies[]>> = {
      ulleungcoast: ['wind-red-pine', 'coastal-black-pine'],
      ulleungmeadow: ['wind-red-pine', 'zelkova'],
      ulleunghunt: ['zelkova', 'autumn-maple'],
      ulleungridge: ['dead-pine', 'wind-red-pine'],
      ulleungdo: ['coastal-black-pine', 'dead-pine'],
      ulleungvillage: ['zelkova', 'willow'],
    };
    islandRegions.forEach((regionId, regionIndex) => {
      const origin = REGION_ORIGINS[regionId];
      ULLEUNG_EDGE_TREE_SITES.forEach((config, treeIndex) => {
        const species = speciesByRegion[regionId] ?? ['wind-red-pine'];
        const shadow = this.add.ellipse(0, 2, 112, 25, 0x11140f, 0.22);
        const treeImage = this.add.image(
          0,
          0,
          ASSETS.props.joseonTreeSpecies.key,
          treeSpeciesFrame(species[treeIndex % species.length]),
        )
          .setOrigin(0.5, 0.978)
          .setDisplaySize(184, 246)
          .setFlipX(config.direction < 0);
        const crown = this.add.container(0, 0, [shadow, treeImage]);
        const root = this.add.container(origin.x + config.x, origin.y + config.y, [crown])
          .setDepth(origin.y + config.y - 4)
          .setScale(config.scale);
        root.setData('treeSpecies', species[treeIndex % species.length]);
        const phase = regionIndex * 190 + treeIndex * 270;
        // Mobile still renders every solid tree so visual and simulation
        // footprints cannot diverge, but only the first pair owns tweens.
        if (this.mobileProfile && treeIndex >= 2) return;
        this.tweens.add({
          targets: root,
          angle: { from: -0.18 * config.direction, to: 0.28 * config.direction },
          duration: 3100 + phase,
          delay: phase,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: crown,
          angle: { from: 0, to: 0.38 * config.direction },
          scaleY: { from: 1, to: 0.988 },
          duration: 520 + treeIndex * 45,
          delay: 1700 + regionIndex * 420 + treeIndex * 610,
          repeatDelay: 4200 + regionIndex * 370 + treeIndex * 290,
          yoyo: true,
          repeat: -1,
          ease: 'Cubic.easeInOut',
        });
      });
    });
  }

  private createSwayingCanopies(): void {
    const canopies = [
      { x: 178, y: 172, depth: 178, scale: 1.18, direction: -1, species: 'wind-red-pine' },
      { x: 405, y: 108, depth: 114, scale: 0.92, direction: 1, species: 'zelkova' },
      { x: 1322, y: 172, depth: 178, scale: 1.1, direction: 1, species: 'coastal-black-pine' },
      { x: 1360, y: 508, depth: 516, scale: 1.16, direction: -1, species: 'autumn-maple' },
      { x: 1265, y: 708, depth: 716, scale: 1.22, direction: 1, species: 'zelkova' },
      { x: 184, y: 558, depth: 566, scale: 1.16, direction: -1, species: 'wind-red-pine' },
    ] as const;
    canopies.forEach((config, index) => {
      const shadow = this.add.ellipse(0, 2, 110, 24, 0x11140f, 0.2);
      const crown = this.add.image(
        0,
        0,
        ASSETS.props.joseonTreeSpecies.key,
        treeSpeciesFrame(config.species),
      )
        .setOrigin(0.5, 0.978)
        .setDisplaySize(176, 235)
        .setFlipX(config.direction < 0);
      const root = this.add.container(config.x, config.y, [shadow, crown])
        .setDepth(config.depth)
        .setScale(config.scale)
        .setData('treeSpecies', config.species);
      this.tweens.add({
        targets: root,
        angle: { from: -0.2 * config.direction, to: 0.36 * config.direction },
        duration: 2700 + index * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createWindField(): void {
    for (let index = 0; index < 8; index += 1) {
      const x = 270 + ((index * 173) % 960);
      const y = 300 + ((index * 109) % 470);
      const wind = this.add.graphics({ x, y }).setDepth(1200 + index).setAlpha(0.18);
      wind.lineStyle(1, 0xd5d7c4, 0.28).beginPath().moveTo(-22, 0).lineTo(9, -3).lineTo(25, -1).strokePath();
      this.tweens.add({
        targets: wind,
        x: x + 72 + (index % 3) * 18,
        y: y - 9,
        alpha: { from: 0.03, to: 0.25 },
        duration: 3600 + index * 330,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const leaf = this.add.ellipse(x - 12, y + 8, 7, 3, index % 2 === 0 ? 0x7f6d47 : 0x53613f, 0.55)
        .setDepth(1201 + index).setRotation(index * 0.7);
      this.tweens.add({
        targets: leaf,
        x: x + 54 + (index % 4) * 17,
        y: y + 13,
        angle: 220 + index * 31,
        alpha: { from: 0.18, to: 0.64 },
        duration: 4200 + index * 290,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createMonsterViews(): void {
    for (const monster of this.simulation.monsters) {
      if (monster.region === this.simulation.region) this.createMonsterView(monster);
    }
  }

  private createFollowerView(follower: FollowerState): FollowerView {
    const existing = this.followerViews.get(follower.id);
    if (existing) return existing;
    const baseScale = MONSTER_SCALE[follower.visualKind] * 0.96;
    const shadow = this.add.ellipse(0, 5, 58, 19, 0x080a07, 0.38);
    const ring = this.add.ellipse(0, 4, 70, 25, 0x3c6c43, 0.12)
      .setStrokeStyle(2, followerAccent(follower), 0.72);
    const sprite = this.add.sprite(0, 0, ASSETS.monsters[follower.visualKind].key, 0)
      .setOrigin(0.5, 0.97)
      .setScale(baseScale)
      .setTint(followerTint(follower));
    const name = this.add.text(0, -101, follower.name, {
      fontFamily: '"Noto Serif KR", serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: follower.route === 'bunjo' || follower.route === 'invasion'
        ? '#d9e7ef'
        : follower.kind === 'special-warrior' ? '#e3c8ff' : '#d6e2b9',
      stroke: '#10120d',
      strokeThickness: 4,
    }).setOrigin(0.5, 1);
    const root = this.add.container(follower.x, follower.y, [shadow, ring, sprite, name]).setDepth(follower.y + 2);
    const view = { root, sprite, shadow, ring, name, baseScale };
    this.followerViews.set(follower.id, view);
    return view;
  }

  private syncFollowers(): void {
    const activeIds = new Set(this.simulation.followers.map((follower) => follower.id));
    for (const [id, view] of this.followerViews) {
      if (activeIds.has(id)) continue;
      view.root.destroy(true);
      this.followerViews.delete(id);
    }
    for (const follower of this.simulation.followers) {
      const view = this.followerViews.get(follower.id) ?? this.createFollowerView(follower);
      const direction = directionToFrame(follower.facing);
      const speed = Math.hypot(follower.velocity.x, follower.velocity.y);
      const attacking = view.sprite.anims.isPlaying
        && view.sprite.anims.currentAnim?.key.startsWith(`monster-attack-${follower.visualKind}-`);
      view.root.setPosition(follower.x, follower.y).setDepth(follower.y + 2).setVisible(true);
      view.sprite.setFlipX(direction.flip);
      if (!attacking) {
        view.sprite.setPosition(0, 0).setRotation(0).setScale(view.baseScale)
          .setTint(followerTint(follower));
        if (speed > 5) {
          view.sprite.anims.timeScale = Phaser.Math.Clamp(0.78 + speed / 210, 0.82, 1.2);
          view.sprite.play(`monster-walk-${follower.visualKind}-${direction.row}`, true);
          view.shadow.setScale(1.06, 1).setAlpha(0.34);
        } else {
          view.sprite.stop().setTexture(ASSETS.monsters[follower.visualKind].key, direction.row * 8);
          view.shadow.setScale(1, 1).setAlpha(0.38);
        }
      }
    }
  }

  private createMonsterView(monster: MonsterState): MonsterView {
    const existing = this.monsterViews.get(monster.id);
    if (existing) return existing;
    const friendly = this.simulation.isFriendlyMonster(monster);
    const campaignBoss = monster.kind === 'japanese-shogun';
    const direction = directionToFrame(monster.facing);
    const shadow = this.add.ellipse(0, 4, isLowQuadrupedMonster(monster.kind) ? 78 : 62, isLowQuadrupedMonster(monster.kind) ? 24 : 20, 0x090907, 0.4);
    const ring = this.add.ellipse(0, 3, campaignBoss ? 104 : 82, campaignBoss ? 36 : 30, friendly ? 0x244a46 : 0x160c08, friendly ? 0.18 : 0.14)
      .setStrokeStyle(campaignBoss ? 3 : 2, friendly ? 0x75c5b5 : campaignBoss ? 0xdb6c42 : 0xc74537, friendly ? 0.44 : campaignBoss ? 0.76 : 0);
    const baseScale = monsterScaleForRegion(
      monster.kind,
      monster.region,
      direction.row,
      MONSTER_SCALE[monster.kind],
    );
    const sprite = this.add.sprite(0, 0, ASSETS.monsters[monster.kind].key, 0)
      .setScale(baseScale)
      .setOrigin(0.5, 0.97)
      .setTint(MONSTER_TINT[monster.kind] ?? 0xffffff);
    const intentCue = this.add.graphics().setVisible(false);
    const roleLabel = monster.kind === 'joseon-prince' || monster.kind === 'manchu-chieftain' || campaignBoss
      ? this.add.text(
        0,
        campaignBoss ? -145 : monster.kind === 'manchu-chieftain' ? -132 : -116,
        campaignBoss
          ? '征夷大將軍 · 아시카가 카게노부'
          : monster.kind === 'manchu-chieftain' ? '大族長 · 아이신고로 바투르' : '王子 · 왕자 이환',
        {
        fontFamily: '"Noto Serif KR", serif',
        fontSize: campaignBoss ? '14px' : '13px',
        fontStyle: 'bold',
        color: campaignBoss ? '#ffd18b' : monster.kind === 'manchu-chieftain' ? '#f1d49b' : '#ffe7a6',
        backgroundColor: campaignBoss ? 'rgba(70,17,13,0.9)' : 'rgba(35,18,12,0.82)',
        padding: { x: campaignBoss ? 13 : 9, y: campaignBoss ? 6 : 4 },
        stroke: '#241008',
        strokeThickness: 4,
        },
      ).setOrigin(0.5, 1)
      : undefined;
    const root = this.add.container(monster.x, monster.y, roleLabel
      ? [shadow, ring, sprite, intentCue, roleLabel]
      : [shadow, ring, sprite, intentCue]).setDepth(monster.y);
    const hitZone = this.add.zone(monster.x, monster.y - 42, isLowQuadrupedMonster(monster.kind) ? 112 : 86, isLowQuadrupedMonster(monster.kind) ? 82 : 112)
      .setDepth(monster.y + 1).setInteractive({ cursor: friendly ? 'default' : COMBAT_CURSOR });
    hitZone.setData('monsterId', monster.id);
    hitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.isGameplayInputLocked()) return;
      this.simulation.selectMonster(monster.id);
    });
    hitZone.on('pointerover', () => ring.setStrokeStyle(2, friendly ? 0x9ce4d6 : 0xe1c180, 0.8));
    hitZone.on('pointerout', () => ring.setStrokeStyle(
      campaignBoss ? 3 : 2,
      friendly ? 0x75c5b5 : campaignBoss ? 0xdb6c42 : 0xc74537,
      friendly ? 0.44 : campaignBoss ? 0.76 : 0,
    ));
    const hp = this.add.graphics().setDepth(monster.y + 2);
    const view = {
      root,
      sprite,
      shadow,
      ring,
      intentCue,
      hp,
      hitZone,
      roleLabel,
      baseScale,
      lastDustAt: 0,
      lastAiState: null,
      lastIntentCue: 'none' as const,
      hitFlashUntil: 0,
    };
    this.monsterViews.set(monster.id, view);
    return view;
  }

  private releaseInactiveMonsterViews(activeRegion: RegionId): void {
    for (const [monsterId, view] of this.monsterViews) {
      const monster = this.simulation.monsters.find((entry) => entry.id === monsterId);
      if (monster?.region === activeRegion) continue;
      this.tweens.killTweensOf(view.root);
      this.tweens.killTweensOf(view.sprite);
      view.root.destroy(true);
      view.hitZone.destroy();
      view.hp.destroy();
      this.monsterViews.delete(monsterId);
    }
  }

  private syncOnlinePlayers(delta: number): void {
    if (this.gameMode === 'pvp') {
      if (!this.pvpService || !this.pvpRoomId) return;
      this.pvpPublishAccumulator += delta;
      if (this.pvpPublishAccumulator >= 100) {
        this.pvpPublishAccumulator = 0;
        const player = this.simulation.player;
        this.pvpService.publishPosition(
          this.pvpRoomId,
          this.pvpSelfUid,
          player.x, player.y, player.facing,
          Boolean(player.destination || player.lootTargetId || player.targetId),
        );
      }
      // Interpolate opponent view
      if (this.pvpOpponentView) {
        const smoothing = 1 - Math.exp(-11 * (delta / 1000));
        const view = this.pvpOpponentView;
        view.root.x += (view.targetX - view.root.x) * smoothing;
        view.root.y += (view.targetY - view.root.y) * smoothing;
        view.root.setDepth(view.root.y + 9);
        const direction = directionToFrame(view.facing);
        view.sprite.setFlipX(direction.flip);
        if (view.moving) view.sprite.play(`player-walk-unequipped-${direction.row}`, true);
        else view.sprite.stop().setFrame(frameForPlayerLayer(direction.row, 0));
      }
      return;
    }

    if (!this.onlineClient) return;


    // Open-world online mode
    this.onlinePublishAccumulator += delta;
    if (this.onlinePublishAccumulator >= 100) {
      this.onlinePublishAccumulator = 0;
      const player = this.simulation.player;
      this.onlineClient.publish({
        x: player.x,
        y: player.y,
        facing: player.facing,
        moving: Boolean(player.destination || player.lootTargetId || player.targetId),
        region: this.simulation.region,
      });
    }

    const activeIds = new Set(this.onlineRoster.map((player) => player.id));
    for (const [id, view] of this.remotePlayerViews) {
      if (activeIds.has(id)) continue;
      view.root.destroy(true);
      this.remotePlayerViews.delete(id);
    }

    const smoothing = 1 - Math.exp(-11 * (delta / 1000));
    for (const remote of this.onlineRoster) {
      let view = this.remotePlayerViews.get(remote.id);
      if (!view) {
        const shadow = this.add.ellipse(0, 5, 58, 18, 0x080807, 0.42);
        const sprite = this.add.sprite(0, 0, ASSETS.playerUnequipped.key, 16)
          .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97).setTint(0xd5ddd5);
        const name = this.add.text(0, -126, remote.name, {
          fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#c7e0bc',
          stroke: '#101610', strokeThickness: 4,
        }).setOrigin(0.5);
        const root = this.add.container(remote.x, remote.y, [shadow, sprite, name]).setDepth(remote.y + 9);
        view = { root, sprite, name, targetX: remote.x, targetY: remote.y, facing: remote.facing, moving: remote.moving };
        this.remotePlayerViews.set(remote.id, view);
      }

      view.targetX = remote.x;
      view.targetY = remote.y;
      view.facing = remote.facing;
      view.moving = remote.moving;
      view.name.setText(remote.name);
      view.root.x += (view.targetX - view.root.x) * smoothing;
      view.root.y += (view.targetY - view.root.y) * smoothing;
      view.root.setDepth(view.root.y + 9);
      const direction = directionToFrame(view.facing);
      view.sprite.setFlipX(direction.flip);
      if (view.moving) view.sprite.play(`player-walk-unequipped-${direction.row}`, true);
      else view.sprite.stop().setFrame(frameForPlayerLayer(direction.row, 0));
    }
  }


  private updateOnlineStatus(status: 'connecting' | 'connected' | 'reconnecting' | 'offline', count: number): void {
    const badge = document.querySelector<HTMLElement>('#online-presence');
    if (!badge) return;
    badge.hidden = status === 'offline';
    badge.classList.toggle('is-connected', status === 'connected');
    badge.classList.toggle('is-reconnecting', status === 'reconnecting');
    const label = badge.querySelector<HTMLElement>('span');
    if (!label) return;
    if (status === 'connected') label.textContent = `울릉도 온라인 · ${count}명 접속`;
    else if (status === 'reconnecting') label.textContent = '연결 복구 중';
    else label.textContent = '온라인 서버 연결 중';
  }

  private currentPlayerMovementVisual(row: number): {
    textureKey: string;
    animationKey: string;
    idleFrame: number;
  } {
    if (this.simulation.isGwanghaePrince()) {
      return {
        textureKey: ASSETS.gwanghaePrince.key,
        animationKey: `player-gwanghae-walk-${row}`,
        idleFrame: row * 8,
      };
    }
    if (this.simulation.isOsakaMudang()) {
      return {
        textureKey: ASSETS.osakaMudang.key,
        animationKey: `player-mudang-walk-${row}`,
        idleFrame: row * 8,
      };
    }
    if (this.simulation.isFrontierArcher()) {
      return this.simulation.isBowEquipped()
        ? {
          textureKey: ASSETS.frontierArcher.key,
          animationKey: `player-frontier-walk-${row}`,
          idleFrame: row * 8,
        }
        : {
          textureKey: ASSETS.frontierMelee.key,
          animationKey: `player-frontier-melee-walk-${row}`,
          idleFrame: row * 8,
        };
    }
    const layers = resolvePlayerLayers(this.simulation.equipment, this.simulation.inventory);
    return resolvePlayerMovementVisual(layers.weapon, row);
  }

  private currentPlayerAttackVisual(style: 'fist' | 'weapon', row: number): {
    textureKey: string;
    animationKey: string;
  } {
    if (this.simulation.isGwanghaePrince()) {
      return {
        textureKey: ASSETS.gwanghaePrince.key,
        animationKey: `player-gwanghae-attack-${row}`,
      };
    }
    if (this.simulation.isOsakaMudang()) {
      return {
        textureKey: ASSETS.osakaMudang.key,
        animationKey: `player-mudang-attack-${row}`,
      };
    }
    if (this.simulation.isFrontierArcher()) {
      return this.simulation.isBowEquipped()
        ? {
          textureKey: ASSETS.frontierArcher.key,
          animationKey: `player-frontier-attack-${row}`,
        }
        : {
          textureKey: ASSETS.frontierMelee.key,
          animationKey: `player-frontier-melee-attack-${row}`,
        };
    }
    return resolvePlayerAttackVisual(style, row);
  }

  private createTravelGhostVisual(): void {
    if (this.travelGhostAura || this.travelGhostCore) return;
    this.travelGhostAura = this.add.ellipse(0, -36, 82, 116, 0x79e7ff, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.travelGhostCore = this.add.ellipse(0, -34, 46, 88, 0xd5f9ff, 0.16)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.playerRoot.addAt(this.travelGhostAura, 1);
    this.playerRoot.addAt(this.travelGhostCore, 2);
    this.tweens.add({
      targets: this.travelGhostAura,
      alpha: { from: 0.16, to: 0.34 },
      scaleX: { from: 0.9, to: 1.12 },
      scaleY: { from: 0.96, to: 1.08 },
      yoyo: true,
      repeat: -1,
      duration: 920,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.travelGhostCore,
      alpha: { from: 0.1, to: 0.24 },
      y: { from: -30, to: -40 },
      yoyo: true,
      repeat: -1,
      duration: 1180,
      ease: 'Sine.easeInOut',
    });
  }

  private applyTravelGhostVisual(): void {
    const enabled = this.gameMode === 'travel';
    this.travelGhostAura?.setVisible(enabled);
    this.travelGhostCore?.setVisible(enabled);
    if (!enabled) {
      this.playerRoot.setAlpha(1);
      this.playerSprite.setAlpha(1);
      this.playerShadow.setVisible(true);
      return;
    }
    this.playerRoot.setAlpha(0.8);
    this.playerSprite.setAlpha(0.68).setTintFill(0xa8efff);
    this.playerShadow.setVisible(false);
  }

  private syncPlayer(delta = 0): void {
    const player = this.simulation.player;
    const movementX = player.x - this.lastPlayerSimulationPosition.x;
    const movementY = player.y - this.lastPlayerSimulationPosition.y;
    const visualMovement = resolvePlayerVisualMovement(
      movementX,
      movementY,
      player.facing,
      Boolean(this.skillWorldMotion),
    );
    const movedDistance = visualMovement.distance;
    this.lastPlayerSimulationPosition = { x: player.x, y: player.y };
    let renderX = player.x;
    let renderY = player.y;
    if (this.skillWorldMotion) {
      this.skillWorldMotion.elapsedMs = Math.min(
        this.skillWorldMotion.durationMs,
        this.skillWorldMotion.elapsedMs + Math.max(0, delta),
      );
      const progress = Phaser.Math.Clamp(
        this.skillWorldMotion.elapsedMs / this.skillWorldMotion.durationMs,
        0,
        1,
      );
      const eased = Phaser.Math.Easing.Cubic.Out(progress);
      renderX = Phaser.Math.Linear(this.skillWorldMotion.from.x, this.skillWorldMotion.to.x, eased);
      renderY = Phaser.Math.Linear(this.skillWorldMotion.from.y, this.skillWorldMotion.to.y, eased);
      const jump = this.skillWorldMotion.skillId === 'leap-strike'
        ? Math.sin(progress * Math.PI) * 76
        : 0;
      this.playerActionRoot.setPosition(0, -jump);
      if (progress >= 1) {
        this.skillWorldMotion = null;
        this.playerActionRoot.setPosition(0, 0);
      }
    }
    this.playerRoot.setPosition(renderX, renderY).setDepth(renderY + 10);
    this.updateRegionPresentation();
    if (this.playerDefeated) return;
    if (this.attackLock > 0) return;

    this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);

    const movementFacing = visualMovement.facing;
    const { row, flip } = directionToFrame(movementFacing);
    const visual = this.currentPlayerMovementVisual(row);
    // Destination/target intent is not movement. Using intent here made the
    // walk animation play in place whenever collision resolution stopped the
    // actor against a wall, tree, or water boundary.
    const isMoving = visualMovement.moving;
    this.playerSprite.setFlipX(flip);

    if (isMoving) {
      this.playerSprite
        .setPosition(0, 0)
        .setRotation(0)
        .setScale(PLAYER_SCALE)
        .setOrigin(0.5, 0.97)
        .setTint(0xffffff);
      this.playPlayerWalkPreservingGait(visual.animationKey);
      const frameOffset = Number(this.playerSprite.frame.name) % 8;
      const contactFrame = frameOffset === 0 || frameOffset === 2;
      this.playerShadow.setAlpha(contactFrame ? 0.37 : 0.32).setScale(contactFrame ? 1 : 0.94, contactFrame ? 0.84 : 0.78);
      if (frameOffset !== this.playerPreviousWalkFrame && contactFrame) {
        this.createDust(
          player.x - Math.cos(movementFacing) * 9,
          player.y - Math.sin(movementFacing) * 5,
        );
      }
      this.playerPreviousWalkFrame = frameOffset;
      this.applyTravelGhostVisual();
      return;
    }

    this.playerPreviousWalkFrame = -1;
    this.playerShadow.setAlpha(0.42).setScale(1, 1);
    this.playerSprite.stop().setTexture(visual.textureKey, visual.idleFrame)
      .setPosition(0, 0).setRotation(0).setScale(PLAYER_SCALE).setOrigin(0.5, 0.97)
      .setTint(0xffffff);
    this.applyTravelGhostVisual();
  }

  private playPlayerWalkPreservingGait(animationKey: string): void {
    const currentKey = this.playerSprite.anims.currentAnim?.key ?? '';
    const changingDirection = this.playerSprite.anims.isPlaying
      && currentKey.startsWith('player-')
      && currentKey.includes('-walk-')
      && currentKey !== animationKey;
    const gaitProgress = changingDirection ? this.playerSprite.anims.getProgress() : 0;
    if (currentKey !== animationKey || !this.playerSprite.anims.isPlaying) {
      this.playerSprite.play(animationKey, true);
      // Preserve the planted-foot phase while the player turns around corners.
      // This avoids restarting on frame zero without adding synthetic bobbing.
      if (changingDirection) this.playerSprite.anims.setProgress(gaitProgress);
    }
  }

  private syncPlayerEquipmentLayers(): void {
    if (this.gameMode === 'travel') {
      this.playerArmorSprite.setVisible(false);
      this.playerWeaponAura.setVisible(false);
      this.playerWeaponSprite.setVisible(false);
      return;
    }
    if (this.simulation.isOsakaMudang() || this.simulation.isGwanghaePrince()) {
      // 광해의 40프레임 전복·호신 환도 시트는 완성된 전용 주인공
      // 실루엣이다. 김동혁용 범용 복장/무기 레이어를 겹치지 않는다.
      this.playerArmorSprite.setVisible(false);
      this.playerWeaponAura.setVisible(false);
      this.playerWeaponSprite.setVisible(false);
      return;
    }
    const frontierArcher = this.simulation.isFrontierArcher();
    const frontierBow = frontierArcher && this.simulation.isBowEquipped();
    if (frontierBow) {
      this.playerArmorSprite.setVisible(false);
      this.playerWeaponAura.setVisible(false);
      this.playerWeaponSprite.setVisible(false);
      return;
    }
    const layers = resolvePlayerLayers(this.simulation.equipment, this.simulation.inventory);
    const facingFrame = directionToFrame(this.simulation.player.facing);
    const rawFrame = Number(this.playerSprite.frame.name);
    const frameState = playerFrameState(rawFrame, this.playerSprite.flipX, facingFrame.row);
    const frame = frameForPlayerLayer(frameState.row, frameState.column);
    const { row, column, flip } = frameState;
    const bodyVisible = this.playerSprite.visible && this.playerRoot.visible;
    const armor = this.simulation.getEquippedDefinition('armor');
    const weaponReady = this.playerSprite.texture.key === ASSETS.playerWeaponReadyBody.key
      || this.playerSprite.texture.key === ASSETS.frontierMelee.key;
    const armorAssets = weaponReady ? ASSETS.playerWeaponReadyArmorLayers : ASSETS.playerArmorLayers;
    const armorAsset = armor
      ? armorAssets[armor.id as keyof typeof armorAssets]
      : undefined;
    if (armorAsset && this.playerArmorSprite.texture.key !== armorAsset.key) {
      this.playerArmorSprite.setTexture(armorAsset.key);
    }

    this.playerArmorSprite
      .setVisible(Boolean(!frontierArcher && layers.armor && armorAsset && bodyVisible))
      .setFrame(frame)
      .setPosition(this.playerSprite.x, this.playerSprite.y)
      .setRotation(this.playerSprite.rotation)
      .setScale(this.playerSprite.scaleX, this.playerSprite.scaleY)
      .setOrigin(this.playerSprite.originX, this.playerSprite.originY)
      .setFlipX(this.playerSprite.flipX)
      .setAlpha(this.playerSprite.alpha);

    const weapon = this.simulation.getEquippedDefinition('weapon');
    if (!weapon || !layers.weapon || !bodyVisible) {
      this.playerWeaponAura.setVisible(false);
      this.playerWeaponSprite.setVisible(false);
      return;
    }
    const weaponAsset = ASSETS.playerWeapons[weapon.id as keyof typeof ASSETS.playerWeapons];
    if (!weaponAsset) {
      this.playerWeaponAura.setVisible(false);
      this.playerWeaponSprite.setVisible(false);
      return;
    }
    const weaponPose = weaponReady && column >= 4 ? 'attack' : 'carry';
    const attachment = weaponAttachmentForFrame(row, flip, column, weaponPose);
    if (attachment.behindBody) {
      this.playerActionRoot.moveBelow(this.playerWeaponAura, this.playerSprite);
      this.playerActionRoot.moveBelow(this.playerWeaponSprite, this.playerSprite);
    } else {
      this.playerActionRoot.bringToTop(this.playerWeaponAura);
      this.playerActionRoot.bringToTop(this.playerWeaponSprite);
    }
    if (this.playerWeaponSprite.texture.key !== weaponAsset.key) this.playerWeaponSprite.setTexture(weaponAsset.key);
    if (this.playerWeaponAura.texture.key !== weaponAsset.key) this.playerWeaponAura.setTexture(weaponAsset.key);
    this.playerWeaponSprite
      .setVisible(true)
      .setPosition(this.playerSprite.x + attachment.x, this.playerSprite.y + attachment.y)
      .setRotation(this.playerSprite.rotation + attachment.rotation)
      .setScale(attachment.scale)
      .setOrigin(
        weaponAsset.grip.x / PLAYER_ACTION_FRAME.width,
        weaponAsset.grip.y / PLAYER_ACTION_FRAME.height,
      )
      .setFlipX(attachment.flipX)
      .setAlpha(this.playerSprite.alpha);
    const elementTint = weapon.element === 'fire' ? 0xff5a22
      : weapon.element === 'ice' ? 0x65d7ff
        : weapon.element === 'lightning' ? 0xc182ff
          : weapon.element === 'poison' ? 0x65d05c
            : weapon.element === 'wind' ? 0x9ce9d4
              : weapon.element === 'earth' ? 0xd19a55
                : weapon.element === 'shadow' ? 0x8062c9 : 0xffffff;
    this.playerWeaponAura
      .setVisible(Boolean(weapon.element))
      .setPosition(this.playerSprite.x + attachment.x, this.playerSprite.y + attachment.y)
      .setRotation(this.playerSprite.rotation + attachment.rotation)
      .setScale(attachment.scale * (1.04 + Math.sin(this.time.now * 0.009) * 0.025))
      .setOrigin(
        weaponAsset.grip.x / PLAYER_ACTION_FRAME.width,
        weaponAsset.grip.y / PLAYER_ACTION_FRAME.height,
      )
      .setFlipX(attachment.flipX)
      .setTint(elementTint)
      .setAlpha(this.playerSprite.alpha * (0.22 + Math.sin(this.time.now * 0.014) * 0.07));
  }

  private toggleDevEquipment(itemId: ItemId): void {
    const definition = ITEM_CATALOG[itemId];
    if (definition.slot === 'scroll' || definition.slot === 'material') return;
    const existing = this.simulation.inventory.find((item) => item.itemId === itemId);
    const instanceId = existing?.instanceId ?? `dev-${itemId}`;
    if (!existing) this.simulation.inventory.push({ instanceId, itemId });
    const equipped = this.simulation.equipment[definition.slot];
    if (equipped && equipped !== instanceId) this.simulation.equipItem(equipped);
    this.simulation.equipItem(instanceId);
  }

  private updateRegionPresentation(): void {
    const nextRegion = this.simulation.region;
    if (nextRegion === this.currentRegion) return;
    const previousIslandIndex = ULLEUNG_REGION_IDS.indexOf(this.currentRegion as UlleungRegionId);
    const nextIslandIndex = ULLEUNG_REGION_IDS.indexOf(nextRegion as UlleungRegionId);
    const continuousIslandStep = previousIslandIndex >= 0
      && nextIslandIndex >= 0
      && Math.abs(previousIslandIndex - nextIslandIndex) === 1;
    const continuousWorldStep = isContinuousWorldNeighbor(this.currentRegion, nextRegion);
    this.currentRegion = nextRegion;
    if (isJoseonTownRegion(nextRegion)) this.ensureJoseonTownNeighborhood(nextRegion);
    this.syncAmbientWorldState(nextRegion);
    this.releaseInactiveMonsterViews(nextRegion);
    const region = REGIONS[nextRegion];
    const compact = this.scale.gameSize.width <= 600;
    this.regionLabel
      .setPosition(this.scale.gameSize.width / 2, compact ? 104 : Math.max(92, this.scale.gameSize.height * 0.18))
      .setFontSize(compact ? 17 : 25)
      .setPadding(compact ? 11 : 18, compact ? 6 : 9)
      .setText(compact
        ? `${region.name}${nextRegion === 'dungeon' ? ` ${this.simulation.dungeonFloor}층` : ''}`
        : `${region.name}${nextRegion === 'dungeon' ? ` ${this.simulation.dungeonFloor}층` : ''}  ·  ${region.status}`)
      .setColor(region.safe ? '#b9d59d' : '#e7b38f')
      .setAlpha(0).setScale(0.92);
    if (!continuousIslandStep && !continuousWorldStep) {
      this.cameras.main.flash(220, 28, 24, 20, false);
    }
    this.tweens.killTweensOf(this.regionLabel);
    this.tweens.add({
      targets: this.regionLabel,
      alpha: { from: 0, to: 1 },
      scale: 1,
      duration: 260,
      yoyo: true,
      hold: 1550,
      ease: 'Sine.easeInOut',
    });
  }

  private registerLazyAmbientObject<
    T extends Phaser.GameObjects.GameObject & {
      visible: boolean;
      setVisible: (visible: boolean) => T;
    },
  >(object: T, region: RegionId): T {
    this.ambientWorldObjects.push({ object, region });
    object.setVisible(this.activeRenderRegions(this.simulation.region).has(region));
    return object;
  }

  private captureAmbientWorldTweens(): void {
    this.ambientWorldTweens = this.tweens.getTweens().map((tween) => {
      const target = tween.targets.find((candidate) => {
        const value = candidate as { x?: unknown; y?: unknown };
        return typeof value?.x === 'number' && typeof value?.y === 'number';
      }) as (Phaser.GameObjects.GameObject & { x: number; y: number; getWorldTransformMatrix?: () => Phaser.GameObjects.Components.TransformMatrix }) | undefined;
      if (!target) return { tween, region: null };
      let x = target.x;
      let y = target.y;
      if (typeof target.getWorldTransformMatrix === 'function') {
        const point = target.getWorldTransformMatrix().transformPoint(0, 0);
        x = point.x;
        y = point.y;
      }
      return { tween, region: this.regionAtWorldPoint(x, y) };
    });
    this.ambientWorldObjects = this.children.list.flatMap((candidate) => {
      const object = candidate as Phaser.GameObjects.GameObject & {
        x?: number;
        y?: number;
        depth?: number;
        scrollFactorX?: number;
        scrollFactorY?: number;
        visible?: boolean;
        setVisible?: (visible: boolean) => unknown;
        getWorldTransformMatrix?: () => Phaser.GameObjects.Components.TransformMatrix;
      };
      if (typeof object.setVisible !== 'function'
        || typeof object.x !== 'number'
        || typeof object.y !== 'number'
        || (object.depth ?? 0) >= 2000
        || object.scrollFactorX === 0
        || object.scrollFactorY === 0) return [];
      let x = object.x;
      let y = object.y;
      if (typeof object.getWorldTransformMatrix === 'function') {
        const point = object.getWorldTransformMatrix().transformPoint(0, 0);
        x = point.x;
        y = point.y;
      }
      return [{
        object: object as Phaser.GameObjects.GameObject & { visible: boolean; setVisible: (visible: boolean) => unknown },
        // The combined Solgogae + Moonlight Village painting spans two regions.
        // Classifying it only by its centre hid the entire village floor when
        // the player crossed the village boundary.
        region: object === this.worldBackground ? null : this.regionAtWorldPoint(x, y),
      }];
    });
    this.syncAmbientWorldState(this.simulation.region);
  }

  private activeRenderRegions(activeRegion: RegionId): Set<RegionId> {
    const active = new Set<RegionId>([activeRegion]);
    const connectedMainland: Partial<Record<RegionId, RegionId[]>> = {
      solgogae: ['village'],
      village: ['solgogae', 'mistwood', 'minepass', 'moonfield'],
      mistwood: ['village', 'yeongwol'],
      yeongwol: ['mistwood', 'yeongwolhq'],
      yeongwolhq: ['yeongwol'],
      minepass: ['village', 'dungeon'],
      dungeon: ['minepass'],
      moonfield: ['village'],
      jeonjufield: ['jeonjugate'],
      jeonjugate: ['jeonjufield', 'jeonju'],
      jeonju: ['jeonjugate'],
      namhansanseong: [],
      ganghwado: [],
    };
    for (const neighbor of connectedMainland[activeRegion] ?? []) active.add(neighbor);
    for (const neighbor of continuityNeighborsForRegion(activeRegion)) active.add(neighbor);
    if (isJurchenRegion(activeRegion)) {
      const index = JURCHEN_REGION_IDS.indexOf(activeRegion);
      if (index > 0) active.add(JURCHEN_REGION_IDS[index - 1]);
      if (index >= 0 && index < JURCHEN_REGION_IDS.length - 1) {
        active.add(JURCHEN_REGION_IDS[index + 1]);
      }
      if (activeRegion === 'jurchenvillage') active.add('manchufrontier');
    }
    if (isUlleungRegion(activeRegion)) {
      const route: RegionId[] = [...ULLEUNG_REGION_IDS];
      const index = route.indexOf(activeRegion);
      if (index > 0) active.add(route[index - 1]);
      if (index >= 0 && index < route.length - 1) active.add(route[index + 1]);
    }
    if (isJoseonTownRegion(activeRegion)) {
      const index = JOSEON_TOWN_REGION_IDS.indexOf(activeRegion);
      if (index > 0) active.add(JOSEON_TOWN_REGION_IDS[index - 1]);
      if (index >= 0 && index < JOSEON_TOWN_REGION_IDS.length - 1) {
        active.add(JOSEON_TOWN_REGION_IDS[index + 1]);
      }
      if (activeRegion === 'hanseongmarket') active.add('gyeongbokgate');
    }
    return active;
  }

  private syncAmbientWorldState(activeRegion: RegionId): void {
    const visibleRegions = this.activeRenderRegions(activeRegion);
    const animateOnlyActive = this.mobileProfile
      || this.gameSettings.graphicsQuality === 'performance'
      || this.gameSettings.reducedMotion;
    const animatedRegions = animateOnlyActive ? new Set<RegionId>([activeRegion]) : visibleRegions;
    for (const entry of this.ambientWorldTweens) {
      if (
        !this.gameSettings.reducedMotion
        && (entry.region === null || animatedRegions.has(entry.region))
      ) entry.tween.resume();
      else entry.tween.pause();
    }
    for (const entry of this.ambientWorldObjects) {
      entry.object.setVisible(entry.region === null || visibleRegions.has(entry.region));
    }
    this.syncFrontierSouthGateState(false);
    this.syncPyongyangAdvanceGates(false);
    this.syncRoyalRefugeGates(false);
  }

  private regionAtWorldPoint(x: number, y: number): RegionId | null {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    for (const region of ROYAL_REFUGE_ROUTE_IDS) {
      const origin = REGION_ORIGINS[region];
      if (x >= origin.x && x < origin.x + MAP_WIDTH
        && y >= origin.y && y < origin.y + MAP_HEIGHT) {
        return region;
      }
    }
    for (const region of EPISODE2_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      if (x >= origin.x && x < origin.x + MAP_WIDTH
        && y >= origin.y && y < origin.y + MAP_HEIGHT) {
        return region;
      }
    }
    for (const region of JAPAN_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      if (x >= origin.x && x < origin.x + MAP_WIDTH
        && y >= origin.y && y < origin.y + MAP_HEIGHT) {
        return region;
      }
    }
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      if (x >= origin.x && x < origin.x + MAP_WIDTH
        && y >= origin.y && y < origin.y + MAP_HEIGHT) {
        return region;
      }
    }
    for (const region of EXTENDED_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      if (x >= origin.x && x < origin.x + MAP_WIDTH
        && y >= origin.y && y < origin.y + MAP_HEIGHT) {
        return region;
      }
    }
    for (const region of JURCHEN_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      if (x >= origin.x && x < origin.x + MAP_WIDTH
        && y >= origin.y && y < origin.y + MAP_HEIGHT) {
        return region;
      }
    }
    if (x < -MAP_WIDTH * 5) {
      if (y >= REGION_ORIGINS.pyongyanginner.y) return 'pyongyanginner';
      if (y >= REGION_ORIGINS.pyongyanggate.y) return 'pyongyanggate';
      if (y >= REGION_ORIGINS.pyongyangouter.y) return 'pyongyangouter';
      if (y >= REGION_ORIGINS.manchufrontier.y) return 'manchufrontier';
      return 'jurchenvillage';
    }
    if (x < -MAP_WIDTH * 4) {
      if (y < VILLAGE_TOP - MAP_HEIGHT) return 'gyeongbokinner';
      if (y < VILLAGE_TOP) return 'gyeongbokcourt';
      return 'gyeongbokgate';
    }
    if (x < -MAP_WIDTH * 3) return y < VILLAGE_TOP ? 'tangeumdae' : 'busanjin';
    if (x < -MAP_WIDTH * 2) {
      if (y < VILLAGE_TOP - MAP_HEIGHT) return 'jeonju';
      if (y < VILLAGE_TOP) return 'jeonjugate';
      return 'jeonjufield';
    }
    if (x >= MAP_WIDTH * 3) {
      return ulleungRegionAtY(y);
    }
    if (x < -MAP_WIDTH) return y < VILLAGE_TOP ? 'yeongwolhq' : 'yeongwol';
    if (x < 0) return 'mistwood';
    if (x > MAP_WIDTH * 2) return 'dungeon';
    if (x > MAP_WIDTH) return 'minepass';
    if (y >= CENTRAL_WORLD_HEIGHT) return 'moonfield';
    return y >= VILLAGE_TOP + 110 ? 'village' : 'solgogae';
  }

  private playMonsterWalkPreservingGait(
    view: MonsterView,
    animationKey: string,
    timeScale: number,
  ): void {
    const currentKey = view.sprite.anims.currentAnim?.key ?? '';
    const changingDirection = view.sprite.anims.isPlaying
      && currentKey.startsWith('monster-walk-')
      && currentKey !== animationKey;
    const gaitProgress = changingDirection ? view.sprite.anims.getProgress() : 0;
    if (currentKey !== animationKey || !view.sprite.anims.isPlaying) {
      view.sprite.play(animationKey, true);
      // A direction-row switch must not restart on the same planted foot.
      // Keeping the authored four-frame gait phase removes the skating seen
      // while soldiers circle or turn at corners without adding fake bobbing.
      if (changingDirection) view.sprite.anims.setProgress(gaitProgress);
    }
    view.sprite.anims.timeScale = timeScale;
  }

  private monsterWalkTimeScale(monster: MonsterState, movementSpeed: number): number {
    if (monster.aiState === 'charge') return 1.34;
    if (monster.aiState === 'flee') {
      return Phaser.Math.Clamp(0.92 + movementSpeed / 220, 1.08, 1.28);
    }
    if (monster.aiState === 'circle') {
      return Phaser.Math.Clamp(0.76 + movementSpeed / 210, 0.82, 1.12);
    }
    if (monster.aiState === 'patrol' || monster.aiState === 'return') {
      return Phaser.Math.Clamp(0.78 + movementSpeed / 220, 0.82, 1.02);
    }
    return Phaser.Math.Clamp(0.78 + movementSpeed / 180, 0.86, 1.2);
  }

  private monsterRingStyle(
    monster: MonsterState,
    presentation: MonsterPresentation,
    friendly: boolean,
    selected: boolean,
  ): { width: number; color: number; alpha: number } {
    if (selected) return { width: 3, color: 0xf0cc72, alpha: 1 };
    if (friendly) return { width: 2, color: 0x75c5b5, alpha: 0.48 };
    if (presentation.cue === 'telegraph' || presentation.cue === 'charge') {
      return { width: 3, color: 0xeb5945, alpha: 0.92 };
    }
    if (presentation.cue === 'brace') return { width: 3, color: 0xaac5d4, alpha: 0.78 };
    if (presentation.cue === 'rally') return { width: 3, color: 0xe8bd60, alpha: 0.86 };
    if (presentation.cue === 'stunned') return { width: 3, color: 0xe4d8b0, alpha: 0.88 };
    if (presentation.cue === 'flee' || presentation.cue === 'return') {
      return { width: 2, color: 0x9ab3c4, alpha: 0.48 };
    }
    if (!monster.aggro) return { width: 2, color: 0xc74537, alpha: 0 };
    const role = monsterVisualRole(monster.kind);
    if (role === 'commander') return { width: 3, color: 0xd6a34e, alpha: 0.52 };
    if (role === 'ranged') return { width: 2, color: 0xc59a65, alpha: 0.32 };
    if (role === 'beast') return { width: 2, color: 0xb9513f, alpha: 0.28 };
    return { width: 2, color: 0xc74537, alpha: 0.22 };
  }

  private syncMonsterIntentCue(
    view: MonsterView,
    monster: MonsterState,
    cue: MonsterIntentCue,
    hidden: boolean,
  ): void {
    if (hidden || cue === 'none') {
      view.intentCue.setVisible(false);
      view.lastIntentCue = cue;
      return;
    }
    if (view.lastIntentCue === cue && view.intentCue.visible) return;
    const graphics = view.intentCue;
    const cueY = view.roleLabel
      ? view.roleLabel.y - 24
      : monsterVisualRole(monster.kind) === 'commander' ? -125 : -108;
    graphics.clear().setVisible(true).setPosition(0, cueY);
    const danger = cue === 'telegraph' || cue === 'charge';
    const primary = danger ? 0xf06b50
      : cue === 'brace' ? 0xc6d9e2
        : cue === 'rally' ? 0xf0c86d
          : cue === 'stunned' ? 0xf2e4b9
            : cue === 'flee' || cue === 'return' ? 0xb3c6d1 : 0xdda85e;
    graphics.fillStyle(0x130d0a, 0.76).fillCircle(0, 0, 11);
    graphics.lineStyle(2, primary, 0.96);
    if (cue === 'alert') {
      graphics.beginPath().moveTo(0, -6).lineTo(0, 2).strokePath();
      graphics.fillStyle(primary, 1).fillCircle(0, 6, 1.7);
    } else if (cue === 'pursue') {
      graphics.fillStyle(primary, 0.95).fillTriangle(-7, -5, 7, -5, 0, 6);
    } else if (cue === 'flank') {
      graphics.beginPath().moveTo(-8, -5).lineTo(-3, 0).lineTo(-8, 5).strokePath();
      graphics.beginPath().moveTo(8, -5).lineTo(3, 0).lineTo(8, 5).strokePath();
    } else if (cue === 'telegraph') {
      graphics.strokeTriangle(-8, 7, 8, 7, 0, -8);
      graphics.fillStyle(primary, 1).fillCircle(0, 3, 1.8);
    } else if (cue === 'charge') {
      graphics.beginPath().moveTo(-8, -6).lineTo(-2, 0).lineTo(-8, 6).strokePath();
      graphics.beginPath().moveTo(0, -6).lineTo(6, 0).lineTo(0, 6).strokePath();
    } else if (cue === 'brace') {
      graphics.strokeRect(-7, -7, 14, 14);
      graphics.beginPath().moveTo(-5, -1).lineTo(0, 5).lineTo(6, -5).strokePath();
    } else if (cue === 'rally') {
      graphics.beginPath().moveTo(-5, 7).lineTo(-5, -7).strokePath();
      graphics.fillStyle(primary, 0.96).fillTriangle(-4, -7, 7, -3, -4, 1);
    } else if (cue === 'flee') {
      graphics.beginPath().moveTo(-7, 5).lineTo(0, -2).lineTo(7, 5).strokePath();
      graphics.beginPath().moveTo(-5, -2).lineTo(0, -7).lineTo(5, -2).strokePath();
    } else if (cue === 'return') {
      graphics.strokeCircle(0, 0, 6);
      graphics.fillStyle(primary, 1).fillTriangle(-7, -2, -2, -7, -1, 1);
    } else if (cue === 'stunned') {
      graphics.beginPath().moveTo(-7, 0).lineTo(7, 0).moveTo(0, -7).lineTo(0, 7)
        .moveTo(-5, -5).lineTo(5, 5).moveTo(5, -5).lineTo(-5, 5).strokePath();
    }
    graphics.setScale(this.mobileProfile ? 0.88 : 1);
    view.lastIntentCue = cue;
  }

  private syncMonsters(): void {
    const selectedId = this.simulation.player.targetId;
    const travelSpectator = this.gameMode === 'travel';
    for (const monster of this.simulation.monsters) {
      if (monster.region !== this.simulation.region) continue;
      const view = this.monsterViews.get(monster.id) ?? this.createMonsterView(monster);
      const movementSpeed = Math.hypot(monster.velocity.x, monster.velocity.y);
      const presentation = monsterPresentation(monster.aiState, movementSpeed, monster.alive, monster.hitStun);
      const direction = directionToFrame(monster.facing);
      view.baseScale = monsterScaleForRegion(
        monster.kind,
        monster.region,
        direction.row,
        MONSTER_SCALE[monster.kind],
      );
      const textureKey = ASSETS.monsters[monster.kind].key;
      const friendly = this.simulation.isFriendlyMonster(monster);
      const enteredState = view.lastAiState !== monster.aiState;
      const attackAnimationPlaying = view.sprite.anims.isPlaying
        && view.sprite.anims.currentAnim?.key.startsWith(`monster-attack-${monster.kind}-`);
      view.root.setVisible(monster.alive).setPosition(monster.x, monster.y).setDepth(monster.y)
        .setAlpha(travelSpectator ? 0.54 : 1);
      view.sprite.setVisible(monster.alive);
      view.shadow.setVisible(monster.alive);
      view.ring.setVisible(monster.alive && !travelSpectator);
      view.hitZone.setVisible(monster.alive && !travelSpectator).setPosition(monster.x, monster.y - 42).setDepth(monster.y + 1);
      if (view.hitZone.input) view.hitZone.input.enabled = monster.alive && !travelSpectator;
      const ringStyle = this.monsterRingStyle(monster, presentation, friendly, selectedId === monster.id);
      view.ring.setStrokeStyle(ringStyle.width, ringStyle.color, ringStyle.alpha);
      this.syncMonsterIntentCue(view, monster, presentation.cue, !monster.alive || travelSpectator || friendly);

      if (monster.alive && presentation.motion === 'attack') {
        // Event presentation adds the local lunge. The state transition here
        // guarantees that a dropped event can never leave an attacker static.
        if (enteredState && !attackAnimationPlaying) {
          view.sprite.setPosition(0, 0).setRotation(0).setScale(view.baseScale).setAlpha(1)
            .setOrigin(0.5, 0.97).setFlipX(direction.flip)
            .play(`monster-attack-${monster.kind}-${direction.row}`, true);
        }
        view.shadow.setAlpha(0.43).setScale(1.04, 0.92);
      } else if (monster.alive) {
        view.sprite.setPosition(0, 0).setRotation(0).setScale(view.baseScale).setAlpha(1)
          .setOrigin(0.5, 0.97).setFlipX(direction.flip);
        if (presentation.motion === 'walk') {
          this.playMonsterWalkPreservingGait(
            view,
            `monster-walk-${monster.kind}-${direction.row}`,
            this.monsterWalkTimeScale(monster, movementSpeed),
          );
          if (monster.aiState === 'charge') {
            view.shadow.setAlpha(0.31).setScale(1.14, 0.9);
          } else if (monster.aiState === 'flee') {
            view.shadow.setAlpha(0.34).setScale(1.07, 0.94);
          } else if (monster.aiState === 'circle') {
            view.shadow.setAlpha(0.39).setScale(1.03, 0.97);
          } else {
            view.shadow.setAlpha(0.4).setScale(1, 1);
          }
        } else {
          view.sprite.anims.timeScale = 1;
          view.sprite.stop().setTexture(textureKey, direction.row * 8 + presentation.poseColumn);
          if (monster.aiState === 'sleep') {
            const lean = Number(monster.id.split('-').at(-1)) % 2 === 0 ? -0.055 : 0.055;
            view.sprite.setRotation(lean).setPosition(0, 4).setAlpha(0.9);
            view.shadow.setAlpha(0.32).setScale(0.94, 0.82);
          } else if (presentation.motion === 'stunned') {
            // The authored crossing-foot frame reads as loss of balance while
            // the simulation moves the rooted container through knockback.
            view.shadow.setAlpha(0.46).setScale(1.12, 0.76);
          } else if (presentation.motion === 'prepare') {
            view.shadow.setAlpha(0.44).setScale(1.03, 0.94);
          } else {
            view.shadow.setAlpha(0.4).setScale(1, 1);
          }
        }
      }

      if (monster.alive) {
        let spriteTint = MONSTER_TINT[monster.kind] ?? 0xffffff;
        let ringFill = friendly ? 0x244a46 : 0x160c08;
        let ringAlpha = friendly ? 0.18 : 0.14;
        if (monster.elemental.frostSeconds > 0) {
          spriteTint = 0x9cddff;
          ringFill = 0x5ecbff;
          ringAlpha = 0.15;
        } else if (monster.elemental.burnSeconds > 0) {
          spriteTint = 0xffa15c;
          ringFill = 0xff5a20;
          ringAlpha = 0.13;
        } else if (monster.elemental.shockSeconds > 0) {
          spriteTint = 0xd3a6ff;
          ringFill = 0xa966ff;
          ringAlpha = 0.16;
        } else if (monster.elemental.poisonSeconds > 0) {
          spriteTint = 0x8bc96e;
          ringFill = 0x58a63d;
          ringAlpha = 0.17;
        } else if (monster.elemental.stoneSeconds > 0) {
          spriteTint = 0xc39b6d;
          ringFill = 0xa46a32;
          ringAlpha = 0.18;
        } else if (monster.elemental.gustSeconds > 0) {
          spriteTint = 0xb5f2df;
          ringFill = 0x75cdb7;
          ringAlpha = 0.14;
        } else if (monster.elemental.shadowSeconds > 0) {
          spriteTint = 0x9c81c4;
          ringFill = 0x594078;
          ringAlpha = 0.18;
        } else if (presentation.motion === 'stunned') {
          spriteTint = 0xffb5a4;
          ringFill = 0xa6382f;
          ringAlpha = 0.22;
        } else if (monster.aiState === 'brace') {
          spriteTint = 0xdce7ef;
        } else if (monster.aiState === 'rally') {
          spriteTint = 0xf4ce78;
        }
        if (this.time.now < view.hitFlashUntil) view.sprite.setTintFill(0xfff1d1);
        else view.sprite.setTint(spriteTint);
        view.ring.setFillStyle(ringFill, ringAlpha);
      }
      if (monster.aiState === 'charge' && this.time.now - view.lastDustAt > 105) {
        view.lastDustAt = this.time.now;
        this.createDust(monster.x - Math.cos(monster.facing) * 28, monster.y - Math.sin(monster.facing) * 15);
      }
      view.hp.clear().setVisible(monster.alive && !travelSpectator && (monster.hp < monster.maxHp || selectedId === monster.id));
      view.hp.setDepth(monster.y + 3);
      if (view.hp.visible) {
        const width = 58;
        view.hp.fillStyle(0x130f0d, 0.9).fillRoundedRect(monster.x - width / 2, monster.y - 92, width, 6, 2);
        view.hp.fillStyle(friendly ? 0x4f9f8b : 0xa53129, 1)
          .fillRoundedRect(monster.x - width / 2 + 1, monster.y - 91, (width - 2) * (monster.hp / monster.maxHp), 4, 1);
      }
      view.lastAiState = monster.aiState;
    }
  }

  private createBossView(boss: BossState): BossView {
    const definition = BOSS_CATALOG[boss.bossId];
    const shadow = this.add.ellipse(0, 6, 118, 34, 0x080605, 0.56);
    const ring = this.add.ellipse(0, 5, 142, 48, 0x5b1616, 0.18).setStrokeStyle(3, 0xe4ae58, 0.88);
    const sprite = this.add.sprite(0, 0, definition.textureKey, 0).setScale(definition.scale).setOrigin(0.5, 0.97);
    const root = this.add.container(boss.x, boss.y, [shadow, ring, sprite]).setDepth(boss.y + 2);
    const hitZone = this.add.zone(boss.x, boss.y - 60, 150, 168).setDepth(boss.y + 4).setInteractive({ cursor: COMBAT_CURSOR });
    hitZone.setData('monsterId', boss.id);
    hitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.selectBoss();
    });
    hitZone.on('pointerover', () => ring.setStrokeStyle(4, 0xffd77c, 1));
    hitZone.on('pointerout', () => ring.setStrokeStyle(3, 0xe4ae58, 0.88));
    const hp = this.add.graphics();
    return { bossId: boss.bossId, root, sprite, shadow, ring, hp, hitZone, baseScale: definition.scale };
  }

  private destroyBossView(): void {
    if (!this.bossView) return;
    this.tweens.killTweensOf(this.bossView.sprite);
    this.bossView.root.destroy(true);
    this.bossView.hitZone.destroy();
    this.bossView.hp.destroy();
    this.bossView = null;
  }

  private syncBoss(): void {
    const boss = this.simulation.boss;
    if (!boss) {
      this.destroyBossView();
      return;
    }
    if (!this.bossView || this.bossView.bossId !== boss.bossId) {
      this.destroyBossView();
      this.bossView = this.createBossView(boss);
    }
    const view = this.bossView;
    const direction = directionToFrame(boss.facing);
    const selected = this.simulation.player.targetId === boss.id;
    const attacking = view.sprite.anims.isPlaying && view.sprite.anims.currentAnim?.key.startsWith(`boss-attack-${boss.bossId}-`);
    view.root.setVisible(boss.alive).setPosition(boss.x, boss.y).setDepth(boss.y + 2);
    const travelSpectator = this.gameMode === 'travel';
    view.root.setAlpha(travelSpectator ? 0.54 : 1);
    view.hitZone.setVisible(boss.alive && !travelSpectator).setPosition(boss.x, boss.y - 60).setDepth(boss.y + 4);
    if (view.hitZone.input) view.hitZone.input.enabled = boss.alive && !travelSpectator;
    view.ring.setStrokeStyle(boss.phase === 2 ? 4 : 3, boss.phase === 2 ? 0xd84e49 : selected ? 0xffdf85 : 0xe4ae58, selected ? 1 : 0.76);
    if (boss.alive && !attacking) {
      view.sprite.setPosition(0, 0).setRotation(0).setScale(view.baseScale).setOrigin(0.5, 0.97).setFlipX(direction.flip).setAlpha(1);
      if (boss.state === 'chase') view.sprite.play(`boss-walk-${boss.bossId}-${direction.row}`, true);
      else view.sprite.stop().setTexture(BOSS_CATALOG[boss.bossId].textureKey, direction.row * 8 + (boss.state === 'telegraph' || boss.state === 'windup' ? 4 : 0));
    }
    view.shadow.setAlpha(boss.alive ? 0.52 : 0);
    view.hp.clear().setVisible(boss.alive && !travelSpectator);
    if (boss.alive) {
      const width = 132;
      view.hp.setDepth(boss.y + 5);
      view.hp.fillStyle(0x120b0a, 0.94).fillRoundedRect(boss.x - width / 2, boss.y - 132, width, 10, 3);
      view.hp.fillStyle(boss.phase === 2 ? 0xc5473f : 0x8f2d29, 1).fillRoundedRect(boss.x - width / 2 + 2, boss.y - 130, (width - 4) * (boss.hp / boss.maxHp), 6, 2);
    }
  }

  private syncGroundItems(): void {
    const activeDrops = this.simulation.groundDrops.filter((drop) =>
      !drop.region || drop.region === this.simulation.region);
    const activeIds = new Set(activeDrops.map((drop) => drop.id));
    const inventoryFull = this.simulation.inventory.length >= this.simulation.inventoryCapacity;
    for (const drop of activeDrops) {
      let view = this.groundItemViews.get(drop.id);
      if (!view) {
        view = this.createGroundItemView(drop);
        this.groundItemViews.set(drop.id, view);
      }
      const bob = Math.sin(this.time.now * 0.0045 + view.phase) * 4;
      const selected = this.simulation.player.lootTargetId === drop.id;
      const visible = this.gameMode !== 'travel';
      const definition = ITEM_CATALOG[drop.itemId];
      const rarityStyle = GROUND_DROP_RARITY_STYLE[definition.rarity];
      const distance = Phaser.Math.Distance.Between(
        this.simulation.player.x,
        this.simulation.player.y,
        drop.x,
        drop.y,
      );
      const near = distance <= 240;
      const remaining = Math.max(0, drop.remainingSeconds ?? 0);
      const countdown = remaining > 0 && remaining <= 30
        ? ` · ${Math.ceil(remaining)}초 후 사라짐`
        : '';
      const bagStatus = inventoryFull && (near || selected) ? '\n행낭 가득 · 정리 후 습득' : countdown;
      view.label.setText(`${rarityStyle.glyph} [${definition.rarity}] ${definition.name}${bagStatus}`)
        .setColor(inventoryFull && near ? '#ffad91' : rarityStyle.label);
      view.beam.setPosition(drop.x, drop.y - 38).setDepth(drop.y - 3)
        .setFillStyle(rarityStyle.color, rarityStyle.notable ? (selected ? 0.3 : 0.19) : 0.08)
        .setScale(selected ? 1.35 : 1, selected ? 1.1 : 1)
        .setVisible(visible && (rarityStyle.notable || selected));
      view.glow.setPosition(drop.x, drop.y + 4).setDepth(drop.y - 2).setScale(selected ? 1.18 : 1).setVisible(visible);
      view.glow.setFillStyle(inventoryFull && near ? 0x9a3d2f : rarityStyle.color, selected ? 0.28 : 0.17)
        .setStrokeStyle(selected ? 2 : 1, inventoryFull && near ? 0xff826b : rarityStyle.color, selected ? 1 : 0.76);
      view.icon.setPosition(drop.x, drop.y - 23 + bob).setDepth(drop.y + 3)
        .setAlpha(inventoryFull && near ? 0.72 : 1).setVisible(visible);
      view.label.setPosition(drop.x, drop.y - 56 + bob).setDepth(drop.y + 4)
        .setVisible(visible && (selected || near || rarityStyle.notable
          || Math.sin(this.time.now * 0.002 + view.phase) > 0.25));
      view.hitZone.setPosition(drop.x, drop.y - 22).setDepth(drop.y + 5).setVisible(visible);
      if (view.hitZone.input) view.hitZone.input.enabled = visible;
    }
    for (const [id, view] of this.groundItemViews) {
      if (activeIds.has(id)) continue;
      view.beam.destroy();
      view.glow.destroy();
      view.icon.destroy();
      view.label.destroy();
      view.hitZone.destroy();
      this.groundItemViews.delete(id);
    }
  }

  private syncCorpses(delta: number): void {
    const elapsed = Math.min(delta, 50);
    for (let index = this.corpseViews.length - 1; index >= 0; index -= 1) {
      const corpse = this.corpseViews[index];
      corpse.remainingMs -= elapsed;
      if (!corpse.fading && corpse.remainingMs <= MONSTER_CORPSE_FADE_MS) {
        corpse.fading = true;
        this.tweens.add({ targets: corpse.root, alpha: 0, duration: MONSTER_CORPSE_FADE_MS, ease: 'Sine.easeIn' });
      }
      if (corpse.remainingMs > 0) continue;
      this.tweens.killTweensOf(corpse.root);
      this.tweens.killTweensOf(corpse.sprite);
      this.tweens.killTweensOf(corpse.shadow);
      corpse.root.destroy(true);
      this.corpseViews.splice(index, 1);
    }
  }

  private createGroundItemView(drop: GroundDrop): GroundItemView {
    const definition = ITEM_CATALOG[drop.itemId];
    const rarityStyle = GROUND_DROP_RARITY_STYLE[definition.rarity];
    const beam = this.add.rectangle(drop.x, drop.y - 38, 5, 88, rarityStyle.color, rarityStyle.notable ? 0.19 : 0.08);
    const glow = this.add.ellipse(drop.x, drop.y + 3, 58, 21, rarityStyle.color, 0.17)
      .setStrokeStyle(1, rarityStyle.color, 0.76);
    const iconSize = rarityStyle.notable ? 42 : 38;
    const icon = this.add.image(drop.x, drop.y - 22, definition.iconKey).setDisplaySize(iconSize, iconSize);
    const label = this.add.text(drop.x, drop.y - 56, `${rarityStyle.glyph} [${definition.rarity}] ${definition.name}`, {
      fontFamily: 'serif', fontSize: rarityStyle.notable ? '12px' : '11px', color: rarityStyle.label,
      stroke: '#1b120c', strokeThickness: 4,
      align: 'center', lineSpacing: 3,
    }).setOrigin(0.5);
    const hitZone = this.add.zone(drop.x, drop.y - 20, 78, 82).setInteractive({ useHandCursor: true });
    hitZone.setData('dropId', drop.id);
    hitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.menuOpen || this.gameMode === 'travel') return;
      this.simulation.collectDrop(drop.id);
    });
    hitZone.on('pointerover', () => glow.setStrokeStyle(2, 0xf0cf83, 1));
    hitZone.on('pointerout', () => glow.setStrokeStyle(1, rarityStyle.color, 0.76));
    return { beam, glow, icon, label, hitZone, phase: Number(drop.id.split('-')[1]) * 1.7 };
  }

  private handleEvent(event: GameEvent): void {
    this.hud.handle(event);
    if (event.type === 'item-drop' && this.gameSettings.autoLoot) {
      const drop = this.simulation.groundDrops.find((entry) => entry.id === event.dropId);
      if (drop && this.simulation.inventory.length < this.simulation.inventoryCapacity
        && Phaser.Math.Distance.Between(this.simulation.player.x, this.simulation.player.y, drop.x, drop.y) <= 240) {
        this.simulation.collectDrop(drop.id);
      }
    }
    if (event.type === 'gwanghae-militia-rallied') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 126,
        `${event.label} · ${event.recruits}명 합류 · ${event.completed}/${event.total}곳 규합`,
        3600,
      );
      if (event.choiceReady) this.time.delayedCall(520, () => this.playGwanghaePathChoice());
    }
    if (event.type === 'gwanghae-militia-rally-blocked' && event.reason === 'prerequisite') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 120,
        '창덕궁 승정원 주서에게 분조 의병 명부를 먼저 받으십시오.',
        2800,
      );
    }
    if (event.type === 'gwanghae-path-battle-cleared') {
      this.haptic([28, 34, 28, 44, 36]);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 132,
        `MISSION CLEAR · ${event.title} · ${event.defeated}명 제압 · ${event.rewardGold}전`,
        5200,
      );
    }
    if (event.type === 'player-impact' && (event.finisher || event.critical)) {
      this.haptic(event.finisher ? [18, 26, 24] : 16);
    }
    if (event.type === 'player-hit') this.haptic([22, 34, 18]);
    if (event.type === 'monster-killed') this.haptic([12, 24, 12]);
    if (event.type === 'skill-cast') {
      const { row, flip } = directionToFrame(this.simulation.player.facing);
      const shamanSkill = SHAMAN_ACTIVE_SKILL_IDS.includes(event.skillId);
      const archerSkill = ARCHER_ACTIVE_SKILL_IDS.includes(event.skillId);
      const visual = this.currentPlayerAttackVisual('weapon', row);
      const visualNonce = ++this.skillVisualNonce;
      this.tweens.killTweensOf(this.playerActionRoot);
      this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);
      this.playerSprite.setTexture(visual.textureKey).setScale(PLAYER_SCALE).setOrigin(0.5, 0.97).setFlipX(flip).play(visual.animationKey, true);
      this.syncPlayerEquipmentLayers();
      this.attackLock = event.skillId === 'leap-strike' ? 0.72 : shamanSkill ? 0.68 : archerSkill ? 0.64 : 0.58;
      if (event.skillId === 'leap-strike' || event.skillId === 'moon-dash') {
        this.skillWorldMotion = {
          skillId: event.skillId,
          from: { ...event.from },
          to: { ...event.to },
          elapsedMs: 0,
          durationMs: event.skillId === 'leap-strike' ? 310 : 190,
        };
        this.playerRoot.setPosition(event.from.x, event.from.y).setDepth(event.from.y + 10);
      } else {
        this.skillWorldMotion = null;
      }
      if (event.skillId === 'whirlwind') {
        this.tweens.add({
          targets: this.playerActionRoot,
          rotation: Math.PI * 2,
          duration: 430,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (visualNonce === this.skillVisualNonce) this.playerActionRoot.setRotation(0);
          },
        });
      }
      const fxDelay = event.skillId === 'leap-strike' ? 245 : event.skillId === 'moon-dash' ? 110 : 0;
      if (fxDelay > 0) {
        this.time.delayedCall(fxDelay, () => {
          if (visualNonce === this.skillVisualNonce && !this.playerDefeated) {
            this.createSkillFx(event.skillId, event.from, event.to, event.rank);
          }
        });
      } else if (!archerSkill) {
        this.createSkillFx(event.skillId, event.from, event.to, event.rank);
      }
      if (shamanSkill) this.combatAudio.elemental('shadow');
      else if (!archerSkill) this.combatAudio.slash();
    }
    if (event.type === 'archer-volley') {
      this.fireHajinSkillArrows(event.skillId, event.arrows);
    }
    if (event.type === 'skill-impact') {
      const visualNonce = this.skillVisualNonce;
      const presentImpact = () => {
        if (visualNonce !== this.skillVisualNonce || this.playerDefeated) return;
        this.floatText(event.at.x, event.at.y - 112, event.targets > 0 ? `${event.targets}명 · ${event.damage}` : '빗나감', event.targets > 0 ? '#ffe2a0' : '#a9b5b4');
        this.shakeCamera(event.skillId === 'leap-strike' ? 130 : 80, event.skillId === 'leap-strike' ? 0.008 : 0.004);
        if (event.targets > 0) this.beginHitStop(event.skillId === 'leap-strike' ? 96 : 60);
      };
      const impactDelay = event.skillId === 'leap-strike' ? 245 : event.skillId === 'moon-dash' ? 110 : 0;
      if (impactDelay > 0) this.time.delayedCall(impactDelay, presentImpact);
      else presentImpact();
    }
    if (event.type === 'player-attack') {
      const { row, flip } = directionToFrame(this.simulation.player.facing);
      const frontierArcher = this.simulation.isFrontierArcher();
      const frontierBow = frontierArcher && this.simulation.isBowEquipped();
      const visual = this.currentPlayerAttackVisual(event.style, row);
      this.tweens.killTweensOf(this.playerActionRoot);
      this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);
      this.playerSprite.setTexture(visual.textureKey).setPosition(0, 0).setRotation(0)
        .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97).setFlipX(flip)
        .setTint(0xffffff).play(visual.animationKey, true);
      this.syncPlayerEquipmentLayers();
      this.attackLock = frontierBow ? 0.58 : event.style === 'weapon' ? 0.5 : 0.38;
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId)
        ?? (this.simulation.boss?.id === event.targetId ? this.simulation.boss : null);
      const angle = target
        ? Math.atan2(target.y - this.simulation.player.y, target.x - this.simulation.player.x)
        : this.simulation.player.facing;
      if (frontierBow && target) this.firePlayerArrow(target);
      else if (event.style === 'fist') this.createPunchTrail(this.simulation.player.x, this.simulation.player.y - 38, angle);
    }
    if (event.type === 'basic-chain-start') {
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId)
        ?? (this.simulation.boss?.id === event.targetId ? this.simulation.boss : null);
      const angle = target
        ? Math.atan2(target.y - this.simulation.player.y, target.x - this.simulation.player.x)
        : this.simulation.player.facing;
      const frontierBow = this.simulation.isFrontierArcher() && this.simulation.isBowEquipped();
      if (!frontierBow) this.playPlayerAttackMotion(angle, event.style, event.step);
      this.attackLock = frontierBow ? 0.58 : event.step === 3
        ? (event.style === 'weapon' ? 0.58 : 0.46)
        : event.style === 'weapon' ? 0.5 : 0.38;
      if (frontierBow) {
        // The bow release is intentionally quieter than a sword swing; impact audio lands with the arrow.
      } else if (event.style === 'weapon') this.combatAudio.slash(event.step);
      else this.combatAudio.punch(event.step);
    }
    if (event.type === 'player-impact') {
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId);
      const view = this.monsterViews.get(event.targetId);
      if (target && view) {
        const angle = Math.atan2(target.y - this.simulation.player.y, target.x - this.simulation.player.x);
        if (event.style === 'weapon' && !this.simulation.isBowEquipped()) {
          this.showPlayerWeaponImpactFrame();
          const grip = this.playerWeaponGripWorldPoint();
          this.createSlashFx(grip.x, grip.y, target.x, target.y - 40, angle, event.critical, event.step);
        } else {
          this.createPunchFx(target.x, target.y - 48, angle, event.critical, event.step);
        }
        this.createImpactFx(
          target.x,
          target.y - 52,
          event.critical,
          event.step,
          event.style === 'fist' ? 'blunt' : 'blade',
          angle,
        );
        this.createHitDebris(target.x, target.y - 48, angle, event.step, event.critical);
        this.combatNumber(target.x, target.y - 92, event.damage, event.critical, event.step);
        view.hitFlashUntil = Math.max(
          view.hitFlashUntil,
          this.time.now + (event.finisher ? 105 : event.critical ? 90 : 75),
        );
        view.sprite.setTintFill(event.finisher ? 0xffffff : event.critical ? 0xfff1b8 : 0xffb5a4);
        this.shakeCamera(
          event.finisher ? 145 : event.critical ? 105 : 62,
          event.finisher ? 0.0085 : event.critical ? 0.006 : 0.0032,
        );
        this.beginHitStop(event.finisher ? 118 : event.critical ? 92 : event.step === 2 ? 68 : 54);
        this.combatAudio.impact(event.critical, event.step);
      }
      const boss = this.simulation.boss?.id === event.targetId ? this.simulation.boss : null;
      if (boss && this.bossView) {
        const angle = Math.atan2(boss.y - this.simulation.player.y, boss.x - this.simulation.player.x);
        if (event.style === 'weapon' && !this.simulation.isBowEquipped()) {
          this.showPlayerWeaponImpactFrame();
          const grip = this.playerWeaponGripWorldPoint();
          this.createSlashFx(grip.x, grip.y, boss.x, boss.y - 54, angle, event.critical, event.step);
        }
        else this.createPunchFx(boss.x, boss.y - 58, angle, event.critical, event.step);
        this.createImpactFx(
          boss.x,
          boss.y - 62,
          event.critical,
          event.step,
          event.style === 'fist' ? 'blunt' : 'blade',
          angle,
        );
        this.createHitDebris(boss.x, boss.y - 58, angle, event.step, event.critical);
        this.combatNumber(boss.x, boss.y - 116, event.damage, event.critical, event.step);
        this.bossView.sprite.setTintFill(event.finisher ? 0xffffff : event.critical ? 0xfff1b8 : 0xff9d8d);
        this.time.delayedCall(event.finisher ? 110 : 85, () => this.bossView?.sprite.clearTint());
        this.shakeCamera(
          event.finisher ? 165 : event.critical ? 120 : 75,
          event.finisher ? 0.009 : event.critical ? 0.007 : 0.004,
        );
        this.beginHitStop(event.finisher ? 126 : event.critical ? 100 : event.step === 2 ? 72 : 60);
        this.combatAudio.impact(event.critical, event.step);
      }
    }
    if (event.type === 'basic-finisher') {
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId)
        ?? (this.simulation.boss?.id === event.targetId ? this.simulation.boss : null);
      if (target) {
        this.createFinisherShockwave(target.x, target.y - 24, event.style, event.targets);
        this.floatText(
          target.x,
          target.y - 132,
          event.targets > 1 ? `파쇄 · ${event.targets}명` : '파쇄 일격',
          '#fff0a8',
        );
      }
    }
    if (event.type === 'elemental-applied') {
      this.createElementalEffect(event.element, event.targetId, event.fromTargetId);
      this.combatAudio.elemental(event.element, Boolean(event.fromTargetId));
      const target = this.simulation.monsters.find((monster) => monster.id === event.targetId);
      if (target && !event.fromTargetId) {
        const label = event.element === 'fire' ? '화상'
          : event.element === 'ice' ? '빙결'
            : event.element === 'lightning' ? '감전'
              : event.element === 'poison' ? '중독'
                : event.element === 'wind' ? '칼바람'
                  : event.element === 'earth' ? '지맥 경직' : '암영 표식';
        const color = event.element === 'fire' ? '#ff9a55'
          : event.element === 'ice' ? '#9ee6ff'
            : event.element === 'lightning' ? '#d8b1ff'
              : event.element === 'poison' ? '#9be072'
                : event.element === 'wind' ? '#b5f7e5'
                  : event.element === 'earth' ? '#e0ad69' : '#b69be5';
        this.floatText(target.x, target.y - 112, label, color);
      }
    }
    if (event.type === 'elemental-damage') {
      this.createElementalEffect(event.element, event.targetId, event.fromTargetId, true);
      const target = this.simulation.monsters.find((monster) => monster.id === event.targetId);
      if (target) {
        const label = event.element === 'fire' ? `화상 -${event.damage}`
          : event.element === 'lightning' ? `연쇄 -${event.damage}`
            : event.element === 'poison' ? `맹독 -${event.damage}`
              : event.element === 'wind' ? `칼바람 -${event.damage}`
                : event.element === 'earth' ? `지진 -${event.damage}`
                  : event.element === 'shadow' ? `처단 -${event.damage}` : `빙결 -${event.damage}`;
        const color = event.element === 'fire' ? '#ff8750'
          : event.element === 'ice' ? '#8fddff'
            : event.element === 'lightning' ? '#d4adff'
              : event.element === 'poison' ? '#8fd35f'
                : event.element === 'wind' ? '#a5ead6'
                  : event.element === 'earth' ? '#d9a35f' : '#aa88dc';
        this.floatText(target.x, target.y - 100, label, color);
      }
      if (event.element === 'lightning' || event.element === 'earth') this.shakeCamera(event.element === 'earth' ? 85 : 45, event.element === 'earth' ? 0.004 : 0.0022);
    }
    if (event.type === 'elemental-reaction') {
      const target = this.simulation.monsters.find((monster) => monster.id === event.targetId);
      if (target) {
        const label = {
          'steam-burst': '증기 폭발', 'frost-shatter': '빙결 파쇄', 'toxic-ignition': '독기 점화',
          firestorm: '화염 폭풍', 'ground-discharge': '지맥 방전',
        }[event.reaction];
        this.floatText(target.x, target.y - 126, `${label} -${event.damage}`, '#ffe1a3');
        this.createImpactFx(target.x, target.y - 48, true);
        this.shakeCamera(95, 0.0048);
      }
    }
    if (event.type === 'elemental-heal') {
      this.floatText(this.simulation.player.x, this.simulation.player.y - 105, `흡혈 +${event.amount}`, '#c6a9ff');
    }
    if (event.type === 'boss-telegraph') this.drawBossTelegraph(event.patternId, event.origin, event.facing);
    if (event.type === 'boss-impact' && this.simulation.boss && this.bossView) {
      const boss = this.simulation.boss;
      const { row, flip } = directionToFrame(event.facing);
      this.bossView.sprite.setFlipX(flip).setScale(this.bossView.baseScale).play(`boss-attack-${boss.bossId}-${row}`, true);
      this.shakeCamera(115, 0.006);
      this.createImpactFx(event.origin.x + Math.cos(event.facing) * 80, event.origin.y + Math.sin(event.facing) * 48 - 30, boss.phase === 2);
    }
    if (event.type === 'boss-phase-changed') {
      this.alertMarker(this.simulation.boss?.x ?? this.simulation.player.x, (this.simulation.boss?.y ?? this.simulation.player.y) - 134, '2단계 · 광폭화');
      this.cameras.main.flash(320, 112, 16, 23, false);
    }
    if (event.type === 'boss-killed') {
      if (this.bossView) {
        this.bossView.hitZone.disableInteractive();
        this.tweens.add({ targets: this.bossView.sprite, angle: 78, y: 12, alpha: 0.25, duration: 620, ease: 'Cubic.easeIn' });
        this.tweens.add({ targets: this.bossView.shadow, alpha: 0.14, scaleX: 1.4, duration: 620 });
      }
      this.alertMarker(this.simulation.boss?.x ?? this.simulation.player.x, (this.simulation.boss?.y ?? this.simulation.player.y) - 128, `${event.floor}층 수문장 격파`);
    }
    if (event.type === 'dungeon-stair-lock-changed') this.renderDungeonFloor();
    if (event.type === 'dungeon-complete') this.alertMarker(this.simulation.player.x, this.simulation.player.y - 128, '무영광산 정복');
    if (event.type === 'frontier-ambush-ready') {
      const player = this.simulation.player;
      this.alertMarker(
        player.x,
        player.y - 126,
        `여진 선봉장: “조선군 ${event.joseonCount}명은 경계를 풀었다. 숨을 죽여라.”`,
        2600,
      );
      const dozing = this.simulation.monsters
        .filter((monster) => monster.region === 'manchufrontier'
          && monster.alive
          && (monster.kind === 'joseon-border-swordsman' || monster.kind === 'joseon-border-spearman'))
        .slice(0, this.mobileProfile ? 2 : 4);
      for (const [index, monster] of dozing.entries()) {
        this.time.delayedCall(500 + index * 230, () => {
          if (monster.alive) this.alertMarker(monster.x, monster.y - 104, index % 2 === 0 ? 'Zzz…' : '꾸벅…', 1450);
        });
      }
      this.time.delayedCall(2750, () => {
        if (this.simulation.region !== 'manchufrontier' || !this.simulation.isFrontierArcher()) return;
        this.alertMarker(
          this.simulation.player.x,
          this.simulation.player.y - 126,
          '하진: “첫 화살이 꽂히면 모두 남쪽으로 밀어붙여라.”',
          1900,
        );
      });
    }
    if (event.type === 'frontier-ambush-fired') {
      const target = this.simulation.monsters.find((monster) => monster.id === event.targetId);
      if (target) {
        const { row, flip } = directionToFrame(this.simulation.player.facing);
        this.playerSprite.setTexture(ASSETS.frontierArcher.key).setFlipX(flip)
          .play(`player-frontier-attack-${row}`, true);
        this.attackLock = 0.62;
        this.firePlayerArrow(target);
        this.alertMarker(this.simulation.player.x, this.simulation.player.y - 128, '하진: “지금이다!”', 1150);
      }
    }
    if (event.type === 'frontier-opening-defeated') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 132,
        `압록 첫 전투 패배 · 생존 전사 ${event.survivingWarriors}명 · 부족 통합이 새 목표다`,
        3300,
      );
    }
    if (event.type === 'jurchen-stage-cleared') {
      this.cameras.main.flash(230, 106, 137, 145, false);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 132,
        `북방 시험 완료 · ${REGIONS[event.region].name} · 북쪽 관문 개방`,
        2600,
      );
    }
    if (event.type === 'jurchen-tribe-allied') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 158,
        `${event.tribeName}의 깃발 합류 · 부족 통합 ${event.allied} / ${event.total}`,
        3000,
      );
    }
    if (event.type === 'jurchen-unified') {
      this.cameras.main.flash(520, 196, 168, 92, false);
      this.shakeCamera(280, 0.006);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 182,
        `大會盟 · 여진 ${event.allied}부 통합 · ${event.armyStrength}명과 압록으로 회군하라`,
        4200,
      );
    }
    if (event.type === 'frontier-battle-started') {
      this.cameras.main.flash(180, 88, 37, 18, false);
      this.shakeCamera(120, 0.0045);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 126,
        `설욕전 첫 화살 · 통합 여진 선봉 ${event.jurchenCount}명 돌격 · 조선군 ${event.fleeingCount}명 패주`,
        2900,
      );
    }
    if (event.type === 'frontier-clash') {
      const attacker = this.simulation.monsters.find((entry) => entry.id === event.attackerId);
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId);
      const attackerView = this.monsterViews.get(event.attackerId);
      const targetView = this.monsterViews.get(event.targetId);
      if (attacker && target && attackerView) {
        const { row, flip } = directionToFrame(attacker.facing);
        attackerView.sprite.setPosition(0, 0).setRotation(0).setFlipX(flip).setScale(attackerView.baseScale)
          .play(`monster-attack-${attacker.kind}-${row}`, true);
        this.playMonsterAttackMotion(attackerView, attacker);
        this.playFrontierCombatFx(event.attackKind, attacker, target);
        if (event.ranged) this.fireJoseonArrow(attacker, target);
      }
      if (target && targetView && this.cameras.main.worldView.contains(target.x, target.y)) {
        if (event.attackKind === 'blade') this.createImpactFx(target.x, target.y - 45, false);
        targetView.shadow.setScale(1.08, 0.82);
        this.time.delayedCall(105, () => targetView.shadow.setScale(1, 1));
      }
    }
    if (event.type === 'frontier-unit-fallen') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) this.showMonsterCorpse(monster, view);
    }
    if (event.type === 'frontier-unit-fled') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (monster) this.floatText(monster.x, monster.y - 94, '전의 상실 · 패주', '#b9cfdb');
    }
    if (event.type === 'frontier-mission-cleared') {
      this.syncFrontierSouthGateState(true);
      this.cameras.main.flash(420, 142, 102, 35, false);
      this.shakeCamera(260, 0.008);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        'MISSION CLEAR · 압록 진보 함락 · 남진 성문 개방',
        3600,
      );
    }
    if (event.type === 'southward-gate-blocked') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 122,
        `아직 남문을 열 수 없다 · 남은 전선 목표 ${event.remaining}`,
        1900,
      );
    }
    if (event.type === 'hajin-warband-formed') {
      this.time.delayedCall(950, () => {
        this.alertMarker(
          this.simulation.player.x,
          this.simulation.player.y - 124,
          `여진 선봉장: “${event.count}명의 선봉이 하진과 끝까지 남진한다.”`,
          2500,
        );
      });
    }
    if (event.type === 'hajin-reinforcements-called') {
      this.cameras.main.flash(170, 73, 98, 72, false);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 128,
        `원군 도착 · ${event.deployed}명 합류 · 전장 ${event.fielded}명 · 예비 ${event.reserve}명`,
        2600,
      );
    }
    if (event.type === 'hajin-reinforcements-blocked') {
      const message = event.reason === 'mission'
        ? '남문 전투에서 승리해야 원군 봉화를 올릴 수 있다.'
        : event.reason === 'reserve'
          ? '더 부를 수 있는 예비 병력이 없다.'
          : `전장 지휘 한도 도달 · 현재 ${event.fielded}명`;
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 122, message, 1900);
    }
    if (event.type === 'gwanghae-reinforcements-called') {
      this.cameras.main.flash(170, 76, 108, 134, false);
      this.haptic([18, 24, 18]);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 128,
        `분조군 ${event.deployed}명 출진 · 전장 ${event.fielded}명 · 예비병 ${event.reserve}명`,
        2600,
      );
    }
    if (event.type === 'gwanghae-reinforcements-blocked') {
      const message = event.reason === 'register'
        ? '승정원 주서에게 분조 의병 명부를 먼저 받으십시오.'
        : event.reason === 'suppression'
          ? '왕명 집행 노선에서는 의병을 다시 부를 수 없습니다.'
          : event.reason === 'reserve'
            ? '호출할 예비병이 부족합니다.'
            : event.reason === 'field-capacity'
              ? `전장 지휘 한도 도달 · 현재 ${event.fielded}명`
              : '광해군 이야기에서만 분조군을 호출할 수 있습니다.';
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 122, message, 2100);
    }
    if (event.type === 'gwanghae-enemy-reinforcement') {
      this.cameras.main.flash(120, 112, 43, 35, false);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        `${event.path === 'coup' ? '왕당군' : '삼남 의병'} 후속대 · 적 잔존 ${event.remaining}명 · 예비 ${event.reserve}명`,
        1750,
      );
    }
    if (event.type === 'hajin-southward-march-started') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 124,
        `제2전역 개시 · 여진 선봉 ${event.count}명과 ${REGIONS[event.to].name} 진입`,
        2800,
      );
    }
    if (event.type === 'tangeum-gunline-alert') {
      this.cameras.main.flash(240, 122, 90, 58, false);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 136,
        `탄금대 전멸전 · 왜군 ${event.total}명 · 조총수 ${event.gunners}명 일제 조준`,
        3300,
      );
    }
    if (event.type === 'tangeum-gate-blocked') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 126,
        `한성 진군로 봉쇄 · 남은 왜군 ${event.remaining}명 전멸 필요`,
        2200,
      );
    }
    if (event.type === 'tangeum-forces-annihilated') {
      this.cameras.main.flash(480, 156, 116, 54, false);
      this.shakeCamera(320, 0.009);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        `MISSION CLEAR · 왜군 ${event.defeated}명 전멸 · 한성 파발로 개방`,
        3800,
      );
    }
    if (event.type === 'pyongyang-gate-blocked') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 126,
        `${REGIONS[event.region].name} 전진문 봉쇄 · 남은 수비군 ${event.remaining}명`,
        2300,
      );
    }
    if (event.type === 'pyongyang-stage-cleared') {
      this.syncPyongyangAdvanceGates(true);
      this.cameras.main.flash(360, 126, 103, 66, false);
      this.shakeCamera(210, 0.0065);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        `MISSION CLEAR · ${REGIONS[event.region].name} 수비군 ${event.defeated}명 제압 · 전진문 개방`,
        3600,
      );
    }
    if (event.type === 'king-refuge-choice') {
      this.playRoyalRefugeChoice(event.title, event.dialogue);
    }
    if (event.type === 'royal-refuge-route-selected') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        `${event.routeName} · 왕의 어가 추격 개시`,
        3200,
      );
      this.cameras.main.flash(300, 114, 96, 70, false);
      this.syncRoyalRefugeGates(false);
    }
    if (event.type === 'royal-refuge-stage-cleared') {
      this.syncRoyalRefugeGates(true);
      this.cameras.main.flash(380, 146, 116, 72, false);
      this.shakeCamera(240, 0.007);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        event.nextStageName
          ? `MISSION CLEAR · ${event.stageName} 붕괴 · ${event.nextStageName} 개방`
          : `MISSION CLEAR · ${event.stageName} 최종 방어 붕괴`,
        3800,
      );
    }
    if (event.type === 'royal-refuge-final-defense-cleared') {
      this.syncRoyalRefugeGates(true);
      this.cameras.main.flash(620, 206, 169, 96, false);
      this.shakeCamera(420, 0.012);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 150,
        `${event.title} · 왕의 마지막 피난처 포위`,
        4600,
      );
    }
    if (event.type === 'osaka-departure-blocked') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 126,
        `출병문 봉쇄 · 남은 감시대 ${event.remaining}명`,
        2200,
      );
    }
    if (event.type === 'osaka-departure-ready') {
      this.cameras.main.flash(340, 92, 132, 150, false);
      this.shakeCamera(180, 0.005);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        `MISSION CLEAR · 포로촌 감시대 ${event.defeated}명 제압 · 셋쓰 내륙문 개방`,
        3600,
      );
    }
    if (event.type === 'japan-gate-blocked' && event.region !== 'osaka') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 126,
        `${REGIONS[event.region].name} 진군문 봉쇄 · 남은 목표 ${event.remaining}`,
        2200,
      );
    }
    if (event.type === 'japan-stage-cleared') this.syncJapanGatePlaques();
    if (event.type === 'japan-stage-cleared' && event.region !== 'osaka') {
      this.cameras.main.flash(360, 116, 145, 102, false);
      this.shakeCamera(210, 0.006);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 142,
        `MISSION CLEAR · ${JAPAN_STAGE_COPY[event.region].title} · ${JAPAN_STAGE_COPY[event.region].next} 길 개방`,
        3600,
      );
    }
    if (event.type === 'shogun-phase-changed') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (monster) {
        this.cameras.main.flash(260, 118, 28, 24, false);
        this.shakeCamera(330, 0.011);
        this.alertMarker(monster.x, monster.y - 138, '군선봉행 2단계 · “전군, 목숨을 바쳐 길을 막아라!”', 3300);
        for (let index = 0; index < 3; index += 1) {
          const ring = this.add.ellipse(monster.x, monster.y + 4, 94, 32, 0x4e120f, 0.08)
            .setStrokeStyle(4, 0xe8704b, 0.9).setDepth(monster.y - 2);
          this.tweens.add({
            targets: ring,
            scaleX: 3.2 + index * 0.9,
            scaleY: 2.5 + index * 0.7,
            alpha: 0,
            delay: index * 120,
            duration: 620,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
          });
        }
      }
    }
    if (event.type === 'shogun-defeated') {
      this.cameras.main.flash(520, 208, 172, 90, false);
      this.shakeCamera(440, 0.013);
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 150,
        `군선봉행 격파 · ${event.gold}전 · 무공 점수 ${event.skillPoints} · 강화 주문서 전리품`,
        4200,
      );
    }
    if (event.type === 'monster-attack') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) {
        const { row, flip } = directionToFrame(monster.facing);
        view.baseScale = monsterScaleForRegion(
          monster.kind,
          monster.region,
          row,
          MONSTER_SCALE[monster.kind],
        );
        view.sprite.setPosition(0, 0).setRotation(0).setFlipX(flip).setScale(view.baseScale)
          .play(`monster-attack-${monster.kind}-${row}`, true);
        this.playMonsterAttackMotion(view, monster);
        if (monster.kind === 'japanese-gunner' || monster.kind === 'osaka-gunner') {
          this.fireMusketShot(monster);
        } else if (RANGED_MONSTER_KINDS.has(monster.kind)) {
          this.fireJoseonArrow(monster);
        }
      }
    }
    if (event.type === 'follower-recruited') {
      const view = this.createFollowerView(event.follower);
      view.root.setAlpha(0).setScale(0.82);
      this.tweens.add({ targets: view.root, alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' });
      if (event.route !== 'invasion' && event.route !== 'bunjo') {
        this.alertMarker(event.follower.x, event.follower.y - 118, `${event.follower.name}: “이제부터 함께 싸우겠습니다.”`, 1800);
      }
    }
    if (event.type === 'follower-attack') {
      const follower = this.simulation.followers.find((entry) => entry.id === event.followerId);
      const view = this.followerViews.get(event.followerId);
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId) ?? this.simulation.boss;
      if (follower && view && target) {
        const direction = directionToFrame(follower.facing);
        view.sprite.setPosition(0, 0).setRotation(0).setScale(view.baseScale).setFlipX(direction.flip)
          .play(`monster-attack-${follower.visualKind}-${direction.row}`, true);
        if (event.attackKind === 'arrow') {
          this.time.delayedCall(92, () => this.fireFollowerArrow(follower, target));
        } else {
          const color = event.attackKind === 'command' ? 0xe8b56b
            : follower.kind === 'special-warrior' ? 0xcda8f5
              : event.attackKind === 'spear' ? 0xbad69d : 0xe1c17e;
          const strike = this.add.graphics().setDepth(target.y + 18).setBlendMode(Phaser.BlendModes.ADD);
          strike.lineStyle(follower.kind === 'special-warrior' ? 6 : 4, color, 0.88)
            .lineBetween(follower.x, follower.y - 42, target.x, target.y - 36);
          this.tweens.add({ targets: strike, alpha: 0, scaleX: 1.08, duration: 170, onComplete: () => strike.destroy() });
        }
      }
    }
    if (event.type === 'monster-alert') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (monster) this.alertMarker(monster.x, monster.y - 100, '!');
    }
    if (event.type === 'guard-action') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) {
        if (event.action === 'brace') {
          this.alertMarker(monster.x, monster.y - 108, '방어!');
          this.tweens.killTweensOf(view.sprite);
          this.tweens.add({
            targets: view.sprite,
            x: -Math.cos(monster.facing) * 6,
            y: -Math.sin(monster.facing) * 4,
            duration: 105,
            yoyo: true,
            ease: 'Quad.easeOut',
          });
        } else if (event.action === 'lunge') {
          this.alertMarker(monster.x, monster.y - 108, '돌격!');
          this.chargeTelegraph(monster.x, monster.y, monster.facing);
        } else {
          this.alertMarker(monster.x, monster.y - 118, '전열을 갖춰라!');
          const rally = this.add.ellipse(monster.x, monster.y + 2, 92, 34, 0x7f4b20, 0.08)
            .setStrokeStyle(3, 0xe6bd69, 0.92).setDepth(monster.y - 1);
          this.tweens.add({
            targets: rally,
            scaleX: 2.9,
            scaleY: 2.4,
            alpha: 0,
            duration: 420,
            ease: 'Cubic.easeOut',
            onComplete: () => rally.destroy(),
          });
          this.shakeCamera(80, 0.0025);
        }
      }
    }
    if (event.type === 'prison-guards-provoked') {
      const guard = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (guard) this.alertMarker(
        guard.x,
        guard.y - 112,
        event.cause === 'execution' ? '포졸: 형을 따라 저승으로 보내주마! 쳐라!' : '뭐야! 죄수가 난동을 부린다!',
        event.cause === 'execution' ? 2800 : 1500,
      );
      this.shakeCamera(120, 0.0045);
    }
    if (event.type === 'government-guards-provoked') {
      const guard = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (guard) this.alertMarker(guard.x, guard.y - 112, '침입자다! 관아 포졸 전원 집결!');
      this.shakeCamera(150, 0.0055);
    }
    if (event.type === 'government-entry-blocked') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 118,
        `김동혁: 아직은 무리다. ${event.requiredLevel}품이 될 때까지 마을과 윗사냥터에서 수련하자.`,
      );
    }
    if (event.type === 'world-event-started') {
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 142, `돌발 사건 · ${event.event.title}`);
      this.cameras.main.flash(180, 93, 68, 31, false);
    }
    if (event.type === 'world-event-ended') {
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, `${event.title} 종료`);
    }
    if (event.type === 'world-event-progress') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 118,
        `북방 사건 · ${event.progress} / ${event.goal}`,
        900,
      );
    }
    if (event.type === 'world-event-completed') {
      this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 132,
        `사건 완수 · ${event.itemName ?? '전선 보급품'} · ${event.gold}전`,
        2100,
      );
      this.cameras.main.flash(220, 132, 106, 52, false);
    }
    if (event.type === 'landmark-discovered') {
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 124, `${event.title} · ${event.reward}`);
      this.cameras.main.flash(150, 116, 93, 45, false);
    }
    if (event.type === 'landmark-blocked') {
      const message = event.reason === 'used' ? '이미 살펴본 장소다'
        : event.reason === 'locked' ? '탐관오리를 쓰러뜨린 뒤 열 수 있다' : '행낭이 가득 찼다';
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 112, message);
    }
    if (event.type === 'ulleung-magistrate-spawned') {
      const magistrate = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (magistrate) this.alertMarker(magistrate.x, magistrate.y - 130, '최종 보스 · 탐관오리 이방 서병관');
      this.cameras.main.flash(360, 112, 20, 18, false);
      this.shakeCamera(220, 0.007);
    }
    if (event.type === 'wako-pact-revealed') {
      const magistrate = this.simulation.monsters.find((entry) => entry.id === event.magistrateId);
      const speakerX = magistrate?.x ?? this.simulation.player.x;
      const speakerY = magistrate?.y ?? this.simulation.player.y;
      this.alertMarker(
        speakerX,
        speakerY - 136,
        '서병관: 울릉도와 선착장을 넘길 테니, 왜선과 조총병을 지금 들여보내라!',
        2100,
      );
      this.time.delayedCall(1800, () => this.alertMarker(
        event.dock.x,
        event.dock.y - 126,
        '왜구 대장: 약속한 세곡과 항구를 받으러 왔다. 섬의 백성은 전리품이다!',
        2200,
      ));
      this.time.delayedCall(3650, () => this.alertMarker(
        this.simulation.player.x,
        this.simulation.player.y - 132,
        '김동혁: 백성을 팔아 섬까지 넘기다니… 서병관, 네 밀약은 오늘 끝난다!',
        1900,
      ));
      this.cameras.main.flash(220, 92, 28, 20, false);
    }
    if (event.type === 'wako-invasion-started') {
      this.alertMarker(event.dock.x, event.dock.y - 118, `왜구 침공 · 선착장 상륙군 ${event.count}명`, 3600);
      this.cameras.main.flash(420, 126, 32, 18, false);
      this.shakeCamera(420, 0.009);
    }
    if (event.type === 'government-dock-guidance') {
      this.alertMarker(event.dock.x, event.dock.y - 124, '서병관 격파 · 동쪽 선착장으로 이동 중', 2800);
      this.destinationMark.setPosition(event.dock.x, event.dock.y).setVisible(true).setScale(1);
    }
    if (event.type === 'monster-charge') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (monster) this.chargeTelegraph(monster.x, monster.y, monster.facing);
    }
    if (event.type === 'player-hit') {
      this.playerSprite.setTint(0xff8b76);
      this.playerArmorSprite.setTint(0xff8b76);
      this.playerWeaponSprite.setTint(0xff8b76);
      this.time.delayedCall(90, () => {
        if (!this.playerDefeated) {
          this.playerSprite.clearTint();
          this.playerArmorSprite.clearTint();
          this.playerWeaponSprite.clearTint();
        }
      });
      this.floatText(this.simulation.player.x, this.simulation.player.y - 88, `-${event.damage}`, '#ef7c6d');
      this.createPlayerHitPulse();
      this.tweens.killTweensOf(this.playerActionRoot);
      this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);
      this.tweens.add({
        targets: this.playerActionRoot,
        x: -Math.cos(this.simulation.player.facing) * 9,
        y: -Math.sin(this.simulation.player.facing) * 7,
        rotation: 0.025,
        duration: 58,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => this.playerActionRoot.setPosition(0, 0).setRotation(0),
      });
      this.shakeCamera(90, 0.0045);
      this.combatAudio.impact(false);
    }
    if (event.type === 'monster-killed') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) {
        this.createKillConfirm(monster);
        this.showMonsterCorpse(monster, view);
      }
    }
    if (event.type === 'monster-respawn') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) this.resetMonsterView(monster, view);
    }
    if (event.type === 'player-defeated') {
      this.showPlayerCorpse();
    }
    if (event.type === 'player-respawn') {
      this.resetPlayerView();
      this.playerRoot.setAlpha(0.25);
      this.tweens.add({ targets: this.playerRoot, alpha: 1, duration: 650, ease: 'Sine.easeInOut' });
    }
    if (event.type === 'player-quickstep') {
      const angle = this.simulation.player.facing + Math.PI;
      for (let index = 0; index < 3; index += 1) {
        this.time.delayedCall(index * 35, () => this.createDust(
          this.simulation.player.x + Math.cos(angle) * index * 12,
          this.simulation.player.y + Math.sin(angle) * index * 7,
        ));
      }
      this.playerRoot.setAlpha(0.62);
      this.tweens.add({ targets: this.playerRoot, alpha: 1, duration: 150, ease: 'Cubic.easeOut' });
    }
    if (event.type === 'perfect-dodge') {
      const player = this.simulation.player;
      this.floatText(player.x, player.y - 112, '완벽 회피 · 기세 +25', '#d8f4ff');
      const ring = this.add.ellipse(player.x, player.y + 3, 54, 22, 0x8ad5e8, 0.08)
        .setStrokeStyle(3, 0xc5f2ff, 0.9)
        .setDepth(player.y - 1);
      this.tweens.add({
        targets: ring,
        scaleX: 2.4,
        scaleY: 2,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
      this.cameras.main.flash(75, 124, 190, 214, false);
    }
    if (event.type === 'momentum-burst') {
      const player = this.simulation.player;
      this.alertMarker(player.x, player.y - 132, '월하각성 · 기세 폭발');
      for (let index = 0; index < 3; index += 1) {
        const aura = this.add.ellipse(player.x, player.y + 4, 58, 24, 0x9edff0, 0.04)
          .setStrokeStyle(3 - index * 0.5, index === 0 ? 0xf5e3a3 : 0x9edff0, 0.92 - index * 0.18)
          .setDepth(player.y - 1);
        this.tweens.add({
          targets: aura,
          scaleX: 2.5 + index * 0.65,
          scaleY: 2.2 + index * 0.5,
          alpha: 0,
          duration: 480 + index * 130,
          delay: index * 45,
          ease: 'Cubic.easeOut',
          onComplete: () => aura.destroy(),
        });
      }
      this.cameras.main.flash(180, 88, 153, 178, false);
      this.shakeCamera(120, 0.003);
    }
    if (event.type === 'quest-complete') {
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, '토벌 완수');
    }
    if (event.type === 'training-progress' && this.trainingTree) {
      const tree = this.trainingTree;
      const baseScaleX = 172 / tree.width;
      const baseScaleY = 172 / tree.height;
      this.tweens.killTweensOf(tree);
      tree.setTintFill(0xe9d19b).setScale(baseScaleX * 1.04, baseScaleY * 0.96);
      this.tweens.add({
        targets: tree, scaleX: baseScaleX, scaleY: baseScaleY, duration: 180, ease: 'Back.easeOut',
        onComplete: () => tree.setTint(0xb2b6a1),
      });
      this.createImpactFx(REGION_ORIGINS.ulleunghunt.x + 430, REGION_ORIGINS.ulleunghunt.y + 495, false);
      this.combatAudio.punch();
    }
    if (event.type === 'prison-gate-opened' && this.prisonGate) {
      const gate = this.prisonGate;
      this.prisonGate = null;
      this.alertMarker(
        REGION_ORIGINS.ulleungdo.x + ULLEUNG_ROAD_ANCHORS.ulleungdo.northX,
        REGION_ORIGINS.ulleungdo.y + 255,
        '감옥 북문 개방 · 위쪽 사냥터로 탈출',
      );
      this.tweens.add({ targets: gate, alpha: 0, scaleX: 1.18, duration: 520, ease: 'Cubic.easeOut', onComplete: () => gate.destroy(true) });
    }
    if (event.type === 'ulleung-village-liberated') {
      const origin = REGION_ORIGINS.ulleungvillage;
      this.alertMarker(origin.x + 768, origin.y + 470, '울릉 관아 함락 · 백성 해방');
      this.openGovernmentDock();
      const defenders = this.villageNpcs.filter((npc) => npc.id.startsWith('ulleung-'));
      defenders.forEach((npc, index) => {
        npc.dialogue = '김동혁 님, 살려 주셔서 감사합니다. 이제 저희가 이 마을과 관청 길목을 지키겠습니다.';
        npc.patrol = index < 2
          ? [{ x: origin.x + 690 + index * 150, y: origin.y + 260 }, { x: origin.x + 690 + index * 150, y: origin.y + 310 }]
          : npc.patrol;
        npc.patrolIndex = 0;
      });
    }
    if (event.type === 'government-dock-blocked') {
      const origin = REGION_ORIGINS.ulleungvillage;
      this.alertMarker(origin.x + 1300, origin.y + 730, '관아를 해방해야 배를 띄울 수 있다');
    }
    if (event.type === 'government-dock-used') {
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 112, '본토 · 달빛고을 도착');
    }
    if (event.type === 'item-equipped') {
      this.attackLock = 0;
      this.tweens.killTweensOf(this.playerActionRoot);
      this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);
      this.tweens.killTweensOf(this.playerSprite);
      this.playerSprite.stop().setPosition(0, 0).setRotation(0);
      this.syncPlayer();
      this.syncPlayerEquipmentLayers();
    }
    if (event.type === 'region-changed') {
      this.syncJapanGatePlaques();
      const previousCameraRegion = this.cameraRegion;
      const previousIslandIndex = ULLEUNG_REGION_IDS.indexOf(previousCameraRegion as UlleungRegionId);
      const nextIslandIndex = ULLEUNG_REGION_IDS.indexOf(event.region as UlleungRegionId);
      const continuousIslandTravel = previousIslandIndex >= 0
        && nextIslandIndex >= 0
        && Math.abs(previousIslandIndex - nextIslandIndex) === 1;
      const continuousWorldTravel = continuousIslandTravel
        || isContinuousWorldNeighbor(previousCameraRegion, event.region);
      if (isJoseonTownRegion(event.region)) this.ensureJoseonTownNeighborhood(event.region);
      if (continuousIslandTravel) {
        this.cameras.main.setBounds(
          ULLEUNG_WORLD_BOUNDS.x,
          ULLEUNG_WORLD_BOUNDS.y,
          ULLEUNG_WORLD_BOUNDS.width,
          ULLEUNG_WORLD_BOUNDS.height,
        );
      } else {
        const continuityBounds = continuityCameraBoundsForRegion(event.region);
        if (continuityBounds) {
          this.cameras.main.setBounds(
            continuityBounds.x,
            continuityBounds.y,
            continuityBounds.width,
            continuityBounds.height,
          );
        } else if (event.region === 'dungeon'
          || event.region === 'yeongwol' || event.region === 'yeongwolhq'
          || event.region === 'jeonjufield' || event.region === 'jeonjugate' || event.region === 'jeonju'
          || event.region === 'busanjin' || event.region === 'tangeumdae'
          || event.region === 'gyeongbokgate' || event.region === 'gyeongbokcourt'
          || event.region === 'gyeongbokinner'
          || event.region === 'manchufrontier'
          || isRoyalRefugeRegion(event.region)
          || isPyongyangRegion(event.region)
          || isExtendedRegion(event.region)
          || isEpisode2Region(event.region)) {
          const origin = REGION_ORIGINS[event.region];
          this.cameras.main.setBounds(origin.x, origin.y, MAP_WIDTH, MAP_HEIGHT);
        } else {
          this.cameras.main.setBounds(WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH, WORLD_HEIGHT);
        }
      }
      /*
       * Neighbouring maps now share one camera strip. Re-starting follow or
       * centring at those borders produces the exact tug the terrain seam is
       * meant to remove. Long story travel still centres immediately so the
       * camera never glides through several empty map cells.
       */
      if (!continuousWorldTravel) {
        this.cameras.main.startFollow(this.playerRoot, true, 0.085, 0.085);
        this.cameras.main.centerOn(this.simulation.player.x, this.simulation.player.y);
      }
      this.cameraRegion = event.region;
      if (!continuousWorldTravel) {
        for (const corpse of this.corpseViews) corpse.root.destroy(true);
        this.corpseViews = [];
      }
      if (event.region !== 'dungeon') this.destroyBossView();
      for (const monster of this.simulation.monsters) {
        const view = this.monsterViews.get(monster.id);
        if (view) this.resetMonsterView(monster, view);
      }
      this.syncRoyalRefugeGates(false);
    }
    if (event.type === 'dungeon-floor-changed') {
      this.renderDungeonFloor();
      const compact = this.scale.gameSize.width <= 600;
      this.regionLabel
        .setPosition(this.scale.gameSize.width / 2, compact ? 104 : Math.max(92, this.scale.gameSize.height * 0.18))
        .setFontSize(compact ? 17 : 25)
        .setPadding(compact ? 11 : 18, compact ? 6 : 9)
        .setText(compact ? `${event.title} · ${event.floor}층` : `${event.title}  ·  ${event.floor}층 / ${event.maxFloor}층`)
        .setColor('#e7c17c').setAlpha(0).setScale(0.92);
      this.tweens.killTweensOf(this.regionLabel);
      this.tweens.add({ targets: this.regionLabel, alpha: { from: 0, to: 1 }, scale: 1, duration: 260, yoyo: true, hold: 1450 });
      this.cameras.main.flash(220, 34, 22, 18, false);
    }
  }

  private createSkillFx(skillId: SkillId, from: { x: number; y: number }, to: { x: number; y: number }, rank: number): void {
    const fx = this.add.graphics().setDepth(to.y + 24).setBlendMode(Phaser.BlendModes.ADD);
    if (skillId === 'spirit-bell') {
      fx.setPosition(to.x, to.y - 28);
      fx.fillStyle(0x6252a8, 0.16).fillCircle(0, 0, 96 + rank * 9);
      fx.lineStyle(5, 0xb6f4ed, 0.88).strokeCircle(0, 0, 50 + rank * 7);
      fx.lineStyle(2, 0x9d8ee8, 0.78).strokeCircle(0, 0, 88 + rank * 9);
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * Math.PI * 2;
        fx.lineBetween(
          Math.cos(angle) * 44,
          Math.sin(angle) * 26,
          Math.cos(angle) * (112 + rank * 8),
          Math.sin(angle) * (66 + rank * 5),
        );
      }
      this.tweens.add({
        targets: fx,
        angle: 42,
        scaleX: 1.34,
        scaleY: 0.82,
        alpha: 0,
        duration: 480,
        ease: 'Cubic.easeOut',
        onComplete: () => fx.destroy(),
      });
      return;
    }
    if (skillId === 'talisman-flame') {
      const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
      fx.lineStyle(12, 0x8ce8dc, 0.18).lineBetween(from.x, from.y - 42, to.x, to.y - 36);
      fx.lineStyle(3, 0xd9fff4, 0.86).lineBetween(from.x, from.y - 42, to.x, to.y - 36);
      fx.fillStyle(0x516bc0, 0.22).fillCircle(to.x, to.y - 34, 76 + rank * 8);
      fx.lineStyle(4, 0x9cf8e2, 0.9).strokeCircle(to.x, to.y - 34, 54 + rank * 7);
      for (let index = 0; index < 6; index += 1) {
        const flameAngle = angle + index / 6 * Math.PI * 2;
        fx.lineBetween(
          to.x + Math.cos(flameAngle) * 20,
          to.y - 34 + Math.sin(flameAngle) * 12,
          to.x + Math.cos(flameAngle) * (82 + rank * 7),
          to.y - 34 + Math.sin(flameAngle) * (50 + rank * 4),
        );
      }
      this.tweens.add({
        targets: fx,
        scaleX: 1.22,
        scaleY: 1.1,
        alpha: 0,
        duration: 430,
        ease: 'Cubic.easeOut',
        onComplete: () => fx.destroy(),
      });
      return;
    }
    if (skillId === 'soul-binding-gut') {
      fx.setPosition(to.x, to.y - 26);
      fx.fillStyle(0x342b76, 0.2).fillCircle(0, 0, 118 + rank * 10);
      fx.lineStyle(4, 0xa9efe7, 0.84).strokeCircle(0, 0, 78 + rank * 8);
      fx.lineStyle(2, 0xb69de9, 0.76).strokeCircle(0, 0, 122 + rank * 10);
      for (let index = 0; index < 4; index += 1) {
        const angle = Math.PI / 4 + index * Math.PI / 2;
        const x = Math.cos(angle) * (74 + rank * 7);
        const y = Math.sin(angle) * (42 + rank * 4);
        fx.strokeCircle(x, y, 18 + rank * 2);
        fx.lineBetween(-x, -y, x, y);
      }
      this.tweens.add({
        targets: fx,
        angle: -58,
        scaleX: 1.16,
        scaleY: 0.76,
        alpha: 0,
        duration: 620,
        ease: 'Sine.easeOut',
        onComplete: () => fx.destroy(),
      });
      return;
    }
    if (skillId === 'exile-possession') {
      fx.setPosition(to.x, to.y - 30);
      fx.fillStyle(0x30215f, 0.24).fillCircle(0, 0, 148 + rank * 12);
      fx.lineStyle(6, 0xe0fff5, 0.84).strokeCircle(0, 0, 82 + rank * 8);
      fx.lineStyle(3, 0x9f75df, 0.9).strokeCircle(0, 0, 146 + rank * 12);
      fx.lineStyle(2, 0x75ddd2, 0.76).strokeCircle(0, 0, 188 + rank * 13);
      for (let index = 0; index < 12; index += 1) {
        const angle = index / 12 * Math.PI * 2;
        fx.lineBetween(
          Math.cos(angle) * 56,
          Math.sin(angle) * 34,
          Math.cos(angle) * (198 + rank * 12),
          Math.sin(angle) * (118 + rank * 7),
        );
      }
      this.tweens.add({
        targets: fx,
        angle: 95,
        scaleX: 1.38,
        scaleY: 0.88,
        alpha: 0,
        duration: 720,
        ease: 'Cubic.easeOut',
        onComplete: () => fx.destroy(),
      });
      return;
    }
    if (skillId === 'whirlwind') {
      fx.lineStyle(5 + rank, 0xe7dbc0, 0.82).strokeCircle(to.x, to.y - 22, 105 + rank * 10);
      fx.lineStyle(2, 0xb63f31, 0.72).strokeCircle(to.x, to.y - 22, 82 + rank * 8);
      this.tweens.add({ targets: fx, angle: 150, scaleX: 1.2, scaleY: 0.72, alpha: 0, duration: 470, ease: 'Cubic.easeOut', onComplete: () => fx.destroy() });
      return;
    }
    if (skillId === 'leap-strike') {
      fx.fillStyle(0xd9b66f, 0.22).fillCircle(to.x, to.y, 82 + rank * 8);
      fx.lineStyle(4, 0xf3e2bd, 0.86).strokeCircle(to.x, to.y, 56 + rank * 10);
      for (let i = 0; i < 10; i += 1) {
        const angle = i / 10 * Math.PI * 2;
        fx.lineBetween(to.x + Math.cos(angle) * 22, to.y + Math.sin(angle) * 12, to.x + Math.cos(angle) * (92 + rank * 8), to.y + Math.sin(angle) * (48 + rank * 4));
      }
      this.tweens.add({ targets: fx, scaleX: 1.25, scaleY: 1.1, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => fx.destroy() });
      return;
    }
    if (skillId === 'crescent-wave') {
      const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
      const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      fx.setPosition(from.x, from.y - 34).setRotation(angle);
      fx.lineStyle(13 + rank * 2, 0x7bb9d2, 0.16);
      fx.beginPath().arc(distance * 0.72, 0, 72 + rank * 14, -0.82, 0.82).strokePath();
      fx.lineStyle(5 + rank, 0xe8f5ed, 0.88);
      fx.beginPath().arc(distance * 0.72, 0, 68 + rank * 13, -0.72, 0.72).strokePath();
      fx.lineStyle(2, 0x9fd6e4, 0.72);
      fx.beginPath().arc(distance * 0.72 - 10, 0, 49 + rank * 10, -0.66, 0.66).strokePath();
      this.tweens.add({
        targets: fx,
        x: from.x + Math.cos(angle) * 34,
        y: from.y - 34 + Math.sin(angle) * 34,
        scaleX: 1.3,
        scaleY: 1.15,
        alpha: 0,
        duration: 440,
        ease: 'Cubic.easeOut',
        onComplete: () => fx.destroy(),
      });
      return;
    }
    fx.lineStyle(12, 0x9ecdea, 0.22).lineBetween(from.x, from.y - 34, to.x, to.y - 34);
    fx.lineStyle(4, 0xf1f3e7, 0.9).lineBetween(from.x, from.y - 38, to.x, to.y - 38);
    fx.lineStyle(2, 0x7aa9cc, 0.75).lineBetween(from.x, from.y - 24, to.x, to.y - 52);
    this.tweens.add({ targets: fx, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => fx.destroy() });
  }

  private createSlashFx(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    angle: number,
    critical: boolean,
    step: BasicAttackStep = 1,
  ): void {
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const slash = this.add.graphics({ x: fromX, y: fromY }).setDepth(1900).setRotation(angle).setScale(0.65);
    const element = this.simulation.getEquippedWeaponElement();
    const elementColor = element === 'fire' ? 0xff6d2f
      : element === 'ice' ? 0x8bddff
        : element === 'lightning' ? 0xc58cff
          : element === 'poison' ? 0x80d45a
            : element === 'wind' ? 0x9bead7
              : element === 'earth' ? 0xc98c49
                : element === 'shadow' ? 0x8d69c7 : 0xf1e2bd;
    const finisher = step === 3;
    const middleY = step === 2 ? 9 : finisher ? -12 : -8;
    const endY = step === 2 ? -7 : finisher ? 9 : 6;
    slash.lineStyle(finisher ? 8 : critical ? 6 : 4, finisher ? 0xffe29a : critical ? 0xffd574 : elementColor, 0.96);
    slash.beginPath().moveTo(0, 0).lineTo(distance * 0.55, middleY).lineTo(distance, endY).strokePath();
    slash.lineStyle(1, 0xffffff, 0.9);
    slash.beginPath().moveTo(1, 2).lineTo(distance * 0.62, middleY * 0.45).lineTo(distance - 5, endY + 2).strokePath();
    if (finisher) {
      slash.lineStyle(3, elementColor, 0.72);
      slash.beginPath().moveTo(-4, -9).lineTo(distance * 0.64, 4).lineTo(distance + 10, -5).strokePath();
    }
    this.tweens.add({
      targets: slash,
      scaleX: finisher ? 1.42 : 1.18,
      scaleY: finisher ? 1.42 : 1.18,
      alpha: 0,
      duration: finisher ? 225 : 150,
      ease: 'Cubic.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  private createElementalEffect(
    element: WeaponElement,
    targetId: string,
    fromTargetId?: string,
    secondary = false,
  ): void {
    const target = this.simulation.monsters.find((monster) => monster.id === targetId);
    if (!target) return;
    if (element === 'fire') {
      const count = secondary ? 3 : 7;
      for (let index = 0; index < count; index += 1) {
        const ember = this.add.circle(
          target.x + Phaser.Math.Between(-22, 22),
          target.y - Phaser.Math.Between(20, 70),
          Phaser.Math.Between(3, 7),
          index % 2 ? 0xffb347 : 0xff4f1f,
          0.88,
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(target.y + 18);
        this.tweens.add({
          targets: ember,
          x: ember.x + Phaser.Math.Between(-14, 14),
          y: ember.y - Phaser.Math.Between(32, 72),
          scale: 0.18,
          alpha: 0,
          duration: Phaser.Math.Between(260, 470),
          ease: 'Cubic.easeOut',
          onComplete: () => ember.destroy(),
        });
      }
      return;
    }
    if (element === 'ice') {
      const ice = this.add.graphics({ x: target.x, y: target.y - 45 }).setDepth(target.y + 18);
      ice.lineStyle(3, 0xb9efff, 0.94);
      for (let index = 0; index < 8; index += 1) {
        const angle = Math.PI * 2 * index / 8;
        const inner = secondary ? 8 : 13;
        const outer = secondary ? 25 : 42;
        ice.beginPath()
          .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
          .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
          .strokePath();
      }
      ice.fillStyle(0x72d8ff, 0.16).fillCircle(0, 0, secondary ? 18 : 28);
      this.tweens.add({
        targets: ice,
        scaleX: 1.32,
        scaleY: 1.32,
        alpha: 0,
        duration: secondary ? 210 : 360,
        ease: 'Cubic.easeOut',
        onComplete: () => ice.destroy(),
      });
      return;
    }
    if (element === 'poison') {
      const count = secondary ? 3 : 7;
      for (let index = 0; index < count; index += 1) {
        const bubble = this.add.circle(
          target.x + Phaser.Math.Between(-24, 24),
          target.y - Phaser.Math.Between(24, 72),
          Phaser.Math.Between(3, 7),
          index % 2 ? 0x9ee85d : 0x3e8d42,
          0.78,
        ).setStrokeStyle(1, 0xd9ff96, 0.65).setDepth(target.y + 18);
        this.tweens.add({
          targets: bubble,
          y: bubble.y - Phaser.Math.Between(25, 55),
          x: bubble.x + Phaser.Math.Between(-12, 12),
          scale: 0.2,
          alpha: 0,
          duration: Phaser.Math.Between(330, 560),
          onComplete: () => bubble.destroy(),
        });
      }
      return;
    }
    if (element === 'wind') {
      const wind = this.add.graphics({ x: target.x, y: target.y - 46 }).setDepth(target.y + 18);
      wind.lineStyle(secondary ? 3 : 5, 0xbff8e8, 0.88);
      for (let arc = 0; arc < (secondary ? 2 : 4); arc += 1) {
        wind.beginPath().arc(0, 0, 20 + arc * 10, -1.2 + arc * 0.18, 1.05 + arc * 0.12).strokePath();
      }
      this.tweens.add({
        targets: wind, x: wind.x + 42, scaleX: 1.25, alpha: 0,
        duration: secondary ? 180 : 290, ease: 'Cubic.easeOut', onComplete: () => wind.destroy(),
      });
      return;
    }
    if (element === 'earth') {
      const quake = this.add.graphics({ x: target.x, y: target.y - 4 }).setDepth(target.y + 17);
      quake.lineStyle(secondary ? 3 : 5, 0xe1b06c, 0.9);
      quake.strokeEllipse(0, 0, secondary ? 60 : 92, secondary ? 24 : 38);
      for (let index = 0; index < 7; index += 1) {
        const angle = Math.PI * 2 * index / 7;
        quake.beginPath().moveTo(Math.cos(angle) * 18, Math.sin(angle) * 7)
          .lineTo(Math.cos(angle + 0.12) * 50, Math.sin(angle + 0.12) * 20).strokePath();
      }
      this.tweens.add({
        targets: quake, scaleX: 1.35, scaleY: 1.35, alpha: 0,
        duration: secondary ? 220 : 380, ease: 'Cubic.easeOut', onComplete: () => quake.destroy(),
      });
      return;
    }
    if (element === 'shadow') {
      const shadow = this.add.circle(target.x, target.y - 48, secondary ? 18 : 30, 0x5d3a88, 0.5)
        .setStrokeStyle(secondary ? 2 : 4, 0xb592e8, 0.82)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(target.y + 18);
      this.tweens.add({
        targets: shadow,
        x: secondary ? shadow.x : this.simulation.player.x,
        y: secondary ? shadow.y - 22 : this.simulation.player.y - 58,
        scale: 0.2,
        alpha: 0,
        duration: secondary ? 260 : 420,
        ease: 'Sine.easeIn',
        onComplete: () => shadow.destroy(),
      });
      return;
    }

    const from = fromTargetId
      ? this.simulation.monsters.find((monster) => monster.id === fromTargetId)
      : this.simulation.player;
    if (!from) return;
    const start = { x: from.x, y: from.y - (fromTargetId ? 48 : 58) };
    const end = { x: target.x, y: target.y - 52 };
    const lightning = this.add.graphics().setDepth(Math.max(start.y, end.y) + 40);
    const points = [start];
    for (let index = 1; index < 7; index += 1) {
      const ratio = index / 7;
      points.push({
        x: Phaser.Math.Linear(start.x, end.x, ratio) + Phaser.Math.Between(-10, 10),
        y: Phaser.Math.Linear(start.y, end.y, ratio) + Phaser.Math.Between(-9, 9),
      });
    }
    points.push(end);
    lightning.lineStyle(9, 0x8f56ff, 0.22).beginPath().moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) lightning.lineTo(point.x, point.y);
    lightning.strokePath();
    lightning.lineStyle(3, 0xf1e6ff, 0.96).beginPath().moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) lightning.lineTo(point.x, point.y);
    lightning.strokePath();
    this.tweens.add({
      targets: lightning,
      alpha: 0,
      duration: secondary ? 170 : 230,
      ease: 'Stepped',
      onComplete: () => lightning.destroy(),
    });
  }

  private playerWeaponGripWorldPoint(): { x: number; y: number } {
    if (this.simulation.isGwanghaePrince()) {
      const facing = this.simulation.player.facing;
      return {
        x: this.playerRoot.x + Math.cos(facing) * 28,
        y: this.playerRoot.y - 46 + Math.sin(facing) * 14,
      };
    }
    return this.playerWeaponSprite.getWorldTransformMatrix().transformPoint(0, 0);
  }

  private showPlayerWeaponImpactFrame(): void {
    const { row, flip } = directionToFrame(this.simulation.player.facing);
    this.playerSprite.setFrame(frameForPlayerLayer(row, weaponImpactColumnForRow(row))).setFlipX(flip);
    this.syncPlayerEquipmentLayers();
  }

  private drawBossTelegraph(patternId: string, origin: { x: number; y: number }, facing: number): void {
    const definition = bossForFloor(this.simulation.dungeonFloor);
    const pattern = definition?.patterns.find((entry) => entry.id === patternId);
    if (!pattern) return;
    const warning = this.add.graphics().setDepth(1880);
    warning.fillStyle(0xc6453d, 0.22).lineStyle(3, 0xff8b72, 0.92);
    if (pattern.shape.kind === 'circle') {
      warning.fillCircle(origin.x, origin.y, pattern.shape.radius).strokeCircle(origin.x, origin.y, pattern.shape.radius);
      const decal = this.add.image(origin.x, origin.y, ASSETS.dungeonTelegraphs.key, 0)
        .setDisplaySize(pattern.shape.radius * 2.08, pattern.shape.radius * 2.08)
        .setDepth(1881)
        .setAlpha(0.8);
      this.tweens.add({ targets: decal, alpha: 0, scaleX: decal.scaleX * 1.08, scaleY: decal.scaleY * 1.08, duration: pattern.telegraphSeconds * 1000, onComplete: () => decal.destroy() });
    } else if (pattern.shape.kind === 'arena') {
      warning.fillCircle(origin.x, origin.y, pattern.shape.radius).strokeCircle(origin.x, origin.y, pattern.shape.radius);
      warning.lineStyle(3, 0x9de0bf, 0.95).strokeCircle(origin.x, origin.y, pattern.shape.safeRadius);
      const decal = this.add.image(origin.x, origin.y, ASSETS.dungeonTelegraphs.key, 0)
        .setDisplaySize(pattern.shape.radius * 2.08, pattern.shape.radius * 2.08)
        .setDepth(1881)
        .setAlpha(0.72);
      this.tweens.add({ targets: decal, angle: 90, alpha: 0, duration: pattern.telegraphSeconds * 1000, onComplete: () => decal.destroy() });
    } else if (pattern.shape.kind === 'line') {
      const x = origin.x + Math.cos(facing) * pattern.shape.length / 2;
      const y = origin.y + Math.sin(facing) * pattern.shape.length / 2;
      warning.fillRect(-pattern.shape.length / 2, -pattern.shape.width / 2, pattern.shape.length, pattern.shape.width)
        .strokeRect(-pattern.shape.length / 2, -pattern.shape.width / 2, pattern.shape.length, pattern.shape.width)
        .setPosition(x, y).setRotation(facing);
      const decal = this.add.image(x, y, ASSETS.dungeonTelegraphs.key, 2)
        .setDisplaySize(pattern.shape.length, Math.max(84, pattern.shape.width * 1.35))
        .setRotation(facing)
        .setDepth(1881)
        .setAlpha(0.78);
      this.tweens.add({ targets: decal, alpha: 0, duration: pattern.telegraphSeconds * 1000, onComplete: () => decal.destroy() });
    } else {
      const points = [new Phaser.Geom.Point(origin.x, origin.y)];
      const start = facing - pattern.shape.arc / 2;
      for (let index = 0; index <= 12; index += 1) {
        const angle = start + pattern.shape.arc * (index / 12);
        points.push(new Phaser.Geom.Point(origin.x + Math.cos(angle) * pattern.shape.radius, origin.y + Math.sin(angle) * pattern.shape.radius));
      }
      warning.fillPoints(points, true).strokePoints(points, true);
      const decal = this.add.image(origin.x, origin.y, ASSETS.dungeonTelegraphs.key, 1)
        .setDisplaySize(pattern.shape.radius * 2.05, pattern.shape.radius * 2.05)
        .setRotation(facing)
        .setDepth(1881)
        .setAlpha(0.76);
      this.tweens.add({ targets: decal, alpha: 0, scaleX: decal.scaleX * 1.06, scaleY: decal.scaleY * 1.06, duration: pattern.telegraphSeconds * 1000, onComplete: () => decal.destroy() });
    }
    this.tweens.add({
      targets: warning, alpha: { from: 0.3, to: 1 }, duration: 115, yoyo: true,
      repeat: Math.max(1, Math.floor(pattern.telegraphSeconds * 1000 / 230)),
      onComplete: () => warning.destroy(),
    });
  }

  private createPunchFx(x: number, y: number, angle: number, critical: boolean, step: BasicAttackStep = 1): void {
    const finisher = step === 3;
    const shock = this.add.graphics({ x, y }).setDepth(1900).setRotation(angle);
    shock.lineStyle(finisher ? 7 : critical ? 5 : 3, finisher ? 0xffe6a0 : critical ? 0xffd36d : 0xe9dcc1, 0.95);
    shock.strokeCircle(0, 0, finisher ? 20 : critical ? 15 : 10);
    shock.beginPath().moveTo(finisher ? -31 : -20, -8).lineTo(-4, -2).strokePath();
    shock.beginPath().moveTo(finisher ? -34 : -22, 8).lineTo(-4, 2).strokePath();
    this.tweens.add({
      targets: shock,
      scaleX: finisher ? 2.35 : 1.8,
      scaleY: finisher ? 2.35 : 1.8,
      alpha: 0,
      duration: finisher ? 230 : 145,
      ease: 'Cubic.easeOut', onComplete: () => shock.destroy(),
    });
  }

  private createPunchTrail(x: number, y: number, angle: number): void {
    const trail = this.add.graphics({ x, y }).setDepth(1895).setRotation(angle);
    trail.lineStyle(6, 0xf2ce82, 0.94);
    trail.beginPath().moveTo(8, 0).lineTo(76, 0).strokePath();
    trail.lineStyle(2, 0xffffff, 0.98);
    trail.beginPath().moveTo(18, -3).lineTo(80, -3).strokePath();
    trail.fillStyle(0xffefc6, 0.96).fillCircle(78, 0, 6);
    this.tweens.add({
      targets: trail, scaleX: 1.3, scaleY: 0.78, alpha: 0, duration: 180,
      ease: 'Cubic.easeOut', onComplete: () => trail.destroy(),
    });
  }

  private showMonsterCorpse(monster: MonsterState, view: MonsterView): void {
    const pose = MONSTER_CORPSE_POSE[monster.kind];
    const fallbackSign = Number(monster.id.split('-')[1]) % 2 === 0 ? 1 : -1;
    const fallSign = Math.abs(monster.knockback.x) > 1 ? Math.sign(monster.knockback.x) : fallbackSign;
    const direction = directionToFrame(monster.facing);
    const textureKey = ASSETS.monsters[monster.kind].key;

    this.tweens.killTweensOf(view.sprite);
    this.tweens.killTweensOf(view.shadow);
    view.sprite.stop();
    view.root.setVisible(false);
    view.ring.setVisible(false);
    view.hp.clear().setVisible(false);
    view.hitZone.setVisible(false);
    if (view.hitZone.input) view.hitZone.input.enabled = false;

    if (this.corpseViews.length >= MAX_MONSTER_CORPSES) {
      const oldest = this.corpseViews.shift();
      if (oldest) {
        this.tweens.killTweensOf(oldest.root);
        this.tweens.killTweensOf(oldest.sprite);
        this.tweens.killTweensOf(oldest.shadow);
        oldest.root.destroy(true);
      }
    }

    const stain = this.add.ellipse(0, 7, isLowQuadrupedMonster(monster.kind) ? 72 : 58, isLowQuadrupedMonster(monster.kind) ? 22 : 18, 0x361916, 0.14);
    const shadow = this.add.ellipse(0, 4, isLowQuadrupedMonster(monster.kind) ? 78 : 62, isLowQuadrupedMonster(monster.kind) ? 24 : 20, 0x090907, 0.34);
    const deathElement: WeaponElement | null = monster.elemental.burnSeconds > 0 ? 'fire'
      : monster.elemental.frostSeconds > 0 ? 'ice'
        : monster.elemental.shockSeconds > 0 ? 'lightning'
          : monster.elemental.poisonSeconds > 0 ? 'poison'
            : monster.elemental.stoneSeconds > 0 ? 'earth'
              : monster.elemental.gustSeconds > 0 ? 'wind'
                : monster.elemental.shadowSeconds > 0 ? 'shadow' : null;
    const corpseTint = deathElement === 'fire' ? 0x9b5437
      : deathElement === 'ice' ? 0x86b5c7
        : deathElement === 'lightning' ? 0x9d7bb5
          : deathElement === 'poison' ? 0x76945e
            : deathElement === 'earth' ? 0x8f765d
              : deathElement === 'wind' ? 0x8eaaa2
                : deathElement === 'shadow' ? 0x675878 : 0xb5afa3;
    const corpseSprite = this.add.sprite(0, 0, textureKey, pose.frame)
      .setVisible(true).setPosition(0, 0).setRotation(0).setOrigin(0.5, pose.originY)
      .setScale(view.baseScale).setAlpha(1).setTint(corpseTint)
      .setFlipX(isLowQuadrupedMonster(monster.kind) ? direction.flip : fallSign < 0);
    const corpseRoot = this.add.container(monster.x, monster.y, [stain, shadow, corpseSprite]).setDepth(monster.y - 1);
    const corpse: CorpseView = {
      root: corpseRoot,
      sprite: corpseSprite,
      shadow,
      remainingMs: MONSTER_CORPSE_LIFETIME_MS,
      fading: false,
    };
    this.corpseViews.push(corpse);
    if (deathElement) {
      this.createElementalEffect(deathElement, monster.id, undefined, false);
      if (deathElement === 'fire') {
        const fireball = this.add.circle(monster.x, monster.y - 42, 32, 0xff5a20, 0.72)
          .setStrokeStyle(5, 0xffc15c, 0.9)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(monster.y + 24);
        this.tweens.add({
          targets: fireball,
          scale: 1.8,
          alpha: 0,
          duration: 360,
          ease: 'Cubic.easeOut',
          onComplete: () => fireball.destroy(),
        });
      }
    }

    this.tweens.add({
      targets: corpseSprite,
      x: fallSign * pose.x,
      y: pose.y,
      angle: fallSign * pose.angle,
      scaleX: view.baseScale * pose.scaleX,
      scaleY: view.baseScale * pose.scaleY,
      alpha: 0.88,
      duration: isLowQuadrupedMonster(monster.kind) ? 190 : 235,
      ease: 'Cubic.easeIn',
      onComplete: () => corpseSprite.setTint(deathElement === 'fire' ? 0x4f3028
        : deathElement === 'ice' ? 0x627d87
          : deathElement === 'lightning' ? 0x685a73
            : deathElement === 'poison' ? 0x4d6544
              : deathElement === 'earth' ? 0x66523f
                : deathElement === 'wind' ? 0x60766f
                  : deathElement === 'shadow' ? 0x493c59 : 0x8d887c),
    });
    this.tweens.add({
      targets: shadow,
      alpha: 0.2,
      scaleX: isLowQuadrupedMonster(monster.kind) ? 1.28 : 1.18,
      scaleY: 0.58,
      duration: 220,
      ease: 'Cubic.easeOut',
    });
    this.createDust(monster.x - fallSign * 8, monster.y + 1);
  }

  private resetMonsterView(monster: MonsterState, view: MonsterView): void {
    const direction = directionToFrame(monster.facing);
    this.tweens.killTweensOf(view.sprite);
    this.tweens.killTweensOf(view.shadow);
    view.root.setVisible(true).setPosition(monster.x, monster.y).setDepth(monster.y);
    view.sprite.stop().clearTint().setVisible(true).setAlpha(1).setAngle(0)
      .setPosition(0, 0).setOrigin(0.5, 0.97).setScale(view.baseScale)
      .setFlipX(direction.flip).setTexture(ASSETS.monsters[monster.kind].key, direction.row * 8);
    view.sprite.anims.timeScale = 1;
    view.shadow.setVisible(true).setAlpha(0.4).setScale(1, 1);
    view.intentCue.clear().setVisible(false);
    view.lastAiState = null;
    view.lastIntentCue = 'none';
    view.hitFlashUntil = 0;
  }

  private showPlayerCorpse(): void {
    const player = this.simulation.player;
    const direction = directionToFrame(player.facing);
    const visual = this.currentPlayerMovementVisual(direction.row);
    const horizontal = Math.cos(player.facing);
    const fallSign = Math.abs(horizontal) > 0.1 ? Math.sign(horizontal) : 1;

    this.playerDefeated = true;
    this.attackLock = 0;
    this.tweens.killTweensOf(this.playerActionRoot);
    this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);
    this.tweens.killTweensOf(this.playerSprite);
    this.tweens.killTweensOf(this.playerShadow);
    this.playerArmorSprite.setTint(0xb7aea0);
    this.playerWeaponSprite.setTint(0xb7aea0);
    this.playerSprite.stop().setTexture(visual.textureKey, visual.idleFrame + 3)
      .setPosition(0, 0).setRotation(0).setScale(PLAYER_SCALE).setOrigin(0.5, 0.97)
      .setFlipX(direction.flip).setAlpha(1).setTint(0xb7aea0);
    this.syncPlayerEquipmentLayers();
    this.playerWeaponAura.setVisible(false);
    this.playerShadow.setVisible(true).setAlpha(0.36).setScale(1, 1);
    this.tweens.add({
      targets: this.playerActionRoot,
      x: fallSign,
      y: -4,
      angle: fallSign * 76,
      scaleY: 0.9,
      alpha: 0.88,
      duration: 245,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.playerSprite.setTint(0x948d82);
        this.playerArmorSprite.setTint(0x948d82);
        this.playerWeaponSprite.setTint(0x948d82);
      },
    });
    this.tweens.add({ targets: this.playerShadow, alpha: 0.2, scaleX: 1.2, scaleY: 0.58, duration: 230 });
    this.createDust(player.x - fallSign * 8, player.y + 1);
  }

  private resetPlayerView(): void {
    const player = this.simulation.player;
    const direction = directionToFrame(player.facing);
    const visual = this.currentPlayerMovementVisual(direction.row);
    this.tweens.killTweensOf(this.playerActionRoot);
    this.tweens.killTweensOf(this.playerSprite);
    this.tweens.killTweensOf(this.playerShadow);
    this.anims.resumeAll();
    this.playerDefeated = false;
    this.lastPlayerSimulationPosition = { x: player.x, y: player.y };
    this.playerRoot.setPosition(player.x, player.y).setDepth(player.y + 10).setAlpha(1);
    this.playerActionRoot.setPosition(0, 0).setRotation(0).setScale(1).setAlpha(1);
    this.playerSprite.stop().clearTint().setAlpha(1).setAngle(0).setPosition(0, 0)
      .setOrigin(0.5, 0.97).setScale(PLAYER_SCALE).setFlipX(direction.flip)
      .setTexture(visual.textureKey, visual.idleFrame);
    this.playerArmorSprite.clearTint();
    this.playerWeaponSprite.clearTint();
    this.syncPlayerEquipmentLayers();
    this.playerSprite.anims.timeScale = 1;
    this.playerShadow.setVisible(true).setAlpha(0.42).setScale(1, 1);
  }

  private playPlayerAttackMotion(angle: number, style: 'fist' | 'weapon', step: BasicAttackStep = 1): void {
    const lunge = (style === 'weapon' ? 12 : 9) + (step === 3 ? 7 : step === 2 ? 2 : 0);
    const rotation = step === 1 ? -0.012 : step === 2 ? 0.016 : -0.025;
    this.tweens.killTweensOf(this.playerActionRoot);
    this.playerActionRoot
      .setPosition(
        step === 3 ? -Math.cos(angle) * 5 : 0,
        step === 3 ? -Math.sin(angle) * 4 : 0,
      )
      .setRotation(0).setScale(1).setAlpha(1);
    this.tweens.add({
      targets: this.playerActionRoot,
      x: Math.cos(angle) * lunge,
      y: Math.sin(angle) * lunge,
      rotation,
      duration: step === 3 ? 112 : style === 'weapon' ? 78 : 64,
      yoyo: true,
      ease: step === 3 ? 'Cubic.easeIn' : 'Quad.easeOut',
      onComplete: () => this.playerActionRoot.setPosition(0, 0).setRotation(0),
    });
  }

  private playMonsterAttackMotion(view: MonsterView, monster: { kind: MonsterKind; facing: number }): void {
    const isArcher = RANGED_MONSTER_KINDS.has(monster.kind);
    const isSpearman = monster.kind === 'ulleung-veteran' || monster.kind === 'yeongwol-spearman'
      || monster.kind === 'jeonju-spearman' || monster.kind === 'manchu-lancer'
      || monster.kind === 'joseon-border-spearman' || monster.kind === 'japanese-spearman';
    const lunge = isArcher ? -4 : monster.kind === 'manchu-cavalry' ? 29
      : monster.kind === 'japanese-shogun' ? 25
        : isLowQuadrupedMonster(monster.kind) ? 19 : isSpearman ? 18 : monster.kind === 'bandit' ? 13 : 11;
    this.tweens.killTweensOf(view.sprite);
    this.tweens.add({
      targets: view.sprite,
      x: Math.cos(monster.facing) * lunge,
      y: Math.sin(monster.facing) * lunge,
      duration: isArcher ? 235 : 205,
      yoyo: true,
      ease: 'Cubic.easeIn',
    });
  }

  private playFrontierCombatFx(
    attackKind: 'arrow' | 'spear' | 'cavalry' | 'command' | 'blade',
    attacker: { x: number; y: number; facing: number },
    target: { x: number; y: number },
  ): void {
    if (!this.cameras.main.worldView.contains(target.x, target.y)
      && !this.cameras.main.worldView.contains(attacker.x, attacker.y)) return;
    const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    const depth = Math.max(attacker.y, target.y) + 72;
    const burst = (
      frame: number,
      x: number,
      y: number,
      fromScale: number,
      toScale: number,
      rotation = 0,
      duration = 250,
    ) => {
      const image = this.add.image(x, y, ASSETS.frontierCombatFx.key, frame)
        .setScale(fromScale)
        .setRotation(rotation)
        .setAlpha(0.92)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depth);
      this.tweens.add({
        targets: image,
        scale: toScale,
        alpha: 0,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => image.destroy(),
      });
      return image;
    };

    if (attackKind === 'arrow') {
      burst(4, attacker.x + Math.cos(angle) * 24, attacker.y - 66, 0.12, 0.28, angle, 190);
      return;
    }
    if (attackKind === 'cavalry') {
      burst(0, attacker.x - Math.cos(angle) * 30, attacker.y - 12, 0.2, 0.46, angle, 330);
      burst(1, (attacker.x + target.x) / 2, (attacker.y + target.y) / 2 - 35, 0.18, 0.42, angle, 230);
      burst(3, target.x, target.y - 44, 0.16, 0.38, angle, 260);
      return;
    }
    if (attackKind === 'command') {
      burst(6, target.x, target.y - 38, 0.16, 0.58, angle, 360);
      return;
    }
    burst(attackKind === 'spear' ? 2 : 3, target.x, target.y - 45, 0.16, 0.39, angle, 245);
  }

  private fireJoseonArrow(
    monster: { x: number; y: number; facing: number },
    target: { x: number; y: number } = this.simulation.player,
  ): void {
    const startX = monster.x + Math.cos(monster.facing) * 22;
    const startY = monster.y - 68 + Math.sin(monster.facing) * 12;
    const targetX = target.x;
    const targetY = target.y - 48;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const arrow = this.add.image(startX, startY, ASSETS.projectiles.joseonArrow.key)
      .setOrigin(0.86, 0.5)
      .setRotation(angle)
      .setScale(0.62)
      .setDepth(Math.max(monster.y, target.y) + 70);
    this.tweens.add({
      targets: arrow,
      x: targetX,
      y: targetY,
      duration: 205,
      ease: 'Linear',
      onComplete: () => arrow.destroy(),
    });
  }

  private fireFollowerArrow(
    follower: { x: number; y: number; facing: number },
    target: { x: number; y: number },
  ): void {
    const facing = Math.atan2(target.y - follower.y, target.x - follower.x);
    const startX = follower.x + Math.cos(facing) * 25 - Math.sin(facing) * 4;
    const startY = follower.y - 67 + Math.sin(facing) * 11 + Math.cos(facing) * 3;
    const targetX = target.x;
    const targetY = target.y - 48;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    const arrow = this.add.image(startX, startY, ASSETS.projectiles.joseonArrow.key)
      .setOrigin(0.86, 0.5)
      .setRotation(angle)
      .setScale(0.66)
      .setTint(0xd7c48b)
      .setDepth(Math.max(follower.y, target.y) + 70);
    this.tweens.add({
      targets: arrow,
      x: targetX,
      y: targetY,
      duration: Phaser.Math.Clamp(distance * 0.94, 175, 315),
      ease: 'Linear',
      onComplete: () => {
        this.createImpactFx(arrow.x, arrow.y, false, 1, 'pierce', arrow.rotation);
        arrow.destroy();
      },
    });
  }

  private fireMusketShot(monster: { x: number; y: number; facing: number }): void {
    const target = this.simulation.player;
    const startX = monster.x + Math.cos(monster.facing) * 28;
    const startY = monster.y - 62 + Math.sin(monster.facing) * 10;
    const targetX = target.x;
    const targetY = target.y - 48;
    const tracer = this.add.graphics().setDepth(Math.max(monster.y, target.y) + 74);
    tracer.lineStyle(2, 0xffd98a, 0.92);
    tracer.beginPath().moveTo(startX, startY).lineTo(targetX, targetY).strokePath();
    const flash = this.add.circle(startX, startY, 16, 0xffbf5f, 0.74)
      .setDepth(tracer.depth + 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    const smoke = this.add.circle(startX, startY, 9, 0xc9c1ae, 0.42)
      .setDepth(tracer.depth + 2);
    this.tweens.add({
      targets: tracer,
      alpha: 0,
      duration: 115,
      onComplete: () => tracer.destroy(),
    });
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.9,
      duration: 150,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
    this.tweens.add({
      targets: smoke,
      x: startX - Math.cos(monster.facing) * 18,
      y: startY - 18,
      alpha: 0,
      scale: 2.4,
      duration: 460,
      ease: 'Sine.easeOut',
      onComplete: () => smoke.destroy(),
    });
    this.shakeCamera(75, this.mobileProfile ? 0.0024 : 0.0034);
  }

  private firePlayerArrow(target: { x: number; y: number }): void {
    const player = this.simulation.player;
    const startX = player.x + Math.cos(player.facing) * 24;
    const startY = player.y - 67 + Math.sin(player.facing) * 10;
    const targetX = target.x;
    const targetY = target.y - 48;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    const arrow = this.add.image(startX, startY, ASSETS.projectiles.joseonArrow.key)
      .setOrigin(0.86, 0.5)
      .setRotation(angle)
      .setScale(0.68)
      .setTint(0xd9e2b3)
      .setDepth(Math.max(player.y, target.y) + 70);
    this.tweens.add({
      targets: arrow,
      x: targetX,
      y: targetY,
      duration: Phaser.Math.Clamp(distance * 0.92, 170, 300),
      ease: 'Linear',
      onComplete: () => arrow.destroy(),
    });
  }

  private fireHajinSkillArrows(
    skillId: SkillId,
    arrows: Array<{ targetId: string; from: { x: number; y: number }; to: { x: number; y: number } }>,
  ): void {
    const isRain = skillId === 'crescent-arrow-rain';
    const isPiercing = skillId === 'iron-cavalry-shot';
    arrows.forEach((shot, index) => {
      const startX = shot.from.x;
      const startY = shot.from.y - 66;
      const initialTargetX = shot.to.x;
      const initialTargetY = shot.to.y - 48;
      const direction = Math.atan2(initialTargetY - startY, initialTargetX - startX);
      const perpendicular = (index - (arrows.length - 1) / 2) * (isRain ? 9 : 13);
      const controlX = (startX + initialTargetX) / 2 - Math.sin(direction) * perpendicular;
      const controlY = (startY + initialTargetY) / 2 + Math.cos(direction) * perpendicular - (isRain ? 190 : 38);
      const arrow = this.add.image(startX, startY, ASSETS.projectiles.joseonArrow.key)
        .setOrigin(0.86, 0.5)
        .setRotation(direction)
        .setScale(isPiercing ? 0.9 : 0.7)
        .setTint(isRain ? 0xd9c8ff : isPiercing ? 0xffe3a0 : 0xbfe8d2)
        .setDepth(Math.max(startY, initialTargetY) + 110);
      const progress = { value: 0 };
      this.tweens.add({
        targets: progress,
        value: 1,
        duration: isRain ? 430 + index * 15 : isPiercing ? 245 : 260 + index * 14,
        ease: isRain ? 'Sine.easeIn' : 'Cubic.easeIn',
        onUpdate: () => {
          const liveTarget = this.simulation.monsters.find((monster) => monster.id === shot.targetId && monster.alive)
            ?? (this.simulation.boss?.id === shot.targetId && this.simulation.boss.alive ? this.simulation.boss : null);
          const endX = liveTarget?.x ?? shot.to.x;
          const endY = (liveTarget?.y ?? shot.to.y) - 48;
          const t = progress.value;
          const inverse = 1 - t;
          const x = inverse * inverse * startX + 2 * inverse * t * controlX + t * t * endX;
          const y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * endY;
          const tangentX = 2 * inverse * (controlX - startX) + 2 * t * (endX - controlX);
          const tangentY = 2 * inverse * (controlY - startY) + 2 * t * (endY - controlY);
          arrow.setPosition(x, y).setRotation(Math.atan2(tangentY, tangentX));
        },
        onComplete: () => {
          this.createImpactFx(
            arrow.x,
            arrow.y,
            isPiercing,
            isPiercing ? 3 : 1,
            'pierce',
            arrow.rotation,
          );
          arrow.destroy();
        },
      });
    });
  }

  private createImpactFx(
    x: number,
    y: number,
    critical: boolean,
    step: BasicAttackStep = 1,
    kind: 'blade' | 'pierce' | 'blunt' = 'blade',
    rotation = 0,
  ): void {
    const finisher = step === 3;
    const atlasFrame = finisher || critical ? 3 : kind === 'pierce' ? 1 : kind === 'blunt' ? 2 : 0;
    this.game.canvas.dataset.combatFxFrame = `${atlasFrame}`;
    const decal = this.add.image(x, y, ASSETS.combatImpacts.key, atlasFrame)
      .setDepth(1948)
      .setRotation(atlasFrame === 0 ? rotation : atlasFrame === 1 ? rotation : 0)
      .setScale(finisher ? 0.18 : critical ? 0.16 : kind === 'blunt' ? 0.14 : 0.13)
      .setAlpha(finisher ? 0.96 : 0.88);
    this.tweens.add({
      targets: decal,
      scaleX: decal.scaleX * (finisher ? 1.7 : 1.46),
      scaleY: decal.scaleY * (finisher ? 1.7 : 1.46),
      alpha: 0,
      duration: finisher ? 250 : critical ? 215 : 175,
      ease: 'Cubic.easeOut',
      onComplete: () => decal.destroy(),
    });
    const impact = this.add.graphics({ x, y }).setDepth(1950);
    impact.fillStyle(finisher ? 0xffffff : critical ? 0xffcf62 : 0xf5ead0, 0.94)
      .fillCircle(0, 0, finisher ? 14 : critical ? 10 : 7);
    impact.lineStyle(finisher ? 5 : critical ? 3 : 2, finisher ? 0xffe188 : critical ? 0xffc44e : 0xfff1d0, 0.98);
    const rays = finisher ? 14 : critical ? 10 : 7;
    for (let index = 0; index < rays; index += 1) {
      const angle = (Math.PI * 2 * index) / rays;
      const inner = finisher ? 12 : critical ? 9 : 7;
      const outer = finisher ? 45 : critical ? 31 : 22;
      impact.beginPath()
        .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .strokePath();
    }
    this.tweens.add({
      targets: impact,
      scaleX: finisher ? 1.85 : 1.45,
      scaleY: finisher ? 1.85 : 1.45,
      alpha: 0,
      duration: finisher ? 245 : 175,
      ease: 'Cubic.easeOut',
      onComplete: () => impact.destroy(),
    });
  }

  private createHitDebris(
    x: number,
    y: number,
    angle: number,
    step: BasicAttackStep,
    critical: boolean,
  ): void {
    const count = this.mobileProfile
      ? (step === 3 ? 6 : 3)
      : step === 3 ? 11 : critical ? 7 : 5;
    for (let index = 0; index < count; index += 1) {
      const spread = angle + Phaser.Math.FloatBetween(-0.85, 0.85);
      const speed = Phaser.Math.Between(step === 3 ? 42 : 28, step === 3 ? 92 : 62);
      const shard = this.add.rectangle(
        x,
        y,
        step === 3 ? Phaser.Math.Between(3, 7) : Phaser.Math.Between(2, 5),
        step === 3 ? Phaser.Math.Between(10, 18) : Phaser.Math.Between(6, 12),
        index % 3 === 0 ? 0x8d2720 : critical || step === 3 ? 0xffd67d : 0xf2e4c8,
        0.92,
      ).setRotation(spread).setBlendMode(index % 3 === 0 ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD)
        .setDepth(1952);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(spread) * speed,
        y: y + Math.sin(spread) * speed + Phaser.Math.Between(-8, 12),
        angle: Phaser.Math.Between(-150, 150),
        scaleX: 0.2,
        scaleY: 0.35,
        alpha: 0,
        duration: Phaser.Math.Between(180, step === 3 ? 330 : 250),
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private createFinisherShockwave(
    x: number,
    y: number,
    style: 'fist' | 'weapon',
    targets: number,
  ): void {
    const color = style === 'weapon' ? 0xf1d58b : 0xd5b675;
    const ring = this.add.ellipse(x, y + 20, 54, 22, color, 0.08)
      .setStrokeStyle(style === 'weapon' ? 5 : 4, color, 0.94)
      .setDepth(y + 8);
    const inner = this.add.ellipse(x, y + 20, 32, 13, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setDepth(y + 9);
    this.tweens.add({
      targets: ring,
      scaleX: style === 'weapon' ? 3.5 + Math.min(1, targets * 0.18) : 2.8,
      scaleY: style === 'weapon' ? 2.8 : 2.25,
      alpha: 0,
      duration: 330,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.tweens.add({
      targets: inner,
      scaleX: 2.35,
      scaleY: 2,
      alpha: 0,
      duration: 210,
      ease: 'Cubic.easeOut',
      onComplete: () => inner.destroy(),
    });
  }

  private combatNumber(
    x: number,
    y: number,
    damage: number,
    critical: boolean,
    step: BasicAttackStep,
  ): void {
    if (!this.gameSettings.damageNumbers) return;
    const finisher = step === 3;
    const label = finisher
      ? `파쇄 ${damage}`
      : critical ? `치명 ${damage}` : step === 2 ? `2격 · ${damage}` : `-${damage}`;
    const text = this.add.text(x, y, label, {
      fontFamily: 'serif',
      fontSize: finisher ? '25px' : critical ? '22px' : step === 2 ? '19px' : '17px',
      fontStyle: 'bold',
      color: finisher ? '#fff0a8' : critical ? '#ffd77c' : step === 2 ? '#ffe1ae' : '#f6e8cf',
      stroke: finisher ? '#5a1c14' : '#2a120e',
      strokeThickness: finisher ? 6 : 4,
    }).setOrigin(0.5).setDepth(2002).setScale(finisher ? 0.62 : 0.86);
    this.tweens.add({
      targets: text,
      y: y - (finisher ? 44 : 30),
      scale: finisher ? 1.12 : 1,
      alpha: 0,
      duration: finisher ? 860 : 680,
      ease: finisher ? 'Back.easeOut' : 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private applyGameSettings(settings: GameSettings): void {
    this.gameSettings = { ...settings };
    saveGameSettings(this.gameSettings);
    document.body.dataset.graphicsQuality = settings.graphicsQuality;
    document.body.classList.toggle('reduce-game-motion', settings.reducedMotion);
    document.body.classList.toggle('high-contrast-objectives', settings.highContrastObjectives);
    document.documentElement.style.setProperty('--game-ui-scale', String(settings.uiScale));
    this.syncAmbientWorldState(this.simulation.region);
    this.hudAccumulator = HUD_UPDATE_INTERVAL;
  }

  private shakeCamera(duration: number, intensity: number): void {
    if (!this.gameSettings.cameraShake || this.gameSettings.reducedMotion) return;
    const qualityScale = this.gameSettings.graphicsQuality === 'performance' ? 0.58 : 1;
    this.cameras.main.shake(duration * qualityScale, intensity * qualityScale);
  }

  private haptic(pattern: number | number[]): void {
    if (!this.mobileProfile || !this.gameSettings.vibration || this.gameSettings.reducedMotion) return;
    navigator.vibrate?.(pattern);
  }

  private createKillConfirm(monster: MonsterState): void {
    const isPrey = isHuntPrey(monster.kind);
    const isSpirit = monster.kind === 'bamboo-spirit' || monster.kind === 'moon-revenant'
      || monster.kind === 'dokkaebi' || monster.kind === 'mine-golem';
    const color = isSpirit ? 0x99b7a7 : isPrey ? 0xb48a63 : 0x8f2820;
    const count = this.mobileProfile ? 5 : 9;
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const mote = this.add.circle(
        monster.x,
        monster.y - 46,
        Phaser.Math.Between(2, 5),
        index % 3 === 0 ? 0xf1d293 : color,
        0.86,
      ).setDepth(monster.y + 26);
      this.tweens.add({
        targets: mote,
        x: mote.x + Math.cos(angle) * Phaser.Math.Between(24, 62),
        y: mote.y + Math.sin(angle) * Phaser.Math.Between(18, 52),
        scale: 0.15,
        alpha: 0,
        duration: Phaser.Math.Between(260, 430),
        ease: 'Cubic.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
    this.floatText(monster.x, monster.y - 122, isPrey ? '사냥 성공' : '처단', isSpirit ? '#c3ded1' : '#f0c878');
    this.beginHitStop(this.mobileProfile ? 78 : 96);
    this.shakeCamera(this.mobileProfile ? 80 : 110, this.mobileProfile ? 0.0035 : 0.0054);
    this.combatAudio.killConfirm();
  }

  private createPlayerHitPulse(): void {
    const camera = this.cameras.main;
    const pulse = this.add.rectangle(
      0,
      0,
      this.scale.gameSize.width / Math.max(0.01, camera.zoom),
      this.scale.gameSize.height / Math.max(0.01, camera.zoom),
      0x8b1f19,
      0.13,
    ).setOrigin(0).setScrollFactor(0).setDepth(20_000);
    this.tweens.add({
      targets: pulse,
      alpha: 0,
      duration: 190,
      ease: 'Cubic.easeOut',
      onComplete: () => pulse.destroy(),
    });
  }

  private createDust(x: number, y: number): void {
    const dust = this.add.ellipse(x, y, 18, 7, 0x8c7659, 0.38).setDepth(y - 2);
    this.tweens.add({ targets: dust, scaleX: 1.8, scaleY: 1.4, alpha: 0, y: y - 4, duration: 260, onComplete: () => dust.destroy() });
  }

  private alertMarker(x: number, y: number, label: string, readingTimeMs = 520): void {
    const text = this.add.text(x, y, label, {
      fontFamily: 'serif', fontSize: '23px', fontStyle: 'bold', color: '#e6bd69',
      stroke: '#32170f', strokeThickness: 5, align: 'center', wordWrap: { width: 430 },
    }).setOrigin(0.5).setDepth(2000);
    if (readingTimeMs <= 700) {
      this.tweens.add({ targets: text, y: y - 16, alpha: 0, duration: readingTimeMs, ease: 'Back.easeOut', onComplete: () => text.destroy() });
      return;
    }
    text.setAlpha(0).setY(y + 8);
    this.tweens.add({ targets: text, y, alpha: 1, duration: 170, ease: 'Cubic.easeOut' });
    this.time.delayedCall(readingTimeMs - 300, () => {
      if (!text.active) return;
      this.tweens.add({ targets: text, y: y - 10, alpha: 0, duration: 300, ease: 'Cubic.easeIn', onComplete: () => text.destroy() });
    });
  }

  private chargeTelegraph(x: number, y: number, angle: number): void {
    const warning = this.add.graphics({ x, y }).setDepth(y - 1).setRotation(angle);
    warning.lineStyle(3, 0xd4543e, 0.9).strokeEllipse(0, 0, 92, 34);
    warning.lineStyle(2, 0xd4543e, 0.65).beginPath().moveTo(24, 0).lineTo(145, 0).strokePath();
    this.tweens.add({ targets: warning, alpha: 0.12, yoyo: true, repeat: 2, duration: 85, onComplete: () => warning.destroy() });
  }

  private beginHitStop(durationMs: number): void {
    this.hitStopMs = Math.max(this.hitStopMs, durationMs);
    this.playerSprite.anims.timeScale = 0.06;
    for (const view of this.monsterViews.values()) view.sprite.anims.timeScale = 0.06;
  }

  private syncBuildingOcclusion(delta: number): void {
    const player = this.simulation.player;
    const blend = 1 - Math.exp(-Math.max(0, delta) / 105);
    for (const structure of this.occludingStructures) {
      const areas = structure.areas ?? [structure];
      const behind = areas.some((area) => isPointBehindOccluder(player, area));
      const targetAlpha = behind ? 0.28 : 1;
      structure.image.setAlpha(Phaser.Math.Linear(structure.image.alpha, targetAlpha, blend));
    }
  }

  private endHitStop(): void {
    this.playerSprite.anims.timeScale = 1;
    for (const view of this.monsterViews.values()) view.sprite.anims.timeScale = 1;
  }

  private floatText(x: number, y: number, value: string, color: string): void {
    const text = this.add.text(x, y, value, { fontFamily: 'serif', fontSize: '17px', fontStyle: 'bold', color, stroke: '#2a120e', strokeThickness: 4 }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: text, y: y - 28, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
  }

  private fitCamera(): void {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const zoom = Math.max(width / MAP_WIDTH, height / MAP_HEIGHT);
    const camera = this.cameras.main;
    if (isUlleungRegion(this.simulation.region)) {
      camera.setBounds(
        ULLEUNG_WORLD_BOUNDS.x,
        ULLEUNG_WORLD_BOUNDS.y,
        ULLEUNG_WORLD_BOUNDS.width,
        ULLEUNG_WORLD_BOUNDS.height,
      );
    } else {
      const continuityBounds = continuityCameraBoundsForRegion(this.simulation.region);
      if (continuityBounds) {
        camera.setBounds(
          continuityBounds.x,
          continuityBounds.y,
          continuityBounds.width,
          continuityBounds.height,
        );
      } else if (
        this.simulation.region === 'dungeon'
        || isRoyalRefugeRegion(this.simulation.region)
        || isExtendedRegion(this.simulation.region)
        || isEpisode2Region(this.simulation.region)
      ) {
        const origin = REGION_ORIGINS[this.simulation.region];
        camera.setBounds(origin.x, origin.y, MAP_WIDTH, MAP_HEIGHT);
      } else {
        camera.setBounds(WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH, WORLD_HEIGHT);
      }
    }
    camera.setZoom(zoom);
    camera.setDeadzone(Math.round((width / zoom) * 0.34), Math.round((height / zoom) * 0.28));
    camera.startFollow(this.playerRoot, true, 0.085, 0.085);
    camera.centerOn(this.simulation.player.x, this.simulation.player.y);
    this.cameraRegion = this.simulation.region;
  }
}
