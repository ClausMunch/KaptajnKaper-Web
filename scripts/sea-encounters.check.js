export async function checkSeaEncounters() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const { createInitialGameState } = await import('/src/game/GameState.ts')
  const { isLand, isHarbor, isInBounds } = await import('/src/utils/MapUtils.ts')
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const ready = key => new Promise(resolve => game.scene.getScene(key).events.once('create', resolve))
  for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key)
  const state = createInitialGameState()
  const world = game.scene.getScene('WorldMapScene')
  const created = ready('WorldMapScene')
  game.scene.start('WorldMapScene', { gameState: state })
  await created
  assert(world.contactLayer.length === 11, 'Expected eight ships and three storms')
  assert(world.contactLayer.list.filter(marker => marker.list[1]).every(marker => marker.list[1].frame.name.endsWith('_topview')), 'Enemy sprites must use real atlas frames')
  const adjacent = () => [[1, 0, 'ArrowRight'], [-1, 0, 'ArrowLeft'], [0, 1, 'ArrowDown'], [0, -1, 'ArrowUp']]
    .map(([dx, dy, key]) => ({ x: world.gameState.currentMapTile.x + dx, y: world.gameState.currentMapTile.y + dy, key }))
    .find(tile => isInBounds(tile.x, tile.y) && !isLand(tile.x, tile.y) && !isHarbor(tile.x, tile.y))
  const storm = adjacent()
  world.gameState.seaContacts = [{ kind: 'storm', x: storm.x, y: storm.y }]
  world.handleInput(storm.key)
  assert(world.gameState.hullIntegrity < 100 && world.gameState.hullIntegrity >= 86, 'Sailing into a storm must damage the hull')
  assert(world.seaMessage.text.includes('Storm'), 'Storm damage needs visible feedback')
  for (const enemyId of [6, 1]) {
    const target = adjacent()
    world.gameState.turnsElapsed = 0
    world.gameState.seaContacts = [{ kind: 'enemy', enemyId, x: target.x, y: target.y }]
    const battleReady = ready('BattleScene')
    world.handleInput(target.key)
    await battleReady
    const battle = game.scene.getScene('BattleScene')
    assert(battle.currentEnemy.id === enemyId, 'Battle must use the encountered ship')
    assert(!battle.isProcessingRound, 'A subsequent encounter must accept input')
    const returnReady = ready('WorldMapScene')
    battle.handleYield()
    battle.time.preUpdate()
    battle.time.update(performance.now(), 2100)
    game.scene.update(performance.now(), 16)
    await returnReady
    assert(world.gameState.seaContacts.length === 0, 'Retreat must not recreate the encountered ship')
    assert(world.gameState.currentMapTile.x === target.x && world.gameState.currentMapTile.y === target.y, 'Retreat must preserve position')
  }
  return 'Passed: map sprites, storm damage, exact enemy identity, repeated combat, retreat persistence'
}