
import { TerrainType, HexCoordinate } from './types';
import { coordToString } from './utils';

// Map structure based on the uploaded "Orchard Horror" map image
export const MAP_DATA: Map<string, TerrainType> = new Map();

const setTerrain = (q: number, r: number, type: TerrainType) => {
  MAP_DATA.set(coordToString({ q, r }), type);
};

// 1. Generate Base Grass/Plains
for (let q = -5; q <= 5; q++) {
  for (let r = -5; r <= 5; r++) {
    if (Math.abs(q + r) <= 6) { 
      // Default to Grass
      let terrain = TerrainType.GRASS;
      
      // Create Plains (Meadows) in safer central areas
      if ((q > 0 && r < 0) || (q < 2 && r > 1)) {
          terrain = TerrainType.PLAINS;
      }
      
      setTerrain(q, r, terrain);
    }
  }
}

// 2. The River (Winding on the LEFT side)
const riverCoords = [
  {q: -1, r: -4}, {q: -2, r: -3}, 
  {q: -2, r: -2}, {q: -2, r: -1}, // Upper section
  {q: -2, r: 0}, {q: -2, r: 1},   // Middle section beside tower
  {q: -1, r: 2}, {q: -1, r: 3}, {q: -1, r: 4} // Lower section
];
riverCoords.forEach(c => setTerrain(c.q, c.r, TerrainType.RIVER));

// 3. Bridges (Crossing points on the river)
setTerrain(-2, -2, TerrainType.BRIDGE); // Upper Bridge
setTerrain(-1, 2, TerrainType.BRIDGE);   // Lower Bridge

// 4. The Tower / Shelter (Center)
setTerrain(0, 0, TerrainType.SHELTER);
// Stones around tower
setTerrain(0, -1, TerrainType.GRASS); 
setTerrain(-1, 0, TerrainType.GRASS);
setTerrain(0, 1, TerrainType.GRASS);
setTerrain(1, -1, TerrainType.GRASS);

// 5. The Treasure (Chest on Cliff - Far Left)
setTerrain(-4, 0, TerrainType.TREASURE);
setTerrain(-4, -1, TerrainType.FOREST); // Guarded
setTerrain(-5, 1, TerrainType.FOREST);

// 6. The Bear Cave (Deep Forest - Bottom Left)
setTerrain(-3, 3, TerrainType.FOREST);
setTerrain(-4, 3, TerrainType.FOREST);
setTerrain(-4, 2, TerrainType.FOREST);

// 7. The Camp / Start (Bottom Right)
setTerrain(3, 1, TerrainType.START);
setTerrain(3, 2, TerrainType.START);
setTerrain(2, 2, TerrainType.START);

// 8. The Orchards (Scattered in Forests)
const orchardCoords = [
  // Top Right Grove
  {q: 2, r: -3}, {q: 3, r: -4}, {q: 1, r: -3},
  // Top Left Grove (above river)
  {q: -1, r: -3}, {q: 0, r: -4},
  // Far Right Path
  {q: 4, r: -2}, {q: 4, r: -3}
];
orchardCoords.forEach(c => setTerrain(c.q, c.r, TerrainType.ORCHARD));

// 9. Extra Forests (Density)
const forestCoords = [
    {q: -3, r: -2}, {q: 5, r: -3}, {q: 1, r: 3}, {q: 4, r: 0}
];
forestCoords.forEach(c => setTerrain(c.q, c.r, TerrainType.FOREST));

// 10. Mountains (Impassable Barriers)
// Behind Treasure (Cliff)
setTerrain(-5, 0, TerrainType.MOUNTAIN);
setTerrain(-5, -1, TerrainType.MOUNTAIN);
// Near River Top
setTerrain(-3, -3, TerrainType.MOUNTAIN);
// Edge of Bear Cave
setTerrain(-5, 3, TerrainType.MOUNTAIN);


export const SPAWN_POINT: HexCoordinate = { q: 3, r: 1 }; // Camp (Bottom Right)
export const BEAR_SPAWN_POINT: HexCoordinate = { q: -3, r: 3 }; // Cave (Bottom Left)
export const TREASURE_BEAR_SPAWN: HexCoordinate = { q: -4, r: -1 }; // Near Treasure (Left)

// Gameplay Properties for Terrains
export const TERRAIN_PROPERTIES: Record<TerrainType, { cost: number; impassable: boolean; defenseBonus: number; appleBonus: number; description: string }> = {
  [TerrainType.GRASS]: { 
      cost: 1, 
      impassable: false, 
      defenseBonus: 0, 
      appleBonus: 0, 
      description: "開闊地，移動正常。" 
  },
  [TerrainType.PLAINS]: { 
      cost: 1, 
      impassable: false, 
      defenseBonus: 0, 
      appleBonus: 0, 
      description: "平原，視野良好，易於通行。" 
  },
  [TerrainType.FOREST]: { 
      cost: 2, // Slow movement
      impassable: false, 
      defenseBonus: 0.4, // 40% chance to evade bears
      appleBonus: 0, 
      description: "茂密森林，移動消耗2點行動力，但提供40%閃避機率。" 
  },
  [TerrainType.RIVER]: { 
      cost: 99, 
      impassable: true, 
      defenseBonus: 0, 
      appleBonus: 0, 
      description: "湍急河流，深不可測，無法通行。" 
  },
  [TerrainType.MOUNTAIN]: { 
      cost: 99, 
      impassable: true, 
      defenseBonus: 0, 
      appleBonus: 0, 
      description: "險峻懸崖，無法攀越。" 
  },
  [TerrainType.BRIDGE]: { 
      cost: 1, 
      impassable: false, 
      defenseBonus: 0, 
      appleBonus: 0, 
      description: "唯一的渡河途徑。小心被破壞。" 
  },
  [TerrainType.ORCHARD]: { 
      cost: 1, 
      impassable: false, 
      defenseBonus: 0.1, 
      appleBonus: 2, // Bonus apples!
      description: "豐收果園，採集時獲得額外+2蘋果。" 
  },
  [TerrainType.SHELTER]: { 
      cost: 1, 
      impassable: false, 
      defenseBonus: 0.5, // High defense
      appleBonus: 0, 
      description: "庇護所高塔，堅固的石牆提供50%防禦加成。" 
  },
  [TerrainType.TREASURE]: { 
      cost: 1, 
      impassable: false, 
      defenseBonus: 0, 
      appleBonus: 0, 
      description: "傳說中的皇家寶藏所在地。" 
  },
  [TerrainType.START]: { 
      cost: 1, 
      impassable: false, 
      defenseBonus: 0, 
      appleBonus: 0, 
      description: "冒險者營地，停留在這可恢復體力。" 
  },
};
