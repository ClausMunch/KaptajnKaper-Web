import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMapData } from '../src/data'
import { isInBounds, isLand, isHarbor } from '../src/utils/MapUtils'

test('chart terrain is valid and all seven ports are reachable from the start', () => {
  const map = getMapData()
  const land = new Set(map.landTiles.map(([x, y]) => `${x},${y}`))
  assert.equal(land.size, map.landTiles.length)
  for (const [x, y] of map.landTiles) assert.ok(isInBounds(x, y))
  assert.ok(!isLand(map.startPosition.x, map.startPosition.y))
  const visited = new Set<string>()
  const queue = [map.startPosition]
  for (const { x, y } of queue) {
    if (!isInBounds(x, y) || isLand(x, y) || visited.has(`${x},${y}`)) continue
    visited.add(`${x},${y}`)
    if (isHarbor(x, y)) continue
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) queue.push({ x: x + dx, y: y + dy })
  }
  assert.equal(map.harborLocations.length, 7)
  for (const harbor of map.harborLocations) assert.ok(visited.has(`${harbor.x},${harbor.y}`), harbor.name)
})