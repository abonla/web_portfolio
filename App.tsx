
import React, { useState, useEffect, useRef } from 'react';
import { 
  GameState, Player, Bear, TerrainType, HexCoordinate, CardType, Card, Entity, VisualEffect, LootDrop 
} from './types';
import { 
  MAP_DATA, SPAWN_POINT, BEAR_SPAWN_POINT, TREASURE_BEAR_SPAWN, TERRAIN_PROPERTIES 
} from './constants';
import { 
  getHexNeighbors, areHexesEqual, generateDeck, coordToString, 
  getDistance 
} from './utils';
import HexBoard from './components/HexBoard';
import { 
  Dices, Swords, Skull, Apple, Scroll, Play, RefreshCw, Trophy, AlertTriangle, Heart, Crown, Tent, ScrollText, Volume2, VolumeX, Coins, BookOpen, User, Flame
} from 'lucide-react';

// --- Sound Synthesizer (Web Audio API) ---
class SoundSynth {
  ctx: AudioContext | null = null;
  enabled: boolean = false;
  bgmNodes: AudioNode[] = [];
  isBgmPlaying: boolean = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
        this.init();
        this.resume();
        this.startBgm();
    } else {
        this.stopBgm();
    }
    return this.enabled;
  }

  startBgm() {
    if (!this.enabled || !this.ctx || this.isBgmPlaying) return;
    this.resume();

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0; 
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400; 

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.03;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start();

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 100;
    
    const oscGain = this.ctx.createGain();
    oscGain.gain.value = 0.05;
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start();

    this.bgmNodes = [noise, noiseFilter, noiseGain, osc, oscGain];
    this.isBgmPlaying = true;
  }

  stopBgm() {
    this.bgmNodes.forEach(node => {
        try { (node as any).stop?.(); } catch(e){}
        node.disconnect();
    });
    this.bgmNodes = [];
    this.isBgmPlaying = false;
  }

  playDice() { if (this.enabled) { this.playNoise(0.2); setTimeout(() => this.playNoise(0.2), 100); setTimeout(() => this.playNoise(0.3), 250); } }
  playStep() { this.playTone(600, 'sine', 0.05, 0.05); }
  playCard() { this.playTone(1200, 'sine', 0.1, 0.05); setTimeout(() => this.playTone(1600, 'sine', 0.2, 0.05), 50); }
  playError() { this.playTone(150, 'sawtooth', 0.3, 0.1); setTimeout(() => this.playTone(120, 'sawtooth', 0.3, 0.1), 150); }
  playSlash() { this.playNoise(0.15); this.playTone(200, 'sawtooth', 0.1, 0.1); }
  playGrowl() { this.playTone(80, 'sawtooth', 0.4, 0.2); setTimeout(() => this.playTone(60, 'square', 0.4, 0.2), 100); }
  playDamage() { this.playTone(100, 'square', 0.1, 0.2); }
  playDeath() { this.playTone(150, 'sawtooth', 0.3, 0.2); setTimeout(() => this.playTone(100, 'sawtooth', 0.4, 0.2), 200); }
  playWin() { const notes = [523.25, 659.25, 783.99, 1046.50]; notes.forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.4, 0.1), i * 150)); }
  playLoot() { this.playTone(1500, 'sine', 0.1, 0.1); setTimeout(() => this.playTone(2000, 'sine', 0.1, 0.1), 100); }
  playHeal() { this.playTone(440, 'sine', 0.3, 0.05); setTimeout(() => this.playTone(554, 'sine', 0.3, 0.05), 150); setTimeout(() => this.playTone(659, 'sine', 0.6, 0.05), 300); }
  playExplosion() { this.playNoise(0.4, 'brown'); this.playTone(100, 'sawtooth', 0.3, 0.3, false); }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1, ramp = true) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    if (ramp) {
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    } else {
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, type: 'white' | 'brown' = 'white') {
     if (!this.enabled || !this.ctx) return;
     if (this.ctx.state === 'suspended') this.ctx.resume();

     const bufferSize = this.ctx.sampleRate * duration;
     const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
     const data = buffer.getChannelData(0);
     for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
     }
     const noise = this.ctx.createBufferSource();
     noise.buffer = buffer;
     const gain = this.ctx.createGain();
     gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
     gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
     noise.connect(gain);
     gain.connect(this.ctx.destination);
     noise.start();
  }
}

const sfx = new SoundSynth();

const getInitialPlayers = (count: number): Player[] => {
    const players: Player[] = [
        { id: 'p1', type: 'PLAYER', name: '小紅帽', position: SPAWN_POINT, hp: 2, maxHp: 2, isDead: false, apples: 0, inventory: [], hasTreasureMap: false, hasClaimedTreasure: false, color: '#ef4444' }, 
        { id: 'p2', type: 'PLAYER', name: '大富豪', position: SPAWN_POINT, hp: 3, maxHp: 3, isDead: false, apples: 0, inventory: [], hasTreasureMap: false, hasClaimedTreasure: false, color: '#3b82f6' }, 
        { id: 'p3', type: 'PLAYER', name: '大臣', position: SPAWN_POINT, hp: 2, maxHp: 2, isDead: false, apples: 0, inventory: [], hasTreasureMap: false, hasClaimedTreasure: false, color: '#b45309' }, 
    ];
    if (count >= 4) {
        players.push({ id: 'p4', type: 'PLAYER', name: '獵人', position: SPAWN_POINT, hp: 3, maxHp: 3, isDead: false, apples: 0, inventory: [], hasTreasureMap: false, hasClaimedTreasure: false, color: '#15803d' });
    }
    if (count >= 5) {
        players.push({ id: 'p5', type: 'PLAYER', name: '村長', position: SPAWN_POINT, hp: 2, maxHp: 2, isDead: false, apples: 0, inventory: [], hasTreasureMap: false, hasClaimedTreasure: false, color: '#581c87' });
    }
    return players;
}

const INITIAL_BEARS: Bear[] = [
  { id: 'b1', type: 'BEAR', name: '大壞熊', position: BEAR_SPAWN_POINT, hp: 6, maxHp: 6, isDead: false },
  { id: 'b2', type: 'BEAR', name: '寶藏守護熊', position: TREASURE_BEAR_SPAWN, hp: 4, maxHp: 4, isDead: false },
];

