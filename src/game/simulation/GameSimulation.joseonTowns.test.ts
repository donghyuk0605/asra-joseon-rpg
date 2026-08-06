import { describe, expect, it } from 'vitest';
import { GameSimulation } from './GameSimulation';
import { MAP_HEIGHT, REGION_ORIGINS } from '../world/layout';
import {
  JOSEON_TOWN_LAYOUTS,
  JOSEON_TOWN_REGION_IDS,
  joseonTownGate,
  type JoseonTownObstacle,
} from '../world/joseonTowns';
import type { JoseonTownRegionId } from '../world/regions';

const SOUTHBOUND_ROAD = [
  'gaeseong',
  'changdeokgung',
  'hanseongmarket',
  'hanseongsouth',
  'suwon',
  'chungju',
  'andong',
] as const satisfies readonly JoseonTownRegionId[];

const advanceUntilRegion = (
  game: GameSimulation,
  expected: JoseonTownRegionId,
  maxSteps = 180,
): void => {
  for (let step = 0; step < maxSteps && game.region !== expected; step += 1) {
    game.update(0.05);
  }
};

const expectOutsideObstacle = (
  game: GameSimulation,
  region: JoseonTownRegionId,
  obstacle: JoseonTownObstacle,
): void => {
  const origin = REGION_ORIGINS[region];
  const dx = Math.abs(game.player.x - (origin.x + obstacle.x));
  const dy = Math.abs(game.player.y - (origin.y + obstacle.y));
  if (obstacle.type === 'circle') {
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(obstacle.radius + 19);
    return;
  }
  expect(
    dx >= obstacle.width / 2 + 19
      || dy >= obstacle.height / 2 + 19,
  ).toBe(true);
};

describe('Joseon settlement road simulation', () => {
  it('keeps all seven settlement maps free of hostile monster rosters', () => {
    const game = new GameSimulation('hanseongsouth');
    for (const region of JOSEON_TOWN_REGION_IDS) {
      expect(game.monsters.filter((monster) => monster.region === region), region).toEqual([]);
    }
  });

  it('walks south through every signed gate while preserving the player lane', () => {
    const game = new GameSimulation(SOUTHBOUND_ROAD[0]);
    game.player.x = REGION_ORIGINS.gaeseong.x + 704;

    for (let index = 0; index < SOUTHBOUND_ROAD.length - 1; index += 1) {
      const from = SOUTHBOUND_ROAD[index];
      const destination = SOUTHBOUND_ROAD[index + 1];
      const fromOrigin = REGION_ORIGINS[from];
      game.moveTo({
        x: fromOrigin.x + 704,
        y: fromOrigin.y + MAP_HEIGHT + 20,
      });
      advanceUntilRegion(game, destination);

      expect(game.region).toBe(destination);
      expect(game.player.x - REGION_ORIGINS[destination].x).toBeCloseTo(704, 0);
      const entrance = joseonTownGate(destination, 'north');
      const expectedArrivalY = entrance && entrance.y > 100
        ? entrance.y + entrance.height / 2 + 28
        : 12;
      expect(game.player.y - REGION_ORIGINS[destination].y).toBeCloseTo(expectedArrivalY, 0);
    }
  });

  it('walks north through every signed gate without bouncing to campaign maps', () => {
    const northbound = [...SOUTHBOUND_ROAD].reverse();
    const game = new GameSimulation(northbound[0]);
    game.player.x = REGION_ORIGINS.andong.x + 832;

    for (let index = 0; index < northbound.length - 1; index += 1) {
      const from = northbound[index];
      const destination = northbound[index + 1];
      const fromOrigin = REGION_ORIGINS[from];
      game.moveTo({
        x: fromOrigin.x + 832,
        y: fromOrigin.y - 20,
      });
      advanceUntilRegion(game, destination);

      expect(game.region).toBe(destination);
      expect(game.player.x - REGION_ORIGINS[destination].x).toBeCloseTo(832, 0);
      expect(game.player.y - REGION_ORIGINS[destination].y).toBeCloseTo(MAP_HEIGHT - 12, 0);
    }
  });

  it('keeps every authored building footprint solid and blocks the Chungju river bank', () => {
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const obstacle = JOSEON_TOWN_LAYOUTS[region].obstacles[0];
      const origin = REGION_ORIGINS[region];
      const game = new GameSimulation(region);
      game.moveTo({ x: origin.x + obstacle.x, y: origin.y + obstacle.y });
      for (let step = 0; step < 180; step += 1) game.update(0.05);
      expectOutsideObstacle(game, region, obstacle);
    }

    const riverGame = new GameSimulation('chungju');
    const origin = REGION_ORIGINS.chungju;
    for (const obstacleId of ['chungju-river-west-channel', 'chungju-river-east-channel']) {
      const river = JOSEON_TOWN_LAYOUTS.chungju.obstacles
        .find((obstacle) => obstacle.id === obstacleId)!;
      riverGame.moveTo({ x: origin.x + river.x, y: origin.y + river.y });
      for (let step = 0; step < 180; step += 1) riverGame.update(0.05);
      expectOutsideObstacle(riverGame, 'chungju', river);
    }
  });

  it('supports world-map arrival and persists discovered towns in a save round trip', () => {
    const game = new GameSimulation('hanseongsouth');
    expect(game.unlockAllWorldMapNodesForPlaytest()).toBe(true);
    expect(game.travelByWorldMap('andong')).toBe('traveled');
    expect(game.region).toBe('andong');

    game.travelToCampaignRegion('chungju', 'south');
    game.travelToCampaignRegion('suwon', 'south');
    const snapshot = game.exportSinglePlayerSnapshot();
    expect(snapshot.progress.visitedRegions).toEqual(expect.arrayContaining([
      'hanseongsouth',
      'andong',
      'chungju',
      'suwon',
    ]));

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(snapshot)).toBe(true);
    expect(restored.region).toBe('suwon');
    expect(restored.getUnlockedWorldMapRegions()).toEqual(expect.arrayContaining([
      'hanseongsouth',
      'suwon',
      'chungju',
      'andong',
    ]));
  });
});
