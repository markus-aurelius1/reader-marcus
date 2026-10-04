// Study-time analytics. Pure: everything is computed from completed StudySession rows, a
// timezone and `now` — nothing here is stored, synced or counted up over time.
// docs/READER_V2_CONTRACT.md → "Analytics rules as built". Unit-tested in analytics.test.ts.
//
// buildIndex turns the sessions into day-sized slices of active study, with no wall-clock
// moment counted twice. Every figure the Insights pages show is a sum over those slices. The
// index is a regenerable in-memory cache (indexOf); it is never authoritative.
import type { AnalyticsFilter, StudyAnalytics, StudyContext, StudyDistribution, StudyHeatmapDay, StudySession, StudyStreak, TimeBucket } from './contract'

const DAY = 86400000
const HOUR = 3600000

// ---- civil calendar in an IANA timezone --------------------------------------------
// A calendar day is a day number: days since 1970-01-01 of its civil date (timezone-free).
const fmts = new Map<string, Intl.DateTimeFormat>()
function fmt(tz: string) {
  let f = fmts.get(tz)
  if (!f) {
    const opts: Intl.DateTimeFormatOptions = { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }
    try {
      f = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: tz })
    } catch {
      f = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }) // unknown zone name
    }
    fmts.set(tz, f)
  }
  return f
}
function wall(ms: number, tz: string) {
  const o: Record<string, number> = {}
  for (const p of fmt(tz).formatToParts(ms)) if (p.type !== 'literal') o[p.type] = +p.value
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}
const offset = (ms: number, tz: string) => {
  const w = wall(ms, tz)
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(ms / 1000) * 1000
}

/** Day number of a civil date; month and day may overflow (month 13, day 0) and are normalised. */
export const dayNo = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m - 1, d) / DAY)
export const civil = (dn: number) => {
  const d = new Date(dn * DAY)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() }
}
/** YYYY-MM-DD */
export const dateKey = (dn: number) => new Date(dn * DAY).toISOString().slice(0, 10)
/** The local calendar day an instant falls on. */
export function dayOf(ms: number, tz: string) {
  const w = wall(ms, tz)
  return dayNo(w.year, w.month, w.day)
}

const starts = new Map<string, Map<number, number>>()
/** First instant of a local calendar day — correct across DST changes, including at midnight. */
export function dayStart(dn: number, tz: string): number {
  let cache = starts.get(tz)
  if (!cache) starts.set(tz, (cache = new Map()))
  let v = cache.get(dn)
  if (v === undefined) {
    const target = dn * DAY
    // the offset may change close to midnight: try the one before and the one after
    const cands = [target - offset(target - DAY / 2, tz), target - offset(target + DAY / 2, tz)]
    const ok = cands.filter((c) => dayOf(c, tz) === dn)
    v = ok.length ? Math.min(...ok) : cands[0]
    cache.set(dn, v)
  }
  return v
}

