import { ListPlus } from 'lucide-react'
import type { ContentRef } from '../lib/contract'
import { addToQueue, openItems, removeQueueItem, targetKey, usePlan } from '../lib/plan'

/** Add a chapter or section to the study queue, or take it back out. */
export function QueueButton({ target, title }: { target: ContentRef; title: string }) {
  const item = usePlan((s) => openItems(s.queue).find((r) => targetKey(r.target) === targetKey(target)))
  return (
    <button className={'fav q' + (item ? ' on' : '')} onClick={() => (item ? removeQueueItem(item.id) : addToQueue(target, title))} aria-pressed={!!item} title={item ? 'Remove from the study queue' : 'Add to the study queue'}>
      <ListPlus />{item ? 'In queue' : 'Add to queue'}
    </button>
  )
}
