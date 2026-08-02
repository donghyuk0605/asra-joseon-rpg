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
  // Two compact kitchen-field strips sit between the village compounds and
  // market perimeter. Keeping them outside x=645..925 preserves the broad
  // north-south road, while their visible soil no longer overlaps the well,
  // market awnings or the southern rock shelves.
  { id: 'northwest-field', x: 225, y: 510, width: 190, height: 88, initialStage: 'furrowed' },
  { id: 'southwest-field', x: 435, y: 510, width: 190, height: 88, initialStage: 'ripe' },
  { id: 'northeast-field', x: 1100, y: 560, width: 190, height: 88, initialStage: 'sown' },
  { id: 'southeast-field', x: 1320, y: 560, width: 190, height: 88, initialStage: 'growing' },
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
    points: [{ x: 180, y: 466 }, { x: 270, y: 496 }],
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
    points: [{ x: 1055, y: 500 }, { x: 1145, y: 540 }],
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
    points: [{ x: 390, y: 466 }, { x: 480, y: 496 }],
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
    points: [{ x: 1275, y: 500 }, { x: 1365, y: 540 }],
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
