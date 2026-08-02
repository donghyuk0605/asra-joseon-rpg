import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../../firebase';
import { ITEM_CATALOG } from '../items/catalog';
import type { SinglePlayerSnapshot } from '../simulation/GameSimulation';
import { REGION_ORIGINS } from '../world/layout';
import type {
  EquipmentState,
  FollowerState,
  GroundDrop,
  InventoryItem,
  ItemId,
  PlayerOrigin,
  SkillId,
} from '../simulation/types';

export const DEVICE_ID_KEY = 'asra-device-id-v1';
export const DEVICE_ID_ALIASES_KEY = 'asra-device-id-aliases-v1';

const SAVE_META_KEY = '__saveMeta';
const LOCAL_BACKUP_SUFFIX = '-backup';
const MIN_DEVICE_ID_LENGTH = 20;
// The longest campaign suffix is "-gwanghae-prince" and Firestore rules cap
// the complete document id at 80 characters.
const MAX_DEVICE_ID_LENGTH = 60;
const CLOUD_OPERATION_TIMEOUT_MS = 5_000;

type SaveMeta = {
  revision: number;
  writerId: string;
  pending: boolean;
};

type PersistedSnapshot = SinglePlayerSnapshot & {
  [SAVE_META_KEY]?: SaveMeta;
};

export type SaveIssueCode =
  | 'local-unavailable'
  | 'local-read-failed'
  | 'local-write-failed'
  | 'local-invalid'
  | 'local-backup-recovered'
  | 'cloud-auth-failed'
  | 'cloud-read-failed'
  | 'cloud-write-failed'
  | 'cloud-write-pending'
  | 'cloud-conflict'
  | 'snapshot-invalid';

export type SaveIssue = {
  code: SaveIssueCode;
  scope: 'local' | 'cloud' | 'snapshot';
  message: string;
};

export type SinglePlayerLoadResult =
  | {
    status: 'loaded';
    snapshot: SinglePlayerSnapshot;
    source: 'cloud' | 'local';
    revision: number;
    migrated: boolean;
    issues: SaveIssue[];
  }
  | {
    status: 'empty' | 'error';
    issues: SaveIssue[];
  };

export type LocalSaveResult =
  | { status: 'saved'; revision: number }
  | { status: 'conflict' | 'error'; revision: number; issue: SaveIssue };

export type SinglePlayerSaveResult = {
  status: 'cloud' | 'local' | 'conflict' | 'error';
  revision: number;
  issues: SaveIssue[];
};

type SnapshotCandidate = {
  snapshot: SinglePlayerSnapshot;
  revision: number;
  writerId: string;
  pending: boolean;
  source: 'cloud' | 'local';
  migrated: boolean;
  recoveredFromBackup: boolean;
};

type MigrationResult = {
  snapshot: SinglePlayerSnapshot;
  migrated: boolean;
};

