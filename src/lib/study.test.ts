// The timer as the app runs it: zustand state + IndexedDB + the sync queue, with no cloud at all
// (local-only mode). A "reload" is a fresh copy of the modules over the same database.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveStudySession, StudyContext, StudySession } from './contract'
import type { Runtime } from './timer'

const MIN = 60000
const ctx = (chapterId: string, subjectId = 'economy'): StudyContext => ({
  ref: { kind: 'chapter', stage: 'prelims', subjectId, topicId: 't', chapterId },
  subjectTitle: subjectId,
  chapterTitle: chapterId,
})

let now = Date.parse('2026-10-03T10:00:00.000Z')
const idle = () => new Promise((r) => setTimeout(r, 30)) // let IndexedDB writes land

async function boot() {
  vi.resetModules()
  const store = await import('./store')
  const study = await import('./study')
  const { db } = await import('./db')
  study.clock.now = () => now
  await store.useStore.getState().init()
  await study.initStudy()
  const active = () => study.activeTimer(study.useStudy.getState())
  const rows = () => db.getAll<StudySession>('studySessions')
  const saved = () => db.get<Runtime>('activeStudySession', 'active')
  const queue = async () => (await db.getAll<{ id: string }>('outbox')).map((o) => o.id)
  return { ...study, store, active, rows, saved, queue }
}

beforeEach(async () => {
  localStorage.clear()
  await new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase('upsc-notes')
    r.onsuccess = r.onerror = r.onblocked = () => resolve()
  })
})

