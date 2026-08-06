import './styles.css';
import {
  createGuideComment,
  createGuidePost,
  GUIDE_CHARACTER_LABELS,
  GUIDE_POST_CATEGORY_LABELS,
  GUIDE_POST_LIMITS,
  GuidePostValidationError,
  subscribeGuideComments,
  subscribeGuidePosts,
  type GuideComment,
  type GuidePost,
  type GuidePostCategory,
} from './GuideBoard';
import {
  clearGuideDraft,
  getOrCreateGuideAnonymousAuthorId,
  loadGuideDraft,
  saveGuideDraft,
  type GuideDraftFields,
} from './GuideDraftStore';
import { readGuideGameProfiles } from './GuideGameProfile';

type FateId = 'donghyeok' | 'hajin' | 'yeonhwa' | 'gwanghae';
type RouteId = 'revenge' | 'uprising' | 'unification';
type BoardFilter = 'all' | 'notice' | GuidePostCategory;
type DisplayPost = Omit<GuidePost, 'category'> & {
  category: 'notice' | GuidePostCategory;
  pinned?: boolean;
};

const CANONICAL_GAME_URL = 'https://haze-479ed.web.app/';

const q = <T extends Element>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(selector);

const qa = <T extends Element>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

const setText = (selector: string, value: string, root: ParentNode = document): void => {
  const element = q<HTMLElement>(selector, root);
  if (element) element.textContent = value;
};

const resolveGameUrl = (): string => {
  if (window.location.protocol === 'file:') return '../index.html';
  if (
    window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    || window.location.hostname === 'haze-479ed.web.app'
  ) return '/';
  return CANONICAL_GAME_URL;
};

qa<HTMLAnchorElement>('[data-game-link]').forEach((link) => {
  link.href = resolveGameUrl();
});

const siteHeader = q<HTMLElement>('[data-site-header]');
const siteNav = q<HTMLElement>('[data-site-nav]');
const navToggle = q<HTMLButtonElement>('[data-nav-toggle]');
const toTop = q<HTMLButtonElement>('[data-to-top]');

const closeNavigation = (): void => {
  siteNav?.classList.remove('is-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  navToggle?.setAttribute('aria-label', '메뉴 열기');
  document.body.classList.remove('nav-open');
};

navToggle?.addEventListener('click', () => {
  const shouldOpen = !siteNav?.classList.contains('is-open');
  siteNav?.classList.toggle('is-open', shouldOpen);
  navToggle.setAttribute('aria-expanded', String(shouldOpen));
  navToggle.setAttribute('aria-label', shouldOpen ? '메뉴 닫기' : '메뉴 열기');
  document.body.classList.toggle('nav-open', shouldOpen);
});

qa<HTMLAnchorElement>('a[href^="#"]', siteNav ?? document).forEach((link) => {
  link.addEventListener('click', closeNavigation);
});

const updateScrollChrome = (): void => {
  const scrolled = window.scrollY > 32;
  siteHeader?.classList.toggle('is-scrolled', scrolled);
  toTop?.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.65);
};

window.addEventListener('scroll', updateScrollChrome, { passive: true });
updateScrollChrome();
toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealElements = qa<HTMLElement>('[data-reveal]');
if (reducedMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  revealElements.forEach((element) => revealObserver.observe(element));
}

const navLinks = qa<HTMLAnchorElement>('.site-nav a[href^="#"]');
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible?.target.id) return;
    navLinks.forEach((link) => {
      link.classList.toggle('is-current', link.hash === `#${visible.target.id}`);
    });
  }, { threshold: [0.18, 0.42], rootMargin: '-20% 0px -58% 0px' });
  qa<HTMLElement>('main section[id]').forEach((section) => sectionObserver.observe(section));
}

