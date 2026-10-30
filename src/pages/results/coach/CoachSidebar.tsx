import { useState } from 'react'
import { Link } from 'react-router-dom'
import { History, Trash2 } from 'lucide-react'
import { useEvaluation } from '../../../state/EvaluationContext'
import { Button, Card, CurrencyInput, Field, Input, Modal } from '../../../components/ui'
import { formatCurrency as $, k } from '../../../lib/format'

/** Quick structured entry for what the company said; sent to the coach as a message. */
export function LogResponseForm({ onSubmit, disabled }: { onSubmit: (message: string) => void; disabled: boolean }) {
  const [base, setBase] = useState<number>()
  const [signing, setSigning] = useState<number>()
  const [equity, setEquity] = useState<number>()
  const [note, setNote] = useState('')
  const empty = base === undefined && signing === undefined && equity === undefined
  const submit = () => {
    const parts = [base !== undefined && `${$(base)} base`, signing !== undefined && `a ${$(signing)} signing bonus`, equity !== undefined && `${$(equity)} in equity`].filter(Boolean)
    onSubmit(`The company came back with ${parts.join(', ')}.${note.trim() ? ` ${note.trim()}` : ''}`)
    setBase(undefined); setSigning(undefined); setEquity(undefined); setNote('')
  }
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-ink-900">Log their response</h3>
      <p className="mt-0.5 text-xs text-ink-500">Enter what changed. Leave the rest blank.</p>
      <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); if (!empty) submit() }}>
        <Field label="Base salary" htmlFor="log-base"><CurrencyInput id="log-base" value={base} onValueChange={setBase} placeholder="e.g. 205,000" className="h-9 text-sm" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Signing bonus" htmlFor="log-signing"><CurrencyInput id="log-signing" value={signing} onValueChange={setSigning} placeholder="0" className="h-9 text-sm" /></Field>
          <Field label="Equity (total)" htmlFor="log-equity"><CurrencyInput id="log-equity" value={equity} onValueChange={setEquity} placeholder="0" className="h-9 text-sm" /></Field>
        </div>
        <Field label="What they said" htmlFor="log-note" optional><Input id="log-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Top of the band" className="h-9 text-sm" /></Field>
        <Button type="submit" size="sm" className="w-full" disabled={empty || disabled}>Evaluate their offer</Button>
      </form>
    </Card>
  )
}

export function NegotiationTimeline() {
  const { inputs, counters, removeCounter, adoptLatestTerms, analysis } = useEvaluation()
  const [confirm, setConfirm] = useState(false)
  if (!analysis) return null
  const o = inputs.offer
  const r = analysis.recommendation
  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900"><History className="h-4 w-4 text-ink-500" aria-hidden />Negotiation timeline</h3>
      <ol className="mt-3 space-y-0">
        <li className="relative border-l-2 border-ink-200 pb-3 pl-4">
          <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-ink-400" aria-hidden />
          <p className="text-xs font-medium text-ink-500">Original offer</p>
          <p className="text-sm font-semibold text-ink-900 tabular">{k(o.base)} base{o.signingBonus ? ` · ${k(o.signingBonus)} signing` : ''}{o.equityTotal ? ` · ${k(o.equityTotal)} equity` : ''}</p>
        </li>
        {counters.map((c, i) => (
          <li key={c.id} className="group relative border-l-2 border-pine-200 pb-3 pl-4 last:border-transparent">
            <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-pine-600" aria-hidden />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-500">Round {i + 1}</p>
                <p className="text-sm font-semibold text-ink-900 tabular">
                  {[c.base !== undefined && `${k(c.base)} base`, c.signingBonus !== undefined && `${k(c.signingBonus)} signing`, c.equityTotal !== undefined && `${k(c.equityTotal)} equity`, c.targetBonusPct !== undefined && `${c.targetBonusPct}% bonus`].filter(Boolean).join(' · ')}
                </p>
                {c.note && <p className="mt-0.5 truncate text-xs text-ink-500" title={c.note}>{c.note}</p>}
              </div>
              <button type="button" onClick={() => removeCounter(c.id)} className="shrink-0 rounded p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-700" aria-label={`Remove round ${i + 1}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {counters.length === 0 && <p className="text-xs text-ink-500">When the company responds, log it here or tell the coach.</p>}
      {counters.length > 0 && (
        <Button size="sm" variant="secondary" className="mt-1 w-full" onClick={() => setConfirm(true)}>Use latest terms as my offer</Button>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
        <div><dt className="text-[11px] text-ink-500">Target</dt><dd className="text-sm font-semibold text-ink-900 tabular">{k(r.target)}</dd></div>
        <div><dt className="text-[11px] text-ink-500">Fallback</dt><dd className="text-sm font-semibold text-ink-900 tabular">{k(r.fallback)}</dd></div>
        <div>
          <dt className="text-[11px] text-ink-500">Walk-away</dt>
          <dd className="text-sm font-semibold text-ink-900 tabular">{inputs.walkAway ? k(inputs.walkAway) : <Link to="/results/negotiation" className="text-xs font-medium text-pine-700 underline underline-offset-2">Set</Link>}</dd>
        </div>
      </dl>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Use the latest terms as your offer?"
        description="Your evaluation, scores and strategy will be recalculated from the newest terms, and the timeline will be cleared."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={() => { adoptLatestTerms(); setConfirm(false) }}>Update my offer</Button>
          </div>
        }
      >
        <p className="text-sm text-ink-600">Do this once you have a final offer you want to evaluate in full, for example before deciding whether to accept.</p>
      </Modal>
    </Card>
  )
}
