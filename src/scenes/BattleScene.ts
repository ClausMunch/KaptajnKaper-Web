import Phaser from 'phaser'
import { t, translateData, TextSource } from '../i18n'
import { localizedText } from '../utils/LocalizedText'
import { GameState, getHullDamageLevel } from '../game/GameState'
import { getRandomEnemy, getEnemyById, Enemy } from '../data'
import {
  calculateWind,
  calculateAimImpact,
  updateMorale,
  executeCombatRound,
  checkBattleEnd,
  combatLogEntry,
} from '../game/CombatEngine'

/**
 * BattleScene - Manual wind-corrected gunnery and boarding decisions.
 */
export class BattleScene extends Phaser.Scene {
  // Game state
  private gameState: GameState
  private currentEnemy: Enemy

  // Combat state
  private playerHullIntegrity: number
  private playerCrew: number
  private playerMorale: number

  private enemyHullIntegrity: number
  private enemyCrew: number
  private enemyMorale: number

  // Combat tracking
  private currentRound: number = 0
  private maxRounds: number = 20
  private distance: number
  private windSeverity: 0 | 1 | 2 | 3
  private combatLog: TextSource[] = []

  // UI
  private aimSide = 0
  private aimElevation = 0
  private windX = 0
  private windY = 0
  private windStrength = 0
  private aimClock = 0
  private crosshair!: Phaser.GameObjects.Image
  private aimText!: Phaser.GameObjects.Text
  private lastImpact?: ReturnType<typeof calculateAimImpact>
  private resolved = false
  private isProcessingRound: boolean = false

  constructor() {
    super({ key: 'BattleScene' })
    this.gameState = {} as GameState
    this.currentEnemy = getRandomEnemy()
    this.playerHullIntegrity = 100
    this.playerCrew = 15
    this.playerMorale = 1.0
    this.enemyHullIntegrity = 100
    this.enemyCrew = 10
    this.enemyMorale = 1.0
    this.distance = 5
    this.windSeverity = 0
  }

  init(data: { gameState: GameState; enemyId?: number }) {
    this.gameState = data.gameState
    this.currentEnemy = getEnemyById(data.enemyId ?? -1) ?? getRandomEnemy()
    this.isProcessingRound = false
    this.resolved = false
    this.aimSide = 0
    this.aimElevation = 0
    this.aimClock = 0
    this.lastImpact = undefined

    // Initialize player stats from GameState
    this.playerHullIntegrity = this.gameState.hullIntegrity
    this.playerCrew = this.gameState.crew
    this.playerMorale = this.gameState.crewMorale

    // Initialize enemy stats
    this.enemyHullIntegrity = 100
    this.enemyCrew = this.currentEnemy.crew
    this.enemyMorale = 1.0

    // Initial conditions
    this.currentRound = 0
    this.distance = Phaser.Math.Between(5, 9)
    this.windSeverity = calculateWind()
    this.windX = Phaser.Math.Between(-1, 1)
    this.windY = Phaser.Math.Between(-1, 1)
    this.windStrength = this.windX || this.windY ? Phaser.Math.Between(1, 8) : 0
    if (this.gameState.difficulty <= 1) {
      this.aimSide = this.windStrength * this.windX * 5
      this.aimElevation = (700 + this.windStrength * this.windY * 10 - this.distance * 100) / 10
    }
    this.combatLog = []
  }

