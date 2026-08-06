import { describe, expect, it } from 'vitest';
import { resolvePlayerAttackVisual, resolvePlayerMovementVisual } from './playerAttackVisual';

describe('resolvePlayerAttackVisual', () => {
  it('keeps fist attacks on the bare-hand body action', () => {
    expect(resolvePlayerAttackVisual('fist', 2)).toEqual({
      textureKey: 'joseon-hero-base-body-v8',
      animationKey: 'player-attack-fist-2',
      armorAction: 'fist',
    });
  });

  it('uses a distinct sword-grip body action when a weapon is equipped', () => {
    expect(resolvePlayerAttackVisual('weapon', 2)).toEqual({
      textureKey: 'joseon-hero-weapon-ready-body-v3',
      animationKey: 'player-attack-weapon-2',
      armorAction: 'weapon',
    });
  });

  it('keeps idle, walking and sword attacks on the same weapon-ready body', () => {
    expect(resolvePlayerMovementVisual(true, 3)).toEqual({
      textureKey: 'joseon-hero-weapon-ready-body-v3',
      animationKey: 'player-walk-weapon-3',
      idleFrame: 24,
      weaponPose: 'carry',
    });
    expect(resolvePlayerAttackVisual('weapon', 3).textureKey)
      .toBe(resolvePlayerMovementVisual(true, 3).textureKey);
  });

  it('leaves the unequipped movement body unchanged', () => {
    expect(resolvePlayerMovementVisual(false, 1)).toEqual({
      textureKey: 'joseon-hero-base-body-v8',
      animationKey: 'player-walk-unequipped-1',
      idleFrame: 8,
      weaponPose: 'none',
    });
  });
});
