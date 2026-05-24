// lib/comprehension.ts
import type {
  VocabularyItem,
  UserWordProgress,
  TextVocabulary,
  Sentence,
  VocabWithProgress,
} from '@/types'

/**
 * Text comprehension = (known + learning words) / total unique words.
 * Used for the comprehension progress bar on text detail and dashboard.
 */
export function calculateTextComprehension(
  items: VocabularyItem[],
  progress: UserWordProgress[],
): number {
  if (items.length === 0) return 0
  const progressMap = new Map(progress.map(p => [p.vocabulary_item_id, p]))
  const active = items.filter(item => {
    const p = progressMap.get(item.id)
    return p?.status === 'known' || p?.status === 'learning'
  })
  return active.length / items.length
}

/**
 * ROI score = occurrences × (10000 / frequency_rank).
 * Returns 0 if frequency_rank is null (word is not in frequency list).
 */
export function computeRoiScore(occurrences: number, frequencyRank: number | null): number {
  if (frequencyRank == null) return 0
  return occurrences * (10000 / frequencyRank)
}

/**
 * A sentence is unlocked when ≥ 80% of its words are 'known' or 'learning'.
 * Uses the text-level comprehension as a proxy (items and progress are scoped
 * to the sentence's text).
 */
export function isSentenceUnlocked(
  sentence: Sentence,
  items: VocabularyItem[],
  progress: UserWordProgress[],
): boolean {
  if (items.length === 0 || sentence.word_count === 0) return false
  const comprehension = calculateTextComprehension(items, progress)
  return comprehension >= 0.8
}

/**
 * Build the word chips array for a ComprehensionMap.
 * Returns VocabWithProgress[] sorted by roi_score descending.
 */
export function buildWordChips(
  items: VocabularyItem[],
  textVocab: TextVocabulary[],
  progress: UserWordProgress[],
): VocabWithProgress[] {
  const progressMap = new Map(progress.map(p => [p.vocabulary_item_id, p]))
  const occurrenceMap = new Map(textVocab.map(tv => [tv.vocabulary_item_id, tv.occurrences]))

  return items
    .map(item => {
      const occurrences = occurrenceMap.get(item.id) ?? 1
      return {
        item,
        progress: progressMap.get(item.id) ?? null,
        occurrences,
        roi_score: computeRoiScore(occurrences, item.frequency_rank),
      }
    })
    .sort((a, b) => b.roi_score - a.roi_score)
}
