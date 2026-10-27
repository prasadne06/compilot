import { Database } from 'lucide-react'
import { useEvaluation } from '../../state/EvaluationContext'
import { Card, CardHeader } from '../../components/ui'
import { CompensationCard, ConfidenceBreakdown, MarketRange, SourceTag, type RangeMarker } from '../../components/comp'
import { BENCHMARK_LABEL, BENCHMARK_VINTAGE } from '../../data/benchmarks'
import { formatPercent, k, ordinal } from '../../lib/format'

export function Market() {
  const { analysis, inputs } = useEvaluation()
  if (!analysis) return null
  const { benchmark: b, compensation: c, marketPosition: mp, confidence, recommendation: rec } = analysis

  const baseMarkers: RangeMarker[] = [{ id: 'offer', label: 'Your offer', value: c.base, style: 'offer' }]
  if (inputs.leverage.competing.base) baseMarkers.push({ id: 'competing', label: 'Competing', value: inputs.leverage.competing.base, style: 'competing' })
  baseMarkers.push({ id: 'target', label: 'Target', value: rec.target, style: 'target' })
  if (inputs.profile.currentBase) baseMarkers.push({ id: 'current', label: 'Current', value: inputs.profile.currentBase, style: 'current' })

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-ink-700">
          <Database className="h-4 w-4 text-ink-500" aria-hidden />
          <span><span className="font-semibold">{BENCHMARK_LABEL}.</span> Estimated using benchmark assumptions — not real-time market data.</span>
        </p>
        <span className="text-xs text-ink-400">{BENCHMARK_VINTAGE}</span>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Estimated market range · base salary"
          description={`${b.roleFamilyLabel} · ${b.locationLabel} · ${b.industryLabel} · ${b.stageLabel}`}
          action={<SourceTag kind="data" />}
        />
        <div className="mt-6">
          <MarketRange range={b.base} markers={baseMarkers} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-ink-50 p-4">
            <p className="text-xs text-ink-500">Your base percentile</p>
            <p className="mt-1 text-xl font-semibold text-ink-900 tabular">~{ordinal(mp.basePercentile)}</p>
          </div>
          <div className="rounded-xl bg-ink-50 p-4">
            <p className="text-xs text-ink-500">vs. estimated median</p>
            <p className="mt-1 text-xl font-semibold text-ink-900 tabular">{formatPercent(mp.baseVsMedian, 1, true)}</p>
          </div>
          <div className="rounded-xl bg-ink-50 p-4">
            <p className="text-xs text-ink-500">Range width reflects</p>
            <p className="mt-1 text-xl font-semibold text-ink-900 tabular">{confidence.score}% confidence</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader title="Estimated market range · total compensation" description={`Assumes ~${Math.round(b.typicalBonusPct * 100)}% bonus and ~${k(b.typicalEquityAnnual)}/yr typical equity for this stage and level.`} action={<SourceTag kind="data" />} />
        <div className="mt-6">
          <MarketRange range={b.totalComp} markers={[{ id: 'offer-tc', label: 'Your offer (est.)', value: c.totalCompensation, style: 'offer' }]} />
        </div>
        <p className="mt-4 text-[13px] text-ink-500">Your estimated total compensation sits near the {ordinal(mp.totalCompPercentile)} percentile. Total comp ranges are wider because bonus and equity vary more than base.</p>
      </Card>

      <CompensationCard comp={c} offer={inputs.offer} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardHeader title={`Why the confidence is ${confidence.score}%`} action={<SourceTag kind="calc" />} />
          <div className="mt-4"><ConfidenceBreakdown confidence={confidence} /></div>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardHeader title="How this estimate was built" description="The benchmark model considers role, level, experience, geography, industry and company stage." />
          <ol className="mt-4 space-y-2.5">
            {b.methodology.map((m, i) => (
              <li key={m} className="flex gap-3 text-sm text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-500">{i + 1}</span>
                {m}
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-relaxed text-ink-500">
            Percentiles are spread around the estimated median and widened when confidence is lower. CompPilot does not access private company compensation data.
          </p>
        </Card>
      </div>
    </div>
  )
}
