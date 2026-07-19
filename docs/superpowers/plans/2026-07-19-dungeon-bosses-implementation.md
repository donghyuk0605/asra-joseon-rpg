# Dungeon Bosses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ten uniquely modeled, data-driven bosses to floors 10–100 of Muyeong Mine, with telegraphed attacks, two phases, locked stairs, checkpoints, and browser-verified combat.

**Architecture:** A pure `BossCombatController` consumes catalog data and mutable boss state and emits commands without referencing Phaser. `GameSimulation` owns authoritative positions, health, damage, checkpoints, and stair locks; `HuntingScene` renders boss sprites and commands through focused boss-view/effects helpers. Boss floors replace the six ordinary dungeon monsters with exactly one boss.

**Tech Stack:** TypeScript 5.8, Phaser 3.90, Vite 7, Vitest 3.2, Python/Pillow sprite-normalization scripts, built-in image generation.

## Global Constraints

- Every boss atlas is `2048×1280px`, using `256×256px` cells in an 8-column×5-row grid.
- Rows are south, southwest, west, northwest, north; east-facing directions use runtime horizontal mirroring.
- Columns 0–3 are four walk frames; columns 4–7 are four signature-attack frames.
- Every frame uses the foot baseline 7px above the cell bottom and runtime `origin(0.5, 0.97)`.
- Bosses render 20–35% larger than ordinary monsters without changing atlas cell dimensions.
- Damage occurs only at the configured impact time after a visible ground telegraph and wind-up.
- Phase two begins exactly once at 50% health and cannot deal damage during transition invulnerability.
- Boss floors contain one boss and no ordinary dungeon monsters; the next-floor stair remains locked until the boss dies.
- Player defeat clears boss hazards and returns the player to the mine entrance; reaching a boss floor records it as the retry checkpoint.
- Do not add dungeon loot, treasure chests, or ordinary-floor clear requirements in this plan.
- Before completion run `npm test -- --run`, `npm run build`, and browser play verification.

---

## File Map

- Create `src/game/bosses/types.ts`: boss identifiers, state, pattern geometry, commands, and catalog interfaces.
- Create `src/game/bosses/catalog.ts`: all ten boss definitions and floor lookup.
- Create `src/game/bosses/catalog.test.ts`: catalog completeness and invariant tests.
- Create `src/game/bosses/BossCombatController.ts`: pure attack/phase state machine.
- Create `src/game/bosses/BossCombatController.test.ts`: timing, phase, and repetition tests.
- Create `src/game/bosses/patternGeometry.ts`: shared authoritative pattern containment math.
- Create `src/game/bosses/patternGeometry.test.ts`: circle, cone, line, and arena boundary tests.
- Create `src/game/phaser/BossView.ts`: boss sprite, hit zone, health bar, and animation synchronization.
- Create `src/game/phaser/BossEffects.ts`: telegraphs and bounded one-shot attack effects.
- Create `docs/BOSS_ART_PROMPTS.md`: fixed art prompt and ten identity blocks.
- Modify `src/game/simulation/types.ts`: boss state integration and boss events.
- Modify `src/game/simulation/GameSimulation.ts`: boss-floor spawning, authoritative impacts, checkpoint, defeat reset, and stair lock.
- Modify `src/game/simulation/GameSimulation.test.ts`: boss integration, checkpoint, and stair tests.
- Modify `src/game/world/dungeonGenerator.ts`: boss-floor metadata and boss-safe layouts.
- Modify `src/game/world/dungeonGenerator.test.ts`: boss-floor generation tests.
- Modify `src/game/assets/manifest.ts`: ten boss atlases.
- Modify `src/game/phaser/HuntingScene.ts`: preload, controller/view/effects wiring, stair lock rendering, and event handling.
- Modify `src/game/ui/Hud.ts`: boss target card and phase text.
- Add generation originals under `assets/generated/bosses/` named `chain-miner-source.png`, `bone-jangseung-source.png`, `flame-shaman-source.png`, `iron-tiger-source.png`, `headless-general-source.png`, `drowned-warden-source.png`, `eclipse-dokkaebi-source.png`, `black-iron-giant-source.png`, `sealed-monk-source.png`, and `shadow-magistrate-source.png`.
- Add matching normalized `*-actions.png` runtime atlases under `public/assets/bosses/`.

