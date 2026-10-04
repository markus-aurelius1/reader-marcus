// Builds <subject>/pyq.json from a Source Pack's "PYQ Demand Map" sections.
// Only what the pack records is extracted: question IDs grouped by the pack's own
// cluster labels, plus its "Demand synthesis" notes. Nothing is inferred.
//
// Two pack layouts are understood:
//   leaf packs   "# … Source Pack" with **taxonomy_id** and "## 2. PYQ Demand Map" → "### UPSC"
//   topic packs  "## … Topic Source Pack" with a child-subtopic ledger (name | taxonomy_id) and
//                "### 3. PYQ Demand Map" → "#### A. <child>" → "##### UPSC"
//
//   node scripts/extract-pyq.mjs <source-pack.md> <content/stage/subject>
//
// The hub's review / demand-only flags and its demand label → section links are not derived here:
// they are curated in <subject>/pyq-meta.json, which this script never touches. After re-running
// it, `npm run check` reports any label or ID in pyq-meta.json that no longer exists.
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
// full IDs, plus the short forms packs use after one: `Q106`, "Q072, Q101", `2017-Q040`,
// and year-led rows such as "2019 → `Q066, Q143`" (exam taken from the block being read)
const TOKEN = /((?:UPSC-CSE|UPPCS)-)(\d{4})(-GS\d-)Q(\d+)|\b(\d{4})-Q(\d+)|(?<![\w-])Q(\d{2,3})\b/g
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
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s*[:—–-]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
const slug = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function clusters(block, exam) {
  const out = new Map()
  let label = 'General'
  const add = (l, ids) => {
    if (!ids.length) return
    const key = !l || /^canonical (semantic set|ids?$)/i.test(l) || /^\d{4}\s+Q\d+$/.test(l) ? 'General' : l
    out.set(key, [...new Set([...(out.get(key) ?? []), ...ids])])
  }
  let skip = false // under a "Demand synthesis" sub-heading: prose, not demand
  for (const raw of block.split('\n')) {
    const line = raw.trim()
    if (!line || /^\|?\s*-{3}/.test(line)) continue
    const head = line.match(/^#{3,6}\s+(.+)$/) // a sub-heading inside the exam block names a cluster
    if (head) {
      skip = /^demand/i.test(head[1])
      if (!skip) label = cleanLabel(head[1]) || 'General'
      continue
    }
    if (skip) continue
    const ids = []
    let pre = null // [exam, year, paper] carried from the last full ID on the line
    // year-led rows: "2019 → Q066", "| 2011 Q003 |", "- 2019 Q043 →"
    const lead = line.match(/^(\d{4})\s*→/) ?? line.match(/^[|*-]?\s*(\d{4})\s+Q\d{2,3}\b/)
    if (lead && exam) pre = [exam, lead[1], '-GS1-']
    for (const m of line.matchAll(TOKEN)) {
      if (m[1]) pre = [m[1], m[2], m[3]]
      else if (!pre) continue
      else if (m[5]) pre = [pre[0], m[5], pre[2]]
      ids.push(`${pre[0]}${pre[1]}${pre[2]}Q${m[4] ?? m[6] ?? m[7]}`)
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
      // heading line: the ID lines after it belong to it (an indented bold line continues a list item)
      else if (!/^demand/i.test(l) && !/^\s+\*\*/.test(raw)) label = l
      continue
    }
    const named = line.match(/^[-*]?\s*([A-Z][^`:]{3,60}):\s*`/)
    add(named ? cleanLabel(named[1]) : label, ids)
  }
  // audit notes are not demand: integrity remarks, de-duplication pointers, rejected / cancelled records
  for (const k of [...out.keys()]) if (/^canonical|integrity|editable|^semantic-review|^semantic de-?dup|^rejected/i.test(k)) out.delete(k)
  return [...out.entries()].map(([label, ids]) => ({ label, ids: ids.sort() }))
}

const pack = readFileSync(packPath, 'utf8').replace(/\r\n/g, '\n')
const result = { source: packPath.replace(/[\\]/g, '/'), chapters: {} }
const put = (chapter, entry) => {
  const cur = result.chapters[chapter]
  // a chapter that owns several taxonomy nodes collects all of their demand
  result.chapters[chapter] = cur
    ? { upsc: [...cur.upsc, ...entry.upsc], uppcs: [...cur.uppcs, ...entry.uppcs], synthesis: [cur.synthesis, entry.synthesis].filter(Boolean).join('\n\n') }
    : entry
}
const entry = (body, h) => {
  // an exam heading may carry a suffix ("UPSC — canonical demand"); the synthesis may sit one level deeper
  const sec = (name, lv = h) => body.match(new RegExp(`(?:^|[\\n])${lv} ${name}\\b[^\\n]*[\\n]([^]*?)(?=[\\n]#{2,${lv.length}} |$)`))?.[1] ?? ''
  const synthesis = sec('Demand synthesis') || sec('Demand synthesis', h + '#')
  return { upsc: clusters(sec('UPSC'), 'UPSC-CSE-'), uppcs: clusters(sec('UPPCS'), 'UPPCS-'), synthesis: strip(synthesis).replace(/\n---\s*$/, '').trim() }
}

// leaf packs
for (const part of pack.split(/\n(?=# [^\n]*Source Pack)/)) {
  const tax = part.match(/\*\*taxonomy_id:\*\*\s*`?([\w-]+)`?/)
  const chapter = tax && byTaxonomy.get(tax[1])
  if (!chapter) continue // parent aggregates and unmapped packs are skipped
  const demand = part.match(/\n## 2\. PYQ Demand Map\n([\s\S]*?)(?=\n## 3\.)/)
  if (demand) put(chapter, entry(demand[1], '###'))
}

// topic packs: children are named in the ledger, then mapped A/B/C… in the demand map
// (a topic pack may also be headed "## <code> — <topic> — Source Pack v01")
const plain = (s) => slug(s.replace(/['’]/g, ''))
for (const part of pack.split(/\n(?=## [^\n]*(?:Topic Source Pack|— Source Pack v\d))/).slice(1)) {
  const byName = new Map()
  for (const row of part.matchAll(/^\|\s*([^|`]+?)\s*\|\s*`([\w.-]+)`\s*\|/gm)) {
    // the ledger may abbreviate an id as `...-suffix`
    const id = row[2].startsWith('...') ? [...byTaxonomy.keys()].find((t) => t.endsWith(row[2].slice(3))) : row[2]
    if (id && byTaxonomy.has(id)) byName.set(slug(row[1]), byTaxonomy.get(id))
  }
  // the demand map is "### 3." in most packs; it may be numbered and levelled differently
  const demand = part.match(/\n(#{2,3}) \d\. PYQ Demand Map\n([\s\S]*?)(?=\n\1 \d\. )/)
  if (!demand) continue
  // a ledger without taxonomy ids: the child is the chapter whose taxonomy id ends with the child's name
  const topic = part.match(/\*\*Topic ID:\*\*\s*`([\w-]+)`/)?.[1]
  const owner = (name) => byName.get(slug(name)) ?? (topic ? byTaxonomy.get(`${topic}-${plain(name)}`) : undefined)
  // the child heading sits at any level (## A. … #### A.); its exam headings are the first UPSC / UPPCS heading below it
  let last
  for (const child of demand[2].split(/\n(?=#{2,4} [A-Z]\. )/)) {
    const name = child.match(/^#{2,4} [A-Z]\. (.+)$/m)
    if (!name) continue
    const exam = child.match(/^(#{3,6}) (?:UPSC|UPPCS)\b/m)
    // a trailing "Dynamic-only evidence" child has no node of its own: its IDs stay with the child before it
    const dynamicOnly = /^dynamic-only/i.test(name[1])
    const chapter = dynamicOnly ? last : owner(name[1])
    if (!chapter) continue
    last = chapter
    if (exam) put(chapter, entry(child, exam[1]))
    else {
      // no exam headings (ID tables): the exam is read from each ID
      const of = (re) => clusters(child.split('\n').filter((l) => re.test(l)).join('\n'), '').map((c) => (dynamicOnly ? { ...c, label: 'Dynamic-only evidence' } : c))
      put(chapter, { upsc: of(/UPSC-CSE-/), uppcs: of(/UPPCS-/), synthesis: '' })
    }
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
