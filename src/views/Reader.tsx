import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { create } from 'zustand'
import { Check, ChevronDown, RotateCw, Star, X } from 'lucide-react'
import { linkGraph, type Chapter, type Section, type Subject } from '../lib/content'
import { neighbours, type Place } from '../lib/links'
import { STATUS_LABEL, chapterProgress, highlightsBySection, secHtml, secTitle, useStore, type Highlight, type Status } from '../lib/store'
import { href, type Route } from '../lib/router'
import { COLORS, applyHighlights, markExtent, marksInRange, newHid, rangeOffsets, squash, type Color } from '../lib/highlight'
import { flashText } from '../lib/search'
import { EditorSection, Toolbar, editors } from '../editor/Editor'
import { Related } from '../components/Related'
import { chapterRef, recordVisit } from '../lib/nav'
import { FavButton } from './Pages'
import { QueueButton } from '../components/Queue'

/** Section currently in view — read by the top bar breadcrumbs and the sidebar. */
export const useSpy = create<{ id?: string }>(() => ({}))

type ReaderRoute = Extract<Route, { name: 'reader' }>
// Navigation counter value at first render: a reader URL opened at boot resumes its saved position.
let bootNav: number | null = null

export function Reader({ subject, chapter, route, n }: { subject: Subject; chapter: Chapter; route: ReaderRoute; n: number }) {
  const overrides = useStore((s) => s.overrides)
  const progress = useStore((s) => s.progress)
  const highlights = useStore((s) => s.highlights)
  const ext = useStore((s) => s.ext)
  const bySection = useMemo(() => highlightsBySection(highlights), [highlights])
  const editMode = useStore((s) => s.editMode)
  const collapsed = useStore((s) => s.prefs.collapsed)
  const { setChapter, setPref } = useStore.getState()
  const root = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const cp = chapterProgress(progress, chapter)
  const idx = subject.chapters.indexOf(chapter)
  const prev = subject.chapters[idx - 1]
  const next = subject.chapters[idx + 1]
  const graph = linkGraph()
  const chapterLinks = useMemo(() => neighbours(graph, chapter.key), [graph, chapter.key])

  useEffect(() => {
    const st = useStore.getState()
    const status = st.progress.chapters[chapter.key]?.status
    st.setChapter(chapter.key, { at: Date.now(), status: !status || status === 'new' ? 'reading' : status }, true)
    recordVisit(chapterRef(chapter), chapter.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.key])

  // Position on every navigation: explicit section > resume/boot position > top.
  useLayoutEffect(() => {
    const st = useStore.getState()
    const saved = st.progress.chapters[chapter.key]
    if (bootNav === null) bootNav = n
    const first = bootNav === n
    if (route.sectionId) {
      if (st.prefs.collapsed.includes(`${chapter.key}/${route.sectionId}`)) {
        st.setPref({ collapsed: st.prefs.collapsed.filter((k) => k !== `${chapter.key}/${route.sectionId}`) })
      }
      const el = document.getElementById('s-' + route.sectionId)
      el?.scrollIntoView()
      if (el && route.hid) {
        const m = el.querySelector<HTMLElement>(`mark[data-hid="${route.hid}"]`)
        if (m) {
          m.scrollIntoView({ block: 'center' })
          el.querySelectorAll(`mark[data-hid="${route.hid}"]`).forEach((x) =>
            x.animate([{ outline: '3px solid var(--accent)', outlineOffset: '2px' }, { outline: '3px solid transparent', outlineOffset: '2px' }], { duration: 1800 }),
          )
        }
      } else if (el && route.q) flashText(el, route.q)
    } else if ((route.resume || first) && saved?.scroll) window.scrollTo(0, saved.scroll)
    else window.scrollTo(0, 0)
    useSpy.setState({ id: route.sectionId ?? saved?.section })
  }, [chapter.key, route.sectionId, route.hid, route.q, route.resume, n])

  // Scroll spy, reading-progress bar and reading-position persistence.
  useEffect(() => {
    let spyTimer = 0
    let saveTimer = 0
    const measure = () => {
      spyTimer = 0
      let cur: string | undefined
      for (const el of root.current?.querySelectorAll<HTMLElement>('.sec') ?? []) {
        if (el.getBoundingClientRect().top <= 130) cur = el.id.slice(2)
        else break
      }
      if (useSpy.getState().id !== cur) useSpy.setState({ id: cur })
      clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => setChapter(chapter.key, { scroll: Math.round(scrollY), section: cur }), 300)
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`
      // timer-based throttle: keeps working when the tab is not being painted
      if (!spyTimer) spyTimer = window.setTimeout(measure, 100)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(spyTimer)
      clearTimeout(saveTimer)
    }
  }, [chapter.key, setChapter])

  const onClick = (e: React.MouseEvent) => {
    const rc = (e.target as Element).closest?.('.rc')
    if (rc && useStore.getState().prefs.recall && !editMode) rc.classList.toggle('shown')
  }
  const allKeys = chapter.sections.map((s) => s.key)
  const anyOpen = allKeys.some((k) => !collapsed.includes(k))

  return (
    <div className="page" ref={root} onClick={onClick} key={chapter.key}>
      <div className="readbar" ref={bar} />
      <div className="eyebrow">{chapter.topicTitle}</div>
      <h1 className="title">{chapter.title}</h1>
      <div className="chap-meta">
        <select
          aria-label="Chapter status"
          value={cp.status}
          onChange={(e) => setChapter(chapter.key, { status: e.target.value as Status })}
        >
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <span>{cp.done} / {cp.total} sections done</span>
        <span className="meter" style={{ width: 90 }}><i style={{ width: `${cp.total ? (cp.done / cp.total) * 100 : 0}%` }} /></span>
        <FavButton target={chapterRef(chapter)} what="this chapter" />
        <QueueButton target={chapterRef(chapter)} title={chapter.title} />
        <button
          className="linkbtn"
          style={{ marginLeft: 'auto' }}
          onClick={() =>
            setPref({ collapsed: anyOpen ? [...new Set([...collapsed, ...allKeys])] : collapsed.filter((k) => !allKeys.includes(k)) })
          }
        >
          {anyOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      {editMode && <Toolbar />}
      {chapter.sections.map((s) => (
        <SectionView
          key={s.key}
          section={s}
          title={secTitle(overrides, s)}
          html={secHtml(overrides, s)}
          marks={bySection[s.key]}
          related={graph.from.get(s.key)}
          from={subject.key}
          tick={ext[s.key] ?? 0}
          edit={editMode}
          closed={!editMode && collapsed.includes(s.key)}
          state={progress.sections[s.key]}
        />
      ))}
      <Related places={chapterLinks} from={subject.key} label="Related chapters" />
      <nav className="pn" aria-label="Chapter navigation">
        {prev ? <a href={href.reader(prev.key)}><small>← Previous</small><b>{prev.title}</b></a> : <span style={{ flex: 1 }} />}
        {next ? <a className="next" href={href.reader(next.key)}><small>Next →</small><b>{next.title}</b></a> : <span style={{ flex: 1 }} />}
      </nav>
      <SelectionPalette />
    </div>
  )
}

interface SecProps {
  section: Section
  title: string
  html: string
  marks?: Highlight[]
  related?: Place[] // sections elsewhere that link here
  from: string
  tick: number // changes when another device updated this section
  edit: boolean
  closed: boolean
  state?: { done?: boolean; difficult?: boolean; revise?: boolean }
}
const SectionView = memo(function SectionView({ section, title, html, marks, related, from, tick, edit, closed, state }: SecProps) {
  const { setSection, setPref, saveOverride } = useStore.getState()
  // highlights are stored apart from the text and laid over it here
  const shown = useMemo(() => (marks?.length ? applyHighlights(html, marks).html : html), [html, marks])
  const toggle = () => {
    const c = useStore.getState().prefs.collapsed
    setPref({ collapsed: c.includes(section.key) ? c.filter((k) => k !== section.key) : [...c, section.key] })
  }
  return (
    <section id={'s-' + section.id} className={'sec' + (closed ? ' closed' : '') + (state?.done ? ' is-done' : '')}>
      <header className="sec-head">
        {!edit && (
          <button className="chev" onClick={toggle} aria-label={closed ? 'Expand section' : 'Collapse section'} aria-expanded={!closed}>
            <ChevronDown />
          </button>
        )}
        {edit ? (
          <input className="h2" aria-label="Section heading" value={title} onChange={(e) => saveOverride(section.key, { title: e.target.value })} />
        ) : (
          <h2 onClick={toggle}>{title}</h2>
        )}
        <div className="sec-tools">
          <button className={'tg star' + (state?.difficult ? ' on' : '')} title="★ Difficult" aria-pressed={!!state?.difficult} onClick={() => setSection(section.key, { difficult: !state?.difficult })}><Star /></button>
          <button className={'tg rev' + (state?.revise ? ' on' : '')} title="↻ Revise" aria-pressed={!!state?.revise} onClick={() => setSection(section.key, { revise: !state?.revise })}><RotateCw /></button>
          <button className={'tg done' + (state?.done ? ' on' : '')} title="Mark section done" aria-pressed={!!state?.done} onClick={() => setSection(section.key, { done: !state?.done })}><Check /></button>
        </div>
      </header>
      <div className="sec-wrap">
        <div>
          {edit ? <EditorSection key={tick} section={section} /> : <div className="sec-body prose" data-key={section.key} dangerouslySetInnerHTML={{ __html: shown }} />}
          {!edit && related && <Related places={related} from={from} />}
        </div>
      </div>
    </section>
  )
})

// ---- floating highlight palette -------------------------------------------
interface Pal {
  x: number
  y: number
  body: HTMLElement
  hids: string[]
  fromMark: boolean
}

function SelectionPalette() {
  const [pal, setPal] = useState<Pal | null>(null)
  const palRef = useRef<Pal | null>(null)
  palRef.current = pal

  useEffect(() => {
    let timer = 0
    const bodyOf = (n: Node | null) => (n instanceof Element ? n : n?.parentElement)?.closest<HTMLElement>('.sec-body[data-key]') ?? null
    const place = (rect: DOMRect) => {
      // above the selection with a mouse; below on touch (clear of the native selection menu);
      // flipped whenever the preferred side has no room
      const coarse = matchMedia('(pointer: coarse)').matches
      const above = rect.top - 46
      const below = rect.bottom + 10
      const fitsAbove = above > 56
      const fitsBelow = below < innerHeight - 44
      const y = coarse ? (fitsBelow || !fitsAbove ? below : above) : fitsAbove || !fitsBelow ? above : below
      return { x: Math.max(8, Math.min(innerWidth - 196, rect.left + rect.width / 2 - 94)), y: Math.max(8, Math.min(innerHeight - 44, y)) }
    }
    const fromSelection = () => {
      const sel = getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount || !sel.toString().trim()) {
        if (palRef.current && !palRef.current.fromMark) setPal(null)
        return
      }
      const range = sel.getRangeAt(0)
      const body = bodyOf(range.startContainer)
      if (!body || body !== bodyOf(range.endContainer)) return setPal(null)
      setPal({ ...place(range.getBoundingClientRect()), body, hids: marksInRange(range, body), fromMark: false })
    }
    const onSel = () => {
      clearTimeout(timer)
      timer = window.setTimeout(fromSelection, 180)
    }
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('.hlpal')) return
      const mark = t.closest?.('mark[data-hid]')
      const body = bodyOf(t)
      if (mark && body && getSelection()?.isCollapsed && !useStore.getState().editMode) {
        setPal({ ...place(mark.getBoundingClientRect()), body, hids: [mark.getAttribute('data-hid')!], fromMark: true })
      } else if (palRef.current?.fromMark) setPal(null)
    }
    const hide = () => palRef.current?.fromMark && setPal(null)
    document.addEventListener('selectionchange', onSel)
    document.addEventListener('click', onClick)
    window.addEventListener('scroll', hide, { passive: true })
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', onSel)
      document.removeEventListener('click', onClick)
      window.removeEventListener('scroll', hide)
    }
  }, [])

  if (!pal) return null
  const key = pal.body.dataset.key!
  const editor = editors.get(key)
  const store = useStore.getState()
  const done = () => {
    getSelection()?.removeAllRanges()
    setPal(null)
  }
  const paint = (color: Color) => {
    if (editor) {
      editor.chain().focus().setMark('highlight', { color, hid: newHid() }).run()
      return setPal(null)
    }
    const sel = getSelection()
    if (pal.fromMark) store.recolorHighlights(pal.hids, color)
    else if (sel?.rangeCount) {
      // a selection touching existing highlights absorbs them into one new highlight
      let { start, end } = rangeOffsets(pal.body, sel.getRangeAt(0))
      for (const hid of pal.hids) {
        const e = markExtent(pal.body, hid)
        if (e) {
          start = Math.min(start, e.start)
          end = Math.max(end, e.end)
        }
      }
      if (end > start) {
        // the visible words between the two stream offsets
        const r = document.createRange()
        r.selectNodeContents(pal.body)
        const all = r.toString()
        let i = 0
        let seen = 0
        while (i < all.length && seen < start) if (!/\s/.test(all[i++])) seen++
        while (i < all.length && /\s/.test(all[i])) i++
        const from = i
        while (i < all.length && seen < end) if (!/\s/.test(all[i++])) seen++
        const text = all.slice(from, i).replace(/\s+/g, ' ').trim()
        const before = squash(all.slice(0, from)).slice(-24)
        store.addHighlight(key, { start, end, text, before, color }, pal.hids)
      }
    }
    done()
  }
  const remove = () => {
    if (editor) {
      editor.chain().focus().unsetMark('highlight').run()
      return setPal(null)
    }
    store.removeHighlights(pal.hids)
    done()
  }
  return (
    <div className="hlpal" style={{ left: pal.x, top: pal.y }} onMouseDown={(e) => e.preventDefault()} role="toolbar" aria-label="Highlight">
      {COLORS.map((c) => <button key={c} className="sw" data-c={c} title={`Highlight ${c}`} aria-label={`Highlight ${c}`} onClick={() => paint(c)} />)}
      {pal.hids.length > 0 && <button className="x" title="Remove highlight" aria-label="Remove highlight" onClick={remove}><X /></button>}
    </div>
  )
}
