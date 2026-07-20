import type { EquipmentSlot, ItemId } from '../simulation/types';

export type ItemDefinition = {
  id: ItemId;
  name: string;
  slot: EquipmentSlot;
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
};

export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  'worn-hwando': {
    id: 'worn-hwando', name: '이 빠진 환도', slot: 'weapon', rarity: '낡음',
    description: '날은 상했지만 주먹보다는 훨씬 믿음직하다.', attackBonus: 9, hpBonus: 0,
    defenseBonus: 0, accuracyBonus: 2, evasionBonus: 0, requiredLevel: 1, sellPrice: 34,
    iconKey: 'item-worn-hwando-v4', iconPath: '/assets/items/worn-hwando-v4.png',
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
  'moonsteel-hwando': {
    id: 'moonsteel-hwando', name: '월강 환도', slot: 'weapon', rarity: '영웅',
    description: '달빛을 머금은 강철로 벼린 월영 수비대의 환도.', attackBonus: 22, hpBonus: 0,
    defenseBonus: 2, accuracyBonus: 6, evasionBonus: 0, requiredLevel: 4, sellPrice: 420,
    setId: 'moon-warden', setPiece: '월강의 칼날',
    iconKey: 'item-moonsteel-hwando-v4', iconPath: '/assets/items/moonsteel-hwando-v4.png',
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

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: '무기', armor: '복장', charm: '부적',
};
