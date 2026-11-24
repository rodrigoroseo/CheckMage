import { Chess } from 'chess.js';
const heroSprites = import.meta.glob('./assets/pieces/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});
const classPortraits = import.meta.glob('./assets/classes/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const glyph = {
  wk: '♔',
  wq: '♕',
  wr: '♖',
  wb: '♗',
  wn: '♘',
  wp: '♙',
  bk: '♚',
  bq: '♛',
  br: '♜',
  bb: '♝',
  bn: '♞',
  bp: '♟',
};
const pieceName = { p: 'Peão', n: 'Cavalo', b: 'Bispo', r: 'Torre', q: 'Rainha', k: 'Rei' };
const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
const cardInfo = {
  treason: {
    name: 'Traição · Nv. 1',
    icon: '♜',
    desc: 'Converta um peão inimigo adjacente a uma peça sua.',
  },
  treason2: {
    name: 'Traição · Nv. 2',
    icon: '♜',
    desc: 'Converta um peão, cavalo ou bispo inimigo adjacente.',
  },
  treason3: {
    name: 'Traição · Nv. 3',
    icon: '♜',
    desc: 'Converta um peão, cavalo, bispo ou torre inimigo adjacente.',
  },
  kingLeap: {
    name: 'Salto do Rei',
    icon: '♚',
    desc: 'Neste turno, seu rei também pode se mover como um cavalo.',
  },
  counterspell: {
    name: 'Contramagia',
    icon: '⟲',
    desc: 'Resposta automática: cancele uma carta inimiga e consuma esta carta.',
  },
  sacrifice: {
    name: 'Sacrifício',
    icon: '†',
    desc: 'Elimine uma peça sua para ganhar cartas pelo valor dela.',
  },
  shield: {
    name: 'Escudo divino',
    icon: '⬡',
    desc: 'Proteja uma peça sua; ela não pode se mover até o início do seu próximo turno.',
  },
  resurrect: {
    name: 'Ressurreição · Nv. 1',
    icon: '✦',
    desc: 'Ressuscite um peão capturado na sua fileira inicial.',
  },
  resurrect2: {
    name: 'Ressurreição · Nv. 2',
    icon: '✦',
    desc: 'Ressuscite peões, bispos ou cavalos na sua fileira inicial.',
  },
  resurrect3: {
    name: 'Ressurreição · Nv. 3',
    icon: '✦',
    desc: 'Ressuscite peões, bispos, cavalos ou torres na sua fileira inicial.',
  },
  fury: {
    name: 'Fúria do peão',
    icon: '↯',
    desc: 'Escolha um peão para mover uma casa em qualquer direção.',
  },
  bishopShift: {
    name: 'Mudança de cor',
    icon: '⤢',
    desc: 'No início do seu próximo turno, mova um bispo uma casa na horizontal ou vertical.',
  },
  knightElephant: {
    name: 'Salto do elefante',
    icon: '♘',
    desc: 'Escolha um cavalo e salte duas casas na diagonal.',
  },
  towerRam: {
    name: 'Impacto da torre',
    icon: '⇥',
    desc: 'Escolha uma torre e mova para empurrar a peça inimiga logo adiante.',
  },
  bomb: {
    name: 'Armadilha',
    icon: '◉',
    desc: 'Escolha uma peça sua e arme uma casa dentro do alcance dela.',
  },
};
const classInfo = {
  warrior: { name: 'Guerreiro', icon: '⚔', card: 'fury', description: 'Fúria do Peão' },
  cleric: { name: 'Clérigo', icon: '✚', card: 'resurrect', description: 'Ressurreição' },
  paladin: { name: 'Paladino', icon: '⬡', card: 'shield', description: 'Escudo Divino' },
  mage: {
    name: 'Mago',
    icon: '✧',
    card: 'grimoire',
    description: 'Grimório: escolhe uma carta por uso; recarga dobrada',
  },
  warlock: { name: 'Bruxo', icon: '†', card: 'sacrifice', description: 'Sacrifício' },
  ranger: { name: 'Patrulheiro', icon: '⌁', card: 'bomb', description: 'Armadilha' },
  bard: { name: 'Bardo', icon: '♫', card: 'treason', description: 'Traição' },
};
const eventInfo = {
  quake: ['Terremoto', 'O centro do tabuleiro cedeu. Abismos bloqueiam o caminho.'],
  portal: ['Portal dimensional', 'Portais ativos! Pouse em um para atravessar o tabuleiro.'],
  swap: ['Troca de identidade', 'Casas marcadas mostram quais peças trocaram de lugar.'],
  mines: ['Campo minado', 'Minas ocultas foram espalhadas pelas casas centrais.'],
};
const modeNames = {
  classic: 'CAOS CLÁSSICO',
  roulette: 'ROLETA RUSSA',
  evolution: 'EVOLUÇÃO',
  fog: 'NÉVOA DE GUERRA',
};
const allCards = [
  'treason',
  'shield',
  'resurrect',
  'fury',
  'bishopShift',
  'knightElephant',
  'towerRam',
  'bomb',
  'kingLeap',
  'counterspell',
  'sacrifice',
];
// Configuração multiplayer
const MP = {
  room: null,
  code: null,
  player: null,
  side: null,
  ws: null,
  connected: false,
  opponentJoined: false,
  lastMoveTime: 0,
  serverHands: null,
  serverClasses: null,
};
const state = {
  game: null,
  opts: null,
  selected: null,
  legal: [],
  moves: [],
  snapshots: [],
  lastMove: null,
  round: 1,
  eventPly: 0,
  eventType: null,
  eventForecast: null,
  eventHighlights: [],
  activity: [],
  logView: 'moves',
  holes: [],
  portals: [],
  mines: [],
  shields: [],
  bombs: [],
  stunned: [],
  scheduledBishops: [],
  grimoirePicker: null,
  hands: { w: [], b: [] },
  dead: { w: [], b: [] },
  captureRewards: { w: [], b: [] },
  roundDeltas: [],
  roundMaterialBaseline: 0,
  sacrificeUsed: { w: false, b: false },
  cardsUsed: { w: false, b: false },
  powerUsed: { w: false, b: false },
  handSide: 'w',
  pendingCard: null,
  mateResponseOffered: false,
  classes: { w: null, b: null },
  enabledCards: [...allCards],
  classPower: { w: { charges: 0, cooldown: 0 }, b: { charges: 0, cooldown: 0 } },
  classRandom: false,
  enabledClasses: Object.keys(classInfo),
  furySide: null,
  knightElephant: null,
  towerRam: null,
  roulette: null,
  ended: false,
  dragFrom: null,
  motion: null,
  pointerDrag: null,
  suppressDragClick: false,
  promotionPending: null,
  classDraft: null,
  multiplayer: {
    room: null,
    code: null,
    player: null,
    ws: null,
    connected: false,
    opponentJoined: false,
  },
};
let audioContext = null,
  soundEnabled = true,
  musicEnabled = localStorage.getItem('checkmage-music') !== 'off',
  musicNodes = [],
  musicScene = '',
  musicTimer = null,
  musicStep = 0;
function playSound(kind) {
  if (!soundEnabled) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === 'suspended') audioContext.resume();
    const ctx = audioContext,
      now = ctx.currentTime;
    const tone = (freq, dur = 0.11, wave = 'sine', vol = 0.045, delay = 0, endFreq = freq) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + delay);
      if (endFreq !== freq)
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + delay + dur);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(vol, now + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    };
    const noise = (dur = 0.18, vol = 0.04, delay = 0, cutoff = 900) => {
      const n = Math.floor(ctx.sampleRate * dur),
        buffer = ctx.createBuffer(1, n, ctx.sampleRate),
        data = buffer.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      src.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(vol, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(now + delay);
    };
    const patterns = {
      ui: () => tone(760, 0.055, 'sine', 0.025),
      select: () => tone(560, 0.08, 'triangle', 0.035, 0, 720),
      cancel: () => {
        tone(540, 0.1, 'triangle', 0.035);
        tone(360, 0.14, 'sine', 0.025, 0.07);
      },
      move: () => {
        noise(0.045, 0.032, 0, 1400);
        tone(190, 0.07, 'triangle', 0.022);
      },
      capture: () => {
        noise(0.14, 0.07, 0, 700);
        tone(115, 0.12, 'triangle', 0.045);
        tone(260, 0.08, 'sine', 0.025, 0.07);
      },
      promotion: () => {
        tone(440, 0.17, 'sine', 0.04);
        tone(660, 0.2, 'sine', 0.04, 0.08);
        tone(880, 0.25, 'triangle', 0.035, 0.17);
      },
      check: () => {
        tone(310, 0.12, 'triangle', 0.05);
        tone(210, 0.16, 'sine', 0.04, 0.09);
      },
      mate: () => {
        tone(370, 0.4, 'triangle', 0.055);
        tone(277, 0.5, 'sine', 0.05, 0.06);
        tone(185, 0.65, 'sine', 0.05, 0.15);
      },
      draw: () => {
        tone(520, 0.2, 'sine', 0.035);
        tone(390, 0.28, 'sine', 0.035, 0.12);
      },
      quake: () => {
        noise(0.55, 0.13, 0, 260);
        tone(75, 0.5, 'sawtooth', 0.09, 0, 42);
      },
      portal: () => {
        tone(260, 0.5, 'sine', 0.05, 0, 1050);
        tone(780, 0.26, 'sine', 0.035, 0.26, 360);
      },
      swap: () => {
        tone(330, 0.2, 'sine', 0.045);
        tone(620, 0.2, 'triangle', 0.04, 0.14);
        tone(430, 0.26, 'sine', 0.04, 0.29);
      },
      fog: () => {
        noise(0.65, 0.045, 0, 500);
        tone(220, 0.5, 'sine', 0.025, 0, 165);
      },
      mines: () => {
        tone(180, 0.28, 'triangle', 0.035, 0, 85);
        noise(0.2, 0.04, 0.17, 420);
      },
      bomb: () => {
        tone(220, 0.12, 'square', 0.025);
        tone(180, 0.12, 'square', 0.025, 0.16);
        tone(130, 0.35, 'sawtooth', 0.06, 0.32, 45);
        noise(0.5, 0.09, 0.33, 350);
      },
      cardSelect: () => {
        tone(520, 0.08, 'triangle', 0.03);
        tone(780, 0.11, 'sine', 0.025, 0.06);
      },
      cardTreason: () => {
        tone(260, 0.11, 'sawtooth', 0.045);
        tone(390, 0.16, 'triangle', 0.04, 0.1);
      },
      cardShield: () => {
        tone(440, 0.24, 'sine', 0.04);
        tone(660, 0.35, 'sine', 0.035, 0.11);
      },
      cardResurrect: () => {
        tone(330, 0.26, 'sine', 0.04);
        tone(494, 0.3, 'sine', 0.04, 0.12);
        tone(659, 0.4, 'triangle', 0.04, 0.24);
      },
      cardFury: () => {
        tone(180, 0.15, 'sawtooth', 0.045, 0, 390);
        noise(0.12, 0.04, 0.08, 1200);
      },
      cardBishop: () => {
        tone(380, 0.17, 'triangle', 0.04);
        tone(520, 0.18, 'sine', 0.035, 0.12, 740);
      },
      cardKnight: () => {
        tone(240, 0.12, 'triangle', 0.04);
        tone(360, 0.12, 'triangle', 0.04, 0.1);
        tone(530, 0.19, 'sine', 0.04, 0.2);
      },
      cardTower: () => {
        tone(100, 0.23, 'square', 0.04);
        noise(0.15, 0.055, 0.15, 500);
      },
      cardBomb: () => {
        tone(690, 0.12, 'sine', 0.04);
        tone(380, 0.2, 'square', 0.035, 0.12);
      },
      cardDefault: () => {
        tone(440, 0.16, 'triangle', 0.04);
        tone(600, 0.22, 'sine', 0.035, 0.1);
      },
      cardSacrifice: () => {
        tone(220, 0.2, 'sawtooth', 0.035, 0, 90);
        tone(330, 0.28, 'triangle', 0.035, 0.16);
      },
      illegal: () => {
        tone(190, 0.11, 'square', 0.035);
        tone(145, 0.15, 'square', 0.025, 0.1);
      },
    };
    patterns[kind]?.();
  } catch {}
}
function stopAmbient() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  for (const node of musicNodes) {
    try {
      node.stop();
      node.disconnect();
    } catch {}
  }
  musicNodes = [];
  musicScene = '';
}
function startAmbient(scene) {
  if (!musicEnabled || !scene) return;
  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audioContext = new Context();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  if (musicScene === scene && musicNodes.length) return;

  stopAmbient();
  musicScene = scene;
  musicStep = 0;
  const context = audioContext;
  const roots = [73.42, 110, 146.83];

  for (const [index, frequency] of roots.entries()) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    gain.gain.value = index === 0 ? 0.007 : 0.0028;
    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.start();
    musicNodes.push(oscillator);
  }

  const scale = [
    146.83, 174.61, 220, 261.63, 220, 196, 174.61, 164.81, 146.83, 196, 220, 293.66, 261.63, 220,
    196, 174.61,
  ];
  const melodies = [
    null,
    {
      notes: [
        293.66, 0, 261.63, 0, 220, 0, 261.63, 293.66, 349.23, 0, 293.66, 0, 261.63, 220, 196, 0,
      ],
      wave: 'sine',
      cutoff: 1150,
      volume: 0.0065,
    },
    {
      notes: [
        220, 261.63, 293.66, 261.63, 196, 220, 261.63, 0, 174.61, 220, 261.63, 293.66, 261.63, 220,
        196, 0,
      ],
      wave: 'triangle',
      cutoff: 1500,
      volume: 0.0055,
    },
    {
      notes: [392, 0, 349.23, 0, 293.66, 0, 261.63, 0, 349.23, 0, 392, 0, 440, 0, 349.23, 0],
      wave: 'sine',
      cutoff: 1700,
      volume: 0.0045,
    },
    {
      notes: [293.66, 0, 261.63, 0, 220, 0, 196, 0, 261.63, 0, 293.66, 0, 349.23, 0, 261.63, 0],
      wave: 'triangle',
      cutoff: 850,
      volume: 0.0045,
    },
  ];
  const play = (frequency, duration, volume, wave = 'triangle', cutoff = 900) => {
    if (!frequency) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const time = context.currentTime;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, time);
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  };

  musicTimer = setInterval(() => {
    if (!musicEnabled || context.state !== 'running') return;
    const tick = musicStep++;
    const step = tick % 16;
    const voice = scene === 'game' && tick >= 32 ? 1 + (Math.floor((tick - 32) / 32) % 4) : 0;
    play(scale[step], step % 4 === 0 ? 0.48 : 0.28, step % 4 === 0 ? 0.014 : 0.009);
    if (step % 4 === 0)
      play([73.42, 65.41, 55, 65.41][Math.floor(step / 4)], 0.8, 0.009, 'sine', 420);
    if (step === 7 || step === 15) play(scale[step] + 146.83, 0.22, 0.003, 'sine', 420);

    const melody = melodies[voice];
    if (melody && step % 2 === 0) {
      play(
        melody.notes[step],
        step % 4 === 0 ? 0.62 : 0.42,
        melody.volume,
        melody.wave,
        melody.cutoff,
      );
    }
  }, 428);
}
function chosenSetup() {
  const globalOn = $('#toggle-cards').checked;
  return {
    events: $('#toggle-events').checked,
    eventTypes: $$('input[name="event"]:checked').map((x) => x.value),
    cards: globalOn && $('#toggle-individual-cards').checked,
    classes: globalOn && $('#toggle-classes').checked,
    randomClasses: $('#random-classes').checked,
    enabledClasses: $$('#class-icons [aria-pressed="true"]').map((b) => b.dataset.class),
    enabledCards: $$('#card-icons [aria-pressed="true"]').map((b) => b.dataset.card),
    mode: $('.mode-card.selected').dataset.mode,
  };
}
function showSetup() {
  clearPieceMotion();
  state.classDraft = null;
  $('#class-draft')?.classList.add('hidden');
  $('#board')?.classList.remove('board-draft-dim');
  $('#game-screen').classList.add('hidden');
  $('#setup-screen').classList.remove('hidden');
  clearModal();
  startAmbient('setup');
}
function newGame() {
  clearPieceMotion();
  state.game = new Chess();
  state.opts = chosenSetup();
  state.selected = null;
  state.legal = [];
  state.moves = [];
  state.snapshots = [];
  state.lastMove = null;
  state.round = 1;
  state.eventPly = 0;
  state.eventType = null;
  state.eventForecast = null;
  state.eventHighlights = [];
  state.activity = [];
  state.logView = 'moves';
  state.holes = [];
  state.portals = [];
  state.mines = [];
  state.shields = [];
  state.bombs = [];
  state.stunned = [];
  state.scheduledBishops = [];
  state.grimoirePicker = null;
  state.hands = { w: [], b: [] };
  state.dead = { w: [], b: [] };
  state.captureRewards = { w: [], b: [] };
  state.roundDeltas = [];
  state.roundMaterialBaseline = 0;
  state.sacrificeUsed = { w: false, b: false };
  state.cardsUsed = { w: false, b: false };
  state.handSide = 'w';
  state.pendingCard = null;
  state.counterspellPending = null;
  state.waitingForCounterspell = false;
  state.mateResponseOffered = false;
  state.classes = { w: null, b: null };
  state.classPower = { w: { charges: 0, cooldown: 0 }, b: { charges: 0, cooldown: 0 } };
  state.powerUsed = { w: false, b: false };
  state.enabledClasses = state.opts.enabledClasses;
  state.enabledCards = state.opts.enabledCards;
  state.classRandom = state.opts.randomClasses;
  state.furySide = null;
  state.knightElephant = null;
  state.towerRam = null;
  state.roulette = null;
  state.ended = false;
  state.promotionPending = null;
  state.motion = null;
  state.classDraft = null;
  $('#setup-screen').classList.add('hidden');
  $('#game-screen').classList.remove('hidden');
  $('#hands-panel').classList.toggle('hidden', !state.opts.cards && !state.opts.classes);
  $('#mode-label').textContent = modeNames[state.opts.mode];
  $('#event-banner').classList.add('hidden');
  prepareEventForecast();
  if (state.opts.classes && state.enabledClasses.length && !state.classRandom) {
    state.classDraft = { step: 0, picks: { w: null, b: null } };
    $('.game-heading .eyebrow').innerHTML = '<span class="live-dot"></span> PREPARAÇÃO DA PARTIDA';
    $('.game-heading h1').innerHTML = 'Escolha os <span>poderes.</span>';
    render();
    return;
  }
  if (state.opts.classes && state.enabledClasses.length)
    state.classes = { w: random(state.enabledClasses), b: random(state.enabledClasses) };
  beginMatch();
}
function beginMatch() {
  const sides = ['w', 'b'],
    powerIds = { w: classCardIds('w'), b: classCardIds('b') },
    cardCount = 3;
  let openingCards = { w: [], b: [] };
  // Em multiplayer, usar as mãos geradas pelo servidor (autoridade)
  const useServerHands = MP.connected && MP.serverHands && (MP.serverHands.w?.length || MP.serverHands.b?.length);
  if (useServerHands) {
    for (const side of sides) {
      openingCards[side] = [...(MP.serverHands[side] || [])];
    }
  } else if (state.opts.cards) {
    const pools = Object.fromEntries(
        sides.map((side) => [
          side,
          state.enabledCards.filter((id) => !powerIds[side].includes(id)),
        ]),
      ),
      equalCount = Math.min(cardCount, ...sides.map((side) => pools[side].length));
    for (const side of sides) {
      while (pools[side].length && openingCards[side].length < equalCount) {
        const id = random(pools[side]);
        openingCards[side].push(id);
        pools[side].splice(pools[side].indexOf(id), 1);
      }
    }
  }
  for (const side of sides) {
    if (state.classes[side]) state.classPower[side] = { charges: 1, cooldown: 0 };
    const base = openingCards[side].filter((id) => id !== 'classPower');
    const hand = [];
    if (state.opts.classes && state.classes[side]) hand.push('classPower');
    hand.push(...base);
    state.hands[side] = hand;
  }
  state.classDraft = null;
  $('.game-heading .eyebrow').innerHTML = '<span class="live-dot"></span> PARTIDA EM ANDAMENTO';
  $('.game-heading h1').innerHTML = 'A batalha foi <span>traçada.</span>';
  $('#class-draft').classList.add('hidden');
  $('#board').classList.remove('board-draft-dim');
  $('#hands-panel').classList.toggle('hidden', !state.opts.cards && !state.opts.classes);
  startAmbient('game');
  if (state.opts.mode === 'roulette') rollRoulette();
  render();
}

