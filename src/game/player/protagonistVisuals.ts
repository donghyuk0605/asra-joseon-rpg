import { ASSETS } from '../assets/manifest';
import type { PlayerOrigin } from '../simulation/types';

export type ProtagonistVisualProfile = Readonly<{
  displayName: string;
  className: string;
  levelTitle: string;
  portraitPath: string;
  portraitAlt: string;
  worldTextureKeys: readonly string[];
}>;

export const PROTAGONIST_VISUALS: Readonly<Record<PlayerOrigin, ProtagonistVisualProfile>> = {
  'kim-donghyeok': {
    displayName: '김동혁',
    className: '무사',
    levelTitle: '무사',
    portraitPath: '/assets/ui/kim-donghyeok-portrait-v1.png',
    portraitAlt: '김동혁 초상',
    worldTextureKeys: [ASSETS.playerUnequipped.key, ASSETS.playerWeaponReadyBody.key],
  },
  'frontier-archer': {
    displayName: '하진',
    className: '활잡이',
    levelTitle: '북방 활잡이',
    portraitPath: '/assets/ui/harlan-portrait-v1.png',
    portraitAlt: '북방 활잡이 하진 초상',
    worldTextureKeys: [ASSETS.frontierArcher.key, ASSETS.frontierMelee.key],
  },
  'osaka-mudang': {
    displayName: '연화',
    className: '무당',
    levelTitle: '망향 무당',
    portraitPath: '/assets/ui/yeonhwa-portrait-v1.webp',
    portraitAlt: '망향 무당 연화 초상',
    worldTextureKeys: [ASSETS.osakaMudang.key],
  },
  'gwanghae-prince': {
    displayName: '왕세자 광해',
    className: '왕세자',
    levelTitle: '조선 왕세자',
    portraitPath: '/assets/ui/gwanghae-crown-prince-portrait-v1.webp',
    portraitAlt: '조선 왕세자 광해 초상',
    worldTextureKeys: [ASSETS.gwanghaePrince.key],
  },
};

export const protagonistTextureMatchesOrigin = (
  origin: PlayerOrigin,
  textureKey: string,
): boolean => PROTAGONIST_VISUALS[origin].worldTextureKeys.includes(textureKey);
