import { getBestHand, compareHands } from './handEvaluator.js';
import { getEffectiveOuts } from './duelOdds.js';
import { isRevealActive } from './reveal.js';
import { currentHero, currentBoard } from './outsBasic.js';

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];

let solutionPositives = [];
let solutionNegatives = [];
let totalPositives = 0;
let totalNegatives = 0;
let correctPositives = 0;

/* =====================================
   RENDERIZA EL GRID Y EL HEADER (OUTS)
   ===================================== */
export function renderOutsGrid(containerId = 'bottom-controls') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Limpiar grid anterior
  const oldGrid = document.getElementById('outs-grid');
  if (oldGrid) oldGrid.remove();

  const oldHeader = document.querySelector('.outs-header');
  if (oldHeader) oldHeader.remove();

  // Renderizar encabezado con contador
  renderOutsHeader(container);

  // Renderizar el grid
  const grid = document.createElement('table');
  grid.id = 'outs-grid';
  grid.className = 'identify-grid';

  SUITS.forEach(suit => {
    const row = document.createElement('tr');
    const suitCell = document.createElement('td');
    suitCell.textContent = suit;
    suitCell.className = 'suit-cell';
    row.appendChild(suitCell);

    RANKS.forEach(rank => {
      const cell = document.createElement('td');
      cell.className = 'card-grid';
      cell.dataset.card = `${rank}${suit}`;
      cell.textContent = rank;
      cell.addEventListener('click', () => toggleOutSelection(cell));
      row.appendChild(cell);
    });

    grid.appendChild(row);
  });

  container.appendChild(grid);
  updateCounters();
}

/* =====================================
   NUEVA FILA DE EQUITY (Necesaria, Turn, River)
   ===================================== */
export function renderEquityRow(containerId = 'bottom-controls') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const oldEquity = document.querySelector('.equity-row');
  if (oldEquity) oldEquity.remove();

  const row = document.createElement('div');
  row.className = 'equity-row';

  row.innerHTML = `
  <div class="equity-box">
    <span class="equity-label" data-target="equity-needed">Necesaria:</span>
    <div class="cursor-wrapper">
      <input type="text" class="equity-input" id="equity-needed">
    </div>
  </div>
  <div class="equity-box">
    <span class="equity-label" data-target="equity-turn">Turn:</span>
    <div class="cursor-wrapper">
      <input type="text" class="equity-input" id="equity-turn">
    </div>
  </div>
  <div class="equity-box">
    <span class="equity-label" data-target="equity-river">River:</span>
    <div class="cursor-wrapper">
      <input type="text" class="equity-input" id="equity-river">
    </div>
  </div>
`;




  container.appendChild(row);

  document.getElementById('equity-needed').value = '';
  document.getElementById('equity-turn').value = '';
  document.getElementById('equity-river').value = '';

  // Foco inicial en "Necesaria"
  document.getElementById('equity-needed').focus();
}


/* =====================================
   HEADER: OUTS
   ===================================== */
function renderOutsHeader(container) {
  const header = document.createElement('div');
  header.className = 'outs-header';

  const left = document.createElement('div');
  left.className = 'outs-left';

  // Contadores de outs
  const positiveCounter = document.createElement('span');
  positiveCounter.className = 'positive-counter';
  positiveCounter.textContent = `0/${totalPositives}`;

  const negativeCounter = document.createElement('span');
  negativeCounter.className = 'negative-counter';
  negativeCounter.textContent = `0/${totalNegatives}`;

  left.appendChild(positiveCounter);
  left.appendChild(negativeCounter);

  // Etiquetas de equity (N: T: R:)
  const right = document.createElement('div');
  right.className = 'equity-labels-inline';
  right.innerHTML = `
    <span class="inline-equity" id="inline-needed">N: --</span>
    <span class="inline-equity" id="inline-turn">T: --</span>
    <span class="inline-equity" id="inline-river">R: --</span>
  `;

  header.appendChild(left);
  header.appendChild(right);
  container.appendChild(header);
}


/* =====================================
   SELECCIÓN DE OUTS
   ===================================== */
