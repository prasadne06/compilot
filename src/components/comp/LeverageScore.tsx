import { Check, Minus } from 'lucide-react'
import type { NegotiationLeverage } from '../../types'
import { LEVERAGE_BASELINE } from '../../engine'

export function LeverageFactors({ leverage }: { leverage: NegotiationLeverage }) {
  const strengths = leverage.factors.filter((f) => f.kind === 'strength')
  const weaknesses = leverage.factors.filter((f) => f.kind === 'weakness')
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="text-[13px] font-semibold text-ink-900">Why your leverage is {leverage.label.toLowerCase()}</h4>
        <ul className="mt-3 space-y-3">
          {strengths.length === 0 && <li className="text-sm text-ink-500">No clear leverage factors from your inputs yet.</li>}
          {strengths.map((f) => (
            <li key={f.label} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-good-bg text-good-fg"><Check className="h-3 w-3" strokeWidth={3} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900">{f.label}</p>
                  <span className="shrink-0 text-xs font-semibold text-good-fg tabular">+{f.points}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-[13px] font-semibold text-ink-900">Potential weaknesses</h4>
        <ul className="mt-3 space-y-3">
          {weaknesses.length === 0 && <li className="text-sm text-ink-500">Nothing notable from your inputs.</li>}
          {weaknesses.map((f) => (
            <li key={f.label} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500"><Minus className="h-3 w-3" strokeWidth={3} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900">{f.label}</p>
                  <span className="shrink-0 text-xs font-semibold text-ink-500 tabular">{f.points}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-ink-400 md:col-span-2">
        Transparent model: everyone starts at {LEVERAGE_BASELINE} points; each factor adds or subtracts. Score is capped between 5 and 97.
      </p>
    </div>
  )
}
