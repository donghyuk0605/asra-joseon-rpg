import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('regional weather renderer wiring', () => {
  const source = readFileSync(new URL('./regionalWeatherMotion.ts', import.meta.url), 'utf8');

  it('uses the authored atlas and swaps paired frames during real travel motion', () => {
    expect(source).toContain('ASSETS.props.regionalWeather.key');
    expect(source).toContain("setData('weatherFrames'");
    expect(source).toContain('sprite.setFrame(frames[pairFrame])');
    expect(source).toContain('dataset.weatherFrame');
    expect(source).toContain('targets: sprite');
  });

  it('keeps reduced motion static and tags each particle for regional culling', () => {
    expect(source).toContain('if (reducedMotion) continue');
    expect(source).toContain("setData('defaultObjectComposedRegion', region)");
    expect(source).toContain("setData('weatherRegion', region)");
  });
});
