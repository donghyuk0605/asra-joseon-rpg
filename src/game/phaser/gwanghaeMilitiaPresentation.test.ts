import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import sceneSource from './HuntingScene.ts?raw';
import hudSource from '../ui/Hud.ts?raw';
import simulationSource from '../simulation/GameSimulation.ts?raw';

const stylesSource = readFileSync('src/styles.css', 'utf8');

describe('Gwanghae militia presentation', () => {
  it('turns the seven town contacts into explicit clickable recruitment objectives', () => {
    expect(sceneSource).toContain("isGwanghaeMilitiaRallyNpc(npc.id)");
    expect(sceneSource).toContain('this.simulation.rallyGwanghaeMilitia(npc.id)');
    expect(sceneSource).toContain('◆ 의병 모집');
    expect(sceneSource).toContain('✓ 의병 규합 완료');
    expect(sceneSource).toContain('◇ 분조 명부 필요');
    expect(sceneSource).toContain('rallyPriority(left.id) - rallyPriority(right.id)');
    expect(sceneSource).toContain('◆ ${npcName} 클릭 · 의병 규합');
    expect(hudSource).toContain('현재 전투 예비병');
  });

  it('turns rallied reserves into a callable ten-soldier Gwanghae field army', () => {
    expect(hudSource).toContain('data-id="field-army-command"');
    expect(hudSource).toContain("this.text('army-heading', '광해 분조군')");
    expect(hudSource).toContain("this.text('army-progress-label', '의병 규합')");
    expect(hudSource).toContain('`의병 ${snapshot.gwanghaeArmy.waveSize}명 호출`');
    expect(hudSource).toContain('snapshot.gwanghaeArmy.reserveCapacity.toLocaleString');
    expect(sceneSource).toContain('onCallReinforcements: () => this.simulation.isGwanghaePrince()');
    expect(sceneSource).toContain('? this.simulation.callGwanghaeReinforcements()');
    expect(simulationSource).toContain('const GWANGHAE_REINFORCEMENT_WAVE = 10;');
    expect(simulationSource).toContain("route: 'bunjo'");
    expect(simulationSource).toContain("type: 'gwanghae-reinforcements-called'");
    expect(hudSource).toContain('분조군 ${event.deployed}명 출진');
  });

  it('shows the remaining royalist or militia force in the shared command panel', () => {
    expect(hudSource).toContain('data-id="army-opponent"');
    expect(hudSource).toContain("snapshot.gwanghaeArmy.path === 'coup' ? '왕당군 잔존' : '삼남 의병 잔존'");
    expect(hudSource).toContain('`${snapshot.gwanghaeArmy.enemyRemaining} / ${snapshot.gwanghaeArmy.enemyTotal}`');
    expect(hudSource).toContain(
      '`현장 ${snapshot.gwanghaeArmy.enemyFielded} · 투입 중 ${snapshot.gwanghaeArmy.enemyPending} · 예비 ${snapshot.gwanghaeArmy.enemyReserve}`',
    );
    expect(sceneSource).toContain("event.type === 'gwanghae-enemy-reinforcement'");
    expect(sceneSource).toContain('적 잔존 ${event.remaining}명 · 예비 ${event.reserve}명');
  });

  it('keeps the army command tappable and compact on mobile portrait and landscape', () => {
    const commandStylesStart = stylesSource.indexOf('.hajin-army-command > button {');
    const portraitStart = stylesSource.indexOf('@media (max-width: 700px)', commandStylesStart);
    const landscapeStart = stylesSource.indexOf(
      '@media (max-width: 900px) and (max-height: 540px) and (orientation: landscape)',
      portraitStart,
    );
    const landscapeEnd = stylesSource.indexOf('/* Inventory seal:', landscapeStart);
    expect(portraitStart).toBeGreaterThan(-1);
    expect(landscapeStart).toBeGreaterThan(portraitStart);
    expect(landscapeEnd).toBeGreaterThan(landscapeStart);

    const portraitStyles = stylesSource.slice(portraitStart, landscapeStart);
    const landscapeStyles = stylesSource.slice(landscapeStart, landscapeEnd);
    expect(portraitStyles).toContain('.follower-roster-hud.has-field-army { width: min(184px, calc(100vw - 14px)); }');
    expect(portraitStyles).toContain('.follower-roster-hud.has-field-army > [data-id="follower-roster"] { display: none; }');
    expect(portraitStyles).toMatch(/\.hajin-army-command > button \{[^}]*min-height:\s*44px;/s);
    expect(landscapeStyles).toContain('.follower-roster-hud.has-field-army {');
    expect(landscapeStyles).toContain('top: 62px;');
    expect(landscapeStyles).toContain('width: 188px;');
    expect(landscapeStyles).toContain('.field-army-command > button { min-height: 44px; }');
  });

  it('opens a persistent, mobile-friendly coup-versus-suppression decision', () => {
    expect(sceneSource).toContain('private playGwanghaePathChoice(): void');
    expect(sceneSource).toContain('data-gwanghae-path="coup"');
    expect(sceneSource).toContain('data-gwanghae-path="suppression"');
    expect(sceneSource).toContain('쿠데타 · 분조 정변');
    expect(sceneSource).toContain('왕명 · 의병 진압');
    expect(sceneSource).toContain('this.simulation.chooseGwanghaePath(path)');
    expect(sceneSource).toContain("gwanghaePlaytest === 'choice'");
    expect(sceneSource).toContain('this.simulation.completeGwanghaeRalliesForPlaytest()');
    expect(sceneSource).toContain('this.checkpointSinglePlayer()');
    expect(hudSource).toContain("event.type === 'gwanghae-path-chosen'");
    expect(stylesSource).toContain('.gwanghae-path-choice__options');
    expect(stylesSource).toContain('@media (max-width: 650px)');
  });

  it('isolates the path dialog from the HUD and restores focus and DOM state on every close', () => {
    const closeStart = sceneSource.indexOf('private closeGwanghaePathChoice(restoreFocus = true): void');
    const openStart = sceneSource.indexOf('private playGwanghaePathChoice(): void');
    const openEnd = sceneSource.indexOf('private flushEventsAndHud(delta: number): void', openStart);
    expect(closeStart).toBeGreaterThan(-1);
    expect(openStart).toBeGreaterThan(closeStart);
    expect(openEnd).toBeGreaterThan(openStart);
    const closeMethod = sceneSource.slice(closeStart, openStart);
    const openMethod = sceneSource.slice(openStart, openEnd);

    expect(openMethod).toContain('this.gwanghaeChoiceReturnFocus = document.activeElement instanceof HTMLElement');
    expect(openMethod).toContain("hud?.setAttribute('inert', '')");
    expect(openMethod).toContain("hud?.setAttribute('aria-hidden', 'true')");
    expect(openMethod).toContain('choiceButtons[0]?.focus()');
    expect(closeMethod).toContain('this.gwanghaeChoiceDom?.remove()');
    expect(closeMethod).toContain('delete document.body.dataset.gwanghaeChoice');
    expect(closeMethod).toContain("hud?.removeAttribute('inert')");
    expect(closeMethod).toContain("hud?.removeAttribute('aria-hidden')");
    expect(closeMethod).toContain('restoreFocus && returnFocus?.isConnected');
    expect(closeMethod).toContain('requestAnimationFrame(() => returnFocus.focus())');
    expect(sceneSource).toContain('this.closeGwanghaePathChoice(false)');
  });

  it('turns the chosen path into a tracked battle with quest, story, and completion feedback', () => {
    const choiceStart = sceneSource.indexOf('private playGwanghaePathChoice(): void');
    const choiceEnd = sceneSource.indexOf('private flushEventsAndHud(delta: number): void', choiceStart);
    const choiceMethod = sceneSource.slice(choiceStart, choiceEnd);
    const chooseAt = choiceMethod.indexOf('this.simulation.chooseGwanghaePath(path)');
    const battleAt = choiceMethod.indexOf('this.simulation.beginGwanghaePathBattle()');
    const closeAt = choiceMethod.indexOf('this.closeGwanghaePathChoice()');
    expect(chooseAt).toBeGreaterThan(-1);
    expect(battleAt).toBeGreaterThan(chooseAt);
    expect(closeAt).toBeGreaterThan(battleAt);
    expect(choiceMethod).toContain('전투 목표 ${battle.total}명을 제압하십시오.');

    const questStart = sceneSource.indexOf('private resolveQuestProgress(): QuestProgress');
    const storyStart = sceneSource.indexOf('private resolveStoryProgress(): StoryProgress', questStart);
    const animationsStart = sceneSource.indexOf('private createAnimations(): void', storyStart);
    const questMethod = sceneSource.slice(questStart, storyStart);
    const storyMethod = sceneSource.slice(storyStart, animationsStart);
    expect(questMethod).toContain('this.simulation.getGwanghaePathBattleProgress()');
    expect(questMethod).toContain('`${battle.title} · 적 잔존 ${battle.enemyRemaining} / ${battle.total}`');
    expect(questMethod).toContain('battle.total > 0 ? battle.defeated / battle.total : 0');
    expect(storyMethod).toContain('this.simulation.getGwanghaePathBattleProgress()');
    expect(storyMethod).toContain('pathBattle.complete');
    expect(storyMethod).toContain('광화문을 지키는 선조 친위 내금위를 제압하십시오.');
    expect(storyMethod).toContain('전주 들판에서 해산을 거부한 삼남 의병을 진압하십시오.');

    expect(sceneSource).toContain("'gwanghae-path-battle-cleared',");
    expect(sceneSource).toContain("event.type === 'gwanghae-path-battle-cleared'");
    expect(hudSource).toContain("event.type === 'gwanghae-path-battle-started'");
    expect(hudSource).toContain("event.type === 'gwanghae-path-battle-cleared'");
    expect(hudSource).toContain("snapshot.storyProgress.objective.includes('선조 친위 내금위')");
    expect(hudSource).toContain("snapshot.storyProgress.objective.includes('삼남 의병')");
    expect(hudSource).toContain("'광해 갈림길 · 분조 쿠데타'");
    expect(hudSource).toContain("'광해 갈림길 · 왕명 집행'");
    expect(hudSource).toContain('MISSION CLEAR · ${event.title} · ${event.defeated}명 제압');
    expect(hudSource).toContain('전공 보상 · ${event.rewardGold}전 · 경험 ${event.rewardXp}');
  });
});
