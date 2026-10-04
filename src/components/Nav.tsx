import { BookOpen, CalendarClock, ChartNoAxesColumn, Ellipsis, Highlighter, Home as HomeIcon, ListChecks, Search } from 'lucide-react'
import { href, type Route } from '../lib/router'

export type Area = 'home' | 'study' | 'pyqs' | 'insights' | 'revision' | 'highlights' | 'settings' | 'more'

/** The primary destination a route belongs to. */
export const areaOf = (r: Route): Area =>
  r.name === 'subject' || r.name === 'reader' || r.name === 'study' ? 'study' : r.name === 'revise' ? 'revision' : r.name

const DEST = [
  { id: 'home', label: 'Home', short: 'Home', to: href.home(), Icon: HomeIcon },
  { id: 'study', label: 'Study', short: 'Study', to: href.study(), Icon: BookOpen },
  { id: 'pyqs', label: 'PYQ Hub', short: 'PYQs', to: href.pyqs(), Icon: ListChecks },
  { id: 'insights', label: 'Insights', short: 'Insights', to: href.insights(), Icon: ChartNoAxesColumn },
  { id: 'revision', label: 'Revision', short: 'Revision', to: href.revision(), Icon: CalendarClock },
  { id: 'highlights', label: 'Highlights', short: 'Highlights', to: href.highlights(), Icon: Highlighter },
] as const

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Desktop / tablet primary rail. */
export function Rail({ area, onSearch }: { area: Area; onSearch: () => void }) {
  return (
    <nav className="rail" aria-label="Primary">
      {DEST.map(({ id, label, to, Icon }) => (
        <a key={id} href={to} className={area === id ? 'on' : ''} aria-current={area === id ? 'page' : undefined}>
          <Icon />
          <span>{label}</span>
        </a>
      ))}
      <hr />
      <button onClick={onSearch} aria-label="Search (Ctrl+K)" title="Search and jump">
        <Search />
        <span>Search</span>
        <kbd>{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
    </nav>
  )
}

/** Phone primary navigation: its own bottom bar, not the rail squeezed. */
export function TabBar({ area, more, onMore }: { area: Area; more: boolean; onMore: () => void }) {
  const here = more ? 'more' : area === 'highlights' || area === 'revision' || area === 'settings' ? 'more' : area
  return (
    <nav className="tabbar" aria-label="Primary">
      {DEST.slice(0, 4).map(({ id, short, to, Icon }) => (
        <a key={id} href={to} className={here === id ? 'on' : ''} aria-current={here === id ? 'page' : undefined}>
          <Icon />
          <span>{short}</span>
        </a>
      ))}
      <button className={here === 'more' ? 'on' : ''} onClick={onMore} aria-expanded={more}>
        <Ellipsis />
        <span>More</span>
      </button>
    </nav>
  )
}
