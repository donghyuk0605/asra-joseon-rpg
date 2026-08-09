import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import { REGIONS } from './regions';
import { WORLD_MAP_NODES } from './worldMap';
import {
  CAMPAIGN_FIELD_ROUTES,
  fieldExitApproachPoint,
  fieldExitGuidesForRegion,
} from './fieldRoutes';

describe('field route guidance', () => {
  it('keeps every visible campaign plaque inside a real region and local map', () => {
    const ids = new Set<string>();
    for (const route of CAMPAIGN_FIELD_ROUTES) {
      expect(REGIONS[route.region], route.id).toBeDefined();
      expect(REGIONS[route.destination], route.id).toBeDefined();
      expect(route.localX, route.id).toBeGreaterThanOrEqual(0);
      expect(route.localX, route.id).toBeLessThanOrEqual(MAP_WIDTH);
      expect(route.localY, route.id).toBeGreaterThanOrEqual(0);
      expect(route.localY, route.id).toBeLessThanOrEqual(MAP_HEIGHT);
      expect(ids.has(route.id), route.id).toBe(false);
      ids.add(route.id);
    }
  });

  it('shows reciprocal road exits through the Ulleung fields', () => {
    const islandOffice = fieldExitGuidesForRegion('ulleungdo');
    expect(islandOffice).toEqual(expect.arrayContaining([
      expect.objectContaining({ destination: 'ulleungridge', edge: 'north', mode: 'road' }),
      expect.objectContaining({ destination: 'ulleungvillage', edge: 'south', mode: 'road' }),
    ]));
    expect(fieldExitGuidesForRegion('ulleungvillage')).toContainEqual(
      expect.objectContaining({ destination: 'ulleungdo', edge: 'north', mode: 'road' }),
    );
  });

  it('marks the overlapping home field and village as a real local road', () => {
    expect(fieldExitGuidesForRegion('solgogae')).toContainEqual(
      expect.objectContaining({ destination: 'village', edge: 'south', mode: 'road' }),
    );
    expect(fieldExitGuidesForRegion('village')).toContainEqual(
      expect.objectContaining({ destination: 'solgogae', edge: 'north', mode: 'road' }),
    );
  });

  it('derives both neighboring exits for a middle Episode II road region', () => {
    expect(fieldExitGuidesForRegion('jaeryeong')).toEqual(expect.arrayContaining([
      expect.objectContaining({ destination: 'hwangju', edge: 'north', mode: 'road' }),
      expect.objectContaining({ destination: 'anju', edge: 'south', mode: 'road' }),
    ]));
  });

  it('distinguishes island ferries from roads and distant story jumps', () => {
    expect(fieldExitGuidesForRegion('ikiport')).toEqual(expect.arrayContaining([
      expect.objectContaining({ destination: 'awajicoast', mode: 'ferry' }),
      expect.objectContaining({ destination: 'tsushimahunt', mode: 'ferry' }),
    ]));
    expect(fieldExitGuidesForRegion('izuhara')).toContainEqual(
      expect.objectContaining({ destination: 'busanjin', mode: 'portal', requiresClear: true }),
    );
    expect(fieldExitGuidesForRegion('busanjin')).toEqual(expect.arrayContaining([
      expect.objectContaining({ destination: 'jeonju', mode: 'portal' }),
      expect.objectContaining({ destination: 'geoje', edge: 'east', mode: 'ferry' }),
    ]));
    expect(fieldExitGuidesForRegion('geoje')).toContainEqual(
      expect.objectContaining({ destination: 'busanjin', edge: 'east', mode: 'ferry' }),
    );
  });

  it('uses authored city gates ahead of generic terrain seams', () => {
    const exits = fieldExitGuidesForRegion('hanseongmarket');
    expect(exits.filter((exit) => exit.destination === 'changdeokgung')).toHaveLength(1);
    expect(exits).toContainEqual(expect.objectContaining({
      destination: 'changdeokgung',
      label: '창덕궁 돈화문',
    }));
  });

  it('shows a usable local exit on every one of the 81 authored regions', () => {
    const regionsWithoutExit = Object.keys(REGIONS).filter((region) => (
      fieldExitGuidesForRegion(region as keyof typeof REGIONS).length === 0
    ));
    expect(Object.keys(REGIONS)).toHaveLength(81);
    expect(regionsWithoutExit).toEqual([]);
  });

  it('guides dungeon returns and final-defense refuge returns explicitly', () => {
    expect(fieldExitGuidesForRegion('minepass')).toContainEqual(expect.objectContaining({
      destination: 'dungeon',
      mode: 'portal',
      label: '무영광산 입구',
    }));
    expect(fieldExitGuidesForRegion('dungeon')).toContainEqual(expect.objectContaining({
      destination: 'minepass',
      mode: 'portal',
      label: '지상 귀환 계단',
    }));
    expect(fieldExitGuidesForRegion('namhansanseong')).toContainEqual(expect.objectContaining({
      destination: 'gyeongbokinner',
      requiresClear: true,
      mode: 'portal',
    }));
    expect(fieldExitGuidesForRegion('ganghwado')).toContainEqual(expect.objectContaining({
      destination: 'gyeongbokinner',
      requiresClear: true,
      mode: 'ferry',
    }));
  });

  it('keeps the new Busan and Geoje ferry signs on reachable ground', () => {
    for (const region of ['busanjin', 'geoje'] as const) {
      const game = new GameSimulation(region);
      const collision = game as unknown as {
        isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
      };
      const origin = REGION_ORIGINS[region];
      const ferry = fieldExitGuidesForRegion(region)
        .find((exit) => exit.mode === 'ferry' && ['geoje', 'busanjin'].includes(exit.destination));
      expect(ferry, region).toBeDefined();
      expect(collision.isRoutePointClear({
        x: origin.x + ferry!.x,
        y: origin.y + ferry!.y,
      }, 20), region).toBe(true);
    }
  });

  it('keeps every local exit approach point on collision-free ground', () => {
    const blocked: string[] = [];
    for (const region of Object.keys(REGIONS) as Array<keyof typeof REGIONS>) {
      const game = new GameSimulation(region);
      const collision = game as unknown as {
        isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
      };
      const origin = REGION_ORIGINS[region];
      for (const exit of fieldExitGuidesForRegion(region)) {
        const approach = fieldExitApproachPoint(exit);
        if (!collision.isRoutePointClear({
          x: origin.x + approach.x,
          y: origin.y + approach.y,
        }, 20)) blocked.push(`${region} -> ${exit.destination} (${exit.id})`);
      }
    }
    expect(blocked).toEqual([]);
  });

  it('can walk from every local exit approach into its region interior', () => {
    const disconnected: string[] = [];
    for (const region of Object.keys(REGIONS) as Array<keyof typeof REGIONS>) {
      const game = new GameSimulation(region);
      const collision = game as unknown as {
        isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
      };
      const origin = REGION_ORIGINS[region];
      const clear = (x: number, y: number) => collision.isRoutePointClear({
        x: origin.x + x,
        y: origin.y + y,
      }, 20);
      for (const exit of fieldExitGuidesForRegion(region)) {
        const start = fieldExitApproachPoint(exit);
        const queue = [start];
        const seen = new Set([`${Math.round(start.x / 16)},${Math.round(start.y / 16)}`]);
        let reachedInterior = start.x >= 500 && start.x <= 1036
          && start.y >= 300 && start.y <= 724;
        while (queue.length && !reachedInterior) {
          const point = queue.shift()!;
          for (const [dx, dy] of [
            [32, 0], [-32, 0], [0, 32], [0, -32],
            [24, 24], [-24, 24], [24, -24], [-24, -24],
          ]) {
            const x = Math.max(24, Math.min(MAP_WIDTH - 24, point.x + dx));
            const y = Math.max(24, Math.min(MAP_HEIGHT - 24, point.y + dy));
            const key = `${Math.round(x / 16)},${Math.round(y / 16)}`;
            if (seen.has(key) || !clear(x, y)) continue;
            seen.add(key);
            if (x >= 500 && x <= 1036 && y >= 300 && y <= 724) {
              reachedInterior = true;
              break;
            }
            queue.push({ x, y });
          }
        }
        if (!reachedInterior) disconnected.push(`${region} -> ${exit.destination} (${exit.id})`);
      }
    }
    expect(disconnected).toEqual([]);
  });

  it('lands every world-map destination on collision-free ground', () => {
    const game = new GameSimulation('village');
    game.enableTravelMode();
    const collision = game as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    };
    for (const node of WORLD_MAP_NODES) {
      expect(game.travelByWorldMap(node.destination), node.id).toBe('traveled');
      expect(collision.isRoutePointClear(game.player, 20), node.id).toBe(true);
    }
  });

  it('travels every open campaign plaque and lands safely', () => {
    const failed: string[] = [];
    for (const route of CAMPAIGN_FIELD_ROUTES.filter((entry) => !entry.requiresClear)) {
      const game = new GameSimulation(route.region);
      const collision = game as unknown as {
        isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
      };
      game.travelToCampaignRegion(route.destination, route.entrance);
      if (game.region !== route.destination) {
        failed.push(`${route.region} -> ${route.destination}: blocked`);
        continue;
      }
      if (!collision.isRoutePointClear(game.player, 20)) {
        failed.push(`${route.region} -> ${route.destination}: unsafe arrival`);
      }
    }
    expect(failed).toEqual([]);
  });

  it('connects all 81 authored fields into one reciprocal local travel graph', () => {
    const regions = Object.keys(REGIONS) as Array<keyof typeof REGIONS>;
    const exits = new Map(regions.map((region) => [region, fieldExitGuidesForRegion(region)]));
    const missingReverse = regions.flatMap((region) => (exits.get(region) ?? [])
      .filter((exit) => !(exits.get(exit.destination) ?? [])
        .some((candidate) => candidate.destination === region))
      .filter((exit) => ![
        'izuhara-busanjin',
        'gyeongbokinner-pyongyanginner',
        'heuksuvillage-jurchenvillage',
        'pyongyanginner-gyeongbokgate',
        'namhansanseong-gyeongbokinner',
        'ganghwado-gyeongbokinner',
      ].includes(`${region}-${exit.destination}`))
      .map((exit) => `${region} -> ${exit.destination}`));
    expect(missingReverse).toEqual([]);

    const visited = new Set<keyof typeof REGIONS>(['village']);
    const queue: Array<keyof typeof REGIONS> = ['village'];
    while (queue.length) {
      const current = queue.shift()!;
      for (const exit of exits.get(current) ?? []) {
        if (visited.has(exit.destination)) continue;
        visited.add(exit.destination);
        queue.push(exit.destination);
      }
      for (const source of regions) {
        if (visited.has(source)) continue;
        if (!(exits.get(source) ?? []).some((exit) => exit.destination === current)) continue;
        visited.add(source);
        queue.push(source);
      }
    }
    expect([...regions.filter((region) => !visited.has(region))]).toEqual([]);
  });
});
