import { describe, expect, it } from 'vitest'
import { mergeFields, reconcile, type Field, type Rec } from './merge'
import { resolveConflict, syncOnce, type Local, type Remote } from './engine'

// ---- fakes ------------------------------------------------------------------
class Cloud implements Remote {
  docs = new Map<string, { rec: Rec; st: number }>()
  clock = 0
  online = true
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
}

class Device implements Local {
  recs = new Map<string, Rec>()
  syncedRev = new Map<string, string | undefined>()
  queue = new Map<string, number>()
  conf = new Map<string, Rec>()
  seq = 0
  cur = 0
  constructor(public name: string) {}
  // local mutations ------------------------------------------------------------
  edit(key: string, html: string, t: number) {
    const id = `edit~${key}`
    this.recs.set(id, { id, kind: 'edit', t, dev: this.name, rev: `${this.name}-${t}`, del: false, data: { title: null, html } })
    this.markDirty(id)
  }
  reset(key: string, t: number) {
    const id = `edit~${key}`
    this.recs.set(id, { id, kind: 'edit', t, dev: this.name, rev: `${this.name}-${t}`, del: true })
    this.markDirty(id)
  }
  highlight(hid: string, color: string, t: number, del = false) {
    const id = `hl~${hid}`
    this.recs.set(id, { id, kind: 'hl', t, dev: this.name, del, data: { sectionKey: 's', color, start: 0, end: 4, text: 'word', before: '', createdAt: 1 } })
    this.markDirty(id)
  }
  field(id: string, name: string, v: unknown, t: number) {
    const cur = this.recs.get(id)
    const f: Record<string, Field> = { ...cur?.f, [name]: { v, t, d: this.name } }
    this.recs.set(id, { id, kind: id.split('~')[0] as Rec['kind'], t, dev: this.name, f })
    this.markDirty(id)
  }
  val = (id: string, name: string) => this.recs.get(id)?.f?.[name]?.v
  html = (key: string) => (this.recs.get(`edit~${key}`)?.data as { html?: string } | undefined)?.html
  // Local interface ------------------------------------------------------------
  get = (id: string) => this.recs.get(id) ?? null
  synced = (id: string) => this.syncedRev.get(id)
  apply(rec: Rec) {
    this.recs.set(rec.id, structuredClone(rec))
    if (rec.kind === 'edit') this.syncedRev.set(rec.id, rec.rev)
  }
  markSynced(id: string, rev: string | undefined) {
    this.syncedRev.set(id, rev)
  }
  dirty = () => new Map(this.queue)
  clearDirty(id: string, seq: number) {
    if (this.queue.get(id) === seq) this.queue.delete(id)
  }
  markDirty(id: string) {
    this.queue.set(id, ++this.seq)
  }
  cursor = () => this.cur
  setCursor(c: number) {
    this.cur = c
  }
  conflicts = () => new Map(this.conf)
  setConflict(id: string, remote: Rec | null) {
    if (remote) this.conf.set(id, remote)
    else this.conf.delete(id)
  }
}

const fld = (v: unknown, t: number, d = 'A'): Field => ({ v, t, d })
const frec = (f: Record<string, Field>, dev = 'A'): Rec => ({ id: 'sec~x', kind: 'sec', t: 0, dev, f })

// ---- pure rules ---------------------------------------------------------------
describe('field merge (progress, preferences)', () => {
  it('local-only record is pushed', () => {
    expect(reconcile(frec({ done: fld(true, 5) }), null, { dirty: true }).type).toBe('push')
  })
  it('cloud-only record is pulled', () => {
    expect(reconcile(null, frec({ done: fld(true, 5) }), { dirty: false }).type).toBe('pull')
  })
  it('identical records need nothing', () => {
    expect(reconcile(frec({ done: fld(true, 5) }), frec({ done: fld(true, 5) }), { dirty: true }).type).toBe('noop')
  })
  it('newer local field wins', () => {
    const d = reconcile(frec({ done: fld(true, 9) }), frec({ done: fld(false, 5, 'B') }), { dirty: true })
    expect(d.type).toBe('push')
    expect(d.type === 'push' && d.rec.f!.done.v).toBe(true)
  })
  it('newer cloud field wins', () => {
    const d = reconcile(frec({ done: fld(true, 5) }), frec({ done: fld(false, 9, 'B') }), { dirty: true })
    expect(d.type).toBe('pull')
    expect(d.type === 'pull' && d.rec.f!.done.v).toBe(false)
  })
  it('independent fields changed on two devices are both kept', () => {
    const m = mergeFields(frec({ done: fld(true, 9), revise: fld(false, 1) }), frec({ done: fld(false, 2, 'B'), revise: fld(true, 8, 'B') }, 'B'))
    expect(m.rec.f!.done.v).toBe(true)
    expect(m.rec.f!.revise.v).toBe(true)
    expect(m.localChanged && m.remoteChanged).toBe(true)
  })
  it('equal timestamps resolve the same way on both devices', () => {
    const a = frec({ status: fld('revised', 5, 'A') })
    const b = frec({ status: fld('mastered', 5, 'B') }, 'B')
    expect(mergeFields(a, b).rec.f!.status.v).toBe(mergeFields(b, a).rec.f!.status.v)
  })
})

