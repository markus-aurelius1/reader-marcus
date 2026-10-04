// Recall Engine v2. Pure: section HTML in, RecallUnits and annotated HTML out.
// docs/READER_V2_REVISION_CONTRACT.md → Recall. Unit-tested in recall.test.ts.
//
// A RecallUnit is one thing worth retrieving: a cue that stays visible and an answer that is
// concealed. Units are found from the structure of the notes — never by blurring arbitrary
// substrings, and never by turning every sentence into a prompt:
//
//   explicit   {{answer}} written by the author (a .rc span)          always kept
//   table      row heading (+ column heading) → cell                   one unit per answer cell
//   term       **Term** → fact  ·  **Term**: fact  ·  **Term** = fact  cue = the term
//   arrow      cause → effect  ·  step → step → step                   cue = the left-hand side
//   list       "Features:" followed by a plain list                    cue = the lead-in
//   trap       a TRAP callout                                          cue = the TRAP label
//
// Units are static, derived content metadata. They are rebuilt from the text whenever it is
// needed and are never stored or synced.
import type { ContentRef, ExamStage, RecallAttempt, RecallIntensity, RecallKind, RecallPriority, RecallUnit } from './contract'
import { hash32 } from './scheduler'

export interface RecallItem extends RecallUnit {
  /** The lowest intensity at which the answer is concealed. */
  level: RecallIntensity
  /** Explicit units inside this (derived) answer. They stand in for it below Exam intensity. */
  covers: string[]
  /** The prompt. A unit cut out of a sentence keeps the sentence, with every answer in it blanked. */
  cueHtml: string
  /** "role" in "Recall role": the column heading, where there is one. */
  cueLabel: string
  answerHtml: string
  /** The answer replaces the blank inside cueHtml (a cloze) instead of following it. */
  inline: boolean
  /** Answer → row heading, for a two-column table. */
  reverse?: { cueHtml: string; cueLabel: string; answerHtml: string }
}
export interface Annotated {
  /**
   * The same content with every answer wrapped:
   * <span class="rq" data-rid data-lv data-m="standard exam"><span class="rq-a">…</span></span>
   * data-m lists the intensities at which the answer is concealed.
   */
  html: string
  items: RecallItem[]
}

export const INTENSITIES: RecallIntensity[] = ['light', 'standard', 'exam']
export const INTENSITY_LABEL: Record<RecallIntensity, string> = { light: 'Light', standard: 'Standard', exam: 'Exam' }
const RANK: Record<RecallIntensity, number> = { light: 0, standard: 1, exam: 2 }
/** The blank that stands for the answer being asked about inside a cue. */
export const TARGET_BLANK = '<span class="rb" data-t="1"></span>'
const OTHER_BLANK = '<span class="rb"></span>'

const BLOCKS = 'td,th,li,p,h3,h4,.callout'
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()
const textOf = (n: Node | null) => squash(n?.textContent ?? '')

export const sectionRef = (sectionKey: string): ContentRef => {
  const [stage, subjectId, chapterId, sectionId] = sectionKey.split('/')
  return { kind: 'section', stage: stage as ExamStage, subjectId, chapterId, sectionId }
}

/** Where an element sits in the section: td[1] of tr[3] of table[0]. Stable while the structure is. */
function pathOf(el: Element, root: Element): string {
  const out: string[] = []
  for (let e: Element | null = el; e && e !== root; e = e.parentElement) {
    const tag = e.tagName.toLowerCase()
    if (tag === 'tbody' || tag === 'thead') continue
    let i = 0
    for (let p = e.previousElementSibling; p; p = p.previousElementSibling) if (p.tagName === e.tagName) i++
    out.unshift(`${tag}[${i}]`)
  }
  return out.join('/')
}

