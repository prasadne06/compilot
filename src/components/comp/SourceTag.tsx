import { cn } from '../../lib/cn'
import { Calculator, Database, Sparkles, User } from 'lucide-react'
import { Tooltip } from '../ui'

export type SourceKind = 'data' | 'ai' | 'calc' | 'input'

const META: Record<SourceKind, { label: string; tip: string; cls: string; Icon: typeof Database }> = {
  data: { label: 'Illustrative benchmark', tip: 'Estimated using illustrative benchmark assumptions — not live or verified market data.', cls: 'border-ink-200 bg-ink-50 text-ink-600', Icon: Database },
  calc: { label: 'Calculated', tip: 'Deterministic calculation from your inputs and the benchmark model. No AI involved.', cls: 'border-ink-200 bg-white text-ink-600', Icon: Calculator },
  ai: { label: 'AI interpretation', tip: 'AI-generated explanation or suggestion. Treat as one perspective, not a fact.', cls: 'border-pine-200 bg-pine-50 text-pine-700', Icon: Sparkles },
  input: { label: 'Your input', tip: 'Provided by you. CompPilot does not verify it.', cls: 'border-ink-200 bg-white text-ink-600', Icon: User },
}

export function SourceTag({ kind, className, label }: { kind: SourceKind; className?: string; label?: string }) {
  const m = META[kind]
  return (
    <Tooltip content={m.tip}>
      <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium', m.cls, className)}>
        <m.Icon className="h-3 w-3" aria-hidden />
        {label ?? m.label}
      </span>
    </Tooltip>
  )
}
