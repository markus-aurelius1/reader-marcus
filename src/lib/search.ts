// Search across the library: subjects, chapters, sections (with the learner's own edits),
// previous-year questions by ID and by demand theme, and the places cross-linked with the
// best match — and Current Affairs: its pages, its days by date, and the learner's notes by
// title, text, tag, source and linked destination. Section and note text is extracted once per
// version and cached; the PYQ and cross-link indices are built once (lib/content.ts).
import { allLoaded, linkIndex, pyqIndex, type Chapter, type Section, type Subject } from './content'
import type { ContentRef, PyqHubRecord } from './contract'
import { STATUS_LABEL, dayFull, dayIdOf, parseDateQuery, parseDayId, type DayState, type EntryLike } from './currentAffairsModel'
import { href } from './router'
import { placeKey, related } from './links'
import { matchPyqIds, type PyqTag } from './pyq'
import { secHtml, secTitle, type Override } from './store'

export type HitKind = 'subject' | 'chapter' | 'section' | 'text' | 'related' | 'pyq' | 'tag' | 'ca' | 'ca-day' | 'ca-note'
export const HIT_LABEL: Record<HitKind, string> = { subject: 'Subject', chapter: 'Chapter', section: 'Section', text: 'In text', related: 'Related', pyq: 'PYQ', tag: 'PYQ theme', ca: 'Current Affairs', 'ca-day': 'CA date', 'ca-note': 'CA note' }

export interface Hit {
  kind: HitKind
  title: string
  score: number
  /** every kind except a PYQ that spans subjects */
  subject?: Subject
  /** chapter, section, text, related, tag */
  chapter?: Chapter
  section?: Section
  snippet?: string
  via?: string // related: the hit it is linked with
  pyq?: PyqHubRecord
  tag?: PyqTag
  /** Current Affairs results carry their own destination and context line. */
  to?: string
  sub?: string
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

/** Chapters, sections and section text (including local edits), best first. */
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
  if (!top?.chapter) return hits
  const keys = top.section ? [top.section.key] : [top.chapter.key, ...top.chapter.sections.map((s) => s.key)]
  const shown = new Set(hits.map((h) => h.section?.key ?? h.chapter?.key))
  const extra: Hit[] = []
  for (const { place: p } of related(linkIndex(), keys)) {
    if (extra.length >= max) break
    if (shown.has(placeKey(p))) continue
    shown.add(placeKey(p))
    extra.push({ kind: 'related', subject: p.subject, chapter: p.chapter, section: p.section, title: p.section?.title ?? p.chapter.title, via: top.title, score: 0 })
  }
  return [...hits.slice(0, after), ...extra, ...hits.slice(after)]
}

/** Subjects whose title matches. */
export function searchSubjects(q: string): Hit[] {
  const words = norm(q).split(' ').filter(Boolean).map((t) => ' ' + t)
  if (!words.length) return []
  return allLoaded().filter((s) => words.every((t) => (' ' + norm(s.title)).includes(t))).map((subject) => ({ kind: 'subject', subject, title: subject.title, score: 200 }))
}

/** Questions named by ID ("2019 q45", a full canonical ID), then demand themes whose label matches. */
export function searchPyqs(q: string, maxIds = 6, maxTags = 4): Hit[] {
  const ix = pyqIndex()
  const ids = matchPyqIds(ix, q, maxIds).map((pyq): Hit => ({ kind: 'pyq', pyq, title: pyq.pyqId, score: 150 }))
  const words = norm(q).split(' ').filter(Boolean).map((t) => ' ' + t)
  if (ids.length || !words.length) return ids
  const subjects = new Map(allLoaded().map((s) => [s.key, s]))
  const tags: Hit[] = []
  for (const tag of ix.tags) {
    const label = ' ' + norm(tag.label)
    if (!words.every((t) => label.includes(t))) continue
    const subject = subjects.get(tag.subjectKey)
    const chapter = subject?.chapters.find((c) => c.id === tag.chapterId)
    if (!subject || !chapter) continue
    tags.push({ kind: 'tag', subject, chapter, tag, title: tag.label, score: 40 + Math.min(20, tag.ids.length) })
  }
  return [...ids, ...tags.sort((a, b) => b.score - a.score).slice(0, maxTags)]
}

