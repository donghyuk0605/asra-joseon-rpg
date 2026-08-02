import type { JapanRegionId, RegionId } from './regions';

export const JAPAN_REGION_IDS = [
  'osaka',
  'settsuvillage',
  'yamazakihunt',
  'osakacastle',
  'shogunkeep',
  'sakaicity',
  'izumihunt',
  'awajicoast',
  'ikiport',
  'tsushimahunt',
  'izuhara',
] as const satisfies readonly JapanRegionId[];

export const isJapanRegion = (region: RegionId): region is JapanRegionId => {
  return (JAPAN_REGION_IDS as readonly RegionId[]).includes(region);
};

export const japanForwardDestination = (region: JapanRegionId): RegionId => {
  const index = JAPAN_REGION_IDS.indexOf(region);
  return index >= JAPAN_REGION_IDS.length - 1 ? 'busanjin' : JAPAN_REGION_IDS[index + 1];
};

export const japanBackwardDestination = (region: JapanRegionId): JapanRegionId | null => {
  const index = JAPAN_REGION_IDS.indexOf(region);
  return index > 0 ? JAPAN_REGION_IDS[index - 1] : null;
};

export const JAPAN_STAGE_COPY: Record<JapanRegionId, {
  chapter: number;
  title: string;
  objective: string;
  next: string;
}> = {
  osaka: {
    chapter: 1,
    title: '타향의 초혼',
    objective: '포로촌 감시대와 출병항 낭인을 쓰러뜨리고 셋쓰 내륙문을 여십시오.',
    next: '셋쓰 산촌',
  },
  settsuvillage: {
    chapter: 2,
    title: '징발당한 산촌',
    objective: '백성을 끌고 가는 낭인 징발대와 조총 감시병을 제압하십시오.',
    next: '야마자키 사냥숲',
  },
  yamazakihunt: {
    chapter: 3,
    title: '덴노산의 짐승과 화살',
    objective: '사냥숲의 야수와 매복 궁수대를 돌파해 오사카 성로를 찾으십시오.',
    next: '오사카 성하마을',
  },
  osakacastle: {
    chapter: 4,
    title: '성 아래의 군화',
    objective: '아시가루 네 전열과 다이묘 지휘부를 무너뜨려 천수각 외문을 여십시오.',
    next: '쇼군 성채',
  },
  shogunkeep: {
    chapter: 5,
    title: '검은 부채의 쇼군',
    objective: '성채 친위대와 쇼군을 꺾고 조선 침공 명령서와 출병선을 빼앗으십시오.',
    next: '사카이 자유항',
  },
  sakaicity: {
    chapter: 6,
    title: '상인의 검은 장부',
    objective: '침공 물자를 대는 항구 용병대를 제압하고 대마도로 향하는 보급 항로를 찾으십시오.',
    next: '이즈미 대나무 고개',
  },
  izumihunt: {
    chapter: 7,
    title: '대숲의 추격자',
    objective: '대숲의 야수와 낭인 매복대를 돌파해 아와지 해협으로 내려가십시오.',
    next: '아와지 해협 사냥터',
  },
  awajicoast: {
    chapter: 8,
    title: '해협의 왜구 봉화',
    objective: '해안 초소와 왜구 척후대를 무너뜨리고 이키섬으로 건너갈 배를 확보하십시오.',
    next: '이키 고노우라 항구',
  },
  ikiport: {
    chapter: 9,
    title: '중간항의 사슬',
    objective: '보급항을 지키는 왜구와 조총대를 격파하고 대마도 항로를 여십시오.',
    next: '대마도 아리아케 산림',
  },
  tsushimahunt: {
    chapter: 10,
    title: '아리아케의 매복',
    objective: '산림의 짐승과 도주군 매복대를 쫓아 이즈하라 성하로 진입하십시오.',
    next: '대마도 이즈하라 성하',
  },
  izuhara: {
    chapter: 11,
    title: '귀환을 막는 성문',
    objective: '대마도 도주군과 부산포 출항대를 쓰러뜨리고 조선으로 향하는 마지막 배를 빼앗으십시오.',
    next: '부산진',
  },
};
