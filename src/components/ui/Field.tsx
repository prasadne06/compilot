import { cn } from '../../lib/cn'
import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import { Check, CircleCheck, Info, X } from 'lucide-react'
import type { MatchQuality } from '../../types'

/** A value filled in from an uploaded offer letter, with where it came from. */
export interface FieldAutofill {
  status: 'pending' | 'confirmed'
  evidence?: string
  confidence?: MatchQuality
  note?: string
  onConfirm: () => void
  onClear: () => void
}

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  optional?: boolean
  info?: string
  className?: string
  autofill?: FieldAutofill
  children: ReactNode
}

/** One-line source + quick confirm for an autofilled field; the source sentence lives in a tooltip. */
function AutofillCheck({ autofill, label }: { autofill: FieldAutofill; label: string }) {
  const unsure = autofill.confidence !== 'high'
  const source = (
    <span className="block space-y-1.5">
      <span className="block font-semibold text-white">{unsure ? 'From your letter · please double-check' : 'From your letter'}</span>
      {autofill.evidence && <span className="block break-words italic">“{autofill.evidence}”</span>}
      {autofill.note && <span className="block text-caution-bd">{autofill.note}</span>}
    </span>
  )
  return (
    <div className="flex items-center gap-3 text-xs">
      <Tooltip content={source}>
        <Info className="h-3.5 w-3.5 text-ink-400 hover:text-ink-700" aria-label={`Where ${label} came from`} />
      </Tooltip>
      <button type="button" onClick={autofill.onConfirm} aria-label={`${label} looks right`} className="inline-flex items-center gap-1 font-medium text-pine-700 hover:text-pine-900 hover:underline">
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden /> Looks right
      </button>
      <button type="button" onClick={autofill.onClear} aria-label={`Clear ${label}`} className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-800 hover:underline">
        <X className="h-3 w-3" aria-hidden /> Clear
      </button>
    </div>
  )
}

export function Field({ label, htmlFor, hint, error, optional, info, className, autofill, children }: FieldProps) {
  const pending = autofill?.status === 'pending'
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-800">
          {label}
        </label>
        {optional && !autofill && <span className="text-xs text-ink-400">Optional</span>}
        {info && (
          <Tooltip content={info}>
            <Info className="h-3.5 w-3.5 text-ink-400" aria-label={info} />
          </Tooltip>
        )}
        {autofill?.status === 'confirmed' && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-pine-700">
            <CircleCheck className="h-3 w-3" aria-hidden /> Confirmed from your letter
          </span>
        )}
      </div>
      {pending ? (
        <div className="rounded-lg ring-1 ring-pine-300">{children}</div>
      ) : (
        children
      )}
      {pending && <AutofillCheck autofill={autofill} label={label} />}
      {error ? (
        <p className="text-xs text-critical-fg" role="alert">{error}</p>
      ) : hint && !pending ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const inputClass = (invalid?: boolean, extra?: string) =>
  cn(
    'h-11 w-full rounded-lg border bg-white px-3 text-[15px] text-ink-900 placeholder:text-ink-400 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-pine-500/30 focus:border-pine-500',
    invalid ? 'border-critical-fg/60' : 'border-ink-200 hover:border-ink-300',
    extra,
  )
