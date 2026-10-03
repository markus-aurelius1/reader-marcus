// Firebase backend: Google sign-in + one Firestore document per synced record under
// users/{uid}/state/{docId}. Loaded lazily — only after the user chooses to sign in.
import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { Timestamp, collection, doc, getDocs, getFirestore, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore/lite'
import type { Backend } from './index'
import type { Remote } from './engine'
import type { Rec } from './merge'

const env = import.meta.env

// Firestore document ids cannot contain "/".
const enc = (id: string) => id.replace(/\//g, '|')
// Firestore rejects `undefined`; a JSON round-trip drops it.
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v))
/** Commit times of concurrent writers can land slightly out of order; re-read a short window. */
const OVERLAP_MS = 5000

export function createFirebaseBackend(): Backend {
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  const auth = getAuth(app) // session is kept in IndexedDB, so sign-in survives offline restarts
  const store = getFirestore(app)

  return {
    remote(uid): Remote {
      const col = collection(store, 'users', uid, 'state')
      return {
        async pull(cursor) {
          const snap = await getDocs(query(col, where('st', '>', Timestamp.fromMillis(cursor)), orderBy('st')))
          let max = cursor
          const recs: Rec[] = []
          snap.forEach((d) => {
            const { st, ...rec } = d.data() as Rec & { st?: Timestamp }
            if (st) max = Math.max(max, st.toMillis() - OVERLAP_MS)
            recs.push(rec as Rec)
          })
          return { recs, cursor: max }
        },
        async transact(id, fn) {
          const ref = doc(col, enc(id))
          await runTransaction(store, async (tx) => {
            const snap = await tx.get(ref)
            let cur: Rec | null = null
            if (snap.exists()) {
              const { st: _st, ...rec } = snap.data() as Rec & { st?: unknown }
              cur = rec as Rec
            }
            const out = fn(cur)
            if (out) tx.set(ref, { ...plain(out), st: serverTimestamp() })
          })
        },
      }
    },

    onUser(cb) {
      getRedirectResult(auth).catch((e) => console.error('[sync] redirect sign-in failed', e))
      onAuthStateChanged(auth, (u) =>
        cb(u ? { uid: u.uid, name: u.displayName ?? u.email ?? 'Signed in', email: u.email ?? '', photo: u.photoURL ?? undefined } : null),
      )
    },

    async signIn() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        await signInWithPopup(auth, provider)
      } catch (e) {
        const code = (e as { code?: string }).code ?? ''
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
        // installed PWAs and some mobile browsers cannot open popups
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, provider)
        throw e
      }
    },

    signOut: () => signOut(auth),
  }
}
