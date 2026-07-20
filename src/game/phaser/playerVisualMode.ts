import { ITEM_CATALOG } from '../items/catalog';
import type { EquipmentState, InventoryItem } from '../simulation/types';

export type PlayerVisualMode = 'unequipped' | 'weapon-only' | 'armor-only' | 'fully-equipped';

export function resolvePlayerVisualMode(equipment: EquipmentState): PlayerVisualMode {
  const hasWeapon = Boolean(equipment.weapon);
  const hasArmor = Boolean(equipment.armor);
  if (hasWeapon && hasArmor) return 'fully-equipped';
  if (hasWeapon) return 'weapon-only';
  if (hasArmor) return 'armor-only';
  return 'unequipped';
}

export function resolvePlayerLayers(
  equipment: EquipmentState,
  inventory: readonly InventoryItem[],
): { armor: boolean; weapon: boolean } {
  const hasEquippedItem = (slot: 'armor' | 'weapon') => {
    const instanceId = equipment[slot];
    if (!instanceId) return false;
    return inventory.some((item) => item.instanceId === instanceId && ITEM_CATALOG[item.itemId].slot === slot);
  };
  return { armor: hasEquippedItem('armor'), weapon: hasEquippedItem('weapon') };
}
