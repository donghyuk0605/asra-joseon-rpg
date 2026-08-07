import { ITEM_CATALOG, ITEM_SET, ITEM_SLOT_LABEL, SLOT_LABEL } from '../items/catalog';
import type { ItemDefinition } from '../items/catalog';
import type {
  ActiveWorldEvent, CraftRecipeId, EquipmentSlot, EquipmentState, FollowerKind, FollowerState, GameEvent,
  InventoryItem, ItemSlot, MonsterAiState, MonsterKind, MonsterState, PlayerOrigin, PlayerState, ShopOfferId, SkillId,
} from '../simulation/types';
import { ASSETS } from '../assets/manifest';
import { resolvePlayerLayers } from '../phaser/playerVisualMode';
import { REGIONS, type RegionId } from '../world/regions';
import { isJapanRegion, JAPAN_STAGE_COPY } from '../world/japanCampaign';
import { JURCHEN_EXPANSION_REGION_IDS, JURCHEN_STAGE_COPY } from '../world/jurchenCampaign';
import { isUlleungRegion } from '../world/ulleungContinuity';
import type { BossState } from '../bosses/types';
import type { GameSettings, GraphicsQuality, UiScale } from '../settings/GameSettings';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from '../world/layout';
import { frontierSectorAt } from '../world/frontier';
import { isJoseonTownRegion, JOSEON_TOWN_LAYOUTS } from '../world/joseonTowns';
import {
  ACTIVE_SKILL_IDS,
  ARCHER_ACTIVE_SKILL_IDS,
  MANUAL_SKILL_BY_ITEM,
  SHAMAN_ACTIVE_SKILL_IDS,
  SKILL_CATALOG,
  SKILL_TREE_META,
  SWORD_ACTIVE_SKILL_IDS,
  skillPrerequisiteLabel,
  unmetSkillPrerequisite,
} from '../skills/catalog';
import { FOLLOWER_CATALOG } from '../followers/catalog';
import {
  TRAVEL_ATLAS_GROUPS,
  TRAVEL_ATLAS_REGION_IDS,
  WORLD_MAP_NODES,
  WORLD_MAP_ROUTES,
  worldMapItinerary,
  worldMapNodeKind,
  worldMapNodeForRegion,
  worldMapRouteGeometry,
  type WorldMapTravelResult,
} from '../world/worldMap';
import type { FactionWarSnapshot } from '../world/factionWar';
import type { StoryCampaignState } from '../story/StoryCampaign';
import {
  ATTRIBUTE_IDS,
  ATTRIBUTE_LABELS,
  type AttributeId,
  type AttributeValues,
  type DerivedAttributeBonuses,
} from '../progression/attributes';

type InventoryFilter = 'all' | ItemSlot;
type InventorySort = 'recent' | 'type';
type InventoryMobileTab = 'equipment' | 'bag' | 'stats';
type WorldMapSidebarTab = 'settlements' | 'war';
export type VillageService = 'market' | 'forge' | 'inn';

export type QuestProgress = {
  label: string;
  ratio: number;
};

export type StoryProgress = {
  chapter: number;
  title: string;
  objective: string;
  completed: number;
};

const MONSTER_ROLE_LABELS: Record<MonsterKind, string> = {
  'osaka-overseer': '오사카 포로촌 · 감시역',
  'osaka-ronin': '오사카 출병항 · 낭인',
  'osaka-gunner': '오사카 선단 · 조총 훈련병',
  'ulleung-hare': '동물 · 겁 많은 산토끼',
  'ulleung-water-deer': '동물 · 온순한 물사슴',
  'ulleung-sangun': '맹수 · 산군',
  'ulleung-guard': '관군 · 환도 포졸',
  'ulleung-veteran': '관군 · 장창 포졸',
  'ulleung-archer': '관군 · 관아 궁수',
  'ulleung-executioner': '관군 · 형방 집행관',
  'ulleung-captain': '관군 · 포도대장',
  'ulleung-magistrate': '관아 수뇌 · 탐관오리',
  'wako-raider': '왜구 선봉 · 왜도 돌격대',
  'wako-archer': '왜구 후열 · 화살잡이',
  'wako-captain': '왜구 선단 · 침공 대장',
  'yeongwol-swordsman': '영월 관군 · 환도수',
  'yeongwol-spearman': '영월 관군 · 장창 돌격대',
  'yeongwol-archer': '영월 관군 · 원거리 궁수',
  'yeongwol-shield': '영월 관군 · 방패 전열',
  'yeongwol-commander': '영월 관군 · 포도대장',
  'jeonju-swordsman': '전주 감영군 · 환도수',
  'jeonju-spearman': '전주 감영군 · 장창 군관',
  'jeonju-archer': '풍남문 수성군 · 궁수',
  'jeonju-shield': '전주 감영군 · 중갑 방패군',
  'jeonju-commander': '전라 감영 · 포도대장',
  'jeonju-militia-sickle': '삼남 의병 · 낫군',
  'japanese-swordsman': '왜군 전열 · 노다치 돌격대',
  'japanese-spearman': '왜군 전열 · 장창 아시가루',
  'japanese-archer': '왜군 후열 · 유미 궁수',
  'japanese-gunner': '왜군 화력대 · 조총수',
  'japanese-general': '왜군 지휘부 · 선봉장',
  'japanese-sika-deer': '일본 산짐승 · 꽃사슴',
  'japanese-wild-boar': '일본 산짐승 · 큰멧돼지',
  'japanese-shogun': '태합 휘하 · 검은 부채의 군선봉행',
  'manchu-lancer': '여진 선봉 · 철갑 장창수',
  'manchu-archer': '여진 후열 · 각궁수',
  'manchu-cavalry': '여진 돌격대 · 철기병',
  'manchu-captain': '여진 지휘부 · 선봉장',
  'manchu-chieftain': '여진 대족장 · 아이신고로 바투르',
  'joseon-border-swordsman': '조선 국경군 · 환도 전열',
  'joseon-border-spearman': '조선 국경군 · 장창 중군',
  'joseon-border-archer': '조선 진보군 · 후열 궁수',
  'joseon-border-commander': '조선 국경 지휘부 · 첨절제사',
  'royal-guard': '왕실 금군 · 내금위',
  'joseon-prince': '조선 왕실 · 북문을 지키는 왕자',
  'joseon-civilian': '조선 백성 · 피난민',
  'korean-gray-wolf': '북방 맹수 · 회색 산늑대',
  dokkaebi: '괴이 · 도깨비',
  boar: '야수 · 돌진 멧돼지',
  bandit: '인간 · 복면 탈영병',
  'bamboo-spirit': '괴이 · 죽림귀',
  'mine-golem': '괴이 · 광산귀',
  'moon-revenant': '원귀 · 달빛 망령',
  'wonju-bear': '치악산 산령 · 쇠사슬 큰곰',
  'gangneung-haetae': '경포 수호귀 · 청자 해태',
  'haeju-crane': '해주 염전귀 · 백학 원귀',
  'geoje-sea-wraith': '견내량 원귀 · 닻사슬 해무귀',
  'episode2-red-fox': '생태 · 겁 많은 붉은여우령',
  'episode2-mountain-leopard': '맹수 · 산악 매복 포식자',
  'episode2-marsh-wisp': '원귀 · 원거리 갯등불귀',
  'episode2-stone-dokkaebi': '괴이 · 중갑 석장 도깨비',
};

export const monsterRoleLabel = (kind: MonsterKind): string => MONSTER_ROLE_LABELS[kind];

export const isCampaignBossMonster = (kind: MonsterKind): boolean => kind === 'japanese-shogun';

export const campaignBossPhase = (target: Pick<MonsterState, 'kind' | 'hp' | 'maxHp'>): 1 | 2 => (
  isCampaignBossMonster(target.kind) && target.hp <= target.maxHp * 0.5 ? 2 : 1
);

export const monsterIntentLabel = (kind: MonsterKind, state: MonsterAiState): string => {
  const timid = kind === 'ulleung-hare' || kind === 'ulleung-water-deer' || kind === 'japanese-sika-deer'
    || kind === 'haeju-crane' || kind === 'episode2-red-fox';
  if (timid) {
    return ({
      patrol: '풀을 뜯으며 주변을 살피는 중',
      sleep: '경계를 풀고 꾸벅꾸벅 조는 중',
      alert: '사람을 발견하고 몸을 낮춤',
      chase: '겁에 질려 달아나는 중',
      circle: '도망갈 틈을 찾는 중',
      brace: '궁지에 몰려 방어하는 중',
      rally: '무리를 찾는 중',
      telegraph: '⚠ 뒷발질 준비 — 거리를 두어라',
      charge: '필사적으로 돌파하는 중',
      attack: '⚠ 궁지에 몰린 반격',
      flee: '겁에 질려 남쪽으로 달아나는 중',
      return: '서식지로 돌아가는 중',
      stunned: '놀라 움직이지 못하는 중',
    } satisfies Record<MonsterAiState, string>)[state];
  }
  if (kind === 'ulleung-sangun') {
    return ({
      patrol: '영역을 낮게 순찰하는 중',
      sleep: '잠시 몸을 웅크리고 쉬는 중',
      alert: '먹잇감을 포착함',
      chase: '소리 없이 거리를 좁히는 중',
      circle: '사각으로 파고드는 중',
      brace: '앞발을 세우고 반격을 노림',
      rally: '포효하며 위협하는 중',
      telegraph: '⚠ 도약 준비 — 측면으로 피하라',
      charge: '⚠ 산군이 덮쳐 온다',
      attack: '⚠ 발톱 타격 임박',
      flee: '상처를 입고 굴로 달아나는 중',
      return: '영역으로 물러나는 중',
      stunned: '균형을 잃음 — 반격 기회',
    } satisfies Record<MonsterAiState, string>)[state];
  }
  return ({
    patrol: '주변을 순찰하는 중',
    sleep: '경계를 풀고 졸고 있음 — 기습 기회',
    alert: '침입자를 발견함',
    chase: '거리를 좁히는 중',
    circle: '측면을 노리는 중',
    brace: '⚠ 방어 자세 — 반격을 준비함',
    rally: '⚠ 대장이 주변 병력을 집결시킴',
    telegraph: '⚠ 돌진 준비 — 즉시 피하라',
    charge: '⚠ 맹렬한 돌진',
    attack: '⚠ 타격 임박 — 거리를 벌려라',
    flee: '전의를 잃고 전장에서 패주하는 중',
    return: '영역으로 복귀 중',
    stunned: '공격에 경직됨 — 반격 기회',
  } satisfies Record<MonsterAiState, string>)[state];
};

const INVENTORY_FILTERS: Array<{ id: InventoryFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'weapon', label: '무기' },
  { id: 'armor', label: '복장' },
  { id: 'charm', label: '부적' },
  { id: 'scroll', label: '주문서' },
  { id: 'material', label: '재료' },
];

const SLOT_ORDER: Record<ItemSlot, number> = { weapon: 0, armor: 1, charm: 2, scroll: 3, material: 4 };
const ELEMENT_LABEL = {
  fire: { name: '화염', glyph: '火' },
  ice: { name: '빙결', glyph: '氷' },
  lightning: { name: '뇌전', glyph: '雷' },
  poison: { name: '맹독', glyph: '毒' },
  wind: { name: '질풍', glyph: '風' },
  earth: { name: '지맥', glyph: '地' },
  shadow: { name: '암영', glyph: '影' },
} as const;

type CharacterStoryProfile = Readonly<{
  journalTitle: string;
  epithet: string;
  faction: string;
  homeland: string;
  era: string;
  premise: string;
  creed: string;
  wound: string;
  adversary: string;
  allies: string;
  dilemma: string;
  ending: string;
  themes: readonly string[];
  acts: readonly Readonly<{
    title: string;
    chapters: string;
    premise: string;
    turningPoint: string;
  }>[];
}>;

const CHARACTER_STORY_PROFILES: Record<PlayerOrigin, CharacterStoryProfile> = {
  'kim-donghyeok': {
    journalTitle: '김동혁의 대동복수록',
    epithet: '감옥에서 일어난 대동의 칼',
    faction: '조선 대동 농민군',
    homeland: '울릉 관청 감옥 · 약탈당한 섬마을',
    era: '아스라 세계선 · 왜란과 북방 전란이 겹친 가상 조선',
    premise: '형의 죽음으로 시작한 복수를 백성이 스스로 관아와 나라를 되찾는 전쟁으로 바꾼다.',
    creed: '사람 위에 신분 없고, 빼앗긴 것은 함께 되찾는다.',
    wound: '백성을 위해 탄원한 형을 눈앞에서 잃고 아무것도 지키지 못했다.',
    adversary: '탐관오리 서병관, 수탈을 묵인한 조정, 그 틈을 파고든 왜구',
    allies: '해방된 죄수 · 울릉 백성 · 대동계 농민군 · 관군 이탈자',
    dilemma: '형의 원수를 베는 데 머물 것인가, 원수를 만든 나라의 질서를 바꿀 것인가.',
    ending: '왕기를 내린 뒤 대동군을 새 권력으로 만들지 백성 자치군으로 돌려보낸다.',
    themes: ['복수에서 혁명으로', '민심', '해방 관아', '대동'],
    acts: [
      { title: '제1막 · 감옥의 밤', chapters: '1–2장', premise: '형의 죽음과 수탈 명령을 가슴에 새기고 탈옥한다.', turningPoint: '원수의 피보다 살아남은 백성을 먼저 보라는 유언을 받는다.' },
      { title: '제2막 · 섬의 사람들', chapters: '3장', premise: '굶주린 섬사람과 피난민을 살려 첫 동료를 얻는다.', turningPoint: '개인의 복수를 백성이 살아남는 봉기로 바꾼다.' },
      { title: '제3막 · 검은 돛', chapters: '4–5장', premise: '서병관의 세곡 장부와 왜구 선단의 밀약을 밝힌다.', turningPoint: '밀약 장부를 공개할지 불태울지 결정한다.' },
      { title: '제4막 · 대동 봉기', chapters: '6–8장', premise: '본토 관아와 왜군 보급망을 끊어 대동군을 세운다.', turningPoint: '빼앗은 성을 백성의 근거지로 돌린다.' },
      { title: '제5막 · 왕 앞의 장부', chapters: '9–17장', premise: '북방 전란과 왕도까지 수탈의 책임을 추적한다.', turningPoint: '복수 뒤 새 권력과 고을 자치 중 남길 질서를 정한다.' },
    ],
  },
  'frontier-archer': {
    journalTitle: '하진의 남하연맹록',
    epithet: '두 혈통 사이에서 태어난 북방 신궁',
    faction: '여진 부족연맹',
    homeland: '압록 이북 패잔병 본영 · 장백산 세 부족',
    era: '아스라 세계선 · 조선 국경과 여진 부족권의 대전쟁',
    premise: '조선에 버림받은 사생아가 세 부족과 천 명의 군세를 모아 자신을 부정한 왕도로 남하한다.',
    creed: '피가 아니라 함께 겨울을 견딘 맹약이 나라를 만든다.',
    wound: '조선과 여진 어느 쪽에도 받아들여지지 못한 채 압록 전투에서 군세를 잃었다.',
    adversary: '하진을 소모품으로 버린 조선 국경 지휘부와 혈통만 앞세우는 부족장',
    allies: '백산 각궁대 · 송화 기마대 · 흑수 장창대 · 패잔병 선봉장',
    dilemma: '조선을 무너뜨리는 정복자가 될 것인가, 두 세계가 살아남는 새 연맹을 세울 것인가.',
    ending: '도망친 왕의 마지막 방어선을 꺾고 천 명의 군세가 따를 새 깃발을 정한다.',
    themes: ['혈통과 선택', '부족 맹약', '천 명의 군세', '남하'],
    acts: [
      { title: '제1막 · 압록의 패전', chapters: '1장', premise: '버림받은 패잔병의 이름과 살아남은 수를 다시 센다.', turningPoint: '패배를 숨기지 않고 장백산으로 돌아간다.' },
      { title: '제2막 · 세 부족의 겨울', chapters: '2–7장', premise: '백산·송화·흑수의 식량과 방위를 함께 해결한다.', turningPoint: '복속 또는 공동 방위의 회맹을 선택한다.' },
      { title: '제3막 · 압록 설욕전', chapters: '8장', premise: '하진을 미끼로 버린 조선 국경군 군보를 찾는다.', turningPoint: '백성과 명령자를 가려 화살을 돌린다.' },
      { title: '제4막 · 검은 깃발', chapters: '9–11장', premise: '평양 성문마다 버려진 전령과 징발민의 증언을 모은다.', turningPoint: '대동관에 세 부족의 깃발을 함께 세운다.' },
      { title: '제5막 · 새 깃발', chapters: '12–15장', premise: '조선 왕실과 자신의 출생, 연맹의 미래를 마주한다.', turningPoint: '남하 정복과 압록 공동연맹 중 하나를 선언한다.' },
    ],
  },
  'osaka-mudang': {
    journalTitle: '연화의 망향원혼록',
    epithet: '이름 잃은 피로인들의 망향 무당',
    faction: '피로인 쇄환선단',
    homeland: '조선에서 끌려온 피로인 · 오사카 포로촌 억류',
    era: '아스라 세계선 · 일본 출병항에서 조선 왕도까지 이어진 포로의 길',
    premise: '왜란 때 오사카로 끌려온 조선인 피로인 무당이 지워진 이름과 원혼을 모아, 포로 수송에 가담하고 쇄환 청원을 묻은 양국 권력자를 추적한다.',
    creed: '기록되지 않은 죽음도 이름을 불러 주면 증언이 된다.',
    wound: '쇄환을 청한 장계는 묻혔고 타향에서는 이름과 가족을 빼앗겼다.',
    adversary: '오사카 군선봉행·다이묘·쇄환 청원을 묻은 조선 관리와 연화를 삼키려는 원귀',
    allies: '피로인 생존자 · 일본인 징발 피해자 · 항왜 · 전쟁 고아',
    dilemma: '원혼의 힘으로 두 나라를 태울 것인가, 산 자가 돌아갈 망향의 터전을 만들 것인가.',
    ending: '두 나라 장부에서 지워진 이름을 되찾고 원혼과 생존자가 머물 세 번째 고향을 세운다.',
    themes: ['망향', '진혼과 복수', '포로의 이름', '두 고향'],
    acts: [
      { title: '제1막 · 타향의 초혼', chapters: '1장', premise: '오사카 포로촌에서 장부에서 지워진 이름을 부른다.', turningPoint: '원혼을 증인으로 세우고 산 자의 탈출문을 연다.' },
      { title: '제2막 · 검은 부채', chapters: '2–5장', premise: '피로인과 일본 징발민을 싣는 출병 명령을 추적한다.', turningPoint: '군선봉행을 꺾고 혼성 쇄환대 또는 원혼 선단을 택한다.' },
      { title: '제3막 · 피로인의 바닷길', chapters: '6–11장', premise: '사카이·아와지·이키·대마도의 포로 수송로를 거꾸로 끊는다.', turningPoint: '출병선에 쇄환 깃발을 올려 부산으로 향한다.' },
      { title: '제4막 · 귀향 아닌 문책', chapters: '12–16장', premise: '쇄환 청원을 묻은 조선 관리의 장계를 찾아 왕도로 간다.', turningPoint: '백성의 피난길과 왕실을 향한 저주 중 하나를 고른다.' },
      { title: '제5막 · 망향의 나라', chapters: '17–24장', premise: '양국 장부 밖에 남은 생존자의 세 번째 고향을 찾는다.', turningPoint: '원혼을 풀어 보낼지 품고 복수를 이을지 결정한다.' },
    ],
  },
  'gwanghae-prince': {
    journalTitle: '왕세자 광해의 분조국정록',
    epithet: '도망친 조정 대신 전장에 남은 세자',
    faction: '왕세자 분조군',
    homeland: '창덕궁 분조청 · 선조의 몽진 뒤에 남은 도성',
    era: '선조 재위 전란기 · 왕세자 분조를 확장한 가상 역사',
    premise: '백성을 버리고 달아난 부왕 대신 일곱 고을의 군량과 의병을 모아 살아 있는 조정을 다시 세운다.',
    creed: '왕좌가 아니라 백성 곁에 남은 조정이 나라를 증명한다.',
    wound: '왕세자로 세워졌지만 부왕에게 의심받고 군사도 군량도 없이 전란의 책임만 떠맡았다.',
    adversary: '책임을 피하는 선조와 왕명을 사유화한 대신, 조선을 침탈하는 외적',
    allies: '승정원 주서 · 송상 객주 · 혜민서 의원 · 삼남 의병장 · 분조 관군',
    dilemma: '백성을 버린 왕을 몰아낼 것인가, 왕명을 지켜 의병을 해산할 것인가.',
    ending: '쿠데타라면 선조의 퇴로를 봉쇄해 책임을 묻고, 진압이라면 떠난 민심의 대가를 감당한다.',
    themes: ['책임과 정통성', '분조', '의병', '왕좌와 왕명'],
    acts: [
      { title: '제1막 · 왕세자의 분조', chapters: '1장', premise: '몽진한 선조가 군사와 군량 없는 분조를 남긴다.', turningPoint: '광해가 백성 곁에 남는 조정을 선언한다.' },
      { title: '제2막 · 일곱 고을', chapters: '2–7장', premise: '군량·구휼·둔전·수운·의병 명부를 한 장계로 묶는다.', turningPoint: '왕명이 아닌 현장의 민심으로 분조를 완성한다.' },
      { title: '제3막 · 평양의 분조', chapters: '8–9장', premise: '어가가 버린 평양에서 관군과 백성을 다시 세운다.', turningPoint: '왕세자가 대동문 안에 남아 직접 전선을 지킨다.' },
      { title: '제4막 · 왕좌인가 왕명인가', chapters: '10장', premise: '일곱 고을의 군세로 선조의 책임을 물을지 의병을 해산할지 정한다.', turningPoint: '쿠데타와 진압 중 되돌릴 수 없는 명을 내린다.' },
      { title: '제5막 · 내 이름의 장계', chapters: '11장', premise: '선택으로 흘린 피를 왕명 뒤에 숨기지 않고 기록한다.', turningPoint: '마지막 장계에 죽은 자와 책임자의 이름을 함께 남긴다.' },
    ],
  },
};

const FRONTIER_STORY_CHAPTERS = [
  ['압록의 패전', '첫 남하에서 군세를 잃고 장백산으로 물러나 흩어진 부족을 모으기로 맹세하다'],
  ['장백의 겨울사냥', '굶주린 패잔병을 먹이기 위해 자작나무 숲의 짐승을 사냥하다'],
  ['백산부의 맹약', '백산부 전사들의 활과 창 시험을 넘어 첫 부족의 깃발을 얻다'],
  ['송화강의 사슴벌', '얼어붙은 강변 사냥터를 정리해 송화부의 겨울 식량을 확보하다'],
  ['송화부의 기마시험', '강변촌 족장과 전사들을 굴복시키지 않고 힘으로 동맹을 증명하다'],
  ['흑송령 산짐승', '마지막 부족으로 가는 고개에서 산군과 멧돼지 떼를 물리치다'],
  ['흑수부 대회맹', '세 부족의 족장 앞에서 회맹을 완성하고 하나의 여진군을 세우다'],
  ['압록 설욕전', '패배했던 얼음 나루로 돌아가 통합 여진군과 조선 국경 방어진을 돌파하다'],
  ['평양 외성의 서리', '외성 목책과 조선 수비 전열을 무너뜨려 대동문 공성로를 열다'],
  ['대동문의 불화살', '대동강 안개 속 성루 궁수대를 제압하고 대동문을 돌파하다'],
  ['대동관의 검은 깃발', '평양 내성의 세 전열과 지휘부를 꺾어 한성 북로를 열다'],
  ['궁궐 북문', '내금위의 방어진을 뚫고 하진을 버린 조선 왕실의 심장으로 진입하다'],
  ['품계석의 화살', '근정전 뜰에서 신분과 혈통으로 사람을 가른 조정에 활을 겨누다'],
  ['갈라지는 어가', '왕의 마지막 피난로를 뒤쫓아 산성과 바다 중 최종 전장을 선택하다'],
  ['새 깃발', '복수만을 좇던 패잔병이 통합한 부족들의 미래와 새로운 나라를 결정하다'],
] as const;

const KIM_STORY_CHAPTERS = [
  ['피로 쓴 상소', '백성을 위해 나선 형의 죽음과 김동혁의 투옥'],
  ['감옥의 밤', '처형을 명한 포졸을 물리치고 울릉 관청 감옥 북문으로 탈출'],
  ['섬의 사람들', '피난민을 돕고 사냥과 해송 수련으로 낡은 환도를 손에 넣다'],
  ['탐관오리의 관아', '형벌 마당을 돌파해 서병관과 왜구 밀약 장부를 찾아내다'],
  ['검은 돛의 침공', '왜구 선단을 막고 죄수와 백성이 지키는 해방 관아를 세우다'],
  ['본토의 그림자', '달빛고을에서 대동계를 복원하고 수탈의 배후를 추적하다'],
  ['부산진의 검은 바다', '왜군 보급로를 끊고 조총 연기 속 부산진을 되찾다'],
  ['탄금대의 배수진', '패잔병과 농민군을 한 전열로 묶어 남한강 포위망을 돌파하다'],
  ['닫힌 광화문', '지방의 피를 외면한 조정에 밀약 장부를 내밀기 위해 궁성으로 향하다'],
  ['품계석의 칼바람', '신분보다 생명을 앞세우는 대동의 뜻을 근정전 뜰에 선포하다'],
  ['왕 앞의 증좌', '서병관의 거래와 울릉 백성의 증언을 왕 앞에 올리다'],
  ['압록의 눈보라', '북방 군보를 따라 압록으로 가서 남하하는 선봉과 결전하다'],
  ['평양 외성의 서리', '관군과 농민군이 함께 싸울 외성 통로를 되찾다'],
  ['대동문 공성전', '대동강을 건너는 적을 막고 성루와 문 안쪽 수비선을 돌파하다'],
  ['평양 내성 결전', '대동관 지휘부에서 전쟁을 사유화한 대신들의 명부를 확보하다'],
  ['갈라지는 어가', '도망치는 왕과 굶주린 도성 사이에서 대동군의 우선순위를 정하다'],
  ['백성이 주인인 나라', '남한산성 또는 강화도의 세 겹 최종 방어선을 돌파하고 복수 이후의 질서를 선택하다'],
] as const;

const MUDANG_STORY_CHAPTERS = [
  ['타향의 초혼', '오사카 포로촌에서 이름을 빼앗긴 조선인 원혼과 첫 굿을 열다'],
  ['징발당한 산촌', '셋쓰 산촌 백성을 끌고 가는 낭인 징발대와 조총 감시병을 제압하다'],
  ['덴노산의 짐승과 화살', '야마자키 사냥숲의 야수와 매복 궁수대를 뚫고 성로를 찾다'],
  ['성 아래의 군화', '오사카 성하마을을 짓밟는 아시가루 전열과 다이묘 지휘부를 무너뜨리다'],
  ['검은 부채의 군선봉행', '천수각 친위대와 군선봉행을 꺾고 조선 침공 명령서와 출병선을 빼앗다'],
  ['사카이의 검은 장부', '자유항 창고와 선단 장부에서 포로를 실어 나른 상단의 흔적을 쫓다'],
  ['이즈미의 대숲길', '바람에 숨은 추격대와 산짐승을 물리치며 아와지로 향하는 고개를 넘다'],
  ['아와지의 물귀신', '해협의 난파선과 초소를 돌파해 서쪽 바닷길을 여는 진혼굿을 치르다'],
  ['이키의 징발항', '고노우라 항구의 군량과 징발선을 끊어 대마도 원정의 발판을 세우다'],
  ['아리아케 산림', '대마도의 짙은 숲에서 매복군과 들짐승을 헤치며 이즈하라로 진군하다'],
  ['이즈하라 성하', '포로선의 마지막 중계지를 무너뜨리고 조선으로 향하는 바닷길을 빼앗다'],
  ['부산진의 귀향', '고향으로 돌아온 포로가 아니라 버린 나라를 치는 침입자로 상륙하다'],
  ['탄금대 살풀이', '전란의 혼백이 쌓인 남한강에서 두 나라의 군세를 굿판으로 삼다'],
  ['닫힌 광화문', '연화를 버린 조정의 심장을 향해 궁성 정문을 넘어가다'],
  ['품계석의 원혼', '이름 없이 끌려간 백성들의 한을 근정전 뜰에 풀어놓다'],
  ['왕의 침묵', '포로 송환을 외면한 자들의 기록과 대면하다'],
  ['검은 돛의 대가', '연화를 실어 나른 침공 선단과 마지막 빚을 결산하다'],
  ['버려진 이름들', '조선과 일본 어느 장부에도 남지 않은 포로들의 이름을 되찾다'],
  ['무너진 국경', '나라가 백성을 버릴 때 백성이 무엇으로 돌아오는지 증명하다'],
  ['피의 무당굿', '복수에 먹힌 신과 인간 연화 사이의 경계를 지키다'],
  ['압록의 객귀', '남쪽에서 시작한 원혼의 행렬을 조선 북방 끝까지 이끌다'],
  ['대동강 혼불', '강물에 잠든 전란의 넋을 깨워 왕도로 향하는 길을 밝히다'],
  ['두 고향의 재', '태어난 나라와 살아남은 나라, 어느 쪽에도 속하지 않음을 받아들이다'],
  ['망향의 나라', '복수 뒤에 남은 포로들과 산 자들을 위해 새로운 이름을 세우다'],
] as const;

