'use client'

import { cn } from '@/lib/utils'
import type { VocabWithProgress } from '@/types'

interface ComprehensionMapProps {
  chips: VocabWithProgress[]
  /** Fired when user taps a chip — optional, used to pre-seed flashcard session */
  onChipClick?: (vocabId: string) => void
}

/** Status → chip colour mapping */
const statusClass: Record<string, string> = {
  known:    'bg-emerald-900/60 text-emerald-200 border-emerald-700/50',
  learning: 'bg-amber-900/60  text-amber-200  border-amber-700/50',
  new:      'bg-muted/60       text-muted-foreground border-border',
}

export function ComprehensionMap({ chips, onChipClick }: ComprehensionMapProps) {
  if (chips.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No vocabulary extracted yet.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ item, progress }) => {
        const status = progress?.status ?? 'new'
        return (
          <button
            key={item.id}
            onClick={() => onChipClick?.(item.id)}
            title={`${item.romanisation} · ${item.translation}`}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition-opacity',
              'hover:opacity-80 active:opacity-60',
              statusClass[status],
            )}
          >
            {item.original}
          </button>
        )
      })}
    </div>
  )
}

/** Small legend that explains the colour coding */
export function ComprehensionLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block" />
        Known
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-700 inline-block" />
        Learning
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-muted inline-block border border-border" />
        New
      </span>
    </div>
  )
}
