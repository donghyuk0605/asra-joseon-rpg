import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from './layout';
import {
  JURCHEN_REGION_CATEGORY,
  JURCHEN_REGION_IDS,
  JURCHEN_STAGE_COPY,
  JURCHEN_TRIBE_REGION_IDS,
  isJurchenRegion,
  jurchenBackwardDestination,
  jurchenForwardDestination,
} from './jurchenCampaign';
import { JURCHEN_EXPANSION_REGION_IDS } from './jurchenExpansion';
import { REGIONS, type RegionId } from './regions';

describe('Jurchen tribal unification road', () => {
  it('runs through three hunting grounds and three tribal villages in the fixed order', () => {
    expect(JURCHEN_REGION_IDS).toEqual([
      'jurchenvillage',
      'changbaihunt',
      'baeksanvillage',
      'songhuahunt',
      'songhuavillage',
      'blackpinehunt',
      'heuksuvillage',
    ]);
    expect(JURCHEN_EXPANSION_REGION_IDS).toEqual(JURCHEN_REGION_IDS.slice(1));
    expect(JURCHEN_TRIBE_REGION_IDS).toEqual([
      'baeksanvillage',
      'songhuavillage',
      'heuksuvillage',
    ]);
    expect(
      JURCHEN_REGION_IDS.filter((region) => JURCHEN_REGION_CATEGORY[region] === 'hunt'),
    ).toHaveLength(3);
    expect(
      JURCHEN_REGION_IDS.filter((region) => JURCHEN_REGION_CATEGORY[region] === 'village'),
    ).toHaveLength(4);
  });

  it('places every expansion cell one map north on the existing western column', () => {
    for (const [index, region] of JURCHEN_EXPANSION_REGION_IDS.entries()) {
      const origin = REGION_ORIGINS[region];
      expect(origin.x, region).toBe(-MAP_WIDTH * 6);
      expect(origin.y, region).toBe(-1152 - MAP_HEIGHT * index);
      expect(
        REGION_ORIGINS[JURCHEN_REGION_IDS[index]].y - origin.y,
        `${JURCHEN_REGION_IDS[index]} -> ${region}`,
      ).toBe(MAP_HEIGHT);
    }
  });

  it('returns to the defeated home camp after the final tribal council', () => {
    for (const [index, region] of JURCHEN_REGION_IDS.entries()) {
      const expected = index === JURCHEN_REGION_IDS.length - 1
        ? 'jurchenvillage'
        : JURCHEN_REGION_IDS[index + 1];
      expect(jurchenForwardDestination(region), region).toBe(expected);
      expect(jurchenBackwardDestination(region), region).toBe(
        index === 0 ? null : JURCHEN_REGION_IDS[index - 1],
      );
    }
  });

  it('makes defeat, tribal oaths, and unification the route narrative', () => {
    expect(JURCHEN_STAGE_COPY.jurchenvillage.title).toContain('패전');
    expect(JURCHEN_STAGE_COPY.jurchenvillage.objective).toContain('부족');
    expect(JURCHEN_STAGE_COPY.baeksanvillage.objective).toContain('맹약');
    expect(JURCHEN_STAGE_COPY.songhuavillage.objective).toContain('맹약');
    expect(JURCHEN_STAGE_COPY.heuksuvillage.objective).toContain('여진 통합');
    expect(JURCHEN_STAGE_COPY.heuksuvillage.next).toContain('남정 회의');
    expect(Object.values(JURCHEN_STAGE_COPY).map((stage) => stage.chapter))
      .toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('registers every route region and narrows only Jurchen region ids', () => {
    for (const region of JURCHEN_REGION_IDS) {
      expect(REGIONS[region]).toBeDefined();
      expect(isJurchenRegion(region)).toBe(true);
    }
    for (const region of ['manchufrontier', 'pyongyangouter', 'osaka'] as RegionId[]) {
      expect(isJurchenRegion(region)).toBe(false);
    }
    expect(REGIONS.changbaihunt.name).toBe('장백 자작나무 사냥터');
    expect(REGIONS.baeksanvillage.name).toBe('백산부 부족마을');
    expect(REGIONS.songhuahunt.name).toBe('송화강 사슴벌 사냥터');
    expect(REGIONS.songhuavillage.name).toBe('송화부 부족마을');
    expect(REGIONS.blackpinehunt.name).toBe('흑송령 산짐승 사냥터');
    expect(REGIONS.heuksuvillage.name).toBe('흑수부 부족마을·회맹장');
  });
});
