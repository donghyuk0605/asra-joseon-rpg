import Phaser from 'phaser';
import { ASSETS } from '../assets/manifest';
import type { GraphicsQuality } from '../settings/GameSettings';
import { MAP_HEIGHT, MAP_WIDTH } from '../world/layout';
import type { RegionId } from '../world/regions';
import {
  regionalWeatherParticleCount,
  regionalWeatherProfile,
  WEATHER_ATLAS_FRAMES,
  type RegionalWeatherProfile,
} from '../world/regionalWeather';

type RegionOrigin = { x: number; y: number };

const hashRegion = (region: RegionId): number => (
  [...region].reduce((value, character) => ((value * 33) ^ character.charCodeAt(0)) >>> 0, 5381)
);

const seededFraction = (seed: number): number => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const weatherDuration = (profile: RegionalWeatherProfile, index: number): number => {
  if (profile.kind === 'rain') return 760 + index * 37;
  if (profile.kind === 'snow') return 1750 + index * 91;
  if (profile.kind === 'wind') return 1350 + index * 73;
  return 6200 + index * 410;
};

export const createRegionalWeatherMotion = (
  scene: Phaser.Scene,
  region: RegionId,
  origin: RegionOrigin,
  quality: GraphicsQuality,
  mobileProfile: boolean,
  reducedMotion: boolean,
): number => {
  const profile = regionalWeatherProfile(region);
  if (!profile) return 0;
  const frames = WEATHER_ATLAS_FRAMES[profile.kind];
  const count = regionalWeatherParticleCount(profile, quality, mobileProfile, reducedMotion);
  const regionSeed = hashRegion(region);

  for (let index = 0; index < count; index += 1) {
    const xRatio = seededFraction(regionSeed + index * 17 + 3);
    const yRatio = seededFraction(regionSeed + index * 29 + 11);
    const scaleVariation = 0.86 + seededFraction(regionSeed + index * 43 + 19) * 0.28;
    const x = origin.x + 96 + xRatio * (MAP_WIDTH - 192);
    const y = origin.y + 92 + yRatio * (MAP_HEIGHT - 184);
    const sprite = scene.add.sprite(x, y, ASSETS.props.regionalWeather.key, frames[index % 2])
      .setOrigin(0.5)
      .setScale(profile.scale * scaleVariation)
      .setAlpha(profile.alpha * (0.82 + (index % 3) * 0.08))
      .setTint(profile.tint)
      .setBlendMode(profile.kind === 'wind' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.SCREEN)
      .setDepth(origin.y + MAP_HEIGHT + 32 + index)
      .setName(`regional-weather-${region}-${profile.kind}-${index}`);
    sprite
      .setData('defaultObjectComposedRegion', region)
      .setData('imageSetAsset', true)
      .setData('weatherRegion', region)
      .setData('weatherKind', profile.kind)
      .setData('weatherFrames', `${frames[0]}-${frames[1]}`);
    scene.game.canvas.dataset.weatherFrame = `${region}:${profile.kind}:${frames[index % 2]}`;

    if (reducedMotion) continue;
    const startX = sprite.x - profile.windX * 0.46;
    const startY = sprite.y - profile.windY * 0.46;
    sprite.setPosition(startX, startY);
    let pairFrame = index % 2;
    scene.tweens.add({
      targets: sprite,
      x: startX + profile.windX,
      y: startY + profile.windY,
      alpha: {
        from: profile.alpha * 0.18,
        to: profile.alpha,
      },
      duration: weatherDuration(profile, index),
      delay: index * (profile.kind === 'mist' ? 320 : 95),
      repeat: -1,
      ease: profile.kind === 'rain' ? 'Linear' : 'Sine.easeInOut',
      onRepeat: () => {
        pairFrame = pairFrame === 0 ? 1 : 0;
        sprite.setFrame(frames[pairFrame]);
        scene.game.canvas.dataset.weatherFrame = `${region}:${profile.kind}:${frames[pairFrame]}`;
      },
    });
  }
  return count;
};
