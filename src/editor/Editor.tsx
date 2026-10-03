import { useEffect, useReducer, useRef } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { create } from 'zustand'
import {
  Bold, Italic, Highlighter, List, ListOrdered, Undo2, Redo2, RemoveFormatting, Table as TableIcon,
  EyeOff, Heading, Rows3, Columns3, Trash2,
} from 'lucide-react'
import { extensions } from './extensions'
import type { Section } from '../lib/content'
import { secHtml, useStore } from '../lib/store'
import { applyHighlights, extractMarks, newHid } from '../lib/highlight'

/** Editors currently mounted, by section key — lets the highlight palette reach the right one. */
export const editors = new Map<string, Editor>()
export const useActiveEditor = create<{ active: Editor | null }>(() => ({ active: null }))

const activate = (editor: Editor) => {
  if (useActiveEditor.getState().active !== editor) useActiveEditor.setState({ active: editor })
}

export function EditorSection({ section }: { section: Section }) {
  // Highlights are separate records; inside the editor they travel as <mark>s so they follow
  // the text while it is edited, and are written back as records after every change.
  const known = useRef(new Set<string>())
  const baseline = useRef<string | null>(null) // editor's own serialisation of the unedited content
  const editor = useEditor({
    extensions,
    content: (() => {
      const st = useStore.getState()
      const hs = Object.values(st.highlights).filter((h) => h.sectionKey === section.key && !h.deleted)
      const out = applyHighlights(secHtml(st.overrides, section), hs)
      known.current = new Set(hs.map((h) => h.id).filter((id) => !out.unplaced.includes(id)))
      return out.html
    })(),
    onCreate: ({ editor }) => {
      baseline.current = extractMarks(editor.getHTML()).clean
    },
    onUpdate: ({ editor }) => {
      const st = useStore.getState()
      const { clean, marks } = extractMarks(editor.getHTML())
      // adding or moving a highlight alone is not a content edit
      if (clean !== baseline.current) {
        baseline.current = clean
        st.saveOverride(section.key, { html: clean })
      }
      known.current = st.reconcileMarks(section.key, marks, known.current)
    },
    onFocus: ({ editor }) => activate(editor),
    onSelectionUpdate: ({ editor }) => activate(editor),
  })
  useEffect(() => {
    if (!editor) return
    editors.set(section.key, editor)
    return () => {
      editors.delete(section.key)
      if (useActiveEditor.getState().active === editor) useActiveEditor.setState({ active: null })
    }
  }, [editor, section.key])
  return <EditorContent editor={editor} className="sec-body prose" data-key={section.key} />
}

const CALLOUTS: [string, string][] = [
  ['trap', 'Trap'],
  ['exc', 'Exception'],
  ['uppcs', 'UPPCS+'],
  ['dyn', 'Dynamic'],
  ['note', 'Note'],
]

export function Toolbar() {
  const editor = useActiveEditor((s) => s.active)
  const saveState = useStore((s) => s.saveState)
  const [, tick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    if (!editor) return
    editor.on('transaction', tick)
    return () => void editor.off('transaction', tick)
  }, [editor])

  const off = !editor
  const inTable = !!editor?.isActive('table')
  const B = (p: { label: string; on?: boolean; disabled?: boolean; run: (e: Editor) => void; children: React.ReactNode }) => (
    <button
      className={'ib' + (p.on ? ' on' : '')}
      title={p.label}
      aria-label={p.label}
      disabled={off || p.disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => editor && p.run(editor)}
    >
      {p.children}
    </button>
  )
  const calloutKind = editor?.isActive('callout') ? (editor.getAttributes('callout').kind as string) : ''

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <B label="Undo (Ctrl+Z)" disabled={!editor?.can().undo()} run={(e) => e.chain().focus().undo().run()}><Undo2 /></B>
      <B label="Redo (Ctrl+Shift+Z)" disabled={!editor?.can().redo()} run={(e) => e.chain().focus().redo().run()}><Redo2 /></B>
      <i className="sp" />
      <B label="Bold (Ctrl+B)" on={editor?.isActive('bold')} run={(e) => e.chain().focus().toggleBold().run()}><Bold /></B>
      <B label="Italic (Ctrl+I)" on={editor?.isActive('italic')} run={(e) => e.chain().focus().toggleItalic().run()}><Italic /></B>
      <B
        label="Highlight"
        on={editor?.isActive('highlight')}
        run={(e) =>
          e.isActive('highlight')
            ? e.chain().focus().unsetMark('highlight').run()
            : e.chain().focus().setMark('highlight', { color: 'yellow', hid: newHid() }).run()
        }
      >
        <Highlighter />
      </B>
      <i className="sp" />
      <B label="Bullet list" on={editor?.isActive('bulletList')} run={(e) => e.chain().focus().toggleBulletList().run()}><List /></B>
      <B label="Numbered list" on={editor?.isActive('orderedList')} run={(e) => e.chain().focus().toggleOrderedList().run()}><ListOrdered /></B>
      <B label="Sub-heading" on={editor?.isActive('heading')} run={(e) => e.chain().focus().toggleHeading({ level: 3 }).run()}><Heading /></B>
      <i className="sp" />
      <B label="Recall item (blurred in Recall Mode)" on={editor?.isActive('recall')} run={(e) => e.chain().focus().toggleMark('recall').run()}><EyeOff /></B>
      <select
        className="sel"
        aria-label="Callout block"
        disabled={off}
        value={calloutKind}
        onChange={(ev) => {
          if (!editor) return
          const kind = ev.target.value
          const c = editor.chain().focus()
          if (!kind) c.lift('callout').run()
          else if (calloutKind) c.updateAttributes('callout', { kind }).run()
          else c.wrapIn('callout', { kind }).run()
        }}
      >
        <option value="">Block…</option>
        {CALLOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <i className="sp" />
      <B label="Insert table" run={(e) => e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}><TableIcon /></B>
      <B label="Add row below" disabled={!inTable} run={(e) => e.chain().focus().addRowAfter().run()}><Rows3 />+</B>
      <B label="Delete row" disabled={!inTable} run={(e) => e.chain().focus().deleteRow().run()}><Rows3 />−</B>
      <B label="Add column right" disabled={!inTable} run={(e) => e.chain().focus().addColumnAfter().run()}><Columns3 />+</B>
      <B label="Delete column" disabled={!inTable} run={(e) => e.chain().focus().deleteColumn().run()}><Columns3 />−</B>
      <B label="Delete table" disabled={!inTable} run={(e) => e.chain().focus().deleteTable().run()}><Trash2 /></B>
      <i className="sp" />
      <B label="Clear formatting" run={(e) => e.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting /></B>
      <span className="save" style={{ marginLeft: 'auto' }} aria-live="polite">
        {saveState === 'editing' ? 'Editing' : saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
      </span>
    </div>
  )
}
