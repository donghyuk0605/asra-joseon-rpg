import type { MonsterKind } from '../simulation/types';

export const ROYAL_REFUGE_ROUTE_IDS = ['namhansanseong', 'ganghwado'] as const;

export type RoyalRefugeRouteId = (typeof ROYAL_REFUGE_ROUTE_IDS)[number];
export type RoyalRefugeCampaignStatus =
  | 'locked'
  | 'awaiting-route'
  | 'in-progress'
  | 'final-defense-complete';
export type RoyalRefugeObjectiveMetric =
  | 'kills'
  | 'commanders'
  | 'structures'
  | 'seconds'
  | 'positions'
  | 'escape-routes'
  | 'royal-targets';

export type RoyalRefugeEnemyFormation = {
  kind: MonsterKind;
  count: number;
  role: string;
  levelOffset: number;
};

export type RoyalRefugeObjective = {
  id: string;
  title: string;
  description: string;
  metric: RoyalRefugeObjectiveMetric;
  target: number;
};

export type RoyalRefugeDefenseStage = {
  id: string;
  order: 1 | 2 | 3;
  name: string;
  province: string;
  description: string;
  arrivalCopy: string;
  defenseFeatures: readonly string[];
  enemies: readonly RoyalRefugeEnemyFormation[];
  objectives: readonly [
    RoyalRefugeObjective,
    RoyalRefugeObjective,
    RoyalRefugeObjective,
  ];
};

export type RoyalRefugeRoute = {
  id: RoyalRefugeRouteId;
  name: string;
  selectionLabel: string;
  description: string;
  escapeCopy: string;
  finalDefenseTitle: string;
  finalDefenseDescription: string;
  stages: readonly [
    RoyalRefugeDefenseStage,
    RoyalRefugeDefenseStage,
    RoyalRefugeDefenseStage,
  ];
};

export type RoyalRefugeCampaignState = {
  status: RoyalRefugeCampaignStatus;
  kingEncountered: boolean;
  routeId: RoyalRefugeRouteId | null;
  activeStageIndex: 0 | 1 | 2 | null;
  objectiveProgress: Readonly<Record<string, number>>;
  completedStageIds: readonly string[];
  finalDefenseComplete: boolean;
};

export type RoyalRefugeCampaignEvent =
  | {
    type: 'king-encountered-after-pyongyang';
    title: string;
    dialogue: readonly string[];
    choices: readonly RoyalRefugeRouteId[];
  }
  | {
    type: 'royal-refuge-route-selected';
    routeId: RoyalRefugeRouteId;
    routeName: string;
    destination: string;
    firstStageId: string;
  }
  | {
    type: 'royal-refuge-objective-completed';
    routeId: RoyalRefugeRouteId;
    stageId: string;
    objectiveId: string;
  }
  | {
    type: 'royal-refuge-stage-completed';
    routeId: RoyalRefugeRouteId;
    stageId: string;
    nextStageId: string | null;
  }
  | {
    type: 'royal-refuge-stage-started';
    routeId: RoyalRefugeRouteId;
    stageId: string;
    stageName: string;
  }
  | {
    type: 'royal-refuge-final-defense-completed';
    routeId: RoyalRefugeRouteId;
    title: string;
    description: string;
  };

export type RoyalRefugeBlockedReason =
  | 'pyongyang-inner-uncleared'
  | 'king-encounter-required'
  | 'route-already-selected'
  | 'route-not-selected'
  | 'campaign-complete'
  | 'inactive-stage'
  | 'unknown-objective'
  | 'invalid-amount';

export type RoyalRefugeTransition = {
  state: RoyalRefugeCampaignState;
  changed: boolean;
  events: readonly RoyalRefugeCampaignEvent[];
  blockedReason?: RoyalRefugeBlockedReason;
};

const objective = (
  id: string,
  title: string,
  description: string,
  metric: RoyalRefugeObjectiveMetric,
  target: number,
): RoyalRefugeObjective => ({ id, title, description, metric, target });

const formation = (
  kind: MonsterKind,
  count: number,
  role: string,
  levelOffset: number,
): RoyalRefugeEnemyFormation => ({ kind, count, role, levelOffset });

