// Shared by the revision and reset tests: a fake cloud, and a way to park one device's storage
// while another device takes its place (every device in a test shares the one fake IndexedDB).
import type { Rec } from '../sync/merge'
import type { Remote } from '../sync/engine'
import { isStale, type EpochDoc } from './epoch'
import { DB_NAME, DB_VERSION, upgrade } from './db'

export class Cloud implements Remote {
  docs = new Map<string, { rec: Rec; st: number }>()
  clock = 0
  online = true
  wipes = 0
  async pull(cursor: number) {
    if (!this.online) throw new TypeError('Failed to fetch')
    const hits = [...this.docs.values()].filter((d) => d.st > cursor).sort((a, b) => a.st - b.st)
    return { recs: hits.map((d) => structuredClone(d.rec)), cursor: hits.length ? hits[hits.length - 1].st : cursor }
  }
  async transact(id: string, fn: (r: Rec | null) => Rec | null) {
    if (!this.online) throw new TypeError('Failed to fetch')
    const out = fn(structuredClone(this.docs.get(id)?.rec ?? null))
    if (out) this.docs.set(id, { rec: structuredClone(out), st: ++this.clock })
  }
  async wipe(epoch: EpochDoc) {
    if (!this.online) throw new TypeError('Failed to fetch')
    this.wipes++
    for (const [id, d] of this.docs) if (isStale(d.rec, epoch)) this.docs.delete(id)
  }
  ids = (kind?: string) => [...this.docs.keys()].filter((id) => !kind || id.startsWith(kind + '~')).sort()
  epoch = () => this.docs.get('meta~dataEpoch')?.rec.data as unknown as EpochDoc | undefined
}

export const deleteDb = () =>
  new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase(DB_NAME)
    r.onsuccess = r.onerror = r.onblocked = () => resolve()
  })

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => upgrade(req.result)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

/** Everything one device has stored: IndexedDB rows with their keys, and localStorage. */
export interface Snapshot {
  stores: Record<string, { key: IDBValidKey; value: unknown }[]>
  local: Record<string, string>
}
export async function snapshot(): Promise<Snapshot> {
  const db = await openDb()
  const stores: Snapshot['stores'] = {}
  for (const name of db.objectStoreNames) {
    stores[name] = await new Promise((resolve) => {
      const rows: { key: IDBValidKey; value: unknown }[] = []
      const cur = db.transaction(name).objectStore(name).openCursor()
      cur.onsuccess = () => {
        const c = cur.result
        if (!c) return resolve(rows)
        rows.push({ key: c.key, value: structuredClone(c.value) })
        c.continue()
      }
    })
  }
  db.close()
  return { stores, local: Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)!])) }
}
/** Put a parked device back: its storage replaces whatever is there now. */
export async function restore(s: Snapshot) {
  await deleteDb()
  localStorage.clear()
  for (const [k, v] of Object.entries(s.local)) localStorage.setItem(k, v)
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const names = Object.keys(s.stores).filter((n) => db.objectStoreNames.contains(n))
    const tx = db.transaction(names, 'readwrite')
    for (const n of names) {
      const store = tx.objectStore(n)
      for (const { key, value } of s.stores[n]) store.keyPath ? store.put(value) : store.put(value, key)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
/** Let queued IndexedDB writes land. */
export const idle = (ms = 40) => new Promise((r) => setTimeout(r, ms))
