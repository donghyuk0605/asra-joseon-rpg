import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../items/catalog';
import {
  PLAYER_CHARM_ITEM_IDS,
  PLAYER_CHARM_VISUALS,
  playerCharmAttachmentForFrame,
} from './playerCharmLayer';

describe('player charm world layer', () => {
  it('defines one presentation for every equippable charm', () => {
    const charmIds = Object.values(ITEM_CATALOG)
      .filter((item) => item.slot === 'charm')
      .map((item) => item.id)
      .sort();
    expect([...PLAYER_CHARM_ITEM_IDS].sort()).toEqual(charmIds);
  });

  it('keeps every charm close to the body through all forty player frames', () => {
    for (const visual of Object.values(PLAYER_CHARM_VISUALS)) {
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 8; column += 1) {
          const attachment = playerCharmAttachmentForFrame(row, column, false, visual);
          expect(Math.abs(attachment.x)).toBeLessThan(30);
          expect(attachment.y).toBeGreaterThan(-78);
          expect(attachment.y).toBeLessThan(-35);
          expect(attachment.scale).toBeGreaterThanOrEqual(0.09);
          expect(attachment.scale).toBeLessThanOrEqual(0.14);
        }
      }
    }
  });

  it('mirrors position and rotation while preserving mount depth', () => {
    for (const visual of Object.values(PLAYER_CHARM_VISUALS)) {
      const west = playerCharmAttachmentForFrame(2, 3, false, visual);
      const east = playerCharmAttachmentForFrame(2, 3, true, visual);
      expect(east.x).toBe(-west.x);
      expect(east.rotation).toBe(-west.rotation);
      expect(east.behindBody).toBe(west.behindBody);
    }
  });

  it('puts back-mounted objects behind a front-facing body and reverses depth from the rear', () => {
    const drum = PLAYER_CHARM_VISUALS['tongyeong-signal-drum'];
    expect(playerCharmAttachmentForFrame(0, 0, false, drum).behindBody).toBe(true);
    expect(playerCharmAttachmentForFrame(4, 0, false, drum).behindBody).toBe(false);
  });

  it('keeps neck, wrist, and belt charms visible above every facing direction', () => {
    for (const visual of Object.values(PLAYER_CHARM_VISUALS)) {
      if (visual.mount === 'back') continue;
      for (let row = 0; row < 5; row += 1) {
        expect(playerCharmAttachmentForFrame(row, 0, false, visual).behindBody).toBe(false);
      }
    }
  });
});
