import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeUser = { uid: string };
type FakeAuth = { currentUser: FakeUser | null };

const firebase = vi.hoisted(() => ({
  auth: { currentUser: null } as FakeAuth,
  setPersistence: vi.fn(),
  signInAnonymously: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ name: 'app' })) }));
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({ name: 'db' })) }));
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: { type: 'LOCAL' },
  getAuth: vi.fn(() => firebase.auth),
  setPersistence: firebase.setPersistence,
  signInAnonymously: firebase.signInAnonymously,
}));

import { ensureAnonymousAuth } from './firebase';

describe('global anonymous Firebase authentication', () => {
  beforeEach(() => {
    firebase.auth.currentUser = null;
    firebase.setPersistence.mockReset();
    firebase.signInAnonymously.mockReset();
    firebase.setPersistence.mockResolvedValue(undefined);
  });

  it('deduplicates concurrent sign-in attempts and keeps local persistence', async () => {
    let complete!: () => void;
    const gate = new Promise<void>((resolve) => { complete = resolve; });
    const user = { uid: 'anonymous-user-1' };
    firebase.signInAnonymously.mockImplementation(async () => {
      await gate;
      firebase.auth.currentUser = user;
      return { user };
    });

    const first = ensureAnonymousAuth(firebase.auth as never);
    const second = ensureAnonymousAuth(firebase.auth as never);
    expect(second).toBe(first);
    complete();

    await expect(first).resolves.toBe(user);
    expect(firebase.setPersistence).toHaveBeenCalledTimes(1);
    expect(firebase.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('returns the current user without starting another authentication request', async () => {
    const user = { uid: 'already-signed-in' };
    firebase.auth.currentUser = user;

    await expect(ensureAnonymousAuth(firebase.auth as never)).resolves.toBe(user);
    expect(firebase.setPersistence).not.toHaveBeenCalled();
    expect(firebase.signInAnonymously).not.toHaveBeenCalled();
  });

  it('drops a failed cached attempt so a later call can retry', async () => {
    const user = { uid: 'anonymous-user-retry' };
    firebase.signInAnonymously
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockImplementationOnce(async () => {
        firebase.auth.currentUser = user;
        return { user };
      });

    await expect(ensureAnonymousAuth(firebase.auth as never)).rejects.toThrow('network unavailable');
    await expect(ensureAnonymousAuth(firebase.auth as never)).resolves.toBe(user);
    expect(firebase.signInAnonymously).toHaveBeenCalledTimes(2);
  });
});
