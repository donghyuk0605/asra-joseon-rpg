import type { RegionId } from '../world/regions';
import type {
  ClientOnlineMessage, DuelFighterId, DuelServerMessage, OnlinePresence, PvpServerMessage,
} from './protocol';
import { parseServerOnlineMessage, sanitizeOnlineName } from './protocol';

export type DuelInput = {
  moveX: number;
  moveY: number;
  attack: 'none' | 'slash' | 'break';
  guard: boolean;
};

type OnlineClientOptions = {
  url: string;
  name: string;
  onRoster: (players: OnlinePresence[]) => void;
  onStatus: (status: 'connecting' | 'connected' | 'reconnecting' | 'offline', onlineCount: number) => void;
  onDuelEvent?: (message: DuelServerMessage) => void;
  onPvpEvent?: (message: PvpServerMessage) => void;
  socketFactory?: (url: string) => WebSocket;
};

export class OnlineClient {
  private socket: WebSocket | null = null;
  private selfId = '';
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private stopped = false;
  private onlineCount = 0;
  private duelState: 'idle' | 'queued' | 'matched' = 'idle';
  private duelRoomId = '';
  private duelInputSequence = 0;
  private lastDuelTick = -1;
  private readonly name: string;
  private readonly socketFactory: (url: string) => WebSocket;

  constructor(private readonly options: OnlineClientOptions) {
    this.name = sanitizeOnlineName(options.name);
    this.socketFactory = options.socketFactory ?? ((url) => new WebSocket(url));
  }

  connect(): void {
    this.stopped = false;
    this.clearReconnect();
    this.selfId = '';
    this.options.onStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting', this.onlineCount);
    const socket = this.socketFactory(this.options.url);
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.send({ type: 'join', name: this.name });
      this.options.onStatus('connected', Math.max(1, this.onlineCount));
    });
    socket.addEventListener('message', (event) => this.receive(String(event.data)));
    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = null;
      this.resetDuel('reconnecting');
      if (!this.stopped) this.scheduleReconnect();
    });
    socket.addEventListener('error', () => socket.close());
  }

  disconnect(): void {
    this.stopped = true;
    this.clearReconnect();
    if (this.duelState !== 'idle') this.send({ type: 'duel-leave' });
    this.socket?.close();
    this.socket = null;
    this.resetDuel('disconnected');
    this.options.onRoster([]);
    this.options.onStatus('offline', 0);
  }

  publish(state: Omit<Extract<ClientOnlineMessage, { type: 'state' }>, 'type'>): void {
    this.send({ type: 'state', ...state });
  }

  queueDuel(fighterId: DuelFighterId): boolean {
    if (this.duelState !== 'idle') return false;
    const sent = this.send({ type: 'duel-queue', fighterId });
    if (sent) {
      this.duelState = 'queued';
      this.duelRoomId = '';
      this.duelInputSequence = 0;
      this.lastDuelTick = -1;
    }
    return sent;
  }

  leaveDuel(): boolean {
    if (this.duelState === 'idle') return false;
    return this.send({ type: 'duel-leave' });
  }

  publishDuelInput(input: DuelInput): boolean {
    if (this.duelState !== 'matched' || !this.duelRoomId) return false;
    const moveX = Math.max(-1, Math.min(1, Number.isFinite(input.moveX) ? input.moveX : 0));
    const moveY = Math.max(-1, Math.min(1, Number.isFinite(input.moveY) ? input.moveY : 0));
    return this.send({
      type: 'duel-input',
      roomId: this.duelRoomId,
      seq: this.duelInputSequence++,
      moveX,
      moveY,
      attack: input.attack,
      guard: input.guard,
    });
  }

  createPvpRoom(roomName: string, fighterId: DuelFighterId): boolean {
    return this.send({ type: 'pvp-room-create', roomName, fighterId });
  }

  joinPvpRoom(roomId: string, fighterId: DuelFighterId): boolean {
    return this.send({ type: 'pvp-room-join', roomId, fighterId });
  }

  leavePvpRoom(): boolean {
    return this.send({ type: 'pvp-room-leave' });
  }

  requestPvpRoomList(): boolean {
    return this.send({ type: 'pvp-room-list-request' });
  }

  publishPvpState(x: number, y: number, facing: number, moving: boolean): boolean {
    return this.send({ type: 'pvp-state', x, y, facing, moving });
  }

  private send(message: ClientOnlineMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  private receive(raw: string): void {
    const message = parseServerOnlineMessage(raw);
    if (!message) return;
    if (message.type === 'welcome') {
      this.selfId = message.id;
      return;
    }
    if (message.type === 'roster') {
      const players = message.players.filter((player) => player.id !== this.selfId);
      this.onlineCount = message.players.length;
      this.options.onRoster(players);
      this.options.onStatus('connected', this.onlineCount);
      return;
    }
    if (message.type === 'duel-queued') {
      this.duelState = 'queued';
      this.options.onDuelEvent?.(message);
      return;
    }
    if (message.type === 'duel-match') {
      if (this.selfId && message.selfId !== this.selfId) return;
      this.duelState = 'matched';
      this.duelRoomId = message.roomId;
      this.duelInputSequence = 0;
      this.lastDuelTick = -1;
      this.options.onDuelEvent?.(message);
      return;
    }
    if (message.type === 'duel-snapshot' || message.type === 'duel-ended') {
      if (this.duelState !== 'matched' || message.snapshot.roomId !== this.duelRoomId) return;
      if (message.snapshot.tick <= this.lastDuelTick) return;
      this.lastDuelTick = message.snapshot.tick;
      this.options.onDuelEvent?.(message);
      if (message.type === 'duel-ended') this.clearDuelState();
      return;
    }
    if (message.type === 'duel-idle') {
      this.clearDuelState();
      this.options.onDuelEvent?.(message);
    }
    // PvP room events
    if (
      message.type === 'pvp-room-list'
      || message.type === 'pvp-room-created'
      || message.type === 'pvp-room-error'
      || message.type === 'pvp-room-dissolved'
      || message.type === 'pvp-room-left'
      || message.type === 'pvp-guest-left'
      || message.type === 'pvp-field-enter'
      || message.type === 'pvp-opponent-state'
    ) {
      this.options.onPvpEvent?.(message);
    }
  }

  private clearDuelState(): void {
    this.duelState = 'idle';
    this.duelRoomId = '';
    this.duelInputSequence = 0;
    this.lastDuelTick = -1;
  }

  private resetDuel(reason: 'reconnecting' | 'disconnected'): void {
    if (this.duelState === 'idle') return;
    this.clearDuelState();
    this.options.onDuelEvent?.({ type: 'duel-idle', reason });
  }

  private scheduleReconnect(): void {
    this.reconnectAttempt += 1;
    this.options.onStatus('reconnecting', this.onlineCount);
    const delay = Math.min(12_000, 900 * 2 ** Math.min(4, this.reconnectAttempt - 1));
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

export type OnlineLocalState = {
  x: number;
  y: number;
  facing: number;
  moving: boolean;
  region: RegionId;
};
