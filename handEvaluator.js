// Módulo para evaluar manos de póker: getBestHand, findStraight y compareHands

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];

/**
 * Selecciona cartas únicas para una secuencia de rangos dada.
 * @param {string[]} seq - Rangos de la secuencia (ej. ['T', 'J', 'Q', 'K', 'A'])
 * @param {string[]} availableCards - Lista de cartas disponibles
 * @returns {string[]} - Cartas únicas correspondientes a la secuencia
 */
function pickCardsForSequence(seq, availableCards) {
  const cards = [];
  const poolCopy = [...availableCards];
  seq.forEach(r => {
    const idx = poolCopy.findIndex(c => c[0] === r);
    if (idx >= 0) cards.push(poolCopy.splice(idx, 1)[0]);
  });
  return cards;
}

/**
 * Devuelve la mejor mano posible de 5 cartas a partir de una lista de cartas.
 * @param {string[]} cards - Array de cartas (ej. ['A♠', 'K♠', 'Q♦', 'J♣', 'T♣'])
 * @returns {object} - Objeto con {type, primary, secondary, kickers, label, cards}
 */
export function getBestHand(cards) {
  const pool = [...cards];
  const byRank = {}, bySuit = {};
  pool.forEach(c => {
    const r = c[0], s = c[1];
    byRank[r] = (byRank[r] || []).concat(c);
    bySuit[s] = (bySuit[s] || []).concat(c);
  });

  // 1) Straight-flush (incluye Royal)
  for (const s of SUITS) {
    if ((bySuit[s] || []).length >= 5) {
      const seq = findStraight(bySuit[s].map(c => c[0]));
      if (seq) {
        const isRoyal = seq.join('') === 'TJQKA';
        const high = isRoyal ? 'A' : seq[4];
        return {
          type: 'straight-flush',
          primary: RANKS.indexOf(high),
          secondary: 0,
          kickers: [],
          label: isRoyal ? 'Royal Flush' : `Escalera de color al ${high}`,
          cards: pickCardsForSequence(seq, bySuit[s])
        };
      }
    }
  }

  // 2) Flush
  for (const s of SUITS) {
    if ((bySuit[s] || []).length >= 5) {
      const top5 = [...bySuit[s]]
        .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
        .slice(0, 5);
      return {
        type: 'flush',
        primary: RANKS.indexOf(top5[0][0]),
        secondary: 0,
        kickers: top5.slice(1).map(c => RANKS.indexOf(c[0])),
        label: `Color, ${top5[0][0]} high`,
        cards: top5
      };
    }
  }

  // 3) Straight
  {
    const allRanks = cards.map(c => c[0]);
    const straightSeq = findStraight(allRanks);
    if (straightSeq) {
      const isWheel = straightSeq.join('') === 'A2345';
      const high = isWheel ? '5' : straightSeq[4];
      const kickers = pool
        .filter(c => !straightSeq.includes(c[0]))
        .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
        .map(c => RANKS.indexOf(c[0]))
        .slice(0, 3);
      return {
        type: 'straight',
        primary: RANKS.indexOf(high),
        secondary: 0,
        kickers,
        label: `Escalera al ${high}`,
        cards: pickCardsForSequence(straightSeq, pool)
      };
    }
  }

  // 4) Multiples: quads, full, trio, two pair, pair
  const groups = Object.entries(byRank)
    .map(([r, cs]) => ({ rank: r, cards: cs }))
    .sort((a, b) => b.cards.length - a.cards.length || RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank));

  // Quads
  if (groups[0].cards.length === 4) {
    const quad = groups[0].cards.slice();
    const kicker = pool
      .filter(c => !quad.includes(c))
      .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))[0];
    return {
      type: 'quads',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: 0,
      kickers: [RANKS.indexOf(kicker[0])],
      label: `Póker de ${groups[0].rank}`,
      cards: [...quad, kicker]
    };
  }

  // Full House
  if (groups[0].cards.length === 3 && (groups[1] || {}).cards.length >= 2) {
    const three = groups[0].cards.slice();
    const pair = groups[1].cards.slice(0, 2);
    return {
      type: 'full',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: RANKS.indexOf(groups[1].rank),
      kickers: [],
      label: `Full de ${groups[0].rank} con ${groups[1].rank}`,
      cards: [...three, ...pair]
    };
  }

  // Trio
  if (groups[0].cards.length === 3) {
    const three = groups[0].cards.slice();
    const kickers = pool
      .filter(c => !three.includes(c))
      .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
      .slice(0, 2);
    return {
      type: 'trio',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: 0,
      kickers: kickers.map(c => RANKS.indexOf(c[0])),
      label: `Trío de ${groups[0].rank}`,
      cards: [...three, ...kickers]
    };
  }

  // Doble pareja
  if (groups[0].cards.length === 2 && (groups[1] || {}).cards.length === 2) {
    const p1 = groups[0].cards.slice();
    const p2 = groups[1].cards.slice();
    const kicker = pool
      .filter(c => !p1.includes(c) && !p2.includes(c))
      .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))[0];
    return {
      type: 'twopair',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: RANKS.indexOf(groups[1].rank),
      kickers: [RANKS.indexOf(kicker[0])],
      label: `Doble par de ${groups[0].rank} y ${groups[1].rank}`,
      cards: [...p1, ...p2, kicker]
    };
  }

  // Pareja
  if (groups[0].cards.length === 2) {
    const pair = groups[0].cards.slice();
    const kickers = pool
      .filter(c => !pair.includes(c))
      .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
      .slice(0, 3);
    return {
      type: 'pair',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: 0,
      kickers: kickers.map(c => RANKS.indexOf(c[0])),
      label: `Par de ${groups[0].rank}`,
      cards: [...pair, ...kickers]
    };
  }

  // Carta alta
  const top5 = pool
    .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
    .slice(0, 5);
  return {
    type: 'high',
    primary: RANKS.indexOf(top5[0][0]),
    secondary: 0,
    kickers: top5.slice(1).map(c => RANKS.indexOf(c[0])),
    label: `Carta alta ${top5[0][0]}`,
    cards: top5
  };
}

