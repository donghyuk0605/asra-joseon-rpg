import type {
  JapanRegionId,
  JurchenExpansionRegionId,
  PyongyangRegionId,
  RegionId,
} from '../world/regions';
import type { BossState } from '../bosses/types';

export type Vec2 = { x: number; y: number };
export type MonsterKind =
  | 'osaka-overseer' | 'osaka-ronin' | 'osaka-gunner'
  | 'ulleung-hare' | 'ulleung-water-deer' | 'ulleung-sangun' | 'ulleung-guard' | 'ulleung-veteran' | 'ulleung-archer' | 'ulleung-executioner' | 'ulleung-captain' | 'ulleung-magistrate'
  | 'wako-raider' | 'wako-archer' | 'wako-captain'
  | 'yeongwol-swordsman' | 'yeongwol-spearman' | 'yeongwol-archer' | 'yeongwol-shield' | 'yeongwol-commander'
  | 'jeonju-swordsman' | 'jeonju-spearman' | 'jeonju-archer' | 'jeonju-shield' | 'jeonju-commander'
  | 'jeonju-militia-sickle'
  | 'japanese-sika-deer' | 'japanese-wild-boar'
  | 'japanese-swordsman' | 'japanese-spearman' | 'japanese-archer' | 'japanese-gunner' | 'japanese-general' | 'japanese-shogun'
  | 'manchu-lancer' | 'manchu-archer' | 'manchu-cavalry' | 'manchu-captain' | 'manchu-chieftain'
  | 'joseon-border-swordsman' | 'joseon-border-spearman' | 'joseon-border-archer' | 'joseon-border-commander'
  | 'royal-guard' | 'joseon-prince' | 'joseon-civilian'
  | 'korean-gray-wolf'
  | 'dokkaebi' | 'boar' | 'bandit' | 'bamboo-spirit' | 'mine-golem' | 'moon-revenant'
  | 'wonju-bear' | 'gangneung-haetae' | 'haeju-crane' | 'geoje-sea-wraith'
  | 'episode2-red-fox' | 'episode2-mountain-leopard'
  | 'episode2-marsh-wisp' | 'episode2-stone-dokkaebi';
export type MonsterAiState =
  | 'patrol' | 'sleep' | 'alert' | 'chase' | 'circle' | 'brace' | 'rally'
  | 'telegraph' | 'charge' | 'attack' | 'flee' | 'return' | 'stunned';
export type MonsterTacticalRole =
  | 'melee' | 'spearman' | 'ranged' | 'leader' | 'timid' | 'charger' | 'brute';
export type EquipmentSlot = 'weapon' | 'armor' | 'charm';
export type ItemSlot = EquipmentSlot | 'scroll' | 'material';
export type PlayerOrigin =
  | 'kim-donghyeok'
  | 'frontier-archer'
  | 'osaka-mudang'
  | 'gwanghae-prince';
