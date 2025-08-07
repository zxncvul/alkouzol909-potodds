
import { renderOutsGrid, renderEquityRow, setSolutionOuts, validateOutsSelection, getPositiveOuts, getNegativeOuts } from './identify.js';

// DEBUG: Catch global errors during development. This attaches a global
// error handler that will create a visible banner at the top of the page
// whenever a JavaScript error occurs. This makes it easier to diagnose
// issues when Developer Tools are not available. This handler is inert
// once the project works correctly and can be removed or disabled. Use
// `window.DEBUG_SHOW_ERRORS = false` in production to disable.
if (typeof window !== 'undefined') {
  // Desactivar por defecto el banner de errores. Establecer a true para depurar.
  window.DEBUG_SHOW_ERRORS = false;
  window.onerror = function (msg, url, lineNo, colNo, error) {
    if (!window.DEBUG_SHOW_ERRORS) return;
    try {
      const banner = document.createElement('div');
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.right = '0';
      banner.style.background = 'rgba(255, 0, 0, 0.9)';
      banner.style.color = '#fff';
      banner.style.fontSize = '12px';
      banner.style.zIndex = '99999';
      banner.style.padding = '4px';
      banner.style.whiteSpace = 'pre';
      const text = `${msg} at ${lineNo}:${colNo}`;
      banner.textContent = text;
      document.body.appendChild(banner);
    } catch (e) {
      // ignore errors while displaying errors
    }
  };
}
import { attachKeypadToEquity, attachKeypadToInput, createNumericKeypad, appendCharToCurrentTarget } from './numaKeypad.js';
import { toggleRevealHints } from './reveal.js';


// ====== ICONOS SVG PARA ESTADOS ======
const SVG_CANDADO_ACTIVO = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
</svg>`;

const SVG_CANDADO_INACTIVO = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
</svg>`;

const SVG_OJO_ACTIVO = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`;

const SVG_OJO_INACTIVO = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
  <line x1="1" y1="1" x2="23" y2="23"></line>
</svg>`;

const SVG_CHECK_GREEN = `
<svg viewBox="0 0 24 24" width="16" height="16" stroke="#29a847" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12" />
</svg>`;

const SVG_X_RED = `
<svg viewBox="0 0 24 24" width="16" height="16" stroke="#e74c3c" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18" />
  <line x1="6" y1="6" x2="18" y2="18" />
</svg>`;

// ==========================
// Constantes y variables globales
// ==========================
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['\u2660','\u2665','\u2666','\u2663'];

export let currentOuts = 0;
export let currentOutsList = [];
export let currentBoard = [];
export let currentHero = [];

// Nombre del proyecto actual (tipo de proyecto: OESD, GUT, FLUSH, etc.).
// Este valor se establece cada vez que se genera una nueva mano. Se exporta
// para que otros módulos como reveal.js puedan mostrarlo cuando sea
// necesario (por ejemplo, en modo Magic View).
export let currentProjectName = '';

// Activar por defecto el modo Turn para mostrar únicamente el flop y entrenar hacia el turn.
export let forceTurn = true;
// Si esta bandera está activa se generarán ejercicios con River visible.
export let forceRiver = false;
export let lockActive = false;     // Estado global del candado (Hero + Board)
export let textLockActive = false; // Estado global para bloqueo del enunciado

let showTurn = false;
let currentEquityTurn = 0;
let currentEquityRiver = 0;

// ==========================
// Nuevas variables para modos avanzados
// ==========================
// Duración de la cuenta atrás en segundos. 0 desactiva el temporizador.
let countdownDuration = 0;
let countdownTimerId = null;
// Configuración de la memoria temporal: duración en segundos y zonas activas
let memoryDuration = 0;
const memoryZones = {
  flop: false,
  turn: false,
  river: false,
  hero: false
};
// Número de zonas a ocultar de forma aleatoria. 0 significa usar todas las
// seleccionadas.
let memoryRandomCount = 0;
// Identificadores de temporizadores de memoria para poder cancelarlos
let memoryTimers = [];
// Modo de color de los palos. Puede ser RAINBOW, PAIRED, MONO o RAND
let suitMode = 'RAINBOW';

// ==========================
// Variables y funciones para modo calculadora
// ==========================
// Indica si el modo calculadora está activo. Cuando se activa, el usuario
// puede sustituir cartas del board (o editar el enunciado) y explorar
// distintos escenarios sin validar la respuesta.
let calculatorMode = false;
// Tipo de calculadora activa: 'board' o 'enunciado'
let calculatorType = null;
// Índice de la carta del board seleccionada para reemplazar en modo calculadora
let selectedBoardIndex = null;

// Índice de la carta de la mano del héroe seleccionada para reemplazar en modo calculadora
let selectedHeroIndex = null;

/**
 * Devuelve si el modo calculadora está activo.
 */
function isCalculatorActive() {
  return calculatorMode;
}

/**
 * Entra en modo calculadora para sustituir una carta de la mano del héroe. Si ya
 * está activo, cambia la carta seleccionada. Se encarga de aplicar estilos y
 * deshabilitar elementos de UI que no deben usarse en este modo.
 * @param {number} index Posición de la carta del héroe a editar (0-1).
 */
function enterHeroCalculatorMode(index) {
  // Si ya estamos editando la misma carta del héroe, solo actualizamos la selección
  if (calculatorMode && calculatorType === 'hero') {
    selectedHeroIndex = index;
    highlightHeroSelection();
    return;
  }
  // Si venimos de editar el board, limpiar selección y resaltados
  if (calculatorMode && calculatorType === 'board') {
    selectedBoardIndex = null;
    highlightBoardSelection();
  }
  calculatorMode = true;
  calculatorType = 'hero';
  selectedHeroIndex = index;
  highlightHeroSelection();
  setCalculatorUI(true);
  // Actualizar el grid para desactivar cartas duplicadas
  updateGridDisabledCards();
  // Actualizar botones y fila de equity según la decisión correcta
  updateCalculatorDecision();
  updateCalculatorRow();
}

/**
 * Entra en modo calculadora para sustituir una carta del board. Si ya está
 * activo, cambia la carta seleccionada. Se encarga de aplicar estilos y
 * deshabilitar elementos de UI que no deben usarse en este modo.
 * @param {number} index Posición de la carta del board a editar (0-4).
 */
function enterBoardCalculatorMode(index) {
  // Si se está en modo calculadora de board, simplemente cambia la selección
  if (calculatorMode && calculatorType === 'board') {
    selectedBoardIndex = index;
    highlightBoardSelection();
    return;
  }
  // Si venimos de editar la mano del héroe, limpiar selección
  if (calculatorMode && calculatorType === 'hero') {
    selectedHeroIndex = null;
    highlightHeroSelection();
  }
  calculatorMode = true;
  calculatorType = 'board';
  selectedBoardIndex = index;
  highlightBoardSelection();
  setCalculatorUI(true);
  // Actualizar el grid para desactivar cartas duplicadas
  updateGridDisabledCards();
  // Asegurarnos de atenuar los botones de acción según la decisión correcta
  updateCalculatorDecision();
  // Mostrar los cálculos actuales en la fila de equity
  updateCalculatorRow();
}

/**
 * Marca visualmente la carta seleccionada del board en modo calculadora.
 */
function highlightBoardSelection() {
  document.querySelectorAll('#duel-board .board-slot').forEach((slot, i) => {
    slot.classList.remove('highlight-calc');
    if (calculatorMode && calculatorType === 'board' && i === selectedBoardIndex) {
      slot.classList.add('highlight-calc');
    }
  });
}

/**
 * Marca visualmente la carta seleccionada del héroe en modo calculadora.
 */
function highlightHeroSelection() {
  document.querySelectorAll('#hero-hand .card').forEach((cardEl, i) => {
    cardEl.classList.remove('highlight-calc');
    if (calculatorMode && calculatorType === 'hero' && i === selectedHeroIndex) {
      cardEl.classList.add('highlight-calc');
    }
  });
}

/**
 * Gestiona la selección de una carta desde el grid de outs durante el modo
 * calculadora de board. Se reemplaza la carta seleccionada en el board, se
 * recalculan outs y equities, y se actualiza la UI. Ignora selecciones de
 * cartas ya presentes en la mano del héroe o en el board para evitar
 * duplicados.
 * @param {HTMLElement} cell Celda clicada del grid
 */
