export const MAP_WIDTH = 1536;
export const MAP_HEIGHT = 1024;
export const VILLAGE_OVERLAP = 128;
export const VILLAGE_TOP = MAP_HEIGHT - VILLAGE_OVERLAP;
export const CENTRAL_WORLD_HEIGHT = VILLAGE_TOP + MAP_HEIGHT;

export const WORLD_MIN_X = -MAP_WIDTH;
export const WORLD_MIN_Y = 0;
export const WORLD_WIDTH = MAP_WIDTH * 4;
export const WORLD_HEIGHT = CENTRAL_WORLD_HEIGHT + MAP_HEIGHT;

export const REGION_ORIGINS = {
  solgogae: { x: 0, y: 0 },
  village: { x: 0, y: VILLAGE_TOP },
  mistwood: { x: -MAP_WIDTH, y: VILLAGE_TOP },
  minepass: { x: MAP_WIDTH, y: VILLAGE_TOP },
  moonfield: { x: 0, y: CENTRAL_WORLD_HEIGHT },
  dungeon: { x: MAP_WIDTH * 2, y: 0 },
} as const;