export const KING_ENCOUNTER_AFTER_PYONGYANG = {
  title: '무너진 북방, 갈라지는 어가',
  location: '평양성 내성 · 대동관 남문',
  description: '평양 수비선이 붕괴하자 왕의 어가가 한성을 버리고 마지막 피난처를 정한다.',
  dialogue: [
    '왕: 평양마저 무너졌단 말이냐. 한성에 머물면 백성도 종묘도 함께 짓밟힐 것이다.',
    '도승지: 남한산성은 험준하고 군량이 있으며, 강화는 물길이 천연의 성벽이옵니다.',
    '하진: 어느 길을 택하든 끝까지 쫓는다. 오늘 도망친 왕은 다음 성에서 답해야 한다.',
  ],
  choices: ROYAL_REFUGE_ROUTE_IDS,
} as const;

export const ROYAL_REFUGE_ROUTES: Record<RoyalRefugeRouteId, RoyalRefugeRoute> = {
  namhansanseong: {
    id: 'namhansanseong',
    name: '남한산성 피난로',
    selectionLabel: '광주 산길로 추격한다',
    description: '한성 동남쪽 산악 요새. 좁은 성로와 겹성벽, 수어청 정예가 세 겹의 방어진을 편다.',
    escapeCopy: '왕의 어가가 송파나루를 건너 남한산성 행궁으로 향한다.',
    finalDefenseTitle: '남한산성 행궁 최종 방어 붕괴',
    finalDefenseDescription: '수어장대와 행궁 친위대가 무너져 왕의 마지막 산악 피난처가 완전히 고립되었다.',
    stages: [
      {
        id: 'namhan-north-mountain-road',
        order: 1,
        name: '남한산성 북문 산성로',
        province: '경기도 광주 · 전승문 북쪽',
        description: '절벽을 끼고 휘어진 산길에 목책과 매복 궁수대가 겹겹이 버틴다.',
        arrivalCopy: '산등성이 봉화가 켜지고 북문 수비대가 바위틈에서 일제히 모습을 드러낸다.',
        defenseFeatures: ['절벽 협로', '이중 목책', '암벽 궁수 진지', '북문 문루'],
        enemies: [
          formation('joseon-border-spearman', 12, '협로 장창 방진', 0),
          formation('joseon-border-archer', 10, '암벽 매복 궁수', 0),
          formation('joseon-border-swordsman', 6, '목책 기동대', 1),
          formation('joseon-border-commander', 1, '북문 수문장', 2),
        ],
        objectives: [
          objective('namhan-road-vanguard', '협로 선봉 격파', '장창 방진과 목책 기동대 18명을 무너뜨린다.', 'kills', 18),
          objective('namhan-road-barricades', '이중 목책 파괴', '산성로를 막은 네 곳의 방어 목책을 부순다.', 'structures', 4),
          objective('namhan-road-gatehouse', '북문 문루 점거', '수문장을 쓰러뜨리고 북문 안쪽 거점을 확보한다.', 'positions', 1),
        ],
      },
      {
        id: 'namhan-sueojangdae',
        order: 2,
        name: '수어장대 성벽군',
        province: '남한산성 내성 · 서장대',
        description: '곡성 위의 궁수 진지와 수어청 예비대가 행궁으로 통하는 능선 전체를 봉쇄한다.',
        arrivalCopy: '북과 징이 울리자 성첩마다 불화살이 걸리고 수어청 별장이 예비대를 전진시킨다.',
        defenseFeatures: ['곡성 궁수대', '수어장대 지휘소', '화차 진지', '내성 철문'],
        enemies: [
          formation('joseon-border-archer', 14, '곡성 화살진', 1),
          formation('royal-guard', 10, '수어청 금군 예비대', 2),
          formation('joseon-border-spearman', 8, '내성 철문 방진', 2),
          formation('joseon-border-commander', 2, '수어청 별장', 3),
        ],
        objectives: [
          objective('namhan-command-archers', '곡성 궁수 진압', '성첩의 궁수 진지 열 곳을 침묵시킨다.', 'positions', 10),
          objective('namhan-command-officers', '수어청 지휘관 격파', '예비대를 지휘하는 두 별장을 쓰러뜨린다.', 'commanders', 2),
          objective('namhan-command-hold', '수어장대 확보', '역습을 버티며 지휘소를 45초 동안 점거한다.', 'seconds', 45),
        ],
      },
      {
        id: 'namhan-royal-palace',
        order: 3,
        name: '남한산성 행궁',
        province: '남한산성 내성 · 왕실 행궁',
        description: '행궁 담장 안에 내금위와 왕자가 최후의 원진을 펴고 왕의 퇴로를 지킨다.',
        arrivalCopy: '행궁의 대문이 닫히고 왕실기가 내려온다. 내금위가 마지막 원진을 완성한다.',
        defenseFeatures: ['행궁 외삼문', '내금위 원진', '왕자 지휘단', '왕실 어가'],
        enemies: [
          formation('royal-guard', 16, '행궁 내금위 원진', 3),
          formation('joseon-border-archer', 10, '행궁 담장 궁수', 2),
          formation('joseon-border-commander', 3, '왕실 호위 별장', 4),
          formation('joseon-prince', 1, '왕자 친위 지휘관', 5),
        ],
        objectives: [
          objective('namhan-palace-guards', '내금위 원진 붕괴', '행궁 뜰의 왕실 금군 16명을 격파한다.', 'kills', 16),
          objective('namhan-palace-prince', '왕자 지휘단 제압', '왕자와 호위 별장들의 지휘를 끊는다.', 'royal-targets', 1),
          objective('namhan-palace-king', '왕의 퇴로 봉쇄', '어가가 빠져나갈 마지막 행궁 후문을 장악한다.', 'escape-routes', 1),
        ],
      },
    ],
  },
  ganghwado: {
    id: 'ganghwado',
    name: '강화도 피난로',
    selectionLabel: '염하 수로로 추격한다',
    description: '한강 하구의 섬 요새. 돈대와 수군, 강화산성이 물길부터 행궁까지 세 겹으로 막아선다.',
    escapeCopy: '왕의 어가가 양화진에서 배를 갈아타고 강화부 갑곶나루로 빠져나간다.',
    finalDefenseTitle: '강화 행궁 최종 방어 붕괴',
    finalDefenseDescription: '염하 수군과 강화산성 방어선이 무너져 섬 안의 왕실 행궁이 더는 달아날 곳 없이 포위되었다.',
    stages: [
      {
        id: 'ganghwa-gapgot-ferry',
        order: 1,
        name: '염하 갑곶나루',
        province: '강화도 동해안 · 갑곶돈대',
        description: '빠른 조류 건너 돈대 포대와 수군 궁수들이 상륙장을 십자 사격으로 덮는다.',
        arrivalCopy: '물안개 속에서 봉화가 셋 오르고 갑곶돈대의 화포와 화살이 동시에 쏟아진다.',
        defenseFeatures: ['염하 급류', '갑곶돈대', '수군 화살진', '봉화대'],
        enemies: [
          formation('joseon-border-archer', 12, '수군 장궁 사수', 1),
          formation('joseon-border-spearman', 10, '갯벌 상륙 저지대', 1),
          formation('royal-guard', 6, '어가 후송 금군', 2),
          formation('joseon-border-commander', 1, '갑곶 첨사', 3),
        ],
        objectives: [
          objective('ganghwa-ferry-archers', '돈대 사격망 제압', '갑곶돈대와 수군 장궁 사수 12명을 격파한다.', 'kills', 12),
          objective('ganghwa-ferry-beacons', '봉화 신호 차단', '증원 함대를 부르는 봉화대 세 곳을 파괴한다.', 'structures', 3),
          objective('ganghwa-ferry-landing', '상륙 교두보 확보', '갯벌 장창진을 밀어내고 나루 거점을 점거한다.', 'positions', 1),
        ],
      },
      {
        id: 'ganghwa-mountain-fortress',
        order: 2,
        name: '강화산성 남문',
        province: '강화부 · 남산 산성로',
        description: '남문 앞 치성과 굽은 성로에 방패대와 궁수가 교대하며 소모전을 강요한다.',
        arrivalCopy: '강화 유수가 성문을 걸어 잠그고 남산 봉수에 전군 결사항전을 명한다.',
        defenseFeatures: ['남문 옹성', '굽은 산성로', '치성 사격대', '군량 창고'],
        enemies: [
          formation('joseon-border-swordsman', 12, '남문 환도 결사대', 2),
          formation('joseon-border-spearman', 12, '옹성 장창 방진', 2),
          formation('joseon-border-archer', 10, '치성 교대 사격대', 2),
          formation('joseon-border-commander', 2, '강화 중군장', 4),
        ],
        objectives: [
          objective('ganghwa-fortress-line', '옹성 방진 돌파', '남문 앞 환도·장창 결사대 20명을 격파한다.', 'kills', 20),
          objective('ganghwa-fortress-gates', '남문 이중문 개방', '외문과 내문의 빗장을 차례로 파괴한다.', 'structures', 2),
          objective('ganghwa-fortress-commanders', '강화 중군 격파', '두 중군장을 쓰러뜨려 교대 방어를 끊는다.', 'commanders', 2),
        ],
      },
      {
        id: 'ganghwa-royal-palace',
        order: 3,
        name: '강화 고려궁지 행궁',
        province: '강화부 내성 · 왕실 피난 행궁',
        description: '옛 궁궐 터를 두른 내성에 금군과 수군 잔병이 모여 왕의 마지막 배를 지킨다.',
        arrivalCopy: '왕실 어선의 닻이 오르고 내금위가 궁지 앞 돌계단에 마지막 방패벽을 세운다.',
        defenseFeatures: ['고려궁지 돌담', '행궁 정문', '내금위 방패벽', '왕실 비상 선착장'],
        enemies: [
          formation('royal-guard', 18, '행궁 내금위 방패벽', 3),
          formation('joseon-border-archer', 12, '수군 정예 궁수', 3),
          formation('joseon-border-commander', 3, '강화 호위 별장', 4),
          formation('joseon-prince', 1, '왕자 후송 지휘관', 5),
        ],
        objectives: [
          objective('ganghwa-palace-guards', '행궁 방패벽 붕괴', '궁지 정문을 지키는 금군 18명을 격파한다.', 'kills', 18),
          objective('ganghwa-palace-boats', '비상 어선 봉쇄', '왕이 탈 세 척의 비상 어선을 움직이지 못하게 한다.', 'escape-routes', 3),
          objective('ganghwa-palace-king', '왕실 행궁 포위', '왕자 지휘단을 제압하고 어전으로 통하는 정문을 장악한다.', 'royal-targets', 1),
        ],
      },
    ],
  },
};

