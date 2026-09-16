import Phaser from 'phaser'
import { t } from '../i18n'
import { localizedText, setLocalizedText } from '../utils/LocalizedText'
import type { WorldMode } from '../data'

/**
 * TitleScene - Main title screen and menu
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  preload() {
    this.load.svg('title-harbor', 'assets/title-harbor.svg')
  }

  create() {
    const { width, height } = this.scale
    const centerX = width / 2
    let worldMode: WorldMode = this.registry.get('worldMode') === 'expanded' ? 'expanded' : 'classic'
    const subtitleSource = () => t(worldMode === 'expanded' ? 'expandedSubtitle' : 'classicSubtitle')
    this.textures.get('title-harbor').setFilter(Phaser.Textures.FilterMode.LINEAR)
    this.add.image(centerX, height / 2, 'title-harbor').setDisplaySize(width, height)

    localizedText(this, centerX, 66, () => t('titleEyebrow'), {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#d6dfbf',
    }).setOrigin(0.5)

    const title = this.add.container(centerX, 184)
    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontStyle: 'bold', color: '#ffe4a0', stroke: '#273b39', strokeThickness: 3,
      shadow: { offsetX: 2, offsetY: 5, color: '#7b4140', blur: 0, fill: true, stroke: true },
    }
    title.add(this.add.text(0, -46, 'Kaptajn', { ...titleStyle, fontSize: '74px' }).setOrigin(0.5).setAngle(-3))
    title.add(this.add.text(0, 38, 'Kaper', { ...titleStyle, fontSize: '112px' }).setOrigin(0.5).setAngle(-3))
    const subtitle = localizedText(this, 0, 132, subtitleSource, {
      ...titleStyle, fontSize: '37px', fontStyle: 'bold italic',
    }).setOrigin(0.5).setName('edition-subtitle')
    const echo = localizedText(this, 0, 132, subtitleSource, {
      ...titleStyle, fontSize: '37px', fontStyle: 'bold italic', color: '#bcefe8',
    }).setOrigin(0.5).setAlpha(0).setName('edition-echo')
    title.add([echo, subtitle])

    const ornament = this.add.graphics().setY(38).lineStyle(1, 0xc2bb8e, 0.75)
    ornament.lineBetween(centerX - 150, 319, centerX - 108, 319)
    ornament.lineBetween(centerX + 108, 319, centerX + 150, 319)
    ornament.fillStyle(0xe4c98e).fillTriangle(centerX - 161, 319, centerX - 153, 315, centerX - 153, 323)
    ornament.fillTriangle(centerX + 161, 319, centerX + 153, 315, centerX + 153, 323)

    localizedText(this, centerX, 387, () => t('titleMotto'), {
      fontFamily: 'Georgia, serif', fontSize: '19px', fontStyle: 'italic', color: '#e2e5ca',
      shadow: { offsetX: 0, offsetY: 2, color: '#183e42', fill: true, blur: 3 },
    }).setOrigin(0.5)

    const options = (['classic', 'expanded'] as const).map((mode, index) => {
      const position = centerX + (index === 0 ? -142 : 142)
      const background = this.add.rectangle(position, 442, 276, 42, 0x123c40).setStrokeStyle(1, 0xc9af75)
      const label = localizedText(this, position, 442, () => t(mode === 'classic' ? 'classicMode' : 'expandedMode'), {
        fontFamily: 'Georgia, serif', fontSize: '19px', color: '#ffe4a0',
      }).setOrigin(0.5)
      background.setName(`mode-${mode}`).setInteractive({ useHandCursor: true })
      background.on('pointerdown', () => select(mode))
      return { mode, background, label }
    })
    const select = (mode: WorldMode) => {
      const changed = worldMode !== mode
      worldMode = mode
      this.registry.set('worldMode', mode)
      setLocalizedText(subtitle, subtitleSource)
      setLocalizedText(echo, subtitleSource)
      if (changed) {
        this.tweens.killTweensOf([subtitle, echo])
        subtitle.setPosition(0, 132).setScale(1).setAlpha(1).setAngle(0)
        echo.setPosition(0, 132).setScale(1).setAlpha(0)
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const direction = mode === 'expanded' ? 1 : -1
          subtitle.setX(direction * 48).setScale(0.82).setAlpha(0.3).setAngle(direction * 3)
          echo.setAlpha(0.6)
          this.tweens.add({ targets: subtitle, x: 0, scaleX: 1, scaleY: 1, alpha: 1, angle: 0, duration: 520, ease: 'Back.Out' })
          this.tweens.add({ targets: echo, scaleX: 1.25, scaleY: 1.25, alpha: 0, duration: 480, ease: 'Cubic.Out' })
        }
      }
      for (const option of options) {
        option.background.setFillStyle(option.mode === mode ? 0xe2cd91 : 0x123c40)
        option.label.setColor(option.mode === mode ? '#183d40' : '#ffe4a0')
      }
    }
    select(worldMode)
    const chooseClassic = () => select('classic')
    const chooseExpanded = () => select('expanded')
    this.input.keyboard?.on('keydown-LEFT', chooseClassic)
    this.input.keyboard?.on('keydown-RIGHT', chooseExpanded)

    const menu = this.add.container(centerX, 520)
    const buttonShape = this.add.graphics()
    buttonShape.fillStyle(0x102f36, 0.92)
    buttonShape.fillPoints([
      new Phaser.Geom.Point(-135, -32), new Phaser.Geom.Point(120, -32),
      new Phaser.Geom.Point(137, 0), new Phaser.Geom.Point(120, 32),
      new Phaser.Geom.Point(-135, 32), new Phaser.Geom.Point(-127, 0),
    ], true)
    buttonShape.lineStyle(1, 0xc9af75, 0.9)
    buttonShape.lineBetween(-119, -27, 115, -27).lineBetween(-119, 27, 115, 27)
    const startBtn = localizedText(this, 0, 0, () => t('setSail'), {
        fontFamily: 'Georgia, serif', fontSize: '30px', fontStyle: 'bold',
        color: '#ffe4a0', padding: { x: 64, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    menu.add([buttonShape, startBtn])
    startBtn.on('pointerover', () => { startBtn.setColor('#ffffff'); buttonShape.setAlpha(0.8) })
    startBtn.on('pointerout', () => { startBtn.setColor('#ffe4a0'); buttonShape.setAlpha(1) })

    let starting = false
    const start = () => {
      if (starting) return
      starting = true
      startBtn.disableInteractive()
      this.cameras.main.fadeOut(350, 9, 34, 40)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('IntroStoryScene', { worldMode }))
    }
    startBtn.on('pointerdown', start)
    this.input.keyboard?.on('keydown-ENTER', start)
    this.input.keyboard?.on('keydown-SPACE', start)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', start)
      this.input.keyboard?.off('keydown-SPACE', start)
      this.input.keyboard?.off('keydown-LEFT', chooseClassic)
      this.input.keyboard?.off('keydown-RIGHT', chooseExpanded)
    })

    localizedText(this, centerX, height - 44, () => t('titleLocation'), {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#9db9ad',
    }).setOrigin(0.5)

    for (let index = 0; index < 9; index++) {
      const ripple = this.add.rectangle(360 + index * 53, 575 + (index % 4) * 33, 28 + index * 3, 1, 0xb8c9a4, 0.18)
      this.tweens.add({ targets: ripple, x: ripple.x + 16, alpha: 0.03, duration: 1800 + index * 170, delay: index * 210, yoyo: true, repeat: -1 })
    }
    for (const lanternX of [77, 939]) {
      const flame = this.add.ellipse(lanternX, 253, 9, 16, 0xffe0a0, 0.35)
      this.tweens.add({ targets: flame, alpha: 0.7, scaleY: 0.85, duration: 730, delay: lanternX, yoyo: true, repeat: -1 })
    }
    this.cameras.main.fadeIn(700, 9, 34, 40)
    this.tweens.add({ targets: title, y: 179, duration: 2600, ease: 'Sine.InOut', yoyo: true, repeat: -1 })

    console.log('✓ TitleScene: Created')
  }
}
