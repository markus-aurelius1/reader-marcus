// Insights: Overview · Time · Subjects · Progress · Revision.
// Every study-time figure comes from lib/analytics.ts, which derives it from completed
// StudySession rows; progress and revision come from the reader's existing state. Nothing on
// these pages is stored. The pages describe what was recorded — they do not judge it.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { stageTitle, stages, type Chapter, type Subject } from '../lib/content'
import { STATUS_LABEL, chapterProgress, highlightsBySection, progressSummary, secTitle, useStore, type Status } from '../lib/store'
import { INSIGHTS_TABS, href, type InsightsTab } from '../lib/router'
import { navNode, refHref } from '../lib/nav'
import { activeTimer, clock, useStudy } from '../lib/study'
import { durationText, timeZone } from '../lib/timer'
import type { StudyContext, StudyDistribution, StudyHeatmapDay } from '../lib/contract'
import {
  chapterKeyOf, civil, compare, dayNo, dayOf, dayText, durationBins, heatmap, indexOf, period, series, summarize, totalBetween, weekStart,
  type Comparison, type PeriodKind, type Scope, type SessionStat, type StudyIndex,
} from '../lib/analytics'
import { BarChart, Heatmap, LineChart, type Datum } from '../components/Charts'
import { Meter } from './Pages'

export const TAB_LABEL: Record<InsightsTab, string> = { overview: 'Overview', time: 'Time', subjects: 'Subjects', progress: 'Progress', revision: 'Revision' }

interface Data {
  ix: StudyIndex
  now: number
  tz: string
}
type Span = 'week' | 'month' | 'year' | 'all'
const SPANS: [Span, string][] = [['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']]

export const timeText = (ms: number) => (ms < 1000 ? '0 min' : durationText(ms))
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const linkOf = (id: string) => {
  const n = navNode(id)
  return n ? refHref(n.target) : undefined
}
const nameOf = (id: string, fallback: string) => navNode(id)?.title ?? fallback
export function agoText(at: number, now: number, tz: string) {
  const d = dayOf(now, tz) - dayOf(at, tz)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}
/** Sat 3 Oct 2026 · 1 h 00 min · 1 session */
export const describeDay = (d: StudyHeatmapDay) => `${dayText(dayNo(+d.date.slice(0, 4), +d.date.slice(5, 7), +d.date.slice(8, 10)))} · ${d.durationMs ? `${timeText(d.durationMs)} · ${plural(d.sessionCount, 'session')}` : 'no tracked study'}`
const spanFrom = (span: Span, { ix, now, tz }: Data) => (span === 'all' ? (ix.slices[0]?.from ?? now) : period(span, now, tz).from)

/** The index for the stored sessions, and a `now` that moves on each minute and with each new session. */
export function useData(): Data {
  const sessions = useStudy((s) => s.sessions)
  const tz = timeZone()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const t = window.setInterval(bump, 60000)
    const seen = () => document.visibilityState === 'visible' && bump()
    document.addEventListener('visibilitychange', seen)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', seen)
    }
  }, [])
  const ix = useMemo(() => indexOf(sessions, tz), [sessions, tz])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => clock.now(), [tick, sessions])
  return { ix, now, tz }
}

export function InsightsPage({ subjects, tab }: { subjects: Subject[]; tab: InsightsTab }) {
  const data = useData()
  return (
    <div className="page wide">
      <div className="eyebrow">Where things stand</div>
      <h1 className="title">Insights</h1>
      <nav className="tabs" aria-label="Insights">
        {INSIGHTS_TABS.map((t) => <a key={t} className={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} href={href.insights(t)}>{TAB_LABEL[t]}</a>)}
      </nav>
      {tab === 'time' ? <Time {...data} /> : tab === 'subjects' ? <Subjects {...data} subjects={subjects} /> : tab === 'progress' ? <ProgressTab {...data} subjects={subjects} /> : tab === 'revision' ? <RevisionTab {...data} subjects={subjects} /> : <Overview {...data} />}
    </div>
  )
}

