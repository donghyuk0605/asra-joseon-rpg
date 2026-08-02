import { ITEM_CATALOG } from '../items/catalog';
import type { EquipmentState, InventoryItem } from '../simulation/types';

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

export function resolvePlayerVisualMovement(
  movementX: number,
  movementY: number,
  fallbackFacing: number,
  skillMotionActive = false,
): { moving: boolean; facing: number; distance: number } {
  const distance = Math.hypot(movementX, movementY);
  return {
    moving: distance > 0.03 || skillMotionActive,
    facing: distance > 0.03 ? Math.atan2(movementY, movementX) : fallbackFacing,
    distance,
  };
}
