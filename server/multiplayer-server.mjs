import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createDuelEngine, parseClientOnlineMessage } from './duel-engine.mjs';

const PORT = Number(process.env.PORT || 3000);
const players = new Map();
const clients = new Map();
const socketsById = new Map();
const VALID_REGIONS = new Set([
  'solgogae', 'village', 'mistwood', 'yeongwol', 'yeongwolhq',
  'jeonjufield', 'jeonjugate', 'jeonju', 'minepass', 'moonfield', 'dungeon',
  'osaka', 'settsuvillage', 'yamazakihunt', 'osakacastle', 'shogunkeep',
  'busanjin', 'tangeumdae', 'gyeongbokgate', 'gyeongbokcourt', 'gyeongbokinner',
  'jurchenvillage', 'manchufrontier', 'pyongyangouter', 'pyongyanggate', 'pyongyanginner',
  'ulleungcoast', 'ulleungmeadow', 'ulleunghunt', 'ulleungridge', 'ulleungdo', 'ulleungvillage',
  'pvp-arena',
]);

const VALID_FIGHTER_IDS = new Set(['donghyeok', 'hajin', 'yeonhwa', 'gwanghae']);
const MAX_ROOM_NAME_LENGTH = 20;
const MAX_PVP_ROOMS = 30;

// pvpRooms: Map<roomId, { id, name, hostId, hostName, hostFighterId, guestId|null, guestName|null, guestFighterId|null }>
const pvpRooms = new Map();
// playerPvpRoom: Map<playerId, roomId>
const playerPvpRoom = new Map();

const cleanName = (value) => {
  const normalized = String(value || '').normalize('NFKC').replace(/[^\p{L}\p{N}_\- ·]/gu, '').trim();
  return normalized.slice(0, 16) || '떠돌이';
};

const cleanRoomName = (value) => {
  const normalized = String(value || '').normalize('NFKC').replace(/[^\p{L}\p{N}_\- ·!?]/gu, '').trim();
  return normalized.slice(0, MAX_ROOM_NAME_LENGTH) || '이름 없는 전장';
};

const duels = createDuelEngine();

const server = createServer((request, response) => {
  if (request.url === '/health') {
    const duelState = duels.inspect();
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({
      ok: true,
      players: players.size,
      duelRooms: duelState.rooms.length,
      duelQueue: duelState.queue.length,
      pvpRooms: pvpRooms.size,
      service: 'asra-online',
    }));
    return;
  }
  response.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (client) => wss.emit('connection', client, request));
});

const broadcastRoster = () => {
  const payload = JSON.stringify({ type: 'roster', players: [...players.values()] });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
};