export type PlayerAttributeId = 'strength' | 'technique' | 'vitality' | 'agility' | 'spirit' | 'leadership';
export type WeaponElement = 'fire' | 'ice' | 'lightning' | 'poison' | 'wind' | 'earth' | 'shadow';
export type ItemId =
  | 'worn-hwando' | 'frontier-horn-bow' | 'white-birch-bow' | 'iron-horn-warbow' | 'thunderbird-bow' | 'northwind-warbow'
  | 'dokkaebi-club' | 'hunter-durumagi' | 'boar-tusk-charm'
  | 'frontier-lamellar-coat' | 'falcon-eye-bracer'
  | 'border-war-dispatch' | 'jurchen-iron-arrowheads' | 'joseon-border-token'
  | 'moonsteel-hwando' | 'warden-durumagi' | 'silver-tiger-charm'
  | 'ember-hwando' | 'frost-hwando' | 'storm-hwando' | 'venom-hwando' | 'gale-hwando'
  | 'earth-hwando' | 'shadow-hwando' | 'ulleung-tiger-pelt' | 'tiger-pelt-armor'
  | 'bear-claw-gauntlet' | 'chiaksan-claw-knife' | 'haetae-ward-charm'
  | 'gangneung-sea-bow' | 'coastal-scout-coat' | 'crane-feather-talisman'
  | 'haeju-reed-cape' | 'saltfield-ritual-knife' | 'sea-salt-amulet'
  | 'geoje-anchor-hwando' | 'pine-resin-torch' | 'naval-signal-seal'
  | 'crane-quill-bundle' | 'salt-crystal-bundle'
  | 'uiju-black-horn-bow' | 'hwangju-moonsteel-spear'
  | 'jaeryeong-fox-charm' | 'anju-frontier-coat'
  | 'pyeongchang-leopard-knife' | 'samcheok-seawind-bow'
  | 'gapyeong-birch-talisman' | 'yangju-beacon-seal'
  | 'yeoju-river-jade' | 'gongju-scholar-coat'
  | 'cheongju-kiln-hwando' | 'icheon-spirit-jar'
  | 'boryeong-tidal-anchor' | 'gunsan-drowned-blade'
  | 'namwon-bamboo-flute' | 'tongyeong-signal-drum'
  | 'weapon-enchant-scroll' | 'armor-enchant-scroll' | 'crescent-manual' | 'insight-manual';
export type CraftRecipeId = 'tiger-pelt-armor';
export type AttackStyle = 'fist' | 'weapon';
export type BasicAttackStep = 1 | 2 | 3;
export type SkillId =
  | 'whirlwind' | 'leap-strike' | 'moon-dash' | 'crescent-wave' | 'tidebreaker-step'
  | 'haemosu-volley' | 'falcon-seeker' | 'iron-cavalry-shot' | 'crescent-arrow-rain' | 'beacon-volley'
  | 'spirit-bell' | 'talisman-flame' | 'soul-binding-gut' | 'exile-possession'
  | 'blade-mastery' | 'great-bow-mastery' | 'iron-constitution' | 'insight';
export type SkillUnlockSource = 'starter' | 'training' | 'master' | 'manual' | 'event';
export type FollowerKind =
  | 'peasant-militia' | 'government-defector' | 'special-warrior'
  | 'jurchen-vanguard' | 'jurchen-bowguard' | 'jurchen-captain'
  | 'gwanghae-militia' | 'gwanghae-spearman' | 'gwanghae-archer' | 'gwanghae-captain';
export type FollowerAttackKind = 'arrow' | 'spear' | 'blade' | 'command';
export type RecruitmentRoute = 'tavern' | 'liberation' | 'defection' | 'hidden-contract' | 'invasion' | 'bunjo';
export type FollowerState = Vec2 & {
  id: string;
  kind: FollowerKind;
  name: string;
  route: RecruitmentRoute;
  visualKind: MonsterKind;
  facing: number;
  velocity: Vec2;
  attackCooldown: number;
  actionTimer: number;
  targetId: string | null;
};
export type WorldEventKind =
  | 'beast-surge' | 'guard-patrol' | 'spirit-omen' | 'refugee-request'
  | 'frontier-supply-raid' | 'frontier-dispatch-intercept'
  | 'frontier-scout-signal' | 'frontier-command-duel';
export type LandmarkId =
  | 'herb-patch' | 'spirit-shrine' | 'refugee-camp' | 'tax-cart' | 'smuggler-cache' | 'government-treasury'
  | 'jurchen-supply-sled' | 'fallen-border-courier' | 'frontier-stone-cairn';

export type ActiveWorldEvent = {
  kind: WorldEventKind;
  region: RegionId;
  title: string;
  description: string;
  endsAt: number;
  progress?: number;
  goal?: number;
  rewardGold?: number;
  rewardItemId?: ItemId;
};

