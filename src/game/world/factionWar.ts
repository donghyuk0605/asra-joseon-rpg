import type { PlayerOrigin } from '../simulation/types';
import type { RegionId } from './regions';

export type WarFactionId = 'daedong-army' | 'jurchen-league' | 'japanese-army' | 'joseon-court';
export type StrongholdId =
  | 'jurchen' | 'yalu' | 'pyongyang' | 'hanseong' | 'yeongwol'
  | 'jeonju' | 'busan' | 'ulleung' | 'osaka';

export type WarFactionDefinition = {
  id: WarFactionId;
  name: string;
  shortName: string;
  doctrine: string;
  baseReserve: number;
  reservePerRank: number;
  recoveryPerMinute: number;
};

export type StrongholdWarState = {
  id: StrongholdId;
  name: string;
  destination: RegionId;
  owner: WarFactionId;
  garrison: number;
  fortification: number;
  lastBattle: string;
};

export type FactionWarState = {
  playerFaction: WarFactionId;
  strength: Record<WarFactionId, number>;
  reserve: Record<WarFactionId, number>;
  recoveryProgress: Record<WarFactionId, number>;
  strongholds: Record<StrongholdId, StrongholdWarState>;
  resolvedMilestones: string[];
  chronicle: string[];
};

export type FactionWarSnapshot = {
  playerFaction: WarFactionId;
  factions: Array<{
    id: WarFactionId;
    name: string;
    shortName: string;
    doctrine: string;
    strength: number;
    reserve: number;
    reserveCapacity: number;
    recoveryPerMinute: number;
    holdings: number;
    player: boolean;
  }>;
  strongholds: StrongholdWarState[];
  activeConflict: {
    title: string;
    attacker: WarFactionId;
    defender: WarFactionId;
    stronghold: StrongholdId;
  };
  chronicle: string[];
};

export type FactionReserveRallyResult = Readonly<{
  rallied: boolean;
  reserveAdded: number;
  strengthAdded: number;
  reserve: number;
  strength: number;
  reserveCapacity: number;
}>;

export type FactionDecisionResult = Readonly<{
  resolved: boolean;
  reserveBefore: number;
  reserve: number;
  strengthBefore: number;
  strength: number;
}>;

export const WAR_FACTIONS: Record<WarFactionId, WarFactionDefinition> = {
  'daedong-army': {
    id: 'daedong-army',
    name: '조선 대동 농민군',
    shortName: '대동군',
    doctrine: '정여립의 대동계와 천하공물 사상을 이어 신분보다 백성의 생존을 앞세운다.',
    baseReserve: 260,
    reservePerRank: 55,
    recoveryPerMinute: 18,
  },
  'jurchen-league': {
    id: 'jurchen-league',
    name: '여진 부족연맹',
    shortName: '여진',
    doctrine: '장백산 남녘 부족과 철기·각궁 전사대를 묶어 압록 이남으로 남하한다.',
    baseReserve: 1_000,
    reservePerRank: 90,
    recoveryPerMinute: 32,
  },
  'japanese-army': {
    id: 'japanese-army',
    name: '왜군 원정연합',
    shortName: '왜군',
    doctrine: '오사카 출병군과 포로촌 세력을 규합해 조총·장창 전열로 조선의 성로를 노린다.',
    baseReserve: 820,
    reservePerRank: 75,
    recoveryPerMinute: 27,
  },
  'joseon-court': {
    id: 'joseon-court',
    name: '조선 조정군',
    shortName: '관군',
    doctrine: '감영군·수성군·내금위를 동원해 기존 성곽과 왕도를 지킨다.',
    baseReserve: 1_200,
    reservePerRank: 0,
    recoveryPerMinute: 22,
  },
};

export const factionForPlayerOrigin = (origin: PlayerOrigin): WarFactionId => (
  origin === 'frontier-archer'
    ? 'jurchen-league'
    : origin === 'osaka-mudang'
      ? 'japanese-army'
      : origin === 'gwanghae-prince'
        ? 'joseon-court'
        : 'daedong-army'
);

