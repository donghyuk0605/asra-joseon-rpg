import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('monster AI presentation', () => {
  it('keeps authored walk and attack columns connected to the 8-column atlas', () => {
    expect(sceneSource).toContain(
      'start: row * 8, end: row * 8 + 3',
    );
    expect(sceneSource).toContain(
      'start: row * 8 + 4, end: row * 8 + 7',
    );
    expect(sceneSource).toContain('.setOrigin(0.5, 0.97)');
    expect(sceneSource).toContain(".play(`monster-attack-${monster.kind}-${direction.row}`, true)");
  });

  it('maps locomotion, preparation, attack, stun and death to distinct authored poses', () => {
    expect(sceneSource).toContain(
      "const MONSTER_WALK_STATES: ReadonlySet<MonsterAiState> = new Set([",
    );
    expect(sceneSource).toContain(
      "if (!alive) return { motion: 'death', cue: 'none', poseColumn: 3 }",
    );
    expect(sceneSource).toContain(
      "return { motion: 'stunned', cue: 'stunned', poseColumn: 3 }",
    );
    expect(sceneSource).toContain(
      "if (state === 'attack') return { motion: 'attack', cue: 'none', poseColumn: 4 }",
    );
    expect(sceneSource).toContain(
      "return { motion: 'prepare', cue: monsterIntentCue(state), poseColumn: 4 }",
    );
    expect(sceneSource).toContain(
      "return { motion: 'walk', cue: monsterIntentCue(state), poseColumn: 0 }",
    );
    expect(sceneSource).toContain('this.showMonsterCorpse(monster, view)');
  });

  it('preserves the planted-foot phase when patrols, chasers and flankers turn', () => {
    expect(sceneSource).toContain('private playMonsterWalkPreservingGait(');
    expect(sceneSource).toContain('const gaitProgress = changingDirection ? view.sprite.anims.getProgress() : 0');
    expect(sceneSource).toContain('if (changingDirection) view.sprite.anims.setProgress(gaitProgress)');
    expect(sceneSource).toContain('this.playMonsterWalkPreservingGait(');
    expect(sceneSource).not.toMatch(/view\.sprite\.(?:setY|setPosition)\([^)]*Math\.sin/);
  });

  it('uses low-cost readable cues for tactical states and combat roles', () => {
    for (const cue of [
      'alert', 'pursue', 'flank', 'telegraph', 'charge',
      'brace', 'rally', 'flee', 'return', 'stunned',
    ]) {
      expect(sceneSource).toContain(`'${cue}'`);
    }
    expect(sceneSource).toContain('private syncMonsterIntentCue(');
    expect(sceneSource).toContain('private monsterRingStyle(');
    expect(sceneSource).toContain("if (role === 'commander')");
    expect(sceneSource).toContain("if (role === 'ranged')");
    expect(sceneSource).toContain("if (role === 'beast')");
    expect(sceneSource).not.toContain('monsterIntentParticle');
  });

  it('lets hit-stun interrupt attacks while keeping the impact flash through hit-stop', () => {
    expect(sceneSource).toContain("if (state === 'stunned' || hitStun > 0)");
    expect(sceneSource).toContain("presentation.motion === 'stunned'");
    expect(sceneSource).toContain('view.hitFlashUntil = Math.max(');
    expect(sceneSource).toContain('if (this.time.now < view.hitFlashUntil) view.sprite.setTintFill(0xfff1d1)');
    expect(sceneSource).toContain('view.hitFlashUntil = 0');
  });
});
