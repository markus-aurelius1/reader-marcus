// Content registry. Subjects are discovered from /content/<stage>/<subject>/ — the reader
// never imports a subject by name, so adding a subject needs no application code.
import library from '../../content/library.json'
import { parseChapter } from './md'

export interface Section {
  id: string
  key: string // stage/subject/chapter/section
  title: string
  html: string
}
export interface Chapter {
  id: string
  key: string // stage/subject/chapter
  subjectKey: string
  topicId: string
  topicTitle: string
  title: string
  taxonomy: string[]
  sections: Section[]
}
export interface SubjectMeta {
  id: string
  stage: string
  title: string
  topics: { id: string; title: string; chapters: string[] }[]
  taxonomy?: string[]
}
export interface Subject extends SubjectMeta {
  key: string // stage/subject
  chapters: Chapter[] // reading order
  pyq: PyqData | null
}
export interface PyqCluster {
  label: string
  ids: string[]
}
export interface PyqChapter {
  upsc: PyqCluster[]
  uppcs: PyqCluster[]
  synthesis: string // markdown
}
export interface PyqData {
  chapters: Record<string, PyqChapter>
}
export interface LibSlot {
  id: string
  title: string
  key: string
  available: boolean
}
export interface LibGroup {
  id: string
  title: string
  subjects: LibSlot[]
}
export interface LibStage {
  id: string
  title: string
  groups: LibGroup[]
}

// Everything under /content is bundled eagerly: notes are plain text, so the whole library
// stays small, works offline from the first load and needs no loading states.
const metaFiles = import.meta.glob<SubjectMeta>('/content/*/*/subject.json', { eager: true, import: 'default' })
const chapterFiles = import.meta.glob<string>('/content/*/*/chapters/*.md', { query: '?raw', import: 'default', eager: true })
const pyqFiles = import.meta.glob<PyqData>('/content/*/*/pyq.json', { eager: true, import: 'default' })

const metas = new Map<string, SubjectMeta>()
for (const [path, meta] of Object.entries(metaFiles)) {
  const [, , stage, id] = path.split('/')
  metas.set(`${stage}/${id}`, { ...meta, stage, id })
}

export const stages: LibStage[] = library.stages.map((st) => {
  const groups: LibGroup[] = st.groups.map((g) => ({
    id: g.id,
    title: g.title,
    subjects: g.subjects.map((s) => {
      const key = `${st.id}/${s.id}`
      return { id: s.id, title: s.title, key, available: metas.has(key) }
    }),
  }))
  // Subjects present on disk but not slotted in library.json (e.g. optionals) still appear.
  const listed = new Set(groups.flatMap((g) => g.subjects.map((s) => s.key)))
  const extra = [...metas.entries()].filter(([k, m]) => m.stage === st.id && !listed.has(k))
  if (extra.length) {
    const other = groups.find((g) => g.id === 'optional') ?? groups[groups.length - 1]
    for (const [key, m] of extra) other.subjects.push({ id: m.id, title: m.title, key, available: true })
  }
  return { id: st.id, title: st.title, groups }
})

export const stageTitle = (id: string) => stages.find((s) => s.id === id)?.title ?? id
export const availableKeys = () => [...metas.keys()]
export const subjectTitle = (key: string) => metas.get(key)?.title ?? key

const loaded = new Map<string, Subject>()

/** Parsed subject (cached). Markdown is parsed on first access. */
export function getSubject(key: string): Subject | null {
  if (!metas.has(key)) return null
  let s = loaded.get(key)
  if (!s) {
    s = build(key)
    loaded.set(key, s)
  }
  return s
}
export const getLoaded = getSubject
export const allSubjects = () => availableKeys().map((k) => getSubject(k)!)
export const allLoaded = allSubjects

function build(key: string): Subject {
  const meta = metas.get(key)!
  const prefix = `/content/${key}/chapters/`
  const chapters: Chapter[] = []
  for (const t of meta.topics) {
    for (const id of t.chapters) {
      const src = chapterFiles[`${prefix}${id}.md`]
      if (src === undefined) {
        console.warn(`[content] missing chapter file ${prefix}${id}.md`)
        continue
      }
      const raw = parseChapter(src, key)
      const ck = `${key}/${id}`
      chapters.push({
        id,
        key: ck,
        subjectKey: key,
        topicId: t.id,
        topicTitle: t.title,
        title: raw.meta.title || id,
        taxonomy: (raw.meta.taxonomy || '').split(',').map((s) => s.trim()).filter(Boolean),
        sections: raw.sections.map((s) => ({ ...s, key: `${ck}/${s.id}` })),
      })
    }
  }
  return { ...meta, key, chapters, pyq: pyqFiles[`/content/${key}/pyq.json`] ?? null }
}

/** Canonical (unedited) section for a stage/subject/chapter/section key. */
export function sectionByKey(key: string): Section | undefined {
  const [stage, subject, chapter] = key.split('/')
  return getSubject(`${stage}/${subject}`)
    ?.chapters.find((c) => c.id === chapter)
    ?.sections.find((s) => s.key === key)
}
