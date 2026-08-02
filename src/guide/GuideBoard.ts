import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../firebase';

export const GUIDE_POSTS_COLLECTION = 'guide_posts';
export const GUIDE_POST_PAGE_SIZE = 40;
export const GUIDE_COMMENT_PAGE_SIZE = 50;
export const GUIDE_BOARD_SCHEMA_VERSION = 2;
export const GUIDE_COMMENT_SCHEMA_VERSION = 1;

export const GUIDE_POST_CATEGORIES = [
  'general',
  'question',
  'strategy',
  'party',
] as const;

export type GuidePostCategory = (typeof GUIDE_POST_CATEGORIES)[number];

export const GUIDE_POST_CATEGORY_LABELS: Record<GuidePostCategory, string> = {
  general: '자유',
  question: '질문',
  strategy: '공략',
  party: '동행',
};

export const GUIDE_CHARACTER_IDS = [
  'none',
  'kim-donghyeok',
  'frontier-archer',
  'osaka-mudang',
  'gwanghae-prince',
  'travel',
] as const;

export type GuideCharacterId = (typeof GUIDE_CHARACTER_IDS)[number];

export const GUIDE_CHARACTER_LABELS: Record<GuideCharacterId, string> = {
  none: '선택 안 함',
  'kim-donghyeok': '김동혁',
  'frontier-archer': '하진',
  'osaka-mudang': '연화',
  'gwanghae-prince': '왕세자 광해',
  travel: '유령 여행자',
};

export const GUIDE_POST_LIMITS = {
  authorId: { min: 20, max: 64 },
  nickname: { min: 2, max: 16 },
  title: { min: 2, max: 60 },
  body: { min: 2, max: 1_200, maxLines: 12 },
  regionName: { max: 40 },
  level: { min: 0, max: 999 },
} as const;

export const GUIDE_COMMENT_LIMITS = {
  body: { min: 2, max: 500, maxLines: 6 },
} as const;

export interface GuidePostProfileDraft {
  characterId: string;
  regionName: string;
  level: number | string;
}

export interface GuidePostProfile {
  characterId: GuideCharacterId;
  regionName: string;
  level: number;
}

export interface GuidePostDraft {
  authorId: string;
  nickname: string;
  title: string;
  body: string;
  category: string;
  profile: GuidePostProfileDraft;
}

export interface SanitizedGuidePostDraft {
  authorId: string;
  nickname: string;
  title: string;
  body: string;
  category: GuidePostCategory;
  profile: GuidePostProfile;
}

export interface GuidePost extends SanitizedGuidePostDraft {
  id: string;
  schemaVersion: number;
  createdAt: Date | null;
}

export interface GuideCommentDraft {
  authorId: string;
  nickname: string;
  body: string;
}

export interface SanitizedGuideCommentDraft {
  authorId: string;
  nickname: string;
  body: string;
}

export interface GuideComment extends SanitizedGuideCommentDraft {
  id: string;
  schemaVersion: number;
  createdAt: Date | null;
}

export type GuidePostField = 'authorId' | 'nickname' | 'title' | 'body' | 'category'
  | 'characterId' | 'regionName' | 'level';

export interface GuidePostValidationIssue {
  field: GuidePostField;
  message: string;
}

export class GuidePostValidationError extends Error {
  readonly issues: readonly GuidePostValidationIssue[];

  constructor(issues: readonly GuidePostValidationIssue[]) {
    super(issues[0]?.message ?? '게시글을 확인해 주세요.');
    this.name = 'GuidePostValidationError';
    this.issues = issues;
  }
}

type FirestoreTimestampLike = { toDate: () => Date };

const DISALLOWED_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;

const clampCodePoints = (value: string, max: number): string =>
  Array.from(value).slice(0, max).join('');

const normalizePlainText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(DISALLOWED_CONTROL_CHARACTERS, '')
    .replace(/[<>]/g, '');

const sanitizeSingleLine = (value: unknown, max: number): string =>
  clampCodePoints(
    normalizePlainText(value)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    max,
  ).trim();

const sanitizeMultiline = (value: unknown, max: number, maxLines: number): string => {
  const lines = normalizePlainText(value)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .slice(0, maxLines)
    .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trim());

  return clampCodePoints(lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), max).trim();
};

const sanitizeAuthorId = (value: unknown): string =>
  sanitizeSingleLine(value, GUIDE_POST_LIMITS.authorId.max)
    .replace(/[^A-Za-z0-9._:-]/g, '');

