import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { createServer } from './server.mjs'

test('SQLite validates input, rejects injections, ranks scores, and persists safely', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'kaper-scores-'))
  const database = join(directory, 'scores.sqlite')
  const assets = join(directory, 'dist')
  mkdirSync(assets)
  writeFileSync(join(assets, 'index.html'), '<!doctype html><title>Game</title>')
  writeFileSync(join(directory, 'secret.json'), '{"secret":true}')
  let server
  const start = async () => {
    server = createServer(database, assets)
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    return `http://127.0.0.1:${server.address().port}`
  }
  const stop = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  try {
    let base = await start()
    const post = value => fetch(base + '/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(value) })
    const first = { runId: randomUUID(), playerName: "Anne O'Neil", score: 100, turns: 20, difficulty: 1 }
    assert.equal((await post(first)).status, 201)
    assert.equal((await post({ ...first, runId: first.runId.toUpperCase(), score: 999 })).status, 200)
    assert.equal((await post({ ...first, runId: randomUUID(), playerName: 'Søren', turns: 10 })).status, 201)
    for (const invalid of [null, [], { ...first, extra: 1 }, { ...first, playerName: {} }, { ...first, playerName: '' }, { ...first, playerName: 'x'.repeat(25) }, { ...first, playerName: '<img src=x onerror=x()>' }, { ...first, playerName: "'); DROP TABLE scores;--" }, { ...first, playerName: 'Captain\u0000' }, { ...first, playerName: 'Captain\u202e' }, { ...first, score: '100' }, { ...first, score: -1 }, { ...first, score: 1.2 }, { ...first, score: 1000001 }, { ...first, turns: -1 }, { ...first, difficulty: 5 }, { ...first, runId: 'invalid' }]) {
      assert.equal((await post(invalid)).status, 400, JSON.stringify(invalid))
    }
    assert.equal((await post({ ...first, playerName: 'x'.repeat(5000) })).status, 413)
    await new Promise((resolve, reject) => {
      const upload = httpRequest(base + '/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, response => {
        response.resume()
        response.on('end', () => {
          upload.destroy()
          try {
            assert.equal(response.statusCode, 413)
            resolve()
          } catch (error) { reject(error) }
        })
      })
      upload.on('error', reject)
      upload.setTimeout(2000, () => upload.destroy(new Error('Oversized unfinished upload was not rejected promptly')))
      upload.write('x'.repeat(4097))
    })
    assert.equal((await fetch(base + '/api/scores', { method: 'POST', body: '{}' })).status, 415)
    assert.equal((await fetch(base + '/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })).status, 400)
    assert.equal((await fetch(base + '/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' }, body: JSON.stringify(first) })).status, 403)
    assert.equal((await fetch(base + '/%2e%2e%2fsecret.json')).status, 404)
    const homepage = await fetch(base)
    assert.equal(homepage.status, 200)
    assert.equal(homepage.headers.get('x-content-type-options'), 'nosniff')
    assert.ok(homepage.headers.get('content-security-policy').includes("object-src 'none'"))
    await stop()
    base = await start()
    const { scores } = await (await fetch(base + '/api/leaderboard')).json()
    assert.equal(scores.length, 2)
    assert.equal(scores[0].playerName, 'Søren')
    assert.equal(scores[1].playerName, first.playerName)
    assert.equal(scores[1].score, 100)
    for (let index = 0; index < 22; index++) await post({ ...first, runId: randomUUID(), score: index })
    assert.equal((await (await fetch(base + '/api/leaderboard')).json()).scores.length, 20)
  } finally {
    if (server?.listening) await stop()
    rmSync(directory, { recursive: true, force: true })
  }
})