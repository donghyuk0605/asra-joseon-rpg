import type { RegionId } from './regions';
import { REGION_ORIGINS } from './layout';

export type BetaRoadsidePropPlacement = Readonly<{
  region: RegionId;
  frame: 0 | 1 | 2 | 3 | 4 | 5;
  x: number;
  y: number;
  size: number;
  collisionRadius: number;
}>;

export const BETA_ROADSIDE_PROP_PLACEMENTS: readonly BetaRoadsidePropPlacement[] = [
  { region: 'ulleungvillage', frame: 0, x: 350, y: 540, size: 168, collisionRadius: 44 },
  { region: 'ulleungvillage', frame: 1, x: 210, y: 660, size: 190, collisionRadius: 58 },
  { region: 'ulleungvillage', frame: 2, x: 1380, y: 760, size: 158, collisionRadius: 34 },
  { region: 'ulleungvillage', frame: 4, x: 1115, y: 690, size: 136, collisionRadius: 38 },
  { region: 'ulleungvillage', frame: 5, x: 420, y: 730, size: 166, collisionRadius: 48 },
  { region: 'ulleunghunt', frame: 2, x: 790, y: 150, size: 150, collisionRadius: 32 },
  { region: 'ulleunghunt', frame: 3, x: 280, y: 720, size: 174, collisionRadius: 48 },
  { region: 'ulleungdo', frame: 0, x: 1180, y: 785, size: 160, collisionRadius: 42 },
] as const;

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
