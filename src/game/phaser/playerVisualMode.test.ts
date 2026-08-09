import { describe, expect, it } from 'vitest';
import type { EquipmentState, InventoryItem } from '../simulation/types';
import { resolvePlayerLayers, resolvePlayerVisualMovement } from './playerVisualMode';

describe('resolvePlayerLayers', () => {
  const inventory: InventoryItem[] = [
    { instanceId: 'weapon-1', itemId: 'worn-hwando' },
    { instanceId: 'armor-1', itemId: 'hunter-durumagi' },
    { instanceId: 'charm-1', itemId: 'boar-tusk-charm' },
  ];

  it.each<[EquipmentState, { armor: boolean; weapon: boolean; charm: boolean }]>([
    [{ weapon: null, armor: null, charm: null }, { armor: false, weapon: false, charm: false }],
    [{ weapon: 'weapon-1', armor: null, charm: null }, { armor: false, weapon: true, charm: false }],
    [{ weapon: null, armor: 'armor-1', charm: null }, { armor: true, weapon: false, charm: false }],
    [{ weapon: 'weapon-1', armor: 'armor-1', charm: null }, { armor: true, weapon: true, charm: false }],
    [{ weapon: null, armor: null, charm: 'charm-1' }, { armor: false, weapon: false, charm: true }],
  ])('shows only inventory-backed equipped layers for %j', (equipment, expected) => {
    expect(resolvePlayerLayers(equipment, inventory)).toEqual(expected);
  });

  it('hides stale equipment ids that are not actually in the inventory', () => {
    expect(resolvePlayerLayers({ weapon: 'missing-weapon', armor: 'missing-armor', charm: null }, inventory))
      .toEqual({ armor: false, weapon: false, charm: false });
  });

  it('hides inventory items assigned to the wrong equipment slot', () => {
    expect(resolvePlayerLayers({ weapon: 'armor-1', armor: 'weapon-1', charm: null }, inventory))
      .toEqual({ armor: false, weapon: false, charm: false });
  });
});

describe('resolvePlayerVisualMovement', () => {
  it('does not play the walk cycle from target or destination intent alone', () => {
    expect(resolvePlayerVisualMovement(0, 0, Math.PI / 3)).toEqual({
      moving: false,
      facing: Math.PI / 3,
      distance: 0,
    });
  });

  it('faces the actual collision-resolved movement vector', () => {
    const result = resolvePlayerVisualMovement(-2, 2, 0);
    expect(result.moving).toBe(true);
    expect(result.distance).toBeCloseTo(Math.sqrt(8));
    expect(result.facing).toBeCloseTo(3 * Math.PI / 4);
  });

  it('keeps authored skill travel visually active during interpolation', () => {
    expect(resolvePlayerVisualMovement(0, 0, 0, true).moving).toBe(true);
  });
});
