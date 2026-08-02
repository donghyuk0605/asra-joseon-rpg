import type { ItemId, SkillId } from '../simulation/types';

export type SkillKind = 'active' | 'passive';
export type SkillAcquisition = 'starter' | 'training' | 'master' | 'manual' | 'event';

export type SkillDefinition = {
  id: SkillId;
  name: string;
  shortName: string;
  kind: SkillKind;
  acquisition: SkillAcquisition;
  acquisitionLabel: string;
  description: string;
  effect: string;
  maxRank: number;
  iconClass: string;
  manualItemId?: ItemId;
  masterCost?: number;
  requiredLevel?: number;
  requiredWeapon?: 'bow' | 'melee';
};

export const SKILL_CATALOG: Record<SkillId, SkillDefinition> = {
  whirlwind: {
    id: 'whirlwind',
    name: '회전베기',
    shortName: '회전베기',
    kind: 'active',
    acquisition: 'starter',
    acquisitionLabel: '기초 무공',
    description: '몸을 축으로 환도를 크게 휘둘러 사방의 적을 한 번에 벱니다.',
    effect: '자신 주변 광역 공격',
    maxRank: 3,
    iconClass: 'skill-whirlwind',
    requiredWeapon: 'melee',
  },
  'leap-strike': {
    id: 'leap-strike',
    name: '도약 내려꽂기',
    shortName: '도약참',
    kind: 'active',
    acquisition: 'master',
    acquisitionLabel: '검술 장인 전수',
    description: '대상에게 뛰어들어 칼을 꽂고 강한 충격파를 일으킵니다.',
    effect: '도약 · 착지 광역 · 강한 경직',
    maxRank: 3,
    iconClass: 'skill-leap',
    masterCost: 120,
    requiredLevel: 5,
    requiredWeapon: 'melee',
  },
  'moon-dash': {
    id: 'moon-dash',
    name: '월영 돌진참',
    shortName: '월영참',
    kind: 'active',
    acquisition: 'event',
    acquisitionLabel: '감옥 탈출 각성',
    description: '북문을 열어젖힌 순간 깨우친 돌진 검술로 적진을 관통합니다.',
    effect: '전방 관통 · 진로 광역',
    maxRank: 3,
    iconClass: 'skill-dash',
    requiredWeapon: 'melee',
  },
  'crescent-wave': {
    id: 'crescent-wave',
    name: '반월 검기',
    shortName: '반월검기',
    kind: 'active',
    acquisition: 'manual',
    acquisitionLabel: '청람 비급 습득',
    description: '검끝에서 반달 모양의 검기를 날려 전방의 여러 적을 동시에 벱니다.',
    effect: '원거리 부채꼴 광역 공격',
    maxRank: 3,
    iconClass: 'skill-crescent',
    manualItemId: 'crescent-manual',
    requiredWeapon: 'melee',
  },
  'haemosu-volley': {
    id: 'haemosu-volley',
    name: '졸본 유성시',
    shortName: '유성시',
    kind: 'active',
    acquisition: 'starter',
    acquisitionLabel: '북방 신궁의 기초',
    description: '주몽 설화의 신궁에서 영감 받은 궁술. 허공에 흩뿌린 화살이 살아 있는 적을 스스로 찾아 나뉘어 꽂힙니다.',
    effect: '자동 탐색 · 5~9발 추적 사격',
    maxRank: 3,
    iconClass: 'skill-haemosu-volley',
    requiredWeapon: 'bow',
  },
  'falcon-seeker': {
    id: 'falcon-seeker',
    name: '삼족오 추적시',
    shortName: '추적시',
    kind: 'active',
    acquisition: 'starter',
    acquisitionLabel: '초원 사냥술',
    description: '표적이 없어도 가장 가까운 적의 숨결을 좇아 세 갈래 화살을 휘어 보냅니다.',
    effect: '무지정 사용 · 정예 우선 유도',
    maxRank: 3,
    iconClass: 'skill-falcon-seeker',
    requiredWeapon: 'bow',
  },
  'iron-cavalry-shot': {
    id: 'iron-cavalry-shot',
    name: '동북면 철기시',
    shortName: '철기시',
    kind: 'active',
    acquisition: 'training',
    acquisitionLabel: '기마 강궁 수련',
    description: '이성계의 신궁 일화에서 영감 받은 기동 궁술. 흔들림 없는 강궁으로 일렬의 적과 방패를 꿰뚫습니다.',
    effect: '직선 480보 · 다중 관통 · 강한 경직',
    maxRank: 3,
    iconClass: 'skill-iron-cavalry-shot',
    requiredWeapon: 'bow',
  },
  'crescent-arrow-rain': {
    id: 'crescent-arrow-rain',
    name: '황산 낙시진',
    shortName: '낙시진',
    kind: 'active',
    acquisition: 'event',
    acquisitionLabel: '신궁의 혈통 각성',
    description: '반월 대형으로 쏘아 올린 화살비가 목표 주변을 넓게 뒤덮습니다.',
    effect: '원거리 광역 화살비 · 무리 제압',
    maxRank: 3,
    iconClass: 'skill-crescent-arrow-rain',
    requiredWeapon: 'bow',
  },
  'spirit-bell': {
    id: 'spirit-bell',
    name: '망향 초혼방울',
    shortName: '초혼방울',
    kind: 'active',
    acquisition: 'starter',
    acquisitionLabel: '연화 고유 굿',
    description: '고향을 떠나 죽은 포로들의 이름을 방울로 불러 주변의 적을 밀어냅니다.',
    effect: '자신 주변 광역 · 짧은 경직',
    maxRank: 3,
    iconClass: 'skill-spirit-bell',
  },
  'talisman-flame': {
    id: 'talisman-flame',
    name: '살풀이 부적불',
    shortName: '부적불',
    kind: 'active',
    acquisition: 'starter',
    acquisitionLabel: '포로촌 비술',
    description: '원한을 먹인 부적을 전방에 날려 푸른 혼불로 터뜨립니다.',
    effect: '전방 원혼 폭발 · 광역 공격',
    maxRank: 3,
    iconClass: 'skill-talisman-flame',
  },
  'soul-binding-gut': {
    id: 'soul-binding-gut',
    name: '결박 진혼굿',
    shortName: '진혼굿',
    kind: 'active',
    acquisition: 'starter',
    acquisitionLabel: '연화 고유 굿',
    description: '목표 주변에 혼백의 매듭을 지어 오래 붙들고 진혼의 충격을 내립니다.',
    effect: '넓은 범위 · 강한 경직',
    maxRank: 3,
    iconClass: 'skill-soul-binding',
  },
  'exile-possession': {
    id: 'exile-possession',
    name: '유랑신 내림',
    shortName: '신내림',
    kind: 'active',
    acquisition: 'starter',
    acquisitionLabel: '오사카 각성',
    description: '타향에서 죽은 원혼을 몸에 받아 사방을 휩쓰는 큰 굿을 벌입니다.',
    effect: '대범위 강타 · 긴 재사용 대기',
    maxRank: 3,
    iconClass: 'skill-possession',
  },
  'blade-mastery': {
    id: 'blade-mastery',
    name: '예도 숙련',
    shortName: '예도 숙련',
    kind: 'passive',
    acquisition: 'training',
    acquisitionLabel: '무공 점수 수련',
    description: '호흡과 칼끝을 가다듬어 모든 기본 공격과 무공의 위력을 높입니다.',
    effect: '공격력 +20%',
    maxRank: 1,
    iconClass: 'skill-blade-mastery',
  },
  'great-bow-mastery': {
    id: 'great-bow-mastery',
    name: '신궁의 강궁법',
    shortName: '강궁법',
    kind: 'passive',
    acquisition: 'starter',
    acquisitionLabel: '하진 고유 심법',
    description: '활을 들었을 때 공격력과 사거리가 크게 늘어나고 추적 화살의 위력이 높아집니다.',
    effect: '활 공격력 +20% · 사거리 +45',
    maxRank: 1,
    iconClass: 'skill-great-bow-mastery',
    requiredWeapon: 'bow',
  },
  'iron-constitution': {
    id: 'iron-constitution',
    name: '금강 체술',
    shortName: '금강 체술',
    kind: 'passive',
    acquisition: 'master',
    acquisitionLabel: '무쇠 장인 전수',
    description: '대장간의 무거운 수련법으로 몸을 단련해 최대 생명력을 늘립니다.',
    effect: '최대 체력 +20%',
    maxRank: 1,
    iconClass: 'skill-iron-body',
    masterCost: 180,
    requiredLevel: 6,
  },
  insight: {
    id: 'insight',
    name: '깨달음의 호흡',
    shortName: '깨달음',
    kind: 'passive',
    acquisition: 'manual',
    acquisitionLabel: '원귀의 서책 습득',
    description: '싸움에서 배움을 끌어내는 호흡법으로 모든 전투 경험 획득량을 높입니다.',
    effect: '경험치 획득 +20%',
    maxRank: 1,
    iconClass: 'skill-insight',
    manualItemId: 'insight-manual',
  },
};

