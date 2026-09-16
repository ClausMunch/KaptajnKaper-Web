export async function checkInteractiveCombat() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const { createInitialGameState } = await import('/src/game/GameState.ts')
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const battle = game.scene.getScene('BattleScene')
  const boarding = game.scene.getScene('BoardingScene')
  const tick = (scene, milliseconds) => {
    scene.time.preUpdate()
    scene.time.update(performance.now(), milliseconds)
    game.scene.update(performance.now(), 16)
  }
  const start = async (enemyId = 1) => {
    for (const scene of game.scene.getScenes(false)) if (scene.scene.isActive() || scene.scene.isPaused()) game.scene.stop(scene.scene.key)
    const state = { ...createInitialGameState(), crew: 200 }
    await new Promise(resolve => {
      battle.events.once('create', resolve)
      game.scene.start('BattleScene', { gameState: state, enemyId })
    })
    return state
  }
  const state = await start()
  const initialSide = battle.aimSide
  battle.input.keyboard.emit('keydown', { key: 'ArrowRight', preventDefault() {} })
  assert(battle.aimSide === initialSide + 2, 'Keyboard must adjust bearing')
  battle.input.emit('pointermove', { x: 738, y: 230 })
  assert(battle.aimSide === 10 && battle.aimElevation === -10, 'Pointer must adjust the gunsight')
  battle.distance = 7
  battle.windStrength = 0
  battle.aimSide = 0
  battle.aimElevation = -4
  battle.aimClock = 0
  battle.handleCannonFire()
  assert(battle.lastImpact.lateral === 0 && Math.abs(battle.lastImpact.rangeError) <= 70, 'Shot must use the corrected bearing and elevation')
  const hull = battle.enemyHullIntegrity
  battle.handleCannonFire()
  assert(battle.enemyHullIntegrity === hull && battle.isProcessingRound, 'Reload must block duplicate fire')
  tick(battle, 1300)
  assert(!battle.isProcessingRound && battle.currentRound === 2, 'Exactly one new round after reloading')
  battle.children.getByName('action-board').emit('pointerdown')
  tick(battle, 0)
  assert(boarding.scene.isActive() && battle.scene.isPaused(), 'Merchant boarding must open without a range gate')
  const before = state.crew
  boarding.engage('guard')
  const remaining = state.crew
  boarding.engage('assault')
  assert(state.crew === remaining && remaining < before, 'One boarding action per exchange')
  tick(boarding, 900)
  const defenders = boarding.defenders
  boarding.withdraw()
  game.scene.update(performance.now(), 16)
  assert(battle.scene.isActive() && battle.enemyCrew === defenders && battle.playerCrew === state.crew, 'Withdrawal preserves casualties')
  battle.handleBoarding()
  game.scene.update(performance.now(), 16)
  boarding.defenders = 1
  boarding.engage('assault')
  tick(boarding, 900)
  assert(state.rigsdaler === 650 && state.grain === 60 && state.score === 50, 'Capture awards actual merchant cargo and points')
  boarding.finish(true)
  battle.resolveBattle('victory')
  assert(state.rigsdaler === 650 && state.score === 50, 'Capture rewards settle only once')
  const warshipState = await start(7)
  assert(!battle.children.getByName('action-board').input, 'Distant warships must be closed with first')
  const range = battle.distance
  battle.closeRange()
  assert(battle.distance === range - 2 && battle.isProcessingRound, 'Closing range consumes a maneuver')
  tick(battle, 1300)
  battle.enemyHullIntegrity = 0
  battle.resolveBattle('victory')
  assert(warshipState.rigsdaler === 500 && warshipState.grain === 30, 'Sunk ships cannot provide cargo')
  await start()
  return 'Passed: pointer/keyboard aim, corrected shot, reload lock, maneuver, merchant boarding, withdrawal, capture, single payout, sunk cargo'
}