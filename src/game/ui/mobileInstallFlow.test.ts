import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectMobileBrowser } from '../../mobilePwa';

describe('mobile Chrome and PWA flow', () => {
  it('distinguishes Chrome mobile from other Chromium mobile browsers', () => {
    const chrome = detectMobileBrowser({
      userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    }, true, false);
    const samsung = detectMobileBrowser({
      userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    }, true, false);
    expect(chrome).toMatchObject({ isMobile: true, isChrome: true, isAndroid: true });
    expect(samsung).toMatchObject({ isMobile: true, isChrome: false, isAndroid: true });
  });

  it('does not show mobile guidance to ordinary desktop Chrome', () => {
    const desktop = detectMobileBrowser({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    }, false, false);
    expect(desktop.isMobile).toBe(false);
    expect(desktop.isChrome).toBe(false);
  });

  it('ships a fullscreen install manifest, service worker and required icons', () => {
    const html = readFileSync('index.html', 'utf8');
    const mobilePwa = readFileSync('src/mobilePwa.ts', 'utf8');
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
      display: string;
      icons: Array<{ src: string; sizes: string }>;
    };
    const worker = readFileSync('public/sw.js', 'utf8');
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('id="mobile-experience"');
    expect(manifest.display).toBe('fullscreen');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
    expect(worker).toContain("self.addEventListener('fetch'");
    expect(worker).toContain("const CACHE_NAME = 'asra-shell-v4'");
    expect(worker).toContain("'/assets/ui/beta/beta-campaign-keyart-v1.webp'");
    expect(worker).toContain("url.pathname.startsWith('/guide') ? '/guide/' : '/'");
    expect(worker).toContain("fetch(request, { cache: 'no-store' })");
    expect(worker).toContain('cache.put(fallbackPath, copy)');
    expect(mobilePwa).toContain("dataset.pwaWorker = 'registered'");
    for (const icon of manifest.icons) expect(existsSync(`public${icon.src}`)).toBe(true);
  });
});
