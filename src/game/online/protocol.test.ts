import { describe, expect, it } from 'vitest';
import { parseServerOnlineMessage, sanitizeOnlineName } from './protocol';

describe('online presence protocol', () => {
  it('keeps readable Korean player names and removes markup', () => {
    expect(sanitizeOnlineName('  김동혁 <script>  ')).toBe('김동혁 script');
  });

  it('provides a safe fallback and limits long names', () => {
    expect(sanitizeOnlineName('@@@')).toBe('떠돌이');
    expect(sanitizeOnlineName('아스라의전설적인검객김동혁일세친구들과함께')).toHaveLength(16);
  });

  it('strictly accepts complete duel snapshots and rejects unknown or malformed fields', () => {
    const fighter = (id: string, fighterId: 'donghyeok' | 'hajin') => ({
      id,
      name: id,
      fighterId,
      x: 352,
      y: 225,
      facing: 0,
      hp: 100,
      maxHp: 100,
      status: 'idle',
      guarding: false,
      cooldownMs: 0,
      lastAction: 'none',
    });
    const message = {
      type: 'duel-snapshot',
      snapshot: {
        roomId: 'duel-room-1',
        tick: 4,
        phase: 'fighting',
        round: 1,
        remainingMs: 59_000,
        players: [fighter('player-a', 'donghyeok'), fighter('player-b', 'hajin')],
        winnerId: null,
        endReason: null,
      },
    };

    expect(parseServerOnlineMessage(JSON.stringify(message))).toEqual(message);
    expect(parseServerOnlineMessage(JSON.stringify({ ...message, injected: true }))).toBeNull();
    expect(parseServerOnlineMessage(JSON.stringify({
      ...message,
      snapshot: { ...message.snapshot, tick: -1 },
    }))).toBeNull();
    expect(parseServerOnlineMessage(JSON.stringify({
      ...message,
      snapshot: {
        ...message.snapshot,
        players: [{ ...fighter('player-a', 'donghyeok'), fighterId: 'admin' }, fighter('player-b', 'hajin')],
      },
    }))).toBeNull();
  });

  it('requires personalized match identity and a safe room id', () => {
    expect(parseServerOnlineMessage(JSON.stringify({
      type: 'duel-match', roomId: 'duel-room-1', selfId: 'player-a', opponentId: 'player-b',
    }))).toMatchObject({ type: 'duel-match', selfId: 'player-a' });
    expect(parseServerOnlineMessage(JSON.stringify({
      type: 'duel-match', roomId: '../room', selfId: 'player-a', opponentId: 'player-b',
    }))).toBeNull();
  });
});
