// app/api/review/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applySRSRating } from '@/lib/srs'
import type { UserWordProgress, SRSRating } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { vocabulary_item_id, rating } = body ?? {}

  if (!vocabulary_item_id || !rating) {
    return NextResponse.json({ error: 'vocabulary_item_id and rating required' }, { status: 400 })
  }

  const validRatings: SRSRating[] = ['again', 'hard', 'good', 'easy']
  if (!validRatings.includes(rating)) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  }

  // Fetch or create the user's progress record for this word
  let progress: UserWordProgress | null = null
  const { data: existing } = await supabase
    .from('user_word_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('vocabulary_item_id', vocabulary_item_id)
    .single()

  if (existing) {
    progress = existing as UserWordProgress
  } else {
    // First time seeing this word — create a new progress record
    const { data: created } = await supabase
      .from('user_word_progress')
      .insert({
        user_id: user.id,
        vocabulary_item_id,
        status: 'new',
        ease_factor: 2.5,
        interval_days: 0,
        next_review_at: null,
        times_seen: 0,
        last_seen_at: null,
      })
      .select('*')
      .single()
    progress = created as UserWordProgress
  }

  if (!progress) {
    return NextResponse.json({ error: 'Failed to get or create progress record' }, { status: 500 })
  }

  // Apply SRS algorithm
  const updated = applySRSRating(progress, rating as SRSRating)

  // Persist the updated progress
  const { data: saved, error: saveError } = await supabase
    .from('user_word_progress')
    .upsert({
      ...updated,
      user_id: user.id,
    })
    .select('*')
    .single()

  if (saveError) {
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }

  return NextResponse.json({ progress: saved })
}
