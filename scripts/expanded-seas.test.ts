import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMapData, getHarbors, getHarborById } from '../src/data'
import { buyGrain, getPrices, repairHull } from '../src/game/TradingEngine'
import { createInitialGameState } from '../src/game/GameState'
import { advanceSea, getStormProfile, populateSea } from '../src/game/SeaEncounters'
import { isHarbor, isInBounds, isLand } from '../src/utils/MapUtils'

test('expanded seas are four times larger with reachable ports and both oceans', () => {
  const map = getMapData('expanded')
  assert.equal(getHarbors().length, 7)
  assert.equal(getHarbors('expanded').length, 18)
  assert.equal(map.harborLocations.length, 18)
  assert.equal(new Set(map.harborLocations.map(port => port.harborId)).size, 18)
  assert.equal(new Set(map.harborLocations.map(port => `${port.x},${port.y}`)).size, 18)
  assert.deepEqual(getMapData().dimensions, { width: 30, height: 15 })
  assert.deepEqual(map.dimensions, { width: 60, height: 30 })
  assert.equal(new Set(map.landTiles.map(tile => tile.join(','))).size, map.landTiles.length)
  for (const [tileX, tileY] of map.landTiles) assert.ok(isInBounds(tileX, tileY, map))
  const state = createInitialGameState(1, 'Kaper', 'expanded')
  assert.deepEqual(state.currentMapTile, map.startPosition)
  const visited = new Set<string>()
  const queue = [state.currentMapTile]
  for (const tile of queue) {
    const key = `${tile.x},${tile.y}`
    if (!isInBounds(tile.x, tile.y, map) || isLand(tile.x, tile.y, map) || visited.has(key)) continue
    visited.add(key)
    if (isHarbor(tile.x, tile.y, map)) continue
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) queue.push({ x: tile.x + dx, y: tile.y + dy })
  }
  for (const port of map.harborLocations) {
    assert.ok(visited.has(`${port.x},${port.y}`), port.name)
    assert.equal(getHarborById(port.harborId)?.name, port.name)
    const metadata = getHarbors('expanded').find(harbor => harbor.id === port.harborId)!
    assert.deepEqual(metadata.position, { x: port.x, y: port.y })
    const prices = getPrices(port.harborId, 0)
    const trade = buyGrain(state, 1, prices.grain)
    assert.equal(trade.success, true, port.name)
    assert.equal(trade.newState?.worldMode, 'expanded')
    assert.equal(repairHull({ ...state, hullIntegrity: 80 }, 1, prices.repairPerPoint).success, true, port.name)
  }
  for (const ocean of ['5,15', '43,20']) assert.ok(visited.has(ocean), ocean)
  populateSea(state, () => 0.5)
  assert.equal(state.seaContacts!.filter(contact => contact.kind === 'storm').length, 9)
  for (let turn = 1; turn <= 60; turn++) {
    state.turnsElapsed = turn
    advanceSea(state, () => 0.5)
    for (const contact of state.seaContacts!) {
      assert.ok(isInBounds(contact.x, contact.y, map) && !isLand(contact.x, contact.y, map) && !isHarbor(contact.x, contact.y, map))
    }
  }
})

test('Oresund and Great Belt have continuous sailing lanes clear of harbors', () => {
  const map = getMapData('expanded')
  const routes = [
    [[27, 20], [27, 21], [28, 21], [29, 21], [29, 22], [29, 23], [29, 24], [29, 25], [29, 26], [29, 27]],
    [[22, 20], [22, 21], [22, 22], [22, 23], [22, 24], [22, 25], [22, 26], [22, 27], [23, 27], [24, 27], [24, 28], [25, 28], [26, 28], [27, 28], [28, 28], [29, 28]],
  ]
  for (const route of routes) {
    for (const [index, [tileX, tileY]] of route.entries()) {
      assert.ok(isInBounds(tileX, tileY, map))
      assert.equal(isLand(tileX, tileY, map), false, `Land blocks passage at ${tileX},${tileY}`)
      assert.equal(isHarbor(tileX, tileY, map), null, `Harbor blocks passage at ${tileX},${tileY}`)
      if (index > 0) assert.equal(Math.abs(tileX - route[index - 1][0]) + Math.abs(tileY - route[index - 1][1]), 1)
    }
  }
})

test('offshore storms have a five-tile footprint, stronger damage and coastal shelter', () => {
  const state = createInitialGameState(1, 'Kaper', 'expanded')
  const center = { x: 6, y: 16 }
  assert.equal(getStormProfile(state, center).radius, 2)
  assert.equal(getStormProfile(state, { x: 13, y: 16 }).radius, 0)
  assert.equal(getStormProfile(createInitialGameState(), center).radius, 0)
  state.seaContacts = [{ ...center, kind: 'storm' }]
  state.turnsElapsed = 1
  state.currentMapTile = { x: 8, y: 18 }
  assert.equal(advanceSea(state, () => 0).stormDamage, 20)
  state.currentMapTile = { x: 9, y: 18 }
  assert.equal(advanceSea(state, () => 0).stormDamage, 0)
  state.currentMapTile = center
  state.hullIntegrity = 3
  assert.equal(advanceSea(state, () => 0.999).stormDamage, 37)
  assert.equal(state.hullIntegrity, 0)
})