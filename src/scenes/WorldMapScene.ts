import Phaser from 'phaser'
import { t, translateData } from '../i18n'
import { localizedText, setLocalizedText } from '../utils/LocalizedText'
import { GameState, createInitialGameState } from '../game/GameState'
import { getMapData, getEnemyById } from '../data'
import { advanceSea, populateSea, getStormProfile } from '../game/SeaEncounters'
import { isInBounds, isLand, isHarbor } from '../utils/MapUtils'

/**
 * WorldMapScene - Tile-based map navigation of Kattegat
 * Player moves 8-directionally between water tiles using Tiled tilemap
 * Land tiles cause damage, harbor tiles trigger entry
 */
export class WorldMapScene extends Phaser.Scene {
  private gameState: GameState
  private playerShip!: Phaser.Physics.Arcade.Sprite
  private mapData = getMapData()
  private tilemap?: Phaser.Tilemaps.Tilemap
  private uiText!: Phaser.GameObjects.Text
  private contactLayer!: Phaser.GameObjects.Container
  private seaMessage!: Phaser.GameObjects.Text
  private tileSize = 32
  private mapX = 32
  private mapY = 96

  constructor() {
    super({ key: 'WorldMapScene' })
    this.gameState = createInitialGameState(1) // difficulty 1 (normal)
  }

  init(data: { gameState?: GameState } = {}) {
    this.gameState = data.gameState ?? createInitialGameState(1)
    this.mapData = getMapData(this.gameState.worldMode)
    this.tileSize = this.gameState.worldMode === 'expanded' ? 16 : 32
  }

  preload() {
    this.load.svg('chart-tiles', 'assets/tilesets/tileset-chart.svg')
  }

