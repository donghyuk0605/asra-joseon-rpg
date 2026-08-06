import type { MonsterKind } from '../simulation/types';
import type { RegionId } from '../world/regions';

const PYONGYANG_REGIONS = new Set<RegionId>([
  'pyongyangouter',
  'pyongyanggate',
  'pyongyanginner',
]);

const BUSANJIN_REGIONS = new Set<RegionId>(['busanjin']);

export type DirectionalMonsterScale = readonly [
  south: number,
  southwest: number,
  west: number,
  northwest: number,
  north: number,
];

/**
 * The Pyongyang soldier atlases were produced independently, so their authored
 * body height varies by both class and direction. Thin weapons (especially the
 * vertical spear) are deliberately excluded from the measurement.
 *
 * Rows follow the shared S, SW, W, NW, N atlas contract. Regular soldiers read
 * as a 92px body and the commander as a deliberately larger 96px body. Scaling
 * happens around the common 247px foot line, so direction changes never move a
 * soldier's feet.
 */
export const PYONGYANG_SOLDIER_VISUAL_SCALE = {
  'joseon-border-swordsman': [0.526, 0.548, 0.560, 0.564, 0.578],
  'joseon-border-spearman': [0.605, 0.646, 0.624, 0.641, 0.688],
  'joseon-border-archer': [0.659, 0.681, 0.685, 0.716, 0.737],
  'joseon-border-commander': [0.565, 0.577, 0.570, 0.559, 0.698],
  'royal-guard': [0.526, 0.548, 0.560, 0.564, 0.578],
} as const satisfies Partial<Record<MonsterKind, DirectionalMonsterScale>>;

/**
 * Busanjin uses a close, human-scale fortress map. The Japanese atlases were
 * authored at different body heights, so one global per-kind scale makes a
 * gunner or north-facing general tower over the gate. These five-row values
 * normalize regular soldiers to roughly 82px and the general to roughly 92px.
 */
export const BUSANJIN_SOLDIER_VISUAL_SCALE = {
  'japanese-swordsman': [0.487, 0.490, 0.485, 0.492, 0.505],
  'japanese-spearman': [0.492, 0.487, 0.485, 0.490, 0.480],
  'japanese-archer': [0.563, 0.542, 0.543, 0.548, 0.534],
  'japanese-gunner': [0.444, 0.446, 0.446, 0.453, 0.520],
  'japanese-general': [0.495, 0.516, 0.510, 0.523, 0.646],
} as const satisfies Partial<Record<MonsterKind, DirectionalMonsterScale>>;

export const monsterScaleForRegion = (
  kind: MonsterKind,
  region: RegionId,
  directionRow: number,
  fallbackScale: number,
): number => {
  const scaleTable = PYONGYANG_REGIONS.has(region)
    ? PYONGYANG_SOLDIER_VISUAL_SCALE
    : BUSANJIN_REGIONS.has(region)
      ? BUSANJIN_SOLDIER_VISUAL_SCALE
      : null;
  if (!scaleTable) return fallbackScale;
  const directionalScales = scaleTable[kind as keyof typeof scaleTable];
  if (!directionalScales) return fallbackScale;
  const safeRow = Math.max(0, Math.min(4, Math.trunc(directionRow)));
  return directionalScales[safeRow] ?? fallbackScale;
};