class CloudRevisionConflict extends Error {
  constructor() {
    super('A newer cloud revision already exists.');
    this.name = 'CloudRevisionConflict';
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const finiteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const normalizedOrigin = (value: unknown, fallback: PlayerOrigin): PlayerOrigin =>
  value === 'frontier-archer'
    || value === 'osaka-mudang'
    || value === 'gwanghae-prince'
    || value === 'kim-donghyeok'
    ? value
    : fallback;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(nonEmptyString) : [];

const normalizeInventory = (value: unknown): InventoryItem[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((entry): InventoryItem[] => {
    const item = asRecord(entry);
    if (
      !item
      || !nonEmptyString(item.instanceId)
      || !nonEmptyString(item.itemId)
      || !(item.itemId in ITEM_CATALOG)
    ) return [];
    let instanceId = item.instanceId;
    let duplicateIndex = 2;
    while (ids.has(instanceId)) {
      instanceId = `${item.instanceId}-migrated-${duplicateIndex}`;
      duplicateIndex += 1;
    }
    ids.add(instanceId);
    const enhancement = finiteNumber(item.enhancement)
      ? Math.max(0, Math.min(5, Math.floor(item.enhancement)))
      : undefined;
    return [{
      instanceId,
      itemId: item.itemId as ItemId,
      ...(enhancement === undefined ? {} : { enhancement }),
    }];
  });
};

const normalizeGroundDrops = (value: unknown): GroundDrop[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const ids = new Set<string>();
  return value.flatMap((entry): GroundDrop[] => {
    const drop = asRecord(entry);
    if (
      !drop
      || !nonEmptyString(drop.id)
      || ids.has(drop.id)
      || !nonEmptyString(drop.itemId)
      || !(drop.itemId in ITEM_CATALOG)
      || !finiteNumber(drop.x)
      || !finiteNumber(drop.y)
    ) return [];
    ids.add(drop.id);
    return [{ id: drop.id, itemId: drop.itemId as ItemId, x: drop.x, y: drop.y }];
  });
};

const normalizeEquipment = (value: unknown): EquipmentState => {
  const equipment = asRecord(value);
  const slot = (name: keyof EquipmentState): string | null =>
    nonEmptyString(equipment?.[name]) ? equipment[name] as string : null;
  return { weapon: slot('weapon'), armor: slot('armor'), charm: slot('charm') };
};

const normalizeSkillRanks = (value: unknown): Record<SkillId, number> => {
  const ranks = asRecord(value);
  const result: Partial<Record<SkillId, number>> = {};
  if (ranks) {
    for (const [skillId, rank] of Object.entries(ranks)) {
      if (finiteNumber(rank)) result[skillId as SkillId] = Math.max(0, Math.floor(rank));
    }
  }
  return result as Record<SkillId, number>;
};

const normalizeFollowers = (value: unknown): FollowerState[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry): FollowerState[] => {
    const follower = asRecord(entry);
    if (
      !follower
      || !nonEmptyString(follower.id)
      || !nonEmptyString(follower.kind)
      || !nonEmptyString(follower.name)
      || !nonEmptyString(follower.route)
      || !nonEmptyString(follower.visualKind)
    ) return [];
    const x = finiteNumber(follower.x) ? follower.x : 0;
    const y = finiteNumber(follower.y) ? follower.y : 0;
    const facing = finiteNumber(follower.facing) ? follower.facing : 0;
    return [{
      ...follower,
      x,
      y,
      facing,
      velocity: { x: 0, y: 0 },
      attackCooldown: 0,
      actionTimer: 0,
      targetId: null,
    } as FollowerState];
  });
};

