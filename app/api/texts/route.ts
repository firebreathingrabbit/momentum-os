// app/api/texts/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content, language_id } = await request.json()
  if (!title || !content || !language_id) {
    return NextResponse.json({ error: 'title, content, language_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('texts')
    .insert({ user_id: user.id, title, content, language_id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
