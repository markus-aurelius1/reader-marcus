// Content contract check for every subject under /content:
//  - each taxonomy id in subject.json is owned by exactly one chapter
//  - every chapter listed in subject.json exists, and no chapter file is unlisted
//  - section ids are unique inside a chapter
//  - every cross-link resolves — [..](@chapter#section) inside the subject,
//    [..](@stage/subject/chapter#section) across subjects, and `related:` frontmatter.
//    A link into a subject that is not in the library yet is reported as pending, not as an error.
//  - recall / emphasis markers are balanced
//  - PYQ files: every ID in pyq.json is canonical and listed once per demand label; every flag in
//    pyq-meta.json is on an ID the subject lists; every section link names a chapter, a demand
//    label and section ids that exist; one-liners (when present) belong to listed IDs
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const slug = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
let errors = 0
const fail = (m) => (errors++, console.log('  ✗ ' + m))
const dirs = (p) => readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)

// pass 1 — read every subject, so links can be checked across them
const subjects = new Map() // "stage/subject" → { meta, files, chapters: Map(id → { src, ids }) }
for (const stage of dirs('content'))
  for (const subj of dirs(join('content', stage))) {
    const dir = join('content', stage, subj)
    if (!existsSync(join(dir, 'subject.json'))) continue
    const meta = JSON.parse(readFileSync(join(dir, 'subject.json'), 'utf8'))
    const files = readdirSync(join(dir, 'chapters')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
    const chapters = new Map()
    for (const c of files) {
      const src = readFileSync(join(dir, 'chapters', `${c}.md`), 'utf8').replace(/\r\n/g, '\n')
      const ids = []
      for (const m of src.matchAll(/^## (.+?)(?:\s*\{#([\w-]+)\})?\s*$/gm)) ids.push(m[2] || slug(m[1]))
      chapters.set(c, { src, ids })
    }
    const json = (name) => (existsSync(join(dir, name)) ? JSON.parse(readFileSync(join(dir, name), 'utf8')) : null)
    subjects.set(`${stage}/${subj}`, { meta, files, chapters, pyq: json('pyq.json'), pyqMeta: json('pyq-meta.json'), oneLiners: json('pyq-oneliners.json') })
  }

// same rules as src/lib/links.ts parseRef
const parseRef = (ref, from) => {
  const [path, sec] = ref.split('#')
  const seg = path.split('/').filter(Boolean)
  return seg.length >= 2 ? { subject: `${seg[0]}/${seg[1]}`, chapter: seg[2], sec } : { subject: from, chapter: seg[0], sec }
}

// pass 2 — per-subject contract
let pendingTotal = 0
const PYQ_ID = /^(UPSC-CSE|UPPCS)-\d{4}-[A-Z]+\d*-Q\d+$/
const allPyq = new Set()
for (const [key, { meta, files, chapters, pyq, pyqMeta, oneLiners }] of subjects) {
  console.log(`\n${key} — ${meta.title}`)
  const listed = meta.topics.flatMap((t) => t.chapters)
  for (const c of listed) if (!files.includes(c)) fail(`chapter listed but missing: ${c}.md`)
  for (const f of files) if (!listed.includes(f)) fail(`chapter file not listed in subject.json: ${f}.md`)

  const owners = new Map()
  let secCount = 0, recall = 0, words = 0, links = 0, cross = 0, pending = 0
  for (const [c, { src, ids }] of chapters) {
    const fm = src.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ''
    const field = (name) => fm.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1].split(',').map((s) => s.trim()).filter(Boolean) ?? []
    for (const t of field('taxonomy')) owners.set(t, [...(owners.get(t) ?? []), c])
    for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) fail(`${c}: duplicate section id "${id}"`)
    secCount += ids.length

    const refs = [...[...src.matchAll(/\]\(@([\w\-/]+(?:#[\w-]+)?)\)/g)].map((m) => m[1]), ...field('related').map((r) => r.replace(/^@/, ''))]
    for (const ref of refs) {
      const r = parseRef(ref, key)
      links++
      if (r.subject !== key) cross++
      const target = subjects.get(r.subject)
      if (!target) pending++
      else if (!r.chapter) continue // subject overview
      else if (!target.chapters.has(r.chapter)) fail(`${c}: cross-link to unknown chapter @${ref}`)
      else if (r.sec && !target.chapters.get(r.chapter).ids.includes(r.sec)) fail(`${c}: cross-link to unknown section @${ref}`)
    }

    recall += (src.match(/\{\{/g) ?? []).length
    words += src.split(/\s+/).length
    src.split('\n').forEach((line, i) => {
      if ((line.match(/\{\{/g) ?? []).length !== (line.match(/\}\}/g) ?? []).length) fail(`${c}:${i + 1} unbalanced {{ }}`)
      if ((line.match(/!!/g) ?? []).length % 2) fail(`${c}:${i + 1} unbalanced !! !!`)
      if ((line.match(/==/g) ?? []).length % 2) fail(`${c}:${i + 1} unbalanced == ==`)
    })
    if (!ids.length) fail(`${c}: no sections`)
  }
  for (const t of meta.taxonomy ?? []) {
    const o = owners.get(t) ?? []
    if (o.length !== 1) fail(`taxonomy node covered ${o.length}×: ${t}${o.length ? ' → ' + o.join(', ') : ''}`)
  }
  for (const t of owners.keys()) if (meta.taxonomy && !meta.taxonomy.includes(t)) fail(`chapter claims unknown taxonomy id: ${t}`)
  pendingTotal += pending

  // PYQ metadata
  const ids = new Set()
  const labels = new Map() // chapter → demand labels
  let clusters = 0
  for (const [c, d] of Object.entries(pyq?.chapters ?? {})) {
    if (!chapters.has(c)) fail(`pyq.json: unknown chapter "${c}"`)
    labels.set(c, new Set())
    for (const cl of [...d.upsc, ...d.uppcs]) {
      clusters++
      labels.get(c).add(cl.label)
      if (new Set(cl.ids).size !== cl.ids.length) fail(`pyq.json: ${c} "${cl.label}" lists an ID twice`)
      for (const id of cl.ids) {
        if (!PYQ_ID.test(id)) fail(`pyq.json: ${c}: not a canonical PYQ ID: ${id}`)
        ids.add(id)
        allPyq.add(id)
      }
    }
  }
  let flagged = 0, mapped = 0
  for (const [id, flag] of Object.entries(pyqMeta?.status ?? {})) {
    flagged++
    if (!ids.has(id)) fail(`pyq-meta.json: flag on an ID this subject does not list: ${id}`)
    if (flag.status && !['review-required', 'demand-only'].includes(flag.status)) fail(`pyq-meta.json: ${id}: unknown status "${flag.status}"`)
    if (!flag.status && !flag.dynamic) fail(`pyq-meta.json: ${id}: flag says nothing`)
  }
  for (const [c, map] of Object.entries(pyqMeta?.sections ?? {})) {
    if (!chapters.has(c)) { fail(`pyq-meta.json: unknown chapter "${c}"`); continue }
    for (const [label, secs] of Object.entries(map)) {
      mapped++
      if (!labels.get(c)?.has(label)) fail(`pyq-meta.json: ${c}: no demand label "${label}" in pyq.json`)
      for (const s of secs) if (!chapters.get(c).ids.includes(s)) fail(`pyq-meta.json: ${c}: unknown section "${s}"`)
    }
  }
  for (const id of Object.keys(oneLiners ?? {})) if (!ids.has(id)) fail(`pyq-oneliners.json: one-liner for an ID this subject does not list: ${id}`)
  console.log(`  ${files.length} chapters · ${secCount} sections · ${recall} recall items · ${links} cross-links (${cross} to other subjects${pending ? `, ${pending} pending` : ''}) · ~${words} words`)
  console.log(`  taxonomy: ${(meta.taxonomy ?? []).length} leaf nodes, ${[...owners.values()].filter((o) => o.length === 1).length} covered exactly once`)
  if (pyq) console.log(`  PYQs: ${ids.size} IDs in ${clusters} demand groups · ${mapped} groups linked to sections · ${flagged} flagged · ${Object.keys(oneLiners ?? {}).length} one-liners`)
}
console.log(`\nPYQ Hub: ${allPyq.size} unique canonical IDs across all subjects.`)
if (pendingTotal) console.log(`\n${pendingTotal} cross-link(s) point to subjects not added yet — shown as plain text until then.`)
console.log(errors ? `\n${errors} problem(s)` : '\nAll content checks passed.')
process.exit(errors ? 1 : 0)
