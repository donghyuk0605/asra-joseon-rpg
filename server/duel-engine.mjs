import { randomUUID } from 'node:crypto';

export const DUEL_FIGHTER_IDS = Object.freeze(['donghyeok', 'hajin', 'yeonhwa', 'gwanghae']);

export const DUEL_RULES = Object.freeze({
  arenaWidth: 800,
  arenaHeight: 450,
  edgePadding: 42,
  maxHp: 100,
  moveSpeed: 180,
  roundMs: 60_000,
  slashDamage: 18,
  slashCooldownMs: 700,
  slashRange: 118,
  breakDamage: 24,
  breakCooldownMs: 1_250,
  breakRange: 105,
  guardDurationMs: 900,
  guardDamageMultiplier: 0.45,
});

const MAX_SEQUENCE = 2_147_483_647;
const MAX_NAME_LENGTH = 16;
const MAX_ROOM_ID_LENGTH = 80;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const hasExactKeys = (value, keys) => {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};
const validFighterId = (value) => DUEL_FIGHTER_IDS.includes(value);
const validRoomId = (value) => typeof value === 'string'
  && value.length >= 1
  && value.length <= MAX_ROOM_ID_LENGTH
  && SAFE_ID.test(value);

/** Strictly validates every public WebSocket command, including legacy open-world state. */
export const parseClientOnlineMessage = (raw, validRegions) => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 4096) return null;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  if (value.type === 'join') {
    return hasExactKeys(value, ['type', 'name'])
      && typeof value.name === 'string'
      && value.name.length <= 128
      ? value
      : null;
  }
  if (value.type === 'state') {
    return hasExactKeys(value, ['type', 'x', 'y', 'facing', 'moving', 'region'])
      && finite(value.x)
      && finite(value.y)
      && finite(value.facing)
      && typeof value.moving === 'boolean'
      && typeof value.region === 'string'
      && validRegions.has(value.region)
      ? value
      : null;
  }
  if (value.type === 'duel-queue') {
    return hasExactKeys(value, ['type', 'fighterId']) && validFighterId(value.fighterId)
      ? value
      : null;
  }
  if (value.type === 'duel-leave') {
    return hasExactKeys(value, ['type']) ? value : null;
  }
  if (value.type === 'duel-input') {
    return hasExactKeys(value, ['type', 'roomId', 'seq', 'moveX', 'moveY', 'attack', 'guard'])
      && validRoomId(value.roomId)
      && Number.isSafeInteger(value.seq)
      && value.seq >= 0
      && value.seq <= MAX_SEQUENCE
      && finite(value.moveX)
      && finite(value.moveY)
      && value.moveX >= -1
      && value.moveX <= 1
      && value.moveY >= -1
      && value.moveY <= 1
      && (value.attack === 'none' || value.attack === 'slash' || value.attack === 'break')
      && typeof value.guard === 'boolean'
      ? value
      : null;
  }
  return null;
};

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const fighterSnapshot = (fighter, now) => ({
  id: fighter.id,
  name: fighter.name,
  fighterId: fighter.fighterId,
  x: Math.round(fighter.x * 100) / 100,
  y: Math.round(fighter.y * 100) / 100,
  facing: fighter.facing,
  hp: fighter.hp,
  maxHp: DUEL_RULES.maxHp,
  status: fighter.hp <= 0
    ? 'defeated'
    : fighter.hitUntil > now
      ? 'hit'
      : fighter.attackUntil > now
        ? 'attacking'
        : fighter.guardingUntil > now
          ? 'guarding'
          : fighter.moving
            ? 'moving'
            : 'idle',
  guarding: fighter.guardingUntil > now,
  cooldownMs: Math.max(0, Math.ceil(fighter.cooldownUntil - now)),
  lastAction: fighter.lastAction,
});

const roomSnapshot = (room, now) => ({
  roomId: room.id,
  tick: room.tick,
  phase: room.phase,
  round: 1,
  remainingMs: room.phase === 'finished' ? 0 : Math.max(0, Math.ceil(room.endsAt - now)),
  players: room.players.map((fighter) => fighterSnapshot(fighter, now)),
  winnerId: room.winnerId,
  endReason: room.endReason,
});

const targeted = (to, message) => ({ to, message });

