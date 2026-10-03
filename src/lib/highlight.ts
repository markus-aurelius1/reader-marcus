// Highlights are stored separately from section content and anchored to it at render time.
//
// An anchor is a position in the section's "text stream": all text of the section with
// whitespace removed. That stream is identical for the original markdown HTML and for the
// editor's re-serialised HTML, so a highlight keeps its place across edit / reset / sync.
// If the offsets no longer match (text was edited), the quoted text is searched for; if it is
// gone, the highlight is reported as unplaced instead of being attached to the wrong words.
export const COLORS = ['yellow', 'green', 'blue', 'pink'] as const
export type Color = (typeof COLORS)[number]

export interface Highlight {
  id: string
  sectionKey: string
  color: Color
  start: number // offsets in the whitespace-free text stream
  end: number
  text: string // the highlighted words, as displayed
  before: string // a little preceding text, to pick the right occurrence
  createdAt: number
  updatedAt: number
  deviceId?: string
  deleted?: boolean
}

export const newHid = () => 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const squash = (s: string) => s.replace(/\s+/g, '')
const isSpace = (c: string) => c === ' ' || c === String.fromCharCode(160) || c === String.fromCharCode(9)

interface Pos {
  node: Text
  offset: number
}

/** Every non-whitespace character of `root`, in order, with its DOM position. */
function stream(root: Node): { text: string; pos: Pos[] } {
  const doc = root.ownerDocument ?? (root as Document)
  const w = doc.createTreeWalker(root, 4 /* SHOW_TEXT */)
  const pos: Pos[] = []
  let text = ''
  while (w.nextNode()) {
    const node = w.currentNode as Text
    const d = node.data
    for (let i = 0; i < d.length; i++) {
      if (/\s/.test(d[i])) continue
      text += d[i]
      pos.push({ node, offset: i })
    }
  }
  return { text, pos }
}

/** Stream offset of a DOM boundary point. */
function offsetOf(root: Node, container: Node, offset: number): number {
  const doc = root.ownerDocument!
  const r = doc.createRange()
  r.selectNodeContents(root)
  r.setEnd(container, offset)
  return squash(r.toString()).length
}

export function rangeOffsets(root: Element, range: Range) {
  const start = offsetOf(root, range.startContainer, range.startOffset)
  const end = offsetOf(root, range.endContainer, range.endOffset)
  return { start, end }
}

/** Extent of an existing rendered highlight, read back from its <mark> elements. */
export function markExtent(root: Element, hid: string) {
  const marks = root.querySelectorAll(`mark[data-hid="${hid}"]`)
  if (!marks.length) return null
  const first = marks[0]
  const last = marks[marks.length - 1]
  const start = offsetOf(root, first, 0)
  const end = offsetOf(root, last, last.childNodes.length)
  return { start, end }
}

export function marksInRange(range: Range, root: Element): string[] {
  const ids = new Set<string>()
  root.querySelectorAll('mark[data-hid]').forEach((m) => {
    if (range.intersectsNode(m)) ids.add(m.getAttribute('data-hid')!)
  })
  return [...ids]
}

/** Where a highlight sits in `text` (a text stream), or null when its words are no longer there. */
export function anchor(text: string, h: Pick<Highlight, 'start' | 'text' | 'before'>): { start: number; end: number } | null {
  const q = squash(h.text)
  if (!q) return null
  if (text.startsWith(q, h.start)) return { start: h.start, end: h.start + q.length }
  const ctx = squash(h.before)
  let best = -1
  let bestScore = -1
  for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + 1)) {
    // prefer the occurrence preceded by the same words, then the one nearest the old position
    let ctxLen = 0
    while (ctxLen < ctx.length && ctxLen < i && text[i - 1 - ctxLen] === ctx[ctx.length - 1 - ctxLen]) ctxLen++
    const score = ctxLen * 1e6 - Math.abs(i - h.start)
    if (best < 0 || score > bestScore) {
      best = i
      bestScore = score
    }
  }
  return best < 0 ? null : { start: best, end: best + q.length }
}

function parse(html: string): HTMLElement {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body
}

export const textStream = (html: string) => stream(parse(html)).text

