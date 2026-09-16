import { getMapData } from '../data'

/**
 * MapUtils - Helper functions for Tiled tilemap integration
 * 
 * TILESET FORMAT:
 * ===============
 * The tileset (tileset-kattegat.json) defines 16 tile types (IDs 0-15):
 * 
 * WATER TILES (passable, default):
 *   0-3:   Water with different wave animations (dark blue)
 *   4-7:   Water with different wave animations (light blue)
 * 
 * LAND TILES (impassable, collision):
 *   8:  Sand
 *   9:  Rock
 *   10: Grass
 *   11: Sand (dark)
 *   12: Rock (variant)
 *   13: Grass (variant)
 *   14: Sand (beach)
 *   15: Rock (coast)
 * 
 * Each tile has an object group defining a 32×32 collision rectangle.
 * 
 * HOW TO EXTEND THE MAP:
 * =====================
 * 1. Edit map.json to add/remove land tiles:
 *    - Add coordinates to "landTiles" array: [x, y]
 *    - Add harbor locations to "harborLocations" array
 *    - Update "dimensions" if needed (currently 30×15)
 * 
 * 2. Add new land tile types to tileset-kattegat.json:
 *    - Extend the "tiles" array with new IDs (16+)
 *    - Add new PNG tiles to tileset-kattegat.png
 *    - Update imageheight/imagewidth if expanding spritesheet
 * 
 * 3. Regenerate map.tmj from map.json using the PowerShell script:
 *    - Run the script that converts map.json to Tiled JSON format
 *    - Ensures consistency between data and tilemap file
 * 
 * 4. Update collision layer in WorldMapScene:
 *    - Modify setCollision() array if adding new land tile IDs
 *    - Current: [8, 9, 10, 11, 12, 13, 14, 15]
 *    - If adding tiles, extend this array
 * 
 * HOW TO USE IN SCENES:
 * ====================
 * import { isWater, isLand, isHarbor, getTileAt } from '../utils/MapUtils'
 * 
 * if (isWater(x, y)) {
 *   // Player can move here
 * }
 * 
 * if (isLand(x, y)) {
 *   // Apply collision/damage
 * }
 * 
 * const harbor = isHarbor(x, y)
 * if (harbor) {
 *   // Enter harbor scene, use harbor.harborId and harbor.name
 * }
 */

/**
 * Tile constants - match tileset-kattegat.json IDs
 */
export const TILE_CONSTANTS = {
  WATER_CALM: 0,
  WATER_WAVE1: 1,
  WATER_WAVE2: 2,
  WATER_WAVE3: 3,
  WATER_LIGHT_CALM: 4,
  WATER_LIGHT_WAVE1: 5,
  WATER_LIGHT_WAVE2: 6,
  WATER_LIGHT_WAVE3: 7,
  SAND: 8,
  ROCK: 9,
  GRASS: 10,
  SAND_DARK: 11,
  ROCK_VARIANT: 12,
  GRASS_VARIANT: 13,
  SAND_BEACH: 14,
  ROCK_COAST: 15,
}

// Water tile IDs (passable)
const WATER_TILES = new Set<number>([0, 1, 2, 3, 4, 5, 6, 7])

// Land tile IDs (collision)
const LAND_TILES = new Set<number>([8, 9, 10, 11, 12, 13, 14, 15])

/**
 * Check if coordinates are within map bounds
 */
export function isInBounds(x: number, y: number, mapData = getMapData()): boolean {
  return x >= 0 && x < mapData.dimensions.width && y >= 0 && y < mapData.dimensions.height
}

/**
 * Check if a tile is water (passable)
 */
export function isWater(x: number, y: number, tileData?: number[][]): boolean {
  if (!isInBounds(x, y)) return false

  const mapData = getMapData()
  const key = `${x},${y}`

  // If land tile is in the map data, it's not water
  const isLandTile = mapData.landTiles.some((tile: number[]) => tile[0] === x && tile[1] === y)
  return !isLandTile
}

/**
 * Check if a tile is land (collision/impassable)
 */
export function isLand(x: number, y: number, mapData = getMapData()): boolean {
  if (!isInBounds(x, y, mapData)) return false
  return mapData.landTiles.some((tile: number[]) => tile[0] === x && tile[1] === y)
}

/**
 * Check if a tile is a harbor
 */
export function isHarbor(x: number, y: number, mapData = getMapData()): { harborId: number; name: string } | null {
  if (!isInBounds(x, y, mapData)) return null
  const harbor = mapData.harborLocations.find(
    (loc: { x: number; y: number; harborId: number; name: string }) => loc.x === x && loc.y === y
  )

  return harbor ? { harborId: harbor.harborId, name: harbor.name } : null
}

/**
 * Get tile type at coordinates
 */
export type TileType = 'water' | 'land' | 'harbor'

export interface TileData {
  type: TileType
  x: number
  y: number
  harborId?: number
  harborName?: string
}

export function getTileAt(x: number, y: number): TileData {
  if (!isInBounds(x, y)) {
    return { type: 'water', x, y } // Treat out-of-bounds as water (prevent crashes)
  }

  const harbor = isHarbor(x, y)
  if (harbor) {
    return {
      type: 'harbor',
      x,
      y,
      harborId: harbor.harborId,
      harborName: harbor.name,
    }
  }

  if (isLand(x, y)) {
    return { type: 'land', x, y }
  }

  return { type: 'water', x, y }
}

/**
 * Get all land tiles as a Set for fast lookup
 */
export function getLandTilesSet(): Set<string> {
  const mapData = getMapData()
  return new Set(mapData.landTiles.map((tile: number[]) => `${tile[0]},${tile[1]}`))
}

/**
 * Get all harbor tiles as a Map for fast lookup
 */
export function getHarborTilesMap(): Map<string, number> {
  const mapData = getMapData()
  return new Map(
    mapData.harborLocations.map((loc: { x: number; y: number; harborId: number }) => [
      `${loc.x},${loc.y}`,
      loc.harborId,
    ])
  )
}

/**
 * Get the starting position
 */
export function getStartPosition(): { x: number; y: number } {
  return getMapData().startPosition
}

/**
 * Get map dimensions
 */
export function getMapDimensions(): { width: number; height: number } {
  return getMapData().dimensions
}

/**
 * Convert tile coordinates to pixel coordinates (32px per tile)
 */
export function tileToPixels(tileX: number, tileY: number, tileSize: number = 32): { x: number; y: number } {
  return {
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize / 2,
  }
}

/**
 * Convert pixel coordinates to tile coordinates
 */
export function pixelsToTile(pixelX: number, pixelY: number, tileSize: number = 32): { x: number; y: number } {
  return {
    x: Math.floor(pixelX / tileSize),
    y: Math.floor(pixelY / tileSize),
  }
}
