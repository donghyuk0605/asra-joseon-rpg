import Phaser from 'phaser';
import { ASSETS, MONSTER_FRAME, PLAYER_ACTION_FRAME } from '../assets/manifest';
import { ITEM_CATALOG } from '../items/catalog';
import { GameSimulation } from '../simulation/GameSimulation';
import type { GameEvent, GroundDrop, ItemId, MonsterKind, MonsterState } from '../simulation/types';
import { Hud } from '../ui/Hud';
import { directionToFrame } from './direction';
import { CombatAudio } from './CombatAudio';
import { resolvePlayerLayers, type PlayerVisualMode } from './playerVisualMode';
import { weaponAttachmentForFrame } from './playerLayerState';
import {
  CENTRAL_WORLD_HEIGHT, MAP_HEIGHT, MAP_WIDTH, VILLAGE_TOP,
  WORLD_HEIGHT, WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH, REGION_ORIGINS,
} from '../world/layout';
import { REGIONS, type RegionId } from '../world/regions';
import { BOSS_CATALOG, bossForFloor } from '../bosses/catalog';
import type { BossId, BossState } from '../bosses/types';

type MonsterView = {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  hp: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
  baseScale: number;
  lastDustAt: number;
};

type BossView = {
  bossId: BossId;
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  hp: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
  baseScale: number;
};

type CorpseView = {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  remainingMs: number;
  fading: boolean;
};

type GroundItemView = {
  glow: Phaser.GameObjects.Ellipse;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  phase: number;
};

type VillageNpcMode = 'armor-only' | 'fully-equipped' | 'commoner';

type VillageNpcView = {
  id: string;
  name: string;
  dialogue: string;
  role: 'patrol' | 'blacksmith';
  mode: VillageNpcMode;
  tint: number;
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  patrol: Array<{ x: number; y: number }>;
  patrolIndex: number;
  speed: number;
  facing: number;
  pauseMs: number;
  actionTimerMs: number;
  hammer?: Phaser.GameObjects.Container;
};

const MONSTER_KINDS: MonsterKind[] = ['dokkaebi', 'boar', 'bandit', 'bamboo-spirit', 'mine-golem', 'moon-revenant'];
const MONSTER_SCALE: Record<MonsterKind, number> = {
  dokkaebi: 0.50,
  boar: 0.52,
  bandit: 0.51,
  'bamboo-spirit': 0.50,
  'mine-golem': 0.54,
  'moon-revenant': 0.50,
};

const PLAYER_SCALE = 0.51;
const HUD_UPDATE_INTERVAL = 80;
const MONSTER_CORPSE_LIFETIME_MS = 30_000;
const MONSTER_CORPSE_FADE_MS = 800;
const MAX_MONSTER_CORPSES = 12;

