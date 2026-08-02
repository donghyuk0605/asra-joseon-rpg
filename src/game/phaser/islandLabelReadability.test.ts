import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('island map label readability', () => {
  it('keeps route and objective labels without duplicating the HUD region title over combat', () => {
    const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');
    expect(scene).not.toContain("'울릉 해안 해송숲 · 초급 사냥길'");
    expect(scene).not.toContain("'울릉 관아 북문 · 탐관오리 최종 토벌지'");
    expect(scene).toContain("'북문 봉쇄 · 포졸 6명 처치'");
    expect(scene).toContain("'외곽 수비 마당 · 포졸 12명 토벌'");
    expect(scene).toContain("'남쪽 · 억새초원 피난길'");
  });
});