// ---- kinds --------------------------------------------------------------------------------
const LAW = /^(arts?\.?|articles?|sections?|sec\.|schedules?|part|rule|entry|amdt\.?|amendment)\s*[\dIVXL]/i
const DATE = /^(c\.\s*)?[\d\s–\-/,.]*\d{3,4}[\d\s–\-/,.]*(bce|ce|bc|ad)?$/i
const H_LAW = /\b(article|provision|section|schedule|act|amendment|law)\b/i
const H_DATE = /\b(year|date|when|period|century)\b/i
const H_PLACE = /\b(place|site|location|region|river|state|city|port|pass|park|reserve|capital|lake|peak|range|island|district|country)\b/i
const H_ROLE = /\b(role|function|power|duty|duties|work|mandate|responsib)/i
const H_BODY = /\b(body|officer|official|institution|authority|post|committee|commission|ruler|organisation|organization|agency|ministry|person|leader|founder)\b/i
const H_COMPARE = /\b(basis|feature|aspect|parameter|criteri|point|versus|vs\.?)\b/i
const H_CAUSE = /\b(cause|effect|impact|result|consequence|reason)\b/i

function kindOfTerm(cue: string, hasCode: boolean): RecallKind {
  if (hasCode || LAW.test(cue)) return 'law-provision'
  if (DATE.test(cue)) return 'date-event'
  return 'term-definition'
}
function kindOfCell(rowHead: string, rowHeadCode: boolean, h0: string, hj: string): RecallKind {
  if (H_COMPARE.test(h0)) return 'comparison'
  if (rowHeadCode && LAW.test(rowHead)) return 'law-provision'
  if (LAW.test(rowHead) || H_LAW.test(h0)) return 'law-provision'
  if (DATE.test(rowHead) || H_DATE.test(h0)) return 'date-event'
  if (H_CAUSE.test(hj)) return 'cause-effect'
  if (H_ROLE.test(hj) || H_BODY.test(h0)) return 'entity-role'
  if (H_PLACE.test(h0) || H_PLACE.test(hj)) return 'location'
  return 'table-relation'
}

// ---- extraction ---------------------------------------------------------------------------
interface Spec {
  item: RecallItem
  /** What to wrap: an existing .rc span, a cell or callout's contents, or a run of sibling nodes. */
  wrap: { span: Element } | { inside: Element; block: boolean } | { nodes: Node[]; block: boolean }
}

const cache = new Map<string, { html: string; pyq: boolean; out: Annotated }>()

/**
 * The recall units of one section and its HTML with every answer wrapped.
 * `pyq`: previous-year questions are recorded against this section, so its explicit facts rank as PYQ.
 */
export function annotate(html: string, sectionKey: string, opts: { pyq?: boolean } = {}): Annotated {
  const pyq = !!opts.pyq
  const hit = cache.get(sectionKey)
  if (hit && hit.html === html && hit.pyq === pyq) return hit.out
  const out = build(html, sectionKey, pyq)
  cache.set(sectionKey, { html, pyq, out })
  return out
}

