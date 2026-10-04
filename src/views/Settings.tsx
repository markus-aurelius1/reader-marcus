// Settings: exam targets, revision preferences, and the two personal-data resets.
// Ordinary use needs none of this — revision schedules itself; the scheduler options sit under
// Advanced.
import { useMemo, useState } from 'react'
import { Download, Plus, Star, Trash2, TriangleAlert } from 'lucide-react'
import type { Subject } from '../lib/content'
import type { ExamTarget, RecallIntensity, ResetScope } from '../lib/contract'
import { secTitle, useStore } from '../lib/store'
import { go, href } from '../lib/router'
import { INTENSITIES, INTENSITY_LABEL } from '../lib/recall'
import { DEFAULT_FINAL_WINDOW_DAYS, DEFAULT_RETENTION, RETENTION_RANGE, parseDay } from '../lib/scheduler'
import { addExam, clock, prefsOf, removeExam, scheduleExisting, setPrimaryExam, setRevisionPrefs, updateExam, useRevision } from '../lib/revision'
import { countdown, examDateText, liveExams, primaryExam, type ExamRow } from '../lib/revisionModel'
import { exportBackup, resetPersonalData } from '../lib/reset'
import { dayOf } from '../lib/analytics'
import { timeZone } from '../lib/timer'
import { useSync } from '../sync'
import { plural } from './Insights'

const STAGES: [NonNullable<ExamTarget['stage']>, string][] = [['prelims', 'Prelims'], ['mains', 'Mains'], ['other', 'Other']]
const INTENSITY_HELP: Record<RecallIntensity, string> = {
  light: 'PYQ facts, traps and the answers marked in the notes.',
  standard: 'Also tables and term → meaning lines. The default.',
  exam: 'Everything eligible: whole answers, tables, lists, arrows, traps.',
}

export function SettingsPage({ subjects, say }: { subjects: Subject[]; say: (m: string, ms?: number) => void }) {
  const [reset, setReset] = useState<ResetScope | null>(null)
  return (
    <div className="page settings">
      <div className="eyebrow">Revision · exams · your data</div>
      <h1 className="title">Settings</h1>
      <ExamTargets />
      <RevisionSettings subjects={subjects} say={say} />
      <section className="set">
        <h2 className="sh">Your data</h2>
        <p className="lead">Resets remove personal study data only. The notes, the PYQ corpus, the taxonomy and the cross-links are part of the reader and are never removed.</p>
        <div className="set-row">
          <span><b>Export a backup</b><small>Everything personal on this device, as one JSON file.</small></span>
          <button className="btn" onClick={() => exportBackup().then(() => say('Backup exported'))}><Download />Export backup</button>
        </div>
        <div className="set-row">
          <span><b>Reset study history</b><small>Removes progress, study sessions and the timer, revision schedules and history, recall answers, the study queue, PYQ flags and the Current Affairs day record (completed, missed, caught-up). Keeps highlights, your edits, your Current Affairs notes, ★ / ↻ marks, favourites, appearance, goals and exam targets.</small></span>
          <button className="btn danger" onClick={() => setReset('study-history')}>Reset study history…</button>
        </div>
        <div className="set-row">
          <span><b>Full personal reset</b><small>Removes all of the above and also highlights, your edits to the notes, your Current Affairs notes, ★ / ↻ marks, favourites and goals — a clean start.</small></span>
          <button className="btn danger" onClick={() => setReset('full-personal')}>Full personal reset…</button>
        </div>
      </section>
      {reset && <ResetDialog scope={reset} onClose={() => setReset(null)} say={say} />}
    </div>
  )
}

// ---- exam targets ---------------------------------------------------------------------------
interface Draft {
  name: string
  shortName: string
  examDate: string
  stage: NonNullable<ExamTarget['stage']>
  window: string
}
const draftOf = (e?: ExamRow, window = DEFAULT_FINAL_WINDOW_DAYS): Draft => ({ name: e?.name ?? '', shortName: e?.shortName ?? '', examDate: e?.examDate ?? '', stage: e?.stage ?? 'prelims', window: String(e?.finalRevisionWindowDays ?? window) })

function ExamForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial)
  const ok = d.name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(d.examDate)
  return (
    <form className="exam-form" onSubmit={(e) => { e.preventDefault(); if (ok) onSave(d) }}>
      <label>Name<input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="UPSC CSE Prelims" aria-label="Exam name" maxLength={60} /></label>
      <label>Short name<input value={d.shortName} onChange={(e) => setD({ ...d, shortName: e.target.value })} placeholder="optional" aria-label="Short name" maxLength={16} /></label>
      <label>Date<input type="date" value={d.examDate} onChange={(e) => setD({ ...d, examDate: e.target.value })} aria-label="Exam date" /></label>
      <label>Stage
        <select className="sel" value={d.stage} onChange={(e) => setD({ ...d, stage: e.target.value as Draft['stage'] })} aria-label="Stage">
          {STAGES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      <label>Final revision window<input type="number" min="1" max="120" value={d.window} onChange={(e) => setD({ ...d, window: e.target.value })} aria-label="Final revision window in days" />days</label>
      <div className="acts">
        <button className="btn primary" type="submit" disabled={!ok}>Save</button>
        <button className="linkbtn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function ExamTargets() {
  const rows = useRevision((s) => s.exams)
  const prefRow = useRevision((s) => s.prefs)
  const prefs = useMemo(() => prefsOf(prefRow), [prefRow])
  const [editing, setEditing] = useState<string | null>(null)
  const exams = liveExams(rows)
  const primary = primaryExam(rows)
  const now = clock.now()
  const save = (id: string | null, d: Draft) => {
    const input = { name: d.name.trim(), shortName: d.shortName.trim(), examDate: d.examDate, stage: d.stage, finalRevisionWindowDays: Math.min(120, Math.max(1, Math.round(+d.window) || prefs.finalRevisionWindowDays)) }
    if (id) updateExam(id, input)
    else addExam(input)
    setEditing(null)
  }
  return (
    <section className="set exams">
      <h2 className="sh">Exam targets</h2>
      <p className="lead">The primary exam is counted down on Home and shapes the schedule: a section whose next revision would fall after it is brought into its final revision window instead.</p>
      {exams.length === 0 && editing !== 'new' && <p className="empty" style={{ padding: '2px 0 10px' }}>No exam date set.</p>}
      <div className="rows">
        {exams.map((e) => {
          const days = parseDay(e.examDate) - dayOf(now, e.timeZone)
          const isPrimary = primary?.id === e.id
          return editing === e.id ? (
            <div className="row" key={e.id}><ExamForm initial={draftOf(e)} onSave={(d) => save(e.id, d)} onCancel={() => setEditing(null)} /></div>
          ) : (
            <div className={'row exam' + (e.active ? '' : ' off')} key={e.id} data-exam={e.id}>
              <span className="t">
                <b>{e.name}</b>
                <small>{examDateText(e.examDate)} · {days > 0 ? `${plural(days, 'day')} away` : days === 0 ? 'today' : 'passed'} · final window {plural(e.finalRevisionWindowDays, 'day')}{e.active ? '' : ' · inactive'}</small>
              </span>
              {isPrimary
                ? <span className="chip u"><Star />Primary</span>
                : e.active && <button className="linkbtn" onClick={() => setPrimaryExam(e.id)}>Make primary</button>}
              <label className="tp-opt"><input type="checkbox" checked={e.active} onChange={(ev) => updateExam(e.id, { active: ev.target.checked })} aria-label={`${e.name} active`} />Active</label>
              <button className="linkbtn" onClick={() => setEditing(e.id)}>Edit</button>
              <button className="tg" title="Remove this exam" aria-label={`Remove ${e.name}`} onClick={() => confirm(`Remove ${e.name}?`) && removeExam(e.id)}><Trash2 /></button>
            </div>
          )
        })}
        {editing === 'new' && <div className="row"><ExamForm initial={draftOf(undefined, prefs.finalRevisionWindowDays)} onSave={(d) => save(null, d)} onCancel={() => setEditing(null)} /></div>}
      </div>
      {editing !== 'new' && <div className="acts"><button className="btn" onClick={() => setEditing('new')}><Plus />Add an exam</button></div>}
    </section>
  )
}

// ---- revision -----------------------------------------------------------------------------------
function RevisionSettings({ subjects, say }: { subjects: Subject[]; say: (m: string, ms?: number) => void }) {
  const row = useRevision((s) => s.prefs)
  const units = useRevision((s) => s.units)
  const progress = useStore((s) => s.progress)
  const overrides = useStore((s) => s.overrides)
  const p = useMemo(() => prefsOf(row), [row])
  const device = timeZone()
  // sections already marked done that were never scheduled (they predate this feature)
  const waiting = useMemo(
    () => subjects.flatMap((s) => s.chapters.flatMap((c) => c.sections.filter((x) => progress.sections[x.key]?.done && !units[x.key]).map((x) => ({ key: x.key, title: secTitle(overrides, x) })))),
    [subjects, progress, units, overrides],
  )
  return (
    <section className="set">
      <h2 className="sh">Revision</h2>
      <label className="set-row">
        <span><b>Schedule revision automatically</b><small>A section marked done is revised the next day; after that, each date follows from how well you remembered it.</small></span>
        <input type="checkbox" checked={p.enabled} onChange={(e) => setRevisionPrefs({ enabled: e.target.checked })} aria-label="Schedule revision automatically" />
      </label>
      <div className="set-row">
        <span><b>Recall intensity</b><small>{INTENSITY_HELP[p.recallIntensity]}</small></span>
        <span className="seg" role="group" aria-label="Recall intensity">
          {INTENSITIES.map((i) => <button key={i} className={'chip' + (p.recallIntensity === i ? ' u' : '')} aria-pressed={p.recallIntensity === i} onClick={() => setRevisionPrefs({ recallIntensity: i })}>{INTENSITY_LABEL[i]}</button>)}
        </span>
      </div>
      <label className="set-row">
        <span><b>Guided revision</b><small>Scheduled revision asks one fact at a time, away from the surrounding notes. Off: it shows the section with its answers concealed.</small></span>
        <input type="checkbox" checked={p.guidedRevisionEnabled} onChange={(e) => setRevisionPrefs({ guidedRevisionEnabled: e.target.checked })} aria-label="Guided revision" />
      </label>
      <label className="set-row">
        <span><b>Exam-aware scheduling</b><small>Keep a final revision of each section before the primary exam.</small></span>
        <input type="checkbox" checked={p.examAwareScheduling} onChange={(e) => setRevisionPrefs({ examAwareScheduling: e.target.checked })} aria-label="Exam-aware scheduling" />
      </label>
      {waiting.length > 0 && (
        <div className="set-row" data-k="existing">
          <span><b>Schedule existing completed topics</b><small>{plural(waiting.length, 'section')} marked done earlier {waiting.length === 1 ? 'is' : 'are'} not in revision. This is never done automatically; their first revisions are spread over the coming days.</small></span>
          <button className="btn" onClick={() => say(`${plural(scheduleExisting(waiting), 'section')} scheduled for revision`)}>Schedule {waiting.length}</button>
        </div>
      )}
      <details className="syn adv">
        <summary>Advanced</summary>
        <div className="set-row">
          <span><b>Desired retention</b><small>The chance of recalling a section when its revision falls due. Higher means more frequent revision. Default {DEFAULT_RETENTION.toFixed(2)}.</small></span>
          <span className="rng">
            <input type="range" min={RETENTION_RANGE[0]} max={RETENTION_RANGE[1]} step="0.01" value={p.desiredRetention} onChange={(e) => setRevisionPrefs({ desiredRetention: +e.target.value })} aria-label="Desired retention" />
            <b>{p.desiredRetention.toFixed(2)}</b>
          </span>
        </div>
        <div className="set-row">
          <span><b>Final revision window</b><small>Default for a new exam target.</small></span>
          <span className="rng"><input type="number" min="1" max="120" value={p.finalRevisionWindowDays} onChange={(e) => setRevisionPrefs({ finalRevisionWindowDays: +e.target.value })} aria-label="Default final revision window in days" />days</span>
        </div>
        <div className="set-row">
          <span><b>Scheduler timezone</b><small>Due dates are calendar days in {p.schedulerTimeZone}.{device !== p.schedulerTimeZone ? ` This device is in ${device}.` : ''}</small></span>
          {device !== p.schedulerTimeZone
            ? <button className="btn" onClick={() => setRevisionPrefs({ schedulerTimeZone: device })}>Use {device}</button>
            : <span className="chip">{p.schedulerTimeZone}</span>}
        </div>
      </details>
    </section>
  )
}

// ---- reset ----------------------------------------------------------------------------------------
function ResetDialog({ scope, onClose, say }: { scope: ResetScope; onClose: () => void; say: (m: string, ms?: number) => void }) {
  const user = useSync((s) => s.user)
  const examRows = useRevision((s) => s.exams)
  const upcoming = countdown(examRows, clock.now())
  const [keepExams, setKeepExams] = useState(true)
  const [keepSettings, setKeepSettings] = useState(true)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const full = scope === 'full-personal'
  const run = async () => {
    setBusy(true)
    try {
      await resetPersonalData(scope, { keepExamTargets: keepExams, keepSettings })
      say(full ? 'Personal data reset' : 'Study history reset', 5000)
      onClose()
      go(href.home())
    } catch (e) {
      console.error('[reset]', e)
      say('Reset failed — nothing was changed in the cloud')
      setBusy(false)
    }
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="palette reset" role="dialog" aria-label={full ? 'Full personal reset' : 'Reset study history'}>
        <b className="reset-h"><TriangleAlert />{full ? 'Full personal reset' : 'Reset study history'}</b>
        <p><b>Removed:</b> progress, study sessions and timer, revision schedules and history, recall answers, the study queue, PYQ flags, the Current Affairs day record and recent activity{full ? ', highlights, your edits to the notes, your Current Affairs notes, ★ / ↻ marks, goals and favourites' : ''}.</p>
        <p><b>Kept:</b> {full ? 'the notes, PYQs, taxonomy and cross-links' : 'highlights, your edits, your Current Affairs notes, ★ / ↻ marks, favourites, appearance, goals and exam targets — and the notes, PYQs and cross-links'}.</p>
        {full && (
          <div className="reset-keep">
            <label className="tp-opt"><input type="checkbox" checked={keepExams} onChange={(e) => setKeepExams(e.target.checked)} />Keep exam targets{upcoming ? ` (${upcoming.exam.name})` : ''}</label>
            <label className="tp-opt"><input type="checkbox" checked={keepSettings} onChange={(e) => setKeepSettings(e.target.checked)} />Keep appearance / settings</label>
          </div>
        )}
        <p className="fine">{user ? 'This applies to your account: other devices drop the same data the next time they sync, and cannot bring it back.' : 'This device is not signed in: the reset applies here.'} It cannot be undone.</p>
        <label className="reset-word">Type <b>RESET</b> to confirm<input value={word} onChange={(e) => setWord(e.target.value)} autoFocus aria-label="Type RESET to confirm" autoComplete="off" spellCheck={false} /></label>
        <div className="acts">
          <button className="btn danger solid" disabled={word.trim() !== 'RESET' || busy} onClick={run}>{busy ? 'Resetting…' : full ? 'Reset everything personal' : 'Reset study history'}</button>
          <button className="btn" onClick={() => exportBackup().then(() => say('Backup exported'))}><Download />Export backup first</button>
          <button className="linkbtn" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
