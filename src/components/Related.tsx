import { stageTitle } from '../lib/content'
import type { Place } from '../lib/links'
import { href } from '../lib/router'
import { secTitle, useStore } from '../lib/store'

/** Compact row of cross-links to the places connected with a section or chapter. */
export function Related({ places, from, label = 'Related', max = 6 }: { places: Place[]; from: string; label?: string; max?: number }) {
  const overrides = useStore((s) => s.overrides)
  if (!places.length) return null
  return (
    <nav className="related no-print" aria-label={label}>
      <b>{label}</b>
      {places.slice(0, max).map((p) => (
        <a key={p.section?.key ?? p.chapter.key} href={href.reader(p.chapter.key, p.section?.id)}>
          {p.subject.key !== from && <small>{stageTitle(p.subject.stage)} · {p.subject.title} › </small>}
          {p.chapter.title}
          {p.section ? ` › ${secTitle(overrides, p.section)}` : ''}
        </a>
      ))}
      {places.length > max && <span>+{places.length - max} more</span>}
    </nav>
  )
}
