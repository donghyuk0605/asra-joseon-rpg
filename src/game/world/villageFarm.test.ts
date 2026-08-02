import { describe, expect, it } from 'vitest';
import {
  advanceFarmPlotStage,
  VILLAGE_FARMERS,
  VILLAGE_FARM_PLOTS,
} from './villageFarm';

describe('village farm livelihood', () => {
  it('cycles a cultivated plot through tilling, sowing, growth, ripening, and harvest', () => {
    let stage = advanceFarmPlotStage('ripe', 'till');
    expect(stage).toBe('furrowed');
    stage = advanceFarmPlotStage(stage, 'sow');
    expect(stage).toBe('sown');
    stage = advanceFarmPlotStage(stage, 'water');
    expect(stage).toBe('growing');
    stage = advanceFarmPlotStage(stage, 'water');
    expect(stage).toBe('ripe');
    expect(advanceFarmPlotStage(stage, 'harvest')).toBe('furrowed');
  });

  it('ships distinct men and women for every visible farm job', () => {
    expect(new Set(VILLAGE_FARMERS.map((farmer) => farmer.appearance))).toEqual(new Set([
      'male-sower',
      'male-ploughman',
      'female-sower',
      'female-waterer',
    ]));
    expect(new Set(VILLAGE_FARMERS.map((farmer) => farmer.work))).toEqual(new Set([
      'till',
      'sow',
      'water',
      'harvest',
    ]));
    expect(VILLAGE_FARMERS.filter((farmer) => farmer.appearance.startsWith('female'))).toHaveLength(2);
    expect(new Set(VILLAGE_FARMERS.map((farmer) => farmer.plotId)).size).toBe(VILLAGE_FARM_PLOTS.length);
  });

  it('keeps the kitchen fields outside the central road and every farmer on the assigned soil', () => {
    expect(VILLAGE_FARM_PLOTS.map(({ x, y }) => [x, y])).toEqual([
      [225, 510],
      [435, 510],
      [1100, 560],
      [1320, 560],
    ]);

    const road = { left: 645, right: 925 };
    for (const plot of VILLAGE_FARM_PLOTS) {
      const left = plot.x - plot.width / 2;
      const right = plot.x + plot.width / 2;
      expect(right <= road.left - 20 || left >= road.right + 20, plot.id).toBe(true);

      const farmer = VILLAGE_FARMERS.find((entry) => entry.plotId === plot.id)!;
      for (const point of farmer.points) {
        expect(point.x, `${farmer.id} x`).toBeGreaterThanOrEqual(left);
        expect(point.x, `${farmer.id} x`).toBeLessThanOrEqual(right);
        expect(point.y, `${farmer.id} y`).toBeGreaterThanOrEqual(plot.y - plot.height);
        expect(point.y, `${farmer.id} y`).toBeLessThanOrEqual(plot.y);
      }
    }
  });
});
