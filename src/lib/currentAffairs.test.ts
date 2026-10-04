// Current Affairs as the app runs it: the day records and notes with their IndexedDB rows, the
// one global timer, the sync queue, and the real sync engine against a fake cloud with two
// devices — including a reset made while one of them was offline.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentRef, CurrentAffairsDay, StudyContext } from './contract'
import { Cloud, deleteDb, idle, restore, snapshot } from './testkit'

const MIN = 60000
const IST = 'Asia/Kolkata'
/** An instant given as a date and a time of day in India. */
const at = (date: string, time = '10:00') => Date.parse(`${date}T${time}:00+05:30`)
const iso = (date: string, time?: string) => new Date(at(date, time)).toISOString()
let now = at('2026-10-04', '07:30')
const TODAY = '2026-10-04'
const ctx: StudyContext = { ref: { kind: 'chapter', stage: 'prelims', subjectId: 'polity', chapterId: 'parliament' }, subjectTitle: 'Polity', chapterTitle: 'Parliament' }
const ctx2: StudyContext = { ref: { kind: 'chapter', stage: 'prelims', subjectId: 'polity', chapterId: 'judiciary' }, subjectTitle: 'Polity', chapterTitle: 'Judiciary' }
const PARL: ContentRef = { kind: 'chapter', stage: 'prelims', subjectId: 'polity', chapterId: 'parliament' }

async function boot(device?: string) {
  vi.resetModules()
  if (device) localStorage.setItem('upsc-device', device)
  const store = await import('./store')
  const study = await import('./study')
  const plan = await import('./plan')
  const pyq = await import('./pyqState')
  const rev = await import('./revision')
  const ca = await import('./currentAffairs')
  const reset = await import('./reset')
  const model = await import('./currentAffairsModel')
  const analytics = await import('./analytics')
  const { db } = await import('./db')
  const { syncOnce } = await import('../sync/engine')
  for (const m of [study, plan, pyq, rev, ca, reset]) m.clock.now = () => now
  await store.useStore.getState().init()
  await study.initStudy()
  await plan.initPlan()
  await pyq.initPyqState()
  await rev.initRevision()
  // one study calendar for the whole suite, whatever the machine's own timezone is
  if (rev.revisionPrefs().schedulerTimeZone !== IST) rev.setRevisionPrefs({ schedulerTimeZone: IST })
  await ca.initCurrentAffairs()
  await reset.initReset()
  const days = () => ca.useCA.getState().days
  const entries = () => ca.useCA.getState().entries
  const timer = () => study.activeTimer(study.useStudy.getState())
  const sessions = () => Object.values(study.useStudy.getState().sessions)
  const stored = async <T>(name: string) => db.getAll<T>(name)
  const queued = async () => (await db.getAll<{ id: string }>('outbox')).map((o) => o.id).sort()
  const sync = (cloud: Cloud) => syncOnce(cloud, store.syncLocal)
  /** The model the pages show: day records + notes + the completed sessions. */
  const view = () => model.buildModel({ days: days(), entries: entries(), today: ca.caToday(), readMs: analytics.buildIndex(sessions(), IST).caByDay })
  return { store, study, plan, rev, ca, reset, model, analytics, db, days, entries, timer, sessions, stored, queued, sync, view, st: store.useStore.getState }
}

beforeEach(async () => {
  now = at(TODAY, '07:30')
  localStorage.clear()
  await deleteDb()
})

