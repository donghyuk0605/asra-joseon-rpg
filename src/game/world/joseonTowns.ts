import { REGION_ORIGINS } from './layout';
import type {
  FamousJoseonTownRegionId,
  HanseongRegionId,
  JoseonTownRegionId,
  RegionId,
} from './regions';

export const HANSEONG_REGION_IDS = [
  'hanseongsouth',
  'hanseongmarket',
  'changdeokgung',
] as const satisfies readonly HanseongRegionId[];

export const FAMOUS_JOSEON_TOWN_REGION_IDS = [
  'gaeseong',
  'suwon',
  'chungju',
  'andong',
] as const satisfies readonly FamousJoseonTownRegionId[];

export const JOSEON_TOWN_REGION_IDS = [
  'gaeseong',
  'changdeokgung',
  'hanseongmarket',
  'hanseongsouth',
  'suwon',
  'chungju',
  'andong',
] as const satisfies readonly JoseonTownRegionId[];

export const GWANGHAE_MILITIA_RALLY_NPC_IDS = [
  'changdeok-secretary',
  'gaeseong-clerk',
  'jongno-sijeon-master',
  'sungnyemun-post-runner',
  'suwon-officer',
  'chungju-patrol',
  'andong-scholar',
] as const;

export type GwanghaeMilitiaRallyNpcId = typeof GWANGHAE_MILITIA_RALLY_NPC_IDS[number];
export type GwanghaeCampaignPath = 'coup' | 'suppression';

export type GwanghaeMilitiaRallyPoint = Readonly<{
  npcId: GwanghaeMilitiaRallyNpcId;
  region: JoseonTownRegionId;
  label: string;
  message: string;
  recruits: number;
  strengthGain: number;
}>;

/**
 * Seven physical rally contacts on Gwanghae's bunjo road. Their NPC ids are
 * the same ids used by the playable town layouts, so interacting with the
 * visible resident is the only way to register that district's volunteers.
 */
export const GWANGHAE_MILITIA_RALLY_POINTS: Record<
  GwanghaeMilitiaRallyNpcId,
  GwanghaeMilitiaRallyPoint
> = {
  'changdeok-secretary': {
    npcId: 'changdeok-secretary',
    region: 'changdeokgung',
    label: '분조 의병 명부',
    message: '분조 교서를 받들어 금군과 전령 마흔 명을 첫 의병 명부에 올렸습니다.',
    recruits: 40,
    strengthGain: 1,
  },
  'gaeseong-clerk': {
    npcId: 'gaeseong-clerk',
    region: 'gaeseong',
    label: '송도 의병대',
    message: '개성부의 장정과 송상 호위꾼 일흔 명이 군량을 메고 분조에 합류합니다.',
    recruits: 70,
    strengthGain: 2,
  },
  'jongno-sijeon-master': {
    npcId: 'jongno-sijeon-master',
    region: 'hanseongmarket',
    label: '운종가 상단 의용대',
    message: '육의전 상인들이 군량을 내고 시전 의용대 쉰다섯 명을 보내겠습니다.',
    recruits: 55,
    strengthGain: 1,
  },
  'sungnyemun-post-runner': {
    npcId: 'sungnyemun-post-runner',
    region: 'hanseongsouth',
    label: '남대문 파발 의병',
    message: '흩어진 수문군과 파발꾼 예순다섯 명에게 분조의 깃발을 전했습니다.',
    recruits: 65,
    strengthGain: 1,
  },
  'suwon-officer': {
    npcId: 'suwon-officer',
    region: 'suwon',
    label: '수원 둔전 의병',
    message: '수원 군관과 둔전 장정 여든 명이 창과 군량을 갖추어 북상합니다.',
    recruits: 80,
    strengthGain: 2,
  },
  'chungju-patrol': {
    npcId: 'chungju-patrol',
    region: 'chungju',
    label: '목계나루 수운 의병',
    message: '충주목 순라군과 나루 장정 여든다섯 명이 남한강 수운을 지키겠습니다.',
    recruits: 85,
    strengthGain: 2,
  },
  'andong-scholar': {
    npcId: 'andong-scholar',
    region: 'andong',
    label: '안동 향병 명부',
    message: '서원과 향촌에서 뜻을 모은 향병 아흔다섯 명의 이름을 명부에 적었습니다.',
    recruits: 95,
    strengthGain: 3,
  },
};

