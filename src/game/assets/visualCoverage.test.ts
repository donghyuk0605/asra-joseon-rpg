import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../items/catalog';
import { REGIONS } from '../world/regions';
import { ASSETS } from './manifest';
import {
  ITEM_VISUAL_COVERAGE,
  ITEM_WORLD_VISUAL_GAPS,
  MONSTER_ASSET_REUSE_GROUPS,
  MONSTER_VISUAL_COVERAGE,
  PROP_VISUAL_COVERAGE,
  REGION_VISUAL_COVERAGE,
  VISUAL_COVERAGE_SUMMARY,
} from './visualCoverage';

const publicFile = (assetPath: string): string => resolve(process.cwd(), 'public', assetPath.replace(/^\//, ''));

describe('graphics reformation visual coverage ledger', () => {
  it('classifies every playable region with a real primary visual asset', () => {
    expect(Object.keys(REGIONS)).toHaveLength(81);
    expect(Object.keys(REGION_VISUAL_COVERAGE)).toEqual(Object.keys(REGIONS));
    for (const coverage of Object.values(REGION_VISUAL_COVERAGE)) {
      expect(coverage.primaryAsset.key).not.toBe('');
      expect(existsSync(publicFile(coverage.primaryAsset.path)), coverage.id).toBe(true);
    }
    expect(VISUAL_COVERAGE_SUMMARY.dedicatedRegionBackgrounds
      + VISUAL_COVERAGE_SUMMARY.modularRegionCompositions).toBe(81);
  });

  it('tracks all monster kinds and exposes every shared silhouette group', () => {
    expect(Object.keys(ASSETS.monsters)).toHaveLength(61);
    expect(Object.keys(MONSTER_VISUAL_COVERAGE)).toEqual(Object.keys(ASSETS.monsters));
    expect(MONSTER_ASSET_REUSE_GROUPS.some((group) => group.count >= 5)).toBe(true);
    for (const coverage of Object.values(MONSTER_VISUAL_COVERAGE)) {
      expect(existsSync(publicFile(coverage.asset.path)), coverage.kind).toBe(true);
      expect(coverage.sharedBy).toContain(coverage.kind);
    }
  });

  it('tracks icon, ground-drop reuse and world presentation for all items', () => {
    expect(Object.keys(ITEM_CATALOG)).toHaveLength(60);
    expect(Object.keys(ITEM_VISUAL_COVERAGE)).toEqual(Object.keys(ITEM_CATALOG));
    for (const coverage of Object.values(ITEM_VISUAL_COVERAGE)) {
      expect(existsSync(publicFile(coverage.icon.path)), coverage.id).toBe(true);
      expect(coverage.groundPresentation).toBe('inventory-icon-reuse');
    }
    expect(ITEM_WORLD_VISUAL_GAPS.length).toBe(
      Object.values(ITEM_VISUAL_COVERAGE).filter((item) => item.worldPresentation.startsWith('missing-')).length,
    );
  });

  it('flattens the nested prop manifest into auditable asset entries', () => {
    expect(PROP_VISUAL_COVERAGE.length).toBeGreaterThan(20);
    expect(new Set(PROP_VISUAL_COVERAGE.map((entry) => entry.id)).size).toBe(PROP_VISUAL_COVERAGE.length);
    for (const coverage of PROP_VISUAL_COVERAGE) {
      expect(existsSync(publicFile(coverage.asset.path)), coverage.id).toBe(true);
    }
  });
});
