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
 * Inserta un carácter (por ejemplo ':' o '%') en el input actualmente
 * seleccionado mediante el keypad. Si ya existe ese carácter en la
 * cadena, no se inserta de nuevo. Esto se utiliza para los botones
 * externos de ':' y '%' en la barra de acción.
 * @param {string} char Caracter a insertar
 */
export function appendCharToCurrentTarget(char) {
  if (!currentTarget || typeof char !== 'string') return;
  // Evitar insertar múltiples porcentajes o dos puntos
  if (char === ':' && currentTarget.value.includes(':')) return;
  if (char === '%' && currentTarget.value.includes('%')) return;
  currentTarget.value += char;
  updateCursorPosition();
  updateInlineEquity();
  currentTarget.dispatchEvent(new Event('input'));
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
 * Permite asociar el keypad numérico a un campo arbitrario. El campo
 * quedará en modo solo lectura y al recibir foco se convertirá en
 * el destino actual del keypad. Úsalo para inputs como los de pot y
 * apuesta en el modo calculadora del enunciado.
 * @param {HTMLInputElement} input Input de texto a vincular al keypad
 */
export function attachKeypadToInput(input) {
  if (!input) return;
  input.readOnly = true;
  input.addEventListener('focus', () => {
    currentTarget = input;
    // Colocar cursor al final; updateCursorPosition se encargará de ello
    updateCursorPosition();
  });
  // Al hacer clic se enfoca el input (similar a equity)
  input.addEventListener('click', () => input.focus());
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

  // Convertir coma a punto y limpiar espacios
  const cleaned = value.replace(',', '.').trim();
  // Detectar ratio tipo "2:1" sólo si el usuario ha escrito ':'
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] !== 0) {
      const percent = (parts[1] / (parts[0] + parts[1])) * 100;
      return `≈ ${Math.round(percent)}%`;
    }
    return '--';
  }
  // Detectar porcentaje sólo si el usuario ha escrito '%'
  if (cleaned.includes('%')) {
    const numeric = parseFloat(cleaned.replace('%', ''));
    if (!isNaN(numeric) && numeric > 0) {
      const ratio = (100 / numeric) - 1;
      return `≈ ${ratio.toFixed(1)}:1`;
    }
    return '--';
  }
  // Si no hay ':' ni '%', se considera que el usuario aún no ha indicado el formato; no se convierte
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

  // Mostrar conversiones independientes para cada campo. Si un valor
  // contiene ':' se convierte a porcentaje; si contiene '%' se
  // convierte a ratio, y si no contiene ninguno se muestra '--'.
  if (inlineNeeded) inlineNeeded.textContent = `N: ${convertEquityValue(neededVal)}`;
  if (inlineTurn) inlineTurn.textContent = `T: ${convertEquityValue(turnVal)}`;
  if (inlineRiver) inlineRiver.textContent = `R: ${convertEquityValue(riverVal)}`;
}
