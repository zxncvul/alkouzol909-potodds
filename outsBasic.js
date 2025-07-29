
import { renderOutsGrid, renderEquityRow, setSolutionOuts, validateOutsSelection } from './identify.js';
import { attachKeypadToEquity } from './numaKeypad.js';
import { toggleRevealHints } from './reveal.js';

// ==========================
// Constantes y variables globales
// ==========================
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];

export let currentOuts = 0;
export let currentOutsList = [];
export let currentBoard = [];
export let currentHero = [];

export let forceTurn = false;
export let lockActive = false;     // Estado global del candado (Hero + Board)
export let textLockActive = false; // Estado global para bloqueo del enunciado

let showTurn = false;
let currentEquityTurn = 0;
let currentEquityRiver = 0;

// ==========================
// Lógica del botón candado
// ==========================
export function initHeroLock() {
  const lockBtn = document.getElementById('hero-lock');
  if (!lockBtn) return;

  lockBtn.addEventListener('click', () => {
    lockActive = !lockActive;
    lockBtn.classList.toggle('active', lockActive);
    console.log("Candado (Hero/Board):", lockActive ? "ON" : "OFF");
  });
}

// ==========================
// Lógica del botón text-lock
// ==========================
export function initTextLock() {
  const textLockBtn = document.getElementById('text-lock');
  if (!textLockBtn) return;

  textLockBtn.addEventListener('click', () => {
    textLockActive = !textLockActive;
    textLockBtn.classList.toggle('active', textLockActive);
    console.log("Text Lock (enunciado):", textLockActive ? "ON" : "OFF");
  });
}

// ==========================
// Botones de la derecha
// ==========================
export function initRightButtons() {
  const configBtn = document.getElementById('hero-config');
  const captureBtn = document.getElementById('hero-capture');
  const nextBtn = document.getElementById('hero-next');

  // Configuración
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      document.getElementById('screen-outs').style.display = 'none';
      document.getElementById('config-screen').style.display = 'flex';
    });
  }

  // Capturar al portapapeles
  if (captureBtn) {
    captureBtn.addEventListener('click', copyCurrentCase);
  }

  // Forzar siguiente
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      generateBasicSpot(); // Lanza nuevo ejercicio sin validar
    });
  }
}

/**
 * Copia todo el caso actual al portapapeles
 */
function copyCurrentCase() {
  const hero = currentHero.join(' ');
  const board = currentBoard.join(' ');
  const outs = currentOutsList.join(' ');
  const potOdds = document.getElementById('inline-needed')?.textContent || 'N: --';
  const eqTurn = document.getElementById('equity-turn')?.value || '--';
  const eqRiver = document.getElementById('equity-river')?.value || '--';
  const enunciado = document.getElementById('combo-global')?.textContent || '--';

  const text = `
--- CASO PÓKER ---
Enunciado: ${enunciado}
Hero: ${hero}
Board: ${board}
Outs: ${outs}
Pot Odds: ${potOdds}
Equity Turn: ${eqTurn}
Equity River: ${eqRiver}
------------------
`.trim();

  navigator.clipboard.writeText(text)
    .then(() => console.log("Caso copiado al portapapeles"))
    .catch(err => console.error("Error al copiar:", err));
}

// ==========================
// Funciones de renderado locales
// ==========================
function renderFullBoard(boardCards) {
  const container = document.getElementById('duel-board');
  if (!container) return;
  container.innerHTML = '';

  const totalBoard = [...boardCards];
  while (totalBoard.length < 5) totalBoard.push(null);

  totalBoard.forEach((card, index) => {
    const d = document.createElement('div');
    d.className = 'card board-slot';
    if (card) {
      const span = document.createElement('span');
      span.className = 'card-content';
      span.textContent = `${card[0]} ${card[1]}`;
      d.appendChild(span);
      d.dataset.card = card;
    } else {
      d.dataset.card = '';
      d.classList.add('placeholder');
    }
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
    span.textContent = `${card[0]} ${card[1]}`;
    d.appendChild(span);
    d.dataset.card = card;
    container.appendChild(d);
  });
}

