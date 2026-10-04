// End-to-end regression against real production builds in headless Chrome.
//   node scripts/e2e.mjs            (needs Chrome or Edge; set CHROME_PATH to override)
// Builds twice: the normal build (reader, migration, print/PDF, offline) and a build wired to
// scripts/mock-cloud.mjs (two browser profiles acting as two devices). Output → e2e-out/.
import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const OUT = resolve('e2e-out')
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && existsSync(p))
if (!CHROME) throw new Error('No Chrome/Edge found; set CHROME_PATH')
const P = { local: 4331, sync: 4332, cloud: 4320 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const errors = []
let group = ''
const check = (name, ok, detail = '') => {
  results.push({ group, name, ok: !!ok })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok ? '' : '  ← ' + JSON.stringify(detail)}`)
}
const section = (g) => console.log(`\n${(group = g)}`)

// ---- builds + servers -------------------------------------------------------
const rebuild = !process.argv.includes('--no-build') // --no-build reuses e2e-out/dist-*
rmSync(rebuild ? OUT : join(OUT, 'downloads'), { recursive: true, force: true })
mkdirSync(join(OUT, 'downloads'), { recursive: true })
if (rebuild) {
  console.log('building…')
  const clean = { ...process.env, VITE_SYNC_MOCK: '', VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_PROJECT_ID: '', VITE_FIREBASE_APP_ID: '' }
  execSync('npx vite build --outDir e2e-out/dist-local', { stdio: 'ignore', env: clean })
  execSync('npx vite build --outDir e2e-out/dist-sync', { stdio: 'ignore', env: { ...clean, VITE_SYNC_MOCK: `http://localhost:${P.cloud}` } })
}
const procs = [
  spawn('node', ['scripts/mock-cloud.mjs', String(P.cloud)], { stdio: 'ignore' }),
  spawn('npx', ['vite', 'preview', '--outDir', 'e2e-out/dist-local', '--port', String(P.local), '--strictPort'], { stdio: 'ignore', shell: true }),
  spawn('npx', ['vite', 'preview', '--outDir', 'e2e-out/dist-sync', '--port', String(P.sync), '--strictPort'], { stdio: 'ignore', shell: true }),
]
const stop = () => procs.forEach((p) => { try { process.platform === 'win32' ? execSync(`taskkill /pid ${p.pid} /T /F`, { stdio: 'ignore' }) : p.kill() } catch {} })
process.on('exit', stop)
for (const port of [P.local, P.sync, P.cloud]) {
  for (let i = 0; ; i++) {
    try { await fetch(`http://localhost:${port}/${port === P.cloud ? 'pull?uid=ping' : ''}`); break } catch { if (i > 60) throw new Error(`server ${port} did not start`); await sleep(250) }
  }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run'] })

async function device(port, name, viewport = { width: 1280, height: 860 }) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport(viewport)
  page.on('console', (m) => m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|Failed to load resource|Failed to fetch/.test(m.text()) && errors.push(`${name}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  const base = `http://localhost:${port}/`
  const api = {
    page, ctx, base,
    go: async (hash) => { await page.goto(base + hash); await page.waitForSelector('.topbar'); await sleep(250) },
    hash: async (hash) => { await page.evaluate((h) => { location.hash = h }, hash); await sleep(350) },
    reload: async () => { await page.reload(); await page.waitForSelector('.topbar'); await sleep(300) },
    ev: (fn, ...a) => page.evaluate(fn, ...a),
    text: (sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? null, sel),
    count: (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel),
    click: async (sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await sleep(200) },
    key: async (k) => { await page.evaluate((key) => window.dispatchEvent(new KeyboardEvent('keydown', { key })), k); await sleep(250) },
    menu: async (label) => { await page.evaluate(() => document.querySelector('button[aria-label="More"]').click()); await sleep(150); await page.evaluate((l) => [...document.querySelectorAll('.menu button')].find((b) => b.textContent.includes(l)).click(), label); await sleep(400) },
    // select the first occurrence of `words` inside a section body and pick a colour
    highlight: async (secId, words, color) => {
      const ok = await page.evaluate((secId, words) => {
        const body = document.querySelector(`#s-${secId} .sec-body`)
        const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
        while (w.nextNode()) {
          const i = w.currentNode.data.indexOf(words)
          if (i < 0) continue
          const r = document.createRange(); r.setStart(w.currentNode, i); r.setEnd(w.currentNode, i + words.length)
          getSelection().removeAllRanges(); getSelection().addRange(r)
          document.dispatchEvent(new Event('selectionchange'))
          return true
        }
        return false
      }, secId, words)
      if (!ok) return false
      await page.waitForSelector('.hlpal', { timeout: 3000 })
      await page.evaluate((c) => document.querySelector(`.hlpal .sw[data-c="${c}"]`).click(), color)
      await sleep(300)
      return true
    },
    marks: (secId) => page.evaluate((s) => [...document.querySelectorAll(`#s-${s} mark[data-hid]`)].map((m) => `${m.dataset.color}:${m.textContent}`), secId),
    // type into a section with the editor API (Edit Mode must be on)
    edit: async (secId, html) => {
      await page.evaluate((secId, html) => { const ed = document.querySelector(`#s-${secId} .ProseMirror`).editor; ed.commands.focus('end'); ed.commands.insertContentAt(ed.state.doc.content.size, html) }, secId, html)
      await sleep(250)
    },
    editMode: async (on) => {
      const is = await page.evaluate(() => !!document.querySelector('.toolbar'))
      if (is !== on) { await page.evaluate(() => document.querySelector('button[title^="Edit"]').click()); await sleep(on ? 700 : 1100) }
    },
    tool: async (title) => { await page.evaluate((t) => document.querySelector(`.toolbar button[title^="${t}"]`).click(), title); await sleep(120) },
    saved: async () => { await page.waitForFunction(() => document.querySelector('.toolbar .save')?.textContent === 'Saved', { timeout: 5000 }); },
    // account panel
    panel: async (open = true) => {
      const is = await page.evaluate(() => !!document.querySelector('.acct-panel'))
      if (is === open) return
      if (open) {
        const direct = await page.evaluate(() => { const b = document.querySelector('.acct'); if (b && getComputedStyle(b).display !== 'none') { b.click(); return true } return false })
        if (!direct) { await page.evaluate(() => document.querySelector('button[aria-label="More"]').click()); await sleep(150); await page.evaluate(() => [...document.querySelectorAll('.menu button')].find((b) => b.textContent.includes('Account')).click()) }
      } else await page.keyboard.press('Escape')
      await sleep(250)
    },
    panelClick: async (label) => { await api.panel(true); await page.evaluate((l) => [...document.querySelectorAll('.acct-panel button')].find((b) => b.textContent.includes(l)).click(), label); await sleep(300) },
    status: async () => { await api.panel(true); const t = await page.evaluate(() => (document.querySelector('.acct-status') ?? document.querySelector('.acct-note b'))?.textContent ?? ''); return t },
    syncNow: async () => { await api.panel(true); await page.waitForSelector('.acct-status', { timeout: 15000 }); const idle = () => page.waitForFunction(() => { const t = document.querySelector('.acct-status')?.textContent ?? ''; return t && !/Syncing/.test(t) }, { timeout: 20000 }); await idle(); await api.panelClick('Sync now'); await sleep(200); await idle(); await sleep(300); const t = await api.status(); await api.panel(false); return t },
    idb: (store) => page.evaluate((store) => new Promise((res) => { const q = indexedDB.open('upsc-notes'); q.onsuccess = () => { const db = q.result; const g = db.transaction(store).objectStore(store).getAll(); g.onsuccess = () => { db.close(); res(g.result) } } }), store),
  }
  return api
}
const cloudDump = async (uid = 'mock-user') => (await fetch(`http://localhost:${P.cloud}/dump?uid=${uid}`)).json()
const PARL = '#/study/prelims/polity/parliament'
// study timer: seconds on the header clock, and the stored timer row
const secs = (d) => d.ev(() => { const t = document.querySelector('.ttime time')?.textContent; if (!t) return -1; const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + s })
const activeRow = async (d) => (await d.idb('activeStudySession'))[0]
// Recall v2: an answer is concealed when it is not rendered at all and one fixed label stands in for it
const masked = (d, sel) => d.ev((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e, '::before').content.includes('RECALL') && getComputedStyle(e.querySelector('.rq-a')).display === 'none' && getComputedStyle(e).filter === 'none' }, sel)
const idbPut = (d, store, rows) => d.ev((store, rows) => new Promise((res) => { const q = indexedDB.open('upsc-notes'); q.onsuccess = () => { const db = q.result; const tx = db.transaction(store, 'readwrite'); rows.forEach((r) => tx.objectStore(store).put(r)); tx.oncomplete = () => { db.close(); res(true) } } }), store, rows)
const dayKey = (offset = 0) => { const d = new Date(Date.now() + offset * 86400000); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') }
const tapBtn = (d, label, scope = 'body') => d.ev((label, scope) => { const b = [...document.querySelectorAll(scope + ' button, ' + scope + ' a.btn')].find((x) => x.textContent.trim().startsWith(label)); if (!b) return false; b.click(); return true }, label, scope)

try {
  // ==========================================================================
  section('Migration from the v1 database')
  const L = await device(P.local, 'local')
  // seed a v1 database exactly as the previous build wrote it, before the app first runs
  await L.page.goto(L.base + 'manifest.webmanifest')
  await L.ev(() => new Promise((res) => {
    localStorage.setItem('upsc-prefs', JSON.stringify({ theme: 'light', recall: false, sidebar: true, collapsed: [] }))
    const q = indexedDB.open('upsc-notes', 1)
    q.onupgradeneeded = () => { q.result.createObjectStore('overrides', { keyPath: 'key' }); q.result.createObjectStore('kv') }
    q.onsuccess = () => {
      const tx = q.result.transaction(['overrides', 'kv'], 'readwrite')
      // (a) highlight-only row, (b) real edit with a highlight inside and an edited heading
      tx.objectStore('overrides').put({ key: 'prelims/polity/parliament/lok-sabha-vs-rajya-sabha', updatedAt: 5, html: '<p>V1 EDITED TEXT with <mark data-hid="hv1b" data-color="pink">old pink words</mark> inside.</p>', title: 'LS vs RS (v1 title)' })
      tx.objectStore('kv').put({ sections: { 'prelims/polity/parliament/presiding-officers': { done: true, difficult: true } }, chapters: { 'prelims/polity/parliament': { status: 'revised', scroll: 900, section: 'presiding-officers', at: 5 } }, last: { chapterKey: 'prelims/polity/parliament', at: 5 } }, 'progress')
      tx.oncomplete = () => { q.result.close(); res() }
    }
  }))
  await L.go(PARL)
  check('v1 edit and edited heading survive', (await L.text('#s-lok-sabha-vs-rajya-sabha .sec-body'))?.includes('V1 EDITED TEXT') && (await L.text('#s-lok-sabha-vs-rajya-sabha h2')) === 'LS vs RS (v1 title)')
  check('v1 highlight is re-attached to the same words', (await L.marks('lok-sabha-vs-rajya-sabha')).join() === 'pink:old pink words')
  check('v1 progress, status and flags survive', (await L.text('.chap-meta span')) === '1 / 9 sections done' && (await L.ev(() => document.querySelector('.chap-meta select').value)) === 'revised')
  const hlRows = await L.idb('highlights')
  const ovRows = await L.idb('overrides')
  check('highlights now live in their own store; saved HTML has no <mark>', hlRows.length === 1 && ovRows.every((o) => !(o.html ?? '').includes('<mark')))
  await L.reload()
  check('migration is stable across reload', (await L.marks('lok-sabha-vs-rajya-sabha')).length === 1 && (await L.idb('highlights')).length === 1)

  // ==========================================================================
  section('Reader regression (production build, local-only)')
  await L.hash('#/insights')
  const empty = [await L.ev(() => ({ note: document.querySelector('.nodata')?.textContent ?? '', drawn: document.querySelectorAll('.chart, .kpi, .heat i, .vb').length }))]
  for (const t of ['time', 'subjects']) { await L.hash('#/insights/' + t); empty.push(await L.ev(() => ({ note: document.querySelector('.nodata')?.textContent ?? '', drawn: document.querySelectorAll('.chart, .kpi, .heat i, .vb').length }))) }
  check('Insights before any tracked session: says analytics appear after timed study; no charts, no sample data', empty.every((e) => e.note.includes('No tracked study time yet') && e.note.includes('timer') && e.drawn === 0), empty)
  check('Insights tabs: Overview, Time, Subjects, Progress, Revision, Current Affairs', (await L.ev(() => [...document.querySelectorAll('.tabs a')].map((a) => a.textContent + ' ' + a.getAttribute('href')).join(' | '))) === 'Overview #/insights | Time #/insights/time | Subjects #/insights/subjects | Progress #/insights/progress | Revision #/insights/revision | Current Affairs #/insights/current-affairs')
  await L.hash('#/insights/progress')
  check('Polity: 19 chapters', (await L.count('section:first-of-type .rows .row')) === 19)
  check('Polity: 117 sections', /\/117\)/.test(await L.text('.stat')), await L.text('.stat'))
  await L.hash(PARL)
  check('compact reader renders only the current chapter (9 sections)', (await L.count('.sec')) === 9)
  check('no account sign-in offered when sync is not configured', (await L.status()).includes('Local only') && (await L.count('.acct-panel button')) === 0)
  await L.panel(false)

  // highlights
  check('highlight from selection', (await L.highlight('bills-types-and-procedure', 'All Money Bills are Financial Bills', 'green')) && (await L.marks('bills-types-and-procedure')).join() === 'green:All Money Bills are Financial Bills')
  check('highlighting does not create a content edit', !(await L.idb('overrides')).some((o) => o.key.endsWith('bills-types-and-procedure')))
  await L.reload()
  check('highlight survives reload', (await L.marks('bills-types-and-procedure')).length === 1)
  await L.ev(() => { getSelection().removeAllRanges(); document.querySelector('#s-bills-types-and-procedure mark').click() })
  await sleep(250)
  await L.click('.hlpal .sw[data-c="blue"]')
  check('recolour by clicking a highlight', (await L.marks('bills-types-and-procedure'))[0]?.startsWith('blue:'))
  await L.hash('#/highlights')
  check('Highlights page lists text, chapter and section', (await L.count('.hl-item')) === 2 && (await L.text('h3.gh')).includes('Parliament') && (await L.ev(() => [...document.querySelectorAll('.hl-item small')].map((e) => e.textContent).join('|'))).includes('Bills — Types & Procedure'))
  await L.ev(() => [...document.querySelectorAll('.hl-item a')].find((a) => a.textContent.includes('All Money Bills')).click())
  await sleep(600)
  check('Highlights page jumps to the passage', (await L.ev(() => { const m = document.querySelector('#s-bills-types-and-procedure mark'); const r = m.getBoundingClientRect(); return location.hash.includes('bills-types-and-procedure') && r.top > 0 && r.top < innerHeight })))
  await L.ev(() => document.querySelector('#s-bills-types-and-procedure mark').click())
  await sleep(250)
  await L.click('.hlpal .x')
  check('remove highlight', (await L.marks('bills-types-and-procedure')).length === 0)
  await L.highlight('bills-types-and-procedure', 'All Money Bills are Financial Bills', 'yellow')

  // editing
  const rc0 = await L.count('#s-presiding-officers .rc')
  await L.editMode(true)
  check('edit mode: one editor per section + toolbar', (await L.count('.ProseMirror')) === 9 && (await L.count('.toolbar')) === 1)
  check('highlights are visible inside the editor', (await L.ev(() => document.querySelector('#s-bills-types-and-procedure .ProseMirror mark')?.textContent)) === 'All Money Bills are Financial Bills')
  await L.edit('presiding-officers', '<p>E2E-ADDED sentence for testing</p>')
  check('status shows Editing', (await L.text('.toolbar .save')) === 'Editing')
  await L.saved()
  check('autosave reaches Saved', true)
  await L.tool('Undo'); const undone = !(await L.text('#s-presiding-officers .ProseMirror')).includes('E2E-ADDED')
  await L.tool('Redo'); const redone = (await L.text('#s-presiding-officers .ProseMirror')).includes('E2E-ADDED')
  check('Undo / Redo', undone && redone)
  const fmt = await L.ev(async () => {
    const pm = document.querySelector('#s-presiding-officers .ProseMirror'); const ed = pm.editor; const out = {}
    const btn = (t) => document.querySelector(`.toolbar button[title^="${t}"]`).click()
    const tick = () => new Promise((r) => setTimeout(r, 80))
    let at = 0; ed.state.doc.descendants((n, pos) => { if (n.isText && n.text.includes('testing')) at = pos + n.text.indexOf('testing') }); ed.commands.setTextSelection({ from: at, to: at + 7 }); await tick()
    btn('Bold'); await tick(); out.bold = /<strong>testing<\/strong>/.test(pm.innerHTML)
    btn('Italic'); await tick(); out.italic = /<em>/.test(pm.innerHTML)
    btn('Clear'); await tick(); out.cleared = !/<strong>testing/.test(pm.innerHTML)
    btn('Bullet'); await tick(); out.bullet = pm.lastElementChild.tagName
    btn('Numbered'); await tick(); out.numbered = pm.lastElementChild.tagName
    btn('Numbered'); await tick()
    const cells = pm.querySelectorAll('td'); ed.commands.setTextSelection(ed.view.posAtDOM(cells[cells.length - 1], 0) + 1); await tick()
    const size0 = [pm.querySelectorAll('tr').length, pm.querySelector('tr').children.length]
    btn('Add row'); await tick(); btn('Add column'); await tick()
    const size1 = [pm.querySelectorAll('tr').length, pm.querySelector('tr').children.length]
    // remove exactly what was added: the new last row, then the new last column
    const into = (cell) => ed.commands.setTextSelection(ed.view.posAtDOM(cell, 0) + 1)
    into([...pm.querySelectorAll('tr')].pop().lastElementChild); await tick(); btn('Delete row'); await tick()
    into([...pm.querySelectorAll('tr')].pop().lastElementChild); await tick(); btn('Delete column'); await tick()
    const size2 = [pm.querySelectorAll('tr').length, pm.querySelector('tr').children.length]
    out.table = [size0, size1, size2].join(' → ')
    out.tableOk = size1[0] === size0[0] + 1 && size1[1] === size0[1] + 1 && size2[0] === size0[0] && size2[1] === size0[1]
    return out
  })
  check('Bold / Italic / Clear formatting', fmt.bold && fmt.italic && fmt.cleared, fmt)
  check('Bullet and numbered lists', fmt.bullet === 'UL' && fmt.numbered === 'OL', fmt)
  check(`Table add/delete row and column (${fmt.table})`, fmt.tableOk, fmt)
  await L.ev(() => { const h = document.querySelector('#s-presiding-officers input.h2'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(h, 'Presiding Officers (edited)'); h.dispatchEvent(new Event('input', { bubbles: true })) })
  // a highlight on words that exist only in the edit, and an edit above an existing highlight
  await L.edit('bills-types-and-procedure', '<p>ONLY-IN-EDIT passage to highlight</p>')
  await L.saved()
  await L.editMode(false)
  await L.highlight('bills-types-and-procedure', 'ONLY-IN-EDIT passage', 'pink')
  await L.reload()
  check('edits and edited heading survive reload', (await L.text('#s-presiding-officers .sec-body')).includes('E2E-ADDED') && (await L.text('#s-presiding-officers h2')) === 'Presiding Officers (edited)')
  check('highlights stay on their words after the section was edited', (await L.marks('bills-types-and-procedure')).sort().join('|') === 'pink:ONLY-IN-EDIT passage|yellow:All Money Bills are Financial Bills', await L.marks('bills-types-and-procedure'))
  check('recall items and callouts intact after an edit round-trip', rc0 > 0 && (await L.count('#s-presiding-officers .rc')) === rc0 && (await L.count('#s-presiding-officers .callout')) === 1, [rc0, await L.count('#s-presiding-officers .rc')])

  // recall
  await L.key('r')
  await sleep(350)
  const concealed = await masked(L, '#s-composition-and-constitutional-map .rc')
  await L.click('#s-composition-and-constitutional-map .rc'); await sleep(350)
  const shown = await L.ev(() => { const e = document.querySelector('#s-composition-and-constitutional-map .rc'); return e.classList.contains('shown') && getComputedStyle(e.querySelector('.rq-a')).display !== 'none' && getComputedStyle(e, '::before').content === 'none' })
  check('Recall Mode conceals facts behind a fixed mask; click reveals', concealed && shown, { concealed, shown })
  check('the cue around a recall item stays readable: nothing is blurred and row headings are never masked', await L.ev(() => [...document.querySelectorAll('#s-composition-and-constitutional-map *')].every((e) => getComputedStyle(e).filter === 'none') && [...document.querySelectorAll('#s-composition-and-constitutional-map tbody tr')].every((r) => !r.children[0].querySelector('.rq[data-m~="standard"]'))))
  await L.key('r')

  // progress / flags / resume / scroll
  await L.click('#s-sessions-and-devices .tg.rev'); await L.click('#s-sessions-and-devices .tg.star'); await L.click('#s-sessions-and-devices .tg.done')
  await L.hash(PARL)
  await L.ev(() => window.scrollTo(0, 2400)); await sleep(1200)
  const inView = await L.text('.crumbs')
  check('breadcrumb follows the section in view', (await L.text('.crumbs')).split('›').length === 4, await L.text('.crumbs'))
  await L.reload(); await sleep(300)
  check('scroll position restored after reload (same section in view)', Math.abs((await L.ev(() => scrollY)) - 2400) < 150 && (await L.ev(() => { window.dispatchEvent(new Event('scroll')); return new Promise((r) => setTimeout(() => r(document.querySelector('.crumbs').textContent), 300)) })) === inView, await L.ev(() => scrollY))
  await L.hash('#/revision/manual')
  check('Revision → Manual shows ↻ / ★ sections', (await L.ev(() => [...document.querySelectorAll('.row')].map((r) => r.textContent).join('|'))).includes('Sessions & Devices'))
  await L.hash('#/')
  check('Resume card points at the last chapter and section', (await L.text('.cont')).includes('Parliament'))
  await L.click('.cont .btn.primary'); await sleep(500)
  check('Resume returns to the saved position', Math.abs((await L.ev(() => scrollY)) - 2400) < 150 && (await L.ev(() => location.hash)).includes('parliament'))

  // search
  const search = async (q) => { await L.ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))); await sleep(200); const r = await L.ev(async (q) => { const i = document.querySelector('.palette input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, q); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 200)); return [...document.querySelectorAll('.palette li b')].map((b) => b.textContent) }, q); await L.page.keyboard.press('Escape'); await sleep(150); return r }
  const s1 = await search('Article 368'); const s2 = await search('Art. 368')
  check('Ctrl+K search; "Article 368" and "Art. 368" give the same results', s1[0] === 'Article 368 — Procedure' && s1.join() === s2.join(), [s1, s2])
  check('search covers user edits', (await search('E2E-ADDED'))[0] === 'Presiding Officers (edited)')
  check('search: chapter jump', (await search('judiciary'))[0] === 'Judiciary & Legal Services')

  // navigation
  await L.hash('#/study/prelims/polity/political-theory')
  const before = await L.ev(() => location.hash)
  await L.ev(() => document.querySelector('a.xref').click()); await sleep(500)
  const target = await L.ev(() => ({ hash: location.hash, title: document.title }))
  await L.page.goBack(); await sleep(500)
  check('cross-reference navigates and browser Back returns', target.hash.includes('amendments-basic-structure') && (await L.ev(() => location.hash)) === before, target)
  await L.key(']'); const nextTitle = await L.ev(() => document.title); await L.key('[')
  check('Previous / Next and [ ] shortcuts', nextTitle.startsWith('Preamble') && (await L.ev(() => document.title)).startsWith('Political Theory'))
  await L.key('f')
  const focus = await L.ev(() => ({ top: getComputedStyle(document.querySelector('.topbar')).display, side: getComputedStyle(document.querySelector('.sidebar')).display, bar: getComputedStyle(document.querySelector('.readbar')).display }))
  await L.page.keyboard.press('Escape'); await sleep(200)
  check('Focus Mode hides chrome, keeps the reading-progress bar; Esc leaves', focus.top === 'none' && focus.side === 'none' && focus.bar !== 'none' && !(await L.ev(() => document.querySelector('.app').classList.contains('focus'))), focus)
  await L.key('t'); const dark = await L.ev(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]); await L.key('t')
  check('theme toggle', dark[0] === 'dark' && dark[1] === 'rgb(21, 22, 26)' && (await L.ev(() => document.documentElement.dataset.theme)) === 'light', dark)
  await L.hash('#/study/prelims/polity?tab=pyq'); const pyq = await L.count('details.syn')
  await L.hash('#/study/prelims/polity?tab=insights'); const ins = await L.count('.hbar')
  check('PYQs and Insights tabs', pyq === 19 && ins === 19)

  // exports
  const cdp = await browser.target().createCDPSession()
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: join(OUT, 'downloads'), browserContextId: L.ctx.id })
  await L.hash(PARL)
  await L.menu('Export Updated HTML — this chapter'); await L.menu('Export to Markdown — this chapter'); await L.menu('Export to Markdown — whole subject')
  await sleep(1500)
  const dl = (n) => { try { return readFileSync(join(OUT, 'downloads', n), 'utf8') } catch { return '' } }
  const eh = dl('prelims-polity-parliament.html'); const em = dl('prelims-polity-parliament.md'); const es = dl('prelims-polity.md')
  check('HTML export: standalone, with edits, edited heading and highlights', eh.startsWith('<!doctype html>') && eh.includes('E2E-ADDED') && eh.includes('Presiding Officers (edited)') && /<mark[^>]*>All Money Bills/.test(eh) && !eh.includes('<script src'))
  check('Markdown export: dialect, edits and highlights', em.includes('E2E-ADDED') && em.includes('{{') && em.includes('> [!TRAP]') && /<mark data-color="yellow">All Money Bills/.test(em))
  check('whole-subject Markdown export has 19 chapters', (es.match(/<!-- ===== chapters\//g) ?? []).length === 19)

  // ==========================================================================
  section('Economy + cross-links')
  const ECO = '#/study/prelims/economy/'
  await L.hash('#/study')
  check('Library lists Economy & Social Development under Prelims, after Polity', (await L.ev(() => [...document.querySelectorAll('a.row b')].map((b) => b.textContent).join('|'))) === 'Polity|Economy & Social Development|History & Culture|Geography|Environment & Ecology|Science & Technology')
  await L.hash('#/insights/progress')
  check('Economy: 17 chapters, 107 sections', (await L.count('section:nth-of-type(2) .rows .row')) === 17 && (await L.ev(() => document.querySelectorAll('.stat')[1].textContent)).includes('/107)'))
  await L.hash('#/study/prelims/economy'); const ecoRows = await L.count('.rows .row'); const ecoTopics = await L.count('h3.gh')
  await L.hash('#/study/prelims/economy?tab=pyq'); const ecoPyq = await L.count('details.syn')
  await L.hash('#/study/prelims/economy?tab=insights'); const ecoIns = await L.count('.hbar'); const ecoFlags = await L.ev(() => [...document.querySelectorAll('.rows .chip')].map((c) => c.textContent))
  check('Economy overview, PYQs and Insights tabs', ecoRows === 17 && ecoTopics === 6 && ecoPyq === 17 && ecoIns === 17, [ecoRows, ecoTopics, ecoPyq, ecoIns])
  check('Insights lists Economy ↻ Dynamic and Verify items', ecoFlags.includes('↻ Dynamic') && ecoFlags.includes('Verify'), ecoFlags.length)
  const sEco = await search('crowding out')
  check('search finds Economy content', sEco[0] === 'Fiscal Policy', sEco.slice(0, 3))
  // palette surfaces destinations linked with the best hit
  await L.ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))); await sleep(200)
  const rel = await L.ev(async () => { const i = document.querySelector('.palette input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'fiscal federalism'); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 250)); return [...document.querySelectorAll('.palette li')].filter((li) => li.querySelector('em')).map((li) => li.textContent) })
  check('search palette offers related destinations in another subject', rel.some((t) => t.startsWith('Finance Commission') && t.includes('Polity') && t.includes('related to Fiscal Federalism')), rel)
  await L.ev(() => [...document.querySelectorAll('.palette li')].find((li) => li.querySelector('em') && li.textContent.startsWith('Finance Commission')).click()); await sleep(400)
  check('related result opens the exact section', (await L.ev(() => location.hash)) === '#/study/prelims/polity/constitutional-bodies/finance-commission')

  // cross-subject link → exact section → Back
  await L.hash(ECO + 'budget-fiscal-policy/fiscal-federalism')
  const from = await L.ev(() => location.hash)
  await L.ev(() => document.querySelector('#s-fiscal-federalism a.xref[data-xref^="prelims/polity/"]').click()); await sleep(500)
  const dest = await L.ev(() => ({ hash: location.hash, title: document.title, top: Math.round(document.getElementById('s-finance-commission').getBoundingClientRect().top), crumbs: document.querySelector('.crumbs').textContent }))
  check('cross-subject link opens the exact chapter and section', dest.hash === '#/study/prelims/polity/constitutional-bodies/finance-commission' && dest.title.startsWith('Constitutional Bodies') && dest.top >= 0 && dest.top < 200 && dest.crumbs.includes('Polity'), dest)
  const back = await L.ev(() => [...document.querySelectorAll('#s-finance-commission .related a')].map((a) => a.textContent + ' ' + a.getAttribute('href')))
  check('destination shows a Related backlink to the linking section', back.some((t) => t.includes('Economy & Social Development') && t.includes('Fiscal Federalism') && t.endsWith('#/study/prelims/economy/budget-fiscal-policy/fiscal-federalism')), back)
  await L.page.goBack(); await sleep(500)
  check('browser Back returns to the linking section', (await L.ev(() => location.hash)) === from && (await L.ev(() => document.title)).startsWith('Budget'))
  await L.page.goForward(); await sleep(400)
  await L.ev(() => document.querySelector('#s-finance-commission .related a').click()); await sleep(500)
  check('backlink leads back into Economy', (await L.ev(() => location.hash)) === from)
  // links inside a subject, and chapter-level related
  await L.hash(ECO + 'inflation/control')
  await L.ev(() => document.querySelector('#s-control a.xref').click()); await sleep(400)
  check('cross-chapter link inside Economy', (await L.ev(() => location.hash)) === ECO + 'money-rbi-monetary-policy/policy-tools' && (await L.count('#s-policy-tools .related a')) >= 2)
  await L.hash(ECO + 'economic-thinkers')
  const chapRel = await L.ev(() => [...document.querySelectorAll('.page > .related a')].map((a) => a.getAttribute('href')))
  await L.hash(ECO + 'social-concepts')
  const chapRelBack = await L.ev(() => [...document.querySelectorAll('.page > .related a')].map((a) => a.getAttribute('href')))
  check('chapter-level Related is shown from both ends', chapRel.includes(ECO + 'social-concepts') && chapRelBack.includes(ECO + 'economic-thinkers'), [chapRel, chapRelBack])
  await L.hash(PARL)
  check('Polity text unchanged: Related sits outside the section body', await L.ev(() => document.querySelector('#s-budget-and-financial-procedure .sec-body .related') === null && !!document.querySelector('#s-budget-and-financial-procedure .related')))

  // reader features on Economy: recall, progress, highlight, edit (links survive), export
  await L.hash(ECO + 'budget-fiscal-policy')
  check('Economy chapter renders its sections with recall items and callouts', (await L.count('.sec')) === 7 && (await L.count('.sec-body .rc')) > 20 && (await L.count('.callout[data-kind="dyn"]')) >= 2)
  await L.key('r'); const ecoBlur = await masked(L, '#s-deficits .rc'); await L.click('#s-deficits .rc')
  check('Recall Mode conceals and reveals Economy answers', ecoBlur && (await L.ev(() => document.querySelector('#s-deficits .rc').classList.contains('shown'))), ecoBlur)
  await L.key('r')
  await L.highlight('fiscal-policy', 'Crowding out', 'blue'); await L.click('#s-deficits .tg.done'); await L.click('#s-frbm .tg.rev')
  await L.editMode(true); await L.edit('fiscal-federalism', '<p>ECO-E2E edit</p>'); await L.saved(); await L.editMode(false)
  const edited = await L.ev(() => ({ text: document.querySelector('#s-fiscal-federalism .sec-body').textContent.includes('ECO-E2E edit'), links: [...document.querySelectorAll('#s-fiscal-federalism .sec-body a.xref')].map((a) => a.getAttribute('data-xref') + ' ' + a.getAttribute('href')) }))
  check('edited section keeps its cross-links (ids and routes)', edited.text && edited.links.includes('prelims/polity/constitutional-bodies#finance-commission #/study/prelims/polity/constitutional-bodies/finance-commission') && edited.links.includes('taxation#cess-vs-surcharge #/study/prelims/economy/taxation/cess-vs-surcharge'), edited)
  await L.ev(() => document.querySelector('#s-fiscal-federalism .sec-body a.xref[data-xref^="prelims/polity/"]').click()); await sleep(400)
  check('link in an edited section still navigates', (await L.ev(() => location.hash)).endsWith('constitutional-bodies/finance-commission'))
  await L.page.goBack(); await sleep(400)
  await L.reload()
  check('Economy edit, highlight and progress persist across reload', (await L.text('#s-fiscal-federalism .sec-body')).includes('ECO-E2E edit') && (await L.marks('fiscal-policy')).join() === 'blue:Crowding out' && (await L.text('.chap-meta span')) === '1 / 7 sections done')
  await L.hash('#/revision/manual')
  check('Economy section appears in Revision → Manual', (await L.ev(() => [...document.querySelectorAll('.row')].map((r) => r.textContent).join('|'))).includes('FRBM'))
  await L.hash(ECO + 'budget-fiscal-policy')
  await L.menu('Export Updated HTML — this chapter'); await L.menu('Export to Markdown — this chapter'); await L.menu('Export Updated HTML — whole subject')
  await sleep(1500)
  const xh = dl('prelims-economy-budget-fiscal-policy.html'); const xm = dl('prelims-economy-budget-fiscal-policy.md'); const xs = dl('prelims-economy.html')
  check('Markdown export keeps cross-links as stable ids', xm.includes('](@prelims/polity/constitutional-bodies#finance-commission)') && xm.includes('](@taxation#cess-vs-surcharge)') && xm.includes('ECO-E2E edit'))
  check('HTML export: links outside the file point back to the reader', xh.includes(`href="http://localhost:${P.local}/#/study/prelims/polity/constitutional-bodies/finance-commission"`) && xh.includes(`href="http://localhost:${P.local}/#/study/prelims/economy/taxation/cess-vs-surcharge"`), (xh.match(/data-xref="[^"]+" href="[^"]+"/g) ?? []).slice(0, 3))
  check('HTML export: links inside the file use its own anchors', xs.includes('data-xref="taxation#cess-vs-surcharge" href="#taxation--cess-vs-surcharge"') && xs.includes('<section id="taxation--cess-vs-surcharge">') && xs.includes(`href="http://localhost:${P.local}/#/study/prelims/polity/`))
  L.page.once('dialog', (d) => d.accept())
  await L.menu('Reset Local Edits — this chapter'); await sleep(700)
  check('Reset Local Edits works on Economy and keeps highlight + progress', !(await L.text('#s-fiscal-federalism .sec-body')).includes('ECO-E2E edit') && (await L.marks('fiscal-policy')).length === 1 && (await L.text('.chap-meta span')) === '1 / 7 sections done')
  await L.click('#s-fiscal-policy mark[data-hid]'); await sleep(150); await L.click('.hlpal .x')
  check('Economy highlight can be removed', (await L.marks('fiscal-policy')).length === 0)

  // ==========================================================================
  section('History & Culture + cross-links')
  const HIS = '#/study/prelims/history-culture/'
  await L.hash('#/insights/progress')
  check('History & Culture: 29 chapters, 204 sections', (await L.count('section:nth-of-type(3) .rows .row')) === 29 && (await L.ev(() => document.querySelectorAll('.stat')[2].textContent)).includes('/204)'))
  await L.hash('#/study/prelims/history-culture'); const hisRows = await L.count('.rows .row'); const hisTopics = await L.count('h3.gh')
  await L.hash('#/study/prelims/history-culture?tab=pyq'); const hisPyq = await L.count('details.syn')
  await L.hash('#/study/prelims/history-culture?tab=insights'); const hisIns = await L.count('.hbar'); const hisFlags = await L.ev(() => [...document.querySelectorAll('.rows .chip')].map((c) => c.textContent))
  check('History overview, PYQs and Insights tabs', hisRows === 29 && hisTopics === 6 && hisPyq === 29 && hisIns === 29, [hisRows, hisTopics, hisPyq, hisIns])
  check('Insights lists History ↻ Dynamic and Verify items', hisFlags.includes('↻ Dynamic') && hisFlags.includes('Verify'), hisFlags.length)
  const sHis = await search('Vattakirutal')
  check('search finds History content', sHis[0] === 'Sangam Society', sHis.slice(0, 3))
  // History → Polity, backlink, Back
  await L.hash(HIS + 'awards-institutions/article-18')
  const hFrom = await L.ev(() => location.hash)
  await L.ev(() => document.querySelector('#s-article-18 a.xref[data-xref^="prelims/polity/"]').click()); await sleep(500)
  const FR = '#/study/prelims/polity/fundamental-rights/right-to-equality-articles-14-18'
  const hBack = await L.ev(() => [...document.querySelectorAll('#s-right-to-equality-articles-14-18 .related a')].map((a) => a.textContent + ' ' + a.getAttribute('href')))
  check('History → Polity link opens the exact section, with a Related backlink', (await L.ev(() => location.hash)) === FR && hBack.some((t) => t.includes('History & Culture') && t.includes('Article 18') && t.endsWith(HIS + 'awards-institutions/article-18')), hBack)
  check('Polity body untouched by History backlinks', await L.ev(() => document.querySelector('#s-right-to-equality-articles-14-18 .sec-body .related') === null))
  await L.page.goBack(); await sleep(500)
  check('browser Back returns to the History section', (await L.ev(() => location.hash)) === hFrom && (await L.ev(() => document.title)).startsWith('Awards'))
  // History → Economy
  await L.hash(HIS + 'painting-crafts-textiles/gi')
  await L.ev(() => document.querySelector('#s-gi a.xref[data-xref^="prelims/economy/"]').click()); await sleep(500)
  check('History → Economy link opens the exact section', (await L.ev(() => location.hash)) === '#/study/prelims/economy/international-institutions/trips-gi-patents' && (await L.ev(() => [...document.querySelectorAll('#s-trips-gi-patents .related a')].some((a) => a.textContent.includes('History & Culture')))))
  await L.page.goBack(); await sleep(400)
  check('Back returns from Economy to History', (await L.ev(() => location.hash)) === HIS + 'painting-crafts-textiles/gi')
  // inside History, and a link into a subject that is not in the library yet
  await L.hash(HIS + 'delhi-sultanate/iqta')
  await L.ev(() => document.querySelector('#s-iqta a.xref').click()); await sleep(400)
  check('cross-chapter link inside History', (await L.ev(() => location.hash)) === HIS + 'mughals/jagirdar-vs-zamindar' && (await L.count('#s-jagirdar-vs-zamindar .related a')) >= 1)
  await L.hash(HIS + 'socio-religious-reform/women-reform')
  check('link to a subject not added yet stays plain text', await L.ev(() => { const a = document.querySelector('#s-women-reform a.xref.pending'); return !!a && !a.getAttribute('href') && a.getAttribute('data-xref') === 'mains/gs1-society' }))
  // reader features on History: recall, progress, highlight, edit (links survive), export, reset
  await L.hash(HIS + 'constitutional-development')
  check('History chapter renders its sections with recall items and callouts', (await L.count('.sec')) === 8 && (await L.count('.sec-body .rc')) > 30 && (await L.count('.callout[data-kind="trap"]')) >= 3)
  await L.key('r'); const hisBlur = await masked(L, '#s-act-1935 .rc'); await L.click('#s-act-1935 .rc')
  check('Recall Mode conceals and reveals History answers', hisBlur && (await L.ev(() => document.querySelector('#s-act-1935 .rc').classList.contains('shown'))), hisBlur)
  await L.key('r')
  await L.highlight('act-1919', 'High Commissioner for India', 'blue'); await L.click('#s-act-1919 .tg.done'); await L.click('#s-simon-nehru .tg.rev')
  await L.editMode(true); await L.edit('act-1935', '<p>HIS-E2E edit</p>'); await L.saved(); await L.editMode(false)
  const hEdited = await L.ev(() => ({ text: document.querySelector('#s-act-1935 .sec-body').textContent.includes('HIS-E2E edit'), links: [...document.querySelectorAll('#s-act-1935 .sec-body a.xref')].map((a) => a.getAttribute('data-xref') + ' ' + a.getAttribute('href')) }))
  check('edited History section keeps its cross-links', hEdited.text && hEdited.links.includes('prelims/polity/preamble#sources-of-the-constitution #/study/prelims/polity/preamble/sources-of-the-constitution') && hEdited.links.includes('prelims/polity/parts-schedules#seventh-schedule-lists #/study/prelims/polity/parts-schedules/seventh-schedule-lists'), hEdited)
  await L.reload()
  check('History edit, highlight and progress persist across reload', (await L.text('#s-act-1935 .sec-body')).includes('HIS-E2E edit') && (await L.marks('act-1919')).join() === 'blue:High Commissioner for India' && (await L.text('.chap-meta span')) === '1 / 8 sections done')
  await L.hash('#/revision/manual')
  check('History section appears in Revision → Manual', (await L.ev(() => [...document.querySelectorAll('.row')].map((r) => r.textContent).join('|'))).includes('Simon Commission'))
  await L.hash(HIS + 'constitutional-development')
  await L.menu('Export to Markdown — this chapter'); await sleep(1200)
  const hm = dl('prelims-history-culture-constitutional-development.md')
  check('History Markdown export keeps cross-links as stable ids', hm.includes('](@prelims/polity/preamble#sources-of-the-constitution)') && hm.includes('](@communal-politics-ina-partition#cabinet-mission-breakdown)') && hm.includes('HIS-E2E edit'))
  L.page.once('dialog', (d) => d.accept())
  await L.menu('Reset Local Edits — this chapter'); await sleep(700)
  check('Reset Local Edits works on History and keeps highlight + progress', !(await L.text('#s-act-1935 .sec-body')).includes('HIS-E2E edit') && (await L.marks('act-1919')).length === 1 && (await L.text('.chap-meta span')) === '1 / 8 sections done')
  await L.click('#s-act-1919 mark[data-hid]'); await sleep(150); await L.click('.hlpal .x')
  check('History highlight can be removed', (await L.marks('act-1919')).length === 0)
  await L.hash(PARL)

  section('Geography, Environment, Science & Technology')
  const N3 = [
    { id: 'geography', title: 'Geography', chapters: 15, sections: 96, topics: 5, nth: 4, find: ['Gandikota', 'Peninsular Rivers'], chap: 'india-drainage', secs: 10, rc: 'ganga', hl: ['groundwater', 'surplus to deficit basins'], done: 'indus', edit: 'lakes', link: 'prelims/environment/protected-areas#wetlands-ramsar #/study/prelims/environment/protected-areas/wetlands-ramsar' },
    { id: 'environment', title: 'Environment & Ecology', chapters: 12, sections: 75, topics: 3, nth: 5, find: ['Montreux', 'Wetlands & Ramsar'], chap: 'environmental-laws', secs: 8, rc: 'epa', hl: ['campa', 'approval needed to divert forest land'], done: 'epa', edit: 'ngt', link: 'prelims/polity/judiciary#tribunals #/study/prelims/polity/judiciary/tribunals' },
    { id: 'science-tech', title: 'Science & Technology', chapters: 14, sections: 73, topics: 6, nth: 6, find: ['Chandrasekhar', 'Life of a Star'], chap: 'energy-technologies', secs: 5, rc: 'solar', hl: ['solar', 'gets credit on the bill'], done: 'nuclear', edit: 'batteries', link: 'prelims/geography/world-resources#critical-minerals #/study/prelims/geography/world-resources/critical-minerals' },
  ]
  for (const s of N3) {
    const base = '#/study/prelims/' + s.id
    await L.hash('#/insights/progress')
    const prog3 = { rows: await L.count('section:nth-of-type(' + s.nth + ') .rows .row'), stat: await L.ev((i) => document.querySelectorAll('.stat')[i]?.textContent ?? '', s.nth - 1) }
    await L.hash(base); const rows3 = await L.count('.rows .row'); const topics3 = await L.count('h3.gh')
    await L.hash(base + '?tab=pyq'); const pyq3 = await L.count('details.syn')
    await L.hash(base + '?tab=insights'); const ins3 = await L.count('.hbar'); const flags3 = await L.ev(() => [...document.querySelectorAll('.rows .chip')].map((c) => c.textContent))
    check(s.title + ': ' + s.chapters + ' chapters, ' + s.sections + ' sections; overview, PYQs and Insights tabs', prog3.rows === s.chapters && prog3.stat.includes('/' + s.sections + ')') && rows3 === s.chapters && topics3 === s.topics && pyq3 > 0 && ins3 === s.chapters, [prog3, rows3, topics3, pyq3, ins3])
    check('Insights lists ' + s.title + ' ↻ Dynamic and Verify items', flags3.includes('↻ Dynamic') && flags3.includes('Verify'), flags3.length)
    const found3 = await search(s.find[0])
    check('search finds ' + s.title + ' content', found3[0] === s.find[1], found3.slice(0, 3))
    // reader features: recall, progress, highlight, edit (links survive), reload, reset
    await L.hash(base + '/' + s.chap)
    check(s.title + ' chapter renders its sections with recall items and callouts', (await L.count('.sec')) === s.secs && (await L.count('.sec-body .rc')) > 8 && (await L.count('.callout')) >= 2, [await L.count('.sec'), await L.count('.sec-body .rc')])
    await L.key('r'); const blur3 = await masked(L, '#s-' + s.rc + ' .rc'); await L.click('#s-' + s.rc + ' .rc')
    check('Recall Mode conceals and reveals ' + s.title + ' answers', blur3 && (await L.ev((id) => document.querySelector('#s-' + id + ' .rc').classList.contains('shown'), s.rc)), blur3)
    await L.key('r')
    await L.highlight(s.hl[0], s.hl[1], 'blue'); await L.click('#s-' + s.done + ' .tg.done')
    await L.editMode(true); await L.edit(s.edit, '<p>N3-E2E edit</p>'); await L.saved(); await L.editMode(false)
    const edited3 = await L.ev((id) => ({ text: document.querySelector('#s-' + id + ' .sec-body').textContent.includes('N3-E2E edit'), links: [...document.querySelectorAll('#s-' + id + ' .sec-body a.xref')].map((a) => a.getAttribute('data-xref') + ' ' + a.getAttribute('href')) }), s.edit)
    check('edited ' + s.title + ' section keeps its cross-links', edited3.text && edited3.links.includes(s.link), edited3)
    await L.reload()
    check(s.title + ' edit, highlight and progress persist across reload', (await L.text('#s-' + s.edit + ' .sec-body')).includes('N3-E2E edit') && (await L.marks(s.hl[0])).join() === 'blue:' + s.hl[1] && (await L.text('.chap-meta span')) === '1 / ' + s.secs + ' sections done', [await L.marks(s.hl[0]), await L.text('.chap-meta span')])
    L.page.once('dialog', (d) => d.accept())
    await L.menu('Reset Local Edits — this chapter'); await sleep(700)
    check('Reset Local Edits works on ' + s.title + ' and keeps highlight + progress', !(await L.text('#s-' + s.edit + ' .sec-body')).includes('N3-E2E edit') && (await L.marks(s.hl[0])).length === 1 && (await L.text('.chap-meta span')) === '1 / ' + s.secs + ' sections done')
    await L.click('#s-' + s.hl[0] + ' mark[data-hid]'); await sleep(150); await L.click('.hlpal .x')
    await L.click('#s-' + s.done + ' .tg.done')
    check(s.title + ' highlight and progress can be cleared', (await L.marks(s.hl[0])).length === 0 && (await L.text('.chap-meta span')) === '0 / ' + s.secs + ' sections done')
  }
  // cross-links between the new and the existing subjects: exact section, derived backlink, Back
  const hop3 = async (from, sec, prefix) => { await L.hash(from); await L.ev((id, p) => document.querySelector('#s-' + id + ' a.xref[data-xref^="' + p + '"]').click(), sec, prefix); await sleep(500); return L.ev(() => location.hash) }
  const back3 = (sec) => L.ev((id) => [...document.querySelectorAll('#s-' + id + ' .related a')].map((a) => a.textContent + ' ' + a.getAttribute('href')), sec)
  const X3 = [
    ['History → Geography', HIS + 'historical-geography/place-river', 'place-river', 'prelims/geography/', '#/study/prelims/geography/india-drainage/peninsular-rivers', 'peninsular-rivers', 'History & Culture'],
    ['Geography → Environment', '#/study/prelims/geography/climatology/atmosphere-layers', 'atmosphere-layers', 'prelims/environment/', '#/study/prelims/environment/climate-change/ozone', 'ozone', 'Geography'],
    ['Geography → Economy', '#/study/prelims/geography/population-demography/theories', 'theories', 'prelims/economy/', '#/study/prelims/economy/economic-thinkers/population-theories', 'population-theories', 'Geography'],
    ['Environment → Polity', '#/study/prelims/environment/environmental-laws/forest-rights-act', 'forest-rights-act', 'prelims/polity/', '#/study/prelims/polity/scheduled-tribal-areas/forest-rights-act-2006', 'forest-rights-act-2006', 'Environment & Ecology'],
    ['Environment → Science & Technology', '#/study/prelims/environment/waste-remediation/treatment-technologies', 'treatment-technologies', 'prelims/science-tech/', '#/study/prelims/science-tech/chemistry-daily-life/water-purification', 'water-purification', 'Environment & Ecology'],
    ['Science & Technology → Economy', '#/study/prelims/science-tech/computing-digital/blockchain', 'blockchain', 'prelims/economy/', '#/study/prelims/economy/money-rbi-monetary-policy/cbdc', 'cbdc', 'Science & Technology'],
    ['Science & Technology → Geography', '#/study/prelims/science-tech/energy-technologies/nuclear', 'nuclear', 'prelims/geography/', '#/study/prelims/geography/india-minerals-energy-industry/atomic-beach-minerals', 'atomic-beach-minerals', 'Science & Technology'],
  ]
  for (const [name, from, sec, prefix, to, toSec, subject] of X3) {
    const at3 = await hop3(from, sec, prefix); const rel3 = await back3(toSec)
    check(name + ' link opens the exact section, with a Related backlink', at3 === to && rel3.some((t) => t.includes(subject) && t.endsWith(from)), [at3, rel3.slice(0, 3)])
    await L.page.goBack(); await sleep(450)
    check(name + ': browser Back returns to the linking section', (await L.ev(() => location.hash)) === from)
  }
  check('existing subjects are not rewritten to receive the new backlinks', await L.ev(() => true) && !readFileSync('content/prelims/polity/chapters/scheduled-tribal-areas.md', 'utf8').includes('@prelims/environment'))
  await L.hash('#/study/prelims/geography/india-climate-soils-vegetation/soils')
  check('links into Agriculture and Mains stay plain text until those subjects exist', await L.ev(() => { const a = document.querySelector('#s-soils a.xref.pending'); return !!a && !a.getAttribute('href') && a.getAttribute('data-xref') === 'prelims/agriculture' }))
  await L.hash('#/pyqs?subject=science-tech&chapter=energy-technologies'); await sleep(350)
  const hub3 = await L.ev(() => ({ n: document.querySelectorAll('.pq').length, notes: [...document.querySelectorAll('.pq .pq-notes a')].map((a) => a.getAttribute('href')) }))
  check('PYQ Hub lists the new subjects and opens their exact sections', hub3.n > 10 && hub3.notes.some((h) => h === '#/study/prelims/science-tech/energy-technologies/hydrogen-fuel-cells'), [hub3.n, hub3.notes.slice(0, 3)])
  await L.hash(PARL)

  // reset
  section('Reset Local Edits')
  L.page.once('dialog', (d) => d.accept())
  await L.menu('Reset Local Edits — this chapter'); await sleep(700)
  const afterReset = await L.ev(() => ({ title: document.querySelector('#s-presiding-officers h2').textContent, edit: document.body.textContent.includes('E2E-ADDED') || document.body.textContent.includes('V1 EDITED'), toast: document.querySelector('.toast')?.textContent, meta: document.querySelector('.chap-meta span').textContent, status: document.querySelector('.chap-meta select').value }))
  check('original text and headings restored', afterReset.title === 'Presiding Officers' && !afterReset.edit, afterReset)
  check('highlight on original text is kept in place', (await L.marks('bills-types-and-procedure')).join() === 'yellow:All Money Bills are Financial Bills', await L.marks('bills-types-and-procedure'))
  check('progress, status and flags are kept', afterReset.meta === '2 / 9 sections done' && afterReset.status === 'revised' && (await L.ev(() => document.querySelector('#s-sessions-and-devices .tg.star').classList.contains('on'))), afterReset)
  check('user is told about highlights whose text was removed', /2 highlights on removed text/.test(afterReset.toast ?? ''), afterReset.toast)
  await L.hash('#/highlights')
  const hp = await L.ev(() => [...document.querySelectorAll('.hl-item')].map((e) => e.querySelector('p').textContent + ' ‖ ' + e.querySelector('small').textContent))
  check('unplaced highlights are kept and labelled, not misattached', hp.length === 3 && hp.filter((x) => x.includes('not in the current text')).length === 2, hp)
  await L.reload()
  check('reset state survives reload', (await L.count('.hl-item')) === 3 && (await L.idb('overrides')).length === 0)

  // ==========================================================================
  section('Navigation v2')
  await L.page.setViewport({ width: 1280, height: 860 })
  const hashNow = (d = L) => d.ev(() => location.hash)
  const h1 = (d = L) => d.text('h1.title')
  const homeLists = (d = L) => d.ev(() => Object.fromEntries([...document.querySelectorAll('.page section')].map((s) => [s.querySelector('h3').textContent, [...s.querySelectorAll('.row b')].map((b) => b.textContent)])))
  // v1 deep links
  await L.go('#/r/prelims/polity/parliament/budget-and-financial-procedure')
  check('v1 reader link opens the same section at its v2 address', (await hashNow()) === '#/study/prelims/polity/parliament/budget-and-financial-procedure' && (await L.ev(() => document.title)).startsWith('Parliament') && (await L.ev(() => { const t = document.getElementById('s-budget-and-financial-procedure').getBoundingClientRect().top; return t >= 0 && t < 200 })))
  await L.go('#/s/prelims/economy/pyq')
  check('v1 subject-tab link opens the same tab', (await hashNow()) === '#/study/prelims/economy?tab=pyq' && (await L.count('details.syn')) === 17)
  await L.go('#/progress')
  check('v1 Progress link opens Insights → Progress', (await hashNow()) === '#/insights/progress' && (await h1()) === 'Insights' && (await L.text('.tabs .on')) === 'Progress' && (await L.count('.stat')) === 6)
  await L.go('#/'); await L.hash('#/r/prelims/polity/judiciary'); const viaOld = await hashNow(); await L.page.goBack(); await sleep(400)
  check('a rewritten v1 link adds no extra history entry (Back returns in one step)', viaOld === '#/study/prelims/polity/judiciary' && ['#/', ''].includes(await hashNow()), [viaOld, await hashNow()])

  // desktop rail
  await L.go('#/')
  const rail = await L.ev(() => ({ items: [...document.querySelectorAll('.rail a, .rail button')].map((e) => e.querySelector('span').textContent).join('|'), tab: getComputedStyle(document.querySelector('.tabbar')).display, w: document.querySelector('.rail').getBoundingClientRect().width }))
  check('desktop: primary rail — Home, Study, PYQ Hub, Insights, Revision, Current Affairs, Highlights, Search; no tab bar', rail.items === 'Home|Study|PYQ Hub|Insights|Revision|Current Affairs|Highlights|Search' && rail.tab === 'none' && rail.w > 60, rail)
  const visited = []
  for (const label of ['Study', 'PYQ Hub', 'Insights', 'Highlights', 'Home']) {
    await L.ev((l) => [...document.querySelectorAll('.rail a')].find((a) => a.textContent === l).click(), label); await sleep(350)
    visited.push([await hashNow(), await h1(), await L.text('.rail a.on')].join(' '))
  }
  check('rail opens each surface at its route and marks it active', visited.join(' | ') === '#/study Study Study | #/pyqs PYQ Hub PYQ Hub | #/insights Insights Insights | #/highlights Highlights Highlights | #/ Home Home', visited)
  await L.ev(() => document.querySelector('.rail button').click()); await sleep(200)
  check('rail Search opens the palette', (await L.count('.palette input')) === 1)
  await L.page.keyboard.press('Escape'); await sleep(150)
  check('Home, PYQ Hub and Insights are shells: no explorer panel outside Study', (await L.ev(() => document.querySelector('.app').classList.contains('side-open'))) === false && (await L.count('.sidebar .x-tree')) === 0)
  await L.hash('#/pyqs')
  check('PYQ Hub is a full page of its own: filters and a result list', (await L.text('h1.title')) === 'PYQ Hub' && (await L.count('.pq-filters select')) >= 4 && (await L.count('.pqlist .pq')) === 40)

  // study explorer
  await L.hash('#/study')
  const lib = await L.ev(() => ({ open: document.querySelector('.app').classList.contains('side-open'), chapters: document.querySelectorAll('.sidebar .chap').length, stages: [...document.querySelectorAll('.x-stage > .x-row')].map((e) => e.textContent).join('|'), subjects: document.querySelectorAll('.x-subject').length, off: document.querySelectorAll('.x-row.off').length }))
  check('Study: explorer shows stages and subjects, no chapters until a subject is chosen', lib.open && lib.chapters === 0 && lib.stages === 'Prelims|Mains' && lib.subjects === 6 && lib.off === 2, lib)
  await L.ev(() => [...document.querySelectorAll('.x-stage > .x-row')].find((e) => e.textContent === 'Mains').click()); await sleep(250)
  check('Mains opens to its papers', (await L.ev(() => [...document.querySelectorAll('.x-paper > .x-row')].map((e) => e.textContent).join('|'))) === 'GS1|GS2|GS3|GS4')
  await L.hash('#/study/mains')
  check('stage route lists that stage only', (await L.ev(() => [...document.querySelectorAll('h2.sh')].map((e) => e.textContent).join('|'))) === 'Mains' && (await L.text('.crumbs')) === 'Study›Mains')
  await L.hash(PARL)
  const tree = await L.ev(() => ({ chapters: [...document.querySelectorAll('.x-tree .chap')].map((e) => e.querySelector('span').textContent), secs: document.querySelectorAll('.side-secs a').length, topics: document.querySelectorAll('.x-topic').length, openTopics: document.querySelectorAll('.x-topic > .kids').length, current: document.querySelector('.x-tree .chap[aria-current="page"] span')?.textContent }))
  check('explorer expands only the active branch (subject → topic → chapter → sections)', tree.chapters.join('|') === 'Union Executive|Parliament|Judiciary & Legal Services' && tree.secs === 9 && tree.topics === 6 && tree.openTopics === 1 && tree.current === 'Parliament', tree)
  await L.click('.twist[aria-label="Expand Economy & Social Development"]')
  const peek = await L.count('.x-topic')
  await L.hash('#/study/prelims/history-culture/mughals'); await sleep(200)
  check('another branch can be opened by hand; it folds away when the subject changes', peek === 12 && (await L.count('.x-topic')) === 6 && (await L.text('.x-tree .chap[aria-current="page"] span')) ?.startsWith('Mughals'), [peek, await L.count('.x-topic')])
  await L.key('s'); const hidden = await L.ev(() => !document.querySelector('.app').classList.contains('side-open') && getComputedStyle(document.querySelector('.main')).paddingLeft); await L.key('s')
  check('explorer panel collapses and returns (s)', hidden === '76px' && (await L.ev(() => getComputedStyle(document.querySelector('.main')).paddingLeft)) === '356px', hidden)

  // subject switcher, header Prev / Next / Related, breadcrumbs
  await L.hash(PARL)
  await L.click('.switch-head')
  const opts = await L.ev(() => [...document.querySelectorAll('.switcher a[role="option"]')].map((a) => a.childNodes[0].textContent).join('|'))
  await L.ev(() => [...document.querySelectorAll('.switcher a[role="option"]')].find((a) => a.textContent.startsWith('Economy')).click()); await sleep(450)
  check('subject switcher lists every subject and resumes the chapter last read there', opts === 'Polity|Economy & Social Development|History & Culture|Geography|Environment & Ecology|Science & Technology' && (await hashNow()).startsWith('#/study/prelims/economy/') && (await L.count('.switcher')) === 0 && (await L.count('.sec')) > 3, [opts, await hashNow()])
  await L.page.goBack(); await sleep(400)
  check('browser Back returns from a subject switch', (await hashNow()) === PARL)
  await L.click('.crumbs .switch-crumb'); const crumbSw = await L.count('.switcher a[role="option"]'); await L.page.keyboard.press('Escape'); await sleep(150)
  check('breadcrumb carries the compact switcher; Esc closes it', crumbSw === 6 && (await L.count('.switcher')) === 0)
  check('breadcrumbs: stage › subject › chapter, each a link', (await L.ev(() => [...document.querySelectorAll('.crumbs a')].map((a) => a.textContent + ' ' + a.getAttribute('href')).join(' | '))) === 'Prelims #/study/prelims | Polity #/study/prelims/polity | Parliament #/study/prelims/polity/parliament')
  await L.click('button[aria-label="Next chapter"]'); const nx = await L.ev(() => document.title); await L.click('button[aria-label="Previous chapter"]')
  check('header Previous / Next step through the subject', nx.startsWith('Judiciary') && (await L.ev(() => document.title)).startsWith('Parliament'), nx)
  await L.hash('#/study/prelims/polity/political-theory'); check('first chapter: Previous is disabled', await L.ev(() => document.querySelector('button[aria-label="Previous chapter"]').disabled))
  await L.hash('#/study/prelims/economy/budget-fiscal-policy/fiscal-federalism'); await sleep(300)
  await L.click('button[aria-label^="Related"]')
  const relLinks = await L.ev(() => [...document.querySelectorAll('.relmenu a')].map((a) => a.getAttribute('href')))
  await L.ev(() => document.querySelector('.relmenu a[href="#/study/prelims/polity/constitutional-bodies/finance-commission"]').click()); await sleep(450)
  check('header Related lists cross-links for the chapter and section, and opens them', relLinks.length >= 2 && (await hashNow()) === '#/study/prelims/polity/constitutional-bodies/finance-commission' && (await L.count('.relmenu')) === 0, relLinks)

  // favourites and recent destinations
  await L.hash(PARL); await L.click('.chap-meta .fav')
  await L.hash('#/study/prelims/economy'); await L.click('.chap-meta .fav')
  await L.hash('#/study/prelims/history-culture/mughals')
  await L.reload(); await L.hash('#/')
  const lists = await homeLists()
  check('favourites (a chapter and a subject) persist and are listed on Home', lists.Favourites?.join('|') === 'Parliament|Economy & Social Development', lists)
  check('recent destinations: newest first, no duplicates, at most 5 on Home', lists.Recent?.[0].startsWith('Mughals') && lists.Recent.length <= 5 && new Set(lists.Recent).size === lists.Recent.length && lists.Recent.includes('Parliament'), lists.Recent)
  await L.ev(() => [...document.querySelectorAll('.page section')].find((s) => s.querySelector('h3').textContent === 'Favourites').querySelector('a.row').click()); await sleep(400)
  check('a favourite opens its chapter; the explorer pins favourites', (await hashNow()) === PARL && (await L.ev(() => [...document.querySelectorAll('.x-pinned .chap span')].map((e) => e.textContent).join('|'))) === 'Parliament|Economy & Social Development')
  await L.click('.chap-meta .fav'); await L.hash('#/')
  check('removing a favourite takes it off Home', (await homeLists()).Favourites?.join('|') === 'Economy & Social Development')
  check('navigation preferences live in the existing preferences store, not a new one', await L.ev(() => { const p = JSON.parse(localStorage.getItem('upsc-prefs')); return p.favourites.length === 1 && p.favourites[0].kind === 'subject' && p.favourites[0].subjectId === 'economy' && p.recents[0].target.chapterId === 'parliament' && !!Date.parse(p.recents[0].visitedAt) }))

  // Ctrl/Cmd+K
  await L.ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))); await sleep(250)
  const groups = await L.ev(() => [...document.querySelectorAll('.palette li.grp')].map((e) => e.textContent).join('|'))
  check('Ctrl+K with no query offers Recent, Favourites, Current Affairs and every subject', groups === 'Recent|Favourites|Current Affairs|Subjects' && (await L.ev(() => [...document.querySelectorAll('.palette li:not(.grp) b')].slice(-6).map((b) => b.textContent).join('|'))) === 'Polity|Economy & Social Development|History & Culture|Geography|Environment & Ecology|Science & Technology', groups)
  await L.page.keyboard.press('Escape'); await sleep(150)
  const sSub = await search('history')
  check('Ctrl+K jumps to a subject by name', sSub[0] === 'History & Culture', sSub.slice(0, 3))
  await L.ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))); await sleep(250)
  await L.page.keyboard.type('economy soc'); await sleep(300); await L.page.keyboard.press('Enter'); await sleep(400)
  check('Cmd+K + Enter opens the subject', (await hashNow()) === '#/study/prelims/economy' && (await L.count('.palette')) === 0)

  // tablet
  await L.page.setViewport({ width: 768, height: 1024 }); await L.go(PARL)
  const tab = await L.ev(() => ({ rail: getComputedStyle(document.querySelector('.rail')).display, railW: document.querySelector('.rail').getBoundingClientRect().width, tabbar: getComputedStyle(document.querySelector('.tabbar')).display, open: document.querySelector('.app').classList.contains('side-open'), pad: getComputedStyle(document.querySelector('.main')).paddingLeft }))
  await L.click('button[aria-label="Study explorer"]'); await sleep(350)
  const drawer = await L.ev(() => { const r = document.querySelector('.sidebar').getBoundingClientRect(); return { left: r.left, top: r.top, bottom: r.bottom, h: innerHeight, scrim: getComputedStyle(document.querySelector('.scrim')).display } })
  await L.ev(() => [...document.querySelectorAll('.x-tree .chap')].find((a) => a.textContent.includes('Judiciary')).click()); await sleep(450)
  check('tablet: rail stays, explorer is a drawer beside it that closes on navigation', tab.rail === 'flex' && tab.railW === 64 && tab.tabbar === 'none' && !tab.open && tab.pad === '64px' && drawer.left === 64 && drawer.top === 0 && drawer.bottom === drawer.h && drawer.scrim === 'block' && (await hashNow()) === '#/study/prelims/polity/judiciary' && !(await L.ev(() => document.querySelector('.app').classList.contains('side-open'))), [tab, drawer])
  await L.page.screenshot({ path: join(OUT, 'tablet.png') })

  // phone
  await L.page.setViewport({ width: 375, height: 812 }); await L.go('#/')
  const bar = await L.ev(() => ({ items: [...document.querySelectorAll('.tabbar a, .tabbar button')].map((e) => e.textContent).join('|'), rail: getComputedStyle(document.querySelector('.rail')).display, r: document.querySelector('.tabbar').getBoundingClientRect().toJSON(), h: innerHeight, on: document.querySelector('.tabbar .on')?.textContent }))
  check('phone: bottom bar — Home, Study, PYQs, Insights, More; no rail', bar.items === 'Home|Study|PYQs|Insights|More' && bar.rail === 'none' && bar.r.bottom === bar.h && bar.r.left === 0 && bar.r.width === 375 && bar.on === 'Home', bar)
  await L.page.screenshot({ path: join(OUT, 'phone-home.png') })
  const tabs = []
  for (const label of ['Study', 'PYQs', 'Insights']) { await L.ev((l) => [...document.querySelectorAll('.tabbar a')].find((a) => a.textContent === l).click(), label); await sleep(350); tabs.push([await hashNow(), await L.text('.tabbar .on')].join(' ')) }
  check('phone: tabs open their routes and show the active one', tabs.join(' | ') === '#/study Study | #/pyqs PYQs | #/insights Insights', tabs)
  await L.click('.tabbar button')
  const more = await L.ev(() => { const m = document.querySelector('.menu.more'); const r = m.getBoundingClientRect(); const vis = [...m.querySelectorAll('a, button')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.childNodes[1]?.textContent ?? e.textContent); return { vis, fits: r.left >= 0 && r.right <= innerWidth && r.bottom <= document.querySelector('.tabbar').getBoundingClientRect().top && r.top >= 0 } })
  check('phone: More holds Highlights, Revision, Current Affairs, Settings, theme and account/sync, above the bar', more.fits && ['Highlights', 'Revision', 'Current Affairs', 'Settings', 'Account & sync'].every((x) => more.vis.includes(x)) && more.vis.some((x) => / theme$/.test(x)), more)
  await L.ev(() => [...document.querySelectorAll('.menu.more a')].find((a) => a.textContent === 'Highlights').click()); await sleep(350)
  check('phone: Highlights opens from More and More is marked active', (await hashNow()) === '#/highlights' && (await L.count('.menu.more')) === 0 && (await L.text('.tabbar .on')) === 'More')
  await L.hash(PARL)
  await L.click('button[aria-label="Study explorer"]'); await sleep(350)
  const sheet = await L.ev(() => { const r = document.querySelector('.sidebar').getBoundingClientRect(); return { left: r.left, w: r.width, top: r.top, bottom: r.bottom, h: innerHeight, head: !!document.querySelector('.sidebar .switch-head'), secs: document.querySelectorAll('.sidebar .side-secs a').length } })
  await L.page.screenshot({ path: join(OUT, 'phone-explorer.png') })
  await L.ev(() => document.querySelector('.sidebar .side-secs a[href$="/presiding-officers"]').click()); await sleep(450)
  check('phone: explorer is a bottom sheet (not the desktop sidebar) and closes on navigation', sheet.left === 0 && sheet.w === 375 && sheet.top > 120 && sheet.bottom === sheet.h && sheet.head && sheet.secs === 9 && (await hashNow()) === PARL + '/presiding-officers' && !(await L.ev(() => document.querySelector('.app').classList.contains('side-open'))), sheet)
  check('phone: chapter Previous / Next remain at the foot of the chapter', (await L.count('.pn a')) === 2 && (await L.ev(() => getComputedStyle(document.querySelector('.pager')).display)) === 'none')
  await L.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  check('reduced motion: navigation transitions are switched off', await L.ev(() => parseFloat(getComputedStyle(document.querySelector('.sidebar')).transitionDuration) < 0.001 && parseFloat(getComputedStyle(document.querySelector('.tabbar svg')).transitionDuration) < 0.001))
  await L.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  await L.page.setViewport({ width: 1280, height: 860 }); await L.go(PARL)

  // ==========================================================================
  section('PYQ Hub + universal cross-links')
  const pqSel = async (label, value) => { await L.ev((l, v) => { const s = document.querySelector(`.pq-filters select[aria-label="${l}"]`); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })) }, label, value); await sleep(300) }
  const pqType = async (q) => { await L.ev((q) => { const i = document.querySelector('.pq-q'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, q); i.dispatchEvent(new Event('input', { bubbles: true })) }, q); await sleep(350) }
  const pqCount = () => L.text('.pq-count')
  const pqIds = () => L.ev(() => [...document.querySelectorAll('.pq .pq-id')].map((e) => e.textContent))
  const pqPalette = async (q) => { await L.ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))); await sleep(200); return L.ev(async (q) => { const i = document.querySelector('.palette input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, q); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 250)); return [...document.querySelectorAll('.palette li:not(.grp)')].map((li) => (li.querySelector('.kind')?.textContent ?? '?') + '|' + li.querySelector('b').textContent) }, q) }
  await L.go('#/pyqs')
  const pqAll = await pqIds()
  check('hub opens on Prelims with every canonical ID of the imported subjects, newest first, 40 at a time', (await pqCount()) === '2146 questions' && (await L.text('.stat')).includes('2146') && pqAll.length === 40 && new Set(pqAll).size === 40 && pqAll[0].startsWith('UPSC-CSE-2026') && (await L.count('.tabs')) === 0, [await pqCount(), pqAll[0]])
  check('no question text or one-liner is shown, and none is faked', (await L.count('.pq-one')) === 0 && !/one-liner|coming soon|placeholder|lorem/i.test(await L.text('.pyqhub')) && (await L.text('.lead')).includes('Question text is not in the library'))
  await L.click('.pq-more')
  check('Show more extends the list instead of rendering everything', (await L.count('.pq')) === 120)
  await pqSel('Exam', 'UPPCS'); const pqUppcs = await pqCount()
  await pqSel('Year', '2019'); await pqSel('Subject', 'polity'); await pqSel('Topic or chapter', 'parliament')
  const pqFiltered = { hash: await hashNow(), count: await pqCount(), ids: await pqIds(), sections: await L.count('.pq-filters select[aria-label="Section"] option') }
  check('filters: exam, year, subject, chapter narrow the list and live in the address', pqUppcs === '855 of 2146 questions' && pqFiltered.hash === '#/pyqs?exam=UPPCS&year=2019&subject=polity&chapter=parliament' && pqFiltered.ids.length > 0 && pqFiltered.ids.every((id) => id.startsWith('UPPCS-2019-')) && pqFiltered.sections > 2, pqFiltered)
  await pqSel('Exam', ''); await pqSel('Year', ''); await pqSel('Section', 'parliamentary-committees')
  check('section filter: only questions recorded against that section', (await hashNow()) === '#/pyqs?subject=polity&chapter=parliament&section=parliamentary-committees' && (await L.ev(() => [...document.querySelectorAll('.pq')].every((li) => li.querySelector('.pq-notes').textContent.includes('Parliamentary Committees')))) && (await L.count('.pq')) > 0)
  await L.ev(() => [...document.querySelectorAll('.pq-filters button')].find((b) => b.textContent === 'Clear filters').click()); await sleep(300)
  check('Clear filters returns to the whole hub', (await hashNow()) === '#/pyqs' && (await pqCount()) === '2146 questions')
  await pqSel('Status', 'review-required')
  const pqReview = await L.ev(() => ({ n: document.querySelectorAll('.pq').length, flagged: [...document.querySelectorAll('.pq')].every((li) => li.dataset.status === 'review-required' && li.querySelector('.chip.warn')?.textContent === 'Review required' && li.querySelector('.pq-warn').textContent.startsWith('Review required')) }))
  check('review-required questions stay flagged, with the reason', pqReview.n === 40 && pqReview.flagged && (await pqCount()) === '105 of 2146 questions', [pqReview, await pqCount()])
  await L.hash('#/pyqs'); await pqType('finance commission')
  const pqSearch = { hash: await hashNow(), n: await L.count('.pq'), all: await L.ev(() => [...document.querySelectorAll('.pq')].every((li) => /finance commission/i.test(li.textContent))) }
  check('hub search by concept / topic', pqSearch.hash === '#/pyqs?q=finance+commission' && pqSearch.n >= 8 && pqSearch.all, pqSearch)
  await pqType('UPSC-CSE-2024-GS1-Q066')
  const pqOne = await L.ev(() => { const li = document.querySelector('.pq'); return { n: document.querySelectorAll('.pq').length, id: li.querySelector('.pq-id').textContent, warn: li.querySelector('.pq-warn')?.textContent ?? '', tags: li.querySelector('.pq-tags')?.textContent ?? '', notes: [...li.querySelectorAll('.pq-notes a')].map((a) => a.getAttribute('href')) } })
  check('hub search by PYQ ID: the record shows its demand, its warning and its notes', pqOne.n === 1 && pqOne.id === 'UPSC-CSE-2024-GS1-Q066' && pqOne.warn.includes('EMPTY_STATEMENT') && pqOne.tags.includes('Nature of amending power') && pqOne.notes.includes('#/study/prelims/polity/amendments-basic-structure/article-368-procedure'), pqOne)
  const pqHubAt = await hashNow()
  await L.ev(() => document.querySelector('.pq-notes a').click()); await sleep(500)
  const pqDest = await L.ev(() => ({ hash: location.hash, top: Math.round(document.getElementById('s-article-368-procedure').getBoundingClientRect().top) }))
  await L.page.goBack(); await sleep(500)
  check('Open related notes lands on the exact section; Back returns to the hub as it was', pqDest.hash === '#/study/prelims/polity/amendments-basic-structure/article-368-procedure' && pqDest.top >= 0 && pqDest.top < 200 && (await hashNow()) === pqHubAt && (await pqIds()).join() === 'UPSC-CSE-2024-GS1-Q066', pqDest)

  // notes → PYQs
  await L.hash('#/study/prelims/polity/amendments-basic-structure/article-368-procedure'); await sleep(300)
  const pqLink = await L.ev(() => { const a = document.querySelector('#s-article-368-procedure .related a.pq'); return { text: a?.textContent, href: a?.getAttribute('href'), inBody: !!document.querySelector('#s-article-368-procedure .sec-body a.pq') } })
  const pqReaderAt = await hashNow()
  await L.ev(() => document.querySelector('#s-article-368-procedure .related a.pq').click()); await sleep(500)
  const pqFromNote = { hash: await hashNow(), count: await pqCount(), ids: await pqIds() }
  await L.page.goBack(); await sleep(500)
  check('a section lists its PYQs: the link opens the hub filtered to that section, and Back returns to the notes', /^\d+ PYQs$/.test(pqLink.text) && !pqLink.inBody && pqFromNote.hash === '#/pyqs?subject=polity&chapter=amendments-basic-structure&section=article-368-procedure' && pqFromNote.count.startsWith(parseInt(pqLink.text) + ' of ') && pqFromNote.ids.includes('UPSC-CSE-2024-GS1-Q066') && (await hashNow()) === pqReaderAt, [pqLink, pqFromNote])
  check('chapter foot lists the chapter\'s PYQs too', /^\d+ PYQs$/.test(await L.text('.page > .related a.pq')) && (await L.ev(() => document.querySelector('.page > .related a.pq').getAttribute('href'))) === '#/pyqs?subject=polity&chapter=amendments-basic-structure')
  // header Related: grouped, limited, with the PYQs
  await L.hash('#/study/prelims/polity/constitutional-bodies/finance-commission'); await sleep(300)
  await L.click('button[aria-label^="Related"]')
  const pqPanel = await L.ev(() => ({ groups: [...document.querySelectorAll('.relmenu .related b')].map((b) => b.textContent), links: [...document.querySelectorAll('.relmenu .related a:not(.pq)')].map((a) => a.textContent), pq: document.querySelector('.relmenu a.pq')?.textContent }))
  await L.page.keyboard.press('Escape'); await sleep(150)
  check('header Related groups backlinks by subject and shows the PYQs', pqPanel.groups.includes('Other subjects') && pqPanel.groups.includes('PYQs') && pqPanel.links.some((t) => t.includes('Economy') && t.includes('Fiscal Federalism')) && pqPanel.links.some((t) => t.includes('History & Culture')) && pqPanel.links.length <= 8 && /^\d+ PYQs$/.test(pqPanel.pq), pqPanel)
  await L.hash('#/study/prelims/polity/governance-regulators/aadhaar-and-uidai'); await sleep(300)
  check('new Economy → Polity links give Polity their backlinks without touching its text', (await L.ev(() => [...document.querySelectorAll('#s-aadhaar-and-uidai .related a')].some((a) => a.getAttribute('href') === '#/study/prelims/economy/digital-payments/npci-products'))) && (await L.ev(() => document.querySelector('#s-aadhaar-and-uidai .sec-body a.xref[data-xref^="prelims/economy"]') === null)))

  // user flags
  await L.hash('#/pyqs?id=UPSC-CSE-2019-GS1-Q045'); await sleep(300)
  const pqNoMine = await L.count('.pq-filters select[aria-label="My flags"]')
  await L.click('.pq button[aria-label="Mark seen"]'); await L.click('.pq button[aria-label="Mark difficult"]')
  await L.hash('#/pyqs'); await pqSel('My flags', 'difficult')
  const pqMine = { count: await pqCount(), ids: await pqIds(), row: (await L.idb('pyqUserState'))[0] }
  check('Mark Seen / Difficult: saved on this device, and filterable once any flag exists', pqNoMine === 0 && pqMine.count === '1 of 2146 questions' && pqMine.ids.join() === 'UPSC-CSE-2019-GS1-Q045' && pqMine.row.pyqId === 'UPSC-CSE-2019-GS1-Q045' && pqMine.row.seen === true && pqMine.row.difficult === true && Object.keys(pqMine.row).sort().join() === 'difficult,pyqId,seen,st,updatedAt', pqMine)
  await L.reload()
  check('flags survive a reload; clearing one updates the list', (await L.ev(() => document.querySelector('.pq button[aria-label="Mark seen"]').getAttribute('aria-pressed'))) === 'true' && (await L.ev(() => document.querySelector('.pq').classList.contains('is-seen'))))
  await L.click('.pq button[aria-label="Mark difficult"]'); await sleep(200)
  check('a cleared flag leaves the filtered list', (await pqCount()) === '0 of 2146 questions' && (await L.text('.pyqhub .empty')).startsWith('No questions match'))
  await pqSel('My flags', 'revised'); await L.hash('#/pyqs?id=UPSC-CSE-2019-GS1-Q045'); await L.click('.pq button[aria-label="Mark revised"]')
  check('Mark Revised', (await L.idb('pyqUserState'))[0].revised === true && (await L.idb('pyqUserState'))[0].difficult === undefined)

  // search
  const pqById = await pqPalette('2024 q66')
  await L.ev(() => [...document.querySelectorAll('.palette li:not(.grp)')].find((li) => li.textContent.startsWith('UPSC-CSE-2024-GS1-Q066')).click()); await sleep(400)
  check('Ctrl+K finds a question by ID and opens its record', pqById[0] === 'PYQ|UPSC-CSE-2024-GS1-Q066' && pqById.every((t) => t.startsWith('PYQ|') && t.includes('-2024-GS1-Q066')) && (await hashNow()) === '#/pyqs?id=UPSC-CSE-2024-GS1-Q066' && (await pqIds()).join() === 'UPSC-CSE-2024-GS1-Q066', pqById)
  const pqByTag = await pqPalette('tenth schedule')
  await L.ev(() => [...document.querySelectorAll('.palette li:not(.grp)')].find((li) => li.querySelector('.kind').textContent === 'PYQ theme').click()); await sleep(400)
  const pqTagHub = { hash: await hashNow(), n: await L.count('.pq'), all: await L.ev(() => [...document.querySelectorAll('.pq')].every((li) => li.querySelector('.pq-tags').textContent.includes('Tenth Schedule'))) }
  check('Ctrl+K finds PYQ demand themes after the notes, and opens them in the hub', pqByTag[0] === 'Section|Tenth Schedule — Anti-Defection' && pqByTag.includes('PYQ theme|Anti-defection / Tenth Schedule') && pqTagHub.hash.startsWith('#/pyqs?subject=polity&chapter=parts-schedules&q=') && pqTagHub.n === 3 && pqTagHub.all, [pqByTag.slice(0, 4), pqTagHub])
  const pqKinds = await pqPalette('economy'); await L.page.keyboard.press('Escape'); await sleep(150)
  const pqKinds2 = await pqPalette('fiscal federalism'); await L.page.keyboard.press('Escape'); await sleep(150)
  const pqKinds3 = await pqPalette('Article 368'); await L.page.keyboard.press('Escape'); await sleep(150)
  check('search results say what they are: subject, chapter, section, text, related, PYQ', pqKinds[0] === 'Subject|Economy & Social Development' && pqKinds2[0] === 'Section|Fiscal Federalism' && pqKinds2.some((t) => t.startsWith('Related|Finance Commission')) && pqKinds3[0] === 'Section|Article 368 — Procedure' && pqKinds3.includes('In text|Three Routes of Change') && pqKinds.includes('Chapter|British Administration, Economy & Policies') && ![...pqKinds, ...pqKinds2, ...pqKinds3].some((t) => t.startsWith('?|')), [pqKinds.slice(0, 3), pqKinds2.slice(0, 4), pqKinds3.slice(0, 3)])

  // subject PYQ tab ↔ hub, phone
  await L.hash('#/study/prelims/polity?tab=pyq')
  const pqChip = await L.ev(() => { const chips = [...document.querySelectorAll('details.syn a.chip')]; return { n: chips.length, first: chips[0].getAttribute('href'), flagged: chips.filter((c) => c.classList.contains('warn')).length } })
  check('subject PYQ tab: every reference opens its hub record; flagged ones are marked', pqChip.n > 390 && pqChip.first.startsWith('#/pyqs?id=') && pqChip.flagged >= 20, pqChip)
  await L.page.setViewport({ width: 375, height: 812 }); await L.go('#/pyqs?subject=polity&chapter=parliament')
  const pqPhone = await L.ev(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, rows: document.querySelectorAll('.pq').length, tab: document.querySelector('.tabbar .on')?.textContent, acts: [...document.querySelectorAll('.pq')[0].querySelectorAll('.pq-acts button')].every((b) => b.getBoundingClientRect().right <= innerWidth) }))
  await L.page.screenshot({ path: join(OUT, 'phone-pyqs.png') })
  await L.ev(() => document.querySelector('.pq-notes a').click()); await sleep(450)
  const pqPhoneReader = await hashNow()
  await L.click('.tabbar button'); await L.ev(() => [...document.querySelectorAll('.menu.more button')].find((b) => b.textContent.includes('Related notes')).click()); await sleep(300)
  const pqPhoneRel = await L.ev(() => { const m = document.querySelector('.relmenu'); const r = m?.getBoundingClientRect(); return { fits: !!r && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, pq: !!m?.querySelector('a.pq') } })
  await L.page.keyboard.press('Escape'); await L.page.goBack(); await sleep(450)
  check('phone: hub fits, flags are reachable, notes open and Back returns; Related is in More', !pqPhone.overflow && pqPhone.rows > 10 && pqPhone.tab === 'PYQs' && pqPhone.acts && pqPhoneReader.startsWith('#/study/prelims/polity/parliament') && pqPhoneRel.fits && pqPhoneRel.pq && (await hashNow()) === '#/pyqs?subject=polity&chapter=parliament', [pqPhone, pqPhoneReader, pqPhoneRel])
  await L.page.setViewport({ width: 1280, height: 860 })
  await L.go('#/pyqs?id=UPSC-CSE-2019-GS1-Q045'); await L.click('.pq button[aria-label="Mark seen"]'); await L.click('.pq button[aria-label="Mark revised"]')
  await L.page.screenshot({ path: join(OUT, 'pyq-hub.png') })
  await L.go(PARL)

  // ==========================================================================
  section('Study timer (local-only)')
  await L.go(PARL)
  check('idle: Start is offered in the reader header', (await L.count('button[aria-label="Start study timer"]')) === 1 && (await L.count('.tchip')) === 0)
  await L.hash('#/insights')
  check('idle: nothing to time outside the reader, so no Start there', (await L.count('button[aria-label="Start study timer"]')) === 0)
  await L.hash(PARL)
  await L.click('button[aria-label="Start study timer"]'); await sleep(2300)
  const run1 = await activeRow(L)
  check('Start: the header shows a running hh:mm:ss clock in place of Start', /^\d\d:\d\d:\d\d$/.test(await L.text('.ttime time')) && (await secs(L)) >= 2 && (await L.count('button[aria-label="Start study timer"]')) === 0, await L.text('.ttime time'))
  check('the timer inherits the reader context (stage, subject, topic, chapter)', run1?.state === 'running' && run1.currentContext.ref.kind === 'chapter' && run1.currentContext.ref.stage === 'prelims' && run1.currentContext.ref.subjectId === 'polity' && run1.currentContext.ref.chapterId === 'parliament' && !!run1.currentContext.ref.topicId && run1.currentContext.subjectTitle === 'Polity' && run1.currentContext.chapterTitle === 'Parliament' && !!run1.currentContext.topicTitle, run1?.currentContext)
  check('local-first: already in IndexedDB and in the sync queue', (await L.idb('outbox')).some((o) => o.id === 'run~active') && run1.ownerDeviceId === (await L.ev(() => localStorage.getItem('upsc-device'))))
  await L.click('.ttime')
  const pop = await L.ev(() => ({ path: document.querySelector('.tp-path')?.textContent, ops: [...document.querySelectorAll('.tp-ops button')].map((b) => b.textContent).join('|'), open: !!document.querySelector('.timer-pop a') }))
  await L.page.keyboard.press('Escape'); await sleep(150)
  check('timer panel: Prelims → Polity → Parliament, Pause and Stop; Esc closes it', pop.path === 'Prelims → Polity → Parliament' && pop.ops === 'Pause|Stop' && !pop.open && (await L.count('.timer-pop')) === 0, pop)
  const t1 = await secs(L)
  await L.reload()
  check('refresh: the running timer is recovered and has kept counting', (await secs(L)) >= t1 && (await activeRow(L)).sessionId === run1.sessionId && (await activeRow(L)).state === 'running', [t1, await secs(L)])
  await L.hash('#/study/prelims/economy/inflation'); await sleep(1200)
  const run2 = await activeRow(L)
  check('changing chapter: the span is closed with its real duration, a new one starts, the clock runs on', (await L.count('.tchip')) === 1 && run2.sessionId === run1.sessionId && run2.state === 'running' && run2.completedSpans.length === 1 && run2.completedSpans[0].context.ref.chapterId === 'parliament' && run2.completedSpans[0].durationMs >= 2000 && run2.currentContext.ref.subjectId === 'economy' && run2.currentContext.ref.chapterId === 'inflation' && (await secs(L)) >= t1, run2)
  await L.hash('#/insights'); await sleep(300)
  check('leaving the reader keeps the one timer on its chapter', (await L.count('.tchip')) === 1 && (await activeRow(L)).completedSpans.length === 1 && (await L.ev(() => document.querySelector('.ttime').title)) === 'Prelims → Economy & Social Development → Inflation & Price Indices', await L.ev(() => document.querySelector('.ttime')?.title))
  await L.hash('#/study/prelims/economy/inflation')
  await L.click('button[aria-label="Pause timer"]'); const p0 = await secs(L); await sleep(1700)
  check('Pause: the clock stops', (await secs(L)) === p0 && (await L.count('.tchip.paused')) === 1 && (await activeRow(L)).state === 'paused')
  await L.reload()
  check('a paused timer survives a refresh and still counts nothing', (await secs(L)) === p0 && (await L.count('.tchip.paused')) === 1)
  await L.click('button[aria-label="Resume timer"]'); await sleep(1300)
  check('Resume: counting again', (await secs(L)) > p0 && (await L.count('.tchip.paused')) === 0)
  await L.page.setViewport({ width: 375, height: 812 }); await sleep(300)
  await L.click('.ttime'); await sleep(200)
  const phoneTimer = await L.ev(() => { const r = document.querySelector('.timer-pop').getBoundingClientRect(); return { fits: r.left >= 0 && r.right <= innerWidth, ops: document.querySelectorAll('.tp-ops button').length, overflow: document.documentElement.scrollWidth > innerWidth + 1, chip: document.querySelector('.tchip').getBoundingClientRect().right <= innerWidth } })
  check('phone: the running timer fits the header; Pause and Stop are in its panel', phoneTimer.fits && phoneTimer.ops === 2 && !phoneTimer.overflow && phoneTimer.chip, phoneTimer)
  await L.page.screenshot({ path: join(OUT, 'phone-timer.png') })
  await L.page.keyboard.press('Escape'); await L.page.setViewport({ width: 1280, height: 860 }); await sleep(300)
  await L.page.screenshot({ path: join(OUT, 'desktop-timer.png') })
  await L.click('button[aria-label="Stop timer"]'); await sleep(500)
  const ses1 = await L.idb('studySessions')
  const done1 = ses1[0]
  check('Stop: one StudySession, built from the spans', ses1.length === 1 && done1.id === run1.sessionId && done1.source === 'timer' && done1.spans.map((x) => x.context.ref.chapterId).join() === 'parliament,inflation,inflation' && done1.durationMs === done1.spans.reduce((n, x) => n + x.durationMs, 0), done1)
  check('paused time is not in the session', done1.durationMs < Date.parse(done1.endedAt) - Date.parse(done1.startedAt) - 1500, [done1.durationMs, Date.parse(done1.endedAt) - Date.parse(done1.startedAt)])
  check('session records the IANA timezone, device and timestamps', done1.timeZone === (await L.ev(() => Intl.DateTimeFormat().resolvedOptions().timeZone)) && done1.createdDeviceId === run1.ownerDeviceId && !!Date.parse(done1.createdAt) && done1.spans.every((x) => Date.parse(x.endedAt) > Date.parse(x.startedAt)))
  check('the timer is cleared, Start is back, and the user is told', (await L.count('.tchip')) === 0 && (await L.count('button[aria-label="Start study timer"]')) === 1 && !(await activeRow(L)).state && /^Session saved/.test(await L.text('.toast')), await L.text('.toast'))
  check('session and timer state are queued for sync; no running total is stored', (await L.idb('outbox')).filter((o) => o.id === 'ses~' + done1.id || o.id === 'run~active').length === 2 && !/total|minutes/i.test(JSON.stringify(await L.idb('kv')) + (await L.ev(() => Object.keys(localStorage).join()))))
  await L.reload()
  check('the session survives a refresh unchanged', JSON.stringify(await L.idb('studySessions')) === JSON.stringify(ses1) && (await L.count('.tchip')) === 0)
  // browser closed with the timer running: the stored state is all there is
  await L.click('button[aria-label="Start study timer"]'); await sleep(400)
  await L.page.goto(L.base + 'manifest.webmanifest') // the app is gone; what follows is what a later launch finds on disk
  await L.ev(() => new Promise((res) => { const q = indexedDB.open('upsc-notes'); q.onsuccess = () => { const db = q.result; const st = db.transaction('activeStudySession', 'readwrite').objectStore('activeStudySession'); const g = st.get('active'); g.onsuccess = () => { const a = g.result; const ago = new Date(Date.now() - 2 * 3600000).toISOString(); st.put({ ...a, startedAt: ago, currentSpanStartedAt: ago }, 'active').onsuccess = () => { db.close(); localStorage.setItem('upsc-timer-seen', String(Date.now() - 3600000)); res() } } } }))
  await L.go('#/study/prelims/economy/inflation')
  const awayBar = await L.ev(() => ({ text: document.querySelector('.tbanner')?.textContent ?? '', buttons: [...document.querySelectorAll('.tbanner button')].map((b) => b.textContent.replace(/ at .*/, ' at')).join('|') }))
  check('reopened after an hour: the timer was recovered from durable state, with the full elapsed time', (await secs(L)) >= 7200 && (await activeRow(L)).state === 'running', await secs(L))
  check('…and the unattended hour is offered back: Keep the time / Stop at <last open>', awayBar.text.includes('Timer kept running') && awayBar.buttons === 'Keep the time|Stop at', awayBar)
  await L.ev(() => [...document.querySelectorAll('.tbanner button')].find((b) => b.textContent.startsWith('Stop at')).click()); await sleep(500)
  const ses2 = await L.idb('studySessions')
  const rec = ses2.find((x) => x.id !== done1.id)
  check('"Stop at": a recovered session ending when the app was last open', ses2.length === 2 && rec?.source === 'recovered' && Math.abs(rec.durationMs - 3600000) < 5000 && (await L.count('.tbanner')) === 0 && (await L.count('.tchip')) === 0, rec)
  check('the earlier session was not touched', JSON.stringify(ses2.find((x) => x.id === done1.id)) === JSON.stringify(done1))

  // ==========================================================================
  section('Insights (derived from study sessions)')
  await L.page.setViewport({ width: 1280, height: 860 })
  const chip = async (d, text) => { await d.ev((t) => [...document.querySelectorAll('.filters .chip')].find((b) => b.textContent === t).click(), text); await sleep(250) }
  const pick = async (label, value) => { await L.ev((l, v) => { const s = document.querySelector(`select[aria-label^="${l}"]`); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, v); s.dispatchEvent(new Event('change', { bubbles: true })) }, label, value); await sleep(300) }
  const durText = (ms) => { const m = Math.round(ms / 60000); return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` }
  // a small history written straight into the session store — the only thing analytics reads
  const seeded = await L.ev(() => new Promise((res) => {
    const at = (daysAgo, h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); d.setDate(d.getDate() - daysAgo); return d }
    const key = (daysAgo) => { const d = at(daysAgo, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
    const q = indexedDB.open('upsc-notes')
    q.onsuccess = () => {
      const db = q.result
      const tx = db.transaction('studySessions', 'readwrite')
      const st = tx.objectStore('studySessions')
      const g = st.getAll()
      g.onsuccess = () => {
        const spans = g.result.flatMap((x) => x.spans)
        const ctx = (ch) => spans.find((x) => x.context.ref.chapterId === ch).context
        const parl = ctx('parliament'); const infl = ctx('inflation')
        const jud = { ...parl, ref: { ...parl.ref, chapterId: 'judiciary' }, chapterTitle: 'Judiciary & Legal Services' }
        const mk = (id, parts) => {
          const sp = parts.map(([start, min, context], i) => ({ id: `seed-${id}-${i}`, context, startedAt: start.toISOString(), endedAt: new Date(+start + min * 60000).toISOString(), durationMs: min * 60000 }))
          return { id: 'seed-' + id, startedAt: sp[0].startedAt, endedAt: sp[sp.length - 1].endedAt, durationMs: sp.reduce((n, x) => n + x.durationMs, 0), spans: sp, source: 'timer', createdDeviceId: 'seed', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, createdAt: sp[sp.length - 1].endedAt }
        }
        st.put(mk('plain', [[at(3, 10), 60, parl]]))
        st.put(mk('midnight', [[at(6, 23, 30), 60, infl]])) // 23:30 → 00:30
        st.put(mk('paused', [[at(10, 8), 20, parl], [at(10, 9, 20), 20, parl]])) // an hour paused in between
        st.put(mk('old', [[at(40, 9), 120, jud]]))
      }
      tx.oncomplete = () => { db.close(); res({ d3: key(3), d5: key(5), d6: key(6), d10: key(10), today: key(0) }) }
    }
  }))
  await L.go('#/insights'); await L.reload()
  const sesAll = await L.idb('studySessions')
  const totalMs = sesAll.reduce((n, x) => n + x.durationMs, 0)
  const ov = await L.ev(() => ({ cards: [...document.querySelectorAll('.kpi')].map((k) => k.dataset.k + ': ' + k.querySelector('b').textContent + ' | ' + k.querySelector('span').textContent), text: document.querySelector('.page').textContent, nodata: document.querySelectorAll('.nodata').length }))
  check('Overview: today, this week, month and year so far — each beside its comparison period', ov.cards.length === 4 && ov.cards.map((c) => c.split(':')[0]).join() === 'day,week,month,year' && ov.nodata === 0 && /yesterday/.test(ov.cards[0]) && ov.cards.slice(1).every((c) => /by now/.test(c)), ov.cards)
  check('zero comparison periods are stated in words: no ∞, NaN or bare percentages', !/Infinity|∞|NaN|undefined/.test(ov.text) && ov.cards.every((c) => !/None .*%/.test(c)), ov.cards)
  await chip(L, 'All time')
  const allStat = await L.ev(() => [...document.querySelectorAll('.stat b')].map((b) => b.textContent))
  check('All time: study time is exactly the sum of the stored sessions; sessions, average, longest, active days', allStat[0] === durText(totalMs) && allStat[1] === String(sesAll.length) && allStat[2] === durText(totalMs / sesAll.length) && allStat[3] === '2 h 00 min' && Number(allStat[4]) >= 5, [allStat, durText(totalMs), sesAll.length])
  const dist = await L.ev(() => [...document.querySelectorAll('.dist .dr')].filter((r) => !r.closest('.act-split')).map((r) => r.querySelector('.dn').textContent + ' ' + r.getAttribute('href')))
  check('Overview: subject distribution, each row opening its subject', dist.length === 2 && dist[0] === 'Polity #/study/prelims/polity' && dist[1] === 'Economy & Social Development #/study/prelims/economy', dist)
  await L.page.screenshot({ path: join(OUT, 'desktop-insights-overview.png') })

  await L.hash('#/insights/time')
  const cell = (k) => L.ev((k) => document.querySelector(`.heat i[data-date="${k}"]`)?.title ?? null, k)
  const heat = await L.ev(() => { const c = [...document.querySelectorAll('.heat i[data-date]')]; return { n: c.length, last: c[c.length - 1].dataset.date, levels: new Set(c.map((x) => x.dataset.l)).size } })
  check('Time: calendar heatmap covers the last 53 weeks, ending today, in graded shades', heat.n >= 365 && heat.n <= 371 && heat.last === seeded.today && heat.levels >= 3, heat)
  check('a heatmap day gives its date, time and sessions', (await cell(seeded.d3))?.includes('· 1 h 00 min · 1 session'), await cell(seeded.d3))
  check('a session crossing midnight is split between the two local days', (await cell(seeded.d6))?.includes('· 30 min · 1 session') && (await cell(seeded.d5))?.includes('· 30 min · 1 session'), [await cell(seeded.d6), await cell(seeded.d5)])
  check('paused time is not counted (20 + 20 min around an hour paused = 40 min)', (await cell(seeded.d10))?.includes('· 40 min · 1 session'), await cell(seeded.d10))
  const firstBars = () => L.ev(() => document.querySelector('.vbars')?.querySelectorAll('.vb').length ?? 0)
  const counts = {}
  for (const k of ['Day', 'Week', 'Month', 'Year']) { await chip(L, k); counts[k] = await firstBars() }
  const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  check('Day / Week / Month / Year selector redraws the study-time chart (hours, days, days, months)', counts.Day >= 23 && counts.Day <= 25 && counts.Week === 7 && counts.Month === dim && counts.Year === 12, [counts, dim])
  await chip(L, 'Week')
  const wk = await L.text('.stepper b'); const nextOff = await L.ev(() => document.querySelector('button[aria-label="Next week"]').disabled)
  await L.click('button[aria-label="Previous week"]'); const wk2 = await L.text('.stepper b'); await L.click('button[aria-label="Next week"]')
  check('earlier periods can be stepped through; there is no period after the current one', nextOff && wk2 !== wk && (await L.text('.stepper b')) === wk, [wk, wk2])
  await chip(L, 'Month')
  const charts = await L.ev(() => ({ heads: [...document.querySelectorAll('h3.gh')].map((h) => h.textContent.split(' · ')[0]), line: document.querySelectorAll('.line polyline').length, lists: document.querySelectorAll('.two .rows').length, rows: document.querySelectorAll('.two .row').length, links: [...document.querySelectorAll('.two a.row')].map((a) => a.getAttribute('href')) }))
  check('Time: daily chart, calendar, trend, session-length distribution, longest and most recent sessions', ['Study time by day', 'Calendar', 'Trend', 'Sessions by length', 'Longest sessions', 'Most recent sessions'].every((h) => charts.heads.includes(h)) && charts.line === 1 && charts.lists === 2 && charts.rows >= 4 && charts.links.every((h) => h.startsWith('#/study/prelims/')), charts)
  await chip(L, 'Week')
  await L.ev(() => document.querySelector('.vbars').focus()); await L.page.keyboard.press('ArrowRight'); await sleep(150)
  const kb = await L.ev(() => ({ read: document.querySelector('.chart-read').textContent, label: document.querySelector('.vbars').getAttribute('aria-label'), rows: document.querySelector('.sr-only table').tBodies[0].rows.length, live: document.querySelector('.chart [aria-live]').textContent, tip: document.querySelector('.vb').title, heat: document.querySelector('.heat-scroll').getAttribute('aria-label') }))
  check('charts are labelled, have tooltips, can be read with the keyboard and have a table equivalent', /^Study time by day/.test(kb.label) && kb.rows === 7 && /Mon/.test(kb.read) && /^Mon.*: /.test(kb.live) && /^Mon.* · /.test(kb.tip) && /days? with study/.test(kb.heat), kb)
  await pick('Stage or subject', 'prelims/economy')
  check('subject filter narrows every figure on the page', (await cell(seeded.d3))?.includes('no tracked study') && (await cell(seeded.d6))?.includes('· 30 min · 1 session') && (await L.text('.stat span')).includes('Economy'), [await cell(seeded.d3), await L.text('.stat span')])
  await pick('Stage or subject', '')
  const shade = () => L.ev(() => getComputedStyle(document.querySelector('.heat i[data-l="4"]')).backgroundColor + '|' + getComputedStyle(document.querySelector('.vb i:not([data-zero])')).backgroundColor + '|' + getComputedStyle(document.querySelector('.heat i[data-l="0"]')).backgroundColor)
  const lightC = await shade(); await L.key('t'); const darkC = await shade()
  await L.page.screenshot({ path: join(OUT, 'desktop-insights-time-dark.png'), fullPage: true })
  await L.key('t')
  check('charts follow the light and dark themes', lightC.startsWith('rgb(47, 74, 122)|rgb(47, 74, 122)') && darkC.startsWith('rgb(157, 183, 232)|rgb(157, 183, 232)') && lightC.split('|')[2] !== darkC.split('|')[2], [lightC, darkC])
  await L.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  check('reduced motion: chart transitions are switched off', await L.ev(() => parseFloat(getComputedStyle(document.querySelector('.vb i')).transitionDuration) < 0.001 && parseFloat(getComputedStyle(document.querySelector('.lc i')).transitionDuration) < 0.001))
  await L.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  await L.page.screenshot({ path: join(OUT, 'desktop-insights-time.png'), fullPage: true })

  await L.hash('#/insights/subjects')
  const sub = await L.ev(() => { const d = [...document.querySelectorAll('.page > .dist')]; return { stage: d[0].textContent, subjects: [...d[1].querySelectorAll('.dr')].map((r) => [r.querySelector('.dn').textContent, r.querySelector('.dv').textContent, r.querySelector('.dx').textContent].join('|')), stale: [...document.querySelectorAll('.page > .rows .row')].map((r) => r.textContent) } })
  check('Subjects: time by exam stage, and by subject — most studied first, reading progress beside', sub.stage.startsWith('Prelims') && sub.subjects.length === 6 && sub.subjects[0].startsWith('Polity|') && /\|\d+% done$/.test(sub.subjects[0]) && sub.subjects[1].startsWith('Economy') && sub.subjects[2].startsWith('History & Culture|—|'), sub)
  check('Subjects: least recently studied first; a subject never timed says so', sub.stale.length === 6 && sub.stale[0].startsWith('History & Culture') && sub.stale[0].includes('not studied with the timer yet') && /last studied (today|yesterday)/.test(sub.stale[5]), sub.stale)
  const topic = await L.ev(() => ({ n: document.querySelectorAll('details.syn').length, heads: [...document.querySelectorAll('details.syn .th')].map((b) => b.textContent), chapters: [...document.querySelector('details.syn').querySelectorAll('a.dr')].map((a) => a.getAttribute('href')) }))
  check('Subjects: time by topic and chapter inside each studied subject', topic.n === 2 && topic.heads.length === 2 && topic.chapters.join() === '#/study/prelims/polity/judiciary,' + PARL, topic)
  await L.ev((h) => { document.querySelector('details.syn').open = true; document.querySelector(`details.syn a.dr[href="${h}"]`).click() }, PARL); await sleep(450)
  check('a chapter in the breakdown opens that chapter', (await hashNow()) === PARL && (await L.count('.sec')) === 9)
  await L.page.goBack(); await sleep(350)
  await L.ev(() => document.querySelectorAll('.page > .dist')[1].querySelector('a.dr').click()); await sleep(400)
  check('a subject row opens that subject', (await hashNow()) === '#/study/prelims/polity')

  await L.hash('#/insights/progress')
  const pg = await L.ev(() => ({ overall: [...document.querySelectorAll('.kpi')].map((k) => k.dataset.stage + ' ' + k.textContent), stats: document.querySelectorAll('.stat').length, first: document.querySelector('.stat').textContent, parl: [...document.querySelectorAll('.row')].find((r) => r.querySelector('b')?.textContent === 'Parliament').textContent, bar: document.querySelector('.sbar').getAttribute('aria-label') }))
  check('Progress: Prelims overall; no Mains figure until Mains content exists', pg.overall.length === 1 && pg.overall[0].startsWith('prelims') && /106 chapters/.test(pg.overall[0]) && /of 672 sections done/.test(pg.overall[0]) && /★ \d+ difficult · ↻ \d+ to revise/.test(pg.overall[0]) && /tracked/.test(pg.overall[0]) && /Not started.*Reading.*Revised.*Mastered/.test(pg.bar), pg.overall)
  check('Progress: per subject — completion, the four statuses, ★ / ↻ counts and study time; chapters show time too', pg.stats === 6 && /sections done \(\d+\/117\)/.test(pg.first) && /Not started.*Reading.*Revised.*Mastered/.test(pg.first) && /★ Difficult/.test(pg.first) && /↻ Revise/.test(pg.first) && /tracked · last (today|yesterday)/.test(pg.first) && /tracked/.test(pg.parl) && /★ [1-9]/.test(pg.parl), pg)
  await pick('Status of Mughals', 'mastered'); await sleep(500)
  check('Progress: chapter status can still be set here, is saved, and the overall figure follows', /1 mastered/.test(await L.text('.kpi')) && (await L.idb('kv')).some((v) => v?.chapters?.['prelims/history-culture/mughals']?.status === 'mastered'))
  check('nothing on Progress calls the study good or bad', !/productiv|efficien|great|well done|behind|on track/i.test(await L.text('.page')))

  await L.hash(PARL); await L.click('#s-bills-types-and-procedure .tg.rev')
  await L.go('#/revision/manual')
  const rv = await L.ev(() => ({ hash: location.hash, tab: document.querySelector('.tabs .on').textContent, stat: document.querySelector('.stat').textContent, rows: [...document.querySelectorAll('.row.rv')].map((r) => r.textContent), hl: [...document.querySelectorAll('.rhl a')].map((a) => a.textContent + ' ' + a.getAttribute('href')) }))
  check('the flagged-section list is Revision → Manual', rv.hash === '#/revision/manual' && rv.tab === 'Manual' && /★ Difficult.*↻ Revise.*in progress/.test(rv.stat), rv)
  check('Revision: ★ and ↻ sections, each with the time since it was last studied', rv.rows.some((r) => r.includes('Sessions & Devices') && r.includes('↻ Revise') && r.includes('★ Difficult') && /chapter last studied (today|yesterday)/.test(r)) && rv.rows.some((r) => r.includes('Simon') && r.includes('not timed yet')), rv.rows)
  check('Revision: highlights in a queued section are shown with it', rv.hl.some((h) => h.startsWith('All Money Bills are Financial Bills ') && h.includes('/parliament/bills-types-and-procedure?h=')), rv.hl)
  await L.ev(() => [...document.querySelectorAll('.rhl a')].find((a) => a.textContent.startsWith('All Money Bills')).click()); await sleep(600)
  check('…and open the highlighted passage', (await hashNow()).includes('bills-types-and-procedure?h=') && (await L.ev(() => { const m = document.querySelector('#s-bills-types-and-procedure mark'); const r = m.getBoundingClientRect(); return r.top > 0 && r.top < innerHeight })))
  await L.page.goBack(); await sleep(350)
  await L.ev(() => [...document.querySelectorAll('.row.rv')].find((r) => r.textContent.includes('Sessions & Devices')).querySelector('a').click()); await sleep(450)
  check('a queued section opens directly', (await hashNow()) === PARL + '/sessions-and-devices')
  await L.page.goBack(); await sleep(350)
  await pick('Order', 'stale')
  const staleRows = await L.ev(() => ({ heads: [...document.querySelectorAll('h3.gh')].map((h) => h.textContent), first: document.querySelector('.row.rv').textContent }))
  check('Revision: can be ordered by longest since studied', staleRows.heads[0] === 'Longest since studied first' && staleRows.first.includes('not timed yet'), staleRows)
  await pick('Order', 'library'); await chip(L, '★ Difficult')
  check('Revision: ★ / ↻ filters', (await L.ev(() => [...document.querySelectorAll('.row.rv')].every((r) => r.textContent.includes('★ Difficult')))) && (await L.count('.row.rv')) >= 1)
  await chip(L, 'All')
  const rvBefore = await L.count('.row.rv')
  await L.ev(() => [...document.querySelectorAll('.row.rv')].find((r) => r.textContent.includes('Bills')).querySelector('button').click()); await sleep(400)
  check('Revision: Clear takes a section off the queue', (await L.count('.row.rv')) === rvBefore - 1 && (await L.idb('kv')).some((v) => v?.sections?.['prelims/polity/parliament/bills-types-and-procedure']?.revise === false))

  const disk = await L.ev(() => new Promise((res) => { const q = indexedDB.open('upsc-notes'); q.onsuccess = () => { const db = q.result; const g = db.transaction('kv').objectStore('kv').getAllKeys(); g.onsuccess = () => { const out = { stores: [...db.objectStoreNames].sort().join(), kv: g.result.join(), ls: Object.keys(localStorage).join() }; db.close(); res(out) } } }))
  check('analytics stored nothing: no new IndexedDB store, no counters or caches on disk', disk.stores === 'activeStudySession,conflicts,currentAffairsDays,currentAffairsEntries,examTargets,highlights,kv,outbox,overrides,pyqUserState,recallAttempts,revisionEvents,revisionPreferences,revisionUnits,studyGoals,studyQueue,studySessions,userDataEpoch' && !/analytic|insight|total|heat|streak|cache|index/i.test(disk.kv + disk.ls), disk)
  check('the sessions themselves were not touched', JSON.stringify(await L.idb('studySessions')) === JSON.stringify(sesAll))
  for (const [w, h, name] of [[375, 812, 'phone'], [768, 1024, 'tablet']]) {
    await L.page.setViewport({ width: w, height: h })
    const fit = []
    for (const t of ['', '/time', '/subjects', '/progress', '/revision', '/current-affairs']) { await L.go('#/insights' + t); if (await L.ev(() => document.documentElement.scrollWidth > innerWidth + 1)) fit.push(t) }
    await L.go('#/insights/time')
    const hs = await L.ev(() => { const b = document.querySelector('.heat-scroll'); return { scrolls: b.scrollWidth > b.clientWidth, atEnd: Math.abs(b.scrollLeft + b.clientWidth - b.scrollWidth) < 2, bars: document.querySelector('.vbars').getBoundingClientRect().width } })
    check(`${name}: all six Insights tabs fit; the calendar ${w < 700 ? 'scrolls inside its own frame, opened at today' : 'fits'}`, fit.length === 0 && hs.bars > 250 && (w < 700 ? hs.scrolls && hs.atEnd : true), [fit, hs])
    await L.page.screenshot({ path: join(OUT, `${name}-insights-time.png`), fullPage: true })
    if (w === 375) { await L.go('#/insights'); await L.page.screenshot({ path: join(OUT, 'phone-insights-overview.png'), fullPage: true }) }
  }
  await L.page.setViewport({ width: 1280, height: 860 })

  // ==========================================================================
  section('Home dashboard')
  const home = async (d = L) => { await d.go('#/'); await sleep(700) }
  const fin = (d, sel) => d.ev((s) => document.querySelector(s)?.dataset.final ?? null, sel)
  const qTitles = (d = L) => d.ev(() => [...document.querySelectorAll('.queue .qlist li .qt b')].map((b) => b.textContent))
  const btn = async (d, scope, label) => { await d.ev((s, l) => [...document.querySelectorAll(`${s} button, ${s} a.btn`)].find((b) => b.textContent.trim() === l).click(), scope, label); await sleep(350) }
  // the figures Insights shows: Home must show the same ones
  await L.go('#/insights')
  const kpi = await L.ev(() => Object.fromEntries([...document.querySelectorAll('.kpi')].map((k) => [k.dataset.k, [k.querySelector('b').textContent, k.querySelector('span').textContent]])))
  await L.hash('#/insights/progress')
  const prelimsPct = await L.text('.kpi[data-stage="prelims"] b')
  await L.hash('#/revision/manual')
  const revStat = await L.ev(() => [...document.querySelectorAll('.stat b')].map((b) => b.textContent))
  await home()
  const lastKey = (await L.idb('kv')).find((v) => v?.last)?.last.chapterKey
  const hero = await L.ev(() => ({ cont: document.querySelector('.cont-t')?.textContent, path: document.querySelector('.cont-p')?.textContent, meta: document.querySelector('.cont-m')?.textContent, resume: document.querySelector('.cont .btn.primary')?.getAttribute('href'), tstate: document.querySelector('.tcard').dataset.state, tbtn: document.querySelector('.tcard .btn')?.textContent, today: document.querySelector('.today .big').dataset.final, shown: document.querySelector('.today .big').textContent, sub: document.querySelector('.today .sub').textContent, tops: ['.cont', '.tcard', '.today'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().top)), h: document.querySelector('.hero').getBoundingClientRect().height }))
  check('Continue studying: the last-opened chapter, its subject, status and progress, with Resume', !!hero.cont && hero.resume === `#/study/${lastKey}?resume` && hero.path.startsWith('Prelims › ') && /sections done/.test(hero.meta), hero)
  check('the hero is one compact row on desktop', new Set(hero.tops).size === 1 && hero.h < 280, [hero.tops, hero.h])
  check('timer stopped: Start studying is offered for the resume chapter', hero.tstate === 'idle' && hero.tbtn === 'Start studying', [hero.tstate, hero.tbtn])
  check('Today and its comparison with yesterday are the figures Insights gives', hero.today === kpi.day[0] && hero.shown === hero.today && hero.sub === kpi.day[1], [hero.today, hero.sub, kpi.day])
  const thisWeek = await L.ev(() => { const c = [...document.querySelectorAll('.week .heat i[data-date]')]; return { total: document.querySelector('.week .big').dataset.final, sub: document.querySelector('.week .sub').textContent, bars: document.querySelectorAll('.week .vb').length, labels: [...document.querySelectorAll('.week .vb span')].map((s) => s.textContent).join(), cells: c.length, last: c[c.length - 1]?.dataset.date, streak: document.querySelector('.week .streak').textContent, link: document.querySelector('.week h3 a').getAttribute('href') } })
  check('This week: total and previous-week comparison match Insights; seven daily bars', thisWeek.total === kpi.week[0] && thisWeek.sub === kpi.week[1] && thisWeek.bars === 7 && thisWeek.labels === 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', thisWeek)
  check('mini heatmap: the last 13 weeks ending today, each day with its real time', thisWeek.cells >= 85 && thisWeek.cells <= 91 && thisWeek.last === seeded.today && (await L.ev((k) => document.querySelector(`.week .heat i[data-date="${k}"]`)?.title, seeded.d3))?.includes('· 1 h 00 min · 1 session'), [thisWeek.cells, thisWeek.last])
  check('streak is stated plainly: study days in a row', /^\d+-day study streak/.test(thisWeek.streak), thisWeek.streak)
  const prog = await L.ev(() => ({ stages: [...document.querySelectorAll('.stage')].map((s) => s.dataset.stage + ' ' + s.querySelector('.ring b').dataset.final).join(), legend: document.querySelector('.slegend').textContent, link: document.querySelector('.prog h3 a').getAttribute('href'), subs: [...document.querySelectorAll('.srow')].map((r) => [r.querySelector('.sn b').textContent, r.querySelector('.sn small').textContent, r.querySelector('.num').textContent, r.querySelector('.chip').textContent, r.querySelector('.chip').getAttribute('href'), r.querySelector('.sn').getAttribute('href')]) }))
  check('Study progress: Prelims overall as on Insights → Progress; no Mains card while Mains has no content', prog.stages === `prelims ${prelimsPct}` && /Not started.*Reading.*Revised.*Mastered/.test(prog.legend) && prog.link === '#/insights/progress', prog.stages)
  check('Subjects: compact rows with progress, time studied, last studied and Resume / Open', prog.subs.map((s) => s[0]).join('|') === 'Polity|Economy & Social Development|History & Culture|Geography|Environment & Ecology|Science & Technology' && /studied · last (today|yesterday|\d+ days ago)$/.test(prog.subs[0][1]) && prog.subs[2][1] === 'Not timed yet' && prog.subs.every((s) => /^\d+%$/.test(s[2]) && (s[3] === 'Resume' ? s[4].endsWith('?resume') : s[3] === 'Open' && s[4] === s[5])) && prog.subs[0][5] === '#/study/prelims/polity', prog.subs)
  const rev = await L.ev(() => ({ stat: [...document.querySelectorAll('.rev .mstat b')].map((b) => b.textContent), rows: document.querySelectorAll('.rev .qlist li').length, link: document.querySelector('.rev h3 a').getAttribute('href'), first: document.querySelector('.rev .qlist li .qt')?.getAttribute('href') }))
  check('Flagged for revision: ★ / ↻ counts as on Revision → Manual, at most five rows, each opening its section', rev.stat[0] === revStat[0] && rev.stat[1] === revStat[1] && rev.rows >= 1 && rev.rows <= 5 && rev.link === '#/revision/manual' && /^#\/study\/prelims\/[^/]+\/[^/]+\/[^/?]+$/.test(rev.first), [rev, revStat])
  await L.page.screenshot({ path: join(OUT, 'desktop-home.png'), fullPage: true })

  // study queue
  check('the queue starts empty and nothing is stored for it', (await qTitles()).length === 0 && (await L.idb('studyQueue')).length === 0 && /^Empty/.test(await L.text('.queue .none')))
  await btn(L, '.queue', 'Add current chapter')
  check('Add current chapter queues the chapter in progress, once', (await qTitles()).join() === hero.cont && !(await L.ev(() => [...document.querySelectorAll('.queue button')].some((b) => b.textContent.includes('Add current chapter')))))
  await L.click('.rev .qlist li .tg'); await sleep(200)
  const q2 = await qTitles()
  check('＋ on a revision row queues that section and marks the row', q2.length === 2 && (await L.text('.rev .qlist li .chip')) === 'In queue' && (await L.idb('studyQueue')).some((r) => r.target.kind === 'section' && ['revision', 'difficult'].includes(r.reason)), q2)
  const otherKey = lastKey === 'prelims/polity/judiciary' ? 'prelims/polity/parliament' : 'prelims/polity/judiciary'
  await L.hash('#/study/' + otherKey); await L.click('.chap-meta .fav.q')
  const inReader = await L.text('.chap-meta .fav.q')
  await home()
  const q3 = await qTitles()
  check('the reader adds its chapter too ("Add to queue" → "In queue")', inReader === 'In queue' && q3.length === 3 && q3[0] === q2[0] && q3[1] === q2[1], [inReader, q3])
  await L.click('.queue .qlist li:nth-child(3) button[title="Move up"]')
  await L.click('.queue .qlist li:nth-child(1) button[title="Move down"]')
  const q4 = await qTitles()
  check('reorder: move up / move down', q4.join('|') === [q3[2], q3[0], q3[1]].join('|'), q4)
  await L.reload(); await sleep(600)
  const qRows = await L.idb('studyQueue')
  check('the queue and its order survive a reload; items are StudyQueueItem rows queued for sync', (await qTitles()).join('|') === q4.join('|') && qRows.length === 3 && qRows.every((r) => r.id && r.target.stage === 'prelims' && r.title && typeof r.order === 'number' && !!Date.parse(r.createdAt)) && qRows.every((r) => !r.completedAt) && (await L.idb('outbox')).filter((o) => o.id.startsWith('q~')).length === 3, qRows)
  await L.click('.queue .qlist li:nth-child(2) .tg.done'); await sleep(200)
  const doneRow = (await L.idb('studyQueue')).find((r) => r.completedAt)
  check('mark complete: off the waiting list, kept as completed', (await qTitles()).join('|') === [q4[0], q4[2]].join('|') && (await L.text('.qdone span')) === '1 completed' && doneRow?.title === q4[1] && !!Date.parse(doneRow.completedAt), [await qTitles(), doneRow])
  await L.click('.qdone .chip'); await sleep(200)
  check('a completed item can be put back', (await qTitles()).length === 3 && (await L.count('.qdone')) === 0)
  await L.click('.queue .qlist li:nth-child(3) button[title^="Remove"]'); await sleep(200)
  check('remove takes an item out', (await qTitles()).join('|') === [q4[0], q4[1]].join('|'), await qTitles())
  await btn(L, '.queue', 'Start next'); await sleep(1500)
  const startedRow = await activeRow(L)
  check('Start next opens the first item and starts the timer on it', (await L.ev(() => location.hash)) === `#/study/${otherKey}?resume` && startedRow.state === 'running' && `prelims/${startedRow.currentContext.ref.subjectId}/${startedRow.currentContext.ref.chapterId}` === otherKey && (await L.count('.tchip')) === 1, startedRow?.currentContext)

  // active timer on Home
  await home()
  const onHome = await L.ev(() => ({ state: document.querySelector('.tcard').dataset.state, clock: document.querySelector('.tcard time').textContent, path: document.querySelector('.tc-path').textContent, ops: [...document.querySelectorAll('.tcard .btn')].map((b) => b.textContent).join('|'), note: document.querySelector('.today .sub.dim')?.textContent ?? '' }))
  const c1 = await L.text('.tcard time'); await sleep(1200); const c2 = await L.text('.tcard time')
  check('running timer: Home shows the onHome clock, its topic and Pause / Stop / Open topic', onHome.state === 'running' && /^\d\d:\d\d:\d\d$/.test(onHome.clock) && c2 > c1 && onHome.path.includes('Prelims → Polity → ') && onHome.ops === 'Pause|Stop|Open topic', onHome)
  check('…and says its time is counted once stopped: Today is still only completed sessions', /counted once it is stopped/.test(onHome.note) && (await fin(L, '.today .big')) === hero.today, [onHome.note, await fin(L, '.today .big')])
  await btn(L, '.tcard', 'Pause')
  check('Pause from Home', (await L.ev(() => document.querySelector('.tcard').dataset.state)) === 'paused' && (await activeRow(L)).state === 'paused' && (await L.count('.tchip.paused')) === 1)
  await btn(L, '.tcard', 'Resume'); await btn(L, '.tcard', 'Stop'); await sleep(300)
  check('Stop from Home saves the session and the card returns to Start studying', /^Session saved/.test(await L.text('.toast')) && (await L.ev(() => document.querySelector('.tcard').dataset.state)) === 'idle' && (await L.idb('studySessions')).length === sesAll.length + 1 && (await L.text('.tcard .btn')) === 'Start studying', await L.text('.toast'))

  // goals
  check('goals are opt-in: none exists, none is suggested, nothing is stored', (await L.count('.goal')) === 0 && (await L.idb('studyGoals')).length === 0 && (await L.text('.goal-set')) === 'Set a daily or weekly goal')
  await L.click('.goal-set')
  const blank = await L.ev(() => [...document.querySelectorAll('.goal-form input')].map((i) => i.value + '/' + i.placeholder).join('|'))
  await L.page.type('input[aria-label="Daily target in hours"]', '2')
  await btn(L, '.goal-form', 'Save')
  const goal1 = (await L.idb('studyGoals'))[0]
  check('setting a daily target: the form starts blank; StudyGoal is saved and progress appears', blank === '/none|/none' && goal1?.id === 'default' && goal1.enabled === true && goal1.dailyTargetMs === 7200000 && goal1.weeklyTargetMs === undefined && (await L.count('.goal')) === 1 && (await L.text('.goal .gv')).endsWith(`${await fin(L, '.today .big')} of 2 h 00 min`), [blank, goal1, await L.text('.goal .gv')])
  check('only the targets are stored — no progress, total or streak', Object.keys(goal1).sort().join() === 'dailyTargetMs,enabled,id,st,updatedAt', Object.keys(goal1))
  await L.reload(); await sleep(600)
  await L.click('.goal-set'); await L.page.type('input[aria-label="Weekly target in hours"]', '10'); await btn(L, '.goal-form', 'Save')
  const goals2 = await L.ev(() => [...document.querySelectorAll('.goal')].map((g) => g.querySelector('.gl').textContent + ': ' + g.querySelector('.gv').textContent))
  check('the goal survives a reload; a weekly target shows week-to-date progress', goals2.length === 2 && goals2[0].startsWith('Daily goal: ') && goals2[1].replace('✓ ', '') === `Weekly goal: ${await fin(L, '.week .big')} of 10 h 00 min`, goals2)
  await L.page.screenshot({ path: join(OUT, 'desktop-home-goals.png'), fullPage: true })
  await L.click('.goal-set'); await btn(L, '.goal-form', 'Remove goals')
  check('goals can be removed again', (await L.count('.goal')) === 0 && (await L.idb('studyGoals'))[0].enabled === false && (await L.text('.goal-set')) === 'Set a daily or weekly goal')

  // nothing derived is stored
  const disk2 = await L.ev(() => new Promise((res) => { const q = indexedDB.open('upsc-notes'); q.onsuccess = () => { const db = q.result; const g = db.transaction('kv').objectStore('kv').getAllKeys(); g.onsuccess = () => { const out = { stores: [...db.objectStoreNames].sort().join(), kv: g.result.join(), ls: Object.keys(localStorage).join() }; db.close(); res(out) } } }))
  check('the dashboard stored nothing: no totals, streaks or view model on disk', disk2.stores === 'activeStudySession,conflicts,currentAffairsDays,currentAffairsEntries,examTargets,highlights,kv,outbox,overrides,pyqUserState,recallAttempts,revisionEvents,revisionPreferences,revisionUnits,studyGoals,studyQueue,studySessions,userDataEpoch' && !/dash|total|heat|streak|week|today|cache/i.test(disk2.kv + disk2.ls) && !/"(\w*Ms|\w*[Ss]treak\w*|\w*[Pp]ercent\w*)":/.test(JSON.stringify([await L.idb('studyQueue'), await L.idb('studyGoals')]).replace(/"(daily|weekly)TargetMs"/g, '"target"')), disk2)

  // deep links
  await L.click('.week h3 a'); await sleep(350)
  const toTime = await L.ev(() => location.hash)
  await home()
  const resumeTo = await L.ev(() => document.querySelector('.srow .chip').getAttribute('href'))
  await L.click('.srow .chip'); await sleep(450)
  check('cards open what they name: This week → Insights → Time; a subject Resume → its chapter', toTime === '#/insights/time' && resumeTo.endsWith('?resume') && (await L.ev(() => location.hash)) === resumeTo && (await L.count('.sec')) > 0, [toTime, await L.ev(() => location.hash)])

  // themes
  await home()
  const look = () => L.ev(() => [document.documentElement.dataset.theme, getComputedStyle(document.querySelector('.card')).backgroundColor, getComputedStyle(document.querySelector('.big')).color, getComputedStyle(document.querySelector('.btn.primary')).backgroundColor].join(' | '))
  const lookA = await look(); await L.key('t'); const lookB = await look()
  await L.page.screenshot({ path: join(OUT, `desktop-home-${lookB.split(' | ')[0]}.png`), fullPage: true })
  await L.key('t')
  check('light and dark: cards, text and buttons all follow the theme', lookA.split(' | ').every((v, i) => v !== lookB.split(' | ')[i]), [lookA, lookB])

  // responsive
  const layout = () => L.ev(() => { const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top + scrollY), w: Math.round(b.width) } }; const h = document.querySelector('.week .heat-scroll'); return { o: Object.fromEntries(['cont', 'tcard', 'today', 'queue', 'rev', 'week', 'prog', 'subs'].map((k) => [k, r('.card.' + k)])), overflow: document.documentElement.scrollWidth > innerWidth + 1, heatFits: h.scrollWidth <= h.clientWidth + 1 } })
  const desk = await layout()
  check('desktop: three-part hero over two dense columns', desk.o.cont.t === desk.o.tcard.t && desk.o.tcard.t === desk.o.today.t && desk.o.prog.t === desk.o.week.t && desk.o.prog.l < desk.o.week.l && desk.o.subs.l === desk.o.prog.l && desk.o.queue.l === desk.o.week.l && !desk.overflow, desk)
  await L.page.setViewport({ width: 768, height: 1024 }); await home()
  const tabl = await layout()
  check('tablet: Continue across the top, then two columns', tabl.o.cont.w > tabl.o.tcard.w * 1.8 && tabl.o.tcard.t === tabl.o.today.t && tabl.o.tcard.t > tabl.o.cont.t && tabl.o.prog.t === tabl.o.week.t && tabl.o.prog.l < tabl.o.week.l && !tabl.overflow && tabl.heatFits, tabl)
  await L.page.screenshot({ path: join(OUT, 'tablet-home.png'), fullPage: true })
  await L.page.setViewport({ width: 375, height: 812 }); await home()
  const ph = await layout()
  const phOrder = ['cont', 'tcard', 'today', 'queue', 'rev', 'week', 'prog', 'subs'].map((k) => ph.o[k])
  check('phone: one column, important actions first (continue, timer, today, queue, revision) — nothing scrolls sideways', phOrder.every((c, i) => c.l === phOrder[0].l && c.w === phOrder[0].w && c.w > 320 && (i === 0 || c.t > phOrder[i - 1].t)) && !ph.overflow && ph.heatFits, ph)
  await L.page.screenshot({ path: join(OUT, 'phone-home-dashboard.png'), fullPage: true })
  await L.page.setViewport({ width: 1280, height: 860 })

  // motion
  await L.go('#/')
  const moving = await L.ev(() => ({ card: parseFloat(getComputedStyle(document.querySelector('.card')).animationDuration), fill: parseFloat(getComputedStyle(document.querySelector('.home .meter > i')).animationDuration), ring: parseFloat(getComputedStyle(document.querySelector('.ring .rv')).animationDuration) }))
  await L.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await L.page.reload(); await L.page.waitForSelector('.card')
  const calm = await L.ev(() => ({ card: parseFloat(getComputedStyle(document.querySelector('.card.favs')).animationDuration), delay: parseFloat(getComputedStyle(document.querySelector('.card.favs')).animationDelay), fill: parseFloat(getComputedStyle(document.querySelector('.home .meter > i')).animationDuration), opacity: getComputedStyle(document.querySelector('.card.favs')).opacity, nums: [...document.querySelectorAll('[data-final]')].every((b) => b.textContent === b.dataset.final) }))
  await L.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  check('motion: cards rise in, fills and rings grow; with reduced motion everything is in place at once', moving.card > 0.2 && moving.fill > 0.2 && moving.ring > 0.2 && calm.card < 0.001 && calm.delay === 0 && calm.fill < 0.001 && calm.nums, [moving, calm])

  // a brand-new profile: nothing to show, and nothing invented
  const N = await device(P.local, 'new')
  await N.go('#/'); await sleep(700)
  const fresh = await N.ev(() => ({ cont: document.querySelector('.cont-t').textContent, today: document.querySelector('.today .big').dataset.final, sub: document.querySelector('.today .sub').textContent, week: document.querySelector('.week .none')?.textContent ?? '', charts: document.querySelectorAll('.week .vbars, .week .heat, .week .big').length, queue: document.querySelectorAll('.queue .qlist li').length, goal: document.querySelectorAll('.goal').length, rev: document.querySelector('.rev .none')?.textContent ?? '', start: document.querySelector('.tcard .btn').textContent, pct: document.querySelector('.ring b').dataset.final, recent: document.querySelectorAll('.card.recent').length, subs: [...document.querySelectorAll('.srow .sn small')].map((s) => s.textContent).join('|'), text: document.querySelector('.page').textContent }))
  check('no history: Home says so in words — no charts, no sample figures, no default goal', fresh.cont === 'Nothing opened yet' && fresh.today === '0 min' && fresh.sub === 'None yesterday either' && fresh.week.startsWith('No tracked study time yet') && fresh.charts === 0 && fresh.queue === 0 && fresh.goal === 0 && fresh.rev.startsWith('Nothing flagged') && fresh.start === 'Choose a chapter' && fresh.pct === '0%' && fresh.recent === 0 && fresh.subs === Array(6).fill('Not timed yet').join('|') && !/NaN|undefined|Infinity|∞/.test(fresh.text), fresh)
  await N.page.screenshot({ path: join(OUT, 'desktop-home-empty.png'), fullPage: true })
  await N.ctx.close()

  // ==========================================================================
  // ==========================================================================
  // Job 5.5 — a profile of its own, so nothing above or below depends on it
  const RV = await device(P.local, 'revision')
  const RU = (id) => 'prelims/polity/parliament/' + id
  const rvUnits = async (d = RV) => Object.fromEntries((await d.idb('revisionUnits')).map((u) => [u.id.split('/').pop(), u]))
  const flat = (d, sel) => d.ev((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') ?? '', sel)
  const stopTimerOf = async (d) => { await d.click('.tchip .ttime'); await sleep(200); await tapBtn(d, 'Stop', '.timer-pop'); await sleep(400) }

  section('Adaptive revision (local-only)')
  {
    await RV.go('#/revision')
    check('nothing scheduled: an empty state, never sample data', (await RV.text('.shell-note')).includes('Nothing is scheduled yet') && (await RV.count('.runit')) === 0 && (await RV.idb('revisionUnits')).length === 0)
    await RV.hash('#/insights/revision')
    check('Insights → Revision is empty too until something is recorded', (await RV.text('.shell-note')).includes('No revision recorded yet') && (await RV.count('.kpi')) === 0)
    await RV.hash(PARL)
    for (const id of ['presiding-officers', 'sessions-and-devices', 'bills-types-and-procedure']) await RV.click(`#s-${id} .tg.done`)
    await sleep(300)
    let us = await rvUnits()
    check('marking a section Done enrols exactly that section, with R1 on the next calendar day', Object.keys(us).length === 3 && Object.values(us).every((u) => u.status === 'new' && u.dueDate === dayKey(1) && u.revisionCount === 0 && u.target.kind === 'section' && u.target.chapterId === 'parliament' && !u.scheduler.stability && u.title && !u.title.includes('/')), us)
    await RV.click('#s-presiding-officers .tg.done'); await RV.click('#s-presiding-officers .tg.done'); await sleep(300)
    us = await rvUnits()
    check('unticking and ticking Done again never makes a second unit', Object.keys(us).length === 3 && us['presiding-officers'].status === 'new' && us['presiding-officers'].dueDate === dayKey(1), us['presiding-officers'])
    await RV.click('#s-uppcs-recall .tg.star'); await RV.click('#s-uppcs-recall .tg.rev'); await sleep(200)
    check('★ and ↻ do not enrol a section: the manual pipeline stays separate', (await RV.idb('revisionUnits')).length === 3)
    await RV.hash('#/revision')
    const t0 = await flat(RV, '.rtoday')
    check('Today: nothing due yet; the next day is announced with its workload', /Nothing due today/.test(t0) && /Next: Tomorrow · 3 units · ~15 min/.test(t0) && (await RV.count('.runit')) === 0, t0)
    await RV.hash('#/revision/upcoming')
    const up = await RV.ev(() => ({ stat: [...document.querySelectorAll('.stat b')].map((b) => b.textContent).join(), day: document.querySelector('.rday h2').innerText.replace(/\s+/g, ' '), chap: document.querySelector('.rchap-h').textContent, rows: [...document.querySelectorAll('.runit')].map((r) => r.innerText.replace(/\s+/g, ' ')) }))
    check('Upcoming: sections grouped under their chapter, each with its round and estimate', up.stat === '3,3,3' && /Tomorrow · 3 units · ~15 min/.test(up.day) && up.chap.includes('Parliament') && up.rows.length === 3 && up.rows.every((r) => /R1/.test(r) && /~5 min/.test(r) && /Revise early/.test(r)), up)
    await RV.hash('#/revision/manual')
    check('Manual: the flagged sections, as before', (await RV.count('.row.rv')) === 1 && (await flat(RV, '.row.rv')).includes('↻ Revise'))

    // time passes: one unit due today, one three days overdue; the third is still for tomorrow
    await idbPut(RV, 'revisionUnits', [{ ...us['presiding-officers'], dueDate: dayKey(0) }, { ...us['sessions-and-devices'], dueDate: dayKey(-3) }])
    await RV.hash('#/revision'); await RV.reload(); await sleep(400)
    const t1 = await RV.ev(() => ({ head: document.querySelector('.rtoday').innerText.replace(/\s+/g, ' '), rows: [...document.querySelectorAll('.runit')].map((r) => r.dataset.unit.split('/').pop() + ' ' + r.dataset.state + ' ' + r.innerText.replace(/\s+/g, ' ')), tabn: document.querySelector('.tabs .tabn')?.textContent, start: !!document.querySelector('.rtoday .btn.primary') }))
    check('Today: due and overdue units and the workload; a missed revision reads OVERDUE · 3 DAYS', /2 due · ~10 min/.test(t1.head) && /1 overdue/.test(t1.head) && /0 \/ 2 completed/.test(t1.head) && t1.rows.length === 2 && t1.rows.some((r) => r.startsWith('sessions-and-devices overdue') && /overdue · 3 days/i.test(r)) && t1.rows.some((r) => r.startsWith('presiding-officers due')) && t1.tabn === '1' && t1.start, t1)
    await tapBtn(RV, 'Defer today', '.runit[data-unit$="sessions-and-devices"]'); await sleep(300)
    us = await rvUnits()
    const t2 = await flat(RV, '.rtoday')
    check('Defer today hides the unit from Today; its due date is not moved', (await RV.count('.runit')) === 1 && /1 due/.test(t2) && /1 deferred/.test(t2) && us['sessions-and-devices'].dueDate === dayKey(-3) && us['sessions-and-devices'].deferredUntilDate === dayKey(1), [t2, us['sessions-and-devices']])
    await RV.hash('#/revision/overdue')
    const od = await RV.ev(() => [...document.querySelectorAll('.runit')].map((r) => r.innerText.replace(/\s+/g, ' ')))
    check('Overdue still lists it, marked deferred; the deferral can be undone', od.length === 1 && /deferred/i.test(od[0]) && /Undo defer/.test(od[0]), od)
    await tapBtn(RV, 'Undo defer'); await sleep(300)
    check('…undone: overdue again, still on its original date', !(await rvUnits())['sessions-and-devices'].deferredUntilDate && /overdue · 3 days/i.test(await flat(RV, '.runit')))

    // guided revision of the day's units
    await RV.hash('#/revision')
    await tapBtn(RV, 'Start Revision', '.rtoday'); await sleep(900)
    const g0 = await RV.ev(() => ({ hash: location.hash, phase: document.querySelector('.revise')?.dataset.phase, title: document.querySelector('.revise h1').innerText, notes: document.querySelectorAll('.sec-body').length, card: document.querySelector('.rcard').innerText.replace(/\s+/g, ' '), timer: !!document.querySelector('.ttime'), rid: document.querySelector('.rcard').dataset.rid }))
    const act0 = await activeRow(RV)
    check('Start Revision opens the most overdue unit in a focused view: one prompt, none of the surrounding notes', g0.hash === '#/revise/' + RU('sessions-and-devices') && g0.phase === 'prompt' && /R1/.test(g0.title) && g0.notes === 0 && /^1 \/ \d+/.test(g0.card) && /Reveal/.test(g0.card), g0)
    check('the one timer starts in a revision span for that unit', g0.timer && act0.state === 'running' && act0.currentActivity?.activity === 'revision' && act0.currentActivity.revisionUnitId === RU('sessions-and-devices') && act0.currentActivity.revisionOrdinal === 1 && (await RV.idb('activeStudySession')).length === 1, act0)
    const before = await RV.ev(() => ({ mask: document.querySelector('.rcard .rmask')?.textContent ?? getComputedStyle(document.querySelector('.rcard .rb[data-t]'), '::before').content, answer: !!document.querySelector('.rcard .rans, .rcard .ra') }))
    await tapBtn(RV, 'Reveal', '.rcard'); await sleep(250)
    const after = await RV.ev(() => ({ answer: (document.querySelector('.rcard .rans, .rcard .ra')?.textContent ?? '').length, btns: [...document.querySelectorAll('.rcard .btn')].map((b) => b.textContent.replace(/\d$/, '')).join() }))
    check('the answer stays behind a fixed label until Reveal; then Knew / Missed / Skip', /recall/i.test(before.mask) && !before.answer && after.answer > 0 && after.btns === 'Knew,Missed,Skip', [before, after])
    await tapBtn(RV, 'Missed', '.rcard'); await sleep(250)
    await tapBtn(RV, 'Reveal', '.rcard'); await sleep(200); await tapBtn(RV, 'Knew', '.rcard'); await sleep(250)
    const at1 = await RV.idb('recallAttempts')
    check('each answer is stored as a RecallAttempt against the unit and this revision', at1.length === 2 && at1.map((a) => a.outcome).sort().join() === 'knew,missed' && at1.every((a) => a.revisionUnitId === RU('sessions-and-devices') && a.revisionEventId === act0.currentActivity.revisionEventId && a.contentHash && a.recallUnitId.startsWith(RU('sessions-and-devices') + '#')) && at1.some((a) => a.recallUnitId === g0.rid), at1)
    const place = await RV.text('.rprog span')
    await RV.reload(); await sleep(500)
    const g1 = await RV.ev(() => ({ phase: document.querySelector('.revise')?.dataset.phase, prog: document.querySelector('.rprog span')?.textContent }))
    const act1 = await activeRow(RV)
    check('a reload in the middle of a revision carries on: same revision, same place, same timer', g1.phase === 'prompt' && g1.prog === place && act1.sessionId === act0.sessionId && act1.currentActivity.revisionEventId === act0.currentActivity.revisionEventId && (await RV.idb('recallAttempts')).length === 2 && (await RV.idb('revisionEvents')).length === 0, [g1, place])
    await tapBtn(RV, 'Finish now', '.rcard'); await sleep(250)
    const gr = await RV.ev(() => ({ phase: document.querySelector('.revise').dataset.phase, q: document.querySelector('.rcard h2').textContent, grades: [...document.querySelectorAll('.grade-b b')].map((b) => b.textContent).join(), tally: document.querySelector('.rtally')?.textContent }))
    check('the revision ends with exactly one scheduling question: Again / Hard / Good / Easy', gr.phase === 'grade' && gr.q === 'How well did you remember this?' && gr.grades === 'Again,Hard,Good,Easy' && /1 knew · 1 missed/.test(gr.tally), gr)
    await sleep(1100)
    await RV.click('.grade-b[data-grade="good"]'); await sleep(900)
    const ev1 = (await RV.idb('revisionEvents'))[0]
    us = await rvUnits()
    check('grading writes one RevisionEvent: R1, the date it was due, the real delay, the grade and the next date', ev1.ordinal === 1 && ev1.grade === 'good' && ev1.scheduledDueDate === dayKey(-3) && ev1.overdueDays === 3 && ev1.nextDueDate > dayKey(0) && ev1.recallAttemptCount === 2 && ev1.recallMissCount === 1 && ev1.durationMs >= 1000 && ev1.studySessionId === act0.sessionId && !ev1.schedulerBefore.stability && ev1.schedulerAfter.stability > 0, ev1)
    check('the unit moves to its next date and keeps only the current scheduling state', us['sessions-and-devices'].revisionCount === 1 && us['sessions-and-devices'].status === 'active' && us['sessions-and-devices'].dueDate === ev1.nextDueDate && us['sessions-and-devices'].scheduler.stability === ev1.schedulerAfter.stability && !us['sessions-and-devices'].deferredUntilDate, us['sessions-and-devices'])
    const g2 = await RV.ev(() => ({ hash: location.hash, phase: document.querySelector('.revise')?.dataset.phase }))
    const act2 = await activeRow(RV)
    check('the run moves straight on to the next unit: the same timer, a new revision span', g2.hash === '#/revise/' + RU('presiding-officers') && act2.sessionId === act0.sessionId && act2.currentActivity.revisionUnitId === RU('presiding-officers') && act2.completedSpans.length >= 1 && act2.completedSpans.every((s) => s.activity === 'revision' && s.revisionOrdinal === 1) && (await RV.idb('activeStudySession')).length === 1, [g2, act2.currentActivity])
    await tapBtn(RV, 'Finish now', '.rcard'); await sleep(1300)
    await RV.click('.grade-b[data-grade="easy"]'); await sleep(900)
    const fin = await RV.ev(() => ({ phase: document.querySelector('.revise').dataset.phase, card: document.querySelector('.rcard').innerText.replace(/\s+/g, ' '), toast: document.querySelector('.toast')?.textContent ?? '', timer: !!document.querySelector('.tchip') }))
    const ses = await RV.idb('studySessions')
    check('when the run ends, the timer it started is stopped and saved as one session of revision spans', fin.phase === 'done' && /R1 recorded · Easy/.test(fin.card) && /Next revision:/.test(fin.card) && /Revision recorded/.test(fin.toast) && !fin.timer && ses.length === 1 && ses[0].spans.length >= 2 && ses[0].spans.every((s) => s.activity === 'revision' && s.revisionOrdinal === 1 && s.revisionEventId) && new Set(ses[0].spans.map((s) => s.revisionUnitId)).size === 2 && (await activeRow(RV)).state === undefined, [fin, ses[0]?.spans.map((s) => [s.activity, s.revisionUnitId])])
    const evs = await RV.idb('revisionEvents')
    const easy = evs.find((e) => e.grade === 'easy')
    check('Easy schedules further out than Good; a completed event is never rewritten', evs.length === 2 && easy.nextDueDate > ev1.nextDueDate && easy.overdueDays === 0 && easy.scheduledDueDate === dayKey(0) && JSON.stringify(evs.find((e) => e.id === ev1.id)) === JSON.stringify(ev1), [ev1.nextDueDate, easy.nextDueDate])
    await tapBtn(RV, 'Back to Revision', '.rcard'); await sleep(400)
    const t3 = await RV.ev(() => ({ head: document.querySelector('.rtoday').innerText.replace(/\s+/g, ' '), done: [...document.querySelectorAll('.rdone')].map((r) => r.innerText.replace(/\s+/g, ' ')) }))
    check('Today is cleared: completion stated, the next day announced, the completed revisions listed', /Revision complete for today/.test(t3.head) && /2 \/ 2 completed/.test(t3.head) && /Next: Tomorrow · 1 unit · ~5 min/.test(t3.head) && t3.done.length === 2 && t3.done.every((d) => /R1/.test(d)), t3)

    // an early revision, while an initial-study timer is already running
    await RV.hash(PARL); await RV.click('.ib.timer'); await sleep(1300)
    const study0 = await activeRow(RV)
    await RV.hash('#/revision/upcoming')
    await tapBtn(RV, 'Revise early', '.runit[data-unit$="bills-types-and-procedure"]'); await sleep(900)
    const sw = await activeRow(RV)
    check('revising while a study timer runs switches that timer into a revision span — never a second timer', study0.state === 'running' && !study0.currentActivity && sw.sessionId === study0.sessionId && sw.currentActivity?.activity === 'revision' && sw.completedSpans.length === 1 && !sw.completedSpans[0].activity && (await RV.idb('activeStudySession')).length === 1, sw)
    await tapBtn(RV, 'Finish now', '.rcard'); await sleep(1300); await RV.click('.grade-b[data-grade="hard"]'); await sleep(800)
    const early = (await RV.idb('revisionEvents')).find((e) => e.grade === 'hard')
    const paused = await activeRow(RV)
    check('an early revision is recorded against the date it was due, with no overdue days', early.scheduledDueDate === dayKey(1) && early.overdueDays === 0 && early.ordinal === 1 && early.nextDueDate > dayKey(0), early)
    check('the study timer that was already running is paused, not stopped, when the revision ends', paused.state === 'paused' && paused.sessionId === study0.sessionId && paused.completedSpans.map((s) => s.activity ?? 'initial-study').join() === 'initial-study,revision', paused)
    await stopTimerOf(RV)
    const ses2 = (await RV.idb('studySessions')).find((s) => s.id === study0.sessionId)
    check('one session holds both: the initial-study span and the revision span, attributed apart', ses2?.spans.length === 2 && !ses2.spans[0].activity && ses2.spans[1].activity === 'revision' && ses2.spans[1].revisionUnitId === RU('bills-types-and-procedure') && ses2.spans[1].revisionOrdinal === 1, ses2?.spans)

    // calendar, Home, Insights
    await RV.hash('#/revision/calendar')
    const cal = await RV.ev((today) => { const c = document.querySelector(`.cal-d[data-date="${today}"]`); return { cells: document.querySelectorAll('.cal-d').length, today: c?.classList.contains('today'), done: c?.querySelector('i[data-k="done"]')?.textContent, detail: document.querySelector('.cal-day').innerText.replace(/\s+/g, ' ') } }, dayKey(0))
    check('Calendar: a month grid; today carries its completed revisions', cal.cells >= 28 && cal.cells % 7 === 0 && cal.today && cal.done === '3' && /3 completed/.test(cal.detail), cal)
    let dueCell = null
    for (let m = 0; m < 3 && !dueCell; m++) { dueCell = await RV.ev(() => document.querySelector('.cal-d:not(.out) i[data-k="due"]')?.closest('.cal-d').dataset.date ?? null); if (!dueCell) await RV.click('.stepper button[aria-label="Next month"]') }
    await RV.click(`.cal-d[data-date="${dueCell}"]`); await sleep(250)
    const dd = await RV.ev(() => ({ head: document.querySelector('.cal-day h2').innerText.replace(/\s+/g, ' '), rows: [...document.querySelectorAll('.cal-day .runit')].map((r) => r.innerText.replace(/\s+/g, ' ')), to: document.querySelector('.cal-day .runit a.t')?.getAttribute('href'), dueAll: [...document.querySelectorAll('.cal-d i[data-k="due"]')].length }))
    check('each unit appears once, on its next date; a day shows its units with round, workload and a link to the revision', dueCell > dayKey(0) && dd.rows.length >= 1 && dd.rows.every((r) => /R2/.test(r) && /~\d+ min/.test(r)) && /due · ~\d+ min/.test(dd.head) && dd.to.startsWith('#/revise/prelims/polity/parliament/') && [ev1.nextDueDate, easy.nextDueDate, early.nextDueDate].includes(dueCell), [dueCell, dd])
    await RV.go('#/')
    const hs = await flat(RV, '.card.sched')
    check('Home: a compact Revision card — today complete, and what comes next', /^revision/i.test(hs) && /Revision complete for today/.test(hs) && /Next: /.test(hs) && /Next 7 days \d/.test(hs) && (await RV.ev(() => document.querySelector('.card.sched').getBoundingClientRect().height)) < 220, hs)
    await RV.hash('#/insights/revision')
    const ins = await RV.ev(() => ({ kpi: Object.fromEntries([...document.querySelectorAll('.kpi')].map((k) => [k.dataset.k, k.querySelector('b').textContent + ' ' + k.querySelector('span').textContent])), text: document.querySelector('.page').innerText.replace(/\s+/g, ' ') }))
    check('Insights → Revision: completed, on time, backlog, grades and recall answers counted from the records', /^3 of 3 scheduled · 100%/.test(ins.kpi.completed) && /^2 1 done after/.test(ins.kpi.ontime) && /^0 /.test(ins.kpi.backlog) && /Recall prompts: 1 knew · 1 missed/.test(ins.text) && /R1 3 · R2 0/.test(ins.text) && /initial study/.test(ins.kpi.time), ins.kpi)
    await RV.click('.topic-time button.row'); await sleep(200)
    const tt = await RV.ev(() => ({ head: [...document.querySelectorAll('table.ord thead th')].map((t) => t.textContent).join(), rows: [...document.querySelectorAll('table.ord tbody tr')].map((r) => [...r.children].map((c) => c.textContent).join('|')) }))
    check('topic drill-down keeps Initial, R1, R2 … apart', /Initial,R1,R2,R3,R4,R5\+,Total$/.test(tt.head) && tt.rows.length >= 2 && tt.rows[tt.rows.length - 1].startsWith('Whole chapter|') && tt.rows.every((r) => r.split('|').length === 8), tt)
    const kv5 = await RV.ev(() => new Promise((res) => { const q = indexedDB.open('upsc-notes'); q.onsuccess = () => { const db = q.result; const g = db.transaction('kv').objectStore('kv').getAllKeys(); g.onsuccess = () => { db.close(); res(g.result.join() + '|' + Object.keys(localStorage).join()) } } }))
    check('no revision counter, forecast or memory score is stored anywhere', !/analytic|insight|total|streak|cache|forecast|calendar|retriev|score/i.test(kv5), kv5)
    for (const [w, h, name] of [[375, 812, 'phone'], [768, 1024, 'tablet']]) {
      await RV.page.setViewport({ width: w, height: h })
      const wide = []
      for (const t of ['#/revision', '#/revision/upcoming', '#/revision/calendar', '#/revision/manual', '#/insights/revision', '#/current-affairs', '#/current-affairs/calendar', '#/current-affairs/notes', '#/current-affairs/archive', '#/insights/current-affairs', '#/settings', '#/revise/' + RU('presiding-officers')]) { await RV.go(t); if (await RV.ev(() => document.documentElement.scrollWidth > innerWidth + 1)) wide.push(t) }
      check(`${name}: Revision, its calendar, Settings and the guided view fit the screen`, wide.length === 0, wide)
      if (w === 375) { await RV.go('#/revision/calendar'); await RV.page.screenshot({ path: join(OUT, 'phone-revision-calendar.png') }) }
    }
    await RV.page.setViewport({ width: 1280, height: 860 })
    // the guided view opened above started a revision that was never graded: nothing was recorded
    await RV.go('#/revision'); await sleep(300)
    check('a revision that is left without a grade writes no event and changes no date', (await RV.idb('revisionEvents')).length === 3 && (await rvUnits())['presiding-officers'].revisionCount === 1)
    if (await RV.count('.tchip')) await stopTimerOf(RV)
    await RV.page.screenshot({ path: join(OUT, 'desktop-revision.png'), fullPage: true })
  }

  section('Recall v2')
  {
    const attempts0 = (await RV.idb('recallAttempts')).length
    await RV.go(PARL); await RV.key('r'); await sleep(300)
    const probe = () => RV.ev(() => { const q = (m) => [...document.querySelectorAll(`.sec-body .rq[data-m~="${m}"]`)]; const vis = (e) => !e.classList.contains('shown') && getComputedStyle(e, '::before').content.includes('RECALL') && getComputedStyle(e).display !== 'contents'; const all = [...document.querySelectorAll('.sec-body .rq')]; const on = all.filter(vis); return { cls: document.querySelector('.app').className, light: q('light').length, standard: q('standard').length, exam: q('exam').length, masked: on.length, labels: [...new Set(on.map((e) => getComputedStyle(e, '::before').content))], blur: [...document.querySelectorAll('.sec-body *')].some((e) => getComputedStyle(e).filter !== 'none'), leak: on.some((e) => e.querySelector(':scope > .rq-a').getBoundingClientRect().width > 0), cells: document.querySelectorAll('.sec-body td > .rq[data-m~="standard"]').length, heads: [...document.querySelectorAll('.sec-body tbody tr')].filter((r) => r.children[0].querySelector('.rq:not(.rc)')).length, nested: document.querySelectorAll('.sec-body .rq[data-m~="exam"] .rq[data-m~="exam"]').length, examOnly: q('exam').filter((e) => !e.dataset.m.includes('standard')).length } })
    const rs = await probe()
    check('Standard is the default: every eligible answer behind the same label; nothing blurred, no length shown', /recall ri-standard/.test(rs.cls) && rs.masked === rs.standard && rs.masked > 40 && rs.labels.length === 1 && /RECALL/.test(rs.labels[0]) && !rs.blur && !rs.leak, rs)
    check('tables are first class: whole answer cells are concealed, a row heading never is', rs.cells > 10 && rs.heads === 0, [rs.cells, rs.heads])
    const tap = await RV.ev(() => { const e = document.querySelector('.sec-body td > .rq[data-m~="standard"]'); const text = e.textContent; e.click(); return { text, shown: e.classList.contains('shown'), visible: getComputedStyle(e.querySelector('.rq-a')).display !== 'none', after: e.textContent, mask: getComputedStyle(e, '::before').content } })
    check('a tap reveals the exact source content; reading asks for no grade and records nothing', tap.shown && tap.visible && tap.text.length > 0 && tap.text === tap.after && tap.mask === 'none' && (await RV.count('.grades, .grade-b, .rcard')) === 0 && (await RV.idb('recallAttempts')).length === attempts0, tap)
    const kb = await RV.ev(() => { const e = document.querySelector('.sec-body .rq[data-m~="standard"]:not(.shown)'); const ok = e.tabIndex === 0 && e.getAttribute('role') === 'button'; e.focus(); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return ok && e.classList.contains('shown') })
    check('a concealed answer can be reached and revealed from the keyboard', kb)
    await RV.key('R'); await sleep(300)
    const re = await probe()
    check('Exam conceals whole answers, lists and arrows as well — and never one mask inside another', /ri-exam/.test(re.cls) && re.examOnly > 0 && re.nested === 0 && re.labels.length === 1 && !re.leak && (await RV.idb('revisionPreferences'))[0].recallIntensity === 'exam', re)
    await RV.key('R'); await sleep(300)
    const rl = await probe()
    check('Light conceals only PYQ facts, traps and the answers marked in the notes', /ri-light/.test(rl.cls) && rl.light > 0 && rl.light < rl.standard && rl.masked <= rl.light && rl.masked > 0, rl)
    await RV.key('R'); await sleep(300)
    await RV.reload(); await sleep(300)
    check('the intensity is a saved preference: Standard again after the full cycle and a reload', /recall ri-standard/.test(await RV.ev(() => document.querySelector('.app').className)) && (await RV.idb('revisionPreferences'))[0].recallIntensity === 'standard')
    await RV.key('r')
    check('Recall off: the notes read exactly as written', (await RV.ev(() => [...document.querySelectorAll('.sec-body .rq')].every((e) => getComputedStyle(e, '::before').content === 'none' && getComputedStyle(e).display === 'contents'))))
    // guided prompts off: the section itself with its answers concealed, then the same single question
    await RV.hash('#/settings'); await RV.ev(() => document.querySelector('input[aria-label="Guided revision"]').click()); await sleep(250)
    await RV.go('#/revise/' + RU('presiding-officers')); await sleep(600)
    const rd = await RV.ev(() => ({ phase: document.querySelector('.revise').dataset.phase, masks: [...document.querySelectorAll('.rcard .sec-body .rq')].filter((e) => getComputedStyle(e, '::before').content.includes('RECALL')).length }))
    await tapBtn(RV, 'Done reading', '.rcard'); await sleep(250)
    check('with guided prompts off, scheduled revision shows the section with its answers concealed, then asks the same one question', rd.phase === 'read' && rd.masks > 3 && (await RV.ev(() => document.querySelector('.revise').dataset.phase)) === 'grade' && (await RV.count('.grade-b')) === 4, rd)
    await RV.hash('#/settings'); await RV.ev(() => document.querySelector('input[aria-label="Guided revision"]').click()); await sleep(250)
    if (await RV.count('.tchip')) await stopTimerOf(RV)
  }

  section('Exam targets')
  {
    const addExam = async (name, date) => { await tapBtn(RV, 'Add an exam'); await sleep(200); await RV.page.type('input[aria-label="Exam name"]', name); await RV.ev((d) => { const i = document.querySelector('input[aria-label="Exam date"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, d); i.dispatchEvent(new Event('input', { bubbles: true })) }, date); await sleep(150); await tapBtn(RV, 'Save', '.exam-form'); await sleep(350) }
    const setDate = async (date) => { await RV.hash('#/settings'); await tapBtn(RV, 'Edit', '.row.exam'); await sleep(200); await RV.ev((d) => { const i = document.querySelector('input[aria-label="Exam date"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, d); i.dispatchEvent(new Event('input', { bubbles: true })) }, date); await sleep(150); await tapBtn(RV, 'Save', '.exam-form'); await sleep(350) }
    const countdownOf = async () => { await RV.go('#/'); await sleep(500); return flat(RV, '.examcd') }
    await RV.go('#/')
    check('no exam set: Home shows no countdown', (await RV.count('.examcd')) === 0)
    await RV.hash('#/settings')
    await addExam('UPSC CSE Prelims', dayKey(232)); await addExam('UPPCS Prelims', dayKey(120))
    let ex = await RV.idb('examTargets')
    check('several exam targets, exactly one of them primary', ex.length === 2 && ex.filter((e) => e.primary && e.active).length === 1 && ex.find((e) => e.primary).name === 'UPSC CSE Prelims' && (await RV.count('.row.exam .chip.u')) === 1 && ex.every((e) => e.finalRevisionWindowDays === 21 && e.timeZone), ex)
    const cd1 = await countdownOf()
    check('Home: a compact countdown to the primary exam — days and the date, no seconds', /^UPSC CSE PRELIMS 232 DAYS \d{1,2} [A-Z]{3} \d{4}$/.test(cd1) && (await RV.ev(() => { const r = document.querySelector('.examcd').getBoundingClientRect(); return r.height < 90 && r.width < 320 })), cd1)
    await RV.hash('#/settings'); await tapBtn(RV, 'Make primary', '.row.exam'); await sleep(300)
    ex = await RV.idb('examTargets')
    check('making another exam primary leaves exactly one primary', ex.filter((e) => e.primary).length === 1 && ex.find((e) => e.primary).name === 'UPPCS Prelims' && /^UPPCS PRELIMS 120 DAYS/.test(await countdownOf()), ex.map((e) => [e.name, e.primary]))
    await setDate(dayKey(3))
    const cd2 = await countdownOf()
    check('an edited date is counted down at once; inside the last week in days and hours', /^UPPCS PRELIMS \dD \d{1,2}H /i.test(cd2) && !/:/.test(cd2), cd2)
    await RV.hash('#/revision/calendar')
    for (let m = 0; m < 2 && !(await RV.count(`.cal-d[data-date="${dayKey(3)}"]`)); m++) await RV.click('.stepper button[aria-label="Next month"]')
    await RV.click(`.cal-d[data-date="${dayKey(3)}"]`); await sleep(250)
    const cx = await RV.ev((d) => ({ mark: document.querySelector(`.cal-d[data-date="${d}"] .cal-x`)?.textContent, row: document.querySelector('.cal-day .exam-row')?.innerText.replace(/\s+/g, ' ') }), dayKey(3))
    check('the calendar shows the exam as an event of its own on its date', cx.mark === 'UPPCS Prelims' && /UPPCS Prelims Exam/.test(cx.row ?? ''), cx)
    await setDate(dayKey(-1))
    check('once the primary exam has passed, the countdown moves to the next exam ahead', /^UPSC CSE PRELIMS 232 DAYS/.test(await countdownOf()))
    await RV.hash('#/settings')
    RV.page.once('dialog', (d) => d.accept())
    await RV.click('.row.exam .tg'); await sleep(350)
    ex = await RV.idb('examTargets')
    check('removing the primary exam makes the remaining one primary', (await RV.count('.row.exam')) === 1 && ex.find((e) => e.name === 'UPPCS Prelims').removed === true && ex.filter((e) => e.primary && !e.removed).map((e) => e.name).join() === 'UPSC CSE Prelims', ex.map((e) => [e.name, e.primary, e.removed]))
  }

  section('Reset (local-only)')
  {
    const stores = ['studySessions', 'activeStudySession', 'studyQueue', 'pyqUserState', 'revisionUnits', 'revisionEvents', 'recallAttempts']
    const sizes = async (names) => Object.fromEntries(await Promise.all(names.map(async (s) => [s, (await RV.idb(s)).length])))
    const openReset = async (label) => { await RV.hash('#/settings'); await tapBtn(RV, label); await sleep(300) }
    const confirmReset = async (label) => { const off = await RV.ev(() => document.querySelector('.reset .btn.danger').disabled); await RV.page.type('.reset-word input', 'RESET'); await sleep(150); await tapBtn(RV, label, '.reset .acts'); await sleep(1500); return off }
    // personal data of every kind
    await RV.go(PARL); await RV.key('t'); await sleep(200)
    const theme5 = await RV.ev(() => document.documentElement.dataset.theme)
    await RV.highlight('bills-types-and-procedure', 'All Money Bills are Financial Bills', 'green')
    await RV.editMode(true); await RV.edit('presiding-officers', '<p>RESET-E2E edit</p>'); await RV.saved(); await RV.editMode(false)
    await RV.click('.chap-meta .fav:not(.q)'); await RV.click('.chap-meta .fav.q'); await sleep(200)
    await RV.hash('#/pyqs'); const pq5 = await RV.text('.pq-count')
    await RV.hash(PARL); await sleep(300)
    const lib5 = await RV.ev(() => ({ secs: document.querySelectorAll('.sec').length, xref: document.querySelectorAll('a.xref, .related a').length, rq: document.querySelectorAll('.sec-body .rq').length, done: document.querySelector('.chap-meta span').textContent }))
    const had = await sizes(stores)
    check('before the reset: sessions, units, events, recall answers and a queue item exist', had.studySessions >= 2 && had.revisionUnits === 3 && had.revisionEvents === 3 && had.recallAttempts === 2 && had.studyQueue === 1 && lib5.done === '3 / 9 sections done', [had, lib5])

    await openReset('Reset study history')
    const off1 = await confirmReset('Reset study history')
    const after1 = await sizes(stores)
    const kvP = (await RV.idb('kv')).find((v) => v && typeof v === 'object' && 'sections' in v)
    check('the reset needs RESET typed; Reset Study History then removes progress, sessions, the timer, revision units and history, recall answers and the queue', off1 === true && Object.values(after1).every((n) => n === 0) && Object.values(kvP.sections).every((s) => !s.done) && Object.keys(kvP.chapters).length === 0 && (await RV.ev(() => location.hash)) === '#/' && (await RV.ev(() => localStorage.getItem('upsc-revision-run'))) === null, [off1, after1])
    const kept1 = { hl: (await RV.idb('highlights')).filter((h) => !h.deleted).length, edits: (await RV.idb('overrides')).filter((o) => !o.deleted).length, exams: (await RV.idb('examTargets')).filter((e) => !e.removed).length, prefs: await RV.ev(() => JSON.parse(localStorage.getItem('upsc-prefs'))), theme: await RV.ev(() => document.documentElement.dataset.theme), rprefs: (await RV.idb('revisionPreferences')).length }
    check('…and keeps highlights, edits, ★ / ↻ marks, favourites, appearance, revision preferences and exam targets', kvP.sections[RU('uppcs-recall')]?.revise === true && kvP.sections[RU('uppcs-recall')]?.difficult === true && kept1.hl === 1 && kept1.edits === 1 && kept1.exams === 1 && kept1.prefs.favourites.length === 1 && kept1.prefs.recents.length === 0 && kept1.theme === theme5 && kept1.rprefs === 1 && (await RV.count('.examcd')) === 1, kept1)
    const ep1 = (await RV.idb('userDataEpoch'))[0]
    check('the reset raises the data epoch on this device and leaves nothing stale queued', ep1.doc.epoch === 1 && ep1.doc.floors.study === 1 && ep1.doc.resetScope === 'study-history' && !(await RV.idb('outbox')).some((o) => /^(chap|ses|run|q|pyq|ru|rev|ra)~/.test(o.id)), ep1)
    await RV.hash('#/pyqs'); const pq6 = await RV.text('.pq-count')
    await RV.hash(PARL); await sleep(300)
    const lib6 = await RV.ev(() => ({ secs: document.querySelectorAll('.sec').length, xref: document.querySelectorAll('a.xref, .related a').length, rq: document.querySelectorAll('.sec-body .rq').length, done: document.querySelector('.chap-meta span').textContent }))
    check('the notes, the static PYQ corpus and the cross-links are untouched', pq6 === pq5 && pq5 === '2146 questions' && lib6.secs === lib5.secs && lib6.xref === lib5.xref && lib6.xref > 0 && lib6.done === '0 / 9 sections done' && (await RV.text('#s-presiding-officers .sec-body')).includes('RESET-E2E edit') && (await RV.marks('bills-types-and-procedure')).length === 1, [pq5, pq6, lib5, lib6])
    await RV.reload(); await sleep(300)
    check('the reset survives a reload', (await RV.idb('revisionUnits')).length === 0 && (await RV.text('.chap-meta span')) === '0 / 9 sections done')
    await RV.click('#s-presiding-officers .tg.done'); await sleep(300)
    check('study starts cleanly afterwards: a new Done is enrolled as usual', (await RV.idb('revisionUnits')).length === 1 && (await rvUnits())['presiding-officers'].dueDate === dayKey(1))

    await openReset('Full personal reset')
    const boxes = await RV.ev(() => [...document.querySelectorAll('.reset-keep input')].map((i) => i.checked).join())
    const off2 = await confirmReset('Reset everything personal')
    const after2 = await sizes([...stores, 'studyGoals'])
    const kvF = (await RV.idb('kv')).find((v) => v && typeof v === 'object' && 'sections' in v)
    const kept2 = { marks: Object.keys(kvF.sections).length, hl: (await RV.idb('highlights')).length, edits: (await RV.idb('overrides')).length, conflicts: (await RV.idb('conflicts')).length, exams: (await RV.idb('examTargets')).filter((e) => !e.removed).length, prefs: await RV.ev(() => JSON.parse(localStorage.getItem('upsc-prefs'))), theme: await RV.ev(() => document.documentElement.dataset.theme), ep: (await RV.idb('userDataEpoch'))[0].doc }
    check('Full Personal Reset: everything personal goes — highlights, edits, flags and favourites too', off2 === true && Object.values(after2).every((n) => n === 0) && kept2.marks === 0 && kept2.hl === 0 && kept2.edits === 0 && kept2.conflicts === 0 && kept2.prefs.favourites.length === 0 && kept2.ep.epoch === 2 && kept2.ep.floors.notes === 2 && kept2.ep.floors.study === 2, [after2, kept2])
    check('"Keep exam targets" and "Keep appearance / settings" are on by default, and are honoured', boxes === 'true,true' && kept2.exams === 1 && kept2.theme === theme5 && (await RV.count('.examcd')) === 1, [boxes, kept2.exams, kept2.theme])
    await RV.hash('#/pyqs'); const pq7 = await RV.text('.pq-count')
    await RV.hash(PARL); await sleep(300)
    const lib7 = await RV.ev(() => ({ secs: document.querySelectorAll('.sec').length, xref: document.querySelectorAll('a.xref, .related a').length, rq: document.querySelectorAll('.sec-body .rq').length, text: document.querySelector('#s-presiding-officers .sec-body').textContent.includes('RESET-E2E edit'), marks: document.querySelectorAll('mark[data-hid]').length }))
    check('after a full reset the library is exactly as imported: notes, PYQs, cross-links and recall units', pq7 === pq5 && lib7.secs === lib5.secs && lib7.xref === lib5.xref && lib7.rq === lib5.rq && !lib7.text && lib7.marks === 0, [pq7, lib7])
    await RV.go('#/')
    check('Home after a full reset: nothing of the old study record is shown', /Nothing scheduled yet/.test(await flat(RV, '.card.sched')) && /^00:00:00/.test((await flat(RV, '.tcard .tc-time'))) && (await RV.ev(() => document.querySelector('.today .big').dataset.final)) === '0 min')
  }

  section('Current Affairs (local-only)')
  {
    // The reminder depends on the local hour, so the browser's timezone is chosen to make it
    // 05:xx first and 13:xx afterwards, whatever the time of this run.
    const zoneAt = (hour) => { const off = ((hour - new Date().getUTCHours() + 36) % 24) - 12; return off >= 0 ? `Etc/GMT-${off}` : `Etc/GMT+${-off}` }
    const C = await device(P.local, 'current-affairs')
    const cDay = (off = 0) => C.ev((off) => new Intl.DateTimeFormat('en-CA').format(new Date(Date.now() + off * 86400000)), off)
    const caDays = async () => Object.fromEntries((await C.idb('currentAffairsDays')).map((d) => [d.id, d]))
    const caPanel = () => C.ev(() => { const p = document.querySelector('.ca-day'); return p ? { state: p.dataset.state, day: p.dataset.day, status: p.querySelector('.ca-status').innerText.replace(/\s+/g, ' '), clock: p.querySelector('.ca-clock time').textContent, note: p.querySelector('.ca-clock small').textContent, acts: [...p.querySelectorAll('.ca-acts button')].map((b) => b.textContent).join('|'), finish: [...p.querySelectorAll('.ca-finish button')].map((b) => b.textContent).join('|'), notes: p.querySelectorAll('.ca-notes .row').length } : null })
    const caBar = () => C.ev(() => { const b = document.querySelector('.cabar'); return b ? { state: b.dataset.state, text: b.innerText.replace(/\s+/g, ' '), btns: [...b.querySelectorAll('.btn')].map((x) => x.textContent).join('|') } : null })
    const caFind = async (q) => { await C.ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))); await sleep(200); const r = await C.ev(async (q) => { const i = document.querySelector('.palette input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, q); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 250)); return [...document.querySelectorAll('.palette li:not(.grp)')].map((li) => (li.querySelector('.kind')?.textContent ?? '?') + '|' + li.querySelector('b').textContent) }, q); await C.page.keyboard.press('Escape'); await sleep(150); return r }
    const typeIn = async (sel, text) => { await C.ev((sel, text) => { const i = document.querySelector(sel); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, text); i.dispatchEvent(new Event('input', { bubbles: true })) }, sel, text); await sleep(120) }

    await C.page.emulateTimezone(zoneAt(5))
    await C.go('#/'); await sleep(500)
    check('before 07:00 local: Home shows no Current Affairs reminder', (await C.count('.cabar')) === 0 && /^0?5:/.test(await C.ev(() => new Date().toLocaleTimeString('en-GB'))), await caBar())
    await C.page.emulateTimezone(zoneAt(13)); await C.reload(); await sleep(500)
    const today = await cDay()
    const bar0 = await caBar()
    check('from 07:00, while today is not complete: a compact card — "Today\'s news is waiting · 0 min read" and Start Reading', bar0?.state === 'due' && /Today's news is waiting 0 min read/.test(bar0.text) && bar0.btns === 'Start Reading' && !/missed/.test(bar0.text), bar0)
    check('nothing is created by showing the reminder: no day record, no session', (await C.idb('currentAffairsDays')).length === 0 && (await C.idb('studySessions')).length === 0)

    // navigation
    await C.ev(() => [...document.querySelectorAll('.rail a')].find((a) => a.textContent === 'Current Affairs').click()); await sleep(350)
    const caTabs = await C.ev(() => [...document.querySelectorAll('.tabs a')].map((a) => a.textContent + ' ' + a.getAttribute('href')).join(' | '))
    check('desktop: Current Affairs is in the rail and opens Today · Calendar · Notes · Archive', (await C.ev(() => location.hash)) === '#/current-affairs' && (await C.text('h1.title')) === 'Current Affairs' && (await C.text('.rail a.on')) === 'Current Affairs' && caTabs === 'Today #/current-affairs | Calendar #/current-affairs/calendar | Notes #/current-affairs/notes | Archive #/current-affairs/archive | Analytics → #/insights/current-affairs', caTabs)
    const p0 = await caPanel()
    check('Today: the date, "Not completed", 00:00:00, Start Reading, Add Note, Today\'s Notes and Mark Today Complete', p0?.state === 'pending' && p0.day === today && /Not completed/.test(p0.status) && p0.clock === '00:00:00' && p0.acts === 'Start Reading|Add Note' && /^Mark Today Complete/.test(p0.finish) && /today's notes/i.test(await flat(C, '.ca-day')), p0)

    // the one global timer
    await tapBtn(C, 'Start Reading', '.ca-acts'); await sleep(2300)
    const run = await activeRow(C)
    const p1 = await caPanel()
    check('Start Reading starts the global timer in a current-affairs span for today', run?.state === 'running' && run.currentActivity?.activity === 'current-affairs' && run.currentActivity.currentAffairsDayId === today && run.currentContext.ref.kind === 'current-affairs' && run.currentContext.subjectTitle === 'Current Affairs' && (await secs(C)) >= 2 && p1.note === 'Reading now' && p1.clock !== '00:00:00' && p1.acts === 'Pause|Stop|Add Note', [run?.currentActivity, p1])
    const d1 = (await caDays())[today]
    check('the day record is made lazily, with the first start — and the timer alone does not complete it', d1?.status === 'pending' && d1.date === today && !!d1.firstStartedAt && !d1.completedAt && p1.state === 'pending', d1)
    await tapBtn(C, 'Pause', '.ca-acts'); await sleep(300)
    const frozen = (await caPanel()).clock
    await sleep(1300)
    check('Pause and Resume are the global timer\'s: paused time is not counted', (await caPanel()).clock === frozen && (await caPanel()).note === 'Paused' && (await activeRow(C)).state === 'paused' && (await caPanel()).acts === 'Resume|Stop|Add Note', frozen)
    await tapBtn(C, 'Resume', '.ca-acts'); await sleep(400)
    await C.hash('#/'); await sleep(500)
    const bar1 = await caBar()
    check('Home while reading: "Today · … · Reading now" and Continue', bar1?.state === 'active' && /^CURRENT AFFAIRS Today · .* Reading now/i.test(bar1.text) && bar1.btns === 'Continue', bar1)
    // Current Affairs → Study → Current Affairs: spans of one session
    await C.hash(PARL); await sleep(1300)
    const inStudy = await activeRow(C)
    check('opening a chapter moves the same timer to study: the reading span is closed, nothing is on a second timer', inStudy.sessionId === run.sessionId && !inStudy.currentActivity && inStudy.currentContext.ref.chapterId === 'parliament' && inStudy.completedSpans.filter((s) => s.activity === 'current-affairs').length >= 1, inStudy?.currentContext)
    await C.hash('#/current-affairs'); await sleep(400)
    const p2 = await caPanel()
    check('back on Today the timer is shown where it is, and Start Reading switches it back', /The study timer is on Prelims → Polity → Parliament/.test(p2.note) && p2.acts === 'Start Reading|Add Note', p2)
    await tapBtn(C, 'Start Reading', '.ca-acts'); await sleep(1200)
    check('Study → Current Affairs: still the same session', (await activeRow(C)).sessionId === run.sessionId && (await activeRow(C)).currentActivity?.activity === 'current-affairs')
    await tapBtn(C, 'Stop', '.ca-acts'); await sleep(500)
    const ses = (await C.idb('studySessions'))[0]
    const acts = ses.spans.map((s) => s.activity ?? 'initial-study')
    check('Stop saves one session whose spans are current-affairs · initial-study · current-affairs, each reading span carrying its news day', (await C.idb('studySessions')).length === 1 && acts[0] === 'current-affairs' && acts.includes('initial-study') && acts[acts.length - 1] === 'current-affairs' && ses.spans.filter((s) => s.activity === 'current-affairs').every((s) => s.currentAffairsDayId === today) && /Session saved/.test(await C.text('.toast')), acts)
    const p3 = await caPanel()
    const readSecs = ses.spans.filter((s) => s.activity === 'current-affairs').reduce((n, s) => n + s.durationMs, 0)
    check('the day\'s reading time is derived from those spans; the day is still not completed', p3.state === 'pending' && p3.clock === new Date(readSecs).toISOString().slice(11, 19) && p3.note === 'read' && !Object.keys((await caDays())[today]).some((k) => /ms$|duration|minutes/i.test(k)), [p3, readSecs])

    // a note
    await tapBtn(C, 'Add Note', '.ca-acts'); await sleep(250)
    await typeIn('.ca-form input[aria-label="Note title"]', 'RBI keeps the repo rate E2E')
    await typeIn('.ca-form input[aria-label="Source name"]', 'The Hindu')
    await typeIn('.ca-form input[aria-label="Source link"]', 'thehindu.com/business/rbi-e2e')
    await typeIn('.ca-form input[aria-label="Tags"]', 'Economy, #RBI')
    await tapBtn(C, 'Save and write', '.ca-form'); await sleep(700)
    const noteHash = await C.ev(() => location.hash)
    const noteId = noteHash.split('/').pop()
    check('Add Note: title, optional source, link and tags; the note opens ready to write, in the reader\'s own editor', /^#\/current-affairs\/note\/n/.test(noteHash) && (await C.count('.toolbar')) === 1 && (await C.count('.ca-body .ProseMirror')) === 1 && (await C.ev(() => document.querySelector('input.ca-title').value)) === 'RBI keeps the repo rate E2E')
    await C.ev(() => { const ed = document.querySelector('.ca-body .ProseMirror').editor; ed.commands.focus('end'); ed.commands.insertContent('<p>Repo rate held; <strong>CA-E2E-BODY</strong> stance neutral.</p><ul><li>MPC vote 6–0</li></ul>') })
    await C.tool('Bold'); await sleep(200)
    await typeIn('.ca-pick input', 'presiding officers'); await sleep(450)
    const picks = await C.ev(() => [...document.querySelectorAll('.ca-pick .row b')].map((b) => b.textContent))
    await C.ev(() => document.querySelector('.ca-pick .row').click()); await sleep(300)
    await C.saved()
    await tapBtn(C, 'Done', '.ca-ops'); await sleep(900)
    const nv = await C.ev(() => ({ title: document.querySelector('h1.title')?.textContent, body: document.querySelector('.ca-body')?.innerHTML ?? '', src: document.querySelector('a.ca-src')?.getAttribute('href'), srcText: document.querySelector('a.ca-src')?.textContent, rel: document.querySelector('a.ca-src')?.getAttribute('rel'), target: document.querySelector('a.ca-src')?.getAttribute('target'), tags: [...document.querySelectorAll('.ca-meta-row > a.chip')].map((a) => a.textContent).join('|'), links: [...document.querySelectorAll('.ca-links .row')].map((r) => r.innerText.replace(/\s+/g, ' ')), linkTo: document.querySelector('.ca-links .row a')?.getAttribute('href'), edit: !!document.querySelector('.toolbar') }))
    check('the note keeps its formatted text, source ("thehindu.com/…" became an https link opened safely) and tags', nv.title === 'RBI keeps the repo rate E2E' && /<strong>CA-E2E-BODY<\/strong>/.test(nv.body) && /<li>/.test(nv.body) && nv.src === 'https://thehindu.com/business/rbi-e2e' && nv.srcText === 'The Hindu' && /noopener/.test(nv.rel) && nv.target === '_blank' && nv.tags === '#Economy|#RBI' && !nv.edit, nv)
    check('linked study notes are chosen from search and stored as stable refs', picks.length > 0 && nv.links.length === 1 && nv.linkTo.startsWith('#/study/prelims/') && /Presiding/i.test(nv.links[0]), [picks, nv.links, nv.linkTo])
    const ent = (await C.idb('currentAffairsEntries'))[0]
    const bodyRow = (await C.idb('overrides')).find((o) => o.key === 'ca/' + noteId)
    check('stored local-first: the entry, its text as an edit under "ca/<id>", both queued; adding a note did not complete the day', ent.id === noteId && ent.dayId === today && ent.noteDocumentId === 'ca/' + noteId && ent.sourceUrl === 'https://thehindu.com/business/rbi-e2e' && ent.tags.join() === 'Economy,RBI' && ent.linkedContentRefs.length === 1 && ent.linkedContentRefs[0].kind === 'section' && !!ent.linkedContentRefs[0].sectionId && /CA-E2E-BODY/.test(bodyRow?.html ?? '') && (await C.idb('outbox')).some((o) => o.id === 'cae~' + noteId) && (await C.idb('outbox')).some((o) => o.id === 'edit~ca/' + noteId) && (await caDays())[today].status === 'pending', [ent, !!bodyRow])
    // editing the source link
    await tapBtn(C, 'Edit', '.ca-ops'); await sleep(400)
    // the link is saved when its field is left, so half an address is never kept
    await C.ev(() => document.querySelector('.ca-form input[aria-label="Source link"]').focus())
    await typeIn('.ca-form input[aria-label="Source link"]', 'https://pib.gov.in/e2e')
    const midEdit = (await C.idb('currentAffairsEntries'))[0].sourceUrl
    await C.ev(() => document.activeElement.blur()); await sleep(300)
    await tapBtn(C, 'Done', '.ca-ops'); await sleep(700)
    const srcNow = [await C.ev(() => document.querySelector('a.ca-src')?.getAttribute('href')), (await C.idb('currentAffairsEntries'))[0].sourceUrl, midEdit]
    check('a source link can be edited', srcNow[0] === 'https://pib.gov.in/e2e' && srcNow[1] === 'https://pib.gov.in/e2e' && srcNow[2] === 'https://thehindu.com/business/rbi-e2e', srcNow)

    // cross-links and search
    const target = ent.linkedContentRefs[0]
    await C.hash(`#/study/${target.stage}/${target.subjectId}/${target.chapterId}`); await sleep(500)
    await C.ev(() => document.querySelector('button[title="Related"]').click()); await sleep(300)
    const back = await C.ev(() => ({ heads: [...document.querySelectorAll('.relmenu b')].map((b) => b.textContent), note: [...document.querySelectorAll('.relmenu a')].find((a) => a.textContent.includes('RBI keeps the repo rate E2E'))?.getAttribute('href') }))
    check('backlink: the chapter\'s Related panel lists the Current Affairs note that links to it', back.heads.includes('Current Affairs') && back.note === '#/current-affairs/note/' + noteId, back)
    await C.page.keyboard.press('Escape'); await sleep(200)
    const f1 = await caFind('repo rate e2e')
    const f2 = await caFind('ca-e2e-body')
    const f3 = await caFind('current affairs')
    const f4 = await caFind('today')
    const f5 = await caFind('money bill')
    check('search finds the note by title and by its text, tagged as a Current Affairs note', f1[0] === 'CA note|RBI keeps the repo rate E2E' && f2.includes('CA note|RBI keeps the repo rate E2E'), [f1.slice(0, 3), f2.slice(0, 3)])
    check('search offers Current Affairs destinations and dates, each result naming its type', f3.slice(0, 4).join() === 'Current Affairs|Current Affairs — Today,Current Affairs|Current Affairs — Calendar,Current Affairs|Current Affairs — Notes,Current Affairs|Current Affairs — Archive' && f4[0].startsWith('CA date|') && f5.length > 0 && f5.every((x) => !x.startsWith('CA') && !x.startsWith('Current Affairs')) && f5.some((x) => /^(Section|In text|Chapter)\|/.test(x)), [f3.slice(0, 5), f4.slice(0, 2), f5.slice(0, 3)])

    // completion is explicit
    await C.hash('#/current-affairs'); await sleep(400)
    check('Today lists the note', (await caPanel()).notes === 1 && (await flat(C, '.ca-notes')).includes('RBI keeps the repo rate E2E'))
    await tapBtn(C, 'Mark Today Complete', '.ca-finish'); await sleep(400)
    const p4 = await caPanel()
    const d4 = (await caDays())[today]
    check('Mark Today Complete: the day is completed, with the moment it was done', p4.state === 'completed' && /✓ ?Completed/.test(p4.status) && p4.finish === 'Undo' && d4.status === 'completed' && !!d4.completedAt && !d4.caughtUpAt && d4.date === today, [p4, d4])
    await C.hash('#/'); await sleep(500)
    const bar2 = await caBar()
    check('Home collapses to a small success state: "Current Affairs complete · Today · … · 1 note"', bar2?.state === 'complete' && /CURRENT AFFAIRS COMPLETE Today · .* · 1 note/i.test(bar2.text) && bar2.btns === '', bar2)
    await C.hash('#/current-affairs'); await sleep(300)
    await tapBtn(C, 'Undo', '.ca-finish'); await sleep(300)
    check('Undo reopens the day', (await caPanel()).state === 'pending' && (await caDays())[today].status === 'pending' && !(await caDays())[today].completedAt)

    // missed, caught up, excused — an earlier day that was started and never completed
    const [d1ago, d2ago, d3ago] = [await cDay(-1), await cDay(-2), await cDay(-3)]
    await C.ev((day, tz) => new Promise((res) => {
      const t0 = Date.now() - 3 * 86400000
      const iso = (ms) => new Date(ms).toISOString()
      const q = indexedDB.open('upsc-notes')
      q.onsuccess = () => {
        const db = q.result
        const tx = db.transaction(['currentAffairsDays', 'studySessions'], 'readwrite')
        tx.objectStore('currentAffairsDays').put({ id: day, date: day, timeZone: tz, status: 'pending', firstStartedAt: iso(t0), createdAt: iso(t0), updatedAt: iso(t0) })
        const span = { id: 'seed-ca-0', context: { ref: { kind: 'current-affairs', dayId: day }, subjectTitle: 'Current Affairs', chapterTitle: day }, startedAt: iso(t0), endedAt: iso(t0 + 20 * 60000), durationMs: 20 * 60000, activity: 'current-affairs', currentAffairsDayId: day }
        tx.objectStore('studySessions').put({ id: 'seed-ca', startedAt: span.startedAt, endedAt: span.endedAt, durationMs: span.durationMs, spans: [span], source: 'timer', createdDeviceId: 'seed', timeZone: tz, createdAt: span.endedAt, syncedAt: span.endedAt })
        tx.oncomplete = () => { db.close(); res(true) }
      }
    }), d3ago, await C.ev(() => Intl.DateTimeFormat().resolvedOptions().timeZone))
    await C.hash('#/'); await C.reload(); await sleep(700)
    const days5 = await caDays()
    check('a day left pending is marked missed at the first evaluation after it has passed; its date is not changed', days5[d3ago]?.status === 'missed' && days5[d3ago].date === d3ago && Object.keys(days5).sort().join() === [d3ago, today].sort().join(), days5)
    const bar3 = await caBar()
    check('Home with a missed previous day: "Today due · 3 missed days", Start Today and Catch Up — quiet, not red', bar3?.state === 'due' && /Today due/.test(bar3.text) && /3 missed days/.test(bar3.text) && bar3.btns === 'Start Today|Catch Up' && (await C.ev(() => document.querySelector('.cabar a.btn').getAttribute('href'))) === '#/current-affairs/day/' + d1ago && (await C.ev(() => !/rgb\((1[5-9]\d|2\d\d), (\d|[1-9]\d), /.test(getComputedStyle(document.querySelector('.cabar .ca-missed')).color))), bar3)
    await C.hash('#/current-affairs/calendar?d=' + d3ago); await sleep(500)
    const cal = await C.ev((t) => ({ key: document.querySelector('.ca-key').innerText.replace(/\s+/g, ' '), cells: document.querySelectorAll('.ca-cal .cal-d').length, today: document.querySelector(`.ca-cal .cal-d[data-date="${t}"]`)?.dataset.state, future: [...document.querySelectorAll('.ca-cal .cal-d[data-state="future"]')].every((b) => b.disabled) }), today)
    const p5 = await caPanel()
    check('Calendar: a month grid with the five states keyed (✓ × ● ↺ ○); the selected day shows its state, derived reading time and actions', cal.cells >= 28 && cal.today === 'pending' && cal.future && /✓ ?Completed/.test(cal.key) && /↺ ?Caught up/.test(cal.key) && /× ?Missed/.test(cal.key) && /○ ?Excused/.test(cal.key) && /● ?Today/.test(cal.key) && p5.day === d3ago && p5.state === 'missed' && /Missed/.test(p5.status) && p5.clock === '00:20:00' && p5.acts === 'Start Catch-Up|Add Note' && /^Mark Complete · caught up/.test(p5.finish), [cal, p5])
    await tapBtn(C, 'Mark Complete', '.ca-finish'); await sleep(400)
    const d6 = (await caDays())[d3ago]
    const p6 = await caPanel()
    check('completing a missed day: caught up — the news date is kept, the real completion time recorded', d6.status === 'caught-up' && d6.date === d3ago && d6.id === d3ago && !!d6.caughtUpAt && d6.caughtUpAt === d6.completedAt && Date.parse(d6.caughtUpAt) > Date.now() - 60000 && p6.state === 'caught-up' && /Caught up · completed/.test(p6.status), [d6, p6.status])
    await C.hash('#/current-affairs/day/' + d2ago); await sleep(400)
    const p7 = await caPanel()
    await tapBtn(C, 'Excuse this day', '.ca-finish'); await sleep(300)
    check('a day with no record is missed by the calendar alone; it can be excused, which is its own state', p7.state === 'missed' && p7.clock === '00:00:00' && (await caDays())[d2ago]?.status === 'excused' && (await caPanel()).state === 'excused' && !(await caDays())[d2ago].completedAt, p7)
    await C.hash('#/current-affairs'); await sleep(300)
    await tapBtn(C, 'Mark Today Complete', '.ca-finish'); await sleep(300)

    // archive
    const months = [...new Set([today, d3ago].map((d) => d.slice(0, 7)))]
    const arch = []
    for (const mk of months) { await C.hash('#/current-affairs/archive?m=' + mk); await sleep(350); arch.push(...(await C.ev(() => [...document.querySelectorAll('.ca-arch .row')].map((r) => r.dataset.day + ' ' + r.dataset.state + ' ' + r.innerText.replace(/\s+/g, ' '))))) }
    const row = (d) => arch.find((r) => r.startsWith(d)) ?? ''
    check('Archive: newest first, each day with its state, derived time and notes', arch.length === 4 && /completed .*✓.*1 note/.test(row(today)) && / missed .*×/.test(row(d1ago)) && / excused .*○/.test(row(d2ago)) && / caught-up .*↺.*20 min/.test(row(d3ago)) && arch[0].startsWith(today), arch)
    await C.hash('#/current-affairs/archive?m=' + today.slice(0, 7)); await sleep(300)
    await C.ev(() => document.querySelector('.ca-arch .ca-titles a').click()); await sleep(400)
    check('Archive: a note opens that exact note; a day opens that exact day', (await C.ev(() => location.hash)) === '#/current-affairs/note/' + noteId && (await C.ev(async (d) => { location.hash = '#/current-affairs/archive'; await new Promise((r) => setTimeout(r, 300)); return document.querySelector(`.ca-arch .row[data-day="${d}"] a.t`)?.getAttribute('href') }, today)) === '#/current-affairs/day/' + today)
    await C.hash('#/current-affairs/notes'); await sleep(300)
    const notesTab = await C.ev(() => ({ rows: [...document.querySelectorAll('.ca-notes .row')].map((r) => r.innerText.replace(/\s+/g, ' ')), tags: [...document.querySelectorAll('.ca-tags a')].map((a) => a.textContent).join('|') }))
    check('Notes: every note, with source and tags; a tag filters', notesTab.rows.length === 1 && /The Hindu/.test(notesTab.rows[0]) && /#Economy/.test(notesTab.rows[0]) && /#Economy 1/.test(notesTab.tags) && (await C.ev(async () => { location.hash = '#/current-affairs/notes?tag=Nothing'; await new Promise((r) => setTimeout(r, 300)); return document.querySelectorAll('.ca-notes .row').length })) === 0, notesTab)

    // Insights
    await C.hash('#/insights/current-affairs'); await sleep(400)
    await C.ev(() => [...document.querySelectorAll('.filters .chip')].find((b) => b.textContent === 'All time').click()); await sleep(300)
    const ci = await C.ev(() => ({ kpi: Object.fromEntries([...document.querySelectorAll('.ca-kpis .kpi')].map((k) => [k.dataset.k, k.querySelector('b').textContent + ' · ' + k.querySelector('span').textContent])), counts: [...document.querySelectorAll('.ca-counts span')].map((s) => s.innerText.replace(/\s+/g, ' ')).join(' | '), strips: [...document.querySelectorAll('.ca-strip')].map((s) => s.dataset.k + ': ' + [...s.querySelectorAll('.ca-days a')].map((a) => a.dataset.s).join(',')), split: [...document.querySelectorAll('.act-split .dn')].map((d) => d.textContent).join('|'), fine: document.querySelector('.page .fine:last-of-type')?.textContent ?? '' }))
    check('Insights → Current Affairs: completed, caught-up, missed and excused days; consistency leaves excused days out', /4 days elapsed \| 1 completed \| 1 caught up \| 1 missed \| 1 excused/.test(ci.counts) && /^67% · 2 of 3 days covered · 33% on the day/.test(ci.kpi.consistency) && /Consistency = \(completed \+ caught up\) ÷ \(completed \+ caught up \+ missed\)/.test(ci.fine), ci)
    check('…study time from the sessions, the streak, notes, and the last 7 / 30 days', /^2\d min · /.test(ci.kpi.time) && /^1 day · longest 1 day/.test(ci.kpi.streak) && /^1 · /.test(ci.kpi.notes) && ci.strips.length === 2 && ci.strips[0].endsWith('caught-up,excused,missed,completed') && ci.split === 'Initial study|Revision|Current Affairs' && (await C.count('.vbars')) === 1, [ci.kpi, ci.strips])
    await C.hash('#/insights'); await sleep(400)
    const ov = await C.ev(() => ({ split: [...document.querySelectorAll('.act-split .dr')].map((d) => d.innerText.replace(/\s+/g, ' ')), subjects: [...document.querySelectorAll('.act-split ~ .dist .dn')].map((d) => d.textContent), fine: [...document.querySelectorAll('.fine')].map((f) => f.textContent).join(' ') }))
    check('Insights → Overview: Initial study · Revision · Current Affairs; reading time is in the totals but in no subject', ov.split.length === 3 && /^Current Affairs 2\d min/.test(ov.split[2]) && /^Initial study/.test(ov.split[0]) && ov.subjects.join() === 'Polity' && /is an activity of its own and is not part of any subject/.test(ov.fine), ov)
    await C.hash('#/insights/time'); await sleep(400)
    const opts = await C.ev(() => [...document.querySelectorAll('select[aria-label="Stage or subject"] option')].map((o) => o.textContent))
    await C.ev(() => { const s = document.querySelector('select[aria-label="Stage or subject"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'activity:current-affairs'); s.dispatchEvent(new Event('change', { bubbles: true })) }); await sleep(300)
    check('Insights → Time: the week, heatmap and trend can be read for Current Affairs alone', opts.includes('Activity · Current Affairs') && opts.includes('Activity · Initial study') && /study time · Current Affairs/.test(await flat(C, '.stat')) && (await C.count('.heat')) === 1, opts)

    // explicit revision
    check('a note is never put into revision by itself', (await C.idb('revisionUnits')).length === 0)
    await C.hash('#/current-affairs/note/' + noteId); await sleep(400)
    await tapBtn(C, 'Add to Revision', '.ca-ops'); await sleep(400)
    const ru = (await C.idb('revisionUnits'))[0]
    check('"Add to Revision" makes one unit in the existing scheduler: R1 the next day', ru?.id === 'ca/' + noteId && ru.status === 'new' && ru.dueDate === (await cDay(1)) && ru.target.kind === 'current-affairs' && ru.target.entryId === noteId && /In revision · R1 due/.test(await flat(C, '.ca-ops')), ru)
    await C.hash('#/revision/upcoming'); await sleep(400)
    const up2 = await C.ev(() => ({ group: document.querySelector('.rgroup h3 span')?.textContent, unit: document.querySelector('.runit')?.innerText.replace(/\s+/g, ' '), to: document.querySelector('.runit a.t')?.getAttribute('href') }))
    await C.hash('#/revise/ca/' + noteId); await sleep(900)
    const rv2 = await C.ev(() => ({ phase: document.querySelector('.revise')?.dataset.phase, title: document.querySelector('.revise h1')?.innerText.replace(/\s+/g, ' '), eyebrow: document.querySelector('.revise .eyebrow')?.textContent }))
    const rvRun = await activeRow(C)
    check('it is listed under Current Affairs in Revision and revised in a revision span of the same timer', up2.group === 'Current Affairs' && /RBI keeps the repo rate E2E/.test(up2.unit) && up2.to === '#/revise/ca/' + noteId && !!rv2.phase && /RBI keeps the repo rate E2E R1/.test(rv2.title) && /^Revision · Current Affairs › /.test(rv2.eyebrow) && rvRun?.currentActivity?.activity === 'revision' && rvRun.currentActivity.revisionUnitId === 'ca/' + noteId && rvRun.currentContext.ref.kind === 'current-affairs', [up2, rv2, rvRun?.currentActivity])
    await C.ev(() => document.querySelector('.ttime').click()); await sleep(200); await tapBtn(C, 'Stop', '.timer-pop'); await sleep(400)

    // persistence, stored state, phone
    await C.go('#/current-affairs'); await sleep(400)
    const disk3 = await C.ev(() => new Promise((res) => { const q = indexedDB.open('upsc-notes'); q.onsuccess = () => { const db = q.result; const stores = [...db.objectStoreNames].sort().join(); const g = db.transaction('kv').objectStore('kv').getAllKeys(); g.onsuccess = () => { db.close(); res({ stores, kv: g.result.join(), ls: Object.keys(localStorage).join() }) } } }))
    const daysJson = JSON.stringify(await C.idb('currentAffairsDays'))
    check('reload: the day state, notes and times are all still there; nothing derived was stored (no duration, streak or consistency on disk)', (await caPanel()).state === 'completed' && (await caPanel()).notes === 1 && disk3.stores === 'activeStudySession,conflicts,currentAffairsDays,currentAffairsEntries,examTargets,highlights,kv,outbox,overrides,pyqUserState,recallAttempts,revisionEvents,revisionPreferences,revisionUnits,studyGoals,studyQueue,studySessions,userDataEpoch' && !/current|affair|streak|consist|missed/i.test(disk3.kv + disk3.ls) && !/"\w*(Ms|[Dd]uration|[Mm]inutes|[Ss]treak|[Cc]onsistency|[Cc]ount)":/.test(daysJson), disk3)
    await C.page.setViewport({ width: 375, height: 812 }); await C.go('#/current-affairs'); await sleep(400)
    const ph = await C.ev(() => ({ bar: [...document.querySelectorAll('.tabbar a, .tabbar button')].map((e) => e.textContent).join('|'), on: document.querySelector('.tabbar .on')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth + 1 }))
    await C.click('.tabbar button')
    const inMore = await C.ev(() => [...document.querySelectorAll('.menu.more a')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent))
    await C.ev(() => [...document.querySelectorAll('.menu.more a')].find((a) => a.textContent === 'Current Affairs').click()); await sleep(300)
    const overflow = []
    for (const r of ['#/current-affairs', '#/current-affairs/calendar', '#/current-affairs/notes', '#/current-affairs/archive', '#/current-affairs/note/' + noteId, '#/current-affairs/day/' + d3ago, '#/insights/current-affairs', '#/']) { await C.hash(r); if (await C.ev(() => document.documentElement.scrollWidth > innerWidth + 1)) overflow.push(r) }
    check('phone: the five bottom tabs are unchanged, Current Affairs opens from More and every view fits', ph.bar === 'Home|Study|PYQs|Insights|More' && ph.on === 'More' && !ph.overflow && inMore.includes('Current Affairs') && overflow.length === 0 && (await C.ev(() => location.hash)) === '#/', [ph, inMore, overflow])
    await C.hash('#/current-affairs/calendar'); await sleep(300)
    await C.page.screenshot({ path: join(OUT, 'phone-current-affairs-calendar.png'), fullPage: true })
    await C.page.setViewport({ width: 1280, height: 860 })
    await C.hash('#/current-affairs'); await sleep(300); await C.page.screenshot({ path: join(OUT, 'desktop-current-affairs.png'), fullPage: true })
    await C.hash('#/current-affairs/calendar'); await sleep(300); await C.page.screenshot({ path: join(OUT, 'desktop-current-affairs-calendar.png'), fullPage: true })
    await C.hash('#/current-affairs/archive'); await sleep(300); await C.page.screenshot({ path: join(OUT, 'desktop-current-affairs-archive.png'), fullPage: true })
    await C.hash('#/current-affairs/note/' + noteId); await sleep(300); await C.page.screenshot({ path: join(OUT, 'desktop-current-affairs-note.png'), fullPage: true })
    await C.hash('#/insights/current-affairs'); await sleep(300); await C.page.screenshot({ path: join(OUT, 'desktop-insights-current-affairs.png'), fullPage: true })
    await C.key('t'); await C.hash('#/'); await sleep(600); await C.page.screenshot({ path: join(OUT, 'desktop-home-current-affairs-alt-theme.png'), fullPage: true }); await C.key('t')

    // reset
    const resetC = async (open, confirm) => { await C.hash('#/settings'); await tapBtn(C, open); await sleep(300); await C.page.type('.reset-word input', 'RESET'); await sleep(150); await tapBtn(C, confirm, '.reset .acts'); await sleep(1500) }
    await resetC('Reset study history', 'Reset study history')
    const r1 = { days: (await C.idb('currentAffairsDays')).length, ses: (await C.idb('studySessions')).length, units: (await C.idb('revisionUnits')).length, entries: (await C.idb('currentAffairsEntries')).filter((e) => !e.removed).length, body: /CA-E2E-BODY/.test((await C.idb('overrides')).find((o) => o.key === 'ca/' + noteId)?.html ?? ''), queued: (await C.idb('outbox')).filter((o) => /^(cad|ses)~/.test(o.id)).length }
    await C.go('#/current-affairs'); await sleep(400)
    const p8 = await caPanel()
    await C.hash('#/insights/current-affairs'); await sleep(300)
    const noStats = await C.ev(() => ({ kpis: document.querySelectorAll('.ca-kpis .kpi').length, c: document.querySelector('.ca-kpis [data-k="consistency"] b')?.textContent, t: document.querySelector('.ca-kpis [data-k="time"] b')?.textContent, s: document.querySelector('.ca-kpis [data-k="streak"] b')?.textContent }))
    check('Reset Study History clears the day record, the reading sessions and every figure derived from them', r1.days === 0 && r1.ses === 0 && r1.units === 0 && r1.queued === 0 && p8.state === 'pending' && p8.clock === '00:00:00' && noStats.c === '—' && noStats.t === '0 min' && noStats.s === '0 days', [r1, p8, noStats])
    check('…and keeps the Current Affairs notes, with their text, source, tags and links', r1.entries === 1 && r1.body && p8.notes === 1 && (await C.ev(async (id) => { location.hash = '#/current-affairs/note/' + id; await new Promise((r) => setTimeout(r, 400)); return document.querySelector('.ca-body')?.textContent.includes('CA-E2E-BODY') && document.querySelectorAll('.ca-links .row').length === 1 && !!document.querySelector('a.ca-src') }, noteId)))
    await resetC('Full personal reset', 'Reset everything personal')
    await C.go('#/current-affairs/notes'); await sleep(400)
    check('Full Personal Reset removes the notes as well; the library is untouched', (await C.idb('currentAffairsEntries')).length === 0 && (await C.idb('overrides')).length === 0 && (await C.idb('currentAffairsDays')).length === 0 && /No Current Affairs notes yet/.test(await C.text('.shell-note')) && (await C.ev(async (h) => { location.hash = h; await new Promise((r) => setTimeout(r, 400)); return document.querySelectorAll('.sec').length }, PARL)) > 5)
    await C.ctx.close()
  }

  section('Print / PDF')
  await L.hash(PARL)
  await L.key('r') // Recall Mode ON: answers must still print
  await L.click('#s-presiding-officers .chev') // one collapsed section: must print expanded
  await sleep(400)
  await L.page.emulateMediaType('print')
  const pr = await L.ev(() => {
    const d = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'absent' }
    const rc = document.querySelector('#s-composition-and-constitutional-map .rc')
    return { topbar: d('.topbar'), sidebar: d('.sidebar'), tools: d('.sec-tools'), meta: d('.chap-meta'), pn: d('.pn'), bar: d('.readbar'), acct: d('.acct'),
      bg: getComputedStyle(document.body).backgroundColor, ink: getComputedStyle(document.querySelector('.prose')).color, rc: getComputedStyle(rc.querySelector('.rq-a')).display + '|' + getComputedStyle(rc, '::before').content,
      collapsed: document.querySelector('#s-presiding-officers .sec-body').getBoundingClientRect().height, table: getComputedStyle(document.querySelector('.prose table')).display,
      clipped: [...document.querySelectorAll('.prose table, .prose .callout')].filter((e) => e.scrollWidth > e.clientWidth + 1).length }
  })
  check('print: controls hidden', [pr.topbar, pr.sidebar, pr.tools, pr.meta, pr.pn, pr.bar].every((x) => x === 'none'), pr)
  check('print: white background, dark text', pr.bg === 'rgb(255, 255, 255)' && pr.ink === 'rgb(17, 17, 17)', pr)
  check('print: recall answers revealed', pr.rc === 'contents|none', pr.rc)
  check('print: collapsed section expanded', pr.collapsed > 100, pr.collapsed)
  check('print: tables are real tables, nothing clipped', pr.table === 'table' && pr.clipped === 0, pr)
  await L.page.pdf({ path: join(OUT, 'print-parliament.pdf'), preferCSSPageSize: true, printBackground: true })
  await L.page.emulateMediaType('screen')
  const pdf = readFileSync(join(OUT, 'print-parliament.pdf'))
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
  check(`print: real PDF generated by the browser (${pages} A4 pages, ${Math.round(pdf.length / 1024)} KB)`, pdf.length > 20000 && pdf.subarray(0, 5).toString() === '%PDF-', pages)
  // a dark-theme print must still be white
  await L.key('t'); await L.page.emulateMediaType('print')
  check('print from dark theme is still white', (await L.ev(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(255, 255, 255)')
  await L.page.emulateMediaType('screen'); await L.key('t'); await L.key('r'); await L.click('#s-presiding-officers .chev')

  // ==========================================================================
  section('Responsive layout')
  const routes = ['#/', '#/study', '#/study/mains', '#/pyqs', '#/insights', '#/study/prelims/polity', '#/study/prelims/polity?tab=insights', '#/highlights', '#/revision', '#/revision/upcoming', '#/revision/calendar', '#/revision/manual', '#/insights/revision', '#/settings', '#/insights/time', '#/insights/subjects', '#/insights/progress', PARL, '#/study/prelims/polity/constitutional-bodies', '#/study/prelims/polity/parts-schedules', '#/study/prelims/economy', '#/study/prelims/economy?tab=insights', '#/study/prelims/economy/budget-fiscal-policy', '#/study/prelims/economy/government-schemes', '#/study/prelims/economy/money-rbi-monetary-policy', '#/study/prelims/economy/international-institutions', '#/study/prelims/history-culture', '#/study/prelims/history-culture?tab=insights', '#/study/prelims/history-culture/constitutional-development', '#/study/prelims/history-culture/architecture-sculpture', '#/study/prelims/history-culture/early-nationalism-swadeshi', '#/study/prelims/history-culture/british-administration-economy', '#/study/prelims/geography', '#/study/prelims/geography?tab=insights', '#/study/prelims/geography/india-drainage', '#/study/prelims/geography/world-regional', '#/study/prelims/environment', '#/study/prelims/environment/international-conventions', '#/study/prelims/environment/protected-areas', '#/study/prelims/science-tech', '#/study/prelims/science-tech/physics-everyday', '#/study/prelims/science-tech/defence-organisations', '#/pyqs?subject=geography']
  for (const [name, w, h] of [['phone 375', 375, 812], ['tablet 768', 768, 1024], ['desktop 1280', 1280, 860]]) {
    await L.page.setViewport({ width: w, height: h })
    const bad = []
    for (const r of routes) { await L.hash(r); if (await L.ev(() => document.documentElement.scrollWidth > innerWidth + 1)) bad.push(r) }
    await L.hash(PARL); await L.editMode(true)
    if (await L.ev(() => document.documentElement.scrollWidth > innerWidth + 1)) bad.push('edit mode')
    await L.editMode(false)
    await L.panel(true)
    const box = await L.ev(() => { const r = document.querySelector('.acct-panel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 200 })
    await L.panel(false)
    check(`${name}: no horizontal overflow on ${routes.length + 1} views`, bad.length === 0, bad)
    check(`${name}: account panel fits the viewport`, box)
    if (w === 375) { await L.page.screenshot({ path: join(OUT, 'phone.png') }); await L.click('button[aria-label="Study explorer"]'); await sleep(350); check('phone: explorer opens over content', (await L.ev(() => document.querySelector('.sidebar').getBoundingClientRect().left)) === 0); await L.click('.scrim') }
  }
  await L.page.screenshot({ path: join(OUT, 'desktop.png') })

  // ==========================================================================
  section('Install app (PWA)')
  await L.page.setViewport({ width: 1280, height: 860 })
  await L.go('#/')
  const cdpL = await L.page.createCDPSession()
  const man = (await cdpL.send('Page.getAppManifest'))
  const mf = JSON.parse(man.data || '{}')
  const icon = (px) => (mf.icons ?? []).some((i) => i.sizes === `${px}x${px}` && i.type === 'image/png')
  check('manifest: name, short_name, start_url, display standalone, 192 + 512 PNG icons', man.errors.length === 0 && mf.name === 'UPSC Notes Reader' && mf.short_name === 'UPSC Notes' && !!mf.start_url && mf.display === 'standalone' && icon(192) && icon(512), [man.errors, mf])
  const iconOk = await L.ev(async (srcs) => Promise.all(srcs.map((s) => new Promise((res) => { const im = new Image(); im.onload = () => res(`${im.naturalWidth}x${im.naturalHeight}`); im.onerror = () => res('error'); im.src = s }))), ['icon-192.png', 'icon-512.png'])
  check('manifest icons load at their declared size', iconOk.join() === '192x192,512x512', iconOk)
  await L.page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 15000 })
  const instErr = (await cdpL.send('Page.getInstallabilityErrors')).installabilityErrors.map((e) => e.errorId)
  check('Chrome reports no installability errors', instErr.filter((e) => e !== 'in-incognito').length === 0, instErr)
  const fire = () => L.ev(() => { window.__prompted = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted++; return Promise.resolve() }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); return e.defaultPrevented })
  const menuHas = async (label) => { await L.ev(() => document.querySelector('button[aria-label="More"]').click()); await sleep(150); const has = await L.ev((l) => [...document.querySelectorAll('.menu button')].some((b) => b.textContent === l), label); await L.ev(() => document.querySelector('button[aria-label="More"]').click()); await sleep(150); return has }
  await L.reload() // drop any real prompt the browser may have sent
  const real = await L.count('.ib.install')
  if (real) await L.ev(() => window.dispatchEvent(new Event('appinstalled')))
  await L.reload()
  check('no Install button until the browser says installation is available', real > 0 || ((await L.count('.ib.install')) === 0 && !(await menuHas('Install app'))))
  const prevented = await fire(); await sleep(200)
  check('beforeinstallprompt is captured: Install button and menu entry appear', prevented && (await L.count('.ib.install')) === 1 && (await menuHas('Install app')))
  await L.click('.ib.install'); await sleep(200)
  check('clicking Install opens the native prompt once and the used prompt is dropped', (await L.ev(() => window.__prompted)) === 1 && (await L.count('.ib.install')) === 0)
  await fire(); await sleep(150)
  await L.ev(() => window.dispatchEvent(new Event('appinstalled'))); await sleep(250)
  check('appinstalled hides the button and confirms', (await L.count('.ib.install')) === 0 && !(await menuHas('Install app')) && (await L.text('.toast')) === 'App installed')
  // an installed app runs with display-mode: standalone
  const asApp = await L.page.evaluateOnNewDocument(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q)) })
  await L.reload(); await fire(); await sleep(200)
  check('standalone (installed app) never shows Install', (await L.ev(() => matchMedia('(display-mode: standalone)').matches)) && (await L.count('.ib.install')) === 0 && !(await menuHas('Install app')) && !(await menuHas('Install app…')))
  await L.page.removeScriptToEvaluateOnNewDocument(asApp.identifier)
  await L.page.setViewport({ width: 375, height: 812 })
  await L.reload(); await fire(); await sleep(200)
  check('phone: Install button fits the top bar on the Library page', (await L.count('.ib.install')) === 1 && !(await L.ev(() => document.documentElement.scrollWidth > innerWidth + 1)))
  await L.hash(PARL); await sleep(200)
  check('phone: in a chapter, Install moves to the ⋯ menu', (await L.ev(() => getComputedStyle(document.querySelector('.ib.install')).display)) === 'none' && (await menuHas('Install app')) && !(await L.ev(() => document.documentElement.scrollWidth > innerWidth + 1)))
  const ua = await browser.userAgent()
  await L.page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')
  await L.go('#/'); await L.reload()
  await L.menu('Install app…'); await sleep(200)
  check('iOS: no broken button — the menu gives Add to Home Screen steps', (await L.count('.ib.install')) === 0 && ((await L.text('[aria-label="Install app"]')) ?? '').includes('Add to Home Screen'))
  await L.page.keyboard.press('Escape'); await sleep(150)
  check('install instructions close with Esc', (await L.count('[role="dialog"][aria-label="Install app"]')) === 0)
  await L.page.setUserAgent(ua); await L.page.setViewport({ width: 1280, height: 860 }); await L.go(PARL); await L.reload()

  // ==========================================================================
  section('Offline (PWA)')
  await L.page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 15000 })
  await L.page.setOfflineMode(true)
  await L.reload()
  check('offline: full reload served by the service worker', (await L.count('.sec')) === 9)
  await L.hash('#/study/prelims/polity/judiciary')
  check('offline: navigation and cached notes', (await L.ev(() => document.title)).startsWith('Judiciary'))
  await L.hash('#/study/prelims/economy/taxation/gst')
  await L.ev(() => document.querySelector('#s-gst a.xref[data-xref^="prelims/polity/"]').click()); await sleep(400)
  check('offline: Economy and cross-subject links work', (await L.ev(() => location.hash)) === '#/study/prelims/polity/amendments-basic-structure/three-routes-of-change' && (await L.count('.sec')) > 3)
  await L.hash('#/study/prelims/history-culture/communal-politics-ina-partition/communal-award-poona')
  await L.ev(() => document.querySelector('#s-communal-award-poona a.xref[data-xref^="prelims/polity/"]').click()); await sleep(400)
  check('offline: History and its cross-subject links work', (await L.ev(() => location.hash)) === '#/study/prelims/polity/elections/reservation-in-legislatures' && (await L.count('.sec')) > 3)
  await L.hash('#/study/prelims/science-tech/energy-technologies/nuclear')
  await L.ev(() => document.querySelector('#s-nuclear a.xref[data-xref^="prelims/geography/"]').click()); await sleep(400)
  const offGeo = await L.ev(() => location.hash); const offGeoSecs = await L.count('.sec')
  await L.hash('#/study/prelims/environment/pollution/aqi')
  check('offline: Geography, Environment and Science & Technology open and cross-link', offGeo === '#/study/prelims/geography/india-minerals-energy-industry/atomic-beach-minerals' && offGeoSecs > 3 && (await L.count('.sec')) === 8 && (await L.count('#s-aqi .rc')) > 0, [offGeo, offGeoSecs])
  await L.hash('#/study/prelims/economy/taxation'); await L.click('.chap-meta .fav.q'); await L.reload(); await L.hash('#/'); await sleep(700)
  const offHome = await L.ev(() => ({ cards: document.querySelectorAll('.card').length, cells: document.querySelectorAll('.week .heat i[data-date]').length, bars: document.querySelectorAll('.week .vb').length, today: document.querySelector('.today .big').dataset.final }))
  check('offline: Home is drawn from this device — figures, charts, and a queue change that persists', offHome.cards >= 8 && offHome.cells >= 85 && offHome.bars === 7 && /min$/.test(offHome.today) && (await L.idb('studyQueue')).some((r) => r.target.chapterId === 'taxation' && !r.removed) && (await qTitles()).length === (await L.idb('studyQueue')).filter((r) => !r.removed && !r.completedAt).length, offHome)
  await L.hash('#/pyqs?subject=economy&status=review-required'); await sleep(300)
  const offPyq = await L.ev(() => ({ n: document.querySelectorAll('.pq').length, flagged: [...document.querySelectorAll('.pq')].every((li) => li.dataset.status === 'review-required') }))
  await L.click('.pq button[aria-label="Mark difficult"]'); await L.ev(() => document.querySelector('.pq-notes a').click()); await sleep(450)
  check('offline: the PYQ Hub filters, flags and opens notes from this device alone', offPyq.n === 9 && offPyq.flagged && (await L.ev(() => location.hash)).startsWith('#/study/prelims/economy/') && (await L.count('.sec')) > 2 && (await L.idb('pyqUserState')).some((r) => r.difficult && r.pyqId.startsWith('U')), offPyq)
  await L.hash('#/insights/time')
  check('offline: Insights is drawn from the sessions on this device', (await L.count('.heat i[data-date]')) >= 365 && (await L.count('.vbars .vb')) >= 7 && (await L.count('.nodata')) === 0)
  await L.hash('#/study/prelims/polity/judiciary')
  await L.highlight('article-map', 'Supreme Court', 'green'); await L.click('#s-article-map .tg.done')
  await L.reload()
  check('offline: local changes persist', (await L.marks('article-map')).length === 1 && (await L.text('.chap-meta span')).startsWith('1 /'))
  await L.click('button[aria-label="Start study timer"]'); await sleep(1300)
  await L.reload()
  const offRun = await activeRow(L)
  await L.click('button[aria-label="Stop timer"]'); await sleep(400)
  check('offline: the timer starts, survives a reload and saves its session; local-only timers are never provisional', offRun.state === 'running' && offRun.offlineProvisional === undefined && (await L.idb('studySessions')).length === 8 && (await L.idb('studySessions')).some((x) => x.id === offRun.sessionId && x.spans[0].context.ref.chapterId === 'judiciary'))
  await L.page.setOfflineMode(false)
  await L.ctx.close()

  // ==========================================================================
  section('Sync — first sign-in with existing local data')
  const A = await device(P.sync, 'A')
  await A.go(PARL)
  // substantial local state before any account exists
  await A.highlight('bills-types-and-procedure', 'All Money Bills are Financial Bills', 'green')
  await A.editMode(true); await A.edit('presiding-officers', '<p>DEVICE-A local edit before sign-in</p>'); await A.saved(); await A.editMode(false)
  await A.click('#s-presiding-officers .tg.done'); await A.click('#s-sessions-and-devices .tg.star'); await A.click('#s-sessions-and-devices .tg.rev')
  await A.ev(() => { document.querySelector('.chap-meta select').value = 'revised'; document.querySelector('.chap-meta select').dispatchEvent(new Event('change', { bubbles: true })) })
  await A.key('t') // explicit theme, the opposite of this machine's default
  const themeA = await A.ev(() => document.documentElement.dataset.theme)
  await A.ev(() => window.scrollTo(0, 1800)); await sleep(1000)
  check('signed out: status is "Local only", both choices offered', (await A.status()).includes('Sync across devices') && (await A.ev(() => [...document.querySelectorAll('.acct-panel button')].map((b) => b.textContent).join('|'))) === 'Sign in with Google|Continue locally')
  await A.panelClick('Continue locally')
  check('"Continue locally" changes nothing and sends nothing', (await A.count('.acct-panel')) === 0 && (await cloudDump()).length === 0 && (await A.marks('bills-types-and-procedure')).length === 1)
  await A.panelClick('Sign in with Google'); await sleep(600)
  const stA = await A.syncNow()
  check('signed in: name shown, status reaches Synced', stA.includes('Synced') && (await A.status(), (await A.text('.acct-user b')) === 'Test User'), stA)
  await A.panel(false)
  const dump1 = await cloudDump()
  const kinds = (k) => dump1.filter((d) => d.rec.kind === k).length
  check('local edits, highlights, progress and preferences uploaded as separate records', kinds('edit') === 1 && kinds('hl') === 1 && kinds('sec') === 2 && kinds('chap') >= 1 && kinds('pref') === 1, dump1.map((d) => d.rec.id))
  check('static chapter content is not uploaded', JSON.stringify(dump1).length < 20000 && !JSON.stringify(dump1).includes('Estimates'))
  check('local data untouched by sign-in', (await A.text('#s-presiding-officers .sec-body')).includes('DEVICE-A local edit') && (await A.marks('bills-types-and-procedure')).length === 1 && (await A.text('.chap-meta span')) === '1 / 9 sections done')

  section('Sync — second device')
  const B = await device(P.sync, 'B')
  await B.go('#/')
  const themeB0 = await B.ev(() => document.documentElement.dataset.theme)
  await B.panelClick('Sign in with Google'); await sleep(600); await B.syncNow()
  check('theme preference restored', themeB0 !== themeA && (await B.ev(() => document.documentElement.dataset.theme)) === themeA, [themeB0, themeA])
  check('Resume points at the chapter last read on device A', (await B.text('.cont'))?.includes('Parliament'))
  await B.click('.cont .btn.primary'); await sleep(600)
  check('reading position restored', Math.abs((await B.ev(() => scrollY)) - 1800) < 60, await B.ev(() => scrollY))
  check('chapter edit restored', (await B.text('#s-presiding-officers .sec-body')).includes('DEVICE-A local edit'))
  check('highlight + colour restored', (await B.marks('bills-types-and-procedure')).join() === 'green:All Money Bills are Financial Bills')
  check('completion, status, ★ Difficult and ↻ Revise restored', (await B.text('.chap-meta span')) === '1 / 9 sections done' && (await B.ev(() => document.querySelector('.chap-meta select').value)) === 'revised' && (await B.ev(() => ['star', 'rev'].every((c) => document.querySelector(`#s-sessions-and-devices .tg.${c}`).classList.contains('on')))))
  await B.page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 15000 })
  await B.page.setOfflineMode(true); await B.reload()
  check('second device works offline with the synced state', (await B.text('#s-presiding-officers .sec-body')).includes('DEVICE-A local edit') && (await B.marks('bills-types-and-procedure')).length === 1)
  await B.page.setOfflineMode(false); await B.ev(() => window.dispatchEvent(new Event('online'))); await sleep(500)

  section('Sync — independent changes merge')
  await B.click('#s-budget-and-financial-procedure .tg.done') // B: progress
  await A.highlight('budget-and-financial-procedure', 'Vote on Account', 'pink') // A: highlight, same section
  await A.editMode(true); await A.edit('parliamentary-committees', '<p>A edits committees</p>'); await A.saved(); await A.editMode(false)
  await B.editMode(true); await B.edit('sessions-and-devices', '<p>B edits sessions</p>'); await B.saved(); await B.editMode(false)
  await A.syncNow(); await B.syncNow(); const mA = await A.syncNow()
  for (const [d, n] of [[A, 'A'], [B, 'B']]) {
    check(`${n}: has B's progress, A's highlight and both edits`, (await d.text('.chap-meta span')) === '2 / 9 sections done' && (await d.marks('budget-and-financial-procedure')).join() === 'pink:Vote on Account' && (await d.text('#s-parliamentary-committees .sec-body')).includes('A edits committees') && (await d.text('#s-sessions-and-devices .sec-body')).includes('B edits sessions'))
  }
  check('no conflict raised for independent changes', mA.includes('Synced'), mA)

  section('Sync — Economy')
  await A.hash('#/study/prelims/economy/inflation')
  await A.highlight('base-effect', 'same period last year', 'green'); await A.click('#s-causes .tg.done')
  await A.editMode(true); await A.edit('control', '<p>A edits inflation control</p>'); await A.saved(); await A.editMode(false)
  await A.syncNow(); await B.syncNow()
  await B.hash('#/study/prelims/economy/inflation')
  const ecoB = { meta: await B.text('.chap-meta span'), marks: (await B.marks('base-effect')).join(), edit: (await B.text('#s-control .sec-body')).includes('A edits inflation control'), link: await B.ev(() => document.querySelector('#s-control .sec-body a.xref')?.getAttribute('href')) }
  check('Economy progress, highlight and edit reach the second device with links intact', ecoB.meta === '1 / 6 sections done' && ecoB.marks === 'green:same period last year' && ecoB.edit && ecoB.link === '#/study/prelims/economy/money-rbi-monetary-policy/policy-tools', ecoB)

  section('Sync — History & Culture')
  await A.hash('#/study/prelims/history-culture/gandhian-mass-movements')
  await A.highlight('quit-india', 'Do or Die', 'green'); await A.click('#s-rowlatt-jallianwala .tg.done')
  await A.editMode(true); await A.edit('gandhi-irwin-rtc', '<p>A edits the pact</p>'); await A.saved(); await A.editMode(false)
  await A.syncNow(); await B.syncNow()
  await B.hash('#/study/prelims/history-culture/gandhian-mass-movements')
  const hisB = { meta: await B.text('.chap-meta span'), marks: (await B.marks('quit-india')).join(), edit: (await B.text('#s-gandhi-irwin-rtc .sec-body')).includes('A edits the pact'), link: await B.ev(() => document.querySelector('#s-gandhi-irwin-rtc .sec-body a.xref')?.getAttribute('href')) }
  check('History progress, highlight and edit reach the second device with links intact', hisB.meta === '1 / 7 sections done' && hisB.marks === 'green:Do or Die' && hisB.edit && hisB.link === '#/study/prelims/history-culture/communal-politics-ina-partition/communal-award-poona', hisB)
  section('Sync — Geography, Environment, Science & Technology')
  const S3 = [
    ['Geography', 'geography/climatology', 6, ['humidity', 'Condensation needs saturation'], 'tropical-cyclones', 'enso-iod'],
    ['Environment', 'environment/pollution', 8, ['heavy-metals', 'they cannot be broken down'], 'aqi', 'smog-acid-rain'],
    ['Science & Technology', 'science-tech/space-technology', 5, ['remote-sensing', 'see through cloud'], 'orbits', 'launch-vehicles'],
  ]
  for (const [name, path, secs, hl, done, edit] of S3) {
    await A.hash('#/study/prelims/' + path)
    await A.highlight(hl[0], hl[1], 'green'); await A.click('#s-' + done + ' .tg.done')
    await A.editMode(true); await A.edit(edit, '<p>A edits ' + path + '</p>'); await A.saved(); await A.editMode(false)
    await A.syncNow(); await B.syncNow()
    await B.hash('#/study/prelims/' + path)
    const got3 = { meta: await B.text('.chap-meta span'), marks: (await B.marks(hl[0])).join(), edit: (await B.text('#s-' + edit + ' .sec-body')).includes('A edits ' + path) }
    check(name + ' progress, highlight and edit reach the second device', got3.meta === '1 / ' + secs + ' sections done' && got3.marks === 'green:' + hl[1] && got3.edit, got3)
  }
  section('Sync — navigation preferences')
  await A.hash(PARL); await A.click('.chap-meta .fav'); await A.syncNow(); await B.syncNow(); await B.hash('#/')
  const navB = await B.ev(() => Object.fromEntries([...document.querySelectorAll('.page section')].map((x) => [x.querySelector('h3').textContent, [...x.querySelectorAll('.row b')].map((b) => b.textContent)])))
  check('favourites and recent destinations reach the second device', navB.Favourites?.join() === 'Parliament' && navB.Recent?.[0] === 'Parliament', navB)
  const prefDocs = (await cloudDump()).filter((d) => d.rec.kind === 'pref')
  check('they travel inside the existing preferences record; no navigation tree or view model is uploaded', prefDocs.length === 1 && prefDocs[0].rec.f.favourites.v[0].chapterId === 'parliament' && Array.isArray(prefDocs[0].rec.f.recents.v) && (await cloudDump()).every((d) => ['edit', 'hl', 'sec', 'chap', 'pref', 'ru'].includes(d.rec.kind)), prefDocs.map((d) => Object.keys(d.rec.f)))
  await A.click('.chap-meta .fav'); await A.syncNow(); await B.syncNow()
  check('removing a favourite syncs too', (await B.ev(() => JSON.parse(localStorage.getItem('upsc-prefs')).favourites.length)) === 0)
  await A.hash(PARL); await B.hash(PARL)
  // highlight recolour / removal across devices
  await B.ev(() => { getSelection().removeAllRanges(); document.querySelector('#s-budget-and-financial-procedure mark').click() }); await sleep(250); await B.click('.hlpal .sw[data-c="blue"]')
  await B.syncNow(); await A.syncNow()
  check('highlight recolour syncs', (await A.marks('budget-and-financial-procedure'))[0]?.startsWith('blue:'))
  await A.ev(() => { getSelection().removeAllRanges(); document.querySelector('#s-budget-and-financial-procedure mark').click() }); await sleep(250); await A.click('.hlpal .x')
  await A.syncNow(); await B.syncNow()
  check('highlight removal syncs', (await B.marks('budget-and-financial-procedure')).length === 0)

  section('Sync — offline queue')
  await A.page.setOfflineMode(true); await A.ev(() => window.dispatchEvent(new Event('offline')))
  await A.click('#s-parliamentary-committees .tg.rev'); await A.highlight('joint-sitting-and-lapse-of-bills', 'Speaker', 'yellow')
  await A.editMode(true); await A.edit('uppcs-recall', '<p>written while OFFLINE</p>'); await A.saved(); await A.editMode(false)
  const off = await A.status(); await A.panel(false)
  check('status: "Offline — changes queued"; reading and editing unaffected', off.includes('Offline — changes queued') && (await A.text('#s-uppcs-recall .sec-body')).includes('written while OFFLINE'), off)
  await A.reload()
  const off2 = await A.status(); await A.panel(false)
  check('queue survives an offline reload', off2.includes('Offline — changes queued') && (await A.idb('outbox')).length >= 3, off2)
  check('nothing reached the cloud while offline', !JSON.stringify(await cloudDump()).includes('written while OFFLINE'))
  await A.page.setOfflineMode(false); await A.ev(() => window.dispatchEvent(new Event('online')))
  await A.page.waitForFunction(() => true); await sleep(2500)
  const on = await A.status(); await A.panel(false)
  check('reconnect drains the queue automatically → Synced', on.includes('Synced') && (await A.idb('outbox')).length === 0 && JSON.stringify(await cloudDump()).includes('written while OFFLINE'), on)
  await B.syncNow()
  check('other device receives the queued changes', (await B.text('#s-uppcs-recall .sec-body')).includes('written while OFFLINE') && (await B.marks('joint-sitting-and-lapse-of-bills')).length === 1 && (await B.ev(() => document.querySelector('#s-parliamentary-committees .tg.rev').classList.contains('on'))))

  section('Sync — same section edited on two devices')
  await B.page.setOfflineMode(true); await B.ev(() => window.dispatchEvent(new Event('offline')))
  await B.editMode(true); await B.edit('composition-and-constitutional-map', '<p>VERSION-B of this section</p>'); await B.saved(); await B.editMode(false)
  await B.click('#s-composition-and-constitutional-map .tg.done')
  await A.editMode(true); await A.edit('composition-and-constitutional-map', '<p>VERSION-A of this section</p>'); await A.saved(); await A.editMode(false)
  await A.syncNow()
  await B.page.setOfflineMode(false); await B.ev(() => window.dispatchEvent(new Event('online'))); await sleep(2500)
  const cf = await B.status()
  check('status shows Conflict', cf.includes('Conflict'), cf)
  check('this device keeps its own text meanwhile', (await B.text('#s-composition-and-constitutional-map .sec-body')).includes('VERSION-B') && !(await B.text('#s-composition-and-constitutional-map .sec-body')).includes('VERSION-A'))
  check('cloud version is preserved too', JSON.stringify(await cloudDump()).includes('VERSION-A') && (await B.idb('conflicts')).length === 1)
  check('unrelated progress still synced during the conflict', (await cloudDump()).some((d) => d.rec.id === 'sec~prelims/polity/parliament/composition-and-constitutional-map'))
  await B.panelClick('edited on two devices'); await sleep(300)
  check('conflict dialog offers Keep this device / Keep cloud version / View both', (await B.ev(() => [...document.querySelectorAll('.conf-ops button')].map((b) => b.textContent).join('|'))) === 'Keep this device|Keep cloud version|View both')
  await B.ev(() => [...document.querySelectorAll('.conf-ops button')].find((b) => b.textContent === 'View both').click()); await sleep(250)
  const both = await B.ev(() => [...document.querySelectorAll('.conf-both > div')].map((d) => d.textContent))
  check('View both shows the two versions side by side', both.length === 2 && both[0].includes('VERSION-B') && both[1].includes('VERSION-A'))
  await B.reload()
  check('conflict copy survives reload', (await B.status()).includes('Conflict')); await B.panelClick('edited on two devices'); await sleep(300)
  await B.ev(() => [...document.querySelectorAll('.conf-ops button')].find((b) => b.textContent === 'Keep this device').click()); await sleep(1500)
  await B.syncNow(); await A.syncNow()
  check('"Keep this device": both devices converge on B\'s text', (await A.text('#s-composition-and-constitutional-map .sec-body')).includes('VERSION-B') && (await B.status()).includes('Synced')); await B.panel(false)
  // second conflict, resolved the other way
  await B.page.setOfflineMode(true); await B.ev(() => window.dispatchEvent(new Event('offline')))
  await B.editMode(true); await B.edit('lok-sabha-vs-rajya-sabha', '<p>SECOND-B</p>'); await B.saved(); await B.editMode(false)
  await A.editMode(true); await A.edit('lok-sabha-vs-rajya-sabha', '<p>SECOND-A</p>'); await A.saved(); await A.editMode(false); await A.syncNow()
  await B.page.setOfflineMode(false); await B.ev(() => window.dispatchEvent(new Event('online'))); await sleep(2500)
  await B.panelClick('edited on two devices'); await sleep(300)
  await B.ev(() => [...document.querySelectorAll('.conf-ops button')].find((b) => b.textContent === 'Keep cloud version').click()); await sleep(1500)
  const kc = await B.syncNow()
  check('"Keep cloud version": this device adopts A\'s text', (await B.text('#s-lok-sabha-vs-rajya-sabha .sec-body')).includes('SECOND-A') && !(await B.text('#s-lok-sabha-vs-rajya-sabha .sec-body')).includes('SECOND-B') && kc.includes('Synced'), kc)

  section('Sync — study timer')
  const INF = '#/study/prelims/economy/inflation'
  const runDoc = async () => (await cloudDump()).find((d) => d.rec.id === 'run~active')?.rec
  const sesDocs = async () => (await cloudDump()).filter((d) => d.rec.kind === 'ses').map((d) => d.rec.data)
  const devOf = (d) => d.ev(() => localStorage.getItem('upsc-device'))
  const bannerOf = (d) => d.ev(() => ({ text: document.querySelector('.tbanner > span')?.textContent ?? '', ops: [...document.querySelectorAll('.tbanner .chip')].map((b) => b.textContent).join('|') }))
  const press = (d, label) => d.ev((l) => [...document.querySelectorAll('.tbanner .chip')].find((b) => b.textContent === l).click(), label)
  const [devA, devB] = [await devOf(A), await devOf(B)]
  await A.hash(INF); await B.hash(PARL)
  await A.click('button[aria-label="Start study timer"]'); await sleep(1500); await A.syncNow()
  const live = await runDoc()
  check('the active timer is one cloud record, owned by the device that started it', live?.kind === 'run' && live.data.state === 'running' && live.data.ownerDeviceId === devA && (await cloudDump()).filter((d) => d.rec.kind === 'run').length === 1, live)
  await B.page.waitForSelector('.tbanner', { timeout: 10000 })
  const seen = await bannerOf(B)
  check('second device is told without a manual sync: "Timer running — Economy… · mm:ss" + Continue here / Open topic', /^Timer running — Economy & Social Development · \d+:\d\d$/.test(seen.text) && seen.ops === 'Continue here|Open topic', seen)
  check('second device cannot start, pause or stop it: no duplicate timer', (await B.count('button[aria-label="Start study timer"]')) === 0 && (await B.count('button[aria-label="Pause timer"]')) === 0 && (await B.count('button[aria-label="Stop timer"]')) === 0 && (await B.count('.tchip.remote')) === 1 && (await activeRow(B)).sessionId === live.data.sessionId)
  const bT = await secs(B); const aT = await secs(A)
  check('both devices show the same elapsed time', Math.abs(bT - aT) <= 2, [aT, bT])
  await press(B, 'Open topic'); await sleep(500)
  check('"Open topic" opens the chapter being timed', (await B.ev(() => location.hash)) === INF && (await bannerOf(B)).ops === 'Continue here' && (await activeRow(B)).ownerDeviceId === devA)
  await B.hash(PARL); await sleep(300)
  await press(B, 'Continue here'); await sleep(500)
  const took = await activeRow(B)
  check('"Continue here": the same session, now owned by this device and following its chapter', took.sessionId === live.data.sessionId && took.ownerDeviceId === devB && took.state === 'running' && took.currentContext.ref.chapterId === 'parliament' && took.completedSpans.some((x) => x.context.ref.chapterId === 'inflation' && x.id.startsWith(devA)) && (await B.count('.tbanner')) === 0 && (await B.count('button[aria-label="Pause timer"]')) === 1, took)
  await B.syncNow()
  await A.page.waitForSelector('.tbanner', { timeout: 10000 })
  const handed = await runDoc()
  check('ownership moved in the cloud; the first device now only watches', handed.data.sessionId === live.data.sessionId && handed.data.ownerDeviceId === devB && (await A.count('.tchip.remote')) === 1 && (await A.count('button[aria-label="Pause timer"]')) === 0 && /^Timer running — Polity/.test((await bannerOf(A)).text), [handed.data.ownerDeviceId, await bannerOf(A)])
  await sleep(1100)
  await B.click('button[aria-label="Stop timer"]'); await sleep(400); await B.syncNow(); await A.syncNow()
  const cloudSes = await sesDocs()
  const [sesA, sesB] = [await A.idb('studySessions'), await B.idb('studySessions')]
  const strip = (x) => JSON.stringify({ ...x, syncedAt: 0 })
  check('Stop: exactly one session for the whole run, in the cloud and on both devices', cloudSes.length === 1 && cloudSes[0].id === live.data.sessionId && sesA.length === 1 && sesB.length === 1 && strip(sesA[0]) === strip(sesB[0]) && !!sesA[0].syncedAt && !!sesB[0].syncedAt && !('syncedAt' in cloudSes[0]), [cloudSes.length, sesA.length, sesB.length])
  check('the session attributes time to both chapters and both devices kept their part', sesA[0].spans.map((x) => x.context.ref.chapterId).join() === 'inflation,parliament' && sesA[0].createdDeviceId === devB && sesA[0].durationMs === sesA[0].spans.reduce((n, x) => n + x.durationMs, 0) && !!sesA[0].timeZone, sesA[0])
  check('no timer is left running anywhere', (await A.count('.tchip')) === 0 && (await B.count('.tchip')) === 0 && (await runDoc()).del === true && (await A.count('.tbanner')) === 0)

  // a timer started offline, while another device already has one
  await B.page.setOfflineMode(true); await B.ev(() => window.dispatchEvent(new Event('offline')))
  await A.hash(INF); await A.click('button[aria-label="Start study timer"]'); await sleep(600); await A.syncNow()
  const mainId = (await runDoc()).data.sessionId
  await B.click('button[aria-label="Start study timer"]'); await sleep(1800)
  const prov = await activeRow(B)
  check('offline start on a signed-in device is marked provisional and runs normally', prov.offlineProvisional === true && prov.ownerDeviceId === devB && prov.sessionId !== mainId && (await secs(B)) >= 1 && (await B.idb('outbox')).some((o) => o.id === 'run~active'), prov)
  await B.reload()
  check('…and survives an offline reload', (await activeRow(B)).sessionId === prov.sessionId && (await secs(B)) >= 1)
  await B.page.setOfflineMode(false); await B.ev(() => window.dispatchEvent(new Event('online'))); await sleep(2500)
  const told = await B.text('.toast')
  await B.syncNow()
  const afterB = await B.idb('studySessions')
  const kept = afterB.find((x) => x.id === prov.sessionId)
  check('reconnect: the provisional timer is closed into its own session — its time is kept', kept?.source === 'recovered' && kept.createdDeviceId === devB && kept.durationMs >= 1500 && kept.spans[0].context.ref.chapterId === 'parliament' && /saved as its own session/.test(told ?? ''), [kept, told])
  check('the cloud timer was not replaced: still one active timer, the first device still owns it', (await runDoc()).data.sessionId === mainId && (await runDoc()).data.ownerDeviceId === devA && (await activeRow(B)).sessionId === mainId && (await B.count('.tchip.remote')) === 1 && (await bannerOf(B)).ops.startsWith('Continue here'))
  check('neither record was dropped: the recovered session is in the cloud too', (await sesDocs()).some((x) => x.id === prov.sessionId && x.source === 'recovered') && (await sesDocs()).length === 2)
  // stop while offline → queued → sent on reconnect
  await A.page.setOfflineMode(true); await A.ev(() => window.dispatchEvent(new Event('offline')))
  await sleep(700)
  await A.click('button[aria-label="Stop timer"]'); await sleep(400)
  check('offline Stop: the session is saved locally and queued; nothing is sent', (await A.idb('studySessions')).some((x) => x.id === mainId && !x.syncedAt) && (await A.idb('outbox')).some((o) => o.id === 'ses~' + mainId) && !(await sesDocs()).some((x) => x.id === mainId) && (await A.count('.tchip')) === 0)
  await A.page.setOfflineMode(false); await A.ev(() => window.dispatchEvent(new Event('online'))); await sleep(2500)
  await A.syncNow(); await B.syncNow()
  check('reconnect: the queued session and the stopped timer reach the cloud and the other device', (await sesDocs()).length === 3 && (await runDoc()).del === true && (await A.idb('outbox')).length === 0 && (await B.idb('studySessions')).length === 3 && (await A.idb('studySessions')).length === 3 && (await B.count('.tchip')) === 0 && (await A.idb('studySessions')).every((x) => !!x.syncedAt))
  check('completed sessions are write-once in the cloud', (await cloudDump()).filter((d) => d.rec.kind === 'ses').every((d) => d.ver === 1))
  const insightOf = async (d) => { await d.hash('#/insights'); await d.ev(() => [...document.querySelectorAll('.filters .chip')].find((b) => b.textContent === 'All time').click()); await sleep(250); return d.ev(() => [...document.querySelectorAll('.kpi b, .stat b')].map((b) => b.textContent).join('|')) }
  const insA = await insightOf(A); const insB = await insightOf(B)
  check('Insights on both devices is derived from the same synced sessions and agrees', insA === insB && insA.split('|').length === 9 && Number(insA.split('|')[5]) >= 2, [insA, insB])

  section('Sync — study queue and goals')
  await A.go('#/'); await sleep(700)
  const onA = await A.text('.cont-t')
  await btn(A, '.queue', 'Add current chapter')
  await A.hash(onA === 'Parliament' ? INF : PARL); await A.click('.chap-meta .fav.q'); await A.hash('#/'); await sleep(500)
  await A.click('.goal-set'); await A.page.type('input[aria-label="Daily target in hours"]', '3'); await btn(A, '.goal-form', 'Save')
  const qA = await qTitles(A)
  await A.syncNow(); await B.syncNow(); await B.hash('#/'); await sleep(700)
  check('the queue, in order, and the goal reach the second device', qA.length === 2 && (await qTitles(B)).join('|') === qA.join('|') && (await B.text('.goal .gv')).endsWith('of 3 h 00 min'), [qA, await qTitles(B)])
  const planDocs = (await cloudDump()).filter((d) => ['q', 'goal'].includes(d.rec.kind))
  check('they are small records of their own; no dashboard figure is ever uploaded', planDocs.filter((d) => d.rec.kind === 'q').length === 2 && planDocs.filter((d) => d.rec.kind === 'goal').length === 1 && planDocs.every((d) => d.rec.f) && !/streak|heatmap|todayStudyMs|weekStudyMs|completionPercent|studyTimeMs/.test(JSON.stringify(await cloudDump())), planDocs.map((d) => d.rec.id))
  // one device completes an item while the other reorders the list
  await B.click('.queue .qlist li:nth-child(1) .tg.done')
  await A.click('.queue .qlist li:nth-child(2) button[title="Move up"]')
  await B.syncNow(); await A.syncNow(); await B.syncNow(); await sleep(300)
  const [endA, endB] = [await qTitles(A), await qTitles(B)]
  check('complete on one device + reorder on the other: both changes survive, both devices agree', endA.join() === qA[1] && endB.join() === qA[1] && (await A.text('.qdone span')) === '1 completed' && (await B.text('.qdone span')) === '1 completed', [endA, endB])
  await B.click('.goal-set'); await btn(B, '.goal-form', 'Remove goals'); await B.syncNow(); await A.syncNow(); await sleep(300)
  check('removing the goal syncs too', (await A.count('.goal')) === 0 && (await B.count('.goal')) === 0)
  await A.click('.queue .qlist li button[title^="Remove"]'); await A.syncNow(); await B.syncNow(); await sleep(300)
  check('a removed item leaves the other device as well', (await qTitles(A)).length === 0 && (await qTitles(B)).length === 0)
  await A.hash(PARL); await B.hash(PARL)

  section('Sync — PYQ flags')
  const PQ = 'UPSC-CSE-2019-GS1-Q045'
  const pqPressed = (d) => d.ev(() => Object.fromEntries([...document.querySelectorAll('.pq .pq-acts button')].map((b) => [b.getAttribute('aria-label').replace('Mark ', ''), b.getAttribute('aria-pressed') === 'true'])))
  await A.hash('#/pyqs?id=' + PQ); await A.click('.pq button[aria-label="Mark seen"]'); await A.click('.pq button[aria-label="Mark difficult"]')
  await A.syncNow(); await B.syncNow(); await B.hash('#/pyqs?id=' + PQ); await sleep(400)
  check('flags set on one device reach the other', JSON.stringify(await pqPressed(B)) === JSON.stringify({ seen: true, revised: false, difficult: true }), await pqPressed(B))
  const pqDocs = (await cloudDump()).filter((d) => d.rec.kind === 'pyq')
  check('only the flags are uploaded — one small record per question, never the PYQ corpus', pqDocs.length === 1 && pqDocs[0].rec.id === 'pyq~' + PQ && Object.keys(pqDocs[0].rec.f).sort().join() === 'difficult,seen' && JSON.stringify(pqDocs).length < 400 && !/demandTags|linkedContent|oneLiner|questionAvailable|Finance Commission/.test(JSON.stringify(await cloudDump())), pqDocs)
  // one device marks it revised while the other clears "difficult"
  await B.click('.pq button[aria-label="Mark revised"]'); await A.click('.pq button[aria-label="Mark difficult"]')
  await B.syncNow(); await A.syncNow(); await B.syncNow(); await sleep(300)
  check('two devices change different flags: both changes survive, both devices agree', JSON.stringify(await pqPressed(A)) === JSON.stringify({ seen: true, revised: true, difficult: false }) && JSON.stringify(await pqPressed(B)) === JSON.stringify(await pqPressed(A)), [await pqPressed(A), await pqPressed(B)])
  await A.hash(PARL); await B.hash(PARL)

  section('Sync — reset and sign-out')
  A.page.once('dialog', (d) => d.accept())
  await A.menu('Reset Local Edits — this chapter'); await sleep(700)
  await A.syncNow(); await B.syncNow()
  check('Reset Local Edits propagates; highlights and progress stay on both devices', !(await B.text('.page')).includes('DEVICE-A local edit') && !(await B.text('.page')).includes('VERSION-B') && (await B.marks('bills-types-and-procedure')).length === 1 && (await B.text('.chap-meta span')) === (await A.text('.chap-meta span')))
  await B.panelClick('Sign out'); await sleep(500)
  const so = await B.status(); await B.panel(false)
  check('sign-out returns to Local only', so.includes('Sync across devices'))
  check('sign-out leaves local data intact', (await B.marks('bills-types-and-procedure')).length === 1 && (await B.text('.chap-meta span')).includes('/ 9 sections done') && (await B.idb('highlights')).length > 0)
  await B.click('#s-uppcs-recall .tg.done'); await B.reload()
  check('signed out: changes still saved locally, nothing sent', (await B.ev(() => document.querySelector('#s-uppcs-recall .tg.done').classList.contains('on'))) && !(await cloudDump()).some((d) => d.rec.id.endsWith('uppcs-recall') && d.rec.kind === 'sec'))
  await B.panelClick('Sign in with Google'); await sleep(600); await B.syncNow(); await A.syncNow()
  check('signing in again uploads what changed while signed out', await A.ev(() => document.querySelector('#s-uppcs-recall .tg.done').classList.contains('on')))
  for (const [w, h, n] of [[375, 812, 'phone'], [768, 1024, 'tablet']]) {
    await A.page.setViewport({ width: w, height: h }); await A.panel(true)
    check(`${n}: signed-in account panel fits and shows status`, await A.ev(() => { const r = document.querySelector('.acct-panel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && !!document.querySelector('.acct-status') }))
    if (w === 375) await A.page.screenshot({ path: join(OUT, 'phone-account.png') })
    await A.panel(false)
  }

  section('Sync — revision, exam targets and the reset epoch')
  {
    const STUDY = ['sec', 'chap', 'ses', 'run', 'q', 'pyq', 'ru', 'rev', 'ra']
    const ids = async (d, store) => (await d.idb(store)).map((r) => r.id).sort().join()
    await A.page.setViewport({ width: 1280, height: 860 })
    await A.hash(PARL); await B.hash(PARL)
    if (!(await A.ev(() => document.querySelector('#s-parliamentary-committees .tg.done').classList.contains('on')))) await A.click('#s-parliamentary-committees .tg.done')
    await A.syncNow(); await B.syncNow(); await A.syncNow()
    const uA = await rvUnits(A)
    const uB = await rvUnits(B)
    const dumpU = await cloudDump()
    check('revision units reach the other device as they are; one cloud record per unit', Object.keys(uA).length >= 2 && Object.keys(uA).sort().join() === Object.keys(uB).sort().join() && uB['parliamentary-committees']?.dueDate === uA['parliamentary-committees'].dueDate && dumpU.filter((d) => d.rec.kind === 'ru').length === Object.keys(uA).length, [Object.keys(uA), Object.keys(uB)])
    // a revision completed on A
    await idbPut(A, 'revisionUnits', [{ ...uA['parliamentary-committees'], dueDate: dayKey(0) }])
    await A.hash('#/revise/' + RU('parliamentary-committees')); await A.reload(); await sleep(900)
    if ((await A.ev(() => document.querySelector('.revise').dataset.phase)) === 'prompt') { await tapBtn(A, 'Reveal', '.rcard'); await sleep(200); await tapBtn(A, 'Knew', '.rcard'); await sleep(200); await tapBtn(A, 'Finish now', '.rcard') }
    await sleep(1200); await A.click('.grade-b[data-grade="good"]'); await sleep(800)
    await A.syncNow(); await B.syncNow()
    const evA = (await A.idb('revisionEvents'))[0]
    const evB = (await B.idb('revisionEvents'))[0]
    const dumpE = await cloudDump()
    check('a completed revision, its recall answers and the unit\'s new date reach the other device', !!evA && JSON.stringify(evB) === JSON.stringify(evA) && (await ids(B, 'recallAttempts')) === (await ids(A, 'recallAttempts')) && (await rvUnits(B))['parliamentary-committees'].dueDate === evA.nextDueDate && (await rvUnits(B))['parliamentary-committees'].revisionCount === 1, [evA, evB])
    check('revision events are write-once in the cloud; static recall units, calendars and forecasts are never uploaded', dumpE.filter((d) => d.rec.kind === 'rev').length === 1 && dumpE.filter((d) => d.rec.kind === 'rev').every((d) => d.ver === 1) && dumpE.every((d) => ['edit', 'hl', 'sec', 'chap', 'pref', 'ses', 'run', 'goal', 'q', 'pyq', 'ru', 'rev', 'ra', 'exam', 'rpref', 'cad', 'cae'].includes(d.rec.kind)) && !JSON.stringify(dumpE).includes('cueHtml') && !JSON.stringify(dumpE).includes('answerHtml'), dumpE.map((d) => d.rec.kind))
    // an exam target and a revision preference
    await A.hash('#/settings'); await tapBtn(A, 'Add an exam'); await sleep(200)
    await A.page.type('input[aria-label="Exam name"]', 'UPSC CSE Prelims')
    await A.ev((d) => { const i = document.querySelector('input[aria-label="Exam date"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, d); i.dispatchEvent(new Event('input', { bubbles: true })) }, dayKey(200))
    await sleep(150); await tapBtn(A, 'Save', '.exam-form'); await sleep(300)
    await tapBtn(A, 'Exam', '.set-row .seg'); await sleep(200) // recall intensity → Exam
    await A.syncNow(); await B.syncNow()
    await B.go('#/'); await sleep(500)
    check('exam targets and revision preferences sync: the countdown and the recall intensity appear on the other device', /^UPSC CSE PRELIMS 200 DAYS/.test(await flat(B, '.examcd')) && (await B.idb('revisionPreferences'))[0]?.recallIntensity === 'exam' && /ri-exam/.test(await B.ev(() => document.querySelector('.app').className)))

    // B goes offline and keeps its old study data; meanwhile A resets the study history
    await B.hash(PARL); await sleep(300)
    await B.page.setOfflineMode(true)
    if (!(await B.ev(() => document.querySelector('#s-joint-sitting-and-lapse-of-bills .tg.done').classList.contains('on')))) await B.click('#s-joint-sitting-and-lapse-of-bills .tg.done')
    await sleep(300)
    const staleB = { units: (await B.idb('revisionUnits')).length, sessions: (await B.idb('studySessions')).length, done: await B.text('.chap-meta span'), queued: (await B.idb('outbox')).map((o) => o.id) }
    const hlB = (await B.marks('bills-types-and-procedure')).length
    await A.hash('#/settings'); await tapBtn(A, 'Reset study history'); await sleep(300)
    const lockedA = await A.ev(() => document.querySelector('.reset .btn.danger').disabled)
    await A.page.type('.reset-word input', 'RESET'); await sleep(150)
    await tapBtn(A, 'Reset study history', '.reset .acts'); await sleep(1500)
    await A.syncNow(); await A.panel(false)
    const dumpR = await cloudDump()
    const meta = dumpR.find((d) => d.rec.id === 'meta~dataEpoch')?.rec.data
    check('a signed-in reset raises the account\'s data epoch and removes the old study records from the cloud', lockedA === true && meta?.epoch === 1 && meta.floors.study === 1 && meta.resetScope === 'study-history' && dumpR.filter((d) => STUDY.includes(d.rec.kind)).every((d) => d.rec.kind === 'sec' && d.rec.ep === 1 && !d.rec.f.done) && dumpR.some((d) => d.rec.kind === 'hl') && dumpR.some((d) => d.rec.kind === 'exam'), [meta, dumpR.map((d) => d.rec.kind)])
    check('on the device that reset: study history gone, highlights, edits and exam target kept', (await A.idb('revisionUnits')).length === 0 && (await A.idb('revisionEvents')).length === 0 && (await A.idb('studySessions')).length === 0 && (await A.idb('highlights')).filter((h) => !h.deleted).length > 0 && (await A.idb('examTargets')).length === 1 && (await A.idb('userDataEpoch'))[0].doc.epoch === 1)
    check('device B, offline, still holds the old data and has changes queued', staleB.units >= 2 && staleB.sessions >= 1 && staleB.queued.some((id) => id.startsWith('sec~')) && !/^0 \//.test(staleB.done), staleB)
    await B.page.setOfflineMode(false); await B.ev(() => window.dispatchEvent(new Event('online'))); await sleep(1500)
    await B.syncNow(); await B.panel(false); await sleep(300)
    const dumpB = await cloudDump()
    const epB = (await B.idb('userDataEpoch'))[0]
    check('the stale device drops its old study data when it reconnects and adopts the epoch', (await B.idb('revisionUnits')).length === 0 && (await B.idb('revisionEvents')).length === 0 && (await B.idb('studySessions')).length === 0 && epB?.doc.epoch === 1 && epB.doc.floors.study === 1 && /^0 \/ 9 sections done/.test(await B.text('.chap-meta span')) && !(await B.ev(() => document.querySelector('#s-joint-sitting-and-lapse-of-bills .tg.done').classList.contains('on'))) && (await B.ev(() => document.querySelector('#s-sessions-and-devices .tg.star').classList.contains('on'))), [epB, await B.text('.chap-meta span')])
    check('…and uploads none of it: nothing from before the reset is back in the cloud', !dumpB.some((d) => STUDY.includes(d.rec.kind) && (d.rec.ep ?? 0) < 1) && !dumpB.some((d) => d.rec.kind === 'ses' || d.rec.kind === 'rev' || d.rec.kind === 'ru') && !dumpB.some((d) => d.rec.kind === 'sec' && d.rec.f?.done?.v) && !(await B.idb('outbox')).some((o) => /^(ses|rev|ra|ru)~/.test(o.id)), dumpB.filter((d) => STUDY.includes(d.rec.kind)).map((d) => [d.rec.id, d.rec.ep]))
    check('what the reset did not cover is untouched on the stale device', (await B.marks('bills-types-and-procedure')).length === hlB && hlB > 0 && /^UPSC CSE PRELIMS/.test((await B.go('#/'), await sleep(400), await flat(B, '.examcd'))))
    await A.go(PARL); await A.syncNow(); await A.panel(false); await A.reload(); await sleep(300)
    check('nothing is resurrected on the first device', (await A.idb('revisionUnits')).length === 0 && (await A.idb('studySessions')).length === 0 && (await A.text('.chap-meta span')) === '0 / 9 sections done')
    await A.click('#s-presiding-officers .tg.done'); await sleep(300)
    await A.syncNow(); await A.panel(false); await B.go(PARL); await B.syncNow(); await B.panel(false)
    const ruNew = (await cloudDump()).filter((d) => d.rec.kind === 'ru')
    check('study after the reset syncs as usual, under the new epoch', ruNew.length === 1 && ruNew[0].rec.ep === 1 && (await B.idb('revisionUnits')).length === 1 && (await B.ev(() => document.querySelector('#s-presiding-officers .tg.done').classList.contains('on'))), ruNew.map((d) => [d.rec.id, d.rec.ep]))
  }

  section('Sync — Current Affairs')
  {
    const caRows = async (d, store) => (await d.idb(store))
    const tday = await A.ev(() => new Intl.DateTimeFormat('en-CA').format(new Date()))
    await A.page.setViewport({ width: 1280, height: 860 })
    await A.go('#/current-affairs'); await B.go('#/current-affairs'); await sleep(400)
    await tapBtn(A, 'Start Reading', '.ca-acts'); await sleep(1800)
    await A.syncNow(); await A.panel(false)
    await B.page.waitForFunction(() => /another device/.test(document.querySelector('.ca-clock small')?.textContent ?? ''), { timeout: 12000 }).catch(() => {})
    const seenB = await B.ev(() => ({ note: document.querySelector('.ca-clock small')?.textContent ?? '', acts: [...document.querySelectorAll('.ca-acts button')].map((b) => b.textContent).join('|') }))
    const devs = [await A.ev(() => localStorage.getItem('upsc-device')), await B.ev(() => localStorage.getItem('upsc-device'))]
    check('a reading timer on one device is shown on the other, which may only continue it — never start a second', /Timer running on another device · Current Affairs/.test(seenB.note) && seenB.acts === 'Continue here|Add Note' && (await activeRow(B))?.ownerDeviceId === devs[0], seenB)
    const sidA = (await activeRow(A)).sessionId
    await tapBtn(B, 'Continue here', '.ca-acts'); await sleep(1500)
    const rowB = await activeRow(B)
    check('"Continue here" takes the same session over into a reading span on this device', rowB.sessionId === sidA && rowB.ownerDeviceId === devs[1] && rowB.currentActivity?.activity === 'current-affairs' && rowB.currentActivity.currentAffairsDayId === tday && rowB.state === 'running', rowB?.currentActivity)
    await tapBtn(B, 'Stop', '.ca-acts'); await sleep(400)
    await B.syncNow(); await B.panel(false); await A.syncNow(); await A.panel(false)
    const sesCa = (await cloudDump()).filter((d) => d.rec.kind === 'ses' && d.rec.data.spans.some((s) => s.activity === 'current-affairs'))
    check('one session in the cloud, with reading spans from both devices; the timer is free again', sesCa.length === 1 && new Set(sesCa[0].rec.data.spans.map((s) => s.id.split('-')[0])).size === 2 && !(await activeRow(A))?.state && (await A.idb('studySessions')).some((s) => s.id === sidA), sesCa.map((d) => d.rec.data.spans.map((s) => s.id)))

    // a note and a completion made offline on A
    await A.page.setOfflineMode(true)
    await tapBtn(A, 'Add Note', '.ca-acts'); await sleep(250)
    await A.ev(() => { const i = document.querySelector('.ca-form input[aria-label="Note title"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'Offline note SYNC-E2E'); i.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(150)
    await tapBtn(A, 'Save and write', '.ca-form'); await sleep(700)
    const nid = (await A.ev(() => location.hash)).split('/').pop()
    await A.ev(() => { const ed = document.querySelector('.ca-body .ProseMirror').editor; ed.commands.focus('end'); ed.commands.insertContent('<p>written offline CA-SYNC-BODY</p>') })
    await A.saved(); await tapBtn(A, 'Done', '.ca-ops'); await sleep(700)
    await A.hash('#/current-affairs'); await sleep(300)
    await tapBtn(A, 'Mark Today Complete', '.ca-finish'); await sleep(400)
    const offA = { state: await A.ev(() => document.querySelector('.ca-day').dataset.state), queued: (await A.idb('outbox')).map((o) => o.id), cloud: (await cloudDump()).filter((d) => ['cad', 'cae'].includes(d.rec.kind)).map((d) => [d.rec.id, d.rec.data?.status]) }
    check('offline: the note and the completion are saved here at once and queued; nothing waits on the network', offA.state === 'completed' && offA.queued.includes('cad~' + tday) && offA.queued.includes('cae~' + nid) && offA.queued.includes('edit~ca/' + nid) && !offA.cloud.some(([id, s]) => id === 'cae~' + nid || s === 'completed'), offA)
    await A.page.setOfflineMode(false); await A.ev(() => window.dispatchEvent(new Event('online'))); await sleep(1500)
    await A.syncNow(); await A.panel(false); await B.syncNow(); await B.panel(false); await sleep(300)
    const dump = await cloudDump()
    const cadDoc = dump.find((d) => d.rec.id === 'cad~' + tday)?.rec
    check('back online: one cloud record per day and per note, under the current epoch — and no duration on the day', cadDoc?.kind === 'cad' && cadDoc.data.status === 'completed' && cadDoc.ep === 1 && dump.filter((d) => d.rec.kind === 'cad').length === 1 && dump.filter((d) => d.rec.kind === 'cae').length === 1 && dump.find((d) => d.rec.id === 'cae~' + nid)?.rec.ep === 1 && !!dump.find((d) => d.rec.id === 'edit~ca/' + nid) && !/[Dd]uration|Ms"/.test(JSON.stringify(cadDoc)), [cadDoc, dump.filter((d) => /^ca/.test(d.rec.kind)).map((d) => d.rec.id)])
    await B.go('#/current-affairs'); await sleep(500)
    const onB = await B.ev(() => ({ state: document.querySelector('.ca-day').dataset.state, clock: document.querySelector('.ca-clock time').textContent, notes: [...document.querySelectorAll('.ca-notes .row b')].map((b) => b.textContent) }))
    await B.hash('#/current-affairs/note/' + nid); await sleep(400)
    check('the other device shows the day completed, the same derived reading time, and the note with its text', onB.state === 'completed' && onB.clock !== '00:00:00' && onB.clock === (await A.ev(() => document.querySelector('.ca-clock time').textContent)) && onB.notes.join() === 'Offline note SYNC-E2E' && (await B.text('.ca-body')).includes('CA-SYNC-BODY'), onB)

    // a reset on A while B is offline with Current Affairs state
    await B.page.setOfflineMode(true)
    await B.hash('#/current-affairs'); await sleep(300)
    await tapBtn(B, 'Undo', '.ca-finish'); await sleep(300)
    await A.hash('#/settings'); await tapBtn(A, 'Reset study history'); await sleep(300)
    await A.page.type('.reset-word input', 'RESET'); await sleep(150)
    await tapBtn(A, 'Reset study history', '.reset .acts'); await sleep(1500)
    await A.syncNow(); await A.panel(false)
    const afterReset = await cloudDump()
    check('Reset Study History on one device removes the day record and the reading sessions from the cloud, and keeps the notes', !afterReset.some((d) => d.rec.kind === 'cad' || d.rec.kind === 'ses') && afterReset.filter((d) => d.rec.kind === 'cae').length === 1 && afterReset.find((d) => d.rec.id === 'meta~dataEpoch').rec.data.epoch === 2 && (await caRows(A, 'currentAffairsDays')).length === 0 && (await caRows(A, 'currentAffairsEntries')).length === 1, afterReset.map((d) => d.rec.kind))
    const staleB = { days: (await caRows(B, 'currentAffairsDays')).length, ses: (await caRows(B, 'studySessions')).length, queued: (await B.idb('outbox')).map((o) => o.id) }
    await B.page.setOfflineMode(false); await B.ev(() => window.dispatchEvent(new Event('online'))); await sleep(1500)
    await B.syncNow(); await B.panel(false); await sleep(300)
    const finalDump = await cloudDump()
    check('the device that was offline held the old day and sessions with a change queued; on reconnecting it drops them and restores nothing', staleB.days === 1 && staleB.ses >= 1 && staleB.queued.includes('cad~' + tday) && (await caRows(B, 'currentAffairsDays')).length === 0 && (await caRows(B, 'studySessions')).length === 0 && !finalDump.some((d) => d.rec.kind === 'cad' || d.rec.kind === 'ses') && (await B.idb('userDataEpoch'))[0].doc.epoch === 2, [staleB, finalDump.map((d) => d.rec.kind)])
    await B.go('#/current-affairs'); await sleep(400)
    check('…while its notes, which the reset did not cover, are still there on both devices', (await B.ev(() => [...document.querySelectorAll('.ca-notes .row b')].map((b) => b.textContent).join())) === 'Offline note SYNC-E2E' && (await B.ev(() => document.querySelector('.ca-day').dataset.state)) === 'pending' && (await B.text('.ca-clock time')) === '00:00:00' && (await caRows(A, 'currentAffairsEntries')).length === 1)
  }

  section('Console')
  check('no runtime or console errors in any profile', errors.length === 0, errors.slice(0, 5))
} catch (e) {
  console.error('\nE2E aborted:', e)
  results.push({ group, name: 'run completed', ok: false })
} finally {
  await browser.close()
  stop()
}

const failed = results.filter((r) => !r.ok)
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ at: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, errors, downloads: readdirSync(join(OUT, 'downloads')) }, null, 1))
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
process.exit(failed.length ? 1 : 0)
