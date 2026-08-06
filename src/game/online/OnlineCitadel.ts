import { db } from '../../firebase';
import { ITEM_CATALOG, ITEM_SLOT_LABEL } from '../items/catalog';
import type { ItemId } from '../simulation/types';
import { ensureOnlineIdentity, type OnlineIdentity } from './OnlineIdentity';
import { OnlineClient } from './OnlineClient';
import { sanitizeOnlineName } from './protocol';

type FighterId = 'donghyeok' | 'hajin' | 'yeonhwa' | 'gwanghae';
type DuelPhase = 'idle' | 'queueing' | 'fighting' | 'finished';
type DuelAttack = 'slash' | 'break' | 'none';

type DuelFighterView = {
  id: string;
  name: string;
  fighterId?: FighterId;
  hp: number;
  maxHp: number;
  status?: string;
  guarding?: boolean;
  cooldownMs?: number;
  lastAction?: string;
};

type DuelSnapshotView = {
  roomId: string;
  tick: number;
  phase: 'fighting' | 'finished';
  round?: number;
  remainingMs: number;
  players: DuelFighterView[] | Record<string, DuelFighterView>;
  winnerId: string | null;
  endReason?: string | null;
};

type DuelClient = OnlineClient & {
  queueDuel: (fighterId: FighterId) => void;
  leaveDuel: () => void;
  publishDuelInput: (input: {
    moveX: number;
    moveY: number;
    attack: DuelAttack;
    guard: boolean;
  }) => void;
};

type MarketStatus = 'open' | 'reserved' | 'cancelled';
type MarketOffer = {
  id: string;
  status: MarketStatus;
  itemId?: ItemId;
  item?: { itemId: ItemId; enhancement?: number };
  enhancement?: number;
  askingPrice: number;
  sellerId?: string;
  sellerUid?: string;
  sellerName: string;
  reservedByUid?: string | null;
  reservedBy?: string | null;
  buyerUid?: string | null;
  createdAt?: number | { toMillis?: () => number };
};

type MarketplaceAdapter = {
  mode: 'firestore-proposal' | 'local-demo';
  listOpenOffers: (filter?: { itemId?: ItemId; sort?: 'newest' | 'price-asc'; limit?: number }) => Promise<MarketOffer[]>;
  listMyOffers: (limit?: number) => Promise<MarketOffer[]>;
  listMyReservations: (limit?: number) => Promise<MarketOffer[]>;
  createOffer: (input: {
    item: { itemId: ItemId; enhancement?: number };
    askingPrice: number;
    sellerName?: string;
  }) => Promise<MarketOffer>;
  reserveOffer: (id: string) => Promise<unknown>;
  releaseReservation: (id: string) => Promise<unknown>;
  cancelOffer: (id: string) => Promise<unknown>;
};

type OnlineCitadelOptions = {
  root: HTMLElement;
  multiplayerUrl: string;
  onExit: () => void;
};

const TRADEABLE_ITEM_IDS: ItemId[] = [
  'worn-hwando',
  'frontier-horn-bow',
  'white-birch-bow',
  'iron-horn-warbow',
  'moonsteel-hwando',
  'frontier-lamellar-coat',
  'falcon-eye-bracer',
  'tiger-pelt-armor',
  'weapon-enchant-scroll',
  'armor-enchant-scroll',
  'jurchen-iron-arrowheads',
  'ulleung-tiger-pelt',
];

