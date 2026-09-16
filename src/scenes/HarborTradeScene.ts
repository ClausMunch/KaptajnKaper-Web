import Phaser from 'phaser'
import { t, TextSource } from '../i18n'
import { localizedText, setLocalizedText } from '../utils/LocalizedText'
import type { TradeResult } from '../game/TradingEngine'
import { GameState } from '../game/GameState'
import { getPrices, buyGrain, sellGrain, buyCannon, sellCannon, sellGems, hireCrewMember, hireCrewMembers, repairHull, repairHullToMax } from '../game/TradingEngine'
import { TradeUI } from '../components/TradeUI'
import { getHarborById } from '../data'

/**
 * HarborTradeScene - Buy/sell goods, hire crew, repair ship
 * Provides interactive trading interface with keyboard-driven commands
 */
export class HarborTradeScene extends Phaser.Scene {
  private gameState: GameState
  private harborId: number = 2 // Default to København
  private tradeUI?: TradeUI
  private currentMenu: 'main' | 'grain' | 'cannon' | 'crew' | 'repair' | 'gems' = 'main'
  private selectedQuantity: number = 1
  private inputBuffer: string = ''
  private awaitingConfirmation: boolean = false
  private confirmAction?: () => void
  private menuText?: Phaser.GameObjects.Text
  private menuSource?: TextSource
  private feedback?: TradeResult

  constructor() {
    super({ key: 'HarborTradeScene' })
    this.gameState = {} as GameState
  }

  init(data: { gameState: GameState; harborId?: number; feedback?: TradeResult }) {
    this.gameState = data.gameState
    this.harborId = data.harborId || 2
    this.feedback = data.feedback
    this.currentMenu = 'main'
    this.selectedQuantity = 1
    this.inputBuffer = ''
    this.confirmAction = undefined
    this.menuText = undefined
    this.menuSource = undefined
  }

  create() {
    const { width, height } = this.scale
    
    // Initialize prices at this harbor
    const prices = getPrices(this.harborId, this.gameState.turnsElapsed)
    
    // Initialize UI
    this.tradeUI = new TradeUI(this, this.gameState, this.harborId, prices)
    this.tradeUI.draw()
    const feedback = this.feedback
    if (feedback) this.tradeUI.showTransactionMessage(() => feedback.message, !feedback.success)
    
    // Setup keyboard input handlers
    this.setupKeyboardInput()
    
    console.log(`✓ HarborTradeScene: Created at harbor ${this.harborId}`)
  }

  /**
   * Setup all keyboard input handlers
   */
  private setupKeyboardInput(): void {
    const kbd = this.input.keyboard
    if (!kbd) return
    
    // Main menu commands
    kbd.on('keydown-G', () => this.handleGrainMenu())
    kbd.on('keydown-C', () => this.handleCannonMenu())
    kbd.on('keydown-H', () => this.handleCrewMenu())
    kbd.on('keydown-R', () => this.handleRepairMenu())
    kbd.on('keydown-J', () => this.handleGemsMenu())
    kbd.on('keydown-L', () => this.leaveHarbor())
    
    kbd.on('keydown', (event: KeyboardEvent) => {
      if (!this.confirmAction || !/^(?:[0-9]|Backspace)$/.test(event.key)) return
      event.stopPropagation()
      this.setQuantity(event.key)
    })
    
    // Confirm/Cancel
    kbd.on('keydown-ENTER', (event: KeyboardEvent) => {
      event.stopPropagation()
      if (this.selectedQuantity <= 0) return
      const confirm = this.confirmAction
      this.confirmAction = undefined
      confirm?.()
    })
    kbd.on('keydown-ESC', () => this.cancelAction())
  }

  /**
   * Handle grain trading menu
   */
  private handleGrainMenu(): void {
    if (this.currentMenu !== 'main') return
    
    this.currentMenu = 'grain'
    const prices = getPrices(this.harborId, this.gameState.turnsElapsed)
    
    // Show buy/sell options
    const buyMessage = () => t('grainOptions', { buy: prices.grain, sell: Math.round(prices.grain * 0.8) })
    this.showMenu(buyMessage)
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const buyHandler = () => {
      kbd.off('keydown-B', buyHandler)
      kbd.off('keydown-S', sellHandler)
      this.handleBuyGrain(prices.grain)
    }
    
    const sellHandler = () => {
      kbd.off('keydown-B', buyHandler)
      kbd.off('keydown-S', sellHandler)
      this.handleSellGrain(Math.round(prices.grain * 0.8))
    }
    
    kbd.on('keydown-B', buyHandler)
    kbd.on('keydown-S', sellHandler)
  }

