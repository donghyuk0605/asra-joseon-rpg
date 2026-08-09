import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import {
  continuityCameraBoundsForRegion,
  safeCameraBoundsForRegion,
  continuityNeighborsForRegion,
  continuousWorldEdge,
  isContinuousWorldNeighbor,
  sameContinuityCameraGroup,
  WORLD_TERRAIN_SEAMS,
  WORLD_TRAVEL_CONNECTIONS,
  worldTravelConnectionBetween,
  worldTravelConnectionAtEdge,
  worldTravelDockObstacles,
  worldTerrainSeamBetween,
} from './worldContinuity';

describe('world terrain continuity graph', () => {
  it('contains only physically touching, uniquely named terrain seams', () => {
    const ids = new Set<string>();
    const pairs = new Set<string>();
    for (const seam of WORLD_TERRAIN_SEAMS) {
      expect(ids.has(seam.id), seam.id).toBe(false);
      ids.add(seam.id);
      const pair = [seam.from, seam.to].sort().join(':');
      expect(pairs.has(pair), pair).toBe(false);
      pairs.add(pair);

      const from = REGION_ORIGINS[seam.from];
      const to = REGION_ORIGINS[seam.to];
      if (seam.orientation === 'vertical') {
        expect(from.x, seam.id).toBe(to.x);
        expect(Math.abs(from.y - to.y), seam.id).toBe(MAP_HEIGHT);
        expect(seam.fromLane, seam.id).toBeGreaterThan(seam.roadWidth / 2 + 40);
        expect(seam.toLane, seam.id).toBeLessThan(MAP_WIDTH - seam.roadWidth / 2 - 40);
      } else {
        expect(from.y, seam.id).toBe(to.y);
        expect(Math.abs(from.x - to.x), seam.id).toBe(MAP_WIDTH);
        expect(seam.fromLane, seam.id).toBeGreaterThan(seam.roadWidth / 2 + 40);
        expect(seam.toLane, seam.id).toBeLessThan(MAP_HEIGHT - seam.roadWidth / 2 - 40);
      }
    }
  });

  it('covers every physically walkable Japan, northern, palace and Jeonju border', () => {
    const chains = [
      ['izuhara', 'tsushimahunt'],
      [
        'izumihunt', 'sakaicity', 'shogunkeep', 'osakacastle',
        'yamazakihunt', 'settsuvillage', 'osaka',
      ],
      [
        'heuksuvillage', 'blackpinehunt', 'songhuavillage', 'songhuahunt',
        'baeksanvillage', 'changbaihunt', 'jurchenvillage', 'manchufrontier',
        'pyongyangouter', 'pyongyanggate', 'pyongyanginner',
      ],
      ['jeonju', 'jeonjugate', 'jeonjufield'],
      ['gyeongbokinner', 'gyeongbokcourt', 'gyeongbokgate'],
      ['gangneung', 'wonju', 'yeongwolhq'],
      ['haeju', 'gaeseong'],
    ] as const;
    for (const chain of chains) {
      for (let index = 1; index < chain.length; index += 1) {
        expect(
          isContinuousWorldNeighbor(chain[index - 1], chain[index]),
          `${chain[index - 1]} -> ${chain[index]}`,
        ).toBe(true);
      }
    }
  });

  it('treats the original village routes as one continuous open field', () => {
    expect(isContinuousWorldNeighbor('mistwood', 'village')).toBe(true);
    expect(isContinuousWorldNeighbor('village', 'minepass')).toBe(true);
    expect(isContinuousWorldNeighbor('village', 'moonfield')).toBe(true);
    expect(continuityNeighborsForRegion('village')).toEqual(
      expect.arrayContaining(['mistwood', 'minepass', 'moonfield']),
    );

    const west = worldTerrainSeamBetween('mistwood', 'village');
    expect(west?.orientation).toBe('horizontal');
    expect(west?.fromLane).toBe(480);
    expect(west?.roadWidth).toBe(220);

    const south = worldTerrainSeamBetween('village', 'moonfield');
    expect(south?.orientation).toBe('vertical');
    expect(south?.fromLane).toBe(770);
    expect(south?.roadWidth).toBe(260);
  });

  it('keeps distant story travel out of the walkable terrain graph', () => {
    expect(worldTerrainSeamBetween('izuhara', 'busanjin')).toBeNull();
    expect(worldTerrainSeamBetween('heuksuvillage', 'jurchenvillage')).toBeNull();
    expect(worldTerrainSeamBetween('pyongyanginner', 'gyeongbokgate')).toBeNull();
    expect(worldTerrainSeamBetween('jeonju', 'busanjin')).toBeNull();
    expect(worldTerrainSeamBetween('tsushimahunt', 'ikiport')).toBeNull();
    expect(worldTerrainSeamBetween('ikiport', 'awajicoast')).toBeNull();
    expect(worldTerrainSeamBetween('awajicoast', 'izumihunt')).toBeNull();
  });

  it('models island crossings as reciprocal ferries with blocked water shoulders', () => {
    expect(WORLD_TRAVEL_CONNECTIONS).toHaveLength(3);
    expect(worldTravelConnectionBetween('tsushimahunt', 'ikiport')?.mode).toBe('ferry');
    expect(worldTravelConnectionBetween('ikiport', 'tsushimahunt')?.mode).toBe('ferry');
    expect(worldTravelConnectionBetween('ikiport', 'awajicoast')?.mode).toBe('ferry');
    expect(worldTravelConnectionBetween('awajicoast', 'izumihunt')?.mode).toBe('ferry');
    expect(worldTravelConnectionAtEdge('awajicoast', 'north')?.id).toBe('iki-awaji-ferry');
    expect(worldTravelConnectionAtEdge('awajicoast', 'south')?.id).toBe('awaji-izumi-ferry');
    expect(worldTravelConnectionAtEdge('ikiport', 'south')?.id).toBe('iki-awaji-ferry');
    expect(worldTravelDockObstacles()).toHaveLength(12);
  });

  it('gives the Settsu to Osaka coast a broad transition band', () => {
    expect(worldTerrainSeamBetween('settsuvillage', 'osaka')?.bandSize).toBe(540);
  });

  it('exposes reciprocal neighbors and the correct physical edge', () => {
    expect(continuityNeighborsForRegion('manchufrontier')).toEqual(
      expect.arrayContaining(['jurchenvillage', 'pyongyangouter']),
    );
    expect(continuousWorldEdge('manchufrontier', 'north')?.from).toBe('jurchenvillage');
    expect(continuousWorldEdge('manchufrontier', 'south')?.to).toBe('pyongyangouter');
    expect(continuousWorldEdge('osaka', 'south')).toBeNull();
    expect(continuousWorldEdge('izuhara', 'north')).toBeNull();
  });

  it('shares stable camera bounds inside each continuous campaign strip', () => {
    const japan = continuityCameraBoundsForRegion('osaka');
    expect(japan).toEqual(continuityCameraBoundsForRegion('izumihunt'));
    expect(japan).not.toEqual(continuityCameraBoundsForRegion('awajicoast'));
    expect(continuityCameraBoundsForRegion('tsushimahunt'))
      .toEqual(continuityCameraBoundsForRegion('izuhara'));
    expect(continuityCameraBoundsForRegion('tsushimahunt'))
      .not.toEqual(continuityCameraBoundsForRegion('ikiport'));

    const north = continuityCameraBoundsForRegion('heuksuvillage');
    expect(north).toEqual(continuityCameraBoundsForRegion('manchufrontier'));
    expect(north).toEqual(continuityCameraBoundsForRegion('pyongyanginner'));

    expect(continuityCameraBoundsForRegion('busanjin'))
      .toEqual(continuityCameraBoundsForRegion('tangeumdae'));
    expect(continuityCameraBoundsForRegion('busanjin'))
      .not.toEqual(continuityCameraBoundsForRegion('gyeongbokgate'));

    expect(continuityCameraBoundsForRegion('mistwood'))
      .toEqual(continuityCameraBoundsForRegion('village'));
    expect(continuityCameraBoundsForRegion('village'))
      .toEqual(continuityCameraBoundsForRegion('minepass'));
    expect(continuityCameraBoundsForRegion('village'))
      .toEqual(continuityCameraBoundsForRegion('moonfield'));
    expect(continuityCameraBoundsForRegion('gangneung'))
      .toEqual(continuityCameraBoundsForRegion('wonju'));
    expect(continuityCameraBoundsForRegion('wonju'))
      .toEqual(continuityCameraBoundsForRegion('yeongwolhq'));
    expect(continuityCameraBoundsForRegion('haeju'))
      .toEqual(continuityCameraBoundsForRegion('gaeseong'));
    for (const seam of WORLD_TERRAIN_SEAMS) {
      expect(sameContinuityCameraGroup(seam.from, seam.to), seam.id).toBe(true);
    }
  });

  it('clamps the Jeonju camera to its complete three-map column instead of an L-shaped empty cell', () => {
    const field = safeCameraBoundsForRegion('jeonjufield');
    expect(field).toEqual(safeCameraBoundsForRegion('jeonjugate'));
    expect(field).toEqual(safeCameraBoundsForRegion('jeonju'));
    expect(field).toMatchObject({
      x: REGION_ORIGINS.jeonju.x,
      y: REGION_ORIGINS.jeonju.y,
      width: MAP_WIDTH,
      height: MAP_HEIGHT * 3,
    });
    expect(field).not.toEqual(continuityCameraBoundsForRegion('jeonjufield'));
    expect(safeCameraBoundsForRegion('village')).toEqual(continuityCameraBoundsForRegion('village'));
  });

  it('preserves a non-centred lane while crossing northern and southern borders', () => {
    const northern = new GameSimulation('manchufrontier');
    northern.player.x = REGION_ORIGINS.manchufrontier.x + 646;
    northern.travelToCampaignRegion('pyongyangouter', 'north');
    expect(northern.region).toBe('pyongyangouter');
    expect(northern.player.x).toBe(REGION_ORIGINS.pyongyangouter.x + 646);
    expect(northern.player.y).toBe(REGION_ORIGINS.pyongyangouter.y + 12);

    expect(northern.completePyongyangStageForPlaytest('pyongyangouter')).toBe(true);
    northern.travelToCampaignRegion('manchufrontier', 'south');
    expect(northern.region).toBe('manchufrontier');
    expect(northern.player.x).toBe(REGION_ORIGINS.manchufrontier.x + 646);
    expect(northern.player.y).toBe(REGION_ORIGINS.manchufrontier.y + MAP_HEIGHT - 12);

    const southern = new GameSimulation('busanjin');
    southern.player.x = REGION_ORIGINS.busanjin.x + 690;
    southern.travelToCampaignRegion('tangeumdae', 'south');
    expect(southern.region).toBe('tangeumdae');
    expect(southern.player.x).toBe(REGION_ORIGINS.tangeumdae.x + 690);
    expect(southern.player.y).toBe(REGION_ORIGINS.tangeumdae.y + MAP_HEIGHT - 12);
  });

  it('centres ferry passengers on the destination pier instead of walking across the sea', () => {
    const ferry = new GameSimulation('tsushimahunt');
    ferry.player.x = REGION_ORIGINS.tsushimahunt.x + 642;
    ferry.travelToCampaignRegion('ikiport', 'north');
    expect(ferry.region).toBe('ikiport');
    expect(ferry.player.x).toBe(REGION_ORIGINS.ikiport.x + MAP_WIDTH / 2);
    expect(ferry.player.y).toBe(REGION_ORIGINS.ikiport.y + 210);

    const collision = ferry as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    };
    const iki = REGION_ORIGINS.ikiport;
    expect(collision.isRoutePointClear({ x: iki.x + 520, y: iki.y + 85 }, 20)).toBe(false);
    expect(collision.isRoutePointClear({ x: iki.x + 768, y: iki.y + 85 }, 20)).toBe(true);
  });

  it('opens horizontal borders only inside their painted road corridor', () => {
    const western = new GameSimulation('jeonjufield');
    const internals = western as unknown as {
      clampToField: (point: { x: number; y: number }) => { x: number; y: number };
    };
    const origin = REGION_ORIGINS.jeonjufield;
    expect(internals.clampToField({
      x: origin.x + MAP_WIDTH + 40,
      y: origin.y + 500,
    }).x).toBe(origin.x + MAP_WIDTH + 14);
    expect(internals.clampToField({
      x: origin.x + MAP_WIDTH + 40,
      y: origin.y + 800,
    }).x).toBe(origin.x + MAP_WIDTH - 110);
  });

  it('crosses the new Gangwon east-west road in both directions without lane snapping', () => {
    const game = new GameSimulation('wonju');
    const wonju = REGION_ORIGINS.wonju;
    game.player.x = wonju.x + MAP_WIDTH - 5;
    game.player.y = wonju.y + 542;
    (game as unknown as { updateCampaignGateTransitions: () => void })
      .updateCampaignGateTransitions();

    expect(game.region).toBe('gangneung');
    expect(game.player.x).toBe(REGION_ORIGINS.gangneung.x + 12);
    expect(game.player.y).toBe(REGION_ORIGINS.gangneung.y + 542);

    game.travelToCampaignRegion('wonju', 'south');
    expect(game.region).toBe('wonju');
    expect(game.player.x).toBe(REGION_ORIGINS.wonju.x + MAP_WIDTH - 12);
    expect(game.player.y).toBe(REGION_ORIGINS.wonju.y + 542);
  });

  it('opens only the authored Gangwon road and preserves its north-south lane', () => {
    const game = new GameSimulation('wonju');
    const internals = game as unknown as {
      clampToField: (point: { x: number; y: number }) => { x: number; y: number };
    };
    const wonju = REGION_ORIGINS.wonju;
    expect(internals.clampToField({
      x: wonju.x + MAP_WIDTH + 40,
      y: wonju.y + 500,
    }).x).toBe(wonju.x + MAP_WIDTH + 14);
    expect(internals.clampToField({
      x: wonju.x + MAP_WIDTH + 40,
      y: wonju.y + 800,
    }).x).toBe(wonju.x + MAP_WIDTH - 110);

    game.player.x = wonju.x + 846;
    game.travelToCampaignRegion('yeongwolhq', 'north');
    expect(game.region).toBe('yeongwolhq');
    expect(game.player.x).toBe(REGION_ORIGINS.yeongwolhq.x + 846);
    expect(game.player.y).toBe(REGION_ORIGINS.yeongwolhq.y + 12);
  });
});
