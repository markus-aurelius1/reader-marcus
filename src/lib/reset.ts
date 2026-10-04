// Personal data reset, and this device's side of the reset epoch (rules: lib/epoch.ts).
// docs/READER_V2_REVISION_CONTRACT.md → Reset.
//
// A reset is local-first like everything else: the data is gone from this device at once, online
// or not. When the device is linked to an account the reset is also queued; the next sync raises
// the account's epoch, which is what makes every other device drop the same data instead of
// uploading it again.
//
// Never touched, by either scope: the notes, the static PYQ corpus, the taxonomy, cross-links —
// none of that is personal data and none of it lives in the stores a reset clears.
import { db } from './db'
import { deviceId, dropQueued, kindAdapters, storeHooks, syncLocal, useStore, wipeStore } from './store'
import type { ResetScope } from './contract'
import { emptyEpoch, groupOf, kindsOf, resetGroups, type EpochDoc, type Group, type PendingReset, type ResetOptions } from './epoch'

interface EpochState {
  doc: EpochDoc
  /** A reset made here that the cloud has not been told about. */
  pending?: PendingReset | null
  /** The cloud's leftovers of the last reset have not been deleted yet. */
  wipeDue?: boolean
  /** Not tied to an account's epoch: the next sync adopts the cloud's without dropping anything. */
  unbound?: boolean
}
let state: EpochState = { doc: emptyEpoch() }
const save = () => db.put('userDataEpoch', state, 'current')

/** Replaceable in tests. */
export const clock = { now: () => Date.now() }
export const localEpoch = () => state.doc

export async function initReset(): Promise<void> {
  try {
    state = (await db.get<EpochState>('userDataEpoch', 'current')) ?? { doc: emptyEpoch() }
  } catch (e) {
    console.error('[reset] IndexedDB unavailable; the reset epoch will not persist', e)
  }
}

/** Remove these groups from this device: on screen, in IndexedDB and in the sync queue. */
async function purge(groups: Group[]) {
  if (!groups.length) return
  await dropQueued(kindsOf(groups))
  for (const [kind, adapter] of kindAdapters()) if (groups.includes(groupOf(kind)!)) await adapter.wipe?.()
  await wipeStore(groups)
  if (groups.includes('study')) {
    try {
      localStorage.removeItem('upsc-revision-run')
    } catch {
      /* storage unavailable */
    }
  }
}

syncLocal.epoch = {
  doc: () => state.doc,
  unbound: () => !!state.unbound,
  pending: () => state.pending ?? null,
  async adopt(cloud, stale) {
    await purge(stale)
    state = { ...state, doc: cloud, unbound: false }
    await save()
  },
  async committed(doc) {
    state = { doc, wipeDue: true }
    await save()
  },
  wipeDue: () => !!state.wipeDue,
  async wiped() {
    state = { ...state, wipeDue: false }
    await save()
  },
}
// a different account has its own epoch: start from whatever its cloud says
storeHooks.onRebind = () => {
  state = { doc: emptyEpoch(), unbound: true }
  void save()
}

/** This device is, or has been, linked to an account: a reset has to reach the cloud. */
const linked = async () => !!(await db.get<string>('kv', 'syncUid').catch(() => undefined))

/**
 * Reset. The selected personal data is removed here immediately. Linked to an account, the reset
 * waits in `pending` until the next sync raises the cloud epoch; local-only, the epoch is raised
 * here and now by the same rule.
 */
export async function resetPersonalData(scope: ResetScope, options: ResetOptions = {}): Promise<Group[]> {
  const groups = resetGroups(scope, options)
  const at = new Date(clock.now()).toISOString()
  if (useStore.getState().editMode) useStore.getState().set({ editMode: false })
  await purge(groups)
  if ((await linked()) && !state.unbound) {
    // a reset already waiting is widened, not replaced
    const merged = [...new Set([...(state.pending?.groups ?? []), ...groups])]
    state = { ...state, pending: { scope: state.pending?.scope === 'full-personal' ? 'full-personal' : scope, groups: merged, at } }
  } else {
    const epoch = state.doc.epoch + 1
    state = { ...state, doc: { epoch, floors: { ...state.doc.floors, ...Object.fromEntries(groups.map((g) => [g, epoch])) }, resetAt: at, resetScope: scope, updatedAt: at } }
  }
  await save()
  syncLocal.markDirty('pref~main') // wakes the sync; the reset itself goes first
  return groups
}

/** Everything personal on this device, as one JSON file. A copy to keep before a reset. */
export async function exportBackup() {
  const stores = ['overrides', 'highlights', 'kv', 'studySessions', 'activeStudySession', 'studyGoals', 'studyQueue', 'pyqUserState', 'revisionUnits', 'revisionEvents', 'recallAttempts', 'examTargets', 'revisionPreferences', 'currentAffairsDays', 'currentAffairsEntries']
  const data: Record<string, unknown> = {}
  for (const s of stores) data[s] = s === 'kv' ? { progress: await db.get('kv', 'progress') } : await db.getAll(s).catch(() => [])
  const body = { app: 'upsc-notes-reader', exportedAt: new Date(clock.now()).toISOString(), deviceId, epoch: state.doc.epoch, preferences: useStore.getState().prefs, data }
  const { download } = await import('./export')
  download(`upsc-notes-backup-${body.exportedAt.slice(0, 10)}.json`, JSON.stringify(body, null, 1), 'application/json')
}