function handleCalculatorCell(cell) {
  // Solo actuamos si estamos en modo calculadora editando board o héroe
  if (!calculatorMode || (calculatorType !== 'board' && calculatorType !== 'hero')) return;
  const newCard = cell.dataset.card;
  if (!newCard) return;
  // Evitar duplicados con la mano o el board actual (incluyendo la carta que se reemplaza)
  const allCards = [...currentHero, ...currentBoard];
  if (calculatorType === 'board') {
    // Excluir la carta del board que vamos a reemplazar
    const replaceCard = currentBoard[selectedBoardIndex];
    const idx = allCards.indexOf(replaceCard);
    if (idx >= 0) allCards.splice(idx, 1);
  } else if (calculatorType === 'hero') {
    const replaceCard = currentHero[selectedHeroIndex];
    const idx = allCards.indexOf(replaceCard);
    if (idx >= 0) allCards.splice(idx, 1);
  }
  if (allCards.includes(newCard)) return;
  // Reemplazar la carta seleccionada dependiendo del tipo de calculadora
  if (calculatorType === 'board') {
    currentBoard[selectedBoardIndex] = newCard;
  } else if (calculatorType === 'hero') {
    currentHero[selectedHeroIndex] = newCard;
  }
  // Eliminar cualquier marca de selección o pista en la celda utilizada
  cell.classList.remove('selected', 'correct', 'error', 'clicked-out', 'clicked-out-blink', 'hint');
  // Limpiar la selección actual (dejar de resaltar la carta sustituida)
  selectedBoardIndex = null;
  selectedHeroIndex = null;
  highlightBoardSelection();
  highlightHeroSelection();
  // Recalcular outs y equities
  const outs = setSolutionOuts(currentHero, currentBoard);
  currentOutsList = outs;
  currentOuts = outs.length;
  // Recalcular el nombre del proyecto tras cambiar el board
  currentProjectName = detectProjectName();
  // Equity por turn y river según si estamos en flop o turn
  if (showTurn) {
    currentEquityTurn = currentOuts * 4;
    currentEquityRiver = null;
  } else {
    currentEquityTurn = currentOuts * 2;
    currentEquityRiver = currentOuts * 4;
  }
  // Actualizar tablero y mano
  renderFullBoard(currentBoard);
  updateSuitColors();
  renderHeroHand(currentHero);
  updateSuitColors();
  // Reaplicar listeners para el modo calculadora
  attachBoardCalculatorListeners();
  attachHeroCalculatorListeners();
  // Actualizar grid disabled cards
  updateGridDisabledCards();
  // Actualizar decisión y fila de equity
  updateCalculatorDecision();
  updateCalculatorRow();
}

/**
 * Calcula si la acción correcta es CALL o FOLD con el board actual en modo
 * calculadora, usando la equity y los pot odds del escenario actual. Luego
 * atenúa el botón incorrecto.
 */
function updateCalculatorDecision() {
  if (!currentScenario) return;
  // Equity porcentual del héroe
  // Equity aproximada del héroe basada en outs. Si no hay outs (outs=0),
  // asumimos que la mano actual es muy fuerte y le asignamos 100% para
  // efectos de pot odds, ya que outs=0 puede corresponder a manos hechas.
  // Determinar la equity del héroe. Si currentEquityTurn está definida, usarla; si no, usar currentEquityRiver.
  // Si no hay outs (outs=0), asignamos 100% para representar una mano hecha.
  let heroEqPct;
  if (currentOuts === 0) {
    heroEqPct = 100;
  } else if (currentEquityTurn != null) {
    heroEqPct = currentEquityTurn;
  } else if (currentEquityRiver != null) {
    heroEqPct = currentEquityRiver;
  } else {
    heroEqPct = currentOuts * 2;
  }
  const potPct = currentScenario.potOddsPercent * 100;
  const correctCall = heroEqPct >= potPct;
  updateCalculatorButtons(correctCall);
}

/**
 * Atenúa el botón de acción incorrecto en modo calculadora. Si
 * correctIsCall=true, CALL permanece normal y FOLD se atenúa, y viceversa.
 * @param {boolean} correctIsCall
 */
function updateCalculatorButtons(correctIsCall) {
  const callBtn = document.querySelector('.call-btn');
  const foldBtn = document.querySelector('.fold-btn');
  if (!callBtn || !foldBtn) return;
  if (correctIsCall) {
    callBtn.classList.remove('dimmed');
    foldBtn.classList.add('dimmed');
    // Botón correcto parpadea
    callBtn.classList.add('blink');
    foldBtn.classList.remove('blink');
  } else {
    foldBtn.classList.remove('dimmed');
    callBtn.classList.add('dimmed');
    // Botón correcto parpadea
    foldBtn.classList.add('blink');
    callBtn.classList.remove('blink');
  }
  // Al atenuar botones, también actualizamos la fila de equity para
  // mostrar los resultados calculados (porcentajes y ratios)
  updateCalculatorRow();
}

/**
 * Actualiza los valores mostrados en la fila de equity (Necesaria, Turn, River)
 * así como las etiquetas inline N: T: R: cuando el modo calculadora está
 * activo. Se muestran directamente los porcentajes calculados y las
 * relaciones simplificadas con un decimal como máximo.
 */
function updateCalculatorRow() {
  // No hacer nada si no estamos en modo calculadora
  if (!calculatorMode) return;
  // Obtener referencias a inputs
  const neededInput = document.getElementById('equity-needed');
  const turnInput = document.getElementById('equity-turn');
  const riverInput = document.getElementById('equity-river');
  // Calcular porcentajes
  let potPct = '--';
  let turnPct = '--';
  let riverPct = '--';
  if (currentScenario) {
    potPct = (currentScenario.potOddsPercent * 100).toFixed(0);
  }
  if (currentEquityTurn != null) {
    turnPct = currentEquityTurn.toFixed(0);
  }
  if (currentEquityRiver != null) {
    riverPct = currentEquityRiver.toFixed(0);
  }
  // Asignar a inputs con símbolo %
  if (neededInput) neededInput.value = potPct !== '--' ? `${potPct}%` : '';
  if (turnInput) turnInput.value = turnPct !== '--' ? `${turnPct}%` : '';
  if (riverInput) riverInput.value = riverPct !== '--' ? `${riverPct}%` : '';
  // Actualizar etiquetas inline con relaciones
  const inlineNeeded = document.getElementById('inline-needed');
  const inlineTurn = document.getElementById('inline-turn');
  const inlineRiver = document.getElementById('inline-river');
  // Ratio para necesaria: pot:bet
  let nRatio = '--';
  if (currentScenario) {
    nRatio = formatRatio(currentScenario.potOddsRatio);
  }
  let tRatio = '--';
  if (currentEquityTurn != null && currentEquityTurn > 0) {
    tRatio = formatRatio((100 / currentEquityTurn) - 1);
  }
  let rRatio = '--';
  if (currentEquityRiver != null && currentEquityRiver > 0) {
    rRatio = formatRatio((100 / currentEquityRiver) - 1);
  }
  if (inlineNeeded) inlineNeeded.textContent = `N: ${nRatio}`;
  if (inlineTurn) inlineTurn.textContent = `T: ${tRatio}`;
  if (inlineRiver) inlineRiver.textContent = `R: ${rRatio}`;
}

/**
 * Habilita o deshabilita elementos de la UI cuando el modo calculadora está
 * activo. Cuando active=true se bloquean controles que interfieren con el
 * cálculo (boardlock, textguard, config y campos de equity), y cuando
 * active=false se restauran a su estado normal.
 * @param {boolean} active
 */
function setCalculatorUI(active) {
  // Determinar si estamos editando el enunciado. En ese caso el teclado
  // numérico debe permanecer habilitado para escribir cantidades.
  const isEnunciado = calculatorMode && calculatorType === 'enunciado';
  // Controles a deshabilitar cuando el modo calculadora está activo.
  const elements = [];
  const heroLock = document.getElementById('hero-lock');     // BoardPlay
  const textLock = document.getElementById('text-lock');     // TextGuard
  const heroConfig = document.getElementById('hero-config'); // ConfigBox
  const keypad = document.getElementById('numa-keypad');      // Teclado numérico
  // Siempre deshabilitamos heroLock, textLock y heroConfig
  if (heroLock) elements.push(heroLock);
  if (textLock) elements.push(textLock);
  if (heroConfig) elements.push(heroConfig);
  // Solo deshabilitamos el keypad en modo board; en modo enunciado se deja activo
  if (keypad && !(isEnunciado)) elements.push(keypad);
  elements.forEach(el => {
    if (!el) return;
    if (active) {
      el.classList.add('disabled-button');
      el.setAttribute('disabled', 'disabled');
    } else {
      el.classList.remove('disabled-button');
      el.removeAttribute('disabled');
    }
  });
  // Controlar la clase global para ocultar el caret. Añadimos la
  // clase 'calculator-mode' al cuerpo cuando el modo calculadora está
  // activo y la eliminamos cuando se desactiva.
  if (active) {
    document.body.classList.add('calculator-mode');
    // Cuando el modo calculadora se activa fuera del enunciado, ocultamos
    // cualquier cursor parpadeante de los campos de equity eliminando
    // la clase 'focused' de todos los wrappers. Esto evita que aparezca
    // el cursor mientras se sustituye el board o la mano.
    if (calculatorType !== 'enunciado') {
      document.querySelectorAll('.cursor-wrapper').forEach(w => w.classList.remove('focused'));
    }
  } else {
    document.body.classList.remove('calculator-mode');
  }
}

/**
 * Sale del modo calculadora, restaurando la UI y generando un nuevo spot si
 * corresponde. Se utiliza al pulsar NextLevel.
 */
