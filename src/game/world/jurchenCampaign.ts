import { JURCHEN_EXPANSION_REGION_IDS } from './jurchenExpansion';
import type { JurchenRegionId, RegionId } from './regions';

export { JURCHEN_EXPANSION_REGION_IDS };

export const JURCHEN_REGION_IDS = [
  'jurchenvillage',
  ...JURCHEN_EXPANSION_REGION_IDS,
] as const satisfies readonly JurchenRegionId[];

export const JURCHEN_TRIBE_REGION_IDS = [
  'baeksanvillage',
  'songhuavillage',
  'heuksuvillage',
] as const satisfies readonly JurchenRegionId[];

export type JurchenRegionCategory = 'village' | 'hunt';

export const JURCHEN_REGION_CATEGORY: Record<JurchenRegionId, JurchenRegionCategory> = {
  jurchenvillage: 'village',
  changbaihunt: 'hunt',
  baeksanvillage: 'village',
  songhuahunt: 'hunt',
  songhuavillage: 'village',
  blackpinehunt: 'hunt',
  heuksuvillage: 'village',
};

export const isJurchenRegion = (region: RegionId): region is JurchenRegionId =>
  (JURCHEN_REGION_IDS as readonly RegionId[]).includes(region);

/**
 * The last stage deliberately returns to the home camp. The campaign can then
 * turn the original south gate back toward the Yalu frontier only after all
 * three tribal oaths have been collected.
 */
export const jurchenForwardDestination = (region: JurchenRegionId): JurchenRegionId => {
  const index = JURCHEN_REGION_IDS.indexOf(region);
  return index >= JURCHEN_REGION_IDS.length - 1
    ? 'jurchenvillage'
    : JURCHEN_REGION_IDS[index + 1];
};

export const jurchenBackwardDestination = (
  region: JurchenRegionId,
): JurchenRegionId | null => {
  const index = JURCHEN_REGION_IDS.indexOf(region);
  return index > 0 ? JURCHEN_REGION_IDS[index - 1] : null;
};

export const JURCHEN_STAGE_COPY: Record<JurchenRegionId, {
  chapter: number;
  title: string;
  objective: string;
  next: string;
}> = {
  jurchenvillage: {
    chapter: 1,
    title: '패전의 귀환',
    objective: '압록 전선의 패잔병을 수습하고 흩어진 부족들을 규합할 장백산 북행길을 여십시오.',
    next: '장백 자작나무 사냥터',
  },
  changbaihunt: {
    chapter: 2,
    title: '장백산의 사슴길',
    objective: '겨울 먹잇감을 확보하고 백산부 경계 전사들의 시험을 통과하십시오.',
    next: '백산부 부족마을',
  },
  baeksanvillage: {
    chapter: 3,
    title: '백산부의 첫 깃발',
    objective: '백산부 족장과 명예 결투를 치르고 첫 번째 부족 맹약을 받으십시오.',
    next: '송화강 사슴벌 사냥터',
  },
  songhuahunt: {
    chapter: 4,
    title: '송화강의 겨울 양식',
    objective: '사슴벌의 산짐승과 강변 순찰대를 돌파해 송화부로 향하는 길을 확보하십시오.',
    next: '송화부 부족마을',
  },
  songhuavillage: {
    chapter: 5,
    title: '송화부 기마 맹약',
    objective: '송화부 기마 전사들의 시험을 이기고 두 번째 부족 맹약과 깃발을 받으십시오.',
    next: '흑송령 산짐승 사냥터',
  },
  blackpinehunt: {
    chapter: 6,
    title: '흑송령을 넘는 자',
    objective: '흑수부가 봉쇄한 침엽수 고개를 통과하고 마지막 회맹장으로 진입하십시오.',
    next: '흑수부 부족마을·회맹장',
  },
  heuksuvillage: {
    chapter: 7,
    title: '세 부족의 회맹',
    objective: '흑수부 족장과 최종 결투를 치르고 세 부족 깃발을 모아 여진 통합을 완수하십시오.',
    next: '여진 설원부락 · 남정 회의',
  },
};
