import type { RegionId } from './regions';
import { GRAND_DISTRICT_REGION_IDS } from './betaRoadsideProps';

const GRAND_DISTRICT_REGIONS = new Set<RegionId>(GRAND_DISTRICT_REGION_IDS);

/**
 * Authored city and campaign backgrounds depict buildings, walls and fields at
 * a wider strategic scale than the early village maps. Reducing only actor
 * presentation (never simulation bodies or hit ranges) restores that ratio
 * while preserving combat, collision and the common foot anchor.
 */
export const GRAND_DISTRICT_ACTOR_SCALE = 0.86;

export const worldActorPresentationScale = (region: RegionId): number => (
  GRAND_DISTRICT_REGIONS.has(region) ? GRAND_DISTRICT_ACTOR_SCALE : 1
);
