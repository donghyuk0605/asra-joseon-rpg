import { ITEM_CATALOG, ITEM_SET, SLOT_LABEL } from '../items/catalog';
import type { ItemDefinition } from '../items/catalog';
import type { EquipmentSlot, EquipmentState, GameEvent, InventoryItem, MonsterState, PlayerState } from '../simulation/types';
import { ASSETS } from '../assets/manifest';
import { resolvePlayerLayers } from '../phaser/playerVisualMode';
import { REGIONS, type RegionId } from '../world/regions';
import type { BossState } from '../bosses/types';

type InventoryFilter = 'all' | EquipmentSlot;
type InventorySort = 'recent' | 'type';

const INVENTORY_FILTERS: Array<{ id: InventoryFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'weapon', label: '무기' },
  { id: 'armor', label: '복장' },
  { id: 'charm', label: '부적' },
];

const SLOT_ORDER: Record<EquipmentSlot, number> = { weapon: 0, armor: 1, charm: 2 };

type Snapshot = {
  region: RegionId;
  dungeonFloor: number;
  player: PlayerState;
  target: MonsterState | BossState | null;
  inventory: InventoryItem[];
  equipment: EquipmentState;
  inventoryCapacity: number;
  attackPower: number;
  defense: number;
  accuracy: number;
  evasion: number;
};

type HudActions = {
  onPotion: () => void;
  onEquip: (instanceId: string) => void;
  onQuickStep: () => void;
  onInventoryToggle: (open: boolean) => void;
};

export class Hud {
  private readonly root: HTMLElement;
  private readonly feed: string[] = ['[경계병] 솔고개에 요사한 기운이 짙어졌소.'];
  private snapshot: Snapshot | null = null;
  private inventorySignature = '';
  private inventoryOpen = false;
  private inventoryReturnFocus: HTMLElement | null = null;
  private selectedItemId: string | null = null;
  private inventoryFilter: InventoryFilter = 'all';
  private inventorySort: InventorySort = 'recent';
  private readonly abortController = new AbortController();

