export type PyongyangRegionId = 'pyongyangouter' | 'pyongyanggate' | 'pyongyanginner';
export type RoyalRefugeRegionId = 'namhansanseong' | 'ganghwado';
export type HanseongRegionId = 'hanseongsouth' | 'hanseongmarket' | 'changdeokgung';
export type FamousJoseonTownRegionId = 'gaeseong' | 'suwon' | 'chungju' | 'andong';
export type JoseonTownRegionId = HanseongRegionId | FamousJoseonTownRegionId;
export type ExtendedRegionId = 'wonju' | 'gangneung' | 'haeju' | 'geoje';
export const EPISODE2_REGION_IDS = [
  'hwangju', 'jaeryeong', 'anju', 'uiju',
  'yangju', 'gapyeong', 'pyeongchang', 'samcheok',
  'icheon', 'yeoju', 'cheongju', 'gongju',
  'jemulpo', 'namyang', 'boryeong', 'gunsan',
  'namwon', 'suncheon', 'mokpo', 'naju',
  'sangju', 'daegu', 'jinju', 'tongyeong',
] as const;
export type Episode2RegionId = typeof EPISODE2_REGION_IDS[number];
export type JurchenExpansionRegionId =
  | 'changbaihunt'
  | 'baeksanvillage'
  | 'songhuahunt'
  | 'songhuavillage'
  | 'blackpinehunt'
  | 'heuksuvillage';
export type JurchenRegionId = 'jurchenvillage' | JurchenExpansionRegionId;
export type JapanExpansionRegionId =
  | 'sakaicity'
  | 'izumihunt'
  | 'awajicoast'
  | 'ikiport'
  | 'tsushimahunt'
  | 'izuhara';
export type JapanRegionId =
  | 'osaka'
  | 'settsuvillage'
  | 'yamazakihunt'
  | 'osakacastle'
  | 'shogunkeep'
  | JapanExpansionRegionId;