/**
 * Sale del modo calculadora, restaurando la UI y, opcionalmente,
 * generando un nuevo ejercicio. Si regenerate es falso, conserva el
 * escenario actual y simplemente restablece los controles.
 * @param {boolean} [regenerate=true] Indica si se debe generar nuevo spot
 */
function exitCalculatorMode(regenerate = true) {
  if (!calculatorMode) return;
  // Limpiar resaltados y estilos
  document.querySelectorAll('#duel-board .board-slot').forEach(slot => slot.classList.remove('highlight-calc'));
  document.querySelectorAll('.call-btn, .fold-btn').forEach(btn => {
    btn.classList.remove('dimmed');
    btn.classList.remove('blink');
  });
  // Restaurar el grid a su estado normal
  updateGridDisabledCards(false);
  setCalculatorUI(false);
  calculatorMode = false;
  calculatorType = null;
  selectedBoardIndex = null;
  if (regenerate) {
    // Generar nuevo ejercicio normal
    generateBasicSpot();
  } else {
    // Actualizar campo de equity e inline con los valores actuales para salir del modo
    updateCalculatorRow();
    // Reaplicar oyentes de calculadora para cartas del board y del héroe
    attachBoardCalculatorListeners();
    attachHeroCalculatorListeners();
  }
}

/**
 * Adjunta oyentes a cada carta del board para que el usuario pueda
 * seleccionar la carta que quiere reemplazar en modo calculadora. Si ya
 * estamos editando el board, simplemente cambia el índice seleccionado.
 */
function attachBoardCalculatorListeners() {
  const slots = document.querySelectorAll('#duel-board .board-slot');
  if (!slots.length) return;
  slots.forEach((slot, index) => {
    slot.onclick = () => {
      // Si estamos en modo enunciado, ignorar clics en el board
      if (calculatorMode && calculatorType === 'enunciado') return;
      // Si ya está activo el modo board, actualizar la selección
      if (calculatorMode && calculatorType === 'board') {
        selectedBoardIndex = index;
        highlightBoardSelection();
        updateGridDisabledCards();
      } else {
        enterBoardCalculatorMode(index);
      }
    };
  });
}

/**
 * Adjunta oyentes a cada carta de la mano del héroe para que el usuario
 * pueda seleccionar la carta que quiere reemplazar en modo calculadora.
 * Si ya estamos editando el héroe, actualiza la selección. Se ignoran
 * clics en modo enunciado.
 */
function attachHeroCalculatorListeners() {
  const heroCards = document.querySelectorAll('#hero-hand .card');
  if (!heroCards.length) return;
  heroCards.forEach((cardEl, index) => {
    cardEl.onclick = () => {
      // No actuar si estamos editando el enunciado
      if (calculatorMode && calculatorType === 'enunciado') return;
      // Si ya está activo el modo héroe, actualizar la selección
      if (calculatorMode && calculatorType === 'hero') {
        selectedHeroIndex = index;
        highlightHeroSelection();
        updateGridDisabledCards();
      } else {
        enterHeroCalculatorMode(index);
      }
    };
  });
}

// Exponer globalmente para pruebas o interacciones externas
window.attachHeroCalculatorListeners = attachHeroCalculatorListeners;
window.enterHeroCalculatorMode = enterHeroCalculatorMode;

// Exponer globalmente para pruebas o interacciones externas
window.attachBoardCalculatorListeners = attachBoardCalculatorListeners;

/**
 * Entra en modo calculadora para editar el enunciado (pot y bet). En este
 * modo se muestra una interfaz embebida en el área del enunciado para
 * seleccionar la unidad (BBs o €) y para introducir los valores de bote
 * y apuesta. Al aplicar los cambios se recalcula el escenario y se
 * actualizan los resultados y botones. Si se cancela se abandona el
 * modo calculadora.
 */
function enterEnunciadoCalculatorMode() {
  // Flag que indica si ya hubo cambios previos en modo calculadora
  const sessionModified = window.calculatorModified || false;

  // Guardar estado previo de calculadora y selección
  const wasCalcActive    = calculatorMode;
  const prevCalcType     = calculatorType;
  const prevBoardIndex   = selectedBoardIndex;
  const prevHeroIndex    = selectedHeroIndex;

  // Guardar estado original para detectar cambios en pot/bet/unidad/enunciado
  const origScenario    = currentScenario ? { pot: currentScenario.pot, bet: currentScenario.bet } : null;
  const origUnitType    = unitType;
  const origEnunciado   = currentEnunciado;

  // No reentrar si ya estamos en modo enunciado
  if (calculatorMode && calculatorType === 'enunciado') return;

  // Limpiar resaltados si venimos de modo board
  if (calculatorMode && calculatorType === 'board') {
    document.querySelectorAll('#duel-board .board-slot').forEach(s => s.classList.remove('highlight-calc'));
    document.querySelectorAll('.call-btn, .fold-btn').forEach(b => b.classList.remove('dimmed'));
    updateGridDisabledCards(false);
  }

  // Entrar en modo enunciado sin desactivar calculatorMode
  calculatorMode = true;
  calculatorType = 'enunciado';
  setCalculatorUI(true);

  // Contenedor del enunciado
  const combo = document.getElementById('combo-global');
  if (!combo) return;
  const originalHTML = combo.innerHTML;
  combo.innerHTML = '';

  // Construir editor de enunciado
  const editor = document.createElement('div');
  editor.className = 'enunciado-editor';

  const btnBB = document.createElement('button');
  btnBB.className = 'unit-option'; btnBB.dataset.unit = 'BB'; btnBB.textContent = 'BBs';
  const btnEUR = document.createElement('button');
  btnEUR.className = 'unit-option'; btnEUR.dataset.unit = 'EUR'; btnEUR.textContent = '€';
  const markActiveUnit = unit => [btnBB, btnEUR].forEach(b => b.classList.toggle('active', b.dataset.unit === unit));
  markActiveUnit(unitType);

  const potLabel = document.createElement('span'); potLabel.textContent = 'Pot:';
  const potWrapper = document.createElement('div'); potWrapper.className = 'cursor-wrapper';
  const potInput = document.createElement('input');
  potInput.type = 'text'; potInput.id = 'edit-pot';
  potInput.placeholder = unitType === 'EUR' ? '€' : 'BBs'; potInput.autocomplete = 'off'; potInput.inputMode = 'decimal';
  potWrapper.appendChild(potInput);

  const betLabel = document.createElement('span'); betLabel.textContent = 'Bet:';
  const betWrapper = document.createElement('div'); betWrapper.className = 'cursor-wrapper';
  const betInput = document.createElement('input');
  betInput.type = 'text'; betInput.id = 'edit-bet';
  betInput.placeholder = unitType === 'EUR' ? '€' : 'BBs'; betInput.autocomplete = 'off'; betInput.inputMode = 'decimal';
  betWrapper.appendChild(betInput);

  const applyBtn = document.createElement('button');
  applyBtn.className = 'apply-btn'; applyBtn.innerHTML = SVG_CHECK_GREEN;
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn'; cancelBtn.innerHTML = SVG_X_RED;

  editor.append(btnBB, btnEUR, potLabel, potWrapper, betLabel, betWrapper, applyBtn, cancelBtn);
  combo.appendChild(editor);

  // Adjunto teclado solo si no hubo cambios previos
  if (!sessionModified && typeof attachKeypadToInput === 'function') {
    attachKeypadToInput(potInput);
    attachKeypadToInput(betInput);
    createNumericKeypad('bottom-controls');
  }

  setTimeout(() => { potInput.focus(); potWrapper.classList.add('focused'); }, 0);
  potInput.addEventListener('focus', () => { potWrapper.classList.add('focused'); betWrapper.classList.remove('focused'); });
  betInput.addEventListener('focus', () => { potWrapper.classList.remove('focused'); betWrapper.classList.add('focused'); });

  function parseInput(val) { return val ? parseFloat(val.replace(',', '.')) : NaN; }

  [btnBB, btnEUR].forEach(btn => btn.addEventListener('click', () => {
    unitType = btn.dataset.unit;
    markActiveUnit(unitType);
    potInput.placeholder = unitType === 'EUR' ? '€' : 'BBs';
    betInput.placeholder = unitType === 'EUR' ? '€' : 'BBs';
  }));

  // CANCELAR: si no hubo ningún cambio en sesión o valores, salgo completamente
  cancelBtn.addEventListener('click', event => {
    event.stopPropagation();
    const newPot = parseInput(potInput.value);
    const newBet = parseInput(betInput.value);
    const unitChanged = unitType !== origUnitType;
    const potChanged  = origScenario ? newPot !== origScenario.pot : false;
    const betChanged  = origScenario ? newBet !== origScenario.bet : false;
    const enunChanged = origEnunciado !== currentEnunciado;

    if (!sessionModified && !unitChanged && !potChanged && !betChanged && !enunChanged) {
      combo.innerHTML = originalHTML;
      exitCalculatorMode(false);
      return;
    }

    // Resto: restaurar editor y mantener modo calculadora previo
    combo.innerHTML = originalHTML;
    calculatorMode     = wasCalcActive;
    calculatorType     = prevCalcType;
    selectedBoardIndex = prevBoardIndex;
    selectedHeroIndex  = prevHeroIndex;
    setCalculatorUI(true);
    highlightBoardSelection();
    highlightHeroSelection();
    (typeof attachBoardCalculatorListeners==='function'?attachBoardCalculatorListeners:window.attachBoardCalculatorListeners)();
    (typeof attachHeroCalculatorListeners==='function'?attachHeroCalculatorListeners:window.attachHeroCalculatorListeners)();
  });

  // APLICAR: actualizar pot/bet y restaurar modo calculadora previo
  applyBtn.addEventListener('click', event => {
    event.stopPropagation();
    const potVal = parseInput(potInput.value);
    const betVal = parseInput(betInput.value);
    if (isNaN(potVal) || isNaN(betVal) || potVal <= 0 || betVal <= 0) {
      alert('Valores inválidos. Introduce números positivos.'); return;
    }
    currentScenario.pot = potVal;
    currentScenario.bet = betVal;
    currentEnunciado = buildStatement(potVal, betVal);
    combo.innerHTML   = currentEnunciado;
    updateCalculatorDecision();
    updateCalculatorRow();

    calculatorMode     = wasCalcActive;
    calculatorType     = prevCalcType;
    selectedBoardIndex = prevBoardIndex;
    selectedHeroIndex  = prevHeroIndex;
    setCalculatorUI(true);
    highlightBoardSelection();
    highlightHeroSelection();
    (typeof attachBoardCalculatorListeners==='function'?attachBoardCalculatorListeners:window.attachBoardCalculatorListeners)();
    (typeof attachHeroCalculatorListeners==='function'?attachHeroCalculatorListeners:window.attachHeroCalculatorListeners)();
  });
}









