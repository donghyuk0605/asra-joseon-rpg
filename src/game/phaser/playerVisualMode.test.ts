import { describe, expect, it } from 'vitest';
import type { EquipmentState, InventoryItem } from '../simulation/types';
import { resolvePlayerLayers, resolvePlayerVisualMode } from './playerVisualMode';

describe('resolvePlayerVisualMode', () => {
  it.each<[EquipmentState, string]>([
    [{ weapon: null, armor: null, charm: null }, 'unequipped'],
    [{ weapon: 'weapon-1', armor: null, charm: null }, 'weapon-only'],
    [{ weapon: null, armor: 'armor-1', charm: null }, 'armor-only'],
    [{ weapon: 'weapon-1', armor: 'armor-1', charm: null }, 'fully-equipped'],
  ])('maps equipment %j to %s', (equipment, mode) => {
    expect(resolvePlayerVisualMode(equipment)).toBe(mode);
  });
});

describe('resolvePlayerLayers', () => {
  const inventory: InventoryItem[] = [
    { instanceId: 'weapon-1', itemId: 'worn-hwando' },
    { instanceId: 'armor-1', itemId: 'hunter-durumagi' },
  ];

  it.each<[EquipmentState, { armor: boolean; weapon: boolean }]>([
    [{ weapon: null, armor: null, charm: null }, { armor: false, weapon: false }],
    [{ weapon: 'weapon-1', armor: null, charm: null }, { armor: false, weapon: true }],
    [{ weapon: null, armor: 'armor-1', charm: null }, { armor: true, weapon: false }],
    [{ weapon: 'weapon-1', armor: 'armor-1', charm: null }, { armor: true, weapon: true }],
  ])('shows only inventory-backed equipped layers for %j', (equipment, expected) => {
    expect(resolvePlayerLayers(equipment, inventory)).toEqual(expected);
  });

  it('hides stale equipment ids that are not actually in the inventory', () => {
    expect(resolvePlayerLayers({ weapon: 'missing-weapon', armor: 'missing-armor', charm: null }, inventory))
      .toEqual({ armor: false, weapon: false });
  });
});
