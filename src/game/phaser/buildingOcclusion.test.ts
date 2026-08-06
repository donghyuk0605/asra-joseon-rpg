import { describe, expect, it } from 'vitest';
import { isPointBehindOccluder, occlusionBackEdge } from './buildingOcclusion';

describe('building foreground occlusion', () => {
  const area = { left: 100, right: 500, top: 120, front: 520 };

  it('fades while the player is behind or inside the structure footprint', () => {
    expect(isPointBehindOccluder({ x: 300, y: 240 }, area)).toBe(true);
    expect(isPointBehindOccluder({ x: 300, y: occlusionBackEdge(area) }, area)).toBe(true);
  });

  it('keeps the facade opaque when the player stands in front', () => {
    expect(isPointBehindOccluder({ x: 300, y: occlusionBackEdge(area) + 1 }, area)).toBe(false);
    expect(isPointBehindOccluder({ x: 300, y: 560 }, area)).toBe(false);
  });

  it('does not fade unrelated buildings beside the player', () => {
    expect(isPointBehindOccluder({ x: 80, y: 240 }, area)).toBe(false);
    expect(isPointBehindOccluder({ x: 520, y: 240 }, area)).toBe(false);
  });
});
