import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const HOST = process.env.RENDER_HOST_URL || `http://localhost:${PORT}`;

// Salas em memória: { code: { players: [ws, ws], board: null, turn: 'w', history: [] } }
const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function broadcast(room, msg, skipWs = null) {
  const data = JSON.stringify(msg);
  for (const ws of room.players) {
    if (ws !== skipWs && ws.readyState === 1) ws.send(data);
  }
}

// Servir frontend estático
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Criar nova sala
app.post('/api/rooms', (req, res) => {
  const code = generateCode();
  const room = { players: [], turn: 'w', history: [], fen: null, started: false, opts: req.body };
  rooms.set(code, room);
  res.json({ code, url: `${HOST}/room/${code}`, opts: req.body });
});

// Verificar se sala existe (para entrada por código)
app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  res.json({ code: req.params.code, players: room.players.length, started: room.started });
});

// Limpar salas inativas (24h sem activity)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > 24 * 3600 * 1000) rooms.delete(code);
  }
}, 3600 * 1000);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const code = url.searchParams.get('code');
  if (!code) {
    ws.close(1008, 'Código de sala obrigatório');
    return;
  }

  const room = rooms.get(code);
  if (!room) {
    ws.close(1008, 'Sala não encontrada');
    return;
  }

  if (room.players.length >= 2) {
    ws.close(1009, 'Sala cheia');
    return;
  }

  room.lastActivity = Date.now();
  const playerIndex = room.players.push(ws) - 1;

  // Sorteia os lados: primeiro jogador fica com o lado que sortear.
  if (!room.sides) {
    room.sides = Math.random() < 0.5 ? ['w', 'b'] : ['b', 'w'];
  }
  const mySide = room.sides[playerIndex];

  ws.send(JSON.stringify({ type: 'joined', player: playerIndex + 1, players: room.players.length, side: mySide }));

  if (room.players.length === 2) {
    room.started = true;
    broadcast(room, { type: 'start', fen: room.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', opts: room.opts, sides: room.sides });
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      room.lastActivity = Date.now();

      if (msg.type === 'move') {
        // Relay de movimento para o outro jogador
        broadcast(room, { type: 'move', from: msg.from, to: msg.to, promotion: msg.promotion }, ws);
        room.turn = room.turn === 'w' ? 'b' : 'w';
      } else if (msg.type === 'classPick') {
        // Guarda a escolha de classe e repassa para o outro jogador
        room.classPicks = room.classPicks || {};
        room.classPicks[msg.side] = msg.class;
        if (room.classPicks.w && room.classPicks.b) {
          broadcast(room, { type: 'classReady', classes: { w: room.classPicks.w, b: room.classPicks.b } });
        }
      } else if (msg.type === 'resign') {
        broadcast(room, { type: 'resign', player: playerIndex + 1 });
      } else if (msg.type === 'drawOffer') {
        broadcast(room, { type: 'drawOffer', player: playerIndex + 1 });
      } else if (msg.type === 'drawAccept') {
        broadcast(room, { type: 'drawAccept' });
      } else if (msg.type === 'chat') {
        broadcast(room, { type: 'chat', player: playerIndex + 1, text: msg.text });
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida' }));
    }
  });

  ws.on('close', () => {
    const idx = room.players.indexOf(ws);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      broadcast(room, { type: 'opponentLeft' });
      if (room.players.length === 0) rooms.delete(room.code);
    }
  });
});

server.listen(PORT, () => {
  console.log(`CheckMage server rodando em http://localhost:${PORT}`);
});