const migrateSnapshot = (
  value: unknown,
  fallbackOrigin: PlayerOrigin,
): MigrationResult | null => {
  const raw = asRecord(value);
  if (!raw || (raw.version !== undefined && raw.version !== 0 && raw.version !== 1)) return null;
  if (!nonEmptyString(raw.region) || !(raw.region in REGION_ORIGINS)) return null;
  const origin = normalizedOrigin(raw.origin, fallbackOrigin);
  // A save slot is owned by one protagonist. Reject a valid but mismatched
  // origin instead of silently loading another campaign into the selected
  // character slot. Saves created before `origin` existed still migrate via
  // the slot's fallback origin.
  if (raw.origin !== undefined && raw.origin !== fallbackOrigin) return null;
  const player = asRecord(raw.player) ?? {};
  const regionOrigin = REGION_ORIGINS[raw.region as keyof typeof REGION_ORIGINS];
  const playerNumber = (field: string, fallback: number): number =>
    finiteNumber(player[field]) ? player[field] : fallback;

  const progress = asRecord(raw.progress) ?? {};
  const inventory = normalizeInventory(raw.inventory);
  const equipment = normalizeEquipment(raw.equipment);
  const followers = normalizeFollowers(raw.followers);
  const groundDrops = normalizeGroundDrops(raw.groundDrops);
  const huntKills = asRecord(progress.huntKills);
  const savedAt = finiteNumber(raw.savedAt) && raw.savedAt >= 0 ? raw.savedAt : 0;
  const migrated = raw.version !== 1
    || !finiteNumber(raw.savedAt)
    || !asRecord(raw.player)
    || !Array.isArray(raw.inventory)
    || !asRecord(raw.equipment)
    || !asRecord(raw.progress);

  const migratedProgress: SinglePlayerSnapshot['progress'] = {
    ...(raw.version === 1 ? progress : {}),
    prisonGateOpen: Boolean(progress.prisonGateOpen),
    prisonGuardsProvoked: Boolean(progress.prisonGuardsProvoked),
    governmentGuardsProvoked: Boolean(progress.governmentGuardsProvoked),
    wakoPactRevealed: Boolean(progress.wakoPactRevealed),
    wakoInvasionStarted: Boolean(progress.wakoInvasionStarted),
    ulleungVillageLiberated: Boolean(progress.ulleungVillageLiberated),
    questCompleted: Boolean(progress.questCompleted),
    discoveredLandmarks: stringArray(progress.discoveredLandmarks) as
      SinglePlayerSnapshot['progress']['discoveredLandmarks'],
    ...(huntKills ? {
      huntKills: { ...huntKills } as NonNullable<SinglePlayerSnapshot['progress']['huntKills']>,
    } : {}),
    ...(Array.isArray(progress.craftedRecipes) ? {
      craftedRecipes: stringArray(progress.craftedRecipes) as
        NonNullable<SinglePlayerSnapshot['progress']['craftedRecipes']>,
    } : {}),
    ...(typeof progress.frontierOpeningDefeated === 'boolean' ? {
      frontierOpeningDefeated: progress.frontierOpeningDefeated,
    } : {}),
    ...(Array.isArray(progress.jurchenCleared) ? {
      jurchenCleared: stringArray(progress.jurchenCleared) as
        NonNullable<SinglePlayerSnapshot['progress']['jurchenCleared']>,
    } : {}),
    ...(typeof progress.hajinSouthwardMarch === 'boolean' ? {
      hajinSouthwardMarch: progress.hajinSouthwardMarch,
    } : {}),
    ...(finiteNumber(progress.hajinArmyReserve) ? {
      hajinArmyReserve: Math.max(0, Math.floor(progress.hajinArmyReserve)),
    } : {}),
    ...(finiteNumber(progress.gwanghaeEnemyReserve) ? {
      gwanghaeEnemyReserve: Math.max(0, Math.floor(progress.gwanghaeEnemyReserve)),
    } : {}),
    ...(finiteNumber(progress.gwanghaeEnemyInitialTotal) ? {
      gwanghaeEnemyInitialTotal: Math.max(0, Math.floor(progress.gwanghaeEnemyInitialTotal)),
    } : {}),
    ...(asRecord(progress.factionWar) ? {
      factionWar: progress.factionWar as SinglePlayerSnapshot['progress']['factionWar'],
    } : {}),
    ...(typeof progress.tangeumCleared === 'boolean' ? {
      tangeumCleared: progress.tangeumCleared,
    } : {}),
    ...(Array.isArray(progress.pyongyangCleared) ? {
      pyongyangCleared: stringArray(progress.pyongyangCleared) as
        NonNullable<SinglePlayerSnapshot['progress']['pyongyangCleared']>,
    } : {}),
    ...(Array.isArray(progress.japanCleared) ? {
      japanCleared: stringArray(progress.japanCleared) as
        NonNullable<SinglePlayerSnapshot['progress']['japanCleared']>,
    } : {}),
    ...(Array.isArray(progress.visitedRegions) ? {
      visitedRegions: stringArray(progress.visitedRegions) as
        NonNullable<SinglePlayerSnapshot['progress']['visitedRegions']>,
    } : {}),
    ...(Array.isArray(progress.japanMonsters) ? {
      japanMonsters: progress.japanMonsters.filter((entry) => asRecord(entry)) as
        NonNullable<SinglePlayerSnapshot['progress']['japanMonsters']>,
    } : {}),
    ...(Array.isArray(progress.royalRefugeMonsters) ? {
      royalRefugeMonsters: progress.royalRefugeMonsters.filter((entry) => asRecord(entry)) as
        NonNullable<SinglePlayerSnapshot['progress']['royalRefugeMonsters']>,
    } : {}),
    ...(typeof progress.shogunSecondPhase === 'boolean' ? {
      shogunSecondPhase: progress.shogunSecondPhase,
    } : {}),
    ...(asRecord(progress.royalRefuge) ? {
      royalRefuge: progress.royalRefuge as SinglePlayerSnapshot['progress']['royalRefuge'],
    } : {}),
  };

  return {
    migrated,
    snapshot: {
      version: 1,
      savedAt,
      origin,
      region: raw.region as SinglePlayerSnapshot['region'],
      player: {
        x: playerNumber('x', regionOrigin.x + 768),
        y: playerNumber('y', regionOrigin.y + 680),
        // Keep a defeated snapshot intact. GameSimulation restores it at the
        // protagonist's safe home spawn instead of reviving mid-encounter.
        hp: Math.max(0, playerNumber('hp', 180)),
        maxHp: Math.max(1, playerNumber('maxHp', 180)),
        level: Math.max(1, Math.floor(playerNumber('level', 1))),
        xp: Math.max(0, playerNumber('xp', 0)),
        xpToNext: Math.max(1, playerNumber('xpToNext', 80)),
        gold: Math.max(0, Math.floor(playerNumber('gold', 0))),
        potions: Math.max(0, Math.floor(playerNumber('potions', 0))),
        kills: Math.max(0, Math.floor(playerNumber('kills', 0))),
        facing: playerNumber('facing', -Math.PI / 2),
      },
      inventory,
      equipment,
      ...(groundDrops === undefined ? {} : { groundDrops }),
      skillRanks: normalizeSkillRanks(raw.skillRanks),
      skillPoints: finiteNumber(raw.skillPoints) ? Math.max(0, Math.floor(raw.skillPoints)) : 0,
      ...(followers === undefined ? {} : { followers }),
      highestBossCheckpoint: finiteNumber(raw.highestBossCheckpoint)
        ? Math.max(1, Math.floor(raw.highestBossCheckpoint))
        : 1,
      progress: migratedProgress,
    },
  };
};

