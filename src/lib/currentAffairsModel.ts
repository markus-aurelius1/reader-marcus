// Current Affairs rules and view models. Pure: day state, the two-device merge, the calendar,
// the archive, consistency, streaks and the Home card are all calculated here, on demand, from
// the day records, the notes and the study index. Nothing in this file is stored or synced.
// docs/READER_V2_CURRENT_AFFAIRS_CONTRACT.md. Unit-tested in currentAffairsModel.test.ts.
import type { ContentRef, CurrentAffairsDay, CurrentAffairsDayStatus, CurrentAffairsEntry, SpanActivity, StudyContext } from './contract'
import { civil, dateKey, dayNo, dayOf, dayStart, dayText, hourOf, summarize, weekStart, type StudyIndex } from './analytics'

export type DayStatus = CurrentAffairsDayStatus
/** A status, or — for a day with no record — "none" (before tracking began) / "future". */
export type DayState = DayStatus | 'none' | 'future'

/** Local hour (study timezone) from which Home reminds about today's news. */
export const REMINDER_HOUR = 7
/** Home mentions missed days only from the last few: an old backlog is not a daily reminder. */
export const RECENT_MISSED_DAYS = 7

export const STATUS_LABEL: Record<DayState, string> = { pending: 'Not completed', completed: 'Completed', missed: 'Missed', 'caught-up': 'Caught up', excused: 'Excused', none: 'Not tracked', future: 'Not yet' }
export const STATUS_GLYPH: Record<DayState, string> = { completed: '✓', missed: '×', pending: '●', 'caught-up': '↺', excused: '○', none: '', future: '' }

const DATE = /^\d{4}-\d{2}-\d{2}$/
export const parseDayId = (id: string) => dayNo(+id.slice(0, 4), +id.slice(5, 7), +id.slice(8, 10))
/** A real calendar date written YYYY-MM-DD. */
export const isDayId = (s: string) => DATE.test(s) && dateKey(parseDayId(s)) === s
export const dayIdOf = (dn: number) => dateKey(dn)

const fmt = (dn: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(dn * 86400000)
/** Saturday · 4 October */
export const dayLong = (dn: number) => `${fmt(dn, { weekday: 'long' })} · ${fmt(dn, { day: 'numeric', month: 'long' })}`
/** 4 Oct */
export const dayShort = (dn: number) => fmt(dn, { day: 'numeric', month: 'short' })
/** Sat 4 Oct 2026 */
export const dayFull = dayText
/** October 2026 */
export const monthLong = (year: number, month: number) => fmt(dayNo(year, month, 1), { month: 'long', year: 'numeric' })

// ---- the timer's view of a news day ---------------------------------------------------------
/** What the timer tracks while the news of `dayId` is read. No stage, subject or chapter. */
export const caContext = (dayId: string): StudyContext => ({ ref: { kind: 'current-affairs', dayId }, subjectTitle: 'Current Affairs', chapterTitle: dayFull(parseDayId(dayId)) })
/** What the timer tracks while a Current Affairs note is revised. */
export const caNoteContext = (dayId: string, entryId: string, title: string): StudyContext => ({ ref: { kind: 'current-affairs', dayId, entryId }, subjectTitle: 'Current Affairs', chapterTitle: title || 'Untitled note' })
export const caActivity = (dayId: string, entryId?: string): SpanActivity => ({ activity: 'current-affairs', currentAffairsDayId: dayId, ...(entryId ? { currentAffairsEntryId: entryId } : {}) })

// ---- day state ---------------------------------------------------------------------------------
const later = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b)
const earlier = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b)
/** A completion or an excuse counts unless the day was reopened ("Undo") after it. */
const stands = (at: string | undefined, reopenedAt: string | undefined) => (at && (!reopenedAt || at > reopenedAt) ? at : undefined)

type DayFacts = Pick<CurrentAffairsDay, 'date' | 'timeZone' | 'status' | 'completedAt' | 'excusedAt' | 'reopenedAt'>

