import type PhaserType from 'phaser';
import type { HuntingScene } from './game/phaser/HuntingScene';
import { REGIONS, type RegionId } from './game/world/regions';
import { setupMobilePwaExperience } from './mobilePwa';
import './styles.css';

const LEGACY_FIREBASE_HOST = 'haze-479ed.firebaseapp.com';
const CANONICAL_FIREBASE_HOST = 'haze-479ed.web.app';
const SAVE_DEVICE_ID_KEY = 'asra-device-id-v1';
const SAVE_DEVICE_ALIASES_KEY = 'asra-device-id-aliases-v1';
const SAVE_DEVICE_HANDOFF_HASH = '#asra-device=';

const validSaveDeviceId = (value: unknown): value is string =>
  typeof value === 'string'
  && value.length >= 20
  && value.length <= 60
  && /^[A-Za-z0-9._:-]+$/.test(value);

const applyCanonicalSaveHost = (): void => {
  if (window.location.hostname === LEGACY_FIREBASE_HOST) {
    const target = new URL(window.location.href);
    target.hostname = CANONICAL_FIREBASE_HOST;
    try {
      const legacyDeviceId = localStorage.getItem(SAVE_DEVICE_ID_KEY);
      target.hash = validSaveDeviceId(legacyDeviceId)
        ? `${SAVE_DEVICE_HANDOFF_HASH}${encodeURIComponent(legacyDeviceId)}`
        : '';
    } catch {
      target.hash = '';
    }
    window.location.replace(target.toString());
    return;
  }
  if (
    window.location.hostname !== CANONICAL_FIREBASE_HOST
    || !window.location.hash.startsWith(SAVE_DEVICE_HANDOFF_HASH)
  ) return;

  let legacyDeviceId = '';
  try {
    legacyDeviceId = decodeURIComponent(
      window.location.hash.slice(SAVE_DEVICE_HANDOFF_HASH.length),
    );
  } catch {
    return;
  }
  if (!validSaveDeviceId(legacyDeviceId)) return;
  try {
    const currentDeviceId = localStorage.getItem(SAVE_DEVICE_ID_KEY);
    if (!validSaveDeviceId(currentDeviceId)) {
      localStorage.setItem(SAVE_DEVICE_ID_KEY, legacyDeviceId);
    } else if (currentDeviceId !== legacyDeviceId) {
      const parsed = JSON.parse(localStorage.getItem(SAVE_DEVICE_ALIASES_KEY) || '[]') as unknown;
      const aliases = Array.isArray(parsed) ? parsed.filter(validSaveDeviceId) : [];
      localStorage.setItem(
        SAVE_DEVICE_ALIASES_KEY,
        JSON.stringify([...new Set([...aliases, legacyDeviceId])]),
      );
    }
  } catch {
    // Canonical navigation still succeeds if storage is unavailable.
  }
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
};

applyCanonicalSaveHost();

type GameMode = 'kim-new' | 'kim-continue' | 'archer-new' | 'archer-continue'
  | 'mudang-new' | 'mudang-continue' | 'gwanghae-new' | 'gwanghae-continue'
  | 'travel' | 'hunt' | 'online';

const titleScreen = document.querySelector<HTMLElement>('#title-screen');
const settingsPanel = titleScreen?.querySelector<HTMLElement>('.title-settings');
const onlineLobby = titleScreen?.querySelector<HTMLElement>('.online-lobby');
const storyRoster = titleScreen?.querySelector<HTMLElement>('.story-roster');
const onlineName = titleScreen?.querySelector<HTMLInputElement>('#online-player-name');
const onlineCitadelRoot = document.querySelector<HTMLElement>('#online-citadel');
const chatRoot = document.querySelector<HTMLElement>('#online-chat');
const chatMessages = chatRoot?.querySelector<HTMLOListElement>('[data-chat-messages]');
const chatForm = chatRoot?.querySelector<HTMLFormElement>('[data-chat-form]');
const chatInput = chatRoot?.querySelector<HTMLInputElement>('[data-chat-input]');
const chatTitle = chatRoot?.querySelector<HTMLElement>('header strong');
const playtestParams = new URLSearchParams(window.location.search);
const directPlaytest = import.meta.env.DEV && playtestParams.has('region');
const directFrontierArcher = import.meta.env.DEV && playtestParams.get('character') === 'frontier-archer';
const directOsakaMudang = import.meta.env.DEV && playtestParams.get('character') === 'osaka-mudang';
const directGwanghaePrince = import.meta.env.DEV && playtestParams.get('character') === 'gwanghae-prince';
const multiplayerUrl = import.meta.env.VITE_MULTIPLAYER_URL || 'wss://asra-online-fm42afh6ka-an.a.run.app/ws';

