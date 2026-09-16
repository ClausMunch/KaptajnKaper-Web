import Phaser from 'phaser'
import { t, translateData, TextSource } from '../i18n'
import { localizedText } from '../utils/LocalizedText'
import { GameState } from '../game/GameState'
import type { Enemy } from '../data'
import { boardingRound, updateMorale } from '../game/CombatEngine'

/**
 * BoardingScene - Crew engagement with assault, guard and withdrawal choices.
 */
export class BoardingScene extends Phaser.Scene {
  private gameState: GameState
  private enemy?: Enemy
  private defenders = 0
  private initialDefenders = 0
  private initialCrew = 0
  private busy = false
  private finished = false
  private message: TextSource = ''
  private onReturn?: (captured: boolean, defenders: number) => void

  constructor() {
    super({ key: 'BoardingScene' })
    this.gameState = {} as GameState
  }

  init(data: { gameState: GameState; enemy?: Enemy; enemyCrew?: number; onReturn?: (captured: boolean, defenders: number) => void }) {
    this.gameState = data.gameState
    this.enemy = data.enemy
    this.defenders = data.enemyCrew ?? data.enemy?.crew ?? 0
    this.initialDefenders = this.defenders
    this.initialCrew = this.gameState.crew
    this.onReturn = data.onReturn
    this.busy = false
    this.finished = false
    this.message = () => t('boardingApproach')
  }

  create() {
    this.input.keyboard?.on('keydown-P', () => this.enemy ? this.engage('assault') : this.finish(false))
    this.input.keyboard?.on('keydown-K', () => this.engage('assault'))
    this.input.keyboard?.on('keydown-G', () => this.engage('guard'))
    this.input.keyboard?.on('keydown-S', () => this.withdraw())
    this.input.keyboard?.on('keydown-T', () => this.withdraw())
    this.draw()
  }

  private draw() {
    this.children.removeAll(true)
    this.add.rectangle(512, 384, 1024, 768, 0x183e43)
    const text = (x: number, y: number, source: TextSource, size = 22) => localizedText(this, x, y, source, {
      fontFamily: 'Georgia, serif', fontSize: `${size}px`, color: '#f3e6bc', align: 'center',
    }).setOrigin(0.5)
    text(512, 46, () => t('boarding'), 30)
    text(512, 86, () => this.enemy ? translateData(this.enemy.name) : '', 20)
    for (let row = 140; row < 440; row += 40) this.add.graphics().lineStyle(1, 0x93b8aa, 0.2).lineBetween(32, row, 992, row)
    this.add.image(245, 290, 'ship_player', 'ship_player_normal_0').setDisplaySize(185, 185)
    if (this.enemy) {
      const frames = ['handelsmand', 'troppetransport', 'kanonbaad', 'galease', 'brig', 'skonnert', 'orlogsmand', 'soeroverskib']
      const ship = this.add.image(760, 290, 'ships_enemy', `${frames[this.enemy.id - 1]}_sideview`)
      ship.setScale(Math.min(300 / ship.width, 200 / ship.height))
    }
    this.add.image(512, 330, 'boarding', 'dinghy_row_0').setDisplaySize(85, 55).setName('boarding-boat')
    text(245, 450, () => t('crew', { crew: this.gameState.crew }), 28)
    text(760, 450, () => t('crew', { crew: this.defenders }), 28)
    for (const [x, current, maximum, color] of [[245, this.gameState.crew, this.initialCrew, 0x61c6b2], [760, this.defenders, this.initialDefenders, 0xd88465]]) {
      this.add.rectangle(x, 495, 270, 14, 0x0e292f)
      this.add.rectangle(x - 135, 495, 270 * current / Math.max(1, maximum), 14, color).setOrigin(0, 0.5)
    }
    text(512, 567, this.message, 21).setWordWrapWidth(900)
    const action = (x: number, key: 'boardingAssault' | 'boardingGuard' | 'boardingWithdraw', callback: () => void) => {
      const control = text(x, 690, () => t(key), 22).setPadding(16, 14).setBackgroundColor(this.busy ? '#365557' : '#7e392f').setName(`action-${key}`)
      if (!this.busy) control.setInteractive({ useHandCursor: true }).on('pointerdown', callback)
    }
    action(190, 'boardingAssault', () => this.engage('assault'))
    action(512, 'boardingGuard', () => this.engage('guard'))
    action(834, 'boardingWithdraw', () => this.withdraw())
  }

  private engage(tactic: 'assault' | 'guard') {
    if (this.busy || this.finished || !this.enemy) return
    this.busy = true
    const result = boardingRound(this.gameState.crew, this.gameState.crewMorale, this.defenders, 1, tactic)
    this.gameState.crew = Math.max(0, this.gameState.crew - result.playerCrewLoss)
    this.defenders = Math.max(0, this.defenders - result.enemyCrewLoss)
    this.message = () => t('boardingExchange', { own: result.playerCrewLoss, enemy: result.enemyCrewLoss })
    this.draw()
    const boat = this.children.getByName('boarding-boat')
    this.tweens.add({ targets: boat, x: 640, duration: 350, yoyo: true })
    this.time.delayedCall(800, () => {
      if (this.gameState.crew <= 0) return this.finish(false)
      if (this.defenders <= Math.min(19, Math.floor(this.initialDefenders * 0.2))) return this.finish(true)
      this.busy = false
      this.draw()
    })
  }

  private withdraw() {
    if (this.busy || this.finished) return
    this.gameState.crewMorale = updateMorale(this.gameState.crewMorale, 'flee')
    this.finish(false)
  }

  private finish(captured: boolean) {
    if (this.finished) return
    this.finished = true
    if (this.onReturn) {
      this.scene.stop()
      this.scene.resume('BattleScene')
      this.onReturn(captured, this.defenders)
    } else {
      this.scene.start('WorldMapScene', { gameState: this.gameState })
    }
  }
}
