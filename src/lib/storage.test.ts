import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { anchor, applyHighlights, extractMarks, textStream, type Highlight } from './highlight'
import { migrateOverrides } from './migrate'
import { DB_NAME, DB_VERSION, upgrade } from './db'

const BASE = '<ul>\n<li>PAC = <strong>22</strong> members</li>\n<li>Estimates Committee = 30, all LS</li>\n</ul>\n<p>Money Bill: RS may recommend only.</p>'
// what the editor writes for the same content: no whitespace between blocks, wrapped cells
const EDITOR = '<ul><li><p>PAC = <strong>22</strong> members</p></li><li><p>Estimates Committee = 30, all LS</p></li></ul><p>Money Bill: RS may recommend only.</p>'

const hl = (text: string, start: number, extra: Partial<Highlight> = {}): Highlight => ({
  id: 'h1', sectionKey: 's', color: 'yellow', start, end: start + text.replace(/\s/g, '').length, text, before: '', createdAt: 1, updatedAt: 1, ...extra,
})
const marked = (html: string) => [...html.matchAll(/<mark[^>]*>(.*?)<\/mark>/g)].map((m) => m[1]).join('|')

describe('highlight anchoring', () => {
  it('uses the same text stream for original and editor HTML', () => {
    expect(textStream(BASE)).toBe(textStream(EDITOR))
  })

  it('places a highlight at the same words in both serialisations', () => {
    const start = textStream(BASE).indexOf('EstimatesCommittee')
    const h = hl('Estimates Committee', start)
    expect(marked(applyHighlights(BASE, [h]).html)).toBe('Estimates Committee')
    expect(marked(applyHighlights(EDITOR, [h]).html)).toBe('Estimates Committee')
  })

  it('spans inline formatting and block boundaries without invalid markup', () => {
    const start = textStream(BASE).indexOf('22')
    const out = applyHighlights(BASE, [hl('22 members Estimates', start)])
    expect(marked(out.html)).toBe('22| members|Estimates')
    expect(out.html).not.toMatch(/<ul>\s*<mark/) // never wraps whitespace between list items
  })

  it('re-anchors by quote when the text before it changed', () => {
    const edited = BASE.replace('PAC = ', 'Public Accounts Committee (PAC) = ')
    const h = hl('Estimates Committee', textStream(BASE).indexOf('EstimatesCommittee'))
    expect(marked(applyHighlights(edited, [h]).html)).toBe('Estimates Committee')
  })

  it('picks the occurrence with the matching preceding words', () => {
    const html = '<p>LS only. RS: LS only applies.</p>'
    const second = textStream(html).lastIndexOf('LSonly')
    expect(anchor(textStream(html), { start: 999, text: 'LS only', before: 'RS:' })?.start).toBe(second)
  })

  it('reports a highlight whose words are gone instead of misplacing it', () => {
    const out = applyHighlights(BASE, [hl('text that existed only in an edit', 3)])
    expect(out.unplaced).toEqual(['h1'])
    expect(out.html).not.toContain('<mark')
  })

  it('keeps overlapping highlights from nesting', () => {
    const s = textStream(BASE)
    const a = hl('Estimates Committee', s.indexOf('EstimatesCommittee'), { id: 'a', createdAt: 1 })
    const b = hl('Committee = 30', s.indexOf('Committee=30'), { id: 'b', createdAt: 2, color: 'pink' })
    const html = applyHighlights(BASE, [a, b]).html
    expect(html).not.toMatch(/<mark[^>]*>[^<]*<mark/)
    expect(marked(html)).toBe('Estimates Committee| = 30')
  })

  it('editor round trip: marks → records → marks', () => {
    const start = textStream(EDITOR).indexOf('MoneyBill')
    const withMarks = applyHighlights(EDITOR, [hl('Money Bill', start)]).html
    const { clean, marks } = extractMarks(withMarks)
    expect(clean).toBe(EDITOR)
    expect(marks).toHaveLength(1)
    expect(marks[0]).toMatchObject({ hid: 'h1', start, text: 'Money Bill' })
  })
})

