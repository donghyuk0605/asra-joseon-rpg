import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('Joseon settlement and Crown Prince Gwanghae presentation', () => {
  it('renders the authored raster maps and lazy-loads neighboring settlements', () => {
    expect(sceneSource).toContain('private createJoseonTownWorlds(): void');
    expect(sceneSource).toContain('private ensureJoseonTownBackground(');
    expect(sceneSource).toContain('private ensureJoseonTownNeighborhood(region: JoseonTownRegionId): void');
    expect(sceneSource).toContain('this.ensureJoseonTownSeams(region)');
    expect(sceneSource).toContain('private ensureJoseonTownSeams(region: JoseonTownRegionId): void');
    expect(sceneSource).toContain('key: transition.asset.key');
    expect(sceneSource).toContain('span: transition.span');
    expect(sceneSource).toContain("setData('joseonTownBackground', region)");
    expect(sceneSource).toContain('this.ensureJoseonTownNeighborhood(event.region)');
    expect(sceneSource).toContain('ASSETS.transitions.joseonGaeseongChangdeokgung');
    expect(sceneSource).toContain('const subtitleY = layout.subtitleY ?? 78');
    expect(sceneSource).toContain('if (landmark.marker === true)');
    expect(sceneSource).toContain('const labelOffsetY = landmark.marker === true ? -31 : -10');
  });

  it('keeps residents visibly alive through real patrol and interaction animation states', () => {
    expect(sceneSource).toContain("speed: placement.role === 'royal' ? 24 : placement.role === 'guard' ? 34 : 38");
    expect(sceneSource).toContain("role === 'royal' ? 0 : role === 'guard' ? 1 : 2");
    expect(sceneSource).toContain("250 + (this.villageNpcs.length % 5) * 140");
    expect(sceneSource).toContain('villageNpcInteractionAnimation(npc.mode, direction.row)');
    expect(sceneSource).toContain("npc.mode === 'commoner' && npc.service === 'market'");
    expect(sceneSource).toContain("else if (npc.role === 'patrol')");
  });

  it('uses the normalized Crown Prince atlas for NPC audience interaction', () => {
    expect(sceneSource).toContain("placement.role === 'royal'");
    expect(sceneSource).toContain("? 'gwanghae'");
    expect(sceneSource).toContain('ASSETS.gwanghaePrince');
    expect(sceneSource).toContain('npc-audience-gwanghae-${row}');
    expect(sceneSource).not.toContain('npc-action-gwanghae-${row}');
    expect(sceneSource).toContain('const needsGwanghae = this.joseonTownPopulationRequests.has(region)');
    expect(sceneSource).toContain("&& region === 'changdeokgung'");
  });

  it('boots Gwanghae as a selectable Crown Prince with real walk and attack states', () => {
    expect(sceneSource).toContain("const gwanghaeCampaign = document.body.dataset.bootCampaign === 'gwanghae'");
    expect(sceneSource).toContain("gwanghaeCampaign\n        ? 'changdeokgung'");
    expect(sceneSource).toContain('startGwanghaeStory(): void');
    expect(sceneSource).toContain('continueGwanghaeStory(): void');
    expect(sceneSource).toContain('private async resumeGwanghaeOrStartNew(): Promise<void>');
    expect(sceneSource).toContain("new SinglePlayerSave('gwanghae-prince')");
    expect(sceneSource).toContain('player-gwanghae-walk-${row}');
    expect(sceneSource).toContain('player-gwanghae-attack-${row}');
    expect(sceneSource).toContain('this.simulation.isGwanghaePrince()');
  });

  it('does not duplicate the playable prince and keeps Seonjo as reigning king', () => {
    expect(sceneSource).toContain("placement.id !== 'crown-prince-gwanghae'");
    expect(sceneSource).toContain("'선조 · 조선 국왕'");
    expect(sceneSource).toContain('광해는 이 땅에 남아 분조를 이끌라');
    expect(sceneSource).toContain("play('monster-walk-joseon-prince-4'");
    expect(sceneSource).toContain('왕세자 광해의 분조록');
    expect(sceneSource).not.toContain('ASSETS.gwanghaeKing');
  });

  it('keeps one camera strip while crossing all seven Joseon town maps', () => {
    expect(sceneSource).toContain('continuityCameraBoundsForRegion(event.region)');
    expect(sceneSource).toContain('isContinuousWorldNeighbor(previousCameraRegion, event.region)');
    expect(sceneSource).toContain('continuityCameraBoundsForRegion(this.simulation.region)');
    expect(sceneSource).toContain('for (const neighbor of continuityNeighborsForRegion(activeRegion))');
  });
});
