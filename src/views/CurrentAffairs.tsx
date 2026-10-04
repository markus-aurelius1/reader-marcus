// Current Affairs: Today · Calendar · Notes · Archive, one day, and one note.
// The pages hold nothing of their own. Day states, the calendar, the archive and the reading
// time of each day are lib/currentAffairsModel.ts's, rebuilt on each render from the day
// records, the notes and the study sessions. Reading the news is a span of the one global timer.
import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, ExternalLink, Link2, Pause, PencilLine, Play, Plus, RotateCw, Square, Trash2, X } from 'lucide-react'
import type { ContentRef } from '../lib/contract'
import { CA_TABS, go, href, replace, type CaTab, type Route } from '../lib/router'
import { flushOverrides, useStore } from '../lib/store'
import { relink } from '../lib/links'
import { chapterRef, destinations, subjectRef } from '../lib/nav'
import { search, searchPyqs, searchSubjects, type Hit } from '../lib/search'
import { civil, dayNo, dayOf } from '../lib/analytics'
import { clockText, durationText } from '../lib/timer'
import { activeTimer, currentAffairsLiveMs, ownsTimer, pauseTimer, resumeTimer, stopTimer, useStudy } from '../lib/study'
import { addEntry, completeDay, continueReadingHere, excuseDay, noteBody, noteKey, readingNow, removeEntry, reopenDay, saveNoteBody, startReading, updateEntry, useCA, type EntryRow } from '../lib/currentAffairs'
import {
  STATUS_GLYPH, STATUS_LABEL, caArchive, caCalendar, dayFull, dayIdOf, dayInfo, dayLong, dayShort, firstDay, hostOf, isDayId, linkKey, liveEntries, monthKey, monthLong, monthOf, parseDayId,
  type CaModel, type DayInfo, type EntryLike,
} from '../lib/currentAffairsModel'
import { enrolNote, setAside, useRevision } from '../lib/revision'
import { extensions } from '../editor/extensions'
import { Toolbar, useActiveEditor } from '../editor/Editor'
import { pathOf, useElapsed } from '../components/Timer'
import { linked } from '../sync'
import { plural, timeText, useCaModel } from './Insights'

export const CA_TAB_LABEL: Record<CaTab, string> = { today: 'Today', calendar: 'Calendar', notes: 'Notes', archive: 'Archive' }
type Say = (m: string, ms?: number) => void
type CaRoute = Extract<Route, { name: 'current-affairs' }>
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** A note just made opens ready to write in. */
const fresh = { id: '' }

/** Completed sessions of the day, plus what a timer still running has recorded for it. */
function useReadMs(d: DayInfo) {
  const a = useStudy(activeTimer)
  useElapsed(a)
  return d.readMs + currentAffairsLiveMs(a, d.id)
}
/** 4 Oct · 09:12 */
const stampText = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(Date.parse(iso)).replace(',', ' ·')

export function CurrentAffairsPage({ route, say }: { route: CaRoute; say: Say }) {
  const ready = useCA((s) => s.ready)
  const studyReady = useStudy((s) => s.ready)
  const data = useCaModel()
  const { m } = data
  const tab: CaTab | null = route.view === 'day' || route.view === 'note' ? null : route.view
  if (route.view === 'note') return ready ? <NoteView key={route.id} id={route.id!} say={say} tz={data.tz} /> : <div className="page"><p className="empty">Loading…</p></div>
  return (
    <div className="page wide ca">
      <div className="eyebrow">Daily news · your own notes</div>
      <h1 className="title">Current Affairs</h1>
      <nav className="tabs" aria-label="Current Affairs">
        {CA_TABS.map((t) => <a key={t} className={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} href={href.currentAffairs(t)}>{CA_TAB_LABEL[t]}</a>)}
        <a className="tab-out" href={href.insights('current-affairs')}>Analytics →</a>
      </nav>
      {!ready || !studyReady ? null : route.view === 'day' ? (
        isDayId(route.id ?? '') ? <DayPanel m={m} dayId={route.id!} tz={data.tz} say={say} back /> : <p className="empty">That is not a date. <a className="ilink" href={href.currentAffairs('calendar')}>Open the calendar →</a></p>
      ) : route.view === 'calendar' ? (
        <CalendarTab m={m} picked={route.date} tz={data.tz} say={say} />
      ) : route.view === 'notes' ? (
        <NotesTab m={m} tag={route.tag} />
      ) : route.view === 'archive' ? (
        <ArchiveTab m={m} month={route.month} tz={data.tz} />
      ) : (
        <DayPanel m={m} dayId={dayIdOf(m.today)} tz={data.tz} say={say} />
      )}
    </div>
  )
}