describe('the daily record', () => {
  it('is made lazily by the first act on the day, once — and starting the timer never completes it', async () => {
    const t = await boot()
    expect(t.days()).toEqual({})
    expect(t.ca.todayId()).toBe(TODAY)
    expect(t.ca.startReading()).toBe('started')
    expect(t.days()[TODAY]).toMatchObject({ id: TODAY, date: TODAY, timeZone: IST, status: 'pending', firstStartedAt: iso(TODAY, '07:30') })
    now += 43 * MIN
    t.study.stopTimer()
    now += 60 * MIN
    expect(t.ca.startReading()).toBe('started') // a second sitting on the same day
    now += 5 * MIN
    t.study.stopTimer()
    await idle()
    // one record, still open: only the learner completes a day
    expect(Object.keys(t.days())).toEqual([TODAY])
    expect(t.days()[TODAY]).toMatchObject({ status: 'pending', firstStartedAt: iso(TODAY, '07:30') })
    expect(t.days()[TODAY].completedAt).toBeUndefined()
    expect((await t.stored<CurrentAffairsDay>('currentAffairsDays')).map((d) => [d.id, d.status])).toEqual([[TODAY, 'pending']])
    // the record holds no duration: the time is in the sessions
    expect(Object.keys(t.days()[TODAY]).sort()).toEqual(['createdAt', 'date', 'firstStartedAt', 'id', 'status', 'timeZone', 'updatedAt'])
    expect(t.view().readMs.get(TODAY)).toBe(48 * MIN)
  })

  it('can be completed with no note, no timer and no reading time — nothing is fabricated', async () => {
    const t = await boot()
    const d = t.ca.completeDay()!
    expect(d).toMatchObject({ id: TODAY, status: 'completed', completedAt: iso(TODAY, '07:30') })
    expect(d.firstStartedAt).toBeUndefined()
    expect(t.sessions()).toEqual([])
    expect(t.entries()).toEqual({})
    expect(t.view().readMs.get(TODAY)).toBeUndefined()
    expect(t.model.dayInfo(t.view(), t.ca.caToday())).toMatchObject({ state: 'completed', readMs: 0, notes: [] })
    // completing again changes nothing: the first completion stands
    now += 60 * MIN
    expect(t.ca.completeDay()!.completedAt).toBe(iso(TODAY, '07:30'))
  })

  it('a day left pending becomes missed at the first evaluation after midnight; completing it later is a catch-up', async () => {
    let t = await boot()
    t.ca.startReading()
    now += 10 * MIN
    t.study.stopTimer()
    await idle()
    now = at('2026-10-05', '08:00')
    t = await boot() // the app is opened the next morning
    expect(t.days()[TODAY]).toMatchObject({ status: 'missed', date: TODAY, id: TODAY })
    expect((await t.stored<CurrentAffairsDay>('currentAffairsDays'))[0].status).toBe('missed')
    expect(t.ca.todayId()).toBe('2026-10-05')
    expect(t.model.stateOf(t.view(), t.ca.caToday())).toBe('pending')
    const done = t.ca.completeDay(TODAY)!
    expect(done).toMatchObject({ id: TODAY, date: TODAY, status: 'caught-up', completedAt: iso('2026-10-05', '08:00'), caughtUpAt: iso('2026-10-05', '08:00'), firstStartedAt: iso(TODAY, '07:30') })
    // a caught-up day with no reading on the day it was caught up: its time is what was really read
    expect(t.view().readMs.get(TODAY)).toBe(10 * MIN)
    await idle()
    expect(await t.stored('currentAffairsDays')).toHaveLength(1)
  })

  it('midnight passing while the app is open: the next evaluation marks the day, without a reload', async () => {
    const t = await boot()
    t.ca.startReading()
    now += MIN
    t.study.stopTimer()
    expect(t.ca.settleDays()).toBe(0)
    now = at('2026-10-05', '00:01')
    expect(t.ca.settleDays()).toBe(1)
    expect(t.days()[TODAY].status).toBe('missed')
    expect(t.ca.settleDays()).toBe(0) // and only once
  })

  it('several days away: nothing is created for them, and each can be caught up or excused on its own', async () => {
    let t = await boot()
    t.ca.completeDay()
    await idle()
    now = at('2026-10-09', '09:00')
    t = await boot()
    expect(Object.keys(t.days())).toEqual([TODAY])
    const m = t.view()
    expect(t.model.missedDays(m).map(t.model.dayIdOf)).toEqual(['2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05'])
    t.ca.completeDay('2026-10-08')
    t.ca.excuseDay('2026-10-06')
    expect(t.days()['2026-10-08']).toMatchObject({ status: 'caught-up', date: '2026-10-08' })
    expect(t.days()['2026-10-06']).toMatchObject({ status: 'excused' })
    const s = t.model.caStats(t.view(), t.model.parseDayId(TODAY), t.ca.caToday())
    expect(s).toMatchObject({ elapsed: 6, completed: 1, caughtUp: 1, missed: 2, excused: 1, pending: 1, eligible: 4 })
    expect(s.consistency).toBeCloseTo(2 / 4) // the excused day is left out, not counted as done
  })

  it('Undo reopens a completed or excused day; a future day cannot be acted on', async () => {
    const t = await boot()
    t.ca.completeDay()
    now += MIN
    expect(t.ca.reopenDay(TODAY)).toMatchObject({ status: 'pending', reopenedAt: iso(TODAY, '07:31') })
    expect(t.days()[TODAY].completedAt).toBeUndefined()
    now += MIN
    expect(t.ca.excuseDay(TODAY)).toMatchObject({ status: 'excused' })
    now += MIN
    expect(t.ca.completeDay(TODAY)).toMatchObject({ status: 'completed' }) // a completion overrides the excuse
    expect(t.ca.completeDay('2026-10-05')).toBeNull()
    expect(t.ca.excuseDay('2026-10-05')).toBeNull()
    expect(t.ca.startReading('2026-10-05')).toBe('invalid')
    expect(t.ca.addEntry('2026-10-05', { title: 'x' })).toBeNull()
    expect(t.ca.completeDay('not-a-date')).toBeNull()
    expect(Object.keys(t.days())).toEqual([TODAY])
  })

  it('a change of study timezone rewrites no record: only "today" moves', async () => {
    const t = await boot()
    t.ca.completeDay()
    const before = JSON.stringify(t.days())
    now = at('2026-10-05', '03:00') // still 4 October in New York
    expect(t.ca.todayId()).toBe('2026-10-05')
    t.rev.setRevisionPrefs({ schedulerTimeZone: 'America/New_York' })
    expect(t.ca.todayId()).toBe(TODAY)
    expect(t.ca.settleDays()).toBe(0)
    expect(JSON.stringify(t.days())).toBe(before)
    expect(t.days()[TODAY]).toMatchObject({ status: 'completed', timeZone: IST })
  })
})

