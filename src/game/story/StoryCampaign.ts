import type { PlayerOrigin } from '../simulation/types';

export type StoryChapterSignal = Readonly<{
  chapter: number;
  title: string;
  objective: string;
  completed: number;
}>;

export type StoryLine = Readonly<{
  speaker: string;
  text: string;
  tone?: 'narrator' | 'ally' | 'hero' | 'objective';
}>;

export type StoryChoice = Readonly<{
  id: string;
  label: string;
  detail: string;
  consequence: string;
}>;

export type StoryBeat = Readonly<{
  id: string;
  origin: PlayerOrigin;
  chapter: number;
  act: number;
  actTitle: string;
  campaignTitle: string;
  title: string;
  location: string;
  objective: string;
  historicalFrame: string;
  lines: readonly StoryLine[];
  choices: readonly StoryChoice[];
}>;

export type StoryMemory = Readonly<{
  beatId: string;
  chapter: number;
  act: number;
  title: string;
  summary: string;
}>;

export type StoryChoiceRecord = Readonly<{
  beatId: string;
  choiceId: string;
  label: string;
  consequence: string;
}>;

export type StoryCampaignState = Readonly<{
  version: 1;
  origin: PlayerOrigin;
  seenBeatIds: readonly string[];
  memories: readonly StoryMemory[];
  choices: readonly StoryChoiceRecord[];
}>;

type StoryAct = Readonly<{
  title: string;
  firstChapter: number;
  lastChapter: number;
  historicalFrame: string;
  ally: string;
  allyLine: string;
  heroLine: string;
}>;

type StoryVoice = Readonly<{
  campaignTitle: string;
  hero: string;
  originTruth: string;
  acts: readonly StoryAct[];
}>;

