// Sync engine: pull what changed in the cloud, then push the local queue.
// Storage and transport are injected, so the same engine runs against Firestore, the
// development mock cloud and the in-memory fakes used by the tests.
import { isFieldKind, kindOf, mergeFields, reconcile, type Decision, type Rec } from './merge'
import type { Env } from '../lib/timer'
import { EPOCH_ID, bumped, epochOf, epochRec, isStale, staleGroups, type EpochDoc, type Group, type PendingReset } from '../lib/epoch'

export interface Remote {
  /** Records changed after `cursor` (server time, ms). */
  pull(cursor: number): Promise<{ recs: Rec[]; cursor: number }>
  /** Atomic read-modify-write of one record. `fn` may run more than once; returning a record writes it. */
  transact(id: string, fn: (remote: Rec | null) => Rec | null): Promise<void>
  /** Delete the cloud records a reset left behind (those written before their group's floor). */
  wipe?(doc: EpochDoc): Promise<void>
}

/** This device's side of the reset epoch (lib/epoch.ts, lib/reset.ts). */
export interface EpochLocal {
  doc(): EpochDoc
  /** Not yet tied to this account's epoch (first sign-in): adopt the cloud's without dropping anything. */
  unbound(): boolean
  /** A reset made on this device that the cloud has not heard of. */
  pending(): PendingReset | null
  /** The cloud is ahead: drop these groups here, and their queued changes, then take its epoch. */
  adopt(cloud: EpochDoc, stale: Group[]): Promise<void>
  /** This device's reset is now the cloud's epoch. */
  committed(doc: EpochDoc): Promise<void>
  wipeDue(): boolean
  wiped(): Promise<void>
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
  epoch?: EpochLocal
}

export interface SyncResult {
  pulled: number
  pushed: number
  conflicts: number
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
/** edit / run: the local copy remembers which cloud revision it was based on. */
const tracksRev = (id: string) => kindOf(id) === 'edit' || kindOf(id) === 'run'

export async function syncOnce(remote: Remote, local: Local, retries = 2): Promise<SyncResult> {
  const res: SyncResult = { pulled: 0, pushed: 0, conflicts: 0 }
  const env = local.env?.()

  // 0 — the reset epoch comes first: stale data is dropped before anything is exchanged.
  const ep = local.epoch
  if (ep) {
    let cloud: EpochDoc | null = null
    await remote.transact(EPOCH_ID, (r) => {
      cloud = epochOf(r)
      return null
    })
    const seen = cloud as EpochDoc | null
    const pending = ep.pending()
    if (ep.unbound()) await ep.adopt(seen ?? { epoch: 0, floors: {}, updatedAt: new Date(0).toISOString() }, [])
    // The cloud was reset since this device last looked: what it wiped is dropped here too.
    // Groups this device has itself just reset are already clean.
    else if (seen && seen.epoch > ep.doc().epoch) await ep.adopt(seen, staleGroups(ep.doc().epoch, seen).filter((g) => !pending?.groups.includes(g)))
    if (pending) {
      let next: EpochDoc | null = null
      const at = new Date(env?.now ?? Date.now()).toISOString()
      await remote.transact(EPOCH_ID, (r) => epochRec((next = bumped(epochOf(r), pending, at)), env?.dev ?? ''))
      await ep.committed(next!)
    }
    if (ep.wipeDue()) {
      await remote.wipe?.(ep.doc())
      await ep.wiped()
    }
  }
  const epoch = ep?.doc() ?? null
  let ahead = false
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
    if (r.kind === 'meta' || isStale(r, epoch)) continue // the epoch itself; leftovers of a reset
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
    } else if (r.kind === 'cad') {
      // a news day is merged by rule even when nothing is queued here
      const d = reconcile(mine, r, { dirty: false, env })
      if (d.type === 'pull') applyPull(d)
      else if (d.type === 'both') {
        local.apply(d.rec)
        res.pulled++
        local.markDirty(r.id)
      } else if (d.type === 'push') local.markDirty(r.id)
    } else if (r.kind === 'rev' || r.kind === 'ra') {
      // immutable history: a copy already here is never replaced
      if (!mine) {
        local.apply(r)
        res.pulled++
      }
    } else if (!mine || !same({ ...mine, t: 0, dev: '', ep: 0 }, { ...r, t: 0, dev: '', ep: 0 })) {
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
    await remote.transact(id, (found) => {
      const cloud = isStale(found, epoch) ? null : found // written before a reset: as good as absent
      // a record from a later epoch means a reset happened that this device has not applied yet
      if (epoch && cloud && (cloud.ep ?? 0) > epoch.epoch) {
        ahead = true
        return null
      }
      cloudRev = cloud?.rev
      decision = reconcile(local.get(id), cloud, { dirty: true, synced: local.synced(id), env })
      if (decision.type !== 'push' && decision.type !== 'both') return null
      return epoch?.epoch ? { ...decision.rec, ep: epoch.epoch } : decision.rec
    })
    if (ahead) break
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
  if (ahead && retries > 0) return syncOnce(remote, local, retries - 1)
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