/**
 * The status of a day record. With `today` (a day number in the study timezone) a day that has
 * passed without completion is missed; without it — while two copies of a record are merged — a
 * day already found missed stays missed.
 */
export function statusOf(d: DayFacts, today?: number): DayStatus {
  const done = stands(d.completedAt, d.reopenedAt)
  // caught up: completed on a later calendar day than the news day itself
  if (done) return dayOf(Date.parse(done), d.timeZone) > parseDayId(d.date) ? 'caught-up' : 'completed'
  if (stands(d.excusedAt, d.reopenedAt)) return 'excused'
  if (today === undefined) return d.status === 'missed' ? 'missed' : 'pending'
  return parseDayId(d.date) < today ? 'missed' : 'pending'
}

/** The record in its one canonical shape: status derived, no stale fields, fixed field order. */
export function settled(d: CurrentAffairsDay, today?: number): CurrentAffairsDay {
  const status = statusOf(d, today)
  const completedAt = stands(d.completedAt, d.reopenedAt)
  const excusedAt = stands(d.excusedAt, d.reopenedAt)
  return {
    id: d.id, date: d.date, timeZone: d.timeZone, status,
    ...(d.firstStartedAt ? { firstStartedAt: d.firstStartedAt } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(status === 'caught-up' ? { caughtUpAt: completedAt } : {}),
    ...(excusedAt ? { excusedAt } : {}),
    ...(d.reopenedAt ? { reopenedAt: d.reopenedAt } : {}),
    createdAt: d.createdAt, updatedAt: d.updatedAt,
  }
}

/**
 * Two copies of one day, changed on two devices. Commutative and idempotent, so both devices
 * reach the same record in whichever order they sync:
 * the day was done when it was first done (the earliest completion after the last Undo stands);
 * the latest excuse and the latest Undo stand; once missed, missed until completed or excused.
 */
export function mergeDay(a: CurrentAffairsDay, b: CurrentAffairsDay): CurrentAffairsDay {
  const reopenedAt = later(a.reopenedAt, b.reopenedAt)
  const first = a.createdAt < b.createdAt || (a.createdAt === b.createdAt && a.timeZone <= b.timeZone) ? a : b
  return settled({
    id: a.id, date: a.date, timeZone: first.timeZone,
    status: a.status === 'missed' || b.status === 'missed' ? 'missed' : 'pending',
    firstStartedAt: earlier(a.firstStartedAt, b.firstStartedAt),
    completedAt: earlier(stands(a.completedAt, reopenedAt), stands(b.completedAt, reopenedAt)),
    excusedAt: later(stands(a.excusedAt, reopenedAt), stands(b.excusedAt, reopenedAt)),
    reopenedAt,
    createdAt: first.createdAt,
    updatedAt: later(a.updatedAt, b.updatedAt)!,
  })
}

// ---- the model: every day's state, from the records that exist ----------------------------------
export type EntryLike = CurrentAffairsEntry & { removed?: boolean }
export const liveEntries = (rows: Record<string, EntryLike>): EntryLike[] =>
  Object.values(rows).filter((e) => !e.removed && e.dayId && isDayId(e.dayId)).sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1))

export interface CaModel {
  /** Today's day number in the study timezone. */
  today: number
  /** The day tracking began: the calendar day the earliest day record was made. Null until one exists. */
  start: number | null
  rows: Record<string, CurrentAffairsDay>
  /** Notes by news day, oldest first. */
  notes: Map<string, EntryLike[]>
  /** Reading time by news day. */
  readMs: Map<string, number>
}
export interface ModelInput {
  days: Record<string, CurrentAffairsDay>
  entries: Record<string, EntryLike>
  today: number
  /** Reading time by news day: StudyIndex.caByDay, plus a still-running timer where it is shown. */
  readMs?: Map<string, number>
}

