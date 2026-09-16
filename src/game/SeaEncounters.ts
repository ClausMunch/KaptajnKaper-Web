import type { GameState } from './GameState'
import { getEnemyTypes, getMapData } from '../data'
import { isInBounds, isLand, isHarbor } from '../utils/MapUtils'

const openSea = (x: number, y: number, map = getMapData()) => isInBounds(x, y, map) && !isLand(x, y, map) && !isHarbor(x, y, map)
const sameTile = (first: { x: number; y: number }, second: { x: number; y: number }) => first.x === second.x && first.y === second.y

export function getStormProfile(state: GameState, position: { x: number; y: number }) {
  const map = getMapData(state.worldMode)
  const offshore = state.worldMode === 'expanded' && !map.landTiles.some(([landX, landY]) =>
    Math.max(Math.abs(landX - position.x), Math.abs(landY - position.y)) <= 2)
  return offshore
    ? { radius: 2, minDamage: 18, variation: 18, moveEvery: 2 }
    : { radius: 0, minDamage: 5, variation: 8, moveEvery: 3 }
}

export function populateSea(state: GameState, random = Math.random): void {
  state.seaContacts ??= []
  const map = getMapData(state.worldMode)
  const { width, height } = map.dimensions
  const available = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (openSea(x, y, map) && Math.max(Math.abs(x - state.currentMapTile.x), Math.abs(y - state.currentMapTile.y)) >= 4 &&
        !state.seaContacts.some(contact => sameTile(contact, { x, y }))) available.push({ x, y })
    }
  }
  const missing: NonNullable<GameState['seaContacts']> = getEnemyTypes()
    .filter(enemy => !state.seaContacts!.some(contact => contact.kind === 'enemy' && contact.enemyId === enemy.id))
    .map(enemy => ({ kind: 'enemy', enemyId: enemy.id, x: 0, y: 0 }))
  for (let count = state.seaContacts.filter(contact => contact.kind === 'storm').length; count < (state.worldMode === 'expanded' ? 9 : 3); count++) {
    missing.push({ kind: 'storm', x: 0, y: 0 })
  }
  for (const contact of missing) {
    if (!available.length) break
    const [tile] = available.splice(Math.floor(random() * available.length), 1)
    state.seaContacts.push({ ...contact, ...tile })
  }
}

export function advanceSea(state: GameState, random = Math.random): { enemyId?: number; stormDamage: number } {
  const map = getMapData(state.worldMode)
  const result: { enemyId?: number; stormDamage: number } = { stormDamage: 0 }
  for (const contact of state.seaContacts ?? []) {
    const storm = getStormProfile(state, contact)
    const coversPlayer = () => Math.max(Math.abs(contact.x - state.currentMapTile.x), Math.abs(contact.y - state.currentMapTile.y)) <= getStormProfile(state, contact).radius
    if (!(contact.kind === 'storm' ? coversPlayer() : sameTile(contact, state.currentMapTile)) && state.turnsElapsed % (contact.kind === 'storm' ? storm.moveEvery : 2) === 0) {
      const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      const nearby = Math.max(Math.abs(contact.x - state.currentMapTile.x), Math.abs(contact.y - state.currentMapTile.y)) <= 4
      if (contact.kind === 'enemy' && nearby) {
        directions.sort(([firstX, firstY], [secondX, secondY]) =>
          Math.hypot(contact.x + firstX - state.currentMapTile.x, contact.y + firstY - state.currentMapTile.y) -
          Math.hypot(contact.x + secondX - state.currentMapTile.x, contact.y + secondY - state.currentMapTile.y))
      } else {
        const offset = Math.floor(random() * directions.length)
        directions.push(...directions.splice(0, offset))
      }
      const direction = directions.find(([dx, dy]) => openSea(contact.x + dx, contact.y + dy, map) &&
        !state.seaContacts!.some(other => other !== contact && other.x === contact.x + dx && other.y === contact.y + dy))
      if (direction) { contact.x += direction[0]; contact.y += direction[1] }
    }
    if (contact.kind === 'storm' ? coversPlayer() : sameTile(contact, state.currentMapTile)) {
      if (contact.kind === 'enemy') result.enemyId = contact.enemyId
      else {
        const profile = getStormProfile(state, contact)
        result.stormDamage = Math.max(result.stormDamage, profile.minDamage + Math.floor(random() * profile.variation) + state.difficulty * 2)
      }
    }
  }
  state.hullIntegrity = Math.max(0, state.hullIntegrity - result.stormDamage)
  if (result.enemyId !== undefined) {
    state.seaContacts = state.seaContacts!.filter(contact => contact.kind !== 'enemy' || contact.enemyId !== result.enemyId)
  }
  return result
}