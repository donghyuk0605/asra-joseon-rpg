import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('story chronicle', () => {
  const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

  it('tracks the expanded playable campaign chapters instead of showing isolated flavor text', () => {
    expect(hud).toContain('data-id="story-chapters"');
    expect(hud).toContain('STORY_CHAPTERS[origin]');
    expect(hud).toContain('data-story-chapter="${index + 1}"');
    expect(hud).toContain('검은 돛의 침공');
    expect(hud).toContain('본토의 그림자');
    expect(hud).toContain('대동문 공성전');
    expect(hud).toContain('평양 내성 결전');
    expect(scene).toContain('private resolveStoryProgress(): StoryProgress');
    expect(scene).toContain('hasWakoInvasionStarted()');
    expect(scene).toContain("'하진 제9장 · 평양 외성의 서리'");
    expect(scene).toContain("'하진 제10장 · 대동문의 불화살'");
    expect(hud).toContain('STORY_CHAPTERS[snapshot.playerOrigin].length');
    expect(hud).toContain('MUDANG_STORY_CHAPTERS');
    expect(scene).toContain("'연화 제24장 · 망향의 나라'");
    expect(styles).toContain('.story-journal-panel');
    expect(styles).toContain('overflow-y: auto');
  });

  it('gives Crown Prince Gwanghae a separate bunjo chronicle under King Seonjo', () => {
    expect(hud).toContain('GWANGHAE_STORY_CHAPTERS');
    expect(hud).toContain('왕세자의 분조');
    expect(hud).toContain('선조 앞의 장계');
    expect(hud).toContain("snapshot.playerOrigin === 'gwanghae-prince'");
    expect(hud).toContain("journalTitle: '왕세자 광해의 분조국정록'");
    expect(hud).toContain("['왕좌인가 왕명인가'");
    expect(hud).toContain("chapters: '10–11장'");
    expect(hud).toContain("'조선 왕세자 · 분조 지휘'");
    expect(hud).toContain('/assets/ui/gwanghae-crown-prince-portrait-v1.webp');
    expect(hud).toContain('? snapshot.questProgress.label');
    expect(hud).toContain('현재 전투 예비병');
  });

  it('presents all four protagonists as distinct campaigns with live faction context', () => {
    expect(hud).toContain("journalTitle: '김동혁의 대동복수록'");
    expect(hud).toContain("journalTitle: '하진의 남하연맹록'");
    expect(hud).toContain("journalTitle: '연화의 망향원혼록'");
    expect(hud).toContain("journalTitle: '왕세자 광해의 분조국정록'");
    expect(hud).toContain('data-id="story-profile-dilemma"');
    expect(hud).toContain('data-id="story-profile-ending"');
    expect(hud).toContain('data-id="story-war-strength"');
    expect(hud).toContain('snapshot.factionWar.activeConflict.title');
    expect(styles).toContain('.story-profile-themes');
    expect(styles).toContain('.story-acts > div');
  });

  it('opens as a raster-framed journal and cannot intercept play while closed', () => {
    expect(styles).toContain('var(--ui-rpg-window-v3)');
    expect(styles).toContain('#hud .story-journal-panel:not(.is-open) *');
    expect(styles).toMatch(/story-journal-panel:not\(\.is-open\)[\s\S]*pointer-events:\s*none\s*!important/);
  });

  it('keeps the chronicle reachable on phones and from the keyboard', () => {
    expect(hud).toContain('class="menu-seal story-seal"');
    expect(hud).toContain('aria-label="복수록 열기"');
    expect(styles).toContain('.menu-seal.story-seal');
    expect(scene).toContain("keydown-J");
    expect(scene).toContain('this.hud.toggleStoryJournal()');
  });
});
