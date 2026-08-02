import { describe, expect, it } from 'vitest';
import { REGION_ORIGINS } from '../world/layout';
import {
  GWANGHAE_MILITIA_RALLY_NPC_IDS,
  GWANGHAE_MILITIA_RALLY_POINTS,
  type GwanghaeCampaignPath,
} from '../world/joseonTowns';
import { GameSimulation } from './GameSimulation';

const rallyEveryDistrict = (game: GameSimulation): void => {
  for (const npcId of GWANGHAE_MILITIA_RALLY_NPC_IDS) {
    game.region = GWANGHAE_MILITIA_RALLY_POINTS[npcId].region;
    expect(game.rallyGwanghaeMilitia(npcId).ok).toBe(true);
  }
};

const chooseGwanghaePath = (game: GameSimulation, path: GwanghaeCampaignPath): void => {
  game.startGwanghaeStory();
  rallyEveryDistrict(game);
  expect(game.chooseGwanghaePath(path)).toMatchObject({ ok: true, path });
};

const GWANGHAE_COUP_STAGE_REGIONS = [
  'gyeongbokgate',
  'gyeongbokcourt',
  'gyeongbokinner',
] as const;

type GwanghaeCoupStageRegion = (typeof GWANGHAE_COUP_STAGE_REGIONS)[number];

const gwanghaePathTargets = (
  game: GameSimulation,
  path: GwanghaeCampaignPath,
): GameSimulation['monsters'] => game.monsters.filter((monster) => path === 'coup'
  ? GWANGHAE_COUP_STAGE_REGIONS.includes(monster.region as GwanghaeCoupStageRegion)
    && monster.kind === 'royal-guard'
  : monster.region === 'jeonjufield' && monster.kind.startsWith('jeonju-'));

const gwanghaeCoupStageTargets = (
  game: GameSimulation,
  region: GwanghaeCoupStageRegion,
): GameSimulation['monsters'] => game.monsters.filter((monster) =>
  monster.region === region && monster.kind === 'royal-guard');

const defeatMonster = (game: GameSimulation, monster: GameSimulation['monsters'][number]): void => {
  const killMonster = (game as unknown as {
    killMonster: (target: GameSimulation['monsters'][number]) => void;
  }).killMonster.bind(game);
  monster.hp = 0;
  killMonster(monster);
};

const clearGwanghaeCoupStage = (
  game: GameSimulation,
  region: GwanghaeCoupStageRegion,
): void => {
  for (let wave = 0; wave < 8; wave += 1) {
    for (const target of gwanghaeCoupStageTargets(game, region).filter((monster) => monster.alive)) {
      defeatMonster(game, target);
    }
    if (game.getGwanghaeCoupStageProgress(region)?.complete) return;
    for (let step = 0; step < 66; step += 1) game.update(0.05);
  }
  throw new Error(`Failed to clear the finite Gwanghae coup stage: ${region}.`);
};

const clearFiniteGwanghaeArmy = (
  game: GameSimulation,
  path: GwanghaeCampaignPath,
): void => {
  if (path === 'coup') {
    for (const region of GWANGHAE_COUP_STAGE_REGIONS) {
      if (game.region !== region) game.travelToCampaignRegion(region, 'south');
      expect(game.region).toBe(region);
      clearGwanghaeCoupStage(game, region);
    }
    expect(game.getGwanghaePathBattleProgress()?.complete).toBe(true);
    return;
  }
  for (let wave = 0; wave < 6; wave += 1) {
    for (const target of gwanghaePathTargets(game, path).filter((monster) => monster.alive)) {
      defeatMonster(game, target);
    }
    const progress = game.getGwanghaePathBattleProgress();
    if (progress?.complete) return;
    expect(progress?.enemyPending).toBeGreaterThan(0);
    for (let step = 0; step < 65; step += 1) game.update(0.05);
  }
  throw new Error(`Failed to exhaust the finite ${path} enemy reserve.`);
};