function toggleOutSelection(cell) {
  const card = cell.dataset.card;

  // --- MODO OJITO ---
  if (isRevealActive()) {
    if (!cell.classList.contains('hint')) return;

    document.querySelectorAll('.card-grid.clicked-out')
      .forEach(el => el.classList.remove('clicked-out', 'clicked-out-blink'));

    cell.classList.add('clicked-out', 'clicked-out-blink');
    showCompletionInfo(card);
    return;
  }

  // --- MODO JUEGO ---
  if (cell.classList.contains('selected')) {
    cell.classList.remove('selected', 'correct', 'error');
    updateCounters();
    return;
  }

  cell.classList.add('selected');
  if (solutionPositives.includes(card)) {
    cell.classList.add('correct');
  } else {
    cell.classList.add('error');
  }

  updateCounters();
}

function updateCounters() {
  const positiveCounter = document.querySelector('.positive-counter');
  const negativeCounter = document.querySelector('.negative-counter');

  correctPositives = document.querySelectorAll('.card-grid.correct').length;

  if (positiveCounter) positiveCounter.textContent = `${correctPositives}/${totalPositives}`;
  if (negativeCounter) negativeCounter.textContent = `0/${totalNegatives}`;
}


/* =====================================
   MOSTRAR INFO DE COMPLECIÓN
   ===================================== */
function showCompletionInfo(outCard) {
  const fullSet = [...currentHero, ...currentBoard, outCard];
  const bestHand = getBestHand(fullSet);

  placeOutOnBoard(outCard);

  const sequenceHTML = bestHand.cards
    .map(card => card === outCard
      ? `<span style="color:#e74c3c">${card}</span>`
      : card)
    .join(' - ');

  const combo = document.getElementById('combo-global');
  combo.innerHTML = `La carta <span style="color:#e74c3c">${outCard}</span> completa: 
                     <b>${bestHand.label}</b><br>Secuencia: 
                     ${sequenceHTML}`;

  document.querySelectorAll('#duel-board .card').forEach(c => {
    c.classList.remove('highlight-strong', 'highlight-dim');
  });

  bestHand.cards.forEach(card => {
    const cardEl = document.querySelector(`#duel-board .card[data-card="${card}"]`);
    if (cardEl) cardEl.classList.add('highlight-strong');
  });
}

/* =====================================
   PONER OUT EN TURN O RIVER
   ===================================== */
function placeOutOnBoard(outCard) {
  const boardSlots = document.querySelectorAll('#duel-board .board-slot');
  if (!boardSlots.length) return;

  let targetIndex = 3; // Por defecto Turn
  if (currentBoard.length === 4) targetIndex = 4; // Si hay Turn, usamos River

  const targetSlot = boardSlots[targetIndex];
  if (targetSlot) {
    // Insertar carta
    targetSlot.innerHTML = `<span class="card-content">${outCard[0]}&#8239;${outCard[1]}</span>`;
    targetSlot.dataset.card = outCard;

    // Limpiar estados previos
    targetSlot.classList.remove('placeholder', 'disabled-turn', 'river-slot', 'clicked-out-blink');

    // Activar parpadeo (igual que en la tabla de outs)
    targetSlot.classList.add('clicked-out-blink');
  }
}


/* =====================================
   ESTABLECER OUTS CORRECTAS
   ===================================== */
export function setSolutionOuts(hero, board, villain = []) {
  const allOuts = getEffectiveOuts(hero, board, villain);
  const validTypes = new Set(['pair','twopair','trio','straight','flush','full','quads','straight-flush']);

  const drawOuts = allOuts.filter(card => {
    const newBest = getBestHand([...hero, ...board, card]);
    return validTypes.has(newBest.type);
  });

  solutionPositives = [];
  solutionNegatives = [];

  const currentBestHero = getBestHand([...hero, ...board]);
  drawOuts.forEach(card => {
    const newBestHero = getBestHand([...hero, ...board, card]);
    const heroGain = compareHands(newBestHero, currentBestHero);

    let dangerous = false;
    if (villain.length === 2) {
      const currentBestOpp = getBestHand([...villain, ...board]);
      const newBestOpp = getBestHand([...villain, ...board, card]);
      const oppGain = compareHands(newBestOpp, currentBestOpp);
      dangerous = oppGain >= heroGain;
    }

    if (dangerous) solutionNegatives.push(card);
    else solutionPositives.push(card);
  });

  totalPositives = solutionPositives.length;
  totalNegatives = solutionNegatives.length;

  updateCounters();
  return [...solutionPositives, ...solutionNegatives];
}

/* =====================================
   VALIDACIÓN DE SELECCIÓN
   ===================================== */
export function validateOutsSelection() {
  const selectedCorrect = document.querySelectorAll('.card-grid.correct');
  return selectedCorrect.length === solutionPositives.length;
}
