// Personal data reset and the reset epoch, as the app runs them: every store and its IndexedDB
// rows, the sync queue, and the real sync engine against a fake cloud with two devices.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentRef, StudyContext } from './contract'
import { bumped, emptyEpoch, groupOf, isStale, kindsOf, resetGroups, staleGroups, type EpochDoc } from './epoch'
import { Cloud, deleteDb, idle, restore, snapshot } from './testkit'

const DAY = 86400000
const MIN = 60000
const T0 = Date.parse('2026-10-05T04:30:00.000Z')
let now = T0
const SEC = 'prelims/polity/parliament/budget'
const SEC2 = 'prelims/polity/parliament/committees'
const ctx: StudyContext = { ref: { kind: 'chapter', stage: 'prelims', subjectId: 'polity', chapterId: 'parliament' }, subjectTitle: 'Polity', chapterTitle: 'Parliament' }
const PERSONAL = ['overrides', 'highlights', 'studySessions', 'activeStudySession', 'studyGoals', 'studyQueue', 'pyqUserState', 'revisionUnits', 'revisionEvents', 'recallAttempts', 'examTargets', 'revisionPreferences']

async function boot(device?: string) {
  vi.resetModules()
  if (device) localStorage.setItem('upsc-device', device)
  const store = await import('./store')
  const study = await import('./study')
  const plan = await import('./plan')
  const pyq = await import('./pyqState')
  const rev = await import('./revision')
  const reset = await import('./reset')
  const content = await import('./content')
  const { db } = await import('./db')
  const { syncOnce } = await import('../sync/engine')
  for (const m of [study, plan, pyq, rev, reset]) m.clock.now = () => now
  await store.useStore.getState().init()
  await study.initStudy()
  await plan.initPlan()
  await pyq.initPyqState()
  await rev.initRevision()
  await reset.initReset()
  const st = store.useStore.getState
  const counts = async () => Object.fromEntries(await Promise.all(PERSONAL.map(async (s) => [s, (await db.getAll(s)).length] as const)))
  const progress = async () => (await db.get<{ sections: Record<string, unknown>; chapters: Record<string, unknown> }>('kv', 'progress')) ?? { sections: {}, chapters: {} }
  const queued = async () => (await db.getAll<{ id: string }>('outbox')).map((o) => o.id).sort()
  const sync = (cloud: Cloud) => syncOnce(cloud, store.syncLocal)
  /** A device that has been used: every kind of personal data is present. */
  const use = () => {
    st().setSection(SEC, { done: true, difficult: true, revise: true })
    st().setChapter('prelims/polity/parliament', { status: 'reading', scroll: 120 }, true)
    st().saveOverride(SEC, { html: '<p>my edit</p>' }, true)
    st().addHighlight(SEC, { start: 0, end: 4, text: 'word', before: '', color: 'yellow' })
    st().setPref({ theme: 'dark', favourites: [{ kind: 'chapter', stage: 'prelims', subjectId: 'polity', chapterId: 'parliament' }], recents: [{ target: { kind: 'chapter', stage: 'prelims', subjectId: 'polity', chapterId: 'parliament' }, title: 'Parliament', visitedAt: new Date(now).toISOString() }] })
    study.startTimer(ctx)
    now += 20 * MIN
    study.stopTimer()
    study.startTimer(ctx) // and one left running
    plan.addToQueue(ctx.ref as ContentRef, 'Parliament')
    plan.setGoal({ dailyTargetMs: 3600000 })
    pyq.setPyqFlags('UPSC-2019-Q066', { seen: true })
    now += DAY
    const e = rev.completeRevision({ unitId: SEC, grade: 'good', eventId: rev.newRevisionEventId(), startedAt: new Date(now).toISOString(), durationMs: 5 * MIN })!
    rev.recordAttempt({ recallUnitId: 'r1', contentHash: 'h', unitId: SEC, eventId: e.id, outcome: 'knew' })
    rev.addExam({ name: 'UPSC CSE Prelims', examDate: '2027-05-24' })
    rev.setRevisionPrefs({ recallIntensity: 'exam' })
    localStorage.setItem('upsc-revision-run', JSON.stringify({ queue: [SEC] }))
  }
  return { store, study, plan, pyq, rev, reset, content, db, st, counts, progress, queued, sync, use }
}

