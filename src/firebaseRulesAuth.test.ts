import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const section = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return source.slice(from, to < 0 ? source.length : to);
};

describe('Firestore anonymous-auth boundary', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  it('keeps community reads public but requires authentication for creates', () => {
    const chat = section(rules, 'match /online_chat/{messageId}', 'match /guide_posts/{postId}');
    const posts = section(rules, 'match /guide_posts/{postId}', 'match /marketplace_offers/{offerId}');

    expect(chat).toContain('allow read: if true');
    expect(chat).toContain('allow create: if signedIn()');
    expect(posts.match(/allow read: if true/g)).toHaveLength(2);
    expect(posts.match(/allow create: if signedIn\(\)/g)).toHaveLength(2);
  });

  it('requires authentication for every single-save cloud read and write', () => {
    const saves = section(rules, 'match /single_saves/{deviceId}', '\n    }\n  }');

    expect(saves).toContain('allow read: if signedIn()');
    expect(saves).toContain('allow create, update: if signedIn()');
    expect(saves).toContain('allow delete: if false');
  });

  it('authenticates at every client write boundary', () => {
    const chat = readFileSync('src/game/online/FirestoreChat.ts', 'utf8');
    const guide = readFileSync('src/guide/GuideBoard.ts', 'utf8');
    const save = readFileSync('src/game/save/SinglePlayerSave.ts', 'utf8');

    expect(chat).toContain('await ensureAnonymousAuth()');
    expect(guide.match(/await ensureAnonymousAuth\(\)/g)).toHaveLength(2);
    expect(save.match(/ensureAnonymousAuth\(\)/g)).toHaveLength(2);
    expect(save).toContain("issue('cloud-auth-failed', 'cloud', error)");
  });
});
