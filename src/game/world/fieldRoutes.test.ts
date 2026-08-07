import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH } from './layout';
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
  });

  it('uses authored city gates ahead of generic terrain seams', () => {
    const exits = fieldExitGuidesForRegion('hanseongmarket');
    expect(exits.filter((exit) => exit.destination === 'changdeokgung')).toHaveLength(1);
    expect(exits).toContainEqual(expect.objectContaining({
      destination: 'changdeokgung',
      label: '창덕궁 돈화문',
    }));
  });
});
