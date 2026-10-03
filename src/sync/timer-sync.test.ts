// Study sessions and the active timer through the real sync engine, with two (or three) fake
// devices and a fake cloud. Covers the cross-device rules of docs/READER_V2_CONTRACT.md.
import { describe, expect, it } from 'vitest'
import type { ActiveStudySession, StudyContext, StudySession } from '../lib/contract'
import { RUN_ID, elapsed, finish, isActive, pause, runRec, sesRec, start, switchContext, takeOver, type Runtime } from '../lib/timer'
import { syncOnce, type Local, type Remote } from './engine'
import type { Rec } from './merge'

const MIN = 60000
const T0 = Date.parse('2026-10-03T10:00:00.000Z')
const ctx = (chapterId: string): StudyContext => ({ ref: { kind: 'chapter', stage: 'prelims', subjectId: 'economy', chapterId }, subjectTitle: 'Economy', chapterTitle: chapterId })
let now = T0

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
    const cur = this.docs.get(id)?.rec ?? null
    const out = fn(structuredClone(cur))
    if (!out) return
    if (cur && id.startsWith('ses~')) throw new Error('permission-denied: completed sessions are create-only') // firestore.rules
    this.docs.set(id, { rec: structuredClone(out), st: ++this.clock })
  }
  sessions = () => [...this.docs.values()].filter((d) => d.rec.kind === 'ses').map((d) => d.rec.data as unknown as StudySession)
  runtime = () => this.docs.get(RUN_ID)?.rec.data as unknown as Runtime | undefined
}

/** A device: the timer actions of study.ts over an in-memory store. */
class Device implements Local {
  runtime: Runtime | null = null
  sessions = new Map<string, StudySession>()
  base: string | undefined
  queue = new Map<string, number>()
  seq = 0
  cur = 0
  constructor(public name: string) {}
  get active() {
    return isActive(this.runtime) ? this.runtime : null
  }
  set(r: Runtime) {
    this.runtime = r
    this.markDirty(RUN_ID)
  }
  start(c: StudyContext, offline = false) {
    this.set(start(c, now, this.name, offline))
  }
  act(fn: (a: ActiveStudySession, now: number) => ActiveStudySession) {
    this.set(fn(this.active!, now))
  }
  continueHere(c?: StudyContext) {
    this.set(takeOver(this.active!, this.name, now, c))
  }
  stop() {
    const { session, stopped } = finish(this.active!, this.env())
    if (session) {
      this.sessions.set(session.id, session)
      this.markDirty(`ses~${session.id}`)
    }
    this.set(stopped)
    return session
  }
  total = () => [...this.sessions.values()].reduce((n, s) => n + s.durationMs, 0)
  // Local ---------------------------------------------------------------------
  env = () => ({ now, dev: this.name, tz: 'Asia/Kolkata' })
  get = (id: string) => (id === RUN_ID ? (this.runtime ? runRec(this.runtime) : null) : this.sessions.has(id.slice(4)) ? sesRec(this.sessions.get(id.slice(4))!) : null)
  synced = (id: string) => (id === RUN_ID ? this.base : undefined)
  apply(rec: Rec) {
    if (rec.kind === 'run') {
      this.runtime = structuredClone(rec.data) as unknown as Runtime
      this.base = rec.rev
    } else this.sessions.set(rec.id.slice(4), structuredClone(rec.data) as unknown as StudySession)
  }
  markSynced(id: string, rev: string | undefined) {
    if (id === RUN_ID) this.base = rev
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
  conflicts = () => new Map<string, Rec>()
  setConflict() {}
}

const setup = () => {
  now = T0
  return { cloud: new Cloud(), a: new Device('A'), b: new Device('B') }
}
/** Sync until nothing is queued (records split off while reconciling go out on the next pass). */
async function settle(cloud: Cloud, ...devices: Device[]) {
  for (let i = 0; i < 3; i++) for (const d of devices) await syncOnce(cloud, d)
}

describe('study sessions across devices', () => {
  it('a completed session reaches the cloud once and is restored on a second device', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    now += 30 * MIN
    a.act((x, t) => switchContext(x, ctx('taxation'), t))
    now += 15 * MIN
    const session = a.stop()!
    await settle(cloud, a, b)
    expect(cloud.sessions()).toEqual([session])
    expect(b.sessions.get(session.id)).toEqual(session)
    expect(b.sessions.get(session.id)!.spans.map((s) => [s.context.chapterTitle, s.durationMs])).toEqual([['inflation', 30 * MIN], ['taxation', 15 * MIN]])
    expect(b.active).toBeNull()
    expect(a.dirty().size + b.dirty().size).toBe(0)
  })

  it('sessions are write-once: repeated syncs never rewrite them', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    now += 10 * MIN
    const session = a.stop()!
    await settle(cloud, a, b)
    const writes = cloud.clock
    b.markDirty(`ses~${session.id}`) // e.g. signing in again queues everything
    a.markDirty(`ses~${session.id}`)
    await settle(cloud, a, b)
    expect(cloud.clock).toBe(writes)
    expect(cloud.sessions()).toEqual([session])
  })

