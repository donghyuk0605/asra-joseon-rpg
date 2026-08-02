import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('Gwanghae opening prologue', () => {
  const start = sceneSource.slice(
    sceneSource.indexOf('startGwanghaeStory(): void'),
    sceneSource.indexOf('continueGwanghaeStory(): void'),
  );
  const cinematic = sceneSource.slice(
    sceneSource.indexOf('private playGwanghaeOpeningPrologue(): void'),
    sceneSource.indexOf('private flushEventsAndHud'),
  );

  it('plays only from a new Gwanghae campaign and leaves continue saves alone', () => {
    expect(start).toContain('this.playGwanghaeOpeningPrologue()');
    const resume = sceneSource.slice(
      sceneSource.indexOf('private async resumeGwanghaeOrStartNew'),
      sceneSource.indexOf('private async getSinglePlayerSave'),
    );
    expect(resume).not.toContain('playGwanghaeOpeningPrologue');
    expect(resume).toContain('this.startGwanghaeStory()');
  });

  it('shows Seonjo abandoning the capital and assigning bunjo responsibility to Gwanghae', () => {
    expect(cinematic).toContain('한성 북문 앞 · 선조의 몽진 행렬');
    expect(cinematic).toContain('영변 행재소 · 분조 교서');
    expect(cinematic).toContain('어가는 의주로 향한다');
    expect(cinematic).toContain('의병의 수습까지 모두 네가 맡아라');
    expect(cinematic).toContain("play('monster-walk-joseon-prince-4'");
    expect(cinematic).toContain('전하께서 떠나셔도 조정은 백성 곁에 남아야 한다');
  });

  it('uses manually advanced readable dialogue and fully restores control on finish or skip', () => {
    expect(cinematic).toContain('opening-cinematic__advance');
    expect(cinematic).toContain("addEventListener('click', showStep)");
    expect(cinematic).toContain('this.finishGwanghaeOpeningPrologue()');
    expect(cinematic).toContain("dataset.cinematic = 'none'");
    expect(cinematic).toContain("dataset.inputLocked = 'false'");
    expect(cinematic).toContain('npc.rallyMarker?.setVisible(false)');
    expect(cinematic).toContain('this.syncVillageNpcs(0)');
    expect(cinematic).toContain('this.fitCamera()');
    expect(cinematic).toContain('this.checkpointSinglePlayer()');
  });
});
