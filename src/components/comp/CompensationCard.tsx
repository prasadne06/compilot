import { clsx } from 'clsx'
import { AlertTriangle } from 'lucide-react'
import type { Compensation, Offer } from '../../types'
import { formatCurrency, formatPercent } from '../../lib/format'
import { Card, CardHeader } from '../ui'
import { SourceTag } from './SourceTag'

function Row({ label, value, sub, strong, muted }: { label: string; value: number; sub?: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-4 py-2', strong && 'border-t border-ink-200 pt-3')}>
      <div className="min-w-0">
        <p className={clsx('text-sm', strong ? 'font-semibold text-ink-900' : muted ? 'text-ink-500' : 'text-ink-700')}>{label}</p>
        {sub && <p className="text-xs text-ink-400">{sub}</p>}
      </div>
      <p className={clsx('shrink-0 tabular', strong ? 'text-base font-semibold text-ink-900' : 'text-sm text-ink-800')}>{formatCurrency(value)}</p>
    </div>
  )
}

export function CompensationCard({ comp, offer }: { comp: Compensation; offer: Offer }) {
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader title="Total compensation model" description="Annualized, recurring compensation — one-time items shown separately." action={<SourceTag kind="calc" />} />

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Cash compensation</p>
          <div className="mt-1">
            <Row label="Base salary" value={comp.base} />
            <Row label="Expected bonus" value={comp.expectedBonus} sub={offer.targetBonusPct ? `${offer.targetBonusPct}% target · not guaranteed` : 'No bonus provided'} />
            {comp.otherAnnual > 0 && <Row label="Other measurable comp" value={comp.otherAnnual} sub="Stipends, 401(k) match, etc." />}
            <Row label="Cash compensation" value={comp.cashCompensation} strong />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Equity</p>
          <div className="mt-1">
            <Row
              label="Annualized equity (estimated)"
              value={comp.annualEquity}
              sub={offer.equityTotal ? `${formatCurrency(offer.equityTotal)} over ${offer.vestingYears ?? 4} years` : 'No equity provided'}
            />
            <Row label="Estimated total comp" value={comp.totalCompensation} strong sub={comp.changeVsCurrent !== undefined ? `${formatPercent(comp.changeVsCurrent, 0, true)} vs. current` : undefined} />
          </div>
          {comp.annualEquity > 0 && (
            <p className="mt-3 flex gap-2 rounded-lg bg-caution-bg/60 px-3 py-2 text-xs leading-relaxed text-caution-fg">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Equity value is an estimate and may fluctuate or become worthless depending on company performance and liquidity.
              {!comp.equityIsLiquid && ' Private-company equity may not be sellable until an exit.'}
            </p>
          )}
        </div>
      </div>

      {(comp.signingBonus > 0 || (offer.relocation ?? 0) > 0) && (
        <div className="mt-5 rounded-xl bg-ink-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">One-time (not annualized)</p>
          {comp.signingBonus > 0 && <Row label="Signing bonus" value={comp.signingBonus} sub={`First-year total ≈ ${formatCurrency(comp.firstYearTotal)}`} />}
          {(offer.relocation ?? 0) > 0 && <Row label="Relocation package" value={offer.relocation!} muted />}
        </div>
      )}
    </Card>
  )
}
