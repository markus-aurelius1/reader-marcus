// Revision: Today · Overdue · Upcoming · Calendar · Manual, and the Guided Revision of one unit.
// Everything listed here is lib/revisionModel.ts's view of the RevisionUnits and RevisionEvents,
// built on each render. The page stores nothing of its own and never changes a due date except
// through the two deliberate actions: completing a revision, and "Defer today".
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { linkIndex, stageTitle, type Subject } from '../lib/content'
import { relatedPyqs } from '../lib/links'
import { secHtml, secTitle, useStore } from '../lib/store'
import { REVISION_TABS, go, href, type RevisionTab } from '../lib/router'
import { navNode, studyContext } from '../lib/nav'
import { civil, dateKey, dayNo, dayOf, dayText } from '../lib/analytics'
import type { RecallOutcome, RevisionEvent, RevisionGrade, SpanActivity, StudyContext } from '../lib/contract'
import { GRADES, parseDay } from '../lib/scheduler'
import { byChapter, calendarMonth, daySummary, examDateText, horizonOf, liveExams, monthOf, primaryExam, workloadMs, buildQueue, type CalendarDay, type Queue, type QueueItem } from '../lib/revisionModel'
import { clock, completeRevision, deferUnit, newRevisionEventId, prefsOf, recordAttempt, useRevision } from '../lib/revision'
import { TARGET_BLANK, annotate, promptOf, selectPrompts, type RecallItem } from '../lib/recall'
import { activeTimer, beginRevisionSpan, continueHere, ownsTimer, pauseTimer, revisionSpanMs, stopTimer, useStudy } from '../lib/study'
import { durationText } from '../lib/timer'
import { linked } from '../sync'
import { ManualRevision, plural, useData } from './Insights'
import { locate } from './Pages'
import { noteBody, useCA } from '../lib/currentAffairs'
import { caNoteContext, dayFull, isDayId, parseDayId } from '../lib/currentAffairsModel'

export const REVISION_TAB_LABEL: Record<RevisionTab, string> = { today: 'Today', overdue: 'Overdue', upcoming: 'Upcoming', calendar: 'Calendar', manual: 'Manual' }
const GRADE_LABEL: Record<RevisionGrade, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' }
const GRADE_HINT: Record<RevisionGrade, string> = { again: 'Could not recall it', hard: 'Recalled with effort', good: 'Recalled', easy: 'Recalled at once' }

/** ~54 min */
export const estText = (ms: number) => `~${Math.max(1, Math.round(ms / 60000))} min`
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** 12 Oct */
export const shortDay = (dn: number) => `${civil(dn).d} ${MON[civil(dn).m - 1]}`
/** Tomorrow · in 5 days · 12 Oct */
export const whenText = (dn: number, today: number) => (dn === today ? 'Today' : dn === today + 1 ? 'Tomorrow' : dn > today && dn <= today + 14 ? `in ${dn - today} days` : shortDay(dn))
/**
 * The current title of a subject, chapter or section. A Current Affairs note in revision
 * ("ca/<entryId>") is not in the library: it is listed under Current Affairs, by its news day.
 */
const titleOf = (id: string, fallback: string) => {
  const node = navNode(id)
  if (node) return node.title
  if (id === 'current-affairs') return 'Current Affairs'
  if (id.startsWith('current-affairs/') && isDayId(id.slice(16))) return dayFull(parseDayId(id.slice(16)))
  if (id.startsWith('ca/')) return useCA.getState().entries[id.slice(3)]?.title || fallback
  return fallback
}
/** Where a unit's notes are read. */
const notesHref = (unitId: string) => {
  if (unitId.startsWith('ca/')) return href.caNote(unitId.slice(3))
  const [stage, subject, chapter, section] = unitId.split('/')
  return href.reader(`${stage}/${subject}/${chapter}`, section)
}

// ---- the queue, as the pages see it --------------------------------------------------------
const pyqCache = new Map<string, boolean>()
const hasPyq = (key: string) => {
  let v = pyqCache.get(key)
  if (v === undefined) pyqCache.set(key, (v = relatedPyqs(linkIndex(), [key]).length > 0))
  return v
}

