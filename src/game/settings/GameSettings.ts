export type GraphicsQuality = 'high' | 'balanced' | 'performance';

export type GameSettings = {
  graphicsQuality: GraphicsQuality;
  cameraShake: boolean;
  damageNumbers: boolean;
  vibration: boolean;
  reducedMotion: boolean;
};

export const GAME_SETTINGS_STORAGE_KEY = 'asra.game-settings.v1';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  graphicsQuality: 'balanced',
  cameraShake: true,
  damageNumbers: true,
  vibration: true,
  reducedMotion: false,
};

const isQuality = (value: unknown): value is GraphicsQuality =>
  value === 'high' || value === 'balanced' || value === 'performance';

export function loadGameSettings(storage: Pick<Storage, 'getItem'> = window.localStorage): GameSettings {
  try {
    const parsed = JSON.parse(storage.getItem(GAME_SETTINGS_STORAGE_KEY) ?? '{}') as Partial<GameSettings>;
    return {
      graphicsQuality: isQuality(parsed.graphicsQuality) ? parsed.graphicsQuality : DEFAULT_GAME_SETTINGS.graphicsQuality,
      cameraShake: typeof parsed.cameraShake === 'boolean' ? parsed.cameraShake : DEFAULT_GAME_SETTINGS.cameraShake,
      damageNumbers: typeof parsed.damageNumbers === 'boolean' ? parsed.damageNumbers : DEFAULT_GAME_SETTINGS.damageNumbers,
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : DEFAULT_GAME_SETTINGS.vibration,
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : DEFAULT_GAME_SETTINGS.reducedMotion,
    };
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveGameSettings(
  settings: GameSettings,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  try {
    storage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing and embedded webviews can reject storage writes. The
    // active session still keeps the selected options in scene memory.
  }
}
