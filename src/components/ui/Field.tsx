import { clsx } from 'clsx'
import { useState, type ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import { Check, CircleCheck, FileText, Info, X } from 'lucide-react'
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

/** Inline source + quick confirm for an autofilled field. */
function AutofillCheck({ autofill, label }: { autofill: FieldAutofill; label: string }) {
  const [expanded, setExpanded] = useState(false)
  const unsure = autofill.confidence !== 'high'
  return (
    <div className={clsx('rounded-lg border px-3 py-2', unsure ? 'border-caution-bd bg-caution-bg/50' : 'border-pine-200 bg-pine-50/60')}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className={clsx('flex items-center gap-1.5 text-[11px] font-semibold', unsure ? 'text-caution-fg' : 'text-pine-700')}>
          <FileText className="h-3 w-3 shrink-0" aria-hidden />
          {unsure ? 'From your letter · double-check' : 'From your letter'}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={autofill.onConfirm}
            aria-label={`${label} looks right`}
            className="inline-flex h-6 items-center gap-1 rounded-md bg-ink-900 px-2 text-[11px] font-medium text-white hover:bg-ink-800"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden /> Looks right
          </button>
          <button
            type="button"
            onClick={autofill.onClear}
            aria-label={`Clear ${label}`}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-ink-200 bg-white px-2 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
          >
            <X className="h-3 w-3" aria-hidden /> Clear
          </button>
        </div>
      </div>
      {autofill.evidence && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          title={expanded ? undefined : 'Show the full sentence'}
          className={clsx('mt-1 w-full break-words text-left text-xs italic leading-relaxed text-ink-600 hover:text-ink-800', !expanded && 'line-clamp-1')}
        >
          “{autofill.evidence}”
        </button>
      )}
      {autofill.note && <p className="mt-0.5 text-[11px] leading-snug text-caution-fg">{autofill.note}</p>}
    </div>
  )
}

export function Field({ label, htmlFor, hint, error, optional, info, className, autofill, children }: FieldProps) {
  const pending = autofill?.status === 'pending'
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
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
        <div className={clsx('rounded-lg ring-2 ring-offset-1', autofill.confidence === 'high' ? 'ring-pine-200' : 'ring-caution-bd')}>{children}</div>
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
  clsx(
    'h-11 w-full rounded-lg border bg-white px-3 text-[15px] text-ink-900 placeholder:text-ink-400 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-pine-500/30 focus:border-pine-500',
    invalid ? 'border-critical-fg/60' : 'border-ink-200 hover:border-ink-300',
    extra,
  )