let firestoreChat: import('./game/online/FirestoreChat').FirestoreChat | null = null;
let onlineCitadel: import('./game/online/OnlineCitadel').OnlineCitadel | null = null;
let game: PhaserType.Game | null = null;
let gameScene: HuntingScene | null = null;
let gameBootPromise: Promise<HuntingScene> | null = null;
// The title remains clickable during its exit animation.  Without a launch
// token, two quick character selections can resolve `ensureGame()` out of
// order and the older (usually 김동혁) request can overwrite the newer one.
let launchRequestId = 0;
let requestedMute = false;
const mobilePwa = setupMobilePwaExperience();

const CAMPAIGN_LAUNCH_PROFILE: Partial<Record<GameMode, Readonly<{
  origin: 'kim-donghyeok' | 'frontier-archer' | 'osaka-mudang' | 'gwanghae-prince';
  campaign: 'mainland' | 'frontier' | 'japan' | 'gwanghae';
  label: string;
}>>> = {
  'kim-new': { origin: 'kim-donghyeok', campaign: 'mainland', label: '김동혁' },
  'kim-continue': { origin: 'kim-donghyeok', campaign: 'mainland', label: '김동혁' },
  'archer-new': { origin: 'frontier-archer', campaign: 'frontier', label: '하진' },
  'archer-continue': { origin: 'frontier-archer', campaign: 'frontier', label: '하진' },
  'mudang-new': { origin: 'osaka-mudang', campaign: 'japan', label: '연화' },
  'mudang-continue': { origin: 'osaka-mudang', campaign: 'japan', label: '연화' },
  'gwanghae-new': { origin: 'gwanghae-prince', campaign: 'gwanghae', label: '왕세자 광해' },
  'gwanghae-continue': { origin: 'gwanghae-prince', campaign: 'gwanghae', label: '왕세자 광해' },
};

type SaveRecord = Record<string, unknown>;

const asSaveRecord = (value: unknown): SaveRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as SaveRecord
    : null;

const saveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)))
    : null;

const knownSaveRegion = (value: unknown): value is RegionId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(REGIONS, value);

const saveArrayCount = (value: unknown, maximum = 999): number =>
  Array.isArray(value) ? Math.min(maximum, value.length) : 0;

const uniqueStringCount = (value: unknown, maximum = 999): number => {
  if (!Array.isArray(value)) return 0;
  return Math.min(maximum, new Set(value.filter((entry): entry is string =>
    typeof entry === 'string' && entry.length > 0,
  )).size);
};

const SAVE_NUMBER_FORMAT = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const SAVE_DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const saveOrigin = (snapshot: SaveRecord, key: string): string => {
  if (typeof snapshot.origin === 'string') return snapshot.origin;
  if (key.includes('frontier-archer')) return 'frontier-archer';
  if (key.includes('osaka-mudang')) return 'osaka-mudang';
  if (key.includes('gwanghae-prince')) return 'gwanghae-prince';
  return 'kim-donghyeok';
};

