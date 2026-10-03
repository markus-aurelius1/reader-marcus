import { allLoaded, linkGraph, type Chapter, type Section, type Subject } from './content'
import { neighbours, placeKey } from './links'
import { secHtml, secTitle, type Override } from './store'

export interface Hit {
  kind: 'chapter' | 'section' | 'text' | 'related'
  subject: Subject
  chapter: Chapter
  section?: Section
  title: string
  snippet?: string
  via?: string // related: the hit it is linked with
  score: number
}

const textCache = new Map<string, { html: string; text: string; norm: string }>()

export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|li|tr|h\d|div|td|th)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

// "Article 368", "Art. 368", "Arts 368" all normalise to "art 368".
export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\barticles?\b|\barts?\b\.?/g, 'art')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function sectionText(key: string, html: string) {
  let c = textCache.get(key)
  if (!c || c.html !== html) {
    const text = htmlToText(html)
    c = { html, text, norm: norm(text) }
    textCache.set(key, c)
  }
  return c
}

function snippet(text: string, tokens: string[]): string {
  let at = -1
  for (const t of tokens) {
    const re = new RegExp(t === 'art' ? 'art(icle)?s?\\.?' : t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const m = re.exec(text)
    if (m && (at < 0 || m.index < at)) at = m.index
  }
  if (at < 0) at = 0
  const start = Math.max(0, at - 50)
  return (start > 0 ? '…' : '') + text.slice(start, at + 130).trim() + (at + 130 < text.length ? '…' : '')
}

export function search(q: string, overrides: Record<string, Override>, limit = 40): Hit[] {
  const nq = norm(q)
  if (!nq) return []
  const tokens = nq.split(' ')
  // tokens match at the start of a word ("pac" finds PAC, not "capacity")
  const words = tokens.map((t) => ' ' + t)
  const hits: Hit[] = []
  for (const subject of allLoaded()) {
    for (const chapter of subject.chapters) {
      const ct = ' ' + norm(chapter.title)
      if (words.every((t) => ct.includes(t))) {
        hits.push({ kind: 'chapter', subject, chapter, title: chapter.title, score: 100 + (ct.startsWith(' ' + nq) ? 20 : 0) })
      }
      for (const section of chapter.sections) {
        const title = secTitle(overrides, section)
        const st = ' ' + norm(title)
        const body = sectionText(section.key, secHtml(overrides, section))
        const hay = st + ' ' + body.norm
        if (!words.every((t) => hay.includes(t))) continue
        let score = 0
        const inTitle = words.every((t) => st.includes(t))
        if (inTitle) score += 60
        if (hay.includes(' ' + nq)) score += 25
        // occurrences, capped so long sections do not dominate
        for (const t of words) score += Math.min(8, (' ' + body.norm).split(t).length - 1)
        hits.push({
          kind: inTitle ? 'section' : 'text',
          subject,
          chapter,
          section,
          title,
          snippet: inTitle ? undefined : snippet(body.text, tokens),
          score,
        })
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Destinations cross-linked with the best hit, placed right after the leading results. */
export function withRelated(hits: Hit[], max = 3, after = 3): Hit[] {
  const top = hits[0]
  if (!top) return hits
  const g = linkGraph()
  const keys = top.section ? [top.section.key] : [top.chapter.key, ...top.chapter.sections.map((s) => s.key)]
  const shown = new Set(hits.map((h) => h.section?.key ?? h.chapter.key))
  const extra: Hit[] = []
  for (const p of keys.flatMap((k) => neighbours(g, k))) {
    if (extra.length >= max) break
    if (shown.has(placeKey(p))) continue
    shown.add(placeKey(p))
    extra.push({ kind: 'related', subject: p.subject, chapter: p.chapter, section: p.section, title: p.section?.title ?? p.chapter.title, via: top.title, score: 0 })
  }
  return [...hits.slice(0, after), ...extra, ...hits.slice(after)]
}

/** Briefly mark the first occurrence of `q` inside `root` and scroll to it. */
export function flashText(root: Element, q: string) {
  const tokens = norm(q).split(' ').filter(Boolean)
  if (!tokens.length) return false
  const first = tokens.find((t) => t !== 'art') ?? tokens[0]
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (w.nextNode()) {
    const n = w.currentNode as Text
    const i = n.data.toLowerCase().indexOf(first)
    if (i < 0) continue
    const range = document.createRange()
    range.setStart(n, i)
    range.setEnd(n, i + first.length)
    n.parentElement?.scrollIntoView({ block: 'center' })
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights
    const H = (window as unknown as { Highlight?: new (r: Range) => unknown }).Highlight
    if (reg && H) {
      reg.set('search-hit', new H(range))
      setTimeout(() => reg.delete('search-hit'), 3500)
    }
    return true
  }
  return false
}
