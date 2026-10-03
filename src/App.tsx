import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen, ChartNoAxesColumn, Cloud, Download, Eye, EyeOff, FileText, Highlighter, Home as HomeIcon, Keyboard, Maximize2,
  Menu, Minimize2, MonitorDown, Moon, MoreHorizontal, PencilLine, Printer, RotateCcw, RotateCw, Search, Sun,
} from 'lucide-react'
import { allSubjects, stageTitle, stages } from './lib/content'
import { chapterProgress, flushOverrides, secTitle, subjectProgress, useStore } from './lib/store'
import { go, href, useRoute } from './lib/router'
import { exportHTML, exportMarkdown } from './lib/export'
import { Reader, useSpy } from './views/Reader'
import { Highlights, Home, ProgressView, Revision, SubjectView } from './views/Pages'
import { Palette } from './components/Palette'
import { AccountButton, AccountPanel } from './components/Account'
import { initSync, statusLabel, useSync } from './sync'
import { promptInstall, useInstall } from './lib/install'

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
}

export function App() {
  const { route, n } = useRoute()
  const ready = useStore((s) => s.ready)
  const prefs = useStore((s) => s.prefs)
  const editMode = useStore((s) => s.editMode)
  const focus = useStore((s) => s.focus)
  const saveState = useStore((s) => s.saveState)
  const overrides = useStore((s) => s.overrides)
  const progress = useStore((s) => s.progress)
  const spy = useSpy((s) => s.id)
  const { setPref, set } = useStore.getState()
  const subjects = useMemo(allSubjects, [])
  const [palette, setPalette] = useState(false)
  const [menu, setMenu] = useState(false)
  const [help, setHelp] = useState(false)
  const [account, setAccount] = useState(false)
  const inst = useInstall()
  const [installHelp, setInstallHelp] = useState(false)
  const sync = useSync()
  const conflictCount = useStore((s) => Object.keys(s.conflicts).length)
  const [toast, setToast] = useState('')
  // The sidebar is a persistent column on wide screens and a transient drawer below 1024px.
  const [wide, setWide] = useState(() => matchMedia('(min-width: 1024px)').matches)
  const [drawer, setDrawer] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const sideOpen = wide ? prefs.sidebar : drawer
  const toggleSide = () => (matchMedia('(min-width: 1024px)').matches ? setPref({ sidebar: !useStore.getState().prefs.sidebar }) : setDrawer((d) => !d))

  useEffect(() => {
    useStore.getState().init().then(initSync)
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
  // Leaving the reader ends edit mode; mobile drawer closes on navigation.
  useEffect(() => {
    if (route.name !== 'reader' && editMode) set({ editMode: false })
    setDrawer(false)
    setMenu(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, route.name])

  useEffect(() => {
    document.title = chapter ? `${chapter.title} · ${subject!.title}` : subject ? `${subject.title} · UPSC Notes` : 'UPSC Notes Reader'
  }, [chapter, subject])

  const toastTimer = useRef(0)
  const say = (m: string) => {
    setToast(m)
    clearTimeout(toastTimer.current) // an earlier toast must not cut this one short
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
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
        if (account) return setAccount(false)
        if (help) return setHelp(false)
        if (installHelp) return setInstallHelp(false)
        if (useStore.getState().focus) return set({ focus: false })
      }
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey || palette) return
      const k = e.key
      if (k === '/') { e.preventDefault(); setPalette(true) }
      else if (k === 'r') setPref({ recall: !useStore.getState().prefs.recall })
      else if (k === 'f') set({ focus: !useStore.getState().focus })
      else if (k === 't') setPref({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' })
      else if (k === 'e' && chapter) toggleEdit()
      else if (k === 's') toggleSide()
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

  const section = chapter?.sections.find((s) => s.id === spy)
  const crumbs: { label: string; to?: string }[] =
    route.name === 'reader' && subject && chapter
      ? [
          { label: stageTitle(subject.stage), to: href.home() },
          { label: subject.title, to: href.subject(subject.key) },
          { label: chapter.title, to: href.reader(chapter.key) },
          ...(section ? [{ label: secTitle(overrides, section) }] : []),
        ]
      : route.name === 'subject' && subject
        ? [{ label: stageTitle(subject.stage), to: href.home() }, { label: subject.title }]
        : [{ label: route.name === 'home' ? 'Library' : route.name[0].toUpperCase() + route.name.slice(1) }]

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

  const sideSubject = subject ?? subjects.find((s) => progress.last?.chapterKey.startsWith(s.key + '/')) ?? null
  const cls = ['app', sideOpen && !focus ? 'side-open' : '', focus ? 'focus' : '', prefs.recall ? 'recall' : '', editMode ? 'editing' : ''].join(' ')

  return (
    <div className={cls}>
      <header className="topbar">
        <button className="ib" onClick={toggleSide} aria-label="Toggle sidebar" title="Sidebar (s)"><Menu /></button>
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="cw">
              {i > 0 && <span className="sep">›</span>}
              {c.to ? <a href={c.to}>{c.label}</a> : <span className="c">{c.label}</span>}
            </span>
          ))}
        </nav>
        {editMode && <span className="save hide-sm">{saveState === 'editing' ? 'Editing' : saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}</span>}
        <button className="ib searchbtn" onClick={() => setPalette(true)} aria-label="Search (Ctrl+K)"><Search /><span>Search</span><kbd>Ctrl K</kbd></button>
        <button className={'ib' + (prefs.recall ? ' on' : '')} onClick={() => setPref({ recall: !prefs.recall })} title="Recall Mode (r)" aria-pressed={prefs.recall}>
          {prefs.recall ? <EyeOff /> : <Eye />}<span className="hide-sm">Recall</span>
        </button>
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
        <button className="ib hide-sm" onClick={() => setPref({ theme: dark ? 'light' : 'dark' })} title="Theme (t)" aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
        {chapter && <button className="ib hide-sm" onClick={() => set({ focus: true })} title="Focus Mode (f)" aria-label="Focus mode"><Maximize2 /></button>}
        <button className={'ib' + (menu ? ' on' : '')} onClick={() => setMenu(!menu)} aria-label="More" aria-expanded={menu}><MoreHorizontal /></button>
      </header>

      {menu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setMenu(false)} />
          <div className="menu" role="menu">
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
            <button onClick={() => { setHelp(true); setMenu(false) }}><Keyboard />Keyboard shortcuts<kbd>?</kbd></button>
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

      {account && <AccountPanel onClose={() => setAccount(false)} />}

      <div className="scrim" onClick={() => setDrawer(false)} />
      <aside className="sidebar" aria-label="Navigation">
        <nav className="snav">
          <a href={href.home()} className={route.name === 'home' ? 'on' : ''}><HomeIcon />Library</a>
          <a href="#/highlights" className={route.name === 'highlights' ? 'on' : ''}><Highlighter />Highlights</a>
          <a href="#/revision" className={route.name === 'revision' ? 'on' : ''}><RotateCw />Revision queue</a>
          <a href="#/progress" className={route.name === 'progress' ? 'on' : ''}><ChartNoAxesColumn />Progress</a>
        </nav>
        {sideSubject ? (
          <>
            <a className="side-subject" href={href.subject(sideSubject.key)}>
              <span>{sideSubject.title}</span>
              <small>{stageTitle(sideSubject.stage)} · {subjectProgress(progress, sideSubject).pct}%</small>
            </a>
            <a className={'chap' + (route.name === 'subject' ? ' on' : '')} href={href.subject(sideSubject.key)} style={{ color: 'var(--ink-2)' }}>
              <BookOpen style={{ width: 14, height: 14 }} />Subject overview
            </a>
            {sideSubject.topics.map((t) => (
              <div key={t.id}>
                <div className="side-h">{t.title}</div>
                {sideSubject.chapters.filter((c) => c.topicId === t.id).map((c) => {
                  const cp = chapterProgress(progress, c)
                  const on = chapter === c
                  return (
                    <div key={c.id}>
                      <a className={'chap' + (on ? ' on' : '')} href={href.reader(c.key)}>
                        <i className="dot" data-s={cp.status} />
                        <span>{c.title}</span>
                        <span className="n">{cp.done}/{cp.total}</span>
                      </a>
                      {on && (
                        <div className="side-secs">
                          {c.sections.map((s) => (
                            <a key={s.id} href={href.reader(c.key, s.id)} className={(spy === s.id ? 'on ' : '') + (progress.sections[s.key]?.done ? 'done' : '')}>
                              {secTitle(overrides, s)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        ) : (
          stages.map((st) => (
            <div key={st.id} className="side-lib">
              <div className="side-h">{st.title}</div>
              {st.groups.flatMap((g) => g.subjects).map((s) =>
                s.available ? <a key={s.key} href={href.subject(s.key)}>{s.title}</a> : <span key={s.key} className="off">{s.title}</span>,
              )}
            </div>
          ))
        )}
      </aside>

      <main className="main">
        {route.name === 'reader' && subject && chapter ? (
          <Reader subject={subject} chapter={chapter} route={route} n={n} />
        ) : route.name === 'subject' && subject ? (
          <SubjectView subject={subject} tab={route.tab} />
        ) : route.name === 'highlights' ? (
          <Highlights subjects={subjects} />
        ) : route.name === 'revision' ? (
          <Revision subjects={subjects} />
        ) : route.name === 'progress' ? (
          <ProgressView subjects={subjects} />
        ) : route.name === 'home' ? (
          <Home subjects={subjects} />
        ) : (
          <div className="page"><p className="empty">That page isn't in the library. <a href={href.home()} style={{ color: 'var(--accent)' }}>Back to the library →</a></p></div>
        )}
      </main>

      {focus && <button className="ib focus-exit no-print" onClick={() => set({ focus: false })} title="Exit Focus Mode (Esc)"><Minimize2 /></button>}
      {palette && <Palette onClose={() => setPalette(false)} />}
      {help && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setHelp(false)}>
          <div className="palette" role="dialog" aria-label="Keyboard shortcuts" style={{ padding: '16px 20px', fontSize: 14 }}>
            <b style={{ font: '600 18px var(--serif)' }}>Keyboard shortcuts</b>
            <table style={{ marginTop: 10, borderSpacing: '0 5px' }}>
              <tbody>
                {[
                  ['Ctrl/Cmd + K  or  /', 'Search and quick-jump'],
                  ['j / k', 'Next / previous section'],
                  ['] / [  (n / p)', 'Next / previous chapter'],
                  ['r', 'Recall Mode'],
                  ['e', 'Edit Mode'],
                  ['f', 'Focus Mode (Esc to leave)'],
                  ['s', 'Sidebar'],
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