// ---- one day: state, the timer, notes, completion -----------------------------------------------
function DayPanel({ m, dayId, tz, say, back }: { m: CaModel; dayId: string; tz: string; say: Say; back?: boolean }) {
  const dn = parseDayId(dayId)
  const d = dayInfo(m, dn)
  const a = useStudy(activeTimer)
  const read = useReadMs(d)
  const [adding, setAdding] = useState(false)
  const isToday = dn === m.today
  const reading = readingNow(a)
  const here = !!a && ownsTimer(a) && reading?.currentAffairsDayId === dayId
  const covered = d.state === 'completed' || d.state === 'caught-up'
  const open = d.state === 'pending' || d.state === 'missed'

  const start = () => {
    // a timer started offline on a linked device cannot know whether another device has one
    if (startReading(dayId, undefined, linked() && !navigator.onLine) === 'remote') say('A timer is running on another device. Use “Continue here” to read with it.')
  }
  const stop = () => {
    const s = stopTimer()
    say(s ? `Session saved · ${durationText(s.durationMs)}` : 'Timer stopped · nothing to save')
  }
  const complete = () => {
    // reading for this day ends with it: the timer is stopped and its session saved
    const t = activeTimer(useStudy.getState())
    const ses = ownsTimer(t) && readingNow(t)?.currentAffairsDayId === dayId ? stopTimer() : null
    const row = completeDay(dayId)
    if (row) say(`${row.status === 'caught-up' ? 'Caught up' : 'Marked complete'}${ses ? ` · ${durationText(ses.durationMs)} saved` : ''}`)
  }

  if (d.state === 'future') return <p className="empty">{dayFull(dn)} has not come yet.</p>
  const status = covered ? (d.state === 'caught-up' ? `Caught up · completed ${stampText(d.completedAt!, tz)}` : `Completed${d.completedAt ? ` · ${stampText(d.completedAt, tz)}` : ''}`) : STATUS_LABEL[d.state]
  const timerNote = !a
    ? ''
    : !ownsTimer(a)
      ? `Timer ${a.state === 'paused' ? 'paused' : 'running'} on another device · ${pathOf(a.currentContext)}`
      : here
        ? a.state === 'paused' ? 'Paused' : 'Reading now'
        : `The study timer is on ${pathOf(a.currentContext)}`
  return (
    <section className="ca-day" data-day={dayId} data-state={d.state}>
      {back && <a className="linkbtn ca-back" href={href.currentAffairs('calendar', { date: dayId })}>← Calendar</a>}
      <div className="ca-head">
        <div className="ca-when">
          <small>{dayLong(dn)}{isToday ? ' · today' : ` ${civil(dn).y}`}</small>
          <b className="ca-status" data-s={d.state}>{STATUS_GLYPH[d.state] && <i aria-hidden="true">{STATUS_GLYPH[d.state]}</i>}{status}</b>
        </div>
        <div className={'ca-clock' + (here && a?.state === 'running' ? ' run' : '')}>
          <time aria-label={`Reading time: ${clockText(read)}`}>{clockText(read)}</time>
          <small>{timerNote || (read >= 1000 ? 'read' : 'not read yet')}</small>
        </div>
      </div>
      <div className="acts ca-acts">
        {!a ? (
          <button className="btn primary" onClick={start}><Play />{isToday ? 'Start Reading' : covered || d.state === 'excused' ? 'Read again' : 'Start Catch-Up'}</button>
        ) : !ownsTimer(a) ? (
          <button className="btn primary" onClick={() => continueReadingHere(dayId)}>Continue here</button>
        ) : here ? (
          <>
            {a.state === 'paused' ? <button className="btn primary" onClick={resumeTimer}><Play />Resume</button> : <button className="btn primary" onClick={pauseTimer}><Pause />Pause</button>}
            <button className="btn" onClick={stop} title="Stop and save the session"><Square />Stop</button>
          </>
        ) : (
          <button className="btn primary" onClick={start} title="The same timer and session carry on, in a Current Affairs span"><Play />{reading ? (isToday ? "Read today's" : 'Read this day') : isToday ? 'Start Reading' : 'Start Catch-Up'}</button>
        )}
        <button className="btn" onClick={() => setAdding(true)} disabled={adding}><Plus />Add Note</button>
      </div>

      <h3 className="gh">{isToday ? "Today's Notes" : 'Notes'}{d.notes.length > 0 && <small className="sm"> · {d.notes.length}</small>}</h3>
      {adding && <NoteForm dayId={dayId} onClose={() => setAdding(false)} />}
      {d.notes.length ? <NoteRows notes={d.notes} /> : !adding && <p className="none">No notes for this day. A note is optional — the day can be completed without one.</p>}

      <div className="ca-finish">
        {open ? (
          <>
            <button className="btn ca-complete" onClick={complete}><Check />{isToday ? 'Mark Today Complete' : 'Mark Complete · caught up'}</button>
            <button className="linkbtn" onClick={() => excuseDay(dayId)} title="Leave this day out. It is never counted as completed.">Excuse this day</button>
          </>
        ) : (
          <>
            <span className="ca-done" data-s={d.state}>{STATUS_GLYPH[d.state]} {STATUS_LABEL[d.state]}{d.state === 'excused' ? ' — left out of the consistency figures' : ''}</span>
            <button className="linkbtn" onClick={() => reopenDay(dayId)}>Undo</button>
            {d.state === 'excused' && <button className="linkbtn" onClick={complete}>Mark complete instead</button>}
          </>
        )}
      </div>
      {d.state === 'missed' && <p className="fine">This day keeps its own date. Completing it now records it as caught up, with today as the day it was done.</p>}
    </section>
  )
}

