import Phaser from 'phaser'
import { onLocaleChange, resolveText, TextSource } from '../i18n'

const bindings = new WeakMap<Phaser.GameObjects.Text, () => void>()

export function setLocalizedText(text: Phaser.GameObjects.Text, source: TextSource): Phaser.GameObjects.Text {
  bindings.get(text)?.()
  const refresh = () => text.setText(resolveText(source))
  const unsubscribe = onLocaleChange(refresh)
  const scene = text.scene
  const cleanup = () => {
    unsubscribe()
    text.off(Phaser.GameObjects.Events.DESTROY, cleanup)
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    bindings.delete(text)
  }
  text.once(Phaser.GameObjects.Events.DESTROY, cleanup)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
  bindings.set(text, cleanup)
  refresh()
  return text
}

export function localizedText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  source: TextSource,
  style: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  return setLocalizedText(scene.add.text(x, y, '', style), source)
}