import type { RegionId } from '../world/regions';

export const DUEL_FIGHTER_IDS = ['donghyeok', 'hajin', 'yeonhwa', 'gwanghae'] as const;
export type DuelFighterId = typeof DUEL_FIGHTER_IDS[number];

export type OnlinePresence = {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: number;
  moving: boolean;
  region: RegionId;
};

export type DuelEndReason = 'knockout' | 'forfeit' | 'timeout' | 'draw';

export type DuelFighterSnapshot = {
  id: string;
  name: string;
  fighterId: DuelFighterId;
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  status: 'idle' | 'moving' | 'attacking' | 'guarding' | 'hit' | 'defeated';
  guarding: boolean;
  cooldownMs: number;
  lastAction: 'none' | 'move' | 'slash' | 'break' | 'guard' | 'hit';
};

export type DuelSnapshot = {
  roomId: string;
  tick: number;
  phase: 'fighting' | 'finished';
  round: 1;
  remainingMs: number;
  players: DuelFighterSnapshot[];
  winnerId: string | null;
  endReason: DuelEndReason | null;
};

export type ClientOnlineMessage =
  | { type: 'join'; name: string }
  | { type: 'state'; x: number; y: number; facing: number; moving: boolean; region: RegionId }
  | { type: 'duel-queue'; fighterId: DuelFighterId }
  | { type: 'duel-leave' }
  | {
    type: 'duel-input';
    roomId: string;
    seq: number;
    moveX: number;
    moveY: number;
    attack: 'none' | 'slash' | 'break';
    guard: boolean;
  };

export type DuelServerMessage =
  | { type: 'duel-queued'; position: number }
  | { type: 'duel-match'; roomId: string; selfId: string; opponentId: string }
  | { type: 'duel-snapshot'; snapshot: DuelSnapshot }
  | { type: 'duel-ended'; snapshot: DuelSnapshot }
  | { type: 'duel-idle'; reason: 'cancelled' | 'reconnecting' | 'disconnected' };

export type ServerOnlineMessage =
  | { type: 'welcome'; id: string }
  | { type: 'roster'; players: OnlinePresence[] }
  | { type: 'error'; message: string }
  | DuelServerMessage;

export const sanitizeOnlineName = (value: string): string => {
  const normalized = value.normalize('NFKC').replace(/[^\p{L}\p{N}_\- ·]/gu, '').trim();
  return normalized.slice(0, 16) || '떠돌이';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key))
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isSafeId = (value: unknown, maxLength = 80): value is string =>
  typeof value === 'string'
  && value.length >= 1
  && value.length <= maxLength
  && /^[A-Za-z0-9_-]+$/.test(value);

const isDuelFighterId = (value: unknown): value is DuelFighterId =>
  typeof value === 'string' && (DUEL_FIGHTER_IDS as readonly string[]).includes(value);

const parsePresence = (value: unknown): OnlinePresence | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ['id', 'name', 'x', 'y', 'facing', 'moving', 'region'])) return null;
  if (
    !isSafeId(value.id)
    || typeof value.name !== 'string'
    || value.name.length > 16
    || !finite(value.x)
    || !finite(value.y)
    || !finite(value.facing)
    || typeof value.moving !== 'boolean'
    || typeof value.region !== 'string'
  ) return null;
  return value as OnlinePresence;
};

