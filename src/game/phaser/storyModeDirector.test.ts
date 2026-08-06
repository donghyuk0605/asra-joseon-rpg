import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('playable story mode integration', () => {
  it('opens a chapter curtain only for the four narrative campaigns', () => {
    expect(sceneSource).toContain("this.gameMode === 'story'");
    expect(sceneSource).toContain("this.gameMode === 'archer'");
    expect(sceneSource).toContain("this.gameMode === 'mudang'");
    expect(sceneSource).toContain("this.gameMode === 'gwanghae'");
    expect(sceneSource).toContain('if (!this.storyNarrativeReady || !this.isNarrativeGameMode()');
    expect(sceneSource).toContain('hasSeenStoryBeat(state, beat.id)');
  });

  it('locks simulation input while dialogue is open and restores the field afterwards', () => {
    expect(sceneSource).toContain('this.storyDirector?.isOpen');
    expect(sceneSource).toContain('this.tweens.pauseAll()');
    expect(sceneSource).toContain('this.anims.pauseAll()');
    expect(sceneSource).toContain('this.tweens.resumeAll()');
    expect(sceneSource).toContain('this.storyDirector?.destroy()');
  });

  it('saves chapter memories and keeps old save snapshots compatible', () => {
    expect(sceneSource).toContain('storyState: this.simulation.getStoryCampaignState()');
    expect(sceneSource).toContain('this.simulation.setStoryCampaignState(completeStoryBeat(');
    expect(sceneSource).toContain('private rememberStoryBeat(progress: StoryProgress)');
    expect(sceneSource).toContain('private replayCurrentStoryBeat(): void');
  });
});
