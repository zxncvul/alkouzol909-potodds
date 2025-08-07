import { getBestHand } from './handEvaluator.js';
import { currentHero, currentBoard, currentOutsList, textLockActive, currentProjectName } from './outsBasic.js';

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
    // Desactivar botones según MagicView
    if (typeof window.updateMagicViewState === 'function') {
      window.updateMagicViewState(true);
    }
  } else {
    restoreOriginalBoardState();
    resetBoardHighlight();
    resetOutsHighlight(); // Limpia solo pistas, no selecciones
    resetBoardBlink();
    const combo = document.getElementById('combo-global');
    // Si el texto no está bloqueado, restaura el enunciado original
    if (combo) {
      // Restaurar el enunciado original conservando formato HTML. Usamos
      // innerHTML para que etiquetas como <span style="color:red"> se
      // rendericen correctamente, en lugar de aparecer como texto literal.
      if (!textLockActive && typeof window.getCurrentEnunciado === 'function') {
        combo.innerHTML = window.getCurrentEnunciado();
      } else {
        combo.innerHTML = '';
      }
    }

    // Rehabilitar botones desactivados por MagicView
    if (typeof window.updateMagicViewState === 'function') {
      window.updateMagicViewState(false);
    }
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
  // Mostrar el nombre del proyecto en lugar de "Jugada completada". Si no hay
  // nombre definido, no se muestra nada.
  if (combo) combo.textContent = currentProjectName || '';

  // Resaltar únicamente las cartas que forman la mejor jugada. No
  // iluminamos cartas que no aportan ni los huecos vacíos.
  document.querySelectorAll('#hero-hand .card').forEach(cardEl => {
    const card = cardEl.dataset.card;
    if (bestHand.cards.includes(card)) {
      cardEl.classList.add('highlight-strong');
    }
  });

  document.querySelectorAll('#duel-board .card').forEach(cardEl => {
    const card = cardEl.dataset.card;
    // Evita marcar huecos vacíos o cartas no colocadas
    if (card && bestHand.cards.includes(card)) {
      cardEl.classList.add('highlight-strong');
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

