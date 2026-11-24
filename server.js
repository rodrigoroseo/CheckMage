import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { Chess } from 'chess.js';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const HOST = process.env.RENDER_HOST_URL || `http://localhost:${PORT}`;

const rooms = new Map();

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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

function parseSquare(s) {
  return { f: 'abcdefgh'.indexOf(s[0]), r: Number(s[1]) - 1 };
}

function randomEventData(opts, fen) {
  const available = opts?.eventTypes || [];
  if (!available.length) return null;
  const ev = pickRandom(available);
  const data = { type: ev };
  const holes = [];
  const portals = [];
  const mines = [];
  const swaps = [];

  const boardText = fen ? fen.split(' ')[0] : START_FEN;
  const rows = boardText.split('/');
  const pieces = {};
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) f += parseInt(ch);
      else {
        pieces[[f, r].join(',')] = ch;
        f++;
      }
    }
  }

  const pieceAtSquare = (sq) => pieces[[parseSquare(sq).f, parseSquare(sq).r].join(',')];

  if (ev === 'quake') {
    const candidates = ['c3','d3','e3','f3','c4','d4','e4','f4','c5','d5','e5','f5','c6','d6','e6','f6'].filter((s) => !pieceAtSquare(s));
    while (holes.length < 2 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      holes.push(candidates.splice(i, 1)[0]);
    }
    data.holes = holes;
  } else if (ev === 'portal') {
    const candidates = [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, f) => String.fromCharCode(97 + f) + (r + 1))).filter((s) => !pieceAtSquare(s));
    while (portals.length < 2 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      portals.push(candidates.splice(i, 1)[0]);
    }
    data.portals = portals;
  } else if (ev === 'mines') {
    const candidates = [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, f) => String.fromCharCode(97 + f) + (r + 1))).filter((s) => {
      const pc = pieceAtSquare(s);
      if (!pc) return true;
      const r = parseSquare(s).r;
      return r > 1 && r < 6;
    });
    while (mines.length < 4 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      mines.push(candidates.splice(i, 1)[0]);
    }
    data.mines = mines;
  } else if (ev === 'swap') {
    const squareList = [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, f) => String.fromCharCode(97 + f) + (r + 1)));
    const swapsArr = [];
    for (const side of ['w', 'b']) {
      const availablePieces = squareList.filter((s) => {
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
      if (pairs.length) {
        const chosen = pairs[Math.floor(Math.random() * pairs.length)];
        swapsArr.push({ side, a: chosen[0], b: chosen[1] });
      }
    }
    data.swaps = swapsArr;
  }

  return data;
}

function broadcast(room, msg, skipWs = null) {
  const data = JSON.stringify(msg);
  for (const ws of room.players) {
    if (ws !== skipWs && ws.readyState === 1) ws.send(data);
  }
}

function buildStatePayload(room) {
  return {
    type: 'state',
    fen: room.fen,
    turn: room.turn,
    history: room.history,
    round: room.round,
    eventPly: room.eventPly,
    eventType: room.eventType,
    eventForecast: room.eventForecast,
    dead: room.dead,
    classPower: room.classPower,
    classes: room.classes,
    holes: room.holes || [],
    portals: room.portals || [],
    mines: room.mines || [],
    swaps: room.swaps || [],
    lastMove: room.lastMove || null,
    winner: room.winner || null,
    hands: room.hands || { w: [], b: [] },
    cardsUsed: room.cardsUsed || { w: false, b: false },
    sacrificeUsed: room.sacrificeUsed || { w: false, b: false },
  };
}

function captureCooldownReduction(type) {
  if (type === 'n' || type === 'b') return 1;
  if (type === 'r') return 2;
  if (type === 'q') return 3;
  if (type === 'p') return 1;
  return 0;
}

function tickClassPower(room, side) {
  const p = room && room.classPower ? room.classPower[side] : null;
  if (!p) return;
  if (p.cooldown > 0) {
    p.cooldown = Math.max(0, p.cooldown - 1);
  }
  if (p.cooldown === 0) {
    p.charges++;
    p.cooldown = p.charges < 3 ? 20 : 0;
  }
}

