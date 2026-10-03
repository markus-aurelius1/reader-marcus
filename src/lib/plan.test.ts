// Study queue and goals as the app runs them: zustand state + IndexedDB + the sync queue, then
// through the real sync engine against a fake cloud. A "reload" (or another device) is a fresh
// copy of the modules.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentRef } from './contract'
import type { Rec } from '../sync/merge'
import type { Remote } from '../sync/engine'
import type { QueueRow } from './plan'

const H = 3600000
const ref = (chapterId: string, sectionId?: string): ContentRef => ({ kind: sectionId ? 'section' : 'chapter', stage: 'prelims', subjectId: 'polity', chapterId, ...(sectionId ? { sectionId } : {}) })
let now = Date.parse('2026-10-03T10:00:00.000Z')
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
  const plan = await import('./plan')
  const { db } = await import('./db')
  const { syncOnce } = await import('../sync/engine')
  plan.clock.now = () => now
  await store.useStore.getState().init()
  await plan.initPlan()
  const open = () => plan.openItems(plan.usePlan.getState().queue)
  const titles = () => open().map((r) => r.title)
  const queued = async () => (await db.getAll<{ id: string }>('outbox')).map((o) => o.id)
  const sync = (cloud: Cloud) => syncOnce(cloud, store.syncLocal)
  return { ...plan, store, db, open, titles, queued, sync }
}

beforeEach(async () => {
  localStorage.clear()
  await wipe()
})

describe('study queue (local-only)', () => {
  it('add: saved to IndexedDB and queued for sync, in order', async () => {
    const t = await boot()
    const at = new Date(now).toISOString()
    const a = t.addToQueue(ref('parliament'), 'Parliament', 'continue')
    now += 1000
    t.addToQueue(ref('judiciary'), 'Judiciary')
    expect(t.titles()).toEqual(['Parliament', 'Judiciary']) // screen first
    await idle()
    const rows = await t.db.getAll<QueueRow>('studyQueue')
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === a)).toMatchObject({ target: { kind: 'chapter', chapterId: 'parliament' }, title: 'Parliament', reason: 'continue', createdAt: at })
    expect(await t.queued()).toEqual(expect.arrayContaining([`q~${a}`]))
  })

  it('a target already waiting is not added twice; a completed one can be queued again', async () => {
    const t = await boot()
    const a = t.addToQueue(ref('parliament'), 'Parliament')
    expect(t.addToQueue(ref('parliament'), 'Parliament')).toBe(a)
    expect(t.addToQueue(ref('parliament', 'budget'), 'Budget')).not.toBe(a) // a section is its own target
    expect(t.open()).toHaveLength(2)
    t.completeQueueItem(a)
    expect(t.addToQueue(ref('parliament'), 'Parliament')).not.toBe(a)
  })

  it('reorder rewrites only the moved item', async () => {
    const t = await boot()
    const ids = ['A', 'B', 'C', 'D'].map((x) => t.addToQueue(ref(x), x))
    await idle()
    const before = await t.db.getAll<QueueRow>('studyQueue')
    t.moveQueueItem(ids[3], -1)
    expect(t.titles()).toEqual(['A', 'B', 'D', 'C'])
    t.moveQueueItem(ids[3], -1)
    t.moveQueueItem(ids[3], -1)
    t.moveQueueItem(ids[3], -1) // already first
    expect(t.titles()).toEqual(['D', 'A', 'B', 'C'])
    t.moveQueueItem(ids[0], 1)
    expect(t.titles()).toEqual(['D', 'B', 'A', 'C'])
    t.moveQueueItem(ids[2], 1)
    t.moveQueueItem(ids[2], 1) // already last
    expect(t.titles()).toEqual(['D', 'B', 'A', 'C'])
    await idle()
    const after = await t.db.getAll<QueueRow>('studyQueue')
    const same = (id: string) => before.find((r) => r.id === id)!.order === after.find((r) => r.id === id)!.order
    expect([same(ids[1]), same(ids[2])]).toEqual([true, true])
  })

  it('many moves into the same gap still keep a strict order', async () => {
    const t = await boot()
    const ids = ['A', 'B', 'C'].map((x) => t.addToQueue(ref(x), x))
    for (let i = 0; i < 80; i++) {
      t.moveQueueItem(ids[2], -1)
      t.moveQueueItem(ids[0], 1)
      t.moveQueueItem(ids[0], -1)
      t.moveQueueItem(ids[2], 1)
    }
    expect(t.titles()).toEqual(['A', 'B', 'C'])
    const orders = t.open().map((r) => r.order)
    expect(orders[0] < orders[1] && orders[1] < orders[2]).toBe(true)
  })

  it('complete, put back, remove and clear survive a reload', async () => {
    let t = await boot()
    const [a, b, c] = ['A', 'B', 'C'].map((x) => t.addToQueue(ref(x), x))
    t.completeQueueItem(a)
    t.completeQueueItem(b)
    t.completeQueueItem(b, false)
    t.removeQueueItem(c)
    await idle()
    t = await boot()
    expect(t.titles()).toEqual(['B'])
    expect(t.queueItems(t.usePlan.getState().queue).map((r) => [r.title, !!r.completedAt])).toEqual([['A', true], ['B', false]])
    t.clearCompleted()
    await idle()
    t = await boot()
    expect(t.queueItems(t.usePlan.getState().queue).map((r) => r.title)).toEqual(['B'])
  })
})

