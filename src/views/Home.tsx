// Home: where I left off, what is next, how much I have studied, how far through the syllabus
// I am, and what needs attention.
// The page holds no figures of its own. Everything shown is lib/dashboard.ts's view model, built
// on each render from the completed study sessions (lib/analytics.ts), the reader's progress
// state, the study queue and the goal. Nothing here is stored.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ChevronUp, Pause, Play, Plus, Square, X } from 'lucide-react'
import { stageTitle, type Subject } from '../lib/content'
import type { ContentRef, StudyQueueItem } from '../lib/contract'
import { STATUS_LABEL, secTitle, useStore, type ProgressDetail, type Status } from '../lib/store'
import { go, href } from '../lib/router'
import { chapterRef, destinations, navContext, navNode, refHref, refKey, studyContext } from '../lib/nav'
import { activeTimer, ownsTimer, pauseTimer, resumeTimer, startTimer, useStudy } from '../lib/study'
import { clockText, durationText } from '../lib/timer'
import { dayNo, dayOf, dayText } from '../lib/analytics'
import { buildDashboard, REVISION_ROWS, type DashboardModel, type GoalProgress } from '../lib/dashboard'
import { activeGoal, addToQueue, clearCompleted, completeQueueItem, moveQueueItem, queueItems, removeQueueItem, setGoal, targetKey, usePlan } from '../lib/plan'
import { linked } from '../sync'
import { BarChart, Heatmap, type Datum } from '../components/Charts'
import { pathOf, useElapsed, useTimerActions } from '../components/Timer'
import { agoText, changeText, describeDay, plural, timeText, useData } from './Insights'
import { DestRows, Meter, locate } from './Pages'

const HOUR = 3600000
const STATUSES = Object.keys(STATUS_LABEL) as Status[]
const FIELD = { new: 'notStarted', reading: 'reading', revised: 'revised', mastered: 'mastered' } as const
const REASON: Record<StudyQueueItem['reason'], string> = { manual: '', continue: 'In progress', revision: '↻ Revise', difficult: '★ Difficult' }

const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** A number that eases to its new value. Timer-driven, so it also finishes in a tab that is not being painted. */
function useTween(target: number, ms = 450) {
  const [v, setV] = useState(() => (still() ? target : 0))
  const at = useRef(v)
  useEffect(() => {
    if (still() || at.current === target) {
      at.current = target
      return setV(target)
    }
    const from = at.current
    const t0 = performance.now()
    const t = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms)
      at.current = from + (target - from) * (1 - (1 - k) ** 3)
      setV(at.current)
      if (k === 1) clearInterval(t)
    }, 32)
    return () => clearInterval(t)
  }, [target, ms])
  return v
}
function Num({ value, format, className }: { value: number; format: (v: number) => string; className?: string }) {
  const v = useTween(value)
  return <b className={className} data-final={format(value)}>{format(v)}</b>
}
const pct = (v: number) => `${Math.round(v)}%`

/** Open a chapter and, when no timer exists yet, start one on it. */
function startStudying(subjects: Subject[], target: ContentRef) {
  const subject = subjects.find((s) => s.key === `${target.stage}/${target.subjectId}`)
  const chapter = subject?.chapters.find((c) => c.id === target.chapterId)
  if (!subject || !chapter) return go(refHref(target))
  // a timer started offline on a linked device cannot know whether another device has one
  if (!activeTimer(useStudy.getState())) startTimer(studyContext(subject, chapter), linked() && !navigator.onLine)
  go(href.reader(chapter.key, target.sectionId, target.sectionId ? undefined : { resume: true }))
}

