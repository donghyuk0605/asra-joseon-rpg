import type { Vec2 } from '../simulation/types';

export type BossId = 'chain-miner' | 'bone-jangseung' | 'flame-shaman' | 'iron-tiger' | 'headless-general'
  | 'drowned-warden' | 'eclipse-dokkaebi' | 'black-iron-giant' | 'sealed-monk' | 'shadow-magistrate';
export type BossPatternShape = { kind: 'circle'; radius: number } | { kind: 'cone'; radius: number; arc: number }
  | { kind: 'line'; length: number; width: number } | { kind: 'arena'; radius: number; safeRadius: number };
export type BossEffect = 'sweep' | 'fall' | 'pull' | 'spikes' | 'fear' | 'summon' | 'projectile' | 'teleport'
  | 'pounce' | 'shockwave' | 'charge' | 'flood' | 'clone' | 'defense' | 'vacuum';
export type BossPatternDefinition = { id: string; name: string; shape: BossPatternShape; range: number; telegraphSeconds: number;
  windupSeconds: number; recoverySeconds: number; cooldownSeconds: number; damageMultiplier: number; minimumPhase: 1 | 2; effect: BossEffect };
export type BossDefinition = { id: BossId; floor: number; name: string; textureKey: string; maxHp: number; damage: number;
  moveSpeed: number; scale: number; patterns: readonly [BossPatternDefinition, BossPatternDefinition, BossPatternDefinition] };
export type BossState = Vec2 & { id: string; bossId: BossId; name: string; floor: number; facing: number; hp: number; maxHp: number;
  damage: number; alive: boolean; phase: 1 | 2; phaseTransitioned: boolean; invulnerableSeconds: number;
  state: 'idle' | 'chase' | 'telegraph' | 'windup' | 'impact' | 'recovery' | 'phase-change' | 'dead'; stateSeconds: number;
  activePatternId: string | null; recentPatternIds: string[]; patternCooldowns: Record<string, number> };
export type BossCommand =
  | { type: 'telegraph' | 'impact'; bossId: string; patternId: string; origin: Vec2; facing: number }
  | { type: 'phase-change'; bossId: string; phase: 2 }
  | { type: 'move'; bossId: string; x: number; y: number; facing: number };
