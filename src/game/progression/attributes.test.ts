import { describe, expect, it } from 'vitest';
import {
  attributePointsEarnedAtLevel,
  derivedAttributeBonuses,
  emptyAttributeAllocations,
  normalizeAttributeAllocations,
  totalAttributes,
} from './attributes';

describe('beta RPG attributes', () => {
  it('gives every protagonist a distinct role profile', () => {
    const empty = emptyAttributeAllocations();
    expect(totalAttributes('kim-donghyeok', 1, empty).strength).toBe(12);
    expect(totalAttributes('frontier-archer', 1, empty).technique).toBe(13);
    expect(totalAttributes('osaka-mudang', 1, empty).spirit).toBe(15);
    expect(totalAttributes('gwanghae-prince', 1, empty).leadership).toBe(15);
  });

  it('turns allocations into transparent combat bonuses without changing the baseline', () => {
    const empty = emptyAttributeAllocations();
    expect(derivedAttributeBonuses('kim-donghyeok', 4, empty)).toMatchObject({
      attack: 0, defense: 0, maxHp: 0, accuracy: 0, evasion: 0,
    });
    const trained = { ...empty, strength: 2, vitality: 1, agility: 1 };
    expect(derivedAttributeBonuses('kim-donghyeok', 4, trained)).toMatchObject({
      attack: 2, defense: 1, maxHp: 8,
    });
  });

  it('sanitizes damaged saves and grants one point every two levels', () => {
    expect(normalizeAttributeAllocations({ strength: 4.8, spirit: -3, vitality: 999 })).toMatchObject({
      strength: 4, spirit: 0, vitality: 40,
    });
    expect(attributePointsEarnedAtLevel(1)).toBe(0);
    expect(attributePointsEarnedAtLevel(4)).toBe(2);
  });
});