export function Home({ subjects, say }: { subjects: Subject[]; say: (m: string) => void }) {
  const { ix, now, tz } = useData()
  const progress = useStore((s) => s.progress)
  const prefs = useStore((s) => s.prefs)
  const rows = usePlan((s) => s.queue)
  const goal = usePlan(activeGoal)
  const active = useStudy(activeTimer)
  const queue = useMemo(() => queueItems(rows), [rows])
  const m = useMemo(
    () => buildDashboard({ ix, now, subjects, progress, recents: prefs.recents, queue, active, goal }),
    [ix, now, subjects, progress, prefs.recents, queue, active, goal],
  )
  return (
    <div className="page home">
      <div className="eyebrow">{dayText(dayOf(now, tz))} · UPSC CSE · UPPCS</div>
      <h1 className="title">Home</h1>
      <div className="hero">
        <ContinueCard m={m} />
        <TimerCard m={m} subjects={subjects} say={say} />
        <TodayCard m={m} />
      </div>
      <div className="dash">
        <div className="col">
          <ProgressCard m={m} />
          <SubjectsCard m={m} now={now} tz={tz} />
          <RevisionCard m={m} now={now} tz={tz} />
          <FavouritesCard />
        </div>
        <div className="col">
          <WeekCard m={m} now={now} tz={tz} />
          <QueueCard m={m} subjects={subjects} />
          <RecentCard m={m} subjects={subjects} now={now} tz={tz} />
        </div>
      </div>
    </div>
  )
}

// ---- hero ---------------------------------------------------------------------------
function ContinueCard({ m }: { m: DashboardModel }) {
  const overrides = useStore((s) => s.overrides)
  const r = m.resume
  return (
    <section className="card cont" style={{ '--i': 0 } as React.CSSProperties}>
      <h3 className="gh">Continue studying</h3>
      {r ? (
        <>
          <a className="cont-t" href={href.reader(r.chapter.key, undefined, { resume: true })}>{r.chapter.title}</a>
          <div className="cont-p">{stageTitle(r.subject.stage)} › {r.subject.title}{r.section ? ` › ${secTitle(overrides, r.section)}` : ''}</div>
          <div className="cont-m">
            <i className="dot" data-s={r.status} />
            <span>{STATUS_LABEL[r.status]} · {r.done} of {r.total} sections done</span>
            <Meter v={r.done} max={r.total} />
          </div>
          <div className="acts">
            <a className="btn primary" href={href.reader(r.chapter.key, undefined, { resume: true })}>Resume<ArrowRight /></a>
            <a className="btn" href={href.subject(r.subject.key)}>{r.subject.title}</a>
          </div>
        </>
      ) : (
        <>
          <div className="cont-t">Nothing opened yet</div>
          <div className="cont-p">Pick a subject and the chapter you open is kept here.</div>
          <div className="acts"><a className="btn primary" href={href.study()}>Open the Study library<ArrowRight /></a></div>
        </>
      )}
    </section>
  )
}

function TimerCard({ m, subjects, say }: { m: DashboardModel; subjects: Subject[]; say: (m: string) => void }) {
  const ready = useStudy((s) => s.ready)
  const a = m.activeSession ?? null
  const ms = useElapsed(a)
  const act = useTimerActions(null, say)
  const mine = ownsTimer(a)
  const paused = a?.state === 'paused'
  const state = !a ? 'idle' : !mine ? 'remote' : paused ? 'paused' : 'running'
  return (
    <section className="card tcard" data-state={state} style={{ '--i': 1 } as React.CSSProperties}>
      <h3 className="gh">Timer</h3>
      {a ? (
        <>
          <div className="tc-time"><i className="tdot" /><time aria-label={`Study timer: ${clockText(ms)}`}>{clockText(ms)}</time></div>
          <div className="tc-path">
            <small>{!mine ? (paused ? 'Paused on another device' : 'Running on another device') : paused ? 'Paused' : 'Running'}</small>
            {pathOf(a.currentContext)}
          </div>
          <div className="acts">
            {mine ? (
              <>
                {paused ? <button className="btn primary" onClick={resumeTimer}><Play />Resume</button> : <button className="btn primary" onClick={pauseTimer}><Pause />Pause</button>}
                <button className="btn" onClick={() => act.stop()} title="Stop and save the session"><Square />Stop</button>
              </>
            ) : (
              <button className="btn primary" onClick={act.takeOver}>Continue here</button>
            )}
            <a className="btn" href={refHref(a.currentContext.ref)}>Open topic</a>
          </div>
        </>
      ) : (
        <>
          <div className="tc-time idle"><time>00:00:00</time></div>
          <div className="tc-path"><small>Not running</small>{m.resume ? m.resume.chapter.title : 'Open a chapter to time your study.'}</div>
          <div className="acts">
            {m.resume
              ? <button className="btn primary" disabled={!ready} onClick={() => startStudying(subjects, chapterRef(m.resume!.chapter))}><Play />Start studying</button>
              : <a className="btn" href={href.study()}>Choose a chapter</a>}
          </div>
        </>
      )}
    </section>
  )
}