beforeEach(async () => {
  now = T0
  localStorage.clear()
  await deleteDb()
})

describe('epoch rules', () => {
  it('each reset removes its own groups and nothing else', () => {
    expect(resetGroups('study-history')).toEqual(['study'])
    expect(resetGroups('full-personal')).toEqual(['study', 'flags', 'goals', 'notes', 'favourites'])
    expect(resetGroups('full-personal', { keepExamTargets: true, keepSettings: true })).toEqual(['study', 'flags', 'goals', 'notes', 'favourites'])
    expect(resetGroups('full-personal', { keepExamTargets: false, keepSettings: false })).toEqual(['study', 'flags', 'goals', 'notes', 'favourites', 'exams', 'settings'])
    expect(kindsOf(['study']).sort()).toEqual(['cad', 'chap', 'pyq', 'q', 'ra', 'rev', 'ru', 'run', 'sec', 'ses'])
    expect(kindsOf(['notes']).sort()).toEqual(['cae', 'edit', 'hl'])
    expect(groupOf('exam')).toBe('exams')
    expect(groupOf('meta')).toBeNull()
  })

  it('a reset raises the epoch by one and the floor of every group it wiped', () => {
    const one = bumped(null, { scope: 'study-history', groups: ['study'], at: 'a' }, 'now')
    expect(one).toEqual({ epoch: 1, floors: { study: 1 }, resetAt: 'a', resetScope: 'study-history', updatedAt: 'now' })
    const two = bumped(one, { scope: 'full-personal', groups: ['study', 'notes'], at: 'b' }, 'now')
    expect(two).toMatchObject({ epoch: 2, floors: { study: 2, notes: 2 } })
    expect(staleGroups(0, two)).toEqual(['study', 'notes'])
    expect(staleGroups(1, two)).toEqual(['study', 'notes'])
    expect(staleGroups(2, two)).toEqual([])
    expect(staleGroups(0, emptyEpoch())).toEqual([])
  })

  it('a record written before its group was wiped is stale; one of a kept group never is', () => {
    const doc: EpochDoc = { epoch: 3, floors: { study: 3 }, updatedAt: '' }
    const rec = (kind: string, ep?: number) => ({ id: `${kind}~x`, kind, t: 1, dev: 'd', ep }) as never
    expect(isStale(rec('sec'), doc)).toBe(true) // written by a build that knew no epochs
    expect(isStale(rec('ses', 2), doc)).toBe(true)
    expect(isStale(rec('ses', 3), doc)).toBe(false)
    expect(isStale(rec('hl', 0), doc)).toBe(false) // highlights were not wiped
    expect(isStale(rec('meta'), doc)).toBe(false)
    expect(isStale(null, doc)).toBe(false)
  })
})

