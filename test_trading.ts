/**
 * Trading System Test - Verify all trading functions work correctly
 * This is a verification script to test the TradingEngine logic
 */

import { GameState, createInitialGameState } from './src/game/GameState'
import {
  getPrices,
  buyGrain,
  sellGrain,
  buyCannon,
  sellCannon,
  sellGems,
  hireCrewMember,
  hireCrewMembers,
  repairHull,
  repairHullToMax,
  getResourceStatus,
} from './src/game/TradingEngine'

const testTradingEngine = () => {
  console.log('🧪 Testing Trading Engine...\n')
  
  // Create initial game state
  const state = createInitialGameState(1)
  console.log('Initial State:')
  console.log(`  Crew: ${state.crew}, Grain: ${state.grain}, Rigsdaler: ${state.rigsdaler}, Cannons: ${state.cannons}, Hull: ${state.hullIntegrity}%`)
  
  // Test prices at Copenhagen (harbor ID 2)
  console.log('\n📊 Testing Price Calculation:')
  const pricesKøbenhavn = getPrices(2, 0)
  console.log(`  Copenhagen (turn 0): Grain=${pricesKøbenhavn.grain}, Cannon=${pricesKøbenhavn.cannon}, Crew=${pricesKøbenhavn.crewPerPerson}, Repair=${pricesKøbenhavn.repairPerPoint}`)
  
  const pricesHelsingør = getPrices(3, 0)
  console.log(`  Helsingør (turn 0): Grain=${pricesHelsingør.grain} (cheaper)`)
  
  const pricesMølle = getPrices(8, 0)
  console.log(`  Mølle (turn 0): Grain=${pricesMølle.grain} (more expensive)`)
  
  // Test buying grain
  console.log('\n🌾 Testing Grain Trading:')
  let currentState = state
  let result = buyGrain(currentState, 5, pricesKøbenhavn.grain)
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test selling grain
  result = sellGrain(currentState, 3, Math.round(pricesKøbenhavn.grain * 0.8))
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test buying cannons
  console.log('\n🔫 Testing Cannon Trading:')
  result = buyCannon(currentState, 2, pricesKøbenhavn.cannon)
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test selling cannons
  result = sellCannon(currentState, 1, Math.round(pricesKøbenhavn.cannon * 0.5))
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test hiring crew
  console.log('\n👥 Testing Crew Hiring:')
  result = hireCrewMember(currentState, pricesKøbenhavn.crewPerPerson)
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test hiring multiple crew
  result = hireCrewMembers(currentState, 5, pricesKøbenhavn.crewPerPerson)
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test repairing hull
  console.log('\n🔧 Testing Hull Repair:')
  currentState.hullIntegrity = 75 // Simulate damage
  result = repairHull(currentState, 10, pricesKøbenhavn.repairPerPoint)
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test repairing to max
  result = repairHullToMax(currentState, pricesKøbenhavn.repairPerPoint)
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test selling gems
  console.log('\n💎 Testing Gem Selling:')
  ;(currentState as any).gems = 2
  result = sellGems(currentState, 1, pricesKøbenhavn.gemsSell)
  if (result.success && result.newState) {
    currentState = result.newState
    console.log(`  ✓ ${result.message}`)
  } else {
    console.log(`  ✗ ${result.message}`)
  }
  
  // Test resource status
  console.log('\n📊 Final Resource Status:')
  const status = getResourceStatus(currentState)
  console.log(`  Crew: ${status.crew}`)
  console.log(`  Grain: ${status.grain}`)
  console.log(`  Cannons: ${status.cannons}`)
  console.log(`  Rigsdaler: ${status.rigsdaler}`)
  
  console.log('\n✅ Trading Engine tests complete!')
}

testTradingEngine()
