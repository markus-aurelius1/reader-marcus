import { useEffect, useState } from 'react'
import { Pause, Play, Square, Timer as TimerIcon, X } from 'lucide-react'
import type { ActiveStudySession, StudyContext } from '../lib/contract'
import { stageTitle } from '../lib/content'
import { refHref } from '../lib/nav'
import { useStore } from '../lib/store'
import { activeTimer, clock, continueHere, keepAwayTime, ownsTimer, pauseTimer, resumeTimer, startTimer, stopTimer, useStudy } from '../lib/study'
import { clockText, contextKey, durationText, elapsed, shortClock } from '../lib/timer'
import { linked } from '../sync'

/** Prelims → Economy → Economic Concepts, National Income & Growth */
const pathOf = (c: StudyContext) => [stageTitle(c.ref.stage), c.subjectTitle, c.chapterTitle, c.sectionTitle].filter(Boolean).join(' → ')
const sameChapter = (a: StudyContext, b: StudyContext | null) => !!b && contextKey({ ...a, ref: { ...a.ref, sectionId: undefined } }) === contextKey({ ...b, ref: { ...b.ref, sectionId: undefined } })

/** Re-render twice a second while the timer runs; the time itself always comes from the timestamps. */
function useElapsed(a: ActiveStudySession | null) {
  const [, tick] = useState(0)
  const running = a?.state === 'running'
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [running])
  return a ? elapsed(a, clock.now()) : 0
}

function useTimerActions(context: StudyContext | null, say: (m: string) => void) {
  const follow = useStore((s) => s.prefs.timer.followNavigation)
  return {
    // a timer started offline on a linked device cannot know whether another device has one
    start: () => context && startTimer(context, linked() && !navigator.onLine),
    stop: (at?: number) => {
      const s = stopTimer(at)
      say(s ? `Session saved · ${durationText(s.durationMs)}` : 'Timer stopped · nothing to save')
    },
    // the same session carries on here; with follow on, it moves to what is open on this device
    takeOver: () => continueHere(follow && context ? context : undefined),
  }
}

/** Compact timer for the reader header. */
export function TimerControl({ context, say }: { context: StudyContext | null; say: (m: string) => void }) {
  const ready = useStudy((s) => s.ready)
  const a = useStudy(activeTimer)
  const prefs = useStore((s) => s.prefs.timer)
  const [open, setOpen] = useState(false)
  const ms = useElapsed(a)
  const act = useTimerActions(context, say)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!ready) return null
  if (!a) {
    // idle: offered where there is something to time
    return context ? (
      <button className="ib timer" onClick={act.start} title={`Start study timer — ${context.chapterTitle}`} aria-label="Start study timer">
        <TimerIcon /><span className="hide-sm">Start</span>
      </button>
    ) : null
  }
  const mine = ownsTimer(a)
  const paused = a.state === 'paused'
  const state = !mine ? (paused ? 'Paused on another device' : 'Running on another device') : paused ? 'Paused' : 'Running'
  const setPrefs = (patch: Partial<typeof prefs>) => useStore.getState().setPref({ timer: { ...prefs, ...patch } })
  return (
    <>
      <span className={'tchip' + (paused ? ' paused' : '') + (mine ? '' : ' remote')}>
        <button className="ttime" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Study timer, ${state}: ${clockText(ms)}`} title={pathOf(a.currentContext)}>
          <i className="tdot" /><time>{clockText(ms)}</time>
        </button>
        {mine && (paused
          ? <button className="ib hide-md" onClick={resumeTimer} title="Resume" aria-label="Resume timer"><Play /></button>
          : <button className="ib hide-md" onClick={pauseTimer} title="Pause" aria-label="Pause timer"><Pause /></button>)}
        {mine && <button className="ib hide-md" onClick={() => act.stop()} title="Stop and save the session" aria-label="Stop timer"><Square /></button>}
      </span>
      {open && (
        <>
          <div className="backdrop" onClick={() => setOpen(false)} />
          <div className="menu timer-pop" role="dialog" aria-label="Study timer">
            <div className="tp-path">{pathOf(a.currentContext)}</div>
            <div className="tp-time">{clockText(ms)}<small>{state}</small></div>
            {mine ? (
              <div className="tp-ops">
                {paused
                  ? <button className="primary" onClick={resumeTimer}><Play />Resume</button>
                  : <button className="primary" onClick={pauseTimer}><Pause />Pause</button>}
                <button onClick={() => { act.stop(); setOpen(false) }}><Square />Stop</button>
              </div>
            ) : (
              <button className="primary" onClick={() => { act.takeOver(); setOpen(false) }}>Continue here</button>
            )}
            {!sameChapter(a.currentContext, context) && <a href={refHref(a.currentContext.ref)} onClick={() => setOpen(false)}>Open topic</a>}
            <hr />
            <label className="tp-opt">
              <input type="checkbox" checked={prefs.followNavigation} onChange={(e) => setPrefs({ followNavigation: e.target.checked })} />
              Follow the chapter I am reading
            </label>
            <label className="tp-opt">
              Track time by
              <select className="sel" value={prefs.trackingGranularity} onChange={(e) => setPrefs({ trackingGranularity: e.target.value as typeof prefs.trackingGranularity })}>
                <option value="chapter">chapter</option>
                <option value="section">section</option>
              </select>
            </label>
          </div>
        </>
      )}
    </>
  )
}

/** Notices that need a decision: a timer running on another device, or one that ran unattended. */
export function TimerBanner({ context, say }: { context: StudyContext | null; say: (m: string) => void }) {
  const a = useStudy(activeTimer)
  const away = useStudy((s) => s.away)
  const [dismissed, setDismissed] = useState('')
  const ms = useElapsed(a)
  const act = useTimerActions(context, say)
  if (!a) return null
  if (ownsTimer(a)) {
    if (away === null) return null
    const at = new Date(away).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return (
      <div className="tbanner" role="status">
        <span><b>Timer kept running</b> while the app was closed · {durationText(clock.now() - away)}</span>
        <button className="chip u" onClick={keepAwayTime}>Keep the time</button>
        <button className="chip" onClick={() => act.stop(away)}>Stop at {at}</button>
      </div>
    )
  }
  if (dismissed === a.sessionId) return null
  return (
    <div className="tbanner" role="status">
      <span><b>Timer {a.state === 'paused' ? 'paused' : 'running'}</b> — {a.currentContext.subjectTitle} · <time>{shortClock(ms)}</time></span>
      <button className="chip u" onClick={act.takeOver}>Continue here</button>
      {!sameChapter(a.currentContext, context) && <a className="chip" href={refHref(a.currentContext.ref)}>Open topic</a>}
      <button className="x" onClick={() => setDismissed(a.sessionId)} aria-label="Dismiss"><X /></button>
    </div>
  )
}
