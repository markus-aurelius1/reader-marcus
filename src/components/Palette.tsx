import { useEffect, useMemo, useRef, useState } from 'react'
import { allLoaded, stageTitle } from '../lib/content'
import { destinations, navContext } from '../lib/nav'
import { norm, search, withRelated } from '../lib/search'
import { go, href } from '../lib/router'
import { useStore } from '../lib/store'

interface Item {
  group?: string // heading shown above the first item of a group (empty query only)
  title: string
  sub: string
  via?: string
  snippet?: string
  to: string
}

/** Ctrl/Cmd+K: jump to any subject, chapter or section, and full-text search across all subjects. */
export function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const list = useRef<HTMLUListElement>(null)
  const overrides = useStore((s) => s.overrides)
  const prefs = useStore((s) => s.prefs)

  const items: Item[] = useMemo(() => {
    const subjects = allLoaded()
    const subjectItem = (s: (typeof subjects)[number], group?: string): Item => ({ group, title: s.title, sub: `${navContext(s.key)} · ${s.chapters.length} chapters`, to: href.subject(s.key) })
    if (!q.trim()) {
      // Empty query: where you were, what you starred, then every subject.
      const dest = (group: string, refs: Parameters<typeof destinations>[0]) => destinations(refs).map((d) => ({ group, title: d.title, sub: d.context, to: d.to }))
      return [...dest('Recent', prefs.recents.slice(0, 5).map((r) => r.target)), ...dest('Favourites', prefs.favourites), ...subjects.map((s) => subjectItem(s, 'Subjects'))]
    }
    const words = norm(q).split(' ').map((t) => ' ' + t)
    const hits = withRelated(search(q, overrides)).map((h): Item => ({
      title: h.title,
      sub: `${stageTitle(h.subject.stage)} › ${h.subject.title}` + (h.kind !== 'chapter' && h.section ? ` › ${h.chapter.title}` : ` · ${h.chapter.topicTitle}`),
      via: h.kind === 'related' ? h.via : undefined,
      snippet: h.snippet,
      to: href.reader(h.chapter.key, h.section?.id, h.kind === 'text' ? { q } : undefined),
    }))
    return [...subjects.filter((s) => words.every((t) => (' ' + norm(s.title)).includes(t))).map((s) => subjectItem(s)), ...hits]
  }, [q, overrides, prefs.recents, prefs.favourites])

  useEffect(() => setSel(0), [q])
  useEffect(() => {
    list.current?.querySelector('li.on')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  const open = (it: Item) => {
    onClose()
    go(it.to)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (e.key === 'Enter' && items[sel]) open(items[sel])
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-label="Search and jump">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Jump to a subject or chapter, or search — Article 368, money bill, PAC…"
          aria-label="Search"
        />
        {items.length ? (
          <ul ref={list}>
            {items.flatMap((it, i) => [
              it.group && it.group !== items[i - 1]?.group ? <li key={'g' + i} className="grp" aria-hidden="true">{it.group}</li> : null,
              <li key={i} className={i === sel ? 'on' : ''} onMouseMove={() => setSel(i)} onClick={() => open(it)}>
                <b>{it.title}</b>
                <small>
                  {it.sub}
                  {it.via && <em> · related to {it.via}</em>}
                </small>
                {it.snippet && <p>{it.snippet}</p>}
              </li>,
            ])}
          </ul>
        ) : (
          <div className="empty">No matches for “{q}”.</div>
        )}
        <div className="hint"><span>↑↓ move</span><span>↵ open</span><span>esc close</span></div>
      </div>
    </div>
  )
}