// Exponer globalmente
window.enterEnunciadoCalculatorMode = enterEnunciadoCalculatorMode;

// Exponer funciones a nivel global para que otros módulos puedan consultarlas
window.isCalculatorActive = isCalculatorActive;
window.handleCalculatorCell = handleCalculatorCell;
window.enterBoardCalculatorMode = enterBoardCalculatorMode;
window.exitCalculatorMode = exitCalculatorMode;

/**
 * Actualiza el estado de las celdas del grid de outs para modo calculadora.
 * Cuando el modo calculadora de board está activo se desactivan
 * visualmente aquellas cartas ya presentes en la mano del héroe o en el
 * board. Si force se pasa como false o no se está en modo board, se
 * restablecen todas las celdas a su estado normal.
 *
 * @param {boolean} [force=true]
 */
function updateGridDisabledCards(force = true) {
  const cells = document.querySelectorAll('.card-grid');
  if (!cells.length) return;
  // Si no se debe aplicar la desactivación, eliminar las clases y salir
  if (!force || !(calculatorMode && calculatorType === 'board')) {
    cells.forEach(cell => cell.classList.remove('disabled-card-grid'));
    return;
  }
  // Determinar cartas a desactivar: héroe y board. Excluir la carta que se
  // está reemplazando para permitir seleccionar la misma carta.
  const disabled = new Set([...currentHero, ...currentBoard]);
  if (calculatorMode && calculatorType === 'board' && selectedBoardIndex != null) {
    disabled.delete(currentBoard[selectedBoardIndex]);
  }
  if (calculatorMode && calculatorType === 'hero' && selectedHeroIndex != null) {
    disabled.delete(currentHero[selectedHeroIndex]);
  }
  cells.forEach(cell => {
    const card = cell.dataset.card;
    if (disabled.has(card)) {
      cell.classList.add('disabled-card-grid');
    } else {
      cell.classList.remove('disabled-card-grid');
    }
  });
}

// Exponer también a nivel global por si otros módulos necesitan consultar
window.updateGridDisabledCards = updateGridDisabledCards;

// === Unidad actual para las cantidades del enunciado ===
// Por defecto se usa BB. Se expone a través de window.getUnitType().
let unitType = 'BB';
// Hacer accesible la unidad seleccionada globalmente
window.getUnitType = () => unitType;

/**
 * Inicializa el selector de unidades dentro de la pantalla de configuración.
 * Crea una fila con dos botones (BBs y €) que actúan como toggle. Si ya
 * existe el selector, no hace nada. Al cambiar la unidad se actualiza
 * la variable global unitType y se marca visualmente el botón activo.
 */
function initUnitTypeToggle() {
  const configScreen = document.getElementById('config-screen');
  if (!configScreen) return;
  // Evitar duplicar la fila si ya existe
  if (configScreen.querySelector('.unit-toggle-row')) return;
  const row = document.createElement('div');
  row.className = 'config-row config-row-toggle unit-toggle-row';
  const options = [
    { key: 'BB', label: 'BBs' },
    { key: 'EUR', label: '€' }
  ];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'toggle-btn';
    btn.dataset.unit = opt.key;
    const circle = document.createElement('span');
    circle.className = 'toggle-circle';
    const label = document.createElement('span');
    label.textContent = opt.label;
    btn.append(circle, label);
    // Marcar la opción por defecto
    if (opt.key === unitType) btn.classList.add('active');
    btn.addEventListener('click', () => {
      unitType = opt.key;
      // Actualizar todas las unidades
      document.querySelectorAll('.unit-toggle-row .toggle-btn')
              .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Exponer global
      window.getUnitType = () => unitType;
      // Actualizar enunciado actual si no está bloqueado
      const combo = document.getElementById('combo-global');
      if (combo && !textLockActive && currentScenario) {
        currentEnunciado = buildStatement(currentScenario.pot, currentScenario.bet);
        combo.textContent = currentEnunciado;
      }
    });
    row.appendChild(btn);
  });
  // Insertar la fila al final de config-screen
  configScreen.appendChild(row);
}

// ==========================
// Variables para control de escenarios y enunciados
// ==========================
// currentScenario mantiene la información de pot, apuesta y si la
// decisión correcta es CALL o FOLD para el ejercicio actual. lastScenarios
// almacena el historial de los últimos resultados para evitar repeticiones
// consecutivas de CALL/FOLD. currentEnunciado contiene el texto del
// enunciado actual (para restaurarlo tras usar el ojito).
let currentScenario = null;
const lastScenarios = [];
const maxHistory = 4;
let currentEnunciado = '';

// Conversión de BB a euros. Se asume 1 BB = 2€ para mostrar cantidades
// realistas cuando el usuario selecciona la opción €. Puedes modificar
// este valor si deseas un cambio distinto.
const BB_TO_EURO = 2;

// ==========================
// Lógica del botón candado
// ==========================
export function initHeroLock() {
  const lockBtn = document.getElementById('hero-lock');
  if (!lockBtn) return;
  lockBtn.innerHTML = SVG_CANDADO_INACTIVO;
  lockBtn.addEventListener('click', () => {
    lockActive = !lockActive;
    lockBtn.classList.toggle('active', lockActive);
    lockBtn.innerHTML = lockActive ? SVG_CANDADO_ACTIVO : SVG_CANDADO_INACTIVO;
    console.log("Candado (Hero/Board):", lockActive ? "ON" : "OFF");
  });
}

// ==========================
// Lógica del botón text-lock
// ==========================
export function initTextLock() {
  const textLockBtn = document.getElementById('text-lock');
  if (!textLockBtn) return;
  textLockBtn.innerHTML = SVG_CANDADO_INACTIVO;
  textLockBtn.addEventListener('click', () => {
    textLockActive = !textLockActive;
    textLockBtn.classList.toggle('active', textLockActive);
    textLockBtn.innerHTML = textLockActive ? SVG_CANDADO_ACTIVO : SVG_CANDADO_INACTIVO;
    console.log("Text Lock (enunciado):", textLockActive ? "ON" : "OFF");
  });
}

// ==========================
// Botones de la derecha
// ==========================
export function initRightButtons() {
  const configBtn   = document.getElementById('hero-config');
  const captureBtn  = document.getElementById('hero-capture');
  const nextBtn     = document.getElementById('hero-next');
  const infoBtn     = document.getElementById('hero-info');

  // Configuración
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      document.getElementById('screen-outs').style.display = 'none';
      document.getElementById('config-screen').style.display = 'flex';
    });
  }

  // Información
  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      const outsScreen   = document.getElementById('screen-outs');
      const configScreen = document.getElementById('config-screen');
      const infoPanel    = document.getElementById('info-panel');
      if (outsScreen)   outsScreen.style.display   = 'none';
      if (configScreen) configScreen.style.display = 'none';
      if (infoPanel)    infoPanel.style.display    = 'flex';
    });
  }

  // Salida del panel de información
  const exitInfo = document.getElementById('exit-info');
  if (exitInfo) {
    exitInfo.addEventListener('click', () => {
      const infoPanel    = document.getElementById('info-panel');
      const returnScreen = infoPanel && infoPanel.dataset.returnScreen;
      if (returnScreen === 'config') {
        infoPanel.style.display = 'none';
        delete infoPanel.dataset.returnScreen;
        const configScreen = document.getElementById('config-screen');
        if (configScreen) configScreen.style.display = 'flex';
      } else {
        const outsScreen = document.getElementById('screen-outs');
        infoPanel.style.display = 'none';
        if (outsScreen) outsScreen.style.display = 'flex';
      }
    });
  }

  // Capturar al portapapeles
  if (captureBtn) {
    captureBtn.addEventListener('click', copyCaseDetailed);
  }

  // Forzar siguiente con bloqueo temporal del botón
  // Forzar siguiente con bloqueo hasta completar la generación
