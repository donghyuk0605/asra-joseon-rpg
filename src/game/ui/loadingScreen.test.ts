import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('mobile boot loading screen', () => {
  const html = readFileSync('index.html', 'utf8');
  const main = readFileSync('src/main.ts', 'utf8');
  const scene = readFileSync('src/game/phaser/HuntingScene.ts', 'utf8');

  const declarationsFor = (selector: string): string[] => {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [...html.matchAll(new RegExp(`${escapedSelector}\\{([^}]+)\\}`, 'g'))]
      .map((match) => match[1]);
  };

  const pixelValue = (declarations: string, property: string): number => {
    const match = declarations.match(new RegExp(`${property}:\\s*(\\d+(?:\\.\\d+)?)px`));
    return match ? Number(match[1]) : Number.NaN;
  };

  it('renders a styled progress surface before the game module starts', () => {
    const loaderIndex = html.indexOf('id="boot-loader"');
    const moduleIndex = html.indexOf('src="/src/main.ts"');

    expect(loaderIndex).toBeGreaterThan(0);
    expect(moduleIndex).toBeGreaterThan(loaderIndex);
    expect(html).toContain('id="boot-progress-fill"');
    expect(html).toContain('aria-valuenow="4"');
    expect(html).toContain('radial-gradient');
    expect(html).toContain("url('/assets/ui/beta/beta-campaign-keyart-v1.webp')");
    expect(html).toContain("url('/assets/ui/asra-title-keyart-mobile-v1.webp')");
    expect(html).toContain("url('/assets/ui/wolyeongrok-loading-frame-v1.webp')");
    expect(html).toContain('<strong class="boot-title-logo">아스라</strong>');
    expect(html).toContain('aria-label="아스라 게임 자원 불러오기"');
  });

  it('keeps the mobile progress fill visibly tall and wide under global border-box sizing', () => {
    const trackRules = declarationsFor('.boot-track');
    const fillRule = declarationsFor('.boot-track i')[0] ?? '';
    const mobileTrackRule = trackRules.at(-1) ?? '';

    expect(trackRules.some((rule) => rule.includes('box-sizing:content-box'))).toBe(true);
    expect(pixelValue(mobileTrackRule, 'height')).toBeGreaterThanOrEqual(6);
    expect(pixelValue(fillRule, 'min-width')).toBeGreaterThanOrEqual(20);
  });

  it('keeps the bottom loading card inside the dynamic mobile viewport and safe area', () => {
    const loaderRules = declarationsFor('#boot-loader');
    const baseLoaderRule = loaderRules[0] ?? '';
    const mobileLoaderRule = loaderRules.at(-1) ?? '';

    expect(baseLoaderRule).toContain('height:100dvh');
    expect(baseLoaderRule).toContain('min-height:100svh');
    expect(mobileLoaderRule).toMatch(
      /padding:[^;]*calc\(env\(safe-area-inset-bottom\)\s*\+\s*\d+px\)/,
    );
  });

  it('keeps both title and Phaser loading phases visible for a perceptible minimum', () => {
    const minimumVisiblePattern =
      /(?:BOOT_LOADER_MIN_VISIBLE_MS|MIN_BOOT_VISIBLE_MS|MINIMUM_BOOT_VISIBLE_MS)\s*=\s*(\d+)/;
    const bootTimestampPattern =
      /dataset\.(?:bootShownAt|bootVisibleAt|visibleAt)/;
    const minimumDelayPattern =
      /Math\.max\(0,\s*(?:BOOT_LOADER_MIN_VISIBLE_MS|MIN_BOOT_VISIBLE_MS|MINIMUM_BOOT_VISIBLE_MS)\s*-/;
    const configuredMinimum = Number(
      main.match(minimumVisiblePattern)?.[1]
      ?? scene.match(minimumVisiblePattern)?.[1],
    );

    expect(configuredMinimum).toBeGreaterThanOrEqual(600);
    expect(main).toMatch(bootTimestampPattern);
    expect(scene).toMatch(bootTimestampPattern);
    expect(main).toMatch(minimumDelayPattern);
    expect(scene).toMatch(minimumDelayPattern);
  });

  it('connects Phaser asset progress and removes the cover after the first playable frame', () => {
    expect(scene).toContain("this.load.on('progress'");
    expect(scene).toContain("this.load.once('complete'");
    expect(scene).toContain('this.finishBootLoader()');
    expect(scene).toContain("root.classList.add('is-ready')");
  });
});
