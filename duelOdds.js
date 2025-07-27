// duelOdds.js
// Funciones para calcular outs (solo versión básica para outsBasic.js)

import { getBestHand, compareHands } from './handEvaluator.js';

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];

/**
 * Devuelve la lista de outs que mejoran la mano de Hero (sin villano).
 * @param {string[]} hero  - Cartas del héroe (2 cartas)
 * @param {string[]} board - Cartas del board (3 o 4 cartas)
 * @returns {string[]} Lista de cartas (outs)
 */
export function getEffectiveOuts(hero, board) {
  const deck = buildDeck();
  const used = new Set([...hero, ...board]);
  const remaining = deck.filter(c => !used.has(c));

  const currentHero = getBestHand([...hero, ...board]);
  const outs = [];

  for (const card of remaining) {
    const simulatedBoard = [...board, card];
    if (simulatedBoard.length > 5) continue;

    const heroHand = getBestHand([...hero, ...simulatedBoard]);
    const heroImproves = compareHands(heroHand, currentHero) > 0;

    if (heroImproves) outs.push(card);
  }
  return outs;
}


/**
 * Genera el mazo completo de 52 cartas.
 * @returns {string[]} Todas las cartas del mazo.
 */
function buildDeck() {
  return RANKS.flatMap(r => SUITS.map(s => r + s));
}
