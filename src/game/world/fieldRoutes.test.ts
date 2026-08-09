import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import { REGIONS } from './regions';
import {
  CAMPAIGN_FIELD_ROUTES,
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
});
