import { existsSync, readFileSync } from 'node:fs';
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

  it('tracks all monster kinds with one dedicated active visual identity each', () => {
    expect(Object.keys(ASSETS.monsters)).toHaveLength(61);
    expect(Object.keys(MONSTER_VISUAL_COVERAGE)).toEqual(Object.keys(ASSETS.monsters));
    expect(MONSTER_ASSET_REUSE_GROUPS).toHaveLength(0);
    expect(VISUAL_COVERAGE_SUMMARY.uniqueMonsterAssets).toBe(61);
    expect(VISUAL_COVERAGE_SUMMARY.sharedMonsterKinds).toBe(0);
    for (const coverage of Object.values(MONSTER_VISUAL_COVERAGE)) {
      expect(existsSync(publicFile(coverage.asset.path)), coverage.kind).toBe(true);
      expect(coverage.sharedBy).toEqual([coverage.kind]);
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

  it('keeps only intentional icon-to-world duplicates in the public asset tree', () => {
    const generated = JSON.parse(readFileSync(
      resolve(process.cwd(), 'docs/graphics/visual-coverage.generated.json'),
      'utf8',
    )) as {
      summary: { missingReferencedPaths: number };
      duplicateContentGroups: Array<{ files: Array<{ path: string }> }>;
      unreferencedPublicFiles: Array<{ path: string }>;
    };
    expect(generated.summary.missingReferencedPaths).toBe(0);
    expect(generated.duplicateContentGroups).toHaveLength(3);
    for (const group of generated.duplicateContentGroups) {
      expect(group.files.map((file) => file.path).sort()).toEqual([
        expect.stringMatching(/^\/assets\/items\/.+-v1\.png$/),
        expect.stringMatching(/^\/assets\/weapons\/.+-world-v1\.png$/),
      ]);
    }

    const retiredPublicPaths = [
      '/assets/bosses/chain-miner-actions-v2.png',
      '/assets/bosses/chain-miner-actions-v3.png',
      '/assets/monsters/boar-actions.png',
      '/assets/monsters/wonju-bear-actions-v1-normalized.png',
      '/assets/environment/transitions/joseon-changdeokgung-unjongga-v1.webp',
      '/assets/environment/transitions/joseon-chungju-andong-v1.webp',
      '/assets/environment/transitions/joseon-gaeseong-changdeokgung-v1.webp',
      '/assets/environment/transitions/joseon-sungnyemun-suwon-v1.webp',
      '/assets/environment/transitions/joseon-suwon-chungju-v1.webp',
      '/assets/environment/transitions/joseon-unjongga-sungnyemun-v1.webp',
    ];
    for (const path of retiredPublicPaths) expect(existsSync(publicFile(path)), path).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'assets/legacy/bosses/chain-miner-actions-v2.png'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'assets/legacy/monsters/boar-actions.png'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'assets/legacy/monsters/wonju-bear-actions-v1-normalized.png'))).toBe(true);
  });
});
