// Pure merge / conflict rules for cross-device sync. No I/O, no UI — unit-tested in merge.test.ts.
//
// One cloud document per independent piece of user state:
//   edit~<sectionKey>   edited heading/body of one section        → conflict-checked
//   hl~<highlightId>    one highlight                             → newest wins, tombstones
//   sec~<sectionKey>    done / difficult / revise                 → merged field by field
//   chap~<chapterKey>   status / scroll / section / at            → merged field by field
//   pref~main           theme / recall / collapsed                → merged field by field

export type Kind = 'edit' | 'hl' | 'sec' | 'chap' | 'pref'

export interface Field {
  v: unknown
  t: number
  d: string // device that wrote it — deterministic tie-break
}

export interface Rec {
  id: string
  kind: Kind
  t: number // last local modification time (ms)
  dev: string
  rev?: string // edit: identity of this content version
  del?: boolean // edit / hl: tombstone
  data?: Record<string, unknown> // edit: { title, html } · hl: anchor + colour
  f?: Record<string, Field> // sec / chap / pref
}

export type Decision =
  | { type: 'noop' }
  | { type: 'push'; rec: Rec } // write local to cloud
  | { type: 'pull'; rec: Rec } // write cloud to local
  | { type: 'both'; rec: Rec } // merged result differs from both sides
  | { type: 'conflict'; remote: Rec } // keep both; the user decides

export const kindOf = (id: string) => id.slice(0, id.indexOf('~')) as Kind
export const keyOf = (id: string) => id.slice(id.indexOf('~') + 1)
export const isFieldKind = (k: Kind) => k === 'sec' || k === 'chap' || k === 'pref'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const newer = (at: number, ad: string, bt: number, bd: string) => at > bt || (at === bt && ad > bd)

/** Field-by-field newest-wins merge; independent fields from two devices both survive. */
export function mergeFields(local: Rec | null, remote: Rec | null): { rec: Rec; localChanged: boolean; remoteChanged: boolean } {
  const base = (local ?? remote)!
  const out: Record<string, Field> = {}
  let localChanged = false
  let remoteChanged = false
  const names = new Set([...Object.keys(local?.f ?? {}), ...Object.keys(remote?.f ?? {})])
  for (const n of names) {
    const l = local?.f?.[n]
    const r = remote?.f?.[n]
    const pickLocal = !r || (!!l && (newer(l.t, l.d, r.t, r.d) || (l.t === r.t && l.d === r.d)))
    out[n] = pickLocal ? l! : r
    if (!pickLocal && (!l || !same(l.v, r.v) || l.t !== r.t)) localChanged = true
    if (pickLocal && (!r || !same(l!.v, r.v) || l!.t !== r.t)) remoteChanged = true
  }
  const t = Math.max(0, ...Object.values(out).map((x) => x.t))
  return { rec: { id: base.id, kind: base.kind, t, dev: base.dev, f: out }, localChanged, remoteChanged }
}

const sameContent = (a: Rec, b: Rec) => !!a.del === !!b.del && same(a.data ?? null, b.data ?? null)

/**
 * Decide what to do with one record.
 * `dirty`  — changed on this device since it last agreed with the cloud.
 * `synced` — (edits) the cloud `rev` this device's version was based on.
 */
export function reconcile(local: Rec | null, remote: Rec | null, ctx: { dirty: boolean; synced?: string | null }): Decision {
  if (!local && !remote) return { type: 'noop' }
  const kind = (local ?? remote)!.kind

  if (isFieldKind(kind)) {
    const m = mergeFields(local, remote)
    if (m.localChanged && m.remoteChanged) return { type: 'both', rec: m.rec }
    if (m.remoteChanged) return { type: 'push', rec: m.rec }
    if (m.localChanged) return { type: 'pull', rec: m.rec }
    return { type: 'noop' }
  }

  if (!remote) return local ? { type: 'push', rec: local } : { type: 'noop' }
  if (!local) return { type: 'pull', rec: remote }

  if (kind === 'hl') {
    if (sameContent(local, remote)) return { type: 'noop' }
    if (!ctx.dirty) return { type: 'pull', rec: remote }
    return newer(local.t, local.dev, remote.t, remote.dev) ? { type: 'push', rec: local } : { type: 'pull', rec: remote }
  }

  // kind === 'edit' — learner content: never drop a version silently
  if (local.rev === remote.rev || sameContent(local, remote)) return { type: 'noop' }
  if (!ctx.dirty) return { type: 'pull', rec: remote }
  if (remote.rev === ctx.synced) return { type: 'push', rec: local } // cloud unchanged since our base
  if (remote.del) return { type: 'push', rec: local } // other device only reset to the original text
  return { type: 'conflict', remote }
}
