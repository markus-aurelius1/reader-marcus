// Cross-links between any two places in the library. A link names its destination by stable
// content id — never by title or URL — so it survives edits, re-ordering and new subjects:
//
//   @chapter#section                  same subject
//   @stage/subject/chapter#section    any subject (Prelims ↔ Mains, optional papers, …)
//   @stage/subject                    a subject's overview
//
// `#section` is optional. A link into a subject that is not in the library yet stays in the
// text as plain words and switches on by itself once that subject is added.
import type { Chapter, Section, Subject } from './content'
import type { ContentRef, CrossLink, CrossLinkRelation, ExamStage, PyqHubRecord } from './contract'
import { href } from './router'

export interface Ref {
  subjectKey: string
  chapterId?: string
  sectionId?: string
}

export function parseRef(ref: string, from: string): Ref {
  const [path, sectionId] = ref.trim().replace(/^@/, '').split('#')
  const seg = path.split('/').filter(Boolean)
  if (seg.length >= 2) return { subjectKey: `${seg[0]}/${seg[1]}`, chapterId: seg[2], sectionId: sectionId || undefined }
  return { subjectKey: from, chapterId: seg[0], sectionId: sectionId || undefined }
}

export const refHref = (r: Ref) => (r.chapterId ? href.reader(`${r.subjectKey}/${r.chapterId}`, r.sectionId) : href.subject(r.subjectKey))

let installed: (subjectKey: string) => boolean = () => true
/** Tells the linker which subjects exist; set once by the content registry. */
export const setInstalled = (fn: (subjectKey: string) => boolean) => {
  installed = fn
}

const XREF_TAG = /<a\b[^>]*\bdata-xref="([^"]+)"[^>]*>/g

/** Every cross-link target written in a piece of section HTML. */
export const refsIn = (html: string) => [...html.matchAll(XREF_TAG)].map((m) => m[1])

/**
 * (Re)derive the route of every cross-link from its `data-xref` id. Applied to the bundled
 * notes and to locally edited sections alike, so a link saved in an old edit still follows
 * the current library.
 */
export function relink(html: string, subjectKey: string, hrefOf: (r: Ref) => string | null = (r) => (installed(r.subjectKey) ? refHref(r) : null)): string {
  if (!html.includes('data-xref')) return html
  return html.replace(XREF_TAG, (_m, ref: string) => {
    const to = hrefOf(parseRef(ref, subjectKey))
    return to ? `<a class="xref" data-xref="${ref}" href="${to}">` : `<a class="xref pending" data-xref="${ref}">`
  })
}

// ---- link index -------------------------------------------------------------
// One index for every relationship the reader knows: note ↔ note inside a chapter, a subject,
// across subjects and across stages, and note ↔ PYQ. Each relationship is written once, where
// it starts (a link in the notes, a chapter's `related:` line, a question's linked content);
// the reverse direction is looked up in `in`, never stored a second time.
export interface Place {
  subject: Subject
  chapter: Chapter
  section?: Section
}
export interface LinkIndex {
  /** Every link, once, in the direction it was written. */
  links: CrossLink[]
  /** key of the place a link starts from → its links */
  out: Map<string, CrossLink[]>
  /** key of the place a link points to → the links that reach it (backlinks) */
  in: Map<string, CrossLink[]>
  /** every chapter and section, by key */
  places: Map<string, Place>
}

export const placeKey = (p: Place) => p.section?.key ?? p.chapter.key
/** Stable identity of a link endpoint (the contract's ContentRef key). */
export const linkKey = (r: ContentRef) => (r.kind === 'pyq' ? `pyq:${r.pyqId}` : [r.stage, r.subjectId, r.chapterId, r.sectionId].filter(Boolean).join('/'))
export const placeRef = (p: Place): ContentRef => ({
  kind: p.section ? 'section' : 'chapter',
  stage: p.subject.stage as ExamStage,
  subjectId: p.subject.id,
  topicId: p.chapter.topicId,
  chapterId: p.chapter.id,
  ...(p.section ? { sectionId: p.section.id } : {}),
})

export function resolve(subjects: Subject[], r: Ref): Place | null {
  const subject = subjects.find((s) => s.key === r.subjectKey)
  const chapter = subject?.chapters.find((c) => c.id === r.chapterId)
  if (!subject || !chapter) return null
  if (!r.sectionId) return { subject, chapter }
  const section = chapter.sections.find((s) => s.id === r.sectionId)
  return section ? { subject, chapter, section } : null
}

