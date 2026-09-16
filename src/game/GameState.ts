/**
 * GameState - Core game data model
 * Separate from rendering logic for testability and modularity
 */

export interface GameState {
  runId: string
  playerName: string
  // Resources
  crew: number
  grain: number
  rigsdaler: number
  cannons: number
  gems?: number // Jewels (found in combat, sold only)
  
  // Ship condition
  hullIntegrity: number // 0-100, determines damage state
  maxHullIntegrity: number
  
  // Combat mechanics
  crewMorale: number // 0.2-1.5 multiplier (affects combat performance)
  consecutiveFlees: number // Tracks fleeing penalty accumulation
  
  // Tracking
  score: number
  turnsElapsed: number
  
  // Flags
  hasJack: boolean // Own flag (Dannebrog)
  
  // Difficulty
  difficulty: number // 0-4 (easy to hard)
  
  // Current location
  currentMapTile: { x: number; y: number }
  seaContacts?: Array<{ x: number; y: number } & ({ kind: 'enemy'; enemyId: number } | { kind: 'storm' })>
}

export const createInitialGameState = (difficulty: number = 1, playerName: string = 'Kaper'): GameState => ({
  runId: crypto.randomUUID(),
  playerName,
  crew: 15,
  grain: 30,
  rigsdaler: 500,
  cannons: 4,
  gems: 0,
  hullIntegrity: 100,
  maxHullIntegrity: 100,
  crewMorale: 1.0,
  consecutiveFlees: 0,
  score: 0,
  turnsElapsed: 0,
  hasJack: true,
  difficulty: Math.max(0, Math.min(4, difficulty)),
  currentMapTile: { x: 15, y: 7 }, // Center of map
})

export const getHullDamageLevel = (state: GameState): 0 | 1 | 2 | 3 => {
  const ratio = state.hullIntegrity / state.maxHullIntegrity
  if (ratio >= 0.75) return 0 // normal
  if (ratio >= 0.5) return 1 // light damage
  if (ratio >= 0.25) return 2 // medium damage
  return 3 // severe damage
}

export const canSail = (state: GameState): boolean => {
  return state.crew > 0 && state.hullIntegrity > 0 && state.grain > 0
}

export const applyHullDamage = (
  state: GameState,
  amount: number
): { survived: boolean; newState: GameState } => {
  const newState = { ...state }
  newState.hullIntegrity = Math.max(0, state.hullIntegrity - amount)
  
  return {
    survived: canSail(newState),
    newState,
  }
}

export const consumeGrain = (state: GameState, amount: number): GameState => {
  return {
    ...state,
    grain: Math.max(0, state.grain - amount),
  }
}
