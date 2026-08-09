import type { ItemId } from '../simulation/types';

export type PlayerCharmMount = 'neck' | 'wrist' | 'belt' | 'back';

export type PlayerCharmVisual = Readonly<{
  mount: PlayerCharmMount;
  scale: number;
  rotation: number;
}>;

export type PlayerCharmAttachment = Readonly<{
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipX: boolean;
  behindBody: boolean;
}>;

export const PLAYER_CHARM_VISUALS = {
  'boar-tusk-charm': { mount: 'belt', scale: 0.115, rotation: 0.22 },
  'falcon-eye-bracer': { mount: 'wrist', scale: 0.105, rotation: -0.48 },
  'silver-tiger-charm': { mount: 'belt', scale: 0.115, rotation: 0.18 },
  'haetae-ward-charm': { mount: 'belt', scale: 0.105, rotation: 0.06 },
  'crane-feather-talisman': { mount: 'back', scale: 0.115, rotation: -0.34 },
  'sea-salt-amulet': { mount: 'neck', scale: 0.09, rotation: 0 },
  'jaeryeong-fox-charm': { mount: 'back', scale: 0.12, rotation: 0.18 },
  'gapyeong-birch-talisman': { mount: 'belt', scale: 0.105, rotation: 0.14 },
  'yangju-beacon-seal': { mount: 'belt', scale: 0.11, rotation: 0.04 },
  'yeoju-river-jade': { mount: 'neck', scale: 0.09, rotation: 0 },
  'icheon-spirit-jar': { mount: 'back', scale: 0.13, rotation: -0.08 },
  'boryeong-tidal-anchor': { mount: 'belt', scale: 0.11, rotation: 0.2 },
  'namwon-bamboo-flute': { mount: 'back', scale: 0.125, rotation: -0.5 },
  'tongyeong-signal-drum': { mount: 'back', scale: 0.14, rotation: 0.04 },
} as const satisfies Partial<Record<ItemId, PlayerCharmVisual>>;

export const PLAYER_CHARM_ITEM_IDS = Object.freeze(Object.keys(PLAYER_CHARM_VISUALS) as ItemId[]);

const FRAME_SIZE = 256;
const PLAYER_ORIGIN_X = FRAME_SIZE * 0.5;
const PLAYER_ORIGIN_Y = FRAME_SIZE * 0.97;
const PLAYER_SCALE = 0.51;

const MOUNT_POINTS: Readonly<Record<PlayerCharmMount, readonly (readonly [number, number])[]>> = {
  neck: [[128, 105], [123, 106], [125, 106], [132, 107], [128, 108]],
  wrist: [[95, 151], [87, 153], [101, 153], [153, 154], [159, 155]],
  belt: [[130, 169], [126, 170], [127, 170], [132, 171], [128, 172]],
  back: [[145, 130], [153, 132], [147, 133], [113, 127], [115, 129]],
};

const FRAME_MOTION: readonly (readonly [number, number, number])[] = [
  [0, 0, -0.02], [1, 1, 0.02], [-1, 0, -0.03], [0, -1, 0.01],
  [0, 0, -0.04], [-1, -2, 0.04], [2, 1, 0.08], [0, 0, -0.02],
];

export function playerCharmAttachmentForFrame(
  row: number,
  column: number,
  flip: boolean,
  visual: PlayerCharmVisual,
): PlayerCharmAttachment {
  const safeRow = Math.max(0, Math.min(4, Math.floor(row)));
  const safeColumn = Math.max(0, Math.min(7, Math.floor(column)));
  const point = MOUNT_POINTS[visual.mount][safeRow];
  const motion = FRAME_MOTION[safeColumn];
  const sourceX = point[0] + motion[0];
  const sourceY = point[1] + motion[1];
  const localX = (sourceX - PLAYER_ORIGIN_X) * PLAYER_SCALE;
  const frontFacing = safeRow <= 2;
  // Back-mounted props reverse depth as the body turns. Wearable mounts stay
  // above the body so small charms never disappear completely behind a frame.
  const behindBody = visual.mount === 'back' && frontFacing;
  const rotation = visual.rotation + motion[2];
  return {
    x: flip ? -localX : localX,
    y: (sourceY - PLAYER_ORIGIN_Y) * PLAYER_SCALE,
    scale: visual.scale,
    rotation: flip ? -rotation : rotation,
    flipX: flip,
    behindBody,
  };
}
