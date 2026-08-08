import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');

describe('manual save quality-of-life flow', () => {
  it('routes the pause-menu action through the existing conflict-safe save pipeline', () => {
    expect(hud).toContain('data-action="manual-save"');
    expect(hud).toContain('this.actions.onManualSave()');
    expect(scene).toContain('onManualSave: () => this.saveSinglePlayer(true)');
    expect(scene).toContain("result.status === 'conflict'");
    expect(scene).toContain("manual ? '수동 저장됨' : '자동 저장됨'");
  });
});
