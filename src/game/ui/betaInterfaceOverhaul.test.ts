import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('beta interface reformation', () => {
  const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

  it('groups objectives and the minimap into one collapsible field-intel surface', () => {
    expect(hud).toContain('class="field-intel"');
    expect(hud).toContain('data-action="field-intel-toggle"');
    expect(hud).toContain('private toggleFieldIntel');
    expect(styles).toContain('.field-intel.is-collapsed .field-minimap');
  });

  it('separates combat actions from inventory, martial arts, story and map tools', () => {
    expect(hud).toContain('class="field-tools" aria-label="모험 도구"');
    expect(styles).toMatch(/\.field-tools\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, 48px\)/);
    expect(styles).toContain('.bottom-dock .hotbar .auto-status { display: none; }');
  });

  it('uses an opaque, full-size martial arts workspace with responsive skill routes', () => {
    expect(hud).toContain('id="skill-tree-panel" role="dialog" aria-modal="true"');
    expect(styles).toMatch(/\.skill-tree-panel\s*\{[\s\S]*width:\s*min\(1180px,[\s\S]*height:\s*min\(820px/);
    expect(styles).toContain('grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));');
    expect(styles).toContain('.skill-node[data-skill-tier] { grid-column: auto; }');
  });

  it('collapses field intel and keeps tool buttons thumb-sized on phones', () => {
    expect(styles).toMatch(/@media \(max-width:\s*700px\)[\s\S]*\.field-intel \.field-minimap \{ display:\s*none;/);
    expect(styles).toMatch(/\.field-tools\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, 40px\)/);
    expect(styles).toContain('height: 100dvh;');
  });
});
