import { describe, expect, it } from 'vitest';
import { PLAYER_ACTION_FRAME } from '../assets/manifest';
import sceneSource from '../phaser/HuntingScene.ts?raw';
import { GameSimulation } from '../simulation/GameSimulation';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import {
  JAPAN_DOCK_OPENING_HALF_HEIGHT,
  JAPAN_DOCK_X_INSET,
  JAPAN_DOCK_Y_BY_REGION,
  JAPAN_EXPANSION_LAYOUTS,
  JAPAN_EXPANSION_REGION_IDS,
  JAPAN_SHORELINE_COLLISION_SEGMENT_HEIGHT,
  JAPAN_SHORELINE_SAMPLES,
  JAPAN_SHORELINE_SAMPLE_STEP,
  japanExpansionWorldObstacles,
  japanShorelineWidthAtY,
  type JapanExpansionWorldObstacle,
} from './japanExpansion';

const overlaps = (
  obstacle: JapanExpansionWorldObstacle,
  point: { x: number; y: number },
  radius = 20,
): boolean => obstacle.type === 'circle'
  ? Math.hypot(point.x - obstacle.x, point.y - obstacle.y) <= obstacle.radius + radius
  : Math.abs(point.x - obstacle.x) <= obstacle.width / 2 + radius
    && Math.abs(point.y - obstacle.y) <= obstacle.height / 2 + radius;

