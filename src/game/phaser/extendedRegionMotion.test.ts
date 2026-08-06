import { describe, expect, it } from 'vitest';
import { EXTENDED_REGION_IDS, EXTENDED_REGION_LAYOUTS } from '../world/extendedRegions';
import { EXTENDED_REGION_AMBIENT } from '../world/extendedRegionAmbient';
import { readFileSync } from 'node:fs';

describe('extended regional object layers', () => {
  it('keeps all four authored maps backed by visible prop objects and collision metadata', () => {
    const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');
    expect(scene).toContain('createExtendedRegionMotion(this, region, origin, layout, this.mobileProfile)');
    expect(scene).toContain("setData('extendedRegionProp', prop.kind)");
    expect(scene).toContain("setData('foregroundStructure', true)");
    for (const region of EXTENDED_REGION_IDS) {
      expect(EXTENDED_REGION_LAYOUTS[region].useDynamicAmbientProps).toBe(true);
      expect(EXTENDED_REGION_LAYOUTS[region].props.length).toBeGreaterThanOrEqual(6);
      expect(EXTENDED_REGION_AMBIENT[region].reeds.length).toBeGreaterThanOrEqual(10);
      expect(EXTENDED_REGION_AMBIENT[region].lanterns.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('gives water regions shared waves, boats, flags, and repeating small lights', () => {
    const motion = readFileSync(new URL('./extendedRegionMotion.ts', import.meta.url), 'utf8');
    const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');
    expect(motion).toContain('AMBIENT_ASSETS.waterRipple');
    expect(motion).toContain('AMBIENT_ASSETS.reedCluster');
    expect(motion).toContain('AMBIENT_ASSETS.windmill');
    expect(motion).toContain('AMBIENT_ASSETS.coastalBoatHull');
    expect(motion).toContain('AMBIENT_ASSETS.flagPole');
    expect(motion).toContain('AMBIENT_ASSETS.flagCloth');
    expect(motion).toContain('AMBIENT_ASSETS.hangingLantern');
    expect(motion).toContain('animateImageSet');
    expect(motion).toContain('AmbientInteractionBus');
    expect(motion).toContain('createAmbientInteractionBus');
    expect(motion).toContain('sharedBus.gust');
    expect(motion).toContain('sharedBus.tide');
    expect(motion).toContain('wake.x = boat.x');
    expect(motion).toContain('extended-boat-flag');
    expect(motion).toContain('extended-flag-pole');
    expect(motion).toContain('cloth.setAngle');
    expect(motion).toContain('gust: { from: -0.42, to: 0.42 }');
    expect(motion).toContain('tide: { from: -0.32, to: 0.32 }');
    expect(motion).toContain('animateImageSet(scene, pole');
    expect(motion).not.toContain('windmill.setAngle');
    expect(motion).not.toContain('pole.setAngle');
    expect(motion).not.toContain('AMBIENT_ASSETS.coastalBoat,');
    expect(motion).not.toContain('AMBIENT_ASSETS.banner,');
    expect(scene).toContain('if (!layout.useDynamicAmbientProps)');
    expect(motion).not.toContain('scene.add.polygon');
    expect(motion).not.toContain('scene.add.ellipse');
    expect(motion).not.toContain('scene.add.rectangle');
    for (const region of ['gangneung', 'haeju', 'geoje'] as const) {
      expect(EXTENDED_REGION_LAYOUTS[region].waterSide).toBeDefined();
      expect(EXTENDED_REGION_AMBIENT[region].boats.length).toBeGreaterThan(0);
      expect(EXTENDED_REGION_AMBIENT[region].banners.length).toBeGreaterThan(0);
    }
  });
});