function renderClassDraft() {
  const root = $('#class-draft');
  if (!root) return;
  const draft = state.classDraft;
  root.classList.toggle('hidden', !draft);
  $('#board').classList.toggle('board-draft-dim', Boolean(draft));
  if (!draft) return;
  const side = Object.keys(draft.picks)[0] || 'w';
  const label = side === 'w' ? 'Brancas' : 'Pretas';
  const selected = draft.picks[side];
  const isMulti = MP.connected;
  root.innerHTML =
    '<div class="draft-kicker">ESCOLHA DE CLASSE</div><h2 id="class-draft-title">' +
    label +
    ', escolha sua classe</h2><p>' +
    (isMulti
      ? 'Escolha o poder do seu lado antes de começar.'
      : 'Cada lado define seu próprio poder antes do primeiro lance.') +
    '</p><div class="draft-classes">' +
    state.enabledClasses
      .map((id) => {
        const cls = classInfo[id];
        return (
          '<button type="button" class="draft-class' +
          (selected === id ? ' selected' : '') +
          '" data-draft-class="' +
          id +
          '" aria-pressed="' +
          (selected === id) +
          '"><span>' +
          cls.icon +
          '</span><b>' +
          cls.name +
          '</b><small>' +
          cls.description +
          '</small></button>'
        );
      })
      .join('') +
    '</div><div class="draft-actions"><button type="button" class="button" id="draft-cancel">Cancelar</button><button type="button" class="button button-start" id="draft-confirm" ' +
    (selected ? '' : 'disabled') +
    '>' +
    (isMulti ? 'Confirmar' : draft.step === 0 ? 'Confirmar Brancas' : 'Iniciar partida') +
    ' <span>↗</span></button></div>';
  $$('[data-draft-class]', root).forEach((button) =>
    button.addEventListener('click', () => {
      draft.picks[side] = button.dataset.draftClass;
      renderClassDraft();
    }),
  );
  $('#draft-cancel', root).addEventListener('click', showSetup);
  $('#draft-confirm', root).addEventListener('click', () => {
    if (!draft.picks[side]) return;
    if (isMulti) {
      state.classes[side] = draft.picks[side];
      MP.ws &&
        MP.ws.readyState === 1 &&
        MP.ws.send(JSON.stringify({ type: 'classPick', side, class: draft.picks[side] }));
      if (state.classes.w && state.classes.b) beginMatch();
      else {
        $('.game-heading .eyebrow').innerHTML = '<span class="live-dot"></span> ESPERANDO ADVERSÁRIO';
        $('.game-heading h1').innerHTML = 'Seu oponente está escolhendo a classe.';
        render();
      }
    } else if (draft.step === 0) {
      draft.step = 1;
      renderClassDraft();
    } else {
      state.classes = { ...draft.picks };
      beginMatch();
    }
  });
}

function random(a) {
  return a[Math.floor(Math.random() * a.length)];
}
function classCardIds(side) {
  const cls = state.classes?.[side],
    card = classInfo[cls]?.card;
  if (!card || card === 'grimoire') return [];
  return card === 'treason'
    ? ['treason', 'treason2', 'treason3']
    : card === 'resurrect'
      ? ['resurrect', 'resurrect2', 'resurrect3']
      : [card];
}
function cardLevel(id, side, classPower = false) {
  if (classPower && ['treason', 'resurrect'].includes(id))
    return state.classPower[side].charges;
  if (id.endsWith('3')) return 3;
  if (id.endsWith('2')) return 2;
  return 1;
}
function leveledCardId(id, level) {
  return level > 1 ? `${id}${level}` : id;
}
function pieceLevelCost(type) {
  return type === 'p' ? 1 : ['n', 'b'].includes(type) ? 2 : type === 'r' ? 3 : Infinity;
}
function handCards(side) {
  return state.hands[side].filter((id) => id !== 'classPower');
}
function classCooldownLength() {
  return 20;
}
function captureCooldownReduction(type) {
  if (type === 'n' || type === 'b') return 1;
  if (type === 'r') return 2;
  if (type === 'q') return 3;
  if (type === 'p') return 1;
  return 0;
}
function settleClassCharge(side) {
  const power = state.classPower[side];
  if (power.cooldown <= 0 && power.charges < 3) {
    power.charges++;
    power.cooldown = power.charges < 3 ? classCooldownLength() : 0;
  }
}
function reduceClassCooldown(side, amount = 1) {
  const power = state.classPower[side];
  if (!state.classes[side] || amount <= 0) return;
  if (power.cooldown <= 0) power.cooldown = classCooldownLength();
  power.cooldown = Math.max(0, power.cooldown - amount);
  if (power.cooldown === 0) {
    power.charges++;
    power.cooldown = power.charges < 3 ? classCooldownLength() : 0;
  }
}
function tickClassRounds() {
  for (const side of ['w', 'b']) reduceClassCooldown(side, 1);
}
function spendClassPower(side, amount = 1) {
  const power = state.classPower[side];
  power.charges = Math.max(0, power.charges - amount);
  if (power.charges < 3 && power.cooldown <= 0) power.cooldown = classCooldownLength();
}
function hasInitialCardTarget(id, side) {
  const us = side,
    them = us === 'w' ? 'b' : 'w';
  if (id === 'sacrifice')
    return (
      state.enabledCards.some((card) => card !== 'sacrifice' && !classCardIds(us).includes(card)) &&
      allSquares().some(
        (s) =>
          pieceAt(s)?.color === us &&
          ['p', 'n', 'b', 'r'].includes(pieceAt(s)?.type) &&
          !isShielded(s),
      )
    );
  if (id === 'shield')
    return allSquares().some(
      (s) => pieceAt(s)?.color === us && !isRoyalPiece(pieceAt(s)) && !isShielded(s),
    );
  if (id.startsWith('treason')) {
    const level = id === 'treason3' ? 3 : id === 'treason2' ? 2 : 1,
      allowed = level === 1 ? ['p'] : level === 2 ? ['p', 'n', 'b'] : ['p', 'n', 'b', 'r'];
    return allSquares().some(
      (s) =>
        pieceAt(s)?.color === us &&
        !isChaosImmune(s) &&
        !isShielded(s) &&
        allSquares().some(
          (t) =>
            pieceAt(t)?.color === them &&
            allowed.includes(pieceAt(t)?.type) &&
            !isShielded(t) &&
            adjacent(s, t),
        ),
    );
  }
  if (id.startsWith('resurrect')) {
    const level = id === 'resurrect3' ? 3 : id === 'resurrect2' ? 2 : 1,
      allowed = level === 1 ? ['p'] : level === 2 ? ['p', 'n', 'b'] : ['p', 'n', 'b', 'r'];
    return state.dead[us].some((p) => allowed.includes(p.type));
  }
  if (id === 'kingLeap')
    return allSquares().some(
      (s) =>
        pieceAt(s)?.color === us &&
        pieceAt(s)?.type === 'k' &&
        safeVariantMoves(kingKnightMoves(s, us), us).length,
    );
  if (id === 'fury')
    return allSquares().some(
      (s) =>
        pieceAt(s)?.color === us &&
        pieceAt(s)?.type === 'p' &&
        safeVariantMoves(furyMoves(s, us), us).length,
    );
  if (id === 'bishopShift')
    return allSquares().some(
      (s) =>
        pieceAt(s)?.color === us &&
        pieceAt(s)?.type === 'b' &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([df, dr]) => {
          const p = parseSquare(s),
            x = p.f + df,
            y = p.r + dr;
          if (x < 0 || x > 7 || y < 0 || y > 7) return false;
          const t = squareName(x, y),
            q = pieceAt(t);
          return (
            !state.holes.includes(t) &&
            !isShielded(t) &&
            (!q || (q.color !== us && !isRoyalPiece(q)))
          );
        }),
    );
  if (id === 'knightElephant')
    return allSquares().some(
      (s) =>
        pieceAt(s)?.color === us &&
        pieceAt(s)?.type === 'n' &&
        safeVariantMoves(elephantMoves(s, us), us).length,
    );
  if (id === 'towerRam')
    return allSquares().some(
      (s) =>
        pieceAt(s)?.color === us &&
        pieceAt(s)?.type === 'r' &&
        state.game
          .moves({ square: s, verbose: true })
          .some(
            (m) =>
              !state.holes.includes(m.to) &&
              !crossesHole(m.from, m.to, m.piece) &&
              !isShielded(m.to),
          ),
    );
  if (id === 'bomb')
    return allSquares().some((s) => {
      const p = pieceAt(s);
      return (
        p?.color === us &&
        !isRoyalPiece(p) &&
        !isShielded(s) &&
        state.game.moves({ square: s, verbose: true }).some((m) => {
          const r = parseSquare(m.to).r;
          return (
            r >= 2 &&
            r <= 5 &&
            !isShielded(m.to) &&
            !isRoyalPiece(pieceAt(m.to)) &&
            !state.holes.includes(m.to)
          );
        })
      );
    });
  return true;
}
function useClassPower(index, skipCounterspell = false) {
  if (state.motion) {
    toast('Aguarde a peça concluir o movimento.');
    return;
  }
  const side = state.game.turn();
  // Em multiplayer, só pode usar poder do lado controlado por este jogador
  if (MP.connected && side !== (MP.side || 'w')) {
    toast('Use o poder do lado que está na vez.');
    return;
  }
  const cls = state.classes[side],
    power = state.classPower[side];
  if (!cls || power.charges < 1) {
    toast('Sem cargas disponíveis.');
    return;
  }
  if (state.powerUsed[side] || state.cardsUsed[side]) {
    toast('Você já usou o poder ou uma carta este turno.');
    return;
  }
  if (cls === 'mage') {
    const choices = state.enabledCards.filter(
      (id) => id !== 'counterspell' && !classCardIds(side).includes(id),
    );
    if (!choices.length) {
      toast('Ative ao menos uma carta além de Contramagia para usar o Grimório.');
      return;
    }
    state.grimoirePicker = {
      index,
      skipCounterspell,
      choices,
    };
    render();
    return;
  }
  useCard(index, skipCounterspell, classInfo[cls].card, true);
}
function squareName(f, r) {
  return 'abcdefgh'[f] + (r + 1);
}
function parseSquare(s) {
  return { f: 'abcdefgh'.indexOf(s[0]), r: Number(s[1]) - 1 };
}
function allSquares() {
  return [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, f) => squareName(f, r)));
}
function pieceAt(s) {
  return state.game.get(s);
}
function isRoyalPiece(piece) {
  return Boolean(piece && ['k', 'q'].includes(piece.type));
}
function isShielded(square) {
  return state.shields.some((x) => x.square === square);
}
function isChaosImmune(square) {
  return isRoyalPiece(pieceAt(square)) || isShielded(square);
}
function revokeCastlingRight(fen, square, piece) {
  if (piece === 'K' && square === 'e1') fen[2] = (fen[2] || '').replace(/[KQ]/g, '');
  if (piece === 'k' && square === 'e8') fen[2] = (fen[2] || '').replace(/[kq]/g, '');
  if (piece === 'R' && square === 'h1') fen[2] = (fen[2] || '').replace('K', '');
  if (piece === 'R' && square === 'a1') fen[2] = (fen[2] || '').replace('Q', '');
  if (piece === 'r' && square === 'h8') fen[2] = (fen[2] || '').replace('k', '');
  if (piece === 'r' && square === 'a8') fen[2] = (fen[2] || '').replace('q', '');
  if (!fen[2]) fen[2] = '-';
}
/* Individual transparent PNGs keep neighboring characters out of each sprite. */
function pieceSpriteHtml(type, color) {
  const key = `./assets/pieces/${color}-${type}.png`;
  return `<img class="piece-art piece-${type} sprite-${color}" src="${heroSprites[key]}" alt="" aria-hidden="true" draggable="false">`;
}
function render() {
  if (!state.game) return;
  renderClassDraft();
  renderBoard();
  renderStatus();
  renderMoves();
  renderActivity();
  renderHand();
  renderEvent();
  renderCaptureStats();
  renderResurrectionChoices();
  renderGrimoirePicker();
  renderClassPortraits();
  const boardWrap = $('.board-wrap');
  if (boardWrap) boardWrap.classList.toggle('waiting', state.waitingForCounterspell);
}
function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  board.classList.toggle('black-selected', state.selected && pieceAt(state.selected)?.color === 'b');
  board.classList.toggle('white-selected', state.selected && pieceAt(state.selected)?.color === 'w');
  const selectedMoves = state.legal;
  const visible = state.opts.mode === 'fog' ? fogVisible() : new Set();
  const flipped = MP.connected && MP.side === 'b';
  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const $boardWrap = $('.board-column');
  if ($boardWrap) {
    $boardWrap.classList.toggle('flipped', flipped);
  }
  for (const r of ranks)
    for (const f of files) {
      const s = squareName(f, r),
        p = pieceAt(s),
        el = document.createElement('button');
      el.type = 'button';
      el.className = `square ${(f + r) % 2 ? 'dark' : 'light'}`;
      el.dataset.square = s;
      el.style.setProperty('--rank', String(r));
      el.style.setProperty('--grain-x', `${((f % 4) / 3) * 100}%`);
      el.style.setProperty('--grain-y', `${(((7 - r) % 4) / 3) * 100}%`);
      el.setAttribute('role', 'gridcell');
      el.setAttribute(
        'aria-label',
        `${s}${p ? `, ${p.color === 'w' ? 'branca' : 'preta'} ${pieceName[p.type]}` : ''}`,
      );
      el.draggable = false;
      el.addEventListener('pointerdown', (e) => startPointerDrag(e, s));
      if (state.lastMove && (s === state.lastMove.from || s === state.lastMove.to))
        el.classList.add('last-move');
      if (state.eventHighlights.includes(s)) el.classList.add('event-swap');
      if (state.eventForecast?.squares?.includes(s)) el.classList.add('event-forecast');
      if (state.scheduledBishops.some((x) => x.from === s || x.to === s))
        el.classList.add('bishop-scheduled');
      if (state.stunned.some((x) => x.square === s)) el.classList.add('piece-stunned');
      if (s === state.selected) el.classList.add('selected');
      const lm = selectedMoves.find((m) => m.to === s);
      if (lm) {
        el.classList.add('legal');
        if (lm.captured) el.classList.add('capture');
      }
      if (state.holes.includes(s)) el.classList.add('hole');
      if (state.portals.includes(s)) el.classList.add('portal');
      /* Environmental mines stay hidden until a piece triggers one. */ if (p)
        el.classList.add(p.color === 'w' ? 'white-piece' : 'black-piece');
      if (visible.size && !visible.has(s)) {
        el.classList.add('fogged');
        el.setAttribute('aria-label', s + ', sob névoa');
      }
      if (cardTargetSquares().includes(s)) el.classList.add('card-target');
      if (state.pendingCard?.source === s) el.classList.add('card-source');
      if (flipped ? f === 7 : f === 0) {
        const rank = document.createElement('span');
        rank.className = 'coordinate rank-label';
        rank.textContent = String(r + 1);
        el.append(rank);
      }
      if (r === 0) {
        const file = document.createElement('span');
        file.className = 'coordinate file-label';
        file.textContent = 'abcdefgh'[f];
        el.append(file);
      }
      if (p && state.motion?.to !== s) {
        const piece = document.createElement('span');
        piece.className = 'piece';
        piece.innerHTML = pieceSpriteHtml(p.type, p.color);
        el.append(piece);
      }
      const badge = state.shields.find((x) => x.square === s);
      if (badge) {
        const b = document.createElement('span');
        b.className = 'square-badge shield-badge';
        b.textContent = '⬡';
        el.append(b);
      }
      const trapSource = state.bombs.find((x) => x.source === s);
      if (trapSource) {
        const sourceBadge = document.createElement('span');
        sourceBadge.className = 'square-badge trap-source-badge';
        sourceBadge.textContent = '⌁';
        sourceBadge.title = `Origem da armadilha em ${trapSource.square}`;
        el.append(sourceBadge);
      }
      const bomb = state.bombs.find((x) => x.square === s);
      if (bomb) {
        el.classList.add('bomb-cell');
        el.setAttribute(
          'aria-label',
          `${el.getAttribute('aria-label')}, armadilha armada, ${bomb.turns} turnos restantes`,
        );
        const b = document.createElement('span');
        b.className = 'square-badge bomb-badge';
        b.textContent = `◉ ${bomb.turns}`;
        el.append(b);
      }
      if (state.stunned.some((x) => x.square === s)) {
        const b = document.createElement('span');
        b.className = 'square-badge stunned-badge';
        b.textContent = 'Zz';
        el.append(b);
      }
      el.addEventListener('click', (event) => {
        if (event.target.closest('.promotion-picker')) return;
        onSquare(s);
      });
      board.append(el);
    }
}