const fateCopy: Record<FateId, {
  seal: string;
  kicker: string;
  name: string;
  story: string;
  start: string;
  goal: string;
  style: string;
}> = {
  donghyeok: {
    seal: '民',
    kicker: 'DAEDONG PEASANT ARMY',
    name: '울릉의 죄인 · 김동혁',
    story: '정여립의 대동 사상을 이어받아 농민 서른두 명과 봉기한다. 울릉 관아에서 시작해 조선의 성을 백성의 근거지로 바꾸는 성장 전쟁.',
    start: '울릉 관청 감옥터',
    goal: '울릉 해방 · 한성 진군',
    style: '환도 연격 · 동행 부대',
  },
  hajin: {
    seal: '弓',
    kicker: 'JURCHEN TRIBAL LEAGUE',
    name: '북방 활잡이 · 하진',
    story: '압록 첫 전투에서 군세를 잃고 예비병 한 명 없이 귀환한다. 백산·송화·흑수의 세 부족 족장을 설득해 연맹을 다시 세우고 평양성으로 남하한다.',
    start: '압록 패잔병 본영',
    goal: '여진 3부족 통합 · 압록 설욕',
    style: '강궁 사격 · 부족 전열 지휘',
  },
  yeonhwa: {
    seal: '魂',
    kicker: 'EXILES OF OSAKA',
    name: '망향의 무당 · 연화',
    story: '오사카 포로촌 생존자와 왜군 낙오병 스물넷을 묶는다. 방울과 부적으로 원혼을 달래고 부리며, 작은 원정대를 이끌어 부산진과 조선의 성로를 노린다.',
    start: '오사카 외항 포로촌',
    goal: '막부 결전 · 조선 침공로 개방',
    style: '초혼방울 · 결박 진혼굿',
  },
  gwanghae: {
    seal: '王',
    kicker: 'JOSEON ROYAL COURT',
    name: '전란의 왕세자 · 광해',
    story: '선조가 재위한 전란기, 왕세자 광해는 분조를 이끌고 무너진 고을의 군량과 민심, 흩어진 관군과 의병을 다시 모은다.',
    start: '한성 창덕궁 분조청',
    goal: '왕실 피난로 수호 · 북방 순행',
    style: '세자 검법 · 관군·의병 지휘',
  },
};

const fateRecord = q<HTMLElement>('[data-fate-record]');
const selectFate = (id: FateId): void => {
  const copy = fateCopy[id];
  qa<HTMLElement>('[data-character]').forEach((card) => {
    const active = card.dataset.character === id;
    card.classList.toggle('is-active', active);
    q<HTMLButtonElement>('[data-character-select]', card)?.setAttribute('aria-pressed', String(active));
  });
  if (!fateRecord) return;
  fateRecord.dataset.fate = id;
  setText('[data-fate-seal]', copy.seal, fateRecord);
  setText('[data-fate-kicker]', copy.kicker, fateRecord);
  setText('[data-fate-name]', copy.name, fateRecord);
  setText('[data-fate-story]', copy.story, fateRecord);
  setText('[data-fate-start]', copy.start, fateRecord);
  setText('[data-fate-goal]', copy.goal, fateRecord);
  setText('[data-fate-style]', copy.style, fateRecord);
};

qa<HTMLButtonElement>('[data-character-select]').forEach((button) => {
  button.addEventListener('click', () => selectFate(button.dataset.characterSelect as FateId));
});

const routeCopy: Record<RouteId, {
  number: string;
  title: string;
  summary: string;
  stops: string[];
}> = {
  revenge: {
    number: 'ROUTE 01',
    title: '오사카에서 조선으로',
    summary: '포로촌의 생존자와 왜군 낙오병을 모은 연화가 세츠·야마자키·막부 본영을 거쳐 조선 침공로를 연다.',
    stops: ['오사카 외항 포로촌', '대마도 왜구 정박지', '부산진 성문', '한성 북로'],
  },
  uprising: {
    number: 'ROUTE 02',
    title: '울릉에서 한성으로',
    summary: '감옥에서 살아남은 김동혁이 울릉의 백성을 모아 관아를 무너뜨리고, 본토의 성을 대동군 근거지로 바꾼다.',
    stops: ['울릉 관청 감옥터', '달빛고을', '전주성', '한성 광화문'],
  },
  unification: {
    number: 'ROUTE 03',
    title: '장백산에서 평양으로',
    summary: '패전한 하진이 백산·송화·흑수 부족의 맹약을 받아 통합 여진군을 세우고 압록을 넘어 남하한다.',
    stops: ['압록 패잔병 본영', '여진 세 부족 마을', '압록 국경', '평양 대동문'],
  },
};

