export function formatCurrency(value: number | undefined, opts: { compact?: boolean } = {}): string {
  if (value === undefined || Number.isNaN(value)) return '—'
  if (opts.compact) {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
    if (abs >= 1_000) {
      const k = value / 1_000
      // Whole thousands above $100K avoid false precision
      if (abs >= 100_000) return `$${Math.round(k)}K`
      return `$${Number.isInteger(Math.round(k * 10) / 10) ? Math.round(k) : k.toFixed(1)}K`
    }
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export const k = (v: number | undefined) => formatCurrency(v, { compact: true })

export function formatPercent(fraction: number, digits = 0, signed = false): string {
  const v = (fraction * 100).toFixed(digits)
  return `${signed && fraction > 0 ? '+' : ''}${v}%`
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function roundSalary(value: number): number {
  return value >= 100_000 ? roundTo(value, 5_000) : roundTo(value, 1_000)
}
