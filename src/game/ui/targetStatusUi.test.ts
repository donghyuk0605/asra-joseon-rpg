import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from '../assets/manifest';
import type { MonsterState } from '../simulation/types';
import { targetStatusEntries } from './Hud';

const elemental = (overrides: Partial<MonsterState['elemental']> = {}): MonsterState['elemental'] => ({
  burnSeconds: 0,
  burnTick: 0,
  burnDamage: 0,
  frostSeconds: 0,
  shockSeconds: 0,
  poisonSeconds: 0,
  poisonTick: 0,
  poisonDamage: 0,
  poisonStacks: 0,
  gustSeconds: 0,
  stoneSeconds: 0,
  shadowSeconds: 0,
  ...overrides,
});

describe('target elemental status UI', () => {
  it('ships a transparent nine-cell status atlas with one reserved cell', () => {
    expect(ASSETS.statusEffects).toEqual({
      key: 'beta-status-effects-v1',
      path: '/assets/ui/beta-status-effects-v1.png',
    });
    const png = readFileSync(new URL(`../../../public${ASSETS.statusEffects.path}`, import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(256 * 3);
    expect(png.readUInt32BE(20)).toBe(256 * 3);
    expect(png[25]).toBe(6);
    expect(statSync(new URL(`../../../public${ASSETS.statusEffects.path}`, import.meta.url)).size)
      .toBeGreaterThan(250_000);
  });

  it('orders active effects by atlas frame and carries poison stacks and remaining time', () => {
    const target = {
      elemental: elemental({ burnSeconds: 3.24, poisonSeconds: 4.8, poisonStacks: 3, shadowSeconds: 1.2 }),
    } as MonsterState;

    expect(targetStatusEntries(target)).toEqual([
      expect.objectContaining({ id: 'burn', label: '화상', frame: 0, seconds: 3.24, stacks: 0 }),
      expect.objectContaining({ id: 'poison', label: '중독', frame: 3, seconds: 4.8, stacks: 3 }),
      expect.objectContaining({ id: 'shadow', label: '암영 표식', frame: 6, seconds: 1.2, stacks: 0 }),
    ]);
  });

  it('renders the live status strip and keeps labels available to assistive technology', () => {
    const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
    expect(hud).toContain('data-id="target-statuses"');
    expect(hud).toContain('aria-label="${status.label} ${remaining}${stackLabel}"');
    expect(hud).toContain('status.stacks > 1 ? `<small>${status.stacks}</small>`');
    expect(styles).toContain('.target-statuses[hidden] { display: none; }');
    expect(styles).toContain('.target-status > i > small {');
    expect(styles).toContain('.target-status > b { display: none; }');
  });
});
