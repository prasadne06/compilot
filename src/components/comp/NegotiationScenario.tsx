import { useState } from 'react'
import { cn } from '../../lib/cn'
import { ChevronDown, Lightbulb, MessageSquareQuote, Repeat } from 'lucide-react'
import type { PushbackScenario } from '../../types'

export function NegotiationScenario({ scenario, defaultOpen = false }: { scenario: PushbackScenario; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-ink-200 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
      >
        <span className="text-[15px] font-medium text-ink-900">{scenario.objection}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="space-y-4 border-t border-ink-100 px-4 pb-5 pt-4 sm:px-5 animate-fadeUp">
          <div className="flex gap-3">
            <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Suggested response</p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-800">“{scenario.response}”</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Alternative ask</p>
              <p className="mt-1 text-sm text-ink-700">{scenario.alternativeAsk}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Why this works</p>
              <p className="mt-1 text-sm text-ink-600">{scenario.rationale}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