function renderHeroControls() {
  const heroContainer = document.querySelector('.hero-row');

  // Botones Izquierda
  if (!document.getElementById('text-lock')) {
    const textLockBtn = document.createElement('button');
    textLockBtn.className = 'hero-lock';
    textLockBtn.id = 'text-lock';
    textLockBtn.setAttribute('aria-label', 'Bloquear Enunciado');
    textLockBtn.textContent = '⚿';
    heroContainer.appendChild(textLockBtn);
    initTextLock();
  }

  if (!document.getElementById('hero-eye')) {
    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'hero-eye';
    eyeBtn.id = 'hero-eye';
    eyeBtn.setAttribute('aria-label', 'Ojito');
    eyeBtn.textContent = '👁';
    eyeBtn.addEventListener('click', toggleRevealHints);
    heroContainer.appendChild(eyeBtn);
  }

  // Botones Derecha
  if (!document.getElementById('hero-config')) {
    const configBtn = document.createElement('button');
    configBtn.className = 'hero-config';
    configBtn.id = 'hero-config';
    configBtn.setAttribute('aria-label', 'Configuración');
    configBtn.textContent = '⚙';
    heroContainer.appendChild(configBtn);
  }

  if (!document.getElementById('hero-capture')) {
    const captureBtn = document.createElement('button');
    captureBtn.className = 'hero-capture';
    captureBtn.id = 'hero-capture';
    captureBtn.setAttribute('aria-label', 'Capturar');
    captureBtn.textContent = '⎘';
    heroContainer.appendChild(captureBtn);
  }

  if (!document.getElementById('hero-next')) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'hero-next';
    nextBtn.id = 'hero-next';
    nextBtn.setAttribute('aria-label', 'Forzar Siguiente');
    nextBtn.textContent = '⟳';
    heroContainer.appendChild(nextBtn);
  }

  initRightButtons();
}

function updateSuitColors() {
  document.querySelectorAll('.card').forEach(card => {
    card.style.color = '#29a847';
  });
}

// ==========================
// FUNCIÓN PRINCIPAL
// ==========================
export function generateBasicSpot() {
  const container = document.getElementById('bottom-controls');
  container.innerHTML = '';

  showTurn = forceTurn ? true : (Math.random() < 0.5);

  if (!lockActive) {
    const { hero, board } = generateRandomProject();
    currentHero = hero;
    currentBoard = showTurn ? board.slice(0, 4) : board.slice(0, 3);
  } else {
    console.log("Candado activo: Manteniendo Hero y Board actuales");
  }

  const outs = setSolutionOuts(currentHero, currentBoard);
  currentOutsList = outs;
  currentOuts = outs.length;

  if (showTurn) {
    currentEquityTurn = currentOuts * 4;
    currentEquityRiver = null;
  } else {
    currentEquityTurn = currentOuts * 2;
    currentEquityRiver = currentOuts * 4;
  }

  renderHeroHand(currentHero);
  renderHeroControls();
  renderFullBoard(currentBoard);
  renderOutsGrid('bottom-controls');
  renderEquityRow('bottom-controls');
  renderActionButtons();
  attachKeypadToEquity();

  const combo = document.getElementById('combo-global');
  if (!textLockActive) {
    combo.textContent = showTurn
      ? `Proyecto: ${outs.length} outs (Turn→River)`
      : `Proyecto: ${outs.length} outs (Flop→Turn→River)`;
  }

  attachValidationListeners();
  attachConfigListeners();
  updateSuitColors();
}

// ==========================
// BOTONES INFERIORES
// ==========================
function renderActionButtons() {
  const container = document.getElementById('bottom-controls');
  if (!container) return;

  const btnRow = document.createElement('div');
  btnRow.className = 'action-buttons';

  const btnCall = document.createElement('button');
  btnCall.className = 'action-btn call-btn';
  btnCall.textContent = 'CALL';

  const btnColon = document.createElement('button');
  btnColon.className = 'action-btn small-btn';
  btnColon.textContent = ':'; 

  const btnSettings = document.createElement('button');
  btnSettings.className = 'action-btn settings-btn';
  btnSettings.textContent = '⚙';
  btnSettings.addEventListener('click', () => {
    document.getElementById('screen-outs').style.display = 'none';
    document.getElementById('config-screen').style.display = 'flex';
  });

  const btnPercent = document.createElement('button');
  btnPercent.className = 'action-btn small-btn';
  btnPercent.textContent = '%'; 

  const btnFold = document.createElement('button');
  btnFold.className = 'action-btn fold-btn';
  btnFold.textContent = 'FOLD';

  btnRow.appendChild(btnCall);
  btnRow.appendChild(btnColon);
  
  btnRow.appendChild(btnPercent);
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
      generateBasicSpot();
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