const routeStops = q<HTMLOListElement>('[data-route-stops]');
const selectRoute = (id: RouteId): void => {
  const copy = routeCopy[id];
  qa<HTMLButtonElement>('[data-route]').forEach((button) => {
    const active = button.dataset.route === id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  setText('[data-route-number]', copy.number);
  setText('[data-route-title]', copy.title);
  setText('[data-route-summary]', copy.summary);
  routeStops?.replaceChildren(...copy.stops.map((stop) => {
    const item = document.createElement('li');
    item.textContent = stop;
    return item;
  }));
};

qa<HTMLButtonElement>('[data-route]').forEach((button) => {
  button.addEventListener('click', () => selectRoute(button.dataset.route as RouteId));
});

const formatDate = (value: Date | null, long = false): string => {
  if (!value) return '방금 전';
  const now = Date.now();
  const difference = Math.max(0, now - value.getTime());
  const minutes = Math.floor(difference / 60_000);
  if (!long && minutes < 1) return '방금 전';
  if (!long && minutes < 60) return `${minutes}분 전`;
  if (!long && minutes < 1_440) return `${Math.floor(minutes / 60)}시간 전`;
  return new Intl.DateTimeFormat('ko-KR', long
    ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'numeric', day: 'numeric' }).format(value);
};

const categoryLabel = (category: DisplayPost['category']): string =>
  category === 'notice' ? '공지' : GUIDE_POST_CATEGORY_LABELS[category];

const notices: DisplayPost[] = [
  {
    id: 'notice-guide-open',
    schemaVersion: 2,
    authorId: 'official_chronicle_notice_guide',
    category: 'notice',
    pinned: true,
    nickname: '아스라 기록관',
    title: '나그네 게시판 이용 안내',
    body: '전장의 공략, 길 찾기, 동행 모집과 질문을 나누는 공간입니다.\n\n개인정보, 욕설, 도배성 내용은 남기지 말아 주세요. 현재 게시글은 수정과 삭제를 지원하지 않으며 운영 정책에 따라 관리됩니다.',
    profile: { characterId: 'none', regionName: '', level: 0 },
    createdAt: new Date('2026-08-01T00:00:00+09:00'),
  },
  {
    id: 'notice-travel-mode',
    schemaVersion: 2,
    authorId: 'official_chronicle_notice_travel',
    category: 'notice',
    pinned: true,
    nickname: '아스라 기록관',
    title: '여행 모드는 전투와 기록이 없는 답사 전용 모드입니다',
    body: '메인 화면의 여행 모드에서 전체 지도를 열면 지상 52개 지역을 고를 수 있습니다. 유령 상태로 지형을 통과해 이동하며, 전투·아이템 획득·이야기 진행·저장은 발생하지 않습니다.',
    profile: { characterId: 'travel', regionName: '전체 지도', level: 0 },
    createdAt: new Date('2026-07-31T12:00:00+09:00'),
  },
];

const boardList = q<HTMLElement>('[data-board-list]');
const boardEmpty = q<HTMLElement>('[data-board-empty]');
const boardStatus = q<HTMLElement>('[data-board-status]');
const boardSearch = q<HTMLInputElement>('[data-board-search]');
const composeDialog = q<HTMLDialogElement>('[data-compose-dialog]');
const postDialog = q<HTMLDialogElement>('[data-post-dialog]');
const composeForm = q<HTMLFormElement>('[data-compose-form]');
const composeError = q<HTMLElement>('[data-compose-error]');
const submitPost = q<HTMLButtonElement>('[data-submit-post]');
const bodyInput = composeForm?.elements.namedItem('body') as HTMLTextAreaElement | null;
const characterInput = composeForm?.elements.namedItem('characterId') as HTMLSelectElement | null;
const regionInput = composeForm?.elements.namedItem('regionName') as HTMLInputElement | null;
const levelInput = composeForm?.elements.namedItem('level') as HTMLInputElement | null;
const commentPanel = q<HTMLElement>('[data-comments-panel]', postDialog ?? document);
const commentList = q<HTMLOListElement>('[data-comment-list]', postDialog ?? document);
const commentForm = q<HTMLFormElement>('[data-comment-form]', postDialog ?? document);
const commentError = q<HTMLElement>('[data-comment-error]', postDialog ?? document);
const submitComment = q<HTMLButtonElement>('[data-submit-comment]', postDialog ?? document);

const anonymousAuthorId = getOrCreateGuideAnonymousAuthorId();
const gameProfiles = readGuideGameProfiles();

let remotePosts: GuidePost[] = [];
let activeBoardFilter: BoardFilter = 'all';
let boardQuery = '';
let activePost: DisplayPost | null = null;
let unsubscribeComments: (() => void) | null = null;

const setBoardStatus = (state: 'loading' | 'online' | 'error', message: string): void => {
  if (!boardStatus) return;
  boardStatus.dataset.state = state;
  setText('span', message, boardStatus);
};

const profileParts = (post: Pick<GuidePost, 'profile'>): string[] => {
  const parts: string[] = [];
  if (post.profile.characterId !== 'none') {
    parts.push(GUIDE_CHARACTER_LABELS[post.profile.characterId]);
  }
  if (post.profile.regionName) parts.push(post.profile.regionName);
  if (post.profile.level > 0) parts.push(`${post.profile.level}품`);
  return parts;
};

const stopCommentSubscription = (): void => {
  unsubscribeComments?.();
  unsubscribeComments = null;
};

const renderComments = (comments: readonly GuideComment[]): void => {
  setText('[data-comment-count]', String(comments.length), postDialog ?? document);
  if (!commentList) return;
  commentList.replaceChildren(...comments.map((comment) => {
    const item = document.createElement('li');
    const header = document.createElement('header');
    const author = document.createElement('b');
    author.textContent = comment.nickname;
    const time = document.createElement('time');
    time.dateTime = comment.createdAt?.toISOString() ?? '';
    time.textContent = formatDate(comment.createdAt);
    const body = document.createElement('p');
    body.textContent = comment.body;
    header.append(author, time);
    item.append(header, body);
    return item;
  }));
  setText(
    '[data-comment-status]',
    comments.length > 0 ? '실시간으로 연결된 댓글입니다' : '아직 댓글이 없습니다. 첫 답글을 남겨 주세요.',
    postDialog ?? document,
  );
};

const openPost = (post: DisplayPost): void => {
  if (!postDialog) return;
  stopCommentSubscription();
  activePost = post;
  setText('[data-post-category]', `${post.pinned ? '중요 공지 · ' : ''}${categoryLabel(post.category)}`, postDialog);
  setText('[data-post-title]', post.title, postDialog);
  setText('[data-post-author]', post.nickname, postDialog);
  setText('[data-post-time]', formatDate(post.createdAt, true), postDialog);
  setText('[data-post-body]', post.body, postDialog);
  const profile = q<HTMLElement>('[data-post-profile]', postDialog);
  const parts = profileParts(post);
  profile?.replaceChildren(...[
    ...(parts.length > 0 ? parts : ['여정 정보 없음']),
    `기록 형식 v${post.schemaVersion}`,
  ].map((value) => {
    const badge = document.createElement('span');
    badge.textContent = value;
    return badge;
  }));
  if (commentError) commentError.textContent = '';
  if (commentList) commentList.replaceChildren();
  setText('[data-comment-count]', '0', postDialog);
  const commentsEnabled = !post.pinned && post.category !== 'notice';
  if (commentPanel) commentPanel.dataset.disabled = String(!commentsEnabled);
  if (commentForm) commentForm.hidden = !commentsEnabled;
  if (commentsEnabled) {
    setText('[data-comment-status]', '댓글을 불러오는 중입니다', postDialog);
    const nickname = commentForm?.elements.namedItem('nickname') as HTMLInputElement | null;
    try {
      const remembered = localStorage.getItem('asra-guide-nickname');
      if (nickname && remembered) nickname.value = remembered;
    } catch {
      // A blocked local store does not prevent commenting.
    }
    unsubscribeComments = subscribeGuideComments(post.id, renderComments, () => {
      setText('[data-comment-status]', '댓글 연결을 확인해 주세요', postDialog);
    });
  } else {
    setText('[data-comment-status]', '기록관 공지에는 댓글을 남길 수 없습니다', postDialog);
  }
  postDialog.showModal();
  postDialog.scrollTop = 0;
};

const renderBoard = (): void => {
  if (!boardList) return;
  const normalizedQuery = boardQuery.normalize('NFKC').trim().toLocaleLowerCase('ko-KR');
  const allPosts: DisplayPost[] = [...notices, ...remotePosts];
  const visiblePosts = allPosts.filter((post) => {
    if (activeBoardFilter !== 'all' && post.category !== activeBoardFilter) return false;
    if (!normalizedQuery) return true;
    return `${post.title} ${post.body} ${post.nickname} ${profileParts(post).join(' ')}`
      .normalize('NFKC')
      .toLocaleLowerCase('ko-KR')
      .includes(normalizedQuery);
  });

  boardList.replaceChildren(...visiblePosts.map((post, index) => {
    const article = document.createElement('article');
    article.className = `board-row${post.pinned ? ' board-row--notice' : ''}`;
    article.setAttribute('aria-posinset', String(index + 1));
    article.setAttribute('aria-setsize', String(visiblePosts.length));

    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => openPost(post));

    const category = document.createElement('span');
    category.className = `board-row__category board-row__category--${post.category}`;
    category.textContent = categoryLabel(post.category);

    const copy = document.createElement('span');
    copy.className = 'board-row__copy';
    const title = document.createElement('b');
    title.textContent = post.title;
    const excerpt = document.createElement('small');
    excerpt.textContent = post.body.replace(/\s+/g, ' ').slice(0, 92);
    copy.append(title, excerpt);

    const meta = document.createElement('span');
    meta.className = 'board-row__meta';
    const author = document.createElement('b');
    author.textContent = post.nickname;
    const time = document.createElement('time');
    time.dateTime = post.createdAt?.toISOString() ?? '';
    time.textContent = formatDate(post.createdAt);
    const journey = document.createElement('small');
    journey.textContent = profileParts(post).join(' · ');
    journey.hidden = !journey.textContent;
    meta.append(author, journey, time);

    const arrow = document.createElement('i');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '›';
    button.append(category, copy, meta, arrow);
    article.append(button);
    return article;
  }));

  boardList.setAttribute('aria-busy', 'false');
  if (boardEmpty) boardEmpty.hidden = visiblePosts.length > 0;
};

