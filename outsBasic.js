import { renderOutsGrid, renderEquityRow, setSolutionOuts, validateOutsSelection } from './identify.js';
import { attachKeypadToEquity } from './numaKeypad.js';
import { toggleRevealHints } from './reveal.js'; // Lógica del ojito en archivo separado

// ==========================
// Funciones de renderado locales
// ==========================

function renderFullBoard(boardCards) {
  const container = document.getElementById('duel-board');
  if (!container) return;
  container.innerHTML = '';

  // Board siempre con 5 posiciones
  const totalBoard = [...boardCards];
  while (totalBoard.length < 5) totalBoard.push(null); // Rellenar con placeholders

  totalBoard.forEach((card, index) => {
    const d = document.createElement('div');
    d.className = 'card board-slot';
    if (card) {
      const span = document.createElement('span');
      span.className = 'card-content';
      span.textContent = `${card[0]}\u202F${card[1]}`;
      d.appendChild(span);
      d.dataset.card = card;
    } else {
      d.dataset.card = '';
      d.classList.add('placeholder');
    }

    // Estilo especial para Turn y River
    if (index === 3 && !showTurn) d.classList.add('disabled-turn');
    if (index === 4) d.classList.add('river-slot');

    container.appendChild(d);
  });
}

function renderHeroHand(heroCards) {
  const container = document.getElementById('hero-hand');
  if (!container) return;
  container.innerHTML = '';

  heroCards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'card';
    const span = document.createElement('span');
    span.className = 'card-content';
    span.textContent = `${card[0]}\u202F${card[1]}`;
    d.appendChild(span);
    d.dataset.card = card;
    container.appendChild(d);
  });
}

function renderHeroControls() {
  const heroContainer = document.getElementById('hero-hand');
  const btnEye = document.createElement('button');
  btnEye.className = 'eye-btn hero-eye';
  btnEye.textContent = '𓂀';
  btnEye.addEventListener('click', toggleRevealHints);
  heroContainer.appendChild(btnEye);
}

function updateSuitColors() {
  document.querySelectorAll('.card').forEach(card => {
    card.style.color = '#29a847'; // Verde por defecto
  });
}

// ==========================
// Constantes y variables globales
// ==========================
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];

export let currentOuts = 0;
export let currentOutsList = [];
export let currentBoard = [];
export let currentHero = [];

// NUEVA VARIABLE para forzar turn
export let forceTurn = false;

let showTurn = false;
let currentEquityTurn = 0;
let currentEquityRiver = 0;

// ==========================
// FUNCIÓN PRINCIPAL
// ==========================
export function generateBasicSpot() {
  const container = document.getElementById('bottom-controls');
  container.innerHTML = '';

  // Si forceTurn está activo, siempre hay Flop+Turn
  showTurn = forceTurn ? true : (Math.random() < 0.5);

  // Generar mano y board
  const { hero, board } = generateRandomProject();
  currentHero = hero;
  currentBoard = showTurn ? board.slice(0, 4) : board.slice(0, 3);

  // Outs correctas
  const outs = setSolutionOuts(hero, currentBoard);
  currentOutsList = outs;
  currentOuts = outs.length;

  // Equity esperada
  if (showTurn) {
    currentEquityTurn = currentOuts * 4;
    currentEquityRiver = null;
  } else {
    currentEquityTurn = currentOuts * 2;
    currentEquityRiver = currentOuts * 4;
  }

  // Render
  renderHeroHand(hero);
  renderHeroControls();
  renderFullBoard(currentBoard);
  renderOutsGrid('bottom-controls');
  renderEquityRow('bottom-controls');
    renderActionButtons();
  attachKeypadToEquity();            // Vinculamos el keypad a los campos


  const combo = document.getElementById('combo-global');
  combo.textContent = showTurn
    ? `Proyecto: ${outs.length} outs (Turn→River)`
    : `Proyecto: ${outs.length} outs (Flop→Turn→River)`;

  attachValidationListeners();       // Validación automática
  attachConfigListeners();
  updateSuitColors();
}


// ==========================
// BOTONES
// ==========================
function renderActionButtons() {
  const container = document.getElementById('bottom-controls');
  if (!container) return;

  const btnRow = document.createElement('div');
  btnRow.className = 'action-buttons';

  const btnCall = document.createElement('button');
  btnCall.className = 'action-btn call-btn';
  btnCall.textContent = 'CALL';

  const btnSettings = document.createElement('button');
  btnSettings.className = 'action-btn settings-btn';
  btnSettings.textContent = '⚙';
  btnSettings.addEventListener('click', () => {
    document.getElementById('screen-outs').style.display = 'none';
    document.getElementById('config-screen').style.display = 'flex';
  });

  const btnFold = document.createElement('button');
  btnFold.className = 'action-btn fold-btn';
  btnFold.textContent = 'FOLD';

  btnRow.appendChild(btnCall);
  btnRow.appendChild(btnSettings);
  btnRow.appendChild(btnFold);

  container.appendChild(btnRow);
}

