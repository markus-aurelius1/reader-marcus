// PYQ Hub index. One PyqHubRecord per canonical question ID, built once from what each subject
// already carries — nothing is invented and nothing here is stored or synced:
//
//   pyq.json            IDs grouped under the Source Pack's own demand labels, per chapter (generated)
//   pyq-meta.json       review / demand-only / dynamic flags the pack records for an ID, and the
//                       sections a demand label belongs to (curated; checked by `npm run check`)
//   pyq-oneliners.json  optional { "<pyqId>": "one line" } — picked up by the hub and search as
//                       soon as a subject has it; none exists yet
//
// A question listed by several chapters or subjects is still one record, linked to all of them.
import type { Subject } from './content'
import type { ContentRef, ExamStage, PyqExam, PyqHubRecord, PyqStatus } from './contract'

export interface PyqFlag {
  status?: Exclude<PyqStatus, 'validated'>
  dynamic?: boolean
  /** The pack's own wording for the flag. */
  note?: string
}
export interface PyqMeta {
  status?: Record<string, PyqFlag>
  /** chapter id → demand label → section ids in that chapter */
  sections?: Record<string, Record<string, string[]>>
}

export interface PyqIndex {
  /** Newest first; UPSC CSE before UPPCS within a year; then question number. */
  records: PyqHubRecord[]
  byId: Map<string, PyqHubRecord>
  /** pyqId → the pack's wording for its flag */
  notes: Map<string, string>
  /** pyqId → normalised text the hub searches (ID, subject, topic, chapter, section, demand, one-liner) */
  text: Map<string, string>
  tags: PyqTag[]
}
/** A demand label of one chapter, with the questions under it. */
export interface PyqTag {
  label: string
  subjectKey: string
  chapterId: string
  ids: string[]
}

const ID = /^(UPSC-CSE|UPPCS)-(\d{4})-([A-Z]+\d*)-Q(\d+)$/
export function parsePyqId(id: string): { exam: PyqExam; year: number; paper: string; q: number } | null {
  const m = ID.exec(id)
  return m ? { exam: m[1] as PyqExam, year: +m[2], paper: m[3], q: +m[4] } : null
}
export const EXAM_LABEL: Record<PyqExam, string> = { 'UPSC-CSE': 'UPSC CSE', UPPCS: 'UPPCS' }
export const STATUS_TEXT: Record<PyqStatus, string> = { validated: 'Validated', 'review-required': 'Review required', 'demand-only': 'Demand only' }

/** Labels that describe the pack's bookkeeping, not what a question asks. */
const NOT_DEMAND = /^(general|review flags?|cross-linked|cross-node excluded|semantic exclusions.*|secondary\/cross-topic only|boundary →.*)$/i
export const isDemandLabel = (label: string) => !NOT_DEMAND.test(label.trim())

const RANK: Record<PyqStatus, number> = { validated: 0, 'demand-only': 1, 'review-required': 2 }
export const pyqNorm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const refKey = (r: ContentRef) => [r.stage, r.subjectId, r.chapterId, r.sectionId].filter(Boolean).join('/')

export function buildPyqIndex(subjects: Subject[]): PyqIndex {
  const byId = new Map<string, PyqHubRecord>()
  const notes = new Map<string, string>()
  const words = new Map<string, Set<string>>()
  const tags: PyqTag[] = []
  const say = (id: string, ...text: (string | undefined)[]) => {
    const set = words.get(id) ?? words.set(id, new Set()).get(id)!
    for (const t of text) if (t) set.add(t)
  }

  for (const subject of subjects) {
    if (!subject.pyq) continue
    const stage = subject.stage as ExamStage
    for (const chapter of subject.chapters) {
      const data = subject.pyq.chapters[chapter.id]
      if (!data) continue
      const chapterRef: ContentRef = { kind: 'chapter', stage, subjectId: subject.id, topicId: chapter.topicId, chapterId: chapter.id }
      const sectionsOf = subject.pyqMeta?.sections?.[chapter.id] ?? {}
      for (const cluster of [...data.upsc, ...data.uppcs]) {
        const demand = isDemandLabel(cluster.label)
        const sections = (sectionsOf[cluster.label] ?? []).map((sid) => chapter.sections.find((s) => s.id === sid)).filter((s) => !!s)
        if (demand) {
          const tag = tags.find((t) => t.subjectKey === subject.key && t.chapterId === chapter.id && t.label === cluster.label)
          if (tag) tag.ids = [...new Set([...tag.ids, ...cluster.ids])]
          else tags.push({ label: cluster.label, subjectKey: subject.key, chapterId: chapter.id, ids: [...cluster.ids] })
        }
        for (const id of cluster.ids) {
          const p = parsePyqId(id)
          if (!p) continue
          let rec = byId.get(id)
          if (!rec) {
            rec = { pyqId: id, exam: p.exam, year: p.year, stage, questionAvailable: false, linkedContent: [], subjectIds: [], topicIds: [], status: 'validated' }
            byId.set(id, rec)
          }
          if (!rec.subjectIds.includes(subject.id)) rec.subjectIds.push(subject.id)
          if (!rec.topicIds.includes(chapter.topicId)) rec.topicIds.push(chapter.topicId)
          if (demand && !rec.demandTags?.includes(cluster.label)) rec.demandTags = [...(rec.demandTags ?? []), cluster.label]
          const refs = sections.length ? sections.map((s): ContentRef => ({ ...chapterRef, kind: 'section', sectionId: s.id })) : [chapterRef]
          for (const ref of refs) if (!rec.linkedContent.some((r) => refKey(r) === refKey(ref))) rec.linkedContent.push(ref)
          say(id, subject.title, chapter.topicTitle, chapter.title, demand ? cluster.label : undefined, ...sections.map((s) => s.title))
        }
      }
    }
    for (const [id, flag] of Object.entries(subject.pyqMeta?.status ?? {})) {
      const rec = byId.get(id)
      if (!rec) continue
      if (flag.status && RANK[flag.status] > RANK[rec.status]) rec.status = flag.status
      if (flag.dynamic) rec.dynamic = true
      if (flag.note && (!notes.has(id) || flag.status === rec.status)) notes.set(id, flag.note)
    }
    for (const [id, line] of Object.entries(subject.pyqOneLiners ?? {})) {
      const rec = byId.get(id)
      if (rec && typeof line === 'string' && line.trim()) rec.oneLiner = line.trim()
    }
  }

  // a chapter-level link is dropped once the same question is linked to a section of that chapter
  for (const rec of byId.values()) {
    const withSection = new Set(rec.linkedContent.filter((r) => r.sectionId).map((r) => `${r.subjectId}/${r.chapterId}`))
    rec.linkedContent = rec.linkedContent.filter((r) => r.sectionId || !withSection.has(`${r.subjectId}/${r.chapterId}`))
  }

  const records = [...byId.values()].sort((a, b) => b.year - a.year || a.exam.localeCompare(b.exam) * -1 || parsePyqId(a.pyqId)!.q - parsePyqId(b.pyqId)!.q)
  const text = new Map<string, string>()
  for (const rec of records) {
    const p = parsePyqId(rec.pyqId)!
    text.set(rec.pyqId, ' ' + pyqNorm([rec.pyqId, `q${p.q}`, EXAM_LABEL[rec.exam], ...(words.get(rec.pyqId) ?? []), rec.oneLiner ?? ''].join(' ')))
  }
  return { records, byId, notes, text, tags }
}