const initialStrongholds = (): Record<StrongholdId, StrongholdWarState> => ({
  jurchen: {
    id: 'jurchen', name: '여진 부락', destination: 'jurchenvillage',
    owner: 'jurchen-league', garrison: 680, fortification: 46, lastBattle: '장백산 부족회의',
  },
  yalu: {
    id: 'yalu', name: '압록 전선', destination: 'manchufrontier',
    owner: 'joseon-court', garrison: 520, fortification: 62, lastBattle: '압록 진보 대치',
  },
  pyongyang: {
    id: 'pyongyang', name: '평양성', destination: 'pyongyangouter',
    owner: 'joseon-court', garrison: 860, fortification: 88, lastBattle: '대동문 수성 준비',
  },
  hanseong: {
    id: 'hanseong', name: '한성', destination: 'gyeongbokgate',
    owner: 'joseon-court', garrison: 1_180, fortification: 100, lastBattle: '내금위 왕도 봉쇄',
  },
  yeongwol: {
    id: 'yeongwol', name: '영월', destination: 'yeongwol',
    owner: 'joseon-court', garrison: 430, fortification: 58, lastBattle: '대도호부 징병',
  },
  jeonju: {
    id: 'jeonju', name: '전주성', destination: 'jeonjufield',
    owner: 'joseon-court', garrison: 610, fortification: 72, lastBattle: '전라 감영군 집결',
  },
  busan: {
    id: 'busan', name: '부산진성', destination: 'busanjin',
    owner: 'joseon-court', garrison: 560, fortification: 74, lastBattle: '남해 출병항 경계',
  },
  ulleung: {
    id: 'ulleung', name: '울릉 관아', destination: 'ulleungcoast',
    owner: 'joseon-court', garrison: 210, fortification: 32, lastBattle: '관아 포졸 징발',
  },
  osaka: {
    id: 'osaka', name: '오사카', destination: 'osaka',
    owner: 'japanese-army', garrison: 900, fortification: 84, lastBattle: '출병군 군선 집결',
  },
});

const factionRecord = <T>(factory: (id: WarFactionId) => T): Record<WarFactionId, T> => ({
  'daedong-army': factory('daedong-army'),
  'jurchen-league': factory('jurchen-league'),
  'japanese-army': factory('japanese-army'),
  'joseon-court': factory('joseon-court'),
});

const GWANGHAE_PATH_MILESTONES = new Set([
  'gwanghae-path-coup',
  'gwanghae-path-suppression',
]);

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const finiteOr = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const isWarFactionId = (value: unknown): value is WarFactionId => (
  typeof value === 'string'
  && Object.prototype.hasOwnProperty.call(WAR_FACTIONS, value)
);

const normalizeMilestones = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  let gwanghaePathChosen = false;
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const milestone = entry.trim();
    if (!milestone || seen.has(milestone)) continue;
    if (GWANGHAE_PATH_MILESTONES.has(milestone)) {
      if (gwanghaePathChosen) continue;
      gwanghaePathChosen = true;
    }
    seen.add(milestone);
    result.push(milestone);
  }
  return result;
};

const normalizeChronicle = (value: unknown, fallback: readonly string[]): string[] => {
  if (!Array.isArray(value)) return [...fallback];
  const chronicle = value.flatMap((entry): string[] => {
    if (typeof entry !== 'string') return [];
    const line = entry.trim();
    return line ? [line] : [];
  }).slice(0, 8);
  return chronicle.length > 0 ? chronicle : [...fallback];
};

export const reserveCapacityForFaction = (
  state: Pick<FactionWarState, 'playerFaction' | 'strength'>,
  faction: WarFactionId,
  playerRank: number,
): number => {
  const definition = WAR_FACTIONS[faction];
  const rankGrowth = faction === state.playerFaction
    ? Math.max(0, playerRank - 1) * definition.reservePerRank
    : 0;
  const strengthFactor = 0.45 + Math.max(0, Math.min(100, state.strength[faction])) / 100 * 0.55;
  return Math.max(40, Math.floor((definition.baseReserve + rankGrowth) * strengthFactor));
};

export const reserveRecoveryPerMinute = (
  state: Pick<FactionWarState, 'playerFaction' | 'strength'>,
  faction: WarFactionId,
  playerRank: number,
): number => {
  const rankFactor = faction === state.playerFaction ? 1 + Math.max(0, playerRank - 1) * 0.08 : 1;
  const strengthFactor = 0.35 + Math.max(0, Math.min(100, state.strength[faction])) / 100 * 0.65;
  return Math.max(1, WAR_FACTIONS[faction].recoveryPerMinute * rankFactor * strengthFactor);
};

