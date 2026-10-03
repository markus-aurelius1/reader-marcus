// Sync engine: pull what changed in the cloud, then push the local queue.
// Storage and transport are injected, so the same engine runs against Firestore, the
// development mock cloud and the in-memory fakes used by the tests.
import { isFieldKind, kindOf, mergeFields, reconcile, type Decision, type Rec } from './merge'
import type { Env } from '../lib/timer'

export interface Remote {
  /** Records changed after `cursor` (server time, ms). */
  pull(cursor: number): Promise<{ recs: Rec[]; cursor: number }>
  /** Atomic read-modify-write of one record. `fn` may run more than once; returning a record writes it. */
  transact(id: string, fn: (remote: Rec | null) => Rec | null): Promise<void>
}

export interface Local {
  get(id: string): Rec | null
  synced(id: string): string | null | undefined
  /** Write a cloud/merged record into local state without queueing it. */
  apply(rec: Rec): void
  /** Record that the local edit now matches cloud revision `rev`. */
  markSynced(id: string, rev: string | undefined): void
  /** Queued record ids with the sequence number of their latest change. */
  dirty(): Map<string, number>
  /** Dequeue, unless the record changed again after `seq`. */
  clearDirty(id: string, seq: number): void
  markDirty(id: string): void
  cursor(): number
  setCursor(c: number): void
  conflicts(): Map<string, Rec>
  setConflict(id: string, remote: Rec | null): void
  /** Clock, device and timezone for records that are built while reconciling (study sessions). */
  env?(): Env
}

export interface SyncResult {
  pulled: number
  pushed: number
  conflicts: number
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
/** edit / run: the local copy remembers which cloud revision it was based on. */
const tracksRev = (id: string) => kindOf(id) === 'edit' || kindOf(id) === 'run'

export async function syncOnce(remote: Remote, local: Local): Promise<SyncResult> {
  const res: SyncResult = { pulled: 0, pushed: 0, conflicts: 0 }
  const env = local.env?.()
  const applyPull = (d: Extract<Decision, { type: 'pull' | 'both' }>) => {
    local.apply(d.rec)
    res.pulled++
    if (d.type !== 'pull') return
    for (const x of d.also ?? []) {
      local.apply(x) // local-only study time, split off as its own record
      local.markDirty(x.id)
    }
  }

  // 1 — pull. Records queued locally are left to the push step, which reconciles atomically.
  const { recs, cursor } = await remote.pull(local.cursor())
  const dirty = local.dirty()
  for (const r of recs) {
    if (local.conflicts().has(r.id)) {
      local.setConflict(r.id, r) // keep the conflict copy current
      continue
    }
    if (dirty.has(r.id)) continue
    const mine = local.get(r.id)
    if (isFieldKind(r.kind)) {
      const m = mergeFields(mine, r)
      if (m.localChanged) {
        local.apply(m.rec)
        res.pulled++
      }
      if (m.remoteChanged) local.markDirty(r.id)
    } else if (r.kind === 'ses' || r.kind === 'run') {
      const d = reconcile(mine, r, { dirty: false, env })
      if (d.type === 'pull') applyPull(d)
      else if (r.kind === 'run') local.markSynced(r.id, r.rev)
    } else if (!mine || !same({ ...mine, t: 0, dev: '' }, { ...r, t: 0, dev: '' })) {
      local.apply(r)
      res.pulled++
    } else if (r.kind === 'edit') local.markSynced(r.id, r.rev)
  }
  local.setCursor(cursor)

  // 2 — push the queue, one atomic transaction per record.
  for (const [id, seq] of local.dirty()) {
    if (local.conflicts().has(id)) continue // waits for the user's choice
    let decision: Decision = { type: 'noop' }
    let cloudRev: string | undefined
    await remote.transact(id, (cloud) => {
      cloudRev = cloud?.rev
      decision = reconcile(local.get(id), cloud, { dirty: true, synced: local.synced(id), env })
      return decision.type === 'push' || decision.type === 'both' ? decision.rec : null
    })
    const d = decision as Decision
    if (d.type === 'conflict') {
      local.setConflict(id, d.remote)
      continue
    }
    if (d.type === 'pull' || d.type === 'both') applyPull(d)
    if (d.type === 'push' || d.type === 'both') res.pushed++
    // the revision the cloud holds now — not the local one, which may have moved on meanwhile
    if (tracksRev(id)) local.markSynced(id, d.type === 'noop' ? cloudRev : d.rec.rev)
    local.clearDirty(id, seq)
  }
  res.conflicts = local.conflicts().size
  return res
}

/** Resolve an edit conflict. Neither version is lost until this is called. */
export function resolveConflict(local: Local, id: string, keep: 'local' | 'cloud') {
  const remote = local.conflicts().get(id)
  if (!remote) return
  if (keep === 'cloud') {
    const seq = local.dirty().get(id)
    local.apply(remote)
    local.markSynced(id, remote.rev)
    if (seq !== undefined) local.clearDirty(id, seq)
  } else {
    local.markSynced(id, remote.rev) // our version now supersedes that cloud revision
    local.markDirty(id)
  }
  local.setConflict(id, null)
}