const sendToPlayer = (playerId, message) => {
  const client = socketsById.get(playerId);
  if (client?.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
};

const dispatchDuelEvents = (events) => {
  for (const event of events) sendToPlayer(event.to, event.message);
};

// --- PvP room helpers ---

const pvpRoomListPayload = () => ({
  type: 'pvp-room-list',
  rooms: [...pvpRooms.values()].map((room) => ({
    id: room.id,
    name: room.name,
    hostName: room.hostName,
    guestName: room.guestName,
    full: room.guestId !== null,
  })),
});

const broadcastPvpRoomList = () => {
  const payload = JSON.stringify(pvpRoomListPayload());
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
};

const leavePvpRoom = (playerId) => {
  const roomId = playerPvpRoom.get(playerId);
  if (!roomId) return;
  const room = pvpRooms.get(roomId);
  playerPvpRoom.delete(playerId);
  if (!room) return;
  if (room.hostId === playerId) {
    if (room.guestId) {
      playerPvpRoom.delete(room.guestId);
      sendToPlayer(room.guestId, { type: 'pvp-room-dissolved', reason: 'host-left' });
    }
    pvpRooms.delete(roomId);
  } else if (room.guestId === playerId) {
    room.guestId = null;
    room.guestName = null;
    room.guestFighterId = null;
    sendToPlayer(room.hostId, { type: 'pvp-guest-left' });
  }
  broadcastPvpRoomList();
};

// --- WebSocket connection handling ---

wss.on('connection', (socket) => {
  const id = randomUUID();
  clients.set(socket, { id, messages: 0, windowStartedAt: Date.now() });
  socketsById.set(id, socket);
  socket.send(JSON.stringify({ type: 'welcome', id }));

  socket.on('message', (buffer) => {
    const client = clients.get(socket);
    if (!client) return;
    const now = Date.now();
    if (now - client.windowStartedAt > 1000) {
      client.windowStartedAt = now;
      client.messages = 0;
    }
    client.messages += 1;
    if (client.messages > 24) return;

    const raw = buffer.toString();

    // --- PvP room messages ---
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; }
    if (typeof parsed?.type === 'string') {
      if (parsed.type === 'pvp-room-create') {
        if (pvpRooms.size >= MAX_PVP_ROOMS) {
          sendToPlayer(id, { type: 'pvp-room-error', reason: '방이 너무 많습니다. 잠시 후 다시 시도하십시오.' });
          return;
        }
        if (playerPvpRoom.has(id)) leavePvpRoom(id);
        const fighterId = VALID_FIGHTER_IDS.has(parsed.fighterId) ? parsed.fighterId : 'donghyeok';
        const hostName = players.get(id)?.name ?? cleanName(parsed.hostName);
        const roomName = cleanRoomName(parsed.roomName);
        const roomId = `pvp-${randomUUID()}`;
        const room = {
          id: roomId, name: roomName,
          hostId: id, hostName, hostFighterId: fighterId,
          guestId: null, guestName: null, guestFighterId: null,
        };
        pvpRooms.set(roomId, room);
        playerPvpRoom.set(id, roomId);
        sendToPlayer(id, { type: 'pvp-room-created', roomId, roomName });
        broadcastPvpRoomList();
        return;
      }
      if (parsed.type === 'pvp-room-join') {
        const roomId = typeof parsed.roomId === 'string' ? parsed.roomId : '';
        const room = pvpRooms.get(roomId);
        if (!room) { sendToPlayer(id, { type: 'pvp-room-error', reason: '방을 찾을 수 없습니다.' }); return; }
        if (room.guestId !== null) { sendToPlayer(id, { type: 'pvp-room-error', reason: '이미 가득 찬 방입니다.' }); return; }
        if (room.hostId === id) { sendToPlayer(id, { type: 'pvp-room-error', reason: '자신의 방에는 참가할 수 없습니다.' }); return; }
        if (playerPvpRoom.has(id)) leavePvpRoom(id);
        const fighterId = VALID_FIGHTER_IDS.has(parsed.fighterId) ? parsed.fighterId : 'donghyeok';
        const guestName = players.get(id)?.name ?? cleanName(parsed.guestName);
        room.guestId = id;
        room.guestName = guestName;
        room.guestFighterId = fighterId;
        playerPvpRoom.set(id, roomId);
        sendToPlayer(room.hostId, {
          type: 'pvp-field-enter',
          roomId,
          selfFighterId: room.hostFighterId,
          opponentName: guestName,
          opponentFighterId: fighterId,
          isHost: true,
        });
        sendToPlayer(id, {
          type: 'pvp-field-enter',
          roomId,
          selfFighterId: fighterId,
          opponentName: room.hostName,
          opponentFighterId: room.hostFighterId,
          isHost: false,
        });
        broadcastPvpRoomList();
        return;
      }
      if (parsed.type === 'pvp-room-leave') {
        leavePvpRoom(id);
        sendToPlayer(id, { type: 'pvp-room-left' });
        return;
      }
      if (parsed.type === 'pvp-room-list-request') {
        sendToPlayer(id, pvpRoomListPayload());
        return;
      }
      if (parsed.type === 'pvp-state') {
        const roomId = playerPvpRoom.get(id);
        const room = roomId ? pvpRooms.get(roomId) : null;
        if (!room) return;
        const opponentId = room.hostId === id ? room.guestId : room.hostId;
        if (!opponentId) return;
        const x = typeof parsed.x === 'number' && Number.isFinite(parsed.x) ? Math.max(-500, Math.min(1300, parsed.x)) : 0;
        const y = typeof parsed.y === 'number' && Number.isFinite(parsed.y) ? Math.max(-500, Math.min(1300, parsed.y)) : 0;
        const facing = typeof parsed.facing === 'number' ? parsed.facing : 0;
        const moving = Boolean(parsed.moving);
        sendToPlayer(opponentId, { type: 'pvp-opponent-state', x, y, facing, moving });
        return;
      }
    }

    // --- Existing messages ---
    const message = parseClientOnlineMessage(raw, VALID_REGIONS);
    if (!message) return;
    if (message.type === 'join') {
      players.set(id, {
        id,
        name: cleanName(message.name),
        x: 5376, y: -344,
        facing: Math.PI / 2,
        moving: false,
        region: 'ulleungdo',
      });
      broadcastRoster();
      return;
    }
    const current = players.get(id);
    if (!current) return;
    if (message.type === 'duel-queue') {
      dispatchDuelEvents(duels.queuePlayer({ id, name: current.name, fighterId: message.fighterId }));
      return;
    }
    if (message.type === 'duel-leave') {
      dispatchDuelEvents(duels.leavePlayer(id));
      return;
    }
    if (message.type === 'duel-input') {
      duels.applyInput(id, message);
      return;
    }
    if (message.type !== 'state') return;
    const x = Number(message.x);
    const y = Number(message.y);
    const facing = Number(message.facing);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(facing) || !VALID_REGIONS.has(message.region)) return;
    current.x = Math.max(-5000, Math.min(11000, x));
    current.y = Math.max(-5000, Math.min(8000, y));
    current.facing = Math.atan2(Math.sin(facing), Math.cos(facing));
    current.moving = Boolean(message.moving);
    current.region = message.region;
    broadcastRoster();
  });

  socket.on('close', () => {
    leavePvpRoom(id);
    dispatchDuelEvents(duels.disconnectPlayer(id));
    clients.delete(socket);
    socketsById.delete(id);
    players.delete(id);
    broadcastRoster();
  });
});

setInterval(() => {
  dispatchDuelEvents(duels.tick());
}, 50).unref();

setInterval(() => {
  for (const socket of wss.clients) {
    if (socket.readyState === WebSocket.OPEN) socket.ping();
  }
}, 25_000).unref();

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Asra online server listening on ${HOST}:${PORT}`);
});
