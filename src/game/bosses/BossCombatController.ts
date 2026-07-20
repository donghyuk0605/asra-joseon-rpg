import type { Vec2 } from '../simulation/types';
import type { BossCommand, BossDefinition, BossPatternDefinition, BossState } from './types';

export function createBossState(definition: BossDefinition, origin: Vec2): BossState {
  return { id:`dungeon-boss-${definition.floor}`,bossId:definition.id,name:definition.name,floor:definition.floor,x:origin.x,y:origin.y,
    facing:Math.PI/2,hp:definition.maxHp,maxHp:definition.maxHp,damage:definition.damage,alive:true,phase:1,phaseTransitioned:false,
    invulnerableSeconds:0,state:'idle',stateSeconds:0,activePatternId:null,recentPatternIds:[],
    patternCooldowns:Object.fromEntries(definition.patterns.map((pattern)=>[pattern.id,0])) };
}

export class BossCombatController {
  constructor(private readonly random:()=>number=Math.random) {}

  update(boss: BossState, definition: BossDefinition, player: Vec2, dt: number): BossCommand[] {
    if(!boss.alive) return [];
    boss.invulnerableSeconds=Math.max(0,boss.invulnerableSeconds-dt);
    for(const id of Object.keys(boss.patternCooldowns)) boss.patternCooldowns[id]=Math.max(0,boss.patternCooldowns[id]-dt);
    boss.stateSeconds=Math.max(0,boss.stateSeconds-dt);
    if(boss.state==='phase-change') { if(boss.stateSeconds===0){boss.state='idle';} return []; }
    const active=definition.patterns.find((pattern)=>pattern.id===boss.activePatternId);
    if(boss.state==='telegraph' && active){ if(boss.stateSeconds===0){boss.state='windup';boss.stateSeconds=active.windupSeconds;} return []; }
    if(boss.state==='windup' && active){ if(boss.stateSeconds>0) return []; boss.state='recovery'; boss.stateSeconds=active.recoverySeconds;
      boss.patternCooldowns[active.id]=active.cooldownSeconds; return [{type:'impact',bossId:boss.id,patternId:active.id,origin:{x:boss.x,y:boss.y},facing:boss.facing}]; }
    if(boss.state==='recovery'){ if(boss.stateSeconds===0){boss.state='idle';boss.activePatternId=null;} return []; }
    const dx=player.x-boss.x, dy=player.y-boss.y, distance=Math.hypot(dx,dy);
    boss.facing=Math.atan2(dy,dx);
    const available=definition.patterns.filter((pattern)=>pattern.minimumPhase<=boss.phase && boss.patternCooldowns[pattern.id]<=0 &&
      !(boss.recentPatternIds.length>=2 && boss.recentPatternIds.at(-1)===pattern.id && boss.recentPatternIds.at(-2)===pattern.id));
    if(available.length && distance<=Math.max(...available.map((pattern)=>pattern.range))){
      const pattern=available[Math.min(available.length-1,Math.floor(this.random()*available.length))];
      boss.activePatternId=pattern.id; boss.recentPatternIds.push(pattern.id); boss.recentPatternIds=boss.recentPatternIds.slice(-2);
      boss.state='telegraph';boss.stateSeconds=pattern.telegraphSeconds;
      return [{type:'telegraph',bossId:boss.id,patternId:pattern.id,origin:{x:boss.x,y:boss.y},facing:boss.facing}];
    }
    if(distance>84){ const travel=Math.min(definition.moveSpeed*dt,distance-84);boss.x+=dx/distance*travel;boss.y+=dy/distance*travel;boss.state='chase';
      return [{type:'move',bossId:boss.id,x:boss.x,y:boss.y,facing:boss.facing}]; }
    boss.state='idle'; return [];
  }

  damage(boss: BossState, amount: number): BossCommand[] {
    if(!boss.alive || boss.invulnerableSeconds>0) return [];
    boss.hp=Math.max(0,boss.hp-amount);
    if(boss.hp===0){boss.alive=false;boss.state='dead';return [];}
    if(!boss.phaseTransitioned && boss.hp<=boss.maxHp/2){boss.phase=2;boss.phaseTransitioned=true;boss.invulnerableSeconds=.8;
      boss.state='phase-change';boss.stateSeconds=.8;boss.activePatternId=null;return [{type:'phase-change',bossId:boss.id,phase:2}];}
    return [];
  }
}
