// Minimal IndexedDB wrapper.
//   v1: overrides (edited section content), kv (progress)
//   v2: + highlights, outbox (sync queue), conflicts — existing stores and rows are untouched;
//       row-level migration of v1 data happens in store.init (see migrate.ts).
//   v3: + studySessions (completed, immutable), activeStudySession (one row: the timer),
//       studyGoals — added beside the existing stores; nothing existing is read or rewritten.
//   v4: + studyQueue (one row per queue item), added the same way.
//   v5: + pyqUserState (one row per question the learner has flagged), added the same way.
//   v6: + revisionUnits, revisionEvents (immutable), recallAttempts (immutable), examTargets,
//       revisionPreferences (one row, id "default"), userDataEpoch (one row, key "current"),
//       added the same way. Nothing existing is read, rewritten or enrolled.
export const DB_NAME = 'upsc-notes'
export const DB_VERSION = 6
let dbp: Promise<IDBDatabase> | null = null

export function upgrade(db: IDBDatabase) {
  const need = (name: string, opts?: IDBObjectStoreParameters) => {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opts)
  }
  need('overrides', { keyPath: 'key' })
  need('kv')
  need('highlights', { keyPath: 'id' })
  need('outbox', { keyPath: 'id' })
  need('conflicts', { keyPath: 'id' })
  need('studySessions', { keyPath: 'id' })
  need('activeStudySession')
  need('studyGoals', { keyPath: 'id' })
  need('studyQueue', { keyPath: 'id' })
  need('pyqUserState', { keyPath: 'pyqId' })
  need('revisionUnits', { keyPath: 'id' })
  need('revisionEvents', { keyPath: 'id' })
  need('recallAttempts', { keyPath: 'id' })
  need('examTargets', { keyPath: 'id' })
  need('revisionPreferences', { keyPath: 'id' })
  need('userDataEpoch')
}

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => upgrade(req.result)
      req.onsuccess = () => {
        // another tab opening a newer version must not be blocked by this one
        req.result.onversionchange = () => req.result.close()
        resolve(req.result)
      }
      req.onerror = () => reject(req.error)
    })
  }
  return dbp
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        t.oncomplete = () => resolve((req ? req.result : undefined) as T)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export const db = {
  getAll: <T>(store: string) => tx<T[]>(store, 'readonly', (s) => s.getAll()),
  get: <T>(store: string, key: string) => tx<T | undefined>(store, 'readonly', (s) => s.get(key)),
  put: (store: string, value: unknown, key?: string) => tx(store, 'readwrite', (s) => void s.put(value, key)),
  putMany: (store: string, values: unknown[]) => tx(store, 'readwrite', (s) => values.forEach((v) => s.put(v))),
  del: (store: string, key: string) => tx(store, 'readwrite', (s) => void s.delete(key)),
  delMany: (store: string, keys: string[]) => tx(store, 'readwrite', (s) => keys.forEach((k) => s.delete(k))),
  /** Empty whole stores in one transaction (personal data reset). */
  clear: (stores: string[]) =>
    open().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const names = stores.filter((s) => db.objectStoreNames.contains(s))
          if (!names.length) return resolve()
          const t = db.transaction(names, 'readwrite')
          for (const s of names) t.objectStore(s).clear()
          t.oncomplete = () => resolve()
          t.onerror = () => reject(t.error)
          t.onabort = () => reject(t.error)
        }),
    ),
  /** Several stores in one transaction: either every row is written or none is. */
  putAll: (rows: { store: string; value: unknown; key?: string }[]) =>
    open().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const t = db.transaction([...new Set(rows.map((r) => r.store))], 'readwrite')
          for (const r of rows) t.objectStore(r.store).put(r.value, r.key)
          t.oncomplete = () => resolve()
          t.onerror = () => reject(t.error)
          t.onabort = () => reject(t.error)
        }),
    ),
}
