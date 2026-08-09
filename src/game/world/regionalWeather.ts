import type { GraphicsQuality } from '../settings/GameSettings';
import type { RegionId } from './regions';

export type RegionalWeatherKind = 'snow' | 'rain' | 'mist' | 'wind';

export type RegionalWeatherProfile = {
  kind: RegionalWeatherKind;
  intensity: number;
  windX: number;
  windY: number;
  scale: number;
  alpha: number;
  tint: number;
};

export const WEATHER_ATLAS_FRAMES: Record<RegionalWeatherKind, readonly [number, number]> = {
  snow: [0, 1],
  rain: [2, 3],
  mist: [4, 5],
  wind: [6, 7],
};

const snow = (intensity: number, windX = 72): RegionalWeatherProfile => ({
  kind: 'snow', intensity, windX, windY: 118, scale: 0.9, alpha: 0.82, tint: 0xe8f1ef,
});
const rain = (intensity: number, windX = -76): RegionalWeatherProfile => ({
  kind: 'rain', intensity, windX, windY: 260, scale: 0.92, alpha: 0.7, tint: 0xc5dce1,
});
const mist = (intensity: number, windX = 96): RegionalWeatherProfile => ({
  kind: 'mist', intensity, windX, windY: -8, scale: 1.45, alpha: 0.38, tint: 0xc9d4cd,
});
const wind = (intensity: number, windX = 180): RegionalWeatherProfile => ({
  kind: 'wind', intensity, windX, windY: 52, scale: 0.78, alpha: 0.68, tint: 0xc9b17e,
});

/**
 * Authored regional atmosphere. Profiles are deliberately sparse: they mark
 * a province's visual identity without hiding combat silhouettes or roads.
 */
export const REGIONAL_WEATHER_PROFILES = {
  pyeongchang: snow(0.72, 84),
  jurchenvillage: snow(0.78, 92),
  changbaihunt: snow(0.88, 104),
  baeksanvillage: snow(0.76, 88),
  songhuahunt: snow(0.9, 118),
  songhuavillage: snow(0.7, 82),
  blackpinehunt: snow(0.96, 126),
  heuksuvillage: snow(0.82, 106),
  manchufrontier: snow(0.7, 112),
  pyongyangouter: snow(0.58, 94),
  pyongyanggate: snow(0.5, 80),
  pyongyanginner: snow(0.42, 68),

  osaka: rain(0.78, -92),
  awajicoast: rain(0.88, -116),
  busanjin: rain(0.6, -78),
  gangneung: rain(0.48, -68),
  geoje: rain(0.62, -92),
  boryeong: rain(0.54, -72),
  gunsan: rain(0.52, -76),
  tongyeong: rain(0.66, -98),

  mistwood: mist(0.84, 82),
  haeju: mist(0.78, 90),
  yamazakihunt: mist(0.58, 72),
  tsushimahunt: mist(0.62, 84),
  ulleungcoast: mist(0.52, 76),

  jeonjufield: wind(0.58, 168),
  tangeumdae: wind(0.72, 204),
  yangju: wind(0.48, 154),
  ulleungmeadow: wind(0.76, 218),
  ulleungridge: wind(0.92, 246),
} as const satisfies Partial<Record<RegionId, RegionalWeatherProfile>>;

export const regionalWeatherProfile = (region: RegionId): RegionalWeatherProfile | null => (
  REGIONAL_WEATHER_PROFILES[region as keyof typeof REGIONAL_WEATHER_PROFILES] ?? null
);

export const regionalWeatherParticleCount = (
  profile: RegionalWeatherProfile,
  quality: GraphicsQuality,
  mobileProfile: boolean,
  reducedMotion: boolean,
): number => {
  if (reducedMotion) return profile.kind === 'mist' ? 1 : 2;
  const base = profile.kind === 'mist'
    ? 2 + profile.intensity * 3
    : profile.kind === 'wind'
      ? 3 + profile.intensity * 5
      : 6 + profile.intensity * 8;
  const qualityScale = quality === 'high' ? 1 : quality === 'balanced' ? 0.78 : 0.5;
  const deviceScale = mobileProfile ? 0.58 : 1;
  return Math.max(1, Math.round(base * qualityScale * deviceScale));
};

export const REGIONAL_WEATHER_REGION_IDS = Object.freeze(
  Object.keys(REGIONAL_WEATHER_PROFILES) as Array<keyof typeof REGIONAL_WEATHER_PROFILES>,
);