describe('the one global timer', () => {
  it('Study → Current Affairs: the same timer and session, switched into a reading span', async () => {
    const t = await boot()
    t.study.startTimer(ctx)
    const id = t.timer()!.sessionId
    now += 20 * MIN
    expect(t.ca.startReading()).toBe('switched')
    expect(t.timer()).toMatchObject({ sessionId: id, state: 'running', currentActivity: { activity: 'current-affairs', currentAffairsDayId: TODAY } })
    now += 30 * MIN
    const s = t.study.stopTimer()!
    expect(t.sessions()).toHaveLength(1)
    expect(s.spans.map((x) => [x.activity ?? 'initial-study', x.currentAffairsDayId ?? null, x.durationMs / MIN])).toEqual([['initial-study', null, 20], ['current-affairs', TODAY, 30]])
    const ix = t.analytics.buildIndex(t.sessions(), IST)
    expect(t.analytics.summarize(ix, -Infinity, Infinity).byActivity).toEqual({ 'initial-study': 20 * MIN, revision: 0, 'current-affairs': 30 * MIN })
    expect(ix.total.get('prelims/polity')).toBe(20 * MIN) // none of the reading went to a subject
  })

  it('a paused timer is resumed by Start Reading; Revision → Current Affairs closes the revision span', async () => {
    const t = await boot()
    t.study.beginRevisionSpan(ctx, { activity: 'revision', revisionUnitId: 'prelims/polity/parliament/budget', revisionEventId: 'e1', revisionOrdinal: 1 })
    now += 6 * MIN
    t.study.pauseTimer()
    now += 30 * MIN
    expect(t.ca.startReading()).toBe('switched')
    expect(t.timer()!.state).toBe('running')
    now += 12 * MIN
    const s = t.study.stopTimer()!
    expect(s.spans.map((x) => [x.activity, x.durationMs / MIN])).toEqual([['revision', 6], ['current-affairs', 12]])
    expect(s.durationMs).toBe(18 * MIN) // the pause is not counted
  })

  it('Current Affairs → Study: opening a chapter with follow on moves the timer back to initial study', async () => {
    const t = await boot()
    t.ca.startReading()
    now += 4 * MIN
    t.study.followContext(ctx2)
    expect(t.timer()!.currentActivity).toBeUndefined()
    now += 3 * MIN
    const s = t.study.stopTimer()!
    expect(s.spans.map((x) => [x.activity ?? 'initial-study', x.durationMs / MIN])).toEqual([['current-affairs', 4], ['initial-study', 3]])
  })

  it('reading started from a note carries the note on the span; the time still belongs to the day', async () => {
    const t = await boot()
    const id = t.ca.addEntry(TODAY, { title: 'RBI policy' })!
    t.ca.startReading(TODAY, id)
    now += 9 * MIN
    const s = t.study.stopTimer()!
    expect(s.spans[0]).toMatchObject({ activity: 'current-affairs', currentAffairsDayId: TODAY, currentAffairsEntryId: id })
    expect(t.view().readMs.get(TODAY)).toBe(9 * MIN)
  })

  it('the timer survives a reload, and a day\'s live reading time is derived from its timestamps', async () => {
    let t = await boot()
    t.ca.startReading()
    now += 7 * MIN
    t.study.pauseTimer()
    now += 20 * MIN
    t.study.resumeTimer()
    await idle()
    now += 3 * MIN
    t = await boot()
    const a = t.timer()!
    expect(a).toMatchObject({ state: 'running', currentActivity: { activity: 'current-affairs', currentAffairsDayId: TODAY } })
    expect(t.study.currentAffairsLiveMs(a, TODAY)).toBe(10 * MIN)
    expect(t.study.currentAffairsLiveMs(a, '2026-10-03')).toBe(0)
    expect(t.ca.readingNow(a)).toMatchObject({ currentAffairsDayId: TODAY })
    // nothing is in the analytics until the timer is stopped
    expect(t.view().readMs.get(TODAY)).toBeUndefined()
  })

  it('a timer that runs past midnight keeps its news day; the calendar cuts it at midnight', async () => {
    const t = await boot()
    now = at(TODAY, '23:40')
    t.ca.startReading()
    now = at('2026-10-05', '00:25')
    const s = t.study.stopTimer()!
    expect(s.spans.map((x) => x.currentAffairsDayId)).toEqual([TODAY])
    const ix = t.analytics.buildIndex(t.sessions(), IST)
    expect(t.analytics.heatmap(ix, t.model.parseDayId(TODAY), t.model.parseDayId('2026-10-05')).map((d) => d.durationMs / MIN)).toEqual([20, 25])
    expect(ix.caByDay.get(TODAY)).toBe(45 * MIN)
    // the new day has its own record only once it is acted on
    expect(t.ca.todayId()).toBe('2026-10-05')
    expect(Object.keys(t.days())).toEqual([TODAY])
  })

  it('catching up a missed day is timed against that day, on the day it is read', async () => {
    let t = await boot()
    t.ca.completeDay('2026-10-04')
    await idle()
    now = at('2026-10-06', '18:00')
    t = await boot()
    expect(t.ca.startReading('2026-10-05')).toBe('started')
    now += 15 * MIN
    t.study.stopTimer()
    expect(t.days()['2026-10-05']).toMatchObject({ status: 'missed', firstStartedAt: iso('2026-10-06', '18:00') })
    const ix = t.analytics.buildIndex(t.sessions(), IST)
    expect(ix.caByDay.get('2026-10-05')).toBe(15 * MIN)
    expect(t.analytics.heatmap(ix, t.model.parseDayId('2026-10-05'), t.model.parseDayId('2026-10-06')).map((d) => d.durationMs / MIN)).toEqual([0, 15])
  })
})

