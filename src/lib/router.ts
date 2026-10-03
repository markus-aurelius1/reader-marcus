import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'subject'; subjectKey: string; tab: 'overview' | 'pyq' | 'insights' }
  | { name: 'reader'; subjectKey: string; chapterId: string; sectionId?: string; hid?: string; q?: string; resume?: boolean }
  | { name: 'highlights' }
  | { name: 'revision' }
  | { name: 'progress' }

export function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent)
  const params = new URLSearchParams(query)
  if (seg[0] === 's' && seg[2]) {
    const tab = seg[3] === 'pyq' || seg[3] === 'insights' ? seg[3] : 'overview'
    return { name: 'subject', subjectKey: `${seg[1]}/${seg[2]}`, tab }
  }
  if (seg[0] === 'r' && seg[3]) {
    return {
      name: 'reader',
      subjectKey: `${seg[1]}/${seg[2]}`,
      chapterId: seg[3],
      sectionId: seg[4],
      hid: params.get('h') ?? undefined,
      q: params.get('q') ?? undefined,
      resume: params.has('resume') || undefined,
    }
  }
  if (seg[0] === 'highlights' || seg[0] === 'revision' || seg[0] === 'progress') return { name: seg[0] }
  return { name: 'home' }
}

export const href = {
  home: () => '#/',
  subject: (key: string, tab?: string) => `#/s/${key}${tab && tab !== 'overview' ? '/' + tab : ''}`,
  reader: (chapterKey: string, sectionId?: string, extra?: { h?: string; q?: string; resume?: boolean }) => {
    let h = `#/r/${chapterKey}${sectionId ? '/' + sectionId : ''}`
    if (extra?.h) h += `?h=${encodeURIComponent(extra.h)}`
    else if (extra?.q) h += `?q=${encodeURIComponent(extra.q)}`
    else if (extra?.resume) h += '?resume'
    return h
  },
}

export const go = (h: string) => {
  if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else location.hash = h
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
let cached: { hash: string; route: Route; n: number } = { hash: '\0', route: { name: 'home' }, n: 0 }
let nav = 0
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => nav++)

/** Current route; `n` increments on every navigation, including re-navigation to the same hash. */
export function useRoute(): { route: Route; n: number } {
  return useSyncExternalStore(subscribe, () => {
    if (cached.hash !== location.hash || cached.n !== nav) cached = { hash: location.hash, route: parse(location.hash), n: nav }
    return cached
  })
}
