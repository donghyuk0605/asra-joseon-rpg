import { ITEM_CATALOG, ITEM_SET, type ItemDefinition } from '../items/catalog';
import type {
  EquipmentSlot, EquipmentState, GameEvent, GroundDrop, InventoryItem, ItemId,
  MonsterKind, MonsterState, PlayerState, Vec2,
} from './types';
import { CENTRAL_WORLD_HEIGHT, MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS, VILLAGE_TOP } from '../world/layout';
import type { RegionId } from '../world/regions';
import { generateDungeonFloor, MAX_DUNGEON_FLOOR, type DungeonFloorLayout } from '../world/dungeonGenerator';
import { bossForFloor } from '../bosses/catalog';
import { BossCombatController, createBossState } from '../bosses/BossCombatController';
import { containsPatternPoint } from '../bosses/patternGeometry';
import type { BossState } from '../bosses/types';

const MONSTER_DATA: Record<MonsterKind, { name: string; hp: number; damage: number; level: number }> = {
  dokkaebi: { name: '검푸른 도깨비', hp: 132, damage: 9, level: 4 },
  boar: { name: '산령 멧돼지', hp: 96, damage: 7, level: 3 },
  bandit: { name: '복면 탈영병', hp: 118, damage: 11, level: 5 },
  'bamboo-spirit': { name: '청람 죽림귀', hp: 146, damage: 12, level: 6 },
  'mine-golem': { name: '흑철 광산귀', hp: 188, damage: 15, level: 7 },
  'moon-revenant': { name: '은초 원귀', hp: 158, damage: 14, level: 7 },
};

const REGION_SPAWNS: Record<Exclude<RegionId, 'village'>, Array<[MonsterKind, number, number]>> = {
  solgogae: [
    ['boar', 445, 355], ['dokkaebi', 775, 315], ['bandit', 1055, 375],
    ['boar', 575, 625], ['dokkaebi', 950, 650], ['bandit', 1210, 585],
  ],
  mistwood: [
    ['bamboo-spirit', 410, 350], ['bamboo-spirit', 700, 320], ['bamboo-spirit', 1030, 380],
    ['bamboo-spirit', 510, 640], ['bamboo-spirit', 875, 625], ['bamboo-spirit', 1190, 590],
  ],
  minepass: [
    ['mine-golem', 430, 345], ['mine-golem', 720, 325], ['mine-golem', 1040, 390],
    ['mine-golem', 560, 630], ['mine-golem', 900, 645], ['mine-golem', 1200, 580],
  ],
  moonfield: [
    ['moon-revenant', 420, 365], ['moon-revenant', 720, 320], ['moon-revenant', 1035, 385],
    ['moon-revenant', 555, 625], ['moon-revenant', 900, 640], ['moon-revenant', 1200, 590],
  ],
  dungeon: [
    ['mine-golem', 480, 390], ['mine-golem', 760, 330], ['mine-golem', 1055, 390],
    ['mine-golem', 500, 590], ['mine-golem', 760, 650], ['mine-golem', 1035, 590],
  ],
};

type FieldObstacle =
  | { type: 'circle'; x: number; y: number; radius: number }
  | { type: 'box'; x: number; y: number; width: number; height: number };

const FIELD_OBSTACLES: readonly FieldObstacle[] = [
  // Runtime props.
  { type: 'circle', x: 1120, y: 690, radius: 70 },
  { type: 'circle', x: 315, y: 735, radius: 72 },
  // Painted terrain silhouettes: water, temple steps, rock shelves and large tree roots.
  { type: 'box', x: 365, y: 270, width: 300, height: 80 },
  { type: 'box', x: 1115, y: 270, width: 178, height: 76 },
  { type: 'circle', x: 700, y: 250, radius: 45 },
  { type: 'circle', x: 258, y: 405, radius: 54 },
  { type: 'circle', x: 1285, y: 390, radius: 58 },
  { type: 'circle', x: 1290, y: 605, radius: 70 },
  { type: 'circle', x: 1000, y: 840, radius: 60 },
  { type: 'circle', x: 250, y: 825, radius: 58 },
  // Village (the second 1536x1024 map, blended from VILLAGE_TOP on Y).
  // Northern wall leaves the central gate and road open.
  { type: 'box', x: 380, y: VILLAGE_TOP + 104, width: 530, height: 86 },
  { type: 'box', x: 1135, y: VILLAGE_TOP + 104, width: 420, height: 86 },
  // Inn compound and blacksmith workshop.
  { type: 'box', x: 300, y: VILLAGE_TOP + 246, width: 410, height: 310 },
  { type: 'box', x: 1240, y: VILLAGE_TOP + 281, width: 330, height: 330 },
  // Market stalls and village utilities.
  { type: 'box', x: 275, y: VILLAGE_TOP + 681, width: 430, height: 300 },
  { type: 'circle', x: 1060, y: VILLAGE_TOP + 661, radius: 62 },
  { type: 'box', x: 920, y: VILLAGE_TOP + 636, width: 78, height: 88 },
  // Rocky perimeter, while keeping the southern road open.
  { type: 'box', x: 365, y: VILLAGE_TOP + 926, width: 540, height: 135 },
  { type: 'box', x: 1180, y: VILLAGE_TOP + 926, width: 360, height: 135 },
] as const;

type PendingMonsterAttack = {
  monsterId: string;
  damage: number;
  impactAt: number;
  knockbackForce: number;
  impactRange: number;
};

