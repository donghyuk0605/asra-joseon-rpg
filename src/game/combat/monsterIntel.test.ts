import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from '../assets/manifest';
import { GameSimulation } from '../simulation/GameSimulation';
import type { GameEvent, MonsterKind, MonsterState, WeaponElement } from '../simulation/types';
import {
  ELEMENT_EFFECT_MULTIPLIER,
  monsterElementAffinity,
  monsterElementEffectMultiplier,
  monsterLootIntel,
  monsterLootPityProgress,
  rollStandardMonsterLoot,
} from './monsterIntel';

const target = (kind: MonsterKind, tacticalRole: MonsterState['tacticalRole'] = 'melee') => ({
  kind,
  tacticalRole,
});

describe('monster combat and loot intel', () => {
  it('classifies every shipped monster with distinct weakness and resistance', () => {
    const kinds = Object.keys(ASSETS.monsters) as MonsterKind[];
    expect(kinds.length).toBeGreaterThanOrEqual(60);
    for (const kind of kinds) {
      const affinity = monsterElementAffinity(target(kind));
      expect(affinity.weakness).not.toBe(affinity.resistance);
      expect(monsterElementEffectMultiplier(target(kind), affinity.weakness))
        .toBe(ELEMENT_EFFECT_MULTIPLIER.weakness);
      expect(monsterElementEffectMultiplier(target(kind), affinity.resistance))
        .toBe(ELEMENT_EFFECT_MULTIPLIER.resistance);
    }
  });

  it('keeps fantasy families readable without adding hard immunities', () => {
    expect(monsterElementAffinity(target('moon-revenant', 'ranged')))
      .toEqual({ weakness: 'fire', resistance: 'poison' });
    expect(monsterElementAffinity(target('mine-golem', 'brute')))
      .toEqual({ weakness: 'lightning', resistance: 'poison' });
    expect(monsterElementAffinity(target('dokkaebi')))
      .toEqual({ weakness: 'earth', resistance: 'shadow' });
    expect(monsterElementAffinity(target('joseon-border-archer', 'ranged')))
      .toEqual({ weakness: 'wind', resistance: 'ice' });
  });

  it('applies affinity to the real elemental status durations', () => {
    const game = new GameSimulation('minepass');
    const golem = game.monsters.find((monster) => monster.kind === 'mine-golem')!;
    const apply = (game as unknown as {
      applyElementalStatus: (
        monster: MonsterState,
        element: WeaponElement,
        damage: number,
      ) => void;
    }).applyElementalStatus.bind(game);

    apply(golem, 'lightning', 20);
    const lightning = game.drainEvents().find((event): event is Extract<GameEvent, { type: 'elemental-applied' }> =>
      event.type === 'elemental-applied' && event.targetId === golem.id)!;
    expect(lightning.duration).toBe(0.94);

    apply(golem, 'poison', 20);
    const poison = game.drainEvents().find((event): event is Extract<GameEvent, { type: 'elemental-applied' }> =>
      event.type === 'elemental-applied' && event.targetId === golem.id)!;
    expect(poison.duration).toBe(3.25);
  });

  it('uses one standard loot resolver for simulation probabilities and target previews', () => {
    expect(rollStandardMonsterLoot('yeongwol-commander', 0.1, () => 0.5, 'kim-donghyeok'))
      .toBe('storm-hwando');
    expect(rollStandardMonsterLoot('boar', 0.09, () => 0.05, 'kim-donghyeok'))
      .toBe('silver-tiger-charm');
    expect(rollStandardMonsterLoot('dokkaebi', 0.5, () => 0.5, 'kim-donghyeok'))
      .toBeNull();

    expect(monsterLootIntel('boar', 'solgogae', 'kim-donghyeok')).toMatchObject({
      primary: 'boar-tusk-charm', rare: 'silver-tiger-charm', pityEvery: 8,
    });
    expect(monsterLootIntel('ulleung-sangun', 'ulleungridge', 'kim-donghyeok')).toMatchObject({
      primary: 'ulleung-tiger-pelt', rare: 'frost-hwando', guarantee: '첫 호피 확정', pityEvery: null,
    });
    expect(monsterLootIntel('episode2-red-fox', 'hwangju', 'kim-donghyeok')).toMatchObject({
      primary: 'hwangju-moonsteel-spear', guarantee: '첫 미보유 장비 우선', pityEvery: 8,
    });
    expect(monsterLootPityProgress(6, 8)).toEqual({ current: 6, remaining: 2 });
  });

  it('renders compact accessible affinity and loot intel in the live target card', () => {
    const hud = readFileSync(new URL('../ui/Hud.ts', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
    const simulation = readFileSync(new URL('../simulation/GameSimulation.ts', import.meta.url), 'utf8');
    expect(hud).toContain('data-id="target-intel"');
    expect(hud).toContain('aria-label="대상 약점과 전리품"');
    expect(hud).toContain('보정 ${pity.current}/${loot.pityEvery}');
    expect(styles).toContain('.target-intel[hidden] { display: none; }');
    expect(styles).toContain('.target-affinity.is-weakness');
    expect(styles).toContain('top: calc(max(7px, env(safe-area-inset-top)) + 142px);');
    expect(simulation).toContain('rollStandardMonsterLoot(');
    expect(simulation).toContain('monsterLootPityInterval(monster.kind)');
  });
});
