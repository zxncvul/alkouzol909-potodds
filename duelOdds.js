// duelOdds.js
// Funciones para calcular outs (solo versión básica para outsBasic.js)

import { getBestHand } from './handEvaluator.js';

// Define a hierarchy for hand types. Higher values mean stronger hands.
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
 * Computes a numeric score for a hand, ignoring kicker information. The score
 * encodes the hand category and the primary and secondary ranks. Higher
 * scores correspond to stronger hands. Kickers are intentionally ignored
 * because improvements due solely to kicker differences should not count as
 * outs.
 *
 * @param {object} hand - The hand object returned by getBestHand().
 * @returns {number} A numeric strength value.
 */
function handScore(hand) {
  const typeVal = TYPE_STRENGTH[hand.type] || 0;
  const primaryVal = (hand.primary ?? 0);
  const secondaryVal = (hand.secondary ?? 0);
  // Multiply by large factors to ensure type dominates over primary and secondary.
  return typeVal * 10000 + primaryVal * 100 + secondaryVal;
}

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['\u2660','\u2665','\u2666','\u2663'];
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
  const currentScore = handScore(currentHero);
  const outs = [];

  for (const card of remaining) {
    // Simulate adding this card to the board (either turn or river).
    const simulatedBoard = [...board, card];
    if (simulatedBoard.length > 5) continue;

    const heroHand = getBestHand([...hero, ...simulatedBoard]);
    const newScore = handScore(heroHand);
    // Consider this card an out only if it strictly improves the hand's strength.
    if (newScore > currentScore) {
      outs.push(card);
    }
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