// ---- Current Affairs ---------------------------------------------------------------------------
/** What the palette knows of Current Affairs: personal state, handed in so that this file stays pure. */
export interface CaSearch {
  /** Live notes. */
  entries: EntryLike[]
  /** A note's text (HTML). */
  body: (entryId: string) => string
  /** Today's day number in the study timezone. */
  today: number
  /** The state of a day, for the line under a date result. */
  state: (dn: number) => DayState
  /** The current title of a linked place; undefined when it is no longer in the library. */
  linkTitle: (r: ContentRef) => string | undefined
}

const CA_PAGES: { title: string; words: string; to: () => string }[] = [
  { title: 'Current Affairs — Today', words: 'current affairs today news daily', to: () => href.currentAffairs() },
  { title: 'Current Affairs — Calendar', words: 'current affairs calendar news', to: () => href.currentAffairs('calendar') },
  { title: 'Current Affairs — Notes', words: 'current affairs notes news', to: () => href.currentAffairs('notes') },
  { title: 'Current Affairs — Archive', words: 'current affairs archive news', to: () => href.currentAffairs('archive') },
]

/** Current Affairs destinations and dates named by the query. */
export function searchCaPlaces(q: string, ca: CaSearch): Hit[] {
  const words = norm(q).split(' ').filter(Boolean).map((t) => ' ' + t)
  if (!words.length) return []
  const pages: Hit[] = CA_PAGES.filter((p) => words.every((t) => (' ' + p.words).includes(t))).map((p, i) => ({ kind: 'ca', title: p.title, sub: 'Daily news study', to: p.to(), score: 190 - i }))
  const dn = parseDateQuery(q, ca.today)
  if (dn === null || dn > ca.today) return pages
  const n = ca.entries.filter((e) => e.dayId === dayIdOf(dn)).length
  return [{ kind: 'ca-day', title: dayFull(dn), sub: `Current Affairs · ${STATUS_LABEL[ca.state(dn)]}${n ? ` · ${n} note${n === 1 ? '' : 's'}` : ''}`, to: href.caDay(dayIdOf(dn)), score: 195 }, ...pages]
}

/** The learner's Current Affairs notes: title, tags, source and linked destinations first, then their text. */
export function searchCaNotes(q: string, ca: CaSearch, limit = 12): Hit[] {
  const nq = norm(q)
  if (!nq) return []
  const tokens = nq.split(' ')
  const words = tokens.map((t) => ' ' + t)
  const hits: Hit[] = []
  for (const e of ca.entries) {
    const links = (e.linkedContentRefs ?? []).map(ca.linkTitle).filter(Boolean) as string[]
    const head = ' ' + norm([e.title, ...(e.tags ?? []), e.sourceName ?? '', ...links].join(' '))
    const body = sectionText(e.noteDocumentId, ca.body(e.id))
    const hay = head + ' ' + body.norm
    if (!words.every((t) => hay.includes(t))) continue
    const inHead = words.every((t) => head.includes(t))
    let score = inHead ? 60 : 0
    if (hay.includes(' ' + nq)) score += 25
    for (const t of words) score += Math.min(8, (' ' + body.norm).split(t).length - 1)
    const where = [dayFull(parseDayId(e.dayId)), e.sourceName, ...(e.tags ?? []).slice(0, 3).map((t) => '#' + t)].filter(Boolean).join(' · ')
    hits.push({ kind: 'ca-note', title: e.title || 'Untitled note', sub: where, to: href.caNote(e.id), snippet: inHead ? undefined : snippet(body.text, tokens), score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Everything the palette shows for a query, in display order: questions named by ID first
 * (an ID query means nothing else), then Current Affairs destinations and dates, subjects, the
 * learner's notes that match in their title, the study notes with their cross-linked
 * destinations, notes that match only in their text, and PYQ demand themes last.
 */
export function searchAll(q: string, overrides: Record<string, Override>, ca?: CaSearch): Hit[] {
  const pyqs = searchPyqs(q)
  const ids = pyqs.filter((h) => h.kind === 'pyq')
  const notes = ca ? searchCaNotes(q, ca) : []
  return [
    ...ids,
    ...(ca ? searchCaPlaces(q, ca) : []),
    ...searchSubjects(q),
    ...notes.filter((h) => h.score >= 60),
    ...withRelated(search(q, overrides)),
    ...notes.filter((h) => h.score < 60),
    ...pyqs.filter((h) => h.kind === 'tag'),
  ]
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
