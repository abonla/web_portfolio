
import React, { useMemo } from 'react';
import { HexCoordinate, TerrainType, Entity, Player, VisualEffect, LootDrop } from '../types';
import { hexToPixel, HEX_SIZE, coordToString, areHexesEqual } from '../utils';
import { MAP_DATA } from '../constants';
import { Castle, Apple, Tent, Gem, Sparkles, Lock, Scroll, Coins, Mountain, ShoppingBag, Plus, Bell, Skull, XCircle, Flower2 } from 'lucide-react';

interface HexBoardProps {
  players: Player[];
  bears: Entity[];
  reachableHexes: HexCoordinate[];
  onHexClick: (hex: HexCoordinate) => void;
  currentPlayer: Player | null;
  visualEffects: VisualEffect[];
  loot: LootDrop[];
  brokenBridges: HexCoordinate[];
}

// --- Custom Avatars ---

const RedHoodAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
    <path d="M50 10 C25 10 10 30 10 50 V100 H90 V50 C90 30 75 10 50 10" fill="#dc2626" stroke="#991b1b" strokeWidth="2"/>
    <path d="M20 100 Q15 70 30 50 Q50 40 70 50 Q85 70 80 100" fill="#ef4444" />
    <circle cx="50" cy="50" r="22" fill="#ffedd5" />
    <path d="M38 25 Q50 35 62 25" fill="#5d4037" /> {/* Hair */}
    <path d="M40 45 Q50 50 60 45" fill="none" stroke="#5d4037" strokeWidth="2" strokeLinecap="round"/> {/* Eyes */}
    <circle cx="43" cy="50" r="2" fill="#3e2723" />
    <circle cx="57" cy="50" r="2" fill="#3e2723" />
    <path d="M48 60 Q50 62 52 60" fill="none" stroke="#7f1d1d" strokeWidth="2" />
  </svg>
);

const KingAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
    <defs>
      <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <path d="M20 90 Q20 50 50 50 Q80 50 80 90" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2"/> {/* Cape */}
    <rect x="30" y="60" width="40" height="40" rx="5" fill="#1e3a8a" /> {/* Suit */}
    <circle cx="50" cy="50" r="25" fill="#ffedd5" /> {/* Face */}
    {/* Hair (Quiff) */}
    <path d="M30 40 Q25 20 40 15 Q55 10 70 25 Q75 40 70 45" fill="#facc15" stroke="#b45309" strokeWidth="1"/>
    {/* Crown */}
    <path d="M35 20 L35 10 L45 20 L50 5 L55 20 L65 10 L65 20" fill="url(#gold)" stroke="#b45309" strokeWidth="1"/>
    <path d="M40 50 L50 55 L60 50" fill="none" stroke="#b45309" strokeWidth="2" opacity="0.5"/> {/* Eyebrows */}
    <circle cx="45" cy="55" r="2" fill="#000" />
    <circle cx="55" cy="55" r="2" fill="#000" />
    <circle cx="50" cy="70" r="8" fill="none" stroke="#b45309" strokeWidth="1" /> {/* Mouth */}
  </svg>
);

const MinisterAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
    <path d="M25 95 L35 50 L65 50 L75 95" fill="#78350f" /> {/* Robe */}
    <circle cx="50" cy="45" r="20" fill="#f5f5f5" /> {/* Face */}
    {/* Hat */}
    <rect x="35" y="15" width="30" height="20" fill="#111827" />
    <path d="M25 35 H75" stroke="#111827" strokeWidth="4" />
    <circle cx="50" cy="20" r="4" fill="#f59e0b" />
    {/* Features */}
    <path d="M40 45 L50 45" stroke="#000" strokeWidth="2" />
    <path d="M55 45 L65 45" stroke="#000" strokeWidth="2" />
    <path d="M48 55 Q50 50 52 55" fill="none" stroke="#000" />
  </svg>
);

const HunterAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
    <path d="M20 90 L30 50 L70 50 L80 90" fill="#14532d" /> {/* Green Tunic */}
    <circle cx="50" cy="45" r="22" fill="#e2c4a6" /> {/* Face */}
    {/* Hood/Hat */}
    <path d="M20 40 Q50 10 80 40 L70 45 Q50 25 30 45 Z" fill="#064e3b" />
    <path d="M75 30 L85 20" stroke="#facc15" strokeWidth="2" /> {/* Feather */}
    <circle cx="40" cy="50" r="2" fill="#000" />
    <circle cx="60" cy="50" r="2" fill="#000" />
    <path d="M45 60 H55" stroke="#000" strokeWidth="2" />
  </svg>
);

const ElderAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
    <path d="M25 95 L35 55 L65 55 L75 95" fill="#581c87" /> {/* Purple Robe */}
    <circle cx="50" cy="45" r="20" fill="#e2c4a6" /> {/* Face */}
    <path d="M30 45 Q50 80 70 45" fill="#e5e5e5" opacity="0.8" /> {/* Beard */}
    <circle cx="45" cy="40" r="2" fill="#000" />
    <circle cx="55" cy="40" r="2" fill="#000" />
    <path d="M30 80 L20 95" stroke="#451a03" strokeWidth="4" /> {/* Staff */}
  </svg>
);

const BearAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
    <g transform="translate(50,50) scale(0.9)">
        <circle cx="-25" cy="-25" r="12" fill="#5D4037" stroke="#3E2723" strokeWidth="2"/>
        <circle cx="25" cy="-25" r="12" fill="#5D4037" stroke="#3E2723" strokeWidth="2"/>
        <circle cx="0" cy="0" r="40" fill="#795548" stroke="#3E2723" strokeWidth="2"/>
        <ellipse cx="0" cy="15" rx="15" ry="12" fill="#D7CCC8" />
        <circle cx="0" cy="10" r="6" fill="#3E2723" />
        
        {/* Angry Eyes */}
        <path d="M-15 -5 L-5 0" stroke="black" strokeWidth="3" />
        <path d="M15 -5 L5 0" stroke="black" strokeWidth="3" />
        <circle cx="-10" cy="5" r="3" fill="black" />
        <circle cx="10" cy="5" r="3" fill="black" />
        
        {/* Teeth */}
        <path d="M-8 22 L0 25 L8 22" fill="none" stroke="black" strokeWidth="2" />
        <path d="M-5 22 L-3 26 L-1 22" fill="white" stroke="none"/>
        <path d="M5 22 L3 26 L1 22" fill="white" stroke="none"/>
    </g>
  </svg>
);

// --- Visual Effects ---

const ExplosionEffect = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <circle cx="50" cy="50" r="40" fill="#f97316" opacity="0">
             <animate attributeName="r" values="0;40;50" dur="0.5s" fill="freeze" />
             <animate attributeName="opacity" values="0.8;0.5;0" dur="0.5s" fill="freeze" />
        </circle>
        <path d="M50 50 L50 10 M50 50 L80 30 M50 50 L80 70 M50 50 L50 90 M50 50 L20 70 M50 50 L20 30" stroke="#facc15" strokeWidth="4">
             <animate attributeName="stroke-dasharray" from="0,100" to="50,0" dur="0.4s" fill="freeze" />
             <animate attributeName="opacity" values="1;0" dur="0.4s" fill="freeze" />
        </path>
    </svg>
);

const SlashEffect = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <line x1="15" y1="15" x2="85" y2="85" stroke="#ef4444" strokeWidth="8" strokeLinecap="round">
            <animate attributeName="opacity" values="1;1;0" dur="0.8s" fill="freeze" />
        </line>
        <line x1="85" y1="15" x2="15" y2="85" stroke="#ef4444" strokeWidth="8" strokeLinecap="round">
            <animate attributeName="opacity" values="0;1;1;0" begin="0.1s" dur="0.8s" fill="freeze" />
        </line>
    </svg>
);

