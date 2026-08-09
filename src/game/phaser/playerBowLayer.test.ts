import { describe, expect, it } from 'vitest';
import { bowAttachmentForFrame } from './playerBowLayer';

describe('player bow attachment layer', () => {
  it('keeps every carry, draw, release, and recovery grip close to the player', () => {
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        const attachment = bowAttachmentForFrame(row, column, false);
        expect(Math.abs(attachment.x)).toBeLessThan(28);
        expect(attachment.y).toBeGreaterThan(-64);
        expect(attachment.y).toBeLessThan(-32);
        expect(attachment.scale).toBe(0.245);
        expect(attachment.behindBody).toBe(false);
      }
    }
  });

  it('turns a vertical authored bow across carry, draw, and recovery poses', () => {
    expect(Math.abs(bowAttachmentForFrame(0, 0, false).rotation)).toBeLessThan(0.25);
    expect(bowAttachmentForFrame(2, 0, false).rotation).toBeGreaterThan(1.4);
    expect(Math.abs(bowAttachmentForFrame(0, 5, false).rotation)).toBeLessThan(0.1);
    expect(Math.abs(bowAttachmentForFrame(0, 6, false).rotation)).toBeLessThan(0.1);
    expect(bowAttachmentForFrame(0, 7, false).rotation).toBeGreaterThan(1.4);
  });

  it('mirrors grip position and rotation for east-facing frames', () => {
    const west = bowAttachmentForFrame(2, 5, false);
    const east = bowAttachmentForFrame(2, 5, true);
    expect(east.x).toBe(-west.x);
    expect(east.rotation).toBe(-west.rotation);
    expect(east.flipX).toBe(true);
  });
});
