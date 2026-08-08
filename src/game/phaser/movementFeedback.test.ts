import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('movement and collision feedback', () => {
  const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');
  const simulation = readFileSync(new URL('../simulation/GameSimulation.ts', import.meta.url), 'utf8');
  const hud = readFileSync(new URL('../ui/Hud.ts', import.meta.url), 'utf8');

  it('separates the requested click, projected destination, reroute and blocked markers', () => {
    expect(scene).toContain('requestedDestinationMark');
    expect(scene).toContain('blockedDestinationMark');
    expect(scene).toContain("plan.adjusted ? 'projected' : plan.routed ? 'routed' : 'direct'");
    expect(scene).toContain("document.body.dataset.movementFeedback = 'rerouted'");
    expect(scene).toContain("document.body.dataset.movementFeedback = 'blocked'");
    expect(scene).toContain("get('navqa')");
    expect(scene).toContain("document.body.dataset.navigationQa = 'blocked'");
  });

  it('reports actual navigation recovery and final failure from the simulation', () => {
    expect(simulation).toContain("type: 'movement-rerouted'");
    expect(simulation).toContain("type: 'movement-blocked'");
    expect(simulation).toContain('this.playerNavigationRecoveries < 2');
    expect(hud).toContain('이동 불가 · 장애물에 막혔습니다.');
  });
});