const describeCampaignProgress = (
  snapshot: SaveRecord,
  key: string,
  progress: SaveRecord,
): string => {
  const dungeon = asSaveRecord(progress.dungeon);
  const dungeonFloor = saveInteger(dungeon?.floor);
  if (snapshot.region === 'dungeon' && dungeonFloor && dungeonFloor > 0) {
    return dungeon?.complete === true
      ? `무영광산 ${dungeonFloor}층 완수`
      : `무영광산 ${dungeonFloor}층 원정`;
  }

  const royalRefuge = asSaveRecord(progress.royalRefuge);
  if (royalRefuge?.finalDefenseComplete === true) return '최종 피난전 완수';
  const refugeStage = saveInteger(royalRefuge?.activeStageIndex);
  if (refugeStage !== null && refugeStage <= 2) {
    const route = royalRefuge?.routeId === 'ganghwado' ? '강화도' : '남한산성';
    return `${route} 방어선 ${refugeStage + 1}/3`;
  }

  const origin = saveOrigin(snapshot, key);
  const pyongyangCleared = uniqueStringCount(progress.pyongyangCleared, 3);
  const jurchenCleared = uniqueStringCount(progress.jurchenCleared, 6);
  const japanCleared = uniqueStringCount(progress.japanCleared, 12);

  if (origin === 'frontier-archer') {
    if (pyongyangCleared > 0) return `평양 전선 ${pyongyangCleared}/3 돌파`;
    if (progress.hajinSouthwardMarch === true) return '부족 통합 · 남진 개시';
    if (jurchenCleared > 0) return `북방 전선 ${jurchenCleared}/6 돌파`;
    return progress.frontierOpeningDefeated === true ? '패전군 재건 중' : '압록 첫 전투';
  }
  if (origin === 'osaka-mudang') {
    if (progress.shogunSecondPhase === true) return '오사카 쇼군 결전';
    return japanCleared > 0 ? `일본 전선 ${japanCleared}곳 돌파` : '오사카 복수행';
  }
  if (origin === 'gwanghae-prince') {
    if (pyongyangCleared > 0) return `분조 북진 ${pyongyangCleared}/3 돌파`;
    return progress.tangeumCleared === true ? '탄금대 수복 이후' : '분조 행군 중';
  }
  if (progress.ulleungVillageLiberated === true) return '울릉 관아 해방';
  if (progress.wakoInvasionStarted === true) return '왜구 침공 전선';
  if (progress.questCompleted === true) return '울릉 첫 임무 완수';
  const checkpoint = saveInteger(snapshot.highestBossCheckpoint);
  return checkpoint && checkpoint > 1 ? `무영광산 ${checkpoint}층 도달` : '울릉 봉기 준비';
};

const describeLocalSave = (key: string): string => {
  try {
    const snapshot = asSaveRecord(JSON.parse(localStorage.getItem(key) || 'null'));
    const player = asSaveRecord(snapshot?.player);
    const level = saveInteger(player?.level);
    const savedAt = saveInteger(snapshot?.savedAt);
    if (!snapshot || !player || !level || !savedAt || savedAt > 8_640_000_000_000_000) {
      return '저장 기록 없음 · 이어하기에서 클라우드 기록 확인';
    }

    const progress = asSaveRecord(snapshot.progress) ?? {};
    const equipment = asSaveRecord(snapshot.equipment);
    const saveMeta = asSaveRecord(snapshot.__saveMeta);
    const maxHp = Math.max(1, saveInteger(player.maxHp) ?? 1);
    const hp = Math.min(maxHp, saveInteger(player.hp) ?? maxHp);
    const xp = saveInteger(player.xp) ?? 0;
    const xpToNext = Math.max(1, saveInteger(player.xpToNext) ?? 1);
    const gold = saveInteger(player.gold) ?? 0;
    const kills = saveInteger(player.kills) ?? 0;
    const inventoryCount = saveArrayCount(snapshot.inventory, 20);
    const followerCount = saveArrayCount(snapshot.followers, 99);
    const equippedCount = (['weapon', 'armor', 'charm'] as const).filter((slot) =>
      typeof equipment?.[slot] === 'string' && (equipment[slot] as string).length > 0,
    ).length;
    const visitedCount = Math.max(
      knownSaveRegion(snapshot.region) ? 1 : 0,
      uniqueStringCount(progress.visitedRegions, Object.keys(REGIONS).length),
    );
    const regionName = knownSaveRegion(snapshot.region)
      ? REGIONS[snapshot.region].name
      : '기록된 미지의 땅';
    const revision = saveInteger(saveMeta?.revision) ?? 0;
    const syncState = saveMeta?.pending === true
      ? '기기 저장 · 구름 대기'
      : revision > 0 ? `기기·구름 ${revision}차 동기화` : '기기 저장';
    const progressLabel = describeCampaignProgress(snapshot, key, progress);
    const saved = SAVE_DATE_FORMAT.format(savedAt);
    const number = (value: number) => SAVE_NUMBER_FORMAT.format(value);

    return [
      `기기 원정록 · ${regionName} · ${level}품 · ${syncState}`,
      `생명 ${number(hp)}/${number(maxHp)} · 경험 ${number(xp)}/${number(xpToNext)} · ${number(gold)}냥 · ${number(kills)}격파`,
      `장비 ${equippedCount}/3 · 가방 ${inventoryCount}/20 · 동행 ${followerCount} · 발자취 ${visitedCount}곳 · ${progressLabel} · ${saved} 저장`,
    ].join('\n');
  } catch {
    return '저장 기록 손상 · 새 기록으로 복구 가능';
  }
};

