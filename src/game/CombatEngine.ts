/**
 * CombatEngine - Naval cannon combat calculations
 * 
 * Handles all combat mechanics including:
 * - Hit chance calculation based on distance, cannons, wind, morale
 * - Damage calculation per hit
 * - Crew casualties from combat
 * - Morale effects on combat performance
 * - Wind effects that change each turn
 * - Boarding success chances
 * 
 * Formula Basis:
 * - Hit Chance = (Cannons × 0.15 - Distance × 0.05) × MoraleMultiplier × WindFactor
 * - Damage = Random(1, Cannons × 3) if hit
 * - Crew Loss from Hit = Damage ÷ 10 (minimum 1)
 * - Crew Loss from Boarding = Random(10%, 30%) × (opponent crew / friendly crew ratio)
 * - Morale = Previous × (1.2 if victory, 0.8 if flee, 0.9 if loss)
 */

import { t, translateData, MessageKey } from '../i18n'

export function calculateAimImpact(side: number, elevation: number, range: number, windX: number, windY: number, strength: number, random = Math.random) {
  const lateral = strength * windX - side * 0.2
  const shotRange = 700 + strength * windY * 10 - elevation * 10 + (random() - random()) * 20
  const rangeError = range - shotRange
  return { lateral, rangeError, hit: Math.abs(lateral) <= 4 && Math.abs(rangeError) <= 80 }
}

export function boardingRound(crew: number, morale: number, defenders: number, defenderMorale: number, tactic: 'assault' | 'guard', random = Math.random) {
  const pressure = Math.max(0.6, Math.min(1.2, defenders * defenderMorale / Math.max(1, crew * morale)))
  const loss = Math.min(crew, Math.max(1, Math.floor(crew * (0.04 + random() * 0.08) * pressure * (tactic === 'guard' ? 0.5 : 1))))
  const enemyLoss = Math.min(defenders, Math.max(1, Math.floor(Math.max(loss / pressure, defenders * 0.1) * (tactic === 'assault' ? 1.5 : 0.7))))
  return { playerCrewLoss: loss, enemyCrewLoss: enemyLoss }
}

export interface CombatState {
  round: number
  distance: number
  windSeverity: 0 | 1 | 2 | 3
  playerMorale: number
  enemyMorale: number
  playerHullIntegrity: number
  playerCrew: number
  playerCannons: number
  enemyHullIntegrity: number
  enemyCrew: number
  enemyCannons: number
  combatLog: string[]
}

/**
 * Calculate wind severity for the current turn.
 * Wind changes each turn and affects aim accuracy.
 * 
 * @returns Wind severity: 0 (none), 1 (light), 2 (moderate), 3 (strong)
 */
export const calculateWind = (): 0 | 1 | 2 | 3 => {
  const random = Math.random()
  if (random < 0.4) return 0 // 40% chance: no wind
  if (random < 0.7) return 1 // 30% chance: light wind
  if (random < 0.9) return 2 // 20% chance: moderate wind
  return 3 // 10% chance: strong wind
}

/**
 * Calculate wind factor that affects hit chance.
 * Wind increases difficulty of accurate aiming.
 * 
 * @param windSeverity - 0 to 3
 * @returns Wind factor: 1.0 (no effect) to 0.4 (severe effect)
 */
const getWindFactor = (windSeverity: 0 | 1 | 2 | 3): number => {
  const factors: Record<number, number> = { 0: 1.0, 1: 0.85, 2: 0.65, 3: 0.4 }
  return factors[windSeverity] || 1.0
}

/**
 * Calculate distance between ships (1-10 tile units).
 * Longer distance makes accurate hits more difficult.
 * 
 * @returns Distance: 1-10 (tile units)
 */
export const calculateDistance = (): number => {
  return Math.floor(Math.random() * 10) + 1 // 1-10
}

/**
 * Calculate hit chance for cannon fire.
 * 
 * Hit Chance = (Cannons × 0.15 - Distance × 0.05) × MoraleMultiplier × WindFactor
 * 
 * - More cannons increase hit chance
 * - Greater distance reduces hit chance
 * - Morale multiplier affects accuracy (high morale = better accuracy)
 * - Wind reduces accuracy
 * - Result is clamped between 0 and 1
 * 
 * @param cannons - Number of cannons firing
 * @param distance - Distance to target (1-10)
 * @param moraleMultiplier - Crew morale effect (0-1.5, typically)
 * @param windSeverity - Wind condition (0-3)
 * @returns Hit chance (0-1)
 */
