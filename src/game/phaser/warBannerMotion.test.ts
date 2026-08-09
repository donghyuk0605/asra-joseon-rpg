import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('war banner motion', () => {
  const source = readFileSync(new URL('./warBannerMotion.ts', import.meta.url), 'utf8');

  it('separates the fixed support from the animated four-frame cloth', () => {
    expect(source).toContain("'pole-static'");
    expect(source).toContain("'cloth-moving'");
    expect(source).toContain('ASSETS.props.ambient.flagPole.key');
    expect(source).toContain('ASSETS.props.ambient.flagCloth.key');
    expect(source).toContain('cloth.play(WAR_BANNER_ANIMATION_KEY)');
    expect(source).toContain('ANIMATION_UPDATE');
    expect(source).toContain('warBannerVisual');
  });

  it('only targets the cloth with physical sway', () => {
    expect(source).toContain('targets: cloth');
    expect(source).not.toContain('targets: pole');
  });
});