export const createFactionWarState = (origin: PlayerOrigin): FactionWarState => {
  const playerFaction = factionForPlayerOrigin(origin);
  const openingStrength: Record<WarFactionId, number> = {
    'daedong-army': 28,
    'jurchen-league': 22,
    'japanese-army': 30,
    'joseon-court': 72,
  };
  const openingReserve: Record<WarFactionId, number> = {
    'daedong-army': 32,
    'jurchen-league': 0,
    'japanese-army': 24,
    'joseon-court': 360,
  };
  const strength = factionRecord((id) => (
    id === playerFaction
      ? openingStrength[playerFaction]
      : id === 'joseon-court' ? 92 : 82
  ));
  const openingChronicle = playerFaction === 'jurchen-league'
    ? '압록 첫 전투에서 하진의 군세가 무너졌다. 살아남은 전열만 남고 호출 가능한 예비병은 0명이 되었다.'
    : playerFaction === 'japanese-army'
      ? '연화는 포로촌 생존자와 왜군 낙오병 스물넷을 묶어 첫 원정대를 세웠다.'
      : playerFaction === 'joseon-court'
        ? '선조는 왕세자 광해에게 분조를 맡겼다. 광해는 무너진 고을의 군량과 의병을 수습해 북상할 채비를 갖췄다.'
        : '김동혁은 감옥을 빠져나온 뒤 농민 서른두 명과 대동의 첫 깃발을 들었다.';
  const state: FactionWarState = {
    playerFaction,
    strength,
    reserve: factionRecord(() => 0),
    recoveryProgress: factionRecord(() => 0),
    strongholds: initialStrongholds(),
    resolvedMilestones: [],
    chronicle: [openingChronicle],
  };
  for (const faction of Object.keys(WAR_FACTIONS) as WarFactionId[]) {
    state.reserve[faction] = faction === playerFaction
      ? openingReserve[playerFaction]
      : reserveCapacityForFaction(state, faction, 1);
  }
  return state;
};

export const restoreFactionWarState = (
  saved: unknown,
  origin: PlayerOrigin,
  playerRank: number,
): FactionWarState => {
  const fallback = createFactionWarState(origin);
  const candidate = asRecord(saved);
  if (!candidate || candidate.playerFaction !== factionForPlayerOrigin(origin)) return fallback;
  const savedStrength = asRecord(candidate.strength);
  const savedReserve = asRecord(candidate.reserve);
  const savedRecovery = asRecord(candidate.recoveryProgress);
  const savedStrongholds = asRecord(candidate.strongholds);
  const safePlayerRank = typeof playerRank === 'number' && Number.isFinite(playerRank)
    ? Math.max(1, Math.floor(playerRank))
    : 1;
  const restored: FactionWarState = {
    playerFaction: fallback.playerFaction,
    strength: factionRecord((id) => Math.max(
      0,
      Math.min(100, finiteOr(savedStrength?.[id], fallback.strength[id])),
    )),
    reserve: factionRecord((id) => Math.max(
      0,
      finiteOr(savedReserve?.[id], fallback.reserve[id]),
    )),
    recoveryProgress: factionRecord((id) => Math.max(
      0,
      finiteOr(savedRecovery?.[id], 0),
    )),
    strongholds: initialStrongholds(),
    resolvedMilestones: normalizeMilestones(candidate.resolvedMilestones),
    chronicle: normalizeChronicle(candidate.chronicle, fallback.chronicle),
  };
  for (const id of Object.keys(restored.strongholds) as StrongholdId[]) {
    const savedStronghold = asRecord(savedStrongholds?.[id]);
    if (!savedStronghold || !isWarFactionId(savedStronghold.owner)) continue;
    const fallbackStronghold = restored.strongholds[id];
    restored.strongholds[id] = {
      ...fallbackStronghold,
      owner: savedStronghold.owner,
      garrison: Math.max(0, Math.round(finiteOr(
        savedStronghold.garrison,
        fallbackStronghold.garrison,
      ))),
      fortification: Math.max(0, Math.min(100, Math.round(finiteOr(
        savedStronghold.fortification,
        fallbackStronghold.fortification,
      )))),
      lastBattle: typeof savedStronghold.lastBattle === 'string'
        && savedStronghold.lastBattle.trim()
        ? savedStronghold.lastBattle.trim()
        : fallbackStronghold.lastBattle,
    };
  }
  for (const faction of Object.keys(WAR_FACTIONS) as WarFactionId[]) {
    restored.reserve[faction] = Math.min(
      restored.reserve[faction],
      reserveCapacityForFaction(restored, faction, safePlayerRank),
    );
  }
  return restored;
};

