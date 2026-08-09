import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

describe('seven-element combat impact image set', () => {
  it('ships one normalized 7 by 4 transparent raster atlas', () => {
    expect(ASSETS.elementalImpacts).toEqual({
      key: 'beta-elemental-impact-atlas-v1',
      path: '/assets/fx/beta-elemental-impact-atlas-v1.png',
    });
    const url = new URL(`../../../public${ASSETS.elementalImpacts.path}`, import.meta.url);
    const png = readFileSync(url);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1_024);
    expect(png.readUInt32BE(20)).toBe(1_792);
    expect(statSync(url).size).toBeGreaterThan(300_000);
    expect(() => execFileSync('python3', ['scripts/validate_elemental_impact_atlas.py'], {
      cwd: new URL('../../../', import.meta.url),
      stdio: 'pipe',
    })).not.toThrow();
  }, 30_000);

  it('maps every elemental event to authored frames and reduced-motion timing', () => {
    const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
    const elementalEffectStart = scene.indexOf('  private createElementalEffect(');
    const elementalEffectEnd = scene.indexOf('\n  private ', elementalEffectStart + 1);
    const elementalEffect = scene.slice(elementalEffectStart, elementalEffectEnd);
    expect(elementalEffectStart).toBeGreaterThanOrEqual(0);
    expect(elementalEffectEnd).toBeGreaterThan(elementalEffectStart);
    for (const element of ['fire', 'ice', 'lightning', 'poison', 'wind', 'earth', 'shadow']) {
      expect(scene).toContain(`${element}:`);
    }
    expect(scene).toContain('this.load.spritesheet(ASSETS.elementalImpacts.key');
    expect(scene).toContain('this.add.sprite(effectX, effectY, ASSETS.elementalImpacts.key, baseFrame)');
    expect(scene).toContain('this.gameSettings.reducedMotion');
    expect(scene).toContain("this.game.canvas.dataset.elementalFx = `${element}:${baseFrame}`");
    expect(scene).toContain('ELEMENTAL_REACTION_FX[event.reaction]');
    expect(scene).toContain("this.createElementalEffectAt(\n        'shadow'");
    expect(elementalEffect).not.toContain('const ember = this.add.circle(');
    expect(elementalEffect).not.toContain('const ice = this.add.graphics({ x: target.x');
    expect(elementalEffect).not.toContain('const bubble = this.add.circle(');
  });
});
