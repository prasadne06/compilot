import { clsx } from 'clsx'
import { Check } from 'lucide-react'
import type { Option } from '../../data/options'

interface MultiSelectProps<T extends string> {
  options: Option<T>[]
  value: T[]
  onChange: (v: T[]) => void
  ariaLabel: string
  columns?: 1 | 2 | 3
  exclusive?: T[] // options that clear everything else when chosen
}

export function MultiSelect<T extends string>({ options, value, onChange, ariaLabel, columns = 2, exclusive = [] }: MultiSelectProps<T>) {
  const toggle = (v: T) => {
    if (value.includes(v)) return onChange(value.filter((x) => x !== v))
    if (exclusive.includes(v)) return onChange([v])
    onChange([...value.filter((x) => !exclusive.includes(x)), v])
  }
  return (
    <div role="group" aria-label={ariaLabel} className={clsx('grid gap-2', columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
      {options.map((o) => {
        const active = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(o.value)}
            className={clsx(
              'group flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all',
              active ? 'border-pine-500 bg-pine-50/60 ring-1 ring-pine-500' : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/50',
            )}
          >
            <span className={clsx('mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors', active ? 'border-pine-600 bg-pine-600 text-white' : 'border-ink-300 bg-white')}>
              {active && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink-900">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs text-ink-500">{o.hint}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
