export type WeaponAttachment = {
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  scale: number;
};

const WALK_ATTACHMENTS: readonly Omit<WeaponAttachment, 'flipX' | 'scale'>[] = [
  { x: -19, y: -43, rotation: 0.72 },
  { x: -20, y: -43, rotation: 0.54 },
  { x: -18, y: -42, rotation: 0.32 },
  { x: -16, y: -43, rotation: -0.08 },
  { x: -15, y: -44, rotation: -0.42 },
];

const ATTACK_ROTATIONS = [-1.2, 0.12, 1.24, 0.5] as const;

export function frameForPlayerLayer(row: number, column: number): number {
  return row * 8 + column;
}

export function weaponAttachmentForFrame(row: number, flip: boolean, column: number): WeaponAttachment {
  const base = WALK_ATTACHMENTS[Math.max(0, Math.min(WALK_ATTACHMENTS.length - 1, row))];
  const rotation = column >= 4 ? ATTACK_ROTATIONS[column - 4] : base.rotation;
  const x = base.x;
  return {
    x: flip ? -x : x,
    y: base.y + (column === 1 || column === 3 ? 1 : 0),
    rotation: flip ? -rotation : rotation,
    flipX: flip,
    scale: 0.28,
  };
}
