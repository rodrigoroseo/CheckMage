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

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomEventData(opts, fen) {
  const available = opts.eventTypes;
  if (!available.length) return null;
  const ev = pickRandom(available);
  const data = { type: ev };
  const holes = [];
  const portals = [];
  const mines = [];
  const swaps = [];

  // Parse FEN board
  const boardText = fen.split(' ')[0];
  const rows = boardText.split('/');
  const pieces = {};
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) f += parseInt(ch);
      else { pieces[[f, r].join(',')] = ch; f++; }
    }
  }

  const pieceAtSquare = (sq) => pieces[[parseSquare(sq).f, parseSquare(sq).r].join(',')];

  if (ev === 'quake') {
    const candidates = ['c3','d3','e3','f3','c4','d4','e4','f4','c5','d5','e5','f5','c6','d6','e6','f6'].filter(s => !pieceAtSquare(s));
    while (holes.length < 2 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      holes.push(candidates.splice(i, 1)[0]);
    }
    data.holes = holes;
  } else if (ev === 'portal') {
    const candidates = [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, f) => String.fromCharCode(97 + f) + (r + 1))).filter(s => !pieceAtSquare(s));
    while (portals.length < 2 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      portals.push(candidates.splice(i, 1)[0]);
    }
    data.portals = portals;
  } else if (ev === 'mines') {
    const candidates = [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, f) => String.fromCharCode(97 + f) + (r + 1))).filter(s => !pieceAtSquare(s) && r > 1 && r < 6);
    while (mines.length < 4 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      mines.push(candidates.splice(i, 1)[0]);
    }
    data.mines = mines;
  } else if (ev === 'swap') {
    // Find valid swap pairs for each side (same logic as client, adapted)
    for (const side of ['w', 'b']) {
      const sidePieces = Object.entries(pieces).filter(([key, pc]) => pc.toLowerCase() === pc ? pc === side : pc.toUpperCase() === pc && side === 'w' || pc === pc.toUpperCase() && side === 'w');
      // Simpler: collect all pieces of this side
      const squareList = [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, f) => String.fromCharCode(97 + f) + (r + 1)));
      const availablePieces = squareList.filter(s => {
        const pc = pieceAtSquare(s);
        if (!pc) return false;
        const isWhite = pc === pc.toUpperCase();
        const isRoyal = pc.toLowerCase() === 'k';
        return side === 'w' ? (isWhite && !isRoyal) : (!isWhite && !isRoyal);
      });
      const pairs = [];
      for (let i = 0; i < availablePieces.length; i++) {
        for (let j = i + 1; j < availablePieces.length; j++) {
          const a = availablePieces[i], b = availablePieces[j];
          const pa = pieceAtSquare(a), pb = pieceAtSquare(b);
          const ar = parseSquare(a).r, br = parseSquare(b).r;
          const pawnSafe = (pa.toLowerCase() !== 'p' || (br > 0 && br < 7)) && (pb.toLowerCase() !== 'p' || (ar > 0 && ar < 7));
          if (pawnSafe) pairs.push([a, b]);
        }
      }
      const chosen = pairs[pickRandom(pairs) ? Math.floor(Math.random() * pairs.length) : 0];
      if (chosen) swaps.push({ side, a: chosen[0], b: chosen[1] });
    }
    data.swaps = swaps;
  }

  return data;
}

function parseSquare(s) {
  return { f: 'abcdefgh'.indexOf(s[0]), r: Number(s[1]) - 1 };
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
  const room = { players: [], turn: 'w', history: [], fen: null, started: false, opts: req.body, eventPly: 0 };
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
        room.fen = msg.fen;
        // Relay de movimento para o outro jogador (inclui FEN para sincronizar)
        broadcast(room, { type: 'move', from: msg.from, to: msg.to, promotion: msg.promotion, fen: msg.fen }, ws);
        room.turn = room.turn === 'w' ? 'b' : 'w';
        // Event trigger: depois da jogada das pretas (FEN mostra vez das brancas após o movimento das pretas)
        if (msg.fen && msg.fen.split(' ')[1] === 'w') {
          room.eventPly++;
          if (room.eventPly >= 20 && room.opts.events && room.opts.eventTypes.length) {
            const evData = randomEventData(room.opts, msg.fen);
            if (evData) {
              broadcast(room, { type: 'eventTrigger', ...evData });
              room.eventPly = 0;
              const nextForecast = randomEventData(room.opts, msg.fen);
              if (nextForecast) broadcast(room, { type: 'eventForecast', eventType: nextForecast.type, squares: [] });
            }
          }
        }
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