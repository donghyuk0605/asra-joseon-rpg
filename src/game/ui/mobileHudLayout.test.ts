import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('mobile combat HUD layout', () => {
  const styles = readFileSync('src/styles.css', 'utf8');
  const html = readFileSync('index.html', 'utf8');

  it('honors phone safe areas and disables browser gestures over the canvas', () => {
    expect(html).toContain('viewport-fit=cover');
    expect(styles).toMatch(/canvas \{[^}]*touch-action:\s*none/s);
    expect(styles).toContain('env(safe-area-inset-bottom)');
  });

  it('keeps five combat actions in the thumb dock and moves secondary menus away from it', () => {
    expect(styles).toMatch(/\.bottom-dock \.action-deck[\s\S]*width:\s*min\(278px/);
    expect(styles).toMatch(/\.hotbar \.hot-slot\.active,[\s\S]*display:\s*none/);
    expect(styles).toMatch(/\.menu-seal \{[\s\S]*position:\s*fixed/);
    expect(styles).toMatch(/\.quest-chip \{[\s\S]*width:\s*124px/);
  });

  it('hides technical save-provider notices and keeps training progress readable on phones', () => {
    expect(styles).toMatch(/@media \(max-width:\s*700px\)[\s\S]*\.save-presence \{\s*display:\s*none !important;/);
    expect(styles).toMatch(/\.bottom-xp \{[\s\S]*height:\s*14px;[\s\S]*min-height:\s*14px;/);
    expect(styles).toMatch(/\.bottom-xp b \{[\s\S]*display:\s*grid;[\s\S]*font:\s*700 8px/);
    expect(styles).toContain('.player-panel .bar.xp { display: none; }');

    const hud = readFileSync('src/game/ui/Hud.ts', 'utf8');
    expect(hud).toContain('`수련 ${player.xp} / ${player.xpToNext}`');
  });

  it('uses a short compact region banner instead of covering the mobile playfield', () => {
    const scene = readFileSync('src/game/phaser/HuntingScene.ts', 'utf8');
    expect(scene).toContain('this.scale.gameSize.width <= 600');
    expect(scene).toContain('compact ? 104');
    expect(scene).toContain('.setFontSize(compact ? 17 : 25)');
  });

  it('keeps a compact story objective visible in portrait and edge-mounts landscape controls', () => {
    expect(styles).toMatch(/max-width:\s*700px\)[\s\S]*orientation:\s*portrait[\s\S]*\.quest-chip\s*\{[\s\S]*width:\s*min\(232px,[\s\S]*height:\s*42px;[\s\S]*display:\s*grid/);
    expect(styles).toMatch(/\.quest-chip \.quest-mark,[\s\S]*\.quest-chip small\s*\{\s*display:\s*none/);
    expect(styles).toMatch(/\.momentum-hud\s*\{\s*display:\s*none/);
    expect(styles).toMatch(/orientation:\s*landscape[\s\S]*\.bottom-dock \.action-deck\s*\{[\s\S]*right:\s*max\(8px/);
    expect(styles).toMatch(/\.menu-seal\.skill-seal\s*\{[\s\S]*left:\s*calc\(max\(8px/);
  });

  it('collapses unavailable field-army controls instead of covering the phone playfield', () => {
    expect(styles).toMatch(/@media \(max-width:\s*700px\)[\s\S]*\.hajin-army-command > button:disabled \{ display:\s*none;/);
    expect(styles).toMatch(/\.hajin-army-command > button:not\(:disabled\) small \{ display:\s*none;/);
  });
});
