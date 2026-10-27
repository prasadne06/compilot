import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { AlertOctagon, CheckCircle2, CircleDot, TrendingUp } from 'lucide-react'
import type { Recommendation, RecommendationState } from '../../types'
import { RECOMMENDATION_COPY } from '../../engine'
import { k } from '../../lib/format'

const TONE: Record<RecommendationState, { wrap: string; badge: string; Icon: typeof CheckCircle2 }> = {
  strong: { wrap: 'border-good-bd bg-good-bg/50', badge: 'bg-good-fg text-white', Icon: CheckCircle2 },
  consider: { wrap: 'border-caution-bd bg-caution-bg/50', badge: 'bg-caution-fg text-white', Icon: CircleDot },
  negotiate: { wrap: 'border-serious-bd bg-serious-bg/50', badge: 'bg-serious-fg text-white', Icon: TrendingUp },
  below: { wrap: 'border-critical-bd bg-critical-bg/50', badge: 'bg-critical-fg text-white', Icon: AlertOctagon },
}

export function RecommendationBadge({ state, size = 'md' }: { state: RecommendationState; size?: 'sm' | 'md' }) {
  const t = TONE[state]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full font-semibold', t.badge, size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs')}>
      <t.Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {RECOMMENDATION_COPY[state].title}
    </span>
  )
}

export function RecommendationCard({ rec, children }: { rec: Recommendation; children?: ReactNode }) {
  const t = TONE[rec.state]
  return (
    <section className={clsx('rounded-2xl border p-5 sm:p-6', t.wrap)} aria-label="Recommendation">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">Recommendation</p>
      <div className="mt-2.5"><RecommendationBadge state={rec.state} /></div>
      <p className="mt-3 max-w-2xl text-lg font-medium leading-snug tracking-tight text-ink-900 text-balance">“{rec.headline}”</p>
      {children}
    </section>
  )
}

export function TargetGrid({ rec, walkAway }: { rec: Recommendation; walkAway?: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-200 bg-ink-200 lg:grid-cols-4">
      <div className="bg-white p-4">
        <dt className="text-xs font-medium text-ink-500">Recommended target</dt>
        <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 tabular">{k(rec.target)}</dd>
      </div>
      <div className="bg-white p-4">
        <dt className="text-xs font-medium text-ink-500">Recommended range</dt>
        <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 tabular">
          {k(rec.rangeLow)}<span className="text-ink-300">–</span>{k(rec.rangeHigh)}
        </dd>
      </div>
      <div className="bg-white p-4">
        <dt className="text-xs font-medium text-ink-500">Fallback</dt>
        <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 tabular">{k(rec.fallback)}</dd>
      </div>
      <div className="bg-white p-4">
        <dt className="text-xs font-medium text-ink-500">Walk-away</dt>
        <dd className="mt-1">{walkAway}</dd>
      </div>
    </dl>
  )
}
