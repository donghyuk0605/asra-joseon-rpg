import Phaser from 'phaser';
import { ASSETS } from '../assets/manifest';
import type { RegionId } from '../world/regions';

export type WarBannerConfig = {
  region: RegionId;
  x: number;
  y: number;
  direction?: -1 | 1;
  tint?: number;
  scale?: number;
  name: string;
  reducedMotion?: boolean;
  duration?: number;
};

export type WarBannerView = {
  pole: Phaser.GameObjects.Sprite;
  cloth: Phaser.GameObjects.Sprite;
};

const WAR_BANNER_ANIMATION_KEY = 'war-banner-cloth-wave-v1';

const tagPart = <T extends Phaser.GameObjects.Sprite>(
  sprite: T,
  config: WarBannerConfig,
  part: 'pole-static' | 'cloth-moving',
): T => {
  sprite
    .setData('defaultObjectComposedRegion', config.region)
    .setData('imageSetAsset', true)
    .setData('warBanner', config.name)
    .setData('warBannerPart', part);
  return sprite;
};

export const createWarBanner = (
  scene: Phaser.Scene,
  config: WarBannerConfig,
): WarBannerView => {
  const bannerCount = Number(scene.game.canvas.dataset.warBannerCount ?? '0') + 1;
  scene.game.canvas.dataset.warBannerCount = `${bannerCount}`;
  scene.game.canvas.dataset.warBannerVisual = `${bannerCount}:fixed-pole:cloth-4f`;
  const direction = config.direction ?? 1;
  const scale = config.scale ?? 0.4;
  const pole = tagPart(
    scene.add.sprite(config.x, config.y, ASSETS.props.ambient.flagPole.key, 0)
      .setOrigin(0.5, 1)
      .setScale(scale * 1.16)
      .setDepth(config.y)
      .setName(`${config.name}-pole-static`),
    config,
    'pole-static',
  );
  const cloth = tagPart(
    scene.add.sprite(
      config.x + direction * scale * 102,
      config.y - scale * 49,
      ASSETS.props.ambient.flagCloth.key,
      0,
    )
      .setOrigin(0.5)
      .setScale(scale)
      .setFlipX(direction < 0)
      .setTint(config.tint ?? 0xa64d42)
      .setDepth(config.y + 1)
      .setName(`${config.name}-cloth-moving`),
    config,
    'cloth-moving',
  );
  if (!scene.anims.exists(WAR_BANNER_ANIMATION_KEY)) {
    scene.anims.create({
      key: WAR_BANNER_ANIMATION_KEY,
      frames: scene.anims.generateFrameNumbers(ASSETS.props.ambient.flagCloth.key, { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
  }
  cloth.play(WAR_BANNER_ANIMATION_KEY);
  cloth.on(Phaser.Animations.Events.ANIMATION_UPDATE, (
    _animation: Phaser.Animations.Animation,
    frame: Phaser.Animations.AnimationFrame,
  ) => {
    scene.game.canvas.dataset.warBannerFrame = `${config.name}:${frame.textureFrame}`;
  });
  if (config.reducedMotion) cloth.anims.pause();

  const baseX = cloth.x;
  const baseY = cloth.y;
  scene.tweens.add({
    targets: cloth,
    x: { from: baseX - direction * 1.4, to: baseX + direction * 2.2 },
    y: { from: baseY - 0.6, to: baseY + 0.7 },
    angle: { from: -direction * 1.4, to: direction * 2.1 },
    duration: (config.duration ?? 820) * 1.4,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return { pole, cloth };
};
