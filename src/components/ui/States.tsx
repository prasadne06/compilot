import type { ReactNode } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-600">{icon}</div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Generating…', lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="flex items-center gap-2 text-[13px] text-ink-500">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-pine-600" aria-hidden />
        {label}
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-critical-bd bg-critical-bg px-4 py-3 text-sm text-critical-fg">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">We couldn’t generate this right now.</p>
        <p className="mt-0.5 opacity-80">{message}</p>
      </div>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
    </div>
  )
}
