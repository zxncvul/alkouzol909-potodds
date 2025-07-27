import { getBestHand } from './handEvaluator.js';
import { currentHero, currentBoard, currentOutsList } from './outsBasic.js';

let revealActive = false;
let originalBoardState = [];

/**
 * Alterna entre mostrar y ocultar pistas (ojito).
 */
export function toggleRevealHints() {
  revealActive = !revealActive;

  const btnEye = document.querySelector('.hero-eye');
  if (btnEye) btnEye.classList.toggle('active', revealActive);

  if (revealActive) {
    saveOriginalBoardState();
    highlightBestHand();
    highlightCorrectOuts();
  } else {
    restoreOriginalBoardState();
    resetBoardHighlight();
    resetOutsHighlight(); // Limpia solo pistas, no selecciones
    resetBoardBlink();
    const combo = document.getElementById('combo-global');
    if (combo) combo.textContent = '';
  }
}

/**
 * Devuelve si el ojito está activo.
 */
export function isRevealActive() {
  return revealActive;
}

/**
 * Guarda el estado actual del board (HTML de cada slot).
 */
function saveOriginalBoardState() {
  originalBoardState = [];
  document.querySelectorAll('#duel-board .board-slot').forEach(slot => {
    originalBoardState.push(slot.innerHTML);
  });
}

/**
 * Restaura el estado original del board.
 */
function restoreOriginalBoardState() {
  const slots = document.querySelectorAll('#duel-board .board-slot');
  slots.forEach((slot, i) => {
    if (originalBoardState[i] !== undefined) {
      slot.innerHTML = originalBoardState[i];
    }
  });
}

/**
 * Ilumina las cartas que forman la mejor jugada actual (Hero + Board).
 */
function highlightBestHand() {
  const combo = document.getElementById('combo-global');
  const bestHand = getBestHand([...currentHero, ...currentBoard]);

  combo.textContent = `Jugada presente: ${bestHand.label}`;

  // Hero
  document.querySelectorAll('#hero-hand .card').forEach(cardEl => {
    const card = cardEl.dataset.card;
    if (bestHand.cards.includes(card)) {
      cardEl.classList.add('highlight-strong');
    } else {
      cardEl.classList.add('highlight-dim');
    }
  });

  // Board
  document.querySelectorAll('#duel-board .card').forEach(cardEl => {
    const card = cardEl.dataset.card;
    if (bestHand.cards.includes(card)) {
      cardEl.classList.add('highlight-strong');
    } else {
      cardEl.classList.add('highlight-dim');
    }
  });
}

/**
 * Quita la iluminación de todas las cartas del Hero y del Board.
 */
function resetBoardHighlight() {
  document.querySelectorAll('#hero-hand .card, #duel-board .card')
    .forEach(card => card.classList.remove('highlight-strong', 'highlight-dim'));
}

/**
 * Ilumina las outs correctas en el grid (pista).
 */
function highlightCorrectOuts() {
  const gridCells = document.querySelectorAll('.card-grid');
  gridCells.forEach(cell => {
    if (currentOutsList.includes(cell.dataset.card)) {
      cell.classList.add('hint');
    }
  });
}

/**
 * Quita solo la iluminación de las pistas (hint y clicked-out), 
 * pero conserva las selecciones del modo juego.
 */
function resetOutsHighlight() {
  document.querySelectorAll('.card-grid.hint, .card-grid.clicked-out, .card-grid.clicked-out-blink')
  .forEach(cell => cell.classList.remove('hint', 'clicked-out', 'clicked-out-blink'));

}
function resetBoardBlink() {
  document.querySelectorAll('#duel-board .board-slot.clicked-out-blink')
    .forEach(slot => slot.classList.remove('clicked-out-blink'));
}

