import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

const sceneSource = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');

describe('siege destruction image set', () => {
  it('ships an eight-frame transparent 512px production atlas', () => {
    expect(ASSETS.props.siegeDestruction).toEqual({
      key: 'siege-destruction-atlas-v1',
      path: '/assets/environment/props/siege-destruction-atlas-v1.png',
    });
    const png = readFileSync(new URL('../../../public/assets/environment/props/siege-destruction-atlas-v1.png', import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(2048);
    expect(png.readUInt32BE(20)).toBe(1024);
    expect(png[25]).toBe(6);
  });

  it('connects the atlas to battle progress, animated machinery and runtime QA markers', () => {
    expect(sceneSource).toContain('this.load.spritesheet(ASSETS.props.siegeDestruction.key');
    expect(sceneSource).toContain('this.createSiegePresentation();');
    expect(sceneSource).toContain('this.syncSiegePresentation();');
    expect(sceneSource).toContain('siegeDamageStage(progress.defeated, progress.total, progress.cleared)');
    expect(sceneSource).toContain('const frame = siegeMachineFrame(view.kind, impactFrame);');
    expect(sceneSource).toContain('view.sprite.setFrame(frame);');
    expect(sceneSource).toContain('this.game.canvas.dataset.siegeVisual');
  });

  it('keeps corpses identifiable so respawns cannot overlap their previous bodies', () => {
    expect(sceneSource).toContain("entityKind: 'monster' | 'boss'");
    expect(sceneSource).toContain('this.removeCorpse(monster.id);');
    expect(sceneSource).toContain('this.showBossCorpse(this.simulation.boss, this.bossView)');
    expect(sceneSource).toContain('this.game.canvas.dataset.corpseVisual');
  });
});