export class GameSimulation {
  region: RegionId = 'solgogae';
  dungeonFloor = 0;
  dungeonLayout: DungeonFloorLayout | null = null;
  boss: BossState | null = null;
  highestBossCheckpoint = 1;
  readonly player: PlayerState = {
    x: 765, y: 680, hp: 180, maxHp: 180, level: 4, xp: 64, xpToNext: 160,
    gold: 128, potions: 3, kills: 0, destination: null, targetId: null,
    attackCooldown: 0, dodgeCooldown: 0, facing: -Math.PI / 2, lootTargetId: null,
  };

  readonly inventory: InventoryItem[] = [];
  readonly equipment: EquipmentState = { weapon: null, armor: null, charm: null };
  readonly groundDrops: GroundDrop[] = [];
  readonly inventoryCapacity = 20;

  readonly monsters: MonsterState[] = (Object.entries(REGION_SPAWNS) as Array<
    [Exclude<RegionId, 'village'>, Array<[MonsterKind, number, number]>]
  >).flatMap(([region, roster]) => {
    const origin = REGION_ORIGINS[region];
    return roster.map(([kind, localX, localY], index) => {
      const data = MONSTER_DATA[kind];
      const x = origin.x + localX;
      const y = origin.y + localY;
      return {
        id: `${region}-monster-${index}`, region, kind, x, y, spawn: { x, y }, name: data.name,
        level: data.level, hp: data.hp, maxHp: data.hp, damage: data.damage,
        alive: true, attackCooldown: Math.random() * 0.8, respawnAt: 0,
        facing: Math.PI / 2, aiState: 'patrol' as const, aggro: false,
        thinkTimer: 0.8 + index * 0.17, actionTimer: 0,
        patrolTarget: { x: x + Math.cos(index * 2.1) * 36, y: y + Math.sin(index * 2.1) * 28 },
        chargeDirection: { x: 0, y: 0 }, hitStun: 0, knockback: { x: 0, y: 0 },
      };
    });
  });

  private events: GameEvent[] = [];
  private elapsed = 0;
  private readonly attackRange = 105;
  private playerRespawnAt = 0;
  private playerActive = false;
  private pendingPlayerAttack: { targetId: string; damage: number; critical: boolean; impactAt: number; style: 'fist' | 'weapon' } | null = null;
  private pendingMonsterAttacks: PendingMonsterAttack[] = [];
  private dropCounter = 0;
  private itemCounter = 0;
  private droppedStarterWeapon = false;
  private questCompleted = false;
  private dungeonObstacles: FieldObstacle[] = [];
  private dungeonStairLocked = false;
  private dungeonComplete = false;
  private defeatedInDungeon = false;
  private readonly bossController = new BossCombatController();

  enterDungeon(): void {
    this.applyDungeonFloor(this.highestBossCheckpoint >= 10 ? this.highestBossCheckpoint : 1);
  }

  advanceDungeonFloor(): void {
    if (this.region !== 'dungeon' || !this.dungeonLayout || this.dungeonStairLocked) return;
    this.applyDungeonFloor(Math.min(MAX_DUNGEON_FLOOR, this.dungeonFloor + 1));
  }

  isDungeonExitLocked(): boolean {
    return this.dungeonStairLocked;
  }

  leaveDungeon(): void {
    if (this.region !== 'dungeon') return;
    this.player.x = REGION_ORIGINS.minepass.x + 770;
    this.player.y = REGION_ORIGINS.minepass.y + 300;
    this.player.destination = null;
    this.dungeonFloor = 0;
    this.dungeonLayout = null;
    this.dungeonObstacles = [];
    this.boss = null;
    this.dungeonStairLocked = false;
    this.changeRegion('minepass');
  }

  private applyDungeonFloor(floor: number): void {
    const layout = generateDungeonFloor(floor);
    const entering = this.region !== 'dungeon';
    this.dungeonFloor = layout.floor;
    this.dungeonLayout = layout;
    const origin = REGION_ORIGINS.dungeon;
    this.dungeonObstacles = layout.features.flatMap((feature): FieldObstacle[] => {
      if (feature.kind === 'wall') return [{ type: 'box', x: origin.x + feature.x, y: origin.y + feature.y, width: feature.width, height: feature.height }];
      if (feature.kind === 'pillar' || feature.kind === 'seal') return [{ type: 'circle', x: origin.x + feature.x, y: origin.y + feature.y, radius: feature.radius }];
      return [];
    });
    const roster = this.monsters.filter((monster) => monster.region === 'dungeon');
    const bossDefinition = bossForFloor(layout.floor);
    if (bossDefinition) {
      roster.forEach((monster) => {
        monster.alive = false;
        monster.hp = 0;
        monster.respawnAt = Number.POSITIVE_INFINITY;
        monster.aggro = false;
      });
      this.boss = createBossState(bossDefinition, { x: origin.x + 760, y: origin.y + 470 });
      this.highestBossCheckpoint = Math.max(this.highestBossCheckpoint, layout.floor);
      this.dungeonStairLocked = true;
      this.events.push({ type: 'boss-spawned', boss: this.boss });
      this.events.push({ type: 'dungeon-stair-lock-changed', locked: true });
    } else {
      this.boss = null;
      this.dungeonStairLocked = false;
      roster.forEach((monster, index) => {
      const spawn = layout.monsterSpawns[index];
      const tierKinds: MonsterKind[] = layout.floor >= 80
        ? ['mine-golem', 'moon-revenant', 'dokkaebi']
        : layout.floor >= 55 ? ['moon-revenant', 'mine-golem']
          : layout.floor >= 30 ? ['bamboo-spirit', 'moon-revenant'] : ['mine-golem', 'dokkaebi'];
      const kind = tierKinds[(layout.floor + index) % tierKinds.length];
      const base = MONSTER_DATA[kind];
      const maxHp = Math.round(base.hp + layout.floor * 7);
      monster.kind = kind;
      monster.name = `${layout.title} ${base.name}`;
      monster.level = base.level + layout.floor;
      monster.maxHp = maxHp;
      monster.hp = maxHp;
      monster.damage = base.damage + Math.floor(layout.floor / 4);
      monster.x = origin.x + spawn.x;
      monster.y = origin.y + spawn.y;
      monster.spawn = { x: monster.x, y: monster.y };
      monster.patrolTarget = { x: monster.x + 24, y: monster.y };
      monster.alive = true;
      monster.respawnAt = 0;
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
      monster.hitStun = 0;
      });
    }
    this.player.x = origin.x + layout.playerSpawn.x;
    this.player.y = origin.y + layout.playerSpawn.y;
    this.player.destination = null;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.playerActive = false;
    if (entering) this.changeRegion('dungeon');
    this.events.push({ type: 'dungeon-floor-changed', floor: layout.floor, maxFloor: layout.maxFloor, title: layout.title });
  }

