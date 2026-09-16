export async function checkBattleGraphics() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const { createInitialGameState } = await import('/src/game/GameState.ts')
  const { getEnemyTypes } = await import('/src/data/index.ts')
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key)
  const battle = game.scene.getScene('BattleScene')
  await new Promise(resolve => {
    battle.events.once('create', resolve)
    game.scene.start('BattleScene', { gameState: createInitialGameState(), enemyId: 1 })
  })
  for (const enemy of getEnemyTypes()) {
    battle.init({ gameState: createInitialGameState(), enemyId: enemy.id })
    battle.renderBattleState()
    const sprite = battle.children.getByName('battle-enemy')
    assert(sprite.frame.name.endsWith('_sideview'), `Missing enemy frame for ${enemy.name}`)
    assert(sprite.displayWidth <= 240 && sprite.displayHeight <= 150, 'Ship must fit the battle area')
  }
  for (const [health, damage] of [[100, 'normal'], [60, 'light'], [40, 'medium'], [10, 'severe']]) {
    battle.playerHullIntegrity = health
    battle.renderBattleState()
    assert(battle.children.getByName('battle-player').frame.name === `ship_player_${damage}_0`, `Missing ${damage} player frame`)
  }
  for (const method of ['playHitAnimation', 'playMissAnimation']) {
    battle.renderBattleState()
    battle[method]()
    const effect = battle.children.list.find(child => child.texture?.key === 'battle_effects' && child.anims)
    assert(effect?.anims.isPlaying, `${method} must animate`)
    assert(effect.frame.name !== '__BASE', 'Impact must use a valid frame')
    effect.emit('animationcomplete')
    assert(!effect.active, 'Completed effects must clean themselves up')
  }
  battle.init({ gameState: createInitialGameState(), enemyId: 1 })
  battle.handleCannonFire()
  assert(battle.children.list.some(child => child.texture?.key === 'battle_effects' && child.anims?.isPlaying), 'Shot effects must survive the battle redraw')
  return 'Passed: eight enemy sprites, four player damage states, animated hits and misses, redraw persistence'
}