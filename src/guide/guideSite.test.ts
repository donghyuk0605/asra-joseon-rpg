import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('official guide site', () => {
  const html = readFileSync('guide/index.html', 'utf8');
  const main = readFileSync('src/guide/main.ts', 'utf8');
  const styles = readFileSync('src/guide/styles.css', 'utf8');
  const vite = readFileSync('vite.config.js', 'utf8');
  const gameIndex = readFileSync('index.html', 'utf8');
  const prune = readFileSync('scripts/prune_dist_assets.mjs', 'utf8');
  const firestoreRules = readFileSync('firestore.rules', 'utf8');
  const firebaseConfig = readFileSync('firebase.json', 'utf8');
  const firebaseTargets = readFileSync('.firebaserc', 'utf8');

  it('builds the game and guide as discoverable independent pages', () => {
    expect(vite).toContain("guide: 'guide/index.html'");
    expect(gameIndex).toContain('href="/guide/"');
    expect(html).toContain('src="/src/guide/main.ts"');
    expect(prune).toContain("path.endsWith('.html')");
    expect(firebaseConfig).toContain('"target": "guide"');
    expect(firebaseConfig).toContain('"public": "guide-dist"');
    expect(firebaseTargets).toContain('"haze-479ed-guide"');
  });

  it('introduces the actual four protagonists and playable world systems', () => {
    for (const name of ['김동혁', '하진', '연화', '왕세자 광해']) {
      expect(html).toContain(name);
    }
    expect(html).toContain('지상 52개 지역');
    expect(html).toContain('100층');
    expect(html).toContain('유령 여행 모드');
    expect(html).toContain('전투와 기록 없이');
  });

  it('uses existing production art instead of placeholder geometry', () => {
    const referencedAssets = [
      'public/assets/ui/asra-title-keyart-v1.webp',
      'public/assets/ui/asra-title-keyart-mobile-v1.webp',
      'public/assets/ui/joseon-regional-world-map-v1.webp',
      'public/assets/environment/campaign/osaka-outer-harbor-v1.webp',
      'public/assets/environment/muyeong-dungeon-base-v1.webp',
    ];
    referencedAssets.forEach((path) => expect(existsSync(path), path).toBe(true));
  });

  it('provides a shared board surface with filtering, search, detail and posting', () => {
    expect(html).toContain('data-board-filter="strategy"');
    expect(html).toContain('data-board-search');
    expect(html).toContain('data-compose-form');
    expect(html).toContain('data-post-dialog');
    expect(main).toContain('subscribeGuidePosts(');
    expect(main).toContain('createGuidePost({');
    expect(firestoreRules).toContain('match /guide_posts/{postId}');
    expect(firestoreRules).toContain('request.resource.data.schemaVersion == 2');
    expect(firestoreRules).toContain('validGuideAuthorId(request.resource.data.authorId)');
    expect(firestoreRules).toContain('validGuideProfile(request.resource.data.profile)');
    expect(firestoreRules).toContain("request.resource.data.category in ['general', 'question', 'strategy', 'party']");
    expect(firestoreRules).toContain('match /comments/{commentId}');
    expect(firestoreRules).toContain(
      'exists(/databases/$(database)/documents/guide_posts/$(postId))',
    );
    expect(firestoreRules).toContain('request.resource.data.schemaVersion == 1');
    expect(firestoreRules).toContain('request.resource.data.createdAt == request.time');
    expect(firestoreRules).toContain('allow update, delete: if false;');
  });

  it('contains dedicated mobile navigation and board layout rules', () => {
    expect(styles).toContain('@media (max-width: 580px)');
    expect(styles).toContain('.site-nav.is-open');
    expect(styles).toContain('.board-filters');
    expect(styles).toContain('safe-area-inset-bottom');
  });
});