  constructor(root: HTMLElement, private readonly actions: HudActions) {
    this.root = root;
    this.root.innerHTML = this.template();
    const signal = this.abortController.signal;
    this.root.querySelector<HTMLButtonElement>('[data-action="potion"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.actions.onPotion();
    }, { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="quick-step"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.actions.onQuickStep();
    }, { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="inventory"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleInventory();
    }, { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="inventory-close"]')?.addEventListener('click', () => this.toggleInventory(false), { signal });
    this.root.querySelector<HTMLButtonElement>('[data-action="inventory-backdrop"]')?.addEventListener('click', () => this.toggleInventory(false), { signal });
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const selectButton = target.closest<HTMLButtonElement>('[data-select-item]');
      if (selectButton?.dataset.selectItem) {
        this.selectItem(selectButton.dataset.selectItem, selectButton);
        return;
      }
      const filterButton = target.closest<HTMLButtonElement>('[data-filter]');
      if (filterButton?.dataset.filter) {
        this.setFilter(filterButton.dataset.filter as InventoryFilter);
        return;
      }
      if (target.closest('[data-action="inventory-sort"]')) {
        this.inventorySort = this.inventorySort === 'recent' ? 'type' : 'recent';
        this.inventorySignature = '';
        if (this.snapshot) this.renderInventory(this.snapshot);
        return;
      }
      const equipButton = target.closest<HTMLButtonElement>('[data-equip-item]');
      if (equipButton?.dataset.equipItem) this.actions.onEquip(equipButton.dataset.equipItem);
    }, { signal });
    this.root.addEventListener('dblclick', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-select-item]');
      if (button?.dataset.selectItem) this.actions.onEquip(button.dataset.selectItem);
    }, { signal });
    window.addEventListener('keydown', (event) => {
      if (!this.inventoryOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.toggleInventory(false);
        return;
      }
      if (event.key === 'Tab') this.trapInventoryFocus(event);
    }, { signal });
    window.setTimeout(() => this.root.querySelector('.field-guide')?.classList.add('is-hidden'), 6500);
  }

  destroy(): void {
    this.abortController.abort();
    document.body.classList.remove('inventory-open');
  }

  toggleInventory(force?: boolean): void {
    const panel = this.root.querySelector<HTMLElement>('.inventory-panel');
    const shouldOpen = force ?? !this.inventoryOpen;
    if (shouldOpen === this.inventoryOpen) return;
    this.inventoryOpen = shouldOpen;
    if (shouldOpen) {
      this.inventoryReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : this.root.querySelector<HTMLButtonElement>('[data-action="inventory"]');
      if (!this.selectedItemId && this.snapshot?.inventory[0]) this.selectedItemId = this.snapshot.inventory[0].instanceId;
      if (this.snapshot) {
        this.inventorySignature = '';
        this.renderInventory(this.snapshot);
      }
    }
    panel?.classList.toggle('is-open', shouldOpen);
    panel?.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) panel?.removeAttribute('inert');
    else panel?.setAttribute('inert', '');
    this.root.classList.toggle('is-inventory-open', shouldOpen);
    this.root.dataset.inventoryOpen = String(shouldOpen);
    document.body.classList.toggle('inventory-open', shouldOpen);
    const inventoryButton = this.root.querySelector<HTMLButtonElement>('[data-action="inventory"]');
    inventoryButton?.setAttribute('aria-expanded', String(shouldOpen));
    this.root.querySelector<HTMLElement>('.inventory-backdrop')?.setAttribute('aria-hidden', String(!shouldOpen));
    this.actions.onInventoryToggle(shouldOpen);
    if (shouldOpen) {
      window.requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>('[data-action="inventory-close"]')?.focus());
    } else {
      this.inventoryReturnFocus?.focus();
      this.inventoryReturnFocus = null;
    }
  }

  private selectItem(instanceId: string, source?: HTMLElement): void {
    if (!this.snapshot?.inventory.some((item) => item.instanceId === instanceId)) return;
    this.selectedItemId = instanceId;
    this.inventorySignature = '';
    this.renderInventory(this.snapshot);
    window.requestAnimationFrame(() => {
      this.root.querySelector<HTMLButtonElement>(`[data-select-item="${instanceId}"]`)?.focus();
    });
    source?.setAttribute('aria-pressed', 'true');
  }

  private setFilter(filter: InventoryFilter): void {
    if (!INVENTORY_FILTERS.some((entry) => entry.id === filter)) return;
    this.inventoryFilter = filter;
    const visible = this.filteredInventory(this.snapshot?.inventory ?? []);
    if (!visible.some((item) => item.instanceId === this.selectedItemId)) this.selectedItemId = visible[0]?.instanceId ?? null;
    this.inventorySignature = '';
    if (this.snapshot) this.renderInventory(this.snapshot);
  }

  private trapInventoryFocus(event: KeyboardEvent): void {
    const panel = this.root.querySelector<HTMLElement>('.inventory-panel');
    const focusable = Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? [])
      .filter((element) => !element.hasAttribute('inert'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  update(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    const { player, target } = snapshot;
    const playerHpRatio = player.hp / player.maxHp;
    const playerPanel = this.root.querySelector<HTMLElement>('.player-panel');
    const playerLowHp = playerHpRatio <= 0.3;
    const region = REGIONS[snapshot.region];
    this.text('location-province', region.province);
    this.text('location-name', snapshot.region === 'dungeon' ? `${region.name} ${snapshot.dungeonFloor}층` : region.name);
    this.text('location-status', region.status);
    this.root.querySelector('.location-plaque')?.classList.toggle('is-safe', region.safe);
    playerPanel?.classList.toggle('is-low-hp', playerLowHp);
    this.root.classList.toggle('is-player-low-hp', playerLowHp);
    this.text('player-level', `무사 · ${player.level}품`);
    this.text('hp-label', `${Math.ceil(player.hp)} / ${player.maxHp}`);
    this.width('hp-fill', playerHpRatio);
    this.width('xp-fill', player.xp / player.xpToNext);
    this.text('xp-label', `수련 ${player.xp} / ${player.xpToNext}`);
    this.width('xp-bottom-fill', player.xp / player.xpToNext);
    this.text('xp-bottom-label', `${player.xp} / ${player.xpToNext}`);
    this.text('gold', player.gold.toLocaleString('ko-KR'));
    this.text('inventory-gold', player.gold.toLocaleString('ko-KR'));
    this.text('inventory-potions', String(player.potions));
    this.text('inventory-level', `${player.level}품`);
    this.text('potions', String(player.potions));
    const potionButton = this.root.querySelector<HTMLButtonElement>('[data-action="potion"]');
    if (potionButton) potionButton.disabled = player.potions <= 0 || player.hp >= player.maxHp;
    const quickStepButton = this.root.querySelector<HTMLButtonElement>('[data-action="quick-step"]');
    const quickStepCooling = player.dodgeCooldown > 0;
    if (quickStepButton) {
      quickStepButton.disabled = quickStepCooling;
      quickStepButton.classList.toggle('is-cooling', quickStepCooling);
      quickStepButton.style.setProperty('--cooldown-ratio', `${Math.min(1, player.dodgeCooldown / 1.6) * 100}%`);
    }
    this.text('quick-step-label', quickStepCooling ? `${player.dodgeCooldown.toFixed(1)}초` : '회피 보법');
    this.text('kill-count', `${Math.min(player.kills, 8)} / 8`);
    this.width('quest-fill', Math.min(1, player.kills / 8));
    const weapon = this.equippedDefinition('weapon', snapshot);
    const armor = this.equippedDefinition('armor', snapshot);
    this.text('attack-name', weapon ? (weapon.id === 'dokkaebi-club' ? '방망이 후려치기' : '환도 베기') : '맨손 지르기');
    const attackIcon = this.root.querySelector<HTMLElement>('[data-id="attack-icon"]');
    const iconMarkup = weapon ? `<img src="${weapon.iconPath}" alt="">` : '拳';
    if (attackIcon && attackIcon.innerHTML !== iconMarkup) attackIcon.innerHTML = iconMarkup;
    this.text('player-kit', armor ? armor.name : '복장 미착용 · 맨발');
    this.renderInventory(snapshot);

    const targetCard = this.root.querySelector<HTMLElement>('.target-card');
    targetCard?.classList.toggle('is-visible', Boolean(target));
    if (target) {
      const isBoss = 'bossId' in target;
      const targetHpRatio = target.hp / target.maxHp;
      const state = isBoss ? target.state : target.aiState;
      const dangerousIntent = state === 'telegraph' || state === 'windup' || state === 'impact' || state === 'charge' || state === 'attack';
      targetCard?.classList.toggle('is-intent-danger', dangerousIntent);
      targetCard?.classList.toggle('is-low-hp', targetHpRatio <= 0.28);
      targetCard?.classList.toggle('is-vulnerable', state === 'stunned' || state === 'recovery');
      targetCard?.classList.toggle('is-boss', isBoss);
      if (targetCard) targetCard.dataset.intent = state;
      this.text('target-name', target.name);
      this.text('target-level', isBoss ? `${target.floor}층 수문장 · ${target.phase}단계` : `위험도 ${target.level}`);
      this.text('target-hp-label', `${Math.ceil(target.hp)} / ${target.maxHp}`);
      this.width('target-hp-fill', targetHpRatio);
      this.text('target-kind', isBoss ? '심층 우두머리 · 봉인 전투' : target.kind === 'dokkaebi' ? '괴이 · 요괴' : target.kind === 'boar' ? '야수 · 돌진' : '인간 · 창병');
      const monsterIntent = !isBoss ? ({
        patrol: '주변을 순찰하는 중', alert: '침입자를 발견함', chase: '거리를 좁히는 중',
        circle: '측면을 노리는 중', telegraph: '⚠ 돌진 준비 — 즉시 피하라', charge: '⚠ 맹렬한 돌진',
        attack: '⚠ 타격 임박 — 거리를 벌려라', return: '영역으로 복귀 중', stunned: '공격에 경직됨 — 반격 기회',
      }[target.aiState]) : null;
      const bossIntent = isBoss ? ({
        idle: '다음 공격을 살피는 중', chase: '거리를 좁히는 중', telegraph: '⚠ 범위 표시 — 안전 지대로 이동',
        windup: '⚠ 공격 임박', impact: '강력한 공격 발동', recovery: '회복 동작 — 반격 기회',
        'phase-change': '2단계 각성 · 잠시 무적', dead: '수문장 격파',
      }[target.state]) : null;
      const intent = bossIntent ?? monsterIntent ?? '전투 중';
      this.text('target-intent', intent);
    } else {
      targetCard?.classList.remove('is-intent-danger', 'is-low-hp', 'is-vulnerable', 'is-boss');
      targetCard?.removeAttribute('data-intent');
    }
  }

  handle(event: GameEvent): void {
    if (event.type === 'monster-killed') this.addFeed(`${event.name} 토벌 — 경험 +${event.xp}, 엽전 +${event.gold}`);
    if (event.type === 'player-impact' && event.critical) this.addFeed(`치명적인 일격! ${event.damage} 피해`);
    if (event.type === 'potion') this.addFeed(`산삼환을 삼켰다. 체력 +${event.healed}`);
    if (event.type === 'level-up') this.addFeed(`품계 상승! 무사 ${event.level}품이 되었다.`);
    if (event.type === 'player-defeated') this.addFeed('기력이 다했다. 관아의 구조를 기다리는 중…');
    if (event.type === 'player-respawn') this.addFeed('관아 구조대가 안전 지점으로 옮겨 주었다.');
    if (event.type === 'item-drop') this.addFeed(`${event.itemName}이(가) 바닥에 떨어졌다.`);
    if (event.type === 'item-pickup') this.addFeed(`${event.itemName} 습득 — 가방에 보관했다.`);
    if (event.type === 'inventory-full') this.addFeed(`가방이 가득 차 ${event.itemName}을 줍지 못했다.`);
    if (event.type === 'item-equipped') this.addFeed(`${event.itemName} ${event.equipped ? '장착' : '해제'}`);
    if (event.type === 'region-changed') this.addFeed(`${REGIONS[event.region].name}에 진입했다.`);
    if (event.type === 'dungeon-floor-changed') this.addFeed(`${event.title} ${event.floor}층 — ${event.maxFloor}층 중 현재 심도`);
    if (event.type === 'boss-spawned') this.addFeed(`⚔ ${event.boss.floor}층 수문장 ${event.boss.name} 출현 — 계단이 봉인되었다.`);
    if (event.type === 'boss-phase-changed') this.addFeed('수문장이 본색을 드러냈다. 2단계 패턴이 시작된다.');
    if (event.type === 'boss-killed') this.addFeed(`${event.name} 격파 — 다음 층 봉인이 풀렸다.`);
    if (event.type === 'boss-reset') this.addFeed(`${event.floor}층 수문장이 회복되었다. 체크포인트에서 다시 도전할 수 있다.`);
    if (event.type === 'dungeon-complete') this.addFeed('무영광산 100층 정복 — 최심부의 봉인이 무너졌다.');
    const questEvent = event as { type: string; gold?: number };
    if (questEvent.type === 'quest-complete') this.addFeed(`현상수배 완료 — 관아 보상 엽전 +${questEvent.gold ?? 240}`);
  }

  private renderInventory(snapshot: Snapshot): void {
    if (this.selectedItemId && !snapshot.inventory.some((item) => item.instanceId === this.selectedItemId)) this.selectedItemId = null;
    const visibleItems = this.filteredInventory(snapshot.inventory);
    if (!this.selectedItemId && visibleItems[0]) this.selectedItemId = visibleItems[0].instanceId;
    const signature = JSON.stringify([
      snapshot.inventory, snapshot.equipment, snapshot.player.maxHp, snapshot.attackPower,
      snapshot.defense, snapshot.accuracy, snapshot.evasion,
      this.selectedItemId, this.inventoryFilter, this.inventorySort,
    ]);
    if (signature === this.inventorySignature) return;
    const focusedSelectId = (document.activeElement as HTMLElement | null)?.dataset.selectItem;
    this.inventorySignature = signature;

    for (const filter of this.root.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
      const active = filter.dataset.filter === this.inventoryFilter;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    }
    this.text('inventory-sort-label', this.inventorySort === 'recent' ? '획득순' : '종류순');

    const preview = this.root.querySelector<HTMLElement>('[data-id="character-preview"]');
    if (preview) {
      const layers = resolvePlayerLayers(snapshot.equipment, snapshot.inventory);
      const armor = this.equippedDefinition('armor', snapshot);
      const weapon = this.equippedDefinition('weapon', snapshot);
      preview.innerHTML = `
        <span class="avatar-rune"></span>
        <span class="avatar-sprite" style="--character-sheet:url('${ASSETS.playerUnequipped.path}')"></span>
        ${layers.armor ? `<span class="avatar-sprite avatar-armor-layer" style="--character-sheet:url('${ASSETS.playerArmorLayer.path}')"></span>` : ''}
        ${layers.weapon && weapon ? `<img class="avatar-weapon-layer" src="${weapon.iconPath}" alt="">` : ''}
        <span class="avatar-ground"></span>
        <div class="avatar-caption"><b>윤 서휘</b><small>${armor?.name ?? '복장 미착용 · 맨발'} · ${weapon?.name ?? '빈손'}</small></div>`;
    }

    const slots = this.root.querySelector<HTMLElement>('[data-id="equipment-slots"]');
    if (slots) {
      slots.innerHTML = (['weapon', 'armor', 'charm'] as EquipmentSlot[]).map((slot) => {
        const instanceId = snapshot.equipment[slot];
        const item = snapshot.inventory.find((entry) => entry.instanceId === instanceId);
        const definition = item ? ITEM_CATALOG[item.itemId] : null;
        const emptyLabel = slot === 'weapon' ? '빈손' : slot === 'armor' ? '미착용' : '없음';
        const symbol = slot === 'weapon' ? '刀' : slot === 'armor' ? '衣' : '符';
        const equipAttributes = item && definition ? `data-equip-item="${item.instanceId}" aria-label="${definition.name} 해제"` : 'disabled';
        return `<button class="equipment-slot gear-${slot} ${definition ? 'is-filled' : ''}" ${equipAttributes}>
          <span class="gear-symbol">${symbol}</span><span class="gear-copy"><em>${SLOT_LABEL[slot]}</em>
          ${definition ? `<b class="rarity-text-${definition.rarity}">${definition.name}</b><small>${this.itemStats(definition)}</small>` : `<i>${emptyLabel}</i>`}</span>
          ${definition ? `<img src="${definition.iconPath}" alt="">` : ''}
        </button>`;
      }).join('');
    }

    const grid = this.root.querySelector<HTMLElement>('[data-id="inventory-grid"]');
    if (grid) {
      const items = visibleItems.map((item, index) => {
        const definition = ITEM_CATALOG[item.itemId];
        const equipped = Object.values(snapshot.equipment).includes(item.instanceId);
        const selected = item.instanceId === this.selectedItemId;
        return `<button class="inventory-item rarity-${definition.rarity} ${equipped ? 'is-equipped' : ''} ${selected ? 'is-selected' : ''}" data-select-item="${item.instanceId}" data-slot="${definition.slot}" aria-pressed="${selected}" aria-label="${definition.name}, ${SLOT_LABEL[definition.slot]}, ${definition.rarity}, ${this.itemStats(definition)}${equipped ? ', 장착 중' : ''}" title="${definition.description}">
          <span class="slot-index">${String(index + 1).padStart(2, '0')}</span><span class="item-glow"></span><img src="${definition.iconPath}" alt=""><b>${definition.name}</b>${equipped ? '<em>착용</em>' : ''}
        </button>`;
      });
      while (items.length < snapshot.inventoryCapacity) {
        items.push(`<div class="inventory-empty"><span>${String(items.length + 1).padStart(2, '0')}</span></div>`);
      }
      grid.innerHTML = items.join('');
    }

    const detail = this.root.querySelector<HTMLElement>('[data-id="item-detail"]');
    const selectedItem = snapshot.inventory.find((item) => item.instanceId === this.selectedItemId);
    if (detail) {
      if (!selectedItem) {
        detail.innerHTML = `<div class="item-detail-empty set-codex"><span>月</span><b>${ITEM_SET.name}</b><small>솔고개의 정예 요물에게서 획득할 수 있는 영웅 장비입니다.</small>
          <div class="set-codex-icons">${ITEM_SET.pieces.map((itemId) => {
            const item = ITEM_CATALOG[itemId];
            return `<figure><img src="${item.iconPath}" alt=""><figcaption>${item.name}</figcaption></figure>`;
          }).join('')}</div>
          <div class="set-codex-bonuses">${ITEM_SET.bonuses.map((bonus) => `<p><b>${bonus.pieces}세트</b>${bonus.label}</p>`).join('')}</div>
          <em>아이템을 선택하면 현재 장비와 능력치를 비교합니다.</em></div>`;
      } else {
        const definition = ITEM_CATALOG[selectedItem.itemId];
        const equippedInstanceId = snapshot.equipment[definition.slot];
        const equippedItem = snapshot.inventory.find((item) => item.instanceId === equippedInstanceId);
        const equippedDefinition = equippedItem ? ITEM_CATALOG[equippedItem.itemId] : null;
        const isEquipped = equippedInstanceId === selectedItem.instanceId;
        const comparisons = isEquipped
          ? '<span class="comparison-current">현재 착용 중</span>'
          : this.comparisonStats(definition, equippedDefinition);
        detail.innerHTML = `
          <div class="detail-rarity rarity-text-${definition.rarity}">${definition.rarity} · ${SLOT_LABEL[definition.slot]}</div>
          <div class="detail-icon rarity-${definition.rarity}"><span class="item-glow"></span><img src="${definition.iconPath}" alt=""></div>
          <strong>${definition.name}</strong>
          <div class="detail-stats">${this.detailStats(definition)}</div>
          <p>${definition.description}</p>
          <div class="item-requirements"><span>착용 제한 <b>${definition.requiredLevel}품 이상</b></span><span>매입가 <b>${definition.sellPrice.toLocaleString('ko-KR')}전</b></span></div>
          ${definition.setId ? this.setDetail(snapshot) : ''}
          <div class="detail-comparison"><small>${equippedDefinition && !isEquipped ? `${equippedDefinition.name} 대비` : '장비 비교'}</small>${comparisons}</div>
          <button class="detail-equip" data-equip-item="${selectedItem.instanceId}">${isEquipped ? '장비 해제' : '장착하기'}</button>
          <small class="detail-hint">더블클릭으로도 장착할 수 있습니다.</small>`;
      }
    }

    this.text('inventory-count', `${snapshot.inventory.length} / ${snapshot.inventoryCapacity}`);
    this.text('inventory-attack', `${snapshot.attackPower}–${snapshot.attackPower + 5}`);
    this.text('inventory-hp', String(snapshot.player.maxHp));
    this.text('inventory-defense', String(snapshot.defense));
    this.text('inventory-accuracy', `${snapshot.accuracy}%`);
    this.text('inventory-evasion', `${snapshot.evasion}%`);
    this.text('inventory-power', this.combatPower(snapshot).toLocaleString('ko-KR'));
    this.width('inventory-power-fill', Math.min(1, this.combatPower(snapshot) / 1000));
    this.width('inventory-capacity-fill', snapshot.inventory.length / snapshot.inventoryCapacity);
    if (focusedSelectId) window.requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>(`[data-select-item="${focusedSelectId}"]`)?.focus());
  }

  private filteredInventory(inventory: InventoryItem[]): InventoryItem[] {
    const indexed = inventory.map((item, index) => ({ item, index }));
    const filtered = this.inventoryFilter === 'all'
      ? indexed
      : indexed.filter(({ item }) => ITEM_CATALOG[item.itemId].slot === this.inventoryFilter);
    if (this.inventorySort === 'type') {
      filtered.sort((a, b) => SLOT_ORDER[ITEM_CATALOG[a.item.itemId].slot] - SLOT_ORDER[ITEM_CATALOG[b.item.itemId].slot] || a.index - b.index);
    }
    return filtered.map(({ item }) => item);
  }

  private equippedDefinition(slot: EquipmentSlot, snapshot: Snapshot) {
    const instanceId = snapshot.equipment[slot];
    const item = snapshot.inventory.find((entry) => entry.instanceId === instanceId);
    return item ? ITEM_CATALOG[item.itemId] : null;
  }

  private itemStats(definition: ItemDefinition): string {
    const stats: string[] = [];
    if (definition.attackBonus) stats.push(`공격 +${definition.attackBonus}`);
    if (definition.hpBonus) stats.push(`체력 +${definition.hpBonus}`);
    if (definition.defenseBonus) stats.push(`방어 +${definition.defenseBonus}`);
    if (definition.accuracyBonus) stats.push(`명중 ${definition.accuracyBonus > 0 ? '+' : ''}${definition.accuracyBonus}`);
    if (definition.evasionBonus) stats.push(`회피 +${definition.evasionBonus}`);
    return stats.length ? stats.join(' · ') : '장식';
  }

  private detailStats(definition: ItemDefinition): string {
    const entries = [
      ['공격력', definition.attackBonus], ['최대 체력', definition.hpBonus],
      ['방어', definition.defenseBonus], ['명중', definition.accuracyBonus], ['회피', definition.evasionBonus],
    ] as const;
    return entries.filter(([, value]) => value !== 0).map(([label, value]) =>
      `<span>${label} <b>${value > 0 ? '+' : ''}${value}</b></span>`).join('');
  }

  private comparisonStats(definition: ItemDefinition, equipped: ItemDefinition | null): string {
    const entries = [
      ['공격', definition.attackBonus - (equipped?.attackBonus ?? 0)],
      ['체력', definition.hpBonus - (equipped?.hpBonus ?? 0)],
      ['방어', definition.defenseBonus - (equipped?.defenseBonus ?? 0)],
      ['명중', definition.accuracyBonus - (equipped?.accuracyBonus ?? 0)],
      ['회피', definition.evasionBonus - (equipped?.evasionBonus ?? 0)],
    ] as const;
    const changed = entries.filter(([, value]) => value !== 0).map(([label, value]) =>
      `<span class="${value > 0 ? 'positive' : 'negative'}">${label} ${value > 0 ? '+' : ''}${value}</span>`);
    return changed.join('') || '<span>능력 변화 없음</span>';
  }

  private combatPower(snapshot: Snapshot): number {
    return Math.round(snapshot.attackPower * 12 + snapshot.defense * 9 + snapshot.player.maxHp * 1.2
      + snapshot.accuracy * 2 + snapshot.evasion * 7);
  }

  private setDetail(snapshot: Snapshot): string {
    const equippedSetIds = new Set((Object.values(snapshot.equipment) as Array<string | null>)
      .map((instanceId) => snapshot.inventory.find((item) => item.instanceId === instanceId)?.itemId)
      .filter((itemId) => itemId && ITEM_CATALOG[itemId].setId === ITEM_SET.id));
    const ownedIds = new Set(snapshot.inventory.map((item) => item.itemId));
    return `<section class="set-detail"><header><span>SET ITEM</span><b>${ITEM_SET.name}</b><em>${equippedSetIds.size} / ${ITEM_SET.pieces.length}</em></header>
      <ul>${ITEM_SET.pieces.map((itemId) => {
        const item = ITEM_CATALOG[itemId];
        const equipped = equippedSetIds.has(itemId);
        return `<li class="${equipped ? 'is-equipped' : ownedIds.has(itemId) ? 'is-owned' : ''}"><i></i>${item.name}<small>${equipped ? '착용' : ownedIds.has(itemId) ? '보유' : '미보유'}</small></li>`;
      }).join('')}</ul>
      <div>${ITEM_SET.bonuses.map((bonus) => `<p class="${equippedSetIds.size >= bonus.pieces ? 'is-active' : ''}"><b>${bonus.pieces}세트</b>${bonus.label}</p>`).join('')}</div></section>`;
  }

  private addFeed(message: string): void {
    this.feed.unshift(`[${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}] ${message}`);
    this.feed.splice(4);
    this.text('combat-feed', this.feed.join('\n'));
  }

  private text(id: string, value: string): void {
    const element = this.root.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (element && element.textContent !== value) element.textContent = value;
  }

  private width(id: string, ratio: number): void {
    const element = this.root.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (element) {
      const percent = Math.max(0, Math.min(1, ratio)) * 100;
      element.style.width = `${percent}%`;
      element.setAttribute('aria-valuemin', '0');
      element.setAttribute('aria-valuemax', '100');
      element.setAttribute('aria-valuenow', String(Math.round(percent)));
    }
  }

  private template(): string {
    return `
      <section class="location-plaque" aria-label="현재 지역">
        <span class="eyebrow" data-id="location-province">강원도 · 금강산 남녘</span>
        <strong data-id="location-name">월영 솔고개</strong>
        <span class="danger-dot" data-id="location-status">분쟁 사냥터</span>
      </section>

      <section class="player-panel ornate-panel">
        <div class="portrait"><span>武</span><i></i></div>
        <div class="player-info">
          <span class="eyebrow">청해진 토벌대 · <em data-id="player-kit">복장 미착용 · 맨발</em></span>
          <strong class="player-name">윤 서휘</strong>
          <span class="rank" data-id="player-level">무사 · 4품</span>
          <div class="bar hp"><i data-id="hp-fill"></i><b data-id="hp-label">180 / 180</b></div>
          <div class="bar xp"><i data-id="xp-fill"></i><b data-id="xp-label">수련 64 / 160</b></div>
        </div>
      </section>

      <section class="target-card ornate-panel">
        <header><span data-id="target-kind">괴이 · 요괴</span><b data-id="target-level">위험도 4</b></header>
        <strong data-id="target-name">검푸른 도깨비</strong>
        <div class="bar target-hp"><i data-id="target-hp-fill"></i><b data-id="target-hp-label">132 / 132</b></div>
        <small data-id="target-intent">선택 대상 · 자동 추적 중</small>
      </section>

      <section class="quest-chip ornate-panel">
        <span class="quest-mark">令</span>
        <div><span class="eyebrow">관아 현상수배</span><strong>솔고개 요물 토벌</strong>
          <div class="quest-progress"><i data-id="quest-fill"></i></div>
          <small><span data-id="kill-count">0 / 8</span> · 보상 엽전 240</small>
        </div>
      </section>

      <section class="chat-box" aria-label="전투 기록">
        <header><strong>전투 기록</strong><span>획득 · 경계 · 토벌</span></header>
        <pre class="combat-feed" data-id="combat-feed" aria-live="polite">[경계병] 솔고개에 요사한 기운이 짙어졌소.</pre>
      </section>

      <section class="bottom-dock">
        <div class="currency"><span class="coin">전</span><b data-id="gold">128</b></div>
        <div class="action-deck">
          <div class="hotbar">
            <div class="hot-slot active" aria-label="대상 클릭 기본 공격"><kbd>클릭</kbd><span data-id="attack-icon">拳</span><small data-id="attack-name">맨손 지르기</small></div>
            <button class="hot-slot" data-action="potion" aria-label="산삼환 사용"><kbd>2</kbd><span class="potion-icon"><img src="/assets/items/ginseng-pellet-v4.png" alt=""></span><small>산삼환 <b data-id="potions">3</b></small></button>
            <button class="hot-slot quick-step" data-action="quick-step" aria-label="회피 보법"><kbd>Space</kbd><span>疾</span><small data-id="quick-step-label">회피 보법</small></button>
            <div class="hot-slot auto-status" aria-label="현재 전투 방식: 대상 자동 추적"><kbd>AUTO</kbd><span>追</span><small>대상 추적</small></div>
          </div>
          <div class="bottom-xp" aria-label="수련 경험치"><i data-id="xp-bottom-fill" role="progressbar"></i><b data-id="xp-bottom-label">64 / 160</b></div>
        </div>
        <button class="menu-seal" data-action="inventory" aria-label="행낭 열기" aria-controls="inventory-panel" aria-expanded="false"><span>囊</span><b>행낭</b><kbd>I</kbd></button>
      </section>

      <button class="inventory-backdrop" data-action="inventory-backdrop" aria-label="인벤토리 닫기" aria-hidden="true" tabindex="-1"></button>
      <section class="inventory-panel" id="inventory-panel" role="dialog" aria-modal="true" aria-labelledby="inventory-title" aria-hidden="true" inert>
        <header class="inventory-titlebar">
          <div class="inventory-heading"><span>CHARACTER · INVENTORY</span><strong id="inventory-title">윤 서휘의 행낭</strong></div>
          <div class="inventory-channel"><i></i><span><small>사냥 채널</small><b>솔고개 1</b></span></div>
          <div class="inventory-wallet">
            <span><i class="coin">전</i><b data-id="inventory-gold">128</b></span>
            <span><i class="potion-token">◆</i><b data-id="inventory-potions">3</b></span>
            <button data-action="inventory-close" aria-label="행낭 닫기">×</button>
          </div>
        </header>
        <div class="inventory-body">
          <aside class="equipment-column">
            <div class="equipment-title"><div><span>CHARACTER</span><strong>장비 현황</strong></div><b data-id="inventory-level">4품</b></div>
            <div class="character-preview" data-id="character-preview" aria-label="현재 장비를 착용한 캐릭터"></div>
            <div class="equipment-slots" data-id="equipment-slots"></div>
            <section class="ability-panel" aria-label="상세 능력치">
              <header><span>COMBAT ABILITY</span><b>상세 능력치</b><em><small>전투력</small><strong data-id="inventory-power">479</strong></em></header>
              <div class="power-gauge"><i data-id="inventory-power-fill" role="progressbar"></i></div>
              <div class="stat-strip">
                <span title="장비와 세트 효과가 포함된 기본 피해"><i>攻</i><small>공격력</small><b data-id="inventory-attack">7–12</b></span>
                <span title="받는 물리 피해를 직접 감소"><i>防</i><small>방어력</small><b data-id="inventory-defense">0</b></span>
                <span title="현재 장비가 포함된 최대 생명력"><i>命</i><small>최대 생명</small><b data-id="inventory-hp">180</b></span>
                <span title="공격이 적중할 기본 확률"><i>中</i><small>명중</small><b data-id="inventory-accuracy">82%</b></span>
                <span title="적의 공격을 완전히 피할 확률"><i>避</i><small>회피</small><b data-id="inventory-evasion">3%</b></span>
                <span title="품계와 장비를 합산한 현재 성장 단계"><i>階</i><small>전투 등급</small><b>무사 4품</b></span>
              </div>
            </section>
          </aside>
          <main class="bag-column">
            <div class="bag-title"><div><span>FIELD BAG</span><strong>소지품</strong></div><b data-id="inventory-count">0 / 12</b></div>
            <div class="capacity-bar" aria-label="가방 사용량"><i data-id="inventory-capacity-fill" role="progressbar"></i></div>
            <nav class="bag-toolbar" aria-label="소지품 분류">
              <div class="bag-filters">
                <button data-filter="all" aria-pressed="true">전체</button>
                <button data-filter="weapon" aria-pressed="false">무기</button>
                <button data-filter="armor" aria-pressed="false">복장</button>
                <button data-filter="charm" aria-pressed="false">부적</button>
              </div>
              <button class="inventory-sort" data-action="inventory-sort" aria-label="소지품 정렬 방식 변경"><span data-id="inventory-sort-label">획득순</span><i>↕</i></button>
            </nav>
            <div class="inventory-grid" data-id="inventory-grid"></div>
            <footer><span>클릭 선택</span><span>더블클릭 장착</span><span>빈손은 주먹 공격</span></footer>
          </main>
          <aside class="item-detail" data-id="item-detail" aria-live="polite"></aside>
        </div>
      </section>

      <div class="field-guide"><b>사냥법</b><span>바닥 클릭 — 이동</span><span>몬스터 클릭 — 추적·공격</span><span>Space — 회피 보법</span><span>전리품 클릭 — 습득</span><span>I — 가방</span></div>
      <div class="vignette"></div>
    `;
  }
}