export const createRoyalRefugeCampaignState = (): RoyalRefugeCampaignState => ({
  status: 'locked',
  kingEncountered: false,
  routeId: null,
  activeStageIndex: null,
  objectiveProgress: {},
  completedStageIds: [],
  finalDefenseComplete: false,
});

export const isRoyalRefugeRouteId = (value: string): value is RoyalRefugeRouteId => (
  (ROYAL_REFUGE_ROUTE_IDS as readonly string[]).includes(value)
);

export const activeRoyalRefugeStage = (
  state: RoyalRefugeCampaignState,
): RoyalRefugeDefenseStage | null => {
  if (state.routeId === null || state.activeStageIndex === null) return null;
  return ROYAL_REFUGE_ROUTES[state.routeId].stages[state.activeStageIndex];
};

export const beginRoyalRefugeCampaign = (
  state: RoyalRefugeCampaignState,
  pyongyangInnerCleared: boolean,
): RoyalRefugeTransition => {
  if (state.status !== 'locked') return { state, changed: false, events: [] };
  if (!pyongyangInnerCleared) {
    return {
      state,
      changed: false,
      events: [],
      blockedReason: 'pyongyang-inner-uncleared',
    };
  }

  const nextState: RoyalRefugeCampaignState = {
    ...state,
    status: 'awaiting-route',
    kingEncountered: true,
  };
  return {
    state: nextState,
    changed: true,
    events: [{
      type: 'king-encountered-after-pyongyang',
      title: KING_ENCOUNTER_AFTER_PYONGYANG.title,
      dialogue: KING_ENCOUNTER_AFTER_PYONGYANG.dialogue,
      choices: KING_ENCOUNTER_AFTER_PYONGYANG.choices,
    }],
  };
};

