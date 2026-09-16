export async function checkEditionSubtitle() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  for (const scene of game.scene.getScenes(false)) {
    if (scene.scene.isActive() || scene.scene.isPaused()) game.scene.stop(scene.scene.key)
  }
  const title = game.scene.getScene('TitleScene')
  const ready = new Promise(resolve => title.events.once('create', resolve))
  game.scene.start('TitleScene')
  game.scene.update(performance.now(), 16)
  await ready
  title.cameras.main.resetFX()
  const subtitle = title.children.list.flatMap(child => child.list ?? []).find(child => child.name === 'edition-subtitle')
  const echo = title.children.list.flatMap(child => child.list ?? []).find(child => child.name === 'edition-echo')
  const language = document.querySelector('#language')
  const previousLanguage = language.value
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    for (const locale of ['en', 'da']) {
      language.value = locale
      language.dispatchEvent(new Event('change'))
      title.children.getByName('mode-classic').emit('pointerdown')
      assert(subtitle.text === (locale === 'en' ? 'in Kattegat' : 'i Kattegat'), 'Incorrect classic subtitle')
      title.children.getByName('mode-expanded').emit('pointerdown')
      assert(subtitle.text === (locale === 'en' ? 'on the High Seas' : 'på de store have'), 'Incorrect expanded subtitle')
      assert(reduced ? subtitle.alpha === 1 && echo.alpha === 0 : subtitle.alpha < 1 && echo.alpha > 0, 'Incorrect motion preference behavior')
      for (const mode of ['classic', 'expanded', 'classic', 'expanded']) title.children.getByName(`mode-${mode}`).emit('pointerdown')
      assert(title.tweens.getTweensOf(subtitle).length === (reduced ? 0 : 1), 'Rapid toggles stack animations')
      for (const target of [subtitle, echo]) {
        for (const tween of title.tweens.getTweensOf(target)) tween.seek(1000)
      }
      assert(Math.abs(subtitle.x) < 0.01 && Math.abs(subtitle.scaleX - 1) < 0.01 && subtitle.alpha === 1, 'Subtitle did not settle')
      assert(echo.alpha === 0, 'Echo did not fade')
      const bounds = subtitle.getBounds()
      assert(bounds.x > 0 && bounds.right < 1024 && bounds.bottom < 355, 'Subtitle overlaps adjacent content')
    }
  } finally {
    language.value = previousLanguage
    language.dispatchEvent(new Event('change'))
  }
  game.step(performance.now(), 16)
  return 'Passed: both editions, both languages, rapid toggles, final layout and motion preference'
}