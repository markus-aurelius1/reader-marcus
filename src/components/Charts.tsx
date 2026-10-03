// The three chart shapes Insights needs, drawn with plain HTML/SVG in the reader's own tokens
// (light and dark come from the theme variables; motion is switched off by the global
// reduced-motion rule). Each one has a readout that follows hover, focus and tap, and a text
// equivalent for screen readers. One series, one hue: no legend to decode.
import { useEffect, useRef, useState } from 'react'
import type { StudyHeatmapDay } from '../lib/contract'

export interface Datum {
  key: string
  /** Axis label. */
  label: string
  /** Full name, for the readout and the table. */
  title: string
  value: number
}

/** Hover / keyboard / tap selection shared by the charts. */
function usePick(n: number) {
  const [at, setAt] = useState(-1)
  const props = (i: number) => ({ onPointerEnter: () => setAt(i), onClick: () => setAt(i) })
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    setAt((i) => Math.max(0, Math.min(n - 1, (i < 0 ? (e.key === 'ArrowRight' ? -1 : n) : i) + (e.key === 'ArrowRight' ? 1 : -1))))
  }
  return { at: at < n ? at : -1, setAt, props, group: { tabIndex: 0, onKeyDown, onPointerLeave: () => setAt(-1), onBlur: () => setAt(-1) } }
}

const thin = (n: number) => (n <= 8 ? 1 : n <= 16 ? 2 : n <= 24 ? 3 : 5)

function DataTable({ caption, unit, data, format }: { caption: string; unit: string; data: Datum[]; format: (v: number) => string }) {
  return (
    // wrapped: a table ignores the 1px box that hides it and would widen the page
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead><tr><th>{unit}</th><th>Value</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.key}><th>{d.title}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

function readout(data: Datum[], at: number, format: (v: number) => string) {
  if (at >= 0) return <><b>{format(data[at].value)}</b> · {data[at].title}</>
  const top = data.reduce((a, d) => (d.value > a.value ? d : a), data[0])
  return top && top.value > 0 ? <>Highest: <b>{format(top.value)}</b> · {top.title}</> : <>&nbsp;</>
}

/** Vertical bars from a zero baseline. */
export function BarChart({ data, format, caption, unit }: { data: Datum[]; format: (v: number) => string; caption: string; unit: string }) {
  const pick = usePick(data.length)
  const max = Math.max(1, ...data.map((d) => d.value))
  const every = thin(data.length)
  return (
    <figure className="chart">
      <div className="chart-read" aria-hidden="true">{readout(data, pick.at, format)}</div>
      <div className="vbars" role="group" aria-label={`${caption}. Use the arrow keys to read each value.`} {...pick.group}>
        {data.map((d, i) => (
          <div key={d.key} className={'vb' + (i === pick.at ? ' on' : '')} title={`${d.title} · ${format(d.value)}`} {...pick.props(i)}>
            <i style={{ height: `${(d.value / max) * 100}%` }} data-zero={d.value === 0 || undefined} />
            <span>{i % every === 0 ? d.label : ''}</span>
          </div>
        ))}
      </div>
      <div className="sr-only" aria-live="polite">{pick.at >= 0 ? `${data[pick.at].title}: ${format(data[pick.at].value)}` : ''}</div>
      <DataTable caption={caption} unit={unit} data={data} format={format} />
    </figure>
  )
}

/** A single line over time, with the area under it. */
export function LineChart({ data, format, caption, unit }: { data: Datum[]; format: (v: number) => string; caption: string; unit: string }) {
  const pick = usePick(data.length)
  const n = data.length
  const max = Math.max(1, ...data.map((d) => d.value))
  const x = (i: number) => ((i + 0.5) / n) * 100
  const y = (v: number) => 100 - (v / max) * 92
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const every = thin(n)
  return (
    <figure className="chart">
      <div className="chart-read" aria-hidden="true">{readout(data, pick.at, format)}</div>
      <div className="line" role="group" aria-label={`${caption}. Use the arrow keys to read each value.`} {...pick.group}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={`${x(0)},100 ${pts} ${x(n - 1)},100`} />
          <polyline points={pts} vectorEffect="non-scaling-stroke" />
        </svg>
        {data.map((d, i) => (
          <div key={d.key} className={'lc' + (i === pick.at ? ' on' : '')} style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }} title={`${d.title} · ${format(d.value)}`} {...pick.props(i)}>
            <i style={{ top: `${y(d.value)}%` }} />
          </div>
        ))}
      </div>
      <div className="line-x" aria-hidden="true">{data.map((d, i) => <span key={d.key}>{i % every === 0 ? d.label : ''}</span>)}</div>
      <div className="sr-only" aria-live="polite">{pick.at >= 0 ? `${data[pick.at].title}: ${format(data[pick.at].value)}` : ''}</div>
      <DataTable caption={caption} unit={unit} data={data} format={format} />
    </figure>
  )
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Calendar heatmap: one column per week (Monday at the top), one cell per day, darker for more
 * study time. `days` starts on a Monday and ends today.
 */
export function Heatmap({ days, describe, summary }: { days: StudyHeatmapDay[]; describe: (d: StudyHeatmapDay) => string; summary: string }) {
  const [at, setAt] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  // the newest weeks are on the right: start there when the grid is wider than the screen
  useEffect(() => {
    if (box.current) box.current.scrollLeft = box.current.scrollWidth
  }, [days.length])
  const max = Math.max(1, ...days.map((d) => d.durationMs))
  const level = (ms: number) => (ms <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((ms / max) * 4))))
  const weeks: StudyHeatmapDay[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return (
    <figure className="chart">
      <div className="chart-read" aria-hidden="true">{at >= 0 && days[at] ? describe(days[at]) : <>&nbsp;</>}</div>
      <div className="heat-scroll" ref={box} tabIndex={0} role="img" aria-label={summary}>
        <div className="heat" onPointerLeave={() => setAt(-1)}>
          {['', 'Mon', '', 'Wed', '', 'Fri', '', ''].map((t, i) => <span key={'w' + i} className="hk">{t}</span>)}
          {weeks.map((w, wi) => {
            const first = w.find((d) => d.date.endsWith('-01'))
            return [
              <span key={'m' + wi} className="hm">{first ? MON[+first.date.slice(5, 7) - 1] : ''}</span>,
              ...Array.from({ length: 7 }, (_, di) => {
                const d = w[di]
                const i = wi * 7 + di
                return d
                  ? <i key={d.date} data-date={d.date} data-l={level(d.durationMs)} className={i === at ? 'on' : ''} title={describe(d)} onPointerEnter={() => setAt(i)} onClick={() => setAt(i)} />
                  : <i key={`x${wi}-${di}`} className="none" />
              }),
            ]
          })}
        </div>
      </div>
      <div className="heat-key" aria-hidden="true">Less{[0, 1, 2, 3, 4].map((l) => <i key={l} data-l={l} />)}More</div>
    </figure>
  )
}
