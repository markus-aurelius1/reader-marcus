// "Install app" state. The browser decides when the app is installable and says so with
// `beforeinstallprompt`; that event is kept here so a button can open the native prompt later.
// Imported from main.tsx before the first render — the event can fire very early.
import { create } from 'zustand'

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** the native install prompt can be opened right now */
  available: boolean
  /** running as an installed app (standalone window / home-screen launch) */
  standalone: boolean
  /** installed during this visit */
  installed: boolean
  /** no install prompt on this browser, but it can be installed by hand: which instructions to show */
  manual: 'ios' | 'android-menu' | null
}

const isStandalone = () =>
  ['standalone', 'window-controls-overlay', 'minimal-ui', 'fullscreen'].some((m) => matchMedia(`(display-mode: ${m})`).matches) ||
  (navigator as { standalone?: boolean }).standalone === true

function manualKind(): InstallState['manual'] {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; the touch points give it away
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua) && /Firefox/.test(ua)) return 'android-menu'
  return null
}

let deferred: InstallPromptEvent | null = null
const standalone = isStandalone()

export const useInstall = create<InstallState>(() => ({ available: false, standalone, installed: false, manual: standalone ? null : manualKind() }))

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // no automatic mini-infobar; the reader offers its own button
  if (isStandalone()) return
  deferred = e as InstallPromptEvent
  useInstall.setState({ available: true })
})
window.addEventListener('appinstalled', () => {
  deferred = null
  useInstall.setState({ available: false, installed: true, manual: null })
})
matchMedia('(display-mode: standalone)').addEventListener('change', () => {
  if (!isStandalone()) return
  deferred = null
  useInstall.setState({ available: false, standalone: true, manual: null })
})

/** Open the browser's install prompt. The stored event is single-use; the browser sends a new one if the user dismisses. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred
  if (!e) return 'unavailable'
  deferred = null
  useInstall.setState({ available: false })
  try {
    await e.prompt()
    return (await e.userChoice).outcome
  } catch {
    return 'unavailable'
  }
}
