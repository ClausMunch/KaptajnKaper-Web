/**
 * TradingEngine - Commerce logic for harbor trading
 * Handles price calculation, buy/sell transactions, crew hiring, and hull repair
 */

import { GameState } from './GameState'
import { getGameConfig } from '../data'
import { t } from '../i18n'

export interface Prices {
  grain: number
  cannon: number
  crewPerPerson: number
  repairPerPoint: number
  gemsSell: number
}

export interface TradeResult {
  success: boolean
  newState?: GameState
  message: string
  cost?: number
}

/**
 * Price variance algorithm
 * Each harbor has slightly different economic conditions based on its ID and the current turn
 * This simulates supply/demand fluctuations and harbor specialization
 */
export const getPrices = (harborId: number, turn: number): Prices => {
  const config = getGameConfig()
  const baseGrainPrice = 10
  
  // Harbor-based price variance (±10-20% from base)
  // Capital (København) has stable prices; others vary more
  const harborVariance = (harborId) => {
    const variances: { [key: number]: number } = {
      2: 1.0,    // København (capital) - stable baseline
      3: 0.95,   // Helsingør - slightly cheaper grain
      4: 1.1,    // Hundested - grain more expensive
      5: 0.8,    // Grenå - cheap grain (south)
      6: 0.9,    // Ebeltoft - medium cheap
      7: 1.05,   // Kalundborg - slightly expensive
      8: 1.15,   // Mølle - expensive (north)
    }
    return variances[harborId] || 1.0
  }
  
  // Turn-based supply/demand fluctuation (cyclical)
  const turnVariance = 1 + 0.1 * Math.sin(turn / 30)
  
  const grainPrice = Math.round(baseGrainPrice * harborVariance(harborId) * turnVariance)
  
  return {
    grain: Math.max(5, grainPrice), // Never go below 5
    cannon: config.prices.cannon,
    crewPerPerson: config.prices.crewPerPerson,
    repairPerPoint: config.prices.repairPerPoint,
    gemsSell: config.prices.gemsSell,
  }
}

/**
 * Check if player can afford to buy grain
 */
export const canBuyGrain = (player: GameState, amount: number, pricePerUnit: number): boolean => {
  const totalCost = amount * pricePerUnit
  return player.rigsdaler >= totalCost && player.grain + amount <= getGameConfig().maxGrain
}

/**
 * Check if player can afford to buy cannons
 */
export const canBuyCannon = (
  player: GameState,
  quantity: number,
  pricePerCannon: number
): boolean => {
  const totalCost = quantity * pricePerCannon
  return player.rigsdaler >= totalCost && player.cannons + quantity <= getGameConfig().maxCannons
}

/**
 * Check if player can sell grain
 */
export const canSellGrain = (player: GameState, amount: number): boolean => {
  return player.grain >= amount
}

/**
 * Check if player can sell gems
 */
export const canSellGems = (player: GameState, quantity: number): boolean => {
  return (player as any).gems >= quantity
}

/**
 * Buy grain at current harbor
 */
export const buyGrain = (
  player: GameState,
  quantity: number,
  pricePerUnit: number
): TradeResult => {
  const totalCost = quantity * pricePerUnit
  const config = getGameConfig()
  
  if (!canBuyGrain(player, quantity, pricePerUnit)) {
    if (player.rigsdaler < totalCost) {
      return { success: false, get message() { return t('notEnoughMoney') } }
    }
    return { success: false, get message() { return t('grainFull') } }
  }
  
  const newState = { ...player }
  newState.rigsdaler -= totalCost
  newState.grain = Math.min(config.maxGrain, newState.grain + quantity)
  
  return {
    success: true,
    newState,
    get message() { return t('boughtGrain', { quantity, cost: totalCost }) },
    cost: totalCost,
  }
}

/**
 * Sell grain at current harbor
 */
export const sellGrain = (
  player: GameState,
  quantity: number,
  pricePerUnit: number
): TradeResult => {
  const totalValue = quantity * pricePerUnit
  const config = getGameConfig()
  
  if (!canSellGrain(player, quantity)) {
    return { success: false, get message() { return t('notEnoughGrain') } }
  }
  
  const newState = { ...player }
  newState.grain -= quantity
  newState.rigsdaler = Math.min(config.maxRigsdaler, newState.rigsdaler + totalValue)
  
  return {
    success: true,
    newState,
    get message() { return t('soldGrain', { quantity, cost: totalValue }) },
    cost: totalValue,
  }
}

/**
 * Buy cannons at current harbor
 */
export const buyCannon = (
  player: GameState,
  quantity: number,
  pricePerCannon: number
): TradeResult => {
  const totalCost = quantity * pricePerCannon
  const config = getGameConfig()
  
  if (!canBuyCannon(player, quantity, pricePerCannon)) {
    if (player.rigsdaler < totalCost) {
      return { success: false, get message() { return t('notEnoughMoney') } }
    }
    return { success: false, get message() { return t('cannonsFull') } }
  }
  
  const newState = { ...player }
  newState.rigsdaler -= totalCost
  newState.cannons = Math.min(config.maxCannons, newState.cannons + quantity)
  
  return {
    success: true,
    newState,
    get message() { return t('boughtCannons', { quantity, cost: totalCost }) },
    cost: totalCost,
  }
}

/**
 * Sell cannons at current harbor (cannons worth 50% of purchase price)
 */