const fighterPortrait: Record<FighterId, string> = {
  donghyeok: '/assets/ui/kim-donghyeok-portrait-v1.png',
  hajin: '/assets/ui/harlan-portrait-v1.png',
  yeonhwa: '/assets/ui/yeonhwa-portrait-v1.webp',
  gwanghae: '/assets/ui/gwanghae-crown-prince-portrait-v1.webp',
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const marketOfferItemId = (offer: MarketOffer): ItemId | null => {
  const itemId = offer.itemId ?? offer.item?.itemId;
  return itemId && Object.prototype.hasOwnProperty.call(ITEM_CATALOG, itemId) ? itemId : null;
};

const marketOfferEnhancement = (offer: MarketOffer): number =>
  Math.max(0, Math.min(5, Math.floor(offer.enhancement ?? offer.item?.enhancement ?? 0)));

const marketSellerId = (offer: MarketOffer): string => offer.sellerId ?? offer.sellerUid ?? '';
const marketReservedBy = (offer: MarketOffer): string => offer.reservedByUid ?? offer.reservedBy ?? offer.buyerUid ?? '';

export class OnlineCitadel {
  private client: OnlineClient | null = null;
  private market: MarketplaceAdapter | null = null;
  private identity: OnlineIdentity | null = null;
  private playerName = '김동혁';
  private duelPhase: DuelPhase = 'idle';
  private duelSelfId = '';
  private duelRoomId = '';
  private selectedOfferId = '';
  private offers: MarketOffer[] = [];
  private refreshTimer: number | null = null;
  private openGeneration = 0;
  private readonly recordedRooms = new Set<string>();
  private readonly fighterActions = new Map<string, string>();

  constructor(private readonly options: OnlineCitadelOptions) {
    this.bindEvents();
    this.populateItemOptions();
    this.renderRecord();
  }

  async open(name: string): Promise<void> {
    this.closeConnections();
    const generation = ++this.openGeneration;
    this.playerName = sanitizeOnlineName(name);
    this.text('[data-online-name]', this.playerName);
    this.text('[data-duel-self-name]', this.playerName);
    this.resetDuel('상대를 찾아 결투를 시작하십시오');
    this.switchTab(new URLSearchParams(window.location.search).get('online') === 'market' ? 'market' : 'arena');
    this.setConnectionStatus('connecting', 0);

    const clientOptions = {
      url: this.options.multiplayerUrl,
      name: this.playerName,
      onRoster: () => undefined,
      onStatus: (status: 'connecting' | 'connected' | 'reconnecting' | 'offline', count: number) =>
        this.setConnectionStatus(status, count),
      onDuelEvent: (event: unknown) => this.handleDuelEvent(event),
    } as ConstructorParameters<typeof OnlineClient>[0] & { onDuelEvent: (event: unknown) => void };
    this.client = new OnlineClient(clientOptions);
    this.client.connect();

    const identity = await ensureOnlineIdentity();
    if (generation !== this.openGeneration || this.options.root.hidden) return;
    this.identity = identity;
    await this.createMarketplace(identity);
    if (generation !== this.openGeneration || this.options.root.hidden) return;
    await this.refreshMarket();
  }

  close(): void {
    this.openGeneration += 1;
    this.closeConnections();
    this.closeSellForm();
  }

  private closeConnections(): void {
    this.client?.disconnect();
    this.client = null;
    this.market = null;
    this.identity = null;
    if (this.refreshTimer !== null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  private bindEvents(): void {
    this.options.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const tab = target.closest<HTMLButtonElement>('[data-online-tab]')?.dataset.onlineTab;
      if (tab === 'arena' || tab === 'market') this.switchTab(tab);

      const onlineAction = target.closest<HTMLButtonElement>('[data-online-action]')?.dataset.onlineAction;
      if (onlineAction === 'exit') this.options.onExit();

      const duelAction = target.closest<HTMLButtonElement>('[data-duel-action]')?.dataset.duelAction;
      if (duelAction) this.handleDuelAction(duelAction);

      const marketAction = target.closest<HTMLButtonElement>('[data-market-action]')?.dataset.marketAction;
      if (marketAction === 'refresh') void this.refreshMarket();
      if (marketAction === 'open-sell') this.openSellForm();
      if (marketAction === 'close-sell') this.closeSellForm();
      if (marketAction === 'close-detail') this.closeMarketDetail();
      if (marketAction === 'reserve') void this.reserveSelectedOffer();
      if (marketAction === 'release') void this.releaseSelectedOffer();
      if (marketAction === 'cancel') void this.cancelSelectedOffer();

      const offerId = target.closest<HTMLElement>('[data-market-offer-id]')?.dataset.marketOfferId;
      if (offerId) this.selectOffer(offerId);
    });

    this.options.root.querySelector<HTMLFormElement>('[data-market-sell-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submitOffer();
    });
    this.options.root.querySelector<HTMLInputElement>('[data-market-search]')?.addEventListener('input', () => this.renderMarketList());
    this.options.root.querySelector<HTMLSelectElement>('[data-market-slot]')?.addEventListener('change', () => this.renderMarketList());
    window.addEventListener('keydown', (event) => {
      if (this.options.root.hidden || this.duelPhase !== 'fighting') return;
      if (event.key === '1') this.handleDuelAction('slash');
      if (event.key === '2') this.handleDuelAction('break');
      if (event.key === '3') this.handleDuelAction('guard');
    });
  }

  private switchTab(tab: 'arena' | 'market'): void {
    this.options.root.querySelectorAll<HTMLElement>('[data-online-panel]').forEach((panel) => {
      const active = panel.dataset.onlinePanel === tab;
      panel.toggleAttribute('hidden', !active);
      panel.classList.toggle('is-active', active);
    });
    this.options.root.querySelectorAll<HTMLButtonElement>('[data-online-tab]').forEach((button) => {
      const active = button.dataset.onlineTab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (tab === 'market' && this.market) void this.refreshMarket();
  }

  private setConnectionStatus(
    status: 'connecting' | 'connected' | 'reconnecting' | 'offline',
    count: number,
  ): void {
    const identity = this.element<HTMLElement>('.online-citadel__identity');
    identity.classList.toggle('is-connected', status === 'connected');
    identity.classList.toggle('is-reconnecting', status === 'reconnecting');
    const label = status === 'connected'
      ? `성채 ${Math.max(1, count)}명`
      : status === 'reconnecting'
        ? '서버 복구 중'
        : status === 'offline' ? '서버 오프라인' : '서버 확인 중';
    this.text('[data-online-status]', label);
  }

  private handleDuelAction(action: string): void {
    const client = this.client as DuelClient | null;
    if (!client) return;
    if (action === 'queue') {
      if (this.duelPhase === 'queueing' || this.duelPhase === 'fighting') {
        client.leaveDuel();
        this.resetDuel('대련 접수를 취소했습니다');
      } else {
        // A finished room can immediately enter matchmaking again. Clear the
        // prior result and defeated visuals before the new queue state is
        // rendered so an old win/loss card never covers the next round.
        this.resetDuel('대련 접수를 준비합니다');
        const queued = client.queueDuel('donghyeok');
        if (!queued) {
          this.text('[data-duel-status]', '결투 서버에 아직 연결되지 않았습니다');
          this.text('[data-duel-copy]', '연결 상태가 초록색으로 바뀐 뒤 다시 시도하십시오.');
          return;
        }
        this.duelPhase = 'queueing';
        this.setQueueButton('접수 취소', false);
        this.text('[data-duel-status]', '맞설 무사를 찾고 있습니다');
        this.text('[data-duel-copy]', '다른 접속자가 대련을 신청하면 즉시 같은 방에 배정됩니다.');
        this.text('[data-duel-round]', 'MATCHING');
        this.text('[data-duel-opponent-name]', '대련 명부 확인 중');
        this.appendDuelLog('접수', '대련 명부에 이름을 올렸습니다.');
      }
      return;
    }
    if (this.duelPhase !== 'fighting') return;
    if (action === 'slash' || action === 'break') {
      client.publishDuelInput({ moveX: 0, moveY: 0, attack: action, guard: false });
    }
    if (action === 'guard') {
      client.publishDuelInput({ moveX: 0, moveY: 0, attack: 'none', guard: true });
    }
  }

  private handleDuelEvent(value: unknown): void {
    const message = asRecord(value);
    if (!message || typeof message.type !== 'string') return;
    if (message.type === 'duel-queued') {
      this.duelPhase = 'queueing';
      const position = typeof message.position === 'number' ? Math.max(1, Math.floor(message.position)) : 1;
      this.text('[data-duel-status]', `대련 상대를 찾는 중 · 대기 ${position}번째`);
      this.setQueueButton('접수 취소', false);
      return;
    }
    if (message.type === 'duel-match') {
      this.duelPhase = 'fighting';
      this.element<HTMLElement>('[data-duel-result]').setAttribute('hidden', '');
      this.duelSelfId = typeof message.selfId === 'string' ? message.selfId : '';
      this.duelRoomId = typeof message.roomId === 'string' ? message.roomId : '';
      this.text('[data-duel-status]', '대련 상대가 정해졌습니다');
      this.text('[data-duel-copy]', '서버 판정이 시작되었습니다. 행동 단축키 1·2·3을 사용할 수 있습니다.');
      this.text('[data-duel-round]', 'ROUND 1');
      this.setQueueButton('결투 포기', false);
      this.setCombatButtons(true);
      this.appendDuelLog('대진', '연무관의 북이 울렸습니다.');
      return;
    }
    if (message.type === 'duel-snapshot' || message.type === 'duel-ended') {
      const snapshot = asRecord(message.snapshot) as unknown as DuelSnapshotView | null;
      if (!snapshot) return;
      this.renderDuelSnapshot(snapshot);
      if (message.type === 'duel-ended' || snapshot.phase === 'finished') this.finishDuel(snapshot);
      return;
    }
    if (message.type === 'duel-idle') {
      const reason = message.reason === 'reconnecting'
        ? '연결이 바뀌어 대련 접수가 초기화되었습니다'
        : message.reason === 'disconnected'
          ? '상대와의 연결이 끝났습니다'
          : '대련 접수를 취소했습니다';
      this.resetDuel(reason);
    }
  }

  private renderDuelSnapshot(snapshot: DuelSnapshotView): void {
    this.duelRoomId = snapshot.roomId || this.duelRoomId;
    const fighters = Array.isArray(snapshot.players) ? snapshot.players : Object.values(snapshot.players || {});
    const self = fighters.find((fighter) => fighter.id === this.duelSelfId) ?? fighters[0];
    const opponent = fighters.find((fighter) => fighter.id !== self?.id);
    if (!self) return;
    this.duelPhase = snapshot.phase === 'finished' ? 'finished' : 'fighting';
    this.renderFighter('self', self);
    if (opponent) this.renderFighter('opponent', opponent);
    this.text('[data-duel-timer]', `${Math.max(0, Math.ceil(snapshot.remainingMs / 1000))}`);
    this.text('[data-duel-round]', snapshot.phase === 'finished' ? 'DUEL END' : `ROUND ${snapshot.round ?? 1}`);
    this.setCombatButtons(snapshot.phase === 'fighting' && self.hp > 0);
  }

  private renderFighter(side: 'self' | 'opponent', fighter: DuelFighterView): void {
    const hp = Math.max(0, Math.min(fighter.maxHp || 100, fighter.hp));
    const maxHp = Math.max(1, fighter.maxHp || 100);
    this.text(`[data-duel-${side}-name]`, fighter.name || (side === 'self' ? this.playerName : '이름 없는 무사'));
    this.text(`[data-duel-${side}-hp-label]`, `${Math.ceil(hp)} / ${Math.ceil(maxHp)}`);
    const bar = this.element<HTMLElement>(`[data-duel-${side}-hp]`);
    bar.style.width = `${Math.max(0, Math.min(100, hp / maxHp * 100))}%`;
    const state = fighter.guarding ? '수비 태세' : fighter.status === 'defeated'
      ? '전투 불능'
      : fighter.cooldownMs && fighter.cooldownMs > 0 ? `다음 행동 ${Math.ceil(fighter.cooldownMs / 100) / 10}초` : '행동 가능';
    this.text(`[data-duel-${side}-state]`, state);

    const portrait = this.options.root.querySelector<HTMLImageElement>(`[data-duel-fighter="${side}"] img`);
    if (portrait && fighter.fighterId && fighterPortrait[fighter.fighterId]) {
      portrait.src = fighterPortrait[fighter.fighterId];
    }
    const root = this.element<HTMLElement>(`[data-duel-fighter="${side}"]`);
    root.classList.toggle('is-defeated', hp <= 0 || fighter.status === 'defeated');
    const priorAction = this.fighterActions.get(fighter.id);
    const action = `${fighter.status ?? ''}:${fighter.lastAction ?? ''}`;
    if (action !== priorAction) {
      root.classList.remove('is-attacking', 'is-hit');
      void root.offsetWidth;
      if (fighter.status === 'attacking' || fighter.lastAction === 'attack') root.classList.add('is-attacking');
      if (fighter.status === 'hit' || fighter.lastAction === 'hit') root.classList.add('is-hit');
      if (fighter.lastAction === 'attack') this.appendDuelLog('공방', `${fighter.name}의 공격이 이어집니다.`);
      if (fighter.lastAction === 'guard') this.appendDuelLog('수비', `${fighter.name}이 자세를 낮췄습니다.`);
      this.fighterActions.set(fighter.id, action);
    }
  }

  private finishDuel(snapshot: DuelSnapshotView): void {
    this.duelPhase = 'finished';
    this.setCombatButtons(false);
    this.setQueueButton('다시 상대 찾기', false);
    const won = Boolean(snapshot.winnerId && snapshot.winnerId === this.duelSelfId);
    const draw = !snapshot.winnerId;
    const title = draw ? '무승부' : won ? '승리' : '패배';
    const reason = snapshot.endReason === 'forfeit' ? '한 무사가 승부를 포기했습니다.'
      : snapshot.endReason === 'timeout' ? '제한 시간이 끝나 판정으로 승부가 갈렸습니다.'
        : snapshot.endReason === 'draw' ? '두 무사가 끝까지 버텼습니다.' : '체력이 모두 소진되어 승부가 끝났습니다.';
    this.text('[data-duel-result-title]', title);
    this.text('[data-duel-result-copy]', reason);
    this.element<HTMLElement>('[data-duel-result]').removeAttribute('hidden');
    this.text('[data-duel-status]', `${title} · 서버 전적 기록 완료`);
    if (this.duelRoomId && !this.recordedRooms.has(this.duelRoomId)) {
      this.recordedRooms.add(this.duelRoomId);
      this.updateRecord(won, draw);
    }
    this.appendDuelLog('결과', `${title} — ${reason}`);
  }

  private resetDuel(status: string): void {
    this.duelPhase = 'idle';
    this.duelSelfId = '';
    this.duelRoomId = '';
    this.fighterActions.clear();
    this.text('[data-duel-status]', status);
    this.text('[data-duel-copy]', '두 명이 모이면 서버가 방을 만들고 승부를 시작합니다.');
    this.text('[data-duel-round]', 'DUEL READY');
    this.text('[data-duel-timer]', '--');
    this.text('[data-duel-opponent-name]', '상대를 기다리는 중');
    this.text('[data-duel-self-hp-label]', '100 / 100');
    this.text('[data-duel-opponent-hp-label]', '100 / 100');
    this.text('[data-duel-self-state]', '출전 대기');
    this.text('[data-duel-opponent-state]', '미입장');
    this.element<HTMLElement>('[data-duel-self-hp]').style.width = '100%';
    this.element<HTMLElement>('[data-duel-opponent-hp]').style.width = '100%';
    this.element<HTMLElement>('[data-duel-result]').setAttribute('hidden', '');
    this.options.root.querySelectorAll<HTMLElement>('[data-duel-fighter]').forEach((fighter) => fighter.classList.remove('is-attacking', 'is-hit', 'is-defeated'));
    this.setCombatButtons(false);
    this.setQueueButton('대련 상대 찾기', false);
  }

  private setCombatButtons(enabled: boolean): void {
    this.options.root.querySelectorAll<HTMLButtonElement>('[data-duel-action="slash"], [data-duel-action="break"], [data-duel-action="guard"]').forEach((button) => {
      button.disabled = !enabled;
    });
  }

  private setQueueButton(label: string, disabled: boolean): void {
    const button = this.element<HTMLButtonElement>('[data-duel-action="queue"]');
    const strong = button.querySelector<HTMLElement>('b');
    if (strong) strong.textContent = label;
    button.disabled = disabled;
  }

  private appendDuelLog(label: string, copy: string): void {
    const log = this.element<HTMLOListElement>('[data-duel-log]');
    const row = document.createElement('li');
    const time = document.createElement('time');
    const text = document.createElement('span');
    time.textContent = label;
    text.textContent = copy;
    row.append(time, text);
    log.append(row);
    while (log.children.length > 8) log.firstElementChild?.remove();
    log.scrollTop = log.scrollHeight;
  }

  private updateRecord(won: boolean, draw: boolean): void {
    if (draw) return;
    const key = 'asra-online-duel-record-v1';
    let record = { wins: 0, losses: 0 };
    try {
      const stored = JSON.parse(localStorage.getItem(key) || 'null') as typeof record | null;
      if (stored && Number.isInteger(stored.wins) && Number.isInteger(stored.losses)) record = stored;
      if (won) record.wins += 1;
      else record.losses += 1;
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      // The duel itself remains valid when browser storage is unavailable.
    }
    this.text('[data-duel-record]', `${record.wins}승 ${record.losses}패`);
  }

  private renderRecord(): void {
    try {
      const record = JSON.parse(localStorage.getItem('asra-online-duel-record-v1') || 'null') as { wins?: unknown; losses?: unknown } | null;
      const wins = typeof record?.wins === 'number' ? Math.max(0, Math.floor(record.wins)) : 0;
      const losses = typeof record?.losses === 'number' ? Math.max(0, Math.floor(record.losses)) : 0;
      this.text('[data-duel-record]', `${wins}승 ${losses}패`);
    } catch {
      this.text('[data-duel-record]', '0승 0패');
    }
  }

  private async createMarketplace(identity: OnlineIdentity): Promise<void> {
    const marketplaceModule = await import('./MarketplaceService') as unknown as {
      MarketplaceService: new (options: Record<string, unknown>) => MarketplaceAdapter;
    };
    this.market = new marketplaceModule.MarketplaceService({
      db,
      getIdentity: () => identity.source === 'firebase'
        ? { uid: identity.uid, displayName: this.playerName }
        : null,
      storage: identity.source === 'local-demo' ? localStorage : null,
      demoIdentity: { id: identity.uid, displayName: this.playerName },
    });
    this.text('[data-market-mode]', this.market.mode === 'firestore-proposal' ? 'Firestore 온라인 제안 장부' : '이 기기의 격리된 시범 장부');
    if (this.refreshTimer !== null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = window.setInterval(() => {
      if (!this.options.root.hidden && !this.element<HTMLElement>('[data-online-panel="market"]').hidden) void this.refreshMarket();
    }, 8_000);
  }

  private async refreshMarket(): Promise<void> {
    if (!this.market) return;
    const list = this.element<HTMLElement>('[data-market-list]');
    list.setAttribute('aria-busy', 'true');
    try {
      const [openOffers, myOffers, myReservations] = await Promise.all([
        this.market.listOpenOffers({ sort: 'newest', limit: 40 }),
        this.market.listMyOffers(30),
        this.market.listMyReservations(30),
      ]);
      const merged = new Map<string, MarketOffer>();
      for (const offer of [...openOffers, ...myOffers, ...myReservations]) {
        if (offer.status !== 'cancelled') merged.set(offer.id, offer);
      }
      this.offers = [...merged.values()].sort((left, right) => {
        const leftTime = typeof left.createdAt === 'number' ? left.createdAt : left.createdAt?.toMillis?.() ?? 0;
        const rightTime = typeof right.createdAt === 'number' ? right.createdAt : right.createdAt?.toMillis?.() ?? 0;
        return rightTime - leftTime;
      });
      if (this.selectedOfferId && !this.offers.some((offer) => offer.id === this.selectedOfferId)) this.selectedOfferId = '';
      this.renderMarketList();
      this.renderMarketDetail(
        this.selectedOfferId
          ? this.offers.find((offer) => offer.id === this.selectedOfferId) ?? null
          : null,
      );
    } catch {
      this.renderMarketMessage('장부를 불러오지 못했습니다', 'Firebase 연결 또는 보안 규칙을 확인해 주세요.');
    } finally {
      list.removeAttribute('aria-busy');
    }
  }

  private renderMarketList(): void {
    const search = this.options.root.querySelector<HTMLInputElement>('[data-market-search]')?.value.normalize('NFKC').trim().toLowerCase() ?? '';
    const slot = this.options.root.querySelector<HTMLSelectElement>('[data-market-slot]')?.value ?? 'all';
    const visible = this.offers.filter((offer) => {
      const itemId = marketOfferItemId(offer);
      if (!itemId) return false;
      const definition = ITEM_CATALOG[itemId];
      return (slot === 'all' || definition.slot === slot)
        && (!search || `${definition.name} ${offer.sellerName}`.toLowerCase().includes(search));
    });
    this.text('[data-market-count]', `${visible.length}건`);
    if (!visible.length) {
      this.renderMarketMessage(this.offers.length ? '조건에 맞는 제안이 없습니다' : '아직 열린 제안이 없습니다', this.offers.length ? '다른 이름이나 분류로 찾아보십시오.' : '첫 판매 제안을 장부에 올려 보십시오.');
      return;
    }

    const list = this.element<HTMLElement>('[data-market-list]');
    list.replaceChildren(...visible.map((offer) => this.createMarketCard(offer)));
  }

  private createMarketCard(offer: MarketOffer): HTMLButtonElement {
    const itemId = marketOfferItemId(offer) as ItemId;
    const definition = ITEM_CATALOG[itemId];
    const enhancement = marketOfferEnhancement(offer);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `online-market-card rarity-${definition.rarity}${offer.status === 'reserved' ? ' is-reserved' : ''}${offer.id === this.selectedOfferId ? ' is-selected' : ''}`;
    button.dataset.marketOfferId = offer.id;
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.src = definition.iconPath;
    image.alt = '';
    figure.append(image);
    const copy = document.createElement('span');
    const category = document.createElement('small');
    const title = document.createElement('strong');
    const seller = document.createElement('em');
    category.textContent = `${definition.rarity} · ${ITEM_SLOT_LABEL[definition.slot]}`;
    title.textContent = `${definition.name}${enhancement ? ` +${enhancement}` : ''}`;
    seller.textContent = offer.status === 'reserved'
      ? `${offer.sellerName || '이름 없는 상인'} · 예약 중`
      : `${offer.sellerName || '이름 없는 상인'}의 제안`;
    copy.append(category, title, seller);
    const price = document.createElement('b');
    price.textContent = `${Math.max(1, Math.floor(offer.askingPrice)).toLocaleString('ko-KR')}냥`;
    button.append(figure, copy, price);
    return button;
  }

  private selectOffer(id: string): void {
    this.selectedOfferId = id;
    this.renderMarketList();
    this.renderMarketDetail(this.offers.find((offer) => offer.id === id) ?? null);
  }

  private renderMarketDetail(offer: MarketOffer | null): void {
    const detail = this.element<HTMLElement>('[data-market-detail]');
    detail.classList.toggle('has-offer', Boolean(offer));
    if (!offer) {
      detail.replaceChildren(this.marketDetailIntro());
      return;
    }
    const itemId = marketOfferItemId(offer);
    if (!itemId) return;
    const definition = ITEM_CATALOG[itemId];
    const enhancement = marketOfferEnhancement(offer);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'online-market__detail-close';
    close.dataset.marketAction = 'close-detail';
    close.setAttribute('aria-label', '거래 상세 닫기');
    close.textContent = '×';
    const title = document.createElement('strong');
    title.textContent = `${definition.name}${enhancement ? ` +${enhancement}` : ''}`;
    const kicker = document.createElement('small');
    kicker.textContent = `${definition.rarity} · ${ITEM_SLOT_LABEL[definition.slot]}`;
    const description = document.createElement('p');
    description.textContent = definition.description;
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.src = definition.iconPath;
    image.alt = definition.name;
    figure.append(image);
    const stats = document.createElement('dl');
    const entries = [
      ['판매 제안자', offer.sellerName || '이름 없는 상인'],
      ['희망 금액', `${Math.max(1, Math.floor(offer.askingPrice)).toLocaleString('ko-KR')}냥`],
      ['강화 수치', enhancement ? `+${enhancement}` : '강화 없음'],
      ['거래 상태', offer.status === 'reserved' ? '예약됨' : '예약 가능'],
    ];
    for (const [label, value] of entries) {
      const term = document.createElement('dt');
      const data = document.createElement('dd');
      term.textContent = label;
      data.textContent = value;
      stats.append(term, data);
    }
    const action = document.createElement('button');
    action.type = 'button';
    const myId = this.identity?.uid ?? '';
    if (marketSellerId(offer) === myId) {
      action.dataset.marketAction = 'cancel';
      action.textContent = '내 판매 제안 취소';
    } else if (offer.status === 'reserved' && marketReservedBy(offer) === myId) {
      action.dataset.marketAction = 'release';
      action.textContent = '구매 예약 해제';
    } else {
      action.dataset.marketAction = 'reserve';
      action.textContent = '구매 예약하기';
      action.disabled = offer.status !== 'open';
    }
    detail.replaceChildren(close, kicker, title, description, figure, stats, action, this.marketSafetyNotice());
  }

  private closeMarketDetail(): void {
    this.selectedOfferId = '';
    this.renderMarketList();
    this.renderMarketDetail(null);
  }

  private marketDetailIntro(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const small = document.createElement('small');
    const strong = document.createElement('strong');
    const copy = document.createElement('p');
    small.textContent = 'SELECT AN OFFER';
    strong.textContent = '거래패를 선택하십시오';
    copy.textContent = '목록의 장비를 누르면 판매자와 강화 수치, 제안 가격을 확인할 수 있습니다.';
    fragment.append(small, strong, copy, this.marketSafetyNotice());
    return fragment;
  }

  private marketSafetyNotice(): HTMLElement {
    const safety = document.createElement('div');
    safety.className = 'online-market__safety';
    const title = document.createElement('b');
    const copy = document.createElement('span');
    title.textContent = '온라인 거래 보호';
    copy.textContent = '싱글 플레이의 금화나 장비를 직접 차감하지 않습니다. 이번 단계에서는 제안 등록·예약·취소만 기록합니다.';
    safety.append(title, copy);
    return safety;
  }

  private async reserveSelectedOffer(): Promise<void> {
    if (!this.market || !this.selectedOfferId) return;
    await this.runMarketAction('구매 예약을 기록하는 중', () => this.market!.reserveOffer(this.selectedOfferId));
  }

  private async releaseSelectedOffer(): Promise<void> {
    if (!this.market || !this.selectedOfferId) return;
    await this.runMarketAction('예약을 해제하는 중', () => this.market!.releaseReservation(this.selectedOfferId));
  }

  private async cancelSelectedOffer(): Promise<void> {
    if (!this.market || !this.selectedOfferId) return;
    await this.runMarketAction('판매 제안을 취소하는 중', () => this.market!.cancelOffer(this.selectedOfferId));
  }

  private async runMarketAction(status: string, action: () => Promise<unknown>): Promise<void> {
    this.text('[data-market-mode]', status);
    try {
      await action();
      this.selectedOfferId = '';
      await this.refreshMarket();
      this.text('[data-market-mode]', this.market?.mode === 'firestore-proposal' ? 'Firestore 온라인 제안 장부' : '이 기기의 격리된 시범 장부');
    } catch (error) {
      this.text('[data-market-mode]', error instanceof Error ? error.message : '거래 기록에 실패했습니다');
    }
  }

  private openSellForm(): void {
    this.element<HTMLFormElement>('[data-market-sell-form]').removeAttribute('hidden');
    this.options.root.querySelector<HTMLSelectElement>('[data-market-item]')?.focus();
  }

  private closeSellForm(): void {
    this.options.root.querySelector<HTMLFormElement>('[data-market-sell-form]')?.setAttribute('hidden', '');
  }

  private async submitOffer(): Promise<void> {
    if (!this.market) return;
    const itemId = this.element<HTMLSelectElement>('[data-market-item]').value as ItemId;
    const enhancement = Number(this.element<HTMLSelectElement>('[data-market-enhancement]').value);
    const price = Number(this.element<HTMLInputElement>('[data-market-price]').value);
    if (!TRADEABLE_ITEM_IDS.includes(itemId) || !Number.isInteger(enhancement) || enhancement < 0 || enhancement > 5 || !Number.isInteger(price) || price < 1 || price > 999_999) {
      this.text('[data-market-form-status]', '물품과 강화 수치, 1~999,999냥의 가격을 확인하십시오.');
      return;
    }
    this.text('[data-market-form-status]', '온라인 장부에 제안을 기록하는 중입니다.');
    try {
      await this.market.createOffer({ item: { itemId, enhancement }, askingPrice: price, sellerName: this.playerName });
      this.text('[data-market-form-status]', '판매 제안이 등록되었습니다.');
      this.closeSellForm();
      await this.refreshMarket();
    } catch (error) {
      this.text('[data-market-form-status]', error instanceof Error ? error.message : '판매 제안을 등록하지 못했습니다.');
    }
  }

  private populateItemOptions(): void {
    const select = this.options.root.querySelector<HTMLSelectElement>('[data-market-item]');
    if (!select) return;
    select.replaceChildren(...TRADEABLE_ITEM_IDS.map((itemId) => {
      const definition = ITEM_CATALOG[itemId];
      const option = document.createElement('option');
      option.value = itemId;
      option.textContent = `${definition.name} · ${definition.rarity}`;
      return option;
    }));
  }

  private renderMarketMessage(title: string, copy: string): void {
    const empty = document.createElement('div');
    empty.className = 'online-market__empty';
    const seal = document.createElement('i');
    const heading = document.createElement('strong');
    const description = document.createElement('span');
    seal.textContent = '市';
    heading.textContent = title;
    description.textContent = copy;
    empty.append(seal, heading, description);
    this.element<HTMLElement>('[data-market-list]').replaceChildren(empty);
  }

  private element<T extends HTMLElement>(selector: string): T {
    const element = this.options.root.querySelector<T>(selector);
    if (!element) throw new Error(`Online citadel element missing: ${selector}`);
    return element;
  }

  private text(selector: string, value: string): void {
    const element = this.options.root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }
}