function renderStatus() {
  const c = state.game.turn(),
    check = state.game.isCheck() && !(state.opts.mode === 'fog' && fogHasHiddenCheck(c)),
    name = c === 'w' ? 'Brancas' : 'Pretas';
  $('#turn-name').textContent = name;
  $('.turn-piece').textContent = c === 'w' ? '♙' : '♟';
  $('.turn-piece').classList.toggle('black-turn', c === 'b');
  $('#check-badge').classList.toggle('hidden', !check);
  $('#move-count').textContent = `MOVIMENTO ${String(state.round).padStart(2, '0')}`;
  $('#round-chip').textContent = `RODADA ${state.round}`;
  $('#ply-count').textContent = `${state.moves.length} LANCES`;
  $('#card-selection').classList.toggle('hidden', !state.pendingCard || state.waitingForCounterspell);
}
function boardMaterial(side) {
  let total = 0;
  for (const s of allSquares()) {
    const p = pieceAt(s);
    if (p && p.color === side && p.type !== 'k') total += values[p.type] || 0;
  }
  return total;
}
function capturedMaterial() {
  return { w: boardMaterial('w'), b: boardMaterial('b') };
}
function renderCaptureStats() {
  const sides = [
    ['w', 'Brancas', 'b'],
    ['b', 'Pretas', 'w'],
  ];
  const score = { w: boardMaterial('w'), b: boardMaterial('b') };
  const counts = { w: {}, b: {} };
  for (const [side, label, victim] of sides) {
    const captured = state.dead[victim];
    for (const item of captured) {
      if (item.sacrificed) continue;
      counts[victim][item.type] = (counts[victim][item.type] || 0) + 1;
    }
    const row = $(`[data-capture-side="${side}"]`);
    if (!row) return;
    const pieces = ['q', 'r', 'b', 'n', 'p']
      .filter((type) => counts[victim][type])
      .map(
        (type) =>
          `<span class="captured-piece" title="${pieceName[type]} ×${counts[victim][type]}">${pieceSpriteHtml(type, victim)}<small>×${counts[victim][type]}</small></span>`,
      )
      .join('');
    const c = side === 'w' ? 'w' : 'b';
    row.innerHTML = `<b class="capture-side-label ${c}">${c === 'w' ? '♙' : '♟'} ${label}</b><span class="captured-rack">${pieces || '<small class="no-captures">Sem capturas</small>'}</span><span class="capture-charges">`;
    row.innerHTML += Array.from({ length: state.classPower[c]?.charges || 0 }, () => `<i class="filled"></i>`).join('');
    row.innerHTML += Array.from({ length: 3 - (state.classPower[c]?.charges || 0) }, () => `<i></i>`).join('');
    row.innerHTML += '</span>';
  }
  const delta = score.w - score.b;
  const sideWScore = delta,
    sideBScore = -delta;
  const label = `${sideWScore > 0 ? '+' : ''}${sideWScore}`;
  const materialHtml = `<span class="material-score material-w">${label}</span><img class="piece-art sprite-w piece-k" src="${heroSprites['./assets/pieces/w-k.png']}" alt="Rei branco" aria-hidden="true"><i class="material-gold-bar"></i><img class="piece-art sprite-b piece-k" src="${heroSprites['./assets/pieces/b-k.png']}" alt="Rei preto" aria-hidden="true"><span class="material-score material-b">${sideBScore > 0 ? '+' : ''}${sideBScore}</span>`;
  const mb = $('#material-balance');
  mb.innerHTML = materialHtml;
}
function renderMoves() {
  const root = $('#move-list');
  if (!state.moves.length) {
    root.innerHTML = '<div class="empty-moves">A primeira jogada é sua.</div>';
    return;
  }
  const rows = [];
  for (let i = 0; i < state.moves.length; i += 2) {
    const a = state.moves[i],
      b = state.moves[i + 1],
      delta = b ? state.roundDeltas[Math.floor(i / 2)] : undefined,
      roundNote =
        delta === undefined
          ? ''
          : delta === 0
            ? '±0'
            : `+${Math.abs(delta)} ${delta > 0 ? 'B' : 'P'}`;
    rows.push(
      `<div class="move-row"><span class="move-no">${String(Math.floor(i / 2) + 1).padStart(2, '0')}</span><span class="${i === state.moves.length - 1 ? 'current' : ''}">${a}</span><span class="${i + 1 === state.moves.length - 1 ? 'current' : ''}">${b || '·'}</span><small class="round-material">${roundNote}</small></div>`,
    );
  }
  root.innerHTML = rows.join('');
  root.scrollTop = root.scrollHeight;
}
function renderActivity() {
  const root = $('#activity-list');
  if (!root) return;
  root.replaceChildren();
  const icon = { card: '▤', power: '✦', event: '✳' };
  if (!state.activity.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-moves';
    empty.textContent = 'Nenhuma carta usada ou evento ocorrido ainda.';
    root.append(empty);
  } else {
    for (const item of [...state.activity].reverse()) {
      const row = document.createElement('div');
      row.className = `activity-row ${item.kind}`;
      const glyph = document.createElement('span');
      glyph.className = 'activity-glyph';
      glyph.textContent = icon[item.kind];
      const details = document.createElement('div');
      details.className = 'activity-details';
      const label = document.createElement('b');
      label.textContent = item.title;
      const description = document.createElement('small');
      description.textContent = item.text;
      details.append(label, description);
      const meta = document.createElement('span');
      meta.className = `activity-side ${item.color}`;
      meta.textContent = item.color === 'w' ? 'B' : 'P';
      row.append(glyph, details, meta);
      root.append(row);
    }
  }
  $('#move-list').classList.toggle('hidden', state.logView !== 'moves');
  root.classList.toggle('hidden', state.logView !== 'activity');
  $$('.history-tab').forEach((btn) => {
    const active = btn.dataset.view === state.logView;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}
function recordActivity(kind, title, text, color) {
  state.activity.push({ kind, title, text, color: color || state.game.turn() });
  if (state.activity.length > 40) state.activity.shift();
  renderActivity();
}
function setLogView(view) {
  state.logView = view;
  renderActivity();
}
function renderResurrectionChoices() {
  const root = $('#resurrection-choices');
  if (!root) return;
  const wrap = $('.board-wrap');
  if (root.parentElement !== wrap) wrap.append(root);
  const c = state.pendingCard,
    active = Boolean(c && c.id.startsWith('resurrect') && c.stage === 'resurrect-type');
  root.classList.toggle('hidden', !active);
  root.setAttribute('aria-live', 'polite');
  root.replaceChildren();
  if (!active) return;
  const available = c.deadTypes || [];
  for (const type of ['q', 'r', 'b', 'n', 'p']) {
    const enabled = available.includes(type),
      button = document.createElement('button');
    button.type = 'button';
    button.className = 'resurrection-choice' + (enabled ? '' : ' unavailable');
    button.disabled = !enabled;
    button.title = enabled
      ? 'Ressuscitar ' + pieceName[type]
      : pieceName[type] + ' não disponível nesta carta';
    button.setAttribute('aria-label', button.title);
    button.innerHTML = pieceSpriteHtml(type, c.side);
    if (enabled)
      button.addEventListener('click', () => {
        const dead = state.dead[c.side].filter((piece) => piece.type === type);
        state.pendingCard.candidates = dead;
        state.pendingCard.choice = 0;
        state.pendingCard.stage = 'resurrect-square';
        setCardPrompt(
          'Escolha uma casa livre da fileira inicial para seu ' +
            pieceName[type].toLowerCase() +
            '.',
        );
        render();
      });
    root.append(button);
  }
}
function renderGrimoirePicker() {
  const root = $('#grimoire-picker');
  if (!root) return;
  const wrap = $('.board-wrap');
  if (root.parentElement !== wrap) wrap.append(root);
  const gp = state.grimoirePicker;
  root.classList.toggle('hidden', !gp);
  root.setAttribute('aria-live', 'polite');
  root.replaceChildren();
  if (!gp) {
    const blocker = $('.grimoire-blocker');
    if (blocker) blocker.classList.add('hidden');
    return;
  }
  const kicker = document.createElement('div');
  kicker.className = 'grimoire-kicker';
  kicker.textContent = 'GRIMÓRIO';
  root.append(kicker);
  const title = document.createElement('h2');
  title.textContent = 'Escolha uma carta';
  root.append(title);
  const subtitle = document.createElement('p');
  const side = state.game.turn();
  subtitle.textContent = `O poder do Mago está disponível. A recarga é de ${classCooldownLength(side)} rodadas; capturas reduzem uma rodada.`;
  root.append(subtitle);
  const list = document.createElement('div');
  list.className = 'grimoire-choices';
  for (const id of gp.choices) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grimoire-choice';
    button.innerHTML = `<span class="card-art">${cardInfo[id]?.icon || '▤'}</span><span class="grimoire-choice-text"><b>${cardInfo[id]?.name || id}</b><small>${cardInfo[id]?.desc || ''}</small></span>`;
    button.addEventListener('click', () => {
      state.grimoirePicker = null;
      useCard(gp.index, gp.skipCounterspell, id, true);
    });
    list.append(button);
  }
root.append(list);
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'grimoire-cancel';
  cancel.textContent = ' Cancelar';
  cancel.addEventListener('click', () => {
    state.grimoirePicker = null;
    playSound('cancel');
    render();
  });
  root.append(cancel);
  let blocker = $('.grimoire-blocker');
  if (!blocker) {
    blocker = document.createElement('div');
    blocker.className = 'grimoire-blocker';
    wrap.append(blocker);
  }
  blocker.classList.remove('hidden');
}
function renderClassPortraits() {
  const boardWrap = $('.board-wrap');
  if (!boardWrap) return;
  const sides = ['w', 'b'];
  for (const side of sides) {
    const el = $('#class-portrait-' + (side === 'w' ? 'white' : 'black'));
    if (!el) continue;
    const cls = state.classes[side];
    if (!cls) {
      el.classList.add('hidden');
      el.replaceChildren();
      continue;
    }
    const power = state.classPower[side];
    const ready = power.charges >= 1 && state.game.turn() === side;
    const src = classPortraits[`./assets/classes/${cls}.png`];
    el.classList.toggle('hidden', false);
    el.replaceChildren();
    const img = document.createElement('img');
    img.src = src;
    img.alt = classInfo[cls].name;
    el.append(img);
    el.title = ready
      ? `${classInfo[cls].name} · ${classInfo[cls].description} · Ativar`
      : `${classInfo[cls].name} · ${classInfo[cls].description} · Carga em ${power.cooldown} rodada(s)`;
    el.disabled = !ready;
    el.onclick = () => {
      if (!ready) {
        toast('Sem cargas disponíveis.');
        return;
      }
      const powerIndex = state.hands[side].findIndex((id) => id === 'classPower');
      if (powerIndex < 0) {
        toast('Sem poder na mão.');
        return;
      }
      useClassPower(powerIndex);
    };
  }
}
function renderHand() {
  if (!state.opts.cards && !state.opts.classes) return;
  const c = state.handSide;
  const turn = state.game.turn();
  $('#hands-panel').classList.add('public-hands');
  $('#hands-panel h2').textContent = state.opts.cards ? 'Mãos abertas' : 'Poderes de classe';
  $('#white-card-count').textContent = handCards('w').length + Number(Boolean(state.classes.w));
  $('#black-card-count').textContent = handCards('b').length + Number(Boolean(state.classes.b));
  $('#hand-count').textContent = handCards('w').length + handCards('b').length;
  $$('.hand-tab').forEach((t) => t.classList.toggle('active', t.dataset.hand === c));
  const root = $('#hand-cards'),
    cards = state.hands[c];

  const groups = [];
  const used = new Set();
  cards.forEach((id, i) => {
    if (used.has(i)) return;
    used.add(i);
    if (id === 'classPower') {
      groups.push({ kind: 'single', id, index: i, count: 1 });
      return;
    }
    const indices = [i];
    cards.forEach((cid, j) => {
      if (j !== i && cid === id && !used.has(j)) { indices.push(j); used.add(j); }
    });
    groups.push({ kind: 'stack', id, indices, count: indices.length, index: indices[0] });
  });

  const disabled = state.cardsUsed[c];
  const isOther = c !== turn;
  const waiting = state.waitingForCounterspell;
  const items = groups.map((g) => {
    if (g.kind === 'single') {
      const cls = classInfo[state.classes[c]],
        power = state.classPower[c],
        ready = power.charges > 0;
      const buttonDisabled = isOther || (disabled || power.charges === 0) || waiting;
      return `<button class="power-card class-power-card${isOther ? ' dimmed' : ''}${waiting ? ' dimmed' : ''}" data-card="classPower" data-index="${g.index}" ${buttonDisabled ? 'disabled' : ''} title="${cls.description}"><span class="card-art">${cls.icon}</span><span><b>${cls.name}</b><small>${ready ? `Poder: ${cls.description}` : `Próxima carga em ${power.cooldown} rodada(s)`}</small><span class="charge-dots" role="img" aria-label="${power.charges} de 3 cargas">${[0, 1, 2].map((i) => `<i class="${i < power.charges ? 'filled' : ''}"></i>`).join('')}</span></span></button>`;
    }
    const id = g.id;
    const buttonDisabled = isOther || (disabled || id === 'counterspell') || waiting;
    return `<button class="power-card card-stack${isOther ? ' dimmed' : ''}${waiting ? ' dimmed' : ''}" data-card="${id}" data-index="${g.index}" ${buttonDisabled ? 'disabled' : ''} data-stack="${g.count}"><span class="card-art">${cardInfo[id].icon}</span><span><b>${cardInfo[id].name}</b><small>${id === 'counterspell' ? 'Resposta automática quando o outro lado usar uma carta.' : cardInfo[id].desc}</small></span></button>`;
  });
  root.innerHTML =
    items.join('') ||
    '<div class="empty-hand">Sem cartas. Capture uma peça para ganhar outra.</div>';
  $$('.power-card', root).forEach((el) =>
    el.addEventListener('click', () =>
      el.dataset.card === 'classPower'
        ? useClassPower(Number(el.dataset.index))
        : useCard(Number(el.dataset.index)),
    ),
  );
}
function renderEvent() {
  const p = $('#progress-bar');
  p.style.width = `${Math.min(100, (state.eventPly / 20) * 100)}%`;
  if (state.eventForecast) {
    const [name] = eventInfo[state.eventForecast.type];
    $('#next-event').innerHTML =
      '<span class="event-orb">✦</span><div><b>Próximo: ' +
      name +
      '</b><small>Já selecionado. Acontece em ' +
      (10 - Math.floor(state.eventPly / 2)) +
      ' rodada(s).</small></div>';
    return;
  }
  if (state.eventType) {
    const [n, d] = eventInfo[state.eventType];
    $('#next-event').innerHTML =
      `<span class="event-orb">✦</span><div><b>${n} ativo</b><small>${d}</small></div>`;
    return;
  }
  $('#next-event').innerHTML =
    `<span class="event-orb">✦</span><div><b>${state.opts.events ? 'O tabuleiro observa.' : 'Eventos desativados.'}</b><small>${state.opts.events ? 'O caos começa em ' + (10 - Math.floor(state.eventPly / 2)) + ' rodadas.' : 'Jogue sem eventos ambientais.'}</small></div>`;
}
function onSquare(s) {
  if (state.suppressDragClick) {
    state.suppressDragClick = false;
    return;
  }
  if (state.ended || state.promotionPending || state.classDraft || state.motion || state.waitingForCounterspell) return;
  if (state.pendingCard) {
    cardTarget(s);
    return;
  }
  const p = pieceAt(s);
  if (state.selected === s) {
    state.selected = null;
    state.legal = [];
    playSound('select');
    render();
    return;
  }
  if (state.selected) {
    const m = state.legal.find((x) => x.to === s);
    if (m) {
      state.dragFrom = null;
      if (isPromotion(state.selected, s, m)) {
        choosePromotion(state.selected, s, m, (type) => makeMove(state.selected, s, m, type));
        return;
      }
      makeMove(state.selected, s, m);
      return;
    }
    if (p && p.color === state.game.turn()) {
      selectPiece(s, p);
      return;
    }
    playSound('illegal');
  }
  // Em multiplayer, peça só pode ser selecionada pelo lado controlado por este jogador
  if (MP.connected && p && p.color !== (MP.side || 'w')) {
    playSound('illegal');
    return;
  }
  if (p && p.color === state.game.turn()) {
    selectPiece(s, p);
    return;
  }
  state.selected = null;
  state.legal = [];
  render();
}
function selectPiece(s, p = pieceAt(s), redraw = true) {
  if (!p || p.color !== state.game.turn()) return false;
  if (state.shields.some((x) => x.square === s)) {
    playSound('illegal');
    toast(`${pieceName[p.type]} protegida: não pode se mover até o início do próximo turno.`);
    return false;
  }
  if (state.stunned.some((x) => x.square === s && x.color === p.color)) {
    playSound('illegal');
    toast(`${pieceName[p.type]} atordoada: perde este turno.`);
    return false;
  }
  if (state.roulette && p.type !== state.roulette) {
    playSound('illegal');
    toast(`A roleta exige um ${pieceName[state.roulette].toLowerCase()}.`);
    return false;
  }
  state.selected = s;
  state.legal = [];
  playSound('select');
  let moves =
    state.opts.mode === 'fog'
      ? fogPseudoMoves(s).filter((m) => fogMoveAllowed(m, p.color))
      : state.game.moves({ square: s, verbose: true });
  if (state.furySide === p.color && p.type === 'p')
    moves = [...moves, ...safeVariantMoves(furyMoves(s, p.color), p.color)];
  if (state.knightElephant === p.color && p.type === 'n')
    moves = [...moves, ...safeVariantMoves(elephantMoves(s, p.color), p.color)];
  state.legal = moves.filter(
    (m) =>
      !state.holes.includes(m.to) &&
      (!crossesHole(m.from, m.to, m.piece) || p.type === 'q') &&
      !state.shields.some((x) => x.square === m.to),
  );
  if (redraw) render();
  return true;
}
function pieceGhost(square, className) {
  const art = $('[data-square="' + square + '"] .piece-art');
  if (!art) return null;
  const rect = art.getBoundingClientRect();
  const ghost = document.createElement('div');
  const sprite = art.cloneNode(true);
  const appearance = getComputedStyle(art);
  ghost.className = className;
  ghost.style.width = art.offsetWidth + 'px';
  ghost.style.height = art.offsetHeight + 'px';
  sprite.style.width = '100%';
  sprite.style.height = '100%';
  sprite.style.setProperty('filter', appearance.filter, 'important');
  sprite.style.setProperty('opacity', appearance.opacity, 'important');
  ghost.append(sprite);
  document.body.append(ghost);
  return { node: ghost, rect };
}

function clearPieceMotion() {
  $$('.piece-motion-ghost, .piece-drag-ghost').forEach((ghost) => ghost.remove());
  state.motion = null;
}

function animatePieceMove(from, to) {
  const art = $('[data-square="' + from + '"] .piece-art');
  const destination = $('[data-square="' + to + '"]');
  if (!art || !destination) return;

  const start = art.getBoundingClientRect();
  const end = destination.getBoundingClientRect();
  const width = art.offsetWidth;
  const height = art.offsetHeight;
  const appearance = getComputedStyle(art);
  const groundShift = parseFloat(appearance.getPropertyValue('--piece-ground-shift')) || 0;
  const ghost = document.createElement('div');
  const sprite = art.cloneNode(true);
  const motionId = Symbol('piece-motion');
  const dx = end.left + end.width / 2 - (start.left + start.width / 2);
  const dy = end.bottom + groundShift - start.bottom;
  const tilt = Math.max(-6, Math.min(6, dx * 0.035));

  ghost.className = 'piece-motion-ghost';
  ghost.style.left = start.left + (start.width - width) / 2 + 'px';
  ghost.style.top = start.bottom - groundShift - height + 'px';
  ghost.style.width = width + 'px';
  ghost.style.height = height + 'px';
  sprite.style.width = '100%';
  sprite.style.height = '100%';
  sprite.style.setProperty('filter', appearance.filter, 'important');
  sprite.style.setProperty('opacity', appearance.opacity, 'important');
  ghost.append(sprite);
  document.body.append(ghost);
  state.motion = { id: motionId, to };

  requestAnimationFrame(() => {
    ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(.97)`;
  });

  setTimeout(() => {
    ghost.remove();
    if (state.motion?.id !== motionId) return;
    const afterMotion = state.motion.after;
    state.motion = null;
    render();
    afterMotion?.();
  }, 290);
}
function updateDragSquares(from) {
  $('#board')
    .querySelectorAll('.square')
    .forEach((el) => {
      const target = el.dataset.square,
        move = state.legal.find((m) => m.to === target);
      el.classList.toggle('selected', target === from);
      el.classList.toggle('legal', Boolean(move));
      el.classList.toggle('capture', Boolean(move?.captured));
    });
}
function startPointerDrag(event, square) {
  if (event.button !== 0 || state.pendingCard || state.ended || state.classDraft || state.motion || state.waitingForCounterspell)
    return;
  const piece = pieceAt(square);
  // Em multiplayer, pode arrastar apenas peças do lado controlado por este jogador
  if (MP.connected && piece && piece.color !== (MP.side || 'w')) return;
  if (!piece || piece.color !== state.game.turn()) return;
  state.pointerDrag = {
    from: square,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    started: false,
    ghost: null,
  };
}
function movePointerDrag(event) {
  const drag = state.pointerDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.startX,
    dy = event.clientY - drag.startY;
  if (!drag.started) {
    if (Math.hypot(dx, dy) < 5) return;
    if (!selectPiece(drag.from, pieceAt(drag.from), false)) {
      state.pointerDrag = null;
      return;
    }
    drag.started = true;
    const ghost = pieceGhost(drag.from, 'piece-drag-ghost');
    if (!ghost) {
      state.pointerDrag = null;
      return;
    }
    drag.ghost = ghost.node;
    state.dragFrom = drag.from;
    $('[data-square="' + drag.from + '"]').classList.add('drag-source');
    updateDragSquares(drag.from);
  }
  event.preventDefault();
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  const tilt = Math.max(-12, Math.min(12, dx * 0.09 - dy * 0.025));
  drag.ghost.style.left = event.clientX + 'px';
  drag.ghost.style.top = event.clientY + 'px';
  drag.ghost.style.transform = 'translate(-50%,-78%) rotate(' + tilt + 'deg) scale(1.035)';
}
function finishPointerDrag(event) {
  const drag = state.pointerDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  state.pointerDrag = null;
  if (!drag.started) return;
  state.suppressDragClick = true;
  setTimeout(() => (state.suppressDragClick = false), 0);
  drag.ghost?.remove();
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.square'),
    to = target?.dataset.square,
    move = to && state.legal.find((m) => m.to === to);
  state.dragFrom = null;
  if (move) {
    const draggedMove = { ...move, dragged: true };
    if (isPromotion(drag.from, to, move)) {
      choosePromotion(drag.from, to, move, (type) => makeMove(drag.from, to, draggedMove, type));
      return;
    }
    makeMove(drag.from, to, draggedMove);
    return;
  }
  playSound('illegal');
  state.selected = null;
  state.legal = [];
  render();
}
function cancelPointerDrag(event) {
  const drag = state.pointerDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  state.pointerDrag = null;
  drag.ghost?.remove();
  state.dragFrom = null;
  if (drag.started) {
    state.selected = null;
    state.legal = [];
    render();
  }
}

function kingKnightMoves(s, color) {
  const { f, r } = parseSquare(s),
    res = [];
  for (const [df, dr] of [
    [1, 2],
    [2, 1],
    [-1, 2],
    [-2, 1],
    [1, -2],
    [2, -1],
    [-1, -2],
    [-2, -1],
  ]) {
    const x = f + df,
      y = r + dr;
    if (x < 0 || x > 7 || y < 0 || y > 7) continue;
    const to = squareName(x, y),
      target = pieceAt(to);
    if ((!target || target.color !== color) && !isRoyalPiece(target))
      res.push({
        from: s,
        to,
        piece: 'k',
        captured: target?.type,
        promotion: undefined,
        warrior: true,
      });
  }
  return res;
}
function crossesHole(from, to, type) {
  if (!['b', 'r', 'q'].includes(type)) return false;
  const a = parseSquare(from),
    b = parseSquare(to),
    dx = Math.sign(b.f - a.f),
    dy = Math.sign(b.r - a.r);
  let f = a.f + dx,
    r = a.r + dy;
  while (f !== b.f || r !== b.r) {
    if (state.holes.includes(squareName(f, r))) return true;
    f += dx;
    r += dy;
  }
  return false;
}
function furyMoves(s, color) {
  const { f, r } = parseSquare(s),
    res = [];
  for (let df = -1; df <= 1; df++)
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const x = f + df,
        y = r + dr;
      if (x < 0 || x > 7 || y < 0 || y > 7) continue;
      const to = squareName(x, y),
        target = pieceAt(to);
      if (target && target.color === color) continue;
      if (target?.type === 'k' || target?.type === 'q') continue;
      res.push({ from: s, to, piece: 'p', captured: target?.type, fury: true });
    }
  return res;
}
function elephantMoves(s, color) {
  const { f, r } = parseSquare(s),
    res = [];
  const offsets = [
    [-2, -2],
    [-2, 2],
    [2, -2],
    [2, 2],
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];
  for (const [df, dr] of offsets) {
    const x = f + df,
      y = r + dr;
    if (x < 0 || x > 7 || y < 0 || y > 7) continue;
    const to = squareName(x, y),
      middle = squareName(f + df / 2, r + dr / 2),
      target = pieceAt(to);
    if (
      state.holes.includes(middle) ||
      state.holes.includes(to) ||
      target?.color === color ||
      isRoyalPiece(target)
    )
      continue;
    res.push({ from: s, to, piece: 'n', captured: target?.type, elephant: true });
  }
  return res;
}
function trapTargets(from) {
  const p = pieceAt(from);
  if (!p) return [];
  const color = p.color;
  const targets = new Set();
  for (const m of state.game.moves({ square: from, verbose: true })) {
    const to = m.to;
    if (pieceAt(to)?.color === color) continue;
    targets.add(to);
  }
  if (p.type === 'p') {
    const { f, r } = parseSquare(from);
    const dir = color === 'w' ? 1 : -1;
    for (const df of [-1, 1]) {
      const to = squareName(f + df, r + dir);
      if (targets.has(to)) continue;
      const target = pieceAt(to);
      if (!target || target.color !== color) targets.add(to);
    }
  }
  return [...targets];
}
function fogPseudoMoves(from, vision = false) {
  const piece = pieceAt(from);
  if (!piece) return [];
  const { f, r } = parseSquare(from),
    color = piece.color,
    out = [],
    push = (x, y, extra = {}) => {
      if (x < 0 || x > 7 || y < 0 || y > 7) return false;
      const to = squareName(x, y),
        target = pieceAt(to);
      if (target?.color === color) return false;
      if (target?.type === 'k') {
        if (vision) out.push({ from, to, piece: piece.type });
        return false;
      }
      out.push({ from, to, piece: piece.type, captured: target?.type, ...extra });
      return !target;
    };
  if (piece.type === 'p') {
    const dir = color === 'w' ? 1 : -1,
      start = color === 'w' ? 1 : 6;
    if (r + dir >= 0 && r + dir < 8 && !pieceAt(squareName(f, r + dir))) {
      push(f, r + dir);
      if (r === start && !pieceAt(squareName(f, r + 2 * dir))) push(f, r + 2 * dir);
    }
    for (const df of [-1, 1]) {
      const x = f + df,
        y = r + dir;
      if (x < 0 || x > 7 || y < 0 || y > 7) continue;
      const to = squareName(x, y),
        target = pieceAt(to);
      if (target && target.color !== color && target.type !== 'k') push(x, y);
      else if (vision) push(x, y);
      else if (state.game.fen().split(' ')[3] === to)
        out.push({ from, to, piece: 'p', captured: 'p', enPassant: true });
    }
  } else if (piece.type === 'n' || piece.type === 'k') {
    const deltas =
      piece.type === 'n'
        ? [
            [1, 2],
            [2, 1],
            [-1, 2],
            [-2, 1],
            [1, -2],
            [2, -1],
            [-1, -2],
            [-2, -1],
          ]
        : [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ];
    for (const [dx, dy] of deltas) push(f + dx, r + dy);
    if (piece.type === 'k')
      for (const move of state.game.moves({ square: from, verbose: true }))
        if (move.flags?.includes('k') || move.flags?.includes('q')) out.push(move);
  } else {
    const dirs =
      piece.type === 'b'
        ? [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ]
        : piece.type === 'r'
          ? [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]
          : [
              [1, 1],
              [1, -1],
              [-1, 1],
              [-1, -1],
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ];
    for (const [dx, dy] of dirs) {
      let x = f + dx,
        y = r + dy;
      while (x >= 0 && x < 8 && y >= 0 && y < 8) {
        if (!push(x, y)) break;
        x += dx;
        y += dy;
      }
    }
  }
  return out.filter(
    (m) =>
      !state.holes.includes(m.to) &&
      (!crossesHole(from, m.to, m.piece) || piece.type === 'q') &&
      !isShielded(m.to),
  );
}
function fogVisible(color = state.game.turn()) {
  const seen = new Set();
  for (const from of allSquares()) {
    const p = pieceAt(from);
    if (p?.color !== color) continue;
    seen.add(from);
    for (const m of fogPseudoMoves(from, true)) seen.add(m.to);
  }
  return seen;
}
function resultingCheckers(move, color) {
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/'),
    a = parseSquare(move.from),
    b = parseSquare(move.to),
    rows = board.map((row) => {
      let x = '';
      for (const ch of row)
        if (/\d/.test(ch)) x += ' '.repeat(Number(ch));
        else x += ch;
      return x;
    });
  let pc = rows[7 - a.r][a.f];
  if (!pc) return ['?'];
  rows[7 - a.r] = rows[7 - a.r].slice(0, a.f) + ' ' + rows[7 - a.r].slice(a.f + 1);
  if (move.enPassant) {
    const capRow = 7 - a.r,
      capFile = b.f;
    rows[capRow] = rows[capRow].slice(0, capFile) + ' ' + rows[capRow].slice(capFile + 1);
  }
  if (move.promotion || (move.piece === 'p' && (b.r === 0 || b.r === 7))) {
    const promoted = move.promotion || 'q';
    pc = color === 'w' ? promoted.toUpperCase() : promoted;
  }
  rows[7 - b.r] = rows[7 - b.r].slice(0, b.f) + pc + rows[7 - b.r].slice(b.f + 1);
  fen[0] = rows.map((row) => row.replace(/ +/g, (m) => m.length)).join('/');
  fen[1] = color;
  fen[3] = '-';
  try {
    const probe = new Chess();
    probe.load(fen.join(' '));
    const king = allSquares().find(
      (s) => probe.get(s)?.color === color && probe.get(s)?.type === 'k',
    );
    return king ? probe.attackers(king, color === 'w' ? 'b' : 'w') : ['?'];
  } catch {
    return ['?'];
  }
}
function fogMoveAllowed(move, color) {
  const attackers = resultingCheckers(move, color);
  if (!attackers.length) return true;
  const seen = fogVisible(color);
  return attackers.every((s) => !seen.has(s));
}
function fogHasHiddenCheck(color) {
  const king = allSquares().find((s) => pieceAt(s)?.color === color && pieceAt(s)?.type === 'k');
  if (!king) return false;
  const attackers = state.game.attackers(king, color === 'w' ? 'b' : 'w');
  if (!attackers.length) return false;
  const seen = fogVisible(color);
  return attackers.every((s) => !seen.has(s));
}
function customLeavesKingInCheck(move, color) {
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/'),
    a = parseSquare(move.from),
    b = parseSquare(move.to),
    rows = board.map((row) => {
      let x = '';
      for (const ch of row)
        if (/\d/.test(ch)) x += ' '.repeat(Number(ch));
        else x += ch;
      return x;
    });
  let piece = rows[7 - a.r][a.f];
  if (!piece) return true;
  rows[7 - a.r] = rows[7 - a.r].slice(0, a.f) + ' ' + rows[7 - a.r].slice(a.f + 1);
  if (move.promotion || (move.piece === 'p' && (b.r === 0 || b.r === 7))) {
    const promoted = move.promotion || 'q';
    piece = color === 'w' ? promoted.toUpperCase() : promoted;
  }
  rows[7 - b.r] = rows[7 - b.r].slice(0, b.f) + piece + rows[7 - b.r].slice(b.f + 1);
  fen[0] = rows.map((row) => row.replace(/ +/g, (m) => m.length)).join('/');
  fen[1] = color;
  try {
    const probe = new Chess();
    probe.load(fen.join(' '));
    const king = allSquares().find(
      (s) => probe.get(s)?.color === color && probe.get(s)?.type === 'k',
    );
    return probe.isCheck();
  } catch {
    return true;
  }
}
function safeVariantMoves(moves, color) {
  return moves.filter((move) =>
    state.opts?.mode === 'fog'
      ? fogMoveAllowed(move, color)
      : !customLeavesKingInCheck(move, color),
  );
}
function isPromotion(from, to, move) {
  return (
    move?.piece === 'p' &&
    ((from[1] === '7' && to[1] === '8') || (from[1] === '2' && to[1] === '1'))
  );
}
function clearPromotionMenu() {
  state.promotionPending?.remove();
  state.promotionPending = null;
}
function choosePromotion(from, to, move, callback) {
  clearPromotionMenu();
  const color = pieceAt(from)?.color || state.game.turn(),
    target = $(`[data-square="${to}"]`);
  if (!target) return;
  const menu = document.createElement('div');
  menu.className = 'promotion-picker';
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Escolha a peça da promoção');
  for (const [type, name] of [
    ['q', 'Rainha'],
    ['r', 'Torre'],
    ['b', 'Bispo'],
    ['n', 'Cavalo'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'promotion-choice';
    button.title = 'Promover para ' + name;
    button.setAttribute('aria-label', button.title);
    button.innerHTML = pieceSpriteHtml(type, color);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      clearPromotionMenu();
      callback(type);
    });
    menu.append(button);
  }
const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'promotion-cancel';
  cancel.textContent = '×';
  cancel.title = 'Cancel promotion';
  cancel.setAttribute('aria-label', cancel.title);
  cancel.addEventListener('click', (event) => {
    event.stopPropagation();
    clearPromotionMenu();
    playSound('cancel');
    render();
  });
  menu.append(cancel);
  target.append(menu);
  state.promotionPending = menu;
}
function makeMove(from, to, move, promotion = 'q', freeAction = false) {
  const side = state.game.turn();
  if (freeAction) move = { ...move, forceCustom: true };
  let captured = pieceAt(to);
  const mover = pieceAt(from),
    moverShield = isShielded(from);
  if (move.enPassant) captured = pieceAt(squareName(parseSquare(to).f, parseSquare(from).r));
  if (
    state.holes.includes(to) ||
    isShielded(to) ||
    ((move.warrior || move.fury || move.elephant) && isRoyalPiece(captured)) ||
    ((move.warrior || move.fury || move.elephant) &&
      customLeavesKingInCheck(
        { ...move, promotion: isPromotion(from, to, move) ? promotion : undefined },
        side,
      ) &&
      !(state.opts.mode === 'fog' && fogMoveAllowed({ ...move, promotion }, side)))
  ) {
    playSound('illegal');
    return false;
  }
  if (
    state.opts.mode === 'fog' &&
    !move.warrior &&
    !move.fury &&
    !move.elephant &&
    !move.fogIllegal &&
    fogPseudoMoves(from).some((m) => m.to === to) &&
    !state.game.moves({ square: from, verbose: true }).some((m) => m.to === to)
  ) {
    if (fogMoveAllowed({ ...move, fogIllegal: true }, side)) move = { ...move, fogIllegal: true };
    else {
      playSound('illegal');
      return false;
    }
  }
  if (!move.dragged) animatePieceMove(from, to);
  if (move.warrior || move.fury || move.elephant || move.fogIllegal || move.forceCustom) {
    const fen = state.game.fen().split(' '),
      board = fen[0].split('/'),
      fromP = parseSquare(from),
      toP = parseSquare(to);
    const rows = board.map((row) => {
      let expanded = '';
      for (const ch of row)
        if (/\d/.test(ch)) expanded += ' '.repeat(Number(ch));
        else expanded += ch;
      return expanded;
    });
    let pc = rows[7 - fromP.r][fromP.f];
    revokeCastlingRight(fen, from, pc);
    if (captured)
      revokeCastlingRight(
        fen,
        move.enPassant ? squareName(toP.f, fromP.r) : to,
        move.enPassant ? (side === 'w' ? 'p' : 'P') : rows[7 - toP.r][toP.f],
      );
    rows[7 - fromP.r] =
      rows[7 - fromP.r].slice(0, fromP.f) + ' ' + rows[7 - fromP.r].slice(fromP.f + 1);
    if (move.enPassant) {
      const capRow = 7 - fromP.r;
      rows[capRow] = rows[capRow].slice(0, toP.f) + ' ' + rows[capRow].slice(toP.f + 1);
    }
    if (move.piece === 'p' && (toP.r === 0 || toP.r === 7))
      pc = side === 'w' ? promotion.toUpperCase() : promotion;
    rows[7 - toP.r] = rows[7 - toP.r].slice(0, toP.f) + pc + rows[7 - toP.r].slice(toP.f + 1);
    fen[0] = rows.map((row) => row.replace(/ +/g, (m) => m.length)).join('/');
    fen[1] = freeAction ? side : side === 'w' ? 'b' : 'w';
    fen[3] = '-';
    fen[4] = captured || move.piece === 'p' ? '0' : String((Number(fen[4]) || 0) + 1);
    if (side === 'b' && !freeAction) fen[5] = String((Number(fen[5]) || 1) + 1);
    try {
      state.game.load(fen.join(' '));
    } catch {
      playSound('illegal');
      toast('Movimento especial indisponível.');
      return false;
    }
    state.moves.push(
      `${pieceName[move.piece]} ${from}–${to}${captured ? ` (${glyph[side + move.piece]}×${glyph[(side === 'w' ? 'b' : 'w') + captured.type]})` : ''}${move.piece === 'p' && (toP.r === 0 || toP.r === 7) ? ` =${promotion.toUpperCase()}` : ''}${move.elephant ? ' (elefante)' : ''}`,
    );
    if (captured) onCapture(side, move.enPassant ? squareName(toP.f, fromP.r) : to, captured.type);
    state.lastMove = { from, to };
    if (move.fury) state.furySide = null;
  } else {
    try {
      const result = state.game.move({ from, to, promotion });
      state.moves.push(
        `${result.san}${result.captured ? ` (${glyph[side + result.piece]}×${glyph[(side === 'w' ? 'b' : 'w') + result.captured]})` : ''}`,
      );
      state.lastMove = { from, to };
      if (result.captured)
        onCapture(side, result.flags?.includes('e') ? to[0] + from[1] : to, result.captured);
    } catch {
      playSound('illegal');
      toast('Movimento inválido.');
      return false;
    }
  }
  const movingShield = state.shields.find((x) => x.square === from);
  if (movingShield) movingShield.square = to;
  for (const trap of state.bombs) if (trap.source === from) trap.source = to;
  state.selected = null;
  state.legal = [];
  if (state.opts.mode === 'evolution' && captured) {
    const p = pieceAt(to);
    if (p && p.type !== 'k' && p.type !== 'q') {
      const order = { p: 'n', n: 'b', b: 'r', r: 'q' };
      setPieceType(to, order[p.type]);
      state.moves[state.moves.length - 1] += ' ↑';
    }
  }
  const portalIndex = state.portals.indexOf(to);
  if (portalIndex !== -1 && mover && !isRoyalPiece(mover) && !moverShield) {
    const other = state.portals[1 - portalIndex];
    if (!pieceAt(other)) {
      const exit = parseSquare(other);
      if (
        move.piece === 'p' &&
        (to[1] === '1' || to[1] === '8') &&
        ((side === 'w' && exit.r !== 7) || (side === 'b' && exit.r !== 0))
      )
        setPieceType(to, 'p');
      relocate(to, other);
      if (movingShield) movingShield.square = other;
      state.lastMove.to = other;
      toast(`Portal! A peça atravessou para ${other}.`);
    }
  }
  const mineIndex = state.mines.indexOf(to);
  if (mineIndex !== -1 && mover && !isRoyalPiece(mover) && !moverShield) {
    state.mines.splice(mineIndex, 1);
    removePiece(to);
    state.shields = state.shields.filter((x) => x.square !== to);
    playSound('bomb');
    recordActivity(
      'event',
      'Mina detonada',
      `${pieceName[mover.type]} em ${to} foi eliminada.`,
      side,
    );
    toast('Explosão! A peça foi eliminada por uma mina.');
  }
  const promoted = move.piece === 'p' && (to[1] === '1' || to[1] === '8');
  playSound(captured ? 'capture' : 'move');
  if (promoted) playSound('promotion');
  if (move.piece === 'r' && state.towerRam === side) applyTowerRam(to, from, side);
  if (freeAction) {
    state.furySide = null;
    state.knightElephant = null;
    state.towerRam = null;
    state.handSide = side;
    render();
    checkEnd();
    return true;
  }
  postMoveCleanup(side, captured);
  state.lastMove = { from, to };
  if (MP.ws && MP.connected) {
    // Server-first: envia input completo (fen resultante + metadados) para o servidor
    // autoritativo que calcula contadores, capturas, eventos e devolve state.
    mpSendMove(from, to, promotion, state.game.fen(), captured?.type || null, state.moves[state.moves.length - 1] || `${from}-${to}`, mover?.type, side);
  }
  render();
  checkEnd();
  return true;
}
function postMoveCleanup(side, captured) {
  if (state.furySide === side) state.furySide = null;
  if (state.knightElephant === side) state.knightElephant = null;
  if (state.towerRam === side) state.towerRam = null;
  ageBombs(side, captured ? null : null);
  ageShields(side);
  state.stunned = state.stunned.filter((x) => x.color !== side);
  state.eventHighlights = [];
  const movedColor = side;
  state.eventPly++;
  if (movedColor === 'b') {
    state.round++;
    tickClassRounds();
    if (state.opts.events && state.eventPly >= 20) {
      state.eventPly = 0;
      // Em multiplayer, eventos são disparados pelo servidor via eventTrigger
      if (!MP.connected) triggerEvent();
    }
  }
  processScheduledBishops();
  if (movedColor === 'b') {
    const material = capturedMaterial(),
      score = material.w - material.b;
    state.roundDeltas.push(score - state.roundMaterialBaseline);
    state.roundMaterialBaseline = score;
  }
  if (
    state.opts.mode === 'roulette' &&
    (!state.game.isGameOver() ||
      (state.opts.mode === 'fog' && fogHasHiddenCheck(state.game.turn())))
  )
    rollRoulette();
  state.handSide = state.game.turn();
  state.cardsUsed[state.game.turn()] = false;
  state.powerUsed[state.game.turn()] = false;
  state.sacrificeUsed[state.game.turn()] = false;
}
function onCapture(side, sq, type) {
  if (type === 'k') {
    state.ended = true;
    return;
  }
  const victimColor = side === 'w' ? 'b' : 'w';
  if (type) state.dead[victimColor].push({ type, color: victimColor });
  if (state.classes[side]) {
    const reduction = captureCooldownReduction(type);
    if (reduction > 0) reduceClassCooldown(side, reduction);
  }
  for (const bomb of [...state.bombs])
    if (bomb.opponent === side && bomb.source === sq) {
      state.bombs = state.bombs.filter((x) => x !== bomb);
      playSound('cancel');
      recordActivity(
        'event',
        'Armadilha desarmada',
        `A peça de origem foi capturada; a armadilha em ${bomb.square} foi desarmada.`,
        side,
      );
      toast(`A armadilha foi desarmada com a captura de sua peça de origem.`);
    }
  if (
    state.opts.cards &&
    ['n', 'b', 'r', 'q'].includes(type) &&
    (type === 'q' || !state.captureRewards[side].includes(type))
  ) {
    if (type !== 'q') state.captureRewards[side].push(type);
    const owned = allSquares()
      .map((square) => pieceAt(square))
      .filter((p) => p?.color === side);
    const pool = state.enabledCards.filter(
      (id) =>
        (id === 'resurrect' ||
          id === 'shield' ||
          id === 'treason' ||
          id === 'bomb' ||
          id === 'counterspell' ||
          (id === 'fury' && owned.some((p) => p.type === 'p')) ||
          (id === 'bishopShift' && owned.some((p) => p.type === 'b')) ||
          (id === 'knightElephant' && owned.some((p) => p.type === 'n')) ||
          (id === 'towerRam' && owned.some((p) => p.type === 'r')) ||
          id === 'kingLeap' ||
          id === 'sacrifice') &&
        !classCardIds(side).includes(id),
    );
    gainCard(side, random(pool));
  }
}
function gainCard(side, id, announce = true) {
  if (!id) return;
  if (id === 'treason') {
    const held = state.hands[side]
      .map((card, index) => ({
        card,
        index,
        level: card === 'treason3' ? 3 : card === 'treason2' ? 2 : card === 'treason' ? 1 : 0,
      }))
      .filter((x) => x.level > 0 && x.level < 3)
      .sort((a, b) => a.level - b.level)[0];
    if (held) {
      state.hands[side][held.index] = held.level === 1 ? 'treason2' : 'treason3';
      if (announce)
        recordActivity(
          'card',
          'Traição aprimorada',
          `A carta subiu para o nível ${held.level + 1}.`,
          side,
        );
      return;
    }
  }
  if (id === 'resurrect') {
    const held = state.hands[side]
      .map((card, index) => ({
        card,
        index,
        level: card === 'resurrect3' ? 3 : card === 'resurrect2' ? 2 : card === 'resurrect' ? 1 : 0,
      }))
      .filter((x) => x.level > 0 && x.level < 3)
      .sort((a, b) => a.level - b.level)[0];
    if (held) {
      state.hands[side][held.index] = held.level === 1 ? 'resurrect2' : 'resurrect3';
      if (announce)
        recordActivity(
          'card',
          'Ressurreição aprimorada',
          `A carta subiu para o nível ${held.level + 1}.`,
          side,
        );
      return;
    }
  }
  state.hands[side].push(id);
}
function applyTowerRam(to, from, side) {
  const a = parseSquare(from),
    b = parseSquare(to),
    df = Math.sign(b.f - a.f),
    dr = Math.sign(b.r - a.r);
  if (!df && !dr) return;
  const x = b.f + df,
    y = b.r + dr;
  if (x < 0 || x > 7 || y < 0 || y > 7) return;
  const target = squareName(x, y),
    piece = pieceAt(target);
  if (
    !piece ||
    piece.color === side ||
    isRoyalPiece(piece) ||
    state.holes.includes(target) ||
    isShielded(target)
  )
    return;
  const beyondF = x + df,
    beyondR = y + dr;
  if (beyondF < 0 || beyondF > 7 || beyondR < 0 || beyondR > 7) {
    state.stunned.push({ square: target, color: piece.color });
    playSound('illegal');
    toast(`Impacto! A peça em ${target} foi atordoada por um turno.`);
    return;
  }
  const beyond = squareName(beyondF, beyondR);
  if (!pieceAt(beyond) && !state.holes.includes(beyond)) {
    movePieceRaw(target, beyond);
    playSound('capture');
    toast(`Impacto! A peça em ${target} foi empurrada para ${beyond}.`);
    recordActivity(
      'event',
      'Impacto da torre',
      `Peça empurrada de ${target} para ${beyond}.`,
      side,
    );
  }
}
function processScheduledBishops() {
  const side = state.game.turn();
  for (const action of [...state.scheduledBishops].filter((x) => x.color === side)) {
    state.scheduledBishops = state.scheduledBishops.filter((x) => x !== action);
    const bishop = pieceAt(action.from),
      target = pieceAt(action.to);
    if (
      !bishop ||
      bishop.type !== 'b' ||
      bishop.color !== side ||
      target?.color === side ||
      isRoyalPiece(target) ||
      isRoyalPiece(bishop) ||
      state.holes.includes(action.to) ||
      isShielded(action.from) ||
      isShielded(action.to) ||
      customLeavesKingInCheck({ from: action.from, to: action.to }, side)
    ) {
      recordActivity(
        'card',
        'Mudança de cor cancelada',
        `O bispo não pôde se mover de ${action.from} para ${action.to}.`,
        side,
      );
      continue;
    }
    if (target) onCapture(side, action.to, target.type);
    movePieceRaw(action.from, action.to);
    playSound(target ? 'capture' : 'move');
    state.lastMove = { from: action.from, to: action.to };
    recordActivity(
      'card',
      'Mudança de cor',
      `Bispo movido de ${action.from} para ${action.to} no início do turno.`,
      side,
    );
    toast(`O bispo mudou de cor: ${action.from}→${action.to}.`);
  }
}
function setPieceType(s, type) {
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/');
  const { f, r } = parseSquare(s);
  const row = board[7 - r];
  let chars = [];
  for (const c of row)
    if (/\d/.test(c)) chars.push(...Array(Number(c)).fill('1'));
    else chars.push(c);
  let pc = chars[f];
  chars[f] = pc === pc.toUpperCase() ? type.toUpperCase() : type;
  board[7 - r] = chars.join('').replace(/1+/g, (m) => m.length);
  fen[0] = board.join('/');
  state.game.load(fen.join(' '));
}
function relocate(from, to) {
  const p = pieceAt(from);
  if (!p) return;
  movePieceRaw(from, to);
}
function swapPieces(a, b) {
  if (isChaosImmune(a) || isChaosImmune(b)) return false;
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/'),
    x = parseSquare(a),
    y = parseSquare(b);
  const rows = board.map((row) => {
    let s = '';
    for (const c of row)
      if (/\d/.test(c)) s += ' '.repeat(+c);
      else s += c;
    return s;
  });
  const p = rows[7 - x.r][x.f],
    q = rows[7 - y.r][y.f];
  if (!p || !q || p === ' ' || q === ' ' || p.toLowerCase() === 'k' || q.toLowerCase() === 'k')
    return false;
  revokeCastlingRight(fen, a, p);
  revokeCastlingRight(fen, b, q);
  rows[7 - x.r] = rows[7 - x.r].slice(0, x.f) + q + rows[7 - x.r].slice(x.f + 1);
  rows[7 - y.r] = rows[7 - y.r].slice(0, y.f) + p + rows[7 - y.r].slice(y.f + 1);
  fen[0] = rows.map((s) => s.replace(/ +/g, (m) => m.length)).join('/');
  fen[3] = '-';
  if (!fen[2]) fen[2] = '-';
  try {
    for (const side of ['w', 'b']) {
      const probeFen = fen.slice();
      probeFen[1] = side;
      const probe = new Chess();
      probe.load(probeFen.join(' '));
      if (probe.isCheck()) return false;
    }
    state.game.load(fen.join(' '));
    for (const trap of state.bombs) {
      if (trap.source === a) trap.source = b;
      else if (trap.source === b) trap.source = a;
    }
    return true;
  } catch {
    return false;
  }
}
function movePieceRaw(from, to) {
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/'),
    a = parseSquare(from),
    b = parseSquare(to);
  const rows = board.map((row) => {
    let x = '';
    for (const c of row)
      if (/\d/.test(c)) x += ' '.repeat(+c);
      else x += c;
    return x;
  });
  let pc = rows[7 - a.r][a.f],
    captured = rows[7 - b.r][b.f];
  if (!pc || pc === ' ') return false;
  revokeCastlingRight(fen, from, pc);
  if (captured && captured !== ' ') revokeCastlingRight(fen, to, captured);
  rows[7 - a.r] = rows[7 - a.r].slice(0, a.f) + ' ' + rows[7 - a.r].slice(a.f + 1);
  if ((pc === 'P' && b.r === 7) || (pc === 'p' && b.r === 0)) pc = pc === 'P' ? 'Q' : 'q';
  rows[7 - b.r] = rows[7 - b.r].slice(0, b.f) + pc + rows[7 - b.r].slice(b.f + 1);
  fen[0] = rows.map((x) => x.replace(/ +/g, (m) => m.length)).join('/');
  if (!fen[2]) fen[2] = '-';
  fen[3] = '-';
  try {
    state.game.load(fen.join(' '));
    for (const trap of state.bombs) if (trap.source === from) trap.source = to;
    return true;
  } catch {
    return false;
  }
}
function removePiece(s) {
  if (isChaosImmune(s)) return false;
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/'),
    { f, r } = parseSquare(s);
  let chars = [];
  for (const ch of board[7 - r])
    if (/\d/.test(ch)) chars.push(...Array(+ch).fill(' '));
    else chars.push(ch);
  const pc = chars[f];
  if (!pc || pc === ' ') return false;
  revokeCastlingRight(fen, s, pc);
  chars[f] = ' ';
  board[7 - r] = chars.join('').replace(/ +/g, (m) => m.length);
  fen[0] = board.join('/');
  if (!fen[2]) fen[2] = '-';
  fen[3] = '-';
  try {
    state.game.load(fen.join(' '));
    return true;
  } catch {
    return false;
  }
}
function ageShields(moved) {
  state.shields = state.shields.filter((shield) => {
    if (shield.color === moved) {
      if (shield.fresh) shield.fresh = false;
      return true;
    }
    return shield.fresh;
  });
}
function ageBombs(moved, capturedSquare) {
  for (const b of [...state.bombs]) {
    if (moved !== b.opponent) continue;
    if (capturedSquare === b.source) {
      state.bombs = state.bombs.filter((x) => x !== b);
      recordActivity(
        'event',
        'Armadilha desarmada',
        `A peça de origem foi capturada; a armadilha em ${b.square} foi desarmada.`,
        moved,
      );
      toast('A armadilha foi desarmada.');
      continue;
    }
    b.turns--;
    if (b.turns <= 0) {
      const victim = pieceAt(b.square);
      if (victim && !isChaosImmune(b.square)) removePiece(b.square);
      state.bombs = state.bombs.filter((x) => x !== b);
      playSound('bomb');
      recordActivity(
        'event',
        'Armadilha ativada',
        victim && !isChaosImmune(b.square)
          ? `${pieceName[victim.type]} na casa ${b.square} foi destruída.`
          : victim
            ? `A peça protegida em ${b.square} resistiu à armadilha.`
            : `A casa ${b.square} explodiu sem atingir peças.`,
        moved,
      );
      toast(
        victim && !isChaosImmune(b.square)
          ? `Armadilha! A peça em ${b.square} foi destruída.`
          : `A armadilha em ${b.square} explodiu.`,
      );
    }
  }
}
function finishCheckmate() {
  state.ended = true;
  playSound('mate');
  const winner = state.game.turn() === 'w' ? 'Pretas' : 'Brancas';
  showModal('XEQUE-MATE', `${winner} venceram por xeque-mate!`, '', [
    { label: 'Jogar novamente', primary: true, fn: newGame },
    { label: 'Voltar à configuração', fn: showSetup },
  ]);
}
function rescueOptions(side) {
  const result = [],
    cards = state.hands[side];
  for (let i = 0; i < cards.length; i++) {
    const id = cards[i];
    if (id === 'kingLeap') {
      const k = allSquares().find((s) => pieceAt(s)?.color === side && pieceAt(s)?.type === 'k');
      if (k && safeVariantMoves(kingKnightMoves(k, side), side).length)
        result.push({ label: 'Usar Salto do Rei', run: () => useCard(i, true) });
    }
    if (
      id === 'fury' &&
      allSquares().some(
        (s) =>
          pieceAt(s)?.color === side &&
          pieceAt(s)?.type === 'p' &&
          safeVariantMoves(furyMoves(s, side), side).length,
      )
    )
      result.push({ label: 'Usar Fúria do Peão', run: () => useCard(i, true) });
    if (
      id === 'knightElephant' &&
      allSquares().some(
        (s) =>
          pieceAt(s)?.color === side &&
          pieceAt(s)?.type === 'n' &&
          safeVariantMoves(elephantMoves(s, side), side).length,
      )
    )
      result.push({ label: 'Usar Salto do Elefante', run: () => useCard(i, true) });
  }
  const powerIndex = cards.indexOf('classPower'),
    power = state.classPower[side],
    cls = state.classes[side];
  if (powerIndex >= 0 && power.charges > 0) {
    if (
      cls === 'warrior' &&
      allSquares().some(
        (s) =>
          pieceAt(s)?.color === side &&
          pieceAt(s)?.type === 'p' &&
          safeVariantMoves(furyMoves(s, side), side).length,
      )
    )
      result.push({ label: 'Usar poder do Guerreiro', run: () => useClassPower(powerIndex, true) });
    if (cls === 'mage') {
      for (const id of ['kingLeap', 'fury', 'knightElephant']) {
        const can =
          id === 'kingLeap'
            ? allSquares().some(
                (s) =>
                  pieceAt(s)?.color === side &&
                  pieceAt(s)?.type === 'k' &&
                  safeVariantMoves(kingKnightMoves(s, side), side).length,
              )
            : id === 'fury'
              ? allSquares().some(
                  (s) =>
                    pieceAt(s)?.color === side &&
                    pieceAt(s)?.type === 'p' &&
                    safeVariantMoves(furyMoves(s, side), side).length,
                )
              : allSquares().some(
                  (s) =>
                    pieceAt(s)?.color === side &&
                    pieceAt(s)?.type === 'n' &&
                    safeVariantMoves(elephantMoves(s, side), side).length,
                );
        if (can)
          result.push({
            label: 'Grimório: ' + cardInfo[id].name,
            run: () => useCard(powerIndex, true, id, true),
          });
      }
    }
  }
  return result;
}
function checkEnd() {
  if (
    state.game.isCheckmate() &&
    !state.ended &&
    !(state.opts.mode === 'fog' && fogHasHiddenCheck(state.game.turn()))
  ) {
    const side = state.game.turn(),
      responses = rescueOptions(side);
    if (
      (state.opts.cards || state.opts.classes) &&
      !state.mateResponseOffered &&
      responses.length
    ) {
      state.mateResponseOffered = true;
      state.handSide = side;
      renderHand();
      showModal(
        'ÚLTIMA CHANCE',
        'Uma carta pode salvar o rei.',
        'Escolha somente uma ação que deixa o rei fora de xeque. Se desistir, a partida termina.',
        [
          { label: 'Aceitar o xeque-mate', fn: finishCheckmate },
          ...responses.map((option, i) => ({
            label: option.label,
            primary: i === 0,
            fn: option.run,
          })),
        ],
      );
      return;
    }
    finishCheckmate();
    return;
  }
  if (!state.ended && state.game.isDraw()) {
    state.ended = true;
    playSound('draw');
    showModal('PARTIDA ENCERRADA', 'Empate!', '', [
      { label: 'Jogar novamente', primary: true, fn: newGame },
      { label: 'Voltar à configuração', fn: showSetup },
    ]);
  } else if (state.ended && !state.game.isGameOver()) {
    playSound('mate');
    setTimeout(
      () =>
        showModal('REI CAPTURADO', 'Uma captura decisiva encerrou a partida.', '', [
          { label: 'Jogar novamente', primary: true, fn: newGame },
          { label: 'Voltar à configuração', fn: showSetup },
        ]),
      100,
    );
  } else if (
    !state.ended &&
    state.game.isCheck() &&
    !(state.opts.mode === 'fog' && fogHasHiddenCheck(state.game.turn()))
  )
    playSound('check');
}
function rollRoulette() {
  const types = ['p', 'n', 'b', 'r', 'q', 'k'];
  state.roulette = random(types);
  const legal =
    state.opts.mode === 'fog'
      ? allSquares()
          .filter((s) => pieceAt(s)?.color === state.game.turn())
          .flatMap((s) => fogPseudoMoves(s).filter((m) => fogMoveAllowed(m, state.game.turn())))
      : state.game.moves({ verbose: true });
  const available = legal.filter((m) => m.piece === state.roulette);
  if (!available.length) {
    toast('Roleta: sem ' + pieceName[state.roulette].toLowerCase() + ' legal — vez perdida.');
    const fen = state.game.fen().split(' ');
    fen[1] = fen[1] === 'w' ? 'b' : 'w';
    try {
      state.game.load(fen.join(' '));
    } catch {}
    state.round += state.game.turn() === 'w' ? 1 : 0;
    state.roulette = random(types);
  }
}
function placeMines() {
  const valid = allSquares().filter((s) => {
    const { r } = parseSquare(s);
    return r > 1 && r < 6 && !pieceAt(s);
  });
  while (state.mines.length < 4 && valid.length) {
    const i = Math.floor(Math.random() * valid.length);
    state.mines.push(valid.splice(i, 1)[0]);
  }
}
function prepareEventForecast() {
  state.eventForecast =
    state.opts.events && state.opts.eventTypes.length
      ? { type: random(state.opts.eventTypes), squares: [] }
      : null;
}
function triggerEvent() {
  const available = state.opts.eventTypes;
  if (!available.length) {
    state.eventPly = 0;
    state.eventForecast = null;
    state.eventType = null;
    return;
  }
  // Environmental effects last only until the next event. Card effects remain separate.
  state.holes = [];
  state.portals = [];
  state.mines = [];
  state.eventHighlights = [];
  state.eventType = null;
  const forecast = state.eventForecast;
  state.eventForecast = null;
  const ev = forecast?.type || random(available);
  state.eventType = ev;
  playSound(ev);
  const title = eventInfo[ev][0];
  let msg = eventInfo[ev][1];
  const color = state.game.turn();
  if (ev === 'quake') {
    const candidates = [
      'c3',
      'd3',
      'e3',
      'f3',
      'c4',
      'd4',
      'e4',
      'f4',
      'c5',
      'd5',
      'e5',
      'f5',
      'c6',
      'd6',
      'e6',
      'f6',
    ].filter((s) => !pieceAt(s));
    while (state.holes.length < 2 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      state.holes.push(candidates.splice(i, 1)[0]);
    }
    msg = `Abismos nas casas ${state.holes.join(' e ')}. ${eventInfo[ev][1]}`;
  }
  if (ev === 'portal') {
    const candidates = allSquares().filter((s) => !pieceAt(s));
    while (state.portals.length < 2 && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      state.portals.push(candidates.splice(i, 1)[0]);
    }
    msg = `Portais ativos em ${state.portals.join(' e ')}. Pouse em um para atravessar.`;
  }
  if (ev === 'mines') {
    placeMines();
    msg = `Quatro minas invisíveis foram espalhadas entre as fileiras 3 e 6. ${eventInfo[ev][1]}`;
  }
if (ev === 'swap') {
    const beforeSwap = state.game.fen(),
      beforeBombs = state.bombs.map((x) => ({ ...x })),
      descriptions = [];
    for (const side of ['w', 'b']) {
      const pieces = allSquares().filter(
          (s) => pieceAt(s)?.color === side && !isRoyalPiece(pieceAt(s)) && !isShielded(s),
        ),
        pairs = [];
      for (let i = 0; i < pieces.length; i++)
        for (let j = i + 1; j < pieces.length; j++) {
          const a = pieces[i],
            b = pieces[j],
            pa = pieceAt(a),
            pb = pieceAt(b),
            ar = parseSquare(a).r,
            br = parseSquare(b).r;
          const pawnSafe =
            (pa.type !== 'p' || (br > 0 && br < 7)) && (pb.type !== 'p' || (ar > 0 && ar < 7));
          if (pawnSafe) pairs.push([a, b]);
        }
      const different = pairs.filter(([a, b]) => pieceAt(a).type !== pieceAt(b).type);
      const fallbackCandidates = different.length ? different : pairs;
      let forecastCandidates = [];
      if (forecast?.type === 'swap') {
        const fc = [[forecast.squares[side === 'w' ? 0 : 2], forecast.squares[side === 'w' ? 1 : 3]]].filter(Boolean);
        forecastCandidates = fc.filter(
          (pair) => pair.length === 2 && pieces.includes(pair[0]) && pieces.includes(pair[1]),
        );
      }
      const allCandidates = [
        ...forecastCandidates,
        ...fallbackCandidates.filter(
          (p) => !forecastCandidates.some((c) => c[0] === p[0] && c[1] === p[1]),
        ),
      ];
      let chosen = null;
      for (const pair of allCandidates) {
        if (swapPieces(pair[0], pair[1])) {
          chosen = pair;
          break;
        }
      }
      if (chosen) {
        const [a, b] = chosen,
          pa = pieceAt(a),
          pb = pieceAt(b);
        state.eventHighlights.push(a, b);
        descriptions.push(
          `${side === 'w' ? 'Brancas' : 'Pretas'}: ${pieceName[pb.type]} em ${a} ↔ ${pieceName[pa.type]} em ${b}`,
        );
      }
    }
    if (descriptions.length === 0) {
      state.game.load(beforeSwap);
      state.bombs = beforeBombs;
      state.eventHighlights = [];
    }
    msg = descriptions.length
      ? descriptions.join('; ') +
        '. Nenhum Rei ficou em xeque; casas marcadas até seu próximo lance.'
      : 'Nenhuma troca segura estava disponível; nenhuma peça foi trocada.';
  }
  $('#event-banner').textContent = `✳ ${title} — ${msg}`;
  $('#event-banner').classList.remove('hidden');
  recordActivity('event', title, msg, color);
  toast(title + '! ' + msg);
  prepareEventForecast();
}
function useCard(i, skipCounterspell = false, forcedId = null, classPower = false) {
  if ((!state.opts.cards && !classPower) || state.classDraft) return;
  if (state.motion) {
    toast('Aguarde a peça concluir o movimento.');
    return;
  }
  const side = state.game.turn();
  // Em multiplayer, só pode usar cartas do lado controlado por este jogador
  if (MP.connected && side !== (MP.side || 'w')) {
    toast('Use as cartas do lado que está na vez.');
    return;
  }
  if (state.pendingCard) {
    toast('Conclua ou cancele a carta que já está selecionada.');
    return;
  }
  if (state.handSide !== side) {
    toast('Use as cartas do lado que está na vez.');
    return;
  }
  const slot = state.hands[side][i],
    id = forcedId || (slot === 'classPower' ? null : slot);
  classPower = classPower || slot === 'classPower';
  if (!id) return;
  if (id === 'counterspell') {
    toast('Contramagia é ativada como resposta à carta do outro lado.');
    return;
  }
  const power = state.classPower[side];
  if (classPower) {
    if (state.powerUsed[side]) {
      toast('Você já usou um poder neste turno.');
      return;
    }
    if (!power?.charges) {
      toast('Sem cargas disponíveis.');
      return;
    }
  }
  if (!classPower && (state.cardsUsed[side] || state.powerUsed[side]) && (id !== 'sacrifice' || state.sacrificeUsed[side])) {
    toast('Você já usou uma carta ou poder neste turno.');
    return;
  }
  const level = cardLevel(id, side, classPower),
    targetCheckId = ['treason', 'resurrect'].includes(id) ? leveledCardId(id, level) : id;
  if (!hasInitialCardTarget(targetCheckId, side)) {
    toast('Essa carta não tem alvo ou movimento válido agora.');
    return;
  }
  state.selected = null;
  state.legal = [];
  state.pendingCard = {
    id,
    index: i,
    side,
    classPower,
    level,
    stage: id.startsWith('treason') ? 'source' : 'target',
  };
  if (id === 'sacrifice') {
    if (
      !state.enabledCards.some((card) => card !== 'sacrifice' && !classCardIds(side).includes(card))
    ) {
      state.pendingCard = null;
      toast('Ative ao menos outra carta para receber o resultado do Sacrifício.');
      return;
    }
    const pieces = allSquares().filter(
      (s) =>
        pieceAt(s)?.color === side &&
        ['p', 'n', 'b', 'r'].includes(pieceAt(s)?.type) &&
        !isShielded(s),
    );
    if (!pieces.length) {
      state.pendingCard = null;
      toast('Não há peças válidas para sacrificar.');
      return;
    }
    state.pendingCard.stage = 'sacrifice-piece';
    setCardPrompt(
      'Escolha a peça que será sacrificada. Reis, rainhas e peças protegidas não podem ser escolhidos.',
    );
    render();
    return;
  }
  if (id === 'bomb') {
    const sources = allSquares().filter((s) => {
      const p = pieceAt(s);
      return (
        p?.color === side &&
        !isRoyalPiece(p) &&
        !isShielded(s) &&
        trapTargets(s).some((to) => !isShielded(to) && !isRoyalPiece(pieceAt(to)) && !state.holes.includes(to))
      );
    });
    if (!sources.length) {
      state.pendingCard = null;
      toast('Nenhuma peça sua alcança uma casa válida para a armadilha.');
      return;
    }
    state.pendingCard.stage = 'bomb-piece';
    setCardPrompt(
      'Escolha a peça de origem da armadilha; depois escolha uma casa alcançável entre as fileiras 3 e 6.',
    );
    render();
    return;
  }
  if (id === 'kingLeap') {
    const kings = allSquares().filter(
      (s) =>
        pieceAt(s)?.color === side &&
        pieceAt(s)?.type === 'k' &&
        safeVariantMoves(kingKnightMoves(s, side), side).length,
    );
    if (!kings.length) {
      state.pendingCard = null;
      toast('Seu rei não tem um salto seguro disponível.');
      return;
    }
    state.pendingCard.stage = 'king-piece';
    setCardPrompt('Escolha seu rei; depois selecione uma casa legal para confirmar o salto.');
    render();
    return;
  }
  if (id.startsWith('resurrect')) {
    const allowed =
        level === 1 ? ['p'] : level === 2 ? ['p', 'n', 'b'] : ['p', 'n', 'b', 'r'],
      dead = state.dead[side].filter((p) => allowed.includes(p.type));
    if (!dead.length) {
      state.pendingCard = null;
      toast('Ressurreição nível ' + level + ': não há peças elegíveis capturadas.');
      return;
    }
    state.pendingCard.stage = 'resurrect-type';
    state.pendingCard.level = level;
    state.pendingCard.deadTypes = [...new Set(dead.map((p) => p.type))];
    setCardPrompt(
      'Ressurreição nível ' +
        level +
        ': escolha um tipo de peça. Depois escolha uma casa livre da fileira inicial.',
    );
    render();
    return;
  }
  if (id === 'fury') {
    const pawns = allSquares().filter(
      (s) => pieceAt(s)?.color === side && pieceAt(s)?.type === 'p',
    );
    if (!pawns.length) {
      state.pendingCard = null;
      toast('Você não tem peões para usar Fúria.');
      return;
    }
    state.pendingCard.stage = 'fury-piece';
    setCardPrompt('Escolha um peão. Você ainda poderá cancelar antes de confirmar o movimento.');
    render();
    return;
  }
  if (id === 'bishopShift') {
    const bishops = allSquares().filter(
      (s) => pieceAt(s)?.color === side && pieceAt(s)?.type === 'b',
    );
    if (!bishops.length) {
      state.pendingCard = null;
      toast('Você precisa ter um bispo para usar esta carta.');
      return;
    }
    state.pendingCard.stage = 'bishop-piece';
    setCardPrompt(
      'Escolha um bispo; depois marque a casa ortogonal para onde ele se moverá no início do seu próximo turno.',
    );
    render();
    return;
  }
  if (id === 'knightElephant') {
    const knights = allSquares().filter(
      (s) => pieceAt(s)?.color === side && pieceAt(s)?.type === 'n',
    );
    if (!knights.length) {
      state.pendingCard = null;
      toast('Você precisa ter um cavalo para usar esta carta.');
      return;
    }
    state.pendingCard.stage = 'knight-piece';
    setCardPrompt(
      'Escolha um cavalo; depois marque uma casa duas casas na diagonal para confirmar o salto.',
    );
    render();
    return;
  }
  if (id === 'towerRam') {
    const rooks = allSquares().filter(
      (s) =>
        pieceAt(s)?.color === side &&
        pieceAt(s)?.type === 'r' &&
        state.game
          .moves({ square: s, verbose: true })
          .some(
            (m) => !state.holes.includes(m.to) && !state.shields.some((x) => x.square === m.to),
          ),
    );
    if (!rooks.length) {
      state.pendingCard = null;
      toast('Nenhuma torre sua pode se mover legalmente agora.');
      return;
    }
    state.pendingCard.stage = 'tower-piece';
    setCardPrompt('Escolha uma torre e depois uma casa legal para mover e confirmar o impacto.');
    render();
    return;
  }
  if (!cardTargetSquares().length) {
    state.pendingCard = null;
    toast(
      id.startsWith('treason')
        ? 'Não há peças inimigas válidas ao lado das suas peças.'
        : 'Não há peças válidas para escolher.',
    );
    render();
    return;
  }
  setCardPrompt(
    id.startsWith('treason')
      ? 'Primeiro, clique numa peça sua. Depois escolha uma peça inimiga adjacente.'
      : id === 'shield'
        ? 'Clique numa peça sua para protegê-la. Ela não poderá se mover até seu próximo turno.'
        : id === 'bomb'
          ? 'Primeiro escolha a peça de origem e depois uma casa alcançável nas fileiras 3 a 6.'
          : 'Clique numa casa válida para usar a carta.',
  );
  render();
}
function cardTargetSquares() {
  const c = state.pendingCard;
  if (!c || !state.game) return [];
  const us = c.side,
    them = us === 'w' ? 'b' : 'w';
  if (c.id === 'sacrifice' && c.stage === 'sacrifice-piece')
    return allSquares().filter(
      (s) =>
        pieceAt(s)?.color === us &&
        ['p', 'n', 'b', 'r'].includes(pieceAt(s)?.type) &&
        !isShielded(s),
    );
  if (c.id === 'kingLeap') {
    if (c.stage === 'king-piece')
      return allSquares().filter(
        (s) =>
          pieceAt(s)?.color === us &&
          pieceAt(s)?.type === 'k' &&
          safeVariantMoves(kingKnightMoves(s, us), us).length,
      );
    if (c.stage === 'king-move') return state.legal.map((m) => m.to);
  }
  if (c.id === 'shield')
    return allSquares().filter(
      (s) => pieceAt(s)?.color === us && !isRoyalPiece(pieceAt(s)) && !isShielded(s),
    );
  if (c.id === 'bomb') {
    if (c.stage === 'bomb-piece')
      return allSquares().filter((s) => {
        const p = pieceAt(s);
        return (
          p?.color === us &&
          !isRoyalPiece(p) &&
          !isShielded(s) &&
          trapTargets(s).some((to) => !isShielded(to) && !isRoyalPiece(pieceAt(to)) && !state.holes.includes(to))
        );
      });
    if (
      c.stage === 'bomb-cell' &&
      pieceAt(c.source)?.color === us &&
      !isRoyalPiece(pieceAt(c.source)) &&
      !isShielded(c.source)
    )
      return trapTargets(c.source).filter((s) => {
        const r = parseSquare(s).r;
        return r >= 2 && r <= 5 && !isShielded(s) && !isRoyalPiece(pieceAt(s)) && !state.holes.includes(s);
      });
    return [];
  }
  if (c.id === 'knightElephant') {
    if (c.stage === 'knight-piece')
      return allSquares().filter(
        (s) =>
          pieceAt(s)?.color === us &&
          pieceAt(s)?.type === 'n' &&
          elephantMoves(s, us).some((m) => !state.shields.some((x) => x.square === m.to)),
      );
    if (c.stage === 'knight-move') return state.legal.map((m) => m.to);
  }
  if (c.id === 'towerRam') {
    if (c.stage === 'tower-piece')
      return allSquares().filter(
        (s) =>
          pieceAt(s)?.color === us &&
          pieceAt(s)?.type === 'r' &&
          state.game
            .moves({ square: s, verbose: true })
            .some(
              (m) =>
                !state.holes.includes(m.to) &&
                !crossesHole(m.from, m.to, m.piece) &&
                !state.shields.some((x) => x.square === m.to),
            ),
      );
    if (c.stage === 'tower-move') return state.legal.map((m) => m.to);
  }
  if (c.id === 'fury') {
    if (c.stage === 'fury-piece')
      return allSquares().filter((s) => pieceAt(s)?.color === us && pieceAt(s)?.type === 'p');
    if (pieceAt(c.source)?.type !== 'p' || pieceAt(c.source)?.color !== us) return [];
    return safeVariantMoves(furyMoves(c.source, us), us)
      .filter((m) => !state.holes.includes(m.to) && !state.shields.some((x) => x.square === m.to))
      .map((m) => m.to);
  }
  if (c.id === 'bishopShift') {
    if (c.stage === 'bishop-piece')
      return allSquares().filter((s) => pieceAt(s)?.color === us && pieceAt(s)?.type === 'b');
    if (c.stage === 'bishop-move') {
      const { f, r } = parseSquare(c.source);
      return [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]
        .map(([df, dr]) => [f + df, r + dr])
        .filter(([x, y]) => x >= 0 && x < 8 && y >= 0 && y < 8)
        .map(([x, y]) => squareName(x, y))
        .filter(
          (s) =>
            !state.holes.includes(s) &&
            !state.shields.some((x) => x.square === s) &&
            (!pieceAt(s) || (pieceAt(s).color !== us && !isRoyalPiece(pieceAt(s)))),
        );
    }
  }
  if (c.id.startsWith('treason')) {
    const level = c.level,
      allowed = level === 1 ? ['p'] : level === 2 ? ['p', 'n', 'b'] : ['p', 'n', 'b', 'r'];
    if (c.stage === 'source')
      return allSquares().filter(
        (s) =>
          pieceAt(s)?.color === us &&
          !isChaosImmune(s) &&
          !isShielded(s) &&
          allSquares().some(
            (t) =>
              pieceAt(t)?.color === them &&
              allowed.includes(pieceAt(t)?.type) &&
              !isShielded(t) &&
              adjacent(s, t),
          ),
      );
    if (pieceAt(c.source)?.color !== us || isChaosImmune(c.source) || isShielded(c.source))
      return [];
    return allSquares().filter(
      (s) =>
        pieceAt(s)?.color === them &&
        allowed.includes(pieceAt(s)?.type) &&
        !isShielded(s) &&
        adjacent(c.source, s),
    );
  }
  if (c.id.startsWith('resurrect')) {
    if (c.stage !== 'resurrect-square') return [];
    const piece = c.candidates?.[c.choice];
    if (!piece) return [];
    const home = piece.type === 'p' ? (us === 'w' ? 1 : 6) : us === 'w' ? 0 : 7;
    return allSquares().filter((s) => parseSquare(s).r === home && !pieceAt(s));
  }
  return [];
}
function setCardPrompt(text) {
  $('#card-selection-text').textContent = text;
  $('#card-selection').classList.remove('hidden');
}
function offerCounterspell(card, target) {
  if (card.counterspellChecked) return false;
  const responder = card.side === 'w' ? 'b' : 'w',
    counterIndex = state.hands[responder].indexOf('counterspell');
  if (counterIndex < 0) return false;
  state.counterspellPending = { card, target, responder, counterIndex };
  showModal(
    'RESPOSTA MÁGICA',
    (responder === 'w' ? 'Brancas' : 'Pretas') + ' têm Contramagia.',
    'A carta “' +
      cardInfo[card.id].name +
      '” foi confirmada. Usar Contramagia cancela só o efeito, sem consumir o turno normal de quem a jogou.',
    [
      {
        label: 'Deixar resolver',
        fn: () => {
          const pending = state.counterspellPending;
          if (!pending) return;
          pending.card.counterspellChecked = true;
          state.counterspellPending = null;
          cardTarget(pending.target);
        },
      },
      {
        label: 'Cancelar com Contramagia',
        primary: true,
        fn: () => {
          const pending = state.counterspellPending;
          if (!pending) return;
          const original = pending.card;
          consumeCard('Efeito cancelado pela Contramagia.');
          state.hands[pending.responder].splice(pending.counterIndex, 1);
          state.cardsUsed[pending.responder] = true;
          recordActivity(
            'card',
            'Contramagia',
            cardInfo[original.id].name +
              ' cancelada depois da confirmação; o lance normal continua disponível.',
            pending.responder,
          );
          state.counterspellPending = null;
          state.pendingCard = null;
          state.selected = null;
          state.legal = [];
          $('#card-selection').classList.add('hidden');
          playSound('cardDefault');
          render();
          toast('Contramagia! A carta foi anulada; o lance normal continua disponível.');
        },
      },
    ],
  );
  return true;
}
function cardTarget(s, fromServer = false) {
  const c = state.pendingCard;
  if (!c) return;
  const id = c.id,
    p = pieceAt(s),
    us = c.side;
  if (!fromServer && !cardTargetSquares().includes(s)) {
    playSound('illegal');
    if (id === 'treason' && c.stage === 'target')
      toast('Escolha um peão inimigo destacado ao lado da sua peça.');
    else if (id === 'fury' && c.stage === 'fury-move')
      toast('Escolha uma das casas destacadas ou cancele a Fúria.');
    else if (
      (id === 'knightElephant' && c.stage === 'knight-move') ||
      (id === 'towerRam' && c.stage === 'tower-move')
    )
      toast('Escolha uma das casas destacadas ou cancele a carta.');
    else if (id === 'bomb' && p?.type === 'k')
      toast('Não é possível armar uma armadilha numa casa ocupada por um rei.');
    else if (id === 'bomb') toast('Armadilhas só podem ser armadas nas fileiras 3 a 6.');
    else toast('Escolha uma casa destacada ou cancele a carta.');
    return;
  }
  playSound('select');
  const finalStages = [
    'sacrifice-piece',
    'king-move',
    'resurrect-square',
    'fury-move',
    'knight-move',
    'tower-move',
    'bomb-cell',
  ];
  const finalTarget = id.startsWith('treason')
    ? c.stage === 'target'
    : id === 'shield' ||
      (id === 'bishopShift' && c.stage === 'bishop-move') ||
      finalStages.includes(c.stage);
  if (finalTarget && MP.connected && !fromServer) {
    if (!state.waitingForCounterspell) {
      mpSendCardPlay(c, s);
      state.waitingForCounterspell = true;
    }
    return;
  } else if (finalTarget && !fromServer && offerCounterspell(c, s)) return;
  if (id === 'sacrifice') {
    const pool = state.enabledCards.filter(
      (card) => card !== 'sacrifice' && !classCardIds(us).includes(card),
    );
    if (!pool.length) {
      state.pendingCard = null;
      render();
      toast('Ative ao menos outra carta para receber o resultado do Sacrifício.');
      return;
    }
    const victim = pieceAt(s),
      type = victim.type,
      value = values[type],
      name = pieceName[type];
    if (!removePiece(s)) {
      playSound('illegal');
      toast('Essa peça não pode ser sacrificada.');
      return;
    }
    state.dead[us].push({ type, color: us, sacrificed: true });
    consumeCard(`${name} sacrificada; recebeu ${value} carta${value === 1 ? '' : 's'}.`);
    state.sacrificeUsed[us] = true;
    for (let i = 0; i < value; i++) gainCard(us, random(pool));
    toast(`${name} sacrificada: +${value} carta${value === 1 ? '' : 's'}.`);
    state.pendingCard = null;
    render();
    return;
  }
  if (id === 'bomb' && c.stage === 'bomb-piece') {
    c.source = s;
    c.stage = 'bomb-cell';
    state.pendingCard.source = s;
    setCardPrompt(
      `Escolha uma casa alcançável pela peça ${s} para armar a armadilha. A peça não será movida.`,
    );
    render();
    return;
  }
  if (id === 'kingLeap' && c.stage === 'king-piece') {
    c.source = s;
    c.stage = 'king-move';
    state.selected = s;
    state.legal = safeVariantMoves(kingKnightMoves(s, us), us).filter(
      (m) => !state.holes.includes(m.to) && !isShielded(m.to),
    );
    setCardPrompt(`Salto do Rei: escolha o destino do rei ${s}. Esc cancela.`);
    render();
    return;
  }
  if (id === 'kingLeap' && c.stage === 'king-move') {
    const from = c.source,
      move = state.legal.find((m) => m.to === s);
    if (!move) return;
    if (!makeMove(from, s, move)) {
      toast(
        'O salto não pôde ser concluído; a carta continua disponível para cancelar ou tentar outro destino.',
      );
      return;
    }
    consumeCard(`Rei ${from}→${s}; salto de cavalo.`);
    state.pendingCard = null;
    render();
    return;
  }
  if (id === 'knightElephant' && c.stage === 'knight-piece') {
    c.source = s;
    c.stage = 'knight-move';
    state.selected = s;
    state.legal = safeVariantMoves(elephantMoves(s, us), us).filter(
      (m) => !state.shields.some((x) => x.square === m.to),
    );
    setCardPrompt(
      `Salto do elefante: escolha o destino do cavalo ${s} (duas casas na diagonal). Esc cancela.`,
    );
    render();
    return;
  }
  if (id === 'knightElephant' && c.stage === 'knight-move') {
    const from = c.source,
      move = state.legal.find((m) => m.to === s);
    if (!move) return;
    state.knightElephant = us;
    if (!makeMove(from, s, move)) {
      state.knightElephant = null;
      toast('O salto não pôde ser concluído; a carta continua disponível.');
      return;
    }
    consumeCard(`Cavalo ${from}→${s}; salto de duas casas na diagonal.`);
    state.pendingCard = null;
    render();
    return;
  }
  if (id === 'towerRam' && c.stage === 'tower-piece') {
    const moves = state.game
      .moves({ square: s, verbose: true })
      .filter(
        (m) =>
          !state.holes.includes(m.to) &&
          !crossesHole(m.from, m.to, m.piece) &&
          !state.shields.some((x) => x.square === m.to),
      );
    if (!moves.length) {
      toast('Essa torre não tem movimentos legais. Escolha outra torre ou cancele.');
      return;
    }
    c.source = s;
    c.stage = 'tower-move';
    state.selected = s;
    state.legal = moves;
    setCardPrompt(
      `Impacto: escolha uma casa para mover a torre ${s}; o efeito é confirmado ao mover. Esc cancela.`,
    );
    render();
    return;
  }
  if (id === 'towerRam' && c.stage === 'tower-move') {
    const from = c.source,
      move = state.legal.find((m) => m.to === s);
    if (!move) return;
    state.towerRam = us;
    if (!makeMove(from, s, move)) {
      state.towerRam = null;
      toast('O movimento não pôde ser concluído; a carta continua disponível.');
      return;
    }
    consumeCard(`Torre ${from}→${s}; o impacto foi aplicado após o movimento.`);
    state.pendingCard = null;
    render();
    return;
  }
  if (id === 'fury' && c.stage === 'fury-piece') {
    c.source = s;
    c.stage = 'fury-move';
    state.selected = s;
    state.legal = safeVariantMoves(furyMoves(s, us), us).filter(
      (m) => !state.holes.includes(m.to) && !state.shields.some((x) => x.square === m.to),
    );
    if (!state.legal.length) {
      toast('Esse peão não tem casas livres ao redor. Escolha outro peão ou cancele.');
      state.pendingCard.stage = 'fury-piece';
      state.pendingCard.source = null;
      state.selected = null;
      state.legal = [];
      render();
      return;
    }
    setCardPrompt(`Fúria: mova o peão de ${s} uma casa em qualquer direção; Esc cancela.`);
    render();
    return;
  }
  if (id === 'fury' && c.stage === 'fury-move') {
    const from = c.source,
      move = furyMoves(from, us).find((m) => m.to === s);
    if (!move) return;
    const commit = (promotion) => {
      if (!makeMove(from, s, { ...move, promotion }, promotion || 'q')) {
        toast('O movimento não pôde ser concluído; a carta continua disponível.');
        return;
      }
      consumeCard(`Peão ${from}→${s}; movimento de uma casa em qualquer direção.`);
      state.pendingCard = null;
      state.furySide = null;
      $('#card-selection').classList.add('hidden');
      render();
    };
    if (isPromotion(c.source, s, move)) {
      choosePromotion(from, s, move, commit);
      return;
    }
    commit();
    return;
  }
  if (id === 'bishopShift' && c.stage === 'bishop-piece') {
    c.source = s;
    c.stage = 'bishop-move';
    state.pendingCard.source = s;
    setCardPrompt(
      `Escolha uma casa ortogonal adjacente ao bispo ${s}. O movimento acontece no seu próximo turno.`,
    );
    render();
    return;
  }
  if (id === 'bishopShift' && c.stage === 'bishop-move') {
    state.scheduledBishops.push({ color: us, from: c.source, to: s });
    consumeCard(`Movimento do bispo agendado: ${c.source}→${s} no próximo turno.`);
    state.pendingCard = null;
    toast(`Movimento marcado: bispo ${c.source}→${s} no início do próximo turno.`);
    render();
    return;
  }
  if (id.startsWith('treason') && c.stage === 'source') {
    c.source = s;
    c.stage = 'target';
    setCardPrompt(`Agora clique na peça inimiga destacada ao lado de ${s}.`);
    render();
    return;
  }
  if (id === 'shield') {
    state.shields = state.shields.filter((x) => x.square !== s);
    state.shields.push({ square: s, color: us, fresh: true });
    consumeCard(
      `Escudo aplicado à peça em ${s}; ela fica imune a capturas e não pode se mover até o início do próximo turno.`,
    );
    toast(`Escudo em ${s}: fica imune, mas não pode se mover até seu próximo turno.`);
  } else if (id.startsWith('treason')) {
    const piece = pieceAt(s);
    setPieceColor(s, us);
    consumeCard(
      `${pieceName[piece.type]} convertido em ${s}.`,
      pieceLevelCost(piece.type),
    );
    toast(`Traição! ${pieceName[piece.type]} em ${s} mudou de lado.`);
  } else if (id === 'bomb') {
    const fuse = 2;
    state.bombs.push({
      square: s,
      source: c.source,
      owner: us,
      opponent: us === 'w' ? 'b' : 'w',
      turns: fuse,
    });
    consumeCard(
      `Armadilha armada em ${s}, ligada à peça de origem em ${c.source}. A contagem é de ${fuse} turnos.`,
    );
    toast(`Armadilha armada em ${s}; detona em ${fuse} turnos se não for desarmada.`);
  } else if (id.startsWith('resurrect')) {
    const piece = c.candidates[c.choice];
    if (!piece) {
      cancelCard();
      return;
    }
    placePiece(s, piece.color, piece.type);
    state.dead[us].splice(
      state.dead[us].findIndex((x) => x.type === piece.type),
      1,
    );
    consumeCard(
      `${pieceName[piece.type]} ressuscitado em ${s}.`,
      pieceLevelCost(piece.type),
    );
    toast(`${pieceName[piece.type]} ressuscitado em ${s}.`);
  }
  state.pendingCard = null;
  $('#card-selection').classList.add('hidden');
  render();
}
function adjacent(a, b) {
  const x = parseSquare(a),
    y = parseSquare(b);
  return Math.max(Math.abs(x.f - y.f), Math.abs(x.r - y.r)) === 1;
}
function setPieceColor(s, color) {
  const p = pieceAt(s);
  if (!p) return;
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/'),
    { f, r } = parseSquare(s);
  let chars = [];
  for (const ch of board[7 - r])
    if (/\d/.test(ch)) chars.push(...Array(+ch).fill('1'));
    else chars.push(ch);
  revokeCastlingRight(fen, s, chars[f]);
  chars[f] = color === 'w' ? chars[f].toUpperCase() : chars[f].toLowerCase();
  board[7 - r] = chars.join('').replace(/1+/g, (m) => m.length);
  fen[0] = board.join('/');
  state.game.load(fen.join(' '));
}
function placePiece(s, color, type) {
  const fen = state.game.fen().split(' '),
    board = fen[0].split('/'),
    { f, r } = parseSquare(s);
  let chars = [];
  for (const ch of board[7 - r])
    if (/\d/.test(ch)) chars.push(...Array(+ch).fill('1'));
    else chars.push(ch);
  chars[f] = color === 'w' ? type.toUpperCase() : type;
  board[7 - r] = chars.join('').replace(/1+/g, (m) => m.length);
  fen[0] = board.join('/');
  state.game.load(fen.join(' '));
}
function consumeCard(details = 'Efeito aplicado.', levelCost = 1) {
  const c = state.pendingCard;
  if (!c) return;
  if (!c.serverConsumed) {
    if (c.classPower) {
      state.powerUsed[c.side] = true;
      spendClassPower(c.side, Math.min(levelCost, c.level || 1));
    } else {
      const base = c.id.startsWith('treason')
          ? 'treason'
          : c.id.startsWith('resurrect')
            ? 'resurrect'
            : null,
        remaining = base ? c.level - Math.min(levelCost, c.level) : 0;
      if (remaining > 0) state.hands[c.side][c.index] = leveledCardId(base, remaining);
      else state.hands[c.side].splice(c.index, 1);
      if (c.id === 'sacrifice' && !state.sacrificeUsed[c.side]) state.sacrificeUsed[c.side] = true;
      else state.cardsUsed[c.side] = true;
    }
  }
  const sound = c.id.startsWith('resurrect')
    ? 'cardResurrect'
    : c.id.startsWith('treason')
      ? 'cardTreason'
      : c.id === 'sacrifice'
        ? 'cardSacrifice'
        : c.id === 'kingLeap'
          ? 'cardKnight'
          : c.id === 'shield'
            ? 'cardShield'
            : c.id === 'fury'
              ? 'cardFury'
              : c.id === 'bishopShift'
                ? 'cardBishop'
                : c.id === 'knightElephant'
                  ? 'cardKnight'
                  : c.id === 'towerRam'
                    ? 'cardTower'
                    : c.id === 'bomb'
                      ? 'cardBomb'
                      : 'cardDefault';
  playSound(sound);
  recordActivity(
    c.classPower ? 'power' : 'card',
    c.classPower
      ? `Poder de classe · ${classInfo[state.classes[c.side]].name}`
      : cardInfo[c.id].name,
    details,
    c.side,
  );
}
function cancelCard() {
  state.pendingCard = null;
  state.selected = null;
  state.legal = [];
  playSound('cancel');
  clearModal();
  $('#card-selection').classList.add('hidden');
  render();
  if (state.game?.isCheckmate()) {
    finishCheckmate();
    return;
  }
  toast('Uso da carta cancelado.');
}
function modalTargetSquares(message) {
  clearModal();
  setCardPrompt(message);
}
function showModal(kicker, title, subtitle, choices) {
  const root = $('#modal-root'),
    m = document.createElement('div');
  m.className = 'modal-backdrop';
  m.innerHTML = `<div class="modal"><div class="modal-kicker">${kicker}</div><h2>${title}</h2><p>${subtitle || ''}</p><div class="modal-choices"></div></div>`;
  const list = $('.modal-choices', m);
  choices.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'button' + (c.primary ? ' primary' : '');
    b.textContent = c.label;
    b.onclick = () => {
      clearModal();
      c.fn();
    };
    list.append(b);
  });
  root.replaceChildren(m);
}
function clearModal() {
  $('#modal-root').replaceChildren();
}
function toast(msg) {
  const old = $('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

// === Multiplayer ===
function mpProtocol() {
  return location.protocol === 'https:' ? 'wss:' : 'ws:';
}
function mpConnect(code) {
  if (MP.ws) MP.ws.close();
  MP.code = code;
  const wsUrl = `${mpProtocol()}//${location.host}/ws?code=${encodeURIComponent(code)}`;
  const ws = new WebSocket(wsUrl);
  MP.ws = ws;
  ws.onopen = () => {
    MP.connected = true;
    console.log('[MP] Conectado à sala', code);
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      mpHandleMessage(msg);
    } catch (e) {
      console.error('[MP] Mensagem inválida', e);
    }
  };
  ws.onclose = () => {
    MP.connected = false;
    if (!MP.opponentJoined) toast('Conexão encerrada. Tente novamente.');
  };
  ws.onerror = (err) => {
    console.error('[MP] Erro WebSocket', err);
    toast('Erro de conexão com a sala.');
  };
}
function mpHandleMessage(msg) {
  switch (msg.type) {
    case 'joined':
      MP.player = msg.player;
      MP.side = msg.side;
      MP.opponentJoined = msg.players >= 2;
      if (MP.opponentJoined) {
        toast('Adversário entrou. Partida começando!');
        $('#room-status').innerHTML = '<span class="room-status-dot"></span><span>Adversário conectado!</span>';
        startMultiplayerGame(msg.fen, msg.opts);
      } else {
        $('#room-status').innerHTML = '<span class="room-status-dot"></span><span>Você é o Jogador 1. Aguardando adversário...</span>';
      }
      break;
    case 'start':
      MP.opponentJoined = true;
      MP.side = msg.sides && msg.sides[MP.player - 1] ? msg.sides[MP.player - 1] : MP.side || 'w';
      MP.serverHands = msg.hands || { w: [], b: [] };
      MP.serverClasses = msg.classes || null;
      toast('Partida começou!');
      startMultiplayerGame(msg.fen, msg.opts);
      if (msg.eventForecast) state.eventForecast = { type: msg.eventForecast.type, squares: [] };
      render();
      break;
    case 'state':
      applyState(msg);
      break;
    case 'move':
      applyRemoteMove(msg.from, msg.to, msg.promotion, msg.fen, msg.captured, null, msg.piece, null);
      break;
    case 'resign':
      toast(`Jogador ${msg.player} resignou.`);
      break;
    case 'opponentLeft':
      toast('Adversário saiu da sala.');
      break;
    case 'error':
      toast(msg.message || 'Erro na sala.');
      break;
    case 'classPick':
      state.classes[msg.side] = msg.class;
      if (state.classes.w && state.classes.b) beginMatch();
      break;
    case 'classReady':
      if (msg.classes.w) state.classes.w = msg.classes.w;
      if (msg.classes.b) state.classes.b = msg.classes.b;
      MP.serverHands = msg.hands || { w: [], b: [] };
      beginMatch();
      break;
    case 'eventTrigger':
      applyRemoteEvent(msg);
      render();
      break;
    case 'eventForecast':
      state.eventForecast = { type: msg.eventType, squares: [] };
      render();
      break;
    case 'cardPlay':
      // Outro jogador jogou uma carta; verificar se temos contramagia disponível
      if (state.hands[MP.side] && state.hands[MP.side].includes('counterspell') && !state.cardsUsed[MP.side]) {
        const counterIndex = state.hands[MP.side].indexOf('counterspell');
        state.counterspellPending = { card: msg.card, target: msg.target, responder: MP.side, counterIndex };
        showModal(
          'RESPOSTA MÁGICA',
          (MP.side === 'w' ? 'Brancas' : 'Pretas') + ' têm Contramagia.',
          'A carta "' + cardInfo[msg.card].name + '" foi confirmada. Usar Contramagia cancela só o efeito, sem consumir o turno normal de quem a jogou.',
          [
            {
              label: 'Deixar resolver',
              fn: () => {
                if (!state.counterspellPending) return;
                state.counterspellPending.card.counterspellChecked = true;
                state.counterspellPending = null;
                mpSendCounterspellResponse(false);
              },
            },
            {
              label: 'Cancelar com Contramagia',
              primary: true,
              fn: () => {
                if (!state.counterspellPending) return;
                const pending = state.counterspellPending;
                state.hands[MP.side].splice(pending.counterIndex, 1);
                state.cardsUsed[MP.side] = true;
                state.counterspellPending = null;
                mpSendCounterspellResponse(true);
                playSound('cardDefault');
                toast('Contramagia! A carta foi anulada.');
                render();
              },
            },
          ],
        );
      }
      break;
    case 'counterspellRequest':
      // Servidor está pedindo para usar contramagia
      if (state.hands[MP.side] && state.hands[MP.side].includes('counterspell') && !state.cardsUsed[MP.side]) {
        const counterIndex = state.hands[MP.side].indexOf('counterspell');
        state.counterspellPending = { card: msg.card, target: msg.target, responder: MP.side, counterIndex };
        showModal(
          'RESPOSTA MÁGICA',
          (MP.side === 'w' ? 'Brancas' : 'Pretas') + ' têm Contramagia.',
          'A carta "' + msg.card + '" foi confirmada. Usar Contramagia cancela só o efeito.',
          [
            {
              label: 'Cancelar com Contramagia',
              primary: true,
              fn: () => {
                if (!state.counterspellPending) return;
                state.hands[MP.side].splice(counterIndex, 1);
                state.cardsUsed[MP.side] = true;
                state.counterspellPending = null;
                mpSendCounterspellResponse(true);
                playSound('cardDefault');
                toast('Contramagia! A carta foi anulada.');
                render();
              },
            },
            {
              label: 'Deixar resolver',
              fn: () => {
                if (!state.counterspellPending) return;
                state.counterspellPending.card.counterspellChecked = true;
                state.counterspellPending = null;
                mpSendCounterspellResponse(false);
              },
            },
          ],
        );
      } else {
        // Não temos contramagia; carta segue normalmente
        mpSendCounterspellResponse(false);
      }
      break;
    case 'cardConfirmed':
      // Carta foi confirmada (contramagia não usada ou não disponível)
      state.waitingForCounterspell = false;
      const hadPending = !!state.pendingCard;
      if (hadPending && state.pendingCard) {
        state.pendingCard.serverConsumed = true;
        cardTarget(msg.target, true);
      }
      state.pendingCard = null;
      state.selected = null;
      state.legal = [];
      $('#card-selection').classList.add('hidden');
      render();
      break;
    case 'cardCancelled':
      // Carta foi cancelada por contramagia
      state.waitingForCounterspell = false;
      state.pendingCard = null;
      state.selected = null;
      state.legal = [];
      $('#card-selection').classList.add('hidden');
      playSound('cardDefault');
      toast('Contramagia! A carta foi anulada; o lance normal continua disponível.');
      render();
      break;
  }
}
function applyRemoteEvent(msg) {
  // Clear old event visuals
  state.holes = msg.holes || [];
  state.portals = msg.portals || [];
  state.mines = msg.mines || [];
  state.eventHighlights = [];
  state.eventType = msg.type;
  playSound(msg.type);
  // Apply swap pieces
  if (msg.swaps) {
    for (const s of msg.swaps) swapPieces(s.a, s.b);
  }
  // Show event banner with server-provided data
  const title = eventInfo[msg.type][0];
  let desc = eventInfo[msg.type][1];
  if (msg.type === 'quake' && msg.holes) desc = `Abismos nas casas ${msg.holes.join(' e ')}. ${eventInfo[msg.type][1]}`;
  if (msg.type === 'portal' && msg.portals) desc = `Portais ativos em ${msg.portals.join(' e ')}. Pouse em um para atravessar.`;
  if (msg.type === 'mines') desc = `Quatro minas invisíveis foram espalhadas entre as fileiras 3 e 6. ${eventInfo[msg.type][1]}`;
  $('#event-banner').textContent = `✳ ${title} — ${desc}`;
  $('#event-banner').classList.remove('hidden');
  toast(title + '! ' + desc);
  recordActivity('event', title, desc, state.game.turn());
  // Reset event progress counter and prepare next forecast
  state.eventPly = 0;
  prepareEventForecast();
}
function mpSendMove(from, to, promotion, fen, captured, san, piece, color) {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({ type: 'move', from, to, promotion, fen, captured: captured || null, san: san || null, piece: piece || null, color: color || null }));
}
function mpSendResign() {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({ type: 'resign' }));
}
function mpSendClassPick(classId) {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({ type: 'classPick', side: MP.side, class: classId }));
}
function mpSendCardPlay(c, target) {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({
    type: 'cardPlay',
    card: c.id,
    target,
    isClassPower: !!c.classPower,
    powerId: c.classPower ? c.id : null,
  }));
}
function mpSendCounterspellResponse(accepted) {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({ type: 'counterspellResponse', accepted }));
}
function startMultiplayerGame(fen, opts) {
  state.game = new Chess();
  if (fen) state.game.load(fen);
  state.opts = opts || chosenMPSetup();
  state.selected = null;
  state.legal = [];
  state.moves = [];
  state.snapshots = [];
  state.lastMove = null;
  state.round = 1;
  state.eventPly = 0;
  state.eventType = null;
  state.eventForecast = null;
  state.eventHighlights = [];
  state.activity = [];
  state.logView = 'moves';
  state.holes = [];
  state.portals = [];
  state.mines = [];
  state.shields = [];
  state.bombs = [];
  state.stunned = [];
  state.scheduledBishops = [];
  state.grimoirePicker = null;
  state.hands = { w: [], b: [] };
  state.dead = { w: [], b: [] };
  state.captureRewards = { w: [], b: [] };
  state.roundDeltas = [];
  state.roundMaterialBaseline = 0;
  state.sacrificeUsed = { w: false, b: false };
  state.cardsUsed = { w: false, b: false };
  state.handSide = MP.side || 'w';
  state.pendingCard = null;
  state.counterspellPending = null;
  state.waitingForCounterspell = false;
  state.mateResponseOffered = false;
  state.classes = { w: null, b: null };
  state.classPower = { w: { charges: 0, cooldown: 0 }, b: { charges: 0, cooldown: 0 } };
  state.powerUsed = { w: false, b: false };
  state.enabledClasses = state.opts.enabledClasses;
  state.enabledCards = state.opts.enabledCards;
  state.classRandom = state.opts.randomClasses;
  state.furySide = null;
  state.knightElephant = null;
  state.towerRam = null;
  state.roulette = null;
  state.ended = false;
  state.promotionPending = null;
  state.motion = null;
  state.classDraft = null;
  $('#multiplayer-screen').classList.add('hidden');
  $('#setup-screen').classList.add('hidden');
  $('#game-screen').classList.remove('hidden');
  $('#mode-label').textContent = modeNames[state.opts.mode] || 'MULTIJOGADOR';
  $('.game-heading .eyebrow').innerHTML = '<span class="live-dot"></span> PARTIDA MULTIJOGADOR';
  $('.game-heading h1').innerHTML = 'Sala <span>' + MP.code + '</span>';
  $('#hands-panel').classList.toggle('hidden', !state.opts.cards && !state.opts.classes);
  $('#event-banner').classList.add('hidden');
  // Em multiplayer, eventos são coordenados pelo servidor via eventTrigger
  if (!MP.connected) prepareEventForecast();
  if (state.opts.classes && state.enabledClasses.length && !state.classRandom) {
    const mySide = MP.side || 'w';
    state.classDraft = { step: 0, picks: { [mySide]: null } };
    $('.game-heading .eyebrow').innerHTML = '<span class="live-dot"></span> ESCOLHA DE CLASSE';
    $('.game-heading h1').innerHTML =
      mySide === 'w' ? 'Escolha sua <span>classe.</span>' : 'Escolha sua <span>classe.</span>';
    render();
    return;
  }
  if (state.opts.classes && state.enabledClasses.length) {
    if (state.classRandom && MP.serverClasses) {
      // Classes randômicas vêm do servidor
      state.classes = { ...MP.serverClasses };
    } else {
      // Classes sorteadas localmente (modo single-player ou fallback)
      state.classes = { w: random(state.enabledClasses), b: random(state.enabledClasses) };
    }
  }
  beginMatch();
}
function showMultiplayer() {
  $('#setup-screen').classList.add('hidden');
  $('#game-screen').classList.add('hidden');
  $('#multiplayer-screen').classList.remove('hidden');
  startAmbient('setup');
}
function showSetupFromMultiplayer() {
  if (MP.ws) MP.ws.close();
  MP.ws = null;
  MP.connected = false;
  MP.opponentJoined = false;
  $('#multiplayer-screen').classList.add('hidden');
  $('#setup-screen').classList.remove('hidden');
  startAmbient('setup');
}
function createRoom() {
  fetch('/api/rooms', { method: 'POST' })
    .then((r) => r.json())
    .then((data) => {
      MP.room = data;
      $('#room-creation').classList.remove('hidden');
      $('#room-code').textContent = data.code;
      $('#room-url').textContent = data.url;
      $('#room-join').classList.add('hidden');
      mpConnect(data.code);
    })
    .catch(() => toast('Erro ao criar sala. Tente novamente.'));
}
function joinRoom(code) {
  fetch(`/api/rooms/${encodeURIComponent(code)}`)
    .then((r) => {
      if (!r.ok) throw new Error('Sala não encontrada');
      return r.json();
    })
    .then((data) => {
      MP.room = data;
      $('#room-creation').classList.add('hidden');
      $('#room-join').classList.add('hidden');
      $('#multiplayer-screen .hero-copy h1').innerHTML = `Sala <span>${code}</span>`;
      $('#multiplayer-screen .hero-copy p').textContent = 'Conectando ao adversário...';
      mpConnect(code);
    })
    .catch(() => {
      $('#join-error').classList.remove('hidden');
    });
}
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast('Copiado!')).catch(() => {});
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copiado!'); } catch {}
    ta.remove();
  }
}
function applyState(msg) {
  // Sincroniza TUDO do servidor (autoridade)
  if (msg.fen) {
    state.game.load(msg.fen);
  }
  state.turn = msg.turn;
  state.moves = msg.history || [];
  state.round = msg.round || 1;
  state.eventPly = msg.eventPly || 0;
  state.eventType = msg.eventType || null;
  state.eventForecast = msg.eventForecast || null;
  state.dead = msg.dead || { w: [], b: [] };
  state.classPower = msg.classPower || { w: { charges: 0, cooldown: 0 }, b: { charges: 0, cooldown: 0 } };
  state.classes = msg.classes || { w: null, b: null };
  state.holes = msg.holes || [];
  state.portals = msg.portals || [];
  state.mines = msg.mines || [];
  state.swaps = msg.swaps || [];
  state.lastMove = msg.lastMove || null;
  state.hands = msg.hands || { w: [], b: [] };
  state.cardsUsed = msg.cardsUsed || { w: false, b: false };
  state.sacrificeUsed = msg.sacrificeUsed || { w: false, b: false };
  state.powerUsed = msg.powerUsed || { w: false, b: false };
  if (msg.winner) {
    state.ended = true;
    toast(msg.winner === 'w' ? 'Brancas venceram!' : 'Pretas venceram!');
  }
  render();
}

