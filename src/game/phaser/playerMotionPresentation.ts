export const PLAYER_WALK_FRAME_RATE = 8;

export type PlayerActionCadence = 'fist' | 'blade' | 'bow' | 'ritual';

export type PlayerActionFrame = Readonly<{
  column: 4 | 5 | 6 | 7;
  atMs: number;
  phase: 'prepare' | 'accelerate' | 'impact' | 'recover';
}>;

const PLAYER_ACTION_TIMELINES: Readonly<Record<PlayerActionCadence, readonly PlayerActionFrame[]>> = {
  fist: [
    { column: 4, atMs: 0, phase: 'prepare' },
    { column: 5, atMs: 72, phase: 'accelerate' },
    { column: 6, atMs: 154, phase: 'impact' },
    { column: 7, atMs: 254, phase: 'recover' },
  ],
  blade: [
    { column: 4, atMs: 0, phase: 'prepare' },
    { column: 5, atMs: 86, phase: 'accelerate' },
    { column: 6, atMs: 178, phase: 'impact' },
    { column: 7, atMs: 292, phase: 'recover' },
  ],
  bow: [
    { column: 4, atMs: 0, phase: 'prepare' },
    { column: 5, atMs: 108, phase: 'accelerate' },
    { column: 6, atMs: 232, phase: 'impact' },
    { column: 7, atMs: 372, phase: 'recover' },
  ],
  ritual: [
    { column: 4, atMs: 0, phase: 'prepare' },
    { column: 5, atMs: 112, phase: 'accelerate' },
    { column: 6, atMs: 238, phase: 'impact' },
    { column: 7, atMs: 382, phase: 'recover' },
  ],
};

export function playerActionTimeline(cadence: PlayerActionCadence): readonly PlayerActionFrame[] {
  return PLAYER_ACTION_TIMELINES[cadence];
}

export type PlayerGaitPose = Readonly<{
  x: number;
  y: number;
  rotation: number;
  shadowAlpha: number;
  shadowScaleX: number;
  shadowScaleY: number;
  contact: boolean;
}>;

const WALK_GAIT: readonly PlayerGaitPose[] = [
  { x: -0.7, y: 0, rotation: -0.006, shadowAlpha: 0.38, shadowScaleX: 1, shadowScaleY: 0.84, contact: true },
  { x: 0, y: -2.6, rotation: 0, shadowAlpha: 0.31, shadowScaleX: 0.93, shadowScaleY: 0.76, contact: false },
  { x: 0.7, y: 0, rotation: 0.006, shadowAlpha: 0.38, shadowScaleX: 1, shadowScaleY: 0.84, contact: true },
  { x: 0, y: -2.6, rotation: 0, shadowAlpha: 0.31, shadowScaleX: 0.93, shadowScaleY: 0.76, contact: false },
];

export function playerGaitPose(column: number, flip: boolean, reducedMotion = false): PlayerGaitPose {
  const pose = WALK_GAIT[Math.abs(Math.floor(column)) % WALK_GAIT.length];
  if (reducedMotion) return { ...pose, x: 0, y: 0, rotation: 0 };
  return {
    ...pose,
    x: flip ? -pose.x : pose.x,
    rotation: flip ? -pose.rotation : pose.rotation,
  };
}

export function playerFrameQaFromSearch(search: string, enabled: boolean): number | null {
  if (!enabled) return null;
  const params = new URLSearchParams(search);
  if (!params.has('playerframeqa')) return null;
  const requested = Number(params.get('playerframeqa'));
  if (!Number.isFinite(requested)) return null;
  return Math.min(39, Math.max(0, Math.floor(requested)));
}
