
export enum TerrainType {
  GRASS = 'GRASS',
  FOREST = 'FOREST', // Bear Spawn
  RIVER = 'RIVER', // Impassable without bridge
  BRIDGE = 'BRIDGE',
  ORCHARD = 'ORCHARD', // Get Apples
  SHELTER = 'SHELTER', // Win condition
  TREASURE = 'TREASURE', // Get Joker
  START = 'START', // Player Spawn
  MOUNTAIN = 'MOUNTAIN', // Impassable obstacle
  PLAINS = 'PLAINS' // Open meadow
}

export enum CardType {
  NUMBER = 'NUMBER',
  FACE = 'FACE', // Attack/Defend
  ACE = 'ACE', // Kill
  JOKER = 'JOKER' // Treasure Map
}

export interface Card {
  suit: 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES' | 'JOKER';
  rank: string;
  value: number; // For apples
  type: CardType;
}

export interface HexCoordinate {
  q: number;
  r: number;
}

export interface Entity {
  id: string;
  type: 'PLAYER' | 'BEAR';
  name: string;
  position: HexCoordinate;
  hp: number;
  maxHp: number;
  isDead: boolean;
}

export interface Player extends Entity {
  type: 'PLAYER';
  apples: number;
  inventory: Card[];
  hasTreasureMap: boolean;
  hasClaimedTreasure: boolean;
  color: string;
  isBot?: boolean;
}

export interface Bear extends Entity {
  type: 'BEAR';
}

export interface VisualEffect {
  id: number;
  position: HexCoordinate;
  type: 'SLASH' | 'CLAW' | 'HEAL' | 'GOLD' | 'EXPLOSION';
}

export interface LootDrop {
  id: string;
  position: HexCoordinate;
  apples: number;
  cards: Card[];
  hasTreasure?: boolean; // New: Can drop the royal treasure status
}

export interface GameState {
  gameStatus: 'SETUP' | 'PLAYING' | 'GAME_OVER'; // Added SETUP phase
  players: Player[];
  bears: Bear[];
  loot: LootDrop[];
  brokenBridges: HexCoordinate[]; // Track destroyed bridges
  currentPlayerIndex: number; // -1 or > players.length could denote Bear turn
  turnPhase: 'ROLL' | 'MOVE' | 'ACTION' | 'BEAR_TURN';
  diceValue: number;
  gameLog: string[];
  winner: Player | null;
  turnCount: number;
}
