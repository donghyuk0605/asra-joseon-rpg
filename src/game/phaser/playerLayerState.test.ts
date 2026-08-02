import { describe, expect, it } from 'vitest';
import {
  frameForPlayerLayer,
  playerFrameState,
  weaponAttachmentForFrame,
  weaponGripPointForFrame,
  weaponImpactColumnForRow,
} from './playerLayerState';

describe('player equipment layer frame synchronization', () => {
  it('uses the exact same atlas frame for body and armor', () => {
    expect(frameForPlayerLayer(3, 2)).toBe(26);
    expect(frameForPlayerLayer(0, 6)).toBe(6);
  });

  it('authors carry grips in atlas pixels on the visible fist', () => {
    expect(weaponGripPointForFrame(0, 0, 'carry')).toMatchObject({ x: 100, y: 177 });
    expect(weaponGripPointForFrame(1, 0, 'carry')).toMatchObject({ x: 139, y: 175 });
    expect(weaponGripPointForFrame(2, 0, 'carry')).toMatchObject({ x: 120, y: 178 });
    expect(weaponGripPointForFrame(3, 0, 'carry')).toMatchObject({ x: 100, y: 187 });
    expect(weaponGripPointForFrame(4, 0, 'carry')).toMatchObject({ x: 157, y: 182 });
  });

  it('authors attack grips on the hands instead of the face or empty space', () => {
    expect(weaponGripPointForFrame(0, 4, 'attack')).toMatchObject({ x: 94, y: 137 });
    expect(weaponGripPointForFrame(0, 6, 'attack')).toMatchObject({ x: 196, y: 153 });
    expect(weaponGripPointForFrame(2, 6, 'attack')).toMatchObject({ x: 197, y: 140 });
    expect(weaponGripPointForFrame(4, 7, 'attack')).toMatchObject({ x: 159, y: 132 });
  });

  it('converts atlas grip pixels through the body origin and shared runtime scale', () => {
    const attachment = weaponAttachmentForFrame(0, false, 0, 'carry');
    expect(attachment.x).toBeCloseTo((100 - 128) * 0.51, 5);
    expect(attachment.y).toBeCloseTo((177 - 256 * 0.97) * 0.51, 5);
  });

  it('keeps an equipped weapon at the measured hand while walking', () => {
    for (let row = 0; row < 5; row += 1) {
      const poses = [0, 1, 2, 3].map((column) => weaponAttachmentForFrame(row, false, column, 'carry'));
      expect(new Set(poses.map(({ x, y, rotation }) => `${x}:${y}:${rotation}`)).size).toBe(4);
      expect(poses.every(({ scale }) => scale === 0.245)).toBe(true);
      expect(poses.every(({ behindBody }) => behindBody)).toBe(true);
    }
  });

  it('tracks the west/east walking fist instead of leaving the sword in mid-air', () => {
    expect([0, 1, 2, 3].map((column) => weaponGripPointForFrame(2, column, 'carry')))
      .toMatchObject([
        { x: 120, y: 178 },
        { x: 102, y: 174 },
        { x: 99, y: 175 },
        { x: 103, y: 174 },
      ]);
  });

  it('swings the weapon through anticipation, impact and recovery', () => {
    const rotations = [4, 5, 6, 7].map((column) => weaponAttachmentForFrame(0, false, column, 'attack').rotation);
    expect(new Set(rotations).size).toBe(4);
    expect(rotations.some((rotation) => rotation < 0)).toBe(true);
    expect(rotations.some((rotation) => rotation > 2)).toBe(true);
    expect(weaponAttachmentForFrame(0, false, 4, 'attack').scale).toBe(0.245);
  });

  it('chooses a directional contact pose whose hands face the target', () => {
    expect([0, 1, 2, 3, 4].map(weaponImpactColumnForRow)).toEqual([6, 4, 4, 5, 5]);
  });

  it('uses the authored two-hand grip points for the weapon action body', () => {
    const walkPose = weaponAttachmentForFrame(0, false, 0, 'carry');
    const weaponPose = weaponAttachmentForFrame(0, false, 4, 'attack');
    expect(weaponPose).not.toMatchObject({ x: walkPose.x, y: walkPose.y, rotation: walkPose.rotation });
    expect(weaponPose.y).toBeLessThan(walkPose.y);
  });

  it('mirrors hand attachment for east-facing rows', () => {
    const west = weaponAttachmentForFrame(2, false, 0, 'carry');
    const east = weaponAttachmentForFrame(2, true, 0, 'carry');
    expect(east.x).toBe(-west.x);
    expect(east.flipX).toBe(true);
  });

  it('renders every weapon below the body so the fist covers the handle', () => {
    expect(weaponAttachmentForFrame(0, false, 0, 'carry').behindBody).toBe(true);
    expect(weaponAttachmentForFrame(3, false, 0, 'carry').behindBody).toBe(true);
    expect(weaponAttachmentForFrame(4, false, 0, 'carry').behindBody).toBe(true);
  });

  it('derives row and column from the body sprite frame instead of live facing', () => {
    expect(playerFrameState(26, true, 0)).toEqual({ row: 3, column: 2, flip: true });
    expect(playerFrameState(Number.NaN, false, 4)).toEqual({ row: 4, column: 0, flip: false });
  });
});
