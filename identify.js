// Import both getBestHand and compareHands from the evaluator.
import { getBestHand, compareHands } from './handEvaluator.js';

// Define a hierarchy for hand types and a helper to compute a hand's strength.
const TYPE_STRENGTH = {
  'high': 0,
  'pair': 1,
  'twopair': 2,
  'trio': 3,
  'straight': 4,
  'flush': 5,
  'full': 6,
  'quads': 7,
  'straight-flush': 8
};

/**
 * Computes a numeric score for a hand based on its type, primary and secondary
 * ranks. Kickers are intentionally ignored because improvements based solely
 * on kicker differences should not be considered outs.
 *
 * @param {object} hand - The hand object returned by getBestHand().
 * @returns {number} A numeric strength value where larger means stronger.
 */
function handScore(hand) {
  const typeVal = TYPE_STRENGTH[hand.type] || 0;
  const primaryVal = (hand.primary ?? 0);
  const secondaryVal = (hand.secondary ?? 0);
  return typeVal * 10000 + primaryVal * 100 + secondaryVal;
}
import { getEffectiveOuts } from './duelOdds.js';
import { isRevealActive } from './reveal.js';
import { currentHero, currentBoard } from './outsBasic.js';

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['\u2660','\u2665','\u2666','\u2663'];

let solutionPositives = [];
let solutionNegatives = [];
let totalPositives = 0;
let totalNegatives = 0;
// Contadores de selecciones correctas para cada tipo
let correctPositives = 0;
let correctNegatives = 0;
// Modo de selección actual: 'positive' o 'negative'. Por defecto, se seleccionan outs positivos
let selectionMode = 'positive';

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
      // Intercepción de selección en modo calculadora. Si el modo
      // calculadora está activo y se edita el board, se delega al
      // controlador de reemplazo de carta. De lo contrario se aplica
      // la lógica de selección de outs normal.
      cell.addEventListener('click', () => {
        // Prioridad: en modo ojito se deben mostrar las pistas completas,
        // incluso si la calculadora está activa. Sólo en ausencia de ojito se aplica
        // la lógica de calculadora.
        if (isRevealActive()) {
          toggleOutSelection(cell);
        } else if (typeof window.isCalculatorActive === 'function' && window.isCalculatorActive() && typeof window.handleCalculatorCell === 'function') {
          window.handleCalculatorCell(cell);
        } else {
          toggleOutSelection(cell);
        }
      });
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

  // Permitir al usuario cambiar el modo de selección haciendo clic en los contadores
  positiveCounter.addEventListener('click', () => {
    selectionMode = 'positive';
    // Indicar visualmente el modo activo cambiando opacidad
    positiveCounter.style.opacity = '1';
    negativeCounter.style.opacity = '0.5';
  });
  negativeCounter.addEventListener('click', () => {
    selectionMode = 'negative';
    positiveCounter.style.opacity = '0.5';
    negativeCounter.style.opacity = '1';
  });

  // Estado inicial: modo positivo
  positiveCounter.style.opacity = '1';
  negativeCounter.style.opacity = '0.5';

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
    // Deseleccionar: quitar cualquier clase y estilo asociado
    cell.classList.remove('selected', 'correct', 'error');
    // Quitar marca de negativo si existía
    if (cell.dataset.negativeCorrect) {
      delete cell.dataset.negativeCorrect;
      // Restaurar estilos por defecto
      cell.style.background = '';
      cell.style.color = '';
    }
    updateCounters();
    return;
  }

  cell.classList.add('selected');
  if (selectionMode === 'positive') {
    // Selección de outs positivos
    if (solutionPositives.includes(card)) {
      cell.classList.add('correct');
    } else {
      cell.classList.add('error');
    }
  } else {
    // Selección de outs negativos
    if (solutionNegatives.includes(card)) {
      // Marcar como correcta negativa con estilo rojo
      cell.dataset.negativeCorrect = 'true';
      cell.style.background = '#a82929b6';
      cell.style.color = '#fff';
    } else {
      // Selección incorrecta en modo negativo
      cell.classList.add('error');
    }
  }

  updateCounters();
}

