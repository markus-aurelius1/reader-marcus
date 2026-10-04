// The PYQ index, first on a small hand-made library (the rules), then on the real content
// (what the hub actually shows).
import { describe, expect, it } from 'vitest'
import type { Chapter, PyqData, Subject } from './content'
import { buildLinks, linkKey, relatedPyqs } from './links'
import { buildPyqIndex, filterPyqs, isDemandLabel, matchPyqIds, parsePyqId, type PyqMeta } from './pyq'

const subject = (key: string, chapters: Record<string, string[]>, pyq: PyqData['chapters'], pyqMeta?: PyqMeta, pyqOneLiners?: Record<string, string>): Subject => {
  const [stage, id] = key.split('/')
  const list: Chapter[] = Object.entries(chapters).map(([cid, secs]) => ({
    id: cid,
    key: `${key}/${cid}`,
    subjectKey: key,
    topicId: cid === 'budget' ? 'public-finance' : 'core',
    topicTitle: 'Topic',
    title: cid,
    taxonomy: [],
    related: [],
    sections: secs.map((sid) => ({ id: sid, key: `${key}/${cid}/${sid}`, title: sid, html: '' })),
  }))
  return { id, stage, key, title: id, topics: [], chapters: list, pyq: { chapters: pyq }, pyqMeta, pyqOneLiners }
}
const U = (y: number, q: number) => `UPSC-CSE-${y}-GS1-Q${String(q).padStart(3, '0')}`
const P = (y: number, q: number) => `UPPCS-${y}-GS1-Q${String(q).padStart(3, '0')}`

const polity = subject(
  'prelims/polity',
  { parliament: ['budget', 'committees'], bodies: ['finance-commission'] },
  {
    parliament: { upsc: [{ label: 'Budget / financial control', ids: [U(2019, 45), U(2021, 7)] }, { label: 'General', ids: [U(2015, 3)] }], uppcs: [{ label: 'Committees', ids: [P(2020, 132)] }], synthesis: '' },
    bodies: { upsc: [{ label: 'Finance Commission—mandate', ids: [U(2019, 45), U(2011, 45)] }], uppcs: [], synthesis: '' },
  },
  {
    status: { [P(2020, 132)]: { status: 'review-required', note: 'TABLE_STRUCTURE_UNCLEAR' }, [U(2011, 45)]: { dynamic: true } },
    sections: { parliament: { 'Budget / financial control': ['budget'], Committees: ['committees'] }, bodies: { 'Finance Commission—mandate': ['finance-commission'] } },
  },
)
const economy = subject(
  'prelims/economy',
  { budget: ['fiscal-federalism'] },
  { budget: { upsc: [{ label: 'General', ids: [U(2019, 45), U(2021, 7)] }], uppcs: [{ label: 'Review flag', ids: [P(2020, 132)] }], synthesis: '' } },
  { status: { [U(2021, 7)]: { status: 'demand-only', note: 'dated' }, [P(2020, 132)]: { status: 'demand-only' } } },
)
const ix = buildPyqIndex([polity, economy])

