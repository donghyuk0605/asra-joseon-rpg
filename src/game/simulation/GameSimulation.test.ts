import { describe, expect, it, vi } from 'vitest';
import { GameSimulation } from './GameSimulation';
import type { FollowerAttackKind, FollowerKind, FollowerState } from './types';
import { CENTRAL_WORLD_HEIGHT, MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS, VILLAGE_TOP } from '../world/layout';
import { ULLEUNG_REGION_IDS, ulleungRoadCenterAtY } from '../world/ulleungContinuity';
import { ULLEUNG_EDGE_TREE_SITES } from '../world/treeSpecies';
import { worldTerrainSeamBetween } from '../world/worldContinuity';
import { VILLAGE_FARM_PLOTS } from '../world/villageFarm';
import { EPISODE2_REGION_IDS } from '../world/regions';

const isIslandGuard = (kind: string) => ['ulleung-guard', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain'].includes(kind);

describe('GameSimulation', () => {
  const advanceTo = (game: GameSimulation, floor: number) => {
    game.enterDungeon();
    while (game.dungeonFloor < floor) game.advanceDungeonFloor();
  };

  const moveHajinToFrontier = (game: GameSimulation): void => {
    expect(game.completeJurchenUnificationForPlaytest()).toBe(true);
    game.drainEvents();
    game.travelToCampaignRegion('manchufrontier', 'north');
  };

  it('spawns one locked boss encounter on floor ten', () => {
    const game = new GameSimulation(); advanceTo(game, 10);
    expect(game.boss?.bossId).toBe('chain-miner');
    expect(game.monsters.filter((monster)=>monster.region==='dungeon'&&monster.alive)).toHaveLength(0);
    game.advanceDungeonFloor();
    expect(game.dungeonFloor).toBe(10);
    expect(game.highestBossCheckpoint).toBe(10);
  });

  it('unlocks the next floor after killing the boss', () => {
    const game = new GameSimulation(); advanceTo(game,10);
    game.damageBoss(Number.MAX_SAFE_INTEGER);
    game.advanceDungeonFloor();
    expect(game.dungeonFloor).toBe(11);
  });

  it('reenters at the most recently reached boss checkpoint', () => {
    const game = new GameSimulation(); advanceTo(game,10); game.leaveDungeon(); game.enterDungeon();
    expect(game.dungeonFloor).toBe(10);
  });
  it('enters a deterministic dungeon and advances its floor roster', () => {
    const game = new GameSimulation();
    game.enterDungeon();
    expect(game.region).toBe('dungeon');
    expect(game.dungeonFloor).toBe(1);
    expect(game.monsters.filter((monster) => monster.region === 'dungeon')).toHaveLength(6);
    const floorOneHp = game.monsters.find((monster) => monster.region === 'dungeon')!.maxHp;
    for (let index = 0; index < 9; index += 1) game.advanceDungeonFloor();
    expect(game.dungeonFloor).toBe(10);
    expect(game.dungeonLayout?.pattern).toBe('sanctum');
    expect(game.boss?.maxHp).toBeGreaterThan(floorOneHp);
    expect(game.boss?.name).toContain('광부');
  });

  it('returns from the dungeon to the mine pass', () => {
    const game = new GameSimulation();
    game.enterDungeon();
    game.leaveDungeon();
    expect(game.region).toBe('minepass');
    expect(game.dungeonFloor).toBe(0);
    expect(game.dungeonLayout).toBeNull();
  });

  it('moves the player toward a clicked field point', () => {
    const game = new GameSimulation();
    const startX = game.player.x;
    game.moveTo({ x: 1000, y: 700 });
    game.update(0.2);
    expect(game.player.x).toBeGreaterThan(startX);
  });

  it('moves south and keeps the player facing down', () => {
    const game = new GameSimulation();
    const startY = game.player.y;
    game.moveTo({ x: game.player.x, y: startY + 120 });
    for (let index = 0; index < 5; index += 1) game.update(0.05);
    expect(game.player.y).toBeGreaterThan(startY);
    expect(game.player.facing).toBeCloseTo(Math.PI / 2);
  });

  it('moves west and keeps the player facing left', () => {
    const game = new GameSimulation();
    const startX = game.player.x;
    game.moveTo({ x: startX - 120, y: game.player.y });
    for (let index = 0; index < 5; index += 1) game.update(0.05);
    expect(game.player.x).toBeLessThan(startX);
    expect(game.player.facing).toBeCloseTo(Math.PI);
  });

  it('moves north and keeps the player facing up', () => {
    const game = new GameSimulation();
    const startY = game.player.y;
    game.moveTo({ x: game.player.x, y: startY - 120 });
    for (let index = 0; index < 5; index += 1) game.update(0.05);
    expect(game.player.y).toBeLessThan(startY);
    expect(game.player.facing).toBeCloseTo(-Math.PI / 2);
  });

  it('projects clicks inside the stream onto the walkable shoreline', () => {
    const game = new GameSimulation();
    game.moveTo({ x: 365, y: 270 });
    expect(game.player.destination).not.toBeNull();
    const destination = game.player.destination!;
    expect(Math.abs(destination.x - 365) >= 170 || Math.abs(destination.y - 270) >= 60).toBe(true);
  });

  it('keeps the player body outside the central rock shelf', () => {
    const game = new GameSimulation();
    game.player.x = 620;
    game.player.y = 270;
    game.moveTo({ x: 700, y: 250 });
    for (let index = 0; index < 30; index += 1) game.update(0.05);
    expect(Math.hypot(game.player.x - 700, game.player.y - 250)).toBeGreaterThanOrEqual(65 - 0.01);
  });

  it('keeps basic movement responsive during attack cooldown', () => {
    const game = new GameSimulation();
    const startX = game.player.x;
    game.player.attackCooldown = 0.8;

    game.moveTo({ x: startX + 120, y: game.player.y });
    game.update(0.05);

    expect(game.player.x).toBeGreaterThan(startX);
    expect(game.player.destination).not.toBeNull();
  });

  it('lets ground movement cancel a queued bare-fist strike', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    game.selectMonster(monster.id);
    game.update(0.05);
    expect(game.drainEvents()).toContainEqual({ type: 'player-attack', targetId: monster.id, style: 'fist' });

    const hpBefore = monster.hp;
    const startX = game.player.x;
    game.moveTo({ x: startX - 120, y: game.player.y });
    game.update(0.2);

    expect(game.player.x).toBeLessThan(startX);
    expect(monster.hp).toBe(hpBefore);
    vi.restoreAllMocks();
  });

  it('does not use a weapon attack for a stale equipment id without an inventory item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    game.equipment.weapon = 'missing-weapon';
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    game.selectMonster(monster.id);
    game.update(0.05);

    expect(game.drainEvents()).toContainEqual({ type: 'player-attack', targetId: monster.id, style: 'fist' });
    vi.restoreAllMocks();
  });

  it('continues chasing a selected monster while attack cooldown is cooling down', () => {
    const game = new GameSimulation();
    const monster = game.monsters[2];
    game.player.x = monster.x - 260;
    game.player.y = monster.y;
    game.player.attackCooldown = 0.7;
    game.selectMonster(monster.id);

    const startX = game.player.x;
    game.update(0.05);

    expect(game.player.x).toBeGreaterThan(startX);
    expect(game.player.targetId).toBe(monster.id);
  });

  it('clears a stale target immediately when the target belongs to another region', () => {
    const game = new GameSimulation();
    const monster = game.monsters.find((entry) => entry.region === game.region && entry.alive)!;
    game.selectMonster(monster.id);
    expect(game.getTarget()?.id).toBe(monster.id);

    game.region = 'village';
    expect(game.getTarget()).toBeNull();
    game.update(0.05);

    expect(game.player.targetId).toBeNull();
  });

  it('ignores movement commands while the player is defeated', () => {
    const game = new GameSimulation();
    game.player.hp = 0;
    game.moveTo({ x: 1000, y: 700 });
    expect(game.player.destination).toBeNull();
  });

  it('selects and damages a nearby monster through auto attack', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    game.player.x = monster.x - 80;
    game.player.y = monster.y;
    game.selectMonster(monster.id);
    for (let index = 0; index < 7; index += 1) game.update(0.05);
    expect(monster.hp).toBeLessThan(monster.maxHp);
    const events = game.drainEvents();
    expect(events.some((event) => event.type === 'player-attack')).toBe(true);
    expect(events.some((event) => event.type === 'player-impact')).toBe(true);
    vi.restoreAllMocks();
  });

  it('delays damage until the sword reaches its impact frame', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[1];
    game.player.x = monster.x;
    game.player.y = monster.y + 80;
    game.selectMonster(monster.id);
    game.update(0.05);
    expect(monster.hp).toBe(monster.maxHp);
    expect(game.drainEvents().some((event) => event.type === 'player-attack')).toBe(true);
    for (let index = 0; index < 5; index += 1) game.update(0.05);
    expect(monster.hp).toBeLessThan(monster.maxHp);
    expect(game.drainEvents().some((event) => event.type === 'player-impact')).toBe(true);
    vi.restoreAllMocks();
  });

  it('builds basic attacks into a three-step chain with a heavy finisher', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[1];
    game.inventory.push({ instanceId: 'chain-weapon', itemId: 'worn-hwando' });
    game.equipment.weapon = 'chain-weapon';
    monster.hp = 1_000;
    monster.maxHp = 1_000;
    monster.attackCooldown = 999;
    game.player.x = monster.x - 72;
    game.player.y = monster.y;
    game.selectMonster(monster.id);

    const steps: number[] = [];
    const finishers: Array<{ targets: number; damage: number }> = [];
    for (let index = 0; index < 90 && finishers.length === 0; index += 1) {
      game.update(0.05);
      for (const event of game.drainEvents()) {
        if (event.type === 'player-impact') steps.push(event.step);
        if (event.type === 'basic-finisher') finishers.push({ targets: event.targets, damage: event.damage });
      }
    }

    expect(steps.slice(0, 3)).toEqual([1, 2, 3]);
    expect(finishers).toHaveLength(1);
    expect(finishers[0].damage).toBeGreaterThan(game.getAttackPower());
    expect(game.player.momentum).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('lets the third weapon strike stagger nearby enemies with a shockwave', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const target = game.monsters[1];
    const bystander = game.monsters[2];
    for (const monster of game.monsters.filter((entry) => entry.region === game.region)) {
      monster.alive = monster === target || monster === bystander;
    }
    game.inventory.push({ instanceId: 'shockwave-weapon', itemId: 'worn-hwando' });
    game.equipment.weapon = 'shockwave-weapon';
    target.hp = 1_000;
    target.maxHp = 1_000;
    target.attackCooldown = 999;
    bystander.hp = 1_000;
    bystander.maxHp = 1_000;
    bystander.attackCooldown = 999;
    bystander.x = target.x + 28;
    bystander.y = target.y + 6;
    game.player.x = target.x - 72;
    game.player.y = target.y;
    game.selectMonster(target.id);

    let finisherTargets = 0;
    for (let index = 0; index < 90 && finisherTargets === 0; index += 1) {
      game.update(0.05);
      for (const event of game.drainEvents()) {
        if (event.type === 'basic-finisher') finisherTargets = event.targets;
      }
    }

    expect(finisherTargets).toBeGreaterThanOrEqual(2);
    expect(bystander.hp).toBeLessThan(bystander.maxHp);
    expect(bystander.hitStun).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('uses a potion without overhealing', () => {
    const game = new GameSimulation();
    game.player.hp = game.player.maxHp - 20;
    game.usePotion();
    expect(game.player.hp).toBe(game.player.maxHp);
    expect(game.player.potions).toBe(2);
  });

  it('keeps distant monsters from attacking an idle player', () => {
    const game = new GameSimulation();
    for (let index = 0; index < 200; index += 1) game.update(0.05);
    expect(game.player.hp).toBe(game.player.maxHp);
  });

  it('patrols around spawn before acquiring the player', () => {
    const game = new GameSimulation();
    const monster = game.monsters[2];
    const start = { x: monster.x, y: monster.y };
    for (let index = 0; index < 30; index += 1) game.update(0.05);
    expect(monster.aiState).toBe('patrol');
    expect(Math.hypot(monster.x - start.x, monster.y - start.y)).toBeGreaterThan(1);
  });

  it('accelerates and turns monsters gradually instead of snapping their motion', () => {
    const game = new GameSimulation();
    const monster = game.monsters[2];
    const moveMonsterToward = (game as unknown as {
      moveMonsterToward: (monster: typeof game.monsters[number], target: { x: number; y: number }, speed: number, dt: number, stopDistance: number) => void;
    }).moveMonsterToward.bind(game);
    monster.facing = Math.PI;
    const target = { x: monster.x + 300, y: monster.y };

    moveMonsterToward(monster, target, 90, 0.05, 8);
    const firstSpeed = Math.hypot(monster.velocity.x, monster.velocity.y);
    expect(firstSpeed).toBeGreaterThan(0);
    expect(firstSpeed).toBeLessThan(90);
    expect(Math.abs(monster.facing - Math.PI)).toBeLessThanOrEqual(7.2 * 0.05 + 0.001);

    for (let index = 0; index < 8; index += 1) moveMonsterToward(monster, target, 90, 0.05, 8);
    expect(Math.hypot(monster.velocity.x, monster.velocity.y)).toBeGreaterThan(firstSpeed);
  });

  it('pauses briefly at a patrol point and settles to an idle velocity', () => {
    const game = new GameSimulation();
    const monster = game.monsters[2];
    const updatePatrol = (game as unknown as {
      updatePatrol: (monster: typeof game.monsters[number], dt: number) => void;
    }).updatePatrol.bind(game);
    monster.patrolTarget = { x: monster.x, y: monster.y };
    monster.velocity = { x: 20, y: 0 };
    monster.actionTimer = 0;

    updatePatrol(monster, 0.05);
    expect(monster.actionTimer).toBeGreaterThan(0);
    const slowedSpeed = Math.hypot(monster.velocity.x, monster.velocity.y);
    expect(slowedSpeed).toBeLessThan(20);
    for (let index = 0; index < 12; index += 1) {
      monster.actionTimer = Math.max(0, monster.actionTimer - 0.05);
      updatePatrol(monster, 0.05);
    }
    expect(Math.hypot(monster.velocity.x, monster.velocity.y)).toBeLessThan(1);
  });

  it('telegraphs before a boar charge', () => {
    const game = new GameSimulation();
    const boar = game.monsters.find((monster) => monster.kind === 'boar')!;
    for (const monster of game.monsters) {
      if (monster !== boar) { monster.alive = false; monster.respawnAt = Number.POSITIVE_INFINITY; }
    }
    boar.attackCooldown = 0;
    game.player.x = boar.x + 130;
    game.player.y = boar.y;
    game.moveTo({ x: boar.x + 130, y: boar.y });
    for (let index = 0; index < 7; index += 1) game.update(0.05);
    expect(game.drainEvents().some((event) => event.type === 'monster-charge')).toBe(true);
  });

  it('alerts the authored gray-wolf pair at its real spawn spacing and gives each wolf a real pounce sequence', () => {
    const game = new GameSimulation('songhuahunt');
    const [leadWolf, packWolf] = game.monsters.filter((monster) =>
      monster.region === 'songhuahunt' && monster.kind === 'korean-gray-wolf');
    const internals = game as unknown as {
      alertTacticalSquad: (monster: typeof leadWolf) => void;
      updateWolfAi: (monster: typeof leadWolf, distance: number, dt: number) => void;
    };
    expect(Math.hypot(packWolf.x - leadWolf.x, packWolf.y - leadWolf.y)).toBe(495);
    game.player.x = leadWolf.x + 145;
    game.player.y = leadWolf.y;

    internals.alertTacticalSquad(leadWolf);
    expect(packWolf.aggro).toBe(true);
    expect(packWolf.aiState).toBe('alert');

    leadWolf.attackCooldown = 0;
    internals.updateWolfAi(leadWolf, 145, 0.05);
    expect(leadWolf.aiState).toBe('telegraph');
    expect(game.drainEvents()).toContainEqual({ type: 'monster-charge', monsterId: leadWolf.id });
    leadWolf.actionTimer = 0;
    internals.updateWolfAi(leadWolf, 145, 0.05);
    expect(leadWolf.aiState).toBe('charge');
  });

  it('assigns deterministic tactical roles, slots, and opening cooldowns', () => {
    const first = new GameSimulation('yeongwolhq');
    const second = new GameSimulation('yeongwolhq');
    const firstRoster = first.monsters
      .filter((monster) => monster.region === 'yeongwolhq')
      .map(({ id, tacticalRole, tacticSlot, attackCooldown }) => ({
        id, tacticalRole, tacticSlot, attackCooldown,
      }));
    const secondRoster = second.monsters
      .filter((monster) => monster.region === 'yeongwolhq')
      .map(({ id, tacticalRole, tacticSlot, attackCooldown }) => ({
        id, tacticalRole, tacticSlot, attackCooldown,
      }));

    expect(secondRoster).toEqual(firstRoster);
    expect(new Set(firstRoster.map((monster) => monster.tacticalRole))).toEqual(
      new Set(['melee', 'spearman', 'ranged', 'leader']),
    );
  });

  it('uses stable opposite flank lanes instead of stacking melee soldiers on one point', () => {
    const game = new GameSimulation('yeongwolhq');
    const swordsmen = game.monsters
      .filter((monster) => monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-swordsman');
    const left = swordsmen.find((monster) => monster.tacticSlot % 2 === 0)!;
    const right = swordsmen.find((monster) => monster.tacticSlot % 2 === 1)!;
    const updateSoldier = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof left, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);
    game.player.x = REGION_ORIGINS.yeongwolhq.x + 768;
    game.player.y = REGION_ORIGINS.yeongwolhq.y + 520;
    left.x = right.x = game.player.x - 180;
    left.y = right.y = game.player.y;

    updateSoldier(left, 180, 0.12);
    updateSoldier(right, 180, 0.12);

    expect(left.velocity.y * right.velocity.y).toBeLessThan(0);
    expect(Math.abs(left.y - right.y)).toBeGreaterThan(1);
  });

  it('keeps spearmen at haft distance and rejects impacts behind their facing arc', () => {
    const game = new GameSimulation('yeongwolhq');
    const spear = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-spearman')!;
    const internals = game as unknown as {
      updateUlleungGuardAi: (monster: typeof spear, distance: number, dt: number) => void;
      resolvePendingMonsterAttacks: () => void;
      pendingMonsterAttacks: Array<{
        impactAt: number;
        impactRange: number;
      }>;
    };
    game.player.x = spear.x + 118;
    game.player.y = spear.y;
    spear.attackCooldown = 0;

    internals.updateUlleungGuardAi(spear, 118, 0.05);
    expect(spear.aiState).toBe('telegraph');
    spear.actionTimer = 0;
    internals.updateUlleungGuardAi(spear, 118, 0.05);
    expect(internals.pendingMonsterAttacks[0].impactRange).toBe(148);

    const hpBefore = game.player.hp;
    internals.pendingMonsterAttacks[0].impactAt = 0;
    spear.facing = Math.PI;
    internals.resolvePendingMonsterAttacks();
    expect(game.player.hp).toBe(hpBefore);
  });

  it('repositions ranged soldiers laterally when terrain blocks their shot', () => {
    const game = new GameSimulation('yeongwolhq');
    const archer = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-archer')!;
    const internals = game as unknown as {
      hasMonsterLineOfSight: (from: { x: number; y: number }) => boolean;
      isMonsterTravelPathClear: () => boolean;
      updateUlleungGuardAi: (monster: typeof archer, distance: number, dt: number) => void;
      pendingMonsterAttacks: unknown[];
    };
    game.player.x = archer.x + 180;
    game.player.y = archer.y;
    archer.attackCooldown = 0;
    internals.hasMonsterLineOfSight = (from) => from !== archer;
    internals.isMonsterTravelPathClear = () => true;

    internals.updateUlleungGuardAi(archer, 180, 0.1);

    expect(archer.aiState).toBe('circle');
    expect(Math.hypot(archer.velocity.x, archer.velocity.y)).toBeGreaterThan(0);
    expect(internals.pendingMonsterAttacks).toHaveLength(0);
    expect(game.drainEvents().some((event) => event.type === 'monster-attack')).toBe(false);
  });

  it('does not send a ranged soldier toward a blocked fallback point', () => {
    const game = new GameSimulation('yeongwolhq');
    const archer = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-archer')!;
    const internals = game as unknown as {
      isMonsterTravelPathClear: () => boolean;
      repositionForLineOfSight: (
        monster: typeof archer,
        preferredRange: number,
        speed: number,
        dt: number,
      ) => boolean;
    };
    internals.isMonsterTravelPathClear = () => false;
    archer.velocity = { x: 0, y: 0 };

    expect(internals.repositionForLineOfSight(archer, 182, 86, 0.05)).toBe(false);
    expect(archer.velocity).toEqual({ x: 0, y: 0 });
  });

  it('caches the active obstacle slice and throttles unchanged ranged sight checks', () => {
    const game = new GameSimulation('yeongwolhq');
    const archer = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-archer')!;
    const internals = game as unknown as {
      collisionObstacles: () => readonly unknown[];
      activeCollisionObstacles: () => readonly unknown[];
      hasMonsterLineOfSight: (from: { x: number; y: number }, to: { x: number; y: number }) => boolean;
      monsterHasLineOfSight: (monster: typeof archer) => boolean;
    };
    const activeFirst = internals.activeCollisionObstacles();
    const activeSecond = internals.activeCollisionObstacles();

    expect(activeSecond).toBe(activeFirst);
    expect(activeFirst.length).toBeLessThan(internals.collisionObstacles().length);

    const sightCheck = vi.fn(() => true);
    internals.hasMonsterLineOfSight = sightCheck;
    game.player.x = archer.x + 180;
    game.player.y = archer.y;
    expect(internals.monsterHasLineOfSight(archer)).toBe(true);
    expect(internals.monsterHasLineOfSight(archer)).toBe(true);
    expect(internals.monsterHasLineOfSight(archer)).toBe(true);
    expect(sightCheck).toHaveBeenCalledTimes(1);

    game.player.y += 20;
    expect(internals.monsterHasLineOfSight(archer)).toBe(true);
    expect(sightCheck).toHaveBeenCalledTimes(2);
  });

  it('traces ranged line of sight against authored terrain footprints', () => {
    const game = new GameSimulation('solgogae');
    const hasLineOfSight = (game as unknown as {
      hasMonsterLineOfSight: (from: { x: number; y: number }, to: { x: number; y: number }) => boolean;
    }).hasMonsterLineOfSight.bind(game);

    expect(hasLineOfSight({ x: 620, y: 250 }, { x: 780, y: 250 })).toBe(false);
    expect(hasLineOfSight({ x: 620, y: 500 }, { x: 780, y: 500 })).toBe(true);
  });

  it('resolves ranged damage along the launch trajectory instead of homing behind the shooter', () => {
    const game = new GameSimulation('yeongwolhq');
    const archer = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-archer')!;
    const internals = game as unknown as {
      performMonsterAttack: (monster: typeof archer, cooldown: number, knockback: number) => void;
      resolvePendingMonsterAttacks: () => void;
      pendingMonsterAttacks: Array<{
        impactAt: number;
        trajectory?: { origin: { x: number; y: number }; direction: { x: number; y: number }; halfWidth: number };
      }>;
    };
    game.player.x = archer.x + 180;
    game.player.y = archer.y;
    const hpBefore = game.player.hp;

    internals.performMonsterAttack(archer, 1.85, 8);
    expect(internals.pendingMonsterAttacks[0].trajectory).toBeDefined();
    internals.pendingMonsterAttacks[0].impactAt = 0;
    game.player.x = archer.x - 40;
    internals.resolvePendingMonsterAttacks();

    expect(game.player.hp).toBe(hpBefore);
  });

  it('turns a cavalry charge into a readable wind-up and checks contact after movement', () => {
    const game = new GameSimulation('manchufrontier');
    const cavalry = game.monsters.find((monster) =>
      monster.region === 'manchufrontier' && monster.kind === 'manchu-cavalry')!;
    const updateCavalry = (game as unknown as {
      updateCavalryAi: (monster: typeof cavalry, distance: number, dt: number) => void;
    }).updateCavalryAi.bind(game);
    const origin = REGION_ORIGINS.manchufrontier;
    cavalry.x = origin.x + 740;
    cavalry.y = origin.y + 500;
    game.player.x = cavalry.x + 20;
    game.player.y = cavalry.y;
    cavalry.attackCooldown = 0;

    updateCavalry(cavalry, 180, 0.05);
    expect(cavalry.aiState).toBe('telegraph');
    expect(game.drainEvents()).toContainEqual({ type: 'monster-charge', monsterId: cavalry.id });
    cavalry.actionTimer = 0;
    updateCavalry(cavalry, 180, 0.05);
    expect(cavalry.aiState).toBe('charge');
    updateCavalry(cavalry, 999, 0.05);
    expect(cavalry.aiState).toBe('attack');
  });

  it('recomputes beast contact after each charge step instead of using stale distance', () => {
    const game = new GameSimulation('solgogae');
    const boar = game.monsters.find((monster) =>
      monster.region === 'solgogae' && monster.kind === 'boar')!;
    const updateBoar = (game as unknown as {
      updateBoarAi: (monster: typeof boar, distance: number, dt: number) => void;
    }).updateBoarAi.bind(game);
    boar.x = REGION_ORIGINS.solgogae.x + 768;
    boar.y = REGION_ORIGINS.solgogae.y + 520;
    boar.aiState = 'charge';
    boar.actionTimer = 0.5;
    boar.chargeDirection = { x: 1, y: 0 };
    game.player.x = boar.x + 82;
    game.player.y = boar.y;

    updateBoar(boar, 999, 0.05);

    expect(boar.aiState).toBe('attack');
    expect(game.drainEvents()).toContainEqual({
      type: 'monster-attack',
      monsterId: boar.id,
      damage: boar.damage,
    });
  });

  it('gives a Sangun a recovery cooldown after a missed charge', () => {
    const game = new GameSimulation('ulleungridge');
    const tiger = game.monsters.find((monster) =>
      monster.region === 'ulleungridge' && monster.kind === 'ulleung-sangun')!;
    const updateTiger = (game as unknown as {
      updateTigerAi: (monster: typeof tiger, distance: number, dt: number) => void;
    }).updateTigerAi.bind(game);
    tiger.aiState = 'charge';
    tiger.actionTimer = 0;
    tiger.attackCooldown = 0;
    tiger.chargeDirection = { x: -1, y: 0 };
    game.player.x = tiger.x + 260;
    game.player.y = tiger.y;

    updateTiger(tiger, 260, 0.05);

    expect(tiger.aiState).toBe('circle');
    expect(tiger.attackCooldown).toBeGreaterThanOrEqual(0.82);
    updateTiger(tiger, 150, 0.05);
    expect(tiger.aiState).not.toBe('telegraph');
  });

  it('lets timid animals break aggro once they have opened a safe gap', () => {
    const game = new GameSimulation('ulleungcoast');
    const deer = game.monsters.find((monster) =>
      monster.region === 'ulleungcoast' && monster.kind === 'ulleung-water-deer')!;
    const updateTimid = (game as unknown as {
      updateTimidAnimalAi: (monster: typeof deer, distance: number, dt: number) => void;
    }).updateTimidAnimalAi.bind(game);
    deer.aggro = true;
    game.player.x = deer.x - 300;
    game.player.y = deer.y;

    updateTimid(deer, 300, 0.1);

    expect(deer.aggro).toBe(false);
    expect(deer.aiState).toBe('return');
  });

  it('gives a rallying leader real formation buffs without waking other regions', () => {
    const game = new GameSimulation('yeongwolhq');
    const commander = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-commander')!;
    const ally = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-swordsman')!;
    const distantRegion = game.monsters.find((monster) => monster.region === 'jeonju')!;
    const updateSoldier = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof commander, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);
    ally.x = commander.x + 40;
    ally.y = commander.y;
    ally.attackCooldown = 1;
    commander.thinkTimer = 0;

    updateSoldier(commander, 170, 0.05);

    expect(ally.rallySeconds).toBe(3.2);
    expect(ally.attackCooldown).toBeCloseTo(0.72);
    expect(distantRegion.rallySeconds).toBe(0);
  });

  it('keeps later refuge waves dormant when a front-line commander rallies', () => {
    const game = new GameSimulation('namhansanseong');
    expect(game.prepareRoyalRefugeForPlaytest('namhansanseong')).toBe(true);
    const commander = game.monsters.find((monster) =>
      monster.region === 'namhansanseong'
      && monster.kind === 'joseon-border-commander'
      && monster.spawn.y - REGION_ORIGINS.namhansanseong.y >= 690)!;
    const laterGuard = game.monsters.find((monster) =>
      monster.region === 'namhansanseong'
      && monster.spawn.y - REGION_ORIGINS.namhansanseong.y >= 430
      && monster.spawn.y - REGION_ORIGINS.namhansanseong.y < 690)!;
    const updateSoldier = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof commander, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);
    commander.thinkTimer = 0;

    updateSoldier(commander, 170, 0.05);

    expect(laterGuard.aggro).toBe(false);
    expect(laterGuard.rallySeconds).toBe(0);
  });

  it('alternates deterministic recovery sides when an agent remains collision-stuck', () => {
    const game = new GameSimulation('solgogae');
    const monster = game.monsters.find((candidate) => candidate.region === 'solgogae')!;
    const internals = game as unknown as {
      resolveObstacleCollision: () => boolean;
      moveMonsterToward: (
        subject: typeof monster,
        target: { x: number; y: number },
        speed: number,
        dt: number,
        stopDistance: number,
      ) => void;
    };
    internals.resolveObstacleCollision = () => true;
    const target = { x: monster.x + 400, y: monster.y };

    for (let step = 0; step < 7; step += 1) {
      internals.moveMonsterToward(monster, target, 90, 0.05, 8);
    }

    expect(monster.recoveryCount).toBeGreaterThan(0);
    expect(monster.recoveryTimer).toBeGreaterThan(0);
    expect(Math.abs(monster.recoveryDirection.y)).toBeGreaterThan(0.8);
  });

  it('accepts only open ranged recovery candidates that also restore line of sight', () => {
    const game = new GameSimulation('yeongwolhq');
    const archer = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-archer')!;
    const internals = game as unknown as {
      isMonsterTravelPathClear: (
        monster: typeof archer,
        destination: { x: number; y: number },
        bodyRadius: number,
      ) => boolean;
      hasMonsterLineOfSight: (from: { x: number; y: number }) => boolean;
      selectMonsterRecoveryDirection: (
        monster: typeof archer,
        target: { x: number; y: number },
      ) => { x: number; y: number } | null;
    };
    archer.tacticSlot = 0;
    internals.isMonsterTravelPathClear = (_monster, destination) => destination.y < archer.y;
    internals.hasMonsterLineOfSight = (from) => from.y < archer.y;

    const direction = internals.selectMonsterRecoveryDirection(archer, {
      x: archer.x + 300,
      y: archer.y,
    });

    expect(direction).not.toBeNull();
    expect(direction!.y).toBeLessThan(0);
    internals.hasMonsterLineOfSight = () => false;
    expect(internals.selectMonsterRecoveryDirection(archer, {
      x: archer.x + 300,
      y: archer.y,
    })).toBeNull();
  });

  it('disengages far beyond a leash and deliberately returns toward spawn', () => {
    const game = new GameSimulation('solgogae');
    const monster = game.monsters.find((candidate) => candidate.region === 'solgogae')!;
    const updateMonster = (game as unknown as {
      updateMonster: (subject: typeof monster, dt: number) => void;
    }).updateMonster.bind(game);
    monster.x = monster.spawn.x + 620;
    monster.aggro = true;
    monster.aiState = 'chase';
    const before = Math.hypot(monster.x - monster.spawn.x, monster.y - monster.spawn.y);

    updateMonster(monster, 0.1);

    expect(monster.aiState).toBe('return');
    expect(monster.aggro).toBe(false);
    expect(Math.hypot(monster.x - monster.spawn.x, monster.y - monster.spawn.y)).toBeLessThan(before);
  });

  it('winds up a monster strike before damage and locks movement through impact', () => {
    const game = new GameSimulation();
    const monster = game.monsters[1];
    game.player.x = monster.x - 60;
    game.player.y = monster.y;
    game.moveTo({ x: game.player.x, y: game.player.y });
    monster.aggro = true;
    monster.aiState = 'circle';
    monster.attackCooldown = 0;

    const hpBefore = game.player.hp;
    game.update(0.05);
    const attackPosition = { x: monster.x, y: monster.y };
    expect(game.drainEvents()).toContainEqual({
      type: 'monster-attack', monsterId: monster.id, damage: monster.damage,
    });
    expect(game.player.hp).toBe(hpBefore);
    expect(monster.aiState).toBe('attack');

    for (let index = 0; index < 4; index += 1) game.update(0.05);
    expect(game.player.hp).toBe(hpBefore);
    expect(monster.x).toBeCloseTo(attackPosition.x);
    expect(monster.y).toBeCloseTo(attackPosition.y);

    game.update(0.05);
    expect(game.player.hp).toBe(hpBefore - monster.damage);
    expect(monster.aiState).toBe('attack');
    expect(game.drainEvents()).toContainEqual({ type: 'player-hit', damage: monster.damage });
  });

  it('clears monster aggression when the player respawns', () => {
    const game = new GameSimulation();
    const monster = game.monsters.find((entry) => entry.kind === 'boar')!;
    game.player.x = monster.x;
    game.player.y = monster.y + 60;
    game.player.hp = 1;
    monster.attackCooldown = 0;
    monster.aggro = true;
    monster.aiState = 'alert';
    game.moveTo({ x: game.player.x + 2, y: game.player.y });
    for (let index = 0; index < 100 && game.player.hp > 0; index += 1) game.update(0.05);
    expect(game.player.hp).toBe(0);
    for (let index = 0; index < 65; index += 1) game.update(0.05);
    expect(game.player.hp).toBe(game.player.maxHp);
    expect(game.monsters.every((entry) => !entry.aggro)).toBe(true);
  });

  it('starts with empty equipment and uses bare fists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    game.selectMonster(monster.id);
    game.update(0.05);
    expect(game.equipment).toEqual({ weapon: null, armor: null, charm: null });
    expect(game.inventory).toHaveLength(0);
    expect(game.drainEvents()).toContainEqual({ type: 'player-attack', targetId: monster.id, style: 'fist' });
    vi.restoreAllMocks();
  });

  it('rewards coastal training-tree practice with the first weapon after three strikes', () => {
    const game = new GameSimulation();
    expect(game.getTreeTrainingCount()).toBe(0);
    game.trainAtTree(); game.trainAtTree(); game.trainAtTree();
    expect(game.getTreeTrainingCount()).toBe(3);
    expect(game.inventory.some((item) => item.itemId === 'worn-hwando')).toBe(true);
    expect(game.drainEvents().some((event) => event.type === 'training-progress' && event.count === 3)).toBe(true);
  });

  it('drops exactly one damaged tutorial sword from the first defeated prison guard', () => {
    const game = new GameSimulation('ulleungdo');
    const guards = game.monsters.filter((monster) => monster.region === 'ulleungdo' && isIslandGuard(monster.kind));
    const killMonster = (game as unknown as { killMonster: (monster: typeof guards[number]) => void }).killMonster.bind(game);

    killMonster(guards[0]);
    expect(game.groundDrops.filter((drop) => drop.itemId === 'worn-hwando')).toHaveLength(1);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'item-drop',
      itemId: 'worn-hwando',
      itemName: '이 빠진 환도',
    }));

    killMonster(guards[1]);
    expect(game.groundDrops.filter((drop) => drop.itemId === 'worn-hwando')).toHaveLength(1);
  });

  it('keeps ground loot in its region, expires abandoned loot, and protects a selected drop', () => {
    const game = new GameSimulation();
    game.groundDrops.push({
      id: 'drop-expiring', itemId: 'weapon-enchant-scroll', region: game.region,
      x: game.player.x + 120, y: game.player.y, remainingSeconds: 0.04,
    });
    game.update(0.05);
    expect(game.groundDrops.some((drop) => drop.id === 'drop-expiring')).toBe(false);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'item-drop-expired', itemId: 'weapon-enchant-scroll', notable: true,
    }));

    game.groundDrops.push({
      id: 'drop-selected', itemId: 'worn-hwando', region: game.region,
      x: game.player.x + 180, y: game.player.y, remainingSeconds: 0.04,
    });
    game.collectDrop('drop-selected');
    game.update(0.05);
    expect(game.groundDrops.some((drop) => drop.id === 'drop-selected')).toBe(true);

    game.groundDrops.push({
      id: 'drop-other-region', itemId: 'worn-hwando', region: 'osaka',
      x: game.player.x, y: game.player.y, remainingSeconds: 10,
    });
    game.collectDrop('drop-other-region');
    expect(game.player.lootTargetId).toBe('drop-selected');
  });

  it('enchants an equipped weapon and increases attack power', () => {
    const game = new GameSimulation();
    game.inventory.push({ instanceId: 'training-sword', itemId: 'worn-hwando' });
    game.equipItem('training-sword');
    const before = game.getAttackPower();
    game.enchantWeapon();
    expect(game.getAttackPower()).toBe(before + 2);
    expect(game.drainEvents().some((event) => event.type === 'enchant-applied')).toBe(true);
  });

  it('applies fire through the real weapon attack path and keeps dealing burn damage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation('solgogae');
    const monster = game.monsters.find((entry) => entry.region === 'solgogae')!;
    game.inventory.push({ instanceId: 'ember-test', itemId: 'ember-hwando' });
    game.equipItem('ember-test');
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    monster.hp = monster.maxHp;
    game.drainEvents();

    game.selectMonster(monster.id);
    for (let step = 0; step < 9; step += 1) game.update(0.05);
    const hpAfterImpact = monster.hp;
    const impactEvents = game.drainEvents();
    expect(game.getEquippedWeaponElement()).toBe('fire');
    expect(monster.elemental.burnSeconds).toBeGreaterThan(0);
    expect(impactEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'elemental-applied', element: 'fire', targetId: monster.id }),
    ]));

    for (let step = 0; step < 15; step += 1) game.update(0.05);
    expect(monster.hp).toBeLessThan(hpAfterImpact);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'elemental-damage', element: 'fire', targetId: monster.id }),
    ]));
    vi.restoreAllMocks();
  });

  it('freezes a monster with an ice weapon and slows its movement state', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation('solgogae');
    const monster = game.monsters.find((entry) => entry.region === 'solgogae')!;
    game.inventory.push({ instanceId: 'frost-test', itemId: 'frost-hwando' });
    game.equipItem('frost-test');
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    game.drainEvents();

    game.selectMonster(monster.id);
    for (let step = 0; step < 9; step += 1) game.update(0.05);
    expect(game.getEquippedWeaponElement()).toBe('ice');
    expect(monster.elemental.frostSeconds).toBeGreaterThan(2);
    expect(monster.hitStun).toBeGreaterThan(0);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'elemental-applied', element: 'ice', targetId: monster.id }),
    ]));
    vi.restoreAllMocks();
  });

  it('chains lightning from the struck monster into two nearby enemies', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation('solgogae');
    const enemies = game.monsters.filter((entry) => entry.region === 'solgogae').slice(0, 3);
    game.inventory.push({ instanceId: 'storm-test', itemId: 'storm-hwando' });
    game.equipItem('storm-test');
    enemies.forEach((monster, index) => {
      monster.x = game.player.x + 70 + index * 38;
      monster.y = game.player.y;
      monster.hp = monster.maxHp;
    });
    const chainedHp = enemies.slice(1).map((monster) => monster.hp);
    game.drainEvents();

    game.selectMonster(enemies[0].id);
    for (let step = 0; step < 9; step += 1) game.update(0.05);
    const events = game.drainEvents();
    expect(game.getEquippedWeaponElement()).toBe('lightning');
    expect(enemies.slice(1).every((monster, index) => monster.hp < chainedHp[index])).toBe(true);
    expect(events.filter((event) => event.type === 'elemental-damage' && event.element === 'lightning')).toHaveLength(2);
    expect(events.filter((event) => event.type === 'elemental-applied' && event.element === 'lightning')).toHaveLength(3);
    vi.restoreAllMocks();
  });

  it('gives every new elemental weapon a distinct real combat behavior', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const cases = [
      ['venom-hwando', 'poison', 'poisonSeconds'],
      ['gale-hwando', 'wind', 'gustSeconds'],
      ['earth-hwando', 'earth', 'stoneSeconds'],
      ['shadow-hwando', 'shadow', 'shadowSeconds'],
    ] as const;
    for (const [itemId, element, status] of cases) {
      const game = new GameSimulation('solgogae');
      const monster = game.monsters.find((entry) => entry.region === 'solgogae')!;
      game.inventory.push({ instanceId: `${element}-test`, itemId });
      game.equipItem(`${element}-test`);
      game.player.x = monster.x - 70;
      game.player.y = monster.y;
      game.player.hp = game.player.maxHp - 30;
      game.drainEvents();

      game.selectMonster(monster.id);
      for (let step = 0; step < 9; step += 1) game.update(0.05);
      const events = game.drainEvents();
      expect(game.getEquippedWeaponElement()).toBe(element);
      expect(monster.elemental[status]).toBeGreaterThan(0);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'elemental-applied', element, targetId: monster.id }),
      ]));
      if (element === 'shadow') {
        expect(game.player.hp).toBeGreaterThan(game.player.maxHp - 30);
        expect(events.some((event) => event.type === 'elemental-heal')).toBe(true);
      }
    }
    vi.restoreAllMocks();
  });

  it('turns mixed elements into named reaction damage instead of silent overlap', () => {
    const game = new GameSimulation('solgogae');
    const monster = game.monsters.find((entry) => entry.region === 'solgogae')!;
    const applyElement = (game as unknown as {
      applyElementalStatus: (entry: typeof monster, element: 'fire' | 'ice' | 'lightning' | 'poison' | 'wind' | 'earth' | 'shadow', damage: number) => void;
    }).applyElementalStatus.bind(game);

    applyElement(monster, 'ice', 20);
    game.drainEvents();
    const hpBefore = monster.hp;
    applyElement(monster, 'lightning', 20);
    expect(monster.hp).toBeLessThan(hpBefore);
    expect(monster.elemental.frostSeconds).toBe(0);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'elemental-reaction', reaction: 'frost-shatter', targetId: monster.id }),
    ]));
  });

  it('drops tiger pelt on the first mountain-tiger hunt and records hunting milestones', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const game = new GameSimulation('ulleungridge');
    const tiger = game.monsters.find((monster) => monster.kind === 'ulleung-sangun')!;
    const killMonster = (game as unknown as {
      killMonster: (entry: typeof tiger) => void;
    }).killMonster.bind(game);

    killMonster(tiger);
    expect(game.huntKills['ulleung-sangun']).toBe(1);
    expect(game.groundDrops.some((drop) => drop.itemId === 'ulleung-tiger-pelt')).toBe(true);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'hunt-milestone', kind: 'ulleung-sangun', kills: 1 }),
      expect.objectContaining({ type: 'item-drop', itemId: 'ulleung-tiger-pelt' }),
    ]));
    vi.restoreAllMocks();
  });

  it('crafts mountain-tiger armor from three pelts and preserves the hunt record in saves', () => {
    const game = new GameSimulation('ulleunghunt');
    game.player.gold = 400;
    game.inventory.push(
      { instanceId: 'pelt-1', itemId: 'ulleung-tiger-pelt' },
      { instanceId: 'pelt-2', itemId: 'ulleung-tiger-pelt' },
      { instanceId: 'pelt-3', itemId: 'ulleung-tiger-pelt' },
    );
    game.huntKills['ulleung-sangun'] = 5;

    expect(game.craftItem('tiger-pelt-armor')).toBe(true);
    expect(game.inventory.filter((item) => item.itemId === 'ulleung-tiger-pelt')).toHaveLength(0);
    expect(game.inventory.some((item) => item.itemId === 'tiger-pelt-armor')).toBe(true);
    expect(game.player.gold).toBe(220);
    expect(game.craftedRecipes.has('tiger-pelt-armor')).toBe(true);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'item-crafted', recipeId: 'tiger-pelt-armor', itemId: 'tiger-pelt-armor',
    }));

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.huntKills['ulleung-sangun']).toBe(5);
    expect(restored.craftedRecipes.has('tiger-pelt-armor')).toBe(true);
    expect(restored.inventory.some((item) => item.itemId === 'tiger-pelt-armor')).toBe(true);
  });

  it('makes tiger-pelt armor a genuine beast-hunter passive', () => {
    const game = new GameSimulation('ulleungridge');
    const tiger = game.monsters.find((monster) => monster.kind === 'ulleung-sangun')!;
    const damageAgainstMonster = (game as unknown as {
      damageAgainstMonster: (entry: typeof tiger, damage: number) => number;
    }).damageAgainstMonster.bind(game);
    expect(damageAgainstMonster(tiger, 40)).toBe(40);

    game.inventory.push({ instanceId: 'tiger-armor-test', itemId: 'tiger-pelt-armor' });
    game.equipItem('tiger-armor-test');
    expect(damageAgainstMonster(tiger, 40)).toBe(50);
  });

  it('sells all three elemental weapons as real inventory items', () => {
    const game = new GameSimulation('village');
    game.player.gold = 2_000;
    expect(game.purchaseShopOffer('ember-hwando')).toBe(true);
    expect(game.purchaseShopOffer('frost-hwando')).toBe(true);
    expect(game.purchaseShopOffer('storm-hwando')).toBe(true);
    expect(game.inventory.map((item) => item.itemId)).toEqual([
      'ember-hwando',
      'frost-hwando',
      'storm-hwando',
    ]);
    expect(game.player.gold).toBe(210);
  });

  it('consumes weapon and armor scrolls to apply safe equipment enhancement', () => {
    const game = new GameSimulation();
    game.inventory.push(
      { instanceId: 'scroll-weapon', itemId: 'weapon-enchant-scroll' },
      { instanceId: 'scroll-armor', itemId: 'armor-enchant-scroll' },
      { instanceId: 'scroll-sword', itemId: 'worn-hwando' },
      { instanceId: 'scroll-coat', itemId: 'hunter-durumagi' },
    );
    game.equipItem('scroll-sword');
    game.equipItem('scroll-coat');
    const attackBefore = game.getAttackPower();
    const defenseBefore = game.getDefense();

    game.useItem('scroll-weapon');
    game.useItem('scroll-armor');

    expect(game.getAttackPower()).toBe(attackBefore + 2);
    expect(game.getDefense()).toBe(defenseBefore + 2);
    expect(game.getWeaponEnchantLevel()).toBe(1);
    expect(game.getArmorEnchantLevel()).toBe(1);
    expect(game.inventory.some((item) => item.instanceId === 'scroll-weapon')).toBe(false);
    expect(game.inventory.some((item) => item.instanceId === 'scroll-armor')).toBe(false);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      { type: 'enchant-applied', target: 'weapon', level: 1, bonus: 2 },
      { type: 'enchant-applied', target: 'armor', level: 1, bonus: 2 },
    ]));
  });

  it('turns village services into real purchases with gold, inventory, recovery and forging', () => {
    const game = new GameSimulation('village');
    const startingGold = game.player.gold;
    expect(game.purchaseShopOffer('ginseng-pellet')).toBe(true);
    expect(game.player.potions).toBe(4);
    expect(game.player.gold).toBe(startingGold - 18);

    game.player.gold = 500;
    expect(game.purchaseShopOffer('weapon-enchant-scroll')).toBe(true);
    expect(game.inventory.some((item) => item.itemId === 'weapon-enchant-scroll')).toBe(true);

    game.player.hp = 1;
    expect(game.purchaseShopOffer('inn-rest')).toBe(true);
    expect(game.player.hp).toBe(game.player.maxHp);

    game.inventory.push({ instanceId: 'shop-weapon', itemId: 'worn-hwando' });
    game.equipItem('shop-weapon');
    expect(game.purchaseShopOffer('forge-weapon')).toBe(true);
    expect(game.inventory.find((item) => item.instanceId === 'shop-weapon')?.enhancement).toBe(1);
    expect(game.drainEvents().some((event) => event.type === 'shop-purchase')).toBe(true);
  });

  it('blocks village purchases when gold, bag space or equipped gear is missing', () => {
    const game = new GameSimulation('village');
    game.player.gold = 0;
    expect(game.purchaseShopOffer('ginseng-pellet')).toBe(false);
    game.player.gold = 9999;
    while (game.inventory.length < game.inventoryCapacity) {
      game.inventory.push({ instanceId: `filler-${game.inventory.length}`, itemId: 'boar-tusk-charm' });
    }
    expect(game.purchaseShopOffer('armor-enchant-scroll')).toBe(false);
    expect(game.purchaseShopOffer('forge-armor')).toBe(false);
    const reasons = game.drainEvents().filter((event) => event.type === 'shop-blocked').map((event) => event.reason);
    expect(reasons).toEqual(['gold', 'inventory', 'equipment']);
  });

  it('does not consume an enchant scroll when its equipment slot is empty', () => {
    const game = new GameSimulation();
    game.inventory.push({ instanceId: 'blocked-scroll', itemId: 'weapon-enchant-scroll' });
    game.useItem('blocked-scroll');
    expect(game.inventory.some((item) => item.instanceId === 'blocked-scroll')).toBe(true);
    expect(game.drainEvents()).toContainEqual({ type: 'enchant-blocked', target: 'weapon', reason: 'unequipped' });
  });

  it('keeps ordinary equipment drops rare while the training tree guarantees progression', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    monster.hp = 1;
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    game.selectMonster(monster.id);
    for (let index = 0; index < 6; index += 1) game.update(0.05);
    expect(game.groundDrops).toHaveLength(0);
    game.trainAtTree();
    game.trainAtTree();
    game.trainAtTree();
    expect(game.inventory.some((item) => item.itemId === 'worn-hwando')).toBe(true);
    vi.restoreAllMocks();
  });

  it('keeps a killed monster dead until the seven-second respawn event', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    const killMonster = (game as unknown as {
      killMonster: (entry: typeof monster) => void;
    }).killMonster.bind(game);

    killMonster(monster);
    expect(monster.alive).toBe(false);
    expect(game.drainEvents().some((event) => event.type === 'monster-killed')).toBe(true);

    for (let index = 0; index < 139; index += 1) game.update(0.05);
    expect(monster.alive).toBe(false);
    for (let index = 0; index < 2; index += 1) game.update(0.05);
    expect(monster.alive).toBe(true);
    expect(game.drainEvents()).toContainEqual({ type: 'monster-respawn', monsterId: monster.id });
    vi.restoreAllMocks();
  });

  it('applies and removes armor health bonuses', () => {
    const game = new GameSimulation();
    game.inventory.push({ instanceId: 'armor-test', itemId: 'hunter-durumagi' });
    game.equipItem('armor-test');
    expect(game.player.maxHp).toBe(214);
    expect(game.equipment.armor).toBe('armor-test');
    game.equipItem('armor-test');
    expect(game.player.maxHp).toBe(180);
    expect(game.equipment.armor).toBeNull();
  });

  it('activates cumulative two-piece and three-piece set bonuses in real stats', () => {
    const game = new GameSimulation();
    game.inventory.push(
      { instanceId: 'set-weapon', itemId: 'moonsteel-hwando' },
      { instanceId: 'set-armor', itemId: 'warden-durumagi' },
      { instanceId: 'set-charm', itemId: 'silver-tiger-charm' },
    );

    game.equipItem('set-weapon');
    game.equipItem('set-armor');
    expect(game.getAttackPower()).toBe(33);
    expect(game.player.maxHp).toBe(253);

    game.equipItem('set-charm');
    expect(game.getAttackPower()).toBe(45);
    expect(game.player.maxHp).toBe(296);
    expect(game.getDefense()).toBe(25);
    expect(game.getAccuracy()).toBe(91);
    expect(game.getEvasion()).toBe(10);
  });

  it('cancels a queued fist strike when a weapon is equipped', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    game.selectMonster(monster.id);
    game.update(0.05);
    expect(game.drainEvents()).toContainEqual({ type: 'player-attack', targetId: monster.id, style: 'fist' });

    game.inventory.push({ instanceId: 'weapon-test', itemId: 'worn-hwando' });
    game.equipItem('weapon-test');
    expect(game.equipment.weapon).toBe('weapon-test');
    expect(game.drainEvents().some((event) => event.type === 'player-attack' || event.type === 'player-impact')).toBe(false);

    for (let index = 0; index < 5; index += 1) game.update(0.05);
    expect(monster.hp).toBe(monster.maxHp);
    vi.restoreAllMocks();
  });

  it('treats an inventory item stored in the wrong equipment slot as unequipped', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    game.inventory.push({ instanceId: 'armor-in-weapon-slot', itemId: 'hunter-durumagi' });
    game.equipment.weapon = 'armor-in-weapon-slot';
    game.player.x = monster.x - 70;
    game.player.y = monster.y;

    expect(game.getEquippedDefinition('weapon')).toBeNull();
    game.selectMonster(monster.id);
    game.update(0.05);
    expect(game.drainEvents()).toContainEqual({ type: 'player-attack', targetId: monster.id, style: 'fist' });
    vi.restoreAllMocks();
  });

  it('quick-steps away from a target once per cooldown without consuming a potion', () => {
    const game = new GameSimulation();
    const target = game.monsters[1];
    target.x = game.player.x + 140;
    target.y = game.player.y;
    game.selectMonster(target.id);
    const before = { x: game.player.x, potions: game.player.potions };

    game.quickStep();
    expect(game.player.x).toBeLessThan(before.x);
    expect(game.player.potions).toBe(before.potions);
    expect(game.player.dodgeCooldown).toBeGreaterThan(0);
    expect(game.drainEvents().some((event) => event.type === 'player-quickstep')).toBe(true);

    const afterFirstStep = { x: game.player.x, y: game.player.y };
    game.quickStep();
    expect({ x: game.player.x, y: game.player.y }).toEqual(afterFirstStep);
  });

  it('turns a precisely timed quick-step into a perfect dodge and momentum gain', () => {
    const game = new GameSimulation('solgogae');
    const attacker = game.monsters.find((monster) => monster.region === 'solgogae')!;
    attacker.x = game.player.x + 70;
    attacker.y = game.player.y;
    const internals = game as unknown as {
      pendingMonsterAttacks: Array<{
        monsterId: string;
        damage: number;
        impactAt: number;
        knockbackForce: number;
        impactRange: number;
      }>;
    };
    internals.pendingMonsterAttacks = [{
      monsterId: attacker.id,
      damage: 7,
      impactAt: 0.2,
      knockbackForce: 18,
      impactRange: 96,
    }];

    game.quickStep();

    expect(game.player.momentum).toBe(25);
    expect(game.player.dodgeCooldown).toBe(1.1);
    expect(internals.pendingMonsterAttacks).toHaveLength(0);
    expect(game.drainEvents()).toContainEqual({ type: 'perfect-dodge', momentum: 25 });
  });

  it('awakens moon momentum after chained kills and grants the combat bonuses', () => {
    const game = new GameSimulation('solgogae');
    const killMonster = (game as unknown as {
      killMonster: (monster: typeof game.monsters[number]) => void;
    }).killMonster.bind(game);
    const attackBefore = game.getAttackPower();
    const targets = game.monsters.filter((monster) => monster.region === 'solgogae').slice(0, 5);

    targets.forEach(killMonster);

    expect(game.player.combo).toBe(5);
    expect(game.player.momentum).toBe(100);
    expect(game.player.momentumActive).toBe(7);
    expect(game.getAttackPower()).toBe(attackBefore + 6);
    expect(game.drainEvents()).toContainEqual({ type: 'momentum-burst', duration: 7 });
  });

  it('lets inactive momentum fade after the combo window and ends awakening cleanly', () => {
    const game = new GameSimulation('solgogae');
    const killMonster = (game as unknown as {
      killMonster: (monster: typeof game.monsters[number]) => void;
    }).killMonster.bind(game);
    killMonster(game.monsters.find((monster) => monster.region === 'solgogae')!);
    expect(game.player.momentum).toBe(18);

    for (let step = 0; step < 130; step += 1) game.update(0.05);
    expect(game.player.combo).toBe(0);
    expect(game.player.momentum).toBeLessThan(18);

    game.player.momentum = 100;
    game.player.momentumActive = 0.05;
    game.update(0.1);
    expect(game.player.momentumActive).toBe(0);
    expect(game.player.momentum).toBe(0);
    expect(game.drainEvents()).toContainEqual({ type: 'momentum-ended' });
  });

  it('awards the eight-kill quest once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    const killMonster = (game as unknown as {
      killMonster: (entry: typeof monster) => void;
    }).killMonster.bind(game);

    for (let index = 0; index < 7; index += 1) {
      monster.alive = true;
      killMonster(monster);
    }
    expect(game.drainEvents().some((event) => event.type === 'quest-complete')).toBe(false);

    const goldBeforeCompletion = game.player.gold;
    monster.alive = true;
    killMonster(monster);
    const completionEvents = game.drainEvents().filter((event) => event.type === 'quest-complete');
    expect(completionEvents).toEqual([{ type: 'quest-complete', gold: 240 }]);
    expect(game.player.gold - goldBeforeCompletion).toBeGreaterThanOrEqual(240);

    monster.alive = true;
    killMonster(monster);
    expect(game.drainEvents().some((event) => event.type === 'quest-complete')).toBe(false);
    vi.restoreAllMocks();
  });

  it('keeps movement outside authored field props', () => {
    const game = new GameSimulation();
    for (const monster of game.monsters) {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
    game.moveTo({ x: 1120, y: 690 });
    for (let index = 0; index < 80; index += 1) game.update(0.05);
    expect(Math.hypot(game.player.x - 1120, game.player.y - 690)).toBeGreaterThanOrEqual(89.5);
  });

  it('lets the player enter the village through the open north gate', () => {
    const game = new GameSimulation();
    for (const monster of game.monsters) {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
    game.moveTo({ x: 770, y: VILLAGE_TOP + 406 });
    for (let index = 0; index < 120; index += 1) game.update(0.05);
    expect(game.player.y).toBeGreaterThan(VILLAGE_TOP + 326);
    expect(game.player.x).toBeGreaterThan(700);
    expect(game.player.x).toBeLessThan(840);
  });

  it('keeps the player outside village building foundations', () => {
    const game = new GameSimulation();
    for (const monster of game.monsters) {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
    game.player.x = 650;
    game.player.y = VILLAGE_TOP + 366;
    game.moveTo({ x: 300, y: VILLAGE_TOP + 246 });
    for (let index = 0; index < 100; index += 1) game.update(0.05);
    const insideInn = game.player.x > 75 && game.player.x < 525
      && game.player.y > VILLAGE_TOP + 71 && game.player.y < VILLAGE_TOP + 421;
    expect(insideInn).toBe(false);
  });

  it('walks continuously through the village west gate into the physical mistwood and back', () => {
    const game = new GameSimulation();
    game.player.y = VILLAGE_TOP + 120;
    game.update(0.05);
    expect(game.region).toBe('village');
    expect(game.drainEvents()).toContainEqual({ type: 'region-changed', region: 'village' });

    game.player.x = -4;
    game.player.y = VILLAGE_TOP + 470;
    game.update(0.05);
    expect(game.region).toBe('mistwood');
    expect(game.player.x).toBe(-4);
    expect(game.player.destination).toBeNull();
    expect(game.monsters.filter((monster) => monster.region === 'mistwood')).toHaveLength(8);
    expect(game.drainEvents()).toContainEqual({ type: 'region-changed', region: 'mistwood' });

    game.player.x = 4;
    game.player.y = VILLAGE_TOP + 470;
    game.update(0.05);
    expect(game.region).toBe('village');
    expect(game.player.x).toBe(4);
  });

  it('supports physical east and south open-field boundaries without teleporting', () => {
    const east = new GameSimulation();
    east.player.y = VILLAGE_TOP + 120;
    east.update(0.05);
    east.player.x = 1540;
    east.player.y = VILLAGE_TOP + 470;
    east.update(0.05);
    expect(east.region).toBe('minepass');
    expect(east.player.x).toBe(1540);
    expect(east.monsters.filter((monster) => monster.region === 'minepass' && monster.kind === 'mine-golem')).toHaveLength(6);

    const south = new GameSimulation();
    south.player.y = VILLAGE_TOP + 120;
    south.update(0.05);
    south.player.x = 770;
    south.player.y = 1924;
    south.update(0.05);
    expect(south.region).toBe('moonfield');
    expect(south.player.y).toBe(1924);
    expect(south.monsters.filter((monster) => monster.region === 'moonfield' && monster.kind === 'moon-revenant')).toHaveLength(6);
  });

  it('keeps the central landmark foundations solid while their authored roads stay open', () => {
    const landmarks = [
      {
        region: 'mistwood' as const,
        blocked: { x: REGION_ORIGINS.mistwood.x + 1200, y: REGION_ORIGINS.mistwood.y + 250 },
        road: { x: REGION_ORIGINS.mistwood.x + 768, y: REGION_ORIGINS.mistwood.y + 480 },
      },
      {
        region: 'minepass' as const,
        blocked: { x: REGION_ORIGINS.minepass.x + 1200, y: REGION_ORIGINS.minepass.y + 260 },
        road: { x: REGION_ORIGINS.minepass.x + 768, y: REGION_ORIGINS.minepass.y + 480 },
      },
      {
        region: 'moonfield' as const,
        blocked: { x: REGION_ORIGINS.moonfield.x + 300, y: REGION_ORIGINS.moonfield.y + 800 },
        road: { x: REGION_ORIGINS.moonfield.x + 770, y: REGION_ORIGINS.moonfield.y + 500 },
      },
    ];

    for (const landmark of landmarks) {
      const game = new GameSimulation(landmark.region);
      const isRoutePointClear = (game as unknown as {
        isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
      }).isRoutePointClear.bind(game);
      expect(isRoutePointClear(landmark.blocked, 20), `${landmark.region} landmark`).toBe(false);
      expect(isRoutePointClear(landmark.road, 20), `${landmark.region} road`).toBe(true);
      for (const monster of game.monsters.filter((entry) => entry.region === landmark.region)) {
        expect(isRoutePointClear(monster.spawn, 24), `${landmark.region} spawn ${monster.id}`).toBe(true);
      }
    }
  });

  it('opens central world seams only inside the shared authored road widths from both sides', () => {
    const clamp = (game: GameSimulation, point: { x: number; y: number }) => (
      game as unknown as { clampToField: (candidate: { x: number; y: number }) => { x: number; y: number } }
    ).clampToField(point);
    const westSeam = worldTerrainSeamBetween('mistwood', 'village')!;
    const westLaneY = VILLAGE_TOP + westSeam.toLane;
    const westOutsideY = westLaneY + westSeam.roadWidth / 2 - 20 + 1;
    const village = new GameSimulation('village');
    const mistwood = new GameSimulation('mistwood');

    expect(clamp(village, { x: -30, y: westLaneY }).x).toBeLessThan(0);
    expect(clamp(village, { x: -30, y: westOutsideY }).x).toBeGreaterThanOrEqual(0);
    expect(clamp(mistwood, { x: 30, y: westLaneY }).x).toBeGreaterThan(0);
    expect(clamp(mistwood, { x: 30, y: westOutsideY }).x).toBeLessThanOrEqual(0);

    const eastSeam = worldTerrainSeamBetween('village', 'minepass')!;
    const eastLaneY = VILLAGE_TOP + eastSeam.fromLane;
    const eastOutsideY = eastLaneY + eastSeam.roadWidth / 2 - 20 + 1;
    const minepass = new GameSimulation('minepass');
    expect(clamp(village, { x: MAP_WIDTH + 30, y: eastLaneY }).x).toBeGreaterThan(MAP_WIDTH);
    expect(clamp(village, { x: MAP_WIDTH + 30, y: eastOutsideY }).x).toBeLessThanOrEqual(MAP_WIDTH);
    expect(clamp(minepass, { x: MAP_WIDTH - 30, y: eastLaneY }).x).toBeLessThan(MAP_WIDTH);
    expect(clamp(minepass, { x: MAP_WIDTH - 30, y: eastOutsideY }).x).toBeGreaterThanOrEqual(MAP_WIDTH);

    const southSeam = worldTerrainSeamBetween('village', 'moonfield')!;
    const southLaneX = southSeam.fromLane;
    const southOutsideX = southLaneX + southSeam.roadWidth / 2 - 20 + 1;
    const moonfield = new GameSimulation('moonfield');
    expect(clamp(village, { x: southLaneX, y: CENTRAL_WORLD_HEIGHT + 30 }).y).toBeGreaterThan(CENTRAL_WORLD_HEIGHT);
    expect(clamp(village, { x: southOutsideX, y: CENTRAL_WORLD_HEIGHT + 30 }).y).toBeLessThanOrEqual(CENTRAL_WORLD_HEIGHT);
    expect(clamp(moonfield, { x: southLaneX, y: CENTRAL_WORLD_HEIGHT - 30 }).y).toBeLessThan(CENTRAL_WORLD_HEIGHT);
    expect(clamp(moonfield, { x: southOutsideX, y: CENTRAL_WORLD_HEIGHT - 30 }).y).toBeGreaterThanOrEqual(CENTRAL_WORLD_HEIGHT);
  });

  it('lets a Japan ferry pier reach its travel threshold without a terrain seam', () => {
    const game = new GameSimulation('awajicoast');
    const origin = REGION_ORIGINS.awajicoast;
    const clampToField = (game as unknown as {
      clampToField: (candidate: { x: number; y: number }) => { x: number; y: number };
    }).clampToField.bind(game);

    expect(clampToField({ x: origin.x + 768, y: origin.y - 30 }).y).toBeLessThanOrEqual(origin.y + 78);
    expect(clampToField({ x: origin.x + 768, y: origin.y + MAP_HEIGHT + 30 }).y)
      .toBeGreaterThanOrEqual(origin.y + 966);
    expect(clampToField({ x: origin.x + 500, y: origin.y - 30 }).y).toBeGreaterThan(origin.y + 78);
  });

  it('projects clicks out of scenery and clears an unreachable straight-line walk goal', () => {
    const projected = new GameSimulation('village');
    const innCenter = { x: 300, y: VILLAGE_TOP + 246 };
    projected.moveTo(innCenter);
    const isRoutePointClear = (projected as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    }).isRoutePointClear.bind(projected);
    expect(projected.getMovementGoal()).not.toEqual(innCenter);
    expect(isRoutePointClear(projected.getMovementGoal()!, 20)).toBe(true);

    const stalled = new GameSimulation('village');
    for (const monster of stalled.monsters) {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    }
    stalled.player.x = 700;
    stalled.player.y = VILLAGE_TOP + 246;
    stalled.moveTo({ x: 50, y: VILLAGE_TOP + 246 });
    expect(stalled.getMovementGoal()).toEqual({ x: 50, y: VILLAGE_TOP + 246 });
    for (let step = 0; step < 160 && stalled.player.destination; step += 1) stalled.update(0.05);

    expect(stalled.player.destination).toBeNull();
    expect(stalled.player.x).toBeGreaterThanOrEqual(524);
  });

  it('keeps every regional monster population resident at distinct world coordinates', () => {
    const game = new GameSimulation();
    expect(game.monsters).toHaveLength(627 + EPISODE2_REGION_IDS.length * 5);
    expect(game.monsters.filter((monster) => monster.region === 'solgogae').every((monster) => monster.x > 0 && monster.y < 900)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'mistwood').every((monster) => monster.x < 0 && monster.y > VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'yeongwol')).toHaveLength(12);
    expect(game.monsters.filter((monster) => monster.region === 'yeongwol').every((monster) => monster.x < -MAP_WIDTH && monster.y > VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'yeongwolhq')).toHaveLength(11);
    expect(game.monsters.filter((monster) => monster.region === 'yeongwolhq').every((monster) => monster.x < -MAP_WIDTH && monster.y < VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'jeonjufield')).toHaveLength(19);
    expect(game.monsters.filter((monster) => monster.region === 'jeonjufield').every((monster) => monster.x < -MAP_WIDTH * 2 && monster.y > VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'jeonjugate')).toHaveLength(21);
    expect(game.monsters.filter((monster) => monster.region === 'jeonjugate').every((monster) => monster.x < -MAP_WIDTH * 2
      && monster.y < VILLAGE_TOP && monster.y > VILLAGE_TOP - MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'jeonju')).toHaveLength(20);
    expect(game.monsters.filter((monster) => monster.region === 'jeonju').every((monster) => monster.x < -MAP_WIDTH * 2
      && monster.y < VILLAGE_TOP - MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'busanjin')).toHaveLength(17);
    expect(game.monsters.filter((monster) => monster.region === 'tangeumdae')).toHaveLength(21);
    expect(game.monsters.filter((monster) => monster.region === 'changbaihunt')).toHaveLength(10);
    expect(game.monsters.filter((monster) => monster.region === 'baeksanvillage')).toHaveLength(7);
    expect(game.monsters.filter((monster) => monster.region === 'songhuahunt')).toHaveLength(12);
    expect(game.monsters.filter((monster) => monster.region === 'songhuavillage')).toHaveLength(8);
    expect(game.monsters.filter((monster) => monster.region === 'blackpinehunt')).toHaveLength(12);
    expect(game.monsters.filter((monster) => monster.region === 'heuksuvillage')).toHaveLength(10);
    expect(game.monsters.filter((monster) => monster.region === 'gyeongbokgate')).toHaveLength(10);
    expect(game.monsters.filter((monster) => monster.region === 'gyeongbokcourt')).toHaveLength(12);
    expect(game.monsters.filter((monster) => monster.region === 'gyeongbokinner')).toHaveLength(9);
    expect(game.monsters.filter((monster) => monster.region === 'gyeongbokinner'
      && monster.kind === 'joseon-prince')).toHaveLength(1);
    expect(game.monsters.filter((monster) => monster.region === 'manchufrontier')).toHaveLength(29);
    expect(game.monsters.filter((monster) => monster.region === 'wonju')).toHaveLength(6);
    expect(game.monsters.filter((monster) => monster.region === 'gangneung')).toHaveLength(6);
    expect(game.monsters.filter((monster) => monster.region === 'haeju')).toHaveLength(6);
    expect(game.monsters.filter((monster) => monster.region === 'geoje')).toHaveLength(6);
    expect(game.monsters.filter((monster) => monster.region === 'pyongyangouter')).toHaveLength(15);
    expect(game.monsters.filter((monster) => monster.region === 'pyongyanggate')).toHaveLength(17);
    expect(game.monsters.filter((monster) => monster.region === 'pyongyanginner')).toHaveLength(17);
    expect(game.monsters.filter((monster) => monster.region === 'namhansanseong')).toHaveLength(25);
    expect(game.monsters.filter((monster) => monster.region === 'ganghwado')).toHaveLength(25);
    expect(game.monsters.filter((monster) => monster.region === 'namhansanseong'
      || monster.region === 'ganghwado').every((monster) => {
      const origin = REGION_ORIGINS[monster.region as 'namhansanseong' | 'ganghwado'];
      return monster.x > origin.x && monster.x < origin.x + MAP_WIDTH
        && monster.y > origin.y && monster.y < origin.y + MAP_HEIGHT;
    })).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'osaka')).toHaveLength(10);
    expect(game.monsters.filter((monster) => monster.region === 'osaka').every((monster) =>
      monster.x > REGION_ORIGINS.osaka.x && monster.x < REGION_ORIGINS.osaka.x + MAP_WIDTH
      && monster.y > REGION_ORIGINS.osaka.y && monster.y < REGION_ORIGINS.osaka.y + MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'minepass').every((monster) => monster.x > 1536 && monster.y > VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'moonfield').every((monster) => monster.y > 1920)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'dungeon').every((monster) => monster.x > 3072 && monster.y < VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungdo').every((monster) => monster.x >= 4608 && monster.x < 6144)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungdo').every((monster) =>
      monster.y > REGION_ORIGINS.ulleungdo.y && monster.y < REGION_ORIGINS.ulleungdo.y + MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungcoast')).toHaveLength(10);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungcoast').every((monster) =>
      monster.y > REGION_ORIGINS.ulleungcoast.y && monster.y < REGION_ORIGINS.ulleungcoast.y + MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungmeadow')).toHaveLength(12);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungmeadow').every((monster) =>
      monster.y > REGION_ORIGINS.ulleungmeadow.y && monster.y < REGION_ORIGINS.ulleungmeadow.y + MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'ulleunghunt')).toHaveLength(10);
    expect(game.monsters.filter((monster) => monster.region === 'ulleunghunt').every((monster) =>
      monster.y > REGION_ORIGINS.ulleunghunt.y && monster.y < REGION_ORIGINS.ulleunghunt.y + MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungridge')).toHaveLength(10);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungridge').every((monster) =>
      monster.y > REGION_ORIGINS.ulleungridge.y && monster.y < REGION_ORIGINS.ulleungridge.y + MAP_HEIGHT)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungvillage')).toHaveLength(31);
    expect(game.monsters.filter((monster) => monster.region === 'ulleungvillage').every((monster) => monster.x >= 4608 && monster.y > 0)).toBe(true);
    expect(new Set(game.monsters.filter((monster) => monster.region === 'mistwood').map((monster) => monster.kind))).toEqual(new Set(['bamboo-spirit', 'dokkaebi']));
    expect(new Set(game.monsters.filter((monster) => monster.region === 'minepass').map((monster) => monster.kind))).toEqual(new Set(['mine-golem', 'bandit']));
    expect(new Set(game.monsters.filter((monster) => monster.region === 'moonfield').map((monster) => monster.kind))).toEqual(new Set(['moon-revenant', 'bamboo-spirit']));
  });

  it('starts the campaign on a physically isolated Ulleungdo field', () => {
    const game = new GameSimulation('ulleungdo');
    expect(game.region).toBe('ulleungdo');
    expect(game.player.x).toBeGreaterThanOrEqual(4608);
    game.moveTo({ x: 3000, y: 500 });
    expect(game.player.destination!.x).toBeGreaterThanOrEqual(4608 + 170);
    expect(game.monsters.filter((monster) => monster.region === 'solgogae').map((monster) => monster.kind))
      .toEqual(['boar', 'dokkaebi', 'bandit', 'boar', 'dokkaebi', 'bandit', 'boar', 'bandit']);
    const islandMonsters = game.monsters.filter((monster) => monster.region === 'ulleungdo');
    expect(islandMonsters.filter((monster) => isIslandGuard(monster.kind))).toHaveLength(6);
    expect(islandMonsters.every((monster) => isIslandGuard(monster.kind))).toBe(true);
    expect(new Set(islandMonsters.map((monster) => monster.kind))).toEqual(new Set(['ulleung-guard', 'ulleung-veteran', 'ulleung-captain']));
    const trainingMonsters = game.monsters.filter((monster) => monster.region === 'ulleunghunt');
    expect(trainingMonsters.filter((monster) => monster.kind === 'ulleung-hare')).toHaveLength(3);
    expect(trainingMonsters.filter((monster) => monster.kind === 'ulleung-water-deer')).toHaveLength(2);
    expect(trainingMonsters.filter((monster) => monster.kind === 'boar')).toHaveLength(2);
    expect(trainingMonsters.filter((monster) => monster.kind === 'ulleung-guard')).toHaveLength(2);
    expect(trainingMonsters.filter((monster) => monster.kind === 'ulleung-veteran')).toHaveLength(1);
  });

  it('populates early Ulleung fields with weak non-aggressive rabbits and water deer', () => {
    const game = new GameSimulation('ulleungcoast');
    const animals = game.monsters.filter((monster) => monster.region === 'ulleungcoast'
      && (monster.kind === 'ulleung-hare' || monster.kind === 'ulleung-water-deer'));
    expect(new Set(animals.map((animal) => animal.kind))).toEqual(new Set(['ulleung-hare', 'ulleung-water-deer']));
    expect(animals.every((animal) => animal.level === 1 && animal.damage <= 3 && !animal.aggro)).toBe(true);
    const deer = animals.find((animal) => animal.kind === 'ulleung-water-deer')!;
    const startX = deer.x;
    game.player.x = deer.x - 90;
    game.player.y = deer.y;
    game.moveTo({ x: deer.x, y: deer.y });
    for (let step = 0; step < 20; step += 1) game.update(0.05);
    expect(deer.aiState).toBe('flee');
    expect(deer.x).toBeGreaterThan(startX + 30);
    expect(deer.aggro).toBe(false);
  });

  it('reserves aggressive Sangun predators for the highland ridge', () => {
    const game = new GameSimulation('ulleungridge');
    const predators = game.monsters.filter((monster) => monster.region === 'ulleungridge' && monster.kind === 'ulleung-sangun');
    expect(predators).toHaveLength(2);
    expect(predators.every((predator) => predator.level === 7 && predator.damage === 15)).toBe(true);
    const tiger = predators[0];
    game.player.x = tiger.x + 150;
    game.player.y = tiger.y;
    game.moveTo({ x: tiger.x + 120, y: tiger.y });
    for (let step = 0; step < 12; step += 1) game.update(0.05);
    expect(tiger.aggro).toBe(true);
    expect(['alert', 'telegraph', 'charge', 'chase', 'circle', 'attack']).toContain(tiger.aiState);
  });

  it('keeps the prison gate shut until all six Ulleungdo guards are defeated', () => {
    const game = new GameSimulation('ulleungdo');
    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungdo');
    const killMonster = (game as unknown as { killMonster: (monster: typeof guards[number]) => void }).killMonster.bind(game);
    guards.slice(0, -1).forEach(killMonster);
    expect(game.isPrisonGateOpen()).toBe(false);
    killMonster(guards.at(-1)!);
    expect(game.isPrisonGateOpen()).toBe(true);
    expect(game.drainEvents().some((event) => event.type === 'prison-gate-opened')).toBe(true);
    game.moveTo({ x: 5376, y: REGION_ORIGINS.ulleungdo.y - 500 });
    expect(game.player.destination?.y).toBe(REGION_ORIGINS.ulleungdo.y - 500);
    for (let step = 0; step < 150 && game.region === 'ulleungdo'; step += 1) game.update(0.05);
    expect(game.region).toBe('ulleungridge');
  });

  it('blocks prison walls and cages while preserving both central gate corridors', () => {
    const game = new GameSimulation('ulleungdo');
    const origin = REGION_ORIGINS.ulleungdo;

    game.moveTo({ x: origin.x + 365, y: origin.y + 470 });
    expect(game.player.destination).not.toEqual({ x: origin.x + 365, y: origin.y + 470 });

    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungdo');
    const killMonster = (game as unknown as { killMonster: (monster: typeof guards[number]) => void }).killMonster.bind(game);
    guards.forEach(killMonster);
    game.moveTo({ x: origin.x + 768, y: origin.y - 200 });
    expect(game.player.destination).toEqual({ x: origin.x + 768, y: origin.y - 200 });

    game.player.level = 10;
    game.moveTo({ x: origin.x + 768, y: REGION_ORIGINS.ulleungvillage.y + 20 });
    expect(game.player.destination).toEqual({ x: origin.x + 768, y: REGION_ORIGINS.ulleungvillage.y + 20 });
  });

  it('spawns every prison guard on open courtyard ground instead of walls or props', () => {
    const game = new GameSimulation('ulleungdo');
    const origin = REGION_ORIGINS.ulleungdo;
    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungdo');
    const resolveObstacleCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);

    expect(guards).toHaveLength(6);
    for (const guard of guards) {
      const spawn = { ...guard.spawn };
      expect(spawn.y).toBeGreaterThanOrEqual(origin.y + 545);
      expect(resolveObstacleCollision(spawn, 24)).toBe(false);
    }
  });

  it('keeps painted houses solid and the island route between regions open', () => {
    const hunt = new GameSimulation('ulleunghunt');
    const huntOrigin = REGION_ORIGINS.ulleunghunt;
    hunt.moveTo({ x: huntOrigin.x + 405, y: huntOrigin.y + 325 });
    expect(hunt.player.destination).not.toEqual({ x: huntOrigin.x + 405, y: huntOrigin.y + 325 });

    const ridge = new GameSimulation('ulleungridge');
    const ridgeOrigin = REGION_ORIGINS.ulleungridge;
    ridge.moveTo({ x: ridgeOrigin.x + 768, y: REGION_ORIGINS.ulleungdo.y + 20 });
    expect(ridge.player.destination).toEqual({ x: ridgeOrigin.x + 768, y: REGION_ORIGINS.ulleungdo.y + 20 });
  });

  it('keeps Ulleung tree roots, palisades and punishment platforms solid', () => {
    const coast = new GameSimulation('ulleungcoast');
    const coastOrigin = REGION_ORIGINS.ulleungcoast;
    coast.moveTo({ x: coastOrigin.x + 345, y: coastOrigin.y + 530 });
    expect(coast.player.destination).not.toEqual({ x: coastOrigin.x + 345, y: coastOrigin.y + 530 });

    const ridge = new GameSimulation('ulleungridge');
    const ridgeOrigin = REGION_ORIGINS.ulleungridge;
    ridge.moveTo({ x: ridgeOrigin.x + 400, y: ridgeOrigin.y + 120 });
    expect(ridge.player.destination).not.toEqual({ x: ridgeOrigin.x + 400, y: ridgeOrigin.y + 120 });

    const government = new GameSimulation('ulleungvillage');
    const governmentOrigin = REGION_ORIGINS.ulleungvillage;
    government.moveTo({ x: governmentOrigin.x + 960, y: governmentOrigin.y + 285 });
    expect(government.player.destination).not.toEqual({ x: governmentOrigin.x + 960, y: governmentOrigin.y + 285 });
  });

  it('redirects clicks on Ulleung sea, cliffs and tree-covered shoulders back onto land', () => {
    const coast = new GameSimulation('ulleungcoast');
    const coastOrigin = REGION_ORIGINS.ulleungcoast;
    const leftSea = { x: coastOrigin.x + 80, y: coastOrigin.y + 500 };
    coast.moveTo(leftSea);
    expect(coast.player.destination).not.toEqual(leftSea);
    expect(coast.player.destination!.x).toBeGreaterThan(coastOrigin.x + 300);

    const meadow = new GameSimulation('ulleungmeadow');
    const meadowOrigin = REGION_ORIGINS.ulleungmeadow;
    const rightShore = { x: meadowOrigin.x + 1450, y: meadowOrigin.y + 160 };
    meadow.moveTo(rightShore);
    expect(meadow.player.destination).not.toEqual(rightShore);
    expect(meadow.player.destination!.x).toBeLessThan(meadowOrigin.x + 1200);
  });

  it('keeps the full island center road walkable across every map seam', () => {
    const route: Array<['ulleungcoast' | 'ulleungmeadow' | 'ulleunghunt' | 'ulleungridge', number]> = [
      ['ulleungcoast', REGION_ORIGINS.ulleungmeadow.y + 20],
      ['ulleungmeadow', REGION_ORIGINS.ulleunghunt.y + 20],
      ['ulleunghunt', REGION_ORIGINS.ulleungridge.y + 20],
      ['ulleungridge', REGION_ORIGINS.ulleungdo.y + 20],
    ];
    for (const [region, seamY] of route) {
      const game = new GameSimulation(region);
      const destination = { x: REGION_ORIGINS[region].x + 768, y: seamY };
      game.moveTo(destination);
      expect(game.player.destination).toEqual(destination);
    }
  });

  it('continues one click through an island seam instead of stopping at the next map edge', () => {
    const southbound = new GameSimulation('ulleunghunt');
    southbound.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const ridgeTarget = {
      x: REGION_ORIGINS.ulleungridge.x + 768,
      y: REGION_ORIGINS.ulleungridge.y + 420,
    };
    southbound.moveTo(ridgeTarget);
    expect(southbound.getMovementGoal()).toEqual(ridgeTarget);
    for (let step = 0; step < 240 && southbound.player.destination; step += 1) southbound.update(0.05);
    expect(southbound.region).toBe('ulleungridge');
    expect(southbound.player.destination).toBeNull();
    expect(Math.hypot(southbound.player.x - ridgeTarget.x, southbound.player.y - ridgeTarget.y)).toBeLessThanOrEqual(5.1);

    const northbound = new GameSimulation('ulleungridge');
    northbound.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const huntTarget = {
      x: REGION_ORIGINS.ulleunghunt.x + 742,
      y: REGION_ORIGINS.ulleunghunt.y + 610,
    };
    northbound.moveTo(huntTarget);
    expect(northbound.getMovementGoal()).toEqual(huntTarget);
    for (let step = 0; step < 240 && northbound.player.destination; step += 1) northbound.update(0.05);
    expect(northbound.region).toBe('ulleunghunt');
    expect(northbound.player.destination).toBeNull();
    expect(Math.hypot(northbound.player.x - huntTarget.x, northbound.player.y - huntTarget.y)).toBeLessThanOrEqual(5.1);
  });

  it('stops a locked ridge-to-prison approach outside the gate without snapping or retaining a destination', () => {
    const game = new GameSimulation('ulleungridge');
    game.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const prisonPassageTop = REGION_ORIGINS.ulleungridge.y + MAP_HEIGHT;
    const regionHandoffY = prisonPassageTop + 256 + 36;
    const startY = regionHandoffY - 8;
    const blockedTarget = {
      x: ulleungRoadCenterAtY(regionHandoffY + 24),
      y: regionHandoffY + 24,
    };
    game.player.x = ulleungRoadCenterAtY(startY);
    game.player.y = startY;
    game.moveTo(blockedTarget);

    let maximumStep = 0;
    for (let step = 0; step < 80 && game.player.destination; step += 1) {
      const previous = { x: game.player.x, y: game.player.y };
      game.update(0.05);
      maximumStep = Math.max(
        maximumStep,
        Math.hypot(game.player.x - previous.x, game.player.y - previous.y),
      );
    }

    expect(maximumStep).toBeLessThanOrEqual(8.1);
    expect(game.player.y).toBeLessThan(REGION_ORIGINS.ulleungdo.y);
    expect(game.player.destination).toBeNull();
    expect(game.getMovementGoal()).toBeNull();
  });

  it('completes ridge-to-prison travel in both directions after the prison gate opens', () => {
    const game = new GameSimulation('ulleungridge');
    game.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    (game as unknown as { prisonGateOpen: boolean }).prisonGateOpen = true;
    const prisonTargetY = REGION_ORIGINS.ulleungdo.y + 180;
    const prisonTarget = {
      x: ulleungRoadCenterAtY(prisonTargetY),
      y: prisonTargetY,
    };

    game.moveTo(prisonTarget);
    for (let step = 0; step < 320 && game.player.destination; step += 1) game.update(0.05);
    expect(game.region).toBe('ulleungdo');
    expect(game.player.destination).toBeNull();
    expect(Math.hypot(game.player.x - prisonTarget.x, game.player.y - prisonTarget.y)).toBeLessThanOrEqual(5.1);

    const ridgeTargetY = REGION_ORIGINS.ulleungridge.y + 850;
    const ridgeTarget = {
      x: ulleungRoadCenterAtY(ridgeTargetY),
      y: ridgeTargetY,
    };
    game.moveTo(ridgeTarget);
    for (let step = 0; step < 320 && game.player.destination; step += 1) game.update(0.05);
    expect(game.region).toBe('ulleungridge');
    expect(game.player.destination).toBeNull();
    expect(Math.hypot(game.player.x - ridgeTarget.x, game.player.y - ridgeTarget.y)).toBeLessThanOrEqual(5.1);
  });

  it('routes a short 230px click through the hunting-ground center road', () => {
    const game = new GameSimulation('ulleunghunt');
    game.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const origin = REGION_ORIGINS.ulleunghunt;
    const targetY = origin.y + 850;
    const destination = {
      x: ulleungRoadCenterAtY(targetY),
      y: targetY,
    };
    expect(Math.abs(destination.y - game.player.y)).toBe(230);

    game.moveTo(destination);
    for (let step = 0; step < 120 && game.player.destination; step += 1) game.update(0.05);

    expect(game.player.destination).toBeNull();
    expect(Math.hypot(game.player.x - destination.x, game.player.y - destination.y)).toBeLessThanOrEqual(5.1);
  });

  it('corrects a click on a remote adjacent-region obstacle before it can leave a permanent destination', () => {
    const game = new GameSimulation('ulleungmeadow');
    game.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const huntOrigin = REGION_ORIGINS.ulleunghunt;
    const blockedHutCenter = {
      x: huntOrigin.x + 405,
      y: huntOrigin.y + 325,
    };

    game.moveTo(blockedHutCenter);
    expect(game.getMovementGoal()).not.toEqual(blockedHutCenter);
    for (let step = 0; step < 400 && game.player.destination; step += 1) game.update(0.05);

    const resolveObstacleCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);
    expect(game.region).toBe('ulleunghunt');
    expect(game.player.destination).toBeNull();
    expect(resolveObstacleCollision({ x: game.player.x, y: game.player.y }, 20)).toBe(false);
  });

  it('follows the curved island road on a long click inside the same hunting region', () => {
    const game = new GameSimulation('ulleunghunt');
    game.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const origin = REGION_ORIGINS.ulleunghunt;
    game.player.x = origin.x + 800;
    game.player.y = origin.y + 250;
    const destination = {
      x: origin.x + 850,
      y: origin.y + 650,
    };

    game.moveTo(destination);
    const internals = game as unknown as {
      playerRoute: Array<{ x: number; y: number }>;
      movementWaypoint: { x: number; y: number } | null;
    };
    expect(game.getMovementGoal()).toEqual(destination);
    expect(internals.playerRoute.length).toBeGreaterThan(2);
    expect(internals.movementWaypoint).not.toEqual(destination);

    for (let step = 0; step < 200 && game.player.destination; step += 1) game.update(0.05);
    expect(game.player.destination).toBeNull();
    expect(Math.hypot(game.player.x - destination.x, game.player.y - destination.y)).toBeLessThanOrEqual(5.1);
  });

  it('keeps a long clear click direct instead of dragging the player to the island road center', () => {
    const game = new GameSimulation('ulleungmeadow');
    game.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const origin = REGION_ORIGINS.ulleungmeadow;
    const start = { x: origin.x + 768, y: origin.y + 250 };
    const destination = { x: origin.x + 780, y: origin.y + 760 };
    game.player.x = start.x;
    game.player.y = start.y;

    game.moveTo(destination);
    const internals = game as unknown as {
      playerRoute: Array<{ x: number; y: number }>;
      movementWaypoint: { x: number; y: number } | null;
    };
    expect(internals.playerRoute).toEqual([]);
    expect(internals.movementWaypoint).toEqual(destination);

    for (let step = 0; step < 100 && game.player.destination; step += 1) game.update(0.05);
    expect(game.player.destination).toBeNull();
    expect(Math.hypot(game.player.x - destination.x, game.player.y - destination.y)).toBeLessThanOrEqual(5.1);
  });

  it('builds island road waypoints whose connecting segments do not cut through scenery', () => {
    const game = new GameSimulation('ulleunghunt');
    game.monsters.forEach((monster) => {
      monster.alive = false;
      monster.respawnAt = Number.POSITIVE_INFINITY;
    });
    const destination = {
      x: REGION_ORIGINS.ulleungridge.x + 768,
      y: REGION_ORIGINS.ulleungridge.y + 420,
    };
    game.moveTo(destination);
    const internals = game as unknown as {
      playerRoute: Array<{ x: number; y: number }>;
      movementWaypoint: { x: number; y: number } | null;
      isTravelSegmentClear: (
        from: { x: number; y: number },
        to: { x: number; y: number },
        bodyRadius: number,
      ) => boolean;
    };
    const waypoints = [
      ...(internals.movementWaypoint ? [internals.movementWaypoint] : []),
      ...internals.playerRoute,
    ];
    let previous = { x: game.player.x, y: game.player.y };
    for (const waypoint of waypoints) {
      expect(internals.isTravelSegmentClear(previous, waypoint, 20), `${previous.x},${previous.y} -> ${waypoint.x},${waypoint.y}`)
        .toBe(true);
      previous = waypoint;
    }
  });

  it('keeps nearby island combat movement direct and responsive', () => {
    const game = new GameSimulation('ulleunghunt');
    const destination = { x: game.player.x + 80, y: game.player.y };
    game.moveTo(destination);
    const internals = game as unknown as {
      playerRoute: Array<{ x: number; y: number }>;
      movementWaypoint: { x: number; y: number } | null;
    };
    expect(internals.playerRoute).toEqual([]);
    expect(internals.movementWaypoint).toEqual(game.getMovementGoal());
  });

  it('spawns island animals and soldiers on walkable ground instead of scenery', () => {
    const islandRegions = ['ulleungcoast', 'ulleungmeadow', 'ulleunghunt', 'ulleungridge', 'ulleungdo', 'ulleungvillage'] as const;
    const blockedSpawns: string[] = [];
    for (const region of islandRegions) {
      const game = new GameSimulation(region);
      const resolveObstacleCollision = (game as unknown as {
        resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
      }).resolveObstacleCollision.bind(game);
      for (const monster of game.monsters.filter((entry) => entry.region === region)) {
        if (resolveObstacleCollision({ ...monster.spawn }, 24)) {
          blockedSpawns.push(`${region}: ${monster.kind} at ${monster.spawn.x},${monster.spawn.y}`);
        }
      }
    }
    expect(blockedSpawns).toEqual([]);
  });

  it('keeps every shared Ulleung edge-tree root solid while leaving the centre road open', () => {
    for (const region of ULLEUNG_REGION_IDS) {
      const game = new GameSimulation(region);
      const isRoutePointClear = (game as unknown as {
        isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
      }).isRoutePointClear.bind(game);
      const origin = REGION_ORIGINS[region];

      for (const site of ULLEUNG_EDGE_TREE_SITES) {
        const y = origin.y + site.y;
        expect(isRoutePointClear({ x: origin.x + site.x, y }, 20), `${region} tree ${site.x},${site.y}`)
          .toBe(false);
        expect(isRoutePointClear({ x: ulleungRoadCenterAtY(y), y }, 20), `${region} road at ${site.y}`)
          .toBe(true);
      }
    }
  });

  it('keeps every village farm plot solid without narrowing the central road', () => {
    const game = new GameSimulation('village');
    const isRoutePointClear = (game as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    }).isRoutePointClear.bind(game);

    for (const plot of VILLAGE_FARM_PLOTS) {
      const y = VILLAGE_TOP + plot.y - plot.height / 2;
      expect(isRoutePointClear({ x: plot.x, y }, 0), plot.id).toBe(false);
      expect(isRoutePointClear({ x: 785, y }, 20), `central road at ${plot.id}`).toBe(true);
    }
  });

  it('starts the player outside scenery in every Ulleung region', () => {
    const islandRegions = [
      'ulleungcoast',
      'ulleungmeadow',
      'ulleunghunt',
      'ulleungridge',
      'ulleungdo',
      'ulleungvillage',
    ] as const;
    for (const region of islandRegions) {
      const game = new GameSimulation(region);
      const resolveObstacleCollision = (game as unknown as {
        resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
      }).resolveObstacleCollision.bind(game);
      expect(
        resolveObstacleCollision({ x: game.player.x, y: game.player.y }, 20),
        `${region}: ${game.player.x - REGION_ORIGINS[region].x},${game.player.y - REGION_ORIGINS[region].y}`,
      ).toBe(false);
    }
  });

  it('keeps prison guards neutral until one is struck, then sends a capped front line', () => {
    const game = new GameSimulation('ulleungdo');
    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungdo');
    const first = guards[0];
    game.player.x = first.x - 70;
    game.player.y = first.y;
    game.moveTo({ x: first.x - 60, y: first.y });
    for (let step = 0; step < 8; step += 1) game.update(0.05);
    expect(guards.every((guard) => !guard.aggro)).toBe(true);

    game.selectMonster(first.id);
    for (let step = 0; step < 8; step += 1) game.update(0.05);
    expect(guards.filter((guard) => guard.aggro).length).toBeGreaterThanOrEqual(2);
    expect(guards.filter((guard) => guard.aggro).length).toBeLessThanOrEqual(3);
    expect(game.drainEvents().some((event) => event.type === 'prison-guards-provoked')).toBe(true);
  });

  it('starts a forgiving two-guard prison ambush after the prologue', () => {
    const game = new GameSimulation('ulleungdo');
    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungdo');
    game.startPrisonAmbush();
    expect(guards.filter((guard) => guard.aggro)).toHaveLength(2);
    expect(Math.max(...guards.map((guard) => guard.maxHp))).toBeLessThanOrEqual(68);
    expect(Math.max(...guards.map((guard) => guard.damage))).toBeLessThanOrEqual(4);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({ type: 'prison-guards-provoked', cause: 'execution' }));
  });

  it('reveals the corrupt magistrate and a mass dock invasion, then liberates villagers after both fall', () => {
    const game = new GameSimulation('ulleungvillage');
    const villageGuards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungvillage');
    const magistrate = game.monsters.find((monster) => monster.kind === 'ulleung-magistrate')!;
    const killMonster = (game as unknown as { killMonster: (monster: typeof magistrate) => void }).killMonster.bind(game);
    expect(magistrate.alive).toBe(false);
    villageGuards.forEach(killMonster);
    const invaders = game.monsters.filter((monster) => monster.region === 'ulleungvillage' && monster.kind.startsWith('wako-'));
    expect(magistrate.alive).toBe(true);
    expect(invaders).toHaveLength(18);
    expect(invaders.every((invader) => !invader.alive)).toBe(true);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'ulleung-magistrate-spawned' }),
      expect.objectContaining({ type: 'wako-pact-revealed' }),
    ]));

    for (let step = 0; step < 120; step += 1) game.update(0.05);
    expect(invaders.every((invader) => invader.alive)).toBe(true);
    expect(invaders.filter((invader) => invader.aggro).length).toBeGreaterThanOrEqual(4);
    expect(invaders.filter((invader) => invader.aggro).length).toBeLessThanOrEqual(6);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({ type: 'wako-invasion-started', count: 18 }));
    killMonster(magistrate);
    expect(game.getMovementGoal()).toEqual(expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number),
    }));
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({ type: 'government-dock-guidance' }));
    expect(game.isUlleungVillageLiberated()).toBe(false);
    invaders.forEach(killMonster);
    expect(game.isUlleungVillageLiberated()).toBe(true);
    expect(game.drainEvents().some((event) => event.type === 'ulleung-village-liberated')).toBe(true);
  });

  it('unlocks the government dock only after liberation and lands the player in mainland Moonlight Village', () => {
    const game = new GameSimulation('ulleungvillage');
    expect(game.useGovernmentDock()).toBe(false);
    expect(game.drainEvents()).toContainEqual({ type: 'government-dock-blocked' });

    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungvillage');
    const magistrate = game.monsters.find((monster) => monster.kind === 'ulleung-magistrate' && monster.region === 'ulleungvillage')!;
    const killMonster = (game as unknown as { killMonster: (monster: typeof magistrate) => void }).killMonster.bind(game);
    guards.forEach(killMonster);
    for (let step = 0; step < 120; step += 1) game.update(0.05);
    killMonster(magistrate);
    game.monsters.filter((monster) => monster.kind.startsWith('wako-')).forEach(killMonster);
    game.drainEvents();

    expect(game.useGovernmentDock()).toBe(true);
    expect(game.region).toBe('village');
    expect(game.player).toMatchObject({ x: 770, y: VILLAGE_TOP + 600, destination: null, targetId: null });
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      { type: 'government-dock-used', destination: 'village' },
      { type: 'region-changed', region: 'village' },
    ]));
  });

  it('stages the expanded government compound as a twelve-guard gauntlet before the magistrate arena', () => {
    const game = new GameSimulation('ulleungvillage');
    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungvillage');
    const magistrate = game.monsters.find((monster) => monster.kind === 'ulleung-magistrate')!;
    expect(guards).toHaveLength(12);
    expect(magistrate.y).toBeGreaterThan(Math.max(...guards.map((guard) => guard.y)));
    expect(new Set(guards.map((guard) => guard.kind))).toEqual(new Set(['ulleung-guard', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain']));
    expect(magistrate.alive).toBe(false);
  });

  it('keeps government guards on patrol until struck, then alerts the whole compound', () => {
    const game = new GameSimulation('ulleungvillage');
    const guards = game.monsters.filter((monster) => isIslandGuard(monster.kind) && monster.region === 'ulleungvillage');
    const first = guards[0];
    game.player.x = first.x - 70;
    game.player.y = first.y;
    game.selectMonster(first.id);
    for (let step = 0; step < 8; step += 1) game.update(0.05);
    expect(guards.every((guard) => guard.aggro)).toBe(true);
    expect(game.drainEvents()).toContainEqual({ type: 'government-guards-provoked', monsterId: first.id });
  });

  it('gives executioners a readable heavy wind-up and lets captains rally nearby guards', () => {
    const game = new GameSimulation('ulleungvillage');
    const executioner = game.monsters.find((monster) => monster.kind === 'ulleung-executioner')!;
    const captain = game.monsters.find((monster) => monster.kind === 'ulleung-captain' && monster.region === 'ulleungvillage')!;
    const ally = game.monsters.find((monster) => monster !== captain && monster.region === 'ulleungvillage'
      && isIslandGuard(monster.kind) && Math.hypot(monster.x - captain.x, monster.y - captain.y) < 310)!;
    const updateGuard = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof executioner, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);

    executioner.attackCooldown = 0;
    updateGuard(executioner, 70, 0.05);
    expect(executioner.aiState).toBe('telegraph');
    expect(executioner.actionTimer).toBe(0.48);
    executioner.actionTimer = 0;
    updateGuard(executioner, 70, 0.05);
    expect(executioner.aiState).toBe('attack');

    ally.aggro = false;
    ally.aiState = 'patrol';
    captain.thinkTimer = 0;
    updateGuard(captain, 180, 0.05);
    expect(ally.aggro).toBe(true);
    expect(ally.aiState).toBe('alert');
    expect(captain.aiState).toBe('rally');
    expect(game.drainEvents()).toContainEqual({ type: 'guard-action', monsterId: captain.id, action: 'rally' });
  });

  it('gives ordinary swordsmen and spear veterans distinct readable lunges', () => {
    const game = new GameSimulation('ulleungvillage');
    const guard = game.monsters.find((monster) => monster.kind === 'ulleung-guard' && monster.region === 'ulleungvillage')!;
    const veteran = game.monsters.find((monster) => monster.kind === 'ulleung-veteran' && monster.region === 'ulleungvillage')!;
    const updateGuard = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof guard, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);

    guard.attackCooldown = 0;
    updateGuard(guard, 72, 0.05);
    expect(guard.aiState).toBe('telegraph');
    expect(game.drainEvents()).toContainEqual({ type: 'guard-action', monsterId: guard.id, action: 'lunge' });
    guard.actionTimer = 0;
    updateGuard(guard, 72, 0.05);
    expect(guard.aiState).toBe('attack');

    veteran.attackCooldown = 0;
    updateGuard(veteran, 80, 0.05);
    expect(veteran.aiState).toBe('telegraph');
    expect(game.drainEvents()).toContainEqual({ type: 'guard-action', monsterId: veteran.id, action: 'lunge' });
    veteran.actionTimer = 0;
    updateGuard(veteran, 80, 0.05);
    expect(veteran.aiState).toBe('attack');
  });

  it('reserves brace for shield formations and makes it reduce incoming damage', () => {
    const game = new GameSimulation('yeongwolhq');
    const shield = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-shield')!;
    const swordsman = game.monsters.find((monster) =>
      monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-swordsman')!;
    const internals = game as unknown as {
      updateUlleungGuardAi: (monster: typeof shield, distance: number, dt: number) => void;
      damageAgainstMonster: (monster: typeof shield, damage: number) => number;
    };
    shield.attackCooldown = 0;
    swordsman.attackCooldown = 0;

    internals.updateUlleungGuardAi(shield, 82, 0.05);
    internals.updateUlleungGuardAi(swordsman, 82, 0.05);

    expect(shield.aiState).toBe('brace');
    expect(swordsman.aiState).toBe('telegraph');
    expect(internals.damageAgainstMonster(shield, 100)).toBe(48);
    expect(internals.damageAgainstMonster(swordsman, 100)).toBe(100);
    expect(game.drainEvents()).toContainEqual({
      type: 'guard-action',
      monsterId: shield.id,
      action: 'brace',
    });
  });

  it('keeps Ulleung government archers in the rear line and fires from bow range', () => {
    const game = new GameSimulation('ulleungvillage');
    const archer = game.monsters.find((monster) => monster.kind === 'ulleung-archer'
      && monster.region === 'ulleungvillage')!;
    const updateGuard = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof archer, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);
    archer.attackCooldown = 0;
    updateGuard(archer, 180, 0.05);
    expect(archer.aiState).toBe('attack');
    expect(game.drainEvents()).toContainEqual({
      type: 'monster-attack',
      monsterId: archer.id,
      damage: 10,
    });
  });

  it('keeps a wide unobstructed route from the government outer gate to the boss courtyard', () => {
    const game = new GameSimulation('ulleungvillage');
    const origin = REGION_ORIGINS.ulleungvillage;
    game.player.x = origin.x + 768;
    game.player.y = origin.y + 180;
    game.moveTo({ x: origin.x + 768, y: origin.y + 860 });
    for (let step = 0; step < 120; step += 1) game.update(0.05);
    expect(game.player.x).toBeCloseTo(origin.x + 768, 0);
    expect(game.player.y).toBeGreaterThanOrEqual(origin.y + 840);
  });

  it('opens the government compound across the broader side yards and deeper inner court', () => {
    const game = new GameSimulation('ulleungvillage');
    const origin = REGION_ORIGINS.ulleungvillage;
    game.moveTo({ x: origin.x + 80, y: origin.y + 940 });
    expect(game.player.destination).toEqual({ x: origin.x + 110, y: origin.y + 940 });
  });

  it('casts three weapon skills with real damage, movement, and cooldowns', () => {
    const game = new GameSimulation('solgogae');
    game.skillRanks['leap-strike'] = 1;
    game.skillRanks['moon-dash'] = 1;
    game.inventory.push({ instanceId: 'skill-weapon', itemId: 'worn-hwando' });
    game.equipItem('skill-weapon');
    for (let step = 0; step < 4; step += 1) game.update(0.05);
    const enemies = game.monsters.filter((monster) => monster.region === 'solgogae').slice(0, 2);
    enemies.forEach((monster, index) => {
      monster.x = game.player.x + 55 + index * 18;
      monster.y = game.player.y;
      monster.hp = monster.maxHp;
    });
    const before = enemies.map((monster) => monster.hp);
    game.castSkill('whirlwind');
    expect(enemies.every((monster, index) => monster.hp < before[index])).toBe(true);
    expect(game.skillCooldowns.whirlwind).toBeGreaterThan(0);
    expect(game.drainEvents().some((event) => event.type === 'skill-impact' && event.targets >= 2)).toBe(true);

    for (let step = 0; step < 15; step += 1) game.update(0.05);
    game.skillCooldowns['leap-strike'] = 0;
    const start = { x: game.player.x, y: game.player.y };
    game.player.facing = 0;
    game.castSkill('leap-strike');
    expect(game.player.x).toBeGreaterThan(start.x);

    for (let step = 0; step < 15; step += 1) game.update(0.05);
    game.skillCooldowns['moon-dash'] = 0;
    const dashStart = game.player.x;
    game.castSkill('moon-dash');
    expect(game.player.x).toBeGreaterThan(dashStart);
  });

  it('does not overlap movement skills while a previous combat action is active', () => {
    const game = new GameSimulation('solgogae');
    game.skillRanks['leap-strike'] = 1;
    game.inventory.push({ instanceId: 'skill-lock-weapon', itemId: 'worn-hwando' });
    game.equipItem('skill-lock-weapon');
    game.drainEvents();
    game.castSkill('whirlwind');
    const positionAfterWhirlwind = { x: game.player.x, y: game.player.y };
    game.skillCooldowns['leap-strike'] = 0;
    game.castSkill('leap-strike');
    expect({ x: game.player.x, y: game.player.y }).toEqual(positionAfterWhirlwind);
    expect(game.drainEvents()).toContainEqual({
      type: 'skill-blocked',
      skillId: 'leap-strike',
      reason: 'cooldown',
    });
  });

  it('stops leap, dash, and quick-step before crossing a blocked terrain footprint', () => {
    const prepare = () => {
      const game = new GameSimulation('solgogae');
      game.monsters.forEach((monster) => { monster.alive = false; });
      game.inventory.push({ instanceId: 'terrain-safety-weapon', itemId: 'worn-hwando' });
      game.equipItem('terrain-safety-weapon');
      game.skillRanks['leap-strike'] = 1;
      game.skillRanks['moon-dash'] = 1;
      game.player.x = 950;
      game.player.y = 690;
      game.player.facing = 0;
      game.player.attackCooldown = 0;
      game.drainEvents();
      return game;
    };

    const leap = prepare();
    leap.castSkill('leap-strike');
    expect(leap.player.x).toBeLessThanOrEqual(1028);

    const dash = prepare();
    dash.castSkill('moon-dash');
    expect(dash.player.x).toBeLessThanOrEqual(1028);

    const quickStep = prepare();
    quickStep.quickStep();
    expect(quickStep.player.x).toBeLessThanOrEqual(1028);
  });

  it('requires a weapon for martial skills and spends points to strengthen them', () => {
    const game = new GameSimulation('solgogae');
    game.castSkill('whirlwind');
    expect(game.drainEvents()).toContainEqual({ type: 'skill-blocked', skillId: 'whirlwind', reason: 'weapon' });
    const points = game.skillPoints;
    game.learnSkill('whirlwind');
    expect(game.skillRanks.whirlwind).toBe(2);
    expect(game.skillPoints).toBe(points - 1);
  });

  it('unlocks martial arts through training, masters, manuals, and story events', () => {
    const game = new GameSimulation('solgogae');
    const baseAttack = game.getAttackPower();
    game.learnSkill('blade-mastery');
    expect(game.skillRanks['blade-mastery']).toBe(1);
    expect(game.getAttackPower()).toBe(Math.round(baseAttack * 1.2));

    game.player.level = 8;
    game.player.gold = 1_000;
    const maxHp = game.player.maxHp;
    expect(game.learnSkillFromMaster('iron-constitution')).toBe(true);
    expect(game.player.maxHp).toBe(maxHp + Math.round(maxHp * 0.2));

    game.inventory.push({ instanceId: 'crescent-book', itemId: 'crescent-manual' });
    game.useItem('crescent-book');
    expect(game.skillRanks['crescent-wave']).toBe(1);
    expect(game.inventory.some((item) => item.instanceId === 'crescent-book')).toBe(false);
    expect(game.drainEvents()).toContainEqual({
      type: 'skill-unlocked',
      skillId: 'crescent-wave',
      rank: 1,
      source: 'manual',
    });
  });

  it('fires the crescent manual skill as a wide forward area attack', () => {
    const game = new GameSimulation('solgogae');
    game.skillRanks['crescent-wave'] = 1;
    game.inventory.push({ instanceId: 'crescent-weapon', itemId: 'worn-hwando' });
    game.equipItem('crescent-weapon');
    for (let step = 0; step < 4; step += 1) game.update(0.05);
    game.player.facing = 0;
    const enemies = game.monsters.filter((monster) => monster.region === 'solgogae').slice(0, 3);
    enemies.forEach((monster, index) => {
      monster.x = game.player.x + 170 + index * 18;
      monster.y = game.player.y + (index - 1) * 35;
      monster.hp = monster.maxHp;
    });
    const hpBefore = enemies.map((monster) => monster.hp);
    game.castSkill('crescent-wave');
    expect(enemies.every((monster, index) => monster.hp < hpBefore[index])).toBe(true);
    expect(game.drainEvents().some((event) => event.type === 'skill-impact'
      && event.skillId === 'crescent-wave' && event.targets >= 3)).toBe(true);
  });

  it('hires followers through distinct routes and makes them follow and assist attacks', () => {
    const game = new GameSimulation('solgogae');
    game.player.level = 8;
    game.player.gold = 1_000;
    game.skillRanks['crescent-wave'] = 1;
    (game as unknown as { prisonGateOpen: boolean }).prisonGateOpen = true;
    expect(game.recruitFollower('peasant-militia')).toBe(true);
    expect(game.recruitFollower('government-defector')).toBe(true);
    expect(game.recruitFollower('special-warrior')).toBe(true);
    expect(game.followers.map((follower) => follower.route)).toEqual(['tavern', 'defection', 'hidden-contract']);

    const target = game.monsters.find((monster) => monster.region === 'solgogae')!;
    target.x = game.player.x + 72;
    target.y = game.player.y;
    target.hp = target.maxHp;
    game.selectMonster(target.id);
    const hpBefore = target.hp;
    for (let step = 0; step < 28; step += 1) game.update(0.05);
    expect(target.hp).toBeLessThan(hpBefore);
    expect(game.drainEvents().some((event) => event.type === 'follower-attack')).toBe(true);
    expect(game.followers.every((follower) => Math.hypot(follower.x - game.player.x, follower.y - game.player.y) < 260)).toBe(true);
  });

  it.each([
    ['peasant-militia', 'blade'],
    ['government-defector', 'spear'],
    ['special-warrior', 'blade'],
    ['jurchen-vanguard', 'spear'],
    ['jurchen-bowguard', 'arrow'],
    ['jurchen-captain', 'command'],
  ] satisfies Array<[FollowerKind, FollowerAttackKind]>)(
    'emits the %s follower attack as %s',
    (kind, attackKind) => {
      const game = new GameSimulation('solgogae');
      const target = game.monsters.find((monster) => monster.region === 'solgogae')!;
      target.hp = target.maxHp;
      const follower: FollowerState = {
        id: `attack-kind-${kind}`,
        kind,
        name: kind,
        route: kind.startsWith('jurchen-') ? 'invasion' : 'tavern',
        visualKind: kind === 'jurchen-bowguard' ? 'manchu-archer'
          : kind === 'jurchen-vanguard' ? 'manchu-lancer'
            : kind === 'jurchen-captain' ? 'manchu-captain'
              : kind === 'government-defector' ? 'yeongwol-spearman'
                : kind === 'special-warrior' ? 'jeonju-commander' : 'bandit',
        x: target.x - 54,
        y: target.y,
        facing: 0,
        velocity: { x: 0, y: 0 },
        attackCooldown: 0,
        actionTimer: 0,
        targetId: target.id,
      };
      game.followers.push(follower);
      game.selectMonster(target.id);
      game.update(0.05);
      expect(game.drainEvents()).toContainEqual(expect.objectContaining({
        type: 'follower-attack',
        followerId: follower.id,
        targetId: target.id,
        attackKind,
      }));
    },
  );

  it('persists the recruited party in a single-player save', () => {
    const game = new GameSimulation('solgogae');
    game.player.gold = 1_000;
    game.recruitFollower('peasant-militia');
    const restored = new GameSimulation('solgogae');
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.followers).toHaveLength(1);
    expect(restored.followers[0]).toMatchObject({ kind: 'peasant-militia', name: '돌쇠', route: 'tavern' });
  });

  it('blocks the government road below level ten and sends Kim Donghyeok back to train', () => {
    const game = new GameSimulation('ulleungdo');
    expect(game.requestGovernmentEntry()).toBe(false);
    expect(game.player.destination).toEqual({ x: REGION_ORIGINS.ulleungdo.x + 768, y: REGION_ORIGINS.ulleungdo.y + 610 });
    expect(game.drainEvents()).toContainEqual({ type: 'government-entry-blocked', requiredLevel: 10 });
    game.moveTo({ x: REGION_ORIGINS.ulleungvillage.x + 768, y: REGION_ORIGINS.ulleungvillage.y + 20 });
    expect(game.player.destination).toEqual({ x: REGION_ORIGINS.ulleungdo.x + 768, y: REGION_ORIGINS.ulleungdo.y + 610 });
    expect(game.drainEvents()).toContainEqual({ type: 'government-entry-blocked', requiredLevel: 10 });
    game.player.level = 10;
    expect(game.requestGovernmentEntry()).toBe(true);
    game.moveTo({ x: REGION_ORIGINS.ulleungvillage.x + 768, y: REGION_ORIGINS.ulleungvillage.y + 20 });
    expect(game.player.destination?.y).toBe(REGION_ORIGINS.ulleungvillage.y + 20);
  });

  it('starts a timed regional event with an island-specific objective', () => {
    const game = new GameSimulation('ulleunghunt');
    for (let step = 0; step < 241; step += 1) game.update(0.05);
    expect(game.activeWorldEvent).toMatchObject({
      kind: 'guard-patrol',
      region: 'ulleunghunt',
      title: '관아 징세 순찰대',
    });
    expect(game.drainEvents().some((event) => event.type === 'world-event-started')).toBe(true);
  });

  it('never resurrects story guards through random events in the prison or government office', () => {
    const prison = new GameSimulation('ulleungdo');
    const guard = prison.monsters.find((monster) => monster.region === 'ulleungdo')!;
    guard.alive = false;
    guard.hp = 0;
    guard.respawnAt = Number.POSITIVE_INFINITY;
    for (let step = 0; step < 500; step += 1) prison.update(0.05);
    expect(prison.activeWorldEvent).toBeNull();
    expect(guard.alive).toBe(false);

    const government = new GameSimulation('ulleungvillage');
    for (let step = 0; step < 500; step += 1) government.update(0.05);
    expect(government.activeWorldEvent).toBeNull();
  });

  it('returns Kim Donghyeok to his mainland home village after every island defeat', () => {
    const island = new GameSimulation('ulleungcoast');
    island.player.hp = 0;
    const defeatIsland = (island as unknown as { defeatPlayer: () => void }).defeatPlayer.bind(island);
    defeatIsland();
    expect(island.drainEvents()).toContainEqual({ type: 'player-defeated', respawnRegion: 'village' });
    for (let step = 0; step < 65; step += 1) island.update(0.05);
    expect(island.region).toBe('village');
    expect(island.drainEvents()).toEqual(expect.arrayContaining([
      { type: 'region-changed', region: 'village' },
      { type: 'player-respawn', region: 'village' },
    ]));

    const prison = new GameSimulation('ulleungdo');
    prison.player.hp = 0;
    const defeatPrison = (prison as unknown as { defeatPlayer: () => void }).defeatPlayer.bind(prison);
    defeatPrison();
    expect(prison.drainEvents()).toContainEqual({ type: 'player-defeated', respawnRegion: 'village' });
  });

  it('turns image landmarks into one-time exploration rewards', () => {
    const game = new GameSimulation('ulleungcoast');
    game.player.hp = 90;
    const potions = game.player.potions;
    expect(game.hasDiscoveredLandmark('herb-patch')).toBe(false);
    expect(game.interactLandmark('herb-patch')).toBe(true);
    expect(game.hasDiscoveredLandmark('herb-patch')).toBe(true);
    expect(game.player.hp).toBe(135);
    expect(game.player.potions).toBe(potions + 1);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({ type: 'landmark-discovered', landmarkId: 'herb-patch' }));
    expect(game.interactLandmark('herb-patch')).toBe(false);
    expect(game.drainEvents()).toContainEqual({ type: 'landmark-blocked', landmarkId: 'herb-patch', reason: 'used' });
  });

  it('keeps the government treasury locked until the magistrate is defeated', () => {
    const game = new GameSimulation('ulleungvillage');
    expect(game.interactLandmark('government-treasury')).toBe(false);
    expect(game.drainEvents()).toContainEqual({ type: 'landmark-blocked', landmarkId: 'government-treasury', reason: 'locked' });
  });

  it('orders the Ulleung campaign as northern fields, prison, then government office', () => {
    expect(REGION_ORIGINS.ulleungcoast.y).toBeLessThan(REGION_ORIGINS.ulleungmeadow.y);
    expect(REGION_ORIGINS.ulleungmeadow.y).toBeLessThan(REGION_ORIGINS.ulleunghunt.y);
    expect(REGION_ORIGINS.ulleunghunt.y).toBeLessThan(REGION_ORIGINS.ulleungridge.y);
    expect(REGION_ORIGINS.ulleungridge.y).toBeLessThan(REGION_ORIGINS.ulleungdo.y);
    expect(REGION_ORIGINS.ulleungdo.y).toBeLessThan(REGION_ORIGINS.ulleungvillage.y);
  });

  it('splits five soldier roles between the Yeongwol training yard and command headquarters', () => {
    const game = new GameSimulation('yeongwol');
    const outerSoldiers = game.monsters.filter((monster) => monster.region === 'yeongwol');
    const headquartersSoldiers = game.monsters.filter((monster) => monster.region === 'yeongwolhq');
    const soldiers = [...outerSoldiers, ...headquartersSoldiers];
    expect(outerSoldiers).toHaveLength(12);
    expect(headquartersSoldiers).toHaveLength(11);
    expect(new Set(soldiers.map((monster) => monster.kind))).toEqual(new Set([
      'yeongwol-swordsman',
      'yeongwol-spearman',
      'yeongwol-archer',
      'yeongwol-shield',
      'yeongwol-commander',
    ]));
    expect(Math.min(...outerSoldiers.map((monster) => monster.y))).toBeLessThan(REGION_ORIGINS.yeongwol.y + 400);
    expect(Math.max(...outerSoldiers.map((monster) => monster.y))).toBeGreaterThan(REGION_ORIGINS.yeongwol.y + 750);
    expect(headquartersSoldiers.every((monster) => monster.y < REGION_ORIGINS.yeongwol.y)).toBe(true);
  });

  it('keeps the Yeongwol training-yard road open from the outer gate to the inner gate', () => {
    const game = new GameSimulation('yeongwol');
    const origin = REGION_ORIGINS.yeongwol;
    game.player.x = origin.x + 768;
    game.player.y = origin.y + 900;
    game.moveTo({ x: origin.x + 768, y: origin.y + 120 });
    for (let step = 0; step < 140; step += 1) game.update(0.05);
    expect(game.player.x).toBeCloseTo(origin.x + 768, 0);
    expect(game.player.y).toBeLessThanOrEqual(origin.y + 145);
  });

  it('lets Yeongwol archers hold range while the commander rallies nearby formations', () => {
    const game = new GameSimulation('yeongwolhq');
    const archer = game.monsters.find((monster) => monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-archer')!;
    const commander = game.monsters.find((monster) => monster.kind === 'yeongwol-commander')!;
    const swordsman = game.monsters.find((monster) => monster.region === 'yeongwolhq' && monster.kind === 'yeongwol-swordsman')!;
    const updateSoldier = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof archer, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);
    (game as unknown as { hasMonsterLineOfSight: () => boolean }).hasMonsterLineOfSight = () => true;

    game.player.x = archer.x + 180;
    game.player.y = archer.y;
    archer.attackCooldown = 0;
    updateSoldier(archer, 180, 0.05);
    expect(archer.aiState).toBe('attack');
    expect(game.drainEvents()).toContainEqual({ type: 'monster-attack', monsterId: archer.id, damage: 13 });

    swordsman.aggro = false;
    swordsman.aiState = 'patrol';
    swordsman.x = commander.x + 40;
    swordsman.y = commander.y;
    commander.thinkTimer = 0;
    updateSoldier(commander, 170, 0.05);
    expect(commander.aiState).toBe('rally');
    expect(swordsman.aggro).toBe(true);
    expect(game.drainEvents()).toContainEqual({ type: 'guard-action', monsterId: commander.id, action: 'rally' });
  });

  it('connects the training-yard north gate and headquarters south gate as one continuous route', () => {
    const outer = new GameSimulation('yeongwol');
    outer.player.x = REGION_ORIGINS.yeongwol.x + 768;
    outer.player.y = REGION_ORIGINS.yeongwol.y - 4;
    outer.update(0.05);
    expect(outer.region).toBe('yeongwolhq');
    expect(outer.drainEvents()).toContainEqual({ type: 'region-changed', region: 'yeongwolhq' });

    const headquarters = new GameSimulation('yeongwolhq');
    headquarters.player.x = REGION_ORIGINS.yeongwolhq.x + 768;
    headquarters.player.y = REGION_ORIGINS.yeongwol.y + 4;
    headquarters.update(0.05);
    expect(headquarters.region).toBe('yeongwol');
    expect(headquarters.drainEvents()).toContainEqual({ type: 'region-changed', region: 'yeongwol' });
  });

  it('stages Jeonju as a large three-map campaign with six formation roles', () => {
    const game = new GameSimulation('jeonjufield');
    const field = game.monsters.filter((monster) => monster.region === 'jeonjufield');
    const gate = game.monsters.filter((monster) => monster.region === 'jeonjugate');
    const city = game.monsters.filter((monster) => monster.region === 'jeonju');
    expect(field).toHaveLength(19);
    expect(gate).toHaveLength(21);
    expect(city).toHaveLength(20);
    expect(new Set([...field, ...gate, ...city].filter((monster) => monster.kind.startsWith('jeonju-')).map((monster) => monster.kind)))
      .toEqual(new Set([
        'jeonju-swordsman',
        'jeonju-spearman',
        'jeonju-archer',
        'jeonju-shield',
        'jeonju-commander',
        'jeonju-militia-sickle',
      ]));
  });

  it('connects Wansan field, Pungnammun and Jeonju castle through their central gates', () => {
    const field = new GameSimulation('jeonjufield');
    field.player.x = REGION_ORIGINS.jeonjufield.x + 768;
    field.player.y = REGION_ORIGINS.jeonjufield.y - 4;
    field.update(0.05);
    expect(field.region).toBe('jeonjugate');

    const gate = new GameSimulation('jeonjugate');
    gate.player.x = REGION_ORIGINS.jeonjugate.x + 768;
    gate.player.y = REGION_ORIGINS.jeonjugate.y - 4;
    gate.update(0.05);
    expect(gate.region).toBe('jeonju');

    const city = new GameSimulation('jeonju');
    city.player.x = REGION_ORIGINS.jeonju.x + 768;
    city.player.y = REGION_ORIGINS.jeonjugate.y + 4;
    city.update(0.05);
    expect(city.region).toBe('jeonjugate');
  });

  it('keeps Jeonju central roads open while projecting clicks off solid scenery', () => {
    const gate = new GameSimulation('jeonjugate');
    const gateOrigin = REGION_ORIGINS.jeonjugate;
    gate.player.x = gateOrigin.x + 768;
    gate.player.y = gateOrigin.y + 900;
    gate.moveTo({ x: gateOrigin.x + 768, y: gateOrigin.y + 120 });
    for (let step = 0; step < 140; step += 1) gate.update(0.05);
    expect(gate.player.x).toBeCloseTo(gateOrigin.x + 768, 0);
    expect(gate.player.y).toBeLessThanOrEqual(gateOrigin.y + 145);

    const city = new GameSimulation('jeonju');
    const cityOrigin = REGION_ORIGINS.jeonju;
    city.player.x = cityOrigin.x + 768;
    city.player.y = cityOrigin.y + 875;
    city.moveTo({ x: cityOrigin.x + 768, y: cityOrigin.y + 285 });
    for (let step = 0; step < 110; step += 1) city.update(0.05);
    expect(city.player.x).toBeCloseTo(cityOrigin.x + 768, 0);
    expect(city.player.y).toBeLessThanOrEqual(cityOrigin.y + 310);

    city.moveTo({ x: cityOrigin.x + 250, y: cityOrigin.y + 760 });
    expect(city.player.destination).not.toEqual({ x: cityOrigin.x + 250, y: cityOrigin.y + 760 });
  });

  it('lets Jeonju archers keep range and the provincial commander rally the formation', () => {
    const game = new GameSimulation('jeonjugate');
    const archer = game.monsters.find((monster) => monster.region === 'jeonjugate' && monster.kind === 'jeonju-archer')!;
    const commander = game.monsters.find((monster) => monster.region === 'jeonjugate' && monster.kind === 'jeonju-commander')!;
    const swordsman = game.monsters.find((monster) => monster.region === 'jeonjugate' && monster.kind === 'jeonju-swordsman')!;
    const updateSoldier = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof archer, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);
    (game as unknown as { hasMonsterLineOfSight: () => boolean }).hasMonsterLineOfSight = () => true;

    game.player.x = archer.x + 180;
    game.player.y = archer.y;
    archer.attackCooldown = 0;
    updateSoldier(archer, 180, 0.05);
    expect(archer.aiState).toBe('attack');

    swordsman.aggro = false;
    swordsman.x = commander.x + 40;
    swordsman.y = commander.y;
    commander.thinkTimer = 0;
    updateSoldier(commander, 170, 0.05);
    expect(commander.aiState).toBe('rally');
    expect(swordsman.aggro).toBe(true);
  });

  it('walks through the new campaign gates instead of requiring route plaques', () => {
    const tangeum = new GameSimulation('tangeumdae');
    expect(tangeum.completeTangeumBattleForPlaytest()).toBe(true);
    tangeum.player.x = REGION_ORIGINS.tangeumdae.x + 768;
    tangeum.player.y = REGION_ORIGINS.tangeumdae.y + 65;
    tangeum.update(0.05);
    expect(tangeum.region).toBe('gyeongbokgate');

    const palaceGate = new GameSimulation('gyeongbokgate');
    palaceGate.player.x = REGION_ORIGINS.gyeongbokgate.x + 768;
    palaceGate.player.y = REGION_ORIGINS.gyeongbokgate.y - 6;
    palaceGate.update(0.05);
    expect(palaceGate.region).toBe('gyeongbokcourt');

    const court = new GameSimulation('gyeongbokcourt');
    court.player.x = REGION_ORIGINS.gyeongbokcourt.x + 768;
    court.player.y = REGION_ORIGINS.gyeongbokcourt.y - 6;
    court.update(0.05);
    expect(court.region).toBe('gyeongbokinner');
  });

  it('turns Tangeumdae into a 21-soldier annihilation battle with eight long-range gunners', () => {
    const game = new GameSimulation('tangeumdae');
    const startGold = game.player.gold;
    const progress = game.getTangeumBattleProgress();
    expect(progress).toEqual({ defeated: 0, total: 21, gunners: 8, cleared: false });

    game.travelToCampaignRegion('gyeongbokgate', 'south');
    expect(game.region).toBe('tangeumdae');
    expect(game.drainEvents()).toContainEqual({ type: 'tangeum-gate-blocked', remaining: 21 });

    const gunner = game.monsters.find((monster) => monster.region === 'tangeumdae' && monster.kind === 'japanese-gunner')!;
    gunner.attackCooldown = 0;
    const updateSoldier = (game as unknown as {
      updateUlleungGuardAi: (monster: typeof gunner, distance: number, dt: number) => void;
    }).updateUlleungGuardAi.bind(game);
    updateSoldier(gunner, 330, 0.05);
    expect(gunner.aiState).toBe('attack');
    expect(gunner.attackCooldown).toBeGreaterThanOrEqual(2.4);

    expect(game.completeTangeumBattleForPlaytest()).toBe(true);
    expect(game.getTangeumBattleProgress()).toEqual({ defeated: 21, total: 21, gunners: 8, cleared: true });
    expect(game.player.gold).toBe(startGold + 360);
    expect(game.drainEvents()).toContainEqual({
      type: 'tangeum-forces-annihilated',
      defeated: 21,
      gunners: 8,
      gold: 360,
    });

    const saved = game.exportSinglePlayerSnapshot();
    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(saved)).toBe(true);
    expect(restored.getTangeumBattleProgress()).toEqual({ defeated: 21, total: 21, gunners: 8, cleared: true });

    game.travelToCampaignRegion('gyeongbokgate', 'south');
    expect(game.region).toBe('gyeongbokgate');
  });

  it('keeps Gyeongbokgung units on courtyards and the axial palace gates walkable', () => {
    const palaceRegions = ['gyeongbokgate', 'gyeongbokcourt', 'gyeongbokinner'] as const;
    for (const region of palaceRegions) {
      const game = new GameSimulation(region);
      const origin = REGION_ORIGINS[region];
      const resolveObstacleCollision = (game as unknown as {
        resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
      }).resolveObstacleCollision.bind(game);

      for (const monster of game.monsters.filter((entry) => entry.region === region)) {
        expect(
          resolveObstacleCollision({ ...monster.spawn }, 24),
          `${region}: ${monster.kind} at ${monster.spawn.x - origin.x},${monster.spawn.y - origin.y}`,
        ).toBe(false);
      }

      game.moveTo({ x: origin.x + 768, y: origin.y + 60 });
      expect(game.player.destination).toEqual({ x: origin.x + 768, y: origin.y + 60 });
    }

    const gate = new GameSimulation('gyeongbokgate');
    const gateOrigin = REGION_ORIGINS.gyeongbokgate;
    gate.moveTo({ x: gateOrigin.x + 545, y: gateOrigin.y + 605 });
    expect(gate.player.destination).not.toEqual({ x: gateOrigin.x + 545, y: gateOrigin.y + 605 });

    const inner = new GameSimulation('gyeongbokinner');
    const innerOrigin = REGION_ORIGINS.gyeongbokinner;
    inner.moveTo({ x: innerOrigin.x + MAP_WIDTH - 60, y: innerOrigin.y + 500 });
    expect(inner.player.destination).not.toEqual({ x: innerOrigin.x + MAP_WIDTH - 60, y: innerOrigin.y + 500 });
    inner.player.x = innerOrigin.x + 768;
    inner.player.y = innerOrigin.y + 65;
    inner.update(0.05);
    expect(inner.region).toBe('pyongyanginner');
  });

  it('starts Hajin at the defeated Jurchen home camp with a bow and ranged combat', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();

    expect(game.getPlayerOrigin()).toBe('frontier-archer');
    expect(game.region).toBe('jurchenvillage');
    expect(game.player.level).toBe(1);
    expect(game.getPlayerAttackRange()).toBe(330);
    expect(game.getEquippedDefinition('weapon')?.id).toBe('frontier-horn-bow');
    expect(game.inventory.map((item) => item.itemId)).toEqual(['frontier-horn-bow', 'worn-hwando']);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'frontier-opening-defeated',
      retreatTo: 'jurchenvillage',
    }));

    game.travelToCampaignRegion('changbaihunt', 'south');
    const boar = game.monsters.find((monster) => monster.region === 'changbaihunt' && monster.kind === 'boar')!;
    game.player.x = boar.x - 245;
    game.player.y = boar.y;
    game.selectMonster(boar.id);
    game.update(0.05);
    expect(game.drainEvents()).toContainEqual({ type: 'player-attack', targetId: boar.id, style: 'weapon' });
  });

  it('starts Yeonhwa as an unarmed Joseon mudang in Osaka and opens the Settsu road with real gut attacks', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    const origin = REGION_ORIGINS.osaka;

    expect(game.getPlayerOrigin()).toBe('osaka-mudang');
    expect(game.region).toBe('osaka');
    expect(game.player).toMatchObject({
      x: origin.x + MAP_WIDTH / 2,
      y: origin.y + 850,
      level: 1,
      maxHp: 132,
    });
    expect(game.getEquippedDefinition('weapon')).toBeNull();
    expect(game.inventory).toHaveLength(0);
    expect(game.skillRanks).toMatchObject({
      'spirit-bell': 1,
      'talisman-flame': 1,
      'soul-binding-gut': 1,
      'exile-possession': 1,
    });

    const captor = game.monsters.find((monster) => monster.region === 'osaka')!;
    captor.x = game.player.x + 60;
    captor.y = game.player.y;
    const hpBefore = captor.hp;
    game.castSkill('spirit-bell');
    expect(captor.hp).toBeLessThan(hpBefore);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'skill-cast',
      skillId: 'spirit-bell',
    }));

    const killMonster = (game as unknown as {
      killMonster: (monster: (typeof game.monsters)[number]) => void;
    }).killMonster.bind(game);
    for (const enemy of game.monsters.filter((monster) => monster.region === 'osaka')) {
      killMonster(enemy);
    }
    expect(game.drainEvents()).toContainEqual({
      type: 'osaka-departure-ready',
      defeated: 10,
    });

    game.player.x = origin.x + MAP_WIDTH / 2;
    game.player.y = origin.y - 6;
    const seamY = game.player.y;
    game.update(0.05);
    expect(game.region).toBe('settsuvillage');
    expect(Math.abs(game.player.y - seamY)).toBeLessThan(20);
    for (let step = 1; step < 24; step += 1) game.update(0.05);
    expect(Math.abs(game.player.y - seamY)).toBeLessThan(20);
    expect(game.player.destination).toBeNull();
  });

  it('orders the frontier from the Jurchen north camp down to the Joseon outpost', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    const origin = REGION_ORIGINS.manchufrontier;

    game.player.y = origin.y + 175;
    expect(game.getFrontierSector()).toMatchObject({ id: 'jurchen-rear', name: '여진 선봉 후영' });
    game.player.y = origin.y + 400;
    expect(game.getFrontierSector()).toMatchObject({ id: 'frozen-ford', name: '압록 얼음 나루' });
    game.player.y = origin.y + 560;
    expect(game.getFrontierSector()).toMatchObject({ id: 'broken-palisade', name: '무너진 변경 목책' });
    game.player.y = origin.y + 760;
    expect(game.getFrontierSector()).toMatchObject({ id: 'joseon-outpost', name: '조선 압록 진보' });
  });

  it('adds a distinct Jurchen village and tribal chieftain north of the Yalu front', () => {
    expect(REGION_ORIGINS.jurchenvillage.y).toBeLessThan(REGION_ORIGINS.manchufrontier.y);
    const game = new GameSimulation('jurchenvillage');
    const chieftain = game.monsters.find((monster) =>
      monster.region === 'jurchenvillage' && monster.kind === 'manchu-chieftain');

    expect(chieftain).toMatchObject({
      name: '여진 대족장 아이신고로 바투르',
      level: 22,
      maxHp: 980,
      damage: 42,
      alive: true,
    });
    expect(game.monsters.filter((monster) => monster.region === 'jurchenvillage')).toHaveLength(9);
  });

  it('treats the Jurchen chieftain as Hajin ally and Joseon-route boss', () => {
    const harlan = new GameSimulation();
    harlan.startFrontierArcherStory();
    harlan.travelToCampaignRegion('jurchenvillage', 'south');
    const alliedChieftain = harlan.monsters.find((monster) =>
      monster.region === 'jurchenvillage' && monster.kind === 'manchu-chieftain')!;
    expect(harlan.isFriendlyMonster(alliedChieftain)).toBe(true);
    harlan.selectMonster(alliedChieftain.id);
    expect(harlan.getTarget()).toBeNull();

    const joseon = new GameSimulation('jurchenvillage');
    const hostileChieftain = joseon.monsters.find((monster) =>
      monster.region === 'jurchenvillage' && monster.kind === 'manchu-chieftain')!;
    expect(joseon.isFriendlyMonster(hostileChieftain)).toBe(false);
    joseon.selectMonster(hostileChieftain.id);
    expect(joseon.getTarget()?.id).toBe(hostileChieftain.id);
  });

  it('connects the Jurchen village and frontier through their center gates', () => {
    const village = new GameSimulation('jurchenvillage');
    village.player.x = REGION_ORIGINS.jurchenvillage.x + 768;
    village.player.y = REGION_ORIGINS.jurchenvillage.y + MAP_HEIGHT + 6;
    village.update(0.05);
    expect(village.region).toBe('manchufrontier');

    const frontier = new GameSimulation('manchufrontier');
    frontier.player.x = REGION_ORIGINS.manchufrontier.x + 768;
    frontier.player.y = REGION_ORIGINS.manchufrontier.y - 6;
    frontier.update(0.05);
    expect(frontier.region).toBe('jurchenvillage');
  });

  it('collides with Jurchen village structures while leaving its central roads open', () => {
    const game = new GameSimulation('jurchenvillage');
    const origin = REGION_ORIGINS.jurchenvillage;
    const resolveObstacleCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);

    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 330 }, 20)).toBe(true);
    expect(resolveObstacleCollision({ x: origin.x + 290, y: origin.y + 805 }, 20)).toBe(true);
    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 700 }, 20)).toBe(false);
    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 930 }, 20)).toBe(false);
  });

  it('turns the north-to-south frontier landmarks into distinct item rewards', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    const xpBefore = game.player.xp;

    expect(game.interactLandmark('jurchen-supply-sled')).toBe(true);
    expect(game.interactLandmark('fallen-border-courier')).toBe(true);
    expect(game.interactLandmark('frontier-stone-cairn')).toBe(true);

    expect(game.inventory.map((item) => item.itemId)).toEqual(expect.arrayContaining([
      'jurchen-iron-arrowheads',
      'border-war-dispatch',
      'falcon-eye-bracer',
    ]));
    expect(game.player.xp).toBeGreaterThan(xpBefore);
    expect(game.drainEvents().filter((event) => event.type === 'landmark-discovered')).toHaveLength(3);
  });

  it('runs a four-stage frontier event chain and pays the first raid reward', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    game.drainEvents();
    moveHajinToFrontier(game);
    game.drainEvents();
    for (let step = 0; step < 241; step += 1) game.update(0.05);

    expect(game.activeWorldEvent).toMatchObject({
      kind: 'frontier-supply-raid',
      region: 'manchufrontier',
      progress: 0,
      goal: 2,
      rewardGold: 42,
      rewardItemId: 'jurchen-iron-arrowheads',
    });

    const targets = game.monsters
      .filter((monster) => monster.region === 'manchufrontier'
        && monster.alive
        && (monster.kind === 'joseon-border-swordsman' || monster.kind === 'joseon-border-spearman'))
      .slice(0, 2);
    const killMonster = (game as unknown as { killMonster: (monster: typeof targets[number]) => void }).killMonster.bind(game);
    targets.forEach((monster) => killMonster(monster));

    const events = game.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'world-event-progress',
      kind: 'frontier-supply-raid',
      progress: 1,
      goal: 2,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'world-event-completed',
      kind: 'frontier-supply-raid',
      gold: 42,
      itemId: 'jurchen-iron-arrowheads',
    }));
    expect(game.groundDrops.some((drop) => drop.itemId === 'jurchen-iron-arrowheads')).toBe(true);
    expect(game.activeWorldEvent).toBeNull();
  });

  it('lets Hajin switch to a sword while keeping bow martial arts bow-only', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    const sword = game.inventory.find((item) => item.itemId === 'worn-hwando')!;
    game.equipItem(sword.instanceId);

    expect(game.isBowEquipped()).toBe(false);
    expect(game.getPlayerAttackRange()).toBe(105);
    expect(game.getEquippedDefinition('weapon')?.id).toBe('worn-hwando');

    game.player.attackCooldown = 0;
    game.castSkill('haemosu-volley');
    expect(game.drainEvents()).toContainEqual({
      type: 'skill-blocked', skillId: 'haemosu-volley', reason: 'weapon',
    });

    game.player.attackCooldown = 0;
    game.castSkill('whirlwind');
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'skill-cast', skillId: 'whirlwind',
    }));
  });

  it('fires Hajin multishot without a selected target and guides arrows into nearby prey', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    game.travelToCampaignRegion('changbaihunt', 'south');
    const boar = game.monsters.find((monster) => monster.region === 'changbaihunt' && monster.kind === 'boar')!;
    game.player.x = boar.x - 240;
    game.player.y = boar.y;
    game.player.targetId = null;
    const hpBefore = boar.hp;

    game.castSkill('haemosu-volley');

    const events = game.drainEvents();
    const volley = events.find((event) => event.type === 'archer-volley');
    expect(volley?.type === 'archer-volley' ? volley.arrows.length : 0).toBeGreaterThanOrEqual(5);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'skill-cast', skillId: 'haemosu-volley',
    }));
    expect(boar.hp).toBeLessThan(hpBefore);
  });

  it('keeps Jurchen soldiers friendly to Hajin while the grassland beasts remain huntable', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    const ally = game.monsters.find((monster) => monster.region === 'manchufrontier' && monster.kind === 'manchu-lancer')!;
    game.player.x = ally.x + 20;
    game.player.y = ally.y;
    game.moveTo({ x: ally.x + 35, y: ally.y });
    for (let step = 0; step < 20; step += 1) game.update(0.05);
    expect(ally.aggro).toBe(false);
    expect(game.isFriendlyMonster(ally)).toBe(true);
    game.selectMonster(ally.id);
    expect(game.getTarget()).toBeNull();
  });

  it('starts Hajin with a concealed opening shot before the frontier battle', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'frontier-opening-defeated',
    }));
    moveHajinToFrontier(game);
    expect(game.drainEvents()).toContainEqual({
      type: 'frontier-ambush-ready',
      jurchenCount: 11,
      joseonCount: 11,
    });

    const jurchen = game.monsters.filter((monster) => monster.region === 'manchufrontier' && monster.kind.startsWith('manchu-'));
    const joseon = game.monsters.filter((monster) => monster.region === 'manchufrontier' && monster.kind.startsWith('joseon-border-'));
    const killsBeforeAmbush = game.player.kills;
    expect(game.player.y).toBeLessThan(Math.min(...jurchen.map((monster) => monster.y)));
    expect(jurchen).toHaveLength(11);
    expect(joseon).toHaveLength(11);

    for (let step = 0; step < 20; step += 1) game.update(0.05);
    expect(joseon.every((monster) => monster.aiState === 'sleep')).toBe(true);
    expect([...jurchen, ...joseon].every((monster) => monster.hp === monster.maxHp)).toBe(true);

    const battleEvents = [];
    for (let step = 0; step < 120; step += 1) {
      game.update(0.05);
      battleEvents.push(...game.drainEvents());
    }
    expect(battleEvents).toContainEqual(expect.objectContaining({ type: 'frontier-ambush-fired' }));
    expect(battleEvents).toContainEqual(expect.objectContaining({
      type: 'frontier-battle-started',
      fleeingCount: 3,
    }));
    expect(battleEvents).toContainEqual(expect.objectContaining({ type: 'frontier-unit-fled' }));
    expect(battleEvents).toContainEqual(expect.objectContaining({
      type: 'frontier-clash',
      attackKind: expect.stringMatching(/arrow|spear|cavalry|command|blade/),
    }));
    expect([...jurchen, ...joseon].some((monster) => monster.hp < monster.maxHp)).toBe(true);
    expect(game.player.kills).toBe(killsBeforeAmbush);
  });

  it('opens Hajin south gate after mission clear and calls exactly ten reinforcements from the 750-soldier tribal reserve', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    game.drainEvents();
    moveHajinToFrontier(game);
    game.drainEvents();
    const origin = REGION_ORIGINS.manchufrontier;
    for (let step = 0; step < 21; step += 1) game.update(0.05);
    game.drainEvents();

    game.player.x = origin.x + MAP_WIDTH / 2;
    game.player.y = origin.y + MAP_HEIGHT + 6;
    game.update(0.05);
    expect(game.region).toBe('manchufrontier');
    expect(game.player.destination).toEqual({ x: origin.x + MAP_WIDTH / 2, y: origin.y + 720 });
    expect(game.drainEvents()).toContainEqual({
      type: 'southward-gate-blocked',
      remaining: 11,
    });

    expect(game.completeHajinFrontierMissionForPlaytest()).toBe(true);
    expect(game.getHajinMissionProgress()).toEqual({
      defeated: 11,
      total: 11,
      soldiers: 11,
      civilians: 0,
      cleared: true,
    });
    expect(game.getHajinArmyStatus()).toEqual({
      reserve: 750,
      fielded: 5,
      fieldCap: 25,
      waveSize: 10,
      unlocked: true,
      alliedTribes: 3,
      totalTribes: 3,
      unified: true,
    });

    expect(game.callHajinReinforcements()).toBe(true);
    expect(game.getHajinArmyStatus()).toEqual(expect.objectContaining({ reserve: 740, fielded: 15 }));
    expect(game.callHajinReinforcements()).toBe(true);
    expect(game.getHajinArmyStatus()).toEqual(expect.objectContaining({ reserve: 730, fielded: 25 }));
    expect(game.callHajinReinforcements()).toBe(false);
    expect(game.drainEvents()).toContainEqual({
      type: 'hajin-reinforcements-blocked',
      reason: 'field-capacity',
      reserve: 730,
      fielded: 25,
    });

    game.player.destination = null;
    game.player.x = origin.x + MAP_WIDTH / 2;
    game.player.y = origin.y + MAP_HEIGHT + 6;
    game.update(0.05);
    expect(game.region).toBe('pyongyangouter');
    expect(game.followers.filter((follower) => follower.route === 'invasion')).toHaveLength(25);
  });

  it('forces Hajin through all three Pyongyang battles before Gyeongbokgung', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    game.drainEvents();
    moveHajinToFrontier(game);
    game.drainEvents();
    expect(game.completeHajinFrontierMissionForPlaytest()).toBe(true);
    game.travelToCampaignRegion('pyongyangouter', 'north');
    expect(game.region).toBe('pyongyangouter');
    expect(game.getPyongyangBattleProgress('pyongyangouter')).toEqual({
      defeated: 0,
      total: 15,
      cleared: false,
    });
    const outerOrigin = REGION_ORIGINS.pyongyangouter;
    const resolveObstacleCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);
    expect(resolveObstacleCollision({ x: outerOrigin.x + 768, y: outerOrigin.y + 920 }, 20)).toBe(true);
    game.drainEvents();

    game.travelToCampaignRegion('pyongyanggate', 'north');
    expect(game.region).toBe('pyongyangouter');
    expect(game.drainEvents()).toContainEqual({
      type: 'pyongyang-gate-blocked',
      region: 'pyongyangouter',
      remaining: 15,
    });

    game.travelToCampaignRegion('manchufrontier', 'south');
    expect(game.region).toBe('manchufrontier');
    game.travelToCampaignRegion('pyongyangouter', 'north');
    const killMonster = (game as unknown as {
      killMonster: (monster: (typeof game.monsters)[number]) => void;
    }).killMonster.bind(game);
    for (const defender of game.monsters.filter((monster) => monster.region === 'pyongyangouter')) {
      killMonster(defender);
    }
    expect(game.isPyongyangStageCleared('pyongyangouter')).toBe(true);
    expect(resolveObstacleCollision({ x: outerOrigin.x + 768, y: outerOrigin.y + 920 }, 20)).toBe(false);
    expect(game.drainEvents()).toContainEqual({
      type: 'pyongyang-stage-cleared',
      region: 'pyongyangouter',
      defeated: 15,
    });

    game.travelToCampaignRegion('pyongyanggate', 'north');
    expect(game.region).toBe('pyongyanggate');
    expect(game.completePyongyangStageForPlaytest('pyongyanggate')).toBe(true);
    game.travelToCampaignRegion('pyongyanginner', 'north');
    expect(game.region).toBe('pyongyanginner');
    expect(game.completePyongyangStageForPlaytest('pyongyanginner')).toBe(true);
    game.travelToCampaignRegion('gyeongbokinner', 'north');
    expect(game.region).toBe('pyongyanginner');
    game.travelToCampaignRegion('gyeongbokgate', 'south');
    expect(game.region).toBe('gyeongbokgate');
    game.travelToCampaignRegion('gyeongbokcourt', 'south');
    expect(game.region).toBe('gyeongbokcourt');
    game.travelToCampaignRegion('gyeongbokinner', 'north');
    expect(game.region).toBe('gyeongbokinner');
  });

  it('supports the reverse Pyongyang campaign, persistent clears, and home-village defeat respawns', () => {
    const game = new GameSimulation('gyeongbokinner');
    game.travelToCampaignRegion('pyongyanginner', 'south');
    expect(game.region).toBe('pyongyanginner');

    game.travelToCampaignRegion('pyongyanggate', 'south');
    expect(game.region).toBe('pyongyanginner');
    expect(game.drainEvents()).toContainEqual({
      type: 'pyongyang-gate-blocked',
      region: 'pyongyanginner',
      remaining: 17,
    });

    game.travelToCampaignRegion('gyeongbokinner', 'north');
    expect(game.region).toBe('gyeongbokinner');
    game.travelToCampaignRegion('pyongyanginner', 'south');
    expect(game.completePyongyangStageForPlaytest('pyongyanginner')).toBe(true);

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getPyongyangBattleProgress('pyongyanginner')).toEqual({
      defeated: 17,
      total: 17,
      cleared: true,
    });
    expect(restored.monsters
      .filter((monster) => monster.region === 'pyongyanginner')
      .every((monster) => !monster.alive && monster.respawnAt === Number.POSITIVE_INFINITY)).toBe(true);

    restored.travelToCampaignRegion('pyongyanggate', 'south');
    expect(restored.region).toBe('pyongyanggate');
    const defeat = (restored as unknown as { defeatPlayer: () => void }).defeatPlayer.bind(restored);
    restored.player.hp = 0;
    defeat();
    expect(restored.drainEvents()).toContainEqual({
      type: 'player-defeated',
      respawnRegion: 'village',
    });
    for (let step = 0; step < 65; step += 1) restored.update(0.05);
    expect(restored.region).toBe('village');
    expect(restored.player).toMatchObject({
      x: REGION_ORIGINS.village.x + 768,
      y: REGION_ORIGINS.village.y + 790,
    });
    const resolveVillageCollision = (restored as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(restored);
    expect(resolveVillageCollision(restored.player, 24)).toBe(false);
  });

  it('branches at the king into a three-tier Namhansanseong final defense', () => {
    const game = new GameSimulation('gyeongbokinner');
    expect(game.prepareRoyalRefugeEncounterForPlaytest()).toBe(true);
    game.drainEvents();
    expect(game.beginRoyalRefugeAtKing()).toBe(true);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'king-refuge-choice',
      title: '무너진 북방, 갈라지는 어가',
    }));

    expect(game.chooseRoyalRefugeRoute('namhansanseong')).toBe(true);
    expect(game.region).toBe('namhansanseong');
    expect(game.getRoyalRefugeBattleProgress()).toMatchObject({
      routeId: 'namhansanseong',
      stageIndex: 0,
      defeated: 0,
      total: 7,
      finalDefenseComplete: false,
    });

    const origin = REGION_ORIGINS.namhansanseong;
    const resolveObstacleCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);
    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 690 }, 20)).toBe(true);
    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 420 }, 20)).toBe(true);

    const futureDefender = game.monsters.find((monster) =>
      monster.region === 'namhansanseong'
      && monster.spawn.y - origin.y >= 430
      && monster.spawn.y - origin.y < 690)!;
    game.selectMonster(futureDefender.id);
    expect(game.player.targetId).toBeNull();

    const goldBefore = game.player.gold;
    expect(game.completeRoyalRefugeStageForPlaytest()).toBe(true);
    expect(game.getRoyalRefugeBattleProgress()).toMatchObject({ stageIndex: 1, defeated: 0, total: 9 });
    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 690 }, 20)).toBe(false);
    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 420 }, 20)).toBe(true);

    expect(game.completeRoyalRefugeStageForPlaytest()).toBe(true);
    expect(game.getRoyalRefugeBattleProgress()).toMatchObject({ stageIndex: 2, defeated: 0, total: 9 });
    expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 420 }, 20)).toBe(false);

    expect(game.completeRoyalRefugeStageForPlaytest()).toBe(true);
    expect(game.getRoyalRefugeState()).toMatchObject({
      status: 'final-defense-complete',
      routeId: 'namhansanseong',
      activeStageIndex: null,
      finalDefenseComplete: true,
    });
    expect(game.player.gold - goldBefore).toBe(1_100);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'royal-refuge-final-defense-cleared',
      routeId: 'namhansanseong',
    }));
  });

  it('keeps the chosen Ganghwado wave state and partial casualties across a save', () => {
    const game = new GameSimulation('ganghwado');
    expect(game.prepareRoyalRefugeForPlaytest('ganghwado')).toBe(true);
    const origin = REGION_ORIGINS.ganghwado;
    const firstWave = game.monsters.filter((monster) =>
      monster.region === 'ganghwado' && monster.spawn.y - origin.y >= 690);
    const secondWave = game.monsters.filter((monster) =>
      monster.region === 'ganghwado'
      && monster.spawn.y - origin.y >= 430
      && monster.spawn.y - origin.y < 690);
    const killMonster = (game as unknown as {
      killMonster: (monster: (typeof game.monsters)[number]) => void;
    }).killMonster.bind(game);
    killMonster(firstWave[0]);
    expect(game.getRoyalRefugeBattleProgress()).toMatchObject({
      routeId: 'ganghwado',
      stageIndex: 0,
      defeated: 1,
      total: 7,
    });

    game.selectMonster(secondWave[0].id);
    expect(game.player.targetId).toBeNull();
    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.region).toBe('ganghwado');
    expect(restored.getRoyalRefugeState()).toMatchObject({
      status: 'in-progress',
      routeId: 'ganghwado',
      activeStageIndex: 0,
    });
    expect(restored.getRoyalRefugeBattleProgress()).toMatchObject({
      defeated: 1,
      total: 7,
      finalDefenseComplete: false,
    });
    expect(restored.monsters.find((monster) => monster.id === firstWave[0].id)).toMatchObject({
      alive: false,
      respawnAt: Number.POSITIVE_INFINITY,
    });
    expect(restored.monsters.find((monster) => monster.id === secondWave[0].id)?.alive).toBe(true);
  });

  it('keeps Pyongyang defenders off scenery and physically seals only the forward gate', () => {
    const regions = ['pyongyangouter', 'pyongyanggate', 'pyongyanginner'] as const;
    for (const region of regions) {
      const game = new GameSimulation(region);
      const origin = REGION_ORIGINS[region];
      const resolveObstacleCollision = (game as unknown as {
        resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
      }).resolveObstacleCollision.bind(game);

      for (const monster of game.monsters.filter((entry) => entry.region === region)) {
        expect(
          resolveObstacleCollision({ ...monster.spawn }, 24),
          `${region}: ${monster.kind} at ${monster.spawn.x - origin.x},${monster.spawn.y - origin.y}`,
        ).toBe(false);
      }

      expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 104 }, 20)).toBe(true);
      expect(game.completePyongyangStageForPlaytest(region)).toBe(true);
      expect(resolveObstacleCollision({ x: origin.x + 768, y: origin.y + 104 }, 20)).toBe(false);
    }
  });

  it('keeps the Jurchen rear camp safe until Hajin enters or attacks across the front', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    game.drainEvents();
    moveHajinToFrontier(game);
    game.drainEvents();
    const origin = REGION_ORIGINS.manchufrontier;
    const startHp = game.player.hp;

    game.moveTo({ x: origin.x + 1020, y: origin.y + 185 });
    for (let step = 0; step < 50; step += 1) game.update(0.05);

    expect(game.region).toBe('manchufrontier');
    expect(game.player.y).toBeLessThan(origin.y + 310);
    expect(game.player.hp).toBe(startHp);
    expect(game.monsters
      .filter((monster) => monster.region === 'manchufrontier' && monster.kind.startsWith('joseon-border-'))
      .every((monster) => !monster.aggro)).toBe(true);
  });

  it('respawns Hajin at his Jurchen home village instead of the battlefield', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    const defeat = (game as unknown as { defeatPlayer: () => void }).defeatPlayer.bind(game);

    game.player.hp = 0;
    defeat();
    expect(game.drainEvents()).toContainEqual({
      type: 'player-defeated',
      respawnRegion: 'jurchenvillage',
    });
    for (let step = 0; step < 65; step += 1) game.update(0.05);

    expect(game.region).toBe('jurchenvillage');
    expect(game.player.hp).toBe(game.player.maxHp);
    expect(game.player).toMatchObject({
      x: REGION_ORIGINS.jurchenvillage.x + 768,
      y: REGION_ORIGINS.jurchenvillage.y + 790,
    });
    const resolveVillageCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);
    expect(resolveVillageCollision(game.player, 24)).toBe(false);
  });

  it('respawns Yeonhwa at her Settsu home village instead of Osaka', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    const defeat = (game as unknown as { defeatPlayer: () => void }).defeatPlayer.bind(game);

    game.player.hp = 0;
    defeat();
    expect(game.drainEvents()).toContainEqual({
      type: 'player-defeated',
      respawnRegion: 'settsuvillage',
    });
    for (let step = 0; step < 65; step += 1) game.update(0.05);

    expect(game.region).toBe('settsuvillage');
    expect(game.player.hp).toBe(game.player.maxHp);
    expect(game.player).toMatchObject({
      x: REGION_ORIGINS.settsuvillage.x + 768,
      y: REGION_ORIGINS.settsuvillage.y + 790,
    });
    const resolveVillageCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);
    expect(resolveVillageCollision(game.player, 24)).toBe(false);
  });

  it('treats the player-side army as friendly on both frontier story routes', () => {
    const harlan = new GameSimulation();
    harlan.startFrontierArcherStory();
    const harlanAlly = harlan.monsters.find((monster) => monster.kind === 'manchu-lancer')!;
    const harlanEnemy = harlan.monsters.find((monster) => monster.kind === 'joseon-border-swordsman')!;
    expect(harlan.isFriendlyMonster(harlanAlly)).toBe(true);
    expect(harlan.isFriendlyMonster(harlanEnemy)).toBe(false);

    const donghyeok = new GameSimulation('manchufrontier');
    const joseonAlly = donghyeok.monsters.find((monster) => monster.kind === 'joseon-border-swordsman')!;
    const jurchenEnemy = donghyeok.monsters.find((monster) => monster.kind === 'manchu-lancer')!;
    expect(donghyeok.isFriendlyMonster(joseonAlly)).toBe(true);
    expect(donghyeok.isFriendlyMonster(jurchenEnemy)).toBe(false);
  });

  it('persists the frontier origin independently in snapshots', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    const saved = game.exportSinglePlayerSnapshot();
    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(saved)).toBe(true);
    expect(restored.getPlayerOrigin()).toBe('frontier-archer');
    expect(restored.getEquippedDefinition('weapon')?.id).toBe('frontier-horn-bow');
  });

  it('upgrades older Hajin saves with hybrid starter skills and a backup sword', () => {
    const game = new GameSimulation();
    game.startFrontierArcherStory();
    const saved = game.exportSinglePlayerSnapshot();
    saved.skillRanks.whirlwind = 0;
    saved.skillRanks['haemosu-volley'] = 0;
    saved.inventory = saved.inventory.filter((item) => item.itemId !== 'worn-hwando');

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(saved)).toBe(true);
    expect(restored.skillRanks.whirlwind).toBe(1);
    expect(restored.skillRanks['haemosu-volley']).toBe(1);
    expect(restored.inventory.some((item) => item.itemId === 'worn-hwando')).toBe(true);
  });

  it('preserves the Shogun enchant scroll drops across a save before pickup', () => {
    const game = new GameSimulation('shogunkeep');
    const shogun = game.monsters.find((monster) => monster.kind === 'japanese-shogun')!;
    const killMonster = (game as unknown as {
      killMonster: (monster: typeof shogun) => void;
    }).killMonster.bind(game);

    killMonster(shogun);
    const rewardDrops = game.groundDrops.filter((drop) =>
      drop.itemId === 'weapon-enchant-scroll' || drop.itemId === 'armor-enchant-scroll');
    expect(rewardDrops.map((drop) => drop.itemId).sort()).toEqual([
      'armor-enchant-scroll',
      'weapon-enchant-scroll',
    ]);

    const saved = game.exportSinglePlayerSnapshot();
    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(saved)).toBe(true);
    expect(restored.groundDrops).toEqual(expect.arrayContaining(rewardDrops));

    const legacySave = game.exportSinglePlayerSnapshot();
    delete legacySave.groundDrops;
    const restoredLegacy = new GameSimulation();
    expect(restoredLegacy.importSinglePlayerSnapshot(legacySave)).toBe(true);
    expect(restoredLegacy.groundDrops).toHaveLength(0);
  });

  it('repopulates Yamazaki hunting prey after its first clear without relocking progression', () => {
    const game = new GameSimulation('yamazakihunt');
    const prey = game.monsters.filter((monster) => monster.region === 'yamazakihunt'
      && (monster.kind === 'japanese-sika-deer' || monster.kind === 'japanese-wild-boar'));
    const archers = game.monsters.filter((monster) => monster.region === 'yamazakihunt'
      && monster.kind === 'japanese-archer');

    expect(game.completeJapanStageForPlaytest('yamazakihunt')).toBe(true);
    expect(game.isJapanStageCleared('yamazakihunt')).toBe(true);
    expect(prey.every((monster) => !monster.alive && Number.isFinite(monster.respawnAt))).toBe(true);
    expect(archers.every((monster) => !monster.alive && monster.respawnAt === Number.POSITIVE_INFINITY)).toBe(true);

    for (let step = 0; step < 440; step += 1) game.update(0.05);
    expect(prey.every((monster) => monster.alive)).toBe(true);
    expect(archers.every((monster) => !monster.alive)).toBe(true);
    expect(game.getJapanStageProgress('yamazakihunt').cleared).toBe(true);

    game.travelToCampaignRegion('osakacastle', 'north');
    expect(game.region).toBe('osakacastle');
  });

  it('restores cleared Yamazaki prey state while keeping archers defeated and its gate open', () => {
    const game = new GameSimulation('yamazakihunt');
    expect(game.completeJapanStageForPlaytest('yamazakihunt')).toBe(true);
    for (let step = 0; step < 440; step += 1) game.update(0.05);

    const deer = game.monsters.find((monster) =>
      monster.region === 'yamazakihunt' && monster.kind === 'japanese-sika-deer')!;
    const boar = game.monsters.find((monster) =>
      monster.region === 'yamazakihunt' && monster.kind === 'japanese-wild-boar')!;
    deer.hp = deer.maxHp - 9;
    const killMonster = (game as unknown as {
      killMonster: (monster: typeof boar) => void;
    }).killMonster.bind(game);
    boar.hp = 0;
    killMonster(boar);

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    const restoredDeer = restored.monsters.find((monster) => monster.id === deer.id)!;
    const restoredBoar = restored.monsters.find((monster) => monster.id === boar.id)!;
    const restoredArchers = restored.monsters.filter((monster) =>
      monster.region === 'yamazakihunt' && monster.kind === 'japanese-archer');

    expect(restoredDeer.alive).toBe(true);
    expect(restoredDeer.hp).toBe(deer.maxHp - 9);
    expect(restoredBoar.alive).toBe(false);
    expect(restoredBoar.hp).toBe(0);
    expect(Number.isFinite(restoredBoar.respawnAt)).toBe(true);
    expect(restoredArchers.every((monster) =>
      !monster.alive && monster.respawnAt === Number.POSITIVE_INFINITY)).toBe(true);
    expect(restored.isJapanStageCleared('yamazakihunt')).toBe(true);

    restored.travelToCampaignRegion('osakacastle', 'north');
    expect(restored.region).toBe('osakacastle');
  });

  it('never starts mainland generic world events inside the Japan campaign', () => {
    const regions = ['osaka', 'settsuvillage', 'yamazakihunt', 'osakacastle', 'shogunkeep'] as const;
    for (const region of regions) {
      const game = new GameSimulation(region);
      (game as unknown as { nextWorldEventAt: number }).nextWorldEventAt = 0;
      game.update(0.05);
      expect(game.activeWorldEvent, region).toBeNull();
      expect(game.drainEvents().some((event) => event.type === 'world-event-started'), region).toBe(false);
    }

    const mainland = new GameSimulation('solgogae');
    (mainland as unknown as { nextWorldEventAt: number }).nextWorldEventAt = 0;
    mainland.update(0.05);
    expect(mainland.activeWorldEvent).not.toBeNull();
    mainland.travelToCampaignRegion('osaka');
    mainland.update(0.05);
    expect(mainland.activeWorldEvent).toBeNull();
  });

  it('connects the west mistwood gate to the separate Yeongwol map', () => {
    const game = new GameSimulation('mistwood');
    game.player.x = REGION_ORIGINS.mistwood.x + 30;
    game.player.y = VILLAGE_TOP + 470;
    game.moveTo({ x: REGION_ORIGINS.yeongwol.x + MAP_WIDTH - 10, y: VILLAGE_TOP + 470 });
    for (let step = 0; step < 20; step += 1) game.update(0.05);
    expect(game.region).toBe('yeongwol');
  });

  it('keeps each story protagonist attached to a distinct faction-war campaign', () => {
    const donghyeok = new GameSimulation();
    expect(donghyeok.getFactionWarSnapshot().playerFaction).toBe('daedong-army');

    const hajin = new GameSimulation();
    hajin.startFrontierArcherStory();
    expect(hajin.getFactionWarSnapshot().playerFaction).toBe('jurchen-league');

    const yeonhwa = new GameSimulation();
    yeonhwa.startOsakaMudangStory();
    expect(yeonhwa.getFactionWarSnapshot().playerFaction).toBe('japanese-army');
  });
});
