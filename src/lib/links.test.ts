import { afterEach, describe, expect, it } from 'vitest'
import type { Chapter, Subject } from './content'
import type { PyqHubRecord } from './contract'
import { buildLinks, linkKey, parseRef, refHref, refsIn, related, relatedPyqs, relink, setInstalled, type RelatedItem } from './links'
import { renderBody } from './md'

const subject = (key: string, chapters: Record<string, { related?: string[]; sections: Record<string, string> }>): Subject => {
  const [stage, id] = key.split('/')
  const list: Chapter[] = Object.entries(chapters).map(([cid, c]) => ({
    id: cid,
    key: `${key}/${cid}`,
    subjectKey: key,
    topicId: 't',
    topicTitle: 'T',
    title: cid,
    taxonomy: [],
    related: c.related ?? [],
    sections: Object.entries(c.sections).map(([sid, md]) => ({ id: sid, key: `${key}/${cid}/${sid}`, title: sid, html: renderBody(md, key) })),
  }))
  return { id, stage, key, title: id, topics: [{ id: 't', title: 'T', chapters: Object.keys(chapters) }], chapters: list, pyq: null }
}
const names = (items: RelatedItem[]) => items.map(({ place: p }) => `${p.chapter.key}${p.section ? '#' + p.section.id : ''}`)

afterEach(() => setInstalled(() => true))

describe('cross-link ids', () => {
  it('reads the three forms', () => {
    expect(parseRef('inflation#causes', 'prelims/economy')).toEqual({ subjectKey: 'prelims/economy', chapterId: 'inflation', sectionId: 'causes' })
    expect(parseRef('budget', 'prelims/economy')).toEqual({ subjectKey: 'prelims/economy', chapterId: 'budget', sectionId: undefined })
    expect(parseRef('mains/gs2-polity/federalism#finance-commission', 'prelims/economy')).toEqual({ subjectKey: 'mains/gs2-polity', chapterId: 'federalism', sectionId: 'finance-commission' })
    expect(parseRef('mains/gs3-economy', 'prelims/economy')).toEqual({ subjectKey: 'mains/gs3-economy', chapterId: undefined, sectionId: undefined })
  })

  it('routes to the exact chapter / section, or the subject overview', () => {
    expect(refHref(parseRef('prelims/polity/parliament#budget', 'prelims/economy'))).toBe('#/study/prelims/polity/parliament/budget')
    expect(refHref(parseRef('inflation', 'prelims/economy'))).toBe('#/study/prelims/economy/inflation')
    expect(refHref(parseRef('mains/gs3-economy', 'prelims/economy'))).toBe('#/study/mains/gs3-economy')
  })

  it('renders same-subject and cross-subject links from markdown', () => {
    const html = renderBody('[a](@inflation#causes) and [b](@mains/gs3-economy/growth#inclusive)', 'prelims/economy')
    expect(html).toContain('<a class="xref" data-xref="inflation#causes" href="#/study/prelims/economy/inflation/causes">a</a>')
    expect(html).toContain('<a class="xref" data-xref="mains/gs3-economy/growth#inclusive" href="#/study/mains/gs3-economy/growth/inclusive">b</a>')
    expect(refsIn(html)).toEqual(['inflation#causes', 'mains/gs3-economy/growth#inclusive'])
  })

  it('keeps a link to a subject that is not in the library as plain text, and switches it on later', () => {
    setInstalled((k) => k === 'prelims/economy')
    const pending = renderBody('[GS2](@mains/gs2-polity/federalism)', 'prelims/economy')
    expect(pending).toContain('<a class="xref pending" data-xref="mains/gs2-polity/federalism">GS2</a>')
    setInstalled(() => true)
    expect(relink(pending, 'prelims/economy')).toContain('href="#/study/mains/gs2-polity/federalism"')
  })

  it('re-routes links inside edited HTML, whatever attribute order the editor wrote', () => {
    const edited = '<p>x <a href="#/stale" data-xref="parliament#budget" class="xref">Budget</a> <mark data-hid="h1" data-color="yellow">kept</mark></p>'
    const out = relink(edited, 'prelims/polity')
    expect(out).toBe('<p>x <a class="xref" data-xref="parliament#budget" href="#/study/prelims/polity/parliament/budget">Budget</a> <mark data-hid="h1" data-color="yellow">kept</mark></p>')
    expect(relink(out, 'prelims/polity')).toBe(out)
  })

  it('leaves ordinary links and link-free HTML alone', () => {
    const plain = '<p>no links</p><a href="https://example.org" target="_blank" rel="noopener">site</a>'
    expect(relink(plain, 'prelims/polity')).toBe(plain)
  })
})