if (nextBtn) {
  nextBtn.onclick = async () => {
    if (isGenerating) return; // Prevención extra

    nextBtn.setAttribute('disabled', 'disabled');

    if (calculatorMode) {
      exitCalculatorMode();
    } else {
      await generateBasicSpot(); // ← protección interna ya incluida
    }

    nextBtn.removeAttribute('disabled');
  };
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

/**
 * Genera un resumen del ejercicio actual con pot odds y equity detalladas y
 * lo copia al portapapeles. Este método reemplaza a copyCurrentCase para
 * el modo de pot odds. Utiliza la información del escenario, outs y
 * configuración para crear un texto completo.
 */
function copyCaseDetailed() {
  const hero = currentHero.join(' ');
  const board = currentBoard.join(' ');
  const positives = getPositiveOuts().join(' ');
  const negatives = getNegativeOuts().join(' ');
  let potPct = '--';
  let potRatio = '--';
  if (currentScenario) {
    potPct = (currentScenario.potOddsPercent * 100).toFixed(0);
    potRatio = formatRatio(currentScenario.potOddsRatio);
  }
  // Equity aproximada basada en outs: tanto al Turn como al River se aproximan al 2% por out
  const eqTurnPct = (currentOuts * 2).toFixed(0);
  const eqTurnRatio = formatRatio((100 / (currentOuts * 2)) - 1);
  const eqRiverPct = (currentOuts * 2).toFixed(0);
  const eqRiverRatio = formatRatio((100 / (currentOuts * 2)) - 1);
  const answer = currentScenario && currentScenario.callCorrect ? 'CALL' : 'FOLD';
  const text = `--- EJERCICIO POT ODDS ---\n` +
               `Enunciado: ${currentEnunciado}\n` +
               `Hero: ${hero}\n` +
               `Board: ${board}\n` +
               `Outs Positivas: ${positives}\n` +
               `Outs Negativas: ${negatives}\n` +
               `Pot Odds: N: ${potPct}% (${potRatio})\n` +
               `Equity Turn: ${eqTurnPct}% (${eqTurnRatio})\n` +
               `Equity River: ${eqRiverPct}% (${eqRiverRatio})\n` +
               `Respuesta Correcta: ${answer}`;
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
  // Insertar calavera entre Flop-Turn y Turn-River
  if (index === 3 || index === 4) {
    const sep = document.createElement('div');
    sep.className = 'skull-separator';
    sep.innerHTML = `
      <svg class="Icon" xmlns="http://www.w3.org/2000/svg" viewBox="60 60 392 392" width="32" height="32" style="margin: 3; padding: ; background: none;">
  <g>
    <path d="M257.617 20.717c-7.083-.011-14.242.448-21.469 1.347-31.2 3.87-59.077 16.346-82.566 39.51-18.59 18.323-30.93 40.783-33.8 68.274-3.409 32.99 6.985 61.16 28.118 84.191 6.792 7.386 9.795 14.582 9.608 25.03-.297 16.428.974 32.882 1.65 50.308 21.027-12.421 41.214-24.384 61.674-36.48 12.176 21.378 24.055 42.27 36.479 63.976 12.148-21.517 23.894-42.3 35.826-63.244 19.753 11.8 39.24 23.46 59.373 35.557.514-16.94 1.733-32.799 1.246-48.6-.353-11.07 1.813-19.676 10.256-26.223 2.677-2.083 4.707-5.356 6.845-8.308 20.568-28.606 27.712-60.348 17.16-95.498-9.77-32.502-30.771-54.695-57.699-70.362-23.066-13.405-47.403-19.44-72.7-19.478zM340.416 125.924c17.942-.134 26.164 11.07 22.404 30.474-4.353 22.379-22.92 38.723-42.674 37.668-21.38-1.139-38.695-18.755-41.025-41.892-.186-1.811.435-4.598 1.6-5.547 10.658-8.605 45.704-20.593 59.695-20.703zM175.262 125.954c13.717.865 29.494 7.548 45.084 14.91 2.297 1.107 4.408 2.785 6.763 3.464 5.847 1.651 6.088 6.113 5.25 11.31-3.76 22.217-23.004 39.484-42.785 38.401-22.433-1.218-39.592-19.269-41.162-43.351-1.083-16.59 6.766-24.952 26.85-24.735zM255.877 182.51c7.44 18.214 14.42 35.235 21.646 52.93h-43.187c7.144-17.588 14.152-34.637 21.54-52.93zM239.705 324.35c-.146.319-.293.633-.42.976-2.894 7.981-6.197 15.856-9.984 23.543-8.334 16.832-17.293 33.365-25.71 50.09-6.63 13.125-10.336 26.845-7.74 41.783 5.71 32.582 36.67 54.827 69.63 49.844 39.886-6.033 59.48-41.103 48.603-74.902-4.357-13.586-11.283-26.469-17.941-39.159-8.46-16.062-16.528-32.279-23.061-49.11-2.348 4.152-4.698 8.311-7.057 12.491l-8.658 15.328-8.742-15.279a11284.8 11284.8 0 0 1-8.92-15.605zM239.758 365.32c3.709.032 3.735 27.583 1.642 40.026-2.166 12.555.13 24.084 10.495 32.69 15.02 12.475 35.426 9.66 46.654-6.386.514-.68.975-1.355 1.49-2.06.404.083.756.164 1.162.219-.89 4.763-1.217 9.633-2.652 14.261-6.33 20.702-25.515 33.068-47.977 31.174-19.404-1.624-35.833-17.753-39.24-37.996-1.841-10.579 1.218-20.05 5.654-29.17 6.602-13.61 14.018-26.817 20.647-40.375.81-1.655 1.518-2.388 2.125-2.383z" fill="#ff0000" fill-opacity="1"></path>
  </g>
</svg>`;
    container.appendChild(sep);
  }

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
  // Aplica el color de palo apropiado a cada carta, dependiendo del
  // modo actual (RAINBOW, PAIRED, MONO, RAND). En modo RAND se elige
  // aleatoriamente uno de los otros tres modos al inicio de cada
  // ejercicio.
  let effectiveMode = suitMode;
  if (suitMode === 'RAND') {
    const modes = ['RAINBOW', 'PAIRED', 'MONO'];
    effectiveMode = modes[Math.floor(Math.random() * modes.length)];
  }
  document.querySelectorAll('.card').forEach(card => {
    const text = card.textContent || '';
    const suit = text.slice(-1);
    card.style.color = getSuitColor(suit, effectiveMode);
  });
}

/**
 * Devuelve el color correspondiente a un palo según el modo solicitado.
 * @param {string} suit Carácter del palo (♥♦♣♠)
 * @param {string} mode Modo de color (RAINBOW, PAIRED, MONO)
 */
function getSuitColor(suit, mode) {
  if (mode === 'RAINBOW') {
    return suit === '♥' ? '#cc2121'
         : suit === '♦' ? '#248da7'
         : suit === '♣' ? '#24a743'
         : '#929292';
  }
  if (mode === 'PAIRED') {
    return (suit === '♥' || suit === '♦') ? '#cc2121' : '#929292';
  }
  // MONO u otros: verde para todo
  return '#29a847';
}

/**
 * Activa o desactiva ciertos botones cuando el modo Magic View está activo.
 * Cuando active = true, deshabilita ConfigBox, CaptureMe y NextLevel para
 * evitar interferencias. Cuando active = false, los vuelve a habilitar.
 * Se expone globalmente como window.updateMagicViewState para permitir
 * que otros módulos la invoquen (p.ej. desde reveal.js).
 *
 * @param {boolean} active
 */
function updateMagicViewState(active) {
  const btns = [
    document.getElementById('hero-config'),
    document.getElementById('hero-capture'),
    document.getElementById('hero-next')
  ];
  btns.forEach(btn => {
    if (!btn) return;
    if (active) {
      btn.classList.add('disabled-button');
      btn.setAttribute('disabled', 'disabled');
    } else {
      btn.classList.remove('disabled-button');
      btn.removeAttribute('disabled');
    }
  });
    // — Bloquear/desbloquear interacciones en el board en Magic View —
  const board = document.getElementById('duel-board');
  if (board) {
    board.classList.toggle('disable-interaction', active);
  }
}

// ==========================
// Cuenta atrás y modo memoria
// ==========================

/**
 * Limpia cualquier temporizador de cuenta atrás activo.
 */
function clearCountdown() {
  if (countdownTimerId) {
    clearTimeout(countdownTimerId);
    countdownTimerId = null;
  }
}

/**
 * Arranca un nuevo temporizador de cuenta atrás si countdownDuration > 0.
 * Al expirar, marca la mano como fallida y tras 2 segundos genera una
 * nueva mano. Si se llama de nuevo antes de expirar, se reinicia.
 */
function startCountdown() {
  clearCountdown();
  if (countdownDuration && countdownDuration > 0) {
    countdownTimerId = setTimeout(() => {
      try {
        // Marcar todas las cartas como incorrectas para indicar fallo
        markIncorrectCards();
      } catch (e) {}
      // Después de 2 segundos, pasar al siguiente ejercicio
      setTimeout(() => {
        generateBasicSpot();
      }, 2000);
    }, countdownDuration * 1000);
  }
}

/**
 * Cancela todos los temporizadores de memoria activos y restaura las cartas.
 */
function clearMemoryTimers() {
  memoryTimers.forEach(id => clearTimeout(id));
  memoryTimers = [];
  // Restaurar todas las cartas ocultas
  document.querySelectorAll('.hidden-by-memory').forEach(el => {
    el.classList.remove('hidden-by-memory');
  });
}

/**
 * Programa el ocultamiento de las zonas seleccionadas tras memoryDuration segundos.
 * Si memoryDuration es 0 o no hay zonas marcadas, no hace nada. Si
 * memoryRandomCount > 0, oculta al azar ese número de zonas entre las
 * seleccionadas.
 */
function scheduleMemoryHides() {
  clearMemoryTimers();
  if (!memoryDuration || memoryDuration <= 0) return;
  // Determinar las zonas activas marcadas
  const selected = Object.keys(memoryZones).filter(z => memoryZones[z]);
  if (selected.length === 0) return;
  let zonesToHide;
  if (memoryRandomCount && memoryRandomCount > 0) {
    const shuffled = selected.slice().sort(() => Math.random() - 0.5);
    zonesToHide = shuffled.slice(0, Math.min(memoryRandomCount, selected.length));
  } else {
    zonesToHide = selected;
  }
  zonesToHide.forEach(zone => {
    const tid = setTimeout(() => hideZone(zone), memoryDuration * 1000);
    memoryTimers.push(tid);
  });
}

/**
 * Oculta una zona concreta añadiendo la clase hidden-by-memory a los
 * elementos correspondientes. Las zonas disponibles son: flop (primeras
 * 3 cartas del board), turn (4ª), river (5ª) y hero (mano del héroe).
 * @param {string} zone
 */
function hideZone(zone) {
  const selectors = {
    flop: '#duel-board .board-slot:nth-child(1) .card-content, #duel-board .board-slot:nth-child(2) .card-content, #duel-board .board-slot:nth-child(3) .card-content',
    turn: '#duel-board .board-slot:nth-child(4) .card-content',
    river: '#duel-board .board-slot:nth-child(5) .card-content',
    hero: '#hero-hand .card-content'
  };
  const nodes = document.querySelectorAll(selectors[zone] || '');
  nodes.forEach(n => {
    n.classList.add('hidden-by-memory');
  });
}

/**
 * Bind que permite revelar temporalmente una carta oculta al hacer clic.
 * El contenido oculto se muestra durante 500 ms y luego vuelve a ocultarse.
 */
function bindMemoryReveal() {
  if (bindMemoryReveal.bound) return;
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const content = card.querySelector('.card-content.hidden-by-memory');
    if (!content) return;
    // Evitar que otros listeners se ejecuten
    e.stopImmediatePropagation();
    // Revelar
    content.classList.remove('hidden-by-memory');
    // Ocultar de nuevo tras 500 ms
    setTimeout(() => {
      content.classList.add('hidden-by-memory');
    }, 500);
  }, true);
  bindMemoryReveal.bound = true;
}