function GoalBar({ label, g, note }: { label: string; g: GoalProgress; note?: string }) {
  return (
    <div className={'goal' + (g.met ? ' met' : '')}>
      <span className="gl">{label}</span>
      <span className="gv">{g.met ? '✓ ' : ''}{timeText(g.doneMs)} of {durationText(g.targetMs)}</span>
      <Meter v={Math.min(g.doneMs, g.targetMs)} max={g.targetMs} />
      {note && <span className="gn">{note}</span>}
    </div>
  )
}

function GoalEditor({ onClose }: { onClose: () => void }) {
  const goal = usePlan(activeGoal)
  const hours = (ms?: number) => (ms ? String(+(ms / HOUR).toFixed(2)) : '')
  const [daily, setDaily] = useState(hours(goal?.dailyTargetMs))
  const [weekly, setWeekly] = useState(hours(goal?.weeklyTargetMs))
  const ms = (v: string, max: number) => {
    const n = parseFloat(v)
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) * HOUR : undefined
  }
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    setGoal({ dailyTargetMs: ms(daily, 24), weeklyTargetMs: ms(weekly, 168) })
    onClose()
  }
  return (
    <form className="goal-form" onSubmit={save}>
      <label>Daily target<input type="number" inputMode="decimal" min="0" max="24" step="0.25" placeholder="none" value={daily} onChange={(e) => setDaily(e.target.value)} aria-label="Daily target in hours" />h</label>
      <label>Weekly target<input type="number" inputMode="decimal" min="0" max="168" step="0.5" placeholder="none" value={weekly} onChange={(e) => setWeekly(e.target.value)} aria-label="Weekly target in hours" />h</label>
      <div className="acts">
        <button className="btn primary" type="submit">Save</button>
        {goal && <button className="btn" type="button" onClick={() => { setGoal({}); onClose() }}>Remove goals</button>}
        <button className="linkbtn" type="button" onClick={onClose}>Cancel</button>
      </div>
      <p className="fine">Optional. Leave a field empty for no target.</p>
    </form>
  )
}

function TodayCard({ m }: { m: DashboardModel }) {
  const [editing, setEditing] = useState(false)
  const { daily, weekly, dailyStreak } = m.goals
  return (
    <section className="card today" style={{ '--i': 2 } as React.CSSProperties}>
      <h3 className="gh">Today</h3>
      <Num className="big" value={m.todayStudyMs} format={timeText} />
      <div className="sub">{changeText(m.today, 'yesterday')}</div>
      {m.activeSession && <div className="sub dim">A timer is running — its time is counted once it is stopped.</div>}
      {daily && <GoalBar label="Daily goal" g={daily} note={dailyStreak > 1 ? `Reached ${dailyStreak} days running` : undefined} />}
      {weekly && <GoalBar label="Weekly goal" g={weekly} />}
      {editing
        ? <GoalEditor onClose={() => setEditing(false)} />
        : <button className="linkbtn goal-set" onClick={() => setEditing(true)}>{daily || weekly ? 'Edit goals' : 'Set a daily or weekly goal'}</button>}
    </section>
  )
}

