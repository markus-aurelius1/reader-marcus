// Notes dialect → HTML. One chapter = one markdown file; `## ` starts a section.
//
//   {{answer}}          recall span (blurred in Recall Mode)
//   ==text==            high-yield emphasis
//   !!text!!            red keyword
//   `Art. 368`          article / act anchor
//   [label](@chapter#section)   cross-link — same subject, or @stage/subject/chapter#section (see links.ts)
//   > [!TRAP] …         callout. Kinds: trap, exc, uppcs, dyn, verify, flow, note
import { marked } from 'marked'
import { relink } from './links'

export interface RawSection {
  id: string
  title: string
  html: string
}
export interface RawChapter {
  meta: Record<string, string>
  sections: RawSection[]
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

marked.use({
  gfm: true,
  renderer: {
    blockquote(token) {
      const inner = this.parser.parse(token.tokens)
      const m = inner.match(/^\s*<p>\[!(\w+)\]\s*(<\/p>)?/)
      if (!m) return `<blockquote>${inner}</blockquote>\n`
      const rest = inner.replace(m[0], m[2] ? '' : '<p>')
      return `<div class="callout" data-kind="${m[1].toLowerCase()}">${rest}</div>\n`
    },
    link(token) {
      const text = this.parser.parseInline(token.tokens)
      if (token.href.startsWith('@')) return `<a data-xref="${token.href.slice(1)}">${text}</a>`
      return `<a href="${token.href}" target="_blank" rel="noopener">${text}</a>`
    },
  },
})

export function renderBody(md: string, subjectKey: string): string {
  let html = marked.parse(md, { async: false }) as string
  html = html
    .replace(/\{\{(.+?)\}\}/g, '<span class="rc">$1</span>')
    .replace(/==(.+?)==/g, '<span class="hy">$1</span>')
    .replace(/!!(.+?)!!/g, '<span class="red">$1</span>')
  html = relink(html, subjectKey)
  return html.trim()
}

export function parseChapter(src: string, subjectKey: string): RawChapter {
  const meta: Record<string, string> = {}
  let body = src.replace(/\r\n/g, '\n')
  const fm = body.match(/^---\n([\s\S]*?)\n---\n/)
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const i = line.indexOf(':')
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
    body = body.slice(fm[0].length)
  }
  const sections: RawSection[] = []
  let cur: { id: string; title: string; lines: string[] } | null = null
  const flush = () => {
    if (cur) sections.push({ id: cur.id, title: cur.title, html: renderBody(cur.lines.join('\n'), subjectKey) })
  }
  for (const line of body.split('\n')) {
    const m = line.match(/^## (.+?)(?:\s*\{#([\w-]+)\})?\s*$/)
    if (m) {
      flush()
      cur = { id: m[2] || slug(m[1]), title: m[1].trim(), lines: [] }
    } else if (cur) cur.lines.push(line)
  }
  flush()
  return { meta, sections }
}