  moveTo(point: Vec2): void {
    if (this.player.hp <= 0) return;
    this.playerActive = true;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.pendingPlayerAttack = null;
    this.player.destination = this.clampPlayerPoint(point);
  }

  selectMonster(id: string): void {
    if (this.player.hp <= 0) return;
    const monster = this.monsters.find((entry) => entry.id === id && entry.alive);
    if (!monster) return;
    this.playerActive = true;
    this.player.targetId = id;
    this.player.lootTargetId = null;
    this.player.destination = null;
  }

  selectBoss(): void {
    if (this.player.hp <= 0 || !this.boss?.alive) return;
    this.playerActive = true;
    this.player.targetId = this.boss.id;
    this.player.lootTargetId = null;
    this.player.destination = null;
  }

  damageBoss(amount: number): void {
    const boss = this.boss;
    if (!boss?.alive) return;
    const commands = this.bossController.damage(boss, amount);
    for (const command of commands) {
      if (command.type === 'phase-change') this.events.push({ type: 'boss-phase-changed', bossId: boss.id, phase: 2 });
    }
    if (!boss.alive) this.killBoss(boss);
  }

  collectDrop(id: string): void {
    if (this.player.hp <= 0 || !this.groundDrops.some((drop) => drop.id === id)) return;
    this.playerActive = true;
    this.player.targetId = null;
    this.player.destination = null;
    this.player.lootTargetId = id;
  }

  equipItem(instanceId: string): void {
    const item = this.inventory.find((entry) => entry.instanceId === instanceId);
    if (!item) return;
    const definition = ITEM_CATALOG[item.itemId];
    const previousHpBonus = this.getEquipmentHpBonus();
    const isEquipped = this.equipment[definition.slot] === instanceId;
    this.equipment[definition.slot] = isEquipped ? null : instanceId;
    const hpDelta = this.getEquipmentHpBonus() - previousHpBonus;
    this.player.maxHp += hpDelta;
    this.player.hp = hpDelta > 0
      ? Math.min(this.player.maxHp, this.player.hp + hpDelta)
      : Math.min(this.player.hp, this.player.maxHp);
    this.pendingPlayerAttack = null;
    this.player.attackCooldown = Math.max(this.player.attackCooldown, 0.16);
    this.events = this.events.filter((event) => event.type !== 'player-attack' && event.type !== 'player-impact');
    this.events.push({
      type: 'item-equipped', itemId: item.itemId, itemName: definition.name, equipped: !isEquipped,
    });
  }

  getEquippedDefinition(slot: EquipmentSlot): ItemDefinition | null {
    const instanceId = this.equipment[slot];
    const item = this.inventory.find((entry) => entry.instanceId === instanceId);
    return item ? ITEM_CATALOG[item.itemId] : null;
  }

  getAttackPower(): number {
    return 7 + this.getEquipmentAttackBonus() + this.getSetBonus('attack');
  }

  getDefense(): number {
    return this.getEquipmentStatBonus('defenseBonus') + this.getSetBonus('defense');
  }

  getAccuracy(): number {
    return 82 + this.getEquipmentStatBonus('accuracyBonus');
  }

  getEvasion(): number {
    return 3 + this.getEquipmentStatBonus('evasionBonus');
  }

  usePotion(): void {
    if (this.player.potions <= 0 || this.player.hp >= this.player.maxHp) return;
    const healed = Math.min(70, this.player.maxHp - this.player.hp);
    this.player.hp += healed;
    this.player.potions -= 1;
    this.events.push({ type: 'potion', healed });
  }

  quickStep(): void {
    if (this.player.hp <= 0 || this.player.dodgeCooldown > 0) return;
    const from = { x: this.player.x, y: this.player.y };
    const target = this.getTarget() ?? this.getBossTarget();
    const angle = target
      ? Math.atan2(this.player.y - target.y, this.player.x - target.x)
      : this.player.facing;
    const destination = this.clampPlayerPoint({
      x: this.player.x + Math.cos(angle) * 82,
      y: this.player.y + Math.sin(angle) * 82,
    });

    this.player.x = destination.x;
    this.player.y = destination.y;
    this.player.facing = angle;
    this.player.destination = null;
    this.player.lootTargetId = null;
    this.player.dodgeCooldown = 1.6;
    this.player.attackCooldown = Math.max(this.player.attackCooldown, 0.2);
    this.pendingPlayerAttack = null;
    this.playerActive = true;
    this.events.push({ type: 'player-quickstep', from, to: { x: destination.x, y: destination.y } });
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(deltaSeconds, 0.05);
    this.elapsed += dt;
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.dodgeCooldown = Math.max(0, this.player.dodgeCooldown - dt);

    this.respawnMonsters();
    this.resolvePendingPlayerAttack();
    this.resolvePendingMonsterAttacks();
    if (this.player.hp <= 0) {
      if (this.playerRespawnAt > 0 && this.elapsed >= this.playerRespawnAt) this.respawnPlayer();
      return;
    }

    const bossTarget = this.getBossTarget();
    const target = this.getTarget();
    if (this.player.lootTargetId) this.updateLootCollection(dt);
    else if (bossTarget) this.updateBossTargetCombat(bossTarget, dt);
    else if (target) this.updateTargetCombat(target, dt);
    else if (this.player.destination) {
      this.movePlayerToward(this.player.destination, 160, dt);
    }

    this.updateRegionFromPosition();

    for (const monster of this.monsters) this.updateMonster(monster, dt);
    this.updateBoss(dt);
  }

