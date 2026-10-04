import { describe, expect, it } from 'vitest'
import type { RecallAttempt, RecallOutcome } from './contract'
import { renderBody } from './md'
import { TARGET_BLANK, annotate, promptOf, selectPrompts, toRecallUnit, unitsAt, type RecallItem } from './recall'

const KEY = 'prelims/history-culture/mahajanapadas-mauryas/mauryan-administration'
const MD = `
| Officer | Role |
|---|---|
| Akaradhyaksha | Superintendent of mines |
| Rajuka | District officer — land, welfare, judicial work |
| Samaharta | {{Revenue collection}} |

| Reform | Meaning | Instruments |
|---|---|---|
| Liberalisation | Fewer State controls | De-licensing; tariff cuts |
| Privatisation | Less State ownership | Disinvestment |

- **Chandragupta Maurya** → Kautilya tradition; treaty with {{Seleucus I Nicator}}; {{Megasthenes}} at court.
- **Bindusara** → Greek "Amitrochates".
- \`Art. 368\` → amendment procedure.
- **1947** — Independence.
- Teaser loans → low initial rate, later reset → default risk.
- A plain remark with no structure at all.

### Features of Dhamma

- Tolerance
- Respect for elders

> [!TRAP] Megasthenes' committees are a Greek account, not a Mauryan manual.

> [!TRAP] Kalinga war: {{8th regnal year}}, Rock Edict XIII.
`
const HTML = renderBody(MD, 'prelims/history-culture')
const build = (html = HTML, pyq = false) => annotate(html, KEY, { pyq })
const text = (html: string) => {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent!.replace(/\s+/g, ' ').trim()
}
const find = (items: RecallItem[], needle: string) => items.find((i) => text(i.answerHtml) === needle) ?? items.find((i) => text(i.answerHtml).includes(needle))!
const dom = (html: string) => {
  const d = document.createElement('div')
  d.innerHTML = html
  return d
}