describe('study timer store (local-only)', () => {
  it('start is saved to IndexedDB and queued at once, with the reader context', async () => {
    const t = await boot()
    t.startTimer(ctx('inflation'))
    expect(t.active()).toMatchObject({ state: 'running', currentContext: { chapterTitle: 'inflation' } }) // screen first
    await idle()
    expect(await t.saved()).toMatchObject({ state: 'running', ownerDeviceId: t.store.deviceId, currentContext: { ref: { stage: 'prelims', subjectId: 'economy', chapterId: 'inflation' } } })
    expect(await t.queue()).toContain('run~active')
  })

  it('there is only ever one timer', async () => {
    const t = await boot()
    t.startTimer(ctx('inflation'))
    const id = t.active()!.sessionId
    t.startTimer(ctx('taxation'))
    expect(t.active()!.sessionId).toBe(id)
    expect(t.active()!.currentContext.chapterTitle).toBe('inflation')
  })

  it('reload while running: the timer is recovered and the time in between still counts', async () => {
    let t = await boot()
    t.startTimer(ctx('inflation'))
    await idle()
    now += 3 * MIN
    t = await boot()
    const { elapsed } = await import('./timer')
    expect(t.active()).toMatchObject({ state: 'running' })
    expect(elapsed(t.active()!, now)).toBe(3 * MIN)
  })

  it('reload while paused: still paused, and the pause is never counted', async () => {
    let t = await boot()
    t.startTimer(ctx('inflation'))
    now += 10 * MIN
    t.pauseTimer()
    await idle()
    now += 90 * MIN
    t = await boot()
    const { elapsed } = await import('./timer')
    expect(t.active()!.state).toBe('paused')
    expect(elapsed(t.active()!, now)).toBe(10 * MIN)
    t.resumeTimer()
    now += 5 * MIN
    expect(t.stopTimer()!.durationMs).toBe(15 * MIN)
  })

  it('navigation closes one span and opens the next; the session attributes each stretch', async () => {
    const t = await boot()
    t.startTimer(ctx('parliament', 'polity'))
    now += 20 * MIN
    t.followContext(ctx('inflation'))
    t.followContext(ctx('inflation')) // re-render on the same chapter
    now += 10 * MIN
    const session = t.stopTimer()!
    expect(session.spans.map((s) => [s.context.ref.subjectId, s.context.ref.chapterId, s.durationMs])).toEqual([['polity', 'parliament', 20 * MIN], ['economy', 'inflation', 10 * MIN]])
    expect(session.durationMs).toBe(30 * MIN)
  })

  it('stop writes one session with timezone and device, clears the timer, and queues both', async () => {
    const t = await boot()
    t.startTimer(ctx('inflation'))
    now += 25 * MIN
    const session = t.stopTimer()!
    expect(t.active()).toBeNull()
    await idle()
    const rows = await t.rows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: session.id, durationMs: 25 * MIN, source: 'timer', createdDeviceId: t.store.deviceId, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    expect(Object.keys(rows[0])).not.toContain('syncedAt') // local-only: never sent
    expect(await t.saved()).toMatchObject({ sessionId: session.id, spanIds: [session.spans[0].id] })
    expect(await t.queue()).toEqual(expect.arrayContaining(['run~active', `ses~${session.id}`]))
    // and survives a reload
    const again = await boot()
    expect(Object.keys(again.useStudy.getState().sessions)).toEqual([session.id])
    expect(again.active()).toBeNull()
  })

  it('a completed session cannot be changed', async () => {
    const t = await boot()
    t.startTimer(ctx('inflation'))
    now += 25 * MIN
    const session = t.stopTimer()!
    const held = t.useStudy.getState().sessions[session.id]
    expect(() => { (held as { durationMs: number }).durationMs = 1 }).toThrow()
    expect(() => { held.spans.push(held.spans[0]) }).toThrow()
    expect(() => { (held.spans[0] as { durationMs: number }).durationMs = 1 }).toThrow()
    // further timer activity never touches it
    t.startTimer(ctx('taxation'))
    now += 5 * MIN
    t.pauseTimer()
    t.stopTimer()
    await idle()
    const rows = await t.rows()
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === session.id)).toEqual(JSON.parse(JSON.stringify(session)))
  })

  it('study time is only what the sessions say: no counter is kept anywhere', async () => {
    const t = await boot()
    for (const m of [10, 20]) {
      t.startTimer(ctx('inflation'))
      now += m * MIN
      t.stopTimer()
    }
    await idle()
    const { db } = await import('./db')
    expect((await t.rows()).reduce((n, s) => n + s.durationMs, 0)).toBe(30 * MIN)
    expect(JSON.stringify(await db.getAll('kv'))).not.toMatch(/total|minutes/i)
    expect(Object.keys(localStorage).join()).not.toMatch(/total|minutes/i)
  })

  it('an accidental start/stop saves nothing', async () => {
    const t = await boot()
    t.startTimer(ctx('inflation'))
    now += 300
    expect(t.stopTimer()).toBeNull()
    await idle()
    expect(await t.rows()).toHaveLength(0)
    expect(t.active()).toBeNull()
  })

  it('browser closed for hours with the timer running: recovered, and the unattended stretch can be left out', async () => {
    let t = await boot()
    t.startTimer(ctx('inflation'))
    now += 30 * MIN
    t.followContext(ctx('taxation')) // last sign of life
    await idle()
    const lastOpen = now
    now += 8 * 60 * MIN
    t = await boot()
    expect(t.active()!.state).toBe('running') // nothing is stopped behind the user's back
    expect(t.useStudy.getState().away).toBe(lastOpen)
    t.followContext(ctx('parliament', 'polity')) // waits for the decision
    expect(t.active()!.currentContext.chapterTitle).toBe('taxation')
    const session = t.stopTimer(t.useStudy.getState().away!)!
    expect(session).toMatchObject({ durationMs: 30 * MIN, source: 'recovered' })
    expect(t.useStudy.getState().away).toBeNull()
  })

  it('…or kept in full', async () => {
    let t = await boot()
    t.startTimer(ctx('inflation'))
    await idle()
    now += 2 * 60 * MIN
    t = await boot()
    expect(t.useStudy.getState().away).not.toBeNull()
    t.keepAwayTime()
    now += 10 * MIN
    expect(t.stopTimer()!.durationMs).toBe(130 * MIN)
  })

  it('a short reload is not treated as being away', async () => {
    let t = await boot()
    t.startTimer(ctx('inflation'))
    await idle()
    now += 2 * MIN
    t = await boot()
    expect(t.useStudy.getState().away).toBeNull()
  })

  it('a timer owned by another device is shown but not driven from here until "Continue here"', async () => {
    const t = await boot()
    const { start, runRec, elapsed } = await import('./timer')
    const theirs: ActiveStudySession = start(ctx('inflation'), now - 42 * MIN, 'other-device')
    t.store.syncLocal.apply(runRec(theirs))
    expect(t.ownsTimer(t.active())).toBe(false)
    t.pauseTimer()
    t.followContext(ctx('taxation'))
    expect(t.stopTimer()).toBeNull()
    t.startTimer(ctx('taxation')) // no second timer
    expect(t.active()).toEqual(theirs)
    t.continueHere(ctx('taxation'))
    expect(t.active()).toMatchObject({ sessionId: theirs.sessionId, ownerDeviceId: t.store.deviceId, state: 'running', currentContext: { chapterTitle: 'taxation' } })
    expect(elapsed(t.active()!, now)).toBe(42 * MIN)
    now += 3 * MIN
    expect(t.stopTimer()).toMatchObject({ id: theirs.sessionId, durationMs: 45 * MIN })
  })

  it('timer preferences default to chapter tracking that follows navigation', async () => {
    const t = await boot()
    expect(t.store.useStore.getState().prefs.timer).toEqual({ trackingGranularity: 'chapter', followNavigation: true })
  })
})
