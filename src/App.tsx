import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Cloud, Download, Eye, EyeOff, FileText, Highlighter, Keyboard, ListTree, Maximize2,
  Minimize2, MonitorDown, Moon, MoreHorizontal, Newspaper, PencilLine, Printer, RotateCcw, RotateCw, Search, Settings as SettingsIcon, Sun, Waypoints,
} from 'lucide-react'
import { allSubjects, linkIndex, sectionByKey } from './lib/content'
import { flushOverrides, secTitle, useStore } from './lib/store'
import { go, href, useRoute } from './lib/router'
import { exportHTML, exportMarkdown } from './lib/export'
import { Reader, useSpy } from './views/Reader'
import { Highlights, StudyHome, SubjectView } from './views/Pages'
import { PyqHub } from './views/PyqHub'
import { Home } from './views/Home'
import { InsightsPage, TAB_LABEL } from './views/Insights'
import { Palette } from './components/Palette'
import { Explorer, SubjectSwitcher } from './components/Explorer'
import { Rail, TabBar, areaOf } from './components/Nav'
import { Related } from './components/Related'
import { navPath, refHref, studyContext } from './lib/nav'
import { related as relatedTo, relatedPyqs } from './lib/links'
import { initPyqState } from './lib/pyqState'
import { AccountButton, AccountPanel } from './components/Account'
import { initSync, statusLabel, useSync } from './sync'
import { promptInstall, useInstall } from './lib/install'
import { TimerBanner, TimerControl } from './components/Timer'
import { activeTimer, clearNotice, initStudy, ownsTimer, useStudy } from './lib/study'
import { followReading, useRevising } from './lib/revisionRun'
import { contextKey } from './lib/timer'
import { initPlan } from './lib/plan'
import { initRevision, prefsOf, setRevisionPrefs, titles, useRevision } from './lib/revision'
import { initReset } from './lib/reset'
import { INTENSITIES, INTENSITY_LABEL } from './lib/recall'
import { REVISION_TAB_LABEL, RevisionBar, RevisionPage, ReviseView } from './views/Revision'
import { SettingsPage } from './views/Settings'
import { CA_TAB_LABEL, CurrentAffairsPage } from './views/CurrentAffairs'
import { initCurrentAffairs, useCA } from './lib/currentAffairs'
import { dayFull, notesLinking, parseDayId } from './lib/currentAffairsModel'

// a new revision unit is named by its section's current heading
titles.of = (key) => {
  const s = sectionByKey(key)
  return s ? secTitle(useStore.getState().overrides, s) : key
}

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
}

const PAGE: Record<string, string> = { home: 'Home', study: 'Study', pyqs: 'PYQ Hub', insights: 'Insights', highlights: 'Highlights', revision: 'Revision', revise: 'Revision', settings: 'Settings', 'current-affairs': 'Current Affairs' }