export const chooseRoyalRefugeRoute = (
  state: RoyalRefugeCampaignState,
  routeId: RoyalRefugeRouteId,
): RoyalRefugeTransition => {
  if (!state.kingEncountered || state.status === 'locked') {
    return { state, changed: false, events: [], blockedReason: 'king-encounter-required' };
  }
  if (state.routeId !== null || state.status !== 'awaiting-route') {
    return { state, changed: false, events: [], blockedReason: 'route-already-selected' };
  }

  const route = ROYAL_REFUGE_ROUTES[routeId];
  const firstStage = route.stages[0];
  const nextState: RoyalRefugeCampaignState = {
    ...state,
    status: 'in-progress',
    routeId,
    activeStageIndex: 0,
  };
  return {
    state: nextState,
    changed: true,
    events: [
      {
        type: 'royal-refuge-route-selected',
        routeId,
        routeName: route.name,
        destination: firstStage.name,
        firstStageId: firstStage.id,
      },
      {
        type: 'royal-refuge-stage-started',
        routeId,
        stageId: firstStage.id,
        stageName: firstStage.name,
      },
    ],
  };
};

export const advanceRoyalRefugeObjective = (
  state: RoyalRefugeCampaignState,
  stageId: string,
  objectiveId: string,
  amount = 1,
): RoyalRefugeTransition => {
  if (state.status === 'final-defense-complete') {
    return { state, changed: false, events: [], blockedReason: 'campaign-complete' };
  }
  if (state.routeId === null || state.activeStageIndex === null || state.status !== 'in-progress') {
    return { state, changed: false, events: [], blockedReason: 'route-not-selected' };
  }
  const stage = activeRoyalRefugeStage(state);
  if (stage === null || stage.id !== stageId) {
    return { state, changed: false, events: [], blockedReason: 'inactive-stage' };
  }
  const targetObjective = stage.objectives.find((candidate) => candidate.id === objectiveId);
  if (!targetObjective) {
    return { state, changed: false, events: [], blockedReason: 'unknown-objective' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { state, changed: false, events: [], blockedReason: 'invalid-amount' };
  }

  const previous = state.objectiveProgress[objectiveId] ?? 0;
  const progress = Math.min(targetObjective.target, previous + amount);
  if (progress === previous) return { state, changed: false, events: [] };

  const objectiveProgress: Readonly<Record<string, number>> = {
    ...state.objectiveProgress,
    [objectiveId]: progress,
  };
  const events: RoyalRefugeCampaignEvent[] = [];
  if (previous < targetObjective.target && progress === targetObjective.target) {
    events.push({
      type: 'royal-refuge-objective-completed',
      routeId: state.routeId,
      stageId: stage.id,
      objectiveId,
    });
  }

  const stageComplete = stage.objectives.every((entry) =>
    (objectiveProgress[entry.id] ?? 0) >= entry.target);
  if (!stageComplete) {
    return {
      state: { ...state, objectiveProgress },
      changed: true,
      events,
    };
  }

  const completedStageIds = [...state.completedStageIds, stage.id];
  const route = ROYAL_REFUGE_ROUTES[state.routeId];
  const isFinalStage = state.activeStageIndex === 2;
  const nextStage = isFinalStage ? null : route.stages[state.activeStageIndex + 1];
  events.push({
    type: 'royal-refuge-stage-completed',
    routeId: state.routeId,
    stageId: stage.id,
    nextStageId: nextStage?.id ?? null,
  });

  if (isFinalStage) {
    const completedState: RoyalRefugeCampaignState = {
      ...state,
      status: 'final-defense-complete',
      activeStageIndex: null,
      objectiveProgress,
      completedStageIds,
      finalDefenseComplete: true,
    };
    events.push({
      type: 'royal-refuge-final-defense-completed',
      routeId: state.routeId,
      title: route.finalDefenseTitle,
      description: route.finalDefenseDescription,
    });
    return { state: completedState, changed: true, events };
  }

  const nextStageIndex = (state.activeStageIndex + 1) as 1 | 2;
  const nextState: RoyalRefugeCampaignState = {
    ...state,
    activeStageIndex: nextStageIndex,
    objectiveProgress,
    completedStageIds,
  };
  events.push({
    type: 'royal-refuge-stage-started',
    routeId: state.routeId,
    stageId: nextStage!.id,
    stageName: nextStage!.name,
  });
  return { state: nextState, changed: true, events };
};
