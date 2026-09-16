import Phaser from 'phaser'
import { t } from '../i18n'
import { localizedText } from '../utils/LocalizedText'
import { GameState } from '../game/GameState'
import { getHarborById } from '../data'

/**
 * HarborApproachScene - Navigate safely into harbor despite obstacles/wind
 */
export class HarborApproachScene extends Phaser.Scene {
  private gameState: GameState
  private harborId: number = 2

  constructor() {
    super({ key: 'HarborApproachScene' })
    this.gameState = {} as GameState
  }

  init(data: { gameState: GameState; harborId?: number }) {
    this.gameState = data.gameState
    this.harborId = data.harborId || 2
  }

  create() {
    const { width, height } = this.scale
    const harbor = getHarborById(this.harborId)
    const harborName = () => harbor?.name || t('harbor', { id: this.harborId })
    
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a4d5c)
    
    localizedText(this, width / 2, height * 0.2, () => t('approach', { harbor: harborName() }), {
        fontSize: '32px',
        color: '#ffdd00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    
    localizedText(this, width / 2, height / 2, () => t('approachInfo'), {
        fontSize: '16px',
        color: '#aaa',
        align: 'center',
      })
      .setOrigin(0.5)
    
    localizedText(this, width * 0.3, height - 80, () => t('enterTrade'), {
        fontSize: '20px',
        color: '#fff',
        backgroundColor: '#333',
        padding: { x: 10, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.enterHarbor())

    localizedText(this, width * 0.7, height - 80, () => t('declineHarbor'), {
      fontSize: '20px',
      color: '#fff',
      backgroundColor: '#333',
      padding: { x: 10, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.leaveHarbor())
    
    // Keyboard handler
    this.input.keyboard?.on('keydown-C', () => this.enterHarbor())
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !this.scene.isActive() || !this.input.keyboard?.enabled || !this.game.input.keyboard?.enabled) return
      event.preventDefault()
      event.stopPropagation()
      this.leaveHarbor()
    }
    window.addEventListener('keydown', onEscape, true)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onEscape, true)
    })
    
    console.log(`✓ HarborApproachScene: Created for harbor ${this.harborId}`)
  }

  private enterHarbor(): void {
    this.scene.start('HarborTradeScene', { gameState: this.gameState, harborId: this.harborId })
  }

  private leaveHarbor(): void {
    this.scene.start('WorldMapScene', { gameState: this.gameState })
  }
}
