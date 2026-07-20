export type RegionId = 'solgogae' | 'village' | 'mistwood' | 'minepass' | 'moonfield' | 'dungeon';

export const REGIONS: Record<RegionId, {
  name: string;
  province: string;
  status: string;
  safe: boolean;
  tint?: number;
}> = {
  solgogae: { name: '월영 솔고개', province: '강원도 · 금강산 남녘', status: '분쟁 사냥터', safe: false },
  village: { name: '달빛고을', province: '월영령 · 관아 보호 구역', status: '안전지대', safe: true },
  mistwood: { name: '청람 안개숲', province: '달빛고을 · 서쪽 산림', status: '요괴 출몰지', safe: false, tint: 0xa8c1b4 },
  minepass: { name: '흑철 폐광고개', province: '달빛고을 · 동쪽 광산로', status: '탈영병 점거지', safe: false, tint: 0xc1aa93 },
  moonfield: { name: '월하 그림자들', province: '달빛고을 · 남쪽 들판', status: '산령 출몰지', safe: false, tint: 0x9faed2 },
  dungeon: { name: '무영광산 지하', province: '흑철 폐광 · 봉인 갱도', status: '심층 던전', safe: false, tint: 0x8f765f },
};
