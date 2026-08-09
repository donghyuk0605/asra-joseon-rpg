import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SKILL_CATALOG } from '../skills/catalog';

const webpDimensions = (webp: Buffer) => {
  expect(webp.subarray(0, 4).toString()).toBe('RIFF');
  expect(webp.subarray(8, 12).toString()).toBe('WEBP');
  for (let offset = 12; offset + 8 <= webp.length;) {
    const type = webp.subarray(offset, offset + 4).toString('ascii');
    const length = webp.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;
    if (type === 'VP8 ') {
      return {
        width: webp.readUInt16LE(payloadOffset + 6) & 0x3fff,
        height: webp.readUInt16LE(payloadOffset + 8) & 0x3fff,
      };
    }
    if (type === 'VP8X') {
      return {
        width: webp.readUIntLE(payloadOffset + 4, 3) + 1,
        height: webp.readUIntLE(payloadOffset + 7, 3) + 1,
      };
    }
    offset = payloadOffset + length + (length % 2);
  }
  throw new Error('Unsupported WebP payload');
};

describe('beta skill icon image set', () => {
  it('ships eighteen 256px cells in one web-optimized 6x3 atlas', () => {
    const atlas = readFileSync(new URL('../../../public/assets/ui/skills/beta-skill-icon-atlas-v1.webp', import.meta.url));
    expect(webpDimensions(atlas)).toEqual({ width: 256 * 6, height: 256 * 3 });
    expect(atlas.byteLength).toBeGreaterThan(200_000);
    expect(atlas.byteLength).toBeLessThan(1_500_000);
  });

  it('assigns every catalog skill a unique atlas cell without hue-filter reuse', () => {
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
    expect(styles).toContain("url('/assets/ui/skills/beta-skill-icon-atlas-v1.webp')");
    expect(styles).toContain('background-size: 600% 300%');
    const positions = Object.values(SKILL_CATALOG).map((skill) => {
      const rule = styles.match(new RegExp(`\\.${skill.iconClass}\\s*\\{([^}]*)\\}`));
      expect(rule, `${skill.id} must have a CSS icon rule`).not.toBeNull();
      const position = rule?.[1].match(/background-position:\s*([^;]+);/)?.[1].trim();
      expect(position, `${skill.id} must occupy an atlas cell`).toBeTruthy();
      expect(rule?.[1]).not.toMatch(/hue-rotate|sepia|grayscale/);
      return position;
    });
    expect(new Set(positions)).toHaveLength(Object.keys(SKILL_CATALOG).length);
  });
});
