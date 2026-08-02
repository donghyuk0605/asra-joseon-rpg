import type { RegionId } from '../world/regions';

export interface PlayerNetworkData {
  id: string;
  x: number;
  y: number;
  facing: number;
  region: RegionId;
  weaponEquipped: boolean;
  armorEquipped: boolean;
  isMoving: boolean;
}

export class NetworkManager {
  private socket: WebSocket | null = null;
  private readonly playerId: string;
  private otherPlayers = new Map<string, PlayerNetworkData>();
  private onPlayersUpdate: (players: Map<string, PlayerNetworkData>) => void;

  constructor(onPlayersUpdate: (players: Map<string, PlayerNetworkData>) => void) {
    this.playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    this.onPlayersUpdate = onPlayersUpdate;
    this.connect();
  }

  private connect(): void {
    const urlParams = new URLSearchParams(window.location.search);
    let serverIp = urlParams.get('server');

    if (!serverIp && typeof window !== 'undefined') {
      serverIp = window.prompt(
        'GCP VM 외부 IP를 입력해주세요 (입력하지 않으면 데모 모드로 작동합니다):\n예: 34.64.123.45'
      );
    }

    if (!serverIp) {
      console.warn('⚠️ 서버 IP가 제공되지 않아 데모 모드로 구동됩니다. 멀티플레이가 불가능합니다.');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      this.socket = new WebSocket(`${protocol}://${serverIp}:3000`);

      this.socket.onopen = () => {
        console.log('✅ 게임 소켓 서버 연결 성공!');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.id && data.id !== this.playerId) {
            this.otherPlayers.set(data.id, data);
            this.onPlayersUpdate(new Map(this.otherPlayers));
          }
        } catch (e) {
          // Ignore invalid messages
        }
      };

      this.socket.onclose = () => {
        console.log('❌ 게임 소켓 서버 연결 종료. 5초 후 재연결 시도...');
        setTimeout(() => this.connect(), 5000);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
    }
  }

  public sendState(x: number, y: number, facing: number, region: RegionId, weaponEquipped: boolean, armorEquipped: boolean, isMoving: boolean): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const data: PlayerNetworkData = {
      id: this.playerId,
      x,
      y,
      facing,
      region,
      weaponEquipped,
      armorEquipped,
      isMoving,
    };

    this.socket.send(JSON.stringify(data));
  }
}
