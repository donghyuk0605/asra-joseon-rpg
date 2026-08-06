import { describe, expect, it } from 'vitest';
import { GameSimulation, type SinglePlayerSnapshot } from './GameSimulation';
import type { ActiveWorldEvent, ItemId, MonsterState } from './types';
import { REGION_ORIGINS } from '../world/layout';

type SaveInternals = {
  elapsed: number;
  activeWorldEvent: ActiveWorldEvent | null;
  nextWorldEventAt: number;
  worldEventCycle: number;
  droppedStarterWeapon: boolean;
  droppedMartialManuals: Set<ItemId>;
  dropItem: (monster: MonsterState) => void;
};

const internals = (game: GameSimulation): SaveInternals =>
  game as unknown as SaveInternals;

describe('GameSimulation single-player save round trip', () => {
  it('restores item identity, equipment, enhancement, skills and followers semantically', () => {
    const game = new GameSimulation('solgogae');
    game.inventory.push(
      { instanceId: 'item-12', itemId: 'worn-hwando', enhancement: 4 },
      { instanceId: 'item-37', itemId: 'hunter-durumagi', enhancement: 3 },
      { instanceId: 'item-50', itemId: 'boar-tusk-charm' },
    );
    game.equipItem('item-12');
    game.equipItem('item-37');
    game.equipItem('item-50');
    game.skillRanks.whirlwind = 3;
    game.skillRanks['blade-mastery'] = 2;
    game.skillPoints = 7;
    game.player.level = 12;
    game.player.gold = 2_000;
    expect(game.recruitFollower('peasant-militia')).toBe(true);

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);

    expect(restored.inventory).toEqual(expect.arrayContaining([
      { instanceId: 'item-12', itemId: 'worn-hwando', enhancement: 4 },
      { instanceId: 'item-37', itemId: 'hunter-durumagi', enhancement: 3 },
      { instanceId: 'item-50', itemId: 'boar-tusk-charm' },
    ]));
    expect(restored.getEquippedDefinition('weapon')?.id).toBe('worn-hwando');
    expect(restored.getEquippedDefinition('armor')?.id).toBe('hunter-durumagi');
    expect(restored.getEquippedDefinition('charm')?.id).toBe('boar-tusk-charm');
    expect(restored.getWeaponEnchantLevel()).toBe(4);
    expect(restored.getArmorEnchantLevel()).toBe(3);
    expect(restored.skillRanks).toMatchObject({ whirlwind: 3, 'blade-mastery': 1 });
    expect(restored.skillPoints).toBe(7);
    expect(restored.followers[0]).toMatchObject({
      id: 'follower-0',
      kind: 'peasant-militia',
      route: 'tavern',
    });

    restored.player.gold = 2_000;
    expect(restored.purchaseShopOffer('weapon-enchant-scroll')).toBe(true);
    expect(restored.inventory.at(-1)).toMatchObject({
      instanceId: 'item-51',
      itemId: 'weapon-enchant-scroll',
    });
  });

  it('migrates a legacy peasant-militia bandit visual to the dedicated militia atlas', () => {
    const game = new GameSimulation('solgogae');
    expect(game.recruitFollower('peasant-militia')).toBe(true);
    const legacySnapshot = game.exportSinglePlayerSnapshot();
    legacySnapshot.followers![0].visualKind = 'bandit';

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(legacySnapshot)).toBe(true);
    expect(restored.followers[0]).toMatchObject({
      kind: 'peasant-militia',
      visualKind: 'jeonju-militia-sickle',
    });
    expect(restored.exportSinglePlayerSnapshot().followers?.[0].visualKind)
      .toBe('jeonju-militia-sickle');
  });

  it('restores the exact active dungeon floor, boss phase and stair lock', () => {
    const game = new GameSimulation();
    game.enterDungeon();
    while (game.dungeonFloor < 10) game.advanceDungeonFloor();
    const boss = game.boss!;
    game.damageBoss(Math.ceil(boss.maxHp * 0.6));
    boss.x += 21;
    boss.y -= 13;
    const patternId = Object.keys(boss.patternCooldowns)[0];
    boss.patternCooldowns[patternId] = 2.75;
    game.player.x += 37;
    game.player.y -= 19;

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);

    expect(restored.region).toBe('dungeon');
    expect(restored.dungeonFloor).toBe(10);
    expect(restored.dungeonLayout).toMatchObject({ floor: 10, pattern: 'sanctum' });
    expect(restored.isDungeonExitLocked()).toBe(true);
    expect(restored.boss).toMatchObject({
      bossId: boss.bossId,
      hp: boss.hp,
      alive: true,
      phase: 2,
      phaseTransitioned: true,
      x: boss.x,
      y: boss.y,
    });
    expect(restored.boss?.patternCooldowns[patternId]).toBeCloseTo(2.75);
    expect(restored.player).toMatchObject({ x: game.player.x, y: game.player.y });
  });

  it('restores both the Wako warning delay and a partially defeated invasion', () => {
    const warning = new GameSimulation('ulleungvillage');
    warning.startWakoInvasionPlaytest();
    expect(warning.hasWakoInvasionStarted()).toBe(false);

    const warningRestored = new GameSimulation();
    expect(warningRestored.importSinglePlayerSnapshot(warning.exportSinglePlayerSnapshot())).toBe(true);
    const magistrate = warningRestored.monsters.find((monster) =>
      monster.region === 'ulleungvillage' && monster.kind === 'ulleung-magistrate');
    expect(magistrate?.alive).toBe(true);
    for (let step = 0; step < 110; step += 1) warningRestored.update(0.05);
    expect(warningRestored.hasWakoInvasionStarted()).toBe(true);
    expect(warningRestored.monsters.filter((monster) =>
      monster.region === 'ulleungvillage' && monster.kind.startsWith('wako-') && monster.alive,
    )).toHaveLength(18);

    const invaders = warningRestored.monsters.filter((monster) =>
      monster.region === 'ulleungvillage' && monster.kind.startsWith('wako-'));
    invaders[0].hp = Math.floor(invaders[0].maxHp / 2);
    invaders[1].hp = 0;
    invaders[1].alive = false;
    invaders[1].respawnAt = Number.POSITIVE_INFINITY;

    const battleRestored = new GameSimulation();
    expect(battleRestored.importSinglePlayerSnapshot(
      warningRestored.exportSinglePlayerSnapshot(),
    )).toBe(true);
    expect(battleRestored.hasWakoInvasionStarted()).toBe(true);
    expect(battleRestored.isUlleungVillageLiberated()).toBe(false);
    expect(battleRestored.monsters.find((monster) => monster.id === invaders[0].id)).toMatchObject({
      alive: true,
      hp: invaders[0].hp,
    });
    expect(battleRestored.monsters.find((monster) => monster.id === invaders[1].id)).toMatchObject({
      alive: false,
      hp: 0,
      respawnAt: Number.POSITIVE_INFINITY,
    });
  });

  it('restores tree training, drop guards, world events and changed monster state', () => {
    const game = new GameSimulation('mistwood');
    game.trainAtTree();
    game.trainAtTree();
    game.groundDrops.push({
      id: 'drop-88',
      itemId: 'crescent-manual',
      x: game.player.x + 20,
      y: game.player.y,
    });
    const state = internals(game);
    state.activeWorldEvent = {
      kind: 'spirit-omen',
      region: 'mistwood',
      title: '달무리의 원귀',
      description: '남은 시간을 보존해야 하는 시험 사건',
      endsAt: state.elapsed + 23,
      progress: 2,
      goal: 5,
      rewardGold: 90,
    };
    state.nextWorldEventAt = state.elapsed + 47;
    state.worldEventCycle = 4;

    const wounded = game.monsters.find((monster) =>
      monster.region === 'mistwood' && monster.kind === 'bamboo-spirit')!;
    wounded.hp -= 11;
    wounded.x += 17;
    const respawning = game.monsters.find((monster) =>
      monster.region === 'mistwood' && monster.id !== wounded.id)!;
    respawning.hp = 0;
    respawning.alive = false;
    respawning.respawnAt = state.elapsed + 6.5;

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getTreeTrainingCount()).toBe(2);
    expect(restored.activeWorldEvent).toMatchObject({
      kind: 'spirit-omen',
      progress: 2,
      goal: 5,
    });
    expect(restored.getWorldEventRemainingSeconds()).toBeCloseTo(23);
    expect(internals(restored).nextWorldEventAt - internals(restored).elapsed).toBeCloseTo(47);
    expect(internals(restored).worldEventCycle).toBe(4);
    expect(restored.monsters.find((monster) => monster.id === wounded.id)).toMatchObject({
      hp: wounded.hp,
      x: wounded.x,
      alive: true,
    });
    const restoredRespawning = restored.monsters.find((monster) => monster.id === respawning.id)!;
    expect(restoredRespawning).toMatchObject({ hp: 0, alive: false });
    expect(restoredRespawning.respawnAt - internals(restored).elapsed).toBeCloseTo(6.5);

    const manualCount = restored.groundDrops.filter((drop) => drop.itemId === 'crescent-manual').length;
    internals(restored).dropItem(
      restored.monsters.find((monster) => monster.kind === 'bamboo-spirit')!,
    );
    expect(restored.groundDrops.filter((drop) => drop.itemId === 'crescent-manual')).toHaveLength(manualCount);
  });

  it('infers the starter weapon drop guard from a pending ground drop', () => {
    const game = new GameSimulation('ulleungdo');
    const guard = game.monsters.find((monster) =>
      monster.region === 'ulleungdo' && monster.kind === 'ulleung-guard')!;
    game.groundDrops.push({
      id: 'drop-40',
      itemId: 'worn-hwando',
      x: guard.x,
      y: guard.y,
    });
    internals(game).droppedStarterWeapon = false;
    const snapshot = game.exportSinglePlayerSnapshot();
    snapshot.progress.droppedStarterWeapon = false;

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(snapshot)).toBe(true);
    const restoredGuard = restored.monsters.find((monster) => monster.id === guard.id)!;
    internals(restored).dropItem(restoredGuard);
    expect(restored.groundDrops.filter((drop) => drop.itemId === 'worn-hwando')).toHaveLength(1);
  });

  it('recovers a zero-HP save at the character home instead of loading dead', () => {
    const game = new GameSimulation();
    game.enterDungeon();
    game.player.hp = 0;

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.region).toBe('village');
    expect(restored.player).toMatchObject({
      x: REGION_ORIGINS.village.x + 768,
      y: REGION_ORIGINS.village.y + 790,
      hp: restored.player.maxHp,
    });
    expect(restored.dungeonFloor).toBe(0);
    expect(restored.dungeonLayout).toBeNull();
    expect(restored.boss).toBeNull();
  });

  it('loads a sparse version-one save with safe defaults', () => {
    const legacy = new GameSimulation('solgogae').exportSinglePlayerSnapshot();
    const sparse = { ...legacy } as Partial<SinglePlayerSnapshot> & Record<string, unknown>;
    delete sparse.player;
    delete sparse.inventory;
    delete sparse.equipment;
    delete sparse.groundDrops;
    delete sparse.skillRanks;
    delete sparse.skillPoints;
    delete sparse.followers;
    delete sparse.highestBossCheckpoint;
    delete sparse.progress;

    const restored = new GameSimulation();
    expect(() => restored.importSinglePlayerSnapshot(sparse as SinglePlayerSnapshot)).not.toThrow();
    expect(restored.importSinglePlayerSnapshot(sparse as SinglePlayerSnapshot)).toBe(true);
    expect(restored.region).toBe('solgogae');
    expect(restored.player.hp).toBeGreaterThan(0);
    expect(restored.inventory).toEqual([]);
    expect(restored.equipment).toEqual({ weapon: null, armor: null, charm: null });
  });
});
