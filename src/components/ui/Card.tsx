import { clsx } from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-2xl border border-ink-200/80 bg-white shadow-card', className)} {...rest} />
}

export function CardHeader({ title, eyebrow, action, description }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
        <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500', className)}>{children}</div>
}