describe('object-composed Korea Strait regions', () => {
  it('adds three cities and three hunting grounds from Sakai to Tsushima', () => {
    expect(JAPAN_EXPANSION_REGION_IDS).toEqual([
      'sakaicity',
      'izumihunt',
      'awajicoast',
      'ikiport',
      'tsushimahunt',
      'izuhara',
    ]);
    const layouts = JAPAN_EXPANSION_REGION_IDS.map((region) => JAPAN_EXPANSION_LAYOUTS[region]);
    expect(layouts.filter((layout) => layout.category === 'city')).toHaveLength(3);
    expect(layouts.filter((layout) => layout.category === 'hunt')).toHaveLength(3);
  });

  it('uses one collision-aligned Awaji painting while keeping other regions object-composed', () => {
    expect(sceneSource).toContain('private createJapanExpansionWorlds(): void');
    expect(sceneSource).toContain('ASSETS.background.key');
    expect(sceneSource).toContain("floor.setData('defaultObjectComposedRegion', region)");
    expect(sceneSource).toContain("image.setData('japanExpansionProp', prop.kind)");
    expect(sceneSource).toContain("const usesAuthoredAwajiMap = region === 'awajicoast'");
    expect(sceneSource).toContain('ASSETS.awajiCoastBackground.key');
    expect(sceneSource).toContain(".setData('authoredMapBackground', 'awajicoast')");
    expect(sceneSource).toContain('if (!usesAuthoredAwajiMap)');
    expect(sceneSource).not.toContain('sakaiCityBackground');
    expect(sceneSource).not.toContain('tsushimaHuntBackground');
  });

  it('keeps buildings visibly larger than an adult character while preserving an open center route', () => {
    const adultVisualHeight = PLAYER_ACTION_FRAME.height * 0.52;
    const obstacles = japanExpansionWorldObstacles();
    for (const region of JAPAN_EXPANSION_REGION_IDS) {
      const layout = JAPAN_EXPANSION_LAYOUTS[region];
      expect(layout.props.length, region).toBeGreaterThanOrEqual(7);
      if (layout.category === 'city') {
        const gate = layout.props.find((prop) => prop.kind === 'outer-gate' || prop.kind === 'inner-gate');
        const house = layout.props.find((prop) => prop.kind === 'barracks');
        expect(gate?.height ?? 0, `${region}:gate`).toBeGreaterThan(adultVisualHeight * 3.2);
        expect(house?.height ?? 0, `${region}:house`).toBeGreaterThan(adultVisualHeight * 2.2);
      } else {
        expect(
          layout.props.some((prop) => prop.kind === 'pine' || prop.kind === 'watchtower'),
          `${region}:landmark`,
        ).toBe(true);
      }
      const origin = REGION_ORIGINS[region];
      for (let y = 12; y <= MAP_HEIGHT - 12; y += 32) {
        expect(
          obstacles.some((obstacle) => overlaps(obstacle, { x: origin.x + 768, y: origin.y + y })),
          `${region}:center-road:${y}`,
        ).toBe(false);
      }
    }

    expect(obstacles.length).toBeGreaterThan(40);
  });

  it('uses one interpolated shoreline profile for rendering and segmented water collision', () => {
    expect(JAPAN_SHORELINE_SAMPLES).toHaveLength(9);
    expect(JAPAN_SHORELINE_SAMPLE_STEP).toBe(MAP_HEIGHT / 8);
    expect(JAPAN_SHORELINE_COLLISION_SEGMENT_HEIGHT).toBeLessThanOrEqual(32);
    JAPAN_SHORELINE_SAMPLES.forEach((width, index) => {
      expect(japanShorelineWidthAtY(index * JAPAN_SHORELINE_SAMPLE_STEP)).toBe(width);
    });
    expect(japanShorelineWidthAtY(-100)).toBe(JAPAN_SHORELINE_SAMPLES[0]);
    expect(japanShorelineWidthAtY(MAP_HEIGHT + 100)).toBe(
      JAPAN_SHORELINE_SAMPLES[JAPAN_SHORELINE_SAMPLES.length - 1],
    );

    const obstacles = japanExpansionWorldObstacles();
    for (const region of JAPAN_EXPANSION_REGION_IDS) {
      const layout = JAPAN_EXPANSION_LAYOUTS[region];
      const sides = layout.waterSide === 'both'
        ? (['left', 'right'] as const)
        : layout.waterSide
          ? ([layout.waterSide] as const)
          : [];
      const origin = REGION_ORIGINS[region];
      const dockY = JAPAN_DOCK_Y_BY_REGION[region];

      for (const side of sides) {
        for (const localY of [64, 256, 448, 928]) {
          const coastWidth = japanShorelineWidthAtY(localY);
          const waterPoint = {
            x: origin.x + (side === 'left' ? coastWidth - 24 : MAP_WIDTH - coastWidth + 24),
            y: origin.y + localY,
          };
          expect(
            obstacles.some((obstacle) => overlaps(obstacle, waterPoint, 0)),
            `${region}:${side}:water:${localY}`,
          ).toBe(true);
        }

        const dockPoint = {
          x: origin.x + (side === 'left' ? JAPAN_DOCK_X_INSET : MAP_WIDTH - JAPAN_DOCK_X_INSET),
          y: origin.y + dockY,
        };
        expect(
          obstacles.some((obstacle) => overlaps(obstacle, dockPoint, 20)),
          `${region}:${side}:dock-opening`,
        ).toBe(false);

        const justOutsideOpeningY = dockY + JAPAN_DOCK_OPENING_HALF_HEIGHT + 20;
        const outsideWidth = japanShorelineWidthAtY(justOutsideOpeningY);
        const outsidePoint = {
          x: origin.x + (side === 'left' ? outsideWidth - 18 : MAP_WIDTH - outsideWidth + 18),
          y: origin.y + justOutsideOpeningY,
        };
        expect(
          obstacles.some((obstacle) => overlaps(obstacle, outsidePoint, 0)),
          `${region}:${side}:dock-bank`,
        ).toBe(true);
      }
    }
  });

  it('blocks city gate wings but leaves a player-width doorway in the middle', () => {
    for (const region of ['sakaicity', 'ikiport', 'izuhara'] as const) {
      const gates = JAPAN_EXPANSION_LAYOUTS[region].props.filter((prop) =>
        prop.kind === 'outer-gate' || prop.kind === 'inner-gate');
      expect(gates.length, region).toBeGreaterThanOrEqual(1);
      for (const gate of gates) {
        const wings = gate.collisions ?? [];
        expect(wings).toHaveLength(2);
        expect(wings.every((wing) => wing.type === 'box')).toBe(true);
        expect(wings.some((wing) => (wing.offsetX ?? 0) < 0)).toBe(true);
        expect(wings.some((wing) => (wing.offsetX ?? 0) > 0)).toBe(true);
        const left = wings.find((wing) => (wing.offsetX ?? 0) < 0)!;
        const right = wings.find((wing) => (wing.offsetX ?? 0) > 0)!;
        if (left.type !== 'box' || right.type !== 'box') throw new Error('gate wings must be boxes');
        const doorwayWidth = (right.offsetX ?? 0) - right.width / 2
          - ((left.offsetX ?? 0) + left.width / 2);
        expect(doorwayWidth, `${region}:${gate.kind}`).toBeGreaterThanOrEqual(290);
      }
    }
  });

  it('keeps every new town resident patrol point outside solid buildings', () => {
    const game = new GameSimulation();
    const collision = game as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    };
    const residentPatrols = {
      sakaicity: [[575, 650], [625, 700], [1080, 600], [1020, 645], [760, 760], [820, 735]],
      ikiport: [[430, 615], [500, 660], [915, 610], [865, 665], [770, 745], [830, 720]],
      izuhara: [[430, 720], [500, 760], [1010, 720], [960, 765], [770, 480], [835, 505]],
    } as const;
    for (const [region, patrols] of Object.entries(residentPatrols) as Array<
      [keyof typeof residentPatrols, readonly (readonly [number, number])[]]
    >) {
      game.region = region;
      const origin = REGION_ORIGINS[region];
      for (const [x, y] of patrols) {
        expect(
          collision.isRoutePointClear({ x: origin.x + x, y: origin.y + y }, 20),
          `${region}:${x},${y}`,
        ).toBe(true);
      }
    }
  });

  it('repopulates beasts in all three new hunting grounds after their first clear', () => {
    for (const region of ['izumihunt', 'awajicoast', 'tsushimahunt'] as const) {
      const game = new GameSimulation(region);
      const prey = game.monsters.filter((monster) => monster.region === region
        && (monster.kind === 'japanese-sika-deer' || monster.kind === 'japanese-wild-boar'));
      const soldiers = game.monsters.filter((monster) => monster.region === region
        && monster.kind.startsWith('japanese-')
        && monster.kind !== 'japanese-sika-deer'
        && monster.kind !== 'japanese-wild-boar');

      expect(game.completeJapanStageForPlaytest(region), region).toBe(true);
      expect(prey.every((monster) => !monster.alive && Number.isFinite(monster.respawnAt)), region).toBe(true);
      expect(soldiers.every((monster) =>
        !monster.alive && monster.respawnAt === Number.POSITIVE_INFINITY), region).toBe(true);

      for (let step = 0; step < 500; step += 1) game.update(0.05);
      expect(prey.every((monster) => monster.alive), region).toBe(true);
      expect(soldiers.every((monster) => !monster.alive), region).toBe(true);
      expect(game.isJapanStageCleared(region), region).toBe(true);
    }
  });
});