export function buildModel({ days, entries, today, readMs }: ModelInput): CaModel {
  let start: number | null = null
  for (const d of Object.values(days)) {
    const made = dayOf(Date.parse(d.createdAt), d.timeZone)
    if (Number.isFinite(made) && (start === null || made < start)) start = made
  }
  const notes = new Map<string, EntryLike[]>()
  for (const e of liveEntries(entries)) (notes.get(e.dayId) ?? notes.set(e.dayId, []).get(e.dayId)!).push(e)
  return { today, start, rows: days, notes, readMs: readMs ?? new Map() }
}

/** The state of any calendar day. A day with no record is derived: nothing is pre-created. */
export function stateOf(m: CaModel, dn: number): DayState {
  const row = m.rows[dayIdOf(dn)]
  if (dn > m.today) return 'future'
  if (row) return statusOf(row, m.today)
  if (dn === m.today) return 'pending'
  return m.start !== null && dn >= m.start ? 'missed' : 'none'
}

export interface DayInfo {
  id: string
  day: number
  state: DayState
  row?: CurrentAffairsDay
  /** When it was marked complete, if it was. */
  completedAt?: string
  /** Derived from the study sessions; never stored on the day. */
  readMs: number
  notes: EntryLike[]
}
export function dayInfo(m: CaModel, dn: number): DayInfo {
  const id = dayIdOf(dn)
  const row = m.rows[id]
  const state = stateOf(m, dn)
  return { id, day: dn, state, row, completedAt: state === 'completed' || state === 'caught-up' ? row?.completedAt : undefined, readMs: m.readMs.get(id) ?? 0, notes: m.notes.get(id) ?? [] }
}

/** Missed days, most recent first, optionally only those from `since` on. */
export function missedDays(m: CaModel, since?: number): number[] {
  if (m.start === null) return []
  const out: number[] = []
  // records for days before tracking began can be missed too (started once, never completed)
  const from = Math.min(m.start, ...Object.keys(m.rows).map(parseDayId))
  for (let dn = m.today - 1; dn >= Math.max(from, since ?? from); dn--) if (stateOf(m, dn) === 'missed') out.push(dn)
  return out
}

// ---- period figures ---------------------------------------------------------------------------
export interface CaStats {
  from: number
  to: number
  /** Days of the period that have come (never past today). */
  elapsed: number
  completed: number
  caughtUp: number
  missed: number
  excused: number
  /** Today, while it is not completed. */
  pending: number
  /** completed + caughtUp + missed. Excused, pending and untracked days are not counted. */
  eligible: number
  /** (completed + caughtUp) ÷ eligible. Absent when there is nothing to divide by. */
  consistency?: number
  /** completed ÷ eligible: done on the day itself. */
  onTime?: number
  /** Notes whose news day is in the period. */
  notes: number
  /** One entry per elapsed day, oldest first. */
  days: { day: number; state: DayState }[]
}

export function caStats(m: CaModel, from: number, to: number): CaStats {
  const last = Math.min(to, m.today)
  const s: CaStats = { from, to: last, elapsed: Math.max(0, last - from + 1), completed: 0, caughtUp: 0, missed: 0, excused: 0, pending: 0, eligible: 0, notes: 0, days: [] }
  for (let dn = from; dn <= last; dn++) {
    const state = stateOf(m, dn)
    s.days.push({ day: dn, state })
    if (state === 'completed') s.completed++
    else if (state === 'caught-up') s.caughtUp++
    else if (state === 'missed') s.missed++
    else if (state === 'excused') s.excused++
    else if (state === 'pending') s.pending++
    s.notes += m.notes.get(dayIdOf(dn))?.length ?? 0
  }
  s.eligible = s.completed + s.caughtUp + s.missed
  if (s.eligible) {
    s.consistency = (s.completed + s.caughtUp) / s.eligible
    s.onTime = s.completed / s.eligible
  }
  return s
}

/** Current-affairs study time inside [fromMs, toMs) by the clock, and the days it was read on. */
export function caTime(ix: StudyIndex, fromMs: number, toMs: number) {
  const s = summarize(ix, fromMs, toMs, { activity: 'current-affairs' })
  return { ms: s.totalMs, readDays: s.activeDays, averageMs: s.activeDays ? s.totalMs / s.activeDays : 0 }
}