const issue = (
  code: SaveIssueCode,
  scope: SaveIssue['scope'],
  error?: unknown,
): SaveIssue => ({
  code,
  scope,
  message: error instanceof Error ? error.message : code,
});

const withTimeout = async <T>(promise: Promise<T>, operation: string): Promise<T> => {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = globalThis.setTimeout(() => {
          reject(new Error(`${operation} timed out after ${CLOUD_OPERATION_TIMEOUT_MS}ms`));
        }, CLOUD_OPERATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) globalThis.clearTimeout(timer);
  }
};

const validDeviceId = (value: unknown): value is string =>
  typeof value === 'string'
  && value.length >= MIN_DEVICE_ID_LENGTH
  && value.length <= MAX_DEVICE_ID_LENGTH
  && /^[A-Za-z0-9._:-]+$/.test(value);

const randomId = (prefix: string): string => {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    // Fall through to the deterministic-shape random identifier.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

let volatileDeviceId: string | null = null;

const storageOrNull = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const readDeviceAliases = (storage: Storage | null): string[] => {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(DEVICE_ID_ALIASES_KEY) || '[]') as unknown;
    return Array.isArray(parsed) ? [...new Set(parsed.filter(validDeviceId))] : [];
  } catch {
    return [];
  }
};

const resolveDeviceId = (storage: Storage | null): string => {
  try {
    const existing = storage?.getItem(DEVICE_ID_KEY);
    if (validDeviceId(existing)) return existing;
    const created = randomId('device');
    storage?.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    volatileDeviceId ??= randomId('volatile-device');
    return volatileDeviceId;
  }
};

const metaFrom = (value: unknown): SaveMeta => {
  const raw = asRecord(value);
  const meta = asRecord(raw?.[SAVE_META_KEY]);
  return {
    revision: finiteNumber(meta?.revision) ? Math.max(0, Math.floor(meta.revision)) : 0,
    writerId: nonEmptyString(meta?.writerId) ? meta.writerId : 'legacy',
    pending: Boolean(meta?.pending),
  };
};

const persistedSnapshot = (
  snapshot: SinglePlayerSnapshot,
  meta: SaveMeta,
): PersistedSnapshot => ({
  ...snapshot,
  [SAVE_META_KEY]: meta,
});

