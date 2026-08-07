import { describe, expect, it } from 'vitest';
import { BETA_ROADSIDE_PROP_PLACEMENTS, betaRoadsidePropWorldObstacles } from './betaRoadsideProps';
import { MAP_HEIGHT, MAP_WIDTH } from './layout';

describe('beta roadside props', () => {
  it('keeps every prop inside its region and gives it a conservative collision footprint', () => {
    expect(BETA_ROADSIDE_PROP_PLACEMENTS.length).toBeGreaterThanOrEqual(8);
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
});
