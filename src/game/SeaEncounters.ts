import type { GameState } from './GameState'
import { getEnemyTypes, getMapData } from '../data'
import { isInBounds, isLand, isHarbor } from '../utils/MapUtils'

const openSea = (x: number, y: number) => isInBounds(x, y) && !isLand(x, y) && !isHarbor(x, y)
const sameTile = (first: { x: number; y: number }, second: { x: number; y: number }) => first.x === second.x && first.y === second.y

export function populateSea(state: GameState, random = Math.random): void {
  state.seaContacts ??= []
  const { width, height } = getMapData().dimensions
  const available = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (openSea(x, y) && Math.max(Math.abs(x - state.currentMapTile.x), Math.abs(y - state.currentMapTile.y)) >= 4 &&
        !state.seaContacts.some(contact => sameTile(contact, { x, y }))) available.push({ x, y })
    }
  }
  const missing: NonNullable<GameState['seaContacts']> = getEnemyTypes()
    .filter(enemy => !state.seaContacts!.some(contact => contact.kind === 'enemy' && contact.enemyId === enemy.id))
    .map(enemy => ({ kind: 'enemy', enemyId: enemy.id, x: 0, y: 0 }))
  for (let count = state.seaContacts.filter(contact => contact.kind === 'storm').length; count < 3; count++) {
    missing.push({ kind: 'storm', x: 0, y: 0 })
  }
  for (const contact of missing) {
    if (!available.length) break
    const [tile] = available.splice(Math.floor(random() * available.length), 1)
    state.seaContacts.push({ ...contact, ...tile })
  }
}

export function advanceSea(state: GameState, random = Math.random): { enemyId?: number; stormDamage: number } {
  const result: { enemyId?: number; stormDamage: number } = { stormDamage: 0 }
  for (const contact of state.seaContacts ?? []) {
    if (!sameTile(contact, state.currentMapTile) && state.turnsElapsed % (contact.kind === 'storm' ? 3 : 2) === 0) {
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
      const direction = directions.find(([dx, dy]) => openSea(contact.x + dx, contact.y + dy) &&
        !state.seaContacts!.some(other => other !== contact && other.x === contact.x + dx && other.y === contact.y + dy))
      if (direction) { contact.x += direction[0]; contact.y += direction[1] }
    }
    if (sameTile(contact, state.currentMapTile)) {
      if (contact.kind === 'enemy') result.enemyId = contact.enemyId
      else result.stormDamage = 5 + Math.floor(random() * 8) + state.difficulty * 2
    }
  }
  state.hullIntegrity = Math.max(0, state.hullIntegrity - result.stormDamage)
  if (result.enemyId !== undefined) {
    state.seaContacts = state.seaContacts!.filter(contact => contact.kind !== 'enemy' || contact.enemyId !== result.enemyId)
  }
  return result
}