import { clsx } from 'clsx'
import { ShieldCheck } from 'lucide-react'

export const DISCLAIMER_TEXT =
  'This analysis is an estimate based on the information you provide and benchmark assumptions. Compensation varies by company, role, location, experience, market conditions, and individual circumstances. This information is for decision support and should not be treated as a guarantee of market value or financial advice.'

export function Disclaimer({ variant = 'full', className }: { variant?: 'full' | 'compact'; className?: string }) {
  if (variant === 'compact')
    return (
      <p className={clsx('flex items-start gap-2 text-xs leading-relaxed text-ink-500', className)}>
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium text-ink-700">AI-generated recommendation.</strong> Estimates use illustrative benchmark data and are not a guarantee of
          market value or financial advice.
        </span>
      </p>
    )
  return (
    <aside className={clsx('rounded-2xl border border-ink-200 bg-white/70 p-5', className)} aria-label="Disclaimer">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">AI-generated recommendation</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{DISCLAIMER_TEXT}</p>
        </div>
      </div>
    </aside>
  )
}
