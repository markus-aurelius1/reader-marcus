import { useSyncExternalStore } from 'react'

// The one place routes are defined (docs/READER_V2_CONTRACT.md → Routes). Every segment is a
// stable content id; `href` builds links, `parse` reads them, nothing else spells a path.
export type SubjectTab = 'overview' | 'pyq' | 'insights'
export const INSIGHTS_TABS = ['overview', 'time', 'subjects', 'progress', 'revision'] as const
export type InsightsTab = (typeof INSIGHTS_TABS)[number]
export type Route =
  | { name: 'home' }
  | { name: 'study'; stage?: string }
  | { name: 'subject'; subjectKey: string; tab: SubjectTab }
  | { name: 'reader'; subjectKey: string; chapterId: string; sectionId?: string; hid?: string; q?: string; resume?: boolean }
  | { name: 'pyqs' }
  | { name: 'insights'; tab: InsightsTab }
  | { name: 'highlights' }

const tabOf = (v?: string | null): SubjectTab => (v === 'pyq' || v === 'insights' ? v : 'overview')
const insightsTab = (v?: string): InsightsTab => INSIGHTS_TABS.find((t) => t === v) ?? 'overview'

export function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent)
  const params = new URLSearchParams(query)
  const reader = (s: string[]): Route => ({
    name: 'reader',
    subjectKey: `${s[0]}/${s[1]}`,
    chapterId: s[2],
    sectionId: s[3],
    hid: params.get('h') ?? undefined,
    q: params.get('q') ?? undefined,
    resume: params.has('resume') || undefined,
  })
  if (seg[0] === 'study') {
    if (seg.length <= 2) return { name: 'study', stage: seg[1] }
    if (seg.length === 3) return { name: 'subject', subjectKey: `${seg[1]}/${seg[2]}`, tab: tabOf(params.get('tab')) }
    return reader(seg.slice(1))
  }
  if (seg[0] === 'insights') return { name: 'insights', tab: insightsTab(seg[1]) }
  // earlier links: #/s/<subject>[/tab], #/r/<chapter>[/section], #/progress, #/revision
  if (seg[0] === 's' && seg[2]) return { name: 'subject', subjectKey: `${seg[1]}/${seg[2]}`, tab: tabOf(seg[3]) }
  if (seg[0] === 'r' && seg[3]) return reader(seg.slice(1))
  if (seg[0] === 'progress' || seg[0] === 'revision') return { name: 'insights', tab: seg[0] }
  if (seg[0] === 'pyqs' || seg[0] === 'highlights') return { name: seg[0] }
  return { name: 'home' }
}

export const href = {
  home: () => '#/',
  study: (stage?: string) => `#/study${stage ? '/' + stage : ''}`,
  subject: (key: string, tab?: string) => `#/study/${key}${tab && tab !== 'overview' ? '?tab=' + tab : ''}`,
  reader: (chapterKey: string, sectionId?: string, extra?: { h?: string; q?: string; resume?: boolean }) => {
    let h = `#/study/${chapterKey}${sectionId ? '/' + sectionId : ''}`
    if (extra?.h) h += `?h=${encodeURIComponent(extra.h)}`
    else if (extra?.q) h += `?q=${encodeURIComponent(extra.q)}`
    else if (extra?.resume) h += '?resume'
    return h
  },
  pyqs: () => '#/pyqs',
  insights: (tab?: InsightsTab) => `#/insights${tab && tab !== 'overview' ? '/' + tab : ''}`,
  highlights: () => '#/highlights',
  revision: () => '#/insights/revision',
}

/** The canonical link for a route. */
export function hrefOf(r: Route): string {
  switch (r.name) {
    case 'study': return href.study(r.stage)
    case 'subject': return href.subject(r.subjectKey, r.tab)
    case 'reader': return href.reader(`${r.subjectKey}/${r.chapterId}`, r.sectionId, { h: r.hid, q: r.q, resume: r.resume })
    case 'insights': return href.insights(r.tab)
    case 'home': return href.home()
    default: return href[r.name]()
  }
}

export const go = (h: string) => {
  if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else location.hash = h
}

/** An earlier deep link is rewritten in place, so bookmarks keep working and Back is unaffected. */
function canonicalise() {
  if (/^#\/(s|r|progress|revision)(\/|\?|$)/.test(location.hash)) history.replaceState(history.state, '', hrefOf(parse(location.hash)))
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
let cached: { hash: string; route: Route; n: number } = { hash: '\0', route: { name: 'home' }, n: 0 }
let nav = 0
if (typeof window !== 'undefined') {
  canonicalise()
  window.addEventListener('hashchange', () => {
    canonicalise()
    nav++
  })
}

/** Current route; `n` increments on every navigation, including re-navigation to the same hash. */
export function useRoute(): { route: Route; n: number } {
  return useSyncExternalStore(subscribe, () => {
    if (cached.hash !== location.hash || cached.n !== nav) cached = { hash: location.hash, route: parse(location.hash), n: nav }
    return cached
  })
}
