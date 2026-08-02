import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';
import continuitySource from '../world/worldContinuity.ts?raw';

const methodSlice = (startSignature: string, nextSignature: string): string => {
  const start = sceneSource.indexOf(startSignature);
  const end = sceneSource.indexOf(nextSignature, start + startSignature.length);
  if (start < 0 || end <= start) {
    throw new Error(`Unable to isolate HuntingScene method: ${startSignature}`);
  }
  return sceneSource.slice(start, end);
};

describe('world terrain continuity presentation', () => {
  it('keeps every central-world background below the raster seam layers', () => {
    const createSource = methodSlice('create(): void', 'update(_: number, delta: number): void');
    for (const assetName of [
      'ASSETS.transitions.mistwoodVillage.key',
      'ASSETS.worldBackground.key',
      'ASSETS.transitions.villageMinepass.key',
      'ASSETS.transitions.villageMoonfield.key',
      'ASSETS.dungeonBackground.key',
    ]) {
      const assetStart = createSource.indexOf(assetName);
      expect(assetStart, assetName).toBeGreaterThanOrEqual(0);
      expect(createSource.slice(assetStart, assetStart + 240), assetName)
        .toContain('.setDepth(WORLD_FLOOR_DEPTH + 1)');
    }
  });

  it('uses authored transition paintings at the two hardest biome cuts and feather composites elsewhere', () => {
    const seamSource = methodSlice(
      'private createWorldTerrainSeams(): void',
      'private createWorldTravelLandmarks(): void',
    );

    expect(seamSource).toContain('WORLD_TERRAIN_SEAMS.forEach');
    expect(seamSource).toContain('authoredSeam && this.createAuthoredTerrainTransition(seam, authoredSeam)');
    expect(seamSource).toContain('const isJoseonTownSeam = isJoseonTownRegion(seam.from) && isJoseonTownRegion(seam.to)');
    expect(seamSource).toContain('const featherCount = usesAuthoredSeam || isJoseonTownSeam ? 0 : crossSize > 1200 ? 4 : 3');
    expect(seamSource).toContain('for (let index = 0; index < featherCount; index += 1)');
    expect(seamSource).toContain('ASSETS.props.worldTerrainFeathers.key');
    expect(seamSource).toContain("const isCentralWorldSeam = seam.id === 'mistwood-village'");
    expect(seamSource).toContain('isCentralWorldSeam ? 0.24');
    expect(seamSource).toContain("'jurchenvillage-manchufrontier': { key: ASSETS.transitions.jurchenFrontier.key");
    expect(seamSource).toContain("'settsuvillage-osaka': { key: ASSETS.transitions.settsuOsaka.key");
    expect(sceneSource).toContain('JOSEON_TOWN_TRANSITION_SEAMS.map((transition)');
    const authoredHelper = methodSlice(
      'private createAuthoredTerrainTransition(',
      'private createWorldTravelLandmarks(): void',
    );
    expect(authoredHelper).toContain('.setName(`terrain-authored-transition-${seam.id}`)');
    expect(authoredHelper).toContain(".setData('authoredTerrainTransition', true)");
    expect(authoredHelper).toContain('this.children.getByName(`terrain-natural-road-${seam.id}`)?.destroy()');
    expect(authoredHelper).toContain('this.authoredTerrainSeamsCreated.add(seam.id)');
    expect(seamSource).toContain('if (!usesAuthoredSeam)');
    expect(seamSource).toContain("seam.id === 'settsuvillage-osaka'");
    expect(seamSource).toContain("? seamRoadFrame['river-ford']");
    expect(seamSource).toContain('`terrain-feather-${seam.id}-${index}`');
    expect(seamSource).toContain('ASSETS.props.worldGroundDetails.key');
    expect(seamSource).toContain('`terrain-ground-detail-${seam.id}-${index}`');
    expect(seamSource).toContain('ASSETS.props.worldSeamRoads.key');
    expect(seamSource).not.toContain('ASSETS.props.worldNaturalRoads.key');
    expect(seamSource).toContain('const detailCount = usesAuthoredSeam || isJoseonTownSeam ? 0');
    expect(seamSource).toContain('const roadAtlasDisplayWidth = seam.roadWidth * (isJoseonTownSeam ? 1.34 : 1.72)');
    expect(seamSource).toContain('const roadDisplayLength = isJoseonTownSeam ? 220 : size + 160');
    expect(seamSource).toContain('.setDisplaySize(roadAtlasDisplayWidth, roadDisplayLength)');
    expect(seamSource).toMatch(/const roadAlpha = isJoseonTownSeam\s*\?\s*0\.52/);
    expect(seamSource).toMatch(/:\s*isCentralWorldSeam\s*\?\s*0\.72/);
    expect(seamSource).toContain('.setAlpha(roadAlpha)');
    expect(seamSource).toContain('.setName(`terrain-natural-road-${seam.id}`)');
    expect(seamSource).toContain(".setData('roadWidth', seam.roadWidth)");
    expect(seamSource.match(/terrain-natural-road-/g)).toHaveLength(2);

    expect(seamSource).not.toContain('const stripCount');
    expect(seamSource).not.toContain('stripIndex');
    expect(seamSource).not.toContain('fillRect');
    expect(seamSource).not.toContain('fillPoints');
    expect(seamSource).not.toContain('this.add.ellipse');
    expect(seamSource).not.toContain('terrain-seam-prop-');
    expect(seamSource).not.toContain('ASSETS.props.worldTransitionProps.key');
  });

  it('uses closed shore piers and camera-faded travel for Japanese island crossings', () => {
    expect(sceneSource).toContain('private createWorldTravelLandmarks(): void');
    expect(sceneSource).toContain('for (const connection of WORLD_TRAVEL_CONNECTIONS)');
    expect(sceneSource).toContain('setName(`travel-pier-${connection.id}-${region}`)');
    expect(sceneSource).toContain('.setInteractive({ useHandCursor: true })');
    expect(sceneSource).toContain("'선착장으로 이동 · 도착하면 자동 승선'");
    expect(sceneSource).toContain('setName(`travel-breakwater-${connection.id}-${region}-${sideIndex}`)');
    expect(sceneSource).toContain('const continuousTravel = isContinuousWorldNeighbor(region, destination)');
    expect(sceneSource).toContain('this.cameras.main.fadeOut(140, 16, 13, 10)');
    const ferrySource = sceneSource.slice(
      sceneSource.indexOf('private createWorldTravelLandmarks(): void'),
      sceneSource.indexOf('private createOpenFieldSeams(): void'),
    );
    const ferryCoastSource = ferrySource.slice(
      ferrySource.indexOf('for (const [coastIndex, localX]'),
      ferrySource.indexOf('for (const [sideIndex, localX]'),
    );
    expect(ferryCoastSource).toContain('[460, 768, 1076]');
    expect(ferryCoastSource).toContain('ASSETS.props.worldNaturalRoads.key');
    expect(ferryCoastSource).toContain('.setDisplaySize(300, 410)');
    expect(ferryCoastSource).toContain(".setAngle(edge === 'north' ? -90 : 90)");
    expect(ferryCoastSource).toContain('.setFlipY(coastIndex === 1)');
    expect(ferryCoastSource).not.toContain('.setFlipX(');
    expect(ferryCoastSource).not.toContain('ASSETS.props.worldTransitionProps.key');
    expect(ferrySource).not.toContain('fillRoundedRect');
    expect(ferrySource).not.toContain('fillCircle');
  });

  it('uses varied raster tiles and three proportionate natural-road segments per Japan and Jurchen region', () => {
    const groundHelperSource = methodSlice(
      'private addRegionalGroundDetails(',
      'private addRegionalNaturalRoad(',
    );
    const roadHelperSource = methodSlice(
      'private addRegionalNaturalRoad(',
      'private createJapanExpansionWorlds(): void',
    );
    const japanSource = methodSlice(
      'private createJapanExpansionWorlds(): void',
      'private createJurchenExpansionWorlds(): void',
    );
    const jurchenSource = methodSlice(
      'private createJurchenExpansionWorlds(): void',
      'private createJoseonTownWorlds(): void',
    );

    expect(sceneSource).not.toContain('private ensureProceduralTerrainTexture(');
    expect(groundHelperSource).toContain('const corridorHalfWidth = 260');
    expect(groundHelperSource).toContain('const onLeft = index % 2 === 0');
    expect(roadHelperSource).toContain('ASSETS.props.worldNaturalRoads.key');
    expect(roadHelperSource).toContain('const segmentCount = 3');
    expect(roadHelperSource).toContain('const roadSpan = MAP_HEIGHT + 72');
    expect(roadHelperSource).toContain('const segmentOverlap = 16');
    expect(roadHelperSource).toContain('for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1)');
    expect(roadHelperSource).toContain('.setDisplaySize(width, segmentHeight)');
    expect(roadHelperSource).toContain('.setFlipY(segmentIndex % 2 === 1)');
    expect(roadHelperSource).toContain('.setName(`regional-natural-road-${region}-${segmentIndex}`)');
    expect(roadHelperSource).not.toContain('.setDisplaySize(width, MAP_HEIGHT + 72)');

    expect(japanSource).toContain('const terrainKey = ASSETS.japanGroundTile.key');
    expect(japanSource).toContain('ASSETS.props.japanRegionProps.key');
    expect(japanSource).toContain("case 'pine': return { key: ASSETS.props.joseonTreeSpecies.key");
    expect(japanSource).toContain("treeSpeciesFrame(prop.treeSpecies ?? 'coastal-black-pine')");
    expect(japanSource).not.toContain('ASSETS.props.ulleungTrainingPine.key');
    expect(japanSource).not.toContain("case 'pine': return { key: ASSETS.props.worldTransitionProps.key");
    expect(japanSource).toContain('const shorelineInset = japanShorelineWidthAtY(localY)');
    expect(japanSource).toContain('ASSETS.props.worldNaturalRoads.key');
    expect(japanSource).toContain('.setDisplaySize(300, 410)');
    expect(japanSource).toContain(".setFlipX(side === 'left')");
    const coastSource = japanSource.slice(
      japanSource.indexOf('for (const [coastIndex, localY]'),
      japanSource.indexOf('const dock = this.add.image'),
    );
    expect(coastSource).not.toContain('.setAngle(');
    expect(japanSource).toContain('.setTilePosition(256, 0)');
    expect(japanSource).toContain('.setTint(layout.floorTint)');
    expect(japanSource).toContain("region === 'awajicoast'");
    expect(japanSource).toContain('? [4, 2, 3, 0]');
    expect(japanSource).toContain('layout.waterSide ? 410 : 150');
    expect(japanSource).toContain('this.addRegionalNaturalRoad(');
    expect(japanSource.match(/this\.addRegionalNaturalRoad\(/g)).toHaveLength(1);
    expect(japanSource).not.toContain('japan-road-piece-');

    expect(jurchenSource).toContain('const terrainKey = ASSETS.northernGroundTile.key');
    expect(jurchenSource).toContain("if (kind === 'pine') return { key: ASSETS.props.joseonTreeSpecies.key");
    expect(jurchenSource).toContain("treeSpeciesFrame(prop.treeSpecies ?? 'birch')");
    expect(jurchenSource).not.toContain('ASSETS.props.ulleungTrainingPine.key');
    expect(jurchenSource).toContain("return { key: ASSETS.props.brokenCart.key }");
    expect(jurchenSource).toContain('.setTilePosition(256, 0)');
    expect(jurchenSource).toContain('.setTint(layout.floorTint)');
    expect(jurchenSource).toContain('this.addRegionalNaturalRoad(');
    expect(jurchenSource.match(/this\.addRegionalNaturalRoad\(/g)).toHaveLength(1);
    expect(jurchenSource).not.toContain('jurchen-snow-road-piece-');
  });

  it('keeps central-world borders image-led and moves ambient fog away from the walkable routes', () => {
    const openFieldSource = methodSlice(
      'private createOpenFieldSeams(): void',
      'private createVillageFarmstead(',
    );

    expect(continuitySource).toContain("horizontal('mistwood', 'village'");
    expect(continuitySource).toContain("horizontal('village', 'minepass'");
    expect(continuitySource).toContain("vertical('village', 'moonfield'");
    expect(openFieldSource).toContain('Terrain and roads at every walkable border');
    expect(openFieldSource).toContain('const moteCount = this.mobileProfile ? 2 : 5');
    expect(openFieldSource).not.toContain('const seams = [');
    expect(openFieldSource).not.toContain('fogCurtains');
    expect(openFieldSource).not.toContain('this.add.ellipse');
    expect(openFieldSource).not.toContain('{ x: 0, y: VILLAGE_TOP + 470');
    expect(openFieldSource).not.toContain('{ x: MAP_WIDTH, y: VILLAGE_TOP + 470');
  });

  it('lets Ulleung feather art lead each passage without mismatched stamped terrain or ellipse fog', () => {
    const ulleungSource = methodSlice(
      'private createUlleungRouteSeams(): void',
      'private positionUlleungContinuityPlaytest(): void',
    );

    expect(ulleungSource).toContain('const detailFramesByTransition = [');
    expect(ulleungSource).toContain('[2, 3, 0]');
    expect(ulleungSource).toContain('[0, 7, 3]');
    expect(ulleungSource).toContain('[8, 2, 1]');
    expect(ulleungSource).toContain('[6, 4, 2]');
    expect(ulleungSource).toContain('const detailCount = this.mobileProfile ? 2 : 3');
    expect(ulleungSource).toContain('.setAlpha(0.28 + (cluster % 2) * 0.04)');
    expect(ulleungSource).not.toContain('(transitionIndex * 2 + cluster) % 9');
    expect(ulleungSource).not.toContain('this.add.ellipse');
  });

  it('keeps region portals as unobstructed names while retaining the raster dungeon entrance', () => {
    const portalSource = methodSlice(
      'private createRegionPortals(): void',
      'private createDungeonEntrance(): void',
    );
    const dungeonEntranceSource = methodSlice(
      'private createDungeonEntrance(): void',
      'private renderDungeonFloor(): void',
    );

    expect(portalSource).toContain('const text = this.add.text(0, -20, label');
    expect(portalSource).toContain('return this.add.container(x, y, [text])');
    expect(portalSource).toContain('.setName(`region-exit-label-${frame}-${label}`)');
    expect(portalSource).not.toContain('this.add.image');
    expect(portalSource).not.toContain('this.add.rectangle');
    expect(portalSource).not.toContain('this.add.ellipse');
    expect(portalSource).not.toContain('ASSETS.props.worldTransitionProps.key');
    expect(portalSource).not.toMatch(/worldTransitionProps\.key\s*,\s*8/);

    expect(dungeonEntranceSource).toContain('ASSETS.props.worldTransitionProps.key, 0');
    expect(dungeonEntranceSource).toContain("setName('muyeong-mine-raster-gate')");
  });

  it('does not restart camera follow while crossing a physical seam', () => {
    expect(sceneSource).toContain('isContinuousWorldNeighbor(previousCameraRegion, event.region)');
    expect(sceneSource).toContain('if (!continuousWorldTravel) {');
    expect(sceneSource).toContain('this.cameras.main.centerOn(this.simulation.player.x, this.simulation.player.y)');
  });

  it('requires the player to reach a campaign gate before travel', () => {
    expect(sceneSource).toContain("this.alertMarker(x, y - 38, '길목 가까이 가서 다시 누르십시오')");
  });
});