const newerCandidate = (left: SnapshotCandidate, right: SnapshotCandidate): SnapshotCandidate => {
  if (left.revision !== right.revision) return left.revision > right.revision ? left : right;
  if (left.snapshot.savedAt !== right.snapshot.savedAt) {
    return left.snapshot.savedAt > right.snapshot.savedAt ? left : right;
  }
  if (left.pending !== right.pending) return left.pending ? left : right;
  return left.source === 'cloud' ? left : right;
};

export class SinglePlayerSave {
  private readonly storage = storageOrNull();
  private readonly primaryDeviceId: string;
  private readonly writerId = randomId('writer');
  private knownRevision = 0;
  private cloudWriteInFlight: Promise<number> | null = null;

  constructor(private readonly origin: PlayerOrigin = 'kim-donghyeok') {
    this.primaryDeviceId = resolveDeviceId(this.storage);
    const local = this.readLocalCandidate([]);
    if (local) this.knownRevision = local.revision;
  }

  private get localSaveKey(): string {
    if (this.origin === 'frontier-archer') return 'asra-frontier-archer-save-v1';
    if (this.origin === 'osaka-mudang') return 'asra-osaka-mudang-save-v1';
    if (this.origin === 'gwanghae-prince') return 'asra-gwanghae-prince-save-v1';
    return 'asra-single-save-v1';
  }

  private get localBackupKey(): string {
    return `${this.localSaveKey}${LOCAL_BACKUP_SUFFIX}`;
  }

  private cloudDocumentIdFor(deviceId: string): string {
    if (this.origin === 'frontier-archer') return `${deviceId}-frontier-archer`;
    if (this.origin === 'osaka-mudang') return `${deviceId}-osaka-mudang`;
    if (this.origin === 'gwanghae-prince') return `${deviceId}-gwanghae-prince`;
    return deviceId;
  }

  private get cloudDocumentIds(): string[] {
    return [...new Set([
      this.primaryDeviceId,
      ...readDeviceAliases(this.storage).filter((id) => id !== this.primaryDeviceId),
    ])].map((id) => this.cloudDocumentIdFor(id));
  }

  private parseLocalCandidate(
    serialized: string,
    recoveredFromBackup: boolean,
  ): SnapshotCandidate | null {
    const raw = JSON.parse(serialized) as unknown;
    const migrated = migrateSnapshot(raw, this.origin);
    if (!migrated) return null;
    const meta = metaFrom(raw);
    return {
      ...meta,
      ...migrated,
      source: 'local',
      recoveredFromBackup,
    };
  }

  private readLocalCandidate(issues: SaveIssue[]): SnapshotCandidate | null {
    if (!this.storage) {
      issues.push(issue('local-unavailable', 'local'));
      return null;
    }
    let primaryMissing = false;
    try {
      const serialized = this.storage.getItem(this.localSaveKey);
      if (!serialized) {
        primaryMissing = true;
      } else {
        const candidate = this.parseLocalCandidate(serialized, false);
        if (candidate) return candidate;
        issues.push(issue('local-invalid', 'local'));
      }
    } catch (error) {
      issues.push(issue('local-read-failed', 'local', error));
    }

    try {
      const serializedBackup = this.storage.getItem(this.localBackupKey);
      if (!serializedBackup) return null;
      const recovered = this.parseLocalCandidate(serializedBackup, true);
      if (!recovered) {
        if (primaryMissing) issues.push(issue('local-invalid', 'local'));
        return null;
      }
      issues.push(issue(
        'local-backup-recovered',
        'local',
        new Error('Recovered the previous valid local save after the primary save was unavailable.'),
      ));
      return recovered;
    } catch (error) {
      if (primaryMissing) issues.push(issue('local-read-failed', 'local', error));
      return null;
    }
  }

