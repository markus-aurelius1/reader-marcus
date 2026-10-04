// PYQ flags as the app runs them: zustand state + IndexedDB + the sync queue, then through the
// real sync engine against a fake cloud. A "reload" (or another device) is a fresh copy of the modules.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rec } from '../sync/merge'
import type { Remote } from '../sync/engine'
import type { PyqRow } from './pyqState'

const Q1 = 'UPSC-CSE-2019-GS1-Q045'
const Q2 = 'UPPCS-2021-GS1-Q046'
let now = Date.parse('2026-10-04T10:00:00.000Z')
const idle = () => new Promise((r) => setTimeout(r, 30)) // let IndexedDB writes land

class Cloud implements Remote {
  docs = new Map<string, { rec: Rec; st: number }>()
  clock = 0
  async pull(cursor: number) {
    const hits = [...this.docs.values()].filter((d) => d.st > cursor).sort((a, b) => a.st - b.st)
    return { recs: hits.map((d) => structuredClone(d.rec)), cursor: hits.length ? hits[hits.length - 1].st : cursor }
  }
  async transact(id: string, fn: (r: Rec | null) => Rec | null) {
    const out = fn(structuredClone(this.docs.get(id)?.rec ?? null))
    if (out) this.docs.set(id, { rec: structuredClone(out), st: ++this.clock })
  }
}

const wipe = () =>
  new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase('upsc-notes')
    r.onsuccess = r.onerror = r.onblocked = () => resolve()
  })

async function boot(device?: string) {
  vi.resetModules()
  if (device) localStorage.setItem('upsc-device', device)
  const store = await import('./store')
  const pyq = await import('./pyqState')
  const { db } = await import('./db')
  const { syncOnce } = await import('../sync/engine')
  pyq.clock.now = () => now
  await store.useStore.getState().init()
  await pyq.initPyqState()
  const rows = () => pyq.usePyq.getState().rows
  const queued = async () => (await db.getAll<{ id: string }>('outbox')).map((o) => o.id)
  const sync = (cloud: Cloud) => syncOnce(cloud, store.syncLocal)
  return { ...pyq, store, db, rows, queued, sync }
}

beforeEach(async () => {
  localStorage.clear()
  await wipe()
})

describe('PYQ flags (local-only)', () => {
  it('a flag is shown at once, saved to IndexedDB and queued for sync', async () => {
    const t = await boot()
    expect(t.hasPyqState(t.rows())).toBe(false)
    t.setPyqFlags(Q1, { seen: true })
    expect(t.rows()[Q1]).toMatchObject({ pyqId: Q1, seen: true, updatedAt: new Date(now).toISOString() })
    expect(t.hasPyqState(t.rows())).toBe(true)
    await idle()
    expect(await t.db.getAll<PyqRow>('pyqUserState')).toMatchObject([{ pyqId: Q1, seen: true }])
    expect(await t.queued()).toEqual([`pyq~${Q1}`])
  })

  it('survives a reload; clearing a flag is remembered too', async () => {
    let t = await boot()
    t.setPyqFlags(Q1, { seen: true, difficult: true })
    t.setPyqFlags(Q2, { revised: true })
    now += 1000
    t.setPyqFlags(Q1, { difficult: false })
    await idle()
    t = await boot()
    expect(t.rows()[Q1]).toMatchObject({ seen: true })
    expect(t.rows()[Q1].difficult).toBeUndefined()
    expect(t.rows()[Q2]).toMatchObject({ revised: true })
  })

  it('setting a flag to the value it already has changes nothing', async () => {
    const t = await boot()
    t.setPyqFlags(Q1, { seen: true })
    await idle()
    const before = t.rows()[Q1]
    now += 5000
    t.setPyqFlags(Q1, { seen: true })
    t.setPyqFlags(Q2, { seen: false })
    expect(t.rows()[Q1]).toBe(before)
    expect(t.rows()[Q2]).toBeUndefined()
  })
})

describe('PYQ flags — sync', () => {
  it('uploads only the flags, one small record per question; a second device receives them', async () => {
    const cloud = new Cloud()
    const a = await boot('devA')
    a.setPyqFlags(Q1, { seen: true, difficult: true })
    a.setPyqFlags(Q2, { seen: true })
    await a.sync(cloud)
    expect([...cloud.docs.keys()].sort()).toEqual([`pyq~${Q2}`, `pyq~${Q1}`])
    const rec = cloud.docs.get(`pyq~${Q1}`)!.rec
    expect(rec).toMatchObject({ kind: 'pyq', f: { seen: { v: true, d: 'devA' }, difficult: { v: true, d: 'devA' } } })
    expect(Object.keys(rec.f!).sort()).toEqual(['difficult', 'seen'])
    expect(JSON.stringify([...cloud.docs.values()])).not.toMatch(/demandTags|linkedContent|oneLiner|questionAvailable|exam/)
    await idle()
    expect(await a.queued()).toEqual([])

    localStorage.clear()
    await wipe()
    const b = await boot('devB')
    await b.sync(cloud)
    expect(b.rows()[Q1]).toMatchObject({ seen: true, difficult: true })
    expect(b.rows()[Q2]).toMatchObject({ seen: true })
  })

  it('different flags set on two devices both survive; the newer change to one flag wins', async () => {
    const cloud = new Cloud()
    const a = await boot('devA')
    a.setPyqFlags(Q1, { seen: true })
    await a.sync(cloud)

    localStorage.clear()
    await wipe()
    const b = await boot('devB')
    await b.sync(cloud)
    now += 60000
    b.setPyqFlags(Q1, { revised: true })
    // meanwhile device A marked it difficult and cleared "seen"
    const doc = cloud.docs.get(`pyq~${Q1}`)!
    doc.rec.f!.difficult = { v: true, t: now + 5, d: 'devA' }
    doc.rec.f!.seen = { v: null, t: now + 5, d: 'devA' }
    doc.st = ++cloud.clock
    await b.sync(cloud)
    expect(b.rows()[Q1]).toMatchObject({ revised: true, difficult: true })
    expect(b.rows()[Q1].seen).toBeUndefined()
    expect(cloud.docs.get(`pyq~${Q1}`)!.rec.f).toMatchObject({ revised: { v: true, d: 'devB' }, difficult: { v: true, d: 'devA' }, seen: { v: null, d: 'devA' } })
    await idle()
    const again = await boot('devB') // the merged state was saved
    expect(again.rows()[Q1]).toMatchObject({ revised: true, difficult: true })
  })

  it('first sign-in merges local flags with the cloud ones instead of replacing either', async () => {
    const cloud = new Cloud()
    const a = await boot('devA')
    a.setPyqFlags(Q1, { seen: true })
    await a.sync(cloud)
    localStorage.clear()
    await wipe()
    const b = await boot('devB')
    now += 5000
    b.setPyqFlags(Q2, { difficult: true })
    await b.store.syncLocal.rebind('user-1')
    await b.sync(cloud)
    expect(b.rows()[Q1]).toMatchObject({ seen: true })
    expect(b.rows()[Q2]).toMatchObject({ difficult: true })
    expect([...cloud.docs.values()].filter((d) => d.rec.kind === 'pyq')).toHaveLength(2)
  })
})
