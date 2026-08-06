import { describe, expect, it } from 'vitest';
import { GameSimulation } from './GameSimulation';
import { completeStoryBeat, createStoryBeat } from '../story/StoryCampaign';

describe('GameSimulation story mode save state', () => {
  it('round-trips viewed scenes and narrative choices through the single-player snapshot', () => {
    const game = new GameSimulation();
    const beat = createStoryBeat('kim-donghyeok', {
      chapter: 5,
      completed: 4,
      title: '제5장 · 검은 돛의 침공',
      objective: '왜구 선단을 막으십시오.',
    }, '울릉 관아');
    game.setStoryCampaignState(completeStoryBeat(
      game.getStoryCampaignState(),
      beat,
      beat.choices[0],
    ));

    const snapshot = game.exportSinglePlayerSnapshot();
    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(snapshot)).toBe(true);
    expect(restored.getStoryCampaignState()).toEqual(game.getStoryCampaignState());
  });

  it('resets the chronicle when a different protagonist starts a new campaign', () => {
    const game = new GameSimulation();
    game.startOsakaMudangStory();
    expect(game.getStoryCampaignState().origin).toBe('osaka-mudang');
    expect(game.getStoryCampaignState().memories).toEqual([]);

    game.startFrontierArcherStory();
    expect(game.getStoryCampaignState().origin).toBe('frontier-archer');
    expect(game.getStoryCampaignState().seenBeatIds).toEqual([]);
  });
});