describe('PYQ index', () => {
  it('reads a canonical ID', () => {
    expect(parsePyqId(U(2019, 45))).toEqual({ exam: 'UPSC-CSE', year: 2019, paper: 'GS1', q: 45 })
    expect(parsePyqId('UPPCS-2021-GS1-Q046')).toEqual({ exam: 'UPPCS', year: 2021, paper: 'GS1', q: 46 })
    expect(parsePyqId('UPSC-CSE-2019-GS2-Q05')).toEqual({ exam: 'UPSC-CSE', year: 2019, paper: 'GS2', q: 5 }) // a Mains paper
    expect(parsePyqId('2019 Q45')).toBeNull()
  })

  it('keeps one record per canonical ID, however many chapters and subjects list it', () => {
    expect(ix.records.map((r) => r.pyqId)).toEqual([U(2021, 7), P(2020, 132), U(2019, 45), U(2015, 3), U(2011, 45)])
    expect(new Set(ix.records.map((r) => r.pyqId)).size).toBe(ix.records.length)
    const r = ix.byId.get(U(2019, 45))!
    expect(r).toMatchObject({ exam: 'UPSC-CSE', year: 2019, stage: 'prelims', subjectIds: ['polity', 'economy'], topicIds: ['core', 'public-finance'], questionAvailable: false, status: 'validated' })
    expect(r.linkedContent.map(linkKey)).toEqual(['prelims/polity/parliament/budget', 'prelims/polity/bodies/finance-commission', 'prelims/economy/budget'])
  })

  it('never invents text: no one-liner, no question, and bookkeeping labels are not demand', () => {
    expect(ix.records.every((r) => r.oneLiner === undefined && r.questionAvailable === false)).toBe(true)
    expect(ix.byId.get(U(2015, 3))!.demandTags).toBeUndefined() // listed only under "General"
    expect(ix.byId.get(U(2019, 45))!.demandTags).toEqual(['Budget / financial control', 'Finance Commission—mandate'])
    expect(['General', 'Review flags', 'Review flag', 'Cross-linked', 'Semantic exclusions → sibling/other nodes'].map(isDemandLabel)).toEqual([false, false, false, false, false])
    expect(ix.tags.map((t) => `${t.chapterId}: ${t.label} (${t.ids.length})`)).toEqual(['parliament: Budget / financial control (2)', 'parliament: Committees (1)', 'bodies: Finance Commission—mandate (2)'])
  })

  it('links to the section a demand label belongs to, otherwise to the chapter', () => {
    expect(ix.byId.get(P(2020, 132))!.linkedContent.map(linkKey)).toEqual(['prelims/polity/parliament/committees', 'prelims/economy/budget'])
    expect(ix.byId.get(U(2015, 3))!.linkedContent).toEqual([{ kind: 'chapter', stage: 'prelims', subjectId: 'polity', topicId: 'core', chapterId: 'parliament' }])
  })

  it('keeps a flagged question flagged: the strictest status any subject records wins', () => {
    expect(ix.byId.get(P(2020, 132))).toMatchObject({ status: 'review-required' })
    expect(ix.notes.get(P(2020, 132))).toBe('TABLE_STRUCTURE_UNCLEAR')
    expect(ix.byId.get(U(2021, 7))).toMatchObject({ status: 'demand-only' })
    expect(ix.byId.get(U(2011, 45))).toMatchObject({ status: 'validated', dynamic: true })
    expect(ix.byId.get(U(2019, 45))!.dynamic).toBeUndefined()
  })

  it('shows a one-liner only when a subject actually carries one', () => {
    const withLine = buildPyqIndex([{ ...polity, pyqOneLiners: { [U(2019, 45)]: ' Money Bill certification is final. ', [U(1999, 1)]: 'not in the library' } }])
    expect(withLine.byId.get(U(2019, 45))!.oneLiner).toBe('Money Bill certification is final.')
    expect(withLine.records.filter((r) => r.oneLiner)).toHaveLength(1)
    expect(filterPyqs(withLine, { q: 'certification' }).map((r) => r.pyqId)).toEqual([U(2019, 45)])
  })

  it('filters by exam, year, subject, topic, chapter, section, status and text', () => {
    const ids = (f: Parameters<typeof filterPyqs>[1], mine = {}) => filterPyqs(ix, f, mine).map((r) => r.pyqId)
    expect(ids({})).toHaveLength(5)
    expect(ids({ stage: 'mains' })).toEqual([])
    expect(ids({ exam: 'UPPCS' })).toEqual([P(2020, 132)])
    expect(ids({ year: '2019' })).toEqual([U(2019, 45)])
    expect(ids({ subject: 'economy' })).toEqual([U(2021, 7), P(2020, 132), U(2019, 45)])
    expect(ids({ subject: 'polity', chapter: 'bodies' })).toEqual([U(2019, 45), U(2011, 45)])
    expect(ids({ subject: 'polity', chapter: 'parliament', section: 'budget' })).toEqual([U(2021, 7), U(2019, 45)])
    expect(ids({ subject: 'polity', topic: 'core' })).toHaveLength(5)
    expect(ids({ subject: 'economy', topic: 'core' })).toEqual([])
    expect(ids({ status: 'review-required' })).toEqual([P(2020, 132)])
    expect(ids({ status: 'demand-only' })).toEqual([U(2021, 7)])
    expect(ids({ status: 'dynamic' })).toEqual([U(2011, 45)])
    expect(ids({ q: 'finance commission' })).toEqual([U(2019, 45), U(2011, 45)])
    expect(ids({ q: 'q045 2019' })).toEqual([U(2019, 45)])
    expect(ids({ q: 'economy budget' })).toEqual([U(2021, 7), P(2020, 132), U(2019, 45)])
    expect(ids({ id: U(2015, 3) })).toEqual([U(2015, 3)])
  })

  it('filters by the learner\'s own flags', () => {
    const mine = { [U(2019, 45)]: { seen: true, difficult: true }, [U(2021, 7)]: { seen: true, revised: true } }
    const ids = (m: string) => filterPyqs(ix, { mine: m }, mine).map((r) => r.pyqId)
    expect(ids('seen')).toEqual([U(2021, 7), U(2019, 45)])
    expect(ids('unseen')).toEqual([P(2020, 132), U(2015, 3), U(2011, 45)])
    expect(ids('revised')).toEqual([U(2021, 7)])
    expect(ids('difficult')).toEqual([U(2019, 45)])
  })

  it('finds a question by its ID, whole or in parts — and only when the query is an ID', () => {
    const ids = (q: string) => matchPyqIds(ix, q).map((r) => r.pyqId)
    expect(ids('UPSC-CSE-2019-GS1-Q045')).toEqual([U(2019, 45)])
    expect(ids('2019 q45')).toEqual([U(2019, 45)])
    expect(ids('Q045')).toEqual([U(2019, 45), U(2011, 45)])
    expect(ids('uppcs 2020 q132')).toEqual([P(2020, 132)])
    expect(ids('upsc q132')).toEqual([])
    expect(ids('article 45')).toEqual([])
    expect(ids('q45 money bill')).toEqual([])
  })

  it('gives every section and chapter its questions through the cross-link index', () => {
    const links = buildLinks([polity, economy], ix.records)
    expect(relatedPyqs(links, ['prelims/polity/parliament/budget'])).toEqual([U(2021, 7), U(2019, 45)])
    expect(relatedPyqs(links, ['prelims/polity/parliament'])).toEqual([U(2015, 3)]) // chapter-level only
    expect(relatedPyqs(links, ['prelims/polity/parliament', 'prelims/polity/parliament/budget', 'prelims/polity/parliament/committees']).sort()).toEqual([P(2020, 132), U(2015, 3), U(2019, 45), U(2021, 7)].sort())
  })
})

