import { REGION_ORIGINS } from './layout';
import type { RegionId } from './regions';

export type CampaignStructureRegion =
  | 'busanjin'
  | 'gyeongbokgate'
  | 'gyeongbokcourt'
  | 'gyeongbokinner'
  | 'pyongyangouter'
  | 'pyongyanggate'
  | 'pyongyanginner'
  | 'namhansanseong'
  | 'ganghwado';

export type CampaignStructureKind = 'wall' | 'gate' | 'hall' | 'house' | 'tower' | 'barricade';

export type CampaignStructureCollider = {
  id: string;
  label: string;
  kind: CampaignStructureKind;
  region: CampaignStructureRegion;
  type: 'box';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CampaignWorldObstacle = Omit<CampaignStructureCollider, 'id' | 'label' | 'kind' | 'region'>;

const box = (
  region: CampaignStructureRegion,
  id: string,
  label: string,
  kind: CampaignStructureKind,
  x: number,
  y: number,
  width: number,
  height: number,
): CampaignStructureCollider => ({
  region, id, label, kind, type: 'box', x, y, width, height,
});

/**
 * Collision footprints for architecture painted into the campaign maps.
 *
 * Coordinates are local to each 1536x1024 map. Buildings remain authored as
 * visible foreground objects in Phaser, while this data is the simulation's
 * source of truth for their solid foot-level footprint. The central 216px+
 * ceremonial/siege road is deliberately kept open in every region.
 */
export const CAMPAIGN_STRUCTURE_COLLIDERS: readonly CampaignStructureCollider[] = [
  // 부산진성: 동쪽 바다와 서쪽 암벽 사이의 남문-북문 주축을 비운다.
  // Every footprint stops at x=590 or starts at x=946 so a 20px-radius unit
  // retains a 316px-wide clear road through both gates and all three battle lines.
  box('busanjin', 'busanjin-west-rock-perimeter', '부산진 서쪽 암벽과 소나무', 'wall', 105, 512, 210, 1024),
  box('busanjin', 'busanjin-east-seawall', '부산포 동쪽 바다와 방파제', 'wall', 1421, 512, 230, 1024),
  box('busanjin', 'busanjin-north-wall-west', '북문 서쪽 산성벽', 'wall', 400, 60, 380, 120),
  box('busanjin', 'busanjin-north-wall-east', '북문 동쪽 해안성벽', 'wall', 1126, 60, 360, 120),
  box('busanjin', 'busanjin-north-tower-west', '북문 서쪽 망루', 'tower', 535, 120, 110, 240),
  box('busanjin', 'busanjin-north-tower-east', '북문 동쪽 망루', 'tower', 1001, 120, 110, 240),
  box('busanjin', 'busanjin-south-wall-west', '남문 서쪽 외성벽', 'wall', 400, 650, 380, 170),
  box('busanjin', 'busanjin-south-wall-east', '남문 동쪽 외성벽', 'wall', 1126, 650, 360, 170),
  box('busanjin', 'busanjin-south-gate-west', '부산진 남문 서문체', 'gate', 535, 630, 110, 260),
  box('busanjin', 'busanjin-south-gate-east', '부산진 남문 동문체', 'gate', 1001, 630, 110, 260),
  box('busanjin', 'busanjin-upper-barracks-west', '내성 서쪽 초소와 군막', 'house', 390, 180, 360, 180),
  box('busanjin', 'busanjin-upper-barracks-east', '내성 동쪽 초소와 군막', 'house', 1146, 180, 360, 180),
  box('busanjin', 'busanjin-middle-barracks-west', '중앙 서쪽 병영과 보급창', 'house', 390, 340, 360, 190),
  box('busanjin', 'busanjin-middle-barracks-east', '중앙 동쪽 병영과 화약창', 'house', 1146, 340, 360, 190),
  box('busanjin', 'busanjin-lower-siegeworks-west', '남문 밖 서쪽 공성 목책', 'barricade', 350, 870, 400, 220),
  box('busanjin', 'busanjin-lower-siegeworks-east', '남문 밖 동쪽 공성 목책', 'barricade', 1186, 870, 400, 220),

  // 경복궁 광화문·흥례문
  box('gyeongbokgate', 'gyeongbokgate-west-perimeter', '광화문 서행각과 궁장', 'wall', 150, 500, 260, 900),
  box('gyeongbokgate', 'gyeongbokgate-east-perimeter', '광화문 동행각과 궁장', 'wall', 1386, 500, 260, 900),
  box('gyeongbokgate', 'gyeongbokgate-outer-wall-west', '광화문 서쪽 성벽', 'wall', 290, 744, 580, 84),
  box('gyeongbokgate', 'gyeongbokgate-outer-wall-east', '광화문 동쪽 성벽', 'wall', 1246, 744, 580, 84),
  box('gyeongbokgate', 'gyeongbokgate-outer-gate-west', '광화문 서문체', 'gate', 615, 690, 150, 210),
  box('gyeongbokgate', 'gyeongbokgate-outer-gate-east', '광화문 동문체', 'gate', 921, 690, 150, 210),
  box('gyeongbokgate', 'gyeongbokgate-west-office', '흥례문 서행각', 'house', 480, 330, 250, 230),
  box('gyeongbokgate', 'gyeongbokgate-east-office', '흥례문 동행각', 'house', 1056, 330, 250, 230),
  box('gyeongbokgate', 'gyeongbokgate-inner-wall-west', '흥례문 서궁장', 'wall', 425, 140, 520, 110),
  box('gyeongbokgate', 'gyeongbokgate-inner-wall-east', '흥례문 동궁장', 'wall', 1111, 140, 520, 110),
  box('gyeongbokgate', 'gyeongbokgate-inner-gate-west', '흥례문 서문체', 'gate', 620, 132, 180, 150),
  box('gyeongbokgate', 'gyeongbokgate-inner-gate-east', '흥례문 동문체', 'gate', 916, 132, 180, 150),

  // 경복궁 근정전
  box('gyeongbokcourt', 'gyeongbokcourt-west-corridor', '근정전 서행각', 'wall', 180, 505, 300, 930),
  box('gyeongbokcourt', 'gyeongbokcourt-east-corridor', '근정전 동행각', 'wall', 1356, 505, 300, 930),
  box('gyeongbokcourt', 'gyeongbokcourt-south-wall-west', '근정문 서궁장', 'wall', 290, 860, 580, 100),
  box('gyeongbokcourt', 'gyeongbokcourt-south-wall-east', '근정문 동궁장', 'wall', 1246, 860, 580, 100),
  box('gyeongbokcourt', 'gyeongbokcourt-south-gate-west', '근정문 서문체', 'gate', 620, 820, 180, 180),
  box('gyeongbokcourt', 'gyeongbokcourt-south-gate-east', '근정문 동문체', 'gate', 916, 820, 180, 180),
  box('gyeongbokcourt', 'gyeongbokcourt-throne-west', '근정전 서월대', 'hall', 600, 230, 260, 330),
  box('gyeongbokcourt', 'gyeongbokcourt-throne-east', '근정전 동월대', 'hall', 936, 230, 260, 330),
  box('gyeongbokcourt', 'gyeongbokcourt-north-wall-west', '근정전 북서 궁장', 'wall', 350, 108, 500, 96),
  box('gyeongbokcourt', 'gyeongbokcourt-north-wall-east', '근정전 북동 궁장', 'wall', 1186, 108, 500, 96),

  // 경복궁 사정전·강녕전
  box('gyeongbokinner', 'gyeongbokinner-west-corridor', '내전 서행각과 후원', 'wall', 180, 505, 300, 930),
  box('gyeongbokinner', 'gyeongbokinner-east-corridor', '내전 동행각과 후원', 'wall', 1356, 505, 300, 930),
  box('gyeongbokinner', 'gyeongbokinner-south-wall-west', '내전 남서 궁장', 'wall', 290, 882, 580, 96),
  box('gyeongbokinner', 'gyeongbokinner-south-wall-east', '내전 남동 궁장', 'wall', 1246, 882, 580, 96),
  box('gyeongbokinner', 'gyeongbokinner-south-gate-west', '내전 남문 서문체', 'gate', 620, 840, 180, 190),
  box('gyeongbokinner', 'gyeongbokinner-south-gate-east', '내전 남문 동문체', 'gate', 916, 840, 180, 190),
  box('gyeongbokinner', 'gyeongbokinner-sajeong-west', '사정전 서월대', 'hall', 630, 395, 180, 250),
  box('gyeongbokinner', 'gyeongbokinner-sajeong-east', '사정전 동월대', 'hall', 906, 395, 180, 250),
  box('gyeongbokinner', 'gyeongbokinner-gangnyeong-west', '강녕전 서월대', 'hall', 630, 135, 180, 190),
  box('gyeongbokinner', 'gyeongbokinner-gangnyeong-east', '강녕전 동월대', 'hall', 906, 135, 180, 190),

  // 평양 외성 북곽
  box('pyongyangouter', 'pyongyangouter-west-edge', '외성 서쪽 수로와 목책', 'wall', 115, 505, 230, 1010),
  box('pyongyangouter', 'pyongyangouter-east-edge', '외성 동쪽 수로와 목책', 'wall', 1421, 505, 230, 1010),
  box('pyongyangouter', 'pyongyangouter-upper-camp-west', '북곽 서쪽 군영', 'barricade', 360, 280, 420, 300),
  box('pyongyangouter', 'pyongyangouter-upper-camp-east', '북곽 동쪽 군영', 'barricade', 1176, 280, 420, 300),
  box('pyongyangouter', 'pyongyangouter-rampart-west', '외성 서쪽 성벽', 'wall', 300, 510, 600, 170),
  box('pyongyangouter', 'pyongyangouter-rampart-east', '외성 동쪽 성벽', 'wall', 1236, 510, 600, 170),
  box('pyongyangouter', 'pyongyangouter-gate-west', '외성 북문 서문체', 'gate', 650, 485, 100, 210),
  box('pyongyangouter', 'pyongyangouter-gate-east', '외성 북문 동문체', 'gate', 886, 485, 100, 210),
  box('pyongyangouter', 'pyongyangouter-village-west', '외성 서쪽 민가와 보급소', 'house', 330, 790, 540, 390),
  box('pyongyangouter', 'pyongyangouter-village-east', '외성 동쪽 민가와 보급소', 'house', 1206, 790, 540, 390),

  // 평양 대동문
  box('pyongyanggate', 'pyongyanggate-west-cliff', '대동문 서쪽 성벽과 절벽', 'wall', 180, 510, 360, 1020),
  box('pyongyanggate', 'pyongyanggate-east-river', '대동문 동쪽 성벽과 대동강', 'wall', 1356, 510, 360, 1020),
  box('pyongyanggate', 'pyongyanggate-rampart-west', '대동문 서쪽 성벽', 'wall', 330, 365, 660, 190),
  box('pyongyanggate', 'pyongyanggate-rampart-east', '대동문 동쪽 성벽', 'wall', 1206, 365, 660, 190),
  box('pyongyanggate', 'pyongyanggate-gate-west', '대동문 서문체', 'gate', 690, 330, 60, 220),
  box('pyongyanggate', 'pyongyanggate-gate-east', '대동문 동문체', 'gate', 846, 330, 60, 220),
  box('pyongyanggate', 'pyongyanggate-siegeworks-west', '대동문 서쪽 공성 목책', 'barricade', 430, 655, 260, 420),
  box('pyongyanggate', 'pyongyanggate-siegeworks-east', '대동문 동쪽 공성 목책', 'barricade', 1106, 655, 260, 420),
  box('pyongyanggate', 'pyongyanggate-tower-west', '대동문 서쪽 공성루', 'tower', 175, 830, 250, 360),
  box('pyongyanggate', 'pyongyanggate-tower-east', '대동문 동쪽 공성루', 'tower', 1361, 830, 250, 360),

  // 평양 내성·대동관
  box('pyongyanginner', 'pyongyanginner-west-perimeter', '평양 내성 서쪽 성곽', 'wall', 95, 500, 190, 900),
  box('pyongyanginner', 'pyongyanginner-east-perimeter', '평양 내성 동쪽 성곽', 'wall', 1441, 500, 190, 900),
  box('pyongyanginner', 'pyongyanginner-north-wall-west', '내성 북문 서쪽 성벽', 'wall', 330, 105, 660, 120),
  box('pyongyanginner', 'pyongyanginner-north-wall-east', '내성 북문 동쪽 성벽', 'wall', 1206, 105, 660, 120),
  box('pyongyanginner', 'pyongyanginner-west-upper', '평양 감영 서쪽 창고군', 'house', 295, 285, 450, 360),
  box('pyongyanginner', 'pyongyanginner-east-upper', '대동관 정청과 동헌', 'hall', 1261, 300, 450, 380),
  box('pyongyanginner', 'pyongyanginner-west-lower', '내성 서쪽 군영', 'house', 300, 585, 500, 260),
  box('pyongyanginner', 'pyongyanginner-east-lower', '내성 동쪽 군영', 'house', 1236, 580, 500, 360),
  box('pyongyanginner', 'pyongyanginner-south-wall-west', '내성 남서 성벽', 'wall', 290, 840, 580, 120),
  box('pyongyanginner', 'pyongyanginner-south-wall-east', '내성 남동 성벽', 'wall', 1246, 840, 580, 120),
  box('pyongyanginner', 'pyongyanginner-south-gate-west', '내성 남문 서문체', 'gate', 620, 812, 140, 190),
  box('pyongyanginner', 'pyongyanginner-south-gate-east', '내성 남문 동문체', 'gate', 916, 812, 140, 190),

  // 남한산성: 남문 외곽 → 중성 → 행궁의 세 겹 방어선.
  // The authored road stays at least 376px wide so a 20px-radius unit still
  // has a clear 336px corridor through every static footprint.
  box('namhansanseong', 'namhansan-west-cliff', '남한산성 서쪽 절벽과 성곽', 'wall', 145, 512, 290, 1024),
  box('namhansanseong', 'namhansan-east-cliff', '남한산성 동쪽 절벽과 성곽', 'wall', 1391, 512, 290, 1024),
  box('namhansanseong', 'namhansan-lower-wall-west', '남문 서쪽 외성벽', 'wall', 335, 795, 490, 150),
  box('namhansanseong', 'namhansan-lower-wall-east', '남문 동쪽 외성벽', 'wall', 1201, 795, 490, 150),
  box('namhansanseong', 'namhansan-lower-camp-west', '남문 서쪽 군막과 목책', 'barricade', 430, 615, 300, 240),
  box('namhansanseong', 'namhansan-lower-camp-east', '남문 동쪽 군막과 목책', 'barricade', 1106, 615, 300, 240),
  box('namhansanseong', 'namhansan-middle-wall-west', '중성 서쪽 석벽', 'wall', 335, 470, 490, 150),
  box('namhansanseong', 'namhansan-middle-wall-east', '중성 동쪽 석벽', 'wall', 1201, 470, 490, 150),
  box('namhansanseong', 'namhansan-middle-camp-west', '수어청 서쪽 방어진', 'house', 460, 320, 240, 210),
  box('namhansanseong', 'namhansan-middle-camp-east', '수어청 동쪽 방어진', 'house', 1076, 320, 240, 210),
  box('namhansanseong', 'namhansan-upper-wall-west', '행궁 서쪽 내성벽', 'wall', 340, 190, 480, 110),
  box('namhansanseong', 'namhansan-upper-wall-east', '행궁 동쪽 내성벽', 'wall', 1196, 190, 480, 110),
  box('namhansanseong', 'namhansan-palace-west', '산성 행궁 서행각', 'hall', 485, 95, 190, 150),
  box('namhansanseong', 'namhansan-palace-east', '산성 행궁 동행각', 'hall', 1051, 95, 190, 150),

  // 강화도: 갑곶 해안진 → 강화산성 → 피난 행궁의 세 겹 방어선.
  box('ganghwado', 'ganghwa-west-tidal-shore', '갑곶진 서쪽 갯벌과 암초', 'wall', 145, 512, 290, 1024),
  box('ganghwado', 'ganghwa-east-tidal-shore', '갑곶진 동쪽 갯벌과 암초', 'wall', 1391, 512, 290, 1024),
  box('ganghwado', 'ganghwa-lower-wall-west', '갑곶돈대 서쪽 성벽', 'wall', 335, 745, 490, 170),
  box('ganghwado', 'ganghwa-lower-wall-east', '갑곶돈대 동쪽 성벽', 'wall', 1201, 745, 490, 170),
  box('ganghwado', 'ganghwa-battery-west', '갑곶진 서쪽 화포대', 'tower', 430, 550, 300, 260),
  box('ganghwado', 'ganghwa-battery-east', '갑곶진 동쪽 화포대', 'tower', 1106, 550, 300, 260),
  box('ganghwado', 'ganghwa-middle-wall-west', '강화산성 서쪽 내벽', 'wall', 335, 335, 490, 120),
  box('ganghwado', 'ganghwa-middle-wall-east', '강화산성 동쪽 내벽', 'wall', 1201, 335, 490, 120),
  box('ganghwado', 'ganghwa-middle-camp-west', '강화 중군 서쪽 진영', 'barricade', 455, 235, 250, 180),
  box('ganghwado', 'ganghwa-middle-camp-east', '강화 중군 동쪽 진영', 'barricade', 1081, 235, 250, 180),
  box('ganghwado', 'ganghwa-palace-wall-west', '강화 행궁 서쪽 궁장', 'wall', 335, 82, 490, 120),
  box('ganghwado', 'ganghwa-palace-wall-east', '강화 행궁 동쪽 궁장', 'wall', 1201, 82, 490, 120),
  box('ganghwado', 'ganghwa-palace-west', '강화 행궁 서행각', 'hall', 485, 145, 190, 150),
  box('ganghwado', 'ganghwa-palace-east', '강화 행궁 동행각', 'hall', 1051, 145, 190, 150),
];

export const campaignStructureCollidersForRegion = (
  region: RegionId,
): readonly CampaignStructureCollider[] => CAMPAIGN_STRUCTURE_COLLIDERS.filter((structure) => structure.region === region);

export const campaignStructureWorldObstacles = (): CampaignWorldObstacle[] => (
  CAMPAIGN_STRUCTURE_COLLIDERS.map((structure) => {
    const origin = REGION_ORIGINS[structure.region];
    return {
      type: 'box',
      x: origin.x + structure.x,
      y: origin.y + structure.y,
      width: structure.width,
      height: structure.height,
    };
  })
);

export const localPointOverlapsCampaignStructure = (
  structure: CampaignStructureCollider,
  point: { x: number; y: number },
  radius = 0,
): boolean => (
  Math.abs(point.x - structure.x) < structure.width / 2 + radius
  && Math.abs(point.y - structure.y) < structure.height / 2 + radius
);
