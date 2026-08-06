import Phaser from 'phaser';
import { ASSETS } from '../assets/manifest';
import { MAP_HEIGHT, MAP_WIDTH } from '../world/layout';
import type { ExtendedRegionId } from '../world/regions';
import type { ExtendedRegionLayout } from '../world/extendedRegions';
import { EXTENDED_REGION_AMBIENT } from '../world/extendedRegionAmbient';
import type {
  BannerConfig,
  BoatConfig,
  LanternConfig,
  ReedConfig,
  WindmillConfig,
} from '../world/extendedRegionAmbient';

type RegionOrigin = { x: number; y: number };
type AmbientFrameState = { x: number; y: number; frame: number };

/**
 * One regional motion bus drives every authored image-set prop together.
 * Keeping x/y on the bus lets HuntingScene pause/resume it with the same
 * region-aware visibility system used by the sprites.
 */
type AmbientInteractionBus = {
  x: number;
  y: number;
  gust: number;
  tide: number;
  phase: number;
  pulse: number;
};

type AmbientMotionResponse = (bus: AmbientInteractionBus, frame: number) => void;

const AMBIENT_FRAME_COUNT = 4;
const AMBIENT_FRAME_SIZE = 256;
const AMBIENT_ASSETS = ASSETS.props.ambient;

const regionObject = <T extends Phaser.GameObjects.GameObject>(object: T, region: ExtendedRegionId): T => {
  object.setData('defaultObjectComposedRegion', region);
  object.setData('extendedRegionAmbient', true);
  object.setData('imageSetAsset', true);
  return object;
};

