import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS, ULLEUNG_PASSAGE_HEIGHT } from './layout';
import { existsSync } from 'node:fs';
import { ASSETS } from '../assets/manifest';
import {
  isUlleungRegion,
  ULLEUNG_PASSAGES,
  ULLEUNG_REGION_IDS,
  ULLEUNG_ROAD_ANCHORS,
  ULLEUNG_WORLD_BOUNDS,
  ulleungAdjacentEntryPoint,
  ulleungPassageAtY,
  ulleungRegionAtY,
  ulleungRoadCenterAtY,
  ulleungWalkableBoundsAt,
} from './ulleungContinuity';

describe('Ulleung continuous world strip', () => {
  it('joins all six island regions and five walkable passages into one camera boundary', () => {
    expect(ULLEUNG_REGION_IDS).toEqual([
      'ulleungcoast',
      'ulleungmeadow',
      'ulleunghunt',
      'ulleungridge',
      'ulleungdo',
      'ulleungvillage',
    ]);
    expect(ULLEUNG_WORLD_BOUNDS).toEqual({
      x: REGION_ORIGINS.ulleungcoast.x,
      y: REGION_ORIGINS.ulleungcoast.y,
      width: MAP_WIDTH,
      height: MAP_HEIGHT * 6 + ULLEUNG_PASSAGE_HEIGHT * 5,
    });
    expect(ULLEUNG_WORLD_BOUNDS.y + ULLEUNG_WORLD_BOUNDS.height)
      .toBe(REGION_ORIGINS.ulleungvillage.y + MAP_HEIGHT);
  });

  it('provides a full-height passage and stable region handoff at every terrain boundary', () => {
    expect(ULLEUNG_PASSAGES).toHaveLength(5);
    for (const passage of ULLEUNG_PASSAGES) {
      expect(passage.height).toBe(ULLEUNG_PASSAGE_HEIGHT);
      expect(ulleungPassageAtY(passage.y + passage.height / 2)).toEqual(passage);
      expect(ulleungRegionAtY(passage.y + passage.height * 0.25)).toBe(passage.upper);
      expect(ulleungRegionAtY(passage.y + passage.height * 0.75)).toBe(passage.lower);
    }
  });

  it('connects every painted road endpoint with the same curved gameplay corridor', () => {
    for (const passage of ULLEUNG_PASSAGES) {
      expect(passage.startX).toBe(REGION_ORIGINS[passage.upper].x + ULLEUNG_ROAD_ANCHORS[passage.upper].southX);
      expect(passage.endX).toBe(REGION_ORIGINS[passage.lower].x + ULLEUNG_ROAD_ANCHORS[passage.lower].northX);
      expect(ulleungRoadCenterAtY(passage.y)).toBeCloseTo(passage.startX, 4);
      expect(ulleungRoadCenterAtY(passage.y + passage.height - 0.001)).toBeCloseTo(passage.endX, 2);
      const middle = passage.y + passage.height / 2;
      const bounds = ulleungWalkableBoundsAt(passage.upper, middle);
      expect(bounds.center).toBeCloseTo(ulleungRoadCenterAtY(middle), 4);
      expect(bounds.right - bounds.left).toBe(passage.halfWidth * 2);
    }
  });

  it('returns a road-centered entry point 140px inside every adjacent island region', () => {
    for (let index = 0; index < ULLEUNG_REGION_IDS.length - 1; index += 1) {
      const upper = ULLEUNG_REGION_IDS[index];
      const lower = ULLEUNG_REGION_IDS[index + 1];
      const southY = REGION_ORIGINS[lower].y + 140;
      const northY = REGION_ORIGINS[upper].y + MAP_HEIGHT - 140;

      expect(ulleungAdjacentEntryPoint(upper, 'south')).toEqual({
        region: lower,
        x: ulleungRoadCenterAtY(southY),
        y: southY,
      });
      expect(ulleungAdjacentEntryPoint(lower, 'north')).toEqual({
        region: upper,
        x: ulleungRoadCenterAtY(northY),
        y: northY,
      });
    }

    expect(ulleungAdjacentEntryPoint(ULLEUNG_REGION_IDS[0], 'north')).toBeNull();
    expect(ulleungAdjacentEntryPoint(
      ULLEUNG_REGION_IDS[ULLEUNG_REGION_IDS.length - 1],
      'south',
    )).toBeNull();
  });

  it('keeps sea and cliff edges outside the authored walkable profiles', () => {
    const coast = REGION_ORIGINS.ulleungcoast;
    const coastBounds = ulleungWalkableBoundsAt('ulleungcoast', coast.y + 500);
    expect(coast.x + 120).toBeLessThan(coastBounds.left);
    expect(coast.x + 1450).toBeGreaterThan(coastBounds.right);

    const meadow = REGION_ORIGINS.ulleungmeadow;
    const meadowBounds = ulleungWalkableBoundsAt('ulleungmeadow', meadow.y + 120);
    expect(meadow.x + 220).toBeLessThan(meadowBounds.left);
    expect(meadow.x + 1320).toBeGreaterThan(meadowBounds.right);

    const prison = REGION_ORIGINS.ulleungdo;
    const prisonBounds = ulleungWalkableBoundsAt('ulleungdo', prison.y + 180);
    expect(prison.x + 1400).toBeGreaterThan(prisonBounds.right);
  });

  it('does not classify mainland regions as part of the island camera strip', () => {
    expect(ULLEUNG_REGION_IDS.every(isUlleungRegion)).toBe(true);
    expect(isUlleungRegion('village')).toBe(false);
    expect(isUlleungRegion('yeongwol')).toBe(false);
  });

  it('ships one feathered texture for every island terrain boundary', () => {
    const seams = [
      ASSETS.transitions.ulleungCoastMeadow,
      ASSETS.transitions.ulleungMeadowHunt,
      ASSETS.transitions.ulleungHuntRidge,
      ASSETS.transitions.ulleungRidgePrison,
      ASSETS.transitions.ulleungPrisonGovernment,
    ];
    expect(seams).toHaveLength(5);
    for (const seam of seams) {
      expect(seam.key).toContain('-blend-v3');
      expect(existsSync(`public${seam.path}`)).toBe(true);
    }
  });
});
