import Phaser from 'phaser';
import { ASSETS } from '../assets/manifest';
import { MAP_HEIGHT, MAP_WIDTH } from '../world/layout';
import type { Episode2RegionId } from '../world/regions';
import type { Episode2Prop, Episode2RegionLayout } from '../world/episode2Regions';

type RegionOrigin = { x: number; y: number };
type Point = { x: number; y: number };
type MotionBus = Point & {
  phase: number;
  gust: number;
  tide: number;
  pulse: number;
  activity: number;
  enabled: boolean;
  tweens: Phaser.Tweens.Tween[];
};

const trackTween = (bus: MotionBus, tween: Phaser.Tweens.Tween): Phaser.Tweens.Tween => {
  bus.tweens.push(tween);
  if (!bus.enabled) tween.pause();
  return tween;
};

const tag = <T extends Phaser.GameObjects.GameObject>(
  object: T,
  region: Episode2RegionId,
  part: string,
): T => {
  object.setData('region', region);
  object.setData('episode2ObjectPart', part);
  object.setData('defaultObjectComposedRegion', true);
  object.setData('imageSetAsset', true);
  return object;
};

const animateImageSet = (
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  duration: number,
  bus: MotionBus,
  onFrame?: (bus: MotionBus, frame: number) => void,
  delay = 0,
): void => {
  const state = { x: sprite.x, y: sprite.y, frame: 0 };
  trackTween(bus, scene.tweens.add({
    targets: state,
    frame: { from: 0, to: 3 },
    duration,
    delay,
    repeat: -1,
    ease: 'Stepped',
    onUpdate: () => {
      const frame = Math.max(0, Math.min(3, Math.round(state.frame)));
      sprite.setFrame(frame);
      onFrame?.(bus, frame);
    },
  }));
};

