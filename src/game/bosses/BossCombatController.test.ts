import { describe, expect, it } from 'vitest';
import { BossCombatController, createBossState } from './BossCombatController';
import { BOSS_CATALOG } from './catalog';

describe('BossCombatController', () => {
  it('telegraphs before impact', () => {
    const def = BOSS_CATALOG['chain-miner'];
    const boss = createBossState(def, { x: 0, y: 0 });
    const controller = new BossCombatController(() => 0);
    const types: string[] = [];
    for (let index=0; index<80; index+=1) types.push(...controller.update(boss,def,{x:40,y:0},.05).map((c)=>c.type));
    expect(types.indexOf('telegraph')).toBeGreaterThanOrEqual(0);
    expect(types.indexOf('telegraph')).toBeLessThan(types.indexOf('impact'));
  });

  it('changes phase once and blocks damage during transition', () => {
    const def = BOSS_CATALOG['chain-miner'];
    const boss = createBossState(def, { x: 0, y: 0 });
    const controller = new BossCombatController(() => 0);
    expect(controller.damage(boss, boss.maxHp/2+1)).toHaveLength(1);
    const hp = boss.hp;
    expect(controller.damage(boss, 50)).toHaveLength(0);
    expect(boss.hp).toBe(hp);
    expect(boss.phase).toBe(2);
  });

  it('does not unlock phase-two patterns during phase one', () => {
    const def = BOSS_CATALOG['chain-miner'];
    const boss = createBossState(def, { x: 0, y: 0 });
    const controller = new BossCombatController(() => .99);
    const patternIds: string[]=[];
    for(let index=0;index<200;index+=1){
      for(const command of controller.update(boss,def,{x:30,y:0},.1)) if(command.type==='telegraph') patternIds.push(command.patternId);
    }
    expect(patternIds).not.toContain(def.patterns[2].id);
  });
});
