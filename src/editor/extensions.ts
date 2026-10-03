// TipTap schema for the notes vocabulary: everything the markdown dialect can produce
// must round-trip through the editor unchanged in meaning.
import { Mark, Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'

// Higher priority = outer mark, so a recall item or highlight stays one continuous span
// even when part of it is bold/italic.
const classMark = (name: string, cls: string, priority = 100) =>
  Mark.create({
    name,
    priority,
    parseHTML: () => [{ tag: `span.${cls}` }],
    renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { class: cls }), 0],
  })

export const Recall = classMark('recall', 'rc', 1000)
export const HighYield = classMark('hy', 'hy')
export const Red = classMark('red', 'red')

export const Highlight = Mark.create({
  name: 'highlight',
  priority: 1100,
  addAttributes() {
    return {
      color: {
        default: 'yellow',
        parseHTML: (el) => el.getAttribute('data-color') || 'yellow',
        renderHTML: (a) => ({ 'data-color': a.color }),
      },
      hid: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-hid'),
        renderHTML: (a) => (a.hid ? { 'data-hid': a.hid } : {}),
      },
    }
  },
  parseHTML: () => [{ tag: 'mark' }],
  renderHTML: ({ HTMLAttributes }) => ['mark', HTMLAttributes, 0],
})

export const Xref = Mark.create({
  name: 'link',
  inclusive: false,
  addAttributes() {
    const attr = (n: string) => ({
      default: null,
      parseHTML: (el: HTMLElement) => el.getAttribute(n),
      renderHTML: (a: Record<string, string | null>) => (a[n] ? { [n]: a[n] } : {}),
    })
    return { href: attr('href'), 'data-xref': attr('data-xref'), class: attr('class'), target: attr('target'), rel: attr('rel') }
  },
  parseHTML: () => [{ tag: 'a' }],
  renderHTML: ({ HTMLAttributes }) => ['a', HTMLAttributes, 0],
})

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      kind: {
        default: 'note',
        parseHTML: (el) => el.getAttribute('data-kind') || 'note',
        renderHTML: (a) => ({ 'data-kind': a.kind }),
      },
    }
  },
  parseHTML: () => [{ tag: 'div.callout' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { class: 'callout' }), 0],
})

export const extensions = [
  StarterKit.configure({ heading: { levels: [3, 4] }, codeBlock: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Recall,
  HighYield,
  Red,
  Highlight,
  Xref,
  Callout,
]
