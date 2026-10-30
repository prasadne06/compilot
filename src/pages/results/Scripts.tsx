import { useState } from 'react'
import { clsx } from 'clsx'
import { ArrowRight, RefreshCw, ShieldCheck, Sparkles, Wand2 } from 'lucide-react'
import { useEvaluation } from '../../state/EvaluationContext'
import { useAI } from '../../state/useAI'
import { generatePushback, generateScripts } from '../../services/ai'
import { Button, ButtonLink, Card, ErrorState, LoadingState } from '../../components/ui'
import { NegotiationScenario, ScriptCard, SourceTag } from '../../components/comp'
import type { ScriptChannel } from '../../types'
import { k } from '../../lib/format'

let requestedThisSession = false

export function Scripts() {
  const { aiContext } = useEvaluation()
  const [requested, setRequested] = useState(requestedThisSession)
  const ctx = requested ? aiContext : null
  const scripts = useAI('scripts', ctx, generateScripts)
  const pushback = useAI('pushback', ctx, generatePushback)
  const [active, setActive] = useState<ScriptChannel>('recruiter_call')

  if (!aiContext) return null

  const generate = () => {
    requestedThisSession = true
    setRequested(true)
  }

  if (!requested)
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center animate-fadeUp sm:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white"><Wand2 className="h-5 w-5" /></div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">Generate your negotiation scripts</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
          Six versions — recruiter call, email, hiring manager, short, collaborative and assertive — built around your {k(aiContext.target)} target and your real situation.
        </p>
        <Button size="lg" className="mt-6" onClick={generate} icon={<Sparkles className="h-4 w-4" />}>Generate My Script</Button>
        <p className="mx-auto mt-6 flex max-w-md items-start justify-center gap-2 text-left text-xs text-ink-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Scripts never invent competing offers or use pressure tactics. Only share details that are true and that you’re comfortable sharing.
        </p>
      </Card>
    )

  const current = scripts.result?.data.find((s) => s.id === active) ?? scripts.result?.data[0]

  return (
    <div className="space-y-10 animate-fadeUp">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Your scripts</h2>
            <p className="mt-0.5 text-sm text-ink-500">Pick a version, make it your own, and read it out loud once before the call.</p>
          </div>
          <div className="flex items-center gap-2">
            <SourceTag kind="ai" />
            {scripts.result && <Button size="sm" variant="ghost" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => { scripts.regenerate(); pushback.regenerate() }}>Regenerate</Button>}
          </div>
        </div>

        {scripts.loading && <Card className="mt-5 p-6"><LoadingState label="Writing your scripts…" lines={5} /></Card>}
        {scripts.error && <div className="mt-5"><ErrorState message={scripts.error} onRetry={scripts.regenerate} /></div>}
        {scripts.result && current && (
          <>
            <div className="-mx-4 mt-5 overflow-x-auto overflow-y-hidden no-scrollbar px-4 sm:mx-0 sm:px-0">
              <div role="tablist" aria-label="Script versions" className="flex min-w-max gap-2">
                {scripts.result.data.map((s) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={s.id === current.id}
                    onClick={() => setActive(s.id)}
                    className={clsx(
                      'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                      s.id === current.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900',
                    )}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4" role="tabpanel"><ScriptCard key={current.id} script={current} /></div>
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">What if they say no?</h2>
        <p className="mt-0.5 text-sm text-ink-500">Calm responses to common pushback — and what to ask for instead.</p>
        <div className="mt-5 space-y-3">
          {pushback.loading && <Card className="p-6"><LoadingState label="Preparing pushback responses…" /></Card>}
          {pushback.error && <ErrorState message={pushback.error} onRetry={pushback.regenerate} />}
          {pushback.result?.data.map((s, i) => <NegotiationScenario key={s.id} scenario={s} defaultOpen={i === 0} />)}
        </div>
      </section>

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink-900 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-base font-semibold">Practice before the real thing</p>
          <p className="mt-1 text-sm text-ink-300">Rehearse with an AI recruiter and get coaching on each response.</p>
        </div>
        <ButtonLink to="/practice" variant="secondary" iconRight={<ArrowRight className="h-4 w-4" />}>Start practicing</ButtonLink>
      </div>
    </div>
  )
}
