/**
 * TradeUI - Rendering and display logic for harbor trading interface
 * Handles inventory display, price display, trading menu, and transaction feedback
 */

import Phaser from 'phaser'
import { t, translateData, TextSource, MessageKey } from '../i18n'
import { localizedText } from '../utils/LocalizedText'
import { GameState } from '../game/GameState'
import { Prices, getResourceStatus } from '../game/TradingEngine'
import { getGameConfig, getHarborById } from '../data'

export class TradeUI {
  private scene: Phaser.Scene
  private gameState: GameState
  private harborId: number
  private prices: Prices
  
  // UI Text objects
  private inventoryText?: Phaser.GameObjects.Text
  private pricesText?: Phaser.GameObjects.Text
  private menuText?: Phaser.GameObjects.Text
  private statusText?: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, gameState: GameState, harborId: number, prices: Prices) {
    this.scene = scene
    this.gameState = gameState
    this.harborId = harborId
    this.prices = prices
  }

  /**
   * Draw the complete trading interface
   */
  public draw(): void {
    const { width, height } = this.scene.scale
    
    // Clear previous UI
    this.clearUI()
    
    // Background
    this.scene.add.rectangle(width / 2, height / 2, width, height, 0x3a3a2a)
    
    // Harbor name and description
    this.drawHarborInfo(width, height)
    
    // Inventory display
    this.drawInventory(width, height)
    
    // Prices display
    this.drawPrices(width, height)
    
    // Trading menu and instructions
    this.drawTradeMenu(width, height)
    
    // Resource capacity warnings
    this.drawCapacityWarnings(width, height)
  }

  /**
   * Draw harbor name and description
   */
  private drawHarborInfo(width: number, height: number): void {
    const harbor = getHarborById(this.harborId)
    const title = () => harbor ? harbor.name : t('harbor', { id: this.harborId })
    
    localizedText(this.scene, width / 2, height * 0.08, title, {
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffdd00',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
    
    if (harbor) {
      localizedText(this.scene, width / 2, height * 0.13, () => translateData(harbor.description), {
          fontSize: '12px',
          color: '#aaa',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
    }
  }

  /**
   * Draw player inventory with current resources
   */
  private drawInventory(width: number, height: number): void {
    const config = getGameConfig()
    const gems = (this.gameState as any).gems || 0
    
    const inventoryText = () => t('inventory', {
      crew: this.gameState.crew, maxCrew: config.crewCapacity,
      grain: this.gameState.grain, maxGrain: config.maxGrain,
      cannons: this.gameState.cannons, maxCannons: config.maxCannons,
      money: this.gameState.rigsdaler, maxMoney: config.maxRigsdaler,
      gems, hull: this.gameState.hullIntegrity, maxHull: this.gameState.maxHullIntegrity,
    })
    
    this.inventoryText = localizedText(this.scene, width * 0.05, height * 0.22, inventoryText, {
        fontSize: '13px',
        color: '#fff',
        fontFamily: 'Courier New',
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
  }

  /**
   * Draw current market prices at this harbor
   */
  private drawPrices(width: number, height: number): void {
    const pricesText = () => t('prices', {
      harbor: getHarborById(this.harborId)?.name || t('harbor', { id: this.harborId }),
      grain: this.prices.grain, cannon: this.prices.cannon, crew: this.prices.crewPerPerson,
      repair: this.prices.repairPerPoint, gems: this.prices.gemsSell,
    })
    
    this.pricesText = localizedText(this.scene, width * 0.55, height * 0.22, pricesText, {
        fontSize: '13px',
        color: '#90ff00',
        fontFamily: 'Courier New',
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
  }

  /**
   * Draw the interactive trading menu
   */
  private drawTradeMenu(width: number, height: number): void {
    this.menuText = localizedText(this.scene, width / 2, height * 0.73, () => t('tradeMenu'), {
        fontSize: '12px',
        color: '#aaaaff',
        fontFamily: 'Courier New',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
  }

  /**
   * Draw capacity warnings for resources at limit
   */
  private drawCapacityWarnings(width: number, height: number): void {
    const warnings: MessageKey[] = []
    const config = getGameConfig()
    
    if (this.gameState.crew >= config.crewCapacity) {
      warnings.push('crewFull')
    }
    if (this.gameState.grain >= config.maxGrain) {
      warnings.push('grainFull')
    }
    if (this.gameState.cannons >= config.maxCannons) {
      warnings.push('cannonsFull')
    }
    if (this.gameState.rigsdaler >= config.maxRigsdaler * 0.95) {
      warnings.push('moneyFull')
    }
    
    if (warnings.length > 0) {
      this.statusText = localizedText(this.scene, width / 2, height * 0.92, () => warnings.map(key => t(key)).join(' | '), {
          fontSize: '12px',
          color: '#ff6644',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: width - 80 },
        })
        .setOrigin(0.5)
    }
  }

  /**
   * Display transaction feedback (success or error)
   */
  public showTransactionMessage(message: TextSource, isError: boolean = false): void {
    const { width, height } = this.scene.scale
    const color = isError ? '#ff6644' : '#00ff00'
    const duration = 2000
    
    const messageText = localizedText(this.scene, width / 2, height * 0.54, message, {
        fontSize: '18px',
        color,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
        wordWrap: { width: width - 100 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
    
    // Auto-fade out
    this.scene.time.delayedCall(duration, () => {
      messageText.destroy()
    })
  }

  /**
   * Display price confirmation before purchase
   */
  public showPriceConfirmation(item: string, quantity: number, totalCost: number): string {
    return t('buyConfirmation', { item: translateData(item), quantity, cost: totalCost })
  }

  /**
   * Display a prompt for quantity input
   */
  public showQuantityPrompt(item: string, maxAvailable: number): string {
    return t('quantityPrompt', { item: translateData(item), max: maxAvailable })
  }

  /**
   * Clear all UI text objects
   */
  private clearUI(): void {
    ;[this.inventoryText, this.pricesText, this.menuText, this.statusText].forEach((text) => {
      if (text && !text.active) {
        text.destroy()
      }
    })
  }

  /**
   * Update the displayed inventory (call after transaction)
   */
  public updateInventory(newState: GameState): void {
    this.gameState = newState
    if (this.inventoryText) {
      this.inventoryText.destroy()
      const { width, height } = this.scene.scale
      this.drawInventory(width, height)
    }
  }

  /**
   * Get resource display string with capacity indicator
   */
  public getResourceDisplay(resource: 'crew' | 'grain' | 'cannons' | 'rigsdaler'): string {
    const status = getResourceStatus(this.gameState)
    const amount = this.gameState[resource]
    const config = getGameConfig()
    
    const limits = {
      crew: config.crewCapacity,
      grain: config.maxGrain,
      cannons: config.maxCannons,
      rigsdaler: config.maxRigsdaler,
    }
    
    const limit = limits[resource]
    const percentFull = Math.round((amount / limit) * 100)
    
    return `${amount}/${limit} (${percentFull}%)`
  }
}
