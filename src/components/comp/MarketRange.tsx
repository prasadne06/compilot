import { clsx } from 'clsx'
import type { MarketRange as Range } from '../../types'
import { k } from '../../lib/format'

export interface RangeMarker {
  id: string
  label: string
  value: number
  style: 'offer' | 'target' | 'competing' | 'current'
}

const markerStyle: Record<RangeMarker['style'], string> = {
  offer: 'bg-ink-900 ring-white',
  target: 'bg-pine-600 ring-white',
  competing: 'bg-white ring-ink-700 !ring-2',
  current: 'bg-ink-300 ring-white',
}

/** Horizontal illustrative range with IQR band, median tick and labeled markers. */
export function MarketRange({ range, markers, compact = false }: { range: Range; markers: RangeMarker[]; compact?: boolean }) {
  const values = [range.low, range.high, ...markers.map((m) => m.value)]
  const min = Math.min(...values) * 0.97
  const max = Math.max(...values) * 1.03
  const pos = (v: number) => ((v - min) / (max - min)) * 100

  // Stagger marker labels into rows to avoid collisions
  const sorted = [...markers].sort((a, b) => a.value - b.value)
  const rows: number[] = []
  const lastInRow: number[] = []
  sorted.forEach((m, i) => {
    const p = pos(m.value)
    let r = 0
    while (lastInRow[r] !== undefined && p - lastInRow[r] < 17) r++
    rows[i] = r
    lastInRow[r] = p
  })
  const rowCount = Math.max(1, ...rows.map((r) => r + 1))

  return (
    <div className="w-full">
      <div className="relative" style={{ height: rowCount * 34 + 6 }}>
        {sorted.map((m, i) => (
          <div
            key={m.id}
            className="absolute -translate-x-1/2 whitespace-nowrap text-center"
            style={{ left: `clamp(36px, ${pos(m.value)}%, calc(100% - 36px))`, bottom: rows[i] * 34 }}
          >
            <div className="text-[11px] font-medium leading-tight text-ink-500">{m.label}</div>
            <div className="text-[13px] font-semibold leading-tight text-ink-900 tabular">{k(m.value)}</div>
          </div>
        ))}
      </div>

      <div className="relative mt-2 h-10" role="img" aria-label={`Illustrative range ${k(range.low)} to ${k(range.high)}, median ${k(range.median)}. ${markers.map((m) => `${m.label} ${k(m.value)}`).join(', ')}.`}>
        {/* full range */}
        <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-ink-100" style={{ left: `${pos(range.low)}%`, width: `${pos(range.high) - pos(range.low)}%` }} />
        {/* interquartile band */}
        <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-pine-200" style={{ left: `${pos(range.p25)}%`, width: `${pos(range.p75) - pos(range.p25)}%` }} />
        {/* median tick */}
        <div className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pine-700" style={{ left: `${pos(range.median)}%` }} title={`Median ${k(range.median)}`} />
        {markers.map((m) => (
          <div key={m.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos(m.value)}%` }} title={`${m.label}: ${k(m.value)}`}>
            {(rows[sorted.indexOf(m)] ?? 0) > 0 && <div className="absolute bottom-3 left-1/2 w-px -translate-x-1/2 bg-ink-300" style={{ height: (rows[sorted.indexOf(m)] ?? 0) * 34 }} />}
            <div className={clsx('h-3.5 w-3.5 rounded-full ring-[3px] shadow-sm', markerStyle[m.style])} />
          </div>
        ))}
      </div>

      {!compact && (
        <dl className="mt-4 grid grid-cols-5 gap-1 border-t border-ink-100 pt-4 text-center">
          {[
            ['Low', range.low],
            ['25th', range.p25],
            ['Median', range.median],
            ['75th', range.p75],
            ['High', range.high],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{l}</dt>
              <dd className={clsx('mt-0.5 text-sm tabular', l === 'Median' ? 'font-semibold text-ink-900' : 'text-ink-700')}>{k(v as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-pine-200" />25th–75th percentile</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 rounded-full bg-pine-700" />Median</span>
        {markers.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1.5">
            <span className={clsx('h-2.5 w-2.5 rounded-full ring-2', markerStyle[m.style])} />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}