  private updateRegionFromPosition(): void {
    const { x, y } = this.player;
    let next: RegionId;
    if (x < 0) next = 'mistwood';
    else if (x > MAP_WIDTH * 2) next = 'dungeon';
    else if (x > MAP_WIDTH) next = 'minepass';
    else if (y >= CENTRAL_WORLD_HEIGHT) next = 'moonfield';
    else next = y >= VILLAGE_TOP + 110 ? 'village' : 'solgogae';
    if (next !== this.region) this.changeRegion(next);
  }

  private changeRegion(region: RegionId): void {
    this.region = region;
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.pendingPlayerAttack = null;
    this.pendingMonsterAttacks = [];
    for (const monster of this.monsters) {
      monster.aggro = false;
      monster.aiState = 'return';
      monster.actionTimer = 0;
    }
    this.events.push({ type: 'region-changed', region });
  }

  drainEvents(): GameEvent[] {
    return this.events.splice(0);
  }

  getTarget(): MonsterState | null {
    if (!this.player.targetId) return null;
    return this.monsters.find((entry) => entry.id === this.player.targetId && entry.alive) ?? null;
  }

  getBossTarget(): BossState | null {
    return this.boss?.alive && this.player.targetId === this.boss.id ? this.boss : null;
  }

  private updateBossTargetCombat(target: BossState, dt: number): void {
    const distance = this.distance(this.player, target);
    this.player.facing = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    if (distance > this.attackRange) {
      this.movePlayerToward(target, 150, dt, this.attackRange - 12);
      return;
    }
    if (this.player.attackCooldown > 0 || this.pendingPlayerAttack) return;
    const critical = Math.random() < 0.14;
    const style = this.equipment.weapon ? 'weapon' : 'fist';
    const rawDamage = this.getAttackPower() + Math.floor(Math.random() * 6);
    const damage = critical ? Math.round(rawDamage * 1.6) : rawDamage;
    this.player.attackCooldown = style === 'weapon' ? 0.64 : 0.52;
    this.pendingPlayerAttack = { targetId: target.id, damage, critical, impactAt: this.elapsed + (style === 'weapon' ? 0.24 : 0.18), style };
    this.events.push({ type: 'player-attack', targetId: target.id, style });
  }

  private updateTargetCombat(target: MonsterState, dt: number): void {
    const distance = this.distance(this.player, target);
    this.player.facing = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    if (distance > this.attackRange) {
      this.movePlayerToward(target, 150, dt, this.attackRange - 12);
      return;
    }
    if (this.player.attackCooldown > 0 || this.pendingPlayerAttack) return;

    const critical = Math.random() < 0.14;
    const style = this.equipment.weapon ? 'weapon' : 'fist';
    const rawDamage = this.getAttackPower() + Math.floor(Math.random() * 6);
    const damage = critical ? Math.round(rawDamage * 1.6) : rawDamage;
    this.player.attackCooldown = style === 'weapon' ? 0.64 : 0.52;
    this.pendingPlayerAttack = { targetId: target.id, damage, critical, impactAt: this.elapsed + (style === 'weapon' ? 0.24 : 0.18), style };
    this.events.push({ type: 'player-attack', targetId: target.id, style });
  }

  private updateLootCollection(dt: number): void {
    const drop = this.groundDrops.find((entry) => entry.id === this.player.lootTargetId);
    if (!drop) {
      this.player.lootTargetId = null;
      return;
    }
    this.player.facing = Math.atan2(drop.y - this.player.y, drop.x - this.player.x);
    if (this.distance(this.player, drop) > 64) {
      this.movePlayerToward(drop, 155, dt, 58);
      return;
    }
    const definition = ITEM_CATALOG[drop.itemId];
    if (this.inventory.length >= this.inventoryCapacity) {
      this.events.push({ type: 'inventory-full', itemName: definition.name });
      this.player.lootTargetId = null;
      return;
    }
    this.groundDrops.splice(this.groundDrops.indexOf(drop), 1);
    this.inventory.push({ instanceId: `item-${this.itemCounter++}`, itemId: drop.itemId });
    this.player.lootTargetId = null;
    this.events.push({ type: 'item-pickup', itemId: drop.itemId, itemName: definition.name });
  }

  private updateMonster(monster: MonsterState, dt: number): void {
    if (!monster.alive) return;
    if (monster.region !== this.region) {
      monster.aggro = false;
      monster.aiState = 'patrol';
      return;
    }
    monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);
    monster.thinkTimer = Math.max(0, monster.thinkTimer - dt);
    monster.actionTimer = Math.max(0, monster.actionTimer - dt);