export const isGwanghaeMilitiaRallyNpc = (
  npcId: string,
): npcId is GwanghaeMilitiaRallyNpcId =>
  Object.prototype.hasOwnProperty.call(GWANGHAE_MILITIA_RALLY_POINTS, npcId);

export const isJoseonTownRegion = (region: RegionId): region is JoseonTownRegionId =>
  (JOSEON_TOWN_REGION_IDS as readonly RegionId[]).includes(region);

export type JoseonTownPoint = Readonly<{ x: number; y: number }>;

export type JoseonTownPath = {
  id: string;
  label: string;
  width: number;
  points: readonly JoseonTownPoint[];
};

export type JoseonTownObstacle =
  | {
    id: string;
    label: string;
    type: 'box';
    x: number;
    y: number;
    width: number;
    height: number;
  }
  | {
    id: string;
    label: string;
    type: 'circle';
    x: number;
    y: number;
    radius: number;
  };

export type JoseonTownNpcRole =
  | 'royal'
  | 'official'
  | 'guard'
  | 'merchant'
  | 'artisan'
  | 'healer'
  | 'scholar'
  | 'boatman'
  | 'porter'
  | 'commoner';

export type JoseonTownNpcPlacement = {
  id: string;
  name: string;
  role: JoseonTownNpcRole;
  x: number;
  y: number;
  patrol?: readonly JoseonTownPoint[];
  dialogue: readonly string[];
};

export type JoseonTownGate = {
  id: string;
  label: string;
  edge: 'north' | 'south';
  destination: JoseonTownRegionId;
  x: number;
  y: number;
  width: number;
  height: number;
  arrivalX: number;
  arrivalY: number;
};

export type JoseonTownLandmark = {
  id: string;
  label: string;
  x: number;
  y: number;
  marker?: boolean;
};

export type JoseonTownLayout = {
  id: JoseonTownRegionId;
  category: 'capital-gate' | 'capital-market' | 'royal-palace' | 'settlement';
  backgroundKey: string;
  backgroundPath: string;
  subtitle: string;
  subtitleY?: number;
  paths: readonly JoseonTownPath[];
  obstacles: readonly JoseonTownObstacle[];
  npcs: readonly JoseonTownNpcPlacement[];
  gates: readonly JoseonTownGate[];
  landmarks: readonly JoseonTownLandmark[];
};

const northSouthRoad = (
  id: string,
  label: string,
  points: readonly JoseonTownPoint[],
  width = 260,
): JoseonTownPath => ({ id, label, width, points });

const box = (
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
): JoseonTownObstacle => ({ id, label, type: 'box', x, y, width, height });

const circle = (
  id: string,
  label: string,
  x: number,
  y: number,
  radius: number,
): JoseonTownObstacle => ({ id, label, type: 'circle', x, y, radius });

const gate = (
  region: JoseonTownRegionId,
  edge: 'north' | 'south',
  destination: JoseonTownRegionId,
  label: string,
): JoseonTownGate => ({
  id: `${region}-${edge}-gate`,
  label,
  edge,
  destination,
  x: 768,
  y: edge === 'north' ? 36 : 988,
  width: 220,
  height: 112,
  arrivalX: 768,
  arrivalY: edge === 'north' ? 858 : 166,
});

const merchant = (
  id: string,
  name: string,
  x: number,
  y: number,
  dialogue: readonly string[],
): JoseonTownNpcPlacement => ({ id, name, role: 'merchant', x, y, dialogue });

const guard = (
  id: string,
  name: string,
  x: number,
  y: number,
  patrol: readonly JoseonTownPoint[],
  dialogue: readonly string[],
): JoseonTownNpcPlacement => ({ id, name, role: 'guard', x, y, patrol, dialogue });