const createMotionBus = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  layout: Episode2RegionLayout,
  getPlayerPosition: () => Point,
): MotionBus => {
  const initialPlayer = getPlayerPosition();
  const nearRegion = (point: Point): boolean => point.x >= origin.x - 240 && point.x <= origin.x + MAP_WIDTH + 240
    && point.y >= origin.y - 240 && point.y <= origin.y + MAP_HEIGHT + 240;
  const bus: MotionBus = {
    x: origin.x + MAP_WIDTH / 2,
    y: origin.y + MAP_HEIGHT / 2,
    phase: 0,
    gust: 0,
    tide: 0,
    pulse: 0,
    activity: 0,
    enabled: nearRegion(initialPlayer),
    tweens: [],
  };
  trackTween(bus, scene.tweens.add({ targets: bus, phase: Math.PI * 2, duration: 6200 / Math.max(0.5, layout.wind), repeat: -1, ease: 'Linear' }));
  trackTween(bus, scene.tweens.add({ targets: bus, gust: { from: -0.42, to: 0.72 }, duration: 2300 / Math.max(0.55, layout.wind), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
  trackTween(bus, scene.tweens.add({ targets: bus, tide: { from: -0.35, to: 0.5 }, duration: 4300 / Math.max(0.35, layout.tide || 0.4), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
  trackTween(bus, scene.tweens.add({ targets: bus, pulse: { from: 0, to: 1 }, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

  const update = (_time: number, delta: number): void => {
    const player = getPlayerPosition();
    const shouldRun = nearRegion(player);
    if (shouldRun !== bus.enabled) {
      bus.enabled = shouldRun;
      for (const tween of bus.tweens) {
        if (shouldRun) tween.resume();
        else tween.pause();
      }
    }
    const inside = player.x >= origin.x && player.x <= origin.x + MAP_WIDTH
      && player.y >= origin.y && player.y <= origin.y + MAP_HEIGHT;
    let target = 0;
    if (inside) {
      const localX = player.x - origin.x;
      const nearWater = layout.waterSide === 'both'
        ? localX < 260 || localX > MAP_WIDTH - 260
        : layout.waterSide === 'left' ? localX < 300
          : layout.waterSide === 'right' ? localX > MAP_WIDTH - 300 : false;
      target = nearWater ? 1 : 0.36;
    }
    const blend = 1 - Math.exp(-Math.max(0, delta) / 260);
    bus.activity = Phaser.Math.Linear(bus.activity, target, blend);
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, update));
  return bus;
};

const createGround = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  layout: Episode2RegionLayout,
  mobileProfile: boolean,
): void => {
  tag(
    scene.add.image(
      origin.x + MAP_WIDTH / 2,
      origin.y + MAP_HEIGHT / 2,
      ASSETS.episode2TerrainBases[layout.clusterId].key,
    )
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
      .setTint(0xe2d9c9)
      .setDepth(origin.y - 9200),
    region,
    `terrain-base-${layout.clusterId}`,
  );

  const waterySides = layout.waterSide === 'both'
    ? ['left', 'right'] as const
    : layout.waterSide ? [layout.waterSide] as const : [];
  for (const side of waterySides) {
    const x = side === 'left' ? origin.x + 74 : origin.x + MAP_WIDTH - 74;
    tag(
      scene.add.image(x, origin.y + MAP_HEIGHT / 2, ASSETS.episode2WaterBank.key)
        .setDisplaySize(176, MAP_HEIGHT)
        .setFlipX(side === 'right')
        .setTint(layout.waterColor)
        .setAlpha(0.94)
        .setDepth(origin.y - 9100),
      region,
      `water-${side}`,
    );
  }

  for (let index = 0; index < 3; index += 1) {
    const road = tag(
      scene.add.image(origin.x + MAP_WIDTH / 2, origin.y + 175 + index * 330, ASSETS.props.worldNaturalRoads.key, (layout.roadFrame + index) % 8)
        .setOrigin(0.5)
        .setScale(0.9, 0.88)
        .setAlpha(0.52)
        .setDepth(origin.y - 8950 + index),
      region,
      `road-segment-${index}`,
    );
    road.setTint(index % 2 === 0 ? 0xc4aa7d : 0xac936d);
  }

  const details = mobileProfile ? 6 : 11;
  for (let index = 0; index < details; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const x = origin.x + MAP_WIDTH / 2 + side * (300 + (index * 83) % 330);
    const y = origin.y + 115 + (index * 167) % 800;
    tag(
      scene.add.image(x, y, ASSETS.props.worldGroundDetails.key, (layout.groundDetailFrame + index) % 8)
        .setScale(0.38 + (index % 3) * 0.05)
        .setAlpha(0.22)
        .setTint(0xc4b58e)
        .setDepth(origin.y - 8900 + index),
      region,
      `ground-detail-${index}`,
    );
  }
};

const createProp = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  prop: Episode2Prop,
  bus: MotionBus,
): void => {
  const frame = prop.frame === 6 ? 5 : prop.frame;
  const image = tag(
    scene.add.image(origin.x + prop.x, origin.y + prop.y, ASSETS.props.episode2VillageProps.key, frame)
      .setOrigin(0.5, 0.92)
      .setScale(prop.scale)
      .setFlipX(prop.flipX)
      .setDepth(origin.y + prop.y),
    region,
    `prop-${prop.id}`,
  );
  image.setData('propFrame', prop.frame);
  image.setData('solidFootprint', prop.solid);

  if (prop.motion === 'kiln') {
    const glow = tag(
      scene.add.ellipse(origin.x + prop.x - 28 * prop.scale, origin.y + prop.y - 42 * prop.scale, 56 * prop.scale, 32 * prop.scale, 0xff7a28, 0.22)
        .setDepth(image.depth + 1),
      region,
      `kiln-glow-${prop.id}`,
    );
    trackTween(bus, scene.tweens.add({
      targets: glow,
      alpha: { from: 0.12, to: 0.36 },
      scaleX: { from: 0.88, to: 1.08 },
      scaleY: { from: 0.82, to: 1.04 },
      duration: 420 + (prop.id.length % 4) * 70,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
  }

  if (prop.motion === 'waterwheel-wheel') {
    const direction = prop.flipX ? -1 : 1;
    const wheel = tag(
      scene.add.image(
        origin.x + prop.x + direction * 72 * prop.scale,
        origin.y + prop.y - 74 * prop.scale,
        ASSETS.props.episode2WaterwheelWheel.key,
      )
        .setScale(prop.scale * 0.34)
        .setDepth(image.depth + 1),
      region,
      `waterwheel-moving-part-${prop.id}`,
    );
    trackTween(bus, scene.tweens.add({
      targets: wheel,
      angle: direction * 360,
      duration: 8800 / Math.max(0.5, Math.abs(bus.tide) + 0.72),
      repeat: -1,
      ease: 'Linear',
    }));
  }

  if (prop.motion === 'pear-tree') {
    for (let index = 0; index < 3; index += 1) {
      const leaf = tag(
        scene.add.ellipse(
          origin.x + prop.x - 32 + index * 27,
          origin.y + prop.y - 110 * prop.scale - index * 8,
          7,
          3,
          index % 2 === 0 ? 0xd5a95d : 0x82904d,
          0.62,
        ).setDepth(image.depth + 1),
        region,
        `pear-leaf-${prop.id}-${index}`,
      );
      trackTween(bus, scene.tweens.add({
        targets: leaf,
        x: leaf.x + (prop.flipX ? -1 : 1) * (28 + index * 9),
        y: leaf.y + 78 + index * 15,
        angle: 120 + index * 80,
        alpha: { from: 0.58, to: 0 },
        duration: 2600 + index * 380,
        delay: index * 720,
        repeat: -1,
        ease: 'Sine.easeIn',
      }));
    }
  }
};

const createWaterLife = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  layout: Episode2RegionLayout,
  bus: MotionBus,
  mobileProfile: boolean,
): void => {
  const sides = layout.waterSide === 'both'
    ? ['left', 'right'] as const
    : layout.waterSide ? [layout.waterSide] as const : [];
  const waveCount = mobileProfile ? 3 : 6;
  sides.forEach((side, sideIndex) => {
    for (let index = 0; index < waveCount; index += 1) {
      const x = origin.x + (side === 'left' ? 42 + (index % 2) * 58 : MAP_WIDTH - 42 - (index % 2) * 58);
      const y = origin.y + 95 + ((index * 151 + sideIndex * 83) % 820);
      const wave = tag(
        scene.add.sprite(x, y, ASSETS.props.ambient.waterRipple.key, 0)
          .setOrigin(0.5, 0.82)
          .setScale(0.24)
          .setTint(layout.waterColor)
          .setAlpha(0.22)
          .setDepth(y - 8),
        region,
        `wave-${side}-${index}`,
      );
      const baseX = wave.x;
      const baseY = wave.y;
      animateImageSet(scene, wave, 1650 + index * 130, bus, (state) => {
        const phase = state.phase + index * 0.71;
        wave.x = baseX + Math.sin(phase) * (1.8 + state.activity * 1.5);
        wave.y = baseY + state.tide * 2.2 + Math.cos(phase * 1.2) * 1.1;
        wave.setScale(0.24 * (1 + state.pulse * 0.035 + state.activity * 0.04));
        wave.setAlpha(0.16 + layout.tide * 0.08 + state.activity * 0.08);
      }, index * 90);
    }
  });

  const reedCount = mobileProfile ? Math.ceil(layout.reeds / 2) : layout.reeds;
  for (let index = 0; index < reedCount; index += 1) {
    const side = layout.waterSide === 'right' ? 'right'
      : layout.waterSide === 'both' && index % 2 === 1 ? 'right' : 'left';
    const localX = side === 'left' ? 150 + (index % 3) * 58 : MAP_WIDTH - 150 - (index % 3) * 58;
    const localY = 120 + (index * 127) % 770;
    const reed = tag(
      scene.add.sprite(origin.x + localX, origin.y + localY, ASSETS.props.ambient.reedCluster.key, 0)
        .setOrigin(0.5, 1)
        .setScale(0.42 + (index % 3) * 0.035)
        .setFlipX(index % 2 === 1)
        .setAlpha(0.78)
        .setDepth(origin.y + localY + 2),
      region,
      `reed-${index}`,
    );
    const baseScale = reed.scaleX;
    animateImageSet(scene, reed, 1380 + index * 95, bus, (state) => {
      const phase = state.phase + index * 0.57;
      reed.setAngle(Math.sin(phase) * 1.6 + state.gust * (3.4 + layout.wind * 1.4));
      reed.setScale(baseScale, baseScale * (1 - state.activity * 0.025));
    }, index * 70);
  }
};

const createFlags = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  layout: Episode2RegionLayout,
  bus: MotionBus,
  mobileProfile: boolean,
): void => {
  const count = mobileProfile ? Math.min(2, layout.flags) : layout.flags;
  for (let index = 0; index < count; index += 1) {
    const left = index % 2 === 0;
    const x = origin.x + (left ? 500 - (index % 3) * 70 : 1036 + (index % 3) * 70);
    const y = origin.y + 250 + (index * 173) % 590;
    const direction = left ? 1 : -1;
    // The pole is a fixed structural part. It never receives a sway tween.
    tag(
      scene.add.sprite(x, y, ASSETS.props.ambient.flagPole.key, 0)
        .setOrigin(0.5, 1)
        .setScale(0.42)
        .setDepth(y),
      region,
      `flag-pole-static-${index}`,
    );
    const cloth = tag(
      scene.add.sprite(x + direction * 38, y - 19, ASSETS.props.ambient.flagCloth.key, 0)
        .setOrigin(0.5)
        .setScale(0.34)
        .setFlipX(direction < 0)
        .setTint(index % 3 === 0 ? 0x9f4b3f : index % 3 === 1 ? 0xc3a45d : 0x647f84)
        .setDepth(y + 1),
      region,
      `flag-cloth-moving-${index}`,
    );
    const baseX = cloth.x;
    const baseY = cloth.y;
    animateImageSet(scene, cloth, 660 + index * 75, bus, (state) => {
      const phase = state.phase + index * 0.84;
      cloth.x = baseX + direction * (state.gust * 1.4 + Math.sin(phase) * 0.55);
      cloth.y = baseY + Math.cos(phase * 1.3) * 0.45;
      cloth.setAngle(direction * (state.gust * 1.8 + Math.sin(phase) * 0.55));
      cloth.setScale(0.34 * (1 + state.pulse * 0.012), 0.34);
    }, index * 90);
  }
};

const createBoatsAndWindmills = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  layout: Episode2RegionLayout,
  bus: MotionBus,
  mobileProfile: boolean,
): void => {
  const boatCount = mobileProfile ? Math.min(2, layout.boats) : layout.boats;
  for (let index = 0; index < boatCount; index += 1) {
    const onLeft = layout.waterSide !== 'right' && (layout.waterSide !== 'both' || index % 2 === 0);
    const x = origin.x + (onLeft ? 86 : MAP_WIDTH - 86);
    const y = origin.y + 210 + (index * 215) % 600;
    const hull = tag(
      scene.add.sprite(x, y, ASSETS.props.ambient.coastalBoatHull.key, 0)
        .setOrigin(0.5, 0.76)
        .setScale(0.31)
        .setFlipX(!onLeft)
        .setDepth(y),
      region,
      `boat-hull-${index}`,
    );
    const baseY = hull.y;
    animateImageSet(scene, hull, 1900 + index * 170, bus, (state) => {
      const phase = state.phase + index * 1.17;
      hull.y = baseY + Math.sin(phase) * (1.4 + layout.tide * 1.2) + state.tide * 1.2;
      hull.setAngle(Math.cos(phase) * 0.55 + state.gust * 0.5);
      hull.setDepth(hull.y);
    }, index * 140);
  }

  const windmillCount = mobileProfile ? Math.min(1, layout.windmills) : layout.windmills;
  for (let index = 0; index < windmillCount; index += 1) {
    const x = origin.x + (index % 2 === 0 ? 455 : 1080);
    const y = origin.y + 700 - index * 120;
    const windmill = tag(
      scene.add.sprite(x, y, ASSETS.props.ambient.windmill.key, 0)
        .setOrigin(0.5, 1)
        .setScale(0.46)
        .setDepth(y),
      region,
      `windmill-moving-blades-${index}`,
    );
    animateImageSet(scene, windmill, 1100 / Math.max(0.55, layout.wind), bus, undefined, index * 130);
  }
};

const createMist = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  layout: Episode2RegionLayout,
  bus: MotionBus,
  mobileProfile: boolean,
): void => {
  if (layout.mist < 0.26) return;
  const count = mobileProfile ? 2 : 4;
  for (let index = 0; index < count; index += 1) {
    const mist = tag(
      scene.add.ellipse(
        origin.x + 180 + (index * 373) % 1180,
        origin.y + 180 + (index * 211) % 650,
        260 + index * 45,
        54 + index * 8,
        0xc3d0c7,
        0.035 + layout.mist * 0.055,
      ).setDepth(origin.y + 100 + index),
      region,
      `mist-bank-${index}`,
    );
    const startX = mist.x;
    trackTween(bus, scene.tweens.add({
      targets: mist,
      x: startX + (index % 2 === 0 ? 130 : -115),
      alpha: { from: mist.alpha * 0.7, to: mist.alpha * 1.15 },
      duration: 7200 + index * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
  }
};

export const createEpisode2RegionWorld = (
  scene: Phaser.Scene,
  region: Episode2RegionId,
  origin: RegionOrigin,
  layout: Episode2RegionLayout,
  mobileProfile: boolean,
  getPlayerPosition: () => Point,
): void => {
  createGround(scene, region, origin, layout, mobileProfile);
  const bus = createMotionBus(scene, region, origin, layout, getPlayerPosition);
  layout.props.forEach((prop) => createProp(scene, region, origin, prop, bus));
  createWaterLife(scene, region, origin, layout, bus, mobileProfile);
  createFlags(scene, region, origin, layout, bus, mobileProfile);
  createBoatsAndWindmills(scene, region, origin, layout, bus, mobileProfile);
  createMist(scene, region, origin, layout, bus, mobileProfile);
};