export type InventoryItem = {
  instanceId: string;
  itemId: ItemId;
  enhancement?: number;
};

export type EquipmentState = Record<EquipmentSlot, string | null>;

export type GroundDrop = Vec2 & {
  id: string;
  itemId: ItemId;
  /** Legacy saves omitted the region; imports bind those drops to the saved region. */
  region?: RegionId;
  /** Remaining field lifetime. Undefined is accepted for legacy saves and tests. */
  remainingSeconds?: number;
};

export type PlayerState = Vec2 & {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  potions: number;
  kills: number;
  destination: Vec2 | null;
  targetId: string | null;
  attackCooldown: number;
  dodgeCooldown: number;
  momentum: number;
  momentumActive: number;
  combo: number;
  comboTimer: number;
  facing: number;
  lootTargetId: string | null;
};

export type MonsterState = Vec2 & {
  id: string;
  region: Exclude<RegionId, 'village'>;
  kind: MonsterKind;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  damage: number;
  alive: boolean;
  attackCooldown: number;
  respawnAt: number;
  spawn: Vec2;
  facing: number;
  aiState: MonsterAiState;
  tacticalRole: MonsterTacticalRole;
  tacticSlot: number;
  aggro: boolean;
  thinkTimer: number;
  actionTimer: number;
  rallySeconds: number;
  stuckSeconds: number;
  recoveryTimer: number;
  recoveryDirection: Vec2;
  recoveryCount: number;
  patrolTarget: Vec2;
  velocity: Vec2;
  chargeDirection: Vec2;
  hitStun: number;
  knockback: Vec2;
  elemental: {
    burnSeconds: number;
    burnTick: number;
    burnDamage: number;
    frostSeconds: number;
    shockSeconds: number;
    poisonSeconds: number;
    poisonTick: number;
    poisonDamage: number;
    poisonStacks: number;
    gustSeconds: number;
    stoneSeconds: number;
    shadowSeconds: number;
  };
};

export type GwanghaeMilitiaRallyBlockedReason =
  | 'not-gwanghae'
  | 'unknown-npc'
  | 'wrong-region'
  | 'prerequisite'
  | 'already-rallied';

export type GwanghaePathChoiceBlockedReason =
  | 'not-gwanghae'
  | 'rallies-incomplete'
  | 'already-chosen';