qa<HTMLButtonElement>('[data-board-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    activeBoardFilter = button.dataset.boardFilter as BoardFilter;
    qa<HTMLButtonElement>('[data-board-filter]').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-selected', String(active));
    });
    renderBoard();
  });
});

boardSearch?.addEventListener('input', () => {
  boardQuery = boardSearch.value;
  renderBoard();
});

const closeCompose = (): void => {
  composeDialog?.close();
  if (composeError) composeError.textContent = '';
};

const composeValue = (name: string): string => {
  const control = composeForm?.elements.namedItem(name);
  return control instanceof HTMLInputElement
    || control instanceof HTMLTextAreaElement
    || control instanceof HTMLSelectElement
    ? control.value
    : '';
};

const readComposeDraft = (): GuideDraftFields => ({
  category: composeValue('category') as GuideDraftFields['category'],
  nickname: composeValue('nickname'),
  title: composeValue('title'),
  body: composeValue('body'),
  character: composeValue('characterId'),
  region: composeValue('regionName'),
  level: composeValue('level'),
});

const setComposeValue = (name: string, value: string): void => {
  const control = composeForm?.elements.namedItem(name);
  if (
    control instanceof HTMLInputElement
    || control instanceof HTMLTextAreaElement
    || control instanceof HTMLSelectElement
  ) control.value = value;
};

