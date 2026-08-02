import { REGIONS, type RegionId } from '../game/world/regions';
import type { GuideCharacterId } from './GuideBoard';

export interface GuideGameProfile {
  characterId: Exclude<GuideCharacterId, 'none' | 'travel'>;
  regionId: RegionId;
  regionName: string;
  level: number;
  savedAt: number;
}

export interface GuideProfileStorage {
  getItem(key: string): string | null;
}

type SaveSlot = {
  key: string;
  characterId: GuideGameProfile['characterId'];
};

export const GUIDE_GAME_SAVE_SLOTS: readonly SaveSlot[] = [
  { key: 'asra-single-save-v1', characterId: 'kim-donghyeok' },
  { key: 'asra-frontier-archer-save-v1', characterId: 'frontier-archer' },
  { key: 'asra-osaka-mudang-save-v1', characterId: 'osaka-mudang' },
  { key: 'asra-gwanghae-prince-save-v1', characterId: 'gwanghae-prince' },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRegionId = (value: unknown): value is RegionId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(REGIONS, value);

const parseSlot = (
  serialized: string | null,
  characterId: GuideGameProfile['characterId'],
): GuideGameProfile | null => {
  if (!serialized) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(serialized) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(raw) || raw.version !== 1 || !isRegionId(raw.region)) return null;
  if (!Number.isFinite(raw.savedAt) || (raw.savedAt as number) <= 0) return null;
  if (!isRecord(raw.player) || !Number.isFinite(raw.player.level)) return null;

  const level = Math.floor(raw.player.level as number);
  if (level < 1 || level > 999) return null;

  return {
    characterId,
    regionId: raw.region,
    regionName: REGIONS[raw.region].name,
    level,
    savedAt: Math.floor(raw.savedAt as number),
  };
};

const resolveStorage = (
  storage: GuideProfileStorage | null | undefined,
): GuideProfileStorage | null => {
  if (storage !== undefined) return storage;
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
};

export const readGuideGameProfiles = (
  storage?: GuideProfileStorage | null,
): readonly GuideGameProfile[] => {
  const target = resolveStorage(storage);
  if (!target) return [];

  return GUIDE_GAME_SAVE_SLOTS.flatMap((slot) => {
    try {
      const profile = parseSlot(target.getItem(slot.key), slot.characterId);
      return profile ? [profile] : [];
    } catch {
      return [];
    }
  }).sort((left, right) => right.savedAt - left.savedAt);
};

export const readLatestGuideGameProfile = (
  storage?: GuideProfileStorage | null,
): GuideGameProfile | null => readGuideGameProfiles(storage)[0] ?? null;
