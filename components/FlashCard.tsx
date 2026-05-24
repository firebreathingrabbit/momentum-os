'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { FlashCard, SRSRating } from '@/types'

interface FlashCardProps {
  card: FlashCard
  onRate: (rating: SRSRating) => void
  /** Optional: index/total for progress display */
  index?: number
  total?: number
}

const ratingConfig: { rating: SRSRating; label: string; className: string }[] = [
  { rating: 'again', label: 'Again',  className: 'border-red-700    text-red-300    hover:bg-red-900/40' },
  { rating: 'hard',  label: 'Hard',   className: 'border-orange-700 text-orange-300 hover:bg-orange-900/40' },
  { rating: 'good',  label: 'Good',   className: 'border-primary    text-primary    hover:bg-primary/20' },
  { rating: 'easy',  label: 'Easy',   className: 'border-emerald-700 text-emerald-300 hover:bg-emerald-900/40' },
]

export function FlashCard({ card, onRate, index, total }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)

  function handleRate(rating: SRSRating) {
    setFlipped(false)
    // Small delay lets the card flip back before switching to next card
    setTimeout(() => onRate(rating), 280)
  }

  const isWord     = card.type === 'word'
  const isSentence = card.type === 'sentence'

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Progress indicator */}
      {index !== undefined && total !== undefined && (
        <p className="text-xs text-muted-foreground text-center">
          {index + 1} / {total}
        </p>
      )}

      {/* Card */}
      <div
        className="flip-card cursor-pointer min-h-56 w-full"
        onClick={() => !flipped && setFlipped(true)}
      >
        <div className={cn('flip-card-inner', flipped && 'flipped')}>
          {/* Front face */}
          <div className="flip-card-face rounded-2xl bg-card border border-border flex flex-col items-center justify-center p-8 text-center gap-3">
            {isWord && (
              <>
                <span className="text-4xl font-display font-medium text-foreground">
                  {card.original}
                </span>
                <span className="text-sm text-muted-foreground">Tap to reveal</span>
              </>
            )}
            {isSentence && (
              <>
                <span className="text-lg text-foreground leading-relaxed">
                  {card.contentWithBlank}
                </span>
                <span className="text-sm text-muted-foreground">Fill in the blank</span>
              </>
            )}
          </div>

          {/* Back face */}
          <div className="flip-card-face flip-card-back-face rounded-2xl bg-card border border-border flex flex-col items-center justify-center p-8 text-center gap-2">
            {isWord && (
              <>
                <span className="text-4xl font-display font-medium text-foreground">
                  {card.original}
                </span>
                <span className="text-lg text-muted-foreground italic">
                  {card.romanisation}
                </span>
                <span className="text-xl text-foreground mt-1">
                  {card.translation}
                </span>
                {card.exampleSentence && (
                  <span className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                    {card.exampleSentence}
                  </span>
                )}
              </>
            )}
            {isSentence && (
              <>
                <span className="text-lg text-foreground leading-relaxed">
                  {card.content}
                </span>
                <span className="text-primary font-medium mt-1">
                  {card.blankWord}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons — only shown after flip */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {ratingConfig.map(({ rating, label, className }) => (
            <Button
              key={rating}
              variant="outline"
              className={cn('text-xs h-10 border', className)}
              onClick={() => handleRate(rating)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {/* Tap prompt before flip */}
      {!flipped && (
        <p className="text-center text-xs text-muted-foreground">
          Tap the card to flip
        </p>
      )}
    </div>
  )
}
