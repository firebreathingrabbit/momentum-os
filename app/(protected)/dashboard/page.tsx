import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: texts }, { data: languages }, { data: dueProgress }] = await Promise.all([
    supabase
      .from('texts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('languages').select('*').order('name'),
    supabase
      .from('user_word_progress')
      .select('vocabulary_item_id, status, next_review_at')
      .eq('user_id', user.id),
  ])

  const now = new Date().toISOString()
  const dueCount = (dueProgress ?? []).filter(p =>
    !p.next_review_at || p.next_review_at <= now
  ).length

  const knownCount = (dueProgress ?? []).filter(p => p.status === 'known').length

  return (
    <DashboardClient
      texts={texts ?? []}
      languages={languages ?? []}
      dueCount={dueCount}
      knownCount={knownCount}
    />
  )
}
