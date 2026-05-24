// types/index.ts

export interface Language {
  id: string
  name: string
  code: string
  romanisation_label: string
}

export interface Text {
  id: string
  user_id: string
  language_id: string
  title: string
  content: string
  processed_at: string | null
  created_at: string
}

export interface VocabularyItem {
  id: string
  language_id: string
  original: string
  romanisation: string
  translation: string
  example_sentence: string
  frequency_rank: number | null
}

export interface TextVocabulary {
  text_id: string
  vocabulary_item_id: string
  occurrences: number
}

export interface Sentence {
  id: string
  text_id: string
  content: string
  word_count: number
}

export interface UserWordProgress {
  id: string
  user_id: string
  vocabulary_item_id: string
  status: 'new' | 'learning' | 'known'
  ease_factor: number
  interval_days: number
  next_review_at: string | null
  times_seen: number
  last_seen_at: string | null
}

// ─── Composite types used in UI ───────────────────────────────────────────────

/** VocabularyItem enriched with per-user progress and cross-text ROI score. */
export interface VocabWithProgress {
  item: VocabularyItem
  progress: UserWordProgress | null
  occurrences: number    // in this text (or total across all user texts)
  roi_score: number      // occurrences × (10000 / frequency_rank)
}

/** A flash card ready to be shown. */
export type CardType = 'word' | 'sentence'

export interface WordCard {
  type: 'word'
  vocabId: string
  original: string
  romanisation: string
  translation: string
  exampleSentence: string
  currentProgress: UserWordProgress | null
}

export interface SentenceCard {
  type: 'sentence'
  sentenceId: string
  content: string
  blankWord: string       // the word that is blanked out
  blankWordId: string
  contentWithBlank: string // same sentence with blank replaced by ___
  currentProgress: UserWordProgress | null
}

export type FlashCard = WordCard | SentenceCard

/** SRS rating choices. */
export type SRSRating = 'again' | 'hard' | 'good' | 'easy'

/** Session summary returned after a review session completes. */
export interface SessionSummary {
  reviewed: number
  known: number
  learning: number
  new: number
}
