import { describe, expect, it } from 'vitest';
import {
  BETA_ROADSIDE_PROP_PLACEMENTS,
  betaRoadsidePropsForRegion,
  betaRoadsidePropWorldObstacles,
  GRAND_DISTRICT_REGION_IDS,
} from './betaRoadsideProps';
import { MAP_HEIGHT, MAP_WIDTH } from './layout';

describe('beta roadside props', () => {
  it('keeps every prop inside its region and gives it a conservative collision footprint', () => {
    expect(BETA_ROADSIDE_PROP_PLACEMENTS.length).toBeGreaterThanOrEqual(66);
    expect(new Set(BETA_ROADSIDE_PROP_PLACEMENTS.map((prop) => prop.id)).size)
      .toBe(BETA_ROADSIDE_PROP_PLACEMENTS.length);
    for (const prop of BETA_ROADSIDE_PROP_PLACEMENTS) {
      expect(prop.x).toBeGreaterThan(prop.collisionRadius);
      expect(prop.x).toBeLessThan(MAP_WIDTH - prop.collisionRadius);
      expect(prop.y).toBeGreaterThan(prop.collisionRadius);
      expect(prop.y).toBeLessThan(MAP_HEIGHT - prop.collisionRadius);
      expect(prop.frame).toBeGreaterThanOrEqual(0);
      expect(prop.frame).toBeLessThan(6);
    }
    expect(betaRoadsidePropWorldObstacles()).toHaveLength(BETA_ROADSIDE_PROP_PLACEMENTS.length);
  });

  it('fills every enlarged capital and battlefield district without closing the axial road', () => {
    for (const region of GRAND_DISTRICT_REGION_IDS) {
      const props = betaRoadsidePropsForRegion(region);
      expect(props.length, region).toBeGreaterThanOrEqual(region === 'changdeokgung' ? 4 : 6);
      for (const prop of props) {
        expect(
          prop.x + prop.collisionRadius <= 536 || prop.x - prop.collisionRadius >= 1000,
          `${region}:${prop.id}`,
        ).toBe(true);
      }
    }
  });
});
