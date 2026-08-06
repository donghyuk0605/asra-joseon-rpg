import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from './catalog';

const NEW_REGION_ITEM_IDS = [
  'bear-claw-gauntlet',
  'chiaksan-claw-knife',
  'haetae-ward-charm',
  'gangneung-sea-bow',
  'coastal-scout-coat',
  'crane-feather-talisman',
  'haeju-reed-cape',
  'saltfield-ritual-knife',
  'sea-salt-amulet',
  'geoje-anchor-hwando',
  'pine-resin-torch',
  'naval-signal-seal',
  'crane-quill-bundle',
  'salt-crystal-bundle',
] as const;

describe('new regional item icon catalog', () => {
  it('ships a distinct transparent PNG for every regional item', () => {
    const definitions = NEW_REGION_ITEM_IDS.map((itemId) => ITEM_CATALOG[itemId]);
    const paths = definitions.map((definition) => definition.iconPath);
    const keys = definitions.map((definition) => definition.iconKey);
    const hashes = definitions.map((definition) => {
      const png = readFileSync(new URL(`../../../public${definition.iconPath}`, import.meta.url));
      return createHash('sha256').update(png).digest('hex');
    });

    expect(new Set(paths).size).toBe(NEW_REGION_ITEM_IDS.length);
    expect(new Set(keys).size).toBe(NEW_REGION_ITEM_IDS.length);
    expect(new Set(hashes).size).toBe(NEW_REGION_ITEM_IDS.length);

    for (const definition of definitions) {
      expect(definition.iconKey).toMatch(/-v2$/);
      expect(definition.iconPath).toMatch(/-v2\.png$/);
      const png = readFileSync(new URL(`../../../public${definition.iconPath}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(256);
      expect(png.readUInt32BE(20)).toBe(256);
      expect(png[25]).toBe(6);
    }
  });
});