export const sellCannon = (
  player: GameState,
  quantity: number,
  pricePerCannon: number
): TradeResult => {
  const sellPrice = Math.round(pricePerCannon * 0.5)
  const totalValue = quantity * sellPrice
  const config = getGameConfig()
  
  if (player.cannons < quantity) {
    return { success: false, get message() { return t('notEnoughCannons') } }
  }
  
  const newState = { ...player }
  newState.cannons -= quantity
  newState.rigsdaler = Math.min(config.maxRigsdaler, newState.rigsdaler + totalValue)
  
  return {
    success: true,
    newState,
    get message() { return t('soldCannons', { quantity, cost: totalValue }) },
    cost: totalValue,
  }
}

/**
 * Sell gems at current harbor (gems are rare and only sold, never bought)
 */
export const sellGems = (player: GameState, quantity: number, pricePerGem: number): TradeResult => {
  const totalValue = quantity * pricePerGem
  const config = getGameConfig()
  
  const playerGems = (player as any).gems || 0
  
  if (playerGems < quantity) {
    return { success: false, get message() { return t('notEnoughGems') } }
  }
  
  const newState = { ...player }
  ;(newState as any).gems = playerGems - quantity
  newState.rigsdaler = Math.min(config.maxRigsdaler, newState.rigsdaler + totalValue)
  
  return {
    success: true,
    newState,
    get message() { return t('soldGems', { quantity, cost: totalValue }) },
    cost: totalValue,
  }
}

/**
 * Hire a crew member at current harbor
 */
export const hireCrewMember = (player: GameState, costPerPerson: number): TradeResult => {
  const config = getGameConfig()
  
  if (player.rigsdaler < costPerPerson) {
    return { success: false, get message() { return t('hireMoney') } }
  }
  
  if (player.crew >= config.crewCapacity) {
    return { success: false, get message() { return t('crewFull') } }
  }
  
  const newState = { ...player }
  newState.rigsdaler -= costPerPerson
  newState.crew += 1
  
  return {
    success: true,
    newState,
    get message() { return t('hiredCrew', { quantity: 1, cost: costPerPerson }) },
    cost: costPerPerson,
  }
}

/**
 * Hire multiple crew members
 */
export const hireCrewMembers = (
  player: GameState,
  quantity: number,
  costPerPerson: number
): TradeResult => {
  const config = getGameConfig()
  const totalCost = quantity * costPerPerson
  
  if (player.rigsdaler < totalCost) {
    return { success: false, get message() { return t('notEnoughMoney') } }
  }
  
  const availableSlots = config.crewCapacity - player.crew
  if (availableSlots < quantity) {
    return {
      success: false,
      get message() { return t('hireSlots', { quantity: availableSlots }) },
    }
  }
  
  const newState = { ...player }
  newState.rigsdaler -= totalCost
  newState.crew += quantity
  
  return {
    success: true,
    newState,
    get message() { return t('hiredCrew', { quantity, cost: totalCost }) },
    cost: totalCost,
  }
}

/**
 * Repair hull at current harbor
 */
export const repairHull = (
  player: GameState,
  repairPoints: number,
  costPerPoint: number
): TradeResult => {
  const config = getGameConfig()
  const totalCost = repairPoints * costPerPoint
  
  if (player.rigsdaler < totalCost) {
    return { success: false, get message() { return t('repairMoney') } }
  }
  
  if (player.hullIntegrity >= player.maxHullIntegrity) {
    return { success: false, get message() { return t('hullFull') } }
  }
  
  const newState = { ...player }
  newState.rigsdaler -= totalCost
  newState.hullIntegrity = Math.min(player.maxHullIntegrity, newState.hullIntegrity + repairPoints)
  
  const actualRepaired = newState.hullIntegrity - player.hullIntegrity
  const actualCost = actualRepaired * costPerPoint
  newState.rigsdaler += totalCost - actualCost // Refund overpayment
  
  return {
    success: true,
    newState,
    get message() { return t('repaired', { quantity: actualRepaired, cost: actualCost }) },
    cost: actualCost,
  }
}

/**
 * Repair hull to maximum (auto-calculates points needed)
 */
export const repairHullToMax = (player: GameState, costPerPoint: number): TradeResult => {
  const pointsNeeded = player.maxHullIntegrity - player.hullIntegrity
  
  if (pointsNeeded <= 0) {
    return { success: false, get message() { return t('hullFull') } }
  }
  
  return repairHull(player, pointsNeeded, costPerPoint)
}

/**
 * Get resource capacity status
 */
export const getResourceStatus = (
  player: GameState
): {
  crew: string
  grain: string
  cannons: string
  rigsdaler: string
} => {
  const config = getGameConfig()
  
  return {
    crew: `${player.crew}/${config.crewCapacity}`,
    grain: `${player.grain}/${config.maxGrain}`,
    cannons: `${player.cannons}/${config.maxCannons}`,
    rigsdaler: `${player.rigsdaler}/${config.maxRigsdaler}`,
  }
}

/**
 * Check if any resource is at capacity
 */
export const isAtCapacity = (player: GameState, resource: 'crew' | 'grain' | 'cannons'): boolean => {
  const config = getGameConfig()
  const limits = {
    crew: config.crewCapacity,
    grain: config.maxGrain,
    cannons: config.maxCannons,
  }
  
  return player[resource] >= limits[resource]
}
