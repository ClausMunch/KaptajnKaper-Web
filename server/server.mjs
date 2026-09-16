import { createServer as createHttpServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export function createServer(databasePath, staticDirectory = 'dist') {
  mkdirSync(dirname(resolve(databasePath)), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(databasePath)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS scores (
      runId TEXT PRIMARY KEY,
      playerName TEXT NOT NULL CHECK(length(playerName) BETWEEN 1 AND 24),
      score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 1000000),
      turns INTEGER NOT NULL CHECK(turns BETWEEN 0 AND 1000000),
      difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 0 AND 4),
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS scores_ranking ON scores(score DESC, turns ASC, createdAt ASC);
  `)
  const insert = db.prepare('INSERT INTO scores (runId, playerName, score, turns, difficulty) VALUES (?, ?, ?, ?, ?) ON CONFLICT(runId) DO NOTHING')
  const ranking = db.prepare('SELECT playerName, score, turns, difficulty, createdAt FROM scores ORDER BY score DESC, turns ASC, createdAt ASC, runId ASC LIMIT 20')
  const root = resolve(staticDirectory)
  const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.tmj': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
  const server = createHttpServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    const send = (status, value) => {
      if (status === 413) {
        response.setHeader('Connection', 'close')
        response.once('finish', () => request.destroy())
      }
      request.resume()
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      response.end(JSON.stringify(value))
    }
    try {
      const path = new URL(request.url, 'http://localhost').pathname
      if (request.method === 'GET' && path === '/api/health') return send(200, { ok: true })
      if (request.method === 'GET' && path === '/api/leaderboard') return send(200, { scores: ranking.all() })
      if (request.method === 'POST' && path === '/api/scores') {
        if (request.headers.origin) {
          let origin
          try { origin = new URL(request.headers.origin) } catch { return send(403, { error: 'origin_not_allowed' }) }
          if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== request.headers.host) return send(403, { error: 'origin_not_allowed' })
        }
        if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') return send(415, { error: 'json_required' })
        if (Number(request.headers['content-length']) > 4096) return send(413, { error: 'body_too_large' })
        let size = 0
        const chunks = []
        for await (const chunk of request.iterator({ destroyOnReturn: false })) {
          size += chunk.length
          if (size > 4096) return send(413, { error: 'body_too_large' })
          chunks.push(chunk)
        }
        let entry
        try { entry = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return send(400, { error: 'invalid_json' }) }
        const fields = ['runId', 'playerName', 'score', 'turns', 'difficulty']
        if (!entry || Array.isArray(entry) || typeof entry !== 'object' || Object.keys(entry).length !== fields.length || !fields.every(field => Object.hasOwn(entry, field))) return send(400, { error: 'invalid_score' })
        const name = typeof entry.playerName === 'string' ? entry.playerName.trim().normalize('NFC') : ''
        if (!name || [...name].length > 24 || !/^[\p{L}\p{M}\p{N} ._'\u2019-]+$/u.test(name) ||
          typeof entry.runId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.runId) ||
          !Number.isInteger(entry.score) || entry.score < 0 || entry.score > 1000000 ||
          !Number.isInteger(entry.turns) || entry.turns < 0 || entry.turns > 1000000 ||
          !Number.isInteger(entry.difficulty) || entry.difficulty < 0 || entry.difficulty > 4) return send(400, { error: 'invalid_score' })
        const result = insert.run(entry.runId.toLowerCase(), name, entry.score, entry.turns, entry.difficulty)
        return send(result.changes ? 201 : 200, { saved: true })
      }
      if (path.startsWith('/api/')) return send(404, { error: 'not_found' })
      if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, { error: 'method_not_allowed' })
      let decoded
      try { decoded = decodeURIComponent(path) } catch { return send(400, { error: 'invalid_path' }) }
      const file = resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded))
      if (!file.startsWith(root + sep) || decoded.split('/').some(part => part.startsWith('.')) || !Object.hasOwn(contentTypes, extname(file))) return send(404, { error: 'not_found' })
      let content
      try { content = await readFile(file) } catch { return send(404, { error: 'not_found' }) }
      response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
      response.writeHead(200, { 'Content-Type': contentTypes[extname(file)] })
      response.end(request.method === 'HEAD' ? undefined : content)
    } catch (error) {
      console.error(error)
      if (!response.headersSent) send(500, { error: 'server_error' })
      else response.end()
    }
  })
  server.requestTimeout = 10000
  server.on('close', () => db.close())
  return server
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createServer(process.env.DATABASE_PATH || '/data/leaderboard.sqlite', process.env.STATIC_DIR || 'dist')
  server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Leaderboard server listening'))
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)))
}