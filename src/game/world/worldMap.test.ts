import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import { REGIONS } from './regions';
import {
  TRAVEL_ATLAS_GROUPS,
  TRAVEL_ATLAS_REGION_IDS,
  WORLD_MAP_NODES,
  worldMapNodeKind,
  worldMapNodeForRegion,
} from './worldMap';

describe('large-city world map travel', () => {
  it('covers the major Korea-Manchuria-Osaka route with valid unique destinations', () => {
    expect(WORLD_MAP_NODES.map((node) => node.label)).toEqual(expect.arrayContaining([
      '오사카', '부산포', '전주성', '영월', '한성', '평양성', '압록 전선', '여진 부락', '울릉도',
      '개성', '수원', '충주', '안동',
    ]));
    expect(new Set(WORLD_MAP_NODES.map((node) => node.destination)).size).toBe(WORLD_MAP_NODES.length);
    for (const node of WORLD_MAP_NODES) {
      expect(REGIONS[node.destination]).toBeDefined();
      expect(node.mapX).toBeGreaterThan(0);
      expect(node.mapX).toBeLessThan(100);
      expect(node.mapY).toBeGreaterThan(0);
      expect(node.mapY).toBeLessThan(100);
    }
    expect(worldMapNodeForRegion('shogunkeep')?.destination).toBe('osaka');
    expect(worldMapNodeForRegion('izuhara')?.destination).toBe('osaka');
    expect(worldMapNodeForRegion('changbaihunt')?.destination).toBe('jurchenvillage');
    expect(worldMapNodeForRegion('heuksuvillage')?.destination).toBe('jurchenvillage');
    expect(worldMapNodeForRegion('gyeongbokinner')?.destination).toBe('hanseongsouth');
    expect(worldMapNodeForRegion('changdeokgung')?.destination).toBe('hanseongsouth');
    expect(worldMapNodeForRegion('hanseongmarket')?.subtitle).toContain('숭례문');
    expect(worldMapNodeForRegion('gaeseong')?.subtitle).toBe('송도 장시');
    expect(worldMapNodeForRegion('suwon')?.subtitle).toBe('읍치 장터');
    expect(worldMapNodeForRegion('chungju')?.subtitle).toBe('목계나루');
    expect(worldMapNodeForRegion('andong')?.subtitle).toBe('서원길');
    expect(WORLD_MAP_NODES.filter((node) => worldMapNodeKind(node) === 'settlement')
      .map((node) => node.id)).toEqual(expect.arrayContaining([
      'hanseong', 'gaeseong', 'suwon', 'chungju', 'andong',
    ]));
  });

  it('ships a raster map rather than a geometric or SVG placeholder', () => {
    const path = 'public/assets/ui/joseon-regional-world-map-v1.webp';
    expect(existsSync(path)).toBe(true);
    const header = readFileSync(path).subarray(0, 12).toString('ascii');
    expect(header.startsWith('RIFF')).toBe(true);
    expect(header.endsWith('WEBP')).toBe(true);
  });

  it('maps all nine war landmarks to stable atlas frames including Hanseong', () => {
    expect(WORLD_MAP_NODES
      .filter((node) => 'landmarkFrame' in node)
      .map((node) => [node.id, 'landmarkFrame' in node ? node.landmarkFrame : -1])).toEqual([
      ['jurchen', 0],
      ['yalu', 1],
      ['pyongyang', 2],
      ['hanseong', 3],
      ['yeongwol', 4],
      ['jeonju', 5],
      ['busan', 6],
      ['ulleung', 7],
      ['osaka', 8],
    ]);
  });

  it('unlocks only visited city hubs and persists them in save data', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    expect(game.getUnlockedWorldMapRegions()).toEqual(['osaka']);
    expect(game.travelByWorldMap('busanjin')).toBe('locked');

    const snapshot = game.exportSinglePlayerSnapshot();
    snapshot.progress.visitedRegions = ['osaka', 'busanjin'];
    expect(game.importSinglePlayerSnapshot(snapshot)).toBe(true);
    expect(game.getUnlockedWorldMapRegions()).toEqual(['busanjin', 'osaka']);
    expect(game.travelByWorldMap('busanjin')).toBe('traveled');
    expect(game.region).toBe('busanjin');
    expect(game.exportSinglePlayerSnapshot().progress.visitedRegions).toContain('busanjin');
  });

  it('opens every major-city destination for the separate travel mode', () => {
    const game = new GameSimulation();
    game.unlockTravelModeWorldMap();
    expect(game.getUnlockedWorldMapRegions()).toEqual(WORLD_MAP_NODES.map((node) => node.destination));
  });

  it('offers every above-ground region exactly once in the ghost travel atlas', () => {
    const aboveGroundRegions = Object.keys(REGIONS).filter((region) => region !== 'dungeon').sort();
    expect(TRAVEL_ATLAS_GROUPS).toHaveLength(8);
    expect(TRAVEL_ATLAS_REGION_IDS).toHaveLength(aboveGroundRegions.length);
    expect(new Set(TRAVEL_ATLAS_REGION_IDS).size).toBe(aboveGroundRegions.length);
    expect([...TRAVEL_ATLAS_REGION_IDS].sort()).toEqual(aboveGroundRegions);
    expect(TRAVEL_ATLAS_REGION_IDS).not.toContain('dungeon');
  });

  it('lets the travel ghost jump to any surface map and cross terrain without combat', () => {
    const game = new GameSimulation('osaka');
    game.enableTravelMode();
    expect(game.isTravelModeEnabled()).toBe(true);
    expect(game.travelByWorldMap('shogunkeep')).toBe('traveled');
    expect(game.region).toBe('shogunkeep');
    expect(game.travelByWorldMap('ganghwado')).toBe('traveled');
    expect(game.region).toBe('ganghwado');
    expect(game.travelByWorldMap('moonfield')).toBe('traveled');
    expect(game.region).toBe('moonfield');
    expect(game.travelByWorldMap('dungeon')).toBe('dungeon');

    const before = { x: game.player.x, y: game.player.y, hp: game.player.hp };
    game.moveGhostTo({ x: before.x + 500, y: before.y + 300 });
    game.update(1);
    expect(game.player.x).toBeGreaterThan(before.x);
    expect(game.player.y).toBeGreaterThan(before.y);
    expect(game.player.hp).toBe(game.player.maxHp);
    expect(game.monsters.every((monster) => !monster.aggro)).toBe(true);
  });

  it('blocks fast travel inside the dungeon and while enemies are engaged', () => {
    const game = new GameSimulation('busanjin');
    const snapshot = game.exportSinglePlayerSnapshot();
    snapshot.progress.visitedRegions = ['busanjin', 'osaka'];
    game.importSinglePlayerSnapshot(snapshot);
    const threat = game.monsters.find((monster) => monster.region === 'busanjin' && monster.alive)!;
    threat.x = game.player.x + 20;
    threat.y = game.player.y;
    threat.aggro = true;
    expect(game.travelByWorldMap('osaka')).toBe('combat');

    const dungeon = new GameSimulation('minepass');
    const dungeonSnapshot = dungeon.exportSinglePlayerSnapshot();
    dungeonSnapshot.progress.visitedRegions = ['minepass', 'osaka'];
    dungeon.importSinglePlayerSnapshot(dungeonSnapshot);
    dungeon.enterDungeon();
    expect(dungeon.travelByWorldMap('osaka')).toBe('dungeon');
  });
});