describe('notes', () => {
  it('create, edit and delete: the entry, its text in the reader\'s edit store, and no day record', async () => {
    const t = await boot()
    const id = t.ca.addEntry(TODAY, { title: '  RBI   keeps repo rate  ', sourceName: 'The Hindu', sourceUrl: 'thehindu.com/business/rbi', tags: 'Economy, #RBI, rbi' })!
    expect(t.entries()[id]).toMatchObject({ id, dayId: TODAY, title: 'RBI keeps repo rate', sourceName: 'The Hindu', sourceUrl: 'https://thehindu.com/business/rbi', tags: ['Economy', 'RBI'], noteDocumentId: `ca/${id}`, linkedContentRefs: [] })
    expect(t.days()).toEqual({}) // a note does not complete, start or even create the day
    t.ca.saveNoteBody(id, '<p>Repo rate held at <strong>5.5%</strong>.</p>', true)
    await idle(80)
    expect(t.ca.noteBody(t.st().overrides, id)).toBe('<p>Repo rate held at <strong>5.5%</strong>.</p>')
    expect((await t.stored<{ key: string }>('overrides')).map((o) => o.key)).toEqual([`ca/${id}`])
    expect(await t.queued()).toEqual(expect.arrayContaining([`cae~${id}`, `edit~ca/${id}`]))

    now += MIN
    t.ca.updateEntry(id, { title: 'RBI holds the repo rate', tags: ['Economy', 'Monetary policy'], linkedContentRefs: [PARL, PARL] })
    expect(t.entries()[id]).toMatchObject({ title: 'RBI holds the repo rate', tags: ['Economy', 'Monetary policy'], linkedContentRefs: [PARL], updatedAt: new Date(now).toISOString() })
    const before = t.entries()[id].updatedAt
    now += MIN
    t.ca.updateEntry(id, { title: 'RBI holds the repo rate' }) // nothing changed: nothing written
    expect(t.entries()[id].updatedAt).toBe(before)

    await t.ca.removeEntry(id)
    await idle(80)
    expect(t.entries()[id].removed).toBe(true)
    expect(t.model.liveEntries(t.entries())).toEqual([])
    expect(t.st().overrides[`ca/${id}`]).toBeUndefined()
    expect(await t.stored('overrides')).toEqual([])
  })

  it('a source link is optional; one that is edited is replaced, and what is not a web address is not kept', async () => {
    const t = await boot()
    const id = t.ca.addEntry(TODAY, { title: 'No source' })!
    expect(t.entries()[id].sourceUrl).toBeUndefined()
    expect(t.entries()[id].sourceName).toBeUndefined()
    t.ca.updateEntry(id, { sourceUrl: 'https://pib.gov.in/a' })
    expect(t.entries()[id].sourceUrl).toBe('https://pib.gov.in/a')
    t.ca.updateEntry(id, { sourceUrl: 'https://pib.gov.in/b' })
    expect(t.entries()[id].sourceUrl).toBe('https://pib.gov.in/b')
    t.ca.updateEntry(id, { sourceUrl: 'javascript:alert(1)' })
    expect(t.entries()[id].sourceUrl).toBeUndefined()
    t.ca.updateEntry(id, { sourceUrl: '' })
    expect(t.entries()[id].sourceUrl).toBeUndefined()
  })

  it('search finds a note by title, text, tag, source and linked destination — and days by date', async () => {
    const t = await boot()
    const { searchAll, searchCaNotes, searchCaPlaces } = await import('./search')
    const nav = await import('./nav')
    const a = t.ca.addEntry(TODAY, { title: 'Monetary Policy Committee meets', sourceName: 'Business Standard', tags: 'Economy, RBI', linkedContentRefs: [PARL] })!
    const b = t.ca.addEntry('2026-10-03', { title: 'Cyclone warning' })!
    t.ca.saveNoteBody(b, '<p>IMD issued an orange alert for the Odisha coast.</p>', true)
    const gone = t.ca.addEntry(TODAY, { title: 'Monetary nonsense' })!
    await t.ca.removeEntry(gone)
    t.ca.completeDay('2026-10-03')
    const m = t.view()
    const src = { entries: t.model.liveEntries(t.entries()), today: t.ca.caToday(), body: (id: string) => t.ca.noteBody(t.st().overrides, id), state: (dn: number) => t.model.stateOf(m, dn), linkTitle: (r: ContentRef) => nav.navNode(nav.refKey(r))?.title }
    const ids = (q: string) => searchCaNotes(q, src).map((h) => h.to)
    const { href } = await import('./router')
    expect(ids('monetary policy')).toEqual([href.caNote(a)]) // title; the deleted note is not found
    expect(ids('rbi')).toEqual([href.caNote(a)]) // tag
    expect(ids('business standard')).toEqual([href.caNote(a)]) // source
    expect(ids('parliament')).toEqual([href.caNote(a)]) // the linked destination's title
    const text = searchCaNotes('orange alert', src)
    expect(text.map((h) => h.to)).toEqual([href.caNote(b)])
    expect(text[0]).toMatchObject({ kind: 'ca-note', title: 'Cyclone warning' })
    expect(text[0].snippet).toContain('orange alert')
    expect(text[0].score).toBeLessThan(60)
    expect(ids('thehindu.com')).toEqual([]) // links are not indexed

    expect(searchCaPlaces('3 oct', src)[0]).toMatchObject({ kind: 'ca-day', to: href.caDay('2026-10-03'), sub: 'Current Affairs · Caught up · 1 note' })
    expect(searchCaPlaces('2026-10-04', src)[0]).toMatchObject({ kind: 'ca-day', to: href.caDay(TODAY), sub: 'Current Affairs · Not completed · 1 note' })
    expect(searchCaPlaces('5 oct 2026', src)).toEqual([]) // not yet
    expect(searchCaPlaces('current affairs', src).map((h) => h.to)).toEqual([href.currentAffairs(), href.currentAffairs('calendar'), href.currentAffairs('notes'), href.currentAffairs('archive')])
    expect(searchCaPlaces('archive', src).map((h) => h.to)).toEqual([href.currentAffairs('archive')])
    expect(searchCaPlaces('money bill', src)).toEqual([])

    // in the palette: every result says what it is, and the study notes are still there
    const all = searchAll('parliament', t.st().overrides, src)
    expect(all.some((h) => h.kind === 'ca-note' && h.to === href.caNote(a))).toBe(true)
    expect(all.some((h) => h.kind === 'chapter' && h.chapter?.id === 'parliament')).toBe(true)
    expect(searchAll('parliament', t.st().overrides).some((h) => h.kind.startsWith('ca'))).toBe(false)
  })

  it('backlinks: the notes linking to a chapter or its sections, derived from the notes alone', async () => {
    const t = await boot()
    const sec: ContentRef = { ...PARL, kind: 'section', sectionId: 'presiding-officers' }
    const a = t.ca.addEntry(TODAY, { title: 'Budget session dates', linkedContentRefs: [sec] })!
    t.ca.addEntry(TODAY, { title: 'Unrelated' })
    expect(t.model.notesLinking(t.entries(), ['prelims/polity/parliament', 'prelims/polity/parliament/presiding-officers']).map((e) => e.id)).toEqual([a])
    // a place that is no longer in the library keeps its ref; nothing is rewritten
    t.ca.updateEntry(a, { linkedContentRefs: [sec, { kind: 'chapter', stage: 'prelims', subjectId: 'polity', chapterId: 'renamed-away' }] })
    expect(t.entries()[a].linkedContentRefs).toHaveLength(2)
    const nav = await import('./nav')
    expect(nav.destinations(t.entries()[a].linkedContentRefs).map((d) => d.id)).toEqual(['prelims/polity/parliament/presiding-officers'])
  })

  it('a note enters spaced revision only when asked: "Add to Revision" makes one unit in the Job 5.5 scheduler', async () => {
    const t = await boot()
    const id = t.ca.addEntry(TODAY, { title: 'RBI policy' })!
    t.ca.saveNoteBody(id, '<p><strong>Repo rate</strong> — 5.5%</p>', true)
    t.ca.completeDay()
    expect(t.rev.useRevision.getState().units).toEqual({}) // never automatic
    const u = t.rev.enrolNote(id, TODAY, 'RBI policy')!
    expect(u).toMatchObject({ id: `ca/${id}`, status: 'new', dueDate: '2026-10-05', revisionCount: 0, title: 'RBI policy', target: { kind: 'current-affairs', dayId: TODAY, entryId: id } })
    expect(t.rev.enrolNote(id, TODAY, 'RBI policy')).toEqual(u) // never a second unit
    expect(Object.keys(t.rev.useRevision.getState().units)).toEqual([`ca/${id}`])

    // it is revised like any unit, in a revision span of the same timer
    now = at('2026-10-05', '09:00')
    const { buildQueue, unitSubjectKey } = await import('./revisionModel')
    const q = buildQueue({ units: Object.values(t.rev.useRevision.getState().units), events: [], today: t.ca.caToday(), tz: IST })
    expect(q.todayList.map((i) => [i.unit.id, i.subjectKey, i.chapterKey, i.ordinal])).toEqual([[`ca/${id}`, 'current-affairs', `current-affairs/${TODAY}`, 1]])
    expect(unitSubjectKey(`ca/${id}`)).toBe('current-affairs')
    const eventId = t.rev.newRevisionEventId()
    t.study.beginRevisionSpan(t.model.caNoteContext(TODAY, id, 'RBI policy'), { activity: 'revision', revisionUnitId: `ca/${id}`, revisionEventId: eventId, revisionOrdinal: 1 })
    now += 4 * MIN
    t.rev.recordAttempt({ recallUnitId: 'r1', contentHash: 'h', unitId: `ca/${id}`, eventId, outcome: 'knew' })
    const e = t.rev.completeRevision({ unitId: `ca/${id}`, grade: 'good', eventId, startedAt: new Date(now).toISOString(), durationMs: 4 * MIN })!
    const s = t.study.stopTimer()!
    expect(e).toMatchObject({ ordinal: 1, revisionUnitId: `ca/${id}`, target: { kind: 'current-affairs', entryId: id } })
    expect(Object.values(t.rev.useRevision.getState().attempts)[0].target).toMatchObject({ kind: 'current-affairs', entryId: id })
    expect(s.spans[0]).toMatchObject({ activity: 'revision', revisionOrdinal: 1 })
    const sum = t.analytics.summarize(t.analytics.buildIndex(t.sessions(), IST), -Infinity, Infinity)
    expect(sum.byActivity).toEqual({ 'initial-study': 0, revision: 4 * MIN, 'current-affairs': 0 })
    expect(sum.bySubject).toEqual([])

    // deleting the note sets its unit aside; the completed revision stays as history
    await t.ca.removeEntry(id)
    expect(t.rev.useRevision.getState().units[`ca/${id}`].status).toBe('suspended')
    expect(Object.keys(t.rev.useRevision.getState().events)).toEqual([eventId])
  })
})