// ==========================
// VALIDACIONES
// ==========================
function validateExercise() {
  const outsCorrect = validateOutsSelection();
  const equityCorrect = checkEquityInputs();
  if (outsCorrect && equityCorrect) setTimeout(generateBasicSpot, 800);
}

function checkEquityInputs() {
  const turnInput = document.getElementById('equity-turn');
  const riverInput = document.getElementById('equity-river');

  const turnValid = turnInput ? validateSingleEquity(turnInput.value, currentEquityTurn) : true;
  const riverValid = !showTurn && riverInput
    ? validateSingleEquity(riverInput.value, currentEquityRiver)
    : true;

  return turnValid && riverValid;
}

function validateSingleEquity(value, required) {
  if (required == null) return true;
  const num = parseFloat(value.replace(',', '.'));
  return !isNaN(num) && Math.abs(num - required) <= 0.5;
}

function attachValidationListeners() {
  document.querySelectorAll('.card-grid').forEach(cell =>
    cell.addEventListener('click', validateExercise)
  );

  const inputTurn = document.getElementById('equity-turn');
  const inputRiver = document.getElementById('equity-river');
  if (inputTurn) inputTurn.addEventListener('input', validateExercise);
  if (inputRiver) inputRiver.addEventListener('input', validateExercise);
}

// ==========================
// LISTENERS CONFIGURACIÓN
// ==========================
function attachConfigListeners() {
  const btnTurn = document.getElementById('toggle-turn');
  const btnExit = document.getElementById('exit-config');

  if (btnTurn) {
    btnTurn.onclick = () => {
      forceTurn = !forceTurn;
      btnTurn.textContent = `Turn: ${forceTurn ? 'ON' : 'OFF'}`;
    };
  }

  if (btnExit) {
    btnExit.onclick = () => {
      document.getElementById('config-screen').style.display = 'none';
      document.getElementById('screen-outs').style.display = 'flex';
      generateBasicSpot(); // Regenerar con nueva configuración
    };
  }
}

// ==========================
// GENERADORES DE PROYECTO
// ==========================
function generateRandomProject() {
  const generators = [genOESD, genGutshot, genFlush, genComboOESDFlush, genComboGutFlush];
  const gen = generators[Math.floor(Math.random() * generators.length)];
  return gen();
}

function buildDeck(exclude = []) {
  const used = new Set(exclude);
  return RANKS.flatMap(r => SUITS.map(s => r + s))
              .filter(c => !used.has(c));
}

function pick(deck, n) {
  const arr = [...deck];
  const res = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * arr.length);
    res.push(arr.splice(idx, 1)[0]);
  }
  return res;
}

// === Generadores ===
function genOESD() {
  const start = Math.floor(Math.random() * 7);
  const run = [RANKS[start], RANKS[start+1], RANKS[start+2], RANKS[start+3]];
  const deck0 = buildDeck();
  const hero = pick(deck0.filter(c => [run[0], run[1]].includes(c[0])), 2);
  const deck1 = buildDeck(hero);
  const board = pick(deck1.filter(c => [run[1], run[2], run[3]].includes(c[0])), 3);
  return { hero, board };
}

function genGutshot() {
  const i = Math.floor(Math.random() * 9) + 1;
  const low = RANKS[i - 1], mid1 = RANKS[i], mid2 = RANKS[i + 2], high = RANKS[i + 3];
  const deck0 = buildDeck();
  const hero = pick(deck0.filter(c => [low, high].includes(c[0])), 2);
  const deck1 = buildDeck(hero);
  const board = [mid1, mid2]
    .map(r => pick(deck1.filter(c => c[0] === r), 1)[0])
    .concat(pick(deck1.filter(c => ![mid1, mid2].includes(c[0])), 1));
  return { hero, board };
}

function genFlush() {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const deck0 = buildDeck();
  const hero = pick(deck0.filter(c => c[1] === suit), 2);
  const deck1 = buildDeck(hero);
  const board = pick(deck1.filter(c => c[1] === suit), 2)
              .concat(pick(deck1.filter(c => c[1] !== suit), 1));
  return { hero, board };
}

function genComboOESDFlush() {
  const { hero: h0, board: b0 } = genOESD();
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const hero = h0.map(c => c[0] + suit);
  const deck1 = buildDeck(hero);
  const suited = pick(deck1.filter(c => c[1] === suit), 2);
  return { hero, board: suited.concat(b0.slice(0, 1)) };
}

function genComboGutFlush() {
  const { hero: h0, board: b0 } = genGutshot();
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const hero = h0.map(c => c[0] + suit);
  const deck1 = buildDeck(hero);
  const suited = pick(deck1.filter(c => c[1] === suit), 2);
  return { hero, board: suited.concat(b0.slice(0, 1)) };
}
