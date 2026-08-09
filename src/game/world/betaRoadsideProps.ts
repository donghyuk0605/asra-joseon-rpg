import type { RegionId } from './regions';
import { REGION_ORIGINS } from './layout';

export type BetaRoadsidePropPlacement = Readonly<{
  id: string;
  region: RegionId;
  frame: 0 | 1 | 2 | 3 | 4 | 5;
  x: number;
  y: number;
  size: number;
  collisionRadius: number;
  flipX?: boolean;
  tint?: number;
}>;

export const GRAND_DISTRICT_REGION_IDS = [
  'changdeokgung',
  'hanseongmarket',
  'hanseongsouth',
  'jeonjufield',
  'jeonjugate',
  'jeonju',
  'tangeumdae',
  'pyongyangouter',
  'pyongyanggate',
  'pyongyanginner',
] as const satisfies readonly RegionId[];

const prop = (
  id: string,
  region: RegionId,
  frame: BetaRoadsidePropPlacement['frame'],
  x: number,
  y: number,
  size: number,
  collisionRadius: number,
  flipX = false,
  tint?: number,
): BetaRoadsidePropPlacement => ({
  id, region, frame, x, y, size, collisionRadius, flipX, tint,
});

export const BETA_ROADSIDE_PROP_PLACEMENTS: readonly BetaRoadsidePropPlacement[] = [
  prop('ulleung-office-supplies', 'ulleungvillage', 0, 350, 540, 168, 44),
  prop('ulleung-drying-rack', 'ulleungvillage', 1, 210, 660, 190, 58),
  prop('ulleung-road-sign', 'ulleungvillage', 2, 1380, 760, 158, 34, true),
  prop('ulleung-forge-brazier', 'ulleungvillage', 4, 1115, 690, 136, 38),
  prop('ulleung-water-crocks', 'ulleungvillage', 5, 420, 730, 166, 48),
  prop('refugee-road-sign', 'ulleunghunt', 2, 790, 150, 150, 32),
  prop('refugee-haystack', 'ulleunghunt', 3, 280, 720, 174, 48),
  prop('prison-store-bundles', 'ulleungdo', 0, 1180, 785, 160, 42),

  // Hanseong reads as three full districts rather than a single compressed
  // backdrop. Roadside life sits inside the blocked shop/palace shoulders so
  // the 366px ceremonial avenue remains open from gate to gate.
  prop('changdeok-west-records', 'changdeokgung', 0, 390, 520, 142, 34),
  prop('changdeok-east-crocks', 'changdeokgung', 5, 1150, 520, 148, 38, true),
  prop('changdeok-west-brazier', 'changdeokgung', 4, 360, 760, 124, 30),
  prop('changdeok-east-sign', 'changdeokgung', 2, 1190, 760, 132, 28, true),
  prop('unjongga-northwest-bales', 'hanseongmarket', 0, 220, 390, 148, 36),
  prop('unjongga-northeast-crocks', 'hanseongmarket', 5, 1320, 390, 148, 38, true),
  prop('unjongga-southwest-rack', 'hanseongmarket', 1, 270, 760, 156, 42),
  prop('unjongga-southeast-hay', 'hanseongmarket', 3, 1270, 760, 150, 40, true),
  prop('unjongga-west-brazier', 'hanseongmarket', 4, 440, 880, 118, 28),
  prop('unjongga-east-bundles', 'hanseongmarket', 0, 1090, 880, 138, 34, true),
  prop('sungnyemun-west-supplies', 'hanseongsouth', 0, 270, 560, 148, 36),
  prop('sungnyemun-east-crocks', 'hanseongsouth', 5, 1270, 560, 148, 38, true),
  prop('chilpae-west-hay', 'hanseongsouth', 3, 280, 880, 156, 42),
  prop('chilpae-east-rack', 'hanseongsouth', 1, 1260, 880, 156, 42, true),
  prop('capital-south-west-sign', 'hanseongsouth', 2, 430, 245, 126, 28),
  prop('capital-south-east-bundles', 'hanseongsouth', 0, 1100, 245, 136, 34, true),

  // Jeonju's three-map campaign gains separate field supply, siege logistics
  // and market life. Props stay beyond x=516/1020, protecting the complete
  // central formation road and Wansan's east/west military lane.
  prop('wansan-west-hay', 'jeonjufield', 3, 250, 235, 158, 42),
  prop('wansan-east-rack', 'jeonjufield', 1, 1290, 235, 158, 42, true),
  prop('wansan-west-supplies', 'jeonjufield', 0, 330, 790, 146, 36),
  prop('wansan-east-crocks', 'jeonjufield', 5, 1210, 790, 148, 38, true),
  prop('wansan-west-sign', 'jeonjufield', 2, 470, 315, 126, 28),
  prop('wansan-east-brazier', 'jeonjufield', 4, 1070, 315, 120, 28, true),
  prop('pungnam-west-supplies', 'jeonjugate', 0, 260, 440, 148, 36),
  prop('pungnam-east-crocks', 'jeonjugate', 5, 1270, 440, 148, 38, true),
  prop('pungnam-west-hay', 'jeonjugate', 3, 300, 810, 154, 42),
  prop('pungnam-east-rack', 'jeonjugate', 1, 1230, 810, 154, 42, true),
  prop('pungnam-west-brazier', 'jeonjugate', 4, 470, 650, 118, 28),
  prop('pungnam-east-sign', 'jeonjugate', 2, 1070, 650, 126, 28, true),
  prop('jeonju-west-bundles', 'jeonju', 0, 250, 440, 148, 36),
  prop('jeonju-east-crocks', 'jeonju', 5, 1280, 440, 148, 38, true),
  prop('jeonju-west-rack', 'jeonju', 1, 330, 700, 154, 42),
  prop('jeonju-east-hay', 'jeonju', 3, 1210, 700, 154, 42, true),
  prop('jeonju-west-brazier', 'jeonju', 4, 440, 880, 118, 28),
  prop('jeonju-east-supplies', 'jeonju', 0, 1090, 880, 140, 34, true),

  // Tangeumdae and Pyongyang use the same physical supply vocabulary, tinted
  // cooler in the north. This fills the battle shoulders without narrowing the
  // axial combat route used by formations, corpses and siege machines.
  prop('tangeum-west-supplies', 'tangeumdae', 0, 250, 230, 148, 36),
  prop('tangeum-east-crocks', 'tangeumdae', 5, 1290, 230, 148, 38, true),
  prop('tangeum-west-hay', 'tangeumdae', 3, 300, 520, 156, 42),
  prop('tangeum-east-rack', 'tangeumdae', 1, 1240, 520, 156, 42, true),
  prop('tangeum-west-brazier', 'tangeumdae', 4, 430, 820, 118, 28),
  prop('tangeum-east-sign', 'tangeumdae', 2, 1110, 820, 126, 28, true),
  prop('pyongyang-outer-west-bundles', 'pyongyangouter', 0, 310, 300, 144, 36, false, 0xc7d0cf),
  prop('pyongyang-outer-east-crocks', 'pyongyangouter', 5, 1225, 300, 144, 38, true, 0xc7d0cf),
  prop('pyongyang-outer-west-hay', 'pyongyangouter', 3, 300, 730, 150, 40, false, 0xb7c2c0),
  prop('pyongyang-outer-east-rack', 'pyongyangouter', 1, 1235, 730, 150, 40, true, 0xb7c2c0),
  prop('pyongyang-outer-west-brazier', 'pyongyangouter', 4, 470, 880, 116, 28),
  prop('pyongyang-outer-east-sign', 'pyongyangouter', 2, 1070, 880, 124, 28, true, 0xc3cfce),
  prop('pyongyang-gate-west-supplies', 'pyongyanggate', 0, 340, 230, 142, 34, false, 0xc5cfce),
  prop('pyongyang-gate-east-crocks', 'pyongyanggate', 5, 1195, 230, 142, 36, true, 0xc5cfce),
  prop('pyongyang-gate-west-hay', 'pyongyanggate', 3, 360, 680, 150, 40, false, 0xb5c0bf),
  prop('pyongyang-gate-east-rack', 'pyongyanggate', 1, 1175, 680, 150, 40, true, 0xb5c0bf),
  prop('pyongyang-gate-west-brazier', 'pyongyanggate', 4, 470, 880, 116, 28),
  prop('pyongyang-gate-east-sign', 'pyongyanggate', 2, 1070, 880, 124, 28, true, 0xc3cfce),
  prop('pyongyang-inner-west-bundles', 'pyongyanginner', 0, 300, 300, 144, 36, false, 0xc7d0cf),
  prop('pyongyang-inner-east-crocks', 'pyongyanginner', 5, 1235, 300, 144, 38, true, 0xc7d0cf),
  prop('pyongyang-inner-west-rack', 'pyongyanginner', 1, 330, 620, 150, 40, false, 0xb7c2c0),
  prop('pyongyang-inner-east-hay', 'pyongyanginner', 3, 1205, 620, 150, 40, true, 0xb7c2c0),
  prop('pyongyang-inner-west-brazier', 'pyongyanginner', 4, 470, 900, 116, 28),
  prop('pyongyang-inner-east-sign', 'pyongyanginner', 2, 1070, 900, 124, 28, true, 0xc3cfce),
] as const;

export const betaRoadsidePropsForRegion = (
  region: RegionId,
): readonly BetaRoadsidePropPlacement[] => (
  BETA_ROADSIDE_PROP_PLACEMENTS.filter((propPlacement) => propPlacement.region === region)
);

export const betaRoadsidePropWorldObstacles = (): ReadonlyArray<{
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}> => BETA_ROADSIDE_PROP_PLACEMENTS.map((prop) => {
  const origin = REGION_ORIGINS[prop.region];
  return {
    type: 'circle',
    x: origin.x + prop.x,
    y: origin.y + prop.y,
    radius: prop.collisionRadius,
  };
});