function applyRemoteMove(from, to, promotion, fen, captured, san, piece, color) {
  // Apenas aplica o movimento no tabuleiro local para feedback imediato.
  // Contadores/eventos/capturas/poderes vêm via 'state' broadcast.
  if (fen) {
    try { state.game.load(fen); } catch {}
  }
  state.lastMove = { from, to };
  // Som/animação de captura/movimento (p/ mover que o fez)
  if (captured) playSound('capture');
  else playSound('move');
  if (piece === 'p' && (to[1] === '1' || to[1] === '8')) playSound('promotion');
  render();
}

function setGameFromBoard(fen) {
  try {
    state.game.load(fen);
  } catch {}
}
$('#card-icons').innerHTML = allCards
  .map(
    (id) =>
      '<button type="button" class="card-icon-toggle" data-card="' +
      id +
      '" aria-pressed="true" title="' +
      cardInfo[id].name +
      ': ' +
      cardInfo[id].desc +
      '"><span>' +
      cardInfo[id].icon +
      '</span><small>' +
      cardInfo[id].name.split(' · ')[0] +
      '</small></button>',
  )
  .join('');
$$('.card-icon-toggle').forEach((button) =>
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!on));
    button.classList.toggle('disabled', on);
  }),
);
$('#class-icons').innerHTML = Object.entries(classInfo)
  .map(
    ([id, c]) =>
      '<button type="button" class="class-icon-toggle" data-class="' +
      id +
      '" aria-pressed="true" title="' +
      c.name +
      ': ' +
      c.description +
      '">' +
      c.icon +
      '<span>' +
      c.name +
      '</span></button>',
  )
  .join('');
