import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './manifest';
import { BOSS_CATALOG } from '../bosses/catalog';

describe('boss asset manifest', () => {
  it('keeps every runtime game asset on raster image sets instead of SVG placeholders', () => {
    expect(JSON.stringify(ASSETS)).not.toMatch(/\.svg(?:["?]|$)/i);
  });

  it('ships ten aligned WebP structure objects for the three Gyeongbokgung courts', () => {
    const palaceLayers = Object.values(ASSETS.gyeongbokForegrounds);
    expect(palaceLayers).toHaveLength(10);
    expect(new Set(palaceLayers.map((asset) => asset.key)).size).toBe(10);
    for (const asset of palaceLayers) {
      expect(asset.path).toMatch(/^\/assets\/environment\/campaign\/foregrounds\/gyeongbok-.*-v2\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
      expect(asset.x).toBeGreaterThanOrEqual(0);
      expect(asset.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('ships a dedicated sword cursor for monster targeting', () => {
    expect(ASSETS.combatCursor).toEqual({
      key: 'sword-target-cursor-v1', path: '/assets/ui/sword-target-cursor-v1.png',
    });
  });

  it('ships four original generated environment maps and four unique monster action sheets', () => {
    const backgrounds = Object.values(ASSETS.extendedRegionBackgrounds);
    expect(new Set(backgrounds.map((asset) => asset.key)).size).toBe(4);
    for (const asset of backgrounds) {
      expect(asset.path).toMatch(/^\/assets\/environment\/generated\/.*-v3\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    }
    const monsters = [
      ASSETS.monsters['wonju-bear'],
      ASSETS.monsters['gangneung-haetae'],
      ASSETS.monsters['haeju-crane'],
      ASSETS.monsters['geoje-sea-wraith'],
    ];
    expect(new Set(monsters.map((asset) => asset.key)).size).toBe(4);
    for (const asset of monsters) {
      expect(asset.path).toMatch(/^\/assets\/monsters\/.*-actions-v1\.png$/);
      const png = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(2048);
      expect(png.readUInt32BE(20)).toBe(1280);
    }
  });

  it('ships transparent ambient image-set atlases, including separated flag and boat parts', () => {
    const ambientAssets = Object.values(ASSETS.props.ambient);
    expect(ambientAssets).toHaveLength(9);
    expect(new Set(ambientAssets.map((asset) => asset.key)).size).toBe(9);
    for (const asset of ambientAssets) {
      expect(asset.path).toMatch(/^\/assets\/environment\/props\/ambient\/.*-v1\.png$/);
      const png = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(512);
      expect(png.readUInt32BE(20)).toBe(512);
      expect(png[25]).toBe(6);
    }
  });

  it('ships the nine transparent castle and terrain landmarks used by the war map', () => {
    expect(ASSETS.worldMapLandmarks).toEqual({
      key: 'world-map-landmark-atlas-v1',
      path: '/assets/ui/world-map-landmark-atlas-v1.png',
    });
    const png = readFileSync(new URL(`../../../public${ASSETS.worldMapLandmarks.path}`, import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
  });

  it('ships raster frontier battle effects and camp props as normalized image-set atlases', () => {
    for (const asset of [ASSETS.frontierCombatFx, ASSETS.frontierCampProps]) {
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    }
  });

  it('ships six unique edge-matched WebP transitions for the Gwanghae route', () => {
    const transitions = [
      ASSETS.transitions.joseonGaeseongChangdeokgung,
      ASSETS.transitions.joseonChangdeokgungUnjongga,
      ASSETS.transitions.joseonUnjonggaSungnyemun,
      ASSETS.transitions.joseonSungnyemunSuwon,
      ASSETS.transitions.joseonSuwonChungju,
      ASSETS.transitions.joseonChungjuAndong,
    ];
    expect(new Set(transitions.map((asset) => asset.key)).size).toBe(6);
    for (const asset of transitions) {
      expect(asset.path).toMatch(/^\/assets\/environment\/transitions\/joseon-.*-v2\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    }
  });

  it('ships a four-stage transparent farm plot object atlas', () => {
    expect(ASSETS.props.villageFarmPlotStages).toEqual({
      key: 'joseon-farm-plot-stages-v4',
      path: '/assets/environment/props/joseon-farm-plot-stages-v4.png',
    });
    const png = readFileSync(new URL(`../../../public${ASSETS.props.villageFarmPlotStages.path}`, import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
  });

  it('ships nine compressed raster props for world seams, gates, roads, and ferry docks', () => {
    expect(ASSETS.props.worldTransitionProps).toEqual({
      key: 'world-transition-prop-atlas-v1',
      path: '/assets/environment/props/world-transition-prop-atlas-v1.webp',
    });
    const webp = readFileSync(new URL(
      `../../../public${ASSETS.props.worldTransitionProps.path}`,
      import.meta.url,
    ));
    expect(webp.subarray(0, 4).toString()).toBe('RIFF');
    expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    expect(webp.byteLength).toBeGreaterThan(200_000);
    expect(webp.byteLength).toBeLessThan(700_000);
  });

  it('ships nine Japanese structures instead of reusing Joseon government props', () => {
    expect(ASSETS.props.japanRegionProps).toEqual({
      key: 'japan-region-prop-atlas-v1',
      path: '/assets/environment/props/japan-region-prop-atlas-v1.webp',
    });
    const webp = readFileSync(new URL(
      `../../../public${ASSETS.props.japanRegionProps.path}`,
      import.meta.url,
    ));
    expect(webp.subarray(0, 4).toString()).toBe('RIFF');
    expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    expect(webp.byteLength).toBeGreaterThan(180_000);
    expect(webp.byteLength).toBeLessThan(600_000);
  });

  it('ships three seamless v2 raster terrain tiles for Joseon, Japan, and the northern frontier', () => {
    const terrainTiles = [
      ASSETS.joseonGroundTile,
      ASSETS.japanGroundTile,
      ASSETS.northernGroundTile,
    ];
    expect(terrainTiles).toEqual([
      {
        key: 'joseon-ground-tile-v2',
        path: '/assets/environment/tiles/joseon-ground-tile-v2.webp',
      },
      {
        key: 'japan-ground-tile-v2',
        path: '/assets/environment/tiles/japan-ground-tile-v2.webp',
      },
      {
        key: 'northern-ground-tile-v2',
        path: '/assets/environment/tiles/northern-ground-tile-v2.webp',
      },
    ]);
    for (const asset of terrainTiles) {
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(asset.path).toMatch(/^\/assets\/environment\/tiles\/.*-ground-tile-v2\.webp$/);
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
      expect(webp.byteLength).toBeGreaterThan(400_000);
      expect(webp.byteLength).toBeLessThan(700_000);
    }
  });

  it('ships five alpha-feathered v3 transition maps for the full Ulleung route', () => {
    const transitions = Object.values(ASSETS.transitions)
      .filter((asset) => asset.key.startsWith('ulleung-'));
    expect(transitions).toEqual([
      {
        key: 'ulleung-coast-meadow-blend-v3',
        path: '/assets/environment/ulleung-coast-meadow-blend-v3.webp',
      },
      {
        key: 'ulleung-meadow-hunt-blend-v3',
        path: '/assets/environment/ulleung-meadow-hunt-blend-v3.webp',
      },
      {
        key: 'ulleung-hunt-ridge-blend-v3',
        path: '/assets/environment/ulleung-hunt-ridge-blend-v3.webp',
      },
      {
        key: 'ulleung-ridge-prison-blend-v3',
        path: '/assets/environment/ulleung-ridge-prison-blend-v3.webp',
      },
      {
        key: 'ulleung-prison-government-blend-v3',
        path: '/assets/environment/ulleung-prison-government-blend-v3.webp',
      },
    ]);
    for (const asset of transitions) {
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
      expect(webp.subarray(12, 16).toString()).toBe('VP8X');
      expect(webp.includes(Buffer.from('ALPH'))).toBe(true);
      expect(webp.byteLength).toBeGreaterThan(400_000);
      expect(webp.byteLength).toBeLessThan(700_000);
    }
  });

  it('ships two authored alpha seams for the highest-contrast mainland borders', () => {
    const transitions = [
      ASSETS.transitions.settsuOsaka,
      ASSETS.transitions.jurchenFrontier,
    ];
    expect(transitions).toEqual([
      {
        key: 'settsu-osaka-transition-v1',
        path: '/assets/environment/transitions/settsu-osaka-transition-v1.webp',
      },
      {
        key: 'jurchen-frontier-transition-v1',
        path: '/assets/environment/transitions/jurchen-frontier-transition-v1.webp',
      },
    ]);
    for (const asset of transitions) {
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
      expect(webp.includes(Buffer.from('ALPH'))).toBe(true);
      expect(webp.byteLength).toBeGreaterThan(300_000);
      expect(webp.byteLength).toBeLessThan(700_000);
    }
  });

  it('ships the collision-aligned authored Awaji coast background', () => {
    expect(ASSETS.awajiCoastBackground).toEqual({
      key: 'awaji-coast-v2',
      path: '/assets/environment/campaign/awaji-coast-v2.webp',
    });
    const webp = readFileSync(new URL(
      `../../../public${ASSETS.awajiCoastBackground.path}`,
      import.meta.url,
    ));
    expect(webp.subarray(0, 4).toString()).toBe('RIFF');
    expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    expect(webp.byteLength).toBeGreaterThan(350_000);
    expect(webp.byteLength).toBeLessThan(700_000);
  });

  it('ships the human-scale Busanjin fortress v2 raster map', () => {
    expect(ASSETS.busanjinSiegeBackground).toEqual({
      key: 'busanjin-siege-v2',
      path: '/assets/environment/campaign/busanjin-siege-v2.webp',
    });
    const webp = readFileSync(new URL(
      `../../../public${ASSETS.busanjinSiegeBackground.path}`,
      import.meta.url,
    ));
    expect(webp.subarray(0, 4).toString()).toBe('RIFF');
    expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    expect(webp.byteLength).toBeGreaterThan(350_000);
    expect(webp.byteLength).toBeLessThan(700_000);
  });

  it('ships transparent 3 by 3 atlases for ground, regional roads, and feathered seam roads', () => {
    expect([
      ASSETS.props.worldGroundDetails,
      ASSETS.props.worldNaturalRoads,
      ASSETS.props.worldSeamRoads,
    ]).toEqual([
      {
        key: 'world-ground-detail-atlas-v2',
        path: '/assets/environment/props/world-ground-detail-atlas-v2.png',
      },
      {
        key: 'world-natural-road-atlas-v2',
        path: '/assets/environment/props/world-natural-road-atlas-v2.png',
      },
      {
        key: 'world-seam-road-atlas-v4',
        path: '/assets/environment/props/world-seam-road-atlas-v4.png',
      },
    ]);
    for (const asset of [
      ASSETS.props.worldGroundDetails,
      ASSETS.props.worldNaturalRoads,
      ASSETS.props.worldSeamRoads,
    ]) {
      const png = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(1254);
      expect(png.readUInt32BE(20)).toBe(1254);
      expect(png[24]).toBe(8);
      expect(png[25]).toBe(6);
      expect(png.byteLength).toBeGreaterThan(1_200_000);
      expect(png.byteLength).toBeLessThan(2_500_000);
    }
  });

  it('ships four transparent raster feather bands that hide straight map borders', () => {
    expect(ASSETS.props.worldTerrainFeathers).toEqual({
      key: 'world-terrain-feather-atlas-v1',
      path: '/assets/environment/props/world-terrain-feather-atlas-v1.webp',
    });
    const webp = readFileSync(new URL(
      `../../../public${ASSETS.props.worldTerrainFeathers.path}`,
      import.meta.url,
    ));
    expect(webp.subarray(0, 4).toString()).toBe('RIFF');
    expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    expect(webp.byteLength).toBeGreaterThan(400_000);
    expect(webp.byteLength).toBeLessThan(900_000);
  });

  it('ships three compressed Pyongyang siege maps between Yalu and the palace', () => {
    const maps = [
      ASSETS.pyongyangOuterBackground,
      ASSETS.pyongyangDaedongGateBackground,
      ASSETS.pyongyangInnerBackground,
    ];
    expect(new Set(maps.map((asset) => asset.key)).size).toBe(3);
    for (const asset of maps) {
      expect(asset.path).toMatch(/^\/assets\/environment\/campaign\/pyongyang-.*-v1\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    }
  });

  it('ships ten transparent Pyongyang structure objects above the terrain floor', () => {
    const structureLayers = Object.values(ASSETS.pyongyangForegrounds);
    expect(structureLayers).toHaveLength(10);
    expect(new Set(structureLayers.map((asset) => asset.key)).size).toBe(10);
    for (const asset of structureLayers) {
      expect(asset.path).toMatch(/^\/assets\/environment\/campaign\/foregrounds\/pyongyang-.*-v1\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
      expect(asset.x).toBeGreaterThanOrEqual(0);
      expect(asset.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('ships one 40-frame atlas for every unique boss', () => {
    expect(Object.keys(ASSETS.bosses)).toHaveLength(10);
    for (const boss of Object.values(BOSS_CATALOG)) {
      expect(ASSETS.bosses[boss.id]).toEqual({
        key: boss.textureKey,
        path: `/assets/bosses/${boss.id}-actions-v1.png`,
      });
    }
  });
});

describe('player equipment layer manifest', () => {
  it('ships a visibly unequipped base body and body-locked armor overlay', () => {
    expect(ASSETS.playerUnequipped).toEqual({
      key: 'joseon-hero-base-body-v8', path: '/assets/characters/joseon-hero-base-body-v8.png',
    });
    expect(ASSETS.playerArmorLayer).toEqual({
      key: 'joseon-hero-armor-layer-v4', path: '/assets/characters/joseon-hero-armor-layer-v4.png',
    });
    expect(ASSETS.playerArmorLayers).toMatchObject({
      'hunter-durumagi': { key: 'joseon-hero-armor-layer-v4', path: '/assets/characters/joseon-hero-armor-layer-v4.png' },
      'warden-durumagi': { key: 'joseon-hero-warden-layer-v2', path: '/assets/characters/joseon-hero-warden-layer-v2.png' },
      'tiger-pelt-armor': { key: 'joseon-hero-tiger-pelt-layer-v2', path: '/assets/characters/joseon-hero-tiger-pelt-layer-v2.png' },
    });
    expect(Object.keys(ASSETS.playerArmorLayers)).toHaveLength(8);
  });

  it('ships one 40-frame weapon-ready body and matching clothing layers', () => {
    expect(ASSETS.playerWeaponReadyBody).toEqual({
      key: 'joseon-hero-weapon-ready-body-v3',
      path: '/assets/characters/joseon-hero-weapon-ready-body-v3.png',
    });
    expect(ASSETS.playerWeaponReadyArmorLayers).toMatchObject({
      'hunter-durumagi': {
        key: 'joseon-hero-hunter-weapon-ready-layer-v3',
        path: '/assets/characters/joseon-hero-hunter-weapon-ready-layer-v3.png',
      },
      'warden-durumagi': {
        key: 'joseon-hero-warden-weapon-ready-layer-v3',
        path: '/assets/characters/joseon-hero-warden-weapon-ready-layer-v3.png',
      },
      'tiger-pelt-armor': {
        key: 'joseon-hero-tiger-pelt-weapon-ready-layer-v3',
        path: '/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v3.png',
      },
    });
    expect(Object.keys(ASSETS.playerWeaponReadyArmorLayers)).toHaveLength(8);
    expect(Object.keys(ASSETS.frontierArmorLayers)).toHaveLength(8);
    expect(Object.keys(ASSETS.frontierWeaponReadyArmorLayers)).toHaveLength(8);
  });

  it('ships dedicated 8-direction bow and sword-ready atlases for Hajin', () => {
    expect(ASSETS.frontierArcher.path).toBe('/assets/characters/hajin-frontier-archer-actions-v2.png');
    expect(ASSETS.frontierMelee.path).toBe('/assets/characters/hajin-frontier-melee-actions-v2.png');
    for (const asset of [ASSETS.frontierArcher, ASSETS.frontierMelee]) {
      const png = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(256 * 8);
      expect(png.readUInt32BE(20)).toBe(256 * 5);
      expect([4, 6]).toContain(png[25]);
    }
  });

  it('ships Yeonhwa as a normalized 40-frame mudang atlas with an Osaka battlefield', () => {
    expect(ASSETS.osakaMudang.path).toBe('/assets/characters/osaka-mudang-actions-v2.png');
    const atlas = readFileSync(new URL(`../../../public${ASSETS.osakaMudang.path}`, import.meta.url));
    expect(atlas.subarray(1, 4).toString()).toBe('PNG');
    expect(atlas.readUInt32BE(16)).toBe(256 * 8);
    expect(atlas.readUInt32BE(20)).toBe(256 * 5);
    expect(atlas[25]).toBe(6);

    expect(ASSETS.osakaOuterHarborBackground.path)
      .toBe('/assets/environment/campaign/osaka-outer-harbor-v1.webp');
    const background = readFileSync(new URL(
      `../../../public${ASSETS.osakaOuterHarborBackground.path}`,
      import.meta.url,
    ));
    expect(background.subarray(0, 4).toString()).toBe('RIFF');
    expect(background.subarray(8, 12).toString()).toBe('WEBP');
  });

  it('ships dedicated normalized atlases for ploughing and female farm work', () => {
    const farmWorkers = [
      ASSETS.villageFieldPloughman,
      ASSETS.villageFemaleFarmer,
      ASSETS.villageFemaleWaterer,
    ];
    expect(new Set(farmWorkers.map((asset) => asset.key)).size).toBe(3);
    expect(farmWorkers.filter((asset) => asset.key.includes('female'))).toHaveLength(2);
    for (const asset of farmWorkers) {
      const atlas = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(atlas.subarray(1, 4).toString()).toBe('PNG');
      expect(atlas.readUInt32BE(16)).toBe(256 * 8);
      expect(atlas.readUInt32BE(20)).toBe(256 * 5);
      expect(atlas[25]).toBe(6);
    }
  });

  it('ships a ground-only Jurchen village background and transparent structure atlas', () => {
    const background = readFileSync(new URL(
      `../../../public${ASSETS.jurchenVillageBackground.path}`,
      import.meta.url,
    ));
    expect(background.subarray(0, 4).toString()).toBe('RIFF');
    expect(background.subarray(8, 12).toString()).toBe('WEBP');

    const structures = readFileSync(new URL(
      `../../../public${ASSETS.props.jurchenVillageStructures.path}`,
      import.meta.url,
    ));
    expect(structures.subarray(1, 4).toString()).toBe('PNG');
    expect(structures.readUInt32BE(16)).toBe(1536);
    expect(structures.readUInt32BE(20)).toBe(1024);
    expect(structures[25]).toBe(6);
  });

  it('ships four distinct raster maps for the Japanese village-to-Shogun campaign', () => {
    const maps = [
      ASSETS.settsuVillageBackground,
      ASSETS.yamazakiHuntBackground,
      ASSETS.osakaCastleTownBackground,
      ASSETS.shogunKeepBackground,
    ];
    expect(new Set(maps.map((asset) => asset.key)).size).toBe(4);
    for (const asset of maps) {
      expect(asset.path).toMatch(/^\/assets\/environment\/campaign\/(?:settsu|yamazaki|osaka-castle|shogun)-.*-v1\.webp$/);
      const webp = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(webp.subarray(0, 4).toString()).toBe('RIFF');
      expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    }
  });

  it('ships a normalized 40-frame Japanese civilian atlas with alpha', () => {
    expect(ASSETS.japaneseCivilianWoman).toEqual({
      key: 'japanese-civilian-woman-actions-v1',
      path: '/assets/characters/japanese-civilian-woman-actions-v1.png',
    });
    const png = readFileSync(new URL(
      `../../../public${ASSETS.japaneseCivilianWoman.path}`,
      import.meta.url,
    ));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(256 * 8);
    expect(png.readUInt32BE(20)).toBe(256 * 5);
    expect(png[25]).toBe(6);
  });

  it('ships unique raster icons for all three upgraded bows', () => {
    for (const itemId of ['white-birch-bow', 'iron-horn-warbow', 'thunderbird-bow'] as const) {
      const iconPath = `/assets/items/${itemId}-v1.png`;
      const png = readFileSync(new URL(`../../../public${iconPath}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(256);
      expect(png.readUInt32BE(20)).toBe(256);
      expect([4, 6]).toContain(png[25]);
    }
  });

  it('ships six transparent frontier reward icons as normalized image parts', () => {
    for (const itemId of [
      'northwind-warbow',
      'frontier-lamellar-coat',
      'falcon-eye-bracer',
      'border-war-dispatch',
      'jurchen-iron-arrowheads',
      'joseon-border-token',
    ] as const) {
      const iconPath = `/assets/items/${itemId}-v1.png`;
      const png = readFileSync(new URL(`../../../public${iconPath}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(256);
      expect(png.readUInt32BE(20)).toBe(256);
      expect(png[25]).toBe(6);
    }
  });

  it('ships dedicated in-world cutouts instead of reusing inventory icons as weapons', () => {
    expect(ASSETS.playerWeapons).toMatchObject({
      'worn-hwando': {
        key: 'weapon-worn-hwando-world-v1', path: '/assets/weapons/worn-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'dokkaebi-club': {
        key: 'weapon-dokkaebi-club-world-v1', path: '/assets/weapons/dokkaebi-club-world-v1.png', grip: { x: 128, y: 50 },
      },
      'moonsteel-hwando': {
        key: 'weapon-moonsteel-hwando-world-v1', path: '/assets/weapons/moonsteel-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'ember-hwando': {
        key: 'weapon-ember-hwando-world-v1', path: '/assets/weapons/ember-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'frost-hwando': {
        key: 'weapon-frost-hwando-world-v1', path: '/assets/weapons/frost-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'storm-hwando': {
        key: 'weapon-storm-hwando-world-v1', path: '/assets/weapons/storm-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'venom-hwando': {
        key: 'weapon-venom-hwando-world-v1', path: '/assets/weapons/venom-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'gale-hwando': {
        key: 'weapon-gale-hwando-world-v1', path: '/assets/weapons/gale-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'earth-hwando': {
        key: 'weapon-earth-hwando-world-v1', path: '/assets/weapons/earth-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'shadow-hwando': {
        key: 'weapon-shadow-hwando-world-v1', path: '/assets/weapons/shadow-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'bear-claw-gauntlet': {
        key: 'weapon-bear-claw-gauntlet-world-v1', path: '/assets/weapons/bear-claw-gauntlet-world-v1.png', grip: { x: 128, y: 50 },
      },
      'chiaksan-claw-knife': {
        key: 'weapon-chiaksan-claw-knife-world-v1', path: '/assets/weapons/chiaksan-claw-knife-world-v1.png', grip: { x: 128, y: 50 },
      },
      'saltfield-ritual-knife': {
        key: 'weapon-saltfield-ritual-knife-world-v1', path: '/assets/weapons/saltfield-ritual-knife-world-v1.png', grip: { x: 128, y: 50 },
      },
      'geoje-anchor-hwando': {
        key: 'weapon-geoje-anchor-hwando-world-v1', path: '/assets/weapons/geoje-anchor-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'hwangju-moonsteel-spear': {
        key: 'weapon-hwangju-moonsteel-spear-world-v1', path: '/assets/weapons/hwangju-moonsteel-spear-world-v1.png', grip: { x: 128, y: 50 },
      },
      'pyeongchang-leopard-knife': {
        key: 'weapon-pyeongchang-leopard-knife-world-v1', path: '/assets/weapons/pyeongchang-leopard-knife-world-v1.png', grip: { x: 128, y: 50 },
      },
      'cheongju-kiln-hwando': {
        key: 'weapon-cheongju-kiln-hwando-world-v1', path: '/assets/weapons/cheongju-kiln-hwando-world-v1.png', grip: { x: 128, y: 50 },
      },
      'gunsan-drowned-blade': {
        key: 'weapon-gunsan-drowned-blade-world-v1', path: '/assets/weapons/gunsan-drowned-blade-world-v1.png', grip: { x: 128, y: 50 },
      },
    });
    expect(Object.keys(ASSETS.playerWeapons)).toHaveLength(26);
  });

  it('keeps elemental world weapons as transparent 256px runtime parts', () => {
    for (const asset of Object.values(ASSETS.playerWeapons)) {
      const png = readFileSync(new URL(`../../../public${asset.path}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(256);
      expect(png.readUInt32BE(20)).toBe(256);
      expect([4, 6]).toContain(png[25]);
    }
  });

  it('keeps tiger-pelt clothing body-locked to the approved 8 by 5 action atlas', () => {
    for (const asset of [
      ASSETS.playerArmorLayers['tiger-pelt-armor'],
      ASSETS.playerWeaponReadyArmorLayers['tiger-pelt-armor'],
    ]) {
      const pngPath = asset.path.endsWith('.webp') ? asset.path.replace(/\.webp$/, '.png') : asset.path;
      const png = readFileSync(new URL(`../../../public${pngPath}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(256 * 8);
      expect(png.readUInt32BE(20)).toBe(256 * 5);
      expect([4, 6]).toContain(png[25]);
    }
  });
});
