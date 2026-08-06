import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import {
  MARKETPLACE_LOCAL_STORE_KEY,
  MarketplaceService,
} from './MarketplaceService';

const firestore = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  nextId: 1,
  timestamp: 10_000,
  transactionCalls: 0,
  queue: Promise.resolve() as Promise<unknown>,
}));

vi.mock('firebase/firestore', () => {
  type Reference = { path: string; id: string };
  type Constraint = { kind: 'where' | 'orderBy' | 'limit'; field?: string; operator?: string; value?: unknown; direction?: string };

  const snapshot = (reference: Reference) => ({
    id: reference.id,
    exists: () => firestore.documents.has(reference.path),
    data: () => firestore.documents.get(reference.path),
  });

  return {
    collection: (_db: unknown, name: string) => ({ path: name, id: name }),
    doc: (...args: unknown[]) => {
      if (args.length === 1) {
        const parent = args[0] as Reference;
        const id = `remote-offer-${firestore.nextId++}`;
        return { path: `${parent.path}/${id}`, id };
      }
      const collectionName = String(args[1]);
      const id = String(args[2]);
      return { path: `${collectionName}/${id}`, id };
    },
    getDoc: async (reference: Reference) => snapshot(reference),
    getDocs: async (builtQuery: { reference: Reference; constraints: Constraint[] }) => {
      let entries = [...firestore.documents.entries()]
        .filter(([path]) => path.startsWith(`${builtQuery.reference.path}/`))
        .map(([path, data]) => ({ path, id: path.slice(path.lastIndexOf('/') + 1), data }));
      for (const constraint of builtQuery.constraints) {
        if (constraint.kind === 'where') {
          entries = entries.filter((entry) => entry.data[constraint.field!] === constraint.value);
        } else if (constraint.kind === 'orderBy') {
          entries.sort((left, right) => {
            const leftValue = left.data[constraint.field!] as number;
            const rightValue = right.data[constraint.field!] as number;
            const comparison = Number(leftValue) - Number(rightValue);
            return constraint.direction === 'desc' ? -comparison : comparison;
          });
        } else {
          entries = entries.slice(0, Number(constraint.value));
        }
      }
      return {
        docs: entries.map((entry) => ({ id: entry.id, data: () => entry.data })),
      };
    },
    where: (field: string, operator: string, value: unknown): Constraint => ({
      kind: 'where', field, operator, value,
    }),
    orderBy: (field: string, direction: string): Constraint => ({
      kind: 'orderBy', field, direction,
    }),
    limit: (value: number): Constraint => ({ kind: 'limit', value }),
    query: (reference: Reference, ...constraints: Constraint[]) => ({ reference, constraints }),
    serverTimestamp: () => {
      const millis = firestore.timestamp += 100;
      return { toMillis: () => millis };
    },
    runTransaction: async (
      _db: unknown,
      operation: (transaction: {
        get: (reference: Reference) => Promise<ReturnType<typeof snapshot>>;
        set: (reference: Reference, value: Record<string, unknown>) => void;
        update: (reference: Reference, value: Record<string, unknown>) => void;
      }) => Promise<unknown>,
    ) => {
      firestore.transactionCalls += 1;
      const execute = async () => {
        const staged = new Map<string, Record<string, unknown>>();
        const result = await operation({
          get: async (reference) => snapshot(reference),
          set: (reference, value) => staged.set(reference.path, { ...value }),
          update: (reference, value) => {
            const current = staged.get(reference.path) ?? firestore.documents.get(reference.path) ?? {};
            staged.set(reference.path, { ...current, ...value });
          },
        });
        for (const [path, value] of staged) firestore.documents.set(path, value);
        return result;
      };
      const queued = firestore.queue.then(execute, execute);
      firestore.queue = queued.then(() => undefined, () => undefined);
      return queued;
    },
  };
});

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
}

const db = {} as Firestore;

