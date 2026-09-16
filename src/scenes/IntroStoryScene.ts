import Phaser from 'phaser'
import { createInitialGameState } from '../game/GameState'
import { getPlayerName } from '../leaderboard'
import { t } from '../i18n'
import { localizedText } from '../utils/LocalizedText'

/**
 * IntroStoryScene - Game introduction and story (Komtesse Julie, kaperbrev)
 */
export class IntroStoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroStoryScene' })
  }

  create() {
    const { width, height } = this.scale
    
    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f)
    
    localizedText(this, width / 2, height / 2, () => t('story'), {
        fontSize: '18px',
        color: '#ddd',
        fontFamily: 'Courier New',
        align: 'center',
        wordWrap: { width: width - 100 },
      })
      .setOrigin(0.5)
    
    // Continue button
    const continueBtn = localizedText(this, width / 2, height - 80, () => t('continue'), {
        fontSize: '24px',
        color: '#fff',
        backgroundColor: '#333',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const name = getPlayerName()
        if (name) this.scene.start('WorldMapScene', { gameState: createInitialGameState(1, name) })
      })
    
    continueBtn.on('pointerover', () => continueBtn.setStyle({ backgroundColor: '#555' }))
    continueBtn.on('pointerout', () => continueBtn.setStyle({ backgroundColor: '#333' }))
    
    console.log('✓ IntroStoryScene: Created')
  }
}