const updateProfileSummary = (): void => {
  const characterId = characterInput?.value as keyof typeof GUIDE_CHARACTER_LABELS | undefined;
  const character = characterId && GUIDE_CHARACTER_LABELS[characterId]
    ? GUIDE_CHARACTER_LABELS[characterId]
    : '캐릭터 미선택';
  const region = regionInput?.value.trim() || '지역 미입력';
  const level = Number(levelInput?.value) > 0 ? `${Math.floor(Number(levelInput?.value))}품` : '품계 미입력';
  setText('[data-profile-summary]', `${character} · ${region} · ${level}`, composeDialog ?? document);
};

const persistComposeDraft = (): void => {
  const saved = saveGuideDraft(readComposeDraft());
  updateProfileSummary();
  if (!saved) return;
  const time = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' })
    .format(saved.savedAt);
  setText('[data-draft-status]', `임시 기록 자동 저장됨 · ${time}`, composeDialog ?? document);
};

const applyGameProfile = (characterId: string): boolean => {
  const profile = gameProfiles.find((candidate) => candidate.characterId === characterId);
  if (!profile) return false;
  if (regionInput) regionInput.value = profile.regionName;
  if (levelInput) levelInput.value = String(profile.level);
  setText(
    '[data-profile-source]',
    `${GUIDE_CHARACTER_LABELS[profile.characterId]} 기기 저장에서 지역·품계를 불러왔습니다`,
    composeDialog ?? document,
  );
  updateProfileSummary();
  return true;
};