const renderLocalSaveStatus = (element: HTMLElement, key: string): void => {
  const description = describeLocalSave(key);
  element.textContent = description;
  element.style.whiteSpace = 'pre-line';
  element.style.lineHeight = '1.5';
  element.title = description.replaceAll('\n', ' / ');
  element.setAttribute('aria-label', element.title);
};

const updateStorySaveStatus = () => {
  const kim = storyRoster?.querySelector<HTMLElement>('[data-save-status="kim"]');
  const archer = storyRoster?.querySelector<HTMLElement>('[data-save-status="archer"]');
  const mudang = storyRoster?.querySelector<HTMLElement>('[data-save-status="mudang"]');
  const gwanghae = storyRoster?.querySelector<HTMLElement>('[data-save-status="gwanghae"]');
  if (kim) renderLocalSaveStatus(kim, 'asra-single-save-v1');
  if (archer) renderLocalSaveStatus(archer, 'asra-frontier-archer-save-v1');
  if (mudang) renderLocalSaveStatus(mudang, 'asra-osaka-mudang-save-v1');
  if (gwanghae) renderLocalSaveStatus(gwanghae, 'asra-gwanghae-prince-save-v1');
};

const setStoryRosterOpen = (open: boolean) => {
  storyRoster?.classList.toggle('is-open', open);
  storyRoster?.setAttribute('aria-hidden', String(!open));
  if (open) storyRoster?.removeAttribute('inert');
  else storyRoster?.setAttribute('inert', '');
  const storyLauncher = titleScreen?.querySelector<HTMLElement>('[data-title-action="story"]');
  storyLauncher?.setAttribute('aria-expanded', String(open));
  if (open) {
    updateStorySaveStatus();
    window.setTimeout(() => storyRoster?.querySelector<HTMLButtonElement>('.story-character__new')?.focus(), 60);
  } else if (!titleScreen?.hasAttribute('hidden')) {
    storyLauncher?.focus();
  }
};

// The title artwork is lightweight and interactive before Phaser is downloaded.
// This removes the 1.4MB engine bundle from the first mobile paint.
const titleBoot = document.querySelector<HTMLElement>('#boot-loader');
const titleBootFill = document.querySelector<HTMLElement>('#boot-progress-fill');
const titleBootValue = document.querySelector<HTMLElement>('#boot-progress-value');
const titleBootStatus = document.querySelector<HTMLElement>('#boot-status');
const BOOT_LOADER_MIN_VISIBLE_MS = 720;
if (titleBoot && !titleBoot.dataset.bootVisibleAt) {
  titleBoot.dataset.bootVisibleAt = String(performance.now());
}
const finishTitleBoot = () => {
  if (!titleBoot || gameBootPromise) return;
  if (titleBootFill) titleBootFill.style.width = '100%';
  if (titleBootValue) titleBootValue.textContent = '100%';
  if (titleBootStatus) titleBootStatus.textContent = '아스라의 기록이 열렸습니다';
  titleBoot.setAttribute('aria-valuenow', '100');
  const visibleAt = Number(titleBoot.dataset.bootVisibleAt || performance.now());
  const remainingVisibleMs = Math.max(0,
    BOOT_LOADER_MIN_VISIBLE_MS - (performance.now() - visibleAt),
  );
  window.setTimeout(() => {
    if (!gameBootPromise) {
      titleBoot.classList.add('is-ready');
      titleBoot.setAttribute('aria-hidden', 'true');
    }
  }, remainingVisibleMs);
};
if (document.readyState === 'complete') finishTitleBoot();
else window.addEventListener('load', finishTitleBoot, { once: true });

