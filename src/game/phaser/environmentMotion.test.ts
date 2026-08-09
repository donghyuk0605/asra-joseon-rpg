import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dynamic island environment', () => {
  const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');

  it('animates masked ocean waves, foam reflections, and moonlit highlights across every island region', () => {
    expect(scene).toContain('this.createIslandOceanMotion()');
    expect(scene).toContain('const islandRegions: RegionId[] = [...ULLEUNG_REGION_IDS]');
    expect(scene).toContain('maskShape.fillStyle(0xffffff, 1).fillRect');
    expect(scene).toContain('Phaser.BlendModes.SCREEN');
    expect(scene).toContain('Phaser.BlendModes.ADD');
  });

  it('gives island pines independent base sway and delayed gust reactions', () => {
    expect(scene).toContain('this.createIslandTreeMotion()');
    expect(scene).toContain('ASSETS.props.joseonTreeSpecies.key');
    expect(scene).toContain("setData('treeSpecies'");
    expect(scene).toContain('repeatDelay: 4200');
    expect(scene).toContain('targets: crown');
    expect(scene).toContain('targets: root');
  });

  it('uses authored tree images instead of procedural branch primitives', () => {
    const start = scene.indexOf('private createIslandTreeMotion(): void');
    const end = scene.indexOf('private createWindField(): void');
    const treeMotion = scene.slice(start, end);
    expect(treeMotion).toContain('treeSpeciesFrame(');
    expect(treeMotion).toContain('.setOrigin(0.5, 0.978)');
    expect(treeMotion).not.toContain('this.add.graphics()');
  });

  it('uses authored feathered terrain strips and image-led edge cover at every Ulleung boundary', () => {
    expect(scene).toContain('texture: ASSETS.transitions.ulleungCoastMeadow.key');
    expect(scene).toContain('texture: ASSETS.transitions.ulleungMeadowHunt.key');
    expect(scene).toContain('texture: ASSETS.transitions.ulleungHuntRidge.key');
    expect(scene).toContain('texture: ASSETS.transitions.ulleungRidgePrison.key');
    expect(scene).toContain('texture: ASSETS.transitions.ulleungPrisonGovernment.key');
    expect(scene).toContain('const blendOverlap = MAP_HEIGHT / 4');
    expect(scene).toContain('const blendHeight = ULLEUNG_PASSAGE_HEIGHT + blendOverlap * 2');
    expect(scene).toContain('transition.y - blendOverlap');
    expect(scene).toContain('.setDisplaySize(MAP_WIDTH, blendHeight)');
    expect(scene).toContain('const detailFramesByTransition = [');
    expect(scene).toContain('`ulleung-route-detail-${transitionIndex}-${side}-${cluster}`');
    expect(scene).toContain('targets: fog');
    expect(scene).not.toContain('targets: edgeMist');
  });

  it('animates Jeonju water, war banners, brazier smoke, and market awnings without changing simulation state', () => {
    expect(scene).toContain('this.createJeonjuWaterMotion(origin)');
    expect(scene).toContain('this.createJeonjuWarBanners(origin)');
    expect(scene).toContain('this.createJeonjuMarketMotion(origin)');
    expect(scene).toContain('targets: ripple');
    expect(scene).toContain('targets: banner');
    expect(scene).toContain('targets: awning');
    expect(scene).toContain('targets: smoke');
  });
});