function generateOpeningCards(opts) {
  const sides = ['w', 'b'];
  const cardCount = 3;
  const openingCards = { w: [], b: [] };
  if (opts?.cards) {
    const classCardIds = { w: [], b: [] };
    if (opts.classes) {
      const classMap = { warrior: 'fury', cleric: 'resurrect', paladin: 'shield', mage: 'grimoire', warlock: 'sacrifice', ranger: 'bomb', bard: 'treason' };
      for (const side of sides) {
        if (opts.classes[side] && classMap[opts.classes[side]]) {
          classCardIds[side].push(classMap[opts.classes[side]]);
        }
      }
    }
    const pools = Object.fromEntries(
      sides.map((side) => [
        side,
        (opts.enabledCards || []).filter((id) => !classCardIds[side].includes(id)),
      ]),
    );
    const equalCount = Math.min(cardCount, ...sides.map((side) => pools[side].length));
    for (const side of sides) {
      const pool = [...pools[side]];
      while (openingCards[side].length < equalCount && pool.length) {
        const i = Math.floor(Math.random() * pool.length);
        openingCards[side].push(pool.splice(i, 1)[0]);
      }
    }
  }
  return openingCards;
}

function gainCardServer(room, side, id) {
  if (!room.hands[side]) room.hands[side] = [];
  if (id === 'treason') {
    const held = room.hands[side]
      .map((card, index) => ({ card, index, level: card === 'treason3' ? 3 : card === 'treason2' ? 2 : card === 'treason' ? 1 : 0 }))
      .filter((x) => x.level > 0 && x.level < 3)
      .sort((a, b) => a.level - b.level)[0];
    if (held) {
      room.hands[side][held.index] = held.level === 1 ? 'treason2' : 'treason3';
      return;
    }
  }
  if (id === 'resurrect') {
    const held = room.hands[side]
      .map((card, index) => ({ card, index, level: card === 'resurrect3' ? 3 : card === 'resurrect2' ? 2 : card === 'resurrect' ? 1 : 0 }))
      .filter((x) => x.level > 0 && x.level < 3)
      .sort((a, b) => a.level - b.level)[0];
    if (held) {
      room.hands[side][held.index] = held.level === 1 ? 'resurrect2' : 'resurrect3';
      return;
    }
  }
  room.hands[side].push(id);
}

function gainCardRandom(room, side, opts) {
  if (!opts?.cards) return;
  const classCardIds = { w: [], b: [] };
  if (opts.classes) {
    const classMap = { warrior: 'fury', cleric: 'resurrect', paladin: 'shield', mage: 'grimoire', warlock: 'sacrifice', ranger: 'bomb', bard: 'treason' };
    for (const s of ['w', 'b']) {
      if (opts.classes[s] && classMap[opts.classes[s]]) {
        classCardIds[s].push(classMap[opts.classes[s]]);
      }
    }
  }
  const pool = (opts.enabledCards || []).filter(
    (id) =>
      (id === 'resurrect' || id === 'shield' || id === 'treason' || id === 'bomb' || id === 'counterspell' ||
        id === 'fury' || id === 'bishopShift' || id === 'knightElephant' || id === 'towerRam' || id === 'kingLeap' || id === 'sacrifice') &&
      !classCardIds[side].includes(id),
  );
  if (pool.length) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    gainCardServer(room, side, id);
  }
}

app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// ... rest of file