export type RegionId = 'solgogae' | 'village' | 'mistwood' | 'yeongwol' | 'yeongwolhq'
  | 'jeonjufield' | 'jeonjugate' | 'jeonju'
  | JapanRegionId | 'busanjin' | 'tangeumdae' | 'gyeongbokgate' | 'gyeongbokcourt' | 'gyeongbokinner'
  | JoseonTownRegionId
  | JurchenRegionId | 'manchufrontier' | PyongyangRegionId | RoyalRefugeRegionId
  | 'minepass' | 'moonfield' | 'dungeon' | 'ulleungdo' | 'ulleungcoast' | 'ulleungmeadow'
  | 'ulleunghunt' | 'ulleungridge' | 'ulleungvillage' | ExtendedRegionId | Episode2RegionId;

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
  yeongwol: { name: '영월 관아 앞 훈련마당', province: '강원도 · 영월 대도호부 외곽', status: '훈련대 · 궁수대 · 장창대', safe: false, tint: 0x9b9386 },
  yeongwolhq: { name: '영월 관아 지휘부', province: '강원도 · 영월 대도호부 내아', status: '정예 방패군 · 별장 지휘부', safe: false, tint: 0x8f8178 },
  jeonjufield: { name: '전주 완산벌 대사냥터', province: '전라도 · 전주성 동쪽 들판', status: '광역 사냥터 · 탈영군 수색대', safe: false, tint: 0x9c927d },
  jeonjugate: { name: '전주성 풍남문 대회전', province: '전라도 · 전주성 외성', status: '대규모 진형전 · 성문 돌파', safe: false, tint: 0x9a8172 },
  jeonju: { name: '전주성 대읍성', province: '전라도 감영 · 전주부', status: '시장 · 군영 · 감영 최종전', safe: false, tint: 0x8f8277 },
  osaka: { name: '오사카 외항 포로촌', province: '일본 셋쓰국 · 오사카 출병항', status: '포로 감시대 · 침공 선단 출항 준비', safe: false, tint: 0x718596 },
  settsuvillage: { name: '셋쓰 달그림자 산촌', province: '일본 셋쓰국 · 오사카 북동 산길', status: '산촌 장터 · 낭인 징발대', safe: false, tint: 0x778b7d },
  yamazakihunt: { name: '야마자키 삼나무 사냥숲', province: '일본 야마자키 · 덴노산 기슭', status: '사슴 · 멧돼지 · 매복 궁수', safe: false, tint: 0x6f8777 },
  osakacastle: { name: '오사카 성하마을', province: '일본 셋쓰국 · 오사카성 외곽', status: '상가 거리 · 아시가루 주둔지', safe: false, tint: 0x80766f },
  shogunkeep: { name: '오사카 군선봉행 성채', province: '일본 오사카성 · 천수각 내곽', status: '다이묘 친위대 · 군선봉행 결전', safe: false, tint: 0x746b6a },
  sakaicity: { name: '사카이 자유항', province: '일본 이즈미국 · 사카이 상인도시', status: '항구 장터 · 용병 검문대', safe: false, tint: 0x738887 },
  izumihunt: { name: '이즈미 대나무 고개', province: '일본 이즈미국 · 가쓰라기 산록', status: '대숲 사냥터 · 낭인 매복로', safe: false, tint: 0x708676 },
  awajicoast: { name: '아와지 해협 사냥터', province: '일본 아와지국 · 세토 내해 바닷길', status: '해안 야수 · 왜구 초소', safe: false, tint: 0x6d858c },
  ikiport: { name: '이키 고노우라 항구', province: '일본 이키국 · 조선 해협 중간항', status: '섬 장터 · 왜구 보급항', safe: false, tint: 0x78837c },
  tsushimahunt: { name: '대마도 아리아케 산림', province: '일본 쓰시마국 · 아리아케산 남록', status: '사슴 군락 · 산적과 궁수', safe: false, tint: 0x6d8276 },
  izuhara: { name: '대마도 이즈하라 성하', province: '일본 쓰시마국 · 후추 성하마을', status: '대마도 도주군 · 부산포 출항로', safe: false, tint: 0x777b78 },
  busanjin: { name: '부산진성 혈전', province: '경상도 · 부산포 해안진', status: '왜군 대선단 · 성문 공방전', safe: false, tint: 0x8a756d },
  tangeumdae: { name: '탄금대 대회전', province: '충청도 · 남한강 절벽 평원', status: '왜군 삼면 포위 · 야전 지휘전', safe: false, tint: 0x887f6f },
  gyeongbokgate: { name: '경복궁 광화문', province: '한성부 · 육조거리 북단', status: '흥례문 · 금천교 · 궁성 외곽', safe: false, tint: 0x7f7c75 },
  gyeongbokcourt: { name: '경복궁 근정전', province: '한성부 · 경복궁 정전', status: '품계석 · 왕실 금군 방어진', safe: false, tint: 0x77726d },
  gyeongbokinner: { name: '경복궁 사정전·강녕전', province: '한성부 · 경복궁 내전', status: '왕의 거처 · 비밀 어전회의', safe: true, tint: 0x77766f },
  hanseongsouth: { name: '한성 숭례문·칠패장', province: '한성부 · 남대문 안팎', status: '도성 남문 · 칠패 장시 · 역참', safe: true, tint: 0x9a8a77 },
  hanseongmarket: { name: '한성 종루·운종가', province: '한성부 · 시전 행랑', status: '육의전 · 상인 객주 · 순라길', safe: true, tint: 0x998474 },
  changdeokgung: { name: '창덕궁 · 왕세자 광해 분조청', province: '한성부 · 돈화문과 인정전', status: '선조 재위 · 왕세자 분조 · 금군 경계', safe: true, tint: 0x807972 },
  gaeseong: { name: '개성 송도 장시', province: '경기도 · 개성부', status: '송상 객주 · 선죽교 행로', safe: true, tint: 0x938574 },
  suwon: { name: '수원 읍치 장터', province: '경기도 · 수원도호부', status: '관아 장터 · 역참 · 둔전', safe: true, tint: 0x9c8c73 },
  chungju: { name: '충주 목계나루', province: '충청도 · 충주목 남한강변', status: '남한강 나루 · 목계 장시', safe: true, tint: 0x8c9182 },
  andong: { name: '안동부 서원길', province: '경상도 · 안동대도호부', status: '유림 고을 · 한지 공방 · 서원길', safe: true, tint: 0x8d8875 },
  wonju: { name: '원주 치악산역', province: '강원도 · 원주목 치악산 북로', status: '산악 역참 · 곰굴 · 산령 봉수', safe: false, tint: 0x969c86 },
  gangneung: { name: '강릉 경포 봉화길', province: '강원도 · 강릉부 동해안', status: '해안 사냥터 · 봉화대 · 해태귀', safe: false, tint: 0x819f9d },
  haeju: { name: '해주 염전포', province: '황해도 · 해주목 서해 나루', status: '염전 보급로 · 백학 군락 · 해무 매복', safe: false, tint: 0x9caa96 },
  geoje: { name: '거제 견내량 수군진', province: '경상도 · 거제현 남해 해협', status: '수군 봉화 · 해협 보급선 · 해무원귀', safe: false, tint: 0x789b9d },
  hwangju: { name: '황주 달고개 역참', province: '황해도 · 황주목 남북 대로', status: '역참 생활권 · 여우령 사냥터', safe: false, tint: 0x887c68 },
  jaeryeong: { name: '재령 갈대벌', province: '황해도 · 재령강 습지', status: '수차 농경지 · 물안개 요물', safe: false, tint: 0x778c77 },
  anju: { name: '안주 청천강진', province: '평안도 · 안주목 청천강 나루', status: '강진 시장 · 국경 보급로', safe: false, tint: 0x71868a },
  uiju: { name: '의주 용만관', province: '평안도 · 압록강 남안', status: '변경 관문 · 흑각궁 사냥대', safe: false, tint: 0x6f7d80 },
  yangju: { name: '양주 송화 봉수로', province: '경기도 · 북한산 동북 능선', status: '봉수촌 · 산짐승 이동로', safe: false, tint: 0x7f806a },
  gapyeong: { name: '가평 잣나무 물레촌', province: '경기도 · 북한강 산골', status: '물레방앗간 · 자작령 숲', safe: false, tint: 0x71836f },
  pyeongchang: { name: '평창 눈재 사냥터', province: '강원도 · 오대산 남록', status: '표범 바위 · 설원 약초길', safe: false, tint: 0x82918c },
  samcheok: { name: '삼척 죽서루 해풍길', province: '강원도 · 오십천 동해구', status: '해풍 절벽 · 어물 교역장', safe: false, tint: 0x758e8d },
  icheon: { name: '이천 도요지', province: '경기도 · 이천부 도자촌', status: '가마 마을 · 불먹는 도깨비', safe: false, tint: 0x8c7763 },
  yeoju: { name: '여주 신륵 나루', province: '경기도 · 남한강 상류', status: '황포돛배 · 강옥 채집지', safe: false, tint: 0x748b83 },
  cheongju: { name: '청주 상당 벌판', province: '충청도 · 청주목 외곽', status: '장시와 도요 · 밤 순라길', safe: false, tint: 0x89806b },
  gongju: { name: '공주 금강진', province: '충청도 감영 · 공산성 나루', status: '감영 보급장 · 금강 수호령', safe: false, tint: 0x7d8171 },
  jemulpo: { name: '제물포 월미 나루', province: '경기도 · 인천 제물량', status: '조운선 부두 · 썰물 갯벌', safe: false, tint: 0x6d8588 },
  namyang: { name: '남양 염초장', province: '경기도 · 남양만 염전', status: '소금 창고 · 갈대 해무', safe: false, tint: 0x889084 },
  boryeong: { name: '보령 오천 수영', province: '충청도 · 오천항 수군진', status: '수영 망루 · 조류 철닻', safe: false, tint: 0x6e8487 },
  gunsan: { name: '군산 금강 하구', province: '전라도 · 금강 조운창', status: '곡물 선단 · 익사귀 출몰', safe: false, tint: 0x718783 },
  namwon: { name: '남원 광한 대숲', province: '전라도 · 남원부 요천변', status: '약재 장시 · 대숲 여우령', safe: false, tint: 0x74856d },
  suncheon: { name: '순천만 갈대포', province: '전라도 · 순천부 남해 습지', status: '갈대 어장 · 조수 혼불', safe: false, tint: 0x71877b },
  mokpo: { name: '목포 유달진', province: '전라도 · 영산강 바다 어귀', status: '섬 배편 · 거센 해무', safe: false, tint: 0x6a8187 },
  naju: { name: '나주 배꽃들', province: '전라도 · 나주목 영산강변', status: '배 과원 · 곡창 수호제', safe: false, tint: 0x879078 },
  sangju: { name: '상주 낙동 역원', province: '경상도 · 상주목 낙동강길', status: '영남대로 역원 · 산도깨비', safe: false, tint: 0x827a68 },
  daegu: { name: '대구 달성 약령장', province: '경상도 · 달성 남문 장시', status: '약재 시장 · 가마 공방', safe: false, tint: 0x8b7564 },
  jinju: { name: '진주 남강진', province: '경상도 · 진주목 촉석 나루', status: '강진 수비대 · 표범 고개', safe: false, tint: 0x737f72 },
  tongyeong: { name: '통영 삼도수군진', province: '경상도 · 견내량 남쪽 군항', status: '판옥선 조선소 · 수군 신호대', safe: false, tint: 0x667f86 },
  jurchenvillage: { name: '여진 설원부락', province: '압록 이북 · 장백산 남녘', status: '족장 대천막 · 전사 집결지', safe: false, tint: 0x8293a7 },
  changbaihunt: { name: '장백 자작나무 사냥터', province: '장백산 · 북행 자작나무 능선', status: '사슴길 · 멧돼지 굴 · 백산부 경계', safe: false, tint: 0x91a39e },
  baeksanvillage: { name: '백산부 부족마을', province: '장백산 북록 · 백산부 영지', status: '백산부 전사단 · 첫 번째 맹약', safe: false, tint: 0x84969a },
  songhuahunt: { name: '송화강 사슴벌 사냥터', province: '송화강 상류 · 넓은 사슴벌', status: '사슴 떼 · 늑대 길 · 강변 순찰대', safe: false, tint: 0x879e9a },
  songhuavillage: { name: '송화부 부족마을', province: '송화강 상류 · 송화부 강변촌', status: '어로장 · 기마 전사 · 두 번째 맹약', safe: false, tint: 0x7f9697 },
  blackpinehunt: { name: '흑송령 산짐승 사냥터', province: '흑송령 · 북방 침엽수 고개', status: '산짐승 군락 · 흑수부 매복로', safe: false, tint: 0x788d87 },
  heuksuvillage: { name: '흑수부 부족마을·회맹장', province: '흑수 상류 · 북방 부족 회맹지', status: '흑수부 대천막 · 세 부족 최종 회맹', safe: false, tint: 0x74878b },
  manchufrontier: { name: '압록 국경 전선', province: '압록강 변경 · 조선과 여진의 접경', status: '조선 진보 · 여진 선봉 · 교전 중', safe: false, tint: 0x8495a8 },
  pyongyangouter: { name: '평양성 북곽', province: '평안도 · 평양성 대동문 북방', status: '외곽 방어진 · 성하 전투', safe: false, tint: 0x82909a },
  pyongyanggate: { name: '평양성 대동문', province: '평안도 · 대동강 서안', status: '대동문 공성전 · 수성군 결사대', safe: false, tint: 0x777f86 },
  pyongyanginner: { name: '평양성 내성', province: '평안도 · 평양 감영', status: '감영 친위대 · 남진 관문', safe: false, tint: 0x746f6c },
  namhansanseong: { name: '남한산성 최종 방어선', province: '경기도 광주 · 산성 행궁', status: '북문 · 수어장대 · 행궁 3중 방어', safe: false, tint: 0x727b78 },
  ganghwado: { name: '강화도 최종 방어선', province: '강화부 · 갑곶진과 행궁', status: '갑곶돈대 · 강화산성 · 행궁 3중 방어', safe: false, tint: 0x71858a },
  minepass: { name: '흑철 폐광고개', province: '달빛고을 · 동쪽 광산로', status: '탈영병 점거지', safe: false, tint: 0xc1aa93 },
  moonfield: { name: '월하 그림자들', province: '달빛고을 · 남쪽 들판', status: '산령 출몰지', safe: false, tint: 0x9faed2 },
  dungeon: { name: '무영광산 지하', province: '흑철 폐광 · 봉인 갱도', status: '심층 던전', safe: false, tint: 0x8f765f },
  ulleungdo: { name: '울릉도 관청 감옥터', province: '울릉도 · 관아 북쪽 감옥', status: '북문 탈출 · 남문 관아', safe: false, tint: 0x9eb4ad },
  ulleungcoast: { name: '울릉 해안 해송숲', province: '울릉도 · 북쪽 바닷길', status: '산토끼 · 물사슴 · 멧돼지', safe: false, tint: 0x91aaa1 },
  ulleungmeadow: { name: '울릉 억새초원', province: '울릉도 · 해송숲 남쪽 바람길', status: '산토끼 · 물사슴 이동로', safe: false, tint: 0x9eaa93 },
  ulleunghunt: { name: '약탈당한 울릉 해송마을', province: '울릉도 · 중앙 백성촌', status: '피난민 보호 · 나무 수련', safe: false, tint: 0x91aa96 },
  ulleungridge: { name: '울릉 바람고개', province: '울릉도 · 감옥 북쪽 능선', status: '산군 · 정예 순찰대', safe: false, tint: 0xa59b7e },
  ulleungvillage: { name: '울릉 관아', province: '울릉도 · 탐관오리 본거지', status: '최종 토벌 구역', safe: false, tint: 0xa98f7b },
};
