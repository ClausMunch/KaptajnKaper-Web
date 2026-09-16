/**
 * BattleUI - Battle scene UI rendering
 * 
 * Renders all battle interface elements:
 * - Health/hull bars for both ships
 * - Distance indicator
 * - Wind direction and severity
 * - Hit probability display
 * - Crew status
 * - Combat log (last 3 actions)
 * - Input prompts
 */

import Phaser from 'phaser'
import { t, translateData, resolveText, TextSource, MessageKey } from '../i18n'
import { localizedText } from '../utils/LocalizedText'

export interface BattleUIConfig {
  width: number
  height: number
  scene: Phaser.Scene
}

export class BattleUI {
  private scene: Phaser.Scene
  private width: number
  private height: number

  private healthBarTexts: Map<string, Phaser.GameObjects.Text> = new Map()
  private uiTexts: Map<string, Phaser.GameObjects.Text> = new Map()
  private battleLog: TextSource[] = []

  constructor(config: BattleUIConfig) {
    this.scene = config.scene
    this.width = config.width
    this.height = config.height
  }

  /**
   * Draw health/hull bar with background
   * Used for both player and enemy ships
   */
  private drawHealthBar(
    x: number,
    y: number,
    current: number,
    max: number,
    color: number
  ): void {
    const barWidth = 120
    const barHeight = 16

    // Background (damaged state)
    this.scene.add
      .rectangle(x, y, barWidth + 4, barHeight + 4, 0x333333)
      .setOrigin(0.5)
      .setDepth(100)

    // Health bar (colored fill)
    const healthWidth = Math.max(0, (current / max) * barWidth)
    this.scene.add
      .rectangle(
        x - barWidth / 2 + healthWidth / 2,
        y,
        healthWidth,
        barHeight,
        color
      )
      .setOrigin(0.5)
      .setDepth(101)

    // Health text
    this.scene.add
      .text(x, y, `${Math.max(0, current)}/${max}`, {
        fontSize: '10px',
        color: '#fff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(102)
  }

  /**
   * Render player and enemy health bars
   * Also shows ship names
   */
  drawHealthBars(
    playerHealth: number,
    maxPlayerHealth: number,
    enemyName: string,
    enemyHealth: number,
    maxEnemyHealth: number
  ): void {
    // Player ship
    localizedText(this.scene, this.width * 0.15, this.height * 0.08, () => t('yourShip'), {
        fontSize: '16px',
        color: '#8ecc00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(100)

    this.drawHealthBar(
      this.width * 0.15,
      this.height * 0.12,
      playerHealth,
      maxPlayerHealth,
      0x00cc00
    )

    // Enemy ship
    localizedText(this.scene, this.width * 0.85, this.height * 0.08, () => translateData(enemyName), {
        fontSize: '16px',
        color: '#ff6644',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(100)

    this.drawHealthBar(
      this.width * 0.85,
      this.height * 0.12,
      enemyHealth,
      maxEnemyHealth,
      0xff4444
    )
  }

  /**
   * Render distance indicator
   * Shows current distance and how it affects accuracy
   */
  drawDistance(distance: number): void {
    const distanceText = () => t(distance <= 3 ? 'close' : distance <= 6 ? 'medium' : 'far')
    const color = distance <= 3 ? '#00ff00' : distance <= 6 ? '#ffff00' : '#ff6644'

    localizedText(this.scene, this.width * 0.5, this.height * 0.25, () => t('distance', { distance, range: distanceText() }), {
        fontSize: '14px',
        color: color,
        fontStyle: 'bold',
        backgroundColor: '#111111',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(100)
  }

  /**
   * Render wind direction and severity
   * Wind affects accuracy and ship movement
   */
  drawWind(severity: 0 | 1 | 2 | 3): void {
    const windColors: Record<number, string> = {
      0: '#00ff00',
      1: '#ffff00',
      2: '#ffaa00',
      3: '#ff0000',
    }

    const color = windColors[severity]

    localizedText(this.scene, this.width * 0.5, this.height * 0.3, () => t('wind', { wind: t(`wind${severity}`) }), {
        fontSize: '14px',
        color: color,
        fontStyle: 'bold',
        backgroundColor: '#111111',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(100)
  }

  /**
   * Render hit probabilities for both ships
   * Shows player and enemy chance to hit with visual indicators
   */
  drawFireProbability(playerChance: number, enemyChance: number): void {
    const playerPercent = Math.round(playerChance * 100)
    const enemyPercent = Math.round(enemyChance * 100)

    const playerColor =
      playerPercent >= 70 ? '#00ff00' : playerPercent >= 40 ? '#ffff00' : '#ff6644'
    const enemyColor =
      enemyPercent >= 70 ? '#ff0000' : enemyPercent >= 40 ? '#ffff00' : '#00ff00'

    // Player chance
    localizedText(this.scene, this.width * 0.2, this.height * 0.36, () => t('playerHit', { percent: playerPercent }), {
        fontSize: '14px',
        color: playerColor,
        fontStyle: 'bold',
        backgroundColor: '#111111',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100)

    // Enemy chance
    localizedText(this.scene, this.width * 0.8, this.height * 0.36, () => t('enemyHit', { percent: enemyPercent }), {
        fontSize: '14px',
        color: enemyColor,
        fontStyle: 'bold',
        backgroundColor: '#111111',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100)
  }

  /**
   * Render crew status
   * Shows available crew for both player and enemy
   */
  drawCrewStatus(playerCrew: number, enemyCrew: number): void {
    localizedText(this.scene, this.width * 0.2, this.height * 0.42, () => t('crew', { crew: playerCrew }), {
        fontSize: '12px',
        color: '#aaaaaa',
        backgroundColor: '#111111',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(100)

    localizedText(this.scene, this.width * 0.8, this.height * 0.42, () => t('crew', { crew: enemyCrew }), {
        fontSize: '12px',
        color: '#aaaaaa',
        backgroundColor: '#111111',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(100)
  }

  /**
   * Render morale status
   * Shows morale multiplier effect (affects combat effectiveness)
   */
  drawMoraleStatus(playerMorale: number, enemyMorale: number): void {
    const getMoraleIcon = (morale: number): string => {
      if (morale >= 1.3) return '😤'
      if (morale >= 1.0) return '😊'
      if (morale >= 0.7) return '😐'
      return '😟'
    }

    const getMoraleColor = (morale: number): string => {
      if (morale >= 1.3) return '#ffff00'
      if (morale >= 1.0) return '#00ff00'
      if (morale >= 0.7) return '#ffff00'
      return '#ff6644'
    }

    // Player morale
    localizedText(this.scene,
        this.width * 0.2,
        this.height * 0.48,
        () => `${getMoraleIcon(playerMorale)} ${t('morale', { morale: playerMorale.toFixed(2) })}`,
        {
          fontSize: '12px',
          color: getMoraleColor(playerMorale),
          backgroundColor: '#111111',
          padding: { x: 6, y: 3 },
        }
      )
      .setOrigin(0.5)
      .setDepth(100)

    // Enemy morale
    localizedText(this.scene,
        this.width * 0.8,
        this.height * 0.48,
        () => `${getMoraleIcon(enemyMorale)} ${t('morale', { morale: enemyMorale.toFixed(2) })}`,
        {
          fontSize: '12px',
          color: getMoraleColor(enemyMorale),
          backgroundColor: '#111111',
          padding: { x: 6, y: 3 },
        }
      )
      .setOrigin(0.5)
      .setDepth(100)
  }

  /**
   * Add message to combat log
   * Keeps last 3 messages visible
   */
  addCombatLog(message: TextSource): void {
    this.battleLog.unshift(message)
    if (this.battleLog.length > 3) {
      this.battleLog.pop()
    }
  }

  /**
   * Render combat log
   * Shows last 3 combat actions
   */
  drawCombatLog(messages: TextSource[] = this.battleLog): void {
    const startY = this.height * 0.54
    const lineHeight = 18

    messages.slice(0, 3).forEach((msg, index) => {
      const y = startY + index * lineHeight
      const alpha = 1 - index * 0.25 // Fade older messages

      localizedText(this.scene, this.width * 0.5, y, msg, {
          fontSize: '12px',
          color: '#cccccc',
          backgroundColor: '#1a1a1a',
          padding: { x: 8, y: 4 },
        })
        .setAlpha(alpha)
        .setOrigin(0.5)
        .setDepth(100)
    })
  }

  /**
   * Render action prompts/buttons
   * Shows available actions with keyboard shortcuts
   */
  drawActionPrompts(
    canFire: boolean = true,
    canBoard: boolean = false,
    canYield: boolean = true
  ): void {
    const prompts: MessageKey[] = []

    if (canFire) prompts.push('fire')
    if (canBoard) prompts.push('board')
    if (canYield) prompts.push('yield')

    if (prompts.length === 0) prompts.push('waiting')

    localizedText(this.scene, this.width * 0.5, this.height - 50, () => prompts.map(key => t(key)).join('  |  '), {
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#333333',
        padding: { x: 15, y: 10 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100)
  }

  /**
   * Render round number
   * Tracks combat rounds (limited to 20)
   */
  drawRound(currentRound: number, maxRounds: number = 20): void {
    const roundColor = currentRound >= maxRounds ? '#ff0000' : '#ffff00'

    localizedText(this.scene, this.width * 0.5, this.height * 0.02, () => t('round', { current: currentRound, max: maxRounds }), {
        fontSize: '12px',
        color: roundColor,
        backgroundColor: '#111111',
        padding: { x: 8, y: 4 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100)
  }

  /**
   * Clear all UI elements from scene
   */
  clear(): void {
    this.healthBarTexts.clear()
    this.uiTexts.clear()
  }

  /**
   * Get combat log history
   */
  getCombatLog(): string[] {
    return this.battleLog.map(resolveText)
  }
}