/**
 * Playable map data for the Joseon settlement road.
 *
 * Every map keeps a clear 300px-class north/south corridor. Buildings and
 * trees are represented by explicit collision footprints, so the renderer can
 * layer detailed raster art without letting actors walk over roofs or props.
 */
export const JOSEON_TOWN_LAYOUTS: Record<JoseonTownRegionId, JoseonTownLayout> = {
  gaeseong: {
    id: 'gaeseong',
    category: 'settlement',
    backgroundKey: 'gaeseong-songdo-v1',
    backgroundPath: '/assets/environment/campaign/gaeseong-songdo-v1.webp',
    subtitle: '송상 객주 · 선죽교 행로 · 개성부 장시',
    paths: [
      northSouthRoad('gaeseong-main-road', '송도 남대가', [
        { x: 748, y: 0 }, { x: 720, y: 260 }, { x: 790, y: 520 }, { x: 768, y: 1024 },
      ]),
      northSouthRoad('gaeseong-market-lane', '송상 객주 골목', [
        { x: 760, y: 590 }, { x: 900, y: 570 }, { x: 1000, y: 620 },
      ], 170),
    ],
    obstacles: [
      box('gaeseong-west-houses', '송도 서쪽 기와집', 270, 420, 430, 500),
      box('gaeseong-east-guesthouse', '송상 객주', 1260, 405, 420, 470),
      box('gaeseong-west-stalls', '서쪽 장시 좌판', 355, 765, 310, 220),
      box('gaeseong-east-stalls', '동쪽 장시 좌판', 1195, 780, 280, 210),
      circle('gaeseong-zelkova', '송도 느티나무', 280, 170, 82),
      circle('gaeseong-well', '개성부 우물', 1240, 170, 64),
      box('gaeseong-stream-west', '선죽교 서쪽 물길', 180, 440, 360, 76),
      box('gaeseong-stream-mid', '선죽교 사이 물길', 565, 440, 150, 76),
      box('gaeseong-stream-east', '송도 동쪽 물길', 1218, 455, 636, 76),
    ],
    npcs: [
      { ...merchant('gaeseong-song-sang', '송상 객주 윤필', 1000, 650, [
        '송도의 물목은 북으로 의주, 남으로 한성까지 이어집니다.',
        '길을 나서기 전 행낭과 약재를 점검하십시오.',
      ]), patrol: [{ x: 940, y: 650 }, { x: 1000, y: 650 }, { x: 960, y: 710 }] },
      { id: 'gaeseong-clerk', name: '개성부 서리', role: 'official', x: 560, y: 640, patrol: [{ x: 560, y: 640 }, { x: 650, y: 640 }, { x: 620, y: 705 }], dialogue: ['개성부 장시는 해 질 무렵 문을 닫습니다.'] },
      { id: 'gaeseong-carrier', name: '송상 짐꾼', role: 'porter', x: 820, y: 760, patrol: [{ x: 820, y: 760 }, { x: 720, y: 690 }, { x: 810, y: 610 }], dialogue: ['남대가의 짐은 해 지기 전에 객주로 옮겨야 합니다.'] },
      guard('gaeseong-patrol', '개성부 순라군', 870, 340, [
        { x: 700, y: 330 }, { x: 840, y: 380 }, { x: 760, y: 560 },
      ], ['송도 큰길은 열려 있습니다. 행상 틈의 소매치기를 조심하십시오.']),
    ],
    gates: [
      gate('gaeseong', 'south', 'changdeokgung', '한성 북행로'),
    ],
    landmarks: [
      { id: 'gaeseong-market', label: '송도 장시', x: 1090, y: 570 },
      { id: 'gaeseong-seonjuk-road', label: '선죽교 가는 길', x: 760, y: 140 },
    ],
  },

  changdeokgung: {
    id: 'changdeokgung',
    category: 'royal-palace',
    backgroundKey: 'changdeokgung-audience-v2',
    backgroundPath: '/assets/environment/campaign/changdeokgung-audience-v2.webp',
    subtitle: '돈화문 · 인정전 행각 · 왕세자 광해의 분조청',
    subtitleY: 150,
    paths: [
      northSouthRoad('changdeok-main-axis', '돈화문 어도', [
        { x: 768, y: 0 }, { x: 768, y: 330 }, { x: 742, y: 610 }, { x: 768, y: 1024 },
      ], 300),
    ],
    obstacles: [
      box('changdeok-north-wall-west', '북행 역참문 서궁장', 325, 95, 650, 90),
      box('changdeok-north-wall-east', '북행 역참문 동궁장', 1211, 95, 650, 90),
      box('changdeok-injeongjeon', '인정전 분조청', 430, 230, 440, 280),
      box('changdeok-east-offices', '분조 동쪽 행각', 1170, 245, 460, 330),
      box('changdeok-west-corridor', '분조 서쪽 행각', 155, 555, 220, 500),
      box('changdeok-east-corridor', '분조 동쪽 행각', 1215, 650, 390, 330),
      circle('changdeok-west-pine', '어전 서쪽 노송', 470, 650, 108),
      circle('changdeok-east-pine', '어전 동쪽 노송', 1035, 655, 104),
      box('changdeok-south-wall-west', '돈화문 서궁장', 325, 835, 650, 96),
      box('changdeok-south-wall-east', '돈화문 동궁장', 1211, 835, 650, 96),
    ],
    npcs: [
      {
        id: 'crown-prince-gwanghae',
        name: '왕세자 광해',
        role: 'royal',
        x: 768,
        y: 420,
        patrol: [{ x: 720, y: 420 }, { x: 816, y: 420 }],
        dialogue: [
          '선조 전하께서 내게 분조를 맡기셨다. 전란이 남긴 폐허를 수습하지 못하면 백성의 내일도 없다.',
          '명분보다 살아 있는 백성을 먼저 보아라. 국경과 장시의 사정을 직접 살피라.',
        ],
      },
      guard('changdeok-geumgun-west', '겸사복 금군', 610, 560, [
        { x: 620, y: 520 }, { x: 650, y: 610 },
      ], ['어전 앞에서는 무기를 거두십시오.']),
      guard('changdeok-geumgun-east', '내금위 군사', 926, 560, [
        { x: 900, y: 540 }, { x: 850, y: 620 },
      ], ['선조 전하께서 왕세자의 변방 장계를 기다리고 계십니다.']),
      { id: 'changdeok-secretary', name: '승정원 주서', role: 'official', x: 900, y: 450, patrol: [{ x: 900, y: 450 }, { x: 820, y: 470 }, { x: 860, y: 535 }], dialogue: ['상소와 장계는 차례대로 올리고 있습니다.'] },
      { id: 'changdeok-courier', name: '분조 전령', role: 'porter', x: 770, y: 560, patrol: [{ x: 770, y: 560 }, { x: 770, y: 700 }, { x: 710, y: 650 }], dialogue: ['왕세자 저하의 장계를 북방과 남도에 전하러 갑니다.'] },
    ],
    gates: [
      gate('changdeokgung', 'north', 'gaeseong', '개성 북행로'),
      gate('changdeokgung', 'south', 'hanseongmarket', '종루·운종가'),
    ],
    landmarks: [
      { id: 'changdeok-injeongjeon', label: '인정전 분조청', x: 430, y: 205, marker: false },
      { id: 'changdeok-north-road', label: '개성 북행 역참문', x: 768, y: 112 },
      { id: 'changdeok-donhwamun', label: '돈화문', x: 768, y: 885 },
    ],
  },

  hanseongmarket: {
    id: 'hanseongmarket',
    category: 'capital-market',
    backgroundKey: 'hanseong-unjongga-v1',
    backgroundPath: '/assets/environment/campaign/hanseong-unjongga-v1.webp',
    subtitle: '종루 · 운종가 · 육의전 시전 행랑',
    paths: [
      northSouthRoad('jongno-main-road', '종루 남북길', [
        { x: 780, y: 0 }, { x: 735, y: 260 }, { x: 790, y: 520 }, { x: 760, y: 1024 },
      ], 310),
      northSouthRoad('unjongga', '운종가', [
        { x: 120, y: 590 }, { x: 250, y: 590 }, { x: 620, y: 590 },
        { x: 790, y: 590 }, { x: 1000, y: 590 }, { x: 1220, y: 590 }, { x: 1416, y: 590 },
      ], 230),
    ],
    obstacles: [
      box('jongno-west-shops-north', '운종가 북서 시전', 250, 190, 470, 300),
      box('jongno-east-shops-north', '운종가 북동 시전', 1235, 195, 430, 300),
      box('jongno-west-shops-south', '운종가 남서 시전', 245, 800, 450, 330),
      box('jongno-east-shops-south', '운종가 남동 시전', 1240, 790, 430, 350),
      box('jongno-bell-pavilion', '종루', 430, 425, 300, 280),
      circle('jongno-well', '운종가 우물', 1135, 485, 66),
    ],
    npcs: [
      { ...merchant('jongno-sijeon-master', '육의전 행수', 980, 610, [
        '면포와 약재, 쇠붙이까지 한성의 물산은 운종가로 모입니다.',
        '개성과 수원의 장시를 다녀오면 더 귀한 물목을 열어 드리지요.',
      ]), patrol: [{ x: 900, y: 610 }, { x: 980, y: 610 }, { x: 940, y: 680 }] },
      { id: 'jongno-healer', name: '혜민서 의녀', role: 'healer', x: 650, y: 610, patrol: [{ x: 620, y: 610 }, { x: 700, y: 610 }, { x: 680, y: 675 }], dialogue: ['상처가 깊다면 혜민서에서 먼저 치료받으십시오.'] },
      { id: 'jongno-porter', name: '시전 짐꾼', role: 'porter', x: 970, y: 500, patrol: [{ x: 880, y: 470 }, { x: 980, y: 520 }, { x: 900, y: 590 }], dialogue: ['장시가 열리는 날은 발 디딜 틈도 없습니다.'] },
      { id: 'jongno-water-carrier', name: '운종가 물지게꾼', role: 'commoner', x: 830, y: 760, patrol: [{ x: 830, y: 760 }, { x: 760, y: 690 }, { x: 820, y: 610 }], dialogue: ['시전의 불씨가 꺼지지 않게 우물물을 나르고 있습니다.'] },
      guard('jongno-patrol', '한성부 순라군', 650, 700, [
        { x: 560, y: 700 }, { x: 760, y: 750 }, { x: 950, y: 690 },
      ], ['야간 통행에는 호패를 지니십시오.']),
    ],
    gates: [
      gate('hanseongmarket', 'north', 'changdeokgung', '창덕궁 돈화문'),
      gate('hanseongmarket', 'south', 'hanseongsouth', '숭례문·칠패장'),
    ],
    landmarks: [
      { id: 'jongno-bell', label: '종루', x: 430, y: 300, marker: false },
      { id: 'unjongga-market', label: '운종가 시전', x: 1110, y: 560 },
    ],
  },

  hanseongsouth: {
    id: 'hanseongsouth',
    category: 'capital-gate',
    backgroundKey: 'hanseong-sungnyemun-v2',
    backgroundPath: '/assets/environment/campaign/hanseong-sungnyemun-v2.webp',
    subtitle: '숭례문 · 칠패 장시 · 남대문 역참',
    subtitleY: 150,
    paths: [
      northSouthRoad('sungnyemun-road', '남대문 대로', [
        { x: 768, y: 0 }, { x: 795, y: 290 }, { x: 740, y: 610 }, { x: 768, y: 1024 },
      ], 320),
      northSouthRoad('chilpae-market-road', '칠패 장시길', [
        { x: 740, y: 710 }, { x: 900, y: 735 }, { x: 1000, y: 735 },
      ], 190),
    ],
    obstacles: [
      box('sungnyemun-west-wall', '숭례문 서쪽 도성', 285, 390, 570, 150),
      box('sungnyemun-east-wall', '숭례문 동쪽 도성', 1251, 390, 570, 150),
      box('sungnyemun-west-gatehouse', '숭례문 서문체', 570, 410, 160, 260),
      box('sungnyemun-east-gatehouse', '숭례문 동문체', 966, 410, 160, 260),
      box('chilpae-west-stalls', '칠패 서쪽 장막', 300, 735, 430, 290),
      box('chilpae-east-stalls', '칠패 동쪽 장막', 1245, 735, 410, 290),
      circle('sungnyemun-horse-trough', '역참 말구유', 1080, 510, 58),
    ],
    npcs: [
      { ...merchant('chilpae-peddler', '칠패 장돌뱅이', 940, 780, ['수원과 충주에서 올라온 곡물이 오늘 막 풀렸습니다.']), patrol: [{ x: 860, y: 780 }, { x: 940, y: 780 }, { x: 900, y: 850 }] },
      { id: 'sungnyemun-stableman', name: '남대문 마부', role: 'porter', x: 970, y: 600, patrol: [{ x: 900, y: 600 }, { x: 970, y: 600 }, { x: 930, y: 670 }], dialogue: ['남쪽 큰길은 수원 읍치와 충주까지 이어집니다.'] },
      { id: 'sungnyemun-post-runner', name: '남대문 역졸', role: 'porter', x: 770, y: 700, patrol: [{ x: 770, y: 700 }, { x: 770, y: 840 }, { x: 700, y: 790 }], dialogue: ['수원 역참으로 내려가는 파발입니다. 길을 비켜 주십시오.'] },
      guard('sungnyemun-guard-west', '숭례문 수문군', 660, 570, [
        { x: 620, y: 570 }, { x: 620, y: 660 },
      ], ['도성 안으로 드는 자는 호패를 보이시오.']),
      guard('sungnyemun-guard-east', '숭례문 수문군', 876, 570, [
        { x: 916, y: 570 }, { x: 916, y: 660 },
      ], ['칠패 장시는 문밖 동쪽 길입니다.']),
    ],
    gates: [
      gate('hanseongsouth', 'north', 'hanseongmarket', '종루·운종가'),
      gate('hanseongsouth', 'south', 'suwon', '수원 남행로'),
    ],
    landmarks: [
      { id: 'sungnyemun', label: '숭례문', x: 768, y: 520, marker: false },
      { id: 'chilpae-market', label: '칠패장', x: 980, y: 700 },
    ],
  },

  suwon: {
    id: 'suwon',
    category: 'settlement',
    backgroundKey: 'suwon-dohobu-v1',
    backgroundPath: '/assets/environment/campaign/suwon-dohobu-v1.webp',
    subtitle: '수원도호부 읍치 · 관아 장터 · 남행 역참',
    paths: [
      northSouthRoad('suwon-post-road', '수원 역로', [
        { x: 768, y: 0 }, { x: 735, y: 300 }, { x: 805, y: 620 }, { x: 768, y: 1024 },
      ]),
      northSouthRoad('suwon-market-lane', '읍치 장터길', [
        { x: 520, y: 650 }, { x: 760, y: 650 }, { x: 920, y: 650 },
      ], 170),
    ],
    obstacles: [
      box('suwon-west-houses', '수원 서쪽 민가', 270, 315, 470, 430),
      box('suwon-government-office', '수원도호부 관아', 1215, 210, 430, 300),
      box('suwon-paddies', '수원 둔전과 수로', 230, 790, 460, 410),
      box('suwon-smithy', '수원 대장간', 1240, 805, 420, 330),
      box('suwon-relay-yard', '수원 역참 마방', 1180, 505, 450, 260),
      circle('suwon-well', '수원 읍치 우물', 535, 545, 58),
    ],
    npcs: [
      { ...merchant('suwon-grain-merchant', '수원 곡물상', 850, 720, ['둔전에서 거둔 곡식과 마른 군량을 팔고 있습니다.']), patrol: [{ x: 780, y: 720 }, { x: 880, y: 720 }, { x: 840, y: 790 }] },
      { id: 'suwon-postmaster', name: '수원 역리', role: 'official', x: 850, y: 540, patrol: [{ x: 780, y: 540 }, { x: 850, y: 540 }, { x: 820, y: 610 }], dialogue: ['북쪽은 한성, 남쪽은 충주로 이어지는 역로입니다.'] },
      { id: 'suwon-smith-runner', name: '수원 대장간 심부름꾼', role: 'porter', x: 900, y: 820, patrol: [{ x: 900, y: 820 }, { x: 780, y: 850 }, { x: 820, y: 740 }], dialogue: ['장인이 군관의 칼과 호미를 함께 벼리고 있습니다.'] },
      guard('suwon-officer', '수원 군관', 620, 470, [
        { x: 620, y: 470 }, { x: 700, y: 560 },
      ], ['수원 읍치 관아 앞입니다. 장시에서 소란을 피우지 마시오.']),
    ],
    gates: [
      gate('suwon', 'north', 'hanseongsouth', '한성 숭례문'),
      gate('suwon', 'south', 'chungju', '충주 남행로'),
    ],
    landmarks: [
      { id: 'suwon-office', label: '수원도호부', x: 1215, y: 250 },
      { id: 'suwon-market', label: '수원 읍치 장터', x: 1100, y: 670 },
    ],
  },

  chungju: {
    id: 'chungju',
    category: 'settlement',
    backgroundKey: 'chungju-mokgye-v1',
    backgroundPath: '/assets/environment/campaign/chungju-mokgye-v1.webp',
    subtitle: '남한강 물길 · 목계나루 · 충주목 장시',
    paths: [
      northSouthRoad('chungju-road', '충주 남북길', [
        { x: 760, y: 0 }, { x: 810, y: 310 }, { x: 740, y: 660 }, { x: 768, y: 1024 },
      ], 260),
      northSouthRoad('mokgye-wharf-road', '목계나루 진입로', [
        { x: 750, y: 700 }, { x: 880, y: 700 }, { x: 980, y: 700 },
      ], 180),
    ],
    obstacles: [
      box('chungju-river-northwest', '남한강 북서 물가', 250, 240, 500, 480),
      box('chungju-river-southwest', '남한강 남서 물가', 250, 785, 500, 470),
      box('chungju-river-west-channel', '목계교 서쪽 물길', 580, 440, 160, 250),
      box('chungju-river-east-channel', '목계교 동쪽 물길', 1050, 440, 320, 240),
      box('chungju-east-warehouse', '목계나루 창고', 1250, 225, 420, 340),
      box('chungju-east-fishmarket', '목계 어물전', 1245, 535, 430, 260),
      box('chungju-east-inn', '목계 객주', 1240, 805, 420, 330),
      circle('chungju-ferry-post', '나루 말뚝', 1015, 420, 52),
    ],
    npcs: [
      { id: 'mokgye-boatman', name: '목계나루 사공', role: 'boatman', x: 900, y: 620, patrol: [{ x: 850, y: 620 }, { x: 940, y: 620 }, { x: 900, y: 680 }], dialogue: ['물살이 잠잠해지면 남한강 배를 띄우겠습니다.'] },
      { ...merchant('chungju-herbalist', '충주 약재상', 900, 740, ['소백산에서 내려온 약초와 마른 버섯이 있습니다.']), patrol: [{ x: 820, y: 740 }, { x: 930, y: 740 }, { x: 880, y: 810 }] },
      { id: 'mokgye-carrier', name: '목계나루 짐꾼', role: 'porter', x: 780, y: 760, patrol: [{ x: 780, y: 760 }, { x: 850, y: 700 }, { x: 780, y: 620 }], dialogue: ['강 건너온 소금 자루를 장시로 옮기는 중입니다.'] },
      guard('chungju-patrol', '충주목 순라군', 700, 620, [
        { x: 700, y: 620 }, { x: 740, y: 690 }, { x: 850, y: 620 },
      ], ['나루의 화물은 충주목에서 검수합니다.']),
    ],
    gates: [
      gate('chungju', 'north', 'suwon', '수원·한성 북행로'),
      gate('chungju', 'south', 'andong', '안동 남동행로'),
    ],
    landmarks: [
      { id: 'mokgye-ferry', label: '목계나루', x: 850, y: 640 },
      { id: 'chungju-market', label: '충주목 장시', x: 1070, y: 690 },
    ],
  },

  andong: {
    id: 'andong',
    category: 'settlement',
    backgroundKey: 'andong-seowon-v1',
    backgroundPath: '/assets/environment/campaign/andong-seowon-v1.webp',
    subtitle: '안동대도호부 · 서원길 · 한지와 목공 장인촌',
    paths: [
      northSouthRoad('andong-seowon-road', '안동 서원길', [
        { x: 768, y: 0 }, { x: 720, y: 270 }, { x: 795, y: 590 }, { x: 768, y: 1024 },
      ], 250),
      northSouthRoad('andong-workshop-lane', '장인 공방길', [
        { x: 750, y: 650 }, { x: 900, y: 680 }, { x: 970, y: 720 },
      ], 160),
    ],
    obstacles: [
      box('andong-government-office', '안동부 관아', 285, 300, 460, 390),
      box('andong-seowon', '안동 서원', 1245, 280, 430, 410),
      box('andong-paper-workshop', '한지 공방', 340, 760, 390, 270),
      box('andong-wood-workshop', '목공 공방', 1200, 770, 370, 270),
      circle('andong-scholar-tree', '서원 회화나무', 1050, 430, 120),
      circle('andong-stone-pagoda', '안동 석탑', 440, 535, 66),
    ],
    npcs: [
      { id: 'andong-scholar', name: '안동 유생 이겸', role: 'scholar', x: 900, y: 520, patrol: [{ x: 830, y: 520 }, { x: 930, y: 520 }, { x: 880, y: 590 }], dialogue: ['무공만으로 세상을 바로잡을 수는 없습니다. 백성의 사정도 기록해 두십시오.'] },
      { id: 'andong-paper-master', name: '한지 장인', role: 'artisan', x: 650, y: 690, patrol: [{ x: 650, y: 690 }, { x: 760, y: 690 }, { x: 710, y: 760 }], dialogue: ['질긴 닥종이는 무공 비급과 강화 주문서를 오래 보존합니다.'] },
      { ...merchant('andong-craftsman', '안동 목기상', 900, 730, ['가볍고 단단한 목제 장비를 살펴보시겠습니까?']), patrol: [{ x: 820, y: 730 }, { x: 940, y: 730 }, { x: 880, y: 800 }] },
      { id: 'andong-copyist', name: '서원 필사생', role: 'commoner', x: 780, y: 620, patrol: [{ x: 780, y: 620 }, { x: 850, y: 580 }, { x: 800, y: 520 }], dialogue: ['분조의 장계와 의병 명부를 밤새 베껴 쓰고 있습니다.'] },
      guard('andong-officer', '안동부 군관', 575, 500, [
        { x: 575, y: 500 }, { x: 690, y: 610 },
      ], ['북문 길은 충주 목계나루로 이어집니다.']),
    ],
    gates: [
      gate('andong', 'north', 'chungju', '충주·한성 북행로'),
    ],
    landmarks: [
      { id: 'andong-seowon', label: '안동 서원', x: 1160, y: 250 },
      { id: 'andong-paper', label: '한지 공방', x: 390, y: 690 },
    ],
  },
};

export type JoseonTownWorldObstacle =
  | { type: 'box'; x: number; y: number; width: number; height: number }
  | { type: 'circle'; x: number; y: number; radius: number };

export const joseonTownWorldObstacles = (): JoseonTownWorldObstacle[] => (
  JOSEON_TOWN_REGION_IDS.flatMap((region) => {
    const origin = REGION_ORIGINS[region];
    return JOSEON_TOWN_LAYOUTS[region].obstacles.map((obstacle): JoseonTownWorldObstacle => (
      obstacle.type === 'circle'
        ? {
          type: 'circle',
          x: origin.x + obstacle.x,
          y: origin.y + obstacle.y,
          radius: obstacle.radius,
        }
        : {
          type: 'box',
          x: origin.x + obstacle.x,
          y: origin.y + obstacle.y,
          width: obstacle.width,
          height: obstacle.height,
        }
    ));
  })
);

export const joseonTownGate = (
  region: JoseonTownRegionId,
  edge: 'north' | 'south',
): JoseonTownGate | null =>
  JOSEON_TOWN_LAYOUTS[region].gates.find((candidate) => candidate.edge === edge) ?? null;
