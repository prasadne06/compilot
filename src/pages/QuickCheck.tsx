import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Gauge, ListChecks, Timer } from 'lucide-react'
import { Button, Card, CurrencyInput, Field, Input, Select } from '../components/ui'
import { MarketRange } from '../components/comp'
import { analyzeOffer, isReadyForAnalysis } from '../engine'
import { EMPTY_INPUTS } from '../data/samplePersona'
import { LEVEL_OPTIONS, LOCATION_OPTIONS, TITLE_SUGGESTIONS } from '../data/options'
import { useEvaluation } from '../state/EvaluationContext'
import { k } from '../lib/format'
import { cn } from '../lib/cn'
import type { EvaluationInputs, JobLevel } from '../types'

interface Quick {
  title: string
  level: JobLevel | ''
  location: string
  base?: number
}

function toInputs(q: Quick): EvaluationInputs {
  const i = structuredClone(EMPTY_INPUTS)
  i.profile = { ...i.profile, jobTitle: q.title.trim(), level: q.level, location: q.location, industry: 'tech' }
  i.offer = { ...i.offer, role: q.title.trim(), level: q.level, base: q.base }
  return i
}

type Verdict = { tone: 'low' | 'mid' | 'high'; headline: string; body: string }

function verdictFor(base: number, p25: number, p75: number, target: number): Verdict {
  if (base < p25)
    return { tone: 'low', headline: 'Below the typical range', body: `There’s likely room to ask for more. Somewhere around ${k(target)} is a reasonable place to start.` }
  if (base > p75)
    return { tone: 'high', headline: 'Above the typical range', body: 'This is a strong base. You can still ask about signing bonus or equity, but the base is already competitive.' }
  return { tone: 'mid', headline: 'Within the typical range', body: `A fair offer. A polite ask for around ${k(target)} is common and rarely risky.` }
}

const TONE = {
  low: 'border-caution-bd bg-caution-bg text-caution-fg',
  mid: 'border-pine-200 bg-pine-50 text-pine-800',
  high: 'border-good-bd bg-good-bg text-good-fg',
}

/** Four fields, one verdict. The full evaluation is one click away with these details carried over. */
export function QuickCheck() {
  const { startWith } = useEvaluation()
  const navigate = useNavigate()
  const [q, setQ] = useState<Quick>({ title: '', level: '', location: '' })
  const [shown, setShown] = useState(false)
  const inputs = useMemo(() => toInputs(q), [q])
  const complete = !!q.level && isReadyForAnalysis(inputs)
  const a = useMemo(() => (complete ? analyzeOffer(inputs) : null), [complete, inputs])
  const set = (p: Partial<Quick>) => setQ((x) => ({ ...x, ...p }))
  const go = (to: string) => { startWith(inputs); navigate(to) }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-pine-700"><Timer className="h-3.5 w-3.5" aria-hidden />Quick check · about a minute</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">Is my base salary fair?</h1>
      <p className="mt-2 text-[15px] text-ink-600">Four details for a fast read. For bonus, equity and a negotiation plan, use the full evaluation.</p>

      <Card className="mt-6 p-5 sm:p-6">
        <form
          className="grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); if (complete) setShown(true) }}
        >
          <Field label="Job title" htmlFor="q-title" className="sm:col-span-2">
            <Input id="q-title" list="q-titles" placeholder="e.g. Senior Software Engineer" value={q.title} onChange={(e) => { set({ title: e.target.value }); setShown(false) }} />
            <datalist id="q-titles">{TITLE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Level" htmlFor="q-level">
            <Select id="q-level" options={LEVEL_OPTIONS} value={q.level} onValueChange={(v) => { set({ level: v as JobLevel }); setShown(false) }} />
          </Field>
          <Field label="Location" htmlFor="q-location" hint="US only for now">
            <Select id="q-location" options={LOCATION_OPTIONS} value={q.location} onValueChange={(v) => { set({ location: v }); setShown(false) }} />
          </Field>
          <Field label="Offered base salary" htmlFor="q-base" className="sm:col-span-2">
            <CurrencyInput id="q-base" placeholder="180,000" value={q.base} suffix="/ yr" onValueChange={(v) => { set({ base: v }); setShown(false) }} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!complete} iconRight={<ArrowRight className="h-4 w-4" />}>Check my offer</Button>
          </div>
        </form>
      </Card>

      {shown && a && q.base !== undefined && (() => {
        const r = a.benchmark.base
        const v = verdictFor(q.base, r.p25, r.p75, a.recommendation.target)
        return (
          <section aria-labelledby="q-verdict" className="mt-6 animate-fadeUp">
            <Card className="p-5 sm:p-6">
              <div className={cn('rounded-xl border px-4 py-3', TONE[v.tone])}>
                <h2 id="q-verdict" className="text-lg font-semibold">{v.headline}</h2>
                <p className="mt-1 text-sm">{v.body}</p>
              </div>
              <p className="mt-5 text-sm text-ink-500">Typical base for this role: <strong className="font-semibold text-ink-900 tabular">{k(r.p25)}–{k(r.p75)}</strong></p>
              <div className="mt-3">
                <MarketRange range={r} compact markers={[{ id: 'offer', label: 'Your offer', value: q.base, style: 'offer' }]} />
              </div>
              <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-400">
                <Gauge className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                A rough read from illustrative benchmark assumptions (tech industry, company type unknown). Not live market data.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => go('/evaluate/offer')} iconRight={<ArrowRight className="h-4 w-4" />}>Add bonus &amp; equity for a full evaluation</Button>
                <Button variant="secondary" icon={<ListChecks className="h-4 w-4" />} onClick={() => go('/results')}>See results with just this</Button>
              </div>
            </Card>
          </section>
        )
      })()}
    </div>
  )
}
