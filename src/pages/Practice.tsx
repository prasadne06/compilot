import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowLeft, ArrowRight, Check, CornerDownLeft, Lightbulb, RotateCcw, Sparkles, Trophy, UserRound } from 'lucide-react'
import { useEvaluation } from '../state/EvaluationContext'
import { PRACTICE_SCENARIOS, respondToUser, startSession } from '../services/ai'
import { Badge, Button, Card, LoadingState } from '../components/ui'
import { SourceTag } from '../components/comp'
import type { PracticeScenarioId, PracticeSession, ResponseFeedback } from '../types'
import { k } from '../lib/format'

function FeedbackCard({ fb }: { fb: ResponseFeedback }) {
  const tone = fb.score >= 8 ? 'good' : fb.score >= 6 ? 'caution' : 'serious'
  return (
    <div className="ml-auto w-full max-w-[640px] rounded-2xl border border-pine-200 bg-pine-50/50 p-4 sm:p-5 animate-fadeUp">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-pine-800">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> Coaching
        </div>
        <Badge tone={tone}>Response score {fb.score.toFixed(1)} / 10</Badge>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-ink-700">What worked</p>
          <ul className="mt-2 space-y-1.5">
            {fb.strengths.length === 0 && <li className="text-[13px] text-ink-500">You showed up and made an ask — that’s the hardest part.</li>}
            {fb.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-[13px] text-ink-700"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good-fg" strokeWidth={3} />{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-700">Try next time</p>
          <ul className="mt-2 space-y-1.5">
            {fb.improvements.length === 0 && <li className="text-[13px] text-ink-500">Nothing major — keep this approach.</li>}
            {fb.improvements.map((s) => (
              <li key={s} className="flex gap-2 text-[13px] text-ink-700"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-600" />{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-white p-3.5 ring-1 ring-pine-100">
        <p className="text-xs font-semibold text-ink-700">One stronger version</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-800">“{fb.improvedVersion}”</p>
      </div>
    </div>
  )
}

function ScenarioPicker({ onPick }: { onPick: (id: PracticeScenarioId) => void }) {
  const { aiContext } = useEvaluation()
  return (
    <div className="animate-fadeUp">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">Practice negotiating</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">
          An AI recruiter will push back. You respond in your own words, and get supportive coaching after each message. Three rounds, about five minutes.
          {aiContext && <> Your target is <strong className="font-semibold text-ink-800">{k(aiContext.target)}</strong>.</>}
        </p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PRACTICE_SCENARIOS.map((s) => (
          <button key={s.id} onClick={() => onPick(s.id)} className="group rounded-xl border border-ink-200 bg-white p-5 text-left shadow-card transition-all hover:border-ink-300 hover:shadow-lift">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-ink-900">{s.title}</p>
              <Badge tone={s.difficulty === 'Easier' ? 'good' : s.difficulty === 'Moderate' ? 'caution' : 'serious'}>{s.difficulty}</Badge>
            </div>
            <p className="mt-1.5 text-sm text-ink-500">{s.description}</p>
            <p className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-700 group-hover:text-ink-900">
              Start <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Practice() {
  const { aiContext } = useEvaluation()
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [session?.turns.length, sending])

  if (!aiContext) return null
  if (!session) return <ScenarioPicker onPick={(id) => setSession(startSession(id, aiContext))} />

  const send = async () => {
    const text = draft.trim()
    if (!text || sending || session.complete) return
    const withUser: PracticeSession = { ...session, turns: [...session.turns, { role: 'user', text }] }
    setSession(withUser)
    setDraft('')
    setSending(true)
    try {
      const r = await respondToUser(session, text, aiContext)
      setSession((s) => {
        if (!s) return s
        const turns = [...s.turns]
        turns[turns.length - 1] = { ...turns[turns.length - 1], feedback: r.data.feedback }
        turns.push({ role: 'recruiter', text: r.data.recruiterReply })
        return { ...s, turns, round: s.round + 1, complete: r.data.complete }
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const scenario = PRACTICE_SCENARIOS.find((s) => s.id === session.scenario)!
  const scores = session.turns.flatMap((t) => (t.feedback ? [t.feedback.score] : []))
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const allStrengths = session.turns.flatMap((t) => t.feedback?.strengths ?? [])
  const allImprovements = session.turns.flatMap((t) => t.feedback?.improvements ?? [])

  return (
    <div className="animate-fadeUp">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setSession(null)}>Scenarios</Button>
          <div>
            <p className="text-[15px] font-semibold text-ink-900">{scenario.title}</p>
            <p className="text-xs text-ink-500">Round {Math.min(session.round + 1, session.maxRounds)} of {session.maxRounds} · Target {k(aiContext.target)} · Fallback {k(aiContext.fallback)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SourceTag kind="ai" label="AI role-play" />
          <Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setSession(startSession(session.scenario, aiContext))}>Restart</Button>
        </div>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="max-h-[62vh] min-h-[320px] space-y-4 overflow-y-auto bg-ink-50/40 p-4 sm:p-6" aria-live="polite">
          {session.turns.map((t, i) => (
            <div key={i} className="space-y-3">
              {t.role === 'recruiter' ? (
                <div className="flex max-w-[640px] gap-3 animate-fadeUp">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">R</div>
                  <div>
                    <p className="text-xs font-medium text-ink-500">Recruiter</p>
                    <p className="mt-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[15px] leading-relaxed text-ink-800 shadow-card ring-1 ring-ink-200/70">{t.text}</p>
                  </div>
                </div>
              ) : (
                <div className="ml-auto flex max-w-[640px] flex-row-reverse gap-3 animate-fadeUp">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-600 text-white"><UserRound className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-right text-xs font-medium text-ink-500">You</p>
                    <p className="mt-1 whitespace-pre-line rounded-2xl rounded-tr-sm bg-ink-900 px-4 py-3 text-[15px] leading-relaxed text-white">{t.text}</p>
                  </div>
                </div>
              )}
              {t.feedback && <FeedbackCard fb={t.feedback} />}
            </div>
          ))}
          {sending && (
            <div className="max-w-sm rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70">
              <LoadingState label="Reviewing your response…" lines={2} />
            </div>
          )}
          {session.complete && !sending && (
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card animate-fadeUp sm:p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-pine-600" />
                <p className="text-[15px] font-semibold text-ink-900">Practice complete</p>
              </div>
              <p className="mt-1 text-sm text-ink-500">Nice work staying with it — rehearsal is what makes the real conversation feel calm.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs text-ink-500">Average score</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900 tabular">{avg.toFixed(1)}<span className="text-sm font-normal text-ink-400"> / 10</span></p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs text-ink-500">Keep doing</p>
                  <p className="mt-1 text-sm font-medium text-ink-800">{allStrengths[0] ?? 'Making a clear ask'}</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs text-ink-500">Focus next</p>
                  <p className="mt-1 text-sm font-medium text-ink-800">{allImprovements[0] ?? 'Keep it concise and specific'}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => setSession(null)}>Try another scenario</Button>
                <Button variant="secondary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setSession(startSession(session.scenario, aiContext))}>Run it again</Button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {!session.complete && (
          <form
            className="border-t border-ink-200 bg-white p-3 sm:p-4"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            {session.round === 0 && !draft && (
              <p className="mb-2 flex items-start gap-1.5 px-1 text-xs text-ink-500">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-600" />
                Tip: stay warm, name a specific number ({k(aiContext.target)}), give one reason, then ask a question.
              </p>
            )}
            <div className="flex items-end gap-2">
              <label htmlFor="practice-input" className="sr-only">Your response</label>
              <textarea
                id="practice-input"
                ref={inputRef}
                rows={2}
                value={draft}
                disabled={sending}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder="Type how you’d respond…"
                className="max-h-40 min-h-[48px] flex-1 resize-y rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
              />
              <Button type="submit" size="lg" disabled={!draft.trim()} loading={sending} className={clsx('shrink-0')} aria-label="Send response" icon={!sending ? <CornerDownLeft className="h-4 w-4" /> : undefined}>
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
          </form>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-400">The recruiter is simulated. Real conversations vary — use this to build comfort, not to predict the outcome.</p>
    </div>
  )
}
