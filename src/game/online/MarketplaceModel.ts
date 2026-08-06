import { ITEM_CATALOG } from '../items/catalog';
import type { InventoryItem, ItemId } from '../simulation/types';

export const MARKETPLACE_SCHEMA_VERSION = 1 as const;
export const MARKETPLACE_OFFER_KIND = 'non-binding-trade-proposal' as const;
export const MARKETPLACE_MIN_PRICE = 1;
export const MARKETPLACE_MAX_PRICE = 9_999_999;
export const MARKETPLACE_MAX_ENHANCEMENT = 5;

export type MarketplaceMode = 'firestore-proposal' | 'local-demo';
export type MarketplaceOfferStatus = 'open' | 'reserved' | 'cancelled';
export type MarketplaceProposalItem = Pick<InventoryItem, 'itemId' | 'enhancement'>;

export type MarketplaceOffer = {
  id: string;
  schemaVersion: typeof MARKETPLACE_SCHEMA_VERSION;
  kind: typeof MARKETPLACE_OFFER_KIND;
  source: MarketplaceMode;
  sellerUid: string;
  sellerName: string;
  itemId: ItemId;
  enhancement: number;
  askingPrice: number;
  status: MarketplaceOfferStatus;
  reservedByUid: string | null;
  createdAt: number;
  updatedAt: number;
  reservedAt: number | null;
  cancelledAt: number | null;
};

export type MarketplaceOfferRecord = Omit<MarketplaceOffer, 'id' | 'source' | 'createdAt' | 'updatedAt' | 'reservedAt' | 'cancelledAt'> & {
  createdAt: unknown;
  updatedAt: unknown;
  reservedAt: unknown | null;
  cancelledAt: unknown | null;
};

export type CreateMarketplaceOfferInput = {
  item: MarketplaceProposalItem;
  askingPrice: number;
  sellerName?: string | null;
};

export type MarketplaceErrorCode =
  | 'invalid-actor'
  | 'invalid-item'
  | 'invalid-price'
  | 'invalid-offer'
  | 'offer-not-found'
  | 'offer-not-open'
  | 'offer-not-reserved'
  | 'self-reservation'
  | 'reservation-forbidden'
  | 'cancellation-forbidden'
  | 'firestore-unavailable';

export class MarketplaceError extends Error {
  constructor(
    readonly code: MarketplaceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const timestampMillis = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
  const record = asRecord(value);
  if (typeof record?.toMillis === 'function') {
    const millis = (record.toMillis as () => unknown)();
    return typeof millis === 'number' && Number.isFinite(millis) && millis >= 0
      ? Math.floor(millis)
      : null;
  }
  if (typeof record?.seconds === 'number' && Number.isFinite(record.seconds)) {
    const nanos = typeof record.nanoseconds === 'number' && Number.isFinite(record.nanoseconds)
      ? record.nanoseconds
      : 0;
    return Math.max(0, Math.floor(record.seconds * 1_000 + nanos / 1_000_000));
  }
  return null;
};

export const validMarketplaceActorId = (value: unknown): value is string =>
  typeof value === 'string'
  && value.length >= 1
  && value.length <= 128
  && !/[\x00-\x1f/]/u.test(value);

export const sanitizeMarketplaceName = (value: unknown): string => {
  const normalized = typeof value === 'string'
    ? value.normalize('NFKC').replace(/[^\p{L}\p{N}_\- ·]/gu, '').trim()
    : '';
  return normalized.slice(0, 16) || '떠돌이';
};

export const normalizeMarketplacePrice = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new MarketplaceError('invalid-price', '거래 제안가는 정수여야 합니다.');
  }
  if (value < MARKETPLACE_MIN_PRICE || value > MARKETPLACE_MAX_PRICE) {
    throw new MarketplaceError(
      'invalid-price',
      `거래 제안가는 ${MARKETPLACE_MIN_PRICE}~${MARKETPLACE_MAX_PRICE}냥이어야 합니다.`,
    );
  }
  return value;
};