  /**
   * Handle buying grain
   */
  private handleBuyGrain(pricePerUnit: number): void {
    this.selectedQuantity = 1
    this.awaitingConfirmation = false
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const confirmBuy = () => {
      const result = buyGrain(this.gameState, this.selectedQuantity, pricePerUnit)
      
      this.finishTrade(result)
    }
    
    this.confirmAction = confirmBuy
    this.showMenu(() => t('buyGrain', { quantity: this.selectedQuantity, cost: this.selectedQuantity * pricePerUnit }) + '\n' + t('quantityActions'))
  }

  /**
   * Handle selling grain
   */
  private handleSellGrain(pricePerUnit: number): void {
    this.selectedQuantity = 1
    this.awaitingConfirmation = false
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const confirmSell = () => {
      const result = sellGrain(this.gameState, this.selectedQuantity, pricePerUnit)
      
      this.finishTrade(result)
    }
    
    this.confirmAction = confirmSell
    this.showMenu(() => t('sellGrain', { quantity: this.selectedQuantity, cost: this.selectedQuantity * pricePerUnit }) + '\n' + t('quantityActions'))
  }

  /**
   * Handle cannon trading menu
   */
  private handleCannonMenu(): void {
    if (this.currentMenu !== 'main') return
    
    this.currentMenu = 'cannon'
    const prices = getPrices(this.harborId, this.gameState.turnsElapsed)
    
    const buyMessage = () => t('cannonOptions', { buy: prices.cannon, sell: Math.round(prices.cannon * 0.5) })
    this.showMenu(buyMessage)
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const buyHandler = () => {
      kbd.off('keydown-B', buyHandler)
      kbd.off('keydown-S', sellHandler)
      this.handleBuyCannon(prices.cannon)
    }
    
    const sellHandler = () => {
      kbd.off('keydown-B', buyHandler)
      kbd.off('keydown-S', sellHandler)
      this.handleSellCannon(Math.round(prices.cannon * 0.5))
    }
    
    kbd.on('keydown-B', buyHandler)
    kbd.on('keydown-S', sellHandler)
  }

  /**
   * Handle buying cannons
   */
  private handleBuyCannon(pricePerCannon: number): void {
    this.selectedQuantity = 1
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const confirmBuy = () => {
      const result = buyCannon(this.gameState, this.selectedQuantity, pricePerCannon)
      
      this.finishTrade(result)
    }
    
    this.confirmAction = confirmBuy
    this.showMenu(() => t('buyCannons', { quantity: this.selectedQuantity, cost: this.selectedQuantity * pricePerCannon }) + '\n' + t('quantityActions'))
  }

  /**
   * Handle selling cannons
   */
  private handleSellCannon(pricePerCannon: number): void {
    this.selectedQuantity = 1
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const confirmSell = () => {
      const result = sellCannon(this.gameState, this.selectedQuantity, pricePerCannon)
      
      this.finishTrade(result)
    }
    
    this.confirmAction = confirmSell
    this.showMenu(() => t('sellCannons', { quantity: this.selectedQuantity, cost: this.selectedQuantity * pricePerCannon }) + '\n' + t('quantityActions'))
  }

  /**
   * Handle crew hiring menu
   */
  private handleCrewMenu(): void {
    if (this.currentMenu !== 'main') return
    
    this.currentMenu = 'crew'
    const prices = getPrices(this.harborId, this.gameState.turnsElapsed)
    this.selectedQuantity = 1
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const confirmHire = () => {
      let result
      if (this.selectedQuantity === 1) {
        result = hireCrewMember(this.gameState, prices.crewPerPerson)
      } else {
        result = hireCrewMembers(this.gameState, this.selectedQuantity, prices.crewPerPerson)
      }
      
      this.finishTrade(result)
    }
    
    this.confirmAction = confirmHire
    this.showMenu(() => t('hireCrew', { quantity: this.selectedQuantity, cost: this.selectedQuantity * prices.crewPerPerson }) + '\n' + t('quantityActions'))
  }

