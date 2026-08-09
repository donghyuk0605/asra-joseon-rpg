import { describe, expect, it } from 'vitest';
import { GRAND_DISTRICT_REGION_IDS } from './betaRoadsideProps';
import {
  GRAND_DISTRICT_ACTOR_SCALE,
  worldActorPresentationScale,
} from './worldPresentationScale';

describe('grand district presentation scale', () => {
  it('reduces actor presentation across every recomposed city and battlefield only', () => {
    expect(GRAND_DISTRICT_ACTOR_SCALE).toBeLessThan(0.9);
    expect(GRAND_DISTRICT_ACTOR_SCALE).toBeGreaterThan(0.8);
    for (const region of GRAND_DISTRICT_REGION_IDS) {
      expect(worldActorPresentationScale(region), region).toBe(GRAND_DISTRICT_ACTOR_SCALE);
    }
    expect(worldActorPresentationScale('village')).toBe(1);
    expect(worldActorPresentationScale('ulleungdo')).toBe(1);
  });
});
