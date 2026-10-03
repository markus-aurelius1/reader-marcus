// Minimal IndexedDB wrapper.
//   v1: overrides (edited section content), kv (progress)
//   v2: + highlights, outbox (sync queue), conflicts — existing stores and rows are untouched;
//       row-level migration of v1 data happens in store.init (see migrate.ts).
//   v3: + studySessions (completed, immutable), activeStudySession (one row: the timer),
//       studyGoals — added beside the existing stores; nothing existing is read or rewritten.
//   v4: + studyQueue (one row per queue item), added the same way.
export const DB_NAME = 'upsc-notes'
export const DB_VERSION = 4
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
