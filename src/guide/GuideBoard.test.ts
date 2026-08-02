import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGuideComment,
  createGuidePost,
  GUIDE_COMMENT_LIMITS,
  GUIDE_POST_LIMITS,
  GuidePostValidationError,
  sanitizeGuideCommentDraft,
  sanitizeGuidePostDraft,
  subscribeGuideComments,
  subscribeGuidePosts,
} from './GuideBoard';

const firestore = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  next: undefined as undefined | ((snapshot: {
    docs: Array<{ id: string; data: () => Record<string, unknown> }>;
  }) => void),
  unsubscribe: vi.fn(),
}));
const firebase = vi.hoisted(() => ({ ensureAnonymousAuth: vi.fn() }));

vi.mock('../firebase', () => ({
  db: { name: 'guide-test-db' },
  ensureAnonymousAuth: firebase.ensureAnonymousAuth,
}));
vi.mock('firebase/firestore', () => ({
  addDoc: firestore.addDoc,
  collection: firestore.collection,
  limit: firestore.limit,
  onSnapshot: firestore.onSnapshot,
  orderBy: firestore.orderBy,
  query: firestore.query,
  serverTimestamp: firestore.serverTimestamp,
}));

describe('guide bulletin board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestore.next = undefined;
    firestore.collection.mockImplementation((_db, ...path: string[]) => ({
      type: 'collection',
      name: path.join('/'),
    }));
    firestore.orderBy.mockImplementation((field: string, direction: string) => ({
      type: 'orderBy', field, direction,
    }));
    firestore.limit.mockImplementation((count: number) => ({ type: 'limit', count }));
    firestore.query.mockImplementation((...parts: unknown[]) => ({ type: 'query', parts }));
    firestore.onSnapshot.mockImplementation((_query, next) => {
      firestore.next = next;
      return firestore.unsubscribe;
    });
    firestore.serverTimestamp.mockReturnValue({ __serverTimestamp: true });
    firestore.addDoc.mockResolvedValue({ id: 'guide-post-1' });
    firebase.ensureAnonymousAuth.mockResolvedValue({ uid: 'anonymous-guide-user' });
  });

  it('subscribes to the 40 newest shared posts without reversing their order', () => {
    const onPosts = vi.fn();
    const unsubscribe = subscribeGuidePosts(onPosts);

    expect(firestore.collection).toHaveBeenCalledWith(
      { name: 'guide-test-db' },
      'guide_posts',
    );
    expect(firestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(firestore.limit).toHaveBeenCalledWith(40);
    expect(unsubscribe).toBe(firestore.unsubscribe);

    firestore.next?.({
      docs: [
        {
          id: 'newest',
          data: () => ({
            schemaVersion: 2,
            authorId: 'author-device-1234567890',
            nickname: '연화',
            title: '오사카 탈출 공략',
            body: '우물 뒤쪽 길로 이동하세요.',
            category: 'strategy',
            profile: {
              characterId: 'osaka-mudang',
              regionName: '오사카 외항 포로촌',
              level: 18,
            },
            createdAt: { toDate: () => new Date('2026-08-01T00:00:00Z') },
          }),
        },
        {
          id: 'older',
          data: () => ({
            nickname: '',
            title: '동행을 구합니다',
            body: '대마도로 함께 가요.',
            category: 'unknown',
            createdAt: null,
          }),
        },
      ],
    });

    expect(onPosts).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'newest',
        schemaVersion: 2,
        authorId: 'author-device-1234567890',
        category: 'strategy',
        profile: {
          characterId: 'osaka-mudang',
          regionName: '오사카 외항 포로촌',
          level: 18,
        },
      }),
      expect.objectContaining({
        id: 'older',
        schemaVersion: 1,
        authorId: '',
        nickname: '이름 없는 나그네',
        category: 'general',
        profile: { characterId: 'none', regionName: '', level: 0 },
        createdAt: null,
      }),
    ]);
  });

  it('normalizes, strips markup and invisible controls, and clamps every field', () => {
    const sanitized = sanitizeGuidePostDraft({
      authorId: ' author-device-1234567890★ ',
      nickname: `  연화\u200b<script>${'가'.repeat(30)}  `,
      title: `  질문\n<b>${'나'.repeat(80)}  `,
      body: `${'<img>  첫줄\t본문  \n'.repeat(20)}${'다'.repeat(1_500)}`,
      category: '<ADMIN>',
      profile: {
        characterId: '<TRAVEL>',
        regionName: `  무영광산\n${'깊'.repeat(60)}  `,
        level: '1200',
      },
    });

    expect(sanitized.authorId).toBe('author-device-1234567890');
    expect(sanitized.nickname).not.toMatch(/[<>\u200b]/);
    expect(sanitized.title).not.toMatch(/[<>\r\n]/);
    expect(Array.from(sanitized.nickname)).toHaveLength(GUIDE_POST_LIMITS.nickname.max);
    expect(Array.from(sanitized.title).length).toBeLessThanOrEqual(GUIDE_POST_LIMITS.title.max);
    expect(Array.from(sanitized.body).length).toBeLessThanOrEqual(GUIDE_POST_LIMITS.body.max);
    expect(sanitized.body.split('\n').length).toBeLessThanOrEqual(GUIDE_POST_LIMITS.body.maxLines);
    expect(sanitized.category).toBe('general');
    expect(sanitized.profile).toEqual({
      characterId: 'travel',
      regionName: `무영광산 ${'깊'.repeat(35)}`,
      level: GUIDE_POST_LIMITS.level.max,
    });
  });

  it('creates the complete v2 public record with a server timestamp', async () => {
    await expect(createGuidePost({
      authorId: 'author-device-1234567890',
      nickname: '  월영  ',
      title: '  <b>연화 기술 질문</b> ',
      body: '  첫줄\t\t내용\n\n\n둘째 내용  ',
      category: 'question',
      profile: {
        characterId: 'osaka-mudang',
        regionName: '  오사카 외항  ',
        level: '27',
      },
    })).resolves.toBe('guide-post-1');

    expect(firebase.ensureAnonymousAuth).toHaveBeenCalledTimes(1);
    expect(firebase.ensureAnonymousAuth.mock.invocationCallOrder[0])
      .toBeLessThan(firestore.addDoc.mock.invocationCallOrder[0]);
    expect(firestore.addDoc).toHaveBeenCalledWith(
      { type: 'collection', name: 'guide_posts' },
      {
        schemaVersion: 2,
        authorId: 'author-device-1234567890',
        nickname: '월영',
        title: 'b연화 기술 질문/b',
        body: '첫줄 내용\n\n둘째 내용',
        category: 'question',
        profile: {
          characterId: 'osaka-mudang',
          regionName: '오사카 외항',
          level: 27,
        },
        createdAt: { __serverTimestamp: true },
      },
    );
  });

  it('rejects empty sanitized fields before writing', async () => {
    await expect(createGuidePost({
      authorId: '',
      nickname: '<>',
      title: ' ',
      body: '\u200b',
      category: 'general',
      profile: { characterId: 'none', regionName: '', level: 0 },
    })).rejects.toBeInstanceOf(GuidePostValidationError);

    expect(firebase.ensureAnonymousAuth).not.toHaveBeenCalled();
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it('does not write a valid post when anonymous authentication fails', async () => {
    firebase.ensureAnonymousAuth.mockRejectedValueOnce(new Error('anonymous auth disabled'));

    await expect(createGuidePost({
      authorId: 'author-device-1234567890',
      nickname: '월영',
      title: '인증 실패 확인',
      body: '유효한 글이지만 인증 없이는 기록하지 않습니다.',
      category: 'general',
      profile: { characterId: 'none', regionName: '', level: 0 },
    })).rejects.toThrow('anonymous auth disabled');

    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it('subscribes to the oldest-first comments for one post', () => {
    const onComments = vi.fn();
    const unsubscribe = subscribeGuideComments('post-123', onComments);

    expect(firestore.collection).toHaveBeenCalledWith(
      { name: 'guide-test-db' },
      'guide_posts',
      'post-123',
      'comments',
    );
    expect(firestore.orderBy).toHaveBeenCalledWith('createdAt', 'asc');
    expect(firestore.limit).toHaveBeenCalledWith(50);
    expect(unsubscribe).toBe(firestore.unsubscribe);

    firestore.next?.({
      docs: [
        {
          id: 'comment-1',
          data: () => ({
            schemaVersion: 1,
            authorId: 'commenter-device-12345678',
            nickname: '길벗',
            body: '우물 뒤쪽 길이 맞습니다.',
            createdAt: { toDate: () => new Date('2026-08-01T00:01:00Z') },
          }),
        },
      ],
    });

    expect(onComments).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'comment-1',
        schemaVersion: 1,
        authorId: 'commenter-device-12345678',
        nickname: '길벗',
        body: '우물 뒤쪽 길이 맞습니다.',
      }),
    ]);
  });

  it('sanitizes and creates an immutable nested comment record', async () => {
    const sanitized = sanitizeGuideCommentDraft({
      authorId: ' commenter-device-12345678★ ',
      nickname: '  길벗<script> ',
      body: `${'<b>도움</b>\n'.repeat(8)}${'다'.repeat(600)}`,
    });
    expect(sanitized.authorId).toBe('commenter-device-12345678');
    expect(sanitized.nickname).toBe('길벗script');
    expect(Array.from(sanitized.body).length).toBeLessThanOrEqual(GUIDE_COMMENT_LIMITS.body.max);
    expect(sanitized.body.split('\n').length).toBeLessThanOrEqual(GUIDE_COMMENT_LIMITS.body.maxLines);

    firestore.addDoc.mockResolvedValueOnce({ id: 'comment-1' });
    await expect(createGuideComment('post-123', {
      authorId: 'commenter-device-12345678',
      nickname: '  길벗  ',
      body: '  정말\t도움이 됐습니다.  ',
    })).resolves.toBe('comment-1');

    expect(firebase.ensureAnonymousAuth).toHaveBeenCalledTimes(1);
    expect(firestore.addDoc).toHaveBeenCalledWith(
      { type: 'collection', name: 'guide_posts/post-123/comments' },
      {
        schemaVersion: 1,
        authorId: 'commenter-device-12345678',
        nickname: '길벗',
        body: '정말 도움이 됐습니다.',
        createdAt: { __serverTimestamp: true },
      },
    );
  });
});