const mobileRenderProfile = window.matchMedia('(pointer: coarse)').matches
  || Math.min(window.innerWidth, window.innerHeight) <= 900;
const devRenderScale = import.meta.env.DEV
  ? Number(new URLSearchParams(window.location.search).get('renderScale'))
  : 0;
const renderResolution = devRenderScale > 0
  ? Math.min(2, Math.max(0.5, devRenderScale))
  : Math.min(window.devicePixelRatio || 1, mobileRenderProfile ? 2 : 1.5);
const canvasSize = () => ({
  width: Math.max(1, Math.round(window.innerWidth * renderResolution)),
  height: Math.max(1, Math.round(window.innerHeight * renderResolution)),
});

const waitForSceneCreate = async (createdGame: PhaserType.Game): Promise<HuntingScene> => {
  const startedAt = performance.now();
  return new Promise<HuntingScene>((resolve, reject) => {
    const check = () => {
      const scene = createdGame.scene.getScene('hunting-ground') as HuntingScene | null;
      if (scene?.scene?.isActive()) {
        resolve(scene);
        return;
      }
      if (performance.now() - startedAt > 20_000) {
        reject(new Error('Game scene boot timed out'));
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
};

const ensureGame = (): Promise<HuntingScene> => {
  if (gameScene) return Promise.resolve(gameScene);
  if (gameBootPromise) return gameBootPromise;
  titleBoot?.classList.remove('is-ready');
  titleBoot?.setAttribute('aria-hidden', 'false');
  if (titleBoot) titleBoot.dataset.bootVisibleAt = String(performance.now());
  if (titleBootFill) titleBootFill.style.width = '6%';
  if (titleBootValue) titleBootValue.textContent = '6%';
  if (titleBootStatus) titleBootStatus.textContent = '고해상도 필드 엔진을 불러오는 중';

  gameBootPromise = Promise.all([import('phaser'), import('./game/phaser/HuntingScene')])
    .then(async ([phaserModule, sceneModule]) => {
      const Phaser = phaserModule.default;
      const initialSize = canvasSize();
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-canvas',
        width: initialSize.width,
        height: initialSize.height,
        backgroundColor: '#151711',
        fps: { target: 60, min: 30, smoothStep: true },
        render: {
          antialias: true,
          antialiasGL: true,
          pixelArt: false,
          transparent: false,
          clearBeforeRender: true,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
          autoMobilePipeline: true,
        },
        scale: {
          mode: Phaser.Scale.NONE,
          zoom: 1 / renderResolution,
          autoRound: true,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        input: { mouse: { preventDefaultWheel: true } },
        scene: [sceneModule.HuntingScene],
      });
      game.sound.mute = requestedMute;
      gameScene = await waitForSceneCreate(game);
      return gameScene;
    })
    .catch((error) => {
      gameBootPromise = null;
      titleBoot?.classList.add('is-ready');
      titleBoot?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('game-started');
      titleScreen?.removeAttribute('hidden');
      titleScreen?.classList.remove('is-leaving');
      titleScreen?.setAttribute('aria-hidden', 'false');
      throw error;
    });
  return gameBootPromise;
};

const openOnlineChat = async (name: string) => {
  firestoreChat?.disconnect();
  chatRoot?.removeAttribute('hidden');
  if (chatTitle) chatTitle.textContent = '채팅 불러오는 중';
  const { FirestoreChat } = await import('./game/online/FirestoreChat');
  firestoreChat = new FirestoreChat(name, (messages) => {
    if (!chatMessages) return;
    chatMessages.replaceChildren(...messages.map((message) => {
      const row = document.createElement('li');
      const author = document.createElement('b');
      author.textContent = message.name;
      row.append(author, document.createTextNode(message.message));
      return row;
    }));
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, (status) => {
    if (chatTitle) chatTitle.textContent = status;
  });
  firestoreChat.connect();
};

const closeOnlineCitadel = (): void => {
  onlineCitadel?.close();
  onlineCitadelRoot?.setAttribute('hidden', '');
  onlineCitadelRoot?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('online-citadel-open');
  titleScreen?.removeAttribute('hidden');
  titleScreen?.classList.remove('is-leaving');
  titleScreen?.setAttribute('aria-hidden', 'false');
};

const openOnlineCitadel = async (): Promise<void> => {
  if (!onlineCitadelRoot) return;
  const name = onlineName?.value || '김동혁';
  onlineLobby?.classList.remove('is-open');
  onlineLobby?.setAttribute('aria-hidden', 'true');
  setStoryRosterOpen(false);
  titleScreen?.classList.add('is-leaving');
  titleScreen?.setAttribute('aria-hidden', 'true');
  onlineCitadelRoot.removeAttribute('hidden');
  onlineCitadelRoot.setAttribute('aria-hidden', 'false');
  document.body.classList.add('online-citadel-open');
  if (!onlineCitadel) {
    const { OnlineCitadel } = await import('./game/online/OnlineCitadel');
    onlineCitadel = new OnlineCitadel({
      root: onlineCitadelRoot,
      multiplayerUrl,
      onExit: closeOnlineCitadel,
    });
  }
  await onlineCitadel.open(name);
};

const launchGame = async (mode: GameMode) => {
  const requestId = ++launchRequestId;
  const profile = CAMPAIGN_LAUNCH_PROFILE[mode];
  document.body.dataset.selectedOrigin = profile?.origin ?? (mode === 'travel' ? 'travel' : 'kim-donghyeok');
  document.body.dataset.launchState = 'booting';
  if (titleBootStatus && profile) titleBootStatus.textContent = `${profile.label}의 기록을 준비하는 중`;
  titleScreen?.querySelectorAll<HTMLButtonElement>('[data-title-action$="-new"], [data-title-action$="-continue"]')
    .forEach((button) => { button.disabled = true; });
  void mobilePwa.requestFullscreenForChrome();
  document.body.dataset.bootCampaign = profile?.campaign ?? (mode === 'travel' ? 'travel' : 'mainland');
  document.body.classList.add('game-started');
  titleScreen?.classList.add('is-leaving');
  titleScreen?.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => titleScreen?.setAttribute('hidden', ''), 720);
  let scene: HuntingScene;
  try {
    scene = await ensureGame();
  } catch (error) {
    if (requestId === launchRequestId) {
      document.body.dataset.launchState = 'failed';
      titleScreen?.querySelectorAll<HTMLButtonElement>('[data-title-action$="-new"], [data-title-action$="-continue"]')
        .forEach((button) => { button.disabled = false; });
      if (titleBootStatus) titleBootStatus.textContent = '불러오지 못했습니다 · 다시 시도해 주십시오';
    }
    console.error(error);
    return;
  }
  // Only the most recently chosen protagonist may start after Phaser has
  // finished booting. This makes character selection deterministic on slower
  // devices as well as during rapid taps.
  if (requestId !== launchRequestId) return;
  if (mode === 'kim-new') scene.startNewStoryMode();
  else if (mode === 'kim-continue') scene.startStoryMode();
  else if (mode === 'archer-new') scene.startFrontierArcherStory();
  else if (mode === 'archer-continue') scene.continueFrontierArcherStory();
  else if (mode === 'mudang-new') scene.startOsakaMudangStory();
  else if (mode === 'mudang-continue') scene.continueOsakaMudangStory();
  else if (mode === 'gwanghae-new') scene.startGwanghaeStory();
  else if (mode === 'gwanghae-continue') scene.continueGwanghaeStory();
  else if (mode === 'travel') scene.startTravelMode();
  else if (mode === 'online') {
    const name = onlineName?.value || '김동혁';
    scene.startOnlineMode(name, multiplayerUrl);
    void openOnlineChat(name);
  } else scene.startFreeHunt();
  document.body.dataset.launchState = 'ready';
};

chatForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!firestoreChat || !chatInput) return;
  chatInput.disabled = true;
  const sent = await firestoreChat.send(chatInput.value);
  if (sent) chatInput.value = '';
  chatInput.disabled = false;
  chatInput.focus();
});
chatInput?.addEventListener('focus', () => chatRoot?.classList.add('is-focused'));
chatInput?.addEventListener('blur', () => chatRoot?.classList.remove('is-focused'));
chatRoot?.querySelector('[data-chat-toggle]')?.addEventListener('click', () => {
  const collapsed = chatRoot.classList.toggle('is-collapsed');
  const button = chatRoot.querySelector<HTMLButtonElement>('[data-chat-toggle]');
  if (button) {
    button.textContent = collapsed ? '+' : '−';
    button.setAttribute('aria-label', collapsed ? '채팅 펼치기' : '채팅 접기');
  }
});

