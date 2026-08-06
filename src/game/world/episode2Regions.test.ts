import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import { EPISODE2_REGION_IDS, REGIONS } from './regions';
import {
  EPISODE2_CLUSTERS,
  EPISODE2_REGION_LAYOUTS,
  EPISODE2_REGION_SPAWNS,
  episode2DropPool,
  episode2Neighbors,
  episode2WorldObstacles,
} from './episode2Regions';

describe('Episode II regional world', () => {
  it('adds twenty-four named regions arranged as six traversable four-stop routes', () => {
    expect(EPISODE2_REGION_IDS).toHaveLength(24);
    expect(EPISODE2_CLUSTERS).toHaveLength(6);
    expect(EPISODE2_CLUSTERS.flatMap((cluster) => cluster.regions)).toEqual(EPISODE2_REGION_IDS);
    expect(new Set(EPISODE2_REGION_IDS).size).toBe(24);
    for (const region of EPISODE2_REGION_IDS) {
      expect(REGIONS[region].name.length).toBeGreaterThan(1);
      expect(REGION_ORIGINS[region]).toBeDefined();
    }
  });

  it('keeps every route bidirectional without inventing cross-cluster seams', () => {
    for (const cluster of EPISODE2_CLUSTERS) {
      expect(episode2Neighbors(cluster.regions[0])).toEqual([cluster.regions[1]]);
      expect(episode2Neighbors(cluster.regions[1])).toEqual([cluster.regions[0], cluster.regions[2]]);
      expect(episode2Neighbors(cluster.regions[2])).toEqual([cluster.regions[1], cluster.regions[3]]);
      expect(episode2Neighbors(cluster.regions[3])).toEqual([cluster.regions[2]]);
    }
  });

  it('gives every region a distinct object layout, ecology, and five resident encounters', () => {
    const signatures = new Set<string>();
    for (const region of EPISODE2_REGION_IDS) {
      const layout = EPISODE2_REGION_LAYOUTS[region];
      const spawns = EPISODE2_REGION_SPAWNS[region];
      expect(layout.id).toBe(region);
      expect(layout.props).toHaveLength(6);
      expect(layout.ecologyNote.length).toBeGreaterThan(28);
      expect(layout.dropPool).toHaveLength(3);
      expect(spawns).toHaveLength(5);
      expect(spawns.every(([, x, y]) => x > 0 && x < MAP_WIDTH && y > 0 && y < MAP_HEIGHT)).toBe(true);
      signatures.add([
        layout.biome,
        layout.groundColor,
        layout.waterSide,
        layout.props.map((prop) => prop.frame).join('-'),
        layout.reeds,
        layout.boats,
        layout.flags,
      ].join(':'));
    }
    expect(signatures.size).toBe(EPISODE2_REGION_IDS.length);
    expect(Object.values(EPISODE2_REGION_SPAWNS).flat()).toHaveLength(120);
    const residentKinds = new Set(Object.values(EPISODE2_REGION_SPAWNS).flat().map(([kind]) => kind));
    for (const kind of [
      'episode2-red-fox',
      'episode2-mountain-leopard',
      'episode2-marsh-wisp',
      'episode2-stone-dokkaebi',
    ]) expect(residentKinds).toContain(kind);
  });

  it('distributes all sixteen new equipment images through regional drop pools', () => {
    const drops = new Set(EPISODE2_REGION_IDS.flatMap((region) => [...episode2DropPool(region)]));
    expect(drops.size).toBe(16);
    expect(episode2DropPool('village')).toEqual([]);
  });

  it('keeps the central road open while making water banks and solid structures collide', () => {
    const obstacles = episode2WorldObstacles();
    expect(obstacles.length).toBeGreaterThan(24 * 3);
    for (const region of EPISODE2_REGION_IDS) {
      const origin = REGION_ORIGINS[region];
      const localObstacles = obstacles.filter((obstacle) => (
        obstacle.x >= origin.x && obstacle.x <= origin.x + MAP_WIDTH
        && obstacle.y >= origin.y && obstacle.y <= origin.y + MAP_HEIGHT
      ));
      expect(localObstacles.length).toBeGreaterThanOrEqual(2);
      expect(localObstacles.every((obstacle) => {
        if (obstacle.type === 'circle') return Math.abs(obstacle.x - (origin.x + MAP_WIDTH / 2)) > obstacle.radius + 145;
        const left = obstacle.x - obstacle.width / 2;
        const right = obstacle.x + obstacle.width / 2;
        return right < origin.x + MAP_WIDTH / 2 - 145 || left > origin.x + MAP_WIDTH / 2 + 145;
      })).toBe(true);
    }
  });
});
