import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import {
  isJapanRegion,
  JAPAN_REGION_IDS,
  JAPAN_STAGE_COPY,
  japanBackwardDestination,
  japanForwardDestination,
} from './japanCampaign';

describe('Japan campaign', () => {
  it('forms one ordered eleven-stage road without overlapping world cells', () => {
    expect(JAPAN_REGION_IDS).toEqual([
      'osaka',
      'settsuvillage',
      'yamazakihunt',
      'osakacastle',
      'shogunkeep',
      'sakaicity',
      'izumihunt',
      'awajicoast',
      'ikiport',
      'tsushimahunt',
      'izuhara',
    ]);
    for (const [index, region] of JAPAN_REGION_IDS.entries()) {
      expect(isJapanRegion(region)).toBe(true);
      if (index === 0) {
        expect(japanBackwardDestination(region)).toBeNull();
      } else {
        expect(japanBackwardDestination(region)).toBe(JAPAN_REGION_IDS[index - 1]);
        expect(REGION_ORIGINS[JAPAN_REGION_IDS[index - 1]].y - REGION_ORIGINS[region].y).toBe(MAP_HEIGHT);
      }
    }
    expect(japanForwardDestination('osaka')).toBe('settsuvillage');
    expect(japanForwardDestination('shogunkeep')).toBe('sakaicity');
    expect(japanForwardDestination('izuhara')).toBe('busanjin');
    expect(JAPAN_REGION_IDS.map((region) => JAPAN_STAGE_COPY[region].chapter)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(JAPAN_STAGE_COPY.izuhara.next).toBe('부산진');
  });

  it('blocks the next road until each local objective is cleared', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();

    game.travelToCampaignRegion('settsuvillage', 'south');
    expect(game.region).toBe('osaka');
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'japan-gate-blocked',
      region: 'osaka',
    }));

    expect(game.completeJapanStageForPlaytest('osaka')).toBe(true);
    game.travelToCampaignRegion('settsuvillage', 'south');
    expect(game.region).toBe('settsuvillage');
    expect(game.player.y).toBe(REGION_ORIGINS.settsuvillage.y + MAP_HEIGHT - 12);
  });

  it('carries Yeonhwa from Osaka through the island route to Busanjin', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();

    const route = [...JAPAN_REGION_IDS, 'busanjin'] as const;
    for (let index = 0; index < JAPAN_REGION_IDS.length; index += 1) {
      const stage = JAPAN_REGION_IDS[index];
      expect(game.region).toBe(stage);
      expect(game.completeJapanStageForPlaytest(stage)).toBe(true);
      game.travelToCampaignRegion(route[index + 1], 'south');
    }
    expect(game.region).toBe('busanjin');
  });

  it('preserves the walking lane at Japan borders instead of pulling to the centre', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    expect(game.completeJapanStageForPlaytest('osaka')).toBe(true);
    game.player.x = REGION_ORIGINS.osaka.x + 642;

    game.travelToCampaignRegion('settsuvillage', 'south');
    expect(game.region).toBe('settsuvillage');
    expect(game.player.x).toBe(REGION_ORIGINS.settsuvillage.x + 642);
    expect(game.player.y).toBe(REGION_ORIGINS.settsuvillage.y + MAP_HEIGHT - 12);
    expect(game.player.destination).toBeNull();

    game.travelToCampaignRegion('osaka', 'north');
    expect(game.region).toBe('osaka');
    expect(game.player.x).toBe(REGION_ORIGINS.osaka.x + 642);
    expect(game.player.y).toBe(REGION_ORIGINS.osaka.y + 12);
    expect(game.player.destination).toBeNull();
  });

  it('enters a second Shogun phase and awards two enchant scrolls on victory', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    for (const stage of JAPAN_REGION_IDS.slice(0, JAPAN_REGION_IDS.indexOf('shogunkeep'))) {
      game.completeJapanStageForPlaytest(stage);
      game.travelToCampaignRegion(japanForwardDestination(stage), 'south');
    }
    const shogun = game.monsters.find((monster) => monster.kind === 'japanese-shogun')!;
    game.player.x = shogun.x;
    game.player.y = shogun.y + 120;
    game.moveTo({ x: game.player.x + 5, y: game.player.y });
    shogun.hp = Math.floor(shogun.maxHp / 2);
    game.update(0.05);
    game.update(0.05);
    expect(game.drainEvents()).toContainEqual({
      type: 'shogun-phase-changed',
      monsterId: shogun.id,
      phase: 2,
    });

    const goldBefore = game.player.gold;
    const pointsBefore = game.skillPoints;
    const killMonster = (game as unknown as {
      killMonster: (monster: (typeof game.monsters)[number]) => void;
    }).killMonster.bind(game);
    killMonster(shogun);
    const events = game.drainEvents();
    expect(events).toContainEqual({ type: 'shogun-defeated', gold: 900, skillPoints: 2 });
    expect(game.player.gold).toBeGreaterThanOrEqual(goldBefore + 900);
    expect(game.skillPoints).toBe(pointsBefore + 2);
    expect(game.groundDrops.map((drop) => drop.itemId)).toEqual(expect.arrayContaining([
      'weapon-enchant-scroll',
      'armor-enchant-scroll',
    ]));
  });

  it('restores cleared Japanese stages without respawning their mission targets', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    game.completeJapanStageForPlaytest('osaka');
    game.travelToCampaignRegion('settsuvillage', 'south');
    game.completeJapanStageForPlaytest('settsuvillage');

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.isJapanStageCleared('osaka')).toBe(true);
    expect(restored.isJapanStageCleared('settsuvillage')).toBe(true);
    expect(restored.monsters
      .filter((monster) => monster.region === 'settsuvillage' && monster.kind.startsWith('japanese-') && !monster.kind.includes('deer') && !monster.kind.includes('boar'))
      .every((monster) => !monster.alive)).toBe(true);
  });

  it('keeps a partially cleared Japanese stage and a wounded Shogun intact across saves', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    game.completeJapanStageForPlaytest('osaka');
    game.travelToCampaignRegion('settsuvillage', 'north');

    const settsuTargets = game.monsters.filter((monster) =>
      monster.region === 'settsuvillage'
      && monster.kind.startsWith('japanese-')
      && !monster.kind.includes('deer')
      && !monster.kind.includes('boar'));
    const [fallen, wounded] = settsuTargets;
    fallen.alive = false;
    fallen.hp = 0;
    wounded.hp = Math.floor(wounded.maxHp * 0.42);

    const partialRestore = new GameSimulation();
    expect(partialRestore.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(partialRestore.monsters.find((monster) => monster.id === fallen.id)).toMatchObject({
      alive: false,
      hp: 0,
    });
    expect(partialRestore.monsters.find((monster) => monster.id === wounded.id)?.hp).toBe(wounded.hp);

    for (const stage of JAPAN_REGION_IDS.slice(0, JAPAN_REGION_IDS.indexOf('shogunkeep'))) {
      if (game.region !== stage) game.travelToCampaignRegion(stage, 'south');
      game.completeJapanStageForPlaytest(stage);
      game.travelToCampaignRegion(japanForwardDestination(stage), 'south');
    }
    const shogun = game.monsters.find((monster) => monster.kind === 'japanese-shogun')!;
    shogun.hp = Math.floor(shogun.maxHp * 0.5);
    game.update(0.05);
    expect(game.exportSinglePlayerSnapshot().progress.shogunSecondPhase).toBe(true);

    const bossRestore = new GameSimulation();
    expect(bossRestore.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    const restoredShogun = bossRestore.monsters.find((monster) => monster.id === shogun.id)!;
    expect(restoredShogun.hp).toBe(shogun.hp);
    expect(bossRestore.exportSinglePlayerSnapshot().progress.shogunSecondPhase).toBe(true);
  });

  it('ramps the mudang campaign from a three-enemy opening engagement to the keep', () => {
    const game = new GameSimulation();
    const settsuGeneral = game.monsters.find((monster) =>
      monster.region === 'settsuvillage' && monster.kind === 'japanese-general')!;
    const castleGeneral = game.monsters.find((monster) =>
      monster.region === 'osakacastle' && monster.kind === 'japanese-general')!;
    const shogun = game.monsters.find((monster) => monster.kind === 'japanese-shogun')!;

    expect(settsuGeneral.maxHp).toBeLessThan(320);
    expect(settsuGeneral.damage).toBeLessThanOrEqual(14);
    expect(castleGeneral.maxHp).toBeGreaterThan(settsuGeneral.maxHp);
    expect(shogun.maxHp).toBeGreaterThan(castleGeneral.maxHp);
    expect(shogun.damage).toBeLessThanOrEqual(25);
  });

  it('keeps Osaka training gunners at musket range instead of using melee skirmisher AI', () => {
    const game = new GameSimulation('osaka');
    const gunner = game.monsters.find((monster) =>
      monster.region === 'osaka' && monster.kind === 'osaka-gunner')!;
    const runtime = game as unknown as {
      playerActive: boolean;
      updateMonster: (monster: typeof gunner, dt: number) => void;
    };
    game.player.x = gunner.x + 330;
    game.player.y = gunner.y;
    gunner.aggro = true;
    gunner.aiState = 'chase';
    gunner.attackCooldown = 0;
    runtime.playerActive = true;

    runtime.updateMonster(gunner, 0.05);

    expect(gunner.aiState).toBe('attack');
    expect(gunner.attackCooldown).toBeGreaterThanOrEqual(2.4);
    expect(game.drainEvents()).toContainEqual({
      type: 'monster-attack',
      monsterId: gunner.id,
      damage: expect.any(Number),
    });
  });

  it('moves legacy Japanese saves from the old world column onto the relocated northern road', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    const snapshot = game.exportSinglePlayerSnapshot();
    snapshot.player.x = MAP_WIDTH * 2;
    snapshot.player.y = MAP_HEIGHT * 2;

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(snapshot)).toBe(true);
    expect(restored.player.x).toBe(REGION_ORIGINS.osaka.x + 768);
    expect(restored.player.y).toBe(REGION_ORIGINS.osaka.y + 850);
  });

  it('keeps every Japanese formation and the full northbound seam road off painted scenery', () => {
    const game = new GameSimulation();
    const collision = game as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    };
    for (const region of JAPAN_REGION_IDS) {
      game.region = region;
      const origin = REGION_ORIGINS[region];
      for (let localY = 12; localY <= MAP_HEIGHT - 12; localY += 52) {
        expect(
          collision.isRoutePointClear({ x: origin.x + MAP_WIDTH / 2, y: origin.y + localY }, 20),
          `${region}:center-road:${localY}`,
        ).toBe(true);
      }
      for (const monster of game.monsters.filter((candidate) => candidate.region === region)) {
        expect(collision.isRoutePointClear(monster.spawn, 24), `${region}:${monster.id}`).toBe(true);
      }
    }

    for (const [region, localPoint] of [
      ['osaka', { x: 125, y: 540 }],
      ['settsuvillage', { x: 100, y: 512 }],
      ['yamazakihunt', { x: 100, y: 512 }],
      ['osakacastle', { x: 175, y: 650 }],
      ['shogunkeep', { x: 140, y: 512 }],
    ] as const) {
      const origin = REGION_ORIGINS[region];
      game.region = region;
      expect(collision.isRoutePointClear({
        x: origin.x + localPoint.x,
        y: origin.y + localPoint.y,
      }, 20)).toBe(false);
    }

    game.region = 'settsuvillage';
    const settsu = REGION_ORIGINS.settsuvillage;
    for (const [x, y] of [[930, 710], [870, 750]] as const) {
      expect(collision.isRoutePointClear({ x: settsu.x + x, y: settsu.y + y }, 20)).toBe(true);
    }
  });
});
