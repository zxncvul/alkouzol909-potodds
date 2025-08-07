// ranking.js (modular unificado)
import { createNumericKeypad } from './numaKeypad.js';

let equityInput = null;

/**
 * Renderiza un campo de entrada para la equity en el contenedor indicado.
 * @param {string} containerId - ID del contenedor donde insertar el input.
 */
export function renderEquityInput(containerId = 'bottom-controls') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Si ya existe, lo eliminamos
  const existing = document.getElementById('equity-input');
  if (existing) existing.remove();

  const input = document.createElement('input');
  input.id = 'equity-input';
  input.type = 'text';
  input.placeholder = '%';
  input.inputMode = 'decimal';
  input.maxLength = 5;
  input.className = 'ranking-input';
  container.appendChild(input);

  equityInput = input;
  createNumericKeypad(input);
}

/**
 * Valida que el valor introducido esté dentro de ±0.5% de la equity requerida.
 * @param {number} requiredEquity - Valor de equity objetivo.
 * @returns {boolean} true si está dentro del margen de error.
 */
export function validateEquityInput(requiredEquity) {
  if (!equityInput) return false;
  const value = parseFloat(equityInput.value.replace(',', '.'));
  if (isNaN(value)) return false;

  const diff = Math.abs(value - requiredEquity);
  return diff <= 0.5; // Margen de ±0.5%
}