// ---- hub filter -------------------------------------------------------------------------
/** What the hub is showing. Lives in the URL (lib/router.ts), so Back and shared links keep it. */
export interface PyqFilter {
  stage?: string
  exam?: string
  year?: string
  subject?: string // subject id
  topic?: string
  chapter?: string
  section?: string
  status?: string
  /** the learner's own flags: seen · unseen · revised · difficult */
  mine?: string
  q?: string
  id?: string
}
export const PYQ_FILTER_KEYS = ['stage', 'exam', 'year', 'subject', 'topic', 'chapter', 'section', 'status', 'mine', 'q', 'id'] as const

export interface PyqFlags {
  seen?: boolean
  revised?: boolean
  difficult?: boolean
}

/** The records a filter selects, in index order. `stage` defaults to Prelims. */
export function filterPyqs(ix: PyqIndex, f: PyqFilter, mine: Record<string, PyqFlags> = {}): PyqHubRecord[] {
  const stage = f.stage || 'prelims'
  const tokens = f.q ? pyqNorm(f.q).split(' ').filter(Boolean).map((t) => ' ' + t) : []
  return ix.records.filter((r) => {
    if (r.stage !== stage) return false
    if (f.id && r.pyqId !== f.id) return false
    if (f.exam && r.exam !== f.exam) return false
    if (f.year && String(r.year) !== f.year) return false
    if (f.status && (f.status === 'dynamic' ? !r.dynamic : r.status !== f.status)) return false
    if (f.subject && !r.subjectIds.includes(f.subject)) return false
    if (f.topic || f.chapter || f.section) {
      const hit = r.linkedContent.some((c) => (!f.subject || c.subjectId === f.subject) && (!f.topic || c.topicId === f.topic) && (!f.chapter || c.chapterId === f.chapter) && (!f.section || c.sectionId === f.section))
      if (!hit) return false
    }
    if (f.mine) {
      const m = mine[r.pyqId]
      if (f.mine === 'unseen' ? m?.seen : !m?.[f.mine as keyof PyqFlags]) return false
    }
    if (tokens.length) {
      const hay = ix.text.get(r.pyqId)!
      if (!tokens.every((t) => hay.includes(t))) return false
    }
    return true
  })
}

/**
 * Questions a search query names by ID: a full ID, or its parts in any order —
 * "UPSC-CSE-2019-GS1-Q045", "2019 q45", "uppcs 2021 q46", "q045".
 */
export function matchPyqIds(ix: PyqIndex, query: string, limit = 8): PyqHubRecord[] {
  const s = query.toLowerCase()
  const q = /\bq\s*0*(\d{1,3})\b/.exec(s)
  if (!q) return []
  const year = /\b(19|20)\d{2}\b/.exec(s)?.[0]
  const exam: PyqExam | undefined = /uppcs|uppsc/.test(s) ? 'UPPCS' : /upsc|cse/.test(s) ? 'UPSC-CSE' : undefined
  // anything else in the query means it is not an ID lookup
  if (s.replace(/\bq\s*0*\d{1,3}\b|\b(19|20)\d{2}\b|uppcs|uppsc|upsc|cse|gs\s*\d|prelims|[^a-z0-9]+/g, '').length) return []
  const out: PyqHubRecord[] = []
  for (const r of ix.records) {
    if (parsePyqId(r.pyqId)!.q !== +q[1] || (year && String(r.year) !== year) || (exam && r.exam !== exam)) continue
    out.push(r)
    if (out.length >= limit) break
  }
  return out
}
