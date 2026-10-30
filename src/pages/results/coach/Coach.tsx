import { useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowUp, Bot, RotateCcw, Sparkles, Square, UserRound } from 'lucide-react'
import { useEvaluation } from '../../../state/EvaluationContext'
import { CoachError, getClaude, runCoach, type CoachEngine, type CoachMessage, type CoachWorkspace } from '../../../services/ai/agent'
import { Button, Card, Tooltip } from '../../../components/ui'
import { k } from '../../../lib/format'
import { MiniMarkdown } from './MiniMarkdown'
import { ToolResult } from './ToolResult'
import { LogResponseForm, NegotiationTimeline } from './CoachSidebar'

const STORAGE_KEY = 'comppilot:coach:v1'
const newId = () => Math.random().toString(36).slice(2, 10)

function loadMessages(): CoachMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as CoachMessage[]) : []
    // A reply that was mid-stream when the page closed is shown as stopped
    return parsed.map((m) => (m.status === 'thinking' || m.status === 'streaming' ? { ...m, status: 'stopped' } : m))
  } catch {
    return []
  }
}

export function Coach() {
  const { inputs, analysis, counters, addCounter } = useEvaluation()
  const [messages, setMessages] = useState<CoachMessage[]>(loadMessages)
  const [draft, setDraft] = useState('')
  const [engine, setEngine] = useState<CoachEngine | 'connecting'>('connecting')
  const [notice, setNotice] = useState<string>()
  const ctl = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = messages.some((m) => m.status === 'thinking' || m.status === 'streaming')

  useEffect(() => {
    let live = true
    getClaude().then((s) => live && setEngine(s ? 'claude' : 'offline'))
    return () => { live = false; ctl.current?.abort() }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))) } catch { /* ignore */ }
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const suggestions = useMemo(() => {
    if (!analysis) return []
    const r = analysis.recommendation
    return [
      `They offered ${k(r.fallback)} base and a $10K signing bonus`,
      `What if base goes to ${k(r.target)}?`,
      `Why is my leverage ${analysis.leverage.score}?`,
      'Should I accept the current offer?',
    ]
  }, [analysis])

  if (!analysis) return null

  const patch = (id: string, p: Partial<CoachMessage> | ((m: CoachMessage) => Partial<CoachMessage>)) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)))

  const send = async (text: string, useEngine: CoachEngine = engine === 'claude' ? 'claude' : 'offline') => {
    const message = text.trim()
    if (!message || busy) return
    const history = messages
    const user: CoachMessage = { id: newId(), role: 'user', text: message }
    const reply: CoachMessage = { id: newId(), role: 'assistant', text: '', tools: [], status: 'thinking', engine: useEngine }
    setMessages((ms) => [...ms, user, reply])
    setDraft('')
    const controller = new AbortController()
    ctl.current = controller
    const ws: CoachWorkspace = { inputs, analysis, counters: [...counters], addCounter }
    try {
      const final = await runCoach(useEngine, history, message, ws, {
        onText: (t) => patch(reply.id, { text: t, status: 'streaming' }),
        onTool: (ev) => patch(reply.id, (m) => ({ tools: [...(m.tools ?? []), ev] })),
      }, controller.signal)
      patch(reply.id, { text: final, status: 'done' })
    } catch (e) {
      const err = e instanceof CoachError ? e : new CoachError('Something went wrong.', 'unknown', false)
      if (err.code === 'cancelled') {
        patch(reply.id, (m) => ({ text: err.partial ?? m.text, status: 'stopped' }))
      } else if (err.permanent && useEngine === 'claude') {
        // Claude can't be used in this view (e.g. access not allowed): answer with the offline coach instead
        setEngine('offline')
        setNotice('Claude isn’t available for this page, so you’re using the offline coach. It handles common questions with fixed rules.')
        setMessages((ms) => ms.filter((m) => m.id !== reply.id && m.id !== user.id))
        ctl.current = null
        setTimeout(() => send(message, 'offline'), 0)
        return
      } else {
        patch(reply.id, (m) => ({ text: err.partial ?? m.text, status: 'error', error: err.message }))
      }
    } finally {
      if (ctl.current === controller) ctl.current = null
      inputRef.current?.focus()
    }
  }

  const engineBadge =
    engine === 'connecting' ? (
      <span className="text-xs text-ink-400">Connecting…</span>
    ) : (
      <Tooltip
        side="bottom"
        content={
          engine === 'claude'
            ? 'Answers come from Claude, using your Claude account. Claude calls CompPilot’s own calculations for every number.'
            : 'The offline coach understands common requests with fixed rules. Open CompPilot in Claude to chat with Claude instead.'
        }
      >
        <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', engine === 'claude' ? 'border-pine-200 bg-pine-50 text-pine-700' : 'border-ink-200 bg-white text-ink-600')}>
          {engine === 'claude' ? <Sparkles className="h-3 w-3" aria-hidden /> : <Bot className="h-3 w-3" aria-hidden />}
          {engine === 'claude' ? 'Claude' : 'Offline coach'}
        </span>
      </Tooltip>
    )

  return (
    <div className="grid gap-6 animate-fadeUp lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Negotiation coach" className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink-900">Negotiation coach {engineBadge}</h2>
            <p className="mt-0.5 text-sm text-ink-500">Tell it what the company said, ask “what if…”, or ask why. Every number comes from CompPilot’s calculations.</p>
          </div>
          {messages.length > 0 && (
            <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => { ctl.current?.abort(); setMessages([]) }} disabled={busy}>
              New conversation
            </Button>
          )}
        </div>
        {notice && <p className="mt-3 rounded-lg border border-caution-bd bg-caution-bg px-3 py-2 text-xs text-caution-fg">{notice}</p>}

        <Card className="mt-4 overflow-hidden">
          <div ref={listRef} className="max-h-[62vh] min-h-[360px] space-y-5 overflow-y-auto bg-ink-50/40 p-4 sm:p-5" aria-live="polite">
            {messages.length === 0 && (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white"><Sparkles className="h-4 w-4" /></div>
                <p className="mt-3 text-sm font-medium text-ink-900">How can I help with your negotiation?</p>
                <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} disabled={engine === 'connecting'} className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[13px] text-ink-700 shadow-card hover:border-ink-300 hover:text-ink-900 disabled:opacity-50">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="ml-auto flex max-w-[85%] flex-row-reverse gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-600 text-white"><UserRound className="h-3.5 w-3.5" /></div>
                  <p className="whitespace-pre-line rounded-2xl rounded-tr-sm bg-ink-900 px-3.5 py-2.5 text-[14px] leading-relaxed text-white">{m.text}</p>
                </div>
              ) : (
                <div key={m.id} className="flex max-w-[92%] gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 ring-1 ring-ink-200"><Sparkles className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {(m.tools ?? []).map((t, i) => <ToolResult key={i} event={t} />)}
                    {m.status === 'thinking' && !m.text && (
                      <p className="flex items-center gap-2 text-[13px] text-ink-500"><Sparkles className="h-3.5 w-3.5 animate-pulse text-pine-600" />{(m.tools?.length ?? 0) > 0 ? 'Working it out…' : 'Thinking…'}</p>
                    )}
                    {m.text && (
                      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-card ring-1 ring-ink-200/70">
                        <MiniMarkdown text={m.text} />
                      </div>
                    )}
                    {m.status === 'stopped' && <p className="text-xs text-ink-400">Stopped.</p>}
                    {m.status === 'error' && (
                      <p className="flex flex-wrap items-center gap-2 text-xs text-critical-fg">
                        {m.error}
                        <button type="button" className="font-medium underline" onClick={() => {
                          const idx = messages.findIndex((x) => x.id === m.id)
                          const prompt = messages[idx - 1]?.text
                          setMessages((ms) => ms.filter((_, j) => j !== idx && j !== idx - 1))
                          if (prompt) setTimeout(() => send(prompt), 0)
                        }}>Try again</button>
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          <form className="border-t border-ink-200 bg-white p-3" onSubmit={(e) => { e.preventDefault(); void send(draft) }}>
            <div className="flex items-end gap-2">
              <label htmlFor="coach-input" className="sr-only">Message the coach</label>
              <textarea
                id="coach-input"
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft) } }}
                placeholder="e.g. They offered $205K + $10K signing"
                className="max-h-36 min-h-[44px] flex-1 resize-y rounded-xl border border-ink-200 px-3.5 py-2.5 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
              />
              {busy ? (
                <Button type="button" variant="secondary" size="lg" className="h-11 w-11 px-0" onClick={() => ctl.current?.abort()} aria-label="Stop"><Square className="h-3.5 w-3.5 fill-current" /></Button>
              ) : (
                <Button type="submit" size="lg" className="h-11 w-11 px-0" disabled={!draft.trim() || engine === 'connecting'} aria-label="Send"><ArrowUp className="h-4 w-4" /></Button>
              )}
            </div>
            <p className="mt-2 px-1 text-[11px] text-ink-400">AI coach. Suggestions, not guarantees. Market figures are illustrative estimates.</p>
          </form>
        </Card>
      </section>

      <aside className="space-y-4">
        <LogResponseForm onSubmit={(msg) => void send(msg)} disabled={busy || engine === 'connecting'} />
        <NegotiationTimeline />
      </aside>
    </div>
  )
}
