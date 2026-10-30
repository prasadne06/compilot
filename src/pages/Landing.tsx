import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Check, FileText, Gauge, Handshake, MessagesSquare, PlayCircle, Scale, ShieldCheck, Sparkles, Target, Upload,
} from 'lucide-react'
import { Button, ButtonLink, Card } from '../components/ui'
import { MarketRange, Meter, RecommendationBadge } from '../components/comp'
import { analyzeOffer } from '../engine'
import { SAMPLE_PERSONA } from '../data/samplePersona'
import { k } from '../lib/format'
import { useEvaluation } from '../state/EvaluationContext'
import { scrollToAnchor } from '../lib/scroll'

const sample = analyzeOffer(SAMPLE_PERSONA)

const JOURNEY = ['Offer', 'Understand', 'Benchmark', 'Evaluate', 'Leverage', 'Recommend', 'Negotiate', 'Practice']

const STEPS = [
  { icon: FileText, title: 'Share your offer', body: 'Upload your offer letter (PDF or Word) and check what we find, or enter the details yourself. Then tell us what matters most to you.' },
  { icon: BarChart3, title: 'See where it stands', body: 'An estimated market range, total compensation model, and an offer score — with confidence you can inspect.' },
  { icon: Scale, title: 'Understand your leverage', body: 'A transparent breakdown of what strengthens your position, and what might work against it.' },
  { icon: Target, title: 'Know what to ask for', body: 'A recommended target, range, and fallback — plus which levers to pull first, and which to avoid.' },
  { icon: FileText, title: 'Get your script', body: 'Natural, honest scripts for a recruiter call, an email, or a hiring manager — in the tone you prefer.' },
  { icon: MessagesSquare, title: 'Practice the conversation', body: 'Rehearse with an AI recruiter and get supportive, specific coaching on each response.' },
]

function SampleAnalysis() {
  const a = sample
  return (
    <Card className="relative overflow-hidden p-5 shadow-lift sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Sample offer analysis</p>
        <span className="rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">Illustrative</span>
      </div>
      <p className="mt-3 text-sm text-ink-500">Senior Product Designer · Seattle</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-ink-900 tabular">{k(a.compensation.base)}</span>
        <span className="text-sm text-ink-500">base offer</span>
      </div>

      <div className="mt-5">
        <MarketRange
          range={a.benchmark.base}
          compact
          markers={[
            { id: 'offer', label: 'Offer', value: a.compensation.base, style: 'offer' },
            { id: 'target', label: 'Target', value: a.recommendation.target, style: 'target' },
          ]}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-ink-50 p-3.5">
          <p className="text-xs text-ink-500">Offer score</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900 tabular">{a.offerScore.score}<span className="text-sm font-normal text-ink-400">/100</span></p>
          <Meter className="mt-2" value={a.offerScore.score} label="Offer score" />
        </div>
        <div className="rounded-xl bg-ink-50 p-3.5">
          <p className="text-xs text-ink-500">Negotiation leverage</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900 tabular">{a.leverage.score}<span className="text-sm font-normal text-ink-400">/100</span></p>
          <Meter className="mt-2" value={a.leverage.score} tone="pine" label="Leverage" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3.5">
        <div>
          <p className="text-xs text-ink-500">Recommendation</p>
          <div className="mt-1.5"><RecommendationBadge state={a.recommendation.state} size="sm" /></div>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-500">Consider targeting</p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900 tabular">{k(a.recommendation.target)}</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
        <Gauge className="h-3 w-3" /> Confidence {a.confidence.score}% · estimates, not guarantees
      </p>
    </Card>
  )
}

export function Landing() {
  const { loadSample } = useEvaluation()
  const navigate = useNavigate()
  const trySample = () => {
    loadSample()
    navigate('/results')
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-24">
        <div className="animate-fadeUp">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-600 shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-pine-600" aria-hidden />
            Offer evaluation &amp; negotiation copilot
          </div>
          <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-ink-900 sm:text-[56px] text-balance">
            Know what your offer is worth.
            <span className="block text-ink-400">Know what to ask for.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-600">
            Evaluate compensation, understand your negotiation leverage, and get a personalized strategy and script before you respond.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/evaluate/about-you" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>Evaluate My Offer</ButtonLink>
            <a href="#how" onClick={scrollToAnchor('how')} className="inline-flex h-12 items-center justify-center rounded-lg border border-ink-200 bg-white px-6 text-[15px] font-medium text-ink-800 shadow-card hover:bg-ink-50">
              See How It Works
            </a>
          </div>
          <div className="mt-5 flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-6">
            <Link to="/evaluate/about-you" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">
              <Upload className="h-4 w-4" /> Upload your offer letter to autofill
            </Link>
            <button onClick={trySample} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">
              <PlayCircle className="h-4 w-4" /> Or explore a sample offer
            </button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-500">
            {['Takes about 4 minutes', 'Your data stays in your browser', 'No sign-up'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pine-600" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="animate-fadeUp [animation-delay:120ms]">
          <SampleAnalysis />
        </div>
      </section>

      {/* Journey */}
      <section className="border-y border-ink-200/70 bg-white">
        <div className="mx-auto max-w-6xl overflow-x-auto overflow-y-hidden no-scrollbar px-4 py-5 sm:px-6">
          <ol className="flex min-w-max items-center gap-2 text-[13px] font-medium text-ink-500">
            {JOURNEY.map((j, i) => (
              <li key={j} className="flex items-center gap-2">
                <span className={i === 0 || i === JOURNEY.length - 1 ? 'text-ink-900' : ''}>{j}</span>
                {i < JOURNEY.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-ink-300" aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium text-pine-700">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl text-balance">From “is this good?” to knowing exactly what to say.</h2>
          <p className="mt-4 text-[17px] text-ink-600">
            CompPilot isn’t a salary calculator. It’s a structured way to think through a real career decision — and prepare for the conversation that follows.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-white"><s.icon className="h-4 w-4" /></div>
                <span className="text-xs font-medium text-ink-300 tabular">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-[15px] font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="bg-ink-900 text-ink-100">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-[13px] font-medium text-pine-300">Built on honesty</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl text-balance">Clear about what’s data, what’s interpretation, and what’s uncertain.</h2>
            <p className="mt-4 text-[17px] text-ink-300">
              Scores and ranges come from a transparent, deterministic model. AI explains and personalizes — it never invents numbers, guarantees outcomes, or
              encourages you to bend the truth.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: BarChart3, t: 'Labeled data sources', b: 'Benchmarks are clearly marked as illustrative estimates — never presented as live market data.' },
              { icon: Gauge, t: 'Confidence on everything', b: 'See exactly why an estimate is high or low confidence: role, location, industry and data freshness.' },
              { icon: Handshake, t: 'Honest negotiation', b: 'Scripts never fabricate offers or use pressure tactics. Your walk-away number is always yours to set.' },
              { icon: ShieldCheck, t: 'Private by default', b: 'Your inputs stay in this browser. Nothing is stored on a server in this version.' },
            ].map((x) => (
              <li key={x.t} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <x.icon className="h-4 w-4 text-pine-300" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-white">{x.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{x.b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl text-balance">
          You’re making an important career decision. Make it with more confidence.
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/evaluate/about-you" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>Evaluate My Offer</ButtonLink>
          <Button variant="secondary" size="lg" onClick={trySample} icon={<PlayCircle className="h-4 w-4" />}>Try the sample</Button>
        </div>
      </section>
    </div>
  )
}