export const cloneFactionWarState = (state: FactionWarState): FactionWarState => ({
  playerFaction: state.playerFaction,
  strength: { ...state.strength },
  reserve: { ...state.reserve },
  recoveryProgress: { ...state.recoveryProgress },
  strongholds: Object.fromEntries(
    Object.entries(state.strongholds).map(([id, stronghold]) => [id, { ...stronghold }]),
  ) as Record<StrongholdId, StrongholdWarState>,
  resolvedMilestones: [...state.resolvedMilestones],
  chronicle: [...state.chronicle],
});

export const advanceFactionWar = (
  state: FactionWarState,
  seconds: number,
  playerRank: number,
): void => {
  const elapsed = Math.max(0, Math.min(seconds, 5));
  for (const faction of Object.keys(WAR_FACTIONS) as WarFactionId[]) {
    const capacity = reserveCapacityForFaction(state, faction, playerRank);
    if (state.reserve[faction] > capacity) state.reserve[faction] = capacity;
    if (state.reserve[faction] >= capacity) {
      state.recoveryProgress[faction] = 0;
      continue;
    }
    state.recoveryProgress[faction] += reserveRecoveryPerMinute(state, faction, playerRank) / 60 * elapsed;
    const recovered = Math.floor(state.recoveryProgress[faction]);
    if (recovered <= 0) continue;
    state.recoveryProgress[faction] -= recovered;
    state.reserve[faction] = Math.min(capacity, state.reserve[faction] + recovered);
  }
};

export const weakenFaction = (
  state: FactionWarState,
  faction: WarFactionId,
  strengthLoss: number,
  playerRank: number,
): void => {
  state.strength[faction] = Math.max(0, state.strength[faction] - Math.max(0, strengthLoss));
  state.reserve[faction] = Math.min(
    state.reserve[faction],
    reserveCapacityForFaction(state, faction, playerRank),
  );
};

/**
 * Resolve a named, one-shot recruitment contact. The milestone is the durable
 * source of truth, so old and new save files do not need a second quest-state
 * array. Strength is applied before capacity is calculated, allowing a newly
 * organised force to house the recruits it just raised.
 */
export const rallyFactionReserve = (
  state: FactionWarState,
  milestone: string,
  faction: WarFactionId,
  recruits: number,
  strengthGain: number,
  chronicle: string,
  playerRank: number,
): FactionReserveRallyResult => {
  if (state.resolvedMilestones.includes(milestone)) {
    return {
      rallied: false,
      reserveAdded: 0,
      strengthAdded: 0,
      reserve: Math.floor(state.reserve[faction]),
      strength: state.strength[faction],
      reserveCapacity: reserveCapacityForFaction(state, faction, playerRank),
    };
  }

  const reserveBefore = state.reserve[faction];
  const strengthBefore = state.strength[faction];
  state.resolvedMilestones.push(milestone);
  state.strength[faction] = Math.min(100, strengthBefore + Math.max(0, strengthGain));
  const reserveCapacity = reserveCapacityForFaction(state, faction, playerRank);
  state.reserve[faction] = Math.min(
    reserveCapacity,
    reserveBefore + Math.max(0, Math.floor(recruits)),
  );
  state.chronicle.unshift(chronicle);
  state.chronicle.splice(8);

  return {
    rallied: true,
    reserveAdded: Math.floor(state.reserve[faction] - reserveBefore),
    strengthAdded: state.strength[faction] - strengthBefore,
    reserve: Math.floor(state.reserve[faction]),
    strength: state.strength[faction],
    reserveCapacity,
  };
};

