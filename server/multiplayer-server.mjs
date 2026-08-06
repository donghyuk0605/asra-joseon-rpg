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
]);

const cleanName = (value) => {
  const normalized = String(value || '').normalize('NFKC').replace(/[^\p{L}\p{N}_\- ·]/gu, '').trim();
  return normalized.slice(0, 16) || '떠돌이';
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

    const message = parseClientOnlineMessage(buffer.toString(), VALID_REGIONS);
    if (!message) return;
    if (message.type === 'join') {
      players.set(id, {
        id,
        name: cleanName(message.name),
        x: 5376,
        y: -344,
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
      dispatchDuelEvents(duels.queuePlayer({
        id,
        name: current.name,
        fighterId: message.fighterId,
      }));
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
