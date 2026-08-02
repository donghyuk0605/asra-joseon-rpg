export type WeaponAttachment = {
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  scale: number;
  behindBody: boolean;
};

export type WeaponGripPoint = {
  x: number;
  y: number;
  rotation: number;
  behindBody: boolean;
};

export type WeaponAttachmentPose = 'carry' | 'attack';

const PLAYER_FRAME_SIZE = 256;
const PLAYER_FRAME_ORIGIN_X = PLAYER_FRAME_SIZE * 0.5;
const PLAYER_FRAME_ORIGIN_Y = PLAYER_FRAME_SIZE * 0.97;
const PLAYER_RUNTIME_SCALE = 0.51;
const WEAPON_RUNTIME_SCALE = 0.245;
const WEAPON_IMPACT_COLUMNS = [6, 4, 4, 5, 5] as const;

// Grip positions are authored in the 256x256 source-frame coordinate system.
// This keeps the marker directly inspectable against the atlas instead of
// guessing root-local offsets after the body scale and origin are applied.
const WEAPON_CARRY_GRIPS: readonly (readonly WeaponGripPoint[])[] = [
  [
    { x: 100, y: 177, rotation: 0.08, behindBody: true },
    { x: 105, y: 178, rotation: 0.02, behindBody: true },
    { x: 101, y: 178, rotation: 0.12, behindBody: true },
    { x: 102, y: 178, rotation: -0.04, behindBody: true },
  ],
  [
    { x: 139, y: 175, rotation: -0.28, behindBody: true },
    { x: 139, y: 176, rotation: -0.22, behindBody: true },
    { x: 140, y: 176, rotation: -0.34, behindBody: true },
    { x: 139, y: 176, rotation: -0.18, behindBody: true },
  ],
  [
    { x: 120, y: 178, rotation: -0.42, behindBody: true },
    { x: 102, y: 174, rotation: -0.36, behindBody: true },
    { x: 99, y: 175, rotation: -0.50, behindBody: true },
    { x: 103, y: 174, rotation: -0.32, behindBody: true },
  ],
  [
    { x: 100, y: 187, rotation: -0.38, behindBody: true },
    { x: 101, y: 188, rotation: -0.44, behindBody: true },
    { x: 99, y: 188, rotation: -0.32, behindBody: true },
    { x: 100, y: 188, rotation: -0.48, behindBody: true },
  ],
  [
    { x: 157, y: 182, rotation: -0.10, behindBody: true },
    { x: 157, y: 184, rotation: -0.16, behindBody: true },
    { x: 157, y: 186, rotation: -0.04, behindBody: true },
    { x: 158, y: 184, rotation: -0.20, behindBody: true },
  ],
];

// The attack columns use two hands on one invisible grip.
const WEAPON_ATTACK_GRIPS: readonly (readonly WeaponGripPoint[])[] = [
  [
    { x: 94, y: 137, rotation: 2.34, behindBody: true },
    { x: 103, y: 104, rotation: 2.78, behindBody: true },
    { x: 196, y: 153, rotation: -0.86, behindBody: true },
    { x: 104, y: 146, rotation: 2.42, behindBody: true },
  ],
  [
    { x: 83, y: 133, rotation: 2.08, behindBody: true },
    { x: 91, y: 108, rotation: 2.58, behindBody: true },
    { x: 199, y: 138, rotation: -0.68, behindBody: true },
    { x: 95, y: 145, rotation: 2.18, behindBody: true },
  ],
  [
    { x: 79, y: 132, rotation: 1.78, behindBody: true },
    { x: 75, y: 113, rotation: 2.30, behindBody: true },
    { x: 197, y: 140, rotation: -0.42, behindBody: true },
    { x: 94, y: 140, rotation: 1.88, behindBody: true },
  ],
  [
    { x: 151, y: 127, rotation: 1.14, behindBody: true },
    { x: 99, y: 107, rotation: 1.72, behindBody: true },
    { x: 194, y: 132, rotation: -0.18, behindBody: true },
    { x: 92, y: 136, rotation: 1.34, behindBody: true },
  ],
  [
    { x: 154, y: 127, rotation: 0.78, behindBody: true },
    { x: 156, y: 119, rotation: 1.34, behindBody: true },
    { x: 196, y: 136, rotation: 0.08, behindBody: true },
    { x: 159, y: 132, rotation: 0.96, behindBody: true },
  ],
];

export function frameForPlayerLayer(row: number, column: number): number {
  return row * 8 + column;
}

export function weaponImpactColumnForRow(row: number): number {
  const safeRow = Math.max(0, Math.min(WEAPON_IMPACT_COLUMNS.length - 1, row));
  return WEAPON_IMPACT_COLUMNS[safeRow];
}

export function playerFrameState(
  frame: number,
  flip: boolean,
  fallbackRow: number,
): { row: number; column: number; flip: boolean } {
  const safeFallbackRow = Math.max(0, Math.min(4, fallbackRow));
  const safeFrame = Number.isFinite(frame)
    ? Math.max(0, Math.min(39, Math.floor(frame)))
    : safeFallbackRow * 8;
  return { row: Math.floor(safeFrame / 8), column: safeFrame % 8, flip };
}

export function weaponGripPointForFrame(
  row: number,
  column: number,
  pose: WeaponAttachmentPose,
): WeaponGripPoint {
  const source = pose === 'attack' ? WEAPON_ATTACK_GRIPS : WEAPON_CARRY_GRIPS;
  const safeRow = Math.max(0, Math.min(source.length - 1, row));
  const offset = pose === 'attack' ? 4 : 0;
  const safeColumn = Math.max(0, Math.min(3, column - offset));
  return source[safeRow][safeColumn];
}

export function weaponAttachmentForFrame(
  row: number,
  flip: boolean,
  column: number,
  pose: WeaponAttachmentPose,
): WeaponAttachment {
  const authored = weaponGripPointForFrame(row, column, pose);
  const x = (authored.x - PLAYER_FRAME_ORIGIN_X) * PLAYER_RUNTIME_SCALE;
  const y = (authored.y - PLAYER_FRAME_ORIGIN_Y) * PLAYER_RUNTIME_SCALE;
  return {
    x: flip ? -x : x,
    y,
    rotation: flip ? -authored.rotation : authored.rotation,
    flipX: flip,
    scale: WEAPON_RUNTIME_SCALE,
    behindBody: authored.behindBody,
  };
}