const STORY_VOICES: Record<PlayerOrigin, StoryVoice> = {
  'kim-donghyeok': {
    campaignTitle: '김동혁의 대동복수록',
    hero: '김동혁',
    originTruth: '가상 역사 · 울릉 세곡 수탈과 왜선 밀약 장부가 대동 봉기의 불씨가 된다.',
    acts: [
      {
        title: '제1막 · 감옥의 밤', firstChapter: 1, lastChapter: 2,
        historicalFrame: '울릉 관아의 수탈과 형 김무혁의 죽음 뒤, 한 죄수가 북문을 향한다.',
        ally: '감옥의 늙은 죄수', allyLine: '원수의 피만 보고 달리면 북문 밖에서 기다리는 백성을 놓치게 될 것이오.',
        heroLine: '형을 죽인 명이 아직 이 감옥 안에 있다. 살아 나가 그 명을 내린 자를 찾는다.',
      },
      {
        title: '제2막 · 섬의 사람들', firstChapter: 3, lastChapter: 3,
        historicalFrame: '굶주림과 징발에 내몰린 섬사람들이 복수보다 먼저 살아남을 길을 묻는다.',
        ally: '울릉 촌로', allyLine: '관아보다 먼저 굶는 사람을 보시오. 살아 있는 이가 있어야 봉기도 있소.',
        heroLine: '복수보다 살아 있는 백성이 먼저다. 칼보다 곡식과 사람을 모으겠다.',
      },
      {
        title: '제3막 · 검은 돛의 밀약', firstChapter: 4, lastChapter: 5,
        historicalFrame: '서병관의 세곡 장부와 왜구 선단이 한 줄의 밀약으로 이어진다.',
        ally: '관군 이탈자', allyLine: '관복을 벗고 백성에게 칼을 돌리지 않으면 우리도 받아 주겠소?',
        heroLine: '오늘부터 관아는 백성의 것이다. 장부를 숨긴 자와 침공군을 함께 심판한다.',
      },
      {
        title: '제4막 · 대동 봉기', firstChapter: 6, lastChapter: 8,
        historicalFrame: '해방된 섬의 소문이 본토로 번지고 농민·의병·관군 이탈자가 하나의 깃발로 모인다.',
        ally: '대동군 서기', allyLine: '울릉의 원한만으로는 본토의 성을 얻어도 지킬 수 없습니다. 사람을 남겨야 합니다.',
        heroLine: '칼을 백성에게 돌리지 않는 자는 함께 간다. 빼앗은 성을 백성의 근거지로 바꾼다.',
      },
      {
        title: '제5막 · 왕 앞의 장부', firstChapter: 9, lastChapter: 17,
        historicalFrame: '밀약 장부와 생존자의 증언이 왕도와 북방 전쟁을 하나의 책임으로 묶는다.',
        ally: '울릉 생존자', allyLine: '서병관 하나를 벤다고 형님의 죽음과 굶주린 아이들의 겨울이 되돌아오지는 않습니다.',
        heroLine: '원수 하나가 아니라 원수를 만든 질서를 심판한다. 복수 뒤에 남을 나라까지 정하겠다.',
      },
    ],
  },
  'frontier-archer': {
    campaignTitle: '하진의 남하연맹록',
    hero: '하진',
    originTruth: '가상 역사 · 조선 국경군이 미끼로 버린 혼성 전투대가 장백산 부족연맹으로 다시 일어난다.',
    acts: [
      {
        title: '제1막 · 압록의 패전', firstChapter: 1, lastChapter: 1,
        historicalFrame: '압록 얼음 나루의 패전 뒤, 살아남은 자들은 빈 군기만 들고 장백산으로 돌아온다.',
        ally: '패잔병 선봉장', allyLine: '패배를 감추면 다음 겨울에는 이름을 불러 줄 사람도 남지 않습니다.',
        heroLine: '패배를 숨기지 않는다. 남은 자들의 이름부터 다시 세운다.',
      },
      {
        title: '제2막 · 세 부족의 겨울', firstChapter: 2, lastChapter: 7,
        historicalFrame: '백산·송화·흑수 세 부족은 혈통이 아니라 겨울 양식과 방위를 건 맹약을 요구한다.',
        ally: '백산부 족장', allyLine: '남쪽 피를 말하기 전에 우리 아이들과 같은 겨울을 건널 힘을 보여라.',
        heroLine: '정복이 아닌 맹약으로 세 깃발을 묶는다. 함께 견딘 겨울이 우리의 혈통이다.',
      },
      {
        title: '제3막 · 압록 설욕전', firstChapter: 8, lastChapter: 8,
        historicalFrame: '하진을 버린 조선 국경군의 군보가 남쪽 성문 뒤에 남아 있다.',
        ally: '흑수부 장창장', allyLine: '강을 건너면 전사와 백성을 가려야 한다. 복수에 취한 군대는 연맹이 아니다.',
        heroLine: '이번에는 내 뒤에 세 부족의 이름이 있다. 군보를 쓴 자에게만 화살을 돌린다.',
      },
      {
        title: '제4막 · 대동문의 검은 깃발', firstChapter: 9, lastChapter: 11,
        historicalFrame: '평양의 성문마다 버려진 전령과 징발된 백성이 서로 다른 전쟁의 진실을 말한다.',
        ally: '송화부 기마장', allyLine: '성을 얻으러 왔다면 약탈하면 됩니다. 진실을 찾으려면 살아 있는 증인이 필요합니다.',
        heroLine: '성을 얻으러 온 것이 아니다. 나를 버린 명령의 주인을 찾는다.',
      },
      {
        title: '제5막 · 새 깃발', firstChapter: 12, lastChapter: 15,
        historicalFrame: '궁성과 왕의 피난로 끝에서 정복과 공동연맹 가운데 하나의 깃발을 정해야 한다.',
        ally: '세 부족 회맹사', allyLine: '왕을 꺾은 뒤 우리가 또 다른 왕이 된다면 이 긴 겨울은 아무것도 바꾸지 못합니다.',
        heroLine: '왕은 산과 바다로 달아나도 버린 자들의 이름에서는 달아나지 못한다.',
      },
    ],
  },
  'osaka-mudang': {
    campaignTitle: '연화의 피로인 쇄환록',
    hero: '무당 연화',
    originTruth: '역사축 · 왜란 때 일본으로 끌려가 오사카에 억류된 조선인 피로인과 쇄환되지 못한 이름들.',
    acts: [
      {
        title: '제1막 · 타향의 초혼', firstChapter: 1, lastChapter: 1,
        historicalFrame: '오사카 태생이 아닌 조선 피로인 연화가 포로촌에서 지워진 이름을 부르는 초혼굿을 연다.',
        ally: '포로촌 원혼', allyLine: '우리 이름이 양국의 장부에서 지워졌다. 살아 있는 네가 한 번만 불러 다오.',
        heroLine: '이름을 부르면 죽은 자도 증인이 된다. 산 자부터 문 밖으로 내보내겠다.',
      },
      {
        title: '제2막 · 검은 부채의 군선봉행', firstChapter: 2, lastChapter: 5,
        historicalFrame: '셋쓰 산촌과 오사카 성로에서 피로인·일본 징발민을 군선에 싣는 명령이 드러난다.',
        ally: '일본인 징발민', allyLine: '우리도 군량과 자식을 빼앗겼습니다. 군사와 백성을 가려 주십시오.',
        heroLine: '백성을 가르고 군사를 벤다. 내 원한은 가난한 자를 향하지 않는다.',
      },
      {
        title: '제3막 · 피로인의 바닷길', firstChapter: 6, lastChapter: 11,
        historicalFrame: '사카이·아와지·이키·대마도로 이어진 포로 수송로를 거꾸로 따라 쇄환선을 만든다.',
        ally: '항왜 길잡이', allyLine: '군선의 깃발을 내리면 도망칠 수 있습니다. 쇄환 깃발을 올리면 모두가 우리를 쫓을 겁니다.',
        heroLine: '포로를 실어 온 길을 오늘부터 쇄환선의 길로 바꾼다.',
      },
      {
        title: '제4막 · 귀향 아닌 문책', firstChapter: 12, lastChapter: 16,
        historicalFrame: '부산진에서 궁성까지, 쇄환 청원을 묻은 조선 관리들의 장계가 이어진다.',
        ally: '조선 수문장', allyLine: '왜의 배를 탄 자가 어찌 귀향민이라 할 수 있느냐.',
        heroLine: '버린 나라에는 귀향민이 아니라 증인으로 돌아왔다. 닫힌 장부부터 열겠다.',
      },
      {
        title: '제5막 · 망향의 나라', firstChapter: 17, lastChapter: 24,
        historicalFrame: '복수의 끝에서 원혼을 품을지 풀어 보낼지, 생존자가 돌아갈 세 번째 고향을 정한다.',
        ally: '쇄환선 아이', allyLine: '조선도 일본도 우리 집이 아니라면, 우리는 어디로 돌아가야 합니까?',
        heroLine: '복수는 죽은 자를 돌려주지 못한다. 산 자가 돌아갈 이름과 터전을 세운다.',
      },
    ],
  },
  'gwanghae-prince': {
    campaignTitle: '왕세자 광해의 분조국정록',
    hero: '왕세자 광해',
    originTruth: '역사축 · 선조의 몽진 뒤 광해가 분조를 이끌고 관군·군량·의병을 수습한 사실에서 출발한다.',
    acts: [
      {
        title: '제1막 · 왕세자의 분조', firstChapter: 1, lastChapter: 1,
        historicalFrame: '떠나는 어가가 군사와 군량 없는 분조의 책임을 왕세자에게 남긴다.',
        ally: '승정원 주서', allyLine: '전하를 호위할 금군은 떠났습니다. 분조는 사람과 장계를 직접 모아야 합니다.',
        heroLine: '군사도 군량도 없으나 조정은 백성 곁에 남겠다.',
      },
      {
        title: '제2막 · 일곱 고을의 장계', firstChapter: 2, lastChapter: 7,
        historicalFrame: '송도의 군량, 도성의 구휼, 수원의 둔전과 영남 의병이 하나의 분조 장계로 모인다.',
        ally: '분조 군량관', allyLine: '군량을 먼저 모으면 병사는 살지만 굶주린 백성이 떠납니다. 둘 다 지킬 명이 필요합니다.',
        heroLine: '일곱 고을의 이름이 모이면 분조는 이름뿐인 조정이 아니게 된다.',
      },
      {
        title: '제3막 · 평양의 분조', firstChapter: 8, lastChapter: 9,
        historicalFrame: '어가가 물러난 평양에서 남은 관군과 백성이 대동문을 지킬 조정을 다시 세운다.',
        ally: '평양 분조 군관', allyLine: '어가는 떠났어도 성 안의 백성은 남았습니다. 이 문을 버리면 장계도 거짓이 됩니다.',
        heroLine: '대동문을 지키는 자가 오늘의 조정이다. 내가 성 안에 남겠다.',
      },
      {
        title: '제4막 · 왕좌인가 왕명인가', firstChapter: 10, lastChapter: 10,
        historicalFrame: '일곱 고을의 군세 앞에서 선조의 책임을 물을지 의병을 해산할지 선택한다.',
        ally: '삼남 의병장', allyLine: '저하의 군대가 백성을 위한 것인지 왕좌를 위한 것인지 오늘 드러날 것입니다.',
        heroLine: '왕명이 버린 백성의 책임을 묻겠다. 어느 길이든 내 이름으로 감당한다.',
      },
      {
        title: '제5막 · 내 이름으로 감당할 명', firstChapter: 11, lastChapter: 11,
        historicalFrame: '쿠데타와 진압 가운데 택한 명령이 백성·의병·왕실에 남긴 결과를 끝까지 감당한다.',
        ally: '분조 서리', allyLine: '승리한 장계에는 죽은 사람의 이름이 빠지기 쉽습니다. 마지막 줄까지 직접 쓰십시오.',
        heroLine: '오늘 흘린 피를 왕명 뒤에 숨기지 않는다. 마지막 장계는 내 이름으로 쓴다.',
      },
    ],
  },
};

