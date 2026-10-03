import { useState } from 'react'
import { Cloud, CloudOff, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import { sectionByKey } from '../lib/content'
import { secHtml, secTitle, useStore } from '../lib/store'
import { keyOf } from '../sync/merge'
import { configured, resolve, signIn, signOutUser, statusLabel, syncNow, useSync } from '../sync'

/** Quiet top-bar control: avatar or cloud icon with a status dot. */
export function AccountButton({ onClick, open }: { onClick: () => void; open: boolean }) {
  const sync = useSync()
  const conflicts = useStore((s) => Object.keys(s.conflicts).length)
  const label = statusLabel(sync, conflicts)
  const tone = !sync.user ? 'off' : conflicts ? 'warn' : sync.phase === 'synced' ? 'ok' : sync.phase === 'syncing' ? 'busy' : 'warn'
  return (
    <button className={'ib acct hide-sm' + (open ? ' on' : '')} onClick={onClick} title={`Account & sync — ${label}`} aria-label={`Account and sync: ${label}`} aria-expanded={open}>
      {sync.user?.photo ? <img src={sync.user.photo} alt="" referrerPolicy="no-referrer" /> : sync.user ? <Cloud /> : <CloudOff />}
      <i className="sdot" data-tone={tone} />
    </button>
  )
}

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const sync = useSync()
  const conflicts = useStore((s) => s.conflicts)
  const [review, setReview] = useState(false)
  const n = Object.keys(conflicts).length
  const label = statusLabel(sync, n)

  if (review && n) return <Conflicts onClose={() => setReview(false)} />

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={onClose} />
      <div className="menu acct-panel" role="dialog" aria-label="Account and sync">
        {!configured ? (
          <div className="acct-note">
            <b>Local only</b>
            <p>Sync is not set up in this build. Your notes, edits, highlights and progress are saved on this device.</p>
          </div>
        ) : !sync.user ? (
          <>
            <div className="acct-note">
              <b>Sync across devices</b>
              <p>Optional. Sign in to keep edits, highlights and progress the same on every device. Everything already on this device is kept and merged.</p>
            </div>
            <button className="primary" disabled={sync.busy} onClick={() => signIn()}>{sync.busy ? 'Signing in…' : 'Sign in with Google'}</button>
            <button onClick={onClose}>Continue locally</button>
          </>
        ) : (
          <>
            <div className="acct-user">
              {sync.user.photo && <img src={sync.user.photo} alt="" referrerPolicy="no-referrer" />}
              <span><b>{sync.user.name}</b><small>{sync.user.email}</small></span>
            </div>
            <div className="acct-status" aria-live="polite">
              <i className="sdot" data-tone={n ? 'warn' : sync.phase === 'synced' ? 'ok' : sync.phase === 'syncing' ? 'busy' : 'warn'} />
              {label}
              {sync.pending > 0 && sync.phase !== 'offline' && <small> · {sync.pending} to send</small>}
            </div>
            {n > 0 && <button onClick={() => setReview(true)}><TriangleAlert />{n === 1 ? '1 section edited on two devices — review' : `${n} sections edited on two devices — review`}</button>}
            <button onClick={() => syncNow()} disabled={sync.phase === 'syncing'}><RefreshCw />Sync now</button>
            <button disabled={sync.busy} onClick={() => signOutUser()}><LogOut />Sign out</button>
            <div className="acct-foot">Signing out keeps everything on this device.</div>
          </>
        )}
        {sync.error && <div className="acct-foot" style={{ color: 'var(--red)' }}>{sync.error}</div>}
      </div>
    </>
  )
}

function Conflicts({ onClose }: { onClose: () => void }) {
  const conflicts = useStore((s) => s.conflicts)
  const overrides = useStore((s) => s.overrides)
  const [both, setBoth] = useState<string | null>(null)
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette conflicts" role="dialog" aria-label="Sync conflicts">
        <div className="conf-head">
          <b>Edited on two devices</b>
          <p>Both versions are kept until you choose. Other sections, highlights and progress are already merged.</p>
        </div>
        <div className="conf-list">
          {Object.entries(conflicts).map(([id, remote]) => {
            const sec = sectionByKey(keyOf(id))
            if (!sec) return null
            const cloud = (remote.data ?? {}) as { title?: string | null; html?: string | null }
            const mine = overrides[sec.key]
            return (
              <div className="conf" key={id}>
                <div className="conf-title">
                  <b>{secTitle(overrides, sec)}</b>
                  <small>{sec.key.split('/').slice(1, 3).join(' › ')}</small>
                </div>
                <div className="conf-ops">
                  <button className="chip u" onClick={() => resolve(id, 'local')}>Keep this device</button>
                  <button className="chip u" onClick={() => resolve(id, 'cloud')}>Keep cloud version</button>
                  <button className="chip" onClick={() => setBoth(both === id ? null : id)}>{both === id ? 'Hide' : 'View both'}</button>
                </div>
                {both === id && (
                  <div className="conf-both">
                    <div>
                      <h4>This device{mine?.deleted ? ' — reset to original' : ''}</h4>
                      <div className="prose" dangerouslySetInnerHTML={{ __html: `<h3>${escape(secTitle(overrides, sec))}</h3>` + secHtml(overrides, sec) }} />
                    </div>
                    <div>
                      <h4>Cloud{remote.del ? ' — reset to original' : ''}</h4>
                      <div className="prose" dangerouslySetInnerHTML={{ __html: `<h3>${escape(remote.del ? sec.title : (cloud.title ?? sec.title))}</h3>` + (remote.del ? sec.html : (cloud.html ?? sec.html)) }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="hint"><button className="linkbtn" onClick={onClose}>Decide later</button></div>
      </div>
    </div>
  )
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
