import type { RegionId } from './regions';

export type SiegeDamageStage = 0 | 1 | 2 | 3;
export type SiegeMachineKind = 'mangonel' | 'ram';
export type SiegeRuinKind = 'wall' | 'barricade' | 'house';

export type SiegeMachineSite = {
  id: string;
  region: RegionId;
  kind: SiegeMachineKind;
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;
};

export type SiegeRuinSite = {
  id: string;
  region: RegionId;
  kind: SiegeRuinKind;
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;
};

export const siegeDamageStage = (
  defeated: number,
  total: number,
  cleared: boolean,
): SiegeDamageStage => {
  if (cleared) return 3;
  if (total <= 0) return 0;
  const progress = defeated / total;
  if (progress >= 0.67) return 2;
  if (progress >= 0.34) return 1;
  return 0;
};

export const siegeMachineFrame = (kind: SiegeMachineKind, impactFrame: boolean): number => (
  kind === 'mangonel' ? (impactFrame ? 1 : 0) : impactFrame ? 3 : 2
);

export const siegeRuinFrame = (kind: SiegeRuinKind, stage: SiegeDamageStage): number | null => {
  if (stage === 0) return null;
  if (stage === 1) return kind === 'wall' ? 4 : null;
  if (stage === 2) return kind === 'wall' ? 4 : 6;
  if (kind === 'wall') return 5;
  if (kind === 'house') return 7;
  return 6;
};

export const SIEGE_MACHINE_SITES: readonly SiegeMachineSite[] = [
  { id: 'busanjin-west-mangonel', region: 'busanjin', kind: 'mangonel', x: 350, y: 858, scale: 0.33 },
  { id: 'busanjin-east-ram', region: 'busanjin', kind: 'ram', x: 1188, y: 858, scale: 0.32, flipX: true },
  { id: 'pyongyang-outer-west-mangonel', region: 'pyongyangouter', kind: 'mangonel', x: 470, y: 720, scale: 0.34 },
  { id: 'pyongyang-gate-west-ram', region: 'pyongyanggate', kind: 'ram', x: 635, y: 675, scale: 0.33 },
  { id: 'pyongyang-inner-west-mangonel', region: 'pyongyanginner', kind: 'mangonel', x: 470, y: 700, scale: 0.34 },
  { id: 'gwanghwamun-west-ram', region: 'gyeongbokgate', kind: 'ram', x: 485, y: 795, scale: 0.32 },
  { id: 'geunjeong-east-mangonel', region: 'gyeongbokcourt', kind: 'mangonel', x: 1070, y: 675, scale: 0.31, flipX: true },
  { id: 'gyeongbok-inner-west-ram', region: 'gyeongbokinner', kind: 'ram', x: 470, y: 735, scale: 0.31 },
  { id: 'namhansan-lower-mangonel', region: 'namhansanseong', kind: 'mangonel', x: 465, y: 860, scale: 0.34 },
  { id: 'ganghwa-lower-ram', region: 'ganghwado', kind: 'ram', x: 1065, y: 800, scale: 0.33, flipX: true },
];

export const SIEGE_RUIN_SITES: readonly SiegeRuinSite[] = [
  { id: 'busanjin-west-barricade', region: 'busanjin', kind: 'barricade', x: 350, y: 930, scale: 0.36 },
  { id: 'busanjin-east-house', region: 'busanjin', kind: 'house', x: 1175, y: 365, scale: 0.34, flipX: true },
  { id: 'pyongyang-outer-west-wall', region: 'pyongyangouter', kind: 'wall', x: 330, y: 555, scale: 0.39 },
  { id: 'pyongyang-outer-east-house', region: 'pyongyangouter', kind: 'house', x: 1195, y: 865, scale: 0.35, flipX: true },
  { id: 'pyongyang-gate-west-wall', region: 'pyongyanggate', kind: 'wall', x: 550, y: 410, scale: 0.39 },
  { id: 'pyongyang-gate-west-barricade', region: 'pyongyanggate', kind: 'barricade', x: 520, y: 815, scale: 0.35 },
  { id: 'pyongyang-inner-east-wall', region: 'pyongyanginner', kind: 'wall', x: 1195, y: 165, scale: 0.38, flipX: true },
  { id: 'pyongyang-inner-west-house', region: 'pyongyanginner', kind: 'house', x: 330, y: 645, scale: 0.35 },
  { id: 'gwanghwamun-west-wall', region: 'gyeongbokgate', kind: 'wall', x: 310, y: 785, scale: 0.37 },
  { id: 'geunjeong-east-barricade', region: 'gyeongbokcourt', kind: 'barricade', x: 1190, y: 860, scale: 0.35, flipX: true },
  { id: 'gyeongbok-inner-west-house', region: 'gyeongbokinner', kind: 'house', x: 350, y: 485, scale: 0.34 },
  { id: 'namhansan-west-wall', region: 'namhansanseong', kind: 'wall', x: 350, y: 805, scale: 0.39 },
  { id: 'namhansan-east-house', region: 'namhansanseong', kind: 'house', x: 1135, y: 380, scale: 0.35, flipX: true },
  { id: 'ganghwa-east-wall', region: 'ganghwado', kind: 'wall', x: 1180, y: 745, scale: 0.39, flipX: true },
  { id: 'ganghwa-west-barricade', region: 'ganghwado', kind: 'barricade', x: 430, y: 570, scale: 0.35 },
];
