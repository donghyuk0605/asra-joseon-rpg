import { describe, expect, it, vi } from 'vitest';
import { getLocalOnlineIdentity } from './OnlineIdentity';

describe('online session identity fallback', () => {
  it('keeps one isolated demo identity for the current tab', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    } as unknown as Storage;

    const first = getLocalOnlineIdentity(storage);
    const second = getLocalOnlineIdentity(storage);

    expect(first.source).toBe('local-demo');
    expect(first.uid).toMatch(/^demo-/);
    expect(second).toEqual(first);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
});
