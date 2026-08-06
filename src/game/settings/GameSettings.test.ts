import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_SETTINGS,
  GAME_SETTINGS_STORAGE_KEY,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from './GameSettings';

describe('game settings', () => {
  it('uses safe commercial defaults when no saved options exist', () => {
    expect(loadGameSettings({ getItem: () => null })).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it('sanitizes corrupt or unsupported saved values', () => {
    const storage = {
      getItem: () => JSON.stringify({ graphicsQuality: 'ultra', cameraShake: false, damageNumbers: 'yes' }),
    };
    expect(loadGameSettings(storage)).toEqual({
      ...DEFAULT_GAME_SETTINGS,
      cameraShake: false,
    });
  });

  it('persists all options under one versioned key', () => {
    let savedKey = '';
    let savedValue = '';
    const settings: GameSettings = {
      graphicsQuality: 'performance',
      cameraShake: false,
      damageNumbers: false,
      vibration: false,
      reducedMotion: true,
    };
    saveGameSettings(settings, {
      setItem: (key, value) => {
        savedKey = key;
        savedValue = value;
      },
    });
    expect(savedKey).toBe(GAME_SETTINGS_STORAGE_KEY);
    expect(JSON.parse(savedValue)).toEqual(settings);
  });
});