/** Apply the lasting military consequence of a mutually-exclusive decision. */
export const resolveFactionDecision = (
  state: FactionWarState,
  milestone: string,
  faction: WarFactionId,
  adjustment: Readonly<{
    reserveRetainedRatio: number;
    strengthGain: number;
    chronicle: string;
  }>,
  playerRank: number,
): FactionDecisionResult => {
  const reserveBefore = state.reserve[faction];
  const strengthBefore = state.strength[faction];
  if (state.resolvedMilestones.includes(milestone)) {
    return {
      resolved: false,
      reserveBefore,
      reserve: Math.floor(reserveBefore),
      strengthBefore,
      strength: strengthBefore,
    };
  }

  state.resolvedMilestones.push(milestone);
  state.strength[faction] = Math.min(100, strengthBefore + Math.max(0, adjustment.strengthGain));
  const capacity = reserveCapacityForFaction(state, faction, playerRank);
  const retained = Math.max(0, Math.min(1, adjustment.reserveRetainedRatio));
  state.reserve[faction] = Math.min(capacity, Math.floor(reserveBefore * retained));
  state.recoveryProgress[faction] = 0;
  state.chronicle.unshift(adjustment.chronicle);
  state.chronicle.splice(8);
  return {
    resolved: true,
    reserveBefore,
    reserve: Math.floor(state.reserve[faction]),
    strengthBefore,
    strength: state.strength[faction],
  };
};

export const captureStronghold = (
  state: FactionWarState,
  milestone: string,
  strongholdId: StrongholdId,
  attacker: WarFactionId,
  battleTitle: string,
  playerRank: number,
): boolean => {
  if (state.resolvedMilestones.includes(milestone)) return false;
  state.resolvedMilestones.push(milestone);
  const stronghold = state.strongholds[strongholdId];
  const defender = stronghold.owner;
  if (defender === attacker) return false;

  const attackerLosses = Math.max(8, Math.round(stronghold.garrison * 0.16));
  const defenderLosses = Math.max(18, Math.round(stronghold.garrison * 0.62));
  state.reserve[attacker] = Math.max(0, state.reserve[attacker] - attackerLosses);
  state.reserve[defender] = Math.max(0, state.reserve[defender] - defenderLosses);
  state.strength[attacker] = Math.min(100, state.strength[attacker] + 7);
  weakenFaction(state, defender, 9, playerRank);

  const occupyingForce = Math.max(36, Math.min(
    220,
    Math.round(reserveCapacityForFaction(state, attacker, playerRank) * 0.12),
  ));
  const reserveDeployment = Math.min(occupyingForce, state.reserve[attacker]);
  const deployed = Math.max(12, reserveDeployment);
  state.reserve[attacker] -= reserveDeployment;
  stronghold.owner = attacker;
  stronghold.garrison = deployed;
  stronghold.fortification = Math.max(20, stronghold.fortification - 14);
  stronghold.lastBattle = battleTitle;
  state.chronicle.unshift(
    `${battleTitle} · ${WAR_FACTIONS[attacker].shortName}이 ${stronghold.name}을 점령했다.`,
  );
  state.chronicle.splice(8);
  return true;
};

const campaignOrder: Record<WarFactionId, StrongholdId[]> = {
  'daedong-army': ['ulleung', 'yeongwol', 'jeonju', 'busan', 'hanseong'],
  'jurchen-league': ['yalu', 'pyongyang', 'hanseong', 'jeonju', 'busan'],
  'japanese-army': ['busan', 'yeongwol', 'hanseong', 'pyongyang', 'jeonju'],
  'joseon-court': ['osaka', 'jurchen'],
};

export const factionWarSnapshot = (
  state: FactionWarState,
  playerRank: number,
): FactionWarSnapshot => {
  const strongholds = Object.values(state.strongholds);
  const target = campaignOrder[state.playerFaction]
    .find((id) => state.strongholds[id].owner !== state.playerFaction)
    ?? 'hanseong';
  const targetState = state.strongholds[target];
  return {
    playerFaction: state.playerFaction,
    factions: (Object.keys(WAR_FACTIONS) as WarFactionId[]).map((id) => ({
      id,
      name: WAR_FACTIONS[id].name,
      shortName: WAR_FACTIONS[id].shortName,
      doctrine: WAR_FACTIONS[id].doctrine,
      strength: state.strength[id],
      reserve: Math.floor(state.reserve[id]),
      reserveCapacity: reserveCapacityForFaction(state, id, playerRank),
      recoveryPerMinute: Math.round(reserveRecoveryPerMinute(state, id, playerRank) * 10) / 10,
      holdings: strongholds.filter((stronghold) => stronghold.owner === id).length,
      player: id === state.playerFaction,
    })),
    strongholds: strongholds.map((stronghold) => ({ ...stronghold })),
    activeConflict: {
      title: `${WAR_FACTIONS[state.playerFaction].shortName}의 다음 공방전 · ${targetState.name}`,
      attacker: state.playerFaction,
      defender: targetState.owner,
      stronghold: target,
    },
    chronicle: [...state.chronicle],
  };
};