// ---- shared pieces ------------------------------------------------------------------
/** Shown instead of charts until there is something to chart. Never sample data. */
function NoData({ what }: { what: string }) {
  const running = useStudy((s) => !!activeTimer(s))
  return (
    <div className="shell-note nodata">
      <b>No tracked study time yet.</b> {what} appear after study sessions recorded with the timer: open a chapter and press <b>Start</b> in the header.
      {running && ' A timer is running now — its time is counted once it is stopped.'} <a href={href.study()}>Open the Study library →</a>
    </div>
  )
}

function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <span className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => <button key={v} className={'chip' + (value === v ? ' u' : '')} aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>)}
    </span>
  )
}

interface DistRow {
  id: string
  label: string
  ms: number
  /** Right-hand note: share of the total, or progress. */
  extra?: string
  title?: string
}
/** Horizontal bars, longest first; a row opens its subject / chapter when it is in the library. */
function Dist({ rows }: { rows: DistRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.ms))
  return (
    <div className="dist">
      {rows.map((r) => {
        const to = linkOf(r.id)
        const body = (
          <>
            <span className="dn">{nameOf(r.id, r.label)}</span>
            <Meter v={r.ms} max={max} />
            <span className="dv">{r.ms ? timeText(r.ms) : '—'}</span>
            {r.extra !== undefined && <span className="dx">{r.extra}</span>}
          </>
        )
        return to ? <a key={r.id} className="dr" href={to} title={r.title}>{body}</a> : <div key={r.id} className="dr" title={r.title}>{body}</div>
      })}
    </div>
  )
}
const share = (d: StudyDistribution): DistRow => ({ id: d.id, label: d.label, ms: d.durationMs, extra: `${Math.round(d.percent)}%` })

// ---- Overview -----------------------------------------------------------------------
const VS: Record<PeriodKind, string> = { day: 'yesterday', week: 'last week by now', month: 'last month by now', year: 'last year by now' }

/** What changed against the comparison period, in words; a percentage only when there is a base for one. */
export function changeText(c: Comparison, vs: string) {
  if (c.comparisonMs < 1000) return c.currentMs < 1000 ? `None ${vs} either` : `None ${vs}`
  const diff = c.changeAbsoluteMs
  if (Math.abs(diff) < 30000) return `Same as ${vs}: ${timeText(c.comparisonMs)}`
  const pct = c.changePercent === undefined ? '' : ` (${diff > 0 ? '+' : '−'}${Math.round(Math.abs(c.changePercent))}%)`
  return `${diff > 0 ? '▲' : '▼'} ${timeText(Math.abs(diff))}${pct} · ${timeText(c.comparisonMs)} ${vs}`
}

