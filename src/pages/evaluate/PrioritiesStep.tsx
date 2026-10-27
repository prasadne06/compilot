import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { CurrencyInput, Field, Input, MultiSelect, Segmented } from '../../components/ui'
import { StepFrame } from '../../layouts/StepFrame'
import { useEvaluation } from '../../state/EvaluationContext'
import { BAND_OPTIONS, PRIORITY_OPTIONS, SITUATION_OPTIONS, labelFor } from '../../data/options'
import type { LeverageSituation, Priority } from '../../types'

const MAX_PRIORITIES = 5

function PriorityRanker({ value, onChange }: { value: Priority[]; onChange: (v: Priority[]) => void }) {
  const toggle = (p: Priority) => {
    if (value.includes(p)) onChange(value.filter((x) => x !== p))
    else if (value.length < MAX_PRIORITIES) onChange([...value, p])
  }
  const move = (i: number, d: -1 | 1) => {
    const next = [...value]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <div>
        <p className="mb-3 text-[13px] text-ink-500">Tap in order of importance (up to {MAX_PRIORITIES}).</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Priorities">
          {PRIORITY_OPTIONS.map((o) => {
            const idx = value.indexOf(o.value)
            const active = idx >= 0
            const disabled = !active && value.length >= MAX_PRIORITIES
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => toggle(o.value)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all',
                  active ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300',
                  disabled && 'opacity-40',
                )}
              >
                {active && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-ink-900">{idx + 1}</span>}
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Your ranking</p>
        {value.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-ink-400">Nothing selected yet</p>
        ) : (
          <ol className="space-y-1.5">
            {value.map((p, i) => (
              <li key={p} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-card ring-1 ring-ink-200/70">
                <span className="w-4 text-sm font-semibold text-ink-400 tabular">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-ink-900">{labelFor(PRIORITY_OPTIONS, p)}</span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30" aria-label={`Move ${labelFor(PRIORITY_OPTIONS, p)} up`}><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30" aria-label={`Move ${labelFor(PRIORITY_OPTIONS, p)} down`}><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => toggle(p)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Remove ${labelFor(PRIORITY_OPTIONS, p)}`}><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export function PrioritiesStep() {
  const { inputs, updateLeverage, setPriorities, ready } = useEvaluation()
  const l = inputs.leverage
  const navigate = useNavigate()
  const hasAlt = l.situations.some((s) => ['verbal_offer', 'written_offer', 'multiple_offers'].includes(s))

  return (
    <StepFrame
      eyebrow="Step 3 · Leverage & priorities"
      title="Your position and what matters"
      description="Leverage shapes how much to ask for. Priorities shape what to ask for. Be honest — the strategy is only as good as the inputs."
      onBack={() => navigate('/evaluate/offer')}
      nextLabel="See my evaluation"
      onNext={() => navigate(ready ? '/results' : '/evaluate/about-you')}
    >
      <section className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">How much negotiating leverage do you have?</h2>
        <p className="mt-1 text-[13px] text-ink-500">Select all that apply.</p>
        <div className="mt-5">
          <MultiSelect<LeverageSituation>
            ariaLabel="Leverage situation"
            options={SITUATION_OPTIONS}
            value={l.situations}
            exclusive={['none']}
            onChange={(v) => updateLeverage({ situations: v })}
          />
        </div>

        {hasAlt && (
          <div className="mt-6 grid gap-5 rounded-xl bg-ink-50 p-4 sm:grid-cols-2 animate-fadeUp">
            <p className="text-[13px] text-ink-600 sm:col-span-2">
              About your competing offer — used to calibrate your target. Scripts will only reference it the way you describe it here.
            </p>
            <Field label="Company" htmlFor="ccompany" optional>
              <Input id="ccompany" placeholder="Company name" value={l.competing.company} onChange={(e) => updateLeverage({ competing: { ...l.competing, company: e.target.value } })} />
            </Field>
            <Field label="Competing base salary" htmlFor="cbase2" optional>
              <CurrencyInput id="cbase2" placeholder="210,000" value={l.competing.base} onValueChange={(v) => updateLeverage({ competing: { ...l.competing, base: v } })} suffix="/ yr" />
            </Field>
          </div>
        )}

        <div className="mt-6 grid gap-5 border-t border-ink-100 pt-6 sm:grid-cols-2">
          <Field label="Has the company said anything about flexibility?">
            <Segmented ariaLabel="Band flexibility" options={BAND_OPTIONS} value={l.bandSignal} onChange={(v) => updateLeverage({ bandSignal: v })} />
          </Field>
          <Field label="Specialized expertise" info="Skills that are rare or directly critical to this role — be honest with yourself.">
            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 hover:border-ink-300">
              <input type="checkbox" className="h-4 w-4 rounded border-ink-300 accent-pine-600" checked={l.uniqueExpertise} onChange={(e) => updateLeverage({ uniqueExpertise: e.target.checked })} />
              I bring hard-to-find expertise for this role
            </label>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">What matters most to you?</h2>
        <p className="mt-1 text-[13px] text-ink-500">Your top three priorities influence the offer score and which levers we suggest.</p>
        <div className="mt-5">
          <PriorityRanker value={inputs.priorities} onChange={setPriorities} />
        </div>
      </section>
    </StepFrame>
  )
}