  /**
   * Handle hull repair menu
   */
  private handleRepairMenu(): void {
    if (this.currentMenu !== 'main') return
    
    this.currentMenu = 'repair'
    const prices = getPrices(this.harborId, this.gameState.turnsElapsed)
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    // Option to repair specific amount or to max
    const maxRepairPoints = this.gameState.maxHullIntegrity - this.gameState.hullIntegrity
    
    if (maxRepairPoints <= 0) {
      this.tradeUI?.showTransactionMessage(() => t('hullFull'), true)
      this.currentMenu = 'main'
      return
    }
    
    this.selectedQuantity = 1
    
    const confirmRepair = () => {
      const result = repairHull(this.gameState, this.selectedQuantity, prices.repairPerPoint)
      
      this.finishTrade(result)
    }
    
    const maxHandler = () => {
      const result = repairHullToMax(this.gameState, prices.repairPerPoint)
      
      this.finishTrade(result)
    }
    
    this.confirmAction = confirmRepair
    this.showMenu(() => t('repairHull', { quantity: this.selectedQuantity, cost: this.selectedQuantity * prices.repairPerPoint }) + '\n' + t('quantityActions') + '\n' + t('repairMax'))
    
    kbd.on('keydown-M', maxHandler)
  }

  /**
   * Handle gems selling menu
   */
  private handleGemsMenu(): void {
    if (this.currentMenu !== 'main') return
    
    const gems = (this.gameState as any).gems || 0
    
    if (gems <= 0) {
      this.tradeUI?.showTransactionMessage(() => t('noGems'), true)
      return
    }
    
    this.currentMenu = 'gems'
    const prices = getPrices(this.harborId, this.gameState.turnsElapsed)
    this.selectedQuantity = Math.min(1, gems)
    
    const kbd = this.input.keyboard
    if (!kbd) return
    
    const confirmSell = () => {
      const result = sellGems(this.gameState, this.selectedQuantity, prices.gemsSell)
      
      this.finishTrade(result)
    }
    
    this.confirmAction = confirmSell
    this.showMenu(() => t('sellGems', { quantity: this.selectedQuantity, cost: this.selectedQuantity * prices.gemsSell }) + '\n' + t('quantityActions'))
  }

  private setQuantity(key: string): void {
    if (!this.confirmAction) return
    if (/^[0-9]$/.test(key)) {
      const next = this.inputBuffer + key
      if (!Number.isSafeInteger(Number(next))) return
      this.inputBuffer = next
    } else if (key === 'Backspace') {
      this.inputBuffer = this.inputBuffer.slice(0, -1)
    } else {
      return
    }
    this.selectedQuantity = Number(this.inputBuffer)
    if (this.menuText && this.menuSource) setLocalizedText(this.menuText, this.menuSource)
  }

  /**
   * Show temporary menu message
   */
  private showMenu(message: TextSource): void {
    const { width, height } = this.scale
    this.menuText?.destroy()
    this.menuSource = message
    
    this.menuText = localizedText(this, width / 2, height * 0.54, message, {
        fontSize: '14px',
        color: '#ffff00',
        fontFamily: 'Courier New',
        align: 'center',
        backgroundColor: '#1a1a1a',
        padding: { x: 20, y: 10 },
        wordWrap: { width: width - 100 },
      })
      .setOrigin(0.5)
      .setDepth(999)
  }

  private finishTrade(result: TradeResult): void {
    if (result.success && result.newState) this.gameState = result.newState
    this.scene.restart({ gameState: this.gameState, harborId: this.harborId, feedback: result })
  }

  /**
   * Cancel current action
   */
  private cancelAction(): void {
    this.currentMenu = 'main'
    this.selectedQuantity = 1
    this.confirmAction = undefined
    this.scene.restart({ gameState: this.gameState, harborId: this.harborId })
  }

  /**
   * Leave harbor and return to world map
   */
  private leaveHarbor(): void {
    // Ensure gems field is initialized
    if ((this.gameState as any).gems === undefined) {
      (this.gameState as any).gems = 0
    }
    
    this.scene.start('WorldMapScene', { gameState: this.gameState })
  }
}