const PIVOT_CHOICES: Partial<Record<`${PlayerOrigin}:${number}`, readonly StoryChoice[]>> = {
  'kim-donghyeok:5': [
    { id: 'publish-ledger', label: '밀약 장부를 백성에게 공개한다', detail: '생존자의 증언으로 봉기의 정당성을 세운다.', consequence: '민심과 증언을 택함' },
    { id: 'burn-ledger', label: '장부를 불태우고 관아를 점거한다', detail: '두려움을 무기로 즉시 전열을 강화한다.', consequence: '공포와 전투력을 택함' },
  ],
  'kim-donghyeok:17': [
    { id: 'new-power', label: '대동군이 새 권력이 된다', detail: '무너진 조정을 대신해 중앙의 책임을 떠맡는다.', consequence: '대동 정권의 길' },
    { id: 'local-councils', label: '각 고을 자치군으로 돌아간다', detail: '권력을 나누고 백성이 성과 곡식을 직접 지킨다.', consequence: '고을 자치의 길' },
  ],
  'frontier-archer:7': [
    { id: 'force-submission', label: '세 부족의 복속을 요구한다', detail: '즉시 강한 군세를 만들지만 충성은 칼끝에 달린다.', consequence: '복속과 속전을 택함' },
    { id: 'winter-oath', label: '겨울 양식과 방위를 함께 맹세한다', detail: '느리지만 회복 가능한 동등한 연맹을 세운다.', consequence: '공동 방위의 맹약' },
  ],
  'frontier-archer:15': [
    { id: 'conquer-joseon', label: '조선 정복을 선포한다', detail: '왕실의 성과 관아를 새 연맹의 영토로 삼는다.', consequence: '남하 정복의 깃발' },
    { id: 'yalu-confederation', label: '압록 공동연맹을 세운다', detail: '조선 북방과 세 부족이 함께 지키는 경계를 제안한다.', consequence: '압록 공동연맹의 깃발' },
  ],
  'osaka-mudang:5': [
    { id: 'mixed-repatriation-corps', label: '항왜와 일본 징발민도 받아들인다', detail: '피로인·항왜·징발민이 함께 쇄환선을 지킨다.', consequence: '혼성 쇄환대를 택함' },
    { id: 'spirits-only', label: '원혼만 거느리고 바다로 나간다', detail: '산 자의 군세를 줄이고 강한 원혼술을 택한다.', consequence: '원혼 선단을 택함' },
  ],
  'osaka-mudang:16': [
    { id: 'open-refuge-road', label: '조선 백성에게 피난길을 연다', detail: '관아의 죄와 굶주린 백성을 가려 심판한다.', consequence: '문책과 진혼의 길' },
    { id: 'curse-the-court', label: '관아와 왕실까지 저주한다', detail: '버린 나라 전체가 원혼의 빚을 치르게 한다.', consequence: '끝없는 복수의 길' },
  ],
  'osaka-mudang:24': [
    { id: 'release-spirits', label: '원혼의 이름을 읽고 풀어 보낸다', detail: '생존자가 살아갈 쇄환촌과 새 명부를 만든다.', consequence: '쇄환과 진혼의 결말' },
    { id: 'carry-spirits', label: '원혼을 몸에 받아 복수를 잇는다', detail: '끝나지 않은 장부를 들고 다시 전장으로 향한다.', consequence: '원혼 복수의 결말' },
  ],
};

