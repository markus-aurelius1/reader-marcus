import { afterEach, describe, expect, it } from 'vitest'
import type { Chapter, Subject } from './content'
import { buildGraph, neighbours, parseRef, placeKey, refHref, refsIn, relink, setInstalled } from './links'
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
const names = (ps: { chapter: Chapter; section?: { id: string } }[]) => ps.map((p) => `${p.chapter.key}${p.section ? '#' + p.section.id : ''}`)

afterEach(() => setInstalled(() => true))

describe('cross-link ids', () => {
  it('reads the three forms', () => {
    expect(parseRef('inflation#causes', 'prelims/economy')).toEqual({ subjectKey: 'prelims/economy', chapterId: 'inflation', sectionId: 'causes' })
    expect(parseRef('budget', 'prelims/economy')).toEqual({ subjectKey: 'prelims/economy', chapterId: 'budget', sectionId: undefined })
    expect(parseRef('mains/gs2-polity/federalism#finance-commission', 'prelims/economy')).toEqual({ subjectKey: 'mains/gs2-polity', chapterId: 'federalism', sectionId: 'finance-commission' })
    expect(parseRef('mains/gs3-economy', 'prelims/economy')).toEqual({ subjectKey: 'mains/gs3-economy', chapterId: undefined, sectionId: undefined })
  })

  it('routes to the exact chapter / section, or the subject overview', () => {
    expect(refHref(parseRef('prelims/polity/parliament#budget', 'prelims/economy'))).toBe('#/r/prelims/polity/parliament/budget')
    expect(refHref(parseRef('inflation', 'prelims/economy'))).toBe('#/r/prelims/economy/inflation')
    expect(refHref(parseRef('mains/gs3-economy', 'prelims/economy'))).toBe('#/s/mains/gs3-economy')
  })

  it('renders same-subject and cross-subject links from markdown', () => {
    const html = renderBody('[a](@inflation#causes) and [b](@mains/gs3-economy/growth#inclusive)', 'prelims/economy')
    expect(html).toContain('<a class="xref" data-xref="inflation#causes" href="#/r/prelims/economy/inflation/causes">a</a>')
    expect(html).toContain('<a class="xref" data-xref="mains/gs3-economy/growth#inclusive" href="#/r/mains/gs3-economy/growth/inclusive">b</a>')
    expect(refsIn(html)).toEqual(['inflation#causes', 'mains/gs3-economy/growth#inclusive'])
  })

  it('keeps a link to a subject that is not in the library as plain text, and switches it on later', () => {
    setInstalled((k) => k === 'prelims/economy')
    const pending = renderBody('[GS2](@mains/gs2-polity/federalism)', 'prelims/economy')
    expect(pending).toContain('<a class="xref pending" data-xref="mains/gs2-polity/federalism">GS2</a>')
    setInstalled(() => true)
    expect(relink(pending, 'prelims/economy')).toContain('href="#/r/mains/gs2-polity/federalism"')
  })

  it('re-routes links inside edited HTML, whatever attribute order the editor wrote', () => {
    const edited = '<p>x <a href="#/stale" data-xref="parliament#budget" class="xref">Budget</a> <mark data-hid="h1" data-color="yellow">kept</mark></p>'
    const out = relink(edited, 'prelims/polity')
    expect(out).toBe('<p>x <a class="xref" data-xref="parliament#budget" href="#/r/prelims/polity/parliament/budget">Budget</a> <mark data-hid="h1" data-color="yellow">kept</mark></p>')
    expect(relink(out, 'prelims/polity')).toBe(out)
  })

  it('leaves ordinary links and link-free HTML alone', () => {
    const plain = '<p>no links</p><a href="https://example.org" target="_blank" rel="noopener">site</a>'
    expect(relink(plain, 'prelims/polity')).toBe(plain)
  })
})

describe('link graph', () => {
  const economy = subject('prelims/economy', {
    budget: { sections: { fc: 'See [FC](@prelims/polity/bodies#finance-commission) and [GS2](@mains/gs2-polity/federalism#fiscal).', deficits: '[inflation](@inflation#causes) [here](@budget#fc)' } },
    inflation: { related: ['mains/gs3-economy/growth'], sections: { causes: 'text', broken: '[x](@nowhere#none) [y](@optional/sociology/intro)' } },
  })
  const polity = subject('prelims/polity', { bodies: { sections: { 'finance-commission': 'Art. 280', cag: 'Art. 148' } } })
  const gs2 = subject('mains/gs2-polity', { federalism: { sections: { fiscal: '[prelims](@prelims/polity/bodies#finance-commission)' } } })
  const gs3 = subject('mains/gs3-economy', { growth: { sections: { inclusive: 'text' } } })
  const g = buildGraph([economy, polity, gs2, gs3])

  it('gives the destination backlinks from other subjects and from Mains ↔ Prelims', () => {
    expect(names(g.from.get('prelims/polity/bodies/finance-commission')!)).toEqual(['prelims/economy/budget#fc', 'mains/gs2-polity/federalism#fiscal'])
    expect(names(g.from.get('mains/gs2-polity/federalism/fiscal')!)).toEqual(['prelims/economy/budget#fc'])
    expect(g.from.get('prelims/polity/bodies/cag')).toBeUndefined()
  })

  it('links chapters within a subject and skips links inside one chapter', () => {
    expect(names(g.to.get('prelims/economy/budget/deficits')!)).toEqual(['prelims/economy/inflation#causes'])
    expect(names(g.from.get('prelims/economy/inflation/causes')!)).toEqual(['prelims/economy/budget#deficits'])
    expect(g.from.get('prelims/economy/budget/fc')).toBeUndefined()
  })

  it('makes chapter-level `related:` visible from both ends', () => {
    expect(names(neighbours(g, 'prelims/economy/inflation'))).toEqual(['mains/gs3-economy/growth'])
    expect(names(neighbours(g, 'mains/gs3-economy/growth'))).toEqual(['prelims/economy/inflation'])
  })

  it('ignores targets that do not exist', () => {
    expect(g.to.get('prelims/economy/inflation/broken')).toBeUndefined()
  })

  it('picks up a subject added later without touching the linking chapters', () => {
    const before = buildGraph([economy, polity])
    expect(before.from.get('mains/gs2-polity/federalism/fiscal')).toBeUndefined()
    expect(names(before.to.get('prelims/economy/budget/fc')!)).toEqual(['prelims/polity/bodies#finance-commission'])
    expect(names(g.to.get('prelims/economy/budget/fc')!).sort()).toEqual(['mains/gs2-polity/federalism#fiscal', 'prelims/polity/bodies#finance-commission'])
    expect(new Set(neighbours(g, 'prelims/polity/bodies/finance-commission').map(placeKey)).size).toBe(2)
  })
})