const MONSTER_CORPSE_POSE: Record<MonsterKind, {
  frame: number;
  angle: number;
  originY: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}> = {
  boar: { frame: 22, angle: 4, originY: 0.9, x: 5, y: 8, scaleX: 1.06, scaleY: 0.72 },
  dokkaebi: { frame: 15, angle: 73, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  bandit: { frame: 11, angle: 76, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'bamboo-spirit': { frame: 15, angle: 72, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
  'mine-golem': { frame: 14, angle: 68, originY: 0.68, x: 2, y: -2, scaleX: 1.04, scaleY: 0.86 },
  'moon-revenant': { frame: 15, angle: 78, originY: 0.66, x: 1, y: -4, scaleX: 1, scaleY: 0.9 },
};

export class HuntingScene extends Phaser.Scene {
  private readonly simulation = new GameSimulation();
  private worldBackground!: Phaser.GameObjects.Image;
  private playerRoot!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerArmorSprite!: Phaser.GameObjects.Sprite;
  private playerWeaponSprite!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private destinationMark!: Phaser.GameObjects.Arc;
  private monsterViews = new Map<string, MonsterView>();
  private bossView: BossView | null = null;
  private corpseViews: CorpseView[] = [];
  private groundItemViews = new Map<string, GroundItemView>();
  private villageNpcs: VillageNpcView[] = [];
  private hud!: Hud;
  private attackLock = 0;
  private hitStopMs = 0;
  private playerLastStepAt = 0;
  private playerDefeated = false;
  private hudAccumulator = HUD_UPDATE_INTERVAL;
  private menuOpen = false;
  private currentRegion: RegionId = 'solgogae';
  private regionLabel!: Phaser.GameObjects.Text;
  private lastPlayerSimulationPosition = { x: 0, y: 0 };
  private readonly combatAudio = new CombatAudio();
  private dungeonVisuals: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('hunting-ground'); }

  preload(): void {
    this.load.image(ASSETS.worldBackground.key, ASSETS.worldBackground.path);
    this.load.image(ASSETS.dungeonBackground.key, ASSETS.dungeonBackground.path);
    for (const transition of Object.values(ASSETS.transitions)) this.load.image(transition.key, transition.path);
    this.load.image(ASSETS.props.spiritShrine.key, ASSETS.props.spiritShrine.path);
    this.load.image(ASSETS.props.brokenCart.key, ASSETS.props.brokenCart.path);
    this.load.image(ASSETS.props.blacksmithHammer.key, ASSETS.props.blacksmithHammer.path);
    this.load.image(ASSETS.props.blacksmithWorkstation.key, ASSETS.props.blacksmithWorkstation.path);
    for (const player of [ASSETS.playerUnequipped, ASSETS.playerWeaponOnly, ASSETS.playerArmorOnly, ASSETS.playerFullyEquipped]) {
      this.load.spritesheet(player.key, player.path, {
        frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
      });
    }
    this.load.spritesheet(ASSETS.villageCommoner.key, ASSETS.villageCommoner.path, {
      frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
    });
    this.load.spritesheet(ASSETS.playerArmorLayer.key, ASSETS.playerArmorLayer.path, {
      frameWidth: PLAYER_ACTION_FRAME.width, frameHeight: PLAYER_ACTION_FRAME.height, endFrame: 39,
    });
    for (const monster of Object.values(ASSETS.monsters)) {
      this.load.spritesheet(monster.key, monster.path, {
        frameWidth: MONSTER_FRAME.width, frameHeight: MONSTER_FRAME.height, endFrame: 39,
      });
    }
    for (const boss of Object.values(ASSETS.bosses)) {
      this.load.spritesheet(boss.key, boss.path, {
        frameWidth: MONSTER_FRAME.width, frameHeight: MONSTER_FRAME.height, endFrame: 39,
      });
    }
    for (const item of Object.values(ITEM_CATALOG)) this.load.image(item.iconKey, item.iconPath);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#151711');
    this.add.image(-MAP_WIDTH / 2, VILLAGE_TOP + MAP_HEIGHT / 2, ASSETS.transitions.mistwoodVillage.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT);
    this.worldBackground = this.add.image(MAP_WIDTH / 2, CENTRAL_WORLD_HEIGHT / 2, ASSETS.worldBackground.key)
      .setDisplaySize(MAP_WIDTH, CENTRAL_WORLD_HEIGHT);
    this.add.image(MAP_WIDTH * 1.5, VILLAGE_TOP + MAP_HEIGHT / 2, ASSETS.transitions.villageMinepass.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT);
    this.add.image(MAP_WIDTH / 2, CENTRAL_WORLD_HEIGHT + MAP_HEIGHT / 2, ASSETS.transitions.villageMoonfield.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT);
    this.add.image(REGION_ORIGINS.dungeon.x + MAP_WIDTH / 2, MAP_HEIGHT / 2, ASSETS.dungeonBackground.key)
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT);
    this.add.rectangle(WORLD_MIN_X + WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x101610, 0.06)
      .setInteractive({ useHandCursor: false });
    this.createOpenFieldSeams();
    this.createEnvironment();
    this.createAnimations();
    this.createVillage();
    this.createRegionPortals();
    this.createDungeonEntrance();

    this.destinationMark = this.add.circle(0, 0, 15, 0x000000, 0).setStrokeStyle(2, 0xd7b66c, 0.9).setVisible(false).setDepth(1900);
    this.playerShadow = this.add.ellipse(0, 5, 58, 18, 0x090a07, 0.42);
    this.playerSprite = this.add.sprite(0, 0, ASSETS.playerUnequipped.key, 0)
      .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97);
    this.playerArmorSprite = this.add.sprite(0, 0, ASSETS.playerArmorLayer.key, 0)
      .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97).setVisible(false);
    this.playerWeaponSprite = this.add.image(0, 0, ITEM_CATALOG['worn-hwando'].iconKey)
      .setOrigin(0.78, 0.18).setVisible(false);
    this.playerRoot = this.add.container(this.simulation.player.x, this.simulation.player.y, [
      this.playerShadow, this.playerSprite, this.playerArmorSprite, this.playerWeaponSprite,
    ])
      .setDepth(this.simulation.player.y + 10);
    this.lastPlayerSimulationPosition = { x: this.simulation.player.x, y: this.simulation.player.y };

    this.createMonsterViews();
    this.hud = new Hud(document.querySelector<HTMLElement>('#hud')!, {
      onPotion: () => this.simulation.usePotion(),
      onQuickStep: () => this.simulation.quickStep(),
      onEquip: (instanceId) => this.simulation.equipItem(instanceId),
      onInventoryToggle: (open) => {
        this.menuOpen = open;
        this.destinationMark.setVisible(false);
        if (open) {
          this.tweens.pauseAll();
          this.anims.pauseAll();
        } else {
          this.tweens.resumeAll();
          this.anims.resumeAll();
        }
      },
    });
    this.hud.update({
      region: this.simulation.region,
      dungeonFloor: this.simulation.dungeonFloor,
      player: this.simulation.player,
      target: null,
      inventory: this.simulation.inventory,
      equipment: this.simulation.equipment,
      inventoryCapacity: this.simulation.inventoryCapacity,
      attackPower: this.simulation.getAttackPower(),
      defense: this.simulation.getDefense(),
      accuracy: this.simulation.getAccuracy(),
      evasion: this.simulation.getEvasion(),
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
      if (this.menuOpen) return;
      this.combatAudio.prime();
      if (objects.some((object) => object.getData('monsterId') || object.getData('dropId') || object.getData('villageNpc') || object.getData('dungeonAction'))) return;
      const point = { x: pointer.worldX, y: pointer.worldY };
      this.simulation.moveTo(point);
      this.attackLock = 0;
      this.playerSprite.stop();
      const destination = this.simulation.player.destination ?? point;
      this.destinationMark.setPosition(destination.x, destination.y).setVisible(true).setScale(0.6).setAlpha(1);
      this.tweens.add({ targets: this.destinationMark, scale: 1.5, alpha: 0, duration: 450, onComplete: () => this.destinationMark.setVisible(false) });
    });

    this.input.keyboard?.on('keydown-TWO', () => {
      if (!this.menuOpen) this.simulation.usePotion();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.menuOpen) this.simulation.quickStep();
    });
    this.input.keyboard?.on('keydown-I', (event: KeyboardEvent) => {
      if (!event.repeat) this.hud.toggleInventory();
    });
    if (import.meta.env.DEV) {
      this.input.keyboard?.on('keydown-F10', () => {
        if (this.simulation.region !== 'dungeon') this.simulation.enterDungeon();
        while (this.simulation.dungeonFloor < 10 && !this.simulation.isDungeonExitLocked()) {
          this.simulation.advanceDungeonFloor();
        }
      });
      this.input.keyboard?.on('keydown-F9', () => {
        if (this.simulation.boss?.alive) this.simulation.damageBoss(Number.MAX_SAFE_INTEGER);
      });
      this.input.keyboard?.on('keydown-F7', () => this.toggleDevEquipment('worn-hwando'));
      this.input.keyboard?.on('keydown-F6', () => this.toggleDevEquipment('hunter-durumagi'));
    }

    this.scale.on('resize', () => this.fitCamera());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hud.destroy();
      this.tweens.resumeAll();
      this.anims.resumeAll();
    });
    this.fitCamera();
  }

  update(_: number, delta: number): void {
    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - delta);
      if (this.hitStopMs === 0) this.endHitStop();
      this.syncPlayerEquipmentLayers();
      return;
    }
    if (this.menuOpen) {
      this.flushEventsAndHud(delta);
      return;
    }
    this.simulation.update(delta / 1000);
    this.attackLock = Math.max(0, this.attackLock - delta / 1000);
    this.syncPlayer();
    this.syncPlayerEquipmentLayers();
    this.syncMonsters();
    this.syncBoss();
    this.syncGroundItems();
    this.syncCorpses(delta);
    this.syncVillageNpcs(delta);
    this.flushEventsAndHud(delta);
  }

  private flushEventsAndHud(delta: number): void {
    const events = this.simulation.drainEvents();
    for (const event of events) this.handleEvent(event);
    this.hudAccumulator += delta;
    if (events.length > 0 || this.hudAccumulator >= HUD_UPDATE_INTERVAL) {
      this.hudAccumulator = 0;
      this.hud.update({
        region: this.simulation.region,
        dungeonFloor: this.simulation.dungeonFloor,
        player: this.simulation.player,
        target: this.simulation.getTarget() ?? this.simulation.getBossTarget(),
        inventory: this.simulation.inventory,
        equipment: this.simulation.equipment,
        inventoryCapacity: this.simulation.inventoryCapacity,
        attackPower: this.simulation.getAttackPower(),
        defense: this.simulation.getDefense(),
        accuracy: this.simulation.getAccuracy(),
        evasion: this.simulation.getEvasion(),
      });
    }
  }

  private createAnimations(): void {
    const combinedPlayers: Array<[PlayerVisualMode, string]> = [
      ['unequipped', ASSETS.playerUnequipped.key],
      ['weapon-only', ASSETS.playerWeaponOnly.key],
      ['armor-only', ASSETS.playerArmorOnly.key],
      ['fully-equipped', ASSETS.playerFullyEquipped.key],
    ];
    for (const [mode, textureKey] of combinedPlayers) {
      for (let row = 0; row < 5; row += 1) {
        this.anims.create({
          key: `player-walk-${mode}-${row}`,
          frames: this.anims.generateFrameNumbers(textureKey, { start: row * 8, end: row * 8 + 3 }),
          frameRate: 11, repeat: -1,
        });
        this.anims.create({
          key: `player-attack-${mode}-${row}`,
          frames: this.anims.generateFrameNumbers(textureKey, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: mode === 'weapon-only' || mode === 'fully-equipped' ? 10 : 11, repeat: 0,
        });
      }
    }
    for (let row = 0; row < 5; row += 1) {
      this.anims.create({
        key: `player-walk-commoner-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.villageCommoner.key, { start: row * 8, end: row * 8 + 3 }),
        frameRate: 10, repeat: -1,
      });
      this.anims.create({
        key: `player-attack-commoner-${row}`,
        frames: this.anims.generateFrameNumbers(ASSETS.villageCommoner.key, { start: row * 8 + 4, end: row * 8 + 7 }),
        frameRate: 9, repeat: 0,
      });
    }
    for (const kind of MONSTER_KINDS) {
      const texture = ASSETS.monsters[kind];
      for (let row = 0; row < 5; row += 1) {
        this.anims.create({
          key: `monster-walk-${kind}-${row}`,
          frames: this.anims.generateFrameNumbers(texture.key, { start: row * 8, end: row * 8 + 3 }),
          frameRate: kind === 'boar' ? 11 : 9,
          repeat: -1,
        });
        this.anims.create({
          key: `monster-attack-${kind}-${row}`,
          frames: this.anims.generateFrameNumbers(texture.key, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: kind === 'boar' ? 11 : 9,
          repeat: 0,
        });
      }
    }
    for (const definition of Object.values(BOSS_CATALOG)) {
      for (let row = 0; row < 5; row += 1) {
        this.anims.create({
          key: `boss-walk-${definition.id}-${row}`,
          frames: this.anims.generateFrameNumbers(definition.textureKey, { start: row * 8, end: row * 8 + 3 }),
          frameRate: 9, repeat: -1,
        });
        this.anims.create({
          key: `boss-attack-${definition.id}-${row}`,
          frames: this.anims.generateFrameNumbers(definition.textureKey, { start: row * 8 + 4, end: row * 8 + 7 }),
          frameRate: 10, repeat: 0,
        });
      }
    }
  }

  private createEnvironment(): void {
    this.createWaterFlow();
    const cartShadow = this.add.ellipse(315, 741, 156, 44, 0x090b08, 0.42).setDepth(730);
    const cart = this.add.image(315, 735, ASSETS.props.brokenCart.key)
      .setDisplaySize(232, 232).setOrigin(0.5, 0.88).setDepth(735);
    const shrineShadow = this.add.ellipse(1120, 700, 132, 42, 0x090b08, 0.45).setDepth(685);
    const shrine = this.add.image(1120, 690, ASSETS.props.spiritShrine.key)
      .setDisplaySize(226, 226).setOrigin(0.5, 0.9).setDepth(690);
    cartShadow.setScale(1.04, 0.82);
    shrineShadow.setScale(1, 0.8);
    cart.setTint(0xe8e0cf);
    shrine.setTint(0xe4dfce);

    for (let index = 0; index < 12; index += 1) {
      const x = 255 + ((index * 137) % 1040);
      const y = 270 + ((index * 83) % 520);
      const glow = this.add.circle(x, y, index % 3 === 0 ? 2.2 : 1.4, 0xf4d889, 0.48)
        .setDepth(1450 + index);
      this.tweens.add({
        targets: glow,
        x: x + (index % 2 === 0 ? 18 : -18),
        y: y - 12 - (index % 4) * 4,
        alpha: { from: 0.14, to: 0.72 },
        scale: { from: 0.7, to: 1.35 },
        duration: 1800 + index * 115,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const fogBands = [
      { x: 360, y: 462, w: 390, h: 76, depth: 410, duration: 9200 },
      { x: 1010, y: 540, w: 470, h: 88, depth: 530, duration: 11400 },
      { x: 690, y: 805, w: 520, h: 72, depth: 790, duration: 12800 },
    ];
    for (const band of fogBands) {
      const fog = this.add.ellipse(band.x, band.y, band.w, band.h, 0xb9c3ae, 0.035).setDepth(band.depth);
      this.tweens.add({
        targets: fog,
        x: band.x + 96,
        alpha: { from: 0.018, to: 0.055 },
        duration: band.duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.createSwayingCanopies();
    this.createWindField();
  }

  private createVillage(): void {
    const villageTop = VILLAGE_TOP;

    // A soft earth-and-mist bridge hides the texture seam while keeping the gate route readable.
    const roadBlend = this.add.ellipse(770, villageTop + 4, 330, 96, 0x766044, 0.14)
      .setDepth(villageTop - 38);
    roadBlend.setBlendMode(Phaser.BlendModes.SCREEN);
    for (let index = 0; index < 10; index += 1) {
      const x = 40 + index * 165;
      const fog = this.add.ellipse(x, villageTop + (index % 2 === 0 ? -5 : 8), 245, 92 + (index % 3) * 18, 0x9ba297, 0.075)
        .setDepth(villageTop - 39 + index);
      this.tweens.add({
        targets: fog,
        x: x + (index % 2 === 0 ? 28 : -24),
        alpha: { from: 0.045, to: 0.1 },
        duration: 6200 + index * 310,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const lanterns = [
      { x: 535, y: villageTop + 302 }, { x: 665, y: villageTop + 228 },
      { x: 872, y: villageTop + 228 }, { x: 1110, y: villageTop + 326 },
      { x: 475, y: villageTop + 660 }, { x: 1035, y: villageTop + 595 },
    ];
    lanterns.forEach((point, index) => {
      const outer = this.add.circle(point.x, point.y, 27, 0xe59d46, 0.055).setDepth(point.y - 4);
      const core = this.add.circle(point.x, point.y, 4, 0xffc66d, 0.78).setDepth(point.y + 2);
      outer.setBlendMode(Phaser.BlendModes.ADD);
      core.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [outer, core],
        alpha: { from: index % 2 === 0 ? 0.55 : 0.38, to: index % 2 === 0 ? 0.9 : 0.72 },
        scale: { from: 0.86, to: 1.12 },
        duration: 940 + index * 115,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Forge smoke drifts independently of the painted chimney.
    for (let index = 0; index < 5; index += 1) {
      const smoke = this.add.ellipse(1370, villageTop + 100, 24 + index * 5, 13 + index * 3, 0xa9aea5, 0.11)
        .setDepth(villageTop + 105 + index);
      this.tweens.add({
        targets: smoke,
        x: 1325 - index * 12,
        y: villageTop + 20 - index * 10,
        scaleX: 1.8,
        scaleY: 1.55,
        alpha: 0,
        duration: 4200 + index * 480,
        delay: index * 620,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }

    this.createVillageNpc({
      id: 'gate-warden', x: 690, y: villageTop + 300, name: '북문 수문장',
      dialogue: '산길에 요괴가 들끓으니, 장비를 단단히 챙기시오.', mode: 'fully-equipped', tint: 0x9ea49a,
      speed: 34, patrol: [
        { x: 690, y: villageTop + 300 }, { x: 610, y: villageTop + 345 },
        { x: 620, y: villageTop + 430 }, { x: 705, y: villageTop + 390 },
      ],
    });
    this.createVillageNpc({
      id: 'patrol-guard', x: 850, y: villageTop + 300, name: '순라군',
      dialogue: '마을 안은 안전하오. 상처를 돌보고 다시 나가시오.', mode: 'fully-equipped', tint: 0x87929e,
      speed: 38, patrol: [
        { x: 850, y: villageTop + 300 }, { x: 930, y: villageTop + 345 },
        { x: 920, y: villageTop + 430 }, { x: 835, y: villageTop + 390 },
      ],
    });
    this.createVillageNpc({
      id: 'innkeeper', x: 520, y: villageTop + 455, name: '주모 연화',
      dialogue: '따뜻한 국밥 냄새가 나는구먼. 아직 장사는 준비 중이오.', mode: 'armor-only', tint: 0xb78d76,
      speed: 27, patrol: [
        { x: 520, y: villageTop + 455 }, { x: 625, y: villageTop + 500 },
        { x: 650, y: villageTop + 585 }, { x: 515, y: villageTop + 590 },
        { x: 455, y: villageTop + 520 },
      ],
    });
    this.createVillageNpc({
      id: 'blacksmith', x: 1115, y: villageTop + 480, name: '대장장이 무쇠', role: 'blacksmith',
      dialogue: '요괴에게서 얻은 쇳조각이라면 쓸 만한 칼을 만들 수 있지.', mode: 'commoner', tint: 0x9d806d,
      speed: 0, patrol: [], facing: Math.PI,
    });
    this.createVillageNpc({
      id: 'merchant', x: 560, y: villageTop + 625, name: '행상 장도리',
      dialogue: '귀한 부적과 약재를 구하고 있소. 장터를 둘러보시오.', mode: 'commoner', tint: 0x7d8b78,
      speed: 31, patrol: [
        { x: 560, y: villageTop + 625 }, { x: 690, y: villageTop + 655 },
        { x: 810, y: villageTop + 600 }, { x: 720, y: villageTop + 535 },
        { x: 590, y: villageTop + 555 },
      ],
    });
    this.createVillageNpc({
      id: 'farmer', x: 830, y: villageTop + 690, name: '농부 만복',
      dialogue: '남쪽 들판의 은빛 풀이 밤마다 사람처럼 운다오.', mode: 'commoner', tint: 0xa5967b,
      speed: 29, patrol: [
        { x: 830, y: villageTop + 690 }, { x: 760, y: villageTop + 745 },
        { x: 690, y: villageTop + 700 }, { x: 745, y: villageTop + 640 },
      ],
    });
    this.createVillageNpc({
      id: 'herbalist', x: 1010, y: villageTop + 520, name: '약초꾼 칠성',
      dialogue: '청람 안개숲의 푸른 불빛은 따라가면 안 되오.', mode: 'commoner', tint: 0x758675,
      speed: 26, patrol: [
        { x: 1010, y: villageTop + 520 }, { x: 930, y: villageTop + 555 },
        { x: 875, y: villageTop + 510 }, { x: 950, y: villageTop + 470 },
      ],
    });
    this.createVillageNpc({
      id: 'porter', x: 1180, y: villageTop + 690, name: '짐꾼 덕구',
      dialogue: '폐광 쪽 수레길이 열렸지만 광산귀가 버티고 있소.', mode: 'commoner', tint: 0x8b7666,
      speed: 33, patrol: [
        { x: 1180, y: villageTop + 690 }, { x: 1110, y: villageTop + 750 },
        { x: 1035, y: villageTop + 715 }, { x: 1090, y: villageTop + 650 },
      ],
    });

    this.add.text(770, villageTop + 155, '달빛고을', {
      fontFamily: 'serif', fontSize: '21px', fontStyle: 'bold', color: '#d8bd80',
      stroke: '#20160f', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(villageTop + 162).setAlpha(0.82);

    this.regionLabel = this.add.text(0, 0, '', {
      fontFamily: 'serif', fontSize: '25px', fontStyle: 'bold', color: '#ead6a5',
      backgroundColor: 'rgba(20,15,11,0.72)', padding: { x: 18, y: 9 },
      stroke: '#2a1a10', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2500).setScrollFactor(0).setAlpha(0);
  }

  private createRegionPortals(): void {
    const createMarker = (x: number, y: number, label: string, arrow: string, color: number) => {
      const path = this.add.ellipse(0, 10, 150, 48, 0x8b704f, 0.2).setStrokeStyle(1, color, 0.42);
      const leftPost = this.add.rectangle(-48, -6, 7, 55, 0x44311f, 0.95).setStrokeStyle(1, 0x8c6f46, 0.7);
      const rightPost = this.add.rectangle(48, -6, 7, 55, 0x44311f, 0.95).setStrokeStyle(1, 0x8c6f46, 0.7);
      const board = this.add.rectangle(0, -25, 104, 25, 0x241a12, 0.96).setStrokeStyle(1, color, 0.8);
      const text = this.add.text(0, -25, `${arrow} ${label}`, {
        fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#ead7ac',
        stroke: '#1a100a', strokeThickness: 3,
      }).setOrigin(0.5);
      return this.add.container(x, y, [path, leftPost, rightPost, board, text]).setDepth(y + 1);
    };

    createMarker(72, VILLAGE_TOP + 470, '청람 안개숲', '←', 0x88aa91);
    createMarker(MAP_WIDTH - 72, VILLAGE_TOP + 470, '흑철 폐광고개', '→', 0xb18b67);
    createMarker(770, CENTRAL_WORLD_HEIGHT - 54, '월하 그림자들', '↓', 0x8195bd);
    createMarker(-72, VILLAGE_TOP + 470, '달빛고을', '→', 0x9ab391);
    createMarker(MAP_WIDTH + 72, VILLAGE_TOP + 470, '달빛고을', '←', 0xb39a76);
    createMarker(770, CENTRAL_WORLD_HEIGHT + 54, '달빛고을', '↑', 0x91a5ca);
  }

  private createDungeonEntrance(): void {
    const x = REGION_ORIGINS.minepass.x + 770;
    const y = REGION_ORIGINS.minepass.y + 300;
    const glow = this.add.ellipse(x, y + 5, 150, 54, 0x5e3827, 0.32)
      .setStrokeStyle(2, 0xd2a364, 0.75).setDepth(y - 2);
    const gate = this.add.text(x, y - 34, '封  무영광산 입구', {
      fontFamily: 'serif', fontSize: '15px', fontStyle: 'bold', color: '#f0d39a',
      backgroundColor: 'rgba(24,15,11,0.88)', padding: { x: 13, y: 8 }, stroke: '#24130b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(y + 2);
    const zone = this.add.zone(x, y - 8, 190, 100).setInteractive({ useHandCursor: true }).setDepth(y + 4);
    zone.setData('dungeonAction', 'enter');
    zone.on('pointerover', () => glow.setStrokeStyle(3, 0xf2c879, 1));
    zone.on('pointerout', () => glow.setStrokeStyle(2, 0xd2a364, 0.75));
    zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.enterDungeon();
    });
    this.tweens.add({ targets: [glow, gate], alpha: { from: 0.68, to: 1 }, duration: 1200, yoyo: true, repeat: -1 });
  }

  private renderDungeonFloor(): void {
    for (const visual of this.dungeonVisuals) visual.destroy();
    this.dungeonVisuals = [];
    const layout = this.simulation.dungeonLayout;
    if (!layout) return;
    const origin = REGION_ORIGINS.dungeon;
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.dungeonVisuals.push(object);
      return object;
    };
    const floorMark = add(this.add.text(origin.x + 760, 246, `${layout.title} · ${layout.floor}층`, {
      fontFamily: 'serif', fontSize: '18px', fontStyle: 'bold', color: '#d6b77d',
      stroke: '#21140e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(250));
    floorMark.setAlpha(0.88);

    for (const feature of layout.features) {
      const x = origin.x + feature.x;
      const y = origin.y + feature.y;
      if (feature.kind === 'wall') {
        add(this.add.rectangle(x, y, feature.width, feature.height, 0x211b18, 0.88)
          .setStrokeStyle(3, 0x76604b, 0.82).setDepth(y));
      } else if (feature.kind === 'pillar') {
        add(this.add.ellipse(x, y + 4, feature.radius * 2.2, feature.radius * 0.9, 0x0b0908, 0.48).setDepth(y - 2));
        add(this.add.circle(x, y - 14, feature.radius, 0x302922, 0.98).setStrokeStyle(3, 0x806b52, 0.82).setDepth(y + 1));
      } else if (feature.kind === 'trap') {
        const trap = add(this.add.star(x, y, 8, feature.radius * 0.38, feature.radius, 0x4b211d, 0.48)
          .setStrokeStyle(2, 0xb55b45, 0.75).setDepth(y - 3));
        this.tweens.add({ targets: trap, alpha: { from: 0.28, to: 0.72 }, duration: 850, yoyo: true, repeat: -1 });
      } else {
        const seal = add(this.add.circle(x, y, feature.radius, 0x301726, 0.2)
          .setStrokeStyle(3, 0xb96a72, 0.72).setDepth(y - 4));
        add(this.add.text(x, y, '封', { fontFamily: 'serif', fontSize: `${Math.round(feature.radius * 0.7)}px`, color: '#b96a72' })
          .setOrigin(0.5).setAlpha(0.56).setDepth(y - 3));
        this.tweens.add({ targets: seal, angle: 360, duration: 12000, repeat: -1 });
      }
    }

    const createStairs = (point: { x: number; y: number }, label: string, action: 'next' | 'exit') => {
      const x = origin.x + point.x;
      const y = origin.y + point.y;
      const locked = action === 'next' && this.simulation.isDungeonExitLocked();
      const base = add(this.add.rectangle(x, y, 120, 62, locked ? 0x431b1d : action === 'next' ? 0x44372a : 0x2e2924, 0.94)
        .setStrokeStyle(2, locked ? 0xc24d48 : action === 'next' ? 0xd2aa63 : 0x9e927f, 0.86).setDepth(y - 1));
      for (let index = 0; index < 4; index += 1) {
        add(this.add.rectangle(x, y - 21 + index * 13, 94 - index * 11, 8, 0x74624c, 0.8).setDepth(y + index));
      }
      add(this.add.text(x, y - 48, locked ? '封 보스 토벌 후 개방' : label, {
        fontFamily: 'serif', fontSize: '13px', fontStyle: 'bold', color: locked ? '#ff9f8d' : '#f0d7a1', stroke: '#21130c', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(y + 8));
      const zone = add(this.add.zone(x, y, 150, 100).setInteractive({ useHandCursor: true }).setDepth(y + 9));
      zone.setData('dungeonAction', action);
      zone.on('pointerover', () => base.setStrokeStyle(3, locked ? 0xf06b61 : 0xf0c878, 1));
      zone.on('pointerout', () => base.setStrokeStyle(2, locked ? 0xc24d48 : action === 'next' ? 0xd2aa63 : 0x9e927f, 0.86));
      zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.menuOpen) return;
        if (action === 'next') this.simulation.advanceDungeonFloor();
        else this.simulation.leaveDungeon();
      });
    };
    createStairs(layout.exitStairs, '지상으로 귀환', 'exit');
    createStairs(layout.nextStairs, layout.floor >= layout.maxFloor ? '최심부 · 100층' : `다음 층 · ${layout.floor + 1}층`, 'next');
  }

  private createOpenFieldSeams(): void {
    const seams = [
      { x: 0, y: VILLAGE_TOP + 470, w: 112, h: 470, dx: 24 },
      { x: MAP_WIDTH, y: VILLAGE_TOP + 470, w: 112, h: 470, dx: -22 },
      { x: MAP_WIDTH / 2, y: CENTRAL_WORLD_HEIGHT, w: 520, h: 104, dx: 32 },
    ];
    seams.forEach((seam, index) => {
      const fog = this.add.ellipse(seam.x, seam.y, seam.w, seam.h, 0xb2b7aa, 0.055)
        .setDepth(Math.round(seam.y - 90));
      fog.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: fog,
        x: seam.x + seam.dx,
        alpha: { from: 0.025, to: 0.085 },
        duration: 5700 + index * 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const fogCurtains = [
      ...[1040, 1270, 1500, 1730].flatMap((y, index) => [
        { x: -22, y, w: 330 + (index % 2) * 65, h: 285, drift: 38 },
        { x: MAP_WIDTH + 22, y, w: 330 + ((index + 1) % 2) * 65, h: 285, drift: -38 },
      ]),
      ...[300, 570, 840, 1110, 1320].map((x, index) => ({
        x, y: CENTRAL_WORLD_HEIGHT + (index % 2 === 0 ? -10 : 12),
        w: 390, h: 190 + (index % 2) * 35, drift: index % 2 === 0 ? 34 : -30,
      })),
    ];
    fogCurtains.forEach((curtain, index) => {
      const fog = this.add.ellipse(curtain.x, curtain.y, curtain.w, curtain.h, 0xa7b0a5, 0.075)
        .setDepth(Math.round(curtain.y - 115));
      fog.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: fog,
        x: curtain.x + curtain.drift,
        scaleX: { from: 0.92, to: 1.08 },
        alpha: { from: 0.045, to: 0.12 },
        duration: 6600 + index * 310,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const ambientFields = [
      { x: -820, y: VILLAGE_TOP + 430, color: 0xc4ddd0 },
      { x: MAP_WIDTH + 820, y: VILLAGE_TOP + 500, color: 0xd6b68b },
      { x: 760, y: CENTRAL_WORLD_HEIGHT + 520, color: 0xc8d5ff },
    ];
    ambientFields.forEach((field, fieldIndex) => {
      for (let index = 0; index < 7; index += 1) {
        const x = field.x - 310 + ((index * 113) % 620);
        const y = field.y - 230 + ((index * 79) % 460);
        const mote = this.add.circle(x, y, 1.3 + (index % 2), field.color, 0.28).setDepth(y + 40);
        this.tweens.add({
          targets: mote,
          x: x + (fieldIndex === 1 ? -22 : 28),
          y: y - 15,
          alpha: { from: 0.08, to: 0.48 },
          duration: 2100 + index * 170,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  private createVillageNpc(config: {
    id: string;
    x: number;
    y: number;
    name: string;
    dialogue: string;
    mode: VillageNpcMode;
    tint: number;
    speed: number;
    patrol: Array<{ x: number; y: number }>;
    role?: 'patrol' | 'blacksmith';
    facing?: number;
  }): void {
    const { x, y, name, dialogue, mode, tint } = config;
    const role = config.role ?? 'patrol';
    const facing = config.facing ?? Math.PI / 2;
    const direction = directionToFrame(facing);
    const shadow = this.add.ellipse(0, 4, 54, 17, 0x080907, 0.38);
    const texture = mode === 'fully-equipped'
      ? ASSETS.playerFullyEquipped.key
      : mode === 'commoner' ? ASSETS.villageCommoner.key : ASSETS.playerArmorOnly.key;
    const sprite = this.add.sprite(0, role === 'blacksmith' ? 6 : 0, texture, direction.row * 8)
      .setScale(0.48, role === 'blacksmith' ? 0.41 : 0.48)
      .setOrigin(0.5, 0.97).setFlipX(direction.flip).setTint(tint);
    const children: Phaser.GameObjects.GameObject[] = [shadow];
    if (role === 'blacksmith') {
      const workstation = this.add.image(-43, -27, ASSETS.props.blacksmithWorkstation.key)
        .setDisplaySize(142, 142).setOrigin(0.5, 0.68);
      children.push(workstation);
    }
    children.push(sprite);
    let hammer: Phaser.GameObjects.Container | undefined;
    if (role === 'blacksmith') {
      const hammerImage = this.add.image(-28, 0, ASSETS.props.blacksmithHammer.key).setDisplaySize(72, 72);
      hammer = this.add.container(-3, -53, [hammerImage]).setAngle(55);
      children.push(hammer);
    }
    const root = this.add.container(x, y, children).setDepth(y);
    const label = this.add.text(x, y - 91, name, {
      fontFamily: 'serif', fontSize: '12px', color: '#e8d7b6', stroke: '#1b120c', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(y + 2);
    const zone = this.add.zone(x, y - 38, 78, 108).setDepth(y + 3).setInteractive({ useHandCursor: true });
    zone.setData('villageNpc', name);
    const npc: VillageNpcView = {
      id: config.id, name, dialogue, role, mode, tint, root, sprite, shadow, label, hitZone: zone,
      patrol: config.patrol, patrolIndex: config.patrol.length > 1 ? 1 : 0, speed: config.speed,
      facing, pauseMs: role === 'blacksmith' ? 350 : 250 + this.villageNpcs.length * 160,
      actionTimerMs: 0, hammer,
    };
    this.villageNpcs.push(npc);
    zone.on('pointerover', () => sprite.setTint(0xd9c99f));
    zone.on('pointerout', () => sprite.setTint(tint));
    zone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.menuOpen) return;
      this.interactWithVillageNpc(npc);
    });
  }

  private syncVillageNpcs(deltaMs: number): void {
    for (const npc of this.villageNpcs) {
      npc.pauseMs = Math.max(0, npc.pauseMs - deltaMs);
      if (npc.role === 'blacksmith') {
        this.syncBlacksmith(npc, deltaMs);
        this.syncVillageNpcAttachments(npc);
        continue;
      }

      if (npc.pauseMs > 0 || npc.patrol.length < 2) {
        this.setVillageNpcIdle(npc);
        this.syncVillageNpcAttachments(npc);
        continue;
      }

      const target = npc.patrol[npc.patrolIndex];
      const dx = target.x - npc.root.x;
      const dy = target.y - npc.root.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 5) {
        npc.root.setPosition(target.x, target.y);
        npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrol.length;
        npc.pauseMs = 620 + npc.patrolIndex * 95;
        this.setVillageNpcIdle(npc);
        this.syncVillageNpcAttachments(npc);
        continue;
      }

      npc.facing = Math.atan2(dy, dx);
      const travel = Math.min(distance, npc.speed * (deltaMs / 1000));
      npc.root.x += (dx / distance) * travel;
      npc.root.y += (dy / distance) * travel;
      npc.root.setDepth(npc.root.y);
      const direction = directionToFrame(npc.facing);
      npc.sprite.setPosition(0, 0).setScale(0.48).setOrigin(0.5, 0.97)
        .setFlipX(direction.flip).play(`player-walk-${npc.mode}-${direction.row}`, true);
      const frameOffset = Number(npc.sprite.frame.name) % 8;
      npc.shadow.setAlpha(frameOffset === 0 || frameOffset === 2 ? 0.38 : 0.31);
      this.syncVillageNpcAttachments(npc);
    }
  }

  private syncBlacksmith(npc: VillageNpcView, deltaMs: number): void {
    npc.actionTimerMs -= deltaMs;
    if (npc.pauseMs > 0) {
      if (npc.hammer) {
        this.tweens.killTweensOf(npc.hammer);
        npc.hammer.setAngle(55);
      }
      this.setVillageNpcIdle(npc);
      return;
    }
    if (npc.actionTimerMs > 0) {
      if (!npc.sprite.anims.isPlaying && npc.actionTimerMs < 620) this.setVillageNpcIdle(npc);
      return;
    }

    npc.actionTimerMs = 1050;
    npc.facing = Math.PI;
    npc.sprite.setPosition(8, 6).setScale(0.48, 0.41).setOrigin(0.5, 0.97).setFlipX(false)
      .play(`player-attack-${npc.mode}-2`, true);
    if (npc.hammer) {
      this.tweens.killTweensOf(npc.hammer);
      npc.hammer.setAngle(55);
      this.tweens.add({
        targets: npc.hammer, angle: -30, duration: 225, yoyo: true, hold: 55,
        ease: 'Quad.easeIn',
      });
    }
    this.time.delayedCall(225, () => {
      if (this.scene.isActive()) this.createForgeSparks(npc.root.x - 34, npc.root.y - 22);
    });
  }

  private setVillageNpcIdle(npc: VillageNpcView): void {
    const direction = directionToFrame(npc.facing);
    const texture = npc.mode === 'fully-equipped'
      ? ASSETS.playerFullyEquipped.key
      : npc.mode === 'commoner' ? ASSETS.villageCommoner.key : ASSETS.playerArmorOnly.key;
    npc.sprite.stop().setTexture(texture, direction.row * 8).setFlipX(direction.flip).setOrigin(0.5, 0.97)
      .setPosition(npc.role === 'blacksmith' ? 8 : 0, npc.role === 'blacksmith' ? 6 : 0)
      .setScale(0.48, npc.role === 'blacksmith' ? 0.41 : 0.48);
    npc.shadow.setAlpha(0.38);
  }

  private syncVillageNpcAttachments(npc: VillageNpcView): void {
    npc.label.setPosition(npc.root.x, npc.root.y - 91).setDepth(npc.root.y + 2);
    npc.hitZone.setPosition(npc.root.x, npc.root.y - 38).setDepth(npc.root.y + 3);
  }

  private interactWithVillageNpc(npc: VillageNpcView): void {
    npc.pauseMs = 2700;
    npc.facing = Math.atan2(this.simulation.player.y - npc.root.y, this.simulation.player.x - npc.root.x);
    if (npc.hammer) {
      this.tweens.killTweensOf(npc.hammer);
      npc.hammer.setAngle(55);
    }
    this.setVillageNpcIdle(npc);
    this.showNpcDialogue(npc.root.x, npc.root.y - 116, npc.name, npc.dialogue);
  }

  private createForgeSparks(x: number, y: number): void {
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI * (0.15 + index * 0.17);
      const spark = this.add.circle(x, y, index === 0 ? 2.4 : 1.5, index % 2 === 0 ? 0xffd36a : 0xf07b35, 0.95)
        .setDepth(y + 35);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * (24 + index * 5),
        y: y + Math.sin(angle) * (18 + index * 4),
        alpha: 0,
        scale: 0.35,
        duration: 260 + index * 35,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private showNpcDialogue(x: number, y: number, name: string, dialogue: string): void {
    const bubble = this.add.text(x, y, `${name}\n${dialogue}`, {
      fontFamily: 'serif', fontSize: '13px', color: '#eadfc7', align: 'center',
      backgroundColor: 'rgba(25,18,13,0.92)', padding: { x: 13, y: 9 },
      stroke: '#2c1a10', strokeThickness: 3, wordWrap: { width: 260 },
    }).setOrigin(0.5, 1).setDepth(2400);
    this.tweens.add({
      targets: bubble, y: y - 8, alpha: 0, delay: 2200, duration: 450,
      ease: 'Sine.easeIn', onComplete: () => bubble.destroy(),
    });
  }

  private createWaterFlow(): void {
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff, 1).beginPath()
      .moveTo(0, 0).lineTo(640, 0).lineTo(600, 76).lineTo(550, 130)
      .lineTo(490, 183).lineTo(420, 230).lineTo(340, 282).lineTo(270, 326)
      .lineTo(0, 380).closePath().fillPath();
    const waterMask = maskShape.createGeometryMask();

    for (let index = 0; index < 16; index += 1) {
      const x = 42 + ((index * 97) % 500);
      const y = 42 + ((index * 61) % 250);
      const ripple = this.add.graphics({ x, y }).setDepth(90 + index).setMask(waterMask);
      ripple.lineStyle(index % 4 === 0 ? 2 : 1, index % 3 === 0 ? 0xc7d2c4 : 0x8fa8a0, 0.2 + (index % 3) * 0.055);
      ripple.strokeEllipse(0, 0, 48 + (index % 5) * 17, 7 + (index % 3) * 3);
      ripple.setRotation(-0.18 + (index % 4) * 0.025);
      this.tweens.add({
        targets: ripple,
        x: x + 32 + (index % 4) * 7,
        y: y + 7,
        alpha: { from: 0.28, to: 0.78 },
        duration: 1750 + index * 105,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const shore = [
      { x: 520, y: 154 }, { x: 478, y: 190 }, { x: 430, y: 222 },
      { x: 376, y: 255 }, { x: 320, y: 290 }, { x: 258, y: 322 },
    ];
    shore.forEach((point, index) => {
      const foam = this.add.ellipse(point.x, point.y, 18 + (index % 3) * 7, 4, 0xd9ddd0, 0.16)
        .setDepth(112 + index).setRotation(-0.42);
      this.tweens.add({
        targets: foam,
        x: point.x + 14,
        y: point.y + 5,
        scaleX: { from: 0.65, to: 1.35 },
        alpha: { from: 0.05, to: 0.32 },
        duration: 1450 + index * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createSwayingCanopies(): void {
    const canopies = [
      { x: 178, y: 172, depth: 178, scale: 1.18, direction: -1 },
      { x: 405, y: 108, depth: 114, scale: 0.92, direction: 1 },
      { x: 1322, y: 172, depth: 178, scale: 1.1, direction: 1 },
      { x: 1360, y: 508, depth: 516, scale: 1.16, direction: -1 },
      { x: 1265, y: 708, depth: 716, scale: 1.22, direction: 1 },
      { x: 184, y: 558, depth: 566, scale: 1.16, direction: -1 },
    ];
    canopies.forEach((config, index) => {
      const branch = this.add.graphics();
      branch.lineStyle(5, 0x2b2118, 0.72).beginPath().moveTo(0, 4)
        .lineTo(config.direction * 28, -12).lineTo(config.direction * 58, -31).strokePath();
      branch.lineStyle(2, 0x514231, 0.5).beginPath().moveTo(config.direction * 22, -10)
        .lineTo(config.direction * 48, -48).moveTo(config.direction * 40, -22)
        .lineTo(config.direction * 76, -15).strokePath();
      branch.fillStyle(0x1c2a20, 0.34);
      for (let leaf = 0; leaf < 8; leaf += 1) {
        const lx = config.direction * (32 + leaf * 7);
        const ly = -38 + (leaf % 3) * 11 + (leaf % 2) * 3;
        branch.fillEllipse(lx, ly, 31 - (leaf % 3) * 4, 7 + (leaf % 2) * 2);
      }
      branch.fillStyle(0x43513a, 0.12).fillEllipse(config.direction * 56, -39, 55, 9);
      const root = this.add.container(config.x, config.y, [branch]).setDepth(config.depth).setScale(config.scale);
      this.tweens.add({
        targets: root,
        angle: { from: -0.55 * config.direction, to: 1.15 * config.direction },
        x: config.x + config.direction * 2.5,
        y: config.y - 1.5,
        duration: 2700 + index * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createWindField(): void {
    for (let index = 0; index < 8; index += 1) {
      const x = 270 + ((index * 173) % 960);
      const y = 300 + ((index * 109) % 470);
      const wind = this.add.graphics({ x, y }).setDepth(1200 + index).setAlpha(0.18);
      wind.lineStyle(1, 0xd5d7c4, 0.28).beginPath().moveTo(-22, 0).lineTo(9, -3).lineTo(25, -1).strokePath();
      this.tweens.add({
        targets: wind,
        x: x + 72 + (index % 3) * 18,
        y: y - 9,
        alpha: { from: 0.03, to: 0.25 },
        duration: 3600 + index * 330,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const leaf = this.add.ellipse(x - 12, y + 8, 7, 3, index % 2 === 0 ? 0x7f6d47 : 0x53613f, 0.55)
        .setDepth(1201 + index).setRotation(index * 0.7);
      this.tweens.add({
        targets: leaf,
        x: x + 54 + (index % 4) * 17,
        y: y + 13,
        angle: 220 + index * 31,
        alpha: { from: 0.18, to: 0.64 },
        duration: 4200 + index * 290,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createMonsterViews(): void {
    for (const monster of this.simulation.monsters) {
      const shadow = this.add.ellipse(0, 4, monster.kind === 'boar' ? 78 : 62, monster.kind === 'boar' ? 24 : 20, 0x090907, 0.4);
      const ring = this.add.ellipse(0, 3, 82, 30, 0x160c08, 0.14).setStrokeStyle(2, 0xc74537, 0);
      const baseScale = MONSTER_SCALE[monster.kind];
      const sprite = this.add.sprite(0, 0, ASSETS.monsters[monster.kind].key, 0)
        .setScale(baseScale)
        .setOrigin(0.5, 0.97);
      const root = this.add.container(monster.x, monster.y, [shadow, ring, sprite]).setDepth(monster.y);
      const hitZone = this.add.zone(monster.x, monster.y - 42, monster.kind === 'boar' ? 112 : 86, monster.kind === 'boar' ? 82 : 112)
        .setDepth(monster.y + 1).setInteractive({ useHandCursor: true });
      hitZone.setData('monsterId', monster.id);
      hitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.menuOpen) return;
        this.simulation.selectMonster(monster.id);
      });
      hitZone.on('pointerover', () => ring.setStrokeStyle(2, 0xe1c180, 0.8));
      hitZone.on('pointerout', () => ring.setStrokeStyle(2, 0xc74537, 0));
      const hp = this.add.graphics().setDepth(monster.y + 2);
      this.monsterViews.set(monster.id, { root, sprite, shadow, ring, hp, hitZone, baseScale, lastDustAt: 0 });
    }
  }

  private syncPlayer(): void {
    const player = this.simulation.player;
    const movedDistance = Math.hypot(
      player.x - this.lastPlayerSimulationPosition.x,
      player.y - this.lastPlayerSimulationPosition.y,
    );
    this.lastPlayerSimulationPosition = { x: player.x, y: player.y };
    this.playerRoot.setPosition(player.x, player.y).setDepth(player.y + 10);
    this.updateRegionPresentation();
    if (this.playerDefeated) return;
    if (this.attackLock > 0) return;

    const { row, flip } = directionToFrame(player.facing);
    const target = this.simulation.getTarget() ?? this.simulation.getBossTarget();
    const movingToTarget = Boolean(target && Math.hypot(target.x - player.x, target.y - player.y) > 105);
    const isMoving = movedDistance > 0.03 || Boolean(player.destination) || movingToTarget || Boolean(player.lootTargetId);
    this.playerSprite.setFlipX(flip);

    if (isMoving) {
      this.playerSprite
        .setPosition(0, 0)
        .setRotation(0)
        .setScale(PLAYER_SCALE)
        .setOrigin(0.5, 0.97)
        .play(`player-walk-unequipped-${row}`, true);
      const frameOffset = Number(this.playerSprite.frame.name) % 8;
      const contactFrame = frameOffset === 0 || frameOffset === 2;
      this.playerShadow.setAlpha(contactFrame ? 0.37 : 0.32).setScale(contactFrame ? 1 : 0.94, contactFrame ? 0.84 : 0.78);
      if (this.time.now - this.playerLastStepAt > 205) {
        this.playerLastStepAt = this.time.now;
        this.createDust(player.x - Math.cos(player.facing) * 9, player.y - Math.sin(player.facing) * 5);
      }
      return;
    }

    this.playerShadow.setAlpha(0.42).setScale(1, 1);
    this.playerSprite.stop().setTexture(ASSETS.playerUnequipped.key, row * 8)
      .setPosition(0, 0).setRotation(0).setScale(PLAYER_SCALE).setOrigin(0.5, 0.97);
  }

  private syncPlayerEquipmentLayers(): void {
    const layers = resolvePlayerLayers(this.simulation.equipment, this.simulation.inventory);
    const { row, flip } = directionToFrame(this.simulation.player.facing);
    const rawFrame = Number(this.playerSprite.frame.name);
    const frame = Number.isFinite(rawFrame) ? rawFrame : row * 8;
    const column = frame % 8;
    const bodyVisible = this.playerSprite.visible && this.playerRoot.visible;

    this.playerArmorSprite
      .setVisible(layers.armor && bodyVisible)
      .setFrame(frame)
      .setPosition(this.playerSprite.x, this.playerSprite.y)
      .setRotation(this.playerSprite.rotation)
      .setScale(this.playerSprite.scaleX, this.playerSprite.scaleY)
      .setOrigin(this.playerSprite.originX, this.playerSprite.originY)
      .setFlipX(this.playerSprite.flipX)
      .setAlpha(this.playerSprite.alpha);

    const weapon = this.simulation.getEquippedDefinition('weapon');
    if (!weapon || !layers.weapon || !bodyVisible) {
      this.playerWeaponSprite.setVisible(false);
      return;
    }
    const attachment = weaponAttachmentForFrame(row, flip, column);
    this.playerWeaponSprite
      .setVisible(true)
      .setTexture(weapon.iconKey)
      .setPosition(this.playerSprite.x + attachment.x, this.playerSprite.y + attachment.y)
      .setRotation(this.playerSprite.rotation + attachment.rotation)
      .setScale(attachment.scale)
      .setFlipX(attachment.flipX)
      .setAlpha(this.playerSprite.alpha);
  }

  private toggleDevEquipment(itemId: ItemId): void {
    const definition = ITEM_CATALOG[itemId];
    const existing = this.simulation.inventory.find((item) => item.itemId === itemId);
    const instanceId = existing?.instanceId ?? `dev-${itemId}`;
    if (!existing) this.simulation.inventory.push({ instanceId, itemId });
    const equipped = this.simulation.equipment[definition.slot];
    if (equipped && equipped !== instanceId) this.simulation.equipItem(equipped);
    this.simulation.equipItem(instanceId);
  }

  private updateRegionPresentation(): void {
    const nextRegion = this.simulation.region;
    if (nextRegion === this.currentRegion) return;
    this.currentRegion = nextRegion;
    const region = REGIONS[nextRegion];
    this.regionLabel
      .setPosition(this.scale.gameSize.width / 2, Math.max(92, this.scale.gameSize.height * 0.18))
      .setText(`${region.name}${nextRegion === 'dungeon' ? ` ${this.simulation.dungeonFloor}층` : ''}  ·  ${region.status}`)
      .setColor(region.safe ? '#b9d59d' : '#e7b38f')
      .setAlpha(0).setScale(0.92);
    this.cameras.main.flash(220, 28, 24, 20, false);
    this.tweens.killTweensOf(this.regionLabel);
    this.tweens.add({
      targets: this.regionLabel,
      alpha: { from: 0, to: 1 },
      scale: 1,
      duration: 260,
      yoyo: true,
      hold: 1550,
      ease: 'Sine.easeInOut',
    });
  }

  private syncMonsters(): void {
    const selectedId = this.simulation.player.targetId;
    for (const monster of this.simulation.monsters) {
      const view = this.monsterViews.get(monster.id)!;
      view.baseScale = MONSTER_SCALE[monster.kind];
      const moving = monster.alive && ['patrol', 'chase', 'circle', 'charge', 'return'].includes(monster.aiState);
      const direction = directionToFrame(monster.facing);
      const textureKey = ASSETS.monsters[monster.kind].key;
      const attackAnimationPlaying = view.sprite.anims.isPlaying
        && view.sprite.anims.currentAnim?.key.startsWith(`monster-attack-${monster.kind}-`);
      view.root.setVisible(monster.alive).setPosition(monster.x, monster.y).setDepth(monster.y);
      view.sprite.setVisible(monster.alive);
      view.shadow.setVisible(monster.alive);
      view.ring.setVisible(monster.alive);
      view.hitZone.setVisible(monster.alive).setPosition(monster.x, monster.y - 42).setDepth(monster.y + 1);
      if (view.hitZone.input) view.hitZone.input.enabled = monster.alive;
      view.ring.setStrokeStyle(2, selectedId === monster.id ? 0xf0cc72 : 0xc74537, selectedId === monster.id ? 1 : 0);
      if (monster.alive && !attackAnimationPlaying) {
        view.sprite.setPosition(0, 0).setRotation(0).setScale(view.baseScale).setAlpha(1).setOrigin(0.5, 0.97).setFlipX(direction.flip);
        if (moving) {
          view.sprite.play(`monster-walk-${monster.kind}-${direction.row}`, true);
          view.shadow.setAlpha(monster.aiState === 'charge' ? 0.3 : 0.4).setScale(monster.aiState === 'charge' ? 1.12 : 1, 1);
        } else {
          view.sprite.stop().setTexture(textureKey, direction.row * 8 + (monster.aiState === 'telegraph' ? 4 : 0));
          view.shadow.setAlpha(0.4).setScale(1, 1);
        }
      }
      if (monster.aiState === 'charge' && this.time.now - view.lastDustAt > 105) {
        view.lastDustAt = this.time.now;
        this.createDust(monster.x - Math.cos(monster.facing) * 28, monster.y - Math.sin(monster.facing) * 15);
      }
      view.hp.clear().setVisible(monster.alive && (monster.hp < monster.maxHp || selectedId === monster.id));
      view.hp.setDepth(monster.y + 3);
      if (view.hp.visible) {
        const width = 58;
        view.hp.fillStyle(0x130f0d, 0.9).fillRoundedRect(monster.x - width / 2, monster.y - 92, width, 6, 2);
        view.hp.fillStyle(0xa53129, 1).fillRoundedRect(monster.x - width / 2 + 1, monster.y - 91, (width - 2) * (monster.hp / monster.maxHp), 4, 1);
      }
    }
  }

  private createBossView(boss: BossState): BossView {
    const definition = BOSS_CATALOG[boss.bossId];
    const shadow = this.add.ellipse(0, 6, 118, 34, 0x080605, 0.56);
    const ring = this.add.ellipse(0, 5, 142, 48, 0x5b1616, 0.18).setStrokeStyle(3, 0xe4ae58, 0.88);
    const sprite = this.add.sprite(0, 0, definition.textureKey, 0).setScale(definition.scale).setOrigin(0.5, 0.97);
    const root = this.add.container(boss.x, boss.y, [shadow, ring, sprite]).setDepth(boss.y + 2);
    const hitZone = this.add.zone(boss.x, boss.y - 60, 150, 168).setDepth(boss.y + 4).setInteractive({ useHandCursor: true });
    hitZone.setData('monsterId', boss.id);
    hitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.menuOpen) this.simulation.selectBoss();
    });
    hitZone.on('pointerover', () => ring.setStrokeStyle(4, 0xffd77c, 1));
    hitZone.on('pointerout', () => ring.setStrokeStyle(3, 0xe4ae58, 0.88));
    const hp = this.add.graphics();
    return { bossId: boss.bossId, root, sprite, shadow, ring, hp, hitZone, baseScale: definition.scale };
  }

  private destroyBossView(): void {
    if (!this.bossView) return;
    this.tweens.killTweensOf(this.bossView.sprite);
    this.bossView.root.destroy(true);
    this.bossView.hitZone.destroy();
    this.bossView.hp.destroy();
    this.bossView = null;
  }

  private syncBoss(): void {
    const boss = this.simulation.boss;
    if (!boss) {
      this.destroyBossView();
      return;
    }
    if (!this.bossView || this.bossView.bossId !== boss.bossId) {
      this.destroyBossView();
      this.bossView = this.createBossView(boss);
    }
    const view = this.bossView;
    const direction = directionToFrame(boss.facing);
    const selected = this.simulation.player.targetId === boss.id;
    const attacking = view.sprite.anims.isPlaying && view.sprite.anims.currentAnim?.key.startsWith(`boss-attack-${boss.bossId}-`);
    view.root.setVisible(boss.alive).setPosition(boss.x, boss.y).setDepth(boss.y + 2);
    view.hitZone.setVisible(boss.alive).setPosition(boss.x, boss.y - 60).setDepth(boss.y + 4);
    if (view.hitZone.input) view.hitZone.input.enabled = boss.alive;
    view.ring.setStrokeStyle(boss.phase === 2 ? 4 : 3, boss.phase === 2 ? 0xd84e49 : selected ? 0xffdf85 : 0xe4ae58, selected ? 1 : 0.76);
    if (boss.alive && !attacking) {
      view.sprite.setPosition(0, 0).setRotation(0).setScale(view.baseScale).setOrigin(0.5, 0.97).setFlipX(direction.flip).setAlpha(1);
      if (boss.state === 'chase') view.sprite.play(`boss-walk-${boss.bossId}-${direction.row}`, true);
      else view.sprite.stop().setTexture(BOSS_CATALOG[boss.bossId].textureKey, direction.row * 8 + (boss.state === 'telegraph' || boss.state === 'windup' ? 4 : 0));
    }
    view.shadow.setAlpha(boss.alive ? 0.52 : 0);
    view.hp.clear().setVisible(boss.alive);
    if (boss.alive) {
      const width = 132;
      view.hp.setDepth(boss.y + 5);
      view.hp.fillStyle(0x120b0a, 0.94).fillRoundedRect(boss.x - width / 2, boss.y - 132, width, 10, 3);
      view.hp.fillStyle(boss.phase === 2 ? 0xc5473f : 0x8f2d29, 1).fillRoundedRect(boss.x - width / 2 + 2, boss.y - 130, (width - 4) * (boss.hp / boss.maxHp), 6, 2);
    }
  }

  private syncGroundItems(): void {
    const activeIds = new Set(this.simulation.groundDrops.map((drop) => drop.id));
    for (const drop of this.simulation.groundDrops) {
      let view = this.groundItemViews.get(drop.id);
      if (!view) {
        view = this.createGroundItemView(drop);
        this.groundItemViews.set(drop.id, view);
      }
      const bob = Math.sin(this.time.now * 0.0045 + view.phase) * 4;
      const selected = this.simulation.player.lootTargetId === drop.id;
      view.glow.setPosition(drop.x, drop.y + 4).setDepth(drop.y - 2).setScale(selected ? 1.18 : 1);
      view.icon.setPosition(drop.x, drop.y - 23 + bob).setDepth(drop.y + 3);
      view.label.setPosition(drop.x, drop.y - 56 + bob).setDepth(drop.y + 4).setVisible(selected || Math.sin(this.time.now * 0.002 + view.phase) > -0.35);
      view.hitZone.setPosition(drop.x, drop.y - 22).setDepth(drop.y + 5);
    }
    for (const [id, view] of this.groundItemViews) {
      if (activeIds.has(id)) continue;
      view.glow.destroy();
      view.icon.destroy();
      view.label.destroy();
      view.hitZone.destroy();
      this.groundItemViews.delete(id);
    }
  }

  private syncCorpses(delta: number): void {
    const elapsed = Math.min(delta, 50);
    for (let index = this.corpseViews.length - 1; index >= 0; index -= 1) {
      const corpse = this.corpseViews[index];
      corpse.remainingMs -= elapsed;
      if (!corpse.fading && corpse.remainingMs <= MONSTER_CORPSE_FADE_MS) {
        corpse.fading = true;
        this.tweens.add({ targets: corpse.root, alpha: 0, duration: MONSTER_CORPSE_FADE_MS, ease: 'Sine.easeIn' });
      }
      if (corpse.remainingMs > 0) continue;
      this.tweens.killTweensOf(corpse.root);
      this.tweens.killTweensOf(corpse.sprite);
      this.tweens.killTweensOf(corpse.shadow);
      corpse.root.destroy(true);
      this.corpseViews.splice(index, 1);
    }
  }

  private createGroundItemView(drop: GroundDrop): GroundItemView {
    const definition = ITEM_CATALOG[drop.itemId];
    const glow = this.add.ellipse(drop.x, drop.y + 3, 55, 20, definition.rarity === '희귀' ? 0xd2a44d : 0xb99559, 0.17)
      .setStrokeStyle(1, definition.rarity === '희귀' ? 0xf1c965 : 0xb99a65, 0.7);
    const icon = this.add.image(drop.x, drop.y - 22, definition.iconKey).setDisplaySize(38, 38);
    const label = this.add.text(drop.x, drop.y - 56, definition.name, {
      fontFamily: 'serif', fontSize: '11px', color: definition.rarity === '희귀' ? '#f1cc72' : '#e5d5b4',
      stroke: '#1b120c', strokeThickness: 4,
    }).setOrigin(0.5);
    const hitZone = this.add.zone(drop.x, drop.y - 20, 78, 82).setInteractive({ useHandCursor: true });
    hitZone.setData('dropId', drop.id);
    hitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.menuOpen) return;
      this.simulation.collectDrop(drop.id);
    });
    hitZone.on('pointerover', () => glow.setStrokeStyle(2, 0xf0cf83, 1));
    hitZone.on('pointerout', () => glow.setStrokeStyle(1, definition.rarity === '희귀' ? 0xf1c965 : 0xb99a65, 0.7));
    return { glow, icon, label, hitZone, phase: Number(drop.id.split('-')[1]) * 1.7 };
  }

  private handleEvent(event: GameEvent): void {
    this.hud.handle(event);
    if (event.type === 'player-attack') {
      const { row, flip } = directionToFrame(this.simulation.player.facing);
      this.playerSprite.setTexture(ASSETS.playerUnequipped.key).setPosition(0, 0).setRotation(0)
        .setScale(PLAYER_SCALE).setOrigin(0.5, 0.97).setFlipX(flip).play(`player-attack-unequipped-${row}`, true);
      this.syncPlayerEquipmentLayers();
      this.attackLock = event.style === 'weapon' ? 0.5 : 0.38;
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId)
        ?? (this.simulation.boss?.id === event.targetId ? this.simulation.boss : null);
      const angle = target
        ? Math.atan2(target.y - this.simulation.player.y, target.x - this.simulation.player.x)
        : this.simulation.player.facing;
      this.playPlayerAttackMotion(angle, event.style);
      if (event.style === 'fist') this.createPunchTrail(this.simulation.player.x, this.simulation.player.y - 38, angle);
      if (event.style === 'weapon') this.combatAudio.slash();
      else this.combatAudio.punch();
    }
    if (event.type === 'player-impact') {
      const target = this.simulation.monsters.find((entry) => entry.id === event.targetId);
      const view = this.monsterViews.get(event.targetId);
      if (target && view) {
        const angle = Math.atan2(target.y - this.simulation.player.y, target.x - this.simulation.player.x);
        if (event.style === 'weapon') {
          this.createSlashFx(this.simulation.player.x, this.simulation.player.y - 38, target.x, target.y - 40, angle, event.critical);
        } else {
          this.createPunchFx(target.x, target.y - 48, angle, event.critical);
        }
        this.createImpactFx(target.x, target.y - 52, event.critical);
        this.floatText(target.x, target.y - 92, event.critical ? `치명 ${event.damage}` : `-${event.damage}`, event.critical ? '#ffd77c' : '#f6e8cf');
        view.sprite.setTintFill(event.critical ? 0xfff1b8 : 0xffb5a4);
        this.time.delayedCall(75, () => view.sprite.clearTint());
        this.cameras.main.shake(event.critical ? 105 : 62, event.critical ? 0.006 : 0.0032);
        this.beginHitStop(event.critical ? 92 : 58);
        this.combatAudio.impact(event.critical);
      }
      const boss = this.simulation.boss?.id === event.targetId ? this.simulation.boss : null;
      if (boss && this.bossView) {
        const angle = Math.atan2(boss.y - this.simulation.player.y, boss.x - this.simulation.player.x);
        if (event.style === 'weapon') this.createSlashFx(this.simulation.player.x, this.simulation.player.y - 38, boss.x, boss.y - 54, angle, event.critical);
        else this.createPunchFx(boss.x, boss.y - 58, angle, event.critical);
        this.createImpactFx(boss.x, boss.y - 62, event.critical);
        this.floatText(boss.x, boss.y - 116, event.critical ? `치명 ${event.damage}` : `-${event.damage}`, event.critical ? '#ffd77c' : '#f6e8cf');
        this.bossView.sprite.setTintFill(event.critical ? 0xfff1b8 : 0xff9d8d);
        this.time.delayedCall(85, () => this.bossView?.sprite.clearTint());
        this.cameras.main.shake(event.critical ? 120 : 75, event.critical ? 0.007 : 0.004);
        this.beginHitStop(event.critical ? 100 : 64);
        this.combatAudio.impact(event.critical);
      }
    }
    if (event.type === 'boss-telegraph') this.drawBossTelegraph(event.patternId, event.origin, event.facing);
    if (event.type === 'boss-impact' && this.simulation.boss && this.bossView) {
      const boss = this.simulation.boss;
      const { row, flip } = directionToFrame(event.facing);
      this.bossView.sprite.setFlipX(flip).setScale(this.bossView.baseScale).play(`boss-attack-${boss.bossId}-${row}`, true);
      this.cameras.main.shake(115, 0.006);
      this.createImpactFx(event.origin.x + Math.cos(event.facing) * 80, event.origin.y + Math.sin(event.facing) * 48 - 30, boss.phase === 2);
    }
    if (event.type === 'boss-phase-changed') {
      this.alertMarker(this.simulation.boss?.x ?? this.simulation.player.x, (this.simulation.boss?.y ?? this.simulation.player.y) - 134, '2단계 · 광폭화');
      this.cameras.main.flash(320, 112, 16, 23, false);
    }
    if (event.type === 'boss-killed') {
      if (this.bossView) {
        this.bossView.hitZone.disableInteractive();
        this.tweens.add({ targets: this.bossView.sprite, angle: 78, y: 12, alpha: 0.25, duration: 620, ease: 'Cubic.easeIn' });
        this.tweens.add({ targets: this.bossView.shadow, alpha: 0.14, scaleX: 1.4, duration: 620 });
      }
      this.alertMarker(this.simulation.boss?.x ?? this.simulation.player.x, (this.simulation.boss?.y ?? this.simulation.player.y) - 128, `${event.floor}층 수문장 격파`);
    }
    if (event.type === 'dungeon-stair-lock-changed') this.renderDungeonFloor();
    if (event.type === 'dungeon-complete') this.alertMarker(this.simulation.player.x, this.simulation.player.y - 128, '무영광산 정복');
    if (event.type === 'monster-attack') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) {
        const { row, flip } = directionToFrame(monster.facing);
        view.sprite.setPosition(0, 0).setRotation(0).setFlipX(flip).setScale(view.baseScale)
          .play(`monster-attack-${monster.kind}-${row}`, true);
        this.playMonsterAttackMotion(view, monster);
      }
    }
    if (event.type === 'monster-alert') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (monster) this.alertMarker(monster.x, monster.y - 100, '!');
    }
    if (event.type === 'monster-charge') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      if (monster) this.chargeTelegraph(monster.x, monster.y, monster.facing);
    }
    if (event.type === 'player-hit') {
      this.playerSprite.setTint(0xff8b76);
      this.playerArmorSprite.setTint(0xff8b76);
      this.playerWeaponSprite.setTint(0xff8b76);
      this.time.delayedCall(90, () => {
        if (!this.playerDefeated) {
          this.playerSprite.clearTint();
          this.playerArmorSprite.clearTint();
          this.playerWeaponSprite.clearTint();
        }
      });
      this.floatText(this.simulation.player.x, this.simulation.player.y - 88, `-${event.damage}`, '#ef7c6d');
      this.cameras.main.shake(90, 0.0045);
      this.combatAudio.impact(false);
    }
    if (event.type === 'monster-killed') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) this.showMonsterCorpse(monster, view);
    }
    if (event.type === 'monster-respawn') {
      const monster = this.simulation.monsters.find((entry) => entry.id === event.monsterId);
      const view = this.monsterViews.get(event.monsterId);
      if (monster && view) this.resetMonsterView(monster, view);
    }
    if (event.type === 'player-defeated') {
      this.showPlayerCorpse();
    }
    if (event.type === 'player-respawn') {
      this.resetPlayerView();
      this.playerRoot.setAlpha(0.25);
      this.tweens.add({ targets: this.playerRoot, alpha: 1, duration: 650, ease: 'Sine.easeInOut' });
    }
    if (event.type === 'player-quickstep') {
      const angle = this.simulation.player.facing + Math.PI;
      for (let index = 0; index < 3; index += 1) {
        this.time.delayedCall(index * 35, () => this.createDust(
          this.simulation.player.x + Math.cos(angle) * index * 12,
          this.simulation.player.y + Math.sin(angle) * index * 7,
        ));
      }
      this.playerRoot.setAlpha(0.62);
      this.tweens.add({ targets: this.playerRoot, alpha: 1, duration: 150, ease: 'Cubic.easeOut' });
    }
    if (event.type === 'quest-complete') {
      this.alertMarker(this.simulation.player.x, this.simulation.player.y - 118, '토벌 완수');
    }
    if (event.type === 'item-equipped') {
      this.attackLock = 0;
      this.playerSprite.stop();
      this.syncPlayer();
      this.syncPlayerEquipmentLayers();
    }
    if (event.type === 'region-changed') {
      if (event.region === 'dungeon') {
        this.cameras.main.setBounds(REGION_ORIGINS.dungeon.x, REGION_ORIGINS.dungeon.y, MAP_WIDTH, MAP_HEIGHT);
      } else {
        this.cameras.main.setBounds(WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH, WORLD_HEIGHT);
      }
      this.cameras.main.startFollow(this.playerRoot, true, 0.085, 0.085);
      for (const corpse of this.corpseViews) corpse.root.destroy(true);
      this.corpseViews = [];
      if (event.region !== 'dungeon') this.destroyBossView();
      for (const monster of this.simulation.monsters) {
        const view = this.monsterViews.get(monster.id);
        if (view) this.resetMonsterView(monster, view);
      }
    }
    if (event.type === 'dungeon-floor-changed') {
      this.renderDungeonFloor();
      this.regionLabel
        .setPosition(this.scale.gameSize.width / 2, Math.max(92, this.scale.gameSize.height * 0.18))
        .setText(`${event.title}  ·  ${event.floor}층 / ${event.maxFloor}층`)
        .setColor('#e7c17c').setAlpha(0).setScale(0.92);
      this.tweens.killTweensOf(this.regionLabel);
      this.tweens.add({ targets: this.regionLabel, alpha: { from: 0, to: 1 }, scale: 1, duration: 260, yoyo: true, hold: 1450 });
      this.cameras.main.flash(220, 34, 22, 18, false);
    }
  }

  private createSlashFx(fromX: number, fromY: number, toX: number, toY: number, angle: number, critical: boolean): void {
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const slash = this.add.graphics({ x: fromX, y: fromY }).setDepth(1900).setRotation(angle).setScale(0.65);
    slash.lineStyle(critical ? 6 : 4, critical ? 0xffd574 : 0xf1e2bd, 0.95);
    slash.beginPath().moveTo(10, -18).lineTo(distance * 0.55, -8).lineTo(distance, 6).strokePath();
    slash.lineStyle(1, 0xffffff, 0.9);
    slash.beginPath().moveTo(18, -12).lineTo(distance * 0.62, -3).lineTo(distance - 5, 8).strokePath();
    this.tweens.add({ targets: slash, scaleX: 1.18, scaleY: 1.18, alpha: 0, duration: 150, ease: 'Cubic.easeOut', onComplete: () => slash.destroy() });
  }

  private drawBossTelegraph(patternId: string, origin: { x: number; y: number }, facing: number): void {
    const definition = bossForFloor(this.simulation.dungeonFloor);
    const pattern = definition?.patterns.find((entry) => entry.id === patternId);
    if (!pattern) return;
    const warning = this.add.graphics().setDepth(1880);
    warning.fillStyle(0xc6453d, 0.22).lineStyle(3, 0xff8b72, 0.92);
    if (pattern.shape.kind === 'circle') {
      warning.fillCircle(origin.x, origin.y, pattern.shape.radius).strokeCircle(origin.x, origin.y, pattern.shape.radius);
    } else if (pattern.shape.kind === 'arena') {
      warning.fillCircle(origin.x, origin.y, pattern.shape.radius).strokeCircle(origin.x, origin.y, pattern.shape.radius);
      warning.lineStyle(3, 0x9de0bf, 0.95).strokeCircle(origin.x, origin.y, pattern.shape.safeRadius);
    } else if (pattern.shape.kind === 'line') {
      const x = origin.x + Math.cos(facing) * pattern.shape.length / 2;
      const y = origin.y + Math.sin(facing) * pattern.shape.length / 2;
      warning.fillRect(-pattern.shape.length / 2, -pattern.shape.width / 2, pattern.shape.length, pattern.shape.width)
        .strokeRect(-pattern.shape.length / 2, -pattern.shape.width / 2, pattern.shape.length, pattern.shape.width)
        .setPosition(x, y).setRotation(facing);
    } else {
      const points = [new Phaser.Geom.Point(origin.x, origin.y)];
      const start = facing - pattern.shape.arc / 2;
      for (let index = 0; index <= 12; index += 1) {
        const angle = start + pattern.shape.arc * (index / 12);
        points.push(new Phaser.Geom.Point(origin.x + Math.cos(angle) * pattern.shape.radius, origin.y + Math.sin(angle) * pattern.shape.radius));
      }
      warning.fillPoints(points, true).strokePoints(points, true);
    }
    this.tweens.add({
      targets: warning, alpha: { from: 0.3, to: 1 }, duration: 115, yoyo: true,
      repeat: Math.max(1, Math.floor(pattern.telegraphSeconds * 1000 / 230)),
      onComplete: () => warning.destroy(),
    });
  }

  private createPunchFx(x: number, y: number, angle: number, critical: boolean): void {
    const shock = this.add.graphics({ x, y }).setDepth(1900).setRotation(angle);
    shock.lineStyle(critical ? 5 : 3, critical ? 0xffd36d : 0xe9dcc1, 0.95);
    shock.strokeCircle(0, 0, critical ? 15 : 10);
    shock.beginPath().moveTo(-20, -8).lineTo(-4, -2).strokePath();
    shock.beginPath().moveTo(-22, 8).lineTo(-4, 2).strokePath();
    this.tweens.add({
      targets: shock, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 145,
      ease: 'Cubic.easeOut', onComplete: () => shock.destroy(),
    });
  }

  private createPunchTrail(x: number, y: number, angle: number): void {
    const trail = this.add.graphics({ x, y }).setDepth(1895).setRotation(angle);
    trail.lineStyle(6, 0xf2ce82, 0.94);
    trail.beginPath().moveTo(8, 0).lineTo(76, 0).strokePath();
    trail.lineStyle(2, 0xffffff, 0.98);
    trail.beginPath().moveTo(18, -3).lineTo(80, -3).strokePath();
    trail.fillStyle(0xffefc6, 0.96).fillCircle(78, 0, 6);
    this.tweens.add({
      targets: trail, scaleX: 1.3, scaleY: 0.78, alpha: 0, duration: 180,
      ease: 'Cubic.easeOut', onComplete: () => trail.destroy(),
    });
  }

  private showMonsterCorpse(monster: MonsterState, view: MonsterView): void {
    const pose = MONSTER_CORPSE_POSE[monster.kind];
    const fallbackSign = Number(monster.id.split('-')[1]) % 2 === 0 ? 1 : -1;
    const fallSign = Math.abs(monster.knockback.x) > 1 ? Math.sign(monster.knockback.x) : fallbackSign;
    const direction = directionToFrame(monster.facing);
    const textureKey = ASSETS.monsters[monster.kind].key;

    this.tweens.killTweensOf(view.sprite);
    this.tweens.killTweensOf(view.shadow);
    view.sprite.stop();
    view.root.setVisible(false);
    view.ring.setVisible(false);
    view.hp.clear().setVisible(false);
    view.hitZone.setVisible(false);
    if (view.hitZone.input) view.hitZone.input.enabled = false;

    if (this.corpseViews.length >= MAX_MONSTER_CORPSES) {
      const oldest = this.corpseViews.shift();
      if (oldest) {
        this.tweens.killTweensOf(oldest.root);
        this.tweens.killTweensOf(oldest.sprite);
        this.tweens.killTweensOf(oldest.shadow);
        oldest.root.destroy(true);
      }
    }

    const stain = this.add.ellipse(0, 7, monster.kind === 'boar' ? 72 : 58, monster.kind === 'boar' ? 22 : 18, 0x361916, 0.14);
    const shadow = this.add.ellipse(0, 4, monster.kind === 'boar' ? 78 : 62, monster.kind === 'boar' ? 24 : 20, 0x090907, 0.34);
    const corpseSprite = this.add.sprite(0, 0, textureKey, pose.frame)
      .setVisible(true).setPosition(0, 0).setRotation(0).setOrigin(0.5, pose.originY)
      .setScale(view.baseScale).setAlpha(1).setTint(0xb5afa3)
      .setFlipX(monster.kind === 'boar' ? direction.flip : fallSign < 0);
    const corpseRoot = this.add.container(monster.x, monster.y, [stain, shadow, corpseSprite]).setDepth(monster.y - 1);
    const corpse: CorpseView = {
      root: corpseRoot,
      sprite: corpseSprite,
      shadow,
      remainingMs: MONSTER_CORPSE_LIFETIME_MS,
      fading: false,
    };
    this.corpseViews.push(corpse);

    this.tweens.add({
      targets: corpseSprite,
      x: fallSign * pose.x,
      y: pose.y,
      angle: fallSign * pose.angle,
      scaleX: view.baseScale * pose.scaleX,
      scaleY: view.baseScale * pose.scaleY,
      alpha: 0.88,
      duration: monster.kind === 'boar' ? 190 : 235,
      ease: 'Cubic.easeIn',
      onComplete: () => corpseSprite.setTint(0x8d887c),
    });
    this.tweens.add({
      targets: shadow,
      alpha: 0.2,
      scaleX: monster.kind === 'boar' ? 1.28 : 1.18,
      scaleY: 0.58,
      duration: 220,
      ease: 'Cubic.easeOut',
    });
    this.createDust(monster.x - fallSign * 8, monster.y + 1);
  }

  private resetMonsterView(monster: MonsterState, view: MonsterView): void {
    const direction = directionToFrame(monster.facing);
    this.tweens.killTweensOf(view.sprite);
    this.tweens.killTweensOf(view.shadow);
    view.root.setVisible(true).setPosition(monster.x, monster.y).setDepth(monster.y);
    view.sprite.stop().clearTint().setVisible(true).setAlpha(1).setAngle(0)
      .setPosition(0, 0).setOrigin(0.5, 0.97).setScale(view.baseScale)
      .setFlipX(direction.flip).setTexture(ASSETS.monsters[monster.kind].key, direction.row * 8);
    view.sprite.anims.timeScale = 1;
    view.shadow.setVisible(true).setAlpha(0.4).setScale(1, 1);
  }

  private showPlayerCorpse(): void {
    const player = this.simulation.player;
    const direction = directionToFrame(player.facing);
    const horizontal = Math.cos(player.facing);
    const fallSign = Math.abs(horizontal) > 0.1 ? Math.sign(horizontal) : 1;

    this.playerDefeated = true;
    this.attackLock = 0;
    this.tweens.killTweensOf(this.playerSprite);
    this.tweens.killTweensOf(this.playerShadow);
    this.playerSprite.stop().setTexture(ASSETS.playerUnequipped.key, direction.row * 8 + 3)
      .setPosition(0, 0).setRotation(0).setScale(PLAYER_SCALE).setOrigin(0.5, 0.66)
      .setFlipX(direction.flip).setAlpha(1).setTint(0xb7aea0);
    this.syncPlayerEquipmentLayers();
    this.playerShadow.setVisible(true).setAlpha(0.36).setScale(1, 1);
    this.tweens.add({
      targets: this.playerSprite,
      x: fallSign,
      y: -4,
      angle: fallSign * 76,
      scaleY: PLAYER_SCALE * 0.9,
      alpha: 0.88,
      duration: 245,
      ease: 'Cubic.easeIn',
      onComplete: () => this.playerSprite.setTint(0x948d82),
    });
    this.tweens.add({ targets: this.playerShadow, alpha: 0.2, scaleX: 1.2, scaleY: 0.58, duration: 230 });
    this.createDust(player.x - fallSign * 8, player.y + 1);
  }

  private resetPlayerView(): void {
    const player = this.simulation.player;
    const direction = directionToFrame(player.facing);
    this.tweens.killTweensOf(this.playerSprite);
    this.tweens.killTweensOf(this.playerShadow);
    this.anims.resumeAll();
    this.playerDefeated = false;
    this.lastPlayerSimulationPosition = { x: player.x, y: player.y };
    this.playerRoot.setPosition(player.x, player.y).setDepth(player.y + 10).setAlpha(1);
    this.playerSprite.stop().clearTint().setAlpha(1).setAngle(0).setPosition(0, 0)
      .setOrigin(0.5, 0.97).setScale(PLAYER_SCALE).setFlipX(direction.flip)
      .setTexture(ASSETS.playerUnequipped.key, direction.row * 8);
    this.playerArmorSprite.clearTint();
    this.playerWeaponSprite.clearTint();
    this.syncPlayerEquipmentLayers();
    this.playerSprite.anims.timeScale = 1;
    this.playerShadow.setVisible(true).setAlpha(0.42).setScale(1, 1);
  }

  private playPlayerAttackMotion(angle: number, style: 'fist' | 'weapon'): void {
    const lunge = style === 'weapon' ? 12 : 9;
    this.tweens.killTweensOf(this.playerSprite);
    this.playerSprite.setPosition(0, 0);
    this.tweens.add({
      targets: this.playerSprite,
      x: Math.cos(angle) * lunge,
      y: Math.sin(angle) * lunge,
      duration: style === 'weapon' ? 78 : 64,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private playMonsterAttackMotion(view: MonsterView, monster: { kind: MonsterKind; facing: number }): void {
    const lunge = monster.kind === 'boar' ? 19 : monster.kind === 'bandit' ? 13 : 11;
    this.tweens.killTweensOf(view.sprite);
    this.tweens.add({
      targets: view.sprite,
      x: Math.cos(monster.facing) * lunge,
      y: Math.sin(monster.facing) * lunge,
      duration: 205,
      yoyo: true,
      ease: 'Cubic.easeIn',
    });
  }

  private createImpactFx(x: number, y: number, critical: boolean): void {
    const impact = this.add.graphics({ x, y }).setDepth(1950);
    impact.fillStyle(critical ? 0xffcf62 : 0xf5ead0, 0.9).fillCircle(0, 0, critical ? 10 : 7);
    impact.lineStyle(critical ? 3 : 2, critical ? 0xffc44e : 0xfff1d0, 0.95);
    const rays = critical ? 10 : 7;
    for (let index = 0; index < rays; index += 1) {
      const angle = (Math.PI * 2 * index) / rays;
      const inner = critical ? 9 : 7;
      const outer = critical ? 31 : 22;
      impact.beginPath()
        .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .strokePath();
    }
    this.tweens.add({ targets: impact, scaleX: 1.45, scaleY: 1.45, alpha: 0, duration: 175, ease: 'Cubic.easeOut', onComplete: () => impact.destroy() });
  }

  private createDust(x: number, y: number): void {
    const dust = this.add.ellipse(x, y, 18, 7, 0x8c7659, 0.38).setDepth(y - 2);
    this.tweens.add({ targets: dust, scaleX: 1.8, scaleY: 1.4, alpha: 0, y: y - 4, duration: 260, onComplete: () => dust.destroy() });
  }

  private alertMarker(x: number, y: number, label: string): void {
    const text = this.add.text(x, y, label, { fontFamily: 'serif', fontSize: '25px', fontStyle: 'bold', color: '#e6bd69', stroke: '#32170f', strokeThickness: 5 }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: text, y: y - 16, alpha: 0, duration: 520, ease: 'Back.easeOut', onComplete: () => text.destroy() });
  }

  private chargeTelegraph(x: number, y: number, angle: number): void {
    const warning = this.add.graphics({ x, y }).setDepth(y - 1).setRotation(angle);
    warning.lineStyle(3, 0xd4543e, 0.9).strokeEllipse(0, 0, 92, 34);
    warning.lineStyle(2, 0xd4543e, 0.65).beginPath().moveTo(24, 0).lineTo(145, 0).strokePath();
    this.tweens.add({ targets: warning, alpha: 0.12, yoyo: true, repeat: 2, duration: 85, onComplete: () => warning.destroy() });
  }

  private beginHitStop(durationMs: number): void {
    this.hitStopMs = Math.max(this.hitStopMs, durationMs);
    this.playerSprite.anims.timeScale = 0.06;
    for (const view of this.monsterViews.values()) view.sprite.anims.timeScale = 0.06;
    this.tweens.timeScale = 0.12;
  }

  private endHitStop(): void {
    this.playerSprite.anims.timeScale = 1;
    for (const view of this.monsterViews.values()) view.sprite.anims.timeScale = 1;
    this.tweens.timeScale = 1;
  }

  private floatText(x: number, y: number, value: string, color: string): void {
    const text = this.add.text(x, y, value, { fontFamily: 'serif', fontSize: '17px', fontStyle: 'bold', color, stroke: '#2a120e', strokeThickness: 4 }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: text, y: y - 28, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
  }

  private fitCamera(): void {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const zoom = Math.max(width / MAP_WIDTH, height / MAP_HEIGHT);
    const camera = this.cameras.main;
    camera.setBounds(WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setZoom(zoom);
    camera.setDeadzone(Math.round((width / zoom) * 0.34), Math.round((height / zoom) * 0.28));
    camera.startFollow(this.playerRoot, true, 0.085, 0.085);
    camera.centerOn(this.simulation.player.x, this.simulation.player.y);
  }
}
