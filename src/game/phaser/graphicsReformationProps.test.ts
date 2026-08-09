import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');

describe('graphics reformation environment props', () => {
  it('uses shipped image sets instead of primitive rectangles for Pyongyang progression gates', () => {
    expect(scene).toContain('const barrier = this.add.image(0, 24, ASSETS.frontierCampProps.key, 4)');
    expect(scene).toContain('barrier: Phaser.GameObjects.Image');
    expect(scene).not.toContain('const leftDoor = this.add.rectangle');
    expect(scene).not.toContain('const crossbar = this.add.rectangle');
  });

  it('uses image-set reeds, war banners and market stalls in Jeonju', () => {
    expect(scene).toContain('ASSETS.props.ambient.reedCluster.key');
    expect(scene).toContain('ASSETS.frontierCampProps.key');
    expect(scene).toContain('ASSETS.props.episode2VillageProps.key');
    expect(scene).not.toContain('const flag = this.add.polygon');
    expect(scene).not.toContain('const awning = this.add.polygon');
  });
});
