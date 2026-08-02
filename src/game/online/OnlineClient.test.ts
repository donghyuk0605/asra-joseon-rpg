import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnlineClient } from './OnlineClient';
import type { DuelSnapshot, DuelServerMessage, OnlinePresence } from './protocol';

class FakeSocket {
  readyState = 0;
  sent: string[] = [];
  private readonly listeners = new Map<string, Array<(event: any) => void>>();

  addEventListener(type: string, listener: (event: any) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  send(value: string): void { this.sent.push(value); }
  close(): void { this.readyState = 3; }

  emit(type: string, event: any = {}): void {
    if (type === 'open') this.readyState = 1;
    if (type === 'close') this.readyState = 3;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

const snapshot = (tick: number, roomId = 'duel-room-1'): DuelSnapshot => ({
  roomId,
  tick,
  phase: 'fighting',
  round: 1,
  remainingMs: 59_000,
  players: [
    {
      id: 'player-a', name: '김동혁', fighterId: 'donghyeok', x: 352, y: 225, facing: 0,
      hp: 100, maxHp: 100, status: 'idle', guarding: false, cooldownMs: 0, lastAction: 'none',
    },
    {
      id: 'player-b', name: '하진', fighterId: 'hajin', x: 448, y: 225, facing: Math.PI,
      hp: 100, maxHp: 100, status: 'idle', guarding: false, cooldownMs: 0, lastAction: 'none',
    },
  ],
  winnerId: null,
  endReason: null,
});

describe('OnlineClient duel transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', { OPEN: 1 });
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the open-world roster while sending typed duel actions with client sequences', () => {
    const socket = new FakeSocket();
    const rosters: OnlinePresence[][] = [];
    const duelEvents: DuelServerMessage[] = [];
    const client = new OnlineClient({
      url: 'ws://test.invalid/ws',
      name: '김동혁',
      onRoster: (players) => rosters.push(players),
      onStatus: () => undefined,
      onDuelEvent: (message) => duelEvents.push(message),
      socketFactory: () => socket as unknown as WebSocket,
    });

    client.connect();
    socket.emit('open');
    socket.emit('message', { data: JSON.stringify({ type: 'welcome', id: 'player-a' }) });
    socket.emit('message', { data: JSON.stringify({
      type: 'roster',
      players: [
        { id: 'player-a', name: '김동혁', x: 0, y: 0, facing: 0, moving: false, region: 'ulleungcoast' },
        { id: 'player-b', name: '하진', x: 1, y: 2, facing: 0, moving: true, region: 'ulleungcoast' },
      ],
    }) });

    expect(rosters.at(-1)?.map((player) => player.id)).toEqual(['player-b']);
    expect(client.queueDuel('gwanghae')).toBe(true);
    socket.emit('message', { data: JSON.stringify({ type: 'duel-queued', position: 1 }) });
    socket.emit('message', { data: JSON.stringify({
      type: 'duel-match', roomId: 'duel-room-1', selfId: 'player-a', opponentId: 'player-b',
    }) });

    expect(client.publishDuelInput({ moveX: 0, moveY: 0, attack: 'slash', guard: false })).toBe(true);
    expect(client.publishDuelInput({ moveX: 2, moveY: -2, attack: 'break', guard: false })).toBe(true);
    expect(client.publishDuelInput({ moveX: 0, moveY: 0, attack: 'none', guard: true })).toBe(true);

    const sent = socket.sent.map((value) => JSON.parse(value));
    expect(sent).toEqual(expect.arrayContaining([
      { type: 'join', name: '김동혁' },
      { type: 'duel-queue', fighterId: 'gwanghae' },
      {
        type: 'duel-input', roomId: 'duel-room-1', seq: 0,
        moveX: 0, moveY: 0, attack: 'slash', guard: false,
      },
      {
        type: 'duel-input', roomId: 'duel-room-1', seq: 1,
        moveX: 1, moveY: -1, attack: 'break', guard: false,
      },
      {
        type: 'duel-input', roomId: 'duel-room-1', seq: 2,
        moveX: 0, moveY: 0, attack: 'none', guard: true,
      },
    ]));
    expect(duelEvents.map((event) => event.type)).toEqual(['duel-queued', 'duel-match']);
  });

  it('ignores wrong-room and stale snapshots, then returns safely to idle on reconnect', () => {
    const socket = new FakeSocket();
    const duelEvents: DuelServerMessage[] = [];
    const client = new OnlineClient({
      url: 'ws://test.invalid/ws',
      name: '연화',
      onRoster: () => undefined,
      onStatus: () => undefined,
      onDuelEvent: (message) => duelEvents.push(message),
      socketFactory: () => socket as unknown as WebSocket,
    });

    client.connect();
    socket.emit('open');
    socket.emit('message', { data: JSON.stringify({ type: 'welcome', id: 'player-a' }) });
    expect(client.queueDuel('yeonhwa')).toBe(true);
    socket.emit('message', { data: JSON.stringify({
      type: 'duel-match', roomId: 'duel-room-1', selfId: 'player-a', opponentId: 'player-b',
    }) });
    socket.emit('message', { data: JSON.stringify({ type: 'duel-snapshot', snapshot: snapshot(1) }) });
    socket.emit('message', { data: JSON.stringify({ type: 'duel-snapshot', snapshot: snapshot(1) }) });
    socket.emit('message', { data: JSON.stringify({ type: 'duel-snapshot', snapshot: snapshot(2, 'duel-room-2') }) });

    expect(duelEvents.map((event) => event.type)).toEqual(['duel-match', 'duel-snapshot']);
    socket.emit('close');
    expect(duelEvents.at(-1)).toEqual({ type: 'duel-idle', reason: 'reconnecting' });
    expect(client.publishDuelInput({ moveX: 0, moveY: 0, attack: 'slash', guard: false })).toBe(false);
  });
});
