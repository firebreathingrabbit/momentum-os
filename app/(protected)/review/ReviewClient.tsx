'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlashCard } from '@/components/FlashCard'
import type { FlashCard as FlashCardType, SRSRating, SessionSummary } from '@/types'

interface Props {
  initialQueue: FlashCardType[]
  textId?: string
}

export function ReviewClient({ initialQueue, textId }: Props) {
  const router = useRouter()
  const [queue, setQueue] = useState<FlashCardType[]>(initialQueue)
  const [index, setIndex] = useState(0)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleRate(rating: SRSRating) {
    if (submitting) return
    const card = queue[index]
    const vocabId = card.type === 'word' ? card.vocabId : card.blankWordId

    setSubmitting(true)
    await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vocabulary_item_id: vocabId, rating }),
    })
    setSubmitting(false)

    if (index + 1 >= queue.length) {
      // Build summary
      const reviewed = queue.length
      // Optimistic counts based on ratings — server has the truth
      setSummary({ reviewed, known: 0, learning: 0, new: 0 })
    } else {
      setIndex(i => i + 1)
    }
  }

  if (initialQueue.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="font-display text-3xl text-foreground">All caught up!</h1>
        <p className="text-muted-foreground text-center max-w-xs">
          No cards are due for review right now. Come back later or add more texts.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (summary) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="font-display text-3xl text-foreground">Session complete</h1>
        <p className="text-muted-foreground text-center">
          You reviewed {summary.reviewed} card{summary.reviewed !== 1 ? 's' : ''}.
        </p>
        <div className="flex gap-4">
          {textId && (
            <button
              onClick={() => router.push(`/text/${textId}`)}
              className="border border-border text-foreground rounded-xl px-6 py-3 font-medium hover:bg-muted transition-colors"
            >
              Back to Text
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-primary text-primary-foreground rounded-xl px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentCard = queue[index]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ✕ End session
        </button>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {queue.length}
        </span>
      </header>

      {/* Card area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <FlashCard
          card={currentCard}
          onRate={handleRate}
          index={index}
          total={queue.length}
        />
      </main>
    </div>
  )
}