$$('.class-icon-toggle').forEach((button) =>
  button.addEventListener('click', () => {
    const active = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!active));
    button.classList.toggle('disabled', active);
  }),
);

// MP config: popule cards e classes
$('#mp-card-icons').innerHTML = allCards
  .map(
    (id) =>
      '<button type="button" class="card-icon-toggle" data-card="' +
      id +
      '" aria-pressed="true" title="' +
      cardInfo[id].name +
      ': ' +
      cardInfo[id].desc +
      '"><span>' +
      cardInfo[id].icon +
      '</span><small>' +
      cardInfo[id].name.split(' · ')[0] +
      '</small></button>',
  )
  .join('');
$$('#mp-card-icons .card-icon-toggle').forEach((button) =>
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!on));
    button.classList.toggle('disabled', on);
  }),
);
$('#mp-class-icons').innerHTML = Object.entries(classInfo)
  .map(
    ([id, c]) =>
      '<button type="button" class="class-icon-toggle" data-class="' +
      id +
      '" aria-pressed="true" title="' +
      c.name +
      ': ' +
      c.description +
      '">' +
      c.icon +
      '<span>' +
      c.name +
      '</span></button>',
  )
  .join('');
$$('#mp-class-icons .class-icon-toggle').forEach((button) =>
  button.addEventListener('click', () => {
    const active = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!active));
    button.classList.toggle('disabled', active);
  }),
);
function syncMechanicOptions() {
  const globalOn = $('#toggle-cards').checked,
    cardOn = globalOn && $('#toggle-individual-cards').checked,
    classOn = globalOn && $('#toggle-classes').checked;
  $('#card-icons').classList.toggle('disabled-options', !cardOn);
  $('#classes-options').classList.toggle('disabled-options', !classOn);
  $('#random-classes').disabled = !classOn;
  $('.mechanic-group:has(#toggle-cards) .card-preview-row').classList.toggle(
    'disabled-options',
    !cardOn,
  );
  $('#toggle-individual-cards').disabled = !globalOn;
  $('#toggle-classes').disabled = !globalOn;
}
$('#toggle-classes').addEventListener('change', syncMechanicOptions);
$('#toggle-individual-cards').addEventListener('change', syncMechanicOptions);
$('#toggle-cards').addEventListener('change', syncMechanicOptions);
syncMechanicOptions();

