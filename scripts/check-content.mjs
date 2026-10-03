// Content contract check for every subject under /content:
//  - each taxonomy id in subject.json is owned by exactly one chapter
//  - every chapter listed in subject.json exists, and no chapter file is unlisted
//  - section ids are unique inside a chapter
//  - every cross-reference [..](@chapter#section) resolves
//  - recall / emphasis markers are balanced
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const slug = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
let errors = 0
const fail = (m) => (errors++, console.log('  ✗ ' + m))

for (const stage of readdirSync('content', { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const subj of readdirSync(join('content', stage.name), { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const dir = join('content', stage.name, subj.name)
    if (!existsSync(join(dir, 'subject.json'))) continue
    const meta = JSON.parse(readFileSync(join(dir, 'subject.json'), 'utf8'))
    console.log(`\n${stage.name}/${subj.name} — ${meta.title}`)
    const listed = meta.topics.flatMap((t) => t.chapters)
    const files = readdirSync(join(dir, 'chapters')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
    for (const c of listed) if (!files.includes(c)) fail(`chapter listed but missing: ${c}.md`)
    for (const f of files) if (!listed.includes(f)) fail(`chapter file not listed in subject.json: ${f}.md`)

    const owners = new Map()
    const sections = new Map()
    const xrefs = []
    let secCount = 0, recall = 0, words = 0
    for (const c of files) {
      const src = readFileSync(join(dir, 'chapters', `${c}.md`), 'utf8').replace(/\r\n/g, '\n')
      const tax = src.match(/^taxonomy:\s*(.+)$/m)?.[1].split(',').map((s) => s.trim()).filter(Boolean) ?? []
      for (const t of tax) owners.set(t, [...(owners.get(t) ?? []), c])
      const ids = new Set()
      for (const m of src.matchAll(/^## (.+?)(?:\s*\{#([\w-]+)\})?\s*$/gm)) {
        const id = m[2] || slug(m[1])
        if (ids.has(id)) fail(`${c}: duplicate section id "${id}"`)
        ids.add(id)
      }
      sections.set(c, ids)
      secCount += ids.size
      for (const m of src.matchAll(/\]\(@([\w-]+)(?:#([\w-]+))?\)/g)) xrefs.push({ from: c, ch: m[1], sec: m[2] })
      recall += (src.match(/\{\{/g) ?? []).length
      words += src.split(/\s+/).length
      src.split('\n').forEach((line, i) => {
        if ((line.match(/\{\{/g) ?? []).length !== (line.match(/\}\}/g) ?? []).length) fail(`${c}:${i + 1} unbalanced {{ }}`)
        if ((line.match(/!!/g) ?? []).length % 2) fail(`${c}:${i + 1} unbalanced !! !!`)
        if ((line.match(/==/g) ?? []).length % 2) fail(`${c}:${i + 1} unbalanced == ==`)
      })
      if (!ids.size) fail(`${c}: no sections`)
    }
    for (const t of meta.taxonomy ?? []) {
      const o = owners.get(t) ?? []
      if (o.length !== 1) fail(`taxonomy node covered ${o.length}×: ${t}${o.length ? ' → ' + o.join(', ') : ''}`)
    }
    for (const t of owners.keys()) if (meta.taxonomy && !meta.taxonomy.includes(t)) fail(`chapter claims unknown taxonomy id: ${t}`)
    for (const x of xrefs) {
      if (!sections.has(x.ch)) fail(`${x.from}: cross-reference to unknown chapter @${x.ch}`)
      else if (x.sec && !sections.get(x.ch).has(x.sec)) fail(`${x.from}: cross-reference to unknown section @${x.ch}#${x.sec}`)
    }
    console.log(`  ${files.length} chapters · ${secCount} sections · ${recall} recall items · ${xrefs.length} cross-references · ~${words} words`)
    console.log(`  taxonomy: ${(meta.taxonomy ?? []).length} leaf nodes, ${[...owners.values()].filter((o) => o.length === 1).length} covered exactly once`)
  }
}
console.log(errors ? `\n${errors} problem(s)` : '\nAll content checks passed.')
process.exit(errors ? 1 : 0)