// Iniciar binding de memoria desde el módulo al cargar
bindMemoryReveal();

// Hacer accesible globalmente para reveal.js
window.updateMagicViewState = updateMagicViewState;

// ==========================
// Generador de escenarios de pot/odds y enunciado
// ==========================

/**
 * Genera un escenario de pot odds coherente con el número de outs y la
 * fase (flop/turn). El escenario determina si la acción correcta es
 * CALL o FOLD y genera un bote y apuesta adecuados para forzar esa
 * decisión. También evita repetir el mismo resultado (CALL/FOLD) más
 * de maxHistory veces consecutivas.
 *
 * @param {number} outsCount Número total de outs positivos + negativos.
 * @param {number} boardLen Longitud del board (3 flop, 4 turn).
 * @returns {object} Objeto con {callCorrect, pot, bet, heroEquityPercent, potOddsPercent, potOddsRatio}
 */
function generateScenario(outsCount, boardLen) {
  // 1) Decidir CALL o FOLD evitando rachas
  const lastCalls = lastScenarios.slice(-maxHistory);
  let callCorrect;
  if (lastCalls.length === maxHistory && lastCalls.every(v => v === lastCalls[0])) {
    callCorrect = !lastCalls[0];
  } else {
    callCorrect = Math.random() < 0.5;
  }

  // 2) Equity aproximada del héroe
  let heroEquityPercent = outsCount * (boardLen < 4 ? 4 : 2);
  if (heroEquityPercent > 90) heroEquityPercent = 90;
  const heroEqDec = heroEquityPercent / 100;

  // 3) Elegir potOddsPercent según CALL/FOLD
  let potOddsPercent;
  if (callCorrect) {
    const minVal = Math.max(heroEqDec * 0.5, 0.01);
    const maxVal = heroEqDec * 0.9;
    potOddsPercent = minVal + Math.random() * (maxVal - minVal);
  } else {
    const minVal = heroEqDec * 1.1;
    const maxVal = Math.min(heroEqDec * 2, 0.95);
    potOddsPercent = minVal >= maxVal
      ? Math.min(minVal, 0.95)
      : minVal + Math.random() * (maxVal - minVal);
  }
  potOddsPercent = Math.min(potOddsPercent, 0.95);

  // 4) Simulación de botes en NL Hold’em

  // Asumimos stack efectivo de 100 BB
  const STACK_BB = 100;

  // 4.1) Bote inicial post-ciegas (2 BB + 1 BB)
  let pot = 3;

  // 4.2) Simular 0–3 subidas preflop (open-raise, 3-bet, 4-bet/shove)
  const raises = Math.floor(Math.random() * 4); // 0,1,2 o 3 raises
  for (let i = 1; i <= raises; i++) {
    let sizeBB;
    if (i === 1) {
      // open-raise típico 2.5–4 BB
      sizeBB = [2.5, 3, 4][Math.floor(Math.random() * 3)];
    } else if (i === 2) {
      // 3-bet típico 6–9 BB
      sizeBB = [6, 7.5, 9][Math.floor(Math.random() * 3)];
    } else {
      // 4-bet o shove: 12–20 BB o todo el stack
      const opts = [12, 15, 20, STACK_BB];
      sizeBB = opts[Math.floor(Math.random() * opts.length)];
    }
    pot += sizeBB;
  }

  // 4.3) Limitar bote al stack efectivo (no-limit)
  const effectivePot = Math.min(pot, STACK_BB);

  // 5) Generar apuesta realista sobre ese bote
  // tamaños: ¼, ½, 2/3, ¾, full pot o 1.25×
  const betPctOptions = [0.25, 0.5, 2/3, 0.75, 1, 1.25];
  const chosenPct = betPctOptions[Math.floor(Math.random() * betPctOptions.length)];
  const bet = Math.max(2, Math.round(effectivePot * chosenPct));

  // 6) Calcular pot odds reales
  const actualPotOdds = bet / (effectivePot + bet);
  const actualPotOddsRatio = effectivePot / bet;

  return {
    callCorrect,
    pot: effectivePot,
    bet,
    heroEquityPercent,
    potOddsPercent: actualPotOdds,
    potOddsRatio: actualPotOddsRatio
  };
}



/**
 * Detecta el tipo de proyecto (OESD, GUT, FLUSH, combinados) en función
 * del número de outs actuales. Si el número de outs coincide con un
 * patrón conocido se devuelve el nombre correspondiente. Se usa tanto
 * al generar nuevos spots como en modo calculadora tras modificar
 * cartas del board. Devuelve una cadena vacía si no se reconoce.
 */
function detectProjectName() {
  const outsCount = currentOutsList ? currentOutsList.length : 0;
  // Combinaciones muy grandes (>=13 outs) se consideran proyectos
  // combinados de straight + flush (open o gut)
  if (outsCount >= 13) {
    // Diferenciar entre open-ended (8 outs) y gutshot (4 outs) acompañados
    // de flush (9 outs). Si la diferencia sobre 9 outs es >= 4, asumimos
    // open-ended; de lo contrario gutshot.
    const diff = outsCount - 9;
    return diff >= 4 ? 'OESD-FLUSH' : 'GUT-FLUSH';
  }
  // Flush puro (~9 outs)
  if (outsCount === 9) {
    return 'FLUSH';
  }
  // Open-ended straight draw (~8 outs)
  if (outsCount === 8) {
    return 'OESD';
  }
  // Gutshot straight draw (~4 outs)
  if (outsCount === 4) {
    return 'GUT';
  }
  // Algunos proyectos combinados con 12 outs
  if (outsCount === 12) {
    return 'GUT-FLUSH';
  }
  return '';
}