const createAmbientInteractionBus = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
): AmbientInteractionBus => {
  const phaseOffset = {
    wonju: 0,
    gangneung: 1,
    haeju: 2,
    geoje: 3,
  }[region];
  const bus: AmbientInteractionBus = {
    x: origin.x + MAP_WIDTH / 2,
    y: origin.y + MAP_HEIGHT / 2,
    gust: 0,
    tide: 0,
    phase: phaseOffset * 0.8,
    pulse: 0,
  };

  scene.tweens.add({
    targets: bus,
    gust: { from: -0.42, to: 0.42 },
    duration: 1500 + phaseOffset * 150,
    delay: 120 + phaseOffset * 160,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: bus,
    tide: { from: -0.32, to: 0.32 },
    duration: 2800 + phaseOffset * 220,
    delay: 260 + phaseOffset * 120,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: bus,
    phase: { from: phaseOffset * 0.8, to: Math.PI * 2 + phaseOffset * 0.8 },
    duration: 4400 + phaseOffset * 260,
    repeat: -1,
    ease: 'Linear',
  });
  scene.tweens.add({
    targets: bus,
    pulse: { from: 0, to: 1 },
    duration: 720 + phaseOffset * 80,
    delay: phaseOffset * 140,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return bus;
};

const animateImageSet = (
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  duration: number,
  bus: AmbientInteractionBus,
  response?: AmbientMotionResponse,
  delay = 0,
): void => {
  const frameState: AmbientFrameState = { x: sprite.x, y: sprite.y, frame: 0 };
  scene.tweens.add({
    targets: frameState,
    frame: { from: 0, to: AMBIENT_FRAME_COUNT - 1 },
    duration,
    delay,
    repeat: -1,
    ease: 'Stepped',
    onUpdate: () => {
      const frame = Math.round(frameState.frame);
      sprite.setFrame(frame);
      response?.(bus, frame);
    },
  });
  response?.(bus, 0);
};

const createImageSetSprite = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  asset: { key: string; path: string },
  x: number,
  y: number,
  scale: number,
  name: string,
  depth: number,
  options: {
    alpha?: number;
    flipX?: boolean;
    originX?: number;
    originY?: number;
    tint?: number;
  } = {},
): Phaser.GameObjects.Sprite => {
  const sprite = regionObject(
    scene.add.sprite(origin.x + x, origin.y + y, asset.key, 0)
      .setOrigin(options.originX ?? 0.5, options.originY ?? 1)
      .setScale(scale)
      .setAlpha(options.alpha ?? 1)
      .setFlipX(options.flipX ?? false)
      .setDepth(depth)
      .setName(name),
    region,
  );
  if (options.tint !== undefined) sprite.setTint(options.tint);
  return sprite;
};

const waterTintFor = (region: ExtendedRegionId): number | undefined => {
  if (region === 'haeju') return 0xc8ae76;
  if (region === 'geoje') return 0xa1c5c9;
  return undefined;
};

const createWaterMotion = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  layout: ExtendedRegionLayout,
  mobileProfile: boolean,
  bus: AmbientInteractionBus,
): void => {
  const sides = layout.waterSide === 'both'
    ? ['left', 'right'] as const
    : layout.waterSide
      ? [layout.waterSide] as const
      : [];
  if (sides.length === 0) return;

  const waveCount = mobileProfile ? 3 : 5;
  sides.forEach((side, sideIndex) => {
    for (let index = 0; index < waveCount; index += 1) {
      const localX = side === 'left'
        ? 42 + (index % 4) * 68 + sideIndex * 8
        : MAP_WIDTH - 42 - (index % 4) * 68 - sideIndex * 8;
      const localY = 128 + ((index * 173 + sideIndex * 83) % (MAP_HEIGHT - 220));
      const baseScale = mobileProfile ? 0.24 : 0.3;
      const wave = createImageSetSprite(
        scene,
        region,
        origin,
        AMBIENT_ASSETS.waterRipple,
        localX,
        localY,
        baseScale,
        `extended-water-ripple-${region}-${side}-${index}`,
        origin.y + localY - 8,
        { alpha: 0.28, tint: waterTintFor(region), originY: 0.82 },
      );
      const baseX = wave.x;
      const baseY = wave.y;
      const baseAngle = side === 'left' ? -3 : 3;
      const sideDirection = side === 'left' ? 1 : -1;
      animateImageSet(
        scene,
        wave,
        1850 + index * 160 + sideIndex * 220,
        bus,
        (sharedBus) => {
          const localPhase = sharedBus.phase + index * 0.72 + sideIndex * 0.9;
          wave.x = baseX
            + Math.sin(localPhase) * 2.5
            + sharedBus.tide * 4 * sideDirection
            + sharedBus.gust * 1.5 * sideDirection;
          wave.y = baseY + Math.cos(localPhase * 1.35) * 1.5 + sharedBus.tide * 1.5;
          wave.setAngle(baseAngle + sharedBus.gust * 3 + Math.sin(localPhase) * 0.7);
          wave.setScale(
            baseScale * (1 + sharedBus.pulse * 0.03),
            baseScale * (0.97 + sharedBus.pulse * 0.04),
          );
          wave.setAlpha(0.18 + (sharedBus.tide + 0.32) * 0.12 + sharedBus.pulse * 0.03);
          wave.setDepth(wave.y - 8);
        },
        index * 95 + sideIndex * 120,
      );
    }
  });
};

const createReedCluster = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  config: ReedConfig,
  index: number,
  bus: AmbientInteractionBus,
): void => {
  const direction = config.direction ?? 1;
  const baseScale = (config.scale ?? 1) * 0.58;
  const reed = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.reedCluster,
    config.x,
    config.y,
    baseScale,
    `extended-reeds-${region}-${index}`,
    origin.y + config.y + 4,
    { alpha: 0.76, flipX: direction < 0 },
  );
  const baseX = reed.x;
  const baseY = reed.y;
  animateImageSet(
    scene,
    reed,
    1550 + index * 125,
    bus,
    (sharedBus) => {
      const localPhase = sharedBus.phase + index * 0.58;
      reed.x = baseX + Math.sin(localPhase) * 1.5 + sharedBus.gust * 3 * direction;
      reed.y = baseY + Math.cos(localPhase * 1.2) * 1 + sharedBus.tide * 0.6;
      reed.setAngle(direction * (Math.sin(localPhase) * 2 + sharedBus.gust * 7));
      reed.setScale(baseScale * (1 + sharedBus.pulse * 0.01));
      reed.setDepth(reed.y + 4);
    },
    index * 80,
  );
};

