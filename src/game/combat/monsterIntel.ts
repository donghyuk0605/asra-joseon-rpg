import { episode2DropPool } from '../world/episode2Regions';
import type { RegionId } from '../world/regions';
import type {
  ItemId,
  MonsterKind,
  MonsterTacticalRole,
  PlayerOrigin,
  WeaponElement,
} from '../simulation/types';

export const ELEMENT_EFFECT_MULTIPLIER = Object.freeze({
  weakness: 1.3,
  neutral: 1,
  resistance: 0.65,
});

export type MonsterElementAffinity = Readonly<{
  weakness: WeaponElement;
  resistance: WeaponElement;
}>;

export type MonsterLootIntel = Readonly<{
  primary: ItemId | null;
  rare: ItemId | null;
  guarantee: string | null;
  pityEvery: number | null;
}>;

const SPIRIT_KINDS: ReadonlySet<MonsterKind> = new Set([
  'bamboo-spirit', 'moon-revenant', 'geoje-sea-wraith', 'episode2-marsh-wisp', 'haeju-crane',
]);
const STONE_KINDS: ReadonlySet<MonsterKind> = new Set([
  'mine-golem', 'episode2-stone-dokkaebi',
]);
const BEAST_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-hare', 'ulleung-water-deer', 'ulleung-sangun', 'boar',
  'japanese-sika-deer', 'japanese-wild-boar', 'korean-gray-wolf', 'wonju-bear',
  'episode2-red-fox', 'episode2-mountain-leopard',
]);
const DOKKAEBI_KINDS: ReadonlySet<MonsterKind> = new Set([
  'dokkaebi', 'gangneung-haetae',
]);
const CORRUPTED_HUMAN_KINDS: ReadonlySet<MonsterKind> = new Set([
  'osaka-overseer', 'osaka-ronin', 'bandit', 'ulleung-magistrate',
]);
const ARMORED_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-captain', 'ulleung-executioner', 'yeongwol-shield', 'yeongwol-commander',
  'jeonju-shield', 'jeonju-commander', 'japanese-general', 'japanese-shogun',
  'manchu-cavalry', 'manchu-captain', 'manchu-chieftain', 'joseon-border-commander',
  'royal-guard', 'joseon-prince',
]);

const GOVERNMENT_LOOT_KINDS: ReadonlySet<MonsterKind> = new Set([
  'ulleung-guard', 'ulleung-veteran', 'ulleung-archer', 'ulleung-executioner', 'ulleung-captain',
  'yeongwol-swordsman', 'yeongwol-spearman', 'yeongwol-archer', 'yeongwol-shield', 'yeongwol-commander',
  'jeonju-swordsman', 'jeonju-spearman', 'jeonju-archer', 'jeonju-shield', 'jeonju-commander',
  'jeonju-militia-sickle',
  'joseon-border-swordsman', 'joseon-border-spearman', 'joseon-border-archer', 'joseon-border-commander',
  'royal-guard', 'joseon-prince',
]);
const WAKO_LOOT_KINDS: ReadonlySet<MonsterKind> = new Set([
  'wako-raider', 'wako-archer', 'wako-captain',
]);

const REGIONAL_SIGNATURE_DROPS: Partial<Record<MonsterKind, ItemId>> = {
  'wonju-bear': 'chiaksan-claw-knife',
  'gangneung-haetae': 'haetae-ward-charm',
  'haeju-crane': 'crane-feather-talisman',
  'geoje-sea-wraith': 'sea-salt-amulet',
};

