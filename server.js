import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;

// URL pública do site: PUBLIC_URL (opcional) ou derivada da requisição, o que funciona atrás do proxy
// do Render (https://checkmage.onrender.com) e também localmente (http://localhost:PORT).
function publicBaseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  const first = (value) => String(value || '').split(',')[0].trim();
  const proto = first(req.headers['x-forwarded-proto']) || req.protocol || 'http';
  const host = first(req.headers['x-forwarded-host']) || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

/*
 * Modelo do multijogador
 * ----------------------
 * - O servidor é a autoridade das MÃOS de cartas, cargas/recarga de poderes, contramagia, rodadas,
 *   pedidos (reiniciar/empate), desistência e fim de jogo.
 * - Os EFEITOS no tabuleiro (armadilhas, escudos, atordoados, bispos agendados, mortos, eventos,
 *   roleta...) são calculados pelo cliente de quem jogou e enviados junto do lance ("fx") ou depois
 *   do efeito de uma carta ("sync"). O servidor guarda o último fx e o reenvia em todo "state", para
 *   os dois lados terminarem sempre com o mesmo estado.
 * - O lado de cada jogador vem da conexão (ws.side), nunca de campos enviados pelo cliente.
 */

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

// Tipos de peça (minúsculos) que um lado possui no FEN.
function ownedPieceTypes(fen, side) {
  const owned = new Set();
  const board = String(fen || START_FEN).split(' ')[0];
  for (const ch of board) {
    if (!/[a-zA-Z]/.test(ch)) continue;
    const isWhite = ch === ch.toUpperCase();
    if ((side === 'w') === isWhite) owned.add(ch.toLowerCase());
  }
  return owned;
}

function broadcast(room, msg, skipWs = null) {
  const data = JSON.stringify(msg);
  for (const ws of room.players) {
    if (ws !== skipWs && ws.readyState === 1) ws.send(data);
  }
}

function sendTo(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
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
    fx: room.fx || null,
  };
}

// ---------------------------------------------------------------------------
// Poderes de classe (mesmas regras do cliente: 20 rodadas de recarga, máximo de 3 cargas)
// ---------------------------------------------------------------------------
const CLASS_COOLDOWN = 20;

function captureCooldownReduction(type) {
  if (type === 'n' || type === 'b') return 1;
  if (type === 'r') return 2;
  if (type === 'q') return 3;
  if (type === 'p') return 1;
  return 0;
}

function reduceClassCooldownServer(room, side, amount = 1) {
  const power = room.classPower ? room.classPower[side] : null;
  if (!power || !room.classes[side] || amount <= 0) return;
  if (power.charges >= 3) {
    power.cooldown = 0;
    return;
  }
  if (power.cooldown <= 0) power.cooldown = CLASS_COOLDOWN;
  power.cooldown = Math.max(0, power.cooldown - amount);
  if (power.cooldown === 0) {
    power.charges++;
    power.cooldown = power.charges < 3 ? CLASS_COOLDOWN : 0;
  }
}

function spendClassPowerServer(room, side, amount = 1) {
  const power = room.classPower ? room.classPower[side] : null;
  if (!power) return;
  power.charges = Math.max(0, power.charges - amount);
  if (power.charges < 3 && power.cooldown <= 0) power.cooldown = CLASS_COOLDOWN;
}

// ---------------------------------------------------------------------------
// Cartas
// ---------------------------------------------------------------------------
const CLASS_CARD = {
  warrior: 'fury',
  cleric: 'resurrect',
  paladin: 'shield',
  mage: 'grimoire',
  warlock: 'sacrifice',
  ranger: 'bomb',
  bard: 'treason',
};

function classCardIdsFor(opts, side) {
  const cls = opts?.classes?.[side];
  return cls && CLASS_CARD[cls] ? [CLASS_CARD[cls]] : [];
}

// "treason2" -> { base: 'treason', level: 2 }; cartas sem nível retornam null.
function leveledCard(id) {
  const m = /^(treason|resurrect)([23])?$/.exec(String(id));
  return m ? { base: m[1], level: m[2] ? Number(m[2]) : 1 } : null;
}