---

### Task 1: Define the boss catalog and floor contracts

**Files:**
- Create: `src/game/bosses/types.ts`
- Create: `src/game/bosses/catalog.ts`
- Create: `src/game/bosses/catalog.test.ts`
- Modify: `src/game/world/dungeonGenerator.ts`
- Modify: `src/game/world/dungeonGenerator.test.ts`

**Interfaces:**
- Produces: `BossId`, `BossPatternDefinition`, `BossDefinition`, `BossState`, `BossCommand`, `BOSS_CATALOG`, `bossForFloor(floor)`.
- Produces: `DungeonFloorLayout.isBossFloor: boolean` and `DungeonFloorLayout.bossId: BossId | null`.

- [ ] **Step 1: Write failing catalog and generator tests**

```ts
import { describe, expect, it } from 'vitest';
import { BOSS_CATALOG, bossForFloor } from './catalog';

describe('boss catalog', () => {
  it('defines one unique three-pattern boss for every tenth floor', () => {
    expect(Object.keys(BOSS_CATALOG)).toHaveLength(10);
    for (let floor = 10; floor <= 100; floor += 10) {
      const boss = bossForFloor(floor);
      expect(boss?.floor).toBe(floor);
      expect(boss?.patterns).toHaveLength(3);
      expect(new Set(boss?.patterns.map((pattern) => pattern.id)).size).toBe(3);
    }
  });

  it('returns no boss on ordinary floors', () => {
    expect(bossForFloor(9)).toBeNull();
    expect(bossForFloor(11)).toBeNull();
  });
});
```

Add to `dungeonGenerator.test.ts`:

```ts
it('marks every tenth floor as a single-boss sanctum', () => {
  const floor = generateDungeonFloor(40);
  expect(floor.isBossFloor).toBe(true);
  expect(floor.bossId).toBe('iron-tiger');
  expect(floor.monsterSpawns).toHaveLength(0);
});
```

- [ ] **Step 2: Run tests and confirm missing-module/type failures**

Run: `npm test -- --run src/game/bosses/catalog.test.ts src/game/world/dungeonGenerator.test.ts`

Expected: FAIL because `bosses/catalog` and boss-floor properties do not exist.

- [ ] **Step 3: Add exact boss types**

```ts
export type BossId =
  | 'chain-miner' | 'bone-jangseung' | 'flame-shaman' | 'iron-tiger' | 'headless-general'
  | 'drowned-warden' | 'eclipse-dokkaebi' | 'black-iron-giant' | 'sealed-monk' | 'shadow-magistrate';

export type BossPatternShape =
  | { kind: 'circle'; radius: number }
  | { kind: 'cone'; radius: number; arc: number }
  | { kind: 'line'; length: number; width: number }
  | { kind: 'arena'; radius: number; safeRadius: number };

export type BossPatternDefinition = {
  id: string;
  name: string;
  shape: BossPatternShape;
  range: number;
  telegraphSeconds: number;
  windupSeconds: number;
  recoverySeconds: number;
  cooldownSeconds: number;
  damageMultiplier: number;
  minimumPhase: 1 | 2;
  effect: 'sweep' | 'fall' | 'pull' | 'spikes' | 'fear' | 'summon' | 'projectile' | 'teleport'
    | 'pounce' | 'shockwave' | 'charge' | 'flood' | 'clone' | 'defense' | 'vacuum';
};

export type BossDefinition = {
  id: BossId;
  floor: number;
  name: string;
  textureKey: string;
  maxHp: number;
  damage: number;
  moveSpeed: number;
  scale: number;
  patterns: readonly [BossPatternDefinition, BossPatternDefinition, BossPatternDefinition];
};
```

Define `BossState` and `BossCommand` in the same file with these stable fields:

