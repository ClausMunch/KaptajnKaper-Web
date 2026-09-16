export async function checkLeaderboard() {
  const { game } = await import(document.querySelector('script[src*="/src/main.ts"]').src)
  const { getPlayerName } = await import('/src/leaderboard.ts')
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const input = document.querySelector('#player-name')
  const dialog = document.querySelector('#leaderboard')
  const refresh = document.querySelector('#refresh-leaderboard')
  const previousName = input.value
  const originalFetch = window.fetch
  const loaded = async () => {
    const deadline = performance.now() + 5000
    while (refresh.disabled) {
      assert(performance.now() < deadline, 'Leaderboard did not finish loading')
      await new Promise(requestAnimationFrame)
    }
  }
  try {
    for (const invalid of ['', '<img src=x onerror=x()>', "');DROP TABLE scores;--", 'Captain\u202e', 'x'.repeat(25)]) {
      input.value = invalid
      assert(getPlayerName() === null, 'Invalid player name accepted')
    }
    input.value = "Søren O'Neil"
    assert(getPlayerName() === "Søren O'Neil", 'Valid Unicode name and apostrophe rejected')
    input.blur()
    const active = game.scene.getScenes(true)
    const malicious = '<img src=x onerror=alert(1)>'
    window.fetch = async () => new Response(JSON.stringify({ scores: [{ playerName: malicious, score: 10, turns: 2, difficulty: 1 }] }), { headers: { 'Content-Type': 'application/json' } })
    document.querySelector('#leaderboard-button').click()
    await loaded()
    assert(dialog.open, 'Leaderboard did not open')
    assert(active.every(scene => scene.scene.isPaused()), 'Opening leaderboard must pause play')
    assert(dialog.querySelector('tbody').textContent.includes(malicious), 'Name must remain literal text')
    assert(dialog.querySelectorAll('tbody img, tbody script').length === 0, 'Leaderboard parsed player text as HTML')
    window.fetch = async () => new Response('', { status: 503 })
    refresh.click()
    await loaded()
    assert(dialog.querySelector('table').hidden && document.querySelector('#leaderboard-status').textContent, 'Failed requests need a visible error state')
    dialog.close()
    await new Promise(requestAnimationFrame)
    assert(active.every(scene => scene.scene.isActive()), 'Closing leaderboard must resume play')
    return 'Passed: name validation, Unicode names, text-only rendering, API errors, pause and resume'
  } finally {
    window.fetch = originalFetch
    input.value = previousName
    input.setCustomValidity('')
    if (dialog.open) dialog.close()
  }
}