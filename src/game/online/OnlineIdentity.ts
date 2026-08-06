import type { Auth } from 'firebase/auth';
import { auth, ensureAnonymousAuth } from '../../firebase';

const SESSION_ID_KEY = 'asra-online-session-v1';

export type OnlineIdentity = {
  uid: string;
  source: 'firebase' | 'local-demo';
};

const randomSessionId = (): string => {
  const suffix = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `demo-${suffix}`.slice(0, 64);
};

export const getLocalOnlineIdentity = (storage: Storage = sessionStorage): OnlineIdentity => {
  const existing = storage.getItem(SESSION_ID_KEY);
  if (existing && /^demo-[A-Za-z0-9-]{8,59}$/.test(existing)) {
    return { uid: existing, source: 'local-demo' };
  }
  const uid = randomSessionId();
  storage.setItem(SESSION_ID_KEY, uid);
  return { uid, source: 'local-demo' };
};

export const ensureOnlineIdentity = async (
  firebaseAuth: Auth = auth,
  storage: Storage = sessionStorage,
): Promise<OnlineIdentity> => {
  try {
    const user = await ensureAnonymousAuth(firebaseAuth);
    return { uid: user.uid, source: 'firebase' };
  } catch {
    // The local identity intentionally routes marketplace writes to its isolated
    // demo repository. It is never treated as a trusted Firestore account.
    return getLocalOnlineIdentity(storage);
  }
};
