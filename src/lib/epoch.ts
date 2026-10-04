// Reset epochs. Pure rules; the state lives in lib/reset.ts and the sync engine applies them.
// docs/READER_V2_REVISION_CONTRACT.md → Reset.
//
// A reset wipes groups of personal data. Wiping only this device would not be enough: another
// device that was offline still holds the old data and would upload it again. So every reset
// raises the account's epoch, and records for each wiped group the epoch at which it was wiped
// (its floor). From then on:
//
//   a device whose epoch is lower than a group's floor   → drops that group locally, and its
//                                                          queued changes, before it syncs
//   a cloud record written before its group's floor      → is ignored, as if it were not there
//   a record is pushed with the epoch of the device      → a stale write is inert everywhere
import type { ResetScope, UserDataEpoch } from './contract'
import type { Kind, Rec } from '../sync/merge'

export type Group = 'study' | 'flags' | 'goals' | 'notes' | 'favourites' | 'exams' | 'settings'
export const GROUPS: Group[] = ['study', 'flags', 'goals', 'notes', 'favourites', 'exams', 'settings']
export const EPOCH_ID = 'meta~dataEpoch'

/** The cloud document users/{uid}/meta/dataEpoch, and its local copy. */
export interface EpochDoc extends UserDataEpoch {
  /** group → the epoch at which it was last wiped. */
  floors: Partial<Record<Group, number>>
}
export interface PendingReset {
  scope: ResetScope
  groups: Group[]
  at: string
}
export interface ResetOptions {
  keepExamTargets?: boolean
  keepSettings?: boolean
}

/**
 * Which group a synced record belongs to. Three things live inside a record of another group and
 * are handled field by field (store.wipeStore): the ★ Difficult / ↻ Revise flags of `sec~…`
 * (group "flags": kept by a study-history reset, removed by a full one), and the favourites and
 * recent destinations of `pref~main`.
 */
const GROUP_OF: Record<Exclude<Kind, 'meta'>, Group> = {
  sec: 'study', chap: 'study', ses: 'study', run: 'study', q: 'study', pyq: 'study', ru: 'study', rev: 'study', ra: 'study',
  goal: 'goals',
  edit: 'notes', hl: 'notes',
  exam: 'exams',
  pref: 'settings', rpref: 'settings',
}
export const groupOf = (kind: Kind): Group | null => (kind === 'meta' ? null : GROUP_OF[kind])
export const kindsOf = (groups: Group[]) => (Object.keys(GROUP_OF) as Exclude<Kind, 'meta'>[]).filter((k) => groups.includes(GROUP_OF[k]))

/** What each reset removes. Imported notes, static PYQs, taxonomy and cross-links are never personal data. */
export function resetGroups(scope: ResetScope, o: ResetOptions = {}): Group[] {
  if (scope === 'study-history') return ['study']
  return ['study', 'flags', 'goals', 'notes', 'favourites', ...(o.keepExamTargets === false ? (['exams'] as Group[]) : []), ...(o.keepSettings === false ? (['settings'] as Group[]) : [])]
}

export const emptyEpoch = (): EpochDoc => ({ epoch: 0, floors: {}, updatedAt: new Date(0).toISOString() })
const floorOf = (d: EpochDoc | null | undefined, g: Group) => d?.floors?.[g] ?? 0

/** The epoch after a reset: one higher, with the wiped groups' floors raised to it. */
export function bumped(cur: EpochDoc | null | undefined, reset: PendingReset, nowIso: string): EpochDoc {
  const epoch = (cur?.epoch ?? 0) + 1
  return { epoch, floors: { ...cur?.floors, ...Object.fromEntries(reset.groups.map((g) => [g, epoch])) }, resetAt: reset.at, resetScope: reset.scope, updatedAt: nowIso }
}

/** Groups a device at `localEpoch` must drop to catch up with the cloud: those wiped after it last looked. */
export const staleGroups = (localEpoch: number, cloud: EpochDoc | null | undefined): Group[] => GROUPS.filter((g) => floorOf(cloud, g) > localEpoch)

/** A cloud record written before its group was last wiped: treated as absent. */
export function isStale(rec: Rec | null | undefined, doc: EpochDoc | null | undefined): boolean {
  if (!rec) return false
  const g = groupOf(rec.kind)
  return !!g && (rec.ep ?? 0) < floorOf(doc, g)
}

export const epochRec = (doc: EpochDoc, dev: string): Rec => ({ id: EPOCH_ID, kind: 'meta', t: Date.parse(doc.updatedAt), dev, data: doc as unknown as Record<string, unknown> })
export const epochOf = (rec: Rec | null | undefined): EpochDoc | null => (rec?.kind === 'meta' && rec.data ? (rec.data as unknown as EpochDoc) : null)
