import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import { REGION_ORIGINS } from '../world/layout';
import { worldTerrainSeamBetween } from '../world/worldContinuity';
import { CAMPAIGN_FIELD_ROUTES } from '../world/fieldRoutes';

describe('Busanjin fortress renewal', () => {
  it('keeps all seventeen defenders on walkable ground instead of roofs or seawater', () => {
    const game = new GameSimulation('busanjin');
    const collision = game as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    };
    const defenders = game.monsters.filter((monster) => monster.region === 'busanjin');

    expect(defenders).toHaveLength(17);
    for (const defender of defenders) {
      expect(
        collision.isRoutePointClear(defender.spawn, 24),
        `${defender.kind} at ${defender.spawn.x},${defender.spawn.y}`,
      ).toBe(true);
    }
  });

  it('keeps a formation-width road open through both fortress gates', () => {
    const game = new GameSimulation('busanjin');
    const collision = game as unknown as {
      isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
    };
    const origin = REGION_ORIGINS.busanjin;

    for (const x of [610, 768, 926]) {
      for (const y of [12, 120, 350, 520, 690, 850, 1012]) {
        expect(
          collision.isRoutePointClear({ x: origin.x + x, y: origin.y + y }, 20),
          `central road ${x},${y}`,
        ).toBe(true);
      }
    }
  });

  it('connects the north gate to Tangeumdae as a wide coastal road', () => {
    expect(worldTerrainSeamBetween('tangeumdae', 'busanjin')).toMatchObject({
      kind: 'coast-road',
      roadWidth: 344,
      fromLane: 768,
      toLane: 768,
    });
  });

  it('renders raster gate foregrounds and places the Tangeumdae sign at the north exit', () => {
    const source = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');
    expect(source).toContain('createBusanjinFortressLayers');
    expect(source).toContain("addRasterCrop('south-gate-roof'");
    expect(source).toContain('for (const fieldRoute of CAMPAIGN_FIELD_ROUTES)');
    expect(source).toContain('fieldRoute.approach');
    expect(CAMPAIGN_FIELD_ROUTES).toContainEqual(expect.objectContaining({
      region: 'busanjin',
      localX: 768,
      localY: 145,
      label: '북문 군로 · 탄금대',
      destination: 'tangeumdae',
    }));
    expect(CAMPAIGN_FIELD_ROUTES).not.toContainEqual(expect.objectContaining({
      region: 'busanjin',
      localY: 890,
      destination: 'tangeumdae',
    }));
  });
});
