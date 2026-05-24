'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Language } from '@/types'

interface TextInputProps {
  languages: Language[]
  onClose: () => void
  onSuccess: (textId: string) => void
}

export function TextInput({ languages, onClose, onSuccess }: TextInputProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [languageId, setLanguageId] = useState(languages[0]?.id ?? '')
  const [step, setStep] = useState<'input' | 'processing'>('input')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim() || !content.trim() || !languageId) return
    setStep('processing')
    setError(null)

    // 1. Insert the text record
    const res = await fetch('/api/texts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), language_id: languageId }),
    })

    if (!res.ok) {
      setError('Failed to save text. Please try again.')
      setStep('input')
      return
    }

    const { id: textId } = await res.json() as { id: string }

    // 2. Trigger processing
    const processRes = await fetch('/api/process-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_id: textId }),
    })

    if (!processRes.ok) {
      setError('Text saved but processing failed. You can retry from the text page.')
    }

    onSuccess(textId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-lg mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl text-foreground">Add Text</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === 'processing' ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Extracting vocabulary…</p>
            <p className="text-xs text-muted-foreground mt-2">This takes 10–30 seconds</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. News article, Song lyrics, Short story…"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Language</label>
              <select
                value={languageId}
                onChange={e => setLanguageId(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
              >
                {languages.map(lang => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Text</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste any text in the target language…"
                rows={8}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim() || !languageId}
                className="flex-1"
              >
                Extract Vocabulary
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
