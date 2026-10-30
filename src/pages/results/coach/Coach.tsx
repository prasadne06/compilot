import { useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { Bot, Briefcase, CircleHelp, CircleStop, FlaskConical, Handshake, History, Lightbulb, MessageSquarePlus, MessagesSquare, PenLine, RotateCw, Scale, SendHorizontal, ShieldCheck, Sparkles, User } from 'lucide-react'
import { useEvaluation } from '../../../state/EvaluationContext'
import { CoachError, getClaude, runCoach, type CoachEngine, type CoachMessage, type CoachWorkspace } from '../../../services/ai/agent'
import { coachSuggestions, type SuggestionKind } from '../../../services/ai/agent/suggestions'
import { loadConversation, saveConversation } from '../../../state/coachHistory'
import { Button, Card, Tooltip } from '../../../components/ui'
import { k } from '../../../lib/format'
import { MiniMarkdown } from './MiniMarkdown'
import { ToolResult } from './ToolResult'
import { LogResponseForm, NegotiationTimeline } from './CoachSidebar'

const newId = () => Math.random().toString(36).slice(2, 10)

const KIND_ICON: Record<SuggestionKind, typeof Handshake> = {
  counter: Handshake, what_if: FlaskConical, why: CircleHelp, decide: Scale, draft: PenLine, plan: Lightbulb,
}

function SuggestionChip({ kind, text, onPick, disabled }: { kind: SuggestionKind; text: string; onPick: (t: string) => void; disabled: boolean }) {
  const Icon = KIND_ICON[kind]
  return (
    <button type="button" onClick={() => onPick(text)} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-left text-[13px] text-ink-700 shadow-card transition-colors hover:border-pine-300 hover:text-ink-900 disabled:opacity-50">
      <Icon className="h-3.5 w-3.5 shrink-0 text-pine-600" aria-hidden />
      {text}
    </button>
  )
}

export function Coach() {
  const { inputs, analysis, counters, addCounter, offerKey } = useEvaluation()
  // One conversation per offer: switching offers loads that offer's conversation
  const [conv, setConv] = useState(() => {
    const messages = loadConversation(offerKey)
    return { key: offerKey, messages, restored: messages.length > 0 }
  })
  if (conv.key !== offerKey) {
    const restoredMessages = loadConversation(offerKey)
    setConv({ key: offerKey, messages: restoredMessages, restored: restoredMessages.length > 0 })
  }
  const messages = conv.messages
  const setMessages = (fn: CoachMessage[] | ((m: CoachMessage[]) => CoachMessage[])) =>
    setConv((c) => ({ ...c, messages: typeof fn === 'function' ? fn(c.messages) : fn }))
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
    saveConversation(conv.key, conv.messages)
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conv])

  const asked = useMemo(() => messages.filter((m) => m.role === 'user').map((m) => m.text), [messages])
  const suggestions = useMemo(
    () => (analysis ? coachSuggestions(inputs, analysis, counters, asked, messages.length ? 3 : 4) : []),
    [inputs, analysis, counters, asked, messages.length],
  )
  const last = messages[messages.length - 1]

  if (!analysis) return null

  const patch = (id: string, p: Partial<CoachMessage> | ((m: CoachMessage) => Partial<CoachMessage>)) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)))

  const send = async (text: string, useEngine: CoachEngine = engine === 'claude' ? 'claude' : 'offline') => {
    const message = text.trim()
    if (!message || busy) return
    const history = messages
    const user: CoachMessage = { id: newId(), role: 'user', text: message }
    const reply: CoachMessage = { id: newId(), role: 'assistant', text: '', tools: [], status: 'thinking', engine: useEngine }
    setConv((c) => ({ ...c, messages: [...c.messages, user, reply], restored: false }))
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
            <Button size="sm" variant="ghost" icon={<MessageSquarePlus className="h-3.5 w-3.5" />} onClick={() => { ctl.current?.abort(); setConv((c) => ({ ...c, messages: [], restored: false })) }} disabled={busy}>
              New conversation
            </Button>
          )}
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" aria-hidden />
            {[inputs.offer.company, inputs.offer.role || inputs.profile.jobTitle, `${k(analysis.compensation.base)} offer`].filter(Boolean).join(' · ')}
          </span>
          {conv.restored && messages.length > 0 && (
            <span className="inline-flex items-center gap-1"><History className="h-3.5 w-3.5" aria-hidden />Earlier conversation about this offer restored</span>
          )}
        </p>
        {notice && <p className="mt-3 rounded-lg border border-caution-bd bg-caution-bg px-3 py-2 text-xs text-caution-fg">{notice}</p>}

        <Card className="mt-4 overflow-hidden">
          <div ref={listRef} className="max-h-[62vh] min-h-[360px] space-y-5 overflow-y-auto bg-ink-50/40 p-4 sm:p-5" aria-live="polite">
            {messages.length === 0 && (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-pine-50 text-pine-700 ring-1 ring-pine-200"><MessagesSquare className="h-5 w-5" aria-hidden /></div>
                <p className="mt-3 text-sm font-medium text-ink-900">How can I help with your {inputs.offer.company ? `${inputs.offer.company} ` : ''}offer?</p>
                <p className="mt-1 text-xs text-ink-500">{counters.length ? `They’ve responded ${counters.length === 1 ? 'once' : `${counters.length} times`}. Here’s what you might do next.` : 'Suggestions based on your offer and strategy.'}</p>
                <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                  {suggestions.map((sg) => <SuggestionChip key={sg.text} {...sg} onPick={send} disabled={engine === 'connecting'} />)}
                </div>
              </div>
            )}
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="ml-auto flex max-w-[85%] flex-row-reverse gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white" aria-hidden><User className="h-3.5 w-3.5" /></div>
                  <p className="whitespace-pre-line rounded-2xl rounded-tr-sm bg-ink-900 px-3.5 py-2.5 text-[14px] leading-relaxed text-white">{m.text}</p>
                </div>
              ) : (
                <div key={m.id} className="flex max-w-[92%] gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-700 ring-1 ring-pine-200" aria-hidden><Bot className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {(m.tools ?? []).map((t, i) => <ToolResult key={i} event={t} />)}
                    {m.status === 'thinking' && !m.text && (
                      <p className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px] text-ink-500 shadow-card ring-1 ring-ink-200/70" role="status">
                        <span className="flex gap-1" aria-hidden>
                          {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-pine-500" style={{ animationDelay: `${d}ms` }} />)}
                        </span>
                        {(m.tools?.length ?? 0) > 0 ? 'Running the numbers…' : 'Thinking…'}
                      </p>
                    )}
                    {m.text && (
                      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-card ring-1 ring-ink-200/70">
                        <MiniMarkdown text={m.text} />
                      </div>
                    )}
                    {m.status === 'stopped' && <p className="flex items-center gap-1 text-xs text-ink-400"><CircleStop className="h-3 w-3" aria-hidden />Stopped.</p>}
                    {m.status === 'error' && (
                      <p className="flex flex-wrap items-center gap-2 text-xs text-critical-fg">
                        {m.error}
                        <button type="button" className="font-medium underline" onClick={() => {
                          const idx = messages.findIndex((x) => x.id === m.id)
                          const prompt = messages[idx - 1]?.text
                          setMessages((ms) => ms.filter((_, j) => j !== idx && j !== idx - 1))
                          if (prompt) setTimeout(() => send(prompt), 0)
                        }}><span className="inline-flex items-center gap-1"><RotateCw className="h-3 w-3" aria-hidden />Try again</span></button>
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          <form className="border-t border-ink-200 bg-white p-3" onSubmit={(e) => { e.preventDefault(); void send(draft) }}>
            {!busy && last?.role === 'assistant' && last.status === 'done' && suggestions.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5" aria-label="Suggested follow-ups">
                {suggestions.map((sg) => <SuggestionChip key={sg.text} {...sg} onPick={send} disabled={engine === 'connecting'} />)}
              </div>
            )}
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
                <Button type="button" variant="secondary" size="lg" className="h-11 w-11 rounded-xl px-0" onClick={() => ctl.current?.abort()} aria-label="Stop" title="Stop"><CircleStop className="h-5 w-5" /></Button>
              ) : (
                <Button type="submit" variant="accent" size="lg" className="h-11 w-11 rounded-xl px-0" disabled={!draft.trim() || engine === 'connecting'} aria-label="Send" title="Send (Enter)"><SendHorizontal className="h-[18px] w-[18px]" /></Button>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-ink-400"><ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />AI coach. Suggestions, not guarantees. Market figures are illustrative estimates.</p>
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
