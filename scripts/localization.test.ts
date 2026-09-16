import assert from 'node:assert/strict'
import { test } from 'node:test'
import { messages, dataMessages } from '../src/locales'
import { getLocale, setLocale, onLocaleChange, t, translateData, MessageKey } from '../src/i18n'
import { createInitialGameState } from '../src/game/GameState'
import { buyGrain, buyCannon, sellGrain, sellCannon, sellGems, hireCrewMember, hireCrewMembers, repairHull } from '../src/game/TradingEngine'
import { combatLogEntry } from '../src/game/CombatEngine'
import { getHarbors, getEnemyTypes } from '../src/data'

test('every catalog entry has both languages and matching placeholders', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const [key, [english, danish]] of Object.entries(messages)) {
    assert.ok(english.trim(), `${key}: English missing`)
    assert.ok(danish.trim(), `${key}: Danish missing`)
    assert.deepEqual(placeholders(english), placeholders(danish), key)
    const values = Object.fromEntries(placeholders(english).map(name => [name, 12]))
    for (const locale of ['en', 'da'] as const) {
      setLocale(locale)
      assert.doesNotMatch(t(key as MessageKey, values), /\{\w+\}/, key)
    }
  }
})

test('all displayed harbor descriptions and enemy types are translated', () => {
  for (const harbor of getHarbors()) assert.ok(dataMessages[harbor.description], harbor.description)
  for (const enemy of getEnemyTypes()) assert.ok(dataMessages[enemy.name], enemy.name)
  setLocale('en')
  assert.equal(translateData('Skonnert'), 'Schooner')
  setLocale('da')
  assert.equal(translateData('Skonnert'), 'Skonnert')
  assert.equal(translateData('København'), 'København')
})

test('locale changes persist, notify once, and unsubscribe cleanly', () => {
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } })
  setLocale('da')
  let changes = 0
  const unsubscribe = onLocaleChange(() => changes++)
  setLocale('en')
  setLocale('en')
  assert.equal(getLocale(), 'en')
  assert.equal(storage.get('kaptajn-kaper-language'), 'en')
  assert.equal(changes, 1)
  unsubscribe()
  setLocale('da')
  assert.equal(changes, 1)
})

test('unavailable browser storage does not prevent switching languages', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked') } })
  assert.doesNotThrow(() => setLocale('en'))
  assert.equal(t('setSail'), 'Set Sail')
  setLocale('da')
  assert.equal(t('setSail'), 'Sæt sejl')
})

test('transaction messages change language without replaying transactions', () => {
  const state = { ...createInitialGameState(), rigsdaler: 5000, hullIntegrity: 70, gems: 4 }
  const original = structuredClone(state)
  const results = [
    buyGrain(state, 2, 10), sellGrain(state, 2, 8), buyCannon(state, 2, 200),
    sellCannon(state, 2, 200), sellGems(state, 2, 100), hireCrewMember(state, 50),
    hireCrewMembers(state, 2, 50), repairHull(state, 2, 10),
    buyGrain({ ...state, rigsdaler: 0 }, 2, 10),
    buyGrain({ ...state, grain: 700 }, 2, 10),
    buyCannon({ ...state, cannons: 150 }, 2, 200),
    sellGrain(state, 999, 8), sellCannon(state, 999, 200), sellGems(state, 999, 100),
    hireCrewMember({ ...state, crew: 500 }, 50),
    repairHull({ ...state, hullIntegrity: 100 }, 2, 10),
  ]
  for (const result of results) {
    const next = structuredClone(result.newState)
    setLocale('en')
    const english = result.message
    setLocale('da')
    assert.notEqual(result.message, english)
    assert.deepEqual(result.newState, next)
    assert.doesNotMatch(result.message, /\{\w+\}/)
  }
  assert.deepEqual(state, original)
  assert.equal(results[0].newState?.grain, 32)
  assert.equal(results[0].newState?.rigsdaler, 4980)
})

test('historical combat log messages retranslate with their original values', () => {
  const entry = combatLogEntry('Player', 'hit', { damage: 12, crewLoss: 2, distance: 4 })
  setLocale('en')
  assert.match(entry(), /Player hit for 12 damage/)
  setLocale('da')
  assert.match(entry(), /Spiller ramte og gav 12 skade/)
  assert.match(entry(), /2 søfolk/)
  assert.match(entry(), /4 felters/)
})