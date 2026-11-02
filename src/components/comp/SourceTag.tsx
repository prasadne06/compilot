import { cn } from '../../lib/cn'
import { Calculator, Database, Sparkles, User } from 'lucide-react'
import { Tooltip } from '../ui'

export type SourceKind = 'data' | 'ai' | 'calc' | 'input'

const META: Record<SourceKind, { label: string; tip: string; Icon: typeof Database }> = {
  data: { label: 'Illustrative benchmark', tip: 'Estimated from illustrative benchmark assumptions, not live or verified market data.', Icon: Database },
  calc: { label: 'Calculated', tip: 'A fixed calculation from your inputs and the benchmark model. No AI involved.', Icon: Calculator },
  ai: { label: 'AI interpretation', tip: 'Written by AI from the calculated results. One perspective, not a fact.', Icon: Sparkles },
  input: { label: 'Your input', tip: 'Provided by you. CompPilot does not verify it.', Icon: User },
}

/** A quiet icon that says where a number or text comes from. Details are in the tooltip. */
export function SourceTag({ kind, className, label }: { kind: SourceKind; className?: string; label?: string }) {
  const m = META[kind]
  const name = label ?? m.label
  return (
    <Tooltip content={<><strong className="font-semibold">{name}.</strong> {m.tip}</>}>
      <span className={cn('inline-flex h-5 w-5 items-center justify-center text-ink-400 hover:text-ink-600', className)} aria-label={`Source: ${name}`} role="img">
        <m.Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Tooltip>
  )
}