  create() {
    const { width, height } = this.scale
    this.add.rectangle(width / 2, height / 2, width, height, 0xd5c79e)
    localizedText(this, this.mapX, 26, () => this.gameState.worldMode === 'expanded' ? t('expandedChart') : 'KATTEGAT', {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#293f3b', fontStyle: 'bold',
    })
    localizedText(this, width - this.mapX, 45, () => t(this.gameState.worldMode === 'expanded' ? 'expandedLocation' : 'titleLocation'), {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#4c513d',
    }).setOrigin(1, 0.5)

    const data = Array.from({ length: this.mapData.dimensions.height }, (_, y) =>
      Array.from({ length: this.mapData.dimensions.width }, (_, x) => {
        if (!isLand(x, y, this.mapData)) return (x * 3 + y * 7) % 4
        const edges = [[0, -1], [1, 0], [0, 1], [-1, 0]]
        return 4 + edges.reduce((mask, [dx, dy], index) =>
          mask | (isInBounds(x + dx, y + dy, this.mapData) && !isLand(x + dx, y + dy, this.mapData) ? 1 << index : 0), 0)
      })
    )
    this.tilemap = this.make.tilemap({ data, tileWidth: 32, tileHeight: 32 })
    const tileset = this.tilemap.addTilesetImage('chart-tiles')!
    this.tilemap.createLayer(0, tileset, this.mapX, this.mapY)!.setScale(this.tileSize / 32).setCollisionBetween(4, 19)

    const chartWidth = this.mapData.dimensions.width * this.tileSize
    const chartHeight = this.mapData.dimensions.height * this.tileSize
    const grid = this.add.graphics()
    for (let column = 0; column <= this.tilemap.width; column++) {
      grid.lineStyle(1, 0xc8d0aa, column % 5 === 0 ? 0.25 : 0.1)
      grid.lineBetween(this.mapX + column * this.tileSize, this.mapY, this.mapX + column * this.tileSize, this.mapY + chartHeight)
    }
    for (let row = 0; row <= this.tilemap.height; row++) {
      grid.lineStyle(1, 0xc8d0aa, row % 5 === 0 ? 0.25 : 0.1)
      grid.lineBetween(this.mapX, this.mapY + row * this.tileSize, this.mapX + chartWidth, this.mapY + row * this.tileSize)
    }
    grid.lineStyle(2, 0x4d5844).strokeRect(this.mapX - 3, this.mapY - 3, chartWidth + 6, chartHeight + 6)
    const regions: [string, number, number][] = this.gameState.worldMode === 'expanded'
      ? [['Jylland', 16, 17], ['Norge', 10, 2], ['Sverige', 31, 9]]
      : [['Jylland', 2, 1], ['Sjælland', 20, 11], ['Sverige', 28, 4]]
    for (const [name, x, y] of regions) {
      localizedText(this, this.mapX + x * this.tileSize, this.mapY + y * this.tileSize, () => name === 'Norge' ? t('norway') : name === 'Sverige' ? t('sweden') : name, {
        fontFamily: 'Georgia, serif', fontSize: '16px', fontStyle: 'italic', color: '#344e3d',
      }).setOrigin(0.5)
    }
    if (this.gameState.worldMode === 'expanded') {
      for (const [key, column, row] of [['northSea', 6, 17], ['balticSea', 43, 21]] as const) {
        localizedText(this, this.mapX + column * this.tileSize, this.mapY + row * this.tileSize, () => t(key), {
          fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'italic', color: '#d1d9b1',
        }).setOrigin(0.5).setAlpha(0.8)
      }
    }

    // Draw harbor markers (optional visual overlay)
    this.mapData.harborLocations.forEach((loc) => {
      const px = this.mapX + loc.x * this.tileSize + this.tileSize / 2
      const py = this.mapY + loc.y * this.tileSize + this.tileSize / 2
      this.add
        .circle(px, py, this.tileSize === 16 ? 4 : 6, 0x9e493a)
        .setStrokeStyle(2, 0xf3dfad)
        .setDepth(100)
      const labelLeft = this.gameState.worldMode === 'expanded' ? [5, 6, 7].includes(loc.harborId) : loc.x > 22
      this.add.text(px + (labelLeft ? -12 : 12), py, loc.name, {
        fontFamily: 'Georgia, serif', fontSize: this.tileSize === 16 ? '12px' : '13px', color: '#fff0c4',
        backgroundColor: '#244b4b', padding: { x: 4, y: 2 },
      }).setOrigin(labelLeft ? 1 : 0, 0.5).setDepth(100)
    })

    const start = this.gameState.currentMapTile
    const startX = this.mapX + start.x * this.tileSize + this.tileSize / 2
    const startY = this.mapY + start.y * this.tileSize + this.tileSize / 2

    this.playerShip = this.physics.add
      .sprite(startX, startY, 'ship_player', 'ship_player_normal_0')
      .setOrigin(0.5)
      .setDisplaySize(this.tileSize === 16 ? 22 : 28, this.tileSize === 16 ? 22 : 28)
      .setCollideWorldBounds(true)
      .setBounce(0.2)
      .setDepth(150)

    // Play idle animation
    this.playerShip.play('ship_player_normal_rock')

    if (!this.gameState.seaContacts) populateSea(this.gameState)
    this.contactLayer = this.add.container(0, 0).setDepth(90)
    this.seaMessage = localizedText(this, width / 2, 604, () => t('seaTraffic', {
      ships: this.gameState.seaContacts!.filter(contact => contact.kind === 'enemy').length,
      storms: this.gameState.seaContacts!.filter(contact => contact.kind === 'storm').length,
    }), { fontFamily: 'Georgia, serif', fontSize: '17px', color: '#72362c' }).setOrigin(0.5).setDepth(200)
    this.drawSeaContacts()

    // Input handling
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.handleInput(event.key)
    })

    // UI text (status bar)
    this.uiText = this.add
      .text(width / 2, 636, '', {
        fontFamily: 'Georgia, serif', fontSize: '19px',
        color: '#293f3b', align: 'center', lineSpacing: 12,
      })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(920)
      .setDepth(200)

    this.updateUI()
    console.log(`✓ WorldMapScene: Ready at [${start.x}, ${start.y}] with Tiled tilemap`)
  }

  private handleInput(key: string) {
    const mapDim = this.mapData.dimensions
    // Convert pixel position to tile coordinates more accurately
    const x = this.gameState.currentMapTile.x
    const y = this.gameState.currentMapTile.y

    let newX = x
    let newY = y

    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
      case '8':
        newY = y - 1
        break
      case 'arrowdown':
      case 's':
      case '2':
        newY = y + 1
        break
      case 'arrowleft':
      case 'a':
      case '4':
        newX = x - 1
        break
      case 'arrowright':
      case 'd':
      case '6':
        newX = x + 1
        break
      case '7':
        newX = x - 1
        newY = y - 1
        break
      case '9':
        newX = x + 1
        newY = y - 1
        break
      case '1':
        newX = x - 1
        newY = y + 1
        break
      case '3':
        newX = x + 1
        newY = y + 1
        break
      default:
        return
    }

    // Check bounds
    if (newX < 0 || newX >= mapDim.width || newY < 0 || newY >= mapDim.height) {
      return
    }

    // Check for land collision
    if (isLand(newX, newY, this.mapData)) {
      console.log('💥 Hit land! Taking damage')
      this.gameState.hullIntegrity -= 5
      this.updateUI()
      return
    }

    // Check for harbor
    const harbor = isHarbor(newX, newY, this.mapData)
    if (harbor) {
      console.log(`⚓ Entering harbor ${harbor.harborId}: ${harbor.name}`)
      this.scene.start('HarborApproachScene', { gameState: this.gameState, harborId: harbor.harborId })
      return
    }

    // Move player
    this.gameState.currentMapTile = { x: newX, y: newY }
    this.playerShip.setPosition(this.mapX + newX * this.tileSize + this.tileSize / 2, this.mapY + newY * this.tileSize + this.tileSize / 2)
    this.gameState.turnsElapsed++

    // Consume grain
    if (this.gameState.grain > 0) {
      this.gameState.grain -= 0.5 // Grain consumption per turn
    } else {
      this.gameState.crew -= 1 // Crew dies of starvation
    }

    const encounter = advanceSea(this.gameState)
    if (this.gameState.turnsElapsed % 12 === 0) populateSea(this.gameState)
    this.drawSeaContacts()
    setLocalizedText(this.seaMessage, () => encounter.stormDamage
      ? t('stormDamage', { damage: encounter.stormDamage })
      : t('seaTraffic', {
        ships: this.gameState.seaContacts!.filter(contact => contact.kind === 'enemy').length,
        storms: this.gameState.seaContacts!.filter(contact => contact.kind === 'storm').length,
      }))
    if (encounter.stormDamage) {
      this.cameras.main.shake(encounter.stormDamage >= 20 ? 450 : 220, encounter.stormDamage >= 20 ? 0.009 : 0.004)
      this.cameras.main.flash(encounter.stormDamage >= 20 ? 300 : 180, 190, 210, 220)
    }
    this.updateUI()
    if (this.gameState.hullIntegrity <= 0 || this.gameState.crew <= 0) {
      this.scene.start('GameOverScene', { gameState: this.gameState, reason: 'Defeated' })
    } else if (encounter.enemyId !== undefined) {
      this.scene.start('BattleScene', { gameState: this.gameState, enemyId: encounter.enemyId })
    }
  }

  private drawSeaContacts() {
    this.tweens.killTweensOf(this.contactLayer.list)
    this.contactLayer.removeAll(true)
    const frames = ['handelsmand', 'troppetransport', 'kanonbaad', 'galease', 'brig', 'skonnert', 'orlogsmand', 'soeroverskib']
    for (const contact of this.gameState.seaContacts ?? []) {
      const px = this.mapX + contact.x * this.tileSize + this.tileSize / 2
      const py = this.mapY + contact.y * this.tileSize + this.tileSize / 2
      const marker = this.add.container(px, py).setSize(this.tileSize, this.tileSize).setInteractive()
      if (contact.kind === 'enemy') {
        marker.add(this.add.circle(0, 0, this.tileSize / 2 - 2, 0x873c30, 0.7).setStrokeStyle(1, 0xffd49a))
        marker.add(this.add.image(0, 0, 'ships_enemy', `${frames[contact.enemyId - 1]}_topview`).setDisplaySize(this.tileSize * 0.53, this.tileSize * 0.84))
        const enemy = getEnemyById(contact.enemyId)!
        const describe = () => setLocalizedText(this.seaMessage, () => t('shipSighting', {
          ship: translateData(enemy.name), cannons: enemy.cannons, crew: enemy.crew,
        }))
        marker.on('pointerover', describe).on('pointerdown', describe)
      } else {
        const profile = getStormProfile(this.gameState, contact)
        if (profile.radius) {
          const footprint = this.add.graphics().fillStyle(0x182d37, 0.35).lineStyle(1, 0xb8dfe0, 0.65)
          for (let offsetY = -profile.radius; offsetY <= profile.radius; offsetY++) {
            for (let offsetX = -profile.radius; offsetX <= profile.radius; offsetX++) {
              if (!isInBounds(contact.x + offsetX, contact.y + offsetY, this.mapData)) continue
              const left = offsetX * this.tileSize - this.tileSize / 2
              const top = offsetY * this.tileSize - this.tileSize / 2
              footprint.fillRect(left, top, this.tileSize, this.tileSize).strokeRect(left, top, this.tileSize, this.tileSize)
            }
          }
          marker.add(footprint)
          marker.setSize(this.tileSize * 5, this.tileSize * 5)
        }
        const cloud = this.add.graphics()
        cloud.fillStyle(0x223139, 0.95)
        cloud.fillCircle(-8, -3, 7).fillCircle(1, -7, 9).fillCircle(10, -2, 6).fillRoundedRect(-13, -4, 28, 9, 3)
        cloud.lineStyle(2, 0xc4e6e4, 0.9)
        for (const offset of [-8, 0, 8]) cloud.lineBetween(offset, 8, offset - 3, 14)
        cloud.lineStyle(2, 0xf4d684).lineBetween(3, 0, -2, 7).lineBetween(-2, 7, 3, 7).lineBetween(3, 7, -2, 13)
        cloud.setScale(profile.radius ? 1.65 : this.tileSize / 32)
        marker.add(cloud)
        this.tweens.add({ targets: marker, alpha: profile.radius ? 0.45 : 0.65, duration: profile.radius ? 450 : 1100, yoyo: true, repeat: -1 })
        const describe = () => setLocalizedText(this.seaMessage, () => profile.radius ? t('offshoreStormSighting', {
          min: profile.minDamage + this.gameState.difficulty * 2,
          max: profile.minDamage + profile.variation - 1 + this.gameState.difficulty * 2,
        }) : t('stormSighting'))
        marker.on('pointerover', describe).on('pointerdown', describe)
      }
      this.contactLayer.add(marker)
    }
  }

  private updateUI() {
    setLocalizedText(this.uiText, () => t('mapStatus', {
      x: this.gameState.currentMapTile.x, y: this.gameState.currentMapTile.y,
      turns: this.gameState.turnsElapsed, crew: this.gameState.crew,
      grain: Math.floor(this.gameState.grain), money: this.gameState.rigsdaler,
      hull: this.gameState.hullIntegrity, cannons: this.gameState.cannons, score: this.gameState.score,
    }))
  }

  update() {
    if (this.gameState.crew <= 0 || this.gameState.hullIntegrity <= 0) {
      this.scene.start('GameOverScene', { gameState: this.gameState, reason: 'Defeated' })
    }
  }
}