function build(html: string, sectionKey: string, pyq: boolean): Annotated {
  if (typeof DOMParser === 'undefined' || !html) return { html, items: [] }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const root = doc.body
  const target = sectionRef(sectionKey)
  const specs: Spec[] = []
  const idOf = (el: Element, role: string) => `${sectionKey}#${pathOf(el, root)}:${role}`
  const hashOf = (cue: string, answer: string) => hash32(`${cue}␟${answer}`).toString(36)

  /** A copy of `el` as a cue: nested lists dropped, every explicit answer blanked. */
  const cueOf = (el: Element, mark?: Element, dropAfter?: Node[]): string => {
    const all = [...el.querySelectorAll('.rc')]
    const at = mark ? all.indexOf(mark) : -1
    const c = el.cloneNode(true) as Element
    if (dropAfter?.length) {
      // the answer nodes are the tail of the block: cut the copy at the same child index
      const host = dropAfter[0].parentNode!
      const index = [...host.childNodes].indexOf(dropAfter[0] as ChildNode)
      const hostCopy = host === el ? c : (c.querySelector(':scope > p') ?? c)
      ;[...hostCopy.childNodes].slice(index).forEach((n) => n.remove())
    }
    c.querySelectorAll('ul,ol').forEach((n) => n.remove())
    ;[...c.querySelectorAll('.rc')].forEach((n, i) => {
      const t = doc.createElement('template')
      t.innerHTML = i === at ? TARGET_BLANK : OTHER_BLANK
      n.replaceWith(t.content)
    })
    return c.innerHTML.trim()
  }
  const emphasised = (el: Element | DocumentFragment) => !!el.querySelector('.hy,.red')

  // 1 — explicit answers
  const explicit = new Map<Element, RecallItem>()
  for (const span of root.querySelectorAll('.rc')) {
    if (span.parentElement?.closest('.rc')) continue
    const block = span.closest(BLOCKS) ?? root
    const trap = !!span.closest('.callout[data-kind="trap"]')
    const cell = span.closest('td')
    const row = cell?.parentElement
    const table = cell?.closest('table')
    const heads = table ? [...table.querySelectorAll('thead th')] : []
    const col = cell && row ? [...row.children].indexOf(cell) : -1
    const rowHead = row && col > 0 ? row.children[0] : null
    const lead = block.matches('li,p') ? firstStrong(block) : null
    const kind: RecallKind = trap ? 'trap' : cell ? kindOfCell(textOf(rowHead), !!rowHead?.querySelector('code'), textOf(heads[0]), textOf(heads[col])) : lead ? kindOfTerm(textOf(lead), !!lead.querySelector('code')) : 'fact'
    const body = cueOf(block, span)
    const cueHtml = rowHead ? `<span class="rh">${cueOf(rowHead)}</span>${heads[col] ? `<span class="rl">${textOf(heads[col])}</span>` : ''} ${body}` : body
    const cueText = `${textOf(rowHead)} ${textOf(block)}`
    const item: RecallItem = {
      id: idOf(span, 'rc'), target, structuralPath: pathOf(span, root), kind,
      priority: trap ? 'trap' : pyq ? 'pyq' : 'high',
      cueAnchorIds: [pathOf(block, root), ...(rowHead ? [pathOf(rowHead, root)] : [])],
      answerAnchorIds: [pathOf(span, root)],
      reversePromptAllowed: false,
      contentHash: hashOf(cueText, textOf(span)),
      level: 'light', covers: [], cueHtml, cueLabel: '', answerHtml: span.innerHTML, inline: true,
    }
    explicit.set(span, item)
    specs.push({ item, wrap: { span } })
  }
  const inside = (el: Element | Node[]) => {
    const els = Array.isArray(el) ? el.filter((n): n is Element => n.nodeType === 1) : [el]
    const out: string[] = []
    for (const e of els) {
      if (explicit.has(e)) out.push(explicit.get(e)!.id)
      for (const s of e.querySelectorAll('.rc')) if (explicit.has(s)) out.push(explicit.get(s)!.id)
    }
    return out
  }
  const derived = (el: Element, role: string, kind: RecallKind, cueText: string, answerText: string, covers: string[], rest: Pick<RecallItem, 'cueHtml' | 'cueLabel' | 'answerHtml'> & Partial<RecallItem>, cueAnchors: string[]): RecallItem => ({
    id: idOf(el, role), target, structuralPath: pathOf(el, root), kind, priority: 'normal',
    cueAnchorIds: cueAnchors, answerAnchorIds: [pathOf(el, root)], reversePromptAllowed: false,
    contentHash: hashOf(cueText, answerText), level: covers.length ? 'exam' : 'standard', covers, inline: false, ...rest,
  })

  // 2 — tables: row heading (+ column heading) → each answer cell
  for (const table of root.querySelectorAll('table')) {
    const heads = [...table.querySelectorAll('thead th')]
    const h0 = textOf(heads[0])
    const rows = [...table.querySelectorAll('tbody tr')]
    const headTexts = rows.map((r) => textOf(r.children[0]))
    for (const row of rows) {
      const cells = [...row.children].filter((c) => c.tagName === 'TD')
      if (cells.length < 2) continue
      const rowHead = cells[0]
      const head = textOf(rowHead)
      if (!head) continue
      for (let j = 1; j < cells.length; j++) {
        const cell = cells[j]
        const answer = textOf(cell)
        if (!answer) continue
        const label = textOf(heads[j])
        const covers = inside(cell)
        // a cell that is nothing but one explicit answer is already that unit
        if (covers.length === 1 && textOf(cell.querySelector('.rc')) === answer) continue
        const item = derived(cell, 'cell', kindOfCell(head, !!rowHead.querySelector('code'), h0, label), `${head} ${label}`, answer, covers, { cueHtml: `<span class="rh">${cueOf(rowHead)}</span>`, cueLabel: label, answerHtml: cell.innerHTML }, [pathOf(rowHead, root), ...(heads[j] ? [pathOf(heads[j], root)] : [])])
        if (emphasised(cell)) item.priority = 'high'
        // answer → row heading reads well only for a plain two-column table with distinct headings
        if (cells.length === 2 && !rowHead.querySelector('.rc') && !covers.length && headTexts.filter((t) => t === head).length === 1 && answer.length <= 160) {
          item.reversePromptAllowed = true
          item.reverse = { cueHtml: `<span class="rh">${cell.innerHTML}</span>`, cueLabel: h0, answerHtml: rowHead.innerHTML }
        }
        specs.push({ item, wrap: { inside: cell, block: false } })
      }
    }
  }

  // 3 — "Term → fact" and "cause → effect" lines
  for (const block of root.querySelectorAll('li,p')) {
    if (block.closest('table,.callout') || (block.tagName === 'P' && block.parentElement?.tagName === 'LI')) continue
    const host = block.tagName === 'LI' && block.firstElementChild?.tagName === 'P' ? block.firstElementChild : block
    const line: Node[] = []
    for (const n of host.childNodes) {
      if (n.nodeType === 1 && /^(UL|OL|TABLE|DIV)$/.test((n as Element).tagName)) break
      line.push(n)
    }
    const split = separator(line)
    if (!split) continue
    // cut the text node at the separator: the answer is everything after it on this line
    const tail = split.node.splitText(split.offset)
    const nodes = line.slice(line.indexOf(split.node) + 1)
    nodes.unshift(tail)
    while (nodes.length && !textOf(nodes[nodes.length - 1])) nodes.pop()
    const answer = squash(nodes.map((n) => n.textContent ?? '').join(''))
    const cue = squash(line.slice(0, line.indexOf(split.node) + 1).map((n) => n.textContent ?? '').join('')).replace(/\s*[→—–:=-]\s*$/, '')
    if (answer.length < 2 || !cue || cue.length > 90) continue
    // a cue that is itself an explicit answer would leave nothing to go by
    if (line.slice(0, line.indexOf(split.node)).some((n) => n.nodeType === 1 && ((n as Element).matches('.rc') || (n as Element).querySelector('.rc')))) continue
    const covers = inside(nodes)
    if (covers.length === 1 && textOf(nodes.find((n) => n.nodeType === 1 && (n as Element).matches('.rc')) ?? null) === answer) continue
    const frag = doc.createElement('div')
    nodes.forEach((n) => frag.appendChild(n.cloneNode(true)))
    const kind: RecallKind = split.lead ? kindOfTerm(cue, !!split.lead.querySelector('code') || split.lead.tagName === 'CODE') : /→/.test(answer) ? 'process' : 'cause-effect'
    const item = derived(block, split.lead ? 'def' : 'effect', kind, cue, answer, covers, { cueHtml: cueOf(block, undefined, nodes), cueLabel: '', answerHtml: frag.innerHTML }, [pathOf(block, root)])
    // an arrow with no named term is concealed only at Exam intensity
    if (!split.lead) item.level = 'exam'
    else if (emphasised(frag)) item.priority = 'high'
    specs.push({ item, wrap: { nodes, block: false } })
  }

  // 4 — a plain list under a lead-in
  const taken = new Set(specs.flatMap((s) => ('nodes' in s.wrap ? s.wrap.nodes : 'inside' in s.wrap ? [s.wrap.inside] : [s.wrap.span])))
  for (const list of root.querySelectorAll(':scope > ul, :scope > ol')) {
    const lead = list.previousElementSibling
    if (!lead || !(/^H[34]$/.test(lead.tagName) || (lead.tagName === 'P' && /[:：]$/.test(textOf(lead))))) continue
    if (list.children.length < 2 || list.querySelector('.rc,table') || [...taken].some((n) => list.contains(n))) continue
    const cue = textOf(lead).replace(/[:：]$/, '')
    const item = derived(list, 'list', list.tagName === 'OL' ? 'process' : 'list', cue, textOf(list), [], { cueHtml: `<span class="rh">${lead.innerHTML}</span>`, cueLabel: '', answerHtml: list.outerHTML }, [pathOf(lead, root)])
    item.level = 'exam'
    specs.push({ item, wrap: { nodes: [list], block: true } })
  }

  // 5 — trap callouts: the correction is the answer
  for (const callout of root.querySelectorAll('.callout[data-kind="trap"]')) {
    const answer = textOf(callout)
    if (!answer) continue
    const covers = inside(callout)
    const item = derived(callout, 'trap', 'trap', 'TRAP', answer, covers, { cueHtml: '<span class="rh">Trap in this section</span>', cueLabel: 'the trap', answerHtml: callout.innerHTML }, [pathOf(callout, root)])
    item.priority = 'trap'
    item.level = covers.length ? 'exam' : 'light'
    specs.push({ item, wrap: { inside: callout, block: true } })
  }

  // at which intensities each answer is concealed (data-m), by the same rule the prompts use
  const masked = new Map<string, RecallIntensity[]>()
  for (const level of INTENSITIES) for (const it of unitsAt(specs.map((s) => s.item), level)) masked.set(it.id, [...(masked.get(it.id) ?? []), level])
  const tag = (el: HTMLElement, item: RecallItem) => {
    el.dataset.rid = item.id
    el.dataset.lv = item.level
    el.dataset.m = (masked.get(item.id) ?? []).join(' ')
  }

  // wrap — explicit answers first, then everything that may contain them
  for (const { item, wrap } of specs) {
    const outer = doc.createElement('block' in wrap && wrap.block ? 'div' : 'span')
    const inner = doc.createElement(outer.tagName)
    inner.className = 'rq-a'
    tag(outer, item)
    if ('span' in wrap) {
      const s = wrap.span as HTMLElement
      s.classList.add('rq')
      tag(s, item)
      while (s.firstChild) inner.appendChild(s.firstChild)
      s.appendChild(inner)
      continue
    }
    outer.className = 'block' in wrap && wrap.block ? 'rq blk' : 'rq'
    outer.appendChild(inner)
    if ('inside' in wrap) {
      while (wrap.inside.firstChild) inner.appendChild(wrap.inside.firstChild)
      wrap.inside.appendChild(outer)
    } else {
      wrap.nodes[0].parentNode!.insertBefore(outer, wrap.nodes[0])
      wrap.nodes.forEach((n) => inner.appendChild(n))
    }
  }

  const order = new Map([...root.querySelectorAll<HTMLElement>('[data-rid]')].map((e, i) => [e.dataset.rid!, i]))
  const items = specs.map((s) => s.item).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return { html: root.innerHTML, items }
}

