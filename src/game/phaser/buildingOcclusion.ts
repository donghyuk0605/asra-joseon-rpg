export type OcclusionArea = {
  left: number;
  right: number;
  top: number;
  front: number;
};

export type OcclusionPoint = { x: number; y: number };

export const occlusionBackEdge = (area: OcclusionArea): number => {
  const height = Math.max(0, area.front - area.top);
  const frontInset = Math.max(28, Math.min(78, height * 0.16));
  return area.front - frontInset;
};

/**
 * A foreground fades only while the player is physically behind its front
 * edge. Standing below/in front of the facade must keep the building opaque.
 */
export const isPointBehindOccluder = (
  point: OcclusionPoint,
  area: OcclusionArea,
): boolean => point.x >= area.left
  && point.x <= area.right
  && point.y >= area.top
  && point.y <= occlusionBackEdge(area);
