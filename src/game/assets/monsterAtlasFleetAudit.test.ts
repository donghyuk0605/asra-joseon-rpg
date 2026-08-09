import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type AtlasAudit = {
  summary: {
    monsterKinds: number;
    uniqueAtlases: number;
    totalFrames: number;
    emptyFrames: number;
    footlineFrames: number;
    compliantAtlases: number;
    violatingAtlases: number;
  };
  atlases: Array<{
    path: string;
    frames: number;
    emptyFrames: number;
    footlineFrames: number;
    walkDistinctMin: number;
    attackDistinctMin: number;
    compliant: boolean;
    violations: string[];
  }>;
};

const audit = JSON.parse(readFileSync(
  new URL('../../../docs/graphics/monster-atlas-audit.generated.json', import.meta.url),
  'utf8',
)) as AtlasAudit;

describe('active monster atlas fleet', () => {
  it('keeps all sixty-one monster mappings on compliant forty-frame atlases', () => {
    expect(audit.summary).toMatchObject({
      monsterKinds: 61,
      uniqueAtlases: 61,
      totalFrames: 2_440,
      emptyFrames: 0,
      footlineFrames: 2_440,
      compliantAtlases: 61,
      violatingAtlases: 0,
    });
    for (const atlas of audit.atlases) {
      expect(atlas.frames, atlas.path).toBe(40);
      expect(atlas.emptyFrames, atlas.path).toBe(0);
      expect(atlas.footlineFrames, atlas.path).toBe(40);
      expect(atlas.walkDistinctMin, atlas.path).toBe(4);
      expect(atlas.attackDistinctMin, atlas.path).toBeGreaterThanOrEqual(3);
      expect(atlas.compliant, `${atlas.path}: ${atlas.violations.join(', ')}`).toBe(true);
    }
  });

  it('plays the audited walk and attack columns from real monster states', () => {
    const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
    expect(scene).toContain('start: row * 8, end: row * 8 + 3');
    expect(scene).toContain('start: row * 8 + 4, end: row * 8 + 7');
    expect(scene).toContain("presentation.motion === 'attack'");
    expect(scene).toContain('this.playMonsterAttackMotion(view, monster)');
    expect(scene).toContain('.setOrigin(0.5, 0.97)');
    expect(scene).toContain("playtestParams.get('enemy')");
    expect(scene).toContain('this.simulation.prepareMonsterForPlaytest(');
  });

  it('leaves the normalized fleet unchanged on a second dry run', () => {
    const result = spawnSync('python3', ['scripts/normalize_monster_atlas_fleet.py'], {
      cwd: new URL('../../../', import.meta.url),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('active atlases=61 changed files=0 normalized frames=0');
  }, 20_000);
});
