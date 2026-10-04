// Export of the CURRENT content (base notes + local edits + highlights) as a standalone
// HTML file or as Markdown in the same dialect the content files use.
import proseCss from '../styles/prose.css?inline'
import { availableKeys, stageTitle, type Chapter, type Subject } from './content'
import { highlightsBySection, secHtml, secTitle, useStore, type Override } from './store'
import { applyHighlights } from './highlight'
import { refHref, relink } from './links'
import type { Section } from './content'

/** Current section HTML: edits applied, highlights laid over. */
function current(o: Record<string, Override>, s: Section): string {
  const hs = highlightsBySection(useStore.getState().highlights)[s.key]
  return hs?.length ? applyHighlights(secHtml(o, s), hs).html : secHtml(o, s)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const fileBase = (subject: Subject, chapters: Chapter[]) =>
  `${subject.stage}-${subject.id}${chapters.length === 1 ? '-' + chapters[0].id : ''}`

export function exportHTML(subject: Subject, chapters: Chapter[], o: Record<string, Override>) {
  const title = `${stageTitle(subject.stage)} · ${subject.title}${chapters.length === 1 ? ' · ' + chapters[0].title : ''}`
  const here = location.href.split('#')[0]
  const subjects = new Set(availableKeys())
  const toc = chapters
    .map((c) => `<li><a href="#${c.id}">${esc(c.title)}</a></li>`)
    .join('')
  const body = chapters
    .map((c) => {
      const secs = c.sections
        .map((s) => {
          // inside the file → its own anchors; anywhere else → the reader this was exported from
          const html = relink(current(o, s), subject.key, (r) =>
            r.subjectKey === subject.key && chapters.some((x) => x.id === r.chapterId)
              ? `#${r.chapterId}${r.sectionId ? '--' + r.sectionId : ''}`
              : subjects.has(r.subjectKey) ? here + refHref(r) : null,
          )
          return `<section id="${c.id}--${s.id}"><h2>${esc(secTitle(o, s))}</h2>\n${html}\n</section>`
        })
        .join('\n')
      return `<article id="${c.id}"><p class="topic">${esc(c.topicTitle)}</p><h1>${esc(c.title)}</h1>\n${secs}\n</article>`
    })
    .join('\n')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#fff;--paper:#fff;--ink:#22211e;--ink-2:#5c5850;--ink-3:#8a857a;--line:#e4dfd4;--line-2:#efebe2;--accent:#2f4a7a;--accent-soft:#eaf0f8;--red:#b3261e;--hy:#7a4b00;--code:#f1ede4;
--hl-yellow:#ffe98a;--hl-green:#b9ebc0;--hl-blue:#bcdcff;--hl-pink:#ffc7dd;--trap-bg:#fdf1ef;--exc-bg:#fff6e5;--uppcs-bg:#eef4ec;--dyn-bg:#eef2f8;--verify-bg:#f6eefa;--flow-bg:#f4f2ec;--note-bg:#f4f2ec;
--serif:'Source Serif 4',Georgia,serif;--sans:Inter,system-ui,'Segoe UI',Roboto,sans-serif}
body{margin:0 auto;max-width:860px;padding:28px 20px 80px;background:var(--bg);color:var(--ink);font:15.5px/1.6 var(--sans)}
h1{font:600 30px/1.2 var(--serif);margin:48px 0 6px}
.topic{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:56px 0 0}
section>h2{font:600 21px/1.3 var(--serif);margin:34px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
nav{border:1px solid var(--line);border-radius:8px;padding:12px 18px;margin:20px 0}
nav a{color:var(--accent);text-decoration:none}
.bar{position:sticky;top:0;background:var(--bg);padding:8px 0;font-size:13px;color:var(--ink-2);border-bottom:1px solid var(--line-2)}
body.recall .rc:not(.shown){font-size:0;cursor:pointer}body.recall .rc:not(.shown)::before{content:'[ RECALL ]';font:600 11px/1.7 system-ui,sans-serif;letter-spacing:.08em;padding:0 .5em;border-radius:4px;background:#e6ecf5;color:#2f4a7a}
@media print{.bar,nav{display:none}body{max-width:none;padding:0}body.recall .rc:not(.shown){font-size:inherit}body.recall .rc:not(.shown)::before{content:none}}
${proseCss}
</style></head>
<body class="prose-root">
<div class="bar"><label><input type="checkbox" onchange="document.body.classList.toggle('recall',this.checked)"> Recall mode</label> · ${esc(title)} · exported ${new Date().toLocaleDateString()}</div>
${chapters.length > 1 ? `<nav><ol>${toc}</ol></nav>` : ''}
<main class="prose">
${body}
</main>
<script>document.addEventListener('click',function(e){var r=e.target.closest&&e.target.closest('.rc');if(r&&document.body.classList.contains('recall'))r.classList.toggle('shown')})</script>
</body></html>`
  download(`${fileBase(subject, chapters)}.html`, html, 'text/html')
}

// ---- HTML → Markdown (notes dialect) ---------------------------------------
function inline(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ')
  if (node.nodeType !== 1) return ''
  const el = node as Element
  const kids = () => [...el.childNodes].map(inline).join('')
  const wrap = (a: string, b = a) => {
    const t = kids()
    const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/)!
    return m[2] ? `${m[1]}${a}${m[2]}${b}${m[3]}` : t
  }
  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      return wrap('**')
    case 'EM':
    case 'I':
      return wrap('*')
    case 'S':
    case 'DEL':
      return wrap('~~')
    case 'CODE':
      return wrap('`')
    case 'BR':
      return '<br>'
    case 'MARK':
      return wrap(`<mark data-color="${el.getAttribute('data-color') ?? 'yellow'}">`, '</mark>')
    case 'A':
      return el.hasAttribute('data-xref')
        ? `[${kids()}](@${el.getAttribute('data-xref')})`
        : `[${kids()}](${el.getAttribute('href') ?? ''})`
    case 'SPAN':
      if (el.classList.contains('rc')) return wrap('{{', '}}')
      if (el.classList.contains('hy')) return wrap('==')
      if (el.classList.contains('red')) return wrap('!!')
      return kids()
    case 'P':
      return kids()
    default:
      return kids()
  }
}

function list(el: Element, depth: number): string {
  const ordered = el.tagName === 'OL'
  let i = 1
  const out: string[] = []
  for (const li of el.children) {
    if (li.tagName !== 'LI') continue
    const pad = '  '.repeat(depth)
    let text = ''
    const nested: string[] = []
    for (const c of li.childNodes) {
      if (c.nodeType === 1 && /^(UL|OL)$/.test((c as Element).tagName)) nested.push(list(c as Element, depth + 1))
      else text += inline(c)
    }
    out.push(`${pad}${ordered ? `${i++}.` : '-'} ${text.trim()}`)
    out.push(...nested)
  }
  return out.join('\n')
}

function table(el: Element): string {
  const rows = [...el.querySelectorAll('tr')].map((tr) =>
    [...tr.children].map((c) =>
      [...c.childNodes]
        .map(inline)
        .join('')
        .trim()
        .replace(/\|/g, '\\|'),
    ),
  )
  if (!rows.length) return ''
  const n = Math.max(...rows.map((r) => r.length))
  const line = (r: string[]) => `| ${Array.from({ length: n }, (_, i) => r[i] ?? '').join(' | ')} |`
  return [line(rows[0]), `|${' --- |'.repeat(n)}`, ...rows.slice(1).map(line)].join('\n')
}

function blocks(root: Element): string {
  const out: string[] = []
  for (const node of root.childNodes) {
    if (node.nodeType === 3) {
      if (node.textContent?.trim()) out.push(node.textContent.trim())
      continue
    }
    if (node.nodeType !== 1) continue
    const el = node as Element
    const tag = el.tagName
    if (/^H[1-6]$/.test(tag)) out.push(`${'#'.repeat(Math.max(3, +tag[1]))} ${inline(el).trim()}`)
    else if (tag === 'P') out.push(inline(el).trim())
    else if (tag === 'UL' || tag === 'OL') out.push(list(el, 0))
    else if (tag === 'TABLE') out.push(table(el))
    else if (tag === 'HR') out.push('---')
    else if (tag === 'BLOCKQUOTE') out.push(blocks(el).split('\n').map((l) => `> ${l}`.trimEnd()).join('\n'))
    else if (tag === 'DIV' && el.classList.contains('callout')) {
      const kind = (el.getAttribute('data-kind') ?? 'note').toUpperCase()
      const inner = blocks(el).split('\n')
      inner[0] = `[!${kind}] ${inner[0] ?? ''}`
      out.push(inner.map((l) => `> ${l}`.trimEnd()).join('\n'))
    } else if (el.querySelector('table')) out.push(table(el.querySelector('table')!))
    else out.push(blocks(el))
  }
  return out.filter(Boolean).join('\n\n')
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return blocks(doc.body)
}

export function chapterMarkdown(c: Chapter, o: Record<string, Override>): string {
  const head = `---\ntitle: ${c.title}\ntaxonomy: ${c.taxonomy.join(', ')}\n${c.related.length ? `related: ${c.related.join(', ')}\n` : ''}---\n`
  const secs = c.sections.map((s) => {
    const t = secTitle(o, s)
    return `## ${t} {#${s.id}}\n\n${htmlToMarkdown(current(o, s))}`
  })
  return `${head}\n${secs.join('\n\n')}\n`
}

export function exportMarkdown(subject: Subject, chapters: Chapter[], o: Record<string, Override>) {
  const text =
    chapters.length === 1
      ? chapterMarkdown(chapters[0], o)
      : chapters.map((c) => `<!-- ===== chapters/${c.id}.md ===== -->\n\n${chapterMarkdown(c, o)}`).join('\n\n')
  download(`${fileBase(subject, chapters)}.md`, text, 'text/markdown')
}
