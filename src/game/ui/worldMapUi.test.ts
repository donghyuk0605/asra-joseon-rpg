import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('full world map UI', () => {
  const hud = readFileSync(new URL('./Hud.ts', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../phaser/HuntingScene.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

  it('places war landmarks and famous-town pins on the map while preserving the travel index', () => {
    expect(hud).toContain('class="menu-seal map-seal"');
    expect(hud).toContain('/assets/ui/joseon-regional-world-map-v1.webp');
    expect(hud).toContain('삼군 공성 전황도');
    expect(hud).toContain('data-world-region');
    expect(hud).toContain('data-world-stronghold');
    expect(hud).toContain(".filter((node) => 'landmarkFrame' in node)");
    expect(hud).toContain("worldMapNodeKind(node) !== 'stronghold' && !('landmarkFrame' in node)");
    expect(hud).toContain('world-map-outpost-pin');
    expect(hud).toContain('class="world-map-settlement-index"');
    expect(hud).toContain('data-world-settlement');
    expect(hud).toContain('<strong>역참</strong><strong>장시</strong><strong>안전지대</strong>');
    expect(hud).toContain('<strong>보급</strong><strong>봉화</strong><strong>사냥</strong>');
    expect(hud).toContain('ASSETS.extendedRegionBackgrounds.wonju.path');
    expect(styles).toContain('.world-map-route[data-route="outpost"]');
  });

  it('renders the capital and strongholds with explicit atlas frames and war state', () => {
    expect(hud).toContain("import type { FactionWarSnapshot } from '../world/factionWar'");
    expect(hud).toContain('factionWar: FactionWarSnapshot');
    expect(hud).toContain('class="world-map-landmark"');
    expect(hud).toContain('--landmark-frame:${landmarkFrame}');
    expect(hud).toContain('data-world-stronghold="${node.id}"');
    expect(hud).toContain('data-id="war-node-${node.id}-owner"');
    expect(hud).toContain('data-id="war-node-${node.id}-garrison"');
    expect(hud).toContain('data-id="war-node-${node.id}-fortification"');
    expect(hud).toContain('this.renderFactionWar(snapshot.factionWar)');
    expect(styles).toContain("url('/assets/ui/world-map-landmark-atlas-v1.png')");
    expect(styles).toContain('.world-map-node[data-owner="daedong-army"]');
    expect(styles).toContain('.world-map-node[data-owner="jurchen-league"]');
    expect(styles).toContain('.world-map-node[data-owner="japanese-army"]');
    expect(styles).toContain('.world-map-node[data-owner="joseon-court"]');
    expect(hud).not.toContain('data-world-settlement="${node.id}"\n          data-world-stronghold');
  });

  it('selects a destination before a separate confirmed travel action', () => {
    expect(hud).toContain('private selectedWorldRegion: RegionId | null = null');
    expect(hud).toContain('this.selectWorldDestination(destinationId as RegionId)');
    expect(hud).toContain('data-action="world-map-confirm"');
    expect(hud).toContain('private confirmWorldTravel(): void');
    expect(hud).toContain('const result = this.actions.onWorldTravel(destination)');
    expect(hud).toContain('data-id="world-map-selection-preview"');
    expect(hud).toContain('data-id="world-map-selection-route"');
    expect(styles).toContain('.world-map-command-card');
    expect(styles).toContain('.world-map-node.is-selected');
  });

  it('keeps map art and coordinate pins in the same three-by-two stage', () => {
    expect(hud).toContain('class="world-map-viewport"');
    expect(styles).toContain('aspect-ratio: 3 / 2');
    expect(styles).toContain('object-fit: fill');
    expect(styles).toContain('left: var(--map-x) !important');
    expect(styles).toContain('top: var(--map-y) !important');
  });

  it('uses the dedicated raster previews for Hanseong and each famous Joseon town', () => {
    expect(hud).toContain('/assets/environment/campaign/previews/hanseong-sungnyemun-preview-v2.webp');
    expect(hud).toContain('/assets/environment/campaign/previews/hanseong-unjongga-preview-v1.webp');
    expect(hud).toContain('/assets/environment/campaign/previews/changdeokgung-audience-preview-v2.webp');
    expect(hud).toContain('/assets/environment/campaign/previews/gaeseong-songdo-preview-v1.webp');
    expect(hud).toContain('/assets/environment/campaign/previews/suwon-dohobu-preview-v1.webp');
    expect(hud).toContain('/assets/environment/campaign/previews/chungju-mokgye-preview-v1.webp');
    expect(hud).toContain('/assets/environment/campaign/previews/andong-seowon-preview-v1.webp');
    expect(hud).not.toContain('hanseong-sungnyemun-preview-v1.webp');
    expect(hud).not.toContain('changdeokgung-audience-preview-v1.webp');
    expect(styles).toContain('var(--settlement-preview)');
  });

  it('shows player-faction growth, reserves, siege target and recent war history', () => {
    expect(hud).toContain('class="war-council-panel"');
    expect(hud).toContain('data-id="war-player-faction"');
    expect(hud).toContain('data-id="war-player-doctrine"');
    expect(hud).toContain('data-id="war-strength"');
    expect(hud).toContain('data-id="war-reserve"');
    expect(hud).toContain('data-id="war-recovery"');
    expect(hud).toContain('data-id="war-holdings"');
    expect(hud).toContain('data-id="war-next-conflict"');
    expect(hud).toContain('data-id="war-recent"');
    expect(hud).toContain('war.activeConflict.title');
    expect(hud).toContain('war.chronicle.slice(0, 3)');
    expect(styles).toContain('.war-faction-balance');
    expect(styles).toContain('.war-conflict-card');
  });

  it('supports the M key and responsive mobile presentation', () => {
    expect(scene).toContain("keydown-M");
    expect(scene).toContain('this.hud.toggleWorldMap()');
    expect(styles).toContain('.world-map-panel');
    expect(styles).toContain('height: 100dvh');
    expect(styles).toContain('.menu-seal.map-seal');
    expect(styles).toContain('.world-map-settlement-index > div { grid-template-columns: 1fr 1fr;');
    expect(styles).toContain('.world-map-settlement { min-height: 54px;');
  });

  it('provides a distinct ghost-travel interface with all-region selection', () => {
    expect(hud).toContain('class="travel-mode-hud"');
    expect(hud).toContain('data-travel-region');
    expect(hud).toContain('TRAVEL_ATLAS_GROUPS.map');
    expect(hud).toContain('class="world-map-exit-button"');
    expect(hud).toContain('data-action="travel-exit"');
    expect(hud).toContain('<details class="travel-atlas-group"');
    expect(hud).toContain('TRAVEL_ATLAS_REGION_IDS.length');
    expect(hud).not.toContain('지상 33곳');
    expect(hud).toContain('유령 여행 전도');
    expect(scene).toContain('this.simulation.moveGhostTo');
    expect(scene).toContain('createTravelGhostVisual');
    expect(scene).toContain("this.gameMode === 'travel'");
    expect(styles).toContain('#hud.is-travel-mode .world-map-body');
    expect(styles).toContain('#hud.is-travel-mode .war-council-panel { display: none; }');
    expect(styles).toContain('.travel-destination-index');
    expect(styles).toContain('grid-template-rows: minmax(210px, 42%) minmax(0, 58%)');
  });
});