export type GameEvent =
  | { type: 'player-attack'; targetId: string; style: AttackStyle }
  | { type: 'basic-chain-start'; targetId: string; style: AttackStyle; step: BasicAttackStep }
  | { type: 'player-impact'; targetId: string; damage: number; critical: boolean; style: AttackStyle; step: BasicAttackStep; finisher: boolean }
  | { type: 'basic-finisher'; targetId: string; style: AttackStyle; targets: number; damage: number }
  | { type: 'elemental-applied'; element: WeaponElement; targetId: string; duration: number; fromTargetId?: string }
  | { type: 'elemental-damage'; element: WeaponElement; targetId: string; damage: number; fromTargetId?: string }
  | { type: 'elemental-reaction'; reaction: 'steam-burst' | 'frost-shatter' | 'toxic-ignition' | 'firestorm' | 'ground-discharge'; targetId: string; damage: number }
  | { type: 'elemental-heal'; element: 'shadow'; amount: number }
  | { type: 'monster-attack'; monsterId: string; damage: number }
  | { type: 'monster-alert'; monsterId: string }
  | { type: 'monster-charge'; monsterId: string }
  | { type: 'guard-action'; monsterId: string; action: 'brace' | 'lunge' | 'rally' }
  | {
    type: 'gwanghae-militia-rallied';
    npcId: string;
    region: RegionId;
    label: string;
    message: string;
    recruits: number;
    reserve: number;
    completed: number;
    total: number;
    choiceReady: boolean;
  }
  | {
    type: 'gwanghae-militia-rally-blocked';
    npcId: string;
    reason: GwanghaeMilitiaRallyBlockedReason;
    expectedRegion?: RegionId;
    requiredNpcId?: string;
  }
  | {
    type: 'gwanghae-path-chosen';
    path: 'coup' | 'suppression';
    title: string;
    message: string;
    reserve: number;
    strength: number;
  }
  | {
    type: 'gwanghae-path-blocked';
    path: 'coup' | 'suppression';
    reason: GwanghaePathChoiceBlockedReason;
    remaining?: number;
    selectedPath?: 'coup' | 'suppression';
  }
  | {
    type: 'gwanghae-path-battle-started';
    path: 'coup' | 'suppression';
    region: RegionId;
    title: string;
    total: number;
  }
  | {
    type: 'gwanghae-path-battle-cleared';
    path: 'coup' | 'suppression';
    region: RegionId;
    title: string;
    defeated: number;
    rewardGold: number;
    rewardXp: number;
  }
  | {
    type: 'gwanghae-coup-gate-blocked';
    region: RegionId;
    destination: RegionId;
    stageNumber: 1 | 2 | 3;
    stageTitle: string;
    remaining: number;
  }
  | {
    type: 'gwanghae-coup-stage-cleared';
    region: RegionId;
    nextRegion: RegionId | null;
    stageNumber: 1 | 2 | 3;
    stageTitle: string;
    defeated: number;
  }
  | {
    type: 'gwanghae-king-confrontation-blocked';
    reason: 'wrong-path' | 'palace-battle-incomplete' | 'royal-guards-remain';
    region?: RegionId;
    stageTitle?: string;
    remaining: number;
  }
  | { type: 'frontier-ambush-ready'; jurchenCount: number; joseonCount: number }
  | { type: 'frontier-ambush-fired'; targetId: string; damage: number }
  | { type: 'frontier-battle-started'; jurchenCount: number; joseonCount: number; fleeingCount: number }
  | { type: 'frontier-clash'; attackerId: string; targetId: string; damage: number; ranged: boolean; attackKind: 'arrow' | 'spear' | 'cavalry' | 'command' | 'blade' }
  | { type: 'frontier-unit-fallen'; monsterId: string; name: string }
  | { type: 'frontier-unit-fled'; monsterId: string; name: string }
  | { type: 'frontier-opening-defeated'; retreatTo: RegionId; survivingWarriors: number }
  | { type: 'jurchen-gate-blocked'; region: RegionId; remaining: number }
  | { type: 'jurchen-stage-cleared'; region: JurchenExpansionRegionId; defeated: number; rewardGold: number }
  | {
    type: 'jurchen-tribe-allied';
    region: JurchenExpansionRegionId;
    tribeName: string;
    allied: number;
    total: number;
  }
  | { type: 'jurchen-unified'; allied: number; total: number; armyStrength: number }
  | { type: 'frontier-mission-cleared'; defeatedSoldiers: number; civilianCasualties: number }
  | { type: 'southward-gate-blocked'; remaining: number }
  | { type: 'hajin-warband-formed'; count: number }
  | { type: 'hajin-southward-march-started'; from: RegionId; to: RegionId; count: number }
  | { type: 'pyongyang-gate-blocked'; region: PyongyangRegionId; remaining: number }
  | { type: 'pyongyang-stage-cleared'; region: PyongyangRegionId; defeated: number }
  | { type: 'king-refuge-choice'; title: string; dialogue: readonly string[] }
  | {
    type: 'royal-refuge-route-selected';
    routeId: 'namhansanseong' | 'ganghwado';
    routeName: string;
    destination: string;
  }
  | {
    type: 'royal-refuge-stage-cleared';
    routeId: 'namhansanseong' | 'ganghwado';
    stageIndex: 0 | 1 | 2;
    stageName: string;
    nextStageName?: string;
    rewardGold: number;
  }
  | {
    type: 'royal-refuge-final-defense-cleared';
    routeId: 'namhansanseong' | 'ganghwado';
    title: string;
    description: string;
  }
  | { type: 'hajin-reinforcements-called'; deployed: number; reserve: number; fielded: number }
  | { type: 'hajin-reinforcements-blocked'; reason: 'mission' | 'reserve' | 'field-capacity'; reserve: number; fielded: number }
  | { type: 'gwanghae-reinforcements-called'; deployed: number; reserve: number; fielded: number }
  | {
    type: 'gwanghae-reinforcements-blocked';
    reason: 'not-gwanghae' | 'register' | 'suppression' | 'reserve' | 'field-capacity';
    reserve: number;
    fielded: number;
  }
  | {
    type: 'gwanghae-enemy-reinforcement';
    path: 'coup' | 'suppression';
    reserve: number;
    remaining: number;
  }
  | { type: 'osaka-departure-blocked'; remaining: number }
  | { type: 'osaka-departure-ready'; defeated: number }
  | { type: 'japan-gate-blocked'; region: JapanRegionId; remaining: number }
  | { type: 'japan-stage-cleared'; region: JapanRegionId; defeated: number; rewardGold: number }
  | { type: 'shogun-phase-changed'; monsterId: string; phase: 2 }
  | { type: 'shogun-defeated'; gold: number; skillPoints: number }
  | { type: 'tangeum-gunline-alert'; gunners: number; total: number }
  | { type: 'tangeum-gate-blocked'; remaining: number }
  | { type: 'tangeum-forces-annihilated'; defeated: number; gunners: number; gold: number }
  | { type: 'monster-killed'; monsterId: string; name: string; xp: number; gold: number }
  | { type: 'monster-respawn'; monsterId: string }
  | { type: 'player-hit'; damage: number }
  | { type: 'player-quickstep'; from: Vec2; to: Vec2 }
  | { type: 'perfect-dodge'; momentum: number }
  | { type: 'combat-combo'; count: number; momentum: number }
  | { type: 'momentum-burst'; duration: number }
  | { type: 'momentum-ended' }
  | { type: 'skill-cast'; skillId: SkillId; rank: number; from: Vec2; to: Vec2 }
  | { type: 'skill-impact'; skillId: SkillId; targets: number; damage: number; at: Vec2 }
  | { type: 'archer-volley'; skillId: SkillId; arrows: Array<{ targetId: string; from: Vec2; to: Vec2 }> }
  | { type: 'skill-learned'; skillId: SkillId; rank: number; pointsLeft: number }
  | { type: 'skill-unlocked'; skillId: SkillId; rank: 1; source: SkillUnlockSource }
  | { type: 'skill-blocked'; skillId: SkillId; reason: 'weapon' | 'cooldown' | 'points' | 'max-rank' | 'locked' | 'passive' | 'prerequisite'; requiredSkill?: SkillId; requiredRank?: number }
  | { type: 'skill-teach-blocked'; skillId: SkillId; reason: 'level' | 'gold' | 'known' | 'source' | 'prerequisite'; requiredLevel?: number; cost?: number; requiredSkill?: SkillId; requiredRank?: number }
  | { type: 'follower-recruited'; follower: FollowerState; route: RecruitmentRoute; cost: number }
  | { type: 'follower-recruit-blocked'; kind: FollowerKind; reason: 'gold' | 'level' | 'story' | 'skill' | 'known' | 'capacity'; cost?: number; requiredLevel?: number; requiredSkill?: SkillId }
  | { type: 'follower-attack'; followerId: string; targetId: string; damage: number; attackKind: FollowerAttackKind }
  | { type: 'player-defeated'; respawnRegion: RegionId }
  | { type: 'player-respawn'; region: RegionId }
  | { type: 'quest-complete'; gold: number }
  | { type: 'potion'; healed: number }
  | { type: 'level-up'; level: number; attributePointsGained?: number }
  | { type: 'attribute-allocated'; attributeId: PlayerAttributeId; value: number; pointsLeft: number }
  | { type: 'attributes-reset'; refunded: number; points: number }
  | { type: 'item-drop'; dropId: string; itemId: ItemId; itemName: string }
  | { type: 'item-pickup'; itemId: ItemId; itemName: string }
  | { type: 'item-drop-expired'; itemId: ItemId; itemName: string; notable: boolean }
  | { type: 'inventory-full'; itemName: string }
  | { type: 'shop-purchase'; offer: ShopOfferId; name: string; gold: number }
  | { type: 'shop-blocked'; offer: ShopOfferId; reason: 'gold' | 'inventory' | 'equipment' | 'health' }
  | { type: 'item-crafted'; recipeId: CraftRecipeId; itemId: ItemId; itemName: string }
  | { type: 'craft-blocked'; recipeId: CraftRecipeId; reason: 'gold' | 'inventory' | 'materials' }
  | { type: 'hunt-milestone'; kind: MonsterKind; kills: number; gold: number; xp: number }
  | { type: 'training-progress'; count: number; xp: number; reward?: string }
  | { type: 'enchant-applied'; target: 'weapon' | 'armor'; level: number; bonus: number }
  | { type: 'enchant-blocked'; target: 'weapon' | 'armor'; reason: 'unequipped' | 'max-level' }
  | { type: 'prison-gate-opened' }
  | { type: 'prison-guards-provoked'; monsterId: string; cause?: 'struck' | 'execution' }
  | { type: 'government-guards-provoked'; monsterId: string }
  | { type: 'government-entry-blocked'; requiredLevel: number }
  | { type: 'world-event-started'; event: ActiveWorldEvent }
  | { type: 'world-event-ended'; kind: WorldEventKind; title: string }
  | { type: 'world-event-progress'; kind: WorldEventKind; progress: number; goal: number }
  | { type: 'world-event-completed'; kind: WorldEventKind; title: string; gold: number; itemId?: ItemId; itemName?: string }
  | { type: 'landmark-discovered'; landmarkId: LandmarkId; title: string; reward: string }
  | { type: 'landmark-blocked'; landmarkId: LandmarkId; reason: 'used' | 'locked' | 'inventory-full' }
  | { type: 'ulleung-magistrate-spawned'; monsterId: string }
  | { type: 'wako-pact-revealed'; magistrateId: string; dock: Vec2; invasionIn: number }
  | { type: 'wako-invasion-started'; count: number; dock: Vec2 }
  | { type: 'government-dock-guidance'; dock: Vec2 }
  | { type: 'ulleung-village-liberated' }
  | { type: 'government-dock-blocked' }
  | { type: 'government-dock-used'; destination: 'village' }
  | { type: 'item-equipped'; itemId: ItemId; itemName: string; equipped: boolean }
  | { type: 'boss-spawned'; boss: BossState }
  | { type: 'boss-telegraph'; bossId: string; patternId: string; origin: Vec2; facing: number }
  | { type: 'boss-impact'; bossId: string; patternId: string; origin: Vec2; facing: number }
  | { type: 'boss-phase-changed'; bossId: string; phase: 2 }
  | { type: 'boss-killed'; bossId: string; name: string; floor: number }
  | { type: 'boss-reset'; floor: number }
  | { type: 'dungeon-stair-lock-changed'; locked: boolean }
  | { type: 'dungeon-complete' }
  | { type: 'dungeon-floor-changed'; floor: number; maxFloor: number; title: string }
  | { type: 'region-changed'; region: RegionId };

export type ShopOfferId =
  | 'ginseng-pellet'
  | 'weapon-enchant-scroll'
  | 'armor-enchant-scroll'
  | 'ember-hwando'
  | 'frost-hwando'
  | 'storm-hwando'
  | 'forge-weapon'
  | 'forge-armor'
  | 'inn-rest';
