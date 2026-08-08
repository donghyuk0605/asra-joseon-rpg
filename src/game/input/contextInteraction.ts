export type InteractionPoint = Readonly<{ x: number; y: number }>;

export type InteractionCandidate<TKind extends string = string> = Readonly<{
  kind: TKind;
  id: string;
  point: InteractionPoint;
  readyDistance: number;
  discoveryDistance: number;
  priority?: number;
}>;

export type ResolvedInteraction<TKind extends string = string> = InteractionCandidate<TKind> & Readonly<{
  distance: number;
  ready: boolean;
}>;

export const NPC_INTERACTION_READY_DISTANCE = 112;
export const NPC_INTERACTION_DISCOVERY_DISTANCE = 280;
export const LOOT_INTERACTION_READY_DISTANCE = 68;
export const LOOT_INTERACTION_DISCOVERY_DISTANCE = 240;

export const interactionDistance = (from: InteractionPoint, to: InteractionPoint): number =>
  Math.hypot(to.x - from.x, to.y - from.y);

export const approachPoint = (
  from: InteractionPoint,
  target: InteractionPoint,
  stoppingDistance: number,
): InteractionPoint => {
  const distance = interactionDistance(from, target);
  if (distance <= stoppingDistance || distance === 0) return { ...from };
  const travel = distance - stoppingDistance;
  return {
    x: from.x + ((target.x - from.x) / distance) * travel,
    y: from.y + ((target.y - from.y) / distance) * travel,
  };
};

export const resolveNearestInteraction = <TKind extends string>(
  player: InteractionPoint,
  candidates: readonly InteractionCandidate<TKind>[],
  preferredId: string | null = null,
): ResolvedInteraction<TKind> | null => {
  const resolved = candidates.flatMap((candidate) => {
    const distance = interactionDistance(player, candidate.point);
    if (distance > candidate.discoveryDistance && candidate.id !== preferredId) return [];
    return [{
      ...candidate,
      distance,
      ready: distance <= candidate.readyDistance,
    }];
  });
  if (resolved.length === 0) return null;
  return resolved.sort((left, right) => {
    const leftPreferred = left.id === preferredId ? 1 : 0;
    const rightPreferred = right.id === preferredId ? 1 : 0;
    return rightPreferred - leftPreferred
      || (right.priority ?? 0) - (left.priority ?? 0)
      || left.distance - right.distance;
  })[0];
};