describe('cross-link index', () => {
  const economy = subject('prelims/economy', {
    budget: { sections: { fc: 'See [FC](@prelims/polity/bodies#finance-commission) and [GS2](@mains/gs2-polity/federalism#fiscal).', deficits: '[inflation](@inflation#causes) [here](@budget#fc)' } },
    inflation: { related: ['mains/gs3-economy/growth'], sections: { causes: 'text', broken: '[x](@nowhere#none) [y](@optional/sociology/intro)' } },
  })
  const polity = subject('prelims/polity', { bodies: { sections: { 'finance-commission': 'Art. 280', cag: 'Art. 148' } } })
  const gs2 = subject('mains/gs2-polity', { federalism: { sections: { fiscal: '[prelims](@prelims/polity/bodies#finance-commission)' } } })
  const gs3 = subject('mains/gs3-economy', { growth: { sections: { inclusive: 'text' } } })
  const pyq = (pyqId: string, linkedContent: PyqHubRecord['linkedContent']): PyqHubRecord => ({ pyqId, exam: 'UPSC-CSE', year: 2020, stage: 'prelims', questionAvailable: false, linkedContent, subjectIds: ['polity'], topicIds: ['t'], status: 'validated' })
  const fcRef = { kind: 'section' as const, stage: 'prelims' as const, subjectId: 'polity', chapterId: 'bodies', sectionId: 'finance-commission' }
  const pyqs = [
    pyq('UPSC-CSE-2020-GS1-Q001', [fcRef]),
    pyq('UPSC-CSE-2021-GS1-Q002', [fcRef, { kind: 'chapter', stage: 'prelims', subjectId: 'economy', chapterId: 'inflation' }]),
    pyq('UPSC-CSE-2022-GS1-Q003', [{ kind: 'chapter', stage: 'prelims', subjectId: 'geography', chapterId: 'rivers' }]), // subject not in the library
  ]
  const ix = buildLinks([economy, polity, gs2, gs3], pyqs)

  it('gives the destination backlinks from other subjects and from Mains ↔ Prelims', () => {
    expect(names(related(ix, ['prelims/polity/bodies/finance-commission'], 'in'))).toEqual(['prelims/economy/budget#fc', 'mains/gs2-polity/federalism#fiscal'])
    expect(names(related(ix, ['mains/gs2-polity/federalism/fiscal'], 'in'))).toEqual(['prelims/economy/budget#fc'])
    expect(related(ix, ['prelims/polity/bodies/cag'])).toEqual([])
  })

  it('stores each link once; the reverse direction is derived', () => {
    const fc = ix.links.filter((l) => linkKey(l.to) === 'prelims/polity/bodies/finance-commission' && l.relation !== 'pyq-note')
    expect(fc.map((l) => linkKey(l.from))).toEqual(['prelims/economy/budget/fc', 'mains/gs2-polity/federalism/fiscal'])
    expect(ix.links.some((l) => linkKey(l.from) === 'prelims/polity/bodies/finance-commission')).toBe(false) // no stored backlink
    expect(new Set(ix.links.map((l) => l.id)).size).toBe(ix.links.length)
    expect(ix.links.every((l) => l.source === 'content')).toBe(true)
  })

  it('classifies a link by where its ends live', () => {
    const rel = (from: string, to: string) => ix.links.find((l) => linkKey(l.from) === from && linkKey(l.to) === to)?.relation
    expect(rel('prelims/economy/budget/fc', 'prelims/polity/bodies/finance-commission')).toBe('inter-subject')
    expect(rel('prelims/economy/budget/fc', 'mains/gs2-polity/federalism/fiscal')).toBe('prelims-mains')
    expect(rel('mains/gs2-polity/federalism/fiscal', 'prelims/polity/bodies/finance-commission')).toBe('prelims-mains')
    expect(rel('prelims/economy/budget/deficits', 'prelims/economy/inflation/causes')).toBe('related')
    expect(rel('prelims/economy/inflation', 'mains/gs3-economy/growth')).toBe('prelims-mains')
    expect(ix.links.find((l) => linkKey(l.from) === 'prelims/economy/budget/fc')).toMatchObject({ label: 'FC', reason: 'fc → finance-commission' })
  })

  it('links chapters within a subject; a link inside one chapter is indexed but not listed as related', () => {
    expect(names(related(ix, ['prelims/economy/budget/deficits'], 'out'))).toEqual(['prelims/economy/inflation#causes'])
    expect(names(related(ix, ['prelims/economy/inflation/causes'], 'in'))).toEqual(['prelims/economy/budget#deficits'])
    expect(ix.links.some((l) => l.id === 'prelims/economy/budget/deficits>prelims/economy/budget/fc')).toBe(true)
    expect(related(ix, ['prelims/economy/budget/fc'], 'in')).toEqual([])
  })

  it('makes chapter-level `related:` visible from both ends', () => {
    expect(related(ix, ['prelims/economy/inflation'])).toMatchObject([{ relation: 'prelims-mains', back: false }])
    expect(names(related(ix, ['prelims/economy/inflation']))).toEqual(['mains/gs3-economy/growth'])
    expect(names(related(ix, ['mains/gs3-economy/growth']))).toEqual(['prelims/economy/inflation'])
    expect(related(ix, ['mains/gs3-economy/growth'])[0].back).toBe(true)
  })

  it('ignores targets that do not exist', () => {
    expect(ix.out.get('prelims/economy/inflation/broken')).toBeUndefined()
  })

  it('lists each related place once across several keys, destinations first', () => {
    const all = related(ix, ['prelims/economy/budget/fc', 'prelims/economy/budget/deficits', 'prelims/economy/budget'])
    expect(names(all)).toEqual(['prelims/polity/bodies#finance-commission', 'mains/gs2-polity/federalism#fiscal', 'prelims/economy/inflation#causes'])
  })

  it('links notes and PYQs in both directions through the same index', () => {
    expect(relatedPyqs(ix, ['prelims/polity/bodies/finance-commission'])).toEqual(['UPSC-CSE-2020-GS1-Q001', 'UPSC-CSE-2021-GS1-Q002'])
    expect(relatedPyqs(ix, ['prelims/economy/inflation', 'prelims/polity/bodies/finance-commission'])).toEqual(['UPSC-CSE-2021-GS1-Q002', 'UPSC-CSE-2020-GS1-Q001'])
    expect(ix.out.get('pyq:UPSC-CSE-2021-GS1-Q002')!.map((l) => [l.relation, linkKey(l.to)])).toEqual([['pyq-note', 'prelims/polity/bodies/finance-commission'], ['pyq-note', 'prelims/economy/inflation']])
    expect(ix.out.get('pyq:UPSC-CSE-2022-GS1-Q003')).toBeUndefined() // nothing to open yet
    // a question is never listed as a related note
    expect(names(related(ix, ['prelims/polity/bodies/finance-commission']))).toEqual(['prelims/economy/budget#fc', 'mains/gs2-polity/federalism#fiscal'])
  })

  it('picks up a subject added later without touching the linking chapters', () => {
    const before = buildLinks([economy, polity])
    expect(related(before, ['mains/gs2-polity/federalism/fiscal'])).toEqual([])
    expect(names(related(before, ['prelims/economy/budget/fc'], 'out'))).toEqual(['prelims/polity/bodies#finance-commission'])
    expect(names(related(ix, ['prelims/economy/budget/fc'], 'out')).sort()).toEqual(['mains/gs2-polity/federalism#fiscal', 'prelims/polity/bodies#finance-commission'])
  })
})