const sanitizeLevel = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(GUIDE_POST_LIMITS.level.max, Math.max(GUIDE_POST_LIMITS.level.min, Math.floor(parsed)));
};

export const isGuidePostCategory = (value: unknown): value is GuidePostCategory =>
  GUIDE_POST_CATEGORIES.includes(value as GuidePostCategory);

export const isGuideCharacterId = (value: unknown): value is GuideCharacterId =>
  GUIDE_CHARACTER_IDS.includes(value as GuideCharacterId);

export const sanitizeGuidePostDraft = (
  draft: GuidePostDraft,
): SanitizedGuidePostDraft => {
  const rawCategory = sanitizeSingleLine(draft.category, 20).toLowerCase();
  const rawCharacterId = sanitizeSingleLine(draft.profile.characterId, 30).toLowerCase();

  return {
    authorId: sanitizeAuthorId(draft.authorId),
    nickname: sanitizeSingleLine(draft.nickname, GUIDE_POST_LIMITS.nickname.max),
    title: sanitizeSingleLine(draft.title, GUIDE_POST_LIMITS.title.max),
    body: sanitizeMultiline(draft.body, GUIDE_POST_LIMITS.body.max, GUIDE_POST_LIMITS.body.maxLines),
    category: isGuidePostCategory(rawCategory) ? rawCategory : 'general',
    profile: {
      characterId: isGuideCharacterId(rawCharacterId) ? rawCharacterId : 'none',
      regionName: sanitizeSingleLine(draft.profile.regionName, GUIDE_POST_LIMITS.regionName.max),
      level: sanitizeLevel(draft.profile.level),
    },
  };
};

export const sanitizeGuideCommentDraft = (
  draft: GuideCommentDraft,
): SanitizedGuideCommentDraft => ({
  authorId: sanitizeAuthorId(draft.authorId),
  nickname: sanitizeSingleLine(draft.nickname, GUIDE_POST_LIMITS.nickname.max),
  body: sanitizeMultiline(
    draft.body,
    GUIDE_COMMENT_LIMITS.body.max,
    GUIDE_COMMENT_LIMITS.body.maxLines,
  ),
});

const validateIdentity = (
  authorId: string,
  nickname: string,
): GuidePostValidationIssue[] => {
  const issues: GuidePostValidationIssue[] = [];
  if (authorId.length < GUIDE_POST_LIMITS.authorId.min) {
    issues.push({ field: 'authorId', message: '작성자 인장을 만들지 못했습니다. 페이지를 새로 열어 주세요.' });
  }
  if (Array.from(nickname).length < GUIDE_POST_LIMITS.nickname.min) {
    issues.push({
      field: 'nickname',
      message: `닉네임은 ${GUIDE_POST_LIMITS.nickname.min}자 이상 입력해 주세요.`,
    });
  }
  return issues;
};

export const validateGuidePostDraft = (
  draft: SanitizedGuidePostDraft,
): readonly GuidePostValidationIssue[] => {
  const issues = validateIdentity(draft.authorId, draft.nickname);
  if (Array.from(draft.title).length < GUIDE_POST_LIMITS.title.min) {
    issues.push({
      field: 'title',
      message: `제목은 ${GUIDE_POST_LIMITS.title.min}자 이상 입력해 주세요.`,
    });
  }
  if (Array.from(draft.body).length < GUIDE_POST_LIMITS.body.min) {
    issues.push({
      field: 'body',
      message: `본문은 ${GUIDE_POST_LIMITS.body.min}자 이상 입력해 주세요.`,
    });
  }
  return issues;
};