const PLAYER_ORIGINS = new Set<PlayerOrigin>([
  'kim-donghyeok', 'frontier-archer', 'osaka-mudang', 'gwanghae-prince',
]);

const safeText = (value: unknown, maximum = 180): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, maximum);
  return text || null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const uniqueStrings = (value: unknown, maximum: number): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((entry): string[] => {
    const text = safeText(entry, 96);
    return text ? [text] : [];
  }))].slice(0, maximum);
};

export const createStoryCampaignState = (origin: PlayerOrigin): StoryCampaignState => ({
  version: 1,
  origin,
  seenBeatIds: [],
  memories: [],
  choices: [],
});

export const normalizeStoryCampaignState = (
  value: unknown,
  expectedOrigin: PlayerOrigin,
): StoryCampaignState => {
  const raw = asRecord(value);
  if (!raw || raw.version !== 1 || raw.origin !== expectedOrigin || !PLAYER_ORIGINS.has(raw.origin as PlayerOrigin)) {
    return createStoryCampaignState(expectedOrigin);
  }
  const seenBeatIds = uniqueStrings(raw.seenBeatIds, 96);
  const memories = Array.isArray(raw.memories) ? raw.memories.flatMap((entry): StoryMemory[] => {
    const memory = asRecord(entry);
    const beatId = safeText(memory?.beatId, 96);
    const title = safeText(memory?.title, 120);
    const summary = safeText(memory?.summary, 240);
    if (!beatId || !title || !summary) return [];
    const chapter = typeof memory?.chapter === 'number' && Number.isFinite(memory.chapter)
      ? Math.max(1, Math.min(24, Math.floor(memory.chapter))) : 1;
    const act = typeof memory?.act === 'number' && Number.isFinite(memory.act)
      ? Math.max(1, Math.min(5, Math.floor(memory.act))) : 1;
    return [{ beatId, chapter, act, title, summary }];
  }).slice(0, 96) : [];
  const choices = Array.isArray(raw.choices) ? raw.choices.flatMap((entry): StoryChoiceRecord[] => {
    const choice = asRecord(entry);
    const beatId = safeText(choice?.beatId, 96);
    const choiceId = safeText(choice?.choiceId, 64);
    const label = safeText(choice?.label, 120);
    const consequence = safeText(choice?.consequence, 160);
    return beatId && choiceId && label && consequence
      ? [{ beatId, choiceId, label, consequence }]
      : [];
  }).slice(0, 48) : [];
  return {
    version: 1,
    origin: expectedOrigin,
    seenBeatIds: [...new Set([...seenBeatIds, ...memories.map((memory) => memory.beatId)])].slice(0, 96),
    memories,
    choices,
  };
};

