import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  JOSEON_TOWN_X,
  MAP_HEIGHT,
  MAP_WIDTH,
  REGION_ORIGINS,
  WORLD_MIN_X,
  WORLD_WIDTH,
} from './layout';
import { REGIONS, type RegionId } from './regions';
import {
  FAMOUS_JOSEON_TOWN_REGION_IDS,
  GWANGHAE_MILITIA_RALLY_NPC_IDS,
  GWANGHAE_MILITIA_RALLY_POINTS,
  HANSEONG_REGION_IDS,
  isJoseonTownRegion,
  JOSEON_TOWN_LAYOUTS,
  JOSEON_TOWN_REGION_IDS,
  joseonTownGate,
  joseonTownWorldObstacles,
} from './joseonTowns';

describe('Joseon capital and famous-town road', () => {
  it('anchors every Gwanghae militia rally to one visible NPC on the seven-town road', () => {
    expect(GWANGHAE_MILITIA_RALLY_NPC_IDS).toHaveLength(7);
    expect(new Set(GWANGHAE_MILITIA_RALLY_NPC_IDS).size).toBe(7);
    expect(GWANGHAE_MILITIA_RALLY_NPC_IDS.map((npcId) =>
      GWANGHAE_MILITIA_RALLY_POINTS[npcId].region
    )).toEqual([
      'changdeokgung',
      'gaeseong',
      'hanseongmarket',
      'hanseongsouth',
      'suwon',
      'chungju',
      'andong',
    ]);

    for (const npcId of GWANGHAE_MILITIA_RALLY_NPC_IDS) {
      const point = GWANGHAE_MILITIA_RALLY_POINTS[npcId];
      expect(point.npcId).toBe(npcId);
      expect(JOSEON_TOWN_LAYOUTS[point.region].npcs.some((npc) => npc.id === npcId)).toBe(true);
      expect(point.label.length).toBeGreaterThan(4);
      expect(point.message).toContain('명');
      expect(point.recruits).toBeGreaterThanOrEqual(40);
      expect(point.strengthGain).toBeGreaterThan(0);
    }
    expect(GWANGHAE_MILITIA_RALLY_NPC_IDS.reduce(
      (total, npcId) => total + GWANGHAE_MILITIA_RALLY_POINTS[npcId].recruits,
      0,
    )).toBe(490);
  });

  it('places seven non-overlapping maps in one continuous western column', () => {
    expect(HANSEONG_REGION_IDS).toEqual([
      'hanseongsouth',
      'hanseongmarket',
      'changdeokgung',
    ]);
    expect(FAMOUS_JOSEON_TOWN_REGION_IDS).toEqual([
      'gaeseong',
      'suwon',
      'chungju',
      'andong',
    ]);
    expect(JOSEON_TOWN_REGION_IDS).toHaveLength(7);
    expect(new Set(JOSEON_TOWN_REGION_IDS).size).toBe(7);

    for (const [index, region] of JOSEON_TOWN_REGION_IDS.entries()) {
      const origin = REGION_ORIGINS[region];
      expect(origin.x).toBe(JOSEON_TOWN_X);
      expect(origin.x).toBeGreaterThanOrEqual(WORLD_MIN_X);
      expect(origin.x + MAP_WIDTH).toBeLessThanOrEqual(WORLD_MIN_X + WORLD_WIDTH);
      if (index > 0) {
        expect(origin.y - REGION_ORIGINS[JOSEON_TOWN_REGION_IDS[index - 1]].y).toBe(MAP_HEIGHT);
      }
    }
  });

  it('keeps settlement names and Crown Prince Gwanghae under King Seonjo historically specific', () => {
    expect(REGIONS.hanseongsouth.name).toContain('숭례문');
    expect(REGIONS.hanseongmarket.name).toContain('종루');
    expect(REGIONS.changdeokgung.name).toContain('왕세자 광해');
    expect(REGIONS.changdeokgung.status).toContain('선조 재위');
    expect(REGIONS.gaeseong.name).toContain('송도');
    expect(REGIONS.suwon.name).toContain('읍치');
    expect(REGIONS.chungju.name).toContain('목계나루');
    expect(REGIONS.andong.name).toContain('서원길');

    const authoredContent = JSON.stringify(JOSEON_TOWN_LAYOUTS);
    expect(authoredContent).toContain('왕세자 광해');
    expect(authoredContent).toContain('선조 전하');
    expect(authoredContent).toContain('분조');
    expect(authoredContent).toContain('명분보다 살아 있는 백성');
    expect(authoredContent).not.toContain('king-gwanghae');
    expect(authoredContent).not.toContain('수원화성');
    expect(JOSEON_TOWN_REGION_IDS.every((region) => REGIONS[region].safe)).toBe(true);
  });

  it('provides raster backgrounds, walkable routes, NPC life and solid props for every map', () => {
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const layout = JOSEON_TOWN_LAYOUTS[region];
      expect(layout.id).toBe(region);
      expect(layout.backgroundKey).toMatch(/-v[12]$/);
      expect(layout.backgroundPath).toMatch(/^\/assets\/environment\/campaign\/.+\.webp$/);
      expect(existsSync(`public${layout.backgroundPath}`), layout.backgroundPath).toBe(true);
      expect(layout.paths.length).toBeGreaterThan(0);
      expect(layout.obstacles.length).toBeGreaterThanOrEqual(6);
      expect(layout.npcs.length).toBeGreaterThanOrEqual(3);
      expect(
        layout.npcs.every((npc) => (npc.patrol?.length ?? 0) >= 2),
        `${region} must give every resident a real movement route`,
      ).toBe(true);
      expect(layout.landmarks.length).toBeGreaterThanOrEqual(2);

      const mainRoad = layout.paths[0];
      expect(mainRoad.points[0].y).toBe(0);
      expect(mainRoad.points.at(-1)?.y).toBe(MAP_HEIGHT);
      expect(mainRoad.points.every((point) =>
        point.x >= 0 && point.x <= MAP_WIDTH && point.y >= 0 && point.y <= MAP_HEIGHT
      )).toBe(true);
      expect(mainRoad.width).toBeGreaterThanOrEqual(240);

      // The authored architecture may flank the central road but must never
      // make the 300px-class gate lane impassable.
      for (const obstacle of layout.obstacles) {
        if (obstacle.type === 'circle') {
          expect(Math.abs(obstacle.x - MAP_WIDTH / 2)).toBeGreaterThan(obstacle.radius + 54);
        } else {
          expect(Math.abs(obstacle.x - MAP_WIDTH / 2)).toBeGreaterThan(obstacle.width / 2 + 54);
        }
      }
    }

    expect(JOSEON_TOWN_LAYOUTS.changdeokgung.backgroundKey).toBe('changdeokgung-audience-v2');
    expect(JOSEON_TOWN_LAYOUTS.changdeokgung.obstacles.map((obstacle) => obstacle.id))
      .toEqual(expect.arrayContaining(['changdeok-injeongjeon', 'changdeok-east-offices']));
    expect(joseonTownGate('changdeokgung', 'north')?.y).toBeLessThanOrEqual(100);
    expect(JOSEON_TOWN_REGION_IDS.flatMap((region) => JOSEON_TOWN_LAYOUTS[region].gates)
      .every((candidate) => candidate.width === 220)).toBe(true);

    const sungnyemun = JOSEON_TOWN_LAYOUTS.hanseongsouth;
    expect(sungnyemun.backgroundKey).toBe('hanseong-sungnyemun-v2');
    expect(sungnyemun.subtitleY).toBeGreaterThanOrEqual(140);
    expect(sungnyemun.landmarks.find((landmark) => landmark.id === 'sungnyemun')?.marker).toBe(false);
    expect(sungnyemun.obstacles.find((obstacle) => obstacle.id === 'sungnyemun-west-wall')?.y)
      .toBeGreaterThanOrEqual(360);
    expect(JOSEON_TOWN_LAYOUTS.suwon.landmarks.find((landmark) => landmark.id === 'suwon-office'))
      .toMatchObject({ x: 1215, y: 250 });
  });

  it('connects every neighboring road gate in both directions', () => {
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      for (const candidate of JOSEON_TOWN_LAYOUTS[region].gates) {
        const destinationOrigin = REGION_ORIGINS[candidate.destination];
        expect(destinationOrigin.x).toBe(origin.x);
        expect(destinationOrigin.y).toBe(
          origin.y + (candidate.edge === 'north' ? -MAP_HEIGHT : MAP_HEIGHT),
        );
        const returnEdge = candidate.edge === 'north' ? 'south' : 'north';
        expect(joseonTownGate(candidate.destination, returnEdge)?.destination).toBe(region);
      }
    }
  });

  it('keeps every resident and patrol foot point off roofs, stalls, water and props', () => {
    const bodyRadius = 19;
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const layout = JOSEON_TOWN_LAYOUTS[region];
      const outsideObstacle = (
        point: { x: number; y: number },
        obstacle: (typeof layout.obstacles)[number],
      ): boolean => obstacle.type === 'circle'
        ? Math.hypot(point.x - obstacle.x, point.y - obstacle.y)
          >= obstacle.radius + bodyRadius
        : Math.abs(point.x - obstacle.x) >= obstacle.width / 2 + bodyRadius
          || Math.abs(point.y - obstacle.y) >= obstacle.height / 2 + bodyRadius;
      for (const npc of layout.npcs) {
        const points = [{ x: npc.x, y: npc.y }, ...(npc.patrol ?? [])];
        for (const point of points) {
          for (const obstacle of layout.obstacles) {
            expect(
              outsideObstacle(point, obstacle),
              `${region}:${npc.id} (${point.x},${point.y}) overlaps ${obstacle.id}`,
            ).toBe(true);
          }
        }
        const patrol = npc.patrol ?? [];
        if (patrol.length < 2) continue;
        for (let index = 0; index < patrol.length; index += 1) {
          const start = patrol[index];
          const end = patrol[(index + 1) % patrol.length];
          for (let step = 0; step <= 24; step += 1) {
            const progress = step / 24;
            const point = {
              x: start.x + (end.x - start.x) * progress,
              y: start.y + (end.y - start.y) * progress,
            };
            for (const obstacle of layout.obstacles) {
              expect(
                outsideObstacle(point, obstacle),
                `${region}:${npc.id} patrol crosses ${obstacle.id} at ${progress.toFixed(2)}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it('keeps every authored road centerline off buildings, trees and water', () => {
    const bodyRadius = 19;
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const layout = JOSEON_TOWN_LAYOUTS[region];
      for (const path of layout.paths) {
        for (let index = 0; index < path.points.length - 1; index += 1) {
          const start = path.points[index];
          const end = path.points[index + 1];
          for (let step = 0; step <= 32; step += 1) {
            const progress = step / 32;
            const point = {
              x: start.x + (end.x - start.x) * progress,
              y: start.y + (end.y - start.y) * progress,
            };
            for (const obstacle of layout.obstacles) {
              const outside = obstacle.type === 'circle'
                ? Math.hypot(point.x - obstacle.x, point.y - obstacle.y)
                  >= obstacle.radius + bodyRadius
                : Math.abs(point.x - obstacle.x) >= obstacle.width / 2 + bodyRadius
                  || Math.abs(point.y - obstacle.y) >= obstacle.height / 2 + bodyRadius;
              expect(
                outside,
                `${region}:${path.id} crosses ${obstacle.id} at ${progress.toFixed(2)}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it('keeps royal and guard silhouettes in the four-NPC mobile budget', () => {
    for (const region of JOSEON_TOWN_REGION_IDS) {
      const layout = JOSEON_TOWN_LAYOUTS[region];
      const mobileIds = [...layout.npcs]
        .sort((left, right) => {
          const priority = (role: typeof left.role): number => role === 'royal' ? 0 : role === 'guard' ? 1 : 2;
          return priority(left.role) - priority(right.role);
        })
        .slice(0, 4)
        .map((npc) => npc.id);
      for (const npc of layout.npcs.filter((candidate) => candidate.role === 'royal' || candidate.role === 'guard')) {
        expect(mobileIds, `${region}:${npc.id}`).toContain(npc.id);
      }
    }
  });

  it('exports world-space collision data and a strict region guard', () => {
    const expectedObstacles = JOSEON_TOWN_REGION_IDS.reduce(
      (sum, region) => sum + JOSEON_TOWN_LAYOUTS[region].obstacles.length,
      0,
    );
    expect(joseonTownWorldObstacles()).toHaveLength(expectedObstacles);
    expect(isJoseonTownRegion('hanseongmarket')).toBe(true);
    expect(isJoseonTownRegion('andong')).toBe(true);
    expect(isJoseonTownRegion('gyeongbokgate')).toBe(false);
    expect(isJoseonTownRegion('dungeon')).toBe(false);

    const narrowed: RegionId = 'suwon';
    expect(isJoseonTownRegion(narrowed)).toBe(true);
  });
});
