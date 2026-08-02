import type { CraftRecipeId, EquipmentSlot, ItemId, ItemSlot, WeaponElement } from '../simulation/types';

export type ItemDefinition = {
  id: ItemId;
  name: string;
  slot: ItemSlot;
  rarity: '낡음' | '일반' | '희귀' | '영웅';
  description: string;
  attackBonus: number;
  hpBonus: number;
  defenseBonus: number;
  accuracyBonus: number;
  evasionBonus: number;
  requiredLevel: number;
  sellPrice: number;
  setId?: 'moon-warden';
  setPiece?: string;
  iconKey: string;
  iconPath: string;
  element?: WeaponElement;
  passiveId?: 'beast-hunter';
  weaponClass?: 'bow' | 'melee';
};

export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  'worn-hwando': {
    id: 'worn-hwando', name: '이 빠진 환도', slot: 'weapon', rarity: '낡음',
    description: '날은 상했지만 주먹보다는 훨씬 믿음직하다.', attackBonus: 9, hpBonus: 0,
    defenseBonus: 0, accuracyBonus: 2, evasionBonus: 0, requiredLevel: 1, sellPrice: 34,
    iconKey: 'item-worn-hwando-v4', iconPath: '/assets/items/worn-hwando-v4.png',
  },
  'frontier-horn-bow': {
    id: 'frontier-horn-bow', name: '북방 초원각궁', slot: 'weapon', rarity: '일반',
    description: '하진이 여진 사냥꾼에게 배운 방식으로 다듬은 각궁. 먼 거리의 적을 먼저 꿰뚫는다.',
    attackBonus: 11, hpBonus: 0, defenseBonus: 0, accuracyBonus: 7, evasionBonus: 2,
    requiredLevel: 1, sellPrice: 64,
    iconKey: 'item-frontier-horn-bow-v1', iconPath: '/assets/items/frontier-horn-bow-v1.png', weaponClass: 'bow',
  },
  'white-birch-bow': {
    id: 'white-birch-bow', name: '백화 단궁', slot: 'weapon', rarity: '희귀',
    description: '하얀 자작나무와 물소뿔을 얇게 겹친 짧은 활. 달리며 쏘는 연사에 알맞다.',
    attackBonus: 15, hpBonus: 0, defenseBonus: 0, accuracyBonus: 9, evasionBonus: 4,
    requiredLevel: 2, sellPrice: 180,
    iconKey: 'item-white-birch-bow-v1', iconPath: '/assets/items/white-birch-bow-v1.png', weaponClass: 'bow',
  },
  'iron-horn-warbow': {
    id: 'iron-horn-warbow', name: '철각 전궁', slot: 'weapon', rarity: '영웅',
    description: '철편과 큰 짐승의 뿔을 압착한 전투용 강궁. 관통시의 경직과 피해를 끌어올린다.',
    attackBonus: 23, hpBonus: 0, defenseBonus: 2, accuracyBonus: 11, evasionBonus: 1,
    requiredLevel: 6, sellPrice: 680,
    iconKey: 'item-iron-horn-warbow-v1', iconPath: '/assets/items/iron-horn-warbow-v1.png', weaponClass: 'bow',
  },
  'thunderbird-bow': {
    id: 'thunderbird-bow', name: '천응 뇌궁', slot: 'weapon', rarity: '영웅',
    description: '번개 맞은 주목과 은실로 만든 신궁. 적을 찾아 휘는 화살마다 감전이 번진다.',
    attackBonus: 26, hpBonus: 0, defenseBonus: 0, accuracyBonus: 14, evasionBonus: 5,
    requiredLevel: 9, sellPrice: 980, element: 'lightning',
    iconKey: 'item-thunderbird-bow-v1', iconPath: '/assets/items/thunderbird-bow-v1.png', weaponClass: 'bow',
  },
  'northwind-warbow': {
    id: 'northwind-warbow', name: '북풍 철각궁', slot: 'weapon', rarity: '영웅',
    description: '압록의 찬바람에 말린 뿔과 자작나무를 철띠로 묶은 전궁. 전선 사건을 완수한 북방 사수에게만 전해진다.',
    attackBonus: 20, hpBonus: 0, defenseBonus: 1, accuracyBonus: 12, evasionBonus: 4,
    requiredLevel: 4, sellPrice: 540,
    iconKey: 'item-northwind-warbow-v1', iconPath: '/assets/items/northwind-warbow-v1.png', weaponClass: 'bow',
  },
  'dokkaebi-club': {
    id: 'dokkaebi-club', name: '검푸른 방망이', slot: 'weapon', rarity: '희귀',
    description: '도깨비의 기운이 남아 있는 무거운 타격 무기.', attackBonus: 15, hpBonus: 0,
    defenseBonus: 1, accuracyBonus: -1, evasionBonus: 0, requiredLevel: 4, sellPrice: 118,
    iconKey: 'item-dokkaebi-club-v4', iconPath: '/assets/items/dokkaebi-club-v4.png',
  },
  'hunter-durumagi': {
    id: 'hunter-durumagi', name: '토벌꾼 두루마기', slot: 'armor', rarity: '일반',
    description: '두꺼운 무명과 가죽을 덧댄 사냥 복장.', attackBonus: 0, hpBonus: 34,
    defenseBonus: 7, accuracyBonus: 0, evasionBonus: 2, requiredLevel: 2, sellPrice: 76,
    iconKey: 'item-hunter-durumagi-v4', iconPath: '/assets/items/hunter-durumagi-v4.png',
  },
  'boar-tusk-charm': {
    id: 'boar-tusk-charm', name: '산령 엄니 부적', slot: 'charm', rarity: '일반',
    description: '산돼지 엄니에 붉은 실을 감은 호신 부적.', attackBonus: 3, hpBonus: 10,
    defenseBonus: 2, accuracyBonus: 1, evasionBonus: 1, requiredLevel: 2, sellPrice: 52,
    iconKey: 'item-boar-tusk-charm-v4', iconPath: '/assets/items/boar-tusk-charm-v4.png',
  },
  'frontier-lamellar-coat': {
    id: 'frontier-lamellar-coat', name: '철비늘 변경 전포', slot: 'armor', rarity: '희귀',
    description: '여진의 가죽 전포에 조선식 철찰을 덧댄 변경 전투복. 화살과 창끝을 막으면서도 말을 타기 편하다.',
    attackBonus: 1, hpBonus: 48, defenseBonus: 10, accuracyBonus: 0, evasionBonus: 4,
    requiredLevel: 3, sellPrice: 280,
    iconKey: 'item-frontier-lamellar-coat-v1', iconPath: '/assets/items/frontier-lamellar-coat-v1.png',
  },
  'falcon-eye-bracer': {
    id: 'falcon-eye-bracer', name: '매눈 활깍지', slot: 'charm', rarity: '희귀',
    description: '매의 눈을 새긴 북방 사수의 팔보호구. 활시위를 놓는 순간 손목을 고정해 먼 표적의 급소를 노린다.',
    attackBonus: 4, hpBonus: 14, defenseBonus: 2, accuracyBonus: 6, evasionBonus: 3,
    requiredLevel: 2, sellPrice: 220,
    iconKey: 'item-falcon-eye-bracer-v1', iconPath: '/assets/items/falcon-eye-bracer-v1.png',
  },
  'border-war-dispatch': {
    id: 'border-war-dispatch', name: '압록 변경 군보', slot: 'material', rarity: '희귀',
    description: '조선 진보의 병력 교대와 군량 길을 기록한 봉인 군보. 북방 사건과 거래에서 높은 값을 받는다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 120,
    iconKey: 'item-border-war-dispatch-v1', iconPath: '/assets/items/border-war-dispatch-v1.png',
  },
  'jurchen-iron-arrowheads': {
    id: 'jurchen-iron-arrowheads', name: '여진 흑철촉 묶음', slot: 'material', rarity: '일반',
    description: '북방의 거친 철을 길고 무겁게 벼린 화살촉. 갑옷 틈을 노리는 관통시에 사용한다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 26,
    iconKey: 'item-jurchen-iron-arrowheads-v1', iconPath: '/assets/items/jurchen-iron-arrowheads-v1.png',
  },
  'joseon-border-token': {
    id: 'joseon-border-token', name: '조선 국경 군패', slot: 'material', rarity: '일반',
    description: '압록 진보 수비군의 이름과 소속을 새긴 목패. 쓰러진 병사의 신원과 국경군 배치를 증명한다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 38,
    iconKey: 'item-joseon-border-token-v1', iconPath: '/assets/items/joseon-border-token-v1.png',
  },
  'moonsteel-hwando': {
    id: 'moonsteel-hwando', name: '월강 환도', slot: 'weapon', rarity: '영웅',
    description: '달빛을 머금은 강철로 벼린 월영 수비대의 환도.', attackBonus: 22, hpBonus: 0,
    defenseBonus: 2, accuracyBonus: 6, evasionBonus: 0, requiredLevel: 4, sellPrice: 420,
    setId: 'moon-warden', setPiece: '월강의 칼날',
    iconKey: 'item-moonsteel-hwando-v4', iconPath: '/assets/items/moonsteel-hwando-v4.png',
  },
  'ember-hwando': {
    id: 'ember-hwando', name: '화령 환도', slot: 'weapon', rarity: '영웅',
    description: '불씨를 먹인 칼날. 공격하면 적을 4초간 불태워 지속 피해를 준다.',
    attackBonus: 19, hpBonus: 0, defenseBonus: 1, accuracyBonus: 4, evasionBonus: 0,
    requiredLevel: 5, sellPrice: 520, element: 'fire',
    iconKey: 'item-ember-hwando-v1', iconPath: '/assets/items/ember-hwando-v1.png',
  },
  'frost-hwando': {
    id: 'frost-hwando', name: '빙백 환도', slot: 'weapon', rarity: '영웅',
    description: '울릉 해풍의 냉기를 벼린 칼날. 적을 얼려 이동과 공격을 늦추고 짧게 경직시킨다.',
    attackBonus: 18, hpBonus: 0, defenseBonus: 2, accuracyBonus: 5, evasionBonus: 1,
    requiredLevel: 6, sellPrice: 590, element: 'ice',
    iconKey: 'item-frost-hwando-v1', iconPath: '/assets/items/frost-hwando-v1.png',
  },
  'storm-hwando': {
    id: 'storm-hwando', name: '뇌명 환도', slot: 'weapon', rarity: '영웅',
    description: '천둥 무늬가 흐르는 환도. 감전된 적에서 가까운 두 대상에게 번개가 연쇄된다.',
    attackBonus: 20, hpBonus: 0, defenseBonus: 0, accuracyBonus: 6, evasionBonus: 2,
    requiredLevel: 7, sellPrice: 680, element: 'lightning',
    iconKey: 'item-storm-hwando-v1', iconPath: '/assets/items/storm-hwando-v1.png',
  },
  'venom-hwando': {
    id: 'venom-hwando', name: '독아 환도', slot: 'weapon', rarity: '영웅',
    description: '죽림귀의 독기를 옥빛 칼날에 봉했다. 독이 세 번 중첩되며 쓰러진 적에게서 주변으로 번진다.',
    attackBonus: 17, hpBonus: 0, defenseBonus: 0, accuracyBonus: 6, evasionBonus: 2,
    requiredLevel: 5, sellPrice: 560, element: 'poison',
    iconKey: 'item-venom-hwando-v1', iconPath: '/assets/items/venom-hwando-v1.png',
  },
  'gale-hwando': {
    id: 'gale-hwando', name: '풍백 환도', slot: 'weapon', rarity: '영웅',
    description: '해풍을 가르는 환도. 칼바람이 적을 밀쳐내며 가까운 적 둘까지 함께 벤다.',
    attackBonus: 18, hpBonus: 0, defenseBonus: 0, accuracyBonus: 5, evasionBonus: 5,
    requiredLevel: 6, sellPrice: 620, element: 'wind',
    iconKey: 'item-gale-hwando-v1', iconPath: '/assets/items/gale-hwando-v1.png',
  },
  'earth-hwando': {
    id: 'earth-hwando', name: '지맥 환도', slot: 'weapon', rarity: '영웅',
    description: '흑철 광산의 지맥을 두른 묵직한 환도. 충격파로 적을 경직시키고 무리를 흔든다.',
    attackBonus: 23, hpBonus: 0, defenseBonus: 4, accuracyBonus: 1, evasionBonus: 0,
    requiredLevel: 7, sellPrice: 720, element: 'earth',
    iconKey: 'item-earth-hwando-v1', iconPath: '/assets/items/earth-hwando-v1.png',
  },
  'shadow-hwando': {
    id: 'shadow-hwando', name: '월식 환도', slot: 'weapon', rarity: '영웅',
    description: '원귀의 그림자를 베어 담았다. 상처의 기운을 흡수하고 빈사 상태의 적을 처단한다.',
    attackBonus: 21, hpBonus: 0, defenseBonus: 0, accuracyBonus: 5, evasionBonus: 3,
    requiredLevel: 8, sellPrice: 780, element: 'shadow',
    iconKey: 'item-shadow-hwando-v1', iconPath: '/assets/items/shadow-hwando-v1.png',
  },
  'warden-durumagi': {
    id: 'warden-durumagi', name: '월영 수비 두루마기', slot: 'armor', rarity: '영웅',
    description: '검은 가죽찰을 덧대어 요물의 발톱을 막는 수비대 전투복.', attackBonus: 0, hpBonus: 58,
    defenseBonus: 13, accuracyBonus: 0, evasionBonus: 4, requiredLevel: 4, sellPrice: 390,
    setId: 'moon-warden', setPiece: '월영의 갑의',
    iconKey: 'item-warden-durumagi-v4', iconPath: '/assets/items/warden-durumagi-v4.png',
  },
  'silver-tiger-charm': {
    id: 'silver-tiger-charm', name: '은호 엄니 부적', slot: 'charm', rarity: '영웅',
    description: '은으로 감싼 범의 엄니. 사악한 기운 앞에서 낮게 울린다.', attackBonus: 5, hpBonus: 18,
    defenseBonus: 4, accuracyBonus: 3, evasionBonus: 3, requiredLevel: 4, sellPrice: 360,
    setId: 'moon-warden', setPiece: '은호의 가호',
    iconKey: 'item-silver-tiger-charm-v4', iconPath: '/assets/items/silver-tiger-charm-v4.png',
  },
  'ulleung-tiger-pelt': {
    id: 'ulleung-tiger-pelt', name: '울릉 산군 호피', slot: 'material', rarity: '희귀',
    description: '울릉 산군에게서 얻은 질긴 호피. 세 장을 모아 대장장이에게 가져가면 호피갑을 만들 수 있다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 70,
    iconKey: 'item-ulleung-tiger-pelt-v1', iconPath: '/assets/items/ulleung-tiger-pelt-v1.png',
  },
  'tiger-pelt-armor': {
    id: 'tiger-pelt-armor', name: '산군 호피갑', slot: 'armor', rarity: '영웅',
    description: '산군 호피를 찰갑 위에 덧댄 울릉식 사냥 갑옷. 야수에게 주는 피해가 25% 늘고 받는 피해가 18% 줄어든다.',
    attackBonus: 2, hpBonus: 62, defenseBonus: 14, accuracyBonus: 0, evasionBonus: 5,
    requiredLevel: 7, sellPrice: 520, passiveId: 'beast-hunter',
    iconKey: 'item-tiger-pelt-armor-v1', iconPath: '/assets/items/tiger-pelt-armor-v1.png',
  },
  'weapon-enchant-scroll': {
    id: 'weapon-enchant-scroll', name: '무기 강화 주문서', slot: 'scroll', rarity: '희귀',
    description: '장착한 무기에 붉은 기운을 새겨 공격력을 영구히 높인다. +5까지 안전하게 강화할 수 있다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 95,
    iconKey: 'item-weapon-enchant-scroll-v1', iconPath: '/assets/items/weapon-enchant-scroll-v1.png',
  },
  'armor-enchant-scroll': {
    id: 'armor-enchant-scroll', name: '방어구 강화 주문서', slot: 'scroll', rarity: '희귀',
    description: '장착한 복장에 푸른 수호 기운을 새겨 방어력을 영구히 높인다. +5까지 안전하게 강화할 수 있다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 95,
    iconKey: 'item-armor-enchant-scroll-v1', iconPath: '/assets/items/armor-enchant-scroll-v1.png',
  },
  'crescent-manual': {
    id: 'crescent-manual', name: '청람 반월검 비급', slot: 'scroll', rarity: '희귀',
    description: '청람 죽림귀가 지키던 낡은 검보. 사용하면 전방 광역 무공 ‘반월 검기’를 깨우친다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 130,
    iconKey: 'item-crescent-manual-v1', iconPath: '/assets/items/weapon-enchant-scroll-v1.png',
  },
  'insight-manual': {
    id: 'insight-manual', name: '원귀의 깨달음 서책', slot: 'scroll', rarity: '영웅',
    description: '월하 원귀가 품고 있던 수행서. 사용하면 전투 경험치 획득량을 20% 높이는 호흡을 익힌다.',
    attackBonus: 0, hpBonus: 0, defenseBonus: 0, accuracyBonus: 0, evasionBonus: 0,
    requiredLevel: 1, sellPrice: 190,
    iconKey: 'item-insight-manual-v1', iconPath: '/assets/items/armor-enchant-scroll-v1.png',
  },
};