// MP config: toggles para eventos, cartas, classes e modos
function syncMPOptions() {
  const mpGlobalOn = $('#mp-toggle-cards')?.checked;
  const mpCardOn = mpGlobalOn && $('#mp-toggle-individual-cards')?.checked;
  const mpClassOn = mpGlobalOn && $('#mp-toggle-classes')?.checked;
  const mpCardIcons = $('#mp-card-icons');
  const mpClassesOptions = $('#mp-classes-options');
  const mpRandomClasses = $('#mp-random-classes');
  const mpToggleIndividualCards = $('#mp-toggle-individual-cards');
  const mpToggleClasses = $('#mp-toggle-classes');
  if (mpCardIcons) mpCardIcons.classList.toggle('disabled-options', !mpCardOn);
  if (mpClassesOptions) mpClassesOptions.classList.toggle('disabled-options', !mpClassOn);
  if (mpRandomClasses) mpRandomClasses.disabled = !mpClassOn;
  if (mpToggleIndividualCards) mpToggleIndividualCards.disabled = !mpGlobalOn;
  if (mpToggleClasses) mpToggleClasses.disabled = !mpGlobalOn;
  document.querySelectorAll('#multiplayer-config input[name="mp-event"]').forEach((input) => {
    const group = input.closest('.mechanic-group');
    if (group) group.style.opacity = input.checked ? '1' : '0.4';
  });
}
$('#mp-toggle-events').addEventListener('change', (e) => {
  const group = e.target.closest('.mechanic-group');
  if (group) group.style.opacity = e.target.checked ? '1' : '0.4';
});
$('#mp-toggle-cards').addEventListener('change', syncMPOptions);
$('#mp-toggle-individual-cards').addEventListener('change', syncMPOptions);
$('#mp-toggle-classes').addEventListener('change', syncMPOptions);
$('#mp-random-classes').addEventListener('change', syncMPOptions);
syncMPOptions();