const GWANGHAE_STORY_CHAPTERS = [
  ['왕세자의 분조', '선조의 교서를 받고 전란 속 조정을 둘로 나누어 백성 곁에 설 분조를 세우다'],
  ['송도의 군량', '개성 상단과 창고를 설득해 북상하는 관군과 의병의 식량길을 다시 잇다'],
  ['도성의 굶주림', '운종가와 혜민서에서 군량 징발보다 굶주린 백성의 구휼을 앞세우다'],
  ['숭례문의 의병', '도망치는 관군과 남은 의병을 분조의 깃발 아래 묶어 도성 남문을 지키다'],
  ['수원 둔전의 불씨', '버려진 둔전과 역참을 복구해 전란 중에도 버티는 군량망을 만들다'],
  ['남한강의 군선', '목계나루를 확보해 피란민과 군량이 함께 오갈 수 있는 수운을 열다'],
  ['영남 의병의 장계', '안동의 유림·장인·농민을 설득해 일곱 고을 분조군을 완성하다'],
  ['평양 북곽의 분조', '선조의 어가가 물러난 평양에서 남은 관군을 수습해 방어진을 세우다'],
  ['대동문의 결전', '분조의 군량로를 지키며 대동문을 노리는 적 선봉을 격퇴하다'],
  ['선조 앞의 장계', '백성과 함께 지킨 고을의 장계를 올리고 왕이 버린 책임을 묻다'],
  ['왕좌인가 왕명인가', '의병과 새 조정을 세울지 왕명으로 의병을 해산할지 되돌릴 수 없는 결단을 내리다'],
] as const;

const STORY_CHAPTERS: Record<PlayerOrigin, readonly (readonly [string, string])[]> = {
  'kim-donghyeok': KIM_STORY_CHAPTERS,
  'frontier-archer': FRONTIER_STORY_CHAPTERS,
  'osaka-mudang': MUDANG_STORY_CHAPTERS,
  'gwanghae-prince': GWANGHAE_STORY_CHAPTERS,
};

const CHAPTER_MARKS = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二',
  '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '二一', '二二', '二三', '二四',
] as const;

const REGION_PREVIEWS = {
  hanseongsouth: '/assets/environment/campaign/previews/hanseong-sungnyemun-preview-v2.webp',
  hanseongmarket: '/assets/environment/campaign/previews/hanseong-unjongga-preview-v1.webp',
  changdeokgung: '/assets/environment/campaign/previews/changdeokgung-audience-preview-v2.webp',
  gaeseong: '/assets/environment/campaign/previews/gaeseong-songdo-preview-v1.webp',
  suwon: '/assets/environment/campaign/previews/suwon-dohobu-preview-v1.webp',
  chungju: '/assets/environment/campaign/previews/chungju-mokgye-preview-v1.webp',
  andong: '/assets/environment/campaign/previews/andong-seowon-preview-v1.webp',
  wonju: ASSETS.extendedRegionBackgrounds.wonju.path,
  gangneung: ASSETS.extendedRegionBackgrounds.gangneung.path,
  haeju: ASSETS.extendedRegionBackgrounds.haeju.path,
  geoje: ASSETS.extendedRegionBackgrounds.geoje.path,
} as const satisfies Partial<Record<RegionId, string>>;

const MINIMAP_BACKGROUNDS: Record<RegionId, string> = {
  osaka: ASSETS.osakaOuterHarborBackground.path,
  settsuvillage: ASSETS.settsuVillageBackground.path,
  yamazakihunt: ASSETS.yamazakiHuntBackground.path,
  osakacastle: ASSETS.osakaCastleTownBackground.path,
  shogunkeep: ASSETS.shogunKeepBackground.path,
  sakaicity: ASSETS.background.path,
  izumihunt: ASSETS.background.path,
  awajicoast: ASSETS.background.path,
  ikiport: ASSETS.background.path,
  tsushimahunt: ASSETS.background.path,
  izuhara: ASSETS.background.path,
  solgogae: ASSETS.background.path,
  village: ASSETS.worldBackground.path,
  mistwood: ASSETS.mistwoodBackground.path,
  yeongwol: ASSETS.yeongwolTrainingYardBackground.path,
  yeongwolhq: ASSETS.yeongwolCommandHeadquartersBackground.path,
  jeonjufield: ASSETS.jeonjuWansanFieldBackground.path,
  jeonjugate: ASSETS.jeonjuPungnamGateBackground.path,
  jeonju: ASSETS.jeonjuCastleTownBackground.path,
  busanjin: ASSETS.busanjinSiegeBackground.path,
  tangeumdae: ASSETS.tangeumdaeBackground.path,
  gyeongbokgate: ASSETS.gyeongbokGwanghwamunBackground.path,
  gyeongbokcourt: ASSETS.gyeongbokGeunjeongBackground.path,
  gyeongbokinner: ASSETS.gyeongbokInnerBackground.path,
  hanseongsouth: REGION_PREVIEWS.hanseongsouth,
  hanseongmarket: REGION_PREVIEWS.hanseongmarket,
  changdeokgung: REGION_PREVIEWS.changdeokgung,
  gaeseong: REGION_PREVIEWS.gaeseong,
  suwon: REGION_PREVIEWS.suwon,
  chungju: REGION_PREVIEWS.chungju,
  andong: REGION_PREVIEWS.andong,
  wonju: ASSETS.extendedRegionBackgrounds.wonju.path,
  gangneung: ASSETS.extendedRegionBackgrounds.gangneung.path,
  haeju: ASSETS.extendedRegionBackgrounds.haeju.path,
  geoje: ASSETS.extendedRegionBackgrounds.geoje.path,
  hwangju: ASSETS.episode2TerrainBases['northwest-road'].path,
  jaeryeong: ASSETS.episode2TerrainBases['northwest-road'].path,
  anju: ASSETS.episode2TerrainBases['northwest-road'].path,
  uiju: ASSETS.episode2TerrainBases['northwest-road'].path,
  yangju: ASSETS.episode2TerrainBases['mountain-road'].path,
  gapyeong: ASSETS.episode2TerrainBases['mountain-road'].path,
  pyeongchang: ASSETS.episode2TerrainBases['mountain-road'].path,
  samcheok: ASSETS.episode2TerrainBases['mountain-road'].path,
  icheon: ASSETS.episode2TerrainBases['central-river'].path,
  yeoju: ASSETS.episode2TerrainBases['central-river'].path,
  cheongju: ASSETS.episode2TerrainBases['central-river'].path,
  gongju: ASSETS.episode2TerrainBases['central-river'].path,
  jemulpo: ASSETS.episode2TerrainBases['west-coast'].path,
  namyang: ASSETS.episode2TerrainBases['west-coast'].path,
  boryeong: ASSETS.episode2TerrainBases['west-coast'].path,
  gunsan: ASSETS.episode2TerrainBases['west-coast'].path,
  namwon: ASSETS.episode2TerrainBases['honam-road'].path,
  suncheon: ASSETS.episode2TerrainBases['honam-road'].path,
  mokpo: ASSETS.episode2TerrainBases['honam-road'].path,
  naju: ASSETS.episode2TerrainBases['honam-road'].path,
  sangju: ASSETS.episode2TerrainBases['yeongnam-road'].path,
  daegu: ASSETS.episode2TerrainBases['yeongnam-road'].path,
  jinju: ASSETS.episode2TerrainBases['yeongnam-road'].path,
  tongyeong: ASSETS.episode2TerrainBases['yeongnam-road'].path,
  jurchenvillage: ASSETS.jurchenVillageBackground.path,
  changbaihunt: ASSETS.background.path,
  baeksanvillage: ASSETS.background.path,
  songhuahunt: ASSETS.background.path,
  songhuavillage: ASSETS.background.path,
  blackpinehunt: ASSETS.background.path,
  heuksuvillage: ASSETS.background.path,
  manchufrontier: ASSETS.manchuFrontierBackground.path,
  pyongyangouter: ASSETS.pyongyangOuterBackground.path,
  pyongyanggate: ASSETS.pyongyangDaedongGateBackground.path,
  pyongyanginner: ASSETS.pyongyangInnerBackground.path,
  namhansanseong: ASSETS.namhansanFortressBackground.path,
  ganghwado: ASSETS.ganghwaFortressBackground.path,
  minepass: ASSETS.minepassBackground.path,
  moonfield: ASSETS.moonfieldBackground.path,
  dungeon: ASSETS.dungeonBackground.path,
  ulleungdo: ASSETS.ulleungdoPrisonBackground.path,
  ulleungcoast: ASSETS.ulleungCoastalForestBackground.path,
  ulleungmeadow: ASSETS.ulleungSilvergrassMeadowBackground.path,
  ulleunghunt: ASSETS.ulleungdoTrainingGroundBackground.path,
  ulleungridge: ASSETS.ulleungHighlandRidgeBackground.path,
  ulleungvillage: ASSETS.ulleungGovernmentDistrictBackground.path,
};

type Snapshot = {
  region: RegionId;
  worldMapUnlocked: RegionId[];
  factionWar: FactionWarSnapshot;
  playerOrigin: PlayerOrigin;
  dungeonFloor: number;
  player: PlayerState;
  target: MonsterState | BossState | null;
  inventory: InventoryItem[];
  equipment: EquipmentState;
  inventoryCapacity: number;
  attackPower: number;
  defense: number;
  accuracy: number;
  evasion: number;
  weaponEnchantLevel: number;
  armorEnchantLevel: number;
  skillRanks: Record<SkillId, number>;
  skillCooldowns: Record<SkillId, number>;
  skillPoints: number;
  attributes: {
    values: AttributeValues;
    allocations: AttributeValues;
    points: number;
  };
  derivedAttributes: DerivedAttributeBonuses;
  followers: FollowerState[];
  activeWorldEvent: ActiveWorldEvent | null;
  huntKills: Partial<Record<MonsterKind, number>>;
  craftedRecipes: CraftRecipeId[];
  questProgress: QuestProgress;
  storyProgress: StoryProgress;
  storyState: StoryCampaignState;
  settings: GameSettings;
  hajinArmy: {
    reserve: number;
    fielded: number;
    fieldCap: number;
    waveSize: number;
    unlocked: boolean;
    alliedTribes: number;
    totalTribes: number;
    unified: boolean;
  };
  gwanghaeArmy: {
    reserve: number;
    reserveCapacity: number;
    fielded: number;
    fieldCap: number;
    waveSize: number;
    unlocked: boolean;
    ralliedDistricts: number;
    totalDistricts: number;
    path: 'coup' | 'suppression' | null;
    enemyFielded: number;
    enemyPending: number;
    enemyReserve: number;
    enemyRemaining: number;
    enemyTotal: number;
  };
};

type HudActions = {
  onPotion: () => void;
  onEquip: (instanceId: string) => void;
  onUseItem: (instanceId: string) => void;
  onQuickStep: () => void;
  onSkill: (skillId: SkillId) => void;
  onLearnSkill: (skillId: SkillId) => void;
  onMasterTeach: (skillId: SkillId) => void;
  onAllocateAttribute: (attributeId: AttributeId) => void;
  onResetAttributes: () => void;
  onRecruitFollower: (kind: FollowerKind) => void;
  onCallReinforcements: () => void;
  onShopPurchase: (offer: ShopOfferId) => void;
  onCraft: (recipeId: CraftRecipeId) => void;
  onInventoryToggle: (open: boolean) => void;
  onWorldTravel: (region: RegionId) => WorldMapTravelResult;
  onTravelExit: () => void;
  onReplayStory: () => void;
  onSettingsChange: (settings: GameSettings) => void;
};

export class Hud {
  private readonly root: HTMLElement;
  private readonly feed: string[] = ['[경계병] 솔고개에 요사한 기운이 짙어졌소.'];
  private snapshot: Snapshot | null = null;
  private inventorySignature = '';
  private inventoryOpen = false;
  private skillTreeOpen = false;
  private inventoryReturnFocus: HTMLElement | null = null;
  private selectedItemId: string | null = null;
  private inventoryFilter: InventoryFilter = 'all';
  private inventorySort: InventorySort = 'recent';
  private inventoryMobileTab: InventoryMobileTab = 'bag';
  private shopOpen = false;
  private storyJournalOpen = false;
  private storyProfileOrigin: PlayerOrigin | null = null;
  private worldMapOpen = false;
  private travelMode = false;
  private selectedWorldRegion: RegionId | null = null;
  private worldMapSidebarTab: WorldMapSidebarTab = 'settlements';
  private worldMapReturnFocus: HTMLElement | null = null;
  private pauseOpen = false;
  private starterTutorialCompletedAt: number | null = null;
  private lastItemTap: { instanceId: string; at: number } | null = null;
  private skillLoadoutKey: string | null = null;
  private readonly abortController = new AbortController();

