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
    powerUsed: room.powerUsed || { w: false, b: false },
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
  if (p.cooldown === 0 && p.charges < 3) {
    p.charges++;
    p.cooldown = p.charges < 3 ? 20 : 0;
  }
}

function consumeCardServer(room, side, card, isClassPower) {
  if (isClassPower) {
    const p = room.classPower[side];
    if (p && p.charges > 0) {
      p.charges = Math.max(0, p.charges - 1);
      p.cooldown = p.charges < 3 ? 20 : 0;
    }
    room.powerUsed[side] = true;
  } else {
    if (room.hands[side]) room.hands[side] = room.hands[side].filter((c) => c !== card);
    if (card !== 'counterspell') room.cardsUsed[side] = true;
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
  for (const side of sides) {
    if (opts?.classes?.[side]) {
      openingCards[side].unshift('classPower');
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

const COUNTERSPELL_TIMEOUT_MS = 20000;

function clearPendingCard(room) {
  if (room.pendingTimer) {
    clearTimeout(room.pendingTimer);
    room.pendingTimer = null;
  }
  room.pendingCard = null;
}

// Resolve a carta pendente (aguardando decisão de contramagia) e avisa os dois jogadores.
function resolvePendingCard(room, accepted, responderSide) {
  const pending = room.pendingCard;
  if (!pending) return false;
  clearPendingCard(room);
  // A carta/poder original é sempre consumido, tenha sido anulado ou não
  consumeCardServer(room, pending.playerSide, pending.card, pending.isClassPower);
  if (accepted) {
    const hand = responderSide ? room.hands[responderSide] : null;
    const idx = hand ? hand.indexOf('counterspell') : -1;
    if (idx !== -1) hand.splice(idx, 1);
    if (responderSide) room.cardsUsed[responderSide] = true;
    broadcast(room, { type: 'cardCancelled', playerSide: pending.playerSide });
  } else {
    broadcast(room, {
      type: 'cardConfirmed',
      card: pending.card,
      target: pending.target,
      playerSide: pending.playerSide,
      isClassPower: pending.isClassPower,
      powerId: pending.powerId,
    });
  }
  broadcast(room, buildStatePayload(room));
  return true;
}

app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// ... rest of file

const REQUEST_TIMEOUT_MS = 30000;

function clearPendingRequest(room) {
  if (room.requestTimer) {
    clearTimeout(room.requestTimer);
    room.requestTimer = null;
  }
  room.pendingRequest = null;
}

// Encerra um pedido (reiniciar/empate) sem aceite e avisa os dois jogadores.
function resolveRequestDeclined(room, reason) {
  const req = room.pendingRequest;
  if (!req) return;
  clearPendingRequest(room);
  broadcast(room, { type: 'requestResolved', kind: req.kind, accepted: false, reason, requester: req.from });
}

// Estado de jogo de uma sala (usado na criação e no reinício da partida).
function createGameState(opts) {
  return {
    turn: 'w',
    history: [],
    fen: START_FEN,
    opts,
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
    powerUsed: { w: false, b: false },
  };
}

// Distribui as cartas iniciais e avisa os dois jogadores que a partida começou.
function startRoomMatch(room, restarted) {
  // Gerar cartas iniciais no servidor
  const openingCards = generateOpeningCards(room.opts);
  room.hands = openingCards;
  const initialForecast = randomEventData(room.opts, room.fen);
  const startMsg = {
    type: 'start',
    restarted: Boolean(restarted),
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
  };
  // Se classes randômicas, escolher no servidor e enviar no início
  if (room.opts?.randomClasses) {
    const randomClass = pickRandom(room.opts.enabledClasses || []);
    room.classes = { w: randomClass, b: randomClass };
    startMsg.classes = room.classes;
    room.opts.classes = { w: room.classes.w, b: room.classes.b };
    room.hands = generateOpeningCards(room.opts);
    room.classPower = { w: { charges: 1, cooldown: 0 }, b: { charges: 1, cooldown: 0 } };
    startMsg.hands = room.hands;
    startMsg.classPower = room.classPower;
  }
  if (initialForecast) room.eventForecast = initialForecast;
  broadcast(room, startMsg);
}

// Reinicia a partida da sala mantendo jogadores, lados e regras originais.
function restartRoom(room) {
  clearPendingCard(room);
  clearPendingRequest(room);
  const opts = JSON.parse(JSON.stringify(room.baseOpts || {}));
  Object.assign(room, createGameState(opts));
  room.classPicks = null;
  room.started = true;
  room.lastActivity = Date.now();
  startRoomMatch(room, true);
}

app.post('/api/rooms', (req, res) => {
  const code = generateCode();
  const baseOpts = req.body || {};
  const room = {
    code,
    players: [],
    started: false,
    baseOpts: JSON.parse(JSON.stringify(baseOpts)),
    ...createGameState(baseOpts),
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
    startRoomMatch(room, false);
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
          // Resetar flags de uso por turno ao iniciar um novo round
          room.cardsUsed = { w: false, b: false };
          room.powerUsed = { w: false, b: false };
          room.sacrificeUsed = { w: false, b: false };
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
        // O lado vem da conexão (não do cliente) e a escolha, depois de feita, não pode mudar
        const pickSide = room.sides ? room.sides[room.players.indexOf(ws)] : null;
        if (!pickSide || !msg.class) return;
        room.classPicks = room.classPicks || {};
        if (room.classPicks[pickSide]) return;
        room.classPicks[pickSide] = msg.class;
        if (room.classPicks.w && room.classPicks.b) {
          room.classes.w = room.classPicks.w;
          room.classes.b = room.classPicks.b;
          // Regenerar as mãos com as classes definidas
          room.opts.classes = { w: room.classes.w, b: room.classes.b };
          room.hands = generateOpeningCards(room.opts);
room.classPower = { w: { charges: 1, cooldown: 20 }, b: { charges: 1, cooldown: 20 } };
          broadcast(room, { type: 'classReady', classes: { w: room.classes.w, b: room.classes.b }, hands: room.hands });
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
        const isClassPower = !!msg.isClassPower;
        const powerId = msg.powerId;
        if (!card || !target) {
          ws.send(JSON.stringify({ type: 'error', message: 'Dados de carta inválidos' }));
          return;
        }
        // Validar posse ANTES de guardar como pending - mas NÃO consumir ainda
        if (isClassPower) {
          const p = room.classPower[playerSide];
          if (!p || p.charges < 1) {
            ws.send(JSON.stringify({ type: 'error', message: 'Sem cargas disponíveis para o poder.' }));
            return;
          }
        } else {
          if (!room.hands[playerSide] || !room.hands[playerSide].includes(card)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Você não tem esta carta na mão' }));
            return;
          }
        }
        if (room.pendingCard) {
          ws.send(JSON.stringify({ type: 'error', message: 'Aguarde a resolução da carta anterior.' }));
          return;
        }
        if (room.pendingRequest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Aguarde a resposta do pedido pendente.' }));
          return;
        }
        // Verificar se o adversário (conectado) tem contramagia
        const opponentSide = room.sides ? room.sides.find((s) => s !== playerSide) : null;
        const otherWs = room.players.find((p) => p !== ws);
        if (
          opponentSide &&
          otherWs &&
          otherWs.readyState === 1 &&
          room.hands[opponentSide] &&
          room.hands[opponentSide].includes('counterspell') &&
          !room.cardsUsed[opponentSide]
        ) {
          // Guardar detalhes da carta - consumo será feito após decisão do counterspell
          room.pendingCard = { card, target, playerSide, isClassPower, powerId, responderWs: otherWs };
          // Sem resposta a tempo, a carta resolve normalmente (evita travar o jogo)
          room.pendingTimer = setTimeout(() => {
            const pending = room.pendingCard;
            if (!pending) return;
            const responderSide = room.sides.find((s) => s !== pending.playerSide);
            if (pending.responderWs && pending.responderWs.readyState === 1) {
              pending.responderWs.send(JSON.stringify({ type: 'counterspellExpired' }));
            }
            resolvePendingCard(room, false, responderSide);
          }, COUNTERSPELL_TIMEOUT_MS);
          otherWs.send(JSON.stringify({ type: 'counterspellRequest', card, target, playerSide, isClassPower, powerId }));
          broadcast(room, buildStatePayload(room));
          return;
        }
        // Nenhum counterspell disponível, consumir e confirmar carta imediatamente
        consumeCardServer(room, playerSide, card, isClassPower);
        broadcast(room, buildStatePayload(room));
        broadcast(room, { type: 'cardConfirmed', card, target, playerSide, isClassPower, powerId });
      } else if (msg.type === 'counterspellResponse') {
        // Servidor processa resposta de contramagia
        const playerSide = room.sides ? room.sides[room.players.indexOf(ws)] : null;
        if (!playerSide) return;
        const pending = room.pendingCard;
        if (!pending) return;
        // Só o oponente de quem jogou a carta pode responder
        if (playerSide === pending.playerSide) return;
        const hasCounter = !!room.hands[playerSide] && room.hands[playerSide].includes('counterspell');
        resolvePendingCard(room, !!msg.accepted && hasCounter, playerSide);
      } else if (msg.type === 'counterspellRequest') {
        // Servidor encaminha solicitação de contramagia para o adversário
        const playerSide = msg.playerSide;
        const opponentSide = room.sides ? room.sides.find((s) => s !== playerSide) : null;
        if (!opponentSide) return;
        const oppIdx = room.players.indexOf(ws);
        const otherIdx = oppIdx === 0 ? 1 : 0;
        const otherWs = room.players[otherIdx];
        if (otherWs) {
          otherWs.send(JSON.stringify({ type: 'counterspellRequest', card: msg.card, target: msg.target, playerSide, isClassPower: !!msg.isClassPower, powerId: msg.powerId }));
        }
      } else if (msg.type === 'resign') {
        // Desistência: quem enviou perde; o lado vem da conexão
        const loser = room.sides ? room.sides[room.players.indexOf(ws)] : null;
        if (!loser || room.winner) return;
        clearPendingCard(room);
        clearPendingRequest(room);
        room.winner = loser === 'w' ? 'b' : 'w';
        broadcast(room, { type: 'gameOver', reason: 'resign', loser, winner: room.winner });
      } else if (msg.type === 'request') {
        // Pedido de reinício ou empate: o oponente precisa aceitar
        const kind = msg.kind;
        const from = room.sides ? room.sides[room.players.indexOf(ws)] : null;
        if (!from || !['restart', 'draw'].includes(kind) || room.players.length < 2) return;
        if (kind === 'draw' && room.winner) return;
        if (room.pendingRequest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Já existe um pedido aguardando resposta.' }));
          return;
        }
        if (room.pendingCard) {
          ws.send(JSON.stringify({ type: 'error', message: 'Aguarde a resolução da carta em andamento.' }));
          return;
        }
        const otherWs = room.players.find((p) => p !== ws);
        if (!otherWs || otherWs.readyState !== 1) {
          ws.send(JSON.stringify({ type: 'error', message: 'O adversário não está conectado.' }));
          return;
        }
        room.pendingRequest = { kind, from, ws };
        room.requestTimer = setTimeout(() => resolveRequestDeclined(room, 'expired'), REQUEST_TIMEOUT_MS);
        otherWs.send(JSON.stringify({ type: 'request', kind, from }));
      } else if (msg.type === 'requestResponse') {
        const req = room.pendingRequest;
        // Só o oponente de quem pediu pode responder
        if (!req || req.ws === ws) return;
        if (!msg.accepted) {
          resolveRequestDeclined(room, 'declined');
          return;
        }
        clearPendingRequest(room);
        if (req.kind === 'restart') {
          restartRoom(room);
        } else {
          broadcast(room, { type: 'gameOver', reason: 'draw' });
        }
      } else if (msg.type === 'requestCancel') {
        const req = room.pendingRequest;
        if (!req || req.ws !== ws) return;
        resolveRequestDeclined(room, 'cancelled');
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
      clearPendingCard(room);
      clearPendingRequest(room);
      if (room.players.length === 0) rooms.delete(room.code);
      else broadcast(room, { type: 'opponentLeft' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`CheckMage server rodando em http://localhost:${PORT}`);
});