export const ACTIVE_SKILL_IDS = (Object.values(SKILL_CATALOG)
  .filter((skill) => skill.kind === 'active')
  .map((skill) => skill.id)) as SkillId[];

export const PASSIVE_SKILL_IDS = (Object.values(SKILL_CATALOG)
  .filter((skill) => skill.kind === 'passive')
  .map((skill) => skill.id)) as SkillId[];

export const MANUAL_SKILL_BY_ITEM: Partial<Record<ItemId, SkillId>> = Object.fromEntries(
  Object.values(SKILL_CATALOG)
    .filter((skill) => skill.manualItemId)
    .map((skill) => [skill.manualItemId!, skill.id]),
);

export const SWORD_ACTIVE_SKILL_IDS: SkillId[] = [
  'whirlwind', 'leap-strike', 'moon-dash', 'crescent-wave',
];

export const ARCHER_ACTIVE_SKILL_IDS: SkillId[] = [
  'haemosu-volley', 'falcon-seeker', 'iron-cavalry-shot', 'crescent-arrow-rain',
];

export const SHAMAN_ACTIVE_SKILL_IDS: SkillId[] = [
  'spirit-bell', 'talisman-flame', 'soul-binding-gut', 'exile-possession',
];

export const ARCHER_SKILL_IDS: ReadonlySet<SkillId> = new Set([
  ...ARCHER_ACTIVE_SKILL_IDS,
  'great-bow-mastery',
]);
