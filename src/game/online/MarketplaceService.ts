import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import type { ItemId } from '../simulation/types';
import {
  MarketplaceError,
  cancelMarketplaceOffer,
  createMarketplaceOffer,
  marketplaceOfferToRecord,
  parseMarketplaceOffer,
  releaseMarketplaceReservation,
  reserveMarketplaceOffer,
  sanitizeMarketplaceName,
  validMarketplaceActorId,
  type CreateMarketplaceOfferInput,
  type MarketplaceMode,
  type MarketplaceOffer,
} from './MarketplaceModel';

export const MARKETPLACE_COLLECTION = 'marketplace_offers';
export const MARKETPLACE_LOCAL_STORE_KEY = 'asra-marketplace-local-demo-v1';
export const MARKETPLACE_LOCAL_ACTOR_KEY = 'asra-marketplace-local-demo-actor-v1';
export const MARKETPLACE_PROPOSAL_NOTICE =
  '거래 제안소는 아이템과 골드를 자동 이전하지 않습니다. 예약 뒤 당사자끼리 조건을 확인하는 비구속 제안 기능입니다.';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type MarketplaceAuthenticatedIdentity = {
  uid: string;
  displayName?: string | null;
};

export type MarketplaceDemoIdentity = {
  id: string;
  displayName?: string;
};

export type MarketplaceServiceOptions = {
  db?: Firestore;
  getIdentity?: () => MarketplaceAuthenticatedIdentity | null;
  storage?: StorageLike | null;
  demoIdentity?: MarketplaceDemoIdentity;
  now?: () => number;
  idFactory?: () => string;
};

export type MarketplaceOfferSort = 'newest' | 'price-asc';

export type MarketplaceOfferQuery = {
  itemId?: ItemId;
  sort?: MarketplaceOfferSort;
  limit?: number;
};

type MarketplaceActor = {
  id: string;
  displayName: string;
  mode: MarketplaceMode;
};

const randomId = (prefix: string): string => {
  try {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  } catch {
    // Fall through to a stable-shape local identifier.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

const localStorageOrNull = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const recordId = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = (value as { id?: unknown }).id;
  return validMarketplaceActorId(id) ? id : null;
};

const normalizedLimit = (value: unknown, fallback = 50): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(100, Math.floor(value)))
    : fallback;

const newestFirst = (left: MarketplaceOffer, right: MarketplaceOffer): number =>
  right.createdAt - left.createdAt || left.id.localeCompare(right.id);

const priceFirst = (left: MarketplaceOffer, right: MarketplaceOffer): number =>
  left.askingPrice - right.askingPrice || newestFirst(left, right);

export class MarketplaceService {
  private readonly storage: StorageLike | null;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly demoIdentity: MarketplaceDemoIdentity;
  private memoryStore: MarketplaceOffer[] = [];

  constructor(private readonly options: MarketplaceServiceOptions = {}) {
    this.storage = options.storage === undefined ? localStorageOrNull() : options.storage;
    this.now = options.now ?? (() => Date.now());
    this.idFactory = options.idFactory ?? (() => randomId('offer'));
    this.demoIdentity = this.resolveDemoIdentity(options.demoIdentity);
  }

  get mode(): MarketplaceMode {
    return this.authenticatedIdentity() ? 'firestore-proposal' : 'local-demo';
  }

  async listOpenOffers(options: MarketplaceOfferQuery = {}): Promise<MarketplaceOffer[]> {
    const actor = this.actor();
    const max = normalizedLimit(options.limit);
    const sort = options.sort ?? 'newest';
    if (actor.mode === 'local-demo') {
      return this.loadLocalOffers()
        .filter((offer) => offer.status === 'open' && (!options.itemId || offer.itemId === options.itemId))
        .sort(sort === 'price-asc' ? priceFirst : newestFirst)
        .slice(0, max);
    }

    const db = this.requireFirestore();
    const constraints: QueryConstraint[] = [where('status', '==', 'open')];
    if (options.itemId) constraints.push(where('itemId', '==', options.itemId));
    constraints.push(
      sort === 'price-asc' ? orderBy('askingPrice', 'asc') : orderBy('createdAt', 'desc'),
      firestoreLimit(max),
    );
    const snapshot = await getDocs(query(collection(db, MARKETPLACE_COLLECTION), ...constraints));
    return snapshot.docs.flatMap((entry): MarketplaceOffer[] => {
      const offer = parseMarketplaceOffer(entry.id, entry.data(), 'firestore-proposal');
      return offer ? [offer] : [];
    });
  }

