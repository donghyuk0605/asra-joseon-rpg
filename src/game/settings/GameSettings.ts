export type GraphicsQuality = 'high' | 'balanced' | 'performance';
export type UiScale = 0.9 | 1 | 1.15;

export type GameSettings = {
  graphicsQuality: GraphicsQuality;
  cameraShake: boolean;
  damageNumbers: boolean;
  vibration: boolean;
  reducedMotion: boolean;
  autoLoot: boolean;
  highContrastObjectives: boolean;
  uiScale: UiScale;
};

export const GAME_SETTINGS_STORAGE_KEY = 'asra.game-settings.v1';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  graphicsQuality: 'balanced',
  cameraShake: true,
  damageNumbers: true,
  vibration: true,
  reducedMotion: false,
  autoLoot: true,
  highContrastObjectives: false,
  uiScale: 1,
};

const isQuality = (value: unknown): value is GraphicsQuality =>
  value === 'high' || value === 'balanced' || value === 'performance';

const isUiScale = (value: unknown): value is UiScale => value === 0.9 || value === 1 || value === 1.15;

export function loadGameSettings(storage: Pick<Storage, 'getItem'> = window.localStorage): GameSettings {
  try {
    const parsed = JSON.parse(storage.getItem(GAME_SETTINGS_STORAGE_KEY) ?? '{}') as Partial<GameSettings>;
    return {
      graphicsQuality: isQuality(parsed.graphicsQuality) ? parsed.graphicsQuality : DEFAULT_GAME_SETTINGS.graphicsQuality,
      cameraShake: typeof parsed.cameraShake === 'boolean' ? parsed.cameraShake : DEFAULT_GAME_SETTINGS.cameraShake,
      damageNumbers: typeof parsed.damageNumbers === 'boolean' ? parsed.damageNumbers : DEFAULT_GAME_SETTINGS.damageNumbers,
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : DEFAULT_GAME_SETTINGS.vibration,
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : DEFAULT_GAME_SETTINGS.reducedMotion,
      autoLoot: typeof parsed.autoLoot === 'boolean' ? parsed.autoLoot : DEFAULT_GAME_SETTINGS.autoLoot,
      highContrastObjectives: typeof parsed.highContrastObjectives === 'boolean'
        ? parsed.highContrastObjectives
        : DEFAULT_GAME_SETTINGS.highContrastObjectives,
      uiScale: isUiScale(parsed.uiScale) ? parsed.uiScale : DEFAULT_GAME_SETTINGS.uiScale,
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
