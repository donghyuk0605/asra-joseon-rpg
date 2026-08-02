import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';

describe('dungeon prop image atlases', () => {
  it('uses dedicated PNG atlas assets for dungeon signs, stairs and warning markers', () => {
    expect(ASSETS.dungeonProps).toEqual({
      key: 'dungeon-prop-atlas-v1',
      path: '/assets/environment/props/dungeon-prop-atlas-v1.png',
    });
    expect(ASSETS.dungeonTelegraphs).toEqual({
      key: 'dungeon-telegraph-atlas-v1',
      path: '/assets/fx/dungeon-telegraph-atlas-v1.png',
    });
    expect(ASSETS.dungeonWalls).toEqual({
      key: 'dungeon-wall-atlas-v1',
      path: '/assets/environment/props/dungeon-wall-atlas-v1.png',
    });

    const result = spawnSync('python3', ['scripts/validate_dungeon_prop_assets.py'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Dungeon prop, wall and telegraph image atlases');
  }, 20_000);

  it('renders dungeon walls from the atlas instead of rectangle placeholders', () => {
    const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
    const wallBranch = scene.slice(
      scene.indexOf("if (feature.kind === 'wall')"),
      scene.indexOf("} else if (feature.kind === 'pillar')"),
    );
    expect(wallBranch).toContain('ASSETS.dungeonWalls.key');
    expect(wallBranch).not.toContain('this.add.rectangle');
  });
});
