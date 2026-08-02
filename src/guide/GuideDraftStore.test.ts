import { describe, expect, it, vi } from 'vitest';
import {
  clearGuideDraft,
  createGuideAnonymousAuthorId,
  getOrCreateGuideAnonymousAuthorId,
  GUIDE_ANONYMOUS_AUTHOR_ID_KEY,
  GUIDE_DRAFT_STORAGE_KEY,
  isValidGuideAnonymousAuthorId,
  loadGuideDraft,
  saveGuideDraft,
  type GuideStorage,
} from './GuideDraftStore';

class MemoryStorage implements GuideStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const completeDraft = {
  category: 'strategy' as const,
  nickname: ' 연화 ',
  title: ' 오사카 탈출 <공략> ',
  body: ' 첫째 길\t확인\n\n\n둘째 길\u200b ',
  character: ' 연화\n무당 ',
  region: ' 오사카 <외항> ',
  level: ' 12 레벨 ',
};

describe('guide draft persistence', () => {
  it('keeps a stable anonymous author id under a guide-only storage key', () => {
    const storage = new MemoryStorage();
    const randomUUID = vi.fn(() => '123e4567-e89b-12d3-a456-426614174000');

    const first = getOrCreateGuideAnonymousAuthorId(storage, { randomUUID });
    const second = getOrCreateGuideAnonymousAuthorId(storage, { randomUUID });

    expect(first).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(second).toBe(first);
    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect([...storage.values.keys()]).toEqual([GUIDE_ANONYMOUS_AUTHOR_ID_KEY]);
    expect(isValidGuideAnonymousAuthorId(first)).toBe(true);
  });

  it('uses random bytes when randomUUID is blocked and always returns an allowed id', () => {
    const id = createGuideAnonymousAuthorId({
      randomUUID: () => {
        throw new Error('blocked');
      },
      getRandomValues: (values) => {
        values.fill(10);
        return values;
      },
    });

    expect(id).toBe(`guide_${'0a'.repeat(18)}`);
    expect(id).toMatch(/^[A-Za-z0-9_-]{20,64}$/);
  });

  it('autosaves version 2 with every guide field and no personal or device metadata', () => {
    const storage = new MemoryStorage();
    const saved = saveGuideDraft(completeDraft, storage, 1_754_006_400_000);

    expect(saved).toEqual({
      version: 2,
      savedAt: 1_754_006_400_000,
      category: 'strategy',
      nickname: '연화',
      title: '오사카 탈출 공략',
      body: '첫째 길 확인\n\n둘째 길',
      character: '연화 무당',
      region: '오사카 외항',
      level: '12 레벨',
    });

    const persisted = JSON.parse(storage.getItem(GUIDE_DRAFT_STORAGE_KEY) ?? '{}');
    expect(Object.keys(persisted).sort()).toEqual([
      'body',
      'category',
      'character',
      'level',
      'nickname',
      'region',
      'savedAt',
      'title',
      'version',
    ]);
    expect(JSON.stringify(persisted)).not.toMatch(/userAgent|fingerprint|device|ip|email/i);
  });

  it('sanitizes loaded text, defaults invalid categories, and removes injected metadata', () => {
    const storage = new MemoryStorage();
    storage.setItem(GUIDE_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 2,
      savedAt: 25,
      category: '<admin>',
      nickname: ' 달빛\u200b ',
      title: '<b>질문</b>',
      body: '<script>본문</script>',
      character: '연화\n무당',
      region: '대마도<>',
      level: ' 99 ',
      deviceFingerprint: 'must-not-survive',
    }));

    expect(loadGuideDraft(storage)).toEqual({
      version: 2,
      savedAt: 25,
      category: 'general',
      nickname: '달빛',
      title: 'b질문/b',
      body: 'script본문/script',
      character: '연화 무당',
      region: '대마도',
      level: '99',
    });
    expect(storage.getItem(GUIDE_DRAFT_STORAGE_KEY)).not.toContain('deviceFingerprint');
  });

  it.each([
    '{broken json',
    JSON.stringify({ version: 1, savedAt: 1 }),
    JSON.stringify({
      version: 2,
      savedAt: -1,
      category: 'general',
      nickname: '',
      title: '',
      body: '',
      character: '',
      region: '',
      level: '',
    }),
    JSON.stringify({
      version: 2,
      savedAt: 1,
      category: 'general',
      nickname: {},
      title: '',
      body: '',
      character: '',
      region: '',
      level: '',
    }),
  ])('rejects and clears malformed stored drafts', (serialized) => {
    const storage = new MemoryStorage();
    storage.setItem(GUIDE_DRAFT_STORAGE_KEY, serialized);

    expect(loadGuideDraft(storage)).toBeNull();
    expect(storage.getItem(GUIDE_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('clears drafts without deleting the anonymous author id', () => {
    const storage = new MemoryStorage();
    storage.setItem(GUIDE_DRAFT_STORAGE_KEY, '{}');
    storage.setItem(GUIDE_ANONYMOUS_AUTHOR_ID_KEY, '123e4567-e89b-12d3-a456-426614174000');

    expect(clearGuideDraft(storage)).toBe(true);
    expect(storage.getItem(GUIDE_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(GUIDE_ANONYMOUS_AUTHOR_ID_KEY)).not.toBeNull();
  });

  it('does not throw when local storage is unavailable or denies access', () => {
    const deniedStorage: GuideStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };

    expect(() => getOrCreateGuideAnonymousAuthorId(deniedStorage)).not.toThrow();
    expect(saveGuideDraft(completeDraft, deniedStorage)).toBeNull();
    expect(loadGuideDraft(deniedStorage)).toBeNull();
    expect(clearGuideDraft(deniedStorage)).toBe(false);
    expect(saveGuideDraft(completeDraft, null)).toBeNull();
  });
});
