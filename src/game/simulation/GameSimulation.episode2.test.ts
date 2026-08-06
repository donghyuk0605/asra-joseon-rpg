import { describe, expect, it } from 'vitest';
import { REGION_ORIGINS } from '../world/layout';
import { episode2DropPool } from '../world/episode2Regions';
import { GameSimulation } from './GameSimulation';
import type { MonsterState } from './types';

describe('Episode II simulation systems', () => {
  it('moves a fox away from a stalking leopard while the predator closes in', () => {
    const game = new GameSimulation('uiju');
    const origin = REGION_ORIGINS.uiju;
    const fox = game.monsters.find((monster) => monster.region === 'uiju' && monster.kind === 'episode2-red-fox')!;
    const leopard = game.monsters.find((monster) => monster.region === 'uiju' && monster.kind === 'episode2-mountain-leopard')!;
    fox.x = origin.x + 500;
    fox.y = origin.y + 460;
    fox.spawn = { x: fox.x, y: fox.y };
    leopard.x = origin.x + 600;
    leopard.y = origin.y + 460;
    leopard.spawn = { x: leopard.x, y: leopard.y };
    game.player.x = origin.x + 1_250;
    game.player.y = origin.y + 820;
    const foxStart = fox.x;
    const leopardStart = leopard.x;

    game.update(0.2);

    expect(fox.aiState).toBe('flee');
    expect(fox.x).toBeLessThan(foxStart);
    expect(['chase', 'circle']).toContain(leopard.aiState);
    expect(leopard.x).toBeLessThan(leopardStart);
  });

  it('guarantees an unowned regional image-set item on the first local hunt', () => {
    const game = new GameSimulation('hwangju');
    const target = game.monsters.find((monster) => monster.region === 'hwangju')!;
    const expected = episode2DropPool('hwangju')[0];
    (game as unknown as { killMonster: (monster: MonsterState) => void }).killMonster(target);
    expect(game.groundDrops.map((drop) => drop.itemId)).toContain(expected);
    expect(game.huntKills[target.kind]).toBe(1);
  });

  it('learns and performs Tidebreaker Step as a collision-safe moving impact', () => {
    const game = new GameSimulation('hwangju');
    const points = game.skillPoints;
    game.learnSkill('tidebreaker-step');
    expect(game.skillRanks['tidebreaker-step']).toBe(1);
    expect(game.skillPoints).toBe(points - 1);
    game.inventory.push({ instanceId: 'episode2-sword-test', itemId: 'worn-hwando' });
    game.equipItem('episode2-sword-test');
    for (let step = 0; step < 4; step += 1) game.update(0.05);
    const startX = game.player.x;
    const target = game.monsters.find((monster) => monster.region === 'hwangju')!;
    target.x = startX + 255;
    target.y = game.player.y;
    target.hp = target.maxHp;
    game.player.facing = 0;
    const hp = target.hp;

    game.castSkill('tidebreaker-step');

    expect(game.player.x).toBeGreaterThan(startX + 180);
    expect(target.hp).toBeLessThan(hp);
    expect(target.hitStun).toBeGreaterThanOrEqual(0.42);
    expect(game.skillCooldowns['tidebreaker-step']).toBeGreaterThan(0);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'skill-impact', skillId: 'tidebreaker-step', targets: 1,
    }));
  });

  it('chains Beacon Volley in distance order through five visible enemies', () => {
    const game = new GameSimulation('hwangju');
    game.skillRanks['beacon-volley'] = 1;
    game.inventory.push({ instanceId: 'episode2-bow-test', itemId: 'white-birch-bow' });
    game.equipItem('episode2-bow-test');
    for (let step = 0; step < 4; step += 1) game.update(0.05);
    const enemies = game.monsters.filter((monster) => monster.region === 'hwangju').slice(0, 5);
    enemies.forEach((enemy, index) => {
      enemy.x = game.player.x + 90 + index * 55;
      enemy.y = game.player.y + (index % 2) * 12;
      enemy.hp = enemy.maxHp;
    });
    const distanceOrder = [...enemies]
      .sort((first, second) => Math.hypot(first.x - game.player.x, first.y - game.player.y)
        - Math.hypot(second.x - game.player.x, second.y - game.player.y))
      .map((enemy) => enemy.id);

    game.castSkill('beacon-volley');

    const volley = game.drainEvents().find((event) => event.type === 'archer-volley');
    expect(volley).toMatchObject({ type: 'archer-volley', skillId: 'beacon-volley' });
    if (volley?.type !== 'archer-volley') throw new Error('Beacon volley event was not emitted');
    expect(volley.arrows.map((arrow) => arrow.targetId)).toEqual(distanceOrder);
    expect(enemies.every((enemy) => enemy.hp < enemy.maxHp)).toBe(true);
    expect(game.skillCooldowns['beacon-volley']).toBeGreaterThan(0);
  });

  it('travels the authored north-south route without leaving the destination map', () => {
    const game = new GameSimulation('hwangju');
    game.travelToCampaignRegion('jaeryeong', 'south');
    expect(game.region).toBe('jaeryeong');
    expect(game.player.x).toBeGreaterThan(REGION_ORIGINS.jaeryeong.x);
    expect(game.player.x).toBeLessThan(REGION_ORIGINS.jaeryeong.x + 1_536);
    expect(game.player.y).toBeGreaterThan(REGION_ORIGINS.jaeryeong.y);
    expect(game.player.y).toBeLessThan(REGION_ORIGINS.jaeryeong.y + 1_024);
  });
});
