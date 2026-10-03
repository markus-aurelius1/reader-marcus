import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronRight, ChevronsUpDown, Star } from 'lucide-react'
import { stageTitle, type Chapter, type Subject } from '../lib/content'
import type { NavigationNode } from '../lib/contract'
import { destinations, navPath, navTree } from '../lib/nav'
import { href, type Route } from '../lib/router'
import { chapterProgress, secTitle, subjectProgress, useStore } from '../lib/store'
import { useSpy } from '../views/Reader'

/** Where to land in a subject: the chapter last read there, else its overview. */
function entryOf(subject: Subject, chapters: Record<string, { at?: number }>) {
  let last: Chapter | undefined
  for (const c of subject.chapters) if (chapters[c.key]?.at && (!last || chapters[c.key].at! > chapters[last.key].at!)) last = c
  return last ? href.reader(last.key, undefined, { resume: true }) : href.subject(subject.key)
}

/** Compact subject switcher: a button that opens the list of subjects in the library. */
export function SubjectSwitcher({ subjects, current, variant }: { subjects: Subject[]; current?: Subject; variant: 'crumb' | 'head' }) {
  const progress = useStore((s) => s.progress)
  const [at, setAt] = useState<{ left: number; top: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!at) return
    const close = () => setAt(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', close)
      window.removeEventListener('resize', close)
    }
  }, [at])
  const toggle = () => {
    if (at) return setAt(null)
    const r = btn.current!.getBoundingClientRect()
    setAt({ left: Math.max(8, Math.min(innerWidth - 288, r.left)), top: r.bottom + 6 })
  }
  const stagesWith = [...new Set(subjects.map((s) => s.stage))]
  return (
    <>
      <button ref={btn} className={variant === 'crumb' ? 'switch-crumb' : 'switch-head'} onClick={toggle} aria-haspopup="listbox" aria-expanded={!!at} aria-label="Switch subject" title="Switch subject">
        {variant === 'head' && (
          <span>
            <b>{current?.title ?? 'All subjects'}</b>
            <small>{current ? `${stageTitle(current.stage)} · ${subjectProgress(progress, current).pct}%` : 'Choose a subject'}</small>
          </span>
        )}
        <ChevronsUpDown />
      </button>
      {at && (
        <>
          <div className="backdrop" onClick={() => setAt(null)} />
          <div className="menu switcher" role="listbox" aria-label="Subjects" style={{ left: at.left, top: at.top }}>
            {stagesWith.map((st) => (
              <div key={st}>
                <div className="lbl">{stageTitle(st)}</div>
                {subjects.filter((s) => s.stage === st).map((s) => (
                  <a key={s.key} role="option" aria-selected={s === current} className={s === current ? 'on' : ''} href={entryOf(s, progress.chapters)}>
                    {s.title}
                    <kbd>{subjectProgress(progress, s).pct}%</kbd>
                  </a>
                ))}
              </div>
            ))}
            <hr />
            <a href={href.study()}><BookOpen />All subjects</a>
          </div>
        </>
      )}
    </>
  )
}

/**
 * Study explorer: stage → paper → subject → topic → chapter → section, drawn from the
 * navigation tree. Only the branch holding the current page is open; any other branch can be
 * opened by hand and folds away again when the subject changes.
 */
export function Explorer({ route, subjects, subject, chapter }: { route: Route; subjects: Subject[]; subject?: Subject; chapter?: Chapter }) {
  const progress = useStore((s) => s.progress)
  const overrides = useStore((s) => s.overrides)
  const favourites = useStore((s) => s.prefs.favourites)
  const spy = useSpy((s) => s.id)
  const { nodes, roots } = navTree()
  const byKey = useMemo(() => new Map(subjects.map((s) => [s.key, s])), [subjects])
  const pinned = useMemo(() => destinations(favourites), [favourites])

  const activeId = chapter?.key ?? subject?.key ?? (route.name === 'study' ? route.stage : undefined)
  const active = useMemo(() => new Set(activeId ? navPath(activeId).map((n) => n.id) : []), [activeId])
  const [manual, setManual] = useState<Record<string, boolean>>({})
  useEffect(() => setManual({}), [subject?.key])
  // with nothing selected, the stages that have content start open
  const hasContent = (n: NavigationNode): boolean => (n.kind === 'subject' ? n.childrenIds.length > 0 : n.childrenIds.some((c) => hasContent(nodes.get(c)!)))
  const isOpen = (n: NavigationNode) => manual[n.id] ?? (active.size ? active.has(n.id) : n.kind === 'stage' && hasContent(n))
  const flip = (n: NavigationNode) => setManual((m) => ({ ...m, [n.id]: !isOpen(n) }))

  const Toggle = ({ n, label }: { n: NavigationNode; label: string }) => (
    <button className={'twist' + (isOpen(n) ? ' open' : '')} onClick={() => flip(n)} aria-expanded={isOpen(n)} aria-label={label}><ChevronRight /></button>
  )

  const render = (id: string): React.ReactNode => {
    const n = nodes.get(id)!
    const open = isOpen(n)
    const kids = open && <div className="kids">{n.childrenIds.map(render)}</div>
    switch (n.kind) {
      case 'stage':
      case 'paper':
      case 'topic':
        return (
          <div key={id} className={'x-' + n.kind}>
            <button className={'x-row' + (active.has(id) ? ' in' : '')} onClick={() => flip(n)} aria-expanded={open}>
              <ChevronRight className={'tw' + (open ? ' open' : '')} />
              <span>{n.title}</span>
              {n.kind === 'topic' && <small>{n.childrenIds.length}</small>}
            </button>
            {kids}
          </div>
        )
      case 'subject': {
        const s = byKey.get(id)
        if (!s) return <span key={id} className="x-row off">{n.title}</span>
        return (
          <div key={id} className="x-subject">
            <div className={'x-row' + (subject === s ? ' in' : '') + (subject === s && route.name === 'subject' ? ' on' : '')}>
              <Toggle n={n} label={`${open ? 'Collapse' : 'Expand'} ${n.title}`} />
              <a href={href.subject(id)}>{n.title}</a>
              <small>{subjectProgress(progress, s).pct}%</small>
            </div>
            {kids}
          </div>
        )
      }
      case 'chapter': {
        const c = byKey.get(navPath(id).find((p) => p.kind === 'subject')!.id)!.chapters.find((c) => c.key === id)!
        const cp = chapterProgress(progress, c)
        const on = chapter === c
        return (
          <div key={id}>
            <a className={'chap' + (on ? ' on' : '')} href={href.reader(id)} aria-current={on ? 'page' : undefined}>
              <i className="dot" data-s={cp.status} />
              <span>{n.title}</span>
              <span className="n">{cp.done}/{cp.total}</span>
            </a>
            {on && (
              <div className="side-secs">
                {c.sections.map((x) => (
                  <a key={x.id} href={href.reader(id, x.id)} className={(spy === x.id ? 'on ' : '') + (progress.sections[x.key]?.done ? 'done' : '')}>
                    {secTitle(overrides, x)}
                  </a>
                ))}
              </div>
            )}
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <>
      <div className="x-head">
        <SubjectSwitcher subjects={subjects} current={subject} variant="head" />
      </div>
      {pinned.length > 0 && (
        <div className="x-pinned">
          <div className="side-h">Favourites</div>
          {pinned.map((d) => (
            <a key={d.id} className="chap" href={d.to} title={d.context}>
              <Star className="pin" />
              <span>{d.title}</span>
            </a>
          ))}
        </div>
      )}
      <nav className="x-tree" aria-label="Study explorer">{roots.map(render)}</nav>
    </>
  )
}
