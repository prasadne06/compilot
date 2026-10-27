import { useState, type InputHTMLAttributes } from 'react'
import { inputClass } from './Field'

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | undefined
  onValueChange: (v: number | undefined) => void
  invalid?: boolean
  suffix?: string
}

const fmt = (n: number | undefined) => (n === undefined ? '' : n.toLocaleString('en-US'))

/** Parses "195000", "195,000", "$195k", "1.2m". */
export function parseCurrency(raw: string): number | undefined {
  const s = raw.trim().toLowerCase().replace(/[$,\s]/g, '')
  if (!s) return undefined
  const m = s.match(/^(\d*\.?\d+)([km])?$/)
  if (!m) return undefined
  const n = parseFloat(m[1]) * (m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : 1)
  return Number.isFinite(n) ? Math.round(n) : undefined
}

export function CurrencyInput({ value, onValueChange, invalid, suffix, className, onBlur, ...rest }: CurrencyInputProps) {
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-400">$</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={inputClass(invalid, `pl-7 tabular ${suffix ? 'pr-16' : ''} ${className ?? ''}`)}
        value={focused ? text : fmt(value)}
        aria-invalid={invalid || undefined}
        onFocus={() => {
          setText(fmt(value))
          setFocused(true)
        }}
        onChange={(e) => {
          setText(e.target.value)
          onValueChange(parseCurrency(e.target.value))
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">{suffix}</span>}
    </div>
  )
}