describe('Crown Prince Gwanghae story foundation', () => {
  it('starts the prince in Changdeokgung with the bunjo faction and an equipped hwando', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    const origin = REGION_ORIGINS.changdeokgung;

    expect(game.getPlayerOrigin()).toBe('gwanghae-prince');
    expect(game.isGwanghaePrince()).toBe(true);
    expect(game.region).toBe('changdeokgung');
    expect(game.player).toMatchObject({
      x: origin.x + 768,
      y: origin.y + 650,
      level: 1,
      maxHp: 160,
    });
    expect(game.inventory.map((item) => item.itemId)).toEqual(['worn-hwando']);
    expect(game.getEquippedDefinition('weapon')?.id).toBe('worn-hwando');
    expect(game.skillRanks).toMatchObject({
      whirlwind: 1,
      'moon-dash': 1,
      'blade-mastery': 1,
    });
    expect(game.getFactionWarSnapshot()).toMatchObject({
      playerFaction: 'joseon-court',
      activeConflict: { attacker: 'joseon-court' },
    });
    const resolveCollision = (game as unknown as {
      resolveObstacleCollision: (entity: { x: number; y: number }, bodyRadius: number) => boolean;
    }).resolveObstacleCollision.bind(game);
    expect(resolveCollision(game.player, 24)).toBe(false);
  });

  it('keeps distant settlements locked until the Changdeokgung bunjo register is secured', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();

    expect(game.getUnlockedWorldMapRegions()).toEqual(['hanseongsouth']);
    expect(game.travelByWorldMap('gaeseong')).toBe('locked');
    expect(game.region).toBe('changdeokgung');
  });

  it('opens only the five safe bunjo-road hubs after the secretary joins', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();

    expect(game.rallyGwanghaeMilitia('changdeok-secretary')).toMatchObject({ ok: true });
    expect(game.getUnlockedWorldMapRegions()).toEqual([
      'hanseongsouth',
      'gaeseong',
      'suwon',
      'chungju',
      'andong',
    ]);
    expect(game.getUnlockedWorldMapRegions()).not.toEqual(expect.arrayContaining([
      'pyongyangouter',
      'yeongwol',
      'jeonju',
      'busanjin',
      'ulleungcoast',
      'osaka',
    ]));
  });

  it('travels from Changdeokgung to the Hanseong hub and reports same only after arrival', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    game.rallyGwanghaeMilitia('changdeok-secretary');

    expect(game.travelByWorldMap('hanseongsouth')).toBe('traveled');
    expect(game.region).toBe('hanseongsouth');
    expect(game.travelByWorldMap('hanseongsouth')).toBe('same');
  });

  it('does not complete a district rally merely by fast-traveling there', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    game.rallyGwanghaeMilitia('changdeok-secretary');

    expect(game.travelByWorldMap('suwon')).toBe('traveled');
    expect(game.region).toBe('suwon');
    expect(game.getGwanghaeRallyProgress()).toMatchObject({
      completed: 1,
      recruits: 40,
      points: expect.arrayContaining([
        expect.objectContaining({ npcId: 'suwon-officer', completed: false, available: true }),
      ]),
    });
  });

  it('preserves the bunjo-road unlocks through a save round trip', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    game.rallyGwanghaeMilitia('changdeok-secretary');
    expect(game.travelByWorldMap('suwon')).toBe('traveled');

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getUnlockedWorldMapRegions()).toEqual([
      'hanseongsouth',
      'gaeseong',
      'suwon',
      'chungju',
      'andong',
    ]);
    expect(restored.getGwanghaeRallyProgress()).toMatchObject({
      completed: 1,
      recruits: 40,
    });
    expect(restored.travelByWorldMap('andong')).toBe('traveled');
    expect(restored.region).toBe('andong');
  });

  it('treats government troops and civilians as allies while foreign armies remain hostile', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    const royalGuard = game.monsters.find((monster) => monster.kind === 'royal-guard')!;
    const civilian = game.monsters.find((monster) => monster.kind === 'joseon-civilian')!;
    const japaneseSoldier = game.monsters.find((monster) => monster.kind === 'japanese-swordsman')!;
    const jurchenSoldier = game.monsters.find((monster) => monster.kind === 'manchu-lancer')!;

    expect(game.isFriendlyMonster(royalGuard)).toBe(true);
    expect(game.isFriendlyMonster(civilian)).toBe(true);
    expect(game.isFriendlyMonster(japaneseSoldier)).toBe(false);
    expect(game.isFriendlyMonster(jurchenSoldier)).toBe(false);
  });

  it('lets the prince pass friendly Pyongyang garrisons without an impossible defeat gate', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    const origin = REGION_ORIGINS.pyongyanginner;
    game.region = 'pyongyanginner';
    game.player.x = origin.x + 768;
    game.player.y = origin.y + 180;
    const livingDefenders = game.monsters.filter((monster) =>
      monster.region === 'pyongyanginner' && monster.alive);

    expect(livingDefenders.length).toBeGreaterThan(0);
    expect(livingDefenders.every((monster) => game.isFriendlyMonster(monster))).toBe(true);
    game.travelToCampaignRegion('pyongyanggate', 'south');
    expect(game.region).toBe('pyongyanggate');
    expect(livingDefenders.every((monster) => monster.alive)).toBe(true);
  });

  it('round-trips the prince origin, court faction, equipment and starter skills', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    const restored = new GameSimulation();

    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getPlayerOrigin()).toBe('gwanghae-prince');
    expect(restored.region).toBe('changdeokgung');
    expect(restored.getEquippedDefinition('weapon')?.id).toBe('worn-hwando');
    expect(restored.skillRanks).toMatchObject({
      whirlwind: 1,
      'moon-dash': 1,
      'blade-mastery': 1,
    });
    const war = restored.getFactionWarSnapshot();
    expect(war.playerFaction).toBe('joseon-court');
    expect(war.factions.flatMap((faction) => [
      faction.strength,
      faction.reserve,
      faction.reserveCapacity,
      faction.recoveryPerMinute,
    ]).every(Number.isFinite)).toBe(true);
  });

  it('requires the prince, the matching visible NPC region, and the initial bunjo register', () => {
    const kim = new GameSimulation();
    expect(kim.rallyGwanghaeMilitia('changdeok-secretary')).toMatchObject({
      ok: false,
      reason: 'not-gwanghae',
    });

    const game = new GameSimulation();
    game.startGwanghaeStory();
    game.drainEvents();
    expect(game.getGwanghaeRallyProgress()).toMatchObject({
      completed: 0,
      total: 7,
      recruits: 0,
      choiceReady: false,
      path: null,
    });
    expect(game.rallyGwanghaeMilitia('not-a-rally-npc')).toMatchObject({
      ok: false,
      reason: 'unknown-npc',
    });

    game.region = 'gaeseong';
    expect(game.rallyGwanghaeMilitia('changdeok-secretary')).toMatchObject({
      ok: false,
      reason: 'wrong-region',
      expectedRegion: 'changdeokgung',
    });
    expect(game.rallyGwanghaeMilitia('gaeseong-clerk')).toMatchObject({
      ok: false,
      reason: 'prerequisite',
      requiredNpcId: 'changdeok-secretary',
    });

    game.region = 'changdeokgung';
    const first = game.rallyGwanghaeMilitia('changdeok-secretary');
    expect(first).toMatchObject({
      ok: true,
      reserveAdded: 40,
      strengthAdded: 1,
      progress: { completed: 1, recruits: 40 },
    });
    expect(game.rallyGwanghaeMilitia('changdeok-secretary')).toMatchObject({
      ok: false,
      reason: 'already-rallied',
      progress: { completed: 1 },
    });
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'gwanghae-militia-rallied',
        npcId: 'changdeok-secretary',
        recruits: 40,
        completed: 1,
        total: 7,
      }),
      expect.objectContaining({
        type: 'gwanghae-militia-rally-blocked',
        reason: 'already-rallied',
      }),
    ]));
  });

  it('rallies all seven districts once, raises reserve and strength, and unlocks the final choice', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    const before = game.getFactionWarSnapshot().factions.find((faction) => faction.id === 'joseon-court')!;

    rallyEveryDistrict(game);

    const progress = game.getGwanghaeRallyProgress();
    expect(progress).toMatchObject({
      completed: 7,
      total: 7,
      recruits: 490,
      reserve: before.reserve + 490,
      strength: before.strength + 12,
      choiceReady: true,
      path: null,
    });
    expect(progress.points.every((point) => point.completed && !point.available)).toBe(true);
    expect(game.getFactionWarSnapshot().chronicle[0]).toContain('안동 향병 명부');
  });

  it('prepares the seven-rally choice state through the development-only browser playtest hook', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    game.drainEvents();
    const originalRegion = game.region;

    expect(game.completeGwanghaeRalliesForPlaytest()).toBe(true);
    expect(game.region).toBe(originalRegion);
    expect(game.getGwanghaeRallyProgress()).toMatchObject({
      completed: 7,
      total: 7,
      recruits: 490,
      choiceReady: true,
      path: null,
    });
    expect(game.drainEvents().some((event) => event.type === 'gwanghae-militia-rallied')).toBe(false);
  });

  it('persists every rally milestone through a single-player save round trip', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    game.rallyGwanghaeMilitia('changdeok-secretary');
    game.region = 'suwon';
    game.rallyGwanghaeMilitia('suwon-officer');
    const before = game.getGwanghaeRallyProgress();

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getGwanghaeRallyProgress()).toEqual(before);
    expect(restored.rallyGwanghaeMilitia('suwon-officer')).toMatchObject({
      ok: false,
      reason: 'already-rallied',
    });
  });

  it('turns the first rally into ten-soldier calls and enforces the twenty-soldier field cap', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    game.drainEvents();

    expect(game.getGwanghaeArmyStatus()).toMatchObject({
      reserve: 360,
      fielded: 0,
      fieldCap: 20,
      waveSize: 10,
      unlocked: false,
      ralliedDistricts: 0,
    });
    expect(game.callGwanghaeReinforcements()).toBe(false);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'gwanghae-reinforcements-blocked',
      reason: 'register',
      reserve: 360,
      fielded: 0,
    }));

    expect(game.rallyGwanghaeMilitia('changdeok-secretary')).toMatchObject({ ok: true });
    game.drainEvents();
    expect(game.getGwanghaeArmyStatus()).toMatchObject({ reserve: 400, unlocked: true });

    expect(game.callGwanghaeReinforcements()).toBe(true);
    expect(game.getGwanghaeArmyStatus()).toMatchObject({ reserve: 390, fielded: 10 });
    const firstWave = game.followers.filter((follower) => follower.route === 'bunjo');
    expect(firstWave).toHaveLength(10);
    expect(new Set(firstWave.map((follower) => follower.id)).size).toBe(10);
    expect(new Set(firstWave.map((follower) => follower.kind))).toEqual(new Set([
      'gwanghae-captain',
      'gwanghae-spearman',
      'gwanghae-archer',
      'gwanghae-militia',
    ]));
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'gwanghae-reinforcements-called',
      deployed: 10,
      reserve: 390,
      fielded: 10,
    }));

    for (let frame = 0; frame < 100; frame += 1) game.update(0.05);
    expect(game.getGwanghaeArmyStatus()).toMatchObject({ reserve: 390, fielded: 10 });

    expect(game.callGwanghaeReinforcements()).toBe(true);
    expect(game.getGwanghaeArmyStatus()).toMatchObject({ reserve: 380, fielded: 20 });
    expect(game.callGwanghaeReinforcements()).toBe(false);
    expect(game.getGwanghaeArmyStatus()).toMatchObject({ reserve: 380, fielded: 20 });
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'gwanghae-reinforcements-blocked',
      reason: 'field-capacity',
      reserve: 380,
      fielded: 20,
    }));
  });

  it('disbands deployed volunteers and blocks new calls after choosing suppression', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    rallyEveryDistrict(game);
    expect(game.callGwanghaeReinforcements()).toBe(true);
    const before = game.getGwanghaeArmyStatus();
    expect(before).toMatchObject({ reserve: 840, fielded: 10, unlocked: true });

    expect(game.chooseGwanghaePath('suppression')).toMatchObject({ ok: true, path: 'suppression' });
    expect(game.getGwanghaeArmyStatus()).toMatchObject({
      reserve: Math.floor(before.reserve * 0.45),
      fielded: 4,
      unlocked: false,
      path: 'suppression',
    });
    game.drainEvents();
    expect(game.callGwanghaeReinforcements()).toBe(false);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'gwanghae-reinforcements-blocked',
      reason: 'suppression',
      reserve: Math.floor(before.reserve * 0.45),
      fielded: 4,
    }));
  });

  it('restores the militia reserve and deployed bunjo soldiers before another call', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    expect(game.rallyGwanghaeMilitia('changdeok-secretary')).toMatchObject({ ok: true });
    expect(game.callGwanghaeReinforcements()).toBe(true);
    const before = game.getGwanghaeArmyStatus();
    const savedIds = game.followers
      .filter((follower) => follower.route === 'bunjo')
      .map((follower) => follower.id);

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getGwanghaeArmyStatus()).toEqual(before);
    const restoredWave = restored.followers.filter((follower) => follower.route === 'bunjo');
    expect(restoredWave).toHaveLength(10);
    expect(restoredWave.map((follower) => follower.id)).toEqual(savedIds);
    expect(restoredWave.every((follower) => follower.kind.startsWith('gwanghae-'))).toBe(true);

    expect(restored.callGwanghaeReinforcements()).toBe(true);
    expect(restored.getGwanghaeArmyStatus()).toMatchObject({
      reserve: before.reserve - 10,
      fielded: 20,
    });
    expect(new Set(restored.followers.map((follower) => follower.id)).size)
      .toBe(restored.followers.length);
  });

  it('does not let another protagonist spend the court militia reserve', () => {
    const game = new GameSimulation();
    const reserveBefore = game.getFactionWarSnapshot().factions
      .find((faction) => faction.id === 'joseon-court')!.reserve;

    expect(game.callGwanghaeReinforcements()).toBe(false);
    expect(game.followers).toHaveLength(0);
    expect(game.getFactionWarSnapshot().factions
      .find((faction) => faction.id === 'joseon-court')!.reserve).toBe(reserveBefore);
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'gwanghae-reinforcements-blocked',
      reason: 'not-gwanghae',
      reserve: 0,
      fielded: 0,
    }));
  });

  it('locks the coup or suppression choice until seven rallies, then makes it immutable', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    expect(game.chooseGwanghaePath('coup')).toMatchObject({
      ok: false,
      reason: 'rallies-incomplete',
      remaining: 7,
    });
    rallyEveryDistrict(game);
    const before = game.getGwanghaeRallyProgress();
    const chosen = game.chooseGwanghaePath('coup');
    expect(chosen).toMatchObject({
      ok: true,
      path: 'coup',
      reserveBefore: before.reserve,
      strengthBefore: before.strength,
      progress: {
        path: 'coup',
        choiceReady: false,
        reserve: before.reserve,
        strength: before.strength + 4,
      },
    });
    expect(game.chooseGwanghaePath('suppression')).toMatchObject({
      ok: false,
      reason: 'already-chosen',
      selectedPath: 'coup',
      progress: { path: 'coup' },
    });
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'gwanghae-path-chosen', path: 'coup' }),
      expect.objectContaining({
        type: 'gwanghae-path-blocked',
        path: 'suppression',
        selectedPath: 'coup',
      }),
    ]));
  });

  it('makes suppression dismiss most volunteers and persists the selected route', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    rallyEveryDistrict(game);
    const before = game.getGwanghaeRallyProgress();
    const chosen = game.chooseGwanghaePath('suppression');
    expect(chosen).toMatchObject({
      ok: true,
      path: 'suppression',
      progress: {
        path: 'suppression',
        choiceReady: false,
        reserve: Math.floor(before.reserve * 0.45),
        strength: before.strength + 6,
      },
    });
    expect(chosen.progress.reserve).toBeLessThan(before.reserve / 2);

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getGwanghaeRallyProgress()).toEqual(chosen.progress);
    expect(restored.chooseGwanghaePath('coup')).toMatchObject({
      ok: false,
      reason: 'already-chosen',
      selectedPath: 'suppression',
    });
  });

  it('turns the coup into a hostile Gwanghwamun battle, travels there, and clears it after the guards fall', () => {
    const game = new GameSimulation();
    chooseGwanghaePath(game, 'coup');
    game.drainEvents();
    const allTargets = gwanghaePathTargets(game, 'coup');
    const targets = allTargets.filter((monster) => !game.isFriendlyMonster(monster));
    const laterStageTargets = allTargets.filter((monster) => game.isFriendlyMonster(monster));
    const civilian = game.monsters.find((monster) =>
      monster.region === 'gyeongbokgate' && monster.kind === 'joseon-civilian')!;
    const suppressionSoldier = game.monsters.find((monster) =>
      monster.region === 'jeonjufield' && monster.kind.startsWith('jeonju-'))!;

    expect(targets).toHaveLength(6);
    expect(targets.every((monster) => !game.isFriendlyMonster(monster))).toBe(true);
    expect(laterStageTargets).toHaveLength(12);
    expect(laterStageTargets.every((monster) => !monster.aggro && monster.aiState === 'patrol')).toBe(true);
    expect(game.isFriendlyMonster(civilian)).toBe(true);
    expect(game.isFriendlyMonster(suppressionSoldier)).toBe(true);

    const started = game.beginGwanghaePathBattle();
    expect(started).toMatchObject({
      path: 'coup',
      region: 'gyeongbokgate',
      defeated: 0,
      total: allTargets.length + 12,
      enemyFielded: allTargets.length,
      enemyPending: 0,
      enemyReserve: 12,
      enemyRemaining: allTargets.length + 12,
      complete: false,
    });
    expect(game.region).toBe('gyeongbokgate');
    expect(targets.every((monster) => monster.aggro && monster.aiState === 'alert')).toBe(true);
    expect(targets.every((monster) =>
      monster.name === '선조 친위 내금위'
      && monster.level === 4
      && monster.damage === 8
      && monster.maxHp === 112)).toBe(true);

    game.selectMonster(targets[0].id);
    expect(game.player.targetId).toBe(targets[0].id);
    const beforeGold = game.player.gold;
    clearFiniteGwanghaeArmy(game, 'coup');

    const cleared = game.getGwanghaePathBattleProgress();
    expect(cleared).toMatchObject({
      path: 'coup',
      region: 'gyeongbokgate',
      defeated: allTargets.length + 12,
      total: allTargets.length + 12,
      enemyFielded: 0,
      enemyPending: 0,
      enemyReserve: 0,
      enemyRemaining: 0,
      complete: true,
    });
    expect(allTargets.every((monster) => !monster.alive
      && monster.respawnAt === Number.POSITIVE_INFINITY)).toBe(true);
    expect(game.player.gold).toBeGreaterThanOrEqual(beforeGold + cleared!.rewardGold);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'gwanghae-path-battle-started',
        path: 'coup',
        region: 'gyeongbokgate',
        total: allTargets.length + 12,
      }),
      expect.objectContaining({
        type: 'gwanghae-path-battle-cleared',
        path: 'coup',
        region: 'gyeongbokgate',
        defeated: allTargets.length + 12,
        rewardXp: cleared!.rewardXp,
      }),
    ]));
  });

  it('makes Seonjo flee after the coup instead of requiring the player to kill the king', () => {
    const game = new GameSimulation();
    chooseGwanghaePath(game, 'coup');
    game.beginGwanghaePathBattle();
    clearFiniteGwanghaeArmy(game, 'coup');
    game.drainEvents();

    game.travelToCampaignRegion('gyeongbokinner', 'south');
    expect(game.beginRoyalRefugeAtKing()).toBe(true);
    expect(game.getRoyalRefugeState()).toMatchObject({
      status: 'awaiting-route',
      routeId: null,
    });
    expect(game.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'king-refuge-choice',
      title: '분조 정변 · 선조의 파천',
      dialogue: expect.arrayContaining([
        expect.stringContaining('왕을 시해하지 마라'),
        expect.stringContaining('남한산성'),
        expect.stringContaining('강화도'),
      ]),
    }));

    expect(game.chooseRoyalRefugeRoute('namhansanseong')).toBe(true);
    expect(game.region).toBe('namhansanseong');
    expect(game.getRoyalRefugeState()).toMatchObject({
      status: 'in-progress',
      routeId: 'namhansanseong',
      activeStageIndex: 0,
    });
  });

  it('protects later refuge-defense waves from skills and bunjo auto-targeting until their stage opens', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    rallyEveryDistrict(game);
    expect(game.callGwanghaeReinforcements()).toBe(true);
    expect(game.chooseGwanghaePath('coup')).toMatchObject({ ok: true });
    game.beginGwanghaePathBattle();
    clearFiniteGwanghaeArmy(game, 'coup');
    game.travelToCampaignRegion('gyeongbokinner', 'south');
    expect(game.beginRoyalRefugeAtKing()).toBe(true);
    expect(game.chooseRoyalRefugeRoute('namhansanseong')).toBe(true);

    const origin = REGION_ORIGINS.namhansanseong;
    const inactiveRearGuard = game.monsters.find((monster) =>
      monster.region === 'namhansanseong'
      && monster.spawn.y - origin.y < 430)!;
    const hpBefore = inactiveRearGuard.hp;
    game.player.x = inactiveRearGuard.x;
    game.player.y = inactiveRearGuard.y;
    game.player.attackCooldown = 0;
    game.skillCooldowns.whirlwind = 0;
    game.castSkill('whirlwind');
    expect(inactiveRearGuard.hp).toBe(hpBefore);

    const bunjo = game.followers.find((follower) => follower.route === 'bunjo')!;
    bunjo.x = inactiveRearGuard.x;
    bunjo.y = inactiveRearGuard.y;
    bunjo.targetId = inactiveRearGuard.id;
    bunjo.attackCooldown = 0;
    bunjo.actionTimer = 0;
    for (let frame = 0; frame < 20; frame += 1) game.update(0.05);
    expect(inactiveRearGuard.hp).toBe(hpBefore);
    expect(bunjo.targetId).not.toBe(inactiveRearGuard.id);
  });

  it('turns suppression into a hostile volunteer battle, travels to Jeonju field, and clears it', () => {
    const game = new GameSimulation();
    chooseGwanghaePath(game, 'suppression');
    game.drainEvents();
    const targets = gwanghaePathTargets(game, 'suppression');
    const royalGuard = game.monsters.find((monster) => monster.kind === 'royal-guard')!;

    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((monster) => !game.isFriendlyMonster(monster))).toBe(true);
    expect(game.isFriendlyMonster(royalGuard)).toBe(true);

    const started = game.beginGwanghaePathBattle();
    expect(started).toMatchObject({
      path: 'suppression',
      region: 'jeonjufield',
      defeated: 0,
      total: targets.length + 16,
      enemyFielded: targets.length,
      enemyPending: 0,
      enemyReserve: 16,
      enemyRemaining: targets.length + 16,
      complete: false,
    });
    expect(game.region).toBe('jeonjufield');
    expect(targets.every((monster) => monster.aggro && monster.aiState === 'alert')).toBe(true);
    expect(targets.every((monster) =>
      monster.name.startsWith('삼남 의병')
      && monster.level === 3
      && monster.damage === 6
      && monster.maxHp === (monster.kind === 'jeonju-shield' ? 118 : 92))).toBe(true);

    game.selectMonster(targets[0].id);
    expect(game.player.targetId).toBe(targets[0].id);
    clearFiniteGwanghaeArmy(game, 'suppression');

    expect(game.getGwanghaePathBattleProgress()).toMatchObject({
      path: 'suppression',
      region: 'jeonjufield',
      defeated: targets.length + 16,
      total: targets.length + 16,
      enemyFielded: 0,
      enemyPending: 0,
      enemyReserve: 0,
      enemyRemaining: 0,
      complete: true,
    });
    expect(targets.every((monster) => !monster.alive
      && monster.respawnAt === Number.POSITIVE_INFINITY)).toBe(true);
    expect(game.drainEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'gwanghae-path-battle-started',
        path: 'suppression',
        region: 'jeonjufield',
        total: targets.length + 16,
      }),
      expect.objectContaining({
        type: 'gwanghae-path-battle-cleared',
        path: 'suppression',
        region: 'jeonjufield',
        defeated: targets.length + 16,
      }),
    ]));
  });

  it.each([
    ['coup', 'gyeongbokgate', 12],
    ['suppression', 'jeonjufield', 16],
  ] as const)('round-trips an in-progress and completed %s path battle', (path, region, enemyReserve) => {
    const game = new GameSimulation();
    chooseGwanghaePath(game, path);
    expect(game.beginGwanghaePathBattle()).toMatchObject({ path, region });
    const targets = gwanghaePathTargets(game, path);
    const total = targets.length + enemyReserve;
    expect(targets.length).toBeGreaterThan(1);
    defeatMonster(game, targets[0]);
    targets[1].hp = Math.max(1, Math.floor(targets[1].maxHp / 2));

    const restored = new GameSimulation();
    expect(restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot())).toBe(true);
    expect(restored.getGwanghaeRallyProgress().path).toBe(path);
    expect(restored.getGwanghaePathBattleProgress()).toMatchObject({
      path,
      region,
      defeated: 1,
      total,
      enemyFielded: targets.length - 1,
      enemyPending: 1,
      enemyReserve: enemyReserve - 1,
      enemyRemaining: total - 1,
      complete: false,
    });
    const restoredTargets = gwanghaePathTargets(restored, path);
    expect(restoredTargets[0]).toMatchObject({ alive: false, hp: 0 });
    expect(Number.isFinite(restoredTargets[0].respawnAt)).toBe(true);
    expect(restoredTargets[0].respawnAt).toBeGreaterThan(0);
    expect(restoredTargets[1].hp).toBe(targets[1].hp);

    clearFiniteGwanghaeArmy(restored, path);
    expect(restored.getGwanghaePathBattleProgress()).toMatchObject({
      path,
      defeated: total,
      total,
      enemyFielded: 0,
      enemyPending: 0,
      enemyReserve: 0,
      enemyRemaining: 0,
      complete: true,
    });

    const completedRestore = new GameSimulation();
    expect(completedRestore.importSinglePlayerSnapshot(restored.exportSinglePlayerSnapshot())).toBe(true);
    expect(completedRestore.getGwanghaePathBattleProgress()).toMatchObject({
      path,
      region,
      defeated: total,
      total,
      enemyFielded: 0,
      enemyPending: 0,
      enemyReserve: 0,
      enemyRemaining: 0,
      complete: true,
    });
    expect(gwanghaePathTargets(completedRestore, path).every((monster) =>
      !monster.alive && monster.respawnAt === Number.POSITIVE_INFINITY)).toBe(true);
  });

  it('keeps Gwanghae branch combat unavailable and leaves unit identity unchanged for other protagonists', () => {
    const kim = new GameSimulation('gyeongbokgate');
    const kimRegion = kim.region;
    const royalGuard = kim.monsters.find((monster) =>
      monster.region === 'gyeongbokgate' && monster.kind === 'royal-guard')!;
    const jeonjuSoldier = kim.monsters.find((monster) =>
      monster.region === 'jeonjufield' && monster.kind.startsWith('jeonju-'))!;

    expect(kim.getGwanghaePathBattleProgress()).toBeNull();
    expect(kim.beginGwanghaePathBattle()).toBeNull();
    expect(kim.region).toBe(kimRegion);
    expect(royalGuard).toMatchObject({
      name: '경복궁 내금위',
      maxHp: 260,
      damage: 19,
      level: 14,
    });
    expect(jeonjuSoldier.name).not.toContain('삼남 의병');

    const hajin = new GameSimulation();
    hajin.startFrontierArcherStory();
    const hajinRegion = hajin.region;
    const alliedJurchen = hajin.monsters.find((monster) =>
      monster.region === 'jurchenvillage' && monster.kind === 'manchu-lancer')!;
    expect(hajin.getGwanghaePathBattleProgress()).toBeNull();
    expect(hajin.beginGwanghaePathBattle()).toBeNull();
    expect(hajin.region).toBe(hajinRegion);
    expect(hajin.isFriendlyMonster(alliedJurchen)).toBe(true);
  });

  it('respawns the prince at his Changdeokgung safe home', () => {
    const game = new GameSimulation();
    game.startGwanghaeStory();
    const defeat = (game as unknown as { defeatPlayer: () => void }).defeatPlayer.bind(game);

    game.player.hp = 0;
    defeat();
    expect(game.drainEvents()).toContainEqual({
      type: 'player-defeated',
      respawnRegion: 'changdeokgung',
    });
    for (let step = 0; step < 65; step += 1) game.update(0.05);

    expect(game.region).toBe('changdeokgung');
    expect(game.player).toMatchObject({
      x: REGION_ORIGINS.changdeokgung.x + 768,
      y: REGION_ORIGINS.changdeokgung.y + 650,
      hp: game.player.maxHp,
    });
  });
});
