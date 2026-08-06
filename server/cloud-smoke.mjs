import assert from 'node:assert/strict';
import WebSocket from 'ws';

const url = process.env.ASRA_MULTIPLAYER_URL
  || 'wss://asra-online-fm42afh6ka-an.a.run.app/ws';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const waitFor = async (predicate, label, timeoutMs = 30_000) => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error(`Timed out: ${label}`);
    await delay(40);
  }
};

const createFighter = (name, fighterId) => {
  const socket = new WebSocket(url);
  const state = { id: '', roomId: '', snapshots: [], ended: null };
  socket.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === 'welcome') state.id = message.id;
    if (message.type === 'duel-match') state.roomId = message.roomId;
    if (message.type === 'duel-snapshot') state.snapshots.push(message.snapshot);
    if (message.type === 'duel-ended') state.ended = message.snapshot;
  });
  return { socket, state, name, fighterId };
};

const first = createFighter('구름검객', 'donghyeok');
const second = createFighter('연무상대', 'hajin');

try {
  await Promise.all([
    new Promise((resolve, reject) => {
      first.socket.once('open', resolve);
      first.socket.once('error', reject);
    }),
    new Promise((resolve, reject) => {
      second.socket.once('open', resolve);
      second.socket.once('error', reject);
    }),
  ]);
  first.socket.send(JSON.stringify({ type: 'join', name: first.name }));
  second.socket.send(JSON.stringify({ type: 'join', name: second.name }));
  await waitFor(() => first.state.id && second.state.id, 'welcome');
  first.socket.send(JSON.stringify({ type: 'duel-queue', fighterId: first.fighterId }));
  second.socket.send(JSON.stringify({ type: 'duel-queue', fighterId: second.fighterId }));
  await waitFor(() => first.state.roomId && second.state.roomId, 'match');
  assert.equal(first.state.roomId, second.state.roomId);

  let firstSequence = 0;
  let secondSequence = 0;
  const command = (socket, sequence, attack, guard) => socket.send(JSON.stringify({
    type: 'duel-input',
    roomId: first.state.roomId,
    seq: sequence,
    moveX: 0,
    moveY: 0,
    attack,
    guard,
  }));

  command(second.socket, secondSequence++, 'none', true);
  await delay(100);
  command(first.socket, firstSequence++, 'slash', false);
  await waitFor(() => first.state.snapshots.some((snapshot) =>
    snapshot.players.find((fighter) => fighter.id === second.state.id)?.hp === 92), 'guarded slash');

  for (let index = 0; index < 4; index += 1) {
    await delay(1_300);
    command(first.socket, firstSequence++, 'break', false);
  }
  await waitFor(() => first.state.ended && second.state.ended, 'knockout');
  assert.equal(first.state.ended.winnerId, first.state.id);
  assert.equal(second.state.ended.winnerId, first.state.id);
  assert.equal(
    first.state.ended.players.find((fighter) => fighter.id === second.state.id)?.hp,
    0,
  );
  console.log(JSON.stringify({
    ok: true,
    roomId: first.state.roomId,
    winnerId: first.state.id,
    firstSnapshots: first.state.snapshots.length,
    secondSnapshots: second.state.snapshots.length,
  }));
} finally {
  first.socket.close();
  second.socket.close();
}

