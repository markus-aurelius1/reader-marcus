// In-memory stand-in for Firestore, used only for local development and the end-to-end test
// (build with VITE_SYNC_MOCK=http://localhost:4320). Implements the two operations the sync
// engine needs — pull-since-cursor and versioned read-modify-write — per user, plus the delete a
// personal-data reset uses to clear what it left behind.
//   node scripts/mock-cloud.mjs [port]
import { createServer } from 'node:http'

const port = Number(process.argv[2] || 4320)
const users = new Map() // uid → Map(id → { rec, ver, st })
let clock = 0
const now = () => (clock = Math.max(clock + 1, Date.now()))

createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const send = (code, body) => {
    res.writeHead(code, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    res.end(JSON.stringify(body))
  }
  if (req.method === 'OPTIONS') return send(200, {})
  const uid = url.searchParams.get('uid')
  if (!uid) return send(403, { error: 'unauthenticated' })
  if (!users.has(uid)) users.set(uid, new Map())
  const docs = users.get(uid)
  if (url.pathname === '/pull') {
    const cursor = Number(url.searchParams.get('cursor') || 0)
    const hits = [...docs.values()].filter((d) => d.st > cursor).sort((a, b) => a.st - b.st)
    return send(200, { recs: hits.map((d) => d.rec), cursor: hits.length ? hits[hits.length - 1].st : cursor })
  }
  if (url.pathname === '/dump') return send(200, [...docs.values()])
  if (url.pathname === '/doc') {
    const id = url.searchParams.get('id')
    const cur = docs.get(id)
    if (req.method === 'GET') return send(200, { rec: cur?.rec ?? null, ver: cur?.ver ?? 0 })
    if (req.method === 'DELETE') {
      docs.delete(id)
      return send(200, { ok: true })
    }
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      if ((cur?.ver ?? 0) !== Number(url.searchParams.get('ver'))) return send(409, { error: 'version' })
      docs.set(id, { rec: JSON.parse(body), ver: (cur?.ver ?? 0) + 1, st: now() })
      send(200, { ok: true })
    })
    return
  }
  send(404, {})
}).listen(port, () => console.log(`mock cloud on http://localhost:${port}`))