```ts
export type BossState = {
  id: string; bossId: BossId; name: string; floor: number; x: number; y: number;
  facing: number; hp: number; maxHp: number; damage: number; alive: boolean;
  phase: 1 | 2; phaseTransitioned: boolean; invulnerableSeconds: number;
  state: 'idle' | 'chase' | 'telegraph' | 'windup' | 'impact' | 'recovery' | 'phase-change' | 'dead';
  stateSeconds: number; activePatternId: string | null; recentPatternIds: string[];
  patternCooldowns: Record<string, number>;
};

export type BossCommand =
  | { type: 'telegraph'; bossId: string; patternId: string; origin: { x: number; y: number }; facing: number }
  | { type: 'impact'; bossId: string; patternId: string; origin: { x: number; y: number }; facing: number }
  | { type: 'phase-change'; bossId: string; phase: 2 }
  | { type: 'move'; bossId: string; x: number; y: number; facing: number };
```

- [ ] **Step 4: Implement the ten-entry catalog and boss-floor metadata**

Populate `BOSS_CATALOG` with the exact approved names and floors. Use base health values `620, 820, 1040, 1280, 1550, 1880, 2250, 2700, 3250, 4000`, base damage values `16, 19, 22, 25, 29, 33, 37, 42, 47, 54`, and scales between `0.62` and `0.69`. Give each entry the three approved patterns and ensure its third pattern has `minimumPhase: 2`.

Update `generateDungeonFloor()`:

```ts
const boss = bossForFloor(floor);
// returned object additions
isBossFloor: boss !== null,
bossId: boss?.id ?? null,
monsterSpawns: boss ? [] : baseSpawns.map((point) => ({ x: point.x + jitter(), y: point.y + jitter() })),
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/game/bosses/catalog.test.ts src/game/world/dungeonGenerator.test.ts`

Expected: both files PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/bosses src/game/world/dungeonGenerator.ts src/game/world/dungeonGenerator.test.ts
git commit -m "feat: define ten dungeon boss encounters"
```

---

### Task 2: Implement the pure boss combat controller

**Files:**
- Create: `src/game/bosses/BossCombatController.ts`
- Create: `src/game/bosses/BossCombatController.test.ts`

**Interfaces:**
- Consumes: `BossDefinition`, `BossState`, `BossCommand`, `Vec2`.
- Produces: `BossCombatController.update(boss, definition, player, deltaSeconds): BossCommand[]` and `BossCombatController.damage(boss, amount): BossCommand[]`.

- [ ] **Step 1: Write state-machine tests**

Use a `makeBoss()` test helper that copies the chain-miner catalog values into a phase-one `BossState` with zero cooldowns. Cover these exact cases:

```ts
it('telegraphs before it emits an impact', () => {
  const boss = makeBoss();
  const commands = runUntilImpact(new BossCombatController(() => 0), boss, 0.05);
  expect(commands.findIndex((command) => command.type === 'telegraph'))
    .toBeLessThan(commands.findIndex((command) => command.type === 'impact'));
});
it('never selects the same pattern three times in a row', () => {
  const boss = makeBoss();
  const ids = runCompletedPatterns(new BossCombatController(() => 0), boss, 3);
  expect(ids[0] === ids[1] && ids[1] === ids[2]).toBe(false);
});
it('changes phase exactly once at half health', () => {
  const controller = new BossCombatController(() => 0);
  const boss = makeBoss();
  expect(controller.damage(boss, boss.maxHp / 2 + 1)).toEqual([{ type: 'phase-change', bossId: boss.id, phase: 2 }]);
  expect(controller.damage(boss, 1)).not.toContainEqual({ type: 'phase-change', bossId: boss.id, phase: 2 });
});
it('does not emit impacts while phase-change invulnerability is active', () => {
  const controller = new BossCombatController(() => 0);
  const boss = makeBoss();
  controller.damage(boss, boss.maxHp / 2 + 1);
  expect(controller.update(boss, BOSS_CATALOG['chain-miner'], { x: 0, y: 0 }, 0.4).some((command) => command.type === 'impact')).toBe(false);
});
it('keeps phase-two patterns unavailable during phase one', () => {
  const boss = makeBoss();
  const ids = runCompletedPatterns(new BossCombatController(() => 0.75), boss, 8);
  expect(ids).not.toContain(BOSS_CATALOG['chain-miner'].patterns[2].id);
});
```

Use a deterministic constructor dependency:

```ts
const controller = new BossCombatController(() => 0.25);
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --run src/game/bosses/BossCombatController.test.ts`

Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement the controller**

```ts
export class BossCombatController {
  constructor(private readonly random: () => number = Math.random) {}

