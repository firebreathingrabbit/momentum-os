'use client'

import { cn } from '@/lib/utils'
import { calculateTextComprehension } from '@/lib/comprehension'
import type { VocabularyItem, UserWordProgress } from '@/types'

interface FluencyMeterProps {
  items: VocabularyItem[]
  progress: UserWordProgress[]
  /** Show percentage label. Defaults true. */
  showLabel?: boolean
  className?: string
}

export function FluencyMeter({
  items,
  progress,
  showLabel = true,
  className,
}: FluencyMeterProps) {
  const comprehension = calculateTextComprehension(items, progress)
  const pct = Math.round(comprehension * 100)

  const progressMap = new Map(progress.map(p => [p.vocabulary_item_id, p]))

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Comprehension</span>
          <span className="font-medium text-foreground tabular-nums">{pct}%</span>
        </div>
      )}

      {/* Segmented bar */}
      <div className="flex gap-px h-2 rounded-full overflow-hidden">
        {items.length === 0 ? (
          <div className="flex-1 timeline-empty rounded-full" />
        ) : (
          items.map(item => {
            const p = progressMap.get(item.id)
            const status = p?.status ?? 'new'
            return (
              <div
                key={item.id}
                style={{ flex: 1 }}
                className={cn(
                  'transition-colors duration-500',
                  status === 'known'    && 'timeline-known',
                  status === 'learning' && 'timeline-learning',
                  status === 'new'      && 'timeline-empty',
                )}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
