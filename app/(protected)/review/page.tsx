import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewClient } from './ReviewClient'
import { buildWordChips, isSentenceUnlocked } from '@/lib/comprehension'
import type { FlashCard, WordCard, SentenceCard, VocabularyItem, UserWordProgress } from '@/types'

interface Props {
  searchParams: Promise<{ text_id?: string }>
}

export default async function ReviewPage({ searchParams }: Props) {
  const { text_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fetch vocab for the session ──────────────────────────────────────────
  let vocabItems: VocabularyItem[] = []
  let progressRows: UserWordProgress[] = []

  if (text_id) {
    // Text-scoped review
    const { data: textVocab } = await supabase
      .from('text_vocabulary')
      .select('vocabulary_item_id, occurrences, vocabulary_items(*)')
      .eq('text_id', text_id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vocabItems = (textVocab ?? []).map((tv: any) => tv.vocabulary_items as VocabularyItem)
  } else {
    // Global review — all vocab for user's texts
    const { data: userTexts } = await supabase
      .from('texts')
      .select('id')
      .eq('user_id', user.id)

    const textIds = (userTexts ?? []).map((t: { id: string }) => t.id)
    if (textIds.length > 0) {
      const { data: tv } = await supabase
        .from('text_vocabulary')
        .select('vocabulary_item_id, vocabulary_items(*)')
        .in('text_id', textIds)

      // Deduplicate vocab items
      const seen = new Set<string>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (tv ?? []) as any[]) {
        const item = row.vocabulary_items as VocabularyItem
        if (!seen.has(item.id)) {
          seen.add(item.id)
          vocabItems.push(item)
        }
      }
    }
  }

  const vocabIds = vocabItems.map(v => v.id)

  if (vocabIds.length > 0) {
    const { data } = await supabase
      .from('user_word_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('vocabulary_item_id', vocabIds)
    progressRows = data ?? []
  }

  // ── Build card queue ──────────────────────────────────────────────────────
  const now = new Date()
  const progressMap = new Map(progressRows.map(p => [p.vocabulary_item_id, p]))

  // Word cards — prioritise due and new
  const wordCards: WordCard[] = vocabItems.map(item => ({
    type: 'word' as const,
    vocabId: item.id,
    original: item.original,
    romanisation: item.romanisation,
    translation: item.translation,
    exampleSentence: item.example_sentence,
    currentProgress: progressMap.get(item.id) ?? null,
  }))

  const due     = wordCards.filter(c => {
    const p = c.currentProgress
    if (!p) return true          // never seen → due
    if (!p.next_review_at) return true
    return new Date(p.next_review_at) <= now
  })
  const notDue  = wordCards.filter(c => {
    const p = c.currentProgress
    if (!p || !p.next_review_at) return false
    return new Date(p.next_review_at) > now
  })

  // Sentence cards — only from texts with ≥80% comprehension
  const sentenceCards: SentenceCard[] = []

  if (text_id) {
    const { data: sentences } = await supabase
      .from('sentences')
      .select('*')
      .eq('text_id', text_id)

    const unlocked = (sentences ?? []).filter(s =>
      isSentenceUnlocked(s, vocabItems, progressRows)
    )

    for (const sentence of unlocked) {
      // Pick a random known/learning word to blank
      const knownInSentence = vocabItems.filter(item => {
        const p = progressMap.get(item.id)
        return (
          (p?.status === 'known' || p?.status === 'learning') &&
          sentence.content.includes(item.original)
        )
      })
      if (knownInSentence.length === 0) continue

      const target = knownInSentence[Math.floor(Math.random() * knownInSentence.length)]
      sentenceCards.push({
        type: 'sentence' as const,
        sentenceId: sentence.id,
        content: sentence.content,
        blankWord: target.original,
        blankWordId: target.id,
        contentWithBlank: sentence.content.replace(target.original, '___'),
        currentProgress: progressMap.get(target.id) ?? null,
      })
    }
  }

  // Final queue: due word cards first, then sentence cards, then not-due
  const queue: FlashCard[] = [...due, ...sentenceCards, ...notDue].slice(0, 30)

  return (
    <ReviewClient
      initialQueue={queue}
      textId={text_id}
    />
  )
}
