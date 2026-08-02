import { describe, expect, it } from 'vitest';
import {
  MarketplaceError,
  cancelMarketplaceOffer,
  createMarketplaceOffer,
  marketplaceOfferToRecord,
  parseMarketplaceOffer,
  releaseMarketplaceReservation,
  reserveMarketplaceOffer,
} from './MarketplaceModel';

const offer = () => createMarketplaceOffer(
  'offer-1',
  'seller-1',
  {
    item: { itemId: 'moonsteel-hwando', enhancement: 3 },
    askingPrice: 1_280,
    sellerName: ' 달빛<script>상단 ',
  },
  'local-demo',
  1_000,
);

const capturedError = (operation: () => unknown): unknown => {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error('Expected marketplace operation to fail.');
};

describe('MarketplaceModel non-binding proposals', () => {
  it('normalizes a catalog item without carrying save instance or gold state', () => {
    const created = offer();

    expect(created).toMatchObject({
      id: 'offer-1',
      kind: 'non-binding-trade-proposal',
      source: 'local-demo',
      sellerUid: 'seller-1',
      sellerName: '달빛script상단',
      itemId: 'moonsteel-hwando',
      enhancement: 3,
      askingPrice: 1_280,
      status: 'open',
      reservedByUid: null,
    });
    expect(created).not.toHaveProperty('instanceId');
    expect(created).not.toHaveProperty('gold');
  });

  it.each([
    { item: { itemId: 'moonsteel-hwando' as const }, askingPrice: 0 },
    { item: { itemId: 'moonsteel-hwando' as const }, askingPrice: 1.5 },
    { item: { itemId: 'moonsteel-hwando' as const }, askingPrice: 10_000_000 },
    { item: { itemId: 'moonsteel-hwando' as const, enhancement: 6 }, askingPrice: 10 },
  ])('rejects an invalid item or asking price %#', (input) => {
    expect(() => createMarketplaceOffer(
      'offer-invalid',
      'seller-1',
      input,
      'local-demo',
      1_000,
    )).toThrow(MarketplaceError);
  });

  it('reserves and releases only through the current buyer', () => {
    const reserved = reserveMarketplaceOffer(offer(), 'buyer-1', 2_000);

    expect(reserved).toMatchObject({
      status: 'reserved',
      reservedByUid: 'buyer-1',
      reservedAt: 2_000,
    });
    expect(capturedError(() => reserveMarketplaceOffer(reserved, 'buyer-2', 2_100)))
      .toMatchObject({ code: 'offer-not-open' });
    expect(capturedError(() => releaseMarketplaceReservation(reserved, 'buyer-2', 2_200)))
      .toMatchObject({ code: 'reservation-forbidden' });
    expect(releaseMarketplaceReservation(reserved, 'buyer-1', 2_300)).toMatchObject({
      status: 'open',
      reservedByUid: null,
      reservedAt: null,
    });
  });

  it('blocks self-reservation and lets only the seller cancel', () => {
    const created = offer();

    expect(capturedError(() => reserveMarketplaceOffer(created, 'seller-1', 2_000)))
      .toMatchObject({ code: 'self-reservation' });
    expect(capturedError(() => cancelMarketplaceOffer(created, 'buyer-1', 2_000)))
      .toMatchObject({ code: 'cancellation-forbidden' });
    expect(cancelMarketplaceOffer(created, 'seller-1', 2_000)).toMatchObject({
      status: 'cancelled',
      reservedByUid: null,
      cancelledAt: 2_000,
    });
  });

  it('round-trips Firestore timestamp-shaped records', () => {
    const created = offer();
    const record = marketplaceOfferToRecord(created, {
      createdAt: { toMillis: () => 1_000 },
      updatedAt: { seconds: 2, nanoseconds: 500_000_000 },
    });

    expect(parseMarketplaceOffer(created.id, record, 'firestore-proposal')).toMatchObject({
      source: 'firestore-proposal',
      createdAt: 1_000,
      updatedAt: 2_500,
    });
  });
});