export const monsterElementAffinity = (
  monster: Pick<{ kind: MonsterKind; tacticalRole: MonsterTacticalRole }, 'kind' | 'tacticalRole'>,
): MonsterElementAffinity => {
  if (SPIRIT_KINDS.has(monster.kind)) return { weakness: 'fire', resistance: 'poison' };
  if (STONE_KINDS.has(monster.kind)) return { weakness: 'lightning', resistance: 'poison' };
  if (BEAST_KINDS.has(monster.kind)) return { weakness: 'fire', resistance: 'earth' };
  if (DOKKAEBI_KINDS.has(monster.kind)) return { weakness: 'earth', resistance: 'shadow' };
  if (CORRUPTED_HUMAN_KINDS.has(monster.kind)) return { weakness: 'shadow', resistance: 'poison' };
  if (ARMORED_KINDS.has(monster.kind) || monster.tacticalRole === 'brute') {
    return { weakness: 'lightning', resistance: 'earth' };
  }
  if (monster.tacticalRole === 'ranged') return { weakness: 'wind', resistance: 'ice' };
  if (monster.tacticalRole === 'charger') return { weakness: 'ice', resistance: 'wind' };
  return { weakness: 'poison', resistance: 'fire' };
};

export const monsterElementEffectMultiplier = (
  monster: Pick<{ kind: MonsterKind; tacticalRole: MonsterTacticalRole }, 'kind' | 'tacticalRole'>,
  element: WeaponElement,
): number => {
  const affinity = monsterElementAffinity(monster);
  if (affinity.weakness === element) return ELEMENT_EFFECT_MULTIPLIER.weakness;
  if (affinity.resistance === element) return ELEMENT_EFFECT_MULTIPLIER.resistance;
  return ELEMENT_EFFECT_MULTIPLIER.neutral;
};

export const monsterGuaranteedSignatureDrop = (kind: MonsterKind): ItemId | null => (
  REGIONAL_SIGNATURE_DROPS[kind] ?? null
);

export const rollStandardMonsterLoot = (
  kind: MonsterKind,
  roll: number,
  secondaryRoll: () => number,
  playerOrigin: PlayerOrigin,
): ItemId | null => {
  if (kind === 'ulleung-magistrate') return 'moonsteel-hwando';
  if (kind === 'wako-captain' && roll < 0.16) return 'ember-hwando';
  if (kind === 'wako-archer' && roll < 0.12) return 'gale-hwando';
  if (kind === 'bamboo-spirit' && roll < 0.12) return 'venom-hwando';
  if (kind === 'mine-golem' && roll < 0.13) return 'earth-hwando';
  if (kind === 'moon-revenant' && roll < 0.12) return 'shadow-hwando';
  if ((kind === 'yeongwol-commander' || kind === 'jeonju-commander') && roll < 0.12) {
    return 'storm-hwando';
  }
  if (kind === 'japanese-general' && playerOrigin === 'frontier-archer' && roll < 0.16) {
    return 'thunderbird-bow';
  }
  if (roll < 0.028) {
    return secondaryRoll() < 0.5 ? 'weapon-enchant-scroll' : 'armor-enchant-scroll';
  }
  if ((kind === 'bandit' || GOVERNMENT_LOOT_KINDS.has(kind) || WAKO_LOOT_KINDS.has(kind)) && roll < 0.085) {
    return secondaryRoll() < 0.08 ? 'warden-durumagi' : 'hunter-durumagi';
  }
  if (kind === 'boar' && roll < 0.1) {
    return secondaryRoll() < 0.06 ? 'silver-tiger-charm' : 'boar-tusk-charm';
  }
  if ((kind === 'dokkaebi' || kind === 'bamboo-spirit') && roll < 0.075) {
    return secondaryRoll() < 0.04 ? 'moonsteel-hwando' : 'dokkaebi-club';
  }
  return null;
};

export const monsterLootPityInterval = (kind: MonsterKind): number | null => (
  kind === 'japanese-shogun' || kind === 'ulleung-sangun' || kind === 'ulleung-magistrate'
    ? null
    : 8
);

