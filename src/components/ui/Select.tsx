import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import type { Option } from '../../data/options'
import { inputClass } from './Field'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Option[]
  placeholder?: string
  invalid?: boolean
  onValueChange: (v: string) => void
}

export function Select({ options, placeholder = 'Select…', invalid, onValueChange, value, className, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={inputClass(invalid, `appearance-none pr-9 ${value ? '' : 'text-ink-400'} ${className ?? ''}`)}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink-900">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: { options: Option<T>[]; value: T | ''; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid h-11 auto-cols-fr grid-flow-col gap-1 rounded-lg border border-ink-200 bg-ink-50 p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-md text-sm font-medium transition-all ${active ? 'bg-white text-ink-900 shadow-card ring-1 ring-ink-200' : 'text-ink-500 hover:text-ink-800'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
