import Phaser from 'phaser'

/**
 * BootScene - Game initialization and asset preload
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Load all spritesheets
    this.load.atlas(
      'ship_player',
      'assets/sprites/ship_player.png',
      'assets/sprites/ship_player.json'
    )
    this.load.atlas(
      'ships_enemy',
      'assets/sprites/ships_enemy.png',
      'assets/sprites/ships_enemy.json'
    )
    this.load.atlas(
      'battle_effects',
      'assets/sprites/battle_effects.png',
      'assets/sprites/battle_effects.json'
    )
    this.load.atlas(
      'boarding',
      'assets/sprites/boarding.png',
      'assets/sprites/boarding.json'
    )
    this.load.atlas(
      'ui_atlas',
      'assets/sprites/ui_atlas.png',
      'assets/sprites/ui_atlas.json'
    )

    // Load animation metadata
    this.load.json('ship_player_data', 'assets/sprites/ship_player.json')
    this.load.json('ships_enemy_data', 'assets/sprites/ships_enemy.json')
    this.load.json('battle_effects_data', 'assets/sprites/battle_effects.json')
    this.load.json('boarding_data', 'assets/sprites/boarding.json')
    this.load.json('ui_atlas_data', 'assets/sprites/ui_atlas.json')
  }

  create() {
    // Register animations from atlas metadata
    const shipPlayerData = this.cache.json.get('ship_player_data')
    if (shipPlayerData?.animations) {
      this.anims.fromJSON(shipPlayerData.animations)
    }

    const battleEffectsData = this.cache.json.get('battle_effects_data')
    if (battleEffectsData?.animations) {
      this.anims.fromJSON(battleEffectsData.animations)
    }

    console.log('✓ BootScene: All assets preloaded and animations registered')
    this.scene.start('TitleScene')
  }
}
