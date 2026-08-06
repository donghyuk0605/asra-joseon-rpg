import { describe, expect, it } from 'vitest';
import {
  readGuideGameProfiles,
  readLatestGuideGameProfile,
  type GuideProfileStorage,
} from './GuideGameProfile';

class MemoryStorage implements GuideProfileStorage {
  constructor(private readonly values: Record<string, string>) {}

  getItem(key: string): string | null {
    return this.values[key] ?? null;
  }
}

const snapshot = (savedAt: number, region: string, level: number): string => JSON.stringify({
  version: 1,
  savedAt,
  region,
  player: { level },
  __saveMeta: { writerId: 'never-exposed', revision: 9 },
});

describe('guide game profile bridge', () => {
  it('reads all valid same-origin saves and selects the newest profile', () => {
    const storage = new MemoryStorage({
      'asra-single-save-v1': snapshot(100, 'ulleungdo', 4),
      'asra-osaka-mudang-save-v1': snapshot(300, 'osaka', 12),
      'asra-frontier-archer-save-v1': snapshot(200, 'jurchenvillage', 8),
    });

    const profiles = readGuideGameProfiles(storage);
    expect(profiles.map((profile) => profile.characterId)).toEqual([
      'osaka-mudang',
      'frontier-archer',
      'kim-donghyeok',
    ]);
    expect(profiles[0]).toEqual({
      characterId: 'osaka-mudang',
      regionId: 'osaka',
      regionName: '오사카 외항 포로촌',
      level: 12,
      savedAt: 300,
    });
    expect(readLatestGuideGameProfile(storage)).toEqual(profiles[0]);
    expect(JSON.stringify(profiles)).not.toContain('writerId');
  });

  it.each([
    '{broken',
    JSON.stringify({ version: 2, savedAt: 1, region: 'osaka', player: { level: 1 } }),
    snapshot(0, 'osaka', 1),
    snapshot(1, 'not-a-region', 1),
    snapshot(1, 'osaka', 0),
  ])('ignores malformed or unsupported snapshots', (value) => {
    const storage = new MemoryStorage({ 'asra-single-save-v1': value });
    expect(readGuideGameProfiles(storage)).toEqual([]);
  });

  it('does not throw when storage access is denied', () => {
    const storage: GuideProfileStorage = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(readGuideGameProfiles(storage)).toEqual([]);
    expect(readGuideGameProfiles(null)).toEqual([]);
  });
});