  it('offline: start, study and stop are queued, and replayed on reconnect', async () => {
    const { cloud, a, b } = setup()
    cloud.online = false
    a.start(ctx('inflation'), true)
    now += 40 * MIN
    const session = a.stop()!
    await expect(syncOnce(cloud, a)).rejects.toThrow()
    expect([...a.dirty().keys()].sort()).toEqual([RUN_ID, `ses~${session.id}`])
    expect(cloud.docs.size).toBe(0)
    cloud.online = true
    await settle(cloud, a, b)
    expect(a.dirty().size).toBe(0)
    expect(b.sessions.get(session.id)!.durationMs).toBe(40 * MIN)
    expect(isActive(cloud.runtime())).toBe(false)
  })
})

describe('one active timer per user', () => {
  it('a running timer appears on the second device with the same elapsed time', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a)
    now += 42 * MIN
    await settle(cloud, b)
    expect(b.active).toMatchObject({ sessionId: a.active!.sessionId, ownerDeviceId: 'A', state: 'running' })
    expect(elapsed(b.active!, now)).toBe(42 * MIN)
    expect(b.dirty().size).toBe(0) // seeing it changes nothing
  })

  it('"Continue here" moves ownership of the same session; no second session is created', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    const id = a.active!.sessionId
    await settle(cloud, a, b)
    now += 20 * MIN
    b.continueHere(ctx('taxation'))
    await settle(cloud, b, a)
    expect(a.active).toMatchObject({ sessionId: id, ownerDeviceId: 'B' }) // A now only watches
    expect(cloud.runtime()).toMatchObject({ sessionId: id, ownerDeviceId: 'B' })
    now += 10 * MIN
    const session = b.stop()!
    await settle(cloud, b, a)
    expect(cloud.sessions()).toHaveLength(1)
    expect(session).toMatchObject({ id, durationMs: 30 * MIN, createdDeviceId: 'B' })
    expect(session.spans.map((s) => [s.context.chapterTitle, s.durationMs])).toEqual([['inflation', 20 * MIN], ['taxation', 10 * MIN]])
    expect(a.sessions.get(id)).toEqual(session)
    expect(a.active).toBeNull()
    expect(b.active).toBeNull()
  })

  it('pause on the owner is seen by the other device', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a, b)
    now += 5 * MIN
    a.act(pause)
    await settle(cloud, a, b)
    now += 60 * MIN
    expect(b.active!.state).toBe('paused')
    expect(elapsed(b.active!, now)).toBe(5 * MIN)
  })

  it('a new timer after the previous one ended simply becomes the active one', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    now += 10 * MIN
    a.stop()
    await settle(cloud, a, b)
    b.start(ctx('taxation'))
    await settle(cloud, b, a)
    expect(a.active).toMatchObject({ sessionId: b.active!.sessionId, ownerDeviceId: 'B' })
  })
})