describe('edit reconcile (learner content)', () => {
  const e = (rev: string, html: string, del = false): Rec => ({ id: 'edit~s', kind: 'edit', t: 1, dev: 'A', rev, del, data: del ? undefined : { title: null, html } })
  it('pushes when the cloud still holds the version we started from', () => {
    expect(reconcile(e('a2', 'mine'), e('a1', 'old'), { dirty: true, synced: 'a1' }).type).toBe('push')
  })
  it('pulls a cloud change when nothing was edited here', () => {
    expect(reconcile(e('a1', 'old'), e('b2', 'theirs'), { dirty: false, synced: 'a1' }).type).toBe('pull')
  })
  it('flags a conflict when both sides changed the same section', () => {
    const d = reconcile(e('a2', 'mine'), e('b2', 'theirs'), { dirty: true, synced: 'a1' })
    expect(d.type).toBe('conflict')
  })
  it('same text typed on both devices is not a conflict', () => {
    expect(reconcile(e('a2', 'same'), e('b2', 'same'), { dirty: true, synced: 'a1' }).type).toBe('noop')
  })
  it('a local edit outranks a reset made elsewhere', () => {
    expect(reconcile(e('a2', 'mine'), e('b2', '', true), { dirty: true, synced: 'a1' }).type).toBe('push')
  })
  it('a local reset does not silently erase a newer cloud edit', () => {
    expect(reconcile(e('a2', '', true), e('b2', 'theirs'), { dirty: true, synced: 'a1' }).type).toBe('conflict')
  })
})

