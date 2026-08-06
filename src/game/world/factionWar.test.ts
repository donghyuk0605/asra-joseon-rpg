import { describe, expect, it } from 'vitest';
import {
  advanceFactionWar,
  captureStronghold,
  createFactionWarState,
  factionForPlayerOrigin,
  factionWarSnapshot,
  rallyFactionReserve,
  reserveCapacityForFaction,
  resolveFactionDecision,
  restoreFactionWarState,
  weakenFaction,
} from './factionWar';

describe('four-protagonist faction war', () => {
  it('assigns each protagonist to the intended national force', () => {
    expect(factionForPlayerOrigin('kim-donghyeok')).toBe('daedong-army');
    expect(factionForPlayerOrigin('frontier-archer')).toBe('jurchen-league');
    expect(factionForPlayerOrigin('osaka-mudang')).toBe('japanese-army');
    expect(factionForPlayerOrigin('gwanghae-prince')).toBe('joseon-court');
  });

  it('starts every protagonist with a weak growing force and Hajin at zero reserve after defeat', () => {
    const kim = createFactionWarState('kim-donghyeok');
    const hajin = createFactionWarState('frontier-archer');
    const yeonhwa = createFactionWarState('osaka-mudang');
    expect(kim.reserve['daedong-army']).toBe(32);
    expect(hajin.reserve['jurchen-league']).toBe(0);
    expect(yeonhwa.reserve['japanese-army']).toBe(24);
    expect(hajin.chronicle[0]).toContain('예비병은 0명');
    expect(kim.strength['daedong-army']).toBeLessThan(40);
  });

  it('starts Crown Prince Gwanghae under King Seonjo with a finite bunjo force', () => {
    const gwanghae = createFactionWarState('gwanghae-prince');
    const snapshot = factionWarSnapshot(gwanghae, 1);

    expect(gwanghae.playerFaction).toBe('joseon-court');
    expect(gwanghae.reserve['joseon-court']).toBe(360);
    expect(gwanghae.chronicle[0]).toContain('선조');
    expect(gwanghae.chronicle[0]).toContain('왕세자 광해');
    expect(snapshot.activeConflict).toMatchObject({
      attacker: 'joseon-court',
      stronghold: 'osaka',
    });
    expect(snapshot.factions.every((faction) => [
      faction.strength,
      faction.reserve,
      faction.reserveCapacity,
      faction.recoveryPerMinute,
    ].every(Number.isFinite))).toBe(true);
  });

  it('records militia reserve rallies once and restores their capacity-aware gains', () => {
    const state = createFactionWarState('gwanghae-prince');
    const beforeReserve = state.reserve['joseon-court'];
    const beforeStrength = state.strength['joseon-court'];
    const first = rallyFactionReserve(
      state,
      'gwanghae-rally-changdeok-secretary',
      'joseon-court',
      40,
      1,
      '분조 의병 명부 · 금군과 전령 마흔 명이 합류했다.',
      1,
    );
    const duplicate = rallyFactionReserve(
      state,
      'gwanghae-rally-changdeok-secretary',
      'joseon-court',
      40,
      1,
      '중복되어서는 안 된다.',
      1,
    );

    expect(first).toMatchObject({
      rallied: true,
      reserveAdded: 40,
      strengthAdded: 1,
      reserve: beforeReserve + 40,
      strength: beforeStrength + 1,
    });
    expect(first.reserve).toBeLessThanOrEqual(first.reserveCapacity);
    expect(duplicate).toMatchObject({ rallied: false, reserveAdded: 0, strengthAdded: 0 });
    expect(state.resolvedMilestones).toEqual(['gwanghae-rally-changdeok-secretary']);
    expect(state.chronicle.filter((entry) => entry.includes('분조 의병 명부'))).toHaveLength(1);
  });

  it('applies a persistent one-shot faction decision with a meaningful reserve consequence', () => {
    const state = createFactionWarState('gwanghae-prince');
    state.reserve['joseon-court'] = 800;
    const result = resolveFactionDecision(
      state,
      'gwanghae-path-suppression',
      'joseon-court',
      {
        reserveRetainedRatio: 0.45,
        strengthGain: 6,
        chronicle: '왕명에 따른 의병 해산 · 의병이 떠났다.',
      },
      1,
    );
    const duplicate = resolveFactionDecision(
      state,
      'gwanghae-path-suppression',
      'joseon-court',
      { reserveRetainedRatio: 0, strengthGain: 50, chronicle: '중복' },
      1,
    );

    expect(result).toMatchObject({
      resolved: true,
      reserveBefore: 800,
      reserve: 360,
      strengthBefore: 72,
      strength: 78,
    });
    expect(duplicate.resolved).toBe(false);
    expect(state.reserve['joseon-court']).toBe(360);
    expect(state.strength['joseon-court']).toBe(78);
  });

  it('restores damaged war snapshots without leaking invalid numbers or malformed records', () => {
    const fallback = createFactionWarState('gwanghae-prince');
    const restored = restoreFactionWarState({
      playerFaction: 'joseon-court',
      strength: {
        'daedong-army': Number.POSITIVE_INFINITY,
        'jurchen-league': -12,
        'japanese-army': 180,
        'joseon-court': 'broken',
      },
      reserve: {
        'daedong-army': -40,
        'jurchen-league': Number.NaN,
        'japanese-army': Number.POSITIVE_INFINITY,
        'joseon-court': 'broken',
      },
      recoveryProgress: null,
      strongholds: {
        hanseong: {
          owner: 'not-a-faction',
          garrison: -999,
          fortification: -999,
          lastBattle: '손상 기록',
        },
        pyongyang: {
          owner: 'jurchen-league',
          garrison: Number.NaN,
          fortification: Number.POSITIVE_INFINITY,
          lastBattle: 37,
        },
        busan: {
          owner: 'japanese-army',
          garrison: -40,
          fortification: 160,
          lastBattle: ' 부산진 점령 ',
        },
      },
      resolvedMilestones: ['valid-milestone', 42, '', 'valid-milestone'],
      chronicle: [' 유효한 전쟁 기록 ', 42, '', '   '],
    }, 'gwanghae-prince', Number.NaN);
    const snapshot = factionWarSnapshot(restored, 1);

    expect(restored.strength).toMatchObject({
      'daedong-army': fallback.strength['daedong-army'],
      'jurchen-league': 0,
      'japanese-army': 100,
      'joseon-court': fallback.strength['joseon-court'],
    });
    expect(restored.reserve['daedong-army']).toBe(0);
    expect(restored.reserve['jurchen-league']).toBe(
      reserveCapacityForFaction(restored, 'jurchen-league', 1),
    );
    expect(restored.reserve['japanese-army']).toBe(fallback.reserve['japanese-army']);
    expect(restored.reserve['joseon-court']).toBe(fallback.reserve['joseon-court']);
    expect(Object.values(restored.recoveryProgress).every(Number.isFinite)).toBe(true);
    expect(restored.strongholds.hanseong).toEqual(fallback.strongholds.hanseong);
    expect(restored.strongholds.pyongyang).toEqual({
      ...fallback.strongholds.pyongyang,
      owner: 'jurchen-league',
    });
    expect(restored.strongholds.busan).toMatchObject({
      owner: 'japanese-army',
      garrison: 0,
      fortification: 100,
      lastBattle: '부산진 점령',
    });
    expect(restored.resolvedMilestones).toEqual(['valid-milestone']);
    expect(restored.chronicle).toEqual(['유효한 전쟁 기록']);
    expect(snapshot.factions.every((faction) => [
      faction.strength,
      faction.reserve,
      faction.reserveCapacity,
      faction.recoveryPerMinute,
    ].every(Number.isFinite))).toBe(true);
    expect(snapshot.strongholds.every((stronghold) => [
      stronghold.garrison,
      stronghold.fortification,
    ].every(Number.isFinite))).toBe(true);
  });

  it('keeps only the first Gwanghae path milestone when a save contains both choices', () => {
    const base = createFactionWarState('gwanghae-prince');
    const suppressionFirst = restoreFactionWarState({
      ...base,
      resolvedMilestones: [
        'gwanghae-rally-changdeok-secretary',
        'gwanghae-path-suppression',
        'gwanghae-path-coup',
        'gwanghae-path-suppression',
      ],
    }, 'gwanghae-prince', 1);
    const coupFirst = restoreFactionWarState({
      ...base,
      resolvedMilestones: [
        'gwanghae-path-coup',
        'gwanghae-path-suppression',
      ],
    }, 'gwanghae-prince', 1);

    expect(suppressionFirst.resolvedMilestones).toEqual([
      'gwanghae-rally-changdeok-secretary',
      'gwanghae-path-suppression',
    ]);
    expect(coupFirst.resolvedMilestones).toEqual(['gwanghae-path-coup']);
  });

  it('increases reserve capacity with rank and recovers spent reserves over time', () => {
    const state = createFactionWarState('kim-donghyeok');
    const rankOne = reserveCapacityForFaction(state, 'daedong-army', 1);
    const rankSix = reserveCapacityForFaction(state, 'daedong-army', 6);
    expect(rankSix).toBeGreaterThan(rankOne);

    state.reserve['daedong-army'] = 20;
    for (let tick = 0; tick < 1_200; tick += 1) advanceFactionWar(state, 0.05, 6);
    expect(state.reserve['daedong-army']).toBeGreaterThan(20);
    expect(state.reserve['daedong-army']).toBeLessThanOrEqual(rankSix);
  });

  it('reduces reserve capacity immediately when a faction becomes weak', () => {
    const state = createFactionWarState('frontier-archer');
    const strongCapacity = reserveCapacityForFaction(state, 'jurchen-league', 5);
    weakenFaction(state, 'jurchen-league', 65, 5);
    const weakCapacity = reserveCapacityForFaction(state, 'jurchen-league', 5);
    expect(weakCapacity).toBeLessThan(strongCapacity);
    expect(state.reserve['jurchen-league']).toBeLessThanOrEqual(weakCapacity);
  });

  it('resolves scripted castle capture once and records ownership, losses, and the next front', () => {
    const state = createFactionWarState('osaka-mudang');
    expect(captureStronghold(
      state,
      'yeonhwa-busan',
      'busan',
      'japanese-army',
      '부산진 상륙전',
      4,
    )).toBe(true);
    expect(captureStronghold(
      state,
      'yeonhwa-busan',
      'busan',
      'japanese-army',
      '부산진 상륙전',
      4,
    )).toBe(false);
    expect(state.strongholds.busan.owner).toBe('japanese-army');
    expect(state.chronicle[0]).toContain('부산진성');
    expect(factionWarSnapshot(state, 4).activeConflict.stronghold).toBe('yeongwol');
  });
});