export interface CaStreak {
  currentDays: number
  longestDays: number
}
/**
 * Consecutive covered days (completed or caught up), ending today — or yesterday while today is
 * still open. An excused day is passed over: it neither counts nor breaks the run.
 */
export function caStreak(m: CaModel): CaStreak {
  if (m.start === null) return { currentDays: 0, longestDays: 0 }
  let run = 0
  let longest = 0
  for (let dn = m.start; dn <= m.today; dn++) {
    const state = stateOf(m, dn)
    if (state === 'completed' || state === 'caught-up') longest = Math.max(longest, ++run)
    else if (state === 'missed' || state === 'none') run = 0
  }
  return { currentDays: run, longestDays: longest }
}

// ---- calendar and archive -------------------------------------------------------------------------
export interface CaCell extends DayInfo {
  inMonth: boolean
}
/** A Monday-to-Sunday month grid. */
export function caCalendar(m: CaModel, year: number, month: number): CaCell[] {
  const first = dayNo(year, month, 1)
  const last = dayNo(year, month + 1, 0)
  const out: CaCell[] = []
  for (let dn = weekStart(first); dn <= weekStart(last) + 6; dn++) out.push({ ...dayInfo(m, dn), inMonth: dn >= first && dn <= last })
  return out
}

/** The days of a month that have anything to show — a state, reading time or notes — newest first. */
export function caArchive(m: CaModel, year: number, month: number): DayInfo[] {
  const first = dayNo(year, month, 1)
  const out: DayInfo[] = []
  for (let dn = Math.min(dayNo(year, month + 1, 0), m.today); dn >= first; dn--) {
    const d = dayInfo(m, dn)
    if (d.state !== 'none' || d.readMs > 0 || d.notes.length) out.push(d)
  }
  return out
}

/** The earliest day with a record, a note or reading time: where the archive begins. */
export function firstDay(m: CaModel): number | null {
  const ids = [...Object.keys(m.rows), ...m.notes.keys(), ...[...m.readMs].filter(([, ms]) => ms > 0).map(([id]) => id)].filter(isDayId)
  const all = [...ids.map(parseDayId), ...(m.start === null ? [] : [m.start])]
  return all.length ? Math.min(...all) : null
}
export const monthOf = (dn: number) => ({ year: civil(dn).y, month: civil(dn).m })
export const monthKey = (year: number, month: number) => dateKey(dayNo(year, month, 1)).slice(0, 7)

// ---- Home -----------------------------------------------------------------------------------------
export interface HomeCard {
  /** hidden: nothing to show (before the reminder hour, nothing started). */
  state: 'hidden' | 'due' | 'active' | 'complete' | 'excused'
  todayId: string
  /** Today's reading time so far. */
  readMs: number
  notes: number
  /** Missed days among the last RECENT_MISSED_DAYS. */
  missed: number
  /** The most recent of them: where "Catch Up" goes. */
  missedId?: string
  /** active: the news day being read (today's, or an earlier one being caught up). */
  activeId?: string
  activeMs?: number
  paused?: boolean
  /** The reading timer belongs to another device. */
  remote?: boolean
}
export interface HomeInput {
  m: CaModel
  now: number
  /** Study timezone. */
  tz: string
  /** The timer, when its open span is a current-affairs span. */
  reading?: { dayId: string; ms: number; paused: boolean; remote: boolean } | null
}