/** The revision queue for now: rebuilt when the units change and as the day moves on. */
export function useRevisionQueue() {
  const units = useRevision((s) => s.units)
  const events = useRevision((s) => s.events)
  const exams = useRevision((s) => s.exams)
  const row = useRevision((s) => s.prefs)
  const difficult = useStore((s) => s.progress.sections)
  const { now } = useData()
  const prefs = useMemo(() => prefsOf(row), [row])
  const tz = prefs.schedulerTimeZone
  const queue = useMemo(() => {
    const today = dayOf(now, tz)
    return buildQueue({
      units: Object.values(units), events: Object.values(events), today, tz,
      exam: prefs.examAwareScheduling ? horizonOf(primaryExam(exams), today) : null,
      flags: (id) => ({ difficult: !!difficult[id]?.difficult, pyq: hasPyq(id) }),
    })
  }, [units, events, exams, prefs, difficult, now, tz])
  return { queue, prefs, tz, exams, events }
}

// ---- a run of revisions ("Start Revision") ---------------------------------------------------
// Which units are still to come, and the one in progress — so that a reload returns to it.
// A convenience of this browser only; nothing here is study data.
const RUN = 'upsc-revision-run'
interface Run {
  queue: string[]
  /** The timer was started by this run, so the run stops it when it ends. */
  ownTimer?: boolean
  current?: { unitId: string; eventId: string; startedAt: string }
}
const readRun = (): Run => {
  try {
    return { queue: [], ...JSON.parse(localStorage.getItem(RUN) || '{}') }
  } catch {
    return { queue: [] }
  }
}
const writeRun = (r: Run | null) => {
  try {
    if (r) localStorage.setItem(RUN, JSON.stringify(r))
    else localStorage.removeItem(RUN)
  } catch {
    /* storage unavailable: no resume after a reload */
  }
}
export function startRun(ids: string[]) {
  if (!ids.length) return
  const prev = readRun()
  // a revision already in progress on the first unit is carried on, not restarted
  writeRun({ queue: ids, ownTimer: prev.ownTimer, current: prev.current?.unitId === ids[0] ? prev.current : undefined })
  go(href.revise(ids[0]))
}

// ---- page -----------------------------------------------------------------------------------------
export function RevisionPage({ subjects, tab }: { subjects: Subject[]; tab: RevisionTab }) {
  const ready = useRevision((s) => s.ready)
  const data = useData()
  const { queue, tz, exams, events } = useRevisionQueue()
  return (
    <div className="page wide revision">
      <div className="eyebrow">Spaced by how well you remember</div>
      <h1 className="title">Revision</h1>
      <nav className="tabs" aria-label="Revision">
        {REVISION_TABS.map((t) => (
          <a key={t} className={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} href={href.revision(t)}>
            {REVISION_TAB_LABEL[t]}{t === 'overdue' && queue.overdue.length > 0 && <small className="tabn">{queue.overdue.length}</small>}
          </a>
        ))}
        <a className="tab-out" href={href.insights('revision')}>Analytics →</a>
      </nav>
      {!ready ? null : tab === 'manual' ? (
        <ManualRevision {...data} subjects={subjects} />
      ) : tab === 'calendar' ? (
        <CalendarTab queue={queue} events={Object.values(events)} exams={liveExams(exams)} tz={tz} />
      ) : queue.items.length === 0 && queue.completedToday.length === 0 ? (
        <Empty />
      ) : tab === 'overdue' ? (
        <OverdueTab queue={queue} />
      ) : tab === 'upcoming' ? (
        <UpcomingTab queue={queue} />
      ) : (
        <TodayTab queue={queue} />
      )}
    </div>
  )
}

function Empty() {
  return (
    <div className="shell-note nodata">
      <b>Nothing is scheduled yet.</b> Mark a section done (✓ beside its heading) and its first revision appears here the next day.
      After each revision you say how well you remembered it, and that sets the next date. <a href={href.study()}>Open the Study library →</a>
    </div>
  )
}