// ---- progress -----------------------------------------------------------------------
function Ring({ value }: { value: number }) {
  const c = 2 * Math.PI * 24
  return (
    <span className="ring">
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle className="rt" cx="28" cy="28" r="24" />
        <circle className="rv" cx="28" cy="28" r="24" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ '--c': c } as React.CSSProperties} transform="rotate(-90 28 28)" />
      </svg>
      <Num value={value} format={pct} />
    </span>
  )
}
function StatusBar({ p }: { p: ProgressDetail }) {
  return (
    <>
      <div className="sbar" role="img" aria-label={STATUSES.map((s) => `${p[FIELD[s]]} ${STATUS_LABEL[s]}`).join(', ')}>
        {STATUSES.map((s) => p[FIELD[s]] > 0 && <i key={s} data-s={s} style={{ flexGrow: p[FIELD[s]] }} />)}
      </div>
      <div className="slegend">{STATUSES.map((s) => <span key={s} data-s={s}><i className="dot" data-s={s} />{p[FIELD[s]]} {STATUS_LABEL[s]}</span>)}</div>
    </>
  )
}

function ProgressCard({ m }: { m: DashboardModel }) {
  return (
    <section className="card prog" style={{ '--i': 3 } as React.CSSProperties}>
      <h3 className="gh"><a href={href.insights('progress')}>Study progress<ArrowRight /></a></h3>
      {m.stages.length === 0 && <p className="none">No subjects added yet.</p>}
      {m.stages.map(({ id, subjects, progress: p }) => (
        <div className="stage" key={id} data-stage={id}>
          <Ring value={p.completionPercent} />
          <div className="stage-b">
            <div className="stage-h"><b>{stageTitle(id)}</b><span>{p.sectionsDone} of {p.sectionsTotal} sections · {plural(p.totalUnits, 'chapter')} · {plural(subjects, 'subject')}</span></div>
            <StatusBar p={p} />
          </div>
        </div>
      ))}
    </section>
  )
}

