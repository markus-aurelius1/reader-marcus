// Firebase backend: Google sign-in + one Firestore document per synced record:
//   users/{uid}/state/{docId}               edits, highlights, progress, preferences
//   users/{uid}/studySessions/{sessionId}   completed study sessions (create-only)
//   users/{uid}/studyRuntime/active         the one active timer
//   users/{uid}/studyGoals/default          study goals
//   users/{uid}/studyQueue/{itemId}         study-queue items
//   users/{uid}/pyqState/{pyqId}            the learner's flags on a PYQ (never the PYQ itself)
//   users/{uid}/revisionUnits/{id}          scheduling state of one revision unit
//   users/{uid}/revisionEvents/{id}         completed revisions (create-only)
//   users/{uid}/recallAttempts/{id}         recall answers (create-only)
//   users/{uid}/examTargets/{id}            exam targets
//   users/{uid}/revisionPreferences/default revision preferences
//   users/{uid}/currentAffairsDays/{dayId}  completion state of one Current Affairs day
//   users/{uid}/currentAffairsEntries/{id}  Current Affairs notes (their text is an edit in state/)
//   users/{uid}/meta/dataEpoch              the reset epoch (lib/epoch.ts)
// Loaded lazily — only after the user chooses to sign in.
import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { Timestamp, collection, doc, getDocs, getFirestore, orderBy, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore/lite'
import type { Backend } from './index'
import type { Remote } from './engine'
import { keyOf, kindOf, type Rec } from './merge'
import { isStale } from '../lib/epoch'

const env = import.meta.env

// Firestore document ids cannot contain "/".
const enc = (id: string) => id.replace(/\//g, '|')
// Firestore rejects `undefined`; a JSON round-trip drops it.
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const STUDY: Record<string, string> = { ses: 'studySessions', run: 'studyRuntime', goal: 'studyGoals', q: 'studyQueue', pyq: 'pyqState', ru: 'revisionUnits', rev: 'revisionEvents', ra: 'recallAttempts', exam: 'examTargets', rpref: 'revisionPreferences', cad: 'currentAffairsDays', cae: 'currentAffairsEntries' }
/** Firestore allows 500 writes in one batch. */
const BATCH = 400
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
      // study records each have a collection of their own, keyed by the record's key
      const study = Object.fromEntries(Object.entries(STUDY).map(([kind, name]) => [kind, collection(store, 'users', uid, name)]))
      // the reset epoch lives apart and is never part of a pull: the engine reads it by id
      const meta = collection(store, 'users', uid, 'meta')
      const refOf = (id: string) => (kindOf(id) === 'meta' ? doc(meta, keyOf(id)) : study[kindOf(id)] ? doc(study[kindOf(id)], enc(keyOf(id))) : doc(col, enc(id)))
      return {
        async pull(cursor) {
          const since = Timestamp.fromMillis(cursor)
          const snaps = await Promise.all([col, ...Object.values(study)].map((c) => getDocs(query(c, where('st', '>', since), orderBy('st')))))
          let max = cursor
          const recs: Rec[] = []
          for (const snap of snaps) {
            snap.forEach((d) => {
              const { st, ...rec } = d.data() as Rec & { st?: Timestamp }
              if (st) max = Math.max(max, st.toMillis() - OVERLAP_MS)
              recs.push(rec as Rec)
            })
          }
          return { recs, cursor: max }
        },
        async transact(id, fn) {
          const ref = refOf(id)
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
        // After a reset: delete what it left behind. Only records written before their group's
        // floor are touched, so running it again — or late — can never remove newer data.
        async wipe(epoch) {
          for (const c of [col, ...Object.values(study)]) {
            const snap = await getDocs(c)
            const stale = snap.docs.filter((d) => isStale(d.data() as Rec, epoch))
            for (let i = 0; i < stale.length; i += BATCH) {
              const batch = writeBatch(store)
              stale.slice(i, i + BATCH).forEach((d) => batch.delete(d.ref))
              await batch.commit()
            }
          }
        },
      }
    },

    // The active timer is the one record worth hearing about at once. The listener only reports
    // that it changed; the change itself arrives through the normal pull, so there is one code
    // path for applying cloud state. The streaming SDK is loaded for this alone.
    watch(uid, cb) {
      let off = () => {}
      let closed = false
      import('firebase/firestore')
        .then((fs) => {
          if (closed) return
          off = fs.onSnapshot(
            fs.doc(fs.getFirestore(app), 'users', uid, 'studyRuntime', 'active'),
            (snap) => cb((snap.data() as Rec | undefined)?.rev),
            (e) => console.warn('[sync] timer listener stopped; periodic sync continues', e),
          )
        })
        .catch((e) => console.warn('[sync] timer listener unavailable; periodic sync continues', e))
      return () => {
        closed = true
        off()
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
