import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('opening prologue', () => {
  it('starts with an animated legendary swordsman battle and returns control to Kim Donghyeok', () => {
    expect(sceneSource).toContain('playOpeningPrologue');
    expect(sceneSource).toContain('REGION_ORIGINS.ulleungvillage');
    expect(sceneSource).toContain('울릉 관청 · 형벌 마당');
    expect(sceneSource).toContain('김무혁 · 전설의 검사');
    expect(sceneSource).toContain("play('npc-attack-fully-equipped-2'");
    expect(sceneSource).toContain("play('monster-attack-ulleung-executioner-2'");
    expect(sceneSource).toContain('탐관오리 서병관');
    expect(sceneSource).toContain('bloodBurst(brother, 14)');
    expect(sceneSource).toContain('finishOpeningPrologue');
    expect(sceneSource).toContain('const prologueReadingPace = 1.85');
    expect(sceneSource).toContain('형님, 잘 가십시오. 그 뜻은 제가 잇겠습니다.');
    expect(sceneSource).toContain('startPrisonAmbush');
    expect(sceneSource).toContain("event.cause === 'execution' ? 2800 : 1500");
  });

  it('blocks gameplay input during the cinematic and offers a mobile-friendly skip control', () => {
    expect(sceneSource).toContain('private isGameplayInputLocked(): boolean');
    expect(sceneSource).toContain('if (this.isGameplayInputLocked()) return;');
    expect(sceneSource).toContain("!this.isGameplayInputLocked() && this.gameMode !== 'travel'");
    expect(sceneSource).toContain('opening-cinematic__skip');
    expect(sceneSource).toContain('opening-cinematic__line');
    expect(sceneSource).toContain("classList.add('is-cinematic')");
    expect(sceneSource).toContain("classList.remove('is-cinematic')");
  });

  it('faces Kim Muhyeok toward each enemy before his horizontal sword attacks', () => {
    expect(sceneSource).toContain('const faceActorToward = (actor: PrologueActor, target: PrologueActor)');
    expect(sceneSource).toContain('faceActorToward(brother, guards[0])');
    expect(sceneSource).toContain('faceActorToward(brother, guards[2])');
    expect(sceneSource).toContain('faceActorToward(brother, official)');
  });

  it('keeps Seo Byeonggwan at a human scale instead of enlarging his body for boss status', () => {
    expect(sceneSource).toContain("'ulleung-magistrate': 0.47");
    expect(sceneSource).toContain("ASSETS.monsters['ulleung-magistrate'].key, 16, 0.47");
  });

  it('renders the prison smuggler forge with image parts rather than a visible placeholder oval', () => {
    expect(sceneSource).toContain('const smugglerForge = this.add.image');
    expect(sceneSource).toContain('ASSETS.props.blacksmithWorkstation.key');
    expect(sceneSource).toContain('const smugglerForgeHammer = this.add.image');
    expect(sceneSource).not.toContain(
      'this.add.ellipse(origin.x + 854, origin.y + 770, 66, 42, 0x3e2b1d, 0.66)',
    );
  });
});
