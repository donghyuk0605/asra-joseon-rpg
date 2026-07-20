import { describe, expect, it } from 'vitest';
import { containsPatternPoint } from './patternGeometry';

describe('containsPatternPoint',()=>{
  it('matches circle cone line and arena danger regions',()=>{
    const o={x:0,y:0};
    expect(containsPatternPoint({kind:'circle',radius:10},o,0,{x:9,y:0})).toBe(true);
    expect(containsPatternPoint({kind:'cone',radius:20,arc:Math.PI/2},o,0,{x:10,y:2})).toBe(true);
    expect(containsPatternPoint({kind:'cone',radius:20,arc:Math.PI/2},o,0,{x:-10,y:0})).toBe(false);
    expect(containsPatternPoint({kind:'line',length:20,width:6},o,0,{x:15,y:2})).toBe(true);
    expect(containsPatternPoint({kind:'arena',radius:20,safeRadius:5},o,0,{x:10,y:0})).toBe(true);
    expect(containsPatternPoint({kind:'arena',radius:20,safeRadius:5},o,0,{x:3,y:0})).toBe(false);
  });
});