// MP config: mode-card selection
$$('#multiplayer-config .mode-card').forEach((card) =>
  card.addEventListener('click', () => {
    $$('#multiplayer-config .mode-card').forEach((other) => {
      const active = other === card;
      other.classList.toggle('selected', active);
      other.setAttribute('aria-pressed', String(active));
    });
  }),
);

function chosenMPSetup() {
  const mpGlobalOn = $('#mp-toggle-cards')?.checked;
  return {
    events: $('#mp-toggle-events')?.checked,
    eventTypes: $$('#multiplayer-config input[name="mp-event"]:checked').map((x) => x.value),
    cards: mpGlobalOn && $('#mp-toggle-individual-cards')?.checked,
    classes: mpGlobalOn && $('#mp-toggle-classes')?.checked,
    randomClasses: $('#mp-random-classes')?.checked,
    mode: $('#multiplayer-config .mode-card.selected')?.dataset.mode || 'classic',
    enabledCards: $$('#mp-card-icons .card-icon-toggle')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.dataset.card),
    enabledClasses: $$('#mp-class-icons .class-icon-toggle')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.dataset.class),
  };
}
function keyHandler(e) {
  if (e.key === 'Escape') {
    if (state.promotionPending) {
      clearPromotionMenu();
      playSound('cancel');
      if (state.pendingCard) cancelCard();
    } else if (state.grimoirePicker) {
      state.grimoirePicker = null;
      playSound('cancel');
      render();
    } else if (state.pendingCard) cancelCard();
    else if (state.game)
      showModal(
        'NOVA PARTIDA',
        'Reiniciar o tabuleiro?',
        'O histórico e os eventos desta partida serão apagados.',
        [
          { label: 'Continuar jogando', fn: () => {} },
          { label: 'Reiniciar', primary: true, fn: newGame },
        ],
      );
  }
}
$('#start-game').addEventListener('click', newGame);
$('#new-game-top').addEventListener('click', () => (state.game ? newGame() : showSetup()));
$('#restart-btn').addEventListener('click', newGame);
$('#back-setup').addEventListener('click', showSetup);
$('#toggle-events').addEventListener(
  'change',
  (e) => ($('#events-options').style.opacity = e.target.checked ? '1' : '.4'),
);
$$('input[name="mode"]').forEach((i) =>
  i.addEventListener('change', () => {
    $$('.mode-card').forEach((c) =>
      c.classList.toggle('selected', c.contains($('input', c)) && $('input', c).checked),
    );
  }),
);
$$('.hand-tab').forEach((t) =>
  t.addEventListener('click', () => {
    state.handSide = t.dataset.hand;
    renderHand();
  }),
);
$$('.mode-card').forEach((card) =>
  card.addEventListener('click', () => {
    $$('.mode-card').forEach((other) => {
      const active = other === card;
      other.classList.toggle('selected', active);
      other.setAttribute('aria-pressed', String(active));
    });
  }),
);
$('#cancel-card').addEventListener('click', cancelCard);
$('#sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  const button = $('#sound-toggle');
  button.textContent = soundEnabled ? '♫ Som ligado' : '♪ Som desligado';
  button.setAttribute('aria-pressed', String(soundEnabled));
  button.setAttribute('aria-label', soundEnabled ? 'Desativar sons' : 'Ativar sons');
  if (soundEnabled) playSound('ui');
});
$('#music-toggle').addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  localStorage.setItem('checkmage-music', musicEnabled ? 'on' : 'off');
  const button = $('#music-toggle');
  button.textContent = musicEnabled ? '♪ Música ligada' : '♪ Música desligada';
  button.setAttribute('aria-pressed', String(musicEnabled));
  button.setAttribute(
    'aria-label',
    musicEnabled ? 'Desativar música ambiente' : 'Ativar música ambiente',
  );
  if (musicEnabled) startAmbient(state.game ? 'game' : 'setup');
  else stopAmbient();
});
$('#music-toggle').textContent = musicEnabled ? '♪ Música ligada' : '♪ Música desligada';
$('#music-toggle').setAttribute('aria-pressed', String(musicEnabled));
$('#music-toggle').setAttribute(
  'aria-label',
  musicEnabled ? 'Desativar música ambiente' : 'Ativar música ambiente',
);
startAmbient('setup');
document.addEventListener(
  'click',
  (e) => {
    if (e.target.closest('.square')) return;
    if (e.target.closest('#sound-toggle')) {
      if (soundEnabled) playSound('ui');
      return;
    }
    if (e.target.closest('#cancel-card')) return;
    if (e.target.closest('.power-card')) {
      playSound('cardSelect');
      return;
    }
    if (e.target.closest('button,label,input')) playSound('ui');
  },
  true,
);
$$('.history-tab').forEach((btn) =>
  btn.addEventListener('click', () => setLogView(btn.dataset.view)),
);
document.addEventListener('pointermove', movePointerDrag, { passive: false });
document.addEventListener('pointerup', finishPointerDrag);
document.addEventListener('pointercancel', cancelPointerDrag);
document.addEventListener('keydown', keyHandler);

