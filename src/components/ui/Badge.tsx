import { cn } from '../../lib/cn'
import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'good' | 'caution' | 'serious' | 'critical' | 'pine' | 'dark'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  good: 'bg-good-bg text-good-fg border-good-bd',
  caution: 'bg-caution-bg text-caution-fg border-caution-bd',
  serious: 'bg-serious-bg text-serious-fg border-serious-bd',
  critical: 'bg-critical-bg text-critical-fg border-critical-bd',
  pine: 'bg-pine-50 text-pine-700 border-pine-200',
  dark: 'bg-ink-900 text-white border-ink-900',
}

export function Badge({ tone = 'neutral', children, icon, className }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone], className)}>
      {icon}
      {children}
    </span>
  )
}
