import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('player walk sprite asset quality', () => {
  it('keeps weapon-equipped walking on the approved alternating base gait', () => {
    const result = spawnSync('python3', ['scripts/validate_player_walk_assets.py'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('approved alternating base gait');
  }, 20_000);
});
