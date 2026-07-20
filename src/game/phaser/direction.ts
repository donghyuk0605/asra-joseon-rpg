export type DirectionFrame = { row: number; flip: boolean };

// Screen coordinates use +X for east and +Y for south.
// Five authored rows cover S, SW, W, NW, N; eastern facings mirror the west rows.
export function directionToFrame(angle: number): DirectionFrame {
  const octant = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
  const directions: DirectionFrame[] = [
    { row: 2, flip: true },  // east
    { row: 1, flip: true },  // south-east
    { row: 0, flip: false }, // south
    { row: 1, flip: false }, // south-west
    { row: 2, flip: false }, // west
    { row: 3, flip: false }, // north-west
    { row: 4, flip: false }, // north
    { row: 3, flip: true },  // north-east
  ];
  return directions[octant];
}