  private writeLocal(
    snapshot: SinglePlayerSnapshot,
    meta: SaveMeta,
  ): SaveIssue | null {
    if (!this.storage) return issue('local-unavailable', 'local');
    let serialized: string;
    try {
      serialized = JSON.stringify(persistedSnapshot(snapshot, meta));
    } catch (error) {
      return issue('local-write-failed', 'local', error);
    }

    // Keep the last distinct, readable snapshot before replacing the primary
    // record. localStorage writes are atomic, so a failed primary write leaves
    // both the old primary and this backup available for the next launch.
    try {
      const existing = this.storage.getItem(this.localSaveKey);
      if (existing) {
        const candidate = this.parseLocalCandidate(existing, false);
        if (
          candidate
          && JSON.stringify(candidate.snapshot) !== JSON.stringify(snapshot)
        ) {
          this.storage.setItem(this.localBackupKey, existing);
        }
      }
    } catch {
      // Backup rotation is best-effort and must not prevent a valid primary
      // snapshot from being written (for example when storage quota is tight).
    }

    try {
      this.storage.setItem(this.localSaveKey, serialized);
      return null;
    } catch (error) {
      return issue('local-write-failed', 'local', error);
    }
  }

  async loadDetailed(): Promise<SinglePlayerLoadResult> {
    const issues: SaveIssue[] = [];
    const candidates: SnapshotCandidate[] = [];
    const local = this.readLocalCandidate(issues);
    if (local) candidates.push(local);

    let cloudAuthenticated = false;
    try {
      await withTimeout(ensureAnonymousAuth(), 'Cloud save authentication');
      cloudAuthenticated = true;
    } catch (error) {
      issues.push(issue('cloud-auth-failed', 'cloud', error));
    }

    if (cloudAuthenticated) await Promise.all(this.cloudDocumentIds.map(async (documentId) => {
      try {
        const cloudDoc = await withTimeout(
          getDoc(doc(db, 'single_saves', documentId)),
          'Cloud save load',
        );
        const raw = cloudDoc.data()?.snapshot as unknown;
        if (raw === undefined) return;
        const migrated = migrateSnapshot(raw, this.origin);
        if (!migrated) {
          issues.push(issue('snapshot-invalid', 'cloud'));
          return;
        }
        const meta = metaFrom(raw);
        candidates.push({
          ...meta,
          ...migrated,
          source: 'cloud',
          recoveredFromBackup: false,
        });
      } catch (error) {
        issues.push(issue('cloud-read-failed', 'cloud', error));
      }
    }));

    if (candidates.length === 0) {
      return { status: issues.length > 0 ? 'error' : 'empty', issues };
    }

    const selected = candidates.reduce(newerCandidate);
    this.knownRevision = selected.revision;
    if (selected.source === 'cloud' || selected.recoveredFromBackup) {
      const mirrorIssue = this.writeLocal(selected.snapshot, {
        revision: selected.revision,
        writerId: selected.writerId,
        pending: false,
      });
      if (mirrorIssue) issues.push(mirrorIssue);
    }
    return {
      status: 'loaded',
      snapshot: selected.snapshot,
      source: selected.source,
      revision: selected.revision,
      migrated: selected.migrated,
      issues,
    };
  }

  async load(): Promise<{
    snapshot: SinglePlayerSnapshot;
    source: 'cloud' | 'local';
    revision: number;
    issues: SaveIssue[];
  } | null> {
    const result = await this.loadDetailed();
    if (result.status !== 'loaded') return null;
    return {
      snapshot: result.snapshot,
      source: result.source,
      revision: result.revision,
      issues: result.issues,
    };
  }

  saveLocal(snapshot: SinglePlayerSnapshot): LocalSaveResult {
    const migrated = migrateSnapshot(snapshot, this.origin);
    if (!migrated) {
      return {
        status: 'error',
        revision: this.knownRevision,
        issue: issue('snapshot-invalid', 'snapshot'),
      };
    }
    const existingIssues: SaveIssue[] = [];
    const existing = this.readLocalCandidate(existingIssues);
    if (existing && existing.revision > this.knownRevision && existing.writerId !== this.writerId) {
      return {
        status: 'conflict',
        revision: existing.revision,
        issue: issue('cloud-conflict', 'local'),
      };
    }
    const writeIssue = this.writeLocal(migrated.snapshot, {
      revision: this.knownRevision,
      writerId: this.writerId,
      pending: true,
    });
    return writeIssue
      ? { status: 'error', revision: this.knownRevision, issue: writeIssue }
      : { status: 'saved', revision: this.knownRevision };
  }

  flushLocal(snapshot: SinglePlayerSnapshot): LocalSaveResult {
    return this.saveLocal(snapshot);
  }

