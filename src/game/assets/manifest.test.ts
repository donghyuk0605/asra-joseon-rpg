import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';
import { BOSS_CATALOG } from '../bosses/catalog';

describe('boss asset manifest', () => {
  it('ships one 40-frame atlas for every unique boss', () => {
    expect(Object.keys(ASSETS.bosses)).toHaveLength(10);
    for (const boss of Object.values(BOSS_CATALOG)) {
      expect(ASSETS.bosses[boss.id]).toEqual({
        key: boss.textureKey,
        path: `/assets/bosses/${boss.id}-actions-v1.png`,
      });
    }
  });
});

describe('player equipment layer manifest', () => {
  it('ships a visibly unequipped base body and body-locked armor overlay', () => {
    expect(ASSETS.playerUnequipped).toEqual({
      key: 'joseon-hero-base-body-v5', path: '/assets/characters/joseon-hero-base-body-v5.png',
    });
    expect(ASSETS.playerArmorLayer).toEqual({
      key: 'joseon-hero-armor-layer-v2', path: '/assets/characters/joseon-hero-armor-layer-v2.png',
    });
  });
});