    if (monster.hitStun > 0) {
      monster.aiState = 'stunned';
      monster.hitStun = Math.max(0, monster.hitStun - dt);
      monster.x += monster.knockback.x * dt;
      monster.y += monster.knockback.y * dt;
      monster.knockback.x *= Math.pow(0.035, dt);
      monster.knockback.y *= Math.pow(0.035, dt);
      this.resolveObstacleCollision(monster, 24);
      this.clampMonster(monster);
      return;
    }

    if (monster.aiState === 'attack') {
      if (monster.actionTimer > 0) return;
      monster.aiState = 'circle';
      return;
    }

    const distance = this.distance(monster, this.player);
    const leashDistance = this.distance(monster, monster.spawn);
    const isRangedSkirmisher = monster.kind === 'bandit' || monster.kind === 'moon-revenant';
    const aggroRange = isRangedSkirmisher ? 245 : monster.kind === 'boar' ? 220 : monster.kind === 'mine-golem' ? 190 : 205;

    if (!this.playerActive && monster.aggro) {
      monster.aggro = false;
      monster.aiState = 'return';
      monster.actionTimer = 0;
    }

    if (leashDistance > 360 || (monster.aggro && distance > 430)) {
      monster.aggro = false;
      monster.aiState = 'return';
      this.moveMonsterToward(monster, monster.spawn, 100, dt, 8);
      return;
    }

    const activeAggressors = this.monsters.filter((candidate) => candidate.region === this.region && candidate.alive && candidate.aggro).length;
    if (this.playerActive && !monster.aggro && distance <= aggroRange && activeAggressors < 3) {
      monster.aggro = true;
      monster.aiState = 'alert';
      monster.actionTimer = 0.22;
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({ type: 'monster-alert', monsterId: monster.id });
      return;
    }

    if (!monster.aggro) {
      this.updatePatrol(monster, dt);
      return;
    }