  update(
    boss: BossState,
    definition: BossDefinition,
    player: Vec2,
    deltaSeconds: number,
  ): BossCommand[];

  damage(boss: BossState, amount: number): BossCommand[];
}
```

Implement state durations from the active pattern. Pattern selection filters by phase and zero cooldown, rejects any id that occupies both latest history slots, and selects with the injected random function. Phase transition lasts `0.8` seconds and clears `activePatternId`.

- [ ] **Step 4: Run controller tests**

Run: `npm test -- --run src/game/bosses/BossCombatController.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/bosses/BossCombatController.ts src/game/bosses/BossCombatController.test.ts
git commit -m "feat: add deterministic boss combat controller"
```

---

### Task 3: Integrate boss floors, authoritative damage, and stair locks

**Files:**
- Modify: `src/game/simulation/types.ts`
- Modify: `src/game/simulation/GameSimulation.ts`
- Modify: `src/game/simulation/GameSimulation.test.ts`

**Interfaces:**
- Consumes: `bossForFloor`, `BossCombatController`, `BossState`, `BossCommand`.
- Produces: `GameSimulation.boss`, `GameSimulation.highestBossCheckpoint`, `GameSimulation.isDungeonExitLocked()`, `GameSimulation.selectBoss()`, `GameSimulation.damageBoss()`, and boss `GameEvent` variants.

- [ ] **Step 1: Write failing integration tests**

Add these integration tests. Use a local `advanceTo(game, floor)` helper that calls `enterDungeon()` once and then calls `advanceDungeonFloor()` until the requested floor or a locked stair is reached.

```ts
it('spawns one boss and no ordinary monsters on floor ten', () => {
  const game = new GameSimulation(); advanceTo(game, 10);
  expect(game.boss?.bossId).toBe('chain-miner');
  expect(game.monsters.filter((monster) => monster.region === 'dungeon' && monster.alive)).toHaveLength(0);
});
it('locks the next stair until the floor boss dies', () => {
  const game = new GameSimulation(); advanceTo(game, 10); game.advanceDungeonFloor();
  expect(game.dungeonFloor).toBe(10);
});
it('records floor ten as a retry checkpoint on entry', () => {
  const game = new GameSimulation(); advanceTo(game, 10);
  expect(game.highestBossCheckpoint).toBe(10);
});
it('reenters at the recorded boss checkpoint', () => {
  const game = new GameSimulation(); advanceTo(game, 10); game.leaveDungeon(); game.enterDungeon();
  expect(game.dungeonFloor).toBe(10);
});
it('emits the final clear exactly once after the floor-100 boss dies', () => {
  const game = new GameSimulation();
  game.highestBossCheckpoint = 100; game.enterDungeon(); game.damageBoss(Number.MAX_SAFE_INTEGER); game.damageBoss(1);
  expect(game.drainEvents().filter((event) => event.type === 'dungeon-complete')).toHaveLength(1);
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- --run src/game/simulation/GameSimulation.test.ts`

Expected: FAIL on missing boss properties and events.

- [ ] **Step 3: Add boss events and combat-target type**

Add to `GameEvent`:

```ts
| { type: 'boss-spawned'; boss: BossState }
| { type: 'boss-telegraph'; bossId: string; patternId: string; origin: Vec2; facing: number }
| { type: 'boss-impact'; bossId: string; patternId: string; origin: Vec2; facing: number }
| { type: 'boss-phase-changed'; bossId: string; phase: 2 }
| { type: 'boss-killed'; bossId: string; name: string; floor: number }
| { type: 'boss-reset'; floor: number }
| { type: 'dungeon-stair-lock-changed'; locked: boolean }
| { type: 'dungeon-complete' };
```

Define `export type CombatTarget = MonsterState | BossState` and update HUD-facing target signatures to use it.

- [ ] **Step 4: Add authoritative simulation state**

Add:

```ts
boss: BossState | null = null;
highestBossCheckpoint = 1;
private readonly bossController = new BossCombatController();
private dungeonStairLocked = false;
private dungeonComplete = false;
```

On a boss floor, deactivate all six dungeon monsters, build one boss from the catalog at local `{ x: 760, y: 470 }`, set `highestBossCheckpoint` to the floor, lock stairs, and emit spawn/lock events. Route controller commands into events and resolve impact geometry against the player using the same pattern shape data.

- [ ] **Step 5: Add defeat, kill, checkpoint, and advance rules**

- `advanceDungeonFloor()` returns without changing floor when `dungeonStairLocked` is true.
- Boss death sets `alive=false`, unlocks stairs, emits `boss-killed`, and emits `dungeon-complete` once at floor 100.
- Dungeon player defeat clears the boss and pending boss commands, sets the player at `REGION_ORIGINS.minepass + {770,300}`, changes region to `minepass`, and emits `boss-reset`.
- `enterDungeon()` uses `highestBossCheckpoint` when it is 10 or greater, otherwise floor 1.

- [ ] **Step 6: Run simulation tests**

Run: `npm test -- --run src/game/simulation/GameSimulation.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/simulation
git commit -m "feat: integrate boss floors and checkpoints"
```

---

### Task 4: Create boss art prompts and ten normalized atlases

**Files:**
- Create: `docs/BOSS_ART_PROMPTS.md`
- Create: the ten exact `*-source.png` originals listed in the File Map
- Create: the ten matching `*-actions.png` atlases under `public/assets/bosses/`
- Modify: `src/game/assets/manifest.ts`

**Interfaces:**
- Produces: `ASSETS.bosses: Record<BossId, { key: string; path: string }>` with keys matching `BossDefinition.textureKey`.

- [ ] **Step 1: Write the fixed generation prompt document**

The shared prompt must require: Joseon dark fantasy, realistic 1:6.5 adult proportion, magenta background, five direction rows in south/southwest/west/northwest/north order, four alternating-foot walk poses and four signature-attack poses per row, consistent costume/weapon/lighting, full body, no text, no grid lines, and no body part crossing a cell boundary.

Add ten identity blocks matching the approved roster. Each block specifies one immutable silhouette prop: chain and miner helmet; bone jangseung ribs; shaman sleeves and talisman fan; armored tiger plates; headless general spear and banner; soaked gate armor; horned dokkaebi crown and club; massive black-iron fists; prayer beads and torn robe; magistrate winged hat and shadow sword.

- [ ] **Step 2: Generate ten source atlases with built-in image generation**

Generate each boss separately using the shared prompt plus its identity block. Save the returned originals under `assets/generated/bosses/`. Inspect every original before processing; reject any sheet with missing rows, repeated identical feet, weapon changes, cropped limbs, text, or modern/Western armor.

- [ ] **Step 3: Remove chroma and normalize every atlas**

Run the pipeline for every id with this exact loop:

```bash
for id in chain-miner bone-jangseung flame-shaman iron-tiger headless-general drowned-warden eclipse-dokkaebi black-iron-giant sealed-monk shadow-magistrate; do
  python3 scripts/remove_chroma.py --input "assets/generated/bosses/${id}-source.png" --out "assets/generated/bosses/${id}-alpha.png"
  python3 scripts/normalize_grid_atlas.py --input "assets/generated/bosses/${id}-alpha.png" --out "public/assets/bosses/${id}-actions.png" --rows 5 --cols 8 --frame-size 256 --max-content 232
done
```

Inspect the final ten `2048×1280` PNG files at original resolution. Delete the intermediate `*-alpha.png` files after verification.

- [ ] **Step 4: Register all boss assets**

```ts
bosses: {
  'chain-miner': { key: 'boss-chain-miner-actions', path: '/assets/bosses/chain-miner-actions.png' },
  'bone-jangseung': { key: 'boss-bone-jangseung-actions', path: '/assets/bosses/bone-jangseung-actions.png' },
  'flame-shaman': { key: 'boss-flame-shaman-actions', path: '/assets/bosses/flame-shaman-actions.png' },
  'iron-tiger': { key: 'boss-iron-tiger-actions', path: '/assets/bosses/iron-tiger-actions.png' },
  'headless-general': { key: 'boss-headless-general-actions', path: '/assets/bosses/headless-general-actions.png' },
  'drowned-warden': { key: 'boss-drowned-warden-actions', path: '/assets/bosses/drowned-warden-actions.png' },
  'eclipse-dokkaebi': { key: 'boss-eclipse-dokkaebi-actions', path: '/assets/bosses/eclipse-dokkaebi-actions.png' },
  'black-iron-giant': { key: 'boss-black-iron-giant-actions', path: '/assets/bosses/black-iron-giant-actions.png' },
  'sealed-monk': { key: 'boss-sealed-monk-actions', path: '/assets/bosses/sealed-monk-actions.png' },
  'shadow-magistrate': { key: 'boss-shadow-magistrate-actions', path: '/assets/bosses/shadow-magistrate-actions.png' },
} satisfies Record<BossId, { key: string; path: string }>,
```

- [ ] **Step 5: Add a manifest consistency assertion**

Extend `catalog.test.ts` to assert each catalog texture key equals its manifest entry key and every path ends with `-actions.png`.

- [ ] **Step 6: Run catalog tests and build**

Run: `npm test -- --run src/game/bosses/catalog.test.ts && npm run build`

Expected: PASS and successful Vite asset references.

- [ ] **Step 7: Commit**

```bash
git add docs/BOSS_ART_PROMPTS.md assets/generated/bosses public/assets/bosses src/game/assets/manifest.ts src/game/bosses/catalog.test.ts
git commit -m "feat: add ten unique dungeon boss atlases"
```

---

### Task 5: Render boss sprites and bounded attack effects

**Files:**
- Create: `src/game/phaser/BossView.ts`
- Create: `src/game/phaser/BossEffects.ts`
- Create: `src/game/bosses/patternGeometry.ts`
- Create: `src/game/bosses/patternGeometry.test.ts`
- Modify: `src/game/phaser/HuntingScene.ts`

**Interfaces:**
- Consumes: `BossState`, `BossDefinition`, boss events, `ASSETS.bosses`.
- Produces: `containsPatternPoint(shape, origin, facing, point)`, `BossView.sync(state)`, `BossView.playAttack(facing)`, `BossView.destroy()`, `BossEffects.showTelegraph(...)`, `BossEffects.playImpact(...)`, `BossEffects.clear()`.

- [ ] **Step 1: Write geometry tests**

Export pure `containsPatternPoint(shape, origin, facing, point): boolean` from `src/game/bosses/patternGeometry.ts` and test circle, cone, line, and arena-safe-region boundaries. Import that same helper from both simulation impact resolution and `BossEffects` to guarantee visual/damage agreement without making simulation depend on Phaser.

- [ ] **Step 2: Run the geometry test and confirm failure**

Run: `npm test -- --run src/game/bosses/patternGeometry.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement BossView**

Create a container with shadow, selection ring, sprite, boss name, and hit zone. Create five walk and five attack animations per boss texture using frames `row*8..row*8+3` and `row*8+4..row*8+7`. Use `directionToFrame`, the catalog scale, and `origin(0.5, 0.97)`. The hit zone calls `simulation.selectBoss()` through a callback supplied to the constructor.

- [ ] **Step 4: Implement BossEffects with cleanup limits**

Draw pattern telegraphs from the catalog shape. Store all active objects and timers in the helper, destroy each one after recovery, cap simultaneous projectiles at 12 and hazards at 8, and make `clear()` cancel timers and destroy every object. Use only one-shot Phaser graphics and tweens.

- [ ] **Step 5: Wire the scene**

Preload ten boss atlases, create/destroy `BossView` on spawn/reset, synchronize it each frame, and route telegraph/impact/phase events into `BossEffects`. On `boss-killed`, render the existing corpse treatment with boss scale, clear all effects, shake the camera, and expose the stair unlock state to `renderDungeonFloor()`.

Record Phaser `loaderror` events for boss texture keys. If any boss texture is missing, keep the dungeon entrance interaction disabled, render `보스 자원을 불러오지 못했다` over the entrance, and log the failed texture key; do not substitute an ordinary monster texture.

- [ ] **Step 6: Run tests and build**

Run: `npm test -- --run src/game/bosses/patternGeometry.test.ts && npm run build`

Expected: PASS and successful TypeScript/Vite build.

- [ ] **Step 7: Commit**

```bash
git add src/game/phaser src/game/simulation/GameSimulation.ts
git commit -m "feat: render boss combat and telegraphs"
```

---

### Task 6: Add boss HUD, phase feedback, and locked-stair messaging

**Files:**
- Modify: `src/game/ui/Hud.ts`
- Modify: `src/styles.css`
- Modify: `src/game/phaser/HuntingScene.ts`

**Interfaces:**
- Consumes: `CombatTarget`, boss phase events, stair-lock events.
- Produces: visible boss name/floor/phase/health and disabled-stair feedback.

- [ ] **Step 1: Add HUD snapshot/event tests if a HUD test file exists; otherwise add pure label helpers**

Export and test:

```ts
export function targetKindLabel(target: CombatTarget): string;
export function bossPhaseLabel(target: CombatTarget): string;
```

Expected boss labels are `심층 보스 · 10층` and `2페이즈` for a floor-10 phase-two boss.

- [ ] **Step 2: Implement boss target presentation**

When the target is a boss, use a wider ornate boss card, show floor and phase, and preserve the ordinary monster card for non-boss targets. Handle `boss-phase-changed`, `boss-killed`, `dungeon-stair-lock-changed`, and `dungeon-complete` in the combat feed.

- [ ] **Step 3: Render stair lock state**

The next-floor stair must use muted color, omit hand cursor, and ignore pointerdown while locked. Show `보스를 처치해야 열린다` above it. On unlock, restore the gold border, hand cursor, destination floor label, and interaction without rebuilding duplicate input handlers.

- [ ] **Step 4: Run full tests and build**

Run: `npm test -- --run && npm run build`

Expected: all tests PASS and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/game/ui/Hud.ts src/game/phaser/HuntingScene.ts src/styles.css
git commit -m "feat: add boss HUD and stair lock feedback"
```

---

### Task 7: Verify all ten boss definitions and representative live fights

**Files:**
- Modify tests only if verification exposes a reproducible defect.

**Interfaces:**
- Consumes all prior task outputs.
- Produces verified game behavior and no new production interface.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test -- --run`

Expected: every test file PASS, including catalog, controller, generator, simulation, geometry, direction, and equipment tests.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully. The existing bundle-size warning is acceptable; new errors are not.

- [ ] **Step 3: Browser-smoke floor 10**

Reload `http://127.0.0.1:5173/`, enter Muyeong Mine, reach the floor-10 checkpoint using normal stairs, and verify: only the chain miner is present, the stair is locked, three telegraph shapes appear before impacts, attack direction follows the player, the 50% phase change occurs once, death returns to the mine entrance, re-entry resumes at floor 10, killing the boss unlocks floor 11, and browser error/warning logs are empty.

- [ ] **Step 4: Browser-smoke floors 20, 50, and 100**

Use an in-game development floor selector only if one already exists; do not add a production cheat. Otherwise advance through the tested simulation API in a test build. Confirm unique textures and signature effects for the bone jangseung, headless general, and shadow magistrate. At floor 100, confirm one `dungeon-complete` feed entry and no clickable floor-101 stair.

- [ ] **Step 5: Visual atlas review**

Inspect all ten runtime atlases and representative in-game directions at actual scale. Reject floating feet, unchanged walk legs, clipped weapons, inconsistent props, wrong directional faces, or a boss rendered with another boss texture.

- [ ] **Step 6: Final verification commit if fixes were required**

If fixes were required, inspect `git diff --name-only`, stage only the explicit files changed to resolve those findings, and commit them with `git commit -m "fix: resolve dungeon boss playtest findings"`. If no files changed, do not create an empty commit.