/**
 * Encuentra una secuencia de 5 cartas consecutivas (escalera) en un array de rangos.
 */
export function findStraight(ranks) {
  const idxs = Array.from(new Set(ranks))
    .map(r => RANKS.indexOf(r))
    .sort((a, b) => a - b);
  const ACE_LOW = -1;
  if (idxs.includes(12)) idxs.unshift(ACE_LOW); // A-2-3-4-5

  for (let i = 0; i <= idxs.length - 5; i++) {
    let seq = [idxs[i]];
    for (let j = i + 1; j < idxs.length && seq.length < 5; j++) {
      if (idxs[j] === seq[seq.length - 1] + 1) seq.push(idxs[j]);
      else if (idxs[j] > seq[seq.length - 1] + 1) break;
    }
    if (seq.length === 5) return seq.map(i => i === -1 ? 'A' : RANKS[i]);
  }
  return null;
}

/**
 * Compara dos manos devueltas por getBestHand.
 * Retorna >0 si a > b, 0 si igual, <0 si a < b.
 */
export function compareHands(a, b) {
  const order = ['high','pair','twopair','trio','straight','flush','full','quads','straight-flush'];
  if (a.type !== b.type) return order.indexOf(a.type) - order.indexOf(b.type);
  if (a.primary !== b.primary) return a.primary - b.primary;
  if ((a.secondary || 0) !== (b.secondary || 0)) return (a.secondary || 0) - (b.secondary || 0);
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const ak = a.kickers[i] || 0;
    const bk = b.kickers[i] || 0;
    if (ak !== bk) return ak - bk;
  }
  return 0;
}