describe('offline overlap protection', () => {
  it('a timer started offline while another device already has one: both records survive, one timer remains', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a)
    // B is offline and cannot know
    now += 10 * MIN
    b.start(ctx('taxation'), true)
    expect(b.active!.offlineProvisional).toBe(true)
    now += 25 * MIN
    await settle(cloud, b, a) // B reconnects
    // the cloud timer stands and is the only active one
    expect(cloud.runtime()).toMatchObject({ sessionId: a.active!.sessionId, ownerDeviceId: 'A', state: 'running' })
    expect(b.active).toMatchObject({ sessionId: a.active!.sessionId, ownerDeviceId: 'A' })
    // B's 25 minutes are a completed session, flagged as recovered, on every device and in the cloud
    const kept = cloud.sessions()
    expect(kept).toHaveLength(1)
    expect(kept[0]).toMatchObject({ durationMs: 25 * MIN, source: 'recovered', createdDeviceId: 'B' })
    expect(kept[0].spans[0].context.chapterTitle).toBe('taxation')
    expect(a.sessions.get(kept[0].id)).toEqual(kept[0])
    // A's timer was never touched
    now += 5 * MIN
    expect(a.stop()!.durationMs).toBe(40 * MIN)
    await settle(cloud, a, b)
    expect(cloud.sessions()).toHaveLength(2)
    expect(b.total()).toBe(65 * MIN)
  })

  it('offline timer, but the other device had already stopped: the offline timer just carries on', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a, b)
    now += 10 * MIN
    a.stop()
    await settle(cloud, a) // B has not heard
    // B (stale: still shows A's timer) is offline; A's timer ends up stopped in the cloud
    const stale = new Device('C')
    stale.start(ctx('taxation'), true)
    now += 5 * MIN
    await settle(cloud, stale, a)
    expect(cloud.runtime()).toMatchObject({ sessionId: stale.active!.sessionId, ownerDeviceId: 'C' })
    expect(a.active!.ownerDeviceId).toBe('C')
    expect(cloud.sessions()).toHaveLength(1) // A's; nothing was cut short
  })

  it('offline timer started and stopped before reconnecting: saved, and the cloud timer is left alone', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a)
    b.start(ctx('taxation'), true)
    now += 15 * MIN
    const offline = b.stop()!
    await settle(cloud, b, a)
    expect(cloud.runtime()).toMatchObject({ sessionId: a.active!.sessionId, state: 'running' })
    expect(cloud.sessions()).toEqual([offline])
    expect(b.active!.ownerDeviceId).toBe('A')
  })

  it('the owner goes offline and keeps working while another device continues the timer: no time is lost', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a, b)
    const id = a.active!.sessionId
    now += 10 * MIN
    b.continueHere() // A is offline and does not see this
    await settle(cloud, b)
    now += 5 * MIN
    a.act((x, t) => switchContext(x, ctx('taxation'), t)) // A, unaware, moves to another chapter
    now += 20 * MIN
    await settle(cloud, a, b) // A reconnects
    // one timer: B's continuation
    expect(cloud.runtime()).toMatchObject({ sessionId: id, ownerDeviceId: 'B' })
    expect(a.active!.ownerDeviceId).toBe('B')
    // what only A recorded (taxation, 20 min) is kept as its own session
    const recovered = cloud.sessions()
    expect(recovered).toHaveLength(1)
    expect(recovered[0]).toMatchObject({ id: `${id}_A`, source: 'recovered', durationMs: 20 * MIN })
    const whole = b.stop()!
    await settle(cloud, b, a)
    expect(whole.durationMs).toBe(35 * MIN)
    expect(a.total()).toBe(55 * MIN)
    expect(b.total()).toBe(55 * MIN)
  })

  it('the same session stopped on two devices: the first copy stands, the other keeps only its extra time', async () => {
    const { cloud, a, b } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a, b)
    const id = a.active!.sessionId
    now += 10 * MIN
    b.continueHere(ctx('taxation'))
    now += 5 * MIN
    const fromA = a.stop()! // A offline: stops its copy (15 min)
    now += 15 * MIN
    const fromB = b.stop()! // B offline too: 10 + 20 min
    expect(fromA.id).toBe(fromB.id)
    await settle(cloud, a, b)
    const all = cloud.sessions()
    expect(all.find((s) => s.id === id)).toEqual(fromA) // immutable once written
    const extra = all.find((s) => s.id === `${id}_B`)!
    expect(extra).toMatchObject({ source: 'recovered', durationMs: 20 * MIN })
    expect(extra.spans.map((s) => s.context.chapterTitle)).toEqual(['taxation'])
    expect(all).toHaveLength(2)
    for (const d of [a, b]) expect([...d.sessions.keys()].sort()).toEqual([id, `${id}_B`])
    expect(isActive(cloud.runtime())).toBe(false)
  })

  it('first sign-in with a timer running locally and another in the account: the local time is saved, not dropped', async () => {
    const { cloud, a } = setup()
    a.start(ctx('inflation'))
    await settle(cloud, a)
    const fresh = new Device('N') // was local-only until now
    fresh.start(ctx('taxation'))
    now += 12 * MIN
    await settle(cloud, fresh)
    expect(fresh.active!.ownerDeviceId).toBe('A')
    expect([...fresh.sessions.values()]).toMatchObject([{ durationMs: 12 * MIN, source: 'recovered' }])
  })
})