describe('two devices', () => {
  /** Device A used, synced, parked; device B signed in to the same account and in sync. */
  async function pair(cloud: Cloud, use: (a: Awaited<ReturnType<typeof boot>>) => void | Promise<void>) {
    const a = await boot('devA')
    await a.store.syncLocal.rebind('user-1')
    await use(a)
    await idle(80)
    await a.sync(cloud)
    await idle()
    const parkedA = await snapshot()
    localStorage.clear()
    await deleteDb()
    const b = await boot('devB')
    await b.store.syncLocal.rebind('user-1')
    await b.sync(cloud)
    await idle()
    return { parkedA, parkedB: await snapshot() }
  }

  it('days, notes and their text reach the other device; each is one cloud record', async () => {
    const cloud = new Cloud()
    let noteId = ''
    await pair(cloud, (a) => {
      a.ca.startReading()
      now += 30 * MIN
      a.study.stopTimer()
      noteId = a.ca.addEntry(TODAY, { title: 'RBI policy', tags: 'Economy', linkedContentRefs: [PARL] })!
      a.ca.saveNoteBody(noteId, '<p>held</p>', true)
      a.ca.completeDay()
    })
    expect(cloud.ids('cad')).toEqual([`cad~${TODAY}`])
    expect(cloud.ids('cae')).toEqual([`cae~${noteId}`])
    expect(cloud.ids('edit')).toEqual([`edit~ca/${noteId}`])
    expect(cloud.docs.get(`cad~${TODAY}`)!.rec.data).toMatchObject({ status: 'completed', date: TODAY })
    expect(JSON.stringify(cloud.docs.get(`cad~${TODAY}`)!.rec)).not.toMatch(/duration|Ms"/) // no time on the day, anywhere
    const b = await boot('devB')
    expect(b.days()[TODAY]).toMatchObject({ status: 'completed', firstStartedAt: iso(TODAY, '07:30') })
    expect(b.entries()[noteId]).toMatchObject({ title: 'RBI policy', tags: ['Economy'], linkedContentRefs: [PARL], dayId: TODAY })
    expect(b.ca.noteBody(b.st().overrides, noteId)).toBe('<p>held</p>')
    expect(b.view().readMs.get(TODAY)).toBe(30 * MIN) // derived on B from the synced session
    expect(await b.queued()).not.toEqual(expect.arrayContaining([`cad~${TODAY}`]))
  })

  it('offline: a note, its text and a completion are kept locally, queued, and sent when the network returns', async () => {
    const cloud = new Cloud()
    const a = await boot('devA')
    await a.store.syncLocal.rebind('user-1')
    await a.sync(cloud)
    cloud.online = false
    const id = a.ca.addEntry(TODAY, { title: 'Written offline' })!
    a.ca.saveNoteBody(id, '<p>offline text</p>', true)
    a.ca.completeDay()
    await idle(80)
    await expect(a.sync(cloud)).rejects.toThrow()
    expect(a.days()[TODAY].status).toBe('completed') // nothing waited on the network
    expect(await a.queued()).toEqual(expect.arrayContaining([`cad~${TODAY}`, `cae~${id}`, `edit~ca/${id}`]))
    const again = await boot('devA') // and it survives a reload while still offline
    expect(again.days()[TODAY].status).toBe('completed')
    expect(again.entries()[id].title).toBe('Written offline')
    cloud.online = true
    await again.sync(cloud)
    expect(cloud.ids('cad')).toEqual([`cad~${TODAY}`])
    expect(cloud.ids('cae')).toEqual([`cae~${id}`])
    expect(cloud.ids('edit')).toEqual([`edit~ca/${id}`])
    expect((await again.queued()).filter((x) => /^(cad|cae|edit)~/.test(x))).toEqual([])
  })

  it('the same day completed on both devices while apart: completed once, at the first moment, on both', async () => {
    const cloud = new Cloud()
    const { parkedA, parkedB } = await pair(cloud, (a) => void a.ca.startReading())
    // A completes the day on the day itself
    await restore(parkedA)
    let a = await boot('devA')
    now = at(TODAY, '20:00')
    a.study.stopTimer()
    a.ca.completeDay()
    await a.sync(cloud)
    await idle()
    const afterA = await snapshot()
    // B was offline: the next morning it finds the day missed and catches it up
    await restore(parkedB)
    now = at('2026-10-05', '09:00')
    const b = await boot('devB')
    expect(b.days()[TODAY].status).toBe('missed')
    expect(b.ca.completeDay(TODAY)).toMatchObject({ status: 'caught-up' })
    await b.sync(cloud)
    await idle()
    expect(b.days()[TODAY]).toMatchObject({ status: 'completed', completedAt: iso(TODAY, '20:00') })
    expect(b.days()[TODAY].caughtUpAt).toBeUndefined()
    expect(cloud.docs.get(`cad~${TODAY}`)!.rec.data).toMatchObject({ status: 'completed', completedAt: iso(TODAY, '20:00') })
    expect(cloud.ids('cad')).toEqual([`cad~${TODAY}`]) // still one record for the day
    await restore(afterA)
    a = await boot('devA')
    await a.sync(cloud)
    expect(a.days()[TODAY]).toMatchObject({ status: 'completed', completedAt: iso(TODAY, '20:00') })
    expect(JSON.stringify(a.days()[TODAY])).toBe(JSON.stringify(cloud.docs.get(`cad~${TODAY}`)!.rec.data))
  })

  it('a note edited on two devices: fields changed on each both survive', async () => {
    const cloud = new Cloud()
    let id = ''
    const { parkedA, parkedB } = await pair(cloud, (a) => void (id = a.ca.addEntry(TODAY, { title: 'Draft', tags: 'x' })!))
    await restore(parkedA)
    const a = await boot('devA')
    now += MIN
    a.ca.updateEntry(id, { title: 'Final title' })
    await a.sync(cloud)
    await restore(parkedB)
    const b = await boot('devB')
    now += MIN
    b.ca.updateEntry(id, { tags: 'Economy', sourceName: 'PIB' })
    await b.sync(cloud)
    expect(b.entries()[id]).toMatchObject({ title: 'Final title', tags: ['Economy'], sourceName: 'PIB' })
    expect(cloud.ids('cae')).toEqual([`cae~${id}`])
  })

  it('a deleted note is deleted on the other device too, with its text', async () => {
    const cloud = new Cloud()
    let id = ''
    const { parkedA, parkedB } = await pair(cloud, (a) => {
      id = a.ca.addEntry(TODAY, { title: 'To delete' })!
      a.ca.saveNoteBody(id, '<p>text</p>', true)
    })
    await restore(parkedA)
    const a = await boot('devA')
    await a.ca.removeEntry(id)
    await idle(80)
    await a.sync(cloud)
    await restore(parkedB)
    const b = await boot('devB')
    expect(b.ca.noteBody(b.st().overrides, id)).toBe('<p>text</p>')
    await b.sync(cloud)
    expect(b.entries()[id].removed).toBe(true)
    expect(b.model.liveEntries(b.entries())).toEqual([])
    expect(b.ca.noteBody(b.st().overrides, id)).toBe('')
  })

  it('a timer owned by another device is left alone; "Continue here" takes it over into a reading span', async () => {
    const cloud = new Cloud()
    const { parkedB } = await pair(cloud, (a) => void a.study.startTimer(ctx))
    await restore(parkedB)
    const b = await boot('devB')
    const theirs = b.timer()!
    expect(theirs.ownerDeviceId).toBe('devA')
    now += 10 * MIN
    expect(b.ca.startReading()).toBe('remote')
    expect(b.timer()).toMatchObject({ ownerDeviceId: 'devA', revision: theirs.revision }) // untouched
    expect(b.days()).toEqual({}) // and nothing was recorded as started here
    b.ca.continueReadingHere()
    expect(b.timer()).toMatchObject({ sessionId: theirs.sessionId, ownerDeviceId: 'devB', state: 'running', currentActivity: { activity: 'current-affairs', currentAffairsDayId: TODAY } })
    expect(b.days()[TODAY].firstStartedAt).toBe(new Date(now).toISOString())
    now += 20 * MIN
    const s = b.study.stopTimer()!
    expect(s.spans.map((x) => [x.activity ?? 'initial-study', x.durationMs / MIN])).toEqual([['initial-study', 10], ['current-affairs', 20]])
    await b.sync(cloud)
    expect(cloud.ids('ses')).toEqual([`ses~${theirs.sessionId}`]) // one session, not two
  })
})

describe('reset', () => {
  const use = (t: Awaited<ReturnType<typeof boot>>) => {
    t.ca.startReading()
    now += 25 * MIN
    t.study.stopTimer()
    const id = t.ca.addEntry(TODAY, { title: 'Kept note', sourceName: 'PIB', sourceUrl: 'https://pib.gov.in/x', tags: 'Economy', linkedContentRefs: [PARL] })!
    t.ca.saveNoteBody(id, '<p>my words</p>', true)
    t.rev.enrolNote(id, TODAY, 'Kept note')
    t.ca.completeDay()
    t.ca.excuseDay('2026-10-03')
    return id
  }

  it('Reset Study History clears the day record and every reading session, and keeps the notes', async () => {
    let t = await boot()
    const id = use(t)
    await idle(80)
    expect(t.view().readMs.get(TODAY)).toBe(25 * MIN)
    expect(t.model.caStreak(t.view()).currentDays).toBe(1)
    expect(await t.reset.resetPersonalData('study-history')).toEqual(['study'])
    await idle(80)
    expect(t.days()).toEqual({})
    expect(await t.stored('currentAffairsDays')).toEqual([])
    expect(await t.stored('studySessions')).toEqual([])
    expect(t.rev.useRevision.getState().units).toEqual({}) // revision schedules are study history
    // derived state is gone with it: no completion, no missed day, no streak, no time
    const m = t.view()
    expect(m.start).toBeNull()
    expect(t.model.dayInfo(m, t.ca.caToday())).toMatchObject({ state: 'pending', readMs: 0 })
    expect(t.model.stateOf(m, t.ca.caToday() - 1)).toBe('none')
    expect(t.model.caStreak(m)).toEqual({ currentDays: 0, longestDays: 0 })
    // the notes are the learner's own writing: kept, with text, source, tags and links
    expect(t.entries()[id]).toMatchObject({ title: 'Kept note', sourceName: 'PIB', sourceUrl: 'https://pib.gov.in/x', tags: ['Economy'], linkedContentRefs: [PARL] })
    expect(t.ca.noteBody(t.st().overrides, id)).toBe('<p>my words</p>')
    expect(t.model.dayInfo(m, t.ca.caToday()).notes.map((e) => e.id)).toEqual([id])
    expect((await t.queued()).filter((x) => x.startsWith('cad~') || x.startsWith('ses~'))).toEqual([])
    t = await boot() // and after a reload
    expect(t.days()).toEqual({})
    expect(t.entries()[id].title).toBe('Kept note')
    // study starts cleanly afterwards
    t.ca.completeDay()
    expect(t.view().start).toBe(t.ca.caToday())
  })

  it('Full Personal Reset also removes the notes: entries, text, tags, source links and linked refs', async () => {
    const t = await boot()
    const id = use(t)
    await idle(80)
    await t.reset.resetPersonalData('full-personal')
    await idle(80)
    expect(t.days()).toEqual({})
    expect(t.entries()).toEqual({})
    expect(await t.stored('currentAffairsEntries')).toEqual([])
    expect(await t.stored('currentAffairsDays')).toEqual([])
    expect(await t.stored('overrides')).toEqual([])
    expect(t.ca.noteBody(t.st().overrides, id)).toBe('')
    expect((await t.queued()).filter((x) => /^(cad|cae|ses)~|^edit~ca\//.test(x))).toEqual([])
    // the library is not personal data
    const content = await import('./content')
    expect(content.allSubjects().length).toBeGreaterThan(0)
    expect(content.pyqIndex().records.length).toBeGreaterThan(0)
  })

  it('a device that was offline through a Study History reset cannot bring the old days or reading time back', async () => {
    const cloud = new Cloud()
    const a0 = await boot('devA')
    await a0.store.syncLocal.rebind('user-1')
    const id = use(a0)
    await idle(80)
    await a0.sync(cloud)
    await idle()
    const parkedA = await snapshot()
    localStorage.clear()
    await deleteDb()
    const b0 = await boot('devB')
    await b0.store.syncLocal.rebind('user-1')
    await b0.sync(cloud)
    await idle()
    expect(b0.days()[TODAY].status).toBe('completed')
    const parkedB = await snapshot()

    await restore(parkedA)
    const a = await boot('devA')
    await a.reset.resetPersonalData('study-history')
    await a.sync(cloud)
    await idle()
    expect(cloud.ids('cad')).toEqual([])
    expect(cloud.ids('ses')).toEqual([])
    expect(cloud.ids('cae')).toEqual([`cae~${id}`]) // the notes stay in the cloud too
    expect(cloud.ids('edit')).toEqual([`edit~ca/${id}`])
    const afterA = await snapshot()

    // B, still offline, goes on: another day read and completed, a missed day caught up, a new note
    await restore(parkedB)
    now = at('2026-10-05', '08:00')
    const b = await boot('devB')
    b.ca.startReading()
    now += 10 * MIN
    b.study.stopTimer()
    b.ca.completeDay()
    const fresh = b.ca.addEntry('2026-10-05', { title: 'Written while offline' })!
    await idle(80)
    expect((await b.queued()).some((x) => x.startsWith('cad~'))).toBe(true)
    await b.sync(cloud)
    await idle(80)
    // the stale study state is dropped here and never uploaded …
    expect(b.reset.localEpoch()).toMatchObject({ epoch: 1, floors: { study: 1 } })
    expect(b.days()).toEqual({})
    expect(b.sessions()).toEqual([])
    expect(cloud.ids('cad')).toEqual([])
    expect(cloud.ids('ses')).toEqual([])
    expect((await b.queued()).filter((x) => /^(cad|ses)~/.test(x))).toEqual([])
    // … while the notes, which the reset did not cover, sync as usual
    expect(b.entries()[id].title).toBe('Kept note')
    expect(cloud.ids('cae')).toEqual([`cae~${fresh}`, `cae~${id}`].sort())
    // and nothing is resurrected on the device that reset
    await restore(afterA)
    const a2 = await boot('devA')
    await a2.sync(cloud)
    expect(a2.days()).toEqual({})
    expect(a2.sessions()).toEqual([])
    expect(a2.entries()[fresh].title).toBe('Written while offline')
    // Current Affairs after the reset is written under the new epoch
    a2.ca.completeDay()
    await a2.sync(cloud)
    expect(cloud.docs.get(`cad~${a2.ca.todayId()}`)!.rec.ep).toBe(1)
  })

  it('a reset made offline holds: after a Full Personal Reset a stale device drops its notes instead of restoring them', async () => {
    const cloud = new Cloud()
    const a0 = await boot('devA')
    await a0.store.syncLocal.rebind('user-1')
    const id = use(a0)
    await idle(80)
    await a0.sync(cloud)
    await idle()
    const parkedA = await snapshot()
    localStorage.clear()
    await deleteDb()
    const b0 = await boot('devB')
    await b0.store.syncLocal.rebind('user-1')
    await b0.sync(cloud)
    await idle()
    const parkedB = await snapshot()

    await restore(parkedA)
    const a = await boot('devA')
    cloud.online = false
    await a.reset.resetPersonalData('full-personal')
    await expect(a.sync(cloud)).rejects.toThrow()
    expect(a.entries()).toEqual({}) // gone here at once, offline or not
    expect(cloud.ids('cae')).toEqual([`cae~${id}`])
    cloud.online = true
    await a.sync(cloud)
    expect(cloud.ids('cae')).toEqual([])
    expect(cloud.ids('cad')).toEqual([])
    expect(cloud.ids('edit')).toEqual([])

    await restore(parkedB)
    const b = await boot('devB')
    now += MIN
    b.ca.updateEntry(id, { title: 'Edited on the stale device' })
    b.ca.saveNoteBody(id, '<p>stale text</p>', true)
    await idle(80)
    await b.sync(cloud)
    await idle(80)
    expect(b.entries()).toEqual({})
    expect(b.days()).toEqual({})
    expect(b.ca.noteBody(b.st().overrides, id)).toBe('')
    expect(cloud.ids('cae')).toEqual([])
    expect(cloud.ids('edit')).toEqual([])
    expect(cloud.ids('cad')).toEqual([])
  })
})