describe('extraction', () => {
  const { items } = build()

  it('ids are deterministic and built from the section, the structural path and the role — not the answer', () => {
    const again = annotate(HTML + ' ', KEY).items // a different string, the same structure
    expect(again.map((i) => i.id)).toEqual(items.map((i) => i.id))
    for (const i of items) {
      expect(i.id.startsWith(KEY + '#')).toBe(true)
      expect(i.id).toMatch(/#[a-z0-9[\]/]+:(rc|cell|def|effect|list|trap)$/)
      expect(i.target).toEqual({ kind: 'section', stage: 'prelims', subjectId: 'history-culture', chapterId: 'mahajanapadas-mauryas', sectionId: 'mauryan-administration' })
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    // changing an answer keeps the id and changes the hash
    const edited = annotate(HTML.replace('Superintendent of mines', 'Head of mines'), KEY).items
    const before = find(items, 'Superintendent of mines')
    const after = find(edited, 'Head of mines')
    expect(after.id).toBe(before.id)
    expect(after.contentHash).not.toBe(before.contentHash)
    expect(find(edited, 'District officer').contentHash).toBe(find(items, 'District officer').contentHash)
  })

  it('tables: row heading → answer cell, one unit per cell, with the column heading as the label', () => {
    const rajuka = find(items, 'District officer')
    expect(rajuka.kind).toBe('entity-role')
    expect(text(rajuka.cueHtml)).toBe('Rajuka')
    expect(rajuka.cueLabel).toBe('Role')
    expect(rajuka.structuralPath).toBe('table[0]/tr[1]/td[1]')
    expect(rajuka.cueAnchorIds).toEqual(['table[0]/tr[1]/td[0]', 'table[0]/tr[0]/th[1]'])
    expect(rajuka.answerAnchorIds).toEqual(['table[0]/tr[1]/td[1]'])
    // row heading → several cells: Liberalisation has a Meaning and an Instruments unit
    const lib = items.filter((i) => text(i.cueHtml) === 'Liberalisation')
    expect(lib.map((i) => i.cueLabel)).toEqual(['Meaning', 'Instruments'])
    expect(lib.map((i) => text(i.answerHtml))).toEqual(['Fewer State controls', 'De-licensing; tariff cuts'])
  })

  it('a two-column table also allows answer → row heading; a wider one does not', () => {
    const rajuka = find(items, 'District officer')
    expect(rajuka.reversePromptAllowed).toBe(true)
    expect(text(rajuka.reverse!.cueHtml)).toContain('District officer')
    expect(text(rajuka.reverse!.answerHtml)).toBe('Rajuka')
    expect(rajuka.reverse!.cueLabel).toBe('Officer')
    expect(items.filter((i) => text(i.cueHtml) === 'Liberalisation').every((i) => !i.reversePromptAllowed)).toBe(true)
    // the reverse is chosen from the ids alone
    const shown = [1, 2, 3, 4, 5, 6].map((n) => text(promptOf(rajuka, n).answerHtml))
    expect(shown).toEqual([1, 2, 3, 4, 5, 6].map((n) => text(promptOf(rajuka, n).answerHtml)))
    expect(new Set(shown)).toEqual(new Set(['Rajuka', 'District officer — land, welfare, judicial work']))
  })

  it('explicit {{answers}} are kept as they are, and a cell that is only one of them is not doubled', () => {
    const explicit = items.filter((i) => i.id.endsWith(':rc'))
    expect(explicit.map((i) => text(i.answerHtml))).toEqual(['Revenue collection', 'Seleucus I Nicator', 'Megasthenes', '8th regnal year'])
    expect(items.filter((i) => text(i.answerHtml) === 'Revenue collection')).toHaveLength(1)
    const sel = find(items, 'Seleucus I Nicator')
    expect(sel.inline).toBe(true)
    // the cue is the sentence, with this answer and every other answer in it blanked
    expect(sel.cueHtml).toContain(TARGET_BLANK)
    expect(text(sel.cueHtml)).toBe('Chandragupta Maurya → Kautilya tradition; treaty with ; at court.')
    expect(text(sel.cueHtml)).not.toContain('Megasthenes')
  })

  it('recognises Term → fact, Article → provision, date → event and cause → effect', () => {
    expect(find(items, 'Greek "Amitrochates"')).toMatchObject({ kind: 'term-definition', level: 'standard' })
    expect(text(find(items, 'Greek "Amitrochates"').cueHtml)).toBe('Bindusara →')
    expect(find(items, 'amendment procedure')).toMatchObject({ kind: 'law-provision' })
    expect(find(items, 'Independence')).toMatchObject({ kind: 'date-event' })
    expect(find(items, 'low initial rate')).toMatchObject({ kind: 'process', level: 'exam' })
    // a derived answer that contains explicit ones leaves the work to them until Exam
    const chandragupta = find(items, 'Kautilya tradition')
    expect(chandragupta.level).toBe('exam')
    expect(chandragupta.covers).toHaveLength(2)
  })

  it('a plain list under a heading is one unit; a trap callout is one unit; plain prose is none', () => {
    expect(find(items, 'Tolerance')).toMatchObject({ kind: 'list', level: 'exam' })
    expect(text(find(items, 'Tolerance').cueHtml)).toBe('Features of Dhamma')
    const traps = items.filter((i) => i.kind === 'trap')
    expect(traps.map((t) => t.priority)).toEqual(['trap', 'trap', 'trap'])
    expect(find(items, "Megasthenes' committees")).toMatchObject({ level: 'light', priority: 'trap' })
    expect(items.some((i) => text(i.answerHtml).includes('plain remark') || text(i.cueHtml).includes('plain remark'))).toBe(false)
  })

  it('priority: explicit facts rank high, PYQ sections rank them pyq, traps rank trap, the rest normal', () => {
    expect(find(items, 'Megasthenes').priority).toBe('high')
    expect(find(build(HTML, true).items, 'Megasthenes').priority).toBe('pyq')
    expect(find(items, '8th regnal year').priority).toBe('trap')
    expect(find(items, 'District officer').priority).toBe('normal')
  })

  it('RecallUnit is the item without what is only there to present it', () => {
    expect(Object.keys(toRecallUnit(items[0])).sort()).toEqual(['answerAnchorIds', 'contentHash', 'cueAnchorIds', 'id', 'kind', 'priority', 'reversePromptAllowed', 'structuralPath', 'target'])
  })
})

describe('concealment', () => {
  const { html, items } = build()
  const root = dom(html)
  const wrap = (needle: string) => [...root.querySelectorAll<HTMLElement>('.rq')].find((e) => e.dataset.rid === find(items, needle).id)!

  it('wraps the answer cell, never a substring of it, and leaves the cue outside', () => {
    const w = wrap('District officer')
    expect(w.parentElement!.tagName).toBe('TD')
    expect(w.parentElement!.children).toHaveLength(1)
    expect(w.firstElementChild!.className).toBe('rq-a')
    expect(w.textContent).toBe('District officer — land, welfare, judicial work')
    expect(w.closest('tr')!.children[0].querySelector('.rq')).toBeNull() // the row heading stays readable
    expect(wrap('Greek').closest('li')!.querySelector('strong')!.closest('.rq')).toBeNull()
  })

  it('the text is unchanged: wrappers add nothing a highlight or a search would count', () => {
    expect(text(html)).toBe(text(HTML))
  })

  it('the mask is one fixed label: nothing on the wrapper depends on the answer', () => {
    const short = wrap('Greek')
    const long = wrap('Kautilya tradition')
    const attrs = (e: HTMLElement) => [...e.attributes].map((a) => a.name).sort()
    expect(attrs(short)).toEqual(['class', 'data-lv', 'data-m', 'data-rid'])
    expect(attrs(long)).toEqual(attrs(short))
    for (const e of root.querySelectorAll<HTMLElement>('.rq')) {
      expect(e.getAttribute('style')).toBeNull()
      expect(e.dataset.rid).not.toContain(e.textContent!.slice(0, 12).trim() || '\u0000') // the id says nothing of the answer
    }
  })

  it('Light conceals explicit facts and traps; Standard adds tables and terms; Exam conceals whole answers', () => {
    const at = (level: 'light' | 'standard' | 'exam') => unitsAt(items, level).map((i) => text(i.answerHtml))
    expect(at('light')).toEqual(['Revenue collection', 'Seleucus I Nicator', 'Megasthenes', "Megasthenes' committees are a Greek account, not a Mauryan manual.", '8th regnal year'])
    expect(at('standard')).toEqual(expect.arrayContaining(['Superintendent of mines', 'Fewer State controls', 'Greek "Amitrochates".', 'amendment procedure.', 'Seleucus I Nicator']))
    expect(at('standard')).not.toEqual(expect.arrayContaining(['Tolerance Respect for elders']))
    expect(at('standard').some((t) => t.startsWith('Kautilya tradition'))).toBe(false)
    const exam = at('exam')
    expect(exam.some((t) => t.startsWith('Kautilya tradition'))).toBe(true)
    expect(exam).toContain('Tolerance Respect for elders')
    expect(exam).not.toContain('Seleucus I Nicator') // inside the whole answer now
    expect(exam.length).toBeGreaterThan(at('light').length)
  })

  it('data-m on each wrapper matches the units in play at that intensity', () => {
    for (const level of ['light', 'standard', 'exam'] as const) {
      const marked = [...root.querySelectorAll<HTMLElement>(`.rq[data-m~="${level}"]`)].map((e) => e.dataset.rid).sort()
      expect(marked).toEqual(unitsAt(items, level).map((i) => i.id).sort())
    }
    // at Exam no concealed answer sits inside another concealed answer
    expect(root.querySelector('.rq[data-m~="exam"] .rq[data-m~="exam"]')).toBeNull()
  })

  it('annotating is cached per section and pure', () => {
    expect(annotate(HTML, KEY)).toBe(annotate(HTML, KEY))
    expect(annotate('', KEY).items).toEqual([])
  })
})

describe('guided prompts', () => {
  const { items } = build()
  let n = 0
  const attempt = (item: RecallItem, outcome: RecallOutcome, hash = item.contentHash): RecallAttempt => ({ id: `a${++n}`, recallUnitId: item.id, contentHash: hash, target: item.target, outcome, attemptedAt: new Date(Date.UTC(2026, 9, 5) + n * 1000).toISOString(), deviceId: 'd' })

  it('come in the order of the notes and never exceed the limit', () => {
    const all = selectPrompts(items, [], 'standard', 50)
    expect(all.map((p) => p.id)).toEqual(unitsAt(items, 'standard').map((p) => p.id))
    const few = selectPrompts(items, [], 'standard', 4)
    expect(few).toHaveLength(4)
    expect(few.map((p) => all.indexOf(p))).toEqual([...few.map((p) => all.indexOf(p))].sort((a, b) => a - b))
  })

  it('PYQ facts and traps come before ordinary ones when there is not room for everything', () => {
    const few = selectPrompts(items, [], 'standard', 5)
    expect(few.every((p) => p.priority !== 'normal')).toBe(true)
  })

  it('a fact missed before is asked again; one known twice running makes way', () => {
    const rajuka = find(items, 'District officer')
    const megasthenes = find(items, 'Megasthenes')
    const none = selectPrompts(items, [], 'standard', 5)
    expect(none).not.toContain(rajuka)
    expect(none).toContain(megasthenes)
    const picked = selectPrompts(items, [attempt(rajuka, 'missed'), attempt(rajuka, 'missed'), attempt(megasthenes, 'knew'), attempt(megasthenes, 'knew')], 'standard', 5)
    expect(picked).toContain(rajuka)
    expect(picked).not.toContain(megasthenes)
  })

  it('an answer recorded against different content is ignored; a skip says nothing', () => {
    const rajuka = find(items, 'District officer')
    expect(selectPrompts(items, [attempt(rajuka, 'missed', 'stale'), attempt(rajuka, 'missed', 'stale')], 'standard', 5)).not.toContain(rajuka)
    expect(selectPrompts(items, [attempt(rajuka, 'skipped'), attempt(rajuka, 'skipped')], 'standard', 5)).not.toContain(rajuka)
  })

  it('uses only the units of the chosen intensity', () => {
    expect(selectPrompts(items, [], 'light', 50).every((p) => p.level === 'light')).toBe(true)
    expect(selectPrompts(annotate('<p>Nothing to recall here.</p>', KEY + '-x').items, [], 'exam')).toEqual([])
  })
})