const ClawEffect = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <g stroke="#7f1d1d" strokeWidth="6" strokeLinecap="round">
            <path d="M20 10 Q40 50 30 90" fill="none">
                 <animate attributeName="stroke-dasharray" from="0, 100" to="100, 0" dur="0.2s" fill="freeze" />
            </path>
            <path d="M50 10 Q70 50 60 90" fill="none">
                 <animate attributeName="stroke-dasharray" from="0, 100" to="100, 0" begin="0.05s" dur="0.2s" fill="freeze" />
            </path>
            <path d="M80 10 Q100 50 90 90" fill="none">
                 <animate attributeName="stroke-dasharray" from="0, 100" to="100, 0" begin="0.1s" dur="0.2s" fill="freeze" />
            </path>
        </g>
    </svg>
);

const GoldEffect = () => (
    <div className="absolute inset-0 flex items-center justify-center animate-bounce">
        <Sparkles size={30} className="text-yellow-400 fill-yellow-200 drop-shadow-[0_0_8px_gold]" />
    </div>
);

const HealEffect = () => (
    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
         <div className="relative">
             <Plus size={40} className="text-green-400 drop-shadow-[0_0_8px_#4ade80]" strokeWidth={4}/>
         </div>
    </div>
);

const ForestTile = () => (
    <svg viewBox="0 0 50 50" className="w-full h-full opacity-70">
        <path d="M25 5 L35 25 H15 Z" fill="#14532d" />
        <path d="M25 15 L38 35 H12 Z" fill="#166534" />
        <rect x="23" y="35" width="4" height="8" fill="#3e2723" />
    </svg>
);

