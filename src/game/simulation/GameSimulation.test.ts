import { describe, expect, it, vi } from 'vitest';
import { GameSimulation } from './GameSimulation';
import { VILLAGE_TOP } from '../world/layout';

describe('GameSimulation', () => {
  const advanceTo = (game: GameSimulation, floor: number) => {
    game.enterDungeon();
    while (game.dungeonFloor < floor) game.advanceDungeonFloor();
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

  it('telegraphs before a boar charge', () => {
    const game = new GameSimulation();
    const boar = game.monsters[0];
    boar.attackCooldown = 0;
    game.player.x = boar.x + 130;
    game.player.y = boar.y;
    game.selectMonster(boar.id);
    for (let index = 0; index < 7; index += 1) game.update(0.05);
    expect(['telegraph', 'charge']).toContain(boar.aiState);
    expect(game.drainEvents().some((event) => event.type === 'monster-charge')).toBe(true);
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
    const monster = game.monsters[1];
    game.player.x = monster.x;
    game.player.y = monster.y + 60;
    game.player.hp = 1;
    monster.attackCooldown = 0;
    game.selectMonster(monster.id);
    for (let index = 0; index < 16; index += 1) game.update(0.05);
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

  it('drops, collects, and equips the guaranteed first weapon', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const game = new GameSimulation();
    const monster = game.monsters[0];
    monster.hp = 1;
    game.player.x = monster.x - 70;
    game.player.y = monster.y;
    game.selectMonster(monster.id);
    for (let index = 0; index < 6; index += 1) game.update(0.05);
    expect(game.groundDrops[0]?.itemId).toBe('worn-hwando');
    const drop = game.groundDrops[0];
    game.player.x = drop.x;
    game.player.y = drop.y;
    game.collectDrop(drop.id);
    game.update(0.05);
    expect(game.inventory).toHaveLength(1);
    const unarmedPower = game.getAttackPower();
    game.equipItem(game.inventory[0].instanceId);
    expect(game.equipment.weapon).toBe(game.inventory[0].instanceId);
    expect(game.getAttackPower()).toBeGreaterThan(unarmedPower);
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
    expect(game.monsters.filter((monster) => monster.region === 'mistwood')).toHaveLength(6);
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

  it('keeps every regional monster population resident at distinct world coordinates', () => {
    const game = new GameSimulation();
    expect(game.monsters).toHaveLength(30);
    expect(game.monsters.filter((monster) => monster.region === 'solgogae').every((monster) => monster.x > 0 && monster.y < 900)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'mistwood').every((monster) => monster.x < 0 && monster.y > VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'minepass').every((monster) => monster.x > 1536 && monster.y > VILLAGE_TOP)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'moonfield').every((monster) => monster.y > 1920)).toBe(true);
    expect(game.monsters.filter((monster) => monster.region === 'dungeon').every((monster) => monster.x > 3072 && monster.y < VILLAGE_TOP)).toBe(true);
    expect(new Set(game.monsters.filter((monster) => monster.region === 'mistwood').map((monster) => monster.kind))).toEqual(new Set(['bamboo-spirit']));
    expect(new Set(game.monsters.filter((monster) => monster.region === 'minepass').map((monster) => monster.kind))).toEqual(new Set(['mine-golem']));
    expect(new Set(game.monsters.filter((monster) => monster.region === 'moonfield').map((monster) => monster.kind))).toEqual(new Set(['moon-revenant']));
  });
});
