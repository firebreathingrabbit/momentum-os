'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TextInput } from '@/components/TextInput'
import type { Text, Language } from '@/types'

interface Props {
  texts: Text[]
  languages: Language[]
  dueCount: number
  knownCount: number
}

export function DashboardClient({ texts, languages, dueCount, knownCount }: Props) {
  const router = useRouter()
  const [showInput, setShowInput] = useState(false)
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleTextSuccess(textId: string) {
    setShowInput(false)
    router.push(`/text/${textId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-xl text-foreground">Momentum OS</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-3xl font-display font-medium text-amber-400 tabular-nums">{dueCount}</p>
            <p className="text-sm text-muted-foreground mt-1">cards due</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-3xl font-display font-medium text-emerald-400 tabular-nums">{knownCount}</p>
            <p className="text-sm text-muted-foreground mt-1">words known</p>
          </div>
        </div>

        {/* Review CTA */}
        {dueCount > 0 && (
          <button
            onClick={() => router.push('/review')}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium hover:bg-primary/90 transition-colors"
          >
            Review {dueCount} card{dueCount !== 1 ? 's' : ''} due now
          </button>
        )}

        {/* Texts list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-foreground">Your texts</h2>
            <button
              onClick={() => setShowInput(true)}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              + Add text
            </button>
          </div>

          {texts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted-foreground">No texts yet.</p>
              <button
                onClick={() => setShowInput(true)}
                className="text-sm text-primary hover:text-primary/80 transition-colors underline"
              >
                Add your first text to get started
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {texts.map(text => (
                <li key={text.id}>
                  <Link
                    href={`/text/${text.id}`}
                    className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-4 hover:border-primary/50 transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {text.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {text.processed_at
                          ? `Processed ${new Date(text.processed_at).toLocaleDateString()}`
                          : 'Processing…'}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-sm">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {showInput && (
        <TextInput
          languages={languages}
          onClose={() => setShowInput(false)}
          onSuccess={handleTextSuccess}
        />
      )}
    </div>
  )
}
