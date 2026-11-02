import { Check } from 'lucide-react'
import type { CompanyStage } from '../../types'
import { COMPANY_TYPES, companyTypeValue } from '../../data/companyTypes'
import { cn } from '../../lib/cn'

/** Company type as four described choices with example companies, plus "Not sure". */
export function CompanyTypePicker({ value, onChange }: { value: CompanyStage; onChange: (v: CompanyStage) => void }) {
  const current = companyTypeValue(value)
  return (
    <div>
      <div id="stage" role="radiogroup" aria-label="Company type" className="grid gap-2.5 sm:grid-cols-2">
        {COMPANY_TYPES.map((t) => {
          const active = current === t.value
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(t.value)}
              className={cn(
                'relative rounded-xl border p-3.5 text-left transition-all',
                active ? 'border-pine-500 bg-pine-50/60 ring-1 ring-pine-500' : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/50',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink-900">{t.label}</span>
                <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-pine-600 bg-pine-600 text-white' : 'border-ink-300 bg-white')} aria-hidden>
                  {active && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                </span>
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-600">{t.summary}</span>
              <span className="mt-1.5 block text-xs leading-snug text-ink-500"><span className="font-medium text-ink-700">Pay: </span>{t.pay}</span>
              <span className="mt-1 block text-xs italic leading-snug text-ink-500">{t.examples}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <button
          type="button"
          role="radio"
          aria-checked={current === 'unknown'}
          onClick={() => onChange('unknown')}
          className={cn('rounded-full border px-2.5 py-1 font-medium transition-colors', current === 'unknown' ? 'border-pine-500 bg-pine-50 text-pine-800' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300')}
        >
          Not sure
        </button>
        <span>Examples are for illustration. A company’s type can change, e.g. when it goes public.</span>
      </div>
    </div>
  )
}
