export type FrontierSectorId = 'jurchen-rear' | 'frozen-ford' | 'broken-palisade' | 'joseon-outpost';

export type FrontierSector = {
  id: FrontierSectorId;
  name: string;
  status: string;
};

export const FRONTIER_SECTORS: Record<FrontierSectorId, FrontierSector> = {
  'jurchen-rear': {
    id: 'jurchen-rear',
    name: '여진 선봉 후영',
    status: '압록 이북 · 군막 · 보급 썰매 · 북쪽 안전지대',
  },
  'frozen-ford': {
    id: 'frozen-ford',
    name: '압록 얼음 나루',
    status: '깨진 얼음길 · 짐승 흔적 · 양군 척후',
  },
  'broken-palisade': {
    id: 'broken-palisade',
    name: '무너진 변경 목책',
    status: '창병 전열 · 끊어진 군량로 · 격전지',
  },
  'joseon-outpost': {
    id: 'joseon-outpost',
    name: '조선 압록 진보',
    status: '환도 전열 · 장창 중군 · 궁수 지휘부',
  },
};

export const frontierSectorAt = (localY: number): FrontierSector => {
  if (localY <= 310) return FRONTIER_SECTORS['jurchen-rear'];
  if (localY <= 485) return FRONTIER_SECTORS['frozen-ford'];
  if (localY <= 650) return FRONTIER_SECTORS['broken-palisade'];
  return FRONTIER_SECTORS['joseon-outpost'];
};
