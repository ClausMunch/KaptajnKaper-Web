export async function checkTradeQuantity() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const { createInitialGameState } = await import('/src/game/GameState.ts')
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const step = () => new Promise(resolve => game.events.once('poststep', resolve))
  const press = (key, code, keyCode) => {
    for (const type of ['keydown', 'keyup']) {
      window.dispatchEvent(new KeyboardEvent(type, { key, code, keyCode, bubbles: true }))
    }
  }
  document.activeElement?.blur()
  for (const active of game.scene.getScenes(true)) game.scene.stop(active.scene.key)
  game.scene.start('HarborTradeScene', { gameState: createInitialGameState(), harborId: 2 })
  await step()
  const scene = game.scene.getScene('HarborTradeScene')
  press('g', 'KeyG', 71)
  press('b', 'KeyB', 66)
  press('2', 'Digit2', 50)
  press('5', 'Digit5', 53)
  await step()
  assert(scene.selectedQuantity === 25, 'Rapid digits must form 25 exactly once')
  assert(scene.menuText.text.includes('250'), 'The prompt must show the updated cost')

  press('Backspace', 'Backspace', 8)
  press('Backspace', 'Backspace', 8)
  press('Enter', 'Enter', 13)
  await step()
  assert(scene.selectedQuantity === 0 && scene.confirmAction, 'Empty quantities must not confirm')
  assert(scene.gameState.rigsdaler === 500, 'Rejected confirmation must not change money')

  press('2', 'Numpad2', 98)
  press('0', 'Numpad0', 96)
  await step()
  assert(scene.selectedQuantity === 20, 'Numpad digits, including zero, must work')
  const selector = document.querySelector('#language')
  const previousLocale = selector.value
  selector.value = previousLocale === 'da' ? 'en' : 'da'
  selector.dispatchEvent(new Event('change'))
  assert(scene.selectedQuantity === 20 && scene.menuText.text.includes('200'), 'Language changes must preserve the amount')
  selector.value = previousLocale
  selector.dispatchEvent(new Event('change'))

  press('Enter', 'Enter', 13)
  await step()
  await step()
  assert(scene.gameState.grain === 50 && scene.gameState.rigsdaler === 300, 'Purchase must execute exactly once')
  assert(scene.inputBuffer === '', 'A completed trade must clear input')

  for (const [command, code, keyCode] of [['g', 'KeyG', 71], ['c', 'KeyC', 67], ['h', 'KeyH', 72]]) {
    press(command, code, keyCode)
    if (command !== 'h') press('b', 'KeyB', 66)
    press('3', 'Digit3', 51)
    press('0', 'Digit0', 48)
    await step()
    assert(scene.selectedQuantity === 30, `${command}: the first digit must replace the default`)
    press('Escape', 'Escape', 27)
    await step()
    await step()
    assert(scene.gameState.rigsdaler === 300, 'Cancelling must not spend money')
  }
  return 'Passed: rapid typing, Backspace, zero rejection, numpad, language switching, purchase, cancellation, and fresh input'
}

export async function checkHarborReturn() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const { createInitialGameState } = await import('/src/game/GameState.ts')
  const { getMapData } = await import('/src/data/index.ts')
  const { isInBounds, isLand, isHarbor } = await import('/src/utils/MapUtils.ts')
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const created = key => new Promise(resolve => game.scene.getScene(key).events.once('create', resolve))
  const start = async (key, data) => {
    for (const active of game.scene.getScenes(true)) game.scene.stop(active.scene.key)
    const ready = created(key)
    game.scene.start(key, data)
    await ready
  }
  const world = game.scene.getScene('WorldMapScene')
  for (const harbor of getMapData().harborLocations) {
    const [dx, dy, key] = [[0, -1, 'ArrowDown'], [1, 0, 'ArrowLeft'], [0, 1, 'ArrowUp'], [-1, 0, 'ArrowRight']]
      .find(([dx, dy]) => isInBounds(harbor.x + dx, harbor.y + dy) && !isLand(harbor.x + dx, harbor.y + dy) && !isHarbor(harbor.x + dx, harbor.y + dy))
    const entry = { x: harbor.x + dx, y: harbor.y + dy }
    await start('WorldMapScene', { gameState: { ...createInitialGameState(), currentMapTile: entry } })
    const approachReady = created('HarborApproachScene')
    world.handleInput(key)
    await approachReady
    for (const action of ['pointer', 'keyboard']) {
      const before = JSON.stringify(world.gameState)
      const approach = game.scene.getScene('HarborApproachScene')
      const cancelReady = created('WorldMapScene')
      if (action === 'pointer') {
        approach.children.list.find(child => child.input?.enabled && child.text.includes('[ESC]')).emit('pointerdown')
      } else {
        const escape = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true })
        escape.preventDefault()
        window.dispatchEvent(escape)
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }))
      }
      await cancelReady
      assert(JSON.stringify(world.gameState) === before, `${harbor.name}: declining entry must preserve position and resources`)
      const reentryReady = created('HarborApproachScene')
      world.handleInput(key)
      await reentryReady
    }
    const tradeReady = created('HarborTradeScene')
    game.scene.getScene('HarborApproachScene').enterHarbor()
    await tradeReady
    const trade = game.scene.getScene('HarborTradeScene')
    trade.gameState = { ...trade.gameState, grain: 45, rigsdaler: 350 }
    const returnReady = created('WorldMapScene')
    trade.leaveHarbor()
    await returnReady
    assert(world.gameState.currentMapTile.x === entry.x && world.gameState.currentMapTile.y === entry.y, `${harbor.name}: wrong return tile`)
    assert(world.playerShip.x === 32 + entry.x * 32 + 16 && world.playerShip.y === 96 + entry.y * 32 + 16, `${harbor.name}: sprite does not match the saved tile`)
    assert(world.gameState.grain === 45 && world.gameState.rigsdaler === 350, `${harbor.name}: lost trading state`)
  }
  for (const action of ['P', 'S']) {
    const state = { ...createInitialGameState(), currentMapTile: { x: 18, y: 7 } }
    await start('BoardingScene', { gameState: state })
    const ready = created('WorldMapScene')
    game.scene.getScene('BoardingScene').input.keyboard.emit(`keydown-${action}`)
    await ready
    assert(world.gameState === state, 'Boarding must return its state to the map')
  }
  await start('IntroStoryScene')
  const newGameReady = created('WorldMapScene')
  game.scene.getScene('IntroStoryScene').children.list.find(child => child.input?.enabled).emit('pointerdown')
  await newGameReady
  const expected = createInitialGameState(1, document.querySelector('#player-name').value.trim().normalize('NFC'))
  expected.runId = world.gameState.runId
  expected.seaContacts = world.gameState.seaContacts
  assert(JSON.stringify(world.gameState) === JSON.stringify(expected), 'New games must start fresh')
  return 'Passed: all seven harbor returns, pointer/keyboard cancellation, sprite placement, trading state, boarding returns, and new-game reset'
}