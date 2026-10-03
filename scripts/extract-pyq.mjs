// Builds <subject>/pyq.json from a Source Pack's "PYQ Demand Map" sections.
// Only what the pack records is extracted: question IDs grouped by the pack's own
// cluster labels, plus its "Demand synthesis" notes. Nothing is inferred.
//
//   node scripts/extract-pyq.mjs <source-pack.md> <content/stage/subject>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [, , packPath, subjectDir] = process.argv
if (!packPath || !subjectDir) {
  console.error('usage: node scripts/extract-pyq.mjs <source-pack.md> <content/stage/subject>')
  process.exit(1)
}

// taxonomy id → chapter id, from chapter frontmatter
const byTaxonomy = new Map()
for (const f of readdirSync(join(subjectDir, 'chapters'))) {
  if (!f.endsWith('.md')) continue
  const m = readFileSync(join(subjectDir, 'chapters', f), 'utf8').match(/^taxonomy:\s*(.+)$/m)
  if (m) for (const t of m[1].split(',')) byTaxonomy.set(t.trim(), f.replace(/\.md$/, ''))
}

const ID = /(?:UPSC-CSE|UPPCS)-\d{4}-GS\d-Q\d+/g
// full IDs, plus short forms such as `Q106` that inherit the exam/year of the ID before them
const ID_OR_SHORT = /((?:UPSC-CSE|UPPCS)-\d{4}-GS\d-)Q(\d+)|`Q(\d+)`/g
const strip = (s) =>
  s
    .replace(/\[[^\]]*\]\([^)]*\)/g, '') // citation links
    .replace(/\b(?:PRE|BOTH)[-_A-Z]*__[A-Za-z0-9_-]+…?/g, '') // source tokens
    .replace(/:chatgpt-content-reference\{[^}]*\}/g, '')
    .replace(/[ \t]+$/gm, '')
const cleanLabel = (s) =>
  s
    .replace(ID, '')
    .replace(/[`*|]/g, '')
    .replace(/\s*[:—–-]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

function clusters(block) {
  const out = new Map()
  let label = 'General'
  const add = (l, ids) => {
    if (!ids.length) return
    const key = l || 'General'
    out.set(key, [...new Set([...(out.get(key) ?? []), ...ids])])
  }
  for (const raw of block.split('\n')) {
    const line = raw.trim()
    if (!line || /^\|?\s*-{3}/.test(line)) continue
    const ids = []
    let prefix = ''
    for (const m of line.matchAll(ID_OR_SHORT)) {
      if (m[1]) {
        prefix = m[1]
        ids.push(m[1] + 'Q' + m[2])
      } else if (prefix) ids.push(prefix + 'Q' + m[3])
    }
    if (line.startsWith('|')) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
      add(cleanLabel(cells[0]), ids)
      continue
    }
    const bold = line.match(/^[-*]?\s*\*\*(.+?)\*\*/)
    if (bold) {
      const l = cleanLabel(bold[1])
      if (ids.length) add(l, ids)
      else if (!/^demand/i.test(l)) label = l // heading line: the ID lines after it belong to it
      continue
    }
    const lead = line.match(/^[-*]?\s*([A-Z][^`:]{3,60}):\s*`/)
    add(lead ? cleanLabel(lead[1]) : label, ids)
  }
  for (const k of [...out.keys()]) if (/^canonical|integrity|editable|^semantic-review/i.test(k)) out.delete(k)
  return [...out.entries()].map(([label, ids]) => ({ label, ids: ids.sort() }))
}

const pack = readFileSync(packPath, 'utf8').replace(/\r\n/g, '\n')
const result = { source: packPath.replace(/\\/g, '/'), chapters: {} }
for (const part of pack.split(/\n(?=# [^\n]*Source Pack)/)) {
  const tax = part.match(/\*\*taxonomy_id:\*\*\s*`?([\w-]+)`?/)
  const chapter = tax && byTaxonomy.get(tax[1])
  if (!chapter) continue // parent aggregates and unmapped packs are skipped
  const demand = part.match(/\n## 2\. PYQ Demand Map\n([\s\S]*?)(?=\n## 3\.)/)
  if (!demand) continue
  const sec = (name) => demand[1].match(new RegExp(`### ${name}\\n([\\s\\S]*?)(?=\\n### |$)`))?.[1] ?? ''
  result.chapters[chapter] = {
    upsc: clusters(sec('UPSC')),
    uppcs: clusters(sec('UPPCS')),
    synthesis: strip(sec('Demand synthesis')).trim(),
  }
}

writeFileSync(join(subjectDir, 'pyq.json'), JSON.stringify(result, null, 1) + '\n')
for (const [c, d] of Object.entries(result.chapters)) {
  const n = (x) => new Set(x.flatMap((k) => k.ids)).size
  console.log(`${c.padEnd(30)} UPSC ${String(n(d.upsc)).padStart(3)}  UPPCS ${String(n(d.uppcs)).padStart(3)}  clusters ${d.upsc.length + d.uppcs.length}`)
}
const missing = [...new Set(byTaxonomy.values())].filter((c) => !result.chapters[c])
if (missing.length) console.log(`\nNo PYQ map found for: ${missing.join(', ')}`)
console.log(`\n${Object.keys(result.chapters).length} chapters → ${join(subjectDir, 'pyq.json')}`)
