import { describe, expect, it } from 'vitest';
import {
  DUEL_RULES,
  createDuelEngine,
  parseClientOnlineMessage,
} from './duel-engine.mjs';

const player = (
  id: string,
  fighterId: 'donghyeok' | 'hajin' | 'yeonhwa' | 'gwanghae',
) => ({ id, name: id, fighterId });

const setupMatch = () => {
  let currentTime = 1_000;
  const engine = createDuelEngine({
    now: () => currentTime,
    createRoomId: () => 'duel-room-1',
  });
  engine.queuePlayer(player('player-a', 'donghyeok'));
  const events = engine.queuePlayer(player('player-b', 'hajin'));
  return {
    engine,
    events,
    roomId: 'duel-room-1',
    now: () => currentTime,
    setTime: (value: number) => { currentTime = value; },
  };
};

describe('authoritative duel engine', () => {
  it('strictly parses legacy world state and allowlisted duel commands', () => {
    const regions = new Set(['ulleungcoast']);
    expect(parseClientOnlineMessage(JSON.stringify({
      type: 'state', x: 10, y: 20, facing: 0, moving: true, region: 'ulleungcoast',
    }), regions)).toMatchObject({ type: 'state', region: 'ulleungcoast' });
    expect(parseClientOnlineMessage(JSON.stringify({
      type: 'duel-queue', fighterId: 'yeonhwa',
    }), regions)).toEqual({ type: 'duel-queue', fighterId: 'yeonhwa' });
    expect(parseClientOnlineMessage(JSON.stringify({
      type: 'duel-input', roomId: 'duel-room-1', seq: 0,
      moveX: 0, moveY: 0, attack: 'break', guard: false,
    }), regions)).toMatchObject({ attack: 'break', seq: 0 });

    expect(parseClientOnlineMessage(JSON.stringify({
      type: 'duel-queue', fighterId: 'admin',
    }), regions)).toBeNull();
    expect(parseClientOnlineMessage(JSON.stringify({
      type: 'duel-input', roomId: 'duel-room-1', seq: 0,
      moveX: 0, moveY: 0, attack: true, guard: false,
    }), regions)).toBeNull();
    expect(parseClientOnlineMessage(JSON.stringify({
      type: 'duel-input', roomId: 'duel-room-1', seq: -1,
      moveX: 0, moveY: 0, attack: 'slash', guard: false,
    }), regions)).toBeNull();
    expect(parseClientOnlineMessage(JSON.stringify({
      type: 'duel-leave', injected: true,
    }), regions)).toBeNull();
  });

  it('automatches exactly two players and keeps a third player isolated in queue', () => {
    const { engine, events } = setupMatch();
    expect(events.filter((event: any) => event.message.type === 'duel-match')).toEqual([
      expect.objectContaining({
        to: 'player-a',
        message: expect.objectContaining({ selfId: 'player-a', opponentId: 'player-b' }),
      }),
      expect.objectContaining({
        to: 'player-b',
        message: expect.objectContaining({ selfId: 'player-b', opponentId: 'player-a' }),
      }),
    ]);

    expect(engine.queuePlayer(player('player-c', 'gwanghae'))).toEqual([
      { to: 'player-c', message: { type: 'duel-queued', position: 1 } },
    ]);
    expect(engine.inspect().queue).toEqual(['player-c']);
    expect(new Set(engine.tick(1_050).map((event: any) => event.to))).toEqual(new Set(['player-a', 'player-b']));
  });

  it('spawns within UI-only attack range and resolves slash cooldown on the server', () => {
    const { engine, roomId, setTime } = setupMatch();
    const initial = engine.inspect().rooms[0];
    expect(Math.abs(initial.players[0].x - initial.players[1].x)).toBe(96);
    expect(Math.abs(initial.players[0].x - initial.players[1].x)).toBeLessThanOrEqual(DUEL_RULES.slashRange);

    setTime(1_050);
    expect(engine.applyInput('player-a', {
      roomId, seq: 0, moveX: 0, moveY: 0, attack: 'slash', guard: false,
    })).toEqual({ ok: true });
    engine.tick(1_050);
    expect(engine.inspect().rooms[0].players.find((entry: any) => entry.id === 'player-b').hp).toBe(82);

    setTime(1_100);
    engine.applyInput('player-a', {
      roomId, seq: 1, moveX: 0, moveY: 0, attack: 'slash', guard: false,
    });
    engine.tick(1_100);
    expect(engine.inspect().rooms[0].players.find((entry: any) => entry.id === 'player-b').hp).toBe(82);

    setTime(1_750);
    engine.applyInput('player-a', {
      roomId, seq: 2, moveX: 0, moveY: 0, attack: 'slash', guard: false,
    });
    engine.tick(1_750);
    expect(engine.inspect().rooms[0].players.find((entry: any) => entry.id === 'player-b').hp).toBe(64);
  });

  it('reduces the next slash by 55 percent during a 900ms guard and lets break penetrate it', () => {
    const guardedSlash = setupMatch();
    guardedSlash.setTime(1_050);
    guardedSlash.engine.applyInput('player-b', {
      roomId: guardedSlash.roomId, seq: 0, moveX: 0, moveY: 0, attack: 'none', guard: true,
    });
    guardedSlash.engine.applyInput('player-a', {
      roomId: guardedSlash.roomId, seq: 0, moveX: 0, moveY: 0, attack: 'slash', guard: false,
    });
    guardedSlash.engine.tick(1_050);
    const guardedFighter = guardedSlash.engine.inspect().rooms[0].players.find((entry: any) => entry.id === 'player-b');
    expect(guardedFighter.hp).toBe(92);
    expect(guardedFighter.guarding).toBe(false);

    const brokenGuard = setupMatch();
    brokenGuard.setTime(1_050);
    brokenGuard.engine.applyInput('player-b', {
      roomId: brokenGuard.roomId, seq: 0, moveX: 0, moveY: 0, attack: 'none', guard: true,
    });
    brokenGuard.engine.applyInput('player-a', {
      roomId: brokenGuard.roomId, seq: 0, moveX: 0, moveY: 0, attack: 'break', guard: false,
    });
    brokenGuard.engine.tick(1_050);
    const brokenFighter = brokenGuard.engine.inspect().rooms[0].players.find((entry: any) => entry.id === 'player-b');
    expect(brokenFighter.hp).toBe(76);
    expect(brokenFighter.guarding).toBe(false);
  });

  it('rejects duplicate sequences and reaches knockout using only UI attack actions', () => {
    const { engine, roomId, setTime } = setupMatch();
    let endEvents: any[] = [];
    for (let attackIndex = 0; attackIndex < 5; attackIndex += 1) {
      const attackTime = 1_050 + attackIndex * DUEL_RULES.breakCooldownMs;
      setTime(attackTime);
      expect(engine.applyInput('player-a', {
        roomId,
        seq: attackIndex,
        moveX: 0,
        moveY: 0,
        attack: 'break',
        guard: false,
      })).toEqual({ ok: true });
      if (attackIndex === 0) {
        expect(engine.applyInput('player-a', {
          roomId, seq: 0, moveX: 0, moveY: 0, attack: 'slash', guard: false,
        })).toEqual({ ok: false, error: 'stale-sequence' });
      }
      endEvents = engine.tick(attackTime);
    }

    expect(endEvents).toHaveLength(2);
    expect(endEvents[0].message).toMatchObject({
      type: 'duel-ended',
      snapshot: {
        phase: 'finished',
        winnerId: 'player-a',
        endReason: 'knockout',
      },
    });
    expect(endEvents[0].message.snapshot.players.find((entry: any) => entry.id === 'player-b').hp).toBe(0);
    expect(engine.inspect().rooms).toHaveLength(0);
  });

  it('awards a server-side forfeit to the remaining opponent', () => {
    const { engine } = setupMatch();
    const events = engine.disconnectPlayer('player-a');
    expect(events).toHaveLength(2);
    expect(events.map((event: any) => event.to)).toEqual(['player-a', 'player-b']);
    expect(events[1].message).toMatchObject({
      type: 'duel-ended',
      snapshot: { winnerId: 'player-b', endReason: 'forfeit' },
    });
    expect(engine.inspect().rooms).toHaveLength(0);
  });
});
