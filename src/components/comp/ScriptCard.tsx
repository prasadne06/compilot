import { useState } from 'react'
import { Check, Copy, Mail, Mic } from 'lucide-react'
import type { NegotiationScript } from '../../types'
import { Badge, Button, Card } from '../ui'

export function ScriptCard({ script }: { script: NegotiationScript }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const text = script.subject ? `Subject: ${script.subject}\n\n${script.body}` : script.body
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <Card className="flex flex-col p-5 sm:p-6 animate-fadeUp">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-ink-900">{script.title}</h3>
            <Badge icon={script.format === 'written' ? <Mail className="h-3 w-3" /> : <Mic className="h-3 w-3" />}>{script.format === 'written' ? 'Written' : 'Spoken'}</Badge>
            <Badge tone="pine">{script.tone}</Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-ink-500">{script.whenToUse}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={copy} icon={copied ? <Check className="h-3.5 w-3.5 text-good-fg" /> : <Copy className="h-3.5 w-3.5" />} aria-live="polite">
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/70 p-4">
        {script.subject && (
          <p className="mb-3 border-b border-ink-200 pb-3 text-[13px] text-ink-600">
            <span className="font-medium text-ink-800">Subject:</span> {script.subject}
          </p>
        )}
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-800">{script.body}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {script.keyMoves.map((m) => (
          <span key={m} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-ink-600 ring-1 ring-ink-200">
            <Check className="h-3 w-3 text-pine-600" aria-hidden />
            {m}
          </span>
        ))}
      </div>
    </Card>
  )
}
