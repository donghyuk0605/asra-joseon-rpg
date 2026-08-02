export const MAP_WIDTH = 1536;
export const MAP_HEIGHT = 1024;
export const VILLAGE_OVERLAP = 128;
export const VILLAGE_TOP = MAP_HEIGHT - VILLAGE_OVERLAP;
export const CENTRAL_WORLD_HEIGHT = VILLAGE_TOP + MAP_HEIGHT;
export const ULLEUNG_PASSAGE_HEIGHT = 512;
export const ULLEUNG_REGION_STRIDE = MAP_HEIGHT + ULLEUNG_PASSAGE_HEIGHT;

export const JOSEON_TOWN_X = -MAP_WIDTH * 7;
export const WORLD_MIN_X = JOSEON_TOWN_X;
export const WORLD_MIN_Y = -ULLEUNG_REGION_STRIDE * 5;
// Seven western columns through six eastern columns. Japan still ends at
// +6 cells, while the new Joseon settlement road occupies the dedicated -7
// column without overlapping the Jurchen/Pyongyang campaign at -6.
export const WORLD_WIDTH = MAP_WIDTH * 13;
export const CAMPAIGN_SOUTH = VILLAGE_TOP + MAP_HEIGHT * 6;
export const WORLD_HEIGHT = CAMPAIGN_SOUTH - WORLD_MIN_Y;
export const JAPAN_CAMPAIGN_X = MAP_WIDTH * 5;

export const REGION_ORIGINS = {
  solgogae: { x: 0, y: 0 },
  village: { x: 0, y: VILLAGE_TOP },
  mistwood: { x: -MAP_WIDTH, y: VILLAGE_TOP },
  yeongwol: { x: -MAP_WIDTH * 2, y: VILLAGE_TOP },
  yeongwolhq: { x: -MAP_WIDTH * 2, y: VILLAGE_TOP - MAP_HEIGHT },
  jeonjufield: { x: -MAP_WIDTH * 3, y: VILLAGE_TOP },
  jeonjugate: { x: -MAP_WIDTH * 3, y: VILLAGE_TOP - MAP_HEIGHT },
  jeonju: { x: -MAP_WIDTH * 3, y: VILLAGE_TOP - MAP_HEIGHT * 2 },
  // The Japanese campaign occupies its own northern road. Keeping it on a
  // separate X axis avoids the dungeon/central-world cells while preserving
  // the authored Osaka harbour's south-to-north composition.
  osaka: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT },
  settsuvillage: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 2 },
  yamazakihunt: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 3 },
  osakacastle: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 4 },
  shogunkeep: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 5 },
  sakaicity: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 6 },
  izumihunt: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 7 },
  awajicoast: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 8 },
  ikiport: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 9 },
  tsushimahunt: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 10 },
  izuhara: { x: JAPAN_CAMPAIGN_X, y: CAMPAIGN_SOUTH - MAP_HEIGHT * 11 },
  busanjin: { x: -MAP_WIDTH * 4, y: VILLAGE_TOP },
  tangeumdae: { x: -MAP_WIDTH * 4, y: VILLAGE_TOP - MAP_HEIGHT },
  gyeongbokgate: { x: -MAP_WIDTH * 5, y: VILLAGE_TOP },
  gyeongbokcourt: { x: -MAP_WIDTH * 5, y: VILLAGE_TOP - MAP_HEIGHT },
  gyeongbokinner: { x: -MAP_WIDTH * 5, y: VILLAGE_TOP - MAP_HEIGHT * 2 },
  // The Joseon settlement road is one continuous north-to-south column:
  // Gaeseong → Changdeokgung → Jongno → Sungnyemun → Suwon → Chungju → Andong.
  // Adjacent cells share exact 1536x1024 seams so gate travel can preserve the
  // player's lane instead of teleporting between disconnected illustrations.
  gaeseong: { x: JOSEON_TOWN_X, y: VILLAGE_TOP - MAP_HEIGHT * 3 },
  changdeokgung: { x: JOSEON_TOWN_X, y: VILLAGE_TOP - MAP_HEIGHT * 2 },
  hanseongmarket: { x: JOSEON_TOWN_X, y: VILLAGE_TOP - MAP_HEIGHT },
  hanseongsouth: { x: JOSEON_TOWN_X, y: VILLAGE_TOP },
  suwon: { x: JOSEON_TOWN_X, y: VILLAGE_TOP + MAP_HEIGHT },
  chungju: { x: JOSEON_TOWN_X, y: VILLAGE_TOP + MAP_HEIGHT * 2 },
  andong: { x: JOSEON_TOWN_X, y: VILLAGE_TOP + MAP_HEIGHT * 3 },
  jurchenvillage: { x: -MAP_WIDTH * 6, y: VILLAGE_TOP - MAP_HEIGHT },
  // The Jurchen unification road runs north from the defeated home camp.
  // Every cell shares a straight north-south seam so the player can travel
  // through hunting grounds and three distinct tribal villages.
  changbaihunt: { x: -MAP_WIDTH * 6, y: -1152 },
  baeksanvillage: { x: -MAP_WIDTH * 6, y: -2176 },
  songhuahunt: { x: -MAP_WIDTH * 6, y: -3200 },
  songhuavillage: { x: -MAP_WIDTH * 6, y: -4224 },
  blackpinehunt: { x: -MAP_WIDTH * 6, y: -5248 },
  heuksuvillage: { x: -MAP_WIDTH * 6, y: -6272 },
  manchufrontier: { x: -MAP_WIDTH * 6, y: VILLAGE_TOP },
  pyongyangouter: { x: -MAP_WIDTH * 6, y: VILLAGE_TOP + MAP_HEIGHT },
  pyongyanggate: { x: -MAP_WIDTH * 6, y: VILLAGE_TOP + MAP_HEIGHT * 2 },
  pyongyanginner: { x: -MAP_WIDTH * 6, y: VILLAGE_TOP + MAP_HEIGHT * 3 },
  // The king's two refuge routes share the western campaign column but occupy
  // separate cells. Each map is a self-contained three-tier final defense.
  namhansanseong: { x: -MAP_WIDTH * 4, y: VILLAGE_TOP + MAP_HEIGHT * 2 },
  ganghwado: { x: -MAP_WIDTH * 4, y: VILLAGE_TOP + MAP_HEIGHT * 3 },
  minepass: { x: MAP_WIDTH, y: VILLAGE_TOP },
  moonfield: { x: 0, y: CENTRAL_WORLD_HEIGHT },
  dungeon: { x: MAP_WIDTH * 2, y: 0 },
  ulleungcoast: { x: MAP_WIDTH * 3, y: -ULLEUNG_REGION_STRIDE * 5 },
  ulleungmeadow: { x: MAP_WIDTH * 3, y: -ULLEUNG_REGION_STRIDE * 4 },
  ulleunghunt: { x: MAP_WIDTH * 3, y: -ULLEUNG_REGION_STRIDE * 3 },
  ulleungridge: { x: MAP_WIDTH * 3, y: -ULLEUNG_REGION_STRIDE * 2 },
  ulleungdo: { x: MAP_WIDTH * 3, y: -ULLEUNG_REGION_STRIDE },
  ulleungvillage: { x: MAP_WIDTH * 3, y: 0 },
} as const;