/** OVERDUE · 3 DAYS, DEFERRED, or nothing. */
function StateChip({ i }: { i: QueueItem }) {
  if (i.state === 'deferred') return <span className="chip st-deferred">Deferred · {shortDay(parseDay(i.unit.deferredUntilDate!))}</span>
  if (i.overdueDays > 0) return <span className="chip st-overdue">Overdue · {plural(i.overdueDays, 'day')}</span>
  return null
}

/** Sections under their chapter, chapters under their subject. */
function UnitGroups({ items, today, actions }: { items: QueueItem[]; today: number; actions: 'today' | 'overdue' | 'upcoming' }) {
  const groups = byChapter(items)
  const subjects = [...new Set(groups.map((g) => g.subjectKey))]
  return (
    <>
      {subjects.map((sk) => {
        const mine = groups.filter((g) => g.subjectKey === sk)
        return (
          <section className="rgroup" key={sk} data-subject={sk}>
            <h3 className="gh"><span>{titleOf(sk, sk)}</span><span className="est">{estText(mine.reduce((n, g) => n + g.ms, 0))}</span></h3>
            <div className="rows">
              {mine.map((g) => (
                <div className="rchap" key={g.chapterKey}>
                  <div className="rchap-h">{titleOf(g.chapterKey, g.chapterKey)}</div>
                  {g.items.map((i) => (
                    <div className="row runit" key={i.unit.id} data-unit={i.unit.id} data-state={i.state}>
                      <a className="t" href={href.revise(i.unit.id)}>
                        <b>{titleOf(i.unit.id, i.unit.title)}</b>
                        <small>{actions === 'upcoming' ? `${whenText(i.dueDay, today)} · ` : ''}{estText(i.estimateMs)}{i.unit.examTargetId && i.dueDay > today ? ' · before the exam' : ''}</small>
                      </a>
                      <StateChip i={i} />
                      <span className="chip u ord">R{i.ordinal}</span>
                      {actions !== 'upcoming' && i.state !== 'deferred' && <button className="linkbtn" onClick={() => deferUnit(i.unit.id)} title="Hide from Today until tomorrow. The due date is not changed.">Defer today</button>}
                      {i.state === 'deferred' && <button className="linkbtn" onClick={() => deferUnit(i.unit.id, false)}>Undo defer</button>}
                      <a className="btn sm" href={href.revise(i.unit.id)}>{actions === 'upcoming' ? 'Revise early' : 'Revise'}</a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}

function TodayTab({ queue }: { queue: Queue }) {
  const [all, setAll] = useState(false)
  const s = daySummary(queue)
  const rec = queue.recovery
  const list = rec && !all ? rec.recommended : queue.todayList
  const next = s.next
  return (
    <>
      <div className="rtoday">
        <div>
          <small>Today</small>
          {s.dueCount > 0 ? (
            <b>{s.dueCount} due · {estText(s.dueMs)}</b>
          ) : (
            <b className="ok"><Check />{s.completedToday ? 'Revision complete for today' : 'Nothing due today'}</b>
          )}
          <span>
            {[s.overdueCount > 0 && `${s.overdueCount} overdue`, s.totalToday > 0 && `${s.completedToday} / ${s.totalToday} completed`, s.deferredCount > 0 && `${s.deferredCount} deferred`].filter(Boolean).join(' · ')
              || (next ? `Next: ${whenText(next.day, queue.today)} · ${plural(next.count, 'unit')} · ${estText(next.ms)}` : 'No revision scheduled ahead yet.')}
          </span>
          {s.dueCount === 0 && s.completedToday > 0 && next && <span>Next: {whenText(next.day, queue.today)} · {plural(next.count, 'unit')} · {estText(next.ms)}</span>}
        </div>
        {list.length > 0 && <button className="btn primary" onClick={() => startRun(list.map((i) => i.unit.id))}><Play />{s.completedToday ? 'Continue Revision' : 'Start Revision'}</button>}
      </div>
      {rec && (
        <div className="recovery" role="note">
          <div>
            <b>Recovery mode</b>
            <span>Recommended today: <b>{plural(rec.recommended.length, 'unit')} · {estText(workloadMs(rec.recommended))}</b> · remaining backlog: <b>{plural(rec.rest.length, 'unit')}</b></span>
            <small>The units most at risk of being forgotten come first. Due dates and schedules are not changed; the rest waits.</small>
          </div>
          <button className="chip" aria-pressed={all} onClick={() => setAll(!all)}>{all ? 'Show recommended only' : 'Show everything due'}</button>
        </div>
      )}
      <UnitGroups items={list} today={queue.today} actions="today" />
      {queue.completedToday.length > 0 && (
        <>
          <h3 className="gh" style={{ marginTop: 24 }}>Completed today</h3>
          <div className="rows">{queue.completedToday.map((e) => <DoneRow key={e.id} e={e} today={queue.today} />)}</div>
        </>
      )}
    </>
  )
}

function DoneRow({ e, today }: { e: RevisionEvent; today: number }) {
  const [stage, subject, chapter, section] = e.revisionUnitId.split('/')
  const note = e.target.kind === 'current-affairs' ? e.target : null
  return (
    <a className="row rdone" href={notesHref(e.revisionUnitId)}>
      <span className="t">
        <b>{titleOf(e.revisionUnitId, note ? 'Current Affairs note' : section)}</b>
        <small>{note ? `Current Affairs · ${dayFull(parseDayId(note.dayId))}` : titleOf(`${stage}/${subject}/${chapter}`, chapter)} · {GRADE_LABEL[e.grade]} · {durationText(e.durationMs)} · next {whenText(parseDay(e.nextDueDate), today)}</small>
      </span>
      <span className="chip ord">R{e.ordinal}</span>
      <Check className="okmark" />
    </a>
  )
}

function OverdueTab({ queue }: { queue: Queue }) {
  if (!queue.overdue.length) return <p className="empty">Nothing is overdue.</p>
  return (
    <>
      <p className="lead">{plural(queue.overdue.length, 'unit')} past {queue.overdue.length === 1 ? 'its' : 'their'} date · {estText(workloadMs(queue.overdue))}. A missed revision stays where it was due; when you do it, the next date follows from the day you actually revised.</p>
      <UnitGroups items={queue.overdue} today={queue.today} actions="overdue" />
    </>
  )
}

function UpcomingTab({ queue }: { queue: Queue }) {
  if (!queue.upcoming.length) return <p className="empty">Nothing scheduled ahead yet.</p>
  const days = [...new Set(queue.upcoming.map((i) => i.dueDay))]
  const near = days.filter((d) => d <= queue.today + 30)
  const later = queue.upcoming.filter((i) => i.dueDay > queue.today + 30)
  return (
    <>
      <div className="stat">
        <span><b>{queue.upcoming.filter((i) => i.dueDay === queue.today + 1).length}</b>tomorrow</span>
        <span><b>{queue.upcoming.filter((i) => i.dueDay <= queue.today + 7).length}</b>next 7 days</span>
        <span><b>{queue.upcoming.filter((i) => i.dueDay <= queue.today + 30).length}</b>next 30 days</span>
      </div>
      {near.map((d) => {
        const items = queue.upcoming.filter((i) => i.dueDay === d)
        return (
          <div key={d} className="rday" data-date={dateKey(d)}>
            <h2 className="sh">{dayText(d)} <small>{whenText(d, queue.today)} · {plural(items.length, 'unit')} · {estText(workloadMs(items))}</small></h2>
            <UnitGroups items={items} today={queue.today} actions="upcoming" />
          </div>
        )
      })}
      {later.length > 0 && (
        <div className="rday">
          <h2 className="sh">Later <small>{plural(later.length, 'unit')}</small></h2>
          <UnitGroups items={later} today={queue.today} actions="upcoming" />
        </div>
      )}
      <p className="fine">Only each unit's next revision is shown. The one after it is decided when that revision is done.</p>
    </>
  )
}

// ---- calendar -----------------------------------------------------------------------------------------
function CalendarTab({ queue, events, exams, tz }: { queue: Queue; events: RevisionEvent[]; exams: ReturnType<typeof liveExams>; tz: string }) {
  const [at, setAt] = useState(() => monthOf(queue.today))
  const [picked, setPicked] = useState(queue.today)
  const cells = useMemo(() => calendarMonth(queue, events, exams, at.year, at.month, tz), [queue, events, exams, at, tz])
  const step = (d: number) => setAt(monthOf(dayNo(at.year, at.month + d, 1)))
  const day = cells.find((c) => c.day === picked)
  return (
    <>
      <div className="filters cal-nav">
        <span className="stepper">
          <button className="ib" onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft /></button>
          <b aria-live="polite">{MONTH[at.month - 1]} {at.year}</b>
          <button className="ib" onClick={() => step(1)} aria-label="Next month"><ChevronRight /></button>
        </span>
        <button className="chip" onClick={() => { setAt(monthOf(queue.today)); setPicked(queue.today) }}>Today</button>
        <span className="cal-key"><i data-k="due" />Due<i data-k="done" />Completed<i data-k="overdue" />Overdue<i data-k="deferred" />Deferred<i data-k="exam" />Exam</span>
      </div>
      <div className="cal" role="grid" aria-label={`Revision calendar, ${MONTH[at.month - 1]} ${at.year}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="cal-h" role="columnheader">{d}</span>)}
        {cells.map((c) => {
          const n = c.due.length + c.deferred.length
          const label = [dayText(c.day), n && `${n} due`, c.overdue.length && `${c.overdue.length} overdue`, c.completed.length && `${c.completed.length} completed`, ...c.exams.map((x) => x.name)].filter(Boolean).join(', ')
          return (
            <button key={c.day} role="gridcell" className={'cal-d' + (c.inMonth ? '' : ' out') + (c.day === queue.today ? ' today' : '') + (c.day === picked ? ' on' : '')} data-date={c.date} aria-label={label} aria-selected={c.day === picked} onClick={() => setPicked(c.day)}>
              <span className="n">{civil(c.day).d}</span>
              <span className="marks">
                {c.due.length > 0 && <i data-k="due">{c.due.length}</i>}
                {c.deferred.length > 0 && <i data-k="deferred">{c.deferred.length}</i>}
                {c.overdue.length > 0 && <i data-k="overdue">{c.overdue.length}</i>}
                {c.completed.length > 0 && <i data-k="done">{c.completed.length}</i>}
              </span>
              {c.exams.length > 0 && <span className="cal-x" title={c.exams.map((x) => x.name).join(', ')}>{c.exams[0].shortName || c.exams[0].name}</span>}
            </button>
          )
        })}
      </div>
      {day && <DayDetail day={day} queue={queue} />}
      <p className="fine">Each unit appears once, on the date of its next revision. Dates follow the scheduler timezone ({tz}).</p>
    </>
  )
}

function DayDetail({ day, queue }: { day: CalendarDay; queue: Queue }) {
  const carried = day.day === queue.today ? queue.todayList.filter((i) => i.state === 'overdue') : []
  const todo = [...day.due, ...day.deferred]
  const empty = !todo.length && !day.overdue.length && !day.completed.length && !day.exams.length && !carried.length
  return (
    <section className="cal-day" data-date={day.date} aria-live="polite">
      <h2 className="sh">{dayText(day.day)} <small>{todo.length + carried.length > 0 ? `${todo.length + carried.length} due · ${estText(day.ms)}` : day.completed.length ? `${day.completed.length} completed` : ''}</small></h2>
      {day.exams.map((x) => <div className="row exam-row" key={x.id}><span className="t"><b>{x.name}</b><small>Exam · {examDateText(x.examDate)}</small></span><span className="chip st-exam">Exam</span></div>)}
      {empty && <p className="empty" style={{ padding: '4px 0' }}>Nothing on this day.</p>}
      {todo.length > 0 && <UnitGroups items={todo} today={queue.today} actions={day.day > queue.today ? 'upcoming' : 'today'} />}
      {carried.length > 0 && <><h3 className="gh">Overdue, carried to today</h3><UnitGroups items={carried} today={queue.today} actions="overdue" /></>}
      {day.overdue.length > 0 && day.day !== queue.today && <><h3 className="gh">Was due on this day · not done</h3><UnitGroups items={day.overdue} today={queue.today} actions="overdue" /></>}
      {day.completed.length > 0 && <><h3 className="gh">Completed</h3><div className="rows">{day.completed.map((e) => <DoneRow key={e.id} e={e} today={queue.today} />)}</div></>}
    </section>
  )
}

// ---- Guided Revision ---------------------------------------------------------------------------------
/** What is revised: a section of the library, or a Current Affairs note the learner added to revision. */
interface Src {
  title: string
  html: string
  /** What the timer tracks during the revision. */
  context: StudyContext
  /** Where it sits: Prelims › Polity › Parliament. */
  where: string
  notesHref: string
}

export function ReviseView({ subjects, unitId, say }: { subjects: Subject[]; unitId: string; say: (m: string, ms?: number) => void }) {
  const ready = useRevision((s) => s.ready)
  const studyReady = useStudy((s) => s.ready)
  const caReady = useCA((s) => s.ready)
  const has = useRevision((s) => !!s.units[unitId])
  const overrides = useStore((s) => s.overrides)
  const note = useCA((s) => (unitId.startsWith('ca/') ? s.entries[unitId.slice(3)] : undefined))
  const loc = useMemo(() => locate(subjects, unitId), [subjects, unitId])
  const title = loc ? secTitle(overrides, loc.section) : note && !note.removed ? note.title || 'Untitled note' : ''
  const html = loc ? secHtml(overrides, loc.section) : note && !note.removed ? noteBody(overrides, note.id) : ''
  const src: Src | null = useMemo(
    () =>
      loc
        ? { title, html, context: studyContext(loc.subject, loc.chapter, { id: loc.section.id, title }), where: `${stageTitle(loc.subject.stage)} › ${loc.subject.title} › ${loc.chapter.title}`, notesHref: notesHref(unitId) }
        : note && !note.removed
          ? { title, html, context: caNoteContext(note.dayId, note.id, title), where: `Current Affairs › ${dayFull(parseDayId(note.dayId))}`, notesHref: notesHref(unitId) }
          : null,
    [loc, note, title, html, unitId],
  )
  if (!ready || !studyReady || !caReady) return <div className="page"><p className="empty">Loading…</p></div>
  if (!has || !src) {
    return (
      <div className="page">
        <p className="empty">{unitId.startsWith('ca/') ? 'This note is not scheduled for revision — use “Add to Revision” on the note to schedule it' : `This section is not scheduled for revision${loc ? ' — mark it done (✓) in the notes to schedule it' : ''}`}. <a href={href.revision()} style={{ color: 'var(--accent)' }}>Back to Revision →</a></p>
      </div>
    )
  }
  return <Revise key={unitId} unitId={unitId} src={src} say={say} />
}

function Revise({ unitId, src, say }: { unitId: string; src: Src; say: (m: string, ms?: number) => void }) {
  const unit = useRevision((s) => s.units[unitId])
  const row = useRevision((s) => s.prefs)
  const attempts = useRevision((s) => s.attempts)
  const prefs = useMemo(() => prefsOf(row), [row])
  const { title, html, context } = src

  // the revision in progress: the same one after a reload
  const [cur] = useState(() => {
    const run = readRun()
    if (run.current?.unitId === unitId) return run.current
    const current = { unitId, eventId: newRevisionEventId(), startedAt: new Date(clock.now()).toISOString() }
    writeRun({ queue: run.queue.includes(unitId) ? run.queue : [unitId], ownTimer: run.queue.includes(unitId) ? run.ownTimer : undefined, current })
    return current
  })
  const [ordinal] = useState(() => unit.revisionCount + 1)
  const event = useRevision((s) => s.events[cur.eventId])
  const activity: SpanActivity = useMemo(() => ({ activity: 'revision', revisionUnitId: unitId, revisionEventId: cur.eventId, revisionOrdinal: ordinal }), [unitId, cur.eventId, ordinal])

  // The one timer moves into a revision span. Another device's timer is left alone.
  const timer = useStudy(activeTimer)
  const remote = !!timer && !ownsTimer(timer)
  useEffect(() => {
    if (event) return
    if (beginRevisionSpan(context, activity, linked() && !navigator.onLine) === 'started') writeRun({ ...readRun(), ownTimer: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.eventId])
  // time this page was in view: what the revision took when no timer of this device recorded it
  const seen = useRef({ ms: 0, since: performance.now() })
  useEffect(() => {
    const flip = () => {
      const s = seen.current
      if (document.visibilityState === 'hidden') s.ms += performance.now() - s.since
      else s.since = performance.now()
    }
    document.addEventListener('visibilitychange', flip)
    return () => document.removeEventListener('visibilitychange', flip)
  }, [])

  // the prompts are chosen once, from earlier revisions; answers given now do not reshuffle them
  const pyq = hasPyq(unitId)
  const [prompts] = useState<RecallItem[]>(() =>
    prefs.guidedRevisionEnabled ? selectPrompts(annotate(html, unitId, { pyq }).items, Object.values(attempts).filter((a) => a.revisionUnitId === unitId && a.revisionEventId !== cur.eventId), prefs.recallIntensity) : [],
  )
  const answered = useMemo(() => new Map(Object.values(attempts).filter((a) => a.revisionEventId === cur.eventId).map((a) => [a.recallUnitId, a.outcome])), [attempts, cur.eventId])
  const [skipAhead, setSkipAhead] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [notes, setNotes] = useState(false)
  const index = prompts.findIndex((p) => !answered.has(p.id))
  const prompt = !skipAhead && index >= 0 ? prompts[index] : null
  const readThrough = prompts.length === 0
  const [read, setRead] = useState(false)
  const grading = !event && !prompt && (!readThrough || read)

  const answer = (outcome: RecallOutcome) => {
    if (!prompt) return
    recordAttempt({ recallUnitId: prompt.id, contentHash: prompt.contentHash, unitId, eventId: cur.eventId, outcome })
    setRevealed(false)
  }

  const finish = (grade: RevisionGrade) => {
    const a = activeTimer(useStudy.getState())
    const mine = ownsTimer(a) && a?.currentActivity?.revisionEventId === cur.eventId
    const timed = mine ? revisionSpanMs(cur.eventId) : 0
    const s = seen.current
    const e = completeRevision({ unitId, grade, eventId: cur.eventId, startedAt: cur.startedAt, durationMs: timed || s.ms + (document.visibilityState === 'hidden' ? 0 : performance.now() - s.since), studySessionId: mine ? a!.sessionId : undefined })
    if (!e) return
    const run = readRun()
    const rest = run.queue.filter((id) => id !== unitId && !!useRevision.getState().units[id])
    const when = whenText(parseDay(e.nextDueDate), dayOf(clock.now(), prefs.schedulerTimeZone))
    if (rest.length) {
      // the next unit's own revision span begins when it opens
      writeRun({ queue: rest, ownTimer: run.ownTimer })
      say(`R${e.ordinal} recorded · next ${when.toLowerCase()}`)
      go(href.revise(rest[0]))
      return
    }
    writeRun(null)
    if (mine) {
      // the revision's time ends here: a timer this run started is stopped and saved; one that was
      // already running for study is paused rather than left counting as revision
      if (run.ownTimer) {
        const ses = stopTimer()
        say(ses ? `Revision recorded · ${durationText(ses.durationMs)} saved` : 'Revision recorded')
      } else {
        pauseTimer()
        say('Revision recorded · study timer paused')
      }
    } else say(`R${e.ordinal} recorded · next ${when.toLowerCase()}`)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return
      if (prompt && !revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
      } else if (prompt && revealed && ['1', '2', '3'].includes(e.key)) answer((['knew', 'missed', 'skipped'] as const)[+e.key - 1])
      else if (grading && ['1', '2', '3', '4'].includes(e.key)) finish(GRADES[+e.key - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const tally = [...answered.values()]
  const knew = tally.filter((o) => o === 'knew').length
  const missed = tally.filter((o) => o === 'missed').length
  const p = prompt ? promptOf(prompt, ordinal) : null
  const body = useMemo(() => annotate(html, unitId, { pyq }).html, [html, unitId, pyq])
  const toggle = (e: React.MouseEvent) => (e.target as Element).closest?.(`.rq[data-m~="${prefs.recallIntensity}"]`)?.classList.toggle('shown')

  return (
    <div className="page revise" data-unit={unitId} data-phase={event ? 'done' : prompt ? 'prompt' : grading ? 'grade' : 'read'}>
      <div className="eyebrow">Revision · {src.where}</div>
      <h1 className="title">{title} <span className="chip u ord">R{event ? event.ordinal : ordinal}</span></h1>
      {remote && !event && (
        <div className="shell-note" role="status">
          A study timer is running on another device, so this revision is not being timed here.{' '}
          <button className="linkbtn" onClick={() => continueHere(context, activity)}>Continue the timer here</button>
        </div>
      )}

      {event ? (
        <section className="rcard done">
          <b className="ok"><Check />R{event.ordinal} recorded · {GRADE_LABEL[event.grade]}</b>
          <p>Next revision: <b>{dayText(parseDay(event.nextDueDate))}</b>{event.examTargetId ? ' — placed before the exam' : ''}. That date is set by how well you remembered this time; the one after it will be set then.</p>
          <div className="acts">
            <a className="btn primary" href={href.revision()}>Back to Revision<ArrowRight /></a>
            <a className="btn" href={src.notesHref}>Open the notes</a>
          </div>
        </section>
      ) : prompt && p ? (
        <section className="rcard" data-rid={prompt.id} data-kind={prompt.kind}>
          <div className="rprog"><span>{index + 1} / {prompts.length}</span><span className="meter"><i style={{ width: `${(index / prompts.length) * 100}%` }} /></span></div>
          <div className="rcue prose" dangerouslySetInnerHTML={{ __html: revealed && p.inline ? p.cueHtml.replace(TARGET_BLANK, `<span class="ra">${p.answerHtml}</span>`) : p.cueHtml }} />
          {!p.inline && (revealed
            ? <div className="rans prose" dangerouslySetInnerHTML={{ __html: p.answerHtml }} />
            : <div className="rmask">[ Recall{p.cueLabel ? ` ${p.cueLabel.toLowerCase()}` : ''} ]</div>)}
          <div className="acts">
            {revealed ? (
              <>
                <button className="btn primary" onClick={() => answer('knew')}>Knew<kbd>1</kbd></button>
                <button className="btn" onClick={() => answer('missed')}>Missed<kbd>2</kbd></button>
                <button className="btn" onClick={() => answer('skipped')}>Skip<kbd>3</kbd></button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={() => setRevealed(true)}>Reveal<kbd>Space</kbd></button>
                <button className="btn" onClick={() => answer('skipped')}>Skip</button>
              </>
            )}
            <button className="linkbtn" onClick={() => setSkipAhead(true)}>Finish now</button>
          </div>
        </section>
      ) : grading ? (
        <section className="rcard grade">
          {tally.length > 0 && <div className="rtally">{knew} knew · {missed} missed{tally.length - knew - missed > 0 ? ` · ${tally.length - knew - missed} skipped` : ''}</div>}
          <h2>How well did you remember this?</h2>
          <div className="grades" role="group" aria-label="How well did you remember this?">
            {GRADES.map((g, i) => (
              <button key={g} className="btn grade-b" data-grade={g} onClick={() => finish(g)} title={GRADE_HINT[g]}>
                <b>{GRADE_LABEL[g]}</b><small>{GRADE_HINT[g]}</small><kbd>{i + 1}</kbd>
              </button>
            ))}
          </div>
          <button className="linkbtn" onClick={() => setNotes(!notes)} aria-expanded={notes}>{notes ? 'Hide the notes' : 'Check the notes first'}</button>
          {notes && <div className="sec-body prose rnotes" dangerouslySetInnerHTML={{ __html: html }} />}
        </section>
      ) : (
        <section className={`rcard read recall ri-${prefs.recallIntensity}`}>
          <p className="fine" style={{ margin: '0 0 10px' }}>{prefs.guidedRevisionEnabled ? 'This section has no recall prompts.' : 'Guided prompts are off.'} Recall each concealed answer, tap to check it, then say how it went.</p>
          <div className="sec-body prose" onClick={toggle} dangerouslySetInnerHTML={{ __html: body }} />
          <div className="acts"><button className="btn primary" onClick={() => setRead(true)}>Done reading</button></div>
        </section>
      )}
    </div>
  )
}
