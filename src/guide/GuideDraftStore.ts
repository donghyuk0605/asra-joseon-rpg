export const GUIDE_DRAFT_VERSION = 2 as const;
export const GUIDE_DRAFT_STORAGE_KEY = 'asra-guide-board-draft-v2';
export const GUIDE_ANONYMOUS_AUTHOR_ID_KEY = 'asra-guide-anonymous-author-v1';

export const GUIDE_DRAFT_CATEGORIES = [
  'general',
  'question',
  'strategy',
  'party',
] as const;

export type GuideDraftCategory = (typeof GUIDE_DRAFT_CATEGORIES)[number];

export const GUIDE_DRAFT_LIMITS = {
  nickname: 16,
  title: 60,
  body: 1_200,
  bodyLines: 12,
  character: 24,
  region: 40,
  level: 12,
} as const;

export interface GuideDraftFields {
  category: string;
  nickname: string;
  title: string;
  body: string;
  character: string;
  region: string;
  level: string;
}

export interface SanitizedGuideDraftFields extends Omit<GuideDraftFields, 'category'> {
  category: GuideDraftCategory;
}

export interface StoredGuideDraft extends SanitizedGuideDraftFields {
  version: typeof GUIDE_DRAFT_VERSION;
  savedAt: number;
}

export interface GuideStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GuideCrypto {
  randomUUID?: () => string;
  getRandomValues?: (values: Uint8Array) => Uint8Array;
}

const DISALLOWED_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;
const AUTHOR_ID_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

let volatileAuthorId: string | null = null;

const clampCodePoints = (value: string, max: number): string =>
  Array.from(value).slice(0, max).join('');

const normalizePlainText = (value: string): string =>
  value
    .normalize('NFKC')
    .replace(DISALLOWED_CONTROL_CHARACTERS, '')
    .replace(/[<>]/g, '');

const sanitizeSingleLine = (value: string, max: number): string =>
  clampCodePoints(
    normalizePlainText(value)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    max,
  ).trim();

const sanitizeBody = (value: string): string => {
  const lines = normalizePlainText(value)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .slice(0, GUIDE_DRAFT_LIMITS.bodyLines)
    .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trim());

  return clampCodePoints(
    lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    GUIDE_DRAFT_LIMITS.body,
  ).trim();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCategory = (value: string): value is GuideDraftCategory =>
  GUIDE_DRAFT_CATEGORIES.includes(value as GuideDraftCategory);

const resolveStorage = (storage: GuideStorage | null | undefined): GuideStorage | null => {
  if (storage !== undefined) return storage;

  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
};

const resolveCrypto = (cryptoProvider: GuideCrypto | null | undefined): GuideCrypto | null => {
  if (cryptoProvider !== undefined) return cryptoProvider;

  try {
    if (typeof globalThis.crypto === 'undefined') return null;
    return {
      randomUUID:
        typeof globalThis.crypto.randomUUID === 'function'
          ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
          : undefined,
      getRandomValues:
        typeof globalThis.crypto.getRandomValues === 'function'
          ? globalThis.crypto.getRandomValues.bind(globalThis.crypto)
          : undefined,
    };
  } catch {
    return null;
  }
};