export const validateGuideCommentDraft = (
  draft: SanitizedGuideCommentDraft,
): readonly GuidePostValidationIssue[] => {
  const issues = validateIdentity(draft.authorId, draft.nickname);
  if (Array.from(draft.body).length < GUIDE_COMMENT_LIMITS.body.min) {
    issues.push({
      field: 'body',
      message: `댓글은 ${GUIDE_COMMENT_LIMITS.body.min}자 이상 입력해 주세요.`,
    });
  }
  return issues;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (
    typeof value === 'object'
    && value !== null
    && 'toDate' in value
    && typeof (value as FirestoreTimestampLike).toDate === 'function'
  ) {
    const parsed = (value as FirestoreTimestampLike).toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  return null;
};

const parseProfile = (value: unknown): GuidePostProfile => {
  const profile = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const characterId = sanitizeSingleLine(profile.characterId, 30).toLowerCase();
  return {
    characterId: isGuideCharacterId(characterId) ? characterId : 'none',
    regionName: sanitizeSingleLine(profile.regionName, GUIDE_POST_LIMITS.regionName.max),
    level: sanitizeLevel(profile.level),
  };
};

export const subscribeGuidePosts = (
  onPosts: (posts: GuidePost[]) => void,
  onError: (error: Error) => void = () => undefined,
): Unsubscribe => {
  const postsQuery = query(
    collection(db, GUIDE_POSTS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(GUIDE_POST_PAGE_SIZE),
  );

  return onSnapshot(postsQuery, (snapshot) => {
    const posts = snapshot.docs.map((entry): GuidePost | null => {
      const data = entry.data();
      const title = sanitizeSingleLine(data.title, GUIDE_POST_LIMITS.title.max);
      const body = sanitizeMultiline(data.body, GUIDE_POST_LIMITS.body.max, GUIDE_POST_LIMITS.body.maxLines);
      if (!title || !body) return null;

      const category = sanitizeSingleLine(data.category, 20).toLowerCase();
      return {
        id: entry.id,
        schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : 1,
        authorId: sanitizeAuthorId(data.authorId),
        nickname:
          sanitizeSingleLine(data.nickname, GUIDE_POST_LIMITS.nickname.max)
          || '이름 없는 나그네',
        title,
        body,
        category: isGuidePostCategory(category) ? category : 'general',
        profile: parseProfile(data.profile),
        createdAt: toDate(data.createdAt),
      };
    }).filter((post): post is GuidePost => post !== null);

    onPosts(posts);
  }, (error) => onError(error instanceof Error ? error : new Error('게시판 연결에 실패했습니다.')));
};

export const subscribeGuideComments = (
  postId: string,
  onComments: (comments: GuideComment[]) => void,
  onError: (error: Error) => void = () => undefined,
): Unsubscribe => {
  const commentsQuery = query(
    collection(db, GUIDE_POSTS_COLLECTION, postId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(GUIDE_COMMENT_PAGE_SIZE),
  );

  return onSnapshot(commentsQuery, (snapshot) => {
    const comments = snapshot.docs.map((entry): GuideComment | null => {
      const data = entry.data();
      const body = sanitizeMultiline(
        data.body,
        GUIDE_COMMENT_LIMITS.body.max,
        GUIDE_COMMENT_LIMITS.body.maxLines,
      );
      if (!body) return null;
      return {
        id: entry.id,
        schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : 1,
        authorId: sanitizeAuthorId(data.authorId),
        nickname:
          sanitizeSingleLine(data.nickname, GUIDE_POST_LIMITS.nickname.max)
          || '이름 없는 나그네',
        body,
        createdAt: toDate(data.createdAt),
      };
    }).filter((comment): comment is GuideComment => comment !== null);
    onComments(comments);
  }, (error) => onError(error instanceof Error ? error : new Error('댓글 연결에 실패했습니다.')));
};

export const createGuidePost = async (draft: GuidePostDraft): Promise<string> => {
  const sanitized = sanitizeGuidePostDraft(draft);
  const issues = validateGuidePostDraft(sanitized);
  if (issues.length > 0) throw new GuidePostValidationError(issues);

  await ensureAnonymousAuth();
  const document = await addDoc(collection(db, GUIDE_POSTS_COLLECTION), {
    schemaVersion: GUIDE_BOARD_SCHEMA_VERSION,
    authorId: sanitized.authorId,
    nickname: sanitized.nickname,
    title: sanitized.title,
    body: sanitized.body,
    category: sanitized.category,
    profile: sanitized.profile,
    createdAt: serverTimestamp(),
  });

  return document.id;
};

export const createGuideComment = async (
  postId: string,
  draft: GuideCommentDraft,
): Promise<string> => {
  const sanitizedPostId = sanitizeSingleLine(postId, 128).replace(/[^A-Za-z0-9_-]/g, '');
  if (!sanitizedPostId) throw new GuidePostValidationError([
    { field: 'body', message: '댓글을 남길 게시글을 찾지 못했습니다.' },
  ]);
  const sanitized = sanitizeGuideCommentDraft(draft);
  const issues = validateGuideCommentDraft(sanitized);
  if (issues.length > 0) throw new GuidePostValidationError(issues);

  await ensureAnonymousAuth();
  const document = await addDoc(
    collection(db, GUIDE_POSTS_COLLECTION, sanitizedPostId, 'comments'),
    {
      schemaVersion: GUIDE_COMMENT_SCHEMA_VERSION,
      authorId: sanitized.authorId,
      nickname: sanitized.nickname,
      body: sanitized.body,
      createdAt: serverTimestamp(),
    },
  );
  return document.id;
};
