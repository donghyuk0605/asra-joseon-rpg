import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0suy93neUfrJmj72tNDQxBUqvap_oeic",
  authDomain: "haze-479ed.firebaseapp.com",
  projectId: "haze-479ed",
  storageBucket: "haze-479ed.firebasestorage.app",
  messagingSenderId: "41005434075",
  appId: "1:41005434075:web:46c734146f22638c5878fe",
  measurementId: "G-BKXJ0JB160",
  databaseURL: "https://haze-83cb5-default-rtdb.firebaseio.com",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

type AnonymousAuthAttempt = {
  promise: Promise<User>;
  settled: boolean;
};

const anonymousAuthAttempts = new WeakMap<Auth, AnonymousAuthAttempt>();

/**
 * Establishes one persistent anonymous Firebase identity for every shared Auth
 * instance. Concurrent callers reuse the same in-flight request; a rejected or
 * signed-out session can try again without keeping a stale user promise.
 */
export const ensureAnonymousAuth = (firebaseAuth: Auth = auth): Promise<User> => {
  if (firebaseAuth.currentUser) return Promise.resolve(firebaseAuth.currentUser);
  const cached = anonymousAuthAttempts.get(firebaseAuth);
  if (cached && !cached.settled) return cached.promise;
  if (cached?.settled) anonymousAuthAttempts.delete(firebaseAuth);

  const promise = (async () => {
    await setPersistence(firebaseAuth, browserLocalPersistence);
    if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
    return (await signInAnonymously(firebaseAuth)).user;
  })();
  const attempt: AnonymousAuthAttempt = { promise, settled: false };
  anonymousAuthAttempts.set(firebaseAuth, attempt);
  void attempt.promise.then(
    () => { attempt.settled = true; },
    () => {
      if (anonymousAuthAttempts.get(firebaseAuth) === attempt) {
        anonymousAuthAttempts.delete(firebaseAuth);
      }
    },
  );
  return attempt.promise;
};

export const analyticsReady = isSupported()
  .then((supported) => supported ? getAnalytics(app) : null)
  .catch(() => null);