const restoreCompose = (): void => {
  const draft = loadGuideDraft();
  if (draft) {
    setComposeValue('category', draft.category);
    setComposeValue('nickname', draft.nickname);
    setComposeValue('title', draft.title);
    setComposeValue('body', draft.body);
    setComposeValue('characterId', draft.character);
    setComposeValue('regionName', draft.region);
    setComposeValue('level', draft.level);
    const saved = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' })
      .format(draft.savedAt);
    setText('[data-draft-status]', `임시 기록 복원됨 · ${saved}`, composeDialog ?? document);
  } else {
    try {
      setComposeValue('nickname', localStorage.getItem('asra-guide-nickname') ?? '');
    } catch {
      // Keep the blank field when local storage is unavailable.
    }
    const latest = gameProfiles[0];
    if (latest) {
      setComposeValue('characterId', latest.characterId);
      applyGameProfile(latest.characterId);
    }
  }
  if (gameProfiles.length === 0) {
    setText(
      '[data-profile-source]',
      window.location.hostname === 'haze-479ed-guide.web.app'
        ? '독립 가이드 주소에서는 캐릭터·지역을 직접 선택해 주세요'
        : '연결할 인게임 저장 기록이 없어 직접 입력합니다',
      composeDialog ?? document,
    );
  }
  setText('[data-body-count]', String(Array.from(bodyInput?.value ?? '').length));
  updateProfileSummary();
};

q<HTMLButtonElement>('[data-open-compose]')?.addEventListener('click', () => {
  if (!composeDialog) return;
  const nickname = composeForm?.elements.namedItem('nickname') as HTMLInputElement | null;
  restoreCompose();
  composeDialog.showModal();
  window.setTimeout(() => nickname?.focus(), 40);
});