function updateCounters() {
  const positiveCounter = document.querySelector('.positive-counter');
  const negativeCounter = document.querySelector('.negative-counter');

  // Recalcular cuántas selecciones correctas se han hecho en cada modo
  correctPositives = document.querySelectorAll('.card-grid.correct').length;
  correctNegatives = document.querySelectorAll('.card-grid.selected[data-negative-correct="true"]').length;

  if (positiveCounter) positiveCounter.textContent = `${correctPositives}/${totalPositives}`;
  if (negativeCounter) negativeCounter.textContent = `${correctNegatives}/${totalNegatives}`;
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
  // Build all potential outs using getEffectiveOuts. This returns any card
  // that strictly improves the hero's hand without considering board ties.
  const allOuts = getEffectiveOuts(hero, board, villain);
  const validTypes = new Set(['pair','twopair','trio','straight','flush','full','quads','straight-flush']);

  // Filter outs that actually form a made hand (pair or better) when
  // combined with hero and board. High card improvements are ignored.
  const drawOuts = allOuts.filter(card => {
    const newBest = getBestHand([...hero, ...board, card]);
    return validTypes.has(newBest.type);
  });

  solutionPositives = [];
  solutionNegatives = [];

  // Precompute the current best hero hand and its score to measure
  // improvements. Kickers are ignored via handScore.
  const currentBestHero = getBestHand([...hero, ...board]);
  const currentHeroScore = handScore(currentBestHero);

  drawOuts.forEach(card => {
    const newBestHero = getBestHand([...hero, ...board, card]);
    const newHeroScore = handScore(newBestHero);
    const heroGain = newHeroScore - currentHeroScore;
    // Skip any card that fails to strictly improve the hero's hand.
    if (heroGain <= 0) return;

    // Exclude outs that simply pair the board without involving one of
    // the hero's hole cards. These "board pair" outs give top pair with a
    // weak kicker and are not counted as real outs.
    if (newBestHero.type === 'pair') {
      const rank = card[0];
      // If hero did not already hold that rank and the board contains it,
      // the improvement comes solely from pairing the board.
      const heroHasRank = hero.some(c => c[0] === rank);
      const boardHasRank = board.some(c => c[0] === rank);
      if (!heroHasRank && boardHasRank) {
        return;
      }
    }

    let dangerous = false;
    if (villain.length === 2) {
      // When a specific villain is provided, compare the final hands
      // directly. Mark the card as dangerous if the villain ends up with
      // a strictly stronger hand after the out is dealt. Ties are not
      // considered dangerous.
      const newBestOpp = getBestHand([...villain, ...board, card]);
      if (compareHands(newBestOpp, newBestHero) > 0) {
        dangerous = true;
      }
    } else {
      // Without a specific villain, we avoid exhaustive enumeration of all
      // possible hands (which tended to over-mark outs as negative). Instead
      // we only consider whether the board itself becomes strong enough to
      // outdraw the hero once the out card is added. If the board with
      // the candidate card forms a hand that outranks the hero's improved
      // hand, any player could tie or beat the hero without using their
      // hole cards, so the out is considered dangerous. This situation
      // typically occurs when the board makes a straight or flush.
      const boardPlus = [...board, card];
      if (boardPlus.length >= 5) {
        const boardBest = getBestHand(boardPlus);
        if (compareHands(boardBest, newBestHero) > 0) {
          dangerous = true;
        }
      }
      // If boardPlus has fewer than 5 cards, there is no board-only
      // completion possible, so the out is not considered dangerous.
    }

    if (dangerous) {
      solutionNegatives.push(card);
    } else {
      solutionPositives.push(card);
    }
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
  const selectedCorrectPos = document.querySelectorAll('.card-grid.correct').length;
  const selectedCorrectNeg = document.querySelectorAll('.card-grid.selected[data-negative-correct="true"]').length;
  return selectedCorrectPos === solutionPositives.length && selectedCorrectNeg === solutionNegatives.length;
}

// ========= EXPORTS DE OUTS =========
// Estas funciones permiten acceder desde otros módulos a las listas de outs
// positivas y negativas. Son copias superficiales para evitar mutaciones
// accidentales desde fuera de este módulo.
export function getPositiveOuts() {
  return solutionPositives.slice();
}

export function getNegativeOuts() {
  return solutionNegatives.slice();
}
