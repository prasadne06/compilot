import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { BarChart3, FileText, Handshake, LayoutDashboard, MessagesSquare, Pencil, PlayCircle, Sparkles } from 'lucide-react'
import { useEvaluation } from '../state/EvaluationContext'
import { Button, ButtonLink, EmptyState } from '../components/ui'
import { ConfidenceIndicator, Disclaimer, RecommendationBadge } from '../components/comp'
import { LEVELS } from '../data/benchmarks'

const TABS = [
  { to: '/results', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/results/market', label: 'Market', icon: BarChart3 },
  { to: '/results/negotiation', label: 'Strategy', icon: Handshake },
  { to: '/results/scripts', label: 'Scripts', icon: FileText },
  { to: '/practice', label: 'Practice', icon: MessagesSquare },
  { to: '/results/coach', label: 'Coach', icon: Sparkles },
]

export function ResultsLayout() {
  const { analysis, inputs, isSample, loadSample } = useEvaluation()
  const navigate = useNavigate()

  if (!analysis)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="No offer to analyze yet"
          description="Add a few details about you and your offer, and we’ll build an evaluation, strategy and scripts. Or explore with a sample offer."
          action={
            <>
              <ButtonLink to="/evaluate/about-you">Evaluate my offer</ButtonLink>
              <Button variant="secondary" icon={<PlayCircle className="h-4 w-4" />} onClick={() => { loadSample(); navigate('/results') }}>
                Try a sample offer
              </Button>
            </>
          }
        />
      </div>
    )

  const role = inputs.offer.role || inputs.profile.jobTitle
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      {isSample && (
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-pine-200 bg-pine-50 px-4 py-3 text-sm text-pine-800 sm:flex-row sm:items-center sm:justify-between">
          <p><span className="font-semibold">You’re viewing a sample offer.</span> A Senior Product Designer in Seattle with a competing offer.</p>
          <ButtonLink to="/evaluate/about-you" variant="secondary" size="sm">Use my own offer</ButtonLink>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-ink-500">
            {inputs.offer.company || 'Your offer'} · {LEVELS[analysis.benchmark.level].label} · {analysis.benchmark.locationLabel}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink-900 sm:text-[28px]">{role}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RecommendationBadge state={analysis.recommendation.state} />
            <ConfidenceIndicator confidence={analysis.confidence} />
          </div>
        </div>
        <ButtonLink to="/evaluate/about-you" variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
          Edit inputs
        </ButtonLink>
      </div>

      <nav className="-mx-4 mt-6 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-ink-200 px-4 sm:mx-0 sm:px-0" aria-label="Results sections">
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                    isActive ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800',
                  )
                }
              >
                <t.icon className="h-4 w-4" aria-hidden />
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>

      <Disclaimer className="mt-12" />
    </div>
  )
}