export const calculateHitChance = (
  cannons: number,
  distance: number,
  moraleMultiplier: number,
  windSeverity: 0 | 1 | 2 | 3
): number => {
  const windFactor = getWindFactor(windSeverity)
  const baseChance = cannons * 0.15 - distance * 0.05
  const hitChance = baseChance * moraleMultiplier * windFactor
  return Math.max(0, Math.min(1, hitChance)) // Clamp 0-1
}

/**
 * Calculate damage from cannon fire if hit.
 * 
 * Damage = Random(1, Cannons × 3)
 * 
 * The more cannons firing, the higher potential damage.
 * Damage is randomized to add tension and variation.
 * 
 * @param cannons - Number of cannons firing
 * @returns Damage dealt (1 to Cannons×3)
 */
export const calculateDamage = (cannons: number): number => {
  return Math.floor(Math.random() * (cannons * 3)) + 1
}

/**
 * Calculate crew casualties from damage taken.
 * 
 * Crew Loss = Damage ÷ 10 (minimum 1)
 * 
 * Higher damage results in more crew losses.
 * At least 1 crew is lost per hit.
 * 
 * @param damage - Damage dealt to ship
 * @param maxCrew - Total crew available (used for proportion calculation)
 * @returns Number of crew lost (minimum 1)
 */
export const applyCrewCasualties = (damage: number, maxCrew: number): number => {
  // Crew loss is proportional to damage
  const crewLoss = Math.floor(damage / 10)
  return Math.max(1, crewLoss)
}

/**
 * Update morale based on battle outcome.
 * 
 * - Victory (hit or successful defense): multiply by 1.2 (max 1.5)
 * - Loss/Miss: multiply by 0.9 (min 0.3)
 * - Fleeing: multiply by 0.8 (min 0.2)
 * 
 * Morale affects hit chance and crew combat effectiveness.
 * Very high morale (above 1.2) makes crew overconfident.
 * Very low morale (below 0.3) makes crew unreliable.
 * 
 * @param currentMorale - Current morale (0-2)
 * @param outcome - 'victory' | 'defeat' | 'flee'
 * @returns New morale multiplier (0.2-1.5)
 */
export const updateMorale = (
  currentMorale: number,
  outcome: 'victory' | 'defeat' | 'flee'
): number => {
  let newMorale: number

  if (outcome === 'victory') {
    newMorale = currentMorale * 1.2 // +20% boost
  } else if (outcome === 'defeat') {
    newMorale = currentMorale * 0.9 // -10% penalty
  } else {
    // flee
    newMorale = currentMorale * 0.8 // -20% penalty
  }

  return Math.max(0.2, Math.min(1.5, newMorale)) // Clamp 0.2-1.5
}

/**
 * Determine success of boarding action.
 * 
 * Boarding success is a crew vs crew engagement.
 * Outcome depends on crew numbers, morale, and randomness.
 * 
 * Success Chance = PlayerCrew × PlayerMorale / (EnemyCrew × 0.75)
 * Then randomized: success if Random() < Success Chance
 * 
 * Crew losses from boarding: 10-30% of initiator crew
 * Defender loses approximately the same or more if initiator wins
 * 
 * @param playerCrew - Player's crew count
 * @param playerMorale - Player's morale (0-1.5)
 * @param enemyCrew - Enemy's crew count
 * @param enemyMorale - Enemy's morale (0-1.5)
 * @returns Object with { success, playerCrewLoss, enemyCrewLoss }
 */
export const determineBoardingSuccess = (
  playerCrew: number,
  playerMorale: number,
  enemyCrew: number,
  enemyMorale: number
): {
  success: boolean
  playerCrewLoss: number
  enemyCrewLoss: number
} => {
  // Calculate base success chance
  const crewRatio = (playerCrew * playerMorale) / (enemyCrew * enemyMorale * 0.75)
  const successChance = Math.min(1, Math.max(0, crewRatio * 0.4))

  const success = Math.random() < successChance

  // Calculate crew losses (10-30% of attacker)
  const playerLossPercentage = Math.random() * 0.2 + 0.1 // 10-30%
  const playerCrewLoss = Math.floor(playerCrew * playerLossPercentage)

  // If successful, enemy loses more (30-50% of defender)
  // If defeated, attacker loses more (already calculated)
  const enemyLossPercentage = success
    ? Math.random() * 0.2 + 0.3 // 30-50%
    : Math.random() * 0.15 + 0.1 // 10-25%

  const enemyCrewLoss = Math.floor(enemyCrew * enemyLossPercentage)

  return {
    success,
    playerCrewLoss: Math.max(1, playerCrewLoss),
    enemyCrewLoss: Math.max(1, enemyCrewLoss),
  }
}

