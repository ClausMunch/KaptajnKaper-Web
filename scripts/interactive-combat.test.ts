import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateAimImpact, boardingRound, executeCombatRound } from '../src/game/CombatEngine'

test('original-style elevation and wind correction control hits', () => {
  assert.equal(calculateAimImpact(0, 0, 700, 0, 0, 0, () => 0.5).hit, true)
  assert.equal(calculateAimImpact(0, 0, 900, 0, 0, 0, () => 0.5).hit, false)
  assert.equal(calculateAimImpact(0, -20, 900, 0, 0, 0, () => 0.5).hit, true)
  assert.equal(calculateAimImpact(0, -20, 900, 1, 0, 6, () => 0.5).hit, false)
  assert.equal(calculateAimImpact(30, -20, 900, 1, 0, 6, () => 0.5).hit, true)
  assert.equal(executeCombatRound(4, 1, 5, 0, 1, 1, true).playerHit, true)
  assert.equal(executeCombatRound(4, 1, 5, 0, 1, 1, false).playerHit, false)
  assert.equal(executeCombatRound(0, 1, 5, 0, 1, 1, true).playerHit, false)
})

test('boarding tactics trade casualties for progress without negative crew', () => {
  const assault = boardingRound(100, 1, 80, 1, 'assault', () => 0.5)
  const guard = boardingRound(100, 1, 80, 1, 'guard', () => 0.5)
  assert.ok(assault.enemyCrewLoss > guard.enemyCrewLoss)
  assert.ok(assault.playerCrewLoss > guard.playerCrewLoss)
  assert.deepEqual(boardingRound(1, 1, 1, 1, 'assault', () => 1), { playerCrewLoss: 1, enemyCrewLoss: 1 })
})

test('normal combat tolerates near misses and gives the starting ship a fighting chance', () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    assert.equal(calculateAimImpact(10, 5, 700, 0, 0, 0, random).hit, true)
    assert.equal(calculateAimImpact(-10, -5, 700, 0, 0, 0, random).hit, true)
    assert.equal(calculateAimImpact(30, 0, 700, 0, 0, 0, random).hit, false)
    assert.equal(calculateAimImpact(0, 20, 700, 0, 0, 0, random).hit, false)
  }
  for (let shot = 0; shot < 100; shot++) {
    const normal = executeCombatRound(4, 1, 5, 0, 70, 1, true, 1)
    assert.ok(normal.playerDamage >= 9 && normal.playerDamage <= 20)
    assert.ok(normal.enemyDamage <= 15)
    assert.ok(executeCombatRound(4, 1, 5, 0, 5, 1, true, 3).playerDamage <= 12)
  }
})