import { HexCoordinate, Card, CardType } from './types';

// Hexagon Layout Constants
export const HEX_SIZE = 35;

export const hexToPixel = (hex: HexCoordinate) => {
  const x = HEX_SIZE * (3 / 2) * hex.q;
  const y = HEX_SIZE * Math.sqrt(3) * (hex.r + hex.q / 2);
  return { x, y };
};

export const getHexNeighbors = (hex: HexCoordinate): HexCoordinate[] => {
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];
  return directions.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
};

export const areHexesEqual = (h1: HexCoordinate, h2: HexCoordinate) => {
  return h1.q === h2.q && h1.r === h2.r;
};

export const getDistance = (a: HexCoordinate, b: HexCoordinate) => {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

export const generateDeck = (): Card[] => {
  const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as const;
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  suits.forEach(suit => {
    ranks.forEach(rank => {
      let value = 0;
      let type = CardType.NUMBER;

      if (['J', 'Q', 'K'].includes(rank)) {
        type = CardType.FACE;
      } else if (rank === 'A') {
        type = CardType.ACE;
        value = 11;
      } else {
        value = parseInt(rank);
      }

      deck.push({ suit, rank, value, type });
    });
  });

  // Add Jokers
  deck.push({ suit: 'JOKER', rank: 'Joker', value: 0, type: CardType.JOKER });
  deck.push({ suit: 'JOKER', rank: 'Joker', value: 0, type: CardType.JOKER });

  // Shuffle
  return deck.sort(() => Math.random() - 0.5);
};

export const coordToString = (hex: HexCoordinate) => `${hex.q},${hex.r}`;

export const stringToCoord = (str: string): HexCoordinate => {
  const [q, r] = str.split(',').map(Number);
  return { q, r };
};