const parseDuelFighter = (value: unknown): DuelFighterSnapshot | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'id', 'name', 'fighterId', 'x', 'y', 'facing', 'hp', 'maxHp', 'status', 'guarding', 'cooldownMs', 'lastAction',
  ])) return null;
  if (
    !isSafeId(value.id)
    || typeof value.name !== 'string'
    || value.name.length > 16
    || !isDuelFighterId(value.fighterId)
    || !finite(value.x)
    || !finite(value.y)
    || !finite(value.facing)
    || !finite(value.hp)
    || !finite(value.maxHp)
    || value.maxHp <= 0
    || value.hp < 0
    || value.hp > value.maxHp
    || (value.status !== 'idle'
      && value.status !== 'moving'
      && value.status !== 'attacking'
      && value.status !== 'guarding'
      && value.status !== 'hit'
      && value.status !== 'defeated')
    || typeof value.guarding !== 'boolean'
    || !finite(value.cooldownMs)
    || value.cooldownMs < 0
    || (value.lastAction !== 'none'
      && value.lastAction !== 'move'
      && value.lastAction !== 'slash'
      && value.lastAction !== 'break'
      && value.lastAction !== 'guard'
      && value.lastAction !== 'hit')
  ) return null;
  return value as DuelFighterSnapshot;
};

const parseDuelSnapshot = (value: unknown): DuelSnapshot | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'roomId', 'tick', 'phase', 'round', 'remainingMs', 'players', 'winnerId', 'endReason',
  ])) return null;
  if (
    !isSafeId(value.roomId)
    || !Number.isSafeInteger(value.tick)
    || (value.tick as number) < 0
    || (value.phase !== 'fighting' && value.phase !== 'finished')
    || value.round !== 1
    || !finite(value.remainingMs)
    || value.remainingMs < 0
    || !Array.isArray(value.players)
    || value.players.length !== 2
    || (value.winnerId !== null && !isSafeId(value.winnerId))
    || (value.endReason !== null
      && value.endReason !== 'knockout'
      && value.endReason !== 'forfeit'
      && value.endReason !== 'timeout'
      && value.endReason !== 'draw')
  ) return null;
  const players = value.players.map(parseDuelFighter);
  if (players.some((player) => player === null)) return null;
  if (value.phase === 'fighting' && (value.winnerId !== null || value.endReason !== null)) return null;
  if (value.phase === 'finished' && value.endReason === null) return null;
  if (value.winnerId !== null && !players.some((player) => player?.id === value.winnerId)) return null;
  return { ...value, players: players as DuelFighterSnapshot[] } as DuelSnapshot;
};

export const parseServerOnlineMessage = (raw: string): ServerOnlineMessage | null => {
  if (raw.length === 0 || raw.length > 80_000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'welcome') {
    return hasOnlyKeys(value, ['type', 'id']) && isSafeId(value.id) ? value as ServerOnlineMessage : null;
  }
  if (value.type === 'error') {
    return hasOnlyKeys(value, ['type', 'message'])
      && typeof value.message === 'string'
      && value.message.length <= 160
      ? value as ServerOnlineMessage
      : null;
  }
  if (value.type === 'roster') {
    if (!hasOnlyKeys(value, ['type', 'players']) || !Array.isArray(value.players) || value.players.length > 200) return null;
    const players = value.players.map(parsePresence);
    return players.some((player) => player === null)
      ? null
      : { type: 'roster', players: players as OnlinePresence[] };
  }
  if (value.type === 'duel-queued') {
    return hasOnlyKeys(value, ['type', 'position'])
      && Number.isSafeInteger(value.position)
      && (value.position as number) >= 1
      ? value as DuelServerMessage
      : null;
  }
  if (value.type === 'duel-match') {
    return hasOnlyKeys(value, ['type', 'roomId', 'selfId', 'opponentId'])
      && isSafeId(value.roomId)
      && isSafeId(value.selfId)
      && isSafeId(value.opponentId)
      ? value as DuelServerMessage
      : null;
  }
  if (value.type === 'duel-snapshot' || value.type === 'duel-ended') {
    if (!hasOnlyKeys(value, ['type', 'snapshot'])) return null;
    const snapshot = parseDuelSnapshot(value.snapshot);
    return snapshot ? { type: value.type, snapshot } : null;
  }
  if (value.type === 'duel-idle') {
    return hasOnlyKeys(value, ['type', 'reason'])
      && (value.reason === 'cancelled' || value.reason === 'reconnecting' || value.reason === 'disconnected')
      ? value as DuelServerMessage
      : null;
  }
  return null;
};
