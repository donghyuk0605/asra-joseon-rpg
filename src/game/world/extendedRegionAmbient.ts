import type { ExtendedRegionId } from './regions';

export type ReedConfig = {
  x: number;
  y: number;
  scale?: number;
  direction?: 1 | -1;
};

export type BoatConfig = {
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
};

export type WindmillConfig = {
  x: number;
  y: number;
  scale?: number;
  blades?: number;
};

export type BannerConfig = {
  x: number;
  y: number;
  color: number;
  flipX?: boolean;
};

export type LanternConfig = {
  x: number;
  y: number;
  color?: number;
};

export type ExtendedRegionAmbientConfig = {
  reeds: readonly ReedConfig[];
  boats: readonly BoatConfig[];
  windmills: readonly WindmillConfig[];
  banners: readonly BannerConfig[];
  lanterns: readonly LanternConfig[];
};

export const EXTENDED_REGION_AMBIENT: Record<ExtendedRegionId, ExtendedRegionAmbientConfig> = {
  wonju: {
    reeds: [
      { x: 230, y: 235, scale: 0.82 }, { x: 1320, y: 244, scale: 0.88, direction: -1 },
      { x: 264, y: 770, scale: 0.72 }, { x: 1286, y: 790, scale: 0.78, direction: -1 },
      { x: 560, y: 360, scale: 0.52 }, { x: 990, y: 560, scale: 0.58, direction: -1 },
      { x: 430, y: 520, scale: 0.62, direction: -1 }, { x: 1124, y: 430, scale: 0.66 },
      { x: 690, y: 880, scale: 0.56 }, { x: 820, y: 254, scale: 0.5, direction: -1 },
    ],
    boats: [],
    windmills: [
      { x: 410, y: 346, scale: 0.72, blades: 4 },
      { x: 1080, y: 610, scale: 0.58, blades: 5 },
    ],
    banners: [
      { x: 1095, y: 322, color: 0x6e3b32, flipX: true },
      { x: 508, y: 728, color: 0x526a50 },
    ],
    lanterns: [
      { x: 610, y: 306, color: 0xf0a447 }, { x: 930, y: 306, color: 0xf0a447 },
      { x: 520, y: 700, color: 0xe58d42 }, { x: 1080, y: 704, color: 0xe58d42 },
    ],
  },
  gangneung: {
    reeds: [
      { x: 1020, y: 218, scale: 0.86 }, { x: 1160, y: 286, scale: 0.98, direction: -1 },
      { x: 1258, y: 500, scale: 0.88 }, { x: 1332, y: 778, scale: 0.98, direction: -1 },
      { x: 1110, y: 858, scale: 0.74 }, { x: 1260, y: 930, scale: 0.8 },
      { x: 1040, y: 410, scale: 0.62, direction: -1 }, { x: 1390, y: 372, scale: 0.58 },
      { x: 1180, y: 720, scale: 0.66, direction: -1 }, { x: 1018, y: 930, scale: 0.62 },
    ],
    boats: [
      { x: 1360, y: 690, scale: 0.84, flipX: true },
      { x: 1430, y: 470, scale: 0.58, flipX: true },
    ],
    windmills: [
      { x: 1118, y: 330, scale: 0.68, blades: 5 },
      { x: 1250, y: 860, scale: 0.56, blades: 4 },
    ],
    banners: [
      { x: 390, y: 330, color: 0x365b63 },
      { x: 1280, y: 604, color: 0x5c4b35, flipX: true },
      { x: 1060, y: 520, color: 0x536d73 },
      { x: 1340, y: 846, color: 0x6a503d, flipX: true },
    ],
    lanterns: [
      { x: 870, y: 352, color: 0xe4a04e }, { x: 1160, y: 654, color: 0xe4a04e },
      { x: 1040, y: 510, color: 0xf0b45d }, { x: 1280, y: 852, color: 0xf0b45d },
    ],
  },
  haeju: {
    reeds: [
      { x: 224, y: 214, scale: 0.94 }, { x: 326, y: 404, scale: 0.82, direction: -1 },
      { x: 242, y: 704, scale: 0.9 }, { x: 372, y: 888, scale: 0.78 },
      { x: 1078, y: 238, scale: 0.9, direction: -1 }, { x: 1240, y: 436, scale: 0.92 },
      { x: 1100, y: 744, scale: 1.02, direction: -1 }, { x: 1260, y: 920, scale: 0.82 },
      { x: 86, y: 310, scale: 0.65, direction: -1 }, { x: 410, y: 520, scale: 0.62 },
      { x: 90, y: 856, scale: 0.64 }, { x: 1328, y: 600, scale: 0.72, direction: -1 },
      { x: 520, y: 918, scale: 0.58 }, { x: 1080, y: 520, scale: 0.62, direction: -1 },
    ],
    boats: [
      { x: 190, y: 642, scale: 0.8 },
      { x: 118, y: 420, scale: 0.56 },
      { x: 258, y: 850, scale: 0.62, flipX: true },
    ],
    windmills: [
      { x: 420, y: 294, scale: 0.7, blades: 6 },
      { x: 1000, y: 842, scale: 0.58, blades: 5 },
    ],
    banners: [
      { x: 1240, y: 280, color: 0x384f63, flipX: true },
      { x: 1025, y: 694, color: 0x72533a, flipX: true },
      { x: 500, y: 500, color: 0x526d70 },
      { x: 1120, y: 520, color: 0x6c5140, flipX: true },
    ],
    lanterns: [
      { x: 690, y: 316, color: 0xe5a14d }, { x: 890, y: 706, color: 0xe5a14d },
      { x: 480, y: 494, color: 0xf0ae50 }, { x: 1120, y: 520, color: 0xf0ae50 },
    ],
  },
  geoje: {
    reeds: [
      { x: 180, y: 170, scale: 0.78 }, { x: 330, y: 274, scale: 0.66, direction: -1 },
      { x: 1210, y: 184, scale: 0.76, direction: -1 }, { x: 1360, y: 274, scale: 0.68 },
      { x: 170, y: 804, scale: 0.84 }, { x: 325, y: 884, scale: 0.7, direction: -1 },
      { x: 1212, y: 826, scale: 0.84 }, { x: 1360, y: 894, scale: 0.72, direction: -1 },
      { x: 58, y: 612, scale: 0.62, direction: -1 }, { x: 438, y: 142, scale: 0.6 },
      { x: 1480, y: 604, scale: 0.64 }, { x: 1060, y: 150, scale: 0.58, direction: -1 },
    ],
    boats: [
      { x: 176, y: 468, scale: 0.72 },
      { x: 1360, y: 466, scale: 0.74, flipX: true },
      { x: 222, y: 742, scale: 0.58 },
      { x: 1316, y: 742, scale: 0.6, flipX: true },
      { x: 94, y: 310, scale: 0.48 },
      { x: 1450, y: 308, scale: 0.5, flipX: true },
    ],
    windmills: [],
    banners: [
      { x: 418, y: 286, color: 0x3d506d },
      { x: 1110, y: 286, color: 0x3d506d, flipX: true },
      { x: 540, y: 742, color: 0x475a67 },
      { x: 990, y: 742, color: 0x475a67, flipX: true },
      { x: 340, y: 548, color: 0x536f70 },
      { x: 1180, y: 548, color: 0x536f70, flipX: true },
    ],
    lanterns: [
      { x: 610, y: 222, color: 0xe7a14a }, { x: 926, y: 222, color: 0xe7a14a },
      { x: 610, y: 820, color: 0xe7a14a }, { x: 926, y: 820, color: 0xe7a14a },
      { x: 420, y: 520, color: 0xf0a94a }, { x: 1110, y: 520, color: 0xf0a94a },
    ],
  },
};
