import { describe, expect, it } from 'vitest';
import { frameForPlayerLayer, weaponAttachmentForFrame } from './playerLayerState';

describe('player equipment layer frame synchronization', () => {
  it('uses the exact same atlas frame for body and armor', () => {
    expect(frameForPlayerLayer(3, 2)).toBe(26);
    expect(frameForPlayerLayer(0, 6)).toBe(6);
  });

  it('keeps an equipped weapon at the hand while walking', () => {
    expect(weaponAttachmentForFrame(0, false, 0)).toMatchObject({ x: -19, y: -43, rotation: 0.72 });
    expect(weaponAttachmentForFrame(2, false, 2)).toMatchObject({ x: -18, y: -42 });
  });

  it('swings the weapon through anticipation, impact and recovery', () => {
    const rotations = [4, 5, 6, 7].map((column) => weaponAttachmentForFrame(0, false, column).rotation);
    expect(rotations[0]).toBeLessThan(rotations[1]);
    expect(rotations[2]).toBeGreaterThan(rotations[1]);
    expect(rotations[3]).toBeLessThan(rotations[2]);
  });

  it('mirrors hand attachment for east-facing rows', () => {
    const west = weaponAttachmentForFrame(2, false, 0);
    const east = weaponAttachmentForFrame(2, true, 0);
    expect(east.x).toBe(-west.x);
    expect(east.flipX).toBe(true);
  });
});
