import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInitialGameState } from '../src/game/GameState'
import { advanceSea, populateSea } from '../src/game/SeaEncounters'
import { isInBounds, isLand, isHarbor } from '../src/utils/MapUtils'

test('sea traffic stays navigable, persists, and resolves ship and storm contact', () => {
  const state = createInitialGameState()
  populateSea(state, () => 0.5)
  assert.equal(state.seaContacts!.length, 11)
  assert.equal(new Set(state.seaContacts!.map(contact => `${contact.x},${contact.y}`)).size, 11)
  const snapshot = JSON.stringify(state.seaContacts)
  populateSea(state, () => 0)
  assert.equal(JSON.stringify(state.seaContacts), snapshot)
  for (let turn = 1; turn <= 100; turn++) {
    state.turnsElapsed = turn
    advanceSea(state, () => 0.5)
    for (const contact of state.seaContacts!) {
      assert.ok(isInBounds(contact.x, contact.y) && !isLand(contact.x, contact.y) && !isHarbor(contact.x, contact.y))
    }
    assert.equal(new Set(state.seaContacts!.map(contact => `${contact.x},${contact.y}`)).size, state.seaContacts!.length)
  }
  state.turnsElapsed = 1
  state.seaContacts = [{ ...state.currentMapTile, kind: 'enemy', enemyId: 6 }]
  assert.equal(advanceSea(state).enemyId, 6)
  assert.equal(state.seaContacts.length, 0)
  state.seaContacts = [{ ...state.currentMapTile, kind: 'storm' }]
  state.hullIntegrity = 3
  assert.equal(advanceSea(state, () => 0).stormDamage, 7)
  assert.equal(state.hullIntegrity, 0)
})