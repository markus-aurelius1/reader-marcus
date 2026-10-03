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
  check('Insights tabs: Overview, Time, Subjects, Progress, Revision', (await L.ev(() => [...document.querySelectorAll('.tabs a')].map((a) => a.textContent + ' ' + a.getAttribute('href')).join(' | '))) === 'Overview #/insights | Time #/insights/time | Subjects #/insights/subjects | Progress #/insights/progress | Revision #/insights/revision')
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
  const blur = await L.ev(() => getComputedStyle(document.querySelector('#s-composition-and-constitutional-map .rc')).filter)
  await L.click('#s-composition-and-constitutional-map .rc'); await sleep(350)
  const shown = await L.ev(() => getComputedStyle(document.querySelector('#s-composition-and-constitutional-map .rc')).filter)
  check('Recall Mode blurs facts; click reveals', blur.includes('blur') && shown === 'none', { blur, shown })
  check('sentence around a recall item stays readable', await L.ev(() => getComputedStyle(document.querySelector('#s-composition-and-constitutional-map td')).filter === 'none'))
  await L.key('r')

  // progress / flags / resume / scroll
  await L.click('#s-sessions-and-devices .tg.rev'); await L.click('#s-sessions-and-devices .tg.star'); await L.click('#s-sessions-and-devices .tg.done')
  await L.hash(PARL)
  await L.ev(() => window.scrollTo(0, 2400)); await sleep(1200)
  const inView = await L.text('.crumbs')
  check('breadcrumb follows the section in view', (await L.text('.crumbs')).split('›').length === 4, await L.text('.crumbs'))
  await L.reload(); await sleep(300)
  check('scroll position restored after reload (same section in view)', Math.abs((await L.ev(() => scrollY)) - 2400) < 150 && (await L.ev(() => { window.dispatchEvent(new Event('scroll')); return new Promise((r) => setTimeout(() => r(document.querySelector('.crumbs').textContent), 300)) })) === inView, await L.ev(() => scrollY))
  await L.hash('#/revision')
  check('Revision queue shows ↻ / ★ sections', (await L.ev(() => [...document.querySelectorAll('.row')].map((r) => r.textContent).join('|'))).includes('Sessions & Devices'))
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
  check('Library lists Economy & Social Development under Prelims, after Polity', (await L.ev(() => [...document.querySelectorAll('a.row b')].map((b) => b.textContent).join('|'))) === 'Polity|Economy & Social Development|History & Culture')
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
  await L.key('r'); const ecoBlur = await L.ev(() => getComputedStyle(document.querySelector('#s-deficits .rc')).filter); await L.click('#s-deficits .rc')
  check('Recall Mode blurs and reveals Economy answers', ecoBlur.includes('blur') && (await L.ev(() => document.querySelector('#s-deficits .rc').classList.contains('shown'))), ecoBlur)
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
  await L.hash('#/revision')
  check('Economy section appears in the Revision queue', (await L.ev(() => [...document.querySelectorAll('.row')].map((r) => r.textContent).join('|'))).includes('FRBM'))
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
  await L.hash(HIS + 'historical-geography/place-river')
  check('link to a subject not added yet stays plain text', await L.ev(() => { const a = document.querySelector('#s-place-river a.xref.pending'); return !!a && !a.getAttribute('href') && a.getAttribute('data-xref') === 'prelims/geography' }))
  // reader features on History: recall, progress, highlight, edit (links survive), export, reset
  await L.hash(HIS + 'constitutional-development')
  check('History chapter renders its sections with recall items and callouts', (await L.count('.sec')) === 8 && (await L.count('.sec-body .rc')) > 30 && (await L.count('.callout[data-kind="trap"]')) >= 3)
  await L.key('r'); const hisBlur = await L.ev(() => getComputedStyle(document.querySelector('#s-act-1935 .rc')).filter); await L.click('#s-act-1935 .rc')
  check('Recall Mode blurs and reveals History answers', hisBlur.includes('blur') && (await L.ev(() => document.querySelector('#s-act-1935 .rc').classList.contains('shown'))), hisBlur)
  await L.key('r')
  await L.highlight('act-1919', 'High Commissioner for India', 'blue'); await L.click('#s-act-1919 .tg.done'); await L.click('#s-simon-nehru .tg.rev')
  await L.editMode(true); await L.edit('act-1935', '<p>HIS-E2E edit</p>'); await L.saved(); await L.editMode(false)
  const hEdited = await L.ev(() => ({ text: document.querySelector('#s-act-1935 .sec-body').textContent.includes('HIS-E2E edit'), links: [...document.querySelectorAll('#s-act-1935 .sec-body a.xref')].map((a) => a.getAttribute('data-xref') + ' ' + a.getAttribute('href')) }))
  check('edited History section keeps its cross-links', hEdited.text && hEdited.links.includes('prelims/polity/preamble#sources-of-the-constitution #/study/prelims/polity/preamble/sources-of-the-constitution') && hEdited.links.includes('prelims/polity/parts-schedules#seventh-schedule-lists #/study/prelims/polity/parts-schedules/seventh-schedule-lists'), hEdited)
  await L.reload()
  check('History edit, highlight and progress persist across reload', (await L.text('#s-act-1935 .sec-body')).includes('HIS-E2E edit') && (await L.marks('act-1919')).join() === 'blue:High Commissioner for India' && (await L.text('.chap-meta span')) === '1 / 8 sections done')
  await L.hash('#/revision')
  check('History section appears in the Revision queue', (await L.ev(() => [...document.querySelectorAll('.row')].map((r) => r.textContent).join('|'))).includes('Simon Commission'))
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
  check('v1 Progress link opens Insights → Progress', (await hashNow()) === '#/insights/progress' && (await h1()) === 'Insights' && (await L.text('.tabs .on')) === 'Progress' && (await L.count('.stat')) === 3)
  await L.go('#/'); await L.hash('#/r/prelims/polity/judiciary'); const viaOld = await hashNow(); await L.page.goBack(); await sleep(400)
  check('a rewritten v1 link adds no extra history entry (Back returns in one step)', viaOld === '#/study/prelims/polity/judiciary' && ['#/', ''].includes(await hashNow()), [viaOld, await hashNow()])

  // desktop rail
  await L.go('#/')
  const rail = await L.ev(() => ({ items: [...document.querySelectorAll('.rail a, .rail button')].map((e) => e.querySelector('span').textContent).join('|'), tab: getComputedStyle(document.querySelector('.tabbar')).display, w: document.querySelector('.rail').getBoundingClientRect().width }))
  check('desktop: primary rail — Home, Study, PYQ Hub, Insights, Highlights, Search; no tab bar', rail.items === 'Home|Study|PYQ Hub|Insights|Highlights|Search' && rail.tab === 'none' && rail.w > 60, rail)
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
  check('PYQ Hub shell lists only subjects that have question references', (await L.ev(() => [...document.querySelectorAll('.row b')].map((b) => b.textContent).join('|'))) === 'Polity|Economy & Social Development|History & Culture')
  await L.click('a.row'); check('PYQ Hub row opens the subject PYQ tab', (await hashNow()) === '#/study/prelims/polity?tab=pyq' && (await L.count('details.syn')) === 19)

  // study explorer
  await L.hash('#/study')
  const lib = await L.ev(() => ({ open: document.querySelector('.app').classList.contains('side-open'), chapters: document.querySelectorAll('.sidebar .chap').length, stages: [...document.querySelectorAll('.x-stage > .x-row')].map((e) => e.textContent).join('|'), subjects: document.querySelectorAll('.x-subject').length, off: document.querySelectorAll('.x-row.off').length }))
  check('Study: explorer shows stages and subjects, no chapters until a subject is chosen', lib.open && lib.chapters === 0 && lib.stages === 'Prelims|Mains' && lib.subjects === 3 && lib.off === 5, lib)
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
  check('subject switcher lists every subject and resumes the chapter last read there', opts === 'Polity|Economy & Social Development|History & Culture' && (await hashNow()).startsWith('#/study/prelims/economy/') && (await L.count('.switcher')) === 0 && (await L.count('.sec')) > 3, [opts, await hashNow()])
  await L.page.goBack(); await sleep(400)
  check('browser Back returns from a subject switch', (await hashNow()) === PARL)
  await L.click('.crumbs .switch-crumb'); const crumbSw = await L.count('.switcher a[role="option"]'); await L.page.keyboard.press('Escape'); await sleep(150)
  check('breadcrumb carries the compact switcher; Esc closes it', crumbSw === 3 && (await L.count('.switcher')) === 0)
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
  check('Ctrl+K with no query offers Recent, Favourites and every subject', groups === 'Recent|Favourites|Subjects' && (await L.ev(() => [...document.querySelectorAll('.palette li:not(.grp) b')].slice(-3).map((b) => b.textContent).join('|'))) === 'Polity|Economy & Social Development|History & Culture', groups)
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
  check('phone: More holds Highlights, Revision queue, theme and account/sync, above the bar', more.fits && ['Highlights', 'Revision queue', 'Account & sync'].every((x) => more.vis.includes(x)) && more.vis.some((x) => / theme$/.test(x)), more)
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
  const dist = await L.ev(() => [...document.querySelectorAll('.dist .dr')].map((r) => r.querySelector('.dn').textContent + ' ' + r.getAttribute('href')))
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
  check('Subjects: time by exam stage, and by subject — most studied first, reading progress beside', sub.stage.startsWith('Prelims') && sub.subjects.length === 3 && sub.subjects[0].startsWith('Polity|') && /\|\d+% done$/.test(sub.subjects[0]) && sub.subjects[1].startsWith('Economy') && sub.subjects[2].startsWith('History & Culture|—|'), sub)
  check('Subjects: least recently studied first; a subject never timed says so', sub.stale.length === 3 && sub.stale[0].startsWith('History & Culture') && sub.stale[0].includes('not studied with the timer yet') && /last studied (today|yesterday)/.test(sub.stale[2]), sub.stale)
  const topic = await L.ev(() => ({ n: document.querySelectorAll('details.syn').length, heads: [...document.querySelectorAll('details.syn .th')].map((b) => b.textContent), chapters: [...document.querySelector('details.syn').querySelectorAll('a.dr')].map((a) => a.getAttribute('href')) }))
  check('Subjects: time by topic and chapter inside each studied subject', topic.n === 2 && topic.heads.length === 2 && topic.chapters.join() === '#/study/prelims/polity/judiciary,' + PARL, topic)
  await L.ev((h) => { document.querySelector('details.syn').open = true; document.querySelector(`details.syn a.dr[href="${h}"]`).click() }, PARL); await sleep(450)
  check('a chapter in the breakdown opens that chapter', (await hashNow()) === PARL && (await L.count('.sec')) === 9)
  await L.page.goBack(); await sleep(350)
  await L.ev(() => document.querySelectorAll('.page > .dist')[1].querySelector('a.dr').click()); await sleep(400)
  check('a subject row opens that subject', (await hashNow()) === '#/study/prelims/polity')

  await L.hash('#/insights/progress')
  const pg = await L.ev(() => ({ overall: [...document.querySelectorAll('.kpi')].map((k) => k.dataset.stage + ' ' + k.textContent), stats: document.querySelectorAll('.stat').length, first: document.querySelector('.stat').textContent, parl: [...document.querySelectorAll('.row')].find((r) => r.querySelector('b')?.textContent === 'Parliament').textContent, bar: document.querySelector('.sbar').getAttribute('aria-label') }))
  check('Progress: Prelims overall; no Mains figure until Mains content exists', pg.overall.length === 1 && pg.overall[0].startsWith('prelims') && /65 chapters/.test(pg.overall[0]) && /of 428 sections done/.test(pg.overall[0]) && /★ \d+ difficult · ↻ \d+ to revise/.test(pg.overall[0]) && /tracked/.test(pg.overall[0]) && /Not started.*Reading.*Revised.*Mastered/.test(pg.bar), pg.overall)
  check('Progress: per subject — completion, the four statuses, ★ / ↻ counts and study time; chapters show time too', pg.stats === 3 && /sections done \(\d+\/117\)/.test(pg.first) && /Not started.*Reading.*Revised.*Mastered/.test(pg.first) && /★ Difficult/.test(pg.first) && /↻ Revise/.test(pg.first) && /tracked · last (today|yesterday)/.test(pg.first) && /tracked/.test(pg.parl) && /★ [1-9]/.test(pg.parl), pg)
  await pick('Status of Mughals', 'mastered'); await sleep(500)
  check('Progress: chapter status can still be set here, is saved, and the overall figure follows', /1 mastered/.test(await L.text('.kpi')) && (await L.idb('kv')).some((v) => v?.chapters?.['prelims/history-culture/mughals']?.status === 'mastered'))
  check('nothing on Progress calls the study good or bad', !/productiv|efficien|great|well done|behind|on track/i.test(await L.text('.page')))

  await L.hash(PARL); await L.click('#s-bills-types-and-procedure .tg.rev')
  await L.go('#/revision')
  const rv = await L.ev(() => ({ hash: location.hash, tab: document.querySelector('.tabs .on').textContent, stat: document.querySelector('.stat').textContent, rows: [...document.querySelectorAll('.row.rv')].map((r) => r.textContent), hl: [...document.querySelectorAll('.rhl a')].map((a) => a.textContent + ' ' + a.getAttribute('href')) }))
  check('the Revision queue is now Insights → Revision; its old link still opens it', rv.hash === '#/insights/revision' && rv.tab === 'Revision' && /★ Difficult.*↻ Revise.*in progress/.test(rv.stat), rv)
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
  check('analytics stored nothing: no new IndexedDB store, no counters or caches on disk', disk.stores === 'activeStudySession,conflicts,highlights,kv,outbox,overrides,studyGoals,studyQueue,studySessions' && !/analytic|insight|total|heat|streak|cache|index/i.test(disk.kv + disk.ls), disk)
  check('the sessions themselves were not touched', JSON.stringify(await L.idb('studySessions')) === JSON.stringify(sesAll))
  for (const [w, h, name] of [[375, 812, 'phone'], [768, 1024, 'tablet']]) {
    await L.page.setViewport({ width: w, height: h })
    const fit = []
    for (const t of ['', '/time', '/subjects', '/progress', '/revision']) { await L.go('#/insights' + t); if (await L.ev(() => document.documentElement.scrollWidth > innerWidth + 1)) fit.push(t) }
    await L.go('#/insights/time')
    const hs = await L.ev(() => { const b = document.querySelector('.heat-scroll'); return { scrolls: b.scrollWidth > b.clientWidth, atEnd: Math.abs(b.scrollLeft + b.clientWidth - b.scrollWidth) < 2, bars: document.querySelector('.vbars').getBoundingClientRect().width } })
    check(`${name}: all five Insights tabs fit; the calendar ${w < 700 ? 'scrolls inside its own frame, opened at today' : 'fits'}`, fit.length === 0 && hs.bars > 250 && (w < 700 ? hs.scrolls && hs.atEnd : true), [fit, hs])
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
  await L.hash('#/insights/revision')
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
  check('Subjects: compact rows with progress, time studied, last studied and Resume / Open', prog.subs.map((s) => s[0]).join('|') === 'Polity|Economy & Social Development|History & Culture' && /studied · last (today|yesterday|\d+ days ago)$/.test(prog.subs[0][1]) && prog.subs[2][1] === 'Not timed yet' && prog.subs.every((s) => /^\d+%$/.test(s[2]) && (s[3] === 'Resume' ? s[4].endsWith('?resume') : s[3] === 'Open' && s[4] === s[5])) && prog.subs[0][5] === '#/study/prelims/polity', prog.subs)
  const rev = await L.ev(() => ({ stat: [...document.querySelectorAll('.rev .mstat b')].map((b) => b.textContent), rows: document.querySelectorAll('.rev .qlist li').length, link: document.querySelector('.rev h3 a').getAttribute('href'), first: document.querySelector('.rev .qlist li .qt')?.getAttribute('href') }))
  check('Revision: ★ / ↻ counts as on Insights → Revision, at most five rows, each opening its section', rev.stat[0] === revStat[0] && rev.stat[1] === revStat[1] && rev.rows >= 1 && rev.rows <= 5 && rev.link === '#/insights/revision' && /^#\/study\/prelims\/[^/]+\/[^/]+\/[^/?]+$/.test(rev.first), [rev, revStat])
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
  check('the dashboard stored nothing: no totals, streaks or view model on disk', disk2.stores === 'activeStudySession,conflicts,highlights,kv,outbox,overrides,studyGoals,studyQueue,studySessions' && !/dash|total|heat|streak|week|today|cache/i.test(disk2.kv + disk2.ls) && !/"(\w*Ms|\w*[Ss]treak\w*|\w*[Pp]ercent\w*)":/.test(JSON.stringify([await L.idb('studyQueue'), await L.idb('studyGoals')]).replace(/"(daily|weekly)TargetMs"/g, '"target"')), disk2)

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
  check('no history: Home says so in words — no charts, no sample figures, no default goal', fresh.cont === 'Nothing opened yet' && fresh.today === '0 min' && fresh.sub === 'None yesterday either' && fresh.week.startsWith('No tracked study time yet') && fresh.charts === 0 && fresh.queue === 0 && fresh.goal === 0 && fresh.rev.startsWith('Nothing flagged') && fresh.start === 'Choose a chapter' && fresh.pct === '0%' && fresh.recent === 0 && fresh.subs === 'Not timed yet|Not timed yet|Not timed yet' && !/NaN|undefined|Infinity|∞/.test(fresh.text), fresh)
  await N.page.screenshot({ path: join(OUT, 'desktop-home-empty.png'), fullPage: true })
  await N.ctx.close()

  // ==========================================================================
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
      bg: getComputedStyle(document.body).backgroundColor, ink: getComputedStyle(document.querySelector('.prose')).color, rc: getComputedStyle(rc).filter,
      collapsed: document.querySelector('#s-presiding-officers .sec-body').getBoundingClientRect().height, table: getComputedStyle(document.querySelector('.prose table')).display,
      clipped: [...document.querySelectorAll('.prose table, .prose .callout')].filter((e) => e.scrollWidth > e.clientWidth + 1).length }
  })
  check('print: controls hidden', [pr.topbar, pr.sidebar, pr.tools, pr.meta, pr.pn, pr.bar].every((x) => x === 'none'), pr)
  check('print: white background, dark text', pr.bg === 'rgb(255, 255, 255)' && pr.ink === 'rgb(17, 17, 17)', pr)
  check('print: recall answers revealed', pr.rc === 'none', pr.rc)
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
  const routes = ['#/', '#/study', '#/study/mains', '#/pyqs', '#/insights', '#/study/prelims/polity', '#/study/prelims/polity?tab=insights', '#/highlights', '#/revision', '#/insights/time', '#/insights/subjects', '#/insights/progress', PARL, '#/study/prelims/polity/constitutional-bodies', '#/study/prelims/polity/parts-schedules', '#/study/prelims/economy', '#/study/prelims/economy?tab=insights', '#/study/prelims/economy/budget-fiscal-policy', '#/study/prelims/economy/government-schemes', '#/study/prelims/economy/money-rbi-monetary-policy', '#/study/prelims/economy/international-institutions', '#/study/prelims/history-culture', '#/study/prelims/history-culture?tab=insights', '#/study/prelims/history-culture/constitutional-development', '#/study/prelims/history-culture/architecture-sculpture', '#/study/prelims/history-culture/early-nationalism-swadeshi', '#/study/prelims/history-culture/british-administration-economy']
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
  await L.hash('#/study/prelims/economy/taxation'); await L.click('.chap-meta .fav.q'); await L.reload(); await L.hash('#/'); await sleep(700)
  const offHome = await L.ev(() => ({ cards: document.querySelectorAll('.card').length, cells: document.querySelectorAll('.week .heat i[data-date]').length, bars: document.querySelectorAll('.week .vb').length, today: document.querySelector('.today .big').dataset.final }))
  check('offline: Home is drawn from this device — figures, charts, and a queue change that persists', offHome.cards >= 8 && offHome.cells >= 85 && offHome.bars === 7 && /min$/.test(offHome.today) && (await L.idb('studyQueue')).some((r) => r.target.chapterId === 'taxation' && !r.removed) && (await qTitles()).length === (await L.idb('studyQueue')).filter((r) => !r.removed && !r.completedAt).length, offHome)
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
  section('Sync — navigation preferences')
  await A.hash(PARL); await A.click('.chap-meta .fav'); await A.syncNow(); await B.syncNow(); await B.hash('#/')
  const navB = await B.ev(() => Object.fromEntries([...document.querySelectorAll('.page section')].map((x) => [x.querySelector('h3').textContent, [...x.querySelectorAll('.row b')].map((b) => b.textContent)])))
  check('favourites and recent destinations reach the second device', navB.Favourites?.join() === 'Parliament' && navB.Recent?.[0] === 'Parliament', navB)
  const prefDocs = (await cloudDump()).filter((d) => d.rec.kind === 'pref')
  check('they travel inside the existing preferences record; no navigation tree or view model is uploaded', prefDocs.length === 1 && prefDocs[0].rec.f.favourites.v[0].chapterId === 'parliament' && Array.isArray(prefDocs[0].rec.f.recents.v) && (await cloudDump()).every((d) => ['edit', 'hl', 'sec', 'chap', 'pref'].includes(d.rec.kind)), prefDocs.map((d) => Object.keys(d.rec.f)))
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
