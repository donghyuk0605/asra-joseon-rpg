import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const scene = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');
const hud = readFileSync(new URL('../ui/Hud.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('proximity context interaction presentation', () => {
  it('approaches distant NPCs and only opens their interaction at usable range', () => {
    expect(scene).toContain('queueVillageNpcInteraction(npc)');
    expect(scene).toContain('NPC_INTERACTION_READY_DISTANCE - 18');
    expect(scene).toContain('this.simulation.beginWorldInteraction()');
    expect(scene).toContain("this.input.keyboard?.on('keydown-F'");
    expect(scene).toContain("get('interactionqa') !== 'npc'");
  });

  it('offers one keyboard and touch prompt for nearby NPCs and ground loot', () => {
    expect(hud).toContain('data-action="context-interact"');
    expect(hud).toContain("kind: 'npc' | 'loot'");
    expect(hud).toContain('document.body.dataset.contextInteractionReady');
    expect(styles).toMatch(/\.context-interaction\.is-visible[\s\S]*pointer-events:\s*auto/);
    expect(styles).toMatch(/@media \(max-width: 700px\)[\s\S]*\.context-interaction/);
  });
});
