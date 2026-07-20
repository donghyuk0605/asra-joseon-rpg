import type { RegionId } from '../world/regions';
import type { BossState } from '../bosses/types';

export type Vec2 = { x: number; y: number };
export type MonsterKind = 'dokkaebi' | 'boar' | 'bandit' | 'bamboo-spirit' | 'mine-golem' | 'moon-revenant';
export type MonsterAiState = 'patrol' | 'alert' | 'chase' | 'circle' | 'telegraph' | 'charge' | 'attack' | 'return' | 'stunned';
export type EquipmentSlot = 'weapon' | 'armor' | 'charm';
export type ItemId =
  | 'worn-hwando' | 'dokkaebi-club' | 'hunter-durumagi' | 'boar-tusk-charm'
  | 'moonsteel-hwando' | 'warden-durumagi' | 'silver-tiger-charm';
export type AttackStyle = 'fist' | 'weapon';

export type InventoryItem = {
  instanceId: string;
  itemId: ItemId;
};

export type EquipmentState = Record<EquipmentSlot, string | null>;

export type GroundDrop = Vec2 & {
  id: string;
  itemId: ItemId;
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
  aggro: boolean;
  thinkTimer: number;
  actionTimer: number;
  patrolTarget: Vec2;
  chargeDirection: Vec2;
  hitStun: number;
  knockback: Vec2;
};

export type GameEvent =
  | { type: 'player-attack'; targetId: string; style: AttackStyle }
  | { type: 'player-impact'; targetId: string; damage: number; critical: boolean; style: AttackStyle }
  | { type: 'monster-attack'; monsterId: string; damage: number }
  | { type: 'monster-alert'; monsterId: string }
  | { type: 'monster-charge'; monsterId: string }
  | { type: 'monster-killed'; monsterId: string; name: string; xp: number; gold: number }
  | { type: 'monster-respawn'; monsterId: string }
  | { type: 'player-hit'; damage: number }
  | { type: 'player-quickstep'; from: Vec2; to: Vec2 }
  | { type: 'player-defeated' }
  | { type: 'player-respawn' }
  | { type: 'quest-complete'; gold: number }
  | { type: 'potion'; healed: number }
  | { type: 'level-up'; level: number }
  | { type: 'item-drop'; dropId: string; itemId: ItemId; itemName: string }
  | { type: 'item-pickup'; itemId: ItemId; itemName: string }
  | { type: 'inventory-full'; itemName: string }
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