const firstStrong = (block: Element): Element | null => {
  const host = block.tagName === 'LI' && block.firstElementChild?.tagName === 'P' ? block.firstElementChild : block
  for (const n of host.childNodes) {
    if (n.nodeType === 3 && !n.textContent?.trim()) continue
    return n.nodeType === 1 && /^(STRONG|CODE)$/.test((n as Element).tagName) ? (n as Element) : null
  }
  return null
}

/** Where a line divides into cue and answer: after "**Term** →", or at the first " → ". */
function separator(line: Node[]): { node: Text; offset: number; lead: Element | null } | null {
  const first = line.findIndex((n) => !(n.nodeType === 3 && !n.textContent?.trim()))
  if (first < 0) return null
  const lead = line[first].nodeType === 1 && /^(STRONG|CODE)$/.test((line[first] as Element).tagName) ? (line[first] as Element) : null
  if (lead) {
    const next = line[first + 1]
    const m = next?.nodeType === 3 ? /^\s*(→|—|–|:|=|-\s)\s*/.exec(next.textContent ?? '') : null
    if (m) return { node: next as Text, offset: m[0].length, lead }
  }
  for (const n of line) {
    if (n.nodeType !== 3) continue
    const m = /\s→\s*/.exec(n.textContent ?? '')
    if (m) return { node: n as Text, offset: m.index + m[0].length, lead: null }
  }
  return null
}