// ---- the library as shipped ---------------------------------------------------------------
describe('PYQ index of the real library', async () => {
  const { allSubjects, linkIndex, pyqIndex } = await import('./content')
  const real = pyqIndex()
  const subjects = allSubjects()

  it('has one record per canonical ID across all imported subjects', () => {
    const listed = new Set(subjects.flatMap((s) => Object.values(s.pyq?.chapters ?? {}).flatMap((c) => [...c.upsc, ...c.uppcs].flatMap((k) => k.ids))))
    expect(real.records.length).toBe(listed.size)
    expect(new Set(real.records.map((r) => r.pyqId)).size).toBe(real.records.length)
    expect(real.records.length).toBeGreaterThan(1000)
    expect(real.records.every((r) => parsePyqId(r.pyqId) && r.stage === 'prelims')).toBe(true)
  })

  it('carries no question text or one-liner, because the content has none', () => {
    expect(real.records.filter((r) => r.oneLiner !== undefined || r.questionAvailable)).toEqual([])
  })

  it('opens every question on notes that exist, at a section wherever the pack names one', () => {
    const places = linkIndex().places
    for (const r of real.records) {
      expect(r.linkedContent.length).toBeGreaterThan(0)
      for (const ref of r.linkedContent) expect(places.has(linkKey(ref)), `${r.pyqId} → ${linkKey(ref)}`).toBe(true)
    }
    const atSection = real.records.filter((r) => r.linkedContent.some((c) => c.sectionId)).length
    expect(atSection / real.records.length).toBeGreaterThan(0.45)
  })

  it('keeps the packs\' review flags', () => {
    expect(real.byId.get('UPSC-CSE-2024-GS1-Q066')).toMatchObject({ status: 'review-required' })
    expect(real.byId.get('UPPCS-2025-GS1-Q146')).toMatchObject({ status: 'demand-only' })
    expect(real.byId.get('UPSC-CSE-2024-GS1-Q099')).toMatchObject({ status: 'review-required' })
    expect(real.byId.get('UPPCS-2023-GS1-Q140')).toMatchObject({ status: 'demand-only', dynamic: true })
    expect(real.records.filter((r) => r.status === 'review-required').length).toBeGreaterThanOrEqual(40)
    // every flag in the curated files landed on a record
    for (const s of subjects) for (const id of Object.keys(s.pyqMeta?.status ?? {})) expect(real.byId.has(id), `${s.key}: ${id}`).toBe(true)
  })

  it('every curated section link names a real demand label and a real section', () => {
    for (const s of subjects)
      for (const [chapterId, labels] of Object.entries(s.pyqMeta?.sections ?? {})) {
        const chapter = s.chapters.find((c) => c.id === chapterId)
        const data = s.pyq?.chapters[chapterId]
        expect(chapter && data, `${s.key}/${chapterId}`).toBeTruthy()
        const known = new Set([...data!.upsc, ...data!.uppcs].map((k) => k.label))
        for (const [label, secs] of Object.entries(labels)) {
          expect(known.has(label), `${s.key}/${chapterId}: "${label}"`).toBe(true)
          for (const id of secs) expect(chapter!.sections.some((x) => x.id === id), `${s.key}/${chapterId}#${id}`).toBe(true)
        }
      }
  })

  it('reaches notes from questions and questions from notes', () => {
    const links = linkIndex()
    expect(relatedPyqs(links, ['prelims/polity/constitutional-bodies/finance-commission']).length).toBeGreaterThanOrEqual(8)
    expect(real.byId.get('UPSC-CSE-2024-GS1-Q066')!.linkedContent.map(linkKey)).toContain('prelims/polity/amendments-basic-structure/article-368-procedure')
    expect(links.links.filter((l) => l.relation === 'inter-subject').length).toBeGreaterThan(30)
  })
})