const actForChapter = (voice: StoryVoice, chapter: number): { act: StoryAct; index: number } => {
  const index = Math.max(0, voice.acts.findIndex((act) => chapter >= act.firstChapter && chapter <= act.lastChapter));
  return { act: voice.acts[index] ?? voice.acts[voice.acts.length - 1], index };
};

const beatSlug = (title: string): string => title
  .normalize('NFKC')
  .replace(/\s+/g, '-')
  .replace(/[^\p{L}\p{N}-]/gu, '')
  .slice(0, 48) || 'entry';

export const createStoryBeat = (
  origin: PlayerOrigin,
  progress: StoryChapterSignal,
  regionName: string,
): StoryBeat => {
  const voice = STORY_VOICES[origin];
  const chapter = Math.max(1, Math.floor(progress.chapter));
  const { act, index } = actForChapter(voice, chapter);
  const title = progress.title.trim() || `${voice.campaignTitle} 제${chapter}장`;
  const location = regionName.trim() || '이름 없는 전장';
  return {
    id: `${origin}:${chapter}:${beatSlug(title)}`,
    origin,
    chapter,
    act: index + 1,
    actTitle: act.title,
    campaignTitle: voice.campaignTitle,
    title,
    location,
    objective: progress.objective,
    historicalFrame: voice.originTruth,
    lines: [
      { speaker: '아스라 실록', text: `${location}. ${act.historicalFrame}`, tone: 'narrator' },
      { speaker: act.ally, text: act.allyLine, tone: 'ally' },
      { speaker: voice.hero, text: act.heroLine, tone: 'hero' },
      { speaker: '이번 장의 목표', text: progress.objective, tone: 'objective' },
    ],
    choices: PIVOT_CHOICES[`${origin}:${chapter}`] ?? [],
  };
};

