// v1 → v2 data migration (pure; unit-tested).
// v1 saved highlights as <mark> elements inside the edited section HTML. v2 keeps content and
// highlights apart, so resetting or syncing one never disturbs the other.
import { extractMarks, type Highlight } from './highlight'

export interface V1Override {
  key: string
  title?: string
  html?: string
  updatedAt: number
}

export interface V2Override extends V1Override {
  rev?: string
  deviceId?: string
  synced?: string | null
  deleted?: boolean
}

export const newRev = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export function migrateOverrides(
  rows: V1Override[],
  baseHtml: (key: string) => string | undefined,
  deviceId: string,
): { overrides: V2Override[]; drop: string[]; highlights: Highlight[] } {
  const overrides: V2Override[] = []
  const drop: string[] = []
  const highlights: Highlight[] = []
  for (const row of rows) {
    let html = row.html
    if (html && html.includes('<mark')) {
      const { clean, marks } = extractMarks(html)
      for (const m of marks) {
        highlights.push({
          id: m.hid, sectionKey: row.key, color: m.color, start: m.start, end: m.end, text: m.text, before: m.before,
          createdAt: row.updatedAt, updatedAt: row.updatedAt, deviceId,
        })
      }
      // A row that existed only to carry highlights is no longer an edit.
      const base = baseHtml(row.key)
      html = base !== undefined && domNorm(base) === domNorm(clean) ? undefined : clean
    }
    if (html === undefined && row.title === undefined) drop.push(row.key)
    else overrides.push({ ...row, html, rev: newRev(), deviceId })
  }
  return { overrides, drop, highlights }
}

/** Browser-normalised markup, ignoring whitespace between tags. */
function domNorm(html: string) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body.innerHTML.replace(/>\s+</g, '><').trim()
}