// ---- engine -------------------------------------------------------------------
describe('sync engine', () => {
  it('first sign-in: local-only data is uploaded, cloud-only data is downloaded, nothing is wiped', async () => {
    const cloud = new Cloud()
    const old = new Device('B')
    old.edit('ch/other', 'from B', 1)
    old.highlight('hb', 'pink', 1)
    await syncOnce(cloud, old)

    const a = new Device('A') // existing local Polity state, never synced
    a.edit('ch/sec', 'my local edit', 2)
    a.highlight('ha', 'yellow', 2)
    a.field('sec~ch/sec', 'done', true, 2)
    await syncOnce(cloud, a)

    expect(a.html('ch/sec')).toBe('my local edit')
    expect(a.html('ch/other')).toBe('from B')
    expect(a.get('hl~hb')).not.toBeNull()
    expect(cloud.docs.has('edit~ch/sec') && cloud.docs.has('hl~ha') && cloud.docs.has('sec~ch/sec')).toBe(true)
    expect(a.dirty().size).toBe(0)
  })

  it('second device restores the full state', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    a.edit('ch/sec', 'edited', 1)
    a.highlight('h1', 'green', 1)
    a.field('chap~ch', 'status', 'revised', 1)
    a.field('chap~ch', 'scroll', 420, 1)
    a.field('pref~main', 'theme', 'dark', 1)
    await syncOnce(cloud, a)
    const b = new Device('B')
    await syncOnce(cloud, b)
    expect(b.html('ch/sec')).toBe('edited')
    expect((b.get('hl~h1')!.data as { color: string }).color).toBe('green')
    expect(b.val('chap~ch', 'status')).toBe('revised')
    expect(b.val('chap~ch', 'scroll')).toBe(420)
    expect(b.val('pref~main', 'theme')).toBe('dark')
  })

  it('highlight on one device and progress on another merge without loss', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    const b = new Device('B')
    a.field('sec~ch/sec', 'done', true, 5)
    b.highlight('hb', 'blue', 5)
    b.field('sec~ch/sec', 'revise', true, 6)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    await syncOnce(cloud, a)
    for (const d of [a, b]) {
      expect(d.val('sec~ch/sec', 'done')).toBe(true)
      expect(d.val('sec~ch/sec', 'revise')).toBe(true)
      expect(d.get('hl~hb')).not.toBeNull()
    }
  })

  it('offline changes stay queued and replay on reconnect', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    cloud.online = false
    a.edit('ch/sec', 'offline edit', 1)
    a.field('sec~ch/sec', 'difficult', true, 1)
    await expect(syncOnce(cloud, a)).rejects.toThrow()
    expect(a.dirty().size).toBe(2) // nothing lost, nothing sent
    expect(cloud.docs.size).toBe(0)
    a.edit('ch/sec', 'offline edit v2', 2) // more work while offline
    cloud.online = true
    const r = await syncOnce(cloud, a)
    expect(r.pushed).toBe(2)
    expect(a.dirty().size).toBe(0)
    expect((cloud.docs.get('edit~ch/sec')!.rec.data as { html: string }).html).toBe('offline edit v2')
  })

  it('a change made during a push stays queued', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    a.edit('ch/sec', 'v1', 1)
    const orig = cloud.transact.bind(cloud)
    cloud.transact = async (id, fn) => {
      await orig(id, fn)
      a.edit('ch/sec', 'v2', 2) // user keeps typing while the request is in flight
    }
    await syncOnce(cloud, a)
    expect(a.dirty().has('edit~ch/sec')).toBe(true)
    cloud.transact = orig
    await syncOnce(cloud, a)
    expect((cloud.docs.get('edit~ch/sec')!.rec.data as { html: string }).html).toBe('v2')
  })

  it('same section edited on two devices: both versions survive until the user chooses', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    const b = new Device('B')
    a.edit('ch/sec', 'base', 1)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    a.edit('ch/sec', 'A version', 2)
    b.edit('ch/sec', 'B version', 3)
    b.field('sec~ch/sec', 'done', true, 3)
    await syncOnce(cloud, a)
    const r = await syncOnce(cloud, b)
    expect(r.conflicts).toBe(1)
    expect(b.html('ch/sec')).toBe('B version') // local kept
    expect((b.conflicts().get('edit~ch/sec')!.data as { html: string }).html).toBe('A version') // cloud kept
    expect(cloud.docs.has('sec~ch/sec')).toBe(true) // unrelated state still synced

    // keep this device → cloud and the other device take B's text
    resolveConflict(b, 'edit~ch/sec', 'local')
    await syncOnce(cloud, b)
    await syncOnce(cloud, a)
    expect(a.html('ch/sec')).toBe('B version')
    expect(b.conflicts().size).toBe(0)
  })

  it('conflict resolved as "keep cloud" adopts the cloud text and clears the queue', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    const b = new Device('B')
    a.edit('ch/sec', 'base', 1)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    a.edit('ch/sec', 'A version', 2)
    b.edit('ch/sec', 'B version', 3)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    resolveConflict(b, 'edit~ch/sec', 'cloud')
    expect(b.html('ch/sec')).toBe('A version')
    expect(b.dirty().size).toBe(0)
    const r = await syncOnce(cloud, b)
    expect(r.conflicts).toBe(0)
  })

  it('first sign-in with a different edit already in the cloud is a conflict, not an overwrite', async () => {
    const cloud = new Cloud()
    const b = new Device('B')
    b.edit('ch/sec', 'cloud text', 1)
    await syncOnce(cloud, b)
    const a = new Device('A')
    a.edit('ch/sec', 'local text written before signing in', 2)
    const r = await syncOnce(cloud, a)
    expect(r.conflicts).toBe(1)
    expect(a.html('ch/sec')).toBe('local text written before signing in')
    expect((cloud.docs.get('edit~ch/sec')!.rec.data as { html: string }).html).toBe('cloud text')
  })

  it('reset on one device reaches the other; highlight removal propagates as a tombstone', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    const b = new Device('B')
    a.edit('ch/sec', 'edited', 1)
    a.highlight('h1', 'yellow', 1)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    a.reset('ch/sec', 2)
    a.highlight('h1', 'yellow', 2, true)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    expect(b.get('edit~ch/sec')!.del).toBe(true)
    expect(b.get('hl~h1')!.del).toBe(true)
  })

  it('the later highlight change wins (recolour vs older recolour)', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    const b = new Device('B')
    a.highlight('h1', 'yellow', 1)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    a.highlight('h1', 'green', 5)
    b.highlight('h1', 'pink', 9)
    await syncOnce(cloud, a)
    await syncOnce(cloud, b)
    await syncOnce(cloud, a)
    expect((a.get('hl~h1')!.data as { color: string }).color).toBe('pink')
    expect((b.get('hl~h1')!.data as { color: string }).color).toBe('pink')
  })

  it('repeated syncs are idempotent', async () => {
    const cloud = new Cloud()
    const a = new Device('A')
    a.edit('ch/sec', 'x', 1)
    a.field('chap~ch', 'scroll', 10, 1)
    await syncOnce(cloud, a)
    const writes = cloud.clock
    const r = await syncOnce(cloud, a)
    expect(r).toEqual({ pulled: 0, pushed: 0, conflicts: 0 })
    expect(cloud.clock).toBe(writes)
  })
})
