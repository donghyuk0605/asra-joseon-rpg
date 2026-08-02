import { ASSETS } from '../assets/manifest';
import type { AttackStyle } from '../simulation/types';

export type PlayerAttackVisual = {
  textureKey: string;
  animationKey: string;
  armorAction: AttackStyle;
};

export type PlayerMovementVisual = {
  textureKey: string;
  animationKey: string;
  idleFrame: number;
  weaponPose: 'none' | 'carry';
};

export function resolvePlayerMovementVisual(hasWeapon: boolean, row: number): PlayerMovementVisual {
  if (hasWeapon) {
    return {
      textureKey: ASSETS.playerWeaponReadyBody.key,
      animationKey: `player-walk-weapon-${row}`,
      idleFrame: row * 8,
      weaponPose: 'carry',
    };
  }
  return {
    textureKey: ASSETS.playerUnequipped.key,
    animationKey: `player-walk-unequipped-${row}`,
    idleFrame: row * 8,
    weaponPose: 'none',
  };
}

export function resolvePlayerAttackVisual(style: AttackStyle, row: number): PlayerAttackVisual {
  if (style === 'weapon') {
    return {
      textureKey: ASSETS.playerWeaponReadyBody.key,
      animationKey: `player-attack-weapon-${row}`,
      armorAction: 'weapon',
    };
  }
  return {
    textureKey: ASSETS.playerUnequipped.key,
    animationKey: `player-attack-fist-${row}`,
    armorAction: 'fist',
  };
}
