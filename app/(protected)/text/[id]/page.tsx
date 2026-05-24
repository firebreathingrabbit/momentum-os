import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TextDetailClient } from './TextDetailClient'
import type { VocabularyItem } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TextDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the text (user-owned)
  const { data: text, error: textError } = await supabase
    .from('texts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (textError || !text) redirect('/dashboard')

  // Parallel fetch: vocab items via junction, sentences, user progress
  const [
    { data: textVocab },
    { data: sentences },
  ] = await Promise.all([
    supabase
      .from('text_vocabulary')
      .select('vocabulary_item_id, occurrences, vocabulary_items(*)')
      .eq('text_id', id),
    supabase
      .from('sentences')
      .select('*')
      .eq('text_id', id)
      .order('id'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vocabItems = (textVocab ?? []).map((tv: any) => tv.vocabulary_items as VocabularyItem)
  const vocabIds = vocabItems.map(v => v.id)

  const { data: progressRows } = vocabIds.length > 0
    ? await supabase
        .from('user_word_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('vocabulary_item_id', vocabIds)
    : { data: [] }

  const textVocabJunction = (textVocab ?? []).map((tv: { vocabulary_item_id: string; occurrences: number }) => ({
    text_id: id,
    vocabulary_item_id: tv.vocabulary_item_id,
    occurrences: tv.occurrences,
  }))

  return (
    <TextDetailClient
      text={text}
      vocabItems={vocabItems}
      textVocab={textVocabJunction}
      sentences={sentences ?? []}
      progress={progressRows ?? []}
    />
  )
}
