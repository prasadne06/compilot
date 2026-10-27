import { forwardRef, type InputHTMLAttributes } from 'react'
import { inputClass } from './Field'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  suffix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, suffix, className, ...rest }, ref) {
  if (suffix)
    return (
      <div className="relative">
        <input ref={ref} className={inputClass(invalid, `pr-14 ${className ?? ''}`)} aria-invalid={invalid || undefined} {...rest} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">{suffix}</span>
      </div>
    )
  return <input ref={ref} className={inputClass(invalid, className)} aria-invalid={invalid || undefined} {...rest} />
})

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | undefined
  onValueChange: (v: number | undefined) => void
  invalid?: boolean
  suffix?: string
}

export function NumberInput({ value, onValueChange, ...rest }: NumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onValueChange(v === '' ? undefined : Number(v))
      }}
      {...rest}
    />
  )
}
