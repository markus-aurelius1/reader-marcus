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

// ---- link graph -------------------------------------------------------------
export interface Place {
  subject: Subject
  chapter: Chapter
  section?: Section
}
export interface LinkGraph {
  /** section / chapter key → places it points to (other chapters only) */
  to: Map<string, Place[]>
  /** section / chapter key → places that point to it (other chapters only) */
  from: Map<string, Place[]>
}

export const placeKey = (p: Place) => p.section?.key ?? p.chapter.key

export function resolve(subjects: Subject[], r: Ref): Place | null {
  const subject = subjects.find((s) => s.key === r.subjectKey)
  const chapter = subject?.chapters.find((c) => c.id === r.chapterId)
  if (!subject || !chapter) return null
  if (!r.sectionId) return { subject, chapter }
  const section = chapter.sections.find((s) => s.id === r.sectionId)
  return section ? { subject, chapter, section } : null
}

/**
 * Who links to whom, across every subject. Inline links run section → target; a chapter's
 * `related:` frontmatter runs chapter → target. Links inside one chapter are left out:
 * the destination is already on the page.
 */
export function buildGraph(subjects: Subject[]): LinkGraph {
  const g: LinkGraph = { to: new Map(), from: new Map() }
  const add = (m: Map<string, Place[]>, key: string, p: Place) => {
    const list = m.get(key) ?? []
    if (!list.some((x) => placeKey(x) === placeKey(p))) m.set(key, [...list, p])
  }
  const link = (src: Place, ref: string) => {
    const dst = resolve(subjects, parseRef(ref, src.subject.key))
    if (!dst || dst.chapter === src.chapter) return
    add(g.to, placeKey(src), dst)
    add(g.from, placeKey(dst), src)
  }
  for (const subject of subjects)
    for (const chapter of subject.chapters) {
      for (const ref of chapter.related) link({ subject, chapter }, ref)
      for (const section of chapter.sections) for (const ref of refsIn(section.html)) link({ subject, chapter, section }, ref)
    }
  return g
}

/** Places connected to a section or chapter in either direction, destinations first. */
export function neighbours(g: LinkGraph, key: string): Place[] {
  const out: Place[] = []
  for (const p of [...(g.to.get(key) ?? []), ...(g.from.get(key) ?? [])]) if (!out.some((x) => placeKey(x) === placeKey(p))) out.push(p)
  return out
}
