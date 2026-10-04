import { useState } from 'react'
import { stageTitle } from '../lib/content'
import type { RelatedItem } from '../lib/links'
import type { PyqFilter } from '../lib/pyq'
import { href } from '../lib/router'
import { secTitle, useStore } from '../lib/store'

const GROUPS = [
  { id: 'subject', title: 'This subject' },
  { id: 'other', title: 'Other subjects' },
  { id: 'stage', title: 'Prelims ↔ Mains' },
] as const

/**
 * Compact cross-link surface for a section or chapter: the notes connected with it (in this
 * subject, in other subjects, in the other stage) and the previous-year questions recorded
 * against it. Shows `max` note links; "View all" opens the rest in place.
 */
export function Related({ items, from, pyqs = 0, pyqFilter, label = 'Related', max = 6, grouped = false }: {
  items: RelatedItem[]
  /** key of the subject being read: links inside it are shown without the subject name */
  from: string
  /** number of questions recorded against this place, and the hub filter that lists them */
  pyqs?: number
  pyqFilter?: PyqFilter
  label?: string
  max?: number
  /** list under group headings (the header panel) rather than as one row */
  grouped?: boolean
}) {
  const overrides = useStore((s) => s.overrides)
  const [all, setAll] = useState(false)
  if (!items.length && !pyqs) return null
  const shown = all ? items : items.slice(0, max)
  const link = ({ place: p }: RelatedItem) => (
    <a key={p.section?.key ?? p.chapter.key} href={href.reader(p.chapter.key, p.section?.id)}>
      {p.subject.key !== from && <small>{stageTitle(p.subject.stage)} · {p.subject.title} › </small>}
      {p.chapter.title}
      {p.section ? ` › ${secTitle(overrides, p.section)}` : ''}
    </a>
  )
  const groupOf = (i: RelatedItem) => (i.relation === 'prelims-mains' ? 'stage' : i.relation === 'inter-subject' ? 'other' : 'subject')
  return (
    <nav className={'related no-print' + (grouped ? ' grouped' : '')} aria-label={label}>
      {!grouped && <b>{label}</b>}
      {grouped
        ? GROUPS.map((g) => {
            const list = shown.filter((i) => groupOf(i) === g.id)
            return list.length ? [<b key={g.id}>{g.title}</b>, ...list.map(link)] : null
          })
        : shown.map(link)}
      {items.length > max && (
        <button className="more" onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Show fewer' : `View all ${items.length}`}</button>
      )}
      {pyqs > 0 && grouped && <b>PYQs</b>}
      {pyqs > 0 && (
        <a className="pq" href={href.pyqs(pyqFilter)}>{pyqs} PYQ{pyqs === 1 ? '' : 's'}</a>
      )}
    </nav>
  )
}
