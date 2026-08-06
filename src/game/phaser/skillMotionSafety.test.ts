import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('skill motion presentation safety', () => {
  it('moves leap and dash through a local render track without freezing the world tween manager', () => {
    expect(sceneSource).toContain('private skillWorldMotion:');
    expect(sceneSource).toContain('Phaser.Math.Linear(this.skillWorldMotion.from.x');
    expect(sceneSource).toContain('Math.sin(progress * Math.PI) * 76');
    expect(sceneSource).not.toContain('this.tweens.timeScale');
  });

  it('prevents stale delayed skill effects from playing after the action changes', () => {
    expect(sceneSource).toContain('private skillVisualNonce = 0');
    expect(sceneSource).toContain('visualNonce === this.skillVisualNonce');
    expect(sceneSource).toContain('visualNonce !== this.skillVisualNonce');
  });

  it('receives already traced skill endpoints instead of rendering through blocked terrain', () => {
    const simulationSource = readFileSync(new URL('../simulation/GameSimulation.ts', import.meta.url), 'utf8');
    expect(simulationSource).toContain('private traceWalkableTravel(from: Vec2, desired: Vec2)');
    expect(simulationSource).toContain('this.traceWalkableTravel(from, {');
  });
});
