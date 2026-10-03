// Sync controller: owns sign-in state, decides when to run the engine, reports status.
// The reader never waits on it — every mutation is already saved locally and queued.
import { create } from 'zustand'
import { syncHooks, syncLocal } from '../lib/store'
import { resolveConflict, syncOnce, type Remote } from './engine'

export interface SyncUser {
  uid: string
  name: string
  email: string
  photo?: string
}
export interface Backend {
  remote(uid: string): Remote
  onUser(cb: (u: SyncUser | null) => void): void
  signIn(): Promise<void>
  signOut(): Promise<void>
}
export type Phase = 'local' | 'syncing' | 'synced' | 'offline' | 'error'

const env = import.meta.env
const mockUrl = env.VITE_SYNC_MOCK as string | undefined
export const configured = !!(mockUrl || (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID))
const FLAG = 'upsc-sync' // set once the user chooses to sign in; local-only users never load the SDK

export interface SyncState {
  user: SyncUser | null
  phase: Phase
  pending: number
  lastSync: number
  error: string
  busy: boolean // sign-in / sign-out in progress
}
export const useSync = create<SyncState>(() => ({ user: null, phase: 'local', pending: 0, lastSync: 0, error: '', busy: false }))

let backend: Promise<Backend> | null = null
let remote: Remote | null = null
let running = false
let again = false
let timer = 0
let dueAt = 0
let backoff = 0

function loadBackend(): Promise<Backend> {
  if (!backend) {
    // written against import.meta.env directly so normal builds drop the mock branch entirely
    const load: Promise<Backend> = import.meta.env.VITE_SYNC_MOCK
      ? import('./mock').then((m) => m.createMockBackend(import.meta.env.VITE_SYNC_MOCK))
      : import('./firebase').then((m) => m.createFirebaseBackend())
    backend = load.then((b) => {
      b.onUser(onUser)
      return b
    })
  }
  return backend
}

const refreshPending = () => useSync.setState({ pending: Math.max(0, syncLocal.pending() - syncLocal.conflicts().size) })

async function onUser(user: SyncUser | null) {
  if (!user) {
    remote = null
    clearTimeout(timer)
    dueAt = 0
    useSync.setState({ user: null, phase: 'local', error: '' })
    return
  }
  // First sign-in on this device (or a different account): nothing local is replaced — every
  // local record is queued and reconciled against the cloud one by one.
  await syncLocal.rebind(user.uid)
  remote = (await backend!).remote(user.uid)
  useSync.setState({ user })
  refreshPending()
  run()
}

const isNetworkError = (e: unknown) => {
  const text = `${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`
  return !navigator.onLine || e instanceof TypeError || /unavailable|network|deadline|offline|failed to fetch/i.test(text)
}

function schedule(ms: number) {
  const at = Date.now() + ms
  if (dueAt && dueAt <= at) return
  clearTimeout(timer)
  dueAt = at
  timer = window.setTimeout(() => {
    dueAt = 0
    run()
  }, ms)
}

async function run() {
  if (!remote) return
  if (running) {
    again = true
    return
  }
  if (!navigator.onLine) {
    useSync.setState({ phase: 'offline' })
    return
  }
  running = true
  useSync.setState({ phase: 'syncing', error: '' })
  try {
    do {
      again = false
      await syncOnce(remote, syncLocal)
    } while (again && remote)
    backoff = 0
    useSync.setState({ phase: 'synced', lastSync: Date.now() })
  } catch (e) {
    const offline = isNetworkError(e)
    if (!offline) console.error('[sync]', e)
    useSync.setState({ phase: offline ? 'offline' : 'error', error: offline ? '' : String((e as Error)?.message ?? e) })
    backoff = Math.min(60000, backoff ? backoff * 2 : 5000)
    schedule(backoff)
  } finally {
    running = false
    refreshPending()
  }
}

export function initSync() {
  syncHooks.onDirty = (lazy) => {
    refreshPending()
    if (remote) schedule(lazy ? 20000 : 2000)
  }
  syncHooks.onConflicts = refreshPending
  refreshPending()
  window.addEventListener('online', () => run())
  window.addEventListener('offline', () => remote && useSync.setState({ phase: 'offline' }))
  document.addEventListener('visibilitychange', () => {
    if (!remote) return
    if (document.visibilityState === 'hidden') {
      if (syncLocal.pending()) run()
    } else if (Date.now() - useSync.getState().lastSync > 30000) schedule(300)
  })
  window.setInterval(() => remote && document.visibilityState === 'visible' && run(), 120000)
  let on = false
  try {
    on = localStorage.getItem(FLAG) === '1'
  } catch {
    /* storage unavailable: stay local */
  }
  if (configured && on) loadBackend().catch((e) => console.error('[sync] could not start', e))
}

export async function signIn() {
  if (!configured) return
  useSync.setState({ busy: true, error: '' })
  try {
    localStorage.setItem(FLAG, '1')
    await (await loadBackend()).signIn()
  } catch (e) {
    useSync.setState({ error: String((e as Error)?.message ?? e) })
  } finally {
    useSync.setState({ busy: false })
  }
}

/** Sign out. Local notes, edits, highlights and progress stay on this device. */
export async function signOutUser() {
  useSync.setState({ busy: true })
  try {
    localStorage.removeItem(FLAG)
    await (await loadBackend()).signOut()
  } finally {
    useSync.setState({ busy: false })
  }
}

export const syncNow = () => run()

export function resolve(id: string, keep: 'local' | 'cloud') {
  resolveConflict(syncLocal, id, keep)
  refreshPending()
  run()
}

/** One line for the account control. */
export function statusLabel(s: SyncState, conflicts: number): string {
  if (!configured || !s.user) return 'Local only'
  if (conflicts) return 'Conflict'
  if (s.phase === 'offline') return s.pending ? 'Offline — changes queued' : 'Offline'
  if (s.phase === 'syncing') return 'Syncing…'
  if (s.phase === 'error') return 'Sync paused — will retry'
  return 'Synced'
}
