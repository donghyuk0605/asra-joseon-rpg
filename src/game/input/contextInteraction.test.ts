import { describe, expect, it } from 'vitest';
import {
  approachPoint,
  interactionDistance,
  resolveNearestInteraction,
} from './contextInteraction';

describe('context interaction targeting', () => {
  it('selects the nearest discovered target and reports readiness', () => {
    const result = resolveNearestInteraction({ x: 0, y: 0 }, [
      { kind: 'npc', id: 'far', point: { x: 220, y: 0 }, readyDistance: 100, discoveryDistance: 280 },
      { kind: 'loot', id: 'near', point: { x: 60, y: 0 }, readyDistance: 68, discoveryDistance: 240 },
    ]);
    expect(result).toMatchObject({ id: 'near', distance: 60, ready: true });
  });

  it('keeps a preferred approached NPC selected beyond passive discovery range', () => {
    const result = resolveNearestInteraction({ x: 0, y: 0 }, [
      { kind: 'npc', id: 'quest-giver', point: { x: 560, y: 0 }, readyDistance: 112, discoveryDistance: 280 },
      { kind: 'loot', id: 'near', point: { x: 80, y: 0 }, readyDistance: 68, discoveryDistance: 240 },
    ], 'quest-giver');
    expect(result).toMatchObject({ id: 'quest-giver', distance: 560, ready: false });
  });

  it('calculates a stopping point without placing the player inside the target', () => {
    const point = approachPoint({ x: 0, y: 0 }, { x: 200, y: 0 }, 84);
    expect(point).toEqual({ x: 116, y: 0 });
    expect(interactionDistance(point, { x: 200, y: 0 })).toBe(84);
    expect(approachPoint({ x: 150, y: 0 }, { x: 200, y: 0 }, 84)).toEqual({ x: 150, y: 0 });
  });
});