/**
 * Construye el texto del enunciado a partir del bote y la apuesta,
 * respetando la unidad seleccionada por el usuario (BB o €). Usa
 * currentUnit a través de window.getUnitType().
 *
 * @param {number} pot
 * @param {number} bet
 * @returns {string} Texto descriptivo del spot
 */
function buildStatement(pot, bet) {
  const unit = typeof window.getUnitType === 'function' ? window.getUnitType() : 'BB';
  const toMoney = v => Math.round(v * BB_TO_EURO);

  let potText, betText;

  if (unit === 'EUR') {
    potText = `<span style="color:#e74c3c">${toMoney(pot)}€</span>`;
    betText = `<span style="color:#e74c3c">${toMoney(bet)}€</span>`;
  } else {
    potText = `<span style="color:#e74c3c">${pot} BBs</span>`;
    betText = `<span style="color:#e74c3c">${bet} BBs</span>`;
  }

  return `Pot: ${potText} - Bet: ${betText}`;
}


/**
 * Formatea un ratio numérico como string x:y con hasta tres decimales,
 * eliminando ceros innecesarios.
 *
 * @param {number} val Ratio numérico (por ejemplo, 2.125)
 * @returns {string} Cadena del tipo "2:1" o "2.125:1"
 */
function formatRatio(val) {
  if (!isFinite(val) || isNaN(val)) return '--';
  // Redondeamos a un decimal para una lectura más humana. Si el decimal es
  // exactamente 0 se elimina para mostrar un número entero.
  const rounded = Number(val.toFixed(1));
  return `${rounded.toString().replace(/\.0$/, '')}:1`;
}

/**
 * Elimina cualquier marca de fallo previo en las cartas del héroe y del board.
 */
function clearIncorrectHighlights() {
  document.querySelectorAll('#hero-hand .card, #duel-board .card').forEach(card => {
    card.classList.remove('incorrect-call');
  });
}

/**
 * Marca las cartas del héroe y del board con un borde rojo para indicar
 * que la decisión de CALL/FOLD ha sido incorrecta.
 */
function markIncorrectCards() {
  document.querySelectorAll('#hero-hand .card, #duel-board .card').forEach(card => {
    card.classList.add('incorrect-call');
  });
}

/**
 * Maneja la lógica de validación al pulsar CALL o FOLD. Se comprueba si la
 * acción elegida es la correcta en función del escenario, y si los outs y
 * las equities introducidas (si se han introducido) son correctos. Si todo
 * está correcto se pasa al siguiente ejercicio; de lo contrario se señala
 * el error y se mantiene el ejercicio.
 *
 * @param {string} action "CALL" o "FOLD"
 */
function handleAction(action) {
  // Asegurar que la información del escenario exista
  if (!currentScenario) return;

  // Detener cuenta atrás y ocultamientos de memoria al tomar una decisión
  clearCountdown();
  clearMemoryTimers();
  const chosen = action.toUpperCase();
  const callIsCorrect = currentScenario.callCorrect;
  const actionCorrect = (callIsCorrect && chosen === 'CALL') || (!callIsCorrect && chosen === 'FOLD');

  // Determinar si el usuario ha seleccionado alguna carta (outs) y si son correctas
  const selectedCount = document.querySelectorAll('#outs-grid .card-grid.selected').length;
  const outsAttempted = selectedCount > 0;
  const outsCorrect = validateOutsSelection();

  // Comprobar inputs de equity
  const inputTurn = document.getElementById('equity-turn');
  const inputRiver = document.getElementById('equity-river');
  let turnAttempted = false;
  let turnCorrect = true;
  let riverAttempted = false;
  let riverCorrect = true;
  if (inputTurn) {
    const v = inputTurn.value.trim();
    if (v !== '') {
      turnAttempted = true;
      turnCorrect = validateSingleEquity(v, currentEquityTurn);
    }
  }
  if (inputRiver) {
    const v = inputRiver.value.trim();
    if (v !== '') {
      riverAttempted = true;
      riverCorrect = validateSingleEquity(v, currentEquityRiver);
    }
  }
  const equityCorrect = (!turnAttempted || turnCorrect) && (!riverAttempted || riverCorrect);

  const finalCorrect = actionCorrect && (!outsAttempted || outsCorrect) && equityCorrect;
  if (finalCorrect) {
    clearIncorrectHighlights();
    // Desplazar enunciado a su estado original en caso de que estuviera oculto por el ojito
    const combo = document.getElementById('combo-global');
    if (combo && !textLockActive) {
      combo.innerHTML = currentEnunciado;

    }
    generateBasicSpot();
  } else {
    markIncorrectCards();
  }
}

// ==========================
// FUNCIÓN PRINCIPAL
// ==========================
let isGenerating = false;
let generationAbortController = null;
export async function generateBasicSpot() {
  // Si ya estamos generando, abortamos la anterior y comenzamos una nueva
  if (isGenerating && generationAbortController) {
    generationAbortController.abort();
  }

  // Nuevo controlador para esta generación
  generationAbortController = new AbortController();
  const { signal } = generationAbortController;
  isGenerating = true;

  try {
    const container = document.getElementById('bottom-controls');
    container.innerHTML = '';
    clearIncorrectHighlights();

    // === Tamaño del board ===
    let boardSize;
    if (!forceTurn && !forceRiver) {
      boardSize = Math.random() < 0.5 ? 3 : 4;
    } else if (forceTurn && !forceRiver) {
      boardSize = 3;
    } else if (!forceTurn && forceRiver) {
      boardSize = 4;
    } else {
      boardSize = Math.random() < 0.5 ? 3 : 4;
    }
    showTurn = boardSize === 4;

    // === Generación del spot ===
    if (!lockActive) {
      let retry = 0;
      while (true) {
        if (retry++ > 5) throw new Error('Demasiados intentos fallidos de generar un board sin duplicados');
        const { hero, board, project } = generateRandomProject();
        const deck = buildDeck([...hero, ...board]);
        const extraCount = boardSize - 3;
        const extras = pick(deck, extraCount);
        const newBoard = [...board, ...extras];

        const allCards = [...hero, ...newBoard];
        if (new Set(allCards).size === allCards.length) {
          currentHero = hero;
          currentBoard = newBoard;
          currentProjectName = project || '';
          break;
        }
        console.warn('Cartas duplicadas detectadas. Reintentando...');
      }
    }

    // === Cálculo de outs y equity ===
    const outs = setSolutionOuts(currentHero, currentBoard);
    currentOutsList = outs;
    currentOuts = outs.length;
    currentProjectName = detectProjectName();

    if (currentBoard.length === 3) {
      currentEquityTurn = currentOuts * 2;
      currentEquityRiver = null;
    } else {
      currentEquityTurn = null;
      currentEquityRiver = currentOuts * 2;
    }

    // === Escenario y enunciado ===
    if (!textLockActive || !currentScenario) {
      currentScenario = generateScenario(currentOutsList.length, currentBoard.length);
      lastScenarios.push(currentScenario.callCorrect);
      if (lastScenarios.length > maxHistory) lastScenarios.shift();
      currentEnunciado = buildStatement(currentScenario.pot, currentScenario.bet);
      window.getCurrentEnunciado = () => currentEnunciado;
    }

    clearCountdown();
    clearMemoryTimers();

    // === Render visual ===
    renderHeroHand(currentHero);
    updateSuitColors();
    renderHeroControls();
    renderFullBoard(currentBoard);
    updateSuitColors();
    attachBoardCalculatorListeners();
    attachHeroCalculatorListeners();
    renderOutsGrid('bottom-controls');
    renderEquityRow('bottom-controls');
    adjustEquityInputs();
    renderActionButtons();
    attachKeypadToEquity();

    const combo = document.getElementById('combo-global');
    if (!textLockActive) combo.innerHTML = currentEnunciado;
    if (combo) {
      combo.onclick = () => {
        const revealActive = typeof window.isRevealActive === 'function' && window.isRevealActive();
        if (textLockActive || revealActive) return;
        enterEnunciadoCalculatorMode();
      };
    }

    attachValidationListeners();
    attachConfigListeners();
    initUnitTypeToggle();
    updateSuitColors();
    startCountdown();
    scheduleMemoryHides();

    // Reactivar el botón “Next”
    const nextBtn = document.getElementById('hero-next');
    if (nextBtn) nextBtn.removeAttribute('disabled');

  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error al generar ejercicio:', err);
    }
  } finally {
    isGenerating = false;
  }
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

  // Listeners para acciones CALL y FOLD
  btnCall.addEventListener('click', () => {
    // En modo calculadora no validamos la acción ni cambiamos de ejercicio
    if (calculatorMode) return;
    handleAction('CALL');
  });

  // Insertar ':' en el campo de equity actual cuando se pulse el botón de los dos puntos.
  btnColon.addEventListener('click', () => {
    appendCharToCurrentTarget(':');
  });
  // Insertar '%' en el campo de equity actual cuando se pulse el botón de porcentaje.
  btnPercent.addEventListener('click', () => {
    appendCharToCurrentTarget('%');
  });
  btnFold.addEventListener('click', () => {
    if (calculatorMode) return;
    handleAction('FOLD');
  });
}

