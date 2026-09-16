import Phaser from 'phaser'
import { t, translateData } from '../i18n'
import { localizedText, setLocalizedText } from '../utils/LocalizedText'
import { submitScore } from '../leaderboard'
import { GameState } from '../game/GameState'

/**
 * GameOverScene - Victory, defeat, or highscore
 */
export class GameOverScene extends Phaser.Scene {
  private gameState: GameState
  private reason: string

  constructor() {
    super({ key: 'GameOverScene' })
    this.gameState = {} as GameState
    this.reason = 'Game Over'
  }

  init(data: { gameState: GameState; reason?: string }) {
    this.gameState = data.gameState
    this.reason = data.reason || 'Game Over'
  }

  create() {
    const { width, height } = this.scale
    
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f)
    
    localizedText(this, width / 2, height * 0.3, () => translateData(this.reason), {
        fontSize: '40px',
        color: '#fff',
      })
      .setOrigin(0.5)
    
    this.add.text(width / 2, height * 0.39, this.gameState.playerName, {
      fontSize: '20px', color: '#ffe4a0',
    }).setOrigin(0.5)

    localizedText(this, width / 2, height / 2, () => t('results', {
      score: this.gameState.score, crew: this.gameState.crew,
      money: this.gameState.rigsdaler, turns: this.gameState.turnsElapsed,
    }), {
        fontSize: '20px',
        color: '#aaa',
        align: 'center',
      })
      .setOrigin(0.5)
    
    localizedText(this, width / 2, height * 0.75, () => t('endActions'), {
        fontSize: '16px',
        color: '#fff',
        backgroundColor: '#333',
        padding: { x: 10, y: 10 },
      })
      .setOrigin(0.5)
    
    const scoreStatus = localizedText(this, width / 2, height * 0.65, () => t('scoreSaving'), {
      fontSize: '16px', color: '#d6dfbf', align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5)
    let saving = false
    const state = this.gameState
    const save = async () => {
      if (saving) return
      saving = true
      scoreStatus.disableInteractive()
      setLocalizedText(scoreStatus, () => t('scoreSaving'))
      try {
        await submitScore(state)
        if (scoreStatus.scene) setLocalizedText(scoreStatus, () => t('scoreSaved'))
      } catch {
        if (scoreStatus.scene) {
          setLocalizedText(scoreStatus, () => t('scoreRetry'))
          scoreStatus.setInteractive({ useHandCursor: true })
        }
      } finally {
        saving = false
      }
    }
    scoreStatus.on('pointerdown', () => void save())
    void save()

    this.input.keyboard?.on('keydown-R', () => {
      this.scene.start('IntroStoryScene')
    })
    
    this.input.keyboard?.on('keydown-Q', () => {
      this.scene.start('TitleScene')
    })
    
    console.log('✓ GameOverScene: Created')
  }
}
