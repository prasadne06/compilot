import { useState } from 'react'
import { clsx } from 'clsx'
import { Gauge } from 'lucide-react'
import type { Confidence, MatchQuality } from '../../types'
import { Modal } from '../ui'

const ratingStyle: Record<MatchQuality, string> = {
  high: 'bg-good-bg text-good-fg border-good-bd',
  medium: 'bg-caution-bg text-caution-fg border-caution-bd',
  low: 'bg-serious-bg text-serious-fg border-serious-bd',
}
const ratingLabel: Record<MatchQuality, string> = { high: 'High', medium: 'Medium', low: 'Low' }

export function RatingPill({ rating }: { rating: MatchQuality }) {
  return <span className={clsx('inline-flex w-[68px] justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', ratingStyle[rating])}>{ratingLabel[rating]}</span>
}

export function ConfidenceBreakdown({ confidence }: { confidence: Confidence }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-ink-600">
        Confidence reflects how closely your situation matches what the benchmark model covers. Lower confidence widens the estimated range rather than
        pretending to be precise.
      </p>
      <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-200">
        {confidence.factors.map((f) => (
          <li key={f.label} className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900">{f.label}</p>
              <p className="mt-0.5 text-xs text-ink-500">{f.detail}</p>
            </div>
            <RatingPill rating={f.rating} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Confidence is capped below 90% because benchmarks are illustrative and not refreshed from live market sources.
      </p>
    </div>
  )
}

export function ConfidenceIndicator({ confidence, variant = 'pill' }: { confidence: Confidence; variant?: 'pill' | 'link' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
          variant === 'pill' ? 'rounded-full border border-ink-200 bg-white px-2.5 py-1 text-ink-700 hover:border-ink-300' : 'text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900',
        )}
        aria-haspopup="dialog"
      >
        <Gauge className="h-3.5 w-3.5" aria-hidden />
        Confidence {confidence.score}%
        {variant === 'pill' && <span className="text-ink-400">· Why?</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Confidence: ${confidence.score}%`} description="Why this estimate has the confidence it does">
        <ConfidenceBreakdown confidence={confidence} />
      </Modal>
    </>
  )
}
