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
const PARL = '#/r/prelims/polity/parliament'

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
  await L.hash('#/progress')
  check('Polity: 19 chapters', (await L.count('.rows .row')) === 19)
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
  check('Resume card points at the last chapter and section', (await L.text('.resume')).includes('Parliament'))
  await L.click('.resume'); await sleep(500)
  check('Resume returns to the saved position', Math.abs((await L.ev(() => scrollY)) - 2400) < 150 && (await L.ev(() => location.hash)).includes('parliament'))

  // search
  const search = async (q) => { await L.ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))); await sleep(200); const r = await L.ev(async (q) => { const i = document.querySelector('.palette input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, q); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 200)); return [...document.querySelectorAll('.palette li b')].map((b) => b.textContent) }, q); await L.page.keyboard.press('Escape'); await sleep(150); return r }
  const s1 = await search('Article 368'); const s2 = await search('Art. 368')
  check('Ctrl+K search; "Article 368" and "Art. 368" give the same results', s1[0] === 'Article 368 — Procedure' && s1.join() === s2.join(), [s1, s2])
  check('search covers user edits', (await search('E2E-ADDED'))[0] === 'Presiding Officers (edited)')
  check('search: chapter jump', (await search('judiciary'))[0] === 'Judiciary & Legal Services')

  // navigation
  await L.hash('#/r/prelims/polity/political-theory')
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
  await L.hash('#/s/prelims/polity/pyq'); const pyq = await L.count('details.syn')
  await L.hash('#/s/prelims/polity/insights'); const ins = await L.count('.hbar')
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
  const routes = ['#/', '#/s/prelims/polity', '#/s/prelims/polity/insights', '#/highlights', '#/revision', '#/progress', PARL, '#/r/prelims/polity/constitutional-bodies', '#/r/prelims/polity/parts-schedules']
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
    if (w === 375) { await L.page.screenshot({ path: join(OUT, 'phone.png') }); await L.click('button[aria-label="Toggle sidebar"]'); await sleep(350); check('phone: drawer opens over content', (await L.ev(() => document.querySelector('.sidebar').getBoundingClientRect().left)) === 0); await L.click('.scrim') }
  }
  await L.page.screenshot({ path: join(OUT, 'desktop.png') })

  // ==========================================================================
  section('Offline (PWA)')
  await L.page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 15000 })
  await L.page.setOfflineMode(true)
  await L.reload()
  check('offline: full reload served by the service worker', (await L.count('.sec')) === 9)
  await L.hash('#/r/prelims/polity/judiciary')
  check('offline: navigation and cached notes', (await L.ev(() => document.title)).startsWith('Judiciary'))
  await L.highlight('article-map', 'Supreme Court', 'green'); await L.click('#s-article-map .tg.done')
  await L.reload()
  check('offline: local changes persist', (await L.marks('article-map')).length === 1 && (await L.text('.chap-meta span')).startsWith('1 /'))
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
  check('Resume points at the chapter last read on device A', (await B.text('.resume'))?.includes('Parliament'))
  await B.click('.resume'); await sleep(600)
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
