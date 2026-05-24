// lib/srs.ts
import type { UserWordProgress, SRSRating } from '@/types'

const MIN_EASE = 1.3
const MAX_EASE = 2.5
const KNOWN_THRESHOLD_DAYS = 21

function clampEase(ef: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ef))
}

/**
 * Apply an SRS rating to a user's word progress record.
 * Returns a NEW object — does not mutate the input.
 */
export function applySRSRating(
  progress: UserWordProgress,
  rating: SRSRating,
): UserWordProgress {
  const { interval_days, ease_factor, status } = progress

  let newInterval: number
  let newEase: number

  const isNew = interval_days === 0

  if (isNew) {
    // New card
    switch (rating) {
      case 'again':
        newInterval = 0
        newEase = clampEase(ease_factor - 0.2)
        break
      case 'hard':
        newInterval = 1
        newEase = clampEase(ease_factor - 0.15)
        break
      case 'good':
        newInterval = 1
        newEase = ease_factor
        break
      case 'easy':
        newInterval = 4
        newEase = clampEase(ease_factor + 0.1)
        break
    }
  } else if (status === 'known') {
    // Known card (interval >= 21d)
    switch (rating) {
      case 'again':
        newInterval = 1
        newEase = clampEase(ease_factor - 0.2)
        break
      case 'hard':
        newInterval = Math.floor(interval_days * 1.2)
        newEase = clampEase(ease_factor - 0.15)
        break
      case 'good':
        newInterval = Math.floor(interval_days * ease_factor)
        newEase = ease_factor
        break
      case 'easy':
        newInterval = Math.floor(interval_days * ease_factor * 1.3)
        newEase = clampEase(ease_factor + 0.1)
        break
    }
  } else {
    // Learning card (interval > 0, not yet known)
    switch (rating) {
      case 'again':
        newInterval = 0
        newEase = clampEase(ease_factor - 0.2)
        break
      case 'hard':
        newInterval = Math.floor(interval_days * 1.2)
        newEase = clampEase(ease_factor - 0.15)
        break
      case 'good':
        newInterval = Math.floor(interval_days * ease_factor)
        newEase = ease_factor
        break
      case 'easy':
        newInterval = Math.floor(interval_days * ease_factor * 1.3)
        newEase = clampEase(ease_factor + 0.1)
        break
    }
  }

  const newStatus =
    newInterval >= KNOWN_THRESHOLD_DAYS
      ? 'known'
      : newInterval > 0
        ? 'learning'
        : status === 'new'
          ? 'new'         // new card rated again → stays new
          : 'learning'    // learning/known card rated again → stays/demotes to learning

  return {
    ...progress,
    interval_days: newInterval,
    ease_factor: newEase,
    status: newStatus,
    next_review_at: computeNextReviewAt(newInterval),
    times_seen: progress.times_seen + 1,
    last_seen_at: new Date().toISOString(),
  }
}

/**
 * Returns the ISO timestamp for when the card is next due.
 * Returns null if interval is 0 (show again immediately / today).
 */
export function computeNextReviewAt(intervalDays: number): string | null {
  if (intervalDays === 0) return null
  const d = new Date()
  d.setDate(d.getDate() + intervalDays)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
