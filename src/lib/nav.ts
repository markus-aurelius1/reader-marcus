// Navigation model. The tree is generated from content metadata (library.json + each subject's
// subject.json and chapter files) — it is never stored or synced, and no route is spelled here.
import { allSubjects, stages, type Chapter, type Subject } from './content'
import type { ContentRef, ExamStage, NavigationNode, RecentDestination, StudyContext } from './contract'
import { href } from './router'
import { useStore } from './store'

/** Stable identity of a reference (see the contract): the keys the reader has always used. */
export function refKey(r: ContentRef): string {
  switch (r.kind) {
    case 'stage': return r.stage
    case 'paper': return `${r.stage}~${r.paperId}`
    case 'topic': return `${r.stage}/${r.subjectId}~${r.topicId}`
    case 'pyq': return `pyq:${r.pyqId}`
    default: return [r.stage, r.subjectId, r.chapterId, r.sectionId].filter(Boolean).join('/')
  }
}

export function refHref(r: ContentRef): string {
  const subject = `${r.stage}/${r.subjectId}`
  switch (r.kind) {
    case 'stage':
    case 'paper': return href.study(r.stage)
    case 'subject':
    case 'topic': return href.subject(subject)
    case 'chapter': return href.reader(`${subject}/${r.chapterId}`)
    case 'section': return href.reader(`${subject}/${r.chapterId}`, r.sectionId)
    case 'pyq': return href.pyqs()
  }
}

export const subjectRef = (s: Subject, paperId?: string): ContentRef => ({ kind: 'subject', stage: s.stage as ExamStage, subjectId: s.id, paperId })
export const chapterRef = (c: Chapter): ContentRef => {
  const [stage, subjectId] = c.key.split('/')
  return { kind: 'chapter', stage: stage as ExamStage, subjectId, topicId: c.topicId, chapterId: c.id }
}

/** What a study timer tracks: a chapter, or one section of it, with its place in the hierarchy. */
export function studyContext(subject: Subject, chapter: Chapter, section?: { id: string; title: string }): StudyContext {
  const at = navNode(chapter.key)?.target ?? chapterRef(chapter) // carries the paper and topic
  const ref: ContentRef = { ...at, taxonomyId: chapter.taxonomy[0], ...(section ? { kind: 'section' as const, sectionId: section.id } : {}) }
  // no undefined fields: the context is stored and synced as plain data
  return JSON.parse(JSON.stringify({ ref, subjectTitle: subject.title, topicTitle: chapter.topicTitle, chapterTitle: chapter.title, sectionTitle: section?.title }))
}

export interface NavTree {
  nodes: Map<string, NavigationNode>
  roots: string[]
}

let tree: NavTree | null = null

/** Stage → paper (where a stage has more than one) → subject → topic → chapter → section. */
export function navTree(): NavTree {
  if (tree) return tree
  const nodes = new Map<string, NavigationNode>()
  const add = (kind: NavigationNode['kind'], title: string, target: ContentRef, parent?: NavigationNode) => {
    const node: NavigationNode = { id: refKey(target), kind, title, parentId: parent?.id, childrenIds: [], target, order: parent ? parent.childrenIds.length : nodes.size }
    nodes.set(node.id, node)
    parent?.childrenIds.push(node.id)
    return node
  }
  const loaded = new Map(allSubjects().map((s) => [s.key, s]))
  const roots: string[] = []
  for (const st of stages) {
    const stage = st.id as ExamStage
    const sn = add('stage', st.title, { kind: 'stage', stage })
    roots.push(sn.id)
    const papers = st.groups.filter((g) => g.subjects.length)
    for (const g of papers) {
      // a stage with a single group (Prelims GS) has no paper level
      const paperId = st.groups.length > 1 ? g.id : undefined
      const parent = paperId ? add('paper', g.title, { kind: 'paper', stage, paperId }, sn) : sn
      for (const slot of g.subjects) {
        const sub = add('subject', slot.title, { kind: 'subject', stage, paperId, subjectId: slot.id }, parent)
        const s = loaded.get(slot.key)
        if (!s) continue // slot in library.json with no content yet: a leaf
        for (const t of s.topics) {
          const tn = add('topic', t.title, { kind: 'topic', stage, paperId, subjectId: s.id, topicId: t.id }, sub)
          for (const c of s.chapters.filter((c) => c.topicId === t.id)) {
            const ref: ContentRef = { kind: 'chapter', stage, paperId, subjectId: s.id, topicId: t.id, chapterId: c.id }
            const cn = add('chapter', c.title, ref, tn)
            for (const x of c.sections) add('section', x.title, { ...ref, kind: 'section', sectionId: x.id }, cn)
          }
        }
      }
    }
  }
  return (tree = { nodes, roots })
}

export const navNode = (id: string) => navTree().nodes.get(id)

/** A node and its ancestors, outermost first. */
export function navPath(id: string): NavigationNode[] {
  const out: NavigationNode[] = []
  for (let n = navNode(id); n; n = n.parentId ? navNode(n.parentId) : undefined) out.unshift(n)
  return out
}

/** "Prelims · Polity" style context for a destination, from its ancestors. */
export const navContext = (id: string) =>
  navPath(id).slice(0, -1).filter((n) => n.kind !== 'topic').map((n) => n.title).join(' · ')

// ---- favourites and recent destinations (NavigationPreferences) -------------------------
const MAX_RECENT = 8

export const isFavourite = (list: ContentRef[], ref: ContentRef) => list.some((r) => refKey(r) === refKey(ref))

export function toggleFavourite(ref: ContentRef) {
  const { prefs, setPref } = useStore.getState()
  const id = refKey(ref)
  setPref({ favourites: isFavourite(prefs.favourites, ref) ? prefs.favourites.filter((r) => refKey(r) !== id) : [...prefs.favourites, ref] })
}

export function recordVisit(target: ContentRef, title: string) {
  const { prefs, setPref } = useStore.getState()
  const id = refKey(target)
  if (prefs.recents[0] && refKey(prefs.recents[0].target) === id) return
  const next: RecentDestination = { target, title, visitedAt: new Date().toISOString() }
  setPref({ recents: [next, ...prefs.recents.filter((r) => refKey(r.target) !== id)].slice(0, MAX_RECENT) })
}

export interface Destination {
  id: string
  title: string
  context: string
  to: string
  ref: ContentRef
}

/** Saved references resolved against the current library; anything no longer present is dropped. */
export function destinations(refs: ContentRef[]): Destination[] {
  const out: Destination[] = []
  for (const ref of refs) {
    const node = navNode(refKey(ref))
    if (node) out.push({ id: node.id, title: node.title, context: navContext(node.id), to: refHref(node.target), ref: node.target })
  }
  return out
}