q<HTMLButtonElement>('[data-close-compose]')?.addEventListener('click', closeCompose);
q<HTMLButtonElement>('[data-close-post]')?.addEventListener('click', () => postDialog?.close());

[composeDialog, postDialog].forEach((dialog) => {
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

composeForm?.addEventListener('input', () => {
  setText('[data-body-count]', String(Array.from(bodyInput?.value ?? '').length));
  persistComposeDraft();
});

composeForm?.addEventListener('change', persistComposeDraft);

characterInput?.addEventListener('change', () => {
  applyGameProfile(characterInput.value);
  persistComposeDraft();
});

composeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(composeForm);
  if (composeError) composeError.textContent = '';
  if (submitPost) {
    submitPost.disabled = true;
    submitPost.classList.add('is-loading');
    setText('span', '기록 올리는 중', submitPost);
  }
  try {
    const nickname = String(formData.get('nickname') ?? '');
    await createGuidePost({
      authorId: anonymousAuthorId,
      category: String(formData.get('category') ?? 'general'),
      nickname,
      title: String(formData.get('title') ?? ''),
      body: String(formData.get('body') ?? ''),
      profile: {
        characterId: String(formData.get('characterId') ?? 'none'),
        regionName: String(formData.get('regionName') ?? ''),
        level: String(formData.get('level') ?? '0'),
      },
    });
    try {
      localStorage.setItem('asra-guide-nickname', nickname.trim().slice(0, GUIDE_POST_LIMITS.nickname.max));
    } catch {
      // Posting has already succeeded.
    }
    clearGuideDraft();
    composeForm.reset();
    setText('[data-body-count]', '0');
    updateProfileSummary();
    closeCompose();
    setBoardStatus('online', '새 기록이 게시되었습니다');
  } catch (error) {
    if (composeError) {
      composeError.textContent = error instanceof GuidePostValidationError
        ? error.message
        : '게시글을 올리지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.';
    }
  } finally {
    if (submitPost) {
      submitPost.disabled = false;
      submitPost.classList.remove('is-loading');
      setText('span', '기록 올리기', submitPost);
    }
  }
});

commentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activePost || activePost.pinned || activePost.category === 'notice') return;
  const formData = new FormData(commentForm);
  const nickname = String(formData.get('nickname') ?? '');
  if (commentError) commentError.textContent = '';
  if (submitComment) {
    submitComment.disabled = true;
    setText('span', '댓글 남기는 중', submitComment);
  }
  try {
    await createGuideComment(activePost.id, {
      authorId: anonymousAuthorId,
      nickname,
      body: String(formData.get('body') ?? ''),
    });
    try {
      localStorage.setItem('asra-guide-nickname', nickname.trim().slice(0, GUIDE_POST_LIMITS.nickname.max));
    } catch {
      // Commenting has already succeeded.
    }
    const body = commentForm.elements.namedItem('body') as HTMLTextAreaElement | null;
    if (body) body.value = '';
    setText('[data-comment-status]', '댓글이 저장되었습니다', postDialog ?? document);
  } catch (error) {
    if (commentError) {
      commentError.textContent = error instanceof GuidePostValidationError
        ? error.message
        : '댓글을 남기지 못했습니다. 연결을 확인해 주세요.';
    }
  } finally {
    if (submitComment) {
      submitComment.disabled = false;
      setText('span', '댓글 남기기', submitComment);
    }
  }
});

postDialog?.addEventListener('close', () => {
  stopCommentSubscription();
  activePost = null;
});

renderBoard();
const unsubscribeBoard = subscribeGuidePosts((posts) => {
  remotePosts = posts;
  setBoardStatus('online', `실시간 게시판 · 기록 ${posts.length + notices.length}개`);
  renderBoard();
}, () => {
  setBoardStatus('error', '게시판 연결을 확인해 주세요');
  renderBoard();
});

window.addEventListener('beforeunload', () => {
  unsubscribeBoard();
  stopCommentSubscription();
}, { once: true });
