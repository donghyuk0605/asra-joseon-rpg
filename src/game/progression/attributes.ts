import type { PlayerOrigin } from '../simulation/types';

export const ATTRIBUTE_IDS = [
  'strength',
  'technique',
  'vitality',
  'agility',
  'spirit',
  'leadership',
] as const;

export type AttributeId = typeof ATTRIBUTE_IDS[number];
export type AttributeValues = Record<AttributeId, number>;

export type AttributeSnapshot = {
  allocations: AttributeValues;
  points: number;
};

export type DerivedAttributeBonuses = {
  attack: number;
  defense: number;
  maxHp: number;
  accuracy: number;
  evasion: number;
  criticalChance: number;
  statusResistance: number;
  followerPower: number;
};

export const ATTRIBUTE_LABELS: Record<AttributeId, Readonly<{
  name: string;
  hanja: string;
  description: string;
}>> = {
  strength: { name: '근력', hanja: '力', description: '근접 공격과 적 경직' },
  technique: { name: '기교', hanja: '技', description: '명중·치명타·원거리 공격' },
  vitality: { name: '체력', hanja: '體', description: '최대 생명과 방어·경직 저항' },
  agility: { name: '신법', hanja: '身', description: '회피와 이동 기술 회복' },
  spirit: { name: '정신', hanja: '神', description: '주술과 상태이상 저항' },
  leadership: { name: '통솔', hanja: '統', description: '동행·지원 병력의 전투력' },
};

export const ORIGIN_BASE_ATTRIBUTES: Record<PlayerOrigin, AttributeValues> = {
  'kim-donghyeok': { strength: 12, technique: 9, vitality: 12, agility: 9, spirit: 8, leadership: 10 },
  'frontier-archer': { strength: 8, technique: 13, vitality: 9, agility: 12, spirit: 8, leadership: 10 },
  'osaka-mudang': { strength: 7, technique: 9, vitality: 8, agility: 11, spirit: 15, leadership: 10 },
  'gwanghae-prince': { strength: 9, technique: 10, vitality: 11, agility: 8, spirit: 9, leadership: 15 },
};

export const emptyAttributeAllocations = (): AttributeValues => ({
  strength: 0,
  technique: 0,
  vitality: 0,
  agility: 0,
  spirit: 0,
  leadership: 0,
});

export const normalizeAttributeAllocations = (value: unknown): AttributeValues => {
  const candidate = value && typeof value === 'object' ? value as Partial<Record<AttributeId, unknown>> : {};
  return Object.fromEntries(ATTRIBUTE_IDS.map((id) => {
    const raw = candidate[id];
    return [id, typeof raw === 'number' && Number.isFinite(raw)
      ? Math.max(0, Math.min(40, Math.floor(raw)))
      : 0];
  })) as AttributeValues;
};

export const totalAttributes = (
  origin: PlayerOrigin,
  level: number,
  allocations: AttributeValues,
): AttributeValues => {
  const base = ORIGIN_BASE_ATTRIBUTES[origin];
  const levelSteps = Math.max(0, Math.floor((Math.max(1, level) - 1) / 3));
  const primary: AttributeId[] = origin === 'kim-donghyeok'
    ? ['strength', 'vitality']
    : origin === 'frontier-archer'
      ? ['technique', 'agility']
      : origin === 'osaka-mudang'
        ? ['spirit', 'agility']
        : ['leadership', 'vitality'];
  return Object.fromEntries(ATTRIBUTE_IDS.map((id) => [
    id,
    base[id] + allocations[id] + (primary.includes(id) ? levelSteps : 0),
  ])) as AttributeValues;
};

export const derivedAttributeBonuses = (
  origin: PlayerOrigin,
  level: number,
  allocations: AttributeValues,
): DerivedAttributeBonuses => {
  const total = totalAttributes(origin, level, allocations);
  return {
    attack: Math.round(allocations.strength * 0.9 + allocations.technique * 0.55 + allocations.spirit * 0.65),
    defense: Math.floor(allocations.vitality * 0.7 + allocations.strength * 0.25),
    maxHp: allocations.vitality * 8,
    accuracy: Math.floor(allocations.technique * 0.8),
    evasion: Math.floor(allocations.agility * 0.55),
    criticalChance: Math.min(18, 8 + Math.floor((total.technique - 8) * 0.55)),
    statusResistance: Math.min(45, Math.max(0, (total.spirit - 8) * 2 + allocations.vitality)),
    followerPower: Math.max(0, (total.leadership - 8) * 3),
  };
};

export const attributePointsEarnedAtLevel = (level: number): number =>
  Math.max(0, Math.floor(Math.max(1, level) / 2));
