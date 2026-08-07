import { describe, expect, it } from 'vitest';
import { SKILL_CATALOG, SKILL_TREE_META, skillPrerequisiteLabel, unmetSkillPrerequisite } from './catalog';
import type { SkillId } from '../simulation/types';

const emptyRanks = (): Record<SkillId, number> => Object.fromEntries(
  (Object.keys(SKILL_CATALOG) as SkillId[]).map((skillId) => [skillId, 0]),
) as Record<SkillId, number>;

describe('skill tree routes', () => {
  it('assigns every skill a visible branch and tier', () => {
    expect(Object.keys(SKILL_TREE_META)).toEqual(expect.arrayContaining(Object.keys(SKILL_CATALOG)));
    for (const meta of Object.values(SKILL_TREE_META)) {
      expect(meta.tier).toBeGreaterThanOrEqual(0);
      expect(meta.tier).toBeLessThanOrEqual(3);
      expect(meta.recommendedOrigins.length).toBeGreaterThan(0);
    }
  });

  it('reports and clears actual predecessor requirements', () => {
    const ranks = emptyRanks();
    expect(unmetSkillPrerequisite('crescent-wave', ranks)).toEqual({ skillId: 'moon-dash', rank: 1 });
    expect(skillPrerequisiteLabel('crescent-wave')).toContain('월영참 1단');
    ranks['moon-dash'] = 1;
    expect(unmetSkillPrerequisite('crescent-wave', ranks)).toBeNull();
  });
});
