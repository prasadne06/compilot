import { useState, type ReactNode } from 'react'
import { Check, Copy, Send } from 'lucide-react'

/** Renders **bold** inline. Everything else stays plain text (no HTML is ever injected). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold text-ink-900">{part.slice(2, -2)}</strong> : part,
  )
}

function DraftReply({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable: the text is selectable */
    }
  }
  return (
    <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/70 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          <Send className="h-3 w-3" aria-hidden /> Draft reply
        </p>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-900">
          {copied ? <Check className="h-3.5 w-3.5 text-good-fg" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-800">{text}</p>
    </div>
  )
}

/** Paragraphs, "- " bullets, **bold**, and a trailing "Draft reply:" block. */
export function MiniMarkdown({ text }: { text: string }) {
  const [body, draft] = splitDraft(text)
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="space-y-2.5 text-[14px] leading-relaxed text-ink-700">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l)))
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-pine-600" aria-hidden />
                  <span className="min-w-0">{inline(l.replace(/^\s*[-•*]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        return <p key={i} className="whitespace-pre-line">{inline(block)}</p>
      })}
      {draft && <DraftReply text={draft} />}
    </div>
  )
}

export function splitDraft(text: string): [string, string | undefined] {
  const m = text.match(/\n?\**Draft reply:?\**:?\s*\n?/i)
  if (!m || m.index === undefined) return [text, undefined]
  const draft = text.slice(m.index + m[0].length).trim().replace(/^["“]|["”]$/g, '')
  return [text.slice(0, m.index).trim(), draft || undefined]
}
