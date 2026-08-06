export type MobileBrowserProfile = {
  isMobile: boolean;
  isChrome: boolean;
  isAndroid: boolean;
  isIos: boolean;
  isStandalone: boolean;
};

type NavigatorProfile = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type MobilePwaController = {
  profile: MobileBrowserProfile;
  install: () => Promise<void>;
  requestFullscreenForChrome: () => Promise<void>;
};

export const detectMobileBrowser = (
  navigatorProfile: NavigatorProfile,
  coarsePointer: boolean,
  standalone: boolean,
): MobileBrowserProfile => {
  const userAgent = navigatorProfile.userAgent;
  const iPadDesktopMode = navigatorProfile.platform === 'MacIntel'
    && (navigatorProfile.maxTouchPoints ?? 0) > 1;
  const isAndroid = /Android/i.test(userAgent);
  const isIos = /iPhone|iPad|iPod/i.test(userAgent) || iPadDesktopMode;
  const isMobile = isAndroid || isIos || coarsePointer;
  const chromiumToken = /(?:Chrome|CriOS)\/[\d.]+/i.test(userAgent);
  const alternateChromium = /EdgA|EdgiOS|OPR|SamsungBrowser|DuckDuckGo|YaBrowser/i.test(userAgent);
  return {
    isMobile,
    isChrome: isMobile && chromiumToken && !alternateChromium,
    isAndroid,
    isIos,
    isStandalone: standalone,
  };
};

const copyCurrentAddress = async (): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
};

export const setupMobilePwaExperience = (): MobilePwaController => {
  const qaMode = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('browserqa')
    : null;
  const qaNavigator: NavigatorProfile | null = qaMode === 'chrome'
    ? {
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }
    : qaMode === 'other'
      ? {
          userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/26.0 Mobile Safari/537.36',
          platform: 'Linux armv8l',
          maxTouchPoints: 5,
        }
      : null;
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const profile = detectMobileBrowser(
    qaNavigator ?? navigator,
    qaNavigator ? true : window.matchMedia('(pointer: coarse)').matches,
    standalone,
  );
  const root = document.querySelector<HTMLElement>('#mobile-experience');
  const title = root?.querySelector<HTMLElement>('[data-mobile-title]');
  const message = root?.querySelector<HTMLElement>('[data-mobile-message]');
  const copyButton = root?.querySelector<HTMLButtonElement>('[data-mobile-action="copy"]');
  const fullscreenButton = root?.querySelector<HTMLButtonElement>('[data-mobile-action="fullscreen"]');
  const installButtons = [
    root?.querySelector<HTMLButtonElement>('[data-mobile-action="install"]'),
    document.querySelector<HTMLButtonElement>('[data-title-action="install"]'),
  ].filter((button): button is HTMLButtonElement => Boolean(button));
  let installPrompt: BeforeInstallPromptEvent | null = null;

  const setMessage = (value: string) => {
    if (message) message.textContent = value;
  };
  const hideGuide = () => {
    root?.setAttribute('hidden', '');
    if (!qaMode) sessionStorage.setItem('asra-mobile-guide-dismissed', '1');
  };
  const updateInstallButtons = (ready: boolean) => {
    for (const button of installButtons) {
      button.hidden = !profile.isChrome || profile.isStandalone;
      button.classList.toggle('is-ready', ready);
      button.textContent = ready ? '아스라 앱 설치' : 'PWA 설치 안내';
    }
  };

  const requestFullscreenForChrome = async () => {
    if (!profile.isChrome || profile.isStandalone || document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      setMessage('전체화면이 차단되면 Chrome 메뉴의 전체화면을 눌러주세요.');
    }
  };

  const install = async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        setMessage('설치가 시작됐습니다. 홈 화면의 아스라 아이콘으로 실행하세요.');
      } else {
        setMessage('나중에 Chrome 메뉴에서 다시 설치할 수 있습니다.');
      }
      updateInstallButtons(false);
      return;
    }
    setMessage(profile.isIos
      ? 'Chrome 공유 메뉴에서 “홈 화면에 추가”를 선택하면 전체화면 앱으로 실행됩니다.'
      : 'Chrome 오른쪽 위 ⋮ 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택하세요.');
  };

  if (root && profile.isMobile && !profile.isStandalone) {
    const dismissed = !qaMode && sessionStorage.getItem('asra-mobile-guide-dismissed') === '1';
    root.toggleAttribute('hidden', dismissed);
    root.classList.toggle('is-chrome', profile.isChrome);
    root.classList.toggle('is-other-browser', !profile.isChrome);
    document.body.classList.toggle('mobile-chrome', profile.isChrome);
    document.body.classList.toggle('mobile-other-browser', !profile.isChrome);
    if (profile.isChrome) {
      if (title) title.textContent = 'Chrome 전체화면 플레이';
      setMessage('게임을 시작하면 전체화면으로 전환됩니다. 설치하면 홈 화면에서 바로 실행됩니다.');
      if (fullscreenButton) fullscreenButton.hidden = false;
      updateInstallButtons(false);
    } else {
      if (title) title.textContent = 'Chrome으로 열면 더 편합니다';
      setMessage('현재 주소를 Chrome에서 열면 전체화면과 PWA 설치를 사용할 수 있습니다.');
      if (copyButton) copyButton.hidden = false;
      updateInstallButtons(false);
    }
  } else {
    root?.setAttribute('hidden', '');
  }

  root?.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).closest<HTMLElement>('[data-mobile-action]')?.dataset.mobileAction;
    if (action === 'dismiss') hideGuide();
    if (action === 'fullscreen') void requestFullscreenForChrome();
    if (action === 'install') void install();
    if (action === 'copy') {
      void copyCurrentAddress().then((copied) => {
        if (copyButton) copyButton.textContent = copied ? '주소 복사 완료' : '주소를 길게 눌러 복사';
        setMessage(copied
          ? 'Chrome 주소창에 붙여넣으면 전체화면과 앱 설치를 사용할 수 있습니다.'
          : '브라우저 주소창의 현재 주소를 복사해 Chrome에서 열어주세요.');
      });
    }
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    if (!profile.isMobile || !profile.isChrome || profile.isStandalone) return;
    event.preventDefault();
    installPrompt = event as BeforeInstallPromptEvent;
    updateInstallButtons(true);
    setMessage('아스라를 설치할 수 있습니다. 홈 화면에서 전체화면으로 바로 시작됩니다.');
    root?.removeAttribute('hidden');
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    root?.setAttribute('hidden', '');
    updateInstallButtons(false);
  });

  if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js')
        .then(() => {
          document.documentElement.dataset.pwaWorker = 'registered';
        })
        .catch(() => {
          document.documentElement.dataset.pwaWorker = 'unavailable';
        });
    }, { once: true });
  }

  return { profile, install, requestFullscreenForChrome };
};
