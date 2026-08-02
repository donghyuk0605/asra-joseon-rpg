import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_STRUCTURE_COLLIDERS,
  campaignStructureCollidersForRegion,
  localPointOverlapsCampaignStructure,
  type CampaignStructureRegion,
} from './campaignStructures';

const REGIONS: readonly CampaignStructureRegion[] = [
  'busanjin',
  'gyeongbokgate',
  'gyeongbokcourt',
  'gyeongbokinner',
  'pyongyangouter',
  'pyongyanggate',
  'pyongyanginner',
  'namhansanseong',
  'ganghwado',
];

describe('campaign building object footprints', () => {
  it('gives every palace and Pyongyang map named solid structures', () => {
    expect(new Set(CAMPAIGN_STRUCTURE_COLLIDERS.map((structure) => structure.id)).size)
      .toBe(CAMPAIGN_STRUCTURE_COLLIDERS.length);

    for (const region of REGIONS) {
      const structures = campaignStructureCollidersForRegion(region);
      expect(structures.length, region).toBeGreaterThanOrEqual(8);
      expect(structures.every((structure) => structure.label.length >= 4), region).toBe(true);
    }
  });

  it('keeps a player-width axial route open through every court and fortress', () => {
    for (const region of REGIONS) {
      const structures = campaignStructureCollidersForRegion(region);
      for (const y of [58, 170, 300, 470, 650, 790, 960]) {
        const blocked = structures.some((structure) => (
          localPointOverlapsCampaignStructure(structure, { x: 768, y }, 20)
        ));
        expect(blocked, `${region} center road at y=${y}`).toBe(false);
      }
    }
  });

  it('keeps the full 320px refuge assault corridor open for a moving unit', () => {
    for (const region of ['namhansanseong', 'ganghwado'] as const) {
      const structures = campaignStructureCollidersForRegion(region);
      for (const x of [608, 768, 928]) {
        for (let y = 32; y < 1024; y += 32) {
          const blocked = structures.some((structure) => (
            localPointOverlapsCampaignStructure(structure, { x, y }, 12)
          ));
          expect(blocked, `${region} corridor at ${x},${y}`).toBe(false);
        }
      }
    }
  });

  it("keeps Busanjin's full north-south gate road open while blocking both shoulders", () => {
    const structures = campaignStructureCollidersForRegion('busanjin');
    for (const x of [610, 768, 926]) {
      for (let y = 24; y < 1024; y += 32) {
        const blocked = structures.some((structure) => (
          localPointOverlapsCampaignStructure(structure, { x, y }, 20)
        ));
        expect(blocked, `busanjin road at ${x},${y}`).toBe(false);
      }
    }
    expect(structures.some((structure) => (
      localPointOverlapsCampaignStructure(structure, { x: 550, y: 650 }, 20)
    ))).toBe(true);
    expect(structures.some((structure) => (
      localPointOverlapsCampaignStructure(structure, { x: 986, y: 650 }, 20)
    ))).toBe(true);
  });

  it('blocks representative walls, halls, houses, towers and gates', () => {
    for (const kind of ['wall', 'gate', 'hall', 'house', 'tower', 'barricade'] as const) {
      const structure = CAMPAIGN_STRUCTURE_COLLIDERS.find((entry) => entry.kind === kind);
      expect(structure, kind).toBeDefined();
      expect(localPointOverlapsCampaignStructure(structure!, {
        x: structure!.x,
        y: structure!.y,
      }, 20), kind).toBe(true);
    }
  });
});
