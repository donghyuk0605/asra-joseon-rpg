import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS, ULLEUNG_PASSAGE_HEIGHT } from './layout';
import type { RegionId } from './regions';

export const ULLEUNG_REGION_IDS = [
  'ulleungcoast',
  'ulleungmeadow',
  'ulleunghunt',
  'ulleungridge',
  'ulleungdo',
  'ulleungvillage',
] as const satisfies readonly RegionId[];

export type UlleungRegionId = typeof ULLEUNG_REGION_IDS[number];
export type UlleungTravelDirection = 'north' | 'south';

const ULLEUNG_REGION_SET: ReadonlySet<RegionId> = new Set(ULLEUNG_REGION_IDS);

export const isUlleungRegion = (region: RegionId): region is UlleungRegionId => ULLEUNG_REGION_SET.has(region);

export type UlleungRoadAnchor = Readonly<{
  northX: number;
  southX: number;
}>;

// Local X positions measured from the authored background paintings. Keeping
// these anchors in one place prevents labels, click zones, collision and seam
// textures from silently drifting onto different routes.
export const ULLEUNG_ROAD_ANCHORS: Readonly<Record<UlleungRegionId, UlleungRoadAnchor>> = Object.freeze({
  ulleungcoast: { northX: 760, southX: 810 },
  ulleungmeadow: { northX: 768, southX: 768 },
  ulleunghunt: { northX: 720, southX: 790 },
  ulleungridge: { northX: 768, southX: 768 },
  ulleungdo: { northX: 670, southX: 768 },
  ulleungvillage: { northX: 768, southX: 768 },
});

// Keep the refugee camp beside the north-south road. The earlier x=820
// footprint covered the road centre and made short clicks stop while longer
// routed clicks happened to find a way around it.
export const ULLEUNG_REFUGEE_CAMP_LOCAL = Object.freeze({ x: 590, y: 705 });

type CorridorPoint = Readonly<{
  y: number;
  centerX: number;
  halfWidth: number;
}>;

// These profiles follow visible earth/stone ground, not the rectangular image
// bounds. They keep actors off painted sea, cliffs and large tree roots while
// preserving each region's broad combat clearing.
const ULLEUNG_WALKABLE_PROFILES: Readonly<Record<UlleungRegionId, readonly CorridorPoint[]>> = Object.freeze({
  ulleungcoast: [
    { y: 0, centerX: 760, halfWidth: 235 },
    { y: 210, centerX: 735, halfWidth: 310 },
    { y: 470, centerX: 720, halfWidth: 405 },
    { y: 700, centerX: 760, halfWidth: 410 },
    { y: 840, centerX: 790, halfWidth: 370 },
    { y: MAP_HEIGHT, centerX: 810, halfWidth: 255 },
  ],
  ulleungmeadow: [
    { y: 0, centerX: 768, halfWidth: 245 },
    { y: 210, centerX: 768, halfWidth: 340 },
    { y: 460, centerX: 768, halfWidth: 520 },
    { y: 690, centerX: 770, halfWidth: 475 },
    { y: 840, centerX: 770, halfWidth: 385 },
    { y: MAP_HEIGHT, centerX: 768, halfWidth: 260 },
  ],
  ulleunghunt: [
    { y: 0, centerX: 720, halfWidth: 225 },
    { y: 220, centerX: 735, halfWidth: 300 },
    { y: 480, centerX: 760, halfWidth: 475 },
    { y: 690, centerX: 775, halfWidth: 455 },
    { y: 850, centerX: 785, halfWidth: 355 },
    { y: MAP_HEIGHT, centerX: 790, halfWidth: 250 },
  ],
  ulleungridge: [
    { y: 0, centerX: 768, halfWidth: 240 },
    { y: 240, centerX: 750, halfWidth: 350 },
    { y: 480, centerX: 760, halfWidth: 500 },
    { y: 700, centerX: 770, halfWidth: 460 },
    { y: 850, centerX: 770, halfWidth: 345 },
    { y: MAP_HEIGHT, centerX: 768, halfWidth: 235 },
  ],
  ulleungdo: [
    { y: 0, centerX: 670, halfWidth: 175 },
    { y: 240, centerX: 705, halfWidth: 245 },
    { y: 430, centerX: 750, halfWidth: 455 },
    { y: 700, centerX: 768, halfWidth: 500 },
    { y: 850, centerX: 768, halfWidth: 405 },
    { y: MAP_HEIGHT, centerX: 768, halfWidth: 185 },
  ],
  ulleungvillage: [
    { y: 0, centerX: 768, halfWidth: 185 },
    { y: 230, centerX: 768, halfWidth: 600 },
    { y: 520, centerX: 768, halfWidth: 640 },
    { y: 760, centerX: 768, halfWidth: 658 },
    { y: MAP_HEIGHT, centerX: 768, halfWidth: 658 },
  ],
});

export type UlleungPassage = Readonly<{
  upper: UlleungRegionId;
  lower: UlleungRegionId;
  y: number;
  height: number;
  startX: number;
  endX: number;
  halfWidth: number;
}>;

