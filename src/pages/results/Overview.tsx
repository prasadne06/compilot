import { useState } from 'react'
import { ArrowRight, BarChart3, ChevronDown, FileText, Handshake, MessagesSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useEvaluation } from '../../state/EvaluationContext'
import { ButtonLink, Card } from '../../components/ui'
import { ConfidenceIndicator, Meter, RecommendationCard, ScoreCard, SourceTag } from '../../components/comp'
import { formatCurrency, formatPercent, k, ordinal } from '../../lib/format'
import { AINarrativeCard, useNarrative } from './AINarrativeCard'

export function Overview() {
  const { analysis } = useEvaluation()
  const narrative = useNarrative()
  const [showBreakdown, setShowBreakdown] = useState(false)
  if (!analysis) return null
  const { compensation: c, offerScore, marketPosition: mp, leverage, confidence, recommendation: rec, benchmark: b } = analysis

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Your offer */}
      <Card className="p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">Your offer</p>
          <SourceTag kind="calc" />
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr]">
          <div>
            <p className="text-[36px] font-semibold leading-none tracking-tight text-ink-900 tabular sm:text-[44px]">{formatCurrency(c.base)}</p>
            <p className="mt-2 text-sm text-ink-500">Base salary</p>
          </div>
          <div>
            <p className="text-[36px] font-semibold leading-none tracking-tight text-ink-900 tabular sm:text-[44px]">{formatCurrency(c.totalCompensation)}</p>
            <p className="mt-2 text-sm text-ink-500">Estimated total compensation <span className="text-ink-400">/ yr</span></p>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-ink-100 pt-4 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-xs text-ink-500">Cash</p>
              <p className="mt-1 text-[15px] font-semibold text-ink-900 tabular">{k(c.cashCompensation)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Equity <span className="text-ink-400">(est.)</span></p>
              <p className="mt-1 text-[15px] font-semibold text-ink-900 tabular">{k(c.annualEquity)}<span className="text-xs font-normal text-ink-400">/yr</span></p>
            </div>
            <div>
              <p className="text-xs text-ink-500">vs. current</p>
              <p className="mt-1 text-[15px] font-semibold text-ink-900 tabular">{c.changeVsCurrent !== undefined ? formatPercent(c.changeVsCurrent, 0, true) : '—'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Scores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          label="Offer Score"
          value={offerScore.score}
          suffix="/ 100"
          meter={{ value: offerScore.score }}
          caption="Market position, total comp, change vs. today, structure and fit with your priorities."
          info="A weighted composite score. See the breakdown below for each component."
          source="calc"
        />
        <ScoreCard
          label="Market Position"
          value={ordinal(mp.basePercentile)}
          suffix="percentile"
          meter={{ value: mp.basePercentile }}
          caption={`${mp.label}. Estimated range ${k(b.base.low)}–${k(b.base.high)}.`}
          info="Where your base salary falls within the illustrative benchmark range for comparable roles."
          source="data"
        />
        <ScoreCard
          label="Negotiation Leverage"
          value={leverage.score}
          suffix="/ 100"
          meter={{ value: leverage.score }}
          caption={`${leverage.label}. ${leverage.factors.filter((f) => f.kind === 'strength').length} factors in your favor.`}
          info="A transparent additive model of factors that strengthen or weaken your position."
          source="calc"
          footer={<Link to="/results/negotiation" className="text-xs font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">See why</Link>}
        />
        <ScoreCard
          label="Confidence"
          value={`${confidence.score}%`}
          meter={{ value: confidence.score }}
          caption="How well your inputs match what the benchmark model covers."
          source="calc"
          footer={<ConfidenceIndicator confidence={confidence} variant="link" />}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <RecommendationCard rec={rec}>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['Consider targeting', rec.target],
              ['Range', null],
              ['Fallback', rec.fallback],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-xl bg-white/80 p-2.5 ring-1 ring-ink-200/60 sm:p-3">
                <p className="text-xs text-ink-500">{label as string}</p>
                <p className="mt-1 text-[15px] font-semibold text-ink-900 tabular sm:text-lg">{v === null ? `${k(rec.rangeLow)}–${k(rec.rangeHigh)}` : k(v as number)}</p>
              </div>
            ))}
          </div>
          {narrative.result && <p className="mt-4 text-sm leading-relaxed text-ink-700">{narrative.result.data.recommendationExplanation}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonLink to="/results/negotiation" iconRight={<ArrowRight className="h-4 w-4" />}>See my strategy</ButtonLink>
            <SourceTag kind="ai" label="AI recommendation" />
          </div>
        </RecommendationCard>
        <AINarrativeCard />
      </div>

      {/* Score breakdown */}
      <Card>
        <button type="button" onClick={() => setShowBreakdown((s) => !s)} aria-expanded={showBreakdown} className="flex w-full items-center justify-between gap-3 p-5 text-left sm:px-6">
          <span>
            <span className="block text-[15px] font-semibold text-ink-900">How the offer score is calculated</span>
            <span className="mt-0.5 block text-[13px] text-ink-500">Deterministic, weighted components — no AI involved in the math.</span>
          </span>
          <ChevronDown className={clsx('h-4 w-4 shrink-0 text-ink-400 transition-transform', showBreakdown && 'rotate-180')} />
        </button>
        {showBreakdown && (
          <ul className="space-y-4 border-t border-ink-100 px-5 pb-6 pt-5 sm:px-6 animate-fadeUp">
            {offerScore.components.map((comp) => (
              <li key={comp.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ink-900">{comp.label} <span className="font-normal text-ink-400">· {Math.round(comp.weight * 100)}%</span></p>
                  <p className="text-sm font-semibold text-ink-900 tabular">{comp.score}</p>
                </div>
                <Meter className="mt-2" value={comp.score} label={comp.label} />
                <p className="mt-1.5 text-xs text-ink-500">{comp.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Next steps */}
      <div>
        <h2 className="text-[15px] font-semibold text-ink-900">Prepare for the conversation</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/results/market', icon: BarChart3, t: 'Market benchmark', d: 'Range, percentiles and comp model' },
            { to: '/results/negotiation', icon: Handshake, t: 'Negotiation strategy', d: 'What to ask for, and in what order' },
            { to: '/results/scripts', icon: FileText, t: 'Generate my script', d: 'Call, email and pushback responses' },
            { to: '/practice', icon: MessagesSquare, t: 'Practice negotiating', d: 'Rehearse with an AI recruiter' },
          ].map((x) => (
            <Link key={x.to} to={x.to} className="group rounded-xl border border-ink-200 bg-white p-4 shadow-card transition-all hover:border-ink-300 hover:shadow-lift">
              <div className="flex items-center justify-between">
                <x.icon className="h-4 w-4 text-ink-600" />
                <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-900">{x.t}</p>
              <p className="mt-0.5 text-xs text-ink-500">{x.d}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