/**
 * Ajusta la interfaz de los inputs de equity (Necesaria, Turn, River) en función de
 * las variables actuales de equity. Si currentEquityTurn es null, la sección
 * de Turn se deshabilita visualmente y no acepta foco. De lo contrario se
 * muestra normalmente. Este ajuste debe invocarse tras renderizar la fila
 * de equity.
 */
function adjustEquityInputs() {
  const turnInput = document.getElementById('equity-turn');
  const riverInput = document.getElementById('equity-river');
  const turnBox = turnInput ? turnInput.closest('.equity-box') : null;
  const riverBox = riverInput ? riverInput.closest('.equity-box') : null;
  // Determinar qué secciones se deshabilitan
  const disableTurn = currentEquityTurn == null;
  const disableRiver = currentEquityRiver == null;
  // Ajustar turno
  if (turnBox) {
    if (disableTurn) {
      turnBox.style.opacity = '0.4';
      turnBox.style.pointerEvents = 'none';
      if (turnInput) {
        turnInput.readOnly = true;
        turnInput.value = '';
      }
    } else {
      turnBox.style.opacity = '';
      turnBox.style.pointerEvents = '';
      if (turnInput) {
        turnInput.readOnly = true;
      }
    }
  }
  // Ajustar river
  if (riverBox) {
    if (disableRiver) {
      riverBox.style.opacity = '0.4';
      riverBox.style.pointerEvents = 'none';
      if (riverInput) {
        riverInput.readOnly = true;
        riverInput.value = '';
      }
    } else {
      riverBox.style.opacity = '';
      riverBox.style.pointerEvents = '';
      if (riverInput) {
        riverInput.readOnly = true;
      }
    }
  }
  // También ajustar opacidad de las etiquetas inline del header
  const inlineTurnEl = document.getElementById('inline-turn');
  const inlineRiverEl = document.getElementById('inline-river');
  if (inlineTurnEl) {
    inlineTurnEl.style.opacity = disableTurn ? '0.4' : '';
  }
  if (inlineRiverEl) {
    inlineRiverEl.style.opacity = disableRiver ? '0.4' : '';
  }
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
  // Permitir tanto porcentajes como ratios. Calculamos el porcentaje
  // equivalente del valor introducido y lo comparamos con el requerido.
  const valPct = parseEquityInput(value);
  if (isNaN(valPct)) return false;
  // Tolerancia flexible: aceptamos diferencias de hasta 2 puntos
  return Math.abs(valPct - required) <= 2;
}

/**
 * Convierte una entrada de equity a porcentaje. Acepta formatos como
 * "33", "33%", "2:1" (ratio), "2" (tratado como 2:1) y devuelve
 * el porcentaje aproximado. Devuelve NaN si no se puede interpretar.
 *
 * @param {string} value Texto introducido por el usuario.
 * @returns {number} Porcentaje de equity (0-100).
 */
function parseEquityInput(value) {
  if (!value) return NaN;
  const v = value.trim().replace(/\s+/g, '');
  // Ratio tipo a:b
  if (v.includes(':')) {
    const parts = v.split(':');
    const a = parseFloat(parts[0].replace(',', '.'));
    const b = parseFloat(parts[1].replace(',', '.'));
    if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) return NaN;
    // equity = b / (a + b) * 100
    return (b / (a + b)) * 100;
  }
  // Ratio sin separador tipo "2" lo interpretamos como 2:1
  const onlyNum = v.replace('%', '');
  const n = parseFloat(onlyNum.replace(',', '.'));
  if (isNaN(n) || n <= 0) return NaN;
  // Si termina en %, se interpreta como porcentaje directamente
  if (v.endsWith('%')) {
    return n;
  }
  // Sin %: interpretarlo como ratio (n:1)
  return (1 / (n + 1)) * 100;
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
  const btnRiver = document.getElementById('toggle-river');
  const btnExit = document.getElementById('exit-config');

  // Botón de información dentro de la pantalla de configuración
  const btnInfoConfig = document.getElementById('config-info');

  if (btnTurn) {
    btnTurn.onclick = () => {
      forceTurn = !forceTurn;
      btnTurn.textContent = `Turn: ${forceTurn ? 'ON' : 'OFF'}`;
    };
  }

  // Listener para activar/desactivar el modo River. Al activarlo se muestra
  // la carta de river y se ajustan los cálculos de equity. Si solo River
  // está activo se desactiva la parte Turn de la UI.
  if (btnRiver) {
    btnRiver.onclick = () => {
      forceRiver = !forceRiver;
      btnRiver.textContent = `River: ${forceRiver ? 'ON' : 'OFF'}`;
    };
  }

  if (btnExit) {
    btnExit.onclick = () => {
      document.getElementById('config-screen').style.display = 'none';
      document.getElementById('screen-outs').style.display = 'flex';
      generateBasicSpot();
    };
  }

  // Info desde configuración: oculta la configuración y muestra el panel de ayuda,
  // recordando que se volvió desde config para restaurar al salir.
  if (btnInfoConfig) {
    btnInfoConfig.onclick = () => {
      const configScreen = document.getElementById('config-screen');
      const infoPanel = document.getElementById('info-panel');
      if (configScreen) configScreen.style.display = 'none';
      if (infoPanel) {
        infoPanel.style.display = 'flex';
        infoPanel.dataset.returnScreen = 'config';
      }
    };
  }

  // === Controles adicionales de configuración ===
  // Duración de la cuenta atrás
  const countdownSelect = document.getElementById('countdown-select');
  if (countdownSelect) {
    countdownSelect.onchange = () => {
      const v = parseInt(countdownSelect.value, 10);
      countdownDuration = isNaN(v) ? 0 : v;
    };
  }
  // Duración de memoria
  const memorySelect = document.getElementById('memory-select');
  if (memorySelect) {
    memorySelect.onchange = () => {
      const v = parseInt(memorySelect.value, 10);
      memoryDuration = isNaN(v) ? 0 : v;
    };
  }
  // Zonas de memoria
  document.querySelectorAll('[data-mzone]').forEach(el => {
    el.onchange = () => {
      const zone = el.dataset.mzone;
      memoryZones[zone] = el.checked;
    };
  });
  // Conteo aleatorio de zonas
  const memRnd = document.getElementById('memory-random-select');
  if (memRnd) {
    memRnd.onchange = () => {
      const v = parseInt(memRnd.value, 10);
      memoryRandomCount = isNaN(v) ? 0 : v;
    };
  }
  // Modo de palos
  const suitSelect = document.getElementById('suit-mode-select');
  if (suitSelect) {
    suitSelect.onchange = () => {
      suitMode = suitSelect.value;
      updateSuitColors();
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
  const res = new Set();
  while (res.size < n && arr.length) {
    const idx = Math.floor(Math.random() * arr.length);
    const card = arr.splice(idx, 1)[0];
    if (!res.has(card)) res.add(card);
  }
  return [...res];
}


// === Generadores ===
function genOESD() {
  const start = Math.floor(Math.random() * 7);
  const run = [RANKS[start], RANKS[start+1], RANKS[start+2], RANKS[start+3]];
  const deck0 = buildDeck();
  const hero = pick(deck0.filter(c => [run[0], run[1]].includes(c[0])), 2);
  const deck1 = buildDeck(hero);
  const board = pick(deck1.filter(c => [run[1], run[2], run[3]].includes(c[0])), 3);
  return { hero, board, project: 'OESD' };
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
  return { hero, board, project: 'GUT' };
}

function genFlush() {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const deck0 = buildDeck();
  const hero = pick(deck0.filter(c => c[1] === suit), 2);
  const deck1 = buildDeck(hero);
  const board = pick(deck1.filter(c => c[1] === suit), 2)
              .concat(pick(deck1.filter(c => c[1] !== suit), 1));
  return { hero, board, project: 'FLUSH' };
}

function genComboOESDFlush() {
  const { hero: h0, board: b0 } = genOESD();
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const hero = h0.map(c => c[0] + suit);
  const deck1 = buildDeck(hero);
  const suited = pick(deck1.filter(c => c[1] === suit), 2);
  return { hero, board: suited.concat(b0.slice(0, 1)), project: 'OESD-FLUSH' };
}

function genComboGutFlush() {
  const { hero: h0, board: b0 } = genGutshot();
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const hero = h0.map(c => c[0] + suit);
  const deck1 = buildDeck(hero);
  const suited = pick(deck1.filter(c => c[1] === suit), 2);
  return { hero, board: suited.concat(b0.slice(0, 1)), project: 'GUT-FLUSH' };
}

export function initHeroEye() {
  const eyeBtn = document.getElementById('hero-eye');
  if (!eyeBtn) return;

  // Estado inicial
  eyeBtn.innerHTML = SVG_OJO_INACTIVO;

  // Alternar al hacer clic
  eyeBtn.addEventListener('click', () => {
    const active = eyeBtn.classList.toggle('active');
    eyeBtn.innerHTML = active ? SVG_OJO_ACTIVO : SVG_OJO_INACTIVO;
    toggleRevealHints();
  });
}
