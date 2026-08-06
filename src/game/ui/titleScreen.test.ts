import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Asra title screen', () => {
  const html = readFileSync('index.html', 'utf8');
  const main = readFileSync('src/main.ts', 'utf8');
  const scene = readFileSync('src/game/phaser/HuntingScene.ts', 'utf8');
  const styles = readFileSync('src/styles.css', 'utf8');

  it('uses the new title and generated historical key art across boot and menu', () => {
    expect(html).toContain('<title>아스라 — 조선 다크 판타지</title>');
    expect(html).toContain('id="title-screen"');
    expect(html).toContain('/assets/ui/asra-title-keyart-v1.webp');
    expect(styles).toContain('/assets/ui/asra-title-keyart-mobile-v1.webp');
    expect(html).toContain('<h1>아스라</h1>');
  });

  it('offers four isolated campaigns with new and continue actions', () => {
    expect(html).toContain('data-title-action="story"');
    expect(html).toContain('data-title-action="kim-new"');
    expect(html).toContain('data-title-action="kim-continue"');
    expect(html).toContain('data-title-action="archer-new"');
    expect(html).toContain('data-title-action="archer-continue"');
    expect(html).toContain('data-title-action="mudang-new"');
    expect(html).toContain('data-title-action="mudang-continue"');
    expect(html).toContain('data-title-action="gwanghae-new"');
    expect(html).toContain('data-title-action="gwanghae-continue"');
    expect(html).toContain('data-save-status="kim"');
    expect(html).toContain('data-save-status="archer"');
    expect(html).toContain('data-save-status="mudang"');
    expect(html).toContain('data-save-status="gwanghae"');
    expect(html).toContain('조선 대동 농민군');
    expect(html).toContain('예비병 호출 0명');
    expect(html).toContain('피로인 쇄환선단');
    expect(html).toContain('조선인 피로인 무당 연화');
    expect(html).toContain('선조가 임금으로 재위한 전란기');
    expect(html).toContain('조선 왕세자 · 분조 총책');
    expect(html).toContain('<h2>왕세자 광해</h2>');
    expect(html).toContain('/assets/ui/gwanghae-crown-prince-portrait-v1.webp');
    expect(html).toContain('data-title-action="online"');
    expect(html).toContain('data-title-action="online-connect"');
    expect(html).toContain('data-title-action="mute"');
    expect(html).toContain('data-title-action="fullscreen"');
    expect(main).toContain("scene.startNewStoryMode()");
    expect(main).toContain("scene.startStoryMode()");
    expect(main).toContain("scene.startFrontierArcherStory()");
    expect(main).toContain("scene.continueFrontierArcherStory()");
    expect(main).toContain("scene.startGwanghaeStory()");
    expect(main).toContain("scene.continueGwanghaeStory()");
    expect(main).toContain("scene.startOnlineMode(");
    expect(html).toContain('data-title-action="travel"');
    expect(html).toContain('<strong>여행 모드</strong>');
    expect(html).not.toContain('바로 시작');
    expect(html).not.toContain('data-title-action="hunt"');
    expect(main).toContain("scene.startTravelMode()");
    expect(scene).toContain('this.hud.toggleWorldMap(true)');
    expect(main).toContain('document.documentElement.requestFullscreen');
    expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(styles).toContain('.story-character--gwanghae');
  });

  it('renders each local save as a compact expedition record instead of level and date only', () => {
    expect(main).toContain("import { REGIONS, type RegionId } from './game/world/regions'");
    expect(main).toContain('Object.prototype.hasOwnProperty.call(REGIONS, value)');
    expect(main).toContain('snapshot.__saveMeta');
    expect(main).toContain('기기 저장 · 구름 대기');
    expect(main).toContain('기기·구름 ${revision}차 동기화');
    expect(main).toContain('생명 ${number(hp)}/${number(maxHp)}');
    expect(main).toContain('경험 ${number(xp)}/${number(xpToNext)}');
    expect(main).toContain('${number(gold)}냥 · ${number(kills)}격파');
    expect(main).toContain('장비 ${equippedCount}/3 · 가방 ${inventoryCount}/20');
    expect(main).toContain('동행 ${followerCount} · 발자취 ${visitedCount}곳');
    expect(main).toContain('describeCampaignProgress(snapshot, key, progress)');
    expect(main).toContain("].join('\\n')");
    expect(main).toContain("element.style.whiteSpace = 'pre-line'");
    expect(main).toContain("element.setAttribute('aria-label', element.title)");
  });

  it('summarizes dungeon and each campaign from the fields already persisted in-game', () => {
    expect(main).toContain('무영광산 ${dungeonFloor}층 원정');
    expect(main).toContain('최종 피난전 완수');
    expect(main).toContain('평양 전선 ${pyongyangCleared}/3 돌파');
    expect(main).toContain('북방 전선 ${jurchenCleared}/6 돌파');
    expect(main).toContain('일본 전선 ${japanCleared}곳 돌파');
    expect(main).toContain('울릉 관아 해방');
    expect(main).toContain('progress.visitedRegions');
    expect(main).toContain('snapshot.followers');
    expect(main).toContain('snapshot.inventory');
    expect(main).toContain('snapshot.equipment');
  });

  it('keeps simulation paused behind the menu and starts the prologue only from story mode', () => {
    expect(scene).toContain('if (!this.gameStarted) return');
    expect(scene).toContain('startStoryMode(): void');
    expect(scene).toContain('this.playOpeningPrologue()');
    expect(styles).toContain('body:not(.game-started) #hud');
  });
});
