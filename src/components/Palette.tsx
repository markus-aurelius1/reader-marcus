import { useEffect, useMemo, useRef, useState } from 'react'
import { allLoaded, stageTitle } from '../lib/content'
import { search, withRelated, type Hit } from '../lib/search'
import { go, href } from '../lib/router'
import { useStore } from '../lib/store'

/** Ctrl/Cmd+K: quick-jump to any chapter/section and full-text search across all subjects. */
export function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const list = useRef<HTMLUListElement>(null)
  const overrides = useStore((s) => s.overrides)

  const hits: Hit[] = useMemo(() => {
    if (q.trim()) return withRelated(search(q, overrides))
    // Empty query: jump list of every chapter.
    return allLoaded().flatMap((subject) =>
      subject.chapters.map((chapter) => ({ kind: 'chapter' as const, subject, chapter, title: chapter.title, score: 0 })),
    )
  }, [q, overrides])

  useEffect(() => setSel(0), [q])
  useEffect(() => {
    list.current?.children[sel]?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  const open = (h: Hit) => {
    onClose()
    go(href.reader(h.chapter.key, h.section?.id, h.kind === 'text' ? { q } : undefined))
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (e.key === 'Enter' && hits[sel]) open(hits[sel])
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
          placeholder="Jump to a chapter, or search — Article 368, money bill, PAC…"
          aria-label="Search"
        />
        {hits.length ? (
          <ul ref={list}>
            {hits.map((h, i) => (
              <li key={i} className={i === sel ? 'on' : ''} onMouseMove={() => setSel(i)} onClick={() => open(h)}>
                <b>{h.title}</b>
                <small>
                  {stageTitle(h.subject.stage)} › {h.subject.title}
                  {h.kind !== 'chapter' && h.section ? ` › ${h.chapter.title}` : ` · ${h.chapter.topicTitle}`}
                  {h.kind === 'related' && <em> · related to {h.via}</em>}
                </small>
                {h.snippet && <p>{h.snippet}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">No matches for “{q}”.</div>
        )}
        <div className="hint"><span>↑↓ move</span><span>↵ open</span><span>esc close</span></div>
      </div>
    </div>
  )
}
