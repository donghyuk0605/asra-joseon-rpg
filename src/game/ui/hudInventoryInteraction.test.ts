import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('RPG inventory interaction and raster UI', () => {
  const hudSource = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
  const protagonistVisuals = readFileSync(new URL('../player/protagonistVisuals.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

  it('uses a stable rapid-tap detector so rerendered item buttons still equip', () => {
    expect(hudSource).toContain('lastItemTap');
    expect(hudSource).toContain('now - this.lastItemTap.at <= 380');
    expect(hudSource).toContain('this.activateInventoryItem(instanceId)');
    expect(hudSource).not.toContain("addEventListener('dblclick'");
  });

  it('opens the bag on the equipped item until the player chooses another item', () => {
    expect(hudSource).toContain('private inventorySelectionTouched = false');
    expect(hudSource).toContain('this.selectedItemId = this.preferredEquippedItemId(this.snapshot)');
    expect(hudSource).toContain("(['weapon', 'armor', 'charm'] as const)");
    expect(hudSource).toContain('this.inventorySelectionTouched = true');
  });

  it('ships the generated raster window and mobile touch layout', () => {
    const asset = new URL('../../../public/assets/ui/joseon-rpg-window-v3.png', import.meta.url);
    expect(existsSync(asset)).toBe(true);
    expect(styles).toContain("--ui-rpg-window-v3: url('/assets/ui/joseon-rpg-window-v3.png')");
    expect(styles).toContain('@media (pointer: coarse)');
    expect(styles).toContain('height: 100dvh');
    expect(styles).toContain('touch-action: manipulation');
    expect(styles).toContain('.bag-filters { flex: 1 1 auto; overflow: hidden; }');
    expect(styles).toContain('.inventory-sort { flex: 0 0 60px;');
  });

  it('uses dedicated raster art for the player portrait and quest order', () => {
    expect(existsSync(new URL('../../../public/assets/ui/kim-donghyeok-portrait-v1.png', import.meta.url))).toBe(true);
    expect(existsSync(new URL('../../../public/assets/ui/joseon-quest-order-v1.png', import.meta.url))).toBe(true);
    expect(hudSource).toContain('PROTAGONIST_VISUALS[snapshot.playerOrigin]');
    expect(protagonistVisuals).toContain('/assets/ui/kim-donghyeok-portrait-v1.png');
    expect(hudSource).toContain('/assets/ui/joseon-quest-order-v1.png');
    expect(hudSource).toContain('bar-stat-label">HP');
    expect(hudSource).toContain('bar-stat-label">EXP');
  });

  it('renders the real pouch tile inside the inventory menu seal', () => {
    expect(hudSource).toContain('menu-seal inventory-seal');
    expect(styles).toContain('.menu-seal.inventory-seal .ui-icon-bag');
    expect(styles).toContain('--ui-icon-x: 3');
    expect(styles).toContain('background-size: 500% 400%');
    expect(styles).not.toContain('.menu-seal .ui-icon-bag { --ui-icon-size: 35px; --ui-icon-x: 7;');
  });

  it('shows an honest empty-bag onboarding state before the first item drops', () => {
    expect(hudSource).toContain('빈 행낭 · 현재 빈손');
    expect(hudSource).toContain('감옥의 첫 포졸을 쓰러뜨리면 압수품인 이 빠진 환도');
    expect(hudSource).toContain('행낭에서 ‘이 빠진 환도’를 더블클릭·더블탭해 장착');
    expect(hudSource).toContain('장비를 더블탭해 즉시 착용');
  });

  it('shows item abilities inside every occupied bag slot and applies enhancement values', () => {
    expect(hudSource).toContain('class="item-stat-line"');
    expect(hudSource).toContain('this.itemStatBadge(definition, item.enhancement ?? 0)');
    expect(hudSource).toContain('private effectiveItemStats(definition: ItemDefinition, enhancement = 0)');
    expect(hudSource).toContain('definition.attackBonus + (definition.slot === \'weapon\' ? enhancement * 2 : 0)');
    expect(hudSource).toContain('definition.defenseBonus + (definition.slot === \'armor\' ? enhancement * 2 : 0)');
    expect(styles).toContain('.item-stat-line');
  });

  it('uses a 5 by 4 bag and exposes immediate equipment decisions', () => {
    expect(hudSource).toContain("type InventoryFilter = 'all' | ItemSlot | 'equippable' | 'upgrade'");
    expect(hudSource).toContain('data-filter="equippable"');
    expect(hudSource).toContain('data-filter="upgrade"');
    expect(hudSource).toContain('private isItemUpgrade(item: InventoryItem, snapshot: Snapshot)');
    expect(hudSource).toContain('data-item-state="${state}"');
    expect(hudSource).toContain('현재 장비보다 능력치 상승');
    expect(hudSource).toContain('품부터 장착 가능');
    expect(styles).toContain('.inventory-grid { grid-template-columns: repeat(5, minmax(0, 1fr));');
    expect(styles).toContain('.inventory-item.is-upgrade:not(.is-equipped)');
    expect(styles).toContain('.inventory-filter-state[hidden] { display: none; }');
  });

  it('moves hunting progress out of the bag and into the story journal', () => {
    expect(hudSource).toContain('class="story-hunt-log"');
    expect(hudSource).not.toContain('class="bag-hunt-summary"');
    expect(styles).toContain('.story-hunt-log');
    expect(styles).not.toContain('.bag-hunt-summary');
  });
});
