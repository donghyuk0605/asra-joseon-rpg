import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SinglePlayerSnapshot } from '../simulation/GameSimulation';
import {
  DEVICE_ID_ALIASES_KEY,
  DEVICE_ID_KEY,
  SinglePlayerSave,
} from './SinglePlayerSave';

type StoredDocument = {
  snapshot: SinglePlayerSnapshot & {
    __saveMeta?: { revision: number; writerId: string; pending: boolean };
  };
  updatedAt?: unknown;
};

const firestore = vi.hoisted(() => ({
  documents: new Map<string, StoredDocument>(),
  failRead: false,
  failWrite: false,
  readCalls: 0,
  transactionCalls: 0,
}));
const firebase = vi.hoisted(() => ({ ensureAnonymousAuth: vi.fn() }));

vi.mock('../../firebase', () => ({
  db: { name: 'test-db' },
  ensureAnonymousAuth: firebase.ensureAnonymousAuth,
}));
vi.mock('firebase/firestore', () => ({
  doc: (_database: unknown, collection: string, id: string) => ({
    path: `${collection}/${id}`,
  }),
  getDoc: async (reference: { path: string }) => {
    firestore.readCalls += 1;
    if (firestore.failRead) throw new Error('cloud offline');
    return {
      data: () => firestore.documents.get(reference.path),
    };
  },
  runTransaction: async (
    _database: unknown,
    update: (transaction: {
      get: (reference: { path: string }) => Promise<{ data: () => StoredDocument | undefined }>;
      set: (
        reference: { path: string },
        value: StoredDocument,
        options: { merge: boolean },
      ) => void;
    }) => Promise<number>,
  ) => {
    firestore.transactionCalls += 1;
    if (firestore.failWrite) throw new Error('cloud write failed');
    const staged = new Map<string, StoredDocument>();
    const result = await update({
      get: async (reference) => ({
        data: () => firestore.documents.get(reference.path),
      }),
      set: (reference, value) => {
        staged.set(reference.path, value);
      },
    });
    for (const [path, value] of staged) firestore.documents.set(path, value);
    return result;
  },
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number { return this.entries.size; }

  clear(): void { this.entries.clear(); }

  getItem(key: string): string | null { return this.entries.get(key) ?? null; }

  key(index: number): string | null { return [...this.entries.keys()][index] ?? null; }

  removeItem(key: string): void { this.entries.delete(key); }

  setItem(key: string, value: string): void { this.entries.set(key, String(value)); }
}

const DEVICE_A = '00000000-0000-4000-8000-000000000001';
const DEVICE_B = '00000000-0000-4000-8000-000000000002';

const snapshot = (
  savedAt = 100,
  itemName: 'worn-hwando' | 'hunter-durumagi' = 'worn-hwando',
): SinglePlayerSnapshot => ({
  version: 1,
  savedAt,
  origin: 'kim-donghyeok',
  region: 'ulleungdo',
  player: {
    x: 700,
    y: 640,
    hp: 100,
    maxHp: 100,
    level: 2,
    xp: 20,
    xpToNext: 80,
    gold: 40,
    potions: 2,
    kills: 1,
    facing: 0,
  },
  inventory: [{ instanceId: 'item-7', itemId: itemName, enhancement: 2 }],
  equipment: {
    weapon: itemName === 'worn-hwando' ? 'item-7' : null,
    armor: itemName === 'hunter-durumagi' ? 'item-7' : null,
    charm: null,
  },
  groundDrops: [],
  skillRanks: {} as SinglePlayerSnapshot['skillRanks'],
  skillPoints: 1,
  followers: [],
  highestBossCheckpoint: 1,
  progress: {
    prisonGateOpen: false,
    prisonGuardsProvoked: false,
    governmentGuardsProvoked: false,
    wakoInvasionStarted: false,
    ulleungVillageLiberated: false,
    questCompleted: false,
    discoveredLandmarks: [],
  },
});

const storedLocal = (): StoredDocument['snapshot'] =>
  JSON.parse(localStorage.getItem('asra-single-save-v1') || 'null') as StoredDocument['snapshot'];

describe('single-player local and Firestore save', () => {
  beforeEach(() => {
    firestore.documents.clear();
    firestore.failRead = false;
    firestore.failWrite = false;
    firestore.readCalls = 0;
    firestore.transactionCalls = 0;
    firebase.ensureAnonymousAuth.mockReset();
    firebase.ensureAnonymousAuth.mockResolvedValue({ uid: 'anonymous-save-user' });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    localStorage.setItem(DEVICE_ID_KEY, DEVICE_A);
  });

  it('immediately mirrors inventory, equipment and enhancement into local storage', () => {
    const service = new SinglePlayerSave();
    expect(service.saveLocal(snapshot())).toEqual({ status: 'saved', revision: 0 });

    expect(storedLocal()).toMatchObject({
      inventory: [{ instanceId: 'item-7', itemId: 'worn-hwando', enhancement: 2 }],
      equipment: { weapon: 'item-7', armor: null, charm: null },
      __saveMeta: { revision: 0, pending: true },
    });
  });

  it('rotates the last distinct valid snapshot into a per-character local backup', () => {
    const service = new SinglePlayerSave();
    expect(service.saveLocal(snapshot(100, 'worn-hwando')).status).toBe('saved');
    expect(service.saveLocal(snapshot(200, 'hunter-durumagi')).status).toBe('saved');

    expect(storedLocal()).toMatchObject({
      savedAt: 200,
      inventory: [{ itemId: 'hunter-durumagi' }],
    });
    expect(JSON.parse(localStorage.getItem('asra-single-save-v1-backup') || 'null'))
      .toMatchObject({
        savedAt: 100,
        inventory: [{ itemId: 'worn-hwando' }],
      });
  });

  it('loads and saves locally when anonymous cloud authentication is unavailable', async () => {
    const localOnly = new SinglePlayerSave();
    expect(localOnly.saveLocal(snapshot(150, 'hunter-durumagi')).status).toBe('saved');
    firebase.ensureAnonymousAuth.mockRejectedValue(new Error('anonymous auth unavailable'));

    const loaded = await new SinglePlayerSave().loadDetailed();
    expect(loaded).toMatchObject({ status: 'loaded', source: 'local' });
    expect(loaded.issues.map((entry) => entry.code)).toContain('cloud-auth-failed');
    expect(firestore.readCalls).toBe(0);

    const saved = await new SinglePlayerSave().saveDetailed(snapshot(200, 'worn-hwando'));
    expect(saved.status).toBe('local');
    expect(saved.issues.map((entry) => entry.code)).toContain('cloud-auth-failed');
    expect(firestore.transactionCalls).toBe(0);
    expect(storedLocal()).toMatchObject({
      savedAt: 200,
      inventory: [{ itemId: 'worn-hwando' }],
    });
  });

  it('recovers and repairs a corrupt primary save from the last valid local backup', async () => {
    const service = new SinglePlayerSave();
    service.saveLocal(snapshot(100, 'worn-hwando'));
    service.saveLocal(snapshot(200, 'hunter-durumagi'));
    localStorage.setItem('asra-single-save-v1', '{truncated-save');

    const result = await new SinglePlayerSave().loadDetailed();

    expect(result).toMatchObject({ status: 'loaded', source: 'local' });
    if (result.status === 'loaded') {
      expect(result.snapshot).toMatchObject({
        savedAt: 100,
        inventory: [{ itemId: 'worn-hwando' }],
      });
      expect(result.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
        'local-read-failed',
        'local-backup-recovered',
      ]));
    }
    expect(storedLocal()).toMatchObject({
      savedAt: 100,
      inventory: [{ itemId: 'worn-hwando' }],
    });
  });

  it('rejects a different protagonist snapshot placed in this character slot', async () => {
    localStorage.setItem('asra-single-save-v1', JSON.stringify({
      ...snapshot(300),
      origin: 'osaka-mudang',
      region: 'osaka',
    }));

    const result = await new SinglePlayerSave('kim-donghyeok').loadDetailed();

    expect(result.status).toBe('error');
    expect(result.issues.map((entry) => entry.code)).toContain('local-invalid');
  });

  it('isolates Crown Prince Gwanghae saves from every other protagonist locally and in Firestore', async () => {
    const kimSnapshot = snapshot(100);
    const gwanghaeSnapshot: SinglePlayerSnapshot = {
      ...snapshot(200),
      origin: 'gwanghae-prince',
      region: 'changdeokgung',
    };

    expect((await new SinglePlayerSave().saveDetailed(kimSnapshot)).status).toBe('cloud');
    expect((await new SinglePlayerSave('gwanghae-prince').saveDetailed(gwanghaeSnapshot)).status).toBe('cloud');

    expect(JSON.parse(localStorage.getItem('asra-single-save-v1') ?? '{}')).toMatchObject({
      origin: 'kim-donghyeok',
    });
    expect(JSON.parse(localStorage.getItem('asra-gwanghae-prince-save-v1') ?? '{}')).toMatchObject({
      origin: 'gwanghae-prince',
      region: 'changdeokgung',
    });
    expect(firestore.documents.has(`single_saves/${DEVICE_A}`)).toBe(true);
    expect(firestore.documents.has(`single_saves/${DEVICE_A}-gwanghae-prince`)).toBe(true);
  });

  it('uses a Firestore revision transaction so a stale tab cannot overwrite a newer tab', async () => {
    const firstTab = new SinglePlayerSave();
    const staleTab = new SinglePlayerSave();
    await firstTab.loadDetailed();
    await staleTab.loadDetailed();

    const firstResult = await firstTab.saveDetailed(snapshot(200, 'worn-hwando'));
    const staleResult = await staleTab.saveDetailed(snapshot(300, 'hunter-durumagi'));

    expect(firstResult).toMatchObject({ status: 'cloud', revision: 1 });
    expect(staleResult).toMatchObject({ status: 'conflict', revision: 1 });
    expect(staleResult.issues.map((entry) => entry.code)).toContain('cloud-conflict');
    expect(firestore.documents.get(`single_saves/${DEVICE_A}`)?.snapshot.inventory[0].itemId)
      .toBe('worn-hwando');
  });

  it('prefers a higher cloud revision over a future-dated stale local snapshot', async () => {
    const writer = new SinglePlayerSave();
    await writer.saveDetailed(snapshot(100, 'worn-hwando'));
    localStorage.setItem('asra-single-save-v1', JSON.stringify({
      ...snapshot(9_999_999, 'hunter-durumagi'),
      __saveMeta: { revision: 0, writerId: 'stale-writer', pending: true },
    }));

    const reader = new SinglePlayerSave();
    const result = await reader.loadDetailed();

    expect(result).toMatchObject({ status: 'loaded', source: 'cloud', revision: 1 });
    if (result.status === 'loaded') {
      expect(result.snapshot.inventory[0].itemId).toBe('worn-hwando');
    }
  });

  it('loads a legacy firebaseapp device document through a canonical-host alias', async () => {
    localStorage.setItem(DEVICE_ID_ALIASES_KEY, JSON.stringify([DEVICE_B]));
    firestore.documents.set(`single_saves/${DEVICE_B}`, {
      snapshot: {
        ...snapshot(500, 'hunter-durumagi'),
        __saveMeta: { revision: 4, writerId: 'legacy-host', pending: false },
      },
    });

    const result = await new SinglePlayerSave().loadDetailed();

    expect(result).toMatchObject({ status: 'loaded', source: 'cloud', revision: 4 });
    if (result.status === 'loaded') {
      expect(result.snapshot.inventory[0].itemId).toBe('hunter-durumagi');
    }
  });

  it('safely migrates a legacy snapshot with missing collections and progress fields', async () => {
    const legacy = snapshot(0);
    const legacyRecord = {
      region: legacy.region,
      skillRanks: {},
    };
    localStorage.setItem('asra-single-save-v1', JSON.stringify(legacyRecord));

    const result = await new SinglePlayerSave().loadDetailed();

    expect(result).toMatchObject({ status: 'loaded', source: 'local', migrated: true });
    if (result.status === 'loaded') {
      expect(result.snapshot).toMatchObject({
        version: 1,
        savedAt: 0,
        inventory: [],
        equipment: { weapon: null, armor: null, charm: null },
        player: { hp: 180, maxHp: 180, level: 1 },
        progress: {
          prisonGateOpen: false,
          discoveredLandmarks: [],
        },
      });
    }
  });

  it('preserves newly added progress fields instead of stripping them during migration', async () => {
    const current = snapshot(600);
    current.progress.treeTrainingCount = 2;
    current.progress.droppedStarterWeapon = true;
    current.progress.wakoInvasionDelaySeconds = 3.4;
    current.progress.droppedMartialManuals = ['crescent-manual'];

    expect(new SinglePlayerSave().saveLocal(current).status).toBe('saved');
    const result = await new SinglePlayerSave().loadDetailed();

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.snapshot.progress).toMatchObject({
        treeTrainingCount: 2,
        droppedStarterWeapon: true,
        wakoInvasionDelaySeconds: 3.4,
        droppedMartialManuals: ['crescent-manual'],
      });
    }
  });

  it('preserves zero HP so the simulation can perform its safe-home defeat recovery', async () => {
    const defeated = snapshot(650);
    defeated.player.hp = 0;

    expect(new SinglePlayerSave().saveLocal(defeated).status).toBe('saved');
    const result = await new SinglePlayerSave().loadDetailed();

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') expect(result.snapshot.player.hp).toBe(0);
  });

  it('returns separately classified local validation and cloud read errors', async () => {
    localStorage.setItem('asra-single-save-v1', JSON.stringify({
      version: 1,
      savedAt: 100,
      region: 'missing-region',
      player: null,
    }));
    firestore.failRead = true;

    const result = await new SinglePlayerSave().loadDetailed();

    expect(result.status).toBe('error');
    expect(result.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'local-invalid',
      'cloud-read-failed',
    ]));
  });

  it('keeps a valid local save and reports cloud write failure without throwing', async () => {
    firestore.failWrite = true;
    const result = await new SinglePlayerSave().saveDetailed(snapshot());

    expect(result.status).toBe('local');
    expect(result.issues.map((entry) => entry.code)).toContain('cloud-write-failed');
    expect(storedLocal().inventory[0].itemId).toBe('worn-hwando');
  });

  it('offers pagehide and hidden-page synchronous local flush hooks', () => {
    const windowTarget = new EventTarget();
    const documentTarget = new EventTarget() as EventTarget & { visibilityState: string };
    documentTarget.visibilityState = 'visible';
    Object.defineProperty(globalThis, 'window', { configurable: true, value: windowTarget });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: documentTarget });

    let current = snapshot(100, 'worn-hwando');
    const service = new SinglePlayerSave();
    const unbind = service.bindLifecycleFlush(() => current);
    windowTarget.dispatchEvent(new Event('pagehide'));
    expect(storedLocal().inventory[0].itemId).toBe('worn-hwando');

    current = snapshot(200, 'hunter-durumagi');
    documentTarget.visibilityState = 'hidden';
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(storedLocal().inventory[0].itemId).toBe('hunter-durumagi');
    unbind();

    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
  });

  it('keeps the game serializer wired and redirects the legacy Firebase host with a device handoff', () => {
    const simulation = readFileSync('src/game/simulation/GameSimulation.ts', 'utf8');
    const main = readFileSync('src/main.ts', 'utf8');

    expect(simulation).toContain('inventory: this.inventory.map((item) => ({ ...item }))');
    expect(simulation).toContain('equipment: { ...this.equipment }');
    expect(main).toContain("const LEGACY_FIREBASE_HOST = 'haze-479ed.firebaseapp.com'");
    expect(main).toContain("const CANONICAL_FIREBASE_HOST = 'haze-479ed.web.app'");
    expect(main).toContain('SAVE_DEVICE_HANDOFF_HASH');
    expect(main).toContain('SAVE_DEVICE_ALIASES_KEY');
  });

  it('keeps autosave running with menus open and checkpoints persistent gameplay events', () => {
    const scene = readFileSync('src/game/phaser/HuntingScene.ts', 'utf8');
    const updateStart = scene.indexOf('update(_: number, delta: number): void');
    const updateEnd = scene.indexOf('private playOpeningPrologue', updateStart);
    const updateMethod = scene.slice(updateStart, updateEnd);
    const flushStart = scene.indexOf('private flushEventsAndHud(delta: number): void');
    const flushEnd = scene.indexOf('private resolveQuestProgress', flushStart);
    const flushMethod = scene.slice(flushStart, flushEnd);

    expect(updateMethod.indexOf('this.autosaveAccumulator += delta'))
      .toBeLessThan(updateMethod.indexOf('if (this.menuOpen)'));
    expect(flushMethod).toContain('SAVE_CHECKPOINT_EVENT_TYPES.has(event.type)');
    expect(scene).toContain('saveService.bindLifecycleFlush(');
    expect(scene).toContain('this.singlePlayerSave?.flushLocal(this.simulation.exportSinglePlayerSnapshot())');
  });
});
