import { describe, expect, it } from 'vitest';
import {
  REGIONAL_WEATHER_REGION_IDS,
  regionalWeatherParticleCount,
  regionalWeatherProfile,
  WEATHER_ATLAS_FRAMES,
} from './regionalWeather';

describe('regional weather profiles', () => {
  it('assigns distinct image-set weather to northern, coastal, forest, and windy maps', () => {
    expect(regionalWeatherProfile('blackpinehunt')?.kind).toBe('snow');
    expect(regionalWeatherProfile('osaka')?.kind).toBe('rain');
    expect(regionalWeatherProfile('mistwood')?.kind).toBe('mist');
    expect(regionalWeatherProfile('ulleungridge')?.kind).toBe('wind');
    expect(REGIONAL_WEATHER_REGION_IDS.length).toBeGreaterThanOrEqual(30);
  });

  it('keeps every weather state on an exclusive two-frame atlas range', () => {
    expect(new Set(Object.values(WEATHER_ATLAS_FRAMES).flat()).size).toBe(8);
    expect(WEATHER_ATLAS_FRAMES.snow).toEqual([0, 1]);
    expect(WEATHER_ATLAS_FRAMES.mist).toEqual([4, 5]);
  });

  it('reduces particles for mobile, performance, and reduced-motion profiles', () => {
    const profile = regionalWeatherProfile('blackpinehunt')!;
    const highDesktop = regionalWeatherParticleCount(profile, 'high', false, false);
    expect(regionalWeatherParticleCount(profile, 'balanced', true, false)).toBeLessThan(highDesktop);
    expect(regionalWeatherParticleCount(profile, 'performance', false, false)).toBeLessThan(highDesktop);
    expect(regionalWeatherParticleCount(profile, 'high', false, true)).toBe(2);
  });
});
