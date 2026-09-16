export async function checkExpandedSeas() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const { createInitialGameState } = await import('/src/game/GameState.ts')
  const { getMapData } = await import('/src/data/index.ts')
  const { isInBounds, isLand, isHarbor } = await import('/src/utils/MapUtils.ts')
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const ready = key => new Promise(resolve => game.scene.getScene(key).events.once('create', resolve))
  const start = async (key, data) => {
    for (const scene of game.scene.getScenes(false)) {
      if (scene.scene.isActive() || scene.scene.isPaused()) game.scene.stop(scene.scene.key)
    }
    const created = ready(key)
    game.scene.start(key, data)
    game.scene.update(performance.now(), 16)
    await created
  }
  for (const mode of ['expanded', 'classic']) {
    await start('TitleScene')
    const title = game.scene.getScene('TitleScene')
    title.children.getByName(`mode-${mode}`).emit('pointerdown')
    assert(game.registry.get('worldMode') === mode, 'Selector must retain the selected mode')
    const introReady = ready('IntroStoryScene')
    title.input.keyboard.emit('keydown-ENTER')
    title.cameras.main.emit('camerafadeoutcomplete')
    game.scene.update(performance.now(), 16)
    await introReady
    const intro = game.scene.getScene('IntroStoryScene')
    const worldReady = ready('WorldMapScene')
    intro.children.list.find(child => child.input?.enabled).emit('pointerdown')
    game.scene.update(performance.now(), 16)
    await worldReady
    const world = game.scene.getScene('WorldMapScene')
    assert(world.gameState.worldMode === mode, 'Intro must pass the selected mode to the voyage')
    assert(world.mapData.dimensions.width === (mode === 'expanded' ? 60 : 30), 'Wrong map dimensions')
    assert(world.mapData.dimensions.width * world.tileSize === 960, 'Chart must fit the viewport')
    assert(world.contactLayer.length === (mode === 'expanded' ? 17 : 11), 'Wrong contact count')
    assert(JSON.stringify(world.gameState.currentMapTile) === JSON.stringify(world.mapData.startPosition), 'Wrong starting position')
  }
  const state = createInitialGameState(1, 'Kaper', 'expanded')
  state.currentMapTile = { x: 6, y: 16 }
  state.seaContacts = [{ kind: 'storm', x: 8, y: 16 }]
  await start('WorldMapScene', { gameState: state })
  const world = game.scene.getScene('WorldMapScene')
  assert(world.contactLayer.list[0].width === 80, 'Offshore storm must cover five displayed tiles')
  world.handleInput('ArrowRight')
  assert(state.hullIntegrity >= 63 && state.hullIntegrity <= 80, 'Storm footprint must damage ships outside its center')
  state.currentMapTile = { x: 23, y: 21 }
  state.seaContacts = []
  const harborReady = ready('HarborApproachScene')
  world.handleInput('ArrowRight')
  game.scene.update(performance.now(), 16)
  await harborReady
  assert(game.scene.getScene('HarborApproachScene').gameState === state, 'Harbor must preserve the DLC voyage')
  const returnReady = ready('WorldMapScene')
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
  game.scene.update(performance.now(), 16)
  await returnReady
  assert(world.mapData.dimensions.width === 60 && state.currentMapTile.x === 23, 'Harbor return must retain expanded map and sea position')
  state.turnsElapsed = 0
  state.seaContacts = [{ kind: 'enemy', enemyId: 6, x: 23, y: 20 }]
  const battleReady = ready('BattleScene')
  world.handleInput('ArrowUp')
  game.scene.update(performance.now(), 16)
  await battleReady
  const battle = game.scene.getScene('BattleScene')
  const battleReturn = ready('WorldMapScene')
  battle.handleYield()
  battle.time.preUpdate()
  battle.time.update(performance.now(), 2100)
  game.scene.update(performance.now(), 16)
  await battleReturn
  assert(world.gameState === state && world.mapData.dimensions.width === 60 && state.currentMapTile.y === 20, 'Combat return must preserve the expanded voyage')
  const map = getMapData('expanded')
  for (const port of map.harborLocations.filter(port => port.harborId > 8)) {
    const [dx, dy, key] = [[0, -1, 'ArrowDown'], [1, 0, 'ArrowLeft'], [0, 1, 'ArrowUp'], [-1, 0, 'ArrowRight']]
      .find(([dx, dy]) => isInBounds(port.x + dx, port.y + dy, map) && !isLand(port.x + dx, port.y + dy, map) && !isHarbor(port.x + dx, port.y + dy, map))
    const position = { x: port.x + dx, y: port.y + dy }
    await start('WorldMapScene', { gameState: { ...createInitialGameState(1, 'Kaper', 'expanded'), currentMapTile: position, seaContacts: [] } })
    const approachReady = ready('HarborApproachScene')
    world.handleInput(key)
    game.scene.update(performance.now(), 16)
    await approachReady
    const approach = game.scene.getScene('HarborApproachScene')
    assert(approach.children.list.some(child => child.text?.includes(port.name)), `${port.name}: approach name missing`)
    const tradeReady = ready('HarborTradeScene')
    approach.enterHarbor()
    game.scene.update(performance.now(), 16)
    await tradeReady
    const trade = game.scene.getScene('HarborTradeScene')
    assert(trade.children.list.some(child => child.text === port.name), `${port.name}: trade name missing`)
    trade.input.keyboard.emit('keydown-G')
    trade.input.keyboard.emit('keydown-B')
    trade.input.keyboard.emit('keydown', { key: '1', stopPropagation() {} })
    const purchased = ready('HarborTradeScene')
    trade.input.keyboard.emit('keydown-ENTER', { stopPropagation() {} })
    game.scene.update(performance.now(), 16)
    await purchased
    assert(trade.gameState.grain === 31 && trade.gameState.rigsdaler === 490, `${port.name}: purchase failed`)
    const returned = ready('WorldMapScene')
    trade.leaveHarbor()
    game.scene.update(performance.now(), 16)
    await returned
    assert(world.gameState.worldMode === 'expanded' && world.gameState.grain === 31 && world.gameState.currentMapTile.x === position.x && world.gameState.currentMapTile.y === position.y, `${port.name}: return lost voyage state`)
  }
  await start('WorldMapScene', { gameState: createInitialGameState(1, 'Kaper', 'expanded') })
  game.step(performance.now(), 16)
  return 'Passed: both selectors, map scale, offshore damage, combat return, and all 11 regional harbor purchases and returns'
}