  create() {
    for (const [key, end] of [['explosion', 5], ['splash', 3]] as const) {
      if (!this.anims.exists(key)) this.anims.create({
        key,
        frames: this.anims.generateFrameNames('battle_effects', { prefix: `${key}_`, start: 0, end, zeroPad: 2 }),
        frameRate: 12,
      })
    }

    // Set up keyboard input
    this.setupInputHandlers()

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isProcessingRound || pointer.x < 430 || pointer.x > 986 || pointer.y < 86 || pointer.y > 414) return
      this.aimSide = Phaser.Math.Clamp((pointer.x - 708) / 3, -50, 50)
      this.aimElevation = Phaser.Math.Clamp((pointer.y - 250) / 2, -60, 60)
    })

    // Start first combat round
    this.startNewRound()

    console.log(
      `✓ BattleScene: Fighting ${this.currentEnemy.name} (Cannons: ${this.currentEnemy.cannons})`
    )
  }

  private setupInputHandlers() {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isProcessingRound) return
      const directions: Record<string, [number, number]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2], '4': [-2, 0], '6': [2, 0], '8': [0, -2], '2': [0, 2], '7': [-2, -2], '9': [2, -2], '1': [-2, 2], '3': [2, 2] }
      const direction = directions[event.key]
      if (direction) {
        event.preventDefault()
        this.aimSide = Phaser.Math.Clamp(this.aimSide + direction[0], -50, 50)
        this.aimElevation = Phaser.Math.Clamp(this.aimElevation + direction[1], -60, 60)
      }
    })
    this.input.keyboard?.on('keydown-C', () => this.closeRange())
    this.input.keyboard?.on('keydown-ZERO', () => this.handleYield())
    this.input.keyboard?.on('keydown-F', () => {
      if (!this.isProcessingRound && this.currentRound > 0) {
        this.handleCannonFire()
      }
    })

    this.input.keyboard?.on('keydown-B', () => {
      if (!this.isProcessingRound) {
        this.handleBoarding()
      }
    })

    this.input.keyboard?.on('keydown-Y', () => {
      if (!this.isProcessingRound) {
        this.handleYield()
      }
    })
  }

  private startNewRound() {
    this.currentRound++

    this.renderBattleState(true, true)

    // Auto-resolve after max rounds
    if (this.currentRound >= this.maxRounds) {
      this.resolveBattle('timeout')
    }
  }

  /**
   * Render current battle state to screen
   */
  private renderBattleState(_showRound: boolean = true, canFire: boolean = true): void {
    this.children.removeAll(true)
    this.add.rectangle(512, 384, 1024, 768, 0x183e43)
    const text = (x: number, y: number, source: TextSource, size = 18, color = '#f3e6bc') => localizedText(this, x, y, source, {
      fontFamily: 'Georgia, serif', fontSize: `${size}px`, color,
    })
    text(32, 23, () => translateData(this.currentEnemy.name), 28)
    text(990, 30, () => t('round', { current: this.currentRound, max: this.maxRounds })).setOrigin(1, 0)
    const lines = this.add.graphics().lineStyle(2, 0xb6b99a)
    lines.strokeRect(32, 86, 368, 146).strokeRect(32, 252, 368, 162).strokeRect(430, 86, 556, 328)
    this.add.rectangle(708, 250, 552, 324, 0x30737a)
    for (let row = 122; row < 412; row += 35) {
      this.add.graphics().lineStyle(1, 0x7caca3, 0.3).lineBetween(432, row, 984, row)
    }
    text(48, 98, () => t('enemy'), 17)
    text(48, 264, () => t('yourShip'), 17)
    const damage = ['normal', 'light', 'medium', 'severe'][getHullDamageLevel({ ...this.gameState, hullIntegrity: this.playerHullIntegrity })]
    const player = this.add.sprite(216, 335, 'ship_player', `ship_player_${damage}_0`).setName('battle-player')
    player.setDisplaySize(90, 90)
    player.play(`ship_player_${damage}_rock`)
    const enemyFrames = ['handelsmand', 'troppetransport', 'kanonbaad', 'galease', 'brig', 'skonnert', 'orlogsmand', 'soeroverskib']
    this.add.image(216, 163, 'ships_enemy', `${enemyFrames[this.currentEnemy.id - 1]}_topview`).setDisplaySize(48, 85)
    const enemy = this.add.image(708, 250, 'ships_enemy', `${enemyFrames[this.currentEnemy.id - 1]}_sideview`).setName('battle-enemy')
    enemy.setScale(Math.min(240 / enemy.width, 150 / enemy.height) * (1.1 - this.distance * 0.04))
    text(448, 98, () => t('gunsight'), 17)
    this.crosshair = this.add.image(708, 250, 'battle_effects', 'crosshair').setDisplaySize(40, 40).setDepth(20)
    this.aimText = text(448, 379, '', 16)
    const aimZone = this.add.zone(708, 250, 552, 324).setInteractive()
    aimZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isProcessingRound) return
      this.aimSide = Phaser.Math.Clamp((pointer.x - 708) / 3, -50, 50)
      this.aimElevation = Phaser.Math.Clamp((pointer.y - 250) / 2, -60, 60)
    })
    const wind = `${this.windX < 0 ? 'W' : this.windX > 0 ? 'E' : ''}${this.windY < 0 ? 'N' : this.windY > 0 ? 'S' : ''}`
    text(32, 442, () => t('gunneryRange', { range: this.distance * 100 }), 22)
    text(375, 442, () => t('gunneryWind', { direction: wind || '-', strength: this.windStrength }), 20)
    text(985, 442, () => t(this.isProcessingRound && !this.resolved ? 'reloading' : 'gunsReady'), 20).setOrigin(1, 0)
    lines.lineBetween(32, 482, 986, 482).lineBetween(32, 574, 986, 574)
    for (const [offset, key, own, other] of [[0, 'cannonStat', this.gameState.cannons, this.currentEnemy.cannons], [320, 'crewStat', this.playerCrew, this.enemyCrew], [640, 'hullStat', this.playerHullIntegrity, this.enemyHullIntegrity]] as const) {
      text(48 + offset, 496, () => t(key), 16, '#a6c9bf')
      text(48 + offset, 528, `${Math.max(0, own)} / ${Math.max(0, other)}`, 26)
    }
    this.combatLog.slice(0, 2).forEach((message, index) => text(32, 592 + index * 26, message, 17).setWordWrapWidth(940))
    const action = (x: number, key: 'fire' | 'closeRange' | 'board' | 'yield', enabled: boolean, callback: () => void) => {
      const button = text(x, 706, () => t(key), 20, enabled ? '#fff1c5' : '#7d9695').setOrigin(0.5).setPadding(14, 12).setBackgroundColor(enabled ? '#7e392f' : '#284c50').setName(`action-${key}`)
      if (enabled) button.setInteractive({ useHandCursor: true }).on('pointerdown', callback)
    }
    action(135, 'fire', canFire && this.gameState.cannons > 0, () => this.handleCannonFire())
    action(385, 'closeRange', canFire && this.distance > 2, () => this.closeRange())
    action(635, 'board', canFire && ([1, 5, 6].includes(this.currentEnemy.id) || this.distance <= 3 || this.enemyHullIntegrity <= 40), () => this.handleBoarding())
    action(885, 'yield', canFire, () => this.handleYield())
    this.update(0, 0)
  }

  private handleCannonFire() {
    if (this.isProcessingRound || this.gameState.cannons <= 0) return

    this.isProcessingRound = true
    this.lastImpact = calculateAimImpact(this.aimSide + Math.sin(this.aimClock), this.aimElevation + Math.cos(this.aimClock * 0.7) * 0.5,
      this.distance * 100, this.windX, this.windY, this.windStrength)

    // Execute combat round (both ships fire simultaneously)
    const result = executeCombatRound(
      this.gameState.cannons,
      this.playerMorale,
      this.distance,
      this.windSeverity,
      this.currentEnemy.cannons,
      this.enemyMorale,
      this.lastImpact.hit,
      this.gameState.difficulty
    )

    // Apply player's shot results
    if (result.playerHit) {
      this.enemyHullIntegrity -= result.playerDamage
      this.enemyCrew -= result.playerCrewLoss
      this.combatLog.unshift(
        combatLogEntry('Player', 'hit', {
          damage: result.playerDamage,
          crewLoss: result.playerCrewLoss,
          distance: this.distance,
        })
      )
      console.log(
        `✓ Player Hit! Damage: ${result.playerDamage}, Enemy crew lost: ${result.playerCrewLoss}`
      )

    } else {
      const impact = this.lastImpact
      this.combatLog.unshift(() => t('gunnerySplash', { side: Math.round(impact.lateral * 10), range: Math.round(impact.rangeError) }))
      console.log('✗ Player Miss!')

    }

    // Update player morale based on hit
    if (result.playerHit) {
      this.playerMorale = updateMorale(this.playerMorale, 'victory')
    } else {
      this.playerMorale = updateMorale(this.playerMorale, 'defeat')
    }

    // Apply enemy's shot results
    if (result.enemyHit) {
      this.playerHullIntegrity -= result.enemyDamage
      this.playerCrew -= result.enemyCrewLoss
      this.combatLog.unshift(
        combatLogEntry('Enemy', 'hit', {
          damage: result.enemyDamage,
          crewLoss: result.enemyCrewLoss,
        })
      )
      console.log(
        `✗ Enemy Hit! Damage: ${result.enemyDamage}, Your crew lost: ${result.enemyCrewLoss}`
      )
    } else {
      this.combatLog.unshift(combatLogEntry('Enemy', 'miss'))
      console.log('✗ Enemy Miss!')
    }

    // Update enemy morale based on hit
    if (result.enemyHit) {
      this.enemyMorale = updateMorale(this.enemyMorale, 'victory')
    } else {
      this.enemyMorale = updateMorale(this.enemyMorale, 'defeat')
    }

    // Clamp crew values
    this.playerCrew = Math.max(0, this.playerCrew)
    this.enemyCrew = Math.max(0, this.enemyCrew)

    // Check battle end condition
    const battleEnd = checkBattleEnd(
      this.playerHullIntegrity,
      this.playerCrew,
      this.enemyHullIntegrity,
      this.enemyCrew
    )

    if (battleEnd.isOver) {
      this.resolveBattle(battleEnd.winner === 'player' ? 'victory' : 'defeat')
    } else {
      // Allow player to board or continue
      this.renderBattleState(true, false)

      // Auto-advance to next round after delay if player doesn't board
      this.time.delayedCall(1200, () => {
        if (!this.resolved) {
          this.isProcessingRound = false
          this.startNewRound()
        }
      })
    }
    if (result.playerHit) this.playHitAnimation()
    else this.playMissAnimation()
  }

  private handleBoarding() {
    if (this.isProcessingRound || !([1, 5, 6].includes(this.currentEnemy.id) || this.distance <= 3 || this.enemyHullIntegrity <= 40)) return
    this.isProcessingRound = true
    this.gameState.crew = this.playerCrew
    this.gameState.hullIntegrity = this.playerHullIntegrity
    this.gameState.crewMorale = this.playerMorale
    this.scene.pause()
    this.scene.launch('BoardingScene', {
      gameState: this.gameState, enemy: this.currentEnemy, enemyCrew: this.enemyCrew,
      onReturn: (captured: boolean, defenders: number) => {
        this.playerCrew = this.gameState.crew
        this.playerMorale = this.gameState.crewMorale
        this.enemyCrew = defenders
        if (this.playerCrew <= 0) this.resolveBattle('defeat')
        else if (captured) this.resolveBattle('victory')
        else {
          this.isProcessingRound = false
          this.combatLog.unshift(() => t('boardingRepelled'))
          this.renderBattleState()
        }
      },
    })
  }

  private closeRange() {
    if (this.isProcessingRound || this.distance <= 2) return
    this.isProcessingRound = true
    const previousDistance = this.distance
    this.distance = Math.max(2, this.distance - 2)
    if (this.gameState.difficulty <= 1) this.aimElevation = Phaser.Math.Clamp(this.aimElevation + (previousDistance - this.distance) * 10, -60, 60)
    const retaliation = executeCombatRound(0, this.playerMorale, this.distance, this.windSeverity, this.currentEnemy.cannons, this.enemyMorale, false, this.gameState.difficulty)
    this.playerHullIntegrity = Math.max(0, this.playerHullIntegrity - retaliation.enemyDamage)
    this.playerCrew = Math.max(0, this.playerCrew - retaliation.enemyCrewLoss)
    this.combatLog.unshift(retaliation.enemyHit ? combatLogEntry('Enemy', 'hit', { damage: retaliation.enemyDamage, crewLoss: retaliation.enemyCrewLoss }) : combatLogEntry('Enemy', 'miss'))
    if (!this.playerHullIntegrity || !this.playerCrew) this.resolveBattle('defeat')
    else {
      this.renderBattleState(true, false)
      this.time.delayedCall(1200, () => {
        if (this.resolved) return
        this.isProcessingRound = false
        this.startNewRound()
      })
    }
  }

  update(_time: number, delta: number) {
    if (!this.crosshair?.active) return
    if (!this.isProcessingRound) this.aimClock += delta / 700
    const side = this.aimSide + Math.sin(this.aimClock)
    const elevation = this.aimElevation + Math.cos(this.aimClock * 0.7) * 0.5
    this.crosshair.setPosition(708 + side * 3, 250 + elevation * 2)
    const prediction = calculateAimImpact(side, elevation, this.distance * 100, this.windX, this.windY, this.windStrength, () => 0.5)
    this.crosshair.setTint(prediction.hit ? 0x80ffc0 : 0xffd48a)
    this.aimText.setText(t('gunneryAim', { side: Math.round(side), elevation: Math.round(elevation) }))
  }

  private handleYield() {
    if (this.isProcessingRound) return

    console.log('🏃 Player yields!')
    this.gameState.consecutiveFlees++
    this.playerMorale = updateMorale(this.playerMorale, 'flee')
    this.resolveBattle('yielded')
  }

  private playHitAnimation() {
    // Check if battle_effects atlas exists and play explosion
    if (this.textures.exists('battle_effects')) {
      const explosionX = 708
      const explosionY = 250

      const sprite = this.add.sprite(explosionX, explosionY, 'battle_effects', 'explosion_00').setScale(3)
      sprite.setDepth(50)
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())

      // Try to play explosion animation if it exists
      if (this.anims.exists('explosion')) {
        sprite.play('explosion')
      } else {
        // Fallback: scale and fade effect
        sprite.setScale(0.5)
        this.tweens.add({
          targets: sprite,
          scale: 1.5,
          alpha: 0,
          duration: 600,
          ease: 'Quad.easeOut',
          onComplete: () => sprite.destroy(),
        })
      }
    }

    // Play hit sound effect (console log placeholder)
    console.log('🔊 Explosion sound effect')
  }

  private playMissAnimation() {
    // Check if battle_effects atlas exists and play splash
    if (this.textures.exists('battle_effects')) {
      const splashX = Phaser.Math.Clamp(708 + (this.lastImpact?.lateral ?? 8) * 12, 465, 951)
      const splashY = Phaser.Math.Clamp(275 + (this.lastImpact?.rangeError ?? 100) * 0.3, 145, 350)

      const sprite = this.add.sprite(splashX, splashY, 'battle_effects', 'splash_00').setScale(3)
      sprite.setDepth(50)
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())

      // Try to play splash animation if it exists
      if (this.anims.exists('splash')) {
        sprite.play('splash')
      } else {
        // Fallback: wave effect
        this.tweens.add({
          targets: sprite,
          y: splashY + 20,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => sprite.destroy(),
        })
      }
    }

    // Play miss sound effect (console log placeholder)
    console.log('🔊 Splash sound effect')
  }

  private resolveBattle(outcome: 'victory' | 'defeat' | 'yielded' | 'timeout') {
    if (this.resolved) return
    if (outcome === 'timeout') outcome = 'yielded'
    this.resolved = true
    this.isProcessingRound = true

    console.log(`Battle resolved: ${outcome}`)

    // Update GameState based on outcome
    if (outcome === 'victory') {
      this.gameState.score += this.currentEnemy.points
      if (this.enemyHullIntegrity > 0) {
        this.gameState.rigsdaler = Math.min(30000, this.gameState.rigsdaler + this.currentEnemy.rigsdaler)
        this.gameState.grain = Math.min(700, this.gameState.grain + this.currentEnemy.grain)
      }
      this.playerMorale = updateMorale(this.playerMorale, 'victory')
      this.gameState.consecutiveFlees = 0 // Reset flee counter on victory
      this.combatLog.unshift(this.enemyHullIntegrity > 0
        ? () => t('capturedCargo', { money: this.currentEnemy.rigsdaler, grain: this.currentEnemy.grain })
        : combatLogEntry('Enemy', 'sunk'))
      console.log(`✓ Battle won! +${this.currentEnemy.points} points`)
    } else if (outcome === 'defeat') {
      // Take damage and lose crew
      this.gameState.hullIntegrity = Math.max(0, this.playerHullIntegrity)
      this.gameState.crew = Math.max(0, this.playerCrew)
      this.gameState.crewMorale = updateMorale(this.gameState.crewMorale, 'defeat')
      this.combatLog.unshift(() => t('defeat'))
      console.log(`Battle lost, taking damage`)
    } else if (outcome === 'yielded') {
      // Yield: take minor damage and lose some morale
      this.gameState.hullIntegrity = Math.max(0, this.playerHullIntegrity)
      this.gameState.crew = Math.max(0, this.playerCrew)
      this.gameState.crewMorale = updateMorale(this.gameState.crewMorale, 'flee')
      this.combatLog.unshift(() => t('yielded'))
      console.log('Battle yielded')
    }

    // Always update crew and hull
    this.gameState.crew = Math.max(0, this.playerCrew)
    this.gameState.hullIntegrity = Math.max(0, this.playerHullIntegrity)
    this.gameState.crewMorale = this.playerMorale
    this.renderBattleState(false, false)

    // Return to world map
    this.time.delayedCall(2000, () => {
      this.scene.start(this.gameState.crew > 0 && this.gameState.hullIntegrity > 0 ? 'WorldMapScene' : 'GameOverScene', { gameState: this.gameState, reason: 'Defeated' })
    })
  }
}