// ---- which units are in play ---------------------------------------------------------------
/**
 * The units concealed at an intensity. A derived answer that contains explicit units leaves the
 * work to them until Exam, where it conceals the whole answer and they step aside.
 */
export function unitsAt(items: RecallItem[], intensity: RecallIntensity): RecallItem[] {
  const active = items.filter((i) => RANK[i.level] <= RANK[intensity])
  const covered = new Set(active.flatMap((i) => i.covers))
  return active.filter((i) => !covered.has(i.id))
}

export const GUIDED_MAX_PROMPTS = 12
const BASE: Record<RecallPriority, number> = { trap: 3, pyq: 3, high: 2, normal: 1 }

/**
 * The prompts for one Guided Revision, in the order of the notes. Earlier answers steer the
 * choice — nothing else does, and no score is kept:
 *   missed before (same content)   → more likely to be asked
 *   PYQ / trap                      → more likely to be asked
 *   known twice running             → less likely to be asked
 * An attempt recorded against different content (the notes were edited since) is ignored.
 */
export function selectPrompts(items: RecallItem[], attempts: Iterable<RecallAttempt>, intensity: RecallIntensity, max = GUIDED_MAX_PROMPTS): RecallItem[] {
  const pool = unitsAt(items, intensity)
  const hashes = new Map(pool.map((i) => [i.id, i.contentHash]))
  const history = new Map<string, RecallAttempt[]>()
  for (const a of attempts) {
    if (a.outcome === 'skipped' || hashes.get(a.recallUnitId) !== a.contentHash) continue
    const list = history.get(a.recallUnitId) ?? []
    list.push(a)
    history.set(a.recallUnitId, list)
  }
  const scored = pool.map((item, index) => {
    const past = (history.get(item.id) ?? []).sort((a, b) => (a.attemptedAt < b.attemptedAt ? 1 : -1)) // newest first
    const misses = past.slice(0, 3).filter((a) => a.outcome === 'missed').length
    const settled = past.length >= 2 && past[0].outcome === 'knew' && past[1].outcome === 'knew'
    return { item, index, score: BASE[item.priority] + 2 * misses - (settled ? 1.5 : 0) + (past.length ? 0 : 0.25) }
  })
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, max)
    .sort((a, b) => a.index - b.index)
    .map((x) => x.item)
}

/** A prompt as shown: the reverse of a two-column row on some revisions, chosen from the ids alone. */
export function promptOf(item: RecallItem, ordinal: number): { cueHtml: string; cueLabel: string; answerHtml: string; inline: boolean } {
  if (item.reverse && item.reversePromptAllowed && hash32(`${item.id}|${ordinal}`) % 3 === 0) return { ...item.reverse, inline: false }
  return { cueHtml: item.cueHtml, cueLabel: item.cueLabel, answerHtml: item.answerHtml, inline: item.inline }
}

/** The contract's RecallUnit: the item without what is only there to present it. */
export const toRecallUnit = ({ id, target, structuralPath, kind, priority, cueAnchorIds, answerAnchorIds, reversePromptAllowed, contentHash }: RecallItem): RecallUnit => ({ id, target, structuralPath, kind, priority, cueAnchorIds, answerAnchorIds, reversePromptAllowed, contentHash })