    if (monster.aiState === 'alert' && monster.actionTimer > 0) return;
    if (monster.kind === 'boar') this.updateBoarAi(monster, distance, dt);
    else this.updateSkirmisherAi(monster, distance, dt);
  }

  private resolvePendingPlayerAttack(): void {
    const pending = this.pendingPlayerAttack;
    if (!pending || this.elapsed < pending.impactAt) return;
    this.pendingPlayerAttack = null;
    if (this.boss?.alive && this.boss.id === pending.targetId) {
      if (this.distance(this.player, this.boss) <= this.attackRange + 24) {
        this.damageBoss(pending.damage);
        this.events.push({ type: 'player-impact', targetId: this.boss.id, damage: pending.damage, critical: pending.critical, style: pending.style });
      }
      return;
    }
    const target = this.monsters.find((monster) => monster.id === pending.targetId && monster.alive);
    if (!target || this.distance(this.player, target) > this.attackRange + 24) return;

    target.hp = Math.max(0, target.hp - pending.damage);
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const force = pending.critical ? 92 : 58;
    target.hitStun = pending.critical ? 0.18 : 0.12;
    target.knockback = { x: Math.cos(angle) * force, y: Math.sin(angle) * force };
    target.aggro = true;
    this.events.push({ type: 'player-impact', targetId: target.id, damage: pending.damage, critical: pending.critical, style: pending.style });
    if (target.hp === 0) this.killMonster(target);
  }

  private resolvePendingMonsterAttacks(): void {
    if (this.pendingMonsterAttacks.length === 0) return;
    const due = this.pendingMonsterAttacks.filter((pending) => this.elapsed >= pending.impactAt);
    this.pendingMonsterAttacks = this.pendingMonsterAttacks.filter((pending) => this.elapsed < pending.impactAt);

    for (const pending of due) {
      if (this.player.hp <= 0) break;
      const monster = this.monsters.find((entry) => entry.id === pending.monsterId);
      if (!monster?.alive || monster.hitStun > 0 || monster.aiState !== 'attack') continue;
      if (this.distance(monster, this.player) > pending.impactRange) continue;

      const evaded = this.getEvasion() > 3 && Math.random() < Math.min(0.22, (this.getEvasion() - 3) / 100);
      if (evaded) continue;
      const damage = Math.max(1, pending.damage - this.getDefense());
      this.player.hp = Math.max(0, this.player.hp - damage);
      const distance = Math.max(1, this.distance(monster, this.player));
      this.player.x += ((this.player.x - monster.x) / distance) * pending.knockbackForce;
      this.player.y += ((this.player.y - monster.y) / distance) * pending.knockbackForce;
      const clamped = this.clampPlayerPoint(this.player);
      this.player.x = clamped.x;
      this.player.y = clamped.y;
      this.events.push({ type: 'player-hit', damage });
      if (this.player.hp === 0) this.defeatPlayer();
    }
  }

  private updatePatrol(monster: MonsterState, dt: number): void {
    monster.aiState = 'patrol';
    if (monster.thinkTimer <= 0 || this.distance(monster, monster.patrolTarget) < 9) {
      const index = Number(monster.id.split('-').at(-1));
      const angle = this.elapsed * 0.37 + index * 2.19;
      const radius = 28 + (index % 3) * 10;
      monster.patrolTarget = {
        x: monster.spawn.x + Math.cos(angle) * radius,
        y: monster.spawn.y + Math.sin(angle) * radius * 0.72,
      };
      monster.thinkTimer = 2.4 + (index % 4) * 0.38;
    }
    this.moveMonsterToward(monster, monster.patrolTarget, 28, dt, 5);
  }

  private updateBoarAi(monster: MonsterState, distance: number, dt: number): void {
    if (monster.aiState === 'telegraph') {
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      if (monster.actionTimer <= 0) {
        monster.aiState = 'charge';
        monster.actionTimer = 0.62;
        monster.chargeDirection = { x: Math.cos(monster.facing), y: Math.sin(monster.facing) };
      }
      return;
    }

    if (monster.aiState === 'charge') {
      monster.x += monster.chargeDirection.x * 220 * dt;
      monster.y += monster.chargeDirection.y * 220 * dt;
      if (this.resolveObstacleCollision(monster, 26)) {
        monster.aiState = 'circle';
        monster.actionTimer = 0;
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.65);
        return;
      }
      this.clampMonster(monster);
      if (distance <= 72) {
        this.performMonsterAttack(monster, 1.65, 18);
        return;
      }
      if (monster.actionTimer <= 0) {
        monster.aiState = 'circle';
        monster.attackCooldown = Math.max(monster.attackCooldown, 0.65);
      }
      return;
    }

    if (monster.attackCooldown <= 0 && distance < 170) {
      monster.aiState = 'telegraph';
      monster.actionTimer = 0.34;
      monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      this.events.push({ type: 'monster-charge', monsterId: monster.id });
      return;
    }

    if (distance > 92) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, this.player, 96, dt, 82);
    } else {
      this.circlePlayer(monster, 105, 72, dt);
    }
  }

  private updateSkirmisherAi(monster: MonsterState, distance: number, dt: number): void {
    const isRangedSkirmisher = monster.kind === 'bandit' || monster.kind === 'moon-revenant';
    const attackRange = isRangedSkirmisher ? 94 : monster.kind === 'mine-golem' ? 88 : 76;
    const preferredRange = isRangedSkirmisher ? 108 : monster.kind === 'mine-golem' ? 96 : 88;
    if (distance <= attackRange && monster.attackCooldown <= 0) {
      this.performMonsterAttack(monster, isRangedSkirmisher ? 1.55 : monster.kind === 'mine-golem' ? 1.9 : 1.72, isRangedSkirmisher ? 12 : monster.kind === 'mine-golem' ? 16 : 9);
      return;
    }
    if (distance > preferredRange + 16) {
      monster.aiState = 'chase';
      this.moveMonsterToward(monster, this.player, isRangedSkirmisher ? 74 : monster.kind === 'mine-golem' ? 58 : 82, dt, preferredRange);
    } else {
      this.circlePlayer(monster, preferredRange, isRangedSkirmisher ? 70 : monster.kind === 'mine-golem' ? 44 : 62, dt);
    }
  }

  private circlePlayer(monster: MonsterState, radius: number, speed: number, dt: number): void {
    monster.aiState = 'circle';
    const index = Number(monster.id.split('-').at(-1));
    const angle = Math.atan2(monster.y - this.player.y, monster.x - this.player.x);
    const direction = index % 2 === 0 ? 1 : -1;
    const targetAngle = angle + direction * 0.62;
    const target = {
      x: this.player.x + Math.cos(targetAngle) * radius,
      y: this.player.y + Math.sin(targetAngle) * radius,
    };
    this.moveMonsterToward(monster, target, speed, dt, 5);
  }

  private performMonsterAttack(monster: MonsterState, cooldown: number, knockbackForce: number): void {
    if (this.pendingMonsterAttacks.some((pending) => pending.monsterId === monster.id)) return;
    monster.aiState = 'attack';
    monster.actionTimer = 0.46;
    monster.attackCooldown = cooldown;
    monster.facing = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
    const impactRange = monster.kind === 'bandit' || monster.kind === 'moon-revenant' ? 118 : monster.kind === 'boar' ? 98 : monster.kind === 'mine-golem' ? 112 : 100;
    this.pendingMonsterAttacks.push({
      monsterId: monster.id,
      damage: monster.damage,
      impactAt: this.elapsed + 0.22,
      knockbackForce,
      impactRange,
    });
    this.events.push({ type: 'monster-attack', monsterId: monster.id, damage: monster.damage });
  }

  private updateBoss(dt: number): void {
    const boss = this.boss;
    const definition = boss ? bossForFloor(boss.floor) : null;
    if (!boss?.alive || !definition || this.region !== 'dungeon' || !this.playerActive || this.player.hp <= 0) return;
    const commands = this.bossController.update(boss, definition, this.player, dt);
    for (const command of commands) {
      if (command.type === 'telegraph') {
        this.events.push({ type: 'boss-telegraph', bossId: boss.id, patternId: command.patternId, origin: command.origin, facing: command.facing });
        continue;
      }
      if (command.type !== 'impact') continue;
      this.events.push({ type: 'boss-impact', bossId: boss.id, patternId: command.patternId, origin: command.origin, facing: command.facing });
      const pattern = definition.patterns.find((entry) => entry.id === command.patternId);
      if (!pattern || !containsPatternPoint(pattern.shape, command.origin, command.facing, this.player)) continue;
      const damage = Math.max(1, Math.round(boss.damage * pattern.damageMultiplier) - this.getDefense());
      this.player.hp = Math.max(0, this.player.hp - damage);
      this.events.push({ type: 'player-hit', damage });
      if (this.player.hp === 0) this.defeatPlayer();
    }
  }

  private killBoss(boss: BossState): void {
    this.player.targetId = null;
    this.pendingPlayerAttack = null;
    this.dungeonStairLocked = false;
    this.player.kills += 1;
    this.player.xp += boss.floor * 12;
    this.player.gold += boss.floor * 8;
    this.events.push({ type: 'boss-killed', bossId: boss.id, name: boss.name, floor: boss.floor });
    this.events.push({ type: 'dungeon-stair-lock-changed', locked: false });
    if (boss.floor === MAX_DUNGEON_FLOOR && !this.dungeonComplete) {
      this.dungeonComplete = true;
      this.events.push({ type: 'dungeon-complete' });
    }
  }

  private defeatPlayer(): void {
    this.defeatedInDungeon = this.region === 'dungeon';
    this.player.targetId = null;
    this.player.lootTargetId = null;
    this.player.destination = null;
    this.pendingPlayerAttack = null;
    this.pendingMonsterAttacks = [];
    this.playerRespawnAt = this.elapsed + 3;
    this.events.push({ type: 'player-defeated' });
  }

  private moveMonsterToward(monster: MonsterState, target: Vec2, speed: number, dt: number, stopDistance: number): void {
    let dx = target.x - monster.x;
    let dy = target.y - monster.y;
    for (const other of this.monsters) {
      if (other === monster || !other.alive) continue;
      const ox = monster.x - other.x;
      const oy = monster.y - other.y;
      const d = Math.hypot(ox, oy);
      if (d > 0 && d < 76) {
        const weight = (76 - d) / 76;
        dx += (ox / d) * 72 * weight;
        dy += (oy / d) * 72 * weight;
      }
    }
    const distance = Math.hypot(dx, dy);
    if (distance <= stopDistance || distance === 0) return;
    monster.facing = Math.atan2(dy, dx);
    const travel = Math.min(distance - stopDistance, speed * dt);
    monster.x += (dx / distance) * travel;
    monster.y += (dy / distance) * travel;
    this.resolveObstacleCollision(monster, 24);
    this.clampMonster(monster);
  }

  private clampMonster(monster: MonsterState): void {
    const origin = REGION_ORIGINS[monster.region];
    monster.x = Math.max(origin.x + 220, Math.min(origin.x + 1320, monster.x));
    monster.y = Math.max(origin.y + 235, Math.min(origin.y + 865, monster.y));
  }

  private killMonster(monster: MonsterState): void {
    monster.alive = false;
    monster.respawnAt = this.elapsed + 7;
    this.pendingMonsterAttacks = this.pendingMonsterAttacks.filter((pending) => pending.monsterId !== monster.id);
    this.player.targetId = null;
    this.player.kills += 1;
    const xp = 28 + monster.level * 3;
    const gold = 8 + Math.floor(Math.random() * 15);
    this.player.xp += xp;
    this.player.gold += gold;
    this.events.push({ type: 'monster-killed', monsterId: monster.id, name: monster.name, xp, gold });
    if (!this.questCompleted && this.player.kills >= 8) {
      this.questCompleted = true;
      this.player.gold += 240;
      this.events.push({ type: 'quest-complete', gold: 240 });
    }
    this.dropItem(monster);
    if (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext;
      this.player.level += 1;
      this.player.xpToNext = Math.round(this.player.xpToNext * 1.34);
      this.player.maxHp += 24;
      this.player.hp = this.player.maxHp;
      this.events.push({ type: 'level-up', level: this.player.level });
    }
  }

  private dropItem(monster: MonsterState): void {
    let itemId: ItemId;
    if (!this.droppedStarterWeapon) {
      itemId = 'worn-hwando';
      this.droppedStarterWeapon = true;
    } else if (monster.kind === 'bandit') {
      itemId = Math.random() < 0.18 ? 'warden-durumagi' : 'hunter-durumagi';
    } else if (monster.kind === 'boar') {
      itemId = Math.random() < 0.14 ? 'silver-tiger-charm' : 'boar-tusk-charm';
    } else {
      const roll = Math.random();
      itemId = roll < 0.12 ? 'moonsteel-hwando' : roll < 0.56 ? 'dokkaebi-club' : 'boar-tusk-charm';
    }
    const drop: GroundDrop = {
      id: `drop-${this.dropCounter++}`,
      itemId,
      x: monster.x,
      y: monster.y - 4,
    };
    this.groundDrops.push(drop);
    this.events.push({ type: 'item-drop', dropId: drop.id, itemId, itemName: ITEM_CATALOG[itemId].name });
  }

  private getEquipmentAttackBonus(): number {
    return (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.attackBonus ?? 0);
    }, 0);
  }

  private getEquipmentStatBonus(stat: 'defenseBonus' | 'accuracyBonus' | 'evasionBonus'): number {
    return (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.[stat] ?? 0);
    }, 0);
  }

  private getSetPieceCount(): number {
    return (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.setId === ITEM_SET.id ? 1 : 0);
    }, 0);
  }

  private getSetBonus(stat: 'attack' | 'hp' | 'defense'): number {
    const pieces = this.getSetPieceCount();
    return ITEM_SET.bonuses.reduce((total, bonus) => total + (pieces >= bonus.pieces ? bonus[stat] : 0), 0);
  }

  private getEquipmentHpBonus(): number {
    const equipmentBonus = (Object.keys(this.equipment) as EquipmentSlot[]).reduce((total, slot) => {
      return total + (this.getEquippedDefinition(slot)?.hpBonus ?? 0);
    }, 0);
    return equipmentBonus + this.getSetBonus('hp');
  }

  private respawnMonsters(): void {
    for (const monster of this.monsters) {
      if (monster.alive || this.elapsed < monster.respawnAt) continue;
      monster.alive = true;
      monster.hp = monster.maxHp;
      monster.x = monster.spawn.x;
      monster.y = monster.spawn.y;
      monster.aggro = false;
      monster.aiState = 'patrol';
      monster.actionTimer = 0;
      monster.hitStun = 0;
      monster.knockback = { x: 0, y: 0 };
      this.events.push({ type: 'monster-respawn', monsterId: monster.id });
    }
  }

  private respawnPlayer(): void {
    this.player.hp = this.player.maxHp;
    if (this.defeatedInDungeon) {
      this.player.x = REGION_ORIGINS.minepass.x + 770;
      this.player.y = REGION_ORIGINS.minepass.y + 300;
      if (this.boss) this.events.push({ type: 'boss-reset', floor: this.boss.floor });
      this.boss = null;
      this.dungeonFloor = 0;
      this.dungeonLayout = null;
      this.dungeonObstacles = [];
      this.dungeonStairLocked = false;
      this.changeRegion('minepass');
    } else {
      this.player.x = 765;
      this.player.y = 680;
    }
    this.player.facing = -Math.PI / 2;
    this.player.lootTargetId = null;
    this.player.dodgeCooldown = 0;
    this.playerRespawnAt = 0;
    this.playerActive = false;
    this.pendingMonsterAttacks = [];
    this.defeatedInDungeon = false;
    for (const monster of this.monsters) {
      monster.aggro = false;
      monster.aiState = 'return';
      monster.actionTimer = 0;
      monster.attackCooldown = Math.max(monster.attackCooldown, 1.2);
    }
    this.events.push({ type: 'player-respawn' });
  }

  private movePlayerToward(target: Vec2, speed: number, dt: number, stopDistance = 5): void {
    const facing = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const reached = this.moveEntityToward(this.player, target, speed, dt, stopDistance);
    this.resolveObstacleCollision(this.player, 20);
    const clamped = this.clampToField(this.player);
    this.player.x = clamped.x;
    this.player.y = clamped.y;
    this.player.facing = facing;
    if (reached && this.player.destination) this.player.destination = null;
  }

  private moveEntityToward(entity: Vec2, target: Vec2, speed: number, dt: number, stopDistance: number): boolean {
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= stopDistance) return true;
    const travel = Math.min(distance - stopDistance, speed * dt);
    entity.x += (dx / distance) * travel;
    entity.y += (dy / distance) * travel;
    return distance - travel <= stopDistance;
  }

  private clampPlayerPoint(point: Vec2): Vec2 {
    const clamped = this.clampToField(point);
    this.resolveObstacleCollision(clamped, 20);
    return this.clampToField(clamped);
  }

  private resolveObstacleCollision(entity: Vec2, bodyRadius: number): boolean {
    let collided = false;
    for (const obstacle of [...FIELD_OBSTACLES, ...this.dungeonObstacles]) {
      if (obstacle.type === 'box') {
        const halfWidth = obstacle.width / 2 + bodyRadius;
        const halfHeight = obstacle.height / 2 + bodyRadius;
        const localX = entity.x - obstacle.x;
        const localY = entity.y - obstacle.y;
        if (Math.abs(localX) >= halfWidth || Math.abs(localY) >= halfHeight) continue;
        collided = true;
        const overlapX = halfWidth - Math.abs(localX);
        const overlapY = halfHeight - Math.abs(localY);
        if (overlapX < overlapY) entity.x = obstacle.x + (localX < 0 ? -halfWidth : halfWidth);
        else entity.y = obstacle.y + (localY < 0 ? -halfHeight : halfHeight);
        continue;
      }
      let dx = entity.x - obstacle.x;
      let dy = entity.y - obstacle.y;
      let distance = Math.hypot(dx, dy);
      const minimumDistance = obstacle.radius + bodyRadius;
      if (distance >= minimumDistance) continue;
      collided = true;
      if (distance < 0.001) {
        dx = 0;
        dy = 1;
        distance = 1;
      }
      entity.x = obstacle.x + (dx / distance) * minimumDistance;
      entity.y = obstacle.y + (dy / distance) * minimumDistance;
    }
    return collided;
  }

  private clampToField(point: Vec2): Vec2 {
    const villageGateTop = VILLAGE_TOP + 390;
    const villageGateBottom = VILLAGE_TOP + 570;
    const southGateLeft = 630;
    const southGateRight = 910;

    if (point.x < 0) {
      return {
        x: Math.max(-MAP_WIDTH + 230, Math.min(0, point.x)),
        y: Math.max(VILLAGE_TOP + 230, Math.min(VILLAGE_TOP + MAP_HEIGHT - 174, point.y)),
      };
    }
    if (point.x > MAP_WIDTH * 2) {
      return {
        x: Math.max(MAP_WIDTH * 2 + 230, Math.min(MAP_WIDTH * 3 - 230, point.x)),
        y: Math.max(235, Math.min(865, point.y)),
      };
    }
    if (point.x > MAP_WIDTH) {
      return {
        x: Math.max(MAP_WIDTH, Math.min(MAP_WIDTH * 2 - 230, point.x)),
        y: Math.max(VILLAGE_TOP + 230, Math.min(VILLAGE_TOP + MAP_HEIGHT - 174, point.y)),
      };
    }
    if (point.y >= CENTRAL_WORLD_HEIGHT) {
      return {
        x: Math.max(230, Math.min(1310, point.x)),
        y: Math.max(CENTRAL_WORLD_HEIGHT, Math.min(CENTRAL_WORLD_HEIGHT + MAP_HEIGHT - 174, point.y)),
      };
    }

    let x = Math.max(230, Math.min(1310, point.x));
    let y = Math.max(250, Math.min(CENTRAL_WORLD_HEIGHT, point.y));
    if (point.x < 230 && y >= villageGateTop && y <= villageGateBottom) x = Math.max(0, point.x);
    if (point.x > 1310 && y >= villageGateTop && y <= villageGateBottom) x = Math.min(MAP_WIDTH, point.x);
    if (point.y > VILLAGE_TOP + 846 && x >= southGateLeft && x <= southGateRight) y = Math.min(CENTRAL_WORLD_HEIGHT, point.y);
    return { x, y };
  }

  private distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
