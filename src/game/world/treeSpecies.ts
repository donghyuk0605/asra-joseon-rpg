export const TREE_SPECIES_FRAMES = {
  'wind-red-pine': 0,
  'coastal-black-pine': 1,
  zelkova: 2,
  willow: 3,
  birch: 4,
  'autumn-maple': 5,
  bamboo: 6,
  'dead-pine': 7,
} as const;

export type TreeSpecies = keyof typeof TREE_SPECIES_FRAMES;

export const treeSpeciesFrame = (species: TreeSpecies): number => TREE_SPECIES_FRAMES[species];

export type UlleungEdgeTreeSite = Readonly<{
  x: number;
  y: number;
  direction: 1 | -1;
  scale: number;
  rootRadius: number;
}>;

// Shared local coordinates keep the visible island edge trees and their
// simulation footprints on the same roots. All four sites stay well outside
// the authored north-south road, so they add solid scenery without narrowing
// the playable centre corridor.
export const ULLEUNG_EDGE_TREE_SITES: readonly UlleungEdgeTreeSite[] = [
  { x: 154, y: 286, direction: 1, scale: 1.12, rootRadius: 38 },
  { x: 1382, y: 342, direction: -1, scale: 1.18, rootRadius: 40 },
  { x: 176, y: 710, direction: 1, scale: 1.24, rootRadius: 42 },
  { x: 1360, y: 748, direction: -1, scale: 1.08, rootRadius: 37 },
] as const;
