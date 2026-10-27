import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui'

interface StepFrameProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  aside?: ReactNode
}

export function StepFrame({ eyebrow, title, description, children, onBack, onNext, nextLabel = 'Continue', aside }: StepFrameProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onNext()
  }
  return (
    <form onSubmit={submit} noValidate className="animate-fadeUp">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-pine-700">{eyebrow}</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[32px]">{title}</h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-500">{description}</p>
        </div>
        {aside}
      </div>
      <div className="mt-8 space-y-6">{children}</div>
      <div className="sticky bottom-0 -mx-4 mt-10 flex items-center justify-between gap-3 border-t border-ink-200/70 bg-ink-50/90 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
        ) : <span />}
        <Button type="submit" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>{nextLabel}</Button>
      </div>
    </form>
  )
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-ink-500">{description}</p>}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}