describe('v1 → v2 migration', () => {
  const v1Highlighted = BASE.replace('Estimates Committee', '<mark data-hid="hold" data-color="green">Estimates Committee</mark>')

  it('lifts highlights out of saved HTML and drops rows that held nothing else', () => {
    const m = migrateOverrides([{ key: 'k1', html: v1Highlighted, updatedAt: 10 }], () => BASE, 'dev')
    expect(m.drop).toEqual(['k1'])
    expect(m.overrides).toHaveLength(0)
    expect(m.highlights).toHaveLength(1)
    expect(m.highlights[0]).toMatchObject({ id: 'hold', sectionKey: 'k1', color: 'green', text: 'Estimates Committee' })
    // the migrated highlight lands on the same words of the canonical text
    expect(marked(applyHighlights(BASE, m.highlights).html)).toBe('Estimates Committee')
  })

  it('keeps real edits (and edited headings) while still separating their highlights', () => {
    const edited = EDITOR.replace('all LS', 'all Lok Sabha').replace('Money Bill', '<mark data-hid="h2" data-color="pink">Money Bill</mark>')
    const m = migrateOverrides(
      [
        { key: 'k1', html: edited, title: 'My heading', updatedAt: 10 },
        { key: 'k2', title: 'Only a heading', updatedAt: 11 },
        { key: 'k3', html: EDITOR.replace('30', '31'), updatedAt: 12 },
      ],
      () => BASE,
      'dev',
    )
    expect(m.drop).toEqual([])
    expect(m.overrides.map((o) => o.key)).toEqual(['k1', 'k2', 'k3'])
    expect(m.overrides[0].html).toContain('all Lok Sabha')
    expect(m.overrides[0].html).not.toContain('<mark')
    expect(m.overrides[0].title).toBe('My heading')
    expect(m.overrides.every((o) => o.rev && o.deviceId === 'dev')).toBe(true)
    expect(m.highlights.map((h) => h.id)).toEqual(['h2'])
  })

  it('opening a v1 database upgrades it in place and keeps every row', async () => {
    // build the database exactly as reader v1 did
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore('overrides', { keyPath: 'key' })
        req.result.createObjectStore('kv')
      }
      req.onsuccess = () => {
        const tx = req.result.transaction(['overrides', 'kv'], 'readwrite')
        tx.objectStore('overrides').put({ key: 'prelims/polity/parliament/x', html: v1Highlighted, updatedAt: 5 })
        tx.objectStore('kv').put({ sections: { a: { done: true } }, chapters: { c: { status: 'revised', scroll: 300 } } }, 'progress')
        tx.oncomplete = () => {
          req.result.close()
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
    })
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => upgrade(req.result)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect([...db.objectStoreNames].sort()).toEqual(['activeStudySession', 'conflicts', 'highlights', 'kv', 'outbox', 'overrides', 'studyGoals', 'studyQueue', 'studySessions'])
    const get = <T>(store: string, key: string) =>
      new Promise<T>((resolve) => {
        const r = db.transaction(store).objectStore(store).get(key)
        r.onsuccess = () => resolve(r.result as T)
      })
    expect((await get<{ html: string }>('overrides', 'prelims/polity/parliament/x')).html).toBe(v1Highlighted)
    expect((await get<{ chapters: Record<string, { scroll: number }> }>('kv', 'progress')).chapters.c.scroll).toBe(300)
    db.close()
  })

  it('v2 → v3 adds the study stores beside the existing ones and rewrites nothing', async () => {
    const name = 'upsc-notes-v2-copy'
    const rows = { overrides: { key: 'prelims/polity/parliament/x', html: '<p>edit</p>', updatedAt: 5, rev: 'r1' }, highlights: { id: 'h1', sectionKey: 's', color: 'pink' }, outbox: { id: 'hl~h1', seq: 4 }, conflicts: { id: 'edit~s', remote: { id: 'edit~s' } } }
    // the database exactly as the previous build left it
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(name, 2)
      req.onupgradeneeded = () => {
        req.result.createObjectStore('overrides', { keyPath: 'key' })
        req.result.createObjectStore('kv')
        for (const s of ['highlights', 'outbox', 'conflicts']) req.result.createObjectStore(s, { keyPath: 'id' })
      }
      req.onsuccess = () => {
        const tx = req.result.transaction(['overrides', 'kv', 'highlights', 'outbox', 'conflicts'], 'readwrite')
        for (const [s, row] of Object.entries(rows)) tx.objectStore(s).put(row)
        tx.objectStore('kv').put({ sections: { a: { done: true } }, chapters: {} }, 'progress')
        tx.objectStore('kv').put(2, 'schema')
        tx.oncomplete = () => {
          req.result.close()
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
    })
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name, DB_VERSION)
      req.onupgradeneeded = () => upgrade(req.result)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const all = <T>(store: string) =>
      new Promise<T[]>((resolve) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => resolve(r.result as T[])
      })
    for (const [s, row] of Object.entries(rows)) expect(await all(s)).toEqual([row])
    expect(await all('kv')).toHaveLength(2)
    for (const s of ['studySessions', 'activeStudySession', 'studyGoals', 'studyQueue']) expect(await all(s)).toEqual([])
    db.close()
  })
})