export const normalizeMarketplaceItem = (value: MarketplaceProposalItem): Required<MarketplaceProposalItem> => {
  if (!value || typeof value.itemId !== 'string' || !(value.itemId in ITEM_CATALOG)) {
    throw new MarketplaceError('invalid-item', '거래 제안소에서 알 수 없는 아이템입니다.');
  }
  const enhancement = value.enhancement ?? 0;
  if (
    typeof enhancement !== 'number'
    || !Number.isFinite(enhancement)
    || !Number.isInteger(enhancement)
    || enhancement < 0
    || enhancement > MARKETPLACE_MAX_ENHANCEMENT
  ) {
    throw new MarketplaceError(
      'invalid-item',
      `강화 수치는 0~${MARKETPLACE_MAX_ENHANCEMENT} 사이의 정수여야 합니다.`,
    );
  }
  return { itemId: value.itemId, enhancement };
};

export const createMarketplaceOffer = (
  id: string,
  sellerUid: string,
  input: CreateMarketplaceOfferInput,
  source: MarketplaceMode,
  now: number,
): MarketplaceOffer => {
  if (!validMarketplaceActorId(id) || !validMarketplaceActorId(sellerUid)) {
    throw new MarketplaceError('invalid-actor', '거래 제안 식별자가 올바르지 않습니다.');
  }
  const item = normalizeMarketplaceItem(input.item);
  const timestamp = Math.max(0, Math.floor(now));
  return {
    id,
    schemaVersion: MARKETPLACE_SCHEMA_VERSION,
    kind: MARKETPLACE_OFFER_KIND,
    source,
    sellerUid,
    sellerName: sanitizeMarketplaceName(input.sellerName),
    itemId: item.itemId,
    enhancement: item.enhancement,
    askingPrice: normalizeMarketplacePrice(input.askingPrice),
    status: 'open',
    reservedByUid: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    reservedAt: null,
    cancelledAt: null,
  };
};

export const reserveMarketplaceOffer = (
  offer: MarketplaceOffer,
  buyerUid: string,
  now: number,
): MarketplaceOffer => {
  if (!validMarketplaceActorId(buyerUid)) {
    throw new MarketplaceError('invalid-actor', '구매 예약자 식별자가 올바르지 않습니다.');
  }
  if (offer.status !== 'open') {
    throw new MarketplaceError('offer-not-open', '이미 예약되었거나 취소된 거래 제안입니다.');
  }
  if (offer.sellerUid === buyerUid) {
    throw new MarketplaceError('self-reservation', '자신이 등록한 거래 제안은 예약할 수 없습니다.');
  }
  const timestamp = Math.max(offer.updatedAt, Math.floor(now));
  return {
    ...offer,
    status: 'reserved',
    reservedByUid: buyerUid,
    updatedAt: timestamp,
    reservedAt: timestamp,
    cancelledAt: null,
  };
};

export const releaseMarketplaceReservation = (
  offer: MarketplaceOffer,
  buyerUid: string,
  now: number,
): MarketplaceOffer => {
  if (offer.status !== 'reserved') {
    throw new MarketplaceError('offer-not-reserved', '구매 예약 중인 거래 제안이 아닙니다.');
  }
  if (offer.reservedByUid !== buyerUid) {
    throw new MarketplaceError('reservation-forbidden', '예약한 이용자만 예약을 해제할 수 있습니다.');
  }
  return {
    ...offer,
    status: 'open',
    reservedByUid: null,
    updatedAt: Math.max(offer.updatedAt, Math.floor(now)),
    reservedAt: null,
    cancelledAt: null,
  };
};

