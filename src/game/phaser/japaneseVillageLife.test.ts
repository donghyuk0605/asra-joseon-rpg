import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('Japanese civilian life', () => {
  it('populates Osaka, Settsu, Sakai, Iki, and Tsushima towns with neutral residents', () => {
    expect(sceneSource).toContain('const osaka = REGION_ORIGINS.osaka');
    expect(sceneSource).toContain('const settsu = REGION_ORIGINS.settsuvillage');
    expect(sceneSource).toContain('const castle = REGION_ORIGINS.osakacastle');
    expect(sceneSource).toContain('const sakai = REGION_ORIGINS.sakaicity');
    expect(sceneSource).toContain('const iki = REGION_ORIGINS.ikiport');
    expect(sceneSource).toContain('const izuhara = REGION_ORIGINS.izuhara');
    for (const residentId of [
      'japan-osaka-fishmonger',
      'japan-osaka-porter',
      'japan-osaka-dyer',
      'japan-osaka-boatman',
      'japan-herbalist',
      'japan-settsu-farmer',
      'japan-settsu-weaver',
      'japan-blacksmith',
      'japan-castle-merchant',
      'japan-castle-refugee',
      'japan-castle-rice-seller',
      'japan-sakai-fish-broker',
      'japan-sakai-rope-maker',
      'japan-sakai-tea-seller',
      'japan-iki-net-mender',
      'japan-iki-salt-porter',
      'japan-iki-shrine-keeper',
      'japan-izuhara-paper-seller',
      'japan-izuhara-boat-carpenter',
      'japan-izuhara-refugee',
    ]) {
      expect(sceneSource).toContain(`id: '${residentId}'`);
    }
  });

  it('uses the dedicated civilian atlas for walking and basket interaction states', () => {
    expect(sceneSource).toContain("type VillageNpcMode = 'armor-only' | 'fully-equipped' | 'guard' | 'commoner' | 'gwanghae' | 'japanese-civilian' | 'oppressed'");
    expect(sceneSource).toContain('ASSETS.japaneseCivilianWoman.key');
    expect(sceneSource).toContain('npc-walk-japanese-civilian-${row}');
    expect(sceneSource).toContain('npc-interact-japanese-civilian-${row}');
    expect(sceneSource).toContain("npc.mode === 'japanese-civilian'");
  });

  it('keeps civilians conversational and out of monster combat catalogs', () => {
    expect(sceneSource).toContain('군사와 백성을 가려 주길 바라요.');
    expect(sceneSource).not.toContain("'japanese-civilian' as MonsterKind");
  });
});
