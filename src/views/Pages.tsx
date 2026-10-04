import { useMemo, useState } from 'react'
import { Star, X } from 'lucide-react'
import { getLoaded, pyqIndex, stageTitle, stages, type Chapter, type PyqCluster, type Subject } from '../lib/content'
import { STATUS_TEXT, parsePyqId } from '../lib/pyq'
import { STATUS_LABEL, chapterProgress, secHtml, secTitle, subjectProgress, useStore } from '../lib/store'
import { href } from '../lib/router'
import { COLORS, anchor, textStream, type Color, type Highlight } from '../lib/highlight'
import { renderBody } from '../lib/md'
import type { ContentRef } from '../lib/contract'
import { isFavourite, subjectRef, toggleFavourite, type Destination } from '../lib/nav'

export const Meter = ({ v, max }: { v: number; max: number }) => (
  <span className="meter"><i style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></span>
)

function useResume(subjects: Subject[]) {
  const last = useStore((s) => s.progress.last)
  const chapters = useStore((s) => s.progress.chapters)
  if (!last) return null
  for (const s of subjects) {
    const c = s.chapters.find((c) => c.key === last.chapterKey)
    if (c) {
      const sec = c.sections.find((x) => x.id === chapters[c.key]?.section)
      return { subject: s, chapter: c, section: sec }
    }
  }
  return null
}

/** Star toggle for a favourite destination. */
export function FavButton({ target, what }: { target: ContentRef; what: string }) {
  const on = useStore((s) => isFavourite(s.prefs.favourites, target))
  return (
    <button className={'fav' + (on ? ' on' : '')} onClick={() => toggleFavourite(target)} aria-pressed={on} title={on ? `Remove ${what} from favourites` : `Add ${what} to favourites`}>
      <Star />{on ? 'Favourite' : 'Add to favourites'}
    </button>
  )
}

export function DestRows({ items }: { items: (Destination & { note?: string })[] }) {
  return (
    <div className="rows">
      {items.map((d) => (
        <a key={d.id} className="row" href={d.to}>
          <span className="t"><b>{d.title}</b><small>{d.context}</small></span>
          {d.note && <span className="num" style={{ width: 'auto' }}>{d.note}</span>}
        </a>
      ))}
    </div>
  )
}

