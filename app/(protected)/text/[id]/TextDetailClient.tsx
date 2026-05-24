'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ComprehensionMap, ComprehensionLegend } from '@/components/ComprehensionMap'
import { FluencyMeter } from '@/components/FluencyMeter'
import { buildWordChips } from '@/lib/comprehension'
import type {
  Text,
  VocabularyItem,
  TextVocabulary,
  Sentence,
  UserWordProgress,
} from '@/types'

interface Props {
  text: Text
  vocabItems: VocabularyItem[]
  textVocab: TextVocabulary[]
  sentences: Sentence[]
  progress: UserWordProgress[]
}

export function TextDetailClient({
  text,
  vocabItems,
  textVocab,
  sentences,
  progress,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'map' | 'sentences'>('map')

  const chips = buildWordChips(vocabItems, textVocab, progress)

  const knownCount    = progress.filter(p => p.status === 'known').length
  const learningCount = progress.filter(p => p.status === 'learning').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          ← Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-display text-lg text-foreground truncate">{text.title}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>{vocabItems.length} words</span>
          <span className="text-emerald-400">{knownCount} known</span>
          <span className="text-amber-400">{learningCount} learning</span>
          <span>{sentences.length} sentences</span>
        </div>

        {/* Fluency meter */}
        <FluencyMeter items={vocabItems} progress={progress} />

        {/* Start review CTA */}
        <button
          onClick={() => router.push(`/review?text_id=${text.id}`)}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium hover:bg-primary/90 transition-colors"
        >
          Start Review
        </button>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['map', 'sentences'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'map' ? 'Word Map' : 'Sentences'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'map' && (
          <div className="space-y-3">
            <ComprehensionLegend />
            <ComprehensionMap chips={chips} />
          </div>
        )}

        {activeTab === 'sentences' && (
          <ul className="space-y-3">
            {sentences.length === 0 && (
              <li className="text-sm text-muted-foreground text-center py-8">
                No sentences extracted yet.
              </li>
            )}
            {sentences.map(sentence => (
              <li
                key={sentence.id}
                className="text-sm text-foreground leading-relaxed border border-border rounded-lg px-4 py-3"
              >
                {sentence.content}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
