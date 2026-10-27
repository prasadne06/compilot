import { clsx } from 'clsx'
import { Check } from 'lucide-react'

export interface Step {
  label: string
  short?: string
}

export function ProgressStepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={s.label} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
              <span
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done && 'bg-pine-600 text-white',
                  active && 'bg-ink-900 text-white ring-4 ring-ink-900/10',
                  !done && !active && 'border border-ink-200 bg-white text-ink-400',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={clsx('hidden truncate text-[13px] font-medium md:block', active ? 'text-ink-900' : done ? 'text-ink-600' : 'text-ink-400')}>
                {s.label}
              </span>
              {i < steps.length - 1 && <span className={clsx('h-px flex-1', done ? 'bg-pine-300' : 'bg-ink-200')} aria-hidden />}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-[13px] text-ink-500 md:hidden">
        Step {current + 1} of {steps.length} · <span className="font-medium text-ink-800">{steps[current]?.label}</span>
      </p>
    </nav>
  )
}