export const monsterLootIntel = (
  kind: MonsterKind,
  region: RegionId,
  playerOrigin: PlayerOrigin,
): MonsterLootIntel => {
  if (kind === 'japanese-shogun') {
    return {
      primary: 'weapon-enchant-scroll', rare: 'armor-enchant-scroll',
      guarantee: '두 주문서 확정', pityEvery: null,
    };
  }
  if (kind === 'ulleung-sangun') {
    return {
      primary: 'ulleung-tiger-pelt', rare: 'frost-hwando',
      guarantee: '첫 호피 확정', pityEvery: null,
    };
  }

  const episodePool = episode2DropPool(region);
  if (episodePool.length > 0) {
    return {
      primary: episodePool[0] ?? null,
      rare: episodePool[1] ?? episodePool[0] ?? null,
      guarantee: '첫 미보유 장비 우선',
      pityEvery: monsterLootPityInterval(kind),
    };
  }

  const signature = monsterGuaranteedSignatureDrop(kind);
  if (signature) {
    const rareByKind: Partial<Record<MonsterKind, ItemId>> = {
      'wonju-bear': 'bear-claw-gauntlet',
      'gangneung-haetae': 'gangneung-sea-bow',
      'haeju-crane': 'haeju-reed-cape',
      'geoje-sea-wraith': 'geoje-anchor-hwando',
    };
    return {
      primary: signature,
      rare: rareByKind[kind] ?? 'weapon-enchant-scroll',
      guarantee: '첫 미보유 장비 확정',
      pityEvery: monsterLootPityInterval(kind),
    };
  }

  if (kind === 'ulleung-magistrate') {
    return { primary: 'moonsteel-hwando', rare: null, guarantee: '처치 확정', pityEvery: null };
  }
  if (kind === 'bamboo-spirit') {
    return { primary: 'crescent-manual', rare: 'venom-hwando', guarantee: '미습득 비급 확정', pityEvery: 8 };
  }
  if (kind === 'moon-revenant') {
    return { primary: 'insight-manual', rare: 'shadow-hwando', guarantee: '미습득 비급 확정', pityEvery: 8 };
  }
  if (playerOrigin === 'frontier-archer' && region === 'manchufrontier' && kind === 'boar') {
    return { primary: 'white-birch-bow', rare: 'iron-horn-warbow', guarantee: '첫 활 확정', pityEvery: 8 };
  }
  if (playerOrigin === 'frontier-archer' && region === 'manchufrontier' && kind === 'joseon-border-commander') {
    return { primary: 'frontier-lamellar-coat', rare: 'joseon-border-token', guarantee: '첫 미보유 복장 확정', pityEvery: 8 };
  }
  if (playerOrigin === 'frontier-archer' && region === 'manchufrontier' && kind === 'joseon-border-archer') {
    return { primary: 'falcon-eye-bracer', rare: 'joseon-border-token', guarantee: '첫 미보유 부적 확정', pityEvery: 8 };
  }

  const specific: Partial<Record<MonsterKind, readonly [ItemId, ItemId | null]>> = {
    'wako-captain': ['ember-hwando', 'weapon-enchant-scroll'],
    'wako-archer': ['gale-hwando', 'weapon-enchant-scroll'],
    'mine-golem': ['earth-hwando', 'weapon-enchant-scroll'],
    'yeongwol-commander': ['storm-hwando', 'weapon-enchant-scroll'],
    'jeonju-commander': ['storm-hwando', 'weapon-enchant-scroll'],
    'japanese-general': playerOrigin === 'frontier-archer'
      ? ['thunderbird-bow', 'weapon-enchant-scroll']
      : ['hunter-durumagi', 'weapon-enchant-scroll'],
    boar: ['boar-tusk-charm', 'silver-tiger-charm'],
    dokkaebi: ['dokkaebi-club', 'moonsteel-hwando'],
  };
  const known = specific[kind];
  if (known) {
    return { primary: known[0], rare: known[1], guarantee: null, pityEvery: monsterLootPityInterval(kind) };
  }
  if (kind === 'bandit' || GOVERNMENT_LOOT_KINDS.has(kind) || WAKO_LOOT_KINDS.has(kind)) {
    return {
      primary: 'hunter-durumagi', rare: 'warden-durumagi',
      guarantee: null, pityEvery: monsterLootPityInterval(kind),
    };
  }
  return {
    primary: null,
    rare: 'weapon-enchant-scroll',
    guarantee: null,
    pityEvery: monsterLootPityInterval(kind),
  };
};

export const monsterLootPityProgress = (kills: number, every: number): Readonly<{
  current: number;
  remaining: number;
}> => {
  const current = Math.max(0, Math.floor(kills)) % every;
  return { current, remaining: every - current };
};
