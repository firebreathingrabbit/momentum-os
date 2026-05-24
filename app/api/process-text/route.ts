// app/api/process-text/route.ts
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

interface ExtractedVocabItem {
  original: string
  romanisation: string
  translation: string
  example_sentence: string
  frequency_rank: number | null
  occurrences: number
}

interface ClaudeResponse {
  vocabulary: ExtractedVocabItem[]
  sentences: string[]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.text_id) {
    return NextResponse.json({ error: 'text_id required' }, { status: 400 })
  }

  // Fetch the text record
  const { data: text, error: textError } = await supabase
    .from('texts')
    .select('*')
    .eq('id', body.text_id)
    .eq('user_id', user.id)
    .single()

  if (textError || !text) {
    return NextResponse.json({ error: 'Text not found' }, { status: 404 })
  }

  // Fetch the language for context
  const { data: language } = await supabase
    .from('languages')
    .select('name, romanisation_label')
    .eq('id', text.language_id)
    .single()

  const languageName = language?.name ?? 'the target language'
  const romanisationLabel = language?.romanisation_label ?? 'romanisation'

  // Call Claude for vocab extraction
  const prompt = `You are a language learning assistant. Extract vocabulary from the following ${languageName} text.

TEXT:
${text.content}

Return a JSON object with exactly this shape:
{
  "vocabulary": [
    {
      "original": "word in target language",
      "romanisation": "${romanisationLabel} (e.g. pinyin for Mandarin, romaji for Japanese)",
      "translation": "English meaning",
      "example_sentence": "one sentence from the text containing this word",
      "frequency_rank": estimated rank in everyday ${languageName} use (integer, 1=most common like 的, 10000=literary/rare; null if unsure),
      "occurrences": count of times this word appears in the text (integer)
    }
  ],
  "sentences": ["array of complete sentences extracted from the text, cleaned of markup"]
}

Rules:
- Extract meaningful vocabulary items (skip pure punctuation, numbers, proper nouns that are not learnable)
- Be precise with frequency_rank: 的≈1, 朋友≈300, 稻香≈8000
- example_sentence must be a real sentence from the provided text
- sentences should be individual complete sentences, splitting on natural boundaries
- Return ONLY valid JSON, no markdown fences`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  let extracted: ClaudeResponse
  try {
    extracted = JSON.parse(rawText) as ClaudeResponse
  } catch {
    console.error('Claude returned invalid JSON:', rawText)
    return NextResponse.json({ error: 'Processing failed — please retry' }, { status: 500 })
  }

  // Upsert vocabulary items (global per language) — batch to avoid N+1
  const vocabRows = extracted.vocabulary.map(vocab => ({
    language_id: text.language_id,
    original: vocab.original,
    romanisation: vocab.romanisation,
    translation: vocab.translation,
    example_sentence: vocab.example_sentence,
    frequency_rank: vocab.frequency_rank,
  }))

  const { data: upserted, error: upsertError } = await serviceSupabase
    .from('vocabulary_items')
    .upsert(vocabRows, { onConflict: 'language_id,original', ignoreDuplicates: false })
    .select('id, original')

  if (upsertError) {
    console.error('Vocab upsert failed:', upsertError)
    return NextResponse.json({ error: 'Failed to upsert vocabulary' }, { status: 500 })
  }

  const upsertedIds = (upserted ?? []).map(row => ({ original: row.original, id: row.id }))

  // Insert text_vocabulary junction rows
  const occurrenceMap = new Map(extracted.vocabulary.map(v => [v.original, v.occurrences]))
  const textVocabRows = upsertedIds.map(({ original, id }) => ({
    text_id: text.id,
    vocabulary_item_id: id,
    occurrences: occurrenceMap.get(original) ?? 1,
  }))

  if (textVocabRows.length > 0) {
    await serviceSupabase
      .from('text_vocabulary')
      .upsert(textVocabRows, { onConflict: 'text_id,vocabulary_item_id' })
  }

  // Insert sentences
  const sentenceRows = extracted.sentences.map(content => ({
    text_id: text.id,
    content,
    word_count: content.split(/\s+/).filter(Boolean).length,
  }))

  if (sentenceRows.length > 0) {
    await serviceSupabase
      .from('sentences')
      .upsert(sentenceRows, { onConflict: 'text_id,content', ignoreDuplicates: true })
  }

  // Mark text as processed
  await supabase
    .from('texts')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', text.id)

  return NextResponse.json({
    vocabulary_count: upsertedIds.length,
    sentence_count: sentenceRows.length,
  })
}