// === Inicialização multiplayer ===
function initMultiplayer() {
  $('#multiplayer-btn').addEventListener('click', showMultiplayer);
  $('#create-room').addEventListener('click', () => {
    // Mostrar as opções de configuração de jogo antes de criar a sala
    $('#room-creation').classList.add('hidden');
    $('#room-join').classList.add('hidden');
    $('#multiplayer-config').classList.remove('hidden');
  });
  $('#join-room').addEventListener('click', () => {
    $('#room-creation').classList.add('hidden');
    $('#room-join').classList.remove('hidden');
    $('#multiplayer-config').classList.add('hidden');
    $('#join-error').classList.add('hidden');
  });
  $('#mp-create-confirm').addEventListener('click', () => {
    // Criar a sala com as regras selecionadas
    const opts = chosenMPSetup();
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    })
      .then((r) => r.json())
      .then((data) => {
        MP.room = data;
        $('#room-creation').classList.remove('hidden');
        $('#room-code').textContent = data.code;
        $('#room-url').textContent = data.url;
        $('#multiplayer-config').classList.add('hidden');
        $('#room-join').classList.add('hidden');
        mpConnect(data.code);
      })
      .catch(() => toast('Erro ao criar sala. Tente novamente.'));
  });
  $('#mp-create-cancel').addEventListener('click', () => {
    $('#multiplayer-config').classList.add('hidden');
    $('#room-creation').classList.add('hidden');
    $('#room-join').classList.add('hidden');
  });
  $('#copy-code').addEventListener('click', () => copyToClipboard($('#room-code').textContent));
  $('#copy-url').addEventListener('click', () => copyToClipboard($('#room-url').textContent));
  $('#join-submit').addEventListener('click', () => {
    const code = $('#room-code-input').value.trim().toUpperCase();
    if (code.length !== 6) {
      $('#join-error').textContent = 'Código deve ter 6 dígitos.';
      $('#join-error').classList.remove('hidden');
      return;
    }
    $('#join-error').classList.add('hidden');
    joinRoom(code);
  });
  $('#back-multiplayer').addEventListener('click', showSetupFromMultiplayer);

  // Rota /room/:CODE
  const path = location.pathname;
  const m = path.match(/^\/room\/([A-Z0-9]{6})$/i);
  if (m) {
    const code = m[1].toUpperCase();
    showMultiplayer();
    setTimeout(() => joinRoom(code), 300);
  }
}
initMultiplayer();