describe('reset on one device (local-only)', () => {
  it('Reset Study History removes the study record and keeps highlights, edits, ★ / ↻ marks, favourites, appearance, goals and exam targets', async () => {
    const t = await boot()
    t.use()
    await idle()
    expect(Object.values(await t.counts()).every((n) => n > 0)).toBe(true)
    const groups = await t.reset.resetPersonalData('study-history')
    expect(groups).toEqual(['study'])
    await idle()
    expect(await t.counts()).toEqual({ overrides: 1, highlights: 1, studySessions: 0, activeStudySession: 0, studyGoals: 1, studyQueue: 0, pyqUserState: 0, revisionUnits: 0, revisionEvents: 0, recallAttempts: 0, examTargets: 1, revisionPreferences: 1 })
    // "done", the chapter status and the reading position are gone; the learner's ★ / ↻ marks stay
    expect(await t.progress()).toEqual({ sections: { [SEC]: { difficult: true, revise: true } }, chapters: {} })
    // on screen, too
    expect(t.st().progress).toEqual({ sections: { [SEC]: { difficult: true, revise: true } }, chapters: {} })
    expect(t.study.useStudy.getState()).toMatchObject({ runtime: null, sessions: {} })
    expect(t.rev.useRevision.getState()).toMatchObject({ units: {}, events: {}, attempts: {} })
    expect(t.plan.usePlan.getState().queue).toEqual({})
    expect(t.pyq.usePyq.getState().rows).toEqual({})
    expect(t.st().prefs.recents).toEqual([]) // recent study activity
    expect(localStorage.getItem('upsc-revision-run')).toBeNull()
    // kept
    expect(t.st().overrides[SEC].html).toBe('<p>my edit</p>')
    expect(Object.values(t.st().highlights)).toHaveLength(1)
    expect(t.st().prefs).toMatchObject({ theme: 'dark' })
    expect(t.st().prefs.favourites).toHaveLength(1)
    expect(t.plan.activeGoal(t.plan.usePlan.getState())).toMatchObject({ dailyTargetMs: 3600000 })
    expect(Object.values(t.rev.useRevision.getState().exams).map((e) => e.name)).toEqual(['UPSC CSE Prelims'])
    expect(t.rev.revisionPrefs().recallIntensity).toBe('exam')
  })

  it('Full Personal Reset removes everything personal; exam targets and appearance are kept by default', async () => {
    const t = await boot()
    t.use()
    await idle()
    await t.reset.resetPersonalData('full-personal', { keepExamTargets: true, keepSettings: true })
    await idle()
    expect(await t.counts()).toEqual({ overrides: 0, highlights: 0, studySessions: 0, activeStudySession: 0, studyGoals: 0, studyQueue: 0, pyqUserState: 0, revisionUnits: 0, revisionEvents: 0, recallAttempts: 0, examTargets: 1, revisionPreferences: 1 })
    expect(await t.db.getAll('conflicts')).toEqual([])
    expect(t.st()).toMatchObject({ overrides: {}, highlights: {}, conflicts: {}, progress: { sections: {}, chapters: {} } })
    expect(t.st().prefs).toMatchObject({ theme: 'dark', favourites: [], recents: [] })
    expect(t.plan.usePlan.getState()).toMatchObject({ goal: null, queue: {} })
    expect(t.rev.revisionPrefs().recallIntensity).toBe('exam')
  })

  it('with both boxes unticked, exam targets and settings go as well', async () => {
    const t = await boot()
    t.use()
    await idle()
    await t.reset.resetPersonalData('full-personal', { keepExamTargets: false, keepSettings: false })
    await idle()
    expect(Object.values(await t.counts()).every((n) => n === 0)).toBe(true)
    expect(t.st().prefs).toMatchObject({ theme: 'system', recall: false, favourites: [], recents: [] })
    expect(t.rev.useRevision.getState()).toMatchObject({ exams: {}, prefs: null })
    expect(t.rev.revisionPrefs().recallIntensity).toBe('standard')
  })

  it('the notes, the PYQ corpus and the cross-links are not personal data and are untouched', async () => {
    const t = await boot()
    const before = { subjects: t.content.allSubjects().map((s) => [s.key, s.chapters.length, s.chapters.reduce((n, c) => n + c.sections.length, 0)]), pyqs: t.content.pyqIndex().records.length, links: t.content.linkIndex().links.length, html: t.content.allSubjects()[0].chapters[0].sections[0].html }
    expect(before.subjects.length).toBeGreaterThan(0)
    expect(before.pyqs).toBeGreaterThan(0)
    expect(before.links).toBeGreaterThan(0)
    t.use()
    await idle()
    await t.reset.resetPersonalData('full-personal', { keepExamTargets: false, keepSettings: false })
    await idle()
    const again = await boot() // and after a reload
    const after = { subjects: again.content.allSubjects().map((s) => [s.key, s.chapters.length, s.chapters.reduce((n, c) => n + c.sections.length, 0)]), pyqs: again.content.pyqIndex().records.length, links: again.content.linkIndex().links.length, html: again.content.allSubjects()[0].chapters[0].sections[0].html }
    expect(after).toEqual(before)
    expect(again.st().progress).toEqual({ sections: {}, chapters: {} })
  })

  it('the reset survives a reload, clears what was queued for the wiped data, and raises the local epoch', async () => {
    let t = await boot()
    t.use()
    await idle()
    expect((await t.queued()).some((id) => id.startsWith('ses~'))).toBe(true)
    expect(t.reset.localEpoch().epoch).toBe(0)
    await t.reset.resetPersonalData('study-history')
    await idle()
    const left = await t.queued()
    expect(left.filter((id) => /^(sec|chap|ses|run|q|pyq|ru|rev|ra)~/.test(id))).toEqual([`sec~${SEC}`]) // only the kept ★ / ↻ marks wait to be sent again
    expect(left).toEqual(expect.arrayContaining([`edit~${SEC}`, 'goal~default', 'pref~main']))
    expect(t.reset.localEpoch()).toMatchObject({ epoch: 1, floors: { study: 1 }, resetScope: 'study-history' })
    t = await boot()
    expect(t.reset.localEpoch().epoch).toBe(1)
    expect(t.rev.useRevision.getState().units).toEqual({})
    expect(t.study.useStudy.getState().sessions).toEqual({})
    // real study starts cleanly afterwards
    t.st().setSection(SEC2, { done: true })
    expect(Object.keys(t.rev.useRevision.getState().units)).toEqual([SEC2])
    await t.reset.resetPersonalData('full-personal')
    expect(t.reset.localEpoch()).toMatchObject({ epoch: 2, floors: { study: 2, notes: 2, goals: 2, favourites: 2 } })
  })
})

