import type Phaser from 'phaser'
import type { GameState } from './game/GameState'
import { getLocale, MessageKey, onLocaleChange, t } from './i18n'

export function getPlayerName(): string | null {
  const input = document.querySelector<HTMLInputElement>('#player-name')!
  const name = input.value.trim().normalize('NFC')
  const valid = name.length > 0 && [...name].length <= 24 && /^[\p{L}\p{M}\p{N} ._'\u2019-]+$/u.test(name)
  input.setCustomValidity(valid ? '' : t('invalidPlayerName'))
  return input.reportValidity() ? name : null
}

export async function submitScore(state: GameState): Promise<void> {
  const response = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: state.runId, playerName: state.playerName, score: state.score, turns: state.turnsElapsed, difficulty: state.difficulty }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Score submission failed')
}

export function setupLeaderboard(game: Phaser.Game): void {
  const input = document.querySelector<HTMLInputElement>('#player-name')!
  const dialog = document.querySelector<HTMLDialogElement>('#leaderboard')!
  const table = dialog.querySelector('table')!
  const body = dialog.querySelector('tbody')!
  const status = document.querySelector<HTMLElement>('#leaderboard-status')!
  const refresh = document.querySelector<HTMLButtonElement>('#refresh-leaderboard')!
  const close = document.querySelector<HTMLButtonElement>('#close-leaderboard')!
  let statusKey: MessageKey | null = null
  let pausedScenes: Phaser.Scene[] = []
  try { input.value = localStorage.getItem('kaptajn-kaper-name') || 'Kaper' } catch { input.value = 'Kaper' }
  input.addEventListener('input', () => input.setCustomValidity(''))
  input.addEventListener('change', () => {
    const name = getPlayerName()
    if (name) {
      try { localStorage.setItem('kaptajn-kaper-name', name) } catch {}
    }
  })
  const localize = () => {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
      element.textContent = t(element.dataset.i18n as MessageKey)
    })
    status.textContent = statusKey ? t(statusKey) : ''
    close.setAttribute('aria-label', t('closeLeaderboard'))
    close.title = t('closeLeaderboard')
    if (input.validity.customError) input.setCustomValidity(t('invalidPlayerName'))
  }
  onLocaleChange(localize)
  localize()
  const load = async () => {
    if (refresh.disabled) return
    refresh.disabled = true
    statusKey = 'leaderboardLoading'
    body.replaceChildren()
    table.hidden = true
    localize()
    try {
      const response = await fetch('/api/leaderboard', { signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error('Leaderboard unavailable')
      const data = await response.json()
      if (!Array.isArray(data.scores)) throw new Error('Invalid leaderboard')
      for (const [index, score] of data.scores.slice(0, 20).entries()) {
        if (typeof score.playerName !== 'string' || !Number.isInteger(score.score) || !Number.isInteger(score.turns) || !Number.isInteger(score.difficulty)) throw new Error('Invalid score')
        const row = body.insertRow()
        for (const value of [index + 1, score.playerName, score.score, score.turns, score.difficulty]) {
          row.insertCell().textContent = String(value)
        }
      }
      statusKey = data.scores.length ? null : 'leaderboardEmpty'
      table.hidden = !data.scores.length
    } catch {
      body.replaceChildren()
      statusKey = 'leaderboardUnavailable'
    } finally {
      refresh.disabled = false
      localize()
    }
  }
  document.querySelector('#leaderboard-button')!.addEventListener('click', () => {
    if (dialog.open) return
    pausedScenes = game.scene.getScenes(true)
    pausedScenes.forEach(scene => scene.scene.pause())
    dialog.showModal()
    void load()
  })
  refresh.addEventListener('click', () => void load())
  close.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => {
    pausedScenes.forEach(scene => { if (scene.scene.isPaused()) scene.scene.resume() })
    pausedScenes = []
    syncKeyboard()
  })
  const syncKeyboard = () => {
    if (game.input.keyboard) game.input.keyboard.enabled = !dialog.open && !document.activeElement?.matches('input, select, button')
  }
  document.addEventListener('focusin', syncKeyboard)
  document.addEventListener('focusout', () => queueMicrotask(syncKeyboard))
  document.documentElement.lang = getLocale()
}