export const ULLEUNG_PASSAGES: readonly UlleungPassage[] = ULLEUNG_REGION_IDS
  .slice(0, -1)
  .map((upper, index) => {
    const lower = ULLEUNG_REGION_IDS[index + 1];
    return Object.freeze({
      upper,
      lower,
      y: REGION_ORIGINS[upper].y + MAP_HEIGHT,
      height: REGION_ORIGINS[lower].y - (REGION_ORIGINS[upper].y + MAP_HEIGHT),
      startX: REGION_ORIGINS[upper].x + ULLEUNG_ROAD_ANCHORS[upper].southX,
      endX: REGION_ORIGINS[lower].x + ULLEUNG_ROAD_ANCHORS[lower].northX,
      halfWidth: 225,
    });
  });

export const ulleungPassageAtY = (y: number): UlleungPassage | null =>
  ULLEUNG_PASSAGES.find((passage) => y >= passage.y && y < passage.y + passage.height) ?? null;

const smoothstep = (value: number): number => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
};

const interpolate = (from: number, to: number, progress: number): number =>
  from + (to - from) * smoothstep(progress);

export const ulleungRoadCenterAtY = (y: number): number => {
  const passage = ulleungPassageAtY(y);
  if (passage) {
    return interpolate(passage.startX, passage.endX, (y - passage.y) / passage.height);
  }
  const region = ulleungRegionAtY(y);
  const origin = REGION_ORIGINS[region];
  const localY = Math.max(0, Math.min(MAP_HEIGHT, y - origin.y));
  const anchor = ULLEUNG_ROAD_ANCHORS[region];
  return origin.x + interpolate(anchor.northX, anchor.southX, localY / MAP_HEIGHT);
};

export type UlleungAdjacentEntryPoint = Readonly<{
  region: UlleungRegionId;
  x: number;
  y: number;
}>;

// Exit zones must target a point inside the neighbouring painted map, not a
// point halfway through the 512px blend strip. This guarantees that a single
// click crosses the region handoff (including its hysteresis) and leaves the
// player on visible road.
export const ulleungAdjacentEntryPoint = (
  region: UlleungRegionId,
  direction: UlleungTravelDirection,
  inset = 140,
): UlleungAdjacentEntryPoint | null => {
  const regionIndex = ULLEUNG_REGION_IDS.indexOf(region);
  const neighborIndex = regionIndex + (direction === 'south' ? 1 : -1);
  if (neighborIndex < 0 || neighborIndex >= ULLEUNG_REGION_IDS.length) return null;
  const neighbor = ULLEUNG_REGION_IDS[neighborIndex];
  const safeInset = Math.max(80, Math.min(MAP_HEIGHT / 2 - 40, inset));
  const y = direction === 'south'
    ? REGION_ORIGINS[neighbor].y + safeInset
    : REGION_ORIGINS[neighbor].y + MAP_HEIGHT - safeInset;
  return Object.freeze({
    region: neighbor,
    x: ulleungRoadCenterAtY(y),
    y,
  });
};

export const ulleungWalkableBoundsAt = (
  region: UlleungRegionId,
  worldY: number,
): Readonly<{ left: number; right: number; center: number }> => {
  const passage = ulleungPassageAtY(worldY);
  if (passage) {
    const center = ulleungRoadCenterAtY(worldY);
    return { left: center - passage.halfWidth, right: center + passage.halfWidth, center };
  }

  const origin = REGION_ORIGINS[region];
  const localY = Math.max(0, Math.min(MAP_HEIGHT, worldY - origin.y));
  const profile = ULLEUNG_WALKABLE_PROFILES[region];
  let upper = profile[0];
  let lower = profile[profile.length - 1];
  for (let index = 0; index < profile.length - 1; index += 1) {
    if (localY > profile[index + 1].y) continue;
    upper = profile[index];
    lower = profile[index + 1];
    break;
  }
  const span = Math.max(1, lower.y - upper.y);
  const progress = (localY - upper.y) / span;
  const center = origin.x + interpolate(upper.centerX, lower.centerX, progress);
  const halfWidth = interpolate(upper.halfWidth, lower.halfWidth, progress);
  return { left: center - halfWidth, right: center + halfWidth, center };
};

export const ulleungRegionAtY = (y: number): UlleungRegionId => {
  for (let index = 0; index < ULLEUNG_REGION_IDS.length - 1; index += 1) {
    const upper = ULLEUNG_REGION_IDS[index];
    const lower = ULLEUNG_REGION_IDS[index + 1];
    const passage = ULLEUNG_PASSAGES[index];
    const boundary = passage.y + passage.height / 2;
    if (y < boundary) return upper;
    if (y < REGION_ORIGINS[lower].y) return lower;
  }
  return ULLEUNG_REGION_IDS[ULLEUNG_REGION_IDS.length - 1];
};

export const ULLEUNG_WORLD_BOUNDS = Object.freeze({
  x: REGION_ORIGINS.ulleungcoast.x,
  y: REGION_ORIGINS.ulleungcoast.y,
  width: MAP_WIDTH,
  height: MAP_HEIGHT * ULLEUNG_REGION_IDS.length + ULLEUNG_PASSAGE_HEIGHT * ULLEUNG_PASSAGES.length,
});
