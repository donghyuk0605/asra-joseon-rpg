import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('HUD pointer safety', () => {
  const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

  it('never lets closed full-screen menus intercept world clicks', () => {
    expect(styles).toContain('#hud .skill-tree-backdrop');
    expect(styles).toMatch(/#hud \.skill-tree-backdrop[^}]*pointer-events:\s*none/s);
    expect(styles).toContain('#hud .skill-tree-panel:not(.is-open) *');
    expect(styles).toContain('#hud .inventory-panel:not(.is-open) *');
    expect(styles).toContain('#hud .shop-panel:not(.is-open) *');
    expect(styles).toContain('#hud .story-journal-panel:not(.is-open) *');
    expect(styles).toMatch(/#hud \.shop-backdrop[^}]*pointer-events:\s*none\s*!important/s);
    expect(styles).toMatch(/\.skill-tree-panel:not\(\.is-open\)[\s\S]*pointer-events:\s*none\s*!important/);
  });
});
