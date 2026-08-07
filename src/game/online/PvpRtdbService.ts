/**
 * PvP Field Service
 *
 * - 방 관리 (생성/목록/참가/퇴장): Firestore  pvp-rooms/{roomId}
 * - 실시간 위치 동기화:            RTDB        pvp/{roomId}/pos/{uid}
 *
 * 별도 서버 없이 Firebase만으로 동작합니다.
 */

import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  deleteDoc, serverTimestamp, query, where, limit, getDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  ref, set, onValue, remove, onDisconnect,
  type Database,
} from 'firebase/database';

export type PvpFighterId = 'donghyeok' | 'hajin' | 'yeonhwa' | 'gwanghae';

export type PvpRoomInfo = {
  id: string;
  name: string;
  hostUid: string;
  hostName: string;
  hostFighterId: PvpFighterId;
  guestUid: string | null;
  guestName: string | null;
  guestFighterId: PvpFighterId | null;
  createdAt: number;
};

export type PvpPosition = {
  x: number;
  y: number;
  facing: number;
  moving: boolean;
  ts: number;
};

const ROOMS_COLLECTION = 'pvp-rooms';
const MAX_ROOMS = 30;

export class PvpRtdbService {
  private unsubscribeRooms: (() => void) | null = null;
  private unsubscribeOpponent: (() => void) | null = null;
  private currentRoomId = '';
  private currentUid = '';

  constructor(
    private readonly db: Firestore,
    private readonly rtdb: Database,
  ) {}

  // ------------------------------------------------------------------
  // 방 관리 (Firestore)
  // ------------------------------------------------------------------

  /** 방 목록 실시간 구독. 언구독 함수를 반환합니다. */
  subscribeRooms(callback: (rooms: PvpRoomInfo[]) => void): () => void {
    if (this.unsubscribeRooms) this.unsubscribeRooms();
    const q = query(
      collection(this.db, ROOMS_COLLECTION),
      where('guestUid', '==', null),
      limit(MAX_ROOMS),
    );
    this.unsubscribeRooms = onSnapshot(q, (snapshot) => {
      const rooms: PvpRoomInfo[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PvpRoomInfo, 'id'>),
      }));
      callback(rooms);
    }, () => callback([]));
    return () => {
      this.unsubscribeRooms?.();
      this.unsubscribeRooms = null;
    };
  }

  /** 방을 만들고 roomId를 반환합니다. */
  async createRoom(
    roomName: string,
    uid: string,
    playerName: string,
    fighterId: PvpFighterId,
  ): Promise<string> {
    const roomRef = doc(collection(this.db, ROOMS_COLLECTION));
    const roomData: Omit<PvpRoomInfo, 'id'> = {
      name: roomName.slice(0, 20) || '이름 없는 전장',
      hostUid: uid,
      hostName: playerName,
      hostFighterId: fighterId,
      guestUid: null,
      guestName: null,
      guestFighterId: null,
      createdAt: Date.now(),
    };
    await setDoc(roomRef, { ...roomData, createdAt: serverTimestamp() });
    this.currentRoomId = roomRef.id;
    this.currentUid = uid;
    return roomRef.id;
  }

  /**
   * 방에 참가합니다. 성공 시 방 정보를 반환합니다.
   * 이미 가득 찼으면 null을 반환합니다.
   */
  async joinRoom(
    roomId: string,
    uid: string,
    playerName: string,
    fighterId: PvpFighterId,
  ): Promise<PvpRoomInfo | null> {
    const roomRef = doc(this.db, ROOMS_COLLECTION, roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<PvpRoomInfo, 'id'>;
    if (data.guestUid !== null) return null; // 이미 가득 참
    if (data.hostUid === uid) return null; // 자신의 방
    await updateDoc(roomRef, {
      guestUid: uid,
      guestName: playerName,
      guestFighterId: fighterId,
    });
    this.currentRoomId = roomId;
    this.currentUid = uid;
    return { id: roomId, ...data, guestUid: uid, guestName: playerName, guestFighterId: fighterId };
  }

  /** 방을 나갑니다 (호스트면 방 삭제, 게스트면 게스트 필드 초기화). */
  async leaveRoom(roomId: string, uid: string): Promise<void> {
    const roomRef = doc(this.db, ROOMS_COLLECTION, roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const data = snap.data() as Omit<PvpRoomInfo, 'id'>;
    if (data.hostUid === uid) {
      await deleteDoc(roomRef);
    } else {
      await updateDoc(roomRef, { guestUid: null, guestName: null, guestFighterId: null });
    }
    // RTDB 위치 정리
    await this.clearPosition(roomId, uid);
    if (this.currentRoomId === roomId) {
      this.currentRoomId = '';
      this.currentUid = '';
    }
  }

  // ------------------------------------------------------------------
  // 실시간 위치 동기화 (RTDB)
  // ------------------------------------------------------------------

  /**
   * 내 위치를 RTDB에 씁니다. 연결이 끊기면 자동으로 삭제됩니다.
   */
  publishPosition(roomId: string, uid: string, x: number, y: number, facing: number, moving: boolean): void {
    const posRef = ref(this.rtdb, `pvp/${roomId}/pos/${uid}`);
    const data: PvpPosition = { x, y, facing, moving, ts: Date.now() };
    // 비동기 set — 에러 무시 (위치는 best-effort)
    set(posRef, data).catch(() => undefined);
  }

  /**
   * 내 위치를 처음 쓸 때 onDisconnect 훅을 등록하여
   * 연결이 끊기면 자동으로 RTDB에서 지웁니다.
   */
  async registerPosition(roomId: string, uid: string): Promise<void> {
    const posRef = ref(this.rtdb, `pvp/${roomId}/pos/${uid}`);
    await onDisconnect(posRef).remove();
  }

  /**
   * 상대방 위치를 구독합니다. 언구독 함수를 반환합니다.
   */
  subscribeOpponentPosition(
    roomId: string,
    opponentUid: string,
    callback: (pos: PvpPosition | null) => void,
  ): () => void {
    if (this.unsubscribeOpponent) this.unsubscribeOpponent();
    const posRef = ref(this.rtdb, `pvp/${roomId}/pos/${opponentUid}`);
    const unsubscribe = onValue(posRef, (snap) => {
      callback(snap.exists() ? (snap.val() as PvpPosition) : null);
    });
    this.unsubscribeOpponent = unsubscribe;
    return () => {
      this.unsubscribeOpponent?.();
      this.unsubscribeOpponent = null;
    };
  }

  /** 특정 플레이어의 RTDB 위치 데이터를 삭제합니다. */
  async clearPosition(roomId: string, uid: string): Promise<void> {
    await remove(ref(this.rtdb, `pvp/${roomId}/pos/${uid}`)).catch(() => undefined);
  }

  /** 방 전체 RTDB 데이터를 삭제합니다 (호스트가 방을 삭제할 때). */
  async clearRoom(roomId: string): Promise<void> {
    await remove(ref(this.rtdb, `pvp/${roomId}`)).catch(() => undefined);
  }

  /** 모든 구독을 해제합니다. */
  destroy(): void {
    this.unsubscribeRooms?.();
    this.unsubscribeOpponent?.();
    this.unsubscribeRooms = null;
    this.unsubscribeOpponent = null;
  }
}