describe('study goals', () => {
  it('there is no goal until one is set: nothing is invented', async () => {
    const t = await boot()
    expect(t.activeGoal(t.usePlan.getState())).toBeNull()
    await idle()
    expect(await t.db.getAll('studyGoals')).toEqual([])
  })

  it('set, change and remove; persisted and queued', async () => {
    let t = await boot()
    t.setGoal({ dailyTargetMs: 3 * H })
    expect(t.activeGoal(t.usePlan.getState())).toMatchObject({ id: 'default', enabled: true, dailyTargetMs: 3 * H, updatedAt: new Date(now).toISOString() })
    expect(t.activeGoal(t.usePlan.getState())!.weeklyTargetMs).toBeUndefined()
    await idle()
    expect(await t.queued()).toContain('goal~default')
    t = await boot()
    t.setGoal({ dailyTargetMs: 3 * H, weeklyTargetMs: 20 * H })
    expect(t.activeGoal(t.usePlan.getState())).toMatchObject({ dailyTargetMs: 3 * H, weeklyTargetMs: 20 * H })
    t.setGoal({})
    expect(t.activeGoal(t.usePlan.getState())).toBeNull()
    await idle()
    t = await boot()
    expect(t.activeGoal(t.usePlan.getState())).toBeNull()
  })

  it('no total, streak or progress figure is stored with it', async () => {
    const t = await boot()
    t.setGoal({ dailyTargetMs: 2 * H, weeklyTargetMs: 10 * H })
    await idle()
    const [row] = await t.db.getAll<Record<string, unknown>>('studyGoals')
    expect(Object.keys(row).sort()).toEqual(['dailyTargetMs', 'enabled', 'id', 'st', 'updatedAt', 'weeklyTargetMs'])
  })
})

describe('queue and goals across devices', () => {
  it('reach a second device; changes to different fields of one item both survive', async () => {
    const cloud = new Cloud()
    let a = await boot('devA')
    const first = a.addToQueue(ref('parliament'), 'Parliament')
    now += 1000
    const second = a.addToQueue(ref('judiciary'), 'Judiciary', 'revision')
    a.setGoal({ dailyTargetMs: 3 * H })
    await a.sync(cloud)
    expect([...cloud.docs.keys()].sort()).toEqual([`goal~default`, `q~${first}`, `q~${second}`].sort())
    expect(cloud.docs.get(`q~${first}`)!.rec).toMatchObject({ kind: 'q', f: { title: { v: 'Parliament', d: 'devA' }, target: { v: { chapterId: 'parliament' } } } })
    await idle()
    expect(await a.queued()).toEqual([])

    // device B: a different browser profile
    localStorage.clear()
    await wipe()
    const b = await boot('devB')
    await b.sync(cloud)
    expect(b.titles()).toEqual(['Parliament', 'Judiciary'])
    expect(b.open()[1].reason).toBe('revision')
    expect(b.activeGoal(b.usePlan.getState())).toMatchObject({ enabled: true, dailyTargetMs: 3 * H })

    // B completes the first item while A (not yet synced with B) moves it to the end
    now += 60000
    b.completeQueueItem(first)
    const doc = cloud.docs.get(`q~${first}`)!
    doc.rec.f!.order = { v: 9, t: now + 5, d: 'devA' }
    doc.st = ++cloud.clock
    await b.sync(cloud)
    const row = b.usePlan.getState().queue[first]
    expect(row.order).toBe(9)
    expect(row.completedAt).toBeTruthy()
    expect(cloud.docs.get(`q~${first}`)!.rec.f).toMatchObject({ order: { v: 9, d: 'devA' }, completedAt: { d: 'devB' } })

    // a removal travels as a field too, and the goal can be changed from either device
    now += 60000
    b.removeQueueItem(second)
    b.setGoal({ weeklyTargetMs: 12 * H })
    await b.sync(cloud)
    expect(cloud.docs.get(`q~${second}`)!.rec.f!.removed.v).toBe(true)
    expect(cloud.docs.get('goal~default')!.rec.f).toMatchObject({ dailyTargetMs: { v: null }, weeklyTargetMs: { v: 12 * H }, enabled: { v: true } })
    await idle()
    a = await boot('devB') // same profile after a reload: the merged state was saved
    expect(a.titles()).toEqual([])
    expect(a.activeGoal(a.usePlan.getState())).toMatchObject({ weeklyTargetMs: 12 * H })
    expect(a.activeGoal(a.usePlan.getState())!.dailyTargetMs).toBeUndefined()
  })

  it('first sign-in merges a local queue with the cloud one instead of replacing either', async () => {
    const cloud = new Cloud()
    const a = await boot('devA')
    a.addToQueue(ref('parliament'), 'Parliament')
    await a.sync(cloud)
    localStorage.clear()
    await wipe()
    const b = await boot('devB')
    now += 5000
    b.addToQueue(ref('inflation'), 'Inflation')
    await b.store.syncLocal.rebind('user-1')
    await b.sync(cloud)
    expect(b.titles().sort()).toEqual(['Inflation', 'Parliament'])
    expect([...cloud.docs.values()].filter((d) => d.rec.kind === 'q')).toHaveLength(2)
  })
})