const label = (dn: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(dn * DAY)
/** Sat 3 Oct 2026 */
export const dayText = (dn: number) => label(dn, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ---- index -----------------------------------------------------------------------
export const subjectKeyOf = (c: StudyContext) => `${c.ref.stage}/${c.ref.subjectId}`
export const chapterKeyOf = (c: StudyContext) => `${subjectKeyOf(c)}/${c.ref.chapterId}`
const topicKeyOf = (c: StudyContext) => `${subjectKeyOf(c)}~${c.ref.topicId ?? ''}`

/** One session as analytics sees it: its active study time, with nothing double-counted. */
export interface SessionStat {
  id: string
  from: number
  to: number
  ms: number
  source: StudySession['source']
  /** Chapters studied, in order (one entry per chapter). */
  contexts: StudyContext[]
}
/** A stretch of active study inside one local calendar day, on one tracked unit. */
export interface Slice {
  from: number
  to: number
  day: number
  ctx: StudyContext
  session: SessionStat
  /** Set when the time was spent revising: which review (R1 = 1 …) of which unit. Absent = initial study. */
  rev?: { ordinal: number; unitId?: string }
}
export interface StudyIndex {
  tz: string
  /** Sorted, non-overlapping. */
  slices: Slice[]
  /** Sessions with study time, ordered by when they ended. */
  sessions: SessionStat[]
  /** All-time study time and the last moment studied, by stage / subject / chapter / section key. */
  total: Map<string, number>
  last: Map<string, number>
}

export function buildIndex(sessions: Iterable<StudySession>, tz: string): StudyIndex {
  const spans: { from: number; to: number; ctx: StudyContext; session: SessionStat; rev?: Slice['rev'] }[] = []
  for (const s of sessions) {
    const session: SessionStat = { id: s.id, from: Infinity, to: -Infinity, ms: 0, source: s.source, contexts: [] }
    for (const x of s.spans ?? []) {
      const from = Date.parse(x.startedAt)
      // a span is an unbroken stretch of active study, so it runs from startedAt for durationMs
      if (Number.isFinite(from) && x.durationMs > 0 && x.context?.ref) spans.push({ from, to: from + x.durationMs, ctx: x.context, session, ...(x.activity === 'revision' ? { rev: { ordinal: Math.max(1, x.revisionOrdinal ?? 1), unitId: x.revisionUnitId } } : {}) })
    }
  }
  spans.sort((a, b) => a.from - b.from || b.to - a.to || (a.session.id < b.session.id ? -1 : 1))

  const slices: Slice[] = []
  const total = new Map<string, number>()
  const last = new Map<string, number>()
  const seen = new Set<SessionStat>()
  let cursor = -Infinity // everything before this instant is already counted
  let dn = 0
  let dayFrom = 1
  let dayTo = 0
  for (const sp of spans) {
    // Two devices that ran at once overlap in wall-clock time: the overlap counts once, for
    // whichever span began first.
    const from = Math.max(sp.from, cursor)
    if (from >= sp.to) continue
    cursor = sp.to
    const ms = sp.to - from
    const s = sp.session
    s.from = Math.min(s.from, from)
    s.to = Math.max(s.to, sp.to)
    s.ms += ms
    const ck = chapterKeyOf(sp.ctx)
    if (!s.contexts.some((c) => chapterKeyOf(c) === ck)) s.contexts.push(sp.ctx)
    seen.add(s)
    const keys = [sp.ctx.ref.stage, subjectKeyOf(sp.ctx), ck, ...(sp.ctx.ref.sectionId ? [`${ck}/${sp.ctx.ref.sectionId}`] : [])]
    for (const k of keys) {
      total.set(k, (total.get(k) ?? 0) + ms)
      last.set(k, Math.max(last.get(k) ?? 0, sp.to))
    }
    // a span that crosses local midnight is cut there
    for (let a = from; a < sp.to; ) {
      if (a < dayFrom || a >= dayTo) {
        dn = dayOf(a, tz)
        dayFrom = dayStart(dn, tz)
        dayTo = dayStart(dn + 1, tz)
      }
      const b = Math.min(sp.to, Math.max(dayTo, a + 1))
      slices.push({ from: a, to: b, day: dn, ctx: sp.ctx, session: s, ...(sp.rev ? { rev: sp.rev } : {}) })
      a = b
    }
  }
  return { tz, slices, sessions: [...seen].sort((a, b) => a.to - b.to), total, last }
}

let memo: { src: object; tz: string; ix: StudyIndex } | null = null
/** The index for the store's sessions, rebuilt only when they change. */
export function indexOf(sessions: Record<string, StudySession>, tz: string): StudyIndex {
  if (!memo || memo.src !== sessions || memo.tz !== tz) memo = { src: sessions, tz, ix: buildIndex(Object.values(sessions), tz) }
  return memo.ix
}

// ---- queries ---------------------------------------------------------------------
export type Scope = Pick<AnalyticsFilter, 'stage' | 'paperId' | 'subjectId' | 'topicId' | 'chapterId'>
const scoped = (f?: Scope) => !!f && !!(f.stage || f.paperId || f.subjectId || f.topicId || f.chapterId)
const matches = (c: StudyContext, f: Scope) =>
  (!f.stage || c.ref.stage === f.stage) && (!f.paperId || c.ref.paperId === f.paperId) && (!f.subjectId || c.ref.subjectId === f.subjectId) && (!f.topicId || c.ref.topicId === f.topicId) && (!f.chapterId || c.ref.chapterId === f.chapterId)

/** First slice that ends after `t`. */
function firstAfter(slices: Slice[], t: number) {
  let lo = 0
  let hi = slices.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (slices[mid].to > t) hi = mid
    else lo = mid + 1
  }
  return lo
}

/** Each slice between `from` and `to` (clipped to them) that is in scope. */
function each(ix: StudyIndex, from: number, to: number, scope: Scope | undefined, fn: (s: Slice, ms: number) => void) {
  const f = scoped(scope) ? scope! : null
  for (let i = firstAfter(ix.slices, from); i < ix.slices.length; i++) {
    const s = ix.slices[i]
    if (s.from >= to) break
    if (f && !matches(s.ctx, f)) continue
    const ms = Math.min(s.to, to) - Math.max(s.from, from)
    if (ms > 0) fn(s, ms)
  }
}

// ---- initial study and revision, kept apart ----------------------------------------------
/** Time by what it was spent on: index 0 = initial study, 1 – 4 = R1 – R4, 5 = R5 and later. */
export type OrdinalTime = [number, number, number, number, number, number]
export const ORDINAL_LABEL = ['Initial', 'R1', 'R2', 'R3', 'R4', 'R5+'] as const
export interface TopicTime {
  /** Chapter key, or section key for a row inside a chapter. */
  key: string
  ctx: StudyContext
  time: OrdinalTime
  totalMs: number
  /** Sections of the chapter that were revised, or timed on their own. */
  sections?: TopicTime[]
}
export interface ActivityTime {
  initialMs: number
  revisionMs: number
  time: OrdinalTime
  bySubject: { key: string; label: string; initialMs: number; revisionMs: number }[]
  /** Chapters, most time first. */
  byTopic: TopicTime[]
}
const zero = (): OrdinalTime => [0, 0, 0, 0, 0, 0]

/**
 * Initial study and each revision round, separately — per topic and overall. Derived from the
 * spans like every other figure: a span is initial study unless it was recorded as a revision,
 * and a revision span carries the number of its review.
 */
export function activityTime(ix: StudyIndex, from = -Infinity, to = Infinity, scope?: Scope): ActivityTime {
  const time = zero()
  const subjects = new Map<string, ActivityTime['bySubject'][number]>()
  const chapters = new Map<string, TopicTime & { secs: Map<string, TopicTime> }>()
  each(ix, from, to, scope, (s, ms) => {
    const slot = s.rev ? Math.min(5, s.rev.ordinal) : 0
    time[slot] += ms
    const sk = subjectKeyOf(s.ctx)
    const sub = subjects.get(sk) ?? subjects.set(sk, { key: sk, label: s.ctx.subjectTitle, initialMs: 0, revisionMs: 0 }).get(sk)!
    if (slot) sub.revisionMs += ms
    else sub.initialMs += ms
    const ck = chapterKeyOf(s.ctx)
    const ch = chapters.get(ck) ?? chapters.set(ck, { key: ck, ctx: s.ctx, time: zero(), totalMs: 0, secs: new Map() }).get(ck)!
    ch.time[slot] += ms
    ch.totalMs += ms
    if (s.ctx.ref.sectionId) {
      const key = `${ck}/${s.ctx.ref.sectionId}`
      const sec = ch.secs.get(key) ?? ch.secs.set(key, { key, ctx: s.ctx, time: zero(), totalMs: 0 }).get(key)!
      sec.time[slot] += ms
      sec.totalMs += ms
    }
  })
  const revisionMs = time.slice(1).reduce((n, v) => n + v, 0)
  return {
    initialMs: time[0],
    revisionMs,
    time,
    bySubject: [...subjects.values()].sort((a, b) => b.initialMs + b.revisionMs - (a.initialMs + a.revisionMs)),
    byTopic: [...chapters.values()].sort((a, b) => b.totalMs - a.totalMs).map(({ secs, ...c }) => ({ ...c, sections: [...secs.values()].sort((a, b) => b.totalMs - a.totalMs) })),
  }
}

export const totalBetween = (ix: StudyIndex, from: number, to: number, scope?: Scope) => {
  let n = 0
  each(ix, from, to, scope, (_s, ms) => (n += ms))
  return n
}

export interface Summary {
  from: number
  to: number
  totalMs: number
  /** Local calendar days with any study time. */
  activeDays: number
  /** Sessions that ended in the window, each at its full length. */
  sessions: SessionStat[]
  sessionCount: number
  averageSessionMs: number
  longestSessionMs: number
  byStage: StudyDistribution[]
  bySubject: StudyDistribution[]
  byTopic: StudyDistribution[]
  byChapter: StudyDistribution[]
}

export function summarize(ix: StudyIndex, from: number, to: number, scope?: Scope): Summary {
  let totalMs = 0
  const days = new Set<number>()
  const groups = [new Map(), new Map(), new Map(), new Map()] as Map<string, { label: string; ms: number }>[]
  const add = (m: Map<string, { label: string; ms: number }>, id: string, label: string, ms: number) => {
    const g = m.get(id)
    if (g) g.ms += ms
    else m.set(id, { label, ms })
  }
  each(ix, from, to, scope, (s, ms) => {
    totalMs += ms
    days.add(s.day)
    add(groups[0], s.ctx.ref.stage, s.ctx.ref.stage, ms)
    add(groups[1], subjectKeyOf(s.ctx), s.ctx.subjectTitle, ms)
    add(groups[2], topicKeyOf(s.ctx), s.ctx.topicTitle ?? s.ctx.subjectTitle, ms)
    add(groups[3], chapterKeyOf(s.ctx), s.ctx.chapterTitle, ms)
  })
  const dist = (m: Map<string, { label: string; ms: number }>): StudyDistribution[] =>
    [...m].map(([id, g]) => ({ id, label: g.label, durationMs: g.ms, percent: totalMs ? (g.ms / totalMs) * 100 : 0 })).sort((a, b) => b.durationMs - a.durationMs)

  // a session belongs to the window it ended in; in a scope, only its time in that scope counts
  let own: Map<SessionStat, number> | null = null
  if (scoped(scope)) {
    own = new Map()
    for (const s of ix.slices) if (matches(s.ctx, scope!)) own.set(s.session, (own.get(s.session) ?? 0) + s.to - s.from)
  }
  const sessions: SessionStat[] = []
  for (const s of ix.sessions) {
    if (s.to <= from || s.to > to) continue
    if (!own) sessions.push(s)
    else if (own.has(s)) sessions.push({ ...s, ms: own.get(s)! })
  }
  const sum = sessions.reduce((n, s) => n + s.ms, 0)
  return {
    from, to, totalMs,
    activeDays: days.size,
    sessions,
    sessionCount: sessions.length,
    averageSessionMs: sessions.length ? sum / sessions.length : 0,
    longestSessionMs: sessions.reduce((n, s) => Math.max(n, s.ms), 0),
    byStage: dist(groups[0]), bySubject: dist(groups[1]), byTopic: dist(groups[2]), byChapter: dist(groups[3]),
  }
}

// ---- periods and buckets -------------------------------------------------------------
export type PeriodKind = 'day' | 'week' | 'month' | 'year'
export interface Bucket {
  key: string
  /** Axis label. */
  label: string
  /** Full name, for tooltips and tables. */
  title: string
  from: number
  to: number
}
export interface Period {
  kind: PeriodKind
  from: number
  to: number
  label: string
  buckets: Bucket[]
}

/** Monday of the week containing `dn`. */
export const weekStart = (dn: number) => dn - ((civil(dn).wd + 6) % 7)

const dayBucket = (dn: number, tz: string, text: string): Bucket => ({ key: dateKey(dn), label: text, title: dayText(dn), from: dayStart(dn, tz), to: dayStart(dn + 1, tz) })

/** The calendar day / week (Monday–Sunday) / month / year containing `now`, moved by `shift` periods. */
export function period(kind: PeriodKind, now: number, tz: string, shift = 0): Period {
  const today = dayOf(now, tz)
  const { y, m } = civil(today)
  if (kind === 'day') {
    const dn = today + shift
    const from = dayStart(dn, tz)
    const to = dayStart(dn + 1, tz)
    const buckets: Bucket[] = []
    // hour by hour from local midnight: 23 or 25 buckets on a DST day
    for (let t = from; t < to; t += HOUR) {
      const h = String(wall(t, tz).hour).padStart(2, '0')
      buckets.push({ key: new Date(t).toISOString(), label: h, title: `${h}:00`, from: t, to: Math.min(t + HOUR, to) })
    }
    return { kind, from, to, label: dayText(dn), buckets }
  }
  if (kind === 'week') {
    const a = weekStart(today) + shift * 7
    const buckets = Array.from({ length: 7 }, (_, i) => dayBucket(a + i, tz, label(a + i, { weekday: 'short' })))
    return { kind, from: buckets[0].from, to: buckets[6].to, label: `${label(a, { day: 'numeric', month: 'short' })} – ${label(a + 6, { day: 'numeric', month: 'short', year: 'numeric' })}`, buckets }
  }
  if (kind === 'month') {
    const a = dayNo(y, m + shift, 1)
    const b = dayNo(y, m + shift + 1, 1)
    const buckets = Array.from({ length: b - a }, (_, i) => dayBucket(a + i, tz, String(i + 1)))
    return { kind, from: buckets[0].from, to: buckets[buckets.length - 1].to, label: label(a, { month: 'long', year: 'numeric' }), buckets }
  }
  const yy = y + shift
  const buckets = MONTHS.map((name, i) => ({ key: `${yy}-${String(i + 1).padStart(2, '0')}`, label: name, title: `${name} ${yy}`, from: dayStart(dayNo(yy, i + 1, 1), tz), to: dayStart(dayNo(yy, i + 2, 1), tz) }))
  return { kind, from: buckets[0].from, to: buckets[11].to, label: String(yy), buckets }
}

/** One bucket per local calendar day, first to last inclusive. */
export const dayBuckets = (first: number, lastDay: number, tz: string): Bucket[] =>
  Array.from({ length: Math.max(0, lastDay - first + 1) }, (_, i) => dayBucket(first + i, tz, String(civil(first + i).d)))

/** Study time in each bucket (buckets in time order, not overlapping). */
export function series(ix: StudyIndex, buckets: Bucket[], scope?: Scope): (TimeBucket & { title: string })[] {
  const out = buckets.map((b) => ({ key: b.key, label: b.label, title: b.title, durationMs: 0 }))
  if (!buckets.length) return out
  let at = 0
  each(ix, buckets[0].from, buckets[buckets.length - 1].to, scope, (s) => {
    while (at < buckets.length && buckets[at].to <= s.from) at++
    for (let j = at; j < buckets.length && buckets[j].from < s.to; j++) {
      const ms = Math.min(s.to, buckets[j].to) - Math.max(s.from, buckets[j].from)
      if (ms > 0) out[j].durationMs += ms
    }
  })
  return out
}

// ---- comparisons ---------------------------------------------------------------------
export interface Windows {
  current: [number, number]
  comparison: [number, number]
}

/**
 * The period so far, and what it is compared with:
 *   day    today so far          ↔ the whole of yesterday
 *   week   Monday → now          ↔ last week's Monday → the same weekday, the same time into the day
 *   month  the 1st → now         ↔ last month's 1st → the same day of the month, the same time
 *   year   1 January → now       ↔ last year's 1 January → the same date, the same time
 * Where the earlier month has no such day (the 31st; 29 February), it is taken to its end.
 */
export function windows(kind: PeriodKind, now: number, tz: string): Windows {
  const today = dayOf(now, tz)
  const into = now - dayStart(today, tz)
  const { y, m, d } = civil(today)
  // `prev` + the time elapsed today, never running past the end of that day
  const upTo = (prev: number) => Math.min(dayStart(prev, tz) + into, dayStart(prev + 1, tz))
  if (kind === 'day') return { current: [dayStart(today, tz), now], comparison: [dayStart(today - 1, tz), dayStart(today, tz)] }
  if (kind === 'week') {
    const a = weekStart(today)
    return { current: [dayStart(a, tz), now], comparison: [dayStart(a - 7, tz), upTo(today - 7)] }
  }
  const first = kind === 'month' ? dayNo(y, m, 1) : dayNo(y, 1, 1)
  const prevFirst = kind === 'month' ? dayNo(y, m - 1, 1) : dayNo(y - 1, 1, 1)
  // the month the comparison ends in
  const [py, pm] = kind === 'month' ? [y, m - 1] : [y - 1, m]
  const days = dayNo(py, pm + 1, 1) - dayNo(py, pm, 1)
  const end = d > days ? dayStart(dayNo(py, pm + 1, 1), tz) : upTo(dayNo(py, pm, d))
  return { current: [dayStart(first, tz), now], comparison: [dayStart(prevFirst, tz), end] }
}

export interface Comparison extends Windows {
  currentMs: number
  comparisonMs: number
  changeAbsoluteMs: number
  /** Absent when there is nothing to divide by — never an infinite or made-up percentage. */
  changePercent?: number
}
/** Below this, a comparison period is too small for a percentage to mean anything. */
export const MIN_PERCENT_BASE_MS = 60000

function change(ix: StudyIndex, w: Windows, scope?: Scope): Comparison {
  const currentMs = totalBetween(ix, w.current[0], w.current[1], scope)
  const comparisonMs = totalBetween(ix, w.comparison[0], w.comparison[1], scope)
  return { ...w, currentMs, comparisonMs, changeAbsoluteMs: currentMs - comparisonMs, ...(comparisonMs >= MIN_PERCENT_BASE_MS ? { changePercent: ((currentMs - comparisonMs) / comparisonMs) * 100 } : {}) }
}
export const compare = (ix: StudyIndex, kind: PeriodKind, now: number, scope?: Scope) => change(ix, windows(kind, now, ix.tz), scope)

// ---- heatmap -------------------------------------------------------------------------
/** One entry per local calendar day, first to last inclusive, including days with nothing. */
export function heatmap(ix: StudyIndex, first: number, lastDay: number, scope?: Scope): StudyHeatmapDay[] {
  const acc = new Map<number, { ms: number; sessions: Set<SessionStat> }>()
  each(ix, dayStart(first, ix.tz), dayStart(lastDay + 1, ix.tz), scope, (s, ms) => {
    let a = acc.get(s.day)
    if (!a) acc.set(s.day, (a = { ms: 0, sessions: new Set() }))
    a.ms += ms
    a.sessions.add(s.session)
  })
  return Array.from({ length: Math.max(0, lastDay - first + 1) }, (_, i) => {
    const a = acc.get(first + i)
    return { date: dateKey(first + i), durationMs: a?.ms ?? 0, sessionCount: a?.sessions.size ?? 0 }
  })
}

// ---- streaks -------------------------------------------------------------------------
/** Study time on each local calendar day that has any (up to and including today). */
function dayTotals(ix: StudyIndex, today: number) {
  const days = new Map<number, number>()
  for (const s of ix.slices) {
    if (s.day > today) break
    days.set(s.day, (days.get(s.day) ?? 0) + s.to - s.from)
  }
  return days
}

/** Consecutive local calendar days with study time. A streak is still alive today if yesterday had study. */
export function streak(ix: StudyIndex, now: number): StudyStreak {
  const today = dayOf(now, ix.tz)
  let run = 0
  let longest = 0
  let prev = -Infinity
  for (const d of dayTotals(ix, today).keys()) {
    run = d === prev + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = d
  }
  return { currentDays: prev >= today - 1 ? run : 0, longestDays: longest, ...(Number.isFinite(prev) ? { lastStudyDate: dateKey(prev) } : {}) }
}

/** Consecutive days on which study time reached `targetMs`, ending today — or yesterday while today is still short of it. */
export function goalStreak(ix: StudyIndex, now: number, targetMs: number): number {
  if (!(targetMs > 0)) return 0
  const today = dayOf(now, ix.tz)
  const days = dayTotals(ix, today)
  const met = (d: number) => (days.get(d) ?? 0) >= targetMs
  let d = met(today) ? today : today - 1
  let n = 0
  while (met(d)) {
    n++
    d--
  }
  return n
}

// ---- session lengths -----------------------------------------------------------------
const MIN = 60000
export const DURATION_BINS = [
  { label: '< 15 min', title: 'Under 15 minutes', below: 15 * MIN },
  { label: '15–30', title: '15 to 30 minutes', below: 30 * MIN },
  { label: '30–60', title: '30 to 60 minutes', below: 60 * MIN },
  { label: '1–2 h', title: '1 to 2 hours', below: 120 * MIN },
  { label: '2 h +', title: '2 hours or more', below: Infinity },
]
/** How many sessions fall in each length band. */
export function durationBins(sessions: SessionStat[]) {
  const counts = DURATION_BINS.map(() => 0)
  for (const s of sessions) counts[DURATION_BINS.findIndex((b) => s.ms < b.below)]++
  return DURATION_BINS.map((b, i) => ({ label: b.label, title: b.title, count: counts[i] }))
}

// ---- the contract's StudyAnalytics --------------------------------------------------
/** StudyAnalytics for a filter (docs/READER_V2_CONTRACT.md). "custom" compares with the window of equal length before it. */
export function studyAnalytics(ix: StudyIndex, filter: AnalyticsFilter, now: number): StudyAnalytics {
  let w: Windows
  if (filter.period === 'custom') {
    const from = filter.startAt ? Date.parse(filter.startAt) : now
    const to = filter.endAt ? Date.parse(filter.endAt) : now
    w = { current: [from, to], comparison: [from - (to - from), from] }
  } else w = windows(filter.period === 'today' ? 'day' : filter.period, now, ix.tz)
  const c = change(ix, w, filter)
  const s = summarize(ix, w.current[0], w.current[1], filter)
  // one bucket per local day; the days at either end are only partly inside the window
  const days = dayBuckets(dayOf(w.current[0], ix.tz), dayOf(Math.max(w.current[0], w.current[1] - 1), ix.tz), ix.tz).map((b) => ({ ...b, from: Math.max(b.from, w.current[0]), to: Math.min(b.to, w.current[1]) }))
  const dailySeries = series(ix, days, filter).map(({ key, durationMs }) => ({ key, label: key, durationMs }))
  return {
    totalDurationMs: s.totalMs,
    sessionCount: s.sessionCount,
    averageSessionMs: s.averageSessionMs,
    longestSessionMs: s.longestSessionMs,
    currentPeriodMs: c.currentMs,
    comparisonPeriodMs: c.comparisonMs,
    changeAbsoluteMs: c.changeAbsoluteMs,
    ...(c.changePercent === undefined ? {} : { changePercent: c.changePercent }),
    dailySeries,
    byStage: s.byStage, bySubject: s.bySubject, byTopic: s.byTopic, byChapter: s.byChapter,
  }
}
