import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Episode II object-composed regional motion', () => {
  const motion = readFileSync(new URL('./episode2RegionMotion.ts', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');

  it('constructs all twenty-four maps from independent runtime objects', () => {
    expect(scene).toContain('this.createEpisode2Worlds()');
    expect(scene).toContain('for (const region of EPISODE2_REGION_IDS)');
    expect(scene).toContain('createEpisode2RegionWorld(');
    expect(motion).toContain("setData('episode2ObjectPart', part)");
    expect(motion).toContain("setData('defaultObjectComposedRegion', true)");
    expect(motion).toContain("setData('imageSetAsset', true)");
    expect(motion).toContain('ASSETS.episode2TerrainBases[layout.clusterId].key');
    expect(motion).toContain('ASSETS.episode2WaterBank.key');
    expect(motion).not.toContain('scene.add.rectangle');
  });

  it('uses frame-based raster image sets for waves and rooted reed motion', () => {
    expect(motion).toContain('ASSETS.props.ambient.waterRipple.key');
    expect(motion).toContain('ASSETS.props.ambient.reedCluster.key');
    expect(motion).toContain('animateImageSet(scene, wave');
    expect(motion).toContain('animateImageSet(scene, reed');
    expect(motion).toContain('.setOrigin(0.5, 1)');
    expect(motion).toContain('reed.setAngle(Math.sin(phase) * 1.6');
    expect(motion).not.toContain('.svg');
  });

  it('moves only the cloth while each flag pole remains fixed', () => {
    expect(motion).toContain('flag-pole-static-');
    expect(motion).toContain('flag-cloth-moving-');
    expect(motion).toContain('animateImageSet(scene, cloth');
    expect(motion).toContain('cloth.setAngle');
    expect(motion).not.toContain('targets: pole');
    expect(motion).not.toContain('pole.setAngle');
  });

  it('separates the mill building from its rotating wheel and gives boats restrained hull motion', () => {
    expect(motion).toContain('ASSETS.props.episode2WaterwheelWheel.key');
    expect(motion).toContain('waterwheel-moving-part-');
    expect(motion).toContain('targets: wheel');
    expect(motion).toContain('angle: direction * 360');
    expect(motion).toContain('ASSETS.props.ambient.coastalBoatHull.key');
    expect(motion).toContain('hull.setAngle(Math.cos(phase) * 0.55');
    expect(motion).not.toContain('targets: image');
  });

  it('shares wind and tide signals while reacting locally to the player', () => {
    expect(motion).toContain('type MotionBus = Point &');
    expect(motion).toContain('nearWater ? 1 : 0.36');
    expect(motion).toContain('bus.activity = Phaser.Math.Linear');
    expect(motion).toContain('state.gust');
    expect(motion).toContain('state.tide');
    expect(motion).toContain('scene.events.off(Phaser.Scenes.Events.UPDATE, update)');
    expect(motion).toContain('if (!bus.enabled) tween.pause()');
    expect(motion).toContain('if (shouldRun) tween.resume()');
    expect(motion).toContain('else tween.pause()');
  });
});
