import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, REGION_ORIGINS } from './layout';
import {
  JURCHEN_EXPANSION_LAYOUTS,
  JURCHEN_EXPANSION_REGION_IDS,
  JURCHEN_STRUCTURE_FRAMES,
  isJurchenStructureKind,
  jurchenExpansionWorldObstacles,
  jurchenStructureFrame,
  type JurchenExpansionWorldObstacle,
} from './jurchenExpansion';

const overlaps = (
  obstacle: JurchenExpansionWorldObstacle,
  point: { x: number; y: number },
  radius = 24,
): boolean => obstacle.type === 'circle'
  ? Math.hypot(point.x - obstacle.x, point.y - obstacle.y) <= obstacle.radius + radius
  : Math.abs(point.x - obstacle.x) <= obstacle.width / 2 + radius
    && Math.abs(point.y - obstacle.y) <= obstacle.height / 2 + radius;

describe('object-composed Jurchen expansion maps', () => {
  it('defines three hunting grounds and three tribal villages without new map paintings', () => {
    const layouts = JURCHEN_EXPANSION_REGION_IDS.map(
      (region) => JURCHEN_EXPANSION_LAYOUTS[region],
    );
    expect(layouts.filter((layout) => layout.category === 'hunt')).toHaveLength(3);
    expect(layouts.filter((layout) => layout.category === 'village')).toHaveLength(3);
    expect(layouts.map((layout) => layout.id)).toEqual(JURCHEN_EXPANSION_REGION_IDS);
  });

  it('uses all six established Jurchen structure-atlas frames by named kind', () => {
    expect(JURCHEN_STRUCTURE_FRAMES).toEqual({
      'great-tent': 0,
      'hide-tent': 1,
      longhouse: 2,
      'palisade-gate': 3,
      watchtower: 4,
      'supply-sled': 5,
    });
    for (const [kind, frame] of Object.entries(JURCHEN_STRUCTURE_FRAMES)) {
      expect(isJurchenStructureKind(kind as keyof typeof JURCHEN_STRUCTURE_FRAMES)).toBe(true);
      expect(jurchenStructureFrame(kind as keyof typeof JURCHEN_STRUCTURE_FRAMES)).toBe(frame);
    }
    expect(isJurchenStructureKind('pine')).toBe(false);
    expect(isJurchenStructureKind('shrine')).toBe(false);
    expect(isJurchenStructureKind('cart')).toBe(false);
  });

  it('builds each map from several large runtime props while keeping the center route open', () => {
    const obstacles = jurchenExpansionWorldObstacles();
    for (const region of JURCHEN_EXPANSION_REGION_IDS) {
      const layout = JURCHEN_EXPANSION_LAYOUTS[region];
      expect(layout.props.length, region).toBeGreaterThanOrEqual(9);
      expect(
        layout.props.filter((prop) => prop.height >= 300).length,
        `${region}:large-props`,
      ).toBeGreaterThanOrEqual(6);
      expect(
        layout.props.some((prop) => isJurchenStructureKind(prop.kind)),
        `${region}:jurchen-atlas`,
      ).toBe(true);

      const origin = REGION_ORIGINS[region];
      for (let y = 12; y <= MAP_HEIGHT - 12; y += 32) {
        expect(
          obstacles.some((obstacle) =>
            overlaps(obstacle, { x: origin.x + 768, y: origin.y + y })),
          `${region}:center-road:${y}`,
        ).toBe(false);
      }
    }
    expect(obstacles.length).toBeGreaterThan(55);
  });

  it('gives every village a large tent and a passable palisade gate', () => {
    for (const region of ['baeksanvillage', 'songhuavillage', 'heuksuvillage'] as const) {
      const layout = JURCHEN_EXPANSION_LAYOUTS[region];
      expect(layout.props.some((prop) => prop.kind === 'great-tent')).toBe(true);
      const gates = layout.props.filter((prop) => prop.kind === 'palisade-gate');
      expect(gates.length, region).toBeGreaterThanOrEqual(1);
      for (const gate of gates) {
        const [left, right] = gate.collisions ?? [];
        expect(left?.type).toBe('box');
        expect(right?.type).toBe('box');
        if (!left || !right || left.type !== 'box' || right.type !== 'box') {
          throw new Error('palisade gate wings must be boxes');
        }
        const doorwayWidth = (right.offsetX ?? 0) - right.width / 2
          - ((left.offsetX ?? 0) + left.width / 2);
        expect(doorwayWidth, `${region}:doorway`).toBeGreaterThanOrEqual(300);
      }
    }
  });

  it('keeps every solid collision inside its own 1536 by 1024 map cell', () => {
    for (const region of JURCHEN_EXPANSION_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      const localObstacles = jurchenExpansionWorldObstacles().filter((obstacle) =>
        obstacle.x >= origin.x
        && obstacle.x <= origin.x + 1536
        && obstacle.y >= origin.y
        && obstacle.y <= origin.y + MAP_HEIGHT);
      expect(localObstacles.length, region).toBeGreaterThanOrEqual(9);
      for (const obstacle of localObstacles) {
        const halfWidth = obstacle.type === 'circle' ? obstacle.radius : obstacle.width / 2;
        const halfHeight = obstacle.type === 'circle' ? obstacle.radius : obstacle.height / 2;
        expect(obstacle.x - halfWidth, `${region}:left`).toBeGreaterThanOrEqual(origin.x);
        expect(obstacle.x + halfWidth, `${region}:right`).toBeLessThanOrEqual(origin.x + 1536);
        expect(obstacle.y - halfHeight, `${region}:top`).toBeGreaterThanOrEqual(origin.y);
        expect(obstacle.y + halfHeight, `${region}:bottom`).toBeLessThanOrEqual(
          origin.y + MAP_HEIGHT,
        );
      }
    }
  });
});