if (directPlaytest) {
  document.body.classList.add('game-started');
  titleScreen?.setAttribute('hidden', '');
  void launchGame(directGwanghaePrince
    ? 'gwanghae-new'
    : directOsakaMudang ? 'mudang-new' : directFrontierArcher ? 'archer-new' : 'hunt');
}

titleScreen?.addEventListener('click', (event) => {
  const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-title-action]')?.dataset.titleAction;
  if (action === 'story') {
    const open = !storyRoster?.classList.contains('is-open');
    setStoryRosterOpen(open);
    onlineLobby?.classList.remove('is-open');
    onlineLobby?.setAttribute('aria-hidden', 'true');
    settingsPanel?.classList.remove('is-open');
    settingsPanel?.setAttribute('aria-hidden', 'true');
  }
  if (action === 'story-cancel') setStoryRosterOpen(false);
  if (action === 'kim-new' || action === 'kim-continue' || action === 'archer-new' || action === 'archer-continue'
    || action === 'mudang-new' || action === 'mudang-continue'
    || action === 'gwanghae-new' || action === 'gwanghae-continue' || action === 'travel') {
    void launchGame(action);
  }
  if (action === 'online') {
    const open = !onlineLobby?.classList.contains('is-open');
    onlineLobby?.classList.toggle('is-open', open);
    onlineLobby?.setAttribute('aria-hidden', String(!open));
    setStoryRosterOpen(false);
    settingsPanel?.classList.remove('is-open');
    window.setTimeout(() => onlineName?.focus(), 60);
  }
  if (action === 'online-connect') void openOnlineCitadel();
  if (action === 'online-cancel') {
    onlineLobby?.classList.remove('is-open');
    onlineLobby?.setAttribute('aria-hidden', 'true');
  }
  if (action === 'settings') {
    const open = !settingsPanel?.classList.contains('is-open');
    settingsPanel?.classList.toggle('is-open', open);
    settingsPanel?.setAttribute('aria-hidden', String(!open));
    titleScreen.querySelector('[data-title-action="settings"]')?.setAttribute('aria-expanded', String(open));
    if (open) setStoryRosterOpen(false);
  }
  if (action === 'mute') {
    requestedMute = !requestedMute;
    if (game) game.sound.mute = requestedMute;
    const label = titleScreen.querySelector<HTMLElement>('[data-title-action="mute"] b');
    if (label) label.textContent = requestedMute ? '꺼짐' : '켜짐';
  }
  if (action === 'fullscreen') {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }
  if (action === 'install') void mobilePwa.install();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !onlineCitadelRoot?.hidden) closeOnlineCitadel();
});

window.addEventListener('resize', () => {
  if (!game) return;
  const nextSize = canvasSize();
  game.scale.resize(nextSize.width, nextSize.height);
});