export const cancelMarketplaceOffer = (
  offer: MarketplaceOffer,
  sellerUid: string,
  now: number,
): MarketplaceOffer => {
  if (offer.sellerUid !== sellerUid) {
    throw new MarketplaceError('cancellation-forbidden', '판매 제안자만 등록을 취소할 수 있습니다.');
  }
  if (offer.status === 'cancelled') {
    throw new MarketplaceError('cancellation-forbidden', '이미 취소된 거래 제안입니다.');
  }
  const timestamp = Math.max(offer.updatedAt, Math.floor(now));
  return {
    ...offer,
    status: 'cancelled',
    reservedByUid: null,
    updatedAt: timestamp,
    reservedAt: null,
    cancelledAt: timestamp,
  };
};

export const marketplaceOfferToRecord = (
  offer: MarketplaceOffer,
  timestamps?: Partial<Pick<MarketplaceOfferRecord, 'createdAt' | 'updatedAt' | 'reservedAt' | 'cancelledAt'>>,
): MarketplaceOfferRecord => ({
  schemaVersion: offer.schemaVersion,
  kind: offer.kind,
  sellerUid: offer.sellerUid,
  sellerName: offer.sellerName,
  itemId: offer.itemId,
  enhancement: offer.enhancement,
  askingPrice: offer.askingPrice,
  status: offer.status,
  reservedByUid: offer.reservedByUid,
  createdAt: timestamps?.createdAt ?? offer.createdAt,
  updatedAt: timestamps?.updatedAt ?? offer.updatedAt,
  reservedAt: timestamps?.reservedAt ?? offer.reservedAt,
  cancelledAt: timestamps?.cancelledAt ?? offer.cancelledAt,
});

export const parseMarketplaceOffer = (
  id: string,
  value: unknown,
  source: MarketplaceMode,
): MarketplaceOffer | null => {
  const raw = asRecord(value);
  if (
    !validMarketplaceActorId(id)
    || !raw
    || raw.schemaVersion !== MARKETPLACE_SCHEMA_VERSION
    || raw.kind !== MARKETPLACE_OFFER_KIND
    || !validMarketplaceActorId(raw.sellerUid)
    || typeof raw.itemId !== 'string'
    || !(raw.itemId in ITEM_CATALOG)
    || typeof raw.enhancement !== 'number'
    || !Number.isInteger(raw.enhancement)
    || raw.enhancement < 0
    || raw.enhancement > MARKETPLACE_MAX_ENHANCEMENT
    || typeof raw.askingPrice !== 'number'
    || !Number.isInteger(raw.askingPrice)
    || raw.askingPrice < MARKETPLACE_MIN_PRICE
    || raw.askingPrice > MARKETPLACE_MAX_PRICE
    || (raw.status !== 'open' && raw.status !== 'reserved' && raw.status !== 'cancelled')
    || (raw.reservedByUid !== null && !validMarketplaceActorId(raw.reservedByUid))
  ) return null;
  if (raw.status === 'reserved' && raw.reservedByUid === null) return null;
  if (raw.status !== 'reserved' && raw.reservedByUid !== null) return null;
  const createdAt = timestampMillis(raw.createdAt);
  const updatedAt = timestampMillis(raw.updatedAt);
  const reservedAt = raw.reservedAt === null ? null : timestampMillis(raw.reservedAt);
  const cancelledAt = raw.cancelledAt === null ? null : timestampMillis(raw.cancelledAt);
  if (
    createdAt === null
    || updatedAt === null
    || (raw.status === 'reserved' && reservedAt === null)
    || (raw.status === 'cancelled' && cancelledAt === null)
  ) return null;
  return {
    id,
    schemaVersion: MARKETPLACE_SCHEMA_VERSION,
    kind: MARKETPLACE_OFFER_KIND,
    source,
    sellerUid: raw.sellerUid,
    sellerName: sanitizeMarketplaceName(raw.sellerName),
    itemId: raw.itemId as ItemId,
    enhancement: raw.enhancement,
    askingPrice: raw.askingPrice,
    status: raw.status,
    reservedByUid: raw.reservedByUid,
    createdAt,
    updatedAt,
    reservedAt,
    cancelledAt,
  };
};