export function homeCard({ m, now, tz, reading }: HomeInput): HomeCard {
  const today = dayInfo(m, m.today)
  const recent = missedDays(m, m.today - RECENT_MISSED_DAYS)
  const base = { todayId: today.id, readMs: today.readMs, notes: today.notes.length, missed: recent.length, ...(recent.length ? { missedId: dayIdOf(recent[0]) } : {}) }
  if (reading) return { ...base, state: 'active', activeId: reading.dayId, activeMs: reading.ms, paused: reading.paused, remote: reading.remote }
  if (today.state === 'completed') return { ...base, state: 'complete' }
  if (today.state === 'excused') return { ...base, state: 'excused' }
  // before the reminder hour the card stays away — unless today's reading has already begun
  const begun = !!today.row?.firstStartedAt || today.readMs > 0 || today.notes.length > 0
  return { ...base, state: hourOf(now, tz) >= REMINDER_HOUR || begun ? 'due' : 'hidden' }
}

// ---- notes: links, tags, sources ---------------------------------------------------------------------
/** Stable identity of a linked place: the contract's ContentRef key (the same as links.linkKey). */
export const linkKey = (r: ContentRef) => (r.kind === 'pyq' ? `pyq:${r.pyqId}` : [r.stage, r.subjectId, r.chapterId, r.sectionId].filter(Boolean).join('/'))

/** Notes that link to any of these places (ContentRef keys): the backlinks of a chapter or section. */
export function notesLinking(entries: Record<string, EntryLike>, keys: Iterable<string>): EntryLike[] {
  const want = new Set(keys)
  return liveEntries(entries).filter((e) => (e.linkedContentRefs ?? []).some((r) => want.has(linkKey(r)))).reverse()
}

/** The same place linked twice is one link. */
export function uniqueRefs(refs: ContentRef[]): ContentRef[] {
  const seen = new Set<string>()
  return refs.filter((r) => !seen.has(linkKey(r)) && !!seen.add(linkKey(r)))
}

export const MAX_TAGS = 12
/** "Economy, #RBI,  rbi" → ["Economy", "RBI"]. */
export function cleanTags(input: string | string[] | undefined): string[] {
  const parts = (Array.isArray(input) ? input : (input ?? '').split(/[,\n]/)).map((t) => t.replace(/\s+/g, ' ').trim().replace(/^#+ */, '').slice(0, 40)).filter(Boolean)
  const seen = new Set<string>()
  return parts.filter((t) => !seen.has(t.toLowerCase()) && !!seen.add(t.toLowerCase())).slice(0, MAX_TAGS)
}

/** A web address worth storing: http(s) only. "thehindu.com/x" gains https://; anything else is dropped. */
export function cleanUrl(input: string | undefined): string | undefined {
  const raw = (input ?? '').trim()
  if (!raw) return undefined
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : /^[^\s/]+\.[^\s/]+/.test(raw) ? `https://${raw}` : ''
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined
  } catch {
    return undefined
  }
}
/** thehindu.com */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// ---- dates typed into search ------------------------------------------------------------------------
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
/**
 * A day named in a search: "2026-10-04", "4 oct", "oct 4 2026", "today", "yesterday".
 * Without a year, the most recent such date that is not in the future.
 */
export function parseDateQuery(q: string, today: number): number | null {
  const s = q.trim().toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ')
  if (s === 'today') return today
  if (s === 'yesterday') return today - 1
  if (isDayId(s)) return parseDayId(s)
  const m = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]{3,9})(?: (\d{4}))?$/.exec(s) ?? /^([a-z]{3,9}) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/.exec(s)
  if (!m) return null
  const [d, name] = /^\d/.test(m[1]) ? [+m[1], m[2]] : [+m[2], m[1]]
  const month = MONTHS.findIndex((full) => full.startsWith(name)) + 1
  if (!month || d < 1 || d > 31) return null
  const valid = (y: number) => {
    const dn = dayNo(y, month, d)
    return civil(dn).m === month && civil(dn).d === d ? dn : null
  }
  if (m[3]) return valid(+m[3])
  const y = civil(today).y
  const thisYear = valid(y)
  return thisYear !== null && thisYear <= today ? thisYear : valid(y - 1)
}

/** First instant of a study-calendar day, for turning a period of days into a window of time. */
export const dayStartMs = (dn: number, tz: string) => dayStart(dn, tz)
