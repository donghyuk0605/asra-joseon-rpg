import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { campaignBossPhase, isCampaignBossMonster, monsterIntentLabel, monsterRoleLabel } from './Hud';

describe('HUD combat readability', () => {
  it('labels Ulleung wildlife and government enemies by their actual role', () => {
    expect(monsterRoleLabel('ulleung-hare')).toBe('동물 · 겁 많은 산토끼');
    expect(monsterRoleLabel('ulleung-water-deer')).toBe('동물 · 온순한 물사슴');
    expect(monsterRoleLabel('ulleung-sangun')).toBe('맹수 · 산군');
    expect(monsterRoleLabel('ulleung-veteran')).toBe('관군 · 장창 포졸');
    expect(monsterRoleLabel('ulleung-archer')).toBe('관군 · 관아 궁수');
    expect(monsterRoleLabel('ulleung-captain')).toBe('관군 · 포도대장');
    expect(monsterRoleLabel('ulleung-magistrate')).toBe('관아 수뇌 · 탐관오리');
  });

  it('describes timid-animal flight and tiger pounce without generic soldier wording', () => {
    expect(monsterIntentLabel('ulleung-water-deer', 'chase')).toContain('달아나는');
    expect(monsterIntentLabel('ulleung-sangun', 'telegraph')).toContain('도약 준비');
    expect(monsterIntentLabel('ulleung-guard', 'rally')).toContain('병력을 집결');
  });

  it('gives the Osaka story its own enemies and weapon-free shaman hotbar', () => {
    expect(monsterRoleLabel('osaka-overseer')).toBe('오사카 포로촌 · 감시역');
    expect(monsterRoleLabel('osaka-gunner')).toContain('조총');
    const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
    expect(hud).toContain('SHAMAN_ACTIVE_SKILL_IDS');
    expect(hud).toContain("const osakaMudang = origin === 'osaka-mudang'");
    expect(hud).toContain(': osakaMudang;');
    expect(styles).toContain('#hud.is-osaka-mudang .shaman-discipline');
  });

  it('presents the Japanese shogun as a two-phase campaign boss', () => {
    expect(isCampaignBossMonster('japanese-shogun')).toBe(true);
    expect(isCampaignBossMonster('japanese-general')).toBe(false);
    expect(campaignBossPhase({ kind: 'japanese-shogun', hp: 1080, maxHp: 1080 })).toBe(1);
    expect(campaignBossPhase({ kind: 'japanese-shogun', hp: 540, maxHp: 1080 })).toBe(2);
  });

  it('visually locks each martial skill for the wrong weapon class', () => {
    const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
    expect(hud).toContain("definition.requiredWeapon === 'bow' ? weapon?.weaponClass === 'bow' : weapon?.weaponClass !== 'bow'");
    expect(hud).toContain("button?.classList.toggle('is-weapon-locked', !correctWeapon || !unlocked)");
    expect(hud).toContain('button.disabled = !correctWeapon || !unlocked || cooldown > 0');
    expect(styles).toContain('content: "무기 필요"');
  });

  it('expands combat information only when a target or party needs attention', () => {
    const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
    expect(hud).toContain("this.root.classList.toggle('has-combat-target', combatEngaged)");
    expect(hud).toContain("this.root.classList.remove('has-combat-target')");
    expect(hud).toContain("followerHud?.classList.toggle('is-empty', snapshot.followers.length === 0 && armyStatus === null)");
    expect(styles).toContain('#hud.has-combat-target .chat-box');
    expect(styles).toContain('.follower-roster-hud.is-empty');
  });

  it('marks learned and mastered skill-tree nodes with a visible legend', () => {
    const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
    expect(hud).toContain('class="skill-tree-legend"');
    expect(hud).toContain('node.dataset.skillRank = String(rank)');
    expect(styles).toContain('.skill-node.is-unlocked::before');
    expect(styles).toContain('.skill-node.is-mastered::before');
  });
});