// ---- Study (library): stage → paper → subject --------------------------------
export function StudyHome({ stage }: { stage?: string }) {
  const progress = useStore((s) => s.progress)
  const shown = stages.some((st) => st.id === stage) ? stages.filter((st) => st.id === stage) : stages
  return (
    <div className="page">
      <div className="eyebrow">Library</div>
      <h1 className="title">Study</h1>
      {shown.map((st) => (
        <section key={st.id}>
          <h2 className="sh">{st.title}</h2>
          {st.groups.filter((g) => g.subjects.length).map((g) => (
            <div key={g.id}>
              {st.groups.length > 1 && <h3 className="gh">{g.title}</h3>}
              <div className="rows" style={st.groups.length > 1 ? undefined : { marginTop: 10 }}>
                {g.subjects.map((slot) => {
                  const s = slot.available ? getLoaded(slot.key) : null
                  if (!s) return <div key={slot.id} className="row off"><span className="t">{slot.title}</span><small>not added yet</small></div>
                  const p = subjectProgress(progress, s)
                  return (
                    <a key={slot.id} className="row" href={href.subject(s.key)}>
                      <span className="t"><b>{s.title}</b><small>{s.chapters.length} chapters · {p.total} sections</small></span>
                      <Meter v={p.done} max={p.total} />
                      <span className="num">{p.pct}%</span>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
      {shown.length < stages.length && <p style={{ marginTop: 22 }}><a className="linkbtn" style={{ color: 'var(--accent)' }} href={href.study()}>All stages →</a></p>}
    </div>
  )
}

// ---- Subject overview / PYQs / Insights ------------------------------------
const pid = (id: string) => {
  const p = parsePyqId(id)
  return p ? { exam: p.exam === 'UPPCS' ? 'uppcs' : 'upsc', year: p.year, q: p.q } : null
}
const uniq = (cl: PyqCluster[]) => [...new Set(cl.flatMap((c) => c.ids))]

export function SubjectView({ subject, tab }: { subject: Subject; tab: 'overview' | 'pyq' | 'insights' }) {
  const progress = useStore((s) => s.progress)
  const p = subjectProgress(progress, subject)
  const resume = useResume([subject])
  const hasPyq = !!subject.pyq
  return (
    <div className="page wide">
      <div className="eyebrow">{stageTitle(subject.stage)}</div>
      <h1 className="title">{subject.title}</h1>
      <div className="chap-meta" style={{ borderBottom: 0, paddingBottom: 0, marginBottom: 0 }}>
        <span>{subject.chapters.length} chapters · {p.done} / {p.total} sections done</span>
        <span className="meter" style={{ width: 120 }}><i style={{ width: `${p.pct}%` }} /></span>
        <FavButton target={subjectRef(subject)} what="this subject" />
        {resume && <a className="linkbtn" style={{ marginLeft: 'auto', color: 'var(--accent)' }} href={href.reader(resume.chapter.key, undefined, { resume: true })}>Resume: {resume.chapter.title} →</a>}
      </div>
      <nav className="tabs">
        <a className={tab === 'overview' ? 'on' : ''} href={href.subject(subject.key)}>Overview</a>
        {hasPyq && <a className={tab === 'pyq' ? 'on' : ''} href={href.subject(subject.key, 'pyq')}>PYQs</a>}
        {hasPyq && <a className={tab === 'insights' ? 'on' : ''} href={href.subject(subject.key, 'insights')}>Insights</a>}
      </nav>
      {tab === 'overview' || !hasPyq ? <Overview subject={subject} /> : tab === 'pyq' ? <Pyqs subject={subject} /> : <Insights subject={subject} />}
    </div>
  )
}

export function ChapterRow({ c }: { c: Chapter }) {
  const progress = useStore((s) => s.progress)
  const cp = chapterProgress(progress, c)
  return (
    <a className="row" href={href.reader(c.key)}>
      <i className="dot" data-s={cp.status} title={STATUS_LABEL[cp.status]} />
      <span className="t"><b>{c.title}</b><small>{STATUS_LABEL[cp.status]} · {c.sections.length} sections</small></span>
      <Meter v={cp.done} max={cp.total} />
      <span className="num">{cp.done}/{cp.total}</span>
    </a>
  )
}

function Overview({ subject }: { subject: Subject }) {
  return (
    <>
      {subject.topics.map((t) => (
        <div key={t.id}>
          <h3 className="gh">{t.title}</h3>
          <div className="rows">
            {subject.chapters.filter((c) => c.topicId === t.id).map((c) => <ChapterRow key={c.id} c={c} />)}
          </div>
        </div>
      ))}
    </>
  )
}

function yearCounts(subject: Subject) {
  const years = new Map<number, { upsc: Set<string>; uppcs: Set<string> }>()
  for (const ch of Object.values(subject.pyq!.chapters)) {
    for (const id of [...uniq(ch.upsc), ...uniq(ch.uppcs)]) {
      const p = pid(id)
      if (!p) continue
      if (!years.has(p.year)) years.set(p.year, { upsc: new Set(), uppcs: new Set() })
      years.get(p.year)![p.exam as 'upsc' | 'uppcs'].add(id)
    }
  }
  return [...years.entries()].sort((a, b) => a[0] - b[0])
}

function Pyqs({ subject }: { subject: Subject }) {
  const byId = pyqIndex().byId
  const stage = subject.stage === 'prelims' ? undefined : subject.stage
  // each reference opens its record in the PYQ Hub; flagged records stay marked here too
  const Chips = ({ ids, u }: { ids: string[]; u?: boolean }) => (
    <div className="chips">
      {ids.map((id) => {
        const p = pid(id)
        const status = byId.get(id)?.status ?? 'validated'
        const flagged = status !== 'validated'
        return <a key={id} href={href.pyqs({ stage, id })} className={'chip' + (u ? ' u' : '') + (flagged ? ' warn' : '')} title={flagged ? `${id} — ${STATUS_TEXT[status]}` : id}>{p ? `${p.year} · Q${p.q}` : id}{flagged ? ' ⚠' : ''}</a>
      })}
    </div>
  )
  return (
    <>
      <p className="lead">Question references recorded in the Source Pack's PYQ Demand Map, grouped by the theme they test. Only IDs are available in the source — question text is not reproduced. <a className="linkbtn" style={{ color: 'var(--accent)' }} href={href.pyqs({ stage, subject: subject.id })}>Open in the PYQ Hub →</a></p>
      {subject.chapters.map((c) => {
        const d = subject.pyq!.chapters[c.id]
        if (!d) return null
        const nu = uniq(d.upsc).length
        const np = uniq(d.uppcs).length
        return (
          <details className="syn" key={c.id}>
            <summary>{c.title} <small style={{ color: 'var(--ink-3)', fontWeight: 400 }}>— UPSC {nu} · UPPCS {np}</small></summary>
            <div style={{ padding: '8px 0 4px' }}>
              {(['upsc', 'uppcs'] as const).map((ex) =>
                d[ex].length ? (
                  <div key={ex}>
                    <h3 className="gh">{ex === 'upsc' ? 'UPSC CSE' : 'UPPCS'}</h3>
                    {d[ex].map((cl, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 13.5, fontWeight: 550 }}>{cl.label}</div>
                        <Chips ids={cl.ids} u={ex === 'upsc'} />
                      </div>
                    ))}
                  </div>
                ) : null,
              )}
              <a className="linkbtn" style={{ color: 'var(--accent)' }} href={href.reader(c.key)}>Open chapter →</a>
            </div>
          </details>
        )
      })}
    </>
  )
}

function Insights({ subject }: { subject: Subject }) {
  const overrides = useStore((s) => s.overrides)
  const years = useMemo(() => yearCounts(subject), [subject])
  const maxY = Math.max(1, ...years.map(([, v]) => v.upsc.size + v.uppcs.size))
  const per = subject.chapters
    .map((c) => {
      const d = subject.pyq!.chapters[c.id]
      return { c, upsc: d ? uniq(d.upsc).length : 0, uppcs: d ? uniq(d.uppcs).length : 0 }
    })
    .sort((a, b) => b.upsc + b.uppcs - (a.upsc + a.uppcs))
  const maxC = Math.max(1, ...per.map((x) => x.upsc + x.uppcs))
  const flags = useMemo(() => {
    const out: { c: Chapter; secId: string; secTitle: string; kind: string; text: string }[] = []
    for (const c of subject.chapters)
      for (const s of c.sections) {
        const html = secHtml(overrides, s)
        if (!/data-kind="(verify|dyn)"/.test(html)) continue
        const doc = new DOMParser().parseFromString(html, 'text/html')
        doc.querySelectorAll('.callout[data-kind="verify"], .callout[data-kind="dyn"]').forEach((el) =>
          out.push({ c, secId: s.id, secTitle: secTitle(overrides, s), kind: el.getAttribute('data-kind')!, text: (el.textContent ?? '').trim() }),
        )
      }
    return out
  }, [subject, overrides])
  return (
    <>
      <p className="lead">Derived only from the Source Pack: PYQ reference counts and the pack's own demand synthesis. No estimated weightage or predictions.</p>
      <h3 className="gh">PYQ references by year</h3>
      <div className="bars">
        {years.map(([y, v]) => (
          <div key={y} title={`${y}: UPSC ${v.upsc.size}, UPPCS ${v.uppcs.size}`}>
            <span>{v.upsc.size + v.uppcs.size}</span>
            <i className="b2" style={{ height: `${(v.uppcs.size / maxY) * 70}%` }} />
            <i style={{ height: `${(v.upsc.size / maxY) * 70}%`, borderRadius: v.uppcs.size ? 0 : undefined }} />
            <span>’{String(y).slice(2)}</span>
          </div>
        ))}
      </div>
      <div className="legend"><span><i />UPSC CSE</span><span><i className="b2" />UPPCS</span></div>

      <h3 className="gh" style={{ marginTop: 26 }}>PYQ references by chapter</h3>
      {per.map(({ c, upsc, uppcs }) => (
        <a className="hbar" key={c.id} href={href.reader(c.key)}>
          <span>{c.title}</span>
          <Meter v={upsc + uppcs} max={maxC} />
          <span style={{ color: 'var(--ink-3)', fontSize: 12 }} title={`UPSC ${upsc} · UPPCS ${uppcs}`}>{upsc}+{uppcs}</span>
        </a>
      ))}

      <h3 className="gh" style={{ marginTop: 26 }}>Demand synthesis by chapter</h3>
      {subject.chapters.map((c) => {
        const d = subject.pyq!.chapters[c.id]
        if (!d?.synthesis) return null
        return (
          <details className="syn" key={c.id}>
            <summary>{c.title}</summary>
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderBody(d.synthesis, subject.key) }} />
          </details>
        )
      })}

      {flags.length > 0 && (
        <>
          <h3 className="gh" style={{ marginTop: 26 }}>Check before the exam — dynamic &amp; unresolved items</h3>
          <div className="rows">
            {flags.map((f, i) => (
              <a className="row" key={i} href={href.reader(f.c.key, f.secId)}>
                <span className="chip" style={{ flexShrink: 0 }}>{f.kind === 'dyn' ? '↻ Dynamic' : 'Verify'}</span>
                <span className="t"><span style={{ fontSize: 13.5 }}>{f.text.length > 180 ? f.text.slice(0, 180) + '…' : f.text}</span><br /><small>{f.c.title} › {f.secTitle}</small></span>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ---- Highlights -------------------------------------------------------------
export function locate(subjects: Subject[], sectionKey: string) {
  for (const s of subjects) {
    if (!sectionKey.startsWith(s.key + '/')) continue
    for (const c of s.chapters) {
      const sec = c.sections.find((x) => x.key === sectionKey)
      if (sec) return { subject: s, chapter: c, section: sec }
    }
  }
  return null
}

export function Highlights({ subjects }: { subjects: Subject[] }) {
  const overrides = useStore((s) => s.overrides)
  const highlights = useStore((s) => s.highlights)
  const { recolorHighlights, removeHighlights } = useStore.getState()
  const [color, setColor] = useState<Color | ''>('')
  const [subj, setSubj] = useState('')
  const items = useMemo(() => {
    const all: (Highlight & { loc: NonNullable<ReturnType<typeof locate>>; at: number | null })[] = []
    const streams = new Map<string, string>()
    for (const h of Object.values(highlights)) {
      if (h.deleted) continue
      const loc = locate(subjects, h.sectionKey)
      if (!loc) continue
      if (!streams.has(h.sectionKey)) streams.set(h.sectionKey, textStream(secHtml(overrides, loc.section)))
      // `at` = position in the current text; null when the words are no longer there
      all.push({ ...h, loc, at: anchor(streams.get(h.sectionKey)!, h)?.start ?? null })
    }
    return all
  }, [highlights, overrides, subjects])
  const shown = items.filter((i) => (!color || i.color === color) && (!subj || i.loc.subject.key === subj))
  const groups = new Map<string, typeof shown>()
  for (const s of subjects) for (const c of s.chapters) {
    const g = shown.filter((i) => i.loc.chapter === c)
    if (g.length) groups.set(c.key, g.sort((a, b) => c.sections.indexOf(a.loc.section) - c.sections.indexOf(b.loc.section) || (a.at ?? 1e9) - (b.at ?? 1e9)))
  }
  const subjectsWith = [...new Set(items.map((i) => i.loc.subject))]
  return (
    <div className="page">
      <div className="eyebrow">Fast revision</div>
      <h1 className="title">Highlights</h1>
      {items.length === 0 ? (
        <p className="empty">Nothing highlighted yet. Select any text while reading and pick a colour — it will be collected here.</p>
      ) : (
        <>
          <div className="filters">
            <span>{shown.length} of {items.length}</span>
            <button className={'chip' + (!color ? ' u' : '')} onClick={() => setColor('')}>All colours</button>
            {COLORS.map((c) => (
              <button key={c} className="sw" data-c={c} aria-label={`Show ${c}`} style={{ width: 18, height: 18, outline: color === c ? '2px solid var(--accent)' : undefined, outlineOffset: 2 }} onClick={() => setColor(color === c ? '' : c)} />
            ))}
            {subjectsWith.length > 1 && (
              <select className="sel" value={subj} onChange={(e) => setSubj(e.target.value)} aria-label="Subject">
                <option value="">All subjects</option>
                {subjectsWith.map((s) => <option key={s.key} value={s.key}>{stageTitle(s.stage)} · {s.title}</option>)}
              </select>
            )}
          </div>
          {[...groups.entries()].map(([ck, list]) => {
            const { subject, chapter } = list[0].loc
            return (
              <div key={ck}>
                <h3 className="gh">{stageTitle(subject.stage)} › {subject.title} › {chapter.title}</h3>
                <div className="rows">
                  {list.map((i) => (
                    <div className="hl-item" key={i.id}>
                      <span className="bar" style={{ background: `var(--hl-${i.color})` }} />
                      <a href={href.reader(chapter.key, i.loc.section.id, i.at === null ? undefined : { h: i.id })}>
                        <p>{i.text}</p>
                        <small>
                          {secTitle(overrides, i.loc.section)}
                          {i.at === null && ' · not in the current text (the passage was edited or reset)'}
                        </small>
                      </a>
                      <span className="ops">
                        {COLORS.filter((c) => c !== i.color).map((c) => (
                          <button key={c} className="sw" data-c={c} title={`Change to ${c}`} aria-label={`Change to ${c}`} onClick={() => recolorHighlights([i.id], c)} />
                        ))}
                        <button className="tg" style={{ opacity: 1 }} title="Remove highlight" aria-label="Remove highlight" onClick={() => removeHighlights([i.id])}><X /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
