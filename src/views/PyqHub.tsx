import { memo, useEffect, useMemo, useState } from 'react'
import { Check, RotateCw, Star, TriangleAlert } from 'lucide-react'
import { linkIndex, pyqIndex, stageTitle, type Subject } from '../lib/content'
import type { PyqHubRecord } from '../lib/contract'
import { linkKey } from '../lib/links'
import { EXAM_LABEL, STATUS_TEXT, filterPyqs, type PyqFilter, type PyqFlags } from '../lib/pyq'
import { hasPyqState, setPyqFlags, usePyq } from '../lib/pyqState'
import { href, replace } from '../lib/router'

const PAGE_SIZE = 40
const MINE: [string, string][] = [['unseen', 'Not seen'], ['seen', 'Seen'], ['revised', 'Revised'], ['difficult', 'Difficult']]
const WARNING = {
  'review-required': 'Review required — the canonical record of this question is flagged. It is evidence of demand only; no answer is taken from it.',
  'demand-only': 'Demand only — the record shows what is asked, not a reliable answer.',
} as const

/** PYQ Hub: every previous-year question the library records, filterable and linked to the notes. */
export function PyqHub({ subjects, filter }: { subjects: Subject[]; filter: PyqFilter }) {
  const ix = pyqIndex()
  const rows = usePyq((s) => s.rows)
  const anyState = hasPyqState(rows)
  const stage = filter.stage || 'prelims'
  const stagesWith = useMemo(() => [...new Set(ix.records.map((r) => r.stage))], [ix])
  const inStage = useMemo(() => ix.records.filter((r) => r.stage === stage), [ix, stage])
  const years = useMemo(() => [...new Set(inStage.map((r) => r.year))].sort((a, b) => b - a), [inStage])
  const exams = useMemo(() => [...new Set(inStage.map((r) => r.exam))], [inStage])
  const withPyq = subjects.filter((s) => s.stage === stage && s.pyq)
  const subject = withPyq.find((s) => s.id === filter.subject)
  const chapter = subject?.chapters.find((c) => c.id === filter.chapter)
  // sections of the chosen chapter that questions are recorded against
  const sections = useMemo(() => (chapter ? chapter.sections.filter((s) => inStage.some((r) => r.linkedContent.some((c) => c.subjectId === subject!.id && c.chapterId === chapter.id && c.sectionId === s.id))) : []), [chapter, subject, inStage])

  // the learner's flags only matter to the result list while the "mine" filter is on
  const results = useMemo(() => filterPyqs(ix, filter, filter.mine ? rows : {}), [ix, filter, filter.mine ? rows : null])
  const address = href.pyqs(filter)
  const [shown, setShown] = useState(PAGE_SIZE)
  useEffect(() => setShown(PAGE_SIZE), [address])

  // Filters live in the address: changing one replaces it, so Back leaves the hub in one step.
  const set = (patch: PyqFilter) => replace(href.pyqs({ ...filter, id: undefined, ...patch }))
  const [text, setText] = useState(filter.q ?? '')
  useEffect(() => {
    if ((filter.q ?? '') !== text.trim()) setText(filter.q ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.q])
  const active = Object.entries(filter).some(([k, v]) => v && k !== 'stage')
  const flagged = inStage.filter((r) => r.status !== 'validated').length

  return (
    <div className="page wide pyqhub">
      <div className="eyebrow">Previous year questions</div>
      <h1 className="title">PYQ Hub</h1>
      {stagesWith.length > 1 && (
        <nav className="tabs">
          {stagesWith.map((st) => <a key={st} className={st === stage ? 'on' : ''} href={href.pyqs(st === 'prelims' ? undefined : { stage: st })}>{stageTitle(st)}</a>)}
        </nav>
      )}
      <div className="stat">
        <span><b>{inStage.length}</b>{stageTitle(stage)} questions</span>
        {exams.map((e) => <span key={e}><b>{inStage.filter((r) => r.exam === e).length}</b>{EXAM_LABEL[e]}</span>)}
        <span><b>{flagged}</b>flagged for review / demand only</span>
      </div>
      <p className="lead">Question IDs and demand themes recorded in the Source Packs, linked to the notes that cover them. Question text is not in the library, so none is shown.</p>

      <div className="filters pq-filters">
        <input className="sel pq-q" type="search" value={text} placeholder="Search ID, concept, subject or topic" aria-label="Search questions"
          onChange={(e) => { setText(e.target.value); set({ q: e.target.value.trim() || undefined }) }} />
        <select className="sel" aria-label="Exam" value={filter.exam ?? ''} onChange={(e) => set({ exam: e.target.value || undefined })}>
          <option value="">All exams</option>
          {exams.map((e) => <option key={e} value={e}>{EXAM_LABEL[e]}</option>)}
        </select>
        <select className="sel" aria-label="Year" value={filter.year ?? ''} onChange={(e) => set({ year: e.target.value || undefined })}>
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="sel" aria-label="Subject" value={subject?.id ?? ''} onChange={(e) => set({ subject: e.target.value || undefined, topic: undefined, chapter: undefined, section: undefined })}>
          <option value="">All subjects</option>
          {withPyq.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        {subject && (
          <select className="sel" aria-label="Topic or chapter" value={filter.chapter ?? (filter.topic ? 't:' + filter.topic : '')}
            onChange={(e) => { const v = e.target.value; set(v.startsWith('t:') ? { topic: v.slice(2), chapter: undefined, section: undefined } : { topic: undefined, chapter: v || undefined, section: undefined }) }}>
            <option value="">All topics</option>
            {subject.topics.map((t) => (
              <optgroup key={t.id} label={t.title}>
                <option value={'t:' + t.id}>All of {t.title}</option>
                {subject.chapters.filter((c) => c.topicId === t.id && subject.pyq!.chapters[c.id]).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </optgroup>
            ))}
          </select>
        )}
        {chapter && sections.length > 0 && (
          <select className="sel" aria-label="Section" value={filter.section ?? ''} onChange={(e) => set({ section: e.target.value || undefined })}>
            <option value="">All sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
        <select className="sel" aria-label="Status" value={filter.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })}>
          <option value="">Any status</option>
          <option value="validated">{STATUS_TEXT.validated}</option>
          <option value="review-required">{STATUS_TEXT['review-required']}</option>
          <option value="demand-only">{STATUS_TEXT['demand-only']}</option>
          <option value="dynamic">Dynamic</option>
        </select>
        {(anyState || filter.mine) && (
          <select className="sel" aria-label="My flags" value={filter.mine ?? ''} onChange={(e) => set({ mine: e.target.value || undefined })}>
            <option value="">Seen or not</option>
            {MINE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        {active && <button className="linkbtn" onClick={() => { setText(''); replace(href.pyqs({ stage: filter.stage })) }}>Clear filters</button>}
      </div>

      <div className="pq-count" role="status">{results.length === inStage.length ? `${results.length} questions` : `${results.length} of ${inStage.length} questions`}{filter.id && results.length === 1 ? ' · opened by ID' : ''}</div>
      {results.length === 0 ? (
        <p className="empty">No questions match these filters.</p>
      ) : (
        <ul className="pqlist">
          {results.slice(0, shown).map((r) => <PyqRow key={r.pyqId} rec={r} note={ix.notes.get(r.pyqId)} flags={rows[r.pyqId]} single={withPyq.length === 1} />)}
        </ul>
      )}
      {results.length > shown && <button className="btn pq-more" onClick={() => setShown(shown + PAGE_SIZE * 2)}>Show more · {results.length - shown} left</button>}
    </div>
  )
}

const PyqRow = memo(function PyqRow({ rec, note, flags, single }: { rec: PyqHubRecord; note?: string; flags?: PyqFlags; single: boolean }) {
  const [all, setAll] = useState(false)
  const places = linkIndex().places
  const notes = rec.linkedContent.map((ref) => ({ ref, place: places.get(linkKey(ref)) })).filter((n) => n.place)
  const list = all ? notes : notes.slice(0, 3)
  const toggle = (name: keyof PyqFlags) => setPyqFlags(rec.pyqId, { [name]: !flags?.[name] })
  return (
    <li className={'pq' + (flags?.seen ? ' is-seen' : '')} data-status={rec.status} id={'pyq-' + rec.pyqId}>
      <div className="pq-head">
        <code className="pq-id">{rec.pyqId}</code>
        <span className="chip u">{EXAM_LABEL[rec.exam]} · {rec.year}</span>
        {rec.status !== 'validated' && <span className="chip warn"><TriangleAlert />{STATUS_TEXT[rec.status]}</span>}
        {rec.dynamic && <span className="chip dyn" title={note}>↻ Dynamic</span>}
        <span className="pq-acts">
          <button className={'tg done' + (flags?.seen ? ' on' : '')} aria-pressed={!!flags?.seen} title={flags?.seen ? 'Seen — click to clear' : 'Mark seen'} aria-label="Mark seen" onClick={() => toggle('seen')}><Check /></button>
          <button className={'tg rev' + (flags?.revised ? ' on' : '')} aria-pressed={!!flags?.revised} title={flags?.revised ? 'Revised — click to clear' : 'Mark revised'} aria-label="Mark revised" onClick={() => toggle('revised')}><RotateCw /></button>
          <button className={'tg star' + (flags?.difficult ? ' on' : '')} aria-pressed={!!flags?.difficult} title={flags?.difficult ? 'Difficult — click to clear' : 'Mark difficult'} aria-label="Mark difficult" onClick={() => toggle('difficult')}><Star /></button>
        </span>
      </div>
      {rec.oneLiner && <p className="pq-one">{rec.oneLiner}</p>}
      {rec.demandTags && <p className="pq-tags"><span>Demand</span>{rec.demandTags.join(' · ')}</p>}
      {rec.status !== 'validated' && <p className="pq-warn">{WARNING[rec.status]}{note ? ` (${note})` : ''}</p>}
      {notes.length > 0 && (
        <p className="pq-notes">
          <span>Open related notes</span>
          {list.map(({ ref, place }) => (
            <a key={linkKey(ref)} href={href.reader(place!.chapter.key, place!.section?.id)}>
              {!single && <small>{place!.subject.title} › </small>}
              {place!.chapter.title}
              {place!.section ? ` › ${place!.section.title}` : ''}
            </a>
          ))}
          {notes.length > 3 && <button className="more" onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Show fewer' : `+${notes.length - 3} more`}</button>}
        </p>
      )}
    </li>
  )
})
