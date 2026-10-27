import { useId, useState, type ReactNode } from 'react'
import { clsx } from 'clsx'

export function Tooltip({ content, children, side = 'top', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom'; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span
      className={clsx('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span tabIndex={0} aria-describedby={open ? id : undefined} className="inline-flex cursor-help rounded focus-visible:ring-2">
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={clsx(
            'pointer-events-none absolute left-1/2 z-50 w-64 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-50 shadow-lift animate-fadeUp',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
