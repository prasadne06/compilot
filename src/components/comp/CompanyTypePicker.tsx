import { useState } from 'react'
import { Check } from 'lucide-react'
import type { CompanyStage } from '../../types'
import { COMPANY_TYPES, companyTypeValue } from '../../data/companyTypes'
import { cn } from '../../lib/cn'
import { Modal } from '../ui'

/** The longer explanation of each company type, opened on request. */
function CompanyTypeGuide() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">
        What’s the difference?
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Company types" description="Company type shapes typical pay, bonus and equity, and how much the equity counts.">
        <dl className="space-y-4">
          {COMPANY_TYPES.map((t) => (
            <div key={t.value}>
              <dt className="text-sm font-semibold text-ink-900">{t.label}</dt>
              <dd className="mt-1 space-y-1 text-[13px] leading-relaxed text-ink-600">
                <p>{t.summary}</p>
                <p><span className="font-medium text-ink-800">Pay: </span>{t.pay}</p>
                <p className="italic text-ink-500">{t.examples}</p>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs text-ink-500">Examples are for illustration. A company’s type can change, for example when it goes public.</p>
      </Modal>
    </>
  )
}

/** Company type as four short choices with example names, plus "Not sure". */
export function CompanyTypePicker({ value, onChange }: { value: CompanyStage; onChange: (v: CompanyStage) => void }) {
  const current = companyTypeValue(value)
  return (
    <div>
      <div id="stage" role="radiogroup" aria-label="Company type" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                'flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all',
                active ? 'border-pine-500 bg-pine-50/60 ring-1 ring-pine-500' : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/50',
              )}
            >
              <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-pine-600 bg-pine-600 text-white' : 'border-ink-300 bg-white')} aria-hidden>
                {active && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">{t.label}</span>
                <span className="block text-[13px] text-ink-600">{t.tagline}</span>
                <span className="mt-0.5 block text-xs text-ink-400">{t.shortExamples}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={current === 'unknown'}
          onClick={() => onChange('unknown')}
          className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition-colors', current === 'unknown' ? 'border-pine-500 bg-pine-50 text-pine-800' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300')}
        >
          Not sure
        </button>
        <CompanyTypeGuide />
      </div>
    </div>
  )
}