export const ITEM_SET = {
  id: 'moon-warden' as const,
  name: '월영 수비대 세트',
  pieces: ['moonsteel-hwando', 'warden-durumagi', 'silver-tiger-charm'] as ItemId[],
  bonuses: [
    { pieces: 2, attack: 4, hp: 15, defense: 2, label: '공격력 +4 · 최대 체력 +15 · 방어 +2' },
    { pieces: 3, attack: 7, hp: 25, defense: 4, label: '공격력 +7 · 최대 체력 +25 · 방어 +4' },
  ],
};

export type CraftingRecipe = {
  id: CraftRecipeId;
  name: string;
  output: ItemId;
  gold: number;
  materials: Array<{ itemId: ItemId; count: number }>;
  description: string;
};

export const CRAFTING_RECIPES: Record<CraftRecipeId, CraftingRecipe> = {
  'tiger-pelt-armor': {
    id: 'tiger-pelt-armor',
    name: '산군 호피갑 제작',
    output: 'tiger-pelt-armor',
    gold: 180,
    materials: [{ itemId: 'ulleung-tiger-pelt', count: 3 }],
    description: '산군 호피 3장을 손질해 찰갑 위에 덧댄다.',
  },
};

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: '무기', armor: '복장', charm: '부적',
};

export const ITEM_SLOT_LABEL: Record<ItemSlot, string> = {
  ...SLOT_LABEL,
  scroll: '주문서 · 비급',
  material: '제작 재료',
};
