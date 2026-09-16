import Phaser from 'phaser'
import { getLocale, onLocaleChange, setLocale } from './i18n'
import { setupLeaderboard } from './leaderboard'
import {
  BootScene,
  TitleScene,
  IntroStoryScene,
  WorldMapScene,
  BattleScene,
  BoardingScene,
  HarborApproachScene,
  HarborTradeScene,
  GameOverScene,
} from './scenes'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1024,
  height: 768,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
  scene: [
    BootScene,
    TitleScene,
    IntroStoryScene,
    WorldMapScene,
    BattleScene,
    BoardingScene,
    HarborApproachScene,
    HarborTradeScene,
    GameOverScene,
  ],
}

const languageSelect = document.querySelector<HTMLSelectElement>('#language')!
const syncLanguage = () => {
  languageSelect.value = getLocale()
  document.documentElement.lang = getLocale()
  languageSelect.setAttribute('aria-label', getLocale() === 'da' ? 'Sprog' : 'Language')
}
languageSelect.addEventListener('change', () => setLocale(languageSelect.value === 'en' ? 'en' : 'da'))
onLocaleChange(syncLanguage)
syncLanguage()

export const game = new Phaser.Game(config)
setupLeaderboard(game)
console.log('🎮 Kaptajn Kaper i Kattegat - Game initialized')
