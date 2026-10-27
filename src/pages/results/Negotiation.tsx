import { ArrowRight, Ban, CircleDot, Flag, Layers, LifeBuoy, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { useEvaluation } from '../../state/EvaluationContext'
import { useAI } from '../../state/useAI'
import { generateStrategyCoaching } from '../../services/ai'
import { ButtonLink, Card, CardHeader, CurrencyInput, ErrorState, LoadingState } from '../../components/ui'
import { LeverageFactors, Meter, RecommendationCard, SourceTag, TargetGrid } from '../../components/comp'
import type { StrategyAsk } from '../../types'
import { formatCurrency, k } from '../../lib/format'
import { useNarrative } from './AINarrativeCard'

function AskCard({ kicker, ask, icon, emphasis }: { kicker: string; ask: StrategyAsk; icon: ReactNode; emphasis?: boolean }) {
  return (
    <div className={clsx('rounded-xl border p-4', emphasis ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white')}>
      <div className={clsx('flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]', emphasis ? 'text-ink-300' : 'text-ink-400')}>
        {icon}
        {kicker}
      </div>
      <p className={clsx('mt-2 text-base font-semibold', emphasis ? 'text-white' : 'text-ink-900')}>{ask.label}</p>
      <p className={clsx('mt-1 text-[13px] leading-relaxed', emphasis ? 'text-ink-300' : 'text-ink-500')}>{ask.detail}</p>
    </div>
  )
}

function WalkAway() {
  const { inputs, setWalkAway, analysis } = useEvaluation()
  const v = inputs.walkAway
  const offer = analysis?.compensation.base ?? 0
  return (
    <div>
      <CurrencyInput aria-label="Your walk-away number" placeholder="Set yours" value={v} onValueChange={setWalkAway} className="h-9 text-base" />
      <p className="mt-1.5 text-[11px] leading-snug text-ink-500">
        {v === undefined
          ? 'User-defined — not automatically determined.'
          : v <= offer
            ? `The current offer is at or above your number.`
            : `The current offer is ${formatCurrency(v - offer)} below your number.`}
      </p>
    </div>
  )
}

export function Negotiation() {
  const { analysis, aiContext } = useEvaluation()
  const narrative = useNarrative()
  const coaching = useAI('coaching', aiContext, generateStrategyCoaching)
  if (!analysis) return null
  const { recommendation: rec, leverage, strategy: s, benchmark: b } = analysis

  return (
    <div className="space-y-6 animate-fadeUp">
      <RecommendationCard rec={rec}>
        <div className="mt-6"><TargetGrid rec={rec} walkAway={<WalkAway />} /></div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-600">
          Your walk-away number should reflect your personal financial situation, alternatives, priorities, and risk tolerance. CompPilot never sets it for you.
        </p>
      </RecommendationCard>

      {/* Data vs AI */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <SourceTag kind="data" label="Benchmark data" />
          <p className="mt-3 text-sm text-ink-500">Estimated market range</p>
          <p className="mt-1 text-xl font-semibold text-ink-900 tabular">{k(b.base.p25)}–{k(b.base.p75)} <span className="text-sm font-normal text-ink-400">25th–75th</span></p>
          <p className="mt-1 text-xs text-ink-400">Full illustrative range {k(b.base.low)}–{k(b.base.high)}</p>
        </Card>
        <Card className="border-pine-200 p-5">
          <SourceTag kind="ai" label="AI recommendation" />
          <p className="mt-3 text-sm text-ink-500">One reasonable approach</p>
          <p className="mt-1 text-xl font-semibold text-ink-900">Consider targeting <span className="tabular">{k(rec.target)}</span></p>
          <p className="mt-1 text-xs text-ink-400">A suggestion based on your inputs — not a guaranteed outcome</p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader title="Why this target" action={<SourceTag kind="calc" />} />
        <ul className="mt-4 space-y-2.5">
          {rec.rationale.map((r) => (
            <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-400" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      </Card>

      {/* Leverage */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[13px] font-medium text-ink-600">Negotiation leverage</p>
            <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-ink-900 tabular">{leverage.score}<span className="text-sm font-normal text-ink-400"> / 100</span></p>
            <p className="mt-2 text-sm font-medium text-ink-700">{leverage.label}</p>
          </div>
          <div className="w-full sm:max-w-sm">
            <Meter value={leverage.score} tone="pine" label="Negotiation leverage" className="h-2" />
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-400"><span>Limited</span><span>Moderate</span><span>Strong</span><span>Very strong</span></div>
          </div>
        </div>
        {narrative.result && (
          <p className="mt-5 flex gap-2 rounded-xl bg-pine-50/70 px-4 py-3 text-sm leading-relaxed text-pine-900">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" aria-hidden />
            {narrative.result.data.leverageExplanation}
          </p>
        )}
        <div className="mt-6 border-t border-ink-100 pt-6"><LeverageFactors leverage={leverage} /></div>
      </Card>

      {/* Strategy */}
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Negotiation strategy</h2>
            <p className="mt-0.5 text-sm text-ink-500">What to ask for, in what order.</p>
          </div>
          <SourceTag kind="ai" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <AskCard kicker="Primary ask" ask={s.primary} icon={<Flag className="h-3.5 w-3.5" />} emphasis />
          <AskCard kicker="Secondary ask" ask={s.secondary} icon={<Layers className="h-3.5 w-3.5" />} />
          <AskCard kicker="Fallback" ask={s.fallback} icon={<LifeBuoy className="h-3.5 w-3.5" />} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {s.nonCash && <AskCard kicker="Also worth raising" ask={s.nonCash} icon={<CircleDot className="h-3.5 w-3.5" />} />}
          <div className={clsx('rounded-xl border border-ink-200 bg-white p-4', !s.nonCash && 'md:col-span-2')}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400"><Ban className="h-3.5 w-3.5" />Avoid</div>
            <ul className="mt-2 space-y-1.5">
              {s.avoid.map((a) => <li key={a} className="text-[13px] leading-relaxed text-ink-600">· {a}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardHeader title="Why this strategy?" />
          <ul className="mt-4 space-y-2.5">
            {s.why.map((w) => (
              <li key={w} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pine-600" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
          <h4 className="mt-6 text-[13px] font-semibold text-ink-900">Suggested sequence</h4>
          <ol className="mt-3 space-y-2">
            {s.sequencing.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardHeader title="Your talking points" description="Grounded only in what you told us." action={<SourceTag kind="ai" />} />
          <div className="mt-4">
            {coaching.loading && <LoadingState label="Personalizing your talking points…" lines={4} />}
            {coaching.error && <ErrorState message={coaching.error} onRetry={coaching.regenerate} />}
            {coaching.result && (
              <div className="animate-fadeUp">
                <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-800">{coaching.result.data.coachNote}</p>
                <ul className="mt-4 space-y-2.5">
                  {coaching.result.data.talkingPoints.map((t) => (
                    <li key={t} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pine-600" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink-900 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-base font-semibold">Ready to put this into words?</p>
          <p className="mt-1 text-sm text-ink-300">Generate scripts for a call, an email, or a hiring manager conversation.</p>
        </div>
        <ButtonLink to="/results/scripts" variant="secondary" iconRight={<ArrowRight className="h-4 w-4" />}>Generate my script</ButtonLink>
      </div>
    </div>
  )
}
