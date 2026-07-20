import type { Vec2 } from '../simulation/types';
import type { BossPatternShape } from './types';

export function containsPatternPoint(shape:BossPatternShape,origin:Vec2,facing:number,point:Vec2):boolean{
  const dx=point.x-origin.x,dy=point.y-origin.y,distance=Math.hypot(dx,dy);
  if(shape.kind==='circle') return distance<=shape.radius;
  if(shape.kind==='arena') return distance<=shape.radius && distance>=shape.safeRadius;
  const forward=dx*Math.cos(facing)+dy*Math.sin(facing);
  const side=-dx*Math.sin(facing)+dy*Math.cos(facing);
  if(shape.kind==='line') return forward>=0 && forward<=shape.length && Math.abs(side)<=shape.width/2;
  if(distance>shape.radius) return false;
  const angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-facing),Math.cos(Math.atan2(dy,dx)-facing));
  return Math.abs(angle)<=shape.arc/2;
}
