import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { MonsterKind } from '../simulation/types';
import {
  BUSANJIN_SOLDIER_VISUAL_SCALE,
  monsterScaleForRegion,
  PYONGYANG_SOLDIER_VISUAL_SCALE,
} from './pyongyangSoldierScale';

describe('Pyongyang soldier visual scale', () => {
  it('normalizes all Pyongyang soldier walk silhouettes to one grounded height', () => {
    const result = spawnSync(
      'python3',
      ['scripts/validate_pyongyang_soldier_scale.py', JSON.stringify(PYONGYANG_SOLDIER_VISUAL_SCALE)],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Pyongyang soldier silhouettes normalized');
  }, 20_000);

  it('applies the correction only inside the three Pyongyang maps', () => {
    const fallback = 0.52;
    const kind: MonsterKind = 'joseon-border-archer';
    expect(monsterScaleForRegion(kind, 'pyongyangouter', 0, fallback)).toBe(0.659);
    expect(monsterScaleForRegion(kind, 'pyongyanggate', 2, fallback)).toBe(0.685);
    expect(monsterScaleForRegion(kind, 'pyongyanginner', 4, fallback)).toBe(0.737);
    expect(monsterScaleForRegion(kind, 'manchufrontier', 4, fallback)).toBe(fallback);
  });

  it('keeps rank size intentional while correcting every facing row', () => {
    expect(PYONGYANG_SOLDIER_VISUAL_SCALE['joseon-border-swordsman']).toHaveLength(5);
    expect(PYONGYANG_SOLDIER_VISUAL_SCALE['joseon-border-spearman']).toHaveLength(5);
    expect(PYONGYANG_SOLDIER_VISUAL_SCALE['joseon-border-archer']).toHaveLength(5);
    expect(PYONGYANG_SOLDIER_VISUAL_SCALE['joseon-border-commander']).toHaveLength(5);
  });

  it('normalizes every Japanese soldier direction only in Busanjin', () => {
    const fallback = 0.57;
    expect(monsterScaleForRegion('japanese-swordsman', 'busanjin', 0, fallback)).toBe(0.487);
    expect(monsterScaleForRegion('japanese-gunner', 'busanjin', 4, fallback)).toBe(0.520);
    expect(monsterScaleForRegion('japanese-general', 'busanjin', 4, fallback)).toBe(0.646);
    expect(monsterScaleForRegion('japanese-general', 'tangeumdae', 4, fallback)).toBe(fallback);
    for (const scales of Object.values(BUSANJIN_SOLDIER_VISUAL_SCALE)) {
      expect(scales).toHaveLength(5);
      expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.44);
      expect(Math.max(...scales)).toBeLessThanOrEqual(0.65);
    }
  });
});
