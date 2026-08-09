export type FarmWorkAction = 'till' | 'sow' | 'water' | 'harvest';
export type FarmPlotStage = 'furrowed' | 'sown' | 'growing' | 'ripe';
export type FarmerAppearance = 'male-sower' | 'male-ploughman' | 'female-sower' | 'female-waterer';

export type VillageFarmPlot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  initialStage: FarmPlotStage;
};

export type VillageFarmer = {
  id: string;
  name: string;
  dialogue: string;
  appearance: FarmerAppearance;
  plotId: string;
  work: FarmWorkAction;
  tint: number;
  scale: number;
  speed: number;
  points: Array<{ x: number; y: number }>;
};

export const FARM_WORK_LABELS: Record<FarmWorkAction, string> = {
  till: '밭갈이',
  sow: '씨뿌리기',
  water: '물주기',
  harvest: '수확',
};

export const VILLAGE_FARM_PLOTS: VillageFarmPlot[] = [
  // The village has two real crossing roads: the 280px north/south avenue and
  // the east/west route between Mistwood and Mine Pass. The former strips sat
  // directly across the side gates. Four compact kitchen plots now occupy the
  // alcoves above and below that crossing, leaving both axes fully walkable.
  { id: 'northwest-field', x: 555, y: 360, width: 140, height: 76, initialStage: 'furrowed' },
  { id: 'southwest-field', x: 555, y: 850, width: 140, height: 76, initialStage: 'ripe' },
  { id: 'northeast-field', x: 1015, y: 360, width: 140, height: 76, initialStage: 'sown' },
  { id: 'southeast-field', x: 1190, y: 850, width: 170, height: 76, initialStage: 'growing' },
];

export const VILLAGE_FARMERS: VillageFarmer[] = [
  {
    id: 'field-ploughman-manbok',
    name: '밭지기 만복',
    dialogue: '흙은 거짓말을 안 하지. 비 오기 전에 이 고랑을 끝내야 하오.',
    appearance: 'male-ploughman',
    plotId: 'northwest-field',
    work: 'till',
    tint: 0xffffff,
    scale: 0.52,
    speed: 22,
    points: [{ x: 525, y: 318 }, { x: 585, y: 338 }],
  },
  {
    id: 'seed-farmer-okbun',
    name: '농민 김옥분',
    dialogue: '콩과 조를 섞어 뿌리면 흉년에도 한 가지는 살아남아요.',
    appearance: 'female-sower',
    plotId: 'northeast-field',
    work: 'sow',
    tint: 0xffffff,
    scale: 0.54,
    speed: 21,
    points: [{ x: 985, y: 318 }, { x: 1045, y: 338 }],
  },
  {
    id: 'harvest-hand-bokchil',
    name: '품팔이 복칠',
    dialogue: '익은 이삭부터 베어 광에 들여야 산짐승에게 안 뺏기지.',
    appearance: 'male-sower',
    plotId: 'southwest-field',
    work: 'harvest',
    tint: 0xbaa788,
    scale: 0.49,
    speed: 24,
    points: [{ x: 525, y: 808 }, { x: 585, y: 828 }],
  },
  {
    id: 'water-farmer-kkeutsun',
    name: '농민 박끝순',
    dialogue: '새벽 우물물은 차서 어린 싹이 오래 버텨요. 뿌리만 적셔야 해요.',
    appearance: 'female-waterer',
    plotId: 'southeast-field',
    work: 'water',
    tint: 0xffffff,
    scale: 0.59,
    speed: 20,
    points: [{ x: 1150, y: 808 }, { x: 1230, y: 828 }],
  },
];

export const advanceFarmPlotStage = (
  current: FarmPlotStage,
  action: FarmWorkAction,
): FarmPlotStage => {
  if (action === 'till') return 'furrowed';
  if (action === 'sow') return 'sown';
  if (action === 'harvest') return 'furrowed';
  if (current === 'sown') return 'growing';
  if (current === 'growing') return 'ripe';
  return current;
};