  constructor(root: HTMLElement, private readonly actions: HudActions) {
    this.root = root;
    this.root.innerHTML = this.template();
    const signal = this.abortController.signal;
    this.root.querySelector<HTMLButtonElement>('[data-action="potion"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.actions.onPotion();
    }, { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="quick-step"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.actions.onQuickStep();
    }, { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="inventory"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleInventory();
    }, { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="inventory-close"]')?.addEventListener('click', () => this.toggleInventory(false), { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="inventory-backdrop"]')?.addEventListener('click', () => this.toggleInventory(false), { signal });
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-action="skill-tree"]')) {
        event.stopPropagation();
        this.toggleSkillTree();
        return;
      }
      if (target.closest('[data-action="skill-tree-close"], [data-action="skill-tree-backdrop"]')) {
        this.toggleSkillTree(false);
        return;
      }
      if (target.closest('[data-action="shop-close"], [data-action="shop-backdrop"]')) {
        this.toggleShop(false);
        return;
      }
      if (target.closest('[data-action="story-journal"]')) {
        this.toggleStoryJournal();
        return;
      }
      if (target.closest('[data-action="story-close"], [data-action="story-backdrop"]')) {
        this.toggleStoryJournal(false);
        return;
      }
      if (target.closest('[data-action="story-replay"]')) {
        this.toggleStoryJournal(false);
        this.actions.onReplayStory();
        return;
      }
      if (target.closest('[data-action="world-map"]')) {
        event.stopPropagation();
        this.worldMapReturnFocus = target.closest<HTMLElement>('[data-action="world-map"]');
        this.toggleWorldMap();
        return;
      }
      if (target.closest('[data-action="world-map-close"], [data-action="world-map-backdrop"]')) {
        this.toggleWorldMap(false);
        return;
      }
      if (target.closest('[data-action="travel-exit"]')) {
        this.toggleWorldMap(false);
        this.actions.onTravelExit();
        return;
      }
      const worldMapTab = target.closest<HTMLButtonElement>('[data-world-map-tab]');
      if (worldMapTab?.dataset.worldMapTab) {
        this.setWorldMapSidebarTab(worldMapTab.dataset.worldMapTab as WorldMapSidebarTab);
        return;
      }
      if (target.closest('[data-action="world-map-confirm"]')) {
        this.confirmWorldTravel();
        return;
      }
      const worldRegion = target.closest<HTMLButtonElement>('[data-world-region], [data-travel-region]');
      const destinationId = worldRegion?.dataset.worldRegion ?? worldRegion?.dataset.travelRegion;
      if (destinationId) {
        this.selectWorldDestination(destinationId as RegionId);
        return;
      }
      if (target.closest('[data-action="pause-menu"]')) {
        this.togglePause();
        return;
      }
      if (target.closest('[data-action="pause-resume"], [data-action="pause-backdrop"]')) {
        this.togglePause(false);
        return;
      }
      if (target.closest('[data-action="pause-fullscreen"]')) {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
        return;
      }
      const qualityButton = target.closest<HTMLButtonElement>('[data-quality]');
      if (qualityButton?.dataset.quality && this.snapshot) {
        this.actions.onSettingsChange({
          ...this.snapshot.settings,
          graphicsQuality: qualityButton.dataset.quality as GraphicsQuality,
        });
        return;
      }
      const settingButton = target.closest<HTMLButtonElement>('[data-setting]');
      if (settingButton?.dataset.setting && this.snapshot) {
        const key = settingButton.dataset.setting as keyof Pick<
          GameSettings,
          'cameraShake' | 'damageNumbers' | 'vibration' | 'reducedMotion' | 'autoLoot' | 'highContrastObjectives'
        >;
        this.actions.onSettingsChange({ ...this.snapshot.settings, [key]: !this.snapshot.settings[key] });
        return;
      }
      const uiScaleButton = target.closest<HTMLButtonElement>('[data-ui-scale]');
      if (uiScaleButton?.dataset.uiScale && this.snapshot) {
        this.actions.onSettingsChange({
          ...this.snapshot.settings,
          uiScale: Number(uiScaleButton.dataset.uiScale) as UiScale,
        });
        return;
      }
      const attributeButton = target.closest<HTMLButtonElement>('[data-attribute]');
      if (attributeButton?.dataset.attribute) {
        this.actions.onAllocateAttribute(attributeButton.dataset.attribute as AttributeId);
        return;
      }
      if (target.closest('[data-action="attributes-reset"]')) {
        this.actions.onResetAttributes();
        return;
      }
      if (target.closest('[data-action="starter-weapon-tutorial"]')) {
        const starterWeapon = this.snapshot?.inventory.find((item) => item.itemId === 'worn-hwando');
        if (!starterWeapon) return;
        this.inventoryFilter = 'weapon';
        this.inventoryMobileTab = 'bag';
        this.selectedItemId = starterWeapon.instanceId;
        this.inventorySignature = '';
        this.toggleInventory(true);
        return;
      }
      const shopButton = target.closest<HTMLButtonElement>('[data-shop-offer]');
      if (shopButton?.dataset.shopOffer) {
        this.actions.onShopPurchase(shopButton.dataset.shopOffer as ShopOfferId);
        return;
      }
      const craftButton = target.closest<HTMLButtonElement>('[data-craft-recipe]');
      if (craftButton?.dataset.craftRecipe) {
        this.actions.onCraft(craftButton.dataset.craftRecipe as CraftRecipeId);
        return;
      }
      const mobileTab = target.closest<HTMLButtonElement>('[data-inventory-tab]');
      if (mobileTab?.dataset.inventoryTab) {
        this.setInventoryMobileTab(mobileTab.dataset.inventoryTab as InventoryMobileTab);
        return;
      }
      const selectButton = target.closest<HTMLButtonElement>('[data-select-item]');
      if (selectButton?.dataset.selectItem) {
        const instanceId = selectButton.dataset.selectItem;
        const now = performance.now();
        if (this.lastItemTap?.instanceId === instanceId && now - this.lastItemTap.at <= 380) {
          this.lastItemTap = null;
          this.activateInventoryItem(instanceId);
        } else {
          this.lastItemTap = { instanceId, at: now };
          this.selectItem(instanceId, selectButton);
        }
        return;
      }
      const filterButton = target.closest<HTMLButtonElement>('[data-filter]');
      if (filterButton?.dataset.filter) {
        this.setFilter(filterButton.dataset.filter as InventoryFilter);
        return;
      }
      if (target.closest('[data-action="inventory-sort"]')) {
        this.inventorySort = this.inventorySort === 'recent' ? 'type' : 'recent';
        this.inventorySignature = '';
        if (this.snapshot) this.renderInventory(this.snapshot);
        return;
      }
      const equipButton = target.closest<HTMLButtonElement>('[data-equip-item]');
      if (equipButton?.dataset.equipItem) this.actions.onEquip(equipButton.dataset.equipItem);
      const useButton = target.closest<HTMLButtonElement>('[data-use-item]');
      if (useButton?.dataset.useItem) this.actions.onUseItem(useButton.dataset.useItem);
      const skillButton = target.closest<HTMLButtonElement>('[data-skill]');
      if (skillButton?.dataset.skill) this.actions.onSkill(skillButton.dataset.skill as SkillId);
      const learnButton = target.closest<HTMLButtonElement>('[data-learn-skill]');
      if (learnButton?.dataset.learnSkill) this.actions.onLearnSkill(learnButton.dataset.learnSkill as SkillId);
      const masterButton = target.closest<HTMLButtonElement>('[data-master-skill]');
      if (masterButton?.dataset.masterSkill) this.actions.onMasterTeach(masterButton.dataset.masterSkill as SkillId);
      const recruitButton = target.closest<HTMLButtonElement>('[data-recruit-follower]');
      if (recruitButton?.dataset.recruitFollower) this.actions.onRecruitFollower(recruitButton.dataset.recruitFollower as FollowerKind);
      if (target.closest('[data-action="call-reinforcements"]')) this.actions.onCallReinforcements();
    }, { signal });
    this.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as HTMLElement;
      if (!target.closest('[data-action="story-journal"]')) return;
      event.preventDefault();
      event.stopPropagation();
      this.toggleStoryJournal();
    }, { signal });
    window.addEventListener('keydown', (event) => {
      if (document.body.dataset.inputLocked === 'true') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (this.inventoryOpen) this.toggleInventory(false);
        else if (this.skillTreeOpen) this.toggleSkillTree(false);
        else if (this.shopOpen) this.toggleShop(false);
        else if (this.storyJournalOpen) this.toggleStoryJournal(false);
        else if (this.worldMapOpen) this.toggleWorldMap(false);
        else this.togglePause();
        return;
      }
      if (!this.inventoryOpen && !this.skillTreeOpen && !this.shopOpen && !this.storyJournalOpen && !this.worldMapOpen && !this.pauseOpen) return;
      if (event.key === 'Tab') this.trapOpenDialogFocus(event);
    }, { signal });
    window.setTimeout(() => this.root.querySelector('.field-guide')?.classList.add('is-hidden'), 3800);
  }

  destroy(): void {
    this.abortController.abort();
    document.body.classList.remove('inventory-open');
    document.body.classList.remove('skill-tree-open');
    document.body.classList.remove('shop-open');
    document.body.classList.remove('story-journal-open');
    document.body.classList.remove('world-map-open');
    document.body.classList.remove('pause-open');
    document.body.classList.remove('travel-mode');
  }

  setTravelMode(enabled: boolean): void {
    if (enabled) {
      if (this.inventoryOpen) this.toggleInventory(false);
      if (this.skillTreeOpen) this.toggleSkillTree(false);
      if (this.shopOpen) this.toggleShop(false);
      if (this.storyJournalOpen) this.toggleStoryJournal(false);
      if (this.worldMapOpen) this.toggleWorldMap(false);
      if (this.pauseOpen) this.togglePause(false);
    }
    this.travelMode = enabled;
    this.root.classList.toggle('is-travel-mode', enabled);
    this.root.dataset.travelMode = String(enabled);
    document.body.classList.toggle('travel-mode', enabled);

    for (const control of this.root.querySelectorAll<HTMLButtonElement>(
      '[data-action="potion"], [data-action="quick-step"], [data-action="inventory"], [data-action="skill-tree"], [data-action="story-journal"], [data-skill]',
    )) {
      if (enabled) control.disabled = true;
    }
    this.text('world-map-kicker', enabled ? '幽行輿地 · GHOST ATLAS' : '三軍攻城 · FACTION WAR');
    this.text('world-map-title', enabled ? '유령 여행 전도' : '삼군 공성 전황도');
    this.text(
      'world-map-copy',
      enabled
        ? `전투와 기록 없이 지상 ${TRAVEL_ATLAS_REGION_IDS.length}개 권역을 자유롭게 답사합니다.`
        : '군사 거점과 명읍 역참길, 새로 열린 산악·연안 전초선을 함께 살핍니다.',
    );
    this.text(
      'world-map-status',
      enabled
        ? '목적지를 고른 뒤 유령 도약을 확정하십시오.'
        : '세력세와 예비병이 약해지면 성을 빼앗기고 회복 속도도 느려집니다.',
    );
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="world-map"]').forEach((button) => {
      button.setAttribute('aria-label', enabled ? '유령 여행 전체 지도 열기' : '천하 대도시 지도 열기');
    });
  }

  togglePause(force?: boolean): void {
    const panel = this.root.querySelector<HTMLElement>('.pause-panel');
    const shouldOpen = force ?? !this.pauseOpen;
    if (shouldOpen === this.pauseOpen) return;
    if (shouldOpen && this.inventoryOpen) this.toggleInventory(false);
    if (shouldOpen && this.skillTreeOpen) this.toggleSkillTree(false);
    if (shouldOpen && this.shopOpen) this.toggleShop(false);
    if (shouldOpen && this.storyJournalOpen) this.toggleStoryJournal(false);
    if (shouldOpen && this.worldMapOpen) this.toggleWorldMap(false);
    this.pauseOpen = shouldOpen;
    panel?.classList.toggle('is-open', shouldOpen);
    panel?.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) panel?.removeAttribute('inert');
    else panel?.setAttribute('inert', '');
    this.root.classList.toggle('is-pause-open', shouldOpen);
    document.body.classList.toggle('pause-open', shouldOpen);
    this.root.querySelector<HTMLButtonElement>('[data-action="pause-menu"]')
      ?.setAttribute('aria-expanded', String(shouldOpen));
    this.actions.onInventoryToggle(shouldOpen);
    if (shouldOpen) {
      window.requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>('[data-action="pause-resume"]')?.focus());
    }
  }

  toggleInventory(force?: boolean): void {
    const panel = this.root.querySelector<HTMLElement>('.inventory-panel');
    const shouldOpen = force ?? !this.inventoryOpen;
    if (shouldOpen === this.inventoryOpen) return;
    if (shouldOpen && this.skillTreeOpen) this.toggleSkillTree(false);
    if (shouldOpen && this.shopOpen) this.toggleShop(false);
    if (shouldOpen && this.storyJournalOpen) this.toggleStoryJournal(false);
    if (shouldOpen && this.worldMapOpen) this.toggleWorldMap(false);
    this.inventoryOpen = shouldOpen;
    if (shouldOpen) {
      this.inventoryReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : this.root.querySelector<HTMLButtonElement>('[data-action="inventory"]');
      if (!this.selectedItemId && this.snapshot?.inventory[0]) this.selectedItemId = this.snapshot.inventory[0].instanceId;
      if (this.snapshot) {
        this.inventorySignature = '';
        this.renderInventory(this.snapshot);
      }
    }
    panel?.classList.toggle('is-open', shouldOpen);
    panel?.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) panel?.removeAttribute('inert');
    else panel?.setAttribute('inert', '');
    this.root.classList.toggle('is-inventory-open', shouldOpen);
    this.root.dataset.inventoryOpen = String(shouldOpen);
    document.body.classList.toggle('inventory-open', shouldOpen);
    const inventoryButton = this.root.querySelector<HTMLButtonElement>('[data-action="inventory"]');
    inventoryButton?.setAttribute('aria-expanded', String(shouldOpen));
    this.root.querySelector<HTMLElement>('.inventory-backdrop')?.setAttribute('aria-hidden', String(!shouldOpen));
    this.actions.onInventoryToggle(shouldOpen);
    if (shouldOpen) {
      window.requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>('[data-action="inventory-close"]')?.focus());
    } else {
      this.inventoryReturnFocus?.focus();
      this.inventoryReturnFocus = null;
    }
  }

  toggleSkillTree(force?: boolean): void {
    const panel = this.root.querySelector<HTMLElement>('.skill-tree-panel');
    const shouldOpen = force ?? !this.skillTreeOpen;
    if (shouldOpen === this.skillTreeOpen) return;
    if (shouldOpen && this.inventoryOpen) this.toggleInventory(false);
    if (shouldOpen && this.shopOpen) this.toggleShop(false);
    if (shouldOpen && this.storyJournalOpen) this.toggleStoryJournal(false);
    if (shouldOpen && this.worldMapOpen) this.toggleWorldMap(false);
    this.skillTreeOpen = shouldOpen;
    panel?.classList.toggle('is-open', shouldOpen);
    panel?.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) panel?.removeAttribute('inert');
    else panel?.setAttribute('inert', '');
    this.root.classList.toggle('is-skill-tree-open', shouldOpen);
    document.body.classList.toggle('skill-tree-open', shouldOpen);
    this.root.querySelector<HTMLButtonElement>('[data-action="skill-tree"]')?.setAttribute('aria-expanded', String(shouldOpen));
    this.actions.onInventoryToggle(shouldOpen);
  }

  openVillageService(service: VillageService): void {
    const panel = this.root.querySelector<HTMLElement>('.shop-panel');
    panel?.setAttribute('data-service', service);
    this.text('shop-kicker', service === 'market' ? '울릉 장터' : service === 'forge' ? '무쇠 대장간' : '달빛 주막');
    this.text('shop-title', service === 'market' ? '행상인의 보급품' : service === 'forge' ? '장비 담금질' : '휴식과 동료 영입');
    this.text(
      'shop-description',
      service === 'market'
        ? '사냥에 필요한 약과 강화 주문서를 엽전으로 구입합니다.'
        : service === 'forge'
          ? '장비를 강화하고 산군 호피를 갑옷으로 제작합니다. 희귀 속성 환도는 지역 우두머리에게서 얻습니다.'
          : '따뜻한 국밥으로 쉬거나, 각자의 사연을 가진 농민군·전향 관군·특수전사를 동료로 맞습니다.',
    );
    this.toggleShop(true);
  }

  private toggleShop(force?: boolean): void {
    const shouldOpen = force ?? !this.shopOpen;
    if (shouldOpen === this.shopOpen) return;
    if (shouldOpen && this.inventoryOpen) this.toggleInventory(false);
    if (shouldOpen && this.skillTreeOpen) this.toggleSkillTree(false);
    if (shouldOpen && this.storyJournalOpen) this.toggleStoryJournal(false);
    if (shouldOpen && this.worldMapOpen) this.toggleWorldMap(false);
    this.shopOpen = shouldOpen;
    const panel = this.root.querySelector<HTMLElement>('.shop-panel');
    panel?.classList.toggle('is-open', shouldOpen);
    panel?.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) panel?.removeAttribute('inert');
    else panel?.setAttribute('inert', '');
    this.root.classList.toggle('is-shop-open', shouldOpen);
    document.body.classList.toggle('shop-open', shouldOpen);
    this.actions.onInventoryToggle(shouldOpen);
  }

  toggleStoryJournal(force?: boolean): void {
    const shouldOpen = force ?? !this.storyJournalOpen;
    if (shouldOpen === this.storyJournalOpen) return;
    if (shouldOpen && this.inventoryOpen) this.toggleInventory(false);
    if (shouldOpen && this.skillTreeOpen) this.toggleSkillTree(false);
    if (shouldOpen && this.shopOpen) this.toggleShop(false);
    if (shouldOpen && this.worldMapOpen) this.toggleWorldMap(false);
    this.storyJournalOpen = shouldOpen;
    const panel = this.root.querySelector<HTMLElement>('.story-journal-panel');
    panel?.classList.toggle('is-open', shouldOpen);
    panel?.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) panel?.removeAttribute('inert');
    else panel?.setAttribute('inert', '');
    this.root.classList.toggle('is-story-journal-open', shouldOpen);
    document.body.classList.toggle('story-journal-open', shouldOpen);
    this.root.querySelectorAll<HTMLElement>('[data-action="story-journal"]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(shouldOpen));
    });
    this.actions.onInventoryToggle(shouldOpen);
  }

  toggleWorldMap(force?: boolean): void {
    const shouldOpen = force ?? !this.worldMapOpen;
    if (shouldOpen === this.worldMapOpen) return;
    if (shouldOpen && this.inventoryOpen) this.toggleInventory(false);
    if (shouldOpen && this.skillTreeOpen) this.toggleSkillTree(false);
    if (shouldOpen && this.shopOpen) this.toggleShop(false);
    if (shouldOpen && this.storyJournalOpen) this.toggleStoryJournal(false);
    if (shouldOpen && this.pauseOpen) this.togglePause(false);
    this.worldMapOpen = shouldOpen;
    const panel = this.root.querySelector<HTMLElement>('.world-map-panel');
    panel?.classList.toggle('is-open', shouldOpen);
    panel?.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) panel?.removeAttribute('inert');
    else panel?.setAttribute('inert', '');
    this.root.classList.toggle('is-world-map-open', shouldOpen);
    document.body.classList.toggle('world-map-open', shouldOpen);
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="world-map"]').forEach((button) => {
      button.setAttribute('aria-expanded', String(shouldOpen));
    });
    this.root.querySelector<HTMLElement>('.world-map-backdrop')
      ?.setAttribute('aria-hidden', String(!shouldOpen));
    this.actions.onInventoryToggle(shouldOpen);
    if (shouldOpen) {
      if (!this.worldMapReturnFocus) {
        this.worldMapReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : this.root.querySelector<HTMLButtonElement>('[data-action="world-map"]');
      }
      const currentWorldNode = this.snapshot ? worldMapNodeForRegion(this.snapshot.region) : null;
      this.selectedWorldRegion = this.travelMode
        ? this.snapshot?.region ?? null
        : currentWorldNode?.destination ?? this.selectedWorldRegion;
      this.setWorldMapSidebarTab(this.worldMapSidebarTab);
      if (this.snapshot) this.renderWorldMapSelection(this.snapshot);
      this.text(
        'world-map-status',
        this.travelMode
          ? '목적지를 선택하고 오른쪽의 유령 도약 명령을 확정하십시오.'
          : '지도에서 거점이나 고을을 선택한 뒤 행군 명령을 확정하십시오.',
      );
      window.requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>('[data-action="world-map-close"]')?.focus());
    } else {
      this.worldMapReturnFocus?.focus();
      this.worldMapReturnFocus = null;
    }
  }

  private setWorldMapSidebarTab(tab: WorldMapSidebarTab): void {
    if (tab !== 'settlements' && tab !== 'war') return;
    this.worldMapSidebarTab = tab;
    const sidebar = this.root.querySelector<HTMLElement>('.world-map-sidebar');
    if (sidebar) sidebar.dataset.activeTab = tab;
    this.root.querySelectorAll<HTMLButtonElement>('[data-world-map-tab]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.worldMapTab === tab));
    });
  }

  private selectWorldDestination(destination: RegionId): void {
    if (!REGIONS[destination]) return;
    this.selectedWorldRegion = destination;
    if (this.snapshot) this.renderWorldMapSelection(this.snapshot);
  }

  private confirmWorldTravel(): void {
    const destination = this.selectedWorldRegion;
    if (!destination || !this.snapshot) return;
    const result = this.actions.onWorldTravel(destination);
    const message = result === 'traveled'
      ? this.travelMode ? `${REGIONS[destination].name}에 유령으로 도착했습니다.` : `${REGIONS[destination].name}(으)로 이동했습니다.`
      : result === 'combat' ? '전투 중에는 역참길을 이용할 수 없습니다.'
        : result === 'dungeon' ? '던전을 벗어난 뒤 전체 지도를 이용하십시오.'
          : result === 'same' ? '현재 머무는 권역입니다.' : '아직 발견하지 못한 길입니다.';
    this.text('world-map-status', message);
    if (result === 'traveled') this.toggleWorldMap(false);
  }

  private setInventoryMobileTab(tab: InventoryMobileTab): void {
    this.inventoryMobileTab = tab;
    const panel = this.root.querySelector<HTMLElement>('.inventory-panel');
    if (panel) panel.dataset.mobileTab = tab;
    this.root.querySelectorAll<HTMLButtonElement>('[data-inventory-tab]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.inventoryTab === tab));
    });
  }

  private selectItem(instanceId: string, source?: HTMLElement): void {
    if (!this.snapshot?.inventory.some((item) => item.instanceId === instanceId)) return;
    this.selectedItemId = instanceId;
    this.inventorySignature = '';
    this.renderInventory(this.snapshot);
    window.requestAnimationFrame(() => {
      this.root.querySelector<HTMLButtonElement>(`[data-select-item="${instanceId}"]`)?.focus();
    });
    source?.setAttribute('aria-pressed', 'true');
  }

  private activateInventoryItem(instanceId: string): void {
    const item = this.snapshot?.inventory.find((entry) => entry.instanceId === instanceId);
    if (!item) return;
    const slot = ITEM_CATALOG[item.itemId].slot;
    if (slot === 'scroll') this.actions.onUseItem(instanceId);
    else if (slot !== 'material') this.actions.onEquip(instanceId);
  }

  private setFilter(filter: InventoryFilter): void {
    if (!INVENTORY_FILTERS.some((entry) => entry.id === filter)) return;
    this.inventoryFilter = filter;
    const visible = this.filteredInventory(this.snapshot?.inventory ?? []);
    if (!visible.some((item) => item.instanceId === this.selectedItemId)) this.selectedItemId = visible[0]?.instanceId ?? null;
    this.inventorySignature = '';
    if (this.snapshot) this.renderInventory(this.snapshot);
  }

  private trapOpenDialogFocus(event: KeyboardEvent): void {
    const panel = this.root.querySelector<HTMLElement>(
      this.worldMapOpen ? '.world-map-panel'
        : this.storyJournalOpen ? '.story-journal-panel'
          : this.skillTreeOpen ? '.skill-tree-panel'
            : this.shopOpen ? '.shop-panel'
              : this.pauseOpen ? '.pause-panel'
                : '.inventory-panel',
    );
    const focusable = Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? [])
      .filter((element) => !element.hasAttribute('inert'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private renderWorldMapSelection(snapshot: Snapshot): void {
    const currentWorldNode = worldMapNodeForRegion(snapshot.region);
    const fallback = this.travelMode ? snapshot.region : currentWorldNode?.destination;
    const destination = this.selectedWorldRegion ?? fallback;
    if (!destination || destination === 'dungeon') return;
    this.selectedWorldRegion = destination;

    const region = REGIONS[destination];
    const selectedNode = worldMapNodeForRegion(destination);
    const unlocked = this.travelMode
      || snapshot.worldMapUnlocked.includes(selectedNode?.destination ?? destination);
    const current = snapshot.region === destination
      || Boolean(currentWorldNode && selectedNode && currentWorldNode.id === selectedNode.id);
    const gwanghaeRoyalRoad = !this.travelMode && snapshot.playerOrigin === 'gwanghae-prince';
    const atlasGroup = TRAVEL_ATLAS_GROUPS.find((group) =>
      (group.regions as readonly RegionId[]).includes(destination));
    const itinerary = currentWorldNode && selectedNode
      ? worldMapItinerary(currentWorldNode.id, selectedNode.id)
      : null;
    const routeLabel = itinerary
      ? itinerary.routes.length
        ? itinerary.nodes.map((node) => node.label).join(' → ')
        : '현재 거점 내부'
      : selectedNode?.routeLabel ?? atlasGroup?.label ?? '지방 답사로';
    const travelTime = this.travelMode
      ? '찰나의 유령 도약'
      : itinerary ? itinerary.travelDays > 0 ? `예상 ${itinerary.travelDays}일` : '이동 없음'
        : selectedNode ? `예상 ${selectedNode.travelDays}일` : '현지 역로 확인';
    const stronghold = selectedNode && (!this.travelMode || selectedNode.destination === destination)
      ? snapshot.factionWar.strongholds.find((entry) => entry.id === selectedNode.id)
      : null;
    const owner = stronghold
      ? snapshot.factionWar.factions.find((faction) => faction.id === stronghold.owner)
      : null;
    const kindLabel = this.travelMode
      ? region.safe ? '유령 답사 · 안전 권역' : '유령 답사 · 분쟁 권역'
      : selectedNode?.landmarkFrame !== undefined
      ? selectedNode.kind === 'settlement' ? '왕도 · 성곽 거점' : '군사 거점'
      : selectedNode?.kind === 'outpost' ? '신로 · 전초 거점'
        : region.safe ? '역참 · 안전 고을' : '사냥 · 분쟁 권역';
    const accessLabel = current
      ? '현재 머무는 권역'
      : unlocked ? this.travelMode ? '유령 도약 가능' : gwanghaeRoyalRoad ? '분조 순행 가능' : '행군로 확보'
        : '아직 발견하지 못한 길';
    const tacticalLabel = stronghold && owner
      ? `${owner.shortName} · 주둔 ${stronghold.garrison.toLocaleString('ko-KR')}명 · 성벽 ${stronghold.fortification}%`
      : region.safe ? '역참 · 장시 · 안전지대' : region.status;

    this.text('world-map-selection-kicker', kindLabel);
    this.text('world-map-selection-hanja', selectedNode?.hanja ?? (region.safe ? '驛' : '行'));
    this.text('world-map-selection-name', this.travelMode ? region.name : selectedNode?.label ?? region.name);
    this.text('world-map-selection-subtitle', this.travelMode ? region.province : selectedNode?.subtitle ?? region.province);
    this.text('world-map-selection-status', region.status);
    this.text('world-map-selection-tactical', tacticalLabel);
    this.text('world-map-selection-current', REGIONS[snapshot.region].name);
    this.text('world-map-selection-destination', region.name);
    this.text('world-map-selection-route', routeLabel);
    this.text('world-map-selection-time', travelTime);
    this.text('world-map-selection-access', accessLabel);
    this.text('world-map-confirm-label', current
      ? '현재 위치' : unlocked ? this.travelMode ? '유령 도약' : gwanghaeRoyalRoad ? '이곳으로 순행' : '이곳으로 행군'
        : '경로 미발견');
    this.text('world-map-confirm-hint', current
      ? '다른 목적지를 선택하십시오' : unlocked ? `${routeLabel} · ${travelTime}` : '이 권역을 먼저 발견해야 합니다');

    const preview = this.root.querySelector<HTMLImageElement>('[data-id="world-map-selection-preview"]');
    const previewPath = MINIMAP_BACKGROUNDS[destination];
    if (preview && preview.getAttribute('src') !== previewPath) preview.src = previewPath;
    if (preview) preview.alt = `${region.name} 현지 풍경`;

    const command = this.root.querySelector<HTMLElement>('.world-map-command-card');
    if (command) command.dataset.access = current ? 'current' : unlocked ? 'open' : 'locked';
    const confirm = this.root.querySelector<HTMLButtonElement>('[data-action="world-map-confirm"]');
    if (confirm) {
      confirm.disabled = current || !unlocked;
      confirm.setAttribute('aria-label', `${region.name} ${this.travelMode ? '유령 도약' : '행군'} 확정`);
    }

    const stage = this.root.querySelector<HTMLElement>('.world-map-canvas');
    if (stage) {
      stage.dataset.selectedNode = selectedNode?.id ?? '';
      stage.dataset.hasItinerary = itinerary?.routes.length ? 'true' : 'false';
      const activeRouteIds = new Set(itinerary?.routes.map((route) => route.id) ?? []);
      stage.querySelectorAll<HTMLElement>('.world-map-route').forEach((route) => {
        route.classList.toggle('is-itinerary', activeRouteIds.has(route.dataset.routeId ?? ''));
      });
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-world-region], [data-travel-region]').forEach((button) => {
      const buttonDestination = (button.dataset.worldRegion ?? button.dataset.travelRegion) as RegionId;
      const buttonNode = button.dataset.worldRegion ? worldMapNodeForRegion(buttonDestination) : null;
      const selected = button.dataset.worldRegion
        ? Boolean(selectedNode && buttonNode?.id === selectedNode.id)
        : buttonDestination === destination;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  private renderFactionWar(war: FactionWarSnapshot): void {
    const factionById = new Map(war.factions.map((faction) => [faction.id, faction]));
    const playerFaction = factionById.get(war.playerFaction);
    if (!playerFaction) return;

    this.text('war-player-faction', playerFaction.name);
    this.text('war-player-doctrine', playerFaction.doctrine);
    this.text('war-strength', `${Math.round(playerFaction.strength)}%`);
    this.text(
      'war-reserve',
      `${playerFaction.reserve.toLocaleString('ko-KR')} / ${playerFaction.reserveCapacity.toLocaleString('ko-KR')}명`,
    );
    this.text('war-recovery', `+${playerFaction.recoveryPerMinute.toLocaleString('ko-KR')}명 / 분`);
    this.text('war-holdings', `${playerFaction.holdings}성`);
    this.text('war-next-conflict', war.activeConflict.title);
    const attacker = factionById.get(war.activeConflict.attacker);
    const defender = factionById.get(war.activeConflict.defender);
    const conflictStronghold = war.strongholds.find((stronghold) => stronghold.id === war.activeConflict.stronghold);
    this.text(
      'war-conflict-sides',
      `${attacker?.shortName ?? '공격군'} → ${defender?.shortName ?? '수비군'}`
        + `${conflictStronghold ? ` · 수비 ${conflictStronghold.garrison.toLocaleString('ko-KR')}명` : ''}`,
    );
    this.text('war-recent', war.chronicle.slice(0, 3).join('\n') || '아직 기록된 공방전이 없습니다.');
    this.width('war-strength-fill', playerFaction.strength / 100);
    this.width(
      'war-reserve-fill',
      playerFaction.reserveCapacity > 0 ? playerFaction.reserve / playerFaction.reserveCapacity : 0,
    );

    for (const faction of war.factions) {
      this.text(`war-faction-${faction.id}-name`, faction.shortName);
      this.text(`war-faction-${faction.id}-strength`, `${Math.round(faction.strength)}%`);
      this.text(`war-faction-${faction.id}-holdings`, `${faction.holdings}성`);
      const row = this.root.querySelector<HTMLElement>(`[data-war-faction="${faction.id}"]`);
      row?.classList.toggle('is-player', faction.player);
      const balance = row?.querySelector<HTMLElement>('[data-war-faction-fill]');
      if (balance) balance.style.width = `${Math.max(0, Math.min(100, faction.strength))}%`;
    }

    for (const stronghold of war.strongholds) {
      const node = this.root.querySelector<HTMLButtonElement>(`[data-world-stronghold="${stronghold.id}"]`);
      const owner = factionById.get(stronghold.owner);
      if (!node || !owner) continue;
      node.dataset.owner = stronghold.owner;
      node.classList.toggle('is-war-target', stronghold.id === war.activeConflict.stronghold);
      this.text(`war-node-${stronghold.id}-owner`, owner.shortName);
      this.text(`war-node-${stronghold.id}-garrison`, `${stronghold.garrison.toLocaleString('ko-KR')}명`);
      this.text(`war-node-${stronghold.id}-fortification`, `성벽 ${stronghold.fortification}%`);
      const label = node.querySelector<HTMLElement>('[data-world-node-label]')?.textContent ?? stronghold.name;
      node.setAttribute(
        'aria-label',
        `${label}, ${owner.name} 소유, 주둔군 ${stronghold.garrison.toLocaleString('ko-KR')}명, 성벽 ${stronghold.fortification}%`,
      );
    }
  }

  private renderCharacterStory(origin: PlayerOrigin): void {
    if (this.storyProfileOrigin === origin) return;
    this.storyProfileOrigin = origin;
    const profile = CHARACTER_STORY_PROFILES[origin];
    const chapters = STORY_CHAPTERS[origin];

    this.text('story-profile-epithet', profile.epithet);
    this.text('story-profile-era', profile.era);
    this.text('story-profile-homeland', profile.homeland);
    this.text('story-profile-faction', profile.faction);
    this.text('story-profile-premise', profile.premise);
    this.text('story-profile-creed', profile.creed);
    this.text('story-profile-wound', profile.wound);
    this.text('story-profile-adversary', profile.adversary);
    this.text('story-profile-allies', profile.allies);
    this.text('story-profile-dilemma', profile.dilemma);
    this.text('story-profile-ending', profile.ending);

    const themes = this.root.querySelector<HTMLElement>('[data-id="story-profile-themes"]');
    if (themes) themes.innerHTML = profile.themes.map((theme) => `<span>${theme}</span>`).join('');

    const acts = this.root.querySelector<HTMLElement>('[data-id="story-acts"]');
    if (acts) acts.innerHTML = profile.acts.map((act) => `
      <article>
        <header><b>${act.title}</b><span>${act.chapters}</span></header>
        <p>${act.premise}</p>
        <small>${act.turningPoint}</small>
      </article>
    `).join('');

    const list = this.root.querySelector<HTMLOListElement>('[data-id="story-chapters"]');
    if (list) list.innerHTML = chapters.map(([title, description], index) => `
      <li data-story-chapter="${index + 1}">
        <i>${CHAPTER_MARKS[index] ?? index + 1}</i>
        <div><b>${title}</b><span>${description}</span></div>
      </li>
    `).join('');
  }

  private renderStoryHistory(state: StoryCampaignState): void {
    const memoryList = this.root.querySelector<HTMLOListElement>('[data-id="story-memories"]');
    if (memoryList) {
      const rows = state.memories.slice(-8).reverse().map((memory) => {
        const row = document.createElement('li');
        row.dataset.storyMemory = memory.beatId;
        const mark = document.createElement('i');
        mark.textContent = String(memory.act);
        const copy = document.createElement('div');
        const title = document.createElement('b');
        title.textContent = `제${memory.chapter}장 · ${memory.title}`;
        const summary = document.createElement('span');
        summary.textContent = memory.summary;
        copy.append(title, summary);
        row.append(mark, copy);
        return row;
      });
      memoryList.replaceChildren(...rows);
      memoryList.closest<HTMLElement>('.story-memory-log')?.toggleAttribute('hidden', rows.length === 0);
    }

    const choiceList = this.root.querySelector<HTMLOListElement>('[data-id="story-choices"]');
    if (choiceList) {
      const rows = state.choices.slice(-6).reverse().map((choice) => {
        const row = document.createElement('li');
        row.dataset.storyChoice = choice.choiceId;
        const title = document.createElement('b');
        title.textContent = choice.label;
        const consequence = document.createElement('span');
        consequence.textContent = choice.consequence;
        row.append(title, consequence);
        return row;
      });
      choiceList.replaceChildren(...rows);
      choiceList.closest<HTMLElement>('.story-choice-log')?.toggleAttribute('hidden', rows.length === 0);
    }
  }

  update(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    this.root.dataset.playerOrigin = snapshot.playerOrigin;
    document.body.dataset.activeOrigin = snapshot.playerOrigin;
    const { player, target } = snapshot;
    const playerHpRatio = player.hp / player.maxHp;
    const playerPanel = this.root.querySelector<HTMLElement>('.player-panel');
    const playerLowHp = playerHpRatio <= 0.3;
    const region = REGIONS[snapshot.region];
    const unlockedWorldNodes = new Set(snapshot.worldMapUnlocked);
    this.root.querySelectorAll<HTMLButtonElement>('[data-world-region]').forEach((button) => {
      const destination = button.dataset.worldRegion as RegionId;
      const unlocked = this.travelMode || unlockedWorldNodes.has(destination);
      const current = snapshot.region === destination;
      button.disabled = false;
      button.setAttribute('aria-disabled', String(!unlocked));
      button.classList.toggle('is-unlocked', unlocked);
      button.classList.toggle('is-current', current);
      const nodeState = button.querySelector<HTMLElement>('[data-world-node-state]');
      if (nodeState) nodeState.textContent = current
        ? '현재 권역'
        : unlocked
          ? snapshot.playerOrigin === 'gwanghae-prince' ? '분조 순행' : '경로 확보'
          : '미발견';
    });
    this.renderFactionWar(snapshot.factionWar);
    this.root.querySelectorAll<HTMLButtonElement>('[data-travel-region]').forEach((button) => {
      const destination = button.dataset.travelRegion as RegionId;
      const current = snapshot.region === destination;
      button.disabled = false;
      button.classList.toggle('is-current', current);
      const state = button.querySelector<HTMLElement>('[data-travel-node-state]');
      if (state) state.textContent = current ? '현재 위치' : '목적지 선택';
    });
    this.root.querySelectorAll<HTMLDetailsElement>('[data-travel-group]').forEach((group) => {
      if (group.querySelector('[data-travel-region].is-current')) group.open = true;
    });
    this.renderWorldMapSelection(snapshot);
    const frontierSector = snapshot.region === 'manchufrontier'
      ? frontierSectorAt(player.y - REGION_ORIGINS.manchufrontier.y)
      : null;
    const frontierArcher = snapshot.playerOrigin === 'frontier-archer';
    const osakaMudang = snapshot.playerOrigin === 'osaka-mudang';
    const gwanghaePrince = snapshot.playerOrigin === 'gwanghae-prince';
    const weapon = this.equippedDefinition('weapon', snapshot);
    this.root.classList.toggle('is-frontier-archer', frontierArcher);
    this.root.classList.toggle('is-frontier-bow', frontierArcher && weapon?.weaponClass === 'bow');
    this.root.classList.toggle('is-osaka-mudang', osakaMudang);
    this.root.classList.toggle('is-gwanghae-prince', gwanghaePrince);
    this.configureCombatSkillLoadout(snapshot.playerOrigin, weapon?.weaponClass === 'bow');
    this.text('location-province', frontierSector ? `${region.province} · 북방 전선 구역` : region.province);
    this.text('location-name', snapshot.region === 'dungeon'
      ? `${region.name} ${snapshot.dungeonFloor}층`
      : frontierSector ? frontierSector.name : region.name);
    this.text('location-status', frontierSector?.status ?? region.status);
    this.text('travel-region', snapshot.region === 'dungeon' ? '지하 미궁' : region.name);
    this.text('travel-province', frontierSector ? `${region.province} · ${frontierSector.name}` : region.province);
    this.text('travel-coords', `${Math.round(player.x - REGION_ORIGINS[snapshot.region].x)}, ${Math.round(player.y - REGION_ORIGINS[snapshot.region].y)}`);
    this.text('pause-region', snapshot.region === 'dungeon'
      ? `${region.name} ${snapshot.dungeonFloor}층`
      : frontierSector ? `${region.name} · ${frontierSector.name}` : region.name);
    const className = frontierArcher ? '활잡이' : osakaMudang ? '무당' : gwanghaePrince ? '왕세자' : '무사';
    const characterName = frontierArcher ? '하진' : osakaMudang ? '연화' : gwanghaePrince ? '왕세자 광해' : '김동혁';
    this.text('pause-level', `${className} ${player.level}품 · 전투력 ${this.combatPower(snapshot).toLocaleString('ko-KR')}`);
    this.updateSettingsControls(snapshot.settings);
    this.updateMinimap(snapshot);
    this.root.querySelector('.location-plaque')?.classList.toggle('is-safe', region.safe);
    playerPanel?.classList.toggle('is-low-hp', playerLowHp);
    this.root.classList.toggle('is-player-low-hp', playerLowHp);
    this.text('player-level', `${frontierArcher ? '북방 활잡이' : osakaMudang ? '망향 무당' : gwanghaePrince ? '조선 왕세자' : '무사'} · ${player.level}품`);
    this.text('player-name', characterName);
    const inventoryTitle = this.root.querySelector<HTMLElement>('#inventory-title');
    if (inventoryTitle) inventoryTitle.textContent = `${characterName}의 행낭`;
    this.text('inventory-channel-region', `${region.name} 1`);
    this.text('inventory-class-rank', `${className} ${player.level}품`);
    this.text('attribute-points', String(snapshot.attributes.points));
    for (const attributeId of ATTRIBUTE_IDS) {
      this.text(`attribute-${attributeId}`, String(snapshot.attributes.values[attributeId]));
      const button = this.root.querySelector<HTMLButtonElement>(`[data-attribute="${attributeId}"]`);
      if (button) {
        button.disabled = snapshot.attributes.points <= 0;
        button.setAttribute('aria-label', `${ATTRIBUTE_LABELS[attributeId].name} ${snapshot.attributes.values[attributeId]}, 1점 투자`);
      }
    }
    this.text('derived-critical', `${snapshot.derivedAttributes.criticalChance}%`);
    this.text('derived-status', `${snapshot.derivedAttributes.statusResistance}%`);
    this.text('derived-follower', `${snapshot.derivedAttributes.followerPower}%`);
    const resetAttributes = this.root.querySelector<HTMLButtonElement>('[data-action="attributes-reset"]');
    if (resetAttributes) resetAttributes.disabled = Object.values(snapshot.attributes.allocations).every((value) => value === 0);
    const portrait = this.root.querySelector<HTMLImageElement>('.player-portrait-image');
    if (portrait) {
      const portraitPath = frontierArcher
        ? '/assets/ui/harlan-portrait-v1.png'
        : osakaMudang
          ? '/assets/ui/yeonhwa-portrait-v1.webp'
          : gwanghaePrince
            ? '/assets/ui/gwanghae-crown-prince-portrait-v1.webp'
            : '/assets/ui/kim-donghyeok-portrait-v1.png';
      if (portrait.getAttribute('src') !== portraitPath) portrait.src = portraitPath;
      portrait.alt = frontierArcher
        ? '북방 활잡이 하진 초상'
        : osakaMudang
          ? '망향 무당 연화 초상'
          : gwanghaePrince ? '조선 왕세자 광해 초상' : '김동혁 초상';
      portrait.parentElement?.setAttribute('aria-label', portrait.alt);
    }
    this.root.querySelector('.minimap-player')?.setAttribute(
      'aria-label',
      `${characterName} 현재 위치`,
    );
    const storyProfile = CHARACTER_STORY_PROFILES[snapshot.playerOrigin];
    const journalTitle = this.root.querySelector<HTMLElement>('#story-journal-title');
    if (journalTitle) journalTitle.textContent = storyProfile.journalTitle;
    this.renderCharacterStory(snapshot.playerOrigin);
    this.renderStoryHistory(snapshot.storyState);
    const playerFaction = snapshot.factionWar.factions.find((faction) => faction.player);
    if (playerFaction) {
      this.text('story-war-strength', `${Math.round(playerFaction.strength)}%`);
      this.text('story-war-reserve', `${playerFaction.reserve.toLocaleString('ko-KR')}명`);
      this.text('story-war-holdings', `${playerFaction.holdings}곳`);
      this.text('story-war-doctrine', playerFaction.doctrine);
    }
    this.text('story-war-conflict', snapshot.factionWar.activeConflict.title);
    this.text('hp-label', `${Math.ceil(player.hp)} / ${player.maxHp}`);
    this.width('hp-fill', playerHpRatio);
    this.width('xp-fill', player.xp / player.xpToNext);
    this.text('xp-label', `수련 ${player.xp} / ${player.xpToNext}`);
    this.width('xp-bottom-fill', player.xp / player.xpToNext);
    this.text('xp-bottom-label', `수련 ${player.xp} / ${player.xpToNext}`);
    this.width('momentum-fill', player.momentum / 100);
    const momentumHud = this.root.querySelector<HTMLElement>('.momentum-hud');
    momentumHud?.classList.toggle('is-active', player.momentumActive > 0);
    momentumHud?.classList.toggle('has-combo', player.combo > 1 && player.momentumActive <= 0);
    this.text(
      'momentum-label',
      player.momentumActive > 0
        ? `월하각성 ${player.momentumActive.toFixed(1)}초`
        : player.combo > 1 && player.comboTimer > 0
          ? `${player.combo} 연속 처치`
          : '월영 기세',
    );
    this.text('momentum-value', player.momentumActive > 0 ? '각성' : `${Math.round(player.momentum)}%`);
    this.text('gold', player.gold.toLocaleString('ko-KR'));
    this.text('inventory-gold', player.gold.toLocaleString('ko-KR'));
    this.text('inventory-potions', String(player.potions));
    this.text('inventory-level', `${player.level}품`);
    this.text('mobile-power', this.combatPower(snapshot).toLocaleString('ko-KR'));
    this.text('mobile-level', `${player.level}품`);
    this.text('shop-gold', player.gold.toLocaleString('ko-KR'));
    const armyStatus = frontierArcher
      ? snapshot.hajinArmy
      : gwanghaePrince ? snapshot.gwanghaeArmy : null;
    const followerCapacity = armyStatus ? armyStatus.fieldCap + 3 : 3;
    this.text('follower-count', `${snapshot.followers.length} / ${followerCapacity}`);
    const armyCommand = this.root.querySelector<HTMLElement>('[data-id="field-army-command"]');
    if (armyCommand) {
      armyCommand.hidden = armyStatus === null;
      armyCommand.closest('.follower-roster-hud')?.classList.toggle('has-field-army', armyStatus !== null);
      if (frontierArcher) {
        this.text('army-heading', '남진 군세');
        this.text('army-progress-label', '부족 맹약');
        this.text('army-progress', `${snapshot.hajinArmy.alliedTribes} / ${snapshot.hajinArmy.totalTribes}`);
        this.text('army-reserve', `${snapshot.hajinArmy.reserve.toLocaleString('ko-KR')} / 1,000`);
        this.text('army-fielded', `${snapshot.hajinArmy.fielded} / ${snapshot.hajinArmy.fieldCap}`);
        this.text('army-call-label', `원군 ${snapshot.hajinArmy.waveSize}명 호출`);
      } else if (gwanghaePrince) {
        this.text('army-heading', '광해 분조군');
        this.text('army-progress-label', '의병 규합');
        this.text('army-progress', `${snapshot.gwanghaeArmy.ralliedDistricts} / ${snapshot.gwanghaeArmy.totalDistricts}`);
        this.text(
          'army-reserve',
          `${snapshot.gwanghaeArmy.reserve.toLocaleString('ko-KR')} / ${snapshot.gwanghaeArmy.reserveCapacity.toLocaleString('ko-KR')}`,
        );
        this.text('army-fielded', `${snapshot.gwanghaeArmy.fielded} / ${snapshot.gwanghaeArmy.fieldCap}`);
        this.text('army-call-label', `의병 ${snapshot.gwanghaeArmy.waveSize}명 호출`);
      }
      const opponent = armyCommand.querySelector<HTMLElement>('[data-id="army-opponent"]');
      if (opponent) {
        opponent.hidden = !gwanghaePrince || snapshot.gwanghaeArmy.enemyTotal <= 0;
        if (gwanghaePrince && snapshot.gwanghaeArmy.enemyTotal > 0) {
          const enemyLabel = snapshot.gwanghaeArmy.path === 'coup' ? '왕당군 잔존' : '삼남 의병 잔존';
          this.text('army-opponent-label', enemyLabel);
          this.text('army-opponent-count', `${snapshot.gwanghaeArmy.enemyRemaining} / ${snapshot.gwanghaeArmy.enemyTotal}`);
          this.text(
            'army-opponent-detail',
            `현장 ${snapshot.gwanghaeArmy.enemyFielded} · 투입 중 ${snapshot.gwanghaeArmy.enemyPending} · 예비 ${snapshot.gwanghaeArmy.enemyReserve}`,
          );
        }
      }
      const callButton = armyCommand.querySelector<HTMLButtonElement>('[data-action="call-reinforcements"]');
      if (callButton && armyStatus) {
        const hasRoom = armyStatus.fieldCap - armyStatus.fielded >= armyStatus.waveSize;
        callButton.disabled = !armyStatus.unlocked
          || armyStatus.reserve < armyStatus.waveSize
          || !hasRoom;
        const label = callButton.querySelector<HTMLElement>('small');
        if (label) label.textContent = !armyStatus.unlocked
          ? gwanghaePrince
            ? snapshot.gwanghaeArmy.path === 'suppression'
              ? '왕명 노선 · 의병 해산'
              : '승정원 주서에게 분조 명부 받기'
            : snapshot.hajinArmy.unified ? '압록 설욕전 승리 후' : '여진 3부족 통합 후'
          : !hasRoom
            ? '전장 지휘 한도'
            : armyStatus.reserve < armyStatus.waveSize
              ? '호출할 예비병 부족'
              : `예비병 -${armyStatus.waveSize}`;
      }
    }
    const roster = this.root.querySelector<HTMLElement>('[data-id="follower-roster"]');
    if (roster) {
      const visibleFollowers = (frontierArcher || gwanghaePrince) && snapshot.followers.length > 5
        ? snapshot.followers.slice(0, 5)
        : snapshot.followers;
      roster.innerHTML = snapshot.followers.length
        ? visibleFollowers.map((follower) => {
          const definition = FOLLOWER_CATALOG[follower.kind];
          const icon = follower.kind === 'peasant-militia' || follower.kind === 'gwanghae-militia' ? '民'
            : follower.kind === 'government-defector' || follower.kind === 'jurchen-vanguard'
              || follower.kind === 'gwanghae-spearman' ? '槍'
              : follower.kind === 'jurchen-bowguard' || follower.kind === 'gwanghae-archer' ? '弓'
                : follower.kind === 'jurchen-captain' || follower.kind === 'gwanghae-captain' ? '將' : '影';
          return `<span data-follower-kind="${follower.kind}"><i>${icon}</i><b>${follower.name}</b><small>${definition.title}</small></span>`;
        }).join('') + (snapshot.followers.length > visibleFollowers.length
          ? `<em>+${snapshot.followers.length - visibleFollowers.length}명 · 후속 전열에서 진군 중</em>`
          : '')
        : '<em>주막과 사건에서 동료를 영입할 수 있습니다.</em>';
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-recruit-follower]').forEach((button) => {
      const kind = button.dataset.recruitFollower as FollowerKind;
      const definition = FOLLOWER_CATALOG[kind];
      const known = snapshot.followers.some((follower) => follower.kind === kind);
      const storyReady = !definition.requiresPrisonEscape || snapshot.storyProgress.completed >= 2;
      const skillReady = !definition.requiredSkill || snapshot.skillRanks[definition.requiredSkill] > 0;
      button.disabled = known || snapshot.followers.length >= followerCapacity || player.level < definition.requiredLevel
        || player.gold < definition.cost || !storyReady || !skillReady;
      button.classList.toggle('is-ready', !button.disabled);
      const state = button.querySelector<HTMLElement>('em');
      if (state) state.textContent = known
        ? '합류 완료'
        : !storyReady
          ? '감옥 탈출 필요'
          : !skillReady
            ? `${SKILL_CATALOG[definition.requiredSkill!].shortName} 필요`
            : `${definition.requiredLevel}품 · ${definition.cost}전`;
    });
    const tigerPelts = snapshot.inventory.filter((item) => item.itemId === 'ulleung-tiger-pelt').length;
    const tigerKills = snapshot.huntKills['ulleung-sangun'] ?? 0;
    this.text('tiger-pelt-count', String(tigerPelts));
    this.text('tiger-pelt-count-forge', String(tigerPelts));
    this.text('tiger-hunt-count', String(tigerKills));
    this.text('hunt-species-count', String(Object.values(snapshot.huntKills).filter((kills) => (kills ?? 0) > 0).length));
    const tigerCraftButton = this.root.querySelector<HTMLButtonElement>('[data-craft-recipe="tiger-pelt-armor"]');
    if (tigerCraftButton) {
      tigerCraftButton.disabled = tigerPelts < 3 || player.gold < 180;
      tigerCraftButton.classList.toggle('is-ready', tigerPelts >= 3 && player.gold >= 180);
    }
    this.text('story-current-title', snapshot.storyProgress.title);
    this.text('story-current-objective', snapshot.storyProgress.objective);
    const storyChapterTotal = STORY_CHAPTERS[snapshot.playerOrigin].length;
    this.text('story-progress-label', `${snapshot.storyProgress.completed} / ${storyChapterTotal} 장`);
    this.root.querySelectorAll<HTMLElement>('[data-story-chapter]').forEach((chapter) => {
      const value = Number(chapter.dataset.storyChapter);
      chapter.classList.toggle('is-complete', value < snapshot.storyProgress.chapter);
      chapter.classList.toggle('is-current', value === snapshot.storyProgress.chapter);
      chapter.classList.toggle('is-seen', snapshot.storyState.memories.some((memory) => memory.chapter === value));
    });
    this.text('potions', String(player.potions));
    this.text('skill-points', String(snapshot.skillPoints));
    for (const skillId of ACTIVE_SKILL_IDS) {
      const definition = SKILL_CATALOG[skillId];
      const cooldown = snapshot.skillCooldowns[skillId];
      const button = this.root.querySelector<HTMLButtonElement>(`[data-skill="${skillId}"]`);
      const unlocked = snapshot.skillRanks[skillId] > 0;
      const correctWeapon = definition.requiredWeapon
        ? definition.requiredWeapon === 'bow' ? weapon?.weaponClass === 'bow' : weapon?.weaponClass !== 'bow'
        : osakaMudang;
      button?.classList.toggle('is-cooling', cooldown > 0);
      button?.classList.toggle('is-weapon-locked', !correctWeapon || !unlocked);
      if (button) button.disabled = !correctWeapon || !unlocked || cooldown > 0;
      const cooldownBase = skillId === 'leap-strike' ? 6.35
        : skillId === 'crescent-wave' ? 5.05
          : skillId === 'tidebreaker-step' ? 5.8
          : skillId === 'crescent-arrow-rain' ? 5.9
            : skillId === 'beacon-volley' ? 5.6
            : skillId === 'iron-cavalry-shot' ? 4.9 : 4.15;
      button?.style.setProperty('--skill-cooldown', `${Math.min(100, cooldown / cooldownBase * 100)}%`);
      this.text(
        `skill-cd-${skillId}`,
        !unlocked
          ? '미습득'
          : !correctWeapon
            ? definition.requiredWeapon === 'bow' ? '활 필요' : '검 필요'
            : cooldown > 0 ? String(Math.ceil(cooldown)) : `R${snapshot.skillRanks[skillId]}`,
      );
    }
    for (const skillId of Object.keys(SKILL_CATALOG) as SkillId[]) {
      const definition = SKILL_CATALOG[skillId];
      const rank = snapshot.skillRanks[skillId];
      this.text(`skill-rank-${skillId}`, rank > 0 ? `${rank} / ${definition.maxRank}` : '미습득');
      const node = this.root.querySelector<HTMLElement>(`[data-skill-node="${skillId}"]`);
      node?.classList.toggle('is-unlocked', rank > 0);
      node?.classList.toggle('is-mastered', rank >= definition.maxRank);
      const prerequisite = unmetSkillPrerequisite(skillId, snapshot.skillRanks);
      node?.classList.toggle('is-prerequisite-locked', Boolean(prerequisite));
      if (node) {
        const meta = SKILL_TREE_META[skillId];
        node.dataset.skillBranch = meta.branch;
        node.dataset.skillTier = String(meta.tier);
        node.dataset.recommended = String(meta.recommendedOrigins.includes(snapshot.playerOrigin));
      }
      const learn = this.root.querySelector<HTMLButtonElement>(`[data-learn-skill="${skillId}"]`);
      if (learn) {
        const canUnlockByTraining = rank === 0 && definition.acquisition === 'training';
        learn.disabled = Boolean(prerequisite) || snapshot.skillPoints <= 0 || rank >= definition.maxRank || (rank === 0 && !canUnlockByTraining);
        learn.textContent = rank >= definition.maxRank
          ? '수련 완료'
          : prerequisite
            ? `선행 · ${skillPrerequisiteLabel(skillId)}`
          : rank === 0
            ? definition.acquisition === 'training' ? '1점으로 수련' : definition.acquisitionLabel
            : '단계 강화';
      }
      const acquisition = this.root.querySelector<HTMLElement>(`[data-skill-source="${skillId}"]`);
      if (acquisition) acquisition.textContent = rank > 0 ? `습득 완료 · ${definition.effect}` : definition.acquisitionLabel;
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-master-skill]').forEach((button) => {
      const skillId = button.dataset.masterSkill as SkillId;
      const definition = SKILL_CATALOG[skillId];
      const known = snapshot.skillRanks[skillId] > 0;
      const prerequisite = unmetSkillPrerequisite(skillId, snapshot.skillRanks);
      const requiredLevel = definition.requiredLevel ?? 1;
      const cost = definition.masterCost ?? 0;
      button.disabled = known || Boolean(prerequisite) || player.level < requiredLevel || player.gold < cost;
      button.classList.toggle('is-ready', !known && !prerequisite && player.level >= requiredLevel && player.gold >= cost);
      const state = button.querySelector<HTMLElement>('em');
      if (state) state.textContent = known
        ? '전수 완료'
        : prerequisite
          ? `선행 · ${skillPrerequisiteLabel(skillId)}`
          : `${requiredLevel}품 · ${cost}전`;
    });
    const potionButton = this.root.querySelector<HTMLButtonElement>('[data-action="potion"]');
    if (potionButton) potionButton.disabled = player.potions <= 0 || player.hp >= player.maxHp;
    const quickStepButton = this.root.querySelector<HTMLButtonElement>('[data-action="quick-step"]');
    const quickStepCooling = player.dodgeCooldown > 0;
    if (quickStepButton) {
      quickStepButton.disabled = quickStepCooling;
      quickStepButton.classList.toggle('is-cooling', quickStepCooling);
      quickStepButton.style.setProperty('--cooldown-ratio', `${Math.min(1, player.dodgeCooldown / 1.6) * 100}%`);
    }
    this.text('quick-step-label', quickStepCooling ? `${player.dodgeCooldown.toFixed(1)}초` : '회피 보법');
    this.text('kill-count', snapshot.questProgress.label);
    this.width('quest-fill', snapshot.questProgress.ratio);
    const islandRegion = isUlleungRegion(snapshot.region);
    const gwanghaePathBattle = gwanghaePrince && (
      snapshot.storyProgress.objective.includes('선조 친위 내금위')
      || snapshot.storyProgress.objective.includes('삼남 의병')
      || snapshot.storyProgress.title.startsWith('광해 갈림길 완수')
    );
    if (gwanghaePathBattle) {
      const coup = snapshot.storyProgress.objective.includes('선조 친위 내금위')
        || snapshot.storyProgress.title.includes('새 조정의 칼');
      const cleared = snapshot.questProgress.ratio >= 1;
      this.text('quest-eyebrow', coup ? '광해 갈림길 · 분조 쿠데타' : '광해 갈림길 · 왕명 집행');
      this.text('quest-title', snapshot.storyProgress.title);
      this.text('quest-reward', cleared
        ? `MISSION CLEAR · ${coup ? '광화문 친위대 붕괴' : '삼남 의병 진압 완료'}`
        : `전투 현황 · ${snapshot.questProgress.label}`);
    } else if (isJapanRegion(snapshot.region)) {
      const cleared = snapshot.questProgress.ratio >= 1;
      const stage = JAPAN_STAGE_COPY[snapshot.region];
      this.text('quest-eyebrow', `연화 일본편 · 제${stage.chapter}장`);
      this.text('quest-title', cleared ? `${stage.title} 완료 · ${stage.next} 길 개방` : stage.objective);
      this.text('quest-reward', cleared ? `MISSION CLEAR · 다음 지역 ${stage.next}` : `${stage.title} · 북쪽 진군문 봉쇄`);
    } else if (snapshot.region === 'yeongwol') {
      this.text('quest-eyebrow', '영월 관아 외곽전');
      this.text('quest-title', '훈련마당 돌파 · 북문 진입');
      this.text('quest-reward', '내삼문 개방 · 정예 장비');
    } else if (snapshot.region === 'yeongwolhq') {
      this.text('quest-eyebrow', '영월 관아 지휘부');
      this.text('quest-title', '정예 지휘부와 별장 토벌');
      this.text('quest-reward', '정예 장비 · 강화 주문서');
    } else if (snapshot.region === 'jeonjufield') {
      this.text('quest-eyebrow', '전주성 진군 · 제1전역');
      this.text('quest-title', '완산벌 수색대와 요괴 군락 돌파');
      this.text('quest-reward', '전주성 보급품 · 풍남문 진입');
    } else if (snapshot.region === 'jeonjugate') {
      this.text('quest-eyebrow', '전주성 진군 · 대회전');
      this.text('quest-title', '풍남문 진형군을 무너뜨려라');
      this.text('quest-reward', '성문 개방 · 전주성 대읍성');
    } else if (snapshot.region === 'jeonju') {
      this.text('quest-eyebrow', '전주성 진군 · 최종전');
      this.text('quest-title', '큰장과 군영을 지나 감영 지휘부 제압');
      this.text('quest-reward', '전라 감영 전리품 · 강화 주문서');
    } else if (snapshot.region === 'busanjin') {
      this.text('quest-eyebrow', '임진 전역 · 부산진성');
      this.text('quest-title', '왜군 조총대와 선봉장 격파');
      this.text('quest-reward', '군량 보급 · 탄금대 북상로');
    } else if (snapshot.region === 'tangeumdae') {
      const cleared = snapshot.questProgress.ratio >= 1;
      this.text('quest-eyebrow', '임진 전역 · 탄금대');
      this.text('quest-title', cleared ? '왜군 전멸 · 한성 진군로 개방' : '조총수 8명 포함 왜군 전 병력 전멸');
      this.text('quest-reward', cleared ? 'MISSION CLEAR · 광화문 진군' : '한 명이라도 남으면 북문 봉쇄');
    } else if (snapshot.region === 'namhansanseong' || snapshot.region === 'ganghwado') {
      const namhan = snapshot.region === 'namhansanseong';
      const cleared = snapshot.questProgress.label.includes('최종 방어 붕괴');
      this.text(
        'quest-eyebrow',
        `${gwanghaePrince ? '광해 분조 정변' : '하진 남하전'} · ${namhan ? '남한산성' : '강화도'} 3중 방어`,
      );
      this.text('quest-title', cleared
        ? `${namhan ? '산성 행궁' : '강화 행궁'} 최종 방어선 붕괴`
        : snapshot.questProgress.label);
      this.text('quest-reward', cleared
        ? 'FINAL DEFENSE CLEAR · 왕의 마지막 피난처 포위'
        : namhan
          ? '북문 산성로 → 수어장대 → 행궁'
          : '갑곶나루 → 강화산성 → 행궁');
    } else if (snapshot.region === 'pyongyangouter'
      || snapshot.region === 'pyongyanggate'
      || snapshot.region === 'pyongyanginner') {
      const cleared = snapshot.questProgress.ratio >= 1;
      const stage = snapshot.region === 'pyongyangouter'
        ? '평양 외성 북곽'
        : snapshot.region === 'pyongyanggate'
          ? '대동문 공성전'
          : '평양 내성 · 대동관';
      const objective = snapshot.region === 'pyongyangouter'
        ? '외성 목책과 세 방어진을 전멸'
        : snapshot.region === 'pyongyanggate'
          ? '성루 궁수대와 문 안쪽 수비군 격파'
          : '내성 세 전열과 최종 지휘부 제압';
      const next = snapshot.region === 'pyongyangouter'
        ? '대동문 공성로'
        : snapshot.region === 'pyongyanggate'
          ? '평양 내성'
          : '한성 북로';
      this.text('quest-eyebrow', `${frontierArcher ? '하진 남하전' : gwanghaePrince ? '왕세자 분조전' : '평양성 공성전'} · ${stage}`);
      this.text('quest-title', cleared ? `${stage} 확보 · 전진문 개방` : objective);
      this.text('quest-reward', cleared ? `MISSION CLEAR · ${next} 개방` : '수비군 전멸 전 전진문 봉쇄');
    } else if (snapshot.region === 'gyeongbokgate' || snapshot.region === 'gyeongbokcourt' || snapshot.region === 'gyeongbokinner') {
      this.text('quest-eyebrow', frontierArcher
        ? '하진 남하전 · 한성 왕궁'
        : gwanghaePrince ? '왕세자 분조전 · 선조의 어전' : '한성 전역 · 경복궁');
      this.text('quest-title', snapshot.region === 'gyeongbokgate'
        ? frontierArcher
          ? '광화문에서 궁성 첫 수비선 돌파'
          : gwanghaePrince ? '광화문 수문장에게 분조 교지를 보이고 입궐' : '광화문과 흥례문 통과'
        : snapshot.region === 'gyeongbokcourt'
          ? gwanghaePrince ? '근정전 품계석을 지나 선조의 어전으로' : '근정전 내금위 방어진 돌파'
          : frontierArcher
            ? '왕을 대면하고 마지막 피난로 결정'
            : gwanghaePrince ? '선조에게 분조의 장계와 백성의 사정을 아뢰기' : '왕에게 밀약의 증좌 보고');
      this.text('quest-reward', snapshot.region === 'gyeongbokinner'
        ? frontierArcher
          ? '남한산성 · 강화도 추격 분기'
          : gwanghaePrince ? '선조의 윤허 · 분조 관군과 의병 사기 상승' : '북방 군보 · 압록 설원 개방'
        : gwanghaePrince ? '선조의 어전 진입' : '왕의 내전 진입');
    } else if (frontierArcher && JURCHEN_EXPANSION_REGION_IDS.includes(
      snapshot.region as typeof JURCHEN_EXPANSION_REGION_IDS[number],
    )) {
      const campaignRegion = snapshot.region as typeof JURCHEN_EXPANSION_REGION_IDS[number];
      const copy = JURCHEN_STAGE_COPY[campaignRegion];
      const cleared = snapshot.questProgress.ratio >= 1;
      this.text('quest-eyebrow', `하진 연맹전 · 제${copy.chapter}장`);
      this.text('quest-title', cleared ? `${copy.title} 완료` : snapshot.questProgress.label);
      this.text('quest-reward', cleared ? `MISSION CLEAR · ${copy.next}` : copy.objective);
    } else if (snapshot.region === 'jurchenvillage') {
      this.text('quest-eyebrow', frontierArcher ? '하진 서장 · 압록 패전 뒤 패잔병 본영' : '북방 전역 · 장백산 남녘');
      this.text('quest-title', frontierArcher
        ? snapshot.hajinArmy.unified
          ? '세 부족 대회맹 완성 · 압록 설욕군 출정'
          : `백산·송화·흑수 부족 통합 ${snapshot.hajinArmy.alliedTribes} / ${snapshot.hajinArmy.totalTribes}`
        : '여진 대족장과 설원 전사대 대면');
      this.text('quest-reward', frontierArcher
        ? snapshot.hajinArmy.unified
          ? '남쪽 목책문 · 압록 설욕전 개방'
          : '북쪽 자작나무길 · 부족별 사냥과 족장 결투'
        : '대족장 전리품 · 북방 군세 약화');
    } else if (snapshot.region === 'manchufrontier') {
      const frontierEvent = snapshot.activeWorldEvent?.region === 'manchufrontier'
        && snapshot.activeWorldEvent.kind.startsWith('frontier-')
        ? snapshot.activeWorldEvent
        : null;
      this.text('quest-eyebrow', frontierEvent
        ? `북방 사건 · ${frontierSector?.name ?? '압록 전선'}`
        : frontierArcher ? '하진 제8장 · 압록 설욕전' : '북방 전역 · 압록 국경');
      this.text('quest-title', frontierEvent?.title
        ?? (frontierArcher
          ? snapshot.questProgress.ratio >= 1
            ? '열린 남문을 지나 여진 선봉과 계속 남진'
            : '통합 여진군의 첫 화살로 조선 국경 방어진 돌파'
          : '조선 국경군과 함께 여진 선봉 격퇴'));
      const rewardItem = frontierEvent?.rewardItemId ? ITEM_CATALOG[frontierEvent.rewardItemId] : null;
      this.text('quest-reward', frontierEvent
        ? `완수 보상 · ${rewardItem?.name ?? '전선 보급품'} · ${frontierEvent.rewardGold ?? 0}전`
        : frontierArcher
          ? snapshot.questProgress.ratio >= 1
            ? '남진로 개방 · 여진 선봉 5명 합류'
            : 'MISSION CLEAR · 조선 남문 개방'
          : '국경 군보 · 여진 선봉장 장비');
    } else if (isJoseonTownRegion(snapshot.region)) {
      const settlement = JOSEON_TOWN_LAYOUTS[snapshot.region];
      this.text('quest-eyebrow', gwanghaePrince
        ? snapshot.region === 'changdeokgung'
          ? '왕세자 분조 · 출진 준비'
          : '왕세자 분조 순행 · 안전 지역'
        : snapshot.region === 'changdeokgung'
          ? '왕세자 광해의 분조 · 안전 지역'
          : '조선 명읍 순행 · 안전 지역');
      this.text('quest-title', gwanghaePrince
        ? snapshot.questProgress.label
        : snapshot.region === 'changdeokgung'
          ? '승정원 주서에게 민생·변방 장계를 받아 분조 기록에 올리기'
          : `${REGIONS[snapshot.region].name}의 장시와 역참 살피기`);
      this.text('quest-reward', gwanghaePrince
        ? `${snapshot.storyProgress.objective} · 현재 전투 예비병 ${snapshot.factionWar.factions.find((faction) => faction.id === 'joseon-court')?.reserve ?? 0}명`
        : `${settlement.subtitle} · 전투 없는 생활 거점`);
    } else if (snapshot.activeWorldEvent) {
      this.text('quest-eyebrow', '지역 돌발 사건');
      this.text('quest-title', snapshot.activeWorldEvent.title);
      this.text('quest-reward', '토벌 보너스 · 경험 +14 · 엽전 +9');
    } else if (islandRegion) {
      this.text('quest-eyebrow', '울릉도 해방전');
      this.text('quest-title', snapshot.region === 'ulleungdo'
        ? '감옥 포졸을 쓰러뜨리고 북문 탈출'
        : snapshot.region === 'ulleungcoast'
          ? '약초 군락과 해송 산신 제단 탐색'
          : snapshot.region === 'ulleungmeadow'
            ? '억새초원에서 토끼와 물사슴 흔적 추적'
            : snapshot.region === 'ulleunghunt'
              ? '피난민을 돕고 해송 수련 3회'
              : snapshot.region === 'ulleungridge'
                ? `산군 사냥 · 호피 ${tigerPelts} / 3 수집`
                : '탐관오리 관아 토벌');
      this.text('quest-reward', snapshot.region === 'ulleungvillage'
        ? '관아 해방 · 본토 항로 개방'
        : snapshot.region === 'ulleungcoast'
          ? '산삼환 · 무공 재사용 초기화'
          : snapshot.region === 'ulleungmeadow'
            ? '가죽 재료 · 초원 사냥 경험'
            : snapshot.region === 'ulleunghunt'
              ? '낡은 환도 · 수련 경험'
              : snapshot.region === 'ulleungridge'
                ? '산군 호피갑 제작 · 야수 사냥 특화'
                : '북문 개방 · 바람고개 진입');
    } else {
      this.text('quest-eyebrow', '관아 현상수배');
      this.text('quest-title', '솔고개 요물 토벌');
      this.text('quest-reward', '보상 엽전 240');
    }
    this.text('player-affiliation', osakaMudang
      ? '조선인 포로 · 망향 무당'
      : frontierArcher
      ? '여진 연합 · 조선 서얼'
      : gwanghaePrince
      ? '조선 왕세자 · 분조 지휘'
      : snapshot.region === 'busanjin' || snapshot.region === 'tangeumdae'
      ? '조선 남방 의병 선봉'
      : snapshot.region === 'gyeongbokgate' || snapshot.region === 'gyeongbokcourt' || snapshot.region === 'gyeongbokinner'
        ? '왕명 직속 밀사'
        : snapshot.region === 'manchufrontier' || snapshot.region === 'jurchenvillage'
          ? '평안도 북방 척후'
          : snapshot.region === 'jeonjufield' || snapshot.region === 'jeonjugate' || snapshot.region === 'jeonju'
      ? '전주성 감영군 토벌대'
      : snapshot.region === 'yeongwol' || snapshot.region === 'yeongwolhq'
      ? '영월 관군 추적 대상'
      : isJoseonTownRegion(snapshot.region)
        ? snapshot.region === 'changdeokgung' ? '왕세자 분조의 밀사' : '조선 팔도 순행객'
        : islandRegion ? (snapshot.region === 'ulleungdo' ? '울릉 관아 죄수' : '울릉도 의병') : '청해진 토벌대');
    const armor = this.equippedDefinition('armor', snapshot);
    this.text('attack-name', osakaMudang
      ? '초혼방울 지르기'
      : frontierArcher && weapon?.weaponClass === 'bow'
      ? '초원각궁 사격'
      : weapon
      ? weapon.element ? `${ELEMENT_LABEL[weapon.element].name} 베기` : weapon.id === 'dokkaebi-club' ? '방망이 후려치기' : '환도 베기'
      : '맨손 지르기');
    const attackIcon = this.root.querySelector<HTMLElement>('[data-id="attack-icon"]');
    if (attackIcon) {
      attackIcon.classList.remove('ui-icon-attack-weapon', 'ui-icon-attack-unarmed');
      attackIcon.classList.add(weapon ? 'ui-icon-attack-weapon' : 'ui-icon-attack-unarmed');
      attackIcon.innerHTML = '';
    }
    this.text('player-kit', `${weapon?.name ?? '빈손'} · ${armor?.name ?? '복장 미착용'}`);
    this.updateStarterWeaponTutorial(snapshot, Boolean(weapon));
    this.renderInventory(snapshot);

    const targetCard = this.root.querySelector<HTMLElement>('.target-card');
    targetCard?.classList.toggle('is-visible', Boolean(target));
    if (target) {
      const dungeonBoss = 'bossId' in target;
      const campaignBoss = !dungeonBoss && isCampaignBossMonster(target.kind);
      const isBoss = dungeonBoss || campaignBoss;
      const targetHpRatio = target.hp / target.maxHp;
      const state = dungeonBoss ? target.state : target.aiState;
      const dangerousIntent = state === 'brace' || state === 'rally' || state === 'telegraph' || state === 'windup' || state === 'impact' || state === 'charge' || state === 'attack';
      targetCard?.classList.toggle('is-intent-danger', dangerousIntent);
      targetCard?.classList.toggle('is-low-hp', targetHpRatio <= 0.28);
      targetCard?.classList.toggle('is-vulnerable', state === 'stunned' || state === 'recovery');
      targetCard?.classList.toggle('is-boss', isBoss);
      if (targetCard) targetCard.dataset.intent = state;
      this.text('target-name', target.name);
      this.text('target-level', dungeonBoss
        ? `${target.floor}층 수문장 · ${target.phase}단계`
        : campaignBoss
          ? `일본편 최종 우두머리 · ${campaignBossPhase(target)}단계`
          : `위험도 ${target.level}`);
      this.text('target-hp-label', `${Math.ceil(target.hp)} / ${target.maxHp}`);
      this.width('target-hp-fill', targetHpRatio);
      this.text('target-kind', dungeonBoss
        ? '심층 우두머리 · 봉인 전투'
        : campaignBoss
          ? '오사카 군선봉행 결전 · 검은 부채 친위전'
          : monsterRoleLabel(target.kind));
      const monsterIntent = !isBoss ? monsterIntentLabel(target.kind, target.aiState) : null;
      const dungeonBossIntent = dungeonBoss ? ({
        idle: '다음 공격을 살피는 중', chase: '거리를 좁히는 중', telegraph: '⚠ 범위 표시 — 안전 지대로 이동',
        windup: '⚠ 공격 임박', impact: '강력한 공격 발동', recovery: '회복 동작 — 반격 기회',
        'phase-change': '2단계 각성 · 잠시 무적', dead: '수문장 격파',
      }[target.state]) : null;
      const campaignBossIntent = campaignBoss ? ({
        patrol: '검은 부채 뒤로 전장을 살피는 중',
        sleep: '친위대 뒤에서 기세를 감춘 상태',
        alert: '침입자를 발견하고 친위대에 명령',
        chase: '간격을 좁혀 일섬을 준비하는 중',
        circle: '옆을 돌며 빈틈을 노리는 중',
        brace: '친위대 방진을 굳히는 중',
        rally: '⚠ 2단계 각성 · 친위대 총공세',
        telegraph: '⚠ 검은 부채 일섬 준비 — 거리를 벌리십시오',
        charge: '⚠ 군선봉행 돌진',
        attack: '군선봉행 연속베기',
        flee: '전열을 다시 세우는 중',
        return: '결전 중앙으로 복귀 중',
        stunned: '경직됨 · 반격 기회',
      } satisfies Record<MonsterAiState, string>)[target.aiState] : null;
      const intent = dungeonBossIntent ?? campaignBossIntent ?? monsterIntent ?? '전투 중';
      this.text('target-intent', intent);
    } else {
      targetCard?.classList.remove('is-intent-danger', 'is-low-hp', 'is-vulnerable', 'is-boss');
      targetCard?.removeAttribute('data-intent');
    }
  }

  private configureCombatSkillLoadout(origin: PlayerOrigin, bowEquipped: boolean): void {
    const frontierArcher = origin === 'frontier-archer';
    const osakaMudang = origin === 'osaka-mudang';
    const gwanghaePrince = origin === 'gwanghae-prince';
    const frontierBow = frontierArcher && bowEquipped;
    const loadoutKey = `${origin}:${frontierBow ? 'bow' : 'melee'}`;
    if (this.skillLoadoutKey === loadoutKey) return;
    this.skillLoadoutKey = loadoutKey;
    const skillIds = osakaMudang
      ? SHAMAN_ACTIVE_SKILL_IDS
      : frontierBow ? ARCHER_ACTIVE_SKILL_IDS : SWORD_ACTIVE_SKILL_IDS;
    const hotkeys = ['Q', 'W', 'E', 'R', 'T'];
    this.root.querySelectorAll<HTMLButtonElement>('[data-hotkey]').forEach((button, index) => {
      const skillId = skillIds[index];
      button.hidden = !skillId;
      if (!skillId) return;
      const definition = SKILL_CATALOG[skillId];
      button.dataset.skill = skillId;
      button.setAttribute('aria-label', definition.name);
      const icon = button.querySelector<HTMLElement>('[data-hotbar-skill-icon]');
      if (icon) icon.className = `skill-icon ${definition.iconClass}`;
      const name = button.querySelector<HTMLElement>('[data-hotbar-skill-name]');
      if (name) name.textContent = definition.shortName;
      const cooldown = button.querySelector<HTMLElement>('[data-hotbar-skill-cooldown]');
      if (cooldown) {
        cooldown.dataset.id = `skill-cd-${skillId}`;
        cooldown.textContent = 'R1';
      }
      const key = button.querySelector<HTMLElement>('kbd');
      if (key) key.textContent = hotkeys[index];
    });
    const skillTitle = this.root.querySelector<HTMLElement>('#skill-tree-title');
    if (skillTitle) skillTitle.textContent = frontierArcher
      ? '하진의 무예 수련도'
      : osakaMudang
        ? '연화의 굿 수련도'
        : gwanghaePrince ? '광해의 세자 검법 수련도' : '월영 무공 수련도';
    const intro = this.root.querySelector<HTMLElement>('.skill-tree-intro span');
    if (intro) intro.textContent = osakaMudang
        ? '초혼방울 · 부적불 · 진혼굿 · 신내림을 Q · W · E · R로 발동합니다. 무기 없이 원혼을 다룹니다.'
      : frontierArcher
        ? frontierBow
        ? '활 장착: 자동 추적 다발시 · 강궁 관통시 · 화살비 · 봉수연시를 Q · W · E · R · T로 발동합니다.'
        : '환도 장착: Q는 회전베기. 다른 검술은 수련·전수·비급으로 익히며, 활을 다시 들면 신궁술로 즉시 전환됩니다.'
      : '기초 수련 · 장인 전수 · 비급 습득 · 사건 각성으로 익힙니다. Q · W · E · R · T로 발동합니다.';
  }

  handle(event: GameEvent): void {
    if (event.type === 'monster-killed') this.addFeed(`${event.name} 토벌 — 경험 +${event.xp}, 엽전 +${event.gold}`);
    if (event.type === 'frontier-opening-defeated') {
      this.addFeed(`압록 첫 전투 패배 · 생존 전사 ${event.survivingWarriors}명과 ${REGIONS[event.retreatTo].name}으로 퇴각`);
    }
    if (event.type === 'jurchen-gate-blocked') {
      this.addFeed(`부족의 길이 닫혀 있다 · ${REGIONS[event.region].name} 남은 시험 ${event.remaining}`);
    }
    if (event.type === 'jurchen-stage-cleared') {
      this.addFeed(`북방 시험 완료 · ${REGIONS[event.region].name} · 전리금 ${event.rewardGold}전`);
    }
    if (event.type === 'jurchen-tribe-allied') {
      this.addFeed(`${event.tribeName} 맹약 성립 · 여진 부족 통합 ${event.allied} / ${event.total}`);
    }
    if (event.type === 'jurchen-unified') {
      this.addFeed(`대회맹 완성 · 여진 ${event.allied}부 통합 · 압록 설욕군 ${event.armyStrength.toLocaleString('ko-KR')}명 집결`);
    }
    if (event.type === 'frontier-ambush-ready') {
      this.addFeed(`압록 설욕전 개시 · 통합 여진군 선봉 ${event.jurchenCount}명 · 조선 국경군 ${event.joseonCount}명`);
    }
    if (event.type === 'frontier-ambush-fired') {
      this.addFeed(`하진의 첫 화살 · 기습 피해 ${event.damage}`);
    }
    if (event.type === 'frontier-battle-started') {
      this.addFeed(`압록 전선 개전 · 조선군 ${event.fleeingCount}명 패주 · 여진 선봉이 남쪽 방어진을 밀어붙인다.`);
    }
    if (event.type === 'frontier-unit-fled') {
      this.addFeed(`${event.name} 전의 상실 · 남문 방면으로 패주`);
    }
    if (event.type === 'frontier-mission-cleared') {
      this.addFeed(`MISSION CLEAR · 조선 국경군 ${event.defeatedSoldiers}명 제압 · 남진 성문 개방`);
    }
    if (event.type === 'southward-gate-blocked') {
      this.addFeed(`남문 봉쇄 중 · 남은 전선 목표 ${event.remaining}`);
    }
    if (event.type === 'hajin-warband-formed') {
      this.addFeed(`남진 선봉대 편성 완료 · 장창수·각궁수·선봉장 ${event.count}명`);
    }
    if (event.type === 'hajin-reinforcements-called') {
      this.addFeed(`원군 ${event.deployed}명 도착 · 전장 ${event.fielded}명 · 예비군 ${event.reserve}명`);
    }
    if (event.type === 'hajin-reinforcements-blocked') {
      this.addFeed(event.reason === 'mission'
        ? '남문 전투 승리 전에는 원군을 부를 수 없다.'
        : event.reason === 'reserve'
          ? '동원 가능한 예비군이 부족하다.'
          : `전장 지휘 한도에 도달했다 · 현재 ${event.fielded}명`);
    }
    if (event.type === 'gwanghae-reinforcements-called') {
      this.addFeed(`분조군 ${event.deployed}명 출진 · 전장 ${event.fielded}명 · 예비병 ${event.reserve}명`);
    }
    if (event.type === 'gwanghae-reinforcements-blocked') {
      this.addFeed(event.reason === 'register'
        ? '승정원 주서에게 분조 의병 명부를 먼저 받아야 한다.'
        : event.reason === 'suppression'
          ? '왕명 집행을 택해 의병 호출권이 해제되었다.'
          : event.reason === 'reserve'
            ? '호출할 예비병이 부족하다.'
            : event.reason === 'field-capacity'
              ? `전장 지휘 한도에 도달했다 · 현재 ${event.fielded}명`
              : '광해군 이야기에서만 분조군을 호출할 수 있다.');
    }
    if (event.type === 'gwanghae-enemy-reinforcement') {
      this.addFeed(`${event.path === 'coup' ? '왕당군' : '삼남 의병'} 후속대 투입 · 적 예비 ${event.reserve}명 · 총 잔존 ${event.remaining}명`);
    }
    if (event.type === 'gwanghae-militia-rallied') {
      this.addFeed(`${event.label} · ${event.recruits}명 합류 · 예비병 ${event.reserve}명 · ${event.completed}/${event.total}곳 규합`);
      if (event.choiceReady) this.addFeed('일곱 고을 집결 완료 · 쿠데타(분조 정변) 또는 왕명에 따른 의병 진압을 선택해야 한다.');
    }
    if (event.type === 'gwanghae-militia-rally-blocked') {
      this.addFeed(event.reason === 'prerequisite'
        ? '창덕궁 승정원 주서에게 분조 의병 명부를 먼저 받아야 한다.'
        : event.reason === 'already-rallied'
          ? '이 고을의 의병은 이미 분조에 합류했다.'
          : event.reason === 'wrong-region'
            ? '해당 고을의 모집 책임자를 직접 만나야 한다.'
            : '이 인물에게서는 의병을 모집할 수 없다.');
    }
    if (event.type === 'gwanghae-path-chosen') {
      this.addFeed(`${event.title} · 예비병 ${event.reserve}명 · 조정군 세력 ${event.strength}`);
      this.addFeed(event.message);
    }
    if (event.type === 'gwanghae-path-battle-started') {
      this.addFeed(`${event.title} 개전 · 전투 목표 ${event.total}명`);
    }
    if (event.type === 'gwanghae-path-battle-cleared') {
      this.addFeed(`MISSION CLEAR · ${event.title} · ${event.defeated}명 제압`);
      this.addFeed(`전공 보상 · ${event.rewardGold}전 · 경험 ${event.rewardXp}`);
    }
    if (event.type === 'gwanghae-path-blocked') {
      this.addFeed(event.reason === 'rallies-incomplete'
        ? `아직 ${event.remaining ?? 0}곳의 의병 모집이 남았다.`
        : event.reason === 'already-chosen' ? '이미 선택한 광해의 길은 바꿀 수 없다.' : '광해군 이야기에서만 선택할 수 있다.');
    }
    if (event.type === 'hajin-southward-march-started') {
      this.addFeed(`제2전역 진격 · ${REGIONS[event.to].name} · 여진 선봉 ${event.count}명 동행`);
    }
    if (event.type === 'tangeum-gunline-alert') {
      this.addFeed(`탄금대 전멸전 개시 · 왜군 ${event.total}명 · 조총수 ${event.gunners}명`);
    }
    if (event.type === 'tangeum-gate-blocked') {
      this.addFeed(`한성 진군로 봉쇄 · 남은 왜군 ${event.remaining}명을 모두 섬멸해야 한다.`);
    }
    if (event.type === 'tangeum-forces-annihilated') {
      this.addFeed(`탄금대 왜군 ${event.defeated}명 전멸 · 조총수 ${event.gunners}명 제거 · ${event.gold}전`);
    }
    if (event.type === 'king-refuge-choice') {
      this.addFeed(`왕의 어가 피난 사건 · ${event.title} · 남한산성 또는 강화도 추격로를 선택해야 한다.`);
    }
    if (event.type === 'royal-refuge-route-selected') {
      this.addFeed(`${event.routeName} 추격 개시 · ${event.destination}의 세 방어선을 차례로 돌파하라.`);
    }
    if (event.type === 'royal-refuge-stage-cleared') {
      this.addFeed(event.nextStageName
        ? `MISSION CLEAR · ${event.stageName} 붕괴 · ${event.nextStageName} 개방`
        : `MISSION CLEAR · ${event.stageName} 최종 방어 붕괴`);
    }
    if (event.type === 'royal-refuge-final-defense-cleared') {
      this.addFeed(`${event.title} · ${event.description}`);
    }
    if (event.type === 'combat-combo') this.addFeed(`${event.count} 연속 처치 · 월영 기세 ${Math.round(event.momentum)}%`);
    if (event.type === 'perfect-dodge') this.addFeed(`완벽 회피! 월영 기세 ${Math.round(event.momentum)}%`);
    if (event.type === 'momentum-burst') this.addFeed(`월하각성 발동 · ${event.duration}초간 공격·이동·공격 속도 상승`);
    if (event.type === 'momentum-ended') this.addFeed('월하각성의 기세가 가라앉았다.');
    if (event.type === 'player-impact' && event.critical) this.addFeed(`치명적인 일격! ${event.damage} 피해`);
    if (event.type === 'basic-finisher') this.addFeed(`파쇄 일격 · ${event.targets}개 대상 ${event.damage} 피해 · 기세 상승`);
    if (event.type === 'potion') this.addFeed(`산삼환을 삼켰다. 체력 +${event.healed}`);
    if (event.type === 'level-up') this.addFeed(`품계 상승! 무사 ${event.level}품이 되었다.${event.attributePointsGained ? ' 수련점 +1' : ''}`);
    if (event.type === 'attribute-allocated') this.addFeed(`${ATTRIBUTE_LABELS[event.attributeId].name} 수련 · ${event.value} · 남은 점수 ${event.pointsLeft}`);
    if (event.type === 'attributes-reset') this.addFeed(`능력치 배분 초기화 · 수련점 ${event.refunded}점 회수`);
    if (event.type === 'player-defeated') {
      const destination = event.respawnRegion === 'ulleunghunt'
        ? '피난민 해송마을'
        : event.respawnRegion === 'ulleungdo'
          ? '감옥 안전 지점'
          : REGIONS[event.respawnRegion].name;
      this.addFeed(`기력이 다했다. ${destination}에서 다시 일어선다.`);
      this.text('defeat-destination', `3초 후 ${destination}에서 부활`);
      const defeatOverlay = this.root.querySelector<HTMLElement>('.defeat-overlay');
      defeatOverlay?.classList.add('is-visible');
      defeatOverlay?.setAttribute('aria-hidden', 'false');
    }
    if (event.type === 'player-respawn') {
      const destination = event.region === 'ulleunghunt' ? '피난민 해송마을' : event.region === 'ulleungdo' ? '감옥 안전 지점' : '달빛고을';
      this.addFeed(`${destination}에서 기력을 회복했다.`);
      const defeatOverlay = this.root.querySelector<HTMLElement>('.defeat-overlay');
      defeatOverlay?.classList.remove('is-visible');
      defeatOverlay?.setAttribute('aria-hidden', 'true');
    }
    if (event.type === 'skill-cast') this.addFeed(`${SKILL_CATALOG[event.skillId].name} ${event.rank}단 발동`);
    if (event.type === 'skill-impact') this.addFeed(`${event.targets}개 대상에게 ${event.damage} 피해`);
    if (event.type === 'skill-learned') this.addFeed(`무공 강화 성공 · ${SKILL_CATALOG[event.skillId].name} ${event.rank}단`);
    if (event.type === 'skill-unlocked') {
      const source = event.source === 'master' ? '장인 전수' : event.source === 'manual' ? '비급 해독' : event.source === 'event' ? '사건 각성' : '직접 수련';
      this.addFeed(`새 무공 습득 · ${SKILL_CATALOG[event.skillId].name} (${source})`);
    }
    if (event.type === 'skill-teach-blocked') {
      this.addFeed(event.reason === 'level'
        ? `${event.requiredLevel}품에 이르러야 전수받을 수 있다.`
        : event.reason === 'gold'
          ? `전수 비용 ${event.cost}전이 부족하다.`
          : event.reason === 'known'
            ? '이미 전수받은 무공이다.'
            : event.reason === 'prerequisite' && event.requiredSkill
              ? `선행 무공 ${SKILL_CATALOG[event.requiredSkill].name} ${event.requiredRank}단이 필요하다.`
            : '이 무공은 다른 경로로 익혀야 한다.');
    }
    if (event.type === 'skill-blocked') {
      const message = event.reason === 'weapon'
        ? '환도 계열 무기를 장착해야 무공을 쓸 수 있다.'
        : event.reason === 'cooldown'
          ? '아직 무공의 호흡이 돌아오지 않았다.'
          : event.reason === 'locked'
            ? `${SKILL_CATALOG[event.skillId].name}을(를) 아직 익히지 못했다.`
            : event.reason === 'prerequisite' && event.requiredSkill
              ? `선행 무공 ${SKILL_CATALOG[event.requiredSkill].name} ${event.requiredRank}단이 필요하다.`
            : event.reason === 'passive'
              ? '지속 무공은 익히는 순간 항상 적용된다.'
              : '무공 점수나 단계가 부족하다.';
      this.addFeed(message);
    }
    if (event.type === 'follower-recruited') {
      const definition = FOLLOWER_CATALOG[event.follower.kind];
      const route = event.route === 'liberation' ? '울릉도 해방 보답' : definition.routeLabel;
      if (event.route !== 'invasion' && event.route !== 'bunjo') {
        this.addFeed(`동료 합류 · ${event.follower.name} (${definition.title}) · ${route}`);
      }
    }
    if (event.type === 'follower-recruit-blocked') {
      const message = event.reason === 'gold'
        ? `고용 비용 ${event.cost}전이 부족하다.`
        : event.reason === 'level'
          ? `${event.requiredLevel}품부터 이 동료를 이끌 수 있다.`
          : event.reason === 'story'
            ? '감옥에서 살아 나와 신뢰를 얻어야 전향시킬 수 있다.'
            : event.reason === 'skill'
              ? `${SKILL_CATALOG[event.requiredSkill!].name}을 익혀야 인연이 열린다.`
              : event.reason === 'capacity'
                ? '동행 인원은 최대 3명이다.'
                : '이미 함께하고 있는 동료다.';
      this.addFeed(message);
    }
    if (event.type === 'follower-attack') {
      const follower = this.snapshot?.followers.find((entry) => entry.id === event.followerId);
      if (follower && event.damage >= 16) this.addFeed(`${follower.name}의 협공 · ${event.damage} 피해`);
    }
    if (event.type === 'item-drop') this.addFeed(`${event.itemName}이(가) 바닥에 떨어졌다.`);
    if (event.type === 'item-pickup') this.addFeed(`${event.itemName} 습득 — 행낭에 보관했다.`);
    if (event.type === 'item-drop-expired' && event.notable) this.addFeed(`전리품 소멸 · ${event.itemName}을 제때 줍지 못했다.`);
    if (event.type === 'inventory-full') this.addFeed(`행낭이 가득 차 ${event.itemName}을 줍지 못했다.`);
    if (event.type === 'shop-purchase') this.addFeed(`${event.name} 구입 · 엽전 -${event.gold}`);
    if (event.type === 'shop-blocked') this.addFeed(event.reason === 'gold'
      ? '엽전이 부족하다.'
      : event.reason === 'inventory'
        ? '행낭이 가득 찼다.'
        : event.reason === 'health'
          ? '이미 기력이 가득하다.'
          : '강화할 장비를 먼저 장착하거나 +5 미만 장비를 선택해야 한다.');
    if (event.type === 'item-crafted') this.addFeed(`제작 성공 · ${event.itemName}이 행낭에 들어왔다.`);
    if (event.type === 'craft-blocked') this.addFeed(event.reason === 'materials'
      ? '제작 재료가 부족하다. 울릉 산군 호피 3장이 필요하다.'
      : event.reason === 'gold' ? '제작 공임 180전이 부족하다.' : '행낭에 완성품을 넣을 자리가 없다.');
    if (event.type === 'hunt-milestone') this.addFeed(`사냥 도감 ${event.kills}회 달성 · 경험 +${event.xp}, 엽전 +${event.gold}`);
    if (event.type === 'elemental-reaction') {
      const label = {
        'steam-burst': '증기 폭발', 'frost-shatter': '빙결 파쇄', 'toxic-ignition': '독기 점화',
        firestorm: '화염 폭풍', 'ground-discharge': '지맥 방전',
      }[event.reaction];
      this.addFeed(`속성 반응 · ${label} ${event.damage} 피해`);
    }
    if (event.type === 'elemental-heal') this.addFeed(`암영 흡수 · 생명력 +${event.amount}`);
    if (event.type === 'item-equipped') this.addFeed(`${event.itemName} ${event.equipped ? '장착' : '해제'}`);
    if (event.type === 'training-progress') this.addFeed(`나무 수련 ${event.count}회 · 경험 +${event.xp}${event.reward ? ` · ${event.reward} 확보` : ''}`);
    if (event.type === 'enchant-applied') {
      const label = event.target === 'weapon' ? '무기' : '방어구';
      const stat = event.target === 'weapon' ? '공격력' : '방어력';
      this.addFeed(`${label} 강화 +${event.level} 성공 · ${stat} +${event.bonus}`);
    }
    if (event.type === 'enchant-blocked') {
      const label = event.target === 'weapon' ? '무기' : '복장';
      this.addFeed(event.reason === 'unequipped' ? `${label}을 먼저 장착해야 주문서를 사용할 수 있다.` : `${label}은 이미 안전 강화 최대치 +5다.`);
    }
    if (event.type === 'prison-gate-opened') this.addFeed('감옥 포졸을 모두 쓰러뜨렸다. 북문이 열려 윗사냥터와 피난민 마을로 탈출할 수 있다!');
    if (event.type === 'ulleung-village-liberated') this.addFeed('울릉 관아 함락! 백성들이 관아와 선착장을 대신 지키겠다고 맹세했다.');
    if (event.type === 'government-dock-blocked') this.addFeed('울릉 선착장은 봉쇄되어 있다. 탐관오리와 관아 병력을 먼저 쓰러뜨려야 한다.');
    if (event.type === 'government-dock-used') this.addFeed('울릉 선착장에서 배를 타고 본토 달빛고을에 도착했다.');
    if (event.type === 'prison-guards-provoked') this.addFeed(event.cause === 'execution'
      ? '김동혁: “형님, 잘 가십시오.” 포졸들이 처형을 외치며 달려든다.'
      : '“뭐야!” 감옥 포졸 전원이 김동혁에게 달려든다.');
    if (event.type === 'government-guards-provoked') this.addFeed('관아 호각이 울렸다. 외삼문과 형벌 마당의 포졸 전원이 달려든다.');
    if (event.type === 'government-entry-blocked') this.addFeed(`김동혁: “아직은 무리다. ${event.requiredLevel}품이 될 때까지 마을과 윗사냥터에서 더 수련하자.”`);
    if (event.type === 'world-event-started') this.addFeed(`돌발 사건 · ${event.event.title} — ${event.event.description}`);
    if (event.type === 'world-event-ended') this.addFeed(`돌발 사건 종료 · ${event.title}`);
    if (event.type === 'world-event-progress') this.addFeed(`북방 사건 진척 · ${event.progress} / ${event.goal}`);
    if (event.type === 'world-event-completed') {
      this.addFeed(`북방 사건 완수 · ${event.title} — ${event.itemName ? `${event.itemName} · ` : ''}엽전 +${event.gold}`);
    }
    if (event.type === 'landmark-discovered') this.addFeed(`탐험 발견 · ${event.title} — ${event.reward}`);
    if (event.type === 'landmark-blocked') {
      this.addFeed(event.reason === 'used' ? '이미 살펴본 장소다.' : event.reason === 'locked' ? '관아를 해방해야 압수품 궤짝을 열 수 있다.' : '행낭이 가득 차 보상을 챙길 수 없다.');
    }
    if (event.type === 'ulleung-magistrate-spawned') this.addFeed('포졸들이 쓰러지자 내아 본청이 열리고 탐관오리 이방 서병관이 나섰다.');
    if (event.type === 'wako-pact-revealed') this.addFeed('밀약 발각 · 서병관이 왜구에게 울릉도와 선착장을 넘기기로 한 문서가 드러났다.');
    if (event.type === 'wako-invasion-started') this.addFeed(`비상! 서병관이 왜구를 끌어들였다. 선착장에서 침공군 ${event.count}명이 밀려온다.`);
    if (event.type === 'government-dock-guidance') this.addFeed('서병관 격파 · 동쪽 선착장으로 이동해 봉쇄된 본토 항로를 확보하라.');
    if (event.type === 'region-changed') this.addFeed(`${REGIONS[event.region].name}에 진입했다.`);
    if (event.type === 'dungeon-floor-changed') this.addFeed(`${event.title} ${event.floor}층 — ${event.maxFloor}층 중 현재 심도`);
    if (event.type === 'boss-spawned') this.addFeed(`⚔ ${event.boss.floor}층 수문장 ${event.boss.name} 출현 — 계단이 봉인되었다.`);
    if (event.type === 'boss-phase-changed') this.addFeed('수문장이 본색을 드러냈다. 2단계 패턴이 시작된다.');
    if (event.type === 'boss-killed') this.addFeed(`${event.name} 격파 — 다음 층 봉인이 풀렸다.`);
    if (event.type === 'boss-reset') this.addFeed(`${event.floor}층 수문장이 회복되었다. 체크포인트에서 다시 도전할 수 있다.`);
    if (event.type === 'dungeon-complete') this.addFeed('무영광산 100층 정복 — 최심부의 봉인이 무너졌다.');
    const questEvent = event as { type: string; gold?: number };
    if (questEvent.type === 'quest-complete') this.addFeed(`현상수배 완료 — 관아 보상 엽전 +${questEvent.gold ?? 240}`);
  }

  private updateStarterWeaponTutorial(snapshot: Snapshot, hasEquippedWeapon: boolean): void {
    const guide = this.root.querySelector<HTMLElement>('.starter-weapon-tutorial');
    if (!guide) return;
    const starterWeapon = snapshot.inventory.find((item) => item.itemId === 'worn-hwando');

    if (snapshot.region !== 'ulleungdo') {
      guide.classList.remove('is-visible', 'needs-action', 'is-complete');
      guide.setAttribute('aria-hidden', 'true');
      return;
    }

    if (hasEquippedWeapon) {
      if (this.starterTutorialCompletedAt === null) this.starterTutorialCompletedAt = performance.now();
      const showCompletion = performance.now() - this.starterTutorialCompletedAt < 4200;
      guide.classList.toggle('is-visible', showCompletion);
      guide.classList.remove('needs-action');
      guide.classList.add('is-complete');
      guide.setAttribute('aria-hidden', String(!showCompletion));
      this.text('starter-tutorial-step', '3 / 3');
      this.text('starter-tutorial-title', '기본 무장 완료');
      this.text('starter-tutorial-copy', '환도 공격과 Q·W·E 무공이 열렸습니다. 남은 포졸을 쓰러뜨리고 북문을 여십시오.');
      return;
    }

    this.starterTutorialCompletedAt = null;
    guide.classList.add('is-visible');
    guide.classList.toggle('needs-action', Boolean(starterWeapon));
    guide.classList.remove('is-complete');
    guide.setAttribute('aria-hidden', 'false');
    this.text('starter-tutorial-step', starterWeapon ? '2 / 3' : '1 / 3');
    this.text('starter-tutorial-title', starterWeapon ? '압수품 환도 확보' : '빈손으로 살아남기');
    this.text(
      'starter-tutorial-copy',
      starterWeapon
        ? '행낭에서 ‘이 빠진 환도’를 더블클릭·더블탭해 장착하십시오.'
        : '가장 가까운 포졸을 클릭해 맨손 연속 공격으로 먼저 제압하십시오.',
    );
  }

  private updateSettingsControls(settings: GameSettings): void {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-quality]')) {
      const active = button.dataset.quality === settings.graphicsQuality;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-setting]')) {
      const key = button.dataset.setting as keyof Pick<
        GameSettings,
        'cameraShake' | 'damageNumbers' | 'vibration' | 'reducedMotion' | 'autoLoot' | 'highContrastObjectives'
      >;
      const active = settings[key];
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.querySelector<HTMLElement>('em')!.textContent = active ? '켜짐' : '꺼짐';
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-ui-scale]')) {
      const active = Number(button.dataset.uiScale) === settings.uiScale;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  private updateMinimap(snapshot: Snapshot): void {
    const origin = REGION_ORIGINS[snapshot.region];
    const surface = this.root.querySelector<HTMLElement>('[data-id="minimap-surface"]');
    if (!surface) return;
    const clampPercent = (value: number) => Math.max(4, Math.min(96, value));
    const playerX = clampPercent(((snapshot.player.x - origin.x) / MAP_WIDTH) * 100);
    const playerY = clampPercent(((snapshot.player.y - origin.y) / MAP_HEIGHT) * 100);
    surface.style.backgroundImage = `linear-gradient(rgba(16, 13, 8, .2), rgba(5, 7, 5, .35)), url("${MINIMAP_BACKGROUNDS[snapshot.region]}")`;
    surface.style.setProperty('--minimap-player-x', `${playerX}%`);
    surface.style.setProperty('--minimap-player-y', `${playerY}%`);
    const targetMarker = this.root.querySelector<HTMLElement>('[data-id="minimap-target"]');
    const target = snapshot.target;
    const targetInRegion = target && ('bossId' in target ? snapshot.region === 'dungeon' : target.region === snapshot.region);
    if (target && targetInRegion) {
      targetMarker?.classList.add('is-visible');
      targetMarker?.style.setProperty('--minimap-target-x', `${clampPercent(((target.x - origin.x) / MAP_WIDTH) * 100)}%`);
      targetMarker?.style.setProperty('--minimap-target-y', `${clampPercent(((target.y - origin.y) / MAP_HEIGHT) * 100)}%`);
    } else {
      targetMarker?.classList.remove('is-visible');
    }
    const frontierSector = snapshot.region === 'manchufrontier'
      ? frontierSectorAt(snapshot.player.y - REGION_ORIGINS.manchufrontier.y)
      : null;
    this.text('minimap-name', frontierSector?.name ?? REGIONS[snapshot.region].name);
    this.text('minimap-coords', `${Math.round(snapshot.player.x - origin.x)}, ${Math.round(snapshot.player.y - origin.y)}`);
  }

  private renderInventory(snapshot: Snapshot): void {
    if (this.selectedItemId && !snapshot.inventory.some((item) => item.instanceId === this.selectedItemId)) this.selectedItemId = null;
    const visibleItems = this.filteredInventory(snapshot.inventory);
    if (!this.selectedItemId && visibleItems[0]) this.selectedItemId = visibleItems[0].instanceId;
    const signature = JSON.stringify([
      snapshot.inventory, snapshot.equipment, snapshot.player.maxHp, snapshot.attackPower,
      snapshot.defense, snapshot.accuracy, snapshot.evasion,
      snapshot.weaponEnchantLevel, snapshot.armorEnchantLevel,
      snapshot.attributes, snapshot.derivedAttributes,
      snapshot.playerOrigin, snapshot.region,
      this.selectedItemId, this.inventoryFilter, this.inventorySort,
    ]);
    if (signature === this.inventorySignature) return;
    const focusedSelectId = (document.activeElement as HTMLElement | null)?.dataset.selectItem;
    this.inventorySignature = signature;

    for (const filter of this.root.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
      const active = filter.dataset.filter === this.inventoryFilter;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    }
    this.text('inventory-sort-label', this.inventorySort === 'recent' ? '획득순' : '종류순');

    const preview = this.root.querySelector<HTMLElement>('[data-id="character-preview"]');
    if (preview) {
      const layers = resolvePlayerLayers(snapshot.equipment, snapshot.inventory);
      const armor = this.equippedDefinition('armor', snapshot);
      const weapon = this.equippedDefinition('weapon', snapshot);
      const armorAsset = armor
        ? ASSETS.playerArmorLayers[armor.id as keyof typeof ASSETS.playerArmorLayers]
        : undefined;
      const frontierArcher = snapshot.playerOrigin === 'frontier-archer';
      const osakaMudang = snapshot.playerOrigin === 'osaka-mudang';
      const gwanghaePrince = snapshot.playerOrigin === 'gwanghae-prince';
      const characterSheet = osakaMudang
        ? ASSETS.osakaMudang.path
        : frontierArcher
          ? weapon?.weaponClass === 'bow' ? ASSETS.frontierArcher.path : ASSETS.frontierMelee.path
          : gwanghaePrince ? ASSETS.gwanghaePrince.path : ASSETS.playerUnequipped.path;
      const characterName = frontierArcher ? '하진' : osakaMudang ? '연화' : gwanghaePrince ? '왕세자 광해' : '김동혁';
      preview.innerHTML = `
        <span class="avatar-rune"></span>
        <span class="avatar-sprite" style="--character-sheet:url('${characterSheet}')"></span>
        ${!frontierArcher && !osakaMudang && !gwanghaePrince && layers.armor && armorAsset ? `<span class="avatar-sprite avatar-armor-layer" style="--character-sheet:url('${armorAsset.path}')"></span>` : ''}
        ${!osakaMudang && !gwanghaePrince && layers.weapon && weapon && weapon.weaponClass !== 'bow' ? `<img class="avatar-weapon-layer" src="${weapon.iconPath}" alt="">` : ''}
        <span class="avatar-ground"></span>
        <div class="avatar-caption"><b>${characterName}</b><small>${osakaMudang
          ? '포로촌 무복 · 초혼방울'
          : gwanghaePrince
            ? '왕세자 전복 · 호신 환도'
            : `${armor?.name ?? '복장 미착용 · 맨발'} · ${weapon?.name ?? '빈손'}`}</small></div>`;
    }

    const slots = this.root.querySelector<HTMLElement>('[data-id="equipment-slots"]');
    if (slots) {
      slots.innerHTML = (['weapon', 'armor', 'charm'] as EquipmentSlot[]).map((slot) => {
        const instanceId = snapshot.equipment[slot];
        const item = snapshot.inventory.find((entry) => entry.instanceId === instanceId);
        const definition = item ? ITEM_CATALOG[item.itemId] : null;
        const emptyLabel = slot === 'weapon' ? '빈손' : slot === 'armor' ? '미착용' : '없음';
        const symbolClass = slot === 'weapon' ? 'ui-icon-slot-weapon' : slot === 'armor' ? 'ui-icon-slot-armor' : 'ui-icon-slot-charm';
        const equipAttributes = item && definition ? `data-equip-item="${item.instanceId}" aria-label="${definition.name} 해제"` : 'disabled';
        const enhancement = item?.enhancement ?? 0;
        return `<button class="equipment-slot gear-${slot} ${definition ? 'is-filled' : ''}" ${equipAttributes}>
          <span class="gear-symbol"><i class="ui-icon ${symbolClass}"></i></span><span class="gear-copy"><em>${SLOT_LABEL[slot]}</em>
          ${definition ? `<b class="rarity-text-${definition.rarity}">${definition.name}${enhancement ? ` +${enhancement}` : ''}</b><small>${this.itemStats(definition, enhancement)}</small>` : `<i>${emptyLabel}</i>`}</span>
          ${definition ? `<img src="${definition.iconPath}" alt="">` : ''}
        </button>`;
      }).join('');
    }

    const grid = this.root.querySelector<HTMLElement>('[data-id="inventory-grid"]');
    if (grid) {
      const items = visibleItems.map((item, index) => {
        const definition = ITEM_CATALOG[item.itemId];
        const equipped = Object.values(snapshot.equipment).includes(item.instanceId);
        const selected = item.instanceId === this.selectedItemId;
        const enhancement = item.enhancement ? ` +${item.enhancement}` : '';
        return `<button class="inventory-item rarity-${definition.rarity} ${definition.element ? `element-${definition.element}` : ''} ${equipped ? 'is-equipped' : ''} ${selected ? 'is-selected' : ''}" data-select-item="${item.instanceId}" data-slot="${definition.slot}" aria-pressed="${selected}" aria-label="${definition.name}${enhancement}, ${ITEM_SLOT_LABEL[definition.slot]}, ${definition.rarity}, ${this.itemStats(definition, item.enhancement ?? 0)}${equipped ? ', 장착 중' : ''}" title="${definition.description}">
          <span class="slot-index">${String(index + 1).padStart(2, '0')}</span><span class="item-glow"></span>${definition.element ? `<span class="element-glyph element-${definition.element}">${ELEMENT_LABEL[definition.element].glyph}</span>` : ''}<img src="${definition.iconPath}" alt=""><span class="item-stat-line">${this.itemStatBadge(definition, item.enhancement ?? 0)}</span><b>${definition.name}${enhancement}</b>${equipped ? '<em>착용</em>' : ''}
        </button>`;
      });
      while (items.length < snapshot.inventoryCapacity) {
        items.push(`<div class="inventory-empty"><span>${String(items.length + 1).padStart(2, '0')}</span></div>`);
      }
      grid.innerHTML = items.join('');
    }

    const detail = this.root.querySelector<HTMLElement>('[data-id="item-detail"]');
    const selectedItem = snapshot.inventory.find((item) => item.instanceId === this.selectedItemId);
    if (detail) {
      if (!selectedItem) {
        if (snapshot.inventory.length === 0) {
          const firstLoot = snapshot.region === 'ulleungdo'
            ? '감옥의 첫 포졸을 쓰러뜨리면 압수품인 이 빠진 환도를 되찾을 수 있습니다.'
            : '야수와 적병을 쓰러뜨리고 빛나는 전리품을 직접 눌러 습득하십시오.';
          detail.innerHTML = `<div class="item-detail-empty empty-bag-guide">
            <span class="ui-icon ui-icon-attack-unarmed"></span><b>빈 행낭 · 현재 빈손</b><small>${firstLoot}</small>
            <ol><li><em>1</em>적을 클릭해 맨손 공격</li><li><em>2</em>떨어진 전리품을 클릭해 습득</li><li><em>3</em>장비를 더블탭해 즉시 착용</li></ol>
          </div>`;
        } else {
          detail.innerHTML = `<div class="item-detail-empty set-codex"><span class="ui-icon ui-icon-stat-accuracy"></span><b>${ITEM_SET.name}</b><small>솔고개의 정예 요물에게서 획득할 수 있는 영웅 장비입니다.</small>
            <div class="set-codex-icons">${ITEM_SET.pieces.map((itemId) => {
              const item = ITEM_CATALOG[itemId];
              return `<figure><img src="${item.iconPath}" alt=""><figcaption>${item.name}</figcaption></figure>`;
            }).join('')}</div>
            <div class="set-codex-bonuses">${ITEM_SET.bonuses.map((bonus) => `<p><b>${bonus.pieces}세트</b>${bonus.label}</p>`).join('')}</div>
            <em>아이템을 선택하면 현재 장비와 능력치를 비교합니다.</em></div>`;
        }
      } else {
        const definition = ITEM_CATALOG[selectedItem.itemId];
        const isScroll = definition.slot === 'scroll';
        const manualSkill = MANUAL_SKILL_BY_ITEM[definition.id];
        const isMaterial = definition.slot === 'material';
        const isEquippable = !isScroll && !isMaterial;
        const equippedInstanceId = isEquippable ? snapshot.equipment[definition.slot as EquipmentSlot] : null;
        const equippedItem = snapshot.inventory.find((item) => item.instanceId === equippedInstanceId);
        const equippedDefinition = equippedItem ? ITEM_CATALOG[equippedItem.itemId] : null;
        const isEquipped = isEquippable && equippedInstanceId === selectedItem.instanceId;
        const comparisons = isMaterial
          ? '<span class="comparison-current">산군 호피갑 핵심 재료 · 3장 필요</span>'
          : manualSkill
            ? `<span class="comparison-current">${snapshot.skillRanks[manualSkill] > 0 ? '이미 익힌 무공' : `${SKILL_CATALOG[manualSkill].name} 습득 가능`}</span>`
          : isScroll
            ? `<span class="comparison-current">${definition.id === 'weapon-enchant-scroll' ? `현재 무기 +${snapshot.weaponEnchantLevel}` : `현재 방어구 +${snapshot.armorEnchantLevel}`}</span>`
            : isEquipped
              ? '<span class="comparison-current">현재 착용 중</span>'
              : this.comparisonStats(
                definition,
                selectedItem.enhancement ?? 0,
                equippedDefinition,
                equippedItem?.enhancement ?? 0,
              );
        detail.innerHTML = `
          <div class="detail-rarity rarity-text-${definition.rarity}">${definition.rarity} · ${ITEM_SLOT_LABEL[definition.slot]}${definition.element ? ` · <span class="element-name element-${definition.element}">${ELEMENT_LABEL[definition.element].name} 속성</span>` : ''}</div>
          <div class="detail-icon rarity-${definition.rarity}"><span class="item-glow"></span><img src="${definition.iconPath}" alt=""></div>
          <strong>${definition.name}${selectedItem.enhancement ? ` +${selectedItem.enhancement}` : ''}</strong>
          <div class="detail-stats">${this.detailStats(definition, selectedItem.enhancement ?? 0)}</div>
          <p>${definition.description}</p>
          <div class="item-requirements"><span>${isMaterial ? '제작처' : manualSkill ? '습득 방식' : isScroll ? '강화 한도' : '착용 제한'} <b>${isMaterial ? '울릉 대장간' : manualSkill ? '비급 읽기' : isScroll ? '+5 안전 강화' : `${definition.requiredLevel}품 이상`}</b></span><span>매입가 <b>${definition.sellPrice.toLocaleString('ko-KR')}전</b></span></div>
          ${definition.setId ? this.setDetail(snapshot) : ''}
          <div class="detail-comparison"><small>${isMaterial ? '제작 정보' : manualSkill ? '무공 습득' : isScroll ? '강화 상태' : equippedDefinition && !isEquipped ? `${equippedDefinition.name} 대비` : '장비 비교'}</small>${comparisons}</div>
          <button class="detail-equip" ${isMaterial ? 'disabled' : isScroll ? `data-use-item="${selectedItem.instanceId}"` : `data-equip-item="${selectedItem.instanceId}"`}>${isMaterial ? '대장장이에게 가져가기' : manualSkill ? '비급 읽고 익히기' : isScroll ? '주문서 사용하기' : isEquipped ? '장비 해제' : '장착하기'}</button>
          <small class="detail-hint">${isMaterial ? '호피 3장과 180전을 모으면 산군 호피갑을 제작할 수 있습니다.' : `PC 더블클릭 · 모바일 더블탭으로 ${isScroll ? '사용' : '장착'}할 수 있습니다.`}</small>`;
      }
    }

    this.text('inventory-count', `${snapshot.inventory.length} / ${snapshot.inventoryCapacity}`);
    this.text('inventory-attack', `${snapshot.attackPower}–${snapshot.attackPower + 5}`);
    this.text('inventory-hp', String(snapshot.player.maxHp));
    this.text('inventory-defense', String(snapshot.defense));
    this.text('inventory-accuracy', `${snapshot.accuracy}%`);
    this.text('inventory-evasion', `${snapshot.evasion}%`);
    this.text('inventory-power', this.combatPower(snapshot).toLocaleString('ko-KR'));
    this.width('inventory-power-fill', Math.min(1, this.combatPower(snapshot) / 1000));
    this.width('inventory-capacity-fill', snapshot.inventory.length / snapshot.inventoryCapacity);
    if (focusedSelectId) window.requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>(`[data-select-item="${focusedSelectId}"]`)?.focus());
  }

  private filteredInventory(inventory: InventoryItem[]): InventoryItem[] {
    const indexed = inventory.map((item, index) => ({ item, index }));
    const filtered = this.inventoryFilter === 'all'
      ? indexed
      : indexed.filter(({ item }) => ITEM_CATALOG[item.itemId].slot === this.inventoryFilter);
    if (this.inventorySort === 'type') {
      filtered.sort((a, b) => SLOT_ORDER[ITEM_CATALOG[a.item.itemId].slot] - SLOT_ORDER[ITEM_CATALOG[b.item.itemId].slot] || a.index - b.index);
    }
    return filtered.map(({ item }) => item);
  }

  private equippedDefinition(slot: EquipmentSlot, snapshot: Snapshot) {
    const instanceId = snapshot.equipment[slot];
    const item = snapshot.inventory.find((entry) => entry.instanceId === instanceId);
    return item ? ITEM_CATALOG[item.itemId] : null;
  }

  private effectiveItemStats(definition: ItemDefinition, enhancement = 0) {
    return {
      attack: definition.attackBonus + (definition.slot === 'weapon' ? enhancement * 2 : 0),
      hp: definition.hpBonus,
      defense: definition.defenseBonus + (definition.slot === 'armor' ? enhancement * 2 : 0),
      accuracy: definition.accuracyBonus,
      evasion: definition.evasionBonus,
    };
  }

  private itemStats(definition: ItemDefinition, enhancement = 0): string {
    if (definition.id === 'weapon-enchant-scroll') return '무기 공격력 +2';
    if (definition.id === 'armor-enchant-scroll') return '방어구 방어력 +2';
    const manualSkill = MANUAL_SKILL_BY_ITEM[definition.id];
    if (manualSkill) return `${SKILL_CATALOG[manualSkill].name} 습득`;
    if (definition.slot === 'material') return '대장장이 제작 재료';
    const effective = this.effectiveItemStats(definition, enhancement);
    const stats: string[] = [];
    if (effective.attack) stats.push(`공격 +${effective.attack}`);
    if (effective.hp) stats.push(`체력 +${effective.hp}`);
    if (effective.defense) stats.push(`방어 +${effective.defense}`);
    if (effective.accuracy) stats.push(`명중 ${effective.accuracy > 0 ? '+' : ''}${effective.accuracy}`);
    if (effective.evasion) stats.push(`회피 +${effective.evasion}`);
    if (definition.element) stats.push(`${ELEMENT_LABEL[definition.element].name} 속성`);
    return stats.length ? stats.join(' · ') : '장식';
  }

  private itemStatBadge(definition: ItemDefinition, enhancement = 0): string {
    if (definition.id === 'weapon-enchant-scroll') return '무기 강화 +2';
    if (definition.id === 'armor-enchant-scroll') return '방어구 강화 +2';
    if (MANUAL_SKILL_BY_ITEM[definition.id]) return '무공 비급';
    if (definition.slot === 'material') return '제작 재료';
    const effective = this.effectiveItemStats(definition, enhancement);
    if (definition.slot === 'weapon') return `공 ${effective.attack}${definition.element ? ` · ${ELEMENT_LABEL[definition.element].glyph}` : ''}`;
    if (definition.slot === 'armor') return `방 ${effective.defense}${effective.hp ? ` · 체 ${effective.hp}` : ''}`;
    return `공 ${effective.attack} · 방 ${effective.defense}`;
  }

  private detailStats(definition: ItemDefinition, enhancement = 0): string {
    if (definition.id === 'weapon-enchant-scroll') return '<span>강화 효과 <b>공격력 +2</b></span>';
    if (definition.id === 'armor-enchant-scroll') return '<span>강화 효과 <b>방어력 +2</b></span>';
    const manualSkill = MANUAL_SKILL_BY_ITEM[definition.id];
    if (manualSkill) return `<span>습득 무공 <b>${SKILL_CATALOG[manualSkill].name}</b></span><span>효과 <b>${SKILL_CATALOG[manualSkill].effect}</b></span>`;
    if (definition.slot === 'material') return '<span>필요 수량 <b>3장</b></span><span>제작 공임 <b>180전</b></span>';
    const effective = this.effectiveItemStats(definition, enhancement);
    const entries = [
      ['공격력', effective.attack], ['최대 체력', effective.hp],
      ['방어', effective.defense], ['명중', effective.accuracy], ['회피', effective.evasion],
    ] as const;
    return entries.filter(([, value]) => value !== 0).map(([label, value]) =>
      `<span>${label} <b>${value > 0 ? '+' : ''}${value}</b></span>`).join('');
  }

  private comparisonStats(
    definition: ItemDefinition,
    enhancement: number,
    equipped: ItemDefinition | null,
    equippedEnhancement: number,
  ): string {
    const candidateStats = this.effectiveItemStats(definition, enhancement);
    const equippedStats = equipped
      ? this.effectiveItemStats(equipped, equippedEnhancement)
      : { attack: 0, hp: 0, defense: 0, accuracy: 0, evasion: 0 };
    const entries = [
      ['공격', candidateStats.attack - equippedStats.attack],
      ['체력', candidateStats.hp - equippedStats.hp],
      ['방어', candidateStats.defense - equippedStats.defense],
      ['명중', candidateStats.accuracy - equippedStats.accuracy],
      ['회피', candidateStats.evasion - equippedStats.evasion],
    ] as const;
    const changed = entries.filter(([, value]) => value !== 0).map(([label, value]) =>
      `<span class="${value > 0 ? 'positive' : 'negative'}">${label} ${value > 0 ? '+' : ''}${value}</span>`);
    return changed.join('') || '<span>능력 변화 없음</span>';
  }

  private combatPower(snapshot: Snapshot): number {
    return Math.round(snapshot.attackPower * 12 + snapshot.defense * 9 + snapshot.player.maxHp * 1.2
      + snapshot.accuracy * 2 + snapshot.evasion * 7);
  }

  private setDetail(snapshot: Snapshot): string {
    const equippedSetIds = new Set((Object.values(snapshot.equipment) as Array<string | null>)
      .map((instanceId) => snapshot.inventory.find((item) => item.instanceId === instanceId)?.itemId)
      .filter((itemId) => itemId && ITEM_CATALOG[itemId].setId === ITEM_SET.id));
    const ownedIds = new Set(snapshot.inventory.map((item) => item.itemId));
    return `<section class="set-detail"><header><span>SET ITEM</span><b>${ITEM_SET.name}</b><em>${equippedSetIds.size} / ${ITEM_SET.pieces.length}</em></header>
      <ul>${ITEM_SET.pieces.map((itemId) => {
        const item = ITEM_CATALOG[itemId];
        const equipped = equippedSetIds.has(itemId);
        return `<li class="${equipped ? 'is-equipped' : ownedIds.has(itemId) ? 'is-owned' : ''}"><i></i>${item.name}<small>${equipped ? '착용' : ownedIds.has(itemId) ? '보유' : '미보유'}</small></li>`;
      }).join('')}</ul>
      <div>${ITEM_SET.bonuses.map((bonus) => `<p class="${equippedSetIds.size >= bonus.pieces ? 'is-active' : ''}"><b>${bonus.pieces}세트</b>${bonus.label}</p>`).join('')}</div></section>`;
  }

  private addFeed(message: string): void {
    this.feed.unshift(`[${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}] ${message}`);
    this.feed.splice(4);
    this.text('combat-feed', this.feed.join('\n'));
  }

  private text(id: string, value: string): void {
    this.root.querySelectorAll<HTMLElement>(`[data-id="${id}"]`).forEach((element) => {
      if (element.textContent !== value) element.textContent = value;
    });
  }

  private width(id: string, ratio: number): void {
    const element = this.root.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (element) {
      const percent = Math.max(0, Math.min(1, ratio)) * 100;
      element.style.width = `${percent}%`;
      element.setAttribute('aria-valuemin', '0');
      element.setAttribute('aria-valuemax', '100');
      element.setAttribute('aria-valuenow', String(Math.round(percent)));
    }
  }

  private template(): string {
    const worldMapRoutes = WORLD_MAP_ROUTES.map((route) => {
      const geometry = worldMapRouteGeometry(route);
      return `<div
        class="world-map-route"
        data-route-id="${route.id}"
        data-route-mode="${route.mode}"
        title="${route.label} · ${route.travelDays}일"
        style="--route-x:${geometry.x}%;--route-y:${geometry.y}%;--route-length:${geometry.length}%;--route-angle:${geometry.angle}deg;"
        aria-hidden="true"
      ></div>`;
    }).join('');
    const landmarkMapNodes = WORLD_MAP_NODES
      .filter((node) => 'landmarkFrame' in node)
      .map((node) => {
        const landmarkFrame = 'landmarkFrame' in node ? node.landmarkFrame : 0;
        return `
      <button
        class="world-map-node"
        data-world-region="${node.destination}"
        data-world-stronghold="${node.id}"
        data-owner="joseon-court"
        style="--map-x:${node.mapX}%;--map-y:${node.mapY}%;--landmark-frame:${landmarkFrame};--landmark-col:${landmarkFrame % 3};--landmark-row:${Math.floor(landmarkFrame / 3)};"
        aria-label="${node.label} ${node.subtitle}"
      >
        <span class="world-map-landmark" aria-hidden="true"><i>${node.hanja}</i></span>
        <span class="world-map-node-copy">
          <b data-world-node-label>${node.label}</b>
          <small>${node.subtitle}</small>
          <strong data-id="war-node-${node.id}-owner">관군</strong>
          <em><span data-id="war-node-${node.id}-garrison">0명</span><span data-id="war-node-${node.id}-fortification">성벽 0%</span></em>
          <small class="world-map-access-state" data-world-node-state>미발견</small>
        </span>
      </button>`;
      }).join('');
    const settlementMapPins = WORLD_MAP_NODES
      .filter((node) => worldMapNodeKind(node) !== 'stronghold' && !('landmarkFrame' in node))
      .map((node) => `
      <button
        class="world-map-place-pin${worldMapNodeKind(node) === 'outpost' ? ' world-map-outpost-pin' : ''}"
        data-world-region="${node.destination}"
        data-world-settlement-pin="${node.id}"
        data-world-node-kind="${worldMapNodeKind(node)}"
        style="--map-x:${node.mapX}%;--map-y:${node.mapY}%;"
        aria-label="${node.label} ${node.subtitle}"
      >
        <i aria-hidden="true"><span>${node.hanja}</span></i>
        <span><b>${node.label}</b><small data-world-node-state>미발견</small></span>
      </button>`).join('');
    const settlementNodes = WORLD_MAP_NODES
      .filter((node) => worldMapNodeKind(node) !== 'stronghold')
      .map((node) => {
        const preview = REGION_PREVIEWS[node.destination as keyof typeof REGION_PREVIEWS];
        const outpost = worldMapNodeKind(node) === 'outpost';
        return `
        <button
          class="world-map-settlement${outpost ? ' world-map-outpost' : ''}"
          data-world-region="${node.destination}"
          data-world-settlement="${node.id}"
          data-world-node-kind="${worldMapNodeKind(node)}"
          style="${preview ? `--settlement-preview:url('${preview}')` : ''}"
          aria-label="${node.label} ${node.subtitle}, ${outpost ? '봉화와 보급로가 있는 전초선' : '역참과 장시가 있는 안전지대'}"
        >
          <i class="world-map-settlement-seal" aria-hidden="true">${node.hanja}</i>
          <span>
            <b data-world-node-label>${node.label}</b>
            <small>${node.subtitle}</small>
          </span>
          <em aria-label="${outpost ? '전초선 기능' : '고을 편의 시설'}">${outpost
            ? '<strong>보급</strong><strong>봉화</strong><strong>사냥</strong>'
            : '<strong>역참</strong><strong>장시</strong><strong>안전지대</strong>'}</em>
          <small class="world-map-access-state" data-world-node-state>미발견</small>
        </button>`;
      }).join('');
    const travelAtlasGroups = TRAVEL_ATLAS_GROUPS.map((group, index) => `
      <details class="travel-atlas-group" data-travel-group="${group.id}"${index === 0 ? ' open' : ''}>
        <summary><i>${group.hanja}</i><b>${group.label}</b><em>${group.regions.length}곳</em></summary>
        <div>${group.regions.map((regionId) => {
          const region = REGIONS[regionId];
          return `<button data-travel-region="${regionId}" aria-label="${region.name}으로 유령 이동">
            <span><b>${region.name}</b><small>${region.province}</small></span>
            <em data-travel-node-state>목적지 선택</em>
          </button>`;
        }).join('')}</div>
      </details>`).join('');
    const warFactionRows = [
      ['daedong-army', '대동군'],
      ['jurchen-league', '여진'],
      ['japanese-army', '왜군'],
      ['joseon-court', '관군'],
    ].map(([id, label]) => `
      <article data-war-faction="${id}">
        <header><b data-id="war-faction-${id}-name">${label}</b><span data-id="war-faction-${id}-strength">0%</span><em data-id="war-faction-${id}-holdings">0성</em></header>
        <div><i data-war-faction-fill></i></div>
      </article>`).join('');
    return `
      <section class="travel-mode-hud" aria-label="유령 여행 모드">
        <i class="travel-spirit-seal" aria-hidden="true">魂</i>
        <div class="travel-mode-location">
          <span>幽行 · GHOST TRAVEL</span>
          <strong data-id="travel-region">월영 솔고개</strong>
          <small data-id="travel-province">강원도 · 금강산 남녘</small>
        </div>
        <p><b data-id="travel-coords">765, 680</b><span>바닥 클릭 · 지형 통과 이동</span></p>
        <button data-action="world-map" aria-label="유령 여행 전체 지도 열기" aria-controls="world-map-panel" aria-expanded="false">
          <i>地</i><span><b>전체 지도</b><small>${TRAVEL_ATLAS_REGION_IDS.length}개 지역</small></span><kbd>M</kbd>
        </button>
      </section>
      <section class="location-plaque" aria-label="현재 지역">
        <span class="eyebrow" data-id="location-province">강원도 · 금강산 남녘</span>
        <strong data-id="location-name">월영 솔고개</strong>
        <span class="danger-dot" data-id="location-status">분쟁 사냥터</span>
      </section>
      <button class="system-menu-button" data-action="pause-menu" aria-label="게임 메뉴 열기" aria-controls="pause-panel" aria-expanded="false">
        <i></i><i></i><i></i><span>메뉴</span>
      </button>
      <aside class="field-minimap" aria-label="현재 지역 미니맵">
        <header><span data-id="minimap-name">월영 솔고개</span><b>N</b></header>
        <div class="minimap-surface" data-id="minimap-surface">
          <i class="minimap-player" aria-label="현재 위치"></i>
          <em class="minimap-target" data-id="minimap-target" aria-label="선택한 적"></em>
          <span class="minimap-vignette"></span>
        </div>
        <footer><span>현재 위치</span><b data-id="minimap-coords">765, 680</b></footer>
      </aside>

      <section class="player-panel ornate-panel">
        <div class="portrait" aria-label="캐릭터 초상"><img class="player-portrait-image" src="" alt=""><i></i></div>
        <div class="player-info">
          <span class="eyebrow"><span data-id="player-affiliation">청해진 토벌대</span> · <em data-id="player-kit">복장 미착용 · 맨발</em></span>
          <strong class="player-name" data-id="player-name"></strong>
          <span class="rank" data-id="player-level">무사 · 4품</span>
          <div class="bar hp"><span class="bar-stat-label">HP</span><i data-id="hp-fill"></i><b data-id="hp-label">180 / 180</b></div>
          <div class="bar xp"><span class="bar-stat-label">EXP</span><i data-id="xp-fill"></i><b data-id="xp-label">수련 64 / 160</b></div>
        </div>
      </section>

      <section class="target-card ornate-panel">
        <header><span data-id="target-kind">괴이 · 요괴</span><b data-id="target-level">위험도 4</b></header>
        <strong data-id="target-name">검푸른 도깨비</strong>
        <div class="bar target-hp"><i data-id="target-hp-fill"></i><b data-id="target-hp-label">132 / 132</b></div>
        <small data-id="target-intent">선택 대상 · 자동 추적 중</small>
      </section>

      <section class="quest-chip ornate-panel" data-action="story-journal" role="button" tabindex="0" aria-label="이야기 기록 열기">
        <span class="quest-mark" aria-label="진행 중인 퀘스트"><img src="/assets/ui/joseon-quest-order-v1.png" alt=""></span>
        <div><span class="eyebrow" data-id="quest-eyebrow">관아 현상수배</span><strong data-id="quest-title">솔고개 요물 토벌</strong>
          <div class="quest-progress"><i data-id="quest-fill"></i></div>
          <small><span data-id="kill-count">0 / 8</span> · <span data-id="quest-reward">보상 엽전 240</span></small>
        </div>
      </section>

      <section class="starter-weapon-tutorial" aria-live="polite" aria-hidden="true">
        <div class="starter-tutorial-icon"><img src="${ITEM_CATALOG['worn-hwando'].iconPath}" alt=""></div>
        <div class="starter-tutorial-copy">
          <header><span>탈옥 전투 훈련</span><b data-id="starter-tutorial-step">1 / 3</b></header>
          <strong data-id="starter-tutorial-title">빈손으로 살아남기</strong>
          <p data-id="starter-tutorial-copy">가장 가까운 포졸을 클릭해 맨손 연속 공격으로 먼저 제압하십시오.</p>
        </div>
        <button data-action="starter-weapon-tutorial"><span>행낭 열기</span><small>환도 선택 · 더블탭 장착</small></button>
      </section>

      <button class="story-journal-backdrop" data-action="story-backdrop" aria-label="이야기 기록 닫기" aria-hidden="true" tabindex="-1"></button>
      <section class="story-journal-panel" id="story-journal-panel" role="dialog" aria-modal="true" aria-labelledby="story-journal-title" aria-hidden="true" inert>
        <header>
          <img src="/assets/ui/joseon-quest-order-v1.png" alt="">
          <div><span>ASRA CHRONICLE</span><strong id="story-journal-title"></strong></div>
          <em data-id="story-progress-label">1 / 15 장</em>
          <button data-action="story-close" aria-label="이야기 기록 닫기">×</button>
        </header>
        <section class="story-current">
          <small>현재 이야기</small>
          <strong data-id="story-current-title">감옥의 밤</strong>
          <p data-id="story-current-objective">형을 죽인 관아 포졸을 쓰러뜨리고 북문을 연다.</p>
          <button type="button" data-action="story-replay"><span>현재 장면 다시 보기</span><small>대화와 목표를 다시 확인</small></button>
        </section>
        <section class="story-memory-log" aria-label="지나온 장면" hidden>
          <header><span>記憶 · SCENES</span><b>지나온 장면</b></header>
          <ol data-id="story-memories"></ol>
        </section>
        <section class="story-choice-log" aria-label="내가 남긴 선택" hidden>
          <header><span>選擇 · CONSEQUENCES</span><b>내가 남긴 선택</b></header>
          <ol data-id="story-choices"></ol>
        </section>
        <section class="story-profile" aria-label="주인공과 세계관 설정">
          <header>
            <div><small>人物志 · CHARACTER LORE</small><strong data-id="story-profile-epithet">감옥에서 일어난 대동의 칼</strong></div>
            <span data-id="story-profile-era">아스라 세계선 · 가상 조선</span>
          </header>
          <p data-id="story-profile-premise">형의 죽음으로 시작한 복수를 백성이 나라를 되찾는 전쟁으로 바꾼다.</p>
          <div class="story-profile-themes" data-id="story-profile-themes"></div>
          <dl>
            <div><dt>출발지</dt><dd data-id="story-profile-homeland">울릉 관청 감옥</dd></div>
            <div><dt>세력</dt><dd data-id="story-profile-faction">조선 대동 농민군</dd></div>
            <div><dt>신념</dt><dd data-id="story-profile-creed">사람 위에 신분 없다.</dd></div>
            <div><dt>상처</dt><dd data-id="story-profile-wound">형을 눈앞에서 잃었다.</dd></div>
            <div><dt>적대자</dt><dd data-id="story-profile-adversary">탐관오리와 침공군</dd></div>
            <div><dt>동맹</dt><dd data-id="story-profile-allies">해방된 백성</dd></div>
            <div class="story-profile-wide"><dt>되돌릴 수 없는 질문</dt><dd data-id="story-profile-dilemma">복수 뒤 무엇을 남길 것인가.</dd></div>
            <div class="story-profile-wide"><dt>최종 결말</dt><dd data-id="story-profile-ending">백성이 주인인 질서를 세운다.</dd></div>
          </dl>
        </section>
        <section class="story-war-state" aria-label="현재 세력전 상태">
          <header><span>勢力 · CAMPAIGN STATE</span><b data-id="story-war-conflict">천하 세력전</b></header>
          <div><span><small>세력세</small><b data-id="story-war-strength">50%</b></span><span><small>예비병</small><b data-id="story-war-reserve">0명</b></span><span><small>거점</small><b data-id="story-war-holdings">0곳</b></span></div>
          <p data-id="story-war-doctrine">각 세력의 교리와 전쟁 결과가 여기에 기록됩니다.</p>
        </section>
        <section class="story-acts" aria-label="오막 이야기 구조">
          <header><span>五幕 · STORY ARC</span><b>운명의 다섯 막</b></header>
          <div data-id="story-acts"></div>
        </section>
        <header class="story-chapter-heading"><span>章回 · CHAPTERS</span><b>전체 이야기</b><small>완료 · 현재 · 미해금</small></header>
        <ol class="story-chapters" data-id="story-chapters"></ol>
      </section>

      <section class="chat-box" aria-label="전투 기록">
        <header><strong>전투 기록</strong><span>획득 · 경계 · 토벌</span></header>
        <pre class="combat-feed" data-id="combat-feed" aria-live="polite">[경계병] 솔고개에 요사한 기운이 짙어졌소.</pre>
      </section>

      <section class="momentum-hud" aria-label="월영 기세">
        <header><span>MOON MOMENTUM</span><b data-id="momentum-label">월영 기세</b></header>
        <div class="momentum-track">
          <i data-id="momentum-fill" role="progressbar" aria-label="월영 기세"></i>
          <em aria-hidden="true">月</em>
          <strong data-id="momentum-value">0%</strong>
        </div>
      </section>

      <section class="follower-roster-hud" aria-label="동행 부대">
        <header><span>同行 · PARTY</span><b>동행 부대</b><em data-id="follower-count">0 / 3</em></header>
        <aside class="hajin-army-command field-army-command" data-id="field-army-command" hidden>
          <header><span>軍勢 · COMMAND</span><b data-id="army-heading">전장 군세</b></header>
          <div class="field-army-command__strength">
            <span><em data-id="army-progress-label">부족 맹약</em> <b data-id="army-progress">0 / 3</b></span>
            <span><em>전장</em> <b data-id="army-fielded">0 / 25</b></span>
            <span><em>예비병</em> <b data-id="army-reserve">0 / 1,000</b></span>
          </div>
          <div class="field-army-command__opponent" data-id="army-opponent" hidden>
            <span><em data-id="army-opponent-label">상대 잔존</em> <b data-id="army-opponent-count">0 / 0</b></span>
            <small data-id="army-opponent-detail">현장 0 · 투입 중 0 · 예비 0</small>
          </div>
          <button data-action="call-reinforcements"><i>軍</i><span data-id="army-call-label">원군 10명 호출</span><small>여진 3부족 통합 후</small></button>
        </aside>
        <div data-id="follower-roster"><em>주막과 사건에서 동료를 영입할 수 있습니다.</em></div>
      </section>

      <section class="bottom-dock">
        <div class="currency"><span class="coin ui-icon ui-icon-coin" aria-hidden="true"></span><b data-id="gold">128</b></div>
        <div class="action-deck">
          <div class="hotbar">
            <div class="hot-slot active" aria-label="대상 클릭 기본 공격"><kbd>클릭</kbd><span class="hot-slot-icon ui-icon ui-icon-attack-unarmed" data-id="attack-icon" data-icon="attack"></span><small data-id="attack-name">맨손 지르기</small></div>
            <button class="hot-slot skill-slot" data-hotkey="Q" data-skill="whirlwind" aria-label="회전베기"><kbd>Q</kbd><span data-hotbar-skill-icon class="skill-icon skill-whirlwind"></span><small><span data-hotbar-skill-name>회전베기</span> <b data-hotbar-skill-cooldown data-id="skill-cd-whirlwind">R1</b></small></button>
            <button class="hot-slot skill-slot" data-hotkey="W" data-skill="leap-strike" aria-label="도약 내려꽂기"><kbd>W</kbd><span data-hotbar-skill-icon class="skill-icon skill-leap"></span><small><span data-hotbar-skill-name>도약참</span> <b data-hotbar-skill-cooldown data-id="skill-cd-leap-strike">R1</b></small></button>
            <button class="hot-slot skill-slot" data-hotkey="E" data-skill="moon-dash" aria-label="월영 돌진참"><kbd>E</kbd><span data-hotbar-skill-icon class="skill-icon skill-dash"></span><small><span data-hotbar-skill-name>월영참</span> <b data-hotbar-skill-cooldown data-id="skill-cd-moon-dash">R1</b></small></button>
            <button class="hot-slot skill-slot" data-hotkey="R" data-skill="crescent-wave" aria-label="반월 검기"><kbd>R</kbd><span data-hotbar-skill-icon class="skill-icon skill-crescent"></span><small><span data-hotbar-skill-name>반월검기</span> <b data-hotbar-skill-cooldown data-id="skill-cd-crescent-wave">미습득</b></small></button>
            <button class="hot-slot skill-slot" data-hotkey="T" data-skill="tidebreaker-step" aria-label="파도끊기 보법"><kbd>T</kbd><span data-hotbar-skill-icon class="skill-icon skill-tidebreaker-step"></span><small><span data-hotbar-skill-name>파도끊기</span> <b data-hotbar-skill-cooldown data-id="skill-cd-tidebreaker-step">미습득</b></small></button>
            <button class="hot-slot" data-action="potion" aria-label="산삼환 사용"><kbd>2</kbd><span class="potion-icon"><img src="/assets/items/ginseng-pellet-v4.png" alt=""></span><small>산삼환 <b data-id="potions">3</b></small></button>
            <button class="hot-slot quick-step" data-action="quick-step" aria-label="회피 보법"><kbd>Space</kbd><span class="ui-icon ui-icon-quick-step"></span><small data-id="quick-step-label">회피 보법</small></button>
            <div class="hot-slot auto-status" aria-label="현재 전투 방식: 대상 자동 추적"><kbd>AUTO</kbd><span class="ui-icon ui-icon-auto-target"></span><small>대상 추적</small></div>
          </div>
          <div class="bottom-xp" aria-label="수련 경험치"><i data-id="xp-bottom-fill" role="progressbar"></i><b data-id="xp-bottom-label">수련 64 / 160</b></div>
        </div>
        <button class="menu-seal inventory-seal" data-action="inventory" aria-label="행낭 열기" aria-controls="inventory-panel" aria-expanded="false"><span class="ui-icon ui-icon-bag" aria-hidden="true"></span><b>행낭</b><kbd>I</kbd></button>
        <button class="menu-seal skill-seal" data-action="skill-tree" aria-label="무공 수련도 열기" aria-controls="skill-tree-panel" aria-expanded="false"><span class="skill-icon skill-whirlwind"></span><b>무공</b><kbd>K</kbd></button>
        <button class="menu-seal story-seal" data-action="story-journal" aria-label="복수록 열기" aria-controls="story-journal-panel" aria-expanded="false"><span class="story-seal-icon"><img src="/assets/ui/joseon-quest-order-v1.png" alt=""></span><b>기록</b><kbd>J</kbd></button>
        <button class="menu-seal map-seal" data-action="world-map" aria-label="천하 대도시 지도 열기" aria-controls="world-map-panel" aria-expanded="false"><span class="map-seal-icon">地</span><b>지도</b><kbd>M</kbd></button>
      </section>

      <button class="world-map-backdrop" data-action="world-map-backdrop" aria-label="전체 지도 닫기" aria-hidden="true" tabindex="-1"></button>
      <section class="world-map-panel" id="world-map-panel" role="dialog" aria-modal="true" aria-labelledby="world-map-title" aria-hidden="true" inert>
        <header>
          <div><span data-id="world-map-kicker">三軍攻城 · FACTION WAR</span><strong id="world-map-title" data-id="world-map-title">삼군 공성 전황도</strong></div>
          <p data-id="world-map-copy">군사 거점의 공방전과 한성·조선 명읍의 역참길을 함께 살핍니다.</p>
          <button class="world-map-exit-button" data-action="travel-exit" aria-label="유령 여행을 끝내고 시작 화면으로 돌아가기"><span>旅</span><b>여행 종료</b></button>
          <button data-action="world-map-close" aria-label="전체 지도 닫기">×</button>
        </header>
        <div class="world-map-body">
          <div class="world-map-viewport">
            <div class="world-map-canvas" aria-label="조선과 주변 전장의 군사 거점 지도">
              <img src="/assets/ui/joseon-regional-world-map-v1.webp" alt="조선, 만주, 일본 오사카를 잇는 고지도">
              <div class="world-map-cartouche" aria-hidden="true"><span>大東輿行</span><b>천하 행군도</b><small>육로 · 해로 · 성곽</small></div>
              ${worldMapRoutes}
              ${landmarkMapNodes}
              ${settlementMapPins}
            </div>
            <div class="world-map-compass" aria-hidden="true"><i>北</i><span></span><b>N</b></div>
            <div class="world-map-field-legend" aria-hidden="true"><span><i></i>육로</span><span><i></i>해로</span><span><i></i>현재 위치</span></div>
          </div>
          <aside class="world-map-sidebar" data-active-tab="settlements" aria-label="목적지와 전황 명령판">
            <section class="world-map-command-card" data-access="locked" aria-live="polite">
              <div class="world-map-command-preview">
                <img data-id="world-map-selection-preview" src="/assets/environment/campaign/previews/hanseong-sungnyemun-preview-v2.webp" alt="">
                <span data-id="world-map-selection-kicker">군사 거점</span>
                <i data-id="world-map-selection-hanja" aria-hidden="true">城</i>
              </div>
              <div class="world-map-command-copy">
                <span>SELECTED DESTINATION</span>
                <strong data-id="world-map-selection-name">목적지를 선택하십시오</strong>
                <small data-id="world-map-selection-subtitle">지도 위 거점이나 고을을 누르십시오.</small>
                <p><b data-id="world-map-selection-status">경로 확인 중</b><em data-id="world-map-selection-tactical">군세와 역로를 살피는 중입니다.</em></p>
              </div>
              <div class="world-map-itinerary">
                <span><small>현재 위치</small><b data-id="world-map-selection-current">월영 솔고개</b></span>
                <i aria-hidden="true">➜</i>
                <span><small>목적지</small><b data-id="world-map-selection-destination">미선택</b></span>
              </div>
              <div class="world-map-route-order">
                <span><small>이동 경로</small><b data-id="world-map-selection-route">행군로 미정</b></span>
                <span><small>예상 여정</small><b data-id="world-map-selection-time">-</b></span>
                <em data-id="world-map-selection-access">목적지를 선택하십시오</em>
              </div>
              <button data-action="world-map-confirm" disabled>
                <span data-id="world-map-confirm-label">경로 미발견</span>
                <small data-id="world-map-confirm-hint">지도에서 목적지를 선택하십시오</small>
              </button>
            </section>
            <nav class="world-map-sidebar-tabs" aria-label="지도 정보">
              <button data-world-map-tab="settlements" aria-pressed="true"><i>驛</i><span>역참·고을</span></button>
              <button data-world-map-tab="war" aria-pressed="false"><i>軍</i><span>세력 전황</span></button>
            </nav>
            <div class="world-map-sidebar-content">
              <section class="war-council-panel" aria-label="플레이어 세력 전황">
                <div class="world-map-tab-panel world-map-settlements-panel" data-world-map-tab-panel="settlements">
                  <nav class="world-map-settlement-index" aria-label="한성과 조선 명읍 역참">
                    <header><span>驛路 · OUTPOSTS · SAFE SETTLEMENTS</span><b>명읍·신로 전초선</b><small>역참길·봉화·보급로</small></header>
                    <div>${settlementNodes}</div>
                  </nav>
                </div>
                <div class="world-map-tab-panel war-council-war" data-world-map-tab-panel="war">
                  <header>
                    <span>勢力戰況 · WAR COUNCIL</span>
                    <b data-id="war-player-faction">조선 대동 농민군</b>
                    <p data-id="war-player-doctrine">정여립의 대동 사상을 이어 백성의 군세를 모읍니다.</p>
                  </header>
                  <section class="war-primary-stats" aria-label="세력 전력">
                    <article><small>세력세</small><b data-id="war-strength">0%</b></article>
                    <article><small>보유 성</small><b data-id="war-holdings">0성</b></article>
                  </section>
                  <section class="war-meter-block" aria-label="세력세와 예비병">
                    <header><span>세력 기반</span><b data-id="war-strength">0%</b></header>
                    <div class="war-meter war-strength-meter"><i data-id="war-strength-fill" role="progressbar"></i></div>
                    <header><span>호출 가능 예비병</span><b data-id="war-reserve">0 / 0명</b></header>
                    <div class="war-meter war-reserve-meter"><i data-id="war-reserve-fill" role="progressbar"></i></div>
                    <p>회복 속도 <b data-id="war-recovery">+0명 / 분</b></p>
                  </section>
                  <section class="war-conflict-card" aria-label="다음 공방전">
                    <span>NEXT SIEGE · 다음 공방전</span>
                    <b data-id="war-next-conflict">다음 전장을 정찰하는 중</b>
                    <p data-id="war-conflict-sides">공격군 → 수비군</p>
                  </section>
                  <section class="war-faction-balance" aria-label="전체 세력 균형">
                    <header><span>천하 세력 균형</span><small>세력세 · 보유 성</small></header>
                    ${warFactionRows}
                  </section>
                  <section class="war-chronicle" aria-label="최근 전황">
                    <span>최근 전황</span>
                    <p data-id="war-recent">아직 기록된 공방전이 없습니다.</p>
                  </section>
                </div>
              </section>
              <aside class="travel-destination-index" aria-label="유령 여행 전체 지역 선택">
                <header><span>ALL DESTINATIONS</span><b>전 지역 목록</b><em>지상 ${TRAVEL_ATLAS_REGION_IDS.length}곳</em></header>
                <div>${travelAtlasGroups}</div>
              </aside>
            </div>
          </aside>
        </div>
        <footer>
          <span class="war-map-legend"><i data-faction="daedong-army"></i>대동군 <i data-faction="jurchen-league"></i>여진 <i data-faction="japanese-army"></i>왜군 <i data-faction="joseon-court"></i>관군</span>
          <b data-id="world-map-status">성곽은 전황을, 고을과 전초선은 역참·봉화·보급로를 표시합니다.</b>
        </footer>
      </section>

      <button class="inventory-backdrop" data-action="inventory-backdrop" aria-label="인벤토리 닫기" aria-hidden="true" tabindex="-1"></button>
      <section class="inventory-panel" id="inventory-panel" data-mobile-tab="bag" role="dialog" aria-modal="true" aria-labelledby="inventory-title" aria-hidden="true" inert>
        <header class="inventory-titlebar">
          <div class="inventory-heading"><span>CHARACTER · INVENTORY</span><strong id="inventory-title"></strong></div>
          <div class="inventory-channel"><i></i><span><small>사냥 채널</small><b data-id="inventory-channel-region">솔고개 1</b></span></div>
          <div class="inventory-wallet">
            <span><i class="coin ui-icon ui-icon-coin" aria-hidden="true"></i><b data-id="inventory-gold">128</b></span>
            <span><i class="potion-token ui-icon ui-icon-potion-token" aria-hidden="true"></i><b data-id="inventory-potions">3</b></span>
            <button data-action="inventory-close" aria-label="행낭 닫기"><span class="ui-icon ui-icon-close"></span></button>
          </div>
        </header>
        <div class="inventory-body">
          <nav class="inventory-mobile-tabs" aria-label="행낭 화면">
            <button data-inventory-tab="equipment" aria-pressed="false"><span>裝</span><b>장비</b></button>
            <button data-inventory-tab="bag" aria-pressed="true"><span>囊</span><b>소지품</b></button>
            <button data-inventory-tab="stats" aria-pressed="false"><span>武</span><b>능력치</b></button>
            <em><small>현재 품계</small><b data-id="mobile-level">4품</b><small>전투력</small><b data-id="mobile-power">479</b></em>
          </nav>
          <aside class="equipment-column">
            <div class="equipment-title"><div><span>CHARACTER</span><strong>장비 현황</strong></div><b data-id="inventory-level">4품</b></div>
            <div class="character-preview" data-id="character-preview" aria-label="현재 장비를 착용한 캐릭터"></div>
            <div class="equipment-slots" data-id="equipment-slots"></div>
            <section class="ability-panel" aria-label="상세 능력치">
              <header><span>COMBAT ABILITY</span><b>상세 능력치</b><em><small>전투력</small><strong data-id="inventory-power">479</strong></em></header>
              <div class="power-gauge"><i data-id="inventory-power-fill" role="progressbar"></i></div>
              <div class="stat-strip">
                <span title="장비와 세트 효과가 포함된 기본 피해"><i class="ui-icon ui-icon-stat-attack"></i><small>공격력</small><b data-id="inventory-attack">7–12</b></span>
                <span title="받는 물리 피해를 직접 감소"><i class="ui-icon ui-icon-stat-defense"></i><small>방어력</small><b data-id="inventory-defense">0</b></span>
                <span title="현재 장비가 포함된 최대 생명력"><i class="ui-icon ui-icon-stat-hp"></i><small>최대 생명</small><b data-id="inventory-hp">180</b></span>
                <span title="공격이 적중할 기본 확률"><i class="ui-icon ui-icon-stat-accuracy"></i><small>명중</small><b data-id="inventory-accuracy">82%</b></span>
                <span title="적의 공격을 완전히 피할 확률"><i class="ui-icon ui-icon-stat-evasion"></i><small>회피</small><b data-id="inventory-evasion">3%</b></span>
                <span title="품계와 장비를 합산한 현재 성장 단계"><i class="ui-icon ui-icon-stat-rank"></i><small>전투 등급</small><b data-id="inventory-class-rank">무사 4품</b></span>
              </div>
              <section class="attribute-panel" aria-label="기본 능력치 배분">
                <header><span>六藝 · ATTRIBUTES</span><b>기본 능력치</b><em>남은 수련점 <strong data-id="attribute-points">0</strong></em></header>
                <div class="attribute-grid">
                  ${ATTRIBUTE_IDS.map((attributeId) => {
                    const attribute = ATTRIBUTE_LABELS[attributeId];
                    return `<button data-attribute="${attributeId}" title="${attribute.description}"><i>${attribute.hanja}</i><span><b>${attribute.name}</b><small>${attribute.description}</small></span><strong data-id="attribute-${attributeId}">0</strong><em>＋</em></button>`;
                  }).join('')}
                </div>
                <div class="derived-attribute-strip" aria-label="파생 능력치">
                  <span><small>치명타</small><b data-id="derived-critical">0%</b></span>
                  <span><small>상태 위력</small><b data-id="derived-status">0%</b></span>
                  <span><small>동료 지휘</small><b data-id="derived-follower">0%</b></span>
                </div>
                <button class="attribute-reset" data-action="attributes-reset" disabled>배분 초기화</button>
              </section>
            </section>
          </aside>
          <main class="bag-column">
            <div class="bag-title"><div><span>FIELD BAG</span><strong>소지품</strong></div><b data-id="inventory-count">0 / 12</b></div>
            <div class="capacity-bar" aria-label="가방 사용량"><i data-id="inventory-capacity-fill" role="progressbar"></i></div>
            <nav class="bag-toolbar" aria-label="소지품 분류">
              <div class="bag-filters">
                <button data-filter="all" aria-pressed="true">전체</button>
                <button data-filter="weapon" aria-pressed="false">무기</button>
                <button data-filter="armor" aria-pressed="false">복장</button>
                <button data-filter="charm" aria-pressed="false">부적</button>
                <button data-filter="scroll" aria-pressed="false">주문서</button>
                <button data-filter="material" aria-pressed="false">재료</button>
              </div>
              <button class="inventory-sort" data-action="inventory-sort" aria-label="소지품 정렬 방식 변경"><span data-id="inventory-sort-label">획득순</span><i>↕</i></button>
            </nav>
            <div class="inventory-grid" data-id="inventory-grid"></div>
            <section class="bag-hunt-summary" aria-label="사냥 도감 요약">
              <img src="/assets/items/ulleung-tiger-pelt-v1.png" alt="">
              <span><small>獵 · 사냥 기록</small><b><em data-id="hunt-species-count">0</em>종 발견 · 산군 <em data-id="tiger-hunt-count">0</em>회</b></span>
              <strong>호피 <em data-id="tiger-pelt-count">0</em> / 3</strong>
            </section>
            <footer><span>클릭·탭 선택</span><span>더블클릭·더블탭 장착</span><span>빈손은 주먹 공격</span></footer>
          </main>
          <aside class="item-detail" data-id="item-detail" aria-live="polite"></aside>
        </div>
      </section>

      <button class="shop-backdrop" data-action="shop-backdrop" aria-label="상점 닫기" aria-hidden="true" tabindex="-1"></button>
      <section class="shop-panel" data-service="market" role="dialog" aria-modal="true" aria-labelledby="shop-title" aria-hidden="true" inert>
        <header>
          <div><span data-id="shop-kicker">울릉 장터</span><strong data-id="shop-title" id="shop-title">행상인의 보급품</strong></div>
          <span class="shop-wallet"><i class="ui-icon ui-icon-coin"></i><b data-id="shop-gold">128</b></span>
          <button data-action="shop-close" aria-label="상점 닫기">×</button>
        </header>
        <p data-id="shop-description">사냥에 필요한 약과 강화 주문서를 엽전으로 구입합니다.</p>
        <div class="shop-goods shop-goods-market">
          <button data-shop-offer="ginseng-pellet"><img src="/assets/items/ginseng-pellet-v4.png" alt=""><span><b>산삼환</b><small>생명력 회복약 +1</small></span><em>18전</em></button>
          <button data-shop-offer="weapon-enchant-scroll"><img src="/assets/items/weapon-enchant-scroll-v1.png" alt=""><span><b>무기 강화 주문서</b><small>장착 무기 안전 강화</small></span><em>120전</em></button>
          <button data-shop-offer="armor-enchant-scroll"><img src="/assets/items/armor-enchant-scroll-v1.png" alt=""><span><b>방어구 강화 주문서</b><small>장착 복장 안전 강화</small></span><em>120전</em></button>
        </div>
        <div class="shop-goods shop-goods-forge">
          <button data-shop-offer="forge-weapon"><span class="shop-rune">刀</span><span><b>환도 담금질</b><small>장착 무기 강화 +1</small></span><em>30전</em></button>
          <button data-shop-offer="forge-armor"><span class="shop-rune">甲</span><span><b>복장 덧댐</b><small>장착 복장 강화 +1</small></span><em>35전</em></button>
          <button class="craft-offer tiger-craft-offer" data-craft-recipe="tiger-pelt-armor">
            <img src="/assets/items/tiger-pelt-armor-v1.png" alt="">
            <span><b>산군 호피갑 제작</b><small>야수 피해 +25% · 야수 피해 감소 18%</small></span>
            <em>호피 <b data-id="tiger-pelt-count-forge">0</b>/3 · 180전</em>
          </button>
          <button data-shop-offer="ember-hwando"><img src="/assets/items/ember-hwando-v1.png" alt=""><span><b>화령 환도</b><small>화상 · 지속 피해</small></span><em>520전</em></button>
          <button data-shop-offer="frost-hwando"><img src="/assets/items/frost-hwando-v1.png" alt=""><span><b>빙백 환도</b><small>빙결 · 둔화와 경직</small></span><em>590전</em></button>
          <button data-shop-offer="storm-hwando"><img src="/assets/items/storm-hwando-v1.png" alt=""><span><b>뇌명 환도</b><small>감전 · 최대 2명 연쇄</small></span><em>680전</em></button>
          <section class="master-teaching">
            <header><span>武藝 傳授</span><b>대장간 장인의 전수</b></header>
            <button data-master-skill="leap-strike"><span class="skill-icon skill-leap"></span><span><b>도약 내려꽂기</b><small>착지 충격으로 적 무리를 제압한다.</small></span><em>5품 · 120전</em></button>
            <button data-master-skill="iron-constitution"><span class="skill-icon skill-iron-body"></span><span><b>금강 체술</b><small>최대 생명력을 영구히 20% 높인다.</small></span><em>6품 · 180전</em></button>
          </section>
          <section class="forge-hunt-guide">
            <header><span>희귀 사냥 전리품</span><b>지역 속성 환도</b></header>
            <div>
              <figure><img src="/assets/items/venom-hwando-v1.png" alt=""><figcaption><b>독아</b><small>죽림귀 · 중독 확산</small></figcaption></figure>
              <figure><img src="/assets/items/gale-hwando-v1.png" alt=""><figcaption><b>풍백</b><small>왜구 궁수 · 칼바람</small></figcaption></figure>
              <figure><img src="/assets/items/earth-hwando-v1.png" alt=""><figcaption><b>지맥</b><small>광산귀 · 지진 경직</small></figcaption></figure>
              <figure><img src="/assets/items/shadow-hwando-v1.png" alt=""><figcaption><b>월식</b><small>원귀 · 흡혈 처단</small></figcaption></figure>
            </div>
          </section>
        </div>
        <div class="shop-goods shop-goods-inn">
          <button data-shop-offer="inn-rest"><span class="shop-rune">休</span><span><b>국밥과 하룻밤</b><small>생명력 완전 회복</small></span><em>25전</em></button>
          <section class="follower-recruitment">
            <header><span>同行 募集 · RECRUIT</span><b>동행 부대 영입</b><small>최대 3명 · 주인공의 전투 대상을 함께 공격</small></header>
            <button data-recruit-follower="peasant-militia"><span class="recruit-portrait recruit-peasant">民</span><span><b>돌쇠 · 울릉 농민군</b><small>주막 품팔이꾼 설득 · 근접 선봉</small></span><em>1품 · 80전</em></button>
            <button data-recruit-follower="government-defector"><span class="recruit-portrait recruit-guard">槍</span><span><b>최만석 · 전향한 관군 창수</b><small>감옥 탈출 뒤 전향 · 장창 호위</small></span><em>4품 · 140전</em></button>
            <button data-recruit-follower="special-warrior"><span class="recruit-portrait recruit-special">影</span><span><b>청야 · 월영 특수전사</b><small>반월 비급 인연 · 정예 우선 공격</small></span><em>8품 · 260전</em></button>
            <p><b>다른 영입 경로</b><span>울릉 관아 해방 시 농민군이 보답으로 무료 합류하며, 감옥 생존자는 관군 전향의 조건이 됩니다.</span></p>
          </section>
        </div>
        <footer>구매 결과는 전투 기록과 행낭에 즉시 반영됩니다.</footer>
      </section>

      <button class="skill-tree-backdrop" data-action="skill-tree-backdrop" aria-label="무공 수련도 닫기" aria-hidden="true" tabindex="-1"></button>
      <section class="skill-tree-panel" id="skill-tree-panel" role="dialog" aria-modal="false" aria-labelledby="skill-tree-title" aria-hidden="true" inert>
        <header><div><span>MOONSHADOW MARTIAL ARTS</span><strong id="skill-tree-title">월영 무공 수련도</strong></div><em>사용 가능 점수 <b data-id="skill-points">2</b></em><button data-action="skill-tree-close" aria-label="닫기">×</button></header>
        <div class="skill-tree-intro"><b>배우는 길이 다른 무공</b><span>기초 수련 · 장인 전수 · 비급 습득 · 사건 각성으로 익힙니다. Q · W · E · R로 발동합니다.</span></div>
        <div class="skill-tree-scroll">
          <section class="skill-discipline sword-discipline">
            <header><span>攻 · ACTIVE</span><b>실전 검술</b><small>직접 발동하는 공격 무공</small></header>
            <div class="skill-branches">
              <article class="skill-node" data-skill-node="whirlwind"><span class="skill-icon skill-whirlwind"></span><div><small data-skill-source="whirlwind">기초 무공</small><strong>회전베기</strong><p>자신 주위의 적을 한 번에 베는 원형 광역기.</p><b data-id="skill-rank-whirlwind">1 / 3</b></div><button data-learn-skill="whirlwind">단계 강화</button></article>
              <article class="skill-node" data-skill-node="leap-strike"><span class="skill-icon skill-leap"></span><div><small data-skill-source="leap-strike">검술 장인 전수</small><strong>도약 내려꽂기</strong><p>적진에 뛰어들어 착지점에 큰 충격파를 일으킨다.</p><b data-id="skill-rank-leap-strike">미습득</b></div><button data-learn-skill="leap-strike">검술 장인 전수</button></article>
              <article class="skill-node" data-skill-node="moon-dash"><span class="skill-icon skill-dash"></span><div><small data-skill-source="moon-dash">감옥 탈출 각성</small><strong>월영 돌진참</strong><p>전방을 관통하며 경로상의 적을 모두 벤다.</p><b data-id="skill-rank-moon-dash">미습득</b></div><button data-learn-skill="moon-dash">감옥 탈출 각성</button></article>
              <article class="skill-node" data-skill-node="crescent-wave"><span class="skill-icon skill-crescent"></span><div><small data-skill-source="crescent-wave">청람 비급 습득</small><strong>반월 검기</strong><p>반달 검기를 날려 멀리 모인 적을 넓게 벤다.</p><b data-id="skill-rank-crescent-wave">미습득</b></div><button data-learn-skill="crescent-wave">청람 비급 습득</button></article>
              <article class="skill-node" data-skill-node="tidebreaker-step"><span class="skill-icon skill-tidebreaker-step"></span><div><small data-skill-source="tidebreaker-step">서해 조운로 수련</small><strong>파도끊기 보법</strong><p>파도를 가르듯 길게 파고들어 착지점의 적을 밀쳐낸다.</p><b data-id="skill-rank-tidebreaker-step">미습득</b></div><button data-learn-skill="tidebreaker-step">1점으로 수련</button></article>
            </div>
          </section>
           <section class="skill-discipline archer-discipline">
             <header><span>弓 · ACTIVE</span><b>북방 신궁술</b><small>주몽 설화와 기마 궁술에서 영감받은 하진의 고유 무공</small></header>
             <div class="skill-branches">
              <article class="skill-node" data-skill-node="haemosu-volley"><span class="skill-icon skill-haemosu-volley"></span><div><small data-skill-source="haemosu-volley">북방 신궁의 기초</small><strong>졸본 유성시</strong><p>주몽 설화풍의 5~9발이 주변 표적을 스스로 나누어 추적한다.</p><b data-id="skill-rank-haemosu-volley">미습득</b></div><button data-learn-skill="haemosu-volley">단계 강화</button></article>
              <article class="skill-node" data-skill-node="falcon-seeker"><span class="skill-icon skill-falcon-seeker"></span><div><small data-skill-source="falcon-seeker">초원 사냥술</small><strong>삼족오 추적시</strong><p>표적을 찍지 않아도 정예 적부터 찾아 휘어 꽂히는 유도 사격.</p><b data-id="skill-rank-falcon-seeker">미습득</b></div><button data-learn-skill="falcon-seeker">단계 강화</button></article>
              <article class="skill-node" data-skill-node="iron-cavalry-shot"><span class="skill-icon skill-iron-cavalry-shot"></span><div><small data-skill-source="iron-cavalry-shot">기마 강궁 수련</small><strong>동북면 철기시</strong><p>이성계의 신궁 일화풍으로 전방의 병사와 방패를 한 줄로 꿰뚫는다.</p><b data-id="skill-rank-iron-cavalry-shot">미습득</b></div><button data-learn-skill="iron-cavalry-shot">단계 강화</button></article>
               <article class="skill-node" data-skill-node="crescent-arrow-rain"><span class="skill-icon skill-crescent-arrow-rain"></span><div><small data-skill-source="crescent-arrow-rain">신궁의 혈통 각성</small><strong>황산 낙시진</strong><p>반월 대형으로 쏘아 올린 화살비가 넓은 적진을 뒤덮는다.</p><b data-id="skill-rank-crescent-arrow-rain">미습득</b></div><button data-learn-skill="crescent-arrow-rain">단계 강화</button></article>
              <article class="skill-node" data-skill-node="beacon-volley"><span class="skill-icon skill-beacon-volley"></span><div><small data-skill-source="beacon-volley">관동 봉수대 수련</small><strong>팔도 봉수연시</strong><p>봉화가 이어지듯 가까운 적부터 먼 적까지 불화살을 연쇄한다.</p><b data-id="skill-rank-beacon-volley">미습득</b></div><button data-learn-skill="beacon-volley">1점으로 수련</button></article>
             </div>
           </section>
           <section class="skill-discipline shaman-discipline">
             <header><span>巫 · ACTIVE</span><b>망향 진혼굿</b><small>오사카 포로촌의 원혼을 달래고 부리는 연화의 고유 술법</small></header>
             <div class="skill-branches">
               <article class="skill-node" data-skill-node="spirit-bell"><span class="skill-icon skill-spirit-bell"></span><div><small data-skill-source="spirit-bell">연화 고유 굿</small><strong>망향 초혼방울</strong><p>주변의 원혼을 불러 적을 밀어내고 짧게 경직시킨다.</p><b data-id="skill-rank-spirit-bell">미습득</b></div><button data-learn-skill="spirit-bell">단계 강화</button></article>
               <article class="skill-node" data-skill-node="talisman-flame"><span class="skill-icon skill-talisman-flame"></span><div><small data-skill-source="talisman-flame">포로촌 비술</small><strong>살풀이 부적불</strong><p>푸른 혼불 부적을 전방에 던져 넓게 폭발시킨다.</p><b data-id="skill-rank-talisman-flame">미습득</b></div><button data-learn-skill="talisman-flame">단계 강화</button></article>
               <article class="skill-node" data-skill-node="soul-binding-gut"><span class="skill-icon skill-soul-binding"></span><div><small data-skill-source="soul-binding-gut">연화 고유 굿</small><strong>결박 진혼굿</strong><p>혼백의 매듭으로 적 무리를 오래 붙들고 충격을 내린다.</p><b data-id="skill-rank-soul-binding-gut">미습득</b></div><button data-learn-skill="soul-binding-gut">단계 강화</button></article>
               <article class="skill-node" data-skill-node="exile-possession"><span class="skill-icon skill-possession"></span><div><small data-skill-source="exile-possession">오사카 각성</small><strong>유랑신 내림</strong><p>타향의 원혼을 몸에 받아 사방을 휩쓰는 큰 굿을 벌인다.</p><b data-id="skill-rank-exile-possession">미습득</b></div><button data-learn-skill="exile-possession">단계 강화</button></article>
             </div>
           </section>
           <section class="skill-discipline passive-discipline">
            <header><span>內 · PASSIVE</span><b>심법과 체술</b><small>익힌 순간 항상 적용되는 지속 무공</small></header>
            <div class="skill-branches">
              <article class="skill-node" data-skill-node="blade-mastery"><span class="skill-icon skill-blade-mastery"></span><div><small data-skill-source="blade-mastery">무공 점수 수련</small><strong>예도 숙련</strong><p>모든 기본 공격과 무공의 위력을 높인다.</p><b data-id="skill-rank-blade-mastery">미습득</b></div><button data-learn-skill="blade-mastery">1점으로 수련</button></article>
              <article class="skill-node archer-passive-node" data-skill-node="great-bow-mastery"><span class="skill-icon skill-great-bow-mastery"></span><div><small data-skill-source="great-bow-mastery">하진 고유 심법</small><strong>신궁의 강궁법</strong><p>활 공격력 20%와 사거리 45보를 영구히 더한다.</p><b data-id="skill-rank-great-bow-mastery">미습득</b></div><button data-learn-skill="great-bow-mastery">고유 심법</button></article>
              <article class="skill-node" data-skill-node="iron-constitution"><span class="skill-icon skill-iron-body"></span><div><small data-skill-source="iron-constitution">무쇠 장인 전수</small><strong>금강 체술</strong><p>최대 생명력을 영구히 20% 높인다.</p><b data-id="skill-rank-iron-constitution">미습득</b></div><button data-learn-skill="iron-constitution">무쇠 장인 전수</button></article>
              <article class="skill-node" data-skill-node="insight"><span class="skill-icon skill-insight"></span><div><small data-skill-source="insight">원귀의 서책 습득</small><strong>깨달음의 호흡</strong><p>사냥·수련에서 얻는 경험치가 20% 증가한다.</p><b data-id="skill-rank-insight">미습득</b></div><button data-learn-skill="insight">원귀의 서책 습득</button></article>
            </div>
          </section>
        </div>
      </section>

      <button class="pause-backdrop" data-action="pause-backdrop" aria-label="게임으로 돌아가기" aria-hidden="true" tabindex="-1"></button>
      <section class="pause-panel" id="pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title" aria-hidden="true" inert>
        <header>
          <span>ASRA · SYSTEM</span>
          <strong id="pause-title">게임 일시정지</strong>
          <small data-id="pause-region">울릉도 관청 감옥터</small>
          <em data-id="pause-level">무사 4품 · 전투력 479</em>
        </header>
        <section class="quality-settings" aria-label="그래픽 품질">
          <div><small>그래픽 품질</small><strong>기기 성능에 맞는 연출 밀도</strong></div>
          <nav>
            <button data-quality="high" aria-pressed="false"><b>고품질</b><small>환경 연출 우선</small></button>
            <button data-quality="balanced" aria-pressed="true"><b>균형</b><small>권장 설정</small></button>
            <button data-quality="performance" aria-pressed="false"><b>성능</b><small>모바일 안정화</small></button>
          </nav>
        </section>
        <section class="gameplay-settings" aria-label="게임 플레이 설정">
          <button data-setting="cameraShake" aria-pressed="true"><span><b>카메라 충격</b><small>강한 타격 때 화면 반동</small></span><em>켜짐</em></button>
          <button data-setting="damageNumbers" aria-pressed="true"><span><b>피해 숫자</b><small>일반·치명타 피해 표시</small></span><em>켜짐</em></button>
          <button data-setting="vibration" aria-pressed="true"><span><b>모바일 진동</b><small>피격과 처치 촉각 반응</small></span><em>켜짐</em></button>
          <button data-setting="reducedMotion" aria-pressed="false"><span><b>동작 줄이기</b><small>흔들림과 반복 연출 최소화</small></span><em>꺼짐</em></button>
          <button data-setting="autoLoot" aria-pressed="true"><span><b>근거리 자동 줍기</b><small>240보 안의 전리품을 자동 추적</small></span><em>켜짐</em></button>
          <button data-setting="highContrastObjectives" aria-pressed="false"><span><b>목표 고대비</b><small>목표·위험 문구를 더 선명하게</small></span><em>꺼짐</em></button>
        </section>
        <section class="ui-scale-settings" aria-label="인터페이스 크기">
          <span><small>인터페이스 크기</small><b>글자와 조작 버튼 확대</b></span>
          <nav>
            <button data-ui-scale="0.9" aria-pressed="false">작게</button>
            <button data-ui-scale="1" aria-pressed="true">기본</button>
            <button data-ui-scale="1.15" aria-pressed="false">크게</button>
          </nav>
        </section>
        <footer>
          <button data-action="pause-fullscreen"><span>전체 화면</span><small>몰입형 화면 전환</small></button>
          <button class="pause-resume" data-action="pause-resume"><span>계속하기</span><small>ESC</small></button>
        </footer>
      </section>

      <div class="field-guide"><b>사냥법</b><span>바닥 클릭 — 이동</span><span>몬스터 클릭 — 추적·공격</span><span>Space — 회피 보법</span><span>전리품 클릭 — 습득</span><span>I — 가방</span></div>
      <section class="defeat-overlay" aria-hidden="true">
        <span>魂</span><strong>기력이 다했습니다</strong><small data-id="defeat-destination">3초 후 안전 지점에서 부활</small><i></i>
      </section>
      <div class="vignette"></div>
    `;
  }
}