const createWindmill = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  config: WindmillConfig,
  index: number,
  bus: AmbientInteractionBus,
): void => {
  const baseScale = (config.scale ?? 1) * 0.54;
  const windmill = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.windmill,
    config.x,
    config.y,
    baseScale,
    `extended-windmill-${region}-${index}`,
    origin.y + config.y + 5,
    { alpha: 0.9 },
  );
  animateImageSet(
    scene,
    windmill,
    1050 + index * 140,
    bus,
    undefined,
    index * 130,
  );
};

const createBoat = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  config: BoatConfig,
  index: number,
  bus: AmbientInteractionBus,
): void => {
  const boatScale = (config.scale ?? 1) * 0.45;
  const boat = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.coastalBoatHull,
    config.x,
    config.y,
    boatScale,
    `extended-boat-${region}-${index}`,
    origin.y + config.y + 4,
    { alpha: 0.94, flipX: config.flipX },
  );
  const baseBoatX = boat.x;
  const baseBoatY = boat.y;
  animateImageSet(
    scene,
    boat,
    1650 + index * 150,
    bus,
    (sharedBus) => {
      const localPhase = sharedBus.phase + index * 0.82;
      const travelDirection = config.flipX ? -1 : 1;
      boat.x = baseBoatX + Math.sin(localPhase) * 1.6 + sharedBus.tide * 4 * travelDirection;
      boat.y = baseBoatY + Math.cos(localPhase * 1.25) * 1.8 + sharedBus.tide * 2.2;
      boat.setAngle(sharedBus.tide * 1.6 + Math.sin(localPhase) * 0.6);
      boat.setScale(boatScale * (1 + sharedBus.pulse * 0.01));
      boat.setDepth(boat.y + 4);
    },
    index * 110,
  );

  const boatFlagScale = boatScale * 0.34;
  const boatFlag = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.flagCloth,
    config.x + (config.flipX ? -10 : 10),
    config.y - 70,
    boatFlagScale,
    `extended-boat-flag-${region}-${index}`,
    origin.y + config.y - 74,
    { alpha: 0.88, flipX: config.flipX },
  );
  const boatFlagBaseX = boatFlag.x;
  const boatFlagBaseY = boatFlag.y;
  animateImageSet(
    scene,
    boatFlag,
    760 + index * 90,
    bus,
    (sharedBus) => {
      const localPhase = sharedBus.phase + index * 0.82 + 0.3;
      const flagDirection = config.flipX ? -1 : 1;
      boatFlag.x = boat.x + (boatFlagBaseX - baseBoatX) + sharedBus.gust * 1.2 * flagDirection;
      boatFlag.y = boat.y + (boatFlagBaseY - baseBoatY) + Math.cos(localPhase) * 0.5;
      boatFlag.setAngle(flagDirection * (sharedBus.gust * 2.4 + Math.sin(localPhase) * 0.8));
      boatFlag.setScale(boatFlagScale * (1 + sharedBus.pulse * 0.015));
      boatFlag.setDepth(boatFlag.y + 2);
    },
    160 + index * 90,
  );

  const wakeScale = boatScale * 0.42;
  const wake = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.waterRipple,
    config.x,
    config.y + 13,
    wakeScale,
    `extended-boat-wake-${region}-${index}`,
    origin.y + config.y - 2,
    { alpha: 0.16, flipX: config.flipX, originY: 0.72 },
  );
  animateImageSet(
    scene,
    wake,
    1650 + index * 160,
    bus,
    (sharedBus) => {
      const localPhase = sharedBus.phase + index * 0.82 + 0.7;
      const wakeDirection = config.flipX ? 1 : -1;
      wake.x = boat.x + wakeDirection * (12 + sharedBus.pulse * 2) + Math.sin(localPhase) * 1.2;
      wake.y = boat.y + 8 + Math.cos(localPhase) * 0.9;
      wake.setAngle(sharedBus.tide * 1.2 + sharedBus.gust * 1.5);
      wake.setScale(
        wakeScale * (0.94 + sharedBus.pulse * 0.12),
        wakeScale * (0.94 + sharedBus.pulse * 0.06),
      );
      wake.setAlpha(0.1 + sharedBus.pulse * 0.1 + (sharedBus.tide + 0.32) * 0.04);
      wake.setDepth(wake.y - 2);
    },
    180 + index * 120,
  );
};