const safeRemove = (storage: GuideStorage | null, key: string): boolean => {
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const isValidGuideAnonymousAuthorId = (value: unknown): value is string =>
  typeof value === 'string' && AUTHOR_ID_PATTERN.test(value);

export const createGuideAnonymousAuthorId = (
  cryptoProvider?: GuideCrypto | null,
): string => {
  const provider = resolveCrypto(cryptoProvider);

  try {
    const uuid = provider?.randomUUID?.();
    if (isValidGuideAnonymousAuthorId(uuid)) return uuid;
  } catch {
    // Continue with random bytes when randomUUID is unavailable or blocked.
  }

  const bytes = new Uint8Array(18);
  let filledSecurely = false;
  try {
    if (provider?.getRandomValues) {
      provider.getRandomValues(bytes);
      filledSecurely = true;
    }
  } catch {
    // Some privacy modes expose crypto but deny calls; use the local fallback below.
  }

  if (!filledSecurely) {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const token = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `guide_${token}`;
};

export const getOrCreateGuideAnonymousAuthorId = (
  storage?: GuideStorage | null,
  cryptoProvider?: GuideCrypto | null,
): string => {
  const target = resolveStorage(storage);
  let storageReadable = false;

  if (target) {
    try {
      const stored = target.getItem(GUIDE_ANONYMOUS_AUTHOR_ID_KEY);
      storageReadable = true;
      if (isValidGuideAnonymousAuthorId(stored)) {
        volatileAuthorId = stored;
        return stored;
      }
    } catch {
      // Keep the board usable when storage access is disabled.
    }
  }

  if (!storageReadable && volatileAuthorId) return volatileAuthorId;

  const authorId = createGuideAnonymousAuthorId(cryptoProvider);
  volatileAuthorId = authorId;

  if (target) {
    try {
      target.setItem(GUIDE_ANONYMOUS_AUTHOR_ID_KEY, authorId);
    } catch {
      // The in-memory identifier remains stable for this page session.
    }
  }

  return authorId;
};

export const sanitizeGuideDraftFields = (
  fields: GuideDraftFields,
): SanitizedGuideDraftFields => {
  const rawCategory = sanitizeSingleLine(fields.category, 20).toLowerCase();
  return {
    category: isCategory(rawCategory) ? rawCategory : 'general',
    nickname: sanitizeSingleLine(fields.nickname, GUIDE_DRAFT_LIMITS.nickname),
    title: sanitizeSingleLine(fields.title, GUIDE_DRAFT_LIMITS.title),
    body: sanitizeBody(fields.body),
    character: sanitizeSingleLine(fields.character, GUIDE_DRAFT_LIMITS.character),
    region: sanitizeSingleLine(fields.region, GUIDE_DRAFT_LIMITS.region),
    level: sanitizeSingleLine(fields.level, GUIDE_DRAFT_LIMITS.level),
  };
};

const parseStoredDraft = (value: unknown): StoredGuideDraft | null => {
  if (!isRecord(value) || value.version !== GUIDE_DRAFT_VERSION) return null;
  if (!Number.isSafeInteger(value.savedAt) || (value.savedAt as number) < 0) return null;

  const fieldNames = [
    'category',
    'nickname',
    'title',
    'body',
    'character',
    'region',
    'level',
  ] as const;

  if (fieldNames.some((field) => typeof value[field] !== 'string')) return null;

  const fields = sanitizeGuideDraftFields({
    category: value.category as string,
    nickname: value.nickname as string,
    title: value.title as string,
    body: value.body as string,
    character: value.character as string,
    region: value.region as string,
    level: value.level as string,
  });

  return {
    version: GUIDE_DRAFT_VERSION,
    savedAt: value.savedAt as number,
    ...fields,
  };
};

export const saveGuideDraft = (
  fields: GuideDraftFields,
  storage?: GuideStorage | null,
  savedAt = Date.now(),
): StoredGuideDraft | null => {
  const target = resolveStorage(storage);
  if (!target) return null;

  const safeSavedAt = Number.isSafeInteger(savedAt) && savedAt >= 0 ? savedAt : Date.now();
  const draft: StoredGuideDraft = {
    version: GUIDE_DRAFT_VERSION,
    savedAt: safeSavedAt,
    ...sanitizeGuideDraftFields(fields),
  };

  try {
    target.setItem(GUIDE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
};

export const loadGuideDraft = (
  storage?: GuideStorage | null,
): StoredGuideDraft | null => {
  const target = resolveStorage(storage);
  if (!target) return null;

  let serialized: string | null;
  try {
    serialized = target.getItem(GUIDE_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!serialized) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    safeRemove(target, GUIDE_DRAFT_STORAGE_KEY);
    return null;
  }

  const draft = parseStoredDraft(parsed);
  if (!draft) {
    safeRemove(target, GUIDE_DRAFT_STORAGE_KEY);
    return null;
  }

  // Rewrite only the documented fields so stale or injected metadata is never retained.
  try {
    target.setItem(GUIDE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Returning the sanitized in-memory value is still safe when rewriting is blocked.
  }
  return draft;
};

export const clearGuideDraft = (storage?: GuideStorage | null): boolean =>
  safeRemove(resolveStorage(storage), GUIDE_DRAFT_STORAGE_KEY);
