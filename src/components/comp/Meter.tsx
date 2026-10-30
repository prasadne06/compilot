import { cn } from '../../lib/cn'

/** Thin single-hue progress meter. */
export function Meter({ value, max = 100, className, tone = 'ink', label }: { value: number; max?: number; className?: string; tone?: 'ink' | 'pine'; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink-100', className)} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone === 'pine' ? 'bg-pine-500' : 'bg-ink-800')} style={{ width: `${pct}%` }} />
    </div>
  )
}
