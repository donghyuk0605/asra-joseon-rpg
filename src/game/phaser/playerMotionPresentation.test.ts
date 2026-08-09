import { describe, expect, it } from 'vitest';
import {
  PLAYER_WALK_FRAME_RATE,
  playerActionTimeline,
  playerFrameQaFromSearch,
  playerGaitPose,
  type PlayerActionCadence,
} from './playerMotionPresentation';

describe('playerActionTimeline', () => {
  it.each<PlayerActionCadence>(['fist', 'blade', 'bow', 'ritual'])(
    'exposes every authored action phase for %s attacks',
    (cadence) => {
      const timeline = playerActionTimeline(cadence);
      expect(timeline.map((frame) => frame.column)).toEqual([4, 5, 6, 7]);
      expect(timeline.map((frame) => frame.phase)).toEqual(['prepare', 'accelerate', 'impact', 'recover']);
      expect(timeline.every((frame, index) => index === 0 || frame.atMs > timeline[index - 1].atMs)).toBe(true);
    },
  );

  it('gives slower authored actions enough time to read without slowing punches', () => {
    const fist = playerActionTimeline('fist');
    const bow = playerActionTimeline('bow');
    const ritual = playerActionTimeline('ritual');
    expect(fist[fist.length - 1].atMs).toBeLessThan(300);
    expect(bow[bow.length - 1].atMs).toBeGreaterThan(350);
    expect(ritual[ritual.length - 1].atMs).toBeGreaterThan(350);
  });
});

describe('playerGaitPose', () => {
  it('alternates two planted contacts with two readable passing poses', () => {
    expect([0, 1, 2, 3].map((column) => playerGaitPose(column, false).contact))
      .toEqual([true, false, true, false]);
    expect(PLAYER_WALK_FRAME_RATE).toBeLessThan(10);
  });

  it('mirrors lean but preserves foot lift when the sprite flips', () => {
    const right = playerGaitPose(0, false);
    const left = playerGaitPose(0, true);
    expect(left.x).toBe(-right.x);
    expect(left.rotation).toBe(-right.rotation);
    expect(left.y).toBe(right.y);
  });

  it('removes supplemental body motion for reduced-motion players', () => {
    expect(playerGaitPose(1, false, true)).toMatchObject({ x: 0, y: 0, rotation: 0, contact: false });
  });
});

describe('playerFrameQaFromSearch', () => {
  it('does not turn an absent query value into frame zero', () => {
    expect(playerFrameQaFromSearch('?region=blackpinehunt', true)).toBeNull();
    expect(playerFrameQaFromSearch('', true)).toBeNull();
  });

  it('keeps explicit frame-zero QA and clamps the authored atlas range', () => {
    expect(playerFrameQaFromSearch('?playerframeqa=0', true)).toBe(0);
    expect(playerFrameQaFromSearch('?playerframeqa=14', true)).toBe(14);
    expect(playerFrameQaFromSearch('?playerframeqa=99', true)).toBe(39);
  });

  it('never enables the override in production mode', () => {
    expect(playerFrameQaFromSearch('?playerframeqa=14', false)).toBeNull();
  });
});