export default function App() {
  const [deck, setDeck] = useState<Card[]>(generateDeck());
  const [gameState, setGameState] = useState<GameState>({
    gameStatus: 'SETUP',
    players: [], 
    bears: JSON.parse(JSON.stringify(INITIAL_BEARS)),
    loot: [],
    brokenBridges: [],
    currentPlayerIndex: 0,
    turnPhase: 'ROLL',
    diceValue: 0,
    gameLog: ['請選擇玩家人數開始遊戲...'],
    winner: null,
    turnCount: 1,
  });

  const [reachableHexes, setReachableHexes] = useState<HexCoordinate[]>([]);
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true); 
  const [showRules, setShowRules] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioInitialized = useRef(false);

  // New: 1P / 2P mode support
  const [botConfig, setBotConfig] = useState<{ humanCount: number, isSinglePlayer: boolean }>({ humanCount: 0, isSinglePlayer: false });

  useEffect(() => {
    const handleInteraction = () => {
        if (!audioInitialized.current) {
            sfx.init();
            sfx.enabled = true; 
            audioInitialized.current = true;
            sfx.startBgm();
        }
        sfx.resume();
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  useEffect(() => {
    sfx.enabled = soundEnabled;
    if (soundEnabled && audioInitialized.current) {
        sfx.startBgm();
    } else {
        sfx.stopBgm();
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.gameLog]);

  // Bot Logic
  useEffect(() => {
    if (gameState.gameStatus === 'PLAYING' && gameState.turnPhase === 'ROLL') {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer && currentPlayer.isBot && !currentPlayer.isDead) {
            // Bot Roll Delay
            const timer = setTimeout(() => {
                rollDice();
            }, 1000);
            return () => clearTimeout(timer);
        }
    } else if (gameState.gameStatus === 'PLAYING' && gameState.turnPhase === 'MOVE') {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer && currentPlayer.isBot && !currentPlayer.isDead) {
            // Bot Move Logic
            const timer = setTimeout(() => {
                if (reachableHexes.length > 0) {
                    const randomMove = reachableHexes[Math.floor(Math.random() * reachableHexes.length)];
                    handleHexClick(randomMove);
                }
                // After move, bot automatically ends turn if in action phase
            }, 1000);
            return () => clearTimeout(timer);
        }
    } else if (gameState.gameStatus === 'PLAYING' && gameState.turnPhase === 'ACTION') {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer && currentPlayer.isBot && !currentPlayer.isDead) {
            const timer = setTimeout(() => {
                endTurn();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }
  }, [gameState.turnPhase, gameState.currentPlayerIndex, reachableHexes, gameState.gameStatus]);


  const startGame = (totalPlayers: number, humanCount: number) => {
      sfx.playWin(); // Sound feedback
      const players = getInitialPlayers(totalPlayers);
      
      // Set Bots
      players.forEach((p, index) => {
          if (index >= humanCount) {
              p.isBot = true;
              p.name += " (電腦)";
          }
      });

      setGameState({
          gameStatus: 'PLAYING',
          players: players,
          bears: JSON.parse(JSON.stringify(INITIAL_BEARS)),
          loot: [],
          brokenBridges: [],
          currentPlayerIndex: 0,
          turnPhase: 'ROLL',
          diceValue: 0,
          gameLog: [`遊戲開始！共有 ${totalPlayers} 位勇者 (${humanCount} 位玩家) 進入果園。`],
          winner: null,
          turnCount: 1
      });
  };

  const toggleSound = () => {
      const isEnabled = sfx.toggle();
      setSoundEnabled(isEnabled);
  };

  const triggerVisualEffect = (position: HexCoordinate, type: VisualEffect['type']) => {
      const id = Date.now();
      setVisualEffects(prev => [...prev, { id, position, type }]);
      setTimeout(() => {
          setVisualEffects(prev => prev.filter(e => e.id !== id));
      }, 1000);
  };

  const addLog = (msg: string) => {
    setGameState(prev => ({ ...prev, gameLog: [...prev.gameLog, `第 ${prev.turnCount} 頁: ${msg}`] }));
  };

  const resetGame = () => {
    setDeck(generateDeck());
    setGameState({
        gameStatus: 'SETUP',
        players: [],
        bears: JSON.parse(JSON.stringify(INITIAL_BEARS)),
        loot: [],
        brokenBridges: [],
        currentPlayerIndex: 0,
        turnPhase: 'ROLL',
        diceValue: 0,
        gameLog: ['遊戲重置。請選擇人數。'],
        winner: null,
        turnCount: 1,
    });
    setReachableHexes([]);
    setVisualEffects([]);
  };

  const rollDice = () => {
    sfx.playDice();
    const roll = Math.floor(Math.random() * 6) + 1;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    addLog(`${currentPlayer.name} 擲出了 ${roll} 點。`);
    
    const moves = calculateMovesList(roll, currentPlayer.position);
    
    if (moves.length === 0) {
        addLog(`...但是被困住了！回合跳過。`);
        // If it's a bot, we need to ensure endTurn is called or phase advanced properly
        setGameState(prev => ({ ...prev, diceValue: roll, turnPhase: 'ACTION' })); 
    } else {
        setGameState(prev => ({ ...prev, diceValue: roll, turnPhase: 'MOVE' }));
        setReachableHexes(moves);
    }
  };

  const calculateMovesList = (moves: number, startPos: HexCoordinate) => {
    const queue: { coord: HexCoordinate; rem: number }[] = [{ coord: startPos, rem: moves }];
    const visited = new Set<string>();
    const reachable: HexCoordinate[] = [];

    visited.add(coordToString(startPos));

    while (queue.length > 0) {
      const { coord, rem } = queue.shift()!;
      
      if (!areHexesEqual(coord, startPos)) {
        reachable.push(coord);
      }
      
      if (rem <= 0) continue;

      const neighbors = getHexNeighbors(coord);
      for (const n of neighbors) {
        const nStr = coordToString(n);
        let terrain = MAP_DATA.get(nStr);
        if (!terrain) continue; // Out of bounds

        // Check for Broken Bridge -> converts to River effectively
        const isBroken = gameState.brokenBridges.some(b => areHexesEqual(b, n));
        if (terrain === TerrainType.BRIDGE && isBroken) {
            terrain = TerrainType.RIVER; 
        }

        // Get Terrain Properties
        const props = TERRAIN_PROPERTIES[terrain];
        
        // Impassable check
        if (props.impassable) continue;

        // Move Cost check
        const cost = props.cost;
        if (rem - cost < 0) continue;

        if (!visited.has(nStr)) {
          visited.add(nStr);
          queue.push({ coord: n, rem: rem - cost });
        }
      }
    }
    return reachable;
  };

  const collectLootAtHex = (player: Player, hex: HexCoordinate, currentLoot: LootDrop[]): { updatedPlayer: Player, remainingLoot: LootDrop[], log: string } => {
      const lootOnHex = currentLoot.filter(l => areHexesEqual(l.position, hex));
      let updatedPlayer = { ...player };
      let remainingLoot = currentLoot.filter(l => !areHexesEqual(l.position, hex));
      let logMsg = "";

      if (lootOnHex.length > 0) {
          let collectedApples = 0;
          let collectedCards: Card[] = [];
          let claimedTreasure = false;
          
          lootOnHex.forEach(l => {
              collectedApples += l.apples;
              collectedCards = [...collectedCards, ...l.cards];
              if (l.hasTreasure) claimedTreasure = true;
          });

          // Check if collected items include Joker
          if (collectedCards.some(c => c.type === CardType.JOKER)) {
              updatedPlayer.hasTreasureMap = true;
              logMsg += ` 撿起了破舊的地圖！`;
          }

          if (claimedTreasure) {
              updatedPlayer.hasClaimedTreasure = true;
              logMsg += ` 拾取了掉落的皇家寶藏！`;
              sfx.playWin();
          }

          updatedPlayer.apples += collectedApples;
          updatedPlayer.inventory = [...updatedPlayer.inventory, ...collectedCards];
          
          logMsg += ` 發現了一個背包，裡面有 ${collectedApples} 個蘋果和 ${collectedCards.length} 件物品！`;
          sfx.playLoot();
          triggerVisualEffect(hex, 'GOLD');
      }

      return { updatedPlayer, remainingLoot, log: logMsg };
  };

  const destroyBridge = (bridgeHex: HexCoordinate) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const faceCardIndex = currentPlayer.inventory.findIndex(c => c.type === CardType.FACE);
    
    if (faceCardIndex === -1) {
        addLog('你需要一張人頭牌 (Face) 才能破壞橋樑！');
        return;
    }

    const newInventory = [...currentPlayer.inventory];
    newInventory.splice(faceCardIndex, 1);
    
    const newBrokenBridges = [...gameState.brokenBridges, bridgeHex];
    const newPlayers = [...gameState.players];
    newPlayers[gameState.currentPlayerIndex] = { ...currentPlayer, inventory: newInventory };

    sfx.playExplosion();
    triggerVisualEffect(bridgeHex, 'EXPLOSION');
    addLog(`${currentPlayer.name} 破壞了橋樑！`);

    setGameState(prev => ({
        ...prev,
        players: newPlayers,
        brokenBridges: newBrokenBridges,
        turnPhase: 'ACTION'
    }));
  };

  const handleHexClick = (hex: HexCoordinate) => {
    if (gameState.turnPhase !== 'MOVE') return;

    sfx.playStep();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    let playerUpdate = { ...currentPlayer, position: hex };
    const lootResult = collectLootAtHex(playerUpdate, hex, gameState.loot);
    playerUpdate = lootResult.updatedPlayer;
    let lootUpdates = lootResult.remainingLoot;
    
    let logMsg = `${currentPlayer.name} 移動了。` + lootResult.log;

    const terrain = MAP_DATA.get(coordToString(hex));
    let nextPhase: GameState['turnPhase'] = 'ACTION';
    
    // Terrain Interaction Logic
    const terrainProps = terrain ? TERRAIN_PROPERTIES[terrain] : null;

    if (terrain === TerrainType.ORCHARD) {
      const card = drawCard();
      sfx.playCard();
      
      if (card.type === CardType.JOKER) {
          logMsg += ` 發現了一張破舊的地圖 (鬼牌)！`;
          playerUpdate.hasTreasureMap = true;
          playerUpdate.inventory.push(card);
          triggerVisualEffect(hex, 'GOLD');
      } else if (card.type === CardType.ACE) {
          logMsg += ` 找到了一把魔法劍 (Ace)！`;
          playerUpdate.inventory.push(card);
          triggerVisualEffect(hex, 'GOLD');
      } else if (card.type === CardType.FACE) {
          logMsg += ` 找到了一個盾牌 (${card.rank})。`;
          playerUpdate.inventory.push(card);
          triggerVisualEffect(hex, 'GOLD');
      } else {
          // Bonus Apple Logic
          const bonus = terrainProps?.appleBonus || 0;
          const totalValue = card.value + bonus;
          logMsg += ` 採集了 ${card.value}${bonus > 0 ? ` + ${bonus} (豐收)` : ''} 個金蘋果。`;
          playerUpdate.apples += totalValue;
          triggerVisualEffect(hex, 'GOLD');
      }
    } else if (terrain === TerrainType.TREASURE) {
       if (playerUpdate.hasTreasureMap) {
         if (!playerUpdate.hasClaimedTreasure) {
             logMsg += ` 打開了寶箱！奪得了皇家寶藏！快逃往庇護所！`;
             playerUpdate.hasClaimedTreasure = true;
             sfx.playWin();
             triggerVisualEffect(hex, 'GOLD');
         } else {
             logMsg += ` 正在守護寶藏。`;
         }
       } else {
         logMsg += ` 看見了寶箱，但沒有地圖 (鬼牌)。`;
         sfx.playError();
       }
    } else if (terrain === TerrainType.SHELTER) {
       logMsg += ` 抵達了高塔並搖響了警鐘！`;
       sfx.playWin();
       const winPlayers = [...gameState.players];
       winPlayers[gameState.currentPlayerIndex] = playerUpdate;
       checkWinCondition(winPlayers);
       setGameState(prev => ({ ...prev, players: winPlayers }));
       return;
    } else if (terrain === TerrainType.START) {
       if (playerUpdate.hp < playerUpdate.maxHp) {
           playerUpdate.hp = playerUpdate.maxHp;
           logMsg += ` 在營地休息並恢復了體力。`;
           sfx.playHeal();
           triggerVisualEffect(hex, 'HEAL');
       } else {
           logMsg += ` 正在營地休息。`;
       }
    }

    const newPlayers = [...gameState.players];
    newPlayers[gameState.currentPlayerIndex] = playerUpdate;

    addLog(logMsg);
    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      loot: lootUpdates,
      turnPhase: nextPhase
    }));
    setReachableHexes([]);
  };

  const drawCard = (): Card => {
    const newDeck = [...deck];
    if (newDeck.length === 0) {
      const reshuffled = generateDeck();
      setDeck(reshuffled); 
      return reshuffled[0];
    }
    const card = newDeck.pop()!;
    setDeck(newDeck);
    return card;
  };

  const checkWinCondition = (currentPlayers: Player[]) => {
    const treasureHolder = currentPlayers.find(p => p.hasClaimedTreasure);
    let winner: Player | null = null;
    let winReason = "";

    if (treasureHolder) {
        winner = treasureHolder;
        winReason = "奪得了皇家寶藏，是真正的英雄！";
    } else {
        const sorted = [...currentPlayers].sort((a, b) => b.apples - a.apples);
        winner = sorted[0];
        winReason = `搖響了警鐘！雖然沒有寶藏，但以 ${winner.apples} 個蘋果成為了最富有的人！`;
    }

    if (winner) {
        sfx.playWin();
        setGameState(prev => ({
            ...prev,
            winner: winner,
            gameStatus: 'GAME_OVER',
            gameLog: [...prev.gameLog, `遊戲結束。 ${winner ? winner.name : '沒人'} ${winReason}`]
        }));
    }
  };

  const endTurn = () => {
    let nextIndex = gameState.currentPlayerIndex + 1;
    // Find next living player (Wrap around logic)
    if (nextIndex >= gameState.players.length) {
        nextIndex = 0;
    }

    // Check if next player is dead, skip if so
    let loopCount = 0;
    while (gameState.players[nextIndex].isDead && loopCount < gameState.players.length) {
        nextIndex++;
        if (nextIndex >= gameState.players.length) nextIndex = 0;
        loopCount++;
    }

    if (gameState.currentPlayerIndex === gameState.players.length - 1 || (gameState.players[gameState.currentPlayerIndex].id === gameState.players[gameState.players.length-1].id)) {
        setGameState(prev => ({ ...prev, turnPhase: 'BEAR_TURN', currentPlayerIndex: -1 }));
        setTimeout(processBearTurn, 1000);
    } else {
         setGameState(prev => ({ 
            ...prev, 
            currentPlayerIndex: nextIndex, 
            turnPhase: 'ROLL',
            diceValue: 0
        }));
    }
  };

  const processBearTurn = () => {
    addLog("野獸甦醒了...");
    
    setGameState(currentState => {
      const updatedBears = currentState.bears.map(bear => {
        if (bear.isDead) return bear;
        
        let targetPos: HexCoordinate | null = null;

        if (bear.id === 'b2') { 
             const playersNearTreasure = currentState.players.filter(p => !p.isDead && (MAP_DATA.get(coordToString(p.position)) === TerrainType.TREASURE || p.hasTreasureMap));
             if (playersNearTreasure.length > 0) {
                 let minDist = Infinity;
                 playersNearTreasure.forEach(p => {
                     const d = getDistance(bear.position, p.position);
                     if (d < minDist) { minDist = d; targetPos = p.position; }
                 });
             } else {
                 targetPos = { q: -4, r: 0 }; 
             }
        } 
        
        if (!targetPos) { 
             let minDist = Infinity;
             currentState.players.forEach(p => {
                if (!p.isDead) {
                    const d = getDistance(bear.position, p.position);
                    if (d < minDist) { minDist = d; targetPos = p.position; }
                }
             });
        }

        if (!targetPos) return bear;

        const neighbors = getHexNeighbors(bear.position);
        let bestMove = bear.position;
        let bestDist = getDistance(bear.position, targetPos);

        for (const n of neighbors) {
             const t = MAP_DATA.get(coordToString(n));
             const isBroken = currentState.brokenBridges.some(b => areHexesEqual(b, n));
             
             // Updated logic using TERRAIN_PROPERTIES
             const props = t ? TERRAIN_PROPERTIES[t] : null;

             if (t && props && !props.impassable && !(t === TerrainType.BRIDGE && isBroken)) { 
                 const d = getDistance(n, targetPos);
                 if (d < bestDist) {
                     bestDist = d;
                     bestMove = n;
                 }
             }
        }
        return { ...bear, position: bestMove };
      });

      const updatedPlayers = [...currentState.players];
      const damageLog: string[] = [];
      const newLoot: LootDrop[] = [];

      updatedBears.forEach(bear => {
        if (bear.isDead) return;
        updatedPlayers.forEach((p, idx) => {
          if (p.isDead) return;
          if (areHexesEqual(bear.position, p.position)) {
             
             // Check Terrain Evasion Chance using constants
             const terrain = MAP_DATA.get(coordToString(p.position));
             const terrainProps = terrain ? TERRAIN_PROPERTIES[terrain] : null;
             const evasionChance = terrainProps?.defenseBonus || 0;

             if (Math.random() < evasionChance) {
                 damageLog.push(`${p.name} 利用${terrainProps?.description.split('，')[0] || '地形'}掩護，躲過了 ${bear.name} 的攻擊！`);
                 return; // Avoid damage
             }

             const hasDefense = p.inventory.some(c => c.type === CardType.FACE);
             sfx.playGrowl();
             triggerVisualEffect(p.position, 'CLAW');

             if (hasDefense) {
                damageLog.push(`${p.name} 用盾牌擋住了野獸！`);
                sfx.playSlash(); 
                const cardIdx = p.inventory.findIndex(c => c.type === CardType.FACE);
                updatedPlayers[idx].inventory.splice(cardIdx, 1);
             } else {
                updatedPlayers[idx].hp -= 1;
                sfx.playDamage();
                damageLog.push(`${bear.name} 攻擊了 ${p.name}！`);
                
                if (updatedPlayers[idx].hp <= 0) {
                    updatedPlayers[idx].isDead = true;
                    damageLog.push(`${p.name} 倒下了... 物品掉落。`);
                    sfx.playDeath();
                    
                    if (p.apples > 0 || p.inventory.length > 0 || p.hasClaimedTreasure) {
                        newLoot.push({
                            id: `loot-p-${p.id}-${Date.now()}`,
                            position: p.position,
                            apples: p.apples,
                            cards: [...p.inventory], 
                            hasTreasure: p.hasClaimedTreasure
                        });
                    }

                    updatedPlayers[idx].apples = 0;
                    updatedPlayers[idx].inventory = [];
                    updatedPlayers[idx].hasTreasureMap = false;
                    updatedPlayers[idx].hasClaimedTreasure = false;
                    updatedPlayers[idx].position = SPAWN_POINT; 
                    
                    const deadPlayerId = updatedPlayers[idx].id;
                    setTimeout(() => {
                         setGameState(prev => {
                             const respawned = prev.players.map(pl => {
                                 if (pl.id === deadPlayerId) {
                                     return { 
                                         ...pl, 
                                         isDead: false, 
                                         hp: 2, 
                                         position: SPAWN_POINT,
                                         apples: 0,
                                         inventory: []
                                     };
                                 }
                                 return pl;
                             });
                             return { ...prev, players: respawned, gameLog: [...prev.gameLog, `${p.name} 在營地醒來。`] };
                         });
                    }, 2000); 
                }
             }
          }
        });
      });

      let nextStartIdx = 0;
      let checkCount = 0;
      while (updatedPlayers[nextStartIdx].isDead && checkCount < updatedPlayers.length) {
          nextStartIdx++;
          checkCount++;
      }
      if (checkCount >= updatedPlayers.length) {
          nextStartIdx = 0; 
      }

      return {
        ...currentState,
        bears: updatedBears,
        players: updatedPlayers,
        loot: [...currentState.loot, ...newLoot],
        gameLog: [...currentState.gameLog, ...damageLog],
        turnPhase: 'ROLL',
        currentPlayerIndex: nextStartIdx, 
        turnCount: currentState.turnCount + 1
      };
    });
  };
  
  const attackEntity = (target: Entity, cardType: CardType) => {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const cardIndex = currentPlayer.inventory.findIndex(c => c.type === cardType);
      
      if (cardIndex === -1) {
          addLog(`你需要 ${cardType === CardType.ACE ? '劍 (Ace)' : '盾 (Face)'} 才能進行此動作！`);
          return;
      }

      sfx.playSlash();
      triggerVisualEffect(target.position, 'SLASH');

      let updatedPlayers = JSON.parse(JSON.stringify(gameState.players));
      let updatedBears = JSON.parse(JSON.stringify(gameState.bears));
      let lootUpdates: LootDrop[] = [];
      let msg = "";

      const attackerIndex = updatedPlayers.findIndex((p: Player) => p.id === currentPlayer.id);
      if (attackerIndex !== -1) {
        updatedPlayers[attackerIndex].inventory.splice(cardIndex, 1);
      }
      const attacker = updatedPlayers[attackerIndex];

      if (cardType === CardType.ACE) {
          if (target.type === 'BEAR') {
               sfx.playDeath();
               lootUpdates.push({
                   id: `loot-bear-${target.id}-${Date.now()}`,
                   position: target.position,
                   apples: 3, 
                   cards: []
               });

               updatedBears = updatedBears.map((b: Bear) => b.id === target.id ? { ...b, isDead: true, hp: 0 } : b);
               msg = `${currentPlayer.name} 擊敗了 ${target.name} 並掉落了戰利品！`;
               
               setTimeout(() => {
                    setGameState(prev => {
                        const respawnedBears = prev.bears.map(b => b.id === target.id ? { ...b, isDead: false, hp: 6, position: BEAR_SPAWN_POINT } : b);
                         return { ...prev, bears: respawnedBears, gameLog: [...prev.gameLog, `${target.name} 回到了森林。`] };
                    })
               }, 3000);

          } else {
               sfx.playDeath();
               const victimIndex = updatedPlayers.findIndex((p: Player) => p.id === target.id);
               
               if (victimIndex !== -1) {
                   const victim = updatedPlayers[victimIndex];
                   msg = `${currentPlayer.name} 擊敗了 ${target.name}！`;

                   const jokerIndices = victim.inventory
                        .map((c: Card, i: number) => c.type === CardType.JOKER ? i : -1)
                        .filter((i: number) => i !== -1);
                   
                   if (jokerIndices.length > 0) {
                       jokerIndices.sort((a: number, b: number) => b - a);
                       jokerIndices.forEach((idx: number) => {
                            const jokerCard = victim.inventory[idx];
                            victim.inventory.splice(idx, 1); 
                            attacker.inventory.push(jokerCard);
                       });
                       msg += ` ${currentPlayer.name} 從 ${victim.name} 身上搜出了藏寶圖！`;
                       sfx.playLoot();
                   }
                   
                   if (victim.hasClaimedTreasure) {
                       attacker.hasClaimedTreasure = true;
                       victim.hasClaimedTreasure = false;
                       msg += ` 並搶奪了皇家寶藏！`;
                   }
                   
                   attacker.hasTreasureMap = attacker.inventory.some((c: Card) => c.type === CardType.JOKER);

                   if (victim.apples > 0 || victim.inventory.length > 0) {
                        lootUpdates.push({
                            id: `loot-p-${victim.id}-${Date.now()}`,
                            position: victim.position, 
                            apples: victim.apples,
                            cards: [...victim.inventory]
                        });
                   }

                   victim.isDead = true;
                   victim.hp = 0;
                   victim.apples = 0;
                   victim.inventory = [];
                   victim.hasTreasureMap = false;
                   victim.hasClaimedTreasure = false;
                   victim.position = SPAWN_POINT; 

                   const victimId = victim.id;
                   setTimeout(() => {
                        setGameState(prev => {
                            const respawned = prev.players.map(p => {
                                if (p.id === victimId) {
                                    return {
                                        ...p,
                                        isDead: false,
                                        hp: 2, 
                                        position: SPAWN_POINT,
                                        inventory: [],
                                        apples: 0,
                                        hasTreasureMap: false,
                                        hasClaimedTreasure: false
                                    };
                                }
                                return p;
                            });
                            return { ...prev, players: respawned, gameLog: [...prev.gameLog, `${target.name} 在營地醒來。`]};
                        });
                   }, 2000);
               }
          }
      } else {
          sfx.playDamage();
          if (target.type === 'BEAR') {
                updatedBears = updatedBears.map((b: Bear) => b.id === target.id ? { ...b, hp: b.hp - 1, isDead: b.hp - 1 <= 0 } : b);
                msg = `${currentPlayer.name} 傷害了 ${target.name}。`;
           } else {
                const victimIndex = updatedPlayers.findIndex((p: Player) => p.id === target.id);
                if (victimIndex !== -1) {
                    const victim = updatedPlayers[victimIndex];
                    const newHp = victim.hp - 1;
                    victim.hp = newHp;

                    if (newHp <= 0) {
                        victim.isDead = true;
                        msg = `${currentPlayer.name} 擊殺了 ${target.name}！`;
                        sfx.playDeath();

                        if (victim.apples > 0 || victim.inventory.length > 0 || victim.hasClaimedTreasure) {
                            lootUpdates.push({
                                id: `loot-p-${victim.id}-${Date.now()}`,
                                position: victim.position,
                                apples: victim.apples,
                                cards: [...victim.inventory], 
                                hasTreasure: victim.hasClaimedTreasure
                            });
                        }
                        
                        victim.apples = 0;
                        victim.inventory = [];
                        victim.hasTreasureMap = false;
                        victim.hasClaimedTreasure = false;
                        victim.position = SPAWN_POINT;

                        const victimId = victim.id;
                        setTimeout(() => {
                            setGameState(prev => {
                                const respawned = prev.players.map(pl => {
                                    if (pl.id === victimId) return { ...pl, isDead: false, hp: 2, position: SPAWN_POINT, inventory: [], apples: 0, hasTreasureMap: false, hasClaimedTreasure: false };
                                    return pl;
                                });
                                return { ...prev, players: respawned };
                            });
                        }, 2000);
                    } else {
                        msg = `${currentPlayer.name} 攻擊了 ${target.name}！`;
                    }
                }
           }
      }
      
      let finalLoot = [...gameState.loot, ...lootUpdates];
      const attackerPos = currentPlayer.position;
      
      const lootAtFeet = finalLoot.filter(l => areHexesEqual(l.position, attackerPos));
      
      if (lootAtFeet.length > 0) {
          if (attackerIndex !== -1) {
             const result = collectLootAtHex(updatedPlayers[attackerIndex], attackerPos, finalLoot);
             updatedPlayers[attackerIndex] = result.updatedPlayer;
             finalLoot = result.remainingLoot;
             msg += result.log; 
          }
      }

      addLog(msg);
      const currentPhase = gameState.turnPhase;
      const nextPhase = (currentPhase === 'ROLL' || currentPhase === 'MOVE') ? currentPhase : 'ACTION';
      
      setGameState(prev => ({ 
          ...prev, 
          bears: updatedBears,
          players: updatedPlayers, 
          loot: finalLoot,
          turnPhase: nextPhase
      })); 
  };

  const currentPlayer = gameState.currentPlayerIndex >= 0 ? gameState.players[gameState.currentPlayerIndex] : null;

  if (gameState.gameStatus === 'SETUP') {
      return (
        <div className="min-h-screen bg-[#1c1917] flex items-center justify-center font-serif text-[#ead8b1] relative">
            <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]"></div>
            <div className="bg-[#2b1810] p-10 rounded-xl border-[6px] border-[#5d4037] shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-lg w-full text-center relative z-10">
                 <Crown size={64} className="mx-auto text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                 <h1 className="text-4xl font-bold mb-2 text-[#ffecb3] uppercase tracking-widest">熊出沒：果園驚魂</h1>
                 <p className="text-stone-400 mb-8 italic">請選擇冒險人數</p>
                 
                 <div className="grid grid-cols-1 gap-4">
                     <button onClick={() => startGame(3, 1)} className="bg-[#4e342e] hover:bg-[#5d4037] border-2 border-[#8d6e63] text-xl py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-105">
                        <User size={24}/> 1 人遊戲 (VS 2 電腦)
                     </button>
                     <button onClick={() => startGame(3, 2)} className="bg-[#4e342e] hover:bg-[#5d4037] border-2 border-[#8d6e63] text-xl py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-105">
                        <User size={24}/> 2 人遊戲 (VS 1 電腦)
                     </button>
                     <button onClick={() => startGame(3, 3)} className="bg-[#4e342e] hover:bg-[#5d4037] border-2 border-[#8d6e63] text-xl py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-105">
                        <User size={24}/> 3 人遊戲
                     </button>
                     <button onClick={() => startGame(4, 4)} className="bg-[#4e342e] hover:bg-[#5d4037] border-2 border-[#8d6e63] text-xl py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-105">
                        <User size={24}/> 4 人遊戲 <span className="text-xs ml-1 opacity-60">(+獵人)</span>
                     </button>
                     <button onClick={() => startGame(5, 5)} className="bg-[#4e342e] hover:bg-[#5d4037] border-2 border-[#8d6e63] text-xl py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-105">
                        <User size={24}/> 5 人遊戲 <span className="text-xs ml-1 opacity-60">(+獵人, +村長)</span>
                     </button>
                 </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#1c1917] text-[#ead8b1] font-serif flex flex-col items-center relative selection:bg-amber-900 selection:text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]"></div>

      {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#fff8e1] text-[#3e2723] p-8 rounded-lg max-w-2xl w-full border-4 border-[#5d4037] shadow-2xl relative">
                  <button onClick={() => setShowRules(false)} className="absolute top-4 right-4 font-bold text-xl hover:text-red-600">X</button>
                  <h2 className="text-3xl font-bold mb-6 text-center border-b-2 border-[#8d6e63] pb-2 font-serif">遊戲說明</h2>
                  <div className="space-y-4 text-lg overflow-y-auto max-h-[60vh] pr-2">
                      <p><strong className="text-red-700">目標：</strong> 成為最富有的英雄！抵達 <span className="font-bold">高塔 (庇護所)</span> 並搖響警鐘結束遊戲。</p>
                      <p><strong className="text-yellow-700">獲勝方式：</strong></p>
                      <ul className="list-disc pl-6 space-y-1">
                          <li><span className="font-bold">真正的英雄：</span> 找到地圖(鬼牌) → 打開寶箱 → 抵達高塔。</li>
                          <li><span className="font-bold">富豪：</span> 如果無人奪得寶藏，抵達高塔時擁有最多<span className="text-red-600">蘋果</span>的人獲勝。</li>
                      </ul>
                      <p><strong className="text-green-700">物品與戰鬥：</strong></p>
                      <ul className="list-disc pl-6 space-y-1">
                          <li><span className="font-bold">Ace (劍)：</span> 斬殺野獸或將對手擊回重生點 (並搶奪地圖！)。</li>
                          <li><span className="font-bold">Face (J/Q/K 盾)：</span> 抵擋一次攻擊或對敵人造成1點傷害。</li>
                          <li><span className="font-bold">特殊能力 (斷橋)：</span> 消耗一張 Face 牌可破壞相鄰的橋樑！</li>
                          <li><span className="font-bold">鬼牌 (地圖)：</span> 開啟寶箱的鑰匙。</li>
                      </ul>
                      <p><strong className="text-blue-700">生存：</strong> 停留在營地可恢復體力。野獸會在所有玩家回合結束後行動。</p>
                  </div>
              </div>
          </div>
      )}

      <header className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center py-6 px-8 z-10 border-b-[3px] border-[#5c4033] bg-[#291b15] shadow-lg relative">
         <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#8d6e63]"></div>
         <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="p-3 bg-gradient-to-br from-[#d97706] to-[#92400e] border-2 border-[#fcd34d] rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                <Crown className="text-white fill-white/20 drop-shadow" size={28}/>
            </div>
            <div>
                <h1 className="text-4xl font-bold text-[#ffecb3] tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ fontFamily: '"Crimson Pro", serif' }}>
                熊出沒：果園驚魂
                </h1>
                <p className="text-sm text-[#d7ccc8] italic tracking-wide">幽暗果園的生存遊戲</p>
            </div>
        </div>
        
        <div className="flex gap-4 items-center">
             <button onClick={() => setShowRules(true)} className="p-3 rounded-full bg-[#5d4037] hover:bg-[#4e342e] border border-[#8d6e63] text-[#ffecb3] transition-all" title="遊戲說明">
                 <BookOpen size={20} />
             </button>
             <button 
                onClick={toggleSound} 
                className={`p-3 rounded-full border-2 transition-all ${soundEnabled ? 'bg-green-800 border-green-500 text-green-200' : 'bg-red-950 border-red-900 text-red-400'}`}
                title="切換聲音"
             >
                 {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
             </button>

            <div className="flex gap-4 text-sm bg-[#422016] p-2 px-4 rounded-full border border-[#6d4c41] shadow-inner">
                <div className="flex items-center gap-1 text-red-300 font-bold"><Skull size={14}/> 生存</div>
                <div className="w-[1px] bg-[#6d4c41]"></div>
                <div className="flex items-center gap-1 text-green-300 font-bold"><Apple size={14}/> 採集</div>
                <div className="w-[1px] bg-[#6d4c41]"></div>
                <div className="flex items-center gap-1 text-yellow-300 font-bold"><Trophy size={14}/> 勝利</div>
            </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 z-10">
        
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            {gameState.players.map((p, idx) => {
              const isActive = gameState.currentPlayerIndex === idx;
              return (
                <div key={p.id} className={`relative p-5 rounded-lg border-[3px] transition-all duration-300 shadow-xl ${
                  isActive ? 'border-yellow-600 bg-[#4e2c20] scale-105 z-10 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-[#4e342e] bg-[#3e2723] opacity-80'
                }`}>
                  {isActive && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-yellow-500 rounded-r shadow-[0_0_8px_#f59e0b]"></div>}
                  
                  <div className="flex justify-between items-start mb-4 border-b border-[#8d6e63]/30 pb-2">
                    <div className="flex flex-col">
                        <span className={`font-bold text-xl font-serif ${isActive ? 'text-yellow-100' : 'text-[#d7ccc8]'}`}>{p.name}</span>
                        <span className="text-[10px] uppercase tracking-widest text-[#a1887f]">角色</span>
                    </div>
                    {p.isDead && <Skull size={24} className="text-stone-500" />}
                    
                    <div className="flex gap-1">
                        {p.hasTreasureMap && !p.hasClaimedTreasure && (
                            <div title="擁有地圖">
                                <Scroll size={20} className="text-yellow-200 animate-pulse" />
                            </div>
                        )}
                        {p.hasClaimedTreasure && (
                            <div title="擁有寶藏">
                                <Coins size={20} className="text-yellow-400 drop-shadow-[0_0_5px_gold] animate-bounce" />
                            </div>
                        )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                     <div className="flex flex-col items-center bg-[#2b1810] p-2 rounded border border-[#5d4037]/50">
                        <span className="text-[10px] text-[#a1887f] uppercase font-bold">蘋果</span>
                        <div className="flex items-center gap-1 font-bold text-red-300 text-lg">
                            <Apple size={16} className="fill-red-900/50"/> {p.apples}
                        </div>
                     </div>
                     <div className="flex flex-col items-center bg-[#2b1810] p-2 rounded border border-[#5d4037]/50">
                        <span className="text-[10px] text-[#a1887f] uppercase font-bold">生命</span>
                        <div className="flex items-center gap-1 text-red-500 text-lg">
                           {Array(p.maxHp).fill(0).map((_, i) => (
                               <div key={i}><Heart size={16} fill={i < p.hp ? "currentColor" : "none"} className={i < p.hp ? "drop-shadow" : "opacity-20"} /></div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#a1887f] uppercase block mb-1 font-bold">背包</span>
                    <div className="flex flex-wrap gap-2 min-h-[2rem]">
                        {p.inventory.length === 0 && <span className="text-xs text-[#6d4c41] italic">空空如也...</span>}
                        {p.inventory.map((c, i) => (
                            <div key={i} className={`
                                w-8 h-10 rounded border-2 flex flex-col items-center justify-center text-xs font-serif font-bold shadow-sm relative overflow-hidden
                                ${c.type === CardType.ACE ? 'bg-stone-200 text-stone-900 border-stone-400' : 
                                  c.type === CardType.FACE ? 'bg-amber-800 text-amber-100 border-amber-950' : 
                                  c.type === CardType.JOKER ? 'bg-purple-900 text-purple-200 border-purple-500' :
                                  'bg-stone-600 text-stone-300 border-stone-800'}
                            `} title={c.type}>
                                <span className="z-10">{c.rank === 'Joker' ? '?' : c.rank}</span>
                                {c.type === CardType.ACE && <div className="absolute inset-0 bg-yellow-400 opacity-20 animate-pulse"></div>}
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-lg border-[3px] border-[#7f1d1d] bg-[#450a0a] shadow-inner mt-4 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-red-950 opacity-20"><Skull size={100} /></div>
            <h3 className="font-bold text-red-300 mb-3 flex items-center gap-2 uppercase tracking-widest text-xs border-b border-red-900/50 pb-2 relative z-10">
                <AlertTriangle size={14}/> 野獸
            </h3>
            <div className="space-y-3 relative z-10">
                {gameState.bears.map(b => (
                    <div key={b.id} className={`flex justify-between items-center text-sm p-2 rounded bg-black/40 border border-red-900/30 ${b.isDead ? 'opacity-40 grayscale' : ''}`}>
                        <span className="text-red-100 font-bold font-serif">{b.name}</span>
                        <div className="flex gap-1">
                            {Array(b.maxHp).fill(0).map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i < b.hp ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-red-950'}`}></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col items-center justify-start pt-2">
            {gameState.winner ? (
                <div className="absolute z-50 inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#fff8e1] p-12 rounded-xl border-8 border-[#ffd700] text-center shadow-[0_0_50px_rgba(255,215,0,0.5)] max-w-lg relative overflow-hidden">
                        <Trophy size={100} className="mx-auto text-[#ffa000] mb-6 drop-shadow-lg" />
                        <h2 className="text-5xl font-bold text-[#5d4037] mb-2 font-serif">勝利</h2>
                        <p className="text-2xl text-[#f57f17] mb-8 font-serif italic">{gameState.winner.name} {gameState.winner.hasClaimedTreasure ? '是真正的王者！' : '是勝利者！'}</p>
                        <button 
                            onClick={resetGame} 
                            className="bg-[#5d4037] hover:bg-[#4e342e] text-[#ffecb3] font-bold px-10 py-4 rounded-full border-2 border-[#8d6e63] transition-transform hover:scale-105 flex items-center gap-2 mx-auto uppercase tracking-widest shadow-lg"
                        >
                            <RefreshCw size={20}/> 再玩一次
                        </button>
                    </div>
                </div>
            ) : null}

           <div className="w-full relative drop-shadow-2xl">
               <HexBoard 
                 players={gameState.players} 
                 bears={gameState.bears}
                 reachableHexes={reachableHexes}
                 onHexClick={handleHexClick}
                 currentPlayer={currentPlayer}
                 visualEffects={visualEffects}
                 loot={gameState.loot}
                 brokenBridges={gameState.brokenBridges}
               />
           </div>
        </div>

        <div className="lg:col-span-3 flex flex-col h-[650px] gap-6">
           
           <div className="bg-[#3e2723] rounded-xl p-6 border-[3px] border-[#5d4037] shadow-xl flex-none min-h-[240px] relative">
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5d4037] px-4 py-1 rounded-full border border-[#8d6e63] shadow-md">
                   <h3 className="font-bold text-[#ffcc80] uppercase tracking-[0.2em] text-[10px]">
                       {gameState.turnPhase === 'ROLL' ? '決定命運' : 
                        gameState.turnPhase === 'MOVE' ? '移動' : 
                        gameState.turnPhase === 'ACTION' ? '互動' : '危險'}
                   </h3>
               </div>
               
               <div className="mt-4">
               {currentPlayer && gameState.turnPhase === 'ROLL' && (
                   <button 
                     onClick={rollDice}
                     className="w-full bg-gradient-to-b from-[#15803d] to-[#14532d] hover:from-[#16a34a] hover:to-[#166534] border-b-4 border-[#052e16] text-white font-bold py-6 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95 active:border-b-0 active:mt-1 group mb-4"
                   >
                       <Dices size={32} className="group-hover:rotate-180 transition-transform duration-500"/> 
                       <span className="uppercase tracking-widest text-xl font-serif">擲骰子</span>
                   </button>
               )}

               {currentPlayer && gameState.turnPhase === 'MOVE' && (
                   <div className="text-center p-6 bg-[#2b1810] rounded-lg border border-[#5d4037] shadow-inner flex flex-col items-center">
                       <span className="text-xs text-[#bcaaa4] uppercase tracking-widest mb-2">移動點數</span>
                       <div className="text-6xl font-bold text-[#69f0ae] drop-shadow-[0_0_10px_rgba(105,240,174,0.4)] font-serif">{gameState.diceValue}</div>
                       <span className="text-xs text-[#bcaaa4] italic mt-2">選擇發光的格子...</span>
                   </div>
               )}

               {currentPlayer && (gameState.turnPhase === 'ACTION' || gameState.turnPhase === 'ROLL' || gameState.turnPhase === 'MOVE') && (
                   <div className="space-y-3">
                       <div className="grid grid-cols-1 gap-3">
                           {/* Bear Attacks */}
                           {gameState.bears.filter(b => !b.isDead && getDistance(b.position, currentPlayer.position) < 2).map(b => (
                               <div key={b.id} className="flex flex-col gap-2 p-2 bg-red-950/30 rounded border border-red-900/30">
                                   <div className="text-xs text-red-300 uppercase font-bold text-center mb-1">目標: {b.name}</div>
                                   {currentPlayer.inventory.some(c => c.type === CardType.ACE) && (
                                       <button 
                                         onClick={() => attackEntity(b, CardType.ACE)}
                                         className="bg-stone-200 text-stone-900 border-b-4 border-stone-400 hover:bg-white text-xs py-3 rounded font-bold flex items-center justify-center gap-2 uppercase shadow-sm"
                                       >
                                           <Swords size={16}/> 斬殺 (Ace)
                                       </button>
                                   )}
                                   {currentPlayer.inventory.some(c => c.type === CardType.FACE) && (
                                       <button 
                                         onClick={() => attackEntity(b, CardType.FACE)}
                                         className="bg-red-800 text-red-100 border-b-4 border-red-950 hover:bg-red-700 text-xs py-3 rounded font-bold flex items-center justify-center gap-2 uppercase shadow-sm"
                                       >
                                           <Swords size={16}/> 戰鬥 (Face)
                                       </button>
                                   )}
                               </div>
                           ))}

                           {/* PvP */}
                           {gameState.players.filter(p => !p.isDead && p.id !== currentPlayer.id && getDistance(p.position, currentPlayer.position) < 2).map(p => (
                               <div key={p.id} className="flex flex-col gap-2 p-2 bg-amber-950/30 rounded border border-amber-900/30">
                                    <div className="text-xs text-amber-300 uppercase font-bold text-center mb-1">對手: {p.name}</div>
                                    {currentPlayer.inventory.some(c => c.type === CardType.ACE) && (
                                       <button 
                                         onClick={() => attackEntity(p, CardType.ACE)}
                                         className="bg-stone-200 text-stone-900 border-b-4 border-stone-400 hover:bg-white text-xs py-3 rounded font-bold flex items-center justify-center gap-2 uppercase shadow-sm"
                                       >
                                           <Swords size={16}/> 驅逐 (Ace)
                                       </button>
                                   )}
                                   {currentPlayer.inventory.some(c => c.type === CardType.FACE) && (
                                       <button 
                                         onClick={() => attackEntity(p, CardType.FACE)}
                                         className="bg-amber-700 text-amber-100 border-b-4 border-amber-900 hover:bg-amber-600 text-xs py-3 rounded font-bold flex items-center justify-center gap-2 uppercase shadow-sm"
                                       >
                                           <Swords size={16}/> 決鬥 (Face)
                                       </button>
                                   )}
                               </div>
                           ))}

                           {currentPlayer.inventory.some(c => c.type === CardType.FACE) && getHexNeighbors(currentPlayer.position).some(n => {
                               const t = MAP_DATA.get(coordToString(n));
                               return t === TerrainType.BRIDGE && !gameState.brokenBridges.some(b => areHexesEqual(b, n));
                           }) && (
                               <button 
                                    onClick={() => {
                                        const neighborBridge = getHexNeighbors(currentPlayer.position).find(n => {
                                            const t = MAP_DATA.get(coordToString(n));
                                            return t === TerrainType.BRIDGE && !gameState.brokenBridges.some(b => areHexesEqual(b, n));
                                        });
                                        if (neighborBridge) destroyBridge(neighborBridge);
                                    }}
                                    className="bg-orange-700 text-orange-100 border-b-4 border-orange-900 hover:bg-orange-600 text-xs py-3 rounded font-bold flex items-center justify-center gap-2 uppercase shadow-sm mt-2"
                               >
                                   <Flame size={16} /> 燒毀橋樑 (Face)
                               </button>
                           )}

                       </div>
                       
                       {gameState.turnPhase === 'ACTION' && (
                           <button 
                             onClick={endTurn}
                             className="w-full bg-[#4e342e] hover:bg-[#3e2723] text-[#ffecb3] font-bold py-4 rounded border border-[#6d4c41] flex items-center justify-center gap-2 mt-4 uppercase text-xs tracking-widest transition-colors shadow-md"
                           >
                               <Play size={16} /> 結束回合
                           </button>
                       )}
                   </div>
               )}

               {gameState.turnPhase === 'BEAR_TURN' && (
                   <div className="text-center p-6 bg-red-950/40 border-2 border-red-800/50 rounded-lg flex flex-col items-center gap-3 animate-pulse">
                       <AlertTriangle size={48} className="text-red-500 drop-shadow-[0_0_10px_red]" /> 
                       <span className="text-red-400 font-bold uppercase tracking-widest text-sm">野獸狩獵中...</span>
                   </div>
               )}
               </div>
           </div>

           <div className="flex-grow bg-[#fdfbf7] rounded-xl p-1 border-4 border-[#5d4037] flex flex-col shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-[linear-gradient(#d7ccc8_1px,transparent_1px)] bg-[size:100%_28px] opacity-30 pointer-events-none mt-10"></div>
               
               <h3 className="bg-[#5d4037] text-[#ffecb3] font-serif font-bold px-4 py-2 text-sm flex items-center gap-2 justify-center uppercase tracking-widest shadow-md z-10">
                   <ScrollText size={16} /> 冒險日誌
               </h3>
               <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-hide relative z-0">
                   {gameState.gameLog.map((log, i) => (
                       <div key={i} className="text-[15px] text-[#3e2723] font-serif leading-relaxed pl-2 border-l-2 border-[#d7ccc8]">
                           {log}
                       </div>
                   ))}
               </div>
           </div>
        </div>

      </main>
    </div>
  );
}
