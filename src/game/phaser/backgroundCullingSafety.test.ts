import { describe, expect, it } from 'vitest';
import sceneSource from './HuntingScene.ts?raw';

describe('connected world background visibility', () => {
  it('keeps the combined Solgogae and Moonlight Village painting globally visible', () => {
    expect(sceneSource).toContain('object === this.worldBackground ? null');
  });

  it('keeps transition art for adjacent mainland regions alive at map boundaries', () => {
    expect(sceneSource).toContain("village: ['solgogae', 'mistwood', 'minepass', 'moonfield']");
    expect(sceneSource).toContain("mistwood: ['village', 'yeongwol']");
    expect(sceneSource).toContain("minepass: ['village', 'dungeon']");
  });

  it('streams the three Pyongyang siege maps as one ordered southward campaign chain', () => {
    expect(sceneSource).toContain(
      'for (const neighbor of continuityNeighborsForRegion(activeRegion)) active.add(neighbor)',
    );
    expect(sceneSource).not.toContain("pyongyanginner: ['pyongyanggate', 'gyeongbokgate']");
    expect(sceneSource).not.toContain("manchufrontier: ['gyeongbokinner']");
  });

  it('keeps each selected royal refuge isolated as a final three-tier battlefield', () => {
    expect(sceneSource).toContain('namhansanseong: []');
    expect(sceneSource).toContain('ganghwado: []');
    expect(sceneSource).toContain('for (const region of ROYAL_REFUGE_ROUTE_IDS)');
  });
});
