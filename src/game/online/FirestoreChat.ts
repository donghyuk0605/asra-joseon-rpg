import {
  addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../../firebase';
import { sanitizeOnlineName } from './protocol';

type ChatEntry = { id: string; name: string; message: string };

const cleanMessage = (value: string): string =>
  value.normalize('NFKC').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);

export class FirestoreChat {
  private unsubscribe: Unsubscribe | null = null;
  private readonly name: string;

  constructor(
    name: string,
    private readonly onMessages: (messages: ChatEntry[]) => void,
    private readonly onStatus: (message: string) => void,
  ) {
    this.name = sanitizeOnlineName(name);
  }

  connect(): void {
    this.disconnect();
    const messages = query(collection(db, 'online_chat'), orderBy('createdAt', 'desc'), limit(30));
    this.unsubscribe = onSnapshot(messages, (snapshot) => {
      this.onMessages(snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          name: sanitizeOnlineName(String(data.name || '떠돌이')),
          message: cleanMessage(String(data.message || '')),
        };
      }).filter((entry) => entry.message).reverse());
      this.onStatus('울릉 사냥 채널');
    }, () => this.onStatus('채팅 연결을 확인해 주세요'));
  }

  async send(value: string): Promise<boolean> {
    const message = cleanMessage(value);
    if (!message) return false;
    try {
      await ensureAnonymousAuth();
      await addDoc(collection(db, 'online_chat'), {
        name: this.name,
        message,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch {
      this.onStatus('메시지를 보내지 못했습니다');
      return false;
    }
  }

  disconnect(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