  async listMyOffers(max = 80): Promise<MarketplaceOffer[]> {
    const actor = this.actor();
    const bounded = normalizedLimit(max, 80);
    if (actor.mode === 'local-demo') {
      return this.loadLocalOffers()
        .filter((offer) => offer.sellerUid === actor.id)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, bounded);
    }
    const db = this.requireFirestore();
    const snapshot = await getDocs(query(
      collection(db, MARKETPLACE_COLLECTION),
      where('sellerUid', '==', actor.id),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(bounded),
    ));
    return snapshot.docs.flatMap((entry): MarketplaceOffer[] => {
      const offer = parseMarketplaceOffer(entry.id, entry.data(), 'firestore-proposal');
      return offer ? [offer] : [];
    });
  }

  async listMyReservations(max = 80): Promise<MarketplaceOffer[]> {
    const actor = this.actor();
    const bounded = normalizedLimit(max, 80);
    if (actor.mode === 'local-demo') {
      return this.loadLocalOffers()
        .filter((offer) => offer.status === 'reserved' && offer.reservedByUid === actor.id)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, bounded);
    }
    const db = this.requireFirestore();
    const snapshot = await getDocs(query(
      collection(db, MARKETPLACE_COLLECTION),
      where('status', '==', 'reserved'),
      where('reservedByUid', '==', actor.id),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(bounded),
    ));
    return snapshot.docs.flatMap((entry): MarketplaceOffer[] => {
      const offer = parseMarketplaceOffer(entry.id, entry.data(), 'firestore-proposal');
      return offer ? [offer] : [];
    });
  }

  async getOffer(offerId: string): Promise<MarketplaceOffer | null> {
    if (!validMarketplaceActorId(offerId)) {
      throw new MarketplaceError('invalid-offer', '거래 제안 식별자가 올바르지 않습니다.');
    }
    const actor = this.actor();
    if (actor.mode === 'local-demo') {
      return this.loadLocalOffers().find((offer) => offer.id === offerId) ?? null;
    }
    const snapshot = await getDoc(doc(this.requireFirestore(), MARKETPLACE_COLLECTION, offerId));
    return snapshot.exists()
      ? parseMarketplaceOffer(snapshot.id, snapshot.data(), 'firestore-proposal')
      : null;
  }

  async createOffer(input: CreateMarketplaceOfferInput): Promise<MarketplaceOffer> {
    const actor = this.actor();
    const sellerName = input.sellerName ?? actor.displayName;
    if (actor.mode === 'local-demo') {
      const offers = this.loadLocalOffers();
      const offer = createMarketplaceOffer(
        this.uniqueLocalOfferId(offers),
        actor.id,
        { ...input, sellerName },
        'local-demo',
        this.now(),
      );
      offers.push(offer);
      this.saveLocalOffers(offers);
      return offer;
    }

    const db = this.requireFirestore();
    const reference = doc(collection(db, MARKETPLACE_COLLECTION));
    const offer = createMarketplaceOffer(
      reference.id,
      actor.id,
      { ...input, sellerName },
      'firestore-proposal',
      this.now(),
    );
    await runTransaction(db, async (transaction) => {
      const timestamp = serverTimestamp();
      transaction.set(reference, marketplaceOfferToRecord(offer, {
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
    });
    return offer;
  }

  async reserveOffer(offerId: string): Promise<MarketplaceOffer> {
    return this.transitionOffer(offerId, (offer, actor) =>
      reserveMarketplaceOffer(offer, actor.id, this.now()), 'reserve');
  }

  async releaseReservation(offerId: string): Promise<MarketplaceOffer> {
    return this.transitionOffer(offerId, (offer, actor) =>
      releaseMarketplaceReservation(offer, actor.id, this.now()), 'release');
  }

  async cancelOffer(offerId: string): Promise<MarketplaceOffer> {
    return this.transitionOffer(offerId, (offer, actor) =>
      cancelMarketplaceOffer(offer, actor.id, this.now()), 'cancel');
  }

  private async transitionOffer(
    offerId: string,
    transition: (offer: MarketplaceOffer, actor: MarketplaceActor) => MarketplaceOffer,
    operation: 'reserve' | 'release' | 'cancel',
  ): Promise<MarketplaceOffer> {
    if (!validMarketplaceActorId(offerId)) {
      throw new MarketplaceError('invalid-offer', '거래 제안 식별자가 올바르지 않습니다.');
    }
    const actor = this.actor();
    if (actor.mode === 'local-demo') {
      const offers = this.loadLocalOffers();
      const index = offers.findIndex((offer) => offer.id === offerId);
      if (index < 0) throw new MarketplaceError('offer-not-found', '거래 제안을 찾지 못했습니다.');
      const next = transition(offers[index], actor);
      offers[index] = next;
      this.saveLocalOffers(offers);
      return next;
    }

    const db = this.requireFirestore();
    const reference = doc(db, MARKETPLACE_COLLECTION, offerId);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new MarketplaceError('offer-not-found', '거래 제안을 찾지 못했습니다.');
      const current = parseMarketplaceOffer(snapshot.id, snapshot.data(), 'firestore-proposal');
      if (!current) throw new MarketplaceError('invalid-offer', '손상된 거래 제안입니다.');
      const next = transition(current, actor);
      const timestamp = serverTimestamp();
      if (operation === 'reserve') {
        transaction.update(reference, {
          status: next.status,
          reservedByUid: next.reservedByUid,
          reservedAt: timestamp,
          updatedAt: timestamp,
        });
      } else if (operation === 'release') {
        transaction.update(reference, {
          status: next.status,
          reservedByUid: null,
          reservedAt: null,
          updatedAt: timestamp,
        });
      } else {
        transaction.update(reference, {
          status: next.status,
          reservedByUid: null,
          reservedAt: null,
          cancelledAt: timestamp,
          updatedAt: timestamp,
        });
      }
      return next;
    });
  }

  private authenticatedIdentity(): MarketplaceAuthenticatedIdentity | null {
    const candidate = this.options.getIdentity?.() ?? null;
    return candidate && validMarketplaceActorId(candidate.uid) ? candidate : null;
  }

  private actor(): MarketplaceActor {
    const authenticated = this.authenticatedIdentity();
    return authenticated
      ? {
        id: authenticated.uid,
        displayName: sanitizeMarketplaceName(authenticated.displayName),
        mode: 'firestore-proposal',
      }
      : {
        id: this.demoIdentity.id,
        displayName: sanitizeMarketplaceName(this.demoIdentity.displayName),
        mode: 'local-demo',
      };
  }

  private requireFirestore(): Firestore {
    if (!this.options.db) {
      throw new MarketplaceError(
        'firestore-unavailable',
        '인증된 거래 제안에는 Firestore 연결이 필요합니다.',
      );
    }
    return this.options.db;
  }

  private resolveDemoIdentity(provided?: MarketplaceDemoIdentity): MarketplaceDemoIdentity {
    if (provided && validMarketplaceActorId(provided.id)) {
      return { id: provided.id, displayName: sanitizeMarketplaceName(provided.displayName) };
    }
    try {
      const stored = this.storage?.getItem(MARKETPLACE_LOCAL_ACTOR_KEY);
      if (validMarketplaceActorId(stored)) return { id: stored, displayName: '나그네' };
      const created = randomId('local-demo-user');
      this.storage?.setItem(MARKETPLACE_LOCAL_ACTOR_KEY, created);
      return { id: created, displayName: '나그네' };
    } catch {
      return { id: randomId('memory-demo-user'), displayName: '나그네' };
    }
  }

  private loadLocalOffers(): MarketplaceOffer[] {
    let raw: unknown = this.memoryStore;
    try {
      const serialized = this.storage?.getItem(MARKETPLACE_LOCAL_STORE_KEY);
      raw = serialized ? JSON.parse(serialized) as unknown : [];
    } catch {
      raw = this.memoryStore;
    }
    const offers = Array.isArray(raw)
      ? raw.flatMap((value): MarketplaceOffer[] => {
        const id = recordId(value);
        const offer = id ? parseMarketplaceOffer(id, value, 'local-demo') : null;
        return offer ? [offer] : [];
      })
      : [];
    if (offers.length > 0) {
      this.memoryStore = offers;
      return offers;
    }
    const seeds = this.demoSeedOffers();
    this.saveLocalOffers(seeds);
    return seeds;
  }

  private saveLocalOffers(offers: MarketplaceOffer[]): void {
    this.memoryStore = offers.map((offer) => ({ ...offer }));
    try {
      this.storage?.setItem(MARKETPLACE_LOCAL_STORE_KEY, JSON.stringify(this.memoryStore));
    } catch {
      // In-memory fallback remains usable when storage is unavailable or full.
    }
  }

  private uniqueLocalOfferId(offers: MarketplaceOffer[]): string {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = this.idFactory();
      if (validMarketplaceActorId(candidate) && !offers.some((offer) => offer.id === candidate)) return candidate;
    }
    return randomId('local-offer');
  }

  private demoSeedOffers(): MarketplaceOffer[] {
    const now = this.now();
    return [
      createMarketplaceOffer(
        'demo-seed-moonsteel-v1',
        'demo-seller-moon-guard',
        { item: { itemId: 'moonsteel-hwando', enhancement: 3 }, askingPrice: 1_280, sellerName: '월영수비대' },
        'local-demo',
        now - 180_000,
      ),
      createMarketplaceOffer(
        'demo-seed-frontier-coat-v1',
        'demo-seller-frontier-hunter',
        { item: { itemId: 'frontier-lamellar-coat', enhancement: 1 }, askingPrice: 760, sellerName: '압록사냥꾼' },
        'local-demo',
        now - 120_000,
      ),
      createMarketplaceOffer(
        'demo-seed-enchant-scroll-v1',
        'demo-seller-osaka-smith',
        { item: { itemId: 'weapon-enchant-scroll' }, askingPrice: 210, sellerName: '오사카대장간' },
        'local-demo',
        now - 60_000,
      ),
    ];
  }
}
