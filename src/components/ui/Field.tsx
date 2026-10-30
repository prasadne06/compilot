import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import { FileCheck2, Info } from 'lucide-react'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  optional?: boolean
  info?: string
  className?: string
  /** 'pending' = autofilled and still needs checking; 'filled' = autofilled and checked */
  autofill?: 'pending' | 'filled'
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, optional, info, className, autofill, children }: FieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-800">
          {label}
        </label>
        {optional && <span className="text-xs text-ink-400">Optional</span>}
        {info && (
          <Tooltip content={info}>
            <Info className="h-3.5 w-3.5 text-ink-400" aria-label={info} />
          </Tooltip>
        )}
        {autofill === 'pending' && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-caution-bg px-2 py-0.5 text-[11px] font-medium text-caution-fg ring-1 ring-caution-bd">
            <FileCheck2 className="h-3 w-3" aria-hidden /> From your letter · check this
          </span>
        )}
        {autofill === 'filled' && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-pine-700">
            <FileCheck2 className="h-3 w-3" aria-hidden /> From your letter
          </span>
        )}
      </div>
      {autofill === 'pending' ? <div className="rounded-lg ring-2 ring-caution-bd ring-offset-1">{children}</div> : children}
      {error ? (
        <p className="text-xs text-critical-fg" role="alert">{error}</p>
      ) : hint ? (
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
