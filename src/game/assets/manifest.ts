export const ASSETS = {
  background: { key: 'moonshadow-ridge', path: '/assets/environment/moonshadow-ridge.png' },
  villageBackground: { key: 'joseon-village-v1', path: '/assets/environment/joseon-village-v1.png' },
  worldBackground: { key: 'moonshadow-village-world-v1', path: '/assets/environment/moonshadow-village-world-v1.png' },
  mistwoodBackground: { key: 'cheongram-mistwood-v1', path: '/assets/environment/cheongram-mistwood-v1.png' },
  minepassBackground: { key: 'black-iron-minepass-v1', path: '/assets/environment/black-iron-minepass-v1.png' },
  moonfieldBackground: { key: 'moonlit-shadow-fields-v1', path: '/assets/environment/moonlit-shadow-fields-v1.png' },
  dungeonBackground: { key: 'muyeong-dungeon-base-v1', path: '/assets/environment/muyeong-dungeon-base-v1.png' },
  transitions: {
    mistwoodVillage: { key: 'mistwood-village-feathered-v2', path: '/assets/environment/mistwood-village-feathered-v2.png' },
    villageMinepass: { key: 'village-minepass-feathered-v2', path: '/assets/environment/village-minepass-feathered-v2.png' },
    villageMoonfield: { key: 'village-moonfield-feathered-v2', path: '/assets/environment/village-moonfield-feathered-v2.png' },
  },
  props: {
    spiritShrine: { key: 'spirit-shrine-v1', path: '/assets/environment/props/spirit-shrine-v1.png' },
    brokenCart: { key: 'broken-cart-v1', path: '/assets/environment/props/broken-cart-v1.png' },
    blacksmithHammer: { key: 'blacksmith-hammer-v1', path: '/assets/environment/props/blacksmith-hammer-v1.png' },
    blacksmithWorkstation: { key: 'blacksmith-workstation-v1', path: '/assets/environment/props/blacksmith-workstation-v1.png' },
  },
  playerUnequipped: { key: 'joseon-hero-base-body-v5', path: '/assets/characters/joseon-hero-base-body-v5.png' },
  playerWeaponOnly: { key: 'joseon-hero-weapon-only-v3', path: '/assets/characters/joseon-hero-weapon-only-v3.png' },
  playerArmorOnly: { key: 'joseon-hero-armor-only-v3', path: '/assets/characters/joseon-hero-armor-only-v3.png' },
  playerFullyEquipped: { key: 'joseon-hero-fully-equipped-v3', path: '/assets/characters/joseon-hero-fully-equipped-v3.png' },
  playerArmorLayer: { key: 'joseon-hero-armor-layer-v2', path: '/assets/characters/joseon-hero-armor-layer-v2.png' },
  villageCommoner: { key: 'joseon-village-commoner-v1', path: '/assets/characters/joseon-village-commoner-v1.png' },
  monsters: {
    dokkaebi: { key: 'dokkaebi-actions', path: '/assets/monsters/dokkaebi-actions.png' },
    boar: { key: 'boar-actions', path: '/assets/monsters/boar-actions.png' },
    bandit: { key: 'bandit-actions', path: '/assets/monsters/bandit-actions.png' },
    'bamboo-spirit': { key: 'bamboo-spirit-actions', path: '/assets/monsters/bamboo-spirit-actions.png' },
    'mine-golem': { key: 'mine-golem-actions', path: '/assets/monsters/mine-golem-actions.png' },
    'moon-revenant': { key: 'moon-revenant-actions', path: '/assets/monsters/moon-revenant-actions.png' },
  },
  bosses: {
    'chain-miner': { key: 'boss-chain-miner-actions', path: '/assets/bosses/chain-miner-actions-v1.png' },
    'bone-jangseung': { key: 'boss-bone-jangseung-actions', path: '/assets/bosses/bone-jangseung-actions-v1.png' },
    'flame-shaman': { key: 'boss-flame-shaman-actions', path: '/assets/bosses/flame-shaman-actions-v1.png' },
    'iron-tiger': { key: 'boss-iron-tiger-actions', path: '/assets/bosses/iron-tiger-actions-v1.png' },
    'headless-general': { key: 'boss-headless-general-actions', path: '/assets/bosses/headless-general-actions-v1.png' },
    'drowned-warden': { key: 'boss-drowned-warden-actions', path: '/assets/bosses/drowned-warden-actions-v1.png' },
    'eclipse-dokkaebi': { key: 'boss-eclipse-dokkaebi-actions', path: '/assets/bosses/eclipse-dokkaebi-actions-v1.png' },
    'black-iron-giant': { key: 'boss-black-iron-giant-actions', path: '/assets/bosses/black-iron-giant-actions-v1.png' },
    'sealed-monk': { key: 'boss-sealed-monk-actions', path: '/assets/bosses/sealed-monk-actions-v1.png' },
    'shadow-magistrate': { key: 'boss-shadow-magistrate-actions', path: '/assets/bosses/shadow-magistrate-actions-v1.png' },
  },
} as const;

export const PLAYER_ACTION_FRAME = { width: 256, height: 256, framesPerRow: 8 } as const;
export const MONSTER_FRAME = { width: 256, height: 256, framesPerRow: 8 } as const;
