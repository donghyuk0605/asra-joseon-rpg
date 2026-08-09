import { describe, expect, it } from 'vitest';
import {
  SIEGE_MACHINE_SITES,
  SIEGE_RUIN_SITES,
  siegeDamageStage,
  siegeMachineFrame,
  siegeRuinFrame,
} from './siegePresentation';

describe('campaign siege presentation', () => {
  it('advances architecture through cracks, fire and a final kind-specific ruin', () => {
    expect(siegeDamageStage(0, 10, false)).toBe(0);
    expect(siegeDamageStage(4, 10, false)).toBe(1);
    expect(siegeDamageStage(7, 10, false)).toBe(2);
    expect(siegeDamageStage(0, 0, true)).toBe(3);
    expect(siegeRuinFrame('wall', 2)).toBe(4);
    expect(siegeRuinFrame('barricade', 2)).toBe(6);
    expect(siegeRuinFrame('house', 1)).toBeNull();
    expect(siegeRuinFrame('wall', 3)).toBe(5);
    expect(siegeRuinFrame('barricade', 3)).toBe(6);
    expect(siegeRuinFrame('house', 3)).toBe(7);
  });

  it('uses paired authored action frames for both siege machines', () => {
    expect([siegeMachineFrame('mangonel', false), siegeMachineFrame('mangonel', true)])
      .toEqual([0, 1]);
    expect([siegeMachineFrame('ram', false), siegeMachineFrame('ram', true)])
      .toEqual([2, 3]);
  });

  it('covers every fortress campaign with stable unique set-piece identifiers', () => {
    const regions = new Set([...SIEGE_MACHINE_SITES, ...SIEGE_RUIN_SITES].map((site) => site.region));
    expect(regions).toEqual(new Set([
      'busanjin',
      'pyongyangouter', 'pyongyanggate', 'pyongyanginner',
      'gyeongbokgate', 'gyeongbokcourt', 'gyeongbokinner',
      'namhansanseong', 'ganghwado',
    ]));
    const ids = [...SIEGE_MACHINE_SITES, ...SIEGE_RUIN_SITES].map((site) => site.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