export function App() {
  const { route, n } = useRoute()
  const ready = useStore((s) => s.ready)
  const prefs = useStore((s) => s.prefs)
  const editMode = useStore((s) => s.editMode)
  const focus = useStore((s) => s.focus)
  const saveState = useStore((s) => s.saveState)
  const overrides = useStore((s) => s.overrides)
  const spy = useSpy((s) => s.id)
  const { setPref, set } = useStore.getState()
  const subjects = useMemo(allSubjects, [])
  const [palette, setPalette] = useState(false)
  const [menu, setMenu] = useState(false)
  const [rel, setRel] = useState(false)
  const [help, setHelp] = useState(false)
  const [account, setAccount] = useState(false)
  const inst = useInstall()
  const [installHelp, setInstallHelp] = useState(false)
  const sync = useSync()
  const conflictCount = useStore((s) => Object.keys(s.conflicts).length)
  const caEntries = useCA((s) => s.entries)
  const intensity = useRevision((s) => prefsOf(s.prefs).recallIntensity)
  const [toast, setToast] = useState('')
  // The study explorer is a persistent column on wide screens, a drawer on tablets and a
  // bottom sheet on phones. It belongs to the Study area only.
  const [wide, setWide] = useState(() => matchMedia('(min-width: 1024px)').matches)
  const [drawer, setDrawer] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const area = areaOf(route)
  const inStudy = area === 'study'
  const sideOpen = inStudy && (wide ? prefs.sidebar : drawer)
  const toggleSide = () => (matchMedia('(min-width: 1024px)').matches ? setPref({ sidebar: !useStore.getState().prefs.sidebar }) : setDrawer((d) => !d))

  useEffect(() => {
    useStore.getState().init().then(initStudy).then(initPlan).then(initPyqState).then(initRevision).then(initCurrentAffairs).then(initReset).then(initSync)
  }, [])

  // Theme
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const t = prefs.theme === 'system' ? (mq.matches ? 'dark' : 'light') : prefs.theme
      document.documentElement.dataset.theme = t
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#15161a' : '#f7f4ee')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [prefs.theme])
  const dark = document.documentElement.dataset.theme === 'dark'

  const subject = route.name === 'reader' || route.name === 'subject' ? subjects.find((s) => s.key === route.subjectKey) : undefined
  const chapter = route.name === 'reader' ? subject?.chapters.find((c) => c.id === route.chapterId) : undefined
  // What a study timer would track here: the chapter, or the section in view when tracking by section.
  const spySection = chapter?.sections.find((s) => s.id === spy)
  const timerCtx = subject && chapter ? studyContext(subject, chapter, prefs.timer.trackingGranularity === 'section' && spySection ? { id: spySection.id, title: secTitle(overrides, spySection) } : undefined) : null
  const timerKey = timerCtx ? contextKey(timerCtx) : ''
  const studyReady = useStudy((s) => s.ready)
  const timerAway = useStudy((s) => s.away)
  const timerMine = useStudy((s) => ownsTimer(activeTimer(s)))
  const revisionReady = useRevision((s) => s.ready)
  const revising = useRevising()
  const onRevision = !!revising && (route.name === 'reader' || route.name === 'revise' || (route.name === 'current-affairs' && route.view === 'note'))
  // A running timer follows the reader: the span for the previous chapter ends, the next begins.
  // While a revision is in progress the reader is showing its notes, and the timer stays in its span.
  useEffect(() => {
    if (studyReady && timerCtx && prefs.timer.followNavigation) followReading(timerCtx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, studyReady, timerAway, prefs.timer.followNavigation, timerMine, revisionReady, revising?.eventId])
  const timerNotice = useStudy((s) => s.notice)
  useEffect(() => {
    if (!timerNotice) return
    say(timerNotice, 7000)
    clearNotice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerNotice])
  // Leaving the reader ends edit mode; mobile drawer closes on navigation.
  useEffect(() => {
    if (route.name !== 'reader' && editMode) set({ editMode: false })
    setDrawer(false)
    setMenu(false)
    setRel(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, route.name])

  useEffect(() => {
    document.title = chapter ? `${chapter.title} · ${subject!.title}` : subject ? `${subject.title} · UPSC Notes` : route.name === 'home' ? 'UPSC Notes Reader' : `${PAGE[route.name]} · UPSC Notes`
  }, [chapter, subject, route.name])

  const toastTimer = useRef(0)
  const say = (m: string, ms = 3200) => {
    setToast(m)
    clearTimeout(toastTimer.current) // an earlier toast must not cut this one short
    toastTimer.current = window.setTimeout(() => setToast(''), ms)
  }
  useEffect(() => {
    if (inst.installed) say('App installed')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inst.installed])
  const toggleEdit = async () => {
    if (editMode) await flushOverrides()
    set({ editMode: !editMode })
  }
  const stepChapter = (d: number) => {
    if (!subject || !chapter) return
    const c = subject.chapters[subject.chapters.indexOf(chapter) + d]
    if (c) go(href.reader(c.key))
  }
  const stepSection = (d: number) => {
    if (!chapter) return
    const i = chapter.sections.findIndex((s) => s.id === useSpy.getState().id)
    const s = chapter.sections[Math.max(0, Math.min(chapter.sections.length - 1, i + d))]
    if (s) document.getElementById('s-' + s.id)?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        return setPalette((p) => !p)
      }
      if (e.key === 'Escape') {
        if (menu) return setMenu(false)
        if (rel) return setRel(false)
        if (account) return setAccount(false)
        if (help) return setHelp(false)
        if (installHelp) return setInstallHelp(false)
        if (useStore.getState().focus) return set({ focus: false })
      }
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey || palette) return
      const k = e.key
      if (k === '/') { e.preventDefault(); setPalette(true) }
      else if (k === 'r') setPref({ recall: !useStore.getState().prefs.recall })
      else if (k === 'R') {
        // Shift+R: the next recall intensity
        const next = INTENSITIES[(INTENSITIES.indexOf(prefsOf(useRevision.getState().prefs).recallIntensity) + 1) % INTENSITIES.length]
        setRevisionPrefs({ recallIntensity: next })
        say(`Recall intensity: ${INTENSITY_LABEL[next]}`)
      }
      else if (k === 'f') set({ focus: !useStore.getState().focus })
      else if (k === 't') setPref({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' })
      else if (k === 'e' && chapter) toggleEdit()
      else if (k === 's' && inStudy) toggleSide()
      else if (k === ']' || k === 'n') stepChapter(1)
      else if (k === '[' || k === 'p') stepChapter(-1)
      else if (k === 'j') stepSection(1)
      else if (k === 'k') stepSection(-1)
      else if (k === '?') setHelp(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!ready) return <div className="page"><p className="empty">Loading notes…</p></div>

  const section = spySection
  // Breadcrumbs follow the navigation tree (stage › paper › subject › chapter), then the section in view.
  const trail = (id: string) => navPath(id).filter((x) => x.kind !== 'topic').map((x) => ({ label: x.title, to: refHref(x.target), sw: x.kind === 'subject' }))
  const crumbs: { label: string; to?: string; sw?: boolean }[] =
    route.name === 'reader' && subject && chapter
      ? [...trail(chapter.key), ...(section ? [{ label: secTitle(overrides, section) }] : [])]
      : route.name === 'subject' && subject
        ? trail(subject.key).map((c, i, all) => (i === all.length - 1 ? { ...c, to: undefined } : c))
        : route.name === 'study' && navPath(route.stage ?? '').length
          ? [{ label: PAGE.study, to: href.study() }, { label: navPath(route.stage!)[0].title }]
          : route.name === 'insights' && route.tab !== 'overview'
            ? [{ label: PAGE.insights, to: href.insights() }, { label: TAB_LABEL[route.tab] }]
            : route.name === 'revision' && route.tab !== 'today'
              ? [{ label: PAGE.revision, to: href.revision() }, { label: REVISION_TAB_LABEL[route.tab] }]
              : route.name === 'revise'
                ? [{ label: PAGE.revision, to: href.revision() }, { label: 'Scheduled revision' }]
                : route.name === 'current-affairs' && route.view !== 'today'
                  ? [{ label: PAGE['current-affairs'], to: href.currentAffairs() }, { label: route.view === 'day' ? (/^\d{4}-\d{2}-\d{2}$/.test(route.id ?? '') ? dayFull(parseDayId(route.id!)) : 'Day') : route.view === 'note' ? 'Note' : CA_TAB_LABEL[route.view] }]
            : [{ label: PAGE[route.name] }]

  const resetEdits = async (prefix: string, what: string) => {
    setMenu(false)
    if (!confirm(`Reset local edits for ${what}?\n\nThis restores the original text. Highlights, progress, status and reading position are kept.`)) return
    if (editMode) set({ editMode: false })
    const r = await useStore.getState().resetOverrides(prefix)
    say(r.unplaced ? `Edits reset · ${r.unplaced} highlight${r.unplaced > 1 ? 's' : ''} on removed text kept on the Highlights page` : 'Edits reset · highlights kept')
  }
  const doExport = async (kind: 'html' | 'md', whole: boolean) => {
    setMenu(false)
    if (!subject) return
    await flushOverrides()
    const chs = whole || !chapter ? subject.chapters : [chapter]
    const o = useStore.getState().overrides
    if (kind === 'html') exportHTML(subject, chs, o)
    else exportMarkdown(subject, chs, o)
    say(`Exported ${kind === 'html' ? 'HTML' : 'Markdown'}`)
  }

  const at = subject && chapter ? subject.chapters.indexOf(chapter) : -1
  const prevCh = subject?.chapters[at - 1]
  const nextCh = at >= 0 ? subject?.chapters[at + 1] : undefined
  // Related: everything cross-linked with this chapter — the section in view first, then the rest —
  // and the PYQs recorded against it. Read from the static index; nothing is scanned here.
  const relKeys = chapter ? [...(section ? [section.key] : []), chapter.key, ...chapter.sections.map((x) => x.key)] : []
  const related = chapter ? relatedTo(linkIndex(), relKeys) : []
  const relatedPyqCount = chapter ? relatedPyqs(linkIndex(), relKeys).length : 0
  // Current Affairs notes the learner linked to this chapter or its sections (derived backlinks)
  const caNotes = chapter ? notesLinking(caEntries, relKeys) : []
  const cls = ['app', sideOpen && !focus ? 'side-open' : '', focus ? 'focus' : '', prefs.recall ? 'recall' : '', `ri-${intensity}`, editMode ? 'editing' : '', onRevision ? 'revising' : ''].join(' ')

  return (
    <div className={cls}>
      <Rail area={area} onSearch={() => setPalette(true)} />
      <header className="topbar">
        {inStudy && <button className={'ib' + (sideOpen ? ' on' : '')} onClick={toggleSide} aria-label="Study explorer" aria-expanded={sideOpen} title="Study explorer (s)"><ListTree /></button>}
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="cw">
              {i > 0 && <span className="sep">›</span>}
              {c.to ? <a href={c.to}>{c.label}</a> : <span className="c">{c.label}</span>}
              {c.sw && <SubjectSwitcher subjects={subjects} current={subject} variant="crumb" />}
            </span>
          ))}
        </nav>
        <TimerControl context={timerCtx} say={say} />
        {editMode && <span className="save hide-sm">{saveState === 'editing' ? 'Editing' : saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}</span>}
        {chapter && (
          <span className="pager hide-sm">
            <button className="ib" disabled={!prevCh} onClick={() => stepChapter(-1)} title={prevCh ? `Previous: ${prevCh.title} ([)` : 'First chapter'} aria-label="Previous chapter"><ChevronLeft /></button>
            <button className="ib" disabled={!nextCh} onClick={() => stepChapter(1)} title={nextCh ? `Next: ${nextCh.title} (])` : 'Last chapter'} aria-label="Next chapter"><ChevronRight /></button>
          </span>
        )}
        {related.length + relatedPyqCount + caNotes.length > 0 && (
          <button className={'ib hide-sm' + (rel ? ' on' : '')} onClick={() => { setMenu(false); setRel(!rel) }} title="Related" aria-label={`Related (${related.length + caNotes.length})`} aria-expanded={rel}>
            <Waypoints /><span className="hide-md">Related</span>
          </button>
        )}
        <button className="ib only-sm" onClick={() => setPalette(true)} aria-label="Search"><Search /></button>
        {chapter && (
          <button className={'ib' + (prefs.recall ? ' on' : '')} onClick={() => setPref({ recall: !prefs.recall })} title={`Recall Mode (r) · ${INTENSITY_LABEL[intensity]} — Shift+R changes the intensity`} aria-pressed={prefs.recall}>
            {prefs.recall ? <EyeOff /> : <Eye />}<span className="hide-sm">Recall</span>
          </button>
        )}
        {chapter && (
          <button className={'ib' + (editMode ? ' on' : '')} onClick={toggleEdit} title="Edit Mode (e)" aria-pressed={editMode}>
            <PencilLine /><span className="hide-sm">{editMode ? 'Done' : 'Edit'}</span>
          </button>
        )}
        {inst.available && (
          <button className={'ib install' + (chapter ? ' hide-sm' : '')} onClick={() => promptInstall()} title="Install this app on your device" aria-label="Install app">
            <MonitorDown /><span className="hide-sm">Install</span>
          </button>
        )}
        <AccountButton open={account} onClick={() => { setMenu(false); setAccount(!account) }} />
        <button className="ib hide-md" onClick={() => setPref({ theme: dark ? 'light' : 'dark' })} title="Theme (t)" aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
        {chapter && <button className="ib hide-md" onClick={() => set({ focus: true })} title="Focus Mode (f)" aria-label="Focus mode"><Maximize2 /></button>}
        <button className={'ib hide-sm' + (menu ? ' on' : '')} onClick={() => setMenu(!menu)} aria-label="More" aria-expanded={menu}><MoreHorizontal /></button>
      </header>

      {menu && (
        <>
          <div className="backdrop" onClick={() => setMenu(false)} />
          <div className="menu more" role="menu">
            <a className="only-sm" href={href.highlights()}><Highlighter />Highlights</a>
            <a href={href.revision()}><RotateCw />Revision</a>
            <a href={href.currentAffairs()}><Newspaper />Current Affairs</a>
            <a href={href.settings()}><SettingsIcon />Settings</a>
            {chapter && related.length + relatedPyqCount + caNotes.length > 0 && <button className="only-sm" onClick={() => { setMenu(false); setRel(true) }}><Waypoints />Related notes &amp; PYQs</button>}
            <hr />
            {subject && (
              <>
                <div className="lbl">Export — includes your edits</div>
                {chapter && <button onClick={() => doExport('html', false)}><Download />Export Updated HTML — this chapter</button>}
                <button onClick={() => doExport('html', true)}><Download />Export Updated HTML — whole subject</button>
                {chapter && <button onClick={() => doExport('md', false)}><FileText />Export to Markdown — this chapter</button>}
                <button onClick={() => doExport('md', true)}><FileText />Export to Markdown — whole subject</button>
                {chapter && <button onClick={() => { setMenu(false); setTimeout(() => window.print(), 50) }}><Printer />Print / Save as PDF</button>}
                <hr />
              </>
            )}
            {inst.available ? (
              <><button onClick={() => { setMenu(false); promptInstall() }}><MonitorDown />Install app</button><hr /></>
            ) : inst.manual ? (
              <><button onClick={() => { setMenu(false); setInstallHelp(true) }}><MonitorDown />Install app…</button><hr /></>
            ) : null}
            <button onClick={() => { setPref({ theme: dark ? 'light' : 'dark' }); setMenu(false) }}>{dark ? <Sun /> : <Moon />}{dark ? 'Light theme' : 'Dark theme'}<kbd>t</kbd></button>
            {chapter && <button onClick={() => { set({ focus: true }); setMenu(false) }}><Maximize2 />Focus Mode<kbd>f</kbd></button>}
            <button className="hide-sm" onClick={() => { setHelp(true); setMenu(false) }}><Keyboard />Keyboard shortcuts<kbd>?</kbd></button>
            <button onClick={() => { setMenu(false); setAccount(true) }}><Cloud />Account &amp; sync<kbd>{statusLabel(sync, conflictCount)}</kbd></button>
            {subject && (
              <>
                <hr />
                {chapter && <button className="danger" onClick={() => resetEdits(chapter.key, 'this chapter')}><RotateCcw />Reset Local Edits — this chapter</button>}
                <button className="danger" onClick={() => resetEdits(subject.key, subject.title)}><RotateCcw />Reset Local Edits — whole subject</button>
              </>
            )}
          </div>
        </>
      )}

      {rel && subject && (
        <>
          <div className="backdrop" onClick={() => setRel(false)} />
          <div className="menu relmenu" role="dialog" aria-label="Related">
            <Related items={related} from={subject.key} label="Related" max={8} grouped pyqs={relatedPyqCount} pyqFilter={{ stage: subject.stage === 'prelims' ? undefined : subject.stage, subject: subject.id, chapter: chapter?.id }} notes={caNotes} />
          </div>
        </>
      )}

      {account && <AccountPanel onClose={() => setAccount(false)} />}

      <div className="scrim" onClick={() => setDrawer(false)} />
      <aside className="sidebar" aria-label="Study explorer" aria-hidden={!sideOpen}>
        {inStudy && <Explorer route={route} subjects={subjects} subject={subject} chapter={chapter} />}
      </aside>

      <RevisionBar route={route} say={say} />
      <main className="main">
        {route.name === 'reader' && subject && chapter ? (
          <Reader subject={subject} chapter={chapter} route={route} n={n} />
        ) : route.name === 'subject' && subject ? (
          <SubjectView subject={subject} tab={route.tab} />
        ) : route.name === 'study' ? (
          <StudyHome stage={route.stage} />
        ) : route.name === 'pyqs' ? (
          <PyqHub subjects={subjects} filter={route.filter} />
        ) : route.name === 'insights' ? (
          <InsightsPage subjects={subjects} tab={route.tab} />
        ) : route.name === 'highlights' ? (
          <Highlights subjects={subjects} />
        ) : route.name === 'revision' ? (
          <RevisionPage subjects={subjects} tab={route.tab} />
        ) : route.name === 'revise' ? (
          <ReviseView subjects={subjects} unitId={route.unitId} say={say} />
        ) : route.name === 'current-affairs' ? (
          <CurrentAffairsPage route={route} say={say} />
        ) : route.name === 'settings' ? (
          <SettingsPage subjects={subjects} say={say} />
        ) : route.name === 'home' ? (
          <Home subjects={subjects} say={say} />
        ) : (
          <div className="page"><p className="empty">That page isn't in the library. <a href={href.study()} style={{ color: 'var(--accent)' }}>Back to the library →</a></p></div>
        )}
      </main>

      <TabBar area={area} more={menu} onMore={() => { setAccount(false); setMenu(!menu) }} />

      <TimerBanner context={timerCtx} say={say} />
      {focus && <button className="ib focus-exit no-print" onClick={() => set({ focus: false })} title="Exit Focus Mode (Esc)"><Minimize2 /></button>}
      {palette && <Palette onClose={() => setPalette(false)} />}
      {help && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setHelp(false)}>
          <div className="palette" role="dialog" aria-label="Keyboard shortcuts" style={{ padding: '16px 20px', fontSize: 14 }}>
            <b style={{ font: '600 18px var(--serif)' }}>Keyboard shortcuts</b>
            <table style={{ marginTop: 10, borderSpacing: '0 5px' }}>
              <tbody>
                {[
                  ['Ctrl/Cmd + K  or  /', 'Search notes and PYQs, quick-jump'],
                  ['j / k', 'Next / previous section'],
                  ['] / [  (n / p)', 'Next / previous chapter'],
                  ['r  /  Shift + r', 'Recall Mode / recall intensity'],
                  ['e', 'Edit Mode'],
                  ['f', 'Focus Mode (Esc to leave)'],
                  ['s', 'Study explorer'],
                  ['t', 'Light / dark theme'],
                  ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / redo while editing'],
                ].map(([k, d]) => (
                  <tr key={k}><td style={{ paddingRight: 18, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{k}</td><td>{d}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {installHelp && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setInstallHelp(false)}>
          <div className="palette" role="dialog" aria-label="Install app" style={{ padding: '16px 20px', fontSize: 14, lineHeight: 1.55 }}>
            <b style={{ font: '600 18px var(--serif)' }}>Install app</b>
            {inst.manual === 'ios' ? (
              <ol style={{ margin: '10px 0 4px', paddingLeft: 20 }}>
                <li>Open this page in <b>Safari</b>.</li>
                <li>Tap <b>Share</b> (the square with an arrow).</li>
                <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
              </ol>
            ) : (
              <ol style={{ margin: '10px 0 4px', paddingLeft: 20 }}>
                <li>Open the browser menu (<b>⋮</b>).</li>
                <li>Choose <b>Install</b> or <b>Add to Home screen</b>.</li>
              </ol>
            )}
            <p style={{ margin: '6px 0 0', color: 'var(--ink-2)', fontSize: 13 }}>The app then opens full-screen from your home screen and works offline.</p>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