const RiverTile = () => (
    <svg viewBox="0 0 50 50" className="w-full h-full opacity-60">
        <path d="M0 25 Q12 10 25 25 Q37 40 50 25" fill="none" stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" />
        <path d="M0 25 Q12 10 25 25 Q37 40 50 25" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const MountainTile = () => (
    <svg viewBox="0 0 50 50" className="w-full h-full opacity-80">
        <path d="M10 40 L25 10 L40 40 Z" fill="#4b5563" stroke="#1f2937" strokeWidth="2" />
        <path d="M25 10 L30 20 L20 20 Z" fill="#d1d5db" /> {/* Snow cap */}
        <path d="M5 40 L15 25 L25 40 Z" fill="#374151" stroke="#1f2937" strokeWidth="1" />
    </svg>
);

const PlainsTile = () => (
    <div className="w-full h-full flex items-center justify-center opacity-70">
        <Flower2 size={16} className="text-pink-300 fill-pink-100" />
    </div>
);

const BridgeTile = ({ isBroken }: { isBroken: boolean }) => {
    if (isBroken) {
        return (
            <svg viewBox="0 0 50 50" className="w-full h-full">
                <path d="M10 15 L20 25 L10 35" stroke="#5d4037" strokeWidth="3" strokeLinecap="round"/>
                <path d="M40 15 L30 25 L40 35" stroke="#5d4037" strokeWidth="3" strokeLinecap="round"/>
                <path d="M0 25 Q12 10 25 25 Q37 40 50 25" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="2,2"/>
                <XCircle x={18} y={18} width={14} height={14} className="text-red-600" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 50 50" className="w-full h-full">
            <rect x="10" y="15" width="30" height="20" fill="#78350f" rx="2" />
            <line x1="15" y1="15" x2="15" y2="35" stroke="#5d4037" strokeWidth="2" />
            <line x1="25" y1="15" x2="25" y2="35" stroke="#5d4037" strokeWidth="2" />
            <line x1="35" y1="15" x2="35" y2="35" stroke="#5d4037" strokeWidth="2" />
        </svg>
    );
};

const TerrainIcon = ({ type, isBroken }: { type: TerrainType, isBroken?: boolean }) => {
  switch (type) {
    case TerrainType.SHELTER: return <div className="animate-pulse opacity-90"><Bell size={22} className="text-yellow-100 fill-yellow-600 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]" /></div>;
    case TerrainType.TREASURE: return <div className="group"><Lock size={12} className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-400 opacity-80" /><Gem size={20} className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] fill-purple-900" /></div>;
    case TerrainType.ORCHARD: return <Apple size={16} className="text-red-500 drop-shadow-sm fill-red-900/50" />;
    case TerrainType.START: return <Tent size={18} className="text-orange-200 opacity-90 fill-orange-900" />;
    case TerrainType.FOREST: return <ForestTile />;
    case TerrainType.RIVER: return <RiverTile />;
    case TerrainType.MOUNTAIN: return <MountainTile />;
    case TerrainType.PLAINS: return <PlainsTile />;
    case TerrainType.BRIDGE: return <BridgeTile isBroken={!!isBroken} />;
    case TerrainType.GRASS: return null;
    default: return null;
  }
};

const HexBoard: React.FC<HexBoardProps> = ({ players, bears, reachableHexes, onHexClick, currentPlayer, visualEffects, loot, brokenBridges }) => {
  
  const hexes = useMemo(() => {
    const hexList: { coord: HexCoordinate; type: TerrainType }[] = [];
    MAP_DATA.forEach((type, key) => {
      const [q, r] = key.split(',').map(Number);
      hexList.push({ coord: { q, r }, type });
    });
    return hexList;
  }, []);

  return (
    <div className="relative w-full h-[650px] bg-[#1a1a1a] overflow-hidden rounded-xl border-[12px] border-[#3e2723] shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center cursor-move group select-none">
        
        {/* Fantasy Map Background Image */}
        <div className="absolute inset-0 pointer-events-none">
             <img 
               src="https://img.freepik.com/premium-photo/fantasy-game-map-background_1022204-6338.jpg" 
               alt="Fairytale Forest Map" 
               className="w-full h-full object-cover opacity-80"
             />
             <div className="absolute inset-0 bg-[#c5e1a5] mix-blend-multiply opacity-30"></div>
        </div>
        
        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(27,94,32,0.6)_100%)]"></div>

        <svg viewBox="-320 -320 640 640" className="w-full h-full pointer-events-auto relative z-10 font-serif" xmlns="http://www.w3.org/2000/svg">
          <defs>
             <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
               <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
               </feMerge>
             </filter>
          </defs>
          <g transform="translate(0, 10)">
            {hexes.map(({ coord, type }) => {
              const { x, y } = hexToPixel(coord);
              const isReachable = reachableHexes.some(h => areHexesEqual(h, coord));
              const isCurrentPlayerHex = currentPlayer && !currentPlayer.isDead && areHexesEqual(currentPlayer.position, coord);
              
              const activeEffect = visualEffects.find(eff => areHexesEqual(eff.position, coord));
              
              const lootHere = loot.filter(l => areHexesEqual(l.position, coord));
              const isBroken = brokenBridges.some(b => areHexesEqual(b, coord));

              // Tiles are mostly transparent to show the map
              let fill = 'rgba(255,255,255,0.02)'; 
              let stroke = 'rgba(255, 255, 255, 0.1)'; 
              let strokeWidth = 0.5;
              
              if (type === TerrainType.RIVER) { fill = 'rgba(66, 165, 245, 0.2)'; stroke = 'rgba(66, 165, 245, 0.3)'; }
              if (type === TerrainType.FOREST) { fill = 'rgba(27, 94, 32, 0.05)'; }
              if (type === TerrainType.PLAINS) { fill = 'rgba(134, 239, 172, 0.1)'; }
              if (type === TerrainType.MOUNTAIN) { fill = 'rgba(55, 65, 81, 0.5)'; stroke = '#374151'; }
              if (type === TerrainType.BRIDGE) { 
                  if (isBroken) {
                    fill = 'rgba(239, 68, 68, 0.2)'; // Red tint for broken
                    stroke = 'rgba(239, 68, 68, 0.5)';
                  } else {
                    fill = 'rgba(121, 85, 72, 0.4)'; 
                  }
              }
              if (type === TerrainType.SHELTER) { stroke = '#fbbf24'; strokeWidth = 1.5; fill='rgba(251, 191, 36, 0.1)'; }
              if (type === TerrainType.TREASURE) { 
                  stroke = '#a855f7'; 
                  strokeWidth = 1.5; 
                  fill='rgba(168, 85, 247, 0.1)'; 
              }
              if (type === TerrainType.START) { stroke = '#fdba74'; }

              if (isReachable) {
                  fill = 'rgba(74, 222, 128, 0.3)';
                  stroke = '#4ade80';
                  strokeWidth = 2.5;
              }

              // Dynamic Player Halo Color
              const haloColor = currentPlayer?.color || '#fbbf24';

              return (
                <g 
                  key={coordToString(coord)} 
                  transform={`translate(${x},${y})`}
                  onClick={() => isReachable && onHexClick(coord)}
                  className={`transition-all duration-300 ${isReachable ? 'cursor-pointer hover:opacity-100' : ''}`}
                >
                  <polygon
                    points={calculateHexPoints(HEX_SIZE - 2)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    className={isReachable ? 'animate-pulse hover:stroke-[3px]' : ''}
                  />

                  {/* Terrain Icon Overlay - Mobile Friendly explicit sizing */}
                  <foreignObject x={-15} y={-15} width={30} height={30} style={{ pointerEvents: 'none', overflow: 'visible' }}>
                    <div className="flex items-center justify-center w-full h-full" style={{ width: '30px', height: '30px' }}>
                       <TerrainIcon type={type} isBroken={isBroken} />
                       {type === TerrainType.TREASURE && (
                           <div className="absolute -z-10 opacity-30 text-stone-700 top-2"><Mountain size={32}/></div>
                       )}
                    </div>
                  </foreignObject>
                  
                  {/* Loot Drop Icon */}
                  {lootHere.length > 0 && (
                      <g transform="translate(10, 10)">
                          <foreignObject width={16} height={16} style={{ overflow: 'visible' }}>
                              <div className="animate-bounce" style={{ width: '16px', height: '16px' }}>
                                  <ShoppingBag size={14} className="text-amber-300 fill-amber-700 drop-shadow-md"/>
                              </div>
                          </foreignObject>
                      </g>
                  )}

                  {/* Active Player Hex Halo with Matching Color */}
                  {isCurrentPlayerHex && (
                    <g>
                        <polygon
                        points={calculateHexPoints(HEX_SIZE)}
                        fill="none"
                        stroke={haloColor}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        className="animate-spin-slow origin-center"
                        style={{ animationDuration: '10s' }}
                        />
                         <polygon
                        points={calculateHexPoints(HEX_SIZE - 2)}
                        fill={`${haloColor}20`} // ~12% opacity
                        stroke={`${haloColor}80`} // ~50% opacity
                        strokeWidth={1}
                        style={{ filter: 'url(#glow)' }}
                        />
                    </g>
                  )}

                  {/* Visual Effects Overlay */}
                  {activeEffect && (
                      <foreignObject x={-25} y={-25} width={50} height={50} style={{ pointerEvents: 'none', zIndex: 50 }}>
                          <div className="w-full h-full flex items-center justify-center" style={{ width: '50px', height: '50px' }}>
                              {activeEffect.type === 'SLASH' && <SlashEffect />}
                              {activeEffect.type === 'CLAW' && <ClawEffect />}
                              {activeEffect.type === 'GOLD' && <GoldEffect />}
                              {activeEffect.type === 'HEAL' && <HealEffect />}
                              {activeEffect.type === 'EXPLOSION' && <ExplosionEffect />}
                          </div>
                      </foreignObject>
                  )}
                </g>
              );
            })}

            {/* Render Bears */}
            {bears.map((bear) => {
               if (bear.isDead) return null;
               const { x, y } = hexToPixel(bear.position);
               return (
                 <g key={bear.id} transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }} className="transition-all duration-700 ease-in-out">
                    <foreignObject x={-20} y={-20} width={40} height={40} style={{ overflow: 'visible' }}>
                         <div style={{ width: '40px', height: '40px' }}>
                            <BearAvatar />
                         </div>
                    </foreignObject>
                 </g>
               )
            })}

            {/* Render Players (Alive) with Player Colors */}
            {players.map((player) => {
               if (player.isDead) return null; // Dead players rendered separately on top

               const { x, y } = hexToPixel(player.position);
               const offsetCount = players.filter(p => !p.isDead && areHexesEqual(p.position, player.position) && p.id < player.id).length;
               const offsetX = offsetCount * 8; 
               const offsetY = offsetCount * 4;
               
               const isCurrentPlayer = currentPlayer?.id === player.id;

               return (
                 <g key={player.id} transform={`translate(${x + offsetX},${y + offsetY})`} style={{ pointerEvents: 'none' }} className="transition-transform duration-500">
                    
                    {/* Player Color Ring */}
                    <circle cx="0" cy="0" r="28" fill="none" stroke={player.color} strokeWidth="2" className="opacity-60" />

                    {isCurrentPlayer && (
                        <g className="animate-bounce">
                           <Sparkles size={16} x={-22} y={-32} className="fill-yellow-200" style={{ color: player.color }} />
                        </g>
                    )}
                    
                    {/* Treasure/Map Indicators on Character */}
                    {(player.hasTreasureMap || player.hasClaimedTreasure) && (
                        <g transform="translate(10, -25)">
                            {player.hasClaimedTreasure ? (
                                <foreignObject width={20} height={20} className="animate-bounce" style={{ overflow: 'visible' }}>
                                    <div style={{ width: '20px', height: '20px' }}>
                                        <Coins size={18} className="text-yellow-400 drop-shadow-[0_0_5px_gold] fill-yellow-600" />
                                    </div>
                                </foreignObject>
                            ) : (
                                <foreignObject width={20} height={20} className="animate-pulse" style={{ overflow: 'visible' }}>
                                    <div style={{ width: '20px', height: '20px' }}>
                                        <Scroll size={18} className="text-amber-200 drop-shadow-md fill-amber-800" />
                                    </div>
                                </foreignObject>
                            )}
                        </g>
                    )}

                    <foreignObject x={-18} y={-18} width={36} height={36} className="drop-shadow-lg" style={{ overflow: 'visible' }}>
                        <div className="w-full h-full" style={{ width: '36px', height: '36px' }}>
                           {player.id === 'p1' && <RedHoodAvatar />}
                           {player.id === 'p2' && <KingAvatar />}
                           {player.id === 'p3' && <MinisterAvatar />}
                           {player.id === 'p4' && <HunterAvatar />}
                           {player.id === 'p5' && <ElderAvatar />}
                        </div>
                    </foreignObject>
                 </g>
               )
            })}

            {/* Render Dead Players (Skulls) - Last for Z-Index */}
            {players.map((player) => {
               if (!player.isDead) return null;
               const { x, y } = hexToPixel(player.position);
               return (
                    <g key={`dead-${player.id}`} transform={`translate(${x},${y})`} className="transition-all duration-500 pointer-events-none">
                         <foreignObject x={-15} y={-15} width={30} height={30} className="animate-pulse" style={{ overflow: 'visible' }}>
                            <div style={{ width: '30px', height: '30px' }}>
                                <Skull size={30} className="text-stone-300 drop-shadow-lg fill-black/50" />
                            </div>
                         </foreignObject>
                    </g>
               )
            })}

          </g>
        </svg>
    </div>
  );
};

const calculateHexPoints = (size: number) => {
  const angles = [0, 60, 120, 180, 240, 300];
  return angles
    .map(angle => {
      const rad = (Math.PI / 180) * angle;
      return `${size * Math.cos(rad)},${size * Math.sin(rad)}`;
    })
    .join(' ');
};

export default HexBoard;
