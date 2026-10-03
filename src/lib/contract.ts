// Reader v2 shared types — the subset of docs/READER_V2_CONTRACT.md that code uses so far.
// The contract document is the source of truth; add a type here only when something needs it.

export type ExamStage = 'prelims' | 'mains'

export type ContentKind = 'stage' | 'paper' | 'subject' | 'topic' | 'chapter' | 'section' | 'pyq'

export interface ContentRef {
  stage: ExamStage
  paperId?: string
  subjectId?: string
  topicId?: string
  chapterId?: string
  sectionId?: string
  taxonomyId?: string
  pyqId?: string
  kind: ContentKind
}

export interface NavigationNode {
  id: string
  kind: Exclude<ContentKind, 'pyq'>
  title: string
  parentId?: string
  childrenIds: string[]
  target: ContentRef
  order: number
}

export interface RecentDestination {
  target: ContentRef
  title: string
  visitedAt: string
}