/**
 * Execute a round of cannon combat.
 * 
 * Returns damage and casualties for both ships.
 * Both ships fire simultaneously (naval combat).
 * 
 * @param playerCannons - Number of player cannons
 * @param playerMorale - Player morale (0-1.5)
 * @param distance - Distance between ships (1-10)
 * @param windSeverity - Wind condition (0-3)
 * @param enemyCannons - Number of enemy cannons
 * @param enemyMorale - Enemy morale (0-1.5)
 * @returns Combat results for player and enemy
 */
export const executeCombatRound = (
  playerCannons: number,
  playerMorale: number,
  distance: number,
  windSeverity: 0 | 1 | 2 | 3,
  enemyCannons: number,
  enemyMorale: number,
  aimedHit?: boolean,
  difficulty = 1
): {
  playerHit: boolean
  playerDamage: number
  playerCrewLoss: number
  enemyHit: boolean
  enemyDamage: number
  enemyCrewLoss: number
} => {
  // Player fires
  const playerHitChance = calculateHitChance(
    playerCannons,
    distance,
    playerMorale,
    windSeverity
  )
  const playerHit = playerCannons > 0 && (aimedHit ?? Math.random() < playerHitChance)
  const assisted = aimedHit !== undefined && difficulty <= 1
  const playerDamage = playerHit ? calculateDamage(playerCannons) + (assisted ? playerCannons * 2 : 0) : 0
  const playerCrewLoss = playerHit ? applyCrewCasualties(playerDamage, 200) : 0

  // Enemy fires back
  const enemyHitChance = calculateHitChance(
    enemyCannons,
    distance,
    enemyMorale,
    windSeverity
  )
  const enemyHit = enemyCannons > 0 && Math.random() < enemyHitChance * (assisted ? 0.65 : 1)
  const enemyDamage = enemyHit ? (assisted ? Math.min(15, Math.max(1, Math.floor(calculateDamage(enemyCannons) * 0.6))) : calculateDamage(enemyCannons)) : 0
  const enemyCrewLoss = enemyHit ? applyCrewCasualties(enemyDamage, 200) : 0

  return {
    playerHit,
    playerDamage,
    playerCrewLoss,
    enemyHit,
    enemyDamage,
    enemyCrewLoss,
  }
}

/**
 * Check if battle is over (one side defeated).
 * 
 * Battle ends when either ship has:
 * - Hull integrity ≤ 0
 * - Crew ≤ 0
 * 
 * @param playerHull - Player's remaining hull integrity
 * @param playerCrew - Player's remaining crew
 * @param enemyHull - Enemy's remaining hull integrity
 * @param enemyCrew - Enemy's remaining crew
 * @returns { isOver: boolean, winner?: 'player' | 'enemy', reason?: string }
 */
export const checkBattleEnd = (
  playerHull: number,
  playerCrew: number,
  enemyHull: number,
  enemyCrew: number
): {
  isOver: boolean
  winner?: 'player' | 'enemy'
  reason?: string
} => {
  if (playerHull <= 0) {
    return { isOver: true, winner: 'enemy', reason: 'hull_destroyed' }
  }
  if (playerCrew <= 0) {
    return { isOver: true, winner: 'enemy', reason: 'crew_lost' }
  }
  if (enemyHull <= 0) {
    return { isOver: true, winner: 'player', reason: 'hull_destroyed' }
  }
  if (enemyCrew <= 0) {
    return { isOver: true, winner: 'player', reason: 'crew_lost' }
  }

  return { isOver: false }
}

/**
 * Format combat action for log display.
 * 
 * @param actor - 'Player' | 'Enemy'
 * @param action - 'fired' | 'hit' | 'miss' | 'boarded' | 'yielded'
 * @param details - Additional details (damage, casualties, etc)
 * @returns Formatted log string
 */
export const formatCombatLog = (
  actor: string,
  action: string,
  details?: { damage?: number; crewLoss?: number; distance?: number }
): string => {
  const actions: Record<string, MessageKey> = {
    fired: 'logFired', hit: 'logHit', miss: 'logMiss', boarded: 'logBoarded',
    yielded: 'logFled', victory: 'logVictory', defeat: 'logDefeat',
  }
  const name = actor === 'Player' ? t('player') : actor === 'Enemy' ? t('enemy') : translateData(actor)
  let msg = t(actions[action] || 'logFired', {
    actor: name, damage: details?.damage ?? 0, crew: details?.crewLoss ?? 0,
  })
  if (details?.crewLoss && action !== 'boarded') msg += t('logCrew', { crew: details.crewLoss })
  if (details?.distance) msg += t('logRange', { distance: details.distance })

  return msg
}

export const combatLogEntry = (...args: Parameters<typeof formatCombatLog>): (() => string) => {
  return () => formatCombatLog(...args)
}