const createBanner = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  config: BannerConfig,
  index: number,
  bus: AmbientInteractionBus,
): void => {
  const poleScale = 0.48;
  const clothScale = 0.38;
  const pole = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.flagPole,
    config.x,
    config.y,
    poleScale,
    `extended-flag-pole-${region}-${index}`,
    origin.y + config.y,
    { alpha: 0.94 },
  );
  animateImageSet(scene, pole, 1750 + index * 140, bus, undefined, index * 110);

  const flagDirection = config.flipX ? -1 : 1;
  const cloth = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.flagCloth,
    config.x + flagDirection * 42,
    config.y - 20,
    clothScale,
    `extended-flag-cloth-${region}-${index}`,
    origin.y + config.y - 18,
    { alpha: 0.92, flipX: config.flipX },
  );
  if (config.color !== undefined) cloth.setTint(config.color);
  const baseX = cloth.x;
  const baseY = cloth.y;
  animateImageSet(
    scene,
    cloth,
    720 + index * 90,
    bus,
    (sharedBus) => {
      const localPhase = sharedBus.phase + index * 0.9;
      cloth.x = baseX + Math.sin(localPhase) * 1.4 + sharedBus.gust * 2.2 * flagDirection;
      cloth.y = baseY + Math.cos(localPhase * 1.4) * 0.8;
      cloth.setAngle(flagDirection * (sharedBus.gust * 2.6 + Math.sin(localPhase) * 0.8));
      cloth.setScale(clothScale * (1 + sharedBus.pulse * 0.015));
      cloth.setDepth(cloth.y + 1);
    },
    index * 100,
  );
};

const createLantern = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  config: LanternConfig,
  index: number,
  bus: AmbientInteractionBus,
): void => {
  const lantern = createImageSetSprite(
    scene,
    region,
    origin,
    AMBIENT_ASSETS.hangingLantern,
    config.x,
    config.y,
    0.42,
    `extended-lantern-${region}-${index}`,
    origin.y + config.y + 2,
    { alpha: 0.92, tint: config.color },
  );
  // The post is a fixed anchor. Its image-set frame may change subtly, but
  // the whole pole must never swing with the regional gust.
  animateImageSet(scene, lantern, 1450 + index * 120, bus, undefined, index * 75);
};

export const createExtendedRegionMotion = (
  scene: Phaser.Scene,
  region: ExtendedRegionId,
  origin: RegionOrigin,
  layout: ExtendedRegionLayout,
  mobileProfile: boolean,
): void => {
  const config = EXTENDED_REGION_AMBIENT[region];
  const bus = createAmbientInteractionBus(scene, region, origin);
  createWaterMotion(scene, region, origin, layout, mobileProfile, bus);
  const reedConfigs = mobileProfile ? config.reeds.filter((_reed, index) => index % 2 === 0) : config.reeds;
  reedConfigs.forEach((reed, index) => createReedCluster(scene, region, origin, reed, index, bus));
  config.windmills.forEach((windmill, index) => createWindmill(scene, region, origin, windmill, index, bus));
  config.boats.forEach((boat, index) => createBoat(scene, region, origin, boat, index, bus));
  config.banners.forEach((banner, index) => createBanner(scene, region, origin, banner, index, bus));
  const lanternConfigs = mobileProfile ? config.lanterns.filter((_lantern, index) => index % 2 === 0) : config.lanterns;
  lanternConfigs.forEach((lantern, index) => createLantern(scene, region, origin, lantern, index, bus));
};

export const EXTENDED_REGION_MOTION_REGIONS = Object.freeze([
  'wonju',
  'gangneung',
  'haeju',
  'geoje',
] as const);

export const EXTENDED_AMBIENT_FRAME_SIZE = AMBIENT_FRAME_SIZE;