function leveledId(base, level) {
  return level > 1 ? `${base}${level}` : base;
}

// Consome UMA carta (ou um nível dela) / uma carga de poder. Usado quando a contramagia anula o efeito;
// quando o efeito é aplicado, quem jogou envia o consumo exato em "sync".
function consumeCardServer(room, side, card, isClassPower) {
  if (isClassPower) {
    spendClassPowerServer(room, side, 1);
    room.powerUsed[side] = true;
    return;
  }
  const hand = room.hands[side] || (room.hands[side] = []);
  const idx = hand.indexOf(card);
  if (idx !== -1) {
    const lv = leveledCard(card);
    if (lv && lv.level > 1) hand[idx] = leveledId(lv.base, lv.level - 1);
    else hand.splice(idx, 1);
  }
  if (card === 'counterspell') return;
  if (card === 'sacrifice' && !room.sacrificeUsed[side]) room.sacrificeUsed[side] = true;
  else room.cardsUsed[side] = true;
}

function generateOpeningCards(opts) {
  const sides = ['w', 'b'];
  const cardCount = 3;
  const openingCards = { w: [], b: [] };
  if (opts?.cards) {
    const pools = Object.fromEntries(
      sides.map((side) => [
        side,
        (opts.enabledCards || []).filter((id) => !classCardIdsFor(opts, side).includes(id)),
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
  for (const base of ['treason', 'resurrect']) {
    if (id !== base) continue;
    const held = room.hands[side]
      .map((card, index) => ({ card, index, lv: leveledCard(card) }))
      .filter((x) => x.lv && x.lv.base === base && x.lv.level < 3)
      .sort((a, b) => a.lv.level - b.lv.level)[0];
    if (held) {
      room.hands[side][held.index] = leveledId(base, held.lv.level + 1);
      return;
    }
  }
  room.hands[side].push(id);
}

// Mesmo critério do cliente: a carta só entra no sorteio se o jogador tem a peça que ela exige.
function gainCardRandom(room, side, opts) {
  if (!opts?.cards) return;
  const owned = ownedPieceTypes(room.fen, side);
  const classCards = classCardIdsFor(opts, side);
  const pool = (opts.enabledCards || []).filter(
    (id) =>
      (['resurrect', 'shield', 'treason', 'bomb', 'counterspell', 'kingLeap', 'sacrifice'].includes(id) ||
        (id === 'fury' && owned.has('p')) ||
        (id === 'bishopShift' && owned.has('b')) ||
        (id === 'knightElephant' && owned.has('n')) ||
        (id === 'towerRam' && owned.has('r'))) &&
      !classCards.includes(id),
  );
  if (pool.length) gainCardServer(room, side, pickRandom(pool));
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
  if (accepted) {
    // Contramagia usada: a carta/poder original é gasto sem efeito e a contramagia também
    consumeCardServer(room, pending.playerSide, pending.card, pending.isClassPower);
    const hand = responderSide ? room.hands[responderSide] : null;
    const idx = hand ? hand.indexOf('counterspell') : -1;
    if (idx !== -1) hand.splice(idx, 1);
    if (responderSide) room.cardsUsed[responderSide] = true;
    broadcast(room, buildStatePayload(room));
    broadcast(room, { type: 'cardCancelled', playerSide: pending.playerSide });
  } else {
    // O consumo exato é enviado por quem jogou (sync) depois de aplicar o efeito
    broadcast(room, {
      type: 'cardConfirmed',
      card: pending.card,
      target: pending.target,
      playerSide: pending.playerSide,
      isClassPower: pending.isClassPower,
      powerId: pending.powerId,
    });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Efeitos de tabuleiro (fx) enviados pelo cliente
// ---------------------------------------------------------------------------
const FX_ARRAY_KEYS = ['shields', 'bombs', 'stunned', 'scheduledBishops', 'holes', 'portals', 'mines', 'eventHighlights'];

// Guarda o fx (sem o aviso transitório "event") e espelha nos campos que o servidor expõe.
function storeFx(room, fx) {
  if (!fx || typeof fx !== 'object') return;
  const clean = {};
  for (const key of FX_ARRAY_KEYS) if (Array.isArray(fx[key])) clean[key] = fx[key];
  if (fx.dead && typeof fx.dead === 'object') clean.dead = fx.dead;
  if ('roulette' in fx) clean.roulette = fx.roulette || null;
  if ('eventType' in fx) clean.eventType = fx.eventType || null;
  if ('eventForecast' in fx) clean.eventForecast = fx.eventForecast || null;
  if (Array.isArray(fx.roundDeltas)) clean.roundDeltas = fx.roundDeltas;
  if (Array.isArray(fx.activity)) clean.activity = fx.activity.slice(-40);
  if (typeof fx.roundMaterialBaseline === 'number') clean.roundMaterialBaseline = fx.roundMaterialBaseline;
  room.fx = { ...(room.fx || {}), ...clean };
  if (clean.dead) room.dead = clean.dead;
  if (clean.holes) room.holes = clean.holes;
  if (clean.portals) room.portals = clean.portals;
  if (clean.mines) room.mines = clean.mines;
  if ('eventType' in clean) room.eventType = clean.eventType;
  if ('eventForecast' in clean) room.eventForecast = clean.eventForecast;
}

function adoptFen(room, fen) {
  if (typeof fen !== 'string' || fen.split(' ').length < 4) return false;
  room.fen = fen;
  room.turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  return true;
}

// Reinicia a flag de uso por turno do lado que passa a jogar (mesma regra do cliente).
function resetTurnFlags(room) {
  room.cardsUsed[room.turn] = false;
  room.powerUsed[room.turn] = false;
  room.sacrificeUsed[room.turn] = false;
}

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
    captureRewards: { w: [], b: [] },
    classPicks: null,
    fx: null,
  };
}

// Distribui as cartas iniciais e avisa os dois jogadores que a partida começou.
function startRoomMatch(room, restarted) {
  room.matchActive = true;
  room.hands = generateOpeningCards(room.opts);
  const evTypes = room.opts?.eventTypes || [];
  room.eventForecast =
    room.opts?.events && evTypes.length ? { type: pickRandom(evTypes), squares: [] } : null;
  // Na roleta, o primeiro sorteio só pode cair em peças que têm lance na posição inicial
  const roulette = room.opts?.mode === 'roulette' ? pickRandom(['p', 'n']) : null;
  if (roulette) room.fx = { ...(room.fx || {}), roulette };
  const startMsg = {
    type: 'start',
    restarted: Boolean(restarted),
    fen: room.fen,
    turn: room.turn,
    history: room.history,
    round: room.round,
    eventPly: room.eventPly,
    eventType: room.eventType,
    eventForecast: room.eventForecast,
    opts: room.opts,
    sides: room.sides,
    hands: room.hands,
    roulette,
  };
  // Se classes randômicas, escolher no servidor e enviar no início
  if (room.opts?.randomClasses) {
    const randomClass = pickRandom(room.opts.enabledClasses || []);
    room.classes = { w: randomClass, b: randomClass };
    startMsg.classes = room.classes;
    room.opts.classes = { w: room.classes.w, b: room.classes.b };
    room.hands = generateOpeningCards(room.opts);
    room.classPower = {
      w: { charges: 1, cooldown: CLASS_COOLDOWN },
      b: { charges: 1, cooldown: CLASS_COOLDOWN },
    };
    startMsg.hands = room.hands;
    startMsg.classPower = room.classPower;
  }
  broadcast(room, startMsg);
}

// Reinicia a partida da sala mantendo jogadores, lados e regras originais.
function restartRoom(room) {
  clearPendingCard(room);
  clearPendingRequest(room);
  const opts = JSON.parse(JSON.stringify(room.baseOpts || {}));
  Object.assign(room, createGameState(opts));
  room.started = true;
  room.lastActivity = Date.now();
  startRoomMatch(room, true);
}

// Quem volta para uma partida em andamento recebe o estado completo (sem sortear nada de novo).
function resumeRoomFor(room, ws) {
  sendTo(ws, { ...buildStatePayload(room), type: 'start', resumed: true, opts: room.opts, sides: room.sides });
}

app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Link direto da sala (/room/CODIGO): serve a página principal; o cliente lê o código da URL e entra na sala.
app.get('/room/:code', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.post('/api/rooms', (req, res) => {
  const code = generateCode();
  const baseOpts = req.body || {};
  const room = {
    code,
    players: [],
    started: false,
    matchActive: false,
    lastActivity: Date.now(),
    baseOpts: JSON.parse(JSON.stringify(baseOpts)),
    ...createGameState(baseOpts),
  };
  rooms.set(code, room);
  res.json({ code, url: `${publicBaseUrl(req)}/room/${code}`, opts: req.body || {} });
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
  const code = String(url.searchParams.get('code') || '').toUpperCase();
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
  if (!room.sides) {
    room.sides = Math.random() < 0.5 ? ['w', 'b'] : ['b', 'w'];
  }
  // O lado pertence à conexão: quem volta assume o lado que ficou livre (a ordem do array não importa)
  const takenSides = room.players.map((p) => p.side);
  ws.side = room.sides.find((s) => !takenSides.includes(s)) || room.sides[0];
  ws.playerNo = room.sides.indexOf(ws.side) + 1;
  room.players.push(ws);
  const mySide = ws.side;
  const sideOf = () => ws.side;
  const otherPlayer = () => room.players.find((p) => p !== ws);

  ws.send(JSON.stringify({ type: 'joined', player: ws.playerNo, players: room.players.length, side: mySide }));

  if (room.players.length === 2) {
    room.started = true;
    const draftIncomplete =
      room.opts?.classes && !room.opts?.randomClasses && !(room.classes.w && room.classes.b);
    if (!room.matchActive || draftIncomplete) {
      room.classPicks = null;
      startRoomMatch(room, false);
    } else {
      // Reconexão no meio da partida: restaura o estado de quem voltou e avisa o outro
      resumeRoomFor(room, ws);
      sendTo(otherPlayer(), { type: 'opponentRejoined' });
    }
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      room.lastActivity = Date.now();
      const side = sideOf();

      if (msg.type === 'move') {
        if (!side || room.winner || !adoptFen(room, msg.fen)) return;
        const movedColor = side;
        room.lastMove = { from: msg.from, to: msg.to };

        // Registrar no histórico
        if (msg.san) room.history.push(msg.san);
        else if (msg.from && msg.to) room.history.push(`${msg.from}-${msg.to}`);

        // Quem passa a jogar começa o turno com as flags de uso zeradas (como no cliente)
        resetTurnFlags(room);
        if (msg.fx) storeFx(room, msg.fx);

        // Capturas: cooldown do poder, mortos (se o cliente não enviou fx) e carta de recompensa
        if (msg.captured) {
          if (!msg.fx?.dead) {
            const victimColor = movedColor === 'w' ? 'b' : 'w';
            room.dead[victimColor] = room.dead[victimColor] || [];
            room.dead[victimColor].push({ type: msg.captured, color: victimColor });
          }
          const reduction = captureCooldownReduction(msg.captured);
          if (reduction > 0) reduceClassCooldownServer(room, movedColor, reduction);
          if (msg.captured === 'k') room.winner = movedColor;
          // Só a primeira captura de cada tipo rende carta (exceto a dama, que sempre rende)
          if (
            room.opts?.cards &&
            ['n', 'b', 'r', 'q'].includes(msg.captured) &&
            (msg.captured === 'q' || !room.captureRewards[movedColor].includes(msg.captured))
          ) {
            if (msg.captured !== 'q') room.captureRewards[movedColor].push(msg.captured);
            gainCardRandom(room, movedColor, room.opts);
          }
        }

        // Rodada nova quando as pretas movem: recarga dos poderes dos dois lados
        if (movedColor === 'b') {
          room.round = room.round + 1;
          reduceClassCooldownServer(room, 'w', 1);
          reduceClassCooldownServer(room, 'b', 1);
        }
        // Contador de eventos: o cliente que jogou dispara o evento e avisa no fx
        if (room.opts?.events) {
          room.eventPly = room.eventPly + 1;
          if (msg.fx?.event) room.eventPly = 0;
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
          fx: msg.fx || null,
        });
        broadcast(room, buildStatePayload(room));
      } else if (msg.type === 'sync') {
        // Resultado de uma carta/poder aplicado por quem jogou: tabuleiro, efeitos e consumo exato
        if (!side || room.winner) return;
        if (msg.fen) adoptFen(room, msg.fen);
        if (msg.fx) storeFx(room, msg.fx);
        const op = msg.op;
        if (op && typeof op === 'object') {
          const hand = room.hands[side] || (room.hands[side] = []);
          if (typeof op.remove === 'string') {
            const idx = hand.indexOf(op.remove);
            if (idx !== -1) {
              if (typeof op.replaceWith === 'string') hand[idx] = op.replaceWith;
              else hand.splice(idx, 1);
            }
          }
          if (op.spendPower) spendClassPowerServer(room, side, Math.max(1, Math.min(3, op.spendPower | 0)));
          if (op.flags && typeof op.flags === 'object') {
            for (const key of ['cardsUsed', 'powerUsed', 'sacrificeUsed']) {
              if (typeof op.flags[key] === 'boolean') room[key][side] = op.flags[key];
            }
          }
          if (Array.isArray(op.gain)) {
            for (const id of op.gain.slice(0, 9)) if (typeof id === 'string') gainCardServer(room, side, id);
          }
        }
        broadcast(room, buildStatePayload(room));
      } else if (msg.type === 'classPick') {
        // O lado vem da conexão (não do cliente) e a escolha, depois de feita, não pode mudar
        if (!side || !msg.class || !CLASS_CARD[msg.class]) return;
        room.classPicks = room.classPicks || {};
        if (room.classPicks[side]) return;
        room.classPicks[side] = msg.class;
        if (room.classPicks.w && room.classPicks.b) {
          room.classes.w = room.classPicks.w;
          room.classes.b = room.classPicks.b;
          // Regenerar as mãos com as classes definidas
          room.opts.classes = { w: room.classes.w, b: room.classes.b };
          room.hands = generateOpeningCards(room.opts);
          room.classPower = {
            w: { charges: 1, cooldown: CLASS_COOLDOWN },
            b: { charges: 1, cooldown: CLASS_COOLDOWN },
          };
          broadcast(room, {
            type: 'classReady',
            classes: { w: room.classes.w, b: room.classes.b },
            hands: room.hands,
            classPower: room.classPower,
            roulette: room.fx?.roulette || null,
          });
        }
      } else if (msg.type === 'cardPlay') {
        // O servidor valida a posse; o efeito é aplicado por quem jogou depois da contramagia
        if (!side || room.winner) {
          ws.send(JSON.stringify({ type: 'error', message: 'Não está na partida' }));
          return;
        }
        const playerSide = side;
        const card = msg.card;
        const target = msg.target;
        const isClassPower = !!msg.isClassPower;
        const powerId = msg.powerId;
        if (!card || !target) {
          ws.send(JSON.stringify({ type: 'error', message: 'Dados de carta inválidos' }));
          return;
        }
        if (room.turn !== playerSide) {
          ws.send(JSON.stringify({ type: 'error', message: 'Só é possível usar cartas na sua vez.' }));
          return;
        }
        if (isClassPower) {
          const p = room.classPower[playerSide];
          if (!p || p.charges < 1) {
            ws.send(JSON.stringify({ type: 'error', message: 'Sem cargas disponíveis para o poder.' }));
            return;
          }
          if (room.powerUsed[playerSide] || room.cardsUsed[playerSide]) {
            ws.send(JSON.stringify({ type: 'error', message: 'Você já usou o poder ou uma carta neste turno.' }));
            return;
          }
        } else {
          if (!room.hands[playerSide] || !room.hands[playerSide].includes(card)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Você não tem esta carta na mão' }));
            return;
          }
          const sacrificeExtra = card === 'sacrifice' && !room.sacrificeUsed[playerSide];
          if ((room.cardsUsed[playerSide] || room.powerUsed[playerSide]) && !sacrificeExtra) {
            ws.send(JSON.stringify({ type: 'error', message: 'Você já usou uma carta ou poder neste turno.' }));
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
        const otherWs = otherPlayer();
        if (
          opponentSide &&
          otherWs &&
          otherWs.readyState === 1 &&
          room.hands[opponentSide] &&
          room.hands[opponentSide].includes('counterspell') &&
          !room.cardsUsed[opponentSide]
        ) {
          // Guardar detalhes da carta - o consumo só acontece se a contramagia for usada
          room.pendingCard = { card, target, playerSide, isClassPower, powerId, responderWs: otherWs };
          // Sem resposta a tempo, a carta resolve normalmente (evita travar o jogo)
          room.pendingTimer = setTimeout(() => {
            const pending = room.pendingCard;
            if (!pending) return;
            const responderSide = room.sides.find((s) => s !== pending.playerSide);
            sendTo(pending.responderWs, { type: 'counterspellExpired' });
            resolvePendingCard(room, false, responderSide);
          }, COUNTERSPELL_TIMEOUT_MS);
          sendTo(otherWs, { type: 'counterspellRequest', card, target, playerSide, isClassPower, powerId });
          broadcast(room, buildStatePayload(room));
          return;
        }
        // Nenhuma contramagia disponível: quem jogou aplica o efeito e envia o resultado (sync)
        broadcast(room, { type: 'cardConfirmed', card, target, playerSide, isClassPower, powerId });
      } else if (msg.type === 'counterspellResponse') {
        // Servidor processa resposta de contramagia
        if (!side) return;
        const pending = room.pendingCard;
        if (!pending) return;
        // Só o oponente de quem jogou a carta pode responder
        if (side === pending.playerSide) return;
        const hasCounter = !!room.hands[side] && room.hands[side].includes('counterspell');
        resolvePendingCard(room, !!msg.accepted && hasCounter, side);
      } else if (msg.type === 'resign') {
        // Desistência: quem enviou perde; o lado vem da conexão
        if (!side || room.winner) return;
        clearPendingCard(room);
        clearPendingRequest(room);
        room.winner = side === 'w' ? 'b' : 'w';
        broadcast(room, { type: 'gameOver', reason: 'resign', loser: side, winner: room.winner });
      } else if (msg.type === 'mateAccepted') {
        // O jogador em xeque-mate recusou a "última chance": a partida termina para os dois
        if (!side || room.winner) return;
        clearPendingCard(room);
        clearPendingRequest(room);
        room.winner = side === 'w' ? 'b' : 'w';
        broadcast(room, { type: 'gameOver', reason: 'checkmate', loser: side, winner: room.winner });
      } else if (msg.type === 'request') {
        // Pedido de reinício ou empate: o oponente precisa aceitar
        const kind = msg.kind;
        if (!side || !['restart', 'draw'].includes(kind) || room.players.length < 2) return;
        if (kind === 'draw' && room.winner) return;
        if (room.pendingRequest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Já existe um pedido aguardando resposta.' }));
          return;
        }
        if (room.pendingCard) {
          ws.send(JSON.stringify({ type: 'error', message: 'Aguarde a resolução da carta em andamento.' }));
          return;
        }
        const otherWs = otherPlayer();
        if (!otherWs || otherWs.readyState !== 1) {
          ws.send(JSON.stringify({ type: 'error', message: 'O adversário não está conectado.' }));
          return;
        }
        room.pendingRequest = { kind, from: side, ws };
        room.requestTimer = setTimeout(() => resolveRequestDeclined(room, 'expired'), REQUEST_TIMEOUT_MS);
        otherWs.send(JSON.stringify({ type: 'request', kind, from: side }));
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
          room.winner = null;
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