export const hasSeenStoryBeat = (state: StoryCampaignState, beatId: string): boolean => (
  state.seenBeatIds.includes(beatId)
);

export const completeStoryBeat = (
  state: StoryCampaignState,
  beat: StoryBeat,
  selectedChoice?: StoryChoice,
): StoryCampaignState => {
  const normalized = normalizeStoryCampaignState(state, beat.origin);
  const alreadySeen = normalized.seenBeatIds.includes(beat.id);
  const memory: StoryMemory = {
    beatId: beat.id,
    chapter: beat.chapter,
    act: beat.act,
    title: beat.title,
    summary: beat.lines.find((line) => line.tone === 'hero')?.text ?? beat.objective,
  };
  const nextMemories = alreadySeen
    ? normalized.memories
    : [...normalized.memories, memory].slice(-96);
  const nextChoices = selectedChoice && !normalized.choices.some((choice) => choice.beatId === beat.id)
    ? [...normalized.choices, {
      beatId: beat.id,
      choiceId: selectedChoice.id,
      label: selectedChoice.label,
      consequence: selectedChoice.consequence,
    }].slice(-48)
    : normalized.choices;
  return {
    version: 1,
    origin: beat.origin,
    seenBeatIds: alreadySeen
      ? normalized.seenBeatIds
      : [...normalized.seenBeatIds, beat.id].slice(-96),
    memories: nextMemories,
    choices: nextChoices,
  };
};

export const latestStoryChoice = (state: StoryCampaignState): StoryChoiceRecord | null => (
  state.choices[state.choices.length - 1] ?? null
);
