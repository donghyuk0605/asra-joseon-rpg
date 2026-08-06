import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreChat } from './FirestoreChat';

const firebase = vi.hoisted(() => ({ ensureAnonymousAuth: vi.fn() }));
const firestore = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  db: { name: 'chat-test-db' },
  ensureAnonymousAuth: firebase.ensureAnonymousAuth,
}));
vi.mock('firebase/firestore', () => ({
  addDoc: firestore.addDoc,
  collection: firestore.collection,
  limit: firestore.limit,
  onSnapshot: firestore.onSnapshot,
  orderBy: firestore.orderBy,
  query: firestore.query,
  serverTimestamp: firestore.serverTimestamp,
}));

describe('Firestore online chat', () => {
  const html = readFileSync('index.html', 'utf8');
  const main = readFileSync('src/main.ts', 'utf8');
  const chat = readFileSync('src/game/online/FirestoreChat.ts', 'utf8');

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.ensureAnonymousAuth.mockResolvedValue({ uid: 'anonymous-chat-user' });
    firestore.collection.mockReturnValue({ name: 'online_chat' });
    firestore.serverTimestamp.mockReturnValue({ __serverTimestamp: true });
    firestore.addDoc.mockResolvedValue({ id: 'chat-1' });
  });

  it('provides a compact in-game chat surface and live Firestore subscription', () => {
    expect(html).toContain('id="online-chat"');
    expect(html).toContain('data-chat-form');
    expect(main).toContain('new FirestoreChat(');
    expect(chat).toContain("collection(db, 'online_chat')");
    expect(chat).toContain('onSnapshot(');
    expect(chat).toContain('await ensureAnonymousAuth()');
    expect(chat).toContain('serverTimestamp()');
  });

  it('authenticates before writing and preserves the existing failure status', async () => {
    const onStatus = vi.fn();
    const instance = new FirestoreChat('연화', vi.fn(), onStatus);

    await expect(instance.send('  결투장에서 만나요  ')).resolves.toBe(true);
    expect(firebase.ensureAnonymousAuth.mock.invocationCallOrder[0])
      .toBeLessThan(firestore.addDoc.mock.invocationCallOrder[0]);
    expect(firestore.addDoc).toHaveBeenCalledWith(
      { name: 'online_chat' },
      {
        name: '연화',
        message: '결투장에서 만나요',
        createdAt: { __serverTimestamp: true },
      },
    );

    vi.clearAllMocks();
    firebase.ensureAnonymousAuth.mockRejectedValueOnce(new Error('auth unavailable'));
    await expect(instance.send('인증 없는 메시지')).resolves.toBe(false);
    expect(firestore.addDoc).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith('메시지를 보내지 못했습니다');
  });
});