/** Section HTML with the highlights wrapped in <mark>. Returns the ids that could not be placed. */
export function applyHighlights(html: string, hs: Highlight[]): { html: string; unplaced: string[] } {
  const live = hs.filter((h) => !h.deleted)
  if (!live.length) return { html, unplaced: [] }
  const body = parse(html)
  const { text, pos } = stream(body)
  const unplaced: string[] = []
  const taken = new Uint8Array(pos.length)
  // Plan every wrap first (positions refer to the untouched DOM), then apply them from the end
  // of each text node backwards so earlier offsets stay valid.
  const ops = new Map<Text, { from: number; to: number; h: Highlight }[]>()
  for (const h of [...live].sort((x, y) => x.createdAt - y.createdAt)) {
    const a = anchor(text, h)
    if (!a) {
      unplaced.push(h.id)
      continue
    }
    let cur: { from: number; to: number; h: Highlight } | null = null
    let curNode: Text | null = null
    for (let i = a.start; i < a.end; i++) {
      if (taken[i]) {
        cur = null // an earlier highlight owns this character
        continue
      }
      taken[i] = 1
      const p = pos[i]
      if (cur && curNode === p.node) cur.to = p.offset + 1
      else {
        // spaces between highlighted words belong to the highlight
        if (cur && curNode) while (cur.to < curNode.data.length && isSpace(curNode.data[cur.to])) cur.to++
        let from = p.offset
        if (i > a.start) while (from > 0 && isSpace(p.node.data[from - 1])) from--
        cur = { from, to: p.offset + 1, h }
        curNode = p.node
        if (!ops.has(p.node)) ops.set(p.node, [])
        ops.get(p.node)!.push(cur)
      }
    }
  }
  for (const [node, list] of ops) {
    for (const op of list.sort((x, y) => y.from - x.from)) {
      if (op.to < node.data.length) node.splitText(op.to)
      const target = op.from > 0 ? node.splitText(op.from) : node
      const mark = body.ownerDocument.createElement('mark')
      mark.setAttribute('data-hid', op.h.id)
      mark.setAttribute('data-color', op.h.color)
      target.parentNode!.insertBefore(mark, target)
      mark.appendChild(target)
    }
  }
  return { html: body.innerHTML, unplaced }
}

export interface FoundMark {
  hid: string
  color: Color
  start: number
  end: number
  text: string
  before: string
}

/** Split editor HTML into content without <mark>s and the highlights those marks describe. */
export function extractMarks(html: string): { clean: string; marks: FoundMark[] } {
  if (!html.includes('<mark')) return { clean: html, marks: [] }
  const body = parse(html)
  const full = stream(body).text
  const byId = new Map<string, FoundMark>()
  body.querySelectorAll('mark').forEach((m) => {
    const hid = m.getAttribute('data-hid') || newHid()
    const start = offsetOf(body, m, 0)
    const end = offsetOf(body, m, m.childNodes.length)
    if (end <= start) return
    const prev = byId.get(hid)
    if (prev) {
      prev.start = Math.min(prev.start, start)
      prev.end = Math.max(prev.end, end)
      prev.text += (/^\s|^[,.;:)]/.test(m.textContent ?? '') || /\s$/.test(prev.text) ? '' : ' ') + (m.textContent ?? '')
    } else {
      byId.set(hid, { hid, color: (m.getAttribute('data-color') as Color) || 'yellow', start, end, text: m.textContent ?? '', before: '' })
    }
  })
  body.querySelectorAll('mark').forEach((m) => {
    const parent = m.parentNode!
    while (m.firstChild) parent.insertBefore(m.firstChild, m)
    parent.removeChild(m)
  })
  body.normalize()
  const marks = [...byId.values()].map((m) => ({ ...m, before: full.slice(Math.max(0, m.start - 24), m.start) }))
  return { clean: body.innerHTML, marks }
}

/** Serialise a live section body, dropping transient reader state. */
export function cleanHTML(root: Element): string {
  const c = root.cloneNode(true) as Element
  c.querySelectorAll('.rc.shown').forEach((e) => e.classList.remove('shown'))
  return c.innerHTML
}