function SubjectsCard({ m, now, tz }: { m: DashboardModel; now: number; tz: string }) {
  return (
    <section className="card subs" style={{ '--i': 5 } as React.CSSProperties}>
      <h3 className="gh"><a href={href.study()}>Subjects<ArrowRight /></a></h3>
      <div className="slist">
        {m.subjectProgress.map((s) => (
          <div className="srow" key={s.key}>
            <a className="sn" href={href.subject(s.key)}>
              <b>{s.subjectTitle}</b>
              <small>{s.studyTimeMs ? `${timeText(s.studyTimeMs)} studied` : 'Not timed yet'}{s.lastStudiedAt ? ` · last ${agoText(s.lastStudiedAt, now, tz)}` : ''}</small>
            </a>
            <span className="num">{s.completionPercent}%</span>
            {s.resumeChapterKey
              ? <a className="chip u" href={href.reader(s.resumeChapterKey, undefined, { resume: true })} title={`Resume ${navNode(s.resumeChapterKey)?.title ?? s.subjectTitle}`}>Resume</a>
              : <a className="chip" href={href.subject(s.key)}>Open</a>}
            <Meter v={s.sectionsDone} max={s.sectionsTotal} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ---- this week ----------------------------------------------------------------------
function WeekCard({ m, now, tz }: { m: DashboardModel; now: number; tz: string }) {
  const bars: Datum[] = m.weekSeries.map((b) => ({ key: b.key, label: b.label, title: b.title, value: b.durationMs }))
  const { currentDays, longestDays, lastStudyDate } = m.streak
  const active = m.heatmap.filter((d) => d.durationMs > 0)
  const idle = lastStudyDate ? dayOf(now, tz) - dayNo(+lastStudyDate.slice(0, 4), +lastStudyDate.slice(5, 7), +lastStudyDate.slice(8, 10)) : 0
  return (
    <section className="card week" style={{ '--i': 4 } as React.CSSProperties}>
      <h3 className="gh"><a href={href.insights('time')}>This week<ArrowRight /></a></h3>
      {m.hasSessions ? (
        <>
          <Num className="big" value={m.weekStudyMs} format={timeText} />
          <div className="sub">{changeText(m.week, 'last week by now')}</div>
          {m.weekSeries.some((b) => b.durationMs > 0)
            ? <div className="mini"><BarChart data={bars} format={timeText} caption="Study time on each day of this week" unit="Day" /></div>
            : <p className="none">No tracked study this week yet.</p>}
          <Heatmap compact days={m.heatmap} describe={describeDay} summary={`Study time on each day of the last ${Math.ceil(m.heatmap.length / 7)} weeks: ${plural(active.length, 'day')} with study.`} />
          <div className="streak">
            {currentDays > 0
              ? <span><b>{currentDays}</b>-day study streak</span>
              : <span>Last studied {plural(idle, 'day')} ago</span>}
            {longestDays > currentDays && <span>longest {plural(longestDays, 'day')}</span>}
          </div>
        </>
      ) : (
        <p className="none">No tracked study time yet. Start the timer on a chapter and this week's chart and calendar appear here.</p>
      )}
    </section>
  )
}

// ---- revision and queue -------------------------------------------------------------
function RevisionCard({ m, now, tz }: { m: DashboardModel; now: number; tz: string }) {
  const overrides = useStore((s) => s.overrides)
  const queued = new Set(m.queueOpen.map((q) => targetKey(q.target)))
  const { difficultCount, reviseCount } = m.revision
  const more = m.revisionRows.length - REVISION_ROWS
  return (
    <section className="card rev" style={{ '--i': 7 } as React.CSSProperties}>
      <h3 className="gh"><a href={href.revision()}>Revision<ArrowRight /></a></h3>
      {m.revisionRows.length === 0 ? (
        <p className="none">Nothing flagged. Use ↻ or ★ beside any section heading to send it here.</p>
      ) : (
        <>
          <div className="mstat"><span>★ <b>{difficultCount}</b> difficult</span><span>↻ <b>{reviseCount}</b> to revise</span></div>
          <ul className="qlist">
            {m.revisionRows.slice(0, REVISION_ROWS).map((r) => {
              const title = secTitle(overrides, r.section)
              const inQueue = queued.has(r.section.key)
              return (
                <li key={r.section.key}>
                  <a className="qt" href={href.reader(r.chapter.key, r.section.id)}>
                    <b>{title}</b>
                    <small>{[r.state.difficult && '★', r.state.revise && '↻', r.chapter.title, r.lastStudiedAt ? `studied ${agoText(r.lastStudiedAt, now, tz)}` : 'not timed yet'].filter(Boolean).join(' · ')}</small>
                  </a>
                  {inQueue
                    ? <span className="chip">In queue</span>
                    : <button className="tg" title="Add to the study queue" aria-label={`Add ${title} to the study queue`} onClick={() => addToQueue(r.ref, title, r.state.difficult ? 'difficult' : 'revision')}><Plus /></button>}
                </li>
              )
            })}
          </ul>
          {more > 0 && <a className="more" href={href.revision()}>+ {more} more in the revision list</a>}
        </>
      )}
    </section>
  )
}

function QueueCard({ m, subjects }: { m: DashboardModel; subjects: Subject[] }) {
  const open = m.queueOpen
  const current = m.resume && !open.some((q) => targetKey(q.target) === m.resume!.chapter.key) ? m.resume.chapter : null
  const name = (q: StudyQueueItem) => navNode(refKey(q.target))?.title ?? q.title
  return (
    <section className="card queue" style={{ '--i': 6 } as React.CSSProperties}>
      <h3 className="gh">Study queue{open.length > 0 && <small>{open.length}</small>}</h3>
      {open.length === 0 && <p className="none">Empty. Add the chapter you are on, or use ＋ beside a revision item.</p>}
      <ol className="qlist">
        {open.map((q, i) => (
          <li key={q.id} data-id={q.id}>
            <button className="tg done" title="Mark complete" aria-label={`Mark ${name(q)} complete`} onClick={() => completeQueueItem(q.id)}><Check /></button>
            <a className="qt" href={refHref(q.target)}>
              <b>{name(q)}</b>
              <small>{[REASON[q.reason], navContext(refKey(q.target))].filter(Boolean).join(' · ')}</small>
            </a>
            <span className="qops">
              <button className="tg" disabled={i === 0} title="Move up" aria-label={`Move ${name(q)} up`} onClick={() => moveQueueItem(q.id, -1)}><ChevronUp /></button>
              <button className="tg" disabled={i === open.length - 1} title="Move down" aria-label={`Move ${name(q)} down`} onClick={() => moveQueueItem(q.id, 1)}><ChevronDown /></button>
              <button className="tg" title="Remove from the queue" aria-label={`Remove ${name(q)} from the queue`} onClick={() => removeQueueItem(q.id)}><X /></button>
            </span>
          </li>
        ))}
      </ol>
      <div className="acts">
        {open[0] && <button className="btn primary" onClick={() => startStudying(subjects, open[0].target)}><Play />Start next</button>}
        {current && <button className="btn" onClick={() => addToQueue(chapterRef(current), current.title, 'continue')}><Plus />Add current chapter</button>}
      </div>
      {m.queueDone.length > 0 && (
        <div className="qdone">
          <span>{m.queueDone.length} completed</span>
          {m.queueDone.slice(0, 3).map((q) => <button key={q.id} className="chip" title="Put back in the queue" onClick={() => completeQueueItem(q.id, false)}>✓ {name(q)}</button>)}
          <button className="linkbtn" onClick={clearCompleted}>Clear</button>
        </div>
      )}
    </section>
  )
}

// ---- recent -------------------------------------------------------------------------
function RecentCard({ m, subjects, now, tz }: { m: DashboardModel; subjects: Subject[]; now: number; tz: string }) {
  const highlights = useStore((s) => s.highlights)
  const recent = useMemo(
    () => m.recentTargets.flatMap((r) => destinations([r.target]).map((d) => ({ ...d, note: agoText(Date.parse(r.visitedAt), now, tz) }))).slice(0, 5),
    [m.recentTargets, now, tz],
  )
  const marks = useMemo(
    () => Object.values(highlights).filter((h) => !h.deleted).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12).flatMap((h) => {
      const loc = locate(subjects, h.sectionKey)
      return loc ? [{ h, loc }] : []
    }).slice(0, 3),
    [highlights, subjects],
  )
  if (!recent.length && !marks.length) return null
  return (
    <section className="card recent" style={{ '--i': 8 } as React.CSSProperties}>
      <h3 className="gh">Recent</h3>
      {recent.length > 0 && <DestRows items={recent} />}
      {marks.length > 0 && (
        <div className="rhl">
          {marks.map(({ h, loc }) => (
            <a key={h.id} href={href.reader(loc.chapter.key, loc.section.id, { h: h.id })} style={{ borderLeftColor: `var(--hl-${h.color})` }} title={`Highlight in ${loc.chapter.title}`}>{h.text.length > 110 ? h.text.slice(0, 110) + '…' : h.text}</a>
          ))}
          <a className="more" href={href.highlights()}>All highlights →</a>
        </div>
      )}
    </section>
  )
}

function FavouritesCard() {
  const list = useStore((s) => s.prefs.favourites)
  const favourites = useMemo(() => destinations(list), [list])
  return (
    <section className="card favs" style={{ '--i': 9 } as React.CSSProperties}>
      <h3 className="gh">Favourites</h3>
      {favourites.length ? <DestRows items={favourites} /> : <p className="none">Use “Add to favourites” on any chapter or subject to keep it here.</p>}
    </section>
  )
}