describe('MarketplaceService', () => {
  beforeEach(() => {
    firestore.documents.clear();
    firestore.nextId = 1;
    firestore.timestamp = 10_000;
    firestore.transactionCalls = 0;
    firestore.queue = Promise.resolve();
  });

  it('seeds three catalog-backed offers once in isolated local demo mode', async () => {
    const storage = new MemoryStorage();
    const first = new MarketplaceService({ storage, now: () => 1_000_000 });

    expect(first.mode).toBe('local-demo');
    const seeded = await first.listOpenOffers();
    expect(seeded).toHaveLength(3);
    expect(new Set(seeded.map((offer) => offer.itemId))).toEqual(new Set([
      'moonsteel-hwando',
      'frontier-lamellar-coat',
      'weapon-enchant-scroll',
    ]));
    expect(new Set(seeded.map((offer) => offer.sellerUid)).size).toBe(3);
    expect(seeded.every((offer) => offer.source === 'local-demo')).toBe(true);

    const second = new MarketplaceService({ storage, now: () => 2_000_000 });
    expect(await second.listOpenOffers()).toHaveLength(3);
    expect(JSON.parse(storage.getItem(MARKETPLACE_LOCAL_STORE_KEY) ?? '[]')).toHaveLength(3);
    expect(firestore.documents.size).toBe(0);
  });

  it('supports local registration, reservation, release and seller cancellation without save gold', async () => {
    const storage = new MemoryStorage();
    let time = 5_000;
    const seller = new MarketplaceService({
      storage,
      demoIdentity: { id: 'demo-user-seller', displayName: '판매자' },
      idFactory: () => 'demo-user-offer',
      now: () => ++time,
    });
    const buyer = new MarketplaceService({
      storage,
      demoIdentity: { id: 'demo-user-buyer', displayName: '구매자' },
      now: () => ++time,
    });

    const created = await seller.createOffer({
      item: { itemId: 'frost-hwando', enhancement: 2 },
      askingPrice: 900,
    });
    await expect(seller.reserveOffer(created.id)).rejects.toMatchObject({ code: 'self-reservation' });

    const reserved = await buyer.reserveOffer(created.id);
    expect(reserved).toMatchObject({ status: 'reserved', reservedByUid: 'demo-user-buyer' });
    expect(await buyer.listMyReservations()).toHaveLength(1);

    const released = await buyer.releaseReservation(created.id);
    expect(released).toMatchObject({ status: 'open', reservedByUid: null });
    expect(await seller.cancelOffer(created.id)).toMatchObject({ status: 'cancelled' });
    expect(await seller.listMyOffers()).toHaveLength(1);
  });

  it('uses serialized Firestore transactions so only one buyer can reserve an offer', async () => {
    const seller = new MarketplaceService({
      db,
      getIdentity: () => ({ uid: 'auth-seller', displayName: '관청 상인' }),
      now: () => 20_000,
    });
    const buyerA = new MarketplaceService({
      db,
      getIdentity: () => ({ uid: 'auth-buyer-a', displayName: '구매자 갑' }),
      now: () => 21_000,
    });
    const buyerB = new MarketplaceService({
      db,
      getIdentity: () => ({ uid: 'auth-buyer-b', displayName: '구매자 을' }),
      now: () => 22_000,
    });

    const created = await seller.createOffer({
      item: { itemId: 'earth-hwando', enhancement: 4 },
      askingPrice: 2_400,
    });
    const attempts = await Promise.allSettled([
      buyerA.reserveOffer(created.id),
      buyerB.reserveOffer(created.id),
    ]);

    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const stored = firestore.documents.get(`marketplace_offers/${created.id}`);
    expect(stored).toMatchObject({
      kind: 'non-binding-trade-proposal',
      status: 'reserved',
      itemId: 'earth-hwando',
      askingPrice: 2_400,
    });
    expect(stored).not.toHaveProperty('gold');
    expect(stored).not.toHaveProperty('instanceId');
    expect(firestore.transactionCalls).toBe(3);
  });
});
