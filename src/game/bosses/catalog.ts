import type { BossDefinition, BossEffect, BossId, BossPatternDefinition, BossPatternShape } from './types';

const p = (id: string, name: string, effect: BossEffect, shape: BossPatternShape, minimumPhase: 1 | 2 = 1): BossPatternDefinition => ({
  id, name, effect, shape, minimumPhase, range: shape.kind === 'line' ? shape.length : shape.radius,
  telegraphSeconds: minimumPhase === 2 ? 0.65 : 0.8, windupSeconds: 0.24, recoverySeconds: 0.52,
  cooldownSeconds: minimumPhase === 2 ? 3.2 : 2.4, damageMultiplier: minimumPhase === 2 ? 1.5 : 1,
});
const specs: Array<[BossId, number, string, number, number, number, readonly [BossPatternDefinition, BossPatternDefinition, BossPatternDefinition]]> = [
  ['chain-miner',10,'쇠사슬 광부 망혼',620,16,.62,[p('chain-sweep','쇠사슬 휘두르기','sweep',{kind:'cone',radius:190,arc:1.8}),p('ore-fall','광석 낙하','fall',{kind:'circle',radius:72}),p('chain-pull','영혼 끌어당기기','pull',{kind:'arena',radius:260,safeRadius:86},2)]],
  ['bone-jangseung',20,'백골 장승귀',820,19,.63,[p('bone-spikes','땅가시','spikes',{kind:'line',length:260,width:72}),p('fear-roar','공포 포효','fear',{kind:'circle',radius:180}),p('post-clones','장승 분신','summon',{kind:'arena',radius:270,safeRadius:100},2)]],
  ['flame-shaman',30,'홍염 무당',1040,22,.62,[p('fire-talismans','화염 부적','projectile',{kind:'line',length:300,width:60}),p('curse-circle','저주진','fall',{kind:'circle',radius:100}),p('flame-step','홍염 순간이동','teleport',{kind:'cone',radius:210,arc:1.3},2)]],
  ['iron-tiger',40,'철갑 산군',1280,25,.66,[p('tiger-pounce','도약 덮치기','pounce',{kind:'line',length:270,width:90}),p('claw-combo','연속 발톱','sweep',{kind:'cone',radius:150,arc:2}),p('tiger-roar','산군 포효','shockwave',{kind:'circle',radius:230},2)]],
  ['headless-general',50,'무두 장수',1550,29,.65,[p('spear-charge','장창 돌진','charge',{kind:'line',length:320,width:74}),p('ghost-banner','망령 군기','summon',{kind:'circle',radius:125}),p('general-spin','회전 베기','sweep',{kind:'circle',radius:175},2)]],
  ['drowned-warden',60,'수몰된 수문장',1880,33,.64,[p('water-wave','물결 밀치기','shockwave',{kind:'cone',radius:240,arc:2.2}),p('drowned-call','익사자 소환','summon',{kind:'circle',radius:130}),p('flood-zone','침수 구역','flood',{kind:'arena',radius:300,safeRadius:82},2)]],
  ['eclipse-dokkaebi',70,'월식 도깨비왕',2250,37,.67,[p('club-quake','방망이 지진','shockwave',{kind:'circle',radius:210}),p('moon-clones','허상 분신','clone',{kind:'cone',radius:220,arc:2}),p('frenzy-club','광폭 연타','sweep',{kind:'circle',radius:190},2)]],
  ['black-iron-giant',80,'흑철 거인',2700,42,.69,[p('iron-slam','양손 내려찍기','fall',{kind:'cone',radius:190,arc:1.6}),p('ceiling-fall','천장 붕괴','fall',{kind:'circle',radius:115}),p('iron-guard','철갑 방어','defense',{kind:'arena',radius:260,safeRadius:110},2)]],
  ['sealed-monk',90,'봉인 파계승',3250,47,.64,[p('bead-volley','염주 탄환','projectile',{kind:'line',length:330,width:58}),p('prayer-vacuum','흡인 장판','vacuum',{kind:'arena',radius:270,safeRadius:80}),p('seal-wave','봉인 파동','shockwave',{kind:'circle',radius:245},2)]],
  ['shadow-magistrate',100,'무영대감',4000,54,.65,[p('shadow-sword','그림자 검술','sweep',{kind:'cone',radius:205,arc:2}),p('court-clones','분신 협공','clone',{kind:'line',length:310,width:88}),p('final-eclipse','월식 최종 페이즈','vacuum',{kind:'arena',radius:320,safeRadius:74},2)]],
];
export const BOSS_CATALOG = Object.fromEntries(specs.map(([id,floor,name,maxHp,damage,scale,patterns]) => [id,{ id,floor,name,maxHp,damage,scale,patterns,moveSpeed:52+floor*.18,textureKey:`boss-${id}-actions` }])) as Record<BossId,BossDefinition>;
export const bossForFloor = (floor: number): BossDefinition | null => Object.values(BOSS_CATALOG).find((boss)=>boss.floor===floor) ?? null;
