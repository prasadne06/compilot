import { ArrowRight, BookmarkPlus, Calculator, FlaskConical, Scale } from 'lucide-react'
import { clsx } from 'clsx'
import type { CounterMove } from '../../../types'
import type { ToolEvent } from '../../../services/ai/agent'
import { formatCurrency as $, ordinal } from '../../../lib/format'

const MOVE_TONE: Record<CounterMove, string> = {
  accept: 'bg-good-bg text-good-fg border-good-bd',
  close: 'bg-pine-50 text-pine-800 border-pine-200',
  counter: 'bg-serious-bg text-serious-fg border-serious-bd',
  pivot: 'bg-caution-bg text-caution-fg border-caution-bd',
  below_walk_away: 'bg-critical-bg text-critical-fg border-critical-bd',
}

function Row({ label, before, after }: { label: string; before: string; after: string }) {
  const changed = before !== after
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[13px]">
      <span className="text-ink-500">{label}</span>
      <span className="flex items-center gap-1.5 tabular">
        <span className={changed ? 'text-ink-400' : 'text-ink-700'}>{before}</span>
        {changed && <><ArrowRight className="h-3 w-3 text-ink-300" aria-hidden /><span className="font-semibold text-ink-900">{after}</span></>}
      </span>
    </div>
  )
}

/** A tool call's result, shown as calculated data next to the coach's words. */
export function ToolResult({ event }: { event: ToolEvent }) {
  if (event.logged)
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-500">
        <BookmarkPlus className="h-3.5 w-3.5 text-pine-600" aria-hidden /> {event.label}
      </p>
    )

  const header = (Icon: typeof Calculator, title: string) => (
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-800"><Icon className="h-3.5 w-3.5 text-ink-500" aria-hidden />{title}</p>
      <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-500"><Calculator className="h-2.5 w-2.5" aria-hidden />Calculated</span>
    </div>
  )

  if (event.evaluation) {
    const e = event.evaluation
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-3.5">
        {header(Scale, `Their offer · round ${e.round}`)}
        <p className={clsx('mt-2.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold', MOVE_TONE[e.move])}>{e.moveLabel}</p>
        <div className="mt-2 divide-y divide-ink-100">
          <Row label="Base" before={$(e.original.base)} after={$(e.counter.base)} />
          <Row label="Total comp / yr" before={$(e.original.totalComp)} after={$(e.counter.totalComp)} />
          <Row label="First year (incl. signing)" before={$(e.original.firstYearTotal)} after={$(e.counter.firstYearTotal)} />
        </div>
        <p className="mt-2 text-[11px] text-ink-500 tabular">
          Target {$(e.target)} · Fallback {$(e.fallback)} · Walk-away {e.walkAway ? $(e.walkAway) : 'not set'}
        </p>
      </div>
    )
  }

  if (event.whatIf) {
    const w = event.whatIf
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-3.5">
        {header(FlaskConical, `What-if: ${w.changes.join(', ')}`)}
        <div className="mt-2 divide-y divide-ink-100">
          <Row label="Offer score" before={String(w.before.offerScore)} after={String(w.after.offerScore)} />
          <Row label="Base percentile" before={ordinal(w.before.basePercentile)} after={ordinal(w.after.basePercentile)} />
          <Row label="Total comp / yr" before={$(w.before.totalComp)} after={$(w.after.totalComp)} />
          <Row label="Leverage" before={String(w.leverageBefore)} after={String(w.leverageAfter)} />
        </div>
        <p className="mt-2 text-[11px] text-ink-500">Scenario only. Your saved offer is unchanged.</p>
      </div>
    )
  }
  return null
}