const createFighter = ({ id, name, fighterId }, slot) => ({
  id,
  name: String(name || '').slice(0, MAX_NAME_LENGTH) || '떠돌이',
  fighterId,
  // The first arena UI only exposes slash, armor-break and guard buttons.
  // Spawn within both attack ranges so a duel cannot deadlock without movement controls.
  x: DUEL_RULES.arenaWidth / 2 + (slot === 0 ? -48 : 48),
  y: DUEL_RULES.arenaHeight / 2,
  facing: slot === 0 ? 0 : Math.PI,
  hp: DUEL_RULES.maxHp,
  moving: false,
  guardingUntil: 0,
  cooldownUntil: 0,
  attackUntil: 0,
  hitUntil: 0,
  lastAction: 'none',
  lastSeq: -1,
  input: { moveX: 0, moveY: 0, attack: 'none', guard: false },
  pendingAttack: 'none',
});

export const createDuelEngine = ({
  now = () => Date.now(),
  createRoomId = () => `duel-${randomUUID()}`,
} = {}) => {
  const queue = [];
  const queuedPlayers = new Map();
  const rooms = new Map();
  const playerRooms = new Map();

  const removeFromQueue = (playerId) => {
    queuedPlayers.delete(playerId);
    const index = queue.indexOf(playerId);
    if (index >= 0) queue.splice(index, 1);
  };

  const finishRoom = (room, winnerId, endReason, at) => {
    if (room.phase === 'finished') return [];
    room.phase = 'finished';
    room.winnerId = winnerId;
    room.endReason = endReason;
    room.tick += 1;
    const snapshot = roomSnapshot(room, at);
    const events = room.players.map((fighter) => targeted(fighter.id, {
      type: 'duel-ended',
      snapshot,
    }));
    for (const fighter of room.players) playerRooms.delete(fighter.id);
    rooms.delete(room.id);
    return events;
  };

  const queuePlayer = ({ id, name, fighterId }) => {
    if (!validRoomId(id) || !validFighterId(fighterId)) return [];
    if (playerRooms.has(id)) return [];
    if (queuedPlayers.has(id)) {
      return [targeted(id, { type: 'duel-queued', position: queue.indexOf(id) + 1 })];
    }

    queuedPlayers.set(id, { id, name, fighterId });
    queue.push(id);
    while (queue.length && !queuedPlayers.has(queue[0])) queue.shift();
    if (queue.length < 2) return [targeted(id, { type: 'duel-queued', position: 1 })];

    const firstId = queue.shift();
    const secondId = queue.shift();
    const first = queuedPlayers.get(firstId);
    const second = queuedPlayers.get(secondId);
    if (!first || !second) return [];
    queuedPlayers.delete(firstId);
    queuedPlayers.delete(secondId);

    const startedAt = now();
    const room = {
      id: createRoomId(),
      phase: 'fighting',
      tick: 0,
      startedAt,
      endsAt: startedAt + DUEL_RULES.roundMs,
      lastTickAt: startedAt,
      winnerId: null,
      endReason: null,
      players: [createFighter(first, 0), createFighter(second, 1)],
    };
    rooms.set(room.id, room);
    playerRooms.set(first.id, room.id);
    playerRooms.set(second.id, room.id);
    const snapshot = roomSnapshot(room, startedAt);
    return [
      targeted(first.id, { type: 'duel-match', roomId: room.id, selfId: first.id, opponentId: second.id }),
      targeted(second.id, { type: 'duel-match', roomId: room.id, selfId: second.id, opponentId: first.id }),
      targeted(first.id, { type: 'duel-snapshot', snapshot }),
      targeted(second.id, { type: 'duel-snapshot', snapshot }),
    ];
  };

  const applyInput = (playerId, message) => {
    const roomId = playerRooms.get(playerId);
    if (!roomId || roomId !== message.roomId) return { ok: false, error: 'room-mismatch' };
    const room = rooms.get(roomId);
    const fighter = room?.players.find((entry) => entry.id === playerId);
    if (!room || room.phase !== 'fighting' || !fighter) return { ok: false, error: 'not-fighting' };
    if (!Number.isSafeInteger(message.seq) || message.seq <= fighter.lastSeq) {
      return { ok: false, error: 'stale-sequence' };
    }

    fighter.lastSeq = message.seq;
    const wasGuardPressed = fighter.input.guard;
    fighter.input = {
      moveX: message.moveX,
      moveY: message.moveY,
      attack: message.attack,
      guard: message.guard,
    };
    if (message.guard && !wasGuardPressed) {
      fighter.guardingUntil = now() + DUEL_RULES.guardDurationMs;
      fighter.lastAction = 'guard';
    }
    if (!message.guard && message.attack !== 'none') fighter.pendingAttack = message.attack;
    return { ok: true };
  };

  const leavePlayer = (playerId, reason = 'cancelled') => {
    if (queuedPlayers.has(playerId)) {
      removeFromQueue(playerId);
      return reason === 'cancelled'
        ? [targeted(playerId, { type: 'duel-idle', reason: 'cancelled' })]
        : [];
    }
    const roomId = playerRooms.get(playerId);
    const room = roomId ? rooms.get(roomId) : null;
    if (!room) return [];
    const opponent = room.players.find((fighter) => fighter.id !== playerId && fighter.hp > 0);
    return finishRoom(room, opponent?.id ?? null, 'forfeit', now());
  };

  const tick = (at = now()) => {
    const events = [];
    for (const room of [...rooms.values()]) {
      const elapsedMs = clamp(at - room.lastTickAt, 0, 100);
      room.lastTickAt = at;
      room.tick += 1;
      const elapsedSeconds = elapsedMs / 1000;

      for (const fighter of room.players) {
        if (fighter.hp <= 0) continue;
        const { moveX, moveY } = fighter.input;
        const magnitude = Math.hypot(moveX, moveY);
        const canMove = fighter.guardingUntil <= at && fighter.attackUntil <= at;
        fighter.moving = canMove && magnitude > 0.001;
        if (fighter.moving) {
          const unitX = moveX / Math.max(1, magnitude);
          const unitY = moveY / Math.max(1, magnitude);
          fighter.x = clamp(
            fighter.x + unitX * DUEL_RULES.moveSpeed * elapsedSeconds,
            DUEL_RULES.edgePadding,
            DUEL_RULES.arenaWidth - DUEL_RULES.edgePadding,
          );
          fighter.y = clamp(
            fighter.y + unitY * DUEL_RULES.moveSpeed * elapsedSeconds,
            DUEL_RULES.edgePadding,
            DUEL_RULES.arenaHeight - DUEL_RULES.edgePadding,
          );
          fighter.facing = Math.atan2(unitY, unitX);
          if (fighter.hitUntil <= at && fighter.attackUntil <= at) fighter.lastAction = 'move';
        }
      }

      const pendingHits = [];
      for (const attacker of room.players) {
        const attack = attacker.pendingAttack;
        attacker.pendingAttack = 'none';
        if (attacker.hp <= 0 || attack === 'none' || attacker.input.guard || attacker.cooldownUntil > at) continue;
        const target = room.players.find((fighter) => fighter.id !== attacker.id && fighter.hp > 0);
        if (!target) continue;
        const isBreak = attack === 'break';
        attacker.cooldownUntil = at + (isBreak ? DUEL_RULES.breakCooldownMs : DUEL_RULES.slashCooldownMs);
        attacker.attackUntil = at + (isBreak ? 260 : 190);
        attacker.lastAction = attack;
        attacker.moving = false;
        attacker.facing = Math.atan2(target.y - attacker.y, target.x - attacker.x);
        const range = isBreak ? DUEL_RULES.breakRange : DUEL_RULES.slashRange;
        if (distance(attacker, target) <= range) {
          const guarded = target.guardingUntil > at;
          const damage = isBreak
            ? DUEL_RULES.breakDamage
            : guarded
              ? Math.round(DUEL_RULES.slashDamage * DUEL_RULES.guardDamageMultiplier)
              : DUEL_RULES.slashDamage;
          pendingHits.push({ target, damage, breaksGuard: isBreak || guarded });
        }
      }

      for (const hit of pendingHits) {
        hit.target.hp = Math.max(0, hit.target.hp - hit.damage);
        hit.target.hitUntil = at + 180;
        hit.target.lastAction = 'hit';
        if (hit.breaksGuard) hit.target.guardingUntil = 0;
      }

      const alive = room.players.filter((fighter) => fighter.hp > 0);
      if (alive.length < 2) {
        const winnerId = alive.length === 1 ? alive[0].id : null;
        events.push(...finishRoom(room, winnerId, alive.length ? 'knockout' : 'draw', at));
        continue;
      }
      if (at >= room.endsAt) {
        const [first, second] = room.players;
        const winnerId = first.hp === second.hp ? null : first.hp > second.hp ? first.id : second.id;
        events.push(...finishRoom(room, winnerId, winnerId ? 'timeout' : 'draw', at));
        continue;
      }

      const snapshot = roomSnapshot(room, at);
      for (const fighter of room.players) {
        events.push(targeted(fighter.id, { type: 'duel-snapshot', snapshot }));
      }
    }
    return events;
  };

  return {
    queuePlayer,
    applyInput,
    leavePlayer,
    disconnectPlayer: (playerId) => leavePlayer(playerId, 'disconnected'),
    tick,
    inspect: () => ({
      queue: [...queue],
      rooms: [...rooms.values()].map((room) => roomSnapshot(room, now())),
      playerRooms: new Map(playerRooms),
    }),
  };
};
