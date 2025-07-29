/**
 * numaKeypad.js
 * Teclado numérico para escribir en los campos de equity (Necesaria, Turn, River).
 * Actualiza dinámicamente las etiquetas N: T: R: con conversión porcentaje ↔ ratio.
 */

let currentTarget = null; // Input actualmente seleccionado

/**
 * Crea el keypad y lo integra con los campos de equity.
 */
export function createNumericKeypad(containerId = 'bottom-controls') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Eliminar keypad previo si existe
  const oldKeypad = document.getElementById('numa-keypad');
  if (oldKeypad) oldKeypad.remove();

  const keypad = document.createElement('div');
  keypad.id = 'numa-keypad';
  keypad.className = 'numa-keypad';

  // Filas de teclas
  const keys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', ',', '←']
  ];

  keys.forEach(rowKeys => {
    const row = document.createElement('div');
    row.className = 'numa-row';
    rowKeys.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'numa-btn';
      btn.textContent = key;
      btn.dataset.key = key;
      row.appendChild(btn);
    });
    keypad.appendChild(row);
  });

  container.appendChild(keypad);

  // Listeners para los botones del keypad
  keypad.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    const key = e.target.dataset.key;
    if (!currentTarget) return;

    if (key === 'C') {
      currentTarget.value = '';
    } else if (key === '←') {
      currentTarget.value = currentTarget.value.slice(0, -1);
    } else if (key === ',') {
      if (!currentTarget.value.includes(',')) {
        currentTarget.value += ',';
      }
    } else {
      currentTarget.value += key; // Añadir número, %, o :
    }

    // Actualizar cursor y etiquetas
    updateCursorPosition();
    updateInlineEquity();
    currentTarget.dispatchEvent(new Event('input'));
  });
}

/**
 * Vincula el keypad a los inputs de equity.
 * Llama a esta función después de renderEquityRow().
 */
export function attachKeypadToEquity() {
  const inputs = [
    document.getElementById('equity-needed'),
    document.getElementById('equity-turn'),
    document.getElementById('equity-river')
  ];

  inputs.forEach(input => {
    if (!input) return;
    input.readOnly = true; // Solo puede escribirse con keypad
    input.addEventListener('focus', () => setFocusedInput(input, inputs));
    input.addEventListener('click', () => input.focus());
  });

  // Foco inicial en "Necesaria"
  if (inputs[0]) {
    inputs[0].focus();
    const wrapper = inputs[0].closest('.cursor-wrapper');
    if (wrapper) wrapper.classList.add('focused');
    currentTarget = inputs[0];
    updateCursorPosition();
    updateInlineEquity();
  }

  // Crear keypad
  createNumericKeypad();
}

/**
 * Cambia el input que tiene el cursor parpadeante.
 */
function setFocusedInput(input, inputs) {
  document.querySelectorAll('.cursor-wrapper').forEach(w => w.classList.remove('focused'));
  const wrapper = input.closest('.cursor-wrapper');
  if (wrapper) wrapper.classList.add('focused');
  currentTarget = input;
  updateCursorPosition();
  updateInlineEquity();
}

/**
 * Actualiza la posición del cursor parpadeante.
 */
function updateCursorPosition() {
  if (!currentTarget) return;
  const wrapper = currentTarget.closest('.cursor-wrapper');
  if (!wrapper) return;

  const length = currentTarget.value.length;
  wrapper.style.setProperty('--cursor-offset', `${length}ch`);
}

/**
 * Convierte valores entre porcentaje y ratio (2:1).
 */
function convertEquityValue(value) {
  if (!value) return '--';

  // Detectar ratio tipo "2:1"
  if (value.includes(':')) {
    const parts = value.split(':').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] !== 0) {
      const percent = (parts[1] / (parts[0] + parts[1])) * 100;
      return `≈ ${Math.round(percent)}%`;
    }
  }

  // Detectar porcentaje tipo "33" o "33%"
  const numeric = parseFloat(value.replace('%', '').trim());
  if (!isNaN(numeric) && numeric > 0) {
    const ratio = (100 / numeric) - 1;
    return `≈ ${ratio.toFixed(1)}:1`; // Un decimal para ratios
  }

  return '--';
}

/**
 * Actualiza las etiquetas N:, T:, R: al lado de los contadores con conversión.
 */
function updateInlineEquity() {
  const neededVal = document.getElementById('equity-needed')?.value || '';
  const turnVal = document.getElementById('equity-turn')?.value || '';
  const riverVal = document.getElementById('equity-river')?.value || '';

  const inlineNeeded = document.getElementById('inline-needed');
  const inlineTurn = document.getElementById('inline-turn');
  const inlineRiver = document.getElementById('inline-river');

  if (inlineNeeded) inlineNeeded.textContent = `N: ${convertEquityValue(neededVal)}`;
  if (inlineTurn) inlineTurn.textContent = `T: ${convertEquityValue(turnVal)}`;
  if (inlineRiver) inlineRiver.textContent = `R: ${convertEquityValue(riverVal)}`;
}
