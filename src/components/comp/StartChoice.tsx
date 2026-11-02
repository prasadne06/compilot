import { PencilLine, Upload } from 'lucide-react'
import { cn } from '../../lib/cn'

export type StartMode = 'manual' | 'upload'

/** Two equal ways to begin: type the details, or upload an offer letter. */
export function StartChoice({ mode, onChange }: { mode: StartMode; onChange: (m: StartMode) => void }) {
  const options = [
    { value: 'manual' as const, Icon: PencilLine, title: 'Enter details', hint: 'Type your role and offer numbers. Takes about 4 minutes.', recommended: true },
    { value: 'upload' as const, Icon: Upload, title: 'Upload offer letter', hint: 'Optional. We fill the form from a PDF or Word file, and you confirm each value.', recommended: false },
  ]
  return (
    <section aria-label="How would you like to add your offer?" className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink-900">How would you like to add your offer?</h2>
      <div role="radiogroup" aria-label="How would you like to add your offer?" className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map(({ value, Icon, title, hint, recommended }) => {
          const active = mode === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(value)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                active ? 'border-pine-500 bg-pine-50/60 ring-1 ring-pine-500' : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/50',
              )}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-pine-600 text-white' : 'bg-ink-100 text-ink-600')}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-ink-900">{title}</span>
                  {recommended && (
                    <span className="rounded-full bg-pine-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white">Recommended</span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">{hint}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