const XREF = /<a\b[^>]*\bdata-xref="([^"]+)"[^>]*>(.*?)<\/a>/g
const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()
const titleOf = (p: Place) => p.section?.title ?? p.chapter.title

/** The kind of relationship follows from where the two ends live; it is never typed by hand. */
const relationOf = (a: Place, b: Place, chapterLevel: boolean): CrossLinkRelation =>
  a.subject.stage !== b.subject.stage ? 'prelims-mains' : a.subject.key !== b.subject.key ? 'inter-subject' : chapterLevel ? 'see-also' : 'related'

/**
 * Build the index. Inline links run section → target; a chapter's `related:` frontmatter runs
 * chapter → target; a question runs PYQ → the sections (or chapter) it is recorded against.
 */
export function buildLinks(subjects: Subject[], pyqs: PyqHubRecord[] = []): LinkIndex {
  const ix: LinkIndex = { links: [], out: new Map(), in: new Map(), places: new Map() }
  for (const subject of subjects)
    for (const chapter of subject.chapters) {
      ix.places.set(chapter.key, { subject, chapter })
      for (const section of chapter.sections) ix.places.set(section.key, { subject, chapter, section })
    }
  const seen = new Set<string>()
  const add = (l: CrossLink) => {
    if (seen.has(l.id)) return
    seen.add(l.id)
    ix.links.push(l)
    const push = (m: Map<string, CrossLink[]>, k: string) => (m.get(k) ?? m.set(k, []).get(k)!).push(l)
    push(ix.out, linkKey(l.from))
    push(ix.in, linkKey(l.to))
  }
  const link = (src: Place, ref: string, label?: string) => {
    const dst = resolve(subjects, parseRef(ref, src.subject.key))
    if (!dst || placeKey(dst) === placeKey(src)) return
    add({
      id: `${placeKey(src)}>${placeKey(dst)}`,
      from: placeRef(src),
      to: placeRef(dst),
      relation: relationOf(src, dst, !src.section),
      label: label || undefined,
      reason: `${titleOf(src)} → ${titleOf(dst)}`,
      source: 'content',
    })
  }
  for (const subject of subjects)
    for (const chapter of subject.chapters) {
      for (const ref of chapter.related) link({ subject, chapter }, ref)
      for (const section of chapter.sections) for (const m of section.html.matchAll(XREF)) link({ subject, chapter, section }, m[1], plain(m[2]))
    }
  for (const q of pyqs) {
    const from: ContentRef = { kind: 'pyq', stage: q.stage, pyqId: q.pyqId }
    for (const to of q.linkedContent) if (ix.places.has(linkKey(to))) add({ id: `pyq:${q.pyqId}>${linkKey(to)}`, from, to, relation: 'pyq-note', source: 'content' })
  }
  return ix
}

export interface RelatedItem {
  place: Place
  relation: CrossLinkRelation
  /** true when the other place links here (a backlink) */
  back: boolean
}

/**
 * Notes connected with any of `keys`, in either direction — destinations first, each place once.
 * Links that stay inside one chapter are left out: the destination is already on the page.
 */
export function related(ix: LinkIndex, keys: string[], dir: 'both' | 'in' | 'out' = 'both'): RelatedItem[] {
  const out: RelatedItem[] = []
  const have = new Set<string>()
  const take = (here: string, other: ContentRef, l: CrossLink, back: boolean) => {
    if (l.relation === 'pyq-note') return
    const place = ix.places.get(linkKey(other))
    if (!place || place.chapter.key === ix.places.get(here)?.chapter.key || have.has(placeKey(place))) return
    have.add(placeKey(place))
    out.push({ place, relation: l.relation, back })
  }
  if (dir !== 'in') for (const k of keys) for (const l of ix.out.get(k) ?? []) take(k, l.to, l, false)
  if (dir !== 'out') for (const k of keys) for (const l of ix.in.get(k) ?? []) take(k, l.from, l, true)
  return out
}

/** IDs of the questions recorded against any of `keys` (each once, in index order). */
export function relatedPyqs(ix: LinkIndex, keys: string[]): string[] {
  const ids = new Set<string>()
  for (const k of keys) for (const l of ix.in.get(k) ?? []) if (l.relation === 'pyq-note') ids.add(l.from.pyqId!)
  return [...ids]
}