function NoteRows({ notes, day }: { notes: EntryLike[]; day?: boolean }) {
  return (
    <div className="rows ca-notes">
      {notes.map((e) => (
        <a className="row" key={e.id} href={href.caNote(e.id)} data-note={e.id}>
          <span className="t">
            <b>{e.title || 'Untitled note'}</b>
            <small>{[day && dayShort(parseDayId(e.dayId)), e.sourceName || (e.sourceUrl && hostOf(e.sourceUrl)), ...(e.tags ?? []).map((t) => '#' + t), e.linkedContentRefs?.length ? plural(e.linkedContentRefs.length, 'link') : ''].filter(Boolean).join(' · ') || 'No source or tags'}</small>
          </span>
          <ArrowRight className="okmark" style={{ color: 'var(--ink-3)' }} />
        </a>
      ))}
    </div>
  )
}

/** Title and, optionally, where it came from. The text is written on the note's own page. */
function NoteForm({ dayId, onClose }: { dayId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [tags, setTags] = useState('')
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const id = addEntry(dayId, { title, sourceName, sourceUrl, tags })
    onClose()
    if (!id) return
    fresh.id = id
    go(href.caNote(id))
  }
  return (
    <form className="ca-form" onSubmit={save}>
      <label className="wide">Title<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What the story is about" aria-label="Note title" maxLength={200} /></label>
      <label>Source<input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="optional — The Hindu, PIB…" aria-label="Source name" maxLength={80} /></label>
      <label>Link<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="optional" aria-label="Source link" inputMode="url" /></label>
      <label>Tags<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="optional, comma separated" aria-label="Tags" /></label>
      <div className="acts">
        <button className="btn primary" type="submit" disabled={!title.trim()}>Save and write</button>
        <button className="linkbtn" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

// ---- calendar -------------------------------------------------------------------------------------
function CalendarTab({ m, picked, tz, say }: { m: CaModel; picked?: string; tz: string; say: Say }) {
  const sel = picked && isDayId(picked) ? parseDayId(picked) : m.today
  const [at, setAt] = useState(() => monthOf(sel))
  const cells = useMemo(() => caCalendar(m, at.year, at.month), [m, at])
  const step = (n: number) => setAt(monthOf(dayNo(at.year, at.month + n, 1)))
  const pick = (dn: number) => replace(href.currentAffairs('calendar', { date: dayIdOf(dn) }))
  return (
    <>
      <div className="filters cal-nav">
        <span className="stepper">
          <button className="ib" onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft /></button>
          <b aria-live="polite">{MONTH[at.month - 1]} {at.year}</b>
          <button className="ib" onClick={() => step(1)} disabled={dayNo(at.year, at.month + 1, 1) > m.today} aria-label="Next month"><ChevronRight /></button>
        </span>
        <button className="chip" onClick={() => { setAt(monthOf(m.today)); pick(m.today) }}>Today</button>
        <span className="ca-key">{(['completed', 'caught-up', 'pending', 'missed', 'excused'] as const).map((s) => <span key={s} data-s={s}><i aria-hidden="true">{STATUS_GLYPH[s]}</i>{s === 'pending' ? 'Today / pending' : STATUS_LABEL[s]}</span>)}</span>
      </div>
      <div className="cal ca-cal" role="grid" aria-label={`Current Affairs calendar, ${MONTH[at.month - 1]} ${at.year}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="cal-h" role="columnheader">{d}</span>)}
        {cells.map((c) => {
          const label = [dayFull(c.day), STATUS_LABEL[c.state], c.readMs >= 60000 && timeText(c.readMs), c.notes.length > 0 && plural(c.notes.length, 'note')].filter(Boolean).join(', ')
          return (
            <button key={c.day} role="gridcell" className={'cal-d' + (c.inMonth ? '' : ' out') + (c.day === m.today ? ' today' : '') + (c.day === sel ? ' on' : '')} data-date={c.id} data-state={c.state} aria-label={label} aria-selected={c.day === sel} disabled={c.state === 'future'} onClick={() => pick(c.day)}>
              <span className="n">{civil(c.day).d}</span>
              {STATUS_GLYPH[c.state] && <i className="ca-mark" data-s={c.state} aria-hidden="true">{STATUS_GLYPH[c.state]}</i>}
              {(c.readMs >= 60000 || c.notes.length > 0) && <span className="ca-meta">{[c.readMs >= 60000 && `${Math.round(c.readMs / 60000)}m`, c.notes.length > 0 && `${c.notes.length}n`].filter(Boolean).join(' · ')}</span>}
            </button>
          )
        })}
      </div>
      <DayPanel key={sel} m={m} dayId={dayIdOf(sel)} tz={tz} say={say} />
      <p className="fine">Reading time is derived from the timer's Current Affairs sessions; nothing is stored on the day. Days follow the study timezone ({tz}).</p>
    </>
  )
}

// ---- archive --------------------------------------------------------------------------------------
function ArchiveTab({ m, month, tz }: { m: CaModel; month?: string; tz: string }) {
  const now = monthOf(m.today)
  const at = month ? { year: +month.slice(0, 4), month: +month.slice(5, 7) } : now
  const rows = useMemo(() => caArchive(m, at.year, at.month), [m, at.year, at.month])
  const first = firstDay(m)
  const earliest = first === null ? now : monthOf(first)
  const to = (y: number, mo: number) => replace(href.currentAffairs('archive', { month: monthKey(y, mo) }))
  const before = (a: { year: number; month: number }, b: { year: number; month: number }) => a.year < b.year || (a.year === b.year && a.month < b.month)
  const years = Array.from({ length: now.year - earliest.year + 1 }, (_, i) => now.year - i)
  const a = useStudy(activeTimer)
  useElapsed(a)
  return (
    <>
      <div className="filters cal-nav">
        <span className="stepper">
          <button className="ib" onClick={() => to(at.year, at.month - 1)} disabled={!before(earliest, at)} aria-label="Previous month"><ChevronLeft /></button>
          <b aria-live="polite">{monthLong(at.year, at.month)}</b>
          <button className="ib" onClick={() => to(at.year, at.month + 1)} disabled={!before(at, now)} aria-label="Next month"><ChevronRight /></button>
        </span>
        {years.length > 1 && (
          <select className="sel" value={at.year} onChange={(e) => to(+e.target.value, +e.target.value === now.year ? Math.min(at.month, now.month) : at.month)} aria-label="Year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {(at.year !== now.year || at.month !== now.month) && <button className="chip" onClick={() => to(now.year, now.month)}>This month</button>}
      </div>
      {rows.length === 0 ? (
        <p className="empty">Nothing recorded in {monthLong(at.year, at.month)}.</p>
      ) : (
        <div className="rows ca-arch">
          {rows.map((d) => {
            const ms = d.readMs + currentAffairsLiveMs(a, d.id)
            return (
              <div className="row" key={d.id} data-day={d.id} data-state={d.state}>
                <a className="t" href={href.caDay(d.id)}>
                  <b><span className="ca-date">{dayShort(d.day)}</span><i className="ca-mark" data-s={d.state} title={STATUS_LABEL[d.state]}>{STATUS_GLYPH[d.state] || '·'}</i><span className="ca-st">{d.state === 'caught-up' && d.completedAt ? `Caught up · ${dayShort(dayOf(Date.parse(d.completedAt), tz))}` : STATUS_LABEL[d.state]}</span></b>
                </a>
                <span className="num wide">{ms >= 1000 ? timeText(ms) : '—'}</span>
                <span className="num wide ca-n">{d.notes.length ? plural(d.notes.length, 'note') : '—'}</span>
                {d.notes.length > 0 && <span className="ca-titles">{d.notes.map((e) => <a key={e.id} className="chip" href={href.caNote(e.id)}>{e.title || 'Untitled note'}</a>)}</span>}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ---- all notes --------------------------------------------------------------------------------------
function NotesTab({ m, tag }: { m: CaModel; tag?: string }) {
  const entries = useCA((s) => s.entries)
  const [q, setQ] = useState('')
  const all = useMemo(() => liveEntries(entries).sort((a, b) => (a.dayId === b.dayId ? (a.createdAt < b.createdAt ? 1 : -1) : a.dayId < b.dayId ? 1 : -1)), [entries])
  const tags = useMemo(() => {
    const n = new Map<string, number>()
    for (const e of all) for (const t of e.tags ?? []) n.set(t, (n.get(t) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  }, [all])
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = all.filter((e) => (!tag || (e.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())) && words.every((w) => `${e.title} ${e.sourceName ?? ''} ${(e.tags ?? []).join(' ')}`.toLowerCase().includes(w)))
  const months = [...new Set(shown.map((e) => e.dayId.slice(0, 7)))]
  if (!all.length) {
    return (
      <div className="shell-note nodata">
        <b>No Current Affairs notes yet.</b> Use <b>Add Note</b> on any day to keep what is worth remembering from the news. <a href={href.currentAffairs()}>Open today →</a>
      </div>
    )
  }
  return (
    <>
      <div className="filters">
        <input className="sel ca-find" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title, source or tag" aria-label="Filter notes" />
        <span>{shown.length} of {all.length}</span>
        {tag && <a className="chip u" href={href.currentAffairs('notes')}>#{tag} ✕</a>}
      </div>
      {tags.length > 0 && <div className="chips ca-tags">{tags.slice(0, 24).map(([t, n]) => <a key={t} className={'chip' + (tag?.toLowerCase() === t.toLowerCase() ? ' u' : '')} href={href.currentAffairs('notes', { tag: t })}>#{t} <small>{n}</small></a>)}</div>}
      {shown.length === 0 && <p className="empty">No note matches.</p>}
      {months.map((mk) => (
        <div key={mk}>
          <h3 className="gh">{monthLong(+mk.slice(0, 4), +mk.slice(5, 7))}</h3>
          <NoteRows notes={shown.filter((e) => e.dayId.startsWith(mk))} day />
        </div>
      ))}
      <p className="fine">{plural(m.notes.size, 'day')} with notes. Search (Ctrl/Cmd + K) also looks inside the text of every note.</p>
    </>
  )
}

// ---- one note ---------------------------------------------------------------------------------------
/** A linked place as it is in the library now; a place no longer there is not listed. */
function useLinks(refs: ContentRef[]) {
  return useMemo(() => {
    const rows: { key: string; title: string; context: string; to: string; ref: ContentRef }[] = []
    let gone = 0
    for (const ref of refs) {
      if (ref.kind === 'pyq') rows.push({ key: linkKey(ref), title: ref.pyqId!, context: 'PYQ', to: href.pyqs({ stage: ref.stage === 'prelims' ? undefined : ref.stage, id: ref.pyqId }), ref })
      else {
        const d = destinations([ref])[0]
        if (d) rows.push({ key: linkKey(ref), title: d.title, context: d.context, to: d.to, ref })
        else gone++
      }
    }
    return { rows, gone }
  }, [refs])
}

const refOfHit = (h: Hit): ContentRef | null =>
  h.kind === 'pyq' && h.pyq ? { kind: 'pyq', stage: h.pyq.stage, pyqId: h.pyq.pyqId }
    : h.kind === 'subject' && h.subject ? subjectRef(h.subject)
      : h.chapter && (h.kind === 'section' || h.kind === 'text') && h.section ? { ...chapterRef(h.chapter), kind: 'section', sectionId: h.section.id }
        : h.chapter && h.kind === 'chapter' ? chapterRef(h.chapter) : null

/** Links are chosen, never guessed: search the library and pick the place. */
function LinkPicker({ refs, onAdd }: { refs: ContentRef[]; onAdd: (r: ContentRef) => void }) {
  const overrides = useStore((s) => s.overrides)
  const [q, setQ] = useState('')
  const have = new Set(refs.map(linkKey))
  const hits = useMemo(() => {
    if (q.trim().length < 2) return []
    const seen = new Set<string>()
    const out: { h: Hit; ref: ContentRef }[] = []
    for (const h of [...searchSubjects(q), ...searchPyqs(q, 4, 0), ...search(q, overrides, 10)]) {
      const ref = refOfHit(h)
      if (!ref || seen.has(linkKey(ref))) continue
      seen.add(linkKey(ref))
      out.push({ h, ref })
    }
    return out.slice(0, 8)
  }, [q, overrides])
  return (
    <div className="ca-pick">
      <input className="sel" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Link to notes or a PYQ — type to search" aria-label="Link to notes" />
      {hits.length > 0 && (
        <div className="rows">
          {hits.map(({ h, ref }) => {
            const on = have.has(linkKey(ref))
            const where = h.kind === 'pyq' ? 'PYQ' : [h.subject && `${h.subject.stage === 'prelims' ? 'Prelims' : 'Mains'} · ${h.subject.title}`, h.kind !== 'subject' && h.kind !== 'chapter' && h.chapter?.title].filter(Boolean).join(' › ')
            return (
              <button type="button" className="row" key={linkKey(ref)} disabled={on} onClick={() => { onAdd(JSON.parse(JSON.stringify(ref))); setQ('') }}>
                <span className="t"><b>{h.title}</b><small>{where}</small></span>
                <span className="chip">{on ? 'Linked' : 'Link'}</span>
              </button>
            )
          })}
        </div>
      )}
      {q.trim().length >= 2 && hits.length === 0 && <p className="fine">Nothing in the library matches “{q}”.</p>}
    </div>
  )
}

/** The note's text, in the reader's own editor and saved through the reader's own edit pipeline. */
function NoteEditor({ id, html }: { id: string; html: string }) {
  const editor = useEditor({
    extensions,
    content: html,
    onUpdate: ({ editor }) => saveNoteBody(id, editor.getHTML()),
    onFocus: ({ editor }) => useActiveEditor.setState({ active: editor }),
    onCreate: ({ editor }) => useActiveEditor.setState({ active: editor }),
  })
  useEffect(() => {
    if (!editor) return
    return () => {
      if (useActiveEditor.getState().active === editor) useActiveEditor.setState({ active: null })
    }
  }, [editor])
  return <EditorContent editor={editor} className="sec-body prose ca-body" data-key={noteKey(id)} />
}

function NoteView({ id, say, tz }: { id: string; say: Say; tz: string }) {
  const entry = useCA((s) => s.entries[id]) as EntryRow | undefined
  const overrides = useStore((s) => s.overrides)
  const tick = useStore((s) => s.ext[noteKey(id)] ?? 0) // another device changed the text
  const unit = useRevision((s) => s.units[noteKey(id)])
  const [editing, setEditing] = useState(() => fresh.id === id)
  useEffect(() => {
    if (fresh.id === id) fresh.id = ''
  }, [id])
  const refs = entry?.linkedContentRefs ?? []
  const links = useLinks(refs)
  const html = noteBody(overrides, id)
  const shown = useMemo(() => relink(html, ''), [html])
  if (!entry || entry.removed) {
    return <div className="page"><p className="empty">This note is no longer here. <a className="ilink" href={href.currentAffairs('notes')}>All Current Affairs notes →</a></p></div>
  }
  const dn = parseDayId(entry.dayId)
  const done = async () => {
    await flushOverrides()
    setEditing(false)
  }
  const del = async () => {
    if (!confirm(`Delete “${entry.title || 'Untitled note'}”?\n\nThe note and its text are removed on every device.`)) return
    await removeEntry(id)
    say('Note deleted')
    go(href.caDay(entry.dayId))
  }
  const revise = () => {
    const u = enrolNote(id, entry.dayId, entry.title)
    say(u ? `Added to revision · R${u.revisionCount + 1} due ${dayShort(parseDayId(u.dueDate))}` : 'Scheduled revision is switched off in Settings')
  }
  const inRevision = unit && unit.status !== 'suspended'
  const read = () => {
    const r = startReading(entry.dayId, id, linked() && !navigator.onLine)
    say(r === 'remote' ? 'A timer is running on another device.' : `Reading ${dayShort(dn)}'s news · timer running`)
  }
  return (
    <div className={'page ca-note' + (editing ? ' editing' : '')} data-note={id}>
      <div className="eyebrow"><a href={href.currentAffairs()}>Current Affairs</a> › <a href={href.caDay(entry.dayId)}>{dayFull(dn)}</a></div>
      {editing
        ? <Field className="title ca-title" bare value={entry.title} onSave={(v) => updateEntry(id, { title: v })} placeholder="Title" label="Note title" maxLength={200} />
        : <h1 className="title">{entry.title || 'Untitled note'}</h1>}
      <div className="chap-meta ca-meta-row">
        {!editing && (entry.sourceUrl
          ? <a className="ca-src" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink />{entry.sourceName || hostOf(entry.sourceUrl)}</a>
          : entry.sourceName && <span className="ca-src">{entry.sourceName}</span>)}
        {!editing && (entry.tags ?? []).map((t) => <a key={t} className="chip" href={href.currentAffairs('notes', { tag: t })}>#{t}</a>)}
        <span className="ca-ops">
          {inRevision
            ? <a className="chip u" href={href.revise(noteKey(id))} title="Open its scheduled revision">In revision · R{unit.revisionCount + 1} due {dayShort(parseDayId(unit.dueDate))}</a>
            : <button className="btn sm" onClick={revise} title="Schedule this note for spaced revision. Never automatic."><RotateCw />Add to Revision</button>}
          {inRevision && <button className="linkbtn" onClick={() => setAside(noteKey(id))}>Remove from revision</button>}
          <button className="btn sm" onClick={read} title="Time the reading of this day's news with the study timer"><Play />Read</button>
          <button className={'btn sm' + (editing ? ' primary' : '')} onClick={() => (editing ? done() : setEditing(true))} aria-pressed={editing}><PencilLine />{editing ? 'Done' : 'Edit'}</button>
          <button className="tg" title="Delete this note" aria-label="Delete this note" onClick={del}><Trash2 /></button>
        </span>
      </div>
      {editing && (
        <div className="ca-form inline">
          <Field text="Source" value={entry.sourceName ?? ''} onSave={(v) => updateEntry(id, { sourceName: v })} placeholder="optional" label="Source name" maxLength={80} />
          <Field key={'u' + (entry.sourceUrl ?? '')} text="Link" onBlur value={entry.sourceUrl ?? ''} onSave={(v) => updateEntry(id, { sourceUrl: v })} placeholder="optional — https://…" label="Source link" />
          <Field key={'t' + (entry.tags ?? []).join(',')} text="Tags" onBlur value={(entry.tags ?? []).join(', ')} onSave={(v) => updateEntry(id, { tags: v })} placeholder="optional, comma separated" label="Tags" />
        </div>
      )}

      {editing ? (
        <>
          <Toolbar />
          <NoteEditor key={tick} id={id} html={html} />
        </>
      ) : html ? (
        <div className="sec-body prose ca-body" data-key={noteKey(id)} dangerouslySetInnerHTML={{ __html: shown }} />
      ) : (
        <p className="empty">Nothing written yet. <button className="linkbtn" style={{ color: 'var(--accent)' }} onClick={() => setEditing(true)}>Write the note →</button></p>
      )}

      <section className="ca-links">
        <h3 className="gh"><Link2 />Linked study notes{links.rows.length > 0 && <small className="sm"> · {links.rows.length}</small>}</h3>
        {links.rows.length === 0 && !editing && <p className="none">Not linked to anything. In Edit, link this note to the chapters, sections or PYQs it bears on.</p>}
        {links.rows.length > 0 && (
          <div className="rows">
            {links.rows.map((l) => (
              <div className="row" key={l.key}>
                <a className="t" href={l.to}><b>{l.title}</b><small>{l.context}</small></a>
                {editing && <button className="tg" title="Remove this link" aria-label={`Remove the link to ${l.title}`} onClick={() => updateEntry(id, { linkedContentRefs: refs.filter((r) => linkKey(r) !== l.key) })}><X /></button>}
              </div>
            ))}
          </div>
        )}
        {links.gone > 0 && <p className="fine">{plural(links.gone, 'linked place')} {links.gone === 1 ? 'is' : 'are'} no longer in the library and {links.gone === 1 ? 'is' : 'are'} not shown.</p>}
        {editing && <LinkPicker refs={refs} onAdd={(r) => updateEntry(id, { linkedContentRefs: [...refs, r] })} />}
      </section>
      <p className="fine">Written {stampText(entry.createdAt, tz)}{entry.updatedAt !== entry.createdAt ? ` · changed ${stampText(entry.updatedAt, tz)}` : ''}. Reading time belongs to the day, not the note.</p>
    </div>
  )
}

/**
 * One field of a note. What is typed stays as typed; what is stored is the cleaned value — saved
 * on each change, or (a link, the tags) when the field is left, so that half an address is never kept.
 */
function Field({ value, onSave, label, text, onBlur, bare, ...rest }: { value: string; onSave: (v: string) => void; label: string; text?: string; onBlur?: boolean; bare?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onBlur'>) {
  const [v, setV] = useState(value)
  const input = (
    <input {...rest} value={v} aria-label={label}
      onChange={(e) => { setV(e.target.value); if (!onBlur) onSave(e.target.value) }}
      onBlur={() => onBlur && v !== value && onSave(v)} />
  )
  return bare ? input : <label>{text}{input}</label>
}
