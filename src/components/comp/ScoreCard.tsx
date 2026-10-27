import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Card, Tooltip } from '../ui'
import { Meter } from './Meter'
import { SourceTag, type SourceKind } from './SourceTag'

interface ScoreCardProps {
  label: string
  value: ReactNode
  suffix?: string
  meter?: { value: number; max?: number }
  caption: ReactNode
  info?: string
  source?: SourceKind
  footer?: ReactNode
}

export function ScoreCard({ label, value, suffix, meter, caption, info, source, footer }: ScoreCardProps) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink-600">
          {label}
          {info && (
            <Tooltip content={info}>
              <Info className="h-3.5 w-3.5 text-ink-400" aria-label={`About ${label}`} />
            </Tooltip>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[32px] font-semibold leading-none tracking-tight text-ink-900 tabular">{value}</span>
        {suffix && <span className="text-sm text-ink-400 tabular">{suffix}</span>}
      </div>
      {meter && <Meter className="mt-4" value={meter.value} max={meter.max} label={label} />}
      <p className="mt-3 text-[13px] leading-snug text-ink-500">{caption}</p>
      {(footer || source) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          {footer ?? <span />}
          {source && <SourceTag kind={source} label={source === 'data' ? 'Benchmark' : undefined} />}
        </div>
      )}
    </Card>
  )
}