  bindLifecycleFlush(snapshot: () => SinglePlayerSnapshot): () => void {
    const flush = () => {
      try {
        this.flushLocal(snapshot());
      } catch {
        // A page lifecycle callback must never block navigation.
      }
    };
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
    };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', flush, { capture: true });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', flush, { capture: true });
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }

  private finalizeCloudCommit(snapshot: SinglePlayerSnapshot, revision: number): void {
    this.knownRevision = Math.max(this.knownRevision, revision);
    const currentLocal = this.readLocalCandidate([]);
    if (
      currentLocal
      && (
        currentLocal.revision > revision
        || currentLocal.snapshot.savedAt > snapshot.savedAt
      )
    ) return;
    this.writeLocal(snapshot, {
      revision,
      writerId: this.writerId,
      pending: false,
    });
  }

  async saveDetailed(snapshot: SinglePlayerSnapshot): Promise<SinglePlayerSaveResult> {
    const issues: SaveIssue[] = [];
    const migrated = migrateSnapshot(snapshot, this.origin);
    if (!migrated) {
      issues.push(issue('snapshot-invalid', 'snapshot'));
      return { status: 'error', revision: this.knownRevision, issues };
    }

    const localResult = this.saveLocal(migrated.snapshot);
    if (localResult.status !== 'saved') issues.push(localResult.issue);
    if (localResult.status === 'conflict') {
      return { status: 'conflict', revision: localResult.revision, issues };
    }
    if (this.cloudWriteInFlight) {
      issues.push(issue('cloud-write-pending', 'cloud'));
      return {
        status: localResult.status === 'saved' ? 'local' : 'error',
        revision: this.knownRevision,
        issues,
      };
    }

    try {
      await withTimeout(ensureAnonymousAuth(), 'Cloud save authentication');
    } catch (error) {
      issues.push(issue('cloud-auth-failed', 'cloud', error));
      return {
        status: localResult.status === 'saved' ? 'local' : 'error',
        revision: this.knownRevision,
        issues,
      };
    }

    const primaryDocumentId = this.cloudDocumentIdFor(this.primaryDeviceId);
    let committedRevision = this.knownRevision;
    const cloudWrite = runTransaction(db, async (transaction) => {
      const reference = doc(db, 'single_saves', primaryDocumentId);
      const currentDocument = await transaction.get(reference);
      const currentRaw = currentDocument.data()?.snapshot as unknown;
      const currentRevision = metaFrom(currentRaw).revision;
      if (currentRevision > this.knownRevision) throw new CloudRevisionConflict();
      const nextRevision = Math.max(currentRevision, this.knownRevision) + 1;
      const cloudSnapshot = JSON.parse(JSON.stringify(persistedSnapshot(migrated.snapshot, {
        revision: nextRevision,
        writerId: this.writerId,
        pending: false,
      }))) as PersistedSnapshot;
      transaction.set(reference, {
        snapshot: cloudSnapshot,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return nextRevision;
    });
    this.cloudWriteInFlight = cloudWrite;
    void cloudWrite.then((revision) => {
      this.finalizeCloudCommit(migrated.snapshot, revision);
    }).catch(() => {
      // The detailed caller receives the classified error if it is still awaiting.
    }).finally(() => {
      if (this.cloudWriteInFlight === cloudWrite) this.cloudWriteInFlight = null;
    });
    try {
      committedRevision = await withTimeout(
        cloudWrite,
        'Cloud save write',
      );
    } catch (error) {
      if (error instanceof CloudRevisionConflict) {
        issues.push(issue('cloud-conflict', 'cloud', error));
        return { status: 'conflict', revision: this.knownRevision, issues };
      }
      issues.push(issue('cloud-write-failed', 'cloud', error));
      return {
        status: localResult.status === 'saved' ? 'local' : 'error',
        revision: this.knownRevision,
        issues,
      };
    }

    this.finalizeCloudCommit(migrated.snapshot, committedRevision);
    return { status: 'cloud', revision: committedRevision, issues };
  }

  async save(snapshot: SinglePlayerSnapshot): Promise<'cloud' | 'local' | 'conflict' | 'error'> {
    const result = await this.saveDetailed(snapshot);
    return result.status;
  }
}