describe('reset across devices', () => {
  /** Two devices of one account, both in sync, with the same used state. Returns their parked storage. */
  async function pair(cloud: Cloud) {
    const a = await boot('devA')
    await a.store.syncLocal.rebind('user-1')
    a.use()
    await a.sync(cloud)
    await idle()
    const parkedA = await snapshot()
    localStorage.clear()
    await deleteDb()
    const b = await boot('devB')
    await b.store.syncLocal.rebind('user-1')
    await b.sync(cloud)
    await idle()
    expect(Object.keys(b.rev.useRevision.getState().units)).toEqual([SEC])
    return { parkedA, parkedB: await snapshot() }
  }

  it('a signed-in reset raises the cloud epoch, deletes the old cloud records and syncs only under the new epoch', async () => {
    const cloud = new Cloud()
    const { parkedA } = await pair(cloud)
    await restore(parkedA)
    const a = await boot('devA')
    expect(cloud.epoch()).toBeUndefined()
    expect(cloud.ids('ses').length + cloud.ids('ru').length + cloud.ids('rev').length).toBeGreaterThan(2)
    await a.reset.resetPersonalData('study-history')
    expect(a.reset.localEpoch().epoch).toBe(0) // not until the cloud agrees
    await a.sync(cloud)
    expect(cloud.epoch()).toMatchObject({ epoch: 1, floors: { study: 1 }, resetScope: 'study-history' })
    expect(a.reset.localEpoch()).toMatchObject({ epoch: 1 })
    for (const kind of ['chap', 'ses', 'run', 'q', 'pyq', 'ru', 'rev', 'ra']) expect(cloud.ids(kind)).toEqual([])
    // the kept ★ / ↻ marks were written again under the new epoch, without the old "done"
    expect(cloud.ids('sec')).toEqual([`sec~${SEC}`])
    expect(cloud.docs.get(`sec~${SEC}`)!.rec.ep).toBe(1)
    expect(Object.keys(cloud.docs.get(`sec~${SEC}`)!.rec.f!).sort()).toEqual(['difficult', 'revise'])
    expect(cloud.ids('hl')).toHaveLength(1) // kept groups are still there
    expect(cloud.ids('edit')).toHaveLength(1)
    expect(cloud.ids('exam')).toHaveLength(1)
    expect(cloud.wipes).toBe(1)
    // study after the reset is written under the new epoch
    a.st().setSection(SEC2, { done: true })
    await a.sync(cloud)
    expect(cloud.docs.get(`ru~${SEC2}`)!.rec.ep).toBe(1)
    expect(cloud.docs.get(`sec~${SEC2}`)!.rec.ep).toBe(1)
    expect(cloud.wipes).toBe(1) // the clean-up is done once
  })

  it('a stale second device drops its old data when it reconnects and cannot bring it back', async () => {
    const cloud = new Cloud()
    const { parkedA, parkedB } = await pair(cloud)
    await restore(parkedA)
    const a = await boot('devA')
    await a.reset.resetPersonalData('study-history')
    await a.sync(cloud)
    a.st().setSection(SEC2, { done: true }) // new study after the reset
    await a.sync(cloud)
    await idle()
    const afterA = await snapshot()

    // device B was offline all along, kept studying, and still holds everything
    await restore(parkedB)
    let b = await boot('devB')
    now += DAY
    b.study.stopTimer()
    b.st().setSection('prelims/polity/parliament/speaker', { done: true })
    b.st().addHighlight(SEC, { start: 5, end: 9, text: 'kept', before: '', color: 'pink' }) // not part of the reset
    await idle()
    expect(b.reset.localEpoch().epoch).toBe(0)
    expect((await b.queued()).some((id) => id.startsWith('ses~') || id.startsWith('ru~'))).toBe(true)
    await b.sync(cloud)
    await idle()

    // B: the stale study state is gone, the epoch adopted, the post-reset state received
    expect(b.reset.localEpoch()).toMatchObject({ epoch: 1, floors: { study: 1 } })
    expect(Object.keys(b.rev.useRevision.getState().units)).toEqual([SEC2])
    expect(b.rev.useRevision.getState().events).toEqual({})
    expect(b.study.useStudy.getState().sessions).toEqual({})
    expect(b.st().progress.sections).toEqual({ [SEC]: { difficult: true, revise: true }, [SEC2]: { done: true } }) // marks kept, old ticks gone
    expect((await b.counts()).studySessions).toBe(0)
    expect((await b.queued()).filter((id) => /^(sec|chap|ses|run|q|pyq|ru|rev|ra)~/.test(id))).toEqual([])
    // what the reset did not cover still syncs normally from the stale device
    expect(Object.values(b.st().highlights).filter((h) => !h.deleted)).toHaveLength(2)
    expect(cloud.ids('hl')).toHaveLength(2)
    // nothing old reached the cloud
    expect(cloud.ids('ses')).toEqual([])
    expect(cloud.ids('rev')).toEqual([])
    expect(cloud.ids('ru')).toEqual([`ru~${SEC2}`])
    expect(cloud.ids('sec')).toEqual([`sec~${SEC}`, `sec~${SEC2}`].sort())
    expect(cloud.docs.get(`sec~${SEC}`)!.rec.f!.done).toBeUndefined()

    // and A, syncing again, sees no resurrection
    await restore(afterA)
    const a2 = await boot('devA')
    await a2.sync(cloud)
    expect(Object.keys(a2.rev.useRevision.getState().units)).toEqual([SEC2])
    expect(a2.study.useStudy.getState().sessions).toEqual({})
    expect(Object.values(a2.st().highlights).filter((h) => !h.deleted)).toHaveLength(2)
    // B after a reload: still clean
    await restore(await (async () => { await restore(parkedB); b = await boot('devB'); await b.sync(cloud); await idle(); return snapshot() })())
    b = await boot('devB')
    expect(b.study.useStudy.getState().sessions).toEqual({})
  })

  it('a stale write that slips through is inert: a record older than its group\'s floor is ignored and overwritten', async () => {
    const cloud = new Cloud()
    const { parkedA } = await pair(cloud)
    await restore(parkedA)
    const a = await boot('devA')
    await a.reset.resetPersonalData('study-history')
    await a.sync(cloud)
    // a device that never learnt of the reset writes straight into the cloud
    cloud.docs.set('ses~old', { rec: { id: 'ses~old', kind: 'ses', t: 1, dev: 'devX', data: { id: 'old', spans: [], durationMs: 9 } }, st: ++cloud.clock })
    cloud.docs.set(`sec~${SEC}`, { rec: { id: `sec~${SEC}`, kind: 'sec', t: now, dev: 'devX', f: { done: { v: true, t: now, d: 'devX' } } }, st: ++cloud.clock })
    await a.sync(cloud)
    expect(a.study.useStudy.getState().sessions).toEqual({})
    expect(a.st().progress.sections[SEC].done).toBeUndefined()
    now += MIN
    a.st().setSection(SEC, { revise: false })
    await a.sync(cloud)
    const rec = cloud.docs.get(`sec~${SEC}`)!.rec
    expect(rec.ep).toBe(1)
    expect(Object.keys(rec.f!).sort()).toEqual(['difficult', 'revise']) // the stale "done" was not merged back in
    expect(rec.f!.revise.v).toBe(false)
  })

  it('a reset made offline is applied here at once and reaches the cloud at the next sync', async () => {
    const cloud = new Cloud()
    const { parkedA, parkedB } = await pair(cloud)
    await restore(parkedA)
    let a = await boot('devA')
    cloud.online = false
    await a.reset.resetPersonalData('full-personal')
    await expect(a.sync(cloud)).rejects.toThrow()
    expect(a.rev.useRevision.getState().units).toEqual({})
    expect(a.st().highlights).toEqual({})
    a.st().setSection(SEC2, { done: true }) // studying after the reset, still offline
    await idle()
    a = await boot('devA') // even across a reload the reset is still waiting
    expect(cloud.epoch()).toBeUndefined()
    expect(cloud.ids('ses').length).toBeGreaterThan(0)
    cloud.online = true
    await a.sync(cloud)
    expect(cloud.epoch()).toMatchObject({ epoch: 1, resetScope: 'full-personal', floors: { study: 1, notes: 1, goals: 1, favourites: 1 } })
    expect(cloud.ids('ses')).toEqual([])
    expect(cloud.ids('hl')).toEqual([])
    expect(cloud.ids('edit')).toEqual([])
    expect(cloud.ids('goal')).toEqual([])
    expect(cloud.ids('exam')).toHaveLength(1) // kept by default
    expect(cloud.ids('ru')).toEqual([`ru~${SEC2}`]) // what was studied after the reset is not lost
    // the other device follows
    await restore(parkedB)
    const b = await boot('devB')
    await b.sync(cloud)
    await idle()
    expect(Object.keys(b.rev.useRevision.getState().units)).toEqual([SEC2])
    expect(b.st().highlights).toEqual({})
    expect(b.st().overrides).toEqual({})
    expect(b.plan.usePlan.getState().goal).toBeNull()
    expect(b.st().prefs.favourites).toEqual([])
    expect(Object.values(b.rev.useRevision.getState().exams)).toHaveLength(1)
  })

  it('a first sign-in is not a stale device: its local data is merged, under the account\'s epoch', async () => {
    const cloud = new Cloud()
    const { parkedA } = await pair(cloud)
    await restore(parkedA)
    const a = await boot('devA')
    await a.reset.resetPersonalData('study-history')
    await a.sync(cloud)
    localStorage.clear()
    await deleteDb()
    const c = await boot('devC') // never signed in before
    c.st().setSection(SEC2, { done: true })
    await c.store.syncLocal.rebind('user-1')
    await c.sync(cloud)
    expect(c.reset.localEpoch().epoch).toBe(1)
    expect(Object.keys(c.rev.useRevision.getState().units)).toEqual([SEC2]) // nothing of its own was dropped
    expect(cloud.docs.get(`ru~${SEC2}`)!.rec.ep).toBe(1)
  })
})
