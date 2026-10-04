// Development / end-to-end backend: talks to scripts/mock-cloud.mjs instead of Firebase.
// Only bundled when VITE_SYNC_MOCK is set at build time; never part of a normal build.
import type { Backend, SyncUser } from './index'
import type { Rec } from './merge'
import { isStale } from '../lib/epoch'

const USER = 'upsc-mock-user'

export function createMockBackend(base: string): Backend {
  let listener: (u: SyncUser | null) => void = () => {}
  const current = (): SyncUser | null => {
    try {
      return JSON.parse(localStorage.getItem(USER) || 'null')
    } catch {
      return null
    }
  }
  const call = async (path: string, init?: RequestInit) => {
    const r = await fetch(base + path, init)
    if (r.status === 409) return { conflict: true }
    if (!r.ok) throw Object.assign(new Error(`mock cloud ${r.status}`), { code: r.status === 403 ? 'permission-denied' : 'internal' })
    return r.json()
  }
  return {
    remote(uid) {
      const q = `uid=${encodeURIComponent(uid)}`
      return {
        pull: (cursor) => call(`/pull?${q}&cursor=${cursor}`),
        async transact(id, fn) {
          for (let i = 0; i < 6; i++) {
            const cur = (await call(`/doc?${q}&id=${encodeURIComponent(id)}`)) as { rec: Rec | null; ver: number }
            const out = fn(cur.rec)
            if (!out) return
            const res = await call(`/doc?${q}&id=${encodeURIComponent(id)}&ver=${cur.ver}`, { method: 'PUT', body: JSON.stringify(out) })
            if (!res.conflict) return
          }
          throw new Error('mock cloud: too much contention')
        },
        async wipe(epoch) {
          const docs = (await call(`/dump?${q}`)) as { rec: Rec }[]
          for (const d of docs) if (isStale(d.rec, epoch)) await call(`/doc?${q}&id=${encodeURIComponent(d.rec.id)}`, { method: 'DELETE' })
        },
      }
    },
    // stands in for the Firestore listener on the active timer
    watch(uid, cb) {
      const t = window.setInterval(() => {
        call(`/doc?uid=${encodeURIComponent(uid)}&id=run~active`).then((r: { rec: Rec | null }) => cb(r.rec?.rev), () => {})
      }, 1500)
      return () => clearInterval(t)
    },
    onUser(cb) {
      listener = cb
      cb(current())
    },
    async signIn() {
      const u: SyncUser = JSON.parse(localStorage.getItem('upsc-mock-identity') || 'null') ?? { uid: 'mock-user', name: 'Test User', email: 'test@example.com' }
      localStorage.setItem(USER, JSON.stringify(u))
      listener(u)
    },
    async signOut() {
      localStorage.removeItem(USER)
      listener(null)
    },
  }
}
