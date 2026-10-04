// The learner's own flags on previous-year questions: seen, revised, difficult.
// Local-first like the rest of the reader: a flag updates the screen, is written to IndexedDB
// (pyqUserState) and queued for sync as pyq~<pyqId>, merged field by field across devices.
// Only these flags are stored or uploaded — the questions themselves are static content.
import { create } from 'zustand'
import { db } from './db'
import { deviceId, markDirty, registerKind, type KindAdapter } from './store'
import { keyOf, type Field } from '../sync/merge'
import type { PyqUserState } from './contract'
import type { PyqFlags } from './pyq'

/** A stored row: the contract's state plus the field timestamps the merge needs. */
export interface PyqRow extends PyqUserState {
  st: Record<string, [number, string]>
}
const FIELDS = ['seen', 'revised', 'difficult'] as const
export type PyqFlagName = (typeof FIELDS)[number]

export const usePyq = create<{ ready: boolean; rows: Record<string, PyqRow> }>(() => ({ ready: false, rows: {} }))

/** Replaceable in tests. */
export const clock = { now: () => Date.now() }
let boot: Promise<void> | null = null

// Other tabs of this browser share the database: tell them to re-read it.
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window && import.meta.env.MODE !== 'test' ? new BroadcastChannel('upsc-pyq') : null
const saved = (p: Promise<unknown>) => p.then(() => channel?.postMessage(1)).catch((e) => console.error('[pyq] save failed', e))

async function load() {
  const rows = await db.getAll<PyqRow>('pyqUserState')
  usePyq.setState({ rows: Object.fromEntries(rows.map((r) => [r.pyqId, r])), ready: true })
}
channel?.addEventListener('message', () => void load().catch(() => {}))

export function initPyqState(): Promise<void> {
  return (boot ??= load().catch((e) => {
    console.error('[pyq] IndexedDB unavailable; PYQ flags will not persist', e)
    usePyq.setState({ ready: true })
  }))
}

/** Set or clear flags on one question. */
export function setPyqFlags(pyqId: string, patch: PyqFlags) {
  const s = usePyq.getState()
  const prev = s.rows[pyqId]
  const now = clock.now()
  const st = { ...prev?.st }
  const row: PyqRow = { ...prev, pyqId, updatedAt: new Date(now).toISOString(), st }
  let changed = false
  for (const f of FIELDS) {
    if (!(f in patch) || !!patch[f] === !!prev?.[f]) continue
    if (patch[f]) row[f] = true
    else delete row[f]
    st[f] = [now, deviceId]
    changed = true
  }
  if (!changed) return
  usePyq.setState({ rows: { ...s.rows, [pyqId]: row } })
  saved(db.put('pyqUserState', row))
  markDirty(`pyq~${pyqId}`)
}

/** Any flag currently set on any question. */
export const hasPyqState = (rows: Record<string, PyqRow>) => Object.values(rows).some((r) => r.seen || r.revised || r.difficult)

// ---- sync adapter -------------------------------------------------------------
const adapter: KindAdapter = {
  get(id) {
    const row = usePyq.getState().rows[keyOf(id)]
    if (!row?.st) return null
    const f: Record<string, Field> = {}
    for (const name of FIELDS) if (row.st[name]) f[name] = { v: row[name] ?? null, t: row.st[name][0], d: row.st[name][1] }
    const times = Object.values(f).map((x) => x.t)
    return times.length ? { id, kind: 'pyq', t: Math.max(...times), dev: deviceId, f } : null
  },

  apply(rec) {
    const s = usePyq.getState()
    const pyqId = keyOf(rec.id)
    const prev = s.rows[pyqId]
    const row: PyqRow = { ...prev, pyqId, updatedAt: new Date(rec.t).toISOString(), st: { ...prev?.st } }
    for (const [name, fld] of Object.entries(rec.f ?? {})) {
      const f = FIELDS.find((x) => x === name)
      if (!f) continue
      if (fld.v) row[f] = true
      else delete row[f]
      row.st[f] = [fld.t, fld.d]
    }
    usePyq.setState({ rows: { ...s.rows, [pyqId]: row } })
    saved(db.put('pyqUserState', row))
  },

  ids: () => Object.keys(usePyq.getState().rows).map((k) => `pyq~${k}`),
}
registerKind('pyq', adapter)