function Overview(data: Data) {
  const { ix, now, tz } = data
  const [span, setSpan] = useState<Span>('month')
  const running = useStudy((s) => !!activeTimer(s))
  const cards = useMemo(() => ([['day', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year']] as const).map(([k, title]) => ({ k, title, c: compare(ix, k, now) })), [ix, now])
  const from = spanFrom(span, data)
  const sum = useMemo(() => summarize(ix, from, now), [ix, from, now])
  if (!ix.sessions.length) {
    return (
      <>
        <NoData what="Study time, comparisons and the activity calendar" />
        <p className="lead" style={{ marginTop: 16 }}>Reading progress and the revision list do not depend on the timer: <a className="ilink" href={href.insights('progress')}>Progress →</a> · <a className="ilink" href={href.insights('revision')}>Revision →</a></p>
      </>
    )
  }
  const days = dayOf(now, tz) - dayOf(from, tz) + 1
  return (
    <>
      <div className="kpis">
        {cards.map(({ k, title, c }) => (
          <div className="kpi" key={k} data-k={k}>
            <small>{title}</small>
            <b>{timeText(c.currentMs)}</b>
            <span>{changeText(c, VS[k])}</span>
          </div>
        ))}
      </div>
      {running && <p className="fine">A timer is running now. Its time is counted once it is stopped.</p>}

      <div className="filters" style={{ marginTop: 26 }}><Chips value={span} options={SPANS} onChange={setSpan} label="Period" /></div>
      <div className="stat">
        <span><b>{timeText(sum.totalMs)}</b>study time</span>
        <span><b>{sum.sessionCount}</b>{sum.sessionCount === 1 ? 'session' : 'sessions'} completed</span>
        <span><b>{sum.sessionCount ? timeText(sum.averageSessionMs) : '—'}</b>average session</span>
        <span><b>{sum.sessionCount ? timeText(sum.longestSessionMs) : '—'}</b>longest session</span>
        <span><b>{sum.activeDays}</b>active study {sum.activeDays === 1 ? 'day' : 'days'} of {days}</span>
      </div>
      <h3 className="gh">Study time by subject</h3>
      {sum.bySubject.length ? <Dist rows={sum.bySubject.map(share)} /> : <p className="empty" style={{ padding: '4px 0' }}>No tracked study in this period.</p>}
      <p className="fine"><a className="ilink" href={href.insights('time')}>Daily chart and calendar →</a> · <a className="ilink" href={href.insights('subjects')}>Topics and chapters →</a></p>
    </>
  )
}

// ---- Time -----------------------------------------------------------------------------
const KINDS: [PeriodKind, string][] = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']]
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TREND: Record<PeriodKind, [number, string]> = { day: [14, 'days'], week: [12, 'weeks'], month: [12, 'months'], year: [5, 'years'] }

function SessionRows({ sessions, tz }: { sessions: SessionStat[]; tz: string }) {
  const when = useMemo(() => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), [tz])
  return (
    <div className="rows">
      {sessions.map((s) => {
        const c: StudyContext = s.contexts[0]
        const to = linkOf(chapterKeyOf(c))
        const body = (
          <>
            <span className="t">
              <b>{nameOf(chapterKeyOf(c), c.chapterTitle)}{s.contexts.length > 1 ? ` + ${plural(s.contexts.length - 1, 'more chapter')}` : ''}</b>
              <small>{stageTitle(c.ref.stage)} · {c.subjectTitle} · {when.format(s.from)}{s.source === 'recovered' ? ' · recovered' : ''}</small>
            </span>
            <span className="num wide">{timeText(s.ms)}</span>
          </>
        )
        return to ? <a className="row" key={s.id} href={to}>{body}</a> : <div className="row" key={s.id}>{body}</div>
      })}
    </div>
  )
}

function Time(data: Data) {
  const { ix, now, tz } = data
  const [kind, setKind] = useState<PeriodKind>('week')
  const [shift, setShift] = useState(0)
  const [scopeKey, setScopeKey] = useState('')
  const all = useMemo(() => summarize(ix, -Infinity, Infinity), [ix])
  const scope: Scope | undefined = useMemo(() => {
    if (!scopeKey) return undefined
    const [stage, subjectId] = scopeKey.split('/')
    return { stage: stage as Scope['stage'], subjectId }
  }, [scopeKey])
  const p = useMemo(() => period(kind, now, tz, shift), [kind, now, tz, shift])
  const view = useMemo(() => {
    const sum = summarize(ix, p.from, p.to, scope)
    const bars: Datum[] = series(ix, p.buckets, scope).map((b) => ({ key: b.key, label: b.label, title: b.title, value: b.durationMs }))
    const trend: Datum[] = Array.from({ length: TREND[kind][0] }, (_, i) => {
      const q = period(kind, now, tz, shift - (TREND[kind][0] - 1 - i))
      const c = civil(dayOf(q.from, tz))
      const short = kind === 'day' ? String(c.d) : kind === 'week' ? `${c.d}/${c.m}` : kind === 'month' ? MON[c.m - 1] : String(c.y)
      return { key: String(q.from), label: short, title: kind === 'week' ? `Week of ${q.label}` : q.label, value: totalBetween(ix, q.from, q.to, scope) }
    })
    const last = dayOf(now, tz)
    const cells = heatmap(ix, weekStart(last) - 52 * 7, last, scope)
    return { sum, bars, trend, cells }
  }, [ix, p, kind, now, tz, shift, scope])
  if (!ix.sessions.length) return <NoData what="The daily chart, the activity calendar and session lists" />

  const { sum, bars, trend, cells } = view
  const unit = kind === 'day' ? 'Hour' : kind === 'year' ? 'Month' : 'Day'
  const earliest = ix.slices[0].from
  const bins: Datum[] = durationBins(sum.sessions).map((b) => ({ key: b.label, label: b.label, title: b.title, value: b.count }))
  const active = cells.filter((d) => d.durationMs > 0)
  const longest = [...sum.sessions].sort((a, b) => b.ms - a.ms).slice(0, 5)
  const recent = [...sum.sessions].reverse().slice(0, 5)
  const scopeName = scopeKey ? nameOf(scopeKey, scopeKey) : ''
  return (
    <>
      <div className="filters">
        <Chips value={kind} options={KINDS} onChange={(k) => { setKind(k); setShift(0) }} label="Period" />
        <span className="stepper">
          <button className="ib" onClick={() => setShift(shift - 1)} disabled={p.from <= earliest} aria-label={`Previous ${kind}`} title={`Previous ${kind}`}><ChevronLeft /></button>
          <b aria-live="polite">{p.label}</b>
          <button className="ib" onClick={() => setShift(shift + 1)} disabled={shift >= 0} aria-label={`Next ${kind}`} title={`Next ${kind}`}><ChevronRight /></button>
        </span>
        <select className="sel" value={scopeKey} onChange={(e) => setScopeKey(e.target.value)} aria-label="Stage or subject">
          <option value="">All study</option>
          {all.byStage.length > 1 && all.byStage.map((d) => <option key={d.id} value={d.id}>{stageTitle(d.id)} — all subjects</option>)}
          {all.bySubject.map((d) => <option key={d.id} value={d.id}>{stageTitle(d.id.split('/')[0])} · {nameOf(d.id, d.label)}</option>)}
        </select>
      </div>
      <div className="stat">
        <span><b>{timeText(sum.totalMs)}</b>study time{scopeName ? ` · ${scopeName}` : ''}</span>
        <span><b>{sum.sessionCount}</b>{sum.sessionCount === 1 ? 'session' : 'sessions'} completed</span>
        <span><b>{sum.sessionCount ? timeText(sum.averageSessionMs) : '—'}</b>average session</span>
        <span><b>{sum.sessionCount ? timeText(sum.longestSessionMs) : '—'}</b>longest session</span>
        {kind !== 'day' && <span><b>{sum.activeDays}</b>active study {sum.activeDays === 1 ? 'day' : 'days'}</span>}
      </div>

      <h3 className="gh">Study time by {unit.toLowerCase()}</h3>
      {sum.totalMs > 0
        ? <BarChart data={bars} format={timeText} caption={`Study time by ${unit.toLowerCase()}, ${p.label}`} unit={unit} />
        : <p className="empty" style={{ padding: '4px 0' }}>No tracked study in this period.</p>}

      <h3 className="gh">Calendar · last 53 weeks</h3>
      <Heatmap days={cells} describe={describeDay} summary={`Study time on each day of the last 53 weeks: ${plural(active.length, 'day')} with study, ${timeText(active.reduce((n, d) => n + d.durationMs, 0))} in all.`} />

      <h3 className="gh">Trend · {TREND[kind][0]} {TREND[kind][1]} to {p.label}</h3>
      {trend.some((d) => d.value > 0)
        ? <LineChart data={trend} format={timeText} caption={`Study time in each of ${TREND[kind][0]} ${TREND[kind][1]}`} unit={kind[0].toUpperCase() + kind.slice(1)} />
        : <p className="empty" style={{ padding: '4px 0' }}>No tracked study in these {TREND[kind][1]}.</p>}

      {sum.sessionCount > 0 && (
        <>
          <h3 className="gh">Sessions by length</h3>
          <BarChart data={bins} format={(v) => plural(v, 'session')} caption={`Completed sessions by length, ${p.label}`} unit="Length" />
          <div className="two">
            <div><h3 className="gh">Longest sessions</h3><SessionRows sessions={longest} tz={tz} /></div>
            <div><h3 className="gh">Most recent sessions</h3><SessionRows sessions={recent} tz={tz} /></div>
          </div>
        </>
      )}
      <p className="fine">Days and weeks follow this device's timezone ({tz}); weeks run Monday to Sunday. A session that crosses midnight is split between the two days, and paused time is never counted.</p>
    </>
  )
}

// ---- Subjects -------------------------------------------------------------------------
function Subjects({ subjects, ...data }: Data & { subjects: Subject[] }) {
  const { ix, now, tz } = data
  const progress = useStore((s) => s.progress)
  const [span, setSpan] = useState<Span>('all')
  const from = spanFrom(span, data)
  const sum = useMemo(() => summarize(ix, from, now), [ix, from, now])
  if (!ix.sessions.length) return <NoData what="Time by stage, subject, topic and chapter" />

  const time = new Map(sum.bySubject.map((d) => [d.id, d]))
  // every subject in the library, most studied first; studied subjects no longer in it keep their row
  const rows: DistRow[] = [
    ...subjects.map((s) => ({ id: s.key, label: s.title, ms: time.get(s.key)?.durationMs ?? 0, extra: `${progressSummary(progress, s.chapters).completionPercent}% done`, title: `${Math.round(time.get(s.key)?.percent ?? 0)}% of study time in this period` })),
    ...sum.bySubject.filter((d) => !subjects.some((s) => s.key === d.id)).map((d) => ({ id: d.id, label: d.label, ms: d.durationMs, extra: '' })),
  ].sort((a, b) => b.ms - a.ms)
  const topicOf = (chapterId: string) => navNode(chapterId)?.parentId ?? ''
  const stale = [...subjects].sort((a, b) => (ix.last.get(a.key) ?? 0) - (ix.last.get(b.key) ?? 0))
  return (
    <>
      <div className="filters"><Chips value={span} options={SPANS} onChange={setSpan} label="Period" /><span>{timeText(sum.totalMs)} tracked</span></div>

      <h3 className="gh">By exam stage</h3>
      {sum.byStage.length ? <Dist rows={sum.byStage.map((d) => ({ ...share(d), label: stageTitle(d.id) }))} /> : <p className="empty" style={{ padding: '4px 0' }}>No tracked study in this period.</p>}

      <h3 className="gh">By subject · most studied first · reading progress beside</h3>
      <Dist rows={rows} />

      {sum.bySubject.length > 0 && <h3 className="gh">By topic and chapter</h3>}
      {sum.bySubject.map((d) => {
        const topics = sum.byTopic.filter((t) => t.id.startsWith(d.id + '~'))
        const chapters = sum.byChapter.filter((c) => c.id.startsWith(d.id + '/'))
        return (
          <details className="syn" key={d.id}>
            <summary>{nameOf(d.id, d.label)} <small className="sm">— {timeText(d.durationMs)} · {plural(chapters.length, 'chapter')}</small></summary>
            {topics.map((t) => {
              const own = chapters.filter((c) => (topicOf(c.id) || t.id) === t.id)
              return (
                <div key={t.id}>
                  <div className="th"><b>{nameOf(t.id, t.label)}</b><span>{timeText(t.durationMs)}</span></div>
                  <Dist rows={own.map((c) => ({ id: c.id, label: c.label, ms: c.durationMs, extra: `${Math.round((c.durationMs / d.durationMs) * 100)}%` }))} />
                </div>
              )
            })}
          </details>
        )
      })}

      <h3 className="gh" style={{ marginTop: 26 }}>Least recently studied</h3>
      <div className="rows">
        {stale.map((s) => {
          const last = ix.last.get(s.key)
          return (
            <a className="row" key={s.key} href={href.subject(s.key)}>
              <span className="t"><b>{s.title}</b><small>{stageTitle(s.stage)} · {last ? `last studied ${agoText(last, now, tz)} · ${dayText(dayOf(last, tz))}` : 'not studied with the timer yet'}</small></span>
              <span className="num wide">{timeText(ix.total.get(s.key) ?? 0)}</span>
            </a>
          )
        })}
      </div>
    </>
  )
}

// ---- Progress (the reader's progress page, with flags and study time beside it) ------------
const STATUSES = Object.keys(STATUS_LABEL) as Status[]
const FIELD = { new: 'notStarted', reading: 'reading', revised: 'revised', mastered: 'mastered' } as const

function ProgressTab({ ix, now, tz, subjects }: Data & { subjects: Subject[] }) {
  const progress = useStore((s) => s.progress)
  const { setChapter } = useStore.getState()
  const overall = stages.map((st) => ({ st, list: subjects.filter((s) => s.stage === st.id) })).filter((x) => x.list.length)
  return (
    <>
      <div className="kpis">
        {overall.map(({ st, list }) => {
          const p = progressSummary(progress, list.flatMap((s) => s.chapters))
          return (
            <div className="kpi" key={st.id} data-stage={st.id}>
              <small>{st.title} overall · {plural(list.length, 'subject')}</small>
              <b>{p.completionPercent}%</b>
              <span>{p.sectionsDone} of {p.sectionsTotal} sections done</span>
              <div className="sbar" role="img" aria-label={STATUSES.map((s) => `${p[FIELD[s]]} ${STATUS_LABEL[s]}`).join(', ')}>
                {STATUSES.map((s) => p[FIELD[s]] > 0 && <i key={s} data-s={s} style={{ flexGrow: p[FIELD[s]] }} />)}
              </div>
              <span>{plural(p.totalUnits, 'chapter')}: {STATUSES.map((s) => `${p[FIELD[s]]} ${STATUS_LABEL[s].toLowerCase()}`).join(' · ')}</span>
              <span>★ {p.difficult} difficult · ↻ {p.revise} to revise · {timeText(ix.total.get(st.id) ?? 0)} tracked</span>
            </div>
          )
        })}
      </div>
      {subjects.map((s) => {
        const p = progressSummary(progress, s.chapters)
        const last = ix.last.get(s.key)
        return (
          <section key={s.key}>
            <h2 className="sh"><a href={href.subject(s.key)}>{stageTitle(s.stage)} · {s.title}</a></h2>
            <div className="stat">
              <span><b>{p.completionPercent}%</b>sections done ({p.sectionsDone}/{p.sectionsTotal})</span>
              {STATUSES.map((st) => <span key={st}><b>{p[FIELD[st]]}</b>{STATUS_LABEL[st]}</span>)}
              <span><b>{p.difficult}</b>★ Difficult</span>
              <span><b>{p.revise}</b>↻ Revise</span>
              <span><b>{timeText(ix.total.get(s.key) ?? 0)}</b>tracked{last ? ` · last ${agoText(last, now, tz)}` : ''}</span>
            </div>
            <div className="rows">
              {s.chapters.map((c) => {
                const cp = chapterProgress(progress, c)
                const flags = progressSummary(progress, [c])
                const ms = ix.total.get(c.key) ?? 0
                return (
                  <div className="row" key={c.key}>
                    <i className="dot" data-s={cp.status} />
                    <a className="t" href={href.reader(c.key)}>
                      <b>{c.title}</b>
                      <small>{[c.topicTitle, ms > 0 && `${timeText(ms)} tracked`, flags.difficult > 0 && `★ ${flags.difficult}`, flags.revise > 0 && `↻ ${flags.revise}`].filter(Boolean).join(' · ')}</small>
                    </a>
                    <select className="sel hide-sm" aria-label={`Status of ${c.title}`} value={cp.status} onChange={(e) => setChapter(c.key, { status: e.target.value as Status })}>
                      {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                    </select>
                    <Meter v={cp.done} max={cp.total} />
                    <span className="num">{cp.done}/{cp.total}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
      {subjects.length === 0 && <p className="empty">No subjects added yet.</p>}
    </>
  )
}

// ---- Revision ---------------------------------------------------------------------------
type Mode = 'all' | 'revise' | 'difficult'

function RevisionTab({ ix, now, tz, subjects }: Data & { subjects: Subject[] }) {
  const progress = useStore((s) => s.progress)
  const overrides = useStore((s) => s.overrides)
  const highlights = useStore((s) => s.highlights)
  const { setSection } = useStore.getState()
  const [mode, setMode] = useState<Mode>('all')
  const [order, setOrder] = useState<'library' | 'stale'>('library')
  const marks = useMemo(() => highlightsBySection(highlights), [highlights])
  // when a section was last timed: its own time if it was tracked by section, else its chapter's
  const studied = (c: Chapter, sectionKey?: string) => {
    const own = sectionKey ? ix.last.get(sectionKey) : undefined
    const at = own ?? ix.last.get(c.key)
    return { at: at ?? 0, text: at ? `${own ? 'last studied' : 'chapter last studied'} ${agoText(at, now, tz)}` : 'not timed yet' }
  }
  const flagged = subjects.flatMap((s) => s.chapters.flatMap((c) => c.sections.map((x) => ({ s, c, x, st: progress.sections[x.key] ?? {} })))).filter((i) => i.st.revise || i.st.difficult)
  const items = flagged.filter((i) => (mode === 'revise' ? i.st.revise : mode === 'difficult' ? i.st.difficult : true))
  const groups: { key: string; title: string; list: typeof items }[] = []
  if (order === 'stale') {
    if (items.length) groups.push({ key: 'stale', title: 'Longest since studied first', list: [...items].sort((a, b) => studied(a.c, a.x.key).at - studied(b.c, b.x.key).at) })
  } else {
    for (const i of items) {
      const g = groups[groups.length - 1]
      if (g?.key === i.c.key) g.list.push(i)
      else groups.push({ key: i.c.key, title: `${stageTitle(i.s.stage)} › ${i.s.title} › ${i.c.title}`, list: [i] })
    }
  }
  const reading = subjects.flatMap((s) => s.chapters.filter((c) => progress.chapters[c.key]?.status === 'reading').map((c) => ({ s, c })))
  return (
    <>
      <div className="stat">
        <span><b>{flagged.filter((i) => i.st.difficult).length}</b>★ Difficult</span>
        <span><b>{flagged.filter((i) => i.st.revise).length}</b>↻ Revise</span>
        <span><b>{reading.length}</b>{reading.length === 1 ? 'chapter' : 'chapters'} in progress</span>
      </div>
      <div className="filters">
        <Chips value={mode} options={[['all', 'All'], ['revise', '↻ Revise'], ['difficult', '★ Difficult']]} onChange={setMode} label="Show" />
        <select className="sel" value={order} onChange={(e) => setOrder(e.target.value as typeof order)} aria-label="Order">
          <option value="library">In library order</option>
          <option value="stale">Longest since studied first</option>
        </select>
      </div>
      {groups.length === 0 && <p className="empty">Nothing queued. Use ↻ or ★ beside any section heading to send it here.</p>}
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="gh">{g.title}</h3>
          <div className="rows">
            {g.list.map(({ s, c, x, st }) => {
              const hl = marks[x.key] ?? []
              return (
                <div className="row rv" key={x.key}>
                  <div className="t">
                    <a href={href.reader(c.key, x.id)}><b>{secTitle(overrides, x)}</b></a>
                    <small>{[st.revise && '↻ Revise', st.difficult && '★ Difficult', st.done && 'done', studied(c, x.key).text, order === 'stale' && `${s.title} › ${c.title}`].filter(Boolean).join(' · ')}</small>
                    {hl.length > 0 && (
                      <div className="rhl">
                        {hl.slice(0, 2).map((h) => <a key={h.id} href={href.reader(c.key, x.id, { h: h.id })} style={{ borderLeftColor: `var(--hl-${h.color})` }} title="Open this highlight">{h.text.length > 110 ? h.text.slice(0, 110) + '…' : h.text}</a>)}
                        {hl.length > 2 && <a className="more" href={href.highlights()}>+ {plural(hl.length - 2, 'more highlight')}</a>}
                      </div>
                    )}
                  </div>
                  <button className="linkbtn" onClick={() => setSection(x.key, { revise: false, difficult: false })}>Clear</button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {reading.length > 0 && (
        <>
          <h3 className="gh" style={{ marginTop: 28 }}>Chapters in progress</h3>
          <div className="rows">
            {reading.map(({ s, c }) => {
              const cp = chapterProgress(progress, c)
              return (
                <a className="row" key={c.key} href={href.reader(c.key, undefined, { resume: true })}>
                  <i className="dot" data-s="reading" />
                  <span className="t"><b>{c.title}</b><small>{s.title} · {cp.total - cp.done} of {cp.total} sections left · {studied(c).text}</small></span>
                  <Meter v={cp.done} max={cp.total} />
                  <span className="num">{cp.done}/{cp.total}</span>
                </a>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