app.post('/api/rooms', (req, res) => {
  const code = generateCode();
  const room = {
    players: [],
    turn: 'w',
    history: [],
    fen: START_FEN,
    started: false,
    opts: req.body || {},
    eventPly: 0,
    round: 1,
    eventType: null,
    eventForecast: null,
    dead: { w: [], b: [] },
    classPower: { w: { charges: 0, cooldown: 0 }, b: { charges: 0, cooldown: 0 } },
    classes: { w: null, b: null },
    holes: [],
    portals: [],
    mines: [],
    swaps: [],
    lastMove: null,
    winner: null,
    hands: { w: [], b: [] },
    cardsUsed: { w: false, b: false },
    sacrificeUsed: { w: false, b: false },
  };
  rooms.set(code, room);
  res.json({ code, url: `${HOST}/room/${code}`, opts: req.body || {} });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  res.json({ code: req.params.code, players: room.players.length, started: room.started });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - (room.lastActivity || 0) > 24 * 3600 * 1000) rooms.delete(code);
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

  if (!room.sides) {
    room.sides = Math.random() < 0.5 ? ['w', 'b'] : ['b', 'w'];
  }
  const mySide = room.sides[playerIndex];

  ws.send(JSON.stringify({ type: 'joined', player: playerIndex + 1, players: room.players.length, side: mySide }));

  if (room.players.length === 2) {
    room.started = true;
    // Gerar cartas iniciais no servidor
    const openingCards = generateOpeningCards(room.opts);
    room.hands = openingCards;
    const initialForecast = randomEventData(room.opts, room.fen);
    broadcast(room, {
      type: 'start',
      fen: room.fen,
      turn: room.turn,
      history: room.history,
      round: room.round,
      eventPly: room.eventPly,
      eventType: room.eventType,
      eventForecast: initialForecast ? { type: initialForecast.type } : null,
      opts: room.opts,
      sides: room.sides,
      hands: room.hands,
    });
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      room.lastActivity = Date.now();

      if (msg.type === 'move') {
        // Adotar o FEN resultante do cliente (mesma posição de tabuleiro)
        if (msg.fen) {
          const g = new Chess(msg.fen);
          room.fen = msg.fen;
          room.turn = g.turn();
          room.lastMove = { from: msg.from, to: msg.to };
        }
        const fenTurn = room.turn;
        const movedColor = fenTurn === 'w' ? 'b' : 'w';

        // Registrar no histórico
        if (msg.san) room.history.push(msg.san);
        else if (msg.from && msg.to) room.history.push(`${msg.from}-${msg.to}`);

        // Contadores de rodada/evento: só rodadas novas quando pretas moveram
        if (movedColor === 'b') {
          room.round = room.round + 1;
          tickClassPower(room, 'w');
          tickClassPower(room, 'b');
        }
        if (room.opts?.events) {
          room.eventPly = room.eventPly + 1;
          if (room.eventPly >= 20 && room.opts.eventTypes?.length) {
            const evData = randomEventData(room.opts, room.fen);
            if (evData) {
              room.eventType = evData.type;
              room.holes = evData.holes || [];
              room.portals = evData.portals || [];
              room.mines = evData.mines || [];
              room.swaps = evData.swaps || [];
              room.eventForecast = randomEventData(room.opts, room.fen);
            }
            room.eventPly = 0;
            broadcast(room, { type: 'eventTrigger', ...(evData || {}) });
            if (room.eventForecast) broadcast(room, { type: 'eventForecast', eventType: room.eventForecast.type, squares: [] });
          }
        }

        // Capturas
        if (msg.captured) {
          const victimColor = movedColor === 'w' ? 'b' : 'w';
          room.dead[victimColor] = room.dead[victimColor] || [];
          room.dead[victimColor].push({ type: msg.captured, color: victimColor });
          const reduction = captureCooldownReduction(msg.captured);
          if (reduction > 0) {
            const p = movedColor === 'w' ? room.classPower.w : room.classPower.b;
            if (p && p.cooldown > 0) p.cooldown = Math.max(0, p.cooldown - reduction);
            if (p && p.cooldown === 0) {
              p.charges++;
              p.cooldown = p.charges < 3 ? 20 : 0;
            }
          }
          // O servidor decide qual carta o jogador que capturou ganha
          if (['n', 'b', 'r', 'q'].includes(msg.captured)) {
            gainCardRandom(room, movedColor, room.opts);
          }
        }

        broadcast(room, {
          type: 'move',
          from: msg.from,
          to: msg.to,
          promotion: msg.promotion,
          fen: msg.fen,
          captured: msg.captured || null,
          san: msg.san || null,
          piece: msg.piece || null,
          color: movedColor,
        });
        broadcast(room, buildStatePayload(room));
      } else if (msg.type === 'classPick') {
        room.classPicks = room.classPicks || {};
        room.classPicks[msg.side] = msg.class;
        if (room.classPicks.w && room.classPicks.b) {
          room.classes.w = room.classPicks.w;
          room.classes.b = room.classPicks.b;
          broadcast(room, { type: 'classReady', classes: { w: room.classes.w, b: room.classes.b } });
        }
      } else if (msg.type === 'cardPlay') {
        // O servidor valida e processa o uso de carta
        // Em multiplayer, o servidor é a autoridade para as mãos
        const playerSide = room.sides ? room.sides[room.players.indexOf(ws)] : null;
        if (!playerSide) {
          ws.send(JSON.stringify({ type: 'error', message: 'Não está na partida' }));
          return;
        }
        const card = msg.card;
        const target = msg.target;
        if (!card || !target) {
          ws.send(JSON.stringify({ type: 'error', message: 'Dados de carta inválidos' }));
          return;
        }
        // Verificar se o jogador tem a carta na mão
        if (!room.hands[playerSide] || !room.hands[playerSide].includes(card)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Você não tem esta carta na mão' }));
          return;
        }
        // Remover a carta da mão do jogador
        room.hands[playerSide] = room.hands[playerSide].filter((c) => c !== card);
        // Marcar cartas usadas (para cartas normais, não counterspell)
        if (card !== 'counterspell') {
          room.cardsUsed[playerSide] = true;
        }
        // Verificar se o adversário tem contramagia
        const opponentSide = room.sides ? room.sides.find((s) => s !== playerSide) : null;
        if (opponentSide && room.hands[opponentSide] && room.hands[opponentSide].includes('counterspell') && !room.cardsUsed[opponentSide]) {
          // Notificar o adversário para usar contramagia
          const opponentWs = room.players.find((p) => room.sides && room.sides.includes(side) && p !== ws);
          // Encontrar o oponente por índice
          const oppIdx = room.players.indexOf(ws);
          const otherIdx = oppIdx === 0 ? 1 : 0;
          const otherWs = room.players[otherIdx];
          if (otherWs) {
            otherWs.send(JSON.stringify({ type: 'counterspellRequest', card, target, playerSide }));
          }
          // Broadcastar estado atualizado (mãos)
          broadcast(room, buildStatePayload(room));
          return;
        }
        // Nenhum counterspell disponível, confirmar carta
        broadcast(room, buildStatePayload(room));
      } else if (msg.type === 'counterspellResponse') {
        // Servidor processa resposta de contramagia
        const accepted = msg.accepted;
        const playerSide = room.sides ? room.sides[room.players.indexOf(ws)] : null;
        if (!playerSide) return;
        const side = playerSide;
        if (accepted) {
          // Remover contramagia da mão do oponente
          room.hands[side] = room.hands[side] ? room.hands[side].filter((c) => c !== 'counterspell') : [];
          room.cardsUsed[side] = true;
          // Notificar o jogador original que a carta foi cancelada
          const oppIdx = room.players.indexOf(ws);
          const otherIdx = oppIdx === 0 ? 1 : 0;
          const otherWs = room.players[otherIdx];
          if (otherWs) {
            otherWs.send(JSON.stringify({ type: 'cardCancelled' }));
          }
        }
        broadcast(room, buildStatePayload(room));
      } else if (msg.type === 'counterspellRequest') {
        // Servidor encaminha solicitação de contramagia para o adversário
        const playerSide = msg.playerSide;
        const opponentSide = room.sides ? room.sides.find((s) => s !== playerSide) : null;
        if (!opponentSide) return;
        const oppIdx = room.players.indexOf(ws);
        const otherIdx = oppIdx === 0 ? 1 : 0;
        const otherWs = room.players[otherIdx];
        if (otherWs) {
          otherWs.send(JSON.stringify({ type: 'counterspellRequest', card: msg.card, target: msg.target, playerSide }));
        }
      } else if (msg.type === 'resign') {
        broadcast(room, { type: 'resign', player: msg.player });
      } else if (msg.type === 'drawOffer') {
        broadcast(room, { type: 'drawOffer', player: msg.player });
      } else if (msg.type === 'drawAccept') {
        broadcast(room, { type: 'drawAccept' });
      } else if (msg.type === 'chat') {
        broadcast(room, { type: 'chat', player: msg.player, text: msg.text });
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida' }));
    }
  });

  ws.on('close', () => {
    const idx = room.players.indexOf(ws);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) rooms.delete(room.code);
    }
  });
});

server.listen(PORT, () => {
  console.log(`CheckMage server rodando em http://localhost:${PORT}`);
});
