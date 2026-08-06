import { describe, expect, it } from 'vitest';
import {
  ROYAL_REFUGE_ROUTE_IDS,
  ROYAL_REFUGE_ROUTES,
  activeRoyalRefugeStage,
  advanceRoyalRefugeObjective,
  beginRoyalRefugeCampaign,
  chooseRoyalRefugeRoute,
  createRoyalRefugeCampaignState,
  type RoyalRefugeCampaignState,
  type RoyalRefugeRouteId,
} from './royalRefugeCampaign';

const completeActiveStage = (
  initialState: RoyalRefugeCampaignState,
): {
  state: RoyalRefugeCampaignState;
  eventTypes: string[];
} => {
  const stage = activeRoyalRefugeStage(initialState);
  if (!stage) throw new Error('Expected an active defense stage');
  let state = initialState;
  const eventTypes: string[] = [];
  for (const objective of stage.objectives) {
    const result = advanceRoyalRefugeObjective(
      state,
      stage.id,
      objective.id,
      objective.target,
    );
    state = result.state;
    eventTypes.push(...result.events.map((event) => event.type));
  }
  return { state, eventTypes };
};

describe('royal refuge campaign', () => {
  it('authors two distinct refuge routes with three complete defense layers each', () => {
    expect(ROYAL_REFUGE_ROUTE_IDS).toEqual(['namhansanseong', 'ganghwado']);

    const allStageIds = new Set<string>();
    const allObjectiveIds = new Set<string>();
    for (const routeId of ROYAL_REFUGE_ROUTE_IDS) {
      const route = ROYAL_REFUGE_ROUTES[routeId];
      expect(route.name.length).toBeGreaterThan(4);
      expect(route.description.length).toBeGreaterThan(20);
      expect(route.finalDefenseDescription.length).toBeGreaterThan(20);
      expect(route.stages).toHaveLength(3);

      for (const [index, stage] of route.stages.entries()) {
        expect(stage.order).toBe(index + 1);
        expect(stage.name.length).toBeGreaterThan(4);
        expect(stage.province.length).toBeGreaterThan(5);
        expect(stage.description.length).toBeGreaterThan(20);
        expect(stage.defenseFeatures.length).toBeGreaterThanOrEqual(4);
        expect(stage.enemies.length).toBeGreaterThanOrEqual(4);
        expect(stage.enemies.reduce((sum, enemy) => sum + enemy.count, 0)).toBeGreaterThanOrEqual(20);
        expect(stage.objectives).toHaveLength(3);
        expect(allStageIds.has(stage.id)).toBe(false);
        allStageIds.add(stage.id);
        for (const objective of stage.objectives) {
          expect(objective.target).toBeGreaterThan(0);
          expect(objective.description.length).toBeGreaterThan(15);
          expect(allObjectiveIds.has(objective.id)).toBe(false);
          allObjectiveIds.add(objective.id);
        }
      }
    }

    expect(ROYAL_REFUGE_ROUTES.namhansanseong.stages.map((stage) => stage.name)).toEqual([
      '남한산성 북문 산성로',
      '수어장대 성벽군',
      '남한산성 행궁',
    ]);
    expect(ROYAL_REFUGE_ROUTES.ganghwado.stages.map((stage) => stage.name)).toEqual([
      '염하 갑곶나루',
      '강화산성 남문',
      '강화 고려궁지 행궁',
    ]);
  });

  it('only opens the king encounter after Pyongyang inner fortress is cleared', () => {
    const initial = createRoyalRefugeCampaignState();
    const blocked = beginRoyalRefugeCampaign(initial, false);
    expect(blocked).toMatchObject({
      state: initial,
      changed: false,
      events: [],
      blockedReason: 'pyongyang-inner-uncleared',
    });

    const opened = beginRoyalRefugeCampaign(initial, true);
    expect(opened.state).toMatchObject({
      status: 'awaiting-route',
      kingEncountered: true,
      routeId: null,
      finalDefenseComplete: false,
    });
    expect(opened.events).toContainEqual(expect.objectContaining({
      type: 'king-encountered-after-pyongyang',
      choices: ['namhansanseong', 'ganghwado'],
    }));

    const repeated = beginRoyalRefugeCampaign(opened.state, true);
    expect(repeated.changed).toBe(false);
    expect(repeated.events).toEqual([]);
  });

  it.each(ROYAL_REFUGE_ROUTE_IDS)(
    'selects %s once and starts its first defense layer',
    (routeId) => {
      const encounter = beginRoyalRefugeCampaign(createRoyalRefugeCampaignState(), true);
      const selected = chooseRoyalRefugeRoute(encounter.state, routeId);
      const firstStage = ROYAL_REFUGE_ROUTES[routeId].stages[0];

      expect(selected.state).toMatchObject({
        status: 'in-progress',
        routeId,
        activeStageIndex: 0,
        finalDefenseComplete: false,
      });
      expect(activeRoyalRefugeStage(selected.state)).toBe(firstStage);
      expect(selected.events).toEqual([
        expect.objectContaining({
          type: 'royal-refuge-route-selected',
          routeId,
          firstStageId: firstStage.id,
        }),
        expect.objectContaining({
          type: 'royal-refuge-stage-started',
          stageId: firstStage.id,
        }),
      ]);

      const rejected = chooseRoyalRefugeRoute(
        selected.state,
        routeId === 'namhansanseong' ? 'ganghwado' : 'namhansanseong',
      );
      expect(rejected.blockedReason).toBe('route-already-selected');
      expect(rejected.state).toBe(selected.state);
    },
  );

  it.each(ROYAL_REFUGE_ROUTE_IDS)(
    'advances %s in order and records a real final-defense completion state',
    (routeId: RoyalRefugeRouteId) => {
      let state = chooseRoyalRefugeRoute(
        beginRoyalRefugeCampaign(createRoyalRefugeCampaignState(), true).state,
        routeId,
      ).state;

      for (let index = 0; index < 3; index += 1) {
        const stage = ROYAL_REFUGE_ROUTES[routeId].stages[index];
        expect(activeRoyalRefugeStage(state)?.id).toBe(stage.id);
        const result = completeActiveStage(state);
        state = result.state;
        expect(result.eventTypes).toContain('royal-refuge-stage-completed');
        if (index < 2) {
          expect(result.eventTypes).toContain('royal-refuge-stage-started');
          expect(state.activeStageIndex).toBe(index + 1);
          expect(state.finalDefenseComplete).toBe(false);
        } else {
          expect(result.eventTypes).toContain('royal-refuge-final-defense-completed');
        }
      }

      expect(state).toMatchObject({
        status: 'final-defense-complete',
        routeId,
        activeStageIndex: null,
        finalDefenseComplete: true,
      });
      expect(state.completedStageIds).toEqual(
        ROYAL_REFUGE_ROUTES[routeId].stages.map((stage) => stage.id),
      );
      expect(activeRoyalRefugeStage(state)).toBeNull();
    },
  );

  it('rejects out-of-order, unknown and invalid progress without mutating state', () => {
    const locked = createRoyalRefugeCampaignState();
    expect(chooseRoyalRefugeRoute(locked, 'namhansanseong').blockedReason)
      .toBe('king-encounter-required');
    expect(advanceRoyalRefugeObjective(locked, 'x', 'y').blockedReason)
      .toBe('route-not-selected');

    const selected = chooseRoyalRefugeRoute(
      beginRoyalRefugeCampaign(locked, true).state,
      'namhansanseong',
    ).state;
    const stage = ROYAL_REFUGE_ROUTES.namhansanseong.stages[0];
    const wrongStage = advanceRoyalRefugeObjective(
      selected,
      ROYAL_REFUGE_ROUTES.namhansanseong.stages[1].id,
      stage.objectives[0].id,
    );
    expect(wrongStage.blockedReason).toBe('inactive-stage');
    expect(wrongStage.state).toBe(selected);

    const unknown = advanceRoyalRefugeObjective(selected, stage.id, 'missing-objective');
    expect(unknown.blockedReason).toBe('unknown-objective');
    expect(unknown.state).toBe(selected);

    const invalid = advanceRoyalRefugeObjective(
      selected,
      stage.id,
      stage.objectives[0].id,
      0,
    );
    expect(invalid.blockedReason).toBe('invalid-amount');
    expect(invalid.state).toBe(selected);
  });

  it('clamps progress at its target and emits each objective completion once', () => {
    const selected = chooseRoyalRefugeRoute(
      beginRoyalRefugeCampaign(createRoyalRefugeCampaignState(), true).state,
      'ganghwado',
    ).state;
    const stage = activeRoyalRefugeStage(selected)!;
    const target = stage.objectives[0];
    const completed = advanceRoyalRefugeObjective(
      selected,
      stage.id,
      target.id,
      target.target + 999,
    );
    expect(completed.state.objectiveProgress[target.id]).toBe(target.target);
    expect(completed.events.filter((event) =>
      event.type === 'royal-refuge-objective-completed')).toHaveLength(1);

    const repeated = advanceRoyalRefugeObjective(
      completed.state,
      stage.id,
      target.id,
      1,
    );
    expect(repeated.changed).toBe(false);
    expect(repeated.events).toEqual([]);
  });
});
