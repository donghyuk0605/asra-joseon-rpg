import type { WeaponAttachment } from './playerLayerState';

type BowGripPoint = Readonly<{ x: number; y: number; rotation: number }>;

const FRAME_SIZE = 256;
const ORIGIN_X = FRAME_SIZE * 0.5;
const ORIGIN_Y = FRAME_SIZE * 0.97;
const PLAYER_SCALE = 0.51;
const BOW_SCALE = 0.245;

// Authored against hajin-frontier-archer-actions-v2. Columns 0-3 carry the
// bow at the hip; 4 readies, 5 draws, 6 releases, and 7 recovers.
const BOW_GRIPS: readonly (readonly BowGripPoint[])[] = [
  [
    { x: 151, y: 174, rotation: 0.12 }, { x: 151, y: 175, rotation: 0.10 },
    { x: 152, y: 174, rotation: 0.16 }, { x: 153, y: 175, rotation: 0.08 },
    { x: 129, y: 169, rotation: 1.52 }, { x: 155, y: 145, rotation: 0.06 },
    { x: 169, y: 145, rotation: 0.03 }, { x: 135, y: 169, rotation: 1.54 },
  ],
  [
    { x: 159, y: 174, rotation: 1.26 }, { x: 159, y: 175, rotation: 1.24 },
    { x: 160, y: 174, rotation: 1.30 }, { x: 160, y: 175, rotation: 1.22 },
    { x: 130, y: 172, rotation: 1.56 }, { x: 151, y: 143, rotation: 0.03 },
    { x: 177, y: 145, rotation: 0.00 }, { x: 132, y: 172, rotation: 1.55 },
  ],
  [
    { x: 143, y: 174, rotation: 1.58 }, { x: 143, y: 175, rotation: 1.56 },
    { x: 144, y: 174, rotation: 1.62 }, { x: 144, y: 175, rotation: 1.54 },
    { x: 128, y: 174, rotation: 1.57 }, { x: 155, y: 138, rotation: 0.02 },
    { x: 89, y: 145, rotation: -0.01 }, { x: 130, y: 174, rotation: 1.56 },
  ],
  [
    { x: 100, y: 178, rotation: 0.18 }, { x: 100, y: 179, rotation: 0.16 },
    { x: 101, y: 178, rotation: 0.22 }, { x: 101, y: 179, rotation: 0.14 },
    { x: 135, y: 175, rotation: 1.58 }, { x: 156, y: 139, rotation: 0.02 },
    { x: 176, y: 145, rotation: -0.02 }, { x: 137, y: 175, rotation: 1.57 },
  ],
  [
    { x: 100, y: 174, rotation: 0.12 }, { x: 100, y: 176, rotation: 0.10 },
    { x: 101, y: 177, rotation: 0.16 }, { x: 101, y: 176, rotation: 0.08 },
    { x: 135, y: 178, rotation: 1.58 }, { x: 168, y: 156, rotation: 0.02 },
    { x: 176, y: 145, rotation: -0.02 }, { x: 136, y: 178, rotation: 1.57 },
  ],
];

export function bowAttachmentForFrame(row: number, column: number, flip: boolean): WeaponAttachment {
  const safeRow = Math.max(0, Math.min(4, Math.floor(row)));
  const safeColumn = Math.max(0, Math.min(7, Math.floor(column)));
  const point = BOW_GRIPS[safeRow][safeColumn];
  const localX = (point.x - ORIGIN_X) * PLAYER_SCALE;
  return {
    x: flip ? -localX : localX,
    y: (point.y - ORIGIN_Y) * PLAYER_SCALE,
    rotation: flip ? -point.rotation : point.rotation,
    flipX: flip,
    scale: BOW_SCALE,
    behindBody: false,
  };
}
