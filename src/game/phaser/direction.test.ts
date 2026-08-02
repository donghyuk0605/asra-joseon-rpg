import { describe, expect, it } from 'vitest';
import { directionToFrame } from './direction';

describe('directionToFrame', () => {
  it('falls back to the south row when an invalid angle reaches the renderer', () => {
    expect(directionToFrame(Number.NaN)).toEqual({ row: 0, flip: false });
  });

  it('normalizes rotations accumulated across several full turns', () => {
    expect(directionToFrame(Math.PI / 2 - Math.PI * 6)).toEqual({ row: 0, flip: false });
    expect(directionToFrame(Math.PI * 6)).toEqual({ row: 2, flip: true });
  });
  it.each([
    [0, 2, true],
    [Math.PI / 4, 1, true],
    [Math.PI / 2, 0, false],
    [3 * Math.PI / 4, 1, false],
    [Math.PI, 2, false],
    [-3 * Math.PI / 4, 3, false],
    [-Math.PI / 2, 4, false],
    [-Math.PI / 4, 3, true],
  ])('maps angle %s to authored row %s', (angle, row, flip) => {
    expect(directionToFrame(angle)).toEqual({ row, flip });
  });
});
